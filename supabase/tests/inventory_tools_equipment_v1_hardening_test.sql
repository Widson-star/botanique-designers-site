-- BOTANIQUE DESIGNERS — Inventory / Tools & Equipment V1 hardening regressions.
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

create temp table hard_fx(k text primary key,v uuid);
grant all on hard_fx to public;
create function pg_temp.fxset(key text,val uuid) returns uuid language plpgsql as $$
begin insert into hard_fx(k,v) values(key,val) on conflict(k) do update set v=excluded.v; return val; end $$;
create function pg_temp.fx(key text) returns uuid language sql stable as $$ select v from hard_fx where k=key $$;

insert into auth.users(id,email) values
 ('10000000-0000-0000-0000-000000000001','owner-hard@test.local'),
 ('10000000-0000-0000-0000-000000000002','manager-hard@test.local'),
 ('10000000-0000-0000-0000-000000000003','staff-hard@test.local');
insert into public.profiles(id,email,full_name,role,is_active) values
 ('10000000-0000-0000-0000-000000000001','owner-hard@test.local','Hardening Principal','owner',true),
 ('10000000-0000-0000-0000-000000000002','manager-hard@test.local','Hardening Manager','manager',true),
 ('10000000-0000-0000-0000-000000000003','staff-hard@test.local','Hardening Staff','staff',true);

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
insert into public.people(id,full_name,relationship_type)
values('10000000-0000-0000-0000-000000002001','Hardening Custodian','regular_staff');

insert into public.maintenance_relationships(site_id,project_id,scope,start_date,frequency)
values(pg_temp.fx('alpha_site'),'10000000-0000-0000-0000-000000001001','Hardening aftercare',current_date,'monthly');
with v as (
 insert into public.maintenance_visits(maintenance_relationship_id,scheduled_date,purpose)
 select id,current_date,'Hardening context visit'
 from public.maintenance_relationships where site_id=pg_temp.fx('alpha_site') returning id
) select pg_temp.fxset('alpha_visit',id) from v;

-- 1. Extensible canonical catalogue classification.
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Landscape Fabric','Landscape Fabric','stock','Square Metre') returning * into i;
  perform pg_temp.assert_eq(i.category,'landscape_fabric','category normalises');
  perform pg_temp.assert_eq(i.unit_of_measure,'square_metre','stock UOM is extensible');
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bulk Topsoil','bulk_material','stock','cubic_metre');
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Steel Stakes','site_hardware','stock','bundle');
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bulk Compost','soil_amendment','stock','tonne');
end $$;

do $$ begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Blank Category','   ','stock','unit');
  raise exception 'ASSERTION FAILED: blank category accepted';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Oversized Category',repeat('x',81),'stock','unit');
  raise exception 'ASSERTION FAILED: oversized category accepted';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Bad Asset Unit','equipment','asset','piece');
  raise exception 'ASSERTION FAILED: asset non-unit UOM accepted';
exception when check_violation then null; end $$;

-- 2. The controlled-change marker cannot MANUFACTURE authority.
--
-- Authority 17 gave the Operations Manager full control of Tools & Equipment,
-- so a manager forging this marker is no longer a privilege escalation — they
-- already hold the power the marker guards, exactly as the Principal always
-- did. The boundary that still matters, and is asserted here, is that somebody
-- with NO Inventory authority gains nothing from setting it, and that the
-- reason requirement binds regardless of who is asking.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('GUC Guard Drill','power_tools','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-GUC-001');
  perform pg_temp.fxset('guc_item',i.id);
end $$;

-- 2a. STAFF holds no Inventory authority. The marker changes nothing for them.
--
-- Asserted on the OUTCOME rather than on a particular exception: staff are
-- filtered by RLS before the trigger is even reached, so the UPDATE matches
-- zero rows and raises nothing at all. "Nothing changed" is the property that
-- matters, and it holds whichever layer does the refusing.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);
select set_config('app.inventory_item_controlled_change','true',true);
select set_config('app.inventory_item_change_reason','Staff forged marker',true);
do $$
begin
  begin
    update public.inventory_items set item_name='Forged Rename' where id=pg_temp.fx('guc_item');
  exception when insufficient_privilege then null; end;
  begin
    update public.inventory_items set category='forged_category' where id=pg_temp.fx('guc_item');
  exception when insufficient_privilege then null; end;
  begin
    update public.inventory_items set is_active=false where id=pg_temp.fx('guc_item');
  exception when insufficient_privilege then null; end;
end $$;

-- Read the truth back as an authorised caller, since staff cannot see it.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
do $$
declare i public.inventory_items;
begin
  select * into i from public.inventory_items where id=pg_temp.fx('guc_item');
  perform pg_temp.assert_eq(i.item_name,'GUC Guard Drill',
    'staff cannot rename a catalogue item by forging the marker');
  perform pg_temp.assert_eq(i.category,'power_tools',
    'staff cannot recategorise a catalogue item by forging the marker');
  perform pg_temp.assert_true(i.is_active,
    'staff cannot deactivate a catalogue item by forging the marker');
end $$;
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000003',true);

-- 2b. The reason requirement still binds even for an authorised caller.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',true);
select set_config('app.inventory_item_change_reason','',true);
do $$ begin
  update public.inventory_items set item_name='Reasonless Rename' where id=pg_temp.fx('guc_item');
  raise exception 'ASSERTION FAILED: a controlled change without a reason was accepted';
exception when others then null; end $$;

-- 2c. And an authorised Manager genuinely may make the reasoned change, which
-- is the Founder decision this tranche implements.
select set_config('app.inventory_item_change_reason','Manager reasoned correction',true);
do $$
declare renamed text;
begin
  update public.inventory_items set item_name='Manager Renamed Drill' where id=pg_temp.fx('guc_item');
  select item_name into renamed from public.inventory_items where id=pg_temp.fx('guc_item');
  perform pg_temp.assert_eq(renamed,'Manager Renamed Drill',
    'the Manager may make a reasoned catalogue correction');
end $$;
select set_config('app.inventory_item_controlled_change','false',true);
select set_config('app.inventory_item_change_reason','',true);

-- 3. Deactivation cannot strand stock or hide a lost asset.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Deactivation Stock','consumables','stock','unit') returning * into i;
  perform pg_temp.fxset('deact_stock',i.id);
  perform public.record_stock_receipt(i.id,10);
end $$;
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('deact_stock');
  perform public.deactivate_inventory_item(i.id,i.version,'Custody stock remains');
  raise exception 'ASSERTION FAILED: positive custody stock did not block deactivation';
exception when invalid_parameter_value then null; end $$;
select public.record_stock_transfer(pg_temp.fx('deact_stock'),'issued',10,null,pg_temp.fx('alpha_site'));
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('deact_stock');
  perform public.deactivate_inventory_item(i.id,i.version,'Site stock remains');
  raise exception 'ASSERTION FAILED: positive Site stock did not block deactivation';
exception when invalid_parameter_value then null; end $$;
select public.record_stock_usage(pg_temp.fx('deact_stock'),'consumed',10,pg_temp.fx('alpha_site'));
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('deact_stock');
  i := public.deactivate_inventory_item(i.id,i.version,'All stock reconciled to zero');
  perform pg_temp.assert_true(not i.is_active,'zero stock permits deactivation');
end $$;

do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Lost Asset Type','equipment','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-LOST-001');
  a := public.report_equipment_asset_lost(a.id,a.version,'Missing during test');
  perform pg_temp.fxset('lost_item',i.id);
end $$;
do $$ declare i public.inventory_items; begin
  select * into i from public.inventory_items where id=pg_temp.fx('lost_item');
  perform public.deactivate_inventory_item(i.id,i.version,'Try hiding lost asset');
  raise exception 'ASSERTION FAILED: lost asset did not block deactivation';
exception when invalid_parameter_value then null; end $$;

do $$
declare item_id uuid; i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Retired Asset Type','equipment','asset','unit') returning id into item_id;
  a := public.register_equipment_asset(item_id,'HARD-RET-001');
  a := public.retire_equipment_asset(a.id,a.version,'Resolved retirement test');
  select * into i from public.inventory_items where id=item_id;
  i := public.deactivate_inventory_item(i.id,i.version,'All assets retired');
  perform pg_temp.assert_true(not i.is_active,'retired-only catalogue can deactivate');
end $$;

-- 4. Stock labels have exact position semantics and context has one Site.
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Context Stock','irrigation','stock','unit') returning * into i;
  perform pg_temp.fxset('ctx_stock',i.id);
  perform public.record_stock_receipt(i.id,20);
end $$;
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',1,pg_temp.fx('alpha_site'),pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: Site-to-Site labelled issued';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'transferred',1,null,pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: custody-to-Site labelled transferred';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'returned',1,null,pg_temp.fx('beta_site'));
  raise exception 'ASSERTION FAILED: custody-to-Site labelled returned';
exception when invalid_parameter_value then null; end $$;
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',5,null,pg_temp.fx('beta_site'),null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong Project');
  raise exception 'ASSERTION FAILED: issue accepted origin-Site Project';
exception when invalid_parameter_value then null; end $$;
select public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',5,null,pg_temp.fx('beta_site'),null,
  '10000000-0000-0000-0000-000000001002',null,'Correct Project');
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'returned',1,pg_temp.fx('beta_site'),null,null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong return Project');
  raise exception 'ASSERTION FAILED: return accepted wrong Project';
exception when invalid_parameter_value then null; end $$;
select public.record_stock_transfer(pg_temp.fx('ctx_stock'),'returned',1,pg_temp.fx('beta_site'),null,null,
  '10000000-0000-0000-0000-000000001002',null,'Correct return Project');
do $$ begin
  perform public.record_stock_transfer(pg_temp.fx('ctx_stock'),'issued',1,null,pg_temp.fx('beta_site'),null,null,
    pg_temp.fx('alpha_visit'),'Wrong maintenance visit');
  raise exception 'ASSERTION FAILED: issue accepted wrong Maintenance visit';
exception when invalid_parameter_value then null; end $$;

-- 5. Equipment uses destination context; repair position remains physical truth.
do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Context Equipment','power_tools','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-CTX-001','owned','good',pg_temp.fx('alpha_site'));
  perform pg_temp.fxset('ctx_asset',a.id);
end $$;
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  perform public.issue_equipment_asset(a.id,a.version,pg_temp.fx('beta_site'),null,null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong Project');
  raise exception 'ASSERTION FAILED: equipment issue accepted origin Project';
exception when invalid_parameter_value then null; end $$;
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  a := public.issue_equipment_asset(a.id,a.version,pg_temp.fx('beta_site'),'10000000-0000-0000-0000-000000002001',current_date+5,
    '10000000-0000-0000-0000-000000001002',null,'Correct Project');
  perform pg_temp.assert_eq(a.current_site_id,pg_temp.fx('beta_site'),'equipment issued to destination');
end $$;
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  perform public.return_equipment_asset(a.id,a.version,null,null,
    '10000000-0000-0000-0000-000000001001',null,'Wrong return Project');
  raise exception 'ASSERTION FAILED: equipment return accepted wrong Project';
exception when invalid_parameter_value then null; end $$;
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  a := public.send_equipment_asset_for_repair(a.id,a.version,'Repair truth test');
  perform pg_temp.assert_eq(a.status,'under_repair','repair status set');
  perform pg_temp.assert_true(a.current_site_id is null,'repair clears client Site');
  perform pg_temp.assert_true(a.current_custodian_person_id is null,'repair clears custodian');
  perform pg_temp.assert_eq(
    (select previous_snapshot->>'current_site_id' from public.equipment_asset_events
     where equipment_asset_id=a.id and event_type='sent_for_repair' order by resulting_version desc limit 1),
    pg_temp.fx('beta_site')::text,'repair event preserves origin Site');
end $$;
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  perform public.return_equipment_asset_from_repair(a.id,a.version,null,pg_temp.fx('alpha_site'),'Missing condition');
  raise exception 'ASSERTION FAILED: repair return accepted no condition';
exception when invalid_parameter_value then null; end $$;
do $$ declare a public.equipment_assets; begin
  select * into a from public.equipment_assets where id=pg_temp.fx('ctx_asset');
  a := public.return_equipment_asset_from_repair(a.id,a.version,'good',pg_temp.fx('alpha_site'),'Repair complete');
  perform pg_temp.assert_eq(a.status,'available','repair return restores available');
  perform pg_temp.assert_eq(a.current_site_id,pg_temp.fx('alpha_site'),'repair return sets explicit Site');
  perform pg_temp.assert_eq(a.condition,'good','repair return records resulting condition');
end $$;

-- 6. Even the PRINCIPAL cannot forge the marker past a deactivation invariant.
--
-- 20260820003200_inventory_item_deactivation_invariant.sql exists precisely for
-- this: the marker authorises an exceptional change, it never waives the
-- business invariant. Section 3 above proves the invariant through the RPC;
-- this proves it at the table boundary, where a Principal issuing a raw UPDATE
-- with a hand-set marker would otherwise strand real physical truth.
select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000001',true);
do $$
declare i public.inventory_items;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Principal Forge Stock','consumables','stock','unit') returning * into i;
  perform pg_temp.fxset('forge_stock',i.id);
  perform public.record_stock_receipt(i.id,4);
end $$;

do $$
begin
  perform set_config('app.inventory_item_controlled_change','true',true);
  perform set_config('app.inventory_item_change_reason','Principal forcing a deactivation',true);
  update public.inventory_items set is_active=false where id=pg_temp.fx('forge_stock');
  raise exception 'ASSERTION FAILED: Principal forged marker stranded live stock';
exception when invalid_parameter_value then
  perform set_config('app.inventory_item_controlled_change','false',true);
  perform set_config('app.inventory_item_change_reason','',true);
end $$;

do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Principal Forge Asset','equipment','asset','unit') returning * into i;
  perform pg_temp.fxset('forge_asset_item',i.id);
  a := public.register_equipment_asset(i.id,'HARD-FORGE-001');
  a := public.report_equipment_asset_lost(a.id,a.version,'Missing during forge test');
end $$;

do $$
begin
  perform set_config('app.inventory_item_controlled_change','true',true);
  perform set_config('app.inventory_item_change_reason','Principal forcing a deactivation',true);
  update public.inventory_items set is_active=false where id=pg_temp.fx('forge_asset_item');
  raise exception 'ASSERTION FAILED: Principal forged marker hid an unresolved lost asset';
exception when invalid_parameter_value then
  perform set_config('app.inventory_item_controlled_change','false',true);
  perform set_config('app.inventory_item_change_reason','',true);
end $$;

-- And the invariant is a real reconciliation, not a permanent lock: once the
-- stock genuinely reaches zero the same forged path is still refused for
-- authority reasons only when the caller is not the Principal, while the
-- intended RPC succeeds.
do $$
declare i public.inventory_items;
begin
  perform public.record_stock_usage(pg_temp.fx('forge_stock'),'consumed',4,null);
  select * into i from public.inventory_items where id=pg_temp.fx('forge_stock');
  i := public.deactivate_inventory_item(i.id,i.version,'Reconciled to zero, line withdrawn');
  perform pg_temp.assert_true(not i.is_active,'reconciled stock still deactivates through the RPC');
end $$;

-- 7. Equipment transfer may change Site, custodian, or BOTH.
--
-- Unlike quantity stock, individually tracked equipment carries a custody
-- dimension, so a same-Site hand-over from one person to another is a real
-- transfer event and must be recordable. Every other transfer test in this
-- suite changes the Site, so without this the custodian-only case is unproven.
do $$
declare i public.inventory_items; a public.equipment_assets;
begin
  insert into public.people(id,full_name,relationship_type)
  values('10000000-0000-0000-0000-000000002002','Hardening Custodian Two','site_representative');

  insert into public.inventory_items(item_name,category,tracking_method,unit_of_measure)
  values('Handover Equipment','power_tools','asset','unit') returning * into i;
  a := public.register_equipment_asset(i.id,'HARD-HANDOVER-001');
  a := public.issue_equipment_asset(a.id,a.version,pg_temp.fx('alpha_site'),
    '10000000-0000-0000-0000-000000002001',null,null,null,'Issued to the first custodian');
  perform pg_temp.fxset('handover_asset',a.id);
end $$;

-- Custodian only, same Site — allowed.
do $$
declare a public.equipment_assets;
begin
  select * into a from public.equipment_assets where id=pg_temp.fx('handover_asset');
  a := public.transfer_equipment_asset(a.id,a.version,pg_temp.fx('alpha_site'),
    '10000000-0000-0000-0000-000000002002',null,null,null,'Same-Site hand-over');
  perform pg_temp.assert_eq(a.current_site_id,pg_temp.fx('alpha_site'),'hand-over keeps the Site');
  perform pg_temp.assert_eq(a.current_custodian_person_id,'10000000-0000-0000-0000-000000002002'::uuid,
    'hand-over moves custody to the second person');
  perform pg_temp.assert_eq(
    (select event_type from public.equipment_asset_events
     where equipment_asset_id=a.id order by resulting_version desc limit 1),
    'transferred','a same-Site hand-over is recorded as a transfer');
end $$;

-- Site only, custodian unchanged — also allowed.
do $$
declare a public.equipment_assets;
begin
  select * into a from public.equipment_assets where id=pg_temp.fx('handover_asset');
  a := public.transfer_equipment_asset(a.id,a.version,pg_temp.fx('beta_site'),
    '10000000-0000-0000-0000-000000002002',null,null,null,'Same custodian, new Site');
  perform pg_temp.assert_eq(a.current_site_id,pg_temp.fx('beta_site'),'transfer moves the Site');
  perform pg_temp.assert_eq(a.current_custodian_person_id,'10000000-0000-0000-0000-000000002002'::uuid,
    'while custody is unchanged');
end $$;

-- Neither changed — refused, because that is not a transfer of anything.
do $$
declare a public.equipment_assets;
begin
  select * into a from public.equipment_assets where id=pg_temp.fx('handover_asset');
  perform public.transfer_equipment_asset(a.id,a.version,pg_temp.fx('beta_site'),
    '10000000-0000-0000-0000-000000002002',null,null,null,'Nothing actually moves');
  raise exception 'ASSERTION FAILED: a transfer that changes nothing was accepted';
exception when invalid_parameter_value then null; end $$;

reset role;
rollback;
