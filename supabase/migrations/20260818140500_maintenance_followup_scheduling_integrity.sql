-- BOTANIQUE DESIGNERS — Maintenance follow-up & scheduling integrity.
--
-- Narrow correction tranche. No operational rows are created or rewritten.
-- 1. Active Maintenance may pause only after Scheduled visits are resolved.
-- 2. New/rescheduled visits require an Active Maintenance relationship.
-- 3. Derived next_visit_date includes overdue Scheduled visits instead of
--    incorrectly reporting "Not scheduled" once the date has passed.
--
-- Follow-up truth already exists on maintenance_visits and is intentionally
-- not duplicated into another table in this migration.

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
  scheduled_count integer;
begin
  select * into existing
  from public.maintenance_relationships
  where id = target_relationship_id
  for update;

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

  select count(*) into scheduled_count
  from public.maintenance_visits
  where maintenance_relationship_id = existing.id
    and status = 'scheduled';

  if scheduled_count > 0 then
    raise exception 'Resolve all Scheduled Maintenance visits before pausing this relationship'
      using errcode = '22023';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'true', true);
  perform set_config('app.maintenance_relationship_transition_reason', coalesce(clean_reason, ''), true);

  update public.maintenance_relationships
  set status = 'paused'
  where id = existing.id
    and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'false', true);
  perform set_config('app.maintenance_relationship_transition_reason', '', true);
  return existing;
end;
$$;

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
    new.status := 'scheduled';
    new.completed_at := null;
    new.completion_note := null;
    new.cancellation_reason := null;

    -- FOR SHARE serialises new visits against Pause/End, whose RPCs hold a
    -- FOR UPDATE lock on the same relationship row for the transaction.
    select * into relationship
    from public.maintenance_relationships
    where id = new.maintenance_relationship_id
    for share;

    if not found then
      raise exception 'Maintenance relationship not found' using errcode = 'P0002';
    end if;
    if relationship.status <> 'active' then
      raise exception 'A visit can only be scheduled against Active Maintenance'
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
    raise exception 'You are not authorised to manage this Maintenance visit' using errcode = '42501';
  end if;
  if relationship.status <> 'active' then
    raise exception 'A visit can only be rescheduled while Maintenance is Active' using errcode = '22023';
  end if;
  if existing.version <> expected_version then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.status <> 'scheduled' then
    raise exception 'Only a Scheduled visit can be rescheduled' using errcode = '22023';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'true', true);

  update public.maintenance_visits
  set scheduled_date = new_scheduled_date
  where id = existing.id
    and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.maintenance_visit_controlled_transition', 'false', true);
  return existing;
end;
$$;

-- Overdue Scheduled visits remain the next unresolved visit. Readers decide
-- whether the date is Upcoming, Due or Overdue; the read model must not hide it.
drop function if exists public.maintenance_register();
create function public.maintenance_register()
returns table(
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
  service_days smallint[],
  cadence_end_date date,
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
    r.service_days, r.cadence_end_date,
    (
      select max(v.scheduled_date)
      from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id
        and v.status = 'completed'
    ) as last_visit_date,
    (
      select min(v.scheduled_date)
      from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id
        and v.status = 'scheduled'
    ) as next_visit_date,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'person_id', a.person_id,
        'full_name', pe.full_name,
        'role', a.role
      ) order by pe.full_name)
      from public.maintenance_assignments a
      join public.people pe on pe.id = a.person_id
      where a.maintenance_relationship_id = r.id
        and a.end_date is null
    ), '[]'::jsonb) as assigned_team
  from public.maintenance_relationships r
  join public.projects p on p.id = r.project_id
  where public.can_manage_maintenance_project(r.project_id)
  order by p.project_name
$$;

create or replace function public.maintenance_project_summary(target_project_id uuid)
returns table(id uuid, status text, next_visit_date date)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    r.id,
    r.status,
    (
      select min(v.scheduled_date)
      from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id
        and v.status = 'scheduled'
    ) as next_visit_date
  from public.maintenance_relationships r
  where r.project_id = target_project_id
    and r.status <> 'ended'
    and public.can_manage_maintenance_project(r.project_id)
$$;

revoke execute on function public.pause_maintenance_relationship(uuid, integer, text) from public, anon;
revoke execute on function public.tg_audit_maintenance_visits() from public, anon, authenticated;
revoke execute on function public.reschedule_maintenance_visit(uuid, integer, date) from public, anon;
revoke execute on function public.maintenance_register() from public, anon;
revoke execute on function public.maintenance_project_summary(uuid) from public, anon;

grant execute on function public.pause_maintenance_relationship(uuid, integer, text) to authenticated;
grant execute on function public.reschedule_maintenance_visit(uuid, integer, date) to authenticated;
grant execute on function public.maintenance_register() to authenticated;
grant execute on function public.maintenance_project_summary(uuid) to authenticated;
