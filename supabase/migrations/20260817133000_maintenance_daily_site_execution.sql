-- BOTANIQUE DESIGNERS — Maintenance operational execution through Daily Site Record.
--
-- Maintenance is an independent Operations lifecycle. An implementation Project
-- may be Completed while Botanique still has an Active Maintenance relationship
-- for the site. Daily Site Record is already the authoritative day-of-work record
-- (crew, work, labour plan, evidence state, notes and review lifecycle), so
-- Maintenance must reuse it rather than create a second field-execution ledger.
--
-- This migration changes ONLY new-entry eligibility and the authorised project
-- selector. Morning implementation compliance is deliberately unchanged: an
-- active weekly/as-needed Maintenance relationship must NOT make a site owe a
-- Daily Site Record every weekday. Maintenance scheduling remains responsible
-- for deciding when a visit is due; the Daily Site Record records what happened
-- on the day work is actually performed.
--
-- Result:
--   * Ongoing, non-archived implementation Projects remain eligible as before.
--   * A non-archived Project with an Active Maintenance relationship is also
--     eligible, even when the Project itself is Completed or Paused.
--   * Project authority / RLS remains unchanged: owner company-wide; manager only
--     where the existing project-authority model permits access.
--   * Ending or pausing Maintenance removes this extra eligibility immediately.

create or replace function public.private_daily_site_project_eligible(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.projects p
    where p.id = target_project_id
      and p.archived is false
      and (
        p.status = 'Ongoing'
        or exists (
          select 1
          from public.maintenance_relationships maintenance
          where maintenance.project_id = p.id
            and maintenance.status = 'active'
        )
      )
  )
$$;

comment on function public.private_daily_site_project_eligible(uuid) is
  'New Daily Site Record eligibility: Ongoing implementation OR Active Maintenance, always non-archived. Maintenance does not create automatic daily-compliance obligations.';

create or replace function public.daily_site_authorised_projects()
returns table (
  id uuid,
  project_name text,
  status text,
  stage text,
  archived boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.project_name, p.status, p.stage, p.archived
  from public.projects p
  where public.can_manage_daily_site_project(p.id)
    and public.private_daily_site_project_eligible(p.id)
  order by p.project_name asc
$$;

revoke all on function public.private_daily_site_project_eligible(uuid) from public, anon;
revoke all on function public.daily_site_authorised_projects() from public, anon;
grant execute on function public.daily_site_authorised_projects() to authenticated;
