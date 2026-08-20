-- Attempting side: the same PATCH, racing a registration that already holds the
-- catalogue row lock. It must block, then be refused because the asset that
-- committed first is now operational history.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',false);
update public.inventory_items set tracking_method='stock' where id=:'itemid'::uuid;
