-- BD-FIN-01C isolated PostgreSQL 17 release, reconciliation and authority matrix.
-- Every case is rolled back. Nothing here mutates production data, and no release is ever
-- fabricated for a historical fund request.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

create function pg_temp.owner() returns void language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true)::void
$$;
create function pg_temp.martine() returns void language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true)::void
$$;
create function pg_temp.other_manager() returns void language sql as $$
  select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true)::void
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@release.test'),
  ('00000000-0000-0000-0000-000000000002', 'manager@release.test'),
  ('00000000-0000-0000-0000-000000000003', 'other-manager@release.test'),
  ('00000000-0000-0000-0000-000000000004', 'staff@release.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'owner@release.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'manager@release.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000003', 'other-manager@release.test', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000004', 'staff@release.test', 'Staff', 'staff', true);

insert into public.projects (id, project_name, project_type, status, stage, archived, lead_person_id, portfolio_eligible, portfolio_permission_status) values
  ('10000000-0000-0000-0000-000000000001', 'Alego Usonga', 'Residential', 'Ongoing', 'Implementation', false, null, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000002', 'Lugulu', 'Residential', 'Ongoing', 'Implementation', false, '00000000-0000-0000-0000-000000000003', false, 'Not Reviewed');
insert into public.project_assignments (project_id, user_id, is_active) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true);

-- ---------------------------------------------------------------------------
-- Structural guarantees, before any row exists.
-- ---------------------------------------------------------------------------
select pg_temp.assert_true((
  select count(*) = 5 from pg_tables where schemaname = 'public'
    and tablename in ('fund_releases', 'fund_release_events', 'fund_acquittals',
      'fund_acquittal_lines', 'fund_acquittal_events')
), 'this slice introduces exactly the five release and reconciliation tables');

-- No client of any role may write money movement directly; every path is an RPC.
do $$
declare relation text;
begin
  foreach relation in array array['fund_releases', 'fund_release_events', 'fund_acquittals',
    'fund_acquittal_lines', 'fund_acquittal_events']
  loop
    perform pg_temp.assert_true(not has_table_privilege('authenticated', 'public.' || relation, 'INSERT'),
      relation || ' has no direct INSERT');
    perform pg_temp.assert_true(not has_table_privilege('authenticated', 'public.' || relation, 'UPDATE'),
      relation || ' has no direct UPDATE');
    perform pg_temp.assert_true(not has_table_privilege('authenticated', 'public.' || relation, 'DELETE'),
      relation || ' has no direct DELETE');
    perform pg_temp.assert_true(has_table_privilege('authenticated', 'public.' || relation, 'SELECT'),
      relation || ' is readable through RLS');
    perform pg_temp.assert_true((select relrowsecurity from pg_class where oid = ('public.' || relation)::regclass),
      relation || ' has RLS enabled');
    perform pg_temp.assert_true((select count(*) = 1 from pg_policies
      where schemaname = 'public' and tablename = relation and cmd = 'SELECT'),
      relation || ' has exactly one SELECT policy');
    perform pg_temp.assert_true((select count(*) = 0 from pg_policies
      where schemaname = 'public' and tablename = relation and cmd <> 'SELECT'),
      relation || ' has no write policy');
  end loop;
end;
$$;

select pg_temp.assert_true((
  select count(*) = 0 from pg_proc
  where pronamespace = 'public'::regnamespace
    and (proname like '%fund_release%' or proname like '%fund_acquittal%')
    and prosecdef
    and not (coalesce(proconfig, '{}') @> array['search_path=pg_catalog, public'])
), 'every new definer function pins a search path');

select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_fund_request_released_total(uuid)', 'EXECUTE'), 'released-total helper is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_replace_fund_acquittal_lines(uuid,jsonb)', 'EXECUTE'), 'line writer is private');
select pg_temp.assert_true(not has_function_privilege('authenticated', 'public.private_append_fund_release_event(public.fund_releases,text,text,text)', 'EXECUTE'), 'release event writer is private');
select pg_temp.assert_true(has_function_privilege('authenticated', 'public.record_fund_release(uuid,numeric,timestamptz,text,uuid,text,text,text,text)', 'EXECUTE'), 'record RPC is executable');
select pg_temp.assert_true(has_function_privilege('authenticated', 'public.fund_request_financial_position(uuid,uuid)', 'EXECUTE'), 'derived position is readable');

-- The settled separation: no 'paid' claim lifecycle, and no paid shortcut on fund_requests.
select pg_temp.assert_true((
  select pg_get_constraintdef(oid) not like '%paid%'
  from pg_constraint where conname = 'internal_cost_claims_lifecycle_check'
), 'no paid value was added to the claim lifecycle');
select pg_temp.assert_true((
  select count(*) = 0 from information_schema.columns
  where table_schema = 'public' and table_name = 'fund_requests'
    and (column_name like '%paid%' or column_name like '%released%' or column_name like '%reconcil%')
), 'fund_requests gained no payment or reconciliation column');

-- ---------------------------------------------------------------------------
-- Approved claims and approved fund authorities that back the matrix.
-- ---------------------------------------------------------------------------
set local role authenticated;
select pg_temp.owner();

do $$
declare claim public.internal_cost_claims;
begin
  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-05', 'crew', 'Alego casual workers',
    'labour', 'Sixteen casual workers for the day',
    '[{"description":"Casual worker day","rate_type":"daily","quantity":16,"unit":"worker","unit_rate":500}]',
    'Approved day labour');
  perform set_config('test.claim_advance', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-05', 'supplier', 'Murram supplier',
    'materials', 'Murram delivered to site',
    '[{"description":"Murram","rate_type":"lump_sum","quantity":1,"unit":"delivery","unit_rate":20000}]',
    'Approved murram');
  perform set_config('test.claim_direct', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-06', 'crew', 'Second crew',
    'labour', 'Crew for the multi-release matrix',
    '[{"description":"Crew day","rate_type":"daily","quantity":20,"unit":"worker","unit_rate":500}]',
    'Approved second crew');
  perform set_config('test.claim_multi', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-07', 'crew', 'Historical crew',
    'labour', 'Claim behind the historical approved-but-unpaid authority',
    '[{"description":"Crew day","rate_type":"daily","quantity":8,"unit":"worker","unit_rate":500}]',
    'Approved historical');
  perform set_config('test.claim_historical', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-08', 'crew', 'Variance crew',
    'labour', 'Claim behind the unresolved-variance advance',
    '[{"description":"Crew day","rate_type":"daily","quantity":10,"unit":"worker","unit_rate":500}]',
    'Approved variance crew');
  perform set_config('test.claim_variance', claim.id::text, true);

  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-08', 'crew', 'Returned crew',
    'labour', 'Claim behind the partly returned advance',
    '[{"description":"Crew day","rate_type":"daily","quantity":10,"unit":"worker","unit_rate":500}]',
    'Approved returned crew');
  perform set_config('test.claim_returned', claim.id::text, true);
end;
$$;

-- Approved fund authorities, all via Principal direct authority so the matrix starts from an
-- approved state without re-testing the BD-FIN-01B1 lifecycle.
do $$
declare request public.fund_requests;
begin
  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Advance to Martine for the day labour',
    format('[{"claim_id":"%s","requested_amount":8000}]', current_setting('test.claim_advance'))::jsonb,
    'Direct authority for the advance matrix');
  perform set_config('test.request_advance', request.id::text, true);

  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null,
    'Botanique pays the murram supplier directly',
    format('[{"claim_id":"%s","requested_amount":20000}]', current_setting('test.claim_direct'))::jsonb,
    'Direct authority for the supplier matrix');
  perform set_config('test.request_direct', request.id::text, true);

  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Advance released in instalments',
    format('[{"claim_id":"%s","requested_amount":10000}]', current_setting('test.claim_multi'))::jsonb,
    'Direct authority for the multi-release matrix');
  perform set_config('test.request_multi', request.id::text, true);

  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Historical authority that was never released',
    format('[{"claim_id":"%s","requested_amount":4000}]', current_setting('test.claim_historical'))::jsonb,
    'Direct authority standing in for pre-BD-FIN-01C history');
  perform set_config('test.request_historical', request.id::text, true);

  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Advance that will carry an unresolved variance',
    format('[{"claim_id":"%s","requested_amount":5000}]', current_setting('test.claim_variance'))::jsonb,
    'Direct authority for the variance matrix');
  perform set_config('test.request_variance', request.id::text, true);

  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Advance partly spent and partly returned',
    format('[{"claim_id":"%s","requested_amount":5000}]', current_setting('test.claim_returned'))::jsonb,
    'Direct authority for the returned-money matrix');
  perform set_config('test.request_returned', request.id::text, true);
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 1 and SCENARIO 12 — approved with no release reads approved / unpaid.
-- This is also exactly how every fund request approved before this migration reads, with no
-- backfill of any kind.
-- ---------------------------------------------------------------------------
do $$
declare p record;
begin
  select * into p from public.fund_request_financial_position(null, current_setting('test.request_historical')::uuid);
  perform pg_temp.assert_true(p.authorised_amount = 4000, 'historical authority is 4,000');
  perform pg_temp.assert_true(p.released_amount = 0, 'nothing has been released');
  perform pg_temp.assert_true(p.remaining_releasable_amount = 4000, 'the whole authority remains releasable');
  perform pg_temp.assert_true(p.release_count = 0, 'no release rows exist');
  perform pg_temp.assert_true(p.release_state = 'none', 'release state is none');
  perform pg_temp.assert_true(p.reconciliation_state = 'not_required', 'nothing is owed an acquittal yet');
  perform pg_temp.assert_true(p.financial_position = 'approved_unpaid', 'approved but unpaid');
end;
$$;

select pg_temp.assert_true((
  select count(*) = 0 from public.fund_releases
), 'no release row is fabricated merely because authorities are approved');

-- ---------------------------------------------------------------------------
-- SCENARIO 9 — Operations cannot fabricate a release event.
-- ---------------------------------------------------------------------------
select pg_temp.martine();
do $$
declare failed boolean := false;
begin
  begin
    perform public.record_fund_release(
      current_setting('test.request_advance')::uuid, 8000, now(),
      'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
      null, 'cash', null, 'Manager attempting to pay themselves');
  exception when insufficient_privilege then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'an Operations Manager cannot record a release');
end;
$$;

-- Nor by writing the table directly, whatever the role.
do $$
declare failed boolean := false;
begin
  begin
    insert into public.fund_releases (
      fund_request_id, custody_disposition, recipient_profile_id, released_amount,
      released_at, payment_channel, recorded_by
    ) values (
      current_setting('test.request_advance')::uuid, 'operations_manager_accountable_advance',
      '00000000-0000-0000-0000-000000000002', 8000, now(), 'cash',
      '00000000-0000-0000-0000-000000000002');
  exception when insufficient_privilege then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'no direct INSERT into fund_releases is possible');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 10 — the Principal records a release, under the intended authority.
-- SCENARIO 2 — one partial release reads partially funded.
-- ---------------------------------------------------------------------------
select pg_temp.owner();
do $$
declare release public.fund_releases; p record;
begin
  release := public.record_fund_release(
    current_setting('test.request_multi')::uuid, 4000, now() - interval '2 hours',
    'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
    null, 'mpesa', 'QGH7X2LMNP', 'First instalment');
  perform pg_temp.assert_true(release.status = 'recorded', 'the release is recorded');
  perform pg_temp.assert_true(release.release_number ~ '^BDRL-[0-9]{4}-[0-9]{6}$', 'human-readable release number');
  perform pg_temp.assert_true(release.recorded_by = auth.uid(), 'the recording Principal is stamped');
  perform pg_temp.assert_true(release.recipient_profile_id = '00000000-0000-0000-0000-000000000002', 'the accountable person is named');
  perform pg_temp.assert_true(release.recipient_label is null, 'an advance carries no free-text payee');
  perform pg_temp.assert_true(release.payment_reference = 'QGH7X2LMNP', 'the payment reference is kept');
  perform pg_temp.assert_true(release.receipt_confirmed_at is null, 'receipt confirmation is not forced');
  perform pg_temp.assert_true((select count(*) = 1 from public.fund_release_events
    where fund_release_id = release.id and event_type = 'recorded'), 'a recorded event is appended');
  perform set_config('test.release_multi_one', release.id::text, true);

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_multi')::uuid);
  perform pg_temp.assert_true(p.released_amount = 4000, 'released total is 4,000');
  perform pg_temp.assert_true(p.remaining_releasable_amount = 6000, '6,000 remains releasable');
  perform pg_temp.assert_true(p.release_state = 'partially_released', 'release state is partial');
  -- An advance not yet accounted for outranks partial funding in what the reader must act on.
  perform pg_temp.assert_true(p.reconciliation_state = 'outstanding', 'the advance is outstanding');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 3 — multiple releases aggregate correctly.
-- SCENARIO 11 — a duplicate or concurrent attempt cannot exceed the authority.
-- SCENARIO 4 — aggregate over-release is rejected safely.
-- ---------------------------------------------------------------------------
do $$
declare release public.fund_releases; p record; failed boolean := false;
begin
  release := public.record_fund_release(
    current_setting('test.request_multi')::uuid, 6000, now() - interval '1 hour',
    'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
    null, 'cash', null, 'Second instalment');
  perform set_config('test.release_multi_two', release.id::text, true);

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_multi')::uuid);
  perform pg_temp.assert_true(p.released_amount = 10000, 'two releases aggregate to 10,000');
  perform pg_temp.assert_true(p.release_count = 2, 'both releases are counted');
  perform pg_temp.assert_true(p.remaining_releasable_amount = 0, 'nothing remains releasable');
  perform pg_temp.assert_true(p.release_state = 'fully_released', 'release state is full');

  -- A third release, or a duplicate submission of the second, has nothing left to draw on.
  begin
    perform public.record_fund_release(
      current_setting('test.request_multi')::uuid, 1, now(),
      'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
      null, 'cash', null, 'One shilling too far');
  exception when others then
    failed := sqlstate = 'BDF02';
  end;
  perform pg_temp.assert_true(failed, 'aggregate releases cannot exceed the approved authority');

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_multi')::uuid);
  perform pg_temp.assert_true(p.released_amount = 10000, 'the rejected attempt left the total untouched');
end;
$$;

-- A single release larger than the whole authority is refused the same way.
do $$
declare failed boolean := false;
begin
  begin
    perform public.record_fund_release(
      current_setting('test.request_advance')::uuid, 8000.01, now(),
      'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
      null, 'cash', null, 'Over by one cent');
  exception when others then failed := sqlstate = 'BDF02';
  end;
  perform pg_temp.assert_true(failed, 'a single over-release is refused');
end;
$$;

-- The database-level backstop stands even if a future call site forgets the check.
select pg_temp.assert_true((
  select count(*) = 1 from pg_trigger
  where tgrelid = 'public.fund_releases'::regclass and tgname = 'fund_releases_within_authority'
), 'the no-over-release constraint trigger exists');

-- Releasing against an authority that is not approved is refused.
do $$
declare failed boolean := false;
begin
  begin
    perform public.record_fund_release(
      (select id from public.fund_requests where status <> 'approved' limit 1),
      100, now(), 'direct_recipient_funding', null, 'Anyone', 'cash', null, null);
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'only an approved authority may carry a release');
end;
$$;

-- An advance may not be redirected away from the custodian the authority names.
do $$
declare failed boolean := false;
begin
  begin
    perform public.record_fund_release(
      current_setting('test.request_advance')::uuid, 1000, now(),
      'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000003',
      null, 'cash', null, 'Wrong custodian');
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'an advance cannot be redirected to a different custodian');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 8 — a direct supplier payment demands no fictional Martine acquittal.
-- ---------------------------------------------------------------------------
do $$
declare release public.fund_releases; p record; failed boolean := false;
begin
  release := public.record_fund_release(
    current_setting('test.request_direct')::uuid, 20000, now() - interval '3 hours',
    'direct_recipient_funding', null, 'Murram supplier — Siaya Hardware',
    'bank_transfer', 'FT26080912345', 'Paid the supplier directly');
  perform pg_temp.assert_true(release.recipient_profile_id is null, 'a direct payment names no custodian');
  perform pg_temp.assert_true(release.recipient_label = 'Murram supplier — Siaya Hardware', 'the payee is named');
  perform set_config('test.release_direct', release.id::text, true);

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_direct')::uuid);
  perform pg_temp.assert_true(p.released_amount = 20000, 'the supplier payment is the full authority');
  perform pg_temp.assert_true(p.direct_paid_amount = 20000, 'it is counted as a direct settled payment');
  perform pg_temp.assert_true(p.advance_released_amount = 0, 'no accountable advance exists here');
  perform pg_temp.assert_true(p.release_state = 'fully_released', 'fully released');
  -- The decisive assertion for Founder ruling D3.
  perform pg_temp.assert_true(p.reconciliation_state = 'not_required', 'no acquittal is required');
  perform pg_temp.assert_true(p.financial_position = 'financially_settled',
    'a fully paid direct settlement is financially settled without any acquittal');
end;
$$;

-- And Martine cannot be made to acquit money he never received, even if he tries.
select pg_temp.martine();
do $$
declare failed boolean := false;
begin
  begin
    perform public.submit_fund_acquittal(
      current_setting('test.release_direct')::uuid, 1,
      '[{"description":"Murram","category":"materials","amount":20000,"spent_on":"2026-08-09"}]'::jsonb,
      0, null, null);
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'a direct settled payment is not reconciled by an advance acquittal');
end;
$$;

do $$
declare failed boolean := false;
begin
  begin
    perform public.confirm_fund_release_receipt(current_setting('test.release_direct')::uuid, 1);
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'nobody is asked to acknowledge receiving a direct supplier payment');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 5 — an accountable advance fully spent reconciles to zero variance.
-- ---------------------------------------------------------------------------
select pg_temp.owner();
do $$
declare release public.fund_releases;
begin
  release := public.record_fund_release(
    current_setting('test.request_advance')::uuid, 8000, now() - interval '5 hours',
    'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
    null, 'mpesa', 'QGH8Y3PQRS', 'Advance for the day');
  perform set_config('test.release_advance', release.id::text, true);
  perform set_config('test.release_advance_version', release.version::text, true);
end;
$$;

-- The recipient may acknowledge receipt. It is optional, and only they can do it.
select pg_temp.other_manager();
do $$
declare failed boolean := false;
begin
  begin
    perform public.confirm_fund_release_receipt(
      current_setting('test.release_advance')::uuid,
      current_setting('test.release_advance_version')::integer);
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'only the accountable person may confirm receiving the advance');
end;
$$;

select pg_temp.martine();
do $$
declare release public.fund_releases; acquittal public.fund_acquittals; p record;
begin
  release := public.confirm_fund_release_receipt(
    current_setting('test.release_advance')::uuid,
    current_setting('test.release_advance_version')::integer);
  perform pg_temp.assert_true(release.receipt_confirmed_by = '00000000-0000-0000-0000-000000000002', 'receipt is acknowledged by the holder');
  perform pg_temp.assert_true(release.receipt_confirmed_at is not null, 'the acknowledgement is timestamped');
  perform pg_temp.assert_true((select count(*) = 1 from public.fund_release_events
    where fund_release_id = release.id and event_type = 'receipt_confirmed'), 'the acknowledgement is in history');

  acquittal := public.submit_fund_acquittal(
    release.id, release.version,
    '[{"description":"Sixteen casual workers","category":"labour","amount":8000,"spent_on":"2026-08-05"}]'::jsonb,
    0, 'M-Pesa statement 5 Aug', 'Everything was spent on the day labour');
  perform pg_temp.assert_true(acquittal.state = 'submitted', 'the reconciliation is submitted');
  perform pg_temp.assert_true(acquittal.released_amount_snapshot = 8000, 'it accounts for the released amount');
  perform pg_temp.assert_true(acquittal.actual_spend_total = 8000, 'actual spend is the sum of the lines');
  perform pg_temp.assert_true(acquittal.returned_amount = 0, 'nothing was returned');
  perform pg_temp.assert_true(acquittal.variance_amount = 0, 'the advance balances exactly');
  perform pg_temp.assert_true(acquittal.submitted_by = auth.uid(), 'the submitter is stamped');
  perform set_config('test.acquittal_advance', acquittal.id::text, true);
  perform set_config('test.acquittal_advance_version', acquittal.version::text, true);

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_advance')::uuid);
  perform pg_temp.assert_true(p.actual_spend_amount = 8000, 'actual expenditure is visible on the position');
  perform pg_temp.assert_true(p.reconciliation_state = 'submitted', 'awaiting the Principal');
  perform pg_temp.assert_true(p.financial_position = 'reconciliation_submitted', 'paid, accounted for, not yet accepted');
end;
$$;

-- The person who spent the money cannot certify their own spending.
do $$
declare failed boolean := false;
begin
  begin
    perform public.decide_fund_acquittal(
      current_setting('test.acquittal_advance')::uuid,
      current_setting('test.acquittal_advance_version')::integer, 'accepted', null);
  exception when insufficient_privilege then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'the custodian cannot accept their own reconciliation');
end;
$$;

select pg_temp.owner();
do $$
declare acquittal public.fund_acquittals; p record;
begin
  acquittal := public.decide_fund_acquittal(
    current_setting('test.acquittal_advance')::uuid,
    current_setting('test.acquittal_advance_version')::integer, 'accepted', null);
  perform pg_temp.assert_true(acquittal.state = 'accepted', 'the Principal accepted it');
  perform pg_temp.assert_true(acquittal.accepted_by = auth.uid(), 'the accepting Principal is stamped');
  -- A balanced reconciliation needs no override reason, because nothing abnormal was closed.
  perform pg_temp.assert_true(acquittal.variance_override_reason is null, 'no override was needed');

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_advance')::uuid);
  perform pg_temp.assert_true(p.release_state = 'fully_released', 'fully released');
  perform pg_temp.assert_true(p.reconciliation_state = 'accepted', 'fully reconciled');
  perform pg_temp.assert_true(p.financial_position = 'financially_settled', 'financially settled');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 6 — unspent money returned is represented truthfully.
-- ---------------------------------------------------------------------------
select pg_temp.owner();
do $$
declare release public.fund_releases;
begin
  release := public.record_fund_release(
    current_setting('test.request_returned')::uuid, 5000, now() - interval '4 hours',
    'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
    null, 'cash', null, 'Advance for transport');
  perform set_config('test.release_returned', release.id::text, true);
  perform set_config('test.release_returned_version', release.version::text, true);
end;
$$;

select pg_temp.martine();
do $$
declare acquittal public.fund_acquittals; p record;
begin
  acquittal := public.submit_fund_acquittal(
    current_setting('test.release_returned')::uuid,
    current_setting('test.release_returned_version')::integer,
    '[{"description":"Mkokoteni cartage","category":"cart_transport","amount":3200,"spent_on":"2026-08-08"}]'::jsonb,
    1800, 'Cash returned to the Principal on 8 Aug', 'Three trips were enough');
  perform pg_temp.assert_true(acquittal.actual_spend_total = 3200, 'actual spend is 3,200');
  perform pg_temp.assert_true(acquittal.returned_amount = 1800, 'the unspent 1,800 was returned');
  -- 5000 released - 3200 spent - 1800 returned = 0. Nothing is unaccounted for.
  perform pg_temp.assert_true(acquittal.variance_amount = 0, 'returned money closes the position exactly');
  perform set_config('test.acquittal_returned', acquittal.id::text, true);
  perform set_config('test.acquittal_returned_version', acquittal.version::text, true);
end;
$$;

select pg_temp.owner();
do $$
declare p record;
begin
  perform public.decide_fund_acquittal(
    current_setting('test.acquittal_returned')::uuid,
    current_setting('test.acquittal_returned_version')::integer, 'accepted', null);
  select * into p from public.fund_request_financial_position(null, current_setting('test.request_returned')::uuid);
  perform pg_temp.assert_true(p.released_amount = 5000, 'the released amount is unchanged by the return');
  perform pg_temp.assert_true(p.actual_spend_amount = 3200, 'actual project expenditure is 3,200, not 5,000');
  perform pg_temp.assert_true(p.returned_amount = 1800, 'the returned amount is visible');
  perform pg_temp.assert_true(p.variance_amount = 0, 'no variance remains');
  perform pg_temp.assert_true(p.financial_position = 'financially_settled', 'financially settled');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 7 — an advance with unresolved variance is NOT financially settled.
-- ---------------------------------------------------------------------------
select pg_temp.owner();
do $$
declare release public.fund_releases;
begin
  release := public.record_fund_release(
    current_setting('test.request_variance')::uuid, 5000, now() - interval '6 hours',
    'operations_manager_accountable_advance', '00000000-0000-0000-0000-000000000002',
    null, 'cash', null, 'Advance that will not balance');
  perform set_config('test.release_variance', release.id::text, true);
  perform set_config('test.release_variance_version', release.version::text, true);
end;
$$;

select pg_temp.martine();
do $$
declare acquittal public.fund_acquittals; p record;
begin
  acquittal := public.submit_fund_acquittal(
    current_setting('test.release_variance')::uuid,
    current_setting('test.release_variance_version')::integer,
    '[{"description":"Casual labour","category":"labour","amount":3500,"spent_on":"2026-08-08"}]'::jsonb,
    0, null, 'The rest is still with me');
  -- 5000 - 3500 - 0 = 1500 released but neither spent nor returned.
  perform pg_temp.assert_true(acquittal.variance_amount = 1500, 'the unaccounted 1,500 is the variance');
  perform set_config('test.acquittal_variance', acquittal.id::text, true);
  perform set_config('test.acquittal_variance_version', acquittal.version::text, true);

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_variance')::uuid);
  perform pg_temp.assert_true(p.release_state = 'fully_released', 'the authority is fully released');
  perform pg_temp.assert_true(p.variance_amount = 1500, 'the variance is visible on the position');
  perform pg_temp.assert_true(p.financial_position <> 'financially_settled',
    'paid and accounted for is still not settled while a decision is outstanding');
  perform pg_temp.assert_true(p.financial_position = 'reconciliation_submitted', 'it is awaiting the Principal');
end;
$$;

-- An abnormal position may not be closed silently: the reason is mandatory and stays visible.
select pg_temp.owner();
do $$
declare failed boolean := false; acquittal public.fund_acquittals; p record;
begin
  begin
    perform public.decide_fund_acquittal(
      current_setting('test.acquittal_variance')::uuid,
      current_setting('test.acquittal_variance_version')::integer, 'accepted', null);
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'accepting a variance without a reason is refused');

  acquittal := public.decide_fund_acquittal(
    current_setting('test.acquittal_variance')::uuid,
    current_setting('test.acquittal_variance_version')::integer, 'accepted',
    'KES 1,500 carried forward to the next advance by agreement');
  perform pg_temp.assert_true(acquittal.variance_override_reason is not null, 'the override reason is stored');
  perform pg_temp.assert_true(acquittal.variance_amount = 1500, 'the variance is not silently zeroed');
  perform pg_temp.assert_true((select count(*) = 1 from public.fund_acquittal_events
    where acquittal_id = acquittal.id and event_type = 'accepted'
      and reason = 'KES 1,500 carried forward to the next advance by agreement'),
    'the override reason is permanently visible in history');

  select * into p from public.fund_request_financial_position(null, current_setting('test.request_variance')::uuid);
  perform pg_temp.assert_true(p.variance_amount = 1500, 'the closed variance is still reported');
  perform pg_temp.assert_true(p.financial_position = 'financially_settled', 'a deliberately closed position is settled');
end;
$$;

-- Spending more than was released is representable as an additional amount required.
select pg_temp.owner();
do $$
declare claim public.internal_cost_claims; request public.fund_requests; release public.fund_releases;
begin
  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-09', 'crew', 'Overspend crew',
    'labour', 'Claim behind the overspend matrix',
    '[{"description":"Crew day","rate_type":"daily","quantity":6,"unit":"worker","unit_rate":500}]',
    'Approved overspend crew');
  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Advance smaller than the eventual spend',
    format('[{"claim_id":"%s","requested_amount":3000}]', claim.id)::jsonb, 'Direct authority');
  release := public.record_fund_release(
    request.id, 3000, now(), 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', null, 'cash', null, null);
  perform set_config('test.release_overspend', release.id::text, true);
  perform set_config('test.release_overspend_version', release.version::text, true);
end;
$$;

select pg_temp.martine();
do $$
declare acquittal public.fund_acquittals;
begin
  acquittal := public.submit_fund_acquittal(
    current_setting('test.release_overspend')::uuid,
    current_setting('test.release_overspend_version')::integer,
    '[{"description":"Casual labour","category":"labour","amount":3000,"spent_on":"2026-08-09"},
      {"description":"Extra hand hired on site","category":"labour","amount":800,"spent_on":"2026-08-09"}]'::jsonb,
    0, null, 'I paid the extra hand from my own pocket');
  perform pg_temp.assert_true(acquittal.actual_spend_total = 3800, 'actual spend exceeded the advance');
  -- 3000 - 3800 - 0 = -800. A negative variance is the additional amount legitimately required.
  perform pg_temp.assert_true(acquittal.variance_amount = -800, 'an additional 800 is legitimately required');
end;
$$;

-- ---------------------------------------------------------------------------
-- The amendment round, and SCENARIO 13 — correction preserves audit history.
-- ---------------------------------------------------------------------------
select pg_temp.owner();
do $$
declare claim public.internal_cost_claims; request public.fund_requests; release public.fund_releases;
begin
  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-09', 'crew', 'Amendment crew',
    'labour', 'Claim behind the amendment round',
    '[{"description":"Crew day","rate_type":"daily","quantity":4,"unit":"worker","unit_rate":500}]',
    'Approved amendment crew');
  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', 'Advance that will be sent back once',
    format('[{"claim_id":"%s","requested_amount":2000}]', claim.id)::jsonb, 'Direct authority');
  release := public.record_fund_release(
    request.id, 2000, now(), 'operations_manager_accountable_advance',
    '00000000-0000-0000-0000-000000000002', null, 'cash', null, null);
  perform set_config('test.request_amend', request.id::text, true);
  perform set_config('test.release_amend', release.id::text, true);
  perform set_config('test.release_amend_version', release.version::text, true);
end;
$$;

select pg_temp.martine();
do $$
declare acquittal public.fund_acquittals;
begin
  acquittal := public.submit_fund_acquittal(
    current_setting('test.release_amend')::uuid,
    current_setting('test.release_amend_version')::integer,
    '[{"description":"Vague spend","category":"other","amount":2000,"spent_on":"2026-08-09"}]'::jsonb,
    0, null, null);
  perform set_config('test.acquittal_amend', acquittal.id::text, true);
  perform set_config('test.acquittal_amend_version', acquittal.version::text, true);
end;
$$;

select pg_temp.owner();
do $$
declare acquittal public.fund_acquittals; p record;
begin
  acquittal := public.decide_fund_acquittal(
    current_setting('test.acquittal_amend')::uuid,
    current_setting('test.acquittal_amend_version')::integer,
    'amendment_requested', 'Please itemise what the 2,000 was actually spent on');
  perform pg_temp.assert_true(acquittal.state = 'amendment_requested', 'the reconciliation went back');
  perform set_config('test.acquittal_amend_version', acquittal.version::text, true);
  select * into p from public.fund_request_financial_position(null, current_setting('test.request_amend')::uuid);
  perform pg_temp.assert_true(p.financial_position = 'reconciliation_amendment_requested', 'the position reflects the amendment');
end;
$$;

select pg_temp.martine();
do $$
declare acquittal public.fund_acquittals;
begin
  acquittal := public.submit_fund_acquittal(
    current_setting('test.release_amend')::uuid,
    current_setting('test.acquittal_amend_version')::integer,
    '[{"description":"Two casual workers","category":"labour","amount":1000,"spent_on":"2026-08-09"},
      {"description":"Water bowser","category":"transport","amount":1000,"spent_on":"2026-08-09"}]'::jsonb,
    0, 'Receipts held on site', null);
  perform pg_temp.assert_true(acquittal.state = 'submitted', 'the corrected reconciliation is resubmitted');
  perform pg_temp.assert_true(acquittal.actual_spend_total = 2000, 'the corrected total still balances');
  perform pg_temp.assert_true((select count(*) = 2 from public.fund_acquittal_lines
    where acquittal_id = acquittal.id), 'the itemised lines replaced the vague one');
  -- Every round is preserved: submitted, amendment_requested, resubmitted.
  perform pg_temp.assert_true((select count(*) = 3 from public.fund_acquittal_events
    where acquittal_id = acquittal.id), 'all three rounds remain in history');
  perform pg_temp.assert_true((select count(*) = 1 from public.fund_acquittal_events
    where acquittal_id = acquittal.id and event_type = 'amendment_requested'
      and reason = 'Please itemise what the 2,000 was actually spent on'),
    'the amendment reason survives the correction');
end;
$$;

-- Reversal is the correction path for money movement, and history survives it.
select pg_temp.owner();
do $$
declare claim public.internal_cost_claims; request public.fund_requests;
  release public.fund_releases; p record;
begin
  claim := public.principal_authorise_internal_cost_claim(
    '10000000-0000-0000-0000-000000000001', null, '2026-08-09', 'supplier', 'Mistaken payee',
    'supplier_cost', 'Claim behind the reversal matrix',
    '[{"description":"Supply","rate_type":"lump_sum","quantity":1,"unit":"delivery","unit_rate":2500}]',
    'Approved reversal claim');
  request := public.direct_authorise_fund_request(
    '10000000-0000-0000-0000-000000000001', 'direct_recipient_funding', null,
    'Authority behind a release recorded in error',
    format('[{"claim_id":"%s","requested_amount":2500}]', claim.id)::jsonb, 'Direct authority');
  release := public.record_fund_release(
    request.id, 2500, now(), 'direct_recipient_funding', null, 'Wrong supplier',
    'mpesa', 'QGH9Z4TUVW', 'Recorded against the wrong payee');

  release := public.reverse_fund_release(release.id, release.version, 'Recorded against the wrong payee');
  perform pg_temp.assert_true(release.status = 'reversed', 'the release is reversed, not deleted');
  perform pg_temp.assert_true(release.reversal_reason = 'Recorded against the wrong payee', 'the reason is stored');
  perform pg_temp.assert_true(release.released_amount = 2500, 'the original amount is still readable');
  perform pg_temp.assert_true((select count(*) = 2 from public.fund_release_events
    where fund_release_id = release.id), 'both the record and the reversal remain in history');

  select * into p from public.fund_request_financial_position(null, request.id);
  perform pg_temp.assert_true(p.released_amount = 0, 'a reversed release holds no money');
  perform pg_temp.assert_true(p.reversed_release_count = 1, 'the reversal is still counted');
  perform pg_temp.assert_true(p.remaining_releasable_amount = 2500, 'the authority is releasable again');
  perform pg_temp.assert_true(p.financial_position = 'approved_unpaid', 'the authority reads approved and unpaid again');

  -- And the corrected release can now be recorded against the right payee.
  release := public.record_fund_release(
    request.id, 2500, now(), 'direct_recipient_funding', null, 'Correct supplier',
    'mpesa', 'QGH9Z4TUVX', 'Corrected payee');
  perform pg_temp.assert_true(release.status = 'recorded', 'the corrected release stands');
end;
$$;

-- Money that moved is never rewritten or deleted in place.
do $$
declare failed boolean := false;
begin
  begin
    update public.fund_releases set released_amount = 1 where id = current_setting('test.release_advance')::uuid;
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'a recorded release amount cannot be edited');
end;
$$;

do $$
declare failed boolean := false;
begin
  begin
    delete from public.fund_release_events where fund_release_id = current_setting('test.release_advance')::uuid;
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'release events are immutable');
end;
$$;

-- A release with a reconciliation against it cannot be reversed out from under it.
do $$
declare failed boolean := false;
begin
  begin
    perform public.reverse_fund_release(
      current_setting('test.release_advance')::uuid,
      (select version from public.fund_releases where id = current_setting('test.release_advance')::uuid),
      'Trying to reverse accounted-for money');
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'an accounted-for release cannot be reversed');
end;
$$;

-- An approved authority with real money against it cannot be cancelled.
do $$
declare failed boolean := false;
begin
  begin
    perform public.cancel_fund_request(
      current_setting('test.request_advance')::uuid,
      (select version from public.fund_requests where id = current_setting('test.request_advance')::uuid),
      'Trying to cancel a paid authority');
  exception when others then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'an authority with money released against it cannot be cancelled');
end;
$$;

-- ---------------------------------------------------------------------------
-- SCENARIO 14 — Daily Site Record operational state is independent of financial settlement.
-- ---------------------------------------------------------------------------
select pg_temp.assert_true((
  select count(*) = 0 from information_schema.columns
  where table_schema = 'public' and table_name = 'daily_site_entries'
    and (column_name like '%release%' or column_name like '%acquittal%'
      or column_name like '%reconcil%' or column_name like '%settle%')
), 'the Daily Site Record gained no financial column and did not become the ledger');

select pg_temp.assert_true((
  select count(*) = 0 from pg_constraint
  where conrelid = 'public.daily_site_entries'::regclass
    and pg_get_constraintdef(oid) like '%fund_release%'
), 'no Daily Site Record constraint depends on a release');

-- An entry reaches its own terminal operational state with financial follow-up outstanding.
select pg_temp.owner();
do $$
declare entry_state text;
begin
  -- test.request_variance is fully released and carries a variance. Nothing about it can
  -- reach into daily_site_entries, which is the point.
  perform pg_temp.assert_true(
    (select release_state from public.fund_request_financial_position(
      null, current_setting('test.request_multi')::uuid)) = 'fully_released',
    'the multi-release authority is fully released');
  perform pg_temp.assert_true(
    (select reconciliation_state from public.fund_request_financial_position(
      null, current_setting('test.request_multi')::uuid)) = 'outstanding',
    'and its advances are still unreconciled');
  -- No trigger, constraint or function anywhere makes that block an operational close.
  select count(*)::text into entry_state from pg_trigger
  where tgrelid = 'public.daily_site_entries'::regclass
    and tgname like '%release%';
  perform pg_temp.assert_true(entry_state = '0', 'no release trigger was added to the Daily Site Record');
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: an Operations Manager sees only their own projects, and Staff sees nothing.
-- ---------------------------------------------------------------------------
select pg_temp.other_manager();
select pg_temp.assert_true((
  select count(*) = 0 from public.fund_releases
), 'a manager with no assignment on the project sees no release');
select pg_temp.assert_true((
  select count(*) = 0 from public.fund_acquittals
), 'a manager with no assignment on the project sees no reconciliation');
select pg_temp.assert_true((
  select count(*) = 0 from public.fund_request_financial_position()
), 'a manager with no assignment on the project derives no position');

select pg_temp.martine();
select pg_temp.assert_true((
  select count(*) > 0 from public.fund_releases
), 'the assigned Operations Manager sees the releases on their project');
select pg_temp.assert_true((
  select bool_and(request.project_id = '10000000-0000-0000-0000-000000000001')
  from public.fund_releases release
  join public.fund_requests request on request.id = release.fund_request_id
), 'and only on their project');
select pg_temp.assert_true((
  select count(*) > 0 from public.fund_acquittal_lines
), 'the accountable manager can read their own expenditure lines');

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true);
select pg_temp.assert_true((select count(*) = 0 from public.fund_releases), 'Staff sees no release');
select pg_temp.assert_true((select count(*) = 0 from public.fund_acquittals), 'Staff sees no reconciliation');
select pg_temp.assert_true((select count(*) = 0 from public.fund_acquittal_lines), 'Staff sees no expenditure');
select pg_temp.assert_true((select count(*) = 0 from public.fund_request_financial_position()), 'Staff derives no position');

do $$
declare failed boolean := false;
begin
  begin
    perform public.record_fund_release(
      current_setting('test.request_historical')::uuid, 100, now(),
      'direct_recipient_funding', null, 'Anyone', 'cash', null, null);
  exception when insufficient_privilege then failed := true;
  end;
  perform pg_temp.assert_true(failed, 'Staff cannot record a release');
end;
$$;

-- ---------------------------------------------------------------------------
-- The existing claim and fund-request lifecycles are untouched by all of the above.
-- ---------------------------------------------------------------------------
reset role;
select pg_temp.assert_true((
  select count(*) = 0 from public.internal_cost_claims where lifecycle not in (
    'draft', 'awaiting_review', 'amendment_requested', 'approved', 'rejected', 'withdrawn', 'cancelled')
), 'no new claim lifecycle value appeared');
select pg_temp.assert_true((
  select count(*) = 0 from public.fund_requests where status not in (
    'draft', 'submitted', 'amendment_requested', 'approved', 'rejected', 'withdrawn', 'cancelled')
), 'no new fund request status appeared');

select 'BD-FIN-01C release and reconciliation matrix passed' as result;

rollback;
