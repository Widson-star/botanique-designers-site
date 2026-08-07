# Production remediation inventory

Factual record of known compact-presentation deficiencies in the **current, live** Operations
Hub, so they are not forgotten before the corrected architecture is implemented. This is an
inventory, not an implementation plan — nothing here schedules or bundles work into one PR, and
nothing here is a data change.

| Area | Current production | Classification |
| --- | --- | --- |
| Site Costs | Long raw table, multiple heterogeneous columns, uncontrolled free-text `recipient_label`, unevenly expanding rows, no compact financial position, no needs-attention hierarchy, no payment/reconciliation flow, unbounded primary presentation | PRE-EXISTING PRODUCT DEFICIENCY / FUTURE PROJECT COSTS REMEDIATION |
| Approvals | Generic table; production display currently dominated by fixture records; not a curated decision inbox; no consolidated cross-module approval model | PRE-EXISTING PRODUCT DEFICIENCY + NEW APPROVALS ARCHITECTURE |
| Daily Site Operations | Morning-plan/compliance register presented primarily as a register/table; no actual-attendance authority; no uploaded written crew register; no full Daily Site Record workflow | PRE-EXISTING PRODUCT DEFICIENCY + AUTHORISED FUTURE DAILY SITE RECORD EXPANSION |
| Project Register / current Projects | Broad register, wide table; currently manageable only because record volume is low; primary list is architecturally unbounded (no page-size cap found in `AdminProjects.jsx`) | PRE-EXISTING PRESENTATION DEFICIENCY, LOWER URGENCY |
| Project Proposals / current Project Intakes | Basic register; pending decisions and history carry similar visual weight; fixture contamination affects current hosted presentation | PRE-EXISTING PRESENTATION DEFICIENCY + AUTHORISED PROJECT PROPOSALS REFINEMENT |
| People detail | `AdminPersonDetail.jsx` renders four `Panel` sections (Current engagements, Past engagements, a third section, Portal access) stacked vertically in a single scroll; no internal navigation or progressive disclosure between them was found; risk of an unlimited dossier grows with engagement history | COMPACT-PRESENTATION REMEDIATION |
| Project Summary | Long dossier; repeated explanatory copy; equal-weight sections; empty/unavailable sections receive full-weight space; not faithful to the compact Project Summary authority already established | PRE-EXISTING PRODUCT DEFICIENCY / COMPACT PROJECT SUMMARY CORRECTION |
| Fund Requests | Zero operational records in production; unclear workflow; isolated from actual payment and reconciliation; replaced architecturally by Funding, Payments and Reconciliation | PRE-EXISTING STRUCTURAL DEFICIENCY / SUPERSEDED ARCHITECTURE |

## Basis for each finding

Site Costs, Approvals, Daily Site Operations, Project Register, Project Proposals, and Fund
Requests findings restate what was already established from the Founder's supplied hosted
production screenshots and read-only production database audits earlier in this engagement — not
re-verified against source line counts. The People detail finding is component-structure
evidence read directly from `src/admin/routes/AdminPersonDetail.jsx` (four stacked `Panel`
elements, no tab/internal-nav component present), not a citation of file length. Project Summary
restates the finding that already motivated the compact Project Summary correction accepted
earlier in this package.

## What this inventory is not

It does not imply every row above must be corrected in one implementation PR, and it authorises
no implementation. It exists so none of these known deficiencies is silently dropped once
implementation begins.
