# Botanique Operations Hub — Product Requirements (BD-OPERATIONS-HUB-01)

**Status:** **Authority and planning document only — no implementation.** This records the
expanded Operations Hub product requirements discussed by the founder so that future
phases have a single, reviewed reference. **The requirements beyond the existing hosted
Project Tracker and the completed Phase 1A database foundation are not implemented. This
document authorises no new implementation; each future UI, schema, report or integration
remains separately gated.** It does **not** authorise any UI, migration, expense module,
payment module, application register, chart, report, or integration; each remains subject
to separate phase review.

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
- **Martine Lotom** is the Operations Manager (he/him).
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

**Phase 1B-A2 current boundary:** only **Dashboard** and **Projects** are functional
navigation destinations. Future modules appear only after their own implementation and
authorisation; the shell does not show dead or decorative module links.

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
- Support reconciliation through **dated evidence**.
- Allow **project-level** and **person-level** reports.

> This module is prioritised early in Phase 3 because Botanique has experienced recurring
> reconciliation gaps between original project-labour commitments, approved additions,
> payments made and outstanding balances. Dated, immutable agreement and payment records
> are therefore a priority control.

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
  cannot currently be maintained through the UI (see §N).* **Gated by the mandatory
  schema/RLS/migration preflight in §O.1 — implementation may not begin until that
  field-by-field inspection and any required additive migration are reviewed and
  runtime-tested.**
- **Phase 1B-B — Leads Interface:** Leads menu; campaigns; qualification; follow-up
  queues; lead activity history.
- **Phase 1B-C — Site Visits and Conversion:** site visits / calendar; assessment
  workflow; won-lead-to-project conversion.

**Phase 2:** full timelines · project milestones · design and implementation workflow ·
tasks · blockers · project dates · advanced real-time project tracking (per §S).

**Phase 3:** People & Resourcing · **project engagement agreements** · agreed amounts,
revisions, payments and balances · staff workload · maintenance scheduling.
*Prioritise project engagement / payment control early in this phase* (see §F — recurring
reconciliation gaps between original labour commitments, approved additions, payments made
and outstanding balances).

**Phase 4:** operational expenses · tools / equipment / assets · attire · advertising
costs · owner reporting and charts · applications / opportunities register.

**Phase 5:** website / ad lead ingestion · "Work With Us" application intake ·
Google Calendar · approved notifications and external integrations.

> No phase is implemented by this document or its PR.

## M. Deferred public-credibility item

A separate **"Selected Clients & Organisations We've Worked With"** public-credibility
workstream remains pending. **Candidate organisations and supporting evidence are
maintained in the founder's private working record** (not in this repository). Before any
public use, each candidate requires verification of **official name, engagement
attribution, scope, direct-Botanique versus founder experience, design-only versus
implementation status, and logo-use permission**. No candidate has passed verification, and
none may be published or implemented until it has.

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
into distinct project records** — but this requires a **separately reviewed
data-reconciliation plan** (see §O.2), and is **not** authorised as an automatic split by
this document.

### O.1 Phase 1B-A entry gate — mandatory schema/RLS/migration preflight

Phase 1B-A is **not UI-only work**. Before any form or mutation control is implemented, the
implementation task **must** inspect the live/repository state:

- the current **hosted `projects` table**;
- the repository **foundation migration** (`20260614000100_admin_foundation.sql`);
- existing **project RLS** policies;
- current **triggers** (e.g. `tg_audit_projects`);
- **`project_assignments`**;
- the **`project_financial_references`** separation (owner-only).

It must then produce a **field-by-field and capability matrix** covering: project name;
client / site label; type; location; county; status; stage; responsible person; expected
start; actual start; target completion; actual completion; next action; next-action due
date; blocker; notes; portfolio eligibility; portfolio permission; archived state;
archive / restore provenance; created / updated provenance.

**Clarifications (binding):**

- Audit-provenance fields (`created_by`/`updated_by`/`archived_by` + timestamps) are **not
  automatically a complete change-history ledger**. If full change history is required, it
  needs an **explicitly designed append-only project-activity or revision mechanism**.
- Any **missing field, index, constraint, trigger, RLS policy or history mechanism**
  requires a **separate additive migration** — reviewed and **runtime-tested before** the
  corresponding UI is enabled.
- **No UI-only security.** **No hard deletion.** **No direct modification of protected
  `project_financial_references` by manager-facing forms.**

This preflight is a **formal entry gate for Phase 1B-A** — implementation may not begin
until it is completed and reviewed.

### O.1a Phase 1B-A1 founder decisions (recorded, binding)

The entry-gate audit is **complete** and the Phase 1B-A1 project-integrity migration
(`20260726000200_operations_hub_phase_1b_a1_project_integrity.sql`) is **merged (PR #32,
merge commit `24d84d0a72fef50e57088c5d35e2c05f191e008c`) and applied to hosted
`botanique-admin`** via the linked Supabase CLI, with hosted structural and rollback-only
runtime verification passed and the exact migration version preserved. It records these
binding decisions:

- **Responsible person:** `projects.lead_person_id` is the **single accountable project
  lead** (the field that drives dashboards and workload). `project_assignments` is the
  **wider project team / future visibility model**, not the accountable-lead field.
- **Assignment authority (enforced by `can_assign_project_lead()`):** the caller role is
  gated **first**, so a staff/viewer/no-profile caller is denied even for a `NULL` target.
  The **owner** may assign any **active** owner, manager or staff profile; a **manager** may
  assign **himself or an active staff profile only** — never the owner, another manager, a
  viewer, an inactive/nonexistent profile, or an auth user with no profile. `NULL`
  (unassigned) is allowed for owner/manager. **Enforcement points:** on **INSERT** the rule
  is in the project `WITH CHECK`; on **UPDATE** it is enforced by a **transition-scoped
  `BEFORE UPDATE OF lead_person_id` trigger** that fires only when the lead genuinely
  changes. Retaining an unchanged lead — even the owner, another manager, or a lead that has
  since become **inactive** — must **not** block unrelated operational edits (notes, dates,
  stage, status, next action). A retained inactive lead must be cleared or replaced only when
  `lead_person_id` is next changed.
- **Overdue action** and **Delayed project** are **separate derived concepts**. A **Delayed
  project is derived from `target_completion_date`** (planned vs actual/now), **not** a
  status value — **no `Delayed` status is added**.
- **Full, system-generated project change history begins in Phase 1B-A1** via the immutable
  `public.project_activities` ledger. **Authenticated application roles cannot write
  `project_activities` directly. The normal application path writes through the
  project-history trigger; trusted database-owner or service-role operations remain outside
  RLS and must stay restricted.** A `cardinality(changed_fields) > 0` constraint guarantees
  every recorded event names at least one changed field, and there is no application-role
  INSERT/UPDATE/DELETE. Audit-provenance columns alone are **not** the history.
- **`last_updated` is deprecated from future forms**; **`updated_at` is the authoritative
  last-modification timestamp**. `start_date` = planned/expected start; `actual_start_date`,
  `target_completion_date`, `actual_completion_date` are the new schedule fields.
- The **Tsavo split remains separately gated** (§O.2) and is not part of Phase 1B-A1.
- **Staff onboarding / assignment UI remains deferred** (no staff profiles exist yet).
- **Initial save + refetch** behaviour precedes any **Supabase Realtime**; realtime is a
  later, separately authorised enhancement.

### O.2 Tsavo split — separately reviewed reconciliation plan

Retained as a future requirement, but the split requires its own reviewed plan defining:

- which **new project rows** are created;
- which **fields are inherited** from the holding row;
- how the **original holding record is archived or retained**;
- how **history and references** are preserved;
- how **duplicate reporting is prevented**.

No automatic Tsavo split is authorised by this documentation PR.

## O.3 Operating authority and roles (recorded)

This records the Botanique operating authority. **Documentation only — none of the
workflows below are implemented in PR #32.**

### A. Owner authority — Widson

Widson is the **Owner** and the **final operational approver** and **final financial and
commitment approver**. He is authorised to **approve**, **reject**, **request amendment**,
and **override or reverse** any operational decision, and may **review every project,
update, commitment, payment and exception**.

Every approval, rejection, amendment request, override or reversal must be recorded
**immutably** with: actor; time; record affected; original value; proposed value; decision;
and reason/comment where required. **An override must not erase the original record** — the
original and the amended state both remain in history.

### B. Portfolio Operations Manager authority — Martine

Martine is the **portfolio-wide Operations Manager**. His role is **not limited to the site
where he is physically present**. Martine: coordinates all active projects; mobilises
project staff; mobilises tools and equipment; coordinates materials and site requirements;
reviews project progress; assigns operational responsibilities within authorised limits;
coordinates sites remotely or physically; may **execute delegated payments under approved
commitments**; and submits material exceptions and amendments to Widson.

Martine may operate across the whole portfolio whether he is physically at a project,
Widson is physically at a project, another staff member is acting as site lead, or the
project is coordinated remotely.

Martine may **enter a proposed target completion date** on a Pending project (§O.5a) and may
**supply photos, evidence and project information** for later portfolio review. He may **not**
approve portfolio publication, may **not** change portfolio eligibility or permission status,
and may **not** complete/uncomplete or archive-stage/unarchive-stage a project — those remain
owner-only (§O.3-E).

### C. Distinct operational roles

1. **Owner / Final Approver** — Widson.
2. **Portfolio Operations Manager** — Martine; portfolio-wide coordination and mobilisation.
3. **Accountable Project Lead** — `projects.lead_person_id`; one responsible operational
   lead per project; may be Widson, Martine or an authorised staff profile.
4. **Site Lead / Field Reporter** — the person physically supervising or reporting from a
   site on a given day; may differ from the project lead and the operations manager.
5. **Project Crew** — assigned work only; no project-master or approval authority.

(The currently nurtured field staff member is referenced only by the role
**“site lead / field reporter”**; no personal name is recorded in repository documentation.)

### D. Routine operational updates

Routine project updates should **not** all wait for Widson’s approval. Martine may directly
record or coordinate: daily progress; next actions; blockers; staff deployment;
tools/equipment mobilisation; material requirements; operational notes; work completed;
next-day plan; and routine date/stage updates within authorised project scope.

Widson must be able to **review, accept, flag, request amendment, override or correct** any
of these. The original and amended records must both remain in history.

### E. Material decisions requiring owner approval

Material decisions include: activating a newly created project; classifying a project
Design-only; marking a project Completed (status); **setting or reversing a Completed or
Archived project stage**; cancelling a project; archiving or restoring a project (the
`archived` flag); **portfolio eligibility and portfolio permission / publication status**;
setting or materially revising the target completion; recording final actual completion;
approving a material scope change / additional work; approving or revising a labour/project
commitment; approving exceptional expenditure; approving payment beyond an authorised
commitment; final closure/handover; and retrospective approval of an emergency field payment.

**Interim enforcement (in PR #32, active before the Phase 1B-A2 UI)** — the
`tg_guard_project_material_authority()` `BEFORE INSERT OR UPDATE` trigger makes these
**owner-only at the database** (not hidden-button-only):
- **status** transitions (manager limited to `Ongoing↔Paused`; activation, Completed,
  Cancelled and Design-only are owner-only);
- **stage** = `Completed` or `Archived` in **either direction** (only the owner may set or
  reverse a Completed/Archived stage; other operational stage changes stay open to the manager);
- the **`archived`** flag in either direction (archive/restore);
- **`portfolio_eligible`** and **`portfolio_permission_status`** (portfolio publication);
- **`target_completion_date`** after creation, and **`actual_completion_date`**.

A manager may create only a **Pending, non-archived** project at a **non-Completed/Archived
stage** with portfolio state **Not Reviewed** (a *proposed* `target_completion_date` is
allowed — see §O.5a), and may otherwise perform routine operational edits; a reserved
transition is rejected with a database exception. Unchanged protected values never block a
manager's unrelated operational edits. This interim boundary stores **no proposals** and is
**not** the approval workflow.

**Future formal workflow (Phase 1B-A4, NOT in PR #32):** **Pending approval → Approved /
Rejected / Amendment requested.** A manager may **submit proposed** material changes; Widson
may approve, reject or request amendment; approved decisions are applied through a controlled
mechanism; immutable proposal and decision history is retained. When 1B-A4 lands, the interim
direct-owner restriction above may be replaced by the reviewed approval model. Phase 1B-A2
does **not** provide manager approval-request buttons and no approvals queue exists before
1B-A4.

## O.4 Daily project reporting (future — separately gated)

Future requirement: **one daily project update for every active working site.** A site with
no work that day may submit **“No work today”** or **“Paused today”** with a reason.

A future daily update captures: project; reporting date; reporter; site lead; people
physically present; work completed; staff attendance / labour count; materials received or
used; tools/equipment mobilised; photos/evidence references; blockers; decisions required;
next-day plan; submitted time; Martine review status; and escalation to Widson where
necessary.

Workflow: **Draft → Submitted → Reviewed by Martine → Accepted / Amendment requested /
Escalated to Widson.** Widson may review any update, but routine updates must not all remain
blocked awaiting owner approval. **This is a future, separately gated schema and UI slice —
no `daily_updates` table is created in PR #32.**

## O.5 Delegated payments and financial reconciliation (future — separately gated)

Framed as **financial reconciliation and traceability** (not a dispute). Four distinct
concepts:

1. **Approved commitment** — authorised amount / expenditure envelope for labour, transport,
   materials, tools, subcontractors or another project need.
2. **Payment execution** — Martine may execute payments under delegated authority.
3. **Payment evidence** — recipient; date; amount; method; transaction/reference;
   receipt/photo/proof; and who executed the payment.
4. **Reconciliation** — approved amount; additions approved; amount paid; remaining balance;
   variance; reconciliation status.

Future workflow: **Proposed → Approved → Partially paid → Fully paid → Reconciled.** If an
amount must exceed the approved commitment: **Amendment requested → Approved / Rejected /
Returned for clarification.** Emergency field payment: **Emergency payment recorded →
Retrospective approval required.**

Rules: no payment record may be silently overwritten or deleted; Widson holds final
approval/rejection/amendment authority; Martine may execute approved payments; payments
outside approved authority require escalation; payment proof is mandatory where reasonably
available; reconciliation must show commitment, additions, paid and balance separately.

**Authority boundary preserved:** Simple Invoice Manager remains the **client-finance
authority**; the Operations Hub holds **internal** commitments, delegated payments, evidence
and reconciliation only. Do **not** add client quotations, invoices, receipts, margins or
banking data to manager-readable project records. **No payment, engagement or expense table
is created in PR #32.**

## O.5a Manager-entered (provisional) target completion date

A manager may enter `target_completion_date` **only when creating a Pending project**. It is:

- a **proposed operational planning date** while the project remains Pending;
- **not** an independently approved commitment;
- **accepted when Widson activates** the project — unless Widson revises or clears it first;
- **owner-only after activation:** once the project leaves Pending, only Widson may directly
  change `target_completion_date`, until the Phase 1B-A4 proposal/approval mechanism exists.

Phase 1B-A2 must display the proposed date clearly on the owner’s **Pending-activation
review**. **No separate proposal table is created in PR #32** — the value simply lives on the
project row and is governed by the interim material-authority boundary (§O.3-E).

## O.6 Integrated implementation sequence (dashboard evolves with every slice)

The Operations Hub dashboard is **not** an isolated future item; it evolves with each
authorised slice.

- **Phase 1B-A1 — Project integrity & history foundation (CURRENT PR #32):**
  audit-identity correction; project schedule/blocker fields; responsible-person validation
  (INSERT check + transition-scoped lead-change trigger); immutable project-activity ledger;
  indexes. **No UI.**
- **Phase 1B-A2 — Admin Shell, Essential Project CRUD & Initial Live Dashboard:** persistent
  desktop sidebar; responsive mobile nav; top bar; role badge; global project search; save
  success/failure; refetch/invalidation after save; last-modified display; initial live KPI
  cards (total, active, pending, completed, overdue actions, upcoming starts); initial charts
  (projects by status, by stage, by service type). No fabricated figures; empty states use
  **“No data yet”**; functions are working or hidden; **no dead “future” buttons**.
  Project detail in this slice provides a **project Overview** and a **read-only Activity
  History** (from the immutable `project_activities` ledger; field labels + before/after,
  no raw UUIDs or JSON) — founder-authorised as the minimum useful detail view. No other
  detail tabs are rendered; timeline/files/Tasks/People refinements remain **Phase 1B-A5**.
  The Phase 1B-A2 Overview contains **no commercial-reference editor or financial-reference
  panel**. Quotations, invoices, receipts and payments remain authoritative in **Simple
  Invoice Manager**; this slice retains only the restrained shell boundary statement.
  The admin application uses the **native system UI font** for compact operational
  readability; the public-site typography is unchanged. Presentation labels do not rename
  database roles: `owner` is shown as **Principal** in compact role badges and **Founder &
  Principal** in expanded/formal contexts; `manager` is **Operations Manager**, `staff` is
  **Project Team** unless a real operational title exists, and `viewer` is **Read-only**.
  Width-constrained views use **Widson O. Ambaisi** while selectors and formal contexts
  retain **Widson Omutelema Ambaisi**. Hosted profile data is not altered.
  **Role-scoped authority in this slice (enforced by the interim database boundary in
  §O.1a / the Phase 1B-A1 migration, not by hidden buttons):**
  - **Owner (Widson):** full project create/edit; **activate** Pending projects; mark
    **Completed**; **cancel**; classify **Design-only**; set/reverse **Completed/Archived
    stage**; **archive/restore**; set **target** and **actual completion** dates; set
    **portfolio eligibility** and **portfolio permission/publication status**.
  - **Manager (Martine):** create **Pending** projects (portfolio state fixed **Not
    Reviewed**; a *proposed* target date allowed, §O.5a); routine operational editing
    (notes, next action + date, blocker, `actual_start_date`, non-Completed/Archived
    operational stages, Ongoing↔Paused, location/county/type/descriptions, lead within the
    transition guard); may supply photos/evidence/info for later portfolio review; **no
    material-transition, stage-Completed/Archived, portfolio-publication or
    completion-date controls until Phase 1B-A4.**
  - The interface **shows** controls appropriate to the current role and **hides** manager
    controls not yet authorised — it must not render disabled “future” buttons.
  - Include an **owner-facing “Pending activation” list / KPI** built from **live** data,
    showing per project: **proposed target completion date**, **proposed accountable lead**,
    **stage**, **project type**, and **portfolio state (fixed Not Reviewed)**, with an owner
    ability to **edit before activation**. This is **not** a formal approvals queue — that
    does not exist before Phase 1B-A4 and must not be implied.
- **Phase 1B-A3 — Daily Project Updates & Field Coordination:** daily site-reporting
  schema/UI; site lead/reporter; attendance; progress; tools; materials; evidence/photos;
  blockers; next-day plan; Martine review; escalation to Widson. Dashboard adds: projects
  updated today; projects missing today’s update; last update per project; current site lead;
  projects with blockers; updates awaiting Martine review; updates escalated to Widson.
- **Phase 1B-A4 — Owner Approval & Amendment Workflow:** manager **submits proposed** material
  changes; owner may approve; reject; request amendment; override; immutable proposal +
  decision history; material project changes; completion/cancellation/archive approvals;
  exceptional/retrospective-payment approvals where applicable later. **This slice may replace
  the PR #32 interim direct-owner material-authority boundary with the reviewed approval
  model.** Dashboard adds: approvals awaiting Widson; amendment requests; rejected/returned
  items;
  overdue approvals; exceptional items requiring owner attention.
- **Phase 1B-A5 — Project Detail Refinement:** builds on the Overview + read-only Activity
  History already delivered in Phase 1B-A2. Adds the **richer timeline**; **Files &
  Evidence**; supported **Tasks** and **People** views; **Project Engagements** placeholder
  policy; **Expenses** placeholder policy; and **Activity-History refinements** (grouping,
  filtering, richer actor/context resolution). No module shown as a dead placeholder.
  Supabase Realtime remains optional and separately gated after save/refetch is stable.
- **Phase 1B-B — Leads Interface:** campaigns; leads; qualification; follow-up queue; lead
  activity history; lead-source dashboard charts.
- **Phase 1B-C — Site Visits & Lead-to-Project Conversion:** site visits; assessment
  workflow; calendar; won-lead-to-project conversion; upcoming site-visit dashboard.
- **Phase 2 — Advanced Project Delivery:** milestones; tasks; design/implementation
  workflow; delivery dependencies; advanced blockers; completion forecasting; project
  workload.
- **Phase 3 — People, Project Engagements & Delegated Payments:** People & Resourcing;
  engagement agreements; original agreed amount; approved additions; payments executed by
  Martine or another authorised person; proof; paid/outstanding balances; reconciliation;
  owner approval & exception workflow; staff workload; own-payment visibility. Dashboard
  adds: labour committed vs paid; staff payment balances; approved but unpaid commitments;
  unreconciled payments; exceptions awaiting Widson; staff/project workload.
- **Phase 4 — Expenses, Assets, Applications & Advanced Reporting:** operational expenses;
  tools/equipment/assets; branded attire; transport/fuel; advertising costs; applications
  register; charts and owner reports; project cost reporting; receipt completeness;
  expenditure by category/project/month.
- **Phase 5 — External Intake & Integrations:** website/ad lead ingestion; Work With Us;
  Google Calendar; authorised notifications; approved external integrations; optional
  controlled realtime synchronisation.

**Preserved across all slices:** Botanique palette; public-site Quicksand typography
(with the Phase 1B-A2 admin application using native system UI typography); professional
dashboard hierarchy; no copying Power BI or third-party templates; no fabricated data;
owner-only financial charts; role-appropriate dashboards; **no GPS, location tracking or
employee surveillance.**

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

- Botanique brand palette; restrained, professional visual hierarchy. The Phase 1B-A2
  admin application uses native system UI typography; public-site Quicksand remains
  unchanged.
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
