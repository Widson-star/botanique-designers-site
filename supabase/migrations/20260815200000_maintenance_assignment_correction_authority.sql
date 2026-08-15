-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Maintenance assignment correction authority
-- =====================================================================
-- Forward-only, additive. Does NOT edit
-- 20260814090000_operations_hub_maintenance_v1.sql, which is already applied
-- to production (version 20260815192636, recorded in applied-to-production.json).
--
-- WHY THIS EXISTS. The first real production Maintenance record was entered on
-- 15 Aug 2026 against Kitusuru Residence House 0.8A. A read-only reconciliation
-- audit against the site's existing Daily Site Records and Project Costs
-- established two recording errors in that first entry:
--   * the assignment start_date was captured as 2026-08-17 (the next scheduled
--     Mon/Wed/Sat maintenance day *after* data entry) when the evidenced start
--     of Kefa Nyamari Ochenge's maintenance work on that site is 2026-08-05;
--   * the assignment role was captured as 'maintenance_lead' when every record
--     — a single-worker crew, his existing People engagement as skilled_worker,
--     and an instruction note showing him being directed rather than directing
--     — supports 'site_technician'.
-- Maintenance V1 deliberately froze maintenance_assignments.start_date on
-- ordinary UPDATE (tg_audit_maintenance_assignments), and deliberately shipped
-- no assignment event ledger. Both were right for ordinary use: an assignment
-- period is not something day-to-day resourcing should be able to rewrite. But
-- it left a proven recording error permanently uncorrectable by any route.
--
-- WHAT THIS ADDS. The narrowest capability that makes such a correction
-- possible while keeping the historical fact auditable, following the
-- people_engagement_lifecycle_correction precedent (20260803194000) rather
-- than inventing weaker semantics:
--   1. public.maintenance_assignment_events — an append-only, immutable,
--      system-written ledger carrying the complete before/after state of every
--      assignment transition, with the correction reason. This also closes an
--      existing V1 gap: until now an assignment's creation, role edit and
--      closure left no trace beyond the row itself.
--   2. public.correct_maintenance_assignment(...) — a Principal-only,
--      version-checked RPC that may correct ONLY role and start_date, ONLY on
--      an OPEN assignment, and ONLY with a stated reason.
--
-- WHAT THIS DELIBERATELY DOES NOT DO. It does not relax the general
-- immutability of an assignment: an ordinary UPDATE still cannot move
-- start_date, and an ended assignment stays wholly terminal. It changes no
-- existing table's columns, adds no cadence/recurrence model, creates no
-- Maintenance visit, touches no Daily Site Record, Project Cost, People or
-- Project row, and mutates no production data. The live Kitusuru record is
-- corrected separately, after this ships and is verified.

-- =====================================================================
-- 1. Append-only assignment lifecycle ledger
-- =====================================================================
create table public.maintenance_assignment_events (
  id uuid primary key default gen_random_uuid(),
  maintenance_assignment_id uuid not null references public.maintenance_assignments(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated', 'ended', 'corrected')),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb not null check (jsonb_typeof(new_snapshot) = 'object'),
  reason text null check (reason is null or char_length(trim(reason)) between 3 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  resulting_version integer not null check (resulting_version > 0),
  -- A correction without a stated reason is exactly the silent overwrite this
  -- ledger exists to prevent.
  constraint maintenance_assignment_event_reason_required check (
    event_type <> 'corrected' or reason is not null
  )
);

create index maintenance_assignment_events_assignment_idx
  on public.maintenance_assignment_events (maintenance_assignment_id, occurred_at, id);

alter table public.maintenance_assignment_events enable row level security;

-- Read scope follows this domain's own two sibling ledgers
-- (maintenance_relationship_events, maintenance_visit_events): anyone who may
-- already manage the parent project may read it. That is deliberately the
-- Maintenance precedent rather than people_engagement_events' Principal-only
-- read, because the Operations Manager can already read the assignment rows
-- themselves, so a project-scoped ledger read exposes nothing new — while
-- WRITING a correction stays Principal-only through the RPC below.
create policy "maintenance_assignment_events_select_authorised"
  on public.maintenance_assignment_events for select
  to authenticated
  using (exists (
    select 1 from public.maintenance_assignments a
    join public.maintenance_relationships r on r.id = a.maintenance_relationship_id
    where a.id = maintenance_assignment_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

revoke all on public.maintenance_assignment_events from anon, authenticated;
grant select on public.maintenance_assignment_events to authenticated;

-- Defence in depth: application roles already lack INSERT/UPDATE/DELETE
-- privilege and any matching policy; this makes rewriting history require a
-- deliberate removal of the guard itself.
create or replace function public.tg_maintenance_assignment_events_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Maintenance assignment events are immutable' using errcode = '55000';
end;
$$;

create trigger maintenance_assignment_events_immutable
before update or delete on public.maintenance_assignment_events
for each row execute function public.tg_maintenance_assignment_events_immutable();

-- =====================================================================
-- 2. Audit trigger — unchanged behaviour, plus one controlled opening
-- =====================================================================
-- Identical to the Maintenance V1 definition in every respect except that
-- start_date may now move when, and only when, the transaction-local
-- correction marker set by correct_maintenance_assignment() is present.
-- maintenance_relationship_id, person_id, created_by and created_at stay
-- frozen on every UPDATE without exception, and an ordinary client PATCH
-- still cannot move start_date.
create or replace function public.tg_audit_maintenance_assignments()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  relationship public.maintenance_relationships;
  assigned public.people;
  controlled_correction boolean := coalesce(
    nullif(current_setting('app.maintenance_assignment_controlled_correction', true), ''),
    'false'
  )::boolean;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;

    -- CONCURRENCY CORRECTION (Maintenance V1): FOR SHARE serializes this
    -- insert against end_maintenance_relationship()'s FOR UPDATE on the same
    -- parent row, so an assignment can never be created against a
    -- relationship that concurrently finishes ending.
    select * into relationship from public.maintenance_relationships
    where id = new.maintenance_relationship_id for share;
    if not found then
      raise exception 'Maintenance relationship not found' using errcode = 'P0002';
    end if;
    if relationship.status = 'ended' then
      raise exception 'A person cannot be assigned to an ended Maintenance relationship'
        using errcode = '22023';
    end if;

    select * into assigned from public.people where id = new.person_id;
    if not found then
      raise exception 'Person not found' using errcode = 'P0002';
    end if;
    if not assigned.is_active then
      raise exception 'This person is no longer active and cannot be assigned to Maintenance'
        using errcode = '22023';
    end if;
  else
    -- Identity is frozen unconditionally. The original start is frozen too,
    -- except under the controlled Principal-only correction path.
    new.maintenance_relationship_id := old.maintenance_relationship_id;
    new.person_id := old.person_id;
    if not controlled_correction then
      new.start_date := old.start_date;
    end if;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

-- =====================================================================
-- 3. Automatic, system-written event capture
-- =====================================================================
create or replace function public.tg_record_maintenance_assignment_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled_correction boolean := coalesce(
    nullif(current_setting('app.maintenance_assignment_controlled_correction', true), ''),
    'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.maintenance_assignment_correction_reason', true), ''
  )), '');
  next_event_type text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'created';
  elsif controlled_correction then
    next_event_type := 'corrected';
  elsif old.end_date is null and new.end_date is not null then
    next_event_type := 'ended';
  else
    next_event_type := 'updated';
  end if;

  insert into public.maintenance_assignment_events (
    maintenance_assignment_id, event_type, previous_snapshot, new_snapshot,
    reason, actor_profile_id, occurred_at, resulting_version
  ) values (
    new.id, next_event_type,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    case when next_event_type = 'corrected' then supplied_reason else null end,
    auth.uid(), now(), new.version
  );

  return new;
end;
$$;

create trigger maintenance_assignments_event_writer
after insert or update on public.maintenance_assignments
for each row execute function public.tg_record_maintenance_assignment_event();

-- =====================================================================
-- 4. Principal-only correction RPC
-- =====================================================================
-- Corrects a proven recording error on an OPEN assignment. Follows
-- correct_people_engagement's shape: Principal authority, mandatory reason of
-- 3–1000 characters, expected_version, and a transaction-local marker set only
-- around its single UPDATE so nothing else in the caller's transaction
-- inherits correction authority.
create or replace function public.correct_maintenance_assignment(
  target_assignment_id uuid,
  expected_version integer,
  target_role text,
  target_start_date date,
  correction_reason text
)
returns public.maintenance_assignments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_assignments;
  corrected public.maintenance_assignments;
  relationship public.maintenance_relationships;
  clean_reason text := nullif(trim(coalesce(correction_reason, '')), '');
begin
  -- Correcting recorded history is exceptional authority, not ordinary
  -- resourcing. An Operations Manager may create, re-role and end assignments;
  -- only the Principal may rewrite when one started or what it was.
  if not public.is_owner() then
    raise exception 'Only the Principal may correct a Maintenance assignment'
      using errcode = '42501';
  end if;

  if clean_reason is null or char_length(clean_reason) < 3 then
    raise exception 'Explain why this Maintenance assignment is being corrected'
      using errcode = '22023';
  end if;
  if char_length(clean_reason) > 1000 then
    raise exception 'The correction reason must be 1000 characters or fewer'
      using errcode = '22023';
  end if;

  if target_role is null or target_role not in (
    'maintenance_lead', 'site_technician', 'inspector', 'supervisor', 'support'
  ) then
    raise exception 'Choose a valid Maintenance responsibility' using errcode = '22023';
  end if;

  if target_start_date is null then
    raise exception 'A start date is required' using errcode = '22023';
  end if;

  select * into existing from public.maintenance_assignments
  where id = target_assignment_id for update;
  if not found then
    raise exception 'Maintenance assignment not found' using errcode = 'P0002';
  end if;

  select * into relationship from public.maintenance_relationships
  where id = existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_project(relationship.project_id) then
    raise exception 'You are not authorised to manage this Maintenance assignment'
      using errcode = '42501';
  end if;

  if existing.version <> expected_version then
    raise exception 'This assignment was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  -- An ended assignment is historical and terminal. Correcting one would
  -- rewrite a closed period, which is exactly what the terminal guard exists
  -- to prevent; this check refuses it with a business message rather than
  -- letting the guard raise.
  if existing.end_date is not null then
    raise exception 'This Maintenance assignment has ended and is historical; it cannot be corrected'
      using errcode = '22023';
  end if;

  perform set_config('app.maintenance_assignment_controlled_correction', 'true', true);
  perform set_config('app.maintenance_assignment_correction_reason', clean_reason, true);

  update public.maintenance_assignments
  set role = target_role,
      start_date = target_start_date
  where id = existing.id and version = expected_version
  returning * into corrected;

  if not found then
    raise exception 'This assignment was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  -- Do not leave correction authority available to later statements in the
  -- caller's transaction. The event trigger has already consumed both values.
  perform set_config('app.maintenance_assignment_controlled_correction', 'false', true);
  perform set_config('app.maintenance_assignment_correction_reason', '', true);

  return corrected;
end;
$$;

-- =====================================================================
-- 5. Grants
-- =====================================================================
revoke execute on function public.tg_maintenance_assignment_events_immutable() from public, anon, authenticated;
revoke execute on function public.tg_record_maintenance_assignment_event() from public, anon, authenticated;
revoke execute on function public.correct_maintenance_assignment(uuid, integer, text, date, text) from public, anon;
grant execute on function public.correct_maintenance_assignment(uuid, integer, text, date, text) to authenticated;
