-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Maintenance V1 (Operations > Maintenance)
-- =====================================================================
-- CORRECTED before its first hosted application (still unapplied to
-- production at the time of this edit — see supabase/migrations/
-- applied-to-production.json and docs/ui-authority/operations-hub/
-- MIGRATION-DEPLOYMENT.md; no fake hosted history was created). A control
-- review found the original draft let a Maintenance relationship end while
-- open assignments and Scheduled visits remained, and let an ended
-- assignment be silently rewritten. Both are fixed in place below —
-- end_maintenance_relationship, the new maintenance_assignments terminal
-- guard, and the new end_maintenance_assignment() RPC — rather than shipped
-- as a second migration, so production receives one coherent initial
-- Maintenance authority.
--
-- SECOND CORRECTION, same review cycle, still pre-hosted-apply: the fixes
-- above closed the sequential case (ending against an already-Ended
-- relationship, or scheduling against one) but not the CONCURRENT one — a
-- visit or assignment INSERT racing a simultaneous End on the same
-- relationship, each reading the other's not-yet-committed state. Fixed by
-- taking a FOR SHARE lock on the parent maintenance_relationships row inside
-- tg_audit_maintenance_visits() and tg_audit_maintenance_assignments()'
-- INSERT branches, which now genuinely serializes against
-- end_maintenance_relationship()'s FOR UPDATE on that same row — see the
-- comments at each call site. No advisory lock, no SERIALIZABLE isolation
-- change, nothing outside Maintenance V1. Everything else in this file is
-- unchanged.
--
-- Authorised implementation tranche, 14 August 2026. Builds ONLY the
-- Maintenance domain confirmed MISSING by the read-only Operations audit
-- (docs/ui-authority/operations-hub/working-authority/README.md tension #3;
-- WORKSTREAMS.md's repository reconciliation table). Tools & Equipment is
-- explicitly NOT part of this migration and remains its own, later,
-- Operations destination — see the settled ruling in
-- docs/ui-authority/operations-hub/operating-model-authority/decision-record.md
-- addendum (9 Aug 2026): "Image 11 does not merge Maintenance and Tools &
-- Equipment; they remain two distinct Operations capabilities."
--
-- CRITICAL RULING THIS MIGRATION IMPLEMENTS: Maintenance has its own
-- lifecycle. It is not a Project status, stage or type. A Project may be
-- Completed while its Maintenance relationship stays Active — this migration
-- adds no column to public.projects and no trigger that reads or writes
-- projects.status/stage in either direction. The existing legacy
-- projects.project_type/stage 'Maintenance' CHECK values are untouched: no
-- constraint is dropped or altered, no constant is changed, no production row
-- is converted. That cleanup is explicitly out of scope for this migration
-- and is left for a separate, later, Founder-authorised unit.
--
-- WHAT THIS MIGRATION DOES NOT DO: it creates no Tools & Equipment object; no
-- Finance object of any kind (no cost, payment, advance, reconciliation,
-- billing, invoice or margin field or table); no attachment/evidence/storage
-- object; no notification/alert object; no change to public.projects,
-- public.people, public.profiles or any existing table, policy, function or
-- trigger. It is purely additive.
--
-- THREE V1 ENTITIES, matching the Founder's settled data-model decision:
--   A. maintenance_relationships — Botanique's maintenance service
--      relationship with one existing Project/site. Own lifecycle:
--      active / paused / ended. Never derives its status from
--      projects.status, and projects.status is never written by anything
--      in this migration.
--   B. maintenance_visits — one scheduled maintenance visit against a
--      relationship. Own lifecycle: scheduled / completed / cancelled.
--      last_visit / next_visit are DERIVED (see maintenance_register() and
--      maintenance_relationship_next_visit() below) and are never stored on
--      the relationship row.
--   C. maintenance_assignments — a many-to-many join between an existing
--      public.people row and a maintenance relationship, answering "who is
--      responsible for this Maintenance relationship" (a distinct fact from
--      people_engagements, which answers "who is engaged on this Project").
--      No name/phone/relationship_type is duplicated from public.people.
--
-- Two supporting append-only, immutable event tables give the two lifecycle
-- entities (A and B) a reconstructable transition history, matching the
-- established people_engagement_events / daily_site_entry_events precedent.
-- Assignments (C) intentionally get no dedicated event table: an assignment
-- period is fully reconstructable from its own start_date/end_date and
-- system-stamped audit columns, exactly as public.people_engagements shipped
-- originally (BD-PEOPLE-01, Stage 5) before the later, separate correction-
-- authority migration added its own ledger for an exceptional capability this
-- brief does not request for Maintenance.
--
-- AUTHORITY MODEL: Maintenance is an operational site record, so it follows
-- the project-scoped authority shape already used by Daily Site Operations
-- (can_manage_daily_site_project) and People Engagements
-- (can_access_people_engagement_project) rather than the portfolio-wide People
-- REGISTER shape: the Principal reaches every project; an Operations Manager
-- reaches a project they lead or are actively assigned to. No new access
-- path is invented. Staff and viewer roles reach nothing here, matching every
-- other Operations domain.
--
-- CONCURRENCY AND AUDIT: every mutable table carries `version integer not
-- null default 1`, bumped by a BEFORE trigger that also forces
-- created_by/updated_by/created_at/updated_at from auth.uid()/now() — a
-- client can never spoof any of the four. State-changing actions
-- (pause/resume/end a relationship; reschedule/complete/cancel a visit) are
-- SECURITY DEFINER RPCs that lock the row with `for update`, compare the
-- caller's expected_version and raise errcode 40001 on a stale write — the
-- same optimistic-concurrency shape already proven across cost claims, fund
-- requests, releases and people-engagement corrections, applied here from
-- first release to avoid the unguarded-overwrite defect already known on
-- public.projects (which has no version column at all).

-- pgcrypto already exists from the foundation migration; defensive no-op.
create extension if not exists pgcrypto;

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- A. maintenance_relationships — Botanique's maintenance relationship with
--    one existing Project/site.
create table public.maintenance_relationships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,

  status text not null default 'active' check (status in ('active', 'paused', 'ended')),

  -- "Maintenance scope / service description" — the required free-text field
  -- from the Founder's V1 field list. Not a duplicate of project scope: this
  -- describes the maintenance service itself (e.g. "Fortnightly lawn and
  -- border upkeep, irrigation check").
  scope text not null check (char_length(trim(scope)) between 1 and 2000),

  start_date date not null,

  -- Service frequency — a closed vocabulary so the register can be read at a
  -- glance; 'other' exists as an escape hatch and is explained, if needed, in
  -- `scope` rather than inventing a free-text sibling column.
  frequency text not null check (frequency in (
    'weekly', 'fortnightly', 'monthly', 'quarterly', 'biannual', 'annual', 'as_needed', 'other'
  )),

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one non-ended maintenance relationship per project. A site is
-- either not under Botanique maintenance, or it has exactly one live
-- relationship (active or paused) — ending the current one is required
-- before a new one can start. Multiple ENDED relationships for the same
-- project remain fully representable as history.
create unique index maintenance_relationships_one_live_per_project
  on public.maintenance_relationships (project_id)
  where status <> 'ended';

create index maintenance_relationships_project_idx
  on public.maintenance_relationships (project_id, status);

-- B. maintenance_visits — one scheduled maintenance visit against a
--    relationship.
create table public.maintenance_visits (
  id uuid primary key default gen_random_uuid(),
  maintenance_relationship_id uuid not null references public.maintenance_relationships(id) on delete restrict,

  scheduled_date date not null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),

  -- "Concise planned work / purpose" — required on every visit.
  purpose text not null check (char_length(trim(purpose)) between 1 and 1000),

  completed_at timestamptz null,
  -- "Concise completed-work / maintenance note" — required exactly when
  -- completed.
  completion_note text null check (completion_note is null or char_length(trim(completion_note)) between 1 and 2000),
  cancellation_reason text null check (cancellation_reason is null or char_length(trim(cancellation_reason)) between 1 and 1000),

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint maintenance_visit_completed_fields check (
    (status = 'completed' and completed_at is not null and completion_note is not null)
    or (status <> 'completed' and completed_at is null and completion_note is null)
  ),
  constraint maintenance_visit_cancelled_fields check (
    (status = 'cancelled' and cancellation_reason is not null)
    or (status <> 'cancelled' and cancellation_reason is null)
  )
);

create index maintenance_visits_relationship_idx
  on public.maintenance_visits (maintenance_relationship_id, scheduled_date);

-- Fast "next scheduled visit" / "last completed visit" lookups, matching the
-- two derivations the register and the Project-detail indicator both need.
create index maintenance_visits_scheduled_upcoming_idx
  on public.maintenance_visits (maintenance_relationship_id, scheduled_date)
  where status = 'scheduled';

create index maintenance_visits_completed_idx
  on public.maintenance_visits (maintenance_relationship_id, scheduled_date)
  where status = 'completed';

-- C. maintenance_assignments — many-to-many: an existing public.people row is
--    responsible for a maintenance relationship. Deliberately distinct from
--    public.people_engagements, which answers a different question ("engaged
--    on this Project") and is never written or read by this table.
create table public.maintenance_assignments (
  id uuid primary key default gen_random_uuid(),
  maintenance_relationship_id uuid not null references public.maintenance_relationships(id) on delete restrict,
  person_id uuid not null references public.people(id) on delete restrict,

  role text not null check (role in (
    'maintenance_lead', 'site_technician', 'inspector', 'supervisor', 'support'
  )),

  start_date date not null,
  end_date date null,

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint maintenance_assignment_period check (end_date is null or end_date >= start_date)
);

-- One OPEN assignment per person per relationship, mirroring
-- people_engagements_one_open_per_project exactly. Ended assignments remain
-- as history and do not collide with a later re-assignment of the same
-- person to the same relationship.
create unique index maintenance_assignments_one_open_per_relationship
  on public.maintenance_assignments (maintenance_relationship_id, person_id)
  where end_date is null;

create index maintenance_assignments_relationship_idx
  on public.maintenance_assignments (maintenance_relationship_id, start_date desc);
create index maintenance_assignments_person_idx
  on public.maintenance_assignments (person_id, start_date desc);

-- Append-only lifecycle ledgers for the two entities with a real state
-- machine. Immutable, system-written, readable by anyone who can already
-- read the parent row.
create table public.maintenance_relationship_events (
  id uuid primary key default gen_random_uuid(),
  maintenance_relationship_id uuid not null references public.maintenance_relationships(id) on delete restrict,
  event_type text not null check (event_type in ('created', 'updated', 'paused', 'resumed', 'ended')),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb not null check (jsonb_typeof(new_snapshot) = 'object'),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  resulting_version integer not null check (resulting_version > 0)
);

create index maintenance_relationship_events_relationship_idx
  on public.maintenance_relationship_events (maintenance_relationship_id, occurred_at, id);

create table public.maintenance_visit_events (
  id uuid primary key default gen_random_uuid(),
  maintenance_visit_id uuid not null references public.maintenance_visits(id) on delete restrict,
  event_type text not null check (event_type in ('scheduled', 'rescheduled', 'updated', 'completed', 'cancelled')),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb not null check (jsonb_typeof(new_snapshot) = 'object'),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  resulting_version integer not null check (resulting_version > 0)
);

create index maintenance_visit_events_visit_idx
  on public.maintenance_visit_events (maintenance_visit_id, occurred_at, id);

-- =====================================================================
-- 2. Authority helpers
-- =====================================================================

-- The projects a caller may manage Maintenance for. Reuses the exact shape
-- already established by can_manage_daily_site_project: owner reaches every
-- project; a manager reaches a project they lead or are actively assigned
-- to via public.project_assignments. No new access path is invented.
create or replace function public.can_manage_maintenance_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case public.current_user_role()
    when 'owner' then exists (
      select 1 from public.projects p where p.id = target_project_id
    )
    when 'manager' then exists (
      select 1 from public.projects p
      where p.id = target_project_id
        and (public.is_assigned_to_project(p.id) or p.lead_person_id = auth.uid())
    )
    else false
  end
$$;

-- The projects a caller may START a new maintenance relationship for.
-- Restricted to the three statuses the Founder named as legitimate
-- (Ongoing, Paused, Completed) and to unarchived projects — archived
-- projects follow the repository's existing archived-record discipline and
-- do not appear in an ordinary "start Maintenance" picker. This mirrors how
-- people_engagement_projects() keeps archived projects out of its own
-- "engage on a project" picker while still allowing them to be read once
-- referenced by history.
create or replace function public.maintenance_authorised_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select project.*
  from public.projects project
  where public.can_manage_maintenance_project(project.id)
    and project.archived = false
    and project.status in ('Ongoing', 'Paused', 'Completed')
  order by project.project_name
$$;

-- =====================================================================
-- 3. Audit + validation triggers (system-derived actor/timestamp/version;
--    business-rule validation on insert).
-- =====================================================================

create or replace function public.tg_audit_maintenance_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_project public.projects;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    -- A relationship always starts Active. A client cannot create one
    -- already Paused or Ended.
    new.status := 'active';

    select * into target_project from public.projects where id = new.project_id;
    if not found then
      raise exception 'Project not found' using errcode = 'P0002';
    end if;
    if target_project.archived then
      raise exception 'Maintenance cannot be started on an archived project'
        using errcode = '22023';
    end if;
    if target_project.status not in ('Ongoing', 'Paused', 'Completed') then
      raise exception 'Maintenance can only be started on an Ongoing, Paused or Completed project'
        using errcode = '22023';
    end if;
  else
    new.project_id := old.project_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.scope := regexp_replace(trim(new.scope), '\s+', ' ', 'g');
  return new;
end;
$$;

create trigger maintenance_relationships_audit
before insert or update on public.maintenance_relationships
for each row execute function public.tg_audit_maintenance_relationships();

-- Status may only change through the controlled pause/resume/end RPCs below,
-- which set this transaction-local marker for their one UPDATE. An ordinary
-- client UPDATE may still edit scope/frequency/start_date directly.
create or replace function public.tg_maintenance_relationship_status_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.maintenance_relationship_controlled_transition', true), ''),
    'false'
  )::boolean;
begin
  if new.status is distinct from old.status and not controlled then
    raise exception 'Use the pause, resume or end action to change Maintenance status'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger maintenance_relationships_status_guard
before update on public.maintenance_relationships
for each row execute function public.tg_maintenance_relationship_status_guard();

create or replace function public.tg_record_maintenance_relationship_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.maintenance_relationship_controlled_transition', true), ''),
    'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.maintenance_relationship_transition_reason', true), ''
  )), '');
  next_event_type text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'created';
  elsif controlled and new.status = 'paused' then
    next_event_type := 'paused';
  elsif controlled and new.status = 'active' then
    next_event_type := 'resumed';
  elsif controlled and new.status = 'ended' then
    next_event_type := 'ended';
  else
    next_event_type := 'updated';
  end if;

  insert into public.maintenance_relationship_events (
    maintenance_relationship_id, event_type, previous_snapshot, new_snapshot,
    reason, actor_profile_id, occurred_at, resulting_version
  ) values (
    new.id, next_event_type,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    case when next_event_type in ('paused', 'ended') then supplied_reason else null end,
    auth.uid(), now(), new.version
  );

  return new;
end;
$$;

create trigger maintenance_relationships_event_writer
after insert or update on public.maintenance_relationships
for each row execute function public.tg_record_maintenance_relationship_event();

create or replace function public.tg_maintenance_relationship_events_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Maintenance relationship events are immutable' using errcode = '55000';
end;
$$;

create trigger maintenance_relationship_events_immutable
before update or delete on public.maintenance_relationship_events
for each row execute function public.tg_maintenance_relationship_events_immutable();

-- ---------------------------------------------------------------------
-- Visits
-- ---------------------------------------------------------------------
create or replace function public.tg_audit_maintenance_visits()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  relationship public.maintenance_relationships;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    -- A visit is always created Scheduled; completion/cancellation happen
    -- only through their own controlled actions.
    new.status := 'scheduled';
    new.completed_at := null;
    new.completion_note := null;
    new.cancellation_reason := null;

    -- CONCURRENCY CORRECTION (pre-hosted-apply): FOR SHARE, not a plain
    -- SELECT. end_maintenance_relationship() locks the parent row FOR
    -- UPDATE for its whole transaction; a plain read here would not block
    -- on that lock (only see the last COMMITTED status), letting a visit be
    -- inserted concurrently with an End that already checked zero Scheduled
    -- visits exist. FOR SHARE conflicts with FOR UPDATE (but not with
    -- another FOR SHARE, so concurrent visit/assignment inserts against the
    -- same still-Active relationship do not block each other): whichever of
    -- this insert or End reaches the row first now genuinely excludes the
    -- other until it commits, so the final state is always one of
    -- {Active relationship + new Scheduled visit} or
    -- {Ended relationship + insert rejected} — never both an Ended
    -- relationship and a Scheduled visit.
    select * into relationship from public.maintenance_relationships
    where id = new.maintenance_relationship_id for share;
    if not found then
      raise exception 'Maintenance relationship not found' using errcode = 'P0002';
    end if;
    if relationship.status = 'ended' then
      raise exception 'A visit cannot be scheduled against an ended Maintenance relationship'
        using errcode = '22023';
    end if;
  else
    new.maintenance_relationship_id := old.maintenance_relationship_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.purpose := regexp_replace(trim(new.purpose), '\s+', ' ', 'g');
  return new;
end;
$$;

create trigger maintenance_visits_audit
before insert or update on public.maintenance_visits
for each row execute function public.tg_audit_maintenance_visits();

-- scheduled_date/status/completed_at/completion_note/cancellation_reason may
-- only change through the controlled reschedule/complete/cancel RPCs.
-- `purpose` may still be edited directly by a plain client UPDATE while a
-- visit is Scheduled. A Completed or Cancelled visit is terminal: no field
-- protected by this guard may change again, controlled or not — this is the
-- explicit "a Completed visit must not silently become Scheduled again" rule.
create or replace function public.tg_maintenance_visit_transition_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.maintenance_visit_controlled_transition', true), ''),
    'false'
  )::boolean;
  protected_field_changed boolean :=
    new.status is distinct from old.status
    or new.scheduled_date is distinct from old.scheduled_date
    or new.completed_at is distinct from old.completed_at
    or new.completion_note is distinct from old.completion_note
    or new.cancellation_reason is distinct from old.cancellation_reason;
begin
  if not protected_field_changed then
    return new;
  end if;
  if old.status in ('completed', 'cancelled') then
    raise exception 'A completed or cancelled visit cannot be changed'
      using errcode = '22023';
  end if;
  if not controlled then
    raise exception 'Use the reschedule, complete or cancel action to change this visit'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger maintenance_visits_transition_guard
before update on public.maintenance_visits
for each row execute function public.tg_maintenance_visit_transition_guard();

create or replace function public.tg_record_maintenance_visit_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.maintenance_visit_controlled_transition', true), ''),
    'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.maintenance_visit_transition_reason', true), ''
  )), '');
  next_event_type text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'scheduled';
  elsif controlled and new.status = 'completed' then
    next_event_type := 'completed';
  elsif controlled and new.status = 'cancelled' then
    next_event_type := 'cancelled';
  elsif controlled and new.scheduled_date is distinct from old.scheduled_date then
    next_event_type := 'rescheduled';
  else
    next_event_type := 'updated';
  end if;

  insert into public.maintenance_visit_events (
    maintenance_visit_id, event_type, previous_snapshot, new_snapshot,
    reason, actor_profile_id, occurred_at, resulting_version
  ) values (
    new.id, next_event_type,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    case when next_event_type = 'cancelled' then supplied_reason else null end,
    auth.uid(), now(), new.version
  );

  return new;
end;
$$;

create trigger maintenance_visits_event_writer
after insert or update on public.maintenance_visits
for each row execute function public.tg_record_maintenance_visit_event();

create or replace function public.tg_maintenance_visit_events_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Maintenance visit events are immutable' using errcode = '55000';
end;
$$;

create trigger maintenance_visit_events_immutable
before update or delete on public.maintenance_visit_events
for each row execute function public.tg_maintenance_visit_events_immutable();

-- ---------------------------------------------------------------------
-- Assignments
-- ---------------------------------------------------------------------
create or replace function public.tg_audit_maintenance_assignments()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  relationship public.maintenance_relationships;
  assigned public.people;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;

    -- CONCURRENCY CORRECTION (pre-hosted-apply): FOR SHARE for the identical
    -- reason as tg_audit_maintenance_visits — this must serialize against
    -- end_maintenance_relationship()'s FOR UPDATE on the same parent row, so
    -- a new assignment can never be created against a relationship that
    -- concurrently finishes ending. Whichever reaches the row first
    -- excludes the other until commit: either the assignment is inserted
    -- into a still-Active relationship (and End's later atomic close sweeps
    -- it up), or the relationship has already ended and this insert is
    -- rejected outright — never an Ended relationship with a newly-created
    -- open assignment.
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
    -- Identity and the original start are frozen. Ordinary authority may
    -- still correct the role of an OPEN assignment; closing one (end_date)
    -- is a one-way transition and is gated by the terminal guard below, not
    -- by this function.
    new.maintenance_relationship_id := old.maintenance_relationship_id;
    new.person_id := old.person_id;
    new.start_date := old.start_date;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  return new;
end;
$$;

create trigger maintenance_assignments_audit
before insert or update on public.maintenance_assignments
for each row execute function public.tg_audit_maintenance_assignments();

-- LIFECYCLE CORRECTION (pre-hosted-apply): an ended assignment is historical
-- and terminal. Without a dedicated assignment-event ledger (a deliberate V1
-- choice — see the file header), the row itself IS the history, so nothing
-- may rewrite it once closed: no reopening, no role/person/relationship/
-- start_date change, no re-closing to a different date. Closing an OPEN
-- assignment (end_date null -> not null) is itself a one-way transition and
-- may only happen through the controlled path this transaction-local marker
-- gates — set by end_maintenance_assignment() below for a single assignment,
-- and by end_maintenance_relationship()'s atomic bulk close for every
-- assignment still open when a relationship ends. An ordinary PATCH (e.g. a
-- role correction on a still-open assignment) is unaffected.
create or replace function public.tg_maintenance_assignment_terminal_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.maintenance_assignment_controlled_close', true), ''),
    'false'
  )::boolean;
begin
  if old.end_date is not null then
    raise exception 'This Maintenance assignment has ended and is historical; it cannot be changed'
      using errcode = '22023';
  end if;
  if new.end_date is distinct from old.end_date and not controlled then
    raise exception 'Use the end assignment action to close this Maintenance assignment'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger maintenance_assignments_terminal_guard
before update on public.maintenance_assignments
for each row execute function public.tg_maintenance_assignment_terminal_guard();

-- Controlled, version-safe single-assignment close. Rejects a stale version,
-- rejects an already-ended assignment (no double-close), and — because the
-- terminal guard above blocks it structurally — cannot reopen one either.
create or replace function public.end_maintenance_assignment(
  target_assignment_id uuid, expected_version integer
)
returns public.maintenance_assignments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_assignments;
  relationship public.maintenance_relationships;
begin
  select * into existing from public.maintenance_assignments where id = target_assignment_id for update;
  if not found then
    raise exception 'Maintenance assignment not found' using errcode = 'P0002';
  end if;

  select * into relationship from public.maintenance_relationships where id = existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_project(relationship.project_id) then
    raise exception 'You are not authorised to manage this Maintenance assignment' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This assignment was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.end_date is not null then
    raise exception 'This assignment has already ended' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_assignment_controlled_close', 'true', true);

  -- greatest(): an assignment whose start_date has not arrived yet cannot
  -- close before it started (maintenance_assignment_period would refuse
  -- end_date < start_date) — it closes on its own start date instead,
  -- recording a valid, zero-length assignment rather than blocking the close.
  update public.maintenance_assignments set end_date = greatest(current_date, start_date)
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This assignment was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_assignment_controlled_close', 'false', true);
  return existing;
end;
$$;

-- =====================================================================
-- 4. Derived reads — register + Project-detail summary.
-- Nothing here is stored: last/next visit and the assigned-team list are
-- computed at query time, every time.
-- =====================================================================

-- The compact Maintenance register: one row per relationship the caller may
-- reach, with the site/project, derived last/next visit and the current
-- assigned team already attached — no N+1 client-side queries.
create or replace function public.maintenance_register()
returns table (
  id uuid,
  project_id uuid,
  project_name text,
  client_site_name text,
  project_status text,
  status text,
  scope text,
  frequency text,
  start_date date,
  version integer,
  last_visit_date date,
  next_visit_date date,
  assigned_team jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    r.id, r.project_id, p.project_name, p.client_site_name, p.status,
    r.status, r.scope, r.frequency, r.start_date, r.version,
    (
      select max(v.scheduled_date) from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id and v.status = 'completed'
    ) as last_visit_date,
    (
      select min(v.scheduled_date) from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id and v.status = 'scheduled'
        and v.scheduled_date >= current_date
    ) as next_visit_date,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'person_id', a.person_id, 'full_name', pe.full_name, 'role', a.role
      ) order by pe.full_name)
      from public.maintenance_assignments a
      join public.people pe on pe.id = a.person_id
      where a.maintenance_relationship_id = r.id and a.end_date is null
    ), '[]'::jsonb) as assigned_team
  from public.maintenance_relationships r
  join public.projects p on p.id = r.project_id
  where public.can_manage_maintenance_project(r.project_id)
  order by p.project_name
$$;

-- The compact, read-only cross-domain summary a Project detail page renders.
-- Returns no row when the project has no live (active/paused) Maintenance
-- relationship — a truthful absence, never an invented one.
create or replace function public.maintenance_project_summary(target_project_id uuid)
returns table (
  id uuid,
  status text,
  next_visit_date date
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select r.id, r.status,
    (
      select min(v.scheduled_date) from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id and v.status = 'scheduled'
        and v.scheduled_date >= current_date
    ) as next_visit_date
  from public.maintenance_relationships r
  where r.project_id = target_project_id
    and r.status <> 'ended'
    and public.can_manage_maintenance_project(r.project_id)
$$;

-- =====================================================================
-- 5. Row level security
-- =====================================================================
alter table public.maintenance_relationships enable row level security;
alter table public.maintenance_relationship_events enable row level security;
alter table public.maintenance_visits enable row level security;
alter table public.maintenance_visit_events enable row level security;
alter table public.maintenance_assignments enable row level security;

create policy "maintenance_relationships_select_authorised"
  on public.maintenance_relationships for select
  to authenticated
  using (public.can_manage_maintenance_project(project_id));

create policy "maintenance_relationships_insert_authorised"
  on public.maintenance_relationships for insert
  to authenticated
  with check (public.can_manage_maintenance_project(project_id));

create policy "maintenance_relationships_update_authorised"
  on public.maintenance_relationships for update
  to authenticated
  using (public.can_manage_maintenance_project(project_id))
  with check (public.can_manage_maintenance_project(project_id));

create policy "maintenance_relationship_events_select_authorised"
  on public.maintenance_relationship_events for select
  to authenticated
  using (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_visits_select_authorised"
  on public.maintenance_visits for select
  to authenticated
  using (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_visits_insert_authorised"
  on public.maintenance_visits for insert
  to authenticated
  with check (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_visits_update_authorised"
  on public.maintenance_visits for update
  to authenticated
  using (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ))
  with check (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_visit_events_select_authorised"
  on public.maintenance_visit_events for select
  to authenticated
  using (exists (
    select 1 from public.maintenance_visits v
    join public.maintenance_relationships r on r.id = v.maintenance_relationship_id
    where v.id = maintenance_visit_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_assignments_select_authorised"
  on public.maintenance_assignments for select
  to authenticated
  using (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_assignments_insert_authorised"
  on public.maintenance_assignments for insert
  to authenticated
  with check (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

create policy "maintenance_assignments_update_authorised"
  on public.maintenance_assignments for update
  to authenticated
  using (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ))
  with check (exists (
    select 1 from public.maintenance_relationships r
    where r.id = maintenance_relationship_id
      and public.can_manage_maintenance_project(r.project_id)
  ));

-- No DELETE policy anywhere in this migration, and DELETE is never granted
-- below. Maintenance relationships, visits and assignments are closed, never
-- erased.

-- =====================================================================
-- 6. Controlled state-transition RPCs.
-- =====================================================================

create or replace function public.pause_maintenance_relationship(
  target_relationship_id uuid, expected_version integer, reason text default null
)
returns public.maintenance_relationships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_relationships;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  select * into existing from public.maintenance_relationships where id = target_relationship_id for update;
  if not found then
    raise exception 'Maintenance relationship not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_maintenance_project(existing.project_id) then
    raise exception 'You are not authorised to manage this Maintenance relationship' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status <> 'active' then
    raise exception 'Only an Active Maintenance relationship can be paused' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'true', true);
  perform set_config('app.maintenance_relationship_transition_reason', coalesce(clean_reason, ''), true);

  update public.maintenance_relationships set status = 'paused'
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'false', true);
  perform set_config('app.maintenance_relationship_transition_reason', '', true);
  return existing;
end;
$$;

create or replace function public.resume_maintenance_relationship(
  target_relationship_id uuid, expected_version integer
)
returns public.maintenance_relationships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_relationships;
begin
  select * into existing from public.maintenance_relationships where id = target_relationship_id for update;
  if not found then
    raise exception 'Maintenance relationship not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_maintenance_project(existing.project_id) then
    raise exception 'You are not authorised to manage this Maintenance relationship' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status <> 'paused' then
    raise exception 'Only a Paused Maintenance relationship can be resumed' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'true', true);

  update public.maintenance_relationships set status = 'active'
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'false', true);
  return existing;
end;
$$;

-- LIFECYCLE CORRECTION (pre-hosted-apply): ending a Maintenance relationship
-- is the real closure of Botanique's service relationship with the site, so
-- three things are now enforced that the first draft of this migration
-- missed:
--   1. A reason is REQUIRED (not optional — Pause stays optional; only End
--      changes here), because "why did the relationship end" is exactly the
--      kind of fact a closed relationship must not be silent about.
--   2. Ending is REFUSED while any visit for this relationship is still
--      'scheduled'. A Scheduled visit may simply not yet be recorded as
--      Completed, so auto-cancelling it on End would write false history.
--      The caller must explicitly Complete or Cancel every such visit first.
--   3. Once the above two gates pass, every currently OPEN assignment
--      (end_date is null) for this relationship is closed atomically in the
--      SAME transaction, end_date set from the trusted database clock
--      (current_date) — never client-supplied. If any step raises, nothing
--      here is written: a single PL/pgSQL function body is one transaction,
--      so a failed reason/visit/version check leaves the relationship AND
--      every assignment exactly as they were.
create or replace function public.end_maintenance_relationship(
  target_relationship_id uuid, expected_version integer, reason text default null
)
returns public.maintenance_relationships
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_relationships;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
  open_scheduled_visits integer;
begin
  if clean_reason is null then
    raise exception 'A reason is required to end this Maintenance relationship' using errcode = '22023';
  end if;

  select * into existing from public.maintenance_relationships where id = target_relationship_id for update;
  if not found then
    raise exception 'Maintenance relationship not found' using errcode = 'P0002';
  end if;
  if not public.can_manage_maintenance_project(existing.project_id) then
    raise exception 'You are not authorised to manage this Maintenance relationship' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status = 'ended' then
    raise exception 'This Maintenance relationship has already ended' using errcode = '22023';
  end if;

  select count(*) into open_scheduled_visits
  from public.maintenance_visits
  where maintenance_relationship_id = existing.id and status = 'scheduled';
  if open_scheduled_visits > 0 then
    raise exception 'Resolve all scheduled Maintenance visits before ending this relationship' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'true', true);
  perform set_config('app.maintenance_relationship_transition_reason', clean_reason, true);

  update public.maintenance_relationships set status = 'ended'
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'false', true);
  perform set_config('app.maintenance_relationship_transition_reason', '', true);

  -- Atomic open-assignment closure — same transaction, server-derived date.
  -- greatest(): an assignment whose start_date has not arrived yet closes on
  -- its own start date rather than before it (see end_maintenance_assignment
  -- for the identical reasoning) — it never blocks the relationship's End.
  perform set_config('app.maintenance_assignment_controlled_close', 'true', true);
  update public.maintenance_assignments
  set end_date = greatest(current_date, start_date)
  where maintenance_relationship_id = existing.id and end_date is null;
  perform set_config('app.maintenance_assignment_controlled_close', 'false', true);

  return existing;
end;
$$;

create or replace function public.reschedule_maintenance_visit(
  target_visit_id uuid, expected_version integer, new_scheduled_date date
)
returns public.maintenance_visits
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_visits;
  relationship public.maintenance_relationships;
begin
  if new_scheduled_date is null then
    raise exception 'A scheduled date is required' using errcode = '22023';
  end if;

  select * into existing from public.maintenance_visits where id = target_visit_id for update;
  if not found then
    raise exception 'Maintenance visit not found' using errcode = 'P0002';
  end if;
  select * into relationship from public.maintenance_relationships where id = existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_project(relationship.project_id) then
    raise exception 'You are not authorised to manage this Maintenance visit' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status <> 'scheduled' then
    raise exception 'Only a Scheduled visit can be rescheduled' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'true', true);

  update public.maintenance_visits set scheduled_date = new_scheduled_date
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'false', true);
  return existing;
end;
$$;

create or replace function public.complete_maintenance_visit(
  target_visit_id uuid, expected_version integer, completion_note text
)
returns public.maintenance_visits
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_visits;
  relationship public.maintenance_relationships;
  clean_note text := nullif(trim(coalesce(completion_note, '')), '');
begin
  if clean_note is null then
    raise exception 'A completion note is required' using errcode = '22023';
  end if;

  select * into existing from public.maintenance_visits where id = target_visit_id for update;
  if not found then
    raise exception 'Maintenance visit not found' using errcode = 'P0002';
  end if;
  select * into relationship from public.maintenance_relationships where id = existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_project(relationship.project_id) then
    raise exception 'You are not authorised to manage this Maintenance visit' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status <> 'scheduled' then
    raise exception 'Only a Scheduled visit can be completed' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'true', true);

  update public.maintenance_visits
  set status = 'completed', completed_at = now(), completion_note = clean_note
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'false', true);
  return existing;
end;
$$;

create or replace function public.cancel_maintenance_visit(
  target_visit_id uuid, expected_version integer, cancellation_reason text
)
returns public.maintenance_visits
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_visits;
  relationship public.maintenance_relationships;
  clean_reason text := nullif(trim(coalesce(cancellation_reason, '')), '');
begin
  if clean_reason is null then
    raise exception 'A cancellation reason is required' using errcode = '22023';
  end if;

  select * into existing from public.maintenance_visits where id = target_visit_id for update;
  if not found then
    raise exception 'Maintenance visit not found' using errcode = 'P0002';
  end if;
  select * into relationship from public.maintenance_relationships where id = existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_project(relationship.project_id) then
    raise exception 'You are not authorised to manage this Maintenance visit' using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status <> 'scheduled' then
    raise exception 'Only a Scheduled visit can be cancelled' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'true', true);
  perform set_config('app.maintenance_visit_transition_reason', clean_reason, true);

  update public.maintenance_visits
  set status = 'cancelled', cancellation_reason = clean_reason
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'false', true);
  perform set_config('app.maintenance_visit_transition_reason', '', true);
  return existing;
end;
$$;

-- =====================================================================
-- 7. Grants — revoke everything first, then grant back exactly what V1
--    needs. DELETE is never granted on any Maintenance table.
-- =====================================================================
revoke all on public.maintenance_relationships from anon, authenticated;
revoke all on public.maintenance_relationship_events from anon, authenticated;
revoke all on public.maintenance_visits from anon, authenticated;
revoke all on public.maintenance_visit_events from anon, authenticated;
revoke all on public.maintenance_assignments from anon, authenticated;

grant select, insert, update on public.maintenance_relationships to authenticated;
grant select on public.maintenance_relationship_events to authenticated;
grant select, insert, update on public.maintenance_visits to authenticated;
grant select on public.maintenance_visit_events to authenticated;
grant select, insert, update on public.maintenance_assignments to authenticated;

revoke execute on function public.tg_audit_maintenance_relationships() from public, anon, authenticated;
revoke execute on function public.tg_maintenance_relationship_status_guard() from public, anon, authenticated;
revoke execute on function public.tg_record_maintenance_relationship_event() from public, anon, authenticated;
revoke execute on function public.tg_maintenance_relationship_events_immutable() from public, anon, authenticated;
revoke execute on function public.tg_audit_maintenance_visits() from public, anon, authenticated;
revoke execute on function public.tg_maintenance_visit_transition_guard() from public, anon, authenticated;
revoke execute on function public.tg_record_maintenance_visit_event() from public, anon, authenticated;
revoke execute on function public.tg_maintenance_visit_events_immutable() from public, anon, authenticated;
revoke execute on function public.tg_audit_maintenance_assignments() from public, anon, authenticated;
revoke execute on function public.tg_maintenance_assignment_terminal_guard() from public, anon, authenticated;

revoke execute on function public.can_manage_maintenance_project(uuid) from public, anon;
revoke execute on function public.maintenance_authorised_projects() from public, anon;
revoke execute on function public.maintenance_register() from public, anon;
revoke execute on function public.maintenance_project_summary(uuid) from public, anon;
revoke execute on function public.pause_maintenance_relationship(uuid, integer, text) from public, anon;
revoke execute on function public.resume_maintenance_relationship(uuid, integer) from public, anon;
revoke execute on function public.end_maintenance_relationship(uuid, integer, text) from public, anon;
revoke execute on function public.reschedule_maintenance_visit(uuid, integer, date) from public, anon;
revoke execute on function public.complete_maintenance_visit(uuid, integer, text) from public, anon;
revoke execute on function public.cancel_maintenance_visit(uuid, integer, text) from public, anon;
revoke execute on function public.end_maintenance_assignment(uuid, integer) from public, anon;

grant execute on function public.can_manage_maintenance_project(uuid) to authenticated;
grant execute on function public.maintenance_authorised_projects() to authenticated;
grant execute on function public.maintenance_register() to authenticated;
grant execute on function public.maintenance_project_summary(uuid) to authenticated;
grant execute on function public.pause_maintenance_relationship(uuid, integer, text) to authenticated;
grant execute on function public.resume_maintenance_relationship(uuid, integer) to authenticated;
grant execute on function public.end_maintenance_relationship(uuid, integer, text) to authenticated;
grant execute on function public.reschedule_maintenance_visit(uuid, integer, date) to authenticated;
grant execute on function public.complete_maintenance_visit(uuid, integer, text) to authenticated;
grant execute on function public.cancel_maintenance_visit(uuid, integer, text) to authenticated;
grant execute on function public.end_maintenance_assignment(uuid, integer) to authenticated;
