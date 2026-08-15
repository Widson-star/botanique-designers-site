-- BD-OPERATIONS-HUB-01 — Maintenance assignment correction authority tests.
--
-- Runs on an isolated PostgreSQL 17 database after every migration is applied
-- in order (see scripts/test-maintenance-db.sh). No hosted Supabase is touched.
--
-- Proves: only the Principal may correct a recorded assignment; only role and
-- start_date may move; only while the assignment is open; a reason is
-- mandatory; the pre-correction values survive in an immutable ledger; stale
-- writes are refused; and the ordinary immutability Maintenance V1 shipped is
-- entirely intact for everyone else.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin if value is not true then raise exception 'ASSERTION FAILED: %', message; end if; end;
$$;

-- ---------------------------------------------------------------------
-- Fixtures
-- ---------------------------------------------------------------------
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000011c1', 'principal@correction.test'),
  ('00000000-0000-0000-0000-0000000011c2', 'manager@correction.test'),
  ('00000000-0000-0000-0000-0000000011c3', 'staff@correction.test');

insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000011c1', 'principal@correction.test', 'Principal', 'owner', true),
  ('00000000-0000-0000-0000-0000000011c2', 'manager@correction.test', 'Operations Manager', 'manager', true),
  ('00000000-0000-0000-0000-0000000011c3', 'staff@correction.test', 'Project Team', 'staff', true);

-- Led by the manager, so the manager genuinely reaches this project. Any
-- refusal below is therefore about Principal-only correction authority, not
-- about project reach.
insert into public.projects (
  id, project_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000002011c1', 'Correction Site', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000011c2', false, 'Not Reviewed');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000011c1', true);

insert into public.people (id, full_name, relationship_type) values
  ('00000000-0000-0000-0000-0000003011c1', 'Correction Person', 'regular_staff'),
  ('00000000-0000-0000-0000-0000003011c2', 'Second Person', 'regular_staff');

insert into public.maintenance_relationships (id, project_id, scope, start_date, frequency) values
  ('00000000-0000-0000-0000-0000004011c1', '00000000-0000-0000-0000-0000002011c1',
   'Weekly upkeep', date '2026-08-05', 'weekly');

-- =====================================================================
-- 0. Structural guarantees of the new ledger
-- =====================================================================
select pg_temp.assert_true(
  (select relrowsecurity from pg_class where oid = 'public.maintenance_assignment_events'::regclass),
  'the assignment event ledger has RLS enabled'
);
select pg_temp.assert_true(
  has_table_privilege('authenticated', 'public.maintenance_assignment_events', 'SELECT')
  and not has_table_privilege('authenticated', 'public.maintenance_assignment_events', 'INSERT')
  and not has_table_privilege('authenticated', 'public.maintenance_assignment_events', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.maintenance_assignment_events', 'DELETE'),
  'application roles may read the ledger but never write, rewrite or erase it'
);
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.maintenance_assignment_events', 'SELECT'),
  'anon cannot read the assignment ledger'
);

-- =====================================================================
-- 1. Creating an assignment writes a 'created' event
-- =====================================================================
do $$
declare created public.maintenance_assignments; event_row public.maintenance_assignment_events;
begin
  insert into public.maintenance_assignments (id, maintenance_relationship_id, person_id, role, start_date)
  values ('00000000-0000-0000-0000-0000005011c1', '00000000-0000-0000-0000-0000004011c1',
          '00000000-0000-0000-0000-0000003011c1', 'maintenance_lead', date '2026-08-17')
  returning * into created;

  select * into event_row from public.maintenance_assignment_events
  where maintenance_assignment_id = created.id;

  perform pg_temp.assert_true(event_row.event_type = 'created', 'creating an assignment records a created event');
  perform pg_temp.assert_true(event_row.previous_snapshot is null, 'a created event has no previous state');
  perform pg_temp.assert_true(event_row.reason is null, 'an ordinary creation carries no correction reason');
  perform pg_temp.assert_true(event_row.resulting_version = 1, 'the created event records version 1');
end;
$$;

-- =====================================================================
-- 2. Ordinary immutability is intact — the V1 rules still hold
-- =====================================================================
do $$
declare unchanged public.maintenance_assignments;
begin
  -- A plain PATCH still cannot move start_date: the audit trigger silently
  -- restores it, exactly as Maintenance V1 shipped.
  update public.maintenance_assignments set start_date = date '2026-01-01'
  where id = '00000000-0000-0000-0000-0000005011c1' returning * into unchanged;
  perform pg_temp.assert_true(
    unchanged.start_date = date '2026-08-17',
    'an ordinary update still cannot move an assignment start_date'
  );

  -- Identity stays frozen on an ordinary update too.
  update public.maintenance_assignments
  set person_id = '00000000-0000-0000-0000-0000003011c2'
  where id = '00000000-0000-0000-0000-0000005011c1' returning * into unchanged;
  perform pg_temp.assert_true(
    unchanged.person_id = '00000000-0000-0000-0000-0000003011c1'::uuid,
    'an ordinary update cannot change who the assignment is for'
  );
end;
$$;

-- =====================================================================
-- 3. Correction refuses everything it should, before changing anything
-- =====================================================================
do $$
declare target public.maintenance_assignments;
begin
  select * into target from public.maintenance_assignments where id = '00000000-0000-0000-0000-0000005011c1';

  -- Blank / whitespace-only / too-short reason.
  begin
    perform public.correct_maintenance_assignment(target.id, target.version, 'site_technician', date '2026-08-05', null);
    raise exception 'ASSERTION FAILED: a null correction reason must be refused';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.correct_maintenance_assignment(target.id, target.version, 'site_technician', date '2026-08-05', '   ');
    raise exception 'ASSERTION FAILED: a whitespace-only correction reason must be refused';
  exception when invalid_parameter_value then null;
  end;
  begin
    perform public.correct_maintenance_assignment(target.id, target.version, 'site_technician', date '2026-08-05', 'ab');
    raise exception 'ASSERTION FAILED: a too-short correction reason must be refused';
  exception when invalid_parameter_value then null;
  end;

  -- Invalid role vocabulary.
  begin
    perform public.correct_maintenance_assignment(target.id, target.version, 'head_gardener', date '2026-08-05', 'Recording error');
    raise exception 'ASSERTION FAILED: an invalid Maintenance responsibility must be refused';
  exception when invalid_parameter_value then null;
  end;

  -- Null start date.
  begin
    perform public.correct_maintenance_assignment(target.id, target.version, 'site_technician', null, 'Recording error');
    raise exception 'ASSERTION FAILED: a null corrected start date must be refused';
  exception when invalid_parameter_value then null;
  end;

  -- Stale expected_version.
  begin
    perform public.correct_maintenance_assignment(target.id, target.version + 1, 'site_technician', date '2026-08-05', 'Recording error');
    raise exception 'ASSERTION FAILED: a stale expected_version must be refused';
  exception when serialization_failure then null;
  end;

  -- Nothing above changed the record.
  select * into target from public.maintenance_assignments where id = '00000000-0000-0000-0000-0000005011c1';
  perform pg_temp.assert_true(target.role = 'maintenance_lead', 'the role is unchanged after every refused correction');
  perform pg_temp.assert_true(target.start_date = date '2026-08-17', 'the start date is unchanged after every refused correction');
end;
$$;

-- =====================================================================
-- 4. Neither the Operations Manager nor staff may correct
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000011c2', true);
do $$
declare target public.maintenance_assignments;
begin
  select * into target from public.maintenance_assignments where id = '00000000-0000-0000-0000-0000005011c1';

  -- The manager reaches this project (they lead it) and can do ordinary
  -- resourcing, so this refusal is specifically about correction authority.
  perform pg_temp.assert_true(
    public.can_manage_maintenance_project('00000000-0000-0000-0000-0000002011c1'),
    'the manager genuinely reaches this project'
  );

  begin
    perform public.correct_maintenance_assignment(target.id, target.version, 'site_technician', date '2026-08-05', 'Manager attempt');
    raise exception 'ASSERTION FAILED: the Operations Manager must not correct a recorded assignment';
  exception when insufficient_privilege then null;
  end;

  -- Ordinary resourcing authority is untouched: the manager may still re-role
  -- an open assignment.
  update public.maintenance_assignments set role = 'supervisor'
  where id = '00000000-0000-0000-0000-0000005011c1';
  perform pg_temp.assert_true(
    (select role from public.maintenance_assignments where id = '00000000-0000-0000-0000-0000005011c1') = 'supervisor',
    'the manager retains ordinary authority to re-role an open assignment'
  );
end;
$$;

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000011c3', true);
do $$
declare target_id uuid := '00000000-0000-0000-0000-0000005011c1';
begin
  begin
    perform public.correct_maintenance_assignment(target_id, 1, 'site_technician', date '2026-08-05', 'Staff attempt');
    raise exception 'ASSERTION FAILED: staff must not correct a Maintenance assignment';
  exception when insufficient_privilege then null;
  end;

  perform pg_temp.assert_true(
    (select count(*) from public.maintenance_assignment_events) = 0,
    'staff read no assignment ledger event at all'
  );
end;
$$;

-- =====================================================================
-- 5. The Principal corrects role and start_date, auditably
-- =====================================================================
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000011c1', true);
do $$
declare
  before_row public.maintenance_assignments;
  corrected public.maintenance_assignments;
  event_row public.maintenance_assignment_events;
begin
  select * into before_row from public.maintenance_assignments where id = '00000000-0000-0000-0000-0000005011c1';

  select * into corrected from public.correct_maintenance_assignment(
    before_row.id, before_row.version, 'site_technician', date '2026-08-05',
    '  Recording error: work began 5 Aug and Kefa is the technician, not the lead  '
  );

  perform pg_temp.assert_true(corrected.role = 'site_technician', 'the corrected role is stored');
  perform pg_temp.assert_true(corrected.start_date = date '2026-08-05', 'the corrected start date is stored');
  perform pg_temp.assert_true(corrected.version = before_row.version + 1, 'a correction bumps the version exactly once');
  perform pg_temp.assert_true(corrected.updated_by = auth.uid(), 'the correction is attributed to the real caller');
  perform pg_temp.assert_true(corrected.end_date is null, 'a correction never closes the assignment');

  -- Identity and provenance survive the correction untouched.
  perform pg_temp.assert_true(corrected.person_id = before_row.person_id, 'a correction cannot change the person');
  perform pg_temp.assert_true(
    corrected.maintenance_relationship_id = before_row.maintenance_relationship_id,
    'a correction cannot move the assignment to another relationship'
  );
  perform pg_temp.assert_true(corrected.created_by = before_row.created_by, 'creation provenance survives a correction');
  perform pg_temp.assert_true(corrected.created_at = before_row.created_at, 'creation time survives a correction');

  -- The pre-correction values remain recoverable from the ledger.
  select * into event_row from public.maintenance_assignment_events
  where maintenance_assignment_id = corrected.id and event_type = 'corrected';

  perform pg_temp.assert_true(event_row.id is not null, 'the correction is recorded as a corrected event');
  perform pg_temp.assert_true(
    event_row.reason = 'Recording error: work began 5 Aug and Kefa is the technician, not the lead',
    'the correction reason is stored, trimmed'
  );
  perform pg_temp.assert_true(
    (event_row.previous_snapshot ->> 'role') = 'supervisor',
    'the ledger preserves the role as it was before the correction'
  );
  perform pg_temp.assert_true(
    (event_row.previous_snapshot ->> 'start_date') = '2026-08-17',
    'the ledger preserves the start date as it was before the correction'
  );
  perform pg_temp.assert_true(
    (event_row.new_snapshot ->> 'role') = 'site_technician'
    and (event_row.new_snapshot ->> 'start_date') = '2026-08-05',
    'the ledger records the corrected values'
  );
  perform pg_temp.assert_true(event_row.actor_profile_id = auth.uid(), 'the ledger records who corrected it');
  perform pg_temp.assert_true(event_row.resulting_version = corrected.version, 'the ledger records the resulting version');
end;
$$;

-- The correction marker does not leak: a later ordinary update in the same
-- session still cannot move start_date, and is recorded as 'updated'.
do $$
declare after_row public.maintenance_assignments;
begin
  update public.maintenance_assignments set start_date = date '2020-01-01'
  where id = '00000000-0000-0000-0000-0000005011c1' returning * into after_row;
  perform pg_temp.assert_true(
    after_row.start_date = date '2026-08-05',
    'correction authority does not leak to later statements in the same transaction'
  );
  -- Exactly one correction ever happened, and this later ordinary update was
  -- recorded as an ordinary update carrying no reason.
  perform pg_temp.assert_true(
    (select count(*) from public.maintenance_assignment_events
     where maintenance_assignment_id = after_row.id and event_type = 'corrected') = 1,
    'exactly one corrected event exists — ordinary updates are never logged as corrections'
  );
  -- occurred_at is now(), the TRANSACTION timestamp, so it is identical for
  -- every event written in one transaction. resulting_version is the reliable
  -- ordering key: it increments once per write, per assignment.
  perform pg_temp.assert_true(
    (select event_type from public.maintenance_assignment_events
     where maintenance_assignment_id = after_row.id
     order by resulting_version desc limit 1) = 'updated',
    'the most recent event for this assignment is an ordinary update'
  );
  perform pg_temp.assert_true(
    (select reason from public.maintenance_assignment_events
     where maintenance_assignment_id = after_row.id
     order by resulting_version desc limit 1) is null,
    'an ordinary update carries no correction reason'
  );
end;
$$;

-- =====================================================================
-- 6. An ended assignment is historical and cannot be corrected
-- =====================================================================
do $$
declare target public.maintenance_assignments; ended public.maintenance_assignments;
begin
  select * into target from public.maintenance_assignments where id = '00000000-0000-0000-0000-0000005011c1';
  select * into ended from public.end_maintenance_assignment(target.id, target.version);
  perform pg_temp.assert_true(ended.end_date is not null, 'the assignment is now closed');

  perform pg_temp.assert_true(
    exists (select 1 from public.maintenance_assignment_events
            where maintenance_assignment_id = ended.id and event_type = 'ended'),
    'closing an assignment is recorded as an ended event'
  );

  begin
    perform public.correct_maintenance_assignment(ended.id, ended.version, 'inspector', date '2026-07-01', 'Too late');
    raise exception 'ASSERTION FAILED: an ended assignment must not be correctable';
  exception when invalid_parameter_value then null;
  end;

  perform pg_temp.assert_true(
    (select role from public.maintenance_assignments where id = ended.id) = 'site_technician',
    'the ended assignment is unchanged after the refused correction'
  );
end;
$$;

-- =====================================================================
-- 7. The ledger itself is immutable
-- =====================================================================
reset role;
do $$
declare event_id uuid;
begin
  select id into event_id from public.maintenance_assignment_events limit 1;

  begin
    update public.maintenance_assignment_events set reason = 'rewritten' where id = event_id;
    raise exception 'ASSERTION FAILED: assignment events must not be updatable';
  exception when object_not_in_prerequisite_state then null;
  end;

  begin
    delete from public.maintenance_assignment_events where id = event_id;
    raise exception 'ASSERTION FAILED: assignment events must not be deletable';
  exception when object_not_in_prerequisite_state then null;
  end;
end;
$$;

rollback;
