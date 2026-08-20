-- The "lock holder" side of the negative-stock race: consumes 8 of the 10
-- units inside an explicit transaction and sleeps before committing, so the
-- FOR UPDATE lock private_record_inventory_stock_movement() takes on the
-- catalogue row stays held for the sleep duration.
-- Pass -v itemid=<uuid> on the psql command line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000091f1', false);
begin;
select public.record_stock_usage(
  :'itemid'::uuid, 'consumed', 8,
  (select site_id from public.projects where id = '00000000-0000-0000-0000-0000009110a1')
);
select pg_sleep(2);
commit;
