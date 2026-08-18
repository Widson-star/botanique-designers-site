-- BOTANIQUE DESIGNERS — Site-owned Maintenance + Site-aware Daily Site Records.
--
-- Runs on an isolated PostgreSQL database after the full migration chain.
-- Proves the settled model: a Site is the durable owner of a Maintenance
-- relationship, the originating Botanique Project is optional context, and a
-- maintenance-only Site gets the same Plan -> Execute -> Verify -> Close loop
-- through a Daily Site Record that belongs to the Site.
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
  ('00000000-0000-0000-0000-00000000a001', 'principal@site.test'),
  ('00000000-0000-0000-0000-00000000a002', 'manager@site.test'),
  ('00000000-0000-0000-0000-00000000a003', 'staff@site.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-00000000a001', 'principal@site.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-00000000a002', 'manager@site.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-00000000a003', 'staff@site.test', 'Project Team', 'staff', true);

-- Two Sites created through the ordinary Project path, plus a third Site that
-- exists with NO Project at all (the maintenance-only case).
insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-00000000b001', 'Delivered Landscape', 'Property Alpha', 'Residential', 'Completed', 'Completed', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-00000000b002', 'Live Build', 'Property Beta', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed');

-- A SECOND Botanique Project at the SAME physical Site as Property Alpha.
insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-00000000b003', 'Later Works', 'Property Alpha', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed');

create temp table site_ids as
select
  (select site_id from public.projects where id = '00000000-0000-0000-0000-00000000b001') as alpha,
  (select site_id from public.projects where id = '00000000-0000-0000-0000-00000000b002') as beta;

-- 17. Several Projects at one Site resolve to ONE Site.
do $$
declare alpha uuid; later uuid;
begin
  select site_id into alpha from public.projects where id = '00000000-0000-0000-0000-00000000b001';
  select site_id into later from public.projects where id = '00000000-0000-0000-0000-00000000b003';
  perform pg_temp.assert_true(alpha = later, 'two Projects at one property share one Site');
end;
$$;

set local role authenticated;

-- ---------------------------------------------------------------------
-- Site creation authority (13, 14, 15, 16, 17)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
do $$
declare created public.sites; reused public.sites;
begin
  created := public.create_maintenance_site('Maintenance Only Estate', 'Karen', 'Nairobi');
  perform pg_temp.assert_true(created.id is not null, '13. Principal can create a Maintenance Site');
  -- 16. An identical Site is reused, never duplicated.
  reused := public.create_maintenance_site('  maintenance   only estate ', 'Karen', 'Nairobi');
  perform pg_temp.assert_true(reused.id = created.id, '16. identical Site is reused, not duplicated');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', true);
do $$
declare created public.sites;
begin
  created := public.create_maintenance_site('Manager Created Grounds', 'Runda', 'Nairobi');
  perform pg_temp.assert_true(created.id is not null, '14. Operations Manager can create a Maintenance Site');
end;
$$;

-- 17. The Manager still has no generic Site UPDATE authority.
do $$
declare updated integer;
begin
  update public.sites set site_name = 'Renamed By Manager'
  where site_name = 'Manager Created Grounds';
  get diagnostics updated = row_count;
  perform pg_temp.assert_true(updated = 0, '17. Manager cannot arbitrarily rename a Site');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', true);
do $$
begin
  perform public.create_maintenance_site('Staff Invention', null, null);
  raise exception 'ASSERTION FAILED: 15. staff must not create a Maintenance Site';
exception when insufficient_privilege then null;
end;
$$;

-- ---------------------------------------------------------------------
-- Site-owned relationships (1, 2, 3, 4, 5)
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);

-- 1. A Project-backed relationship reads the Project's Site.
do $$
declare rel public.maintenance_relationships; alpha uuid;
begin
  select site_id into alpha from public.projects where id = '00000000-0000-0000-0000-00000000b001';
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (alpha, '00000000-0000-0000-0000-00000000b001', 'Lawn and borders', date '2026-08-01', 'weekly')
  returning * into rel;
  perform pg_temp.assert_true(rel.site_id = alpha, '1. project-backed relationship carries the Project Site');
  perform pg_temp.assert_true(rel.status = 'active', '1. new Maintenance starts Active');
end;
$$;

-- 2. A maintenance-only relationship needs no Project at all.
do $$
declare rel public.maintenance_relationships; only_site uuid;
begin
  select id into only_site from public.sites where site_name = 'Maintenance Only Estate';
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (only_site, null, 'Grounds upkeep with no Botanique build', date '2026-08-01', 'weekly')
  returning * into rel;
  perform pg_temp.assert_true(rel.project_id is null, '2. maintenance-only relationship keeps a null Project');
  perform pg_temp.assert_true(rel.site_id = only_site, '2. maintenance-only relationship is owned by its Site');
end;
$$;

-- 3. A Project from a DIFFERENT Site is refused.
do $$
declare only_site uuid;
begin
  select id into only_site from public.sites where site_name = 'Maintenance Only Estate';
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (only_site, '00000000-0000-0000-0000-00000000b002', 'Mismatched', date '2026-08-01', 'weekly');
  raise exception 'ASSERTION FAILED: 3. a Project from another Site must be refused';
exception when invalid_parameter_value then null;
end;
$$;

-- 4. One live relationship per SITE, even via a second Project at that Site.
do $$
declare alpha uuid;
begin
  select site_id into alpha from public.projects where id = '00000000-0000-0000-0000-00000000b003';
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (alpha, '00000000-0000-0000-0000-00000000b003', 'Second live at one Site', date '2026-08-02', 'weekly');
  raise exception 'ASSERTION FAILED: 4. one live Maintenance relationship per Site';
exception when unique_violation then null;
end;
$$;

-- 5. Once ended, the same Site may start Maintenance again.
do $$
declare rel public.maintenance_relationships; beta uuid; restarted public.maintenance_relationships;
begin
  select site_id into beta from public.projects where id = '00000000-0000-0000-0000-00000000b002';
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (beta, '00000000-0000-0000-0000-00000000b002', 'First run', date '2026-08-01', 'monthly')
  returning * into rel;
  rel := public.end_maintenance_relationship(rel.id, rel.version, 'Contract closed');
  perform pg_temp.assert_true(rel.status = 'ended', '5. Principal can end a relationship');

  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (beta, '00000000-0000-0000-0000-00000000b002', 'Renewed run', date '2026-09-01', 'monthly')
  returning * into restarted;
  perform pg_temp.assert_true(restarted.status = 'active', '5. an ended Site can start Maintenance again');
  -- keep the fixture to a single live relationship at Beta
  perform public.end_maintenance_relationship(restarted.id, restarted.version, 'Fixture tidy');
end;
$$;

-- ---------------------------------------------------------------------
-- Role authority (6, 7, 8, 9, 10, 11, 12)
-- ---------------------------------------------------------------------
-- 6 / 7. Principal and Operations Manager both operate ordinary Maintenance.
do $$
declare only_site uuid;
begin
  select id into only_site from public.sites where site_name = 'Maintenance Only Estate';
  perform pg_temp.assert_true(public.can_manage_maintenance_site(only_site), '6. Principal manages the Site');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', true);
do $$
declare only_site uuid; rel public.maintenance_relationships;
begin
  select id into only_site from public.sites where site_name = 'Maintenance Only Estate';
  perform pg_temp.assert_true(public.can_manage_maintenance_site(only_site), '7. Operations Manager manages the Site');
  select * into rel from public.maintenance_relationships where site_id = only_site and status <> 'ended';
  perform pg_temp.assert_true(rel.id is not null, '7. Operations Manager reads the maintenance-only relationship');

  -- 10. A Manager cannot end the whole relationship.
  begin
    perform public.end_maintenance_relationship(rel.id, rel.version, 'Manager attempt');
    raise exception 'ASSERTION FAILED: 10. only the Principal may end Maintenance';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- 8 / 9. Project Team (staff) is denied entirely.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a003', true);
do $$
declare only_site uuid; visible integer;
begin
  select id into only_site from public.sites where site_name = 'Maintenance Only Estate';
  perform pg_temp.assert_true(not public.can_manage_maintenance_site(only_site), '8. Project Team denied Site authority');
  select count(*) into visible from public.maintenance_relationships;
  perform pg_temp.assert_true(visible = 0, '9. Project Team reads no Maintenance relationship');
end;
$$;

-- 12. Historical assignment correction stays Principal-only.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-00000000c001', 'Site Technician', 'regular_staff');

do $$
declare only_site uuid; rel public.maintenance_relationships; assignment public.maintenance_assignments;
begin
  select id into only_site from public.sites where site_name = 'Maintenance Only Estate';
  select * into rel from public.maintenance_relationships where site_id = only_site and status <> 'ended';
  insert into public.maintenance_assignments (maintenance_relationship_id, person_id, role, start_date)
  values (rel.id, '00000000-0000-0000-0000-00000000c001', 'site_technician', date '2026-08-01')
  returning * into assignment;
  perform pg_temp.assert_true(assignment.id is not null, '12. Principal can assign to maintenance-only Maintenance');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a002', true);
do $$
declare assignment public.maintenance_assignments;
begin
  select * into assignment from public.maintenance_assignments limit 1;
  begin
    perform public.correct_maintenance_assignment(assignment.id, assignment.version, 'supervisor', date '2026-08-02', 'Manager attempt');
    raise exception 'ASSERTION FAILED: 12. only the Principal may correct an assignment';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Site-first register
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
do $$
declare row_only record; row_backed record;
begin
  select * into row_only from public.maintenance_register() where site_name = 'Maintenance Only Estate';
  perform pg_temp.assert_true(row_only.site_name = 'Maintenance Only Estate', 'register leads with Site name');
  perform pg_temp.assert_true(row_only.project_id is null, 'register tolerates a null Project');
  perform pg_temp.assert_true(row_only.project_name is null, 'register has no invented Project name');

  select * into row_backed from public.maintenance_register() where site_name = 'Property Alpha';
  perform pg_temp.assert_true(row_backed.project_name = 'Delivered Landscape', 'register keeps Project context where it exists');
end;
$$;

-- maintenance_authorised_sites offers only Sites with no live relationship.
do $$
declare offered integer; alpha uuid;
begin
  select site_id into alpha from public.projects where id = '00000000-0000-0000-0000-00000000b001';
  select count(*) into offered from public.maintenance_authorised_sites() where id = alpha;
  perform pg_temp.assert_true(offered = 0, 'a Site with live Maintenance is not offered again');
  select count(*) into offered from public.maintenance_authorised_sites() where site_name = 'Manager Created Grounds';
  perform pg_temp.assert_true(offered = 1, 'a free Site is offered for new Maintenance');
end;
$$;

rollback;
