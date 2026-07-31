-- BD-OPERATIONS-HUB-01 — Daily Site Operations Phase 1 database tests.
-- Runs on an isolated PostgreSQL 17 database after all migrations are applied
-- in order (see scripts/test-daily-site-db.sh). Asserts schema/validation,
-- role/RLS authority, the entry lifecycle, immutable history, owner waivers,
-- morning-compliance calculation (EAT + weekend), and regression safety for the
-- Approvals foundation and project guards.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local'),
  ('00000000-0000-0000-0000-000000000002', 'manager@test.local'),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local'),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local'),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local'),
  ('00000000-0000-0000-0000-000000000006', 'manager2@test.local'),
  -- manager3 mirrors the hosted Operations Manager on his Alego site: LEAD of an
  -- Ongoing project, with no project_assignments. manager4 mirrors the hosted
  -- Karen gap / a future manager: active but neither assigned nor a lead.
  ('00000000-0000-0000-0000-000000000007', 'manager3@test.local'),
  ('00000000-0000-0000-0000-000000000008', 'manager4@test.local');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-000000000001', 'owner@test.local', 'Test Owner', 'owner', true),
  ('00000000-0000-0000-0000-000000000002', 'manager@test.local', 'Test Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000003', 'staff@test.local', 'Test Staff', 'staff', true),
  ('00000000-0000-0000-0000-000000000004', 'viewer@test.local', 'Test Viewer', 'viewer', true),
  ('00000000-0000-0000-0000-000000000005', 'inactive@test.local', 'Inactive Manager', 'manager', false),
  ('00000000-0000-0000-0000-000000000006', 'manager2@test.local', 'Other Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000007', 'manager3@test.local', 'Lead Manager', 'manager', true),
  ('00000000-0000-0000-0000-000000000008', 'manager4@test.local', 'Unassigned Manager', 'manager', true);

-- Project coverage matrix. Only Ongoing, non-archived, non-Awaiting-Approval
-- projects are in automatic morning-compliance scope.
insert into public.projects (
  id, project_name, project_type, status, stage, start_date, archived,
  portfolio_eligible, portfolio_permission_status
) values
  ('10000000-0000-0000-0000-000000000001', 'PR44 DAILY — Ongoing A', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000002', 'PR44 DAILY — Ongoing B', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000003', 'PR44 DAILY — Ongoing C', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000004', 'PR44 DAILY — Pending', 'Residential', 'Pending', 'Inquiry', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000005', 'PR44 DAILY — Completed', 'Residential', 'Completed', 'Completed', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000006', 'PR44 DAILY — Design only', 'Design Concept', 'Design-only', 'Concept Design', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000007', 'PR44 DAILY — Paused', 'Residential', 'Paused', 'Implementation', '2026-07-01', false, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000008', 'PR44 DAILY — Archived', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', true, false, 'Not Reviewed'),
  ('10000000-0000-0000-0000-000000000009', 'PR44 DAILY — Awaiting', 'Residential', 'Ongoing', 'Awaiting Approval', '2026-07-01', false, false, 'Not Reviewed'),
  -- Ongoing D is manager B's project (manager A is never assigned to it).
  ('10000000-0000-0000-0000-00000000000a', 'PR44 DAILY — Ongoing D', 'Residential', 'Ongoing', 'Implementation', '2026-07-01', false, false, 'Not Reviewed');

-- Ongoing E is led by manager3 with NO assignment — the hosted "Alego" pattern
-- (lead of an in-scope site is authorised without any project_assignments row).
-- Inserted separately with the lead set directly (superuser INSERT bypasses the
-- lead-change guard, which is a BEFORE UPDATE trigger).
insert into public.projects (
  id, project_name, project_type, status, stage, start_date, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values (
  '10000000-0000-0000-0000-00000000000b', 'PR44 DAILY — Ongoing E', 'Residential', 'Ongoing', 'Implementation',
  '2026-07-01', false, '00000000-0000-0000-0000-000000000007', false, 'Not Reviewed'
);

-- Project authority via the existing model: manager A (…02) is assigned to the
-- Ongoing/excluded projects used across the suite; manager B (…06) is assigned
-- only to Ongoing D. Owner needs no assignment (company-wide).
insert into public.project_assignments (project_id, user_id, is_active) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000008', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-000000000009', '00000000-0000-0000-0000-000000000002', true),
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000006', true);

set local role authenticated;

-- =====================================================================
-- 1. Schema, validation and labour calculation
-- =====================================================================
do $$
declare
  entry public.daily_site_entries;
  ok boolean;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  -- Working entry with rate × count derives planned labour cost.
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000001', '2026-07-28', 'working',
    null, null, 8, 'Lugulu crew', 500, null, 'Lay turf on the north lawn', 4000, 0, null, 'promised'
  );
  perform pg_temp.assert_true(entry.state = 'draft', 'new entry is a draft');
  perform pg_temp.assert_true(entry.version = 1, 'new entry is version 1');
  perform pg_temp.assert_true(entry.planned_labour_cost = 4000, 'planned cost = 8 x 500');
  perform pg_temp.assert_true(entry.expected_worker_count = 8, 'worker count stored');
  perform pg_temp.assert_true(entry.created_by = auth.uid(), 'creator is system-stamped from auth');
  perform pg_temp.assert_true(entry.evidence_status = 'promised', 'evidence status stored');
  perform pg_temp.assert_true(
    (select count(*) = 1 from public.daily_site_entry_events
      where daily_site_entry_id = entry.id and event_type = 'created'),
    'creation writes a created event'
  );

  -- Agreed-total mode ignores rate and stores the agreed figure as planned cost.
  -- (Future date so Ongoing B has no live 2026-07-28 entry for the compliance
  -- section, where it must read as "missing".)
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000002', '2999-06-01', 'working',
    null, null, 3, null, null, 4500, 'Prune hedges', 0, 0, null, 'none'
  );
  perform pg_temp.assert_true(entry.planned_labour_cost = 4500, 'agreed total becomes planned cost');
  perform pg_temp.assert_true(entry.rate_per_worker is null, 'agreed mode leaves rate null');

  -- No-work entry: reason required, no workforce or labour money retained.
  -- (On Ongoing A at a future date so Ongoing C stays waiver-only below.)
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000001', '2999-06-02', 'no_work',
    'rain', null, null, null, null, null, null, null, null, 'Heavy rain overnight', 'not_required'
  );
  perform pg_temp.assert_true(entry.disposition = 'no_work', 'no_work disposition stored');
  perform pg_temp.assert_true(entry.no_work_reason = 'rain', 'no_work reason stored');
  perform pg_temp.assert_true(coalesce(entry.expected_worker_count, 0) = 0, 'no_work has no workers');
  perform pg_temp.assert_true(coalesce(entry.planned_labour_cost, 0) = 0, 'no_work has no labour cost');

  -- Reject: working entry supplying both rate and agreed total (exclusivity).
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2030-01-01', 'working',
      null, null, 4, null, 500, 2000, 'Work', 0, 0, null, 'none'
    );
    raise exception 'both labour inputs unexpectedly accepted';
  exception when check_violation then null; end;

  -- Reject: working entry with zero workers.
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2030-01-02', 'working',
      null, null, 0, null, 500, null, 'Work', 0, 0, null, 'none'
    );
    raise exception 'zero-worker working entry unexpectedly accepted';
  exception when check_violation then null; end;

  -- Reject: working entry missing planned work.
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2030-01-03', 'working',
      null, null, 4, null, 500, null, null, 0, 0, null, 'none'
    );
    raise exception 'working entry without planned work unexpectedly accepted';
  exception when check_violation then null; end;

  -- Reject: no_work reason 'other' without explanatory detail.
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2030-01-04', 'no_work',
      'other', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'other-without-detail unexpectedly accepted';
  exception when check_violation then null; end;

  -- Reject: negative amount.
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2030-01-05', 'working',
      null, null, 4, null, -5, null, 'Work', 0, 0, null, 'none'
    );
    raise exception 'negative rate unexpectedly accepted';
  exception when check_violation then null; end;

  -- Reject: unknown no_work reason.
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2030-01-06', 'no_work',
      'volcano', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'invalid no_work reason unexpectedly accepted';
  exception when check_violation then null; end;

  -- Reject: unknown project.
  begin
    perform public.create_daily_site_entry_draft(
      '99999999-0000-0000-0000-000000000000', '2030-01-07', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'entry for missing project unexpectedly accepted';
  exception when no_data_found then null; end;

  -- Two live entries for the same project/date are blocked.
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2026-07-28', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'duplicate live entry unexpectedly accepted';
  exception when unique_violation then null; end;

  raise notice 'SECTION 1 (schema/validation) passed';
end;
$$;

-- =====================================================================
-- 2. Client cannot spoof audit identity/timestamps; direct writes denied
-- =====================================================================
do $$
declare
  entry public.daily_site_entries;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  -- Direct INSERT into the entries table is denied (no privilege).
  begin
    insert into public.daily_site_entries (
      project_id, work_date, disposition, expected_worker_count, rate_per_worker,
      planned_labour_cost, work_planned, state, created_by, updated_by
    ) values (
      '10000000-0000-0000-0000-000000000001', '2031-01-01', 'working', 2, 100,
      200, 'x', 'draft', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002'
    );
    raise exception 'direct entry insert unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  -- Direct INSERT into the immutable event log is denied.
  begin
    insert into public.daily_site_entry_events (
      daily_site_entry_id, event_type, actor_id, to_state, version_number
    ) values (
      '10000000-0000-0000-0000-000000000001', 'accepted',
      '00000000-0000-0000-0000-000000000002', 'accepted', 1
    );
    raise exception 'direct event insert unexpectedly permitted';
  exception when insufficient_privilege then null;
           when foreign_key_violation then null; end;

  -- Private helper is not executable by authenticated callers.
  begin
    perform public.private_active_daily_site_role();
    raise exception 'private helper unexpectedly executable';
  exception when insufficient_privilege then null; end;

  raise notice 'SECTION 2 (audit/direct-write protection) passed';
end;
$$;

-- =====================================================================
-- 3. Full lifecycle: draft -> submit -> return -> correct/resubmit ->
--    accept -> supersede, plus immutability and illegal transitions.
-- =====================================================================
do $$
declare
  entry public.daily_site_entries;
  replacement public.daily_site_entries;
  original_id uuid;
begin
  -- Manager creates and submits (future date => on-time, not late).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000001', '2999-01-01', 'working',
    null, null, 5, null, 400, null, 'Install irrigation', 3000, 500, 'Morning plan', 'none'
  );
  original_id := entry.id;

  -- Edit the draft in place.
  entry := public.update_daily_site_entry_draft(
    entry.id, 'working', null, null, 6, 'Karen crew', 400, null,
    'Install irrigation and mulch', 3000, 500, 'Updated plan', 'promised'
  );
  perform pg_temp.assert_true(entry.expected_worker_count = 6, 'draft edit updates worker count');
  perform pg_temp.assert_true(entry.planned_labour_cost = 2400, 'draft edit recomputes planned cost');

  entry := public.submit_daily_site_entry(entry.id);
  perform pg_temp.assert_true(entry.state = 'submitted', 'draft submits');
  perform pg_temp.assert_true(entry.submitted_by = auth.uid(), 'submitter stamped');
  perform pg_temp.assert_true(entry.is_late is false, 'future work date submits on time');

  -- Manager cannot review its own entry (owner-only action).
  begin
    perform public.accept_daily_site_entry(entry.id);
    raise exception 'manager accept unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  -- Owner returns for correction with a reason.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  entry := public.return_daily_site_entry_for_correction(entry.id, 'Confirm the crew size');
  perform pg_temp.assert_true(entry.state = 'returned_for_correction', 'owner returns entry');
  perform pg_temp.assert_true(entry.returned_reason = 'Confirm the crew size', 'return reason stored');
  perform pg_temp.assert_true(entry.reviewed_by = auth.uid(), 'reviewer stamped on return');

  -- A different manager cannot correct someone else's entry.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  begin
    perform public.correct_and_resubmit_daily_site_entry(
      entry.id, 'working', null, null, 7, null, 400, null, 'Work', 0, 0, null, 'none'
    );
    raise exception 'foreign manager correction unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  -- Original author corrects and resubmits (version increments).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  entry := public.correct_and_resubmit_daily_site_entry(
    entry.id, 'working', null, null, 7, 'Karen crew', 400, null,
    'Install irrigation and mulch', 3000, 500, 'Confirmed 7 workers', 'promised'
  );
  perform pg_temp.assert_true(entry.state = 'resubmitted', 'entry resubmits');
  perform pg_temp.assert_true(entry.version = 2, 'resubmission increments version');
  perform pg_temp.assert_true(entry.planned_labour_cost = 2800, 'resubmission recomputes planned cost');
  perform pg_temp.assert_true(entry.returned_reason is null, 'returned reason cleared on resubmit');

  -- Owner accepts.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  entry := public.accept_daily_site_entry(entry.id, 'Looks correct');
  perform pg_temp.assert_true(entry.state = 'accepted', 'owner accepts');

  -- Accepted entries cannot be edited in place or resubmitted.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  begin
    perform public.update_daily_site_entry_draft(
      entry.id, 'working', null, null, 9, null, 400, null, 'x', 0, 0, null, 'none'
    );
    raise exception 'accepted entry edit unexpectedly permitted';
  exception when check_violation then null; end;
  begin
    perform public.submit_daily_site_entry(entry.id);
    raise exception 'accepted entry resubmit unexpectedly permitted';
  exception when check_violation then null; end;

  -- Owner supersedes the accepted entry: prior preserved, replacement accepted.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  replacement := public.supersede_daily_site_entry(
    entry.id, 'Actual crew was 8', 'working', null, null, 8, 'Karen crew', 400, null,
    'Install irrigation and mulch', 3000, 500, 'Corrected after acceptance', 'promised'
  );
  perform pg_temp.assert_true(replacement.state = 'accepted', 'replacement is accepted');
  perform pg_temp.assert_true(replacement.version = 3, 'replacement version increments');
  perform pg_temp.assert_true(replacement.supersedes_entry_id = original_id, 'replacement links predecessor');
  perform pg_temp.assert_true(replacement.planned_labour_cost = 3200, 'replacement recomputes cost');
  perform pg_temp.assert_true(
    (select state = 'superseded' from public.daily_site_entries where id = original_id),
    'original is marked superseded'
  );
  perform pg_temp.assert_true(
    (select supersession_reason = 'Actual crew was 8' from public.daily_site_entries where id = original_id),
    'supersession reason preserved on original'
  );

  -- Superseded record remains readable (immutable history preserved).
  perform pg_temp.assert_true(
    (select count(*) >= 1 from public.daily_site_entries where id = original_id),
    'superseded record still readable'
  );

  -- Illegal transition: accept an already-superseded entry.
  begin
    perform public.accept_daily_site_entry(original_id);
    raise exception 'accepting superseded entry unexpectedly permitted';
  exception when check_violation then null;
           when insufficient_privilege then null; end;

  raise notice 'SECTION 3 (lifecycle/immutability) passed';
end;
$$;

-- =====================================================================
-- 4. Void with reason; illegal void of accepted; no hard delete
-- =====================================================================
do $$
declare
  entry public.daily_site_entries;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000002', '2999-02-01', 'no_work',
    'site_access_unavailable', 'Gate locked', null, null, null, null, null, null, null, 'Access issue', 'none'
  );

  -- Void requires a reason.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  begin
    perform public.void_daily_site_entry(entry.id, '   ');
    raise exception 'void without reason unexpectedly permitted';
  exception when check_violation then null; end;

  entry := public.void_daily_site_entry(entry.id, 'Created against the wrong project');
  perform pg_temp.assert_true(entry.state = 'voided', 'entry voids');
  perform pg_temp.assert_true(entry.void_reason = 'Created against the wrong project', 'void reason stored');

  -- Voided entry cannot be voided again.
  begin
    perform public.void_daily_site_entry(entry.id, 'again');
    raise exception 'double void unexpectedly permitted';
  exception when check_violation then null; end;

  -- Manager cannot void.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000002', '2999-02-02', 'no_work',
    'rain', null, null, null, null, null, null, null, null, null, 'none'
  );
  begin
    perform public.void_daily_site_entry(entry.id, 'nope');
    raise exception 'manager void unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  raise notice 'SECTION 4 (void) passed';
end;
$$;

-- =====================================================================
-- 5. Roles / RLS visibility
-- =====================================================================
-- Staff, viewer and inactive callers cannot read entries (RLS returns nothing).
do $$
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true); -- staff
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_entries), 'staff sees no entries'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000004', true); -- viewer
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_entries), 'viewer sees no entries'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true); -- inactive
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_entries), 'inactive user sees no entries'
  );

  -- Manager and owner can read entries.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  perform pg_temp.assert_true(
    (select count(*) > 0 from public.daily_site_entries), 'manager reads entries'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform pg_temp.assert_true(
    (select count(*) > 0 from public.daily_site_entries), 'owner reads entries'
  );

  -- Staff cannot create an entry; inactive cannot create an entry.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2999-03-01', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'staff create unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000005', true);
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2999-03-02', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'inactive create unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  raise notice 'SECTION 5 (roles/RLS) passed';
end;
$$;

-- Anonymous callers are denied entirely.
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.daily_site_entries;
  exception when insufficient_privilege then null; end;
  begin
    perform public.daily_site_morning_compliance(null);
    raise exception 'anon compliance unexpectedly permitted';
  exception when insufficient_privilege then null; end;
end;
$$;
reset role;
set local role authenticated;

-- =====================================================================
-- 6. Owner waiver + revoke
-- =====================================================================
do $$
declare
  waiver public.daily_site_compliance_waivers;
begin
  -- Manager cannot waive.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  begin
    perform public.create_daily_site_compliance_waiver(
      '10000000-0000-0000-0000-000000000003', '2026-07-28', 'no reason'
    );
    raise exception 'manager waiver unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  -- Owner waives one project/date. This active waiver on Ongoing C / 2026-07-28
  -- remains in place for the compliance section below.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  waiver := public.create_daily_site_compliance_waiver(
    '10000000-0000-0000-0000-000000000003', '2026-07-28', 'Owner on site; verbal report taken'
  );
  perform pg_temp.assert_true(waiver.state = 'active', 'waiver is active');
  perform pg_temp.assert_true(waiver.created_by = auth.uid(), 'waiver creator stamped');

  -- No duplicate active waiver for the same project/date.
  begin
    perform public.create_daily_site_compliance_waiver(
      '10000000-0000-0000-0000-000000000003', '2026-07-28', 'again'
    );
    raise exception 'duplicate active waiver unexpectedly permitted';
  exception when unique_violation then null; end;

  -- Revoke path on a separate throwaway date; a fresh waiver is then allowed.
  waiver := public.create_daily_site_compliance_waiver(
    '10000000-0000-0000-0000-000000000003', '2999-07-07', 'Temporary waiver'
  );
  waiver := public.revoke_daily_site_compliance_waiver(waiver.id, 'Entered a real entry instead');
  perform pg_temp.assert_true(waiver.state = 'revoked', 'waiver revoked');
  perform pg_temp.assert_true(waiver.revoked_by = auth.uid(), 'revoker stamped');
  -- A revoked waiver frees the slot for a new active one.
  waiver := public.create_daily_site_compliance_waiver(
    '10000000-0000-0000-0000-000000000003', '2999-07-07', 'Re-waived'
  );
  perform pg_temp.assert_true(waiver.state = 'active', 're-waiver after revoke allowed');

  raise notice 'SECTION 6 (waivers) passed';
end;
$$;

-- =====================================================================
-- 7. Morning-compliance calculation (EAT, weekend, waiver, timing)
-- =====================================================================
do $$
declare
  due_count integer;
  rec record;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

  -- Weekday 2026-07-28 (Tuesday), OWNER (company-wide): the five Ongoing, active
  -- projects (A, B, C, D, E) are due. A has an entry; C has an active waiver.
  select count(*) into due_count
  from public.daily_site_morning_compliance('2026-07-28')
  where due is true
    and project_id::text like '10000000-0000-0000-0000-%';
  perform pg_temp.assert_true(due_count = 5, 'owner sees five in-scope projects due on the weekday');

  -- Owner sees manager B's Ongoing D in the company-wide view.
  perform pg_temp.assert_true(
    exists (select 1 from public.daily_site_morning_compliance('2026-07-28')
            where project_id = '10000000-0000-0000-0000-00000000000a'),
    'owner compliance includes Ongoing D'
  );

  -- Excluded statuses never appear as due.
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_morning_compliance('2026-07-28')
      where due is true and project_id in (
        '10000000-0000-0000-0000-000000000004', -- Pending
        '10000000-0000-0000-0000-000000000005', -- Completed
        '10000000-0000-0000-0000-000000000006', -- Design-only
        '10000000-0000-0000-0000-000000000007', -- Paused
        '10000000-0000-0000-0000-000000000008', -- Archived
        '10000000-0000-0000-0000-000000000009'  -- Awaiting Approval stage
      )
    ),
    'excluded project statuses are never due'
  );

  -- Ongoing C is waived and reports as waived, not missing.
  select * into rec from public.daily_site_morning_compliance('2026-07-28')
    where project_id = '10000000-0000-0000-0000-000000000003';
  perform pg_temp.assert_true(rec.compliance_status = 'waived', 'waived project reports waived');
  perform pg_temp.assert_true(rec.entry_id is null, 'waiver is not an entry');

  -- Ongoing A has an entry (from section 3 supersession -> accepted).
  select * into rec from public.daily_site_morning_compliance('2026-07-28')
    where project_id = '10000000-0000-0000-0000-000000000001';
  perform pg_temp.assert_true(rec.entry_id is not null, 'project with entry reports an entry');
  perform pg_temp.assert_true(rec.compliance_status in ('entry_present', 'entry_late'), 'entry status reported');

  -- Ongoing B has no live entry today (its section-4 entries were future/voided)
  -- and no waiver -> missing.
  select * into rec from public.daily_site_morning_compliance('2026-07-28')
    where project_id = '10000000-0000-0000-0000-000000000002';
  perform pg_temp.assert_true(rec.compliance_status = 'missing', 'in-scope project without entry is missing');

  -- Weekend: no automatic due items on Saturday 2026-08-01.
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_morning_compliance('2026-08-01')
      where due is true and project_id::text like '10000000-0000-0000-0000-%'),
    'no automatic due items on a weekend'
  );

  raise notice 'SECTION 7 (compliance) passed';
end;
$$;

-- Voluntary weekend entry is allowed and does not change the project; and
-- late/on-time flags are derived by the database.
do $$
declare
  entry public.daily_site_entries;
  rec record;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  -- Voluntary Saturday entry on an Ongoing project.
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000002', '2026-08-01', 'working',
    null, null, 2, null, 500, null, 'Emergency drainage fix', 0, 0, 'Weekend callout', 'none'
  );
  entry := public.submit_daily_site_entry(entry.id);
  perform pg_temp.assert_true(entry.state = 'submitted', 'voluntary weekend entry submits');

  -- Lateness is derived by the database, not trusted from the client: a clearly
  -- past-dated work date has an 08:30 EAT threshold already elapsed => late.
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000001', '2020-03-02', 'working',
    null, null, 2, null, 500, null, 'Backdated correction', 0, 0, null, 'none'
  );
  entry := public.submit_daily_site_entry(entry.id);
  perform pg_temp.assert_true(entry.is_late is true, 'past-dated submission is derived late');

  -- Project lifecycle status is untouched by any Daily Site Entry.
  perform pg_temp.assert_true(
    (select status = 'Ongoing' from public.projects where id = '10000000-0000-0000-0000-000000000002'),
    'daily site entry never mutates project status'
  );

  -- The weekend entry is surfaced by compliance even though the day is not due.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  select * into rec from public.daily_site_morning_compliance('2026-08-01')
    where project_id = '10000000-0000-0000-0000-000000000002';
  perform pg_temp.assert_true(rec.entry_id is not null, 'voluntary weekend entry is visible');
  perform pg_temp.assert_true(rec.due is false, 'voluntary weekend entry is not due');

  -- temporarily_paused_for_day never mutates project status either.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000001', '2999-05-05', 'no_work',
    'temporarily_paused_for_day', null, null, null, null, null, null, null, null, 'Paused just today', 'none'
  );
  perform pg_temp.assert_true(
    (select status = 'Ongoing' from public.projects where id = '10000000-0000-0000-0000-000000000001'),
    'temporarily_paused_for_day keeps project Ongoing'
  );

  raise notice 'SECTION 7b (weekend/late/no-mutation) passed';
end;
$$;

-- =====================================================================
-- 7c. Project-authority isolation across two managers
-- =====================================================================
-- Manager A (…02) is assigned to A/B/C (+ excluded); manager B (…06) only to
-- Ongoing D. Owner is company-wide. Verifies the repaired RLS, function-level
-- revalidation and compliance authority filtering.
do $$
declare
  d_entry public.daily_site_entries;
  rm_entry public.daily_site_entries;
  d_event_id uuid;
  d_waiver public.daily_site_compliance_waivers;
  cnt integer;
begin
  -- Manager B records an entry on their own Ongoing D.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  d_entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-00000000000a', '2026-07-28', 'working',
    null, null, 4, null, 300, null, 'Plant screening hedge', 0, 0, null, 'none'
  );
  select id into d_event_id from public.daily_site_entry_events
    where daily_site_entry_id = d_entry.id limit 1;

  -- Owner waives Ongoing D for a different date (isolation subject).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  d_waiver := public.create_daily_site_compliance_waiver(
    '10000000-0000-0000-0000-00000000000a', '2026-07-29', 'Owner verified verbally'
  );

  -- Manager A cannot read manager B's entry, event or waiver.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_entries where id = d_entry.id),
    'manager A cannot read manager B entry'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_entry_events where id = d_event_id),
    'manager A cannot read manager B event'
  );
  perform pg_temp.assert_true(
    not exists (select 1 from public.daily_site_compliance_waivers where id = d_waiver.id),
    'manager A cannot read manager B waiver'
  );

  -- Manager B cannot read manager A's Ongoing-A/B/C entries.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_entries
      where project_id in (
        '10000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000002',
        '10000000-0000-0000-0000-000000000003'
      )
    ),
    'manager B cannot read manager A entries'
  );
  -- Manager B sees only its own project's entries.
  select count(*) into cnt from public.daily_site_entries;
  perform pg_temp.assert_true(cnt >= 1, 'manager B sees at least its own entry');
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_entries
      where project_id <> '10000000-0000-0000-0000-00000000000a'
    ),
    'manager B sees only Ongoing D entries'
  );

  -- Manager A cannot create an entry for manager B's project.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-00000000000a', '2999-09-01', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'manager A create on manager B project unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  -- Authority removal (setup): manager A records a voluntary entry on an
  -- eligible Ongoing project (…02, assigned) and stashes its id for the
  -- post-removal checks below
  -- (the assignment is deactivated as the table owner between DO blocks).
  rm_entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-000000000002', '2999-10-01', 'no_work',
    'temporarily_paused_for_day', null, null, null, null, null, null, null, null, null, 'none'
  );
  perform set_config('bd.removal_entry_id', rm_entry.id::text, false);

  -- Compliance leakage: manager A's compliance excludes Ongoing D entirely, and
  -- manager A's own due set is exactly its three authorised Ongoing projects.
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_morning_compliance('2026-07-28')
      where project_id = '10000000-0000-0000-0000-00000000000a'
    ),
    'manager A compliance excludes unauthorised Ongoing D'
  );
  select count(*) into cnt from public.daily_site_morning_compliance('2026-07-28')
  where due is true and project_id::text like '10000000-0000-0000-0000-%';
  perform pg_temp.assert_true(cnt = 3, 'manager A sees exactly its three authorised due projects');

  -- Manager B's compliance is exactly its one authorised due project (D).
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  select count(*) into cnt from public.daily_site_morning_compliance('2026-07-28')
  where due is true and project_id::text like '10000000-0000-0000-0000-%';
  perform pg_temp.assert_true(cnt = 1, 'manager B sees exactly one due project');
  perform pg_temp.assert_true(
    not exists (
      select 1 from public.daily_site_morning_compliance('2026-07-28')
      where project_id <> '10000000-0000-0000-0000-00000000000a'
    ),
    'manager B compliance contains only Ongoing D'
  );

  -- daily_site_authorised_projects respects the same boundary.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000006', true);
  perform pg_temp.assert_true(
    (select count(*) = 1 from public.daily_site_authorised_projects()) and
    (select bool_and(id = '10000000-0000-0000-0000-00000000000a') from public.daily_site_authorised_projects()),
    'authorised-projects selector returns only Ongoing D for manager B'
  );
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);
  perform pg_temp.assert_true(
    (select count(*) = 6 from public.daily_site_authorised_projects()
      where id::text like '10000000-0000-0000-0000-%'),
    'owner selector returns only the six eligible fixture projects'
  );
  -- Staff and inactive get nothing from the selector.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000003', true);
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_authorised_projects()),
    'staff sees no authorised projects'
  );

  raise notice 'SECTION 7c (project-authority isolation) passed';
end;
$$;

-- Remove manager A's authority for Ongoing B as the table owner, then
-- confirm the authored draft can no longer be mutated by that manager.
reset role;
update public.project_assignments set is_active = false
  where project_id = '10000000-0000-0000-0000-000000000002'
    and user_id = '00000000-0000-0000-0000-000000000002';
set local role authenticated;

do $$
declare
  rm_id uuid := current_setting('bd.removal_entry_id')::uuid;
begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);
  begin
    perform public.update_daily_site_entry_draft(
      rm_id, 'no_work', 'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'update after authority removal unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_daily_site_entry(rm_id);
    raise exception 'submit after authority removal unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  raise notice 'SECTION 7c-removal (authority loss blocks author) passed';
end;
$$;

-- =====================================================================
-- 7d. Hosted-compatible authority patterns (lead-based + no-authority)
-- =====================================================================
-- Mirrors the read-only hosted inventory: the Operations Manager is LEAD of an
-- Ongoing site (Alego) with zero project_assignments and must be authorised for
-- it; an in-scope site he neither leads nor is assigned to (Karen) must be
-- denied; and an active manager with no authority at all sees a safe empty set.
do $$
declare
  e_entry public.daily_site_entries;
  cnt integer;
begin
  -- manager3 leads Ongoing E (no assignment) — authorised via lead alone.
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000007', true);
  perform pg_temp.assert_true(
    public.can_manage_daily_site_project('10000000-0000-0000-0000-00000000000b'),
    'lead is authorised for their Ongoing site without any assignment'
  );
  -- ...and can actually record the morning entry for it.
  e_entry := public.create_daily_site_entry_draft(
    '10000000-0000-0000-0000-00000000000b', '2026-07-28', 'working',
    null, null, 5, null, 450, null, 'Mobilise crew at Alego-equivalent site', 0, 0, null, 'none'
  );
  perform pg_temp.assert_true(e_entry.state = 'draft', 'lead manager records an entry for their site');
  -- The lead is NOT authorised for an in-scope site he neither leads nor is
  -- assigned to (the hosted "Karen Residence" gap).
  perform pg_temp.assert_true(
    not public.can_manage_daily_site_project('10000000-0000-0000-0000-000000000001'),
    'lead manager is not authorised for an unrelated in-scope site'
  );
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2999-11-01', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'lead manager create on unrelated site unexpectedly permitted';
  exception when insufficient_privilege then null; end;
  -- The lead's authorised set and compliance are exactly their one Ongoing site.
  perform pg_temp.assert_true(
    (select count(*) = 1 from public.daily_site_authorised_projects()) and
    (select bool_and(id = '10000000-0000-0000-0000-00000000000b') from public.daily_site_authorised_projects()),
    'lead manager authorised-projects is exactly their led site'
  );
  select count(*) into cnt from public.daily_site_morning_compliance('2026-07-28') where due is true;
  perform pg_temp.assert_true(cnt = 1, 'lead manager has exactly one due project');

  -- manager4 has neither assignment nor lead: a safe, empty, non-broken state
  -- (this is what the frontend renders as "no projects assigned to you yet").
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000008', true);
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_authorised_projects()),
    'unassigned manager has no authorised projects'
  );
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_morning_compliance('2026-07-28')),
    'unassigned manager sees an empty compliance set (no leakage)'
  );
  perform pg_temp.assert_true(
    (select count(*) = 0 from public.daily_site_entries),
    'unassigned manager sees no entries'
  );
  begin
    perform public.create_daily_site_entry_draft(
      '10000000-0000-0000-0000-000000000001', '2999-11-02', 'no_work',
      'rain', null, null, null, null, null, null, null, null, null, 'none'
    );
    raise exception 'unassigned manager create unexpectedly permitted';
  exception when insufficient_privilege then null; end;

  raise notice 'SECTION 7d (hosted-compatible authority patterns) passed';
end;
$$;

-- =====================================================================
-- 8. Regression: Approvals foundation and project guards intact
-- =====================================================================
do $$
begin
  -- Approvals tables and a core function still exist and are unchanged in shape.
  perform pg_temp.assert_true(
    to_regclass('public.approval_requests') is not null, 'approval_requests still present'
  );
  perform pg_temp.assert_true(
    to_regclass('public.approval_events') is not null, 'approval_events still present'
  );
  perform pg_temp.assert_true(
    to_regprocedure('public.submit_project_approval(uuid, text, jsonb, text, text, uuid)') is not null,
    'submit_project_approval still present'
  );
  -- No Daily Site approval type was added to the approvals check constraint.
  perform pg_temp.assert_true(
    (select pg_get_constraintdef(oid) not ilike '%daily_site%'
       from pg_constraint where conname = 'approval_requests_approval_type_check'),
    'approvals type constraint gained no daily-site type'
  );
  -- Project status enum is unchanged (no new status values introduced): the
  -- status check constraint still lists both Ongoing and Design-only.
  perform pg_temp.assert_true(
    exists (
      select 1 from pg_constraint
      where conrelid = 'public.projects'::regclass
        and pg_get_constraintdef(oid) ilike '%Ongoing%'
        and pg_get_constraintdef(oid) ilike '%Design-only%'
    ),
    'projects status constraint intact'
  );
  raise notice 'SECTION 8 (regression) passed';
end;
$$;

rollback;
\echo 'ALL DAILY SITE OPERATIONS TESTS PASSED'
