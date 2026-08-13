-- BOTANIQUE DESIGNERS — one lock order for Project Cost payment truth.
--
-- Corrective migration. The historical-settlement objects are already applied to
-- production; nothing here rewrites them. This changes one function and adds one
-- rule.
--
-- THE RACE (review finding discussion_r3770345279).
-- mark_project_cost_paid derives the outstanding amount while holding the claim
-- row lock taken by private_assert_project_cost_payment_claim, but it reads the
-- recorded-payment total with a plain aggregate. reverse_project_cost_payment
-- locked only the payment row, so it never contended with that claim lock:
--
--   T1 mark paid   : lock claim, read recorded = 2,000, outstanding = 3,000
--   T2 reverse     : lock payment (uncontended), status = 'reversed', COMMIT
--   T1             : write settlement 3,000, COMMIT
--   result         : paid 3,000 of 5,000, BALANCE 2,000 — on a cost the
--                    Principal just confirmed was settled in full.
--
-- WHY LOCKING ALONE IS NOT THE FIX. Serialising the two only decides who goes
-- first; it does not make the second one truthful. If reversal simply waits for
-- the claim lock and then proceeds, it still strips a payment out of a total the
-- settlement was derived from, and the register still ends up showing a confirmed
-- settlement beside a positive balance. So this migration does two things:
--
--   1. ONE LOCK ORDER. Every operation that changes payment truth now takes the
--      Project Cost claim row FIRST: claim -> ledger -> payment. The claim row is
--      the single serialisation point for a cost's payment truth, which is what
--      makes the unlocked aggregate inside mark_project_cost_paid correct — no
--      payment row can be inserted or reversed without holding that claim lock.
--
--   2. A SETTLED COST IS CLOSED TO PAYMENT CHANGE. A historical settlement is
--      derived as (total - recorded payments). Reversing one of those payments
--      afterwards contradicts the figure that was derived from it. Reversal is
--      therefore refused while a confirmed settlement stands, exactly as
--      recording a payment already is (BPC04). The Principal corrects the
--      settlement first, then reverses, then re-confirms if that is the truth.
--      Nothing is deleted and no history is lost.
--
-- DEADLOCK. Every payment-truth transaction now acquires the SAME claim row
-- before any ledger or payment row, so a waiter holds nothing the holder could
-- want and no cycle can form:
--
--   mark_project_cost_paid                      claim -> ledger
--   correct_project_cost_historical_settlement  claim -> ledger
--   complete_project_cost_payment_history       claim -> ledger
--   record_project_cost_payment                 claim -> ledger (its payment
--       INSERT is a brand-new row, which no other transaction can be waiting on)
--   reverse_project_cost_payment                claim -> payment   <- corrected
--
-- Authority is unchanged: still Principal-only, still project-scoped, still the
-- same error codes for the same conditions.

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
  owning_claim_id uuid;
  settled numeric(14,2);
begin
  if public.private_active_project_cost_payment_role() <> 'owner' then
    raise exception 'Only the Principal can reverse a Project Cost payment' using errcode = '42501';
  end if;
  if nullif(trim(target_reason), '') is null then
    raise exception 'A reversal reason is required' using errcode = '22023';
  end if;

  -- Resolve the owning Project Cost without a lock. claim_id is immutable on a
  -- payment row — no code path updates it — so this cannot be read stale.
  select p.claim_id into owning_claim_id
  from public.project_cost_payments p
  where p.id = target_payment_id;

  if not found then raise exception 'Project Cost payment not found' using errcode = 'P0002'; end if;

  -- CANONICAL LOCK ORDER: the claim first, before the payment. Anything else
  -- deriving this cost's payment truth now waits here.
  select * into claim
  from public.internal_cost_claims
  where id = owning_claim_id
  for update;

  if not public.can_access_internal_cost_claim_project(claim.project_id) then
    raise exception 'You do not have authority for this project' using errcode = '42501';
  end if;

  -- A confirmed historical settlement was derived from the payments recorded at
  -- the time. Removing one of them now would contradict it and leave the cost
  -- showing a settled confirmation beside a positive balance.
  select coalesce(ledger.historical_settlement_amount, 0) into settled
  from public.project_cost_payment_ledgers ledger
  where ledger.claim_id = claim.id;

  if coalesce(settled, 0) > 0 then
    raise exception 'This Project Cost is confirmed as historically settled. Correct that confirmation before reversing a payment against it.'
      using errcode = 'BPC04';
  end if;

  -- Re-read the payment under the claim lock, so its status and version are the
  -- ones that were true when this transaction won the cost.
  select * into payment
  from public.project_cost_payments
  where id = target_payment_id
  for update;

  if not found then raise exception 'Project Cost payment not found' using errcode = 'P0002'; end if;
  if payment.status <> 'recorded' then raise exception 'Payment is already reversed' using errcode = '22023'; end if;
  if payment.version <> target_expected_version then
    raise exception 'Payment changed elsewhere' using errcode = '40001';
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

comment on function public.reverse_project_cost_payment(uuid, integer, text) is
  'Principal-only reversal of a recorded Project Cost payment. Takes the Project Cost claim row lock before the payment row, and refuses while a confirmed historical settlement stands.';

-- Privileges are restated rather than assumed, so this migration leaves the
-- authority surface provably where it was.
revoke execute on function public.reverse_project_cost_payment(uuid, integer, text) from public, anon;
grant execute on function public.reverse_project_cost_payment(uuid, integer, text) to authenticated;
