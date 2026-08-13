-- BD-OPERATIONS-HUB-01 — Maintenance V1 database tests.
--
-- Runs on an isolated PostgreSQL 17 database after every migration is applied
-- in order (see scripts/test-maintenance-db.sh). No hosted Supabase is
-- touched.
--
-- Proves: a Maintenance relationship links to a real project; a Completed
-- project can carry an Active Maintenance relationship without its own
-- status ever being touched; the relationship and visit lifecycles are
-- enforced (not free-form status writes); last/next visit are derived, never
-- stored; multi-person assignment works and duplicate simultaneous
-- assignment is rejected; optimistic concurrency rejects a stale write;
-- Principal and Operations Manager authority match the established
-- project-scoped shape; unauthorised roles see and touch nothing; and every
-- actor/timestamp column is system-derived, never client-supplied.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000010f1', 'principal@maintenance.test'),
  ('00000000-0000-0000-0000-0000000010f2', 'manager@maintenance.test'),
  ('00000000-0000-0000-0000-0000000010f3', 'other-manager@maintenance.test'),
  ('00000000-0000-0000-0000-0000000010f4', 'staff@maintenance.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000010f1', 'principal@maintenance.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000010f2', 'manager@maintenance.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000010f3', 'other-manager@maintenance.test', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000010f4', 'staff@maintenance.test', 'Project Team', 'staff', true);

-- Mirrors the real production shape: Lugulu Residential Home is Completed,
-- unarchived, and led by the Operations Manager.
insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000002010a1', 'Completed Led Site', 'Residential', 'Completed', 'Implementation', false,
   '00000000-0000-0000-0000-0000000010f2', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a2', 'Ongoing Led Site', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000010f2', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a3', 'Indicator Site', 'Residential', 'Completed', 'Implementation', false,
   '00000000-0000-0000-0000-0000000010f2', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a4', 'Unreachable Site', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000010f3', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a5', 'Cancelled Site', 'Residential', 'Cancelled', 'Awaiting Approval', false,
   '00000000-0000-0000-0000-0000000010f2', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a6', 'Archived Led Site', 'Residential', 'Ongoing', 'Archived', true,
   '00000000-0000-0000-0000-0000000010f2', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a7', 'Audit Spoof Test Site', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000010f2', false, 'Not Reviewed');

-- =====================================================================
-- 0. Structural guarantees, checked before any row exists
-- =====================================================================
do $$
declare tbl text;
begin
  foreach tbl in array array[
    'maintenance_relationships', 'maintenance_relationship_events',
    'maintenance_visits', 'maintenance_visit_events', 'maintenance_assignments'
  ] loop
    perform pg_temp.assert_true(
      (select relrowsecurity from pg_class where oid = ('public.' || tbl)::regclass),
      tbl || ' RLS enabled'
    );
    perform pg_temp.assert_true(
      not has_table_privilege('authenticated', 'public.' || tbl, 'DELETE'),
      tbl || ' cannot be deleted by any caller'
    );
    perform pg_temp.assert_true(
      not has_table_privilege('anon', 'public.' || tbl, 'SELECT'),
      'anon cannot read ' || tbl
    );
  end loop;
end;
$$;

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.maintenance_relationship_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.maintenance_relationship_events', 'UPDATE'),
  'the relationship event ledger cannot be written by any application role'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.maintenance_visit_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.maintenance_visit_events', 'UPDATE'),
  'the visit event ledger cannot be written by any application role'
);

-- No Finance vocabulary anywhere in the Maintenance tables: this migration
-- must not have grown a second financial system.
do $$
declare leaked text;
begin
  select string_agg(table_name || '.' || column_name, ', ') into leaked
  from information_schema.columns
  where table_schema = 'public'
    and table_name like 'maintenance_%'
    and column_name ~* '(amount|cost|price|payment|paid|invoice|balance|margin|advance)';
  perform pg_temp.assert_true(leaked is null, format('Maintenance tables must hold no Finance column, found: %s', leaked));
end;
$$;

-- public.projects itself is untouched by this migration.
do $$
declare leaked text;
begin
  select string_agg(column_name, ', ') into leaked
  from information_schema.columns
  where table_schema = 'public' and table_name = 'projects' and column_name ilike '%maintenance%';
  perform pg_temp.assert_true(leaked is null, format('projects must gain no Maintenance column, found: %s', leaked));
end;
$$;

create temp table project_status_baseline as select id, status, stage from public.projects;
grant select on project_status_baseline to authenticated;

set local role authenticated;

-- =====================================================================
-- 1. Relationship linked to a real project; a Completed project may carry
--    an Active relationship; project status is never mutated
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f2', true);

do $$
declare created public.maintenance_relationships;
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a1', 'Fortnightly lawn and border upkeep', date '2026-08-10', 'fortnightly')
  returning * into created;

  perform pg_temp.assert_true(created.project_id = '00000000-0000-0000-0000-0000002010a1'::uuid, 'the relationship links to the real project');
  perform pg_temp.assert_true(created.status = 'active', 'a new relationship always starts Active, regardless of client input');
  perform pg_temp.assert_true(created.version = 1, 'a new relationship starts at version 1');
end;
$$;

-- The Founder's exact scenario: Lugulu-analog Completed Led Site now has an
-- Active Maintenance relationship, and its own status is untouched.
do $$
declare project_status text;
begin
  select status into project_status from public.projects where id = '00000000-0000-0000-0000-0000002010a1';
  perform pg_temp.assert_true(project_status = 'Completed', 'the Completed project remains Completed after Maintenance is created');
  perform pg_temp.assert_true(
    exists (
      select 1 from public.maintenance_relationships
      where project_id = '00000000-0000-0000-0000-0000002010a1' and status = 'active'
    ),
    'the same project now carries an Active Maintenance relationship'
  );
end;
$$;

do $$
declare unchanged boolean;
begin
  select not exists (
    select 1 from public.projects p
    join project_status_baseline b on b.id = p.id
    where p.status <> b.status or p.stage <> b.stage
  ) into unchanged;
  perform pg_temp.assert_true(unchanged, 'no project status or stage was mutated by creating Maintenance');
end;
$$;

-- Business rule: only Ongoing/Paused/Completed, unarchived projects may
-- start a Maintenance relationship.
do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a5', 'Should be rejected', date '2026-08-10', 'monthly');
  raise exception 'ASSERTION FAILED: a Cancelled project must not accept a Maintenance relationship';
exception when invalid_parameter_value then null;
end;
$$;

do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a6', 'Should be rejected', date '2026-08-10', 'monthly');
  raise exception 'ASSERTION FAILED: an archived project must not accept a Maintenance relationship';
exception when invalid_parameter_value then null;
end;
$$;

-- At most one live (non-ended) relationship per project.
do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a1', 'Second relationship, should be rejected', date '2026-08-11', 'monthly');
  raise exception 'ASSERTION FAILED: a second live relationship on the same project must be rejected';
exception when unique_violation then null;
end;
$$;

-- =====================================================================
-- 2. Maintenance status lifecycle — controlled transitions only
-- =====================================================================
do $$
declare live_id uuid; live_version integer;
begin
  select id, version into live_id, live_version from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';

  -- A plain client UPDATE of status is refused even for an authorised caller.
  begin
    update public.maintenance_relationships set status = 'paused' where id = live_id;
    raise exception 'ASSERTION FAILED: a direct status write must be refused';
  exception when insufficient_privilege then null;
  end;

  perform pg_temp.assert_true(
    (select status from public.maintenance_relationships where id = live_id) = 'active',
    'status is unchanged after the refused direct write'
  );
end;
$$;

do $$
declare live_id uuid; live_version integer; paused public.maintenance_relationships; resumed public.maintenance_relationships;
begin
  select id, version into live_id, live_version from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';

  -- Stale-write rejection: the wrong expected_version is refused.
  begin
    perform public.pause_maintenance_relationship(live_id, live_version + 1, 'Site inactive for the season');
    raise exception 'ASSERTION FAILED: pausing with a stale expected_version must be refused';
  exception when serialization_failure then null;
  end;

  select * into paused from public.pause_maintenance_relationship(live_id, live_version, 'Site inactive for the season');
  perform pg_temp.assert_true(paused.status = 'paused', 'the pause action moves the relationship to Paused');
  perform pg_temp.assert_true(paused.version = live_version + 1, 'pausing bumps the version');

  perform pg_temp.assert_true(
    exists (
      select 1 from public.maintenance_relationship_events
      where maintenance_relationship_id = live_id and event_type = 'paused' and reason = 'Site inactive for the season'
    ),
    'the pause is recorded in the immutable relationship ledger with its reason'
  );

  -- Pausing an already-Paused relationship is refused.
  begin
    perform public.pause_maintenance_relationship(live_id, paused.version, 'Again');
    raise exception 'ASSERTION FAILED: pausing a Paused relationship must be refused';
  exception when invalid_parameter_value then null;
  end;

  select * into resumed from public.resume_maintenance_relationship(live_id, paused.version);
  perform pg_temp.assert_true(resumed.status = 'active', 'the resume action moves the relationship back to Active');
  perform pg_temp.assert_true(
    exists (select 1 from public.maintenance_relationship_events where maintenance_relationship_id = live_id and event_type = 'resumed'),
    'the resume is recorded in the immutable ledger'
  );
end;
$$;

do $$
declare live_id uuid; live_version integer; ended public.maintenance_relationships;
begin
  select id, version into live_id, live_version from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';

  select * into ended from public.end_maintenance_relationship(live_id, live_version, 'Client discontinued service');
  perform pg_temp.assert_true(ended.status = 'ended', 'the end action moves the relationship to Ended');

  -- Ending an already-Ended relationship is refused.
  begin
    perform public.end_maintenance_relationship(live_id, ended.version, 'Again');
    raise exception 'ASSERTION FAILED: ending an already-Ended relationship must be refused';
  exception when invalid_parameter_value then null;
  end;

  -- Ending frees the project for a brand new relationship.
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a1', 'Restarted after a gap', date '2026-09-01', 'monthly');
end;
$$;

-- The Completed project itself is STILL untouched after the full
-- pause → resume → end → restart lifecycle.
do $$
declare project_status text;
begin
  select status into project_status from public.projects where id = '00000000-0000-0000-0000-0000002010a1';
  perform pg_temp.assert_true(project_status = 'Completed', 'the project remains Completed through the entire Maintenance lifecycle');
end;
$$;

-- =====================================================================
-- 3. Visit lifecycle, and derived last/next visit
-- =====================================================================
do $$
declare relationship_id uuid;
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a2', 'Irrigation and lawn care', date '2026-08-01', 'weekly')
  returning id into relationship_id;
end;
$$;

do $$
declare relationship_id uuid; visit1 public.maintenance_visits; visit2 public.maintenance_visits; visit3 public.maintenance_visits;
begin
  select id into relationship_id from public.maintenance_relationships where project_id = '00000000-0000-0000-0000-0000002010a2';

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (relationship_id, date '2026-08-05', 'Routine lawn and border maintenance')
  returning * into visit1;
  perform pg_temp.assert_true(visit1.status = 'scheduled', 'a new visit always starts Scheduled');

  -- Cannot complete/cancel/reschedule with a bare direct UPDATE.
  begin
    update public.maintenance_visits set status = 'completed', completed_at = now(), completion_note = 'Done' where id = visit1.id;
    raise exception 'ASSERTION FAILED: a direct status write on a visit must be refused';
  exception when insufficient_privilege then null;
  end;

  select * into visit1 from public.complete_maintenance_visit(visit1.id, visit1.version, 'Lawn mowed, borders trimmed, irrigation checked');
  perform pg_temp.assert_true(visit1.status = 'completed', 'complete_maintenance_visit marks the visit Completed');
  perform pg_temp.assert_true(visit1.completed_at is not null, 'completion stamps completed_at');

  -- A Completed visit must not silently become Scheduled again — not even
  -- via the controlled action, and not even for the Principal.
  begin
    perform public.reschedule_maintenance_visit(visit1.id, visit1.version, date '2026-09-01');
    raise exception 'ASSERTION FAILED: a Completed visit must not be reschedulable';
  exception when invalid_parameter_value then null;
  end;
  begin
    update public.maintenance_visits set scheduled_date = date '2026-09-01' where id = visit1.id;
    raise exception 'ASSERTION FAILED: a Completed visit must not be reachable by a direct update at all';
  exception when invalid_parameter_value then null;
  end;

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (relationship_id, current_date + 14, 'Next scheduled visit')
  returning * into visit2;

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (relationship_id, current_date + 21, 'A visit that will be cancelled')
  returning * into visit3;

  -- A cancellation reason is required.
  begin
    perform public.cancel_maintenance_visit(visit3.id, visit3.version, '');
    raise exception 'ASSERTION FAILED: cancelling without a reason must be refused';
  exception when invalid_parameter_value then null;
  end;

  select * into visit3 from public.cancel_maintenance_visit(visit3.id, visit3.version, 'Client rescheduled for next month');
  perform pg_temp.assert_true(visit3.status = 'cancelled', 'cancel_maintenance_visit marks the visit Cancelled');

  -- A Scheduled visit can be rescheduled safely.
  select * into visit2 from public.reschedule_maintenance_visit(visit2.id, visit2.version, current_date + 20);
  perform pg_temp.assert_true(visit2.scheduled_date = current_date + 20, 'reschedule_maintenance_visit moves the scheduled date');
  perform pg_temp.assert_true(
    exists (select 1 from public.maintenance_visit_events where maintenance_visit_id = visit2.id and event_type = 'rescheduled'),
    'the reschedule is recorded in the immutable visit ledger'
  );
end;
$$;

-- last_visit / next_visit are DERIVED — never a stored column anywhere.
do $$
declare leaked text;
begin
  select string_agg(column_name, ', ') into leaked
  from information_schema.columns
  where table_schema = 'public' and table_name = 'maintenance_relationships'
    and column_name in ('last_visit', 'next_visit', 'last_visit_date', 'next_visit_date');
  perform pg_temp.assert_true(leaked is null, 'last/next visit must never be stored columns on the relationship');
end;
$$;

do $$
declare relationship_id uuid; register_row record;
begin
  select id into relationship_id from public.maintenance_relationships where project_id = '00000000-0000-0000-0000-0000002010a2';
  select * into register_row from public.maintenance_register() where id = relationship_id;

  perform pg_temp.assert_true(register_row.last_visit_date = date '2026-08-05', 'the register derives last visit from the latest Completed visit');
  perform pg_temp.assert_true(register_row.next_visit_date = current_date + 20, 'the register derives next visit from the earliest future Scheduled visit');
end;
$$;

-- A site with no completed visit and no scheduled future visit is truthfully
-- empty, not invented.
do $$
declare relationship_id uuid; register_row record;
begin
  select id into relationship_id from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1' and status = 'active';
  select * into register_row from public.maintenance_register() where id = relationship_id;

  perform pg_temp.assert_true(register_row.last_visit_date is null, 'no completed visit yields a truthfully empty last visit');
  perform pg_temp.assert_true(register_row.next_visit_date is null, 'no scheduled visit yields a truthfully empty next visit');
end;
$$;

-- =====================================================================
-- 4. Multi-person assignment, and no duplicate simultaneous assignment
-- =====================================================================
-- Deactivating a person is Principal-only (tg_people_access_guard), so this
-- fixture setup briefly runs as the Principal before returning to the
-- manager for the assignment work below.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f1', true);
insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-00000030101a', 'Brian Site Manager', 'regular_staff'),
  ('00000000-0000-0000-0000-00000030102a', 'Nelson Procurement', 'regular_staff'),
  ('00000000-0000-0000-0000-00000030103a', 'Inactive Person', 'regular_staff');
update public.people set is_active = false where id = '00000000-0000-0000-0000-00000030103a';
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f2', true);

do $$
declare relationship_id uuid; a1 public.maintenance_assignments;
begin
  select id into relationship_id from public.maintenance_relationships where project_id = '00000000-0000-0000-0000-0000002010a2';

  insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
  values (relationship_id, '00000000-0000-0000-0000-00000030101a', 'maintenance_lead', date '2026-08-01')
  returning * into a1;
  insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
  values (relationship_id, '00000000-0000-0000-0000-00000030102a', 'site_technician', date '2026-08-01');

  perform pg_temp.assert_true(
    (select count(*) from public.maintenance_assignments where maintenance_relationship_id = relationship_id and end_date is null) = 2,
    'a Maintenance relationship supports more than one simultaneous assigned person'
  );

  -- Duplicate simultaneous assignment of the same person is rejected.
  begin
    insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
    values (relationship_id, '00000000-0000-0000-0000-00000030101a', 'supervisor', date '2026-08-02');
    raise exception 'ASSERTION FAILED: a second open assignment for the same person/relationship must be rejected';
  exception when unique_violation then null;
  end;

  -- An inactive person cannot be newly assigned.
  begin
    insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
    values (relationship_id, '00000000-0000-0000-0000-00000030103a', 'support', date '2026-08-02');
    raise exception 'ASSERTION FAILED: an inactive person must not be newly assigned';
  exception when invalid_parameter_value then null;
  end;

  -- Ending an assignment, then reassigning the same person, is allowed —
  -- history is closed, never rewritten.
  update public.maintenance_assignments set end_date = date '2026-08-15' where id = a1.id;
  insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
  values (relationship_id, '00000000-0000-0000-0000-00000030101a', 'supervisor', date '2026-08-16');

  perform pg_temp.assert_true(
    (select count(*) from public.maintenance_assignments where maintenance_relationship_id = relationship_id and person_id = '00000000-0000-0000-0000-00000030101a') = 2,
    'the same person can be reassigned after their earlier assignment is closed, and both rows remain as history'
  );
end;
$$;

-- The register's assigned_team reflects only currently-open assignments.
do $$
declare relationship_id uuid; team_size integer;
begin
  select id into relationship_id from public.maintenance_relationships where project_id = '00000000-0000-0000-0000-0000002010a2';
  select jsonb_array_length(assigned_team) into team_size from public.maintenance_register() where id = relationship_id;
  perform pg_temp.assert_true(team_size = 2, 'the register lists exactly the currently-assigned team');
end;
$$;

-- =====================================================================
-- 5. Principal and Operations Manager authority; unauthorised roles
-- =====================================================================

-- The Operations Manager cannot reach a project outside their authority.
do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a4', 'Should be rejected', date '2026-08-10', 'monthly');
  raise exception 'ASSERTION FAILED: a relationship on an unreachable project must be rejected for the manager';
exception when insufficient_privilege then null;
end;
$$;

do $$
declare reachable integer;
begin
  select count(*) into reachable from public.maintenance_authorised_projects();
  perform pg_temp.assert_true(reachable = 4, 'the manager''s Maintenance project picker reaches exactly the four eligible, unarchived, led projects');
  perform pg_temp.assert_true(
    not exists (select 1 from public.maintenance_authorised_projects() where id = '00000000-0000-0000-0000-0000002010a4'),
    'the unreachable project never appears in the manager''s picker'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.maintenance_authorised_projects() where id = '00000000-0000-0000-0000-0000002010a6'),
    'the archived project never appears in the picker'
  );
end;
$$;

-- The Principal reaches every project, including one outside any manager's
-- lead/assignment authority.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f1', true);
do $$
declare created public.maintenance_relationships;
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a4', 'Principal reaches every project', date '2026-08-10', 'monthly')
  returning * into created;
  perform pg_temp.assert_true(created.id is not null, 'the Principal may start Maintenance on any project, portfolio-wide');
end;
$$;

do $$
declare visible integer;
begin
  select count(*) into visible from public.maintenance_relationships;
  perform pg_temp.assert_true(visible >= 4, 'the Principal sees every Maintenance relationship');
end;
$$;

-- Project-detail indicator: a live relationship on the Indicator (Completed)
-- project, with a future visit, surfaces through maintenance_project_summary.
do $$
declare relationship_id uuid;
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a3', 'Kept Active for the indicator proof', date '2026-08-01', 'quarterly')
  returning id into relationship_id;
  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (relationship_id, current_date + 7, 'Quarterly inspection');
end;
$$;

do $$
declare summary record; project_status text;
begin
  select * into summary from public.maintenance_project_summary('00000000-0000-0000-0000-0000002010a3');
  perform pg_temp.assert_true(summary.status = 'active', 'the Project-detail indicator reads Active');
  perform pg_temp.assert_true(summary.next_visit_date = current_date + 7, 'the Project-detail indicator reads the derived next visit');

  select status into project_status from public.projects where id = '00000000-0000-0000-0000-0000002010a3';
  perform pg_temp.assert_true(project_status = 'Completed', 'the Completed project stays Completed while its indicator reads Active Maintenance');
end;
$$;

-- Staff and viewer callers match no policy at all, exactly as every other
-- Operations domain.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f4', true);
do $$
declare relationships_visible integer; visits_visible integer; assignments_visible integer;
begin
  select count(*) into relationships_visible from public.maintenance_relationships;
  select count(*) into visits_visible from public.maintenance_visits;
  select count(*) into assignments_visible from public.maintenance_assignments;
  perform pg_temp.assert_true(relationships_visible = 0, 'staff reads no Maintenance relationship');
  perform pg_temp.assert_true(visits_visible = 0, 'staff reads no Maintenance visit');
  perform pg_temp.assert_true(assignments_visible = 0, 'staff reads no Maintenance assignment');
end;
$$;

do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a2', 'Staff invention', date '2026-08-10', 'monthly');
  raise exception 'ASSERTION FAILED: staff must not create a Maintenance relationship';
exception when insufficient_privilege then null;
end;
$$;

-- =====================================================================
-- 6. Audit actor/timestamp protection — nothing client-supplied survives
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f2', true);
do $$
declare created public.maintenance_relationships;
begin
  -- The manager attempts to forge provenance: a different creator, a
  -- backdated timestamp, and a pre-inflated version.
  insert into public.maintenance_relationships (
    project_id, scope, start_date, frequency, created_by, updated_by, created_at, updated_at, version
  ) values (
    '00000000-0000-0000-0000-0000002010a7', 'Audit spoof attempt', date '2026-08-10', 'monthly',
    '00000000-0000-0000-0000-0000000010f1', '00000000-0000-0000-0000-0000000010f1',
    timestamptz '2000-01-01', timestamptz '2000-01-01', 99
  ) returning * into created;

  perform pg_temp.assert_true(
    created.created_by = '00000000-0000-0000-0000-0000000010f2'::uuid,
    'created_by is always the real caller, never a client-supplied value'
  );
  perform pg_temp.assert_true(created.created_at > timestamptz '2020-01-01', 'created_at cannot be backdated by the client');
  perform pg_temp.assert_true(created.version = 1, 'version cannot be pre-inflated by the client');

  update public.maintenance_relationships set scope = 'Edited scope', updated_by = '00000000-0000-0000-0000-0000000010f1'
  where id = created.id returning * into created;
  perform pg_temp.assert_true(
    created.updated_by = '00000000-0000-0000-0000-0000000010f2'::uuid,
    'updated_by is always the real caller, never a client-supplied value'
  );
  perform pg_temp.assert_true(created.version = 2, 'an ordinary field edit still bumps the version exactly once');
end;
$$;

-- A relationship, visit or assignment referenced by history can never be
-- erased, even by a caller that bypasses row level security.
reset role;
do $$
declare relationship_id uuid;
begin
  select id into relationship_id from public.maintenance_relationships where project_id = '00000000-0000-0000-0000-0000002010a2';
  delete from public.maintenance_relationships where id = relationship_id;
  raise exception 'ASSERTION FAILED: a Maintenance relationship with visit/assignment history must not be deletable';
exception when foreign_key_violation then null;
end;
$$;

rollback;
