-- BOTANIQUE DESIGNERS — Site + Project lifecycle foundation.
--
-- Site is the durable physical/client location. Project is a Botanique delivery
-- record that belongs to a Site. Maintenance will move to Site ownership in a
-- subsequent bounded tranche; this migration deliberately preserves every
-- existing Project and Maintenance relationship unchanged.
--
-- Existing legacy Project status/stage combinations are NOT rewritten here.
-- New projects and future lifecycle/material changes are guarded so no new
-- contradictory state can be created while legacy rows remain auditable and
-- correctable one by one.

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  site_name text not null check (char_length(trim(site_name)) between 1 and 160),
  location text null check (location is null or char_length(location) <= 120),
  county text null check (county is null or char_length(county) <= 80),
  notes text null check (notes is null or char_length(notes) <= 2000),
  created_by uuid not null default auth.uid() references public.profiles(id),
  updated_by uuid not null default auth.uid() references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index sites_name_location_idx
  on public.sites (lower(trim(site_name)), lower(trim(coalesce(location, ''))));

alter table public.sites enable row level security;

create policy sites_owner_manager_select
on public.sites for select
to authenticated
using (public.current_user_role() in ('owner', 'manager'));

create policy sites_owner_insert
on public.sites for insert
to authenticated
with check (public.current_user_role() = 'owner');

create policy sites_owner_update
on public.sites for update
to authenticated
using (public.current_user_role() = 'owner')
with check (public.current_user_role() = 'owner');

revoke all on table public.sites from public, anon;
grant select, insert, update on table public.sites to authenticated;

create or replace function public.tg_audit_sites()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  new.site_name := regexp_replace(trim(new.site_name), '\s+', ' ', 'g');
  new.location := nullif(regexp_replace(trim(coalesce(new.location, '')), '\s+', ' ', 'g'), '');
  new.county := nullif(regexp_replace(trim(coalesce(new.county, '')), '\s+', ' ', 'g'), '');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger sites_audit_before_write
before insert or update on public.sites
for each row execute function public.tg_audit_sites();

revoke execute on function public.tg_audit_sites() from public, anon, authenticated;

alter table public.projects add column site_id uuid null references public.sites(id) on delete restrict;

-- Backfill one durable Site per exact existing site identity. Exact matching is
-- deliberately conservative: same label + location + county can share a Site;
-- ambiguous/partial identities remain separate rather than being guessed.
insert into public.sites (site_name, location, county, created_by, updated_by, created_at, updated_at)
select
  x.site_name,
  x.location,
  x.county,
  x.actor_id,
  x.actor_id,
  x.first_seen,
  x.last_seen
from (
  select distinct on (
    lower(trim(coalesce(nullif(client_site_name, ''), project_name))),
    lower(trim(coalesce(location, ''))),
    lower(trim(coalesce(county, '')))
  )
    coalesce(nullif(trim(client_site_name), ''), trim(project_name)) as site_name,
    nullif(trim(coalesce(location, '')), '') as location,
    nullif(trim(coalesce(county, '')), '') as county,
    coalesce(created_by, updated_by) as actor_id,
    coalesce(created_at, now()) as first_seen,
    coalesce(updated_at, created_at, now()) as last_seen
  from public.projects
  where coalesce(created_by, updated_by) is not null
  order by
    lower(trim(coalesce(nullif(client_site_name, ''), project_name))),
    lower(trim(coalesce(location, ''))),
    lower(trim(coalesce(county, ''))),
    archived asc,
    created_at asc
) x;

update public.projects p
set site_id = s.id
from public.sites s
where p.site_id is null
  and lower(trim(s.site_name)) = lower(trim(coalesce(nullif(p.client_site_name, ''), p.project_name)))
  and lower(trim(coalesce(s.location, ''))) = lower(trim(coalesce(p.location, '')))
  and lower(trim(coalesce(s.county, ''))) = lower(trim(coalesce(p.county, '')));

alter table public.projects alter column site_id set not null;
create index projects_site_idx on public.projects(site_id, archived, status);

-- Allow the corrected Site Assessment stage while retaining legacy values in
-- the CHECK temporarily. The lifecycle guard below rejects deprecated values
-- for all new projects and whenever stage/type is deliberately changed.
alter table public.projects drop constraint if exists projects_stage_check;
alter table public.projects add constraint projects_stage_check check (
  stage = any(array[
    'Inquiry'::text,
    'Site Visit'::text,
    'Site Assessment'::text,
    'Concept Design'::text,
    'Detailed Design'::text,
    'Quotation Sent'::text,
    'Awaiting Approval'::text,
    'Implementation'::text,
    'Maintenance'::text,
    'Completed'::text,
    'Archived'::text
  ])
);

-- Project insert creates/reuses a Site only when the caller has not supplied an
-- explicit site_id. This makes historical-project entry useful immediately
-- without forcing a new Sites UI into this tranche.
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
  if tg_op <> 'INSERT' or new.site_id is not null then
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

create trigger projects_site_identity_before_insert
before insert on public.projects
for each row execute function public.tg_project_site_identity();

revoke execute on function public.tg_project_site_identity() from public, anon, authenticated;

-- Guard only INSERTS and deliberate status/stage/type changes. Existing legacy
-- rows can still receive low-risk notes/next-action corrections without being
-- forced through an unrelated historical cleanup.
create or replace function public.tg_project_lifecycle_integrity()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  must_validate boolean := tg_op = 'INSERT'
    or new.status is distinct from old.status
    or new.stage is distinct from old.stage
    or new.project_type is distinct from old.project_type;
begin
  if not must_validate then
    return new;
  end if;

  if new.project_type = 'Maintenance' then
    raise exception 'Maintenance is an Operations relationship, not a Project type'
      using errcode = '22023';
  end if;

  if new.stage in ('Maintenance', 'Archived', 'Site Visit') then
    raise exception 'Choose a current Project delivery phase; Maintenance, Archived and Site Visit are not current Project stages'
      using errcode = '22023';
  end if;

  if new.status = 'Pending' and new.stage <> 'Inquiry' then
    raise exception 'A Pending Project must remain at Inquiry until activated'
      using errcode = '22023';
  end if;

  if new.status = 'Completed' and new.stage <> 'Completed' then
    raise exception 'A Completed Project must have Completed as its delivery phase'
      using errcode = '22023';
  end if;

  if new.stage = 'Completed' and new.status not in ('Completed', 'Design-only') then
    raise exception 'Completed delivery phase requires a Completed or Design-only Project status'
      using errcode = '22023';
  end if;

  if new.status in ('Ongoing', 'Paused') and new.stage = 'Completed' then
    raise exception 'An Ongoing or Paused Project cannot be in the Completed delivery phase'
      using errcode = '22023';
  end if;

  if new.status = 'Design-only' and new.stage = 'Implementation' then
    raise exception 'A Design-only Project cannot be in Implementation'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

create trigger projects_lifecycle_integrity_before_write
before insert or update on public.projects
for each row execute function public.tg_project_lifecycle_integrity();

revoke execute on function public.tg_project_lifecycle_integrity() from public, anon, authenticated;
