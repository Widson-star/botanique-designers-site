-- BOTANIQUE DESIGNERS — Site identity correction.
-- The legacy client_site_name field contains either a client name or a site
-- label. It is therefore not safe as canonical Site identity. Existing Site
-- rows created by the foundation migration are renamed from their Project name
-- where each Site currently belongs to exactly one Project. Project/client
-- fields are untouched.

with single_project_sites as (
  select site_id, min(project_name) as project_name
  from public.projects
  group by site_id
  having count(*) = 1
)
update public.sites s
set site_name = x.project_name
from single_project_sites x
where s.id = x.site_id
  and s.site_name is distinct from x.project_name;

-- Future fallback Site creation uses Project name only. If an operator knows a
-- more specific physical/site identity, the Project form will create/select
-- that Site explicitly and supply site_id instead of relying on this fallback.
create or replace function public.tg_project_site_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resolved_site_id uuid;
  resolved_site_name text;
  actor uuid := auth.uid();
begin
  if new.site_id is not null then
    return new;
  end if;

  resolved_site_name := trim(new.project_name);

  select s.id into resolved_site_id
  from public.sites s
  where lower(trim(s.site_name)) = lower(resolved_site_name)
    and lower(trim(coalesce(s.location, ''))) = lower(trim(coalesce(new.location, '')))
    and lower(trim(coalesce(s.county, ''))) = lower(trim(coalesce(new.county, '')))
  order by s.created_at asc
  limit 1;

  if resolved_site_id is null then
    insert into public.sites(site_name, location, county, created_by, updated_by)
    values (
      resolved_site_name,
      nullif(trim(coalesce(new.location, '')), ''),
      nullif(trim(coalesce(new.county, '')), ''),
      actor,
      actor
    )
    returning id into resolved_site_id;
  end if;

  new.site_id := resolved_site_id;
  return new;
end;
$$;

revoke execute on function public.tg_project_site_identity() from public, anon, authenticated;
