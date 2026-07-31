-- BOTANIQUE DESIGNERS — BD-FIN-01B1 Claim-Backed Fund Requests.
-- Additive and forward-only. This records Principal authority to make money available
-- against approved BD-FIN-01A internal cost claims. It creates no fund release, transfer,
-- advance receipt, payment, payment allocation, supplier settlement, worker payment status,
-- evidence, proof of payment, reconciliation, return, dispute, reversal, carry-forward,
-- dashboard, profitability, supplier/worker master or Simple Invoice Manager object.
--
-- An approved fund request authorises Botanique to make up to the approved amount available
-- for the identified project claims. It is not evidence that funds were released.

create sequence public.fund_request_number_seq as bigint start with 1 increment by 1;

create table public.fund_requests (
  id uuid primary key default gen_random_uuid(),
  request_sequence bigint not null default nextval('public.fund_request_number_seq'),
  request_number text not null,
  project_id uuid not null references public.projects(id) on delete restrict,
  authority_type text not null check (authority_type in ('manager_requested', 'principal_direct')),
  status text not null check (status in (
    'draft', 'submitted', 'amendment_requested', 'approved', 'rejected', 'withdrawn', 'cancelled'
  )),
  requester_id uuid null references public.profiles(id) on delete restrict,
  direct_authority_actor_id uuid null references public.profiles(id) on delete restrict,
  intended_custody_type text not null check (intended_custody_type in (
    'operations_manager_accountable_advance', 'direct_recipient_funding'
  )),
  custodian_profile_id uuid null references public.profiles(id) on delete restrict,
  purpose text not null check (char_length(trim(purpose)) between 1 and 2000),
  currency text not null default 'KES' check (currency = 'KES'),
  total_requested_amount numeric(14,2) null check (
    total_requested_amount is null or total_requested_amount > 0
  ),
  submission_round integer not null default 0 check (submission_round >= 0),
  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  submitted_by uuid null references public.profiles(id) on delete restrict,
  decided_by uuid null references public.profiles(id) on delete restrict,
  withdrawn_by uuid null references public.profiles(id) on delete restrict,
  cancelled_by uuid null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  submitted_at timestamptz null,
  decided_at timestamptz null,
  withdrawn_at timestamptz null,
  cancelled_at timestamptz null,
  constraint fund_requests_request_number_unique unique (request_number),
  constraint fund_requests_request_sequence_unique unique (request_sequence),
  -- Principal direct authority is a distinct authority path, never a manager request that
  -- was self-submitted and self-approved.
  constraint fund_request_authority_consistency check (
    (authority_type = 'manager_requested'
      and requester_id is not null
      and direct_authority_actor_id is null)
    or
    (authority_type = 'principal_direct'
      and direct_authority_actor_id is not null
      and requester_id is null
      and submission_round = 0
      and status in ('approved', 'cancelled'))
  ),
  constraint fund_request_no_self_decision check (
    decided_by is null or requester_id is null or decided_by <> requester_id
  ),
  -- Intended custody records intent only; it is never evidence of a release.
  constraint fund_request_custody_consistency check (
    (intended_custody_type = 'operations_manager_accountable_advance' and custodian_profile_id is not null)
    or (intended_custody_type = 'direct_recipient_funding' and custodian_profile_id is null)
  ),
  -- The reserving-status total and its equality with the allocation set are enforced by the
  -- deferrable constraint trigger fund_requests_total_matches_allocations below, because a
  -- request row must exist before its allocations can reference it.
  -- A draft has not been submitted; anything that has been reviewed has a round.
  constraint fund_request_submission_round_consistency check (
    (status = 'draft' and submission_round = 0)
    or (status in ('submitted', 'amendment_requested', 'rejected') and submission_round >= 1)
    or status in ('approved', 'cancelled', 'withdrawn')
  )
);

create table public.fund_request_allocations (
  id uuid primary key default gen_random_uuid(),
  fund_request_id uuid not null references public.fund_requests(id) on delete restrict,
  internal_cost_claim_id uuid not null references public.internal_cost_claims(id) on delete restrict,
  allocation_order integer not null check (allocation_order > 0),
  requested_amount numeric(14,2) not null check (requested_amount > 0),
  -- Audit snapshots frozen at allocation time. BD-FIN-01A claims carry no human-readable
  -- claim number, so the reference below is derived from the immutable claim id.
  claim_reference_snapshot text not null check (char_length(trim(claim_reference_snapshot)) between 1 and 80),
  claim_service_date_snapshot date not null,
  claim_recipient_type_snapshot text not null,
  claim_recipient_label_snapshot text not null,
  claim_category_snapshot text not null,
  claim_purpose_snapshot text not null,
  claim_approved_total_snapshot numeric(14,2) not null check (claim_approved_total_snapshot > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fund_request_allocation_claim_unique unique (fund_request_id, internal_cost_claim_id),
  constraint fund_request_allocation_order_unique unique (fund_request_id, allocation_order),
  constraint fund_request_allocation_not_over_claim check (
    requested_amount <= claim_approved_total_snapshot
  )
);

create table public.fund_request_events (
  id uuid primary key default gen_random_uuid(),
  fund_request_id uuid not null references public.fund_requests(id) on delete restrict,
  event_type text not null check (event_type in (
    'draft_created', 'draft_updated', 'submitted', 'amendment_requested', 'resubmitted',
    'approved', 'rejected', 'withdrawn', 'cancelled', 'principal_direct_authorised'
  )),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status text null,
  to_status text not null,
  request_version integer not null check (request_version > 0),
  submission_round integer not null check (submission_round >= 0),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index fund_requests_project_updated_idx
  on public.fund_requests (project_id, updated_at desc);
create index fund_requests_status_updated_idx
  on public.fund_requests (status, updated_at desc);
create index fund_request_allocations_claim_idx
  on public.fund_request_allocations (internal_cost_claim_id);
create index fund_request_events_request_created_idx
  on public.fund_request_events (fund_request_id, created_at asc, id asc);

alter table public.fund_requests enable row level security;
alter table public.fund_request_allocations enable row level security;
alter table public.fund_request_events enable row level security;

-- ---------------------------------------------------------------------------
-- Role, project eligibility and reserving-status helpers.
-- The BD-FIN-01A role, project-eligibility, archive and excluded-fixture model is reused
-- rather than duplicated; no parallel role system is introduced.
-- ---------------------------------------------------------------------------

create or replace function public.private_fund_request_reserving_statuses()
returns text[]
language sql
immutable
set search_path = pg_catalog, public
as $$
  select array['submitted', 'amendment_requested', 'approved']::text[]
$$;

create or replace function public.private_active_fund_request_role()
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

create or replace function public.private_assert_fund_request_project(target_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  project public.projects;
begin
  if public.private_active_fund_request_role() is null then
    raise exception 'Fund requests are available only to an active Principal or Operations Manager'
      using errcode = '42501';
  end if;
  if not exists (select 1 from public.projects where id = target_project_id) then
    raise exception 'Project not found' using errcode = 'P0002';
  end if;
  -- Single source of eligibility truth: Ongoing, not archived, not an excluded fixture and
  -- within the caller's finance project authority.
  select * into project
  from public.internal_cost_claim_authorised_projects() candidate
  where candidate.id = target_project_id;
  if not found then
    raise exception 'Project is not eligible for a fund request' using errcode = '22023';
  end if;
  return project;
end;
$$;

create or replace function public.private_assert_fund_request_custody(
  target_intended_custody_type text,
  target_custodian_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_intended_custody_type not in ('operations_manager_accountable_advance', 'direct_recipient_funding') then
    raise exception 'Unsupported intended custody type' using errcode = '22023';
  end if;
  if target_intended_custody_type = 'operations_manager_accountable_advance' then
    if target_custodian_profile_id is null then
      raise exception 'An intended accountable advance requires an Operations Manager custodian'
        using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = target_custodian_profile_id and p.is_active and p.role = 'manager'
    ) then
      raise exception 'The custodian must be an active Operations Manager' using errcode = '22023';
    end if;
  elsif target_custodian_profile_id is not null then
    raise exception 'Intended direct recipient funding does not carry a custodian' using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Single shared reservation implementation. Every public RPC that creates or modifies
-- reservations routes through this function so locking, ordering, eligibility and the
-- no-over-request rule can never diverge between call sites.
-- ---------------------------------------------------------------------------

create or replace function public.private_replace_fund_request_allocations(
  target_request_id uuid,
  target_project_id uuid,
  target_allocations jsonb,
  target_enforce_availability boolean,
  target_require_allocations boolean
)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry record;
  claim public.internal_cost_claims;
  reserved_elsewhere numeric(14,2);
  total numeric(14,2);
begin
  if jsonb_typeof(target_allocations) <> 'array' then
    raise exception 'Fund request allocations must be supplied as a list' using errcode = '22023';
  end if;
  if target_require_allocations and jsonb_array_length(target_allocations) = 0 then
    raise exception 'At least one approved claim allocation is required' using errcode = '22023';
  end if;
  if jsonb_array_length(target_allocations) > 50 then
    raise exception 'A fund request may contain at most 50 claim allocations' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(target_allocations) element
    where jsonb_typeof(element) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(element) key
        where key not in ('claim_id', 'requested_amount')
      )
  ) then
    raise exception 'Each allocation must contain only a claim and a requested amount' using errcode = '22023';
  end if;

  delete from public.fund_request_allocations where fund_request_id = target_request_id;

  if jsonb_array_length(target_allocations) = 0 then
    return null;
  end if;

  if exists (
    select 1
    from jsonb_array_elements(target_allocations) element
    group by (element->>'claim_id')
    having count(*) > 1
  ) then
    raise exception 'One approved claim may appear only once in a fund request' using errcode = '22023';
  end if;

  -- Deterministic lock ordering across concurrent requests: always lock the referenced
  -- approved claims in ascending claim-id order before any availability is calculated.
  perform 1
  from public.internal_cost_claims locked
  where locked.id in (
    select (element->>'claim_id')::uuid
    from jsonb_array_elements(target_allocations) element
  )
  order by locked.id
  for update;

  for entry in
    select
      ordinality as allocation_order,
      (value->>'claim_id')::uuid as claim_id,
      (value->>'requested_amount')::numeric as requested_amount
    from jsonb_array_elements(target_allocations) with ordinality
    order by ordinality
  loop
    if entry.requested_amount is null or entry.requested_amount <= 0 then
      raise exception 'Each allocation must request a positive amount' using errcode = '22023';
    end if;

    select * into claim from public.internal_cost_claims where id = entry.claim_id;
    if not found then
      raise exception 'Approved claim not found' using errcode = 'P0002';
    end if;
    if claim.project_id <> target_project_id then
      raise exception 'A fund request may only allocate claims from its own project' using errcode = '22023';
    end if;
    if claim.lifecycle <> 'approved' or claim.approved_total is null then
      raise exception 'Only an approved internal cost claim may back a fund request' using errcode = '22023';
    end if;

    if target_enforce_availability then
      select coalesce(sum(allocation.requested_amount), 0)
        into reserved_elsewhere
      from public.fund_request_allocations allocation
      join public.fund_requests request on request.id = allocation.fund_request_id
      where allocation.internal_cost_claim_id = claim.id
        and request.id <> target_request_id
        and request.status = any (public.private_fund_request_reserving_statuses());

      if reserved_elsewhere + entry.requested_amount > claim.approved_total then
        raise exception
          'Claim %: KES % of KES % is already reserved by another fund request, so KES % is no longer available to request',
          claim.recipient_label, reserved_elsewhere, claim.approved_total,
          entry.requested_amount
          using errcode = 'BDF01';
      end if;
    elsif entry.requested_amount > claim.approved_total then
      raise exception 'An allocation may not exceed the approved claim amount' using errcode = '22023';
    end if;

    insert into public.fund_request_allocations (
      fund_request_id, internal_cost_claim_id, allocation_order, requested_amount,
      claim_reference_snapshot, claim_service_date_snapshot, claim_recipient_type_snapshot,
      claim_recipient_label_snapshot, claim_category_snapshot, claim_purpose_snapshot,
      claim_approved_total_snapshot
    ) values (
      target_request_id, claim.id, entry.allocation_order, entry.requested_amount,
      'ICC-' || upper(substr(replace(claim.id::text, '-', ''), 1, 8)),
      claim.service_date, claim.recipient_type, claim.recipient_label, claim.category,
      claim.purpose, claim.approved_total
    );
  end loop;

  select sum(requested_amount) into total
  from public.fund_request_allocations where fund_request_id = target_request_id;
  if total is null or total <= 0 then
    raise exception 'A fund request total must be greater than zero' using errcode = '22023';
  end if;
  return total;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Each allocation must reference a valid claim and a valid positive amount'
      using errcode = '22023';
end;
$$;

-- Verification counterpart to the writer above. Submission, resubmission and Principal
-- approval must re-prove availability under the same deterministic lock ordering, but must
-- never rewrite a stored allocation snapshot, so this function only reads and asserts.
create or replace function public.private_verify_fund_request_reservations(
  target_request_id uuid,
  target_project_id uuid
)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry record;
  claim public.internal_cost_claims;
  reserved_elsewhere numeric(14,2);
  total numeric(14,2);
begin
  if not exists (
    select 1 from public.fund_request_allocations where fund_request_id = target_request_id
  ) then
    raise exception 'At least one approved claim allocation is required' using errcode = '22023';
  end if;

  perform 1
  from public.internal_cost_claims locked
  where locked.id in (
    select allocation.internal_cost_claim_id
    from public.fund_request_allocations allocation
    where allocation.fund_request_id = target_request_id
  )
  order by locked.id
  for update;

  for entry in
    select allocation.internal_cost_claim_id as claim_id, allocation.requested_amount
    from public.fund_request_allocations allocation
    where allocation.fund_request_id = target_request_id
    order by allocation.allocation_order
  loop
    select * into claim from public.internal_cost_claims where id = entry.claim_id;
    if not found then
      raise exception 'Approved claim not found' using errcode = 'P0002';
    end if;
    if claim.project_id <> target_project_id then
      raise exception 'A fund request may only allocate claims from its own project' using errcode = '22023';
    end if;
    if claim.lifecycle <> 'approved' or claim.approved_total is null then
      raise exception 'Only an approved internal cost claim may back a fund request' using errcode = '22023';
    end if;

    select coalesce(sum(other_allocation.requested_amount), 0)
      into reserved_elsewhere
    from public.fund_request_allocations other_allocation
    join public.fund_requests request on request.id = other_allocation.fund_request_id
    where other_allocation.internal_cost_claim_id = claim.id
      and request.id <> target_request_id
      and request.status = any (public.private_fund_request_reserving_statuses());

    if reserved_elsewhere + entry.requested_amount > claim.approved_total then
      raise exception
        'Claim %: KES % of KES % is already reserved by another fund request, so KES % is no longer available to request',
        claim.recipient_label, reserved_elsewhere, claim.approved_total, entry.requested_amount
        using errcode = 'BDF01';
    end if;
  end loop;

  select sum(requested_amount) into total
  from public.fund_request_allocations where fund_request_id = target_request_id;
  return total;
end;
$$;

create or replace function public.private_fund_request_snapshot(request public.fund_requests)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'request', jsonb_build_object(
      'id', request.id, 'request_number', request.request_number,
      'project_id', request.project_id, 'authority_type', request.authority_type,
      'status', request.status, 'requester_id', request.requester_id,
      'direct_authority_actor_id', request.direct_authority_actor_id,
      'intended_custody_type', request.intended_custody_type,
      'custodian_profile_id', request.custodian_profile_id,
      'purpose', request.purpose, 'currency', request.currency,
      'total_requested_amount', request.total_requested_amount,
      'submission_round', request.submission_round, 'version', request.version
    ),
    'allocations', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'internal_cost_claim_id', allocation.internal_cost_claim_id,
        'allocation_order', allocation.allocation_order,
        'requested_amount', allocation.requested_amount,
        'claim_reference_snapshot', allocation.claim_reference_snapshot,
        'claim_recipient_label_snapshot', allocation.claim_recipient_label_snapshot,
        'claim_category_snapshot', allocation.claim_category_snapshot,
        'claim_approved_total_snapshot', allocation.claim_approved_total_snapshot
      ) order by allocation.allocation_order), '[]'::jsonb)
      from public.fund_request_allocations allocation
      where allocation.fund_request_id = request.id
    )
  )
$$;

create or replace function public.private_append_fund_request_event(
  request public.fund_requests,
  target_event_type text,
  target_from_status text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.fund_request_events (
    fund_request_id, event_type, actor_id, from_status, to_status,
    request_version, submission_round, reason, payload
  ) values (
    request.id, target_event_type, auth.uid(), target_from_status, request.status,
    request.version, request.submission_round, nullif(trim(target_reason), ''),
    public.private_fund_request_snapshot(request)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Read surface: approved-claim availability for one project.
-- ---------------------------------------------------------------------------

create or replace function public.fund_request_claim_availability(
  target_project_id uuid,
  target_request_id uuid default null
)
returns table (
  claim_id uuid,
  project_id uuid,
  claim_reference text,
  service_date date,
  recipient_type text,
  recipient_label text,
  category text,
  purpose text,
  approved_total numeric,
  reserved_elsewhere numeric,
  requested_in_request numeric,
  available_to_request numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    claim.id,
    claim.project_id,
    'ICC-' || upper(substr(replace(claim.id::text, '-', ''), 1, 8)),
    claim.service_date,
    claim.recipient_type,
    claim.recipient_label,
    claim.category,
    claim.purpose,
    claim.approved_total,
    reserved.reserved_elsewhere,
    mine.requested_in_request,
    greatest(claim.approved_total - reserved.reserved_elsewhere, 0)
  from public.internal_cost_claims claim
  cross join lateral (
    select coalesce(sum(allocation.requested_amount), 0)::numeric(14,2) as reserved_elsewhere
    from public.fund_request_allocations allocation
    join public.fund_requests request on request.id = allocation.fund_request_id
    where allocation.internal_cost_claim_id = claim.id
      and (target_request_id is null or request.id <> target_request_id)
      and request.status = any (public.private_fund_request_reserving_statuses())
  ) reserved
  cross join lateral (
    select coalesce(sum(allocation.requested_amount), 0)::numeric(14,2) as requested_in_request
    from public.fund_request_allocations allocation
    where target_request_id is not null
      and allocation.fund_request_id = target_request_id
      and allocation.internal_cost_claim_id = claim.id
  ) mine
  where claim.project_id = target_project_id
    and claim.lifecycle = 'approved'
    and claim.approved_total is not null
    and public.can_access_internal_cost_claim_project(claim.project_id)
  order by claim.service_date desc, claim.recipient_label
$$;

-- ---------------------------------------------------------------------------
-- Operations Manager lifecycle.
-- ---------------------------------------------------------------------------

create or replace function public.create_fund_request_draft(
  target_project_id uuid,
  target_intended_custody_type text,
  target_custodian_profile_id uuid,
  target_purpose text,
  target_allocations jsonb default '[]'::jsonb
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  total numeric(14,2);
begin
  if public.private_active_fund_request_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to create a fund request draft'
      using errcode = '42501';
  end if;
  perform public.private_assert_fund_request_project(target_project_id);
  perform public.private_assert_fund_request_custody(target_intended_custody_type, target_custodian_profile_id);

  insert into public.fund_requests (
    project_id, authority_type, status, requester_id, intended_custody_type,
    custodian_profile_id, purpose, submission_round, created_by, updated_by
  ) values (
    target_project_id, 'manager_requested', 'draft', auth.uid(), target_intended_custody_type,
    target_custodian_profile_id, trim(target_purpose), 0, auth.uid(), auth.uid()
  ) returning * into request;

  -- A draft never reserves claim value, so availability is not enforced here.
  total := public.private_replace_fund_request_allocations(
    request.id, target_project_id, target_allocations, false, false
  );
  update public.fund_requests set total_requested_amount = total where id = request.id
    returning * into request;
  perform public.private_append_fund_request_event(request, 'draft_created', null, null);
  return request;
end;
$$;

create or replace function public.update_fund_request(
  target_request_id uuid,
  target_expected_version integer,
  target_intended_custody_type text,
  target_custodian_profile_id uuid,
  target_purpose text,
  target_allocations jsonb
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  prior_status text;
  total numeric(14,2);
begin
  if public.private_active_fund_request_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to edit a fund request' using errcode = '42501';
  end if;
  select * into request from public.fund_requests where id = target_request_id for update;
  if not found then raise exception 'Fund request not found' using errcode = 'P0002'; end if;
  perform public.private_assert_fund_request_project(request.project_id);
  if request.requester_id is distinct from auth.uid() then
    raise exception 'Only the requester may edit this fund request' using errcode = '42501';
  end if;
  if request.status not in ('draft', 'amendment_requested') then
    raise exception 'This fund request can no longer be edited' using errcode = '22023';
  end if;
  if request.version <> target_expected_version then
    raise exception 'Stale fund request version; refresh and try again' using errcode = '40001';
  end if;
  perform public.private_assert_fund_request_custody(target_intended_custody_type, target_custodian_profile_id);

  prior_status := request.status;
  -- An amendment-requested record keeps reserving, so its revised allocations must pass the
  -- no-over-request rule immediately. A draft still does not reserve.
  total := public.private_replace_fund_request_allocations(
    request.id, request.project_id, target_allocations,
    prior_status = 'amendment_requested', prior_status = 'amendment_requested'
  );

  update public.fund_requests set
    intended_custody_type = target_intended_custody_type,
    custodian_profile_id = target_custodian_profile_id,
    purpose = trim(target_purpose),
    total_requested_amount = total,
    version = version + 1,
    updated_by = auth.uid(),
    updated_at = now()
  where id = request.id returning * into request;
  perform public.private_append_fund_request_event(request, 'draft_updated', prior_status, null);
  return request;
end;
$$;

create or replace function public.submit_fund_request(
  target_request_id uuid,
  target_expected_version integer
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  prior_status text;
  next_event text;
  total numeric(14,2);
begin
  if public.private_active_fund_request_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to submit a fund request' using errcode = '42501';
  end if;
  select * into request from public.fund_requests where id = target_request_id for update;
  if not found then raise exception 'Fund request not found' using errcode = 'P0002'; end if;
  perform public.private_assert_fund_request_project(request.project_id);
  if request.requester_id is distinct from auth.uid() then
    raise exception 'Only the requester may submit this fund request' using errcode = '42501';
  end if;
  if request.status not in ('draft', 'amendment_requested') then
    raise exception 'This fund request is not eligible for submission' using errcode = '22023';
  end if;
  if request.version <> target_expected_version then
    raise exception 'Stale fund request version; refresh and try again' using errcode = '40001';
  end if;

  prior_status := request.status;
  next_event := case when prior_status = 'draft' then 'submitted' else 'resubmitted' end;

  -- A draft's availability was only advisory, so submission is the first point at which the
  -- no-over-request rule binds. Resubmission re-proves it against the current field.
  total := public.private_verify_fund_request_reservations(request.id, request.project_id);

  update public.fund_requests set
    status = 'submitted',
    submission_round = submission_round + 1,
    total_requested_amount = total,
    version = version + 1,
    submitted_by = auth.uid(),
    submitted_at = now(),
    updated_by = auth.uid(),
    updated_at = now()
  where id = request.id returning * into request;
  perform public.private_append_fund_request_event(request, next_event, prior_status, null);
  return request;
end;
$$;

create or replace function public.withdraw_fund_request(
  target_request_id uuid,
  target_expected_version integer,
  target_reason text default null
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  prior_status text;
begin
  if public.private_active_fund_request_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to withdraw a fund request' using errcode = '42501';
  end if;
  select * into request from public.fund_requests where id = target_request_id for update;
  if not found then raise exception 'Fund request not found' using errcode = 'P0002'; end if;
  perform public.private_assert_fund_request_project(request.project_id);
  if request.requester_id is distinct from auth.uid() then
    raise exception 'Only the requester may withdraw this fund request' using errcode = '42501';
  end if;
  if request.status not in ('draft', 'submitted', 'amendment_requested') then
    raise exception 'This fund request cannot be withdrawn now' using errcode = '22023';
  end if;
  if request.version <> target_expected_version then
    raise exception 'Stale fund request version; refresh and try again' using errcode = '40001';
  end if;
  if request.status <> 'draft' and nullif(trim(target_reason), '') is null then
    raise exception 'A reason is required to withdraw a submitted fund request' using errcode = '22023';
  end if;

  prior_status := request.status;
  update public.fund_requests set
    status = 'withdrawn', version = version + 1,
    withdrawn_by = auth.uid(), withdrawn_at = now(),
    updated_by = auth.uid(), updated_at = now()
  where id = request.id returning * into request;
  perform public.private_append_fund_request_event(request, 'withdrawn', prior_status, target_reason);
  return request;
end;
$$;

-- ---------------------------------------------------------------------------
-- Principal authority.
-- ---------------------------------------------------------------------------

create or replace function public.decide_fund_request(
  target_request_id uuid,
  target_expected_version integer,
  target_decision text,
  target_reason text default null
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  total numeric(14,2);
begin
  if public.private_active_fund_request_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to decide a fund request' using errcode = '42501';
  end if;
  if target_decision not in ('approved', 'rejected', 'amendment_requested') then
    raise exception 'Unsupported fund request decision' using errcode = '22023';
  end if;
  if target_decision in ('rejected', 'amendment_requested')
     and nullif(trim(target_reason), '') is null then
    raise exception 'A reason is required for this decision' using errcode = '22023';
  end if;
  select * into request from public.fund_requests where id = target_request_id for update;
  if not found then raise exception 'Fund request not found' using errcode = 'P0002'; end if;
  perform public.private_assert_fund_request_project(request.project_id);
  if request.requester_id = auth.uid() then
    raise exception 'A requester cannot decide their own fund request' using errcode = '42501';
  end if;
  if request.status <> 'submitted' then
    raise exception 'This fund request is not awaiting a decision' using errcode = '22023';
  end if;
  if request.version <> target_expected_version then
    raise exception 'Stale fund request version; refresh and try again' using errcode = '40001';
  end if;

  if target_decision = 'approved' then
    total := public.private_verify_fund_request_reservations(request.id, request.project_id);
    if total is distinct from request.total_requested_amount then
      raise exception 'Fund request allocations no longer match the submitted total' using errcode = '40001';
    end if;
  end if;

  update public.fund_requests set
    status = target_decision,
    decided_by = auth.uid(),
    decided_at = case when target_decision in ('approved', 'rejected') then now() else null end,
    version = version + 1,
    updated_by = auth.uid(),
    updated_at = now()
  where id = request.id returning * into request;
  perform public.private_append_fund_request_event(request, target_decision, 'submitted', target_reason);
  return request;
end;
$$;

create or replace function public.direct_authorise_fund_request(
  target_project_id uuid,
  target_intended_custody_type text,
  target_custodian_profile_id uuid,
  target_purpose text,
  target_allocations jsonb,
  target_reason text default null
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  total numeric(14,2);
begin
  if public.private_active_fund_request_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to authorise funds directly' using errcode = '42501';
  end if;
  perform public.private_assert_fund_request_project(target_project_id);
  perform public.private_assert_fund_request_custody(target_intended_custody_type, target_custodian_profile_id);

  -- The approved request row must exist before its allocations can reference it, so the
  -- total-equals-allocations guarantee is deferred to the end of this atomic action.
  set constraints public.fund_requests_total_matches_allocations deferred;

  -- One atomic action: approved request, allocations, reservations and a single distinct
  -- direct-authority event. No manager requester is simulated and no submit/approve cycle
  -- is fabricated.
  insert into public.fund_requests (
    project_id, authority_type, status, direct_authority_actor_id, intended_custody_type,
    custodian_profile_id, purpose, submission_round, decided_by, decided_at,
    created_by, updated_by
  ) values (
    target_project_id, 'principal_direct', 'approved', auth.uid(), target_intended_custody_type,
    target_custodian_profile_id, trim(target_purpose), 0, auth.uid(), now(),
    auth.uid(), auth.uid()
  ) returning * into request;

  -- The request is brand new, so the writer's clearing delete matches no rows and the
  -- historical-allocation guard below is never engaged for an already-approved request.
  total := public.private_replace_fund_request_allocations(
    request.id, target_project_id, target_allocations, true, true
  );
  update public.fund_requests set total_requested_amount = total where id = request.id
    returning * into request;
  perform public.private_append_fund_request_event(request, 'principal_direct_authorised', null, target_reason);
  return request;
end;
$$;

create or replace function public.cancel_fund_request(
  target_request_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.fund_requests
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
begin
  if public.private_active_fund_request_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to cancel an approved fund request' using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A cancellation reason is required' using errcode = '22023';
  end if;
  select * into request from public.fund_requests where id = target_request_id for update;
  if not found then raise exception 'Fund request not found' using errcode = 'P0002'; end if;
  perform public.private_assert_fund_request_project(request.project_id);
  if request.status <> 'approved' then
    raise exception 'Only an approved fund request may be cancelled' using errcode = '22023';
  end if;
  if request.version <> target_expected_version then
    raise exception 'Stale fund request version; refresh and try again' using errcode = '40001';
  end if;

  update public.fund_requests set
    status = 'cancelled', version = version + 1,
    cancelled_by = auth.uid(), cancelled_at = now(),
    updated_by = auth.uid(), updated_at = now()
  where id = request.id returning * into request;
  perform public.private_append_fund_request_event(request, 'cancelled', 'approved', target_reason);
  return request;
end;
$$;

-- ---------------------------------------------------------------------------
-- Immutability and non-destructive-history guards.
-- ---------------------------------------------------------------------------

create or replace function public.private_reject_fund_request_event_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Fund request events are immutable' using errcode = '42501';
end;
$$;

create trigger fund_request_events_immutable
before update or delete on public.fund_request_events
for each row execute function public.private_reject_fund_request_event_change();

create or replace function public.private_guard_fund_request_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.id <> old.id
     or new.request_sequence <> old.request_sequence
     or new.request_number <> old.request_number
     or new.project_id <> old.project_id
     or new.authority_type <> old.authority_type
     or new.created_at <> old.created_at then
    raise exception 'Fund request identity and project are immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger fund_requests_identity_immutable
before update on public.fund_requests
for each row execute function public.private_guard_fund_request_identity();

create or replace function public.private_assign_fund_request_number()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.request_number := 'BDFR-' || to_char(now(), 'YYYY') || '-'
    || lpad(new.request_sequence::text, 6, '0');
  return new;
end;
$$;

create trigger fund_requests_assign_number
before insert on public.fund_requests
for each row execute function public.private_assign_fund_request_number();

-- Database-level guarantee that a reserving request always carries a total and that the
-- total is exactly the sum of its allocations. Deferrable so that Principal direct
-- authority can insert its approved request and its allocations in one atomic action.
create or replace function public.private_assert_fund_request_total()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  allocation_total numeric(14,2);
  request public.fund_requests;
begin
  -- Deferred firing must judge the committed state, not the row image captured when the
  -- triggering statement ran, so the current row is re-read here.
  select * into request from public.fund_requests where id = new.id;
  if not found or request.status not in ('submitted', 'amendment_requested', 'approved') then
    return new;
  end if;
  if request.total_requested_amount is null then
    raise exception 'A reserving fund request must carry an authoritative total' using errcode = '22023';
  end if;
  select coalesce(sum(requested_amount), 0) into allocation_total
  from public.fund_request_allocations where fund_request_id = request.id;
  if allocation_total <> request.total_requested_amount then
    raise exception 'Fund request allocations must equal the request total' using errcode = '22023';
  end if;
  return new;
end;
$$;

create constraint trigger fund_requests_total_matches_allocations
after insert or update on public.fund_requests
deferrable initially immediate
for each row execute function public.private_assert_fund_request_total();

create or replace function public.private_guard_fund_request_allocation_history()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_status text;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Fund request allocations are replaced atomically, never edited in place'
      using errcode = '42501';
  end if;
  select status into parent_status from public.fund_requests where id = old.fund_request_id;
  if parent_status is not null and parent_status not in ('draft', 'amendment_requested') then
    raise exception 'Historical fund request allocations cannot be rewritten' using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger fund_request_allocations_history_protected
before update or delete on public.fund_request_allocations
for each row execute function public.private_guard_fund_request_allocation_history();

-- Narrowest possible BD-FIN-01A guard: an approved internal cost claim cannot be cancelled,
-- nor have its approved amount reduced below what is reserved, while a submitted,
-- amendment-requested or approved fund request still allocates against it.
create or replace function public.private_guard_internal_cost_claim_fund_reservation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  reserved numeric(14,2);
begin
  if old.lifecycle <> 'approved' then
    return new;
  end if;
  if new.lifecycle = 'approved' and coalesce(new.approved_total, 0) >= coalesce(old.approved_total, 0) then
    return new;
  end if;
  select coalesce(sum(allocation.requested_amount), 0)
    into reserved
  from public.fund_request_allocations allocation
  join public.fund_requests request on request.id = allocation.fund_request_id
  where allocation.internal_cost_claim_id = old.id
    and request.status = any (public.private_fund_request_reserving_statuses());

  if reserved > 0 and (new.lifecycle <> 'approved' or coalesce(new.approved_total, 0) < reserved) then
    raise exception
      'This approved claim has KES % reserved by an active fund request and cannot be cancelled or reduced',
      reserved
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger internal_cost_claims_fund_reservation_guard
before update on public.internal_cost_claims
for each row execute function public.private_guard_internal_cost_claim_fund_reservation();

-- ---------------------------------------------------------------------------
-- Row level security: visibility follows the existing finance project-access model.
-- Staff and Viewer receive no SELECT policy in this slice.
-- ---------------------------------------------------------------------------

create policy "fund_requests_select_authorised"
on public.fund_requests for select to authenticated
using (public.can_access_internal_cost_claim_project(project_id));

create policy "fund_request_allocations_select_authorised"
on public.fund_request_allocations for select to authenticated
using (exists (
  select 1 from public.fund_requests request
  where request.id = fund_request_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

create policy "fund_request_events_select_authorised"
on public.fund_request_events for select to authenticated
using (exists (
  select 1 from public.fund_requests request
  where request.id = fund_request_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

-- ---------------------------------------------------------------------------
-- Grants: authenticated clients read through RLS and mutate only through the RPCs.
-- ---------------------------------------------------------------------------

revoke all on public.fund_requests from anon, authenticated;
revoke all on public.fund_request_allocations from anon, authenticated;
revoke all on public.fund_request_events from anon, authenticated;
grant select on public.fund_requests, public.fund_request_allocations, public.fund_request_events to authenticated;

revoke all on sequence public.fund_request_number_seq from public, anon, authenticated;

revoke execute on function public.private_fund_request_reserving_statuses() from public, anon, authenticated;
revoke execute on function public.private_active_fund_request_role() from public, anon, authenticated;
revoke execute on function public.private_assert_fund_request_project(uuid) from public, anon, authenticated;
revoke execute on function public.private_assert_fund_request_custody(text, uuid) from public, anon, authenticated;
revoke execute on function public.private_replace_fund_request_allocations(uuid, uuid, jsonb, boolean, boolean) from public, anon, authenticated;
revoke execute on function public.private_verify_fund_request_reservations(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.private_fund_request_snapshot(public.fund_requests) from public, anon, authenticated;
revoke execute on function public.private_append_fund_request_event(public.fund_requests, text, text, text) from public, anon, authenticated;
revoke execute on function public.private_reject_fund_request_event_change() from public, anon, authenticated;
revoke execute on function public.private_guard_fund_request_identity() from public, anon, authenticated;
revoke execute on function public.private_assign_fund_request_number() from public, anon, authenticated;
revoke execute on function public.private_assert_fund_request_total() from public, anon, authenticated;
revoke execute on function public.private_guard_fund_request_allocation_history() from public, anon, authenticated;
revoke execute on function public.private_guard_internal_cost_claim_fund_reservation() from public, anon, authenticated;

revoke execute on function public.fund_request_claim_availability(uuid, uuid) from public, anon;
revoke execute on function public.create_fund_request_draft(uuid, text, uuid, text, jsonb) from public, anon;
revoke execute on function public.update_fund_request(uuid, integer, text, uuid, text, jsonb) from public, anon;
revoke execute on function public.submit_fund_request(uuid, integer) from public, anon;
revoke execute on function public.withdraw_fund_request(uuid, integer, text) from public, anon;
revoke execute on function public.decide_fund_request(uuid, integer, text, text) from public, anon;
revoke execute on function public.direct_authorise_fund_request(uuid, text, uuid, text, jsonb, text) from public, anon;
revoke execute on function public.cancel_fund_request(uuid, integer, text) from public, anon;

grant execute on function public.fund_request_claim_availability(uuid, uuid) to authenticated;
grant execute on function public.create_fund_request_draft(uuid, text, uuid, text, jsonb) to authenticated;
grant execute on function public.update_fund_request(uuid, integer, text, uuid, text, jsonb) to authenticated;
grant execute on function public.submit_fund_request(uuid, integer) to authenticated;
grant execute on function public.withdraw_fund_request(uuid, integer, text) to authenticated;
grant execute on function public.decide_fund_request(uuid, integer, text, text) to authenticated;
grant execute on function public.direct_authorise_fund_request(uuid, text, uuid, text, jsonb, text) to authenticated;
grant execute on function public.cancel_fund_request(uuid, integer, text) to authenticated;
