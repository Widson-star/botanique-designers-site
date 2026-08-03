-- =====================================================================
-- BD-PEOPLE-01 lifecycle correction — immutable engagement history
-- Hosted migration version: 20260803194000
-- =====================================================================
-- Closed engagements remain historical records, but an accidental closure
-- must be correctable without manufacturing a replacement row. This migration
-- adds the missing immutable evidence and a Principal-only correction path.
-- It does not alter People identity, project authority, authentication,
-- project assignments, Finance, Labour or any non-People record.

-- ---------------------------------------------------------------------
-- 1. Append-only lifecycle ledger.
-- ---------------------------------------------------------------------
create table public.people_engagement_events (
  id uuid primary key default gen_random_uuid(),
  engagement_id uuid not null references public.people_engagements(id) on delete restrict,
  event_type text not null check (event_type in (
    'created',
    'updated',
    'ended',
    'corrected',
    'reopened'
  )),
  previous_snapshot jsonb null check (
    previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'
  ),
  new_snapshot jsonb not null check (jsonb_typeof(new_snapshot) = 'object'),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  correction_reason text null check (
    correction_reason is null or char_length(trim(correction_reason)) between 3 and 1000
  ),
  resulting_version integer not null check (resulting_version > 0),
  constraint people_engagement_event_reason_required check (
    event_type not in ('corrected', 'reopened') or correction_reason is not null
  )
);

create index people_engagement_events_engagement_occurred_idx
  on public.people_engagement_events (engagement_id, occurred_at, id);

alter table public.people_engagement_events enable row level security;

-- The ledger contains the complete before/after state of corrections. It is a
-- Principal audit source, not an operational edit surface. Application roles
-- receive SELECT only; no INSERT, UPDATE or DELETE privilege is granted.
create policy "people_engagement_events_select_principal"
  on public.people_engagement_events for select
  to authenticated
  using (public.is_owner());

revoke all on public.people_engagement_events from anon, authenticated;
grant select on public.people_engagement_events to authenticated;

-- Defence in depth: even a privileged maintenance path must deliberately
-- remove this guard before it can rewrite history. Normal application roles
-- already lack the table privileges and matching RLS policies.
create or replace function public.tg_people_engagement_events_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'People engagement events are immutable'
    using errcode = '55000';
end;
$$;

create trigger people_engagement_events_immutable
before update or delete on public.people_engagement_events
for each row execute function public.tg_people_engagement_events_immutable();

-- ---------------------------------------------------------------------
-- 2. Lifecycle guard.
-- ---------------------------------------------------------------------
-- Operations Managers retain ordinary day-to-day authority: they may end an
-- open engagement on a project they can access. Neither they nor a Principal
-- may directly rewrite a closed engagement. Corrections use the controlled RPC
-- below, which sets a transaction-local marker only for its one UPDATE.
create or replace function public.tg_people_engagement_lifecycle_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled_correction boolean := coalesce(
    nullif(current_setting('app.people_engagement_controlled_correction', true), ''),
    'false'
  )::boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if controlled_correction then
    if not public.is_owner() then
      raise exception 'Only the Principal may correct or reopen an engagement'
        using errcode = '42501';
    end if;
    return new;
  end if;

  -- Current-record management remains ordinary operational authority. The
  -- existing audit trigger freezes person/project and stamps actor/version.
  if old.end_date is null and new.end_date is null then
    return new;
  end if;

  -- Ending is also ordinary authority, but role/start cannot be rewritten in
  -- the same request as the closure.
  if old.end_date is null
     and new.end_date is not null
     and new.engagement_role = old.engagement_role
     and new.start_date = old.start_date then
    return new;
  end if;

  if old.end_date is not null then
    raise exception 'Only the Principal may correct or reopen a closed engagement'
      using errcode = '42501';
  end if;

  raise exception 'Use the controlled correction action to change engagement details'
    using errcode = '42501';
end;
$$;

create trigger people_engagement_lifecycle_guard
before update on public.people_engagements
for each row execute function public.tg_people_engagement_lifecycle_guard();

-- ---------------------------------------------------------------------
-- 3. Automatic immutable event writing.
-- ---------------------------------------------------------------------
create or replace function public.tg_record_people_engagement_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled_correction boolean := coalesce(
    nullif(current_setting('app.people_engagement_controlled_correction', true), ''),
    'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.people_engagement_correction_reason', true),
    ''
  )), '');
  next_event_type text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'created';
  elsif old.end_date is null and new.end_date is not null and not controlled_correction then
    next_event_type := 'ended';
  elsif old.end_date is not null and new.end_date is null then
    next_event_type := 'reopened';
  elsif not controlled_correction then
    next_event_type := 'updated';
  else
    next_event_type := 'corrected';
  end if;

  insert into public.people_engagement_events (
    engagement_id,
    event_type,
    previous_snapshot,
    new_snapshot,
    actor_profile_id,
    occurred_at,
    correction_reason,
    resulting_version
  ) values (
    new.id,
    next_event_type,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    auth.uid(),
    now(),
    case when next_event_type in ('corrected', 'reopened') then supplied_reason else null end,
    new.version
  );

  return new;
end;
$$;

create trigger people_engagement_event_writer
after insert or update on public.people_engagements
for each row execute function public.tg_record_people_engagement_event();

-- ---------------------------------------------------------------------
-- 4. Principal-only controlled correction/reopen RPC.
-- ---------------------------------------------------------------------
create or replace function public.correct_people_engagement(
  target_engagement_id uuid,
  expected_version integer,
  target_engagement_role text,
  target_start_date date,
  target_end_date date,
  target_end_reason text,
  reopen_engagement boolean,
  correction_reason text
)
returns public.people_engagements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.people_engagements;
  corrected public.people_engagements;
  clean_reason text := nullif(trim(coalesce(correction_reason, '')), '');
  clean_end_reason text := nullif(trim(coalesce(target_end_reason, '')), '');
begin
  if not public.is_owner() then
    raise exception 'Only the Principal may correct or reopen an engagement'
      using errcode = '42501';
  end if;

  if clean_reason is null or char_length(clean_reason) < 3 then
    raise exception 'Explain why this engagement record is being corrected'
      using errcode = '22023';
  end if;

  if char_length(clean_reason) > 1000 then
    raise exception 'The correction reason must be 1000 characters or fewer'
      using errcode = '22023';
  end if;

  if target_engagement_role is null or target_engagement_role not in (
    'team_leader',
    'site_representative',
    'supervisor',
    'skilled_worker',
    'specialist_subcontractor',
    'consultant',
    'project_support'
  ) then
    raise exception 'Choose a valid role for this engagement'
      using errcode = '22023';
  end if;

  if target_start_date is null then
    raise exception 'An engagement start date is required'
      using errcode = '22023';
  end if;

  if reopen_engagement is null then
    raise exception 'Choose whether to correct details or reopen the engagement'
      using errcode = '22023';
  end if;

  select * into existing
  from public.people_engagements
  where id = target_engagement_id
  for update;

  if not found then
    raise exception 'Engagement not found' using errcode = 'P0002';
  end if;

  if existing.version <> expected_version then
    raise exception 'This engagement was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  if reopen_engagement and existing.end_date is null then
    raise exception 'This engagement is already current'
      using errcode = '22023';
  end if;

  if not reopen_engagement and existing.end_date is not null and target_end_date is null then
    raise exception 'Choose Reopen engagement to clear a closed engagement end date'
      using errcode = '22023';
  end if;

  if not reopen_engagement and target_end_date is not null and target_end_date < target_start_date then
    raise exception 'The engagement end date cannot be before its start date'
      using errcode = '22023';
  end if;

  if not reopen_engagement and target_end_date is null and clean_end_reason is not null then
    raise exception 'A current engagement cannot have an end reason'
      using errcode = '22023';
  end if;

  -- Do not impose a broad no-overlap rule: Botanique may later authorise
  -- parallel roles. Reopening does, however, create one open-ended engagement,
  -- and may not coexist with another active row for the same person/project.
  if reopen_engagement and exists (
    select 1
    from public.people_engagements conflict
    where conflict.person_id = existing.person_id
      and conflict.project_id = existing.project_id
      and conflict.end_date is null
      and conflict.id <> existing.id
  ) then
    raise exception 'This engagement cannot be reopened because an active engagement already exists for this person and project.'
      using errcode = '23505';
  end if;

  perform set_config('app.people_engagement_controlled_correction', 'true', true);
  perform set_config('app.people_engagement_correction_reason', clean_reason, true);

  begin
    update public.people_engagements
    set engagement_role = target_engagement_role,
        start_date = target_start_date,
        end_date = case when reopen_engagement then null else target_end_date end,
        end_reason = case when reopen_engagement then null else clean_end_reason end
    where id = existing.id
      and version = expected_version
    returning * into corrected;
  exception when unique_violation then
    if reopen_engagement then
      raise exception 'This engagement cannot be reopened because an active engagement already exists for this person and project.'
        using errcode = '23505';
    end if;
    raise;
  end;

  if not found then
    raise exception 'This engagement was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  -- Do not leave the controlled marker available to later statements in the
  -- caller's transaction. The event trigger has already consumed both values.
  perform set_config('app.people_engagement_controlled_correction', 'false', true);
  perform set_config('app.people_engagement_correction_reason', '', true);

  return corrected;
end;
$$;

revoke execute on function public.tg_people_engagement_lifecycle_guard() from public, anon, authenticated;
revoke execute on function public.tg_record_people_engagement_event() from public, anon, authenticated;
revoke execute on function public.tg_people_engagement_events_immutable() from public, anon, authenticated;
revoke execute on function public.correct_people_engagement(uuid, integer, text, date, date, text, boolean, text)
  from public, anon;
grant execute on function public.correct_people_engagement(uuid, integer, text, date, date, text, boolean, text)
  to authenticated;
