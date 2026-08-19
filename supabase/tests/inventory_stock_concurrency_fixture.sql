-- BD-OPERATIONS-HUB-01 — Inventory V1 negative-stock concurrency fixture.
--
-- Deliberately NOT wrapped in begin/rollback: this data must be COMMITTED and
-- visible to the separate psql connections the race scripts open against the
-- same disposable cluster (see scripts/test-inventory-db.sh).
--
-- Two stock items, one per race ordering, each holding exactly 10 units at
-- the same Site. Each race then has two sessions try to take 8 out of the
-- same position at the same time. Without serialisation both would read 10,
-- both would pass the balance check, and the position would end at -6.
\set ON_ERROR_STOP on

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000091f1', 'race-owner@inventory.test');
insert into public.profiles (id, email, full_name, role, is_active) values
  ('00000000-0000-0000-0000-0000000091f1', 'race-owner@inventory.test', 'Race Owner', 'owner', true);

insert into public.projects (
  id, project_name, client_site_name, project_type, status, stage, archived,
  lead_person_id, portfolio_eligible, portfolio_permission_status
) values
  ('00000000-0000-0000-0000-0000009110a1', 'Inventory Race Project', 'Race Property', 'Residential', 'Ongoing', 'Implementation', false,
   '00000000-0000-0000-0000-0000000091f1', false, 'Not Reviewed');

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000091f1', false);

insert into public.inventory_items (id, item_name, category, tracking_method, unit_of_measure) values
  ('00000000-0000-0000-0000-0000009130c1', 'Race Consumable A', 'consumables', 'stock', 'unit'),
  ('00000000-0000-0000-0000-0000009130c2', 'Race Consumable B', 'consumables', 'stock', 'unit');

-- 10 units of each, at the Race Project's Site.
select public.record_stock_receipt(
  '00000000-0000-0000-0000-0000009130c1'::uuid, 10,
  (select site_id from public.projects where id = '00000000-0000-0000-0000-0000009110a1')
);
select public.record_stock_receipt(
  '00000000-0000-0000-0000-0000009130c2'::uuid, 10,
  (select site_id from public.projects where id = '00000000-0000-0000-0000-0000009110a1')
);
