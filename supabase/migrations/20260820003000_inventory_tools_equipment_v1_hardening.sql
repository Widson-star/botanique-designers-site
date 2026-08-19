-- Inventory / Tools & Equipment V1 pre-production corrections.
-- Purely additive correction to the still-unapplied V1 foundation.

-- Extensible catalogue vocabulary: bounded canonical tokens, not a closed list.
alter table public.inventory_items drop constraint if exists inventory_items_category_check;
alter table public.inventory_items drop constraint if exists inventory_items_unit_of_measure_check;
alter table public.inventory_items add constraint inventory_items_category_format check (
  char_length(category) between 2 and 80
  and category = lower(category)
  and category ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
);
alter table public.inventory_items add constraint inventory_items_unit_of_measure_format check (
  char_length(unit_of_measure) between 1 and 40
  and unit_of_measure = lower(unit_of_measure)
  and unit_of_measure ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
);

create or replace function public.tg_audit_inventory_items()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    new.is_active := true;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.item_name := regexp_replace(trim(new.item_name), '[[:space:]]+', ' ', 'g');
  new.category := lower(regexp_replace(trim(new.category), '[[:space:]]+', '_', 'g'));
  new.unit_of_measure := lower(regexp_replace(trim(new.unit_of_measure), '[[:space:]]+', '_', 'g'));
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

-- Sensitive catalogue changes always require the real Principal role and a reason.
create or replace function public.tg_inventory_item_identity_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(nullif(current_setting('app.inventory_item_controlled_change', true), ''), 'false')::boolean;
  supplied_reason text := nullif(trim(coalesce(current_setting('app.inventory_item_change_reason', true), '')), '');
  has_history boolean := public.private_inventory_item_has_history(old.id);
  is_principal boolean := public.private_inventory_is_principal();
begin
  if controlled and not is_principal then
    raise exception 'Only the Principal can perform a controlled catalogue correction' using errcode = '42501';
  end if;
  if controlled and supplied_reason is null then
    raise exception 'A reason is required for a controlled catalogue change' using errcode = '22023';
  end if;
  if new.is_active is distinct from old.is_active and (not controlled or not is_principal) then
    raise exception 'Use the Principal deactivate or reactivate action to change catalogue availability' using errcode = '42501';
  end if;
  if has_history then
    if new.tracking_method is distinct from old.tracking_method then
      raise exception 'This item already has operational history; create a new catalogue item for a different tracking method' using errcode = '22023';
    end if;
    if new.unit_of_measure is distinct from old.unit_of_measure then
      raise exception 'This item already has operational history; create a new catalogue item for a different unit' using errcode = '22023';
    end if;
    if (new.item_name is distinct from old.item_name or new.category is distinct from old.category)
       and (not controlled or not is_principal) then
      raise exception 'Only the Principal can make a reasoned identity correction after operational history exists' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

-- Deactivation requires all physical truth to be resolved first.
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
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can deactivate a catalogue item' using errcode = '42501';
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
      raise exception 'This item still has unresolved equipment assets. Resolve or retire them first.' using errcode = '22023';
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

-- Exact stock movement meanings.
alter table public.inventory_stock_movements drop constraint if exists inventory_stock_movement_sides;
alter table public.inventory_stock_movements add constraint inventory_stock_movement_sides check (
  case movement_type
    when 'received' then from_site_id is null
    when 'adjustment_in' then from_site_id is null
    when 'issued' then from_site_id is null and to_site_id is not null
    when 'transferred' then from_site_id is not null and to_site_id is not null and from_site_id is distinct from to_site_id
    when 'returned' then from_site_id is not null and to_site_id is null
    when 'consumed' then to_site_id is null
    when 'damaged' then to_site_id is null
    when 'lost' then to_site_id is null
    when 'adjustment_out' then to_site_id is null
    else false
  end
);

-- Optional Project/Maintenance context must match the single operational Site for the event.
create or replace function public.private_assert_inventory_context(target_project_id uuid, target_maintenance_visit_id uuid, operational_site_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  context_project public.projects;
  context_visit public.maintenance_visits;
  visit_site_id uuid;
begin
  if target_project_id is not null then
    if operational_site_id is null then raise exception 'Project context requires a Site' using errcode = '22023'; end if;
    select * into context_project from public.projects where id = target_project_id;
    if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
    if context_project.site_id is distinct from operational_site_id then raise exception 'That Project belongs to a different Site' using errcode = '22023'; end if;
  end if;
  if target_maintenance_visit_id is not null then
    if operational_site_id is null then raise exception 'Maintenance context requires a Site' using errcode = '22023'; end if;
    select * into context_visit from public.maintenance_visits where id = target_maintenance_visit_id;
    if not found then raise exception 'Maintenance visit not found' using errcode = 'P0002'; end if;
    select r.site_id into visit_site_id from public.maintenance_relationships r where r.id = context_visit.maintenance_relationship_id;
    if visit_site_id is null then raise exception 'Maintenance visit Site not found' using errcode = 'P0002'; end if;
    if visit_site_id is distinct from operational_site_id then raise exception 'That Maintenance visit belongs to a different Site' using errcode = '22023'; end if;
  end if;
end;
$$;
revoke execute on function public.private_assert_inventory_context(uuid, uuid, uuid) from public, anon, authenticated;

-- Equipment issue/transfer/return and repair position remain physically truthful.
alter table public.equipment_assets add constraint equipment_asset_issued_site check (status <> 'issued' or current_site_id is not null);
alter table public.equipment_assets add constraint equipment_asset_custodian_status check (current_custodian_person_id is null or status = 'issued');
alter table public.equipment_assets add constraint equipment_asset_repair_position check (
  status <> 'under_repair' or (current_site_id is null and current_custodian_person_id is null and expected_return_date is null)
);

create or replace function public.issue_equipment_asset(
  target_asset_id uuid, expected_version integer, target_site_id uuid default null,
  target_custodian_person_id uuid default null, target_expected_return_date date default null,
  target_project_id uuid default null, target_maintenance_visit_id uuid default null, note text default null
)
returns public.equipment_assets
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status <> 'available' then raise exception 'Only available equipment can be issued' using errcode = '22023'; end if;
  if existing.current_site_id is not null then raise exception 'Return available equipment to Botanique custody before issuing it to another Site' using errcode = '22023'; end if;
  if target_site_id is null then raise exception 'A Site is required when equipment is issued' using errcode = '22023'; end if;
  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_inventory_context(target_project_id, target_maintenance_visit_id, target_site_id);
  perform public.private_set_equipment_asset_event('issued', null, note, target_project_id, target_maintenance_visit_id);
  update public.equipment_assets set status='issued', current_site_id=target_site_id,
    current_custodian_person_id=target_custodian_person_id, expected_return_date=target_expected_return_date
  where id=existing.id and version=expected_version returning * into existing;
  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

create or replace function public.transfer_equipment_asset(
  target_asset_id uuid, expected_version integer, target_site_id uuid default null,
  target_custodian_person_id uuid default null, target_expected_return_date date default null,
  target_project_id uuid default null, target_maintenance_visit_id uuid default null, note text default null
)
returns public.equipment_assets
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status <> 'issued' then raise exception 'Only issued equipment can be transferred' using errcode = '22023'; end if;
  if target_site_id is null then raise exception 'A destination Site is required' using errcode = '22023'; end if;
  if target_site_id is not distinct from existing.current_site_id then raise exception 'Transfer must move equipment to a different Site' using errcode = '22023'; end if;
  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_inventory_context(target_project_id, target_maintenance_visit_id, target_site_id);
  perform public.private_set_equipment_asset_event('transferred', null, note, target_project_id, target_maintenance_visit_id);
  update public.equipment_assets set current_site_id=target_site_id,
    current_custodian_person_id=target_custodian_person_id, expected_return_date=target_expected_return_date
  where id=existing.id and version=expected_version returning * into existing;
  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

create or replace function public.return_equipment_asset(
  target_asset_id uuid, expected_version integer, target_site_id uuid default null,
  target_condition text default null, target_project_id uuid default null,
  target_maintenance_visit_id uuid default null, note text default null
)
returns public.equipment_assets
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version); previous_site uuid;
begin
  if existing.status <> 'issued' then raise exception 'Only issued equipment can be returned' using errcode = '22023'; end if;
  if target_site_id is not null then raise exception 'Return goes to Botanique custody; use transfer for Site-to-Site movement' using errcode = '22023'; end if;
  previous_site := existing.current_site_id;
  perform public.private_assert_inventory_context(target_project_id, target_maintenance_visit_id, previous_site);
  perform public.private_set_equipment_asset_event('returned', null, note, target_project_id, target_maintenance_visit_id);
  update public.equipment_assets set status='available', current_site_id=null,
    current_custodian_person_id=null, expected_return_date=null,
    condition=coalesce(target_condition, existing.condition)
  where id=existing.id and version=expected_version returning * into existing;
  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

create or replace function public.send_equipment_asset_for_repair(target_asset_id uuid, expected_version integer, note text default null)
returns public.equipment_assets
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status not in ('available','issued') then raise exception 'This equipment cannot be sent for repair from its current state' using errcode = '22023'; end if;
  perform public.private_set_equipment_asset_event('sent_for_repair', null, note);
  update public.equipment_assets set status='under_repair', current_site_id=null,
    current_custodian_person_id=null, expected_return_date=null
  where id=existing.id and version=expected_version returning * into existing;
  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

-- Stock writer uses exactly one context Site according to movement meaning.
create or replace function public.private_record_inventory_stock_movement(
  target_item_id uuid, target_movement_type text, target_quantity numeric,
  target_from_site_id uuid, target_to_site_id uuid, target_person_id uuid,
  target_project_id uuid, target_maintenance_visit_id uuid, target_reason text, target_note text
)
returns public.inventory_stock_movements
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  item public.inventory_items; available numeric; created public.inventory_stock_movements;
  clean_reason text := nullif(trim(coalesce(target_reason,'')), '');
  decreases boolean := target_movement_type in ('issued','transferred','returned','consumed','damaged','lost','adjustment_out');
  operational_site_id uuid;
begin
  if target_quantity is null or target_quantity <= 0 then raise exception 'A quantity greater than zero is required' using errcode = '22023'; end if;
  select * into item from public.inventory_items where id=target_item_id for update;
  if not found then raise exception 'Catalogue item not found' using errcode='P0002'; end if;
  if item.tracking_method <> 'stock' then raise exception 'That catalogue item is not stock-tracked' using errcode='22023'; end if;
  if not item.is_active then raise exception 'That catalogue item is inactive' using errcode='22023'; end if;
  perform public.private_assert_inventory_site(target_from_site_id);
  perform public.private_assert_inventory_site(target_to_site_id);
  perform public.private_assert_inventory_person(target_person_id);
  operational_site_id := case target_movement_type
    when 'received' then target_to_site_id
    when 'issued' then target_to_site_id
    when 'transferred' then target_to_site_id
    when 'returned' then target_from_site_id
    when 'consumed' then target_from_site_id
    when 'damaged' then target_from_site_id
    when 'lost' then target_from_site_id
    else null end;
  perform public.private_assert_inventory_context(target_project_id, target_maintenance_visit_id, operational_site_id);
  if decreases then
    available := public.private_inventory_stock_balance(target_item_id,target_from_site_id);
    if available < target_quantity then raise exception 'Insufficient recorded stock at the source position' using errcode='22023'; end if;
  end if;
  insert into public.inventory_stock_movements(
    inventory_item_id,movement_type,quantity,from_site_id,to_site_id,person_id,
    project_id,maintenance_visit_id,reason,note,actor_profile_id
  ) values (
    target_item_id,target_movement_type,target_quantity,target_from_site_id,target_to_site_id,target_person_id,
    target_project_id,target_maintenance_visit_id,clean_reason,nullif(trim(coalesce(target_note,'')),''),auth.uid()
  ) returning * into created;
  return created;
end;
$$;

create or replace function public.record_stock_transfer(
  target_item_id uuid, target_movement_type text, target_quantity numeric,
  target_from_site_id uuid default null, target_to_site_id uuid default null,
  target_person_id uuid default null, target_project_id uuid default null,
  target_maintenance_visit_id uuid default null, note text default null
)
returns public.inventory_stock_movements
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if public.private_inventory_role() is null then raise exception 'You are not authorised to manage Tools & Equipment' using errcode='42501'; end if;
  if target_movement_type = 'issued' and not (target_from_site_id is null and target_to_site_id is not null) then
    raise exception 'Issued stock must move from Botanique custody to a Site' using errcode='22023';
  elsif target_movement_type = 'transferred' and not (target_from_site_id is not null and target_to_site_id is not null and target_from_site_id is distinct from target_to_site_id) then
    raise exception 'Transferred stock must move between two different Sites' using errcode='22023';
  elsif target_movement_type = 'returned' and not (target_from_site_id is not null and target_to_site_id is null) then
    raise exception 'Returned stock must move from a Site to Botanique custody' using errcode='22023';
  elsif target_movement_type not in ('issued','transferred','returned') then
    raise exception 'Choose issued, transferred or returned' using errcode='22023';
  end if;
  return public.private_record_inventory_stock_movement(
    target_item_id,target_movement_type,target_quantity,target_from_site_id,target_to_site_id,target_person_id,
    target_project_id,target_maintenance_visit_id,null,note
  );
end;
$$;

revoke execute on function public.private_assert_inventory_context(uuid,uuid,uuid) from public,anon,authenticated;
revoke execute on function public.private_assert_inventory_context(uuid,uuid,uuid,uuid) from public,anon,authenticated;
