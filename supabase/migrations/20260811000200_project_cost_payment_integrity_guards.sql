-- BOTANIQUE DESIGNERS — Project Cost Payment integrity hardening.
-- This stays separate from the additive payment objects so the authority boundary is explicit.

-- Only the Principal may turn historical payment knowledge from unknown into complete.
-- The record_project_cost_payment RPC is available to an authorised manager for recording a
-- payment they genuinely made, but a manager cannot make the stronger assertion that the Hub
-- now holds the complete historical payment record for that cost.
create or replace function public.guard_project_cost_payment_history_authority()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_role text;
begin
  if new.history_complete and (tg_op = 'INSERT' or not coalesce(old.history_complete, false)) then
    select p.role into actor_role
    from public.profiles p
    where p.id = new.established_by and p.is_active;

    if actor_role <> 'owner' then
      raise exception 'Only the Principal can confirm complete Project Cost payment history' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger project_cost_payment_history_authority_guard
  before insert or update of history_complete, established_by, established_at
  on public.project_cost_payment_ledgers
  for each row execute function public.guard_project_cost_payment_history_authority();

-- New approvals are complete from KES 0 because the Hub observes their payment history from the
-- moment they become payable. The owner is necessarily the decision actor under the existing
-- Internal Cost Claim authority. Split INSERT/UPDATE branches avoid depending on OLD during an
-- INSERT trigger invocation.
create or replace function public.start_project_cost_payment_tracking()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid;
begin
  if tg_op = 'INSERT' then
    if new.lifecycle <> 'approved' then return new; end if;
  elsif new.lifecycle <> 'approved' or old.lifecycle = 'approved' then
    return new;
  end if;

  actor_id := coalesce(new.decider_id, new.direct_authority_actor_id, new.requester_id);

  insert into public.project_cost_payment_ledgers (
    claim_id, history_complete, established_by, established_at
  ) values (
    new.id, true, actor_id, now()
  ) on conflict (claim_id) do nothing;

  return new;
end;
$$;

comment on function public.guard_project_cost_payment_history_authority() is
  'Prevents anyone other than the Principal from declaring historical Project Cost payment history complete.';
