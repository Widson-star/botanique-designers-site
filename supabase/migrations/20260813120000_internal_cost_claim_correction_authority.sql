-- BOTANIQUE DESIGNERS — cancellation of an existing Project Cost is a
-- correction, not new expenditure, so it must not need an Ongoing project.
--
-- Founder ruling, 13 Aug 2026. Project status governs whether NEW operational
-- Project Costs may be created or advanced. It must not make an existing
-- erroneous historical Project Cost permanently impossible to correct.
--
-- THE PROBLEM. private_assert_internal_cost_claim_project(...) is one helper
-- shared by every internal_cost_claims mutation:
--
--   create_internal_cost_claim_draft        creation
--   update_internal_cost_claim              amendment of an unapproved draft
--   submit_internal_cost_claim              submission for a money decision
--   withdraw_internal_cost_claim            requester withdraws their own claim
--   decide_internal_cost_claim              Principal decides a submission
--   principal_authorise_internal_cost_claim direct creation + approval
--   cancel_internal_cost_claim              Principal corrects an APPROVED claim
--
-- It requires project.status = 'Ongoing'. That is the right rule for the first
-- six: each one either creates a claim or advances one toward or through a
-- money decision, and a project that is no longer being worked should not gain
-- new obligations. It is the wrong rule for the seventh: cancelling a claim
-- that already exists removes an obligation and corrects the record, and
-- Lugulu Residential Home moving from Ongoing to Completed after two accidental
-- duplicate claims were approved on it must not make those duplicates
-- permanently uncancellable.
--
-- THE FIX. A dedicated helper for correction of an EXISTING claim, identical to
-- private_assert_internal_cost_claim_project except that it does not require
-- project.status = 'Ongoing'. Every other condition is unchanged: the caller
-- must be an active Principal or Operations Manager, the project must exist and
-- be unarchived, the two permanently-ineligible fixture projects stay excluded,
-- and the caller must hold project access under the existing
-- can_access_internal_cost_claim_project rule. cancel_internal_cost_claim is
-- the ONLY caller changed to use it. The other six mutations are untouched and
-- keep requiring an Ongoing project.
--
-- WHAT STAYS THE SAME. cancel_internal_cost_claim's own Principal-only role
-- check, its lifecycle check (only 'approved' may be cancelled), its optimistic
-- version check, and the payment/settlement cancellation guards
-- (guard_paid_project_cost_cancellation, a BEFORE UPDATE OF lifecycle trigger)
-- are all untouched by this migration. A Completed-project correction is
-- exactly as protected against an unreversed payment or an uncorrected
-- historical settlement as one on an Ongoing project.
--
-- Additive only. No already-applied migration is edited or rewritten.

create or replace function public.private_assert_internal_cost_claim_correction(target_project_id uuid)
returns public.projects
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  project public.projects;
begin
  if public.private_active_internal_cost_claim_role() is null then
    raise exception 'Internal cost claims are available only to an active Principal or Operations Manager' using errcode = '42501';
  end if;
  select * into project from public.projects where id = target_project_id;
  if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
  -- Deliberately no project.status = 'Ongoing' requirement here: correcting an
  -- existing claim is not new expenditure, so a Completed project does not make
  -- that claim uncorrectable. archived and the fixture exclusions are kept —
  -- this migration relaxes exactly the one condition the Founder ruling names.
  if project.archived
     or project.id in ('bf257eb0-e144-416c-a72e-67dfc09df3ee'::uuid, '0197700b-4f86-4b33-94ed-0ee208f100bb'::uuid) then
    raise exception 'Project is not eligible for an internal cost claim' using errcode = '22023';
  end if;
  if not public.can_access_internal_cost_claim_project(project.id) then
    raise exception 'You no longer have authority for this project' using errcode = '42501';
  end if;
  return project;
end;
$$;

comment on function public.private_assert_internal_cost_claim_correction(uuid) is
  'Project-access assertion for correcting an EXISTING Project Cost (cancellation). Same as private_assert_internal_cost_claim_project minus the Ongoing-status requirement: correcting a record is not new expenditure.';

create or replace function public.cancel_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer,
  target_reason text
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare claim public.internal_cost_claims;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'owner' then raise exception 'Principal authority is required' using errcode = '42501'; end if;
  if nullif(trim(target_reason), '') is null then raise exception 'A cancellation reason is required' using errcode = '22023'; end if;
  select * into claim from public.internal_cost_claims where id = target_claim_id for update;
  if not found then raise exception 'Cost claim not found' using errcode = 'P0002'; end if;
  perform public.private_assert_internal_cost_claim_correction(claim.project_id);
  if claim.lifecycle <> 'approved' then raise exception 'Only an approved claim may be cancelled' using errcode = '22023'; end if;
  if claim.version <> target_expected_version then raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001'; end if;
  update public.internal_cost_claims set lifecycle = 'cancelled', approved_total = null,
    version = version + 1, updated_at = now(), cancelled_at = now()
  where id = claim.id returning * into claim;
  perform public.private_append_internal_cost_claim_event(claim, 'cancelled', 'approved', target_reason);
  return claim;
end;
$$;

comment on function public.cancel_internal_cost_claim(uuid, integer, text) is
  'Principal-only correction of an approved Project Cost. Does not require the project to be Ongoing — an existing erroneous historical record must stay correctable after the project completes. Payment/settlement guards still apply via trigger.';

-- PostgreSQL grants EXECUTE to PUBLIC on a new function unless it is revoked.
-- This is a private implementation detail behind cancel_internal_cost_claim.
revoke execute on function public.private_assert_internal_cost_claim_correction(uuid) from public, anon, authenticated;

-- cancel_internal_cost_claim's own grant is restated, unchanged, for the record.
revoke execute on function public.cancel_internal_cost_claim(uuid, integer, text) from public, anon;
grant execute on function public.cancel_internal_cost_claim(uuid, integer, text) to authenticated;
