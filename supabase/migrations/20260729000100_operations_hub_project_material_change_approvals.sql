-- BD-OPERATIONS-HUB-01 — Phase 1B-A4: Project Material Change Approvals and
-- Manager Project-Scope Control.
--
-- Forward-only, additive, non-destructive migration. Review before applying to
-- the Botanique-only Supabase project. It MUST NOT be run before the four
-- migrations it depends on:
--   20260614000100_admin_foundation.sql
--   20260726000100_operations_hub_phase_1a_lead_data_rls.sql
--   20260726000200_operations_hub_phase_1b_a1_project_integrity.sql
--   20260728000100_operations_hub_approvals_foundation.sql
--
-- It does NOT drop, rename or rewrite any existing table or column, does NOT
-- weaken any finance boundary, does NOT touch Leads/campaigns/lead_activities,
-- Daily Site Operations, Simple Invoice Manager or any public-site domain, and
-- does NOT create any finance/labour/expenditure/document domain. No hosted
-- project row is mutated by this migration (it seeds no data).
--
-- What it delivers (see BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md and
-- BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md):
--   1. A seventh, field-level approval type `project_material_change` that
--      routes manager-proposed changes to material project IDENTITY, AUTHORITY
--      and SCHEDULE fields through owner review, extending — not duplicating —
--      the existing approval_requests / approval_events lifecycle.
--   2. Database enforcement that a MANAGER can no longer DIRECTLY change those
--      material fields (a new BEFORE UPDATE guard), replacing the remaining
--      direct-edit gap left by the interim Phase 1B-A1 boundary.
--   3. Manager project VISIBILITY + UPDATE scoping in RLS: a manager may now
--      operate only on projects they LEAD (lead_person_id) or are actively
--      ASSIGNED to — never the whole portfolio. The owner remains company-wide.
--   4. Removal of DIRECT manager project CREATION (owner-only INSERT), replaced
--      by a restricted `project_intake_requests` proposal table with its own
--      review lifecycle; an approved intake atomically creates the live project
--      and records the intake -> created-project relationship. A pending intake
--      never enters project lists, Dashboard counts, charts, Daily Site
--      Operations, search or portfolio reporting.
--
-- The pre-existing six lifecycle approval types (activation, target completion,
-- completion, cancellation, archive, restore) are preserved verbatim and are
-- NOT duplicated by the material-change path. The interim material-authority
-- and project-lead guards remain attached as defence-in-depth.

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. Extend the approval_type domain with `project_material_change`.
-- ---------------------------------------------------------------------
-- The inline column CHECK on approval_requests.approval_type is replaced with
-- the same six values PLUS the new field-level type. No existing value or row
-- is affected (production currently holds zero approval requests).
-- =====================================================================
alter table public.approval_requests
  drop constraint approval_requests_approval_type_check;

alter table public.approval_requests
  add constraint approval_requests_approval_type_check
  check (approval_type in (
    'project_activation',
    'project_target_completion_change',
    'project_completion',
    'project_cancellation',
    'project_archive',
    'project_restore',
    'project_material_change'
  ));

-- =====================================================================
-- 2. Material-change field allowlist, original snapshot, validation, apply.
-- ---------------------------------------------------------------------
-- Strict key-level allowlist. Only these nine MATERIAL fields may ever appear
-- in a project_material_change proposal. Lifecycle/status/portfolio/completion
-- fields are deliberately EXCLUDED here because they already have dedicated
-- owner-reserved mechanisms (the six approval types + the interim authority
-- boundary); routing them through material change too would create duplicate
-- approval paths for the same change.
-- =====================================================================
create or replace function public.private_project_material_allowlist()
returns text[]
language sql
immutable
security definer
set search_path = public
as $$
  select array[
    'project_name',
    'client_site_name',
    'location',
    'county',
    'project_type',
    'status',
    'stage',
    'lead_person_id',
    'start_date',
    'actual_start_date'
  ]::text[]
$$;

-- Build the authoritative ORIGINAL snapshot for exactly the keys present in a
-- material proposal, drawn from the live project row. Rejects any key outside
-- the allowlist and an empty proposal.
create or replace function public.private_project_material_original(
  project public.projects,
  proposed jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allow text[] := public.private_project_material_allowlist();
  k text;
  result jsonb := '{}'::jsonb;
  key_count integer := 0;
begin
  if jsonb_typeof(proposed) <> 'object' then
    raise exception 'material proposal must be a JSON object' using errcode = 'check_violation';
  end if;

  for k in select jsonb_object_keys(proposed) loop
    key_count := key_count + 1;
    if not (k = any(allow)) then
      raise exception 'field "%" is not an approvable material field', k using errcode = 'check_violation';
    end if;
    result := result || jsonb_build_object(k,
      case k
        when 'project_name' then to_jsonb(project.project_name)
        when 'client_site_name' then to_jsonb(project.client_site_name)
        when 'location' then to_jsonb(project.location)
        when 'county' then to_jsonb(project.county)
        when 'project_type' then to_jsonb(project.project_type)
        when 'status' then to_jsonb(project.status)
        when 'stage' then to_jsonb(project.stage)
        when 'lead_person_id' then to_jsonb(project.lead_person_id)
        when 'start_date' then to_jsonb(project.start_date)
        when 'actual_start_date' then to_jsonb(project.actual_start_date)
      end
    );
  end loop;

  if key_count = 0 then
    raise exception 'a material proposal must change at least one field' using errcode = 'check_violation';
  end if;

  return result;
end;
$$;

-- Validate a material proposal against the live project: identical key sets,
-- authoritative (non-stale) original, a genuine difference, and per-field
-- value rules. The proposed lead (if any) must be assignable under OWNER
-- authority (an active owner/manager/staff profile) — never merely because the
-- requesting manager named himself; the live project is not changed here.
create or replace function public.private_validate_project_material_change(
  project public.projects,
  original jsonb,
  proposed jsonb
)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allow text[] := public.private_project_material_allowlist();
  k text;
  v jsonb;
  text_value text;
  lead_uuid uuid;
begin
  -- Original and proposed must describe exactly the same field set.
  if not public.private_json_keys_match(
       proposed,
       coalesce((select array_agg(key order by key) from jsonb_object_keys(original) key), array[]::text[])
     ) then
    raise exception 'material original and proposed field sets must match' using errcode = 'check_violation';
  end if;

  -- Stale-request protection: the stored original must still match the live row.
  if original <> public.private_project_material_original(project, proposed) then
    raise exception 'approval request is stale; the project has changed' using errcode = 'serialization_failure';
  end if;
  if original = proposed then
    raise exception 'proposed values must differ from current values' using errcode = 'check_violation';
  end if;

  for k in select jsonb_object_keys(proposed) loop
    if not (k = any(allow)) then
      raise exception 'field "%" is not an approvable material field', k using errcode = 'check_violation';
    end if;
    v := proposed -> k;

    if k in ('project_name', 'project_type', 'status') then
      -- Required, non-blank strings.
      if jsonb_typeof(v) <> 'string' or char_length(trim(v #>> '{}')) = 0 then
        raise exception 'field "%" must be a non-empty string', k using errcode = 'check_violation';
      end if;
    elsif k in ('client_site_name', 'location', 'county', 'lead_person_id',
                'start_date', 'actual_start_date') then
      -- Nullable: JSON null clears the column; a string is validated below.
      if jsonb_typeof(v) not in ('string', 'null') then
        raise exception 'field "%" must be a string or null', k using errcode = 'check_violation';
      end if;
    elsif k = 'stage' then
      if jsonb_typeof(v) <> 'string' then
        raise exception 'stage must be a string' using errcode = 'check_violation';
      end if;
    end if;

    text_value := v #>> '{}';

    case k
      when 'project_name' then
        if char_length(text_value) > 160 then
          raise exception 'project_name exceeds 160 characters' using errcode = 'check_violation';
        end if;
      when 'client_site_name' then
        if jsonb_typeof(v) = 'string'
           and (char_length(trim(text_value)) = 0 or char_length(text_value) > 160) then
          raise exception 'client_site_name must be non-blank and <= 160 characters' using errcode = 'check_violation';
        end if;
      when 'location' then
        if jsonb_typeof(v) = 'string'
           and (char_length(trim(text_value)) = 0 or char_length(text_value) > 120) then
          raise exception 'location must be non-blank and <= 120 characters' using errcode = 'check_violation';
        end if;
      when 'county' then
        if jsonb_typeof(v) = 'string'
           and (char_length(trim(text_value)) = 0 or char_length(text_value) > 80) then
          raise exception 'county must be non-blank and <= 80 characters' using errcode = 'check_violation';
        end if;
      when 'project_type' then
        if text_value not in (
          'Residential', 'Estate', 'Hospitality', 'Institutional', 'Commercial',
          'Public Realm', 'Design Concept', 'Maintenance', 'Other'
        ) then
          raise exception 'project_type is not a permitted value' using errcode = 'check_violation';
        end if;
      when 'status' then
        -- Only the Ongoing<->Paused transition on an already-active project is a
        -- material-change proposal. Activation (Pending->Ongoing), completion,
        -- cancellation, archive and restore remain owner-reserved via their own
        -- dedicated approval types; Design-only is owner-only. Both the current
        -- (captured) status and the proposed status must be Ongoing or Paused.
        if text_value not in ('Ongoing', 'Paused')
           or (original->>'status') not in ('Ongoing', 'Paused') then
          raise exception 'status via material change is limited to the Ongoing<->Paused transition on an active project; activation, completion, cancellation, archive and restore use their dedicated approvals' using errcode = 'check_violation';
        end if;
      when 'stage' then
        -- Terminal stages remain owner-reserved via the dedicated completion /
        -- archive lifecycle types; material change covers only operational stages.
        if text_value in ('Completed', 'Archived') then
          raise exception 'Completed/Archived stage is governed by the dedicated completion/archive approvals, not material change' using errcode = 'check_violation';
        end if;
        if text_value not in (
          'Inquiry', 'Site Visit', 'Concept Design', 'Detailed Design',
          'Quotation Sent', 'Awaiting Approval', 'Implementation', 'Maintenance'
        ) then
          raise exception 'stage is not a permitted operational value' using errcode = 'check_violation';
        end if;
      when 'lead_person_id' then
        if jsonb_typeof(v) = 'string' then
          begin
            lead_uuid := text_value::uuid;
          exception when invalid_text_representation then
            raise exception 'lead_person_id must be a UUID or null' using errcode = 'check_violation';
          end;
          if not exists (
            select 1 from public.profiles
            where id = lead_uuid and is_active = true and role in ('owner', 'manager', 'staff')
          ) then
            raise exception 'proposed accountable lead must be an active owner/manager/staff profile' using errcode = 'check_violation';
          end if;
        end if;
      when 'start_date' then
        if jsonb_typeof(v) = 'string' then perform public.private_iso_date(v); end if;
      when 'actual_start_date' then
        if jsonb_typeof(v) = 'string' then perform public.private_iso_date(v); end if;
    end case;
  end loop;
end;
$$;

-- Apply an approved material proposal atomically. Only allowlisted columns are
-- touched; a JSON null clears a nullable column, an absent key leaves it
-- unchanged. Runs inside decide_project_approval as the deciding owner, so the
-- manager-direct guard and interim boundary early-return for the owner and the
-- project-history trigger records the exact changed fields.
create or replace function public.private_apply_project_material_change(
  target_project_id uuid,
  proposed jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.projects set
    project_name = case when proposed ? 'project_name' then proposed->>'project_name' else project_name end,
    client_site_name = case when proposed ? 'client_site_name' then proposed->>'client_site_name' else client_site_name end,
    location = case when proposed ? 'location' then proposed->>'location' else location end,
    county = case when proposed ? 'county' then proposed->>'county' else county end,
    project_type = case when proposed ? 'project_type' then proposed->>'project_type' else project_type end,
    status = case when proposed ? 'status' then proposed->>'status' else status end,
    stage = case when proposed ? 'stage' then proposed->>'stage' else stage end,
    lead_person_id = case when proposed ? 'lead_person_id' then (proposed->>'lead_person_id')::uuid else lead_person_id end,
    start_date = case when proposed ? 'start_date' then (proposed->>'start_date')::date else start_date end,
    actual_start_date = case when proposed ? 'actual_start_date' then (proposed->>'actual_start_date')::date else actual_start_date end
  where id = target_project_id;
end;
$$;

-- Manager operational scope: true when the caller is a manager who leads OR is
-- actively assigned to the given project. Used by the material-change submit
-- path (assignment/authority validation) and mirrors the scoped project RLS.
create or replace function public.private_manager_project_scope(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_manager() and exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and (
        p.lead_person_id = auth.uid()
        or public.is_assigned_to_project(p.id)
      )
  )
$$;

-- =====================================================================
-- 3. Extend the three approval orchestrators to handle material change.
-- ---------------------------------------------------------------------
-- Each is a CREATE OR REPLACE that preserves the six-type behaviour verbatim
-- and adds a `project_material_change` branch. The material path additionally
-- validates that a MANAGER requester is authorised on the project (lead or
-- assignment); the owner is unrestricted.
-- =====================================================================
create or replace function public.submit_project_approval(
  target_project_id uuid,
  target_approval_type text,
  target_proposed_values jsonb,
  target_reason text,
  target_requester_notes text default null,
  target_supersedes_request_id uuid default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.private_active_approval_role();
  project public.projects;
  original jsonb;
  request public.approval_requests;
begin
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'only an active owner or manager may submit a project approval' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required' using errcode = 'check_violation';
  end if;

  select * into project from public.projects where id = target_project_id for update;
  if not found then
    raise exception 'project not found or unavailable' using errcode = 'no_data_found';
  end if;

  -- A manager may only propose a MATERIAL change on a project they lead or are
  -- assigned to. (The six lifecycle types retain their foundation behaviour.)
  if target_approval_type = 'project_material_change'
     and caller_role = 'manager'
     and not public.private_manager_project_scope(target_project_id) then
    raise exception 'a manager may only propose changes to a project they lead or are assigned to' using errcode = 'insufficient_privilege';
  end if;

  if target_supersedes_request_id is not null and not exists (
    select 1 from public.approval_requests prior
    where prior.id = target_supersedes_request_id
      and prior.project_id = target_project_id
      and prior.approval_type = target_approval_type
      and prior.state in ('rejected', 'withdrawn')
  ) then
    raise exception 'superseded request is not an eligible terminal request' using errcode = 'check_violation';
  end if;

  if target_approval_type = 'project_material_change' then
    original := public.private_project_material_original(project, target_proposed_values);
    perform public.private_validate_project_material_change(project, original, target_proposed_values);
  else
    original := public.private_project_approval_original(target_approval_type, project);
    perform public.private_validate_project_approval(
      target_approval_type, project, original, target_proposed_values
    );
  end if;

  insert into public.approval_requests (
    approval_domain, approval_type, project_id, requester_id, approver_role,
    state, request_round, original_values, proposed_values, reason,
    requester_notes, requested_at, supersedes_request_id, created_by, updated_by
  ) values (
    'project', target_approval_type, project.id, auth.uid(), 'owner',
    'submitted', 1, original, target_proposed_values, trim(target_reason),
    nullif(trim(target_requester_notes), ''), now(), target_supersedes_request_id,
    auth.uid(), auth.uid()
  ) returning * into request;

  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state,
    round_number, event_notes, new_snapshot
  ) values (
    request.id, 'submitted', auth.uid(), null, 'submitted', 1,
    nullif(trim(target_requester_notes), ''),
    jsonb_build_object('original_values', original, 'proposed_values', target_proposed_values, 'reason', trim(target_reason))
  );

  update public.approval_requests
  set state = 'awaiting_review', updated_by = auth.uid(), updated_at = now()
  where id = request.id
  returning * into request;

  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state, round_number
  ) values (
    request.id, 'queued_for_review', auth.uid(), 'submitted', 'awaiting_review', 1
  );

  return request;
end;
$$;

create or replace function public.amend_and_resubmit_approval(
  target_approval_request_id uuid,
  target_proposed_values jsonb,
  target_reason text,
  target_requester_notes text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.approval_requests;
  project public.projects;
  current_original jsonb;
  previous_request jsonb;
begin
  if public.private_active_approval_role() is null
     or public.private_active_approval_role() not in ('owner', 'manager') then
    raise exception 'active approval access is required' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required' using errcode = 'check_violation';
  end if;
  select * into request from public.approval_requests
  where id = target_approval_request_id for update;
  if not found then raise exception 'approval request not found' using errcode = 'no_data_found'; end if;
  if request.requester_id <> auth.uid() then
    raise exception 'only the original requester may amend this request' using errcode = 'insufficient_privilege';
  end if;
  if request.state <> 'amendment_requested' then
    raise exception 'only an amendment-requested approval may be resubmitted' using errcode = 'check_violation';
  end if;

  select * into project from public.projects where id = request.project_id for update;
  if request.approval_type = 'project_material_change' then
    current_original := public.private_project_material_original(project, target_proposed_values);
    perform public.private_validate_project_material_change(project, current_original, target_proposed_values);
  else
    current_original := public.private_project_approval_original(request.approval_type, project);
    perform public.private_validate_project_approval(
      request.approval_type, project, current_original, target_proposed_values
    );
  end if;
  previous_request := jsonb_build_object(
    'round', request.request_round,
    'original_values', request.original_values,
    'proposed_values', request.proposed_values,
    'reason', request.reason,
    'requester_notes', request.requester_notes,
    'decision_notes', request.decision_notes
  );

  update public.approval_requests
  set state = 'awaiting_review', request_round = request_round + 1,
      original_values = current_original, proposed_values = target_proposed_values,
      reason = trim(target_reason), requester_notes = nullif(trim(target_requester_notes), ''),
      decision = null, decision_notes = null, reviewed_at = null,
      requested_at = now(), updated_by = auth.uid(), updated_at = now()
  where id = request.id returning * into request;

  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state,
    round_number, event_notes, previous_snapshot, new_snapshot
  ) values (
    request.id, 'amended', auth.uid(), 'amendment_requested', 'amendment_requested',
    request.request_round, nullif(trim(target_requester_notes), ''), previous_request,
    jsonb_build_object(
      'round', request.request_round,
      'original_values', request.original_values,
      'proposed_values', request.proposed_values,
      'reason', request.reason,
      'requester_notes', request.requester_notes
    )
  );
  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state, round_number
  ) values (
    request.id, 'resubmitted', auth.uid(), 'amendment_requested',
    'awaiting_review', request.request_round
  );
  return request;
end;
$$;

create or replace function public.decide_project_approval(
  target_approval_request_id uuid,
  target_decision text,
  target_decision_notes text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.approval_requests;
  project public.projects;
begin
  if public.private_active_approval_role() is distinct from 'owner' then
    raise exception 'only an active owner may decide approvals' using errcode = 'insufficient_privilege';
  end if;
  if target_decision is null or target_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = 'check_violation';
  end if;
  select * into request from public.approval_requests
  where id = target_approval_request_id for update;
  if not found then raise exception 'approval request not found' using errcode = 'no_data_found'; end if;
  if request.state <> 'awaiting_review' then
    raise exception 'only an awaiting-review request can be decided' using errcode = 'check_violation';
  end if;

  if target_decision = 'approved' then
    select * into project from public.projects where id = request.project_id for update;

    if request.approval_type = 'project_material_change' then
      perform public.private_validate_project_material_change(
        project, request.original_values, request.proposed_values
      );
      perform public.private_apply_project_material_change(project.id, request.proposed_values);
    else
      perform public.private_validate_project_approval(
        request.approval_type, project, request.original_values, request.proposed_values
      );
      case request.approval_type
        when 'project_activation' then
          update public.projects set status = request.proposed_values->>'status' where id = project.id;
        when 'project_target_completion_change' then
          update public.projects
          set target_completion_date = public.private_iso_date(request.proposed_values->'target_completion_date')
          where id = project.id;
        when 'project_completion' then
          update public.projects
          set status = request.proposed_values->>'status',
              actual_completion_date = public.private_iso_date(request.proposed_values->'actual_completion_date')
          where id = project.id;
        when 'project_cancellation' then
          update public.projects set status = request.proposed_values->>'status' where id = project.id;
        when 'project_archive' then
          update public.projects set archived = true where id = project.id;
        when 'project_restore' then
          update public.projects set archived = false where id = project.id;
      end case;
    end if;
  end if;

  update public.approval_requests
  set state = target_decision, decision = target_decision,
      decision_notes = nullif(trim(target_decision_notes), ''),
      reviewed_at = now(), decided_at = now(),
      updated_by = auth.uid(), updated_at = now()
  where id = request.id returning * into request;

  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state,
    round_number, event_notes
  ) values (
    request.id, target_decision, auth.uid(), 'awaiting_review', target_decision,
    request.request_round, nullif(trim(target_decision_notes), '')
  );

  if target_decision = 'approved' then
    insert into public.approval_events (
      approval_request_id, event_type, actor_id, from_state, to_state,
      round_number, event_notes, previous_snapshot, new_snapshot
    ) values (
      request.id, 'project_change_applied', auth.uid(), 'approved', 'approved',
      request.request_round, 'Approved project change applied atomically.',
      request.original_values, request.proposed_values
    );
  end if;
  return request;
end;
$$;

-- =====================================================================
-- 4. Manager direct-write guard for the material allowlist fields.
-- ---------------------------------------------------------------------
-- Replaces the remaining direct-edit gap: a manager may no longer directly
-- change any material identity/authority/schedule field. Owner (and any
-- non-manager caller; RLS still governs whether they may write) is unrestricted.
-- The material-change APPROVAL apply runs as the deciding owner, so this guard
-- early-returns and never blocks an approved change. Unchanged values never
-- block unrelated low-risk edits (next_action/notes/blocker/Ongoing<->Paused).
-- =====================================================================
create or replace function public.tg_guard_project_material_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.current_user_role();
begin
  if caller_role is distinct from 'manager' then
    return new;
  end if;

  if new.project_name is distinct from old.project_name
     or new.client_site_name is distinct from old.client_site_name
     or new.location is distinct from old.location
     or new.county is distinct from old.county
     or new.project_type is distinct from old.project_type
     or new.status is distinct from old.status
     or new.stage is distinct from old.stage
     or new.lead_person_id is distinct from old.lead_person_id
     or new.start_date is distinct from old.start_date
     or new.actual_start_date is distinct from old.actual_start_date then
    raise exception
      'a manager may not directly change material project fields (name, client/site, location, county, type, status, stage, accountable lead, planned or actual start); submit a project_material_change approval for owner review'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.tg_guard_project_material_fields() from public;
revoke execute on function public.tg_guard_project_material_fields() from anon;

create trigger projects_material_fields_guard
before update on public.projects
for each row execute function public.tg_guard_project_material_fields();

-- =====================================================================
-- 5. Manager project VISIBILITY + UPDATE scoping + owner-only CREATE.
-- ---------------------------------------------------------------------
-- Previously a manager could SELECT/UPDATE the whole portfolio and INSERT a
-- live project directly. Now a manager may SELECT/UPDATE only projects they
-- LEAD or are actively ASSIGNED to, and may not INSERT a live project at all
-- (creation flows through project_intake_requests, applied as the owner). The
-- owner remains company-wide; assigned staff read unchanged.
-- =====================================================================
drop policy if exists "projects_select_owner_manager_assigned" on public.projects;
create policy "projects_select_owner_manager_assigned"
on public.projects
for select
to authenticated
using (
  public.is_owner()
  or public.is_assigned_to_project(id)
  or (public.is_manager() and lead_person_id = auth.uid())
);

drop policy if exists "projects_insert_owner_manager" on public.projects;
create policy "projects_insert_owner_only"
on public.projects
for insert
to authenticated
with check (
  public.is_owner()
  and public.can_assign_project_lead(lead_person_id)
);

drop policy if exists "projects_update_owner_manager" on public.projects;
create policy "projects_update_owner_manager_scoped"
on public.projects
for update
to authenticated
using (
  public.is_owner()
  or (public.is_manager() and (lead_person_id = auth.uid() or public.is_assigned_to_project(id)))
)
with check (
  public.is_owner()
  or (public.is_manager() and (lead_person_id = auth.uid() or public.is_assigned_to_project(id)))
);

-- =====================================================================
-- 6. Restricted project-intake proposal table (separate from live projects).
-- ---------------------------------------------------------------------
-- A manager proposes a NEW project here; NO public.projects row exists until an
-- owner approves. The intake is visible only to its requester and the owner and
-- never appears in project lists, Dashboard counts, charts, Daily Site
-- Operations, search or portfolio reporting. Approval atomically creates the
-- live project and records created_project_id (the intake -> project link).
-- =====================================================================
create table public.project_intake_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete restrict,
  approver_role text not null default 'owner' check (approver_role = 'owner'),
  state text not null check (state in (
    'submitted',
    'awaiting_review',
    'amendment_requested',
    'approved',
    'rejected',
    'withdrawn'
  )),
  request_round integer not null default 1 check (request_round > 0),
  proposed_values jsonb not null check (jsonb_typeof(proposed_values) = 'object'),
  reason text not null check (char_length(trim(reason)) between 1 and 2000),
  requester_notes text null check (requester_notes is null or char_length(requester_notes) <= 5000),
  decision text null check (decision is null or decision in ('approved', 'rejected', 'amendment_requested')),
  decision_notes text null check (decision_notes is null or char_length(decision_notes) <= 5000),
  created_project_id uuid null references public.projects(id) on delete restrict,
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  decided_at timestamptz null,
  withdrawn_at timestamptz null,
  withdrawn_by uuid null references public.profiles(id) on delete restrict,
  supersedes_request_id uuid null references public.project_intake_requests(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_intake_decision_consistency check (
    (state = 'approved' and decision = 'approved' and decided_at is not null and created_project_id is not null)
    or (state = 'rejected' and decision = 'rejected' and decided_at is not null and created_project_id is null)
    or (state = 'amendment_requested' and decision = 'amendment_requested' and reviewed_at is not null and decided_at is null and created_project_id is null)
    or (state in ('submitted', 'awaiting_review', 'withdrawn') and decision is null and decided_at is null and created_project_id is null)
  ),
  constraint project_intake_withdrawal_consistency check (
    (state = 'withdrawn' and withdrawn_at is not null and withdrawn_by is not null)
    or (state <> 'withdrawn' and withdrawn_at is null and withdrawn_by is null)
  ),
  constraint project_intake_no_self_supersede check (supersedes_request_id is distinct from id)
);

create table public.project_intake_events (
  id uuid primary key default gen_random_uuid(),
  intake_request_id uuid not null references public.project_intake_requests(id) on delete restrict,
  event_type text not null check (event_type in (
    'submitted',
    'queued_for_review',
    'amendment_requested',
    'amended',
    'resubmitted',
    'approved',
    'rejected',
    'withdrawn',
    'project_created'
  )),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_state text null check (from_state is null or from_state in (
    'submitted', 'awaiting_review', 'amendment_requested', 'approved', 'rejected', 'withdrawn'
  )),
  to_state text not null check (to_state in (
    'submitted', 'awaiting_review', 'amendment_requested', 'approved', 'rejected', 'withdrawn'
  )),
  round_number integer not null check (round_number > 0),
  event_notes text null check (event_notes is null or char_length(event_notes) <= 5000),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb null check (new_snapshot is null or jsonb_typeof(new_snapshot) = 'object'),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- One active intake per requester per proposed project name (case-insensitive)
-- gives duplicate-submission protection without inventing a project key.
create unique index project_intake_one_active_per_requester_name
  on public.project_intake_requests (requester_id, lower(proposed_values->>'project_name'))
  where state in ('submitted', 'awaiting_review', 'amendment_requested');

create index project_intake_requester_requested_idx
  on public.project_intake_requests (requester_id, requested_at desc);
create index project_intake_state_requested_idx
  on public.project_intake_requests (state, requested_at desc);
create index project_intake_events_request_occurred_idx
  on public.project_intake_events (intake_request_id, occurred_at asc, id asc);

alter table public.project_intake_requests enable row level security;
alter table public.project_intake_events enable row level security;

-- Owner sees all intakes; a manager sees ONLY their own. No staff/viewer access.
create policy "project_intake_requests_select_owner_or_requester"
on public.project_intake_requests
for select
to authenticated
using (public.is_owner() or requester_id = auth.uid());

create policy "project_intake_events_select_owner_or_requester"
on public.project_intake_events
for select
to authenticated
using (
  exists (
    select 1 from public.project_intake_requests intake
    where intake.id = intake_request_id
      and (public.is_owner() or intake.requester_id = auth.uid())
  )
);

-- No direct INSERT/UPDATE/DELETE policies: all workflow mutation flows through
-- the narrow SECURITY DEFINER functions below.

-- =====================================================================
-- 7. Intake workflow functions.
-- =====================================================================
-- Allowlist + validation for a project-intake proposal payload.
create or replace function public.private_validate_project_intake(proposed jsonb)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  allow text[] := array[
    'project_name', 'project_type', 'client_site_name', 'location', 'county',
    'notes', 'start_date', 'target_completion_date'
  ]::text[];
  k text;
  v jsonb;
  text_value text;
  start_d date;
  target_d date;
begin
  if jsonb_typeof(proposed) <> 'object' then
    raise exception 'intake proposal must be a JSON object' using errcode = 'check_violation';
  end if;
  if not (proposed ? 'project_name') or jsonb_typeof(proposed->'project_name') <> 'string'
     or char_length(trim(proposed->>'project_name')) = 0
     or char_length(proposed->>'project_name') > 160 then
    raise exception 'intake requires a non-empty project_name (<= 160 chars)' using errcode = 'check_violation';
  end if;
  if not (proposed ? 'project_type') or jsonb_typeof(proposed->'project_type') <> 'string'
     or (proposed->>'project_type') not in (
       'Residential', 'Estate', 'Hospitality', 'Institutional', 'Commercial',
       'Public Realm', 'Design Concept', 'Maintenance', 'Other'
     ) then
    raise exception 'intake requires a valid project_type' using errcode = 'check_violation';
  end if;

  for k in select jsonb_object_keys(proposed) loop
    if not (k = any(allow)) then
      raise exception 'field "%" is not a permitted intake field', k using errcode = 'check_violation';
    end if;
    v := proposed -> k;
    text_value := v #>> '{}';
    case k
      when 'client_site_name' then
        if jsonb_typeof(v) not in ('string', 'null') then raise exception 'client_site_name must be a string or null' using errcode = 'check_violation'; end if;
        if jsonb_typeof(v) = 'string' and char_length(text_value) > 160 then raise exception 'client_site_name exceeds 160 characters' using errcode = 'check_violation'; end if;
      when 'location' then
        if jsonb_typeof(v) not in ('string', 'null') then raise exception 'location must be a string or null' using errcode = 'check_violation'; end if;
        if jsonb_typeof(v) = 'string' and char_length(text_value) > 120 then raise exception 'location exceeds 120 characters' using errcode = 'check_violation'; end if;
      when 'county' then
        if jsonb_typeof(v) not in ('string', 'null') then raise exception 'county must be a string or null' using errcode = 'check_violation'; end if;
        if jsonb_typeof(v) = 'string' and char_length(text_value) > 80 then raise exception 'county exceeds 80 characters' using errcode = 'check_violation'; end if;
      when 'notes' then
        if jsonb_typeof(v) not in ('string', 'null') then raise exception 'notes must be a string or null' using errcode = 'check_violation'; end if;
        if jsonb_typeof(v) = 'string' and char_length(text_value) > 5000 then raise exception 'notes exceeds 5000 characters' using errcode = 'check_violation'; end if;
      when 'start_date' then
        if jsonb_typeof(v) = 'string' then perform public.private_iso_date(v);
        elsif jsonb_typeof(v) <> 'null' then raise exception 'start_date must be a date string or null' using errcode = 'check_violation'; end if;
      when 'target_completion_date' then
        if jsonb_typeof(v) = 'string' then perform public.private_iso_date(v);
        elsif jsonb_typeof(v) <> 'null' then raise exception 'target_completion_date must be a date string or null' using errcode = 'check_violation'; end if;
      else null;
    end case;
  end loop;

  -- When both planning dates are present a target must not precede the start.
  if jsonb_typeof(proposed->'start_date') = 'string'
     and jsonb_typeof(proposed->'target_completion_date') = 'string' then
    start_d := public.private_iso_date(proposed->'start_date');
    target_d := public.private_iso_date(proposed->'target_completion_date');
    if target_d < start_d then
      raise exception 'target completion cannot precede planned start' using errcode = 'check_violation';
    end if;
  end if;
end;
$$;

create or replace function public.submit_project_intake(
  target_proposed_values jsonb,
  target_reason text,
  target_requester_notes text default null,
  target_supersedes_request_id uuid default null
)
returns public.project_intake_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.private_active_approval_role();
  intake public.project_intake_requests;
begin
  if caller_role is null or caller_role not in ('owner', 'manager') then
    raise exception 'only an active owner or manager may submit a project intake' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required' using errcode = 'check_violation';
  end if;

  perform public.private_validate_project_intake(target_proposed_values);

  if target_supersedes_request_id is not null and not exists (
    select 1 from public.project_intake_requests prior
    where prior.id = target_supersedes_request_id
      and prior.requester_id = auth.uid()
      and prior.state in ('rejected', 'withdrawn')
  ) then
    raise exception 'superseded intake is not an eligible terminal request' using errcode = 'check_violation';
  end if;

  insert into public.project_intake_requests (
    requester_id, approver_role, state, request_round, proposed_values, reason,
    requester_notes, requested_at, supersedes_request_id, created_by, updated_by
  ) values (
    auth.uid(), 'owner', 'submitted', 1, target_proposed_values, trim(target_reason),
    nullif(trim(target_requester_notes), ''), now(), target_supersedes_request_id,
    auth.uid(), auth.uid()
  ) returning * into intake;

  insert into public.project_intake_events (
    intake_request_id, event_type, actor_id, from_state, to_state, round_number,
    event_notes, new_snapshot
  ) values (
    intake.id, 'submitted', auth.uid(), null, 'submitted', 1,
    nullif(trim(target_requester_notes), ''),
    jsonb_build_object('proposed_values', target_proposed_values, 'reason', trim(target_reason))
  );

  update public.project_intake_requests
  set state = 'awaiting_review', updated_by = auth.uid(), updated_at = now()
  where id = intake.id returning * into intake;

  insert into public.project_intake_events (
    intake_request_id, event_type, actor_id, from_state, to_state, round_number
  ) values (
    intake.id, 'queued_for_review', auth.uid(), 'submitted', 'awaiting_review', 1
  );

  return intake;
end;
$$;

create or replace function public.withdraw_project_intake(
  target_intake_request_id uuid,
  target_notes text default null
)
returns public.project_intake_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  intake public.project_intake_requests;
  prior_state text;
begin
  if public.private_active_approval_role() is null
     or public.private_active_approval_role() not in ('owner', 'manager') then
    raise exception 'active approval access is required' using errcode = 'insufficient_privilege';
  end if;
  select * into intake from public.project_intake_requests
  where id = target_intake_request_id for update;
  if not found then raise exception 'project intake not found' using errcode = 'no_data_found'; end if;
  if intake.requester_id <> auth.uid() then
    raise exception 'only the original requester may withdraw this intake' using errcode = 'insufficient_privilege';
  end if;
  if intake.state not in ('submitted', 'awaiting_review', 'amendment_requested') then
    raise exception 'project intake can no longer be withdrawn' using errcode = 'check_violation';
  end if;
  prior_state := intake.state;

  update public.project_intake_requests
  set state = 'withdrawn', decision = null, decision_notes = null,
      withdrawn_at = now(), withdrawn_by = auth.uid(),
      updated_by = auth.uid(), updated_at = now()
  where id = intake.id returning * into intake;

  insert into public.project_intake_events (
    intake_request_id, event_type, actor_id, from_state, to_state, round_number, event_notes
  ) values (
    intake.id, 'withdrawn', auth.uid(), prior_state, 'withdrawn', intake.request_round,
    nullif(trim(target_notes), '')
  );
  return intake;
end;
$$;

create or replace function public.request_project_intake_amendment(
  target_intake_request_id uuid,
  target_decision_notes text
)
returns public.project_intake_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  intake public.project_intake_requests;
begin
  if public.private_active_approval_role() is distinct from 'owner' then
    raise exception 'only an active owner may review project intakes' using errcode = 'insufficient_privilege';
  end if;
  if target_decision_notes is null or char_length(trim(target_decision_notes)) = 0 then
    raise exception 'amendment notes are required' using errcode = 'check_violation';
  end if;
  select * into intake from public.project_intake_requests
  where id = target_intake_request_id for update;
  if not found then raise exception 'project intake not found' using errcode = 'no_data_found'; end if;
  if intake.state <> 'awaiting_review' then
    raise exception 'only an awaiting-review intake can be amended' using errcode = 'check_violation';
  end if;

  update public.project_intake_requests
  set state = 'amendment_requested', decision = 'amendment_requested',
      decision_notes = trim(target_decision_notes), reviewed_at = now(),
      updated_by = auth.uid(), updated_at = now()
  where id = intake.id returning * into intake;

  insert into public.project_intake_events (
    intake_request_id, event_type, actor_id, from_state, to_state, round_number, event_notes
  ) values (
    intake.id, 'amendment_requested', auth.uid(), 'awaiting_review',
    'amendment_requested', intake.request_round, trim(target_decision_notes)
  );
  return intake;
end;
$$;

create or replace function public.amend_and_resubmit_project_intake(
  target_intake_request_id uuid,
  target_proposed_values jsonb,
  target_reason text,
  target_requester_notes text default null
)
returns public.project_intake_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  intake public.project_intake_requests;
  previous_request jsonb;
begin
  if public.private_active_approval_role() is null
     or public.private_active_approval_role() not in ('owner', 'manager') then
    raise exception 'active approval access is required' using errcode = 'insufficient_privilege';
  end if;
  if target_reason is null or char_length(trim(target_reason)) = 0 then
    raise exception 'a reason is required' using errcode = 'check_violation';
  end if;
  select * into intake from public.project_intake_requests
  where id = target_intake_request_id for update;
  if not found then raise exception 'project intake not found' using errcode = 'no_data_found'; end if;
  if intake.requester_id <> auth.uid() then
    raise exception 'only the original requester may amend this intake' using errcode = 'insufficient_privilege';
  end if;
  if intake.state <> 'amendment_requested' then
    raise exception 'only an amendment-requested intake may be resubmitted' using errcode = 'check_violation';
  end if;

  perform public.private_validate_project_intake(target_proposed_values);
  previous_request := jsonb_build_object(
    'round', intake.request_round,
    'proposed_values', intake.proposed_values,
    'reason', intake.reason,
    'requester_notes', intake.requester_notes,
    'decision_notes', intake.decision_notes
  );

  update public.project_intake_requests
  set state = 'awaiting_review', request_round = request_round + 1,
      proposed_values = target_proposed_values, reason = trim(target_reason),
      requester_notes = nullif(trim(target_requester_notes), ''),
      decision = null, decision_notes = null, reviewed_at = null,
      requested_at = now(), updated_by = auth.uid(), updated_at = now()
  where id = intake.id returning * into intake;

  insert into public.project_intake_events (
    intake_request_id, event_type, actor_id, from_state, to_state, round_number,
    event_notes, previous_snapshot, new_snapshot
  ) values (
    intake.id, 'amended', auth.uid(), 'amendment_requested', 'amendment_requested',
    intake.request_round, nullif(trim(target_requester_notes), ''), previous_request,
    jsonb_build_object('round', intake.request_round, 'proposed_values', intake.proposed_values, 'reason', intake.reason)
  );
  insert into public.project_intake_events (
    intake_request_id, event_type, actor_id, from_state, to_state, round_number
  ) values (
    intake.id, 'resubmitted', auth.uid(), 'amendment_requested', 'awaiting_review', intake.request_round
  );
  return intake;
end;
$$;

create or replace function public.decide_project_intake(
  target_intake_request_id uuid,
  target_decision text,
  target_decision_notes text default null
)
returns public.project_intake_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  intake public.project_intake_requests;
  proposed jsonb;
  new_project public.projects;
begin
  if public.private_active_approval_role() is distinct from 'owner' then
    raise exception 'only an active owner may decide project intakes' using errcode = 'insufficient_privilege';
  end if;
  if target_decision is null or target_decision not in ('approved', 'rejected') then
    raise exception 'decision must be approved or rejected' using errcode = 'check_violation';
  end if;
  select * into intake from public.project_intake_requests
  where id = target_intake_request_id for update;
  if not found then raise exception 'project intake not found' using errcode = 'no_data_found'; end if;
  if intake.state <> 'awaiting_review' then
    raise exception 'only an awaiting-review intake can be decided' using errcode = 'check_violation';
  end if;

  if target_decision = 'approved' then
    proposed := intake.proposed_values;
    perform public.private_validate_project_intake(proposed);

    -- Atomic creation of the live project in the safe intake default state:
    -- Pending / Inquiry, unassigned lead (the manager gains no authority by
    -- proposing himself), owner-reserved portfolio default. Runs as the owner,
    -- so the owner-only INSERT policy and material-authority guard pass.
    insert into public.projects (
      project_name, client_site_name, location, county, project_type,
      status, stage, lead_person_id, start_date, target_completion_date, notes,
      portfolio_eligible, portfolio_permission_status, archived
    ) values (
      proposed->>'project_name',
      proposed->>'client_site_name',
      proposed->>'location',
      proposed->>'county',
      proposed->>'project_type',
      'Pending', 'Inquiry', null,
      case when proposed ? 'start_date' then (proposed->>'start_date')::date else null end,
      case when proposed ? 'target_completion_date' then (proposed->>'target_completion_date')::date else null end,
      proposed->>'notes',
      false, 'Not Reviewed', false
    ) returning * into new_project;

    update public.project_intake_requests
    set state = 'approved', decision = 'approved',
        decision_notes = nullif(trim(target_decision_notes), ''),
        created_project_id = new_project.id,
        reviewed_at = now(), decided_at = now(),
        updated_by = auth.uid(), updated_at = now()
    where id = intake.id returning * into intake;

    insert into public.project_intake_events (
      intake_request_id, event_type, actor_id, from_state, to_state, round_number, event_notes
    ) values (
      intake.id, 'approved', auth.uid(), 'awaiting_review', 'approved', intake.request_round,
      nullif(trim(target_decision_notes), '')
    );
    insert into public.project_intake_events (
      intake_request_id, event_type, actor_id, from_state, to_state, round_number, event_notes, new_snapshot
    ) values (
      intake.id, 'project_created', auth.uid(), 'approved', 'approved', intake.request_round,
      'Approved intake created the live project atomically.',
      jsonb_build_object('created_project_id', new_project.id)
    );
  else
    update public.project_intake_requests
    set state = 'rejected', decision = 'rejected',
        decision_notes = nullif(trim(target_decision_notes), ''),
        reviewed_at = now(), decided_at = now(),
        updated_by = auth.uid(), updated_at = now()
    where id = intake.id returning * into intake;

    insert into public.project_intake_events (
      intake_request_id, event_type, actor_id, from_state, to_state, round_number, event_notes
    ) values (
      intake.id, 'rejected', auth.uid(), 'awaiting_review', 'rejected', intake.request_round,
      nullif(trim(target_decision_notes), '')
    );
  end if;

  return intake;
end;
$$;

-- =====================================================================
-- 8. Privilege hardening.
-- =====================================================================
revoke all on public.project_intake_requests from anon;
revoke all on public.project_intake_events from anon;
revoke insert, update, delete on public.project_intake_requests from authenticated;
revoke insert, update, delete on public.project_intake_events from authenticated;

revoke execute on function public.private_project_material_allowlist() from public, anon, authenticated;
revoke execute on function public.private_project_material_original(public.projects, jsonb) from public, anon, authenticated;
revoke execute on function public.private_validate_project_material_change(public.projects, jsonb, jsonb) from public, anon, authenticated;
revoke execute on function public.private_apply_project_material_change(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.private_manager_project_scope(uuid) from public, anon;
grant execute on function public.private_manager_project_scope(uuid) to authenticated;
revoke execute on function public.private_validate_project_intake(jsonb) from public, anon, authenticated;

revoke execute on function public.submit_project_intake(jsonb, text, text, uuid) from public, anon;
revoke execute on function public.withdraw_project_intake(uuid, text) from public, anon;
revoke execute on function public.request_project_intake_amendment(uuid, text) from public, anon;
revoke execute on function public.amend_and_resubmit_project_intake(uuid, jsonb, text, text) from public, anon;
revoke execute on function public.decide_project_intake(uuid, text, text) from public, anon;

grant execute on function public.submit_project_intake(jsonb, text, text, uuid) to authenticated;
grant execute on function public.withdraw_project_intake(uuid, text) to authenticated;
grant execute on function public.request_project_intake_amendment(uuid, text) to authenticated;
grant execute on function public.amend_and_resubmit_project_intake(uuid, jsonb, text, text) to authenticated;
grant execute on function public.decide_project_intake(uuid, text, text) to authenticated;

-- =====================================================================
-- 9. Authority correction: project status is NOT a low-risk direct field.
-- ---------------------------------------------------------------------
-- The interim Phase 1B-A1 boundary allowed a manager to directly toggle an
-- active project between Ongoing and Paused. That is now revoked: a status
-- change affects active/paused counts, Dashboard reporting, Daily Site
-- compliance expectations and staffing/attention, so it must be Principal-
-- approved. Ongoing<->Paused is routed through project_material_change (see the
-- status branch of private_validate_project_material_change above); the five
-- dedicated lifecycle types (activation, completion, cancellation, archive,
-- restore) and the owner-only Design-only classification are unchanged. This
-- CREATE OR REPLACE preserves every other clause of the interim guard verbatim
-- and only tightens the status branch to reject ALL manager status changes.
-- =====================================================================
create or replace function public.tg_guard_project_material_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.current_user_role();
begin
  if caller_role is distinct from 'manager' then
    return new;
  end if;

  if (tg_op = 'INSERT') then
    if new.status <> 'Pending'
       or new.archived is true
       or new.stage in ('Completed', 'Archived')
       or new.actual_completion_date is not null
       or new.portfolio_eligible is true
       or new.portfolio_permission_status <> 'Not Reviewed' then
      raise exception
        'manager may only create a Pending, non-archived project at a non-Completed/Archived stage with portfolio state Not Reviewed; owner approval is required to activate, complete, cancel, classify Design-only, archive or set portfolio publication'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;

  -- Status is now Principal-approved for a manager in ALL directions: the
  -- Ongoing<->Paused transition is a project_material_change proposal and every
  -- other status change remains owner-reserved. A manager direct status write
  -- is zero.
  if new.status is distinct from old.status then
    raise exception
      'manager may not directly change project status; Ongoing<->Paused is a project_material_change proposal and activation, completion, cancellation and Design-only remain owner-reserved'
      using errcode = 'check_violation';
  end if;

  if new.stage is distinct from old.stage
     and (old.stage in ('Completed', 'Archived') or new.stage in ('Completed', 'Archived')) then
    raise exception 'manager may not set or reverse a Completed or Archived project stage; this is owner-only'
      using errcode = 'check_violation';
  end if;

  if new.archived is distinct from old.archived then
    raise exception 'manager may not archive or restore a project; this is owner-only'
      using errcode = 'check_violation';
  end if;

  if new.portfolio_eligible is distinct from old.portfolio_eligible then
    raise exception 'manager may not change portfolio_eligible; portfolio publication is owner-only'
      using errcode = 'check_violation';
  end if;

  if new.portfolio_permission_status is distinct from old.portfolio_permission_status then
    raise exception 'manager may not change portfolio_permission_status; portfolio publication is owner-only'
      using errcode = 'check_violation';
  end if;

  if new.target_completion_date is distinct from old.target_completion_date then
    raise exception 'manager may not set or revise target_completion_date after creation; this is owner-only until the Phase 1B-A4 proposal mechanism'
      using errcode = 'check_violation';
  end if;

  if new.actual_completion_date is distinct from old.actual_completion_date then
    raise exception 'manager may not set or change actual_completion_date; this is owner-only'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

-- =====================================================================
-- 10. Authority correction: Daily Site Entry eligibility != project access.
-- ---------------------------------------------------------------------
-- Project read/edit/proposal authority (lead/assignment) is NOT the same as
-- Daily Site Entry eligibility. A completed/cancelled/archived/design-only
-- project may remain visible in Projects and historical Daily Site records but
-- must not be a target for a NEW Daily Site Entry. This aligns the selector +
-- the create path with the migration's own documented intent ("operationally-
-- active projects") and with daily_site_morning_compliance's operational scope.
-- The eligibility gate does NOT touch can_manage_daily_site_project (which still
-- governs READ of existing entries and history for completed projects), does not
-- alter accepted/void/supersede correction workflows, and never mutates
-- projects.status. Pending, Ongoing and Paused remain eligible for a new entry
-- (a paused or newly-mobilising site may still record a no-work or working day);
-- a stricter Ongoing-only rule is intentionally NOT imposed without evidence.
-- =====================================================================
create or replace function public.private_daily_site_project_eligible(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.archived is false
      and p.status not in ('Completed', 'Cancelled', 'Design-only')
  )
$$;

revoke execute on function public.private_daily_site_project_eligible(uuid) from public, anon;
grant execute on function public.private_daily_site_project_eligible(uuid) to authenticated;

-- Selector now returns only authorised AND operationally-eligible projects.
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
    and p.archived is false
    and p.status not in ('Completed', 'Cancelled', 'Design-only')
  order by p.project_name asc
$$;

-- Create-draft now enforces operational eligibility in-transaction so the
-- database — not just the selector — refuses a NEW entry for an ineligible
-- project. Every other clause is preserved verbatim from the daily-site
-- foundation definition.
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
  -- Operational eligibility: a completed/cancelled/archived/design-only project
  -- may keep its history but must not receive a NEW Daily Site Entry.
  if not public.private_daily_site_project_eligible(project.id) then
    raise exception 'project is not operationally eligible for a new Daily Site Entry (completed, cancelled, archived or design-only projects are excluded)' using errcode = 'check_violation';
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
