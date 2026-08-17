-- BOTANIQUE DESIGNERS — Maintenance operating loop V1.
--
-- A Maintenance visit is the planned operational occurrence. Daily Site Record
-- remains the actual field-execution truth. This migration links the two only
-- at visit completion; it does not copy DSR workforce, evidence or work data
-- into Maintenance.
--
-- Principal and Operations Manager retain the portfolio-wide ordinary
-- Maintenance authority established by maintenance_authority_acl_correction.
-- Project Team and Read-only gain no new access. This migration creates no
-- operational rows and changes no Project, People, Finance or DSR lifecycle.

alter table public.maintenance_visits
  add column daily_site_entry_id uuid null references public.daily_site_entries(id) on delete restrict,
  add column completion_outcome text null check (completion_outcome in ('completed', 'partial')),
  add column follow_up_required boolean null,
  add column follow_up_note text null check (
    follow_up_note is null or char_length(trim(follow_up_note)) between 1 and 2000
  );

create unique index maintenance_visits_one_completion_per_dsr
  on public.maintenance_visits (daily_site_entry_id)
  where daily_site_entry_id is not null;

alter table public.maintenance_visits
  add constraint maintenance_visit_operating_loop_fields check (
    (
      status = 'completed'
      and completion_outcome is not null
      and follow_up_required is not null
      and (not follow_up_required or follow_up_note is not null)
      and (completion_outcome <> 'partial' or follow_up_required)
    )
    or (
      status <> 'completed'
      and completion_outcome is null
      and follow_up_required is null
      and follow_up_note is null
      and daily_site_entry_id is null
    )
  ) not valid;

-- Existing completed visits pre-date this operating-loop model. There are no
-- completed production visits at deployment time, but NOT VALID keeps the
-- migration safe for any environment containing historical V1 completion
-- rows. New/updated rows are still checked immediately.

create index maintenance_visits_daily_site_entry_idx
  on public.maintenance_visits (daily_site_entry_id)
  where daily_site_entry_id is not null;

-- Freeze all completion-link fields behind the controlled transition RPCs.
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
    or new.cancellation_reason is distinct from old.cancellation_reason
    or new.daily_site_entry_id is distinct from old.daily_site_entry_id
    or new.completion_outcome is distinct from old.completion_outcome
    or new.follow_up_required is distinct from old.follow_up_required
    or new.follow_up_note is distinct from old.follow_up_note;
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

-- The full Maintenance-cycle completion action. If a DSR is supplied, it
-- must be the accepted live DSR for the same Project/site and scheduled date.
-- Any next visit requested here is created in the same transaction, so the
-- current visit cannot close successfully while its explicitly requested next
-- recurring visit silently fails to schedule.
create or replace function public.complete_maintenance_visit_cycle(
  target_visit_id uuid,
  expected_version integer,
  target_daily_site_entry_id uuid,
  target_outcome text,
  completion_note text,
  target_follow_up_required boolean,
  target_follow_up_note text default null,
  next_scheduled_date date default null,
  next_purpose text default null
)
returns public.maintenance_visits
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.maintenance_visits;
  relationship public.maintenance_relationships;
  execution public.daily_site_entries;
  clean_note text := nullif(trim(coalesce(completion_note, '')), '');
  clean_follow_up text := nullif(trim(coalesce(target_follow_up_note, '')), '');
  clean_next_purpose text := nullif(trim(coalesce(next_purpose, '')), '');
begin
  if target_outcome not in ('completed', 'partial') then
    raise exception 'Choose Completed or Partially completed for the Maintenance outcome'
      using errcode = '22023';
  end if;
  if clean_note is null then
    raise exception 'A short Maintenance completion note is required'
      using errcode = '22023';
  end if;
  if target_follow_up_required is null then
    raise exception 'State whether Maintenance follow-up is required'
      using errcode = '22023';
  end if;
  if target_outcome = 'partial' and not target_follow_up_required then
    raise exception 'Partially completed Maintenance requires follow-up'
      using errcode = '22023';
  end if;
  if target_follow_up_required and clean_follow_up is null then
    raise exception 'Describe the Maintenance follow-up required'
      using errcode = '22023';
  end if;
  if next_scheduled_date is not null and clean_next_purpose is null then
    raise exception 'Describe the planned work for the next Maintenance visit'
      using errcode = '22023';
  end if;

  select * into existing
  from public.maintenance_visits
  where id = target_visit_id
  for update;

  if not found then
    raise exception 'Maintenance visit not found' using errcode = 'P0002';
  end if;

  select * into relationship
  from public.maintenance_relationships
  where id = existing.maintenance_relationship_id
  for share;

  if not public.can_manage_maintenance_project(relationship.project_id) then
    raise exception 'You are not authorised to manage this Maintenance visit'
      using errcode = '42501';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;
  if existing.status <> 'scheduled' then
    raise exception 'Only a Scheduled visit can be completed'
      using errcode = '22023';
  end if;

  if target_daily_site_entry_id is not null then
    select * into execution
    from public.daily_site_entries
    where id = target_daily_site_entry_id;

    if not found then
      raise exception 'Daily Site Record not found' using errcode = 'P0002';
    end if;
    if execution.project_id <> relationship.project_id then
      raise exception 'This Daily Site Record belongs to a different site'
        using errcode = '22023';
    end if;
    if execution.work_date <> existing.scheduled_date then
      raise exception 'The Daily Site Record date must match the scheduled Maintenance visit date'
        using errcode = '22023';
    end if;
    if execution.state <> 'accepted' then
      raise exception 'Only an Accepted Daily Site Record can close a Maintenance visit'
        using errcode = '22023';
    end if;
  end if;

  if next_scheduled_date is not null then
    if relationship.status <> 'active' then
      raise exception 'A next visit can only be scheduled for Active Maintenance'
        using errcode = '22023';
    end if;
    if next_scheduled_date <= existing.scheduled_date then
      raise exception 'The next Maintenance visit must be after the visit being completed'
        using errcode = '22023';
    end if;
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'true', true);

  update public.maintenance_visits
  set status = 'completed',
      completed_at = now(),
      completion_note = clean_note,
      daily_site_entry_id = target_daily_site_entry_id,
      completion_outcome = target_outcome,
      follow_up_required = target_follow_up_required,
      follow_up_note = case when target_follow_up_required then clean_follow_up else null end
  where id = existing.id and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'false', true);

  if next_scheduled_date is not null then
    insert into public.maintenance_visits (
      maintenance_relationship_id, scheduled_date, purpose
    ) values (
      relationship.id, next_scheduled_date, clean_next_purpose
    );
  end if;

  return existing;
end;
$$;

-- Backward-compatible completion RPC during frontend rollout. It auto-links an
-- accepted same-day DSR when exactly one exists, and records the legacy action
-- as fully completed with no Maintenance follow-up. The new Hub calls the full
-- cycle RPC above so the operator can state the outcome/follow-up explicitly.
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
  matched_dsr uuid;
  match_count integer;
begin
  select * into existing
  from public.maintenance_visits
  where id = target_visit_id;
  if not found then
    raise exception 'Maintenance visit not found' using errcode = 'P0002';
  end if;

  select * into relationship
  from public.maintenance_relationships
  where id = existing.maintenance_relationship_id;

  select count(*), min(d.id)
  into match_count, matched_dsr
  from public.daily_site_entries d
  where d.project_id = relationship.project_id
    and d.work_date = existing.scheduled_date
    and d.state = 'accepted';

  if match_count <> 1 then
    matched_dsr := null;
  end if;

  return public.complete_maintenance_visit_cycle(
    target_visit_id,
    expected_version,
    matched_dsr,
    'completed',
    completion_note,
    false,
    null,
    null,
    null
  );
end;
$$;

revoke execute on function public.complete_maintenance_visit_cycle(uuid, integer, uuid, text, text, boolean, text, date, text) from public, anon;
grant execute on function public.complete_maintenance_visit_cycle(uuid, integer, uuid, text, text, boolean, text, date, text) to authenticated;

-- Trigger functions remain non-callable to authenticated clients.
revoke execute on function public.tg_maintenance_visit_transition_guard() from public, anon, authenticated;
