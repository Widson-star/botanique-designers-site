-- BOTANIQUE DESIGNERS — Site-owned Maintenance.
-- Site is the durable Maintenance identity. Project becomes optional origin/context.
-- Existing relationships are backfilled through projects.site_id with no lifecycle rewrite.

alter table public.maintenance_relationships
  add column site_id uuid references public.sites(id) on delete restrict;

update public.maintenance_relationships r
set site_id = p.site_id
from public.projects p
where p.id = r.project_id
  and r.site_id is null;

alter table public.maintenance_relationships
  alter column site_id set not null,
  alter column project_id drop not null;

alter table public.maintenance_relationships
  drop constraint if exists maintenance_relationships_project_id_fkey;
alter table public.maintenance_relationships
  add constraint maintenance_relationships_project_id_fkey
  foreign key (project_id) references public.projects(id) on delete restrict;

drop index if exists public.maintenance_relationships_one_live_per_project;
create unique index maintenance_relationships_one_live_per_site
  on public.maintenance_relationships(site_id)
  where status <> 'ended';
create index if not exists maintenance_relationships_site_idx
  on public.maintenance_relationships(site_id,status);

create or replace function public.can_manage_maintenance_site(target_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.current_user_role() in ('owner','manager')
    and exists (select 1 from public.sites s where s.id = target_site_id)
$$;

create or replace function public.can_manage_maintenance_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1 from public.projects p
    where p.id = target_project_id
      and public.can_manage_maintenance_site(p.site_id)
  )
$$;

create or replace function public.maintenance_authorised_sites()
returns table(
  id uuid,
  site_name text,
  location text,
  county text,
  projects jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    s.id,
    s.site_name,
    s.location,
    s.county,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'id',p.id,
          'project_name',p.project_name,
          'status',p.status,
          'stage',p.stage,
          'archived',p.archived
        ) order by p.project_name
      )
      from public.projects p
      where p.site_id = s.id
        and p.archived = false
        and p.status in ('Ongoing','Paused','Completed','Design-only')
    ), '[]'::jsonb) as projects
  from public.sites s
  where public.can_manage_maintenance_site(s.id)
    and not exists (
      select 1 from public.maintenance_relationships r
      where r.site_id = s.id and r.status <> 'ended'
    )
  order by s.site_name, s.location nulls last
$$;

create or replace function public.maintenance_authorised_projects()
returns setof public.projects
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.*
  from public.projects p
  where public.can_manage_maintenance_site(p.site_id)
    and p.archived = false
    and p.status in ('Ongoing','Paused','Completed')
  order by p.project_name
$$;

create or replace function public.tg_audit_maintenance_relationships()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  target_site public.sites;
  target_project public.projects;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    new.status := 'active';

    select * into target_site from public.sites where id = new.site_id;
    if not found then raise exception 'Site not found' using errcode='P0002'; end if;

    if new.project_id is not null then
      select * into target_project from public.projects where id = new.project_id;
      if not found then raise exception 'Project not found' using errcode='P0002'; end if;
      if target_project.site_id <> new.site_id then
        raise exception 'The related Project belongs to a different Site' using errcode='22023';
      end if;
      if target_project.archived then
        raise exception 'An archived Project cannot be used as the Maintenance origin' using errcode='22023';
      end if;
      if target_project.status not in ('Ongoing','Paused','Completed','Design-only') then
        raise exception 'Choose a current or completed Botanique Project, or leave Project blank for maintenance-only work' using errcode='22023';
      end if;
    end if;
  else
    new.site_id := old.site_id;
    new.project_id := old.project_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.scope := regexp_replace(trim(new.scope), '\s+', ' ', 'g');
  return new;
end;
$$;

-- Site-based RLS.
drop policy if exists maintenance_relationships_insert_authorised on public.maintenance_relationships;
drop policy if exists maintenance_relationships_select_authorised on public.maintenance_relationships;
drop policy if exists maintenance_relationships_update_authorised on public.maintenance_relationships;
create policy maintenance_relationships_insert_authorised on public.maintenance_relationships for insert to authenticated with check (public.can_manage_maintenance_site(site_id));
create policy maintenance_relationships_select_authorised on public.maintenance_relationships for select to authenticated using (public.can_manage_maintenance_site(site_id));
create policy maintenance_relationships_update_authorised on public.maintenance_relationships for update to authenticated using (public.can_manage_maintenance_site(site_id)) with check (public.can_manage_maintenance_site(site_id));

drop policy if exists maintenance_visits_insert_authorised on public.maintenance_visits;
drop policy if exists maintenance_visits_select_authorised on public.maintenance_visits;
drop policy if exists maintenance_visits_update_authorised on public.maintenance_visits;
create policy maintenance_visits_insert_authorised on public.maintenance_visits for insert to authenticated with check (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_visits_select_authorised on public.maintenance_visits for select to authenticated using (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_visits_update_authorised on public.maintenance_visits for update to authenticated using (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id))) with check (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));

drop policy if exists maintenance_assignments_insert_authorised on public.maintenance_assignments;
drop policy if exists maintenance_assignments_select_authorised on public.maintenance_assignments;
drop policy if exists maintenance_assignments_update_authorised on public.maintenance_assignments;
create policy maintenance_assignments_insert_authorised on public.maintenance_assignments for insert to authenticated with check (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_assignments_select_authorised on public.maintenance_assignments for select to authenticated using (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_assignments_update_authorised on public.maintenance_assignments for update to authenticated using (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id))) with check (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));

drop policy if exists maintenance_relationship_events_select_authorised on public.maintenance_relationship_events;
create policy maintenance_relationship_events_select_authorised on public.maintenance_relationship_events for select to authenticated using (exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));

drop policy if exists maintenance_visit_events_select_authorised on public.maintenance_visit_events;
create policy maintenance_visit_events_select_authorised on public.maintenance_visit_events for select to authenticated using (exists(select 1 from public.maintenance_visits v join public.maintenance_relationships r on r.id=v.maintenance_relationship_id where v.id=maintenance_visit_id and public.can_manage_maintenance_site(r.site_id)));

-- Derived register is Site-first, with optional Project context.
drop function if exists public.maintenance_register();
create function public.maintenance_register()
returns table(
  id uuid,
  site_id uuid,
  site_name text,
  site_location text,
  site_county text,
  project_id uuid,
  project_name text,
  project_status text,
  status text,
  scope text,
  frequency text,
  start_date date,
  version integer,
  service_days smallint[],
  cadence_end_date date,
  last_visit_date date,
  next_visit_date date,
  assigned_team jsonb
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    r.id,r.site_id,s.site_name,s.location,s.county,
    r.project_id,p.project_name,p.status,
    r.status,r.scope,r.frequency,r.start_date,r.version,r.service_days,r.cadence_end_date,
    (select max(v.scheduled_date) from public.maintenance_visits v where v.maintenance_relationship_id=r.id and v.status='completed'),
    (select min(v.scheduled_date) from public.maintenance_visits v where v.maintenance_relationship_id=r.id and v.status='scheduled'),
    coalesce((select jsonb_agg(jsonb_build_object('person_id',a.person_id,'full_name',pe.full_name,'role',a.role) order by pe.full_name) from public.maintenance_assignments a join public.people pe on pe.id=a.person_id where a.maintenance_relationship_id=r.id and a.end_date is null),'[]'::jsonb)
  from public.maintenance_relationships r
  join public.sites s on s.id=r.site_id
  left join public.projects p on p.id=r.project_id
  where public.can_manage_maintenance_site(r.site_id)
  order by s.site_name
$$;

create or replace function public.maintenance_project_summary(target_project_id uuid)
returns table(id uuid,status text,next_visit_date date)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select r.id,r.status,
    (select min(v.scheduled_date) from public.maintenance_visits v where v.maintenance_relationship_id=r.id and v.status='scheduled')
  from public.maintenance_relationships r
  where r.project_id=target_project_id and r.status<>'ended' and public.can_manage_maintenance_site(r.site_id)
$$;

create or replace function public.private_daily_site_project_eligible(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.projects p
    where p.id=target_project_id and p.archived is false
      and (
        p.status='Ongoing'
        or exists (
          select 1 from public.maintenance_relationships m
          where m.site_id=p.site_id and m.status='active'
        )
      )
  )
$$;

-- Transition RPCs use Site authority.
create or replace function public.pause_maintenance_relationship(target_relationship_id uuid, expected_version integer, reason text default null)
returns public.maintenance_relationships language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_relationships; clean_reason text:=nullif(trim(coalesce(reason,'')),''); scheduled_count integer;
begin
  select * into existing from public.maintenance_relationships where id=target_relationship_id for update;
  if not found then raise exception 'Maintenance relationship not found' using errcode='P0002'; end if;
  if not public.can_manage_maintenance_site(existing.site_id) then raise exception 'You are not authorised to manage this Maintenance relationship' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status<>'active' then raise exception 'Only an Active Maintenance relationship can be paused' using errcode='22023'; end if;
  select count(*) into scheduled_count from public.maintenance_visits where maintenance_relationship_id=existing.id and status='scheduled';
  if scheduled_count>0 then raise exception 'Resolve all Scheduled Maintenance visits before pausing this relationship' using errcode='22023'; end if;
  perform set_config('app.maintenance_relationship_controlled_transition','true',true); perform set_config('app.maintenance_relationship_transition_reason',coalesce(clean_reason,''),true);
  update public.maintenance_relationships set status='paused' where id=existing.id and version=expected_version returning * into existing;
  if not found then raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  perform set_config('app.maintenance_relationship_controlled_transition','false',true); perform set_config('app.maintenance_relationship_transition_reason','',true); return existing;
end$$;

create or replace function public.resume_maintenance_relationship(target_relationship_id uuid, expected_version integer)
returns public.maintenance_relationships language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_relationships;
begin
  select * into existing from public.maintenance_relationships where id=target_relationship_id for update;
  if not found then raise exception 'Maintenance relationship not found' using errcode='P0002'; end if;
  if not public.can_manage_maintenance_site(existing.site_id) then raise exception 'You are not authorised to manage this Maintenance relationship' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status<>'paused' then raise exception 'Only a Paused Maintenance relationship can be resumed' using errcode='22023'; end if;
  perform set_config('app.maintenance_relationship_controlled_transition','true',true);
  update public.maintenance_relationships set status='active' where id=existing.id and version=expected_version returning * into existing;
  if not found then raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  perform set_config('app.maintenance_relationship_controlled_transition','false',true); return existing;
end$$;

create or replace function public.end_maintenance_relationship(target_relationship_id uuid, expected_version integer, reason text default null)
returns public.maintenance_relationships language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_relationships; clean_reason text:=nullif(trim(coalesce(reason,'')),''); open_scheduled_visits integer;
begin
  if public.current_user_role() is distinct from 'owner' then raise exception 'Only the Principal can end a Maintenance relationship' using errcode='42501'; end if;
  if clean_reason is null then raise exception 'A reason is required to end this Maintenance relationship' using errcode='22023'; end if;
  select * into existing from public.maintenance_relationships where id=target_relationship_id for update;
  if not found then raise exception 'Maintenance relationship not found' using errcode='P0002'; end if;
  if not public.can_manage_maintenance_site(existing.site_id) then raise exception 'You are not authorised to manage this Maintenance relationship' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance relationship was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status='ended' then raise exception 'This Maintenance relationship has already ended' using errcode='22023'; end if;
  select count(*) into open_scheduled_visits from public.maintenance_visits where maintenance_relationship_id=existing.id and status='scheduled';
  if open_scheduled_visits>0 then raise exception 'Resolve all scheduled Maintenance visits before ending this relationship' using errcode='22023'; end if;
  perform set_config('app.maintenance_relationship_controlled_transition','true',true); perform set_config('app.maintenance_relationship_transition_reason',clean_reason,true);
  update public.maintenance_relationships set status='ended' where id=existing.id and version=expected_version returning * into existing;
  perform set_config('app.maintenance_relationship_controlled_transition','false',true); perform set_config('app.maintenance_relationship_transition_reason','',true);
  perform set_config('app.maintenance_assignment_controlled_close','true',true);
  update public.maintenance_assignments set end_date=greatest(current_date,start_date) where maintenance_relationship_id=existing.id and end_date is null;
  perform set_config('app.maintenance_assignment_controlled_close','false',true); return existing;
end$$;

create or replace function public.reschedule_maintenance_visit(target_visit_id uuid, expected_version integer, new_scheduled_date date)
returns public.maintenance_visits language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_visits; relationship public.maintenance_relationships;
begin
  if new_scheduled_date is null then raise exception 'A scheduled date is required' using errcode='22023'; end if;
  select * into existing from public.maintenance_visits where id=target_visit_id for update;
  if not found then raise exception 'Maintenance visit not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id for share;
  if not public.can_manage_maintenance_site(relationship.site_id) then raise exception 'You are not authorised to manage this Maintenance visit' using errcode='42501'; end if;
  if relationship.status<>'active' then raise exception 'A visit can only be rescheduled while Maintenance is Active' using errcode='22023'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status<>'scheduled' then raise exception 'Only a Scheduled visit can be rescheduled' using errcode='22023'; end if;
  perform set_config('app.maintenance_visit_controlled_transition','true',true);
  update public.maintenance_visits set scheduled_date=new_scheduled_date where id=existing.id and version=expected_version returning * into existing;
  perform set_config('app.maintenance_visit_controlled_transition','false',true); return existing;
end$$;

create or replace function public.cancel_maintenance_visit(target_visit_id uuid, expected_version integer, cancellation_reason text)
returns public.maintenance_visits language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_visits; relationship public.maintenance_relationships; clean_reason text:=nullif(trim(coalesce(cancellation_reason,'')),'');
begin
  if clean_reason is null then raise exception 'A cancellation reason is required' using errcode='22023'; end if;
  select * into existing from public.maintenance_visits where id=target_visit_id for update;
  if not found then raise exception 'Maintenance visit not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_site(relationship.site_id) then raise exception 'You are not authorised to manage this Maintenance visit' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status<>'scheduled' then raise exception 'Only a Scheduled visit can be cancelled' using errcode='22023'; end if;
  perform set_config('app.maintenance_visit_controlled_transition','true',true); perform set_config('app.maintenance_visit_transition_reason',clean_reason,true);
  update public.maintenance_visits set status='cancelled',cancellation_reason=clean_reason where id=existing.id and version=expected_version returning * into existing;
  perform set_config('app.maintenance_visit_controlled_transition','false',true); perform set_config('app.maintenance_visit_transition_reason','',true); return existing;
end$$;

create or replace function public.complete_maintenance_visit_cycle(target_visit_id uuid, expected_version integer, target_daily_site_entry_id uuid, target_outcome text, completion_note text, target_follow_up_required boolean, target_follow_up_note text default null, next_scheduled_date date default null, next_purpose text default null)
returns public.maintenance_visits language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_visits; relationship public.maintenance_relationships; execution public.daily_site_entries; execution_site_id uuid; clean_note text:=nullif(trim(coalesce(completion_note,'')),''); clean_follow_up text:=nullif(trim(coalesce(target_follow_up_note,'')),''); clean_next_purpose text:=nullif(trim(coalesce(next_purpose,'')),'');
begin
  if target_outcome not in ('completed','partial') then raise exception 'Choose Completed or Partially completed for the Maintenance outcome' using errcode='22023'; end if;
  if clean_note is null then raise exception 'A short Maintenance completion note is required' using errcode='22023'; end if;
  if target_follow_up_required is null then raise exception 'State whether Maintenance follow-up is required' using errcode='22023'; end if;
  if target_outcome='partial' and not target_follow_up_required then raise exception 'Partially completed Maintenance requires follow-up' using errcode='22023'; end if;
  if target_follow_up_required and clean_follow_up is null then raise exception 'Describe the Maintenance follow-up required' using errcode='22023'; end if;
  if next_scheduled_date is not null and clean_next_purpose is null then raise exception 'Describe the planned work for the next Maintenance visit' using errcode='22023'; end if;
  select * into existing from public.maintenance_visits where id=target_visit_id for update;
  if not found then raise exception 'Maintenance visit not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id for share;
  if not public.can_manage_maintenance_site(relationship.site_id) then raise exception 'You are not authorised to manage this Maintenance visit' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This Maintenance visit was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.status<>'scheduled' then raise exception 'Only a Scheduled visit can be completed' using errcode='22023'; end if;
  if target_daily_site_entry_id is not null then
    select d.*,p.site_id into execution,execution_site_id from public.daily_site_entries d join public.projects p on p.id=d.project_id where d.id=target_daily_site_entry_id;
    if not found then raise exception 'Daily Site Record not found' using errcode='P0002'; end if;
    if execution_site_id<>relationship.site_id then raise exception 'This Daily Site Record belongs to a different Site' using errcode='22023'; end if;
    if execution.work_date<>existing.scheduled_date then raise exception 'The Daily Site Record date must match the scheduled Maintenance visit date' using errcode='22023'; end if;
    if execution.state<>'accepted' then raise exception 'Only an Accepted Daily Site Record can close a Maintenance visit' using errcode='22023'; end if;
  end if;
  if next_scheduled_date is not null then
    if relationship.status<>'active' then raise exception 'A next visit can only be scheduled for Active Maintenance' using errcode='22023'; end if;
    if next_scheduled_date<=existing.scheduled_date then raise exception 'The next Maintenance visit must be after the visit being completed' using errcode='22023'; end if;
  end if;
  perform set_config('app.maintenance_visit_controlled_transition','true',true);
  update public.maintenance_visits set status='completed',completed_at=now(),completion_note=clean_note,daily_site_entry_id=target_daily_site_entry_id,completion_outcome=target_outcome,follow_up_required=target_follow_up_required,follow_up_note=case when target_follow_up_required then clean_follow_up else null end where id=existing.id and version=expected_version returning * into existing;
  perform set_config('app.maintenance_visit_controlled_transition','false',true);
  if next_scheduled_date is not null then insert into public.maintenance_visits(maintenance_relationship_id,scheduled_date,purpose) values(relationship.id,next_scheduled_date,clean_next_purpose); end if;
  return existing;
end$$;

create or replace function public.complete_maintenance_visit(target_visit_id uuid, expected_version integer, completion_note text)
returns public.maintenance_visits language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_visits; relationship public.maintenance_relationships; matched_dsr uuid; match_count integer;
begin
  select * into existing from public.maintenance_visits where id=target_visit_id;
  if not found then raise exception 'Maintenance visit not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id;
  select count(*),min(d.id) into match_count,matched_dsr from public.daily_site_entries d join public.projects p on p.id=d.project_id where p.site_id=relationship.site_id and d.work_date=existing.scheduled_date and d.state='accepted';
  if match_count<>1 then matched_dsr:=null; end if;
  return public.complete_maintenance_visit_cycle(target_visit_id,expected_version,matched_dsr,'completed',completion_note,false,null,null,null);
end$$;

create or replace function public.end_maintenance_assignment(target_assignment_id uuid, expected_version integer)
returns public.maintenance_assignments language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_assignments; relationship public.maintenance_relationships;
begin
  select * into existing from public.maintenance_assignments where id=target_assignment_id for update;
  if not found then raise exception 'Maintenance assignment not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_site(relationship.site_id) then raise exception 'You are not authorised to manage this Maintenance assignment' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This assignment was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.end_date is not null then raise exception 'This assignment has already ended' using errcode='22023'; end if;
  perform set_config('app.maintenance_assignment_controlled_close','true',true);
  update public.maintenance_assignments set end_date=greatest(current_date,start_date) where id=existing.id and version=expected_version returning * into existing;
  perform set_config('app.maintenance_assignment_controlled_close','false',true); return existing;
end$$;

create or replace function public.correct_maintenance_assignment(target_assignment_id uuid, expected_version integer, target_role text, target_start_date date, correction_reason text)
returns public.maintenance_assignments language plpgsql security definer set search_path=pg_catalog,public as $$
declare existing public.maintenance_assignments; corrected public.maintenance_assignments; relationship public.maintenance_relationships; clean_reason text:=nullif(trim(coalesce(correction_reason,'')),'');
begin
  if not public.is_owner() then raise exception 'Only the Principal may correct a Maintenance assignment' using errcode='42501'; end if;
  if clean_reason is null or char_length(clean_reason)<3 then raise exception 'Explain why this Maintenance assignment is being corrected' using errcode='22023'; end if;
  if char_length(clean_reason)>1000 then raise exception 'The correction reason must be 1000 characters or fewer' using errcode='22023'; end if;
  if target_role is null or target_role not in ('maintenance_lead','site_technician','inspector','supervisor','support') then raise exception 'Choose a valid Maintenance responsibility' using errcode='22023'; end if;
  if target_start_date is null then raise exception 'A start date is required' using errcode='22023'; end if;
  select * into existing from public.maintenance_assignments where id=target_assignment_id for update;
  if not found then raise exception 'Maintenance assignment not found' using errcode='P0002'; end if;
  select * into relationship from public.maintenance_relationships where id=existing.maintenance_relationship_id;
  if not public.can_manage_maintenance_site(relationship.site_id) then raise exception 'You are not authorised to manage this Maintenance assignment' using errcode='42501'; end if;
  if existing.version<>expected_version then raise exception 'This assignment was changed elsewhere. Reload and try again.' using errcode='40001'; end if;
  if existing.end_date is not null then raise exception 'This Maintenance assignment has ended and is historical; it cannot be corrected' using errcode='22023'; end if;
  perform set_config('app.maintenance_assignment_controlled_correction','true',true); perform set_config('app.maintenance_assignment_correction_reason',clean_reason,true);
  update public.maintenance_assignments set role=target_role,start_date=target_start_date where id=existing.id and version=expected_version returning * into corrected;
  perform set_config('app.maintenance_assignment_controlled_correction','false',true); perform set_config('app.maintenance_assignment_correction_reason','',true); return corrected;
end$$;

revoke execute on function public.can_manage_maintenance_site(uuid) from public,anon;
revoke execute on function public.maintenance_authorised_sites() from public,anon;
grant execute on function public.can_manage_maintenance_site(uuid) to authenticated;
grant execute on function public.maintenance_authorised_sites() to authenticated;
revoke execute on function public.maintenance_register() from public,anon;
grant execute on function public.maintenance_register() to authenticated;
