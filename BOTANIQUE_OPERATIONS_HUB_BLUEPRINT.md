# Botanique Operations Hub — Architecture Blueprint (BD-OPERATIONS-HUB-01)

**Authority revision:** 1 August 2026. Originally established following Phase 1B-A2;
reconciled after PR #44–#46, the BD-FIN-01 read-only authority gate and BD-FIN-01A
ACTIVE_VERIFIED (PR #48); established BD-FIN-01B — Project Fund Control Authority and its
first slice, BD-FIN-01B1 — Claim-Backed Fund Requests, on 31 July 2026; now adds the
projection, notification, reporting, identity-separation, mobile and continuity
architecture in §§10–17.

**Status:** Architecture and system-of-record authority. This blueprint authorises no
application, migration, RLS, integration or hosted-data change. Current implementation
state is maintained in `WORKSTREAMS.md`; founder requirements are maintained in
`BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md`.

## 1. Verified production foundation

Phase 1B-A2 is merged under PR #34 at
`1e5f66a75336ee86d7da046b0f43c0608ff3e534` and is production-live.

Verified implementation truth:

| Capability | Current state | Primary evidence |
|---|---|---|
| Authenticated `/admin` | Live | `src/admin/AdminApp.jsx` |
| Functional navigation | Dashboard, Projects, Daily Site Operations, Approvals and Project Intakes | `src/admin/AdminLayout.jsx` |
| Project data lifecycle | Supabase-backed load, create and update with reconciliation | `src/admin/context/AdminDataContext.jsx`, `src/admin/lib/supabase.js` |
| Project CRUD | Live, role-scoped, archive/restore only | Admin project routes and forms |
| Material project authority | ACTIVE_VERIFIED controlled approval + scoped manager authority | `20260729000100`, `20260731000100` migrations |
| Project history | Trigger-written immutable audit ledger | `project_activities` migration, Activity History UI |
| Roles | `owner`, `manager`, `staff`, `viewer` | admin-foundation migration, `roles.js` |
| Project visibility | Owner/manager portfolio access; assignment-scoped staff access | project RLS |
| Protected financial references | Owner-only legacy reference table | admin-foundation migration |
| Leads foundation | `campaigns`, `leads`, `lead_activities` schema/RLS live; no UI | Phase 1A migration |
| Client commercial documents | External authority | Simple Invoice Manager |
| Realtime | Not implemented | save/refetch architecture |

Production contains **12 project rows: 10 genuine projects and two archived PR #44
internal-verification fixtures**. The fixtures are audit evidence, not client or operational
projects. Documentation and audit tasks must not mutate hosted data.

The accepted admin interface exposes Dashboard, Projects, Daily Site Operations, Approvals
and Project Intakes. Future destinations are added progressively after implementation and
authorisation.

## 2. Architectural principles

1. The Operations Hub evolves the existing `/admin` application; it is not a parallel
   project tracker.
2. `projects`, `profiles`, project assignments and reviewed RLS form the delivery,
   identity and access spine.
3. Systems of record remain explicit. Links and summaries must not silently duplicate
   authoritative records.
4. Operational communication, evidence, approvals and financial domains require immutable
   history appropriate to their risk.
5. UI visibility is never the only security boundary.
6. Normal application roles do not directly mutate audit-ledger records.
7. No permanent project delete is introduced.
8. Supabase Realtime is not an architectural prerequisite.
9. Navigation follows implemented capability.
10. Each implementation domain receives a separate branch, migration set, RLS review,
    runtime validation and PR.

## 3. System-of-record matrix

| Record/domain | System of record | Operations Hub role |
|---|---|---|
| Project delivery state | Operations Hub `projects` | Primary authority |
| Project change audit | Operations Hub `project_activities` | Immutable trigger-written ledger |
| Project assignments | Operations Hub `project_assignments` | Delivery visibility/team linkage |
| Daily site operations (morning plan, attendance intent, no-work status) | Operations Hub Daily Site | ACTIVE_VERIFIED per-project, per-date operational authority |
| Client estimates, invoices, receipts, payments and balances | Simple Invoice Manager | Later verified references and authorised summaries only |
| Project fund transfers, allocations and reconciliations | Future Operations Hub domain | Primary future authority |
| Labour agreements, additions, payments and balances | Future Operations Hub domain | Primary future authority |
| Operational expenditure | Future Operations Hub domain | Primary future authority; links to originating records |
| Project updates and discussion | Future Operations Hub domain | Structured asynchronous operational record |
| Evidence and documents | Future Operations Hub domain/storage policy | Linked evidence with scoped access |
| Approval proposals and decisions | Operations Hub Approvals | ACTIVE_VERIFIED reusable immutable workflow for implemented project types |
| Leads and lead activity | Operations Hub schema; UI future | Schema/RLS live, interface pending |
| Site visits | Future Operations Hub domain | Primary future authority |
| Maintenance schedules | Future Operations Hub domain | Primary future authority, preserving GardenCare boundaries |

The existing `project_financial_references` table is not the Client Commercial Records
domain and is not a substitute for Project Funds, Labour Engagements or Operational
Expenditure.

## 4. Domain architecture

### 4.1 Existing spine

- `profiles` identifies internal application users and database roles.
- `projects` is the project delivery record.
- `project_assignments` connects the broader project team to projects and supports
  assignment-scoped visibility.
- `projects.lead_person_id` identifies one accountable project lead.
- `project_activities` records project-row changes through a database trigger.
- `campaigns`, `leads` and `lead_activities` provide the live Phase 1A lead-data
  foundation, although no lead interface is currently exposed.

External workers who require engagement/payment records but do not require login access
must not be forced into an authenticated `profiles` identity. Team & Resourcing requires a
deliberate identity model separating a person/worker record from optional application
access.

### 4.2 Approvals — ACTIVE_VERIFIED

The Approvals foundation and expanded project material-change controls are merged, hosted
and ACTIVE_VERIFIED. The implemented architecture provides:

- approval class and lifecycle state;
- requester and approver;
- related domain and record;
- original and proposed value/condition snapshots;
- reason, decision and decision notes;
- submission, review, resubmission, withdrawal and decision timestamps;
- immutable event history;
- a controlled effect/application mechanism after approval;
- role- and class-specific RLS.

Approvals must be reusable by projects, funds, labour, expenditure and publication
permission. Domain records retain their own business semantics; the approvals domain
records authority and decision history rather than becoming a generic replacement for the
domain itself.

The PR #44 material-change functions, triggers and scoped project policies close the former
manager-material-change governance gap. Any future replacement must retain equivalent or
stronger database authority.

The first project-linked slice is merged and its additive migration
`20260728000100_operations_hub_approvals_foundation.sql` is applied to hosted
`botanique-admin`. Hosted schema, RLS, function grants and pre-existing-data integrity are
verified, with both approval tables empty. The observed React `#418` console error was a
route-aware hydration defect on `/admin`, since repaired and merged under PR #38 (merge
commit `f95e31f55c0d74844b79aaca3ac831ed3bb1208a`); admin routes now client-render with
`createRoot` instead of hydrating the Vercel-rewritten homepage shell. That initial slice's
`APPLIED_WITH_LIMITATION` classification is a historical checkpoint. Authenticated PR #44
verification established the current **ACTIVE_VERIFIED** status.
`approval_requests` is the constrained current-state record and `approval_events` is the
immutable lifecycle ledger. Narrow SECURITY DEFINER functions own submission, withdrawal,
amendment/resubmission and owner decision. An approved decision locks and revalidates the
project, applies one explicit project mutation branch and records the decision in the same
transaction. The existing project-history trigger continues to record the actual
project-row mutation.

The reusable schema is intentionally bounded in this slice to the `project` domain and six
reviewed approval types. It does not create generic table/column mutation, future finance
domains, evidence, notifications or staff request access. The material-authority and
project-lead guards are retained unchanged; managers request protected changes rather than
bypassing those guards.

### 4.3 Client Commercial Records

Future Operations Hub records may link a project to manually verified commercial
references and authorised summaries. Official estimates, invoices, receipts, client
payments and balances remain in Simple Invoice Manager.

Conceptual relationships:

- a project may have multiple estimates, invoices, receipts and payments;
- references must record verification provenance and timestamps;
- protected margins and banking details remain founder-only;
- no manager-readable project row may become a shadow accounting record.

### 4.4 Project Funds & Reconciliation

Conceptual entities:

- **fund transfer** — amount, date, recipient and source/reference;
- **fund-project link** — supports one transfer funding one or more projects;
- **allocation line** — approved purpose and amount;
- **reconciliation item** — spend, evidence, allocation link and exception state;
- **return** — funds returned;
- **reconciliation submission** — calculated unspent balance and unexplained variance;
- **approval link** — final decision and immutable adjustment path.

Derived totals must be calculated from immutable or controlled records:

`transferred = allocated + unallocated`

`allocated = evidenced spend + returned + unspent + unexplained variance`

The exact accounting equations and rounding rules require review in the implementation
workstream; this blueprint records the separation, not a migration design.

The approved first implementation slice toward this domain is **§4.11 BD-FIN-01B1 —
Claim-Backed Fund Requests**, which establishes Principal authority to make funds
available against approved internal cost claims, before any transfer, allocation, spend,
evidence, return or reconciliation record exists.

### 4.5 Labour Engagements & Payments

Conceptual entities:

- worker/person;
- project engagement and scope;
- immutable original agreement;
- approved addition/amendment;
- total commitment;
- payment and payment reference;
- derived amount paid and balance;
- evidence and approval links;
- immutable engagement history.

Original agreement data is never overwritten by an addition. Operational expenditure may
reference a labour payment but must not duplicate it.

### 4.6 Operational Expenditure

Operational expenditure records actual company or project spending. Each record carries
category, amount, date, payee/supplier, project or company allocation, proof, actor and
approval state.

Where expenditure originates from a fund allocation or labour payment, it links to that
record. The expenditure ledger does not create a second commitment, payment or
reconciliation truth.

### 4.7 Project Updates & Discussion

This domain is separate from `project_activities`.

- `project_activities` remains an immutable, system-generated audit ledger.
- Project Updates & Discussion holds human-authored, structured asynchronous updates.
- Updates may link to replies, evidence, tasks and approvals.
- Corrections use immutable revision/edit history rather than silent replacement.
- Review and escalation support Martine's portfolio role and Widson's final authority.
- No instant-chat or Realtime dependency is assumed.

### 4.8 Tasks, Team and evidence

Tasks link to projects, accountable assignees, dates, status, blockers, updates and
approvals where needed. Team & Resourcing supplies person, skill, engagement and optional
access identity. Documents & Evidence supplies controlled storage and metadata shared by
funds, labour, updates, tasks and approvals.

These relationships require explicit deletion/retention behavior. Removing a file or
deactivating an identity must not destroy the auditability of historical operational or
financial records.

### 4.9 Daily Site Operations & Morning Compliance

This is the first implemented domain after the merged Approvals foundation.
**ACTIVE_VERIFIED — live in production.** The first narrow
slice (Daily Site Entry capture, review/correction lifecycle, owner compliance waivers,
morning-compliance calculation, a Dashboard attention surface and a mobile-first admin
interface) was merged in PR #41 at authoritative `main`
`dfb79373397637694fa26d730c110da58f20acae`, and its additive migration
`20260728000200_operations_hub_daily_site_operations.sql` (recorded hosted version
`20260729064007`) is **applied to hosted `botanique-admin`** — three tables
(`daily_site_entries`, immutable `daily_site_entry_events`, `daily_site_compliance_waivers`),
narrow `SECURITY DEFINER` lifecycle functions and a `daily_site_morning_compliance()`
calculation, all verified read-only after apply, with the production deployment and signed-out
`/admin` (desktop + mobile) confirmed. **Authenticated production use has occurred:** on
2026-07-29 Martine Lotom submitted the first legitimate Daily Site Entry for Alego Usonga
(6 × KES 500 = KES 3,000; evidence provided; 10:09 EAT, correctly flagged late; created +
submitted events), the owner sees it with Return/Accept/Void, the manager sees no owner
controls, and compliance reads Due 2 / Missing 1 / Late 1 / Waived 0 — with no approval
request/event and no waiver created. All prior limitations are now closed (**ACTIVE_VERIFIED**, 2026-07-29): the responsive
`/admin/daily-site-operations` list layout defect is **repaired and verified** via PR #43
(`fix/bd-daily-site-list-and-language-polish` — auto-layout six-column desktop table + stacked
mobile cards, corporate-language label polish, and a single owner-only **Portfolio publication
status** control consolidating the old eligible-checkbox + permission-dropdown pair with **no
migration and no public-publication automation**; the public portfolio remains a separate
curated dataset); owner and manager authenticated exact-preview verification **PASSED**; and
Martine's selector confirmed to list both Alego and Karen. The former manager-material-change
governance gap is closed by the ACTIVE_VERIFIED PR #44 controls. Accepted entries are
corrected only by supersession (prior row preserved).
Authority is **project-authority scoped**: the owner is company-wide, while a manager can
read and act only on projects within the existing project-authority model (active
`project_assignments` or `lead_person_id`) — enforced in RLS, revalidated inside every
manager-capable lifecycle function, and applied to the compliance calculation so no
unauthorised project leaks. The manager's documented **portfolio-wide** authority is
realised through `lead_person_id` and/or explicit `project_assignments` (the broader
visibility model of §7), keeping future managers scoped. The founder has since used the
authorised Project edit interface to set **Karen Residence — Fountain Garden & Mature
Borders**' accountable lead to **Martine Lotom** (recorded in Activity History), so the
Operations Manager is now authorised for **both** in-scope Ongoing sites (Alego Usonga and
Karen Residence) via lead authority — no separate assignment row is required — and the
**rollout prerequisite is satisfied**. See WORKSTREAMS.md → *Daily Site Operations & Morning
Compliance* for the full Phase 1 implementation note. It sits under `BD-OPERATIONS-HUB-01`
and is not a new top-level workstream.

The domain is a per-project, per-work-date **Daily Site Entry** record capturing the
morning operational plan — a `working` or `no_work` disposition (with a no-work reason:
`rain`, `weekend_no_activity`, `temporarily_paused_for_day`, `no_labour_required`,
`site_access_unavailable` or `other`), expected worker count and optional crew reference,
rate or agreed labour total and derived planned labour cost, work planned, funds already
available, additional amount requested, notes, and system-stamped submitter and time — with
reserved (unimplemented) day-end actual fields (actual workers, actual labour cost, actual
work completed, day-end notes, unresolved difference).

Architectural invariants:

- **one project per entry** — no entry combines multiple sites; combined multi-project
  totals are derived aggregates only, never a stored shared row;
- **explicit no-work** — a rain/weekend/paused-for-day/no-labour day is recorded as a
  `no_work` entry with a reason, never as a zero-worker `working` entry, and still satisfies
  morning compliance;
- **no lifecycle mutation** — a Daily Site Entry never activates, pauses, completes,
  cancels or otherwise changes `projects.status`; the entry disposition (`temporarily_paused_for_day`)
  is distinct from the official Paused project status;
- **system-stamped identity** — creator and timestamp are database-stamped; clients cannot
  spoof actor identity;
- **immutable accountability** — accepted entries are not silently rewritten; corrections
  after acceptance preserve the prior record by supersession; no hard delete; void or
  supersession requires reason and actor;
- **lifecycle** — draft → submitted → returned_for_correction → resubmitted → accepted →
  voided → superseded; ordinary daily submission is **not** an approval request;
- **evidence status only** in the first slice (none / promised / provided / not_required);
  file attachments depend on the future Documents & Evidence domain;
- **Daily Attendance Evidence (authority, not implemented here)** — the casual, locally
  sourced labour model is evidenced by an uploaded, project-specific **Daily Labour Register**
  (names, phone numbers, limited identity reference where necessary, roles/tasks, signatures
  or attendance confirmation) per working entry, rather than a permanent profile for every
  casual worker; the register is uploaded against the correct Daily Site Entry ordinarily
  **by 9:00 a.m. EAT** (late allowed and auditable), and where Martine is absent the site
  representative or workers complete it and send it to him to upload. Regular staff (e.g.
  Martine, Waweru) may later have reusable profiles; casual workers stay register-based.
  Actual upload/storage belongs to the future **Documents & Evidence** domain under
  data-minimisation and retention rules — this slice builds no upload, roster or
  labour-payment workflow (PRD §4.5.11a);
- **soft morning compliance** — the Dashboard flags in-scope projects lacking today's entry;
  no destructive lock, no notifications and no Realtime in the first slice.

**Resolved compliance rules (founder authority):** entries are expected before work begins
and ordinarily by **08:30 EAT** (a management expectation, not a cut-off; later entries may
be marked late without locking the manager out, retaining the actual timestamp); weekends
require an entry only when activity is scheduled; compliance covers **Ongoing, operationally
active projects only** (Pending, Awaiting Approval, Completed, Design-only, Archived and
Paused excluded); the owner may **waive** one project/date with reason, identity and
timestamp without implying any workers/cost/work/funds; and persistent non-compliance
produces visible flags and counts only, with no first-slice access or action restriction.

This domain is separate from Labour Engagements & Payments, Project Funds & Reconciliation
and Operational Expenditure: it records the operational plan and site actuals, not agreed
commitments, fund movement or the expenditure ledger. Planned labour cost and "additional
amount requested" are planning signals, not payments or fund releases.

**Approvals reuse (assessment only):** the existing `approval_requests` /
`approval_events` pattern — `project` domain, `subject_record_id`, immutable events and
narrow SECURITY DEFINER functions — can later be extended with new domains/types for fund
release, exceptional expenditure, reconciliation acceptance and post-reconciliation
correction. No approval-schema change is made now.

**Recommended first slice:** Daily Site Entry capture plus morning compliance only, with
Operational Expenditure deferred to a separate second slice to bound migration, RLS, UI
and authority risk. The five founder decisions on submission time, weekend handling,
active-project scope, owner waiver and non-compliance restrictions are **resolved** (see
the resolved compliance rules above); the first implementation slice may proceed after
normal implementation preflight, keeping Daily Site Entry capture and morning compliance
as the narrow first slice and Operational Expenditure deferred to a separate second slice.

### 4.10 BD-FIN-01A — Internal Cost Claims and Principal Decision

**Implementation state: ACTIVE_VERIFIED (2026-07-31).** PR #48 contains the implementation
introduced by commit `74a25babc411ef42a38dad882d14e00261aca32e`. It was open, draft and
unmerged at the authenticated acceptance checkpoint described below; its final reviewed head
was `de824688977c15ac86785f53b01559dbd9fde3eb`, and it subsequently merged on 31 July 2026 at
merge commit `92055ed84a3db4eee6979b3eae54339792e1cd54`. Authoritative main is now that merge
commit. It was
based on `d5986af66bec550567408e99b61d170607daee75` and adds migration
`20260731000200_internal_cost_claims.sql`, a PostgreSQL 17 authority matrix and the Site
Costs admin surfaces. This status describes hosted and authenticated verification, not
merge state. The migration has been
applied to hosted `botanique-admin` (`wcacyfyxjiysfibuuhgf`) as hosted version
`20260731160117`; schema, RLS, grants and existing-data preservation were verified with no
unexpected change to any existing table. `APPLIED_WITH_LIMITATION` was a historical
checkpoint: manual authenticated Principal and Operations Manager UI verification against
the exact PR-head Vercel preview subsequently passed (navigation, project scoping, the
direct-authorisation and manager claim forms, and the Daily Site copy-to-draft flow, on
desktop and mobile, with no console errors), with all three new tables remaining at zero
rows and no claim submitted. Staff/Viewer UI verification remains unavailable because no
such accounts exist; their denial is covered by the PostgreSQL and capability test matrices.
Its purpose is to establish an authoritative internal project-cost obligation and immutable
decision history before any money movement.

The aggregate is a project-scoped claim with an optional Daily Site source, one recipient
or crew, one category, one or more structured lines, a service/work date, purpose, KES total
derived from lines, requester or Principal direct authority, and immutable lifecycle events.
Whole-claim approval is authoritative; independently owed or approved recipients/scopes are
separate claims. Principal-originated obligations use a distinct direct-authority event such
as `principal_authorised`, never simulated self-approval.

The compact authoritative lifecycle is `draft`, `awaiting_review`,
`amendment_requested`, `approved`, `rejected`, `withdrawn`, `cancelled`. Submission and
resubmission are events that enter `awaiting_review`. Funding, payment and reconciliation
progress are deferred derived states, not claim lifecycle values.

Daily Site remains the operational planning source. The draft implementation's explicit **Create cost claim**
action may copy project, date, source version and planning context to an editable draft; it
never creates a claim automatically. Later Daily Site changes cannot rewrite submitted or
approved claims, finance cannot rewrite Daily Site history, and one entry may support
multiple separate claims.

The Principal has company-wide decision and direct-authority access. The Operations Manager
may create, edit, submit, amend/resubmit and withdraw only within assigned/led-project
authority, with no self-approval or company-wide finance visibility. Staff and viewer have
no first-slice finance visibility. Finance RLS and mutation functions must enforce this
scope independently; UI filtering and broader manager-read policies from other domains are
not reusable security boundaries.

Archived projects and the two PR #44 fixtures are ineligible. Implementation must also
prevent wrong/mixed-project costs, stale decisions, silent editing of approved facts,
direct client DML and unnecessary worker-data exposure. Releases, advances, payments,
allocations, reconciliation, reimbursements, evidence uploads, worker masters, spend
reporting and Simple Invoice Manager integration remain outside this slice.

### 4.11 BD-FIN-01B — Project Fund Control Authority

**Architecture state: BD-FIN-01B1 ACTIVE_VERIFIED; BD-FIN-01B2, BD-FIN-01C and BD-FIN-01D
remain architecture only.** PR #51 contains the implementation; its final reviewed head was
`c310b4c762cd666465a2a7813f38c3642d0cbd16`, based on `49e02c4a7022ab112798b809c957a5794eb5c6f0`.
It was open, draft and unmerged at the authenticated acceptance checkpoint, and subsequently
merged at merge commit `fe481410fdaab37e93c811e3744637de82fab370` at 21:02:21 UTC on
31 July 2026, which is 00:02 EAT on 1 August 2026. Authoritative main is now that merge
commit, and the production deployment at it succeeded. This status describes hosted and
authenticated verification, not merge state; the hosted tables remain at zero rows.

Delivered BD-FIN-01B1 architecture. Migration `20260731000300_claim_backed_fund_requests`
adds `fund_requests`, `fund_request_allocations` and `fund_request_events`, one sequence
backing an immutable `BDFR-YYYY-NNNNNN` request number, three SELECT-only RLS policies and
eight authenticated RPCs (`create_fund_request_draft`, `update_fund_request`,
`submit_fund_request`, `withdraw_fund_request`, `decide_fund_request`,
`direct_authorise_fund_request`, `cancel_fund_request` and the read-only
`fund_request_claim_availability`). Authenticated clients hold SELECT only; every mutation
passes through a `SECURITY DEFINER` RPC with a pinned `search_path`, and every private
helper and trigger function is revoked from clients.

Reservation architecture: one shared writer and one shared verifier are the only code paths
that create or re-prove reservations. Both lock the referenced approved claims with
`FOR UPDATE` in ascending claim-id order before any availability is computed, so competing
requests cannot deadlock or interleave; a losing request rolls back entirely, retains its
prior status and appends no event. There is deliberately **no** editable reserved-amount
column on `internal_cost_claims`: reservation is always derived from allocations joined to
reserving request statuses. A narrow `before update` guard on `internal_cost_claims`
prevents cancelling or reducing an approved claim below its reserved amount. A deferrable
constraint trigger guarantees that a reserving request's total always equals the sum of its
allocations, which is what allows Principal direct authority to insert an approved request
and its allocations as one atomic action.

Lifecycle architecture as delivered uses seven durable statuses and treats resubmission as
an immutable event with an explicit `submission_round`, refining and superseding the
provisional state list recorded below. Project eligibility, archive state and excluded
fixtures are resolved through the existing BD-FIN-01A authorised-project surface rather
than a duplicated rule set, and visibility reuses the existing finance project-access
function; no parallel role system was introduced.

BD-FIN-01B is the next approved finance authority after BD-FIN-01A
ACTIVE_VERIFIED. Its purpose is to record Principal authority to make money available
against already-approved internal cost claims, strictly before any release, transfer,
payment or reconciliation record exists. A fund-request approval authorises Botanique to
make up to the approved amount available for the identified project claims; it is not
evidence that funds were transferred, released, received as an advance, paid to a worker
or supplier, allocated to a payment, or reconciled.

Four slices remain distinct and must not be collapsed: **BD-FIN-01B1 — Claim-Backed Fund
Requests** (this section defines its architecture), **BD-FIN-01B2 — Fund Releases and
Accountable Advances**, **BD-FIN-01C — Payments and Claim Allocations**, and
**BD-FIN-01D — Reconciliation, Returns and Reversals**.

Conceptual entities for BD-FIN-01B1 (no migration authorised by this blueprint):

- **fund request** — project, authority type (manager-requested or Principal
  direct-authority), requester or Principal actor, intended custody model (Operations
  Manager accountable advance or direct recipient funding), intended recipient/custodian,
  purpose/note, total requested amount, status, version, and created/submitted/
  decided/cancelled timestamps;
- **fund request allocation** — fund request, one approved internal cost claim, and the
  amount requested against that claim;
- **immutable events** — at least draft creation, allocation addition/amendment,
  submission, amendment request, resubmission, approval, rejection, withdrawal,
  cancellation and Principal direct authority.

The future database must guarantee: a fund request and every linked claim share one
project (no cross-project request, balance or allocation); a linked claim is approved;
allocation amounts are positive; allocation totals equal the request total; and the
cumulative amount reserved against a claim by relevant active or approved requests never
exceeds the approved claim amount, with rejected/withdrawn/cancelled requests releasing
their reservation. A claim may be partially requested — the model must distinguish
approved claim amount, amount reserved by other active requests, amount in the current
request, and amount still available for request.

Role and authority architecture: the Operations Manager creates, allocates, submits,
amends/resubmits and withdraws (before release) a claim-backed request scoped to one
project's approved claims, with no self-approval, over-request, project-mixing, release-
marking or reconciliation authority. The Principal views all requests company-wide,
approves, rejects, requests amendment, records a distinct direct-authority request, cancels
an approved request before any later release, and later authorises releases and final
reconciliation. Principal direct authority is architecturally a separate action and
immutable event, never a self-request/self-approval simulation. Staff and Viewer carry no
mutation authority; visibility follows the existing capability/project-access model.

Provisional lifecycle architecture (superseded by the delivered lifecycle recorded at the
top of this section): a manager-requested state machine — `draft`, `submitted`,
`amendment_requested`, `resubmitted`, `approved`, `rejected`, `withdrawn`, `cancelled` —
with valid transitions `draft → submitted`; `submitted → approved`;
`submitted → rejected`; `submitted → amendment_requested`;
`amendment_requested → resubmitted`; `draft`/`submitted`/`amendment_requested →
withdrawn` under exact authority rules; and `approved → cancelled` only through controlled
Principal authority and only before a future release exists — plus a distinct Principal
direct-authority lifecycle. Immutable events and non-destructive correction remain
architectural invariants, consistent with the Approvals foundation pattern.

Domain relationships: a fund request references approved internal cost claims (§4.10) but
never mutates claim authority; Daily Site (§4.9) remains operational planning input only,
with no automatic promotion of a planning amount to a request, release, payment or
expenditure; Simple Invoice Manager (§4.3) remains untouched. Future BD-FIN-01B2 releases
will record amount, date, method, recipient/custodian, approved request, direct-funding-
versus-accountable-advance, acknowledgement and reversal status; a release to Martine is
architecturally a custody transfer, not automatically a worker/supplier payment. Future
BD-FIN-01C payments will allocate money delivered to final economic recipients against
claims. Future BD-FIN-01D reconciliation will establish released amount, valid payments,
returns, approved same-project carry-forward, outstanding accountable balance, disputes and
reversals; no carry-forward may silently cross projects.

Excluded from BD-FIN-01B1 architecture: fund releases, transaction records/references,
receipt acknowledgements, direct or onward payments, payment-to-claim allocations,
supplier settlement, worker payment status, proof-of-payment uploads, reconciliation,
unspent balances, returns, same-project carry-forward, disputes, reversals, general
unbacked operational advances, dashboards, profitability reporting, Simple Invoice Manager
integration, new worker-privacy/identity storage and automatic Daily Site funding.

## 5. Progressive navigation architecture

Current production:

- Dashboard
- Projects
- Daily Site Operations
- Approvals
- Project Intakes

Eventual groups:

| Group | Destinations |
|---|---|
| Operations | Dashboard; Leads; Site Visits; Projects; Daily Site Operations; Project Updates & Discussion; Tasks & Assignments; Maintenance; Approvals |
| People and finance | Team & Resourcing; Project Engagements; Project Funds & Reconciliation; Labour Engagements & Payments; Client Commercial Records; Operational Expenditure |
| Knowledge and reporting | Documents & Evidence; Reports & Management Summary; Settings |

Routes and links are added only with functional modules, reviewed access policy and useful
role-appropriate empty states. No module is exposed as a disabled future destination.

The groups above remain the **authority** structure. They are superseded as the
**presentation** structure by the simplified top-level architecture in the Product
Requirements §14; the projection architecture that makes that separation safe is §10 below.

## 6. Role and access architecture

Presentation labels do not change database role values:

| Role key | Presentation | Architectural authority |
|---|---|---|
| `owner` | Principal / Founder & Principal | Full authorised operational access and final approval |
| `manager` | Operations Manager | Portfolio-wide operations and delegated finance within explicit scope |
| `staff` | Project Team or real operational role | Assignment-scoped work, own updates/evidence and own payment visibility |
| `viewer` | Read-only | Explicitly authorised records, no mutation |

Identity presentation uses **Widson O. Ambaisi** in compact operational contexts and
**Widson Omutelema Ambaisi** in formal contexts. Martine Lotom is not unnecessarily
abbreviated.

Future tables require an access review covering:

- SELECT scope;
- INSERT/UPDATE/DELETE policy;
- protected fields;
- relationship-based visibility;
- approval-class authority;
- immutable-history paths;
- service-role and database-owner boundaries;
- evidence-object storage policy.

Widson has full authorised operational, commercial, fund, labour, expenditure, reporting
and settings access. Martine has portfolio-wide operations, funds transferred to or
managed by him, delegated expenditure and authorised labour commitments, without
unrestricted access to protected margins, banking details or unrelated founder-only
finance. Project Team access remains assignment- and self-scoped. Read-only access remains
explicit and non-mutating.

## 7. Current project authority and audit model

The Phase 1B-A1 migration remains technical truth:

- owner and manager may write projects subject to RLS and the material-authority guard;
- managers can create only Pending intake records with constrained protected state;
- managers can perform routine operational updates but not owner-reserved transitions;
- lead assignment is validated separately and only when the lead changes;
- application roles cannot directly insert, update or delete `project_activities`;
- the project-history trigger appends non-empty change records;
- assigned staff may read only assigned-project history;
- owner/manager may read portfolio project history;
- viewer/no-profile access remains denied by current policies.

This is an audit model, not a general discussion or approvals model.

### 7.1 Phase 1B-A4 — material-change governance (ACTIVE_VERIFIED)

The Phase 1B-A4 migration (`20260729000100`) tightens the model above without weakening
any finance/Daily Site/portfolio boundary:

- **Manager scope is now RLS-enforced.** `projects` SELECT/UPDATE for a manager is limited
  to projects they lead or are actively assigned to; the owner stays company-wide. This
  matches `can_manage_daily_site_project`, so the Daily Site selector is unchanged.
- **Direct project creation is owner-only.** Managers submit `project_intake_requests`
  proposals; an approved intake creates the live project atomically (`created_project_id`
  links intake→project). A pending intake is never a live project.
- **Material identity/authority/schedule fields are no longer a manager direct write.** A
  new `BEFORE UPDATE` guard (`tg_guard_project_material_fields`) rejects manager changes to
  `project_name`, `client_site_name`, `location`, `county`, `project_type`, `stage`,
  `lead_person_id`, `start_date`, `actual_start_date`. Those route through a seventh
  approval type, `project_material_change`, which extends the existing
  `approval_requests`/`approval_events` lifecycle with a strict field allowlist, an
  authoritative original snapshot, stale-request protection, manager assignment/authority
  validation, atomic apply and a `project_activities` history event.
- **Owner apply runs as the deciding owner**, so the manager guards and the interim
  material-authority/lead guards early-return and never block an approved change; the six
  lifecycle types and both interim guards remain attached as defence-in-depth.
- Activity history now surfaces the **exact actor name and role** when the profile is
  readable (never a raw UUID or role slug).

Authority corrections applied before the migration security review:

- **Project status is not low-risk.** The interim allowance for a manager to directly
  toggle Ongoing↔Paused is revoked (`tg_guard_project_material_authority` no longer carves
  it out and `tg_guard_project_material_fields` blocks it). Ongoing↔Paused is now a
  `project_material_change` proposal (constrained to that transition on an active project);
  activation/completion/cancellation/archive/restore keep their dedicated types and
  Design-only stays owner-only. A manager direct status write is zero. The low-risk direct
  set is exactly `next_action`, `next_action_date`, `blocker`, `notes`.
- **Portfolio is OWNER_ONLY.** `portfolio_eligible` and `portfolio_permission_status` are
  deliberately excluded from the material allowlist; no manager proposal path exists.
- **Daily Site Entry eligibility ≠ project access.** `daily_site_authorised_projects()` and
  `create_daily_site_entry_draft()` now require operational eligibility — **`status =
  'Ongoing' AND archived = false`** — in addition to project authority (same rule for owner
  and manager). Pending (not begun), Paused (must be resumed via approval first), Completed,
  Cancelled, Design-only and Archived are all excluded, consistent with §4.5 Paused
  semantics and the Ongoing-only morning-compliance scope. A completed/paused project
  (Mununga) is excluded from the new-entry selector and the database refuses a new entry for
  it, while its Projects visibility, history and accept/void/supersede correction workflows
  are unchanged (`can_manage_daily_site_project` is untouched). Setting a project
  Ongoing→Paused removes new-entry eligibility immediately; an approved resume restores it.

- **No self-approval.** The owner edits/creates projects directly and never submits a
  manager-style proposal. `project_material_change` and project intake are manager-only to
  submit; the owner is the only decider; the decision functions also reject `requester_id =
  auth.uid()`. The six lifecycle types keep their foundation behaviour (owner-originated
  requests permitted). Migration `20260729000100` applies whole-file atomically under a
  single transaction (`supabase db push` / `psql --single-transaction`); it has no
  non-transactional statement, so partial application cannot occur under those methods — see
  the WORKSTREAMS rollout checklist and PITR recovery.

Status: **ACTIVE_VERIFIED**. Migration `20260729000100`
remains applied once and unchanged. On 31 July 2026, production was re-baselined as 12
physical project rows: 10 genuine projects plus two archived internal PR #44 verification
fixtures created during the authorised Codex-controlled verification using the authenticated
Principal session. Lugulu Residential Home is the genuine tenth project; the genuine
returned Alego Daily Site entry explains the Daily Site baseline of 4 entries / 14 events /
0 waivers. The original-nine project fingerprint remains
`4bdcb35ba4017dc7215a9a83fe9b76eb`.

Corrective migration `20260731000100` was the only linked dry-run item and applied
transactionally once. It adds an independent `BEFORE UPDATE OF status` manager guard and
re-states terminal-intake select authority as owner-or-requester for the full immutable
lifecycle. The trigger is enabled, fixed-search-path and least-privilege; a manager direct
status probe was rejected with zero affected rows, owner direct authority and established
lifecycle proposal functions remain, and owner/requester/unrelated terminal reads resolved
3/3/0. Every pre/post business fingerprint matched: the migration created no project,
activity, approval, intake, Daily Site, Portfolio or financial row.

The earlier “manager activated directly” result was a zero-row RLS no-op misclassified by
the regression harness, not a proven production mutation. Repaired tests distinguish
zero-row no-op, explicit rejection and committed mutation.

Final focused authenticated reverification passed on exact preview head
`df5ea4eba0a278f00c311f0e93bbc95dfde6c978`. Principal and Martine Lotom each
reloaded and revisited the approved, rejected and withdrawn terminal intake routes with
readable state, round, requester and immutable history; the approved project link used the
human-readable `Open project` label. Existing material and lifecycle terminal approvals
remained readable without stale warnings or invalid controls. Martine's Lugulu direct form
contained only the four low-risk fields and routed status/material changes to a proposal;
Principal retained direct status, accountable-lead and material controls. Both consoles were
clean. Unrelated-manager denial remains database-authority verified at owner/requester/
unrelated = 3/3/0. Automated frontend coverage proves stale, malformed/undefined, network
and Supabase error-object cleanup because safe browser interception was unavailable and no
production mutation was authorised.

Fresh post-pass linked queries reproduced the 12/10/2 project and 4/14/0 Daily Site
baseline plus every accepted authority fingerprint; both migrations remain applied exactly
once. Frontend 36 files / 272 tests, all three PostgreSQL matrices, changed-file lint,
unchanged exact-main lint baseline, 43-route build/prerender and `git diff --check` pass.
No project, approval, intake, Daily Site, finance, Simple Invoice Manager, public Portfolio
or Apicora state changed. PR #44 subsequently merged and closed on 31 July 2026;
authoritative `main` is
`05b6ade06f7ba2d4fdfb5c9d4ef1b591ea4e02e7`.

## 8. Implementation roadmap and dependencies

Governing BD-FIN-01 order:

1. BD-FIN-01 documentation authority cleanup — documentation only.
2. BD-FIN-01A claims vertical slice: schema, strict grants/RLS, controlled functions,
   immutable events, database tests, minimal Manager/Principal UI and explicit Daily Site
   copy action.
3. This BD-FIN-01B documentation authority — establishing Project Fund Control Authority
   and its first slice, BD-FIN-01B1 — Claim-Backed Fund Requests.
4. BD-FIN-01B1 — claim-backed fund requests: schema, strict grants/RLS, controlled
   functions, immutable events, partial-request and no-over-request enforcement, and
   minimal Manager/Principal UI.
5. BD-FIN-01B2 — fund releases and accountable advances.
6. BD-FIN-01C — payments and claim allocations.
7. BD-FIN-01D — reconciliation, returns, disputes, reversals and approved same-project
   carry-forward.
8. Documents/evidence and any authorised worker-privacy model.
9. Derived project and management reporting.
10. Separately authorised Simple Invoice Manager read-only reporting contract, if approved.

BD-FIN-01B1, BD-FIN-01B2, BD-FIN-01C and BD-FIN-01D are distinct, independently gated
stages and must not be collapsed.

Dependency structure:

- Daily Site Operations and expanded Approvals are ACTIVE_VERIFIED prerequisites.
- Every BD-FIN-01 implementation stage requires its own authority and deployment gate.
- Approvals precedes fund reconciliation, labour amendments and exceptional expenditure.
- Projects, profiles and RLS are the identity/delivery spine for all modules.
- Evidence decisions are required before complete reconciliation, payment and update
  workflows.
- Project Updates can precede complete task management but must use stable project and
  identity references.
- Team & Resourcing requires a deliberate external-worker identity model.
- Client Commercial Records depends on a safe manual-verification model that preserves
  Simple Invoice Manager authority.
- Operational Expenditure depends on stable links to funds and labour to prevent duplicate
  records.
- Reporting follows stable fund, labour and expenditure semantics.
- Leads, Site Visits and Maintenance integration preserves existing lead and GardenCare
  boundaries.

Project Funds and Labour Engagements are elevated because allocations, reconciliation and
agreed-versus-paid accountability are immediate operational needs.

## 9. Protected boundaries

Unless a later workstream explicitly authorises change, preserve:

- the production Phase 1B-A2 interface and design direction;
- Dashboard, Projects, Daily Site Operations, Approvals and Project Intakes as current navigation;
- current migrations, RLS, functions and triggers;
- the ACTIVE_VERIFIED project material-change authority controls;
- immutable `project_activities`;
- no permanent project delete;
- Simple Invoice Manager authority;
- owner-only protected commercial/financial visibility;
- public-site behavior and typography;
- GardenCare commercial and coverage rules;
- no Supabase Realtime dependency;
- no hosted mutation during planning, audit or documentation work.

No new master register is needed. `WORKSTREAMS.md` remains the execution register, this
blueprint remains architecture authority, and the Product Requirements remain founder
requirements authority.

## 10. Projection architecture — systems of record versus derived views

Sections 10–17 are the 1 August 2026 architecture authority. They are numbered from 10
deliberately: earlier sections are cross-referenced by number from `WORKSTREAMS.md` and the
Product Requirements, so nothing above is renumbered. They authorise no migration, RLS
policy, function, route, component or hosted change. Founder requirements for the same
subject matter are in the Product Requirements §§14–23 and are not restated here; this
section defines only how those requirements are structured architecturally.

The architecture separates three layers, and the separation is the point:

| Layer | Definition | Authority |
|---|---|---|
| System of record | The domain table set that owns a fact and its permitted transitions | Authoritative |
| Immutable event ledger | The append-only history of that domain's decisions | Authoritative history |
| Projection | Any inbox, dashboard, notification, report, balance or printable document computed from the two above | Never authoritative |

Projection invariants:

1. A projection is **derived, never authored**. No projection holds a fact its sources do not
   contain, and no user action mutates a projection directly.
2. A projection **never widens access**. Every projection is filtered by the same
   project-scoped policies as its sources; aggregation must not become an indirect route
   around row-level security. Where a projection spans domains, it applies each domain's
   own access rule to its own rows rather than a single relaxed rule to all of them.
3. A projection **never merges lifecycles**. A cross-domain view may present items together,
   but each item keeps its own domain status vocabulary, permitted transitions and decision
   authority. A shared presentation label is a label, not a state.
4. A projection is **rebuildable**. Losing or rebuilding a projection must lose no
   authoritative fact.
5. Domain authority is unchanged by presentation. The Approvals foundation remains the
   authoritative decision workflow for its implemented approval types. A projection may
   *originate* an action, but every such action executes the originating domain's own
   controlled mutation under its own role, project-scope and version checks. No projection
   may hold a second approval record or open a competing decision path. Whether a decision
   control is rendered inline or routes to the authoritative detail view is presentation
   design, and either choice satisfies this invariant.

Project-centred creation is a **routing** concern, not a data-model concern. A single
operational intent captured from a project is written to the correct existing domain record;
it does not create a generic record type, and no free-form entity is authorised that would
bypass domain authority. Where a required domain does not yet exist, the intent is not
capturable until that domain is separately authorised.

The system-of-record matrix in §3 is extended by exactly one row class, and it is a
projection row rather than an authority row:

| Record/domain | System of record | Operations Hub role |
|---|---|---|
| Work inbox items, notifications, dashboard values, report figures, printable documents | The originating domain in §3 | Derived projection; never authoritative |

## 11. Notification architecture

A notification is a projection of an authoritative event, produced by the domain that owns
that event. It is not an audit ledger and is not a substitute for one: deleting, reading or
losing a notification must leave the domain event ledgers untouched and complete.

Architectural rules:

- Notifications are generated **from** committed authoritative events, never in place of
  them. A notification must not be the only record that something happened.
- Notification generation must not weaken the transactional guarantees of the originating
  domain. A failure to project must never roll back or block an authoritative mutation.
- Every notification carries a stable reference to the originating domain and record, so it
  can deep-link to the exact record rather than a module index.
- Recipient resolution is derived from existing role and project-access authority, not from
  a parallel recipient list.
- Read/unread state is per-recipient presentation state and carries no authority.
- Retention and pruning of notifications is permitted and is not deletion of history,
  precisely because notifications are not the ledger. The no-permanent-delete rule continues
  to apply to authoritative records and events.

External delivery channels — push, email, WhatsApp, SMS — are **not** part of this
architecture and require separate authority, including a data-egress review before any
Botanique record content leaves the platform. Supabase Realtime remains not an architectural
prerequisite.

## 12. Report and printable-document derivation architecture

Reports and printable documents are the same architectural thing at different fidelities: a
read-only composition over authoritative records.

- No report table, no report-entry form and no stored report figure is authorised. A report
  is computed at read time from its sources, or from an explicitly derived and separately
  authorised summary structure if performance later requires one.
- A document number, where a printable document needs one, is issued by the originating
  domain, not by the document layer.
- Documents compose existing fields — identity, project, date, requester, approver, line
  items, totals, status, history — and add none of their own. A field that only a document
  needs is a missing field on the source record.
- Client-commercial reporting has no data source inside the Operations Hub. It remains
  unavailable until later verified Simple Invoice references or a separately approved
  read-only contract exist. No integration is implied by listing the report family.
- Report access is bounded by the access of the underlying rows. Owner-only protected
  commercial and financial visibility survives into every report and export.

PDF generation, export mechanics and any storage of generated artefacts are unauthorised
here and depend on the future Documents & Evidence domain.

### 12.1 Reports architecture — Stage 4A (2 August 2026)

Sections 12.1–12.10 are the **Stage 4 — Reports and Derived-Summary Authority** architecture
record, approved 2 August 2026 and recorded in `WORKSTREAMS.md`. They extend §12 without
replacing it and authorise no migration, RLS policy, view, function, RPC, route, component,
test or hosted change. Founder requirements for the same subject matter are in the Product
Requirements §§18.1–18.13 and are not restated here. The first implementation slice is
identified as **BD-REPORTS-01A — Project Summary and Current-Authority Reporting**.

**Reports is a projection, not a domain.** Under the three-layer model in §10, Reports sits
wholly in the projection layer. It owns no system-of-record row, no lifecycle and no decision
authority. Every projection invariant in §10 applies to it in full: derived and never
authored; never widening access; never merging lifecycles; rebuildable without loss; and
leaving domain authority unchanged.

### 12.2 Source-domain ownership

Each report figure traces to exactly one owning domain, and that domain — not the report —
defines the fact, its permitted transitions and its access rule:

| Reported subject | Owning system of record |
|---|---|
| Project identity, location, dates, status, responsible lead, authorised notes | `projects` |
| Project change history and activity timeline | `project_activities` |
| Work plan, working/no-work disposition, **expected** worker count, crew reference, rate or agreed labour total, **planned** labour amount, funds available and additional amount requested, notes, evidence status, submission timing and late flagging, missing/late/waived compliance status, entry lifecycle state and version, entry event history | Daily Site Operations (§4.9) |
| Submitted and approved internal cost claims, categories, lifecycle states, frozen recipient snapshots | BD-FIN-01A (§4.10) |
| Submitted fund requests, approved funding amounts, associated approved claims, intended custody model, lifecycle states | BD-FIN-01B1 (§4.11) |
| Decision state, requester, deciding authority, submission and decision dates, amendment and event history | Approvals foundation and the domain immutable event ledgers (§4.2) |

Facts with **no implemented owning domain** are not reportable. This includes actual work
completed, actual worker count and person-level attendance, actual labour cost, funds released,
payments made, unpaid authoritative obligations, actual project expenditure, accountable
advances, reconciled and unreconciled balances, custodian cash holdings, project profit or
loss, complete project financial position, complete compensation for any person or role,
authoritative material procurement requirements, stored Documents & Evidence, and
client-commercial data. Each awaits a future Daily Site day-end authority, BD-FIN-01B2,
BD-FIN-01C, BD-FIN-01D, a future materials or People authority, the Documents & Evidence gate,
or a separately approved Simple Invoice contract. **An absent owning domain must surface as an
unavailable state, never as zero.**

**The Daily Site boundary is a plan/outcome boundary, and it is architectural.** The delivered
`daily_site_entries` slice owns the plan and its submission; §4.9 defers the day-end fields
(actual worker count, actual labour cost, actual work completed, day-end notes, unresolved
difference), and no column, function or view currently holds them. A projection may therefore
not synthesise an outcome from a plan: an accepted entry, entry notes, evidence status or a
project update is **not** evidence that planned work was completed or that expected workers
attended. Expected worker count is plan data and must never be composed into an attendance or
payroll figure.

### 12.3 No duplicate ledger

No report table, no report-entry form and no stored report figure is authorised, restating
§12. Specifically: Reports must not persist totals, must not write to any source table, must
not hold a second approval, funding, release, payment or reconciliation record, and must not
introduce a **new generic project-event entry model**. The existing `project_activities`
history and the domain immutable event ledgers remain the only history, and Reports reads
them rather than shadowing them.

### 12.4 Live-derived calculation

The architectural default is **live derivation at read time** from current authoritative
records. Filter and period selection are query parameters, not persisted state, and produce no
authoritative row. Lifecycle arithmetic follows Product Requirements §18.7: drafts excluded;
submitted only in separately labelled pending figures; approved contributing to approved
totals; rejected, withdrawn, returned and superseded excluded from current totals; only the
current authoritative version counted; no double-counting across amendments, submission rounds
or linked claim-to-request relationships; an explicit controlling date per section; and no
currency conversion.

### 12.5 Read-model decision deferred to Stage 4B

Whether BD-REPORTS-01A composes its figures from direct client queries, SQL views, security
definer functions, or a separately authorised derived summary structure is **an open technical
decision deferred to Stage 4B**, the read-only repository and data-readiness inspection. No
table, view, function, index, route, API or component is named or authorised here, because
none has yet been inspected against the delivered schema. Stage 4B must establish existing
data structures, routes, RLS policies, role boundaries, status semantics, currency handling
and date semantics; Stage 4C then carries technical implementation authority; Stage 4D is
implementation. Any performance-motivated materialisation remains subject to §12 and requires
its own authority.

### 12.6 Permission inheritance

Report access is bounded by the access of the underlying rows, and aggregation must not become
an indirect route around row-level security. Concretely, and consistent with §6 and §14:

- role-scoped aggregation is computed **within** the caller's access, not computed globally and
  then filtered for display;
- cross-domain report sections compose per-domain queries and apply each domain's own access
  rule to its own rows;
- the Operations Manager's project-authority scope — current project lead or an active
  assignment — governs every managed-project report section, and no report may disclose
  unrelated-project, company-wide finance, banking or client-commercial information to that
  session;
- Staff and Viewer inherit source visibility only and gain nothing by a fact appearing in a
  report;
- application-side filtering is not a security boundary, and a report is not an exception to
  that rule.

### 12.7 Drill-through and action routing

Every count and total carries a stable reference to its originating domain and record, so it
can link to the exact record or a correctly filtered list rather than a module index page.
Drill-through re-applies access checks on arrival; a report link is never an access grant.

BD-REPORTS-01A introduces **no independent decision control**. Any future inline action
originates in the projection and executes the originating domain's own controlled mutation
under the same role, project-scope and expected-version checks, per §10 invariant 5. No second
approval record and no competing decision path may exist.

### 12.8 Mobile composition

Mobile is a first-class presentation target of the same authoritative records, per §15. Reports
adds no mobile-only data path, no mobile-only validation and no relaxed authority. The Project
Summary composes as stacked cards rather than a compressed desktop table; amount, state,
project and attention information stay visible; horizontal scrolling is not required for the
primary mobile workflow; and deep links resolve to a specific record with project context
preserved.

### 12.9 Snapshot, document and backup boundary

Live reporting and stored artefacts are architecturally separate. A stored, signed, issued or
immutable report snapshot is a **future capability** whose issuance, supersession, numbering,
custody, retention and reproduction rules are undecided, and it is not authorised here.

PDF generation, export mechanics and custody of any generated artefact remain unauthorised and
depend on the future Documents & Evidence domain, which remains **blocked** until an
independent Supabase Storage backup is approved, implemented and restore-tested (§16). A live
report may exist without storing any generated document, and that is the authorised shape of
Reports today. Report output must not become an unprotected evidence repository.

### 12.10 Relationship to adjacent areas

- **Work Inbox** — both are projections. The Work Inbox answers "what needs action now"; the
  Management Attention Summary and Needs Attention sections answer "what is outstanding across
  a period". They may share derivations, but neither becomes a ledger and neither owns a
  decision. **Stage 3 remains outstanding and retains ownership of the unified Work Inbox and
  Notifications capability** — its persistence, recipient resolution, read/unread state and
  action routing are stage 3 concerns and are deliberately undefined here. Stage 4 derives
  attention summaries from existing source states only, so recording stage 4A neither completes
  nor bypasses stage 3; the two remain independently gated (§8).
- **Projects** — the project record and `project_activities` are the spine of the Project
  Summary and Project Activity Timeline. Reports reads them; project-centred creation (§10)
  remains a routing concern that Reports does not participate in.
- **Finance** — Reports presents claims and fund requests within the unified Finance vocabulary
  of Product Requirements §17 and §18.6. Approved is not released; released is not paid; paid is
  not reconciled. BD-FIN-01B2 remains paused and every settled BD-FIN-01B2 decision stands
  unchanged; no Reports section may anticipate release, payment or reconciliation data.
- **People** — recipient identity in BD-FIN-01A claims and its frozen snapshots in BD-FIN-01B1
  allocations remain the authoritative recipient reference (§13). Workforce reporting derives
  from Daily Site **expected** worker counts, crew references and **planned** labour amounts;
  it is not an attendance register, not person-level attendance, not payroll and not complete
  compensation. Person-level attendance awaits a future People authority.
- **Simple Invoice Manager** — remains the external client-commercial system of record. No
  integration exists, none is implied, and no manual duplication is authorised to populate
  Operations Hub reporting.

### 12.11 Read model resolved — stage 4C (2 August 2026)

§12.5 deferred the read-model decision to stage 4B. That inspection is complete, and the
resolved architecture for BD-REPORTS-01A is a **hybrid**: direct filtered client reads under
existing RLS for most sections, plus **one narrow database range source** for Daily Site
obligation and compliance results. Stage 4D implementation remains unauthorised; this section
records the contract it must follow, not its code.

**A. Direct filtered reads under existing RLS** serve Projects, Daily Site entries, Internal
Cost Claims, Fund Requests, project approval requests and the immutable event sources. Each read
is project-filtered, date-filtered where the section has a date rule, and restricted to an
explicit column whitelist. These reads are **independent of the existing list providers**, which
load a domain's whole authorised history without project, date or result bounds and are
unsuitable as a report data path.

**B. One narrow security-invoker range source** serves Daily Site obligation and compliance
across a selected date range. The delivered compliance function evaluates a **single date**;
composing a period from it would mean one call per day, which is rejected under §12.15. The
range source returns only the fields needed to distinguish **entry submitted**, **entry
submitted late**, **waived**, **missing** and **not due**.

It must run with **security-invoker** behaviour so the caller's own policies apply, preserve
the existing Daily Site project-access rules, return no row for an unauthorised project, create
no stored report data and no second ledger, mutate nothing, and evaluate its calendar in
Africa/Nairobi.

### 12.12 Prohibited read-model shapes

The following are **not** authorised for BD-REPORTS-01A:

- a broad cross-domain `SECURITY DEFINER` reporting function — it would move the access decision
  out of the source policies and into report code, contradicting §12.6;
- a materialised or otherwise stored reporting table, which would be a second ledger (§12.3);
- any report-owned mutable event ledger;
- reuse of a `SECURITY DEFINER` project-scoping helper written for a different domain as the
  Reports project selector, since its scope rules belong to that domain and not to reporting.

### 12.13 Per-domain permission inheritance

Reports composes sections whose source domains do **not** share one access rule, and the
composition must not flatten them.

**Correction recorded at stage 4D implementation (2 August 2026).** The stage 4C wording above
previously said that project and project-history reads admit any active manager. Re-inspection
of the effective policy before implementation showed that this is not the case for projects.
The delivered `projects_select_owner_manager_assigned` policy — as replaced by the
20260729000100 material-change migration — admits the owner, anyone actively assigned to the
project, or a manager **who leads it**. An unassigned, non-lead manager therefore does not
receive the project row at all, and Reports cannot offer that project in its selector. Project
availability follows the effective projects RLS response and nothing else.

The asymmetry that does exist, and that the composition must still respect, runs the other way:
`project_activities` admits any owner or manager plus assigned staff, while Daily Site,
Internal Cost Claims and Fund Requests additionally require project authority through project
lead or an active assignment, and grant Staff and Viewer no SELECT policy at all. Assigned
staff may therefore hold a project row, and its history, while every operational and finance
section of that project is inaccessible to them.

The architectural consequence is that a section's availability is decided **per source domain,
per project, per reader**. Where the reader may see the project but not the source, the section
resolves to the explicit no-access state of Product Requirements §18.18 — never zero, never an
ordinary empty state, and never an inference that no records exist. Application-side filtering
remains a presentation concern and is never the security boundary (§12.6).

### 12.14 Safe event projection

Recent Activity is a **non-persistent projection** over the existing immutable event sources.
It selects a fixed, safe tuple only: source domain, event type, actor identifier, normalised
event time, originating record identifier and project identifier. The event tables' JSON payload
columns — claim and claim-line snapshots, Daily Site entry snapshots, previous and new project
values, and free-form event payloads — are **not selected and not exposed**. Labels are explicit
and derived in the projection; the raw event vocabulary of each domain is not rendered directly.

Event-time fields differ across domains; the projection normalises them to a single report event
time, including the fund-request event table's creation timestamp. No generic mutable event
ledger is created (§12.3).

### 12.15 Query and performance boundaries

Every report reader carries project and date predicates and an explicit column list. Selecting
whole rows from event tables is prohibited. The following access patterns are rejected: one
compliance call per day across a period; one request per project for activity; and mounting the
existing domain providers merely to render a report. Where an event or record history can grow
without bound, the reader is paginated or otherwise bounded. Payloads must remain small enough
for a mobile connection, per §15.

**No index is authorised speculatively.** Stage 4D may add an index only where the approved
query plan and repository tests show it is required.

### 12.16 Timezone contract

Report period membership, overdue and approaching indicators, Daily Site obligation evaluation
and event ordering are computed on the **Africa/Nairobi** calendar, in the database or in a
single shared report utility — never from the browser's local timezone. The per-section
controlling dates are in Product Requirements §18.16.

### 12.17 URL-addressable drill-through

Drill-through requires the Daily Site Operations, Site Costs, Fund Requests and Approvals list
routes to read their filter state from the URL, so a report link expresses project, status and
period as addressable parameters. Those routes presently derive filter state internally, so
stage 4D must add URL-addressable filtering before report links can satisfy §12.7. Arrival
re-applies access checks; a report link is never an access grant.

The Reports route is declared **before** the `/admin/*` catch-all, and the capability-gated
navigation entry appears only once the route exists and the reader has at least one authorised
section.

### 12.18 Likely implementation modules

Stage 4D is expected to introduce a Reports route and its test, a report data-access module
alongside the existing per-domain access modules, a report metrics module holding the §18.17
inclusion rules once, a report capabilities module mirroring the existing per-domain capability
utilities, and focused presentation components — with shared project/period controls and shared
empty, unavailable and no-access state components where they are justified by reuse.

These are the expected shape, not a fixed manifest: stage 4D may adopt a smaller coherent
structure where repository inspection shows it is better. A dedicated Reports provider is
optional and is justified only if it reduces coupling rather than wrapping every existing
provider.

### 12.19 Required tests before stage 4D is acceptable

Repository tests must cover status inclusion and exclusion; submitted versus approved figures;
Daily Site supersession and returned-entry exclusion; EAT period boundaries; records submitted
in one period and decided in another; absence of double counting; project scope and role
isolation including the manager access asymmetry of §12.13; inaccessible versus empty;
unavailable versus zero; load failure; exact drill-through parameters; safe event-field
projection; mobile stacked presentation; the absence of any strengthened operational or
financial claim; and demo-mode parity where demo mode is retained.

Any new database range source additionally requires a **real PostgreSQL integration test**, in
the existing database-test pattern, with RLS coverage for Principal, assigned manager,
unassigned manager, Staff and Viewer; proof that unauthorised project rows are never returned;
and proof that the source is security-invoker and **not** `SECURITY DEFINER`.

### 12.20 Stage 4D delivery record — as-built architecture (2 August 2026)

**Implemented in the repository; not deployed and not verified on any hosted system.**

**Database.** Exactly one object was added:
`public.daily_site_range_compliance(range_start date, range_end date, target_project_id uuid)`,
in `supabase/migrations/20260802000100_reports_daily_site_range_compliance.sql`. It answers
Daily Site obligation and compliance for an inclusive date range in a single call, replacing
what would otherwise be one `daily_site_morning_compliance` call per day. It is
**invoker-rights and carries no `SECURITY DEFINER` clause**, so `projects`,
`daily_site_entries` and `daily_site_compliance_waivers` are all read under the caller's own
RLS; it additionally filters the project scan through the existing
`can_manage_daily_site_project()` authority helper, exactly as the morning function does. It
stores nothing, mutates nothing, uses the Africa/Nairobi calendar, and raises rather than
silently clamping on an inverted, incomplete or over-long (>367 day) range. No cross-domain
`SECURITY DEFINER` reporting function, materialised reporting table, persistent report row,
generic event ledger or second finance ledger was created. No index was added: the delivered
`daily_site_entries_project_date_idx` and
`daily_site_compliance_waivers_project_date_idx` already serve this query shape.

It inherits one documented limitation from the morning function unchanged: the obligation test
reads the project's **current** status, stage and archive state, so a historical range reports
obligation against today's project state. Per-date obligation history would require a
project-state history source that does not exist and is not authorised.

**Read model as built.** `src/admin/lib/reports.js` holds narrow readers that are
project-filtered, period-filtered where the domain has a reporting date, field-whitelisted,
bounded (200 rows per list, 50 per event source) and executed under the caller's RLS through the
ordinary PostgREST endpoints. No existing domain provider is mounted to render a report. No
`select=*` is issued and no JSON snapshot or payload column is ever selected — not
`daily_site_snapshot`, `claim_snapshot`, `line_snapshot`, the fund-request `payload`, the
approval `original_values`/`proposed_values`, nor the project-history `previous_values`/
`new_values` — so a raw payload cannot reach the interface. Event reads are scoped to the
project through their parent record with a PostgREST inner embed, so there is no per-project
loop and no per-day loop.

**Module structure as built.** `utils/reportPeriod.js` (EAT arithmetic and formatting);
`utils/reportMetrics.js` (the single status, amount, total, supersession and period-inclusion
authority — presentation components never re-derive a total); `utils/reportFormat.js` (the
shared money formatter, the five-state vocabulary and every approved label);
`utils/reportCapabilities.js` (per-domain presentation gates that mirror the delivered policies
and can never widen them); `utils/reportLoader.js` (pure report assembly, the five-state rules,
the Approvals projection and the Needs Attention derivation); `utils/listUrlFilters.js` (the
shared URL-filter contract); `components/reports/*` (the shell, the two controls and the eight
sections); and `routes/AdminReports.jsx`. No Reports provider was introduced — the route
composes the loader directly, which was the smaller coupling.

**Approvals and Decisions** is a read-time labelled projection over three source groups: project
approval requests, Internal Cost Claim decisions and Fund Request decisions. Each item retains
its source domain, originating record id, state, relevant timestamp and exact source route; one
record yields at most one current-decision row; the current decision summary is separate from
the event history in Recent Activity; and where a source group is inaccessible or failed the
section names it rather than silently omitting it. No finance decision is written into
`approval_requests`. Project Intakes are excluded.

**URL-addressable drill-through.** `/admin/daily-site-operations`, `/admin/site-costs`,
`/admin/fund-requests` and `/admin/approvals` now read `project`, `status`, `from` and `to` from
the URL through `useSearchParams`, show a plain summary of the active filters with a clear
control, and behave exactly as before when no parameter is present. A URL parameter narrows what
the caller can already see and grants nothing: every row still arrives through the caller's own
RLS and each destination re-checks its access as before.

**Mobile as built.** The Project Summary is a single stacked column of cards at every width, with
no table anywhere in the report, no horizontal scrolling, full-width touch targets, and the
project name and period held in a sticky header above the sections.

### 12.21 Architecture confirmed in production — `ACTIVE_VERIFIED` (2 August 2026)

The stage 4D architecture recorded in §12.20 has been verified against the hosted production system
under two separate authenticated browser sessions, Principal and Operations Manager. BD-REPORTS-01A is
classified **`ACTIVE_VERIFIED`**. Production runs `88b56091432ed4766fa61bfe8831595c83448cee` — the
merge commit of PR #61, reviewed head `67ac54a488459b2002125eed55c82c4787775d77` — served by Vercel
deployment `dpl_6UBLRKrrxCFdCBe1uGmALyNa4pQZ`. No migration accompanied the change, so the read model
of §12.11 and the security posture of §12.12 are unchanged.

**The hybrid read model holds in production.** Direct filtered client reads execute under the caller's
own RLS, and the single security-invoker Daily Site range source is called **once per selected
period** — confirmed live, with no per-day call loop and no domain provider mounted to render a report
(§12.15). Every observed reader carried project and date predicates and an explicit column list; no
whole event row was selected; lists were bounded at 200, events at 50 and existence probes at 1. No
index was added.

**Per-domain permission inheritance holds** (§12.6, §12.13). The Operations Manager's selector
returned five projects where the Principal's returned twelve, following the effective `projects` RLS
response and nothing else. A hand-supplied project id for a project outside that response was refused
with **zero** section reads and no disclosure of the project's name or existence — the project-context
gate operating as an additional prerequisite, never as a replacement for source policy. The asymmetry
noted in §12.13 remains unresolved and out of scope: narrowing company-wide manager SELECT on
`approval_requests` and `project_activities` is still a separate authority decision.

**The timezone contract holds** (§12.16). Africa/Nairobi period bounds survive the wire intact: live
requests carried `%2B03%3A00`, decoded to a literal `+03:00`, showed no `" 03:00"` corruption and no
`%252B` double encoding, and returned HTTP 200 with no SQLSTATE `22007`. This was the defect that made
three sections unreachable before the correction; the reporting calendar is now demonstrably
end-to-end correct in production.

**Drill-through holds** (§12.17). Recent Activity entries link to their exact record; opening one
resolves to the precise claim and reconciles with the figure the report showed.

**Section-state and safety boundaries hold.** The selected-period and lifetime-empty states rendered
distinctly in one view; a rejected reader produced the error state rather than an empty or zero
figure; an inaccessible or failed source within the Approvals projection is named rather than silently
omitted. No stored report data, no second ledger and no report-owned event ledger exists. No event
payload or snapshot column was requested, and no access token appeared in any URL.

**Mobile composition holds** (§12.8), confirmed at a live 400 × 725 viewport under both roles: a
single stacked column, no table, no horizontal overflow, usable full-height touch targets, nothing
materially clipped.

**Verification was read-only.** No hosted data was inserted, updated or deleted, and no role, policy,
grant, function, migration or platform setting was changed. One residual evidence limitation is
recorded: the fund-request metric labels could not be exercised against live values because production
holds no fund-request records; the reader itself returned HTTP 200 and rendered the correct
lifetime-empty state.

### 12.22 BD-REPORTS-01B — as-built architecture of the concise report (2 August 2026)

**No database change.** No migration, view, function, policy, grant or index was added, altered
or removed. `public.daily_site_range_compliance` is unchanged and is still called exactly once
per selected period. The report remains live, stores nothing and writes to no source record.

**Composition.** `ProjectSummary` renders seven section components. Each receives its already
loaded section state plus the project id and the reporting range, and renders figures and one
drill-through link. The per-record report card and record list components were removed with the
record lists they rendered, so no component in the Reports tree can render a source record.

**Reader chain unchanged, one caller fewer.** `loadProjectReport` still loads the project,
Daily Site, claims, fund requests and approvals in parallel, and still derives Needs Attention
and the approvals projection from them. It no longer calls `loadRecentActivity`, so an ordinary
report issues **no read against the five event sources**. `loadRecentActivity`,
`projectActivityItems` and the event readers in `lib/reports.js` are retained, exported and
tested for the deferred activity-timeline report.

**Metrics authority unchanged.** `reportMetrics.js` remains the single place inclusion rules,
amount selection and totals live; presentation components never re-derive a total. Two derived
statistics were added there — `complianceRate` and `approvalsSummary` — and both return counts
or a rate over data the page already held, never a new read.

**One drill-through builder.** `utils/reportLinks.js` exports `moduleLink`, the single place a
Reports link is constructed. It encodes its parameters, carries project, status and period, and
omits an incomplete range rather than sending half of one. Approvals is passed no range because
its list route supports no period filter (§12.17). A report link remains an addressable filter
and never an access grant: every destination re-applies its own access checks and reads under
the caller's own RLS.

## 13. People and payee identity separation

The existing spine rule in §4.1 — that external workers who need engagement and payment
records must not be forced into an authenticated `profiles` identity — is extended into a
two-axis model:

- **Identity kind:** person or organisation. These are architecturally distinct; a supplier
  or nursery is not a person record with unused workforce fields.
- **System access:** present or absent, and independent of identity kind. `profiles` remains
  the authenticated-application-user record and must not become the register of everyone
  Botanique pays.

Category vocabularies for workforce and for organisations are defined once and reused across
Projects, Daily Site, claims, payments and reports, so that a person or payee referenced in
one domain is the same entity in another. Finance domains reference identity; they do not
define it.

Nothing here authorises identity-document storage, full bank details or personal financial
history. Existing recipient identity in BD-FIN-01A claims (`recipient_type`,
`recipient_label`) and its frozen snapshots in BD-FIN-01B1 allocations remain the
authoritative recipient reference for finance until a People domain is separately
authorised; a later People domain must reconcile with those snapshots rather than
retroactively rewriting them.

## 14. Dashboard aggregation architecture

Dashboards are projections under §10 and add three constraints:

- Every dashboard value is computed from authoritative records. No editable total, no
  manually maintained figure and no cached value without a defined derivation exist.
- Role-scoped aggregation is computed within the caller's access, not computed globally and
  then filtered for display. Principal-only company-wide commercial and banking aggregates
  must not be computable by an Operations Manager session.
- Cross-domain dashboard sections compose per-domain queries; they do not join across domain
  authority boundaries in a way that would let one domain's access rule govern another's
  rows.

## 15. Mobile presentation architecture

Mobile is a first-class presentation target of the same authoritative records, not a
separate data path. Architectural consequences:

- No mobile-only write path, no mobile-only validation and no relaxed authority on small
  screens. Controlled RPCs and RLS are identical across form factors.
- Deep links resolve to a specific record and re-apply access checks on arrival; a link is
  never an access grant.
- Draft preservation and duplicate-submit prevention are client-side resilience over the
  same idempotency and optimistic-concurrency guarantees the domains already enforce through
  expected-version arguments.
- Offline mutation is **not** authorised. It would require conflict resolution against the
  optimistic-concurrency and immutable-event models and must be designed and verified
  separately before it is offered.

## 16. Backup, recovery and continuity dependencies

**Current posture: `PARTIALLY_VERIFIED_WITH_MATERIAL_GAPS`** — partially verified with
material gaps, following the read-only verification of 1 August 2026 recorded in
`WORKSTREAMS.md`. The architecture distinguishes **verified platform capability** from
**unresolved continuity gaps**; the former does not discharge the latter, and the posture is
not adequate, complete, resilient or disaster-recovery ready.

**Six recovery domains, architecturally separate.** A restore in one domain recovers nothing
in another, and no domain may be assumed to cover a neighbour:

| Domain | Verified capability | Status |
|---|---|---|
| Database | Supabase Pro scheduled backups, daily cadence, seven visible restore points | Verified operational; **PITR disabled** (separate add-on) |
| Storage objects | None — database backups carry **Storage metadata only** | **Excluded from database backups**; no independent backup exists |
| Source code | GitHub; production deployments trace to commit SHAs | Recoverable |
| Deployments | Vercel retention 30 days; current production deployment exposes Instant Rollback | Verified; **complete historical rollback depth unproven** |
| Secrets and configuration | Environment-variable names and targets inventoried | **Values have no evidenced independent custody** |
| Operational documents | Deferred to Documents & Evidence | Not yet applicable |

**Storage is the sharpest architectural consequence.** Because database backups preserve
Storage *metadata* without the objects, a database restore reinstates rows referencing files
that were never restored — a dangling-reference state that fails silently rather than
visibly. Documents & Evidence therefore acquires a hard prerequisite: it must not be treated
as recoverable, and should not ship, before an independent Storage backup policy exists and
has been tested.

**Sole-owner concentration is a continuity dependency, not merely a governance observation.**
The Supabase organisation has exactly one member (Widson Omutelema Ambaisi, Owner) and the
Vercel team has exactly one member with Owner role. There is no secondary recovery authority
in either platform, MFA is disabled on the sole Supabase owner account, and project-scoped
roles are unavailable on the current plans. Botanique and Apicora share both administrative
boundaries. Application RLS operates strictly inside the database and does **not** separate
organisation-level restoration authority; it must never be represented as doing so.

Architectural dependencies still required, all unmet or unverified:

1. Independent logical export, encrypted and stored outside the primary Supabase project,
   with defined daily, weekly and monthly retention, and defined encrypted key custody.
2. Independent Storage-object backup, preserving database-to-file references such that either
   side can be restored independently without orphaning the other.
3. A documented recovery procedure with named authority, ordered steps, expected downtime,
   post-restore verification and an audit record.
4. Periodic isolated restore testing, suggested quarterly, with an annual disaster-recovery
   review. Supabase restore-to-new-project is the appropriate vehicle, because it exercises
   recovery without touching production.
5. A named secondary recovery authority, and formal founder-approved recovery point and
   recovery time objectives.
6. Verification of complete older Vercel Instant Rollback depth.

Continuity interacts with two existing invariants and must not weaken either: immutable event
ledgers must survive restore intact, and no restore procedure may become a route to permanent
deletion of authoritative records. **A restore is a recovery action, never an editorial one:**
no restore may be used to erase, rewrite or selectively reinstate authoritative history, and
any restore that changes authoritative state is itself an event requiring a recorded audit
trail.

**Custody model approved 1 August 2026; the continuity dependency is unchanged.** For Botanique
governance, Widson Omutelema Ambaisi remains the sole current platform authority. This is
accepted as the interim operating model only. It does not resolve the verified absence of an
independent human recovery authority and does not make the recovery posture sufficient. Recovery
custody is defined as encrypted and sealed offline custody of platform recovery codes,
encryption-key recovery material and written succession instructions sufficient to support
platform-account recovery under an approved succession or emergency-access process; it must not
contain ordinary working passwords or shared day-to-day credentials. Architecturally this changes
nothing about dependency 5 above — **sealed offline custody is recoverable material and does not
count as a human secondary authority** — and a break-glass account, limited administrator role or
named second human authority remains a deferred founder decision pending verification of platform
permission models, cost and Botanique–Apicora administrative separation. Multi-factor
authentication on the sole owner account is an approved requirement rather than an implemented
control, and the account email is itself part of the recovery chain: its own security and
recovery posture must be addressed before any downstream platform recovery is assumed to depend
on it safely.

**Recovery-dependent product gates.** Two modules are gated on recovery evidence rather than on
their own design readiness, and the architecture must carry both. **Documents & Evidence** remains
blocked until an independent Storage backup is approved, implemented and restore-tested, because a
database restore reinstates metadata referencing objects that were never restored. **Payments
(BD-FIN-01C) and Reconciliation (BD-FIN-01D) must not be activated for authoritative production
use, or relied upon as Botanique's authoritative financial record**, until independent database
backup and restore testing are complete and founder-approved recovery point and recovery time
objective decisions have been recorded. Unrelated Operations Hub authority and design work is not
blocked by either gate.

## 17. Relationship to BD-FIN-01B2, BD-FIN-01C and BD-FIN-01D

BD-FIN-01B2 implementation is paused pending §§10–17 and Product Requirements §§14–23. The
pause is architectural placement, not a reopening: its approved conclusions — the two
release models, direct-recipient releases bound to exactly one existing
`fund_request_allocation` and capped at that allocation's approved requested amount, no new
recipient identity authored at release, derived release progress, final closure of unused
release authority, receipt acknowledgment derived from immutable events, administrative
annulment only where no money moved, real reversals deferred to BD-FIN-01D, no
`Ongoing`-only release restriction and no release-allocation table — remain unchanged and
authoritative.

The single architectural addition is placement: the Fund Releases interface is delivered
inside the unified Finance presentation rather than as a further standalone top-level
destination. Its database authority, RLS, controlled RPCs, concurrency model and immutable
events are unaffected by presentation, which is exactly what §10 is designed to guarantee.

Forward-compatible extension is stated plainly rather than disguised. Where later work must
extend a delivered surface — as BD-FIN-01B2 must extend the `fund_request_events` event-type
domain and add an active-release guard to `cancel_fund_request` — it is documented as a
controlled, forward-only extension of an ACTIVE_VERIFIED implementation, not as a claim that
nothing delivered will change.

BD-FIN-01C and BD-FIN-01D inherit the same rule: their user-facing surfaces are Finance
presentations, their authority remains their own domain tables, immutable events and
controlled functions, and each remains independently gated.
