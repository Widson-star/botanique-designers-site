-- BOTANIQUE DESIGNERS — Project Cost Payment Truth.
--
-- Founder ruling, 11 Aug 2026:
--   Project Cost = what Botanique owes/spends on a project.
--   Payment      = money actually paid against that specific Project Cost.
--   Advance      = money issued beforehand to an accountable person.
--
-- A Project Cost payment therefore does NOT require a fund request or fund release.
-- Approval never implies payment. Historical legitimate payments may be entered with
-- their actual date. Existing approved costs remain PAYMENT-UNKNOWN until the Principal
-- explicitly confirms that their historical payment record is complete.
--
-- This migration is additive. It does not rewrite fund_requests/fund_releases/acquittals,
-- does not fabricate historical payments, and does not create Project Financials,
-- Company Expenses, Staff Compensation, payroll, invoice or client-receipt objects.

create sequence public.project_cost_payment_number_seq as bigint start with 1 increment by 1;

-- One row means: the Hub knows whether the payment history held for this cost is complete.
-- Existing approved claims deliberately receive NO row, preserving the truthful unknown state.
-- Claims approved after this migration are automatically tracked from zero, because the Hub
-- has observed their complete payment history from approval onward.
create table public.project_cost_payment_ledgers (
  claim_id uuid primary key references public.internal_cost_claims(id) on delete restrict,
  history_complete boolean not null default false,
  established_by uuid null references public.profiles(id) on delete restrict,
  established_at timestamptz null,
  updated_at timestamptz not null default now(),
  constraint project_cost_payment_ledger_completion_consistency check (
    (history_complete and established_by is not null and established_at is not null)
    or (not history_complete and established_by is null and established_at is null)
  )
);

create table public.project_cost_payments (
  id uuid primary key default gen_random_uuid(),
  payment_sequence bigint not null default nextval('public.project_cost_payment_number_seq'),
  payment_number text not null,
  claim_id uuid not null references public.internal_cost_claims(id) on delete restrict,
  status text not null default 'recorded' check (status in ('recorded', 'reversed')),
  currency text not null default 'KES' check (currency = 'KES'),
  amount numeric(14,2) not null check (amount > 0),
  paid_at date not null,
  payment_channel text not null check (payment_channel in ('mpesa', 'bank_transfer', 'cash', 'other')),
  payment_reference text null check (
    payment_reference is null or char_length(trim(payment_reference)) between 1 and 120
  ),
  note text null check (note is null or char_length(trim(note)) between 1 and 2000),
  recorded_by uuid not null references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default now(),
  reversed_by uuid null references public.profiles(id) on delete restrict,
  reversed_at timestamptz null,
  reversal_reason text null check (
    reversal_reason is null or char_length(trim(reversal_reason)) between 1 and 2000
  ),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_cost_payment_number_unique unique (payment_number),
  constraint project_cost_payment_sequence_unique unique (payment_sequence),
  constraint project_cost_payment_reversal_consistency check (
    (status = 'recorded' and reversed_by is null and reversed_at is null and reversal_reason is null)
    or
    (status = 'reversed' and reversed_by is not null and reversed_at is not null and reversal_reason is not null)
  )
);

create table public.project_cost_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.project_cost_payments(id) on delete restrict,
  claim_id uuid not null references public.internal_cost_claims(id) on delete restrict,
  event_type text not null check (event_type in ('recorded', 'reversed')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  payment_version integer not null check (payment_version > 0),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index project_cost_payments_claim_paid_idx
  on public.project_cost_payments (claim_id, paid_at desc, created_at desc);
create index project_cost_payment_events_claim_created_idx
  on public.project_cost_payment_events (claim_id, created_at asc, id asc);

alter table public.project_cost_payment_ledgers enable row level security;
alter table public.project_cost_payments enable row level security;
alter table public.project_cost_payment_events enable row level security;

create or replace function public.private_active_project_cost_payment_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active
    and p.role in ('owner', 'manager')
$$;

create or replace function public.private_project_cost_paid_total(target_claim_id uuid)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(sum(payment.amount), 0)::numeric(14,2)
  from public.project_cost_payments payment
  where payment.claim_id = target_claim_id
    and payment.status = 'recorded'
$$;

create or replace function public.private_project_cost_payment_snapshot(payment public.project_cost_payments)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', payment.id,
    'payment_number', payment.payment_number,
    'claim_id', payment.claim_id,
    'status', payment.status,
    'currency', payment.currency,
    'amount', payment.amount,
    'paid_at', payment.paid_at,
    'payment_channel', payment.payment_channel,
    'payment_reference', payment.payment_reference,
    'note', payment.note,
    'recorded_by', payment.recorded_by,
    'recorded_at', payment.recorded_at,
    'version', payment.version
  )
$$;

create or replace function public.private_append_project_cost_payment_event(
  payment public.project_cost_payments,
  target_event_type text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.project_cost_payment_events (
    payment_id, claim_id, event_type, actor_id, payment_version, reason, payload
  ) values (
    payment.id, payment.claim_id, target_event_type, auth.uid(), payment.version,
    nullif(trim(target_reason), ''), public.private_project_cost_payment_snapshot(payment)
  );
end;
$$;

create or replace function public.private_assert_project_cost_payment_claim(target_claim_id uuid)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
begin
  if public.private_active_project_cost_payment_role() is null then
    raise exception 'Project Cost payments are available only to an active Principal or Operations Manager' using errcode = '42501';
  end if;

  select * into claim
  from public.internal_cost_claims
  where id = target_claim_id
  for update;

  if not found then
    raise exception 'Project Cost not found' using errcode = 'P0002';
  end if;
  if not public.can_access_internal_cost_claim_project(claim.project_id) then
    raise exception 'You do not have authority for this project' using errcode = '42501';
  end if;
  if claim.lifecycle <> 'approved' or claim.approved_total is null then
    raise exception 'Only an approved Project Cost can receive a payment' using errcode = '22023';
  end if;

  return claim;
end;
$$;

create or replace function public.record_project_cost_payment(
  target_claim_id uuid,
  target_amount numeric,
  target_paid_at date,
  target_payment_channel text,
  target_payment_reference text default null,
  target_note text default null,
  target_history_complete boolean default false
)
returns public.project_cost_payments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  payment public.project_cost_payments;
  already_paid numeric(14,2);
  sequence_value bigint;
begin
  claim := public.private_assert_project_cost_payment_claim(target_claim_id);

  if target_amount is null or target_amount <= 0 then
    raise exception 'Payment amount must be greater than zero' using errcode = '22023';
  end if;
  if target_paid_at is null then
    raise exception 'Payment date is required' using errcode = '22023';
  end if;
  if target_paid_at > (now() at time zone 'Africa/Nairobi')::date then
    raise exception 'Payment date cannot be in the future' using errcode = '22023';
  end if;
  if target_payment_channel not in ('mpesa', 'bank_transfer', 'cash', 'other') then
    raise exception 'Payment method is invalid' using errcode = '22023';
  end if;

  already_paid := public.private_project_cost_paid_total(claim.id);
  if round(already_paid + target_amount, 2) > claim.approved_total then
    raise exception 'Payment would exceed the approved Project Cost balance' using errcode = 'BPC02';
  end if;

  sequence_value := nextval('public.project_cost_payment_number_seq');
  insert into public.project_cost_payments (
    payment_sequence, payment_number, claim_id, amount, paid_at, payment_channel,
    payment_reference, note, recorded_by
  ) values (
    sequence_value,
    'BDPAY-' || to_char(target_paid_at, 'YYYY') || '-' || lpad(sequence_value::text, 6, '0'),
    claim.id,
    round(target_amount, 2),
    target_paid_at,
    target_payment_channel,
    nullif(trim(target_payment_reference), ''),
    nullif(trim(target_note), ''),
    auth.uid()
  ) returning * into payment;

  -- A legacy claim has unknown opening history. Recording one payment alone does not prove
  -- that all older payments are known. The caller must explicitly say the history is complete.
  insert into public.project_cost_payment_ledgers (
    claim_id, history_complete, established_by, established_at
  ) values (
    claim.id,
    target_history_complete,
    case when target_history_complete then auth.uid() else null end,
    case when target_history_complete then now() else null end
  )
  on conflict (claim_id) do update set
    history_complete = public.project_cost_payment_ledgers.history_complete or excluded.history_complete,
    established_by = case
      when public.project_cost_payment_ledgers.history_complete then public.project_cost_payment_ledgers.established_by
      when excluded.history_complete then auth.uid()
      else null
    end,
    established_at = case
      when public.project_cost_payment_ledgers.history_complete then public.project_cost_payment_ledgers.established_at
      when excluded.history_complete then now()
      else null
    end,
    updated_at = now();

  perform public.private_append_project_cost_payment_event(payment, 'recorded', null);
  return payment;
end;
$$;

-- Existing approved costs begin in an explicitly unknown state. Only the Principal may say
-- that the historical record is now complete after the real payments have been entered.
create or replace function public.complete_project_cost_payment_history(target_claim_id uuid)
returns public.project_cost_payment_ledgers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  ledger public.project_cost_payment_ledgers;
begin
  if public.private_active_project_cost_payment_role() <> 'owner' then
    raise exception 'Only the Principal can confirm historical Project Cost payment history' using errcode = '42501';
  end if;

  claim := public.private_assert_project_cost_payment_claim(target_claim_id);

  insert into public.project_cost_payment_ledgers (
    claim_id, history_complete, established_by, established_at
  ) values (
    claim.id, true, auth.uid(), now()
  )
  on conflict (claim_id) do update set
    history_complete = true,
    established_by = coalesce(public.project_cost_payment_ledgers.established_by, auth.uid()),
    established_at = coalesce(public.project_cost_payment_ledgers.established_at, now()),
    updated_at = now()
  returning * into ledger;

  return ledger;
end;
$$;

create or replace function public.reverse_project_cost_payment(
  target_payment_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.project_cost_payments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  payment public.project_cost_payments;
  claim public.internal_cost_claims;
begin
  if public.private_active_project_cost_payment_role() <> 'owner' then
    raise exception 'Only the Principal can reverse a Project Cost payment' using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A reversal reason is required' using errcode = '22023';
  end if;

  select * into payment
  from public.project_cost_payments
  where id = target_payment_id
  for update;

  if not found then raise exception 'Project Cost payment not found' using errcode = 'P0002'; end if;
  if payment.status <> 'recorded' then raise exception 'Payment is already reversed' using errcode = '22023'; end if;
  if payment.version <> target_expected_version then
    raise exception 'Payment changed elsewhere' using errcode = '40001';
  end if;

  select * into claim from public.internal_cost_claims where id = payment.claim_id;
  if not public.can_access_internal_cost_claim_project(claim.project_id) then
    raise exception 'You do not have authority for this project' using errcode = '42501';
  end if;

  update public.project_cost_payments
  set status = 'reversed', reversed_by = auth.uid(), reversed_at = now(),
      reversal_reason = trim(target_reason), version = version + 1, updated_at = now()
  where id = payment.id
  returning * into payment;

  perform public.private_append_project_cost_payment_event(payment, 'reversed', target_reason);
  return payment;
end;
$$;

-- Read model for the Simple-Invoice-style Project Costs register.
-- balance is deliberately NULL until history_complete is true.
create or replace function public.project_cost_payment_positions()
returns table (
  claim_id uuid,
  payment_history_complete boolean,
  payment_count bigint,
  paid_amount numeric,
  balance_amount numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    claim.id,
    coalesce(ledger.history_complete, false),
    count(payment.id) filter (where payment.status = 'recorded'),
    case
      when coalesce(ledger.history_complete, false)
        then coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0)::numeric(14,2)
      else null
    end,
    case
      when coalesce(ledger.history_complete, false)
        then greatest(
          coalesce(claim.approved_total, claim.submitted_total, 0)
          - coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0),
          0
        )::numeric(14,2)
      else null
    end
  from public.internal_cost_claims claim
  left join public.project_cost_payment_ledgers ledger on ledger.claim_id = claim.id
  left join public.project_cost_payments payment on payment.claim_id = claim.id
  where public.can_access_internal_cost_claim_project(claim.project_id)
  group by claim.id, ledger.history_complete
$$;

-- New approvals start with complete payment knowledge at KES 0. Existing approved claims are
-- untouched and therefore remain unknown until explicitly completed by the Principal.
create or replace function public.start_project_cost_payment_tracking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.lifecycle = 'approved' and (tg_op = 'INSERT' or old.lifecycle is distinct from 'approved') then
    insert into public.project_cost_payment_ledgers (
      claim_id, history_complete, established_by, established_at
    ) values (
      new.id, true, coalesce(new.decider_id, new.direct_authority_actor_id, new.requester_id), now()
    ) on conflict (claim_id) do nothing;
  end if;
  return new;
end;
$$;

create trigger internal_cost_claim_start_payment_tracking
  after insert or update of lifecycle on public.internal_cost_claims
  for each row execute function public.start_project_cost_payment_tracking();

-- An approved cost with recorded payments cannot simply disappear through cancellation.
-- Reverse the payment truth first, then cancel the cost if that is really the correction.
create or replace function public.guard_paid_project_cost_cancellation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.lifecycle = 'approved' and new.lifecycle = 'cancelled'
     and public.private_project_cost_paid_total(old.id) > 0 then
    raise exception 'Reverse recorded payments before cancelling this Project Cost' using errcode = 'BPC03';
  end if;
  return new;
end;
$$;

create trigger internal_cost_claim_guard_paid_cancellation
  before update of lifecycle on public.internal_cost_claims
  for each row execute function public.guard_paid_project_cost_cancellation();

create policy "project_cost_payment_ledgers_select_authorised"
on public.project_cost_payment_ledgers for select to authenticated
using (exists (
  select 1 from public.internal_cost_claims claim
  where claim.id = claim_id
    and public.can_access_internal_cost_claim_project(claim.project_id)
));

create policy "project_cost_payments_select_authorised"
on public.project_cost_payments for select to authenticated
using (exists (
  select 1 from public.internal_cost_claims claim
  where claim.id = claim_id
    and public.can_access_internal_cost_claim_project(claim.project_id)
));

create policy "project_cost_payment_events_select_authorised"
on public.project_cost_payment_events for select to authenticated
using (exists (
  select 1 from public.internal_cost_claims claim
  where claim.id = claim_id
    and public.can_access_internal_cost_claim_project(claim.project_id)
));

-- Writes are RPC-only. No INSERT/UPDATE/DELETE policy and no table write grant is added.
revoke all on public.project_cost_payment_ledgers from anon, authenticated;
revoke all on public.project_cost_payments from anon, authenticated;
revoke all on public.project_cost_payment_events from anon, authenticated;
grant select on public.project_cost_payment_ledgers to authenticated;
grant select on public.project_cost_payments to authenticated;
grant select on public.project_cost_payment_events to authenticated;

grant execute on function public.record_project_cost_payment(uuid, numeric, date, text, text, text, boolean) to authenticated;
grant execute on function public.complete_project_cost_payment_history(uuid) to authenticated;
grant execute on function public.reverse_project_cost_payment(uuid, integer, text) to authenticated;
grant execute on function public.project_cost_payment_positions() to authenticated;

comment on table public.project_cost_payments is
  'Money actually paid against one approved Project Cost. Does not require a fund request or Advance.';
comment on table public.project_cost_payment_ledgers is
  'Whether the Operations Hub holds the complete payment history for a Project Cost. Existing historical costs remain unknown until explicitly confirmed.';
