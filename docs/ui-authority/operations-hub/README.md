# Operations Hub — Visual Product Authority

Founder-approved on 3 August 2026 by Widson Omutelema Ambaisi. Adopted into the repository
unaltered; the four images here are byte-identical to the approved pack.

These screens sit **alongside** `BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md` and
`BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md`. Product Requirements and Blueprint govern *what may
be built*. These screens govern *how a built thing must look and behave*.

## The four screens

| File | Governs |
| --- | --- |
| `01-dashboard-authority.png` | Portal shell, grouped navigation, page hierarchy, spacing and density, controlled card composition, colour restraint, search and profile header |
| `02-alerts-popover-authority.png` | Top-right alert-bell placement beside the profile, unread count, compact popover interaction |
| `03-reports-centre-authority.png` | Internal report-category navigation, one selected report at a time |
| `04-project-summary-authority.png` | Compact Project Summary composition on a contained grid |

## Interpretation rules

These nine rules are binding. They are not summarised guidance; they are the terms on which
the screens were approved.

1. **These screens are visual product authority, not loose inspiration.** They are structural
   and visual requirements with the same standing as written authority.

2. **Every future portal UI workstream must inspect them before implementation.** Reading this
   file is not sufficient — the images themselves must be opened and compared against the
   screen being built.

3. **Dashboard authority governs the shell, grouped navigation, density and card rhythm.**
   `01-dashboard-authority.png` is the reference for how any portal page is framed.

4. **Alerts authority governs the bell placement and compact alert interaction.**
   Alerts live behind a top-right bell near the user profile. Alerts are **not** a permanent
   sidebar destination, and "Work Inbox" is **not** a user-facing name.

5. **Reports Centre authority governs internal report-category navigation and one selected
   report at a time.** Reports are not a stack of every report on one page.

6. **Project Summary authority governs compact composition and prevents a universal long
   dossier.** A project view is a contained grid of small panels, not an endless page.

7. **Screens do not authorise invented data or unbuilt features.** Where a screen shows
   illustrative figures, a metric, a report or an action, the Product Requirements, Blueprint
   and implemented domain authority still decide whether it may be built at all. A number
   appearing in an image is never a licence to display a number the system cannot truthfully
   compute.

8. **Deviations require explicit Founder approval.** Shell, hierarchy, density, card rhythm,
   colour restraint and the navigation model may not be departed from silently.

9. **If repository capability authority and a screen appear to conflict, implementation must
   stop for clarification.** The correct response is to report the conflict to the Founder, not
   to improvise a resolution in either direction.

## Standing prohibitions carried by these screens

- No endless stacked operational pages.
- No giant tables where a compact panel is shown.
- No machine-generated card dumps.
- No reintroduction of a permanent Alerts or Work Inbox sidebar item.

## Relationship to the delivered Alerts capability

The Stage 3 attention model — items derived from authoritative source records, no duplicated
business truth, per-user seen state only, reading never resolving an operational issue — is
unaffected by these screens and remains governed by the Product Requirements and Blueprint.
`02-alerts-popover-authority.png` superseded only the **presentation** of that model.
