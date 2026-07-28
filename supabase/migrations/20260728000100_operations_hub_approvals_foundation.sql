-- BD-OPERATIONS-HUB-01 — Approvals Foundation, first project-linked slice.
-- Additive and forward-only. This migration creates no finance, labour,
-- expenditure, document, notification or public-site domain.

create table public.approval_requests (
  id uuid primary key default gen_random_uuid(),
  approval_domain text not null check (approval_domain = 'project'),
  approval_type text not null check (approval_type in (
    'project_activation',
    'project_target_completion_change',
    'project_completion',
    'project_cancellation',
    'project_archive',
    'project_restore'
  )),
  project_id uuid not null references public.projects(id) on delete restrict,
  subject_record_id uuid null,
  requester_id uuid not null references public.profiles(id) on delete restrict,
  approver_role text not null default 'owner' check (approver_role = 'owner'),
  assigned_approver_id uuid null references public.profiles(id) on delete set null,
  state text not null check (state in (
    'submitted',
    'awaiting_review',
    'amendment_requested',
    'approved',
    'rejected',
    'withdrawn'
  )),
  request_round integer not null default 1 check (request_round > 0),
  original_values jsonb not null check (jsonb_typeof(original_values) = 'object'),
  proposed_values jsonb not null check (jsonb_typeof(proposed_values) = 'object'),
  reason text not null check (char_length(trim(reason)) between 1 and 2000),
  requester_notes text null check (requester_notes is null or char_length(requester_notes) <= 5000),
  decision text null check (decision is null or decision in (
    'approved', 'rejected', 'amendment_requested'
  )),
  decision_notes text null check (decision_notes is null or char_length(decision_notes) <= 5000),
  requested_at timestamptz not null default now(),
  reviewed_at timestamptz null,
  decided_at timestamptz null,
  withdrawn_at timestamptz null,
  withdrawn_by uuid null references public.profiles(id) on delete restrict,
  supersedes_request_id uuid null references public.approval_requests(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint approval_requests_subject_reserved check (subject_record_id is null),
  constraint approval_requests_decision_consistency check (
    (state = 'approved' and decision = 'approved' and decided_at is not null)
    or (state = 'rejected' and decision = 'rejected' and decided_at is not null)
    or (state = 'amendment_requested' and decision = 'amendment_requested' and reviewed_at is not null and decided_at is null)
    or (state in ('submitted', 'awaiting_review', 'withdrawn') and decision is null and decided_at is null)
  ),
  constraint approval_requests_withdrawal_consistency check (
    (state = 'withdrawn' and withdrawn_at is not null and withdrawn_by is not null)
    or (state <> 'withdrawn' and withdrawn_at is null and withdrawn_by is null)
  ),
  constraint approval_requests_no_self_supersede check (supersedes_request_id is distinct from id)
);

create table public.approval_events (
  id uuid primary key default gen_random_uuid(),
  approval_request_id uuid not null references public.approval_requests(id) on delete restrict,
  event_type text not null check (event_type in (
    'submitted',
    'queued_for_review',
    'amendment_requested',
    'amended',
    'resubmitted',
    'approved',
    'rejected',
    'withdrawn',
    'project_change_applied'
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

create unique index approval_requests_one_active_type_per_project
  on public.approval_requests (project_id, approval_type)
  where state in ('submitted', 'awaiting_review', 'amendment_requested');

create index approval_requests_project_requested_idx
  on public.approval_requests (project_id, requested_at desc);
create index approval_requests_state_requested_idx
  on public.approval_requests (state, requested_at desc);
create index approval_events_request_occurred_idx
  on public.approval_events (approval_request_id, occurred_at asc, id asc);

alter table public.approval_requests enable row level security;
alter table public.approval_events enable row level security;

create policy "approval_requests_select_owner_manager"
on public.approval_requests
for select
to authenticated
using (public.is_owner() or public.is_manager());

create policy "approval_events_select_owner_manager"
on public.approval_events
for select
to authenticated
using (
  exists (
    select 1
    from public.approval_requests request
    where request.id = approval_request_id
      and (public.is_owner() or public.is_manager())
  )
);

-- No direct INSERT, UPDATE or DELETE policies exist on either approvals table.
-- All workflow mutation is performed through the narrow functions below.

create or replace function public.private_active_approval_role()
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

create or replace function public.private_json_keys_match(payload jsonb, expected text[])
returns boolean
language sql
immutable
security definer
set search_path = public
as $$
  select jsonb_typeof(payload) = 'object'
    and coalesce(
      (select array_agg(key order by key) from jsonb_object_keys(payload) key),
      array[]::text[]
    ) = (
      select array_agg(key order by key) from unnest(expected) key
    )
$$;

create or replace function public.private_iso_date(value jsonb)
returns date
language plpgsql
immutable
security definer
set search_path = public
as $$
declare
  text_value text;
  parsed date;
begin
  if jsonb_typeof(value) <> 'string' then
    raise exception 'approval date must be a YYYY-MM-DD string' using errcode = 'check_violation';
  end if;
  text_value := value #>> '{}';
  if text_value !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'approval date must be a YYYY-MM-DD string' using errcode = 'check_violation';
  end if;
  parsed := text_value::date;
  if to_char(parsed, 'YYYY-MM-DD') <> text_value then
    raise exception 'approval date is invalid' using errcode = 'check_violation';
  end if;
  return parsed;
exception
  when datetime_field_overflow or invalid_datetime_format then
    raise exception 'approval date is invalid' using errcode = 'check_violation';
end;
$$;

create or replace function public.private_project_approval_original(
  target_type text,
  project public.projects
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  case target_type
    when 'project_activation' then
      return jsonb_build_object('status', project.status);
    when 'project_target_completion_change' then
      return jsonb_build_object('target_completion_date', to_jsonb(project.target_completion_date));
    when 'project_completion' then
      return jsonb_build_object(
        'status', project.status,
        'actual_completion_date', to_jsonb(project.actual_completion_date)
      );
    when 'project_cancellation' then
      return jsonb_build_object('status', project.status);
    when 'project_archive' then
      return jsonb_build_object('archived', project.archived);
    when 'project_restore' then
      return jsonb_build_object('archived', project.archived);
    else
      raise exception 'unsupported project approval type' using errcode = 'check_violation';
  end case;
end;
$$;

create or replace function public.private_validate_project_approval(
  target_type text,
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
  proposed_date date;
begin
  if target_type not in (
    'project_activation',
    'project_target_completion_change',
    'project_completion',
    'project_cancellation',
    'project_archive',
    'project_restore'
  ) then
    raise exception 'unsupported project approval type' using errcode = 'check_violation';
  end if;

  if original <> public.private_project_approval_original(target_type, project) then
    raise exception 'approval request is stale; the project has changed' using errcode = 'serialization_failure';
  end if;
  if original = proposed then
    raise exception 'proposed values must differ from current values' using errcode = 'check_violation';
  end if;

  case target_type
    when 'project_activation' then
      if not public.private_json_keys_match(original, array['status'])
         or not public.private_json_keys_match(proposed, array['status'])
         or jsonb_typeof(original->'status') <> 'string'
         or jsonb_typeof(proposed->'status') <> 'string'
         or original->>'status' <> 'Pending'
         or proposed->>'status' <> 'Ongoing'
         or project.archived then
        raise exception 'invalid project activation proposal' using errcode = 'check_violation';
      end if;

    when 'project_target_completion_change' then
      if not public.private_json_keys_match(original, array['target_completion_date'])
         or not public.private_json_keys_match(proposed, array['target_completion_date']) then
        raise exception 'invalid target completion proposal fields' using errcode = 'check_violation';
      end if;
      proposed_date := public.private_iso_date(proposed->'target_completion_date');
      if project.start_date is not null and proposed_date < project.start_date then
        raise exception 'target completion cannot precede planned start' using errcode = 'check_violation';
      end if;

    when 'project_completion' then
      if not public.private_json_keys_match(original, array['status','actual_completion_date'])
         or not public.private_json_keys_match(proposed, array['status','actual_completion_date'])
         or jsonb_typeof(original->'status') <> 'string'
         or jsonb_typeof(proposed->'status') <> 'string'
         or original->>'status' in ('Completed', 'Cancelled')
         or proposed->>'status' <> 'Completed'
         or original->'actual_completion_date' <> 'null'::jsonb
         or project.archived then
        raise exception 'invalid project completion proposal' using errcode = 'check_violation';
      end if;
      proposed_date := public.private_iso_date(proposed->'actual_completion_date');
      if project.actual_start_date is not null and proposed_date < project.actual_start_date then
        raise exception 'actual completion cannot precede actual start' using errcode = 'check_violation';
      end if;

    when 'project_cancellation' then
      if not public.private_json_keys_match(original, array['status'])
         or not public.private_json_keys_match(proposed, array['status'])
         or jsonb_typeof(original->'status') <> 'string'
         or jsonb_typeof(proposed->'status') <> 'string'
         or original->>'status' in ('Completed', 'Cancelled')
         or proposed->>'status' <> 'Cancelled'
         or project.archived then
        raise exception 'invalid project cancellation proposal' using errcode = 'check_violation';
      end if;

    when 'project_archive' then
      if not public.private_json_keys_match(original, array['archived'])
         or not public.private_json_keys_match(proposed, array['archived'])
         or jsonb_typeof(original->'archived') <> 'boolean'
         or jsonb_typeof(proposed->'archived') <> 'boolean'
         or (original->>'archived')::boolean is not false
         or (proposed->>'archived')::boolean is not true then
        raise exception 'invalid project archive proposal' using errcode = 'check_violation';
      end if;

    when 'project_restore' then
      if not public.private_json_keys_match(original, array['archived'])
         or not public.private_json_keys_match(proposed, array['archived'])
         or jsonb_typeof(original->'archived') <> 'boolean'
         or jsonb_typeof(proposed->'archived') <> 'boolean'
         or (original->>'archived')::boolean is not true
         or (proposed->>'archived')::boolean is not false then
        raise exception 'invalid project restoration proposal' using errcode = 'check_violation';
      end if;
  end case;
end;
$$;

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

  if target_supersedes_request_id is not null and not exists (
    select 1 from public.approval_requests prior
    where prior.id = target_supersedes_request_id
      and prior.project_id = target_project_id
      and prior.approval_type = target_approval_type
      and prior.state in ('rejected', 'withdrawn')
  ) then
    raise exception 'superseded request is not an eligible terminal request' using errcode = 'check_violation';
  end if;

  original := public.private_project_approval_original(target_approval_type, project);
  perform public.private_validate_project_approval(
    target_approval_type, project, original, target_proposed_values
  );

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

create or replace function public.withdraw_approval_request(
  target_approval_request_id uuid,
  target_notes text default null
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.approval_requests;
  prior_state text;
begin
  if public.private_active_approval_role() is null
     or public.private_active_approval_role() not in ('owner', 'manager') then
    raise exception 'active approval access is required' using errcode = 'insufficient_privilege';
  end if;
  select * into request from public.approval_requests
  where id = target_approval_request_id for update;
  if not found then raise exception 'approval request not found' using errcode = 'no_data_found'; end if;
  if request.requester_id <> auth.uid() then
    raise exception 'only the original requester may withdraw this request' using errcode = 'insufficient_privilege';
  end if;
  if request.state not in ('submitted', 'awaiting_review', 'amendment_requested')
     or (request.state = 'awaiting_review' and request.reviewed_at is not null) then
    raise exception 'approval request can no longer be withdrawn' using errcode = 'check_violation';
  end if;
  prior_state := request.state;

  update public.approval_requests
  set state = 'withdrawn', decision = null, decision_notes = null,
      withdrawn_at = now(), withdrawn_by = auth.uid(),
      updated_by = auth.uid(), updated_at = now()
  where id = request.id returning * into request;

  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state,
    round_number, event_notes
  ) values (
    request.id, 'withdrawn', auth.uid(), prior_state,
    'withdrawn', request.request_round, nullif(trim(target_notes), '')
  );
  return request;
end;
$$;

create or replace function public.request_approval_amendment(
  target_approval_request_id uuid,
  target_decision_notes text
)
returns public.approval_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  request public.approval_requests;
begin
  if public.private_active_approval_role() is distinct from 'owner' then
    raise exception 'only an active owner may review approvals' using errcode = 'insufficient_privilege';
  end if;
  if target_decision_notes is null or char_length(trim(target_decision_notes)) = 0 then
    raise exception 'amendment notes are required' using errcode = 'check_violation';
  end if;
  select * into request from public.approval_requests
  where id = target_approval_request_id for update;
  if not found then raise exception 'approval request not found' using errcode = 'no_data_found'; end if;
  if request.state <> 'awaiting_review' then
    raise exception 'only an awaiting-review request can be amended' using errcode = 'check_violation';
  end if;

  update public.approval_requests
  set state = 'amendment_requested', decision = 'amendment_requested',
      decision_notes = trim(target_decision_notes), reviewed_at = now(),
      updated_by = auth.uid(), updated_at = now()
  where id = request.id returning * into request;

  insert into public.approval_events (
    approval_request_id, event_type, actor_id, from_state, to_state,
    round_number, event_notes
  ) values (
    request.id, 'amendment_requested', auth.uid(), 'awaiting_review',
    'amendment_requested', request.request_round, trim(target_decision_notes)
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
  current_original := public.private_project_approval_original(request.approval_type, project);
  perform public.private_validate_project_approval(
    request.approval_type, project, current_original, target_proposed_values
  );
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

revoke all on public.approval_requests from anon;
revoke all on public.approval_events from anon;
revoke insert, update, delete on public.approval_requests from authenticated;
revoke insert, update, delete on public.approval_events from authenticated;

revoke execute on function public.private_active_approval_role() from public, anon, authenticated;
revoke execute on function public.private_json_keys_match(jsonb, text[]) from public, anon, authenticated;
revoke execute on function public.private_iso_date(jsonb) from public, anon, authenticated;
revoke execute on function public.private_project_approval_original(text, public.projects) from public, anon, authenticated;
revoke execute on function public.private_validate_project_approval(text, public.projects, jsonb, jsonb) from public, anon, authenticated;

revoke execute on function public.submit_project_approval(uuid, text, jsonb, text, text, uuid) from public, anon;
revoke execute on function public.withdraw_approval_request(uuid, text) from public, anon;
revoke execute on function public.request_approval_amendment(uuid, text) from public, anon;
revoke execute on function public.amend_and_resubmit_approval(uuid, jsonb, text, text) from public, anon;
revoke execute on function public.decide_project_approval(uuid, text, text) from public, anon;

grant execute on function public.submit_project_approval(uuid, text, jsonb, text, text, uuid) to authenticated;
grant execute on function public.withdraw_approval_request(uuid, text) to authenticated;
grant execute on function public.request_approval_amendment(uuid, text) to authenticated;
grant execute on function public.amend_and_resubmit_approval(uuid, jsonb, text, text) to authenticated;
grant execute on function public.decide_project_approval(uuid, text, text) to authenticated;
