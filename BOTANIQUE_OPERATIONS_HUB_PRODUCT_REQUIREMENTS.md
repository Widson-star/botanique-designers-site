# Botanique Operations Hub — Product Requirements (BD-OPERATIONS-HUB-01)

**Authority revision:** 28 July 2026, following the merge and production acceptance of
Phase 1B-A2.

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

Phase 1B-A2 is merged under PR #34 at
`1e5f66a75336ee86d7da046b0f43c0608ff3e534` and is production-live and accepted.
The current `/admin` application provides:

- authenticated, role-aware access;
- Supabase-backed project records and RLS-enforced authority;
- a live Dashboard and Projects module;
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

Production currently contains nine legitimate project records. **Alego Usonga** remains
a real operational record. **Zizu Investments Ltd**, the Industrial Area
exterior-corridor landscaping project, is the founder-reconciled ninth operational
record, not test, demo or seed data. No planning, documentation or visual-verification
task may create test projects or mutate hosted project data.

The only current functional navigation destinations are **Dashboard** and **Projects**.
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

**Status: APPLIED_WITH_AUTHENTICATED_VERIFICATION_PENDING — hosted migration applied; Phase 1
merged.** This subsection defines a new operational domain under `BD-OPERATIONS-HUB-01`. It is
not a new top-level workstream and requires no new master register — the existing authority
hierarchy governs it. The first narrow slice (Daily Site Entry capture, review/correction
lifecycle, owner compliance waivers, morning-compliance calculation, Dashboard attention
state and a mobile-first admin interface) was implemented, validated on a disposable local
PostgreSQL 17 matrix, and **merged** (PR #41) at authoritative `main`
`dfb79373397637694fa26d730c110da58f20acae`. Its additive migration
`20260728000200_operations_hub_daily_site_operations.sql` is now **applied to hosted
`botanique-admin`** (recorded version `20260729064007`); the schema, RLS, functions and grants
were verified read-only, the production Vercel deployment succeeded, and the signed-out
`/admin` login was verified clean on desktop and mobile. No operational data exists yet
(0 Daily Site entries, events and waivers) and no hosted row was mutated by the rollout. The
one remaining gate before the module is treated as fully active-verified is **authenticated
owner and manager production UI verification**. See WORKSTREAMS.md → *Daily Site Operations &
Morning Compliance* for the full rollout note (schema, versioning/supersession, RLS/role
boundary, compliance/EAT handling, hosted verification and pending checklist). Manager
authority is **project-authority scoped**
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

## 5. Approvals foundation — next implementation workstream

A reusable Approvals foundation is the next implementation workstream after this
documentation authority revision is reviewed and merged. It must be designed once and
reused by later operational and financial modules.

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

The first Approvals implementation slice is merged under PR #36 and its additive
migration is applied to hosted `botanique-admin`. Hosted schema, RLS, grants and
pre-existing-data integrity are verified, with all nine projects unchanged and both
approval tables empty. The production React `#418` console error was a route-aware
hydration defect on `/admin`, since repaired and merged under PR #38 (merge commit
`f95e31f55c0d74844b79aaca3ac831ed3bb1208a`). Owner authenticated verification passed on the
exact-head PR #38 preview with a clean console and no `#418`, and signed-out `/admin` is
verified clean on production desktop and mobile; classification remains
`APPLIED_WITH_LIMITATION` with the residual limitation narrowed to manager authenticated
production verification, which the founder explicitly accepted for merge. The slice remains
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

This is the current governing sequence:

1. **Operations Hub authority revision** — this documentation-only workstream.
2. **Approvals foundation.** *(Merged; see §5.1.)*
3. **Daily Site Operations & Morning Compliance.** *(Authority defined in §4.5;
   implementation not started.)*
4. **Operational Expenditure.**
5. **Project Funds & Reconciliation.**
6. **Labour Engagements & Payments.**
7. **Documents & Evidence.**
8. **Project Updates & Discussion.**
9. **Tasks & Assignments.**
10. **Team & Resourcing.**
11. **Client Commercial Records.**
12. **Reports & Management Summary.**
13. **Leads, Site Visits and Maintenance integration.**

Daily Site Operations & Morning Compliance is elevated to the next implementation
workstream because the informal WhatsApp morning process (§4.5.1) is the most immediate
operational-accountability gap. Project Funds and Labour Engagements remain elevated
because recurring allocations, reconciliation and agreed-versus-paid accountability
between Widson, Martine and project teams are immediate operational pain points.

**Recommended first implementation slice:** Daily Site Entry capture **and** morning
compliance **only**. Operational Expenditure capture — recommended by the earlier preflight
as a combined first slice — is on reassessment deferred to a **separate second slice**:
combining a new entry table, its lifecycle and RLS, the morning-compliance dashboard and a
mobile-first entry flow with a full expenditure model (categories, cross-domain links,
its own RLS) would create excessive migration, RLS, UI and authority risk in one PR. A
narrower first slice ships the founder's first-morning obligation sooner and lets
expenditure follow on a stable base.

Each item is a separate, reviewed workstream with its own branch and PR. Workstreams must
not be combined into one migration or implementation branch.

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
scope.
