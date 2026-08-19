-- The "attempting" side of the negative-stock race: a single autocommit
-- consumption of 8 against the same item and Site. If the holder's
-- transaction still holds the catalogue-row lock, this BLOCKS until that
-- commits, then re-reads the balance and must be refused, because only 2 of
-- the original 10 remain.
-- Pass -v itemid=<uuid> on the psql command line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000091f1', false);
select public.record_stock_usage(
  :'itemid'::uuid, 'consumed', 8,
  (select site_id from public.projects where id = '00000000-0000-0000-0000-0000009110a1')
);
