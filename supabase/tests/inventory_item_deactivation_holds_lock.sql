\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',true);
select public.deactivate_inventory_item(:'itemid'::uuid,1,'registration race test');
select pg_sleep(2);
commit;
