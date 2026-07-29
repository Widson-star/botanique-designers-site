# Botanique Operations Hub — Architecture Blueprint (BD-OPERATIONS-HUB-01)

**Authority revision:** 28 July 2026, following Phase 1B-A2 production acceptance.

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
| Functional navigation | Dashboard and Projects only | `src/admin/AdminLayout.jsx` |
| Project data lifecycle | Supabase-backed load, create and update with reconciliation | `src/admin/context/AdminDataContext.jsx`, `src/admin/lib/supabase.js` |
| Project CRUD | Live, role-scoped, archive/restore only | Admin project routes and forms |
| Material project authority | Interim database guard | `20260726000200_operations_hub_phase_1b_a1_project_integrity.sql` |
| Project history | Trigger-written immutable audit ledger | `project_activities` migration, Activity History UI |
| Roles | `owner`, `manager`, `staff`, `viewer` | admin-foundation migration, `roles.js` |
| Project visibility | Owner/manager portfolio access; assignment-scoped staff access | project RLS |
| Protected financial references | Owner-only legacy reference table | admin-foundation migration |
| Leads foundation | `campaigns`, `leads`, `lead_activities` schema/RLS live; no UI | Phase 1A migration |
| Client commercial documents | External authority | Simple Invoice Manager |
| Realtime | Not implemented | save/refetch architecture |

Production contains nine legitimate project records. Alego Usonga remains operational,
and Zizu Investments Ltd is the founder-reconciled ninth operational project, not test,
demo or seed data. Documentation and audit tasks must not mutate hosted data.

The accepted admin interface exposes only Dashboard and Projects. Future destinations are
added progressively after implementation and authorisation.

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
| Daily site operations (morning plan, attendance intent, no-work status) | Future Operations Hub domain | Primary future authority; per-project, per-date operational record |
| Client estimates, invoices, receipts, payments and balances | Simple Invoice Manager | Later verified references and authorised summaries only |
| Project fund transfers, allocations and reconciliations | Future Operations Hub domain | Primary future authority |
| Labour agreements, additions, payments and balances | Future Operations Hub domain | Primary future authority |
| Operational expenditure | Future Operations Hub domain | Primary future authority; links to originating records |
| Project updates and discussion | Future Operations Hub domain | Structured asynchronous operational record |
| Evidence and documents | Future Operations Hub domain/storage policy | Linked evidence with scoped access |
| Approval proposals and decisions | Future Operations Hub domain | Reusable immutable workflow |
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

### 4.2 Approvals

The Approvals foundation is the next implementation domain. Conceptually it requires:

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

The current `tg_guard_project_material_authority()` trigger remains an interim enforcement
boundary. A future approvals implementation must retain equivalent or stronger authority
before any reviewed replacement of that guard.

The first project-linked slice is merged and its additive migration
`20260728000100_operations_hub_approvals_foundation.sql` is applied to hosted
`botanique-admin`. Hosted schema, RLS, function grants and pre-existing-data integrity are
verified, with both approval tables empty. The observed React `#418` console error was a
route-aware hydration defect on `/admin`, since repaired and merged under PR #38 (merge
commit `f95e31f55c0d74844b79aaca3ac831ed3bb1208a`); admin routes now client-render with
`createRoot` instead of hydrating the Vercel-rewritten homepage shell. Classification
remains `APPLIED_WITH_LIMITATION`, with the residual limitation narrowed to manager
authenticated production-UI verification; owner authenticated exact-head verification and
signed-out production both passed with a clean console.
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
**APPLIED_WITH_AUTHENTICATED_VERIFICATION_PENDING — hosted migration applied; Phase 1 merged.**
The first narrow slice (Daily Site Entry capture, review/correction lifecycle, owner
compliance waivers, morning-compliance calculation, a Dashboard attention surface and a
mobile-first admin interface) was merged in PR #41 at authoritative `main`
`dfb79373397637694fa26d730c110da58f20acae`, and its additive migration
`20260728000200_operations_hub_daily_site_operations.sql` (recorded hosted version
`20260729064007`) is now **applied to hosted `botanique-admin`** — three tables
(`daily_site_entries`, immutable `daily_site_entry_events`, `daily_site_compliance_waivers`),
narrow `SECURITY DEFINER` lifecycle functions and a `daily_site_morning_compliance()`
calculation, all verified read-only after apply, with the production deployment and signed-out
`/admin` (desktop + mobile) confirmed. No operational data exists yet (0 entries/events/
waivers) and no hosted row was mutated; the remaining gate is authenticated owner/manager UI
verification. Accepted entries are corrected only by supersession (prior row preserved).
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

## 5. Progressive navigation architecture

Current production:

- Dashboard
- Projects

Eventual groups:

| Group | Destinations |
|---|---|
| Operations | Dashboard; Leads; Site Visits; Projects; Daily Site Operations; Project Updates & Discussion; Tasks & Assignments; Maintenance; Approvals |
| People and finance | Team & Resourcing; Project Engagements; Project Funds & Reconciliation; Labour Engagements & Payments; Client Commercial Records; Operational Expenditure |
| Knowledge and reporting | Documents & Evidence; Reports & Management Summary; Settings |

Routes and links are added only with functional modules, reviewed access policy and useful
role-appropriate empty states. No module is exposed as a disabled future destination.

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

## 8. Implementation roadmap and dependencies

Governing order:

1. Operations Hub authority revision — documentation only.
2. Approvals foundation. *(Merged.)*
3. Daily Site Operations & Morning Compliance. *(Merged, PR #41; hosted migration applied — authenticated verification pending. §4.9.)*
4. Operational Expenditure.
5. Project Funds & Reconciliation.
6. Labour Engagements & Payments.
7. Documents & Evidence.
8. Project Updates & Discussion.
9. Tasks & Assignments.
10. Team & Resourcing.
11. Client Commercial Records.
12. Reports & Management Summary.
13. Leads, Site Visits and Maintenance integration.

Dependency structure:

- Daily Site Operations & Morning Compliance is the next implemented domain; its
  recommended first slice is Daily Site Entry capture plus morning compliance only, with
  Operational Expenditure deferred to a separate second slice.
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
- Dashboard and Projects as the only current navigation;
- current migrations, RLS, functions and triggers;
- the interim material-authority guard;
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
