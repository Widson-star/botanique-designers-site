-- BOTANIQUE DESIGNERS — Maintenance authority / ACL correction regression.
-- Run after the full migration chain in an isolated PostgreSQL test database.
-- This test creates fixtures only inside its transaction and rolls back.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000ac01', 'acl-owner@maintenance.test'),
  ('00000000-0000-0000-0000-00000000ac02', 'acl-manager@maintenance.test'),
  ('00000000-0000-0000-0000-00000000ac03', 'acl-staff@maintenance.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-00000000ac01', 'acl-owner@maintenance.test', 'ACL Principal', 'owner', true),
  ('00000000-0000-0000-0000-00000000ac02', 'acl-manager@maintenance.test', 'ACL Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-00000000ac03', 'acl-staff@maintenance.test', 'ACL Project Team', 'staff', true);

insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  portfolio_eligible, portfolio_permission_status
) values (
  '00000000-0000-0000-0000-00000000aca1', 'Portfolio Maintenance ACL Site',
  'Residential', 'Completed', 'Completed', false, false, 'Not Reviewed'
);

set local role authenticated;

-- Operations Manager does not need to be Project lead or Project-assigned to
-- operate Maintenance: Maintenance is portfolio-wide Operations authority.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ac02', true);
select pg_temp.assert_true(
  public.can_manage_maintenance_project('00000000-0000-0000-0000-00000000aca1'),
  'Operations Manager has portfolio-wide Maintenance project authority'
);

do $$
declare relationship public.maintenance_relationships;
begin
  insert into public.maintenance_relationships (project_id, scope, start_date, frequency)
  values (
    '00000000-0000-0000-0000-00000000aca1',
    'Routine grounds upkeep', date '2026-08-17', 'weekly'
  ) returning * into relationship;

  perform pg_temp.assert_true(relationship.status = 'active', 'manager can start Maintenance on a portfolio site');

  begin
    perform public.end_maintenance_relationship(relationship.id, relationship.version, 'Manager should not terminate service');
    raise exception 'ASSERTION FAILED: Operations Manager must not end a Maintenance relationship';
  exception when insufficient_privilege then null;
  end;

  perform pg_temp.assert_true(
    (select status from public.maintenance_relationships where id = relationship.id) = 'active',
    'failed manager terminal action leaves Maintenance unchanged'
  );
end;
$$;

-- Project Team cannot enter the Maintenance ACL at all.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ac03', true);
select pg_temp.assert_true(
  not public.can_manage_maintenance_project('00000000-0000-0000-0000-00000000aca1'),
  'Project Team has no Maintenance management authority'
);
select pg_temp.assert_true(
  not exists (select 1 from public.maintenance_relationships),
  'Project Team cannot read Maintenance relationship rows through RLS'
);

-- Principal owns terminal closure after ordinary operational work is resolved.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000ac01', true);
do $$
declare relationship public.maintenance_relationships; ended public.maintenance_relationships;
begin
  select * into relationship from public.maintenance_relationships
  where project_id = '00000000-0000-0000-0000-00000000aca1';

  select * into ended from public.end_maintenance_relationship(
    relationship.id, relationship.version, 'Maintenance service concluded'
  );

  perform pg_temp.assert_true(ended.status = 'ended', 'Principal can end Maintenance');
end;
$$;

rollback;
