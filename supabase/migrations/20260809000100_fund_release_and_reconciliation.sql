-- BOTANIQUE DESIGNERS — BD-FIN-01C Fund Release and Accountable-Advance Reconciliation.
-- Additive and forward-only. This is the first object in the repository that records that
-- money actually moved, and what became of it afterwards.
--
-- It implements exactly the model settled in
-- docs/ui-authority/operations-hub/payment-reconciliation-authority/ and the five Founder
-- rulings in founder-rulings-settled.md. It creates no Company Expenses, Staff Compensation,
-- payroll, compensation, supplier master, inventory, tool, asset, maintenance, evidence-file,
-- attachment, unified-approval, invoice or client-commercial object.
--
-- The separations the settled authority forbids collapsing are preserved literally:
--
--   CLAIM  ≠  APPROVAL  ≠  RELEASE  ≠  ACTUAL EXPENDITURE  ≠  RECONCILIATION
--
-- APPROVAL IS NOT PAYMENT. internal_cost_claims.lifecycle and fund_requests.status are not
-- touched: no 'paid' value is added to either, and no paid_amount/paid_at shortcut is bolted
-- onto fund_requests. Release and reconciliation state are DERIVED from the rows below by
-- public.fund_request_financial_position(), never stored as a duplicate status column.

-- ---------------------------------------------------------------------------
-- E1 — Fund release. One row = one movement of money.
-- Zero, one or many releases per approved fund request are all valid. Zero is precisely
-- "approved but unpaid", which is why no release row is ever fabricated for history.
-- ---------------------------------------------------------------------------

create sequence public.fund_release_number_seq as bigint start with 1 increment by 1;

create table public.fund_releases (
  id uuid primary key default gen_random_uuid(),
  release_sequence bigint not null default nextval('public.fund_release_number_seq'),
  release_number text not null,
  fund_request_id uuid not null references public.fund_requests(id) on delete restrict,
  status text not null default 'recorded' check (status in ('recorded', 'reversed')),
  -- The factual custody of THIS movement, in the vocabulary fund_requests.intended_custody_type
  -- already uses. No incompatible synonym is invented. The request records intent; the release
  -- records fact, and one approved authority may legitimately produce an accountable advance
  -- and a direct supplier payment, so the fact belongs on the movement.
  custody_disposition text not null check (custody_disposition in (
    'operations_manager_accountable_advance', 'direct_recipient_funding'
  )),
  -- An accountable advance goes to a named person who must later account for it. A direct
  -- settled payment goes to a payee identified by label, and has no custodian: Founder ruling
  -- D2 forbids manufacturing a false acknowledgement from someone who received nothing.
  recipient_profile_id uuid null references public.profiles(id) on delete restrict,
  recipient_label text null check (
    recipient_label is null or char_length(trim(recipient_label)) between 1 and 160
  ),
  currency text not null default 'KES' check (currency = 'KES'),
  released_amount numeric(14,2) not null check (released_amount > 0),
  released_at timestamptz not null,
  payment_channel text not null check (payment_channel in (
    'mpesa', 'bank_transfer', 'cash', 'other'
  )),
  payment_reference text null check (
    payment_reference is null or char_length(trim(payment_reference)) between 1 and 120
  ),
  note text null check (note is null or char_length(trim(note)) between 1 and 2000),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  -- Optional and meaningful only for an accountable advance (Founder ruling D2).
  receipt_confirmed_by uuid null references public.profiles(id) on delete restrict,
  receipt_confirmed_at timestamptz null,
  reversed_by uuid null references public.profiles(id) on delete restrict,
  reversed_at timestamptz null,
  reversal_reason text null check (
    reversal_reason is null or char_length(trim(reversal_reason)) between 1 and 2000
  ),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fund_releases_release_number_unique unique (release_number),
  constraint fund_releases_release_sequence_unique unique (release_sequence),
  constraint fund_release_recipient_consistency check (
    (custody_disposition = 'operations_manager_accountable_advance'
      and recipient_profile_id is not null and recipient_label is null)
    or
    (custody_disposition = 'direct_recipient_funding'
      and recipient_profile_id is null and recipient_label is not null)
  ),
  -- Only the person who actually held the money may confirm receiving it, and only for an
  -- accountable advance.
  constraint fund_release_receipt_consistency check (
    (receipt_confirmed_by is null and receipt_confirmed_at is null)
    or (
      custody_disposition = 'operations_manager_accountable_advance'
      and receipt_confirmed_by = recipient_profile_id
      and receipt_confirmed_at is not null
    )
  ),
  constraint fund_release_reversal_consistency check (
    (status = 'recorded' and reversed_by is null and reversed_at is null and reversal_reason is null)
    or (status = 'reversed' and reversed_by is not null and reversed_at is not null
        and reversal_reason is not null)
  )
);

create table public.fund_release_events (
  id uuid primary key default gen_random_uuid(),
  fund_release_id uuid not null references public.fund_releases(id) on delete restrict,
  event_type text not null check (event_type in ('recorded', 'receipt_confirmed', 'reversed')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_status text null,
  to_status text not null,
  release_version integer not null check (release_version > 0),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- E2 — Fund acquittal. What became of released money, and where ACTUAL EXPENDITURE lives.
--
-- A row exists only once the custodian actually submits one. A direct settled payment never
-- gets one at all (Founder ruling D3: no fictional advance acquittal), and an advance that has
-- not been accounted for yet is "outstanding" by the ABSENCE of a row, not by a fabricated
-- placeholder. Both are derived in fund_request_financial_position().
-- ---------------------------------------------------------------------------

create table public.fund_acquittals (
  id uuid primary key default gen_random_uuid(),
  fund_release_id uuid not null references public.fund_releases(id) on delete restrict,
  state text not null check (state in ('submitted', 'amendment_requested', 'accepted')),
  -- Frozen from the release at submission so the arithmetic below cannot drift.
  released_amount_snapshot numeric(14,2) not null check (released_amount_snapshot > 0),
  -- Kept equal to the sum of the acquittal lines by the deferrable constraint trigger below.
  actual_spend_total numeric(14,2) not null default 0 check (actual_spend_total >= 0),
  returned_amount numeric(14,2) not null default 0 check (returned_amount >= 0),
  -- The whole financial outcome, derived from the three numbers above and never entered by
  -- hand (Founder ruling D4: the reconciliation itself establishes the outcome, and no
  -- disconnected balance object holds it).
  --   variance > 0  money released that was neither spent nor returned
  --   variance = 0  the advance is fully accounted for
  --   variance < 0  more was legitimately spent than released; its absolute value is the
  --                 additional amount required
  variance_amount numeric(14,2)
    generated always as (released_amount_snapshot - actual_spend_total - returned_amount) stored,
  -- Evidence is a nullable text reference only. This model must not invent file storage; the
  -- attachment domain remains separately blocked on the storage-backup posture.
  evidence_reference text null check (
    evidence_reference is null or char_length(trim(evidence_reference)) between 1 and 500
  ),
  note text null check (note is null or char_length(trim(note)) between 1 and 2000),
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  submitted_at timestamptz not null default now(),
  accepted_by uuid null references public.profiles(id) on delete restrict,
  accepted_at timestamptz null,
  -- Mandatory whenever an abnormal position is accepted and closed, and permanently visible in
  -- the event history. Balances are never silently zeroed.
  variance_override_reason text null check (
    variance_override_reason is null or char_length(trim(variance_override_reason)) between 1 and 2000
  ),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint fund_acquittals_release_unique unique (fund_release_id),
  constraint fund_acquittal_acceptance_consistency check (
    (state = 'accepted' and accepted_by is not null and accepted_at is not null)
    or (state <> 'accepted' and accepted_by is null and accepted_at is null
        and variance_override_reason is null)
  ),
  constraint fund_acquittal_no_self_acceptance check (
    accepted_by is null or accepted_by <> submitted_by
  )
);

create table public.fund_acquittal_lines (
  id uuid primary key default gen_random_uuid(),
  acquittal_id uuid not null references public.fund_acquittals(id) on delete restrict,
  line_number integer not null check (line_number > 0),
  description text not null check (char_length(trim(description)) between 1 and 500),
  -- Deliberately the same controlled vocabulary as internal_cost_claim_lines' parent claim
  -- category. Actual expenditure is classified the way authorised cost is classified, so
  -- Project Costs can compare authorised against actual without a translation table.
  category text not null check (category in (
    'labour', 'mason_subcontract', 'cart_transport', 'transport', 'materials',
    'equipment_hire', 'supplier_cost', 'other'
  )),
  amount numeric(14,2) not null check (amount > 0),
  spent_on date not null,
  created_at timestamptz not null default now(),
  constraint fund_acquittal_line_number_unique unique (acquittal_id, line_number)
);

create table public.fund_acquittal_events (
  id uuid primary key default gen_random_uuid(),
  acquittal_id uuid not null references public.fund_acquittals(id) on delete restrict,
  event_type text not null check (event_type in (
    'submitted', 'resubmitted', 'amendment_requested', 'accepted'
  )),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  from_state text null,
  to_state text not null,
  acquittal_version integer not null check (acquittal_version > 0),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index fund_releases_request_released_idx
  on public.fund_releases (fund_request_id, released_at desc);
create index fund_releases_recipient_idx
  on public.fund_releases (recipient_profile_id)
  where recipient_profile_id is not null;
create index fund_release_events_release_created_idx
  on public.fund_release_events (fund_release_id, created_at asc, id asc);
create index fund_acquittals_state_updated_idx
  on public.fund_acquittals (state, updated_at desc);
create index fund_acquittal_lines_acquittal_idx
  on public.fund_acquittal_lines (acquittal_id, line_number asc);
create index fund_acquittal_events_acquittal_created_idx
  on public.fund_acquittal_events (acquittal_id, created_at asc, id asc);

alter table public.fund_releases enable row level security;
alter table public.fund_release_events enable row level security;
alter table public.fund_acquittals enable row level security;
alter table public.fund_acquittal_lines enable row level security;
alter table public.fund_acquittal_events enable row level security;

-- ---------------------------------------------------------------------------
-- Helpers. The BD-FIN-01A/01B1 role and project-eligibility model is reused rather than
-- duplicated; no parallel role system and no Finance Officer role is introduced.
-- ---------------------------------------------------------------------------

create or replace function public.private_active_fund_release_role()
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

-- The single source of truth for how much of an approved authority is still releasable.
-- Reversed releases release their hold, exactly as a withdrawn fund request releases its
-- reservation.
create or replace function public.private_fund_request_released_total(target_request_id uuid)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(sum(release.released_amount), 0)::numeric(14,2)
  from public.fund_releases release
  where release.fund_request_id = target_request_id
    and release.status = 'recorded'
$$;

create or replace function public.private_fund_release_snapshot(release public.fund_releases)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', release.id, 'release_number', release.release_number,
    'fund_request_id', release.fund_request_id, 'status', release.status,
    'custody_disposition', release.custody_disposition,
    'recipient_profile_id', release.recipient_profile_id,
    'recipient_label', release.recipient_label,
    'currency', release.currency, 'released_amount', release.released_amount,
    'released_at', release.released_at, 'payment_channel', release.payment_channel,
    'payment_reference', release.payment_reference, 'note', release.note,
    'recorded_by', release.recorded_by, 'version', release.version
  )
$$;

create or replace function public.private_append_fund_release_event(
  release public.fund_releases,
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
  insert into public.fund_release_events (
    fund_release_id, event_type, actor_id, from_status, to_status, release_version,
    reason, payload
  ) values (
    release.id, target_event_type, auth.uid(), target_from_status, release.status,
    release.version, nullif(trim(target_reason), ''),
    public.private_fund_release_snapshot(release)
  );
end;
$$;

create or replace function public.private_fund_acquittal_snapshot(acquittal public.fund_acquittals)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'acquittal', jsonb_build_object(
      'id', acquittal.id, 'fund_release_id', acquittal.fund_release_id,
      'state', acquittal.state,
      'released_amount_snapshot', acquittal.released_amount_snapshot,
      'actual_spend_total', acquittal.actual_spend_total,
      'returned_amount', acquittal.returned_amount,
      'variance_amount', acquittal.variance_amount,
      'evidence_reference', acquittal.evidence_reference, 'note', acquittal.note,
      'submitted_by', acquittal.submitted_by, 'accepted_by', acquittal.accepted_by,
      'variance_override_reason', acquittal.variance_override_reason,
      'version', acquittal.version
    ),
    'lines', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'line_number', line.line_number, 'description', line.description,
        'category', line.category, 'amount', line.amount, 'spent_on', line.spent_on
      ) order by line.line_number), '[]'::jsonb)
      from public.fund_acquittal_lines line
      where line.acquittal_id = acquittal.id
    )
  )
$$;

create or replace function public.private_append_fund_acquittal_event(
  acquittal public.fund_acquittals,
  target_event_type text,
  target_from_state text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.fund_acquittal_events (
    acquittal_id, event_type, actor_id, from_state, to_state, acquittal_version,
    reason, payload
  ) values (
    acquittal.id, target_event_type, auth.uid(), target_from_state, acquittal.state,
    acquittal.version, nullif(trim(target_reason), ''),
    public.private_fund_acquittal_snapshot(acquittal)
  );
end;
$$;

-- Replaces the expenditure lines of one acquittal atomically and returns their total.
create or replace function public.private_replace_fund_acquittal_lines(
  target_acquittal_id uuid,
  target_lines jsonb
)
returns numeric
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  entry record;
  total numeric(14,2);
begin
  if jsonb_typeof(target_lines) <> 'array' then
    raise exception 'Reconciliation lines must be supplied as a list' using errcode = '22023';
  end if;
  if jsonb_array_length(target_lines) = 0 then
    raise exception 'A reconciliation must state at least one item of actual expenditure'
      using errcode = '22023';
  end if;
  if jsonb_array_length(target_lines) > 100 then
    raise exception 'A reconciliation may contain at most 100 expenditure lines' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(target_lines) element
    where jsonb_typeof(element) <> 'object'
      or exists (
        select 1 from jsonb_object_keys(element) key
        where key not in ('description', 'category', 'amount', 'spent_on')
      )
  ) then
    raise exception 'Each reconciliation line must contain only a description, category, amount and date'
      using errcode = '22023';
  end if;

  delete from public.fund_acquittal_lines where acquittal_id = target_acquittal_id;

  for entry in
    select
      ordinality as line_number,
      value->>'description' as description,
      value->>'category' as category,
      (value->>'amount')::numeric as amount,
      (value->>'spent_on')::date as spent_on
    from jsonb_array_elements(target_lines) with ordinality
    order by ordinality
  loop
    if entry.amount is null or entry.amount <= 0 then
      raise exception 'Each reconciliation line must state a positive amount' using errcode = '22023';
    end if;
    insert into public.fund_acquittal_lines (
      acquittal_id, line_number, description, category, amount, spent_on
    ) values (
      target_acquittal_id, entry.line_number, trim(entry.description), entry.category,
      entry.amount, entry.spent_on
    );
  end loop;

  select sum(amount) into total from public.fund_acquittal_lines where acquittal_id = target_acquittal_id;
  return total;
exception
  when invalid_text_representation or invalid_datetime_format or numeric_value_out_of_range then
    raise exception 'Each reconciliation line must state a valid category, amount and date'
      using errcode = '22023';
end;
$$;

-- ---------------------------------------------------------------------------
-- Principal authority: record an actual release of money.
--
-- Founder ruling D2: Operations requests → Principal decides → Principal records the actual
-- release. Operations cannot fabricate a release event, and there is no Finance Officer role.
-- ---------------------------------------------------------------------------

create or replace function public.record_fund_release(
  target_request_id uuid,
  target_released_amount numeric,
  target_released_at timestamptz,
  target_custody_disposition text,
  target_recipient_profile_id uuid,
  target_recipient_label text,
  target_payment_channel text,
  target_payment_reference text default null,
  target_note text default null
)
returns public.fund_releases
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  release public.fund_releases;
  already_released numeric(14,2);
begin
  if public.private_active_fund_release_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to record a fund release' using errcode = '42501';
  end if;
  if target_released_amount is null or target_released_amount <= 0 then
    raise exception 'A release must record a positive amount' using errcode = '22023';
  end if;
  if target_released_at is null then
    raise exception 'A release must record when the money moved' using errcode = '22023';
  end if;
  if target_released_at > now() + interval '1 day' then
    raise exception 'A release cannot be dated in the future' using errcode = '22023';
  end if;
  if target_payment_channel not in ('mpesa', 'bank_transfer', 'cash', 'other') then
    raise exception 'Unsupported payment channel' using errcode = '22023';
  end if;
  if target_custody_disposition not in (
    'operations_manager_accountable_advance', 'direct_recipient_funding'
  ) then
    raise exception 'Unsupported custody disposition' using errcode = '22023';
  end if;

  -- Locking the authority row is what makes two concurrent releases safe: the second waits,
  -- then recomputes the already-released total against the committed state of the first.
  select * into request from public.fund_requests where id = target_request_id for update;
  if not found then raise exception 'Fund request not found' using errcode = 'P0002'; end if;
  perform public.private_assert_fund_request_project(request.project_id);
  if request.status <> 'approved' then
    raise exception 'Only an approved fund request may have a release recorded against it'
      using errcode = '22023';
  end if;

  if target_custody_disposition = 'operations_manager_accountable_advance' then
    if target_recipient_profile_id is null then
      raise exception 'An accountable advance must name the person accountable for it'
        using errcode = '22023';
    end if;
    if not exists (
      select 1 from public.profiles p
      where p.id = target_recipient_profile_id and p.is_active and p.role = 'manager'
    ) then
      raise exception 'An accountable advance must be released to an active Operations Manager'
        using errcode = '22023';
    end if;
    -- An advance may only be entrusted to the custodian the approved authority names, so a
    -- release cannot quietly redirect approved money to a different person.
    if request.custodian_profile_id is not null
       and request.custodian_profile_id <> target_recipient_profile_id then
      raise exception 'An accountable advance must go to the custodian named on the approved request'
        using errcode = '22023';
    end if;
  elsif target_recipient_profile_id is not null then
    raise exception 'A direct settled payment does not carry an accountable custodian'
      using errcode = '22023';
  elsif nullif(trim(coalesce(target_recipient_label, '')), '') is null then
    raise exception 'A direct settled payment must name the payee' using errcode = '22023';
  end if;

  already_released := public.private_fund_request_released_total(request.id);
  if already_released + target_released_amount > request.total_requested_amount then
    raise exception
      'Fund request %: KES % of KES % is already released, so only KES % remains releasable',
      request.request_number, already_released, request.total_requested_amount,
      greatest(request.total_requested_amount - already_released, 0)
      using errcode = 'BDF02';
  end if;

  insert into public.fund_releases (
    fund_request_id, status, custody_disposition, recipient_profile_id, recipient_label,
    released_amount, released_at, payment_channel, payment_reference, note, recorded_by
  ) values (
    request.id, 'recorded', target_custody_disposition,
    target_recipient_profile_id,
    case when target_custody_disposition = 'direct_recipient_funding'
      then trim(target_recipient_label) else null end,
    target_released_amount, target_released_at, target_payment_channel,
    nullif(trim(target_payment_reference), ''), nullif(trim(target_note), ''), auth.uid()
  ) returning * into release;

  perform public.private_append_fund_release_event(release, 'recorded', null, null);
  return release;
end;
$$;

-- Money that moved is never deleted or rewritten. An error is corrected by an explicit
-- reversal event that leaves the original release and its history permanently readable.
create or replace function public.reverse_fund_release(
  target_release_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.fund_releases
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  release public.fund_releases;
  request public.fund_requests;
begin
  if public.private_active_fund_release_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to reverse a fund release' using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A reason is required to reverse a fund release' using errcode = '22023';
  end if;
  select * into release from public.fund_releases where id = target_release_id for update;
  if not found then raise exception 'Fund release not found' using errcode = 'P0002'; end if;
  select * into request from public.fund_requests where id = release.fund_request_id;
  perform public.private_assert_fund_request_project(request.project_id);
  if release.status <> 'recorded' then
    raise exception 'This fund release has already been reversed' using errcode = '22023';
  end if;
  if release.version <> target_expected_version then
    raise exception 'Stale fund release version; refresh and try again' using errcode = '40001';
  end if;
  -- Reversing a release whose money has already been accounted for would orphan the
  -- reconciliation. The reconciliation must be dealt with first.
  if exists (select 1 from public.fund_acquittals where fund_release_id = release.id) then
    raise exception 'This release has a reconciliation against it and cannot be reversed'
      using errcode = '22023';
  end if;

  update public.fund_releases set
    status = 'reversed', reversed_by = auth.uid(), reversed_at = now(),
    reversal_reason = trim(target_reason), version = version + 1, updated_at = now()
  where id = release.id returning * into release;
  perform public.private_append_fund_release_event(release, 'reversed', 'recorded', target_reason);
  return release;
end;
$$;

-- Founder ruling D2: optional, and meaningful only for an accountable advance. A direct
-- supplier payment never demands an acknowledgement from someone who received nothing.
create or replace function public.confirm_fund_release_receipt(
  target_release_id uuid,
  target_expected_version integer
)
returns public.fund_releases
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  release public.fund_releases;
  request public.fund_requests;
begin
  select * into release from public.fund_releases where id = target_release_id for update;
  if not found then raise exception 'Fund release not found' using errcode = 'P0002'; end if;
  select * into request from public.fund_requests where id = release.fund_request_id;
  perform public.private_assert_fund_request_project(request.project_id);
  if release.custody_disposition <> 'operations_manager_accountable_advance' then
    raise exception 'Only an accountable advance can be acknowledged by its recipient'
      using errcode = '22023';
  end if;
  if release.recipient_profile_id is distinct from auth.uid() then
    raise exception 'Only the person accountable for this advance may confirm receiving it'
      using errcode = '42501';
  end if;
  if release.status <> 'recorded' then
    raise exception 'A reversed release cannot be acknowledged' using errcode = '22023';
  end if;
  if release.receipt_confirmed_at is not null then
    raise exception 'Receipt of this advance has already been confirmed' using errcode = '22023';
  end if;
  if release.version <> target_expected_version then
    raise exception 'Stale fund release version; refresh and try again' using errcode = '40001';
  end if;

  update public.fund_releases set
    receipt_confirmed_by = auth.uid(), receipt_confirmed_at = now(),
    version = version + 1, updated_at = now()
  where id = release.id returning * into release;
  perform public.private_append_fund_release_event(release, 'receipt_confirmed', 'recorded', null);
  return release;
end;
$$;

-- ---------------------------------------------------------------------------
-- Accountable-advance reconciliation.
--
-- Submitted by the person who held the money; accepted by the Principal. The same separation
-- of duties as the claim: the person who spent does not certify their own spending.
-- ---------------------------------------------------------------------------

create or replace function public.submit_fund_acquittal(
  target_release_id uuid,
  target_expected_version integer,
  target_lines jsonb,
  target_returned_amount numeric default 0,
  target_evidence_reference text default null,
  target_note text default null
)
returns public.fund_acquittals
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  release public.fund_releases;
  request public.fund_requests;
  acquittal public.fund_acquittals;
  prior_state text;
  spend_total numeric(14,2);
  returned numeric(14,2);
begin
  returned := coalesce(target_returned_amount, 0);
  if returned < 0 then
    raise exception 'A returned amount cannot be negative' using errcode = '22023';
  end if;

  select * into release from public.fund_releases where id = target_release_id for update;
  if not found then raise exception 'Fund release not found' using errcode = 'P0002'; end if;
  select * into request from public.fund_requests where id = release.fund_request_id;
  perform public.private_assert_fund_request_project(request.project_id);

  -- Founder ruling D3: reconciliation follows custody, not every payment.
  if release.custody_disposition <> 'operations_manager_accountable_advance' then
    raise exception 'A direct settled payment is not reconciled by an accountable-advance acquittal'
      using errcode = '22023';
  end if;
  if release.status <> 'recorded' then
    raise exception 'A reversed release cannot be reconciled' using errcode = '22023';
  end if;
  if release.recipient_profile_id is distinct from auth.uid() then
    raise exception 'Only the person accountable for this advance may reconcile it'
      using errcode = '42501';
  end if;

  select * into acquittal from public.fund_acquittals where fund_release_id = release.id for update;

  if found then
    if acquittal.state <> 'amendment_requested' then
      raise exception 'This reconciliation is not open for a further submission' using errcode = '22023';
    end if;
    if acquittal.version <> target_expected_version then
      raise exception 'Stale reconciliation version; refresh and try again' using errcode = '40001';
    end if;
    prior_state := acquittal.state;
    -- The lines must exist before the total can be asserted against them.
    set constraints public.fund_acquittals_total_matches_lines deferred;
    spend_total := public.private_replace_fund_acquittal_lines(acquittal.id, target_lines);
    update public.fund_acquittals set
      state = 'submitted', actual_spend_total = spend_total, returned_amount = returned,
      evidence_reference = nullif(trim(target_evidence_reference), ''),
      note = nullif(trim(target_note), ''),
      submitted_by = auth.uid(), submitted_at = now(),
      version = version + 1, updated_at = now()
    where id = acquittal.id returning * into acquittal;
    perform public.private_append_fund_acquittal_event(acquittal, 'resubmitted', prior_state, null);
    return acquittal;
  end if;

  if release.version <> target_expected_version then
    raise exception 'Stale fund release version; refresh and try again' using errcode = '40001';
  end if;

  set constraints public.fund_acquittals_total_matches_lines deferred;
  insert into public.fund_acquittals (
    fund_release_id, state, released_amount_snapshot, returned_amount,
    evidence_reference, note, submitted_by
  ) values (
    release.id, 'submitted', release.released_amount, returned,
    nullif(trim(target_evidence_reference), ''), nullif(trim(target_note), ''), auth.uid()
  ) returning * into acquittal;

  spend_total := public.private_replace_fund_acquittal_lines(acquittal.id, target_lines);
  update public.fund_acquittals set actual_spend_total = spend_total where id = acquittal.id
    returning * into acquittal;
  perform public.private_append_fund_acquittal_event(acquittal, 'submitted', null, null);
  return acquittal;
end;
$$;

create or replace function public.decide_fund_acquittal(
  target_acquittal_id uuid,
  target_expected_version integer,
  target_decision text,
  target_reason text default null
)
returns public.fund_acquittals
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  acquittal public.fund_acquittals;
  release public.fund_releases;
  request public.fund_requests;
  prior_state text;
begin
  if public.private_active_fund_release_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to decide a reconciliation' using errcode = '42501';
  end if;
  if target_decision not in ('accepted', 'amendment_requested') then
    raise exception 'Unsupported reconciliation decision' using errcode = '22023';
  end if;
  select * into acquittal from public.fund_acquittals where id = target_acquittal_id for update;
  if not found then raise exception 'Reconciliation not found' using errcode = 'P0002'; end if;
  select * into release from public.fund_releases where id = acquittal.fund_release_id;
  select * into request from public.fund_requests where id = release.fund_request_id;
  perform public.private_assert_fund_request_project(request.project_id);
  if acquittal.state <> 'submitted' then
    raise exception 'This reconciliation is not awaiting a decision' using errcode = '22023';
  end if;
  if acquittal.version <> target_expected_version then
    raise exception 'Stale reconciliation version; refresh and try again' using errcode = '40001';
  end if;
  if acquittal.submitted_by = auth.uid() then
    raise exception 'The person who submitted a reconciliation cannot accept it' using errcode = '42501';
  end if;
  if target_decision = 'amendment_requested' and nullif(trim(target_reason), '') is null then
    raise exception 'A reason is required to send a reconciliation back' using errcode = '22023';
  end if;
  -- Founder ruling D4: an abnormal position may be closed, but only deliberately, with a
  -- mandatory reason that stays visible in history. Balances are never silently zeroed.
  if target_decision = 'accepted' and acquittal.variance_amount <> 0
     and nullif(trim(target_reason), '') is null then
    raise exception
      'This reconciliation leaves a variance of KES %. Accepting it requires a stated reason',
      acquittal.variance_amount
      using errcode = '22023';
  end if;

  prior_state := acquittal.state;
  update public.fund_acquittals set
    state = target_decision,
    accepted_by = case when target_decision = 'accepted' then auth.uid() else null end,
    accepted_at = case when target_decision = 'accepted' then now() else null end,
    variance_override_reason = case
      when target_decision = 'accepted' and acquittal.variance_amount <> 0
        then trim(target_reason) else null end,
    version = version + 1, updated_at = now()
  where id = acquittal.id returning * into acquittal;
  perform public.private_append_fund_acquittal_event(
    acquittal, target_decision, prior_state, target_reason);
  return acquittal;
end;
$$;

-- ---------------------------------------------------------------------------
-- E4 — Derived financial position. No stored status column anywhere.
--
-- Everything below is computed from the source rows on every read, which is what keeps
-- APPROVED + UNPAID and APPROVED + PAID + UNRECONCILED representable without contradiction,
-- and what makes every pre-existing approved fund request read truthfully as approved/unpaid
-- without a single row of backfill.
--
-- release_state         none | partially_released | fully_released
-- reconciliation_state  not_required | outstanding | submitted | amendment_requested | accepted
-- financial_position    not_applicable | approved_unpaid | partially_funded
--                       | reconciliation_outstanding | reconciliation_submitted
--                       | reconciliation_amendment_requested | financially_settled
--
-- "financially_settled" is reached in exactly two ways: an authority fully released as direct
-- settled payments, or an authority fully released as accountable advances whose every
-- reconciliation has been accepted. A variance that was accepted with a stated reason is
-- settled; a variance still awaiting that decision is not.
-- ---------------------------------------------------------------------------

create or replace function public.fund_request_financial_position(
  target_project_id uuid default null,
  target_request_id uuid default null
)
returns table (
  fund_request_id uuid,
  project_id uuid,
  request_number text,
  request_status text,
  intended_custody_type text,
  authorised_amount numeric,
  released_amount numeric,
  remaining_releasable_amount numeric,
  advance_released_amount numeric,
  direct_paid_amount numeric,
  actual_spend_amount numeric,
  returned_amount numeric,
  variance_amount numeric,
  release_count integer,
  reversed_release_count integer,
  release_state text,
  reconciliation_state text,
  financial_position text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    request.id,
    request.project_id,
    request.request_number,
    request.status,
    request.intended_custody_type,
    coalesce(request.total_requested_amount, 0)::numeric(14,2),
    live.released_total,
    greatest(coalesce(request.total_requested_amount, 0) - live.released_total, 0)::numeric(14,2),
    live.advance_total,
    live.direct_total,
    reconciled.spend_total,
    reconciled.returned_total,
    reconciled.variance_total,
    live.release_count::integer,
    live.reversed_count::integer,
    release_state.value,
    reconciliation_state.value,
    case
      -- Only an approved authority can carry a financial position at all.
      when request.status <> 'approved' then 'not_applicable'
      when release_state.value = 'none' then 'approved_unpaid'
      when reconciliation_state.value = 'outstanding' then 'reconciliation_outstanding'
      when reconciliation_state.value = 'submitted' then 'reconciliation_submitted'
      when reconciliation_state.value = 'amendment_requested' then 'reconciliation_amendment_requested'
      when release_state.value = 'partially_released' then 'partially_funded'
      -- Fully released, and every advance accounted for and accepted.
      else 'financially_settled'
    end
  from public.fund_requests request
  cross join lateral (
    select
      coalesce(sum(release.released_amount) filter (where release.status = 'recorded'), 0)::numeric(14,2) as released_total,
      coalesce(sum(release.released_amount) filter (
        where release.status = 'recorded'
          and release.custody_disposition = 'operations_manager_accountable_advance'), 0)::numeric(14,2) as advance_total,
      coalesce(sum(release.released_amount) filter (
        where release.status = 'recorded'
          and release.custody_disposition = 'direct_recipient_funding'), 0)::numeric(14,2) as direct_total,
      count(*) filter (where release.status = 'recorded') as release_count,
      count(*) filter (where release.status = 'reversed') as reversed_count,
      -- An advance is outstanding until a reconciliation is submitted against it.
      count(*) filter (
        where release.status = 'recorded'
          and release.custody_disposition = 'operations_manager_accountable_advance'
          and not exists (
            select 1 from public.fund_acquittals a where a.fund_release_id = release.id
          )
      ) as advances_unreconciled,
      count(*) filter (
        where release.status = 'recorded'
          and release.custody_disposition = 'operations_manager_accountable_advance'
      ) as advance_count
    from public.fund_releases release
    where release.fund_request_id = request.id
  ) live
  cross join lateral (
    select
      coalesce(sum(acquittal.actual_spend_total), 0)::numeric(14,2) as spend_total,
      coalesce(sum(acquittal.returned_amount), 0)::numeric(14,2) as returned_total,
      coalesce(sum(acquittal.variance_amount), 0)::numeric(14,2) as variance_total,
      count(*) filter (where acquittal.state = 'submitted') as submitted_count,
      count(*) filter (where acquittal.state = 'amendment_requested') as amendment_count,
      count(*) filter (where acquittal.state = 'accepted') as accepted_count
    from public.fund_acquittals acquittal
    join public.fund_releases release on release.id = acquittal.fund_release_id
    where release.fund_request_id = request.id and release.status = 'recorded'
  ) reconciled
  cross join lateral (
    select case
      when live.release_count = 0 then 'none'
      when live.released_total >= coalesce(request.total_requested_amount, 0) then 'fully_released'
      else 'partially_released'
    end as value
  ) release_state
  cross join lateral (
    select case
      -- No accountable advance has been released, so there is nothing to acquit.
      when live.advance_count = 0 then 'not_required'
      when live.advances_unreconciled > 0 then 'outstanding'
      when reconciled.amendment_count > 0 then 'amendment_requested'
      when reconciled.submitted_count > 0 then 'submitted'
      else 'accepted'
    end as value
  ) reconciliation_state
  where (target_project_id is null or request.project_id = target_project_id)
    and (target_request_id is null or request.id = target_request_id)
    and public.can_access_internal_cost_claim_project(request.project_id)
  order by request.updated_at desc
$$;

-- ---------------------------------------------------------------------------
-- Integrity, immutability and non-destructive-history guards.
-- ---------------------------------------------------------------------------

create or replace function public.private_reject_fund_release_event_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Fund release events are immutable' using errcode = '42501';
end;
$$;

create trigger fund_release_events_immutable
before update or delete on public.fund_release_events
for each row execute function public.private_reject_fund_release_event_change();

create or replace function public.private_reject_fund_acquittal_event_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Reconciliation events are immutable' using errcode = '42501';
end;
$$;

create trigger fund_acquittal_events_immutable
before update or delete on public.fund_acquittal_events
for each row execute function public.private_reject_fund_acquittal_event_change();

-- Money that moved is factual history. Which request it was made against, how much moved,
-- when, to whom and through what channel can never be edited after the fact; only the
-- reversal, acknowledgement and version fields may change.
create or replace function public.private_guard_fund_release_history()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A fund release is reversed, never deleted' using errcode = '42501';
  end if;
  if new.id <> old.id
     or new.release_sequence <> old.release_sequence
     or new.release_number <> old.release_number
     or new.fund_request_id <> old.fund_request_id
     or new.released_amount <> old.released_amount
     or new.released_at <> old.released_at
     or new.custody_disposition <> old.custody_disposition
     or new.recipient_profile_id is distinct from old.recipient_profile_id
     or new.recipient_label is distinct from old.recipient_label
     or new.payment_channel <> old.payment_channel
     or new.recorded_by <> old.recorded_by
     or new.created_at <> old.created_at then
    raise exception 'A recorded fund release is immutable; record a reversal instead'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger fund_releases_history_protected
before update or delete on public.fund_releases
for each row execute function public.private_guard_fund_release_history();

create or replace function public.private_assign_fund_release_number()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.release_number := 'BDRL-' || to_char(now(), 'YYYY') || '-'
    || lpad(new.release_sequence::text, 6, '0');
  return new;
end;
$$;

create trigger fund_releases_assign_number
before insert on public.fund_releases
for each row execute function public.private_assign_fund_release_number();

-- Database-level backstop for the no-over-release rule. record_fund_release already locks the
-- authority row and checks the total, so this can only fire if a future call site forgets;
-- it exists so the invariant cannot be lost in application code.
create or replace function public.private_assert_fund_release_within_authority()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  request public.fund_requests;
  released_total numeric(14,2);
begin
  select * into request from public.fund_requests where id = new.fund_request_id;
  if not found then return new; end if;
  select coalesce(sum(released_amount), 0) into released_total
  from public.fund_releases
  where fund_request_id = new.fund_request_id and status = 'recorded';
  if released_total > coalesce(request.total_requested_amount, 0) then
    raise exception 'Releases against a fund request may not exceed its approved authority'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create constraint trigger fund_releases_within_authority
after insert or update on public.fund_releases
deferrable initially immediate
for each row execute function public.private_assert_fund_release_within_authority();

-- An approved authority against which money has actually moved cannot be cancelled: doing so
-- would leave a real payment hanging off a cancelled authorisation.
create or replace function public.private_guard_fund_request_release_history()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'cancelled' and old.status <> 'cancelled'
     and exists (
       select 1 from public.fund_releases
       where fund_request_id = old.id and status = 'recorded'
     ) then
    raise exception 'This fund request has money released against it and cannot be cancelled'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger fund_requests_release_history_guard
before update on public.fund_requests
for each row execute function public.private_guard_fund_request_release_history();

create or replace function public.private_assert_fund_acquittal_total()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  acquittal public.fund_acquittals;
  line_total numeric(14,2);
begin
  select * into acquittal from public.fund_acquittals where id = new.id;
  if not found then return new; end if;
  select coalesce(sum(amount), 0) into line_total
  from public.fund_acquittal_lines where acquittal_id = acquittal.id;
  if line_total <> acquittal.actual_spend_total then
    raise exception 'Reconciliation lines must equal the stated actual spend' using errcode = '22023';
  end if;
  return new;
end;
$$;

create constraint trigger fund_acquittals_total_matches_lines
after insert or update on public.fund_acquittals
deferrable initially immediate
for each row execute function public.private_assert_fund_acquittal_total();

create or replace function public.private_guard_fund_acquittal_line_history()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  parent_state text;
begin
  if tg_op = 'UPDATE' then
    raise exception 'Reconciliation lines are replaced atomically, never edited in place'
      using errcode = '42501';
  end if;
  select state into parent_state from public.fund_acquittals where id = old.acquittal_id;
  if parent_state is not null and parent_state = 'accepted' then
    raise exception 'An accepted reconciliation cannot have its expenditure rewritten'
      using errcode = '42501';
  end if;
  return old;
end;
$$;

create trigger fund_acquittal_lines_history_protected
before update or delete on public.fund_acquittal_lines
for each row execute function public.private_guard_fund_acquittal_line_history();

create or replace function public.private_guard_fund_acquittal_identity()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'A reconciliation is amended or accepted, never deleted' using errcode = '42501';
  end if;
  if new.id <> old.id
     or new.fund_release_id <> old.fund_release_id
     or new.released_amount_snapshot <> old.released_amount_snapshot
     or new.created_at <> old.created_at then
    raise exception 'Reconciliation identity and the amount it accounts for are immutable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger fund_acquittals_identity_immutable
before update or delete on public.fund_acquittals
for each row execute function public.private_guard_fund_acquittal_identity();

-- ---------------------------------------------------------------------------
-- Row level security. Visibility follows the existing finance project-access model exactly:
-- the Principal sees every project, an Operations Manager sees only projects they lead or are
-- actively assigned to, and Staff and Viewer receive no policy at all.
-- ---------------------------------------------------------------------------

create policy "fund_releases_select_authorised"
on public.fund_releases for select to authenticated
using (exists (
  select 1 from public.fund_requests request
  where request.id = fund_request_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

create policy "fund_release_events_select_authorised"
on public.fund_release_events for select to authenticated
using (exists (
  select 1 from public.fund_releases release
  join public.fund_requests request on request.id = release.fund_request_id
  where release.id = fund_release_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

create policy "fund_acquittals_select_authorised"
on public.fund_acquittals for select to authenticated
using (exists (
  select 1 from public.fund_releases release
  join public.fund_requests request on request.id = release.fund_request_id
  where release.id = fund_release_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

create policy "fund_acquittal_lines_select_authorised"
on public.fund_acquittal_lines for select to authenticated
using (exists (
  select 1 from public.fund_acquittals acquittal
  join public.fund_releases release on release.id = acquittal.fund_release_id
  join public.fund_requests request on request.id = release.fund_request_id
  where acquittal.id = acquittal_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

create policy "fund_acquittal_events_select_authorised"
on public.fund_acquittal_events for select to authenticated
using (exists (
  select 1 from public.fund_acquittals acquittal
  join public.fund_releases release on release.id = acquittal.fund_release_id
  join public.fund_requests request on request.id = release.fund_request_id
  where acquittal.id = acquittal_id
    and public.can_access_internal_cost_claim_project(request.project_id)
));

-- ---------------------------------------------------------------------------
-- Grants: authenticated clients read through RLS and mutate only through the RPCs. There is
-- no INSERT, UPDATE or DELETE grant on any table here, so no client of any role can fabricate
-- a release event directly.
-- ---------------------------------------------------------------------------

revoke all on public.fund_releases from anon, authenticated;
revoke all on public.fund_release_events from anon, authenticated;
revoke all on public.fund_acquittals from anon, authenticated;
revoke all on public.fund_acquittal_lines from anon, authenticated;
revoke all on public.fund_acquittal_events from anon, authenticated;
grant select on public.fund_releases, public.fund_release_events, public.fund_acquittals,
  public.fund_acquittal_lines, public.fund_acquittal_events to authenticated;

revoke all on sequence public.fund_release_number_seq from public, anon, authenticated;

revoke execute on function public.private_active_fund_release_role() from public, anon, authenticated;
revoke execute on function public.private_fund_request_released_total(uuid) from public, anon, authenticated;
revoke execute on function public.private_fund_release_snapshot(public.fund_releases) from public, anon, authenticated;
revoke execute on function public.private_append_fund_release_event(public.fund_releases, text, text, text) from public, anon, authenticated;
revoke execute on function public.private_fund_acquittal_snapshot(public.fund_acquittals) from public, anon, authenticated;
revoke execute on function public.private_append_fund_acquittal_event(public.fund_acquittals, text, text, text) from public, anon, authenticated;
revoke execute on function public.private_replace_fund_acquittal_lines(uuid, jsonb) from public, anon, authenticated;
revoke execute on function public.private_reject_fund_release_event_change() from public, anon, authenticated;
revoke execute on function public.private_reject_fund_acquittal_event_change() from public, anon, authenticated;
revoke execute on function public.private_guard_fund_release_history() from public, anon, authenticated;
revoke execute on function public.private_assign_fund_release_number() from public, anon, authenticated;
revoke execute on function public.private_assert_fund_release_within_authority() from public, anon, authenticated;
revoke execute on function public.private_guard_fund_request_release_history() from public, anon, authenticated;
revoke execute on function public.private_assert_fund_acquittal_total() from public, anon, authenticated;
revoke execute on function public.private_guard_fund_acquittal_line_history() from public, anon, authenticated;
revoke execute on function public.private_guard_fund_acquittal_identity() from public, anon, authenticated;

revoke execute on function public.record_fund_release(uuid, numeric, timestamptz, text, uuid, text, text, text, text) from public, anon;
revoke execute on function public.reverse_fund_release(uuid, integer, text) from public, anon;
revoke execute on function public.confirm_fund_release_receipt(uuid, integer) from public, anon;
revoke execute on function public.submit_fund_acquittal(uuid, integer, jsonb, numeric, text, text) from public, anon;
revoke execute on function public.decide_fund_acquittal(uuid, integer, text, text) from public, anon;
revoke execute on function public.fund_request_financial_position(uuid, uuid) from public, anon;

grant execute on function public.record_fund_release(uuid, numeric, timestamptz, text, uuid, text, text, text, text) to authenticated;
grant execute on function public.reverse_fund_release(uuid, integer, text) to authenticated;
grant execute on function public.confirm_fund_release_receipt(uuid, integer) to authenticated;
grant execute on function public.submit_fund_acquittal(uuid, integer, jsonb, numeric, text, text) to authenticated;
grant execute on function public.decide_fund_acquittal(uuid, integer, text, text) to authenticated;
grant execute on function public.fund_request_financial_position(uuid, uuid) to authenticated;
