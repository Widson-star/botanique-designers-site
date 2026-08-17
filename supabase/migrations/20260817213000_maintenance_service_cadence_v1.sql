-- BOTANIQUE DESIGNERS — Maintenance service cadence V1.
--
-- Cadence fields are optional planning metadata only. They do not create,
-- reschedule or cancel Maintenance visits and they never rewrite history.
-- The current relationship frequency remains editable, including As needed.
-- Explicit Maintenance visits remain the actual operational commitments.

alter table public.maintenance_relationships
  add column if not exists service_days smallint[] null,
  add column if not exists cadence_end_date date null;

alter table public.maintenance_relationships
  drop constraint if exists maintenance_service_days_valid,
  add constraint maintenance_service_days_valid check (
    service_days is null or (
      cardinality(service_days) between 1 and 7
      and service_days <@ array[1,2,3,4,5,6,7]::smallint[]
    )
  );

alter table public.maintenance_relationships
  drop constraint if exists maintenance_cadence_end_after_start,
  add constraint maintenance_cadence_end_after_start check (
    cadence_end_date is null or cadence_end_date >= start_date
  );

-- maintenance_register() must expose the optional fields without changing
-- their meaning. They are descriptive only; next_visit_date still comes only
-- from an explicitly scheduled Maintenance visit.
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
      where v.maintenance_relationship_id = r.id and v.status = 'completed'
    ) as last_visit_date,
    (
      select min(v.scheduled_date)
      from public.maintenance_visits v
      where v.maintenance_relationship_id = r.id
        and v.status = 'scheduled'
        and v.scheduled_date >= current_date
    ) as next_visit_date,
    coalesce((
      select jsonb_agg(jsonb_build_object(
        'person_id', a.person_id,
        'full_name', pe.full_name,
        'role', a.role
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

revoke execute on function public.maintenance_register() from public, anon;
grant execute on function public.maintenance_register() to authenticated;
