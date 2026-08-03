-- BD-PEOPLE-01 lifecycle correction — isolated database acceptance tests.
-- Runs only in the disposable PostgreSQL cluster created by test-people-db.sh.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000001a1', 'principal@lifecycle.test'),
  ('00000000-0000-0000-0000-0000000001a2', 'manager@lifecycle.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000001a1', 'principal@lifecycle.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000001a2', 'manager@lifecycle.test', 'Operations Manager', 'manager', true);

insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('20000000-0000-0000-0000-0000000001a1', 'Lifecycle Site', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000001a2', false, 'Not Reviewed'),
  ('20000000-0000-0000-0000-0000000001a2', 'Conflict Site', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000001a2', false, 'Not Reviewed');

-- The ledger is structurally immutable to every ordinary application role.
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.people_engagement_events'::regclass),
  'event ledger RLS is enabled'
);
select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.people_engagement_events', 'SELECT'),
  'authenticated may receive the Principal-scoped ledger read'
);
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.people_engagement_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.people_engagement_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.people_engagement_events', 'DELETE'),
  'ordinary application roles cannot insert, edit or delete ledger events'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001a1', true);

insert into public.people (id, full_name, relationship_type)
values
  ('30000000-0000-0000-0000-0000000001a1', 'Lifecycle Person', 'regular_staff'),
  ('30000000-0000-0000-0000-0000000001a2', 'Conflict Person', 'regular_staff');

-- Capture non-People baselines. Every lifecycle action below must leave these
-- domains and access tables unchanged.
create temp table lifecycle_baseline as
select
  (select count(*) from auth.users) as auth_users,
  (select count(*) from public.project_assignments) as assignments,
  (select count(*) from public.internal_cost_claims) as claims,
  (select count(*) from public.daily_site_entries) as daily_site,
  (select count(*) from public.approval_requests) as approvals,
  (select count(*) from public.fund_requests) as fund_requests;

-- Operations Manager creation remains ordinary authorised resourcing work.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001a2', true);
insert into public.people_engagements (
  id, person_id, project_id, engagement_role, start_date
) values (
  '40000000-0000-0000-0000-0000000001a1',
  '30000000-0000-0000-0000-0000000001a1',
  '20000000-0000-0000-0000-0000000001a1',
  'team_leader', date '2026-07-01'
);

do $$
declare event public.people_engagement_events;
begin
  select * into event from public.people_engagement_events
  where engagement_id = '40000000-0000-0000-0000-0000000001a1';
  -- The manager cannot read the Principal ledger, so verify through a role
  -- switch below. Here the absence is itself the RLS result.
  perform pg_temp.assert_true(not found, 'Operations Manager cannot read the correction ledger');
end;
$$;

-- Current engagement management and ending remain permitted and write
-- complete events.
update public.people_engagements
set engagement_role = 'supervisor', start_date = date '2026-07-02'
where id = '40000000-0000-0000-0000-0000000001a1';

update public.people_engagements
set end_date = date '2026-08-01', end_reason = 'Ordinary closure'
where id = '40000000-0000-0000-0000-0000000001a1';

-- Direct closed-record rewrite and reopen attempts are refused even though the
-- manager can access the project and row through RLS.
do $$
begin
  update public.people_engagements
  set engagement_role = 'supervisor'
  where id = '40000000-0000-0000-0000-0000000001a1';
  raise exception 'ASSERTION FAILED: manager rewrote a closed engagement';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  update public.people_engagements
  set end_date = null, end_reason = null
  where id = '40000000-0000-0000-0000-0000000001a1';
  raise exception 'ASSERTION FAILED: manager reopened a closed engagement';
exception when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform public.correct_people_engagement(
    '40000000-0000-0000-0000-0000000001a1', 3, 'consultant',
    date '2026-07-02', date '2026-08-02', 'Corrected end', false,
    'Correcting the historical dates'
  );
  raise exception 'ASSERTION FAILED: manager called the Principal correction RPC';
exception when insufficient_privilege then null;
end;
$$;

-- Principal can inspect and correct the closed record, with exact snapshots.
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000001a1', true);

do $$
declare created_event public.people_engagement_events;
        updated_event public.people_engagement_events;
        ended_event public.people_engagement_events;
begin
  select * into created_event from public.people_engagement_events
  where engagement_id = '40000000-0000-0000-0000-0000000001a1'
    and event_type = 'created';
  select * into ended_event from public.people_engagement_events
  where engagement_id = '40000000-0000-0000-0000-0000000001a1'
    and event_type = 'ended';
  select * into updated_event from public.people_engagement_events
  where engagement_id = '40000000-0000-0000-0000-0000000001a1'
    and event_type = 'updated';

  perform pg_temp.assert_true(created_event.previous_snapshot is null, 'created event has no invented previous state');
  perform pg_temp.assert_true(created_event.new_snapshot ->> 'id' = '40000000-0000-0000-0000-0000000001a1', 'created event holds the complete new row');
  perform pg_temp.assert_true(created_event.actor_profile_id = '00000000-0000-0000-0000-0000000001a2'::uuid, 'created event records manager actor');
  perform pg_temp.assert_true(created_event.resulting_version = 1, 'created event records version 1');

  perform pg_temp.assert_true(updated_event.previous_snapshot ->> 'engagement_role' = 'team_leader', 'current update preserves the previous role');
  perform pg_temp.assert_true(updated_event.new_snapshot ->> 'engagement_role' = 'supervisor', 'current update preserves the new role');
  perform pg_temp.assert_true(updated_event.actor_profile_id = '00000000-0000-0000-0000-0000000001a2'::uuid, 'current update records manager actor');
  perform pg_temp.assert_true(updated_event.resulting_version = 2, 'current update records resulting version');

  perform pg_temp.assert_true(ended_event.previous_snapshot ->> 'end_date' is null, 'ended event preserves the open previous state');
  perform pg_temp.assert_true(ended_event.new_snapshot ->> 'end_date' = '2026-08-01', 'ended event preserves the closed new state');
  perform pg_temp.assert_true(ended_event.actor_profile_id = '00000000-0000-0000-0000-0000000001a2'::uuid, 'ended event records manager actor');
  perform pg_temp.assert_true(ended_event.resulting_version = 3, 'ended event records resulting version');
end;
$$;

-- A reason is mandatory and the failure writes nothing.
do $$
declare events_before integer;
begin
  select count(*) into events_before from public.people_engagement_events;
  begin
    perform public.correct_people_engagement(
      '40000000-0000-0000-0000-0000000001a1', 3, 'consultant',
      date '2026-07-02', date '2026-08-02', 'Corrected end', false, ''
    );
    raise exception 'ASSERTION FAILED: correction without reason succeeded';
  exception when invalid_parameter_value then null;
  end;
  perform pg_temp.assert_true(
    (select count(*) from public.people_engagement_events) = events_before,
    'failed reason validation writes no event'
  );
end;
$$;

-- A caller cannot disguise a reopen as a details correction by submitting a
-- blank end date; that would otherwise skip the explicit active-conflict check.
do $$
declare events_before integer;
begin
  select count(*) into events_before from public.people_engagement_events;
  begin
    perform public.correct_people_engagement(
      '40000000-0000-0000-0000-0000000001a1', 3, 'consultant',
      date '2026-07-02', null, null, false,
      'Attempting to clear the closure through the details path'
    );
    raise exception 'ASSERTION FAILED: details correction silently reopened the row';
  exception when invalid_parameter_value then null;
  end;
  perform pg_temp.assert_true(
    (select count(*) from public.people_engagement_events) = events_before,
    'disguised reopen writes no event'
  );
  perform pg_temp.assert_true(
    (select end_date from public.people_engagements where id = '40000000-0000-0000-0000-0000000001a1') = date '2026-08-01',
    'disguised reopen leaves the row closed'
  );
end;
$$;

do $$
declare corrected public.people_engagements;
        event public.people_engagement_events;
begin
  select * into corrected from public.correct_people_engagement(
    '40000000-0000-0000-0000-0000000001a1', 3, 'consultant',
    date '2026-07-02', date '2026-08-02', 'Corrected end', false,
    'The original closure used the wrong dates'
  );

  perform pg_temp.assert_true(corrected.id = '40000000-0000-0000-0000-0000000001a1'::uuid, 'correction keeps the same row');
  perform pg_temp.assert_true(corrected.version = 4, 'correction increments version once');
  perform pg_temp.assert_true(corrected.engagement_role = 'consultant', 'Principal corrected role');
  perform pg_temp.assert_true(corrected.start_date = date '2026-07-02', 'Principal corrected start date');
  perform pg_temp.assert_true(corrected.end_date = date '2026-08-02', 'Principal corrected end date');
  perform pg_temp.assert_true(corrected.end_reason = 'Corrected end', 'Principal corrected end reason');

  select * into event from public.people_engagement_events
  where engagement_id = corrected.id and event_type = 'corrected';
  perform pg_temp.assert_true(event.previous_snapshot ->> 'engagement_role' = 'supervisor', 'correction event preserves previous role');
  perform pg_temp.assert_true(event.new_snapshot ->> 'engagement_role' = 'consultant', 'correction event preserves new role');
  perform pg_temp.assert_true(event.previous_snapshot ->> 'end_date' = '2026-08-01', 'correction event preserves previous end date');
  perform pg_temp.assert_true(event.new_snapshot ->> 'end_date' = '2026-08-02', 'correction event preserves new end date');
  perform pg_temp.assert_true(event.correction_reason = 'The original closure used the wrong dates', 'correction event records mandatory reason');
  perform pg_temp.assert_true(event.actor_profile_id = '00000000-0000-0000-0000-0000000001a1'::uuid, 'correction event records Principal actor');
  perform pg_temp.assert_true(event.occurred_at is not null, 'correction event records timestamp');
  perform pg_temp.assert_true(event.resulting_version = 4, 'correction event records resulting version');
end;
$$;

-- Optimistic concurrency is enforced before any update or event write.
do $$
declare events_before integer;
begin
  select count(*) into events_before from public.people_engagement_events;
  begin
    perform public.correct_people_engagement(
      '40000000-0000-0000-0000-0000000001a1', 2, 'consultant',
      date '2026-07-03', date '2026-08-03', null, false,
      'Trying a stale correction'
    );
    raise exception 'ASSERTION FAILED: stale correction succeeded';
  exception when serialization_failure then null;
  end;
  perform pg_temp.assert_true(
    (select count(*) from public.people_engagement_events) = events_before,
    'stale correction writes no event'
  );
end;
$$;

-- A direct Principal update is not a closed-record audit bypass.
do $$
begin
  update public.people_engagements set start_date = date '2026-06-01'
  where id = '40000000-0000-0000-0000-0000000001a1';
  raise exception 'ASSERTION FAILED: Principal bypassed controlled closed-record correction';
exception when insufficient_privilege then null;
end;
$$;

-- Reopening restores the SAME row, clears closure fields and records both
-- states and the reason atomically.
do $$
declare before_count integer; after_count integer;
        reopened public.people_engagements;
        event public.people_engagement_events;
begin
  select count(*) into before_count from public.people_engagements;
  select * into reopened from public.correct_people_engagement(
    '40000000-0000-0000-0000-0000000001a1', 4, 'consultant',
    date '2026-07-02', date '2026-08-02', 'Corrected end', true,
    'The engagement was ended by mistake'
  );
  select count(*) into after_count from public.people_engagements;

  perform pg_temp.assert_true(before_count = after_count, 'reopening creates no replacement engagement');
  perform pg_temp.assert_true(reopened.id = '40000000-0000-0000-0000-0000000001a1'::uuid, 'reopening restores the same row');
  perform pg_temp.assert_true(reopened.end_date is null and reopened.end_reason is null, 'reopening clears the mistaken closure');
  perform pg_temp.assert_true(reopened.version = 5, 'reopening increments version once');

  select * into event from public.people_engagement_events
  where engagement_id = reopened.id and event_type = 'reopened';
  perform pg_temp.assert_true(event.previous_snapshot ->> 'end_date' = '2026-08-02', 'reopen event preserves mistaken closed state');
  perform pg_temp.assert_true(event.new_snapshot ->> 'end_date' is null, 'reopen event preserves current state');
  perform pg_temp.assert_true(event.correction_reason = 'The engagement was ended by mistake', 'reopen event records reason');
  perform pg_temp.assert_true(event.resulting_version = 5, 'reopen event records resulting version');
end;
$$;

-- Build the exact replacement shape that exists for Martine: a closed original
-- plus one active replacement. Reopening the original is blocked clearly and
-- atomically; no broad rule against legitimate historical roles is added.
insert into public.people_engagements (
  id, person_id, project_id, engagement_role, start_date, end_date
) values (
  '40000000-0000-0000-0000-0000000001b1',
  '30000000-0000-0000-0000-0000000001a2',
  '20000000-0000-0000-0000-0000000001a2',
  'team_leader', date '2026-07-18', date '2026-08-01'
);
insert into public.people_engagements (
  id, person_id, project_id, engagement_role, start_date
) values (
  '40000000-0000-0000-0000-0000000001b2',
  '30000000-0000-0000-0000-0000000001a2',
  '20000000-0000-0000-0000-0000000001a2',
  'team_leader', date '2026-07-18'
);

do $$
declare rows_before integer; events_before integer;
begin
  select count(*) into rows_before from public.people_engagements;
  select count(*) into events_before from public.people_engagement_events;
  begin
    perform public.correct_people_engagement(
      '40000000-0000-0000-0000-0000000001b1', 1, 'team_leader',
      date '2026-07-18', date '2026-08-01', null, true,
      'Testing an active replacement conflict'
    );
    raise exception 'ASSERTION FAILED: conflicting closed engagement reopened';
  exception when unique_violation then
    perform pg_temp.assert_true(
      sqlerrm like '%active engagement already exists%',
      'conflict returns the plain active-engagement explanation'
    );
  end;
  perform pg_temp.assert_true((select count(*) from public.people_engagements) = rows_before, 'conflict creates no engagement');
  perform pg_temp.assert_true((select count(*) from public.people_engagement_events) = events_before, 'conflict writes no event');
  perform pg_temp.assert_true(
    (select end_date from public.people_engagements where id = '40000000-0000-0000-0000-0000000001b1') = date '2026-08-01',
    'conflicting original remains closed'
  );
end;
$$;

-- People lifecycle changes grant no access and touch no other domain.
do $$
declare baseline lifecycle_baseline;
begin
  select * into baseline from lifecycle_baseline;
  perform pg_temp.assert_true((select count(*) from auth.users) = baseline.auth_users, 'auth users unchanged');
  perform pg_temp.assert_true((select count(*) from public.project_assignments) = baseline.assignments, 'project assignments unchanged');
  perform pg_temp.assert_true((select count(*) from public.internal_cost_claims) = baseline.claims, 'claims unchanged');
  perform pg_temp.assert_true((select count(*) from public.daily_site_entries) = baseline.daily_site, 'Daily Site unchanged');
  perform pg_temp.assert_true((select count(*) from public.approval_requests) = baseline.approvals, 'approvals unchanged');
  perform pg_temp.assert_true((select count(*) from public.fund_requests) = baseline.fund_requests, 'fund requests unchanged');
end;
$$;

-- The append-only guarantee also resists an accidental privileged maintenance
-- write; this is stricter than the ordinary-role privilege/RLS boundary above.
reset role;
do $$
begin
  update public.people_engagement_events set event_type = event_type;
  raise exception 'ASSERTION FAILED: privileged update rewrote the immutable ledger';
exception when object_not_in_prerequisite_state then null;
end;
$$;
do $$
begin
  delete from public.people_engagement_events;
  raise exception 'ASSERTION FAILED: privileged delete erased the immutable ledger';
exception when object_not_in_prerequisite_state then null;
end;
$$;

rollback;
