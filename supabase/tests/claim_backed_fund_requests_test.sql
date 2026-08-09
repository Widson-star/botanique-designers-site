-- BD-FIN-01B1 isolated PostgreSQL 17 authority, reservation and lifecycle matrix.
-- Every case is rolled back. No release, payment, expenditure or reconciliation object is
-- created or asserted into existence anywhere in this file.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

create function pg_temp.available(target_project uuid, target_claim uuid)
returns numeric language sql as $$
  select available_to_request
  from public.fund_request_claim_availability(target_project)
  where claim_id = target_claim
$$;

create function pg_temp.event_count(target_request uuid)
returns bigint language sql as $$
  select count(*) from public.fund_request_events where fund_request_id = target_request
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@fund.test'),
  ('00000000-0000-0000-0000-000000000002', 'manager@fund.test'),
  ('00000000-0000-0000-0000-000000000003', 'other-manager@fund.test'),
  ('00000000-0000-0000-0000-000000000004', 'staff@fund.test'),
  ('00000000-0000-0000-0000-000000000005', 'viewer@fund.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'owner@fund.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'manager@fund.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000003', 'other-manager@fund.test', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000004', 'staff@fund.test', 'Staff', 'staff', true),
  ('00000000-0000-0000-0000-000000000005', 'viewer@fund.test', 'Viewer', 'viewer', true);

insert into public.projects (id, project_name, project_type, status, stage, archived, lead_person_id, portfolio_eligible, portfolio_permission_status) values
  ('10000000-0000-0000-0000-000000000001', 'Alego Usonga', 'Residential', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000002', 'Lugulu', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-000000000002', false, 'Not Reviewed'),
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

-- ---------------------------------------------------------------------------
-- K/J structural guarantees before any row exists.
-- ---------------------------------------------------------------------------
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_requests', 'INSERT'), 'authenticated has no direct request INSERT');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_requests', 'UPDATE'), 'authenticated has no direct request UPDATE');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_requests', 'DELETE'), 'authenticated has no direct request DELETE');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_request_allocations', 'INSERT'), 'authenticated has no direct allocation INSERT');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_request_allocations', 'UPDATE'), 'authenticated has no direct allocation UPDATE');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_request_allocations', 'DELETE'), 'authenticated has no direct allocation DELETE');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_request_events', 'INSERT'), 'authenticated has no direct event INSERT');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_request_events', 'UPDATE'), 'authenticated has no direct event UPDATE');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.fund_request_events', 'DELETE'), 'authenticated has no direct event DELETE');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.fund_requests'::regclass), 'request RLS enabled');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.fund_request_allocations'::regclass), 'allocation RLS enabled');
select pg_temp.assert_true((select relrowsecurity from pg_class where oid = 'public.fund_request_events'::regclass), 'event RLS enabled');
select pg_temp.assert_true((select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'fund_requests'), 'exactly one request policy');
select pg_temp.assert_true((select count(*) = 1 from pg_policies where schemaname = 'public' and tablename = 'fund_requests' and cmd = 'SELECT'), 'the only request policy is SELECT');
select pg_temp.assert_true((select count(*) = 0 from pg_policies where schemaname = 'public' and tablename in ('fund_requests','fund_request_allocations','fund_request_events') and cmd <> 'SELECT'), 'no write policy on any new table');

-- Every new SECURITY DEFINER function pins a fixed search path.
select pg_temp.assert_true((
  select count(*) = 0 from pg_proc
  where pronamespace = 'public'::regnamespace
    and (proname like '%fund_request%' or proname like 'direct_authorise%')
    and prosecdef
    and not (coalesce(proconfig, '{}') @> array['search_path=pg_catalog, public'])
), 'every fund request definer function pins a search path');

-- Private helpers and trigger functions are not executable by clients.
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_replace_fund_request_allocations(uuid,uuid,jsonb,boolean,boolean)', 'EXECUTE'), 'reservation writer is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_verify_fund_request_reservations(uuid,uuid)', 'EXECUTE'), 'reservation verifier is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_active_fund_request_role()', 'EXECUTE'), 'role helper is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_assert_fund_request_project(uuid)', 'EXECUTE'), 'project helper is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_assert_fund_request_custody(text,uuid)', 'EXECUTE'), 'custody helper is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_append_fund_request_event(public.fund_requests,text,text,text)', 'EXECUTE'), 'event writer is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_guard_internal_cost_claim_fund_reservation()', 'EXECUTE'), 'claim reservation guard is private');
select pg_temp.assert_true(has_function_privilege('authenticated', 'public.submit_fund_request(uuid,integer)', 'EXECUTE'), 'submit RPC is executable');

-- O. This slice introduces exactly three tables, and a fund request is still authority rather
-- than money.
--
-- Until BD-FIN-01C this asserted that no release, payment or reconciliation object existed
-- anywhere in the database. BD-FIN-01C deliberately creates that object family, so the
-- absence assertion is now false by authorised design. What it was really protecting is
-- asserted instead, and more strictly: the fund request itself must never become the payment
-- ledger. No paid/released/reconciled column may appear on it, no 'paid' status may be added
-- to its lifecycle, and payment truth must live in its own tables.
select pg_temp.assert_true((
  select count(*) = 3 from pg_tables where schemaname = 'public'
    and tablename in ('fund_requests', 'fund_request_allocations', 'fund_request_events')
), 'the three fund request tables exist');
select pg_temp.assert_true((
  select count(*) = 0 from information_schema.columns
  where table_schema = 'public' and table_name = 'fund_requests' and (
    column_name like '%paid%' or column_name like '%released%' or column_name like '%disburse%'
    or column_name like '%expenditure%' or column_name like '%reconcil%'
    or column_name like '%settle%' or column_name like '%variance%'
  )
), 'no payment, release or reconciliation shortcut column was bolted onto fund_requests');
select pg_temp.assert_true((
  select pg_get_constraintdef(oid) not like '%paid%'
    and pg_get_constraintdef(oid) not like '%released%'
    and pg_get_constraintdef(oid) not like '%reconciled%'
    and pg_get_constraintdef(oid) not like '%settled%'
  from pg_constraint where conname = 'fund_requests_status_check'
), 'no payment state was added to the fund request lifecycle');
select pg_temp.assert_true((
  select count(*) = 0 from information_schema.columns
  where table_schema = 'public' and table_name = 'fund_request_allocations'
    and (column_name like '%paid%' or column_name like '%released%')
), 'an allocation still reserves authority and records no payment');

-- ---------------------------------------------------------------------------
-- Approved BD-FIN-01A claims that back the matrix.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

do $$
declare claim public.internal_cost_claims;
begin
  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-30', 'crew', '16 Alego casual workers',
    'labour', 'Sixteen casual workers at KES 500 for the day',
    '[{"description":"Casual worker day","rate_type":"daily","quantity":16,"unit":"worker","unit_rate":500}]', 'Approved day labour');
  perform set_config('test.fund.claim_labour', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-30', 'contractor', 'Mason Otieno',
    'mason_subcontract', 'Boundary wall masonry',
    '[{"description":"Masonry task","rate_type":"task","quantity":1,"unit":"task","unit_rate":12000}]', 'Approved masonry');
  perform set_config('test.fund.claim_mason', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-30', 'service_provider', 'Mkokoteni operator',
    'cart_transport', 'Mkokoteni cartage of murram',
    '[{"description":"Cart trip","rate_type":"task","quantity":6,"unit":"trip","unit_rate":500}]', 'Approved cartage');
  perform set_config('test.fund.claim_cart', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-29', 'supplier', 'Murram supplier',
    'materials', 'Murram delivery',
    '[{"description":"Murram","rate_type":"lump_sum","quantity":1,"unit":"delivery","unit_rate":20000}]', 'Approved murram');
  perform set_config('test.fund.claim_partial', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-29', 'crew', 'Contested crew',
    'labour', 'Claim used to prove the no-over-request rule',
    '[{"description":"Crew day","rate_type":"daily","quantity":10,"unit":"worker","unit_rate":500}]', 'Approved contested');
  perform set_config('test.fund.claim_contested', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-28', 'supplier', 'Direct supplier',
    'supplier_cost', 'Claim reserved by Principal direct authority',
    '[{"description":"Supply","rate_type":"lump_sum","quantity":1,"unit":"delivery","unit_rate":4000}]', 'Approved direct');
  perform set_config('test.fund.claim_direct', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000002', null, '2026-07-30', 'supplier', 'Lugulu supplier',
    'materials', 'Lugulu stone delivery',
    '[{"description":"Stone","rate_type":"lump_sum","quantity":1,"unit":"delivery","unit_rate":10000}]', 'Approved Lugulu');
  perform set_config('test.fund.claim_other_project', claim.id::text, true);
end;
$$;

select pg_temp.assert_true((select count(*) = 7 from public.internal_cost_claims where lifecycle = 'approved'), 'seven approved claims back the matrix');

-- ---------------------------------------------------------------------------
-- A. Alego multi-claim manager request with intended accountable advance to Martine.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

do $$
declare request public.fund_requests;
begin
  request := public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001',
    'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002',
    'Alego day labour, masonry and mkokoteni cartage',
    format('[{"claim_id":"%s","requested_amount":8000},{"claim_id":"%s","requested_amount":12000},{"claim_id":"%s","requested_amount":3000}]',
      current_setting('test.fund.claim_labour'), current_setting('test.fund.claim_mason'),
      current_setting('test.fund.claim_cart'))::jsonb
  );
  perform pg_temp.assert_true(request.status = 'draft' and request.submission_round = 0, 'manager draft opens at round zero');
  perform pg_temp.assert_true(request.authority_type = 'manager_requested', 'manager authority type');
  perform pg_temp.assert_true(request.requester_id = auth.uid() and request.direct_authority_actor_id is null, 'requester stamped, no direct actor');
  perform pg_temp.assert_true(request.request_number ~ '^BDFR-[0-9]{4}-[0-9]{6}$', 'immutable human-readable request number');
  perform pg_temp.assert_true(request.total_requested_amount = 23000, 'draft total is the allocation sum');
  perform pg_temp.assert_true(request.intended_custody_type = 'operations_manager_accountable_advance', 'intended accountable advance recorded');
  perform pg_temp.assert_true(request.custodian_profile_id = '00000000-0000-0000-0000-000000000002', 'Martine is the intended custodian');
  perform pg_temp.assert_true((select count(*) = 3 from public.fund_request_allocations where fund_request_id = request.id), 'three separate allocations');
  perform pg_temp.assert_true((select count(distinct internal_cost_claim_id) = 3 from public.fund_request_allocations where fund_request_id = request.id), 'three distinct claims');
  perform pg_temp.assert_true((select bool_and(claim_approved_total_snapshot > 0 and length(claim_reference_snapshot) > 0)
    from public.fund_request_allocations where fund_request_id = request.id), 'audit snapshots frozen on every allocation');
  perform pg_temp.assert_true(pg_temp.event_count(request.id) = 1, 'one draft_created event');

  -- A draft does not reserve, so availability is untouched.
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_labour')::uuid) = 8000, 'draft does not reserve claim value');

  request := public.submit_fund_request(request.id, request.version);
  perform pg_temp.assert_true(request.status = 'submitted' and request.submission_round = 1, 'submission opens round one');
  perform pg_temp.assert_true(request.total_requested_amount = 23000, 'submitted total equals allocation total');
  perform pg_temp.assert_true((select count(*) = 1 from public.fund_request_events where fund_request_id = request.id and event_type = 'submitted'), 'submitted event appended');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_labour')::uuid) = 0, 'submitted request reserves claim value');
  perform set_config('test.fund.request_alego', request.id::text, true);
end;
$$;

-- Every allocation belongs to the request's own project.
select pg_temp.assert_true((
  select bool_and(claim.project_id = request.project_id)
  from public.fund_request_allocations allocation
  join public.fund_requests request on request.id = allocation.fund_request_id
  join public.internal_cost_claims claim on claim.id = allocation.internal_cost_claim_id
), 'every allocation shares the request project');

-- ---------------------------------------------------------------------------
-- B. Partial request against an approved KES 20,000 claim.
-- ---------------------------------------------------------------------------
do $$
declare request public.fund_requests;
begin
  request := public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null,
    'Part of the approved murram claim',
    format('[{"claim_id":"%s","requested_amount":12000}]', current_setting('test.fund.claim_partial'))::jsonb
  );
  request := public.submit_fund_request(request.id, request.version);
  perform pg_temp.assert_true(request.total_requested_amount = 12000, 'partial request totals 12,000');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_partial')::uuid) = 8000, 'KES 8,000 remains available to request');
  perform set_config('test.fund.request_partial', request.id::text, true);
end;
$$;

-- The availability surface distinguishes approved, reserved elsewhere and available.
do $$
declare row_data record;
begin
  select * into row_data from public.fund_request_claim_availability('10000000-0000-0000-0000-000000000001')
  where claim_id = current_setting('test.fund.claim_partial')::uuid;
  perform pg_temp.assert_true(row_data.approved_total = 20000, 'approved claim amount surfaced');
  perform pg_temp.assert_true(row_data.reserved_elsewhere = 12000, 'reserved-elsewhere surfaced');
  perform pg_temp.assert_true(row_data.available_to_request = 8000, 'available-to-request surfaced');
end;
$$;

-- ---------------------------------------------------------------------------
-- C. Competing requests over one claim: only a valid amount becomes reserving.
-- ---------------------------------------------------------------------------
do $$
declare
  first_request public.fund_requests;
  second_request public.fund_requests;
  events_before bigint;
begin
  first_request := public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'First claim on the contested crew claim',
    format('[{"claim_id":"%s","requested_amount":5000}]', current_setting('test.fund.claim_contested'))::jsonb);
  first_request := public.submit_fund_request(first_request.id, first_request.version);

  -- A competing draft may still be created; draft availability is advisory only.
  second_request := public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Competing claim on the same approved claim',
    format('[{"claim_id":"%s","requested_amount":3000}]', current_setting('test.fund.claim_contested'))::jsonb);
  perform pg_temp.assert_true(second_request.status = 'draft', 'competing draft is allowed');
  events_before := pg_temp.event_count(second_request.id);

  begin
    second_request := public.submit_fund_request(second_request.id, second_request.version);
    raise exception 'expected an over-request conflict';
  exception when sqlstate 'BDF01' then null; end;

  perform pg_temp.assert_true((select status = 'draft' from public.fund_requests where id = second_request.id), 'the losing request stays in its prior status');
  perform pg_temp.assert_true(pg_temp.event_count(second_request.id) = events_before, 'the losing request creates no event');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_contested')::uuid) = 0, 'only the valid amount reserves');
  perform set_config('test.fund.request_contested', first_request.id::text, true);
  perform set_config('test.fund.request_losing', second_request.id::text, true);
end;
$$;

-- A request may never exceed the approved claim amount in a single allocation either.
do $$ begin
  perform public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Over the approved claim',
    format('[{"claim_id":"%s","requested_amount":99000}]', current_setting('test.fund.claim_labour'))::jsonb);
  raise exception 'expected an over-claim rejection';
exception when invalid_parameter_value then null; end; $$;

-- One claim may appear only once per request.
do $$ begin
  perform public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Duplicated claim',
    format('[{"claim_id":"%s","requested_amount":100},{"claim_id":"%s","requested_amount":100}]',
      current_setting('test.fund.claim_labour'), current_setting('test.fund.claim_labour'))::jsonb);
  raise exception 'expected a duplicate-claim rejection';
exception when invalid_parameter_value then null; end; $$;

-- Allocation amounts must be positive.
do $$ begin
  perform public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Negative allocation',
    format('[{"claim_id":"%s","requested_amount":-100}]', current_setting('test.fund.claim_labour'))::jsonb);
  raise exception 'expected a non-positive allocation rejection';
exception when invalid_parameter_value then null; end; $$;

-- ---------------------------------------------------------------------------
-- D. Cross-project denial: an Alego request may not carry a Lugulu claim.
-- ---------------------------------------------------------------------------
do $$ begin
  perform public.create_fund_request_draft(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Alego request carrying a Lugulu claim',
    format('[{"claim_id":"%s","requested_amount":1000}]', current_setting('test.fund.claim_other_project'))::jsonb);
  raise exception 'expected a cross-project rejection';
exception when invalid_parameter_value then null; end; $$;

-- Only an approved claim may back a request.
do $$
declare draft_claim public.internal_cost_claims;
begin
  draft_claim := public.create_internal_cost_claim_draft(
    '10000000-0000-0000-0000-000000000001', null, '2026-07-31', 'crew', 'Unapproved crew', 'labour', 'Not yet approved',
    '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"day","unit_rate":500}]');
  begin
    perform public.create_fund_request_draft(
      '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Unapproved backing',
      format('[{"claim_id":"%s","requested_amount":100}]', draft_claim.id)::jsonb);
    raise exception 'expected an unapproved-claim rejection';
  exception when invalid_parameter_value then null; end;
end;
$$;

-- ---------------------------------------------------------------------------
-- M. Fixture, archived and operationally ineligible projects are never finance targets.
-- ---------------------------------------------------------------------------
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000004', 'direct_recipient_funding', null, 'Paused project', '[]'::jsonb);
  raise exception 'expected a paused-project rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000005', 'direct_recipient_funding', null, 'Archived project', '[]'::jsonb);
  raise exception 'expected an archived-project rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_fund_request_draft('bf257eb0-e144-416c-a72e-67dfc09df3ee', 'direct_recipient_funding', null, 'Excluded fixture', '[]'::jsonb);
  raise exception 'expected an excluded-fixture rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000003', 'direct_recipient_funding', null, 'Unauthorised project', '[]'::jsonb);
  raise exception 'expected an unauthorised-project rejection';
exception when invalid_parameter_value then null; end; $$;

-- Intended custody is structurally constrained.
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance', null, 'No custodian', '[]'::jsonb);
  raise exception 'expected a missing-custodian rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000001', 'Principal as custodian', '[]'::jsonb);
  raise exception 'expected a non-manager-custodian rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', '00000000-0000-0000-0000-000000000002', 'Custodian on direct funding', '[]'::jsonb);
  raise exception 'expected a custodian-on-direct-funding rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'cash_in_hand', null, 'Unsupported custody', '[]'::jsonb);
  raise exception 'expected an unsupported-custody rejection';
exception when invalid_parameter_value then null; end; $$;

-- A request with no allocation cannot be submitted.
do $$
declare request public.fund_requests;
begin
  request := public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Empty draft', '[]'::jsonb);
  perform pg_temp.assert_true(request.total_requested_amount is null, 'an empty draft carries no total');
  begin
    perform public.submit_fund_request(request.id, request.version);
    raise exception 'expected an empty-submission rejection';
  exception when invalid_parameter_value then null; end;
  perform set_config('test.fund.request_empty', request.id::text, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- E. The Operations Manager holds no decision, direct-authority or cancellation power.
-- ---------------------------------------------------------------------------
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'approved', null);
  raise exception 'expected a manager-approval rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'rejected', 'No');
  raise exception 'expected a manager-rejection rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'amendment_requested', 'Change');
  raise exception 'expected a manager-amendment-request rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  perform public.direct_authorise_fund_request('10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Manager direct authority',
    format('[{"claim_id":"%s","requested_amount":100}]', current_setting('test.fund.claim_direct'))::jsonb, null);
  raise exception 'expected a manager-direct-authority rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  perform public.cancel_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'Manager cancellation');
  raise exception 'expected a manager-cancellation rejection';
exception when insufficient_privilege then null; end; $$;

-- I. Stale versions are rejected on every mutable manager operation.
do $$ begin
  perform public.update_fund_request(current_setting('test.fund.request_empty')::uuid, 99, 'direct_recipient_funding', null, 'Stale edit', '[]'::jsonb);
  raise exception 'expected a stale update rejection';
exception when serialization_failure then null; end; $$;
do $$ begin
  perform public.submit_fund_request(current_setting('test.fund.request_empty')::uuid, 99);
  raise exception 'expected a stale submit rejection';
exception when serialization_failure then null; end; $$;
do $$ begin
  perform public.withdraw_fund_request(current_setting('test.fund.request_alego')::uuid, 99, 'Stale withdrawal');
  raise exception 'expected a stale withdraw rejection';
exception when serialization_failure then null; end; $$;

-- A submitted request is not editable by the Operations Manager.
do $$ begin
  perform public.update_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'direct_recipient_funding', null, 'Edit after submission', '[]'::jsonb);
  raise exception 'expected a submitted-edit rejection';
exception when invalid_parameter_value then null; end; $$;

-- Withdrawal after submission requires an audit reason.
do $$ begin
  perform public.withdraw_fund_request(current_setting('test.fund.request_contested')::uuid, 2, null);
  raise exception 'expected a missing-withdrawal-reason rejection';
exception when invalid_parameter_value then null; end; $$;

-- ---------------------------------------------------------------------------
-- G. Amendment keeps reserving; allocation replacement is atomic; resubmission is an event.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare request public.fund_requests;
begin
  begin
    perform public.decide_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'amendment_requested', null);
    raise exception 'expected a missing-reason rejection';
  exception when invalid_parameter_value then null; end;

  request := public.decide_fund_request(current_setting('test.fund.request_alego')::uuid, 2, 'amendment_requested', 'Split the cartage out of this request');
  perform pg_temp.assert_true(request.status = 'amendment_requested', 'Principal requests an amendment');
  perform pg_temp.assert_true(request.submission_round = 1, 'the amendment stays in round one');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_labour')::uuid) = 0, 'an amendment-requested request keeps reserving');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$
declare request public.fund_requests;
begin
  select * into request from public.fund_requests where id = current_setting('test.fund.request_alego')::uuid;
  request := public.update_fund_request(
    request.id, request.version, 'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
    'Alego day labour and masonry only',
    format('[{"claim_id":"%s","requested_amount":8000},{"claim_id":"%s","requested_amount":10000}]',
      current_setting('test.fund.claim_labour'), current_setting('test.fund.claim_mason'))::jsonb);
  perform pg_temp.assert_true(request.status = 'amendment_requested', 'the amendment edit does not change status');
  perform pg_temp.assert_true(request.total_requested_amount = 18000, 'the replaced allocation set drives the total');
  perform pg_temp.assert_true((select count(*) = 2 from public.fund_request_allocations where fund_request_id = request.id), 'allocations are replaced atomically');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_cart')::uuid) = 3000, 'the removed claim is released');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_mason')::uuid) = 2000, 'the reduced claim frees the difference');

  request := public.submit_fund_request(request.id, request.version);
  perform pg_temp.assert_true(request.status = 'submitted', 'resubmission returns the request to submitted');
  perform pg_temp.assert_true(request.submission_round = 2, 'resubmission increments the submission round');
  perform pg_temp.assert_true((select count(*) = 1 from public.fund_request_events where fund_request_id = request.id and event_type = 'resubmitted'), 'resubmission is an immutable event');
  perform pg_temp.assert_true((select count(*) = 0 from public.fund_requests where status = 'resubmitted'), 'resubmitted is never a durable status');
end;
$$;

-- ---------------------------------------------------------------------------
-- F. Principal direct authority is atomic and distinct.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare request public.fund_requests;
begin
  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null,
    'Principal makes supplier funds available directly',
    format('[{"claim_id":"%s","requested_amount":4000}]', current_setting('test.fund.claim_direct'))::jsonb,
    'Direct Principal authority');
  perform pg_temp.assert_true(request.status = 'approved', 'direct authority creates an approved request');
  perform pg_temp.assert_true(request.authority_type = 'principal_direct', 'direct authority type recorded');
  perform pg_temp.assert_true(request.requester_id is null, 'no manager requester is simulated');
  perform pg_temp.assert_true(request.direct_authority_actor_id = auth.uid(), 'the Principal actor is stamped');
  perform pg_temp.assert_true(request.submission_round = 0, 'direct authority never opens a submission round');
  perform pg_temp.assert_true(request.total_requested_amount = 4000, 'direct authority totals its allocations');
  perform pg_temp.assert_true(pg_temp.event_count(request.id) = 1, 'exactly one immutable event');
  perform pg_temp.assert_true((select event_type = 'principal_direct_authorised' from public.fund_request_events where fund_request_id = request.id), 'the single event is the direct-authority event');
  perform pg_temp.assert_true((select count(*) = 0 from public.fund_request_events where fund_request_id = request.id and event_type in ('submitted','approved','draft_created')), 'no fabricated submit or approve cycle');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_direct')::uuid) = 0, 'direct authority reserves the claim');
  perform set_config('test.fund.request_direct', request.id::text, true);
end;
$$;

-- The deferred total-equals-allocations guarantee is proven, not merely postponed.
set constraints public.fund_requests_total_matches_allocations immediate;

-- Direct authority is still bound by the no-over-request rule.
do $$ begin
  perform public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Over-reserving direct authority',
    format('[{"claim_id":"%s","requested_amount":1000}]', current_setting('test.fund.claim_direct'))::jsonb, null);
  raise exception 'expected a direct-authority over-request conflict';
exception when sqlstate 'BDF01' then null; end; $$;

-- ---------------------------------------------------------------------------
-- N. An approved claim cannot be cancelled while a reserving request references it.
-- ---------------------------------------------------------------------------
do $$
declare claim public.internal_cost_claims;
begin
  select * into claim from public.internal_cost_claims where id = current_setting('test.fund.claim_direct')::uuid;
  begin
    perform public.cancel_internal_cost_claim(claim.id, claim.version, 'No longer required');
    raise exception 'expected a reserved-claim cancellation rejection';
  exception when invalid_parameter_value then null; end;
  perform pg_temp.assert_true((select lifecycle = 'approved' from public.internal_cost_claims where id = claim.id), 'the reserved claim stays approved');
end;
$$;

-- I. Stale versions are rejected on every Principal operation.
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_partial')::uuid, 99, 'approved', null);
  raise exception 'expected a stale decision rejection';
exception when serialization_failure then null; end; $$;
do $$ begin
  perform public.cancel_fund_request(current_setting('test.fund.request_direct')::uuid, 99, 'Stale cancellation');
  raise exception 'expected a stale cancellation rejection';
exception when serialization_failure then null; end; $$;
do $$ begin
  perform public.cancel_fund_request(current_setting('test.fund.request_direct')::uuid,
    (select version from public.fund_requests where id = current_setting('test.fund.request_direct')::uuid), null);
  raise exception 'expected a missing-cancellation-reason rejection';
exception when invalid_parameter_value then null; end; $$;

-- Only a submitted request may be decided.
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_direct')::uuid,
    (select version from public.fund_requests where id = current_setting('test.fund.request_direct')::uuid), 'approved', null);
  raise exception 'expected a non-submitted decision rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_partial')::uuid,
    (select version from public.fund_requests where id = current_setting('test.fund.request_partial')::uuid), 'released', 'Not a decision');
  raise exception 'expected an unsupported-decision rejection';
exception when invalid_parameter_value then null; end; $$;

-- ---------------------------------------------------------------------------
-- H. Rejection, withdrawal and controlled cancellation stop reserving.
-- ---------------------------------------------------------------------------
do $$
declare request public.fund_requests;
begin
  select * into request from public.fund_requests where id = current_setting('test.fund.request_partial')::uuid;
  request := public.decide_fund_request(request.id, request.version, 'rejected', 'Not authorised this month');
  perform pg_temp.assert_true(request.status = 'rejected', 'the Principal rejects a submitted request');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_partial')::uuid) = 20000, 'rejection releases the reservation');

  select * into request from public.fund_requests where id = current_setting('test.fund.request_direct')::uuid;
  request := public.cancel_fund_request(request.id, request.version, 'Supplier order withdrawn before any release');
  perform pg_temp.assert_true(request.status = 'cancelled', 'the Principal cancels an approved request before release');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_direct')::uuid) = 4000, 'cancellation releases the reservation');
end;
$$;

-- N (continued). The claim becomes cancellable once nothing reserves it.
do $$
declare claim public.internal_cost_claims;
begin
  select * into claim from public.internal_cost_claims where id = current_setting('test.fund.claim_direct')::uuid;
  claim := public.cancel_internal_cost_claim(claim.id, claim.version, 'No longer required');
  perform pg_temp.assert_true(claim.lifecycle = 'cancelled', 'an unreserved approved claim may still be cancelled');
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$
declare request public.fund_requests;
begin
  select * into request from public.fund_requests where id = current_setting('test.fund.request_contested')::uuid;
  request := public.withdraw_fund_request(request.id, request.version, 'Crew rescheduled to next week');
  perform pg_temp.assert_true(request.status = 'withdrawn', 'the manager withdraws a submitted request');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_contested')::uuid) = 5000, 'withdrawal releases the reservation');

  -- The previously losing request can now legitimately reserve.
  select * into request from public.fund_requests where id = current_setting('test.fund.request_losing')::uuid;
  request := public.submit_fund_request(request.id, request.version);
  perform pg_temp.assert_true(request.status = 'submitted', 'the freed availability admits the competing request');
end;
$$;

-- A terminal request is immutable.
do $$ begin
  perform public.withdraw_fund_request(current_setting('test.fund.request_contested')::uuid,
    (select version from public.fund_requests where id = current_setting('test.fund.request_contested')::uuid), 'Again');
  raise exception 'expected a terminal-withdrawal rejection';
exception when invalid_parameter_value then null; end; $$;

-- ---------------------------------------------------------------------------
-- Approval path and its no-release semantics.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
do $$
declare request public.fund_requests;
begin
  select * into request from public.fund_requests where id = current_setting('test.fund.request_alego')::uuid;
  request := public.decide_fund_request(request.id, request.version, 'approved', 'Make up to KES 18,000 available against these claims');
  perform pg_temp.assert_true(request.status = 'approved', 'the Principal approves the resubmitted request');
  perform pg_temp.assert_true(request.total_requested_amount = 18000, 'the approved authority is the allocation total');
  perform pg_temp.assert_true(request.decided_by = auth.uid() and request.decided_at is not null, 'the decision is stamped');
  perform pg_temp.assert_true(request.submission_round = 2, 'the approved request retains its submission round');
  perform pg_temp.assert_true(pg_temp.available('10000000-0000-0000-0000-000000000001', current_setting('test.fund.claim_labour')::uuid) = 0, 'an approved request continues reserving');
end;
$$;

-- An approved request is not editable and cannot be decided again.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
do $$ begin
  perform public.update_fund_request(current_setting('test.fund.request_alego')::uuid,
    (select version from public.fund_requests where id = current_setting('test.fund.request_alego')::uuid),
    'direct_recipient_funding', null, 'Edit after approval', '[]'::jsonb);
  raise exception 'expected an approved-edit rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.withdraw_fund_request(current_setting('test.fund.request_alego')::uuid,
    (select version from public.fund_requests where id = current_setting('test.fund.request_alego')::uuid), 'Withdraw after approval');
  raise exception 'expected an approved-withdrawal rejection';
exception when invalid_parameter_value then null; end; $$;

-- ---------------------------------------------------------------------------
-- L. Role visibility.
-- ---------------------------------------------------------------------------
select pg_temp.assert_true((select count(*) > 0 from public.fund_requests where project_id = '10000000-0000-0000-0000-000000000001'), 'the manager sees authorised project requests');
select pg_temp.assert_true((select count(*) = 0 from public.fund_requests where project_id = '10000000-0000-0000-0000-000000000003'), 'the manager sees no unauthorised project requests');
select pg_temp.assert_true((select count(*) > 0 from public.fund_request_allocations), 'allocation visibility follows the parent request');
select pg_temp.assert_true((select count(*) > 0 from public.fund_request_events), 'event visibility follows the parent request');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
select pg_temp.assert_true((select count(*) = 6 from public.fund_requests), 'the Principal sees every request company-wide');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
select pg_temp.assert_true((select count(*) = 0 from public.fund_requests), 'an unrelated manager sees no requests');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.fund_requests), 'staff sees no requests');
select pg_temp.assert_true((select count(*) = 0 from public.fund_request_allocations), 'staff sees no allocations');
select pg_temp.assert_true((select count(*) = 0 from public.fund_request_events), 'staff sees no events');
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Staff attempt', '[]'::jsonb);
  raise exception 'expected a staff rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  perform public.decide_fund_request(current_setting('test.fund.request_alego')::uuid, 1, 'approved', null);
  raise exception 'expected a staff decision rejection';
exception when insufficient_privilege then null; end; $$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
select pg_temp.assert_true((select count(*) = 0 from public.fund_requests), 'viewer sees no requests');
do $$ begin
  perform public.create_fund_request_draft('10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null, 'Viewer attempt', '[]'::jsonb);
  raise exception 'expected a viewer rejection';
exception when insufficient_privilege then null; end; $$;

-- ---------------------------------------------------------------------------
-- J/K. Direct DML and history tampering are denied.
-- ---------------------------------------------------------------------------
reset role;
do $$ begin
  update public.fund_request_events set reason = 'tamper';
  raise exception 'expected an immutable-event update rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  delete from public.fund_request_events;
  raise exception 'expected an immutable-event delete rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  update public.fund_request_allocations set requested_amount = 1;
  raise exception 'expected an allocation in-place edit rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  delete from public.fund_request_allocations
  where fund_request_id = current_setting('test.fund.request_alego')::uuid;
  raise exception 'expected a historical allocation delete rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  update public.fund_requests set project_id = '10000000-0000-0000-0000-000000000002'
  where id = current_setting('test.fund.request_alego')::uuid;
  raise exception 'expected an immutable-project rejection';
exception when insufficient_privilege then null; end; $$;
do $$ begin
  update public.fund_requests set request_number = 'BDFR-2026-999999'
  where id = current_setting('test.fund.request_alego')::uuid;
  raise exception 'expected an immutable-request-number rejection';
exception when insufficient_privilege then null; end; $$;

-- ---------------------------------------------------------------------------
-- O. Nothing in this matrix created or implied a release, payment or reconciliation.
-- ---------------------------------------------------------------------------
select pg_temp.assert_true((select count(*) = 6 from public.fund_requests), 'the matrix creates only six rollback-only requests');
select pg_temp.assert_true((
  select bool_and(status in ('draft','submitted','amendment_requested','approved','rejected','withdrawn','cancelled'))
  from public.fund_requests
), 'every request carries a durable status only');
select pg_temp.assert_true((
  select count(*) = 0 from public.fund_request_events
  where event_type not in ('draft_created','draft_updated','submitted','amendment_requested',
    'resubmitted','approved','rejected','withdrawn','cancelled','principal_direct_authorised')
), 'no event outside the authorised set was appended');
select pg_temp.assert_true((
  select sum(requested_amount) = total_requested_amount
  from public.fund_request_allocations allocation
  join public.fund_requests request on request.id = allocation.fund_request_id
  where request.id = current_setting('test.fund.request_alego')::uuid
  group by total_requested_amount
), 'allocation totals equal the request total');

rollback;
select 'claim-backed fund request tests passed' as result;
