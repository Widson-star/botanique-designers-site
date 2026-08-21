-- Fixture for the automatic asset-code concurrency regression.
-- One asset-tracked catalogue item that two sessions register against at the
-- same moment. Committed, because the separate psql race sessions have to see
-- it. Nothing here resembles production data.
--
-- Reuses the Principal created by inventory_asset_registration_race_fixture,
-- which the runner applies earlier. created_by is stamped from the JWT claim,
-- so the insert runs as that authenticated caller.
\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',false);

insert into public.inventory_items(id,item_name,category,tracking_method,unit_of_measure) values
  ('00000000-0000-0000-0000-0000009250e1','Asset Code Race Equipment','equipment','asset','unit');

reset role;
