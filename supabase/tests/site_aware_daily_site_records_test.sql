-- BOTANIQUE DESIGNERS — Site-aware Daily Site Records.
--
-- The Daily Site Record stays the canonical field-execution truth and now
-- belongs to a Site, so maintenance-only work gets the same
-- Plan -> Execute -> Verify -> Close loop with no fabricated Project.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures: one Project-backed Site and one maintenance-only Site.
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000d001', 'principal@dsr.test'),
  ('00000000-0000-0000-0000-00000000d002', 'manager@dsr.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-00000000d001', 'principal@dsr.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-00000000d002', 'manager@dsr.test', 'Operations Manager', 'manager', true);

insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-00000000e001', 'Building Works', 'Delivery Property', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed'),
  ('00000000-0000-0000-0000-00000000e002', 'Other Property Works', 'Unrelated Property', 'Residential', 'Ongoing', 'Implementation', false,
   null, false, 'Not Reviewed');

-- A historical Daily Site Record created BEFORE Site awareness would have been
-- backfilled; here the ordinary path proves the same invariant.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);

-- 18 / 19. Every existing record carries its Project's Site, with audit intact.
do $$
declare entry public.daily_site_entries; project_site uuid;
begin
  entry := public.create_daily_site_entry_draft(
    '00000000-0000-0000-0000-00000000e001', date '2026-08-10', 'working',
    null, null, 4, 'Crew A', 500, null, 'Planting beds', null, null, null, 'none'
  );
  select site_id into project_site from public.projects where id = '00000000-0000-0000-0000-00000000e001';
  perform pg_temp.assert_true(entry.site_id = project_site, '18. record inherits the Project Site');
  perform pg_temp.assert_true(entry.project_id = '00000000-0000-0000-0000-00000000e001', '18. Project context is kept');
  perform pg_temp.assert_true(entry.version = 1, '19. a new record starts at version 1');
  perform pg_temp.assert_true(entry.created_by = '00000000-0000-0000-0000-00000000d001', '19. authorship is the acting Principal');
  perform pg_temp.assert_true(entry.state = 'draft', '20. project-backed creation still works');
end;
$$;

-- ---------------------------------------------------------------------
-- Maintenance-only Site execution (21, 22, 23, 24)
-- ---------------------------------------------------------------------
do $$
declare only_site public.sites; rel public.maintenance_relationships;
begin
  only_site := public.create_maintenance_site('Maintained Grounds', 'Karen', 'Nairobi');
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (only_site.id, null, 'Grounds upkeep', date '2026-08-01', 'weekly')
  returning * into rel;
  perform pg_temp.assert_true(rel.project_id is null, 'fixture: maintenance-only relationship exists');
end;
$$;

-- 21. A maintenance-only Site can carry field execution with NO Project.
do $$
declare entry public.daily_site_entries; only_site uuid;
begin
  select id into only_site from public.sites where site_name = 'Maintained Grounds';
  entry := public.create_daily_site_entry_draft_for_site(
    only_site, null, date '2026-08-12', 'working',
    null, null, 3, 'Maintenance crew', 400, null, 'Weeding and pruning', null, null, null, 'none'
  );
  perform pg_temp.assert_true(entry.site_id = only_site, '21. maintenance-only record belongs to its Site');
  perform pg_temp.assert_true(entry.project_id is null, '21. maintenance-only record needs no Project');
  perform pg_temp.assert_true(entry.state = 'draft', '21. maintenance-only record starts as a draft');
end;
$$;

-- 22. A Site is required.
do $$
begin
  perform public.create_daily_site_entry_draft_for_site(
    null, null, date '2026-08-13', 'working', null, null, 2, 'Crew', 300, null, 'Work', null, null, null, 'none'
  );
  raise exception 'ASSERTION FAILED: 22. a Site must be required';
exception when check_violation then null;
end;
$$;

-- 23 / 24. An optional Project must belong to the same Site.
do $$
declare only_site uuid;
begin
  select id into only_site from public.sites where site_name = 'Maintained Grounds';
  perform public.create_daily_site_entry_draft_for_site(
    only_site, '00000000-0000-0000-0000-00000000e002', date '2026-08-14', 'working',
    null, null, 2, 'Crew', 300, null, 'Work', null, null, null, 'none'
  );
  raise exception 'ASSERTION FAILED: 23/24. a Project from another Site must be refused';
exception when check_violation then null;
end;
$$;

-- 25. The full lifecycle works without a Project.
do $$
declare only_site uuid; entry public.daily_site_entries;
begin
  select id into only_site from public.sites where site_name = 'Maintained Grounds';
  select * into entry from public.daily_site_entries
   where site_id = only_site and work_date = date '2026-08-12';

  entry := public.update_daily_site_entry_draft(
    entry.id, 'working', null, null, 5, 'Maintenance crew', 400, null, 'Weeding, pruning and edging', null, null, null, 'none'
  );
  perform pg_temp.assert_true(entry.expected_worker_count = 5, '25. a project-less draft can be edited');

  entry := public.submit_daily_site_entry(entry.id);
  perform pg_temp.assert_true(entry.state = 'submitted', '25. a project-less record can be submitted');

  entry := public.return_daily_site_entry_for_correction(entry.id, 'Confirm the crew size');
  perform pg_temp.assert_true(entry.state = 'returned_for_correction', '25. a project-less record can be returned');

  entry := public.correct_and_resubmit_daily_site_entry(
    entry.id, 'working', null, null, 4, 'Maintenance crew', 400, null, 'Weeding and pruning', null, null, null, 'none'
  );
  perform pg_temp.assert_true(entry.state = 'resubmitted', '25. a project-less record can be corrected and resubmitted');

  entry := public.accept_daily_site_entry(entry.id, 'Verified against the maintenance visit');
  perform pg_temp.assert_true(entry.state = 'accepted', '25. a project-less record can be accepted');
end;
$$;

-- ---------------------------------------------------------------------
-- Maintenance visit closure (26, 27, 28, 29)
-- ---------------------------------------------------------------------

-- 26. A same-Site Accepted record closes the scheduled visit.
do $$
declare only_site uuid; rel public.maintenance_relationships; visit public.maintenance_visits; entry public.daily_site_entries;
begin
  select id into only_site from public.sites where site_name = 'Maintained Grounds';
  select * into rel from public.maintenance_relationships where site_id = only_site and status <> 'ended';
  select * into entry from public.daily_site_entries where site_id = only_site and state = 'accepted';

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (rel.id, entry.work_date, 'Routine upkeep') returning * into visit;

  visit := public.complete_maintenance_visit_cycle(
    visit.id, visit.version, entry.id, 'completed', 'Grounds maintained as planned', false, null, null, null
  );
  perform pg_temp.assert_true(visit.status = 'completed', '26. a same-Site Accepted record closes the visit');
  perform pg_temp.assert_true(visit.daily_site_entry_id = entry.id, '26. the closing record is recorded on the visit');
end;
$$;

-- 27 / 28 / 29. Wrong Site, wrong date and non-Accepted are all refused.
do $$
declare only_site uuid; rel public.maintenance_relationships; visit public.maintenance_visits;
        foreign_entry public.daily_site_entries; wrong_date_entry public.daily_site_entries;
begin
  select id into only_site from public.sites where site_name = 'Maintained Grounds';
  select * into rel from public.maintenance_relationships where site_id = only_site and status <> 'ended';

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (rel.id, date '2026-08-20', 'Next upkeep') returning * into visit;

  -- 27. a record from a different Site
  select * into foreign_entry from public.daily_site_entries
   where project_id = '00000000-0000-0000-0000-00000000e001';
  begin
    perform public.complete_maintenance_visit_cycle(
      visit.id, visit.version, foreign_entry.id, 'completed', 'Wrong site', false, null, null, null
    );
    raise exception 'ASSERTION FAILED: 27. a different-Site record must not close the visit';
  exception when invalid_parameter_value then null;
  end;

  -- 28 / 29. a same-Site record on the wrong date, still only a draft
  wrong_date_entry := public.create_daily_site_entry_draft_for_site(
    only_site, null, date '2026-08-21', 'working',
    null, null, 2, 'Crew', 400, null, 'Different day', null, null, null, 'none'
  );
  begin
    perform public.complete_maintenance_visit_cycle(
      visit.id, visit.version, wrong_date_entry.id, 'completed', 'Wrong date', false, null, null, null
    );
    raise exception 'ASSERTION FAILED: 28. a wrong-date record must not close the visit';
  exception when invalid_parameter_value then null;
  end;
end;
$$;

-- 30. Project-backed Maintenance still closes exactly as before, and a
-- Project-backed record at the same physical Site remains valid execution truth.
do $$
declare project_site uuid; rel public.maintenance_relationships; visit public.maintenance_visits; entry public.daily_site_entries;
begin
  select site_id into project_site from public.projects where id = '00000000-0000-0000-0000-00000000e001';
  insert into public.maintenance_relationships (site_id, project_id, scope, start_date, frequency)
  values (project_site, '00000000-0000-0000-0000-00000000e001', 'Project-backed upkeep', date '2026-08-01', 'weekly')
  returning * into rel;

  select * into entry from public.daily_site_entries where project_id = '00000000-0000-0000-0000-00000000e001';
  entry := public.submit_daily_site_entry(entry.id);
  entry := public.accept_daily_site_entry(entry.id, 'Verified');

  insert into public.maintenance_visits (maintenance_relationship_id, scheduled_date, purpose)
  values (rel.id, entry.work_date, 'Routine upkeep') returning * into visit;

  visit := public.complete_maintenance_visit_cycle(
    visit.id, visit.version, entry.id, 'completed', 'Closed with the Project-backed record', false, null, null, null
  );
  perform pg_temp.assert_true(visit.status = 'completed', '30. project-backed Maintenance closes unchanged');
end;
$$;

-- ---------------------------------------------------------------------
-- Authority is not widened for Project-backed records
-- ---------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d002', true);
do $$
declare visible integer; only_site uuid;
begin
  -- The Manager leads no Project here, so Project-backed records stay hidden
  -- exactly as they were before Site awareness.
  select count(*) into visible from public.daily_site_entries
   where project_id = '00000000-0000-0000-0000-00000000e001';
  perform pg_temp.assert_true(visible = 0, 'project-backed visibility is unchanged for an unassigned Manager');

  -- Active Maintenance at a Site does authorise that Site's project-less records.
  select id into only_site from public.sites where site_name = 'Maintained Grounds';
  perform pg_temp.assert_true(public.can_manage_daily_site_site(only_site),
    'active Maintenance authorises Site-level field records');
  select count(*) into visible from public.daily_site_entries where site_id = only_site;
  perform pg_temp.assert_true(visible > 0, 'the Operations Manager sees maintenance-only field records');
end;
$$;

rollback;
