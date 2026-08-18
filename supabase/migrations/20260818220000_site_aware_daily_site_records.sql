-- BOTANIQUE DESIGNERS — Site-aware Daily Site Records.
--
-- The Daily Site Record stays the canonical field-execution truth. This makes it
-- belong to a Site directly so maintenance-only work has the same
-- Plan -> Execute -> Verify -> Close loop without a fabricated Project.
--
--   site_id     NOT NULL  — the physical property the day's work happened at
--   project_id  NULLABLE  — Botanique delivery context, kept wherever it exists
--
-- Authority is deliberately NOT widened for existing records: a record that
-- carries a Project is still authorised exactly as before, through
-- can_manage_daily_site_project. Only a project-less record falls back to Site
-- authority, which itself requires either manageable Project work at that Site
-- or an active Maintenance relationship there.
--
-- public.daily_site_entries carries no triggers, so the structural backfill
-- below writes no event, touches no actor column and bumps no version.

alter table public.daily_site_entries
  add column site_id uuid references public.sites(id) on delete restrict;

-- Structural reconciliation only: never an operational edit.
update public.daily_site_entries e
set site_id = p.site_id
from public.projects p
where p.id = e.project_id and e.site_id is null;

alter table public.daily_site_entries
  alter column site_id set not null,
  alter column project_id drop not null;

create index daily_site_entries_site_date_idx
  on public.daily_site_entries (site_id, work_date desc);

-- The existing one-live-per-Project-per-date rule is unchanged. Project-less
-- records cannot rely on it (NULLs never collide), so they get the equivalent
-- guarantee per Site. Where a Site legitimately holds several live records on
-- one date, the Maintenance completion RPC stays unambiguous because the caller
-- names the exact Daily Site Record it is closing with.
create unique index daily_site_entries_one_live_per_site_date_no_project
  on public.daily_site_entries (site_id, work_date)
  where project_id is null
    and state = any(array['draft','submitted','returned_for_correction','resubmitted','accepted']);

-- ---------------------------------------------------------------- authority --

create or replace function public.can_manage_daily_site_site(target_site_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select case public.current_user_role()
    when 'owner' then exists (select 1 from public.sites s where s.id = target_site_id)
    when 'manager' then
      exists (
        select 1 from public.projects p
        where p.site_id = target_site_id
          and (public.is_assigned_to_project(p.id) or p.lead_person_id = auth.uid())
      )
      or exists (
        select 1 from public.maintenance_relationships r
        where r.site_id = target_site_id and r.status = 'active'
      )
    else false
  end
$$;

-- One authority answer for a Daily Site Record. Project-backed records keep
-- their existing Project authority untouched.
create or replace function public.can_manage_daily_site_record(
  target_project_id uuid,
  target_site_id uuid
)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select case
    when target_project_id is not null then public.can_manage_daily_site_project(target_project_id)
    else public.can_manage_daily_site_site(target_site_id)
  end
$$;

-- A Site may receive a NEW record when it has Ongoing Project work or an active
-- Maintenance relationship.
create or replace function public.private_daily_site_site_eligible(target_site_id uuid)
returns boolean
language sql stable security definer set search_path to 'public'
as $$
  select exists (
      select 1 from public.projects p
      where p.site_id = target_site_id and p.archived = false and p.status = 'Ongoing'
    )
    or exists (
      select 1 from public.maintenance_relationships r
      where r.site_id = target_site_id and r.status = 'active'
    )
$$;

drop policy if exists daily_site_entries_select_authorised on public.daily_site_entries;
create policy daily_site_entries_select_authorised on public.daily_site_entries
  for select to authenticated
  using (public.can_manage_daily_site_record(project_id, site_id));

-- ------------------------------------------------------------ record picker --

create or replace function public.daily_site_authorised_sites()
returns table(id uuid, site_name text, location text, county text, projects jsonb)
language sql stable security definer set search_path to 'public'
as $$
  select s.id, s.site_name, s.location, s.county,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'project_name', p.project_name, 'status', p.status)
              order by p.project_name)
      from public.projects p
      where p.site_id = s.id and p.archived = false and p.status = 'Ongoing'
        and public.can_manage_daily_site_project(p.id)
    ), '[]'::jsonb)
  from public.sites s
  where public.can_manage_daily_site_site(s.id)
    and public.private_daily_site_site_eligible(s.id)
  order by s.site_name asc, s.location nulls last
$$;

-- ------------------------------------------------------------- draft create --

-- Canonical Site-first creation. target_project_id stays optional context and,
-- when supplied, must belong to the same Site and satisfy the unchanged Project
-- authority and eligibility rules.
create or replace function public.create_daily_site_entry_draft_for_site(
  target_site_id uuid,
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
language plpgsql security definer set search_path to 'public'
as $$
declare
  caller_role text := public.private_active_daily_site_role();
  site public.sites;
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
  if target_site_id is null then
    raise exception 'a site is required' using errcode = 'check_violation';
  end if;

  select * into site from public.sites where id = target_site_id for share;
  if not found then
    raise exception 'site not found or unavailable' using errcode = 'no_data_found';
  end if;

  if target_project_id is not null then
    select * into project from public.projects where id = target_project_id for share;
    if not found then
      raise exception 'project not found or unavailable' using errcode = 'no_data_found';
    end if;
    if project.site_id <> site.id then
      raise exception 'that project belongs to a different site' using errcode = 'check_violation';
    end if;
    -- Unchanged Project authority + operational eligibility.
    if not public.can_manage_daily_site_project(project.id) then
      raise exception 'not authorised for this project' using errcode = 'insufficient_privilege';
    end if;
    if not public.private_daily_site_project_eligible(project.id) then
      raise exception 'project is not operationally eligible for a new Daily Site Entry (only an Ongoing, non-archived project may receive one; resume a paused project via approval first)' using errcode = 'check_violation';
    end if;
  else
    if not public.can_manage_daily_site_site(site.id) then
      raise exception 'not authorised for this site' using errcode = 'insufficient_privilege';
    end if;
    if not public.private_daily_site_site_eligible(site.id) then
      raise exception 'site is not operationally eligible for a new Daily Site Entry (it needs Ongoing project work or an active Maintenance relationship)' using errcode = 'check_violation';
    end if;
  end if;

  plan := public.private_daily_site_normalise_plan(
    target_disposition, target_no_work_reason, target_reason_detail,
    target_worker_count, target_crew_reference, target_rate, target_agreed,
    target_work_planned, target_funds_available, target_additional_requested,
    target_notes, target_evidence_status
  );

  insert into public.daily_site_entries (
    site_id, project_id, work_date, disposition, no_work_reason, reason_detail,
    expected_worker_count, crew_reference, rate_per_worker, agreed_labour_total,
    planned_labour_cost, work_planned, funds_available, additional_amount_requested,
    notes, evidence_status, state, version, created_by, updated_by
  ) values (
    site.id, target_project_id, target_work_date, target_disposition, plan.out_no_work_reason, plan.out_reason_detail,
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

-- Existing Project-first callers keep working: resolve the Site from the Project.
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
language plpgsql security definer set search_path to 'public'
as $$
declare
  project public.projects;
begin
  select * into project from public.projects where id = target_project_id for share;
  if not found then
    raise exception 'project not found or unavailable' using errcode = 'no_data_found';
  end if;
  return public.create_daily_site_entry_draft_for_site(
    project.site_id, project.id, target_work_date, target_disposition,
    target_no_work_reason, target_reason_detail, target_worker_count, target_crew_reference,
    target_rate, target_agreed, target_work_planned, target_funds_available,
    target_additional_requested, target_notes, target_evidence_status
  );
end;
$$;

-- ------------------------------------------------- lifecycle authority swaps --
-- Each of these previously called can_manage_daily_site_project(entry.project_id),
-- which cannot answer for a project-less record. Behaviour for a Project-backed
-- record is identical.

create or replace function public.update_daily_site_entry_draft(
  target_entry_id uuid, target_disposition text,
  target_no_work_reason text default null, target_reason_detail text default null,
  target_worker_count integer default null, target_crew_reference text default null,
  target_rate numeric default null, target_agreed numeric default null,
  target_work_planned text default null, target_funds_available numeric default null,
  target_additional_requested numeric default null, target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql security definer set search_path to 'public'
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
  if not public.can_manage_daily_site_record(entry.project_id, entry.site_id) then
    raise exception 'not authorised for this record' using errcode = 'insufficient_privilege';
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

create or replace function public.submit_daily_site_entry(target_entry_id uuid)
returns public.daily_site_entries
language plpgsql security definer set search_path to 'public'
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
  if not public.can_manage_daily_site_record(entry.project_id, entry.site_id) then
    raise exception 'not authorised for this record' using errcode = 'insufficient_privilege';
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

create or replace function public.correct_and_resubmit_daily_site_entry(
  target_entry_id uuid, target_disposition text,
  target_no_work_reason text default null, target_reason_detail text default null,
  target_worker_count integer default null, target_crew_reference text default null,
  target_rate numeric default null, target_agreed numeric default null,
  target_work_planned text default null, target_funds_available numeric default null,
  target_additional_requested numeric default null, target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql security definer set search_path to 'public'
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
  if not public.can_manage_daily_site_record(entry.project_id, entry.site_id) then
    raise exception 'not authorised for this record' using errcode = 'insufficient_privilege';
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

-- Supersession must carry Site identity onto the replacement record.
create or replace function public.supersede_daily_site_entry(
  target_entry_id uuid, target_reason text, target_disposition text,
  target_no_work_reason text default null, target_reason_detail text default null,
  target_worker_count integer default null, target_crew_reference text default null,
  target_rate numeric default null, target_agreed numeric default null,
  target_work_planned text default null, target_funds_available numeric default null,
  target_additional_requested numeric default null, target_notes text default null,
  target_evidence_status text default 'none'
)
returns public.daily_site_entries
language plpgsql security definer set search_path to 'public'
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
    site_id, project_id, work_date, disposition, no_work_reason, reason_detail,
    expected_worker_count, crew_reference, rate_per_worker, agreed_labour_total,
    planned_labour_cost, work_planned, funds_available, additional_amount_requested,
    notes, evidence_status, state, version, supersedes_entry_id,
    submitted_by, submitted_at, is_late, reviewed_by, reviewed_at,
    created_by, updated_by
  ) values (
    original.site_id, original.project_id, original.work_date, target_disposition, plan.out_no_work_reason, plan.out_reason_detail,
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

-- ------------------------------------------- Maintenance closure uses site_id --
-- Previously resolved the record's Site through its Project, which a
-- project-less record cannot provide. The Daily Site Record now states its Site.

create or replace function public.complete_maintenance_visit_cycle(
  target_visit_id uuid, expected_version integer, target_daily_site_entry_id uuid,
  target_outcome text, completion_note text, target_follow_up_required boolean,
  target_follow_up_note text default null, next_scheduled_date date default null,
  next_purpose text default null
)
returns public.maintenance_visits
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_visits;
  relationship public.maintenance_relationships;
  execution public.daily_site_entries;
  clean_note text := nullif(trim(coalesce(completion_note,'')),'');
  clean_follow_up text := nullif(trim(coalesce(target_follow_up_note,'')),'');
  clean_next_purpose text := nullif(trim(coalesce(next_purpose,'')),'');
begin
  if target_outcome not in ('completed','partial') then raise exception 'Choose Completed or Partially completed for the Maintenance outcome' using errcode='22023'; end if;
  if clean_note is null then raise exception 'A short Maintenance completion note is required' using errcode='22023'; end if;
  if target_follow_up_required is null then raise exception 'State whether Maintenance follow-up is required' using errcode='22023'; end if;
  if target_outcome='partial' and not target_follow_up_required then raise exception 'Partially completed Maintenance requires follow-up' using errcode='22023'; end if;
  if target_follow_up_required and clean_follow_up is null then raise exception 'Describe the Maintenance follow-up required' using errcode='22023'; end if;
  if next_scheduled_date is not null and clean_next_purpose is null then raise exception 'Describe the planned work for the next Maintenance visit' using errcode='22023'; end if;

  select * into existing from public.maintenance_visits where id=target_visit_id for update;
  if not found then raise exception 'Maintenance visit not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id for share;
  if not public.can_manage_maintenance_site(relationship.site_id) then raise exception 'You are not authorised to manage this Maintenance visit' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status<>'scheduled' then raise exception 'Only a Scheduled visit can be completed' using errcode='22023'; end if;

  if target_daily_site_entry_id is not null then
    select * into execution from public.daily_site_entries where id=target_daily_site_entry_id;
    if not found then raise exception 'Daily Site Record not found' using errcode='P0002'; end if;
    if execution.site_id is distinct from relationship.site_id then
      raise exception 'This Daily Site Record belongs to a different Site' using errcode='22023';
    end if;
    if execution.work_date<>existing.scheduled_date then
      raise exception 'The Daily Site Record date must match the scheduled Maintenance visit date' using errcode='22023';
    end if;
    if execution.state<>'accepted' then
      raise exception 'Only an Accepted Daily Site Record can close a Maintenance visit' using errcode='22023';
    end if;
  end if;

  if next_scheduled_date is not null then
    if relationship.status<>'active' then raise exception 'A next visit can only be scheduled for Active Maintenance' using errcode='22023'; end if;
    if next_scheduled_date<=existing.scheduled_date then raise exception 'The next Maintenance visit must be after the visit being completed' using errcode='22023'; end if;
  end if;

  perform set_config('app.maintenance_visit_controlled_transition','true',true);
  update public.maintenance_visits set
    status='completed', completed_at=now(), completion_note=clean_note,
    daily_site_entry_id=target_daily_site_entry_id, completion_outcome=target_outcome,
    follow_up_required=target_follow_up_required,
    follow_up_note=case when target_follow_up_required then clean_follow_up else null end
  where id=existing.id and version=expected_version returning * into existing;
  perform set_config('app.maintenance_visit_controlled_transition','false',true);

  if next_scheduled_date is not null then
    insert into public.maintenance_visits(maintenance_relationship_id,scheduled_date,purpose)
    values(relationship.id,next_scheduled_date,clean_next_purpose);
  end if;
  return existing;
end;
$$;

revoke execute on function public.can_manage_daily_site_site(uuid) from public, anon;
revoke execute on function public.can_manage_daily_site_record(uuid, uuid) from public, anon;
revoke execute on function public.daily_site_authorised_sites() from public, anon;
revoke execute on function public.create_daily_site_entry_draft_for_site(uuid,uuid,date,text,text,text,integer,text,numeric,numeric,text,numeric,numeric,text,text) from public, anon;
grant execute on function public.can_manage_daily_site_site(uuid) to authenticated;
grant execute on function public.can_manage_daily_site_record(uuid, uuid) to authenticated;
grant execute on function public.daily_site_authorised_sites() to authenticated;
grant execute on function public.create_daily_site_entry_draft_for_site(uuid,uuid,date,text,text,text,integer,text,numeric,numeric,text,numeric,numeric,text,text) to authenticated;
