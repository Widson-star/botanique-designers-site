# Botanique Operations Hub — Product Requirements (BD-OPERATIONS-HUB-01)

**Authority revision:** 31 July 2026. Originally established following Phase 1B-A2;
reconciled after PR #44–#46, the BD-FIN-01 read-only authority gate and BD-FIN-01A
ACTIVE_VERIFIED (PR #48); now establishes BD-FIN-01B — Project Fund Control Authority and
its first slice, BD-FIN-01B1 — Claim-Backed Fund Requests.

**Status:** Founder-requirements authority. This document defines product boundaries,
roles, access expectations and acceptance requirements. It authorises no application,
schema, RLS, integration or hosted-data change. Every implementation slice remains
separately gated.

**Companion authorities:**

1. `WORKSTREAMS.md` — implementation, merge and hosted-state register.
2. This document — founder requirements and acceptance boundaries.
3. `BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md` — domain architecture, systems of record,
   relationships and dependencies.
4. Migrations and application code — implemented technical truth.
5. Historical audits and handoffs — supporting evidence, not governing authority.

Where current-state wording conflicts, `WORKSTREAMS.md` and the merged implementation
govern implementation state. This document governs the founder-required product boundary.

## 1. Product purpose and current production baseline

The Operations Hub is Botanique Designers' internal operating system for moving work from
lead to delivery, maintenance and management reporting:

Campaign → Lead → Qualification → Site visit → Quotation → Awarded project →
Design and implementation → Maintenance → Commercial reporting.

Phase 1B-A2 and the later Approvals, Daily Site Operations and project material-change
slices are merged, production-live and accepted. The current authoritative `main` is
`37bc71ba956c0f5a7c5db3cc38a5a099cebf15e4`.
The current `/admin` application provides:

- authenticated, role-aware access;
- Supabase-backed project records and RLS-enforced authority;
- live Dashboard, Projects, Daily Site Operations, Approvals and Project Intakes modules;
- project create, edit, archive and restore within current role authority;
- owner material actions and manager routine-edit boundaries;
- project search and filters;
- project Overview;
- an immutable, read-only Activity History;
- dashboard attention logic, project charts and summaries, and recent activity;
- responsive desktop and mobile navigation;
- safe local mutation reconciliation;
- no permanent delete;
- no Supabase Realtime;
- no direct client mutation of `project_activities`;
- no commercial-reference editor.

Production currently contains **12 project rows: 10 genuine projects and two archived
PR #44 internal-verification fixtures**. **Alego Usonga**, **Zizu Investments Ltd** and
**Lugulu Residential Home** are genuine records. The archived fixtures are audit evidence,
not client or operational projects. No planning, documentation or visual-verification task
may create test projects or mutate hosted project data.

The current functional navigation destinations are **Dashboard**, **Projects**,
**Daily Site Operations**, **Approvals** and **Project Intakes**.
Accepted Phase 1B-A2 visual and functional decisions are not reopened by this authority
revision.

## 2. Operating context and identity

- Founder and Principal: **Widson Omutelema Ambaisi**.
- Compact operational identity: **Widson O. Ambaisi**.
- Operations Manager: **Martine Lotom**.
- Botanique currently relies substantially on project-based staff, casual labour,
  subcontractors and other authorised workers rather than a permanent general workforce.
- The system must support present operations while allowing controlled future growth.

Use **Widson O. Ambaisi** in navigation, project tables, dashboards, recent activity,
collapsed activity records and constrained accountable-lead summaries. Use
**Widson Omutelema Ambaisi** in formal identity contexts, selectors, expanded records and
complete activity details. Martine Lotom must not be unnecessarily abbreviated.

Database role keys remain unchanged:

| Database key | Visible title |
|---|---|
| `owner` | Principal in compact contexts; Founder & Principal in formal contexts |
| `manager` | Operations Manager |
| `staff` | Project Team, unless a real operational title is available |
| `viewer` | Read-only |

Widson must not be visibly labelled “Owner”. Database keys are not renamed by these
presentation rules.

## 3. Progressive navigation

Navigation is capability-led. A destination appears only when its underlying module is
functional, authorised and accessible to the current role. Dead links, disabled future
buttons and decorative module placeholders are prohibited.

**Current production navigation:**

- Dashboard
- Projects
- Daily Site Operations
- Approvals
- Project Intakes

**Eventual navigation architecture:**

### Operations

- Dashboard
- Leads
- Site Visits
- Projects
- Daily Site Operations
- Project Updates & Discussion
- Tasks & Assignments
- Maintenance
- Approvals

### People and finance

- Team & Resourcing
- Project Engagements
- Project Funds & Reconciliation
- Labour Engagements & Payments
- Client Commercial Records
- Operational Expenditure

### Knowledge and reporting

- Documents & Evidence
- Reports & Management Summary
- Settings

UI labels may later be shortened, but authority documentation retains the complete domain
names.

## 4. Domain boundaries

The following domains are distinct. They must not be collapsed into one finance table, one
form or one implementation workstream.

### 4.1 Client Commercial Records

Tracks what a client was quoted, invoiced, discounted, paid and still owes.

**System of record:** Simple Invoice Manager remains authoritative for estimates,
invoices, receipts, payments, balances and official commercial documents. The Operations
Hub may later hold manually verified references and authorised summaries. It must not
claim an integration that does not exist or duplicate official commercial records.

The existing six-field `project_financial_references` schema is a protected legacy
reference facility. It does **not** satisfy this domain and must not be presented as if it
does.

### 4.2 Project Funds & Reconciliation

Tracks money Widson transfers to Martine or another accountable operational recipient for
one or more projects.

It must eventually support:

- transfer amount and date;
- recipient;
- source or payment reference;
- funded project or projects;
- allocation lines;
- spending against allocations;
- proof and evidence;
- returned funds;
- unspent balance;
- unexplained variance;
- reconciliation submission and status;
- final approval;
- immutable adjustments and history.

This is not client finance, labour commitment management or a generic expense ledger.

The approved first implementation slice toward this domain is **§4.7 BD-FIN-01B1 — Claim-
Backed Fund Requests**, which establishes Principal authority to make funds available
against approved internal cost claims. It does not itself implement transfer, allocation,
spend, evidence, return or reconciliation tracking; those remain later BD-FIN-01B2/01C/01D
slices.

### 4.3 Labour Engagements & Payments

Tracks agreed payment arrangements for Martine, project staff, casual labour,
subcontractors and other authorised workers.

It must preserve and distinguish:

- original agreed amount;
- approved additions;
- total commitment;
- amount paid;
- balance;
- payment references;
- immutable amendment history.

The original agreement must never be silently overwritten. Reports must support both
project-level and person-level reconciliation.

### 4.4 Operational Expenditure

Tracks how project or company money was actually spent, including labour payments,
suppliers, materials, transport, fuel, tools, equipment, attire, advertising,
subscriptions, site visits, office costs and other authorised categories.

An expenditure entry may link to a project fund, labour payment, project, approval or
general company allocation, but it must not duplicate the originating record. Links and
derived reporting preserve traceability across domains.

### 4.5 Daily Site Operations & Morning Compliance

**Status: ACTIVE_VERIFIED (2026-07-29) — live in production; authenticated owner + manager
verification complete.** (Previously APPLIED_WITH_LIMITATION.) This
subsection defines a new operational domain under `BD-OPERATIONS-HUB-01`. It is not a new
top-level workstream and requires no new master register — the existing authority hierarchy
governs it. The first narrow slice (Daily Site Entry capture, review/correction lifecycle,
owner compliance waivers, morning-compliance calculation, Dashboard attention state and a
mobile-first admin interface) was implemented, validated on a disposable local PostgreSQL 17
matrix, and **merged** (PR #41) at authoritative `main`
`dfb79373397637694fa26d730c110da58f20acae`. Its additive migration
`20260728000200_operations_hub_daily_site_operations.sql` is **applied to hosted
`botanique-admin`** (recorded version `20260729064007`), the production frontend is active, and
**authenticated production use has occurred**: on 2026-07-29 the Operations Manager (Martine
Lotom) created and submitted the first legitimate Daily Site Entry for **Alego Usonga** (6
workers × KES 500 = KES 3,000 planned labour; evidence *provided*; submitted 10:09 EAT and
correctly flagged **late**; two immutable lifecycle events *created* + *submitted*). The owner
sees the submitted entry with Return / Accept / Void controls; the manager sees no owner
review controls; morning compliance reads Due 2 / Missing 1 (Karen) / Late 1 (Alego) /
Waived 0. The submission created **no** approval request or event, and **no** waiver exists.
All four prior limitations are now **closed** (authenticated exact-preview verification,
2026-07-29): the responsive `/admin/daily-site-operations` list layout defect is **repaired and
verified** (auto-layout six-column desktop table + stacked mobile cards, corporate-language
labels, and a single owner-only **Portfolio publication status** control replacing the old
eligible-checkbox + permission-dropdown pair via display-only mapping — **no migration, no
automatic public publication**); owner and manager exact-preview verification **PASSED**; and
Martine's authenticated new-entry selector confirmed to list **both** Alego and Karen. The
former manager-material-change governance gap is **closed** by the ACTIVE_VERIFIED PR #44
controls described in §5.2. See WORKSTREAMS.md → *Daily Site Operations & Morning
Compliance* for the full note (schema, versioning/supersession, RLS/role boundary,
compliance/EAT handling, the verified first entry, the layout defect and remaining
limitations). Manager authority is **project-authority scoped**
(`lead_person_id` or an active `project_assignments` row), realising the documented
portfolio-wide Operations Manager authority through the existing model rather than a
role-wide bypass. The founder has used the authorised Project edit interface to set the
accountable **lead** of **Karen Residence — Fountain Garden & Mature Borders** to **Martine
Lotom** (recorded in Activity History); combined with his existing lead of **Alego Usonga**,
the Operations Manager is now authorised for both current in-scope Ongoing sites via lead
authority, so the **blocking rollout prerequisite is satisfied** with no separate assignment
row required. Operational Expenditure remains deferred to a separate second slice.

#### 4.5.1 Purpose and operational problem

Botanique's live site operations are currently coordinated informally over WhatsApp:
labour is recorded as *worker count × daily rate* (for example 8 workers × KES 500 or
4 workers × KES 500), varying day to day; deliveries (grass, flowers) and hired-tool,
handcart-transport and other miscellaneous costs are noted by hand; project advances,
carried-forward balances, additional deposits, unpaid balances and combined multi-project
totals are negotiated and corrected in chat; and funds are handled by Martine across
Lugulu, Siaya/Alego, Kitisuru, Karen, Bungoma and other sites. This process is hard to
audit, easy to misunderstand and vulnerable to disputed corrections. Daily Site Operations
replaces the informal morning coordination with a structured, auditable **Daily Site
Entry** for each active site, captured before other Operations Hub work.

#### 4.5.2 First-morning-action expectation and active-project coverage

Martine's first required Operations Hub task on every working morning is to record a Daily
Site Entry for **every active site under his management** for that work date. Each in-scope
project (Ongoing and operationally active — §4.5.8a) without an entry for the current work
date remains flagged as outstanding until an entry exists.

#### 4.5.3 Conceptual Daily Site Entry

Each Daily Site Entry conceptually captures, for one project and one work date:

- project; work date; whether work is taking place;
- number of workers expected; optional named workers or crew reference;
- rate per worker or an agreed labour total; planned labour cost;
- work planned for the day; funds already available; additional amount requested; notes;
- submitted-by and submitted-time (system-stamped).

The record must later be capable of holding day-end fields — actual worker count, actual
labour cost, actual work completed, day-end notes and any unresolved difference — **without
these being implemented in the first slice**.

#### 4.5.4 "No work today" handling and disposition

A no-work day must be recorded **explicitly**, never by forcing a false worker count of
zero into a "working" entry. A Daily Site Entry carries exactly **two dispositions** —
`working` or `no_work` — and a `no_work` entry carries a **no-work reason**, one of:

- `rain`;
- `weekend_no_activity`;
- `temporarily_paused_for_day`;
- `no_labour_required`;
- `site_access_unavailable`;
- `other`.

A `no_work` entry still satisfies the morning-compliance obligation for that project and
date.

**Paused semantics — two distinct concepts, deliberately not conflated:**

1. **Project lifecycle status** — an officially **Paused** project (a `projects` status)
   is normally **excluded** from automatic morning compliance (see §4.5.8a).
2. **Daily operational disposition** — an otherwise **Ongoing** project may have `no_work`
   on a particular date with reason `temporarily_paused_for_day`, meaning activity is
   paused for that day only.

The Daily Site Entry disposition is therefore **not** named "paused", and it must **never**
activate, pause, complete, cancel or otherwise mutate the project lifecycle. Recording a
`temporarily_paused_for_day` entry does not change `projects.status`.

#### 4.5.5 Domain distinction

Daily Site Operations is distinct from, and must not be collapsed into, Labour Engagements
& Payments (§4.3), Project Funds & Reconciliation (§4.2) or Operational Expenditure
(§4.4). It captures the **operational plan and site actuals** — attendance intent,
expected and (later) actual workers, work planned and (later) work completed, and no-work
status. It does **not** own agreed labour commitments and payments, fund transfers and
reconciliation, or the expenditure ledger. Planned labour cost and "additional amount
requested" on a Daily Site Entry are operational planning signals, not a payment, a
commitment record or a fund release. Actual money movement is later governed by the
finance domains and, where required, by the Approvals foundation.

#### 4.5.6 One-project-per-record invariant

Every Daily Site Entry belongs to exactly one project. No entry, and no future
expenditure, labour or fund row, may combine Lugulu, Siaya/Alego, Karen or any other sites
into a single underlying record. Combined multi-project accountability totals are **derived
aggregates only**, computed from per-project records — never stored as a shared ledger row.

#### 4.5.7 Lifecycle states

The recommended Daily Site Entry lifecycle is: **draft → submitted →
returned_for_correction → resubmitted → accepted → voided → superseded**. Rules:

- an ordinary daily entry does **not** require owner approval before submission;
- the owner may review a submitted entry and return it for correction;
- an accepted entry cannot be silently rewritten;
- a correction after acceptance must preserve the prior record (supersession, not
  in-place edit);
- there is no hard deletion of operational accountability history;
- a void or supersession requires a reason and the acting identity.

The state machine is documentation only in this task; no SQL state machine is created.

#### 4.5.7a Role authority

- **Owner / Principal (Widson):** full visibility; sees all missing morning entries and
  late/submitted entries; reviews and may return inaccurate entries; sees company-wide
  derived summaries; controls future fund release and exceptional/high-risk financial
  approvals; may authorise a post-acceptance correction.
- **Operations Manager (Martine):** submits morning entries for projects under his
  authority; records planned and (later) actual worker counts; records planned and (later)
  actual work; records no-work days; may correct returned entries; **cannot** silently
  alter accepted records; **cannot** receive unrestricted finance authority; **cannot** see
  owner-protected commercial or banking information.
- **Project Team (staff):** no financial authority in the first slice; future attendance
  confirmation may be considered as separate, later work; no staff-originated money records
  unless separately authorised.

No monetary thresholds are invented in this authority.

#### 4.5.8 Morning-compliance model (soft enforcement)

The first slice uses **soft enforcement only**:

- the Dashboard shows a "Morning site entries due" state;
- each in-scope project (see §4.5.8a) without today's entry remains flagged;
- the manager can still fully view and use the system — **no destructive lock**;
- the owner can see late or missing entries;
- an entry disposition is `working` or `no_work` (§4.5.4);
- no external notifications and no Supabase Realtime in the first slice.

**Submission expectation:** a Daily Site Entry should be submitted **before work begins**
and ordinarily **no later than 08:30 East Africa Time (EAT)**. This is a management
expectation, **not** a destructive system cut-off. After 08:30 EAT: the entry may be
marked **late**; the manager can still submit it; the system must **not** lock the manager
out; and the record retains the **actual submission timestamp**.

#### 4.5.8a Project coverage

Morning compliance applies only to projects that are **Ongoing and operationally active
under the manager's authority**. The following are **excluded from automatic daily
compliance**: Pending projects; projects Awaiting Approval; Completed projects; Design-only
projects; Archived projects; and genuinely **Paused** projects (the lifecycle status,
distinct from a `temporarily_paused_for_day` disposition — §4.5.4). Pending-activation
projects are **not** treated as requiring morning entries. An excluded project may still
receive a **voluntary** Daily Site Entry when an exceptional visit, delivery or operational
activity occurs.

#### 4.5.8b Owner waiver

The owner may **waive** a missing Daily Site Entry for **one project and one work date**. A
waiver preserves project, work date, reason, owner identity and timestamp. A waiver
**satisfies** the compliance requirement for that project/date but does **not** create or
imply workers, labour cost, work performed, expenditure or funds received.

#### 4.5.8c Persistent non-compliance (first slice)

Persistent missing or late entries produce **visible signals only**: Dashboard flags, a
missing-entry count, a late-entry count, owner visibility and auditable compliance history.
The first slice does **not** restrict Dashboard access, project access, editing or any
later action. Any future action restriction requires evidence from actual operational use,
separate founder approval, a separate authority revision and its own implementation gate.

#### 4.5.9 Data-integrity principles

- every Daily Site Entry belongs to one project (§4.5.6);
- creator and timestamp are system-stamped; the client cannot spoof actor identity;
- accepted records preserve immutable history; corrections require a reason; no direct
  deletion;
- no ordinary daily entry is forced through owner approval;
- money-release and reconciliation acceptance may later reuse `approval_requests` /
  `approval_events` (see §4.5.10).

#### 4.5.10 Approvals reuse (assessment, not implementation)

The merged Approvals foundation (`approval_requests`, immutable `approval_events`, the
`project` domain, `subject_record_id`, immutable events and narrow SECURITY DEFINER
functions) is assessed as **extensible later** to cover fund release, exceptional
expenditure, reconciliation acceptance and post-reconciliation correction — by adding new
approval domains/types under its existing pattern. The approval schema is **not** changed
in this task, and Daily Site Entry submission itself is deliberately **not** an approval:
ordinary daily entries flow draft → submitted → accepted without an approval request.

#### 4.5.11 Evidence and receipts boundary

First slice: **evidence status only** — one of none, promised, provided, not_required. No
file upload is built in the first slice. Actual receipts, photos, delivery notes, signed
attendance and other attachments depend on the future Documents & Evidence domain (§9) and
are deferred to it.

#### 4.5.11a Daily Attendance Evidence (Daily Labour Register)

**Authority defined; not implemented in this slice.** This authority supports Botanique's
**casual and locally sourced labour model** — permanent worker profiles are **not** required
for every casual worker. Each **working** Daily Site Entry should support an uploaded,
**project-specific Daily Labour Register** evidencing attendance, containing: project; work
date; worker names; telephone numbers; **limited identity reference where necessary**;
roles/tasks; and signatures or attendance confirmation. Casual and locally sourced workers
are evidenced through this register rather than through permanent profiles.

- **Timing.** The morning operational plan is recorded **before work begins** (ordinarily by
  08:30 EAT — §4.5.8); the supporting attendance register should ordinarily be uploaded
  against the correct Daily Site Entry **by 9:00 a.m. EAT**. Late submission remains
  **allowed and auditable** (never a blocking cut-off), retaining the actual timestamp.
- **Absent-Martine flow.** Where Martine is absent, the site representative or the workers
  complete the register and send it to him; **Martine uploads it against the correct
  project/Daily Site Entry**. Accountability for the upload stays with the Operations
  Manager.
- **Profiles vs register.** Regular staff (for example Martine and Waweru) **may later** have
  reusable worker profiles; casual workers remain **register-based**. This slice introduces
  no worker-profile registry and no roster.
- **Storage and privacy.** Actual file upload and storage of the register belong to the
  future **Documents & Evidence domain (§9)** and are **deferred to it**; they must follow
  **data-minimisation** (limited identity reference only where necessary; no unnecessary
  personal data) and **retention** rules. Until that domain exists, the first slice records
  only `evidence_status` (§4.5.11) — it does **not** upload, store, roster or pay against the
  register, and no labour-payment workflow is created here.

#### 4.5.12 Mobile-first requirement

The Daily Site Entry must be designed primarily for Martine's phone. Expected interaction:
select project; choose working or no-work; enter worker count; enter rate or agreed total;
automatic worker-count × rate calculation; enter planned work; record available funds;
record additional amount requested; submit; quickly repeat for another site. The design
must use large touch targets, minimal typing, clear KES display and a simple mobile
layout, with **no** raw UUIDs, no raw JSON, no accounting jargon and no multi-project
transaction form. Detailed screen design is out of scope for this documentation task.

#### 4.5.13 Founder decisions resolved

The founder has resolved the five previously open decisions; they are now authority:

- **Submission expectation:** before work begins and ordinarily no later than 08:30 EAT — a
  management expectation, not a destructive cut-off; after 08:30 an entry may be marked late
  but the manager is never locked out and the actual timestamp is retained (§4.5.8).
- **Weekends:** no automatic Saturday/Sunday entry is required; a weekend entry is required
  only when work is planned, workers are deployed, a delivery is expected or a site
  visit/operational activity is scheduled. A weekend without scheduled activity creates no
  overdue compliance item (§4.5.4 reason `weekend_no_activity`, §4.5.8a).
- **Project coverage:** Ongoing, operationally active projects only; Pending, Awaiting
  Approval, Completed, Design-only, Archived and genuinely Paused projects are excluded, and
  pending-activation projects do not require morning entries (§4.5.8a).
- **Owner waiver:** the owner may waive one project/date, preserving project, date, reason,
  owner identity and timestamp, without implying workers, cost, work, expenditure or funds
  (§4.5.8b).
- **Persistent non-compliance:** soft enforcement only — visible flags, counts, owner
  visibility and auditable history, with no first-slice restriction of access, editing or
  later actions; any future restriction needs its own evidence, approval and authority
  revision (§4.5.8c).

### 4.6 BD-FIN-01A — Internal Cost Claims and Principal Decision

**Status: product contract approved; ACTIVE_VERIFIED (2026-07-31) on PR #48, which contains
the implementation introduced by commit `74a25babc411ef42a38dad882d14e00261aca32e`. The PR
was open, draft and unmerged at the authenticated acceptance checkpoint described below; its
final reviewed head was `de824688977c15ac86785f53b01559dbd9fde3eb`, and it subsequently
merged on 31 July 2026 at merge commit `92055ed84a3db4eee6979b3eae54339792e1cd54`.
Authoritative main is now that merge commit — this status describes hosted and
authenticated verification, not merge state.** The separately authorised implementation is
based on authoritative base `d5986af66bec550567408e99b61d170607daee75`. Migration
`20260731000200_internal_cost_claims.sql` has been applied to hosted `botanique-admin`
(`wcacyfyxjiysfibuuhgf`) as hosted version `20260731160117`, with schema/RLS/grants and
existing-data preservation verified and Principal/Operations Manager RPC authority verified
via fully rolled-back hosted SQL transactions; no persisted claims exist. `APPLIED_WITH_
LIMITATION` was a historical checkpoint: manual authenticated Principal and Operations
Manager UI verification against the exact PR-head Vercel preview subsequently passed, with
no claim submitted and all three new tables remaining at zero rows; Staff/Viewer UI
verification remains unavailable because no such accounts exist, with their denial covered
by the PostgreSQL and capability test matrices instead. This maintained product contract
does not by
itself authorise deployment. BD-FIN-01A is the first implementation slice of BD-FIN-01. It records what
Botanique is expected or authorised to pay for an internal project cost and its decision
history before any actual money movement is introduced.

The domain keeps **planned, claimed, submitted, approved, released, paid and reconciled**
distinct. BD-FIN-01A implements only planned context, claimed amounts, submission and
approval where applicable. Approved never means released or paid.

The first slice includes project-scoped claims; one recipient or crew per claim; one cost
category; one or more structured line items; a service/work date and purpose; a KES total
derived from lines; an optional Daily Site source; manager submission; Principal amendment
request, approval and rejection; withdrawal; controlled cancellation; Principal direct
authority; immutable events; and strict project-scoped manager visibility.

Whole-claim approval is required. Independently owed or approved recipients/scopes are
separate claims; unrelated recipients must never be combined. A Principal-originated
obligation is recorded as a distinct direct-authority action and immutable event, such as
`principal_authorised`, not as a request followed by self-approval.

The compact authoritative claim lifecycle is **draft → awaiting review → amendment
requested → approved / rejected / withdrawn / cancelled**. Submission and resubmission are
immutable events that move the claim to awaiting review. Funded, partially funded, paid,
partially paid and reconciled are not claim lifecycle states; they are deferred, derived
states belonging to later money-movement domains.

Daily Site remains the operational planning source. The draft implementation's explicit **Create cost claim**
action may copy project, date, source version and planning context into a separate editable
finance draft. There is no automatic claim creation. A Daily Site estimate never becomes a
liability or actual expenditure by itself; later Daily Site changes cannot silently alter a
submitted or approved claim, finance cannot rewrite Daily Site history, and one Daily Site
entry may support multiple claims.

Principal authority is company-wide and includes direct authorisation, approval, rejection,
amendment request and controlled cancellation or future compensating correction. The
Operations Manager may see only assigned/led projects, create and edit eligible drafts,
submit, amend/resubmit when requested, and withdraw where permitted; the manager has no
self-approval or company-wide finance visibility. Staff and viewer have no first-slice
finance visibility or authority.

Implementation must later prevent self-approval, archived/fixture use, wrong-project or
mixed-project costs, silent editing of approved facts, stale approval after material
amendment, direct client DML against protected finance tables, exposure of unnecessary
worker identity data, and treatment of planning amounts as expenditure. Manager scope must
be enforced independently in finance RLS and controlled functions using current project
lead or active-assignment authority; application filtering is not a security boundary, and
broader manager-read policies from other domains must not be copied automatically.

Excluded from BD-FIN-01A: fund requests/releases, accountable advances, payments,
allocations, reconciliation, returned balances, carry-forward, reimbursements, evidence
uploads, worker master records, project-spend reporting, client-commercial records and
Simple Invoice Manager integration. The two archived PR #44 fixtures are not eligible for
finance selectors or mutations; current archive and operational-eligibility controls govern
initial implementation unless a later project-classification change is separately approved.

### 4.7 BD-FIN-01B — Project Fund Control Authority

**Status: documentation authority (this revision); implementation not yet started or
authorised.** BD-FIN-01B is the next approved finance authority after BD-FIN-01A
ACTIVE_VERIFIED. It defines how Botanique requests Principal authority to make money
available against approved internal cost claims. A fund-request approval means the
Principal authorises Botanique to make up to the approved amount available for the
identified project claims. Approval does not mean funds were transferred, cash was handed
over, Martine received an advance, a worker or supplier was paid, a payment was allocated,
or an expense was reconciled.

Future slices remain distinct and must not be collapsed: **BD-FIN-01B1 — Claim-Backed Fund
Requests** (this section), **BD-FIN-01B2 — Fund Releases and Accountable Advances**,
**BD-FIN-01C — Payments and Claim Allocations**, and **BD-FIN-01D — Reconciliation, Returns
and Reversals**.

**Claim-backed requests only.** Ordinary fund requests must be backed by one or more
approved internal cost claims. General project advances before claims exist are deferred
and require separate authority.

**One project per request.** A request may link one or more approved claims, but every
claim must belong to the same project as the request. No request, balance or allocation
may mix projects.

**Multiple claims.** One Alego request may cover, for example, casual labour, mason work
and mkokoteni service. Each linked claim retains its own requested allocation. Lugulu
claims may not be included in an Alego request.

**Partial requests.** A claim may be partly requested. An approved KES 20,000 claim may
have only KES 12,000 requested, leaving KES 8,000 approved but not yet requested. The
authority and future implementation must distinguish the approved claim amount, the amount
previously reserved by active requests, the amount in the current request, and the
approved amount still available for request.

**No over-request.** The cumulative amount reserved against a claim by relevant active or
approved requests must not exceed the approved claim amount. Rejected, withdrawn or validly
cancelled requests must not continue reserving the claim amount.

**Intended custody.** A request may identify the intended funding model — Operations
Manager accountable advance, or direct recipient funding. This is only the intended custody
or recipient model; it is not evidence that money was released.

**Role and authority model.** The Operations Manager may create a draft claim-backed fund
request, select approved claims from one project, allocate requested amounts, submit,
amend after an amendment request, resubmit, withdraw before release, and view authorised
project requests. He may not approve his own request, over-request a claim, mix projects,
mark funds as released, approve his own receipt, or perform final reconciliation.

The Principal may view all fund requests, approve, reject, request amendment, create a
distinct Principal direct-authority request, cancel an approved request before any later
release exists, and later authorise releases and approve final reconciliation. Principal
direct authority is a distinct action and immutable event, never modelled as a fake
self-request-and-self-approval sequence.

Staff and Viewer retain restrictive finance access with no mutation authority; any
visibility must follow the existing capability and project-access model rather than being
assumed.

**Request lifecycle.** A manager-requested lifecycle equivalent to `draft`, `submitted`,
`amendment_requested`, `resubmitted`, `approved`, `rejected`, `withdrawn`, `cancelled`, with
valid transitions (not merely a list of states): `draft → submitted`;
`submitted → approved`; `submitted → rejected`; `submitted → amendment_requested`;
`amendment_requested → resubmitted`; `draft`/`submitted`/`amendment_requested → withdrawn`,
subject to exact authority rules; and `approved → cancelled` only through controlled
Principal authority and only before a future release exists. A separate Principal
direct-authority lifecycle is documented independently. Immutable events and
non-destructive correction principles are preserved.

**Product-level data authority (no migration authorised).** A **fund request** likely
carries a request identifier/number, project, authority type, requester or Principal
authority actor, intended custody model, intended recipient/custodian, purpose/note, total
requested amount, status, version, and created/submitted/decided/cancelled timestamps.
**Fund request allocations** each conceptually identify a fund request, an approved
internal cost claim, and the amount requested against that claim. The future database must
guarantee that the request and claim use the same project, the linked claim is approved,
allocation amounts are positive, allocation totals equal the request total, and cumulative
relevant requests do not exceed the approved claim amount. Immutable events are defined for
at least draft creation, allocation addition/amendment, submission, amendment request,
resubmission, approval, rejection, withdrawal, cancellation and Principal direct authority.

**Domain relationships.** Internal cost claims remain the authority for what cost is
recognised, who or which crew is owed, structured value and Principal decision; a fund
request references claims but does not replace or mutate claim authority. Daily Site
remains operational planning authority; no Daily Site amount automatically becomes a
request, release, payment or expenditure. Future releases (BD-FIN-01B2) will record actual
money movement — amount, date, method, recipient/custodian, approved request, direct
funding versus accountable advance, acknowledgement status and reversal status; a release
to Martine is a custody transfer, not automatically a worker or supplier payment. Future
payments (BD-FIN-01C) will record delivery of money to final economic recipients and
allocate those payments to claims. Future reconciliation (BD-FIN-01D) will establish amount
released, valid payments, returns, approved same-project carry-forward, outstanding
accountable balance, disputes and reversals; no carry-forward may silently cross projects.
Simple Invoice Manager remains authoritative for client estimates, invoices, receipts,
payments, balances and discounts and is not redesigned or integrated.

**Excluded from BD-FIN-01B1:** actual fund releases; M-Pesa, bank or cash transaction
records; transaction references; acknowledgements of receipt; direct payments; onward
payments by Martine; payment-to-claim allocations; supplier settlement; worker payment
status; proof-of-payment uploads; reconciliation; unspent balances; returns; same-project
carry-forward; disputes; failed-transfer corrections; reversals; general unbacked
operational advances; dashboards; profitability reporting; Simple Invoice Manager
integration; new worker-privacy or identity storage; and automatic Daily Site funding. This
documentation revision authorises no table, migration, RLS, function, hosted mutation, UI
or deployment.

## 5. Approvals foundation — ACTIVE_VERIFIED

The reusable Approvals foundation and expanded project material-change controls are merged,
hosted and **ACTIVE_VERIFIED**. Later operational and financial domains may reuse its
constrained authority and immutable-event patterns, but must retain their own business
semantics and receive separate implementation authority.

Approval classes must be extensible to cover:

- project activation;
- completion;
- cancellation;
- archive and restoration;
- target-date changes;
- material scope changes;
- additional labour commitments;
- exceptional expenditure;
- project-fund reconciliation;
- retrospective emergency expenditure;
- portfolio or publication permission.

Supported lifecycle states should include **Submitted**, **Awaiting review**,
**Approved**, **Rejected**, **Amendment requested**, **Resubmitted** and, where
appropriate, **Withdrawn**.

Every approval must preserve:

- requester and approver;
- related record and approval class;
- original value or condition;
- proposed value or condition;
- reason;
- decision and decision notes;
- submission, decision and lifecycle timestamps;
- immutable proposal, amendment and decision history.

The Phase 1B-A1 `tg_guard_project_material_authority()` trigger is an interim
database-enforced material-transition control. It stores no proposal, review or decision
record and is not an approvals workflow. It must remain unchanged until a separately
reviewed approvals implementation preserves equivalent or stronger authority. Any later
replacement requires its own migration, RLS review, runtime verification and controlled
rollout.

### 5.1 First implemented slice

The first Approvals implementation slice merged under PR #36 and its additive migration
was applied to hosted `botanique-admin`. At that dated checkpoint, hosted schema, RLS,
grants and pre-existing-data integrity were verified with the then-current nine projects
unchanged and both approval tables empty. The production React `#418` console error was a route-aware
hydration defect on `/admin`, since repaired and merged under PR #38 (merge commit
`f95e31f55c0d74844b79aaca3ac831ed3bb1208a`). Owner authenticated verification passed on the
exact-head PR #38 preview with a clean console and no `#418`, and signed-out `/admin` is
verified clean on production desktop and mobile. That initial slice's
`APPLIED_WITH_LIMITATION` checkpoint is historical; PR #44 later closed the material-change
gap and established the current **ACTIVE_VERIFIED** Approvals status. The slice remains
deliberately limited to project activation,
target-completion change, completion, cancellation, archive and restoration. Design-only
classification, portfolio/publication permission, material scope, project-lead changes,
staff-originated requests and every financial/future domain remain excluded.

The implemented workflow uses constrained project-specific database functions rather than
a generic mutation engine. It preserves immutable request rounds and events, prevents
duplicate active project/type requests, revalidates stale originals before decision, and
applies an owner-approved project change atomically. The existing material-authority and
project-lead guards remain unchanged and continue to reject manager direct bypasses.

The functional admin module adds a role-scoped Approvals queue/detail and manager request
actions from project detail. It does not add Realtime, notifications, evidence/documents or
future-domain navigation.

### 5.2 Project Material Change Approvals and Manager Project-Scope Control (Phase 1B-A4)

Status: **ACTIVE_VERIFIED** (31 July 2026; PR #44 merged and closed; `20260729000100`
and corrective `20260731000100` applied exactly once, structurally verified and
authenticated on exact preview head `df5ea4eba0a278f00c311f0e93bbc95dfde6c978`).
Additive to §5.1; the six lifecycle types are preserved and never duplicated. PR #44
merged into authoritative `main` at
`05b6ade06f7ba2d4fdfb5c9d4ef1b591ea4e02e7` on 31 July 2026.

The controlled hosted rollout on 30 July 2026 applied only migration `20260729000100`
through the transactional linked Supabase CLI path after a dry run listed that version
alone. Migration history is canonical and contains the target exactly once. Hosted
tables, functions, ownership, fixed search paths, triggers, RLS and grants passed read-only
verification. Deterministic pre/post fingerprints confirmed all nine projects, profiles,
assignments, existing project activities, approvals and Daily Site rows unchanged;
approval rows remain 0/0, intake rows remain 0/0, and no migration-generated project
activity exists. At this 30 July pre-authentication checkpoint, expanded Approvals was not
yet `ACTIVE_VERIFIED`; this checkpoint is retained as history. The final authenticated
verification completed on 31 July and established the current status above.

The revised production baseline is 12 physical project rows: 10 genuine
operational/portfolio projects and two archived PR #44 fixtures
(`bf257eb0-e144-416c-a72e-67dfc09df3ee`,
`0197700b-4f86-4b33-94ed-0ee208f100bb`). The fixtures are
`ARCHIVED_INTERNAL_VERIFICATION_FIXTURE` records created during the authorised
Codex-controlled verification using the authenticated Principal session. They remain
immutable audit evidence and are excluded from genuine-project reporting; neither has a
Daily Site/financial/public-Portfolio record. The original-nine fingerprint remains
`4bdcb35ba4017dc7215a9a83fe9b76eb`.

The genuine tenth project is Lugulu Residential Home
(`f4c3d970-eaf9-4639-8e53-fdf1088a5855`), created directly under the authenticated
Principal and subsequently assigned to Martine Lotom; no approval or intake created it.
The genuine 31 July Alego Daily Site entry
`b3e1703a-3140-4555-ad2f-0db7ee1fd5f6` is returned for correction and its three immutable
events explain the Daily Site change from 3/11/0 to 4/14/0. It is an operational planning
record only: no payment, liability, approval or fund release was created.

Corrective migration `20260731000100` was the only linked dry-run item and applied
transactionally from 07:01:59–07:02:21 UTC with Supabase CLI 2.109.1. It adds an independent
manager direct-status guard and repairs terminal-intake owner/requester visibility. The
enabled fixed-search-path trigger rejected a manager-authorised Lugulu status attempt with
zero affected rows; terminal intake reads returned all three rows for owner/requester and
zero for an unrelated actor. Every pre/post count and fingerprint matched, including all
12 projects, genuine ten, original nine, Lugulu, both fixtures, activities, approvals,
intakes, Daily Site, Portfolio and zero financial references.

The earlier “manager activated directly” test result was a harness false positive, not a
proven production mutation: an out-of-scope fixture was filtered by manager RLS, the UPDATE
affected zero rows, and the test treated the no-op as success. Repaired tests distinguish a
zero-row no-op, an explicit rejection and a committed mutation. The independent trigger is
retained as defence in depth.

Final focused authenticated reverification passed on 31 July 2026. Principal and Martine
Lotom each reloaded and revisited the existing approved, rejected and withdrawn intake
details: terminal state, requester, round, immutable timeline and the approved
human-readable project link remained available; no stale warning, invalid terminal control,
blank state, redirect or access loss appeared. Existing approved/rejected material and
pause/resume/accountable-lead routes remained readable. Principal retained direct status,
lead and material edit authority with normal Save; Martine's direct form exposed only
`next_action`, `next_action_date`, `blocker` and `notes`, with status/material changes
proposal-only and no owner controls. Both consoles were clean. Unrelated-manager denial
remains `DATABASE_AUTHORITY_VERIFIED` through the isolated 3/3/0 owner/requester/unrelated
probe; no third profile was created. Browser interception was unavailable, so failure
cleanup was not manually driven against production; frontend tests cover stale RPC,
undefined/malformed response, network rejection and Supabase error objects without false
success, stuck `Working…` or TypeError.

Post-pass counts and every authority fingerprint matched the accepted baseline, including
12/10/2 projects and Daily Site 4/14/0; no genuine project or fixture changed and no project,
approval, intake, Daily Site or financial row was created. Frontend 36/272, all three
isolated PostgreSQL matrices, changed-file lint, the unchanged 19-finding exact-main lint
baseline, 43-route build/prerender and `git diff --check` passed.

**Verified governance gap.** Beyond the six lifecycle transitions already reserved to the
owner, a manager could directly change material project **identity, authority and schedule**
fields and see/create any project. The founder's governance is: owner edits directly;
manager proposes material changes; the project is unchanged until owner approval; approved
changes apply atomically; rejected/amendment/withdrawn changes never mutate the project;
low-risk operational fields stay direct and audited.

**Manager visibility model (RLS-enforced, not UI-only).** A manager operates only on
projects they lead (`lead_person_id`) or are actively assigned to (`project_assignments`);
the owner is company-wide. Dashboard counts, lists, charts, search and activity respect this
scope. Consistent with the Daily Site authority model, so Martine retains Alego/Karen/Mununga.

**Material field allowlist (exact mapping).**

| Field | Manager path | Owner path |
| --- | --- | --- |
| `project_name`, `client_site_name`, `location`, `county`, `project_type`, `status` (Ongoing↔Paused only), `stage` (non-terminal), `lead_person_id`, `start_date`, `actual_start_date` | `project_material_change` proposal | direct edit |
| `next_action`, `next_action_date`, `blocker`, `notes` | **low-risk direct** (audited) | direct edit |
| activation (Pending→Ongoing), target completion, completion, cancellation, archive, restore | existing dedicated lifecycle approval type | direct/quick action |
| `portfolio_eligible`, `portfolio_permission_status` (**OWNER_ONLY** — no manager proposal path in Phase 1B-A4), Design-only classification, terminal (Completed/Archived) stage, `actual_completion_date` | **owner-only** (no manager path) | direct/quick action |

**Project status is NOT low-risk (authority correction).** A status change alters
active/paused counts, Dashboard reporting, Daily Site compliance expectations, staffing and
attention, so a manager has **zero** direct status write. The single Ongoing↔Paused
transition is a `project_material_change` proposal (validated to Ongoing↔Paused on an
already-active project); activation, completion, cancellation, archive and restore keep
their dedicated lifecycle types, and Design-only stays owner-only — no duplicate/conflicting
paths. Status-transition matrix: Pending→Ongoing = `project_activation`; Ongoing↔Paused =
`project_material_change`; Ongoing/Paused→Completed = `project_completion`; →Cancelled =
`project_cancellation`; archive/restore = `project_archive`/`project_restore`; Design-only =
owner-only direct.

The **low-risk direct** set (§8) is exactly `next_action`, `next_action_date`, `blocker`,
`notes` — a manager write **only on an authorised project**, recorded in
`project_activities` with the exact actor and role, creating **no** approval request. Status,
stage, lead, project identity, location/county, type, planned/actual start, completion
fields, portfolio status and archive state are never low-risk.

**Portfolio (explicit).** `portfolio_eligible` and `portfolio_permission_status` are
**OWNER_ONLY**: managers cannot edit them directly and Phase 1B-A4 introduces **no** manager
proposal path for portfolio; the owner retains direct control and no public-publication
automation exists. Their omission from the material allowlist is deliberate, not accidental.

**Daily Site Entry eligibility ≠ project access (authority correction).** Project
read/edit/proposal authority (lead/assignment) does not by itself make a project eligible for
a **new** Daily Site Entry. The new-entry selector and the `create_daily_site_entry_draft`
database function now require the project to be both within the user's authority **and**
operationally eligible: **`status = 'Ongoing' AND archived = false`**. This is the
authority-coherent rule (see §4.5 "Paused semantics", the daily-site migration header
"operationally-active projects", and `daily_site_morning_compliance`'s Ongoing-only scope):

- **Ongoing** → eligible (Working today or No work today);
- **Pending** → excluded: active site operations have not begun (activation is the dedicated
  approval);
- **Paused** → excluded: the project must be **resumed** (Ongoing↔Paused is a
  `project_material_change` proposal) before working activity is recorded — a project must
  never remain officially Paused while a new "Working today" entry is created. A single
  paused **day** on an Ongoing project is the `temporarily_paused_for_day` no-work
  disposition, **not** a Paused project status (§4.5);
- **Completed / Cancelled / Design-only / Archived** → excluded.

Manager and owner selectors use the **same** rule. Setting a project Ongoing→Paused
immediately removes it from new-entry eligibility; an approved resume restores it. A
completed project (e.g. Mununga) remains visible in Projects and keeps its historical Daily
Site records, but cannot receive a new entry, in the UI **or** the database. Existing
entries, accept/void/supersede correction workflows and Daily Site read access are unchanged
(`can_manage_daily_site_project` is untouched), so Daily Site Operations stays ACTIVE_VERIFIED.

**Project creation.** Manager direct creation is removed (owner-only INSERT). A manager
submits a restricted **project-intake proposal** (`project_intake_requests`); no live
project exists until owner approval, which creates it atomically and records the
intake→project link. A pending intake never enters project reporting.

**Accountable lead.** A manager proposes a lead change (via `project_material_change`); the
live lead is unchanged until approval, applies atomically, is stale-guarded, and the manager
gains no access merely by proposing himself. The owner retains direct assignment.

**Owner review.** The Approvals detail renders requester, reason, round history, a
field-by-field diff (at-submission / current-live / proposed) with a stale warning, and
Accept / Request amendment / Reject — never raw JSON; an accountable-lead UUID is resolved
to a name.

**No self-approval (manager proposes, owner decides, requester ≠ decider).** The owner edits
and creates projects **directly** and must never submit a manager-style proposal that they, as
the sole decider, could self-approve. `project_material_change` and project intake are
**manager-only** to submit (`submit_project_approval` rejects a material change from a
non-manager; `submit_project_intake` is manager-only); the owner is the only decider; and the
decision functions additionally reject `requester_id = auth.uid()`. The owner's direct
alternatives remain: edit material fields directly, and create projects directly. The six
lifecycle approval types keep their foundation behaviour (owner-originated lifecycle requests
remain permitted by design); a general requester≠decider rule is intentionally not forced on
them. Submit/decide matrix: material change + intake = manager submit / owner decide /
requester≠decider **enforced**; the six lifecycle types = owner-or-manager submit / owner
decide / owner self-decision allowed (foundation).

**Database enforcement.** PostgreSQL functions + RLS + triggers enforce every rule above
(strict JSON-key allowlist, original-matches-current at approval, atomic apply, immutable
events, duplicate handling, no self-approval). The frontend only mirrors the database and
never offers a control the database would reject.

## 6. Project Updates & Discussion

`project_activities` is the immutable audit ledger generated by project changes. It must
remain read-only to normal application roles and must not become chat.

A separate future Project Updates & Discussion domain will provide structured,
auditable, asynchronous communication:

- project-linked updates;
- author and timestamp;
- work completed;
- current position;
- next steps;
- blockers;
- decisions required;
- replies and mentions;
- photos and evidence;
- task and approval links;
- Martine review;
- escalation to Widson;
- immutable edit history;
- role-scoped access.

Instant messaging and Supabase Realtime are not assumed. Saved, auditable communication
with clear accountability is the requirement.

## 7. Roles and future access model

Access must be enforced through reviewed RLS or server/database policy, not merely through
hidden UI. Each implementation workstream must define record ownership, visibility,
mutation authority, protected fields, immutable history and service-role boundaries.

| Capability/domain | Founder & Principal — Widson | Operations Manager — Martine | Project Team | Read-only |
|---|---|---|---|---|
| Portfolio operations | Full authorised access | Portfolio-wide coordination | Assigned projects/tasks only | Explicitly authorised records |
| Projects | Full current project authority | Routine operational authority within database guard | Assigned visibility; later scoped updates | Read only |
| Final/material approvals | Final authority | Request; delegated classes only if later authorised | Request where expressly allowed | None |
| Project updates | View, review, correct and escalate | Create, coordinate, review and escalate | Own/assigned updates | Read only if authorised |
| Tasks | Full visibility and authority | Coordinate and assign within authority | Assigned tasks | Read only if authorised |
| Project funds | Transfer, view, approve and reconcile | Funds transferred to or managed by him; submit reconciliation | No unrelated fund access | None unless expressly authorised |
| Labour engagements | Full commitments and payment visibility | Authorised commitments within delegation | Own engagement/payment status only | None unless expressly authorised |
| Client commercial records | Full authorised visibility | No unrestricted protected margins, banking details or unrelated founder-only finance | None | None unless expressly authorised |
| Operational expenditure | Full authorised visibility and approval | Delegated expenditure he manages | Own authorised submissions/evidence only | None unless expressly authorised |
| Documents/evidence | Full authorised access | Operational documents and evidence | Assigned uploads | Explicitly authorised documents |
| Reports/settings/access | Owner reports and access administration | Delegated operational reports only | None | None |

Martine's authority is portfolio-wide and not limited to the site where he is physically
present. Project Team members must not see unrelated project finance or other workers'
private rates unless explicitly authorised. Applicants receive no Operations Hub access.

## 8. Project delivery requirements retained from Phase 1B

The merged project foundation remains authoritative:

- `projects.lead_person_id` is the single accountable project lead;
- `project_assignments` is the broader project-team and future visibility model;
- owner and manager lead-assignment rules remain database-enforced;
- delayed completion and overdue next action remain separate derived concepts;
- `updated_at` is authoritative; deprecated `last_updated` is not a future form field;
- projects use archive/restore, not permanent delete;
- the Tsavo holding-record split remains separately gated;
- staff onboarding and external-worker identity remain unresolved future design work;
- save/refetch remains the current synchronisation model;
- Supabase Realtime remains optional and separately gated.

Routine operational updates should not all wait for Widson's approval. Material decisions
must use the current owner-only guard until the Approvals foundation is authorised and
implemented.

## 9. Documents, evidence and reporting requirements

Evidence storage and access decisions are prerequisites for fund reconciliation, labour
payments and Project Updates & Discussion. A future Documents & Evidence workstream must
define:

- supported evidence types and size limits;
- storage authority and retention;
- upload, replacement and deletion rules;
- project, fund, labour, approval and update linkage;
- role-scoped access;
- immutable metadata and auditability;
- handling of sensitive documents.

Management reporting follows stable operational semantics. Reports must not be built
before Project Funds, Labour Engagements and Operational Expenditure have clear,
non-duplicative definitions.

Future management reporting may include:

- project delivery and attention;
- project funds transferred, allocated, spent, returned and unreconciled;
- labour committed, added, paid and outstanding;
- expenditure by category, project and period;
- evidence completeness;
- approvals awaiting decision;
- project and staff workload;
- authorised client-commercial summaries;
- printable management briefings.

Protected client margins, banking details and private rates remain role-restricted.

## 10. Revised implementation roadmap

This is the current governing BD-FIN-01 sequence:

1. **BD-FIN-01 documentation authority cleanup** — documentation only.
2. **BD-FIN-01A claims vertical slice** — schema, strict grants/RLS, controlled functions,
   immutable events, database tests, minimal Manager/Principal UI and explicit Daily Site
   copy action.
3. **This BD-FIN-01B documentation authority** — establishing Project Fund Control
   Authority and its first slice, BD-FIN-01B1 — Claim-Backed Fund Requests.
4. **BD-FIN-01B1 — Claim-backed fund requests** — schema, strict grants/RLS, controlled
   functions, immutable events, partial-request and no-over-request enforcement, and
   minimal Manager/Principal UI.
5. **BD-FIN-01B2 — Fund releases and accountable advances.**
6. **BD-FIN-01C — Payments and claim allocations.**
7. **BD-FIN-01D — Reconciliation, returns, disputes, reversals and approved same-project
   carry-forward.**
8. **Documents/evidence and any authorised worker-privacy model.**
9. **Derived project and management reporting.**
10. **Separately authorised Simple Invoice Manager read-only reporting contract, if ever
    approved.**

BD-FIN-01B1, BD-FIN-01B2, BD-FIN-01C and BD-FIN-01D remain distinct and must not be
collapsed; each requires its own authority and deployment gate.

Daily Site Operations & Morning Compliance is implemented and operational. The hosted
implementation has completed authenticated verification and remains **ACTIVE_VERIFIED**.
Daily Site records contain operational planning signals only; they do not create payments,
liabilities, fund releases or financial approval. Financial reconciliation and finance
linkage remain future work under **BD-FIN-01**.

Each implementation stage requires its own authority and deployment gate, branch and PR.
This documentation revision authorises none of those implementation stages.

## 11. Roadmap dependencies

- Approvals precedes Project Funds, Labour Engagements and exceptional expenditure.
- Existing projects, profiles and RLS form the identity and delivery spine.
- Evidence and document decisions are dependencies for reconciliations, payments and
  project updates.
- Stable fund, labour and expenditure semantics precede management reporting.
- A deliberate external-worker identity model precedes full Team & Resourcing.
- Client Commercial Records must preserve Simple Invoice Manager as source of truth.
- Leads, Site Visits and Maintenance integration must preserve their existing public-site
  and GardenCare boundaries.
- No future navigation appears before its module is functional and authorised.

## 12. Accepted design and interaction direction

The admin application retains:

- native system UI typography;
- compact neutral layouts and restrained Botanique green;
- one integrated KPI metrics rail with thin internal dividers;
- no decorative ribbon stripes;
- no floating AI-template cards;
- no gradients;
- no oversized dark summary hero;
- no excessive pills;
- accessible charts and keyboard controls;
- responsive mobile navigation.

Public-site typography remains separate and unchanged. No future workstream may reopen
these accepted decisions without a verified defect, regression or approved scope change.

## 13. Explicit exclusions and implementation gate

This documentation revision authorises:

- no application or public-site code;
- no UI, route or navigation change;
- no migration, RLS, function or trigger change;
- no hosted Supabase write or project-data mutation;
- no test project;
- no Simple Invoice Manager integration;
- no finance or Approvals implementation;
- no Supabase Realtime;
- no Apicora content.

Approvals implementation may begin only after this authority revision is reviewed and
merged, and only under a new implementation branch and separately approved workstream
scope. BD-FIN-01B1 implementation may likewise begin only after this authority revision is
reviewed and merged, and only under its own separately approved implementation branch,
migration and deployment gate.
