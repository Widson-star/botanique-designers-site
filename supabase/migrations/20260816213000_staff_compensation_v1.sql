-- BOTANIQUE DESIGNERS — Staff Compensation V1 lifecycle foundation.
--
-- Staff Compensation is a first-class Finance record anchored to a canonical
-- Person. A Project is optional context only: Project lifecycle, completion,
-- archive state, or engagement state never gates compensation creation,
-- amendment, submission, decision, withdrawal, or cancellation.
--
-- This migration intentionally does NOT add payments/reconciliation, migrate
-- historical Project Costs, classify LEM records, change Project status, or
-- redesign the wider Finance/Approvals modules.

create table public.staff_compensations (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  project_id uuid null references public.projects(id) on delete restrict,
  service_date date not null,
  compensation_type text not null check (compensation_type in (
    'compensation', 'allowance', 'bonus', 'other'
  )),
  currency text not null default 'KES' check (currency = 'KES'),
  description text not null check (
    char_length(trim(description)) between 1 and 2000
  ),
  lifecycle text not null default 'draft' check (lifecycle in (
    'draft', 'awaiting_review', 'amendment_requested', 'approved', 'rejected',
    'withdrawn', 'cancelled'
  )),
  request_round integer not null default 0 check (request_round >= 0),
  submitted_amount numeric(14,2) null check (submitted_amount is null or submitted_amount > 0),
  approved_amount numeric(14,2) null check (approved_amount is null or approved_amount > 0),
  requester_id uuid not null references public.profiles(id) on delete restrict,
  decider_id uuid null references public.profiles(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  decided_at timestamptz null,
  withdrawn_at timestamptz null,
  cancelled_at timestamptz null,
  constraint staff_compensation_decision_consistency check (
    (lifecycle = 'approved' and approved_amount is not null)
    or (lifecycle <> 'approved' and approved_amount is null)
  ),
  constraint staff_compensation_no_requester_self_decision check (
    decider_id is null or decider_id <> requester_id
  )
);

create table public.staff_compensation_events (
  id uuid primary key default gen_random_uuid(),
  compensation_id uuid not null references public.staff_compensations(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'amended', 'submitted', 'amendment_requested', 'resubmitted',
    'approved', 'rejected', 'withdrawn', 'cancelled'
  )),
  previous_lifecycle text null,
  next_lifecycle text not null,
  request_round integer not null check (request_round >= 0),
  compensation_snapshot jsonb not null check (jsonb_typeof(compensation_snapshot) = 'object'),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  occurred_at timestamptz not null default now()
);

create index staff_compensations_person_updated_idx
  on public.staff_compensations (person_id, updated_at desc);
create index staff_compensations_project_updated_idx
  on public.staff_compensations (project_id, updated_at desc)
  where project_id is not null;
create index staff_compensations_lifecycle_updated_idx
  on public.staff_compensations (lifecycle, updated_at desc);
create index staff_compensation_events_record_occurred_idx
  on public.staff_compensation_events (compensation_id, occurred_at asc, id asc);

alter table public.staff_compensations enable row level security;
alter table public.staff_compensation_events enable row level security;

create or replace function public.private_active_staff_compensation_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.role in ('owner', 'manager')
$$;

create or replace function public.can_access_staff_compensation()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.private_active_staff_compensation_role() is not null
$$;

create policy "staff_compensations_select_authorised"
on public.staff_compensations for select to authenticated
using (public.can_access_staff_compensation());

create policy "staff_compensation_events_select_authorised"
on public.staff_compensation_events for select to authenticated
using (public.can_access_staff_compensation());

create or replace function public.private_assert_staff_compensation_person(target_person_id uuid)
returns public.people
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_person public.people;
begin
  if public.private_active_staff_compensation_role() is null then
    raise exception 'Staff Compensation is available only to an authorised Finance operator'
      using errcode = '42501';
  end if;

  select * into target_person
  from public.people
  where id = target_person_id;

  if not found then
    raise exception 'Person not found' using errcode = 'P0002';
  end if;

  -- Do not require an active People record. Legitimate compensation may remain
  -- unsettled after a person leaves Botanique.
  return target_person;
end;
$$;

create or replace function public.private_assert_staff_compensation_project_context(target_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_project public.projects;
begin
  if target_project_id is null then
    return null;
  end if;

  select * into target_project
  from public.projects
  where id = target_project_id;

  if not found then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;

  -- Deliberately no Project-status or archived-state eligibility check here.
  -- The Project is context, not the compensation lifecycle authority.
  return target_project;
end;
$$;

create or replace function public.private_staff_compensation_snapshot(record public.staff_compensations)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', record.id,
    'person_id', record.person_id,
    'project_id', record.project_id,
    'service_date', record.service_date,
    'compensation_type', record.compensation_type,
    'currency', record.currency,
    'description', record.description,
    'lifecycle', record.lifecycle,
    'request_round', record.request_round,
    'submitted_amount', record.submitted_amount,
    'approved_amount', record.approved_amount,
    'requester_id', record.requester_id,
    'decider_id', record.decider_id,
    'version', record.version
  )
$$;

create or replace function public.private_append_staff_compensation_event(
  record public.staff_compensations,
  target_event_type text,
  target_previous_lifecycle text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.staff_compensation_events (
    compensation_id,
    actor_id,
    event_type,
    previous_lifecycle,
    next_lifecycle,
    request_round,
    compensation_snapshot,
    reason
  ) values (
    record.id,
    auth.uid(),
    target_event_type,
    target_previous_lifecycle,
    record.lifecycle,
    record.request_round,
    public.private_staff_compensation_snapshot(record),
    nullif(trim(target_reason), '')
  );
end;
$$;

create or replace function public.create_staff_compensation_draft(
  target_person_id uuid,
  target_project_id uuid,
  target_service_date date,
  target_compensation_type text,
  target_description text,
  target_amount numeric
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
begin
  if public.private_active_staff_compensation_role() is distinct from 'manager' then
    raise exception 'An authorised Finance operator is required to create Staff Compensation'
      using errcode = '42501';
  end if;

  perform public.private_assert_staff_compensation_person(target_person_id);
  perform public.private_assert_staff_compensation_project_context(target_project_id);

  if target_service_date is null then
    raise exception 'A compensation date is required' using errcode = '22023';
  end if;
  if target_service_date > current_date then
    raise exception 'The compensation date cannot be in the future' using errcode = '22023';
  end if;
  if target_compensation_type not in ('compensation', 'allowance', 'bonus', 'other') then
    raise exception 'Choose a valid compensation type' using errcode = '22023';
  end if;
  if nullif(trim(target_description), '') is null then
    raise exception 'A compensation description is required' using errcode = '22023';
  end if;
  if char_length(trim(target_description)) > 2000 then
    raise exception 'The compensation description must be 2000 characters or fewer' using errcode = '22023';
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'Compensation amount must be greater than zero' using errcode = '22023';
  end if;

  insert into public.staff_compensations (
    person_id,
    project_id,
    service_date,
    compensation_type,
    description,
    lifecycle,
    submitted_amount,
    requester_id
  ) values (
    target_person_id,
    target_project_id,
    target_service_date,
    target_compensation_type,
    trim(target_description),
    'draft',
    target_amount,
    auth.uid()
  ) returning * into record;

  perform public.private_append_staff_compensation_event(record, 'created', null, null);
  return record;
end;
$$;

create or replace function public.update_staff_compensation(
  target_compensation_id uuid,
  target_expected_version integer,
  target_person_id uuid,
  target_project_id uuid,
  target_service_date date,
  target_compensation_type text,
  target_description text,
  target_amount numeric
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
  prior_lifecycle text;
begin
  if public.private_active_staff_compensation_role() is distinct from 'manager' then
    raise exception 'An authorised Finance operator is required to amend Staff Compensation'
      using errcode = '42501';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if record.requester_id <> auth.uid() then
    raise exception 'Only the requester may amend this Staff Compensation record'
      using errcode = '42501';
  end if;
  if record.lifecycle not in ('draft', 'amendment_requested') then
    raise exception 'This Staff Compensation record can no longer be edited'
      using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Compensation version; refresh and try again'
      using errcode = '40001';
  end if;

  perform public.private_assert_staff_compensation_person(target_person_id);
  perform public.private_assert_staff_compensation_project_context(target_project_id);

  if target_service_date is null or target_service_date > current_date then
    raise exception 'Choose a valid compensation date that is not in the future'
      using errcode = '22023';
  end if;
  if target_compensation_type not in ('compensation', 'allowance', 'bonus', 'other') then
    raise exception 'Choose a valid compensation type' using errcode = '22023';
  end if;
  if nullif(trim(target_description), '') is null or char_length(trim(target_description)) > 2000 then
    raise exception 'Provide a compensation description of 2000 characters or fewer'
      using errcode = '22023';
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'Compensation amount must be greater than zero' using errcode = '22023';
  end if;

  prior_lifecycle := record.lifecycle;

  update public.staff_compensations
  set person_id = target_person_id,
      project_id = target_project_id,
      service_date = target_service_date,
      compensation_type = target_compensation_type,
      description = trim(target_description),
      submitted_amount = target_amount,
      version = version + 1,
      updated_at = now()
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(record, 'amended', prior_lifecycle, null);
  return record;
end;
$$;

create or replace function public.submit_staff_compensation(
  target_compensation_id uuid,
  target_expected_version integer
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
  prior_lifecycle text;
  next_event text;
begin
  if public.private_active_staff_compensation_role() is distinct from 'manager' then
    raise exception 'An authorised Finance operator is required to submit Staff Compensation'
      using errcode = '42501';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if record.requester_id <> auth.uid() then
    raise exception 'Only the requester may submit this Staff Compensation record'
      using errcode = '42501';
  end if;
  if record.lifecycle not in ('draft', 'amendment_requested') then
    raise exception 'This Staff Compensation record is not eligible for submission'
      using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Compensation version; refresh and try again'
      using errcode = '40001';
  end if;

  -- Re-assert canonical references, but deliberately do not inspect Project
  -- lifecycle. A Completed/archived Project remains valid context.
  perform public.private_assert_staff_compensation_person(record.person_id);
  perform public.private_assert_staff_compensation_project_context(record.project_id);

  prior_lifecycle := record.lifecycle;
  next_event := case when prior_lifecycle = 'draft' then 'submitted' else 'resubmitted' end;

  update public.staff_compensations
  set lifecycle = 'awaiting_review',
      request_round = request_round + 1,
      version = version + 1,
      updated_at = now(),
      submitted_at = now()
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(record, next_event, prior_lifecycle, null);
  return record;
end;
$$;

create or replace function public.decide_staff_compensation(
  target_compensation_id uuid,
  target_expected_version integer,
  target_decision text,
  target_reason text default null
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
  next_lifecycle text;
begin
  if public.private_active_staff_compensation_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to decide Staff Compensation'
      using errcode = '42501';
  end if;
  if target_decision not in ('approved', 'rejected', 'amendment_requested') then
    raise exception 'Unsupported Staff Compensation decision' using errcode = '22023';
  end if;
  if target_decision in ('rejected', 'amendment_requested')
     and nullif(trim(target_reason), '') is null then
    raise exception 'A reason is required for this decision' using errcode = '22023';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if record.requester_id = auth.uid() then
    raise exception 'A requester cannot decide their own Staff Compensation record'
      using errcode = '42501';
  end if;
  if record.lifecycle <> 'awaiting_review' then
    raise exception 'This Staff Compensation record is not awaiting a decision'
      using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Compensation version; refresh and try again'
      using errcode = '40001';
  end if;

  perform public.private_assert_staff_compensation_person(record.person_id);
  perform public.private_assert_staff_compensation_project_context(record.project_id);

  next_lifecycle := target_decision;

  update public.staff_compensations
  set lifecycle = next_lifecycle,
      approved_amount = case when next_lifecycle = 'approved' then submitted_amount else null end,
      decider_id = auth.uid(),
      version = version + 1,
      updated_at = now(),
      decided_at = case when next_lifecycle in ('approved', 'rejected') then now() else null end
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(
    record,
    target_decision,
    'awaiting_review',
    target_reason
  );
  return record;
end;
$$;

create or replace function public.withdraw_staff_compensation(
  target_compensation_id uuid,
  target_expected_version integer,
  target_reason text default null
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
  prior_lifecycle text;
begin
  if public.private_active_staff_compensation_role() is distinct from 'manager' then
    raise exception 'An authorised Finance operator is required to withdraw Staff Compensation'
      using errcode = '42501';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if record.requester_id <> auth.uid() then
    raise exception 'Only the requester may withdraw this Staff Compensation record'
      using errcode = '42501';
  end if;
  if record.lifecycle not in ('awaiting_review', 'amendment_requested') then
    raise exception 'This Staff Compensation record cannot be withdrawn now'
      using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Compensation version; refresh and try again'
      using errcode = '40001';
  end if;

  prior_lifecycle := record.lifecycle;

  update public.staff_compensations
  set lifecycle = 'withdrawn',
      approved_amount = null,
      version = version + 1,
      updated_at = now(),
      withdrawn_at = now()
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(record, 'withdrawn', prior_lifecycle, target_reason);
  return record;
end;
$$;

create or replace function public.cancel_staff_compensation(
  target_compensation_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
begin
  if public.private_active_staff_compensation_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to cancel Staff Compensation'
      using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A cancellation reason is required' using errcode = '22023';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if record.lifecycle <> 'approved' then
    raise exception 'Only an approved Staff Compensation record may be cancelled'
      using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Compensation version; refresh and try again'
      using errcode = '40001';
  end if;

  update public.staff_compensations
  set lifecycle = 'cancelled',
      approved_amount = null,
      version = version + 1,
      updated_at = now(),
      cancelled_at = now()
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(record, 'cancelled', 'approved', target_reason);
  return record;
end;
$$;

create or replace function public.private_reject_staff_compensation_event_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Staff Compensation events are immutable' using errcode = '42501';
end;
$$;

create trigger staff_compensation_events_immutable
before update or delete on public.staff_compensation_events
for each row execute function public.private_reject_staff_compensation_event_change();

revoke all on public.staff_compensations from anon, authenticated;
revoke all on public.staff_compensation_events from anon, authenticated;
grant select on public.staff_compensations, public.staff_compensation_events to authenticated;

revoke execute on function public.private_active_staff_compensation_role() from public, anon, authenticated;
revoke execute on function public.private_assert_staff_compensation_person(uuid) from public, anon, authenticated;
revoke execute on function public.private_assert_staff_compensation_project_context(uuid) from public, anon, authenticated;
revoke execute on function public.private_staff_compensation_snapshot(public.staff_compensations) from public, anon, authenticated;
revoke execute on function public.private_append_staff_compensation_event(public.staff_compensations, text, text, text) from public, anon, authenticated;
revoke execute on function public.private_reject_staff_compensation_event_change() from public, anon, authenticated;

revoke execute on function public.can_access_staff_compensation() from public, anon;
revoke execute on function public.create_staff_compensation_draft(uuid, uuid, date, text, text, numeric) from public, anon;
revoke execute on function public.update_staff_compensation(uuid, integer, uuid, uuid, date, text, text, numeric) from public, anon;
revoke execute on function public.submit_staff_compensation(uuid, integer) from public, anon;
revoke execute on function public.decide_staff_compensation(uuid, integer, text, text) from public, anon;
revoke execute on function public.withdraw_staff_compensation(uuid, integer, text) from public, anon;
revoke execute on function public.cancel_staff_compensation(uuid, integer, text) from public, anon;

grant execute on function public.can_access_staff_compensation() to authenticated;
grant execute on function public.create_staff_compensation_draft(uuid, uuid, date, text, text, numeric) to authenticated;
grant execute on function public.update_staff_compensation(uuid, integer, uuid, uuid, date, text, text, numeric) to authenticated;
grant execute on function public.submit_staff_compensation(uuid, integer) to authenticated;
grant execute on function public.decide_staff_compensation(uuid, integer, text, text) to authenticated;
grant execute on function public.withdraw_staff_compensation(uuid, integer, text) to authenticated;
grant execute on function public.cancel_staff_compensation(uuid, integer, text) to authenticated;
