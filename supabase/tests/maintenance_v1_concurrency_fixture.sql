-- BD-OPERATIONS-HUB-01 — Maintenance V1 concurrency-regression fixture.
--
-- Deliberately NOT wrapped in begin/rollback: this data must be committed
-- and visible to the separate psql connections the concurrency race scripts
-- open against the same disposable cluster (see
-- scripts/test-maintenance-db.sh). Four projects/relationships — one per
-- (test x ordering) combination — because a project may hold only one live
-- Maintenance relationship, and each race consumes its relationship by
-- either ending it or leaving it Active with a new visit/assignment.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000090f1', 'race-owner@maintenance.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000090f1', 'race-owner@maintenance.test', 'Race Owner', 'owner', true);

insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000009010a1', 'Race Project — visit wins', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000090f1', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000009010a2', 'Race Project — end wins (visit)', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000090f1', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000009010a3', 'Race Project — assignment wins', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000090f1', false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-0000009010a4', 'Race Project — end wins (assignment)', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000090f1', false, 'Not Reviewed');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000090f1', false);

insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-0000009020b1', 'Race Person', 'regular_staff');

insert into public.maintenance_relationships (id, project_id, scope, start_date, frequency) values
  ('00000000-0000-0000-0000-0000009030d1', '00000000-0000-0000-0000-0000009010a1', 'Race relationship — visit wins', date '2026-01-01', 'monthly'),
  ('00000000-0000-0000-0000-0000009030d2', '00000000-0000-0000-0000-0000009010a2', 'Race relationship — end wins (visit)', date '2026-01-01', 'monthly'),
  ('00000000-0000-0000-0000-0000009030d3', '00000000-0000-0000-0000-0000009010a3', 'Race relationship — assignment wins', date '2026-01-01', 'monthly'),
  ('00000000-0000-0000-0000-0000009030d4', '00000000-0000-0000-0000-0000009010a4', 'Race relationship — end wins (assignment)', date '2026-01-01', 'monthly');

reset role;
