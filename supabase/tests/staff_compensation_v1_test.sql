-- Staff Compensation V1 isolated lifecycle and authority matrix.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'owner@staff-comp.test'),
  ('00000000-0000-0000-0000-000000000102', 'manager@staff-comp.test'),
  ('00000000-0000-0000-0000-000000000103', 'staff@staff-comp.test'),
  ('00000000-0000-0000-0000-000000000104', 'viewer@staff-comp.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000101', 'owner@staff-comp.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-000000000102', 'manager@staff-comp.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000103', 'staff@staff-comp.test', 'Regular Staff', 'staff', true),
  ('00000000-0000-0000-0000-000000000104', 'viewer@staff-comp.test', 'Viewer', 'viewer', true);

-- Canonical People are beneficiaries. One is the Principal, proving beneficiary
-- identity is independent from the actor who creates or decides the record.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

insert into public.people (
  id, full_name, relationship_type, is_active, profile_id
) values
  ('20000000-0000-0000-0000-000000000101', 'Principal Person', 'principal', true, '00000000-0000-0000-0000-000000000101'),
  ('20000000-0000-0000-0000-000000000102', 'Operations Manager Person', 'operations_manager', true, '00000000-0000-0000-0000-000000000102'),
  ('20000000-0000-0000-0000-000000000103', 'Former Staff Person', 'regular_staff', true, '00000000-0000-0000-0000-000000000103');

reset role;
update public.people
set is_active = false
where id = '20000000-0000-0000-0000-000000000103';

insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  portfolio_eligible, portfolio_permission_status
) values
  ('30000000-0000-0000-0000-000000000101', 'Completed Context', 'Residential', 'Completed', 'Completed', false, false, 'Not Reviewed'),
  ('30000000-0000-0000-0000-000000000102', 'Archived Context', 'Residential', 'Completed', 'Archived', true, false, 'Not Reviewed');

select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.staff_compensations'::regclass),
  'Staff Compensation RLS enabled'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.staff_compensations', 'INSERT'),
  'authenticated has no direct Staff Compensation INSERT'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.staff_compensations', 'UPDATE'),
  'authenticated has no direct Staff Compensation UPDATE'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.staff_compensation_events', 'DELETE'),
  'authenticated has no event DELETE'
);
select pg_temp.assert_true(
  (select proconfig @> array['search_path=pg_catalog, public']
   from pg_proc where oid = 'public.submit_staff_compensation(uuid,integer)'::regprocedure),
  'mutation has fixed search path'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);

-- Manager may create compensation for the Principal, with a Completed Project
-- as optional context. The Project remains Completed throughout the workflow.
do $$
declare record public.staff_compensations;
begin
  record := public.create_staff_compensation_draft(
    '20000000-0000-0000-0000-000000000101',
    '30000000-0000-0000-0000-000000000101',
    current_date,
    'compensation',
    'Principal compensation test',
    25000
  );
  perform pg_temp.assert_true(record.lifecycle = 'draft', 'manager creates Staff Compensation draft');
  perform pg_temp.assert_true(record.person_id = '20000000-0000-0000-0000-000000000101', 'beneficiary is canonical Person');
  perform pg_temp.assert_true(record.project_id = '30000000-0000-0000-0000-000000000101', 'Completed Project is retained only as context');
  perform pg_temp.assert_true(record.requester_id = auth.uid(), 'requester actor is stamped independently');
  perform pg_temp.assert_true((select status = 'Completed' from public.projects where id = record.project_id), 'creating compensation does not reopen Project');
  perform pg_temp.assert_true((select count(*) = 1 from public.staff_compensation_events where compensation_id = record.id and event_type = 'created'), 'created event appended');

  record := public.submit_staff_compensation(record.id, record.version);
  perform pg_temp.assert_true(record.lifecycle = 'awaiting_review' and record.request_round = 1, 'manager submits round one');
  perform pg_temp.assert_true((select status = 'Completed' from public.projects where id = record.project_id), 'submitting compensation does not reopen Project');
  perform set_config('test.staff_comp.principal_record', record.id::text, true);
end;
$$;

-- Manager cannot decide.
do $$ begin
  perform public.decide_staff_compensation(
    current_setting('test.staff_comp.principal_record')::uuid,
    2,
    'approved',
    null
  );
  raise exception 'expected manager-decision rejection';
exception when insufficient_privilege then null;
end; $$;

-- Optional project works, and an inactive/former Person remains a legitimate
-- beneficiary for an unsettled historical obligation.
do $$
declare record public.staff_compensations;
begin
  record := public.create_staff_compensation_draft(
    '20000000-0000-0000-0000-000000000103',
    null,
    current_date,
    'allowance',
    'Former staff allowance due',
    5000
  );
  perform pg_temp.assert_true(record.project_id is null, 'Project context is optional');
  perform pg_temp.assert_true(record.person_id = '20000000-0000-0000-0000-000000000103', 'inactive former Person remains a valid beneficiary');
end;
$$;

-- Archived Project context is also permitted: the record is financial truth,
-- not a Project lifecycle action.
do $$
declare record public.staff_compensations;
begin
  record := public.create_staff_compensation_draft(
    '20000000-0000-0000-0000-000000000102',
    '30000000-0000-0000-0000-000000000102',
    current_date,
    'other',
    'Historical compensation tied to archived project',
    7000
  );
  perform pg_temp.assert_true(record.project_id = '30000000-0000-0000-0000-000000000102', 'archived Project can remain historical context');
  perform pg_temp.assert_true((select archived from public.projects where id = record.project_id), 'compensation does not alter archived Project');
end;
$$;

-- Staff/viewer roles cannot create records.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000103', true);
do $$ begin
  perform public.create_staff_compensation_draft(
    '20000000-0000-0000-0000-000000000103', null, current_date,
    'compensation', 'Unauthorised', 1000
  );
  raise exception 'expected staff creation rejection';
exception when insufficient_privilege then null;
end; $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000104', true);
do $$ begin
  perform public.create_staff_compensation_draft(
    '20000000-0000-0000-0000-000000000103', null, current_date,
    'compensation', 'Unauthorised', 1000
  );
  raise exception 'expected viewer creation rejection';
exception when insufficient_privilege then null;
end; $$;

-- Principal decides the manager-created record, including stale-version guard.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$ begin
  perform public.decide_staff_compensation(
    current_setting('test.staff_comp.principal_record')::uuid,
    1,
    'approved',
    null
  );
  raise exception 'expected stale-version rejection';
exception when serialization_failure then null;
end; $$;

do $$
declare record public.staff_compensations;
begin
  record := public.decide_staff_compensation(
    current_setting('test.staff_comp.principal_record')::uuid,
    2,
    'approved',
    null
  );
  perform pg_temp.assert_true(record.lifecycle = 'approved' and record.approved_amount = 25000, 'Principal approves submitted amount');
  perform pg_temp.assert_true(record.decider_id = auth.uid(), 'Principal actor is stamped');
  perform pg_temp.assert_true((select status = 'Completed' from public.projects where id = record.project_id), 'decision does not reopen Completed Project');
end;
$$;

-- Amendment/resubmission/rejection path remains independent of Project status.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
do $$
declare record public.staff_compensations;
begin
  record := public.create_staff_compensation_draft(
    '20000000-0000-0000-0000-000000000102',
    '30000000-0000-0000-0000-000000000101',
    current_date,
    'bonus',
    'Project completion bonus',
    10000
  );
  record := public.submit_staff_compensation(record.id, record.version);
  perform set_config('test.staff_comp.amend_record', record.id::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$
declare record public.staff_compensations;
begin
  record := public.decide_staff_compensation(
    current_setting('test.staff_comp.amend_record')::uuid,
    2,
    'amendment_requested',
    'Revise amount as discussed'
  );
  perform pg_temp.assert_true(record.lifecycle = 'amendment_requested', 'Principal requests amendment');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000102', true);
do $$
declare record public.staff_compensations;
begin
  record := public.update_staff_compensation(
    current_setting('test.staff_comp.amend_record')::uuid,
    3,
    '20000000-0000-0000-0000-000000000102',
    '30000000-0000-0000-0000-000000000101',
    current_date,
    'bonus',
    'Revised project completion bonus',
    8000
  );
  record := public.submit_staff_compensation(record.id, record.version);
  perform pg_temp.assert_true(record.request_round = 2 and record.submitted_amount = 8000, 'requester amends and resubmits round two');
  perform pg_temp.assert_true((select status = 'Completed' from public.projects where id = record.project_id), 'amendment flow leaves Completed Project closed');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000101', true);
do $$
declare record public.staff_compensations;
begin
  record := public.decide_staff_compensation(
    current_setting('test.staff_comp.amend_record')::uuid,
    5,
    'rejected',
    'Not authorised at revised amount'
  );
  perform pg_temp.assert_true(record.lifecycle = 'rejected' and record.approved_amount is null, 'Principal rejects resubmitted record');
end;
$$;

-- Event history cannot be edited or deleted, even by an authenticated actor.
do $$ begin
  update public.staff_compensation_events
  set reason = 'rewrite history'
  where compensation_id = current_setting('test.staff_comp.principal_record')::uuid;
  raise exception 'expected immutable-event rejection';
exception when insufficient_privilege then null;
end; $$;

reset role;
rollback;
