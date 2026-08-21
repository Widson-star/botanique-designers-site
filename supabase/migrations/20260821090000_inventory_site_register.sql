-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Inventory Site register
-- =====================================================================
-- Forward correction. The consolidated Inventory foundation
-- (20260819220000_inventory_tools_equipment_v1, production version
-- 20260820071700) is ALREADY APPLIED and is not touched by this file.
--
-- THE DEFECT THIS CLOSES. The Tools & Equipment UI derived which Sites may be
-- chosen for a new Inventory action by reading public.projects and
-- public.maintenance_relationships directly through PostgREST. The maintenance
-- read is portfolio-wide, but the Projects read is NOT: since
-- operations_hub_project_material_change_approvals, the projects SELECT policy
-- is
--
--   is_owner() or is_assigned_to_project(id) or (is_manager() and lead_person_id = auth.uid())
--
-- so an Operations Manager sees only the Projects they lead or are assigned to.
-- Inventory V1 deliberately grants the Operations Manager FULL PORTFOLIO
-- authority — its own RPCs accept any existing Site — so deriving eligibility
-- from a manager-scoped Projects read silently hid perfectly valid operational
-- Sites from exactly the person who runs the portfolio. A Manager could not
-- register, issue or receive equipment at an ongoing Site simply because
-- somebody else leads that Project.
--
-- THE FIX. Eligibility becomes an Inventory-owned server-side read model.
-- Because it is SECURITY DEFINER it evaluates the Project and Maintenance
-- questions with the definer's rights rather than the caller's, so the answer
-- reflects INVENTORY authority instead of inheriting another domain's ACL. The
-- Inventory role check inside the function is what keeps that safe: it is the
-- gate, not the surrounding RLS.
--
-- Nothing here widens ordinary Project or Maintenance access: the function
-- returns Sites and a boolean, never Project or Maintenance rows.
--
-- This migration adds ONE function. It creates no table, alters no table, adds
-- no column, seeds nothing and deletes nothing.

-- Every Site, plus whether it may be chosen for a NEW Inventory action.
--
-- ALL Sites are returned, always, so the interface can keep resolving the name
-- of any Site an existing record points at — an asset or movement that refers
-- to a Site whose Project closed years ago must still read back correctly.
-- Only `is_selectable` narrows, and it narrows on operational state:
--
--   A. the Site hosts a live Botanique Project — not archived, status Ongoing
--   B. the Site has an active Maintenance relationship
--   C. Inventory physical truth is already there — an equipment asset is
--      positioned at it, or it holds a NON-ZERO derived stock position
--
-- (C) is what keeps the system honest about what it already holds: a mower left
-- at a Site whose Project has since closed must remain returnable and
-- transferable, and stock sitting somewhere must remain movable. It is derived
-- from the movement ledger every time — there is no stored balance, and "this
-- Site once had a movement" is deliberately NOT sufficient, so a position that
-- reconciles back to zero stops qualifying through stock truth.
--
-- No Site name and no identifier is special-cased. Archived test fixtures and
-- archived duplicates fall out because they are archived, not because anything
-- recognises them; renaming one would change nothing.
create or replace function public.inventory_site_register()
returns table (
  id uuid,
  site_name text,
  location text,
  county text,
  is_selectable boolean
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    s.id,
    s.site_name,
    s.location,
    s.county,
    (
      exists (
        select 1 from public.projects p
        where p.site_id = s.id
          and p.archived = false
          and p.status = 'Ongoing'
      )
      or exists (
        select 1 from public.maintenance_relationships r
        where r.site_id = s.id
          and r.status = 'active'
      )
      -- An asset only ever carries a Site while it is genuinely positioned
      -- there: the equipment_asset_terminal_position and
      -- equipment_asset_repair_position constraints force current_site_id null
      -- for lost, retired and under-repair assets.
      or exists (
        select 1 from public.equipment_assets a
        where a.current_site_id = s.id
      )
      or exists (
        select 1
        from (
          select distinct m.inventory_item_id
          from public.inventory_stock_movements m
          where m.from_site_id = s.id or m.to_site_id = s.id
        ) held
        where public.private_inventory_stock_balance(held.inventory_item_id, s.id) <> 0
      )
    ) as is_selectable
  from public.sites s
  -- The Inventory role gate. Staff and viewer hold no Inventory capability, so
  -- they receive no rows at all — the same shape inventory_stock_position()
  -- already uses, and the same reason: this is a read model, so returning
  -- nothing composes better than raising, and leaks nothing either way.
  where public.private_inventory_role() is not null
  order by s.site_name, s.location nulls last
$$;

revoke execute on function public.inventory_site_register() from public, anon;
grant execute on function public.inventory_site_register() to authenticated;
