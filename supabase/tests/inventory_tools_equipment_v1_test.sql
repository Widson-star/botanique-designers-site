-- BOTANIQUE DESIGNERS — Inventory / Tools & Equipment V1.
--
-- Runs on an isolated PostgreSQL database after the full migration chain.
-- Proves the settled model: ONE shared catalogue, two truth models beneath it
-- (individually identified equipment with an immutable event history, and
-- quantity stock that exists only as the sum of an immutable movement
-- ledger), Site as the primary physical context with Project and Maintenance
-- optional, People as custody identity, and Finance owning none of it.
--
-- Sections follow the authorised test matrix A–G, plus catalogue-identity
-- hardening (H) and a closing reconciliation (Z).
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

create function pg_temp.assert_eq(actual anyelement, expected anyelement, message text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', message, expected, actual;
  end if;
end;
$$;

-- Fixture ids are passed between sections through one key/value table rather
-- than through temp tables created inside DO blocks, so that a block which
-- deliberately raises and rolls back cannot take a fixture with it.
create temp table fxids (k text primary key, v uuid);
grant all on fxids to public;

create function pg_temp.fxset(key text, val uuid)
returns uuid language plpgsql as $$
begin
  insert into fxids (k, v) values (key, val)
  on conflict (k) do update set v = excluded.v;
  return val;
end;
$$;

create function pg_temp.fx(key text)
returns uuid language sql stable as $$
  select v from fxids where k = key
$$;

-- The derived-balance helper is deliberately NOT executable by a client, so
-- assertions reach it through this definer-owned wrapper rather than by
-- weakening the migration to suit its own test.
create function pg_temp.bal(target_item_id uuid, target_site_id uuid)
returns numeric language sql stable security definer as $$
  select public.private_inventory_stock_balance(target_item_id, target_site_id)
$$;

-- =====================================================================
-- Fixtures
-- =====================================================================

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000f0001', 'principal@inv.test'),
  ('00000000-0000-0000-0000-0000000f0002', 'manager@inv.test'),
  ('00000000-0000-0000-0000-0000000f0003', 'staff@inv.test'),
  ('00000000-0000-0000-0000-0000000f0004', 'viewer@inv.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000f0001', 'principal@inv.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000f0002', 'manager@inv.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000f0003', 'staff@inv.test', 'Project Team', 'staff', true),
  ('00000000-0000-0000-0000-0000000f0004', 'viewer@inv.test', 'Read Only', 'viewer', true);

-- Two Projects, each creating its own Site through the ordinary Project path.
insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000000fb001', 'Alpha Build', 'Property Alpha', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000000fb002', 'Beta Build', 'Property Beta', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed');

select pg_temp.fxset('alpha_site', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000fb001'));
select pg_temp.fxset('beta_site', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000fb002'));

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);

insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-0000000fa001', 'Custodian One', 'regular_staff'),
  ('00000000-0000-0000-0000-0000000fa002', 'Custodian Two', 'site_representative'),
  ('00000000-0000-0000-0000-0000000fa003', 'Former Worker', 'regular_staff');

-- Deactivating a person is Principal-only, which is who we are here.
update public.people set is_active = false where id = '00000000-0000-0000-0000-0000000fa003';

-- A MAINTENANCE-ONLY Site: no Botanique Project at all. Everything this domain
-- does must work here, which is the whole point of Site-primary context.
select pg_temp.fxset('maint_site',
  (public.create_maintenance_site('Grounds Only Estate', 'Karen', 'Nairobi')).id);

insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
values (pg_temp.fx('maint_site'), null, 'Fortnightly grounds upkeep', current_date, 'fortnightly');

with created as (
  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  select r.id, current_date, 'Routine grounds visit'
  from public.maintenance_relationships r
  where r.site_id = pg_temp.fx('maint_site')
  returning id
)
select pg_temp.fxset('maint_visit', id) from created;

-- A second Maintenance relationship, on the ALPHA Site, so a visit exists whose
-- Site genuinely differs from the maintenance-only one. Without it, a mismatch
-- test would only prove "some visit", not "the wrong Site".
insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
values (pg_temp.fx('alpha_site'), '00000000-0000-0000-0000-0000000fb001', 'Alpha aftercare', current_date, 'monthly');

with created as (
  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  select r.id, current_date, 'Alpha aftercare visit'
  from public.maintenance_relationships r
  where r.site_id = pg_temp.fx('alpha_site')
  returning id
)
select pg_temp.fxset('alpha_visit', id) from created;

-- =====================================================================
-- A. Schema, RLS and structural immutability
-- =====================================================================

reset role;

do $$
declare missing text;
begin
  select string_agg(t, ', ') into missing
  from unnest(array[
    'inventory_items', 'inventory_item_events', 'equipment_assets',
    'equipment_asset_events', 'inventory_stock_movements'
  ]) t
  where not exists (
    select 1 from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = t and c.relkind = 'r'
  );
  perform pg_temp.assert_true(missing is null,
    'A1. all five Inventory tables exist (missing: ' || coalesce(missing, '') || ')');
end;
$$;

do $$
declare unprotected text;
begin
  select string_agg(c.relname, ', ') into unprotected
  from pg_catalog.pg_class c
  join pg_catalog.pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname in ('inventory_items', 'inventory_item_events', 'equipment_assets',
                      'equipment_asset_events', 'inventory_stock_movements')
    and c.relrowsecurity = false;
  perform pg_temp.assert_true(unprotected is null,
    'A2. RLS enabled on every Inventory table (without: ' || coalesce(unprotected, '') || ')');
end;
$$;

-- A3. No stored quantity column anywhere. This is the structural half of
-- "current stock is derived": a column that does not exist cannot be edited.
do $$
declare offenders text;
begin
  select string_agg(table_name || '.' || column_name, ', ') into offenders
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('inventory_items', 'equipment_assets')
    and column_name in ('quantity', 'current_quantity', 'stock_quantity', 'quantity_on_hand', 'balance');
  perform pg_temp.assert_true(offenders is null,
    'A3. no editable quantity column on the catalogue or on an asset (found: ' || coalesce(offenders, '') || ')');
end;
$$;

-- A4. No Finance or procurement fact leaked into Operations.
do $$
declare offenders text;
begin
  select string_agg(table_name || '.' || column_name, ', ') into offenders
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('inventory_items', 'equipment_assets', 'equipment_asset_events',
                       'inventory_stock_movements', 'inventory_item_events')
    and column_name ~ '(cost|price|amount|currency|supplier|invoice|vendor|purchase|depreciat|warrant)';
  perform pg_temp.assert_true(offenders is null,
    'A4. Inventory stores no money or procurement fact (found: ' || coalesce(offenders, '') || ')');
end;
$$;

-- A5. Expected indexes and unique constraints exist.
do $$
declare missing text;
begin
  select string_agg(i, ', ') into missing
  from unnest(array[
    'inventory_items_name_unique', 'inventory_items_category_idx', 'inventory_items_tracking_idx',
    'inventory_item_events_item_idx', 'equipment_assets_code_unique', 'equipment_assets_item_idx',
    'equipment_assets_site_idx', 'equipment_assets_custodian_idx', 'equipment_assets_status_idx',
    'equipment_asset_events_asset_idx', 'inventory_stock_movements_item_idx',
    'inventory_stock_movements_from_idx', 'inventory_stock_movements_to_idx'
  ]) i
  where not exists (select 1 from pg_catalog.pg_indexes where schemaname = 'public' and indexname = i);
  perform pg_temp.assert_true(missing is null,
    'A5. expected indexes exist (missing: ' || coalesce(missing, '') || ')');
end;
$$;

-- A6. No DELETE is granted to any client on any Inventory table.
do $$
declare offenders text;
begin
  select string_agg(table_name || ':' || grantee, ', ') into offenders
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('inventory_items', 'inventory_item_events', 'equipment_assets',
                       'equipment_asset_events', 'inventory_stock_movements')
    and grantee in ('authenticated', 'anon', 'PUBLIC')
    and privilege_type = 'DELETE';
  perform pg_temp.assert_true(offenders is null,
    'A6. nothing in Inventory can be deleted by a client (found: ' || coalesce(offenders, '') || ')');
end;
$$;

-- A7. Assets and every ledger carry NO insert/update grant: the only way in is
-- a controlled action.
do $$
declare offenders text;
begin
  select string_agg(table_name || ':' || privilege_type, ', ') into offenders
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('equipment_assets', 'equipment_asset_events',
                       'inventory_stock_movements', 'inventory_item_events')
    and grantee in ('authenticated', 'anon', 'PUBLIC')
    and privilege_type in ('INSERT', 'UPDATE');
  perform pg_temp.assert_true(offenders is null,
    'A7. equipment and every ledger are read-only to clients (found: ' || coalesce(offenders, '') || ')');
end;
$$;

-- A8. Every SECURITY DEFINER function this migration adds pins search_path.
do $$
declare offenders text;
begin
  select string_agg(p.proname, ', ') into offenders
  from pg_catalog.pg_proc p
  join pg_catalog.pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (p.proname like '%inventory%' or p.proname like '%equipment%' or p.proname like '%stock%')
    and not exists (select 1 from unnest(coalesce(p.proconfig, array[]::text[])) c where c like 'search_path=%');
  perform pg_temp.assert_true(offenders is null,
    'A8. every Inventory SECURITY DEFINER function pins search_path (found: ' || coalesce(offenders, '') || ')');
end;
$$;

-- A9. Internal helpers, especially the unguarded ledger writer, are not
-- reachable by any client.
do $$
begin
  perform pg_temp.assert_true(
    not has_function_privilege('authenticated',
      'public.private_record_inventory_stock_movement(uuid, text, numeric, uuid, uuid, uuid, uuid, uuid, text, text)',
      'execute'),
    'A9. the unguarded ledger writer is not executable by authenticated');
  perform pg_temp.assert_true(
    not has_function_privilege('authenticated', 'public.private_inventory_stock_balance(uuid, uuid)', 'execute'),
    'A9. the raw balance helper is not executable by authenticated');
  perform pg_temp.assert_true(
    not has_function_privilege('authenticated', 'public.private_lock_equipment_asset(uuid, integer)', 'execute'),
    'A9. the asset lock helper is not executable by authenticated');
  -- The one deliberate exception, and why: RLS policies call it, and a policy
  -- is evaluated as the calling user.
  perform pg_temp.assert_true(
    has_function_privilege('authenticated', 'public.private_inventory_role()', 'execute'),
    'A9. the RLS role helper stays callable, as the policies require');
  perform pg_temp.assert_true(
    not has_function_privilege('anon', 'public.private_inventory_role()', 'execute'),
    'A9. but anon cannot call even that');
  perform pg_temp.assert_true(
    not has_function_privilege('anon', 'public.record_stock_receipt(uuid, numeric, uuid, uuid, uuid, uuid, text)', 'execute'),
    'A9. anon can execute nothing in this domain');
end;
$$;

-- =====================================================================
-- B. Principal / owner authority
-- =====================================================================

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);

-- B1. The Principal creates catalogue items of both kinds.
do $$
declare asset_item public.inventory_items; stock_item public.inventory_items;
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('  Generator   5kVA ', 'equipment', 'asset', 'unit') returning * into asset_item;
  perform pg_temp.assert_eq(asset_item.item_name, 'Generator 5kVA', 'B1. the item name is normalised');
  perform pg_temp.assert_true(asset_item.is_active, 'B1. a new catalogue item is active');
  perform pg_temp.assert_eq(asset_item.version, 1, 'B1. a new catalogue item is version 1');
  perform pg_temp.assert_eq(asset_item.created_by, '00000000-0000-0000-0000-0000000f0001'::uuid,
    'B1. the actor comes from the session, not from the client');
  perform pg_temp.fxset('gen_item', asset_item.id);

  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Irrigation Fitting 20mm', 'irrigation', 'stock', 'unit') returning * into stock_item;
  perform pg_temp.fxset('fitting_item', stock_item.id);
end;
$$;

-- B2. Exactly one 'created' event, written by the database.
do $$
declare ev_count integer; ev public.inventory_item_events;
begin
  select count(*) into ev_count from public.inventory_item_events
  where inventory_item_id = pg_temp.fx('gen_item');
  perform pg_temp.assert_eq(ev_count, 1, 'B2. catalogue creation appends exactly one event');

  select * into ev from public.inventory_item_events where inventory_item_id = pg_temp.fx('gen_item');
  perform pg_temp.assert_eq(ev.event_type, 'created', 'B2. that event is a creation');
  perform pg_temp.assert_true(ev.previous_snapshot is null, 'B2. a creation has no previous state');
  perform pg_temp.assert_eq(ev.actor_profile_id, '00000000-0000-0000-0000-0000000f0001'::uuid,
    'B2. the actor is recorded');
end;
$$;

-- B3. An asset-tracked item cannot be denominated in litres.
do $$
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Nonsense Mower', 'equipment', 'asset', 'litre');
  raise exception 'ASSERTION FAILED: B3. an individually tracked asset must be counted in units';
exception when check_violation then null;
end;
$$;

-- B4. The catalogue holds one row per item name.
do $$
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('generator 5KVA', 'equipment', 'asset', 'unit');
  raise exception 'ASSERTION FAILED: B4. a shared catalogue must not hold the same item twice';
exception when unique_violation then null;
end;
$$;

-- B5. The Principal registers equipment, with no acquisition date invented.
do $$
declare asset public.equipment_assets;
begin
  asset := public.register_equipment_asset(
    pg_temp.fx('gen_item'), 'BD-GEN-001', 'owned', 'good', null, null, 'Historic Botanique unit'
  );
  perform pg_temp.assert_eq(asset.status, 'available', 'B5. equipment registers available');
  perform pg_temp.assert_true(asset.acquired_on is null,
    'B5. registering historic equipment needs no invented acquisition date');
  perform pg_temp.assert_true(asset.current_custodian_person_id is null,
    'B5. registration does not assign custody');
  perform pg_temp.fxset('gen_asset', asset.id);
end;
$$;

-- B6. An ordinary operation, then the Principal-only correction path.
do $$
declare asset public.equipment_assets; corrected public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('gen_asset');
  asset := public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001', current_date + 7, null, null, 'For the Alpha build');
  perform pg_temp.assert_eq(asset.status, 'issued', 'B6. the Principal can issue equipment');

  corrected := public.correct_equipment_asset(
    asset.id, asset.version, 'available', 'fair', pg_temp.fx('alpha_site'), null, null,
    'Wrong custodian recorded at issue'
  );
  perform pg_temp.assert_eq(corrected.status, 'available', 'B6. the Principal can correct equipment');
  perform pg_temp.assert_eq(corrected.condition, 'fair', 'B6. the correction applied');
end;
$$;

-- B7. The Principal retires an asset; retirement is terminal and positionless.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('gen_asset');
  asset := public.retire_equipment_asset(asset.id, asset.version, 'Beyond economic repair');
  perform pg_temp.assert_eq(asset.status, 'retired', 'B7. the Principal can retire equipment');
  perform pg_temp.assert_true(asset.current_site_id is null and asset.current_custodian_person_id is null,
    'B7. a retired asset holds no current position');
end;
$$;

-- B8. Retirement demands a reason.
do $$
declare asset public.equipment_assets;
begin
  asset := public.register_equipment_asset(pg_temp.fx('gen_item'), 'BD-GEN-002');
  perform public.retire_equipment_asset(asset.id, asset.version, '   ');
  raise exception 'ASSERTION FAILED: B8. retirement must state a reason';
exception when invalid_parameter_value then null;
end;
$$;

-- B9. Principal stock adjustment: reasoned, and appended as a movement like
-- everything else.
do $$
declare moved public.inventory_stock_movements;
begin
  moved := public.record_stock_adjustment(
    pg_temp.fx('fitting_item'), 'adjustment_in', 12, pg_temp.fx('alpha_site'),
    'Opening stock-take, 19 Aug'
  );
  perform pg_temp.assert_eq(moved.movement_type, 'adjustment_in', 'B9. the Principal can adjust stock in');
  perform pg_temp.assert_eq(moved.reason, 'Opening stock-take, 19 Aug', 'B9. the adjustment carries its reason');
  perform pg_temp.assert_eq(moved.actor_profile_id, '00000000-0000-0000-0000-0000000f0001'::uuid,
    'B9. the adjustment records its actor');
  perform pg_temp.assert_eq(
    pg_temp.bal(pg_temp.fx('fitting_item'), pg_temp.fx('alpha_site')), 12::numeric,
    'B9. the adjustment moves the derived position');
end;
$$;

-- B10. A stock adjustment without a reason is refused.
do $$
begin
  perform public.record_stock_adjustment(pg_temp.fx('fitting_item'), 'adjustment_out', 1, pg_temp.fx('alpha_site'), null);
  raise exception 'ASSERTION FAILED: B10. a stock-taking adjustment must state a reason';
exception when invalid_parameter_value then null;
end;
$$;

-- =====================================================================
-- C. Operations Manager authority — ordinary yes, exceptional no
-- =====================================================================

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0002', true);

-- C1. The Manager creates an ordinary catalogue item and registers equipment.
do $$
declare item public.inventory_items; asset public.equipment_assets;
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Rotary Hammer Drill', 'power_tools', 'asset', 'unit') returning * into item;
  perform pg_temp.assert_eq(item.created_by, '00000000-0000-0000-0000-0000000f0002'::uuid,
    'C1. the Manager can create an ordinary catalogue item');
  perform pg_temp.fxset('drill_item', item.id);

  asset := public.register_equipment_asset(item.id, 'BD-DRL-001', 'owned', 'good');
  perform pg_temp.assert_eq(asset.status, 'available', 'C1. the Manager can register equipment');
  perform pg_temp.fxset('drill_asset', asset.id);
end;
$$;

-- C2. The Manager runs the whole ordinary equipment loop.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('drill_asset');

  asset := public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001', current_date + 14, null, null, 'Alpha fit-out');
  perform pg_temp.assert_eq(asset.status, 'issued', 'C2. the Manager can issue');
  perform pg_temp.assert_eq(asset.current_site_id, pg_temp.fx('alpha_site'), 'C2. issue sets the Site');

  asset := public.transfer_equipment_asset(asset.id, asset.version, pg_temp.fx('beta_site'),
    '00000000-0000-0000-0000-0000000fa002', current_date + 21, null, null, 'Needed at Beta');
  perform pg_temp.assert_eq(asset.current_site_id, pg_temp.fx('beta_site'), 'C2. the Manager can transfer');
  perform pg_temp.assert_eq(asset.current_custodian_person_id, '00000000-0000-0000-0000-0000000fa002'::uuid,
    'C2. transfer moves custody');

  asset := public.update_equipment_asset_condition(asset.id, asset.version, 'fair', 'Handle worn');
  perform pg_temp.assert_eq(asset.condition, 'fair', 'C2. the Manager can update condition');

  asset := public.return_equipment_asset(asset.id, asset.version, null, 'fair', null, null, 'Back to Botanique');
  perform pg_temp.assert_eq(asset.status, 'available', 'C2. the Manager can return');
  perform pg_temp.assert_true(asset.current_custodian_person_id is null, 'C2. return clears custody');
  perform pg_temp.assert_true(asset.expected_return_date is null, 'C2. return clears the expected return date');
  perform pg_temp.assert_true(asset.current_site_id is null,
    'C2. returned into Botanique custody, not to a fabricated store');

  asset := public.send_equipment_asset_for_repair(asset.id, asset.version, 'Chuck replacement');
  perform pg_temp.assert_eq(asset.status, 'under_repair', 'C2. the Manager can send for repair');

  asset := public.return_equipment_asset_from_repair(asset.id, asset.version, 'good', null, 'Chuck replaced');
  perform pg_temp.assert_eq(asset.status, 'available', 'C2. the Manager can return from repair');
  perform pg_temp.assert_eq(asset.condition, 'good', 'C2. repair can restore condition');
end;
$$;

-- C3. The Manager reports damage and loss.
do $$
declare asset public.equipment_assets;
begin
  asset := public.register_equipment_asset(pg_temp.fx('drill_item'), 'BD-DRL-002');
  asset := public.update_equipment_asset_condition(asset.id, asset.version, 'damaged', 'Dropped from scaffold');
  perform pg_temp.assert_eq(asset.condition, 'damaged', 'C3. the Manager can report damage');

  asset := public.report_equipment_asset_lost(asset.id, asset.version, 'Not returned from Beta, searched twice');
  perform pg_temp.assert_eq(asset.status, 'lost', 'C3. the Manager can report loss');
  perform pg_temp.assert_true(asset.current_site_id is null, 'C3. a lost asset holds no current position');
end;
$$;

-- C4. The Manager records ordinary stock movements.
do $$
declare item public.inventory_items;
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Cement', 'materials', 'stock', 'bag') returning * into item;
  perform pg_temp.fxset('cement_item', item.id);

  perform public.record_stock_receipt(item.id, 100, null, null, null, null, 'Delivered to Botanique');
  perform pg_temp.assert_eq(pg_temp.bal(item.id, null), 100::numeric,
    'C4. the Manager can receive stock into Botanique custody');

  perform public.record_stock_transfer(item.id, 'issued', 40, null, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001');
  perform pg_temp.assert_eq(pg_temp.bal(item.id, null), 60::numeric,
    'C4. issue leaves Botanique custody');
  perform pg_temp.assert_eq(pg_temp.bal(item.id, pg_temp.fx('alpha_site')), 40::numeric,
    'C4. issue arrives at the Site');

  perform public.record_stock_usage(item.id, 'consumed', 15, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001');
  perform pg_temp.assert_eq(pg_temp.bal(item.id, pg_temp.fx('alpha_site')), 25::numeric,
    'C4. the Manager can record consumption');
end;
$$;

-- C5. The Manager CANNOT correct catalogue identity.
do $$
declare item public.inventory_items;
begin
  select * into item from public.inventory_items where id = pg_temp.fx('drill_item');
  perform public.correct_inventory_item_identity(item.id, item.version, 'Renamed Drill', 'power_tools', null, 'Trying it on');
  raise exception 'ASSERTION FAILED: C5. only the Principal may correct catalogue identity';
exception when insufficient_privilege then null;
end;
$$;

-- C6. The Manager CANNOT deactivate a catalogue item.
do $$
declare item public.inventory_items;
begin
  select * into item from public.inventory_items where id = pg_temp.fx('drill_item');
  perform public.deactivate_inventory_item(item.id, item.version, 'Trying it on');
  raise exception 'ASSERTION FAILED: C6. only the Principal may deactivate a catalogue item';
exception when insufficient_privilege then null;
end;
$$;

-- C7. The Manager CANNOT retire equipment.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('drill_asset');
  perform public.retire_equipment_asset(asset.id, asset.version, 'Trying it on');
  raise exception 'ASSERTION FAILED: C7. only the Principal may retire equipment';
exception when insufficient_privilege then null;
end;
$$;

-- C8. The Manager CANNOT correct equipment history.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('drill_asset');
  perform public.correct_equipment_asset(asset.id, asset.version, 'issued', 'good', null, null, null, 'Trying it on');
  raise exception 'ASSERTION FAILED: C8. only the Principal may correct equipment';
exception when insufficient_privilege then null;
end;
$$;

-- C9. The Manager CANNOT record a stock-taking adjustment.
do $$
begin
  perform public.record_stock_adjustment(pg_temp.fx('cement_item'), 'adjustment_out', 5, pg_temp.fx('alpha_site'), 'Trying it on');
  raise exception 'ASSERTION FAILED: C9. only the Principal may adjust stock';
exception when insufficient_privilege then null;
end;
$$;

-- C10. is_active cannot be changed by a direct UPDATE either — the guard sits
-- on the table, not only on the RPC.
do $$
begin
  update public.inventory_items set is_active = false where id = pg_temp.fx('drill_item');
  raise exception 'ASSERTION FAILED: C10. is_active must not change by direct UPDATE';
exception when insufficient_privilege then null;
end;
$$;

-- =====================================================================
-- D. Project Team and Read-only — no access at all
-- =====================================================================

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0003', true);

do $$
declare visible integer;
begin
  select count(*) into visible from public.inventory_items;
  perform pg_temp.assert_eq(visible, 0, 'D1. staff sees no catalogue item');
  select count(*) into visible from public.equipment_assets;
  perform pg_temp.assert_eq(visible, 0, 'D1. staff sees no equipment');
  select count(*) into visible from public.inventory_stock_movements;
  perform pg_temp.assert_eq(visible, 0, 'D1. staff sees no stock movement');
  select count(*) into visible from public.equipment_asset_events;
  perform pg_temp.assert_eq(visible, 0, 'D1. staff sees no equipment history');
  select count(*) into visible from public.inventory_item_events;
  perform pg_temp.assert_eq(visible, 0, 'D1. staff sees no catalogue history');
  select count(*) into visible from public.inventory_stock_position();
  perform pg_temp.assert_eq(visible, 0, 'D1. staff sees no derived stock position');
end;
$$;

do $$
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Staff Invention', 'other', 'stock', 'unit');
  raise exception 'ASSERTION FAILED: D2. staff must not create a catalogue item';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform public.register_equipment_asset(pg_temp.fx('gen_item'), 'BD-STAFF-001');
  raise exception 'ASSERTION FAILED: D3. staff must not register equipment';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform public.record_stock_receipt(pg_temp.fx('cement_item'), 5);
  raise exception 'ASSERTION FAILED: D4. staff must not record stock';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform public.issue_equipment_asset(pg_temp.fx('drill_asset'), 1, null,
    '00000000-0000-0000-0000-0000000fa001', null, null, null, null);
  raise exception 'ASSERTION FAILED: D5. staff must not issue equipment';
exception when insufficient_privilege then null;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0004', true);

do $$
declare visible integer;
begin
  select count(*) into visible from public.inventory_items;
  perform pg_temp.assert_eq(visible, 0, 'D6. viewer sees no catalogue item');
  select count(*) into visible from public.equipment_assets;
  perform pg_temp.assert_eq(visible, 0, 'D6. viewer sees no equipment');
  select count(*) into visible from public.inventory_stock_movements;
  perform pg_temp.assert_eq(visible, 0, 'D6. viewer sees no stock movement');
  select count(*) into visible from public.inventory_stock_position();
  perform pg_temp.assert_eq(visible, 0, 'D6. viewer sees no derived stock position');
end;
$$;

do $$
begin
  perform public.record_stock_receipt(pg_temp.fx('cement_item'), 5);
  raise exception 'ASSERTION FAILED: D7. viewer must not record stock';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform public.register_equipment_asset(pg_temp.fx('gen_item'), 'BD-VIEW-001');
  raise exception 'ASSERTION FAILED: D8. viewer must not register equipment';
exception when insufficient_privilege then null;
end;
$$;

-- =====================================================================
-- E. Asset audit integrity
-- =====================================================================

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0002', true);

-- E1. One issue updates the snapshot AND appends exactly one matching event.
do $$
declare asset public.equipment_assets; before_count integer; after_count integer; ev public.equipment_asset_events;
begin
  asset := public.register_equipment_asset(pg_temp.fx('drill_item'), 'BD-DRL-003');
  select count(*) into before_count from public.equipment_asset_events where equipment_asset_id = asset.id;
  perform pg_temp.assert_eq(before_count, 1, 'E1. registration appends exactly one event');

  asset := public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001', current_date + 3, null, null, 'Alpha works');
  select count(*) into after_count from public.equipment_asset_events where equipment_asset_id = asset.id;
  perform pg_temp.assert_eq(after_count, 2, 'E1. issue appends exactly one further event');

  select * into ev from public.equipment_asset_events
  where equipment_asset_id = asset.id order by resulting_version desc limit 1;
  perform pg_temp.assert_eq(ev.event_type, 'issued', 'E1. the event names the transition');
  perform pg_temp.assert_eq(ev.previous_snapshot ->> 'status', 'available', 'E1. the event carries the state before');
  perform pg_temp.assert_eq(ev.new_snapshot ->> 'status', 'issued', 'E1. the event carries the state after');
  perform pg_temp.assert_eq(ev.resulting_version, asset.version, 'E1. the event pins the resulting version');
  perform pg_temp.assert_eq(asset.status, 'issued', 'E1. the snapshot moved in the same transaction');

  perform pg_temp.fxset('audit_asset', asset.id);
end;
$$;

-- E2. Transfer moves the position and preserves everything earlier.
do $$
declare asset public.equipment_assets; types text;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('audit_asset');
  asset := public.transfer_equipment_asset(asset.id, asset.version, pg_temp.fx('beta_site'),
    '00000000-0000-0000-0000-0000000fa002', null, null, null, 'Moved to Beta');

  select string_agg(event_type, ',' order by resulting_version) into types
  from public.equipment_asset_events where equipment_asset_id = asset.id;
  perform pg_temp.assert_eq(types, 'registered,issued,transferred',
    'E2. earlier history is preserved, not replaced');

  perform pg_temp.assert_eq(
    (select previous_snapshot ->> 'current_site_id' from public.equipment_asset_events
     where equipment_asset_id = asset.id and event_type = 'transferred'),
    pg_temp.fx('alpha_site')::text,
    'E2. the transfer event still names where it came from');
end;
$$;

-- E3. Repair transitions stay auditable end to end.
do $$
declare asset public.equipment_assets; types text;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('audit_asset');
  asset := public.return_equipment_asset(asset.id, asset.version, null, 'damaged', null, null, 'Returned faulty');
  asset := public.send_equipment_asset_for_repair(asset.id, asset.version, 'To the workshop');
  asset := public.return_equipment_asset_from_repair(asset.id, asset.version, 'good', null, 'Repaired');

  select string_agg(event_type, ',' order by resulting_version) into types
  from public.equipment_asset_events where equipment_asset_id = asset.id;
  perform pg_temp.assert_eq(types,
    'registered,issued,transferred,returned,sent_for_repair,returned_from_repair',
    'E3. every repair transition is on the record');
end;
$$;

-- E4. History cannot be rewritten or erased — proved at BOTH layers: no client
-- grant, and a trigger that refuses even a privileged writer.
do $$
begin
  update public.equipment_asset_events set event_type = 'returned'
  where equipment_asset_id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E4. a client must not update equipment history';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  delete from public.equipment_asset_events where equipment_asset_id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E4. a client must not delete equipment history';
exception when insufficient_privilege then null;
end;
$$;

reset role;

do $$
begin
  update public.equipment_asset_events set event_type = 'returned'
  where equipment_asset_id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E4. the immutability trigger must refuse even a privileged UPDATE';
exception when object_not_in_prerequisite_state then null;
end;
$$;

do $$
begin
  delete from public.equipment_asset_events where equipment_asset_id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E4. the immutability trigger must refuse even a privileged DELETE';
exception when object_not_in_prerequisite_state then null;
end;
$$;

do $$
begin
  update public.inventory_item_events set reason = 'rewritten';
  raise exception 'ASSERTION FAILED: E4. catalogue history is immutable too';
exception when object_not_in_prerequisite_state then null;
end;
$$;

-- E5. Direct asset-state bypass is impossible. As a client there is no grant;
-- as a privileged writer the transition guard still refuses, and even a change
-- to an unprotected column cannot land without a declared event.
do $$
begin
  update public.equipment_assets set status = 'available', current_custodian_person_id = null
  where id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E5. the transition guard must refuse a privileged position change';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  update public.equipment_assets set notes = 'quietly edited' where id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E5. no asset change may land without a declared event';
exception when insufficient_privilege then null;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0002', true);

do $$
begin
  update public.equipment_assets set status = 'available' where id = pg_temp.fx('audit_asset');
  raise exception 'ASSERTION FAILED: E5. a client must not update an asset at all';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  insert into public.equipment_assets (inventory_item_id, asset_code)
  values (pg_temp.fx('drill_item'), 'BD-SNEAK-001');
  raise exception 'ASSERTION FAILED: E5. a client must not insert an asset directly';
exception when insufficient_privilege then null;
end;
$$;

-- E6. Optimistic concurrency: a stale version is refused.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('audit_asset');
  perform public.issue_equipment_asset(asset.id, asset.version - 1, pg_temp.fx('alpha_site'),
    null, null, null, null, null);
  raise exception 'ASSERTION FAILED: E6. a stale write must be refused';
exception when serialization_failure then null;
end;
$$;

-- E7. The state machine holds: an available asset cannot be transferred, and a
-- retired asset is terminal to every ordinary action.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('audit_asset');
  perform public.transfer_equipment_asset(asset.id, asset.version, pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: E7. only issued equipment can be transferred';
exception when invalid_parameter_value then null;
end;
$$;

do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('gen_asset');
  perform pg_temp.assert_eq(asset.status, 'retired', 'E7. the fixture asset is retired');
  perform public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001', null, null, null, null);
  raise exception 'ASSERTION FAILED: E7. a retired asset cannot be issued';
exception when invalid_parameter_value then null;
end;
$$;

-- E8. An inactive person cannot take custody.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('audit_asset');
  perform public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa003', null, null, null, null);
  raise exception 'ASSERTION FAILED: E8. an inactive person cannot take custody';
exception when invalid_parameter_value then null;
end;
$$;

-- E9. A custodian needs no portal account.
do $$
declare held integer;
begin
  perform pg_temp.assert_true(
    not exists (select 1 from public.profiles p where p.id = '00000000-0000-0000-0000-0000000fa002'),
    'E9. the custodian has no Operations Hub account');
  perform pg_temp.assert_true(
    not exists (select 1 from auth.users u where u.id = '00000000-0000-0000-0000-0000000fa002'),
    'E9. and no login of any kind');
  select count(*) into held from public.equipment_asset_events
  where new_snapshot ->> 'current_custodian_person_id' = '00000000-0000-0000-0000-0000000fa002';
  perform pg_temp.assert_true(held > 0, 'E9. and has nevertheless legitimately held equipment');
end;
$$;

-- =====================================================================
-- F. Stock truth
-- =====================================================================

-- F1. The full reconciliation: receive, issue, transfer, return, consume,
-- damage, lose — and the position agrees at every position throughout.
do $$
declare item uuid; alpha uuid; beta uuid; total numeric;
begin
  item := pg_temp.fx('cement_item');
  alpha := pg_temp.fx('alpha_site');
  beta := pg_temp.fx('beta_site');

  -- Carried forward from section C: 60 in Botanique custody, 25 at Alpha.
  perform pg_temp.assert_eq(pg_temp.bal(item, null), 60::numeric,
    'F1. the custody position carried forward');
  perform pg_temp.assert_eq(pg_temp.bal(item, alpha), 25::numeric,
    'F1. the Alpha position carried forward');

  perform public.record_stock_transfer(item, 'transferred', 10, alpha, beta, null, null, null, 'Alpha to Beta');
  perform pg_temp.assert_eq(pg_temp.bal(item, alpha), 15::numeric, 'F1. transfer leaves Alpha');
  perform pg_temp.assert_eq(pg_temp.bal(item, beta), 10::numeric, 'F1. transfer arrives at Beta');

  perform public.record_stock_transfer(item, 'returned', 5, beta, null, null, null, null, 'Surplus back');
  perform pg_temp.assert_eq(pg_temp.bal(item, beta), 5::numeric, 'F1. return leaves Beta');
  perform pg_temp.assert_eq(pg_temp.bal(item, null), 65::numeric,
    'F1. return arrives in Botanique custody');

  perform public.record_stock_usage(item, 'damaged', 2, beta, null, null, null, 'Bags split in the rain');
  perform pg_temp.assert_eq(pg_temp.bal(item, beta), 3::numeric,
    'F1. damage decreases the position');

  perform public.record_stock_usage(item, 'lost', 1, beta, null, null, null, 'Unaccounted at stock-take');
  perform pg_temp.assert_eq(pg_temp.bal(item, beta), 2::numeric,
    'F1. loss decreases the position');

  -- 100 received, 15 consumed, 2 damaged, 1 lost = 82 still held anywhere.
  select coalesce(sum(quantity), 0) into total from public.inventory_stock_position(item);
  perform pg_temp.assert_eq(total, 82::numeric,
    'F1. the whole ledger reconciles to what Botanique still holds');
end;
$$;

-- F2. 'damaged' and 'lost' must say why.
do $$
begin
  perform public.record_stock_usage(pg_temp.fx('cement_item'), 'lost', 1, pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: F2. lost stock must state a reason';
exception when invalid_parameter_value then null;
end;
$$;

-- F3. Ordinary operations cannot drive stock negative — consuming more than is
-- there...
do $$
begin
  perform public.record_stock_usage(pg_temp.fx('cement_item'), 'consumed', 999, pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: F3. consumption must not exceed what is there';
exception when invalid_parameter_value then null;
end;
$$;

-- ...transferring more than the source holds...
do $$
begin
  perform public.record_stock_transfer(pg_temp.fx('cement_item'), 'transferred', 999,
    pg_temp.fx('beta_site'), pg_temp.fx('alpha_site'));
  raise exception 'ASSERTION FAILED: F3. a transfer must not exceed the source position';
exception when invalid_parameter_value then null;
end;
$$;

-- ...and drawing on a position that holds nothing at all.
do $$
declare item public.inventory_items;
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Empty Consumable', 'consumables', 'stock', 'unit') returning * into item;
  perform public.record_stock_usage(item.id, 'consumed', 1, null);
  raise exception 'ASSERTION FAILED: F3. an empty position cannot be drawn on';
exception when invalid_parameter_value then null;
end;
$$;

-- F4. A Principal adjustment is bound by the same floor: even stock-taking
-- cannot invent a negative position.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);
do $$
begin
  perform public.record_stock_adjustment(pg_temp.fx('cement_item'), 'adjustment_out', 999,
    pg_temp.fx('beta_site'), 'Trying to go negative');
  raise exception 'ASSERTION FAILED: F4. an adjustment must not drive the position negative';
exception when invalid_parameter_value then null;
end;
$$;

-- F5. Movement history is immutable, undeletable and not directly insertable —
-- again proved at both layers.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0002', true);
do $$
begin
  update public.inventory_stock_movements set quantity = 1 where inventory_item_id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: F5. a client must not update a stock movement';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  delete from public.inventory_stock_movements where inventory_item_id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: F5. a client must not delete a stock movement';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  insert into public.inventory_stock_movements (inventory_item_id, movement_type, quantity, to_site_id, actor_profile_id)
  values (pg_temp.fx('cement_item'), 'received', 500, null, '00000000-0000-0000-0000-0000000f0002');
  raise exception 'ASSERTION FAILED: F5. a client must not insert a stock movement directly';
exception when insufficient_privilege then null;
end;
$$;

reset role;
do $$
begin
  update public.inventory_stock_movements set quantity = 1 where inventory_item_id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: F5. the immutability trigger must refuse even a privileged UPDATE';
exception when object_not_in_prerequisite_state then null;
end;
$$;

do $$
begin
  delete from public.inventory_stock_movements where inventory_item_id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: F5. the immutability trigger must refuse even a privileged DELETE';
exception when object_not_in_prerequisite_state then null;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0002', true);

-- F6. Quantity is always positive; direction is the movement type's job.
do $$
begin
  perform public.record_stock_receipt(pg_temp.fx('cement_item'), -5);
  raise exception 'ASSERTION FAILED: F6. a negative quantity must be refused';
exception when invalid_parameter_value then null;
end;
$$;

-- F7. The two truth models do not cross over.
do $$
begin
  perform public.record_stock_receipt(pg_temp.fx('drill_item'), 5);
  raise exception 'ASSERTION FAILED: F7. an asset-tracked item has no stock quantity';
exception when invalid_parameter_value then null;
end;
$$;

do $$
begin
  perform public.register_equipment_asset(pg_temp.fx('cement_item'), 'BD-CEMENT-001');
  raise exception 'ASSERTION FAILED: F7. a stock-tracked item has no individual assets';
exception when invalid_parameter_value then null;
end;
$$;

-- F8. Stock can be held by Botanique with NO Site, and no fake store row was
-- created to represent it.
do $$
declare store_rows integer;
begin
  perform pg_temp.assert_true(pg_temp.bal(pg_temp.fx('cement_item'), null) > 0,
    'F8. Botanique holds stock at no Site at all');
  select count(*) into store_rows from public.sites
  where site_name ~* '(main store|warehouse|store room|storeroom|head office|operations hub store|depot)';
  perform pg_temp.assert_eq(store_rows, 0, 'F8. no fabricated store, depot or office Site was created');
end;
$$;

-- F9. A movement cannot be a no-op against its own position.
do $$
begin
  perform public.record_stock_transfer(pg_temp.fx('cement_item'), 'transferred', 1,
    pg_temp.fx('beta_site'), pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: F9. stock must move between two different positions';
exception when invalid_parameter_value then null;
end;
$$;

-- F10. The derived read model and the guard compute the same number, and
-- Botanique custody is reported as a position with no site name rather than an
-- invented one.
do $$
declare custody_row record;
begin
  select * into custody_row from public.inventory_stock_position(pg_temp.fx('cement_item'))
  where site_id is null;
  perform pg_temp.assert_true(custody_row.quantity is not null,
    'F10. the read model reports the Botanique-custody position');
  perform pg_temp.assert_true(custody_row.site_name is null, 'F10. Botanique custody has no site name');
  perform pg_temp.assert_eq(custody_row.quantity,
    pg_temp.bal(pg_temp.fx('cement_item'), null),
    'F10. the read model and the guard compute the same number');
end;
$$;

-- =====================================================================
-- G. Site / Project / Maintenance boundary
-- =====================================================================

-- G1. Equipment and stock live entirely without a Project.
do $$
declare assets integer; projectless_movements integer;
begin
  select count(*) into assets from public.equipment_assets;
  perform pg_temp.assert_true(assets > 0, 'G1. equipment exists');
  select count(*) into projectless_movements from public.inventory_stock_movements where project_id is null;
  perform pg_temp.assert_true(projectless_movements > 0, 'G1. stock has moved with no Project named');

  perform pg_temp.assert_true(
    not exists (select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'equipment_assets' and column_name = 'project_id'),
    'G1. an asset carries no Project at all — Site is the durable context');
end;
$$;

-- G2. A MAINTENANCE-ONLY Site — one with no Botanique Project — is a fully
-- usable position for both equipment and stock.
do $$
declare asset public.equipment_assets; item public.inventory_items; maint uuid;
begin
  maint := pg_temp.fx('maint_site');
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.projects where site_id = maint), 0,
    'G2. the maintenance-only Site genuinely has no Project');

  asset := public.register_equipment_asset(pg_temp.fx('drill_item'), 'BD-DRL-100');
  asset := public.issue_equipment_asset(asset.id, asset.version, maint,
    '00000000-0000-0000-0000-0000000fa001', current_date + 5, null, null, 'Grounds upkeep');
  perform pg_temp.assert_eq(asset.current_site_id, maint,
    'G2. equipment issues to a maintenance-only Site with no Project');
  perform pg_temp.fxset('maint_asset', asset.id);

  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Lawn Fertiliser', 'consumables', 'stock', 'kilogram') returning * into item;
  perform pg_temp.fxset('fert_item', item.id);
  perform public.record_stock_receipt(item.id, 50);
  perform public.record_stock_transfer(item.id, 'issued', 20, null, maint);
  perform pg_temp.assert_eq(pg_temp.bal(item.id, maint), 20::numeric,
    'G2. stock issues to a maintenance-only Site with no Project');
end;
$$;

-- G3. Legitimate Project context is accepted, on the Site that Project is at.
do $$
declare asset public.equipment_assets; ev public.equipment_asset_events;
begin
  asset := public.register_equipment_asset(pg_temp.fx('drill_item'), 'BD-DRL-101');
  asset := public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('alpha_site'),
    '00000000-0000-0000-0000-0000000fa001', null, '00000000-0000-0000-0000-0000000fb001', null, 'Alpha works');
  select * into ev from public.equipment_asset_events
  where equipment_asset_id = asset.id and event_type = 'issued';
  perform pg_temp.assert_eq(ev.project_id, '00000000-0000-0000-0000-0000000fb001'::uuid,
    'G3. legitimate Project context is recorded on the event');
end;
$$;

do $$
declare moved public.inventory_stock_movements;
begin
  moved := public.record_stock_transfer(pg_temp.fx('cement_item'), 'issued', 5, null, pg_temp.fx('alpha_site'),
    null, '00000000-0000-0000-0000-0000000fb001', null, 'For Alpha');
  perform pg_temp.assert_eq(moved.project_id, '00000000-0000-0000-0000-0000000fb001'::uuid,
    'G3. legitimate Project context is recorded on the movement');
end;
$$;

-- G4. A Project belonging to a DIFFERENT Site is rejected. This is the
-- "unrelated Project attached to unrelated Site" case, expressed generically:
-- nothing here names any real Project or Site.
do $$
declare asset public.equipment_assets;
begin
  asset := public.register_equipment_asset(pg_temp.fx('drill_item'), 'BD-DRL-102');
  perform public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('beta_site'),
    null, null, '00000000-0000-0000-0000-0000000fb001', null, null);
  raise exception 'ASSERTION FAILED: G4. a Project from another Site must not be attached to equipment';
exception when invalid_parameter_value then null;
end;
$$;

do $$
begin
  perform public.record_stock_transfer(pg_temp.fx('cement_item'), 'issued', 1, null, pg_temp.fx('beta_site'),
    null, '00000000-0000-0000-0000-0000000fb001', null, null);
  raise exception 'ASSERTION FAILED: G4. a Project from another Site must not be attached to a movement';
exception when invalid_parameter_value then null;
end;
$$;

-- G5. Legitimate Maintenance Visit context is accepted on its own Site, with no
-- Project anywhere in sight.
do $$
declare moved public.inventory_stock_movements;
begin
  moved := public.record_stock_usage(pg_temp.fx('fert_item'), 'consumed', 5, pg_temp.fx('maint_site'),
    '00000000-0000-0000-0000-0000000fa001', null, pg_temp.fx('maint_visit'), null, 'Applied on the grounds visit');
  perform pg_temp.assert_eq(moved.maintenance_visit_id, pg_temp.fx('maint_visit'),
    'G5. legitimate Maintenance visit context is recorded');
  perform pg_temp.assert_true(moved.project_id is null, 'G5. and it needed no Project at all');
end;
$$;

-- G6. A Maintenance Visit belonging to a different Site is rejected.
do $$
begin
  perform public.record_stock_usage(pg_temp.fx('fert_item'), 'consumed', 1, pg_temp.fx('maint_site'),
    null, null, pg_temp.fx('alpha_visit'), null, 'Wrong visit');
  raise exception 'ASSERTION FAILED: G6. a Maintenance visit from another Site must not be attached';
exception when invalid_parameter_value then null;
end;
$$;

do $$
declare asset public.equipment_assets;
begin
  asset := public.register_equipment_asset(pg_temp.fx('drill_item'), 'BD-DRL-103');
  perform public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('maint_site'),
    null, null, null, pg_temp.fx('alpha_visit'), null);
  raise exception 'ASSERTION FAILED: G6. a Maintenance visit from another Site must not be attached to equipment';
exception when invalid_parameter_value then null;
end;
$$;

-- G7. Context that does not resolve at all is rejected.
do $$
begin
  perform public.record_stock_transfer(pg_temp.fx('cement_item'), 'issued', 1, null, pg_temp.fx('alpha_site'),
    null, '00000000-0000-0000-0000-00000000dead', null, null);
  raise exception 'ASSERTION FAILED: G7. an unknown Project must be rejected';
exception when no_data_found then null;
end;
$$;

do $$
begin
  perform public.record_stock_transfer(pg_temp.fx('cement_item'), 'issued', 1, null, pg_temp.fx('alpha_site'),
    null, null, '00000000-0000-0000-0000-00000000beef', null);
  raise exception 'ASSERTION FAILED: G7. an unknown Maintenance visit must be rejected';
exception when no_data_found then null;
end;
$$;

-- G8. Context is refused where there is no Site for it to agree with, rather
-- than being silently accepted.
do $$
begin
  perform public.record_stock_receipt(pg_temp.fx('cement_item'), 1, null, null,
    '00000000-0000-0000-0000-0000000fb001', null, null);
  raise exception 'ASSERTION FAILED: G8. Project context needs a Site to agree with';
exception when invalid_parameter_value then null;
end;
$$;

-- G9. Nothing in this domain wrote into Maintenance, People, Projects, Sites or
-- the Daily Site Record.
do $$
begin
  perform pg_temp.assert_true(
    not exists (select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name in ('maintenance_relationships', 'maintenance_visits', 'maintenance_assignments',
                           'projects', 'sites', 'people', 'daily_site_entries')
        and (column_name like '%inventory%' or column_name like '%equipment%' or column_name like '%asset%')),
    'G9. no Inventory column was added to any existing table');
end;
$$;

-- =====================================================================
-- H. Catalogue identity hardening
-- =====================================================================

-- H1. Before history, a fresh catalogue row is still freely correctable.
do $$
declare item public.inventory_items;
begin
  insert into public.inventory_items (item_name, category, tracking_method, unit_of_measure)
  values ('Typo Nmae', 'manual_tools', 'asset', 'unit') returning * into item;
  update public.inventory_items
  set item_name = 'Typo Name', tracking_method = 'stock', unit_of_measure = 'box'
  where id = item.id;

  select * into item from public.inventory_items where id = item.id;
  perform pg_temp.assert_eq(item.item_name, 'Typo Name', 'H1. a fresh catalogue row is still freely correctable');
  perform pg_temp.assert_eq(item.tracking_method, 'stock', 'H1. tracking method is still changeable before history');
  perform pg_temp.assert_eq(item.version, 2, 'H1. the edit bumped the version');
  perform pg_temp.fxset('fresh_item', item.id);
end;
$$;

-- H2. Once history exists, tracking method and unit are frozen outright.
do $$
begin
  update public.inventory_items set tracking_method = 'asset' where id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: H2. tracking method must freeze once history exists';
exception when invalid_parameter_value then null;
end;
$$;

do $$
begin
  update public.inventory_items set unit_of_measure = 'kilogram' where id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: H2. the unit must freeze once quantities are recorded in it';
exception when invalid_parameter_value then null;
end;
$$;

-- H3. And the name and category become the Principal's to correct.
do $$
begin
  update public.inventory_items set item_name = 'Manager Rename' where id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: H3. identity correction with history is Principal-only';
exception when insufficient_privilege then null;
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000f0001', true);

do $$
declare item public.inventory_items; ev public.inventory_item_events;
begin
  select * into item from public.inventory_items where id = pg_temp.fx('cement_item');
  item := public.correct_inventory_item_identity(item.id, item.version, 'Cement 50kg', 'materials', null,
    'Founder confirmed the bag size, 19 Aug 2026');
  perform pg_temp.assert_eq(item.item_name, 'Cement 50kg', 'H3. the Principal can correct catalogue identity');

  select * into ev from public.inventory_item_events
  where inventory_item_id = item.id order by resulting_version desc limit 1;
  perform pg_temp.assert_eq(ev.event_type, 'corrected', 'H3. the correction is recorded as a correction');
  perform pg_temp.assert_eq(ev.reason, 'Founder confirmed the bag size, 19 Aug 2026',
    'H3. and it carries its reason');
  perform pg_temp.assert_eq(ev.previous_snapshot ->> 'item_name', 'Cement',
    'H3. the wrong name is preserved, not erased');
end;
$$;

-- H4. Even the Principal cannot flip tracking method once history exists.
do $$
begin
  update public.inventory_items set tracking_method = 'asset' where id = pg_temp.fx('cement_item');
  raise exception 'ASSERTION FAILED: H4. tracking method is frozen for everyone once history exists';
exception when invalid_parameter_value then null;
end;
$$;

-- H5. Deactivation is reasoned, auditable, and refuses to hide live equipment.
do $$
declare item public.inventory_items;
begin
  select * into item from public.inventory_items where id = pg_temp.fx('drill_item');
  perform public.deactivate_inventory_item(item.id, item.version, 'No longer carried');
  raise exception 'ASSERTION FAILED: H5. an item with equipment in circulation must not be deactivated';
exception when invalid_parameter_value then null;
end;
$$;

do $$
declare item public.inventory_items; ev public.inventory_item_events;
begin
  select * into item from public.inventory_items where id = pg_temp.fx('fresh_item');
  item := public.deactivate_inventory_item(item.id, item.version, 'Created by mistake');
  perform pg_temp.assert_true(not item.is_active, 'H5. the Principal can deactivate an unused catalogue item');

  select * into ev from public.inventory_item_events
  where inventory_item_id = item.id order by resulting_version desc limit 1;
  perform pg_temp.assert_eq(ev.event_type, 'deactivated', 'H5. deactivation is recorded');
  perform pg_temp.assert_eq(ev.reason, 'Created by mistake', 'H5. with its reason');

  item := public.reactivate_inventory_item(item.id, item.version, 'Needed after all');
  perform pg_temp.assert_true(item.is_active, 'H5. and can be reactivated');
end;
$$;

-- H6. An inactive item accepts no new stock and no new equipment.
do $$
declare item public.inventory_items;
begin
  select * into item from public.inventory_items where id = pg_temp.fx('fresh_item');
  item := public.deactivate_inventory_item(item.id, item.version, 'Withdrawn from the catalogue');
  perform public.record_stock_receipt(item.id, 1);
  raise exception 'ASSERTION FAILED: H6. an inactive catalogue item must accept no stock';
exception when invalid_parameter_value then null;
end;
$$;

-- =====================================================================
-- Z. Closing reconciliation — nothing was invented, everything balances
-- =====================================================================

do $$
declare orphans integer; negatives integer; seeded integer;
begin
  select count(*) into orphans from public.equipment_assets a
  where not exists (select 1 from public.equipment_asset_events e
                    where e.equipment_asset_id = a.id and e.event_type = 'registered');
  perform pg_temp.assert_eq(orphans, 0, 'Z1. every asset has its registration event');

  select count(*) into negatives from public.inventory_stock_position() where quantity < 0;
  perform pg_temp.assert_eq(negatives, 0, 'Z2. no derived stock position is negative');

  -- Every catalogue row in this database was created by the test itself. The
  -- migration seeds nothing.
  select count(*) into seeded from public.inventory_items
  where created_by not in ('00000000-0000-0000-0000-0000000f0001', '00000000-0000-0000-0000-0000000f0002');
  perform pg_temp.assert_eq(seeded, 0, 'Z3. the migration seeds no catalogue data of its own');
end;
$$;

reset role;
rollback;
