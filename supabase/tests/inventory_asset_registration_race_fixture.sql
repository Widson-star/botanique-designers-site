-- Inventory V1 equipment-registration concurrency fixture.
-- Committed fixture rows are shared by the separate psql race sessions.
\set ON_ERROR_STOP on

insert into auth.users(id,email) values
  ('00000000-0000-0000-0000-0000000092f1','asset-race-owner@inventory.test');
insert into public.profiles(id,email,full_name,role,is_active) values
  ('00000000-0000-0000-0000-0000000092f1','asset-race-owner@inventory.test','Asset Race Owner','owner',true);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-0000000092f1',false);

insert into public.inventory_items(id,item_name,category,tracking_method,unit_of_measure) values
  ('00000000-0000-0000-0000-0000009230c1','Asset Registration Race A','equipment','asset','unit'),
  ('00000000-0000-0000-0000-0000009230c2','Asset Registration Race B','equipment','asset','unit');
