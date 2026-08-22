-- =====================================================================
-- Authority 17 — Tools & Equipment full control, and batch registration
-- =====================================================================
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(claim boolean, label text) returns void
language plpgsql as $$
begin
  if claim is distinct from true then raise exception 'ASSERTION FAILED: %', label; end if;
end;
$$;

create or replace function pg_temp.assert_eq(actual anyelement, expected anyelement, label text) returns void
language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', label, expected, actual;
  end if;
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000094f1', 'fc-owner@inventory.test'),
  ('00000000-0000-0000-0000-0000000094f2', 'fc-manager@inventory.test'),
  ('00000000-0000-0000-0000-0000000094f3', 'fc-staff@inventory.test'),
  ('00000000-0000-0000-0000-0000000094f4', 'fc-viewer@inventory.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000094f1', 'fc-owner@inventory.test', 'FC Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000094f2', 'fc-manager@inventory.test', 'FC Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000094f3', 'fc-staff@inventory.test', 'FC Staff', 'staff', true),
  ('00000000-0000-0000-0000-0000000094f4', 'fc-viewer@inventory.test', 'FC Viewer', 'viewer', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000094f1', true);

insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-0000009410a1', 'Kefa Nyamari Ochenge', 'regular_staff'),
  ('00000000-0000-0000-0000-0000009410a2', 'Lincoln Waweru', 'regular_staff');

insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000009430c1', 'FC Site One', 'Karen Residence HSE 19', 'Residential', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000009430c2', 'FC Site Two', 'Kitusuru Residence House 0.8A', 'Residential', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed');

insert into public.inventory_items (id, item_name, category, tracking_method, unit_of_measure, is_active) values
  ('00000000-0000-0000-0000-0000009420b1', 'FC Rake', 'manual_tools', 'asset', 'unit', true),
  ('00000000-0000-0000-0000-0000009420b2', 'FC Spade', 'manual_tools', 'asset', 'unit', true),
  ('00000000-0000-0000-0000-0000009420b3', 'FC Cement', 'materials', 'stock', 'bags', true);

-- =====================================================================
-- A/B/C/D. Batch registration
-- =====================================================================
do $$
declare
  rake uuid := '00000000-0000-0000-0000-0000009420b1';
  karen uuid;
  made integer;
  codes text[];
  suffixes bigint[];
  n integer;
begin
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';

  -- A. A batch of ONE.
  select count(*) into made from public.register_equipment_assets(rake, 1, 'owned', 'good', karen);
  perform pg_temp.assert_eq(made, 1, 'A. a batch of one registers one tool');

  -- B. A batch of SIX — the Authority 17 example: six rakes at Karen.
  select array_agg(asset_code order by asset_code) into codes
  from public.register_equipment_assets(rake, 6, 'owned', 'good', karen);
  perform pg_temp.assert_eq(array_length(codes, 1), 6, 'B. six rakes register in one operation');

  -- C. Every generated identity is unique, and BD-TE formatted.
  perform pg_temp.assert_eq(
    (select count(distinct c)::integer from unnest(codes) c), 6,
    'C. every generated BD-TE identity in the batch is unique');
  perform pg_temp.assert_eq(
    (select count(*)::integer from unnest(codes) c where c ~ '^BD-TE-[0-9]{3,}$'), 6,
    'C. every generated identity is BD-TE formatted');
  perform pg_temp.assert_eq(
    (select count(distinct asset_code)::integer from public.equipment_assets), 7,
    'C. no identity collides with an existing tool');

  -- D. The sequence is consumed contiguously in an isolated batch.
  select array_agg((regexp_match(c, '^BD-TE-([0-9]+)$'))[1]::bigint order by (regexp_match(c, '^BD-TE-([0-9]+)$'))[1]::bigint)
    into suffixes from unnest(codes) c;
  for n in 2..6 loop
    perform pg_temp.assert_eq(suffixes[n], suffixes[n - 1] + 1,
      'D. batch identities are contiguous');
  end loop;
end;
$$;

-- E. The whole batch rolls back if any part of it is invalid.
do $$
declare
  spade uuid := '00000000-0000-0000-0000-0000009420b2';
  cement uuid := '00000000-0000-0000-0000-0000009420b3';
  karen uuid;
  before_count integer;
  refused boolean;
begin
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';
  select count(*) into before_count from public.equipment_assets;

  -- A stock-tracked item has counts, not individually identified tools.
  refused := false;
  begin
    perform public.register_equipment_assets(cement, 5, 'owned', 'good', karen);
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, 'E. a quantity-only item cannot be batch registered as tools');

  -- Quantity bounds.
  refused := false;
  begin perform public.register_equipment_assets(spade, 0, 'owned', 'good', karen);
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, 'E. zero is refused');

  refused := false;
  begin perform public.register_equipment_assets(spade, 201, 'owned', 'good', karen);
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, 'E. the 200 safety bound is enforced');

  -- A named custodian with no Site has no meaning in this system.
  refused := false;
  begin
    perform public.register_equipment_assets(
      spade, 3, 'owned', 'good', null, '00000000-0000-0000-0000-0000009410a1'
    );
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, 'E. a custodian without a Site is refused');

  -- NOTHING was created by any of those.
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_assets), before_count,
    'E. a refused batch creates no tools at all');
end;
$$;

-- =====================================================================
-- F/G/H. Initial location, optional custodian, and truthful history
-- =====================================================================
do $$
declare
  spade uuid := '00000000-0000-0000-0000-0000009420b2';
  karen uuid;
  ids uuid[];
  registered_events integer;
  issued_events integer;
begin
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';

  -- F. Site, no custodian -> AVAILABLE at that Site.
  select array_agg(id) into ids from public.register_equipment_assets(spade, 3, 'owned', 'good', karen);
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_assets
     where id = any(ids) and status = 'available' and current_site_id = karen
       and current_custodian_person_id is null),
    3, 'F. Site with no custodian gives available tools at that Site');

  -- Botanique custody is equally valid: no Site, no custodian.
  select array_agg(id) into ids from public.register_equipment_assets(spade, 2, 'owned', 'good', null);
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_assets
     where id = any(ids) and status = 'available' and current_site_id is null),
    2, 'F. no Site and no custodian gives available tools in Botanique custody');

  -- G. Site + custodian -> ISSUED, to that person, at that Site.
  select array_agg(id) into ids from public.register_equipment_assets(
    spade, 2, 'owned', 'good', karen, '00000000-0000-0000-0000-0000009410a1'
  );
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_assets
     where id = any(ids) and status = 'issued' and current_site_id = karen
       and current_custodian_person_id = '00000000-0000-0000-0000-0000009410a1'::uuid),
    2, 'G. Site with a custodian gives issued tools held by that person');

  -- H. History is truthful: TWO explicit events per tool, not one ambiguous
  --    one. "This tool exists" and "this person has it" are different facts.
  select count(*) into registered_events from public.equipment_asset_events
  where equipment_asset_id = any(ids) and event_type = 'registered';
  select count(*) into issued_events from public.equipment_asset_events
  where equipment_asset_id = any(ids) and event_type = 'issued';
  perform pg_temp.assert_eq(registered_events, 2, 'H. each tool records that it was registered');
  perform pg_temp.assert_eq(issued_events, 2, 'H. each tool records the initial allocation');

  -- And with no custodian there is no invented issue event.
  select array_agg(id) into ids from public.register_equipment_assets(spade, 1, 'owned', 'good', karen);
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_asset_events
     where equipment_asset_id = any(ids) and event_type = 'issued'),
    0, 'H. no custodian means no fabricated issue event');
end;
$$;

-- =====================================================================
-- I/J/K/L/M. Full control for owner AND manager; staff/viewer denied
-- =====================================================================
do $$
declare
  rake uuid := '00000000-0000-0000-0000-0000009420b1';
  cement uuid := '00000000-0000-0000-0000-0000009420b3';
  karen uuid;
  kitusuru uuid;
  tool public.equipment_assets;
  item public.inventory_items;
  fresh_item public.inventory_items;
  made integer;
begin
  -- Both Sites are resolved BEFORE the role switch. public.projects is
  -- manager-scoped, so a manager reading it here would get NULL and the
  -- transfer below would fail for a reason that has nothing to do with the
  -- authority under test.
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';
  select site_id into kitusuru from public.projects where id = '00000000-0000-0000-0000-0000009430c2';

  -- I. Act as the Operations Manager for every action below.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000094f2', true);

  -- register
  select count(*) into made from public.register_equipment_assets(rake, 2, 'owned', 'good', karen);
  perform pg_temp.assert_eq(made, 2, 'I. the Manager may register tools');

  select * into tool from public.equipment_assets where status = 'available' order by asset_code limit 1;

  -- assign / hand over
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => karen, target_custodian_person_id => '00000000-0000-0000-0000-0000009410a1'
  );
  perform pg_temp.assert_eq(tool.status, 'issued', 'I. the Manager may assign a tool');

  -- transfer
  tool := public.transfer_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => kitusuru,
    target_custodian_person_id => '00000000-0000-0000-0000-0000009410a2'
  );
  perform pg_temp.assert_eq(tool.status, 'issued', 'I. the Manager may transfer a tool');

  -- return
  tool := public.return_equipment_asset(target_asset_id => tool.id, expected_version => tool.version);
  perform pg_temp.assert_eq(tool.status, 'available', 'I. the Manager may return a tool');

  -- condition
  tool := public.update_equipment_asset_condition(tool.id, tool.version, 'fair', 'wear');
  perform pg_temp.assert_eq(tool.condition, 'fair', 'I. the Manager may update condition');

  -- repair lifecycle
  tool := public.send_equipment_asset_for_repair(tool.id, tool.version, 'blunt');
  perform pg_temp.assert_eq(tool.status, 'under_repair', 'I. the Manager may send for repair');
  tool := public.return_equipment_asset_from_repair(tool.id, tool.version, 'good', null, null);
  perform pg_temp.assert_eq(tool.status, 'available', 'I. the Manager may return from repair');

  -- M. retire, an exceptional power the Founder has now granted
  tool := public.retire_equipment_asset(tool.id, tool.version, 'written off');
  perform pg_temp.assert_eq(tool.status, 'retired', 'M. the Manager may retire a tool');

  -- report lost, on a different tool
  select * into tool from public.equipment_assets where status = 'available' order by asset_code limit 1;
  tool := public.report_equipment_asset_lost(tool.id, tool.version, 'not returned from site');
  perform pg_temp.assert_eq(tool.status, 'lost', 'I. the Manager may report a tool lost');

  -- K. stock receipt and stocktake adjustment
  perform public.record_stock_receipt(cement, 50, karen);
  perform public.record_stock_adjustment(cement, 'adjustment_out', 5, karen, 'stocktake shortfall');
  -- Read back through the public position read model: the private balance
  -- helper is revoked from authenticated, by design.
  perform pg_temp.assert_eq(
    (select p.quantity from public.inventory_stock_position(cement) p where p.site_id = karen),
    45::numeric,
    'K. the Manager may receive stock and record a stocktake adjustment');

  -- L. catalogue creation, correction, deactivate and reactivate
  insert into public.inventory_items (id, item_name, category, tracking_method, unit_of_measure, is_active)
  values ('00000000-0000-0000-0000-0000009420b9', 'FC Manager Item', 'manual_tools', 'asset', 'unit', true)
  returning * into fresh_item;
  perform pg_temp.assert_true(fresh_item.id is not null, 'L. the Manager may create a catalogue item');

  fresh_item := public.correct_inventory_item_identity(
    fresh_item.id, fresh_item.version, 'FC Manager Item Renamed', 'manual_tools', null, 'reasoned correction'
  );
  perform pg_temp.assert_eq(fresh_item.item_name, 'FC Manager Item Renamed',
    'L. the Manager may correct catalogue identity');

  fresh_item := public.deactivate_inventory_item(fresh_item.id, fresh_item.version, 'no longer carried');
  perform pg_temp.assert_true(not fresh_item.is_active, 'L. the Manager may deactivate a catalogue item');

  fresh_item := public.reactivate_inventory_item(fresh_item.id, fresh_item.version, 'needed again');
  perform pg_temp.assert_true(fresh_item.is_active, 'L. the Manager may reactivate a catalogue item');
end;
$$;

-- J. Staff and viewer gain NOTHING.
--
-- Each attempt is labelled, so a regression names the call that leaked rather
-- than reporting a count nobody can act on.
do $$
declare
  rake uuid := '00000000-0000-0000-0000-0000009420b1';
  cement uuid := '00000000-0000-0000-0000-0000009420b3';
  karen uuid;
  denied_role text;
  role_label text;
  tool_id uuid;
  tool_version integer;
  item_version integer;
  leaked text[] := '{}';
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000094f1', true);
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';
  select id, version into tool_id, tool_version
  from public.equipment_assets where status = 'available' order by asset_code limit 1;
  select version into item_version from public.inventory_items where id = rake;

  foreach denied_role in array array[
    '00000000-0000-0000-0000-0000000094f3',
    '00000000-0000-0000-0000-0000000094f4'
  ] loop
    role_label := case when denied_role like '%94f3' then 'staff' else 'viewer' end;
    perform set_config('request.jwt.claim.sub', denied_role, true);

    begin
      perform public.register_equipment_assets(rake, 1, 'owned', 'good', karen);
      leaked := leaked || (role_label || ':register');
    exception when others then null; end;

    begin
      perform public.issue_equipment_asset(
        target_asset_id => tool_id, expected_version => tool_version, target_site_id => karen
      );
      leaked := leaked || (role_label || ':assign');
    exception when others then null; end;

    begin
      perform public.retire_equipment_asset(tool_id, tool_version, 'nope');
      leaked := leaked || (role_label || ':retire');
    exception when others then null; end;

    begin
      perform public.correct_equipment_asset(tool_id, tool_version, 'available', 'good', null, null, null, 'nope');
      leaked := leaked || (role_label || ':correct');
    exception when others then null; end;

    begin
      perform public.record_stock_adjustment(cement, 'adjustment_out', 1, karen, 'nope');
      leaked := leaked || (role_label || ':adjust');
    exception when others then null; end;

    begin
      perform public.deactivate_inventory_item(rake, item_version, 'nope');
      leaked := leaked || (role_label || ':deactivate');
    exception when others then null; end;
  end loop;

  perform pg_temp.assert_eq(
    coalesce(array_length(leaked, 1), 0), 0,
    format('J. staff and viewer are refused every Tools & Equipment action; leaked: %s',
           coalesce(array_to_string(leaked, ', '), 'none')));
end;
$$;

-- =====================================================================
-- N/O. Concurrency and permanent identity survive the widened authority
-- =====================================================================
do $$
declare
  rake uuid := '00000000-0000-0000-0000-0000009420b1';
  karen uuid;
  kitusuru uuid;
  tool public.equipment_assets;
  identity text;
  stale boolean := false;
begin
  -- Sites are resolved as the Principal: public.projects is manager-scoped and
  -- invisible to the roles these blocks act as, so reading it under the role
  -- under test would silently yield NULL.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000094f1', true);
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';
  select site_id into kitusuru from public.projects where id = '00000000-0000-0000-0000-0000009430c2';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000094f2', true);

  select * into tool from public.register_equipment_assets(rake, 1, 'owned', 'good', karen);
  identity := tool.asset_code;

  -- N. Optimistic concurrency is untouched.
  begin
    perform public.issue_equipment_asset(
      target_asset_id => tool.id, expected_version => tool.version + 3, target_site_id => karen
    );
  exception when others then stale := true; end;
  perform pg_temp.assert_true(stale, 'N. a stale expected_version is still refused');

  -- O. Identity is permanent through a full reassignment cycle.
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => karen, target_custodian_person_id => '00000000-0000-0000-0000-0000009410a1'
  );
  tool := public.return_equipment_asset(target_asset_id => tool.id, expected_version => tool.version);
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => kitusuru, target_custodian_person_id => '00000000-0000-0000-0000-0000009410a2'
  );
  tool := public.transfer_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => karen, target_custodian_person_id => '00000000-0000-0000-0000-0000009410a1'
  );
  perform pg_temp.assert_eq(tool.asset_code, identity,
    'O. the BD-TE identity is unchanged through assign, return, reassign and transfer');
end;
$$;

-- Q. The Nairobi expected-return rule still binds the new batch path's siblings.
do $$
declare
  rake uuid := '00000000-0000-0000-0000-0000009420b1';
  karen uuid;
  tool public.equipment_assets;
  today date := public.private_inventory_operational_date();
  refused boolean := false;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000094f1', true);
  select site_id into karen from public.projects where id = '00000000-0000-0000-0000-0000009430c1';
  select * into tool from public.register_equipment_assets(rake, 1, 'owned', 'good', karen);
  begin
    perform public.issue_equipment_asset(
      target_asset_id => tool.id, expected_version => tool.version,
      target_site_id => karen, target_expected_return_date => today - 1
    );
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, 'Q. a past expected return date is still refused');
end;
$$;

rollback;
