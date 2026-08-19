\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',false);
select public.register_equipment_asset(:'itemid'::uuid, :'assetcode');
