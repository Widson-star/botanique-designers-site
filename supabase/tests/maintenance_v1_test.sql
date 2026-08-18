-- BOTANIQUE DESIGNERS — Maintenance V1 database regression.
--
-- Runs on an isolated PostgreSQL database after the full migration chain.
-- Proves the settled model after the 17 Aug 2026 authority correction:
-- Maintenance is independent of Project lifecycle; Principal and Operations
-- Manager operate the portfolio; Project Team cannot enter Maintenance; visits
-- and assignments retain controlled lifecycles; terminal end-of-service and
-- historical correction are Principal controls; audit/financial boundaries
-- remain intact.
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
  ('00000000-0000-0000-0000-0000000010f1', 'principal@maintenance.test'),
  ('00000000-0000-0000-0000-0000000010f2', 'manager@maintenance.test'),
  ('00000000-0000-0000-0000-0000000010f4', 'staff@maintenance.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000010f1', 'principal@maintenance.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000010f2', 'manager@maintenance.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000010f4', 'staff@maintenance.test', 'Project Team', 'staff', true);

insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000002010a1', 'Completed Portfolio Site', 'Residential', 'Completed', 'Completed', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a2', 'Ongoing Portfolio Site', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed'),
  -- Archive is a record state, not a delivery phase, and a Cancelled Project
  -- keeps the phase it was cancelled at (both settled by the Project lifecycle
  -- foundation; the lifecycle trigger rejects the old fixture values).
  ('00000000-0000-0000-0000-0000002010a3', 'Archived Site', 'Residential', 'Completed', 'Completed', true,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000002010a4', 'Cancelled Site', 'Residential', 'Cancelled', 'Implementation', false,
   null, false, 'Not Reviewed');

create temp table project_baseline as
select id, status, stage, archived from public.projects;
grant select on project_baseline to authenticated;

-- ---------------------------------------------------------------------
-- Structural / security guarantees
-- ---------------------------------------------------------------------
do $$
declare tbl text; leaked text;
begin
  foreach tbl in array array[
    'maintenance_relationships', 'maintenance_relationship_events',
    'maintenance_visits', 'maintenance_visit_events', 'maintenance_assignments'
  ] loop
    perform pg_temp.assert_true(
      (select relrowsecurity from pg_class where oid = ('public.' || tbl)::regclass),
      tbl || ' has RLS enabled'
    );
    perform pg_temp.assert_true(
      not has_table_privilege('authenticated', 'public.' || tbl, 'DELETE'),
      tbl || ' cannot be deleted by application roles'
    );
    perform pg_temp.assert_true(
      not has_table_privilege('anon', 'public.' || tbl, 'SELECT'),
      'anon cannot read ' || tbl
    );
  end loop;

  select string_agg(table_name || '.' || column_name, ', ') into leaked
  from information_schema.columns
  where table_schema = 'public'
    and table_name like 'maintenance_%'
    and column_name ~* '(amount|cost|price|payment|paid|invoice|balance|margin|advance)';
  perform pg_temp.assert_true(leaked is null, 'Maintenance owns no Finance columns');
end;
$$;

select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.maintenance_relationship_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.maintenance_relationship_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.maintenance_visit_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.maintenance_visit_events', 'UPDATE'),
  'immutable event ledgers cannot be written directly'
);

set local role authenticated;

-- ---------------------------------------------------------------------
-- Principal creates People used by Maintenance assignments
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f1', true);
insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-00000030101a', 'Lincoln Test', 'regular_staff'),
  ('00000000-0000-0000-0000-00000030102a', 'Kefa Test', 'regular_staff');

-- ---------------------------------------------------------------------
-- Operations Manager authority is portfolio-wide
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f2', true);
select pg_temp.assert_true(
  public.can_manage_maintenance_project('00000000-0000-0000-0000-0000002010a1'),
  'manager may operate Maintenance on a portfolio project without lead/assignment linkage'
);
select pg_temp.assert_true(
  public.can_manage_maintenance_project('00000000-0000-0000-0000-0000002010a2'),
  'manager portfolio authority covers another eligible project'
);

-- Picker is still a business-eligibility filter: archived/cancelled sites stay out.
do $$
declare eligible integer;
begin
  select count(*) into eligible from public.maintenance_authorised_projects();
  perform pg_temp.assert_true(eligible = 2, 'manager picker contains exactly the two eligible unarchived projects');
  perform pg_temp.assert_true(
    not exists (select 1 from public.maintenance_authorised_projects() where id = '00000000-0000-0000-0000-0000002010a3'),
    'archived project stays out of Maintenance picker'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.maintenance_authorised_projects() where id = '00000000-0000-0000-0000-0000002010a4'),
    'cancelled project stays out of Maintenance picker'
  );
end;
$$;

-- Completed Project can carry Active Maintenance and remains Completed.
do $$
declare rel public.maintenance_relationships; project_status text;
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values (
    '00000000-0000-0000-0000-0000002010a1',
    'Weekly lawn, border and irrigation upkeep', date '2026-08-01', 'weekly'
  ) returning * into rel;

  perform pg_temp.assert_true(rel.status = 'active', 'new Maintenance starts Active');
  perform pg_temp.assert_true(rel.version = 1, 'new Maintenance starts at version 1');

  select status into project_status from public.projects where id = rel.project_id;
  perform pg_temp.assert_true(project_status = 'Completed', 'Project stays Completed while Maintenance is Active');
end;
$$;

-- Invalid Project lifecycle cannot start Maintenance despite role authority.
do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a4', 'Should fail', date '2026-08-01', 'monthly');
  raise exception 'ASSERTION FAILED: Cancelled Project must not start Maintenance';
exception when invalid_parameter_value then null;
end;
$$;

-- ---------------------------------------------------------------------
-- Visit lifecycle and derived last/next visit
-- ---------------------------------------------------------------------
do $$
declare rel_id uuid; completed public.maintenance_visits; future public.maintenance_visits; row record;
begin
  select id into rel_id from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (rel_id, date '2026-08-05', 'Routine grounds upkeep')
  returning * into completed;

  select * into completed from public.complete_maintenance_visit(
    completed.id, completed.version, 'Lawn mowed and irrigation checked'
  );
  perform pg_temp.assert_true(completed.status = 'completed', 'controlled completion marks visit Completed');
  perform pg_temp.assert_true(completed.completed_at is not null, 'completion stamps completed_at');

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (rel_id, current_date + 7, 'Next weekly visit')
  returning * into future;

  select * into row from public.maintenance_register() where id = rel_id;
  perform pg_temp.assert_true(row.last_visit_date = date '2026-08-05', 'register derives latest completed visit');
  perform pg_temp.assert_true(row.next_visit_date = current_date + 7, 'register derives next scheduled visit');

  begin
    update public.maintenance_visits
    set status = 'completed', completed_at = now(), completion_note = 'Bypass'
    where id = future.id;
    raise exception 'ASSERTION FAILED: direct visit status change must fail';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Multi-person assignment and terminal assignment history
-- ---------------------------------------------------------------------
do $$
declare rel_id uuid; first_assignment public.maintenance_assignments; closed public.maintenance_assignments;
begin
  select id into rel_id from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';

  insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
  values (rel_id, '00000000-0000-0000-0000-00000030101a', 'maintenance_lead', date '2026-08-01')
  returning * into first_assignment;
  insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
  values (rel_id, '00000000-0000-0000-0000-00000030102a', 'site_technician', date '2026-08-01');

  perform pg_temp.assert_true(
    (select count(*) from public.maintenance_assignments where maintenance_relationship_id = rel_id and end_date is null) = 2,
    'Maintenance supports multiple simultaneous assigned staff'
  );

  begin
    insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
    values (rel_id, '00000000-0000-0000-0000-00000030101a', 'supervisor', date '2026-08-02');
    raise exception 'ASSERTION FAILED: duplicate open assignment must fail';
  exception when unique_violation then null;
  end;

  select * into closed from public.end_maintenance_assignment(first_assignment.id, first_assignment.version);
  perform pg_temp.assert_true(closed.end_date is not null, 'controlled assignment close records end date');

  begin
    update public.maintenance_assignments set end_date = null where id = closed.id;
    raise exception 'ASSERTION FAILED: historical assignment must not reopen';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Manager ordinary operations vs Principal exceptional authority
-- ---------------------------------------------------------------------
do $$
declare rel public.maintenance_relationships;
begin
  select * into rel from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';

  -- Manager can pause/resume ordinary Maintenance lifecycle.
  select * into rel from public.pause_maintenance_relationship(rel.id, rel.version, 'Seasonal pause');
  perform pg_temp.assert_true(rel.status = 'paused', 'manager can pause Maintenance');
  select * into rel from public.resume_maintenance_relationship(rel.id, rel.version);
  perform pg_temp.assert_true(rel.status = 'active', 'manager can resume Maintenance');

  -- Terminal service closure is not an Operations Manager action.
  begin
    perform public.end_maintenance_relationship(rel.id, rel.version, 'Manager termination attempt');
    raise exception 'ASSERTION FAILED: manager must not terminate Maintenance';
  exception when insufficient_privilege then null;
  end;

  perform pg_temp.assert_true(
    (select status from public.maintenance_relationships where id = rel.id) = 'active',
    'rejected manager terminal action leaves relationship Active'
  );
end;
$$;

-- Project Team reads and writes nothing in Maintenance V1.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f4', true);
select pg_temp.assert_true(not public.can_manage_maintenance_project('00000000-0000-0000-0000-0000002010a1'), 'staff has no Maintenance project authority');
select pg_temp.assert_true((select count(*) from public.maintenance_relationships) = 0, 'staff reads no Maintenance relationship');
select pg_temp.assert_true((select count(*) from public.maintenance_visits) = 0, 'staff reads no Maintenance visit');
select pg_temp.assert_true((select count(*) from public.maintenance_assignments) = 0, 'staff reads no Maintenance assignment');

do $$
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values ('00000000-0000-0000-0000-0000002010a2', 'Staff invention', date '2026-08-01', 'monthly');
  raise exception 'ASSERTION FAILED: staff must not create Maintenance';
exception when insufficient_privilege then null;
end;
$$;

-- Principal can terminate only after scheduled work is resolved; open team
-- assignments close atomically with the relationship.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000010f1', true);
do $$
declare rel public.maintenance_relationships; scheduled public.maintenance_visits; ended public.maintenance_relationships;
begin
  select * into rel from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-0000002010a1';
  select * into scheduled from public.maintenance_visits
  where maintenance_relationship_id = rel.id and status = 'scheduled'
  order by scheduled_date limit 1;

  begin
    perform public.end_maintenance_relationship(rel.id, rel.version, 'Close before resolving scheduled visit');
    raise exception 'ASSERTION FAILED: relationship cannot end with scheduled visit open';
  exception when invalid_parameter_value then null;
  end;

  select * into scheduled from public.cancel_maintenance_visit(
    scheduled.id, scheduled.version, 'Visit no longer required because service is ending'
  );

  select * into rel from public.maintenance_relationships where id = rel.id;
  select * into ended from public.end_maintenance_relationship(rel.id, rel.version, 'Maintenance service concluded');
  perform pg_temp.assert_true(ended.status = 'ended', 'Principal can terminate resolved Maintenance');
  perform pg_temp.assert_true(
    not exists (select 1 from public.maintenance_assignments where maintenance_relationship_id = ended.id and end_date is null),
    'terminal closure atomically closes every open team assignment'
  );
end;
$$;

-- Project lifecycle never moved during the Maintenance lifecycle.
select pg_temp.assert_true(
  not exists (
    select 1 from public.projects p
    join project_baseline b on b.id = p.id
    where p.status is distinct from b.status
       or p.stage is distinct from b.stage
       or p.archived is distinct from b.archived
  ),
  'Maintenance never mutates Project lifecycle truth'
);

rollback;
