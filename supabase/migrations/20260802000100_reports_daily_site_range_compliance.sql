-- =====================================================================
-- BD-REPORTS-01A — Daily Site period-compliance range source
-- =====================================================================
-- The single database object added by BD-REPORTS-01A.
--
-- Reports needs Daily Site obligation and compliance across a reporting
-- period. The delivered public.daily_site_morning_compliance(date) resolves ONE
-- work date, so a period view built from it would issue one call per day. This
-- function answers the same question for an inclusive date range in a single
-- call.
--
-- SECURITY POSTURE — this function is deliberately INVOKER-RIGHTS. It carries
-- no SECURITY DEFINER clause, so every table it touches is read under the
-- caller's own row level security:
--   * public.projects            — projects_select_owner_manager_assigned
--   * public.daily_site_entries  — daily_site_entries_select_authorised
--   * public.daily_site_compliance_waivers — ..._select_authorised
-- It additionally filters the project scan through the existing
-- public.can_manage_daily_site_project() authority helper, exactly as the
-- morning function does, so the caller only ever sees projects within their
-- Daily Site authority: owner company-wide, a manager only their
-- project-authority set. No unauthorised project id, name, count or waiver
-- state can be returned.
--
-- It is read-only: it stores nothing, mutates nothing, and creates no report
-- data. Africa/Nairobi governs the calendar throughout, exactly as the morning
-- function does. No cross-domain reporting function, materialised reporting
-- table or second ledger is created here or anywhere in BD-REPORTS-01A.
--
-- Known and documented limitation, unchanged from the morning function: the
-- in-scope test reads the project's CURRENT status, stage and archive state.
-- A historical range therefore reports obligation against today's project
-- state, not the state as it stood on each past date. Reporting an obligation
-- history per date would require a project-state history source that does not
-- exist and is not authorised here.

create or replace function public.daily_site_range_compliance(
  range_start date,
  range_end date,
  target_project_id uuid default null
)
returns table (
  project_id uuid,
  project_name text,
  work_date date,
  is_weekend boolean,
  due boolean,
  entry_id uuid,
  entry_state text,
  disposition text,
  is_late boolean,
  waiver_id uuid,
  compliance_status text
)
language plpgsql
stable
set search_path = public
as $$
#variable_conflict use_column
begin
  if range_start is null or range_end is null then
    raise exception 'a reporting range requires both a start and an end date'
      using errcode = 'invalid_parameter_value';
  end if;

  if range_end < range_start then
    raise exception 'the end of a reporting range cannot precede its start'
      using errcode = 'invalid_parameter_value';
  end if;

  -- Bounded by design: a report period is never open-ended, and an unbounded
  -- range would produce an unbounded mobile response.
  if (range_end - range_start) > 366 then
    raise exception 'a reporting range may not exceed 367 days'
      using errcode = 'invalid_parameter_value';
  end if;

  return query
  with days as (
    select generated::date as work_date
    from generate_series(range_start, range_end, interval '1 day') as generated
  ),
  scope as (
    select
      p.id as project_id,
      p.project_name,
      d.work_date,
      extract(dow from d.work_date) in (0, 6) as is_weekend,
      -- Automatic obligation scope, identical to the morning function.
      (p.status = 'Ongoing' and p.archived is false and p.stage <> 'Awaiting Approval') as in_scope
    from public.projects p
    cross join days d
    where public.can_manage_daily_site_project(p.id)
      and (target_project_id is null or p.id = target_project_id)
  ),
  live_entry as (
    select distinct on (e.project_id, e.work_date)
      e.id, e.project_id, e.work_date, e.state, e.disposition, e.is_late
    from public.daily_site_entries e
    where e.work_date between range_start and range_end
      and e.state in ('draft', 'submitted', 'returned_for_correction', 'resubmitted', 'accepted')
      and (target_project_id is null or e.project_id = target_project_id)
    order by e.project_id, e.work_date, e.version desc
  ),
  active_waiver as (
    select w.id, w.project_id, w.work_date
    from public.daily_site_compliance_waivers w
    where w.work_date between range_start and range_end
      and w.state = 'active'
      and (target_project_id is null or w.project_id = target_project_id)
  )
  select
    s.project_id,
    s.project_name,
    s.work_date,
    s.is_weekend,
    (s.in_scope and not s.is_weekend) as due,
    le.id as entry_id,
    le.state as entry_state,
    le.disposition,
    le.is_late,
    aw.id as waiver_id,
    case
      when le.id is not null then
        case when le.is_late is true then 'entry_late' else 'entry_present' end
      when aw.id is not null then 'waived'
      when s.in_scope and not s.is_weekend then 'missing'
      else 'not_due'
    end as compliance_status
  from scope s
  left join live_entry le on le.project_id = s.project_id and le.work_date = s.work_date
  left join active_waiver aw on aw.project_id = s.project_id and aw.work_date = s.work_date
  where s.in_scope or le.id is not null or aw.id is not null
  order by s.work_date desc, s.project_name asc;
end;
$$;

comment on function public.daily_site_range_compliance(date, date, uuid) is
  'BD-REPORTS-01A Daily Site period-compliance range source. Invoker rights (never SECURITY DEFINER); read-only; Africa/Nairobi calendar; returns only projects within the caller''s existing Daily Site authority.';

revoke execute on function public.daily_site_range_compliance(date, date, uuid) from public, anon;
grant execute on function public.daily_site_range_compliance(date, date, uuid) to authenticated;

-- The reporting range predicate on daily_site_entries is (project_id, work_date).
-- The delivered schema already carries daily_site_entries_project_date_idx on
-- (project_id, work_date desc) and daily_site_compliance_waivers_project_date_idx
-- on (project_id, work_date desc), which serve this query shape. No speculative
-- index is added by BD-REPORTS-01A.
