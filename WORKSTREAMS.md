# Botanique Designers Workstreams

> Placed at the repo root alongside the other maintained Markdown authority files
> (`README.md`, `GARDENCARE_PRODUCT_DEFINITION.md`, `MEASUREMENT_PLAN.md`). The
> repository has no root `docs/` directory: the former `docs/` was a stale GitHub
> Pages build artifact and was deleted (see BD-REPOSITORY-HYGIENE-01 below).

## BD-WS-01 — Phase 1 Stabilization

Status: Completed

Scope:

* backend/contact fallback
* chatbot fallback
* M-Pesa sandbox honesty
* duplicate project cleanup
* species-count cleanup
* README and env example cleanup

## BD-WS-02 — Brand Boundary Correction

Status: Completed

Scope:

* Apicora restricted to About founder context only
* Ask Botanique restored as chatbot name
* remove public Ask Botanique → Apicora narrative
* remove species-count/platform claims

## BD-WS-03 — Homepage Credibility + Conversion

Status: Completed

Scope:

* rewrite generic hero
* add trust bar
* make project CTAs touch-accessible
* sync homepage services with services data
* add “How we work” process strip
* review testimonials

Notes:

* Hero rewritten: "Transforming Outdoor Spaces" → "Landscape design and
  implementation rooted in plant science"; removed "Kenya's Premier" claim;
  primary CTA now "Request a Site Visit".
* Added a light trust bar (AIPH 2024 Youth Jury · The Standard · KHS member ·
  5.0 on Google · project types) using only signals already supported in repo.
* Homepage services preview now mirrors the four real categories in
  `src/data/services.js`; EIA Studies no longer headlined on the homepage.
* Project cards: hover-only overlay now always visible on mobile
  (`opacity-100 md:opacity-0 md:group-hover:opacity-100`).
* Added a four-step "How we work" process strip with site-visit pricing pulled
  from existing repo content (KSh 3,500 + KSh 60/km).
* Testimonials framing softened ("Client Reviews / What Our Clients Say" →
  "Client Feedback / What Clients Value"). Per Widson, the client names are real
  (the repeated "N." surname initials are coincidental — not fake or AI). The
  softer "Client Feedback" label is kept only because the exact quote wording is
  not yet confirmed as verbatim; once verbatim text is confirmed it can revert to
  "Client Reviews."

## BD-WS-04 — Services Architecture

Status: Completed

Scope:

* rationalize 12 services
* add commercial/institutional landscaping if needed
* add ecological/native planting design if needed
* decide what happens to EIA Studies
* reduce duplicated service routes

Notes:

* Final categories (5): Design & Planning (landscape-design,
  landscape-architecture, ecological-planting-design [NEW]); Plant Science &
  Advisory (plant-taxonomy, plant-health-care, soil-analysis,
  potted-indoor-plants); Implementation & Construction (garden-implementation,
  irrigation-systems, garden-lighting, property-fencing); Ongoing Care
  (garden-maintenance, lawn-care); Commercial, Institutional & Hospitality
  (commercial-landscaping [NEW]).
* Added services: "Ecological & Native Planting Design" and "Commercial,
  Institutional & Hospitality Landscaping" (both supported by existing FAQ/
  homepage/project copy; no invented clients).
* EIA Studies: decision (A) — kept as a SECONDARY service on its own legacy
  route `/services/eia-studies`; not headlined, not in the main category grid.
  **[HISTORICAL — SUPERSEDED by BD-TRUTH-CONSISTENCY-01.]** This decision to
  retain EIA Studies is no longer in effect. EIA/NEMA is not a current public
  service: the EIA page was deleted and `/services/eia-studies` now redirects to
  `/services`. See the BD-TRUTH-CONSISTENCY-01 section below.
* Legacy routes: `/services/implementation` and `/services/maintenance` now
  redirect (301-style client redirect via <Navigate replace>) to
  `/services/garden-implementation` and `/services/garden-maintenance`. Their
  duplicate page files were removed, plus the orphaned LandscapeArchitecture.jsx.
* Synced: Header dropdown, Footer, Services page category icons, vite.config
  dynamicRoutes, prerender ROUTES, and public/sitemap.xml.
* Overclaim fixes: "no competition in the region" and "botanical databases"
  wording removed from services.js.

## BD-WS-05 — Portfolio / Case Studies

Status: Completed

Scope:

* convert strongest projects into case studies
* add project detail pages
* group before/after content
* verify Zaara Park, Diani, Karen, Muthithi, Tsavo, KSMS assets

Notes:

* New data file `src/data/case-studies.js` (6 entries, each with status +
  evidenceLevel + notesForWidson; no invented facts).
* New page `src/pages/ProjectDetail.jsx` at route `/projects/:slug`.
* Case studies: karen-residence (strong), muthithi-gardens-estate (strong, real
  before/after from existing captions), ksms-campus (moderate), zaara-park
  (moderate — DESIGN/render, not built), serenity-homes-diani (moderate, single
  image), tsavo-skywalk (moderate, single image).
* Projects page now has a "Featured Case Studies" strip above the full gallery;
  gallery + lightbox + filters unchanged.
* ServicePage shows a "Selected Projects" section auto-matched by
  relatedServices (covers commercial, ecological, landscape-design,
  implementation, maintenance, landscape-architecture).
* Only one before/after pair used — Muthithi entrance flower bed — because the
  existing captions explicitly say (Before)/(After). No before/after invented.
* Zaara Park and Serenity Diani confirmed by Widson as DESIGN-ONLY engagements
  (not built by the practice) — status "Design Concept".
* Routes added to App.jsx, vite.config dynamicRoutes, prerender ROUTES, sitemap.

Widson confirmations applied:
* Karen — same residence (confirmed).
* Zaara Park — design only (confirmed).
* Serenity Homes Diani — design only (confirmed).
* KSMS — may be named in full (Kenya School of Monetary Studies); general
  captions added to ksms-2/3.
* Tsavo Skywalk — confirmed scope is design + implementation + 6 months of
  maintenance, so status upgraded to "Built / Implemented".
* More project images to be supplied later (after the workstreams complete).

## BD-WS-06 — SEO + Local Area Cleanup

Status: Completed

Scope:

* metadata cleanup
* service schema
* article schema
* image alt text
* area page quality
* sitemap/robots review

Notes:

* Zaara Park public budget references removed from projects.js and
  case-studies.js; design-only framing preserved.
* Metadata: clearer titles for Home, Projects, ServicePage ("[Service] in Kenya"),
  ProjectDetail ("[Project] — Case Study"); removed dead <meta keywords>; fixed
  favicon MIME (image/jpeg → image/png) in index.html.
* Structured data (JSON-LD via Helmet): Service + BreadcrumbList on service
  pages; CreativeWork + BreadcrumbList + OG tags on case studies; Article +
  BreadcrumbList on blog posts; BreadcrumbList on area pages. Existing
  LocalBusiness + FAQPage in index.html left intact (no duplication/conflict).
* Area pages: fixed inaccurate "free site consultations / Request a Free Quote"
  CTA (site visits are charged) → "site visits and quotes / Request a Site
  Visit"; added internal links to core service pages + /projects on every area
  page; softened Karen "numerous residences" overstatement.
* Alt text: Home hero made descriptive.
* Sitemap/prerender/robots verified in sync (case studies + new services present;
  legacy implementation/maintenance redirect, not listed).
* Weak-language sweep clean (no premier/no-competition/world-class/AI-powered in
  Botanique copy; "best" only in the software-review blog + FAQ).

Remaining SEO risks: dual sitemap mechanism (public/sitemap.xml vs
vite-plugin-sitemap) still both present — kept in sync, consolidate later.
(Area-page EIA emphasis is no longer future work: EIA/NEMA claims were removed
from all area pages under BD-TRUTH-CONSISTENCY-01.)

## BD-WS-06B — WhatsApp Lead Template Improvement

Status: Completed

Scope:

* improved quotation WhatsApp template
* improved service/project CTA templates
* improved contact-form WhatsApp fallback
* better lead qualification fields

Notes:

* New shared helper `src/utils/whatsapp.js` centralises the number and builds
  four structured templates (quote, service, project, contact fallback). Fields
  the UI collects are filled; uncollected fields become editable placeholders
  (e.g. "[please describe]") so the client qualifies the lead before sending.
* Added qualification fields: Project Type, Site Status, Site Condition,
  Timeline, "What I need help with", and "I can share photos/videos of the site".
* Wired into: QuoteWizard, ServicePage, ProjectDetail, Projects (page + lightbox
  "I want this"), Home (hero + contact-form fallback), Services, About.
* Payment-confirmation messages (PaidConsultancyModal / PaymentConfirmationModal)
  and the Ask Botanique in-chat booking flow left unchanged.
* Tone professionalised: "Please advise on the next step." / "I would like to
  request a site visit / quotation." (dropped bare "Kindly assist").

## BD-WS-07 — Premium Visual Polish

Status: Completed

Scope:

* typography upgrade
* icon replacement
* image ratios
* premium studio feel
* spacing/card refinement

Notes:

* Typography: added Fraunces (display serif) for h1/h2/h3 via index.html font
  link + tailwind `font-display` + an index.css base layer; body stays Quicksand.
  Verified in browser (hero + "Our Services" render in Fraunces; body Quicksand).
* Icons: replaced emoji service icons on the homepage with consistent line SVGs
  in tinted badges (reusing the service-category icon language); replaced the
  contact 📍📧📞 with line SVGs; replaced AreaPage emoji service icons with a
  consistent check-in-badge (covers all 9 area pages in one edit); dropped
  decorative 💬/📄 from the Instant Quote button and Quote Wizard label.
* Left intentionally: the "🌿 Ask Botanique" chatbot button, WhatsApp message
  emoji (BD-WS-06B copy), payment-modal emoji, and the About country flags.
  Area files still carry now-unused `icon:` emoji in data (not rendered) — minor
  cleanup for later. **Superseded:** the unused area `icon:` data was removed under
  BD-CODE-HYGIENE-01 below (no visitor-visible change).
* Cards: homepage service cards + area service cards gained a subtle border and
  restrained hover (shadow + slight lift); other card styles already consistent.
* Image ratios: homepage project cards moved from fixed h-72 to aspect-[4/3]
  (matches the Projects gallery) + lazy loading.
* Fixed stale `.claude/launch.json` (pointed at another machine's path) so local
  preview works.
* App.css confirmed dead (not imported) — left as-is.

Visual risks for Widson: Fraunces is a strong editorial serif — review on real
devices; the About "Where We Work" country-flag emoji were kept (informative,
not childish) but can be swapped for text/SVG if preferred.

## BD-WS-08 — Backend / Payment / Deployment Finalization

Status: Completed

Scope:

* decide backend hosting
* decide whether contact form remains backend-based or WhatsApp-first
* keep Daraja disabled unless production credentials exist
* consider manual payment flow or future payment provider only if needed

Notes:

* Backend decision: NO required backend. Site ships as a static Vercel frontend;
  the Express server (server/index.js) is OPTIONAL via VITE_BACKEND_URL. Did NOT
  port to serverless (not needed). Verified: with no backend, contact form,
  quote wizard, CTAs, WhatsApp templates, and manual payment all work.
* Contact form: WhatsApp-first by default. If backend configured but email not
  set up, the server now returns 503 (was a false "ok") so the frontend shows the
  WhatsApp/call/email fallback instead of pretending the message sent.
* Ask Botanique: name unchanged; degrades gracefully to a WhatsApp/contact prompt
  when no backend; uses Groq via server only when VITE_BACKEND_URL is set. No
  Apicora/platform language, no localhost-in-prod, no exposed keys.
* Payment/Daraja: STK stays disabled (VITE_MPESA_STK_ENABLED=false default);
  sandbox endpoints still clearly marked; manual Till/Bank + WhatsApp confirm is
  the clean default. No Pesapal, no fake success.
* Server hardening: HTML-escaped contact-email fields (was injectable);
  dependency-free in-memory rate limiting on /api/chat (20/min), /api/contact
  (5/min), /api/stkpush (10/min); CORS now allow-lists www + apex + localhost
  (CORS_ORIGINS override); M-Pesa callback masks payer phone in logs; 32kb JSON
  body limit. Keys remain server-side only.
* Cleanup: removed unused @google/generative-ai dep; deleted dead src/App.css;
  removed dead `countries` array (About) + unused `setPrefilledService` (App.jsx);
  gitignored machine-specific .claude/launch.json (+ settings.local.json).
* Deployment: build `npm run build` → dist; Vercel auto-detects Vite; prerendered
  routes served as static files (no conflict with SPA rewrite); no /api on Vercel.
* docs/ confirmed NOT deployed by Vercel (serves dist/) — flagged safe to delete.
  Subsequently deleted; see BD-REPOSITORY-HYGIENE-01 below. Dual sitemap (public/ +
  vite-plugin) — superseded: the duplication was removed under
  BD-ROUTE-AUTHORITY-01, which consolidated route and sitemap authority into a
  single source (`scripts/public-routes.mjs`).

Remaining risks: in-memory rate limiter is per-instance (fine for single-instance
Express). **Superseded:** the "area files still carry unused `icon:` emoji data
(harmless, not rendered)" note is resolved — that dead data was removed under
BD-CODE-HYGIENE-01 below (no visitor-visible change).

## BD-TRUTH-CONSISTENCY-01 — Public Claims and Credentials

Status: Implementation complete — PR #5

Record:

- EIA/NEMA service claims removed from public discovery and enquiry surfaces.
- The former EIA page was deleted.
- `/services/eia-studies` now redirects to `/services`.
- EIA was removed from the sitemap and prerender list.
- Founder name corrected to Widson Omutelema Ambaisi.
- Founder education corrected to:
  - BA Geography & Environmental Studies, University of Nairobi
  - Associate Degree in Horticulture, Egerton University
- Public email corrected to hello@botaniquedesigners.com.
- Area-page warranties, availability guarantees and unsupported compliance claims were removed.
- Positioning standardised as Kenya-based, serving Kenya, with selected regional design briefs.
- Zaara Park remains a design concept only.
- Admin, Supabase, finance, payments, projects and WhatsApp lead systems were untouched.

Notes:

- This workstream supersedes the earlier BD-WS-04 decision to retain EIA Studies
  as a secondary service (see the marked note under BD-WS-04 above).
- Email structure intended by the owner:
  - hello@botaniquedesigners.com — public company enquiries (now shown on the site)
  - widson@botaniquedesigners.com — direct founder/owner correspondence
  - martine@botaniquedesigners.com — operational correspondence
- The public contact email is a display/enquiry address only; the backend
  mail-delivery destination (`to:` in server/index.js) and `EMAIL_USER`
  environment configuration were intentionally left unchanged.
- Mailbox activation: hello@botaniquedesigners.com is active and externally
  verified (12 July 2026). A test email sent from an external Gmail account
  arrived successfully in the Botanique Designers inbox, confirming the alias and
  mail routing.

## BD-CONVERSION-01 — Project Enquiry Journey

Status: Implementation complete — PR #6

Scope:

* correct misleading "Instant Quote" wording
* repair the consultation location/distance sequencing defect
* make wizard-opening CTAs consistent
* improve modal mobile fit and accessibility
* leave verified facts and protected systems unchanged

Truthful conversion language:

* The journey does not calculate a monetary price — it collects project details
  and prepares a WhatsApp enquiry. Public "Instant Quote" / "Get a Quote" /
  "custom quote" wording was replaced with project-enquiry language:
  * Wizard heading: "Instant Quote – Step X/6" → "Tell Us About Your Project"
    with a "Step X of 6 · we'll prepare a WhatsApp enquiry — no automatic price
    is calculated" subline.
  * Completion CTA: "Send to WhatsApp" → "Send Enquiry on WhatsApp".
  * Header (desktop + mobile): "Get a Quote" → "Project Enquiry".
  * Homepage hero + "How we work" buttons: "Request a Site Visit" → "Start Your
    Project Enquiry".
  * Homepage enquiry section: heading "Get an Instant Quote" → "Start Your
    Project Enquiry"; button "Start Instant Quote" → "Start Your Project
    Enquiry"; section id `instant-quote` → `project-enquiry` (no internal
    references); the response line now reads "usually within one business day".
  * Projects page: "Get a custom quote in under 2 minutes" → "Tell us about your
    project in under 2 minutes"; button "Get an Instant Quote" → "Start Your
    Project Enquiry".
  * Service detail page: "Request a Quote" → "Start Your Project Enquiry".
  * Project/case-study detail page: "Request a Site Visit" → "Start Your Project
    Enquiry".
  * Area pages: heading "Get a Quote for Your … Property" → "Start a Project
    Enquiry for Your … Property"; button "Request a Site Visit" → "Start Your
    Project Enquiry".
  * Ask Botanique backend system prompt: "Instant Quote tool" → "Project Enquiry
    tool" (public assistant content only).
* Kept WhatsApp as the immediate alternative on every surface. Left genuine
  quotation prose in the WhatsApp message body ("site visit / quotation") and the
  homepage project-card CTA "Request Similar Design" untouched (honest, specific).

Consultation/location sequencing repair:

* Defect: selecting "Consultation & Site Assessment" at step 2 triggered a
  distance lookup using `form.location` before the location was collected at
  step 3 (always empty → always fell to the manual fallback).
* Fix: the distance is now calculated at step 3, only after a valid location is
  entered. On "Next" from step 3 for a consultation, the wizard calculates the
  distance and opens the existing PaidConsultancyModal. If the lookup fails or
  returns nothing, the modal opens with 0 km so the visitor can enter distance
  manually (fallback preserved). A `submitting` guard prevents duplicate modal
  transitions and blank-location calculations. PaidConsultancyModal now syncs its
  distance field when it (re)opens so the calculated km actually displays; fee
  calculation and payment rules are unchanged.
* Async safety: the distance lookup is guarded by an `activeRef`. If the visitor
  closes the wizard (✕ / Escape / backdrop) while the lookup is in flight, the
  component unmounts (parent remount `key`) and the cleanup flips `activeRef` to
  false, so a late-resolving `getDistanceKm` no longer reopens
  PaidConsultancyModal for a request that no longer belongs to an open wizard.
  The successful path and manual fallback are unaffected.

Wizard usability / accessibility:

* Modal now has `role="dialog"`, `aria-modal`, and `aria-labelledby`; the close
  button has an accessible name; Escape closes; backdrop click closes while
  clicks inside the dialog do not (stopPropagation); every field has an
  associated `<label htmlFor>`; focus moves into the dialog on open.
* Modal fits and scrolls on small screens (`max-h-[90vh] overflow-y-auto`, outer
  padding).
* The red "please complete this step" warning now appears only after the visitor
  attempts to continue, not pre-emptively.
* Service prefill uses an authoritative category/slug mapping (in
  `src/data/services.js`: `wizardServiceForSlug` / `wizardServiceForSlugs`), not
  loose text matching. Service detail pages resolve their slug/category to the
  matching broad wizard option (e.g. landscape-design/architecture/ecological →
  "Landscape Design & Architecture"; irrigation-systems → "Irrigation System
  Design & Installation"; garden-maintenance/lawn-care → "Garden Maintenance &
  Aftercare"; plant-science services → "Horticultural Services"; implementation →
  "Landscape Implementation & Construction"; commercial → "Public / Commercial
  Landscaping"). Case-study/project pages derive the option from the study's
  authoritative `relatedServices` slugs; homepage project cards open the wizard
  with no service preselected. A project title is never passed as a service, and
  no new services are invented.
* The wizard resets on each open via a parent remount `key`, so a completed
  handoff starts fresh next time while moving back/forward between steps does not
  lose entered values.

Protected systems left unchanged:

* Founder identity/credentials, hello@botaniquedesigners.com, EIA/NEMA removal,
  Supabase/auth/RLS/migrations, /admin and src/admin/**, finance visibility,
  project tracker, payment-confirmation logic, WhatsApp destination number,
  consultation fees and payment calculations, published project facts, geographic
  positioning, and GardenCare product work were all left untouched. No new
  testimonials, ratings, guarantees, response promises, prices or business claims
  were introduced.

## BD-GARDENCARE-01 — GardenCare Maintenance Programme

Status: Phase A is complete and owner-approved (12 July 2026). Phase B (public
website implementation and consistency correction) implementation and
validation are complete — see the Phase B subsection below. The owner approved
publication by instructing ChatGPT to merge PR #9, which was merged to `main`
on 13 July 2026; production deployment completed successfully. **GardenCare is
publicly launched** at <https://www.botaniquedesigners.com/gardencare>. A
post-launch verification record is included below.

Phase A is **documentation only**. It defines GardenCare as an operationally
realistic Botanique Designers maintenance programme, now including the commercial
and operational policies approved by Widson Omutelema Ambaisi on 12 July 2026,
before any public implementation. Full definition in
`GARDENCARE_PRODUCT_DEFINITION.md`.

Key points recorded:

* GardenCare is a **programme offered by Botanique Designers** — not a separate
  company, legal entity or unrelated brand.
* **Phase A changed no public website functionality.** No public pages, packages,
  buttons, pricing tables or website copy were added or edited in Phase A — only
  `GARDENCARE_PRODUCT_DEFINITION.md` (new) and this `WORKSTREAMS.md` note. (Phase
  B, below, is where public implementation happens; publication is still pending
  owner approval and production deployment, so GardenCare is not yet live.)
* **Pricing remains custom** — priced after garden and location assessment. No
  generic public prices; no invented package prices, discounts, visit durations,
  labour hours or crew sizes. The existing site-visit fee and payment calculations
  are unchanged.
* **Coverage:** Nairobi Metropolitan Area — "Nairobi City and selected accessible
  locations in Kiambu, Kajiado and Machakos counties, subject to site assessment
  and route availability." Not nationwide; not blanket three-county coverage. The
  separate Kenya-wide landscape-design positioning is unchanged.
* **Final approved programme names** (no longer working names): GardenCare Regular
  (weekly/fortnightly), GardenCare Monthly (one comprehensive monthly visit),
  GardenCare Seasonal (quarterly assessment/corrective — not a substitute for
  routine lawn maintenance).
* Reporting: a short WhatsApp visit summary after each visit — the assigned team
  lead prepares it and the Operations Manager oversees delivery; no portal/
  dashboard/automated log promised. The admin tracker, Supabase and operations
  systems were **not** modified.

Approved commercial/operational policies (owner-approved 12 July 2026):

* **Duration:** Regular and Monthly have a three-month initial minimum term, then
  rolling monthly; Seasonal is quarterly and paid per scheduled visit (no
  three-month/rolling term).
* **Renewal/cancellation:** rolling monthly after the initial term, ended by 30
  days' written notice; **no "cancel anytime"**; initial-term termination subject
  to the signed agreement.
* **Assessment fee:** credited toward the first GardenCare invoice when the
  agreement is accepted within 14 calendar days of the assessment; no new
  assessment price; existing site-visit fee calculation unchanged.
* **Payment cycle:** Regular/Monthly monthly in advance; Seasonal before each
  visit; no work for an unpaid period unless agreed in writing.
* **VAT:** "applied only where legally applicable and shown clearly on the relevant
  proposal or invoice"; registration status not stated unless owner-confirmed.
* **Weather:** visit moved to the next practical available date; visit not lost; no
  fixed replacement date regardless of conditions/route.
* **Access:** confirmed property access at the scheduled time; reasonable water
  access where required; special access arrangements agreed before service.
* **Client-caused missed visits:** a visit prevented by the client without ≥24
  hours' notice counts as scheduled; replacement may be separately charged and
  subject to route availability; not applicable when Botanique caused the miss.
* **Waste removal:** ordinary waste consolidated onsite; offsite/substantial
  removal separately quoted; **not unlimited**.
* **Materials/consumables:** written pre-purchase approval required; charged
  separately unless the signed proposal includes them; no invented markup/fee.
* **Emergency/unscheduled work:** outside the standard agreement; subject to
  availability, assessment and separate quotation; no emergency-response-time
  promise.
* Existing public maintenance copy that will need review at public implementation
  is catalogued in the product definition (`index.html` FAQ JSON-LD, `faqs.js`,
  `services.js`, `server/index.js` prompt, and the area-page maintenance cards).
  Those public files were **not** changed in Phase A.

* **Commercial segmentation (approved 12 July 2026):** the three GardenCare
  programmes serve residential and smaller commercial/institutional/hospitality
  sites where the assessed work fits them; larger or operationally complex grounds
  (extensive estate common areas, campuses, large hotels, hospitals, major
  institutional properties) are handled through a **bespoke Botanique Designers
  commercial maintenance agreement**, not the three standard programmes. Such
  clients are not rejected — they remain Botanique clients on a separately scoped
  agreement. No fourth GardenCare package or "GardenCare Bespoke" public name;
  suitability is set by assessment; no size/acreage/staffing/price/complexity
  thresholds are published.

**Phase A is fully complete.** All fourteen approved policies (the original thirteen
commercial/operational decisions plus the commercial-grounds segmentation) are
recorded and approved. **No GardenCare commercial or operational decision remains
outstanding.**

### Phase B — Public Website Implementation and Consistency Correction

Status: **Implementation and validation are complete. The owner approved
publication by instructing ChatGPT to merge PR #9; it was merged to `main` on
13 July 2026 and production deployment completed successfully. GardenCare is
publicly launched** at <https://www.botaniquedesigners.com/gardencare>.

Scope delivered:

* **New public page `/gardencare`** (`src/pages/GardenCare.jsx`): hero with the
  approved coverage wording; the three final approved programme names only (no
  fourth package, no "GardenCare Bespoke"); a non-exhaustive routine-activity
  menu; a separately-quoted scope-boundaries list; a seven-step "How It Works"
  sequence (no new assessment price); a plain-language terms summary matching
  every approved commercial policy; the approved commercial segmentation; and
  an 11-question FAQ whose visible content and FAQPage structured data are
  generated from one shared array.
* **Enquiry integration:** both GardenCare CTAs call
  `openQuoteWizard("Garden Maintenance & Aftercare")` — the existing six-step
  wizard, unmodified, with that service preselected. The consultation-distance
  shortcut is untouched and only triggers on an explicit "Consultation & Site
  Assessment" selection. A new `buildGardenCareMessage` WhatsApp helper
  (`src/utils/whatsapp.js`) identifies GardenCare interest and includes the
  visitor's selected programme when they choose one via the on-page programme
  cards; the helper also accepts optional `location`/`siteContext` values for
  future callers, but the current page does not collect or pass those two
  fields. Uses the existing WhatsApp number.
* **Public entry points:** Header "Ongoing Care" dropdown, Footer link,
  Services-page callout, a restrained homepage callout, a Garden Maintenance
  service-page callout, and an opt-in `gardenCareArea` link on the five
  Nairobi-Metro-coverage area pages (Karen, Runda, Kiambu, Westlands, Nairobi).
  No independent GardenCare logo, identity, email or footer was created.
* **Consistency correction:** reconciled `index.html` FAQPage JSON-LD,
  `src/data/faqs.js`, `src/data/services.js` (garden-maintenance, lawn-care,
  potted-indoor-plants, commercial-landscaping), the `server/index.js` Ask
  Botanique prompt, and the maintenance cards on Karen/Runda/Kiambu/Westlands/
  Nairobi (in-coverage) and Mombasa/Nakuru (out-of-coverage, no longer implying
  standing recurring GardenCare crews). Removed "everything a garden needs",
  "consistent team who knows your garden", "we keep a log of each visit",
  "replace as needed", and fixed monthly/quarterly package-content framing;
  replaced with GardenCare programme names, an "agreed after assessment"
  framing, and the short WhatsApp visit-summary reporting model. Full
  claim-by-claim record in `GARDENCARE_PRODUCT_DEFINITION.md` §24.
* **SEO/routing:** `/gardencare` added to React routes, the prerender route
  list, `vite-plugin-sitemap` `dynamicRoutes`, and `public/sitemap.xml`, with
  accurate title/description/canonical/OG tags, `Service` and `BreadcrumbList`
  structured data, and `FAQPage` structured data matching the visible FAQ. No
  ratings, reviews, prices, availability or `Offer` schema were added.
* **Protected systems unchanged:** `/admin` and `src/admin/**`, Supabase/auth/
  RLS/migrations, project tracker, finance visibility, payment-confirmation
  logic, the existing consultation fee calculation, M-Pesa/Daraja config,
  founder identity/credentials, `hello@botaniquedesigners.com`, the EIA/NEMA
  corrections, published project facts, the approved GardenCare commercial
  policies themselves, the WhatsApp destination number, the approved coverage
  wording, Kisumu/Eldoret area-page content (no GardenCare-style claim existed
  there), and Vercel deployment configuration were all left untouched.

**GardenCare is publicly launched.** A concise post-launch verification record
follows.

### Post-launch verification (13 July 2026)

Functional and content verification of the live implementation was run against
a fresh build of the exact merged commit (direct browser access to the live
production domain from the verification environment was blocked by that
environment's own network egress policy — a sandbox restriction, not a
production issue). Verified: the page loads with no JS runtime errors; Header,
Footer, homepage, Services page and the Garden Maintenance page all link to
`/gardencare`; all three programme cards render and selection updates state;
the WhatsApp CTA opens the existing number with GardenCare interest and the
selected programme; both enquiry buttons open the existing six-step wizard
with `Garden Maintenance & Aftercare` preselected, without triggering the
consultation shortcut; FAQ accordions open and close; no horizontal overflow
or broken site-asset images; canonical/structured-data/sitemap entries are
present; Mombasa/Nakuru/Kisumu/Eldoret advertise no standard GardenCare
availability; Kiambu states "selected accessible locations in Kiambu, subject
to site assessment and route availability." No defects were found; no public
website code was changed as part of this verification. Full record in
`GARDENCARE_PRODUCT_DEFINITION.md` §25.

## BD-MEASUREMENT-01 — Enquiry Measurement

Status: Phase A complete, merged, deployed and production-verified (13 July
2026; production commit `fa49bf31077c7b258a580ce6fac260f55b68de62`). The Vercel
Web Analytics pageview foundation is live; pageviews only are active and no
custom `track()` events exist. Custom events are Phase B and remain **BLOCKED**:
owner dashboard evidence dated 13 July 2026 confirms the team/project is on the
Vercel **Hobby** plan, on which custom events are unavailable. Phase B stays
blocked unless the owner deliberately upgrades this specific team/project to Pro
or Enterprise and a reviewed implementation brief exists; no upgrade is
recommended or authorized. Full measurement definition, the release closeout, the
plan confirmation and the early snapshot are in `MEASUREMENT_PLAN.md` (§7–§9).

Audit findings (before implementation):

* No analytics, tracking, cookie or consent code existed anywhere in the repo
  (`src/`, `index.html`, `server/`, `package.json`, `vercel.json`) — confirmed
  by repository-wide search. No `@vercel/analytics` or any other analytics
  provider was previously installed.
* No linked Vercel project config or plan/team environment variables exist in
  this repository, so Vercel plan tier (Free vs Pro/Enterprise) could not be
  conclusively verified from available evidence.

Phase A scope:

* Installed `@vercel/analytics` (^2.0.1) and added `<Analytics />` from
  `@vercel/analytics/react` once, in the client-only default export of
  `src/App.jsx` (the bundle rendered by `src/main.jsx`) — not in the
  `AppRoutes` named export used by `src/entry-server.jsx` for SSR/prerender.
  This keeps the integration entirely out of the prerender path by
  construction, in addition to the package's own browser-only guards.
* Pageviews are recorded automatically on load and on every React Router
  navigation via the library's built-in History API detection — no manual
  route wiring was added.
* No custom `track()` calls were added. No cookie banner or consent flow was
  added — pageview-only analytics with no custom events and no PII collection
  does not set tracking cookies, so none was needed; this is recorded as
  current factual behaviour, to be re-checked if instrumentation changes.
* No other analytics/tracking provider (Google Analytics, Meta Pixel, Hotjar,
  session recording, advertising cookies) was added.

Privacy boundaries: no visitor PII (name, email, phone, address, free-text
project details, WhatsApp message contents, payment/M-Pesa details,
consultation distance) is collected. No persistent visitor identifier is
generated. Full prohibited-data list and the proposed Phase B custom-event
taxonomy (with privacy-safe properties only) are in `MEASUREMENT_PLAN.md`.

Dashboard enablement (completed 13 July 2026): the owner confirmed Vercel Web
Analytics is enabled for this project — Team `botanique-designers-projects`,
Project `botanique-designers-site-gpm1`, Project ID
`prj_AgYJrkgpGuLeykbASImM3QT5Xhed`. This supersedes the earlier note that
dashboard enablement was still required. With both the code-side integration and
the dashboard setting in place, pageviews are now being collected.

Production release closeout (13 July 2026): PR #11 was marked ready and
squash-merged on 13 July 2026; the production merge commit is
`fa49bf31077c7b258a580ce6fac260f55b68de62`; the Vercel production deployment
reached READY; production domains were assigned without alias errors;
`https://www.botaniquedesigners.com` returned HTTP 200; the deployed production
JavaScript contains the Vercel Analytics integration; and
`https://www.botaniquedesigners.com/_vercel/insights/script.js` returned HTTP
200. Pageviews only are active; no custom `track()` events exist; no protected
systems were changed.

Data accumulation: pageview data may take time to appear and should be allowed
to accumulate for an initial 7–14 day baseline before any conversion
recommendations are made. No business result, conversion improvement, lead
volume or target is claimed — a baseline has not yet accumulated.

Plan confirmation and early snapshot (13 July 2026): owner-supplied Vercel
dashboard evidence confirms the team/project
(`botanique-designers-projects` / `botanique-designers-site-gpm1`) is currently on
the Vercel **Hobby** plan, and the Vercel Events panel states custom events
require upgrading to a **Pro** team. Phase B custom `track()` events are therefore
unavailable on the current plan. An early dashboard snapshot (filter: **All
environments**, **Last 7 Days**) showed 46 visitors, 58 page views, 83% bounce,
89% mobile, 89% Kenya, 41 homepage visitors, 3 `/gardencare` visitors and no
custom events. This is recorded only as an **initial, non-decision-grade
observation**: it is very early, may include preview/non-production traffic
(because "All environments" was selected), and must **not** be treated as a
completed 7–14-day baseline. No conversion performance, lead volume, confirmed
clients or business result is claimed, and no website change is recommended from
it. Referral entries are not interpreted yet (some may be automated/low-quality).
A future baseline review should filter to **Production** over a **complete date
window**. Pageview-only measurement remains the active scope. Full detail in
`MEASUREMENT_PLAN.md` §9.

Phase B gate (BLOCKED): custom `track()` events remain blocked until BOTH (1)
the owner **deliberately upgrades** this specific Vercel project from the
confirmed **Hobby** plan to Pro or Enterprise, making it eligible for custom
events, and (2) ChatGPT prepares and reviews a focused implementation brief before
any `track()` call is introduced. No upgrade is recommended or authorized by this
record. Phase B must use only the privacy-safe taxonomy already defined in
`MEASUREMENT_PLAN.md`; the existing prohibited-data list remains binding; and no
new PR for custom events should be opened merely because Phase A is live.

Protected systems confirmed unchanged: `/admin` and `src/admin/**`,
Supabase/auth/RLS/migrations, finance/project tracker, payment-confirmation
logic, M-Pesa/Daraja configuration, consultation fees and distance
calculation, founder identity/credentials, public email addresses, EIA/NEMA
corrections, project facts, GardenCare coverage/programmes/commercial
policies, the WhatsApp destination number, existing enquiry wording/behaviour,
and Vercel domains/deployment configuration.

## BD-ROUTE-AUTHORITY-01 — Public Route and Sitemap Consolidation

Status: **Complete, merged, deployed and production-verified.** PR #13 passed
independent ChatGPT review, was marked ready and squash-merged to `main`
(production commit `63ac00f8a7dedd7756f4d226e785db09e3e597be`); the matching
Vercel production deployment reached READY. Implemented from branch
`claude/bd-route-authority-01`, cut from the prior production `main`
`37aa8e7ee4ced5569c3adf12f446cbdf8f4d8f4c`. Tooling/build-config only; no React
routing, visitor-facing content, metadata, structured data, redirects, robots
behaviour, or public URL was changed. A post-launch verification record is at
the end of this section.

Problem (rationale):

* The public-route inventory was duplicated in three hand-synced places —
  `vite-plugin-sitemap`'s `dynamicRoutes` in `vite.config.js`, the `ROUTES`
  array in `scripts/prerender.mjs`, and the manually maintained
  `public/sitemap.xml`. Three copies of the same 43 routes had to be edited in
  lockstep whenever a public page was added or removed, and they could silently
  drift (the historical "dual sitemap mechanism" flagged under BD-WS-06 / BD-WS-08).

Pre-change audit (before any edit):

* All three inventories were compared programmatically and confirmed to contain
  the **identical 43 canonical public routes**, with no duplicates and no
  mismatch — so consolidation was a safe refactor, not a content change.

Single-source design:

* New `scripts/public-routes.mjs` is the **one authoritative inventory**. It is
  framework-independent (no Vite/React imports) and lists every public route
  once with its `path`, sitemap `changefreq`, and `priority`. It exports
  `PUBLIC_ROUTES`, `ROUTE_PATHS`, `HOSTNAME`
  (`https://www.botaniquedesigners.com`), and an `assertValidRoutes()` guard
  that runs at import time.
* New `scripts/generate-sitemap.mjs` generates standards-compliant
  `public/sitemap.xml` from the authority, then re-parses its own output and
  fails the build if paths are duplicated, a path does not begin with `/`, a
  non-production hostname (localhost / Vercel preview) appears, or the output
  does not contain exactly the authoritative route set.
* `scripts/prerender.mjs` now **imports** `ROUTE_PATHS` from the authority
  instead of maintaining its own `ROUTES` array, so the prerender input and the
  sitemap output are the same source and cannot diverge.
* `package.json` build is now
  `node scripts/generate-sitemap.mjs && vite build && node scripts/prerender.mjs`,
  so the sitemap is regenerated before Vite copies `public/` into `dist/`.
* `vite-plugin-sitemap` was removed from `vite.config.js` and uninstalled
  (`package.json` + `package-lock.json` updated via the package manager); it is
  no longer needed.
* `public/sitemap.xml` is kept as the committed, deployable artifact (now
  generated, marked "Do not edit by hand"); `public/robots.txt` is unchanged and
  still points at `/sitemap.xml`.

Validation results:

* Clean `npm install` and production `npm run build` both succeed.
* 43/43 routes prerender successfully.
* Generated sitemap contains exactly 43 unique canonical URLs; production
  hostname only; no localhost/Vercel host; XML parses (`xmllint --noout`).
* Every prerendered route is in the sitemap and every sitemap route is
  prerendered (bidirectional set equality with the authority).
* All 43 `(path, changefreq, priority)` tuples preserved **exactly** vs the
  previous `public/sitemap.xml` — no priority/changefreq drift.
* `/gardencare`, all six case studies, all nine area pages, and all seven blog
  posts plus `/blog` are present; no legacy redirect-only route
  (`/services/eia-studies`, `/services/implementation`, `/services/maintenance`)
  appears.
* `dist/sitemap.xml` is byte-identical to the generated `public/sitemap.xml`;
  `dist/robots.txt` is identical to `public/robots.txt` (robots behaviour
  unchanged).
* Guard verified to reject duplicate paths, non-`/` paths, invalid changefreq,
  and out-of-range priority.
* `git diff --check` clean; lint holds at the inherited baseline of 20 errors
  across the same four files (`server/index.js`, `src/components/Assistant.jsx`,
  `src/components/FadeIn.jsx`, `src/context/AppContext.jsx`) with zero new errors
  (the new `.mjs` scripts are outside eslint's `**/*.{js,jsx}` scope, matching
  the existing `scripts/prerender.mjs`).

Changed files (exactly): `scripts/public-routes.mjs` (new),
`scripts/generate-sitemap.mjs` (new), `scripts/prerender.mjs`, `vite.config.js`,
`package.json`, `package-lock.json`, and `public/sitemap.xml` (regenerated
artifact), plus this `WORKSTREAMS.md` note.

Protected systems confirmed unchanged: React application routing and
visitor-facing content, page titles/descriptions/canonicals/structured data,
`robots.txt` behaviour, every existing public URL, redirects, GardenCare
content/programmes/coverage/policies, founder facts/credentials, public email
addresses, EIA/NEMA corrections, project/case-study facts, WhatsApp destination
and enquiry behaviour, the analytics integration and measurement documents,
`/admin` and `src/admin/**`, Supabase/auth/RLS/migrations, finance/project
tracker, payment-confirmation logic, M-Pesa/Daraja configuration, and
consultation fees/distance calculations.

### Production release closeout

- PR #13 passed independent ChatGPT review.
- PR #13 was marked ready and squash-merged.
- Production commit: `63ac00f8a7dedd7756f4d226e785db09e3e597be`.
- The matching Vercel production deployment reached READY.
- Live sitemap <https://www.botaniquedesigners.com/sitemap.xml> returned HTTP
  200.
- The live sitemap contains exactly 43 URLs and all 43 are unique.
- All URLs use the correct production hostname
  (`https://www.botaniquedesigners.com`).
- `/gardencare` is present.
- No redirect-only route is present.

**BD-ROUTE-AUTHORITY-01 is complete, merged, deployed and production-verified.**

## BD-REPOSITORY-HYGIENE-01 — Stale Root `docs/` Artifact Audit

Status: Audit complete — no deletion required (already removed upstream)

Purpose: prove or disprove the long-standing note (BD-WS-08 above) that the root
`docs/` directory was a stale GitHub Pages build artifact safe to delete, before
removing anything.

Finding: there is **no root `docs/` directory** in the repository. It was already
deleted in commit `4f46f31` ("chore: remove stale GitHub Pages artifact"), which
is an ancestor of `main`. No deletion remained to perform, so this workstream made
no code or artifact changes — only this documentation record.

Audit evidence (against `main` @ `5993b9e`):

* **Was it stale build output?** Yes. The deleted tree was a Vite build artifact:
  hashed bundles (`docs/assets/index-*.js`, `index-*.css`), `docs/vite.svg`,
  `docs/index.html`, and duplicated project images — never hand-maintained source.
* **Unique maintained source there?** None. The maintained Markdown authority files
  live at the repository root (`README.md`, `WORKSTREAMS.md`,
  `GARDENCARE_PRODUCT_DEFINITION.md`, `MEASUREMENT_PLAN.md`) and in
  `src/admin/DEPLOYMENT.md` — all present and untouched. Root `docs/` held no
  authoritative business record.
* **Build/Vercel config consuming it?** No. `npm run build` =
  `generate-sitemap → vite build → prerender`; Vite outputs the default `dist/`;
  `vercel.json` only sets `cleanUrls` + SPA rewrites; README documents output
  directory `dist`. No script writes to `docs/` (prerender → `dist/`,
  sitemap/images → `public/`).
* **Workflows depending on it?** None — the repository has no `.github/` directory.
* **GitHub Pages publishing from it?** At audit time GitHub Pages was still
  *enabled* pointing at `main:/docs` (`build_type: legacy`) with its last build
  **errored** (because `docs/` no longer exists) and no custom domain
  (`cname: null`); the production site is served by Vercel from `dist/`, and no
  live Botanique Designers domain, redirect, asset, or route depended on `docs/`
  or on the errored `widson-star.github.io` Pages URL. **Superseded:** this
  obsolete GitHub Pages publication has since been disabled — see the GitHub Pages
  closeout below.
* **Current production deploys from:** `dist/` (Vercel auto-detects Vite).

Distinction (root `docs/` vs. maintained Markdown authority): the removed root
`docs/` was generated GitHub Pages *build output*, unrelated to the hand-maintained
Markdown documents that intentionally sit at the repository root. Those authority
files, and `src/admin/DEPLOYMENT.md`, remain in place and were not modified by this
workstream.

Changed files (exactly): this `WORKSTREAMS.md` note only. No application code,
build scripts, configuration, or generated artifacts were touched; no `.gitignore`
rule was added (no local process regenerates `docs/`).

### GitHub Pages closeout — obsolete publication disabled (13 July 2026)

Owner-authorized repository-settings cleanup: the obsolete GitHub Pages
publication was disabled via the authenticated GitHub API
(`DELETE /repos/Widson-star/botanique-designers-site/pages`). This is a
repository-settings cleanup only — not a website migration; production remains on
Vercel throughout.

* **Pre-change state (re-queried before mutating):** Pages **enabled**,
  `build_type: legacy`, source `main:/docs`, status **errored**, no custom domain
  (`cname: null`).
* **Safety gates (all passed before change):** `origin/main` at the authorized
  baseline `ad2879a`; no open PR affecting hosting/domains/Vercel/Pages/`docs/`;
  root `docs/` absent at `origin/main`; Vercel production deployment **READY** for
  `ad2879a`; `https://www.botaniquedesigners.com` returned HTTP 200 via Vercel and
  `https://botaniquedesigners.com` returned HTTP 308 redirecting to the www domain,
  whose final response was HTTP 200 via Vercel — the expected healthy
  canonical-domain redirect behaviour; neither domain redirected to
  `widson-star.github.io`; no repository configuration or DNS/domain doc depended
  on the Pages URL.
* **Change result:** the DELETE returned **HTTP 204 No Content** — GitHub Pages
  disabled successfully.
* **Post-change verification:** the Pages API now returns **404 Not Found**
  (Pages disabled); `https://www.botaniquedesigners.com` still returned HTTP 200
  via Vercel and `https://botaniquedesigners.com` still returned HTTP 308
  redirecting to the www domain, whose final response was HTTP 200 via Vercel — the
  expected healthy canonical-domain redirect behaviour; neither domain redirected
  to `widson-star.github.io`; Vercel production remained READY and no production
  alias changed.
* **Scope:** no domain, DNS, Vercel configuration, branch, repository visibility,
  or application setting was changed, and no replacement Pages source was enabled.
  The only repository change is this documentation record.

## BD-CODE-HYGIENE-01 — Remove Confirmed Dead Area-Page Icon Data

Status: **Complete, merged, deployed and production-verified.** PR #18 passed
review and was squash-merged to `main`; production commit
`918c61eeb12fb3295bc88a0d78914e434e545839`; the matching Vercel production
deployment reached READY. (Verified during the BD-ROADMAP-02 audit — see
`POST_STABILIZATION_AUDIT.md`.)

Baseline `origin/main` (branch was cut from): `2019c3ccaa4dc0d859d68dd374a3d0fba45b11c9`.

Scope: remove the now-unused `icon:` emoji fields left in the nine area-page
service data objects after BD-WS-07 replaced their rendering with a consistent
check-in-badge. Data cleanup only — no rendering, styling, copy, service, link,
metadata, or enquiry-flow change.

Audit evidence (proof the fields were dead before removal):

* **Fields removed:** 36 total — four `icon:` emoji per file across all nine area
  pages: `src/pages/areas/Eldoret.jsx` (🌿🌿🛠️🌱), `Karen.jsx` (🌿🛠️✂️💧),
  `Kiambu.jsx` (🌿🛠️🌿✂️), `Kisumu.jsx` (🌿🌿🛠️💧), `Mombasa.jsx` (🌿🌿🛠️✂️),
  `Nairobi.jsx` (🌿🌿🛠️✂️), `Nakuru.jsx` (🌿🌿🛠️✂️), `Runda.jsx` (🌿🛠️✂️🌿),
  `Westlands.jsx` (🏢🌿✂️🌿). Each belonged to a `services[]` entry that also
  carries the still-used `title` and `desc`.
* **Renderer:** `src/components/AreaPage.jsx` maps `services` using only `s.title`
  and `s.desc`. The service-card badge is a hardcoded static SVG checkmark
  (`d="M5 13l4 4L19 7"`); it does not read `s.icon`. No destructuring of `icon`,
  no `s.icon`/`item.icon`/`service.icon`/`feature.icon`, and no dynamic
  (`["icon"]`) access exists anywhere in the repository.
* **No other consumer:** repo-wide search found `icon` only in unrelated places —
  `src/data/services.js` (separate SVG-path `icon` for the Services page),
  `src/pages/Home.jsx` (`svc.iconPath`, a different property), `Footer.jsx`/
  `Home.jsx` social `simple-icons` images, and `index.html` favicon links. There
  are no tests, schema generators, or build scripts that consume the area `icon`
  field.

Result: no change to visible text, card ordering, links, services, page metadata,
structured data (BreadcrumbList JSON-LD), WhatsApp/enquiry behaviour, or responsive
layout. There is **no visitor-visible change** — this is dead-data removal only.

Supersedes the BD-WS-07 and BD-WS-08 remaining-risk notes about unused area
`icon:` emoji data (both updated above to point here).

Changed files (exactly): the nine `src/pages/areas/*.jsx` data files and this
`WORKSTREAMS.md`. No `AreaPage` rendering/styling, public wording, services,
GardenCare content, founder facts, EIA/NEMA text, WhatsApp destination, analytics,
`/admin`, Supabase/auth, finance, payments, build/sitemap/routes/Vercel config, or
`package.json`/`package-lock.json` was touched.

## BD-ROADMAP-02 — Post-Stabilization Evidence Audit

Status: Audit complete — documentation only. No implementation started.

Baseline / audited production `main`:
`918c61eeb12fb3295bc88a0d78914e434e545839` (13 July 2026).

A fresh evidence-based audit of the current production website, production build
and repository was run to determine what genuinely remains after the
stabilization, truth, conversion, GardenCare, measurement, route-authority and
repository-hygiene workstreams. Full record — audit method, completed-workstream
verification, findings table, blocked/evidence-gap register, accepted
limitations, the single recommended next workstream, the explicit
"not recommended now" list, and protected-system boundaries — is in
**`POST_STABILIZATION_AUDIT.md`**.

Headline results:

* **Two VERIFIED DEFECTS.** (1) Soft-404: unknown URLs return HTTP 200 with
  homepage-duplicate HTML and no `noindex`, and render only Header + Footer with
  an empty `<main>` in a real browser (`src/App.jsx` has no `path="*"`;
  `vercel.json` rewrites `"/(.*)" → "/"`; no `/404` is prerendered). (2) An
  oversized ~2.26 MB blog hero image ships uncompressed
  (`public/images/blog/landscape-software-2026.jpg`; `scripts/compress-images.mjs`
  is not wired into the build).
* **Recommended next single workstream:** a bounded **Unknown-Route / Soft-404
  Handling** workstream (proposed `BD-DISCOVERABILITY-01`) — public routing/build
  config only, no analytics dependency, no invented facts, no protected system
  touched. This is **not** a one-line change: a React catch-all plus a `/404`
  prerender does not by itself guarantee a true HTTP 404 on Vercel, so the brief
  must first settle the Vercel/static-routing design (preserving all 43
  prerendered routes, the deliberate legacy redirects, client-side navigation, a
  helpful NotFound view, `noindex` output, a genuine 404 where Vercel supports it,
  and no homepage-duplicate fallback) and must verify live HTTP status after
  deploy — a rendered NotFound message with HTTP 200 is not a fix. The 2.26 MB
  image is a **bounded, targeted single-asset** companion fix (optimize only that
  file, preserve dimensions/quality, verify blog + `og:image` references), not a
  whole-library rewrite.
* **BLOCKED / evidence gaps unchanged:** Analytics Phase B (Vercel Hobby plan);
  the 7–14-day Production-filtered baseline (pending accumulation); verbatim
  testimonial wording and additional project imagery (owner-supplied evidence).
* **Apicora boundary (precise):** in the **visitor-facing website** Apicora is
  mentioned **exactly once**, in the **About-page founder biography**, identifying
  it as a **separate environmental intelligence platform for Africa** and part of
  Widson Omutelema Ambaisi's founder background. Apicora is **not** a Botanique
  Designers service, product, platform, operating system, or substitute brand.
  Internal authority/history documents (this file and the other root Markdown
  records) mention "Apicora" only to record this boundary; those are **not** public
  brand positioning. **Botanique Designers remains a separate landscape-design and
  implementation practice.**
* **Re-verified COMPLETE:** founder identity/credentials, public email,
  EIA/NEMA removal, the Apicora boundary above, Kenya/regional positioning,
  Zaara Park design-only status, GardenCare launch, the 43-route sitemap/route
  authority, measurement Phase A, and the dead area-icon-data removal (#18).

No new implementation is marked started. Validation for the audit: production
build succeeds at 43/43 routes; lint holds at the inherited 20 errors in the same
four files (zero new); `git diff --check` clean; the only changed files are
`POST_STABILIZATION_AUDIT.md` (new) and this `WORKSTREAMS.md` entry.

## BD-DISCOVERABILITY-01 — Unknown-Route and Soft-404 Correction

Status: **COMPLETE — merged and production-verified.** PR #20 squash-merged to
`main` as `3a82665bf1f016a03251d7d790f2247fe0486a04`; matching Vercel production
deployment reached READY. F-1 resolved.

Baseline SHA: `2ddd0a7de80b3938ebd11f5e1f284f39c18a7cd1`
(`BD-ROADMAP-02: record post-stabilization evidence audit (#19)`).
Branch: `claude/bd-discoverability-01-soft-404`.

Addresses **F-1** (soft-404) from `POST_STABILIZATION_AUDIT.md` §8 — see §11 of
that document for the full resolution record.

Scope (public routing/build config + one new page component only; no protected
system touched):

* Removed the broad `vercel.json` rewrite `"/(.*)" → "/"` that converted every
  unmatched path into an HTTP 200 homepage duplicate.
* Added three explicit **permanent (308) redirects** for the legacy routes
  (`/services/eia-studies`, `/services/implementation`, `/services/maintenance`)
  so full-page loads redirect at the edge instead of relying on client
  `<Navigate>`.
* Kept the narrow `/admin` and `/admin/:path*` rewrites unchanged; `src/admin/**`
  untouched.
* Added a catch-all React route (`path="*"`) → new `src/pages/NotFound.jsx`:
  Botanique-styled, accessible heading hierarchy, keyboard-focusable recovery
  links (Home, Services, Projects, WhatsApp project enquiry), `noindex, nofollow`,
  unique title, no homepage canonical, no invented claims.
* Extended `scripts/prerender.mjs` to emit `dist/404.html` from that view —
  **outside** the route authority: not in `scripts/public-routes.mjs`, not in the
  sitemap, not a 44th canonical route. Vercel serves it with a genuine HTTP 404
  for unmatched paths.

Local validation: `npm ci` clean; `npm run build` → **43/43** routes +
`dist/404.html`; sitemap unchanged at **43** URLs (no `/404`); `dist/404.html`
carries "Page not found" + `noindex, nofollow`, no homepage-title duplication;
legacy redirect targets correct; lint holds at the inherited **20** errors (zero
new); `git diff --check` clean. In-app browser: NotFound renders with recovery
links, normal routes render, no console errors.

Changed files: `src/pages/NotFound.jsx` (new), `src/App.jsx`,
`scripts/prerender.mjs`, `vercel.json`, `POST_STABILIZATION_AUDIT.md`, this file.

Production verification (commit `3a82665`, `https://www.botaniquedesigners.com`,
re-probed after merge): `/` and representative prerendered routes → 200; the three
legacy routes → 308 to their correct canonical destinations; `/admin` and
`/admin/dashboard` → 200 (protected SPA loads); arbitrary unknown paths and an
unknown asset → genuine 404 (Not-Found body: title "Page not found",
`noindex, nofollow`, zero `rel="canonical"` — no homepage duplication). The
soft-404 defect no longer exists in production.

## BD-PERFORMANCE-01 — Targeted Oversized Blog Image Optimization

Status: **COMPLETE — merged, deployed and production-verified.** PR #21 passed
independent review and was squash-merged to `main`; production commit
`1e968354330df3b72b3ac73d12de164888087839`; the matching Vercel production
deployment reached READY. **F-2 is resolved and production-verified.**

Baseline SHA: `3a82665bf1f016a03251d7d790f2247fe0486a04`
(`BD-DISCOVERABILITY-01: fix unknown-route soft 404s (#20)`).
Branch: `claude/bd-performance-01-targeted-blog-image`.

Addresses **F-2** (oversized blog hero image) from `POST_STABILIZATION_AUDIT.md`
§8 — see §12 of that document for the full record.

Scope (exactly one asset; no other image, no broad compression, no build-script
mutation):

* Optimized only `public/images/blog/landscape-software-2026.jpg`. The file was a
  mislabeled **PNG** (1408×768 RGBA, fully-opaque alpha, 2,370,961 bytes ≈2.26 MB)
  served at a `.jpg` URL with `content-type: image/jpeg`.
* Re-encoded to a real **progressive JPEG** (mozjpeg, quality 85, 4:2:0) — the
  format the `.jpg` URL and served content-type already imply, and ideal for this
  photographic hero. Same filename, same **1408×768** dimensions, same **1.8333**
  aspect ratio, sRGB, correct orientation. Alpha dropped only because it was fully
  opaque (no visual change).
* **2,370,961 → 203,364 bytes = 91.42 % reduction** (≈198.6 KB; ≤200 KB target
  met, far under the 300 KB ceiling).
* URL and both references (`src/data/blog-posts.js:9` → blog-post hero
  `src/pages/BlogPost.jsx` + Article structured-data `image`) unchanged. The image
  is not used by the blog listing and is not the Open Graph / Twitter image
  (those use `hero-botanique.jpg`); not in the sitemap.

Visual verification: full-image and 100 % crops (tablet-text, shirt-logo)
indistinguishable from the source — no banding, block artifacts, blurred text, or
lost detail. Rendered blog-post hero verified via `vite preview` at desktop
(768×419) and mobile (375×205): correct display, aspect preserved, no
cropping/orientation change, image `complete`, natural 1408×768, no console
errors.

Local validation: exactly three files changed
(`public/images/blog/landscape-software-2026.jpg`, `POST_STABILIZATION_AUDIT.md`,
this file); `npm ci` clean; `npm run build` → **43/43** routes + `dist/404.html`;
sitemap **43** URLs; lint holds at the inherited **20** errors (zero new);
`git diff --check` clean; no protected file touched.

Production release closeout:

- PR #21 passed independent review and was squash-merged to `main`.
- Production commit: `1e968354330df3b72b3ac73d12de164888087839`.
- The matching Vercel production deployment reached READY.
- Live image URL
  `https://www.botaniquedesigners.com/images/blog/landscape-software-2026.jpg`
  returned HTTP 200, `content-type: image/jpeg`, `content-length: 203,364` bytes.
- The blog article `/blog/best-landscape-design-software-2026` returned HTTP 200.
- Same path and same 1408×768 dimensions retained.
- No other image and no build process changed.

**BD-PERFORMANCE-01 is complete, merged, deployed and production-verified. F-2 is
closed.** Full record in `POST_STABILIZATION_AUDIT.md` §12.

## BD-PORTFOLIO-EVIDENCE-01 — Existing Project Asset Provenance Audit

Status: **Audit complete — documentation only. No portfolio implementation
started.** No image binary was published, remapped, renamed, or deleted; no
case-study or project data, public wording, status, route, or configuration was
changed.

Baseline / audited production `main`:
`1e968354330df3b72b3ac73d12de164888087839` (13 July 2026).
Branch: `claude/bd-portfolio-evidence-01-asset-audit`.

Purpose: determine whether the repository already contains legitimate, currently
unused project images that could *safely* strengthen the three image-thin case
studies — **Tsavo Skywalk**, **Serenity Homes Diani**, **Zaara Park** — using only
repository evidence (source references, filenames, captions, git history). Full
record — method, complete asset inventory, referenced/unreferenced counts,
per-project evidence tables, provenance classification, privacy review,
duplicate/orphan findings, and the owner upload checklist — is in
**`PORTFOLIO_ASSET_AUDIT.md`**.

Headline results:

* **Inventory:** 48 tracked images under `public/` (the only tracked image
  directory; none outside `public/`). **47 are referenced** by `src/`/`index.html`;
  **exactly 1 is unreferenced** — `public/vite.svg`, the default Vite framework
  logo (scaffold asset, no project provenance).
* **No safe additional mapping exists.** No currently-unused image can be
  conclusively linked by repository evidence to Tsavo Skywalk, Serenity Homes
  Diani, or Zaara Park. Each of the three already uses the only asset that exists
  for it (`tsavo-skywalk.jpg`; `project-16.jpg`; `project-37.jpg`). The single
  unused file is the Vite logo, which must not be published as a project asset.
* **Statuses verified and preserved:** Tsavo Skywalk = **Built / Implemented**
  (with the confirmed six-month maintenance scope); Serenity Homes Diani =
  **Design Concept** (existing design-concept asset `project-16.jpg`; not
  classified as a render by repository evidence, and not a built photograph);
  Zaara Park = **Design Concept** (design render, not a built photograph). No
  status is changed.
* **Location inconsistency discovered (flagged, not fixed here):** the Serenity
  Homes Diani public source location reads **"Diani, Mombasa"** (`projects.js:29`,
  `case-studies.js:119`), but Diani is in **Kwale County** — authoritative facts
  place it in **Diani, Kwale**. Recorded as a VERIFIED DEFECT **F-5** in
  `POST_STABILIZATION_AUDIT.md` §3. This documentation-only PR does **not** change
  public source data; a separate focused truth-correction task should change only
  the incorrect location wording after this audit merges. The Design Concept
  status, project name, scope, images, and all image-provenance conclusions are
  unaffected.
* **Do-not-do guardrails recorded:** do not relabel `project-37`/`project-16`
  renders/design assets as built photographs; do not revive the superseded
  `project-12`→"Tsavo" mislabel (`project-12` is the confirmed Muthithi
  entrance-after image); do not fabricate before/after pairs.
* **Duplicates:** none among tracked files. **Orphans:** seven historically
  deleted `project-*.jpg` images exist only in git history (two ever referenced —
  captioned "Munuga Corridor"/"Highland Residence", both residential, both
  unrelated to the three targets); all are absent from the current tree.
* **Privacy:** the only unused image (`vite.svg`) is a logo with no
  people/vehicle/document/address content; the 47 referenced images are already
  live, so this audit introduces no new publication exposure.
* **Recommended next action:** no in-repo remapping. Strengthening these three
  case studies is gated on **owner-supplied uploads** — this confirms evidence gap
  B-4 in `POST_STABILIZATION_AUDIT.md`. The exact per-project owner upload/request
  checklist is in `PORTFOLIO_ASSET_AUDIT.md` §10.

Validation (audit): production build succeeds at 43/43 routes; lint holds at the
inherited 20 errors in the same four files (zero new); `git diff --check` clean;
the only changed files are `PORTFOLIO_ASSET_AUDIT.md` (new),
`POST_STABILIZATION_AUDIT.md`, and this `WORKSTREAMS.md` entry. No portfolio
implementation is marked started.

Protected systems confirmed unchanged: `src/data/case-studies.js`,
`src/data/projects.js`, project pages, captions/public wording, project statuses,
public image binaries, GardenCare, founder facts, the Apicora boundary, analytics,
`/admin` and `src/admin/**`, Supabase/auth/RLS, finance/payments/M-Pesa,
WhatsApp/enquiry flow, routes/sitemap/Vercel configuration, and
package/build scripts.

## BD-CONVERSION-02 — Enquiry Qualification Enforcement

Status: **COMPLETE — merged and production-verified.** PR #23 squash-merged to
`main` as `752c80fb022705a4f3407f6f66855e6fd4522fbc` (merged 2026-07-25); the
matching Vercel production deployment reached READY. Its acceptance criteria
(enquiry-qualification enforcement + bypass removal) passed. Production verification
also **surfaced a separate, pre-existing consultation-location resolution defect**,
which has since been **resolved under BD-CONSULTATION-01** (see the closeout record
below and the BD-CONSULTATION-01 section). Includes a repair pass (below) correcting
bypasses and authority overclaims found in the first draft.

Baseline `origin/main` (branch cut from):
`5bdef9039eaf978bbfc4e19dc6b0fdde59b9eeb6`
(`BD-PORTFOLIO-EVIDENCE-01: audit existing project assets (#22)`).
Branch: `claude/bd-conversion-02-enquiry-qualification`.

Follows BD-WS-06B (centralised WhatsApp templates) and BD-CONVERSION-01 (the
project-enquiry journey). Those established the six-step wizard, the authoritative
`wizardServiceForSlug`/`wizardServiceForSlugs` mapping, and structured WhatsApp
templates. Neither addressed the defect below.

Verified root cause (against `origin/main`): clear new-project-intent surfaces
paired the wizard CTA with a sibling **direct-WhatsApp bypass** that skipped
qualification entirely — `buildQuoteMessage()`/`buildServiceMessage()`/
`buildProjectMessage()`/`buildGardenCareMessage()` links with empty placeholder
fields on the homepage hero, Projects CTA, Projects lightbox ("I want this →"),
service pages, project/case-study pages, both GardenCare CTAs, and the Services/
About "Work with us" CTAs. In addition, the **NotFound (404) page** had a
`Project enquiry` link that opened WhatsApp directly, and **Ask Botanique**
(`Assistant.jsx`) ran a *duplicate* inline site-visit booking form with its own
fee calculation and a hardcoded WhatsApp URL — a parallel, unqualified consultation
path. Separately, the wizard's pre-handoff check only validated the current step,
so it relied solely on step-by-step gating with no single final all-required-field
guard.

### Correction of first-draft overclaims

The first draft of this PR claimed that **every** new-project-intent surface had
already been repaired, that all remaining direct WhatsApp routes were "general
contact or protected", that Ask Botanique had a **protected exception**, that
`CONTACT` alone would drive the future SIM migration, and that the budget ranges
were "approved". Those statements were inaccurate and are corrected here:

* The **NotFound 404** `Project enquiry` link and the **Ask Botanique** site-visit
  booking were still project-intent WhatsApp bypasses; both are now routed through
  the wizard (see repair pass).
* Ask Botanique had **no repository authority** establishing a protected exception;
  it is treated as a project-intent route and consolidated into the wizard.
* `CONTACT` did **not** by itself control the whole public number — hardcoded
  copies remained. Active client copies are now centralised; the remaining
  static/server/dead copies are inventoried below and must also change at SIM swap.
* The budget ranges are **task-specified provisional qualification ranges pending
  performance review**, not a separately recorded owner approval.

Scope delivered (public enquiry pathway only):

* **Single controlled funnel.** All new-project-intent CTAs — including the
  NotFound 404 recovery link and Ask Botanique's "Book a Site Visit" — now route
  through the six-step wizard before any WhatsApp handoff. Sibling direct-WhatsApp
  project bypasses were removed; secondary CTAs lead to projects/services or general
  contact, never an unqualified project WhatsApp message.
* **Ask Botanique consolidation.** "Book a Site Visit" (quick-reply card and
  in-thread CTA) now closes the chat panel and opens the wizard with
  `Consultation & Site Assessment` preselected and source `Ask Botanique`. The
  duplicate inline booking form, its independent fee calculation, dead booking
  state, and the hardcoded `wa.me` URL were removed. The wizard's location step,
  distance lookup and `PaidConsultancyModal` remain the authoritative fee/payment
  path — base fee, per-km rate, manual-distance fallback, payment details and
  M-Pesa behaviour are unchanged (verified: 13 km → Ksh 3,980).
* **Final required-field validation.** Before opening WhatsApp the wizard validates
  **all** required fields (Service, Location, Approximate size, Budget) and jumps
  back to the first incomplete step. Keyboard/focus/labels/back-forward/Escape/close
  and retained values preserved. The photos/video line is retained.
* **Budget ranges** set to task-specified provisional qualification ranges (pending
  performance review), with consistent `KSh`: Below 150,000 · 150,000–500,000 ·
  500,000–1.5M · 1.5–5M · Above 5M · Need guidance. No prior repository authority
  recorded budget ranges, and no owner approval of these specific ranges is claimed.
* **One authoritative message builder.** `buildQuoteMessage(form, context)` is the
  single project-enquiry builder; it carries an optional photos/video line and
  optional `{ programme, source }`. The unused `buildServiceMessage`,
  `buildProjectMessage`, and `buildGardenCareMessage` builders were removed.
* **Enquiry-source propagation.** A concise, human-readable source is passed from
  all controlled wizard entry points: Homepage hero / how-we-work / project-enquiry
  section / project card (with title), Header (desktop + mobile), Services page,
  individual service page, Projects gallery CTA, Projects lightbox (with title),
  project/case-study page, area page (with area name), GardenCare (with programme),
  Ask Botanique, and Page-not-found recovery. No route slugs, component names,
  analytics terms, or internal identifiers are exposed.
* **Service taxonomy unchanged.** The seven wizard `SERVICE_OPTIONS` remain
  authoritative and wired to `wizardServiceForSlug`/`wizardServiceForSlugs`.
* **Contact-number centralisation.** The number `0720 861 592` /
  `+254 720 861 592` / `254720861592` is **unchanged** (dedicated SIM not yet
  supplied). All **active client-side** references now resolve through `CONTACT`
  (`src/utils/backend.js`) / `waLink`: FAQ general WhatsApp, Footer `tel:`, homepage
  contact `tel:`, PaidConsultancyModal (×3, messages/fee preserved) and
  PaymentConfirmationModal. Remaining copies (see inventory) are **not** yet driven
  by `CONTACT`; the SIM swap still requires editing them.

Route classification (every direct WhatsApp/number route after repair):

* **New-project intent → wizard (no direct WhatsApp):** Homepage hero (+ View Our
  Work), homepage how-we-work / project-enquiry / project cards, Header desktop +
  mobile, Services page (+ Get in Touch), individual service pages (+ View Our
  Projects), Projects gallery CTA (+ Explore Services), Projects lightbox,
  project/case-study pages (+ View More Projects), area pages, GardenCare hero
  (+ Explore All Services) and closing, About "Work with us" (→ Get in Touch, general),
  NotFound `Project enquiry`, Ask Botanique "Book a Site Visit".
* **General contact (may remain direct):** FAQ "I have a question" WhatsApp (via
  central `waLink`); Footer / homepage `tel:` (via `CONTACT`); homepage `mailto:`.
* **Contact-form delivery fallback (may remain direct):** homepage contact form's
  send-failure WhatsApp/call/email block (`buildContactFallbackMessage`) — shown
  only when a configured backend fails to deliver.
* **Payment confirmation after the protected payment flow (may remain direct):**
  PaidConsultancyModal (×3) and PaymentConfirmationModal WhatsApp links — reached
  only after the paid-consultation/payment flow; numbers now via `CONTACT`.
* **Dead/unused code:** `src/components/SmartAdvisor.jsx` (not imported/rendered
  anywhere) still holds a hardcoded `wa.me` number; left untouched and flagged as a
  removal candidate (out of scope here).

Remaining hardcoded-number inventory (post-repair):

* **Central authority:** `src/utils/backend.js` `CONTACT` (`whatsapp`,
  `phoneDisplay`, `phoneTel`).
* **Active client code:** none hardcoded — all via `CONTACT`/`waLink`.
* **Static HTML / structured data:** `index.html` line ~55 (`"telephone"` in
  LocalBusiness JSON-LD).
* **Server / backend:** `server/index.js` (Ask Botanique system prompt + fallback
  text, ~4 occurrences).
* **Dead/unused:** `src/components/SmartAdvisor.jsx` (`wa.me` link).

The eventual dedicated-SIM swap therefore requires changing `CONTACT` **and** these
static/server (and, if it survives, dead) locations — not `CONTACT` alone.

Deferred (recorded, not implemented): dedicated Botanique SIM number replacement
(owner to supply); richer wizard qualification — property/site type, timeline, and
an in-wizard telephone field; more granular service taxonomy; conversion analytics
(BD-MEASUREMENT-01 Phase B remains blocked on Vercel plan); lead persistence /
Operations Workflow integration; removal of the dead `SmartAdvisor.jsx`.

Boundaries respected: no `/admin`, Supabase, lead DB, finance, consultation
fee/distance logic, `PaidConsultancyModal` behaviour, M-Pesa/manual-payment
behaviour, GardenCare commercial terms/coverage, founder facts, EIA/NEMA
corrections, Apicora boundary, portfolio evidence, testimonials, analytics, or
routes/sitemap/Vercel config were changed. No new analytics events, pixels,
cookies, or dependencies were added.

Validation: `npm run lint` → **19** errors (was an inherited 20; the removed dead
Ask-Botanique `bookingSubmitted` state eliminated one baseline error; **zero new**
errors, all remaining in `server/index.js`, `src/components/FadeIn.jsx`,
`src/context/AppContext.jsx`); `npm run build` → **43/43** routes + `dist/404.html`;
`git diff --check` clean. In-app browser: an unknown path renders NotFound and its
`Project enquiry` opens the wizard (not WhatsApp); Ask Botanique "Book a Site Visit"
closes the panel and opens the wizard with Consultation preselected → location →
`PaidConsultancyModal` with the unchanged fee (13 km → Ksh 3,980); the Header
enquiry message ends with "Enquiry source: Header"; the GardenCare programme +
"Enquiry source: GardenCare page" appear; final validation blocks an empty-budget
send; the six budget ranges render; Footer/contact phone render via `CONTACT`; no
console errors.

Changed files (this workstream): `src/App.jsx`, `src/context/AppContext.jsx`,
`src/components/QuoteWizard.jsx`, `src/components/Assistant.jsx`,
`src/components/Header.jsx`, `src/components/AreaPage.jsx`,
`src/components/Footer.jsx`, `src/components/PaidConsultancyModal.jsx`,
`src/components/PaymentConfirmationModal.jsx`, `src/utils/whatsapp.js`,
`src/pages/Home.jsx`, `src/pages/Projects.jsx`, `src/pages/services/ServicePage.jsx`,
`src/pages/ProjectDetail.jsx`, `src/pages/GardenCare.jsx`, `src/pages/Services.jsx`,
`src/pages/About.jsx`, `src/pages/FAQ.jsx`, `src/pages/NotFound.jsx`, and this
`WORKSTREAMS.md` entry.

### Production closeout & consultation-defect resolution (2026-07-25)

- PR #23 was marked ready and **squash-merged** to `main` as
  `752c80fb022705a4f3407f6f66855e6fd4522fbc`; the matching Vercel production
  deployment reached READY. BD-CONVERSION-02 **remained complete** — its own
  acceptance criteria (qualification enforcement + bypass removal) passed and were
  production-verified on `https://www.botaniquedesigners.com`.
- **Separate defect surfaced by that verification:** entering the ordinary Nairobi
  location `Karen` in the consultation path produced an implausible distance and a
  displayed payable total of **≈ KSh 422,060** (`getDistanceKm` took the first
  unrestricted worldwide Nominatim result; the modal displayed a payable fee
  immediately; the manual field did not make that total acceptable). Pre-existing,
  but easier to reach after Ask Botanique began correctly using the authoritative
  consultation flow. This was **not** resolved by BD-CONVERSION-02.
- **Resolved under BD-CONSULTATION-01:** the defect was fixed in PR #26,
  squash-merged to `main` as **`c112ca2bc5187400fd26c09d0f031046a1c37f08`**; the
  matching Vercel production deployment reached **READY** and was **production-verified**
  on the live domain (see the BD-CONSULTATION-01 section). The ≈ KSh 422,060 result
  no longer occurs — `Karen, Nairobi` and bare `Karen` now resolve to ~13 km / **Ksh
  3,980**, and uncertain lookups show no payable fee. **The consultation-location
  defect is therefore no longer a current paid-campaign blocker.** The historical
  KSh 422,060 evidence is retained above as the reason the repair was necessary.

## BD-CONSULTATION-01 — Consultation Location Resolution Repair

Status: **COMPLETE — merged and production-verified.** PR #26 squash-merged to
`main` as `c112ca2bc5187400fd26c09d0f031046a1c37f08` (merged 2026-07-25); the
matching Vercel production deployment reached READY. Narrowest accurate conversion
repair under the existing consultation/enquiry authority. Deliberately **not** named
BD-CONVERSION-03 (which the BD-CAMPAIGN-READINESS-01 audit proposes for *richer
wizard qualification*) — this is a distinct, bounded correctness fix. A
production-verification record is at the end of this section.

Baseline `origin/main` (branch cut from): `752c80fb022705a4f3407f6f66855e6fd4522fbc`
(`BD-CONVERSION-02 (#23)`). Branch: `claude/bd-consultation-01-location-resolution`.

**Verified defect (surfaced by BD-CONVERSION-02 production verification):** entering
the ordinary Nairobi location `Karen` in the consultation path produced an
implausible distance and a displayed payable total of ≈ **KSh 422,060**.
`src/utils/getDistanceKm.js` queried Nominatim **unrestricted worldwide** and took
`data[0]` (no Kenya filter, no address details, no country/coordinate validation),
and on failure returned `null` which the wizard mapped to a **misleading 0 km**;
`PaidConsultancyModal` then displayed a payable fee immediately. Pre-existing, but
easier to reach after Ask Botanique began correctly using the authoritative flow.

Fix (public consultation flow + one util; no protected system, no new dependency):

* **Kenya-constrained, confidence-safe geocoding** (`src/utils/getDistanceKm.js`):
  trims/normalises the query, biases it to Kenya, restricts Nominatim with
  `countrycodes=ke`, requests `addressdetails=1&limit=5`, and accepts a candidate
  only when the **returned country code is Kenya AND the coordinates also fall within
  the Kenya bounding box**. The bounding box is an **additional guard, never a
  fallback for missing country evidence**: a candidate with no `address`, no/empty
  `country_code`, or any non-`ke` code is rejected even if its coordinates are in
  Kenya, and a `ke` candidate whose coordinates fall outside Kenya is also rejected
  (`KE` is accepted after lowercase normalisation). It does not trust
  `countrycodes=ke` on the request alone — the returned evidence is validated.
  Returns an explicit **`{ status: "ok", km }`** or **`{ status: "uncertain", km: null }`**
  — never a foreign/NaN/negative/infinite distance and never a silent `0 km`.
  Nairobi CBD origin and the fee formula are unchanged. Locations anywhere in Kenya
  are preserved (e.g. Mombasa remains a legitimate long distance).
* **Explicit resolution state** threaded wizard → `AppContext` → modal
  (`distanceResolved`). `QuoteWizard` passes the structured result;
  `AppContext`/`App` derive `distanceResolved` (true only for a finite, non-negative
  Kenyan km).
* **Safe uncertainty handling** (`PaidConsultancyModal`): when the distance is **not**
  confidently resolved the field is **blank** (not 0), a message asks the visitor to
  enter the approximate distance from Nairobi CBD, and **no fee and no payment action
  are shown** until a finite, non-negative distance is entered; a confidently
  resolved distance is labelled an editable **estimate**. Negative/NaN input is
  rejected. Payment details, the fee formula, M-Pesa sandbox honesty, and the
  centralised WhatsApp number are unchanged.
* **Location-field guidance** (`QuoteWizard`): placeholder `e.g. Karen, Nairobi`;
  consultation hint asks for town/area + county, no exact address; typed location is
  never sent to analytics.

Validation: **`node --test src/utils/getDistanceKm.test.mjs` → 25/25 pass**
(deterministic fixture tests of the country-confidence/selection/rejection/distance/
uncertainty logic — incl. `ke`/`KE` accept, missing/empty/foreign country code
reject, `ke`-outside-Kenya reject, and Nominatim request-URL assertions — with a
stubbed fetch; no live Nominatim needed, no new dependency; the `.mjs` test is
outside eslint's `{js,jsx}` scope). `npm run lint` holds at the inherited **19**
errors (`server/index.js`, `FadeIn.jsx`, `AppContext.jsx`; zero new). `npm run build`
→ **43/43** routes + `dist/404.html`. `git diff --check` clean. In-app browser
(dev): `Karen, Nairobi` (resolved) → **Ksh 3,980** with an editable estimate hint (was
KSh 422,060); a foreign result → blank field, "could not confidently calculate"
message, **no total, no payment**; manual entry (20 km) → Ksh 4,400 and payment
re-enabled; negative input rejected; blank hides the total; mobile modal usable; no
console errors. Regression: normal six-step enquiries unaffected; consultation remains
the only post-location branch; Ask Botanique still preselects Consultation.

Boundaries: no `/admin`, Supabase, finance, CRM, Operations Workflow, GardenCare
terms, analytics/cookies/tracking, or campaign work; no contact-number change; no new
dependency. Changed files: `src/utils/getDistanceKm.js`,
`src/utils/getDistanceKm.test.mjs` (new), `src/components/QuoteWizard.jsx`,
`src/components/PaidConsultancyModal.jsx`, `src/context/AppContext.jsx`,
`src/App.jsx`, and this `WORKSTREAMS.md` entry.

### Production release closeout (2026-07-25)

- PR #26 was marked ready and **squash-merged** to `main` as
  **`c112ca2bc5187400fd26c09d0f031046a1c37f08`**; the matching Vercel production
  deployment reached **READY** (commit status success). A pre-merge repair also
  tightened the country-confidence rule so a candidate is accepted only when its
  returned `country_code` is Kenya **and** its coordinates fall within the Kenya
  bounding box (the box is a guard, never a fallback for missing country evidence);
  deterministic tests grew to **25/25** including request-URL assertions.
- **Live production verification** (`https://www.botaniquedesigners.com`, the exact
  merged commit): Ask Botanique "Book a Visit" opens the wizard with
  `Consultation & Site Assessment` preselected; `Karen, Nairobi` **and** bare `Karen`
  now resolve to ~13 km / **Ksh 3,980** (no implausible amount — the ≈ KSh 422,060
  defect is gone); a nonsense/uncertain location shows **no payable fee** (blank
  field + "could not confidently calculate" message, no payment action); manual entry
  of 20 km yields **Ksh 4,400** with the unchanged fee formula and re-enables payment;
  clearing the distance hides the fee and payment actions; the payment WhatsApp
  destination remains the centralised number; normal non-consultation enquiries reach
  step 6 and never trigger the consultation modal; no client-side console errors.
- **Remaining limitations:** none for this defect — it is resolved and
  production-verified. The dedicated Botanique SIM swap remains deferred (unrelated),
  and the geocoder still depends on public Nominatim availability, with the explicit
  manual-distance path as the designed safe fallback when a lookup is uncertain.

**BD-CONSULTATION-01 is complete, merged and production-verified. The
consultation-location defect is resolved and is no longer a paid-campaign blocker.**

## BD-CAMPAIGN-READINESS-01 — Campaign & Revenue-Conversion Readiness

Status: **Audit complete — documentation only. No implementation started.** New
workstream (no existing marketing/growth workstream covered this; broader than
BD-MEASUREMENT-01 [website analytics] and BD-CONVERSION-01/02 [enquiry pathway]).

Baseline `main`: authored at `752c80f` (`BD-CONVERSION-02 (#23)`) and rebased onto
`ca09117` (after the BD-CONVERSION-02 / BD-CONSULTATION-01 closeout, #24). Branch:
`claude/bd-campaign-readiness-01-audit`.

An evidence-based readiness audit for the next advertising campaign, optimising the
commercial chain *advert → relevant landing path → qualified enquiry → assessment →
quotation → awarded project → revenue & margin* — not vanity metrics. Full record —
executive decision, Instagram/Google evidence interpretation, website/landing-path
audit, measurement gaps, dedicated-SIM & WhatsApp Business readiness, manual
lead-register definition, lead-handling principle, GBP/directories assessment,
creative readiness, commercial KPIs, the full readiness matrix, per-channel launch
gates, and a six-phase programme — is in **`CAMPAIGN_READINESS_AUDIT.md`**.

Headline results:

* **Demand is proven; scale-readiness is not.** The small GardenCare-led Instagram
  test proved demand for the **wider** landscape offer; Google PMax proved only cheap
  clicks (conversion tracking was misconfigured — 0 recorded conversions is **not**
  proof of no enquiries). Neither channel produced decision-grade cost-per-qualified-
  lead, assessment, quotation, awarded-project or revenue/ROAS. No leads, revenue or
  ROAS are invented.
* **Website funnel is ready** after BD-CONVERSION-02; **downstream measurement is
  not** (custom events blocked on Vercel Hobby; no Google/Meta conversion tracking,
  no Pixel/GA/GTM/cookies approved).
* **Gate 0 (consultation-location defect) is now MET** — resolved and
  production-verified under BD-CONSULTATION-01 (`c112ca2`); `Karen` no longer yields
  the ≈ KSh 422,060 total. (Historical evidence retained in the audit.)
* **Remaining blocking gates before launch:** dedicated Botanique SIM (deferred —
  number not supplied), WhatsApp Business setup, manual lead register, lead-response
  ownership + follow-up, campaign source/UTM standard; plus Google conversion
  measurement before Google Search, and Meta measurement before scale/retargeting.
  **Performance Max should not run** until trustworthy conversion inputs exist.
* **Next principal campaign leads with landscape design & implementation**, not
  GardenCare; residential and commercial/hospitality intent must be separated.

Explicit non-goals (unchanged by this audit): no advertising tags/pixels, analytics
events, landing-page implementation, CRM/database, Google Business Profile edits,
directory purchases, creative production, external-account changes, or contact-number
change. Proposed follow-on workstreams (IDs assigned at their own preflight):
BD-CONTACT-SIM-01, BD-MEASUREMENT-02, BD-CONVERSION-03, BD-LANDING-01,
BD-CREATIVE-01, BD-LOCAL-01, BD-LEADOPS-01.

Changed files (this workstream): `CAMPAIGN_READINESS_AUDIT.md` (new) and this
`WORKSTREAMS.md` entry only. No application code, configuration, or protected system
was touched.

## BD-LEADOPS-01 — Manual Lead Operations Foundation

Status: **Playbook complete · manual-register template complete · operational adoption
NOT complete · actual lead owner NOT confirmed · external WhatsApp Business NOT
configured · dedicated SIM NOT supplied · campaign gates still unmet.**
Documentation/template only — **no implementation is marked operational.** New narrow
workstream anticipated by `CAMPAIGN_READINESS_AUDIT.md` (there proposed as "WhatsApp
Business configuration and the manual lead register / lead-handling operating routine,
interim to the future Operations Workflow System"); no existing workstream covered it
and no identifier conflict exists.

Baseline `main`: `dc6c8ccf058bacd79ece9d977b08345f7df2b061`
(`BD-CAMPAIGN-READINESS-01 (#25)`). Branch:
`claude/bd-leadops-01-manual-lead-operations`.

Establishes the **interim manual lead-operations control** required before the next
Instagram/Google campaign — capturing every serious enquiry, its source, sales stage,
owner and follow-up, and connecting spend to commercial outcomes — without a CRM,
database, analytics, or any change to the future Operations Workflow System.

Deliverables:

* **`LEAD_OPERATIONS_PLAYBOOK.md`** (new; sequential §1–§12) — lead definitions; the
  four-field minimum qualification standard (service, location, size, budget) that a
  WhatsApp click does **not** by itself meet; one authoritative **13-stage** list
  mapped to WhatsApp labels with entry/action/exit/evidence/owner/follow-up per stage,
  including the corrected assessment sequence (**Assessment proposed → Assessment
  pending payment → Assessment booked**) and an explicit **direct-quotation path**
  (`Qualified → Quotation preparing`); an **ownership-accountability rule** — every
  open lead must have a **real** owner (`Widson`, a founder-approved named operations
  owner, or a founder-approved assigned team member); **no placeholder owner**, and
  the register is not operationally adopted until a real owner is confirmed; follow-up
  control rules; the campaign-source naming standard with the corrected **UTM mapping**
  (`utm_source`/`utm_medium`/`utm_campaign`/`utm_content`=creative variant/`utm_term`;
  landing context derived from URL/wizard source/manual entry — `utm_content` is not
  the landing page; documentation only, no parsing); the **WhatsApp Business readiness
  + SIM-cutover checklist** (external, nothing configured here; no PINs/secrets
  stored); a short response-template library in Botanique's **"we" voice** (one–three
  sentences, no public/founder number); the **full commercial KPI model** (enquiries,
  qualified leads, qualification rate, cost per qualified lead, assessments proposed/
  booked/completed, cost per booked assessment, booked-to-completed rate,
  assessment-to-quotation rate, quotations, quotation value, quotation-to-win rate,
  won projects, awarded value, gross margin, attributed revenue, ROAS, lost reasons —
  with formulas and `N/A` for division by zero) kept distinct from diagnostic vanity
  metrics; and the relationship to future systems (Simple Invoice Manager = finance
  source of truth; Project Tracking separate; no Supabase/`/admin`).
* **`templates/BOTANIQUE_LEAD_REGISTER.csv`** (new) — headers-only reusable register
  (**37 columns**), `KSh` throughout, `BD-LEAD-YYYY-NNN` IDs (assigned manually), with
  data definitions in the playbook §6.2. Adds campaign-attribution fields (**Ad set /
  audience, Creative / ad variant, Keyword / search term**), assessment-completion
  evidence (**Assessment completed, Assessment completion date**), and reconciliation
  references (**Quotation reference, Project reference** — reference only, not
  duplicated finance/project records). No real or fabricated client records.

Boundaries respected (unchanged): no public website React code, **no contact-number
change** (founder number stays until the dedicated SIM is supplied; the new number is
not invented), no external WhatsApp configuration, no CRM/Supabase/`/admin`, no
finance/payment change, no analytics/cookies/pixels/tags/GTM, no Google/Meta
configuration, no campaign creatives, no GardenCare policy change, no Operations
Workflow System change.

Owner decisions still required: dedicated SIM number; WhatsApp Business activation;
lead-response owner; follow-up timing approval; register adoption in daily use; staff
access/escalation model. **Launch gates remain unmet** until the register is adopted
and WhatsApp Business is configured (see `CAMPAIGN_READINESS_AUDIT.md`).

Validation: `git diff --check` clean; CSV verified as a single header row, no
duplicate headers, no blank headers, consistent **37-column** count, valid UTF-8, no
client data, and the playbook column inventory (§6.1) matches the CSV exactly; changed
files are documentation/template only (`LEAD_OPERATIONS_PLAYBOOK.md`,
`templates/BOTANIQUE_LEAD_REGISTER.csv`, `CAMPAIGN_READINESS_AUDIT.md`, this
`WORKSTREAMS.md` entry).

## BD-OPERATIONS-HUB-01 — Operations Hub Architecture and Reconciliation

Status: **Architecture recorded — NO implementation started.** Existing operational
systems preserved; **Phase 1 (Operational spine) is the recommended next
implementation after the campaign-launch work.** Documentation only. New narrow
architecture/documentation workstream; no existing workstream covered the future
Operations Hub design and no `BD-OPERATIONS-HUB` identifier conflict exists.

Baseline `main`: `1b53ba3ac6fd79f0423eb64ec1497161363867c1`. Branch:
`claude/bd-operations-hub-01-architecture`.

Records the intended long-term operating model — *Campaign → Lead → Qualification →
Site visit → Quotation → Awarded project → Design & implementation → Maintenance →
Commercial reporting* — with the existing `/admin` + Supabase foundation evolving into
Botanique's internal Operations Hub. Full record in
**`BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md`**: verified existing foundation (`/admin`,
Supabase auth, `profiles`/`projects`/`project_assignments`/`project_financial_references`
with RLS, owner/manager/staff/viewer roles, owner-only finance, the admin projects
tracker) vs `NO EVIDENCE FOUND` items (no DB lead intake — the public QuoteWizard is
WhatsApp-only; no leads/campaigns/visits/maintenance/expenses/applications/assets
tables); twelve proposed modules; a system-of-record matrix (Simple Invoice Manager =
finance source of truth, hub holds references only; project tracker separate); proposed
data domains (`leads` with a nullable `project_id` until won, `campaigns`,
`lead_activities`, `site_visits`, `project_milestones`, `tasks`,
`maintenance_schedules`, `applications`, `operational_expenses`, `company_assets` — no
migrations written); preserved owner/manager/staff RLS and finance restrictions; and a
five-phase order (spine → delivery → recurring ops → business admin → integrations).

Boundaries: **no database migrations, UI, storage bucket, integration, or external
setup**; no change to `/admin`, Supabase schema/RLS, finance references, the project
tracker, GardenCare policy, the enquiry funnel, measurement, or the contact number.
Changed files: `BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md` (new) and this `WORKSTREAMS.md`
entry only.

### Phase 1A — Lead Data and RLS Foundation

Status: **Phase 1A applied and runtime-verified on the hosted `botanique-admin`
project.** The additive migration was validated by isolated PostgreSQL runtime execution,
merged to `main` under PR #30, and has now been **applied to the hosted Supabase project
via the supported CLI workflow** with full post-apply verification — so the schema/RLS
**is now live** in Supabase. NO admin lead UI exists yet, NO site-visits/calendar
module, NO dashboard queues, NO won-lead conversion action, NO website ingestion or
advertising integration, and NO production frontend deployment. This is the **first
implementation slice** under the existing `BD-OPERATIONS-HUB-01` authority — a
continuation phase of Phase 1 (Operational spine), **not** a new `BD-OPERATIONS-HUB-02`
workstream.

**Hosted application and verification (after PR #30):** the original admin-foundation
schema (`20260614000100`) was already **live** on the hosted `botanique-admin` project
(Supabase **Pro** organisation, `ACTIVE_HEALTHY`) but **absent from tracked migration
history, indicating it was applied outside the normal migration workflow**. Using the
supported Supabase CLI against the verified project, the foundation history record was
repaired (`migration repair 20260614000100 --status applied`) — a history-only operation
that runs no foundation SQL — and **only** Phase 1A (`20260726000100`) was then applied
via `db push`. Migration history is now **reconciled for both versions**
(`20260614000100` and `20260726000100` applied; no stray entry). Post-apply hosted
verification confirmed: `campaigns`, `leads`, `lead_activities` exist and are **empty**;
RLS enabled on all three; exactly the eight expected policies (no DELETE anywhere; no
UPDATE/DELETE on `lead_activities`; staff have no campaign access); five SECURITY DEFINER
functions with controlled `search_path` and helper `EXECUTE` restricted to
`authenticated`; all triggers/indexes present; the campaign/lead/Lost/Nurture/owner
constraints and immutable `lead_identifier` behave correctly; no finance/document columns
on Phase 1A tables; and owner/manager/no-profile role tests passed under rolled-back
transactions (staff/viewer deferred structurally — no such profiles exist). The existing
**2 profiles and 7 projects were unchanged** (identical deterministic checksums before and
after), the owner-only `project_financial_references` boundary is unchanged, and **no seed
or test record remains**. **Restore-timing correction:** an earlier interim report that
found an "empty schema / zero users" was a **transient read taken before the restored data
volume finished mounting** — not data loss; the settled database contains the real
foundation, accounts and projects. `src/admin/data/projectSeed.js` is a **development
fixture only** and is **not** the source of the current production rows (production reads
the hosted `projects` table).

**Runtime validation (PR #30):** both migrations were executed from an empty database in
their original order (`20260614000100_admin_foundation.sql` then
`20260726000100_operations_hub_phase_1a_lead_data_rls.sql`) against a disposable,
isolated **Homebrew PostgreSQL 17.10** cluster (private socket, port 5599) with a
Supabase-compatible test bootstrap (`auth.users`, `auth.uid()` reading
`request.jwt.claim.sub`, and the `anon`/`authenticated`/`service_role` roles). The
clean-chain rerun completed with **zero SQL errors and all seven expected tables**.
Role-by-role RLS and integrity tests passed: schema creation; RLS enablement and the
documented policy matrix; owner/manager/staff/viewer/no-profile behaviour; campaign
name/date constraints; lead defaults and controlled-value constraints; Lost/Nurture
cross-field constraints; audit-identity overwrite (`created_by = auth.uid()`); immutable
`lead_identifier`; archive provenance; legitimate activity backdating; valid-owner
enforcement; assignment-scoped lead and activity access; append-only activity behaviour;
helper-function `EXECUTE` restrictions (anon denied, authenticated allowed);
history-preserving `RESTRICT` foreign keys; owner-profile deletion producing
`owner_id = NULL`; owner-only `project_financial_references`; and the absence of protected
quotation/finance columns from Phase 1A tables. **Fidelity caveat:** this was real
PostgreSQL runtime and RLS execution, but it used a Supabase-compatible auth/role **stub**
rather than the full GoTrue/PostgREST local stack, and PostgreSQL 17 rather than the
hosted-Supabase version; no Phase 1A feature is known to depend on that version
difference. A controlled Supabase application and post-apply verification remain required.

**Accepted Phase 1A behaviour:** (1) *Inactive-owner:* `is_valid_lead_owner(owner_id)` is
enforced on lead UPDATE, so an unrelated update is rejected while the assigned owner is
inactive until the lead is reassigned or `owner_id` cleared — accepted (inactive profiles
should not remain valid assignees; no trigger rewrite in PR #30). (2) *Owner FK:*
`owner_id uuid references public.profiles(id) on delete set null` is kept — ownership
belongs to the active profile/role spine (`profiles.id` = `auth.users.id`).
**Deferred governance (non-blocking):** `leads.notes` and `lead_activities.summary` must
not be used for quotation/payment/invoice/receipt identifiers, PDF links or other
protected financial references; the future admin UI and operating instructions must
enforce this — no schema/regex change is made in Phase 1A. No production data seeded;
Phase 1B not started.

Baseline `main`: `95d32e639a873a0094b404b74e4200134592cf14`
(`BD-CAMPAIGN-LAUNCH-01 (#29)`). Branch:
`claude/bd-operations-hub-01-phase-1a-lead-data-rls`.

Adds one additive migration
(`supabase/migrations/20260726000100_operations_hub_phase_1a_lead_data_rls.sql`)
creating three new tables with audit triggers and RLS:

* `campaigns` — minimal canonical campaign-definition table (name, source platform,
  objective, service focus, audience, period, active state, notes). `campaign_name` is
  constrained to the `LEAD_OPERATIONS_PLAYBOOK.md` §7 lowercase underscore-delimited
  standard (a regex check, not just length); a `start_date`/`end_date` order check is
  enforced. **No live campaign rows are seeded.**
* `leads` — front-of-funnel record preserving the manual register's information model
  (`templates/BOTANIQUE_LEAD_REGISTER.csv`, 37 columns) with deliberate normalisation.
  Controlled values (source platform, qualification status, current stage, outcome,
  photos status) match the playbook §4 / §6.2 exactly. Manually-supplied, validated,
  **immutable** `BD-LEAD-YYYY-NNN` identifier (preserved on every update; no
  auto-generation). `client_name` is **nullable** (an incomplete first enquiry is
  capturable without a fabricated name) but must be non-blank when supplied. Operational
  state fields are **non-null with safe defaults** (`photos_received`='No',
  `qualification_status`='Unqualified', `current_stage`='New enquiry',
  `assessment_state`='Not proposed', `outcome`='Open'); service/location/size/budget stay
  optional so qualification can complete over time. Nullable `campaign_id`, `project_id`
  (won-lead link; no conversion logic here) and `owner_id` (unassigned queue by design);
  a non-null `owner_id` must reference an **active** owner/manager/staff profile
  (enforced via `is_valid_lead_owner()`). Cross-field checks: Lost requires a lost
  reason; Nurture requires a next follow-up date. Assessment position held as constrained
  text; assessment **dates** deferred to the future site-visits slice. **No financial
  amounts** (quotation, awarded value, gross margin) are stored, and the **quotation
  reference (identifier) is deferred** to a future **owner-only** protected mechanism —
  `leads` is manager- and assigned-staff-readable, so a quotation document number must
  not live on it; managers/assigned staff receive only operational quotation *state*
  (`current_stage` = `Quotation preparing`/`Quotation sent`, and the `Quotation issued`
  activity type). Simple Invoice Manager remains the financial source of truth. The only
  reference retained on `leads` is the non-financial `project_reference`/`project_id`
  (Project Tracking System — already within manager operational authority).
* `lead_activities` — append-only activity-history events (`lead_id` → `leads`).
  Reconciled activity types; **no update or delete policy** (immutable history).

RLS (narrowest defensible matrix, reusing the existing `is_owner()`/`is_manager()`/
`is_staff()` helpers plus new narrowly-scoped `is_assigned_to_lead(uuid)` and
`is_valid_lead_owner(uuid)` SECURITY DEFINER helpers — both with `EXECUTE` **revoked from
`public`/`anon` and granted only to `authenticated`**, since they are internal RLS
helpers rather than public API):

* campaigns — owner/manager select+insert+update; **staff no access** (no staff
  lead-management UI in Phase 1A); viewer none.
* leads — owner/manager select+insert+update (insert/update WITH CHECK also validates
  the owner target); staff select **only** own-assigned leads (staff mutation deferred);
  viewer none. Manager gains **no** finance access (no finance columns exist on the
  table).
* lead_activities — owner/manager select+insert; assigned staff select+insert own
  leads only; **no** update/delete for any role; viewer none.
* **No delete policy** on any of the three tables (archive/append-only). History-safe
  FKs: `campaign_id`/`project_id`/`lead_activities.lead_id` are `ON DELETE RESTRICT`;
  `owner_id` is `ON DELETE SET NULL` (a departed user never deletes a lead).

Preserved: Simple Invoice Manager (finance source of truth) and the Project Tracking
System remain authoritative; existing `profiles`/`projects`/`project_assignments`/
`project_financial_references` tables, policies, functions and the owner-only finance
boundary are unchanged. The migration is additive and non-destructive.

**Not done in Phase 1A:** admin lead routes/components, lead list/detail/edit screens,
site-visits, operational calendar, dashboard queues, won-lead project creation, website
lead ingestion, UTM parsing, Google/Meta/WhatsApp/Calendar integrations, and any frontend
production deployment. The hosted schema/RLS **is now live** (see the hosted-application
record above); what remains for Phase 1B is the **user-facing** Leads work. The existing
seven-project **Project Tracker remains the current production `/admin` interface** — the
new Phase 1A tables have **no visible UI yet**.

## BD-CAMPAIGN-LAUNCH-01 — Controlled Paid Campaign Launch Preparation

Status: **Launch pack prepared — external campaign setup NOT performed; no advert
launched.** Dedicated SIM pending unless supplied · register template exists but
adoption pending until confirmed · lead owner pending until confirmed · Google
conversion measurement pending · creative approval pending · campaign NOT launched.
Documentation/content only. New narrow campaign-preparation workstream; no
`BD-CAMPAIGN-LAUNCH` identifier conflict.

Baseline `main`: `d9754faffcca8a3b4e4ad5ebad792478a3219c37`
(`BD-OPERATIONS-HUB-01 (#28)`). Branch: `claude/bd-campaign-launch-01-monday-pack`.

Prepares the Monday 27 July 2026 launch materials and a final GO/NO-GO decision — it
does **not** configure or activate any external campaign. Full pack in
**`CAMPAIGN_LAUNCH_PACK_2026-07-27.md`**: channel priority (Meta P1, high-intent
Google Search P2, X optional P3 — no Performance Max); two lanes (residential design &
implementation; commercial/institutional); a creative-inventory audit of verified
repository assets with provenance (Karen/Muthithi/KSMS/Tsavo = built; the Muthithi
entrance is the only verified before/after; Zaara Park + Serenity Diani are **design
concepts — not to be shown as built**); BD-LEADOPS-01 campaign naming + UTM examples;
Meta and Google Search structures; an X pack; the Monday register-adoption checklist;
the dedicated-SIM gate (unmet; cutover steps prepared, not executed); the measurement
gate (Meta manual reconciliation acceptable for a small test, Google Search NO-GO
until conversion measurement); budget authority (**no approved future budget exists**;
only historical spends cited; owner-decision fields); an evidence-based ad-copy pack;
a GO/NO-GO matrix; and the Sunday 26 July owner action sheet.

GO/NO-GO (authority-aligned): Meta residential + commercial **CONDITIONAL GO** (once
SIM/WhatsApp, named owner, operational register, naming and creative are met); Google
Search **NO-GO** until conversion measurement; Performance Max **NO-GO**; Meta
retargeting **NO-GO**; X organic **CONDITIONAL GO**; X paid **OWNER ACTION REQUIRED**.

Boundaries: no external advertising account configured, no advert launched, no
contact-number change, no tracking/tags/cookies, no website code change, no Operations
Hub code/database. Changed files: `CAMPAIGN_LAUNCH_PACK_2026-07-27.md` (new),
`CAMPAIGN_READINESS_AUDIT.md`, and this `WORKSTREAMS.md` entry.
