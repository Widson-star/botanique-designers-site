-- The other half of the negative-stock race: a consumption that must BLOCK on
-- the holder's lock and then SUCCEED, because 2 of the original 10 genuinely
-- remain once the holder's 8 commits. Without this case the test would only
-- prove that concurrent movements are refused, not that they are correctly
-- serialised — a lock that rejected everything would pass the first case too.
-- Pass -v itemid=<uuid> on the psql command line.
\set ON_ERROR_STOP on
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000091f1', false);
select public.record_stock_usage(
  :'itemid'::uuid, 'consumed', 2,
  (select site_id from public.projects where id = '00000000-0000-0000-0000-0000009110a1')
);
