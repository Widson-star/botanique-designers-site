-- BOTANIQUE DESIGNERS — Project Cost historical settlement ("Mark paid").
--
-- Founder ruling, 12 Aug 2026:
--   Every Project Cost that is already APPROVED was fully settled. Their detailed
--   payment transaction history was overtaken by events and was never captured in
--   the Hub. The register must stop showing Paid — / Balance — for them, and it
--   must do so WITHOUT inventing a payment date, a method or a reference.
--
-- WHY A THIRD CONCEPT, AND NOT A PAYMENT ROW.
-- The obvious shortcut is to write ordinary project_cost_payments rows. It was
-- rejected. paid_at and payment_channel are NOT NULL on that table precisely
-- because a row there asserts a real transaction; making them nullable to admit
-- these legacy costs would weaken that guarantee for every genuine payment the
-- Hub will ever hold, and would leave no way to tell a real M-Pesa payment from
-- a bookkeeping assertion. So the ledger — which already answers "does the Hub
-- know this cost's payment history?" — gains a second, separate fact: an amount
-- the Principal confirms was settled historically, with no transaction detail
-- claimed. Nothing about the transaction table changes.
--
-- The three concepts stay distinct and are not interchangeable:
--   Record payment            — an actual transaction: amount, date, method, reference.
--   Confirm payment history   — the history was checked and genuinely NOTHING was paid.
--   Mark paid                 — the Principal confirms full historical settlement,
--                               amount known, transaction detail unknown and unclaimed.
--
-- Effective paid = confirmed historical settlement + genuine recorded payments.
-- The two never overlap: Mark paid settles only what recorded payments leave
-- outstanding, and it is refused once a cost's payment history is already known,
-- so the same shilling can never be counted twice.
--
-- Additive only. No applied migration is edited, no payment row is deleted, no
-- Advance, Fund Request, Company Expense or Staff Compensation object is touched.

-- ---------------------------------------------------------------------------
-- 1. The ledger carries the confirmed historical settlement.
-- ---------------------------------------------------------------------------

alter table public.project_cost_payment_ledgers
  add column historical_settlement_amount numeric(14,2) not null default 0
    check (historical_settlement_amount >= 0),
  add column historical_settlement_by uuid null references public.profiles(id) on delete restrict,
  add column historical_settlement_at timestamptz null,
  add column historical_settlement_note text null check (
    historical_settlement_note is null
    or char_length(trim(historical_settlement_note)) between 1 and 2000
  );

-- A settled amount always carries who confirmed it and when. Zero carries neither.
alter table public.project_cost_payment_ledgers
  add constraint project_cost_payment_ledger_settlement_consistency check (
    (historical_settlement_amount > 0
      and historical_settlement_by is not null and historical_settlement_at is not null)
    or
    (historical_settlement_amount = 0
      and historical_settlement_by is null and historical_settlement_at is null
      and historical_settlement_note is null)
  );

comment on column public.project_cost_payment_ledgers.historical_settlement_amount is
  'Amount the Principal confirms was settled historically, with no transaction detail claimed. Distinct from project_cost_payments, which record actual transactions.';

-- ---------------------------------------------------------------------------
-- 2. Every confirmation and every correction is audited, and nothing is deleted.
-- ---------------------------------------------------------------------------

-- project_cost_payment_events cannot serve here: payment_id is NOT NULL there,
-- because every row in it is an event about one transaction. A historical
-- settlement is an event about the cost, so it gets its own audit stream.
create table public.project_cost_settlement_events (
  id uuid primary key default gen_random_uuid(),
  claim_id uuid not null references public.internal_cost_claims(id) on delete restrict,
  event_type text not null check (event_type in ('historically_settled', 'settlement_corrected')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  amount numeric(14,2) not null check (amount >= 0),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  created_at timestamptz not null default now()
);

create index project_cost_settlement_events_claim_created_idx
  on public.project_cost_settlement_events (claim_id, created_at asc, id asc);

alter table public.project_cost_settlement_events enable row level security;

comment on table public.project_cost_settlement_events is
  'Immutable audit of Principal-confirmed historical Project Cost settlements and their corrections.';

-- ---------------------------------------------------------------------------
-- 3. Effective paid total. Private: it is an implementation detail of the RPCs.
-- ---------------------------------------------------------------------------

-- private_project_cost_paid_total keeps meaning "money in recorded transactions"
-- and is deliberately left alone, because the cancellation guard asks exactly
-- that question. Overpayment is a question about the whole settled position.
create or replace function public.private_project_cost_effective_paid_total(target_claim_id uuid)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (
    coalesce((
      select ledger.historical_settlement_amount
      from public.project_cost_payment_ledgers ledger
      where ledger.claim_id = target_claim_id
    ), 0)
    + public.private_project_cost_paid_total(target_claim_id)
  )::numeric(14,2)
$$;

-- ---------------------------------------------------------------------------
-- 4. Mark paid.
-- ---------------------------------------------------------------------------

create or replace function public.mark_project_cost_paid(
  target_claim_id uuid,
  target_note text default null
)
returns public.project_cost_payment_ledgers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  ledger public.project_cost_payment_ledgers;
  already_recorded numeric(14,2);
  outstanding numeric(14,2);
begin
  if public.private_active_project_cost_payment_role() <> 'owner' then
    raise exception 'Only the Principal can mark a Project Cost as historically settled' using errcode = '42501';
  end if;

  -- Also asserts owner authority, project authority, approved lifecycle, and
  -- takes the row lock. Draft and Awaiting Review are refused here.
  claim := public.private_assert_project_cost_payment_claim(target_claim_id);

  select * into ledger
  from public.project_cost_payment_ledgers
  where claim_id = claim.id
  for update;

  -- Mark paid is the route for a cost whose payment history is UNKNOWN. Once the
  -- Hub knows the history, settling what remains is a real transaction and must
  -- come through record_project_cost_payment with its actual date and method.
  if found and ledger.history_complete then
    raise exception 'This Project Cost already has a confirmed payment history. Record the remaining payment with its actual date and method instead.'
      using errcode = '22023';
  end if;

  already_recorded := public.private_project_cost_paid_total(claim.id);
  outstanding := round(claim.approved_total - already_recorded, 2);

  if outstanding <= 0 then
    raise exception 'This Project Cost is already fully paid' using errcode = '22023';
  end if;

  insert into public.project_cost_payment_ledgers (
    claim_id, history_complete, established_by, established_at,
    historical_settlement_amount, historical_settlement_by, historical_settlement_at,
    historical_settlement_note
  ) values (
    claim.id, true, auth.uid(), now(),
    outstanding, auth.uid(), now(), nullif(trim(target_note), '')
  )
  on conflict (claim_id) do update set
    history_complete = true,
    established_by = auth.uid(),
    established_at = now(),
    historical_settlement_amount = excluded.historical_settlement_amount,
    historical_settlement_by = auth.uid(),
    historical_settlement_at = now(),
    historical_settlement_note = excluded.historical_settlement_note,
    updated_at = now()
  returning * into ledger;

  insert into public.project_cost_settlement_events (
    claim_id, event_type, actor_id, amount, reason, payload
  ) values (
    claim.id, 'historically_settled', auth.uid(), outstanding,
    nullif(trim(target_note), ''),
    jsonb_build_object(
      'approved_total', claim.approved_total,
      'recorded_payments_total', already_recorded,
      'historically_settled_amount', outstanding
    )
  );

  return ledger;
end;
$$;

comment on function public.mark_project_cost_paid(uuid, text) is
  'Principal-only confirmation that an approved Project Cost with unknown payment history was fully settled. Claims no payment date, method or reference.';

-- ---------------------------------------------------------------------------
-- 5. Correction. Reversible without deleting anything.
-- ---------------------------------------------------------------------------

create or replace function public.correct_project_cost_historical_settlement(
  target_claim_id uuid,
  target_reason text
)
returns public.project_cost_payment_ledgers
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  ledger public.project_cost_payment_ledgers;
  settled numeric(14,2);
begin
  if public.private_active_project_cost_payment_role() <> 'owner' then
    raise exception 'Only the Principal can correct a historical Project Cost settlement' using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A correction reason is required' using errcode = '22023';
  end if;

  claim := public.private_assert_project_cost_payment_claim(target_claim_id);

  select * into ledger
  from public.project_cost_payment_ledgers
  where claim_id = claim.id
  for update;

  if not found or ledger.historical_settlement_amount <= 0 then
    raise exception 'This Project Cost has no historical settlement to correct' using errcode = '22023';
  end if;

  settled := ledger.historical_settlement_amount;

  -- Mark paid is only reachable from unknown history, so withdrawing it returns
  -- the cost to exactly the truthful state it came from. Recorded payments are
  -- untouched: this reverses an assertion, not a transaction.
  update public.project_cost_payment_ledgers
  set history_complete = false,
      established_by = null,
      established_at = null,
      historical_settlement_amount = 0,
      historical_settlement_by = null,
      historical_settlement_at = null,
      historical_settlement_note = null,
      updated_at = now()
  where claim_id = claim.id
  returning * into ledger;

  insert into public.project_cost_settlement_events (
    claim_id, event_type, actor_id, amount, reason, payload
  ) values (
    claim.id, 'settlement_corrected', auth.uid(), settled, trim(target_reason),
    jsonb_build_object(
      'withdrawn_settlement_amount', settled,
      'recorded_payments_total', public.private_project_cost_paid_total(claim.id)
    )
  );

  return ledger;
end;
$$;

comment on function public.correct_project_cost_historical_settlement(uuid, text) is
  'Principal-only withdrawal of a confirmed historical settlement, returning the Project Cost to unknown payment history. Deletes no payment.';

-- ---------------------------------------------------------------------------
-- 6. Recording a payment respects the confirmed settlement.
-- ---------------------------------------------------------------------------

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
  settled numeric(14,2);
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

  -- A cost confirmed as historically settled is closed. Adding a transaction to
  -- it would double-count, so the confirmation has to be corrected first.
  select coalesce(ledger.historical_settlement_amount, 0) into settled
  from public.project_cost_payment_ledgers ledger
  where ledger.claim_id = claim.id;

  if coalesce(settled, 0) > 0 then
    raise exception 'This Project Cost is confirmed as historically settled. Correct that confirmation before recording a payment against it.'
      using errcode = 'BPC04';
  end if;

  already_paid := public.private_project_cost_effective_paid_total(claim.id);
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

-- ---------------------------------------------------------------------------
-- 7. Cancellation stays guarded, and now covers the settled position too.
-- ---------------------------------------------------------------------------

create or replace function public.guard_paid_project_cost_cancellation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.lifecycle = 'approved' and new.lifecycle = 'cancelled' then
    if public.private_project_cost_paid_total(old.id) > 0 then
      raise exception 'Reverse recorded payments before cancelling this Project Cost' using errcode = 'BPC03';
    end if;
    if public.private_project_cost_effective_paid_total(old.id) > 0 then
      raise exception 'Correct the confirmed historical settlement before cancelling this Project Cost' using errcode = 'BPC03';
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Read model. Paid and Balance now include the confirmed settlement.
-- ---------------------------------------------------------------------------

drop function if exists public.project_cost_payment_positions();

create function public.project_cost_payment_positions()
returns table (
  claim_id uuid,
  payment_history_complete boolean,
  payment_count bigint,
  paid_amount numeric,
  balance_amount numeric,
  historical_settlement_amount numeric
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
        then (
          coalesce(ledger.historical_settlement_amount, 0)
          + coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0)
        )::numeric(14,2)
      else null
    end,
    case
      when coalesce(ledger.history_complete, false)
        then greatest(
          coalesce(claim.approved_total, claim.submitted_total, 0)
          - coalesce(ledger.historical_settlement_amount, 0)
          - coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0),
          0
        )::numeric(14,2)
      else null
    end,
    coalesce(ledger.historical_settlement_amount, 0)::numeric(14,2)
  from public.internal_cost_claims claim
  left join public.project_cost_payment_ledgers ledger on ledger.claim_id = claim.id
  left join public.project_cost_payments payment on payment.claim_id = claim.id
  where public.can_access_internal_cost_claim_project(claim.project_id)
  group by claim.id, ledger.history_complete, ledger.historical_settlement_amount
$$;

-- ---------------------------------------------------------------------------
-- 9. Privileges. Reads are RLS-filtered; writes stay RPC-only.
-- ---------------------------------------------------------------------------

create policy "project_cost_settlement_events_select_authorised"
on public.project_cost_settlement_events for select to authenticated
using (exists (
  select 1 from public.internal_cost_claims claim
  where claim.id = claim_id
    and public.can_access_internal_cost_claim_project(claim.project_id)
));

revoke all on public.project_cost_settlement_events from anon, authenticated;
grant select on public.project_cost_settlement_events to authenticated;

-- PostgreSQL grants EXECUTE to PUBLIC on every new function unless it is revoked.
revoke execute on function public.private_project_cost_effective_paid_total(uuid) from public, anon, authenticated;
revoke execute on function public.guard_paid_project_cost_cancellation() from public, anon, authenticated;

revoke execute on function public.mark_project_cost_paid(uuid, text) from public, anon;
revoke execute on function public.correct_project_cost_historical_settlement(uuid, text) from public, anon;
revoke execute on function public.project_cost_payment_positions() from public, anon;
revoke execute on function public.record_project_cost_payment(uuid, numeric, date, text, text, text, boolean) from public, anon;

grant execute on function public.mark_project_cost_paid(uuid, text) to authenticated;
grant execute on function public.correct_project_cost_historical_settlement(uuid, text) to authenticated;
grant execute on function public.project_cost_payment_positions() to authenticated;
grant execute on function public.record_project_cost_payment(uuid, numeric, date, text, text, text, boolean) to authenticated;
