-- BD-FIN-01A correction-authority regression, 13 Aug 2026.
--
-- Cancellation of an EXISTING approved Project Cost must not require the
-- project to be Ongoing. Creation, submission and direct authorisation must
-- still require it. One project, taken from Ongoing to Completed mid-script,
-- exactly mirrors what happened to Lugulu Residential Home.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

insert into auth.users (id, email) values
  ('30000000-0000-0000-0000-000000000001', 'owner@correction.test'),
  ('30000000-0000-0000-0000-000000000002', 'manager@correction.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('30000000-0000-0000-0000-000000000001', 'owner@correction.test', 'Principal', 'owner', true),
  ('30000000-0000-0000-0000-000000000002', 'manager@correction.test', 'Manager', 'manager', true);

insert into public.projects (id, project_name, project_type, status, stage, archived, lead_person_id, portfolio_eligible, portfolio_permission_status) values
  ('31000000-0000-0000-0000-000000000001', 'Correction Site', 'Residential', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed');
insert into public.project_assignments (project_id, user_id, is_active) values
  ('31000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002', true);

-- Privileges: the correction helper is a private implementation detail behind
-- cancel_internal_cost_claim, exactly like private_assert_internal_cost_claim_project.
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_assert_internal_cost_claim_correction(uuid)', 'EXECUTE'), 'correction helper not directly callable by authenticated');
select pg_temp.assert_true(not has_function_privilege('anon', 'public.private_assert_internal_cost_claim_correction(uuid)', 'EXECUTE'), 'correction helper not callable by anon');
select pg_temp.assert_true(not has_function_privilege('public', 'public.private_assert_internal_cost_claim_correction(uuid)', 'EXECUTE'), 'correction helper not callable by PUBLIC');
select pg_temp.assert_true((select proconfig @> array['search_path=pg_catalog, public'] from pg_proc where oid = 'public.cancel_internal_cost_claim(uuid,integer,text)'::regprocedure), 'cancel keeps a fixed search path');
select pg_temp.assert_true((select proconfig @> array['search_path=pg_catalog, public'] from pg_proc where oid = 'public.private_assert_internal_cost_claim_correction(uuid)'::regprocedure), 'correction helper keeps a fixed search path');

set local role authenticated;

-- ---------------------------------------------------------------------------
-- 1 & 10. Baseline while the project is still Ongoing: existing cancellation
-- behaviour must not regress.
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.principal_authorise_internal_cost_claim(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-01', 'crew', 'Baseline crew',
    'labour', 'Baseline cost', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"worker","unit_rate":500}]', null
  );
  claim := public.cancel_internal_cost_claim(claim.id, claim.version, 'Baseline: cancellation on an Ongoing project still works');
  perform pg_temp.assert_true(claim.lifecycle = 'cancelled' and claim.approved_total is null, 'Principal still cancels on an Ongoing project');
end; $$;

-- ---------------------------------------------------------------------------
-- Set up four claims while the project is Ongoing: two plain approved claims
-- (one for the manager-authority check, one for the core fix), one that will
-- carry a genuine recorded payment, one that will be historically settled, and
-- one left as an unsubmitted draft.
-- ---------------------------------------------------------------------------
do $$ declare claim public.internal_cost_claims; begin
  claim := public.principal_authorise_internal_cost_claim(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-04', 'crew', 'Duplicate crew',
    'labour', 'Duplicate Project Cost', '[{"description":"Labour","rate_type":"daily","quantity":8,"unit":"worker","unit_rate":500}]', null
  );
  perform set_config('test.correction.claim_a', claim.id::text, true);
  perform set_config('test.correction.claim_a_version', claim.version::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-05', 'crew', 'Paid crew',
    'labour', 'Genuinely paid cost', '[{"description":"Labour","rate_type":"daily","quantity":6,"unit":"worker","unit_rate":500}]', null
  );
  perform set_config('test.correction.claim_b', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-06', 'crew', 'Settled crew',
    'labour', 'Historically settled cost', '[{"description":"Labour","rate_type":"daily","quantity":4,"unit":"worker","unit_rate":500}]', null
  );
  perform set_config('test.correction.claim_c', claim.id::text, true);
end; $$;

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
do $$ declare claim public.internal_cost_claims; begin
  claim := public.create_internal_cost_claim_draft(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-07', 'crew', 'Draft crew',
    'labour', 'Still a draft when the project completes', '[{"description":"Labour","rate_type":"daily","quantity":2,"unit":"worker","unit_rate":500}]'
  );
  perform set_config('test.correction.claim_d', claim.id::text, true);
end; $$;

-- A genuine recorded payment on B, and a historical settlement on C — both
-- while the project is still Ongoing, exactly as they would be in production.
--
-- start_project_cost_payment_tracking already gave every claim approved above
-- a ledger row with history_complete = true, paid = 0, because a BRAND NEW
-- approval is observed from zero — that is correct and deliberate (see the
-- project_cost_payments migration). Only a claim approved BEFORE that trigger
-- existed is genuinely payment-history-unknown, which is exactly the state
-- Mark paid exists for. To exercise that here, claim C's auto-created ledger
-- row is removed before Mark paid runs, reproducing a grandfathered claim
-- without touching anything a real caller could not also reach: this DELETE
-- runs as the test superuser, never through an authenticated RPC.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
do $$ begin
  perform public.record_project_cost_payment(current_setting('test.correction.claim_b')::uuid, 1000, '2026-08-05', 'mpesa', 'REF-B', null, false);
end; $$;
reset role;
delete from public.project_cost_payment_ledgers where claim_id = current_setting('test.correction.claim_c')::uuid;
set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
do $$ begin
  perform public.mark_project_cost_paid(current_setting('test.correction.claim_c')::uuid, null);
end; $$;

-- ---------------------------------------------------------------------------
-- The project completes. Everything below happens on a Completed project.
-- ---------------------------------------------------------------------------
update public.projects set status = 'Completed' where id = '31000000-0000-0000-0000-000000000001';

-- 3. Manager does not gain new cancellation authority on the now-Completed
-- project. Claim A is untouched by the attempt.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
do $$ begin
  perform public.cancel_internal_cost_claim(current_setting('test.correction.claim_a')::uuid, current_setting('test.correction.claim_a_version')::integer, 'Manager attempt');
  raise exception 'expected manager cancellation rejection';
exception when insufficient_privilege then null; end; $$;
select pg_temp.assert_true((select lifecycle = 'approved' from public.internal_cost_claims where id = current_setting('test.correction.claim_a')::uuid), 'claim A untouched by the refused manager attempt');

-- 2, 8, 9. THE FIX: Principal cancels the approved duplicate on the Completed
-- project. Audited. Project status is not touched by the cancellation.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
do $$ declare claim public.internal_cost_claims; status_before text; begin
  select status into status_before from public.projects where id = '31000000-0000-0000-0000-000000000001';
  claim := public.cancel_internal_cost_claim(current_setting('test.correction.claim_a')::uuid, current_setting('test.correction.claim_a_version')::integer, 'Duplicate Project Cost — same underlying obligation entered twice.');
  perform pg_temp.assert_true(claim.lifecycle = 'cancelled' and claim.approved_total is null, 'Principal cancels an approved cost on a since-Completed project');
  perform pg_temp.assert_true((select count(*) = 1 from public.internal_cost_claim_events where claim_id = claim.id and event_type = 'cancelled' and reason = 'Duplicate Project Cost — same underlying obligation entered twice.'), 'Completed-project cancellation is audited with the given reason');
  perform pg_temp.assert_true((select status from public.projects where id = '31000000-0000-0000-0000-000000000001') = status_before, 'cancelling the claim does not mutate the project status');
end; $$;

-- 6. A genuinely paid cost stays protected: cancellation is refused until the
-- payment is reversed, exactly as on an Ongoing project.
do $$ begin
  perform public.cancel_internal_cost_claim((select id from public.internal_cost_claims where id = current_setting('test.correction.claim_b')::uuid), (select version from public.internal_cost_claims where id = current_setting('test.correction.claim_b')::uuid), 'Attempt to cancel a paid cost');
  raise exception 'expected payment-guard rejection';
exception when sqlstate 'BPC03' then null; end; $$;
select pg_temp.assert_true((select lifecycle = 'approved' from public.internal_cost_claims where id = current_setting('test.correction.claim_b')::uuid), 'genuinely paid claim B remains approved, not cancelled');

-- 7. A historically settled cost stays protected the same way.
do $$ begin
  perform public.cancel_internal_cost_claim((select id from public.internal_cost_claims where id = current_setting('test.correction.claim_c')::uuid), (select version from public.internal_cost_claims where id = current_setting('test.correction.claim_c')::uuid), 'Attempt to cancel a settled cost');
  raise exception 'expected settlement-guard rejection';
exception when sqlstate 'BPC03' then null; end; $$;
select pg_temp.assert_true((select lifecycle = 'approved' from public.internal_cost_claims where id = current_setting('test.correction.claim_c')::uuid), 'historically settled claim C remains approved, not cancelled');

-- 4 & 5. Creation and submission stay Ongoing-gated: they are new/advancing
-- expenditure, not a correction of something that already exists.
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000002', true);
do $$ begin
  perform public.create_internal_cost_claim_draft(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-09', 'crew', 'Blocked crew',
    'labour', 'New cost on a Completed project', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"worker","unit_rate":500}]'
  );
  raise exception 'expected creation-on-Completed rejection';
exception when invalid_parameter_value then null; end; $$;
do $$ begin
  perform public.submit_internal_cost_claim(current_setting('test.correction.claim_d')::uuid, 1);
  raise exception 'expected submission-on-Completed rejection';
exception when invalid_parameter_value then null; end; $$;
select pg_temp.assert_true((select lifecycle = 'draft' from public.internal_cost_claims where id = current_setting('test.correction.claim_d')::uuid), 'the pre-existing draft is still just a draft, unsubmitted');

select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);
do $$ begin
  perform public.principal_authorise_internal_cost_claim(
    '31000000-0000-0000-0000-000000000001', null, '2026-08-10', 'crew', 'Blocked direct crew',
    'labour', 'Direct authority on a Completed project', '[{"description":"Labour","rate_type":"daily","quantity":1,"unit":"worker","unit_rate":500}]', null
  );
  raise exception 'expected direct-authority-on-Completed rejection';
exception when invalid_parameter_value then null; end; $$;

-- Final confirmation: nothing in this script ever changed the project's
-- status away from what the test itself set.
select pg_temp.assert_true((select status from public.projects where id = '31000000-0000-0000-0000-000000000001') = 'Completed', 'project status is exactly what this test set it to, never anything else');

reset role;
rollback;
select 'internal cost claim correction tests passed' as result;
