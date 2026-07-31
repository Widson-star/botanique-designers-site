\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'manager@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local'),
  ('00000000-0000-0000-0000-000000000006', 'manager2@test.local');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local', 'Test Owner', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'manager@test.local', 'Test Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local', 'Test Staff', 'staff', true),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local', 'Test Viewer', 'viewer', true),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local', 'Inactive Manager', 'manager', false),
  ('00000000-0000-0000-0000-000000000006', 'manager2@test.local', 'Other Manager', 'manager', true);

insert into public.projects (
  id, project_name, project_type, status, stage, lead_person_id, start_date, actual_start_date,
  target_completion_date, actual_completion_date, archived,
  portfolio_eligible, portfolio_permission_status
) values
  ('10000000-0000-0000-0000-000000000001', 'PR44 DB Test — Activation', 'Residential', 'Pending', 'Inquiry', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000002', 'PR44 DB Test — Completion', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', '2026-07-02', '2026-08-31', null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000003', 'PR44 DB Test — Cancellation', 'Residential', 'Paused', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000004', 'PR44 DB Test — Archive', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000005', 'PR44 DB Test — Restore', 'Residential', 'Completed', 'Completed', '00000000-0000-0000-0000-000000000002', '2026-07-01', '2026-07-01', '2026-07-20', '2026-07-20', true, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000006', 'PR44 DB Test — Target date', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, '2026-08-01', null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000007', 'PR44 DB Test — Reject', 'Residential', 'Pending', 'Inquiry', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000008', 'PR44 DB Test — Amend', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, '2026-08-01', null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000009', 'PR44 DB Test — Withdraw', 'Residential', 'Ongoing', 'Implementation', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, null, false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000010', 'PR44 DB Test — Stale', 'Residential', 'Pending', 'Inquiry', '00000000-0000-0000-0000-000000000002', '2026-07-01', null, null, null, false, false, 'Not Reviewed');

set local role authenticated;

do $$
declare
  request public.approval_requests;
  prior_event_count integer;
begin
  -- Manager submission succeeds and derives the requester.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000001',
    'project_activation',
    '{"status":"Ongoing"}',
    'Mobilisation is confirmed.'
  );
  perform pg_temp.assert_true(request.state = 'awaiting_review', 'submission queues for review');
  perform pg_temp.assert_true(request.requester_id = auth.uid(), 'requester is derived from auth');
  perform pg_temp.assert_true(request.original_values = '{"status":"Pending"}', 'authoritative original captured');
  perform pg_temp.assert_true(
    (select count(*) = 2 from public.approval_events where approval_request_id = request.id),
    'submission and queue events are written'
  );
  perform pg_temp.assert_true(
    (
      select count(*) = 1
      from public.approval_events
      where approval_request_id = request.id
        and event_type = 'submitted'
        and from_state is null
        and to_state = 'submitted'
    ),
    'submission records the initial submitted event'
  );
  perform pg_temp.assert_true(
    (
      select count(*) = 1
      from public.approval_events
      where approval_request_id = request.id
        and event_type = 'queued_for_review'
        and from_state = 'submitted'
        and to_state = 'awaiting_review'
    ),
    'submission records the queued_for_review transition'
  );
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.approval_events
      where approval_request_id = request.id and event_type = 'review_started'
    ),
    'submission does not record review_started'
  );
  perform pg_temp.assert_true(
    (
      select actor_id = request.requester_id
      from public.approval_events
      where approval_request_id = request.id and event_type = 'queued_for_review'
    ),
    'queued_for_review actor is the requester'
  );
  perform pg_temp.assert_true(
    request.reviewed_at is null,
    'submission does not mark the request reviewed'
  );

  -- Duplicate active request is rejected.
  begin
    perform public.submit_project_approval(
      request.project_id, request.approval_type, '{"status":"Ongoing"}', 'Duplicate'
    );
    raise exception 'duplicate request unexpectedly succeeded';
  exception when unique_violation then null;
  end;

  -- Malformed, extra-key, identical and invalid-type submissions are rejected.
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000006',
      'project_target_completion_change',
      '{"target_completion_date":"2026-09-01","stage":"Completed"}',
      'Extra key'
    );
    raise exception 'extra key unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000006',
      'project_target_completion_change',
      '{"target_completion_date":"2026-08-01"}',
      'Identical'
    );
    raise exception 'identical proposal unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000006',
      'not_a_type',
      '{}',
      'Invalid'
    );
    raise exception 'invalid type unexpectedly succeeded';
  exception when check_violation then null;
  end;
  begin
    perform public.submit_project_approval(
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      'project_archive',
      '{"archived":true}',
      'Missing project'
    );
    raise exception 'invalid project unexpectedly succeeded';
  exception when no_data_found then null;
  end;

  -- Staff, viewer and inactive profiles cannot submit.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000006',
      'project_target_completion_change',
      '{"target_completion_date":"2026-09-01"}',
      'Staff attempt'
    );
    raise exception 'staff submission unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000006',
      'project_target_completion_change',
      '{"target_completion_date":"2026-09-01"}',
      'Viewer attempt'
    );
    raise exception 'viewer submission unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000006',
      'project_target_completion_change',
      '{"target_completion_date":"2026-09-01"}',
      'Inactive attempt'
    );
    raise exception 'inactive submission unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;

  -- Manager cannot decide; owner approval applies project change atomically.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  begin
    perform public.decide_project_approval(request.id, 'approved', null);
    raise exception 'manager decision unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', 'Approved.');
  perform pg_temp.assert_true(request.state = 'approved', 'request becomes approved');
  perform pg_temp.assert_true(
    request.reviewed_at is not null and request.decided_at is not null,
    'approval records review and decision timestamps'
  );
  perform pg_temp.assert_true(
    (select status = 'Ongoing' from public.projects where id = request.project_id),
    'approved change is applied'
  );
  perform pg_temp.assert_true(
    exists (
      select 1 from public.project_activities
      where project_id = request.project_id and new_values->>'status' = 'Ongoing'
    ),
    'existing project history records the mutation'
  );
  perform pg_temp.assert_true(
    exists (
      select 1 from public.approval_events
      where approval_request_id = request.id and event_type = 'project_change_applied'
    ),
    'approval ledger records application'
  );
  begin
    perform public.decide_project_approval(request.id, 'rejected', null);
    raise exception 'terminal request decided twice';
  exception when check_violation then null;
  end;

  -- Owner submission and rejection.
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000007',
    'project_activation',
    '{"status":"Ongoing"}',
    'Owner-originated request.'
  );
  request := public.decide_project_approval(request.id, 'rejected', 'Not ready.');
  perform pg_temp.assert_true(request.state = 'rejected', 'owner can reject');
  perform pg_temp.assert_true(
    request.reviewed_at is not null and request.decided_at is not null,
    'rejection records review and decision timestamps'
  );
  perform pg_temp.assert_true(
    (select status = 'Pending' from public.projects where id = request.project_id),
    'rejection does not mutate project'
  );

  -- Amendment/resubmission increments round and preserves old events.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000008',
    'project_target_completion_change',
    '{"target_completion_date":"2026-09-01"}',
    'Original schedule reason.'
  );
  prior_event_count := (select count(*) from public.approval_events where approval_request_id = request.id);
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.request_approval_amendment(request.id, 'Use the confirmed client date.');
  perform pg_temp.assert_true(request.state = 'amendment_requested', 'owner requests amendment');
  perform pg_temp.assert_true(
    request.reviewed_at is not null and request.decided_at is null,
    'amendment request records review without a terminal decision'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  begin
    perform public.amend_and_resubmit_approval(
      request.id, '{"target_completion_date":"2026-09-15"}', 'Other manager', null
    );
    raise exception 'unrelated manager amended request';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.amend_and_resubmit_approval(
    request.id, '{"target_completion_date":"2026-09-15"}',
    'Confirmed revised client date.', 'Client confirmation recorded.'
  );
  perform pg_temp.assert_true(request.request_round = 2, 'amendment increments round');
  perform pg_temp.assert_true(request.state = 'awaiting_review', 'resubmission returns to review');
  perform pg_temp.assert_true(
    (select count(*) > prior_event_count from public.approval_events where approval_request_id = request.id),
    'prior events remain and new events append'
  );

  -- Eligible withdrawal, unrelated withdrawal and terminal withdrawal rules.
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000009',
    'project_archive',
    '{"archived":true}',
    'Archive after handover.'
  );
  perform pg_temp.assert_true(
    request.reviewed_at is null,
    'withdrawal candidate has no substantive owner review'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  begin
    perform public.withdraw_approval_request(request.id, null);
    raise exception 'unrelated manager withdrew request';
  exception when insufficient_privilege then null;
  end;
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.withdraw_approval_request(request.id, 'No longer required.');
  perform pg_temp.assert_true(request.state = 'withdrawn', 'requester can withdraw');
  begin
    perform public.withdraw_approval_request(request.id, null);
    raise exception 'terminal withdrawal unexpectedly succeeded';
  exception when check_violation then null;
  end;

  -- Stale project values block approval without approving or applying.
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000010',
    'project_activation',
    '{"status":"Ongoing"}',
    'Ready to activate.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  update public.projects set status = 'Cancelled' where id = request.project_id;
  begin
    perform public.decide_project_approval(request.id, 'approved', null);
    raise exception 'stale approval unexpectedly succeeded';
  exception when serialization_failure then null;
  end;
  perform pg_temp.assert_true(
    (select state = 'awaiting_review' from public.approval_requests where id = request.id),
    'failed stale decision leaves request awaiting review'
  );
  perform pg_temp.assert_true(
    (select status = 'Cancelled' from public.projects where id = request.project_id),
    'failed stale decision leaves newer project state intact'
  );

  -- All remaining first-slice types submit with exact reviewed payloads.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000002',
    'project_completion',
    '{"status":"Completed","actual_completion_date":"2026-07-28"}',
    'Works complete.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select status = 'Completed' and actual_completion_date = '2026-07-28'
     from public.projects where id = request.project_id),
    'completion approval applies status and actual date atomically'
  );

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000003',
    'project_cancellation',
    '{"status":"Cancelled"}',
    'Client cancelled.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select status = 'Cancelled' from public.projects where id = request.project_id),
    'cancellation approval applies only cancellation'
  );

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000004',
    'project_archive',
    '{"archived":true}',
    'Ready for archive.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select archived is true from public.projects where id = request.project_id),
    'archive approval applies archive flag'
  );

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000005',
    'project_restore',
    '{"archived":false}',
    'Work has resumed.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select archived is false and status = 'Completed' and stage = 'Completed'
     from public.projects where id = request.project_id),
    'restore approval changes only archive state and preserves project semantics'
  );

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  request := public.submit_project_approval(
    '10000000-0000-0000-0000-000000000006',
    'project_target_completion_change',
    '{"target_completion_date":"2026-09-01"}',
    'Revised programme.'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  request := public.decide_project_approval(request.id, 'approved', null);
  perform pg_temp.assert_true(
    (select target_completion_date = '2026-09-01'
     from public.projects where id = request.project_id),
    'target completion approval applies exact reviewed date'
  );
end;
$$;

-- RLS visibility: owner/manager can read; staff/viewer/inactive cannot.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select count(*) > 0 from public.approval_requests), 'owner reads requests');
select pg_temp.assert_true((select count(*) > 0 from public.approval_events), 'owner reads events');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
select pg_temp.assert_true((select count(*) > 0 from public.approval_requests), 'manager reads project approvals');
select pg_temp.assert_true((select count(*) > 0 from public.approval_events), 'manager reads visible events');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.approval_requests), 'staff reads no requests');
select pg_temp.assert_true((select count(*) = 0 from public.approval_events), 'staff reads no events');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.approval_requests), 'viewer reads no requests');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
select pg_temp.assert_true((select count(*) = 0 from public.approval_requests), 'inactive profile reads no requests');

-- Direct writes to both workflow tables remain denied.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
begin
  begin
    update public.approval_requests set state = 'approved';
    raise exception 'direct approval update unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.approval_events (
      approval_request_id, event_type, actor_id, to_state, round_number
    ) select id, 'approved', auth.uid(), 'approved', 1
      from public.approval_requests limit 1;
    raise exception 'direct event insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Final authority regression: every direct manager status transition fails on
-- a manager-led project. Tests assert the persisted fixture state as well as
-- the raised exception so a zero-row RLS update cannot masquerade as a pass.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$
begin
  begin
    update public.projects set status = 'Ongoing'
    where id = '10000000-0000-0000-0000-000000000007';
    raise exception 'manager activated directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set status = 'Completed'
    where id = '10000000-0000-0000-0000-000000000003';
    raise exception 'manager completed directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set status = 'Cancelled'
    where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'manager cancelled directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set archived = true
    where id = '10000000-0000-0000-0000-000000000003';
    raise exception 'manager archived directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set archived = false
    where id = '10000000-0000-0000-0000-000000000004';
    raise exception 'manager restored directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set target_completion_date = '2026-12-01'
    where id = '10000000-0000-0000-0000-000000000006';
    raise exception 'manager changed target date directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set actual_completion_date = '2026-07-28'
    where id = '10000000-0000-0000-0000-000000000008';
    raise exception 'manager changed actual completion directly';
  exception when check_violation then null;
  end;
  perform pg_temp.assert_true(
    (select status = 'Pending' from public.projects
      where id = '10000000-0000-0000-0000-000000000007'),
    'manager direct activation leaves the authorised fixture Pending'
  );
  begin
    update public.projects set portfolio_eligible = true
    where id = '10000000-0000-0000-0000-000000000002';
    raise exception 'manager changed portfolio authority directly';
  exception when check_violation then null;
  end;
  begin
    update public.projects set status = 'Paused'
    where id = '10000000-0000-0000-0000-000000000008';
    raise exception 'manager paused directly';
  exception when check_violation then null;
  end;
  perform pg_temp.assert_true(
    (select status = 'Ongoing' from public.projects where id = '10000000-0000-0000-0000-000000000008'),
    'manager direct pause leaves the authorised fixture Ongoing'
  );
  perform pg_temp.assert_true(
    exists (select 1 from pg_trigger where tgname = 'projects_lead_guard' and not tgisinternal),
    'project lead guard remains attached'
  );
end;
$$;

-- Owner retains the direct alternative and can activate without creating an
-- approval. Restore the throwaway fixture so earlier lifecycle expectations
-- remain deterministic if this section is moved by a future harness refactor.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
update public.projects set status = 'Ongoing'
where id = '10000000-0000-0000-0000-000000000007';
select pg_temp.assert_true(
  (select status = 'Ongoing' from public.projects
    where id = '10000000-0000-0000-0000-000000000007'),
  'owner direct activation succeeds'
);
update public.projects set status = 'Pending'
where id = '10000000-0000-0000-0000-000000000007';

-- Anonymous cannot read or execute workflow functions.
reset role;
set local role anon;
do $$
begin
  begin
    perform count(*) from public.approval_requests;
    raise exception 'anonymous read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.submit_project_approval(
      '10000000-0000-0000-0000-000000000001',
      'project_activation', '{"status":"Ongoing"}', 'Anonymous'
    );
    raise exception 'anonymous RPC unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

reset role;
rollback;
\echo 'Approvals foundation database matrix passed.'
