-- Holder side of the tracking_method half of the registration race: a direct
-- client PATCH flipping a fresh catalogue item from asset to stock tracking,
-- holding the catalogue row lock while it sleeps.
\set ON_ERROR_STOP on
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',true);
update public.inventory_items set tracking_method='stock' where id=:'itemid'::uuid;
select pg_sleep(2);
commit;
