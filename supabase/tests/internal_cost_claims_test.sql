-- BD-FIN-01A isolated PostgreSQL 17 authority and lifecycle matrix.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@fin.test'),
  ('00000000-0000-0000-0000-000000000002', 'manager@fin.test'),
  ('00000000-0000-0000-0000-000000000003', 'other-manager@fin.test'),
  ('00000000-0000-0000-0000-000000000004', 'staff@fin.test'),
  ('00000000-0000-0000-0000-000000000005', 'viewer@fin.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'owner@fin.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'manager@fin.test', 'Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000003', 'other-manager@fin.test', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000004', 'staff@fin.test', 'Staff', 'staff', true),
  ('00000000-0000-0000-0000-000000000005', 'viewer@fin.test', 'Viewer', 'viewer', true);

insert into public.projects (id, project_name, project_type, status, stage, archived, lead_person_id, portfolio_eligible, portfolio_permission_status) values
  ('10000000-0000-0000-0000-000000000001', 'Assigned Ongoing', 'Residential', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000002', 'Led Ongoing', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-000000000002', false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000003', 'Unrelated Ongoing', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-000000000003', false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000004', 'Paused', 'Residential', 'Paused', 'Implementation', false, null, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000005', 'Archived', 'Residential', 'Ongoing', 'Archived', true, null, false, 'Not Reviewed'),
  ('bf257eb0-e144-416c-a72e-67dfc09df3ee', 'Fixture A', 'Other', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed'),
  ('0197700b-4f86-4b33-94ed-0ee208f100bb', 'Fixture B', 'Other', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed');
insert into public.project_assignments (project_id, user_id, is_active) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', true),
  ('bf257eb0-e144-416c-a72e-67dfc09df3ee', '00000000-0000-0000-0000-000000000002', true);

insert into public.daily_site_entries (
  id, project_id, work_date, disposition, expected_worker_count, rate_per_worker,
  planned_labour_cost, work_planned, evidence_status, state, version, returned_reason,
  created_by, updated_by, submitted_by, reviewed_by, submitted_at, reviewed_at
) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '2026-07-31', 'working', 6, 500, 3000, 'Lay turf', 'none', 'accepted', 2, null, '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', now(), now()),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '2026-08-01', 'working', 4, 500, 2000, 'Prune', 'none', 'returned_for_correction', 1, 'Correct scope', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', null, null, null, null);

select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.internal_cost_claims', 'INSERT'), 'authenticated has no direct claim INSERT');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.internal_cost_claims', 'UPDATE'), 'authenticated has no direct claim UPDATE');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.internal_cost_claim_events', 'DELETE'), 'authenticated has no event DELETE');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.internal_cost_claims'::regclass), 'claim RLS enabled');
select pg_temp.assert_true((select proconfig @> array['search_path=pg_catalog, public'] from pg_proc where oid = 'public.submit_internal_cost_claim(uuid,integer)'::regprocedure), 'mutation has fixed search path');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

do $$
declare claim public.internal_cost_claims;
begin
  claim := public.create_internal_cost_claim_draft(
    '10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001',
    '2026-07-31', 'crew', 'Turf crew', 'labour', 'Lay turf',
    '[{"description":"Crew labour","rate_type":"daily","quantity":6,"unit":"worker","unit_rate":500},{"description":"Cart","rate_type":"transport_allowance","quantity":1,"unit":"trip","unit_rate":350}]'
  );
  perform pg_temp.assert_true(claim.lifecycle = 'draft' and claim.version = 1, 'manager creates assigned-project draft');
  perform pg_temp.assert_true(claim.daily_site_source_version = 2, 'source version captured');
  perform pg_temp.assert_true((select sum(line_total) = 3350 from public.internal_cost_claim_lines where claim_id = claim.id), 'line total is authoritative');
  perform pg_temp.assert_true((select count(*) = 1 from public.internal_cost_claim_events where claim_id = claim.id and event_type = 'created'), 'created event appended');
  claim := public.submit_internal_cost_claim(claim.id, claim.version);
  perform pg_temp.assert_true(claim.lifecycle = 'awaiting_review' and claim.request_round = 1 and claim.submitted_total = 3350, 'submit derives total and opens round one');
  perform set_config('test.fin.claim', claim.id::text, true);
end;
$$;

do $$ begin
  perform public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000003', null, '2026-07-31', 'crew', 'Other', 'labour', 'Wrong project', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"day","unit_rate":500}]');
  raise exception 'expected unrelated-project rejection';
exception when insufficient_privilege then null; end; $$;

do $$ begin
  perform public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000004', null, '2026-07-31', 'crew', 'Paused', 'labour', 'Paused project', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"day","unit_rate":500}]');
  raise exception 'expected ineligible-project rejection';
exception when invalid_parameter_value then null; end; $$;

do $$ begin
  perform public.create_internal_cost_claim_draft('bf257eb0-e144-416c-a72e-67dfc09df3ee', null, '2026-07-31', 'crew', 'Fixture', 'labour', 'Fixture', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"day","unit_rate":500}]');
  raise exception 'expected fixture rejection';
exception when invalid_parameter_value then null; end; $$;

do $$ begin
  perform public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002', '2026-08-01', 'crew', 'Crew', 'labour', 'Returned source', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"day","unit_rate":500}]');
  raise exception 'expected returned-source rejection';
exception when invalid_parameter_value then null; end; $$;

do $$ begin
  perform public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000001', null, '2026-07-31', 'crew', 'Crew', 'labour', 'Empty', '[]');
  raise exception 'expected empty-line rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000001', null, '2026-07-31', 'crew', 'Crew', 'labour', 'Negative', '[{"description":"Labour","rate_type":"daily","quantity":-1,"unit":"day","unit_rate":500}]');
  raise exception 'expected negative-quantity rejection';
exception when check_violation then null; end; $$;
do $$ begin
  perform public.decide_internal_cost_claim(current_setting('test.fin.claim')::uuid, 2, 'approved', null);
  raise exception 'expected manager-decision rejection';
exception when insufficient_privilege then null; end; $$;

-- Owner sees and decides the manager claim as a whole.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ begin
  perform public.decide_internal_cost_claim(current_setting('test.fin.claim')::uuid, 1, 'approved', null);
  raise exception 'expected stale version rejection';
exception when serialization_failure then null; end; $$;
do $$ declare claim public.internal_cost_claims; begin
  claim := public.decide_internal_cost_claim(current_setting('test.fin.claim')::uuid, 2, 'approved', 'Approved for the recorded scope');
  perform pg_temp.assert_true(claim.lifecycle = 'approved' and claim.approved_total = 3350, 'Principal approves whole claim');
  perform pg_temp.assert_true(claim.decider_id = auth.uid(), 'Principal identity stamped');
  perform pg_temp.assert_true((select count(*) = 3 from public.internal_cost_claim_events where claim_id = claim.id), 'decision event appended');
end; $$;
do $$ begin
  perform public.decide_internal_cost_claim(current_setting('test.fin.claim')::uuid, 3, 'approved', null);
  raise exception 'expected duplicate-decision rejection';
exception when invalid_parameter_value then null; end; $$;

-- Complete amendment/resubmission/rejection and withdrawal paths.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000002', null, '2026-07-31', 'contractor', 'Mason A', 'mason_subcontract', 'Wall repair', '[{"description":"Masonry task","rate_type":"task","quantity":1,"unit":"task","unit_rate":6000}]');
  claim := public.submit_internal_cost_claim(claim.id, claim.version);
  perform set_config('test.fin.amend_claim', claim.id::text, true);
end; $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.decide_internal_cost_claim(current_setting('test.fin.amend_claim')::uuid, 2, 'amendment_requested', 'Separate transport from masonry');
  perform pg_temp.assert_true(claim.lifecycle = 'amendment_requested', 'Principal requests amendment');
end; $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.update_internal_cost_claim(current_setting('test.fin.amend_claim')::uuid, 3, '2026-07-31', 'contractor', 'Mason A', 'mason_subcontract', 'Wall repair only', '[{"description":"Masonry task","rate_type":"task","quantity":1,"unit":"task","unit_rate":5500}]');
  claim := public.submit_internal_cost_claim(claim.id, claim.version);
  perform pg_temp.assert_true(claim.request_round = 2 and claim.submitted_total = 5500, 'manager amends and resubmits in round two');
end; $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.decide_internal_cost_claim(current_setting('test.fin.amend_claim')::uuid, 5, 'rejected', 'Scope not authorised');
  perform pg_temp.assert_true(claim.lifecycle = 'rejected' and claim.approved_total is null, 'Principal rejects whole resubmitted claim');
end; $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000001', null, '2026-07-31', 'service_provider', 'Driver', 'transport', 'Site delivery', '[{"description":"Delivery","rate_type":"task","quantity":1,"unit":"trip","unit_rate":1500}]');
  claim := public.submit_internal_cost_claim(claim.id, claim.version);
  claim := public.withdraw_internal_cost_claim(claim.id, claim.version, 'Delivery postponed');
  perform pg_temp.assert_true(claim.lifecycle = 'withdrawn', 'manager withdraws an awaiting claim');
end; $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

do $$ declare claim public.internal_cost_claims; begin
  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000002', null, '2026-07-31', 'supplier', 'Stone supplier',
    'materials', 'Stone delivery', '[{"description":"Building stone","rate_type":"lump_sum","quantity":1,"unit":"delivery","unit_rate":12000}]', 'Direct Principal authority'
  );
  perform pg_temp.assert_true(claim.lifecycle = 'approved' and claim.request_round = 0 and claim.decider_id is null, 'direct authority is not self-approval');
  perform pg_temp.assert_true(claim.direct_authority_actor_id = auth.uid(), 'direct authority actor stamped');
  perform pg_temp.assert_true((select count(*) = 1 from public.internal_cost_claim_events where claim_id = claim.id and event_type = 'principal_authorised'), 'distinct direct-authority event');
  claim := public.cancel_internal_cost_claim(claim.id, claim.version, 'Order no longer required');
  perform pg_temp.assert_true(claim.lifecycle = 'cancelled' and claim.approved_total is null, 'Principal controlled cancellation');
end; $$;

-- Other manager, staff and viewer see no unrelated finance rows; staff mutation is rejected.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.internal_cost_claims), 'unrelated manager sees no claims');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.internal_cost_claims), 'staff sees no claims');
do $$ begin
  perform public.create_internal_cost_claim_draft('10000000-0000-0000-0000-000000000001', null, '2026-07-31', 'crew', 'Crew', 'labour', 'Denied', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"day","unit_rate":500}]');
  raise exception 'expected staff rejection';
exception when insufficient_privilege then null; end; $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
select pg_temp.assert_true((select count(*) = 0 from public.internal_cost_claims), 'viewer sees no claims');

reset role;
do $$ begin
  update public.internal_cost_claim_events set reason = 'tamper';
  raise exception 'expected immutable-event rejection';
exception when insufficient_privilege then null; end; $$;

select pg_temp.assert_true((select count(*) = 4 from public.internal_cost_claims), 'matrix creates only four rollback-only claims');
rollback;
select 'internal cost claims tests passed' as result;
