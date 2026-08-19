-- BOTANIQUE DESIGNERS — Inventory / Tools & Equipment V1 hardening regressions.
-- Runs after the full migration chain on the disposable PostgreSQL cluster.
\set ON_ERROR_STOP on
begin;

create function pg_temp.assert_true(value boolean, message text)
returns void language plpgsql as $$
begin
  if value is not true then raise exception 'ASSERTION FAILED: %', message; end if;
end;
$$;

create function pg_temp.assert_eq(actual anyelement, expected anyelement, message text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'ASSERTION FAILED: % (expected %, got %)', message, expected, actual;
  end if;
end;
$$;

create temp table hard_fx (k text primary key, v uuid);
grant all on hard_fx to public;
create function pg_temp.fxset(key text, val uuid) returns uuid language plpgsql as $$
begin
  insert into hard_fx(k,v) values(key,val) on conflict(k) do update set v=excluded.v;
  return val;
end;
$$;
create function pg_temp.fx(key text) returns uuid language sql stable as $$ select v from hard_fx where k=key $$;
create function pg_temp.bal(item_id uuid, site_id uuid) returns numeric language sql stable security definer as $$
  select public.private_inventory_stock_balance(item_id, site_id)
$$;

-- Roles.
insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','owner-hard@test.local'),
 ('10000000-0000-0000-0000-000000000002','manager-hard@test.local');
insert into public.profiles(id,email,full_name,role,is_active) values
 ('10000000-0000-0000-0000-000000000001','owner-hard@test.local','Hardening Principal','owner',true),
 ('10000000-0000-0000-0000-000000000002','manager-hard@test.local','Hardening Manager','manager',true);

-- Two ordinary Projects create two durable Sites through the existing Project path.
insert into public.projects(
 id,project_name,client_site_name,project_type,status,stage,archived,
 lead_person_id,portfolio_eligible,portfolio_permission_status
) values
 ('10000000-0000-0000-0000-000000001001','Hardening Alpha','Hardening Alpha Property','Residential','Ongoing','Implementation',false,null,false,'Not Reviewed'),
 ('10000000-0000-0000-0000-000000001002','Hardening Beta','Hardening Beta Property','Residential','Ongoing','Implementation',false,null,false,'Not Reviewed');
select pg_temp.fxset('alpha_site',(select site_id from public.projects where id='10000000-0000-0000-0000-000000001001'));
select pg_temp.fxset('beta_site',(select site_id from public.projects where id='10000000-0000-0000-0000-000000001002'));

set local role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);

insert into public.people(id,full_name,relationship_type) values
 ('10000000-0000-0000-0000-000000002001','Hardening Custodian','regular_staff');

-- Maintenance context on Alpha, for wrong-Site checks against Beta.
insert into public.maintenance_relationships(site_id,project_id,scope,start_date,frequency)
values(pg_temp.fx('alpha_site'),'10000000-0000-0000-0000-000000001001','Hardening aftercare',current_date,'monthly');
with v as (
 insert into public.maintenance_visits(maintenance_relationship_id,scheduled_date,purpose)
 select id,current_date,'Hardening context visit' from public.maintenance_relationships
 where site_id=pg_temp.fx('alpha_site') returning id
) select pg_temp.fxset('alpha_visit',id) from v;

-- =====================================================================
-- H1. Extensible, normalised catalogue vocabulary.
-- =====================================================================
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Landscape Fabric','Landscape Fabric','stock','Square Metre') returning * into i;
  perform pg_temp.assert_eq(i.category,'landscape_fabric','H1 category normalises to canonical token');
  perform pg_temp.assert_eq(i.unit_of_measure,'square_metre','H1 stock UOM normalises and is not schema-enumerated');
  perform pg_temp.fxset('fabric_item',i.id);

  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bulk Topsoil','bulk_material','stock','cubic_metre');
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Steel Stakes','site_hardware','stock','bundle');
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bulk Compost','soil_amendment','stock','tonne');
end;
$$;

do $$ begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bad Blank Category','   ','stock','unit');
  raise exception 'ASSERTION FAILED: H1 blank category must fail';
exception when check_violation then null; end $$;

do $$ begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bad Long Category',repeat('x',81),'stock','unit');
  raise exception 'ASSERTION FAILED: H1 oversized category must fail';
exception when check_violation then null; end $$;

do $$ begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bad Asset Unit','equipment','asset','piece');
  raise exception 'ASSERTION FAILED: H1 asset tracking must retain canonical unit UOM';
exception when check_violation then null; end $$;

-- =====================================================================
-- H2. Custom GUC markers cannot manufacture Principal authority.
-- =====================================================================
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('GUC Guard Drill','power_tools','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-GUC-001');
  perform pg_temp.fxset('guc_item',i.id);
end;
$$;

select set_config('app.inventory_item_controlled_change','true',true);
select set_config('app.inventory_item_change_reason','Manager forged marker',true);
do $$ begin
  update public.inventory_items set item_name='Forged Rename' where id=pg_temp.fx('guc_item');
  raise exception 'ASSERTION FAILED: H2 manager GUC must not authorise name correction';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.inventory_items set category='forged_category' where id=pg_temp.fx('guc_item');
  raise exception 'ASSERTION FAILED: H2 manager GUC must not authorise category correction';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.inventory_items set is_active=false where id=pg_temp.fx('guc_item');
  raise exception 'ASSERTION FAILED: H2 manager GUC must not authorise active-state change';
exception when insufficient_privilege then null; end $$;
select set_config('app.inventory_item_controlled_change','false',true);
select set_config('app.inventory_item_change_reason','',true);

-- =====================================================================
-- H3. Deactivation cannot strand stock or hide unresolved lost equipment.
-- =====================================================================
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Deactivation Stock','consumables','stock','unit') returning * into i;
  perform pg_temp.fxset('deact_stock',i.id);
  perform public.record_stock_receipt(i.id,10);
end;
$$;

do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('deact_stock');
  perform public.deactivate_inventory_item(i.id,i.version,'Attempt with custody stock');
  raise exception 'ASSERTION FAILED: H3 positive Botanique stock must block deactivation';
exception when invalid_parameter_value then null; end $$;

perform public.record_stock_transfer(pg_temp.fx('deact_stock'),'issued',10,null,pg_temp.fx('alpha_site'));
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('deact_stock');
  perform public.deactivate_inventory_item(i.id,i.version,'Attempt with Site stock');
  raise exception 'ASSERTION FAILED: H3 positive Site stock must block deactivation';
exception when invalid_parameter_value then null; end $$;
perform public.record_stock_usage(pg_temp.fx('deact_stock'),'consumed',10,pg_temp.fx('alpha_site'));
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('deact_stock');
  i := public.deactivate_inventory_item(i.id,i.version,'All positions reconciled to zero');
  perform pg_temp.assert_true(not i.is_active,'H3 zero stock can be deactivated');
end $$;

do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Lost Asset Type','equipment','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-LOST-001');
  a := public.report_equipment_asset_lost(a.id,a.version,'Missing during hardening test');
  perform pg_temp.fxset('lost_item',i.id);
end;
$$;
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('lost_item');
  perform public.deactivate_inventory_item(i.id,i.version,'Try hiding lost asset');
  raise exception 'ASSERTION FAILED: H3 lost asset must block catalogue deactivation';
exception when invalid_parameter_value then null; end $$;

do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Retired Asset Type','equipment','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-RET-001');
  a := public.retire_equipment_asset(a.id,a.version,'Resolved retirement test');
  select * into i from public.inventory_items where id=i.id;
  i := public.deactivate_inventory_item(i.id,i.version,'All assets retired');
  perform pg_temp.assert_true(not i.is_active,'H3 fully retired asset catalogue can deactivate');
end;
$$;

-- =====================================================================
-- H4. Exact stock movement semantics and one-Site context attribution.
-- =====================================================================
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Context Stock','irrigation','stock','unit') returning * into i;
  perform pg_temp.fxset('ctx_stock',i.id);
  perform public.record_stock_receipt(i.id,20);
end;
$$;

do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',1,pg_temp.fx('alpha_site'),pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: H4 issued must be Botanique custody to Site';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'transferred',1,null,pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: H4 transfer must be Site to different Site';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'returned',1,null,pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: H4 return must be Site to Botanique custody';
exception when invalid_parameter_value then null; end $$;

do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',5,null,pg_temp.fx('beta_site'),null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong origin Project');
  raise exception 'ASSERTION FAILED: H4 issue cannot carry unrelated origin-Site Project';
exception when invalid_parameter_value then null; end $$;

perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',5,null,pg_temp.fx('beta_site'),null,
  '10000000-0000-0000-0000-000000001002',null,'Correct destination Project');

do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'returned',1,pg_temp.fx('beta_site'),null,null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong return Project');
  raise exception 'ASSERTION FAILED: H4 return context must match origin Site';
exception when invalid_parameter_value then null; end $$;
perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'returned',1,pg_temp.fx('beta_site'),null,null,
  '10000000-0000-0000-0000-000000001002',null,'Correct return Project');

do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',1,null,pg_temp.fx('beta_site'),null,null,
    pg_temp.fx('alpha_visit'),'Wrong maintenance visit');
  raise exception 'ASSERTION FAILED: H4 Maintenance context must match operational Site';
exception when invalid_parameter_value then null; end $$;

-- =====================================================================
-- H5. Equipment context attribution and repair position remain truthful.
-- =====================================================================
do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Context Equipment','power_tools','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-CTX-001','owned','good',pg_temp.fx('alpha_site'));
  perform pg_temp.fxset('ctx_asset',a.id);
end;
$$;

-- An available asset may physically be at Alpha; issue context describes Beta destination.
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  perform public.issue_equipment_asset(a.id,a.version,pg_temp.fx('beta_site'),null,null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong Project');
  raise exception 'ASSERTION FAILED: H5 origin Project must not be accepted on destination issue';
exception when invalid_parameter_value then null; end $$;

do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  a := public.issue_equipment_asset(a.id,a.version,pg_temp.fx('beta_site'),'10000000-0000-0000-0000-000000002001',current_date+5,
    '10000000-0000-0000-0000-000000001002',null,'Correct destination Project');
  perform pg_temp.assert_eq(a.current_site_id,pg_temp.fx('beta_site'),'H5 issue reaches destination Site');
end $$;

do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  perform public.return_equipment_asset(a.id,a.version,null,null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong return Project');
  raise exception 'ASSERTION FAILED: H5 return must reject Project from another Site';
exception when invalid_parameter_value then null; end $$;

do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  a := public.send_equipment_asset_for_repair(a.id,a.version,'Repair position truth test');
  perform pg_temp.assert_eq(a.status,'under_repair','H5 repair state set');
  perform pg_temp.assert_true(a.current_site_id is null,'H5 under-repair asset no longer falsely claims client Site');
  perform pg_temp.assert_true(a.current_custodian_person_id is null,'H5 repair clears custodian');
  perform pg_temp.assert_eq(
    (select previous_snapshot->>'current_site_id' from public.equipment_asset_events
     where equipment_asset_id=a.id and event_type='sent_for_repair' order by resulting_version desc limit 1),
    pg_temp.fx('beta_site')::text,'H5 immutable repair event preserves origin Site');
end $$;

do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  perform public.return_equipment_asset_from_repair(a.id,a.version,null,pg_temp.fx('alpha_site'),'Missing condition');
  raise exception 'ASSERTION FAILED: H5 return from repair must state resulting condition';
exception when invalid_parameter_value then null; end $$;

do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  a := public.return_equipment_asset_from_repair(a.id,a.version,'good',pg_temp.fx('alpha_site'),'Repair complete');
  perform pg_temp.assert_eq(a.status,'available','H5 repair return restores available');
  perform pg_temp.assert_eq(a.current_site_id,pg_temp.fx('alpha_site'),'H5 repair return explicitly restores physical Site');
  perform pg_temp.assert_eq(a.condition,'good','H5 repair return records resulting condition');
end $$;

reset role;
rollback;
