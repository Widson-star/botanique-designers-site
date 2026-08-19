-- BOTANIQUE DESIGNERS — resolve Maintenance Site from the originating Project.
--
-- Site remains the durable owner and site_id remains NOT NULL. This only lets a
-- caller that names a Project alone ("start Maintenance on this Project") have
-- the Site resolved from it, instead of failing with a bare "Site not found".
-- A maintenance-only relationship still supplies site_id with a null project_id,
-- and when BOTH are given the existing same-Site check still applies.
create or replace function public.tg_audit_maintenance_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_site public.sites;
  target_project public.projects;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    new.status := 'active';

    -- Resolve Site from the originating Project when only the Project is named.
    if new.site_id is null and new.project_id is not null then
      select site_id into new.site_id from public.projects where id = new.project_id;
    end if;
    if new.site_id is null then
      raise exception 'A Site is required to start Maintenance' using errcode = '22023';
    end if;

    select * into target_site from public.sites where id = new.site_id;
    if not found then raise exception 'Site not found' using errcode = 'P0002'; end if;

    if new.project_id is not null then
      select * into target_project from public.projects where id = new.project_id;
      if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
      if target_project.site_id <> new.site_id then
        raise exception 'The related Project belongs to a different Site' using errcode = '22023';
      end if;
      if target_project.archived then
        raise exception 'An archived Project cannot be used as the Maintenance origin' using errcode = '22023';
      end if;
      if target_project.status not in ('Ongoing','Paused','Completed','Design-only') then
        raise exception 'Choose a current or completed Botanique Project, or leave Project blank for maintenance-only work' using errcode = '22023';
      end if;
    end if;
  else
    new.site_id := old.site_id;
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
