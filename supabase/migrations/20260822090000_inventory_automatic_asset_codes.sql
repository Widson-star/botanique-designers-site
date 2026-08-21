-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Automatic Botanique asset codes
-- =====================================================================
-- Forward correction. Neither already-applied Inventory migration is touched:
-- 20260819220000_inventory_tools_equipment_v1 (production 20260820071700) and
-- 20260821090000_inventory_site_register (production 20260821073611) both stand.
--
-- THE PRODUCT DECISION. An operator must NEVER choose a Botanique asset code.
-- register_equipment_asset() previously demanded one and raised 22023 when it
-- was missing, so the identity of a Botanique asset was whatever a human typed
-- into a browser field. That is backwards: the asset code is an INTERNAL
-- Botanique identifier, not a manufacturer's serial number, and the institution
-- issues it. (If manufacturer serials are ever wanted, that is a separate
-- future column and not this.)
--
-- THE FORMAT. EQP-0001, EQP-0002, EQP-0003 ... Above 9999 the number simply
-- grows to five digits and beyond; lpad pads short numbers but never truncates
-- long ones, so the format widens rather than collides.
--
-- WHY A SEQUENCE. Allocation must be safe under genuine concurrency. A
-- sequence is the only allocator here that is: max(asset_code)+1 re-reads a
-- value two transactions can both see, client-side counting cannot see other
-- sessions at all, timestamps collide within a tick, and random numbers trade a
-- guarantee for a probability. nextval() is atomic and — deliberately —
-- non-transactional, so two concurrent registrations can never draw the same
-- number even while both are still uncommitted. A rolled-back registration
-- burns its number; that is the correct trade, because a gap in an internal
-- identifier is harmless and a duplicate is not.

-- Allocation state. Owned by nothing — a plain sequence rather than an identity
-- column, because the code is a formatted text identity, not the primary key.
create sequence if not exists public.equipment_asset_code_seq as bigint start with 1 increment by 1 minvalue 1 no cycle;

-- Initialisation against whatever already exists. Production reached this
-- migration with hand-entered codes, and any of them MIGHT already look like
-- EQP-<digits>. If one does, the sequence has to start above the highest such
-- number or the first generated code would collide with a real asset and the
-- unique index would reject an otherwise valid registration.
--
-- Only strictly-conforming codes count. A code like 'EQP-12A' or 'BD-EQP-001'
-- is not in the generated namespace, so it must not drag the counter upward.
-- Deliberately NOT wrapped in a "did it change" guard: setval to the same value
-- is harmless, and the migration must be safe to reason about on any database,
-- including a fresh one where the table is empty and the answer is 1.
--
-- Matched case-INSENSITIVELY on purpose. The uniqueness invariant is the index
-- equipment_assets_asset_code_unique on upper(trim(...)), so a stored 'eqp-0007'
-- already occupies 'EQP-0007'. A case-sensitive scan would walk straight past it
-- and hand the next registration a code the index then rejects.
do $$
declare
  highest bigint;
begin
  select coalesce(max((regexp_match(asset_code, '^EQP-([0-9]+)$', 'i'))[1]::bigint), 0)
    into highest
  from public.equipment_assets
  where asset_code ~* '^EQP-[0-9]+$';

  -- is_called = true means the NEXT nextval() returns highest + 1.
  perform setval('public.equipment_asset_code_seq', greatest(highest, 1), highest > 0);
end;
$$;

-- The canonical allocator. Every generated code in the system comes from here,
-- so the format lives in exactly one place.
create or replace function public.private_next_equipment_asset_code()
returns text
language sql
volatile
security definer
set search_path = pg_catalog, public
as $$
  select 'EQP-' || lpad(nextval('public.equipment_asset_code_seq')::text, 4, '0')
$$;

revoke execute on function public.private_next_equipment_asset_code() from public, anon, authenticated;

-- Ordinary registration, now self-identifying.
--
-- API COMPATIBILITY WITHOUT AN ESCAPE HATCH. The signature keeps
-- target_asset_code so an in-flight client, a cached PostgREST schema or a
-- stale browser tab still resolves the same function rather than failing on an
-- unknown overload. But the argument is now INERT: whatever arrives is
-- discarded and the code is allocated here. That is the point — a stale client
-- supplying 'BD-EQP-001' must not be able to create a different, manually
-- chosen identity, and silently ignoring it is safer than honouring it. It is
-- accepted and ignored, never trusted.
--
-- The generated code is produced, written and returned inside this same
-- transaction, so the caller learns its asset's identity from the same commit
-- that created it and never has to guess or re-read.
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
  item public.inventory_items;
  created public.equipment_assets;
  generated_code text;
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;

  -- target_asset_code is accepted for compatibility and deliberately unused.
  -- There is no branch that can promote it into the asset's identity.

  -- This is the concurrency boundary. Catalogue UPDATE/deactivation also takes
  -- a row lock, so registration and catalogue identity changes cannot both
  -- validate against stale pre-commit state.
  select * into item
  from public.inventory_items
  where id = target_item_id
  for update;

  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if item.tracking_method <> 'asset' then
    raise exception 'That catalogue item is stock-tracked, so it has quantities rather than individual assets'
      using errcode = '22023';
  end if;
  if not item.is_active then
    raise exception 'That catalogue item is inactive' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_set_equipment_asset_event('registered');

  -- Drawn AFTER every validation, so a rejected registration does not burn a
  -- number, and INSIDE the item lock, so the reserved code and the catalogue
  -- state it was reserved against belong to the same instant.
  generated_code := public.private_next_equipment_asset_code();

  insert into public.equipment_assets (
    inventory_item_id, asset_code, ownership_type, condition,
    current_site_id, acquired_on, notes
  ) values (
    target_item_id, generated_code, coalesce(target_ownership_type, 'owned'),
    coalesce(target_condition, 'good'), target_site_id, target_acquired_on, target_notes
  ) returning * into created;

  perform public.private_clear_equipment_asset_event();
  return created;
end;
$$;

revoke execute on function public.register_equipment_asset(uuid, text, text, text, uuid, date, text) from public, anon;
grant execute on function public.register_equipment_asset(uuid, text, text, text, uuid, date, text) to authenticated;
