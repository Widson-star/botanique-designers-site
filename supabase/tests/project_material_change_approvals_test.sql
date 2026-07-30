\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- =====================================================================
-- Identity spine. Manager (002) is the Martine-equivalent operations manager.
-- =====================================================================
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'manager@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local'),
  ('00000000-0000-0000-0000-000000000006', 'manager2@test.local'),
  ('00000000-0000-0000-0000-000000000007', 'staff2@test.local');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local', 'Widson Ambaisi', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'manager@test.local', 'Martine Lotom', 'manager', true),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local', 'Test Staff', 'staff', true),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local', 'Test Viewer', 'viewer', true),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local', 'Inactive Manager', 'manager', false),
  ('00000000-0000-0000-0000-000000000006', 'manager2@test.local', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000007', 'staff2@test.local', 'Other Staff', 'staff', true);

-- Nine hosted-equivalent projects. Manager (002) leads Alego/Karen/Mununga and
-- three workflow projects, is ASSIGNED to Zaara, and is unrelated to Zizu/Runda.
insert into public.projects (
  id, project_name, client_site_name, location, county, project_type, status, stage,
  lead_person_id, start_date, actual_start_date, target_completion_date,
  archived, portfolio_eligible, portfolio_permission_status
) values
  ('10000000-0000-0000-0000-000000000001', 'Alego', 'Alego Residence', 'Siaya', 'Siaya', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', '2026-07-02', null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000002', 'Karen', 'Karen Garden', 'Karen', 'Nairobi', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000003', 'Mununga', 'Mununga Estate', 'Mununga', 'Nakuru', 'Estate', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000004', 'Zaara', 'Zaara Court', 'Runda', 'Nairobi', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000001', '2026-07-01', null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000005', 'Zizu', 'Zizu Villa', 'Westlands', 'Nairobi', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000001', '2026-07-01', null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000006', 'Runda', 'Runda Home', 'Runda', 'Nairobi', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000001', '2026-07-01', null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000007', 'ActivationProj', null, null, null, 'Residential', 'Pending', 'Inquiry', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000008', 'CompletionProj', null, null, null, 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', '2026-07-02', '2026-08-31', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000009', 'StaleProj', null, 'Old Location', 'Old County', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, false, false, 'Not Reviewed');

-- Manager (002) has an active assignment to Zaara (10...04).
insert into public.project_assignments (project_id, user_id, assignment_role, is_active) values
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', 'Operations', true);

set local role authenticated;

-- =====================================================================
-- A. Manager project VISIBILITY scoping (RLS SELECT).
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select count(*) = 9 from public.projects), 'owner sees all nine projects');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
-- Manager sees Alego, Karen, Mununga, Zaara (assigned), and three workflow
-- projects they lead = 7; never Zizu or Runda.
select pg_temp.assert_true((select count(*) = 7 from public.projects), 'manager sees only led/assigned projects');
select pg_temp.assert_true(
  (select bool_and(project_name in ('Alego', 'Karen', 'Mununga')) from (
     select project_name from public.projects where project_name in ('Alego', 'Karen', 'Mununga')
   ) s) and (select count(*) = 3 from public.projects where project_name in ('Alego', 'Karen', 'Mununga')),
  'manager selector retains Alego, Karen and Mununga'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.projects where project_name in ('Zizu', 'Runda')),
  'manager cannot see unrelated projects (no cross-project leakage)'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
select pg_temp.assert_true((select count(*) = 0 from public.projects), 'unrelated manager2 sees no projects');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.projects), 'unassigned staff sees no projects');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.projects), 'viewer sees no projects');

-- =====================================================================
-- B. Manager direct-write matrix (material blocked, low-risk permitted).
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$
declare
  history_before integer;
  history_after integer;
begin
  -- Every material field is blocked directly on an authorised (led) project.
  begin update public.projects set project_name = 'Alego Renamed' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed project_name directly'; exception when check_violation then null; end;
  begin update public.projects set client_site_name = 'X' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed client_site_name directly'; exception when check_violation then null; end;
  begin update public.projects set location = 'Nairobi' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed location directly'; exception when check_violation then null; end;
  begin update public.projects set county = 'Nairobi' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed county directly'; exception when check_violation then null; end;
  begin update public.projects set project_type = 'Commercial' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed project_type directly'; exception when check_violation then null; end;
  begin update public.projects set stage = 'Detailed Design' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed stage directly'; exception when check_violation then null; end;
  begin update public.projects set lead_person_id = '00000000-0000-0000-0000-000000000003' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed lead directly'; exception when check_violation then null; end;
  begin update public.projects set start_date = '2026-06-01' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed start_date directly'; exception when check_violation then null; end;
  begin update public.projects set actual_start_date = '2026-06-05' where id = '10000000-0000-0000-0000-000000000001';
    raise exception 'manager changed actual_start_date directly'; exception when check_violation then null; end;

  -- Low-risk fields remain a direct, audited manager write on an authorised project.
  history_before := (select count(*) from public.project_activities where project_id = '10000000-0000-0000-0000-000000000001');
  update public.projects
  set next_action = 'Confirm mobilisation', next_action_date = '2026-08-01',
      blocker = 'Awaiting client sign-off', notes = 'Weekly review scheduled'
  where id = '10000000-0000-0000-0000-000000000001';
  update public.projects set status = 'Paused' where id = '10000000-0000-0000-0000-000000000001';
  history_after := (select count(*) from public.project_activities where project_id = '10000000-0000-0000-0000-000000000001');
  perform pg_temp.assert_true(history_after > history_before, 'low-risk direct update records project history');
  perform pg_temp.assert_true(
    (select next_action = 'Confirm mobilisation' and status = 'Paused'
     from public.projects where id = '10000000-0000-0000-0000-000000000001'),
    'low-risk direct manager updates apply'
  );
  perform pg_temp.assert_true(
    (select actor_id = auth.uid() from public.project_activities
     where project_id = '10000000-0000-0000-0000-000000000001'
       and new_values->>'next_action' = 'Confirm mobilisation' limit 1),
    'project history records the exact acting manager'
  );
  -- Restore Alego to Ongoing for later scenarios.
  update public.projects set status = 'Ongoing' where id = '10000000-0000-0000-0000-000000000001';

  -- Manager cannot update an UNRELATED project (RLS filters it: zero rows, no change).
  update public.projects set next_action = 'Should not apply' where id = '10000000-0000-0000-0000-000000000005';
  perform pg_temp.assert_true(
    (select next_action is null from public.projects where id = '10000000-0000-0000-0000-000000000005') is not false,
    'manager update of an unrelated project changes nothing'
  );

  -- Manager cannot DIRECTLY create a live project (owner-only INSERT policy).
  begin
    insert into public.projects (project_name, project_type, status, stage, portfolio_permission_status)
    values ('Manager Direct', 'Residential', 'Pending', 'Inquiry', 'Not Reviewed');
    raise exception 'manager created a live project directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- The unrelated project was never mutated (confirmed under the owner's full view).
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true(
  (select next_action is null from public.projects where id = '10000000-0000-0000-0000-000000000005'),
  'unrelated project remains untouched by manager attempt'
);
select pg_temp.assert_true(
  (select count(*) = 9 from public.projects),
  'no live project was created by the manager'
);

-- =====================================================================
-- C. project_material_change: submit / authority / no-mutation / approve.
-- =====================================================================
do $$
declare
  request public.approval_requests;
  original_location text;
begin
  original_location := (select location from public.projects where id = '10000000-0000-0000-0000-000000000001');

  -- Manager submits a valid multi-field material change on an authorised project.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000001',
    'project_material_change',
    '{"location":"Karen","county":"Nairobi"}',
    'Client corrected the registered site address.'
  );
  perform pg_temp.assert_true(request.state = 'awaiting_review', 'material change queues for review');
  perform pg_temp.assert_true(request.approval_type = 'project_material_change', 'material change type recorded');
  perform pg_temp.assert_true(request.requester_id = auth.uid(), 'requester derived from auth');
  perform pg_temp.assert_true(
    request.original_values = jsonb_build_object('location', original_location, 'county', 'Siaya'),
    'authoritative original snapshot captured for the changed fields'
  );
  -- The project itself is NOT mutated by submission.
  perform pg_temp.assert_true(
    (select location = original_location and county = 'Siaya' from public.projects where id = '10000000-0000-0000-0000-000000000001'),
    'submission does not mutate the project'
  );

  -- Duplicate active material change on the same project is rejected.
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000001', 'project_material_change',
      '{"location":"Kilimani"}', 'Duplicate'
    );
    raise exception 'duplicate material change unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  -- A field outside the allowlist is rejected.
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000002', 'project_material_change',
      '{"status":"Completed"}', 'Not allowlisted'
    );
    raise exception 'non-allowlisted field unexpectedly succeeded';
  exception when check_violation then null;
  end;
  -- A terminal stage is rejected (governed by the dedicated lifecycle types).
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000002', 'project_material_change',
      '{"stage":"Completed"}', 'Terminal stage'
    );
    raise exception 'terminal stage material change unexpectedly succeeded';
  exception when check_violation then null;
  end;
  -- A lead proposal to a non-existent/invalid profile is rejected.
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000002', 'project_material_change',
      '{"lead_person_id":"00000000-0000-0000-0000-000000000004"}', 'Viewer lead'
    );
    raise exception 'invalid lead proposal unexpectedly succeeded';
  exception when check_violation then null;
  end;

  -- Manager cannot propose on an UNRELATED project, nor can an unrelated manager.
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000005', 'project_material_change',
      '{"location":"Nowhere"}', 'Unrelated project'
    );
    raise exception 'material change on unrelated project unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000001', 'project_material_change',
      '{"location":"Elsewhere"}', 'Other manager'
    );
    raise exception 'unauthorised manager material change unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  -- Manager cannot decide (no self-approval by the submitting role).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  begin
    perform public.decide_project_approval(request.id, 'approved', null);
    raise exception 'manager decided a material change';
  exception when insufficient_privilege then null;
  end;

  -- Owner approves: change applied atomically + project history + approval ledger.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', 'Confirmed with client.');
  perform pg_temp.assert_true(request.state = 'approved', 'material change becomes approved');
  perform pg_temp.assert_true(
    (select location = 'Karen' and county = 'Nairobi' from public.projects where id = '10000000-0000-0000-0000-000000000001'),
    'approved material change applied atomically'
  );
  perform pg_temp.assert_true(
    exists (
      select 1 from public.project_activities
      where project_id = '10000000-0000-0000-0000-000000000001'
        and new_values->>'location' = 'Karen'
    ),
    'project history records the approval-applied change'
  );
  perform pg_temp.assert_true(
    exists (
      select 1 from public.approval_events
      where approval_request_id = request.id and event_type = 'project_change_applied'
    ),
    'approval ledger records the applied material change'
  );
end;
$$;

-- =====================================================================
-- D. Accountable-lead proposal: manager proposes self, gains no access early.
-- =====================================================================
do $$
declare
  request public.approval_requests;
begin
  -- Zaara (10...04) is led by the owner; manager (002) is assigned. Manager
  -- proposes himself as lead. The live lead must NOT change on submission.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000004', 'project_material_change',
    '{"lead_person_id":"00000000-0000-0000-0000-000000000002"}',
    'Taking accountable ownership of Zaara.'
  );
  perform pg_temp.assert_true(
    (select lead_person_id = '00000000-0000-0000-0000-000000000001' from public.projects where id = '10000000-0000-0000-0000-000000000004'),
    'proposing self as lead does not change the live lead (no early access)'
  );

  -- Owner approves; the lead recalculates atomically.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select lead_person_id = '00000000-0000-0000-0000-000000000002' from public.projects where id = '10000000-0000-0000-0000-000000000004'),
    'approved lead change applies atomically'
  );
end;
$$;

-- =====================================================================
-- E. Stale guard, owner direct edit invalidation, amendment, rejection, withdrawal.
-- =====================================================================
do $$
declare
  request public.approval_requests;
begin
  -- Stale: owner edits the same field directly after a proposal is queued.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000009', 'project_material_change',
    '{"location":"New Location"}', 'Correcting the site location.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  update public.projects set location = 'Owner Direct Location' where id = '10000000-0000-0000-0000-000000000009';
  begin
    perform public.decide_project_approval(request.id, 'approved', null);
    raise exception 'stale material change unexpectedly approved';
  exception when serialization_failure then null;
  end;
  perform pg_temp.assert_true(
    (select state = 'awaiting_review' from public.approval_requests where id = request.id),
    'stale decision leaves request awaiting review'
  );
  perform pg_temp.assert_true(
    (select location = 'Owner Direct Location' from public.projects where id = '10000000-0000-0000-0000-000000000009'),
    'stale decision preserves the newer owner value'
  );
  -- The owner may reject the now-stale request without mutating the project.
  request := public.decide_project_approval(request.id, 'rejected', 'Superseded by direct edit.');
  perform pg_temp.assert_true(request.state = 'rejected', 'owner can reject a stale request');
  perform pg_temp.assert_true(
    (select location = 'Owner Direct Location' from public.projects where id = '10000000-0000-0000-0000-000000000009'),
    'rejection does not mutate the project'
  );

  -- Amendment round-trip on Karen (10...02).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000002', 'project_material_change',
    '{"project_name":"Karen Phase 1"}', 'Rename to reflect phasing.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.request_approval_amendment(request.id, 'Use the client-approved name.');
  perform pg_temp.assert_true(request.state = 'amendment_requested', 'owner requests amendment');
  perform pg_temp.assert_true(
    (select project_name = 'Karen' from public.projects where id = '10000000-0000-0000-0000-000000000002'),
    'amendment request does not mutate the project'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.amend_and_resubmit_approval(
    request.id, '{"project_name":"Karen Gardens Phase 1"}', 'Client-approved name.', null
  );
  perform pg_temp.assert_true(request.request_round = 2 and request.state = 'awaiting_review', 'amendment increments round and requeues');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select project_name = 'Karen Gardens Phase 1' from public.projects where id = '10000000-0000-0000-0000-000000000002'),
    'approved amended proposal applies the revised value'
  );

  -- Withdrawal on Mununga (10...03).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000003', 'project_material_change',
    '{"project_type":"Commercial"}', 'Reclassify project type.'
  );
  request := public.withdraw_approval_request(request.id, 'No longer required.');
  perform pg_temp.assert_true(request.state = 'withdrawn', 'requester can withdraw a material change');
  perform pg_temp.assert_true(
    (select project_type = 'Estate' from public.projects where id = '10000000-0000-0000-0000-000000000003'),
    'withdrawal does not mutate the project'
  );
end;
$$;

-- =====================================================================
-- F. Restricted project intake (separate from live projects).
-- =====================================================================
do $$
declare
  intake public.project_intake_requests;
  projects_before integer;
begin
  -- Count projects under the OWNER's full view so before/after are comparable.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  projects_before := (select count(*) from public.projects);

  -- Manager submits an intake proposal; NO live project row is created.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  intake := public.submit_project_intake(
    '{"project_name":"Nyali Coastal Garden","project_type":"Hospitality","location":"Nyali","county":"Mombasa","start_date":"2026-09-01"}',
    'New enquiry qualified and ready to open as a project.'
  );
  perform pg_temp.assert_true(intake.state = 'awaiting_review', 'intake queues for review');
  perform pg_temp.assert_true(intake.created_project_id is null, 'no project created on submission');
  -- Confirm under the owner's full view that no live project appeared.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform pg_temp.assert_true(
    (select count(*) = projects_before from public.projects),
    'intake does not enter the projects table'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  -- Duplicate active intake (same requester + name) is rejected.
  begin
    perform public.submit_project_intake(
      '{"project_name":"Nyali Coastal Garden","project_type":"Residential"}', 'Duplicate'
    );
    raise exception 'duplicate intake unexpectedly succeeded';
  exception when unique_violation then null;
  end;
  -- Missing/invalid required fields rejected.
  begin
    perform public.submit_project_intake('{"project_type":"Residential"}', 'No name');
    raise exception 'intake without project_name unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    perform public.submit_project_intake(
      '{"project_name":"Bad Type","project_type":"Nonsense"}', 'Bad type'
    );
    raise exception 'intake with bad project_type unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    perform public.submit_project_intake(
      '{"project_name":"Extra","project_type":"Residential","status":"Ongoing"}', 'Extra field'
    );
    raise exception 'intake with non-allowlisted field unexpectedly succeeded';
  exception when check_violation then null;
  end;

  -- Manager cannot decide an intake.
  begin
    perform public.decide_project_intake(intake.id, 'approved', null);
    raise exception 'manager decided an intake';
  exception when insufficient_privilege then null;
  end;

  -- Owner approves: a live project is atomically created and linked.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  intake := public.decide_project_intake(intake.id, 'approved', 'Approved to open.');
  perform pg_temp.assert_true(intake.state = 'approved', 'intake becomes approved');
  perform pg_temp.assert_true(intake.created_project_id is not null, 'approval records the created project id');
  perform pg_temp.assert_true(
    (select count(*) = projects_before + 1 from public.projects),
    'approved intake atomically creates one live project'
  );
  perform pg_temp.assert_true(
    (select project_name = 'Nyali Coastal Garden' and status = 'Pending' and stage = 'Inquiry'
       and lead_person_id is null and portfolio_permission_status = 'Not Reviewed'
     from public.projects where id = intake.created_project_id),
    'created project uses the safe intake defaults with no lead'
  );
  perform pg_temp.assert_true(
    exists (select 1 from public.project_intake_events where intake_request_id = intake.id and event_type = 'project_created'),
    'intake ledger records project creation'
  );
end;
$$;

-- Intake rejection + withdrawal leave no live project.
do $$
declare
  intake public.project_intake_requests;
  projects_before integer;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  projects_before := (select count(*) from public.projects);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  intake := public.submit_project_intake(
    '{"project_name":"Rejected Enquiry","project_type":"Residential"}', 'Speculative.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  intake := public.decide_project_intake(intake.id, 'rejected', 'Not viable.');
  perform pg_temp.assert_true(intake.state = 'rejected' and intake.created_project_id is null, 'rejected intake creates no project');

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  intake := public.submit_project_intake(
    '{"project_name":"Withdrawn Enquiry","project_type":"Residential"}', 'Speculative.'
  );
  intake := public.withdraw_project_intake(intake.id, 'Client went quiet.');
  perform pg_temp.assert_true(intake.state = 'withdrawn', 'requester can withdraw an intake');
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform pg_temp.assert_true(
    (select count(*) = projects_before from public.projects),
    'rejected/withdrawn intakes create no live project'
  );
end;
$$;

-- Intake visibility: owner sees all; requester sees own; others see none.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select count(*) >= 3 from public.project_intake_requests), 'owner sees all intakes');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true((select count(*) >= 3 from public.project_intake_requests), 'requester sees own intakes');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
select pg_temp.assert_true((select count(*) = 0 from public.project_intake_requests), 'other manager sees no intakes');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.project_intake_requests), 'staff sees no intakes');

-- =====================================================================
-- G. Existing six lifecycle approval types still work under this migration.
-- =====================================================================
do $$
declare
  request public.approval_requests;
begin
  -- Activation (10...07 Pending, led by manager).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000007', 'project_activation', '{"status":"Ongoing"}', 'Mobilised.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select status = 'Ongoing' from public.projects where id = '10000000-0000-0000-0000-000000000007'),
    'activation lifecycle type still applies'
  );

  -- Completion (10...08).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000008', 'project_completion',
    '{"status":"Completed","actual_completion_date":"2026-07-29"}', 'Works complete.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select status = 'Completed' and actual_completion_date = '2026-07-29' from public.projects where id = '10000000-0000-0000-0000-000000000008'),
    'completion lifecycle type still applies atomically'
  );
end;
$$;

-- =====================================================================
-- H. Approvals counts/filters + Daily Site RLS remain correct.
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true(
  (select count(*) > 0 from public.approval_requests where approval_type = 'project_material_change'),
  'material change requests are queryable and filterable by type'
);
select pg_temp.assert_true(
  (select count(distinct approval_type) >= 3 from public.approval_requests),
  'multiple approval types coexist in the ledger'
);
-- Daily Site authority helper is untouched and still scopes the manager selector.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true(
  (select bool_and(project_name in ('Alego', 'Karen Gardens Phase 1', 'Mununga', 'Zaara', 'ActivationProj', 'CompletionProj', 'StaleProj'))
   from public.daily_site_authorised_projects()),
  'daily site selector still returns only the manager-authorised projects'
);
select pg_temp.assert_true(
  (select count(*) = 0 from public.daily_site_authorised_projects() where project_name in ('Zizu', 'Runda')),
  'daily site selector excludes unrelated projects'
);

-- Anonymous cannot read the new intake tables or execute the workflow functions.
reset role;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.project_intake_requests;
    raise exception 'anonymous read of intakes unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_project_intake('{"project_name":"X","project_type":"Residential"}', 'Anon');
    raise exception 'anonymous intake RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
\echo 'Project material change approvals database matrix passed.'
