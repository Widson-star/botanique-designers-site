-- =====================================================================
-- BD-OPERATIONS-HUB-01 — Inventory / Tools & Equipment V1 (database only)
-- =====================================================================
-- Authorised implementation tranche, 19 August 2026. Builds ONLY the
-- database foundation for Operations > Tools & Equipment. It adds NO
-- navigation entry, NO route, NO React provider, NO component and NO seed
-- row. The destination stays invisible until a separate, explicitly
-- authorised UI tranche exposes it.
--
-- CONSOLIDATED 20 August 2026, before any hosted application. Control review of
-- PR #149 produced four correction migrations, and a Codex P1 produced a fifth.
-- None of the five was ever applied to production — verified against
-- supabase_migrations.schema_migrations, which still ends at
-- 20260819100629 / maintenance_execution_link_integrity. They are therefore
-- folded into this one file so production receives the FINAL DESIGN as a single
-- coherent initial authority, rather than replaying five historical correction
-- steps in which the second reverses a deadlock the first would have
-- introduced and the third rewrites a trigger the first had just written. This
-- is the same treatment operations_hub_maintenance_v1 received before its own
-- first apply.
--
-- What the corrections settled, now materialised directly below:
--
--   1. The custom marker is not authority. app.inventory_item_controlled_change
--      says HOW a change is being made and never WHO may make it; sensitive
--      catalogue changes require the marker AND the caller's real Principal
--      role AND a reason. Deactivation invariants sit on the table itself, so
--      even a Principal forging the marker cannot strand physical truth.
--   2. Deactivation cannot hide anything unresolved: any non-retired asset
--      blocks it (a LOST asset is an open exception, not a resolved one), and
--      so does any non-zero stock position anywhere, Botanique custody
--      included.
--   3. Movement labels mean exactly one thing each, and optional Project /
--      Maintenance context must match the ONE operational Site of the event
--      rather than either endpoint.
--   4. Category and unit of measure are extensible normalised tokens, not a
--      taxonomy frozen from an illustrative composition.
--   5. Repair leaves no false physical position, and registration locks the
--      catalogue row so an asset can never attach to an item that is
--      concurrently deactivated or flipped to stock tracking — the Codex P1,
--      whose damage would have been permanent, because the new asset makes the
--      item history-bearing and the history guard then freezes tracking_method
--      against everyone.
--
-- Two remnants of that history are deliberately NOT reproduced here: the dead
-- four-argument private_assert_inventory_context overload, superseded by the
-- three-argument operational-Site form, and the weaker
-- equipment_asset_issued_position constraint, superseded by
-- equipment_asset_issued_site.
--
-- SETTLED PRODUCT MODEL (Founder-approved, recorded in
-- docs/ui-authority/operations-hub/INVENTORY-TOOLS-EQUIPMENT-V1.md):
--
--   one shared catalogue (public.inventory_items)
--        |
--        +-- tracking_method = 'asset'
--        |      -> public.equipment_assets          (individual identity)
--        |      -> public.equipment_asset_events    (immutable history)
--        |
--        +-- tracking_method = 'stock'
--               -> public.inventory_stock_movements (immutable ledger)
--               -> derived position, never a stored quantity
--
-- A lawn mower and fifty irrigation fittings share a catalogue, not a
-- record type. The mower is one asset with a custodian, a condition and a
-- position; the fittings are a quantity that only exists as the sum of its
-- movements.
--
-- MAINTENANCE IS NOT THIS DOMAIN. Working-authority image 11 draws
-- Maintenance and Tools & Equipment on one page. That is composition
-- guidance only: the Founder settled on 9 August 2026 that they "remain two
-- distinct Operations capabilities" (working-authority/README.md tension 3,
-- operating-model-authority/decision-record.md addendum 3). This migration
-- therefore adds NOTHING to any maintenance_* table and merges no schema.
-- It only READS public.maintenance_visits when a caller volunteers a visit
-- as optional context.
--
-- DOMAIN BOUNDARY — Operations owns the physical truth, Finance owns the
-- money. Per decision-record.md ("Finance-to-inventory handoff"), Finance
-- records supplier, price, currency, purchase cost, expense, approval and
-- payment exactly once. Nothing in this migration stores any of them:
-- there is no supplier, cost, price, currency, invoice, depreciation,
-- warranty or accounting-value column anywhere below, and no foreign key to
-- any Finance table. The acquisition -> inventory hand-off (one Finance
-- acquisition creating several Inventory units) is deliberately DEFERRED,
-- because the Company Expense acquisition truth it would hang from is not
-- yet complete.
--
-- SITE IS THE PRIMARY PHYSICAL CONTEXT, and Project is optional. Equipment
-- and stock reference public.sites directly, never public.projects, so a
-- maintenance-only Site — a Site with no Botanique Project at all — is a
-- fully usable position. No Project is ever fabricated to hold inventory.
-- Project and Maintenance Visit exist only as optional context explaining
-- WHY a movement happened, and are validated against the Site when given.
--
-- PEOPLE SUPPLIES CUSTODY IDENTITY. Custodians are public.people rows, not
-- public.profiles rows: a site technician who legitimately holds a
-- generator does not need Operations Hub login access, and the business
-- identity of a custodian must not be tied to portal authentication.
-- public.profiles still appears, as everywhere else in this repository,
-- only as the *actor* who recorded something.
--
-- WHAT THIS MIGRATION DOES NOT DO: it creates no supplier, procurement,
-- purchase-order, price, depreciation, warranty, repair-billing, reservation,
-- barcode, attachment, photo, batch/lot, bin-location, reorder-purchasing,
-- alert, report or UI object; it adds no column to public.projects,
-- public.sites, public.people, public.profiles, public.daily_site_entries or
-- any maintenance_* table; it alters no existing table, policy, function or
-- trigger; and it inserts not one row. It is purely additive.
--
-- AUTHORITY MODEL — V1, deliberately narrow:
--   owner  (Principal)          full portfolio Inventory, plus the three
--                               exceptional powers: catalogue identity
--                               correction/deactivation, asset correction
--                               and retirement, and stock-taking adjustment.
--   manager(Operations Manager) full portfolio Inventory and every ordinary
--                               operation: create catalogue items, register
--                               equipment, receive, issue, transfer, return,
--                               consume, update condition, report damage and
--                               loss, send for and return from repair.
--   staff  (Project Team)       NOTHING. No read, no write. Acknowledgement
--                               and receipt workflows are deferred.
--   viewer (Read-only)          NOTHING. "Viewer" sounding read-only does not
--                               make Inventory visible to it in V1.
-- Inventory is a PORTFOLIO register, so it follows the portfolio-wide shape
-- of public.people (private_active_people_role) rather than the
-- project-scoped shape of Daily Site Operations. No new access path is
-- invented.
--
-- CONCURRENCY AND AUDIT: every mutable table carries `version integer not
-- null default 1`, bumped by a BEFORE trigger that also forces
-- created_by/updated_by/created_at/updated_at from auth.uid()/now(), so a
-- client can never spoof any of the four. Every asset lifecycle action is a
-- SECURITY DEFINER RPC that locks the row `for update`, compares the
-- caller's expected_version and raises errcode 40001 on a stale write — the
-- shape already proven across cost claims, fund requests, releases,
-- people-engagement corrections and Maintenance.

create extension if not exists pgcrypto;

-- =====================================================================
-- 1. Tables
-- =====================================================================

-- A. inventory_items — the ONE shared catalogue. "What kind of thing is
--    this?", asked once, for both asset-tracked and stock-tracked items.
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),

  item_name text not null check (char_length(trim(item_name)) between 2 and 160),

  -- A closed vocabulary so the register reads at a glance. The first six
  -- values are the categories the Founder's own working-authority image 11
  -- composition uses; the last four exist because that image is
  -- asset-oriented and stock-tracked things (irrigation fittings, cement,
  -- fertiliser) need a home. 'other' is the escape hatch, explained in
  -- `notes` rather than by inventing a free-text sibling column.
  -- Bounded, normalised, EXTENSIBLE — deliberately not a closed enumeration.
  --
  -- The Founder approved one catalogue, asset-versus-stock tracking, and unit of
  -- measure as a business attribute. The Founder did NOT approve a category
  -- taxonomy, and working-authority image 11 is composition guidance with
  -- illustrative content, not domain authority. Freezing its visible chips into
  -- a CHECK would have made every future landscaping category — hardscape
  -- materials, plant stock, irrigation controllers — a schema migration.
  --
  -- Integrity comes from normalisation instead: the audit trigger lower-cases
  -- and collapses whitespace to underscores, and this constraint holds the
  -- result to a canonical token, so "Power Tools", "power  tools" and
  -- "POWER_TOOLS" are one category with no lookup table to administer.
  category text not null constraint inventory_items_category_format check (
    char_length(category) between 2 and 80
    and category = lower(category)
    and category ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),

  -- FUNDAMENTAL IDENTITY, not a preference. It decides which truth model the
  -- item lives under for the rest of its life: an individually identifiable
  -- asset with custody and condition, or a quantity that exists only as the
  -- sum of its movements. The identity guard below freezes it the moment the
  -- item has any operational history.
  tracking_method text not null check (tracking_method in ('asset', 'stock')),

  -- Extensible for the same reason. A landscaping operation measures in cubic
  -- metres of topsoil, rolls of turf, trays of seedlings and lengths of edging;
  -- no list written today survives the next season. Normalised identically.
  --
  -- The ONE structural rule kept is below: an individually tracked asset is
  -- counted in individual units, and `unit` is the settled canonical name for
  -- that. It is the only unit value the schema knows by name.
  unit_of_measure text not null constraint inventory_items_unit_of_measure_format check (
    char_length(unit_of_measure) between 1 and 40
    and unit_of_measure = lower(unit_of_measure)
    and unit_of_measure ~ '^[a-z0-9]+(_[a-z0-9]+)*$'
  ),

  -- Deactivation, never deletion. An item Botanique stops carrying is made
  -- inactive so its history stays readable and every asset and movement that
  -- refers to it keeps resolving.
  is_active boolean not null default true,

  notes text null check (notes is null or char_length(notes) <= 2000),

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An individually tracked asset is counted in units. This forbids the
  -- nonsense of "3.5 litres of lawn mower" structurally rather than by
  -- convention.
  constraint inventory_item_asset_unit check (
    tracking_method <> 'asset' or unit_of_measure = 'unit'
  )
);

-- One catalogue entry per item name. A shared catalogue that holds two
-- "Wheelbarrow" rows is not a shared catalogue.
create unique index inventory_items_name_unique
  on public.inventory_items (lower(trim(item_name)));

create index inventory_items_category_idx
  on public.inventory_items (category, is_active, lower(trim(item_name)));
create index inventory_items_tracking_idx
  on public.inventory_items (tracking_method, is_active);

-- Immutable catalogue history. Small, but real: catalogue identity is
-- Principal-corrected rather than freely edited once history exists, and a
-- correction that leaves no trace is not a correction.
create table public.inventory_item_events (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,
  event_type text not null check (event_type in (
    'created', 'updated', 'corrected', 'deactivated', 'reactivated'
  )),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb not null check (jsonb_typeof(new_snapshot) = 'object'),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 1000),
  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  resulting_version integer not null check (resulting_version > 0)
);

create index inventory_item_events_item_idx
  on public.inventory_item_events (inventory_item_id, occurred_at, resulting_version);

-- B. equipment_assets — one physically identifiable, reusable thing.
--    Its row is a CURRENT-POSITION SNAPSHOT. The truth of how it got there
--    lives in equipment_asset_events, and the two are written in the same
--    transaction by a trigger, never by RPC discipline alone.
create table public.equipment_assets (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,

  -- The stable Botanique identity stencilled on the thing itself. Free-form
  -- because Botanique's existing equipment already carries whatever it
  -- carries; unique, case- and space-insensitively, because two assets with
  -- one code is two assets nobody can tell apart.
  asset_code text not null check (char_length(trim(asset_code)) between 1 and 64),

  ownership_type text not null default 'owned'
    check (ownership_type in ('owned', 'hired', 'borrowed')),

  -- Operational state and physical condition are two different questions and
  -- get two different columns. A damaged mower can still be at a site; a
  -- good mower can be lost. Overloading them into one field would make both
  -- unanswerable.
  status text not null default 'available'
    check (status in ('available', 'issued', 'under_repair', 'lost', 'retired')),
  condition text not null default 'good'
    check (condition in ('good', 'fair', 'damaged', 'unserviceable')),

  -- Current position. A NULL site means Botanique custody rather than a
  -- fabricated "Main Store" / warehouse / office record — see the stock
  -- ledger's position semantics below, which use the identical convention.
  current_site_id uuid null references public.sites(id) on delete restrict,

  -- Custody is a PERSON, from public.people. Never a profile: a legitimate
  -- custodian does not need Operations Hub login access.
  current_custodian_person_id uuid null references public.people(id) on delete restrict,

  expected_return_date date null,

  -- Optional and genuinely optional. Registering equipment Botanique has
  -- owned for years must never require inventing an acquisition date, and
  -- this column holds no cost, supplier or payment fact — only a date.
  acquired_on date null,

  notes text null check (notes is null or char_length(notes) <= 2000),

  version integer not null default 1 check (version > 0),
  created_by uuid not null references public.profiles(id) on delete restrict,
  updated_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- An issued asset is somewhere or with someone; "issued to nobody, nowhere"
  -- is not a position.
  -- Issued means out AT A SITE, mirroring stock exactly. "Issued to a person at
  -- no place" is not a position, so a custodian alone does not satisfy it.
  constraint equipment_asset_issued_site check (
    status <> 'issued' or current_site_id is not null
  ),
  -- Custody exists only while the thing is out. An available, repairing, lost
  -- or retired asset is in nobody's hands.
  constraint equipment_asset_custodian_status check (
    current_custodian_person_id is null or status = 'issued'
  ),
  -- An expected return date only means anything while the thing is out.
  constraint equipment_asset_expected_return check (
    expected_return_date is null or status = 'issued'
  ),
  -- Away for repair is not at a client Site. Enforced structurally so no action
  -- can leave an asset claiming to be in a garden it was collected from; the
  -- originating Site lives on in the 'sent_for_repair' event snapshot.
  constraint equipment_asset_repair_position check (
    status <> 'under_repair'
    or (current_site_id is null
        and current_custodian_person_id is null
        and expected_return_date is null)
  ),
  -- Lost and retired are terminal: the asset has no current position at all.
  -- Where it was last seen is not erased — it is preserved in the
  -- previous_snapshot of the 'lost'/'retired' event, which is the immutable
  -- record built for exactly this.
  constraint equipment_asset_terminal_position check (
    status not in ('lost', 'retired')
    or (current_site_id is null
        and current_custodian_person_id is null
        and expected_return_date is null)
  )
);

create unique index equipment_assets_code_unique
  on public.equipment_assets (upper(regexp_replace(trim(asset_code), '\s+', ' ', 'g')));

create index equipment_assets_item_idx on public.equipment_assets (inventory_item_id, status);
create index equipment_assets_site_idx on public.equipment_assets (current_site_id, status);
create index equipment_assets_custodian_idx on public.equipment_assets (current_custodian_person_id, status);
create index equipment_assets_status_idx on public.equipment_assets (status, condition);

-- Immutable asset history. Every material transition appends exactly one row
-- carrying the full before and after state, so any position the register
-- shows can be explained without trusting the snapshot.
create table public.equipment_asset_events (
  id uuid primary key default gen_random_uuid(),
  equipment_asset_id uuid not null references public.equipment_assets(id) on delete restrict,
  event_type text not null check (event_type in (
    'registered', 'issued', 'transferred', 'returned', 'condition_changed',
    'sent_for_repair', 'returned_from_repair', 'lost', 'retired', 'corrected'
  )),
  previous_snapshot jsonb null check (previous_snapshot is null or jsonb_typeof(previous_snapshot) = 'object'),
  new_snapshot jsonb not null check (jsonb_typeof(new_snapshot) = 'object'),
  reason text null check (reason is null or char_length(trim(reason)) between 1 and 1000),
  note text null check (note is null or char_length(note) <= 1000),

  -- Optional context explaining WHY, never where. Site and custodian are
  -- already in both snapshots; these two are per-event facts that exist
  -- nowhere on the asset row.
  project_id uuid null references public.projects(id) on delete restrict,
  maintenance_visit_id uuid null references public.maintenance_visits(id) on delete restrict,

  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),
  resulting_version integer not null check (resulting_version > 0),

  -- The two exceptional events must say why they happened.
  constraint equipment_asset_event_reason check (
    event_type not in ('lost', 'retired', 'corrected')
    or (reason is not null and char_length(trim(reason)) between 1 and 1000)
  )
);

create index equipment_asset_events_asset_idx
  on public.equipment_asset_events (equipment_asset_id, occurred_at, resulting_version);
create index equipment_asset_events_project_idx
  on public.equipment_asset_events (project_id) where project_id is not null;
create index equipment_asset_events_visit_idx
  on public.equipment_asset_events (maintenance_visit_id) where maintenance_visit_id is not null;

-- C. inventory_stock_movements — the ONLY source of quantity truth.
--
-- There is deliberately no "current quantity" column anywhere in this
-- migration. An operator can never silently change 50 to 33; they record
-- what happened, and the position follows. Every quantity is POSITIVE and
-- the movement TYPE decides direction, so no arbitrary signed edit exists
-- to abuse.
--
-- POSITION SEMANTICS — explicit, because a nullable Site is only acceptable
-- if it is unambiguous. A "position" is either a Site, or NULL meaning
-- Botanique custody (equipment and stock held by Botanique but not at a
-- client Site). No fake "Main Store", warehouse, office or storage-location
-- row is created to stand in for it. The movement type says which of the two
-- columns is a position and which is structurally unused:
--
--   type              from_site_id            to_site_id              effect
--   received          FORCED NULL (unused)    position                + at to
--   adjustment_in     FORCED NULL (unused)    position                + at to
--   issued            FORCED NULL (custody)   Site, REQUIRED          - custody, + Site
--   transferred       Site, REQUIRED          different Site, REQ'D   - from, + to
--   returned          Site, REQUIRED          FORCED NULL (custody)   - Site, + custody
--   consumed          position                FORCED NULL (unused)    - at from
--   damaged           position                FORCED NULL (unused)    - at from
--   lost              position                FORCED NULL (unused)    - at from
--   adjustment_out    position                FORCED NULL (unused)    - at from
--
-- So "both columns NULL" is never ambiguous: for a one-sided type the unused
-- column is constrained NULL and the other NULL means Botanique custody; for
-- a two-sided type both are positions and the constraint forces them to
-- differ, so a movement can never be a no-op against itself.
create table public.inventory_stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items(id) on delete restrict,

  movement_type text not null check (movement_type in (
    'received', 'issued', 'transferred', 'returned',
    'consumed', 'damaged', 'lost',
    'adjustment_in', 'adjustment_out'
  )),

  -- Always positive. Direction is the type's job, never the sign's.
  quantity numeric(14, 3) not null check (quantity > 0),

  from_site_id uuid null references public.sites(id) on delete restrict,
  to_site_id uuid null references public.sites(id) on delete restrict,

  -- Optional: who received or used it. public.people, for the same reason
  -- custody is people — no portal account required.
  person_id uuid null references public.people(id) on delete restrict,

  -- Optional context explaining WHY. Never mandatory, and validated against
  -- the movement's own Site positions when supplied.
  project_id uuid null references public.projects(id) on delete restrict,
  maintenance_visit_id uuid null references public.maintenance_visits(id) on delete restrict,

  reason text null check (reason is null or char_length(trim(reason)) between 1 and 1000),
  note text null check (note is null or char_length(note) <= 1000),

  actor_profile_id uuid not null references public.profiles(id) on delete restrict,
  occurred_at timestamptz not null default now(),

  -- Each label means ONE thing, and the schema enforces which. A generic
  -- "the two ends differ" rule would let 'issued' describe a Site-to-Site move
  -- and 'transferred' describe a return to the store, which makes the
  -- vocabulary decorative. The settled meanings:
  --
  --   issued      Botanique custody -> a Site
  --   transferred Site A            -> a different Site B
  --   returned    a Site            -> Botanique custody
  constraint inventory_stock_movement_sides check (
    case movement_type
      when 'received'       then from_site_id is null
      when 'adjustment_in'  then from_site_id is null
      when 'issued'         then from_site_id is null and to_site_id is not null
      when 'transferred'    then from_site_id is not null and to_site_id is not null
                                   and from_site_id is distinct from to_site_id
      when 'returned'       then from_site_id is not null and to_site_id is null
      when 'consumed'       then to_site_id is null
      when 'damaged'        then to_site_id is null
      when 'lost'           then to_site_id is null
      when 'adjustment_out' then to_site_id is null
      else false
    end
  ),
  -- Stock that shrinks for a reason other than ordinary use, and every
  -- stock-taking correction, must say why.
  constraint inventory_stock_movement_reason check (
    movement_type not in ('adjustment_in', 'adjustment_out', 'damaged', 'lost')
    or (reason is not null and char_length(trim(reason)) between 1 and 1000)
  )
);

create index inventory_stock_movements_item_idx
  on public.inventory_stock_movements (inventory_item_id, occurred_at, id);
create index inventory_stock_movements_from_idx
  on public.inventory_stock_movements (inventory_item_id, from_site_id);
create index inventory_stock_movements_to_idx
  on public.inventory_stock_movements (inventory_item_id, to_site_id);
create index inventory_stock_movements_project_idx
  on public.inventory_stock_movements (project_id) where project_id is not null;
create index inventory_stock_movements_visit_idx
  on public.inventory_stock_movements (maintenance_visit_id) where maintenance_visit_id is not null;
create index inventory_stock_movements_person_idx
  on public.inventory_stock_movements (person_id) where person_id is not null;

-- =====================================================================
-- 2. Authority helpers
-- =====================================================================

-- Inventory is a PORTFOLIO register, so this mirrors
-- private_active_people_role() exactly rather than inventing an access path.
-- staff and viewer match nothing here and therefore see nothing at all.
create or replace function public.private_inventory_role()
returns text
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid() and p.is_active
    and p.role in ('owner', 'manager')
$$;

-- The three exceptional powers — catalogue identity correction/deactivation,
-- asset correction and retirement, stock-taking adjustment — are the
-- Principal's alone.
create or replace function public.private_inventory_is_principal()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select public.private_inventory_role() = 'owner'
$$;

-- "Does this catalogue item already have operational history?" — the single
-- question that decides whether identity is still freely editable or has
-- become a Principal-only correction.
create or replace function public.private_inventory_item_has_history(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (select 1 from public.equipment_assets a where a.inventory_item_id = target_item_id)
      or exists (select 1 from public.inventory_stock_movements m where m.inventory_item_id = target_item_id)
$$;

-- Optional Project / Maintenance Visit context integrity, shared by every
-- asset action and every stock movement so the rule cannot drift between
-- them.
--
-- The rule: optional context must AGREE with the Site the action actually
-- touched. A caller may name a Project only if that Project's Site is one of
-- the movement's own positions, and a Maintenance Visit only if that visit's
-- Site is. This is what stops an Alego Usonga Project being attached to
-- equipment issued to an unrelated Site. Nothing here special-cases any real
-- named Project or Site: the generic Site/Project/Maintenance architecture
-- established by site_project_lifecycle_foundation and
-- site_owned_maintenance_core is the whole of the rule.
--
-- Both positions may legitimately be NULL (Botanique custody with no Site at
-- either end). Context is then refused rather than silently accepted,
-- because there is no Site for it to agree with.
create or replace function public.private_assert_inventory_context(target_project_id uuid, target_maintenance_visit_id uuid, operational_site_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  context_project public.projects;
  context_visit public.maintenance_visits;
  visit_site_id uuid;
begin
  if target_project_id is not null then
    if operational_site_id is null then raise exception 'Project context requires a Site' using errcode = '22023'; end if;
    select * into context_project from public.projects where id = target_project_id;
    if not found then raise exception 'Project not found' using errcode = 'P0002'; end if;
    if context_project.site_id is distinct from operational_site_id then raise exception 'That Project belongs to a different Site' using errcode = '22023'; end if;
  end if;
  if target_maintenance_visit_id is not null then
    if operational_site_id is null then raise exception 'Maintenance context requires a Site' using errcode = '22023'; end if;
    select * into context_visit from public.maintenance_visits where id = target_maintenance_visit_id;
    if not found then raise exception 'Maintenance visit not found' using errcode = 'P0002'; end if;
    select r.site_id into visit_site_id from public.maintenance_relationships r where r.id = context_visit.maintenance_relationship_id;
    if visit_site_id is null then raise exception 'Maintenance visit Site not found' using errcode = 'P0002'; end if;
    if visit_site_id is distinct from operational_site_id then raise exception 'That Maintenance visit belongs to a different Site' using errcode = '22023'; end if;
  end if;
end;
$$;

-- Shared validation for the optional person and site references, so every
-- caller rejects the same things for the same reasons.
create or replace function public.private_assert_inventory_site(target_site_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
begin
  if target_site_id is null then
    return;
  end if;
  if not exists (select 1 from public.sites s where s.id = target_site_id) then
    raise exception 'Site not found' using errcode = 'P0002';
  end if;
end;
$$;

create or replace function public.private_assert_inventory_person(target_person_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  target public.people;
begin
  if target_person_id is null then
    return;
  end if;
  select * into target from public.people where id = target_person_id;
  if not found then
    raise exception 'Person not found' using errcode = 'P0002';
  end if;
  if not target.is_active then
    raise exception 'That person is no longer active' using errcode = '22023';
  end if;
end;
$$;

-- =====================================================================
-- 3. Catalogue triggers — audit, identity guard, event ledger
-- =====================================================================

create or replace function public.tg_audit_inventory_items()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    new.is_active := true;
  else
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.item_name := regexp_replace(trim(new.item_name), '[[:space:]]+', ' ', 'g');
  new.category := lower(regexp_replace(trim(new.category), '[[:space:]]+', '_', 'g'));
  new.unit_of_measure := lower(regexp_replace(trim(new.unit_of_measure), '[[:space:]]+', '_', 'g'));
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create trigger inventory_items_audit
before insert or update on public.inventory_items
for each row execute function public.tg_audit_inventory_items();

-- Catalogue identity guard.
--
-- Before an item has any operational history it is still just a draft
-- catalogue row: an Operations Manager may fix a typo, a wrong category, a
-- wrong unit or a wrong tracking method freely. The moment an asset is
-- registered against it or a single movement is recorded, identity hardens:
--
--   * tracking_method and unit_of_measure become IMMUTABLE outright, for
--     nobody, including the Principal. Flipping asset <-> stock beneath
--     existing assets or movements would orphan them, and changing the unit
--     would silently re-denominate every quantity already recorded. That is
--     a data-integrity impossibility, not an authority question, so it is
--     refused with a message that says what to do instead.
--   * item_name and category become Principal-only, through
--     correct_inventory_item_identity(), which demands a reason.
--
-- is_active is never changed by a direct UPDATE at all, at any point.
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

create trigger inventory_items_identity_guard
before update on public.inventory_items
for each row execute function public.tg_inventory_item_identity_guard();

create or replace function public.tg_record_inventory_item_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.inventory_item_controlled_change', true), ''), 'false'
  )::boolean;
  supplied_reason text := nullif(trim(coalesce(
    current_setting('app.inventory_item_change_reason', true), ''
  )), '');
  next_event_type text;
begin
  if tg_op = 'INSERT' then
    next_event_type := 'created';
  elsif controlled and new.is_active and not old.is_active then
    next_event_type := 'reactivated';
  elsif controlled and old.is_active and not new.is_active then
    next_event_type := 'deactivated';
  elsif controlled then
    next_event_type := 'corrected';
  else
    next_event_type := 'updated';
  end if;

  insert into public.inventory_item_events (
    inventory_item_id, event_type, previous_snapshot, new_snapshot,
    reason, actor_profile_id, occurred_at, resulting_version
  ) values (
    new.id, next_event_type,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    case when next_event_type in ('corrected', 'deactivated', 'reactivated')
         then supplied_reason else null end,
    auth.uid(), now(), new.version
  );

  return new;
end;
$$;

create trigger inventory_items_event_writer
after insert or update on public.inventory_items
for each row execute function public.tg_record_inventory_item_event();

create or replace function public.tg_inventory_item_events_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Inventory catalogue events are immutable' using errcode = '55000';
end;
$$;

create trigger inventory_item_events_immutable
before update or delete on public.inventory_item_events
for each row execute function public.tg_inventory_item_events_immutable();

-- =====================================================================
-- 4. Equipment asset triggers — audit, transition guard, event ledger
-- =====================================================================

create or replace function public.tg_audit_equipment_assets()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  item public.inventory_items;
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
    new.version := 1;
    -- An asset is always registered available and never already issued,
    -- under repair, lost or retired. Every one of those is a recorded act.
    new.status := 'available';
    new.current_custodian_person_id := null;
    new.expected_return_date := null;

    select * into item from public.inventory_items where id = new.inventory_item_id;
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
  else
    -- Catalogue identity is frozen for the life of the asset: an asset does
    -- not quietly become a different kind of thing.
    new.inventory_item_id := old.inventory_item_id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_by := auth.uid();
    new.updated_at := now();
    new.version := old.version + 1;
  end if;
  new.asset_code := regexp_replace(trim(new.asset_code), '\s+', ' ', 'g');
  new.notes := nullif(trim(coalesce(new.notes, '')), '');
  return new;
end;
$$;

create trigger equipment_assets_audit
before insert or update on public.equipment_assets
for each row execute function public.tg_audit_equipment_assets();

-- Position may ONLY move through the controlled actions below. This is the
-- rule that makes the event ledger trustworthy: there is no silent arbitrary
-- UPDATE path that changes where a thing is, who has it or what state it is
-- in without appending the matching event.
--
-- `authenticated` holds no UPDATE grant on this table at all, so in practice
-- nothing reaches this trigger uncontrolled. It stays as defence in depth,
-- so that a future grant cannot silently reopen the bypass.
create or replace function public.tg_equipment_asset_transition_guard()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  controlled boolean := coalesce(
    nullif(current_setting('app.inventory_asset_controlled_transition', true), ''), 'false'
  )::boolean;
  protected_field_changed boolean :=
    new.status is distinct from old.status
    or new.condition is distinct from old.condition
    or new.current_site_id is distinct from old.current_site_id
    or new.current_custodian_person_id is distinct from old.current_custodian_person_id
    or new.expected_return_date is distinct from old.expected_return_date
    or new.ownership_type is distinct from old.ownership_type
    or new.asset_code is distinct from old.asset_code;
begin
  if protected_field_changed and not controlled then
    raise exception 'Use an equipment action to change this asset'
      using errcode = '42501';
  end if;
  if old.status = 'retired' and not coalesce(
       nullif(current_setting('app.inventory_asset_controlled_correction', true), ''), 'false'
     )::boolean then
    raise exception 'This asset is retired. Only a Principal correction can change it.'
      using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger equipment_assets_transition_guard
before update on public.equipment_assets
for each row execute function public.tg_equipment_asset_transition_guard();

-- The snapshot and its event are written in ONE transaction, by the database,
-- not by each RPC remembering to. An action that updates the asset and forgets
-- its event is not possible.
create or replace function public.tg_record_equipment_asset_event()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  raw_context text := nullif(trim(coalesce(
    current_setting('app.inventory_asset_event', true), ''
  )), '');
  context jsonb := case when raw_context is null then '{}'::jsonb else raw_context::jsonb end;
  next_event_type text := coalesce(
    context ->> 'type', case when tg_op = 'INSERT' then 'registered' else null end
  );
begin
  -- Fail closed, and say why. An UPDATE that reaches here with no declared
  -- event has no honest name for what it did, and this trigger will not
  -- invent one. Unreachable today — `authenticated` holds no UPDATE grant and
  -- every action below declares its event — but if a future grant reopened
  -- the path, an unexplained position change must abort, not land silently.
  if next_event_type is null then
    raise exception 'An equipment change must be made through an equipment action, so its history can be recorded'
      using errcode = '42501';
  end if;

  insert into public.equipment_asset_events (
    equipment_asset_id, event_type, previous_snapshot, new_snapshot,
    reason, note, project_id, maintenance_visit_id,
    actor_profile_id, occurred_at, resulting_version
  ) values (
    new.id, next_event_type,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new),
    nullif(trim(coalesce(context ->> 'reason', '')), ''),
    nullif(trim(coalesce(context ->> 'note', '')), ''),
    nullif(context ->> 'project_id', '')::uuid,
    nullif(context ->> 'maintenance_visit_id', '')::uuid,
    auth.uid(), now(), new.version
  );
  return new;
end;
$$;

create trigger equipment_assets_event_writer
after insert or update on public.equipment_assets
for each row execute function public.tg_record_equipment_asset_event();

create or replace function public.tg_equipment_asset_events_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Equipment asset events are immutable' using errcode = '55000';
end;
$$;

create trigger equipment_asset_events_immutable
before update or delete on public.equipment_asset_events
for each row execute function public.tg_equipment_asset_events_immutable();

-- =====================================================================
-- 5. Stock ledger immutability
-- =====================================================================

-- Movement history is written once and never rewritten. Combined with the
-- absence of any stored quantity column, this is what makes the derived
-- position the only stock truth there is.
create or replace function public.tg_inventory_stock_movements_immutable()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  raise exception 'Stock movements are immutable. Record a correcting movement instead.'
    using errcode = '55000';
end;
$$;

create trigger inventory_stock_movements_immutable
before update or delete on public.inventory_stock_movements
for each row execute function public.tg_inventory_stock_movements_immutable();

-- =====================================================================
-- 6. Derived stock position
-- =====================================================================

-- The single definition of "how much is there". Both the read model and the
-- negative-stock guard call this, so the number a user sees and the number
-- the guard enforces can never disagree.
--
-- target_site_id NULL means the Botanique-custody position, which is why the
-- comparisons are `is not distinct from` and why the movement type is tested
-- in the SAME branch: a 'consumed' row has to_site_id structurally NULL, and
-- without the type test it would otherwise read as an increase against the
-- Botanique-custody position.
create or replace function public.private_inventory_stock_balance(
  target_item_id uuid, target_site_id uuid
)
returns numeric
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select coalesce(sum(
      (case when m.movement_type in ('received', 'adjustment_in', 'issued', 'transferred', 'returned')
              and m.to_site_id is not distinct from target_site_id
            then m.quantity else 0 end)
    - (case when m.movement_type in ('issued', 'transferred', 'returned', 'consumed', 'damaged', 'lost', 'adjustment_out')
              and m.from_site_id is not distinct from target_site_id
            then m.quantity else 0 end)
  ), 0)
  from public.inventory_stock_movements m
  where m.inventory_item_id = target_item_id
$$;

-- Read model. Deliberately a FUNCTION and not a view: a Postgres view is
-- security-definer-ish by default and, without `security_invoker = true`,
-- would read the underlying tables with the view owner's rights and quietly
-- bypass RLS. A SECURITY DEFINER function that checks authority in its own
-- body is the shape this repository already uses (maintenance_register,
-- daily_site_authorised_sites) and leaves nothing implicit.
--
-- Rows with a zero position are omitted: "nothing at that Site" is the
-- absence of a position, not a position of nothing. Botanique-custody rows
-- report site_id NULL and no site name — again, never a fabricated store.
create or replace function public.inventory_stock_position(target_item_id uuid default null)
returns table (
  inventory_item_id uuid,
  item_name text,
  category text,
  unit_of_measure text,
  is_active boolean,
  site_id uuid,
  site_name text,
  location text,
  quantity numeric
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  with positions as (
    select m.inventory_item_id, m.to_site_id as site_id from public.inventory_stock_movements m
    where public.private_inventory_role() is not null
      and (target_item_id is null or m.inventory_item_id = target_item_id)
      and m.movement_type in ('received', 'adjustment_in', 'issued', 'transferred', 'returned')
    union
    select m.inventory_item_id, m.from_site_id as site_id from public.inventory_stock_movements m
    where public.private_inventory_role() is not null
      and (target_item_id is null or m.inventory_item_id = target_item_id)
      and m.movement_type in ('issued', 'transferred', 'returned', 'consumed', 'damaged', 'lost', 'adjustment_out')
  )
  select
    i.id, i.item_name, i.category, i.unit_of_measure, i.is_active,
    p.site_id, s.site_name, s.location,
    public.private_inventory_stock_balance(p.inventory_item_id, p.site_id)
  from positions p
  join public.inventory_items i on i.id = p.inventory_item_id
  left join public.sites s on s.id = p.site_id
  where public.private_inventory_stock_balance(p.inventory_item_id, p.site_id) <> 0
  order by i.item_name, s.site_name nulls first
$$;

-- =====================================================================
-- 7. Row level security
-- =====================================================================

alter table public.inventory_items enable row level security;
alter table public.inventory_item_events enable row level security;
alter table public.equipment_assets enable row level security;
alter table public.equipment_asset_events enable row level security;
alter table public.inventory_stock_movements enable row level security;

-- Catalogue: both operational roles read it and create ordinary items, and
-- may edit an item that has no history yet. staff and viewer match no policy
-- and therefore see nothing at all.
create policy "inventory_items_select_operational_roles"
  on public.inventory_items for select
  to authenticated
  using (public.private_inventory_role() is not null);

create policy "inventory_items_insert_operational_roles"
  on public.inventory_items for insert
  to authenticated
  with check (public.private_inventory_role() is not null);

create policy "inventory_items_update_operational_roles"
  on public.inventory_items for update
  to authenticated
  using (public.private_inventory_role() is not null)
  with check (public.private_inventory_role() is not null);

create policy "inventory_item_events_select_operational_roles"
  on public.inventory_item_events for select
  to authenticated
  using (public.private_inventory_role() is not null);

-- Assets, asset events and stock movements are READ-ONLY to every client.
-- There is no INSERT or UPDATE policy for them and no INSERT or UPDATE grant
-- below: every write goes through a controlled SECURITY DEFINER action that
-- checks authority in its own body. This is what makes "no direct quantity
-- edit" and "no silent position change" structural rather than a convention.
create policy "equipment_assets_select_operational_roles"
  on public.equipment_assets for select
  to authenticated
  using (public.private_inventory_role() is not null);

create policy "equipment_asset_events_select_operational_roles"
  on public.equipment_asset_events for select
  to authenticated
  using (public.private_inventory_role() is not null);

create policy "inventory_stock_movements_select_operational_roles"
  on public.inventory_stock_movements for select
  to authenticated
  using (public.private_inventory_role() is not null);

-- No DELETE policy on any of the five tables, and DELETE is never granted
-- below. Catalogue items are deactivated, assets are retired, history is
-- kept. Nothing in Inventory is ever erased.

-- =====================================================================
-- 8. Controlled catalogue actions (Principal-only)
-- =====================================================================

create or replace function public.correct_inventory_item_identity(
  target_item_id uuid,
  expected_version integer,
  new_item_name text,
  new_category text,
  new_notes text,
  reason text
)
returns public.inventory_items
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_items;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
  clean_name text := nullif(regexp_replace(trim(coalesce(new_item_name, '')), '\s+', ' ', 'g'), '');
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can correct a catalogue item' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to correct a catalogue item' using errcode = '22023';
  end if;
  if clean_name is null then
    raise exception 'An item name is required' using errcode = '22023';
  end if;

  select * into existing from public.inventory_items where id = target_item_id for update;
  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if existing.version <> expected_version then
    raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;

  perform set_config('app.inventory_item_controlled_change', 'true', true);
  perform set_config('app.inventory_item_change_reason', clean_reason, true);

  update public.inventory_items
  set item_name = clean_name,
      category = coalesce(new_category, existing.category),
      notes = new_notes
  where id = existing.id and version = expected_version
  returning * into existing;

  perform set_config('app.inventory_item_controlled_change', 'false', true);
  perform set_config('app.inventory_item_change_reason', '', true);

  if existing.id is null then
    raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  return existing;
end;
$$;

create or replace function public.deactivate_inventory_item(target_item_id uuid, expected_version integer, reason text)
returns public.inventory_items
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_items;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
  unresolved_assets integer := 0;
  has_live_stock boolean := false;
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can deactivate a catalogue item' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to deactivate a catalogue item' using errcode = '22023';
  end if;
  select * into existing from public.inventory_items where id = target_item_id for update;
  if not found then raise exception 'Catalogue item not found' using errcode = 'P0002'; end if;
  if existing.version <> expected_version then raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001'; end if;
  if not existing.is_active then raise exception 'This catalogue item is already inactive' using errcode = '22023'; end if;

  if existing.tracking_method = 'asset' then
    select count(*) into unresolved_assets from public.equipment_assets a
    where a.inventory_item_id = existing.id and a.status <> 'retired';
    if unresolved_assets > 0 then
      raise exception 'This item still has unresolved equipment assets. Resolve or retire them first.' using errcode = '22023';
    end if;
  else
    select exists (
      select 1 from (
        select m.from_site_id as site_id from public.inventory_stock_movements m where m.inventory_item_id = existing.id
        union
        select m.to_site_id as site_id from public.inventory_stock_movements m where m.inventory_item_id = existing.id
      ) p where public.private_inventory_stock_balance(existing.id, p.site_id) <> 0
    ) into has_live_stock;
    if has_live_stock then
      raise exception 'This stock item still has quantity on hand. Reconcile every position to zero first.' using errcode = '22023';
    end if;
  end if;

  perform set_config('app.inventory_item_controlled_change', 'true', true);
  perform set_config('app.inventory_item_change_reason', clean_reason, true);
  update public.inventory_items set is_active = false where id = existing.id and version = expected_version returning * into existing;
  perform set_config('app.inventory_item_controlled_change', 'false', true);
  perform set_config('app.inventory_item_change_reason', '', true);
  return existing;
end;
$$;

create or replace function public.reactivate_inventory_item(
  target_item_id uuid, expected_version integer, reason text
)
returns public.inventory_items
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.inventory_items;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can reactivate a catalogue item' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to reactivate a catalogue item' using errcode = '22023';
  end if;

  select * into existing from public.inventory_items where id = target_item_id for update;
  if not found then
    raise exception 'Catalogue item not found' using errcode = 'P0002';
  end if;
  if existing.version <> expected_version then
    raise exception 'This catalogue item was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  if existing.is_active then
    raise exception 'This catalogue item is already active' using errcode = '22023';
  end if;

  perform set_config('app.inventory_item_controlled_change', 'true', true);
  perform set_config('app.inventory_item_change_reason', clean_reason, true);

  update public.inventory_items set is_active = true
  where id = existing.id and version = expected_version
  returning * into existing;

  perform set_config('app.inventory_item_controlled_change', 'false', true);
  perform set_config('app.inventory_item_change_reason', '', true);
  return existing;
end;
$$;

-- =====================================================================
-- 9. Controlled equipment actions
-- =====================================================================

-- Shared preamble for every asset action: authority, lock, version, and the
-- terminal-state check. Returns the locked row so each action works from
-- state it knows nobody else can be changing.
create or replace function public.private_lock_equipment_asset(
  target_asset_id uuid, expected_version integer
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets;
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;
  select * into existing from public.equipment_assets where id = target_asset_id for update;
  if not found then
    raise exception 'Equipment not found' using errcode = 'P0002';
  end if;
  if existing.version <> expected_version then
    raise exception 'This equipment was changed elsewhere. Reload and try again.' using errcode = '40001';
  end if;
  return existing;
end;
$$;

create or replace function public.private_set_equipment_asset_event(
  event_type text,
  reason text default null,
  note text default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('app.inventory_asset_controlled_transition', 'true', true);
  perform set_config('app.inventory_asset_event', jsonb_build_object(
    'type', event_type,
    'reason', coalesce(reason, ''),
    'note', coalesce(note, ''),
    'project_id', coalesce(target_project_id::text, ''),
    'maintenance_visit_id', coalesce(target_maintenance_visit_id::text, '')
  )::text, true);
end;
$$;

create or replace function public.private_clear_equipment_asset_event()
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  perform set_config('app.inventory_asset_controlled_transition', 'false', true);
  perform set_config('app.inventory_asset_controlled_correction', 'false', true);
  perform set_config('app.inventory_asset_event', '', true);
end;
$$;

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

create or replace function public.return_equipment_asset(
  target_asset_id uuid, expected_version integer, target_site_id uuid default null,
  target_condition text default null, target_project_id uuid default null,
  target_maintenance_visit_id uuid default null, note text default null
)
returns public.equipment_assets
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version); previous_site uuid;
begin
  if existing.status <> 'issued' then raise exception 'Only issued equipment can be returned' using errcode = '22023'; end if;
  if target_site_id is not null then raise exception 'Return goes to Botanique custody; use transfer for Site-to-Site movement' using errcode = '22023'; end if;
  previous_site := existing.current_site_id;
  perform public.private_assert_inventory_context(target_project_id, target_maintenance_visit_id, previous_site);
  perform public.private_set_equipment_asset_event('returned', null, note, target_project_id, target_maintenance_visit_id);
  update public.equipment_assets set status='available', current_site_id=null,
    current_custodian_person_id=null, expected_return_date=null,
    condition=coalesce(target_condition, existing.condition)
  where id=existing.id and version=expected_version returning * into existing;
  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

create or replace function public.update_equipment_asset_condition(
  target_asset_id uuid,
  expected_version integer,
  target_condition text,
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
  if target_condition is null then
    raise exception 'A condition is required' using errcode = '22023';
  end if;
  if existing.status in ('lost', 'retired') then
    raise exception 'This asset is %, so its condition can no longer be updated.', existing.status
      using errcode = '22023';
  end if;
  if target_condition = existing.condition then
    raise exception 'This asset is already recorded as %', existing.condition using errcode = '22023';
  end if;

  perform public.private_set_equipment_asset_event('condition_changed', null, note);
  update public.equipment_assets set condition = target_condition
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;

create or replace function public.send_equipment_asset_for_repair(target_asset_id uuid, expected_version integer, note text default null)
returns public.equipment_assets
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
begin
  if existing.status not in ('available','issued') then raise exception 'This equipment cannot be sent for repair from its current state' using errcode = '22023'; end if;
  perform public.private_set_equipment_asset_event('sent_for_repair', null, note);
  update public.equipment_assets set status='under_repair', current_site_id=null,
    current_custodian_person_id=null, expected_return_date=null
  where id=existing.id and version=expected_version returning * into existing;
  perform public.private_clear_equipment_asset_event();
  return existing;
end;
$$;

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

create or replace function public.report_equipment_asset_lost(
  target_asset_id uuid,
  expected_version integer,
  reason text
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets := public.private_lock_equipment_asset(target_asset_id, expected_version);
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if clean_reason is null then
    raise exception 'A reason is required to report equipment lost' using errcode = '22023';
  end if;
  if existing.status in ('lost', 'retired') then
    raise exception 'This asset is already %', existing.status using errcode = '22023';
  end if;

  perform public.private_set_equipment_asset_event('lost', clean_reason);
  update public.equipment_assets
  set status = 'lost',
      current_site_id = null,
      current_custodian_person_id = null,
      expected_return_date = null
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;

-- Terminal write-off. Principal only: retiring a piece of equipment is the
-- decision that removes it from Botanique's operational capacity for good.
create or replace function public.retire_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  reason text
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can retire equipment' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to retire equipment' using errcode = '22023';
  end if;

  existing := public.private_lock_equipment_asset(target_asset_id, expected_version);
  if existing.status = 'retired' then
    raise exception 'This asset is already retired' using errcode = '22023';
  end if;
  if existing.status = 'issued' then
    raise exception 'Return this equipment before retiring it' using errcode = '22023';
  end if;

  perform public.private_set_equipment_asset_event('retired', clean_reason);
  update public.equipment_assets
  set status = 'retired',
      current_site_id = null,
      current_custodian_person_id = null,
      expected_return_date = null
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;

-- The exceptional path. Rather than letting anyone rewrite history, a wrong
-- position is CORRECTED forward: the Principal states the true state and the
-- reason, the snapshot moves, and the correction itself becomes another
-- immutable event carrying both the wrong state and the right one.
create or replace function public.correct_equipment_asset(
  target_asset_id uuid,
  expected_version integer,
  target_status text,
  target_condition text,
  target_site_id uuid,
  target_custodian_person_id uuid,
  target_expected_return_date date,
  reason text
)
returns public.equipment_assets
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  existing public.equipment_assets;
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can correct equipment history' using errcode = '42501';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required to correct equipment' using errcode = '22023';
  end if;
  if target_status is null or target_condition is null then
    raise exception 'A status and a condition are required' using errcode = '22023';
  end if;
  perform public.private_assert_inventory_site(target_site_id);
  perform public.private_assert_inventory_person(target_custodian_person_id);

  existing := public.private_lock_equipment_asset(target_asset_id, expected_version);

  perform public.private_set_equipment_asset_event('corrected', clean_reason);
  -- The correction marker is what allows a retired asset to be reopened at
  -- all; the transition guard refuses every other path into a retired row.
  perform set_config('app.inventory_asset_controlled_correction', 'true', true);
  update public.equipment_assets
  set status = target_status,
      condition = target_condition,
      current_site_id = target_site_id,
      current_custodian_person_id = target_custodian_person_id,
      expected_return_date = target_expected_return_date
  where id = existing.id and version = expected_version
  returning * into existing;
  perform public.private_clear_equipment_asset_event();

  return existing;
end;
$$;

-- =====================================================================
-- 10. Controlled stock movements
-- =====================================================================

-- The single writer for the stock ledger. Every public movement action funnels
-- through here, so the negative-stock guard, the context rules and the
-- catalogue checks cannot diverge between them.
--
-- NEGATIVE-STOCK PROTECTION AND LOCKING. `for update` on the catalogue row
-- serialises every concurrent movement for THAT item and no other: two
-- transactions issuing the same fittings from the same Site queue behind one
-- another, so the second reads the first's committed movement before checking
-- the balance. Two transactions moving DIFFERENT items never block. This is
-- the smallest lock that makes the check-then-insert sound; it needs no
-- advisory lock, no SERIALIZABLE isolation change and no second balance
-- ledger to fall out of step with the first.
create or replace function public.private_record_inventory_stock_movement(
  target_item_id uuid, target_movement_type text, target_quantity numeric,
  target_from_site_id uuid, target_to_site_id uuid, target_person_id uuid,
  target_project_id uuid, target_maintenance_visit_id uuid, target_reason text, target_note text
)
returns public.inventory_stock_movements
language plpgsql security definer set search_path = pg_catalog, public
as $$
declare
  item public.inventory_items; available numeric; created public.inventory_stock_movements;
  clean_reason text := nullif(trim(coalesce(target_reason,'')), '');
  decreases boolean := target_movement_type in ('issued','transferred','returned','consumed','damaged','lost','adjustment_out');
  operational_site_id uuid;
begin
  if target_quantity is null or target_quantity <= 0 then raise exception 'A quantity greater than zero is required' using errcode = '22023'; end if;
  select * into item from public.inventory_items where id=target_item_id for update;
  if not found then raise exception 'Catalogue item not found' using errcode='P0002'; end if;
  if item.tracking_method <> 'stock' then raise exception 'That catalogue item is not stock-tracked' using errcode='22023'; end if;
  if not item.is_active then raise exception 'That catalogue item is inactive' using errcode='22023'; end if;
  perform public.private_assert_inventory_site(target_from_site_id);
  perform public.private_assert_inventory_site(target_to_site_id);
  perform public.private_assert_inventory_person(target_person_id);
  operational_site_id := case target_movement_type
    when 'received' then target_to_site_id
    when 'issued' then target_to_site_id
    when 'transferred' then target_to_site_id
    when 'returned' then target_from_site_id
    when 'consumed' then target_from_site_id
    when 'damaged' then target_from_site_id
    when 'lost' then target_from_site_id
    else null end;
  perform public.private_assert_inventory_context(target_project_id, target_maintenance_visit_id, operational_site_id);
  if decreases then
    available := public.private_inventory_stock_balance(target_item_id,target_from_site_id);
    if available < target_quantity then raise exception 'Insufficient recorded stock at the source position' using errcode='22023'; end if;
  end if;
  insert into public.inventory_stock_movements(
    inventory_item_id,movement_type,quantity,from_site_id,to_site_id,person_id,
    project_id,maintenance_visit_id,reason,note,actor_profile_id
  ) values (
    target_item_id,target_movement_type,target_quantity,target_from_site_id,target_to_site_id,target_person_id,
    target_project_id,target_maintenance_visit_id,clean_reason,nullif(trim(coalesce(target_note,'')),''),auth.uid()
  ) returning * into created;
  return created;
end;
$$;

-- Stock arriving into Botanique's hands. NO supplier, price, currency or
-- purchase reference: what it cost is Finance's record, recorded once, there.
create or replace function public.record_stock_receipt(
  target_item_id uuid,
  target_quantity numeric,
  target_to_site_id uuid default null,
  target_person_id uuid default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  note text default null
)
returns public.inventory_stock_movements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;
  return public.private_record_inventory_stock_movement(
    target_item_id, 'received', target_quantity,
    null, target_to_site_id, target_person_id,
    target_project_id, target_maintenance_visit_id, null, note
  );
end;
$$;

-- The two-sided movements: stock leaving one position for another. 'issued'
-- and 'returned' are the ordinary Botanique-custody <-> Site pair;
-- 'transferred' is Site to Site. None of them changes the total Botanique
-- holds, only where it is.
create or replace function public.record_stock_transfer(
  target_item_id uuid, target_movement_type text, target_quantity numeric,
  target_from_site_id uuid default null, target_to_site_id uuid default null,
  target_person_id uuid default null, target_project_id uuid default null,
  target_maintenance_visit_id uuid default null, note text default null
)
returns public.inventory_stock_movements
language plpgsql security definer set search_path = pg_catalog, public
as $$
begin
  if public.private_inventory_role() is null then raise exception 'You are not authorised to manage Tools & Equipment' using errcode='42501'; end if;
  if target_movement_type = 'issued' and not (target_from_site_id is null and target_to_site_id is not null) then
    raise exception 'Issued stock must move from Botanique custody to a Site' using errcode='22023';
  elsif target_movement_type = 'transferred' and not (target_from_site_id is not null and target_to_site_id is not null and target_from_site_id is distinct from target_to_site_id) then
    raise exception 'Transferred stock must move between two different Sites' using errcode='22023';
  elsif target_movement_type = 'returned' and not (target_from_site_id is not null and target_to_site_id is null) then
    raise exception 'Returned stock must move from a Site to Botanique custody' using errcode='22023';
  elsif target_movement_type not in ('issued','transferred','returned') then
    raise exception 'Choose issued, transferred or returned' using errcode='22023';
  end if;
  return public.private_record_inventory_stock_movement(
    target_item_id,target_movement_type,target_quantity,target_from_site_id,target_to_site_id,target_person_id,
    target_project_id,target_maintenance_visit_id,null,note
  );
end;
$$;

-- Stock leaving Botanique's holdings for good: used up, ruined, or gone.
-- 'damaged' and 'lost' demand a reason; ordinary consumption does not,
-- because using materials is what materials are for.
create or replace function public.record_stock_usage(
  target_item_id uuid,
  target_movement_type text,
  target_quantity numeric,
  target_from_site_id uuid default null,
  target_person_id uuid default null,
  target_project_id uuid default null,
  target_maintenance_visit_id uuid default null,
  reason text default null,
  note text default null
)
returns public.inventory_stock_movements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if public.private_inventory_role() is null then
    raise exception 'You are not authorised to manage Tools & Equipment' using errcode = '42501';
  end if;
  if target_movement_type not in ('consumed', 'damaged', 'lost') then
    raise exception 'Choose consumed, damaged or lost' using errcode = '22023';
  end if;
  if target_movement_type in ('damaged', 'lost')
     and nullif(trim(coalesce(reason, '')), '') is null then
    raise exception 'A reason is required to record stock as damaged or lost' using errcode = '22023';
  end if;
  return public.private_record_inventory_stock_movement(
    target_item_id, target_movement_type, target_quantity,
    target_from_site_id, null, target_person_id,
    target_project_id, target_maintenance_visit_id, reason, note
  );
end;
$$;

-- Stock-taking correction. Principal only, and always reasoned: this is the
-- one action that can move the recorded position without a real physical
-- event behind it, so it is exactly the action that must be hardest to take
-- and easiest to audit. It appends a movement like everything else — there is
-- no back door that edits a quantity.
create or replace function public.record_stock_adjustment(
  target_item_id uuid,
  target_movement_type text,
  target_quantity numeric,
  target_site_id uuid,
  reason text,
  note text default null
)
returns public.inventory_stock_movements
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  clean_reason text := nullif(trim(coalesce(reason, '')), '');
begin
  if not public.private_inventory_is_principal() then
    raise exception 'Only the Principal can record a stock-taking adjustment' using errcode = '42501';
  end if;
  if target_movement_type not in ('adjustment_in', 'adjustment_out') then
    raise exception 'Choose an adjustment in or an adjustment out' using errcode = '22023';
  end if;
  if clean_reason is null then
    raise exception 'A reason is required for a stock-taking adjustment' using errcode = '22023';
  end if;
  return public.private_record_inventory_stock_movement(
    target_item_id, target_movement_type, target_quantity,
    case when target_movement_type = 'adjustment_out' then target_site_id else null end,
    case when target_movement_type = 'adjustment_in' then target_site_id else null end,
    null, null, null, clean_reason, note
  );
end;
$$;

-- =====================================================================
-- 11. Privileges
-- =====================================================================

revoke all on public.inventory_items from anon, authenticated;
revoke all on public.inventory_item_events from anon, authenticated;
revoke all on public.equipment_assets from anon, authenticated;
revoke all on public.equipment_asset_events from anon, authenticated;
revoke all on public.inventory_stock_movements from anon, authenticated;

-- The catalogue is an ordinary register: both operational roles create and
-- edit items, under RLS and the identity guard.
grant select, insert, update on public.inventory_items to authenticated;

-- Everything else is read-only to every client. No INSERT and no UPDATE is
-- granted on equipment_assets or on either ledger, so the ONLY way to move an
-- asset or a quantity is through a controlled action that checks authority in
-- its own body. No DELETE is granted anywhere.
grant select on public.inventory_item_events to authenticated;
grant select on public.equipment_assets to authenticated;
grant select on public.equipment_asset_events to authenticated;
grant select on public.inventory_stock_movements to authenticated;

-- Trigger functions are never callable directly.
revoke execute on function public.tg_audit_inventory_items() from public, anon, authenticated;
revoke execute on function public.tg_inventory_item_identity_guard() from public, anon, authenticated;
revoke execute on function public.tg_record_inventory_item_event() from public, anon, authenticated;
revoke execute on function public.tg_inventory_item_events_immutable() from public, anon, authenticated;
revoke execute on function public.tg_audit_equipment_assets() from public, anon, authenticated;
revoke execute on function public.tg_equipment_asset_transition_guard() from public, anon, authenticated;
revoke execute on function public.tg_record_equipment_asset_event() from public, anon, authenticated;
revoke execute on function public.tg_equipment_asset_events_immutable() from public, anon, authenticated;
revoke execute on function public.tg_inventory_stock_movements_immutable() from public, anon, authenticated;

-- Internal helpers stay internal. In particular
-- private_record_inventory_stock_movement is the unguarded writer that every
-- public action funnels through AFTER its own authority check; exposing it
-- would hand any authenticated caller the ledger directly.
-- private_inventory_role() is the ONE helper `authenticated` must keep, because
-- the RLS policies above call it and a policy is evaluated as the calling user.
-- It takes no argument and reports only the caller's own role, so it discloses
-- nothing they could not already infer — matching the identical treatment of
-- private_active_people_role() in the People register.
revoke execute on function public.private_inventory_role() from public, anon;
grant execute on function public.private_inventory_role() to authenticated;

revoke execute on function public.private_inventory_is_principal() from public, anon, authenticated;
revoke execute on function public.private_inventory_item_has_history(uuid) from public, anon, authenticated;
revoke execute on function public.private_assert_inventory_context(uuid, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.private_assert_inventory_site(uuid) from public, anon, authenticated;
revoke execute on function public.private_assert_inventory_person(uuid) from public, anon, authenticated;
revoke execute on function public.private_inventory_stock_balance(uuid, uuid) from public, anon, authenticated;
revoke execute on function public.private_lock_equipment_asset(uuid, integer) from public, anon, authenticated;
revoke execute on function public.private_set_equipment_asset_event(text, text, text, uuid, uuid) from public, anon, authenticated;
revoke execute on function public.private_clear_equipment_asset_event() from public, anon, authenticated;
revoke execute on function public.private_record_inventory_stock_movement(uuid, text, numeric, uuid, uuid, uuid, uuid, uuid, text, text) from public, anon, authenticated;

revoke execute on function public.inventory_stock_position(uuid) from public, anon;
revoke execute on function public.correct_inventory_item_identity(uuid, integer, text, text, text, text) from public, anon;
revoke execute on function public.deactivate_inventory_item(uuid, integer, text) from public, anon;
revoke execute on function public.reactivate_inventory_item(uuid, integer, text) from public, anon;
revoke execute on function public.register_equipment_asset(uuid, text, text, text, uuid, date, text) from public, anon;
revoke execute on function public.issue_equipment_asset(uuid, integer, uuid, uuid, date, uuid, uuid, text) from public, anon;
revoke execute on function public.transfer_equipment_asset(uuid, integer, uuid, uuid, date, uuid, uuid, text) from public, anon;
revoke execute on function public.return_equipment_asset(uuid, integer, uuid, text, uuid, uuid, text) from public, anon;
revoke execute on function public.update_equipment_asset_condition(uuid, integer, text, text) from public, anon;
revoke execute on function public.send_equipment_asset_for_repair(uuid, integer, text) from public, anon;
revoke execute on function public.return_equipment_asset_from_repair(uuid, integer, text, uuid, text) from public, anon;
revoke execute on function public.report_equipment_asset_lost(uuid, integer, text) from public, anon;
revoke execute on function public.retire_equipment_asset(uuid, integer, text) from public, anon;
revoke execute on function public.correct_equipment_asset(uuid, integer, text, text, uuid, uuid, date, text) from public, anon;
revoke execute on function public.record_stock_receipt(uuid, numeric, uuid, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.record_stock_transfer(uuid, text, numeric, uuid, uuid, uuid, uuid, uuid, text) from public, anon;
revoke execute on function public.record_stock_usage(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text) from public, anon;
revoke execute on function public.record_stock_adjustment(uuid, text, numeric, uuid, text, text) from public, anon;

-- Granted to `authenticated` only. Every one of these checks the caller's
-- role in its own body against public.profiles — never against user_metadata,
-- which the user controls — so a staff or viewer caller reaching any of them
-- is refused by the function, not merely hidden by the UI.
grant execute on function public.inventory_stock_position(uuid) to authenticated;
grant execute on function public.correct_inventory_item_identity(uuid, integer, text, text, text, text) to authenticated;
grant execute on function public.deactivate_inventory_item(uuid, integer, text) to authenticated;
grant execute on function public.reactivate_inventory_item(uuid, integer, text) to authenticated;
grant execute on function public.register_equipment_asset(uuid, text, text, text, uuid, date, text) to authenticated;
grant execute on function public.issue_equipment_asset(uuid, integer, uuid, uuid, date, uuid, uuid, text) to authenticated;
grant execute on function public.transfer_equipment_asset(uuid, integer, uuid, uuid, date, uuid, uuid, text) to authenticated;
grant execute on function public.return_equipment_asset(uuid, integer, uuid, text, uuid, uuid, text) to authenticated;
grant execute on function public.update_equipment_asset_condition(uuid, integer, text, text) to authenticated;
grant execute on function public.send_equipment_asset_for_repair(uuid, integer, text) to authenticated;
grant execute on function public.return_equipment_asset_from_repair(uuid, integer, text, uuid, text) to authenticated;
grant execute on function public.report_equipment_asset_lost(uuid, integer, text) to authenticated;
grant execute on function public.retire_equipment_asset(uuid, integer, text) to authenticated;
grant execute on function public.correct_equipment_asset(uuid, integer, text, text, uuid, uuid, date, text) to authenticated;
grant execute on function public.record_stock_receipt(uuid, numeric, uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.record_stock_transfer(uuid, text, numeric, uuid, uuid, uuid, uuid, uuid, text) to authenticated;
grant execute on function public.record_stock_usage(uuid, text, numeric, uuid, uuid, uuid, uuid, text, text) to authenticated;
grant execute on function public.record_stock_adjustment(uuid, text, numeric, uuid, text, text) to authenticated;
