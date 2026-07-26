# Botanique Operations Hub — Product Requirements (BD-OPERATIONS-HUB-01)

**Status:** **Authority and planning document only — no implementation.** This records the
expanded Operations Hub product requirements discussed by the founder so that future
phases have a single, reviewed reference. Nothing here is built yet. It does **not**
authorise any UI, migration, expense module, payment module, application register, chart,
report, or integration; each remains subject to separate phase review.

**Companion authorities:** `BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md` (architecture),
`WORKSTREAMS.md` → *BD-OPERATIONS-HUB-01* (status + hosted application record),
`LEAD_OPERATIONS_PLAYBOOK.md` (manual lead operations). Where any of these disagree, the
finance and access boundaries in §H and §I of this document, and the live-state record in
`WORKSTREAMS.md`, govern.

**Long-term workflow (unchanged):**
Campaign → Lead → Qualification → Site visit → Quotation → Awarded project →
Design & implementation → Maintenance → Commercial reporting.

**Hosted state at time of writing:** the admin-foundation schema and Phase 1A are **live**
on the hosted `botanique-admin` Supabase project (Pro organisation, active). `campaigns`,
`leads` and `lead_activities` exist and are empty; the seven-project Project Tracker
remains the current production `/admin` interface; there is **no Leads UI yet**. See
`WORKSTREAMS.md` for the full verification record.

---

## A. Current operating context

- Botanique has **no permanent general staff yet**.
- **Martine Lotom** is the male Operations Manager (he/him).
- Additional workers are generally **engaged and paid per project** (casual / project-based),
  not on a standing payroll.
- The system must be **ready** for more consistent staffing and regular office/team
  briefing sessions **when** Botanique establishes a physical location — designed for that
  future, but not assuming it today.
- Botanique receives numerous **job, internship, attachment and collaboration enquiries**
  that currently have no structured home.

## B. Proposed navigation (future)

Dashboard · Leads · Site Visits · Projects · Design & Implementation · Tasks ·
**People & Resourcing** · Project Engagements · Expenses & Assets · Maintenance ·
Applications · Reports · Settings

> The people-management area is deliberately named **People & Resourcing**, not "HR".
> Botanique's model is project-based engagement and resourcing, not formal human-resources
> administration.

## C. Interactive dashboard and reporting (future requirements)

The Hub should eventually surface, in owner/role-appropriate views:

- project status and progress; blockers and overdue actions;
- leads and follow-ups; upcoming site visits;
- staff workload; labour **committed, paid and outstanding**;
- project budget versus actual operating cost; expenditure by category;
- applications awaiting action;
- charts and trends; a **meeting-ready briefing view**;
- an exportable or printable management summary.

**"Real time" clarification:** "real time" means **persisted database changes update Hub
views immediately** (a saved change is reflected without manual refresh). It does **not**
authorise GPS tracking, location monitoring, or any employee surveillance.

## D. Project tracking (future consolidation)

Each future project page should eventually consolidate:

- stages and milestones; responsible people;
- blockers and next actions; expected and actual dates;
- staff / project engagements; internal expenses;
- equipment / tools allocated;
- relevant documents and completion evidence;
- maintenance or handover status;
- the originating **lead / campaign reference**.

## E. People & Resourcing (future records)

- person; role / trade; skills; active status; availability;
- project history; assignments;
- the person's own engagement / payment history;
- equipment or attire issued;
- operational performance notes.

**Excluded from initial phases:** payroll, medical records, identity-document storage, and
any sensitive HR data. These are out of scope until explicitly authorised.

## F. Project engagement agreements (future)

For Martine and every other project-paid person, record:

- person; project; responsibility / scope;
- original agreed amount; agreement date; agreed by;
- instalment / payment schedule; amount paid; payment date; balance;
- additional work; revised total; revision reason; revision approval;
- payment proof / reference; **immutable audit history**.

**Requirements:**

- **Never silently overwrite the original agreement** — the original commitment is
  preserved as a distinct, immutable record.
- Distinguish **original commitment**, **approved additions**, **total commitment**,
  **paid**, and **balance**.
- Support disagreement resolution through **dated evidence**.
- Allow **project-level** and **person-level** reports.

> This module is prioritised early in Phase 3 because the founder has identified repeated
> disagreement between Widson and Martine over agreed project-labour budgets versus amounts
> ultimately paid; dated, immutable records are the control that resolves it.

## G. Operational expenses (future)

**Categories:** staff / casual labour · subcontractors · suppliers · fuel · transport ·
tools · equipment · repair and maintenance · branded attire / workwear · advertising and
marketing · software / subscriptions · communications · site visits · travel /
accommodation · office setup · professional fees · approved miscellaneous costs.

**Fields:** date · project or general-business allocation · category · description ·
supplier / recipient · amount · payment method · receipt / proof · incurred by ·
approved by · company-paid or reimbursable · proposed / approved / paid / rejected status ·
notes · audit timestamps.

## H. Financial authority separation

Three distinct domains, kept separate:

1. **Client finance** — **Simple Invoice Manager remains authoritative** for quotations,
   invoices, receipts, balances and client payments.
2. **Project commitments** — staff, subcontractor and supplier **agreements** belong in the
   Operations Hub.
3. **Actual internal expenditure** — staff payments, fuel, tools, advertising and other
   operating expenses belong in the Hub.

The Hub **may calculate owner-only project-cost and performance reports** but **must not
silently duplicate or replace** accounting and client-finance authority (Simple Invoice
Manager).

## I. Access model

**Owner — Widson:** all operational records; all engagements and internal costs; client
finance references; business reports and approvals.

**Manager — Martine (he/him):** operational projects, leads, visits, tasks and staff
coordination; **his own** engagement / payment records; approved project-team commitments
and payments where he has management responsibility; **no automatic access** to client
quotation / invoice / receipt numbers, client payments, margins, banking data, or
owner-only finance records.

**Project staff:** assigned work; their own engagement; their own paid and outstanding
amounts; **no other worker's rates** unless explicitly authorised by role.

**Applicants:** **no portal access.**

## J. Applications register (future)

**Types:** jobs · internships · attachments · freelance / casual work · subcontracting ·
suppliers · collaborations · institutional partnerships.

**Fields:** applicant / organisation · application type · received date · source ·
skills / interest · CV / portfolio / document reference · status · reviewer ·
meeting / interview date · next action · outcome · notes.

**Workflow:** New → Reviewing → Shortlisted → Meeting scheduled → Trial / project
opportunity → Accepted → Declined → Keep on file.

> Any public "Work With Us" form is a **later, separate public-site phase** (Phase 5).

## K. Reporting requirements (future owner reports)

- project cost and commitment report;
- staff / person payment report;
- expenses by project / category / month;
- approved but unpaid commitments;
- receipt completeness;
- labour committed versus paid;
- advertising cost versus leads;
- project workload and delivery trends;
- applications pipeline.

Client margins and finance are protected **according to role** (owner-only where §H/§I
require it).

## L. Implementation phases

**Phase 1A — complete (live + verified on hosted `botanique-admin`):**
campaigns · leads · lead activities · RLS and audit foundation.

**Phase 1B — split into controlled sub-slices** (see §N–§T for the driving requirements):

- **Phase 1B-A — Admin Shell and Essential Project Management** *(prioritised next)*:
  persistent sidebar / top-bar admin shell; project **create / edit / archive / restore**;
  operational project updates (status, stage, responsible person, location/county, type,
  dates, next action + due date, blocker, notes, portfolio eligibility/permission);
  basic **audit-aware forms** (preserving `created_by`/`updated_by`/`archived_by` +
  timestamps and change history); an improved project dashboard using **live** data.
  *Prioritised because the existing production Project Tracker holds real hosted data but
  cannot currently be maintained through the UI (see §N).*
- **Phase 1B-B — Leads Interface:** Leads menu; campaigns; qualification; follow-up
  queues; lead activity history.
- **Phase 1B-C — Site Visits and Conversion:** site visits / calendar; assessment
  workflow; won-lead-to-project conversion.

**Phase 2:** full timelines · project milestones · design and implementation workflow ·
tasks · blockers · project dates · advanced real-time project tracking (per §S).

**Phase 3:** People & Resourcing · **project engagement agreements** · agreed amounts,
revisions, payments and balances · staff workload · maintenance scheduling.
*Prioritise project engagement / payment control early in this phase* (see §F — repeated
Widson/Martine disagreement over agreed labour budgets versus amounts paid).

**Phase 4:** operational expenses · tools / equipment / assets · attire · advertising
costs · owner reporting and charts · applications / opportunities register.

**Phase 5:** website / ad lead ingestion · "Work With Us" application intake ·
Google Calendar · approved notifications and external integrations.

> No phase is implemented by this document or its PR.

## M. Deferred public-credibility item

A separate **public-site** item remains pending (not built, not authorised here):

> **"Selected Clients & Organisations We've Worked With."**

Potential organisations supplied by the founder include **Craft Silicon Ltd, Tsavo,
Zaara Park (design-only), Mwiko Gardens / Krave, 3Dee Grove, Olerai Conservancy,
Kraft Room, and Roam**.

**Do not publish or implement these names yet.** Each requires, before any public use:
engagement attribution, official name, scope, **direct-Botanique versus founder
experience** distinction, and **logo-use verification**. Zaara Park in particular is
**design-only** and must never be presented as an implementation.

---

## N. Current Production Usability Gap (verified from founder screenshots)

The founder reviewed the **live production `/admin`** interface. Verified current state:

- Hosted **authentication, RLS and the seven project records are real** (live hosted data,
  not a fixture — see `WORKSTREAMS.md`).
- The current Project Tracker is **predominantly read-only**: it displays real projects and
  supports **search / filter / detail viewing**, but **no mutation**.
- The following controls are **present but deliberately disabled**, labelled "future":
  **Add project**, **Archive**, **Assign staff**, **Edit next action**.
- There is **no general Edit project** action.
- Conclusion: the **database foundation is operational, but the interface is not yet a
  complete operational management tool** — it cannot currently maintain the real records it
  displays.

**Design rule:** production **should not retain disabled "future" buttons indefinitely.**
Future functionality should be **either functional or hidden** until its implementation is
authorised. Avoid a production interface dominated by dead/decorative controls.

## O. Essential Project Management (future — the core of Phase 1B-A)

The future portal must support, with all mutations enforced by RLS/server policy (§Q):

- **create project**; **edit project**; **archive project**; **restore** archived project;
- **no permanent delete** in the initial system (archive/restore only);
- update **status**; update **stage**; update **responsible / lead person**;
- update **location** and **county**; update **project type**;
- update **expected and actual dates**;
- update **next action** and **due date**; update **blocker**; update **notes**;
- update **portfolio eligibility** and **permission**;
- preserve `created_by`, `updated_by`, `archived_by` and timestamps;
- preserve an **auditable change history**.

The **Tsavo** temporary holding row ("Tsavo Company Projects") should later be **splittable
into distinct project records** without losing the originating record or its audit history.

## P. Project-page information architecture (future)

Future project-detail structure (tabs / modules):

- **Overview** · **Timeline** · **Tasks** · **People** · **Project Engagements** ·
  **Expenses** · **Files and Evidence** · **Activity History**.

Modules are **revealed only when implemented and authorised** — never shown as empty/dead
placeholders (per §N).

## Q. Access model — project CRUD (extends §I; RLS-enforced, not UI-hidden only)

- **Owner (Widson):** full create / edit / archive / restore; complete operational and
  protected owner-only views.
- **Manager (Martine, he/him):** create / edit / archive / restore **operational** project
  records; assign operational responsibility; **no** access to protected client finance,
  margins, banking, or owner-only references.
- **Project staff:** **no** project-master creation/editing initially; **later** may update
  **only** their assigned tasks, milestones, visits and evidence; **no** access to unrelated
  projects or private rates.

**All permissions remain enforced through RLS and server/database policy — not only hidden
UI.** A disabled or hidden control is a convenience, never the security boundary.

## R. Admin-shell and dashboard design authority (future)

Desired future interface:

- persistent **desktop sidebar**; responsive **mobile / tablet** navigation;
- **top bar** with global search, notifications and user / profile controls; clear **role
  badge**;
- **KPI cards**; **filterable / sortable tables**; role-appropriate **dashboards**;
- **chart drill-down** or link to the underlying records;
- **printable / exportable briefing reports**;
- clear **empty, loading, error and offline** states;
- **save confirmation** and **validation errors**; **last-updated / synchronisation** status.

**Design rules:**

- Botanique brand palette; **Quicksand** operational typography; restrained, professional
  visual hierarchy.
- **Do not copy third-party templates**; **do not reproduce Power BI styling**; no
  fabricated figures or decorative fake data.
- Empty datasets show **"No data yet"** rather than mock values.
- **Finance charts are owner-only** where required (§H/§I).

> The founder-supplied dashboards (sidebar nav, top bar, KPI cards, charts, tables,
> reports, filters, briefing views) are **design-direction references only** — do not copy
> their branding, layout, numbers or assets.

## S. Dashboard metrics (future — no chart exists today)

**General operational dashboard (KPIs):** total projects · active · pending · delayed ·
completed · upcoming starts · overdue actions · leads awaiting follow-up · upcoming site
visits.

**General charts:** projects by status · projects by stage · start / completion trend ·
overdue actions by project · workload by responsible person · projects by service type ·
leads by source and outcome.

**Owner-only reporting:** labour committed versus paid · staff / project payment balances ·
internal expenses by category · project operating costs · approved but unpaid commitments ·
advertising expenditure · (later) owner-only project performance reporting.

> None of these charts or metrics exists today; this is future authority only. Empty data
> shows "No data yet", never mock figures.

## T. "Real-time" — two levels

**Initial (single-user reflection):** after a **successful save**, all affected
project / dashboard views update **immediately without a manual browser refresh**; save
**success / failure is explicit**.

**Later (multi-user synchronisation):** Supabase Realtime (or an equivalent **authorised**
subscription) may update Widson's and Martine's open sessions; display **last-updated and
connection status**. This means **persisted database changes reflected in the UI** — it does
**not** authorise **GPS, location tracking, or any employee surveillance**.
