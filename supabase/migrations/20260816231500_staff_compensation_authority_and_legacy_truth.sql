-- BOTANIQUE DESIGNERS — Staff Compensation authority + legacy payment truth.
--
-- Founder ruling, 16 Aug 2026:
-- - Principal and authorised Manager can start Staff Compensation.
-- - Manager-created records retain request -> Principal decision separation.
-- - Principal-created records are directly authorised obligations, but payment is
--   still a separate Finance action.
-- - Verified historical staff-compensation records may be migrated from legacy
--   Project Costs with source provenance.
-- - Historical payment truth must remain unknown until explicitly confirmed;
--   approval must never be converted into a false unpaid balance.

alter table public.staff_compensations
  add column if not exists direct_authority_actor_id uuid null
    references public.profiles(id) on delete restrict,
  add column if not exists legacy_source_claim_id uuid null
    references public.internal_cost_claims(id) on delete restrict,
  add column if not exists payment_history_known boolean not null default true;

create unique index if not exists staff_compensations_legacy_source_claim_unique
  on public.staff_compensations (legacy_source_claim_id)
  where legacy_source_claim_id is not null;

alter table public.staff_compensations
  drop constraint if exists staff_compensation_no_requester_self_decision;

alter table public.staff_compensations
  add constraint staff_compensation_no_requester_self_decision check (
    decider_id is null
    or decider_id <> requester_id
    or (
      direct_authority_actor_id is not null
      and requester_id = direct_authority_actor_id
      and decider_id = direct_authority_actor_id
    )
  );

alter table public.staff_compensations
  drop constraint if exists staff_compensation_direct_authority_consistency;

alter table public.staff_compensations
  add constraint staff_compensation_direct_authority_consistency check (
    direct_authority_actor_id is null
    or (
      lifecycle = 'approved'
      and requester_id = direct_authority_actor_id
      and decider_id = direct_authority_actor_id
      and approved_amount is not null
    )
  );

alter table public.staff_compensation_events
  drop constraint if exists staff_compensation_events_event_type_check;

alter table public.staff_compensation_events
  add constraint staff_compensation_events_event_type_check check (event_type in (
    'created', 'amended', 'submitted', 'amendment_requested', 'resubmitted',
    'approved', 'rejected', 'withdrawn', 'cancelled', 'principal_authorised',
    'payment_history_confirmed', 'legacy_imported'
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
    'version', record.version
  )
$$;

create or replace function public.principal_authorise_staff_compensation(
  target_person_id uuid,
  target_project_id uuid,
  target_service_date date,
  target_compensation_type text,
  target_description text,
  target_amount numeric
)
returns public.staff_compensations
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  record public.staff_compensations;
begin
  if public.private_active_staff_compensation_role() is distinct from 'owner' then
    raise exception 'Principal authority is required to authorise Staff Compensation'
      using errcode = '42501';
  end if;

  perform public.private_assert_staff_compensation_person(target_person_id);
  perform public.private_assert_staff_compensation_project_context(target_project_id);

  if target_service_date is null or target_service_date > current_date then
    raise exception 'Choose a valid compensation date that is not in the future'
      using errcode = '22023';
  end if;
  if target_compensation_type not in ('compensation', 'allowance', 'bonus', 'other') then
    raise exception 'Choose a valid compensation type' using errcode = '22023';
  end if;
  if nullif(trim(target_description), '') is null
     or char_length(trim(target_description)) > 2000 then
    raise exception 'Provide a compensation description of 2000 characters or fewer'
      using errcode = '22023';
  end if;
  if target_amount is null or target_amount <= 0 then
    raise exception 'Compensation amount must be greater than zero' using errcode = '22023';
  end if;

  insert into public.staff_compensations (
    person_id,
    project_id,
    service_date,
    compensation_type,
    description,
    lifecycle,
    request_round,
    submitted_amount,
    approved_amount,
    requester_id,
    decider_id,
    direct_authority_actor_id,
    payment_history_known,
    submitted_at,
    decided_at
  ) values (
    target_person_id,
    target_project_id,
    target_service_date,
    target_compensation_type,
    trim(target_description),
    'approved',
    0,
    round(target_amount, 2),
    round(target_amount, 2),
    auth.uid(),
    auth.uid(),
    auth.uid(),
    true,
    now(),
    now()
  ) returning * into record;

  perform public.private_append_staff_compensation_event(
    record,
    'principal_authorised',
    null,
    'Principal directly authorised this Staff Compensation obligation; no payment was recorded by this action.'
  );

  return record;
end;
$$;

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
declare
  record public.staff_compensations;
begin
  if public.private_active_staff_compensation_role() is distinct from 'owner' then
    raise exception 'Only the Principal can confirm historical Staff Compensation payment truth'
      using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A payment-history confirmation note is required' using errcode = '22023';
  end if;

  select * into record
  from public.staff_compensations
  where id = target_compensation_id
  for update;

  if not found then
    raise exception 'Staff Compensation record not found' using errcode = 'P0002';
  end if;
  if record.lifecycle <> 'approved' then
    raise exception 'Only approved Staff Compensation can have historical payment truth confirmed'
      using errcode = '22023';
  end if;
  if record.payment_history_known then
    raise exception 'Payment history is already confirmed' using errcode = '22023';
  end if;
  if record.version <> target_expected_version then
    raise exception 'Stale Staff Compensation version; refresh and try again'
      using errcode = '40001';
  end if;

  update public.staff_compensations
  set payment_history_known = true,
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
  if not compensation.payment_history_known then
    raise exception 'Confirm the historical payment position before recording a new payment'
      using errcode = 'BSC04';
  end if;

  return compensation;
end;
$$;

drop function if exists public.staff_compensation_payment_positions();

create function public.staff_compensation_payment_positions()
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
      when compensation.lifecycle <> 'approved' then null
      when not compensation.payment_history_known then null
      else coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0)::numeric(14,2)
    end,
    case
      when compensation.lifecycle <> 'approved' then null
      when not compensation.payment_history_known then null
      else greatest(
        compensation.approved_amount
        - coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0),
        0
      )::numeric(14,2)
    end,
    case
      when compensation.lifecycle <> 'approved' then compensation.lifecycle
      when not compensation.payment_history_known then 'payment_history_unknown'
      when coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0) = 0 then 'unpaid'
      when coalesce(sum(payment.amount) filter (where payment.status = 'recorded'), 0) < compensation.approved_amount then 'part_paid'
      else 'paid'
    end
  from public.staff_compensations compensation
  left join public.staff_compensation_payments payment
    on payment.compensation_id = compensation.id
  where public.can_access_staff_compensation()
  group by compensation.id, compensation.lifecycle, compensation.approved_amount,
           compensation.payment_history_known
$$;

create or replace function public.guard_paid_staff_compensation_cancellation()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if old.lifecycle = 'approved' and new.lifecycle = 'cancelled' then
    if not old.payment_history_known then
      raise exception 'Confirm historical payment truth before cancelling this Staff Compensation record'
        using errcode = 'BSC04';
    end if;
    if public.private_staff_compensation_paid_total(old.id) > 0 then
      raise exception 'Reverse recorded payments before cancelling this Staff Compensation record'
        using errcode = 'BSC03';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.principal_authorise_staff_compensation(uuid, uuid, date, text, text, numeric)
  from public, anon;
grant execute on function public.principal_authorise_staff_compensation(uuid, uuid, date, text, text, numeric)
  to authenticated;

revoke all on function public.confirm_staff_compensation_payment_history(uuid, integer, text)
  from public, anon;
grant execute on function public.confirm_staff_compensation_payment_history(uuid, integer, text)
  to authenticated;

revoke all on function public.staff_compensation_payment_positions() from public, anon;
grant execute on function public.staff_compensation_payment_positions() to authenticated;
