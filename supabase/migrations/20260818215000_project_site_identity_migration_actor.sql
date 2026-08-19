-- BOTANIQUE DESIGNERS — Project Site identity needs an actor without a session.
--
-- tg_project_site_identity stamps the new Site's created_by/updated_by with
-- auth.uid(). In any context without an authenticated human — a data migration,
-- a service-role insert, the disposable-cluster regression harness — auth.uid()
-- is null and public.sites.created_by is NOT NULL, so the Project insert fails
-- with a confusing Site-level constraint error.
--
-- This is the same rule the Site foundation migration already used for the
-- legacy backfill: fall back to the active Principal as the MIGRATION ACTOR for
-- the Site row only. Project authorship is untouched, and an ordinary
-- authenticated insert is unaffected because auth.uid() wins.
create or replace function public.tg_project_site_identity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  resolved_site_id uuid;
  resolved_site_name text;
  actor uuid := coalesce(
    auth.uid(),
    (select id from public.profiles where role = 'owner' and is_active = true order by created_at asc limit 1)
  );
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
    if actor is null then
      raise exception 'No active Principal profile is available to own the new Site record'
        using errcode = '22023';
    end if;
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
