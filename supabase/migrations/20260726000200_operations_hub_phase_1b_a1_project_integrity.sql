-- BD-OPERATIONS-HUB-01 — Phase 1B-A1: Project integrity and change history.
-- Forward-only, additive, non-destructive migration. Review before applying to
-- the Botanique-only Supabase project. This migration MUST NOT be run before the
-- two migrations it depends on:
--   20260614000100_admin_foundation.sql
--   20260726000100_operations_hub_phase_1a_lead_data_rls.sql
-- It does NOT drop, rename or rewrite any existing table or column, does NOT
-- weaken any SELECT policy or the owner-only project_financial_references
-- boundary, and does NOT touch Leads/campaigns/lead_activities or any finance
-- data. It is the schema/RLS/history prerequisite for the (not-yet-built)
-- Phase 1B-A2 project create/edit/archive admin UI.
--
-- Scope of this migration (BD-OPERATIONS-HUB-01 Phase 1B-A1):
--   1. Tighten the admin-foundation audit triggers so a client-supplied
--      created_by can never survive an authenticated INSERT.
--   2. Add the missing project schedule/blocker fields (all nullable).
--   3. Add a validated responsible-person assignment helper and require it in
--      the project INSERT/UPDATE WITH CHECK.
--   4. Harden EXECUTE privileges on the foundation RLS helper functions.
--   5. Add an immutable, system-generated project-change ledger
--      (public.project_activities) plus the trigger that appends to it.
--   6. Add indexes for upcoming project CRUD and dashboard queries.
--
-- Field-semantics note recorded here for future forms:
--   * projects.start_date            = planned / expected start date.
--   * projects.actual_start_date     = real start (added below).
--   * projects.target_completion_date/actual_completion_date = added below.
--   * projects.updated_at            = authoritative last modification (system).
--   * projects.last_updated          = retained for backward compatibility but
--                                      DEPRECATED from future forms (do not
--                                      surface it as an editable field). It is
--                                      still tracked as an operational field in
--                                      the change ledger so any legacy edit is
--                                      recorded.

-- pgcrypto (gen_random_uuid) already exists from the foundation migration; this
-- is a defensive no-op if run independently.
create extension if not exists pgcrypto;

-- =====================================================================
-- 1. Admin-foundation audit-identity correction (BD-OPS-08B follow-up).
-- ---------------------------------------------------------------------
-- The original foundation audit functions used
--   new.created_by = coalesce(new.created_by, auth.uid())
-- on INSERT, which would let a client seed a created_by value that survives.
-- These CREATE OR REPLACE definitions force
--   new.created_by = auth.uid()
-- so a client-supplied created_by can NEVER survive an authenticated insert.
-- Everything else is preserved verbatim:
--   * system-derived created_at/updated_at;
--   * immutable creation provenance after insert;
--   * updated_by = auth.uid();
--   * projects archive stamping behaviour;
--   * the existing trigger attachments (unchanged — CREATE OR REPLACE keeps
--     the triggers bound to these function names).
-- The Phase 1A functions (tg_audit_campaigns/leads/lead_activities) already
-- overwrite created_by from auth.uid() and are intentionally NOT touched here.
-- =====================================================================

create or replace function public.tg_audit_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    new.updated_at = now();
    -- Overwritten (not coalesced): a client cannot spoof the creating actor.
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  elsif (tg_op = 'UPDATE') then
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

create or replace function public.tg_audit_projects()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    new.updated_at = now();
    -- Overwritten (not coalesced): a client cannot spoof the creating actor.
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
    if (new.archived is true) then
      new.archived_at = now();
      new.archived_by = auth.uid();
    else
      new.archived_at = null;
      new.archived_by = null;
    end if;
  elsif (tg_op = 'UPDATE') then
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
    new.updated_by = auth.uid();
    if (new.archived is true and old.archived is distinct from true) then
      new.archived_at = now();
      new.archived_by = auth.uid();
    else
      -- No archive transition (or un-archive): preserve the historical archive
      -- event and prevent clients forging these values.
      new.archived_at = old.archived_at;
      new.archived_by = old.archived_by;
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.tg_audit_assignments()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    new.updated_at = now();
    -- Overwritten (not coalesced): a client cannot spoof the creating actor.
    new.created_by = auth.uid();
  elsif (tg_op = 'UPDATE') then
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
  end if;
  return new;
end;
$$;

create or replace function public.tg_audit_financial()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (tg_op = 'INSERT') then
    new.created_at = now();
    new.updated_at = now();
    -- Overwritten (not coalesced): a client cannot spoof the creating actor.
    new.created_by = auth.uid();
    new.updated_by = auth.uid();
  elsif (tg_op = 'UPDATE') then
    new.created_at = old.created_at;
    new.created_by = old.created_by;
    new.updated_at = now();
    new.updated_by = auth.uid();
  end if;
  return new;
end;
$$;

-- =====================================================================
-- 2. Missing project operational fields (all nullable, additive).
-- ---------------------------------------------------------------------
-- No values are invented for existing rows; nullable columns leave the seven
-- production projects unchanged. No Delayed status is added (Delayed is a
-- DERIVED concept from target_completion_date, not a status). No finance
-- fields are added. start_date is NOT renamed and last_updated is NOT dropped.
-- =====================================================================
alter table public.projects
  add column if not exists actual_start_date date,
  add column if not exists target_completion_date date,
  add column if not exists actual_completion_date date,
  add column if not exists blocker text;

-- blocker: NULL or trimmed non-blank, bounded at 500 chars.
alter table public.projects
  add constraint projects_blocker_check
    check (blocker is null
           or (char_length(trim(blocker)) > 0 and char_length(blocker) <= 500));

-- When both are present a target completion must not precede the planned start.
alter table public.projects
  add constraint projects_target_after_start_check
    check (start_date is null
           or target_completion_date is null
           or target_completion_date >= start_date);

-- When both are present an actual completion must not precede the actual start.
alter table public.projects
  add constraint projects_actual_completion_after_start_check
    check (actual_start_date is null
           or actual_completion_date is null
           or actual_completion_date >= actual_start_date);

-- =====================================================================
-- 3. Responsible-person (project lead) validation.
-- ---------------------------------------------------------------------
-- projects.lead_person_id remains the canonical SINGLE accountable project
-- lead. project_assignments remains the wider project-team / future visibility
-- model. This migration does NOT change the existing lead_person_id -> auth.users
-- foreign key. It adds a narrow SECURITY DEFINER validator and requires it in the
-- project INSERT/UPDATE WITH CHECK so an out-of-authority lead can never be set.
--
-- Authority encoded (see BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md):
--   * NULL is allowed (unassigned lead is valid).
--   * Owner may assign any ACTIVE profile whose role is owner/manager/staff.
--   * Manager may assign HIMSELF, or any ACTIVE staff profile — never the owner,
--     another manager, a viewer, an inactive/nonexistent profile, or an auth
--     user with no profile.
--   * staff / viewer / no-profile callers: always false.
-- =====================================================================
create or replace function public.can_assign_project_lead(target_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  caller_role text := public.current_user_role();
  target_role text;
  target_active boolean;
begin
  -- Unassigned lead is always permitted.
  if target_user_id is null then
    return true;
  end if;

  -- The target must be a real profile; capture its role/active state.
  select role, is_active
    into target_role, target_active
  from public.profiles
  where id = target_user_id;

  -- No profile (or an auth user without a profile) can never be a lead.
  if not found or target_active is not true then
    return false;
  end if;

  if caller_role = 'owner' then
    return target_role in ('owner', 'manager', 'staff');
  elsif caller_role = 'manager' then
    -- Manager may assign an active staff member, or himself.
    return target_role = 'staff' or target_user_id = auth.uid();
  else
    -- staff / viewer / no active profile.
    return false;
  end if;
end;
$$;

-- Internal RLS helper: signed-in users only.
revoke execute on function public.can_assign_project_lead(uuid) from public;
revoke execute on function public.can_assign_project_lead(uuid) from anon;
grant execute on function public.can_assign_project_lead(uuid) to authenticated;

-- Replace the project INSERT/UPDATE policies so they keep the existing
-- owner/manager authority AND additionally require a valid project lead.
-- SELECT and staff assignment-scoped visibility are intentionally untouched.
drop policy if exists "projects_insert_owner_manager" on public.projects;
create policy "projects_insert_owner_manager"
on public.projects
for insert
to authenticated
with check (
  (public.is_owner() or public.is_manager())
  and public.can_assign_project_lead(lead_person_id)
);

drop policy if exists "projects_update_owner_manager" on public.projects;
create policy "projects_update_owner_manager"
on public.projects
for update
to authenticated
using (public.is_owner() or public.is_manager())
with check (
  (public.is_owner() or public.is_manager())
  and public.can_assign_project_lead(lead_person_id)
);

-- =====================================================================
-- 4. Harden EXECUTE privileges on the foundation RLS helpers.
-- ---------------------------------------------------------------------
-- These SECURITY DEFINER helpers exist only to back RLS policies. The RLS
-- policies run as the authenticated role, so authenticated retains EXECUTE;
-- PUBLIC and anon lose it (they never legitimately call these directly, and
-- removing anon closes off role-enumeration via /rest/v1/rpc). SELECT policies
-- continue to operate because they are evaluated for the authenticated role.
-- =====================================================================
revoke execute on function public.current_user_role() from public;
revoke execute on function public.current_user_role() from anon;
grant  execute on function public.current_user_role() to authenticated;

revoke execute on function public.is_owner() from public;
revoke execute on function public.is_owner() from anon;
grant  execute on function public.is_owner() to authenticated;

revoke execute on function public.is_manager() from public;
revoke execute on function public.is_manager() from anon;
grant  execute on function public.is_manager() to authenticated;

revoke execute on function public.is_staff() from public;
revoke execute on function public.is_staff() from anon;
grant  execute on function public.is_staff() to authenticated;

revoke execute on function public.is_assigned_to_project(uuid) from public;
revoke execute on function public.is_assigned_to_project(uuid) from anon;
grant  execute on function public.is_assigned_to_project(uuid) to authenticated;

revoke execute on function public.user_has_role(uuid, text) from public;
revoke execute on function public.user_has_role(uuid, text) from anon;
grant  execute on function public.user_has_role(uuid, text) to authenticated;

-- =====================================================================
-- 5. Immutable, system-generated project-change ledger.
-- ---------------------------------------------------------------------
-- This is a SYSTEM ledger, not a user-editable activity feed. There is NO
-- authenticated INSERT/UPDATE/DELETE policy: rows are written ONLY by the
-- SECURITY DEFINER trigger below (which runs as the table owner and so bypasses
-- RLS). Any future human-entered operational note requires a separate reviewed
-- mechanism / controlled RPC — clients must not be able to fabricate audit
-- events through this table.
-- =====================================================================
create table if not exists public.project_activities (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  action text not null check (action in ('created', 'updated', 'archived', 'restored')),
  -- Nullable so an event is never lost if the acting auth user is later removed.
  actor_id uuid null references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  -- Names of the operational fields that changed for this event (never empty
  -- for a recorded event; a no-op update writes no row at all).
  changed_fields text[] not null,
  previous_values jsonb null,
  new_values jsonb null,
  reason text null check (reason is null or char_length(reason) <= 2000),
  created_at timestamptz not null default now()
);

alter table public.project_activities enable row level security;

-- Read model mirrors project visibility: owner/manager read everything;
-- assigned staff read only their assigned projects' history; viewer/no-profile
-- see nothing. No write policies exist by design.
create policy "project_activities_select_owner_manager_assigned"
on public.project_activities
for select
to authenticated
using (
  public.is_owner()
  or public.is_manager()
  or (public.is_staff() and public.is_assigned_to_project(project_id))
);

-- No INSERT/UPDATE/DELETE policies are intentionally created. The ledger is
-- append-only and written exclusively by public.tg_project_history().

-- =====================================================================
-- 6. Automatic project-history trigger.
-- ---------------------------------------------------------------------
-- AFTER INSERT OR UPDATE on public.projects. SECURITY DEFINER with a controlled
-- search_path so it can append to the ledger regardless of the caller's RLS.
-- Only OPERATIONAL fields are diffed; pure audit fields (created_at/by,
-- updated_at/by, archived_at/by) are ignored. actor_id is always auth.uid(),
-- never client input. No finance data is ever referenced.
-- =====================================================================
create or replace function public.tg_project_history()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Operational fields tracked for history (audit-only columns excluded).
  op_fields constant text[] := array[
    'project_name', 'client_site_name', 'location', 'county', 'project_type',
    'status', 'stage', 'lead_person_id', 'start_date', 'last_updated',
    'next_action', 'next_action_date', 'portfolio_eligible',
    'portfolio_permission_status', 'notes', 'archived',
    'actual_start_date', 'target_completion_date', 'actual_completion_date',
    'blocker'
  ];
  oldj jsonb;
  newj jsonb;
  f text;
  changed text[] := '{}';
  pv jsonb := '{}'::jsonb;
  nv jsonb := '{}'::jsonb;
  act text;
begin
  if (tg_op = 'INSERT') then
    newj := to_jsonb(new);
    foreach f in array op_fields loop
      -- Record only the fields that actually carry an initial value.
      if jsonb_typeof(newj -> f) is distinct from 'null' then
        changed := changed || f;
        nv := nv || jsonb_build_object(f, newj -> f);
      end if;
    end loop;

    insert into public.project_activities
      (project_id, action, actor_id, occurred_at, changed_fields,
       previous_values, new_values, reason, created_at)
    values
      (new.id, 'created', auth.uid(), now(), changed, null, nv, null, now());

    return null;

  elsif (tg_op = 'UPDATE') then
    oldj := to_jsonb(old);
    newj := to_jsonb(new);
    foreach f in array op_fields loop
      if (oldj -> f) is distinct from (newj -> f) then
        changed := changed || f;
        pv := pv || jsonb_build_object(f, oldj -> f);
        nv := nv || jsonb_build_object(f, newj -> f);
      end if;
    end loop;

    -- A pure audit-only / no-op update writes no history row.
    if array_length(changed, 1) is null then
      return null;
    end if;

    if ('archived' = any (changed)) then
      if (new.archived is true) then
        act := 'archived';
      else
        act := 'restored';
      end if;
    else
      act := 'updated';
    end if;

    insert into public.project_activities
      (project_id, action, actor_id, occurred_at, changed_fields,
       previous_values, new_values, reason, created_at)
    values
      (new.id, act, auth.uid(), now(), changed, pv, nv, null, now());

    return null;
  end if;

  return null;
end;
$$;

-- Trigger function is internal; it is fired by the trigger below and never
-- needs to be callable directly.
revoke execute on function public.tg_project_history() from public;
revoke execute on function public.tg_project_history() from anon;

create trigger projects_history
after insert or update on public.projects
for each row execute function public.tg_project_history();

-- =====================================================================
-- 7. Indexes for upcoming project CRUD and dashboard queries.
-- =====================================================================
create index if not exists projects_archived_idx on public.projects (archived);
create index if not exists projects_status_idx on public.projects (status);
create index if not exists projects_stage_idx on public.projects (stage);
create index if not exists projects_next_action_date_idx on public.projects (next_action_date);
create index if not exists projects_target_completion_date_idx on public.projects (target_completion_date);
create index if not exists projects_lead_person_id_idx on public.projects (lead_person_id);

create index if not exists project_activities_project_occurred_idx
  on public.project_activities (project_id, occurred_at desc);
