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
2. **Approvals foundation.**
3. **Project Funds & Reconciliation.**
4. **Labour Engagements & Payments.**
5. **Project Updates & Discussion.**
6. **Tasks & Assignments.**
7. **Team & Resourcing.**
8. **Client Commercial Records.**
9. **Operational Expenditure.**
10. **Documents & Evidence.**
11. **Reports & Management Summary.**
12. **Leads, Site Visits and Maintenance integration.**

Project Funds and Labour Engagements are elevated because recurring allocations,
reconciliation, agreed-versus-paid amounts and accountability between Widson, Martine and
project teams are immediate operational pain points.

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
