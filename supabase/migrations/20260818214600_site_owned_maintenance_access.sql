-- Site-based Maintenance access and read models.

create or replace function public.create_maintenance_site(
  target_site_name text,
  target_location text default null,
  target_county text default null
)
returns public.sites
language plpgsql
security definer
set search_path=pg_catalog,public
as $$
declare clean_name text:=nullif(regexp_replace(trim(coalesce(target_site_name,'')),'\s+',' ','g'),''); clean_location text:=nullif(regexp_replace(trim(coalesce(target_location,'')),'\s+',' ','g'),''); clean_county text:=nullif(regexp_replace(trim(coalesce(target_county,'')),'\s+',' ','g'),''); existing public.sites; created public.sites;
begin
  if public.current_user_role() not in ('owner','manager') then raise exception 'You are not authorised to create a Maintenance Site' using errcode='42501'; end if;
  if clean_name is null then raise exception 'Site / property name is required' using errcode='22023'; end if;
  select * into existing from public.sites s
    where lower(trim(s.site_name))=lower(clean_name)
      and lower(trim(coalesce(s.location,'')))=lower(coalesce(clean_location,''))
      and lower(trim(coalesce(s.county,'')))=lower(coalesce(clean_county,''))
    order by s.created_at limit 1;
  if found then return existing; end if;
  insert into public.sites(site_name,location,county,created_by,updated_by)
    values(clean_name,clean_location,clean_county,auth.uid(),auth.uid()) returning * into created;
  return created;
end$$;

create or replace function public.maintenance_authorised_sites()
returns table(id uuid,site_name text,location text,county text,projects jsonb)
language sql stable security definer set search_path=pg_catalog,public as $$
 select s.id,s.site_name,s.location,s.county,
   coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'project_name',p.project_name,'status',p.status,'stage',p.stage,'archived',p.archived) order by p.project_name)
     from public.projects p where p.site_id=s.id and p.archived=false and p.status in ('Ongoing','Paused','Completed','Design-only')),'[]'::jsonb)
 from public.sites s
 where public.can_manage_maintenance_site(s.id)
   and not exists(select 1 from public.maintenance_relationships r where r.site_id=s.id and r.status<>'ended')
 order by s.site_name,s.location nulls last
$$;

create or replace function public.maintenance_authorised_projects()
returns setof public.projects language sql stable security definer set search_path=pg_catalog,public as $$
 select p.* from public.projects p
 where public.can_manage_maintenance_site(p.site_id) and p.archived=false and p.status in ('Ongoing','Paused','Completed')
 order by p.project_name
$$;

drop policy if exists maintenance_relationships_insert_authorised on public.maintenance_relationships;
drop policy if exists maintenance_relationships_select_authorised on public.maintenance_relationships;
drop policy if exists maintenance_relationships_update_authorised on public.maintenance_relationships;
create policy maintenance_relationships_insert_authorised on public.maintenance_relationships for insert to authenticated with check(public.can_manage_maintenance_site(site_id));
create policy maintenance_relationships_select_authorised on public.maintenance_relationships for select to authenticated using(public.can_manage_maintenance_site(site_id));
create policy maintenance_relationships_update_authorised on public.maintenance_relationships for update to authenticated using(public.can_manage_maintenance_site(site_id)) with check(public.can_manage_maintenance_site(site_id));

drop policy if exists maintenance_visits_insert_authorised on public.maintenance_visits;
drop policy if exists maintenance_visits_select_authorised on public.maintenance_visits;
drop policy if exists maintenance_visits_update_authorised on public.maintenance_visits;
create policy maintenance_visits_insert_authorised on public.maintenance_visits for insert to authenticated with check(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_visits_select_authorised on public.maintenance_visits for select to authenticated using(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_visits_update_authorised on public.maintenance_visits for update to authenticated using(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id))) with check(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));

drop policy if exists maintenance_assignments_insert_authorised on public.maintenance_assignments;
drop policy if exists maintenance_assignments_select_authorised on public.maintenance_assignments;
drop policy if exists maintenance_assignments_update_authorised on public.maintenance_assignments;
create policy maintenance_assignments_insert_authorised on public.maintenance_assignments for insert to authenticated with check(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_assignments_select_authorised on public.maintenance_assignments for select to authenticated using(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
create policy maintenance_assignments_update_authorised on public.maintenance_assignments for update to authenticated using(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id))) with check(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));

drop policy if exists maintenance_relationship_events_select_authorised on public.maintenance_relationship_events;
create policy maintenance_relationship_events_select_authorised on public.maintenance_relationship_events for select to authenticated using(exists(select 1 from public.maintenance_relationships r where r.id=maintenance_relationship_id and public.can_manage_maintenance_site(r.site_id)));
drop policy if exists maintenance_visit_events_select_authorised on public.maintenance_visit_events;
create policy maintenance_visit_events_select_authorised on public.maintenance_visit_events for select to authenticated using(exists(select 1 from public.maintenance_visits v join public.maintenance_relationships r on r.id=v.maintenance_relationship_id where v.id=maintenance_visit_id and public.can_manage_maintenance_site(r.site_id)));

drop function if exists public.maintenance_register();
create function public.maintenance_register()
returns table(id uuid,site_id uuid,site_name text,site_location text,site_county text,project_id uuid,project_name text,project_status text,status text,scope text,frequency text,start_date date,version integer,service_days smallint[],cadence_end_date date,last_visit_date date,next_visit_date date,assigned_team jsonb)
language sql stable security definer set search_path=pg_catalog,public as $$
 select r.id,r.site_id,s.site_name,s.location,s.county,r.project_id,p.project_name,p.status,r.status,r.scope,r.frequency,r.start_date,r.version,r.service_days,r.cadence_end_date,
   (select max(v.scheduled_date) from public.maintenance_visits v where v.maintenance_relationship_id=r.id and v.status='completed'),
   (select min(v.scheduled_date) from public.maintenance_visits v where v.maintenance_relationship_id=r.id and v.status='scheduled'),
   coalesce((select jsonb_agg(jsonb_build_object('person_id',a.person_id,'full_name',pe.full_name,'role',a.role) order by pe.full_name) from public.maintenance_assignments a join public.people pe on pe.id=a.person_id where a.maintenance_relationship_id=r.id and a.end_date is null),'[]'::jsonb)
 from public.maintenance_relationships r join public.sites s on s.id=r.site_id left join public.projects p on p.id=r.project_id
 where public.can_manage_maintenance_site(r.site_id) order by s.site_name
$$;

create or replace function public.maintenance_project_summary(target_project_id uuid)
returns table(id uuid,status text,next_visit_date date)
language sql stable security definer set search_path=pg_catalog,public as $$
 select r.id,r.status,(select min(v.scheduled_date) from public.maintenance_visits v where v.maintenance_relationship_id=r.id and v.status='scheduled')
 from public.maintenance_relationships r where r.project_id=target_project_id and r.status<>'ended' and public.can_manage_maintenance_site(r.site_id)
$$;

create or replace function public.private_daily_site_project_eligible(target_project_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.projects p where p.id=target_project_id and p.archived=false and (p.status='Ongoing' or exists(select 1 from public.maintenance_relationships m where m.site_id=p.site_id and m.status='active')))
$$;

revoke execute on function public.create_maintenance_site(text,text,text) from public,anon;
revoke execute on function public.maintenance_authorised_sites() from public,anon;
revoke execute on function public.maintenance_register() from public,anon;
grant execute on function public.create_maintenance_site(text,text,text) to authenticated;
grant execute on function public.maintenance_authorised_sites() to authenticated;
grant execute on function public.maintenance_register() to authenticated;
