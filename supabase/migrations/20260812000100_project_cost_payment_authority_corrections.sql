-- BOTANIQUE DESIGNERS — Project Cost Payment authority corrections.
--
-- Follow-up to the already-applied Project Cost Payment migrations.
-- This migration is intentionally additive: never rewrite an applied migration.
--
-- Founder rulings:
--   * Direct Project Cost payment recording is Principal-only initially.
--   * Historical payment-history completion is Principal-only.
--   * Payment reversal is Principal-only.
--   * Internal SECURITY DEFINER helpers are never callable by API roles.

-- Tighten the shared claim assertion used by record_project_cost_payment.
-- complete/reverse already carry their own owner checks; this makes the recording
-- RPC agree with the Principal-only product authority enforced by the UI.
create or replace function public.private_assert_project_cost_payment_claim(target_claim_id uuid)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
begin
  if public.private_active_project_cost_payment_role() <> 'owner' then
    raise exception 'Only the Principal can record a Project Cost payment' using errcode = '42501';
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

-- PostgreSQL grants EXECUTE on new functions to PUBLIC unless it is explicitly
-- revoked. These helpers are implementation details behind audited RPCs/triggers;
-- allowing direct API execution would bypass their intended authority boundary.
revoke execute on function public.private_active_project_cost_payment_role() from public, anon, authenticated;
revoke execute on function public.private_project_cost_paid_total(uuid) from public, anon, authenticated;
revoke execute on function public.private_project_cost_payment_snapshot(public.project_cost_payments) from public, anon, authenticated;
revoke execute on function public.private_append_project_cost_payment_event(public.project_cost_payments, text, text) from public, anon, authenticated;
revoke execute on function public.private_assert_project_cost_payment_claim(uuid) from public, anon, authenticated;

-- Trigger functions are invoked by PostgreSQL through their triggers. They do not
-- need direct API EXECUTE authority either.
revoke execute on function public.start_project_cost_payment_tracking() from public, anon, authenticated;
revoke execute on function public.guard_paid_project_cost_cancellation() from public, anon, authenticated;
revoke execute on function public.guard_project_cost_payment_history_authority() from public, anon, authenticated;

-- Keep only the deliberate API surface callable by authenticated users. The RPCs
-- themselves enforce Principal/project authority; the read model applies project
-- access filtering internally.
revoke execute on function public.record_project_cost_payment(uuid, numeric, date, text, text, text, boolean) from public, anon;
revoke execute on function public.complete_project_cost_payment_history(uuid) from public, anon;
revoke execute on function public.reverse_project_cost_payment(uuid, integer, text) from public, anon;
revoke execute on function public.project_cost_payment_positions() from public, anon;

grant execute on function public.record_project_cost_payment(uuid, numeric, date, text, text, text, boolean) to authenticated;
grant execute on function public.complete_project_cost_payment_history(uuid) to authenticated;
grant execute on function public.reverse_project_cost_payment(uuid, integer, text) to authenticated;
grant execute on function public.project_cost_payment_positions() to authenticated;

comment on function public.record_project_cost_payment(uuid, numeric, date, text, text, text, boolean) is
  'Principal-only audited recording of money actually paid against one approved Project Cost.';
