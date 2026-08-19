-- Inventory V1 hardening follow-up: close two lifecycle edge cases found while
-- writing the independent regression suite. Still pre-production and additive.

-- An asset may be truthfully registered as available at a Site. Issuing it is
-- the lifecycle change from available -> issued; the optional Project or
-- Maintenance context describes the destination Site, regardless of where the
-- available asset happened to be before issue.
create or replace function public.issue_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_site_id uuid default null,
  target_custodian_person_id uuid default null,
  target_expected_return_date date default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  note text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status <> 'available' then
    raise exception 'Only available equipment can be issued' using errcode = '22023';
  end if;
  if target_site_id is null then
    raise exception 'A Site is required when equipment is issued' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_inventory_context(
    target_project_id, target_maintenance_visit_id, target_site_id
  );

  perform public.private_set_equipment_asset_event(
    'issued', null, note, target_project_id, target_maintenance_visit_id
  );

  update public.equipment_assets
  set status = 'issued',
      current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id = existing.id and version = expected_version
  returning * into existing;

  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

-- Equipment transfer may change Site, custodian, or both. Unlike quantity
-- stock, individually tracked equipment has a custody dimension, so a same-Site
-- hand-over between two People is a legitimate transfer event.
create or replace function public.transfer_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_site_id uuid default null,
  target_custodian_person_id uuid default null,
  target_expected_return_date date default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  note text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status <> 'issued' then
    raise exception 'Only issued equipment can be transferred' using errcode = '22023';
  end if;
  if target_site_id is null then
    raise exception 'A destination Site is required' using errcode = '22023';
  end if;
  if target_site_id is not distinct from existing.current_site_id
     and target_custodian_person_id is not distinct from existing.current_custodian_person_id then
    raise exception 'A transfer must change the Site, the custodian, or both' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);
  perform public.private_assert_inventory_context(
    target_project_id, target_maintenance_visit_id, target_site_id
  );

  perform public.private_set_equipment_asset_event(
    'transferred', null, note, target_project_id, target_maintenance_visit_id
  );

  update public.equipment_assets
  set current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id = existing.id and version = expected_version
  returning * into existing;

  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

-- A repair completion must state the observed resulting condition. The asset
-- returns to an explicit Site or to NULL (Botanique custody); no workshop/store
-- Site is invented.
create or replace function public.return_equipment_asset_from_repair(
  target_asset_id uuid,
  expected_version integer,
  target_condition text default null,
  target_site_id uuid default null,
  note text default null
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status <> 'under_repair' then
    raise exception 'This asset is not under repair' using errcode = '22023';
  end if;
  if target_condition is null or nullif(trim(target_condition), '') is null then
    raise exception 'Record the equipment condition when it returns from repair' using errcode = '22023';
  end if;

  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_set_equipment_asset_event('returned_from_repair', null, note);

  update public.equipment_assets
  set status = 'available',
      current_site_id = target_site_id,
      current_custodian_person_id = null,
      expected_return_date = null,
      condition = target_condition
  where id = existing.id and version = expected_version
  returning * into existing;

  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;
