# Measurement Plan — BD-MEASUREMENT-01

**Workstream:** BD-MEASUREMENT-01 — Enquiry Measurement
**Status:** Phase A complete — Vercel Web Analytics pageview foundation is
merged, deployed and production-verified (13 July 2026; production commit
`fa49bf31077c7b258a580ce6fac260f55b68de62`). Pageviews only are active; no
custom `track()` events exist. Custom events are Phase B and remain **BLOCKED**
until the owner confirms this specific Vercel project is on Pro/Enterprise and a
reviewed implementation brief exists (see §5 and §8).
**Scope:** Website analytics only. This document does not change, and is not
authoritative for, GardenCare commercial policy, the project-enquiry journey,
WhatsApp behaviour, consultation pricing, or any protected system — see
`GARDENCARE_PRODUCT_DEFINITION.md` and `WORKSTREAMS.md` for those.

---

## 1. What this phase adds

- [Vercel Web Analytics](https://vercel.com/docs/analytics) pageview tracking,
  via `<Analytics />` from `@vercel/analytics/react`, rendered once at the
  application root (`src/App.jsx`, client bundle only).
- Automatic pageview recording on first load and on every in-app (React
  Router) navigation, using the library's built-in History API detection — no
  route wiring was added or needed.
- Nothing else. No custom events, no other analytics provider, no cookie
  banner, no consent flow.

## 2. What this phase deliberately does NOT add

- **No Google Analytics, Meta Pixel, Hotjar, session recording, or any
  advertising/tracking pixel.** None existed before this phase; none were
  added.
- **No custom `track()` calls.** Vercel's custom-events feature is documented
  as a Pro/Enterprise capability. This repository has no evidence (no linked
  Vercel project config, no plan/team environment variables) confirming which
  plan the account is on, so plan eligibility could not be conclusively
  verified. Per the operating rule for this phase, custom events are **not**
  implemented until the owner confirms plan eligibility — see §4 (Phase B).
- **No cookie banner or consent mechanism.** Vercel Web Analytics as
  configured here (pageviews only, no custom events, no `beforeSend` PII
  capture) does not set tracking cookies or collect personal data, so no
  consent UI is introduced. This is a statement of current, factual behaviour
  — not a general legal claim, and it must be re-checked if the
  instrumentation ever changes (e.g. if custom events start collecting
  anything beyond the privacy-safe properties in §5).
- **No change to the visitor journey, enquiry wording, WhatsApp behaviour, or
  any CTA.** This phase is observational only.

## 3. Primary business outcome

> A visitor hands off a serious project enquiry to WhatsApp.

This is the outcome the practice actually cares about. Everything below is a
weaker or earlier signal toward it — not a proxy for revenue or a confirmed
client.

## 4. Secondary intent signals (what we want to eventually measure)

These are the moments, on the existing site, that indicate a visitor is moving
toward the primary outcome:

1. Project Enquiry wizard opened.
2. Wizard completed and WhatsApp handoff clicked.
3. Direct WhatsApp CTA clicked (outside the wizard).
4. GardenCare programme selected (on `/gardencare`).
5. GardenCare enquiry opened.
6. Phone link clicked.
7. Public email link clicked.
8. Consultation flow intentionally selected (visitor picks "Consultation &
   Site Assessment" in the wizard).

## 5. Proposed future custom events (Phase B — NOT implemented in Phase A)

**Phase B is pending owner confirmation of Vercel plan eligibility for custom
events.** Nothing below has been implemented; no `track()` call exists in the
codebase as of Phase A. This section exists so that, once eligibility is
confirmed, implementation can proceed directly from an agreed taxonomy instead
of being designed from scratch.

| Event name | Fires when | Privacy-safe properties |
|---|---|---|
| `Project Enquiry Opened` | The six-step project-enquiry wizard opens | `page_path`, `source` (e.g. `header`, `hero`, `service_page`, `area_page`, `project_card`), `service_category` (the prefilled service, if any) |
| `Project Enquiry Sent` | The wizard's final step opens WhatsApp with the prepared message | `page_path`, `source`, `service_category` |
| `WhatsApp Clicked` | Any direct "WhatsApp Us" CTA is clicked outside the wizard flow | `page_path`, `cta_location` (e.g. `footer`, `faq`, `service_page_cta`) |
| `GardenCare Programme Selected` | A visitor selects a programme card on `/gardencare` | `page_path`, `programme` (`GardenCare Regular` \| `GardenCare Monthly` \| `GardenCare Seasonal`) |
| `GardenCare Enquiry Opened` | A GardenCare-specific CTA opens the wizard | `page_path`, `cta_location` |
| `Phone Clicked` | A `tel:` link is clicked | `page_path`, `cta_location` |
| `Email Clicked` | A `mailto:` link is clicked | `page_path`, `cta_location` |
| `Consultation Selected` | A visitor selects "Consultation & Site Assessment" at wizard step 2 | `page_path`, `source` |

All event names and property values are short, plain-English strings — well
under Vercel's documented 255-character limit for event names and property
values.

### Explicitly prohibited from any event, now or in Phase B

The following must **never** be sent as an event property, under any event
name, at any point:

- visitor name
- email address
- phone number
- precise address or any visitor-typed location text
- free-text project descriptions
- WhatsApp message contents
- payment details
- M-Pesa information
- consultation distance (the calculated or manually entered km)
- `/admin`, finance, or project-tracker activity of any kind
- persistent user identifiers (no custom visitor/user ID is generated or sent)
- sensitive or nested data of any kind (properties must be flat, primitive
  values only — matching `@vercel/analytics`'s own property-shape rules)

If a future event's only way to be useful would require one of the items
above, the event should be redesigned or dropped — not implemented with the
restriction relaxed.

## 6. Reporting routine

### Weekly (available now, from Phase A pageview data)

- Top landing pages.
- Top service pages.
- GardenCare traffic (`/gardencare` and its entry points).
- Project/case-study traffic (`/projects` and `/projects/:slug`).
- Device category (mobile vs desktop vs tablet).
- Referrer/source patterns.

### After Phase B custom events become available

- Enquiry opens by page.
- WhatsApp handoffs by page.
- GardenCare programme interest (which programme is selected most).
- Opened-to-sent enquiry ratio (`Project Enquiry Sent` ÷ `Project Enquiry
  Opened`).
- CTA source performance (which `cta_location`/`source` values produce the
  most enquiry opens).

### Interpretation rule

**Clicks and WhatsApp handoffs are intent signals, not confirmed paying
clients or revenue.** A visitor who taps "Send Enquiry on WhatsApp" has
expressed interest — they have not necessarily become a client, and the
amount, if any, is not tracked by this system (consultation fees and project
values live in the protected finance/project-tracker systems, which this
workstream does not touch). No target, benchmark, or conversion-rate
improvement is claimed by this document; none exists yet, because no baseline
has yet accumulated. Pageview collection is now active (see §7–§8), but real
data should accumulate for an initial 7–14 day baseline before any targets or
conversion recommendations are set — not invented in advance.

## 7. Dashboard enablement — COMPLETED

Vercel Web Analytics has been **enabled by the owner for this project** in the
Vercel dashboard (confirmed 13 July 2026):

- Team: `botanique-designers-projects`
- Project: `botanique-designers-site-gpm1`
- Project ID: `prj_AgYJrkgpGuLeykbASImM3QT5Xhed`

This **supersedes** the earlier statement that dashboard enablement was still
required — that action is done. Both the code-side integration and the dashboard
setting are now in place, so pageviews are being collected.

Custom events (Phase B) additionally require confirming this specific project is
on a Vercel **Pro or Enterprise** plan before any `track()` call is added. That
plan tier has **not** been confirmed, so Phase B remains blocked — see §5 and
§8.

## 8. Production release closeout (Phase A) — 13 July 2026

Phase A is complete, merged, deployed and production-verified. Verified facts:

- PR #11 was marked ready and squash-merged on 13 July 2026.
- Production merge commit: `fa49bf31077c7b258a580ce6fac260f55b68de62`.
- The corresponding Vercel production deployment reached READY.
- Production domains were assigned without alias errors.
- `https://www.botaniquedesigners.com` returned HTTP 200.
- The deployed production JavaScript contains the Vercel Analytics integration.
- `https://www.botaniquedesigners.com/_vercel/insights/script.js` returned HTTP
  200.
- Pageviews only are active; no custom `track()` events exist; no protected
  systems were changed.

### Data-accumulation note

Pageview data may take time to appear and should be allowed to accumulate before
any conversion recommendations are made. Real pageview data should accumulate
for an initial **7–14 day baseline** before conversion recommendations. No
conversion improvement, lead volume, or business result is claimed — none can
be, because a baseline has not yet accumulated.

### Phase B gate — BLOCKED

Phase B (custom `track()` events) remains **BLOCKED** until BOTH conditions are
met:

1. The owner confirms this specific Vercel project
   (`botanique-designers-site-gpm1`, `prj_AgYJrkgpGuLeykbASImM3QT5Xhed`) is on
   Pro or Enterprise and is therefore eligible for custom events.
2. ChatGPT prepares and reviews a focused implementation brief before any
   `track()` call is introduced.

Additional binding constraints:

- Phase B must use only the privacy-safe taxonomy already defined in §5.
- The prohibited-data list in §5 remains binding.
- No new PR for custom events should be opened merely because Phase A is live.
