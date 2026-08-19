-- Site-owned Maintenance core.
-- Existing relationship lifecycle/audit truth is preserved by the immediately
-- preceding maintenance_site_backfill_audit_guard migration.

alter table public.maintenance_relationships
  add column site_id uuid references public.sites(id) on delete restrict;

update public.maintenance_relationships r
set site_id = p.site_id
from public.projects p
where p.id = r.project_id and r.site_id is null;

alter table public.maintenance_relationships
  alter column site_id set not null,
  alter column project_id drop not null;

alter table public.maintenance_relationships
  drop constraint if exists maintenance_relationships_project_id_fkey;
alter table public.maintenance_relationships
  add constraint maintenance_relationships_project_id_fkey
  foreign key(project_id) references public.projects(id) on delete restrict;

drop index if exists public.maintenance_relationships_one_live_per_project;
create unique index maintenance_relationships_one_live_per_site
  on public.maintenance_relationships(site_id) where status <> 'ended';
create index maintenance_relationships_site_idx
  on public.maintenance_relationships(site_id,status);

create or replace function public.can_manage_maintenance_site(target_site_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public as $$
  select public.current_user_role() in ('owner','manager')
    and exists(select 1 from public.sites s where s.id=target_site_id)
$$;

create or replace function public.can_manage_maintenance_project(target_project_id uuid)
returns boolean language sql stable security definer
set search_path=pg_catalog,public as $$
  select exists(select 1 from public.projects p
    where p.id=target_project_id and public.can_manage_maintenance_site(p.site_id))
$$;

create or replace function public.tg_audit_maintenance_relationships()
returns trigger language plpgsql security definer
set search_path=pg_catalog,public as $$
declare target_site public.sites; target_project public.projects;
begin
  if tg_op='INSERT' then
    new.created_by:=auth.uid(); new.updated_by:=auth.uid();
    new.created_at:=now(); new.updated_at:=now(); new.version:=1; new.status:='active';
    select * into target_site from public.sites where id=new.site_id;
    if not found then raise exception 'Site not found' using errcode='P0002'; end if;
    if new.project_id is not null then
      select * into target_project from public.projects where id=new.project_id;
      if not found then raise exception 'Project not found' using errcode='P0002'; end if;
      if target_project.site_id<>new.site_id then raise exception 'The related Project belongs to a different Site' using errcode='22023'; end if;
      if target_project.archived then raise exception 'An archived Project cannot be used as the Maintenance origin' using errcode='22023'; end if;
      if target_project.status not in ('Ongoing','Paused','Completed','Design-only') then
        raise exception 'Choose a current or completed Botanique Project, or leave Project blank for maintenance-only work' using errcode='22023';
      end if;
    end if;
  else
    new.site_id:=old.site_id; new.project_id:=old.project_id;
    new.created_by:=old.created_by; new.created_at:=old.created_at;
    new.updated_by:=auth.uid(); new.updated_at:=now(); new.version:=old.version+1;
  end if;
  new.scope:=regexp_replace(trim(new.scope),'\s+',' ','g');
  return new;
end$$;

revoke execute on function public.can_manage_maintenance_site(uuid) from public,anon;
grant execute on function public.can_manage_maintenance_site(uuid) to authenticated;
