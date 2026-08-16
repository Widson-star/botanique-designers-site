-- Staff Compensation V1 isolated lifecycle and authority matrix.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$ begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end $$;

insert into auth.users (id, email) values
 ('00000000-0000-0000-0000-000000000101','owner@staff-comp.test'),
 ('00000000-0000-0000-0000-000000000102','manager@staff-comp.test'),
 ('00000000-0000-0000-0000-000000000103','staff@staff-comp.test');
insert into public.profiles (id,email,full_name,role,is_active) values
 ('00000000-0000-0000-0000-000000000101','owner@staff-comp.test','Principal','owner',true),
 ('00000000-0000-0000-0000-000000000102','manager@staff-comp.test','Manager','manager',true),
 ('00000000-0000-0000-0000-000000000103','staff@staff-comp.test','Staff','staff',true);

-- People creation is an operational action; portal linkage is intentionally
-- absent because People authority forbids attaching a profile on INSERT.
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
insert into public.people (id,full_name,relationship_type,is_active) values
 ('20000000-0000-0000-0000-000000000101','Principal Person','principal',true),
 ('20000000-0000-0000-0000-000000000102','Manager Person','operations_manager',true),
 ('20000000-0000-0000-0000-000000000103','Former Staff Person','regular_staff',true);

-- Only the Principal may deactivate a Person.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
update public.people set is_active=false where id='20000000-0000-0000-0000-000000000103';
reset role;

insert into public.projects (
 id,project_name,project_type,status,stage,archived,portfolio_eligible,portfolio_permission_status
) values
 ('30000000-0000-0000-0000-000000000101','Completed Context','Residential','Completed','Completed',false,false,'Not Reviewed'),
 ('30000000-0000-0000-0000-000000000102','Archived Context','Residential','Completed','Archived',true,false,'Not Reviewed');

select pg_temp.assert_true((select relrowsecurity from pg_class where oid='public.staff_compensations'::regclass),'RLS enabled');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.staff_compensations','INSERT'),'no direct INSERT');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.staff_compensations','UPDATE'),'no direct UPDATE');
select pg_temp.assert_true(not has_table_privilege('authenticated','public.staff_compensation_events','DELETE'),'no event DELETE');
select pg_temp.assert_true((select proconfig @> array['search_path=pg_catalog, public'] from pg_proc where oid='public.submit_staff_compensation(uuid,integer)'::regprocedure),'fixed search path');

set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);

-- The beneficiary may be the Principal. A Completed Project is context only.
do $$ declare c public.staff_compensations; begin
 c:=public.create_staff_compensation_draft(
  '20000000-0000-0000-0000-000000000101','30000000-0000-0000-0000-000000000101',current_date,
  'compensation','Principal compensation test',25000);
 perform pg_temp.assert_true(c.lifecycle='draft','manager creates draft');
 perform pg_temp.assert_true(c.person_id='20000000-0000-0000-0000-000000000101','canonical Person beneficiary');
 perform pg_temp.assert_true(c.requester_id=auth.uid(),'requester actor separate from beneficiary');
 perform pg_temp.assert_true((select status='Completed' from public.projects where id=c.project_id),'creation leaves Project Completed');
 c:=public.submit_staff_compensation(c.id,c.version);
 perform pg_temp.assert_true(c.lifecycle='awaiting_review' and c.request_round=1,'submission opens decision');
 perform pg_temp.assert_true((select status='Completed' from public.projects where id=c.project_id),'submission leaves Project Completed');
 perform set_config('test.staff_comp.primary',c.id::text,true);
end $$;

-- An inactive/former Person can still be owed money; Project is optional.
do $$ declare c public.staff_compensations; begin
 c:=public.create_staff_compensation_draft(
  '20000000-0000-0000-0000-000000000103',null,current_date,'allowance','Former staff allowance due',5000);
 perform pg_temp.assert_true(c.project_id is null,'Project optional');
 perform pg_temp.assert_true(c.person_id='20000000-0000-0000-0000-000000000103','inactive Person remains valid beneficiary');
end $$;

-- Archived Project context also does not reopen or gate the financial record.
do $$ declare c public.staff_compensations; begin
 c:=public.create_staff_compensation_draft(
  '20000000-0000-0000-0000-000000000102','30000000-0000-0000-0000-000000000102',current_date,
  'other','Historical compensation linked to archived project',7000);
 perform pg_temp.assert_true((select archived from public.projects where id=c.project_id),'archived context remains archived');
end $$;

-- Manager cannot decide.
do $$ begin
 perform public.decide_staff_compensation(current_setting('test.staff_comp.primary')::uuid,2,'approved',null);
 raise exception 'expected manager decision rejection';
exception when insufficient_privilege then null; end $$;

-- Ordinary staff cannot create.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000103',true);
do $$ begin
 perform public.create_staff_compensation_draft('20000000-0000-0000-0000-000000000103',null,current_date,'compensation','Unauthorised',1000);
 raise exception 'expected staff creation rejection';
exception when insufficient_privilege then null; end $$;

-- Principal gets stale-write protection, then may decide a manager request.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$ begin
 perform public.decide_staff_compensation(current_setting('test.staff_comp.primary')::uuid,1,'approved',null);
 raise exception 'expected stale version rejection';
exception when serialization_failure then null; end $$;
do $$ declare c public.staff_compensations; begin
 c:=public.decide_staff_compensation(current_setting('test.staff_comp.primary')::uuid,2,'approved',null);
 perform pg_temp.assert_true(c.lifecycle='approved' and c.approved_amount=25000,'Principal approves submitted amount');
 perform pg_temp.assert_true(c.decider_id=auth.uid(),'decider actor stamped');
 perform pg_temp.assert_true((select status='Completed' from public.projects where id=c.project_id),'decision leaves Project Completed');
end $$;

-- Full amendment/resubmission path on a Completed Project.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
do $$ declare c public.staff_compensations; begin
 c:=public.create_staff_compensation_draft(
  '20000000-0000-0000-0000-000000000102','30000000-0000-0000-0000-000000000101',current_date,
  'bonus','Completion bonus',10000);
 c:=public.submit_staff_compensation(c.id,c.version);
 perform set_config('test.staff_comp.amend',c.id::text,true);
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000101',true);
do $$ declare c public.staff_compensations; begin
 c:=public.decide_staff_compensation(current_setting('test.staff_comp.amend')::uuid,2,'amendment_requested','Revise amount');
 perform pg_temp.assert_true(c.lifecycle='amendment_requested','Principal requests amendment');
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000102',true);
do $$ declare c public.staff_compensations; begin
 c:=public.update_staff_compensation(
  current_setting('test.staff_comp.amend')::uuid,3,'20000000-0000-0000-0000-000000000102',
  '30000000-0000-0000-0000-000000000101',current_date,'bonus','Revised completion bonus',8000);
 c:=public.submit_staff_compensation(c.id,c.version);
 perform pg_temp.assert_true(c.request_round=2 and c.submitted_amount=8000,'amend and resubmit round two');
 perform pg_temp.assert_true((select status='Completed' from public.projects where id=c.project_id),'amendment leaves Project Completed');
end $$;

-- Event rows are immutable by privilege/trigger design.
select pg_temp.assert_true((select count(*)>=3 from public.staff_compensation_events where compensation_id=current_setting('test.staff_comp.primary')::uuid),'event history recorded');
do $$ begin
 update public.staff_compensation_events set reason='rewrite' where compensation_id=current_setting('test.staff_comp.primary')::uuid;
 raise exception 'expected immutable event rejection';
exception when insufficient_privilege then null; end $$;

reset role;
rollback;
