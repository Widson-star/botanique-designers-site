# Inventory / Tools & Equipment V1 — control addendum

**Control date:** 20 August 2026  
**Status:** implementation corrected; fresh local database execution still required before hosted apply.  
**Production:** untouched. `applied-to-production.json` remains untouched.

This addendum supersedes any V1 wording that conflicts with the control-review corrections below. It does not authorise a hosted apply or UI implementation by itself.

## Control-review corrections

1. **Authority markers are not authority.** Custom transaction/session settings used to label controlled catalogue changes do not grant Principal powers. Sensitive catalogue correction/deactivation still checks the real active `owner` role and requires a reason at the database layer.
2. **Catalogue deactivation cannot hide unresolved physical truth.** Stock items cannot deactivate while any derived Site or Botanique-custody position is non-zero. Asset items cannot deactivate while any asset is not `retired`; `lost` remains an unresolved operational exception.
3. **Stock movement vocabulary is exact.** `issued` = Botanique custody → Site; `transferred` = Site → different Site; `returned` = Site → Botanique custody. Project/Maintenance context is tied to one operational Site, not merely either endpoint: issue/transfer use destination; return/consume/damage/loss use origin; Site receipt uses destination; a Botanique-custody receipt has no Site context.
4. **Catalogue classification is extensible.** `category` and stock `unit_of_measure` are bounded, normalised canonical text rather than a closed taxonomy inferred from an illustrative PNG. `tracking_method` remains exactly `asset | stock`; individually tracked assets retain canonical UOM `unit`.
5. **Repair position is physical truth.** Sending equipment for repair clears client Site, custodian and issued-return date. The immutable event preserves its prior Site. Return from repair requires an observed resulting condition and explicitly returns to a Site or to Botanique custody.

## Equipment lifecycle nuance

Quantity stock and individually tracked equipment are not forced into identical movement mechanics. An available asset may already be physically at a Site when first registered. Issuing it changes lifecycle to `issued` at the destination Site; optional Project/Maintenance context describes that destination. Equipment transfer may change Site, custodian, or both, because individual equipment has a custody dimension that quantity stock does not.

## Founder-approved UI authority

On 20 August 2026 the Founder approved the newly generated **Tools & Equipment** desktop mockup for later implementation, including the item/equipment imagery shown in register rows.

The approved composition governs the separate UI tranche:

- `Tools & Equipment` under **Operations**;
- four summary cards: Catalogue items, Assets in circulation, Under repair, Active stock positions;
- `Inventory register` with tabs: Catalogue, Equipment assets, Stock positions, History;
- equipment imagery/thumbnails in asset rows;
- compact Stock positions supporting panel;
- compact Recent activity supporting panel;
- the existing Operations Hub visual language and density.

The visual design does **not** authorise illustrative numbers, custodians, Sites or inventory records as production truth. No sample rows from the mockup may be seeded.

The PNG is preserved in the active programme workspace as `operations_hub_equipment_dashboard.png`; repository binary commit is a separate visual-authority action and is not part of this database correction tranche.

## Verification gate

The new hardening regression suite is `supabase/tests/inventory_tools_equipment_v1_hardening_test.sql` and is wired into `scripts/test-inventory-db.sh` after the foundation suite and before the two-session stock-concurrency proof.

Because the current ChatGPT runtime does not contain PostgreSQL 17 binaries and this repository has no GitHub Actions workflow, this correction pass must **not** be described as locally green until the disposable-cluster runner is executed in a repository-capable environment. Production Supabase must not be used as a substitute test environment.
