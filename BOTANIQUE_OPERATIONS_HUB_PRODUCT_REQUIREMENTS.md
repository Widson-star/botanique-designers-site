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

**Phase 1B:** Leads UI · qualification and follow-up queues · site visits ·
won-lead-to-project workflow · improved action dashboard.

**Phase 2:** project milestones · design and implementation workflow · tasks · blockers ·
project dates · real-time project tracking (per §C's "real time" clarification).

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
