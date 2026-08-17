-- BOTANIQUE DESIGNERS — Maintenance RBAC / ACL correction.
--
-- Founder control review, 17 Aug 2026.
--
-- Maintenance is an Operations capability. The Operations Manager already has
-- portfolio-wide operational Project access in the core Project RLS/UI model,
-- but Maintenance V1 accidentally narrowed that role to projects where the
-- manager was lead or explicitly assigned. This migration restores the same
-- portfolio-wide boundary inside Maintenance.
--
-- Ordinary Maintenance operations remain available to the Principal and
-- Operations Manager. Ending the Maintenance service relationship is an
-- exceptional closure action and is Principal-only. Assignment-history
-- correction remains Principal-only under the existing correction-authority
-- migration.
--
-- This migration changes authority only. It creates, edits, closes or deletes
-- no Maintenance, Project, People, visit, assignment or Finance row.

create or replace function public.can_manage_maintenance_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    public.current_user_role() in ('owner', 'manager')
    and exists (
      select 1
      from public.projects project
      where project.id = target_project_id
    )
$$;

comment on function public.can_manage_maintenance_project(uuid) is
  'Maintenance project authority: Principal and Operations Manager have portfolio-wide access; Project Team and Read-only do not enter Maintenance V1.';

create or replace function public.end_maintenance_relationship(
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
  open_scheduled_visits integer;
begin
  if public.current_user_role() is distinct from 'owner' then
    raise exception 'Only the Principal can end a Maintenance relationship'
      using errcode = '42501';
  end if;

  if clean_reason is null then
    raise exception 'A reason is required to end this Maintenance relationship'
      using errcode = '22023';
  end if;

  select * into existing
  from public.maintenance_relationships
  where id = target_relationship_id
  for update;

  if not found then
    raise exception 'Maintenance relationship not found' using errcode = 'P0002';
  end if;

  if existing.version <> expected_version then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  if existing.status = 'ended' then
    raise exception 'This Maintenance relationship has already ended'
      using errcode = '22023';
  end if;

  select count(*) into open_scheduled_visits
  from public.maintenance_visits
  where maintenance_relationship_id = existing.id
    and status = 'scheduled';

  if open_scheduled_visits > 0 then
    raise exception 'Resolve all scheduled Maintenance visits before ending this relationship'
      using errcode = '22023';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'true', true);
  perform set_config('app.maintenance_relationship_transition_reason', clean_reason, true);

  update public.maintenance_relationships
  set status = 'ended'
  where id = existing.id
    and version = expected_version
  returning * into existing;

  if not found then
    raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.'
      using errcode = '40001';
  end if;

  perform set_config('app.maintenance_relationship_controlled_transition', 'false', true);
  perform set_config('app.maintenance_relationship_transition_reason', '', true);

  -- Close every open team assignment atomically with the relationship.
  perform set_config('app.maintenance_assignment_controlled_close', 'true', true);
  update public.maintenance_assignments
  set end_date = greatest(current_date, start_date)
  where maintenance_relationship_id = existing.id
    and end_date is null;
  perform set_config('app.maintenance_assignment_controlled_close', 'false', true);

  return existing;
end;
$$;

comment on function public.end_maintenance_relationship(uuid, integer, text) is
  'Principal-only terminal Maintenance closure. Scheduled visits must first be resolved; open assignments close atomically.';

-- Preserve the existing explicit exposure boundary after function replacement.
revoke execute on function public.can_manage_maintenance_project(uuid) from public, anon;
revoke execute on function public.end_maintenance_relationship(uuid, integer, text) from public, anon;
grant execute on function public.can_manage_maintenance_project(uuid) to authenticated;
grant execute on function public.end_maintenance_relationship(uuid, integer, text) to authenticated;
