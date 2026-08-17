-- BOTANIQUE DESIGNERS — Staff Compensation historical settlement truth.
--
-- Founder correction, 17 Aug 2026:
-- Imported Staff Pay must not move from "payment history unknown" to an assumed
-- KES 0 paid merely because somebody checked the old record. Historical payment
-- truth is an AMOUNT, not a yes/no flag. This follows the already-proven Project
-- Cost settlement model without inventing payment dates, methods or references.
--
-- Three facts remain distinct:
--   1. historical_paid_amount — money the Principal confirms had already been
--      settled before Staff Pay became authoritative; transaction detail is not
--      claimed when it is unavailable;
--   2. staff_compensation_payments — real payment transactions, each with an
--      actual date and method;
--   3. approved_amount — the obligation. Approval is never payment.
--
-- Effective paid = confirmed historical amount + live recorded transactions.
-- The remaining balance and Unpaid / Part-paid / Paid state derive from that
-- effective amount. Project lifecycle remains irrelevant to settlement.

alter table public.staff_compensations
  add column if not exists historical_paid_amount numeric(14,2) not null default 0
    check (historical_paid_amount >= 0),
  add column if not exists payment_history_confirmed_by uuid null
    references public.profiles(id) on delete restrict,
  add column if not exists payment_history_confirmed_at timestamptz null,
  add column if not exists payment_history_note text null check (
    payment_history_note is null
    or char_length(trim(payment_history_note)) between 1 and 2000
  );

alter table public.staff_compensations
  drop constraint if exists staff_compensation_legacy_payment_history_consistency;

alter table public.staff_compensations
  add constraint staff_compensation_legacy_payment_history_consistency check (
    (
      legacy_source_claim_id is null
      and historical_paid_amount = 0
      and payment_history_confirmed_by is null
      and payment_history_confirmed_at is null
      and payment_history_note is null
    )
    or
    (
      legacy_source_claim_id is not null
      and not payment_history_known
      and historical_paid_amount = 0
      and payment_history_confirmed_by is null
      and payment_history_confirmed_at is null
      and payment_history_note is null
    )
    or
    (
      legacy_source_claim_id is not null
      and payment_history_known
      and payment_history_confirmed_by is not null
      and payment_history_confirmed_at is not null
      and payment_history_note is not null
      and approved_amount is not null
      and historical_paid_amount <= approved_amount
    )
  );

comment on column public.staff_compensations.historical_paid_amount is
  'Principal-confirmed amount already paid before a legacy Project Cost became Staff Pay. No payment date or method is asserted by this amount.';

alter table public.staff_compensation_events
  drop constraint if exists staff_compensation_events_event_type_check;

alter table public.staff_compensation_events
  add constraint staff_compensation_events_event_type_check check (event_type in (
    'created', 'amended', 'submitted', 'amendment_requested', 'resubmitted',
    'approved', 'rejected', 'withdrawn', 'cancelled', 'principal_authorised',
    'payment_history_confirmed', 'payment_history_corrected', 'legacy_imported'
  ));

create or replace function public.private_staff_compensation_snapshot(record public.staff_compensations)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'id', record.id,
    'person_id', record.person_id,
    'project_id', record.project_id,
    'service_date', record.service_date,
    'compensation_type', record.compensation_type,
    'currency', record.currency,
    'description', record.description,
    'lifecycle', record.lifecycle,
    'request_round', record.request_round,
    'submitted_amount', record.submitted_amount,
    'approved_amount', record.approved_amount,
    'requester_id', record.requester_id,
    'decider_id', record.decider_id,
    'direct_authority_actor_id', record.direct_authority_actor_id,
    'legacy_source_claim_id', record.legacy_source_claim_id,
    'payment_history_known', record.payment_history_known,
    'historical_paid_amount', record.historical_paid_amount,
    'payment_history_confirmed_by', record.payment_history_confirmed_by,
    'payment_history_confirmed_at', record.payment_history_confirmed_at,
    'payment_history_note', record.payment_history_note,
    'version', record.version
  )
$$;

-- The old three-argument RPC could only say "history checked" and therefore
-- turned an unknown legacy record into an assumed zero-paid record. Keep the
-- signature temporarily for stale clients, but fail closed instead of writing
-- false financial truth. New clients use the amount-based RPC below.
create or replace function public.confirm_staff_compensation_payment_history(
  target_compensation_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Historical Staff Pay now requires the amount already paid. Reload Staff Pay and use Resolve payment history.'
    using errcode = '22023';
end;
$$;

create or replace function public.confirm_staff_compensation_historical_payment_position(
  target_compensation_id uuid,
  target_expected_version integer,
  target_historical_paid_amount numeric,
  target_reason text
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
  recorded_total numeric(14,2);
begin
  if public.private_active_staff_compensation_role() is distinct from 'owner' then
    raise exception 'Only the Principal can confirm historical Staff Pay payment truth'
      using errcode = '42501';
  end if;
  if target_historical_paid_amount is null or target_historical_paid_amount < 0 then
    raise exception 'Historical paid amount must be zero or greater' using errcode = '22023';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A payment-history confirmation note is required' using errcode = '22023';
  end if;
  if char_length(trim(target_reason)) > 2000 then
    raise exception 'Payment-history confirmation note must be 2000 characters or fewer'
      using errcode = '22023';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Pay record not found' using errcode = 'P0002';
  end if;
  if record.lifecycle <> 'approved' or record.approved_amount is null then
    raise exception 'Only approved Staff Pay can have historical payment truth confirmed'
      using errcode = '22023';
  end if;
  if record.legacy_source_claim_id is null then
    raise exception 'Historical payment confirmation is only for imported Staff Pay records'
      using errcode = '22023';
  end if;
  if record.payment_history_known then
    raise exception 'Payment history is already confirmed' using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Pay version; refresh and try again'
      using errcode = '40001';
  end if;

  recorded_total := public.private_staff_compensation_paid_total(record.id);
  if round(recorded_total + target_historical_paid_amount, 2) > record.approved_amount then
    raise exception 'Historical paid amount plus recorded payments would exceed the approved Staff Pay amount'
      using errcode = 'BSC02';
  end if;

  update public.staff_compensations
  set payment_history_known = true,
      historical_paid_amount = round(target_historical_paid_amount, 2),
      payment_history_confirmed_by = auth.uid(),
      payment_history_confirmed_at = now(),
      payment_history_note = trim(target_reason),
      version = version + 1,
      updated_at = now()
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(
    record,
    'payment_history_confirmed',
    record.lifecycle,
    trim(target_reason)
  );

  return record;
end;
$$;

create or replace function public.correct_staff_compensation_historical_payment_position(
  target_compensation_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
  previous_historical_paid numeric(14,2);
begin
  if public.private_active_staff_compensation_role() is distinct from 'owner' then
    raise exception 'Only the Principal can correct historical Staff Pay payment truth'
      using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A correction reason is required' using errcode = '22023';
  end if;
  if char_length(trim(target_reason)) > 2000 then
    raise exception 'Correction reason must be 2000 characters or fewer' using errcode = '22023';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Pay record not found' using errcode = 'P0002';
  end if;
  if record.lifecycle <> 'approved' or record.legacy_source_claim_id is null then
    raise exception 'Only approved imported Staff Pay can have historical payment truth corrected'
      using errcode = '22023';
  end if;
  if not record.payment_history_known then
    raise exception 'Historical payment truth is already unconfirmed' using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Pay version; refresh and try again'
      using errcode = '40001';
  end if;

  previous_historical_paid := record.historical_paid_amount;

  update public.staff_compensations
  set payment_history_known = false,
      historical_paid_amount = 0,
      payment_history_confirmed_by = null,
      payment_history_confirmed_at = null,
      payment_history_note = null,
      version = version + 1,
      updated_at = now()
  where id = record.id
  returning * into record;

  perform public.private_append_staff_compensation_event(
    record,
    'payment_history_corrected',
    record.lifecycle,
    trim(target_reason) || ' Previous historical paid amount: KES ' || to_char(previous_historical_paid, 'FM999999999990.00')
  );

  return record;
end;
$$;

create or replace function public.private_staff_compensation_effective_paid_total(target_compensation_id uuid)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select (
    coalesce((
      select compensation.historical_paid_amount
      from public.staff_compensations compensation
      where compensation.id = target_compensation_id
    ), 0)
    + public.private_staff_compensation_paid_total(target_compensation_id)
  )::numeric(14,2)
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

  already_paid := public.private_staff_compensation_effective_paid_total(compensation.id);
  if round(already_paid + target_amount, 2) > compensation.approved_amount then
    raise exception 'Payment would exceed the approved Staff Pay balance'
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

create or replace function public.guard_paid_staff_compensation_cancellation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.lifecycle = 'approved' and new.lifecycle = 'cancelled' then
    if not old.payment_history_known then
      raise exception 'Confirm historical payment truth before cancelling this Staff Pay record'
        using errcode = 'BSC04';
    end if;
    if public.private_staff_compensation_effective_paid_total(old.id) > 0 then
      raise exception 'Correct historical settlement and reverse recorded payments before cancelling this Staff Pay record'
        using errcode = 'BSC03';
    end if;
  end if;
  return new;
end;
$$;

drop function if exists public.staff_compensation_payment_positions();

create function public.staff_compensation_payment_positions()
returns table (
  compensation_id uuid,
  approved_amount numeric,
  payment_count bigint,
  historical_paid_amount numeric,
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
      when compensation.lifecycle <> 'approved' then null
      when not compensation.payment_history_known then null
      else compensation.historical_paid_amount::numeric(14,2)
    end,
    case
      when compensation.lifecycle <> 'approved' then null
      when not compensation.payment_history_known then null
      else (
        compensation.historical_paid_amount
        + coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0)
      )::numeric(14,2)
    end,
    case
      when compensation.lifecycle <> 'approved' then null
      when not compensation.payment_history_known then null
      else greatest(
        compensation.approved_amount
        - compensation.historical_paid_amount
        - coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0),
        0
      )::numeric(14,2)
    end,
    case
      when compensation.lifecycle <> 'approved' then compensation.lifecycle
      when not compensation.payment_history_known then 'payment_history_unknown'
      when compensation.historical_paid_amount
           + coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0) = 0 then 'unpaid'
      when compensation.historical_paid_amount
           + coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0) < compensation.approved_amount then 'part_paid'
      else 'paid'
    end
  from public.staff_compensations compensation
  left join public.staff_compensation_payments payment
    on payment.compensation_id = compensation.id
  where public.can_access_staff_compensation()
  group by compensation.id, compensation.lifecycle, compensation.approved_amount,
           compensation.payment_history_known, compensation.historical_paid_amount
$$;

revoke all on function public.confirm_staff_compensation_historical_payment_position(uuid, integer, numeric, text)
  from public, anon;
grant execute on function public.confirm_staff_compensation_historical_payment_position(uuid, integer, numeric, text)
  to authenticated;

revoke all on function public.correct_staff_compensation_historical_payment_position(uuid, integer, text)
  from public, anon;
grant execute on function public.correct_staff_compensation_historical_payment_position(uuid, integer, text)
  to authenticated;

revoke all on function public.private_staff_compensation_effective_paid_total(uuid)
  from public, anon, authenticated;

revoke all on function public.staff_compensation_payment_positions() from public, anon;
grant execute on function public.staff_compensation_payment_positions() to authenticated;
