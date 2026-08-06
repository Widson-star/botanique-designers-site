# Stage 6 — Progressive Navigation and Mobile Shell: Visual Authority Extension

**Founder-approved on 6 August 2026 by Widson Omutelema Ambaisi. Revision 2.**

This directory is binding visual and interaction authority for the Stage 6 navigation shell. It
**supplements and does not replace** the four original screens one directory up
(`../01-dashboard-authority.png`, `../02-alerts-popover-authority.png`,
`../03-reports-centre-authority.png`, `../04-project-summary-authority.png`) and their
`../README.md`. Those four remain authoritative and unchanged; where they and this extension both
speak, they agree, except on the single terminology point recorded below.

## Approved destination structure

| Domain | Destinations |
| --- | --- |
| Dashboard | Dashboard |
| Projects | Projects, Project Intakes |
| Operations | Daily Site Operations, Site Costs, Approvals |
| Finance | Fund Requests |
| Reports | Project Summary |
| More | People |

This mapping is settled. It is not reopened by implementation.

## Binding properties

The images in this directory are binding for:

- the six-domain sidebar and the order of its domains;
- the 235px expanded desktop sidebar and the 64px collapsed desktop rail;
- the collapsed resting state, the hover-label state and the keyboard-focus state;
- the active destination treatment (sage pill, green label and icon, active dot on a child);
- the expanded-but-inactive group treatment (bold label, open chevron, no sage fill);
- the shaded child container behind an expanded group's children;
- **independent active and expanded states** — a group may be expanded while a different
  destination is active, and an expanded group must not falsely mark a child active;
- Projects rendered as a disclosure containing Projects and Project Intakes;
- Operations containing Daily Site Operations, Site Costs and Approvals;
- Finance containing Fund Requests only; Reports containing Project Summary only;
  More containing People only;
- the Botanique Designers wordmark treatment (leaf mark + `BOTANIQUE` / `DESIGNERS`);
- the desktop header: search placement and width, Alerts bell and badge, then the
  name-over-role identity, circular initials avatar and dropdown chevron;
- the Martine Lotom / Operations Manager identity hierarchy — person's name primary, role
  visually subordinate;
- the avatar and profile-menu treatment, including sign-out living inside the profile menu;
- the help / system-admin sidebar footer card and the collapse control beneath it;
- project-search placement; Alerts bell and popover placement;
- mobile drawer width and hierarchy, mobile in-place disclosures, the mobile profile-menu
  identity model and the mobile Alerts overlay;
- desktop and mobile spacing, density, typography and colour treatment as represented here.

## Visible terminology authority

Visible waive-family wording is **prohibited**. Only these are permitted in the interface:

- `Mark not required`
- `Not required`
- `Not required today`
- `marked not required`

`../01-dashboard-authority.png` shows a visible **"Waive"** button. That image is superseded
**on this terminology point only**; every other property it governs stands. This is settled
authority and is **not** an open decision.

## Illustrative-content limit

Sample project names, client names, people names, counts, figures, dates, statuses, list rows,
metrics and actions in these images exist solely to establish visual density and rhythm. They are
**illustrative only**. They are not product-data authority, and they are not authority to seed or
modify records, add fields, add actions, add filters, add metrics, add workflows, or build any
unavailable functionality.

Implementation must use only existing routes, existing components, existing capability checks,
real data and already-authorised behaviour. **No unavailable feature is authorised by this pack.**

## The screens

**Desktop (1448×1086, matching the original pack's canvas)**

| File | Governs |
| --- | --- |
| `01-desktop-projects-expanded-projects-active.png` | Projects expanded, Projects active |
| `02-desktop-projects-expanded-project-intakes-active.png` | Projects expanded, Project Intakes active |
| `03-desktop-finance-expanded-fund-requests-active.png` | Finance expanded, Fund Requests active |
| `04-desktop-reports-expanded-project-summary-active.png` | Reports expanded, Project Summary active |
| `05-desktop-more-expanded-people-active.png` | More expanded, People active at full strength |
| `06-desktop-collapsed-resting.png` | Collapsed rail at rest — no label visible |
| `07-desktop-collapsed-hover-label.png` | Collapsed rail, hover label |
| `08-desktop-collapsed-keyboard-focus.png` | Collapsed rail, keyboard focus ring plus label |
| `09-desktop-active-expanded-independence.png` | Dashboard active while More is expanded and People is **not** active |

**Mobile (375×900 and 400×900, paired)**

`10`/`11` menu closed · `12`/`13` first-level navigation · `14`/`15` Operations expanded ·
`16`/`17` Projects expanded with Project Intakes · `18`/`19` Finance expanded with Fund Requests ·
`20`/`21` Reports expanded with Project Summary · `22`/`23` More expanded with People active ·
`24`/`25` Alerts open with the drawer closed · `26`/`27` profile menu showing Martine Lotom and
Operations Manager · `28`/`29` close and group-collapse affordance.

## Interpretation rules carried forward

The nine interpretation rules in `../README.md` apply to this extension unchanged. In particular:
these screens do not authorise invented data or unbuilt features; deviations require explicit
Founder approval; and where repository capability authority and a screen appear to conflict,
implementation stops for clarification rather than improvising.

## Provenance

Produced as the Stage 6 authority-extension draft, revised once after Founder visual review, and
approved as Revision 2 on 6 August 2026. Colour and geometry were sampled directly from the four
original committed PNGs (header 81px, sidebar 235px, shared field `#faf9f8`, active pill `#ecefe9`
at 41px on a 53px pitch, child container `#f6f5f3`, search 450×46) so that this extension matches
the original pack by measurement rather than by estimate. Typography uses Quicksand and Fraunces,
the families the application already configures; the six domain glyphs are drawn to the original
pack's geometry.
