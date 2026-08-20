\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',true);
select public.register_equipment_asset(:'itemid'::uuid, :'assetcode');
select pg_sleep(2);
commit;
