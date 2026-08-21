-- =====================================================================
-- Permanent BD-TE identity, atomic handover, and expected-return authority
-- =====================================================================
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_true(claim boolean, label text) returns void
language plpgsql as $$
begin
  if claim is distinct from true then
    raise exception 'ASSERTION FAILED: %', label;
  end if;
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

-- A Principal, an Operations Manager, a Staff member and two custodians.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000093f1', 'identity-owner@inventory.test'),
  ('00000000-0000-0000-0000-0000000093f2', 'identity-manager@inventory.test'),
  ('00000000-0000-0000-0000-0000000093f3', 'identity-staff@inventory.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000093f1', 'identity-owner@inventory.test', 'Identity Owner', 'owner', true),
  ('00000000-0000-0000-0000-0000000093f2', 'identity-manager@inventory.test', 'Identity Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000093f3', 'identity-staff@inventory.test', 'Identity Staff', 'staff', true);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f1', true);

insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-0000009310a1', 'Kefa Nyamari Ochenge', 'regular_staff'),
  ('00000000-0000-0000-0000-0000009310a2', 'Lincoln Waweru', 'regular_staff');

-- Sites are derived from Projects by trigger, so this is how a Site exists.
insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000009330c1', 'Identity Site One', 'Kitisuru Residence House 0.8A', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000009330c2', 'Identity Site Two', 'Alego Usonga', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed');

insert into public.inventory_items (id, item_name, category, tracking_method, unit_of_measure, is_active) values
  ('00000000-0000-0000-0000-0000009320b1', 'Identity Secateurs', 'manual_tools', 'asset', 'unit', true),
  ('00000000-0000-0000-0000-0000009320b2', 'Identity Jembe', 'manual_tools', 'asset', 'unit', true);

-- The private helpers below are revoked from `authenticated` and the sequence
-- is owner-only, both by design, so the assertions run as the bootstrap role.
-- The JWT claim is what private_inventory_role() actually reads, and it stays
-- set — so the role boundary in section 12 is still genuinely exercised.
reset role;

-- =====================================================================
-- 1. The BD-TE namespace
-- =====================================================================
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  made public.equipment_assets;
  second public.equipment_assets;
begin
  made := public.register_equipment_asset(item_a);
  perform pg_temp.assert_true(made.asset_code ~ '^BD-TE-[0-9]{3,}$',
    format('1. a new registration receives a BD-TE identity (got %s)', made.asset_code));
  perform pg_temp.assert_true(made.asset_code !~ '^EQP-',
    '1. the legacy EQP namespace is no longer issued');

  second := public.register_equipment_asset(item_a);
  perform pg_temp.assert_true(second.asset_code <> made.asset_code,
    '1. a second registration receives a different identity');
  perform pg_temp.assert_true(
    (regexp_match(second.asset_code, '^BD-TE-([0-9]+)$'))[1]::bigint
      > (regexp_match(made.asset_code, '^BD-TE-([0-9]+)$'))[1]::bigint,
    '1. identities advance rather than being reused');

  -- A manually supplied code is still inert.
  second := public.register_equipment_asset(item_a, 'BD-TE-999');
  perform pg_temp.assert_true(second.asset_code <> 'BD-TE-999',
    '1. a caller-supplied code cannot choose the generated identity');
end;
$$;

-- Three-digit MINIMUM, not maximum: past 999 the number simply grows.
do $$
begin
  perform setval('public.equipment_asset_code_seq', 999, true);
  perform pg_temp.assert_eq(public.private_next_equipment_asset_code(), 'BD-TE-1000',
    '2. the sequence continues past 999 rather than being capped at three digits');
  perform setval('public.equipment_asset_code_seq', 8, true);
  perform pg_temp.assert_eq(public.private_next_equipment_asset_code(), 'BD-TE-009',
    '2. short numbers are padded to three digits');
end;
$$;

-- =====================================================================
-- 3. Carrying EQP across, exactly as production must
-- =====================================================================
-- The migration's own function, not a copy of its SQL.
do $$
declare
  item_b uuid := '00000000-0000-0000-0000-0000009320b2';
  legacy public.equipment_assets;
  moved integer;
  events_before integer;
  events_after integer;
  historical_codes integer;
begin
  legacy := public.register_equipment_asset(item_b);

  -- Put it back into the legacy namespace, as production's Secateurs is.
  perform public.private_set_equipment_asset_event('corrected', 'restoring a legacy identity for the test');
  update public.equipment_assets set asset_code = 'EQP-0001' where id = legacy.id;
  perform public.private_clear_equipment_asset_event();

  select count(*) into events_before from public.equipment_asset_events where equipment_asset_id = legacy.id;

  moved := public.private_migrate_equipment_asset_codes_to_bdte();
  perform pg_temp.assert_true(moved >= 1, '3. the legacy asset was carried across');

  -- THE NUMERIC IDENTITY IS PRESERVED: 0001 becomes 001, same physical tool.
  perform pg_temp.assert_eq(
    (select asset_code from public.equipment_assets where id = legacy.id),
    'BD-TE-001',
    '3. EQP-0001 becomes BD-TE-001, preserving its numeric identity');

  -- The immutable ledger is NOT rewritten; it gains the correction event.
  select count(*) into events_after from public.equipment_asset_events where equipment_asset_id = legacy.id;
  perform pg_temp.assert_true(events_after > events_before,
    '3. the rename appends a correction event rather than happening silently');

  -- Idempotent: running it again moves nothing.
  perform pg_temp.assert_eq(public.private_migrate_equipment_asset_codes_to_bdte(), 0,
    '3. re-running the identity migration is a no-op');

  -- And the allocator now understands BOTH namespaces and continues above the
  -- highest applicable suffix.
  perform public.private_initialise_equipment_asset_code_seq();
  perform pg_temp.assert_true(
    (regexp_match(public.private_next_equipment_asset_code(), '^BD-TE-([0-9]+)$'))[1]::bigint > 1,
    '3. allocation continues above the carried-across suffix');

  historical_codes := (select count(*) from public.equipment_assets where asset_code ~* '^EQP-');
  perform pg_temp.assert_eq(historical_codes, 0, '3. no asset is left in the legacy namespace');
end;
$$;

-- An oversized legacy suffix still cannot crash initialisation.
do $$
declare
  item_b uuid := '00000000-0000-0000-0000-0000009320b2';
  huge public.equipment_assets;
begin
  huge := public.register_equipment_asset(item_b);
  perform public.private_set_equipment_asset_event('corrected', 'oversized legacy suffix');
  update public.equipment_assets set asset_code = 'EQP-99999999999999999999' where id = huge.id;
  perform public.private_clear_equipment_asset_event();

  -- Must not raise 22003.
  perform public.private_initialise_equipment_asset_code_seq();
  perform pg_temp.assert_true(true, '4. an oversized legacy suffix does not crash initialisation');

  -- Put it back out of the way for the handover tests.
  perform public.private_set_equipment_asset_event('corrected', 'restoring');
  update public.equipment_assets set asset_code = 'BD-TE-900' where id = huge.id;
  perform public.private_clear_equipment_asset_event();
  perform public.private_initialise_equipment_asset_code_seq();
end;
$$;

-- =====================================================================
-- 5. Identity is PERMANENT across reassignment
-- =====================================================================
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  site_b uuid;
  tool public.equipment_assets;
  identity text;
  movement_count integer;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';
  select site_id into site_b from public.projects where id = '00000000-0000-0000-0000-0000009330c2';

  tool := public.register_equipment_asset(item_a);
  identity := tool.asset_code;

  -- available -> issued to Kefa at Site A
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version, target_site_id => site_a,
    target_custodian_person_id => '00000000-0000-0000-0000-0000009310a1', note => 'first handover'
  );
  perform pg_temp.assert_eq(tool.status, 'issued', '5. the tool is issued');
  perform pg_temp.assert_eq(tool.asset_code, identity, '5. issuing does not rename the asset');

  -- returned to Botanique custody
  tool := public.return_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version, note => 'back in'
  );
  perform pg_temp.assert_eq(tool.status, 'available', '5. the tool is back and available');
  perform pg_temp.assert_eq(tool.asset_code, identity, '5. returning does not rename the asset');
  perform pg_temp.assert_true(tool.current_custodian_person_id is null,
    '5. custody is released on return');

  -- issued again, to a DIFFERENT person at a DIFFERENT Site
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version, target_site_id => site_b,
    target_custodian_person_id => '00000000-0000-0000-0000-0000009310a2', note => 'second handover'
  );
  perform pg_temp.assert_eq(tool.asset_code, identity, '5. re-issuing to someone else does not rename the asset');
  perform pg_temp.assert_eq(tool.current_custodian_person_id, '00000000-0000-0000-0000-0000009310a2'::uuid,
    '5. the new custodian holds it');

  -- sent for repair, and STILL the same identity
  tool := public.send_equipment_asset_for_repair(tool.id, tool.version, 'blunt');
  perform pg_temp.assert_eq(tool.asset_code, identity, '5. repair does not rename the asset');

  -- The immutable ledger preserves the whole chain.
  select count(*) into movement_count
  from public.equipment_asset_events
  where equipment_asset_id = tool.id;
  perform pg_temp.assert_true(movement_count >= 5,
    format('5. every movement is preserved in history (got %s events)', movement_count));
end;
$$;

-- =====================================================================
-- 6. Expected return date
-- =====================================================================
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  tool public.equipment_assets;
  refused boolean := false;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';

  -- Today is valid.
  tool := public.register_equipment_asset(item_a);
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => site_a, target_expected_return_date => current_date
  );
  perform pg_temp.assert_eq(tool.expected_return_date, current_date, '6. today is accepted');

  -- The future is valid.
  tool := public.register_equipment_asset(item_a);
  tool := public.issue_equipment_asset(
    target_asset_id => tool.id, expected_version => tool.version,
    target_site_id => site_a, target_expected_return_date => current_date + 7
  );
  perform pg_temp.assert_eq(tool.expected_return_date, current_date + 7, '6. a future date is accepted');

  -- The past is not.
  tool := public.register_equipment_asset(item_a);
  begin
    perform public.issue_equipment_asset(
      target_asset_id => tool.id, expected_version => tool.version,
      target_site_id => site_a, target_expected_return_date => current_date - 1
    );
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '6. a past expected return date is refused');
end;
$$;

-- =====================================================================
-- 7. Atomic multi-asset handover
-- =====================================================================
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  one public.equipment_assets;
  two public.equipment_assets;
  three public.equipment_assets;
  issued_count integer;
  refused boolean := false;
  still_available integer;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';

  one := public.register_equipment_asset(item_a);
  two := public.register_equipment_asset(item_a);
  three := public.register_equipment_asset(item_a);

  -- All three, one call, one shared context.
  select count(*) into issued_count from public.issue_equipment_assets(
    jsonb_build_array(
      jsonb_build_object('asset_id', one.id, 'expected_version', one.version),
      jsonb_build_object('asset_id', two.id, 'expected_version', two.version),
      jsonb_build_object('asset_id', three.id, 'expected_version', three.version)
    ),
    site_a, '00000000-0000-0000-0000-0000009310a1', current_date + 3, null, null, 'group handover'
  );
  perform pg_temp.assert_eq(issued_count, 3, '7. all three assets were handed over in one call');

  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_assets
     where id in (one.id, two.id, three.id)
       and status = 'issued'
       and current_site_id = site_a
       and current_custodian_person_id = '00000000-0000-0000-0000-0000009310a1'::uuid
       and expected_return_date = current_date + 3),
    3, '7. every member received the same shared context');

  -- One issued event per asset.
  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_asset_events
     where equipment_asset_id in (one.id, two.id, three.id) and event_type = 'issued'),
    3, '7. each asset got its own immutable issued event');
end;
$$;

-- A single non-available member rolls the WHOLE handover back.
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  good_one public.equipment_assets;
  good_two public.equipment_assets;
  already public.equipment_assets;
  refused boolean := false;
  changed integer;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';

  good_one := public.register_equipment_asset(item_a);
  good_two := public.register_equipment_asset(item_a);
  already := public.register_equipment_asset(item_a);

  -- Somebody else already took this one.
  already := public.issue_equipment_asset(
    target_asset_id => already.id, expected_version => already.version,
    target_site_id => site_a, note => 'taken elsewhere'
  );

  begin
    perform public.issue_equipment_assets(
      jsonb_build_array(
        jsonb_build_object('asset_id', good_one.id, 'expected_version', good_one.version),
        jsonb_build_object('asset_id', good_two.id, 'expected_version', good_two.version),
        jsonb_build_object('asset_id', already.id, 'expected_version', already.version)
      ),
      site_a, '00000000-0000-0000-0000-0000009310a2', null, null, null, 'doomed handover'
    );
  exception when others then
    refused := true;
  end;

  perform pg_temp.assert_true(refused, '8. a handover containing an unavailable asset is refused');

  -- 0 of 3 changed. Not 2 issued and 1 failed.
  select count(*) into changed from public.equipment_assets
  where id in (good_one.id, good_two.id) and status <> 'available';
  perform pg_temp.assert_eq(changed, 0,
    '8. NOTHING was issued — the whole handover rolled back, not a partial one');

  perform pg_temp.assert_eq(
    (select count(*)::integer from public.equipment_asset_events
     where equipment_asset_id in (good_one.id, good_two.id) and event_type = 'issued'),
    0, '8. no issued event was written for the rolled-back members');
end;
$$;

-- A stale version rolls the whole handover back too.
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  fresh public.equipment_assets;
  stale public.equipment_assets;
  refused boolean := false;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';
  fresh := public.register_equipment_asset(item_a);
  stale := public.register_equipment_asset(item_a);

  begin
    perform public.issue_equipment_assets(
      jsonb_build_array(
        jsonb_build_object('asset_id', fresh.id, 'expected_version', fresh.version),
        jsonb_build_object('asset_id', stale.id, 'expected_version', stale.version + 5)
      ),
      site_a, null, null, null, null, null
    );
  exception when others then
    refused := true;
  end;

  perform pg_temp.assert_true(refused, '9. a stale expected_version refuses the handover');
  perform pg_temp.assert_eq(
    (select status from public.equipment_assets where id = fresh.id), 'available',
    '9. the healthy member was not issued');
end;
$$;

-- The same asset twice is a mistake, not an instruction.
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  tool public.equipment_assets;
  refused boolean := false;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';
  tool := public.register_equipment_asset(item_a);
  begin
    perform public.issue_equipment_assets(
      jsonb_build_array(
        jsonb_build_object('asset_id', tool.id, 'expected_version', tool.version),
        jsonb_build_object('asset_id', tool.id, 'expected_version', tool.version)
      ),
      site_a, null, null, null, null, null
    );
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '10. the same asset twice in one handover is refused');
end;
$$;

-- An empty handover is refused rather than quietly succeeding.
do $$
declare
  site_a uuid;
  refused boolean := false;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';
  begin
    perform public.issue_equipment_assets('[]'::jsonb, site_a, null, null, null, null, null);
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '11. an empty handover is refused');
end;
$$;

-- =====================================================================
-- 12. Role boundary on the canonical handover
-- =====================================================================
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  tool public.equipment_assets;
  allowed integer;
  refused boolean;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';

  -- Operations Manager: allowed.
  tool := public.register_equipment_asset(item_a);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f2', true);
  select count(*) into allowed from public.issue_equipment_assets(
    jsonb_build_array(jsonb_build_object('asset_id', tool.id, 'expected_version', tool.version)),
    site_a, null, null, null, null, 'manager handover'
  );
  perform pg_temp.assert_eq(allowed, 1, '12. the Operations Manager may hand equipment over');

  -- Staff: denied.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f1', true);
  tool := public.register_equipment_asset(item_a);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f3', true);
  refused := false;
  begin
    perform public.issue_equipment_assets(
      jsonb_build_array(jsonb_build_object('asset_id', tool.id, 'expected_version', tool.version)),
      site_a, null, null, null, null, null
    );
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '12. Staff may not hand equipment over');

  -- A caller with no Inventory role at all: denied.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dead', true);
  refused := false;
  begin
    perform public.issue_equipment_assets(
      jsonb_build_array(jsonb_build_object('asset_id', tool.id, 'expected_version', tool.version)),
      site_a, null, null, null, null, null
    );
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '12. an unauthorised caller may not hand equipment over');
end;
$$;

-- =====================================================================
-- 13. No ordinary rename path
-- =====================================================================
do $$
begin
  -- Nothing in the public API takes an asset code as something to SET.
  perform pg_temp.assert_eq(
    (select count(*)::integer
     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('rename_equipment_asset', 'update_equipment_asset_code', 'set_equipment_asset_code')),
    0, '13. there is no ordinary rename RPC');

  -- The identity migration helper is not reachable by an ordinary client.
  perform pg_temp.assert_eq(
    has_function_privilege('authenticated', 'public.private_migrate_equipment_asset_codes_to_bdte()', 'execute'),
    false, '13. the identity migration is not executable by authenticated');
  perform pg_temp.assert_eq(
    has_function_privilege('authenticated', 'public.private_next_equipment_asset_code()', 'execute'),
    false, '13. the allocator is not executable by authenticated');
end;
$$;

-- =====================================================================
-- 14. The operational day is Africa/Nairobi, not the database's
-- =====================================================================
-- Supabase production runs TimeZone = UTC, so between 00:00 and 02:59 EAT the
-- server's current_date is still the PREVIOUS Kenyan day. The helper must not
-- inherit the session or server zone.
--
-- This exercises the REAL helper rather than grepping its definition, and it
-- is deterministic without controlling the wall clock: Etc/GMT+12 (UTC-12) and
-- Pacific/Kiritimati (UTC+14) are twenty-six hours apart, so their calendar
-- dates ALWAYS differ. A helper that followed the session zone would therefore
-- return two different answers; one that is genuinely pinned to Nairobi
-- returns the same answer in both, and that answer can match at most one of
-- their current_date values.
do $$
declare
  under_utc date;
  under_west date;
  under_east date;
  west_current date;
  east_current date;
  nairobi_now date;
begin
  set local timezone = 'UTC';
  under_utc := public.private_inventory_operational_date();

  set local timezone = 'Etc/GMT+12';
  under_west := public.private_inventory_operational_date();
  west_current := current_date;

  set local timezone = 'Pacific/Kiritimati';
  under_east := public.private_inventory_operational_date();
  east_current := current_date;

  set local timezone = 'UTC';

  -- Same answer regardless of the session timezone.
  perform pg_temp.assert_eq(under_west, under_utc,
    '14. the operational date does not follow a UTC-12 session timezone');
  perform pg_temp.assert_eq(under_east, under_utc,
    '14. the operational date does not follow a UTC+14 session timezone');

  -- Those two sessions genuinely disagree about the date, so this is a real
  -- test and not two identical readings.
  perform pg_temp.assert_true(west_current <> east_current,
    '14. the two extreme session timezones do disagree about today');

  -- And the answer is Nairobi's day, computed independently.
  nairobi_now := (current_timestamp at time zone 'Africa/Nairobi')::date;
  perform pg_temp.assert_eq(under_utc, nairobi_now,
    '14. the operational date is the Africa/Nairobi calendar day');

  -- Therefore it cannot be silently falling back to current_date in both.
  perform pg_temp.assert_true(
    under_utc <> west_current or under_utc <> east_current,
    '14. the operational date differs from at least one session current_date');
end;
$$;

-- The expected-return rule is measured in that Nairobi day.
do $$
declare
  nairobi_today date := public.private_inventory_operational_date();
  refused boolean := false;
begin
  perform public.private_assert_expected_return_date(nairobi_today);
  perform public.private_assert_expected_return_date(nairobi_today + 1);
  perform public.private_assert_expected_return_date(null);

  begin
    perform public.private_assert_expected_return_date(nairobi_today - 1);
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused,
    '15. the day before the Nairobi operational day is refused');
end;
$$;

-- =====================================================================
-- 16. Principal correction cannot recreate a past expected return
-- =====================================================================
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  site_a uuid;
  tool public.equipment_assets;
  today date := public.private_inventory_operational_date();
  refused boolean;
begin
  select site_id into site_a from public.projects where id = '00000000-0000-0000-0000-0000009330c1';
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f1', true);
  tool := public.register_equipment_asset(item_a);

  -- The exact state this migration exists to prevent: issued, due back
  -- yesterday — previously reachable through the correction path.
  refused := false;
  begin
    perform public.correct_equipment_asset(
      tool.id, tool.version, 'issued', 'good', site_a,
      '00000000-0000-0000-0000-0000009310a1', today - 1, 'restating history'
    );
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused,
    '16. a Principal correction cannot set an expected return date in the past');
  perform pg_temp.assert_eq(
    (select status from public.equipment_assets where id = tool.id), 'available',
    '16. the refused correction changed nothing');

  -- Today is accepted where otherwise valid.
  tool := public.correct_equipment_asset(
    tool.id, tool.version, 'issued', 'good', site_a,
    '00000000-0000-0000-0000-0000009310a1', today, 'correcting to today'
  );
  perform pg_temp.assert_eq(tool.expected_return_date, today,
    '16. today is accepted by correction');

  -- A future date is accepted.
  tool := public.correct_equipment_asset(
    tool.id, tool.version, 'issued', 'good', site_a,
    '00000000-0000-0000-0000-0000009310a1', today + 14, 'correcting to a future date'
  );
  perform pg_temp.assert_eq(tool.expected_return_date, today + 14,
    '16. a future date is accepted by correction');

  -- NULL remains valid where the lifecycle permits it.
  tool := public.correct_equipment_asset(
    tool.id, tool.version, 'available', 'good', null, null, null, 'back to stores'
  );
  perform pg_temp.assert_true(tool.expected_return_date is null,
    '16. a null expected return remains valid');
  perform pg_temp.assert_eq(tool.status, 'available',
    '16. ordinary correction behaviour is not weakened');

  -- A reason is still required.
  refused := false;
  begin
    perform public.correct_equipment_asset(
      tool.id, tool.version, 'available', 'good', null, null, null, '   '
    );
  exception when others then
    refused := true;
  end;
  perform pg_temp.assert_true(refused, '16. correction still requires a reason');
end;
$$;

-- Correction stays Principal-only.
do $$
declare
  item_a uuid := '00000000-0000-0000-0000-0000009320b1';
  tool public.equipment_assets;
  refused boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f1', true);
  tool := public.register_equipment_asset(item_a);

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f2', true);
  refused := false;
  begin
    perform public.correct_equipment_asset(tool.id, tool.version, 'available', 'good', null, null, null, 'nope');
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, '17. the Operations Manager cannot correct equipment');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f3', true);
  refused := false;
  begin
    perform public.correct_equipment_asset(tool.id, tool.version, 'available', 'good', null, null, null, 'nope');
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, '17. Staff cannot correct equipment');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000dead', true);
  refused := false;
  begin
    perform public.correct_equipment_asset(tool.id, tool.version, 'available', 'good', null, null, null, 'nope');
  exception when others then refused := true; end;
  perform pg_temp.assert_true(refused, '17. an unauthorised caller cannot correct equipment');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000093f1', true);
end;
$$;

rollback;
