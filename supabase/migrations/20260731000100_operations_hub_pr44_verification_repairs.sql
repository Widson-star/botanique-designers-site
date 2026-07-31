-- BOTANIQUE DESIGNERS — Operations Hub PR #44 verification repairs.
--
-- Forward-only correction after hosted verification of
-- 20260729000100_operations_hub_project_material_change_approvals.sql.
-- The predecessor migration is already applied and is intentionally untouched.
--
-- This migration makes manager status authority an explicit, independent
-- database invariant. It does not mutate any project, approval, intake, Daily
-- Site, Portfolio or financial business row.

-- A manager never has direct project-status authority. Every manager-originated
-- transition must use the dedicated approval type or project_material_change
-- path and is applied only while the authenticated actor is the deciding owner.
create or replace function public.tg_guard_project_status_authority()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_role text := public.current_user_role();
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if caller_role = 'manager' then
    raise exception
      'a manager may not directly change project status; submit the required approval request for owner review'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke execute on function public.tg_guard_project_status_authority()
  from public, anon, authenticated;

drop trigger if exists projects_status_authority_guard on public.projects;
create trigger projects_status_authority_guard
before update of status on public.projects
for each row execute function public.tg_guard_project_status_authority();

-- Re-state terminal intake visibility explicitly. Terminal state and
-- created_project_id never narrow read authority: the active owner sees every
-- company intake and the original requester sees their own intake for its
-- entire immutable lifecycle.
drop policy if exists "project_intake_requests_select_owner_or_requester"
  on public.project_intake_requests;
create policy "project_intake_requests_select_owner_or_requester"
on public.project_intake_requests
for select
to authenticated
using (
  public.is_owner()
  or requester_id = auth.uid()
);

drop policy if exists "project_intake_events_select_owner_or_requester"
  on public.project_intake_events;
create policy "project_intake_events_select_owner_or_requester"
on public.project_intake_events
for select
to authenticated
using (
  exists (
    select 1
    from public.project_intake_requests intake
    where intake.id = intake_request_id
      and (
        public.is_owner()
        or intake.requester_id = auth.uid()
      )
  )
);
