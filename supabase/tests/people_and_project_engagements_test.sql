-- BD-PEOPLE-01 (Stage 5) — People and project engagements database tests.
--
-- Runs on an isolated PostgreSQL 17 database after every migration is applied
-- in order (see scripts/test-people-db.sh). No hosted Supabase is touched.
--
-- Proves the Stage 5 authority: a person exists without a login; creating a
-- person grants no access; the portal link is optional, unique and
-- Principal-only; duplicates are prevented; engagements are project-scoped and
-- leak nothing; history survives deactivation and closure; and casual workers
-- are structurally excluded from the register.
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
  ('00000000-0000-0000-0000-0000000000f1', 'principal@people.test'),
  ('00000000-0000-0000-0000-0000000000f2', 'manager@people.test'),
  ('00000000-0000-0000-0000-0000000000f3', 'other-manager@people.test'),
  ('00000000-0000-0000-0000-0000000000f4', 'staff@people.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000000f1', 'principal@people.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000000f2', 'manager@people.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000000f3', 'other-manager@people.test', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000000f4', 'staff@people.test', 'Project Team', 'staff', true);

-- LED and SECOND LED are led by the Operations Manager, so they are inside
-- their authority. UNREACHABLE is led by another manager with no assignment for
-- our manager, so it is outside it. This is the real production shape:
-- project_assignments is empty, and a manager reaches a project by leading it.
insert into public.projects (id, project_name, project_type, status, stage, archived, lead_person_id, portfolio_eligible, portfolio_permission_status) values
  ('10000000-0000-0000-0000-0000000000a1', 'Led Site', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-0000000000f2', false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-0000000000a2', 'Unreachable Site', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-0000000000f3', false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-0000000000a4', 'Second Led Site', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-0000000000f2', false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-0000000000a3', 'Archived Led Site', 'Residential', 'Ongoing', 'Archived', true, '00000000-0000-0000-0000-0000000000f2', false, 'Not Reviewed');

-- =====================================================================
-- 0. Structural guarantees, checked before any row exists
-- =====================================================================
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.people'::regclass), 'people RLS enabled');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.people_engagements'::regclass), 'people_engagements RLS enabled');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.people', 'DELETE'), 'people cannot be deleted by any caller');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.people_engagements', 'DELETE'), 'engagements cannot be deleted by any caller');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.people', 'SELECT'), 'anon cannot read the people register');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.people_engagements', 'SELECT'), 'anon cannot read engagements');

-- REQUIREMENT 14: no authentication or sensitive identity column exists. This
-- is asserted against the catalogue, so a later migration that adds one to
-- either table fails this test rather than shipping quietly.
do $$
declare leaked text;
begin
  select string_agg(column_name, ', ') into leaked
  from information_schema.columns
  where table_schema = 'public'
    and table_name in ('people', 'people_engagements')
    and (
      column_name ~* '(password|token|secret|recovery|otp|session)'
      or column_name ~* '(national_id|id_number|passport|id_document|photo|bank|account_number|dob|date_of_birth)'
      or column_name ~* '(rate|amount|salary|wage|payment|paid|balance)'
    );
  perform pg_temp.assert_true(
    leaked is null,
    format('People tables must hold no authentication, identity-document or money column, found: %s', leaked)
  );
end;
$$;

set local role authenticated;

-- =====================================================================
-- 1. A person exists WITHOUT portal access  (requirements 1 and 2)
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);

do $$
declare created public.people;
begin
  insert into public.people (full_name, relationship_type, phone)
  values ('Lincoln Waweru', 'crew_representative', '0700000001')
  returning * into created;

  perform pg_temp.assert_true(created.profile_id is null, 'a new person has no portal account');
  perform pg_temp.assert_true(created.is_active, 'a new person is active');
  perform pg_temp.assert_true(created.version = 1, 'a new person starts at version 1');
  perform pg_temp.assert_true(
    created.created_by = '00000000-0000-0000-0000-0000000000f1'::uuid,
    'the audit trigger records who created the person'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from auth.users where id = created.id),
    'a person id is NOT an auth user id — creating a person creates no login'
  );
end;
$$;

-- REQUIREMENT 2: portal access cannot be granted at creation time, by anyone,
-- including the Principal.
do $$
begin
  insert into public.people (full_name, relationship_type, profile_id)
  values ('Sneaky Link', 'regular_staff', '00000000-0000-0000-0000-0000000000f2');
  raise exception 'ASSERTION FAILED: creating a person must never attach a portal account';
exception when insufficient_privilege then null;
end;
$$;

-- REQUIREMENT 12: the casual-worker decision is enforced by the schema, not by
-- the interface. A permanent person register cannot grow out of daily site
-- registers, because there is no value to store one under.
do $$
begin
  begin
    insert into public.people (full_name, relationship_type) values ('Casual One', 'casual_worker');
    raise exception 'ASSERTION FAILED: casual_worker must not be a valid relationship type';
  exception when check_violation then null;
  end;
  begin
    insert into public.people (full_name, relationship_type) values ('A Crew', 'crew');
    raise exception 'ASSERTION FAILED: crew is a group, not a person, and must be rejected';
  exception when check_violation then null;
  end;
end;
$$;

-- =====================================================================
-- 2. Duplicate canonical people are prevented  (requirement 4)
-- =====================================================================
-- The exact production failure: "Lincoln Waweru" recorded twice under different
-- spacing or case must be impossible.
do $$
begin
  insert into public.people (full_name, relationship_type) values ('  lincoln   waweru', 'subcontractor');
  raise exception 'ASSERTION FAILED: a duplicate canonical name must be rejected';
exception when unique_violation then null;
end;
$$;

-- Surrounding whitespace is normalised on write, so the register cannot drift.
do $$
declare stored text;
begin
  insert into public.people (full_name, relationship_type) values ('  Martine Lotom  ', 'regular_staff');
  select full_name into stored from public.people where full_name like '%Martine%';
  perform pg_temp.assert_true(stored = 'Martine Lotom', 'names are trimmed on write');
end;
$$;

-- =====================================================================
-- 3. The portal link is optional, unique and Principal-only  (requirement 3)
-- =====================================================================
do $$
declare linked public.people;
begin
  update public.people set profile_id = '00000000-0000-0000-0000-0000000000f2'
  where full_name = 'Martine Lotom' returning * into linked;
  perform pg_temp.assert_true(
    linked.profile_id = '00000000-0000-0000-0000-0000000000f2'::uuid,
    'the Principal may link a person to a portal profile'
  );
  perform pg_temp.assert_true(linked.version = 2, 'an update bumps the version');
end;
$$;

-- One profile belongs to at most one person record.
do $$
begin
  update public.people set profile_id = '00000000-0000-0000-0000-0000000000f2'
  where full_name = 'Lincoln Waweru';
  raise exception 'ASSERTION FAILED: a profile must not be linked to two people';
exception when unique_violation then null;
end;
$$;

-- =====================================================================
-- 4. The Operations Manager's authority is exactly as approved
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);

-- Approved: the manager runs day-to-day resourcing and may add people.
do $$
declare created public.people;
begin
  insert into public.people (full_name, relationship_type, note)
  values ('Grace Njeri', 'site_representative', 'Karen site contact')
  returning * into created;
  perform pg_temp.assert_true(created.id is not null, 'the Operations Manager may create a person');
end;
$$;

-- REQUIREMENT 15: refused authority stays a genuine error, not a silent no-op.
do $$
begin
  update public.people set profile_id = '00000000-0000-0000-0000-0000000000f3'
  where full_name = 'Lincoln Waweru';
  raise exception 'ASSERTION FAILED: the manager must not link a portal account';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  update public.people set is_active = false where full_name = 'Lincoln Waweru';
  raise exception 'ASSERTION FAILED: the manager must not deactivate a person';
exception when insufficient_privilege then null;
end;
$$;

-- Unlinking is equally a Principal-only security action.
do $$
begin
  update public.people set profile_id = null where full_name = 'Martine Lotom';
  raise exception 'ASSERTION FAILED: the manager must not unlink a portal account';
exception when insufficient_privilege then null;
end;
$$;

-- The manager may still edit ordinary resourcing fields.
do $$
declare edited public.people;
begin
  update public.people set phone = '0700000009' where full_name = 'Lincoln Waweru'
  returning * into edited;
  perform pg_temp.assert_true(edited.phone = '0700000009', 'the manager may edit ordinary person fields');
end;
$$;

-- =====================================================================
-- 5. Engagements are project-scoped and reusable  (requirements 5, 6)
-- =====================================================================
do $$
declare engagement public.people_engagements;
begin
  insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
  select id, '10000000-0000-0000-0000-0000000000a1', 'team_leader', date '2026-06-01'
  from public.people where full_name = 'Lincoln Waweru'
  returning * into engagement;

  perform pg_temp.assert_true(engagement.end_date is null, 'a new engagement is open');
  perform pg_temp.assert_true(
    engagement.created_by = '00000000-0000-0000-0000-0000000000f2'::uuid,
    'the engagement records who created it'
  );
end;
$$;

-- REQUIREMENT 5: a regular person is entered ONCE and reused. The same person
-- record carries a second engagement without being re-created.
do $$
declare person_count integer;
begin
  insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
  select id, '10000000-0000-0000-0000-0000000000a4', 'supervisor', date '2026-06-15'
  from public.people where full_name = 'Lincoln Waweru';

  select count(*) into person_count from public.people where lower(full_name) = 'lincoln waweru';
  perform pg_temp.assert_true(
    person_count = 1,
    'one person record serves many engagements — nobody is re-entered per project'
  );
end;
$$;

-- One OPEN engagement per person per project.
do $$
begin
  insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
  select id, '10000000-0000-0000-0000-0000000000a1', 'supervisor', date '2026-07-01'
  from public.people where full_name = 'Lincoln Waweru';
  raise exception 'ASSERTION FAILED: a second open engagement on one project must be rejected';
exception when unique_violation then null;
end;
$$;

-- REQUIREMENT 6/9: the manager cannot record an engagement on a project outside
-- their authority.
do $$
begin
  insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
  select id, '10000000-0000-0000-0000-0000000000a2', 'team_leader', date '2026-06-01'
  from public.people where full_name = 'Grace Njeri';
  raise exception 'ASSERTION FAILED: an engagement outside the caller''s project authority must be rejected';
exception when insufficient_privilege then null;
end;
$$;

-- An engagement period cannot run backwards.
do $$
begin
  insert into public.people_engagements (person_id, project_id, engagement_role, start_date, end_date, end_reason)
  select id, '10000000-0000-0000-0000-0000000000a1', 'project_support', date '2026-07-01', date '2026-06-01', 'Backwards'
  from public.people where full_name = 'Grace Njeri';
  raise exception 'ASSERTION FAILED: an engagement ending before it starts must be rejected';
exception when check_violation then null;
end;
$$;

-- =====================================================================
-- 6. Inaccessible engagement data does not leak  (requirements 7, 8, 9)
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);
insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
select id, '10000000-0000-0000-0000-0000000000a2', 'consultant', date '2026-05-01'
from public.people where full_name = 'Grace Njeri';

-- REQUIREMENT 7: the Principal reaches every engagement.
do $$
declare visible integer;
begin
  select count(*) into visible from public.people_engagements;
  perform pg_temp.assert_true(visible = 3, 'the Principal sees every engagement');
end;
$$;

-- REQUIREMENT 8/9: the manager sees engagements only for projects they reach,
-- and the unreachable project's engagement is invisible — not zeroed, not
-- partially masked, simply absent.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f2', true);
do $$
declare visible integer; leaked integer;
begin
  select count(*) into visible from public.people_engagements;
  perform pg_temp.assert_true(visible = 2, 'the manager sees only engagements on projects they reach');

  select count(*) into leaked from public.people_engagements
  where project_id = '10000000-0000-0000-0000-0000000000a2';
  perform pg_temp.assert_true(leaked = 0, 'no engagement leaks from an unreachable project');
end;
$$;

-- The project helper stays inside the caller's authority, and deliberately
-- INCLUDES archived projects so a person's history keeps naming them. Keeping
-- archived projects out of the "engage" picker is the interface's job.
do $$
declare reachable integer; archived_named integer; unreachable integer;
begin
  select count(*) into reachable from public.people_engagement_projects();
  select count(*) into archived_named from public.people_engagement_projects()
  where id = '10000000-0000-0000-0000-0000000000a3';
  select count(*) into unreachable from public.people_engagement_projects()
  where id = '10000000-0000-0000-0000-0000000000a2';

  perform pg_temp.assert_true(reachable = 3, 'the manager reaches exactly their three projects');
  perform pg_temp.assert_true(archived_named = 1, 'an archived project stays nameable, so history does not degrade');
  perform pg_temp.assert_true(unreachable = 0, 'a project outside the caller''s authority is never returned');
end;
$$;

-- The REGISTER itself is company-wide, so a manager can find somebody before
-- engaging them. This is deliberate and is not a leak: a person record holds no
-- project, no money and no operational state.
do $$
declare visible integer;
begin
  select count(*) into visible from public.people;
  perform pg_temp.assert_true(visible = 3, 'both operational roles read the whole register');
end;
$$;

-- Staff and viewer callers match no policy at all in Stage 5.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f4', true);
do $$
declare people_visible integer; engagements_visible integer;
begin
  select count(*) into people_visible from public.people;
  select count(*) into engagements_visible from public.people_engagements;
  perform pg_temp.assert_true(people_visible = 0, 'staff read no person');
  perform pg_temp.assert_true(engagements_visible = 0, 'staff read no engagement');
end;
$$;

do $$
begin
  insert into public.people (full_name, relationship_type) values ('Staff Invention', 'regular_staff');
  raise exception 'ASSERTION FAILED: staff must not create a person';
exception when insufficient_privilege then null;
end;
$$;

-- =====================================================================
-- 7. History survives closure and deactivation  (requirements 10, 11)
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', true);

-- REQUIREMENT 11: ending an engagement closes it and rewrites nothing.
do $$
declare projects_before integer; projects_after integer; ended public.people_engagements;
begin
  select count(*) into projects_before from public.projects;

  update public.people_engagements
  set end_date = date '2026-07-31', end_reason = 'Site works completed'
  where project_id = '10000000-0000-0000-0000-0000000000a1'
    and end_date is null
  returning * into ended;

  perform pg_temp.assert_true(ended.end_date = date '2026-07-31', 'an engagement can be closed');
  perform pg_temp.assert_true(
    ended.start_date = date '2026-06-01',
    'closing an engagement does not rewrite when it started'
  );

  select count(*) into projects_after from public.projects;
  perform pg_temp.assert_true(projects_before = projects_after, 'closing an engagement touches no project record');
end;
$$;

-- A closed engagement stays readable, and the same person may be engaged on
-- that project again — history does not block the future.
do $$
declare closed integer;
begin
  select count(*) into closed from public.people_engagements
  where project_id = '10000000-0000-0000-0000-0000000000a1' and end_date is not null;
  perform pg_temp.assert_true(closed = 1, 'a closed engagement remains readable');

  insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
  select id, '10000000-0000-0000-0000-0000000000a1', 'team_leader', date '2026-09-01'
  from public.people where full_name = 'Lincoln Waweru';
end;
$$;

-- REQUIREMENT 10: deactivating a person keeps every engagement readable.
do $$
declare still_readable integer;
begin
  update public.people set is_active = false where full_name = 'Lincoln Waweru';

  select count(*) into still_readable from public.people_engagements pe
  join public.people p on p.id = pe.person_id
  where p.full_name = 'Lincoln Waweru';
  perform pg_temp.assert_true(
    still_readable = 3,
    'every engagement of a deactivated person stays readable'
  );

  perform pg_temp.assert_true(
    exists (select 1 from public.people where full_name = 'Lincoln Waweru' and not is_active),
    'a departed person is deactivated, never deleted'
  );
end;
$$;

-- An inactive person cannot pick up NEW work, while their history is intact.
do $$
begin
  insert into public.people_engagements (person_id, project_id, engagement_role, start_date)
  select id, '10000000-0000-0000-0000-0000000000a2', 'team_leader', date '2026-10-01'
  from public.people where full_name = 'Lincoln Waweru';
  raise exception 'ASSERTION FAILED: an inactive person must not be newly engaged';
exception when invalid_parameter_value then null;
end;
$$;

-- A person referenced by an engagement can never be erased, even by a caller
-- that bypasses row level security, so no historical record is left dangling.
reset role;
do $$
begin
  delete from public.people where full_name = 'Lincoln Waweru';
  raise exception 'ASSERTION FAILED: a person with engagement history must not be deletable';
exception when foreign_key_violation then null;
end;
$$;

rollback;
