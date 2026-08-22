-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Tools & Equipment full control, and batch registration
-- =====================================================================
-- Forward correction. No previously applied Inventory migration is rewritten.
--
-- TWO things, both Authority 17:
--
--   1. RBAC. "Principal and Operations Manager have full control of the Tools
--      & Equipment domain." Seven places still reserved powers to the Principal
--      alone. They move to a DOMAIN-SPECIFIC helper.
--   2. Registering six rakes is one operation, not six.

-- ---------------------------------------------------------------------------
-- 1. DOMAIN-SPECIFIC FULL CONTROL
-- ---------------------------------------------------------------------------
-- Deliberately a NEW helper rather than redefining private_inventory_is_principal()
-- to return true for managers. That would have been a smaller diff and a much
-- worse idea: the name would no longer describe what it tests, and the next
-- genuinely Principal-only Inventory power added would silently include
-- managers. is_principal keeps meaning "the Principal"; this new predicate
-- means "may do anything within Tools & Equipment", and the two are free to
-- diverge again if the Founder ever wants them to.
--
-- Scoped by name and by use. It is not referenced outside Inventory, and this
-- migration touches nothing in Finance, Approvals, Projects, People,
-- Maintenance or Daily Site Record. Staff and viewer gain nothing.
--
-- NULL-SAFE ON PURPOSE, and this is not a detail.
--
-- private_inventory_role() returns NULL for anyone outside the domain, so a
-- bare `role() in ('owner','manager')` yields NULL for staff and viewer — and
-- `if not NULL then` is not true, so the guard silently does not fire. The
-- pre-existing private_inventory_is_principal() had exactly that shape, and a
-- staff caller could reach record_stock_adjustment() through it: the other
-- Principal-only RPCs were saved only by a later lock or RLS check, not by
-- their own gate. coalesce(..., false) is what makes a refusal a refusal.
create or replace function public.private_inventory_has_full_control()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(public.private_inventory_role() in ('owner', 'manager'), false)
$$;

revoke execute on function public.private_inventory_has_full_control() from public, anon, authenticated;

-- The same three-valued-logic hole is closed on the existing predicate. After
-- this migration no Inventory function calls it, but leaving a known-unsafe
-- authority helper in the schema is an invitation to the next person who does.
create or replace function public.private_inventory_is_principal()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(public.private_inventory_role() = 'owner', false)
$$;

revoke execute on function public.private_inventory_is_principal() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. THE SEVEN GATES
-- ---------------------------------------------------------------------------
-- Each is redefined in full — a plpgsql body cannot be partially patched — and
-- differs from the applied version ONLY in the predicate and the wording of the
-- refusal. Every reason requirement, lifecycle guard, unresolved-truth check
-- and optimistic version check is carried across unchanged.

-- 2a. The catalogue identity guard. This is the trigger that backs the RPCs, so
-- leaving it Principal-only would have made the database contradict itself:
-- the RPC would admit a manager and the trigger would then refuse them.
create or replace function public.tg_inventory_item_identity_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.inventory_item_controlled_change', true), ''),
    'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.inventory_item_change_reason', true), ''
  )), '');
  has_history boolean := public.private_inventory_item_has_history(old.id);
  has_control boolean := public.private_inventory_has_full_control();
  unresolved_assets integer := 0;
  has_live_stock boolean := false;
begin
  -- The custom marker can never manufacture authority.
  if controlled and not has_control then
    raise exception 'You are not authorised to perform a controlled catalogue correction'
      using errcode = '42501';
  end if;

  if controlled and supplied_reason is null then
    raise exception 'A reason is required for a controlled catalogue change'
      using errcode = '22023';
  end if;

  if new.is_active is distinct from old.is_active then
    if not controlled or not has_control then
      raise exception 'Use the deactivate or reactivate action to change catalogue availability'
        using errcode = '42501';
    end if;

    -- Deactivation is exceptional but never allowed to hide unresolved
    -- physical truth, regardless of whether the caller reached the row through
    -- the intended RPC or a manually-forged session marker.
    if old.is_active and not new.is_active then
      if old.tracking_method = 'asset' then
        select count(*) into unresolved_assets
        from public.equipment_assets a
        where a.inventory_item_id = old.id
          and a.status <> 'retired';

        if unresolved_assets > 0 then
          raise exception 'This item still has unresolved tools. Resolve or retire them first.'
            using errcode = '22023';
        end if;
      else
        select exists (
          select 1
          from (
            select m.from_site_id as site_id
            from public.inventory_stock_movements m
            where m.inventory_item_id = old.id
            union
            select m.to_site_id as site_id
            from public.inventory_stock_movements m
            where m.inventory_item_id = old.id
          ) positions
          where public.private_inventory_stock_balance(old.id, positions.site_id) <> 0
        ) into has_live_stock;

        if has_live_stock then
          raise exception 'This stock item still has quantity on hand. Reconcile every position to zero first.'
            using errcode = '22023';
        end if;
      end if;
    end if;
  end if;

  if has_history then
    if new.tracking_method is distinct from old.tracking_method then
      raise exception 'This item already has operational history; create a new catalogue item for a different tracking method'
        using errcode = '22023';
    end if;

    if new.unit_of_measure is distinct from old.unit_of_measure then
      raise exception 'This item already has operational history; create a new catalogue item for a different unit'
        using errcode = '22023';
    end if;

    if (new.item_name is distinct from old.item_name
        or new.category is distinct from old.category)
       and (not controlled or not has_control) then
      raise exception 'A reasoned identity correction is required after operational history exists'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

-- 2b. Catalogue identity correction.
create or replace function public.correct_inventory_item_identity(
  target_item_id uuid,
  expected_version integer,
  new_item_name text,
  new_category text,
  new_notes text,
  reason text
)
returns public.inventory_items
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_items;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
  clean_name text := nullif(regexp_replace(trim(coalesce(new_item_name, '')), '\s+', ' ', 'g'), '');
begin
  if not public.private_inventory_has_full_control() then
    raise exception 'You are not authorised to correct a catalogue item' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to correct a catalogue item' using errcode = '22023';
  end if;
  if clean_name is null then
    raise exception 'An item name is required' using errcode = '22023';
  end if;

  select * into existing from public.inventory_items where id = target_item_id for update;
  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if existing.version <> expected_version then
    raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.inventory_item_controlled_change', 'true', true);
  perform set_config('app.inventory_item_change_reason', clean_reason, true);

  update public.inventory_items
  set item_name = clean_name,
      category = coalesce(new_category, existing.category),
      notes = new_notes
  where id = existing.id and version = expected_version
  returning * into existing;

  perform set_config('app.inventory_item_controlled_change', 'false', true);
  perform set_config('app.inventory_item_change_reason', '', true);

  if existing.id is null then
    raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  return existing;
end;
$$;

-- 2c. Deactivate.
create or replace function public.deactivate_inventory_item(target_item_id uuid, expected_version integer, reason text)
returns public.inventory_items
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_items;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
  unresolved_assets integer := 0;
  has_live_stock boolean := false;
begin
  if not public.private_inventory_has_full_control() then
    raise exception 'You are not authorised to deactivate a catalogue item' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to deactivate a catalogue item' using errcode = '22023';
  end if;
  select * into existing from public.inventory_items where id = target_item_id for update;
  if not found then raise exception 'Catalogue item not found' using errcode = 'P0002'; end if;
  if existing.version <> expected_version then raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001'; end if;
  if not existing.is_active then raise exception 'This catalogue item is already inactive' using errcode = '22023'; end if;

  if existing.tracking_method = 'asset' then
    select count(*) into unresolved_assets from public.equipment_assets a
    where a.inventory_item_id = existing.id and a.status <> 'retired';
    if unresolved_assets > 0 then
      raise exception 'This item still has unresolved tools. Resolve or retire them first.' using errcode = '22023';
    end if;
  else
    select exists (
      select 1 from (
        select m.from_site_id as site_id from public.inventory_stock_movements m where m.inventory_item_id = existing.id
        union
        select m.to_site_id as site_id from public.inventory_stock_movements m where m.inventory_item_id = existing.id
      ) p where public.private_inventory_stock_balance(existing.id, p.site_id) <> 0
    ) into has_live_stock;
    if has_live_stock then
      raise exception 'This stock item still has quantity on hand. Reconcile every position to zero first.' using errcode = '22023';
    end if;
  end if;

  perform set_config('app.inventory_item_controlled_change', 'true', true);
  perform set_config('app.inventory_item_change_reason', clean_reason, true);
  update public.inventory_items set is_active = false where id = existing.id and version = expected_version returning * into existing;
  perform set_config('app.inventory_item_controlled_change', 'false', true);
  perform set_config('app.inventory_item_change_reason', '', true);
  return existing;
end;
$$;

-- 2d. Reactivate.
create or replace function public.reactivate_inventory_item(
  target_item_id uuid, expected_version integer, reason text
)
returns public.inventory_items
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_items;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_has_full_control() then
    raise exception 'You are not authorised to reactivate a catalogue item' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to reactivate a catalogue item' using errcode = '22023';
  end if;

  select * into existing from public.inventory_items where id = target_item_id for update;
  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if existing.version <> expected_version then
    raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.is_active then
    raise exception 'This catalogue item is already active' using errcode = '22023';
  end if;

  perform set_config('app.inventory_item_controlled_change', 'true', true);
  perform set_config('app.inventory_item_change_reason', clean_reason, true);

  update public.inventory_items set is_active = true
  where id = existing.id and version = expected_version
  returning * into existing;

  perform set_config('app.inventory_item_controlled_change', 'false', true);
  perform set_config('app.inventory_item_change_reason', '', true);
  return existing;
end;
$$;

-- 2e. Retire a tool.
create or replace function public.retire_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  reason text
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_has_full_control() then
    raise exception 'You are not authorised to retire a tool' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to retire a tool' using errcode = '22023';
  end if;

  existing := public.private_lock_equipment_asset(target_asset_id, expected_version);
  if existing.status = 'retired' then
    raise exception 'This tool is already retired' using errcode = '22023';
  end if;
  if existing.status = 'issued' then
    raise exception 'Return this tool before retiring it' using errcode = '22023';
  end if;

  perform public.private_set_equipment_asset_event('retired', clean_reason);
  update public.equipment_assets
  set status = 'retired',
      current_site_id = null,
      current_custodian_person_id = null,
      expected_return_date = null
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;

-- 2f. Stocktake adjustment.
create or replace function public.record_stock_adjustment(
  target_item_id uuid,
  target_movement_type text,
  target_quantity numeric,
  target_site_id uuid,
  reason text,
  note text default null
)
returns public.inventory_stock_movements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_has_full_control() then
    raise exception 'You are not authorised to record a stock-taking adjustment' using errcode = '42501';
  end if;
  if target_movement_type not in ('adjustment_in', 'adjustment_out') then
    raise exception 'Choose an adjustment in or an adjustment out' using errcode = '22023';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required for a stock-taking adjustment' using errcode = '22023';
  end if;
  return public.private_record_inventory_stock_movement(
    target_item_id, target_movement_type, target_quantity,
    case when target_movement_type = 'adjustment_out' then target_site_id else null end,
    case when target_movement_type = 'adjustment_in' then target_site_id else null end,
    null, null, null, clean_reason, note
  );
end;
$$;

-- 2g. Reasoned tool correction. Carried forward from
-- 20260823090000 including its Africa/Nairobi expected-return rule, with only
-- the authority predicate changed.
create or replace function public.correct_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_status text,
  target_condition text,
  target_site_id uuid,
  target_custodian_person_id uuid,
  target_expected_return_date date,
  reason text
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_has_full_control() then
    raise exception 'You are not authorised to correct tool history' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to correct a tool' using errcode = '22023';
  end if;
  if target_status is null or target_condition is null then
    raise exception 'A status and a condition are required' using errcode = '22023';
  end if;
  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_expected_return_date(target_expected_return_date);

  existing := public.private_lock_equipment_asset(target_asset_id, expected_version);

  perform public.private_set_equipment_asset_event('corrected', clean_reason);
  -- The correction marker is what allows a retired tool to be reopened at all;
  -- the transition guard refuses every other path into a retired row.
  perform set_config('app.inventory_asset_controlled_correction', 'true', true);
  update public.equipment_assets
  set status = target_status,
      condition = target_condition,
      current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. BATCH REGISTRATION
-- ---------------------------------------------------------------------------
-- Six rakes already owned is ONE thing the Founder knows, not six clicks.
--
-- THE UPPER BOUND IS 200. It exists because quantity is free text on a phone
-- and a slipped keypress should not silently mint ten thousand permanent
-- identities and burn ten thousand sequence numbers that can never be reused.
-- 200 is far above any realistic single delivery of one kind of tool and far
-- below the point where an accident becomes expensive to unpick. It is a safety
-- catch, not a business rule; a genuine larger intake is two registrations.
--
-- INITIAL ALLOCATION. If a custodian is named, the tool did not appear in a
-- warehouse — it is already in someone's hands, and the history must say so.
-- Each tool therefore gets TWO events in the one transaction: 'registered',
-- then 'issued'. Two explicit events rather than one ambiguous one, because
-- "this tool exists" and "this person has it" are different facts and the
-- ledger already distinguishes them everywhere else.
create or replace function public.register_equipment_assets(
  target_item_id uuid,
  target_quantity integer default 1,
  target_ownership_type text default 'owned',
  target_condition text default 'good',
  target_site_id uuid default null,
  target_custodian_person_id uuid default null,
  target_acquired_on date default null,
  target_notes text default null
)
returns setof public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item public.inventory_items;
  created public.equipment_assets;
  made uuid[] := '{}';
  index integer;
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;
  if target_quantity is null or target_quantity < 1 then
    raise exception 'Register at least one tool' using errcode = '22023';
  end if;
  if target_quantity > 200 then
    raise exception 'Register at most 200 tools at a time' using errcode = '22023';
  end if;

  -- A named custodian without a Site would mean "somebody has it, and it is
  -- also in Botanique custody", which is not a state this system has a meaning
  -- for. Refused rather than guessed at.
  if target_custodian_person_id is not null and target_site_id is null then
    raise exception 'Choose the Site this tool is at when naming a custodian'
      using errcode = '22023';
  end if;

  -- The concurrency boundary, taken ONCE for the whole batch: catalogue
  -- deactivation and tracking-method changes lock the same row, so a batch
  -- cannot straddle a catalogue identity change.
  select * into item from public.inventory_items where id = target_item_id for update;
  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if item.tracking_method <> 'asset' then
    raise exception 'That catalogue item is tracked by quantity, so it has counts rather than individually identified tools'
      using errcode = '22023';
  end if;
  if not item.is_active then
    raise exception 'That catalogue item is inactive' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);

  for index in 1..target_quantity loop
    perform public.private_set_equipment_asset_event('registered');
    insert into public.equipment_assets (
      inventory_item_id, asset_code, ownership_type, condition,
      current_site_id, acquired_on, notes
    ) values (
      target_item_id,
      public.private_next_equipment_asset_code(),
      coalesce(target_ownership_type, 'owned'),
      coalesce(target_condition, 'good'),
      target_site_id, target_acquired_on, target_notes
    ) returning * into created;
    perform public.private_clear_equipment_asset_event();
    made := made || created.id;
  end loop;

  -- The second, separate fact: this person has it. Same transaction, so the
  -- pair either both happened or neither did.
  if target_custodian_person_id is not null then
    perform public.private_set_equipment_asset_event('issued', null, 'initial allocation at registration');
    update public.equipment_assets
    set status = 'issued',
        current_custodian_person_id = target_custodian_person_id
    where id = any(made);
    perform public.private_clear_equipment_asset_event();
  end if;

  return query select * from public.equipment_assets where id = any(made) order by asset_code;
end;
$$;

revoke execute on function public.register_equipment_assets(uuid, integer, text, text, uuid, uuid, date, text) from public, anon;
grant execute on function public.register_equipment_assets(uuid, integer, text, text, uuid, uuid, date, text) to authenticated;

-- The single-tool entry point becomes a batch of one, so there is ONE
-- registration behaviour and the two cannot drift apart. target_asset_code
-- stays inert, exactly as before.
create or replace function public.register_equipment_asset(
  target_item_id uuid,
  target_asset_code text default null,
  target_ownership_type text default 'owned',
  target_condition text default 'good',
  target_site_id uuid default null,
  target_acquired_on date default null,
  target_notes text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  created public.equipment_assets;
begin
  select * into created from public.register_equipment_assets(
    target_item_id, 1, target_ownership_type, target_condition,
    target_site_id, null, target_acquired_on, target_notes
  );
  return created;
end;
$$;
