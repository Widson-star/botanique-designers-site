-- BOTANIQUE DESIGNERS — Inventory Site register.
--
-- Runs on an isolated PostgreSQL database after the full migration chain.
-- Proves that Site eligibility for a new Inventory action is decided by
-- INVENTORY authority, and not by whichever ACL another domain happens to
-- impose on its own tables.
--
-- The case that matters is 3: the Operations Manager holds full portfolio
-- Inventory authority, but the projects SELECT policy only shows a manager the
-- Projects they lead or are assigned to. Deriving eligibility from that read
-- hid valid operational Sites from the person who runs the portfolio.
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

create temp table fxids (k text primary key, v uuid);
grant all on fxids to public;
create function pg_temp.fxset(key text, val uuid) returns uuid language plpgsql as $$
begin insert into fxids (k, v) values (key, val) on conflict (k) do update set v = excluded.v; return val; end;
$$;
create function pg_temp.fx(key text) returns uuid language sql stable as $$ select v from fxids where k = key $$;

-- Reads the register as the current caller.
create function pg_temp.selectable(target uuid) returns boolean language sql stable as $$
  select coalesce((select r.is_selectable from public.inventory_site_register() r where r.id = target), false)
$$;
create function pg_temp.visible(target uuid) returns boolean language sql stable as $$
  select exists (select 1 from public.inventory_site_register() r where r.id = target)
$$;
create function pg_temp.register_rows() returns bigint language sql stable as $$
  select count(*) from public.inventory_site_register()
$$;

-- =====================================================================
-- Fixtures
-- =====================================================================

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000e0001', 'principal@sitereg.test'),
  ('00000000-0000-0000-0000-0000000e0002', 'manager@sitereg.test'),
  ('00000000-0000-0000-0000-0000000e0003', 'staff@sitereg.test'),
  ('00000000-0000-0000-0000-0000000e0004', 'viewer@sitereg.test'),
  ('00000000-0000-0000-0000-0000000e0005', 'otherlead@sitereg.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000e0001', 'principal@sitereg.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000e0002', 'manager@sitereg.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000e0003', 'staff@sitereg.test', 'Project Team', 'staff', true),
  ('00000000-0000-0000-0000-0000000e0004', 'viewer@sitereg.test', 'Read Only', 'viewer', true),
  ('00000000-0000-0000-0000-0000000e0005', 'otherlead@sitereg.test', 'Another Manager', 'manager', true);

-- Each Project creates its own Site through the ordinary Project path.
-- UNASSIGNED is led by somebody else entirely, so the Operations Manager under
-- test has no lead or assignment relationship with it at all.
insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000000eb001', 'Unassigned Ongoing Build', 'Property Unassigned', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000e0005', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000000eb002', 'Archived Build', 'Property Archived', 'Residential', 'Ongoing', 'Implementation', true,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000000eb003', 'Completed Build', 'Property Completed', 'Residential', 'Completed', 'Completed', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000000eb004', 'Asset Holding Build', 'Property Holds Asset', 'Residential', 'Completed', 'Completed', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000000eb005', 'Stock Holding Build', 'Property Holds Stock', 'Residential', 'Completed', 'Completed', false,
   null, false, 'Not Reviewed');

select pg_temp.fxset('site_unassigned', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000eb001'));
select pg_temp.fxset('site_archived', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000eb002'));
select pg_temp.fxset('site_completed', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000eb003'));
select pg_temp.fxset('site_asset', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000eb004'));
select pg_temp.fxset('site_stock', (select site_id from public.projects where id = '00000000-0000-0000-0000-0000000eb005'));

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0001', true);

-- A maintenance-only Site: no Project at all, active Maintenance.
select pg_temp.fxset('site_maintained', (public.create_maintenance_site('Maintained Only Estate', 'Karen', 'Nairobi')).id);
insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
values (pg_temp.fx('site_maintained'), null, 'Fortnightly grounds upkeep', current_date, 'fortnightly');

-- A Site that is purely historical: no live Project, no Maintenance, nothing
-- held. It must still be RETURNED so old records resolve their names.
select pg_temp.fxset('site_history', (public.create_maintenance_site('Retired Fixture Estate', 'Westlands', 'Nairobi')).id);
insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
values (pg_temp.fx('site_history'), null, 'Historic arrangement', current_date, 'as_needed');
do $$
declare rel public.maintenance_relationships;
begin
  select * into rel from public.maintenance_relationships where site_id = pg_temp.fx('site_history');
  perform public.end_maintenance_relationship(rel.id, rel.version, 'Arrangement closed, kept for history');
end;
$$;

-- Inventory truth: one asset positioned at site_asset, stock held at site_stock.
insert into public.inventory_items (id, item_name, category, tracking_method, unit_of_measure) values
  ('00000000-0000-0000-0000-0000000ec001', 'Register Mower', 'grounds_equipment', 'asset', 'unit'),
  ('00000000-0000-0000-0000-0000000ec002', 'Register Cement', 'materials', 'stock', 'bag');

do $$
declare asset public.equipment_assets;
begin
  asset := public.register_equipment_asset('00000000-0000-0000-0000-0000000ec001', 'REG-LM-001');
  asset := public.issue_equipment_asset(asset.id, asset.version, pg_temp.fx('site_asset'),
    null, null, null, null, 'Positioned for the register test');
  perform pg_temp.fxset('held_asset', asset.id);
end;
$$;

select public.record_stock_receipt('00000000-0000-0000-0000-0000000ec002', 20);
select public.record_stock_transfer('00000000-0000-0000-0000-0000000ec002', 'issued', 20, null, pg_temp.fx('site_stock'));

-- =====================================================================
-- 1 / 2. Both Inventory roles can read the register
-- =====================================================================

do $$
begin
  perform pg_temp.assert_true(pg_temp.register_rows() > 0, '1. the Principal can read the Inventory Site register');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0002', true);
do $$
begin
  perform pg_temp.assert_true(pg_temp.register_rows() > 0, '2. the Operations Manager can read the Inventory Site register');
end;
$$;

-- =====================================================================
-- 3. THE POINT OF THIS MIGRATION.
-- The Manager neither leads nor is assigned to the Unassigned Ongoing Project,
-- so the ordinary Projects read cannot see it — yet Inventory authority is
-- portfolio-wide, so its Site must still be selectable.
-- =====================================================================

do $$
declare visible_projects integer;
begin
  -- First prove the premise: the manager genuinely cannot read that Project.
  select count(*) into visible_projects
  from public.projects where id = '00000000-0000-0000-0000-0000000eb001';
  perform pg_temp.assert_eq(visible_projects, 0,
    '3. premise — the Manager cannot read the Project through ordinary Project RLS');

  -- And now the correction: Inventory still offers its Site.
  perform pg_temp.assert_true(pg_temp.selectable(pg_temp.fx('site_unassigned')),
    '3. the Manager still gets the ongoing Site despite no lead or assignment');
end;
$$;

-- The Principal, who can read everything, agrees — the register is not
-- returning a different answer per role.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0001', true);
do $$
begin
  perform pg_temp.assert_true(pg_temp.selectable(pg_temp.fx('site_unassigned')),
    '3. the Principal sees the same verdict for that Site');
end;
$$;

do $$
declare principal_ids uuid[]; manager_ids uuid[];
begin
  select array_agg(r.id order by r.id) into principal_ids
  from public.inventory_site_register() r where r.is_selectable;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0002', true);
  select array_agg(r.id order by r.id) into manager_ids
  from public.inventory_site_register() r where r.is_selectable;
  perform pg_temp.assert_eq(manager_ids, principal_ids,
    '3. Principal and Operations Manager receive an identical selectable set');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0001', true);
end;
$$;

-- =====================================================================
-- 4 / 5. Staff and viewer reach nothing
-- =====================================================================

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0003', true);
do $$
begin
  perform pg_temp.assert_eq(pg_temp.register_rows(), 0::bigint, '4. staff receives no Site from the register');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0004', true);
do $$
begin
  perform pg_temp.assert_eq(pg_temp.register_rows(), 0::bigint, '5. viewer receives no Site from the register');
end;
$$;

-- 14. And the register grants them no side-door into Inventory itself.
do $$
declare visible integer;
begin
  select count(*) into visible from public.inventory_items;
  perform pg_temp.assert_eq(visible, 0, '14. viewer still sees no catalogue item');
  select count(*) into visible from public.equipment_assets;
  perform pg_temp.assert_eq(visible, 0, '14. viewer still sees no equipment');
  select count(*) into visible from public.inventory_stock_movements;
  perform pg_temp.assert_eq(visible, 0, '14. viewer still sees no stock movement');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0003', true);
do $$
declare visible integer;
begin
  select count(*) into visible from public.inventory_items;
  perform pg_temp.assert_eq(visible, 0, '14. staff still sees no catalogue item');
  select count(*) into visible from public.equipment_assets;
  perform pg_temp.assert_eq(visible, 0, '14. staff still sees no equipment');
end;
$$;

-- =====================================================================
-- 6-12. The eligibility rule itself, read as the Operations Manager
-- =====================================================================

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000e0002', true);

do $$
begin
  -- 6. Ongoing, non-archived Project.
  perform pg_temp.assert_true(pg_temp.selectable(pg_temp.fx('site_unassigned')),
    '6. an ongoing non-archived Project Site qualifies');

  -- 7. Archived, and separately non-Ongoing, do not.
  perform pg_temp.assert_true(not pg_temp.selectable(pg_temp.fx('site_archived')),
    '7. an archived Project Site does not qualify');
  perform pg_temp.assert_true(not pg_temp.selectable(pg_temp.fx('site_completed')),
    '7. a completed Project Site does not qualify on Project truth alone');

  -- 8. Maintenance alone is enough, with no Project at all.
  perform pg_temp.assert_true(pg_temp.selectable(pg_temp.fx('site_maintained')),
    '8. an active Maintenance-only Site qualifies with no Project');

  -- 9 / 10. Physical truth outlives the Project that put it there.
  perform pg_temp.assert_true(pg_temp.selectable(pg_temp.fx('site_asset')),
    '9. a Site holding an equipment asset qualifies though its Project is Completed');
  perform pg_temp.assert_true(pg_temp.selectable(pg_temp.fx('site_stock')),
    '10. a Site holding non-zero stock qualifies though its Project is Completed');

  -- 12. Everything is still RETURNED, so historical names resolve.
  perform pg_temp.assert_true(pg_temp.visible(pg_temp.fx('site_history')),
    '12. a non-selectable historical Site is still returned by the register');
  perform pg_temp.assert_true(not pg_temp.selectable(pg_temp.fx('site_history')),
    '12. but it is not offered as a new destination');
  perform pg_temp.assert_true(pg_temp.visible(pg_temp.fx('site_archived')),
    '12. an archived Project Site also stays resolvable');
end;
$$;

-- 11. Bring the stock legitimately back to zero. Stock truth must stop
-- qualifying the Site — "has ever had a movement" is deliberately not enough.
do $$
begin
  perform public.record_stock_usage('00000000-0000-0000-0000-0000000ec002', 'consumed', 20, pg_temp.fx('site_stock'));
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.inventory_stock_position('00000000-0000-0000-0000-0000000ec002')
     where site_id = pg_temp.fx('site_stock')), 0,
    '11. the Site position has genuinely reconciled to zero');
  perform pg_temp.assert_true(not pg_temp.selectable(pg_temp.fx('site_stock')),
    '11. a Site whose stock reconciles to zero stops qualifying through stock truth');
  perform pg_temp.assert_true(pg_temp.visible(pg_temp.fx('site_stock')),
    '11. but it is still returned for historical resolution');
end;
$$;

-- Returning the asset to Botanique custody likewise ends that Site's claim.
do $$
declare asset public.equipment_assets;
begin
  select * into asset from public.equipment_assets where id = pg_temp.fx('held_asset');
  perform public.return_equipment_asset(asset.id, asset.version, null, null, null, null, 'Back to Botanique');
  perform pg_temp.assert_true(not pg_temp.selectable(pg_temp.fx('site_asset')),
    '9. once the asset comes back, the Site stops qualifying through equipment truth');
end;
$$;

-- =====================================================================
-- 13. The rule encodes no production identity
-- =====================================================================

do $$
declare body text;
begin
  select pg_get_functiondef(p.oid) into body
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'inventory_site_register';

  -- No UUID literal, and no Site name, may appear in the algorithm.
  perform pg_temp.assert_true(body !~* '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    '13. the register encodes no production UUID');
  perform pg_temp.assert_true(body !~* '(lugulu|kitusuru|karen|alego|fixture|verification|intake)',
    '13. the register names no production Site or fixture');
  perform pg_temp.assert_true(body ~ 'private_inventory_role',
    '13. the register gates on the Inventory role');
  perform pg_temp.assert_true(body ~ 'private_inventory_stock_balance',
    '13. stock eligibility derives from the movement ledger');
end;
$$;

do $$
declare cfg text;
begin
  select array_to_string(p.proconfig, ',') into cfg
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'inventory_site_register';
  perform pg_temp.assert_true(cfg like '%search_path=%', 'the register pins an explicit search_path');
  perform pg_temp.assert_true(
    (select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'inventory_site_register'),
    'the register is SECURITY DEFINER');
  perform pg_temp.assert_true(
    not has_function_privilege('anon', 'public.inventory_site_register()', 'execute'),
    'anon cannot execute the register');
  perform pg_temp.assert_true(
    has_function_privilege('authenticated', 'public.inventory_site_register()', 'execute'),
    'authenticated may call it, and the body decides what they get');
end;
$$;

reset role;
rollback;
