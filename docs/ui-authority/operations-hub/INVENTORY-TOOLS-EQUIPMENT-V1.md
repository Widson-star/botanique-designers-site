# Inventory / Tools & Equipment — V1 architecture

**Founder-approved product model, settled 19 August 2026.** This records the architecture the
Operations > Tools & Equipment database foundation implements. It is an authority and status
record, not a UI specification: **no navigation, route, provider or page is authorised by it.**

Implemented by `supabase/migrations/20260819220000_inventory_tools_equipment_v1.sql`.

## Where this sits

Operations owns four capabilities: **Daily Site Record, People, Maintenance, Tools & Equipment**
(`operating-model-authority/decision-record.md`, navigation-domains table).

**Maintenance and Tools & Equipment are distinct capabilities.** Working-authority image `11`
draws them on one page. That is composition guidance only. The Founder ruled on 9 August 2026 that
they "remain two distinct Operations capabilities" (`working-authority/README.md` tension 3;
`operating-model-authority/decision-record.md` addendum 3), and the migration therefore adds
nothing to any `maintenance_*` table and merges no schema. It reads `maintenance_visits` only when
a caller volunteers a visit as optional context.

Image `11` is also **not production-data authority**. Its 214 items, 162 assigned, 6 damaged, 13
purchase needs, its custodians, its "Operations Hub Store" location and its reorder statuses are
illustrative sample content. None of them was written anywhere, and none of them authorised a
field the system cannot truthfully compute.

## The settled model

One shared catalogue, two truth models beneath it:

```
inventory_items — the shared catalogue
        |
        +-- tracking_method = 'asset'
        |      -> equipment_assets           individually identified, custody + condition
        |      -> equipment_asset_events     immutable history
        |
        +-- tracking_method = 'stock'
               -> inventory_stock_movements  immutable quantity ledger
               -> derived position, never a stored quantity
```

A lawn mower and fifty irrigation fittings share a catalogue, not a record type. The mower is one
asset with a custodian, a condition and a position. The fittings are a quantity that exists only
as the sum of their movements.

`tracking_method` is fundamental identity, not a preference. It is freely correctable while an
item is still a fresh catalogue row, and the moment the item has any operational history it — and
the unit of measure — freeze **outright, for everyone including the Principal**. Flipping asset ↔
stock beneath existing assets or movements would orphan them, and changing the unit would silently
re-denominate every quantity already recorded. That is a data-integrity impossibility, not an
authority question, so the answer is a new catalogue item.

## Domain boundaries

**Site is the primary physical context.** Equipment and stock reference `public.sites` directly and
never `public.projects`. A **maintenance-only Site** — a Site with no Botanique Project at all — is
a fully usable position for both. No Project is ever fabricated to hold inventory.

**Project and Maintenance Visit are optional context only.** They explain *why* a movement
happened. Neither is ever required, and when one is supplied it must **agree with the Site the
action actually touched**: the Project's Site, or the visit's Site, must be one of the movement's
own positions. That is what stops an unrelated Project being attached to equipment issued to an
unrelated Site. The rule is generic — nothing special-cases any named real Project or Site.

**People supplies custody identity.** Custodians are `public.people`, never `public.profiles`. A
site technician who legitimately holds a generator does not need Operations Hub login access, and
the business identity of a custodian must not be tied to portal authentication. `public.profiles`
appears only as the *actor* who recorded something, exactly as everywhere else in the repository.
People may later **display** custody; Tools & Equipment remains the write authority.

**Finance owns the money.** Per `decision-record.md` ("Finance-to-inventory handoff"), Finance
records supplier, price, currency, purchase cost, expense, approval and payment exactly once.
Nothing in this schema stores any of them: there is no supplier, cost, price, currency, invoice,
depreciation, warranty or accounting-value column anywhere, and no foreign key to any Finance
table. Operations owns asset/stock identity, position, custodian, condition, assignment, transfer,
return, loss/damage and stock-taking.

## Positions, and the absence of a fake store

A **position** is either a Site, or `NULL` meaning **Botanique custody** — held by Botanique but
not at a client Site. No "Main Store", warehouse, office, depot or storage-location row is created
to stand in for it, because none exists as a real place in the operating model.

The nullable Site is unambiguous because the movement type says which column is a position and
which is structurally unused:

| Movement type | `from_site_id` | `to_site_id` | Effect |
| --- | --- | --- | --- |
| `received`, `adjustment_in` | forced NULL (unused) | position | increases at `to` |
| `issued`, `transferred`, `returned` | position | position | decreases `from`, increases `to` |
| `consumed`, `damaged`, `lost`, `adjustment_out` | position | forced NULL (unused) | decreases at `from` |

A CHECK constraint enforces the forced-NULL column per type, and forces the two positions of a
two-sided movement to differ, so a movement can never be a no-op against itself.

## No direct quantity editing

There is **no** current-quantity column on the catalogue or on any asset. An operator can never
silently change 50 to 33; they record what happened and the position follows. Every quantity is
positive and the movement type decides direction, so no arbitrary signed edit exists to abuse.

Current stock is derived by `private_inventory_stock_balance(item, site)` and exposed by
`inventory_stock_position(item)`. The read model is a **function, not a view**: a Postgres view
without `security_invoker = true` reads its underlying tables with the view owner's rights and
quietly bypasses RLS, so a SECURITY DEFINER function that checks authority in its own body was
chosen instead — the shape already used by `maintenance_register()` and
`daily_site_authorised_sites()`.

**Negative-stock protection.** Every movement funnels through one internal writer, which takes
`FOR UPDATE` on the catalogue row before reading the source balance. That serialises concurrent
movements for that item and no other: two sessions taking from the same position queue behind one
another, so the second reads the first's committed movement before checking. It is the smallest
lock that makes check-then-insert sound — no advisory lock, no isolation-level change, and no
second balance ledger to fall out of step with the first. Both orderings are proved with two
genuinely separate connections in `scripts/test-inventory-db.sh`.

## Audit integrity

An asset row is a **current-position snapshot**; the truth of how it got there is the event ledger.
The two are written in one transaction **by a trigger**, not by each action remembering to, so an
action that moves an asset and forgets its event is not possible. Each event carries the full
before and after state, so any position the register shows can be explained without trusting the
snapshot.

Working events: `registered`, `issued`, `transferred`, `returned`, `condition_changed`,
`sent_for_repair`, `returned_from_repair`, `lost`, `retired`, `corrected`.

Normal operations never UPDATE or DELETE a historical row. Immutability triggers refuse both on all
three ledgers even for a privileged writer, and no client holds a DELETE grant anywhere in the
domain. History is corrected **forward**: the Principal states the true state and the reason, and
the correction becomes another immutable event carrying both the wrong state and the right one.

Ordering note: `occurred_at` is `now()`, which is constant within a transaction, so
`resulting_version` is the reliable sequence key for an event chain. Both event indexes carry it.

## V1 authority

Existing database role keys, with their settled visible meanings:

| Role | Visible meaning | Inventory V1 |
| --- | --- | --- |
| `owner` | Principal | Full portfolio Inventory, every ordinary operation, **plus** the three exceptional powers: catalogue identity correction and deactivation, equipment correction and retirement, and stock-taking adjustment |
| `manager` | Operations Manager | Full portfolio Inventory: create catalogue items, register equipment, receive, issue, transfer, return, consume, update condition, report damage and loss, send for and return from repair |
| `staff` | Project Team | **Nothing.** No read, no write |
| `viewer` | Read-only | **Nothing.** "Viewer" sounding read-only does not make Inventory visible to it |

Inventory is a portfolio register, so it follows the portfolio-wide shape of `public.people`
(`private_active_people_role`) rather than the project-scoped shape of Daily Site Operations. No
new access path was invented.

**Security posture.** RLS is enabled on all five tables. The catalogue is an ordinary register with
SELECT/INSERT/UPDATE under RLS; equipment, both event ledgers and the movement ledger are
**read-only to every client** — no INSERT or UPDATE grant exists, so the only way to move an asset
or a quantity is a controlled action that checks the caller's role in its own body against
`public.profiles`, never against user metadata. Every SECURITY DEFINER function pins an explicit
`search_path`, PUBLIC and `anon` execution is revoked, and only the intended `authenticated`
invocation is granted. The internal writer and lock helpers are revoked from `authenticated` too.

## No production data

The migration inserts **not one row**. No sample inventory, no catalogue seed, no asset, no
movement. It adds no column to `projects`, `sites`, `people`, `profiles`, `daily_site_entries` or
any `maintenance_*` table, and alters no existing table, policy, function or trigger. It is purely
additive.

## Deferred — explicitly not built

Navigation and every UI surface; React provider or context; dashboard cards; Alerts; Reports Centre
integration; People custody display; Maintenance allocation; Daily Site Record equipment usage;
**Finance purchase linkage and the acquisition → inventory hand-off** (one Finance acquisition
creating several Inventory units — deferred because the Company Expense acquisition truth it would
hang from is not yet complete); suppliers, procurement, purchase orders, prices, costs,
depreciation, accounting asset value, warranties, repair billing; recurring service schedules;
barcode/QR scanning; attachments and photos; Documents & Resources; staff acknowledgement and
receipt workflow; equipment reservation and booking; expiry, batch and lot tracking; warehouse and
bin logistics; automatic reorder purchasing.

**Reorder thresholds are deferred.** Image `11`'s "Purchase needs" and "Replacement / reorder
status" columns are illustrative, the image is not data authority, and the approved V1 stock model
does not require a threshold. Representing one now would have been the first step of purchasing
logic that is out of scope.

## Status

**NOT `ACTIVE_VERIFIED`.** The migration is implemented and proved against a disposable local
PostgreSQL 17 cluster only. Nothing has been applied to the production Supabase project, and the
`applied-to-production.json` ledger is deliberately **not** updated, so
`scripts/check-migration-drift.mjs` correctly reports the repository as ahead of production and
`src/test/migrationDrift.test.js`'s real-repository assertion correctly fails. That is the guard
working, and the controlled manual step is documented in `MIGRATION-DEPLOYMENT.md`.

Hosted apply and authenticated verification as both Principal and Operations Manager remain
outstanding, and are a separate authorised step.
