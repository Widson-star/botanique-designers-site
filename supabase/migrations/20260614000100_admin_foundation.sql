-- BD-OPS-08 Botanique Admin foundation.
-- Review before applying to the Botanique-only Supabase project.
-- Create auth users first, then insert matching profile rows for:
--   widson@botaniquedesigners.com  -> owner
--   martine@botaniquedesigners.com -> manager

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  role text not null check (role in ('owner', 'manager', 'staff', 'viewer')),
  is_active boolean not null default true,
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  project_name text not null check (char_length(project_name) <= 160),
  client_site_name text check (client_site_name is null or char_length(client_site_name) <= 160),
  location text check (location is null or char_length(location) <= 120),
  county text check (county is null or char_length(county) <= 80),
  project_type text not null check (project_type in (
    'Residential',
    'Estate',
    'Hospitality',
    'Institutional',
    'Commercial',
    'Public Realm',
    'Design Concept',
    'Maintenance',
    'Other'
  )),
  status text not null check (status in (
    'Pending',
    'Ongoing',
    'Completed',
    'Paused',
    'Cancelled',
    'Design-only'
  )),
  stage text not null check (stage in (
    'Inquiry',
    'Site Visit',
    'Concept Design',
    'Detailed Design',
    'Quotation Sent',
    'Awaiting Approval',
    'Implementation',
    'Maintenance',
    'Completed',
    'Archived'
  )),
  lead_person_id uuid null references auth.users(id),
  start_date date,
  last_updated date,
  next_action text check (next_action is null or char_length(next_action) <= 500),
  next_action_date date,
  portfolio_eligible boolean not null default false,
  portfolio_permission_status text not null check (portfolio_permission_status in (
    'Not Reviewed',
    'Eligible',
    'Permission Needed',
    'Approved For Portfolio',
    'Private / Do Not Publish'
  )),
  notes text check (notes is null or char_length(notes) <= 5000),
  archived boolean not null default false,
  archived_at timestamptz,
  archived_by uuid null references auth.users(id),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_assignments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assignment_role text check (assignment_role is null or char_length(assignment_role) <= 80),
  is_active boolean not null default true,
  created_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create table if not exists public.project_financial_references (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  simple_invoice_client_name text check (simple_invoice_client_name is null or char_length(simple_invoice_client_name) <= 160),
  estimate_number text check (estimate_number is null or char_length(estimate_number) <= 120),
  invoice_number text check (invoice_number is null or char_length(invoice_number) <= 120),
  receipt_reference text check (receipt_reference is null or char_length(receipt_reference) <= 120),
  payment_status text check (payment_status is null or char_length(payment_status) <= 120),
  financial_notes text check (financial_notes is null or char_length(financial_notes) <= 5000),
  created_by uuid null references auth.users(id),
  updated_by uuid null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id)
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger project_assignments_set_updated_at
before update on public.project_assignments
for each row execute function public.set_updated_at();

create trigger project_financial_references_set_updated_at
before update on public.project_financial_references
for each row execute function public.set_updated_at();

create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.profiles
  where id = auth.uid()
    and is_active = true
  limit 1
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'owner'
$$;

create or replace function public.is_manager()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'manager'
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_user_role() = 'staff'
$$;

create or replace function public.is_assigned_to_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.project_assignments
    where project_id = target_project_id
      and user_id = auth.uid()
      and is_active = true
  )
$$;

create or replace function public.user_has_role(target_user_id uuid, target_role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = target_user_id
      and role = target_role
      and is_active = true
  )
$$;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_assignments enable row level security;
alter table public.project_financial_references enable row level security;

create policy "profiles_select_self_or_owner"
on public.profiles
for select
to authenticated
using (id = auth.uid() or public.is_owner());

create policy "profiles_select_manager_staff"
on public.profiles
for select
to authenticated
using (public.is_manager() and role = 'staff' and is_active = true);

create policy "profiles_insert_owner_only"
on public.profiles
for insert
to authenticated
with check (public.is_owner());

create policy "profiles_update_owner_only"
on public.profiles
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

create policy "projects_select_owner_manager_assigned"
on public.projects
for select
to authenticated
using (
  public.is_owner()
  or public.is_manager()
  or public.is_assigned_to_project(id)
);

create policy "projects_insert_owner_manager"
on public.projects
for insert
to authenticated
with check (public.is_owner() or public.is_manager());

create policy "projects_update_owner_manager"
on public.projects
for update
to authenticated
using (public.is_owner() or public.is_manager())
with check (public.is_owner() or public.is_manager());

create policy "project_assignments_select_owner_manager_self"
on public.project_assignments
for select
to authenticated
using (
  public.is_owner()
  or public.is_manager()
  or user_id = auth.uid()
);

create policy "project_assignments_insert_owner_manager"
on public.project_assignments
for insert
to authenticated
with check (
  public.is_owner()
  or (public.is_manager() and public.user_has_role(user_id, 'staff'))
);

create policy "project_assignments_update_owner_manager"
on public.project_assignments
for update
to authenticated
using (public.is_owner() or public.is_manager())
with check (
  public.is_owner()
  or (public.is_manager() and public.user_has_role(user_id, 'staff'))
);

create policy "project_financial_references_owner_select"
on public.project_financial_references
for select
to authenticated
using (public.is_owner());

create policy "project_financial_references_owner_insert"
on public.project_financial_references
for insert
to authenticated
with check (public.is_owner());

create policy "project_financial_references_owner_update"
on public.project_financial_references
for update
to authenticated
using (public.is_owner())
with check (public.is_owner());

-- No delete policies are intentionally created. Archive records instead.

-- Initial profile rows must be inserted only after Supabase Auth users exist.
-- Replace the IDs below manually after inviting/creating users:
--
-- insert into public.profiles (id, email, full_name, role)
-- values
--   ('00000000-0000-0000-0000-000000000000', 'widson@botaniquedesigners.com', 'Widson Ambaisi', 'owner'),
--   ('00000000-0000-0000-0000-000000000000', 'martine@botaniquedesigners.com', 'Martine Lotom', 'manager');
