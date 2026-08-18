-- New Project creation now treats client_site_name as the operator-facing
-- Site / property name. Legacy rows are not rewritten; this affects inserts only.
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

  resolved_site_name := coalesce(nullif(trim(new.client_site_name), ''), trim(new.project_name));

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
