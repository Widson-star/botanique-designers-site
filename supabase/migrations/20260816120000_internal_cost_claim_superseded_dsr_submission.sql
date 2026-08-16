-- =====================================================================
-- BOTANIQUE DESIGNERS — Project Cost submission after Daily Site supersession
-- =====================================================================
--
-- A Project Cost copied from a Daily Site Record keeps that ORIGINAL record,
-- version and snapshot as immutable provenance. That history must never be
-- silently rewritten when the Daily Site Record is later corrected by
-- supersession.
--
-- The original BD-FIN-01A submit function, however, revalidated the exact
-- source row through private_internal_cost_claim_daily_site_snapshot(). Once an
-- accepted source became `superseded`, the Project Cost was permanently unable
-- to leave Draft / Amendment requested even when the corrected record for the
-- same project/date had itself been accepted. That created a dead-end workflow:
-- Operations could correctly supersede a site record, but Finance could never
-- finish the already-existing cost.
--
-- This migration changes ONLY the submission readiness check. The claim keeps
-- daily_site_entry_id, daily_site_source_version and daily_site_snapshot pointing
-- to the original source. If that original source is superseded, submission is
-- authorised by the one CURRENT live Daily Site Record for the same project and
-- work date. The corrected record must be `working` + `accepted`. No cost fields,
-- snapshots or source ids are rewritten.

create or replace function public.private_assert_internal_cost_claim_submission_source(
  target_daily_site_entry_id uuid,
  target_project_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  source_entry public.daily_site_entries;
  current_entry public.daily_site_entries;
begin
  if target_daily_site_entry_id is null then
    return;
  end if;

  select * into source_entry
  from public.daily_site_entries
  where id = target_daily_site_entry_id;

  if not found then
    raise exception 'Daily Site source not found' using errcode = 'P0002';
  end if;

  if source_entry.project_id <> target_project_id then
    raise exception 'Daily Site source belongs to a different project' using errcode = '22023';
  end if;

  -- The original source is still current: it itself must be an accepted
  -- working record before this Project Cost may reach the Principal.
  if source_entry.state <> 'superseded' then
    if source_entry.disposition <> 'working' or source_entry.state <> 'accepted' then
      raise exception 'The Daily Site record must be accepted before this Project Cost can be submitted'
        using errcode = '22023';
    end if;
    return;
  end if;

  -- The source is historical. Resolve the ONE live authoritative row for the
  -- same project/date. The partial unique index on daily_site_entries guarantees
  -- at most one live row in these states, even across multiple supersessions.
  select * into current_entry
  from public.daily_site_entries
  where project_id = source_entry.project_id
    and work_date = source_entry.work_date
    and state in ('draft', 'submitted', 'returned_for_correction', 'resubmitted', 'accepted')
  limit 1;

  if not found then
    raise exception 'The superseded Daily Site record has no current corrected record for this day'
      using errcode = '22023';
  end if;

  if current_entry.disposition <> 'working' then
    raise exception 'The current corrected Daily Site record says no work occurred, so this Project Cost cannot be submitted from it'
      using errcode = '22023';
  end if;

  if current_entry.state <> 'accepted' then
    raise exception 'The current corrected Daily Site record must be accepted before this Project Cost can be submitted'
      using errcode = '22023';
  end if;
end;
$$;

-- Replace only the submit function's Daily Site readiness check. Everything
-- else — requester authority, project authority, optimistic concurrency,
-- totals, lifecycle transitions and immutable event capture — remains the
-- existing BD-FIN-01A behaviour.
create or replace function public.submit_internal_cost_claim(
  target_claim_id uuid,
  target_expected_version integer
)
returns public.internal_cost_claims
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  claim public.internal_cost_claims;
  total numeric(14,2);
  prior_lifecycle text;
  next_event text;
begin
  if public.private_active_internal_cost_claim_role() is distinct from 'manager' then
    raise exception 'Operations Manager authority is required to submit a claim' using errcode = '42501';
  end if;

  select * into claim
  from public.internal_cost_claims
  where id = target_claim_id
  for update;

  if not found then
    raise exception 'Cost claim not found' using errcode = 'P0002';
  end if;

  perform public.private_assert_internal_cost_claim_project(claim.project_id);

  if claim.requester_id <> auth.uid() then
    raise exception 'Only the requester may submit this claim' using errcode = '42501';
  end if;

  if claim.lifecycle not in ('draft', 'amendment_requested') then
    raise exception 'This claim is not eligible for submission' using errcode = '22023';
  end if;

  if claim.version <> target_expected_version then
    raise exception 'Stale cost claim version; refresh and try again' using errcode = '40001';
  end if;

  if claim.daily_site_entry_id is not null then
    perform public.private_assert_internal_cost_claim_submission_source(
      claim.daily_site_entry_id,
      claim.project_id
    );
  end if;

  select sum(line_total)
  into total
  from public.internal_cost_claim_lines
  where claim_id = claim.id;

  if total is null or total <= 0 then
    raise exception 'At least one positive cost line is required' using errcode = '22023';
  end if;

  prior_lifecycle := claim.lifecycle;
  next_event := case when prior_lifecycle = 'draft' then 'submitted' else 'resubmitted' end;

  update public.internal_cost_claims
  set lifecycle = 'awaiting_review',
      request_round = request_round + 1,
      submitted_total = total,
      version = version + 1,
      updated_at = now(),
      submitted_at = now()
  where id = claim.id
  returning * into claim;

  perform public.private_append_internal_cost_claim_event(
    claim,
    next_event,
    prior_lifecycle,
    null
  );

  return claim;
end;
$$;

-- Internal assertion helper: callable only through trusted SECURITY DEFINER
-- Project Cost functions, never directly by browser roles.
revoke execute on function public.private_assert_internal_cost_claim_submission_source(uuid, uuid)
from public, anon, authenticated;
