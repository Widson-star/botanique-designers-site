# Botanique Operations Hub — Architecture Blueprint (BD-OPERATIONS-HUB-01)

**Workstream:** BD-OPERATIONS-HUB-01 — Operations Hub Architecture and Reconciliation.
**Status:** **Architecture recorded. Phase 1A (Lead Data and RLS Foundation) and Phase
1B-A1 (Project integrity & change history) are both applied and runtime-verified on the
hosted `botanique-admin` project.** The admin-foundation schema, Phase 1A and Phase 1B-A1
are all **live** in hosted Supabase (Pro organisation, `ACTIVE_HEALTHY`); migration history
now contains all three versions (`20260614000100`, `20260726000100`, `20260726000200`).
The **Phase 1B-A2 admin UI slice** (admin shell, essential project CRUD, initial live
dashboard, project Overview + read-only Activity History) is the current implementation
slice, developed on `feat/bd-operations-hub-phase1b-a2` and **not yet merged** — see
`WORKSTREAMS.md` for its authoritative status. Until it merges, the existing seven-project
**Project Tracker remains the current production `/admin` interface**. No UI for
leads/campaigns, storage buckets, integrations, external setup, or frontend production
deployment are performed here. Phase 1A is the first slice of Phase 1 (Operational spine).
**Current UI limitation:** the production Project Tracker is **read-only** — it displays
real hosted projects but has **no create/edit/archive/restore or next-action editing** (its
"Add project / Archive / Assign staff / Edit next action" controls are disabled "future"
placeholders). **Phase 1B-A (Admin Shell + Essential Project Management) is the next
proposed implementation slice**, followed by Phase 1B-B (Leads UI) and Phase 1B-C (site
visits + won-lead conversion) — all subject to separate review. See
`BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md` §N–§T.
**Baseline `main`:** `1b53ba3ac6fd79f0423eb64ec1497161363867c1` (blueprint) /
`95d32e639a873a0094b404b74e4200134592cf14` (Phase 1A).

> **Blueprint plus first implementation slice.** This document records the intended
> long-term operating model. The architecture itself changes no code; the separately
> reviewed **Phase 1A** migration
> (`supabase/migrations/20260726000100_operations_hub_phase_1a_lead_data_rls.sql`) adds
> the `campaigns` / `leads` / `lead_activities` tables and their RLS additively, without
> weakening any existing table, policy, function, or the owner-only finance boundary.
> See `WORKSTREAMS.md` → *BD-OPERATIONS-HUB-01 → Phase 1A* for the full hosted-application
> and verification record. That migration was validated by isolated PostgreSQL execution,
> merged to `main` under PR #30, and has since been **applied to the hosted `botanique-admin`
> project** via the supported Supabase CLI workflow (foundation history repaired, then only
> Phase 1A pushed), with full post-apply verification and the existing 2 profiles / 7
> projects proven unchanged. The **Phase 1A schema/RLS is now live**. The remaining
> user-facing operational work is separately gated as **Phase 1B-A** (Admin Shell and
> Essential Project Management), **Phase 1B-B** (Leads Interface), and **Phase 1B-C** (Site
> Visits and Conversion).

## Objective — the long-term operating model

```
Campaign → Lead → Qualification → Site visit → Quotation → Awarded project
        → Design & implementation delivery → Maintenance → Commercial reporting
```

The existing `/admin` portal and Supabase foundation should eventually become
Botanique Designers' internal **Operations Hub** — the single place to see what needs
attention and to move work from a campaign lead through to a delivered, maintained,
commercially-reported project. This is an evolution of the current admin portal, not a
new parallel system, and it must not duplicate the finance or project records that
already have an authority.

---

## 1. Existing foundation inventory (verified vs unverified)

Evidence: `supabase/migrations/20260614000100_admin_foundation.sql`, `src/admin/**`,
`src/admin/constants/roles.js`, `src/admin/routes/*`, `WORKSTREAMS.md`,
`CAMPAIGN_READINESS_AUDIT.md`, `LEAD_OPERATIONS_PLAYBOOK.md`, `src/admin/DEPLOYMENT.md`.

| Capability | State | Evidence |
|---|---|---|
| `/admin` route (SPA, admin-only) | **Verified — exists** | `src/admin/AdminApp.jsx`, `AdminLayout.jsx`; App routes `/admin` + `/admin/:path*`. |
| Supabase authentication | **Verified — exists** | `src/admin/lib/supabase.js`; auth-gated admin. |
| Profiles | **Verified — exists** | `profiles` table + RLS in the admin_foundation migration. |
| Projects | **Verified — exists** | `projects` table + RLS; `AdminProjects`, `AdminProjectDetail` routes. |
| Project assignments | **Verified — exists** | `project_assignments` table + RLS. |
| Project financial references | **Verified — exists (owner-only)** | `project_financial_references` table; RLS policies `project_financial_references_owner_select/insert/update`. |
| Owner / manager / staff access boundaries | **Verified — exists** | `roles.js` (`owner`/`manager`/`staff`/`viewer`); RLS policies below. |
| Owner access to finance | **Verified — exists** | Owner-only RLS on `project_financial_references`. |
| Manager finance restriction | **Verified — exists** | Manager role "all financial references hidden" (`roles.js`); no manager finance policy. |
| Staff assignment restriction | **Verified — exists** | Staff "limited assigned project visibility"; assignment-scoped RLS. |
| Existing Project Tracking System | **Verified — exists (as the admin projects module)** | `projects` + `project_assignments` + admin routes; the admin portal *is* the current project tracker. |
| Simple Invoice Manager = financial source of truth | **Verified as authority (external system)** | Recorded across `WORKSTREAMS.md` / `CAMPAIGN_READINESS_AUDIT.md` / `LEAD_OPERATIONS_PLAYBOOK.md`; not a repo module. |
| Operations Workflow System | **Direction only — paused / future** | Referenced as a future system in the authority docs; **NO EVIDENCE FOUND** of an implemented module in the repo. |
| Public enquiry → DB lead intake | **NO EVIDENCE FOUND** | The public QuoteWizard hands off to WhatsApp only; it does **not** write a lead record (leads are currently manual — BD-LEADOPS-01). |
| Leads / campaigns / site-visits / maintenance / expenses / applications / assets tables | **NO EVIDENCE FOUND** | None exist; all are proposed below. |
| Storage bucket / company asset library | **NO EVIDENCE FOUND** | None exists; proposed below. |

## 2. Proposed hub modules

All modules below are **proposed** — none is implemented by this blueprint.

### 2.1 Action dashboard
Surface only work needing attention: new/unassigned leads · overdue follow-ups ·
upcoming site visits · unpaid assessments · quotations awaiting follow-up · projects
approaching expected start · delayed project/design milestones · maintenance visits
due · application deadlines · owner-only expenditure alerts.

### 2.2 Leads and campaign attribution
Future lead records carry the BD-LEADOPS-01 fields: Source platform · Campaign · Ad
set/audience · Creative/ad variant · Keyword/search term · Landing/source context ·
Qualification · Stage · Owner · Next follow-up · Site-visit state · Quotation
reference · Project reference · Commercial outcome. **A won lead links to a project
without losing its campaign and sales history** (the lead row persists and references
the project).

### 2.3 Lead activity history
Append-only activity events: enquiry received · reply sent · photos requested · photos
received · follow-up · assessment proposed · assessment payment confirmed · site visit
completed · quotation issued · client decision · won/lost/nurture reason.

### 2.4 Site visits and calendar
Types: site assessment · client presentation · design review · project inspection ·
material delivery · planting day · handover · GardenCare visit · quotation follow-up.
Fields: date/time · location · linked lead/project/client · responsible person ·
status · notes · completion evidence · follow-up action. **Google Calendar sync is a
future integration (Phase 5), not the initial build.**

### 2.5 Projects
Preserve the existing project authority; later extend with: expected start date ·
actual start date · target completion · current stage · current blocker · next action
· responsible person · client-decision-pending · last update · lead/campaign origin
reference.

### 2.6 Design workflow
Stages (not every project needs every stage): brief received · site assessment ·
concept development · master plan · 3D development · internal review · client review ·
revisions · approved · BOQ/quotation · implementation handoff.

### 2.7 Implementation workflow
Stages (as applicable): mobilisation · setting out · civil/hardscape works ·
irrigation · soil preparation · planting · lawn · finishing · inspection · handover ·
defects/corrections · maintenance period.

### 2.8 Tasks and staff
Initial staff operations: name · role · active status · skills · assigned projects ·
assigned tasks · upcoming visits · availability notes. **No payroll, medical,
identity, or sensitive HR records in the initial system.**

### 2.9 Maintenance scheduling
Records: client/site · programme or custom scope · frequency · next visit ·
responsible team · activities · completion · missed/rescheduled reason · notes ·
linked project. **Preserve GardenCare's Nairobi Metropolitan Area recurring-maintenance
boundary** (`GARDENCARE_PRODUCT_DEFINITION.md`).

### 2.10 Operational expenses (owner-only)
Fields: date · project/general category · supplier/payee · description · amount ·
payment method · receipt/reference · approval · owner notes. **Not a replacement for
accounting software; Simple Invoice Manager remains the financial source of truth.**

### 2.11 Applications and opportunities
Records: tender · prequalification · award · grant/business programme · supplier/vendor
registration · partnership. Fields: organisation · opportunity · deadline · status ·
submitted date · account/email used · responsible person · supporting document
reference · next action · outcome.

### 2.12 Company asset library
Future private library: approved logos · letterheads · company profile · proposal
templates · email-signature assets · brand guidelines · social templates ·
vehicle-branding files · approved project descriptions · approved staff profiles ·
standard forms. Metadata: category · version · approved/current status · uploaded by ·
approval date · replacement asset · access permission. **Never store passwords, PINs,
recovery codes, identity documents, or private banking credentials.**

## 3. System-of-record matrix

| Record | Authority |
|---|---|
| Leads, follow-ups and visits | Future Operations Hub |
| Campaign attribution and lead outcome | Future Operations Hub |
| Project delivery state | Existing Project Tracking System (admin projects) / future integrated project module |
| Quotations, invoices and payments | **Simple Invoice Manager** (external — source of truth) |
| Quotation and invoice references | Operations Hub — **reference only** |
| Maintenance schedules | Future maintenance module |
| Operational expenses | Owner-only operations module |
| Brand assets | Future private asset library |
| Applications | Future applications register |

**No duplication of full finance or project records.** The hub stores references
(quotation number, invoice number, project reference) — never copies of the financial
or project source records.

## 4. Proposed data domains (NOT implemented — no migrations written)

Proposed tables and their relationship to the existing `projects`/`profiles`/
`project_assignments`/`project_financial_references`:

- `leads` — a lead; **nullable `project_id`** until won (a lead may exist with no
  project; on Won it references the existing `projects` row without losing campaign/
  sales history).
- `campaigns` — campaign definitions (name, platform, objective, service, audience,
  period); `leads.campaign_id` references it.
- `lead_activities` — append-only events; `lead_id` → `leads`.
- `site_visits` — visits; nullable `lead_id` and/or `project_id`; `assigned_to` →
  `profiles`.
- `project_milestones` — design/implementation milestones; `project_id` → `projects`.
- `tasks` — work items; nullable `project_id`/`lead_id`/`site_visit_id`; `assigned_to`
  → `profiles`.
- `maintenance_schedules` — recurring maintenance; nullable `project_id`; respects the
  GardenCare coverage boundary.
- `applications` — tenders/opportunities.
- `operational_expenses` — owner-only expenses; nullable `project_id`.
- `company_assets` — asset-library metadata (+ a future Supabase storage bucket).

Relationship summary: `projects` remains the delivery record; `leads` is the new
front-of-funnel record that **links to** a project when won; `profiles`/roles remain
the identity/permission spine. **The `campaigns`, `leads` and `lead_activities` tables
are defined (additively, schema + RLS only) by the Phase 1A migration
`supabase/migrations/20260726000100_operations_hub_phase_1a_lead_data_rls.sql` — merged
to `main` under PR #30 and now **applied and verified on the hosted `botanique-admin`
project** (all three empty; RLS live). The remaining proposed tables above have no
migrations yet.**

## 5. Roles and access (preserve existing; do not weaken RLS or finance restrictions)

- **Owner (Widson):** full operational visibility — leads · projects · finance
  references · expenses · applications · asset approvals · staff access.
- **Manager (Martine):** operational visibility **without protected finance** — leads
  · visits · projects · tasks · maintenance · approved company assets. (Finance
  references remain hidden, matching the current `project_financial_references` RLS.)
- **Staff:** only assigned tasks · projects · visits · maintenance activities.

Every proposed table must ship with RLS matching this model. **Existing RLS and
finance restrictions must not be weakened.** Owner-only tables (expenses, finance
references) stay owner-only.

## 6. Implementation phases (do NOT combine into one PR)

- **Phase 1 — Operational spine:** leads · lead activities · site visits/calendar ·
  dashboard action queues · won-lead-to-project conversion/linking.
- **Phase 2 — Project delivery:** design milestones · implementation milestones ·
  tasks · expected project starts · blockers and next actions.
- **Phase 3 — Recurring operations:** maintenance schedules · staff workload · visit
  completion.
- **Phase 4 — Business administration:** owner-only expenses · applications/
  opportunities · company asset library.
- **Phase 5 — Integrations:** website lead ingestion · advertising lead integrations ·
  Google Calendar · approved reporting/measurement integrations.

Each phase is a separate, reviewed implementation with its own migrations and RLS.

## 7. Protected systems, external dependencies, and founder decisions

**Protected (unchanged by any hub work unless a phase explicitly authorises it):**
`/admin` and `src/admin/**` behaviour, existing Supabase tables/RLS/migrations,
owner-only finance references, Simple Invoice Manager (finance source of truth), the
existing project tracker, GardenCare commercial policy/coverage, the public enquiry
funnel (BD-CONVERSION-02 / BD-CONSULTATION-01), measurement boundary
(`MEASUREMENT_PLAN.md`), and the contact number.

**External dependencies (future phases):** Supabase (plan/storage for the asset
library), Google Calendar API (Phase 5), website→hub lead ingestion, and any approved
advertising-lead or measurement integration (each gated by its own authority).

**Founder decisions required before Phase 1:** confirm the hub as the leads/visits
system of record; confirm the manager (Martine) finance-hidden boundary carries to
new tables; approve the Phase 1 scope and data domains; confirm Simple Invoice
Manager and the project tracker remain the respective sources of truth (hub holds
references only).

**Recommendation:** begin **Phase 1 (Operational spine)** only **after** the Monday
campaign-launch work (BD-CAMPAIGN-LAUNCH-01) — the manual BD-LEADOPS-01 register runs
the first campaign; Phase 1 later replaces the spreadsheet with the same fields/stages.
