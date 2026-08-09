# Operations Hub — Working Authority (images 05–14)

Ten Founder-frozen composition screens, preserved on 9 August 2026. They **supplement** the four
approved screens one directory up (`../01`–`../04`); they do not replace, supersede or retire any
of them. Their numbering deliberately continues that sequence, so the programme now holds **14
authority images in total**.

## Preservation rule — binding

The Founder froze these images on 8 August 2026:

> "I HONESTLY LOVE THE CURRENT SLIDES. DONT CHANGE/ALTER ANY OF THEM RIGHT NOW."

No redraw, regeneration, cropping, resizing, recompression, optimisation, annotation, recolouring,
metadata rewriting or pixel change. No replacement by application screenshots. No Claude-authored
recreation. They were copied into this directory byte-for-byte and verified by SHA-256 **and**
`cmp` against the supplied originals. Reopening any single image for revision requires an explicit
Founder instruction naming that image.

| File | SHA-256 |
| --- | --- |
| `05-dashboard-operational-spine-working-authority.png` | `fc623bfe5bf2a3b384f66dbc0a98863c847294653076fec3d54b88ba740cb410` |
| `06-project-register-working-authority.png` | `903e4a9b30ed700ce2efb839c0556f7f014483d1dd0dff86bfc277d6c2ad7ac0` |
| `07-project-proposals-working-authority.png` | `6265249bd1bcb14812b04bc191f9fe6dc3abc0a21860f5928bc3ec88437f0789` |
| `08-daily-site-record-list-working-authority.png` | `31dcbbc9f65e91ecfdaf43e6d2ce9995f7c29cf1ac798979513493353bc7f24d` |
| `09-daily-site-record-detail-working-authority.png` | `0fe5b8f937814e3dcba381efc21e41ca71661618062d281dddb06846815ef26d` |
| `10-people-engagements-working-authority.png` | `69c898c56fdc594f56c1fe2c56ddcfe67131e5580a723aadec0d70165204d15b` |
| `11-maintenance-tools-equipment-working-authority.png` | `c78173a55eb172456ac8f8d3bc8843c7b04f3916c7c7f612bdde30c6d32f7910` |
| `12-finance-overview-working-authority.png` | `b2316b187e274bae0e3dc8c58af3f46bcd01ad5a51af6073f6c7647669b796a8` |
| `13-finance-children-working-authority.png` | `febbadedb1f9008cdf000147fb1e0afc001566c30a992293df0b6440fb829e26` |
| `14-approvals-project-summary-working-authority.png` | `5f8be3e11b6d42695ac00d2c20106be42d75737499f4079de8e7a6f25353c725` |

The transfer archive's own filename is **not** authoritative and must never be used to rename the
product, the directory or any image. The individual filenames above are the authoritative names.

## What each image governs

| File | Governs |
| --- | --- |
| `05` | Dashboard as the daily operational spine: the four-step rhythm (morning record → cost claim → Principal decision → close-out), KPI strip, projects-needing-attention, cost overview, recent activity, WhatsApp support |
| `06` | Project Register: portfolio KPIs, controlled filter row, register columns, next-action column |
| `07` | Project Proposals: review KPIs, state filter chips, proposal columns, conversion-to-live-project note |
| `08` | Daily Site Record list: day KPIs, state filter chips, record columns, and the explicit hand-off to cost claims |
| `09` | Daily Site Record detail: the spine repeated at record level, site/workforce/pricing/funds panels, submitted-and-reviewed identity, supporting evidence, and the approval-is-not-payment notice |
| `10` | People list and person detail, including **Engagements as a tab inside the person**, current vs past engagements, and people-without-portal-access |
| `11` | Maintenance and Tools & Equipment: visit scheduling/follow-up, and asset custody/condition/reorder |
| `12` | Finance Overview: the five-area model, position summary, top expense categories, recent finance activity |
| `13` | Finance children: Project Costs, Company Expenses, Staff Compensation, and Funding/Payments/Reconciliation — including the three-state approved → paid → reconciled truth model |
| `14` | Approvals as one aggregated decision queue across request types, and the compact Project Summary |

## Authority status — read this before implementing from them

These ten are **design, composition and workflow-direction authority**. They are:

- **Composition authority** — hierarchy, density, panel grouping, filter placement, drill-through.
- **Workflow-direction authority** — the operational rhythm and the order of decisions.
- **NOT production-data authority.**

Every name, amount, date, count, percentage, status, project, bank balance, payroll figure,
attendance split and inventory quantity visible inside them is **illustrative sample content**. None
of it may be written into the production database, and none of it authorises a field, metric, state
or workflow the system cannot truthfully compute. This is the same rule as interpretation rule 7 of
`../README.md`, and it applies here in full.

They also do **not** by themselves authorise implementation. As with the four approved screens and
the operating-model authority, a separate explicit implementation authorisation is required for each
unit of work.

## Relationship to the existing authority

- `../01`–`../04` — Founder-approved **visual product authority**, with nine binding interpretation
  rules in `../README.md`. Unchanged, unretired, still controlling for the shell, alerts, the
  Reports Centre direction and compact Project Summary composition.
- `../operating-model-authority/` — the settled **architecture**: identity, the 104px rail, the six
  domains, the Finance area model, standalone Approvals, and the Compact Presentation Standard.
  Still controlling.
- `../stage-6-navigation-authority/` — superseded in part by the operating-model authority; retained
  as committed history.
- **This directory** — how the settled architecture should *compose* on the page, domain by domain.

Where an image in this directory and the operating-model `decision-record.md` disagree, the
**decision record wins** and the disagreement must be reported to the Founder rather than resolved
in either direction. Three such disagreements are already known and are recorded below.

## Known image-vs-settled-model tensions — ALL THREE SETTLED, 9 August 2026

These were found by reading the images against the merged authority and were recorded as open in
PR #95. **The Founder has now ruled on all three.** The images themselves remain frozen and
byte-for-byte unaltered; the rulings govern how they are read. Full text of each ruling is in
`../payment-reconciliation-authority/README.md`.

1. **`06` sidebar shows "Project Templates" — SETTLED: not approved product architecture.** The
   authoritative Projects structure remains Project Register + **Project Proposals**. There is no
   approved Project Templates module, route or model, and **none may be implemented on the
   strength of this image**. This illustrative element does not override the operating-model
   authority. `src/admin/navigation.js` is already correct.

2. **`13` sidebar shows Finance expanded with persistent children — SETTLED: Option B stands.** The
   five Finance capabilities (Overview, Project Costs, Company Expenses, Staff Compensation,
   Funding Payments and Reconciliation) remain authoritative, but they are **not** required to
   become persistent expanded sidebar children. The navigation implemented by PR #94 stands:
   Finance is a top-level domain whose internal departmental navigation is handled through the
   Finance surface / in-page treatment. **Do not revert to the deep-sidebar treatment merely
   because it appears in this image.** Image `13`'s approved → paid → reconciled truth model is a
   separate matter and is correct as direction — see "Capability gap warning" below.

3. **`11` combines Maintenance and Tools & Equipment — SETTLED: they remain two distinct Operations
   capabilities.** Operations is Daily Site Record, People, Maintenance, Tools & Equipment. Image
   `11` may provide composition guidance and must **not** be interpreted as merging their domain
   models or eliminating either destination.

## Capability gap warning

Most of what these images render does not yet exist in the database. In particular `09` shows
attached evidence files, `12` shows a bank balance and money-in/money-out position, `13` shows paid
and reconciled states, and `14` shows attendance splits, retention and certified-to-date. The
repository has **no** table, column or workflow for any of those. `../operating-model-authority/remediation-inventory.md`
and the reconciliation recorded in `WORKSTREAMS.md` (9 August 2026) carry the full analysis. Nothing
here licenses inventing them.

The **paid and reconciled** states shown in `13` are the subject of a dedicated authority settled on
9 August 2026: `../payment-reconciliation-authority/`. That directory proves from the migrations that
no payment or reconciliation truth exists today, proposes the smallest model that would create it,
and lists the five Founder decisions still required. It is authority, **not implementation** — the
states in `13` remain unrenderable until that model is separately authorised and built.
