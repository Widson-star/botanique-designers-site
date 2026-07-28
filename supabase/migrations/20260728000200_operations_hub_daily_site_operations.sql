-- BD-OPERATIONS-HUB-01 — Daily Site Operations & Morning Compliance, first slice.
-- Additive and forward-only. This migration creates ONLY the Daily Site
-- Operations Phase 1 objects: the Daily Site Entry record, its immutable
-- lifecycle event log, and owner compliance waivers. It creates no
-- expenditure, labour, fund/reconciliation, receipt/document, notification,
-- payroll, Realtime or Simple Invoice Manager objects, and it changes no
-- existing table, policy or function (the Approvals foundation is untouched).
--
-- Authority: PRD §4.5; Blueprint §4.9. Morning compliance is soft (Dashboard
-- visibility only), scoped to Ongoing operationally-active projects, expects
-- entries before work and ordinarily by 08:30 East Africa Time (EAT) without a
-- blocking cut-off, and never mutates projects.status.

-- =====================================================================
-- Tables
-- =====================================================================

-- A. daily_site_entries — the current/versioned Daily Site Entry record.
--    One project, one work date, one live row (partial-unique below).
create table public.daily_site_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  work_date date not null,
  disposition text not null check (disposition in ('working', 'no_work')),
  no_work_reason text null check (no_work_reason is null or no_work_reason in (
    'rain',
    'weekend_no_activity',
    'temporarily_paused_for_day',
    'no_labour_required',
    'site_access_unavailable',
    'other'
  )),
  reason_detail text null check (reason_detail is null or char_length(reason_detail) <= 2000),
  expected_worker_count integer null,
  crew_reference text null check (crew_reference is null or char_length(crew_reference) <= 160),
  rate_per_worker numeric(12,2) null,
  agreed_labour_total numeric(12,2) null,
  planned_labour_cost numeric(12,2) null,
  work_planned text null check (work_planned is null or char_length(work_planned) <= 2000),
  funds_available numeric(12,2) null,
  additional_amount_requested numeric(12,2) null,
  notes text null check (notes is null or char_length(notes) <= 5000),
  evidence_status text not null default 'none' check (evidence_status in (
    'none', 'promised', 'provided', 'not_required'
  )),
  state text not null check (state in (
    'draft',
    'submitted',
    'returned_for_correction',
    'resubmitted',
    'accepted',
    'voided',
    'superseded'
  )),
  version integer not null default 1 check (version > 0),
  supersedes_entry_id uuid null references public.daily_site_entries(id) on delete restrict,
  returned_reason text null check (returned_reason is null or char_length(returned_reason) <= 2000),
  void_reason text null check (void_reason is null or char_length(void_reason) <= 2000),
  supersession_reason text null check (supersession_reason is null or char_length(supersession_reason) <= 2000),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  submitted_by uuid null references public.profiles(id) on delete restrict,
  reviewed_by uuid null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  reviewed_at timestamptz null,
  is_late boolean null,

  -- Disposition integrity: no-work carries a reason; working never does.
  constraint dse_disposition_reason check (
    (disposition = 'working' and no_work_reason is null)
    or (disposition = 'no_work' and no_work_reason is not null)
  ),
  -- 'other' requires an explanation.
  constraint dse_reason_detail_for_other check (
    no_work_reason is distinct from 'other'
    or (reason_detail is not null and char_length(trim(reason_detail)) > 0)
  ),
  -- Working entries have a sensible positive worker count and planned work.
  constraint dse_working_worker_count check (
    disposition <> 'working'
    or (expected_worker_count is not null and expected_worker_count >= 1)
  ),
  constraint dse_working_work_planned check (
    disposition <> 'working'
    or (work_planned is not null and char_length(trim(work_planned)) > 0)
  ),
  -- Labour-pricing exclusivity: exactly one of rate/agreed on a working entry.
  constraint dse_working_labour_inputs check (
    disposition <> 'working'
    or ((rate_per_worker is not null)::int + (agreed_labour_total is not null)::int = 1)
  ),
  -- Planned labour cost is verifiable from the authoritative inputs.
  constraint dse_working_planned_cost check (
    disposition <> 'working'
    or planned_labour_cost = coalesce(agreed_labour_total, rate_per_worker * expected_worker_count)
  ),
  -- No-work entries record no workforce and no labour money.
  constraint dse_nowork_no_workforce check (
    disposition <> 'no_work'
    or (coalesce(expected_worker_count, 0) = 0
        and rate_per_worker is null
        and agreed_labour_total is null
        and coalesce(planned_labour_cost, 0) = 0)
  ),
  -- No negative amounts or counts anywhere.
  constraint dse_non_negative check (
    coalesce(expected_worker_count, 0) >= 0
    and coalesce(rate_per_worker, 0) >= 0
    and coalesce(agreed_labour_total, 0) >= 0
    and coalesce(planned_labour_cost, 0) >= 0
    and coalesce(funds_available, 0) >= 0
    and coalesce(additional_amount_requested, 0) >= 0
  ),
  constraint dse_no_self_supersede check (supersedes_entry_id is distinct from id),
  -- Lifecycle field consistency.
  constraint dse_submit_states check (
    state not in ('submitted', 'resubmitted', 'accepted')
    or (submitted_at is not null and submitted_by is not null)
  ),
  constraint dse_accept_states check (
    state <> 'accepted' or (reviewed_at is not null and reviewed_by is not null)
  ),
  constraint dse_returned_reason check (
    state <> 'returned_for_correction'
    or (returned_reason is not null and char_length(trim(returned_reason)) > 0)
  ),
  constraint dse_void_reason check (
    state <> 'voided'
    or (void_reason is not null and char_length(trim(void_reason)) > 0)
  ),
  constraint dse_supersession_reason check (
    state <> 'superseded'
    or (supersession_reason is not null and char_length(trim(supersession_reason)) > 0)
  )
);

-- B. daily_site_entry_events — append-only, system-written lifecycle history.
create table public.daily_site_entry_events (
  id uuid primary key default gen_random_uuid(),
  daily_site_entry_id uuid not null references public.daily_site_entries(id) on delete restrict,
  event_type text not null check (event_type in (
    'created',
    'draft_updated',
    'submitted',
    'returned_for_correction',
    'resubmitted',
    'accepted',
    'voided',
    'superseded',
    'supersession_created'
  )),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_state text null check (from_state is null or from_state in (
    'draft', 'submitted', 'returned_for_correction', 'resubmitted', 'accepted', 'voided', 'superseded'
  )),
  to_state text not null check (to_state in (
    'draft', 'submitted', 'returned_for_correction', 'resubmitted', 'accepted', 'voided', 'superseded'
  )),
  version_number integer not null check (version_number > 0),
  event_notes text null check (event_notes is null or char_length(event_notes) <= 5000),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb null check (new_snapshot is null or jsonb_typeof(new_snapshot) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- C. daily_site_compliance_waivers — owner-issued project/date waiver. It
--    carries NO labour or financial facts; it only satisfies compliance.
create table public.daily_site_compliance_waivers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  work_date date not null,
  reason text not null check (char_length(trim(reason)) between 1 and 2000),
  state text not null default 'active' check (state in ('active', 'revoked')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  revoked_by uuid null references public.profiles(id) on delete restrict,
  revoked_at timestamptz null,
  revoke_reason text null check (revoke_reason is null or char_length(revoke_reason) <= 2000),
  constraint dscw_revoke_consistency check (
    (state = 'revoked' and revoked_by is not null and revoked_at is not null)
    or (state = 'active' and revoked_by is null and revoked_at is null)
  )
);

-- One live (non-terminal) entry per project/date. Voided and superseded rows
-- are historical and excluded, so a corrected supersession can coexist with its
-- superseded predecessor.
create unique index daily_site_entries_one_live_per_project_date
  on public.daily_site_entries (project_id, work_date)
  where state in ('draft', 'submitted', 'returned_for_correction', 'resubmitted', 'accepted');

-- At most one active waiver per project/date.
create unique index daily_site_compliance_waivers_one_active_per_project_date
  on public.daily_site_compliance_waivers (project_id, work_date)
  where state = 'active';

create index daily_site_entries_project_date_idx
  on public.daily_site_entries (project_id, work_date desc);
create index daily_site_entries_state_date_idx
  on public.daily_site_entries (state, work_date desc);
create index daily_site_entry_events_entry_occurred_idx
  on public.daily_site_entry_events (daily_site_entry_id, occurred_at asc, id asc);
create index daily_site_compliance_waivers_project_date_idx
  on public.daily_site_compliance_waivers (project_id, work_date desc);

-- =====================================================================
-- Project-authority helper (reuses the existing per-project model)
-- =====================================================================
-- Answers: "may the current authenticated actor operate on this project for
-- Daily Site Operations?" — owner is company-wide; a manager is scoped to the
-- EXISTING project-authority model (an active project_assignments row, via
-- public.is_assigned_to_project, or being the project's lead_person_id). This is
-- deliberately NOT a bare is_manager() bypass: a future manager can see and act
-- only on the projects they are actually assigned to or lead. Present, sole
-- active managers gain Daily Site authority the same way — by assignment or
-- lead ownership — which the owner controls; role alone grants nothing. Staff,
-- viewer, inactive and anonymous callers are denied (current_user_role() is null
-- for an inactive/absent profile). SECURITY DEFINER with a fixed search_path so
-- it is safe to call from both RLS policies and the SECURITY DEFINER functions,
-- and it never widens or weakens any existing Projects or Approvals rule.
create or replace function public.can_manage_daily_site_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
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

-- The projects the caller may record a Daily Site Entry for (owner: all;
-- manager: only project-authority-scoped). Backs the entry-form project
-- selector so the frontend never offers an unauthorised project.
create or replace function public.daily_site_authorised_projects()
returns table (
  id uuid,
  project_name text,
  status text,
  stage text,
  archived boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.project_name, p.status, p.stage, p.archived
  from public.projects p
  where public.can_manage_daily_site_project(p.id)
  order by p.project_name asc
$$;

-- =====================================================================
-- Row level security
-- =====================================================================
-- Owner reads all three tables company-wide; a manager reads only rows for
-- projects within the manager's existing project authority (see
-- can_manage_daily_site_project). All mutation flows exclusively through the
-- narrow SECURITY DEFINER functions below; there is no direct
-- INSERT/UPDATE/DELETE policy, and those privileges are revoked from
-- authenticated. Staff, viewer, inactive and anonymous callers have no access.

alter table public.daily_site_entries enable row level security;
alter table public.daily_site_entry_events enable row level security;
alter table public.daily_site_compliance_waivers enable row level security;

create policy "daily_site_entries_select_authorised"
on public.daily_site_entries
for select
to authenticated
using (public.can_manage_daily_site_project(project_id));

create policy "daily_site_entry_events_select_authorised"
on public.daily_site_entry_events
for select
to authenticated
using (
  exists (
    select 1
    from public.daily_site_entries entry
    where entry.id = daily_site_entry_id
      and public.can_manage_daily_site_project(entry.project_id)
  )
);

create policy "daily_site_compliance_waivers_select_authorised"
on public.daily_site_compliance_waivers
for select
to authenticated
using (public.can_manage_daily_site_project(project_id));

-- =====================================================================
-- Private helpers
-- =====================================================================

create or replace function public.private_active_daily_site_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid() and is_active is true
  limit 1
$$;

-- Whether a submission timestamp is late — after 08:30 EAT on its work date.
-- Late is derived here (never trusted from the client) and non-blocking.
create or replace function public.private_daily_site_is_late(target_work_date date, submitted timestamptz)
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select submitted > (
    (target_work_date::timestamp + time '08:30') at time zone 'Africa/Nairobi'
  )
$$;

-- Recompute the trusted planned labour cost from authoritative inputs.
create or replace function public.private_daily_site_planned_cost(
  target_disposition text,
  target_worker_count integer,
  target_rate numeric,
  target_agreed numeric
)
returns numeric
language sql
immutable
security definer
set search_path = public
as $$
  select case
    when target_disposition = 'no_work' then 0
    when target_agreed is not null then target_agreed
    else coalesce(target_rate, 0) * coalesce(target_worker_count, 0)
  end
$$;

-- Normalise + validate the caller-supplied morning-plan inputs and return the
-- coherent field set (with a derived planned labour cost) as a row. Used by the
-- draft-create, draft-update, and supersede functions so the rules live once.
create or replace function public.private_daily_site_normalise_plan(
  target_disposition text,
  target_no_work_reason text,
  target_reason_detail text,
  target_worker_count integer,
  target_crew_reference text,
  target_rate numeric,
  target_agreed numeric,
  target_work_planned text,
  target_funds_available numeric,
  target_additional_requested numeric,
  target_notes text,
  target_evidence_status text,
  out out_no_work_reason text,
  out out_reason_detail text,
  out out_worker_count integer,
  out out_crew_reference text,
  out out_rate numeric,
  out out_agreed numeric,
  out out_planned_cost numeric,
  out out_work_planned text,
  out out_funds_available numeric,
  out out_additional_requested numeric,
  out out_notes text,
  out out_evidence_status text
)
language plpgsql
immutable
security definer
set search_path = public
as $$
begin
  if target_disposition not in ('working', 'no_work') then
    raise exception 'disposition must be working or no_work' using errcode = 'check_violation';
  end if;
  if coalesce(target_evidence_status, 'none') not in ('none', 'promised', 'provided', 'not_required') then
    raise exception 'invalid evidence status' using errcode = 'check_violation';
  end if;
  out_evidence_status := coalesce(target_evidence_status, 'none');
  out_crew_reference := nullif(trim(target_crew_reference), '');
  out_notes := nullif(trim(target_notes), '');
  out_funds_available := coalesce(target_funds_available, 0);
  out_additional_requested := coalesce(target_additional_requested, 0);

  if out_funds_available < 0 or out_additional_requested < 0 then
    raise exception 'amounts cannot be negative' using errcode = 'check_violation';
  end if;

  if target_disposition = 'working' then
    out_no_work_reason := null;
    out_reason_detail := nullif(trim(target_reason_detail), '');
    out_worker_count := target_worker_count;
    out_work_planned := nullif(trim(target_work_planned), '');
    if out_worker_count is null or out_worker_count < 1 then
      raise exception 'a working entry needs at least one expected worker' using errcode = 'check_violation';
    end if;
    if out_work_planned is null then
      raise exception 'a working entry needs the planned work' using errcode = 'check_violation';
    end if;
    if (target_rate is not null)::int + (target_agreed is not null)::int <> 1 then
      raise exception 'provide either a rate per worker or an agreed labour total, not both' using errcode = 'check_violation';
    end if;
    if coalesce(target_rate, 0) < 0 or coalesce(target_agreed, 0) < 0 then
      raise exception 'labour amounts cannot be negative' using errcode = 'check_violation';
    end if;
    out_rate := target_rate;
    out_agreed := target_agreed;
    out_planned_cost := public.private_daily_site_planned_cost('working', out_worker_count, out_rate, out_agreed);
  else
    out_no_work_reason := target_no_work_reason;
    if out_no_work_reason is null or out_no_work_reason not in (
      'rain', 'weekend_no_activity', 'temporarily_paused_for_day',
      'no_labour_required', 'site_access_unavailable', 'other'
    ) then
      raise exception 'a no-work entry needs a valid reason' using errcode = 'check_violation';
    end if;
    out_reason_detail := nullif(trim(target_reason_detail), '');
    if out_no_work_reason = 'other' and out_reason_detail is null then
      raise exception 'reason "other" needs an explanation' using errcode = 'check_violation';
    end if;
    out_worker_count := 0;
    out_crew_reference := null;
    out_rate := null;
    out_agreed := null;
    out_planned_cost := 0;
    out_work_planned := nullif(trim(target_work_planned), '');
  end if;
end;
$$;

-- Compact snapshot of the business fields for event history.
create or replace function public.private_daily_site_snapshot(entry public.daily_site_entries)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'work_date', to_jsonb(entry.work_date),
    'disposition', entry.disposition,
    'no_work_reason', entry.no_work_reason,
    'reason_detail', entry.reason_detail,
    'expected_worker_count', entry.expected_worker_count,
    'crew_reference', entry.crew_reference,
    'rate_per_worker', entry.rate_per_worker,
    'agreed_labour_total', entry.agreed_labour_total,
    'planned_labour_cost', entry.planned_labour_cost,
    'work_planned', entry.work_planned,
    'funds_available', entry.funds_available,
    'additional_amount_requested', entry.additional_amount_requested,
    'notes', entry.notes,
    'evidence_status', entry.evidence_status,
    'state', entry.state,
    'version', entry.version
  )
$$;

-- =====================================================================
-- Lifecycle functions
-- =====================================================================

-- Create a new draft Daily Site Entry for one project/work date.
create or replace function public.create_daily_site_entry_draft(
  target_project_id uuid,
  target_work_date date,
  target_disposition text,
  target_no_work_reason text default null,
  target_reason_detail text default null,
  target_worker_count integer default null,
  target_crew_reference text default null,
  target_rate numeric default null,
  target_agreed numeric default null,
  target_work_planned text default null,
  target_funds_available numeric default null,
  target_additional_requested numeric default null,
  target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.private_active_daily_site_role();
  project public.projects;
  plan record;
  entry public.daily_site_entries;
begin
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'only an active owner or manager may record a site entry' using errcode = 'insufficient_privilege';
  end if;
  if target_work_date is null then
    raise exception 'a work date is required' using errcode = 'check_violation';
  end if;

  select * into project from public.projects where id = target_project_id for share;
  if not found then
    raise exception 'project not found or unavailable' using errcode = 'no_data_found';
  end if;
  -- Revalidate project authority in-transaction: a manager may record only for
  -- a project within their existing project authority (owner is company-wide).
  if not public.can_manage_daily_site_project(project.id) then
    raise exception 'not authorised for this project' using errcode = 'insufficient_privilege';
  end if;

  plan := public.private_daily_site_normalise_plan(
    target_disposition, target_no_work_reason, target_reason_detail,
    target_worker_count, target_crew_reference, target_rate, target_agreed,
    target_work_planned, target_funds_available, target_additional_requested,
    target_notes, target_evidence_status
  );

  insert into public.daily_site_entries (
    project_id, work_date, disposition, no_work_reason, reason_detail,
    expected_worker_count, crew_reference, rate_per_worker, agreed_labour_total,
    planned_labour_cost, work_planned, funds_available, additional_amount_requested,
    notes, evidence_status, state, version, created_by, updated_by
  ) values (
    project.id, target_work_date, target_disposition, plan.out_no_work_reason, plan.out_reason_detail,
    plan.out_worker_count, plan.out_crew_reference, plan.out_rate, plan.out_agreed,
    plan.out_planned_cost, plan.out_work_planned, plan.out_funds_available, plan.out_additional_requested,
    plan.out_notes, plan.out_evidence_status, 'draft', 1, auth.uid(), auth.uid()
  ) returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state, version_number, new_snapshot
  ) values (
    entry.id, 'created', auth.uid(), null, 'draft', entry.version,
    public.private_daily_site_snapshot(entry)
  );

  return entry;
end;
$$;

-- Edit an own draft in place (draft state only).
create or replace function public.update_daily_site_entry_draft(
  target_entry_id uuid,
  target_disposition text,
  target_no_work_reason text default null,
  target_reason_detail text default null,
  target_worker_count integer default null,
  target_crew_reference text default null,
  target_rate numeric default null,
  target_agreed numeric default null,
  target_work_planned text default null,
  target_funds_available numeric default null,
  target_additional_requested numeric default null,
  target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.private_active_daily_site_role();
  plan record;
  entry public.daily_site_entries;
begin
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'active site-operations access is required' using errcode = 'insufficient_privilege';
  end if;

  select * into entry from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  -- Authority is revalidated against the CURRENT assignment/lead state, not just
  -- authorship: a manager who authored this draft still loses access if project
  -- authority was later removed.
  if not public.can_manage_daily_site_project(entry.project_id) then
    raise exception 'not authorised for this project' using errcode = 'insufficient_privilege';
  end if;
  if caller_role = 'manager' and entry.created_by <> auth.uid() then
    raise exception 'only the author may edit this draft' using errcode = 'insufficient_privilege';
  end if;
  if entry.state <> 'draft' then
    raise exception 'only a draft entry can be edited in place' using errcode = 'check_violation';
  end if;

  plan := public.private_daily_site_normalise_plan(
    target_disposition, target_no_work_reason, target_reason_detail,
    target_worker_count, target_crew_reference, target_rate, target_agreed,
    target_work_planned, target_funds_available, target_additional_requested,
    target_notes, target_evidence_status
  );

  update public.daily_site_entries set
    disposition = target_disposition,
    no_work_reason = plan.out_no_work_reason,
    reason_detail = plan.out_reason_detail,
    expected_worker_count = plan.out_worker_count,
    crew_reference = plan.out_crew_reference,
    rate_per_worker = plan.out_rate,
    agreed_labour_total = plan.out_agreed,
    planned_labour_cost = plan.out_planned_cost,
    work_planned = plan.out_work_planned,
    funds_available = plan.out_funds_available,
    additional_amount_requested = plan.out_additional_requested,
    notes = plan.out_notes,
    evidence_status = plan.out_evidence_status,
    updated_by = auth.uid(),
    updated_at = now()
  where id = entry.id returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state, version_number, new_snapshot
  ) values (
    entry.id, 'draft_updated', auth.uid(), 'draft', 'draft', entry.version,
    public.private_daily_site_snapshot(entry)
  );

  return entry;
end;
$$;

-- Submit a draft for owner review.
create or replace function public.submit_daily_site_entry(
  target_entry_id uuid
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.private_active_daily_site_role();
  entry public.daily_site_entries;
  late boolean;
begin
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'active site-operations access is required' using errcode = 'insufficient_privilege';
  end if;

  select * into entry from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  if not public.can_manage_daily_site_project(entry.project_id) then
    raise exception 'not authorised for this project' using errcode = 'insufficient_privilege';
  end if;
  if caller_role = 'manager' and entry.created_by <> auth.uid() then
    raise exception 'only the author may submit this entry' using errcode = 'insufficient_privilege';
  end if;
  if entry.state <> 'draft' then
    raise exception 'only a draft entry can be submitted' using errcode = 'check_violation';
  end if;

  late := public.private_daily_site_is_late(entry.work_date, now());

  update public.daily_site_entries set
    state = 'submitted', submitted_by = auth.uid(), submitted_at = now(),
    is_late = late, updated_by = auth.uid(), updated_at = now()
  where id = entry.id returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state, version_number, event_notes
  ) values (
    entry.id, 'submitted', auth.uid(), 'draft', 'submitted', entry.version,
    case when late then 'Submitted after 08:30 EAT (late).' else null end
  );

  return entry;
end;
$$;

-- Owner returns a submitted/resubmitted entry for correction, with a reason.
create or replace function public.return_daily_site_entry_for_correction(
  target_entry_id uuid,
  target_reason text
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.daily_site_entries;
  prior_state text;
begin
  if public.private_active_daily_site_role() is distinct from 'owner' then
    raise exception 'only an active owner may return an entry for correction' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required to return an entry' using errcode = 'check_violation';
  end if;

  select * into entry from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  if entry.state not in ('submitted', 'resubmitted') then
    raise exception 'only a submitted entry can be returned' using errcode = 'check_violation';
  end if;
  prior_state := entry.state;

  update public.daily_site_entries set
    state = 'returned_for_correction', returned_reason = trim(target_reason),
    reviewed_by = auth.uid(), reviewed_at = now(),
    updated_by = auth.uid(), updated_at = now()
  where id = entry.id returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state, version_number, event_notes
  ) values (
    entry.id, 'returned_for_correction', auth.uid(), prior_state,
    'returned_for_correction', entry.version, trim(target_reason)
  );

  return entry;
end;
$$;

-- Author corrects a returned entry and resubmits it (fields re-validated).
create or replace function public.correct_and_resubmit_daily_site_entry(
  target_entry_id uuid,
  target_disposition text,
  target_no_work_reason text default null,
  target_reason_detail text default null,
  target_worker_count integer default null,
  target_crew_reference text default null,
  target_rate numeric default null,
  target_agreed numeric default null,
  target_work_planned text default null,
  target_funds_available numeric default null,
  target_additional_requested numeric default null,
  target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.private_active_daily_site_role();
  plan record;
  entry public.daily_site_entries;
  previous jsonb;
  late boolean;
begin
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'active site-operations access is required' using errcode = 'insufficient_privilege';
  end if;

  select * into entry from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  if not public.can_manage_daily_site_project(entry.project_id) then
    raise exception 'not authorised for this project' using errcode = 'insufficient_privilege';
  end if;
  if caller_role = 'manager' and entry.created_by <> auth.uid() then
    raise exception 'only the author may correct this entry' using errcode = 'insufficient_privilege';
  end if;
  if entry.state <> 'returned_for_correction' then
    raise exception 'only a returned entry can be corrected and resubmitted' using errcode = 'check_violation';
  end if;

  plan := public.private_daily_site_normalise_plan(
    target_disposition, target_no_work_reason, target_reason_detail,
    target_worker_count, target_crew_reference, target_rate, target_agreed,
    target_work_planned, target_funds_available, target_additional_requested,
    target_notes, target_evidence_status
  );
  previous := public.private_daily_site_snapshot(entry);
  late := public.private_daily_site_is_late(entry.work_date, now());

  update public.daily_site_entries set
    disposition = target_disposition,
    no_work_reason = plan.out_no_work_reason,
    reason_detail = plan.out_reason_detail,
    expected_worker_count = plan.out_worker_count,
    crew_reference = plan.out_crew_reference,
    rate_per_worker = plan.out_rate,
    agreed_labour_total = plan.out_agreed,
    planned_labour_cost = plan.out_planned_cost,
    work_planned = plan.out_work_planned,
    funds_available = plan.out_funds_available,
    additional_amount_requested = plan.out_additional_requested,
    notes = plan.out_notes,
    evidence_status = plan.out_evidence_status,
    state = 'resubmitted', version = version + 1,
    returned_reason = null,
    submitted_by = auth.uid(), submitted_at = now(), is_late = late,
    updated_by = auth.uid(), updated_at = now()
  where id = entry.id returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state,
    version_number, event_notes, previous_snapshot, new_snapshot
  ) values (
    entry.id, 'resubmitted', auth.uid(), 'returned_for_correction', 'resubmitted',
    entry.version, case when late then 'Resubmitted after 08:30 EAT (late).' else null end,
    previous, public.private_daily_site_snapshot(entry)
  );

  return entry;
end;
$$;

-- Owner accepts a submitted/resubmitted entry.
create or replace function public.accept_daily_site_entry(
  target_entry_id uuid,
  target_notes text default null
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.daily_site_entries;
  prior_state text;
begin
  if public.private_active_daily_site_role() is distinct from 'owner' then
    raise exception 'only an active owner may accept an entry' using errcode = 'insufficient_privilege';
  end if;

  select * into entry from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  if entry.state not in ('submitted', 'resubmitted') then
    raise exception 'only a submitted entry can be accepted' using errcode = 'check_violation';
  end if;
  prior_state := entry.state;

  update public.daily_site_entries set
    state = 'accepted', reviewed_by = auth.uid(), reviewed_at = now(),
    updated_by = auth.uid(), updated_at = now()
  where id = entry.id returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state, version_number, event_notes
  ) values (
    entry.id, 'accepted', auth.uid(), prior_state, 'accepted', entry.version,
    nullif(trim(target_notes), '')
  );

  return entry;
end;
$$;

-- Owner voids a non-terminal entry with a reason. Accepted records are never
-- voided in place — they are corrected by supersession.
create or replace function public.void_daily_site_entry(
  target_entry_id uuid,
  target_reason text
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  entry public.daily_site_entries;
  prior_state text;
begin
  if public.private_active_daily_site_role() is distinct from 'owner' then
    raise exception 'only an active owner may void an entry' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required to void an entry' using errcode = 'check_violation';
  end if;

  select * into entry from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  if entry.state not in ('draft', 'submitted', 'returned_for_correction', 'resubmitted') then
    raise exception 'this entry can no longer be voided' using errcode = 'check_violation';
  end if;
  prior_state := entry.state;

  update public.daily_site_entries set
    state = 'voided', void_reason = trim(target_reason),
    updated_by = auth.uid(), updated_at = now()
  where id = entry.id returning * into entry;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state, version_number, event_notes
  ) values (
    entry.id, 'voided', auth.uid(), prior_state, 'voided', entry.version, trim(target_reason)
  );

  return entry;
end;
$$;

-- Owner supersedes an accepted entry: the prior accepted row is preserved as
-- 'superseded' and a new accepted entry (version + 1) carries the correction.
create or replace function public.supersede_daily_site_entry(
  target_entry_id uuid,
  target_reason text,
  target_disposition text,
  target_no_work_reason text default null,
  target_reason_detail text default null,
  target_worker_count integer default null,
  target_crew_reference text default null,
  target_rate numeric default null,
  target_agreed numeric default null,
  target_work_planned text default null,
  target_funds_available numeric default null,
  target_additional_requested numeric default null,
  target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql
security definer
set search_path = public
as $$
declare
  plan record;
  original public.daily_site_entries;
  replacement public.daily_site_entries;
begin
  if public.private_active_daily_site_role() is distinct from 'owner' then
    raise exception 'only an active owner may supersede an accepted entry' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required to supersede an entry' using errcode = 'check_violation';
  end if;

  select * into original from public.daily_site_entries where id = target_entry_id for update;
  if not found then raise exception 'site entry not found' using errcode = 'no_data_found'; end if;
  if original.state <> 'accepted' then
    raise exception 'only an accepted entry can be superseded' using errcode = 'check_violation';
  end if;

  plan := public.private_daily_site_normalise_plan(
    target_disposition, target_no_work_reason, target_reason_detail,
    target_worker_count, target_crew_reference, target_rate, target_agreed,
    target_work_planned, target_funds_available, target_additional_requested,
    target_notes, target_evidence_status
  );

  -- Mark the original superseded first so the partial-unique live index frees up.
  update public.daily_site_entries set
    state = 'superseded', supersession_reason = trim(target_reason),
    updated_by = auth.uid(), updated_at = now()
  where id = original.id returning * into original;

  insert into public.daily_site_entries (
    project_id, work_date, disposition, no_work_reason, reason_detail,
    expected_worker_count, crew_reference, rate_per_worker, agreed_labour_total,
    planned_labour_cost, work_planned, funds_available, additional_amount_requested,
    notes, evidence_status, state, version, supersedes_entry_id,
    submitted_by, submitted_at, is_late, reviewed_by, reviewed_at,
    created_by, updated_by
  ) values (
    original.project_id, original.work_date, target_disposition, plan.out_no_work_reason, plan.out_reason_detail,
    plan.out_worker_count, plan.out_crew_reference, plan.out_rate, plan.out_agreed,
    plan.out_planned_cost, plan.out_work_planned, plan.out_funds_available, plan.out_additional_requested,
    plan.out_notes, plan.out_evidence_status, 'accepted', original.version + 1, original.id,
    auth.uid(), now(), original.is_late, auth.uid(), now(),
    auth.uid(), auth.uid()
  ) returning * into replacement;

  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state,
    version_number, event_notes, previous_snapshot
  ) values (
    original.id, 'superseded', auth.uid(), 'accepted', 'superseded',
    original.version, trim(target_reason), public.private_daily_site_snapshot(original)
  );
  insert into public.daily_site_entry_events (
    daily_site_entry_id, event_type, actor_id, from_state, to_state,
    version_number, event_notes, new_snapshot
  ) values (
    replacement.id, 'supersession_created', auth.uid(), null, 'accepted',
    replacement.version, trim(target_reason), public.private_daily_site_snapshot(replacement)
  );

  return replacement;
end;
$$;

-- Owner waives compliance for one project/work date with a reason.
create or replace function public.create_daily_site_compliance_waiver(
  target_project_id uuid,
  target_work_date date,
  target_reason text
)
returns public.daily_site_compliance_waivers
language plpgsql
security definer
set search_path = public
as $$
declare
  project public.projects;
  waiver public.daily_site_compliance_waivers;
begin
  if public.private_active_daily_site_role() is distinct from 'owner' then
    raise exception 'only an active owner may waive compliance' using errcode = 'insufficient_privilege';
  end if;
  if target_work_date is null then
    raise exception 'a work date is required' using errcode = 'check_violation';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required to waive compliance' using errcode = 'check_violation';
  end if;

  select * into project from public.projects where id = target_project_id for share;
  if not found then
    raise exception 'project not found or unavailable' using errcode = 'no_data_found';
  end if;

  insert into public.daily_site_compliance_waivers (
    project_id, work_date, reason, state, created_by
  ) values (
    project.id, target_work_date, trim(target_reason), 'active', auth.uid()
  ) returning * into waiver;

  return waiver;
end;
$$;

-- Owner revokes an active waiver (audited; the row is preserved).
create or replace function public.revoke_daily_site_compliance_waiver(
  target_waiver_id uuid,
  target_reason text default null
)
returns public.daily_site_compliance_waivers
language plpgsql
security definer
set search_path = public
as $$
declare
  waiver public.daily_site_compliance_waivers;
begin
  if public.private_active_daily_site_role() is distinct from 'owner' then
    raise exception 'only an active owner may revoke a waiver' using errcode = 'insufficient_privilege';
  end if;

  select * into waiver from public.daily_site_compliance_waivers where id = target_waiver_id for update;
  if not found then raise exception 'waiver not found' using errcode = 'no_data_found'; end if;
  if waiver.state <> 'active' then
    raise exception 'only an active waiver can be revoked' using errcode = 'check_violation';
  end if;

  update public.daily_site_compliance_waivers set
    state = 'revoked', revoked_by = auth.uid(), revoked_at = now(),
    revoke_reason = nullif(trim(target_reason), '')
  where id = waiver.id returning * into waiver;

  return waiver;
end;
$$;

-- =====================================================================
-- Morning-compliance calculation (read-only; never mutates projects)
-- =====================================================================
-- SECURITY INVOKER for the entry/waiver reads (repaired RLS scopes them), and
-- the project scan is explicitly filtered by can_manage_daily_site_project so
-- the caller only ever sees projects within their authority: owner company-wide,
-- a manager only their project-authority set. Missing/late/waived rows and any
-- aggregate the caller derives therefore never leak an unauthorised project's
-- name, id, counts or waiver state. For the given EAT work date it reports, per
-- authorised in-scope project, whether an entry or active waiver exists and the
-- submission timing. Weekends produce no automatic due items. Voluntary entries
-- on excluded projects/dates are surfaced but never create an obligation.
create or replace function public.daily_site_morning_compliance(
  target_date date default null
)
returns table (
  project_id uuid,
  project_name text,
  work_date date,
  is_weekend boolean,
  due boolean,
  entry_id uuid,
  entry_state text,
  disposition text,
  is_late boolean,
  waiver_id uuid,
  compliance_status text
)
language sql
stable
set search_path = public
as $$
  with resolved as (
    select coalesce(target_date, (timezone('Africa/Nairobi', now()))::date) as work_date
  ),
  scope as (
    select p.id as project_id, p.project_name,
           r.work_date,
           extract(dow from r.work_date) in (0, 6) as is_weekend,
           -- In automatic morning-compliance scope: Ongoing, not archived, and
           -- not at the Awaiting Approval stage. Pending, Completed, Design-only,
           -- Cancelled, Paused and Archived projects are excluded.
           (p.status = 'Ongoing' and p.archived is false and p.stage <> 'Awaiting Approval') as in_scope
    from public.projects p
    cross join resolved r
    -- Authority filter: only projects the caller may operate on (owner: all;
    -- manager: project-authority-scoped). Prevents unauthorised-project leakage.
    where public.can_manage_daily_site_project(p.id)
  ),
  live_entry as (
    select distinct on (e.project_id) e.id, e.project_id, e.work_date, e.state,
           e.disposition, e.is_late
    from public.daily_site_entries e
    join resolved r on e.work_date = r.work_date
    where e.state in ('draft', 'submitted', 'returned_for_correction', 'resubmitted', 'accepted')
    order by e.project_id, e.version desc
  ),
  active_waiver as (
    select w.id, w.project_id
    from public.daily_site_compliance_waivers w
    join resolved r on w.work_date = r.work_date
    where w.state = 'active'
  )
  select
    s.project_id,
    s.project_name,
    s.work_date,
    s.is_weekend,
    (s.in_scope and not s.is_weekend) as due,
    le.id as entry_id,
    le.state as entry_state,
    le.disposition,
    le.is_late,
    aw.id as waiver_id,
    case
      when le.id is not null then
        case when le.is_late is true then 'entry_late' else 'entry_present' end
      when aw.id is not null then 'waived'
      when s.in_scope and not s.is_weekend then 'missing'
      else 'not_due'
    end as compliance_status
  from scope s
  left join live_entry le on le.project_id = s.project_id
  left join active_waiver aw on aw.project_id = s.project_id
  where s.in_scope or le.id is not null or aw.id is not null
$$;

-- =====================================================================
-- Grants and revocations
-- =====================================================================
revoke all on public.daily_site_entries from anon;
revoke all on public.daily_site_entry_events from anon;
revoke all on public.daily_site_compliance_waivers from anon;
revoke insert, update, delete on public.daily_site_entries from authenticated;
revoke insert, update, delete on public.daily_site_entry_events from authenticated;
revoke insert, update, delete on public.daily_site_compliance_waivers from authenticated;

revoke execute on function public.private_active_daily_site_role() from public, anon, authenticated;
revoke execute on function public.private_daily_site_is_late(date, timestamptz) from public, anon, authenticated;
revoke execute on function public.private_daily_site_planned_cost(text, integer, numeric, numeric) from public, anon, authenticated;
revoke execute on function public.private_daily_site_normalise_plan(text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) from public, anon, authenticated;
revoke execute on function public.private_daily_site_snapshot(public.daily_site_entries) from public, anon, authenticated;

revoke execute on function public.create_daily_site_entry_draft(uuid, date, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.update_daily_site_entry_draft(uuid, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.submit_daily_site_entry(uuid) from public, anon;
revoke execute on function public.return_daily_site_entry_for_correction(uuid, text) from public, anon;
revoke execute on function public.correct_and_resubmit_daily_site_entry(uuid, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.accept_daily_site_entry(uuid, text) from public, anon;
revoke execute on function public.void_daily_site_entry(uuid, text) from public, anon;
revoke execute on function public.supersede_daily_site_entry(uuid, text, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) from public, anon;
revoke execute on function public.create_daily_site_compliance_waiver(uuid, date, text) from public, anon;
revoke execute on function public.revoke_daily_site_compliance_waiver(uuid, text) from public, anon;
revoke execute on function public.daily_site_morning_compliance(date) from anon;
-- Authority helpers: usable by authenticated (RLS + selector), never by anon.
revoke execute on function public.can_manage_daily_site_project(uuid) from public, anon;
revoke execute on function public.daily_site_authorised_projects() from public, anon;

grant execute on function public.create_daily_site_entry_draft(uuid, date, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.update_daily_site_entry_draft(uuid, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.submit_daily_site_entry(uuid) to authenticated;
grant execute on function public.return_daily_site_entry_for_correction(uuid, text) to authenticated;
grant execute on function public.correct_and_resubmit_daily_site_entry(uuid, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.accept_daily_site_entry(uuid, text) to authenticated;
grant execute on function public.void_daily_site_entry(uuid, text) to authenticated;
grant execute on function public.supersede_daily_site_entry(uuid, text, text, text, text, integer, text, numeric, numeric, text, numeric, numeric, text, text) to authenticated;
grant execute on function public.create_daily_site_compliance_waiver(uuid, date, text) to authenticated;
grant execute on function public.revoke_daily_site_compliance_waiver(uuid, text) to authenticated;
grant execute on function public.daily_site_morning_compliance(date) to authenticated;
grant execute on function public.can_manage_daily_site_project(uuid) to authenticated;
grant execute on function public.daily_site_authorised_projects() to authenticated;
