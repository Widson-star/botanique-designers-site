-- Inventory V1 hardening: deactivation invariants belong at the table boundary.
--
-- The Principal is allowed to perform exceptional catalogue changes, but even
-- the Principal must not be able to strand physical truth by manually setting
-- the internal change marker and issuing a raw UPDATE. The marker describes an
-- authorised change; it does not waive the business invariant.

create or replace function public.tg_inventory_item_identity_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.inventory_item_controlled_change', true), ''),
    'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.inventory_item_change_reason', true), ''
  )), '');
  has_history boolean := public.private_inventory_item_has_history(old.id);
  is_principal boolean := public.private_inventory_is_principal();
  unresolved_assets integer := 0;
  has_live_stock boolean := false;
begin
  -- The custom marker can never manufacture authority.
  if controlled and not is_principal then
    raise exception 'Only the Principal can perform a controlled catalogue correction'
      using errcode = '42501';
  end if;

  if controlled and supplied_reason is null then
    raise exception 'A reason is required for a controlled catalogue change'
      using errcode = '22023';
  end if;

  if new.is_active is distinct from old.is_active then
    if not controlled or not is_principal then
      raise exception 'Use the Principal deactivate or reactivate action to change catalogue availability'
        using errcode = '42501';
    end if;

    -- Deactivation is exceptional but never allowed to hide unresolved
    -- physical truth, regardless of whether the caller reached the row through
    -- the intended RPC or a manually-forged session marker.
    if old.is_active and not new.is_active then
      if old.tracking_method = 'asset' then
        select count(*) into unresolved_assets
        from public.equipment_assets a
        where a.inventory_item_id = old.id
          and a.status <> 'retired';

        if unresolved_assets > 0 then
          raise exception 'This item still has unresolved equipment assets. Resolve or retire them first.'
            using errcode = '22023';
        end if;
      else
        select exists (
          select 1
          from (
            select m.from_site_id as site_id
            from public.inventory_stock_movements m
            where m.inventory_item_id = old.id
            union
            select m.to_site_id as site_id
            from public.inventory_stock_movements m
            where m.inventory_item_id = old.id
          ) positions
          where public.private_inventory_stock_balance(old.id, positions.site_id) <> 0
        ) into has_live_stock;

        if has_live_stock then
          raise exception 'This stock item still has quantity on hand. Reconcile every position to zero first.'
            using errcode = '22023';
        end if;
      end if;
    end if;
  end if;

  if has_history then
    if new.tracking_method is distinct from old.tracking_method then
      raise exception 'This item already has operational history; create a new catalogue item for a different tracking method'
        using errcode = '22023';
    end if;

    if new.unit_of_measure is distinct from old.unit_of_measure then
      raise exception 'This item already has operational history; create a new catalogue item for a different unit'
        using errcode = '22023';
    end if;

    if (new.item_name is distinct from old.item_name
        or new.category is distinct from old.category)
       and (not controlled or not is_principal) then
      raise exception 'Only the Principal can make a reasoned identity correction after operational history exists'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;
