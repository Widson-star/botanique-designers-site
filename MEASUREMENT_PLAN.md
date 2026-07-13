# Measurement Plan — BD-MEASUREMENT-01

**Workstream:** BD-MEASUREMENT-01 — Enquiry Measurement
**Status:** Phase A implemented — Vercel Web Analytics pageviews only. Custom
events are Phase B, deferred pending owner confirmation of Vercel plan
eligibility (see §4).
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
improvement is claimed by this document; none exists yet, because no data has
been collected. Once real pageview (and, later, event) data accumulates, any
targets should be set from that baseline — not invented in advance.

## 7. Dashboard action required (owner / Vercel account, not this repository)

Vercel Web Analytics must be **enabled for this project in the Vercel
dashboard** (Project → Analytics tab) for pageview data to actually appear.
This is an account-level setting outside this repository's control — this PR
adds the code-side integration only. Until it is enabled, the injected script
fails to load with a console message only (handled by the `@vercel/analytics`
package's own `onerror` handler) — no error is thrown, and the site otherwise
behaves exactly as before.

Custom events (Phase B) additionally require confirming the project is on a
Vercel **Pro or Enterprise** plan before any `track()` call is added — see §5.
