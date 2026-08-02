-- BD-REPORTS-01A — Daily Site period-compliance range source database tests.
--
-- Runs on an isolated PostgreSQL 17 database after every migration is applied
-- in order (see scripts/test-reports-db.sh). No hosted Supabase is touched.
--
-- Covers: invoker-rights proof (explicitly NOT SECURITY DEFINER), RLS behaviour
-- for Principal, assigned manager, unassigned manager, Staff and Viewer, that
-- permitted project rows are returned and prohibited ones never are, the
-- Africa/Nairobi calendar and weekend rule, and each of the five compliance
-- states: entry submitted, entry submitted late, waived, missing, not due.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'reports-owner@test.local'),
  ('00000000-0000-0000-0000-0000000000a2', 'reports-assigned-manager@test.local'),
  ('00000000-0000-0000-0000-0000000000a3', 'reports-unassigned-manager@test.local'),
  ('00000000-0000-0000-0000-0000000000a4', 'reports-staff@test.local'),
  ('00000000-0000-0000-0000-0000000000a5', 'reports-viewer@test.local');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000000a1', 'reports-owner@test.local', 'Reports Owner', 'owner', true),
  ('00000000-0000-0000-0000-0000000000a2', 'reports-assigned-manager@test.local', 'Assigned Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000000a3', 'reports-unassigned-manager@test.local', 'Unassigned Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000000a4', 'reports-staff@test.local', 'Reports Staff', 'staff', true),
  ('00000000-0000-0000-0000-0000000000a5', 'reports-viewer@test.local', 'Reports Viewer', 'viewer', true);

-- PERMITTED is the assigned manager's site. PROHIBITED is a second Ongoing site
-- the assigned manager has no authority over at all.
insert into public.projects (
  id, project_name, project_type, status, stage, start_date, archived,
  portfolio_eligible, portfolio_permission_status
) values
  ('20000000-0000-0000-0000-0000000000b1', 'BD-REPORTS — Permitted site', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', false, false, 'Not Reviewed'),
  ('20000000-0000-0000-0000-0000000000b2', 'BD-REPORTS — Prohibited site', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', false, false, 'Not Reviewed'),
  -- A Completed project holds reportable history but carries no automatic
  -- obligation, so it must read as "not due" rather than "missing".
  ('20000000-0000-0000-0000-0000000000b3', 'BD-REPORTS — Completed site', 'Residential', 'Completed', 'Completed', '2026-06-01', false, false, 'Not Reviewed');

insert into public.project_assignments (project_id, user_id, is_active) values
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a2', true),
  ('20000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2', true),
  -- Staff is assigned to the permitted project: they can read the PROJECT but
  -- have no Daily Site SELECT policy at all.
  ('20000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a4', true);

set local role authenticated;

-- =====================================================================
-- 1. Invoker rights — the function is explicitly NOT SECURITY DEFINER
-- =====================================================================
do $$
declare
  is_definer boolean;
  fn_kind text;
begin
  select p.prosecdef, p.prokind::text into is_definer, fn_kind
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'daily_site_range_compliance';

  perform pg_temp.assert_true(is_definer is not null, 'the range source exists');
  perform pg_temp.assert_true(
    is_definer is false,
    'daily_site_range_compliance is invoker-rights and NOT SECURITY DEFINER'
  );
  perform pg_temp.assert_true(fn_kind = 'f', 'the range source is an ordinary function');

  -- anon must not be able to execute it; authenticated must.
  perform pg_temp.assert_true(
    not has_function_privilege('anon', 'public.daily_site_range_compliance(date, date, uuid)', 'execute'),
    'anon cannot execute the range source'
  );
  perform pg_temp.assert_true(
    has_function_privilege('authenticated', 'public.daily_site_range_compliance(date, date, uuid)', 'execute'),
    'authenticated can execute the range source'
  );

  -- No cross-domain SECURITY DEFINER reporting function was introduced.
  perform pg_temp.assert_true(
    not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.prosecdef and p.proname like '%report%'
    ),
    'no SECURITY DEFINER reporting function exists'
  );
end;
$$;

-- =====================================================================
-- 2. Range guards
-- =====================================================================
do $$
declare
  ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

  begin
    perform * from public.daily_site_range_compliance('2026-08-10', '2026-08-01');
    ok := false;
  exception when invalid_parameter_value then ok := true;
  end;
  perform pg_temp.assert_true(ok, 'an inverted range is rejected');

  begin
    perform * from public.daily_site_range_compliance('2020-01-01', '2026-01-01');
    ok := false;
  exception when invalid_parameter_value then ok := true;
  end;
  perform pg_temp.assert_true(ok, 'an over-long range is rejected rather than silently clamped');

  begin
    perform * from public.daily_site_range_compliance(null, '2026-08-01');
    ok := false;
  exception when invalid_parameter_value then ok := true;
  end;
  perform pg_temp.assert_true(ok, 'a missing boundary is rejected');
end;
$$;

-- =====================================================================
-- 3. Compliance states across an EAT week
-- =====================================================================
-- The reporting week is Monday 6 July 2026 to Sunday 12 July 2026, a PAST week,
-- so an entry submitted now is necessarily after that day's 08:30 EAT deadline
-- and is recorded as late. The on-time case is exercised separately on a future
-- work date, where the same deadline has not yet passed.
--   Mon  6 Jul — entry submitted after the deadline -> entry_late
--   Wed  8 Jul — active owner waiver                -> waived
--   Thu  9 Jul — nothing                            -> missing
--   Sat 11 Jul / Sun 12 Jul — weekend               -> not_due
--   Mon  3 Jun 2999 (future) — entry submitted      -> entry_present
do $$
declare
  entry public.daily_site_entries;
begin
  -- The assigned manager records and submits the past-week entry.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);

  entry := public.create_daily_site_entry_draft(
    '20000000-0000-0000-0000-0000000000b1', '2026-07-06', 'working',
    null, null, 6, 'Permitted crew', 500, null, 'Lay turf', 3000, 0, null, 'promised'
  );
  perform public.submit_daily_site_entry(entry.id);
  perform pg_temp.assert_true(
    (select is_late from public.daily_site_entries where id = entry.id),
    'an entry submitted after its 08:30 EAT deadline is recorded as late'
  );

  -- The on-time case: a future work date, whose deadline has not yet passed.
  entry := public.create_daily_site_entry_draft(
    '20000000-0000-0000-0000-0000000000b1', '2999-06-03', 'working',
    null, null, 4, 'Permitted crew', 500, null, 'Edge beds', 2000, 0, null, 'none'
  );
  perform public.submit_daily_site_entry(entry.id);
  perform pg_temp.assert_true(
    (select is_late is false from public.daily_site_entries where id = entry.id),
    'an entry submitted before its 08:30 EAT deadline is not late'
  );

  -- A prohibited-site entry the assigned manager must never see below.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  entry := public.create_daily_site_entry_draft(
    '20000000-0000-0000-0000-0000000000b2', '2026-07-06', 'working',
    null, null, 9, 'Prohibited crew', 700, null, 'Prohibited work', 6300, 0, null, 'none'
  );
  perform public.submit_daily_site_entry(entry.id);

  -- The owner waives the Wednesday obligation on the permitted site.
  perform public.create_daily_site_compliance_waiver(
    '20000000-0000-0000-0000-0000000000b1', '2026-07-08', 'Owner attending a client handover.'
  );
end;
$$;

do $$
declare
  status_for text;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);

  select compliance_status into status_for
  from public.daily_site_range_compliance('2999-06-03', '2999-06-03', '20000000-0000-0000-0000-0000000000b1')
  where work_date = '2999-06-03';
  perform pg_temp.assert_true(status_for = 'entry_present', 'an on-time day reads as entry submitted');

  select compliance_status into status_for
  from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')
  where work_date = '2026-07-06';
  perform pg_temp.assert_true(status_for = 'entry_late', 'Monday reads as entry submitted late');

  select compliance_status into status_for
  from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')
  where work_date = '2026-07-08';
  perform pg_temp.assert_true(status_for = 'waived', 'Wednesday reads as waived');

  select compliance_status into status_for
  from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')
  where work_date = '2026-07-09';
  perform pg_temp.assert_true(status_for = 'missing', 'Thursday reads as missing');

  select compliance_status into status_for
  from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')
  where work_date = '2026-07-11';
  perform pg_temp.assert_true(status_for = 'not_due', 'Saturday reads as not due');

  perform pg_temp.assert_true(
    (select bool_and(due is false)
     from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')
     where work_date in ('2026-07-11', '2026-07-12')),
    'the weekend creates no automatic obligation'
  );

  -- One row per day of the inclusive range, for one project: seven days.
  perform pg_temp.assert_true(
    (select count(*) = 7
     from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')),
    'the inclusive range returns one row per calendar day'
  );

  -- Both boundaries are inclusive.
  perform pg_temp.assert_true(
    (select count(*) = 1
     from public.daily_site_range_compliance('2026-07-06', '2026-07-06', '20000000-0000-0000-0000-0000000000b1')),
    'a single-day range returns exactly that day'
  );

  -- The day before the range start is never returned.
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b1')
      where work_date < '2026-07-06' or work_date > '2026-07-12'
    ),
    'no day outside the inclusive range is returned'
  );

  -- A Completed project carries no automatic obligation and is never missing.
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b3')
      where compliance_status = 'missing'
    ),
    'a completed project is never reported as missing an entry'
  );
end;
$$;

-- =====================================================================
-- 4. Row level security across all five roles
-- =====================================================================
do $$
begin
  -- Principal: company-wide, so both sites are visible.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  perform pg_temp.assert_true(
    (select count(distinct project_id) = 2
     from public.daily_site_range_compliance('2026-07-06', '2026-07-12')
     where project_id in (
       '20000000-0000-0000-0000-0000000000b1',
       '20000000-0000-0000-0000-0000000000b2'
     )),
    'the Principal sees every project in the range'
  );

  -- Assigned manager: the permitted site only. The prohibited site's rows,
  -- name, entry and waiver state are never returned.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  perform pg_temp.assert_true(
    exists (
      select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12')
      where project_id = '20000000-0000-0000-0000-0000000000b1'
    ),
    'an assigned manager sees the permitted project'
  );
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12')
      where project_id = '20000000-0000-0000-0000-0000000000b2'
    ),
    'an assigned manager never receives a prohibited project row'
  );
  -- Naming the prohibited project explicitly still returns nothing.
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_range_compliance(
        '2026-07-06', '2026-07-12', '20000000-0000-0000-0000-0000000000b2'
      )
    ),
    'asking for a prohibited project by id returns no row'
  );

  -- Unassigned, non-lead manager: no project at all.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12')),
    'an unassigned, non-lead manager receives no project row'
  );

  -- Staff: assigned to the permitted PROJECT, but with no Daily Site access.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a4', true);
  perform pg_temp.assert_true(
    exists (select 1 from public.projects where id = '20000000-0000-0000-0000-0000000000b1'),
    'assigned staff can still read the project record itself'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12')),
    'assigned staff receive no Daily Site compliance row'
  );

  -- Viewer: nothing.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a5', true);
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_range_compliance('2026-07-06', '2026-07-12')),
    'a viewer receives no Daily Site compliance row'
  );
end;
$$;

-- =====================================================================
-- 5. The range source stores nothing and mutates nothing
-- =====================================================================
do $$
declare
  entries_before bigint;
  waivers_before bigint;
  events_before bigint;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  select count(*) into entries_before from public.daily_site_entries;
  select count(*) into waivers_before from public.daily_site_compliance_waivers;
  select count(*) into events_before from public.daily_site_entry_events;

  perform * from public.daily_site_range_compliance('2026-07-01', '2026-07-31');

  perform pg_temp.assert_true(
    (select count(*) from public.daily_site_entries) = entries_before
      and (select count(*) from public.daily_site_compliance_waivers) = waivers_before
      and (select count(*) from public.daily_site_entry_events) = events_before,
    'running the range source writes no row anywhere'
  );

  -- No report-owned table was created by this slice.
  perform pg_temp.assert_true(
    not exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name like '%report%'
    ),
    'no report-owned table exists'
  );
end;
$$;

-- =====================================================================
-- 6. The effective Projects policy, and the source asymmetry it does not cover
-- ---------------------------------------------------------------------
-- Reports treats the caller's ordinary Projects read as the project-context
-- authority: a report loads only for a project this read returns. This section
-- proves what that read actually returns per role, and proves the asymmetry
-- that makes the application-side gate necessary — project_activities is
-- readable by ANY manager company-wide, while projects is not, so a manager who
-- cannot see a project through Projects RLS can still read its history rows.
--
-- Tightening those broader source policies is a separate authority decision and
-- is deliberately NOT attempted here.
-- =====================================================================
do $$
declare
  can_read_permitted boolean;
  can_read_prohibited boolean;
  activities_for_prohibited bigint;
  approvals_policy text;
begin
  -- Principal: company-wide.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
  perform pg_temp.assert_true(
    (select count(*) from public.projects
      where id in ('20000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b2')) = 2,
    'the Principal Projects read returns every project'
  );

  -- Assigned manager: the assigned project only.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
  select exists (select 1 from public.projects where id = '20000000-0000-0000-0000-0000000000b1'),
         exists (select 1 from public.projects where id = '20000000-0000-0000-0000-0000000000b2')
    into can_read_permitted, can_read_prohibited;
  perform pg_temp.assert_true(can_read_permitted, 'an assigned manager Projects read returns their project');
  perform pg_temp.assert_true(
    not can_read_prohibited,
    'an assigned manager Projects read never returns a project they neither lead nor are assigned to'
  );

  -- Unassigned, non-lead manager: NO project row at all…
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a3', true);
  perform pg_temp.assert_true(
    not exists (select 1 from public.projects
      where id in ('20000000-0000-0000-0000-0000000000b1', '20000000-0000-0000-0000-0000000000b2')),
    'an unassigned, non-lead manager Projects read returns no project'
  );

  -- …yet project history for that same project IS readable to them. This is the
  -- exact condition the Reports project-context gate fails closed on: without
  -- it, a hand-typed project id would surface these rows in a report for a
  -- project the caller cannot see in Projects.
  select count(*) into activities_for_prohibited
  from public.project_activities
  where project_id = '20000000-0000-0000-0000-0000000000b2';
  perform pg_temp.assert_true(
    activities_for_prohibited > 0,
    'project_activities is readable company-wide by any manager, unlike projects'
  );

  -- Approval requests carry the same company-wide manager predicate.
  select pg_get_expr(polqual, polrelid) into approvals_policy
  from pg_policy
  where polrelid = 'public.approval_requests'::regclass
    and polname = 'approval_requests_select_owner_manager';
  perform pg_temp.assert_true(
    approvals_policy is not null and approvals_policy not like '%project%',
    'approval_requests SELECT carries no project predicate'
  );

  -- Assigned Staff: the project row is readable; source domains are not.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a4', true);
  perform pg_temp.assert_true(
    exists (select 1 from public.projects where id = '20000000-0000-0000-0000-0000000000b1'),
    'assigned Staff Projects read returns their assigned project'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.projects where id = '20000000-0000-0000-0000-0000000000b2'),
    'assigned Staff Projects read returns no unassigned project'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_entries
      where project_id = '20000000-0000-0000-0000-0000000000b1'),
    'assigned Staff still hold no Daily Site access on a project they can read'
  );

  -- Viewer: no project row at all, so no report can have a project context.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a5', true);
  perform pg_temp.assert_true(
    not exists (select 1 from public.projects),
    'a viewer Projects read returns nothing'
  );
end;
$$;

rollback;
