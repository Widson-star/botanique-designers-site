-- Preserve Maintenance operational audit truth while the next migration adds
-- and backfills site_id. This recognizes only a migration-context UPDATE where
-- auth.uid() is null and the sole row difference is site_id. The Site-owned
-- migration then freezes site_id under the normal audit trigger.

create or replace function public.tg_audit_maintenance_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_project public.projects;
  structural_site_backfill boolean := false;
begin
  if tg_op = 'UPDATE' and auth.uid() is null then
    structural_site_backfill :=
      (to_jsonb(new) - 'site_id') = (to_jsonb(old) - 'site_id');
  end if;

  if structural_site_backfill then
    new.project_id := old.project_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := old.updated_by;
    new.updated_at := old.updated_at;
    new.version := old.version;
    new.scope := old.scope;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    new.status := 'active';

    select * into target_project from public.projects where id = new.project_id;
    if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
    if target_project.archived then
      raise exception 'Maintenance cannot be started on an archived project' using errcode = '22023';
    end if;
    if target_project.status not in ('Ongoing', 'Paused', 'Completed') then
      raise exception 'Maintenance can only be started on an Ongoing, Paused or Completed project' using errcode = '22023';
    end if;
  else
    new.project_id := old.project_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.scope := regexp_replace(trim(new.scope), '\s+', ' ', 'g');
  return new;
end;
$$;

create or replace function public.tg_record_maintenance_relationship_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(nullif(current_setting('app.maintenance_relationship_controlled_transition', true), ''), 'false')::boolean;
  supplied_reason text := nullif(trim(coalesce(current_setting('app.maintenance_relationship_transition_reason', true), '')), '');
  next_event_type text;
  structural_site_backfill boolean := false;
begin
  if tg_op = 'UPDATE' and auth.uid() is null then
    structural_site_backfill :=
      (to_jsonb(new) - 'site_id') = (to_jsonb(old) - 'site_id');
  end if;
  if structural_site_backfill then return new; end if;

  if tg_op = 'INSERT' then next_event_type := 'created';
  elsif controlled and new.status = 'paused' then next_event_type := 'paused';
  elsif controlled and new.status = 'active' then next_event_type := 'resumed';
  elsif controlled and new.status = 'ended' then next_event_type := 'ended';
  else next_event_type := 'updated';
  end if;

  insert into public.maintenance_relationship_events(
    maintenance_relationship_id,event_type,previous_snapshot,new_snapshot,
    reason,actor_profile_id,occurred_at,resulting_version
  ) values (
    new.id,next_event_type,
    case when tg_op='INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    case when next_event_type in ('paused','ended') then supplied_reason else null end,
    auth.uid(),now(),new.version
  );
  return new;
end;
$$;
