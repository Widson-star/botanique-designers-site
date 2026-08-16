-- BOTANIQUE DESIGNERS — Staff Compensation Payment Truth V1.
--
-- Approval is not payment. This migration records money actually paid against
-- one approved Staff Compensation record and derives the remaining balance.
-- Project linkage remains optional context only and is never consulted when
-- recording, reversing, or reading compensation payments.
--
-- Staff Compensation V1 was introduced with zero production rows, so every
-- future compensation record begins with complete payment knowledge at KES 0.
-- Unlike historical Project Costs, no "unknown opening payment history" ledger
-- is necessary here.
--
-- Deliberate non-scope: no LEM migration, no Project Cost rewrite, no Advances,
-- no payroll engine, no Approvals aggregation, and no Staff Compensation UI.

create sequence public.staff_compensation_payment_number_seq
  as bigint start with 1 increment by 1;

create table public.staff_compensation_payments (
  id uuid primary key default gen_random_uuid(),
  payment_sequence bigint not null default nextval('public.staff_compensation_payment_number_seq'),
  payment_number text not null,
  compensation_id uuid not null references public.staff_compensations(id) on delete restrict,
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
  constraint staff_compensation_payment_number_unique unique (payment_number),
  constraint staff_compensation_payment_sequence_unique unique (payment_sequence),
  constraint staff_compensation_payment_reversal_consistency check (
    (status = 'recorded' and reversed_by is null and reversed_at is null and reversal_reason is null)
    or
    (status = 'reversed' and reversed_by is not null and reversed_at is not null and reversal_reason is not null)
  )
);

create table public.staff_compensation_payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.staff_compensation_payments(id) on delete restrict,
  compensation_id uuid not null references public.staff_compensations(id) on delete restrict,
  event_type text not null check (event_type in ('recorded', 'reversed')),
  actor_id uuid not null references public.profiles(id) on delete restrict,
  payment_version integer not null check (payment_version > 0),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 2000),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload) = 'object'),
  occurred_at timestamptz not null default now()
);

create index staff_compensation_payments_record_idx
  on public.staff_compensation_payments (compensation_id, paid_at desc, created_at desc);
create index staff_compensation_payments_recorded_by_idx
  on public.staff_compensation_payments (recorded_by);
create index staff_compensation_payments_reversed_by_idx
  on public.staff_compensation_payments (reversed_by)
  where reversed_by is not null;
create index staff_compensation_payment_events_record_idx
  on public.staff_compensation_payment_events (compensation_id, occurred_at asc, id asc);
create index staff_compensation_payment_events_actor_idx
  on public.staff_compensation_payment_events (actor_id);

alter table public.staff_compensation_payments enable row level security;
alter table public.staff_compensation_payment_events enable row level security;

create or replace function public.private_staff_compensation_paid_total(target_compensation_id uuid)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(sum(payment.amount), 0)::numeric(14,2)
  from public.staff_compensation_payments payment
  where payment.compensation_id = target_compensation_id
    and payment.status = 'recorded'
$$;

create or replace function public.private_staff_compensation_payment_snapshot(
  payment public.staff_compensation_payments
)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', payment.id,
    'payment_number', payment.payment_number,
    'compensation_id', payment.compensation_id,
    'status', payment.status,
    'currency', payment.currency,
    'amount', payment.amount,
    'paid_at', payment.paid_at,
    'payment_channel', payment.payment_channel,
    'payment_reference', payment.payment_reference,
    'note', payment.note,
    'recorded_by', payment.recorded_by,
    'recorded_at', payment.recorded_at,
    'reversed_by', payment.reversed_by,
    'reversed_at', payment.reversed_at,
    'reversal_reason', payment.reversal_reason,
    'version', payment.version
  )
$$;

create or replace function public.private_append_staff_compensation_payment_event(
  payment public.staff_compensation_payments,
  target_event_type text,
  target_reason text default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  insert into public.staff_compensation_payment_events (
    payment_id,
    compensation_id,
    event_type,
    actor_id,
    payment_version,
    reason,
    payload
  ) values (
    payment.id,
    payment.compensation_id,
    target_event_type,
    auth.uid(),
    payment.version,
    nullif(trim(target_reason), ''),
    public.private_staff_compensation_payment_snapshot(payment)
  );
end;
$$;

create or replace function public.private_assert_payable_staff_compensation(target_compensation_id uuid)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  compensation public.staff_compensations;
begin
  if public.private_active_staff_compensation_role() <> 'owner' then
    raise exception 'Only the Principal can record a Staff Compensation payment'
      using errcode = '42501';
  end if;

  -- The compensation row is the single serialisation point for payment truth.
  select * into compensation
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if compensation.lifecycle <> 'approved' or compensation.approved_amount is null then
    raise exception 'Only approved Staff Compensation can receive a payment'
      using errcode = '22023';
  end if;

  -- Deliberately no Project or People active-state check here. A legitimate
  -- approved obligation remains payable after a Project or engagement ends.
  return compensation;
end;
$$;

create or replace function public.record_staff_compensation_payment(
  target_compensation_id uuid,
  target_amount numeric,
  target_paid_at date,
  target_payment_channel text,
  target_payment_reference text default null,
  target_note text default null
)
returns public.staff_compensation_payments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  compensation public.staff_compensations;
  payment public.staff_compensation_payments;
  already_paid numeric(14,2);
  sequence_value bigint;
begin
  compensation := public.private_assert_payable_staff_compensation(target_compensation_id);

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
  if target_payment_reference is not null
     and nullif(trim(target_payment_reference), '') is null then
    raise exception 'Payment reference cannot be blank' using errcode = '22023';
  end if;
  if target_payment_reference is not null
     and char_length(trim(target_payment_reference)) > 120 then
    raise exception 'Payment reference must be 120 characters or fewer' using errcode = '22023';
  end if;
  if target_note is not null and nullif(trim(target_note), '') is null then
    raise exception 'Payment note cannot be blank' using errcode = '22023';
  end if;
  if target_note is not null and char_length(trim(target_note)) > 2000 then
    raise exception 'Payment note must be 2000 characters or fewer' using errcode = '22023';
  end if;

  already_paid := public.private_staff_compensation_paid_total(compensation.id);
  if round(already_paid + target_amount, 2) > compensation.approved_amount then
    raise exception 'Payment would exceed the approved Staff Compensation balance'
      using errcode = 'BSC02';
  end if;

  sequence_value := nextval('public.staff_compensation_payment_number_seq');
  insert into public.staff_compensation_payments (
    payment_sequence,
    payment_number,
    compensation_id,
    amount,
    paid_at,
    payment_channel,
    payment_reference,
    note,
    recorded_by
  ) values (
    sequence_value,
    'BDSCPAY-' || to_char(target_paid_at, 'YYYY') || '-' || lpad(sequence_value::text, 6, '0'),
    compensation.id,
    round(target_amount, 2),
    target_paid_at,
    target_payment_channel,
    nullif(trim(target_payment_reference), ''),
    nullif(trim(target_note), ''),
    auth.uid()
  ) returning * into payment;

  perform public.private_append_staff_compensation_payment_event(payment, 'recorded', null);
  return payment;
end;
$$;

create or replace function public.reverse_staff_compensation_payment(
  target_payment_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.staff_compensation_payments
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  payment public.staff_compensation_payments;
  compensation public.staff_compensations;
  owning_compensation_id uuid;
begin
  if public.private_active_staff_compensation_role() <> 'owner' then
    raise exception 'Only the Principal can reverse a Staff Compensation payment'
      using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A reversal reason is required' using errcode = '22023';
  end if;
  if char_length(trim(target_reason)) > 2000 then
    raise exception 'Reversal reason must be 2000 characters or fewer' using errcode = '22023';
  end if;

  -- Resolve the immutable parent id first, then lock parent -> payment. This is
  -- the same canonical lock order used by Project Cost payment truth.
  select p.compensation_id into owning_compensation_id
  from public.staff_compensation_payments p
  where p.id = target_payment_id;

  if not found then
    raise exception 'Staff Compensation payment not found' using errcode = 'P0002';
  end if;

  select * into compensation
  from public.staff_compensations
  where id = owning_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;

  select * into payment
  from public.staff_compensation_payments
  where id = target_payment_id
  for update;

  if payment.status <> 'recorded' then
    raise exception 'Payment is already reversed' using errcode = '22023';
  end if;
  if payment.version <> target_expected_version then
    raise exception 'Payment changed elsewhere' using errcode = '40001';
  end if;

  update public.staff_compensation_payments
  set status = 'reversed',
      reversed_by = auth.uid(),
      reversed_at = now(),
      reversal_reason = trim(target_reason),
      version = version + 1,
      updated_at = now()
  where id = payment.id
  returning * into payment;

  perform public.private_append_staff_compensation_payment_event(payment, 'reversed', target_reason);
  return payment;
end;
$$;

create or replace function public.staff_compensation_payment_positions()
returns table (
  compensation_id uuid,
  approved_amount numeric,
  payment_count bigint,
  paid_amount numeric,
  balance_amount numeric,
  payment_status text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    compensation.id,
    compensation.approved_amount,
    count(payment.id) filter (where payment.status = 'recorded'),
    case
      when compensation.lifecycle = 'approved'
        then coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0)::numeric(14,2)
      else null
    end,
    case
      when compensation.lifecycle = 'approved'
        then greatest(
          compensation.approved_amount
          - coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0),
          0
        )::numeric(14,2)
      else null
    end,
    case
      when compensation.lifecycle <> 'approved' then compensation.lifecycle
      when coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0) = 0 then 'unpaid'
      when coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0) < compensation.approved_amount then 'part_paid'
      else 'paid'
    end
  from public.staff_compensations compensation
  left join public.staff_compensation_payments payment
    on payment.compensation_id = compensation.id
  where public.can_access_staff_compensation()
  group by compensation.id, compensation.lifecycle, compensation.approved_amount
$$;

-- An approved Staff Compensation record with real payment history cannot be
-- cancelled as though no money moved. Reverse the recorded payments first so
-- payment truth remains explicit and auditable.
create or replace function public.guard_paid_staff_compensation_cancellation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.lifecycle = 'approved'
     and new.lifecycle = 'cancelled'
     and public.private_staff_compensation_paid_total(old.id) > 0 then
    raise exception 'Reverse recorded payments before cancelling this Staff Compensation record'
      using errcode = 'BSC03';
  end if;
  return new;
end;
$$;

create trigger staff_compensation_guard_paid_cancellation
  before update of lifecycle on public.staff_compensations
  for each row execute function public.guard_paid_staff_compensation_cancellation();

create or replace function public.private_reject_staff_compensation_payment_event_change()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Staff Compensation payment events are immutable' using errcode = '42501';
end;
$$;

create trigger staff_compensation_payment_events_immutable
  before update or delete on public.staff_compensation_payment_events
  for each row execute function public.private_reject_staff_compensation_payment_event_change();

create policy "staff_compensation_payments_select_authorised"
on public.staff_compensation_payments for select to authenticated
using (public.can_access_staff_compensation());

create policy "staff_compensation_payment_events_select_authorised"
on public.staff_compensation_payment_events for select to authenticated
using (public.can_access_staff_compensation());

-- Writes are RPC-only.
revoke all on public.staff_compensation_payments from anon, authenticated;
revoke all on public.staff_compensation_payment_events from anon, authenticated;
grant select on public.staff_compensation_payments to authenticated;
grant select on public.staff_compensation_payment_events to authenticated;

-- Internal helpers and trigger functions are never callable through the API.
revoke execute on function public.private_staff_compensation_paid_total(uuid) from public, anon, authenticated;
revoke execute on function public.private_staff_compensation_payment_snapshot(public.staff_compensation_payments) from public, anon, authenticated;
revoke execute on function public.private_append_staff_compensation_payment_event(public.staff_compensation_payments, text, text) from public, anon, authenticated;
revoke execute on function public.private_assert_payable_staff_compensation(uuid) from public, anon, authenticated;
revoke execute on function public.guard_paid_staff_compensation_cancellation() from public, anon, authenticated;
revoke execute on function public.private_reject_staff_compensation_payment_event_change() from public, anon, authenticated;

revoke execute on function public.record_staff_compensation_payment(uuid, numeric, date, text, text, text) from public, anon;
revoke execute on function public.reverse_staff_compensation_payment(uuid, integer, text) from public, anon;
revoke execute on function public.staff_compensation_payment_positions() from public, anon;

grant execute on function public.record_staff_compensation_payment(uuid, numeric, date, text, text, text) to authenticated;
grant execute on function public.reverse_staff_compensation_payment(uuid, integer, text) to authenticated;
grant execute on function public.staff_compensation_payment_positions() to authenticated;

comment on table public.staff_compensation_payments is
  'Money actually paid against one approved Staff Compensation record. Project status never gates payment.';
comment on function public.record_staff_compensation_payment(uuid, numeric, date, text, text, text) is
  'Principal-only audited recording of money actually paid against approved Staff Compensation.';
comment on function public.reverse_staff_compensation_payment(uuid, integer, text) is
  'Principal-only reversal. Locks Staff Compensation before its payment row to preserve payment truth.';