-- BOTANIQUE DESIGNERS — BD-FIN-01A Internal Cost Claims and Principal Decision.
-- Additive, forward-only and intentionally limited to project-cost obligations before
-- money movement. This creates no funds, releases, advances, payments, allocations,
-- reconciliation, evidence, worker-master, payroll, procurement, inventory, client-
-- commercial, reporting or Simple Invoice Manager objects.

create table public.internal_cost_claims (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete restrict,
  daily_site_entry_id uuid null references public.daily_site_entries(id) on delete restrict,
  daily_site_source_version integer null check (daily_site_source_version is null or daily_site_source_version > 0),
  daily_site_snapshot jsonb null check (daily_site_snapshot is null or jsonb_typeof(daily_site_snapshot) = 'object'),
  service_date date not null,
  recipient_type text not null check (recipient_type in (
    'crew', 'staff', 'supplier', 'contractor', 'service_provider', 'other'
  )),
  recipient_label text not null check (
    char_length(trim(recipient_label)) between 1 and 160
  ),
  category text not null check (category in (
    'labour', 'mason_subcontract', 'cart_transport', 'transport', 'materials',
    'equipment_hire', 'supplier_cost', 'other'
  )),
  currency text not null default 'KES' check (currency = 'KES'),
  purpose text not null check (char_length(trim(purpose)) between 1 and 2000),
  lifecycle text not null check (lifecycle in (
    'draft', 'awaiting_review', 'amendment_requested', 'approved', 'rejected',
    'withdrawn', 'cancelled'
  )),
  request_round integer not null default 0 check (request_round >= 0),
  submitted_total numeric(14,2) null check (submitted_total is null or submitted_total > 0),
  approved_total numeric(14,2) null check (approved_total is null or approved_total > 0),
  requester_id uuid not null references public.profiles(id) on delete restrict,
  decider_id uuid null references public.profiles(id) on delete restrict,
  direct_authority_actor_id uuid null references public.profiles(id) on delete restrict,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  decided_at timestamptz null,
  withdrawn_at timestamptz null,
  cancelled_at timestamptz null,
  constraint internal_cost_claim_source_consistency check (
    (daily_site_entry_id is null and daily_site_source_version is null and daily_site_snapshot is null)
    or
    (daily_site_entry_id is not null and daily_site_source_version is not null and daily_site_snapshot is not null)
  ),
  constraint internal_cost_claim_decision_consistency check (
    (lifecycle = 'approved' and approved_total is not null)
    or (lifecycle <> 'approved' and approved_total is null)
  ),
  constraint internal_cost_claim_direct_authority_consistency check (
    direct_authority_actor_id is null
    or (lifecycle in ('approved', 'cancelled') and request_round = 0 and requester_id = direct_authority_actor_id)
  ),
  constraint internal_cost_claim_no_self_decision check (
    decider_id is null or decider_id <> requester_id
  )
);

create table public.internal_cost_claim_lines (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.internal_cost_claims(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  description text not null check (char_length(trim(description)) between 1 and 500),
  rate_type text not null check (rate_type in (
    'daily', 'task', 'lump_sum', 'piece_rate', 'transport_allowance', 'overtime', 'other'
  )),
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null check (char_length(trim(unit)) between 1 and 80),
  unit_rate numeric(14,2) not null check (unit_rate > 0),
  line_total numeric(14,2) generated always as (round(quantity * unit_rate, 2)) stored,
  created_at timestamptz not null default now(),
  unique (claim_id, line_number)
);

create table public.internal_cost_claim_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.internal_cost_claims(id) on delete restrict,
  actor_id uuid not null references public.profiles(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'amended', 'submitted', 'amendment_requested', 'resubmitted',
    'approved', 'rejected', 'withdrawn', 'cancelled', 'principal_authorised'
  )),
  previous_lifecycle text null,
  next_lifecycle text not null,
  request_round integer not null check (request_round >= 0),
  claim_snapshot jsonb not null check (jsonb_typeof(claim_snapshot) = 'object'),
  line_snapshot jsonb not null check (jsonb_typeof(line_snapshot) = 'array'),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  occurred_at timestamptz not null default now()
);

create index internal_cost_claims_project_updated_idx
  on public.internal_cost_claims (project_id, updated_at desc);
create index internal_cost_claims_lifecycle_updated_idx
  on public.internal_cost_claims (lifecycle, updated_at desc);
create index internal_cost_claims_daily_site_idx
  on public.internal_cost_claims (daily_site_entry_id)
  where daily_site_entry_id is not null;
create index internal_cost_claim_events_claim_occurred_idx
  on public.internal_cost_claim_events (claim_id, occurred_at asc, id asc);

alter table public.internal_cost_claims enable row level security;
alter table public.internal_cost_claim_lines enable row level security;
alter table public.internal_cost_claim_events enable row level security;

create or replace function public.private_active_internal_cost_claim_role()
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

create or replace function public.can_access_internal_cost_claim_project(target_project_id uuid)
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

create policy "internal_cost_claims_select_authorised"
on public.internal_cost_claims for select to authenticated
using (public.can_access_internal_cost_claim_project(project_id));

create policy "internal_cost_claim_lines_select_authorised"
on public.internal_cost_claim_lines for select to authenticated
using (exists (
  select 1 from public.internal_cost_claims claim
  where claim.id = claim_id
    and public.can_access_internal_cost_claim_project(claim.project_id)
));

create policy "internal_cost_claim_events_select_authorised"
on public.internal_cost_claim_events for select to authenticated
using (exists (
  select 1 from public.internal_cost_claims claim
  where claim.id = claim_id
    and public.can_access_internal_cost_claim_project(claim.project_id)
));

create or replace function public.internal_cost_claim_authorised_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select project.*
  from public.projects project
  where project.status = 'Ongoing'
    and not project.archived
    and project.id not in (
      'bf257eb0-e144-416c-a72e-67dfc09df3ee'::uuid,
      '0197700b-4f86-4b33-94ed-0ee208f100bb'::uuid
    )
    and public.can_access_internal_cost_claim_project(project.id)
  order by project.project_name
$$;

create or replace function public.private_assert_internal_cost_claim_project(target_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  project public.projects;
begin
  if public.private_active_internal_cost_claim_role() is null then
    raise exception 'Internal cost claims are available only to an active Principal or Operations Manager' using errcode = '42501';
  end if;
  select * into project from public.projects where id = target_project_id;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
  if project.archived or project.status <> 'Ongoing'
     or project.id in ('bf257eb0-e144-416c-a72e-67dfc09df3ee'::uuid, '0197700b-4f86-4b33-94ed-0ee208f100bb'::uuid) then
    raise exception 'Project is not eligible for an internal cost claim' using errcode = '22023';
  end if;
  if not public.can_access_internal_cost_claim_project(project.id) then
    raise exception 'You no longer have authority for this project' using errcode = '42501';
  end if;
  return project;
end;
$$;

create or replace function public.private_internal_cost_claim_daily_site_snapshot(
  target_daily_site_entry_id uuid,
  target_project_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry public.daily_site_entries;
begin
  if target_daily_site_entry_id is null then return null; end if;
  select * into entry from public.daily_site_entries where id = target_daily_site_entry_id;
  if not found then raise exception 'Daily Site source not found' using errcode = 'P0002'; end if;
  if entry.project_id <> target_project_id then
    raise exception 'Daily Site source belongs to a different project' using errcode = '22023';
  end if;
  if entry.disposition <> 'working' or entry.state not in ('submitted', 'resubmitted', 'accepted') then
    raise exception 'Daily Site source is not eligible to create or submit a cost claim' using errcode = '22023';
  end if;
  return jsonb_build_object(
    'entry_id', entry.id,
    'project_id', entry.project_id,
    'work_date', entry.work_date,
    'version', entry.version,
    'state', entry.state,
    'expected_worker_count', entry.expected_worker_count,
    'crew_reference', entry.crew_reference,
    'rate_per_worker', entry.rate_per_worker,
    'agreed_labour_total', entry.agreed_labour_total,
    'planned_labour_cost', entry.planned_labour_cost,
    'work_planned', entry.work_planned,
    'additional_amount_requested', entry.additional_amount_requested,
    'notes', entry.notes
  );
end;
$$;

create or replace function public.private_replace_internal_cost_claim_lines(
  target_claim_id uuid,
  target_lines jsonb
)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  line jsonb;
  line_position bigint;
  total numeric(14,2);
begin
  if jsonb_typeof(target_lines) <> 'array' or jsonb_array_length(target_lines) = 0 then
    raise exception 'At least one cost line is required' using errcode = '22023';
  end if;
  if jsonb_array_length(target_lines) > 100 then
    raise exception 'A claim may contain at most 100 cost lines' using errcode = '22023';
  end if;

  delete from public.internal_cost_claim_lines where claim_id = target_claim_id;
  for line, line_position in
    select value, ordinality from jsonb_array_elements(target_lines) with ordinality
  loop
    if jsonb_typeof(line) <> 'object'
       or exists (
         select 1 from jsonb_object_keys(line) key
         where key not in ('description', 'rate_type', 'quantity', 'unit', 'unit_rate')
       ) then
      raise exception 'Each cost line must contain only the supported fields' using errcode = '22023';
    end if;
    insert into public.internal_cost_claim_lines (
      claim_id, line_number, description, rate_type, quantity, unit, unit_rate
    ) values (
      target_claim_id,
      line_position,
      trim(line->>'description'),
      line->>'rate_type',
      (line->>'quantity')::numeric,
      trim(line->>'unit'),
      (line->>'unit_rate')::numeric
    );
  end loop;
  select sum(line_total) into total from public.internal_cost_claim_lines where claim_id = target_claim_id;
  if total is null or total <= 0 then raise exception 'Claim total must be greater than zero' using errcode = '22023'; end if;
  return total;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Cost line quantity and rate must be valid positive numbers' using errcode = '22023';
end;
$$;

create or replace function public.private_internal_cost_claim_snapshot(claim public.internal_cost_claims)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', claim.id, 'project_id', claim.project_id,
    'daily_site_entry_id', claim.daily_site_entry_id,
    'daily_site_source_version', claim.daily_site_source_version,
    'daily_site_snapshot', claim.daily_site_snapshot,
    'service_date', claim.service_date, 'recipient_type', claim.recipient_type,
    'recipient_label', claim.recipient_label, 'category', claim.category,
    'currency', claim.currency, 'purpose', claim.purpose,
    'lifecycle', claim.lifecycle, 'request_round', claim.request_round,
    'submitted_total', claim.submitted_total, 'approved_total', claim.approved_total,
    'requester_id', claim.requester_id, 'decider_id', claim.decider_id,
    'direct_authority_actor_id', claim.direct_authority_actor_id,
    'version', claim.version
  )
$$;

create or replace function public.private_append_internal_cost_claim_event(
  claim public.internal_cost_claims,
  target_event_type text,
  target_previous_lifecycle text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.internal_cost_claim_events (
    claim_id, actor_id, event_type, previous_lifecycle, next_lifecycle,
    request_round, claim_snapshot, line_snapshot, reason
  ) values (
    claim.id, auth.uid(), target_event_type, target_previous_lifecycle, claim.lifecycle,
    claim.request_round, public.private_internal_cost_claim_snapshot(claim),
    (select coalesce(jsonb_agg(jsonb_build_object(
      'line_number', line.line_number, 'description', line.description,
      'rate_type', line.rate_type, 'quantity', line.quantity, 'unit', line.unit,
      'unit_rate', line.unit_rate, 'line_total', line.line_total
    ) order by line.line_number), '[]'::jsonb)
    from public.internal_cost_claim_lines line where line.claim_id = claim.id),
    nullif(trim(target_reason), '')
  );
end;
$$;

create or replace function public.create_internal_cost_claim_draft(
  target_project_id uuid,
  target_daily_site_entry_id uuid,
  target_service_date date,
  target_recipient_type text,
  target_recipient_label text,
  target_category text,
  target_purpose text,
  target_lines jsonb
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_role text := public.private_active_internal_cost_claim_role();
  source_snapshot jsonb;
  claim public.internal_cost_claims;
begin
  if caller_role is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to create a claim draft' using errcode = '42501';
  end if;
  perform public.private_assert_internal_cost_claim_project(target_project_id);
  source_snapshot := public.private_internal_cost_claim_daily_site_snapshot(target_daily_site_entry_id, target_project_id);
  insert into public.internal_cost_claims (
    project_id, daily_site_entry_id, daily_site_source_version, daily_site_snapshot,
    service_date, recipient_type, recipient_label, category, purpose,
    lifecycle, requester_id
  ) values (
    target_project_id, target_daily_site_entry_id, (source_snapshot->>'version')::integer, source_snapshot,
    target_service_date, target_recipient_type, trim(target_recipient_label), target_category, trim(target_purpose),
    'draft', auth.uid()
  ) returning * into claim;
  perform public.private_replace_internal_cost_claim_lines(claim.id, target_lines);
  select * into claim from public.internal_cost_claims where id = claim.id;
  perform public.private_append_internal_cost_claim_event(claim, 'created', null, null);
  return claim;
end;
$$;

create or replace function public.update_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer,
  target_service_date date,
  target_recipient_type text,
  target_recipient_label text,
  target_category text,
  target_purpose text,
  target_lines jsonb
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  prior_lifecycle text;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to amend a claim' using errcode = '42501';
  end if;
  select * into claim from public.internal_cost_claims where id = target_claim_id for update;
  if not found then raise exception 'Cost claim not found' using errcode = 'P0002'; end if;
  perform public.private_assert_internal_cost_claim_project(claim.project_id);
  if claim.requester_id <> auth.uid() then raise exception 'Only the requester may amend this claim' using errcode = '42501'; end if;
  if claim.lifecycle not in ('draft', 'amendment_requested') then raise exception 'This claim can no longer be edited' using errcode = '22023'; end if;
  if claim.version <> target_expected_version then raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001'; end if;
  prior_lifecycle := claim.lifecycle;
  perform public.private_replace_internal_cost_claim_lines(claim.id, target_lines);
  update public.internal_cost_claims set
    service_date = target_service_date, recipient_type = target_recipient_type,
    recipient_label = trim(target_recipient_label), category = target_category,
    purpose = trim(target_purpose), version = version + 1, updated_at = now()
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, 'amended', prior_lifecycle, null);
  return claim;
end;
$$;

create or replace function public.submit_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  total numeric(14,2);
  prior_lifecycle text;
  next_event text;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to submit a claim' using errcode = '42501';
  end if;
  select * into claim from public.internal_cost_claims where id = target_claim_id for update;
  if not found then raise exception 'Cost claim not found' using errcode = 'P0002'; end if;
  perform public.private_assert_internal_cost_claim_project(claim.project_id);
  if claim.requester_id <> auth.uid() then raise exception 'Only the requester may submit this claim' using errcode = '42501'; end if;
  if claim.lifecycle not in ('draft', 'amendment_requested') then raise exception 'This claim is not eligible for submission' using errcode = '22023'; end if;
  if claim.version <> target_expected_version then raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001'; end if;
  if claim.daily_site_entry_id is not null then
    perform public.private_internal_cost_claim_daily_site_snapshot(claim.daily_site_entry_id, claim.project_id);
  end if;
  select sum(line_total) into total from public.internal_cost_claim_lines where claim_id = claim.id;
  if total is null or total <= 0 then raise exception 'At least one positive cost line is required' using errcode = '22023'; end if;
  prior_lifecycle := claim.lifecycle;
  next_event := case when prior_lifecycle = 'draft' then 'submitted' else 'resubmitted' end;
  update public.internal_cost_claims set
    lifecycle = 'awaiting_review', request_round = request_round + 1,
    submitted_total = total, version = version + 1, updated_at = now(), submitted_at = now()
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, next_event, prior_lifecycle, null);
  return claim;
end;
$$;

create or replace function public.withdraw_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer,
  target_reason text default null
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare claim public.internal_cost_claims; prior_lifecycle text;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'manager' then raise exception 'Operations Manager authority is required' using errcode = '42501'; end if;
  select * into claim from public.internal_cost_claims where id = target_claim_id for update;
  if not found then raise exception 'Cost claim not found' using errcode = 'P0002'; end if;
  perform public.private_assert_internal_cost_claim_project(claim.project_id);
  if claim.requester_id <> auth.uid() then raise exception 'Only the requester may withdraw this claim' using errcode = '42501'; end if;
  if claim.lifecycle not in ('awaiting_review', 'amendment_requested') then raise exception 'This claim cannot be withdrawn now' using errcode = '22023'; end if;
  if claim.version <> target_expected_version then raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001'; end if;
  prior_lifecycle := claim.lifecycle;
  update public.internal_cost_claims set lifecycle = 'withdrawn', approved_total = null,
    version = version + 1, updated_at = now(), withdrawn_at = now()
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, 'withdrawn', prior_lifecycle, target_reason);
  return claim;
end;
$$;

create or replace function public.decide_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer,
  target_decision text,
  target_reason text default null
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare claim public.internal_cost_claims; total numeric(14,2); next_lifecycle text;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'owner' then raise exception 'Principal authority is required' using errcode = '42501'; end if;
  if target_decision not in ('approved', 'rejected', 'amendment_requested') then raise exception 'Unsupported claim decision' using errcode = '22023'; end if;
  if target_decision in ('rejected', 'amendment_requested') and nullif(trim(target_reason), '') is null then raise exception 'A reason is required for this decision' using errcode = '22023'; end if;
  select * into claim from public.internal_cost_claims where id = target_claim_id for update;
  if not found then raise exception 'Cost claim not found' using errcode = 'P0002'; end if;
  perform public.private_assert_internal_cost_claim_project(claim.project_id);
  if claim.requester_id = auth.uid() then raise exception 'A requester cannot decide their own claim' using errcode = '42501'; end if;
  if claim.lifecycle <> 'awaiting_review' then raise exception 'This claim is not awaiting a decision' using errcode = '22023'; end if;
  if claim.version <> target_expected_version then raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001'; end if;
  select sum(line_total) into total from public.internal_cost_claim_lines where claim_id = claim.id;
  if total is distinct from claim.submitted_total then raise exception 'Claim lines no longer match the submitted total' using errcode = '40001'; end if;
  next_lifecycle := target_decision;
  update public.internal_cost_claims set lifecycle = next_lifecycle,
    approved_total = case when next_lifecycle = 'approved' then submitted_total else null end,
    decider_id = auth.uid(), version = version + 1, updated_at = now(),
    decided_at = case when next_lifecycle in ('approved', 'rejected') then now() else null end
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, target_decision, 'awaiting_review', target_reason);
  return claim;
end;
$$;

create or replace function public.principal_authorise_internal_cost_claim(
  target_project_id uuid,
  target_daily_site_entry_id uuid,
  target_service_date date,
  target_recipient_type text,
  target_recipient_label text,
  target_category text,
  target_purpose text,
  target_lines jsonb,
  target_reason text default null
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare source_snapshot jsonb; claim public.internal_cost_claims; total numeric(14,2);
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'owner' then raise exception 'Principal authority is required' using errcode = '42501'; end if;
  perform public.private_assert_internal_cost_claim_project(target_project_id);
  source_snapshot := public.private_internal_cost_claim_daily_site_snapshot(target_daily_site_entry_id, target_project_id);
  insert into public.internal_cost_claims (
    project_id, daily_site_entry_id, daily_site_source_version, daily_site_snapshot,
    service_date, recipient_type, recipient_label, category, purpose,
    lifecycle, request_round, requester_id
  ) values (
    target_project_id, target_daily_site_entry_id, (source_snapshot->>'version')::integer, source_snapshot,
    target_service_date, target_recipient_type, trim(target_recipient_label), target_category,
    trim(target_purpose), 'draft', 0, auth.uid()
  ) returning * into claim;
  total := public.private_replace_internal_cost_claim_lines(claim.id, target_lines);
  update public.internal_cost_claims set lifecycle = 'approved', submitted_total = total,
    approved_total = total, direct_authority_actor_id = auth.uid(), decided_at = now()
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, 'principal_authorised', null, target_reason);
  return claim;
end;
$$;

create or replace function public.cancel_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare claim public.internal_cost_claims;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'owner' then raise exception 'Principal authority is required' using errcode = '42501'; end if;
  if nullif(trim(target_reason), '') is null then raise exception 'A cancellation reason is required' using errcode = '22023'; end if;
  select * into claim from public.internal_cost_claims where id = target_claim_id for update;
  if not found then raise exception 'Cost claim not found' using errcode = 'P0002'; end if;
  perform public.private_assert_internal_cost_claim_project(claim.project_id);
  if claim.lifecycle <> 'approved' then raise exception 'Only an approved claim may be cancelled' using errcode = '22023'; end if;
  if claim.version <> target_expected_version then raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001'; end if;
  update public.internal_cost_claims set lifecycle = 'cancelled', approved_total = null,
    version = version + 1, updated_at = now(), cancelled_at = now()
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, 'cancelled', 'approved', target_reason);
  return claim;
end;
$$;

create or replace function public.private_reject_internal_cost_claim_event_change()
returns trigger language plpgsql
set search_path = pg_catalog, public
as $$ begin raise exception 'Internal cost claim events are immutable' using errcode = '42501'; end; $$;

create trigger internal_cost_claim_events_immutable
before update or delete on public.internal_cost_claim_events
for each row execute function public.private_reject_internal_cost_claim_event_change();

revoke all on public.internal_cost_claims from anon, authenticated;
revoke all on public.internal_cost_claim_lines from anon, authenticated;
revoke all on public.internal_cost_claim_events from anon, authenticated;
grant select on public.internal_cost_claims, public.internal_cost_claim_lines, public.internal_cost_claim_events to authenticated;

revoke execute on function public.private_active_internal_cost_claim_role() from public, anon, authenticated;
revoke execute on function public.private_assert_internal_cost_claim_project(uuid) from public, anon, authenticated;
revoke execute on function public.private_internal_cost_claim_daily_site_snapshot(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.private_replace_internal_cost_claim_lines(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.private_internal_cost_claim_snapshot(public.internal_cost_claims) from public, anon, authenticated;
revoke execute on function public.private_append_internal_cost_claim_event(public.internal_cost_claims, text, text, text) from public, anon, authenticated;
revoke execute on function public.private_reject_internal_cost_claim_event_change() from public, anon, authenticated;

revoke execute on function public.can_access_internal_cost_claim_project(uuid) from public, anon;
revoke execute on function public.internal_cost_claim_authorised_projects() from public, anon;
revoke execute on function public.create_internal_cost_claim_draft(uuid, uuid, date, text, text, text, text, jsonb) from public, anon;
revoke execute on function public.update_internal_cost_claim(uuid, integer, date, text, text, text, text, jsonb) from public, anon;
revoke execute on function public.submit_internal_cost_claim(uuid, integer) from public, anon;
revoke execute on function public.withdraw_internal_cost_claim(uuid, integer, text) from public, anon;
revoke execute on function public.decide_internal_cost_claim(uuid, integer, text, text) from public, anon;
revoke execute on function public.principal_authorise_internal_cost_claim(uuid, uuid, date, text, text, text, text, jsonb, text) from public, anon;
revoke execute on function public.cancel_internal_cost_claim(uuid, integer, text) from public, anon;

grant execute on function public.can_access_internal_cost_claim_project(uuid) to authenticated;
grant execute on function public.internal_cost_claim_authorised_projects() to authenticated;
grant execute on function public.create_internal_cost_claim_draft(uuid, uuid, date, text, text, text, text, jsonb) to authenticated;
grant execute on function public.update_internal_cost_claim(uuid, integer, date, text, text, text, text, jsonb) to authenticated;
grant execute on function public.submit_internal_cost_claim(uuid, integer) to authenticated;
grant execute on function public.withdraw_internal_cost_claim(uuid, integer, text) to authenticated;
grant execute on function public.decide_internal_cost_claim(uuid, integer, text, text) to authenticated;
grant execute on function public.principal_authorise_internal_cost_claim(uuid, uuid, date, text, text, text, text, jsonb, text) to authenticated;
grant execute on function public.cancel_internal_cost_claim(uuid, integer, text) to authenticated;
