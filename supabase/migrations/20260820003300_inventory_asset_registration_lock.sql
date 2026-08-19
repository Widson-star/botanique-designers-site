-- Inventory V1 concurrency hardening: equipment registration must serialise
-- with catalogue identity/deactivation changes on the same item.
--
-- Without this lock, registration can read an active asset-tracked item while a
-- concurrent transaction changes that same catalogue row to stock-tracked or
-- inactive. Both transactions can then commit and leave an impossible asset ->
-- catalogue association. Locking the catalogue row before registration makes
-- the two operations mutually serial: whichever commits first determines the
-- state the second operation must validate against.

create or replace function public.register_equipment_asset(
  target_item_id uuid,
  target_asset_code text,
  target_ownership_type text default 'owned',
  target_condition text default 'good',
  target_site_id uuid default null,
  target_acquired_on date default null,
  target_notes text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item public.inventory_items;
  created public.equipment_assets;
  clean_code text := nullif(regexp_replace(trim(coalesce(target_asset_code, '')), '\s+', ' ', 'g'), '');
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;
  if clean_code is null then
    raise exception 'An asset code is required' using errcode = '22023';
  end if;

  -- This is the concurrency boundary. Catalogue UPDATE/deactivation also takes
  -- a row lock, so registration and catalogue identity changes cannot both
  -- validate against stale pre-commit state.
  select * into item
  from public.inventory_items
  where id = target_item_id
  for update;

  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if item.tracking_method <> 'asset' then
    raise exception 'That catalogue item is stock-tracked, so it has quantities rather than individual assets'
      using errcode = '22023';
  end if;
  if not item.is_active then
    raise exception 'That catalogue item is inactive' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_set_equipment_asset_event('registered');

  insert into public.equipment_assets (
    inventory_item_id, asset_code, ownership_type, condition,
    current_site_id, acquired_on, notes
  ) values (
    target_item_id, clean_code, coalesce(target_ownership_type, 'owned'),
    coalesce(target_condition, 'good'), target_site_id, target_acquired_on, target_notes
  ) returning * into created;

  perform public.private_clear_equipment_asset_event();
  return created;
end;
$$;
