-- BD-FIN-01A regression: superseding an accepted Daily Site Record must not
-- strand an already-existing Project Cost that preserves that original row as
-- its provenance. The current accepted correction for the same project/date
-- controls submission readiness; the claim's original source id/version/
-- snapshot remain unchanged.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000c001', 'principal@superseded-cost.test'),
  ('00000000-0000-0000-0000-00000000c002', 'manager@superseded-cost.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-00000000c001', 'principal@superseded-cost.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-00000000c002', 'manager@superseded-cost.test', 'Operations Manager', 'manager', true);

insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values (
  '10000000-0000-0000-0000-00000000c001',
  'Supersession Cost Test', 'Residential', 'Ongoing', 'Implementation', false,
  '00000000-0000-0000-0000-00000000c002', false, 'Not Reviewed'
);

-- Start with the same shape as the real incident: an accepted working DSR from
-- which the Operations Manager prepared a Project Cost.
insert into public.daily_site_entries (
  id, project_id, work_date, disposition, expected_worker_count, rate_per_worker,
  planned_labour_cost, work_planned, evidence_status, state, version,
  created_by, updated_by, submitted_by, reviewed_by, submitted_at, reviewed_at,
  is_late
) values (
  '20000000-0000-0000-0000-00000000c001',
  '10000000-0000-0000-0000-00000000c001',
  date '2026-08-15', 'working', 1, 700, 700, 'Maintenance', 'none',
  'accepted', 1,
  '00000000-0000-0000-0000-00000000c002',
  '00000000-0000-0000-0000-00000000c002',
  '00000000-0000-0000-0000-00000000c002',
  '00000000-0000-0000-0000-00000000c001',
  now(), now(), true
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c002', true);

do $$
declare
  claim public.internal_cost_claims;
begin
  claim := public.create_internal_cost_claim_draft(
    '10000000-0000-0000-0000-00000000c001',
    '20000000-0000-0000-0000-00000000c001',
    date '2026-08-15',
    'crew', 'Site crew', 'labour', 'Maintenance',
    '[{"description":"Planned site labour","rate_type":"daily","quantity":1,"unit":"worker","unit_rate":700}]'
  );

  perform pg_temp.assert_true(claim.lifecycle = 'draft', 'fixture claim starts Draft');
  perform pg_temp.assert_true(claim.daily_site_entry_id = '20000000-0000-0000-0000-00000000c001'::uuid,
    'claim records the original DSR id');
  perform pg_temp.assert_true(claim.daily_site_source_version = 1,
    'claim records the original DSR version');
  perform pg_temp.assert_true((claim.daily_site_snapshot->>'state') = 'accepted',
    'claim snapshot captures the original accepted state');

  perform set_config('test.superseded_cost.claim_id', claim.id::text, true);
end;
$$;

-- Principal corrects the accepted DSR by supersession. This turns the original
-- row historical (`superseded`) and creates the one current accepted record for
-- the same project/date, exactly as the real Daily Site correction workflow.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c001', true);

do $$
declare
  replacement public.daily_site_entries;
begin
  replacement := public.supersede_daily_site_entry(
    '20000000-0000-0000-0000-00000000c001',
    'Correct the accepted site record without erasing history',
    'working', null, null,
    1, 'Site crew', 700, null,
    'Maintenance', 0, 0,
    'Corrected record', 'none'
  );

  perform pg_temp.assert_true(replacement.state = 'accepted',
    'supersession creates the current accepted correction');
  perform pg_temp.assert_true(replacement.supersedes_entry_id = '20000000-0000-0000-0000-00000000c001'::uuid,
    'replacement points back to the historical original');
  perform pg_temp.assert_true(
    (select state from public.daily_site_entries where id = '20000000-0000-0000-0000-00000000c001') = 'superseded',
    'original source is now historical');
end;
$$;

-- The requesting manager can now continue the SAME cost. The new readiness
-- helper follows the current accepted DSR, while the cost keeps its original
-- source id/version/snapshot unchanged for audit.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c002', true);

do $$
declare
  before_claim public.internal_cost_claims;
  submitted public.internal_cost_claims;
begin
  select * into before_claim
  from public.internal_cost_claims
  where id = current_setting('test.superseded_cost.claim_id')::uuid;

  submitted := public.submit_internal_cost_claim(before_claim.id, before_claim.version);

  perform pg_temp.assert_true(submitted.lifecycle = 'awaiting_review',
    'superseded-source Project Cost can proceed once the current correction is accepted');
  perform pg_temp.assert_true(submitted.daily_site_entry_id = before_claim.daily_site_entry_id,
    'submission does not relink the historical source id');
  perform pg_temp.assert_true(submitted.daily_site_source_version = before_claim.daily_site_source_version,
    'submission does not rewrite the original source version');
  perform pg_temp.assert_true(submitted.daily_site_snapshot = before_claim.daily_site_snapshot,
    'submission does not rewrite the original source snapshot');
  perform pg_temp.assert_true(
    exists (
      select 1 from public.internal_cost_claim_events
      where claim_id = submitted.id and event_type = 'submitted'
    ),
    'normal immutable submission event is still recorded'
  );
end;
$$;

-- Negative case: if the latest corrected row is no longer accepted, the old
-- superseded source must NOT let Finance bypass the DSR approval ordering.
reset role;
update public.daily_site_entries
set state = 'submitted', reviewed_by = null, reviewed_at = null
where project_id = '10000000-0000-0000-0000-00000000c001'
  and work_date = date '2026-08-15'
  and state = 'accepted';

-- Return the cost to amendment_requested solely inside this isolated rollback
-- fixture so the readiness helper is exercised again. This is test setup, not
-- a product workflow assertion.
update public.internal_cost_claims
set lifecycle = 'amendment_requested', submitted_total = null, version = version + 1
where id = current_setting('test.superseded_cost.claim_id')::uuid;

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c002', true);

do $$
declare
  claim public.internal_cost_claims;
begin
  select * into claim
  from public.internal_cost_claims
  where id = current_setting('test.superseded_cost.claim_id')::uuid;

  begin
    perform public.submit_internal_cost_claim(claim.id, claim.version);
    raise exception 'ASSERTION FAILED: submission should remain blocked while the current corrected DSR awaits acceptance';
  exception
    when invalid_parameter_value then null;
  end;

  perform pg_temp.assert_true(
    (select lifecycle from public.internal_cost_claims where id = claim.id) = 'amendment_requested',
    'failed readiness check leaves the Project Cost lifecycle unchanged'
  );
end;
$$;

rollback;
