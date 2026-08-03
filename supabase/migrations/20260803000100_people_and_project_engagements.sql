-- =====================================================================
-- BD-PEOPLE-01 (Stage 5) — People and project engagements
-- =====================================================================
-- The two database objects added by Stage 5, under the Founder decisions of
-- 3 August 2026 recorded in WORKSTREAMS.md.
--
-- WHY THIS EXISTS. Before this migration, every human the Operations Hub could
-- NAME had to be an authenticated user: `profiles.id` references auth.users,
-- `projects.lead_person_id` references auth.users, and
-- `project_assignments.user_id` references auth.users. Everyone else Botanique
-- actually works with survived only as free text, and the production data shows
-- exactly what that costs — the same team leader stored as two different
-- strings, one of them with a rate and a headcount packed into the identity
-- field, alongside crew references that are really headcounts ("4 casuals") or
-- task descriptions ("Road Kerb Installation").
--
-- Blueprint §4.1 and §13 require the fix: an external worker must not be forced
-- into an authenticated `profiles` identity in order to be engaged or recorded.
-- `public.people` is therefore the canonical person record, and authentication
-- is NOT the definition of a person.
--
-- WHAT THIS MIGRATION DELIBERATELY DOES NOT DO:
--   * It changes NOTHING that already exists. No column, constraint, policy,
--     trigger, function, grant or row on `profiles`, `projects`,
--     `project_assignments`, `internal_cost_claims`, `fund_requests`,
--     `daily_site_entries` or any other table is altered. This migration is
--     purely additive, so no current record, access rule or history can break.
--   * An engagement GRANTS NO ACCESS. `project_assignments` remains the sole
--     access-control table and is untouched. A row in `people_engagements` is a
--     resourcing fact — who is working on what, in which role, over which
--     period — and is never consulted by any access decision, here or
--     elsewhere. Adding a person to a project cannot widen what anybody can see.
--   * It creates NO casual-worker register. Per the Founder decision, casual
--     labour remains headcount plus crew reference on the Daily Site entry until
--     the Labour domain is authorised. `relationship_type` deliberately has no
--     'casual_worker' and no 'crew' value: a permanent person database must not
--     grow out of evidence-led daily registers. Named CREW REPRESENTATIVES are
--     the exception and do get records, because they are already named on
--     claims today.
--   * It creates NO organisation or non-person payee. Blueprint §13 holds that a
--     supplier is not a person record with unused workforce fields, so
--     organisations get their own separately authorised stage. Existing
--     `recipient_type`/`recipient_label` on claims and the frozen
--     `*_snapshot` columns on fund-request allocations remain the authoritative
--     finance recipient reference, exactly as Blueprint §13 requires; nothing
--     here rewrites or reinterprets them.
--   * It stores NO rate, amount, payment, attendance record or labour plan. This
--     is not a payroll system and holds no money of any kind.
--   * It stores NO sensitive identity data — no national ID or ID number, no
--     identification document or photograph, no bank details, no home address,
--     no date of birth, no next of kin, no personal financial history. Document
--     evidence of any kind stays behind the Documents & Evidence authority and
--     its unmet Storage-backup gate. No password, token, recovery detail or
--     secret is stored or readable here; authentication data lives only in
--     Supabase auth and never surfaces in People.

-- ---------------------------------------------------------------------
-- 1. people — the canonical person record.
-- ---------------------------------------------------------------------
create table public.people (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(trim(full_name)) between 2 and 160),

  -- The relationship a person has with Botanique. Drawn from the Product
  -- Requirements §16 workforce vocabulary, minus the two values that are not
  -- persons: 'casual worker' (deferred to Labour, see above) and 'crew' (a
  -- group, not an individual).
  relationship_type text not null check (relationship_type in (
    'principal',
    'operations_manager',
    'regular_staff',
    'crew_representative',
    'subcontractor',
    'consultant',
    'external_professional',
    'site_representative'
  )),

  -- The only contact detail collected, because reaching someone about a site is
  -- an operational necessity. Optional, and free-form so that it can hold the
  -- local formats actually in use.
  phone text null check (phone is null or char_length(trim(phone)) between 7 and 32),

  -- A short operational note ("speaks to the Karen site crew"), not a file, not
  -- a history and not an assessment of the person.
  note text null check (note is null or char_length(note) <= 500),

  -- Deactivation, never deletion. A person who stops working with Botanique is
  -- marked inactive so that their engagement history stays readable and every
  -- record that refers to them keeps resolving.
  is_active boolean not null default true,

  -- THE OPTIONAL PORTAL LINK. Null for almost everybody. A person is a person
  -- whether or not they can sign in; this column only records that a canonical
  -- person happens to also be one of the authenticated portal users. It is
  -- UNIQUE, so one profile can be claimed by at most one person record, and it
  -- is writable ONLY by the Principal (enforced in tg_people_access_guard
  -- below). Setting it grants no access and creates no account, and clearing it
  -- revokes no access: portal access is created and removed in Supabase auth,
  -- which this table cannot reach.
  profile_id uuid null unique references public.profiles(id) on delete set null,

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Duplicate prevention. Two records for the same team leader is precisely the
-- failure the free-text labels already demonstrate, so a canonical person name
-- is unique ignoring case and any difference in spacing — "Lincoln Waweru",
-- "lincoln waweru" and "Lincoln  Waweru" are one person, and the second attempt
-- is refused. The interface reads this index before writing and offers the
-- existing person instead, so the reader is redirected to the real record
-- rather than shown a database error.
create unique index people_unique_canonical_name
  on public.people (lower(regexp_replace(trim(full_name), '\s+', ' ', 'g')));

create index people_active_relationship_idx
  on public.people (relationship_type, full_name)
  where is_active;

-- ---------------------------------------------------------------------
-- 2. people_engagements — a person's involvement in one project.
-- ---------------------------------------------------------------------
-- Deliberately narrow: project, person, role, period. No rate, no payment, no
-- attendance, no employment terms, no reporting line. Those belong to Labour
-- and Payments, Tasks and Assignments, and are not authorised here.
create table public.people_engagements (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people(id) on delete restrict,
  project_id uuid not null references public.projects(id) on delete restrict,

  engagement_role text not null check (engagement_role in (
    'team_leader',
    'site_representative',
    'supervisor',
    'skilled_worker',
    'specialist_subcontractor',
    'consultant',
    'project_support'
  )),

  start_date date not null,

  -- An OPEN engagement has no end date. Ending one is a closure, never a
  -- deletion: the row stays, so "who was on this project in June" keeps its
  -- answer. There is deliberately no stored is_active flag — an engagement is
  -- active exactly when end_date is null, so the two can never drift apart.
  end_date date null,
  end_reason text null check (end_reason is null or char_length(trim(end_reason)) between 1 and 300),

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint people_engagement_period check (end_date is null or end_date >= start_date),
  constraint people_engagement_end_reason check (end_date is not null or end_reason is null)
);

-- One OPEN engagement per person per project. A person may be engaged on the
-- same project again later — the closed rows remain as history and do not
-- collide, because the index covers only open engagements.
create unique index people_engagements_one_open_per_project
  on public.people_engagements (person_id, project_id)
  where end_date is null;

create index people_engagements_project_idx on public.people_engagements (project_id, start_date desc);
create index people_engagements_person_idx on public.people_engagements (person_id, start_date desc);

-- ---------------------------------------------------------------------
-- 3. Authority helpers.
-- ---------------------------------------------------------------------
-- The People REGISTER is company-wide: an Operations Manager must be able to
-- find a team leader before engaging them, so both roles read every person.
-- ENGAGEMENTS are project-scoped, and reuse the established project-authority
-- shape already used by Daily Site and Internal Cost Claims: the Principal
-- reaches every project, an Operations Manager reaches a project they lead or
-- are actively assigned to. No new access path is invented here.
create or replace function public.private_active_people_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
    and p.role in ('owner', 'manager')
$$;

create or replace function public.can_access_people_engagement_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.profiles actor
    where actor.id = auth.uid()
      and actor.is_active
      and (
        actor.role = 'owner'
        or (
          actor.role = 'manager'
          and exists (
            select 1
            from public.projects project
            where project.id = target_project_id
              and (
                project.lead_person_id = auth.uid()
                or exists (
                  select 1 from public.project_assignments assignment
                  where assignment.project_id = project.id
                    and assignment.user_id = auth.uid()
                    and assignment.is_active
                )
              )
          )
        )
      )
  )
$$;

-- Projects a caller may record an engagement against. Archived projects are
-- excluded, because engaging somebody on a closed project is not a real action.
create or replace function public.people_engagement_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select project.*
  from public.projects project
  where not project.archived
    and public.can_access_people_engagement_project(project.id)
  order by project.project_name
$$;

-- ---------------------------------------------------------------------
-- 4. Audit and authority triggers.
-- ---------------------------------------------------------------------
create or replace function public.tg_audit_people()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  -- Store the name exactly as the canonical index reads it, so what is written
  -- and what is compared can never drift apart.
  new.full_name := regexp_replace(trim(new.full_name), '\s+', ' ', 'g');
  new.phone := nullif(trim(coalesce(new.phone, '')), '');
  new.note := nullif(trim(coalesce(new.note, '')), '');
  return new;
end;
$$;

create trigger people_audit
before insert or update on public.people
for each row execute function public.tg_audit_people();

-- Granting portal access, and withdrawing a person from the register, are
-- Principal-only security actions. An Operations Manager runs day-to-day
-- resourcing — adding people and managing engagements — but can neither link a
-- person to a login nor deactivate somebody, because both change what other
-- users can reach. RLS cannot express this: it compares no OLD row on UPDATE,
-- so the rule is enforced here where OLD and NEW are both visible.
create or replace function public.tg_people_access_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    -- Creating a person NEVER creates or attaches portal access. Even the
    -- Principal links a profile as a separate, deliberate second action.
    if new.profile_id is not null then
      raise exception 'Creating a person cannot grant portal access. Create the person first, then link the portal account.'
        using errcode = '42501';
    end if;
    return new;
  end if;

  if new.profile_id is distinct from old.profile_id and not public.is_owner() then
    raise exception 'Only the Principal may link or unlink a portal account'
      using errcode = '42501';
  end if;

  if new.is_active is distinct from old.is_active and not public.is_owner() then
    raise exception 'Only the Principal may activate or deactivate a person'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

create trigger people_access_guard
before insert or update on public.people
for each row execute function public.tg_people_access_guard();

create or replace function public.tg_audit_people_engagements()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  engaged public.people;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;

    -- A new engagement requires a person who is still on the register. Existing
    -- engagements of a deactivated person are untouched and stay readable.
    select * into engaged from public.people where id = new.person_id;
    if not found then
      raise exception 'Person not found' using errcode = 'P0002';
    end if;
    if not engaged.is_active then
      raise exception 'This person is no longer active and cannot be engaged on a project'
        using errcode = '22023';
    end if;
  else
    new.person_id := old.person_id;
    new.project_id := old.project_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.end_reason := nullif(trim(coalesce(new.end_reason, '')), '');
  return new;
end;
$$;

create trigger people_engagements_audit
before insert or update on public.people_engagements
for each row execute function public.tg_audit_people_engagements();

-- ---------------------------------------------------------------------
-- 5. Row level security.
-- ---------------------------------------------------------------------
alter table public.people enable row level security;
alter table public.people_engagements enable row level security;

-- The register is readable by both operational roles. Staff and viewer callers
-- match no policy and therefore see nothing at all in Stage 5.
create policy "people_select_operational_roles"
  on public.people for select
  to authenticated
  using (public.private_active_people_role() is not null);

create policy "people_insert_operational_roles"
  on public.people for insert
  to authenticated
  with check (public.private_active_people_role() is not null);

create policy "people_update_operational_roles"
  on public.people for update
  to authenticated
  using (public.private_active_people_role() is not null)
  with check (public.private_active_people_role() is not null);

-- No DELETE policy on either table, and none is granted below. People and their
-- engagements are closed, never erased, so no operational or historical record
-- can be left pointing at a person who has vanished.

create policy "people_engagements_select_authorised"
  on public.people_engagements for select
  to authenticated
  using (public.can_access_people_engagement_project(project_id));

create policy "people_engagements_insert_authorised"
  on public.people_engagements for insert
  to authenticated
  with check (
    public.private_active_people_role() is not null
    and public.can_access_people_engagement_project(project_id)
  );

create policy "people_engagements_update_authorised"
  on public.people_engagements for update
  to authenticated
  using (
    public.private_active_people_role() is not null
    and public.can_access_people_engagement_project(project_id)
  )
  with check (
    public.private_active_people_role() is not null
    and public.can_access_people_engagement_project(project_id)
  );

-- Revoke everything first, then grant back exactly what Stage 5 needs. DELETE is
-- never granted to anybody, so a person and their engagement history cannot be
-- erased even if a future default privilege would otherwise have allowed it.
revoke all on public.people from anon, authenticated;
revoke all on public.people_engagements from anon, authenticated;
grant select, insert, update on public.people to authenticated;
grant select, insert, update on public.people_engagements to authenticated;

-- These three are referenced directly by the policies above, so `authenticated`
-- must keep EXECUTE or every People read would fail with a permission error.
-- Each reveals only what the caller may already see: their own role, and
-- whether they may reach a project. `anon` is cut off entirely.
revoke execute on function public.private_active_people_role() from public, anon;
revoke execute on function public.can_access_people_engagement_project(uuid) from public, anon;
revoke execute on function public.people_engagement_projects() from public, anon;
