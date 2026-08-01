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

Status: **Active programme. Approvals, Daily Site Operations and project material-change
controls are merged, hosted and ACTIVE_VERIFIED.** The current functional `/admin`
destinations are Dashboard, Projects, Daily Site Operations, Site Costs, Fund Requests,
Approvals and Project Intakes, each shown only to the roles its capability check permits.
BD-FIN-01A (Internal Cost Claims and Principal Decision) is merged, hosted and
ACTIVE_VERIFIED. BD-FIN-01B (Project Fund Control Authority) is the approved next finance
authority; its first slice, BD-FIN-01B1 (Claim-Backed Fund Requests), is merged, hosted and
ACTIVE_VERIFIED on PR #51.
BD-FIN-01B2, BD-FIN-01C and BD-FIN-01D remain separately gated and unimplemented.
**BD-FIN-01B2 implementation is additionally paused** pending the 1 August 2026
information-architecture authority recorded below; its approved product conclusions stand
unchanged and are not reopened by that pause.
No new Operations Hub master register is required: this entry remains
the execution and live-state register, the Product Requirements remain founder-requirements
authority, and the Blueprint remains architecture/system-of-record authority.

Original architecture baseline `main`:
`1b53ba3ac6fd79f0423eb64ec1497161363867c1`. Original architecture branch:
`claude/bd-operations-hub-01-architecture`. This baseline is historical evidence, not the
current implementation base.

Records the intended long-term operating model — *Campaign → Lead → Qualification →
Site visit → Quotation → Awarded project → Design & implementation → Maintenance →
Commercial reporting* — with the existing `/admin` + Supabase foundation evolving into
Botanique's internal Operations Hub. Full record in
**`BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md`**: verified existing foundation (`/admin`,
Supabase auth, `profiles`/`projects`/`project_assignments`/`project_financial_references`
with RLS, owner/manager/staff/viewer roles, owner-only finance and the admin projects
tracker). The original twelve-module proposal and five-phase order are superseded by the
28 July 2026 post-merge authority revision in the Product Requirements and Blueprint.
Phase 1A subsequently implemented the `campaigns`, `leads` and `lead_activities` schema/RLS;
Phase 1B-A1 implemented project integrity and history; Phase 1B-A2 implemented the live
admin shell, project operations and initial dashboard.

Original architecture-slice boundaries were documentation-only. Current protected
boundaries and future dependencies are maintained in the revised Product Requirements and
Blueprint.

### 1 August 2026 — Information architecture, reporting, notifications, mobile and recovery authority (documentation only)

Status: **Documentation authority only.** This entry authorises no application code, route,
component, migration, RLS policy, function, grant, test, hosted mutation or deployment. No
hosted Supabase or Vercel system was accessed while it was written. Exactly three files
changed: this register, `BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md` and
`BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md`.

**Why BD-FIN-01B2 implementation is paused.** BD-FIN-01B2 (Fund Releases and Accountable
Advances) completed its critical review against merged BD-FIN-01A and BD-FIN-01B1
implementation truth, and its product conclusions are approved and preserved. It is not
paused because of a defect in that authority. It is paused because delivering it as drafted
would add an eighth workstream-shaped destination to a sidebar that is already failing the
comprehension test for its most authorised user.

**The observed problem.** The current functional destinations are Dashboard, Projects, Daily
site ops, Site Costs, Fund Requests, Approvals and Project intakes. Every one of those names
is correct, and every one of them is an internal workstream or database concept exposed
directly as a user-facing destination. The founder has observed that the sidebar is becoming
hard to reason about even for the Principal. A user should be able to answer what is
happening on a project, who is working, what was requested, what was approved, what has been
funded, what has been paid, what remains outstanding and what needs attention **without
knowing which database domain owns each answer**. The underlying authority separation is
correct and is not the problem; its direct presentation is.

**Approved direction.** Enter information once in the correct authoritative operational
record; derive dashboards, work queues, notifications, reports, printable documents,
balances and management summaries from those records rather than re-entering them. Record
creation becomes project-centred and phrased as what happened or what is needed, not as
which module to open. Top-level navigation simplifies toward Dashboard, Projects, People,
Finance, Reports and More, with a single role-aware Work Inbox for anything needing
attention and a Notifications capability that deep-links to the exact record. Mobile is a
primary operating environment, not a compressed desktop. Strict backend authority
separation, immutable events, project-scoped database authority, role boundaries and
system-of-record ownership are unchanged — this is a presentation and derivation authority,
not a data-model merge. Full founder requirements are in the Product Requirements
(§§14–23); full architecture, derivation rules and dependencies are in the Blueprint
(§§10–17).

**Reporting, notifications, mobile and recovery.** Reports become a first-class product area
derived from authoritative records, never a duplicate report-entry form. Printable documents
become generated presentations of existing records, never a re-keying exercise. Notifications
are an attention projection created from authoritative events and are explicitly **not** an
audit ledger; the immutable domain event ledgers remain authoritative. Mobile requires
stacked records, immediate visibility of amount and state, no mandatory horizontal tables,
and exact-record deep links. External push, email, WhatsApp and SMS delivery are **not**
authorised and require separate review. Offline mutation is **not** authorised.

**Backup and recovery posture is unverified.** This repository carries **no evidence** of a
configured backup, retention, restore-authority or disaster-recovery posture: there is no
backup script, no scheduled export, no continuous-integration workflow and no recorded
platform-plan or retention evidence. The Phase 1B-A4 runbook at the end of this register
already instructs a recovery path "via Supabase point-in-time recovery", but no evidence in
this repository establishes that point-in-time recovery is available on the current plan or
what its retention window is. That instruction is therefore an **assumption to be verified,
not a recorded capability.** Nothing in this authority may be read as a claim that any
backup, export, retention or recovery-testing regime currently exists. The required
verification is recorded as founder acceptance expectations in the Product Requirements §22
and as architectural dependencies in the Blueprint §16, and must be carried out read-only
before any statement of adequacy is made. **That verification has since been carried out —
see the dated backup and recovery verification entry immediately below, which supersedes the
"wholly unverified" characterisation in this paragraph.**

**Preserved without weakening.** BD-FIN-01A and BD-FIN-01B1 remain ACTIVE_VERIFIED and are
not reopened. The approved BD-FIN-01B2 conclusions stand: accountable advance and
direct-recipient funding models; direct-recipient releases bound to exactly one existing
`fund_request_allocation`; no new recipient identity authored at release; derived release
progress; final closure of unused release authority; receipt acknowledgment derived from
immutable events; administrative annulment only where no money moved; real reversals
deferred to BD-FIN-01D; no `Ongoing`-only release restriction; and no release-allocation
table. **The direct-recipient identity model is settled authority, not an open question:**
the founder approved the allocation-bound model before this documentation task. Recipient
identity is inherited from that allocation's frozen claim-recipient snapshot; a
multi-recipient request is executed through separate release records; and cumulative active
direct-recipient releases against one allocation may never exceed that allocation's approved
requested amount. The reference identifies whose approved obligation the money moved toward
and establishes no payment, counterparty confirmation or settlement, all of which remain
BD-FIN-01C. A direct-recipient release still never means paid or settled, and no part of the
BD-FIN-01B2 documentation authority is blocked by this decision. The one thing this
authority changes about
BD-FIN-01B2 is where its interface lives: inside the unified Finance experience, not as
another permanent standalone top-level destination. Also preserved: the planned, claimed,
approved, requested, released, paid and reconciled distinctions; strict project-level
database authority; immutable financial and operational events; Principal and Operations
Manager boundaries; Staff and Viewer restrictions; Daily Site Operations authority;
Approvals as the authoritative decision workflow for its implemented types; Simple Invoice
Manager as the client-commercial system of record with no claimed integration; Documents &
Evidence as the future shared evidence domain; no permanent deletion; and no hosted
verification records.

**Forward-compatible extension, not pretence.** Where later implementation must extend a
delivered surface, that is stated plainly rather than disguised. The Work Inbox is a
presentation layer over existing domain authority, not a replacement ledger. The current
`/admin/site-costs` and `/admin/fund-requests` routes may remain during transition but are
**not** the permanent top-level architecture. Navigation remains capability-led: a
destination appears only when its module is functional and authorised.

**Next gated sequence.** (1) This information-architecture authority; (2) read-only backup
and recovery posture verification; (3) Work Inbox and Notifications authority and
implementation planning; (4) Reports and derived-summary authority; (5) People and payee
identity authority; (6) progressive navigation and mobile-shell implementation;
(7) BD-FIN-01B2 database authority and concurrency; (8) BD-FIN-01B2 unified Finance
interface; (9) BD-FIN-01C payments and claim allocations; (10) BD-FIN-01D reconciliation,
returns and reversals; (11) printable documents and shared Documents & Evidence;
(12) expanded management reporting and verified Simple Invoice summaries if separately
approved. Each stage remains separately gated with its own authority, branch, review and
deployment gate. This entry authorises none of stages 2–12.

### 1 August 2026 — Backup and recovery posture verification (stage 2, read-only)

Status: **`PARTIALLY_VERIFIED_WITH_MATERIAL_GAPS`** — partially verified with material gaps.
This is **stage 2 of the PR #54 sequence**. The posture is **not** adequate, complete,
resilient or disaster-recovery ready, and must not be described as such.

**Method.** Read-only inspection of hosted platform metadata, plus founder dashboard
observation carried out personally by Widson Omutelema Ambaisi. **No hosted system was
mutated.** No SQL was executed, no backup was created, no restore was initiated, no data was
downloaded, no environment-variable value was revealed, no configuration was changed, and
neither Apicora project was opened. PITR was not enabled. MFA was not enabled. This entry is
documentation only and authorises no implementation.

**Verified — Supabase.** Project `botanique-admin` (ref `wcacyfyxjiysfibuuhgf`) in
organisation `Widson-star's Org`, plan **Pro**. Scheduled physical database backups are
**operational**, not merely entitled. Seven completed restore points were observed, each
exposing a Restore control: 2026-08-01 04:04:43 UTC, 2026-07-31 04:08:08 UTC, 2026-07-30
04:03:56 UTC, 2026-07-29 04:06:52 UTC, 2026-07-28 04:10:07 UTC, 2026-07-27 04:03:58 UTC and
2026-07-26 15:00:54 UTC. Observed cadence is daily; visible retention is seven restore
points, consistent with approximately seven days. The latest observed successful backup was
**2026-08-01 04:04:43 UTC (07:04:43 EAT)**. Restore-to-new-project is available in the
dashboard as a beta capability and was **not** exercised.

**Verified — PITR is disabled.** The Point in Time page states that point-in-time recovery is
available as an add-on and exposes an `Enable add-on` control. The consequence is recorded in
the superseding correction to the Phase 1B-A4 migration runbook below. Because the only
restore points are daily snapshots, the effective recovery point objective is bounded by the
gap since the last daily backup; no formal founder-approved objective exists.

**Verified — Storage is excluded from database backups.** The dashboard states explicitly
that database backups do not include Storage objects, that backups contain Storage **metadata
only**, and that restoring an old database backup does not restore objects deleted through the
Storage API. Database backup and Storage-object backup are therefore **separate recovery
domains** and must remain so. **Documents & Evidence must not be treated as recoverable**
until an independent Storage backup policy exists and has been tested; a database restore
would otherwise reinstate metadata referencing objects that were never restored.

**Verified — Supabase organisation authority.** The organisation has exactly one member:
Widson Omutelema Ambaisi, role **Owner**, **MFA disabled**. Restoration and administration
authority is therefore concentrated in a single account with **no secondary recovery
authority**. MFA disabled on the sole owner account is a **critical remediation item**:
account compromise or loss of access is currently indistinguishable from loss of the estate.
Botanique and Apicora share the same Supabase organisation administrative boundary.
Application RLS is **not** claimed to separate organisation-level restoration authority, and
must never be represented as doing so.

**Verified — Vercel.** Production project `botanique-designers-site-gpm1`, team plan
**Hobby**, serving `botaniquedesigners.com` and `www.botaniquedesigners.com`. The latest
production deployment is the PR #54 merge commit
`22cb2e723f7ff7460a3cfe7d3a50df85cd8edd83`, state **Ready**. Deployment Retention Policy is
**30 days** for cancelled, errored, pre-production and production deployments alike. Recently
deleted production deployments are visible with recovery menus, and the dashboard states that
most deleted deployments can be restored within 30 days of initial deletion. **No deployment
was restored.** The current production deployment exposes an Instant Rollback control.
**Complete historical Instant Rollback depth is not claimed and remains unverified.**

**Verified — Vercel authority.** The team has exactly one member, `widson-star`, role
**Owner**, holding sole deployment, settings and rollback authority with **no secondary
recovery authority**. Botanique and Apicora share the same Vercel team administrative
boundary, and project-specific role assignment is unavailable on the current plan.

**Supporting evidence only — Vercel security controls.** Build Logs and Source Protection
enabled; Git Fork Protection enabled; OIDC issuer mode team-scoped. These are access-control
measures and are **not** substitutes for backup or recovery.

**Verified — environment-variable inventory.** For `botanique-designers-site-gpm1` the
observed variable names and target environments are `VITE_SUPABASE_ANON_KEY`
(Production, Preview), `VITE_SUPABASE_URL` (Production, Preview) and `VITE_BACKEND_URL`
(Production). **No values were revealed and none are recorded here.** Names and targets are
verified; independent secure custody or recreation instructions for the values are **not
evidenced**, so loss of the Vercel account or project could block redeployment even where
source code survives.

**Verified — source code.** Source code and authority history are versioned in GitHub, and
production deployments trace to commit SHAs, so source reconstruction from Git is available.
This does **not** by itself recover Supabase data, Storage objects, environment-variable
values, DNS administration or hosted account access.

**Residual material gaps — absent or unverified.** Independent encrypted logical database
exports; off-platform database retention; independent Storage-object backups; encrypted
backup-key custody; any completed restore test; a complete disaster-recovery runbook; a named
secondary recovery authority; a formal founder-approved recovery point objective; a formal
founder-approved recovery time objective; and complete older Vercel Instant Rollback depth.
The acceptance expectations in Product Requirements §22 and the dependencies in Blueprint §16
remain **requirements**, not solved problems.

**BD-FIN-01B2 remains paused** pending review and merge of this authority correction. Every
settled BD-FIN-01B2 decision is preserved unchanged and is not reopened, reinterpreted or
weakened by this entry.

### 1 August 2026 — Account Security and Recovery Custody Authority (standalone)

**Authority decision: approved. Execution: not authorised.** The overall posture remains
**`PARTIALLY_VERIFIED_WITH_MATERIAL_GAPS`** and is not upgraded by this decision.

**Scope.** This is a narrow standalone authority decision arising from the material gaps
recorded in the backup and recovery posture verification entry above. It is **not** a stage of
the twelve-stage sequence recorded in the information-architecture authority, it creates **no**
new product stage, and it delivers no feature. It records custody decisions and gates only.

**Approved — interim sole platform authority.** For Botanique governance, Widson Omutelema
Ambaisi remains the sole current platform authority. This is accepted as the interim operating
model only. It does not resolve the verified absence of an independent human recovery authority
and does not make the recovery posture sufficient.

**Approved — sealed offline recovery custody.** Encrypted and sealed offline custody of platform
recovery codes, encryption-key recovery material and written succession instructions sufficient
to support platform-account recovery under an approved succession or emergency-access process.
It must not contain ordinary working passwords or shared day-to-day credentials.

**Recorded — no human secondary administrator exists.** There is currently no second human
administrator on either platform. This is recorded as a fact of the estate, is not softened, and
is not treated as discharged by any documentary control. **Sealed offline custody is recoverable
material and does not count as a human secondary authority.**

**Deferred — second authority mechanism.** A break-glass account, a limited administrator role,
or a named second human authority remains a **separate future founder decision**. It may not be
taken until platform permission models, cost, and Botanique–Apicora administrative separation
implications are verified. Nothing in this entry selects among those options or authorises any
of them.

**Approved requirement — multi-factor authentication.** MFA on the sole owner account is an
approved account-security requirement. It is **not** enabled by this entry, no factor is
selected, no account is modified, and no implementation is scheduled: it requires a separate
founder-approved execution gate. **The security and recovery posture of the account email must
itself be addressed before that email is relied upon as the recovery chain for downstream
platforms**, because an email account that can be taken over or lost silently transfers or
destroys control of every platform that recovers through it.

**Gates established.**

- **Not blocked.** Unrelated Operations Hub authority and design work continues, including Work
  Inbox and Notifications; People and payee identity; Daily Site Operations; Daily Labour
  Register; reports and derived summaries; and BD-FIN-01B2 authority work. The absence of a
  human secondary authority is not a reason to pause any of these.
- **Recovery may not be treated as fully verified.** The posture remains
  `PARTIALLY_VERIFIED_WITH_MATERIAL_GAPS`, and no document may upgrade it on the strength of
  this decision.
- **Documents & Evidence** remains blocked until an independent Storage backup is approved,
  implemented **and** restore-tested. Approval and implementation alone are insufficient.
- **Payments (BD-FIN-01C) and Reconciliation (BD-FIN-01D)** must not be activated for
  authoritative production use, or relied upon as Botanique's authoritative financial record,
  until independent database backup and restore testing are complete and founder-approved
  recovery point and recovery time objective decisions have been recorded.
- **Separate execution gate required.** Any MFA, account, email, member, permission,
  break-glass, plan or configuration change requires a separate founder-approved execution gate
  and must not be carried out under this authority.

**No execution authorised.** This entry changes no hosted system. No account, email, plan,
permission, member, backup, Storage object, deployment, DNS record or configuration is created,
altered or deleted by it. No code, migration or RLS policy is changed. No Apicora project is
inspected or altered. **BD-FIN-01B2 is neither reopened nor weakened**, and every settled
BD-FIN-01B2 decision stands unchanged.

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

**Historical Phase 1A closeout (superseded for current UI status by Phase 1B-A2 below):**
admin lead routes/components, lead list/detail/edit screens,
site-visits, operational calendar, dashboard queues, won-lead project creation, website
lead ingestion, UTM parsing, Google/Meta/WhatsApp/Calendar integrations, and any frontend
production deployment were not delivered by Phase 1A. At that historical closeout, the
seven-project production tracker was read-only and Phase 1B-A was next. Phase 1B-A2 has
since superseded that UI state by delivering the live Dashboard, Projects and role-scoped
project operations. The lead tables still have no visible UI. Current authority is in the
post-merge revision below and the revised Product Requirements/Blueprint.

### Phase 1B-A — Admin Shell + Essential Project Management (entry gate + 1B-A1)

Status: **Phase 1B-A entry-gate audit complete; Phase 1B-A1 (project integrity +
history) migration MERGED (PR #32, merge commit `24d84d0a72fef50e57088c5d35e2c05f191e008c`)
and APPLIED to hosted `botanique-admin` via the linked Supabase CLI, hosted-verified
(structure + rollback-only runtime matrix).** This subsection records the Phase 1B-A1
database slice; Phase 1B-A2 was subsequently implemented and is production-live.

- **Entry-gate audit (read-only): complete.** Confirmed the hosted `botanique-admin`
  schema/RLS **structurally matched the committed authority across columns, types,
  constraints, functions, triggers, indexes and RLS policies, with no material drift found**;
  that the production Project Tracker is read-only by **frontend choice, not by RLS** (owner
  and manager already hold `INSERT`/`UPDATE` on `projects`); that no role can hard-delete;
  and that the finance boundary is database-enforced. It also identified the gaps 1B-A1 now
  closes: missing schedule/blocker fields, no system change-history, and audit `created_by`
  using `coalesce(new.created_by, auth.uid())`.
- **Phase 1B-A1 migration (`20260726000200_operations_hub_phase_1b_a1_project_integrity.sql`,
  additive/forward-only):** (1) hardens the foundation audit triggers so a client-supplied
  `created_by` can never survive an authenticated insert (`created_by = auth.uid()`);
  (2) adds nullable `actual_start_date`, `target_completion_date`, `actual_completion_date`,
  `blocker` with date-order and blocker checks; (3) adds `can_assign_project_lead()` (caller
  role gated first, so staff/viewer/no-profile get false even for NULL; owner may assign
  active owner/manager/staff; manager may assign self or active staff only) — required in the
  **project INSERT `WITH CHECK`**, while lead-CHANGE authority on UPDATE is enforced by a
  **transition-scoped `BEFORE UPDATE OF lead_person_id` trigger** so retaining an unchanged
  lead never blocks unrelated operational edits; (4) revokes `EXECUTE` on the foundation RLS
  helpers from `public`/`anon`, granting `authenticated`; (5) adds the immutable,
  system-generated `public.project_activities` ledger (RLS SELECT only — authenticated
  application roles cannot write it directly; the normal path writes through the history
  trigger; trusted owner/service-role writes remain outside RLS and restricted) with a
  `cardinality(changed_fields) > 0` constraint, plus an `AFTER INSERT OR UPDATE` history
  trigger diffing operational fields only (never finance); (6) adds project/ledger indexes.
- **Recorded operating authority (documentation only, no implementation):** Widson =
  **Owner / final operational + financial approver** (approve/reject/amend/override/reverse,
  all recorded immutably with before/after). Martine = **portfolio-wide Operations Manager**
  (coordinates all active projects, mobilises staff/tools/materials, may execute delegated
  payments under approved commitments, submits exceptions to Widson) — his authority is not
  limited to the site he is physically at. Distinct roles: Owner/Approver · Portfolio
  Operations Manager · Accountable Project Lead (`projects.lead_person_id`) · Site Lead /
  Field Reporter · Project Crew. Routine operational updates (progress, next actions,
  blockers, deployment, notes, routine date/stage changes) do **not** all wait for owner
  approval; **material** decisions (activation, scope/commitment changes, completion,
  cancellation, archive, exceptional/retrospective payments) follow a future
  Pending → Approved/Rejected/Amendment-requested workflow.
- **Interim owner/material-decision boundary (in PR #32):** a database-enforced
  `tg_guard_project_material_authority()` `BEFORE INSERT OR UPDATE` trigger makes the
  owner-reserved project actions **effective before the Phase 1B-A2 UI**. It protects:
  material **status** transitions (manager limited to Ongoing↔Paused); **Completed/Archived
  stage** transitions in **both directions**; the **archived** flag (archive/restore);
  **`target_completion_date`** (after creation) and **`actual_completion_date`**; and
  **portfolio eligibility and publication permission** (`portfolio_eligible`,
  `portfolio_permission_status`). A manager may create only a Pending, non-archived project at
  a non-Completed/Archived stage with portfolio state Not Reviewed (a *proposed*
  target date is allowed), and otherwise edits routine operational fields; reserved
  transitions are rejected at the database, and unchanged protected values never block
  unrelated edits. This is **not** the approval workflow and stores no proposals; the formal
  proposal/approve/reject/amendment workflow remains unimplemented. The former
  **Phase 1B-A4** label is superseded by the named **Approvals foundation** workstream in
  the post-merge roadmap; a reviewed implementation may later replace this interim
  restriction only with equivalent or stronger authority.
- **Documented but NOT implemented in PR #32:** daily project-update schema/UI, the owner
  approval/amendment workflow, and delegated-payment + reconciliation (commitment / payment
  execution / evidence / reconciliation; Simple Invoice Manager stays the client-finance
  authority). No `daily_updates`, approval, payment, engagement or expense table is created
  here. Martine retains routine portfolio-wide operational authority (coordination,
  mobilisation, delegated payments under approved commitments, daily-update review).
  Phase 1B-A2 subsequently delivered the dashboard and project UI; the unimplemented
  domains now follow the post-merge roadmap below.
- **Runtime status:** re-validated after each correction against an isolated PostgreSQL 17
  instance with a synthetic Supabase `auth` shim — all audit-identity, NULL helper-contract,
  transition-scoped lead-change, field-constraint, ledger (incl. empty-`changed_fields`
  rejection), **interim owner/material-authority (manager INSERT + UPDATE transition
  matrix, owner unrestricted)**, boundary and non-destructive-apply tests passed applying
  `20260614000100` → `20260726000100` → `20260726000200` in order. **Now MERGED (PR #32) and
  APPLIED to hosted `botanique-admin` through the linked Supabase CLI (`db push --linked`,
  exact version `20260726000200` preserved — no repair, no raw-SQL apply, no seed); then
  re-verified directly against hosted with structural checks and a rollback-only runtime
  matrix, and no UI / dashboard / daily-update / approval / payment schema implemented.**
  Hosted migration history is exactly `20260614000100` → `20260726000100` → `20260726000200`;
  the four new project fields exist and are NULL on all seven existing projects;
  `project_activities` exists and is empty; every rollback-only test reverted, leaving
  profiles = 2 and projects = 7. No
  production project, profile, assignment or activity was created or changed. The Tsavo split,
  staff onboarding/assignment UI, and Supabase Realtime remain separately gated and deferred.
- **Hosted integrity checksums (dual-checksum authority, `'|'`-delimited
  `md5(string_agg(row::text, '|' ORDER BY id))`):** the **profiles** full-row checksum
  remained `95c144896661e2c827e881c2e5f12149`. For **projects** two distinct values are
  retained, because Phase 1B-A1 appended four nullable columns and the full-row `projects::text`
  representation therefore changed **structurally even though every existing value is
  unchanged**: (1) the **original 23-column project-data continuity checksum** — computed over
  exactly the pre-Phase-1B-A1 columns (`id, project_name, client_site_name, location, county,
  project_type, status, stage, lead_person_id, start_date, last_updated, next_action,
  next_action_date, portfolio_eligible, portfolio_permission_status, notes, archived,
  archived_at, archived_by, created_by, updated_by, created_at, updated_at`) — remained
  `705f124eda20d081c7c31b77743763cb`, proving **no pre-existing project value changed**; and
  (2) the **post-Phase-1B-A1 full-row structural baseline** (current complete row, including
  the four new NULL columns) is `459557531472faf27bc06a0a1a0cf736`, which becomes the baseline
  for future full-row integrity checks under the current schema. All four new project fields
  are NULL on all seven existing projects. The difference between the two project checksums is
  **expected schema evolution, not data mutation**; future integrity reports **must name the
  column set / schema version used** and must not compare full-row checksums across
  schema-changing migrations without normalising the projected columns.

### Phase 1B-A2 — Admin Shell, Essential Project CRUD & Initial Live Dashboard

Status: **MERGED and production-live — accepted 28 July 2026.** PR #34,
`BD-OPERATIONS-HUB-01: implement Phase 1B-A2 admin operations`, is closed and merged.
Final feature head:
`ac2694c0e7a3a09392e4871d14e6150d66f949a1`. Authoritative merge commit:
`1e5f66a75336ee86d7da046b0f43c0608ff3e534`. The old feature branch must not be reused.
No database migration or RLS change was part of Phase 1B-A2.

- **Baseline:** exact `main` `9666a2803c916eb5f5a188176806aaeb049dc9cd`.
  **Historical implementation branch:** `feat/bd-operations-hub-phase1b-a2`.
  **Merged PR #34:** `BD-OPERATIONS-HUB-01: implement Phase 1B-A2 admin operations`.
- **Implemented scope (UI only, on the existing Phase 1B-A1 schema):** a professional
  responsive admin **shell** (persistent desktop sidebar, keyboard-operable mobile drawer,
  top bar, authenticated profile + role badge — Owner / Operations Manager, URL-parameter
  project search; only working Dashboard + Projects destinations, no dead "future" links,
  no notifications icon); **essential project CRUD** via one shared create/edit form
  (`/admin/projects/new`, `/admin/projects/:id/edit`) with role-scoped fields, DB-matching
  validation, changed-fields-only PATCH, and blank→null normalisation; **owner material
  quick actions** (activate / mark completed / cancel / classify Design-only / archive /
  restore) each explicit + confirmed via an accessible dialog, sending only the changing
  field(s); **manager routine editing** only (forced-Pending intake create; Ongoing↔Paused;
  non-Completed/Archived stages; no material/portfolio/completion-date controls); an
  **initial live dashboard** (KPI cards total/active/pending/completed/overdue-actions/
  upcoming-starts + owner-only pending-activation; accessible native CSS bar charts by
  status/stage/type; empty states "No data yet"); a project **Overview**; and a **read-only
  Activity History** from the immutable `project_activities` ledger (readable field labels,
  before/after values, Yes/No booleans, "Not set" nulls, resolved profile names with safe
  role fallbacks — never a raw UUID or raw JSON). Refetch/invalidation runs after every
  successful mutation; failed saves preserve entered values and surface the database error.
- **Phase 1B-A2 correction pass:** implementation commit
  `32f61036cb192ff3a9dcb6cf7e8cd42bbcf5d162` repairs the existing draft without
  reopening its architecture. “Mark completed” now requires a non-empty actual-completion
  date, rejects dates before actual start, sends exactly `status` +
  `actual_completion_date`, leaves stage independent, and uses stable accessible dialog
  focus (date-first for completion, safe Cancel-first otherwise, focus trap, Escape,
  opener restoration, unique IDs). Successful POST/PATCH representations are mapped into
  local state before reconciliation; a failed post-write refresh preserves all usable
  project data and returns a saved-with-refresh-warning contract with a working retry
  control instead of clearing state or claiming unconditional success. Visible New/Edit
  controls now use the existing role capabilities; unsupported Staff/Viewer forms remain
  route-guarded, and the misleading Staff development preview is removed until its
  assignment-scoped read-only UI is authorised. Dashboard Active, overdue-actions and
  upcoming-starts drill-downs reuse the exact pure metric predicates through named URL
  views (with resettable state). Portfolio Overview is owner-only; manager create still
  explains the fixed non-eligible / Not Reviewed defaults, while manager edit exposes no
  portfolio state. Development founder labels now use **Widson Omutelema Ambaisi**.
  Deprecated `last_updated` changes are not returned for Activity History display.
- **Demo-adapter fidelity correction:** implementation commit
  `cc3276a148e8cec470a27700c8a06ebaeedc9865` makes demo PATCH reconstruction
  distinguish an omitted property from an explicitly supplied `null` or `false` across
  operational fields. Nullable text/date/lead values can now be cleared, boolean false is
  applied, and `notes` is explicitly reconstructed so note edits persist and unrelated
  updates preserve existing notes. The production Supabase create/update path is unchanged.
  Exact-commit Vercel deployment `dpl_AodSDKXY3jpkUMyXXYLt1igMpcpc` is **READY** at
  `botanique-designers-site-gpm1-lxwt5ouhe.vercel.app`.
- **Founder visual-direction and dashboard-composition repair:** implementation commit
  `23805cb81ce01e57b26e31220cde7f141d806496` replaces the rejected equal-weight
  dashboard with a meeting-ready operational composition while preserving the existing
  CRUD, role capabilities, exact metric/view predicates, mutation reconciliation and
  read-only ledger architecture. The founder completed visual review against the supplied
  local desktop and mobile screenshots and approved the final Phase 1B-A2 direction. The
  admin application uses native system UI typography and visible **Principal** /
  **Founder & Principal** terminology. The dashboard has a natural generated operational +
  attention summary; four primary indicators and a restrained Total / Completed /
  Design-only strip; a compact deterministic Projects needing attention state; accessible
  project-status doughnut and project-stage column visualisations; and a readable
  project-type summary. Cross-project Recent Activity is rendered as actor + project +
  readable changes with no UUID/raw JSON. The Projects table prioritises status, stage,
  expanded accountable lead and next action, target completion and the same deterministic
  attention labels. Project Overview is compact; Edit project remains visible; one
  contextually relevant material action is primary; exceptional owner decisions remain in
  the accessible More actions menu. The shared form has clearer Next steps and internal
  notes sections with sticky Save/Create and Cancel actions. Activity History is concise
  and expandable: collapsed operational rows use **Widson O. Ambaisi**, while expanded or
  formal identity remains **Widson Omutelema Ambaisi**; other names such as **Martine
  Lotom** are not abbreviated. Stored profile data is unchanged. The incomplete
  `FinancialReferencesPanel` and editor are removed from Phase 1B-A2, with no
  financial-reference POST/PATCH/provider mutation path. Simple Invoice Manager remains
  authoritative for financial documents. Future commercial and operational-finance
  modules, together with Team, Tasks, Approvals, Project Funds, Labour Engagements,
  Commercial Records, Expenditure, Documents and Reports, remain separately gated under
  `BD-OPERATIONS-HUB-01`. The admin shell exposes only
  Dashboard + Projects, integrates search, and retains accessible desktop/mobile
  navigation.
  Exact-commit Vercel deployment `dpl_AD9YgjBvLXuawDYFzSZgcHUSJ5rb` is **READY** at
  `botanique-designers-site-gpm1-pz95grbk1.vercel.app`.
- **Final dashboard-semantics correction:** implementation commit
  `6a09bc0b296b060ea67e07be9e4a1aaffed3153c` defines the operational-attention
  set as non-archived Pending, Ongoing or Paused projects only. Completed,
  Cancelled, Design-only and archived records now produce no attention reasons,
  cannot enter Projects needing attention, display `None` in the Projects table,
  and are excluded from operational attention-summary counts. Pending owner
  reasons still include Pending activation; manager reasons do not. The pure
  operational-summary API now receives capability context: owners retain Pending
  activation / Awaiting activation language and drill-down, while Operations
  Managers see ordinary Pending projects wording with no activation implication
  or activation mini-stat. No health score or percentage was introduced.
  Production Supabase mutation code is unchanged. Exact-commit Vercel deployment
  `dpl_GxfMhWDp6dwC3VNUSwgHw7Jva9qt` is **READY** at
  `botanique-designers-site-gpm1-hlbb50jxy.vercel.app`.
- **Senior KPI-rail and identity-presentation polish:** the four primary indicators now
  occupy one compact management metrics rail with a single subtle outer border, neutral
  internal dividers, no independent card outlines, ribbons, coloured edge strips, shadows
  or lift animation. Desktop uses four equal regions; mobile uses one semantic 2×2 surface.
  Zero values remain neutral; only a genuine non-zero attention value receives a restrained
  amber value/dot treatment. The existing Active, Pending activation/Pending projects,
  Overdue actions and Upcoming starts predicates and exact filtered destinations are
  unchanged, with visible keyboard focus retained. Total, Completed and Design-only remain
  a restrained typographic summary line below the rail. Authenticated founder presentation
  now resolves the shortened hosted profile **Widson Ambaisi** to **Widson O. Ambaisi** only
  when both the `owner` role and exact founder authentication email match. Formal contexts
  continue to resolve **Widson Omutelema Ambaisi**, **Martine Lotom** is unaffected, and no
  stored profile row was changed. Visual verification used the exact local implementation
  at 1440×900 and 390×844, including a metrics close crop and Principal/header identity
  crop. No dashboard logic, CRUD, capability, project-activity, Simple Invoice, navigation,
  Realtime, migration, RLS, package or production mutation behavior changed.
- **Architecture:** authentication stays in `AdminApp`; a focused `AdminDataProvider`
  (`src/admin/context/`) owns visible projects, role-visible profiles, loading/error, save
  feedback, refetch and create/update mutations; REST logic stays in `src/admin/lib/supabase.js`
  (added `fetchVisibleProfiles`, `fetchProjectActivities`, `createProject`, `updateProject`,
  all with `Prefer: return=representation` and error surfacing; never sending audit/finance
  columns or `last_updated`); pure helpers hold capability, payload/patch, KPI and
  activity-format logic. No Supabase Realtime.
- **Tests:** new Vitest + React Testing Library setup (test-infra devDependencies only).
  **135 tests pass across 15 test files**, including pure role/capability, create/patch
  payload (changed-fields-only, blank→null, no audit fields, manager forced-Pending,
  preserved inaccessible lead), completion integrity and dialog focus, returned-row local
  upsert before refetch, preserved state + warning/retry after reconciliation failure,
  genuine create/update failure contracts, duplicate-submit blocking, role-gated controls
  and routes, owner-only Portfolio Overview, exact KPI view predicates/links, resettable
  filters, empty-chart “No data yet”, and activity formatting (no UUID / no primary raw
  JSON / no deprecated `last_updated` display), plus demo-mode null clearing for optional
  text/date/lead fields, note persistence/preservation, boolean false handling, and proof
  that no Supabase mutation is called; generated/empty operational summaries, deterministic
  attention classification, exact metric/view continuity, Recent Activity empty/readable
  states, admin typography, owner/manager authority, no dead navigation, and no dominant
  finance explanation or finance-data leakage; plus closed/design-only/archived attention
  exclusion, owner/manager Pending wording, manager activation-language absence, corrected
  attention-summary counts and Projects-table predicate continuity. Activity History
  regressions prove compact collapsed founder naming, retained formal expanded identity,
  unchanged Martine Lotom presentation and absence of raw profile UUIDs. KPI-rail
  regressions prove the single shared group, ribbon-free regions, neutral zero state,
  restrained non-zero activation emphasis, exact four drill-down destinations, visible
  keyboard focus and the mobile 2×2 semantic structure. Authenticated-header coverage proves
  the shortened hosted founder profile resolves compactly while formal identity remains
  available. No test writes to hosted production records.
- **Lint / build:** every changed/new JS/JSX file is ESLint-clean. `npm run lint` reports
  **19 inherited errors in unchanged files only** (`server/index.js` Node-global `no-undef`,
  `src/components/FadeIn.jsx` `set-state-in-effect`, `src/context/AppContext.jsx`
  `react-refresh/only-export-components`) — none introduced by this slice. `npm run build`
  (clean `npm ci` install) succeeds and still prerenders the 43 public routes incl. `404.html`;
  admin routes remain client-only. The correction pass re-ran the same Vitest, ESLint,
  Vite-build and prerender entrypoints directly with the bundled Node runtime because this
  execution shell did not expose an `npm` launcher; results are now 135/135 tests across
  15 files, zero
  changed-file lint findings, the same 19 inherited full-lint findings, and a successful
  43-route + `404.html` prerender with no `dist/admin` directory and admin routes
  client-only. `git diff --check` is clean.
- **Preview and production verification:** the authenticated hosted-role matrix was
  verified through the
  automated tests + local dev-seed fixtures (owner vs Operations Manager shells, controls,
  pending activation, restricted manager create). Any Vercel preview verification against
  hosted Supabase is **read-only**; no create/edit/archive/activation is run against hosted
  records. The final semantics preview passed Vercel protection but reached the application
  Sign in screen, so the authenticated founder label was not observable and the hosted
  `profiles.full_name` value could not be determined; no credential was entered and no
  profile correction was attempted. The source fallback remains
  `profile?.full_name || profile?.email || "Authenticated admin"`. The founder later
  completed authenticated production verification and accepted the Phase 1B-A2 interface.
  Production now contains **nine** legitimate project records. **Alego Usonga** remains a
  real operational record. **Zizu Investments Ltd**, the Industrial Area exterior-corridor
  landscaping project, is the founder-reconciled ninth operational record (Pending /
  Awaiting Approval, unassigned when reconciled), not test, demo or seed data. No
  documentation or audit task may mutate either record or create additional test projects.
  This is the dated Phase 1B-A2 baseline; the governing baseline is now 12 rows: 10 genuine
  projects and two archived PR #44 verification fixtures.

### Post-merge authority revision — documentation only

Status: **Completed historical authority revision.** It began from merge commit
`1e5f66a75336ee86d7da046b0f43c0608ff3e534` and reconciled the then-current production
state. It did not reopen Phase 1B-A2 or make an application, migration, RLS, hosted-data or
public-site change.

Authority hierarchy:

1. `WORKSTREAMS.md` — implementation, merge and hosted-state register.
2. `BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md` — founder requirements, boundaries,
   roles and acceptance expectations.
3. `BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md` — domain architecture, systems of record,
   relationships and dependencies.
4. Migrations and application code — implemented technical truth.
5. Historical audits and handoffs — supporting evidence only.

No separate Operations Hub master workstream register is needed. The revision remains under
`BD-OPERATIONS-HUB-01`. Its then-governing sequence is retained below as historical context;
the approved BD-FIN-01 sequence later in this subsection now governs finance delivery:

1. Operations Hub authority revision.
2. Approvals foundation.
3. Daily Site Operations & Morning Compliance.
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

The Approvals foundation, Daily Site Operations & Morning Compliance and expanded project
material-change controls are now merged, hosted and ACTIVE_VERIFIED. Any future authority
replacement must preserve equivalent or stronger database enforcement.

The revised domain model keeps four financial domains separate:

- Client Commercial Records — Simple Invoice Manager remains authoritative.
- Project Funds & Reconciliation.
- Labour Engagements & Payments.
- Operational Expenditure.

**Approved product boundary — BD-FIN-01: Daily Site Financial Reconciliation, Labour
Payments and Site-Funds Control.** No internal-finance ledger exists yet. This
documentation cleanup authorises no table, UI, migration, RLS, function, hosted mutation or
deployment.

**BD-FIN-01A implementation status: ACTIVE_VERIFIED (2026-07-31).** PR #48 contains the
implementation introduced by commit `74a25babc411ef42a38dad882d14e00261aca32e`, based on
authoritative main `d5986af66bec550567408e99b61d170607daee75`. PR #48 was open, draft and
unmerged at the authenticated acceptance checkpoint described below; its final reviewed head
was `de824688977c15ac86785f53b01559dbd9fde3eb`, and it subsequently merged on 31 July 2026 at
merge commit `92055ed84a3db4eee6979b3eae54339792e1cd54` (parents: previous authoritative main
`d5986af66bec550567408e99b61d170607daee75` and the final reviewed head). Authoritative main is
now that merge commit. This status describes hosted and authenticated verification, not
merge state. The additive
migration `20260731000200_internal_cost_claims.sql` (hosted version `20260731160117`) has
been applied to hosted `botanique-admin` (`wcacyfyxjiysfibuuhgf`). Post-migration
verification confirmed: the three new tables, all named constraints, four indexes, RLS
enabled with exactly the three intended SELECT policies; `authenticated` holds SELECT-only
on the new tables (no INSERT/UPDATE/DELETE); execute is granted only on the nine intended
public RPCs, with every `private_*` helper and the event-immutability trigger function
revoked from `authenticated`; every `SECURITY DEFINER` function pins a fixed `search_path`.
Existing-data fingerprints (profiles, projects, project_assignments, activities, approvals,
intake, Daily Site entries/events, and every pre-existing RLS policy) are identical before
and after the migration. Principal and Operations Manager RPC/RLS authority was verified
through fully rolled-back hosted SQL transactions against real genuine projects; zero claims
persisted. `APPLIED_WITH_LIMITATION` was a historical checkpoint: manual authenticated
Principal and Operations Manager UI verification against the exact PR-head Vercel preview
subsequently passed — Site Costs navigation, the empty-queue zero-state, the project
selector (genuine eligible Ongoing projects only, archived PR #44 fixtures absent), the
Principal direct-authorisation form, the Operations Manager claim form (no Principal
controls, no company-wide totals), and the Daily Site "Create cost claim" copy-to-draft flow
(planning context correctly copied, snapshot immutability noted, no claim created merely by
opening the form) all rendered correctly with no console errors or warnings, on both
desktop and mobile. The signed-out `/admin` gate was reconfirmed after each session. No
claim was submitted during verification. Staff/Viewer authenticated UI verification remains
unavailable because no such accounts exist; their denial is covered by the PostgreSQL and
capability-utility test matrices instead. Simple Invoice Manager and Apicora are unchanged.

The approved first implementation slice is **BD-FIN-01A — Internal Cost Claims and
Principal Decision**. It establishes an authoritative internal cost obligation and decision
history before money movement. It includes project-scoped claims; one recipient or crew per
claim; one category and structured line items; optional explicit Daily Site copy-to-draft;
manager submission; Principal amendment request, whole-claim approval or rejection;
withdrawal and controlled cancellation; Principal direct authority recorded distinctly
(for example, `principal_authorised`, never self-approval); immutable events; and strict
assigned/led-project manager visibility.

The compact lifecycle is draft, awaiting review, amendment requested, approved, rejected,
withdrawn and cancelled. Submission/resubmission are immutable events leading to awaiting
review. Planned, claimed, submitted, approved, released, paid and reconciled remain distinct;
funding, payment and reconciliation progress are deferred derived states.

Daily Site remains the operational planning source. The draft implementation's explicit **Create cost claim**
action may copy project, date, source version and planning context into a separate editable
draft. No estimate automatically becomes a liability or actual spend; later Daily Site
changes cannot rewrite submitted/approved claims; finance cannot rewrite Daily Site history;
and one Daily Site entry may support multiple claims.

The two archived PR #44 fixtures and all archived/ineligible projects must be excluded by
future finance selectors, RLS and controlled mutations. Finance must enforce independent
strict manager project scope; application filtering is not a database security boundary,
and broader manager-read policies observed in existing non-finance domains must not be
copied automatically.

Excluded from BD-FIN-01A: fund requests/releases, accountable advances, payments,
allocations, reconciliation, returns/carry-forward, reimbursements, evidence uploads,
worker master records, spend reporting, client-commercial records and Simple Invoice
Manager integration. Simple Invoice Manager remains the client-commercial system of record;
`project_financial_references` remains only a narrow legacy reference facility.

**BD-FIN-01B1 implementation status: ACTIVE_VERIFIED.** PR #51 contains the implementation
whose final reviewed head was `c310b4c762cd666465a2a7813f38c3642d0cbd16`, based on
authoritative main `49e02c4a7022ab112798b809c957a5794eb5c6f0`. PR #51 was open, draft and
unmerged at the authenticated acceptance checkpoint described below; it subsequently merged
at merge commit `fe481410fdaab37e93c811e3744637de82fab370` (parents: previous authoritative
main `49e02c4a7022ab112798b809c957a5794eb5c6f0` first and the final reviewed head second) at
21:02:21 UTC on 31 July 2026, which is 00:02 EAT on 1 August 2026. Authoritative main is now
that merge commit, and the production deployment at that commit succeeded. This status
describes hosted and authenticated verification, not merge state.
The `20260731000300_claim_backed_fund_requests` migration is
applied to the hosted `botanique-admin` project (ref `wcacyfyxjiysfibuuhgf`) and adds
exactly three tables — `fund_requests`, `fund_request_allocations` and
`fund_request_events` — plus one sequence, three SELECT-only RLS policies and eight
authenticated RPCs. Production carries **zero** fund request, allocation and event rows;
the hosted authority and concurrency matrix was executed only inside fully rolled-back
transactions, and pre-existing profile, project, claim and Daily Site fingerprints are
unchanged. The verified post-merge hosted state is `fund_requests` = 0,
`fund_request_allocations` = 0, `fund_request_events` = 0 and `internal_cost_claims` = 0.

Implemented role model: the Operations Manager creates, edits, submits, amends, resubmits
and withdraws their own request in an authorised, eligible project; the Principal reads
company-wide, approves, rejects, requests amendment, records distinct direct authority and
cancels an approved request before any release. Staff and Viewer have no navigation, no
route, no SELECT policy and no mutation authority.

Implemented status and reservation model: durable statuses are `draft`, `submitted`,
`amendment_requested`, `approved`, `rejected`, `withdrawn` and `cancelled`. **`resubmitted`
is deliberately not a durable status** — resubmission is an immutable event that moves an
amendment-requested request back to `submitted` and increments an explicit
`submission_round` (0 before first submission, 1 on first submission). This refines, and
supersedes, the earlier documentation authority's provisional state list. `submitted`,
`amendment_requested` and `approved` reserve approved claim value; `draft`, `rejected`,
`withdrawn` and `cancelled` do not, so draft availability is advisory and is labelled as
such in the interface.

No-over-request enforcement is implemented in one shared reservation writer and one shared
verifier, both of which lock the referenced approved claims in a deterministic ascending
claim-id order before any availability is calculated. A losing request rolls back
completely, keeps its prior status and appends no event. A narrow guard on
`internal_cost_claims` prevents an approved claim from being cancelled or reduced below
what a reserving fund request holds against it. Principal direct authority is one atomic
RPC producing one approved request and a single `principal_direct_authorised` event, never
a simulated manager request or a fabricated submit-and-approve cycle.

Founder-authenticated interface verification passed against the exact PR-head preview for
both the Principal and the Operations Manager: navigation, the fund request queue,
role-specific controls, the Principal direct-authority form being structurally distinct
from Manager submission, the advisory-draft-availability warning, exactly the three
eligible authorised projects, both intended-custody options, the intended Operations
Manager custodian field, approval-not-release wording throughout, the Principal mobile
queue, and a clean Principal console with no errors or warnings. No screenshots,
credentials, session identifiers or private browser information are recorded here.

Verification limitations at that checkpoint:

- Zero-data browser limitation: production carries zero approved claims and zero fund
  requests, so allocation, request detail, approval, amendment, resubmission, withdrawal
  and cancellation could not be exercised in the browser. Those paths are covered instead
  by the fully rolled-back hosted authority and concurrency matrix, the automated UI tests
  and the role-capability tests. No production finance record was created for verification.
- Operations Manager authenticated mobile rendering and Network-tab evidence were not
  separately captured.
- Inherited limitation carried forward from BD-FIN-01A: authenticated Staff and Viewer
  interface verification depends on genuine accounts that do not currently exist, so those
  roles are verified through database and capability tests rather than through the browser.
- Inherited runner warning: `scripts/test-approvals-db.sh` and
  `scripts/test-material-approvals-db.sh` lack the `export LC_ALL` line carried by the other
  database runners and require `LC_ALL=C` at invocation on the verification machine. This is
  pre-existing and was deliberately not changed by BD-FIN-01B1.

**BD-FIN-01B — Project Fund Control Authority.** This
is the next approved finance authority after BD-FIN-01A ACTIVE_VERIFIED. It defines how
Botanique requests and approves Principal authority to make money available against
approved internal cost claims, before any actual release, transfer, payment or
reconciliation. A fund-request approval means the Principal authorises Botanique to make
up to the approved amount available for the identified project claims; it does not mean
funds were transferred, cash was handed over, Martine received an advance, a worker or
supplier was paid, a payment was allocated, or an expense was reconciled.

The first implementation slice is **BD-FIN-01B1 — Claim-Backed Fund Requests**. Ordinary
fund requests must be backed by one or more already-approved internal cost claims, all
from the same project as the request; general project advances before claims exist are
deferred and require separate authority. A request may link multiple claims from one
project (for example casual labour, mason work and mkokoteni service on one Alego
request) while each linked claim retains its own requested allocation; Lugulu claims may
never be included in an Alego request, and no request, balance or allocation may mix
projects. A claim may be partly requested: implementation must distinguish the approved
claim amount, the amount already reserved by other active requests, the amount in the
current request, and the approved amount still available for request, and the cumulative
amount reserved against a claim by relevant active or approved requests must never exceed
the approved claim amount. Rejected, withdrawn or validly cancelled requests stop
reserving the claim. A request may record an intended custody model — Operations Manager
accountable advance or direct recipient funding — but this is only the intended custody or
recipient model, not evidence that money was released.

Operations Manager authority: create a draft claim-backed fund request against approved
claims from one project, allocate requested amounts, submit, amend after an amendment
request, resubmit, withdraw before release, and view authorised project requests. The
manager may not approve his own request, over-request a claim, mix projects, mark funds
released, approve his own receipt, or perform final reconciliation.

Principal authority: view all fund requests, approve, reject, request amendment, create a
distinct Principal direct-authority fund request, cancel an approved request before any
later release exists, and (in later slices) authorise releases and approve final
reconciliation. Principal direct authority is recorded as a separate, distinct action and
immutable event, never a self-request/self-approval sequence. Staff and Viewer retain no
fund-request mutation authority; visibility follows the existing capability and
project-access model rather than being assumed.

The manager-requested lifecycle is `draft`, `submitted`, `amendment_requested`,
`resubmitted`, `approved`, `rejected`, `withdrawn`, `cancelled`, with valid transitions
`draft → submitted`; `submitted → approved`; `submitted → rejected`;
`submitted → amendment_requested`; `amendment_requested → resubmitted`;
`draft`/`submitted`/`amendment_requested → withdrawn` (subject to exact authority rules);
and `approved → cancelled` only through controlled Principal authority and only before any
future release exists. The Principal direct-authority path is a separate, distinct
lifecycle, never modelled as a self-request followed by self-approval. Events remain
immutable and corrections non-destructive.

Likely product-level entities (no migration authorised by this documentation): a **fund
request** (identifier, project, authority type, requester or Principal actor, intended
custody model, intended recipient/custodian, purpose/note, total requested amount, status,
version, created/submitted/decided/cancelled timestamps); **fund request allocations**
(fund request, approved internal cost claim, amount requested against that claim); and
**immutable events** for at least draft creation, allocation addition/amendment,
submission, amendment request, resubmission, approval, rejection, withdrawal,
cancellation and Principal direct authority. The future database must guarantee same-
project request/claim pairing, an approved linked claim, positive allocation amounts,
allocation totals equal to the request total, and no over-reservation against a claim's
approved amount.

Fund requests reference approved internal cost claims but never replace or mutate claim
authority; Daily Site remains operational planning authority and no Daily Site amount
automatically becomes a request, release, payment or expenditure; Simple Invoice Manager
remains untouched and authoritative for client-commercial records.

Excluded from BD-FIN-01B1: actual fund releases; M-Pesa, bank or cash transaction records;
transaction references; acknowledgements of receipt; direct payments; onward payments by
Martine; payment-to-claim allocations; supplier settlement; worker payment status;
proof-of-payment uploads; reconciliation; unspent balances; returns; same-project
carry-forward; disputes; failed-transfer corrections; reversals; general unbacked
operational advances; dashboards; profitability reporting; Simple Invoice Manager
integration; new worker-privacy or identity storage; and automatic Daily Site funding.
This documentation authorises no table, migration, RLS, function, hosted mutation, UI or
deployment.

Approved sequence, with an independent authority and deployment gate for every
implementation stage:

1. This documentation authority cleanup.
2. BD-FIN-01A claims vertical slice: schema, strict grants/RLS, controlled functions,
   immutable events, database tests, minimal Manager/Principal UI and explicit Daily Site
   copy action.
3. This BD-FIN-01B documentation authority: establishing Project Fund Control Authority
   and its first implementation slice, BD-FIN-01B1 — Claim-Backed Fund Requests.
4. BD-FIN-01B1 — Claim-backed fund requests: schema, strict grants/RLS, controlled
   functions, immutable events, partial-request and no-over-request enforcement, and
   minimal Manager/Principal UI.
5. BD-FIN-01B2 — Fund releases and accountable advances.
6. BD-FIN-01C — Payments and claim allocations.
7. BD-FIN-01D — Reconciliation, returns, disputes, reversals and approved same-project
   carry-forward.
8. Documents/evidence and any authorised worker-privacy model.
9. Derived project and management reporting.
10. Separately authorised Simple Invoice Manager read-only reporting contract, if
    approved.

Do not collapse the BD-FIN-01B1, BD-FIN-01B2, BD-FIN-01C and BD-FIN-01D slices; each
remains independently gated and separately authorised before implementation.

The existing `project_financial_references` table does not satisfy these four domains.
`project_activities` remains an immutable audit ledger and is not a chat system; a separate
future Project Updates & Discussion domain provides auditable asynchronous communication.
Future navigation appears progressively only when its module is functional and authorised.

Dependencies: Approvals precedes funds, labour and exceptional expenditure; existing
projects/profiles/RLS remain the identity and delivery spine; evidence/document policy is
required for reconciliations, payments and project updates; fund/labour/expenditure
semantics must stabilise before management reporting; and full Team & Resourcing requires a
deliberate external-worker identity model.

Explicit exclusions: no code, UI, route, navigation, migration, RLS, function, trigger,
hosted Supabase, project-data, Simple Invoice Manager integration, financial
implementation, Approvals implementation, Realtime, public-site or Apicora change.

### Approvals foundation — first project-linked implementation slice

Status: **Merged under PR
[#36](https://github.com/Widson-star/botanique-designers-site/pull/36) at
`6f500b424d020b41ef192a77fbaff57c201d7f99`; migration applied and structurally /
integrity-verified on hosted `botanique-admin`. The production React `#418` hydration
console error identified during authenticated owner/manager UI verification has since been
repaired and merged under PR
[#38](https://github.com/Widson-star/botanique-designers-site/pull/38) — see the
hydration and session-restoration repair subsection below. Final classification:
`APPLIED_WITH_LIMITATION`, with the remaining limitation now narrowed to **manager
authenticated production verification (post-merge)**. Owner authenticated verification
passed on the exact-head PR #38 preview — the byte-identical admin bundle now deployed to
production — with a clean console and no `#418`; signed-out `/admin` is independently
verified on production desktop and mobile. Manager authentication, Dashboard, nine-project
load and empty Approvals queue passed on production, and the sole outstanding item is
manager authenticated verification against the exact-head/post-merge production admin UI,
which the founder has explicitly accepted as a residual limitation for merge.**
Reviewed implementation head:
`31707e29ea4c3a1b59bcf3e182cd0293c1fa59a3`; merged migration Git blob:
`9fb9a5d989acdf498081e31ebc0cc72e1152d5f4`.

- **Migration:** additive, forward-only
  `supabase/migrations/20260728000100_operations_hub_approvals_foundation.sql`.
  It creates `approval_requests` and immutable, system-written `approval_events`;
  constrains the domain to `project`; constrains the first-slice types to activation,
  target-completion change, completion, cancellation, archive and restoration; enforces
  submitted/awaiting-review/amendment/approved/rejected/withdrawn lifecycle semantics;
  prevents duplicate active requests per project/type; and exposes only narrow
  SECURITY DEFINER submission, withdrawal, amendment/resubmission and owner-decision
  functions. No dynamic SQL or client-controlled identifiers are used.
- **Authority and atomicity:** owner and manager may submit; only the original requester
  may withdraw or amend/resubmit; only an active owner may request amendment, approve or
  reject. Approval locks and revalidates the request and project, rejects stale original
  values, applies the exact reviewed project mutation in the same transaction and lets
  the existing `projects_history` trigger append the actual project change. Rejection and
  amendment do not mutate the project. Terminal decisions remain immutable.
- **RLS:** owner reads all requests/events; manager reads project-linked requests/events
  consistent with current portfolio-wide project authority; staff, viewer, inactive and
  anonymous callers receive no access. Neither table has authenticated direct
  INSERT/UPDATE/DELETE policy. `approval_events` is not application-writable.
- **Guard continuity:** `tg_guard_project_material_authority()`,
  `projects_material_authority`, `tg_guard_project_lead()` and
  `projects_lead_guard` remain present and unchanged. Managers still cannot directly
  activate, complete, cancel, archive, restore, change target/actual completion, set or
  reverse Completed/Archived stage, or alter portfolio authority. Ongoing↔Paused remains
  permitted.
- **Admin implementation:** focused approvals REST/data context, owner/manager
  `/admin/approvals` queue, `/admin/approvals/:approvalId` detail, readable before/proposed
  values and immutable timeline, owner decision/amendment controls, requester withdrawal
  and amendment/resubmission, and manager project-linked request actions. Navigation is
  present only because the module is functional; staff/viewer capability is denied. No
  raw JSON/UUID display and no Realtime dependency.
- **Local validation:** the three earlier migrations plus the approvals migration pass
  from a clean disposable PostgreSQL 17 baseline. The transactional database matrix
  covers role submission, strict payloads, duplicates, decisions, stale/atomic failure,
  withdrawal, amendment rounds/events, RLS and direct-guard regression. Frontend:
  **152/152 tests across 19 files pass**; every changed/new JS/JSX file is ESLint-clean.
  The repository-wide lint baseline remains **19 inherited errors in unchanged files**
  (`server/index.js`, `src/components/PaidConsultancyModal.jsx`,
  `src/context/AppContext.jsx`) and none is introduced by this slice. Vite production
  build and 43-route + `404.html` prerender pass; `git diff --check` passes. Read-only
  local demo-browser verification passed at **1440×900** and **390×844** for manager
  project request actions, accessible request dialog, submitted/pending state, approvals
  queue, responsive three-column mobile queue, keyboard-operable mobile navigation, zero
  document-level horizontal overflow and zero browser console errors.
- **Explicit exclusions:** no Design-only, portfolio permission, arbitrary scope or
  lead-change approvals; no staff-originated requests; no Project Funds, Labour
  Engagements, Operational Expenditure, updates, tasks, documents, evidence,
  notifications, Realtime, Simple Invoice Manager, public-site or Apicora change.
- **Hosted application and structural verification (28 July 2026):** the founder
  reconciled the former eight-project assumption to the authoritative **nine-project**
  production baseline. The ninth record is **Zizu Investments Ltd**, created by an active
  owner at `2026-07-28 09:16:25 UTC`, Pending / Awaiting Approval, unassigned,
  non-archived and non-duplicate; its normal owner-authored `created` ledger event confirms
  application provenance rather than test/demo/migration provenance. `origin/main`
  remained `6f500b424d020b41ef192a77fbaff57c201d7f99`; the linked CLI showed only
  `20260728000100` pending, with no partial approval objects, and applied it once using
  `supabase db push --linked`. Hosted history is now exactly `20260614000100` →
  `20260726000100` → `20260726000200` → `20260728000100`.
- **Hosted schema, RLS and grants:** both approval tables have the reviewed columns,
  foreign keys, lifecycle/payload checks and indexes; the active-request partial unique
  index is present; `queued_for_review` is accepted and `review_started` is absent. RLS is
  enabled with the single authenticated owner/manager SELECT policy on each table and no
  INSERT/UPDATE/DELETE policy or table privilege. All five workflow RPCs are
  `SECURITY DEFINER`, use `search_path=public`, are executable by `authenticated` only,
  and retain internal active-role checks; all five private helpers are non-executable by
  public, anon and authenticated. `projects_material_authority`,
  `projects_lead_guard` and `projects_history` remain installed and enabled.
- **Hosted integrity proof:** the before/after counts are identical: profiles `2`,
  projects `9`, assignments `0`, project activities `2`, financial references `0`;
  approvals requests/events remain `0/0`. SHA-256 fingerprints are unchanged:
  profiles `fa27cddea431760d259d7120367e543d4ba3d86358bc67431b08d513bb223dcd`;
  projects `786cd99d4930662c42f1b609cc46ff447816ad02ca8533d74074f2f81144330b`;
  project identity set `26b089768a8520fdfb582267eab15c5754f9514a88fb33edc9dbd22c8cd37180`;
  assignments `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`;
  activities `cff71361c400b2c612d161f0787f477384c54de144f7eb5bef87736bae36f595`;
  financial references
  `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.
  The legacy profiles MD5 remains `95c144896661e2c827e881c2e5f12149`.
  Therefore all nine projects, including Zizu Investments Ltd and Alego Usonga, are
  unchanged; no profile, assignment, project activity or financial reference changed.
- **Role/deployment verification and limitation (pre-PR #38 snapshot — HISTORICAL,
  superseded by the hydration and session-restoration repair subsection below):** at the
  time of hosted application, read-only hosted RLS execution under the existing active
  owner and manager identities returned one profile, all nine projects and an empty
  approvals queue for each. Authenticated has SELECT but no direct INSERT/UPDATE/DELETE
  table privileges; anon has none. The then-current Vercel production deployment
  `dpl_BHqpRn1Ujss6nqN6GWGQ2kPqRXWv` was READY at the pre-repair main
  `6f500b424d020b41ef192a77fbaff57c201d7f99`. Signed-out `/admin` rendered at 1440×900 and
  390×844 with visible email/password controls and no horizontal overflow. At that point
  authenticated owner/manager UI checks could not be completed because no reusable browser
  session was available, and each production load logged minified React error `#418` — the
  route-aware hydration defect that PR #38 has since repaired (see below), so this `#418`
  and the "operational use paused" state below no longer describe current production. No
  failed approvals request was observed. Staff/viewer runtime verification remains deferred
  because no existing safe account/session was available; their policy/grant boundary is
  structurally verified. No production request/project mutation was attempted.

### Hydration and session-restoration repair (PR #38, 28 July 2026)

The production React `#418` console error recorded above was diagnosed and repaired under a
frontend-only fix, merged after founder review.

- **PR #38 exact reviewed head:** `32df47a6f64540a7d3996c26a903b0e7835bf3df`.
- **Merge method and merge commit:** merge commit (no squash, no rebase, no auto-merge),
  guarded against the exact reviewed head —
  `f95e31f55c0d74844b79aaca3ac831ed3bb1208a`.
- **Resulting authoritative main:** `f95e31f55c0d74844b79aaca3ac831ed3bb1208a`
  (parents `6f500b424d020b41ef192a77fbaff57c201d7f99` + `32df47a6…`).
- **Root cause:** Vercel rewrites `/admin` and `/admin/:path*` to `/`, whose response
  contains the prerendered homepage tree, while `BrowserRouter` sees the original admin
  pathname and immediately renders `AdminApp`. React therefore attempted to hydrate the
  admin tree over public homepage markup, logging minified React error `#418`. A second
  latent mismatch existed in the stored-session lazy initializer.
- **Repaired route-aware mounting:** public routes continue to hydrate their matching
  prerendered HTML; admin routes discard the rewritten homepage shell and mount with
  `createRoot` (no hydration step, so `#418` cannot occur on admin routes). `AdminApp` now
  renders a deterministic signed-out first paint, then restores any stored session after
  that first render and validates the active profile; malformed, structurally invalid or
  expired stored sessions are cleared safely. No hydration error is suppressed. The change
  is frontend-only: no migration, schema, RLS, function, trigger, hosted-data, role
  authority or Apicora change; the approvals foundation and its guards are untouched.
- **Validation:** 171/171 frontend tests across 22 files; changed-file ESLint clean; Vite
  production build with 43-route + `404.html` prerender; `/admin` deliberately absent from
  the prerender inventory.
- **Owner authenticated preview result (exact head):** PASSED on the PR #38 preview —
  owner authenticated, profile rendered as Principal (Widson O. Ambaisi), Dashboard loaded,
  nine-project portfolio loaded, Approvals loaded with an empty queue, sign-out returned to
  the login screen and re-authentication succeeded. DevTools Console was clean after
  authenticated use — no errors, no warnings, no React `#418`.
- **Owner authenticated production result:** the exact-head preview bundle is byte-identical
  to the admin bundle deployed to production by this merge; a separate post-merge production
  owner login was not re-run in this task. Signed-out `/admin` is independently verified on
  production at 1440×900 and 375×812 — login screen renders, no console output, no `#418`,
  no horizontal overflow.
- **Manager production result:** PASSED on production — manager authentication works, the
  manager role is recognised (Operations Manager), Dashboard and the nine projects load,
  Approvals loads with an empty queue, and owner decision controls are not visible.
- **Manager exact-head preview limitation:** manager authenticated verification on the
  exact-head PR #38 preview was not completed, because Vercel deployment protection required
  separate access approval. Full manager exact-head/post-merge production verification is
  therefore not claimed and is the sole outstanding runtime check.
- **Founder decision:** the founder explicitly reviewed this single residual manager
  limitation and accepted it as sufficient to merge the hydration repair, rather than
  continuing to block the fix.
- **Production deployment identity:** the Vercel production deployment for the merge commit
  reports success (deployment `AKjo7RYjUknwXmUrhTtBs8x85KZm`).
- **Hosted integrity:** no production request or project mutation was attempted or made in
  this task; `approval_requests` and `approval_events` remain `0/0`; all nine production
  projects (including Zizu Investments Ltd and Alego Usonga) remain unchanged. Simple
  Invoice Manager was not touched; no financial-domain implementation was started; no
  Apicora work occurred.

### Daily Site Operations & Morning Compliance — live in production; ACTIVE_VERIFIED

Status: **ACTIVE_VERIFIED** (2026-07-29). Previously `APPLIED_WITH_LIMITATION`; all four
recorded limitations are now closed — the responsive-list repair + corporate-language polish +
single owner-only Portfolio control shipped in PR #43, and the founder completed authenticated
owner and manager verification on the exact PR #43 Vercel preview (owner PASSED; manager
PASSED, selector confirmed to include Alego and Karen). See "All four remaining limitations are
now CLOSED" below. PR #44 subsequently closed the separate manager-material-change
governance gap and established expanded Approvals as ACTIVE_VERIFIED. Phase 1 is
merged, its additive migration is live on hosted `botanique-admin`, the production frontend is
active, and **authenticated production use has now occurred**. PR #41 merged at authoritative `main`
`dfb79373397637694fa26d730c110da58f20acae` (merge commit; parents
`c48a004515234c66b18ac5a062f4bc4da708b929` + reviewed head `d1531e2`). The hosted migration
`20260728000200_operations_hub_daily_site_operations.sql` was applied successfully (recorded
version `20260729064007_operations_hub_daily_site_operations`); schema, RLS, functions and
grants were verified read-only; the production Vercel deployment succeeded; and the signed-out
`/admin` login is clean on desktop and 390×844 mobile. The Operations Manager (Martine Lotom)
is authorised for **both** current in-scope Ongoing sites — **Alego Usonga** and **Karen
Residence — Fountain Garden & Mature Borders** — via `lead_person_id`. This domain remains
under `BD-OPERATIONS-HUB-01` — not a new top-level workstream and no new master register. The
Daily Site remains ACTIVE_VERIFIED and is not reopened by this authority cleanup.

**First legitimate production Daily Site Entry (verified read-only, 2026-07-29).** Martine
Lotom created and submitted the first real operational record — **not a test fixture**:
- entry `51af0a4c-611f-4497-9e33-15088fba7df8`, project **Alego Usonga**, work date
  **2026-07-29**, disposition **working**, state **submitted**, version **1**;
- created_by and submitted_by **Martine Lotom**; submitted_at **07:09:15 UTC = 10:09 EAT**;
  **is_late = true** (database-derived; after 08:30 EAT), event note "Submitted after 08:30
  EAT (late).";
- expected workforce **6**, rate **KES 500** per worker, agreed total none, **planned labour
  cost KES 3,000** (DB-derived 6 × 500); planned work "1. Site grading and levelling / 2.
  Planting grass"; funds available **KES 0**; additional requested **KES 0**; evidence status
  **provided**; notes "Work ongoing well"; not yet reviewed (reviewed_by null).
- **Lifecycle events (2):** `created` (→ draft) at 10:09:14 EAT, then `submitted`
  (draft → submitted) at 10:09:15 EAT — both actor Martine Lotom.

**What this confirms in production.** Authenticated **manager submission** succeeded;
authenticated **owner review visibility** succeeded (owner sees the submitted Alego entry with
Return / Accept / Void controls); **lifecycle event creation** succeeded (immutable
created + submitted events); the **late calculation** succeeded (is_late true, stamped note);
**project-authority scoping** operated successfully (Martine acted only on his lead project;
the manager view shows no owner review controls). The **morning-compliance summary** reads,
for the owner on 2026-07-29: **Due today 2, Missing 1 (Karen Residence), Late 1 (Alego),
Waived 0**. **No waiver exists** (`daily_site_compliance_waivers` = 0). Daily Site submission
**did not create an approval request or event** (`approval_requests` = 0, `approval_events`
= 0). The **Daily Attendance Evidence** authority (§4.5.11a) is defined but **not
implemented**. Current hosted counts: `daily_site_entries` = **1**, `daily_site_entry_events`
= **2**, `daily_site_compliance_waivers` = **0**; `projects` = **9**; `project_assignments`
= 0; `approval_requests` = 0; `approval_events` = 0. No hosted row was mutated by this
reconciliation (read-only).

**All four remaining limitations are now CLOSED (authenticated exact-preview verification,
2026-07-29).** The founder ran the checks personally on the exact PR #43 Vercel preview
(`botanique-designers-sit-git-d70901-…vercel.app`), because the assisting environment cannot
authenticate there; the results below are the founder's recorded verification.
1. **Responsive Daily Site Operations list defect — FIXED and verified.** Root cause: the
   desktop `table-fixed` widths summed to 100 % (`38+32+30`), starving the un-widthed Date
   column to 0 % so the work date wrapped vertically. Repaired to an auto-layout six-column
   table (**Project · Work date · Site plan · Planned workforce · Status · Action**, date on
   one line, site-plan clamped) with stacked mobile cards below `md`. Verified on the exact
   preview (owner): six clear columns, no Date/Site-plan overlap, one-line dates.
2. **Clean owner Console evidence — MET.** Owner preview PASSED: the repaired list, corporate
   labels, the single Portfolio publication control (old checkbox absent, five options, helper
   text), and Projects/Approvals all load and render correctly; no form saved.
3. **Clean manager Console evidence — MET.** Manager preview PASSED: entry detail readable,
   corporate labels present, no Return/Accept/Void, no supersession control, Portfolio not
   editable, Projects/Approvals load; nothing submitted, no form saved.
4. **Manager selector includes both projects — CONFIRMED.** Authenticated as Martine, the New
   site entry selector lists **Alego Usonga** and **Karen Residence — Fountain Garden & Mature
   Borders** (plus the also-Martine-led **Mununga Corridor**); no unrelated project appears.

**Confirmed production layout defect — `/admin/daily-site-operations` list.** The desktop
table row has overlapping content (Date/Plan headings overlap; work date wraps to multiple
lines; "Working today" overlaps/crowds the date). Recommended future repair (separate narrow
code PR, not in this documentation PR): give the desktop row the columns **Project · Work date
· Site plan · Planned workforce · Status · Action**; and on responsive/mobile transform each
record into a **stacked card** (no compressed multi-column table), prevent horizontal
overflow, keep the date on one readable line, and preserve the plain-language status and
workforce summary.

**UI-language follow-up (later; not implemented here).** A future narrow UI-language pass may
soften the Daily Site Entry field labels to plainer operational wording:
Disposition → **Site activity status**; Workers expected → **Planned workforce**; Planned
labour cost → **Estimated labour cost**; Planned work → **Planned site activities**; Crew
reference → **Crew or team reference**; Funds available (planning) → **Site funds currently
available**; Additional requested (planning) → **Additional site funds required**; Evidence
status → **Supporting evidence**. This is presentation wording only — no schema/enum change.
It must not be mixed into a documentation PR; it may be combined with the Project-form
corporate-language polish only if that implementation PR stays narrow and reviewable.

> **Historical (superseded by the hosted rollout above).** The Phase 1 note below was written
> while the work was local-only on branch `feat/bd-daily-site-operations-phase-1` before the
> migration was applied to hosted Supabase. It is retained as development evidence; where it
> says "implemented locally", "not applied to hosted" or "not enabled in production", that
> status is now **superseded** — the migration is applied, the module is merged, and it is in
> authenticated production use (see the `APPLIED_WITH_LIMITATION` status above).

**Responsive-list repair + corporate-language polish — PR #43, authenticated-preview verified,
merged.** A narrow frontend-only PR on branch `fix/bd-daily-site-list-and-language-polish`
(baseline main `9355b5869773502d33860296f0d9ff7150f2e476`) addresses limitation #1 and the
UI-language follow-up above. It carried **no migration and no hosted schema/enum change**; the
only hosted writes were the separately-authorised test-data reconciliation recorded below (not
part of the PR code). Frontend suite green (233 tests), lint clean, build + prerender of 43
routes, Vercel preview green; owner and manager exact-preview verification PASSED.

**Test-data reconciliation (2026-07-29, founder-authorised, applied via the database path under
the owner identity; recorded in `project_activities`).** During account/role testing the founder
made several changes that were then corrected to their intended values: **Zaara Park** lead
Martine → **Unassigned** (its owner-set Completed status + 2023-06-30 date were left as-is, not
part of the reversal); **Karen** restored to name **"Karen Residence — Fountain Garden & Mature
Borders"**, status **Ongoing**, lead **Martine Lotom**. Projects remain **9**; `approval_requests`
and `approval_events` remain **0**; the accepted **Alego** entry is unchanged.

**Karen Daily Site Entry `9fa0c797-c353-4514-acf8-87d4f31fd7aa` — role-verification TEST DATA,
left as-is by decision.** This is an owner-created no-work entry (created + submitted + accepted
by the owner within ~11 s on 2026-07-29), not a genuine site-manager operational record. The
implemented lifecycle **cannot void an accepted entry** (only supersession applies, and that
would create a replacement accepted record rather than remove it from compliance). Rather than
create a new operational record, the founder chose to **leave it unchanged and document-only**;
it is recorded here as test data. Full exclusion from operational compliance awaits a future
test-data/exclude lifecycle capability. **The legitimate accepted Alego entry was not touched.**

**Separate, still-open governance gap (not part of PR #43).** A manager can currently write
material project fields — including accountable lead, project name, client identity, location,
project type and planned/actual start — and create projects **directly**, with no Approvals
gate; only the six lifecycle actions (activation, target-completion change, completion,
cancellation, archive, restore) are proposal-gated. This pre-existing gap is tracked for a
dedicated **Project Material Change Approvals + manager project-scope restriction** domain and is
**not** addressed by PR #43. See the PR #43 audit comment for the full finding.

- **List repair (root cause + fix).** The desktop list used `table-fixed` with column widths
  summing to 100 % (`38% + 32% + 30%`) while the un-widthed Date column was starved to **0 %**,
  forcing the work date to wrap vertically character-by-character. Repaired to an
  **auto-layout** table with six clear columns — **Project · Work date · Site plan · Planned
  workforce · Status · Action** — the work-date cell kept on one line (`whitespace-nowrap`),
  the site-plan summary clamped (`line-clamp-2`). Below `md` the table is replaced by
  **stacked cards** (Project, Work date, Site activity, Planned workforce, Estimated labour
  cost, Status, Late badge, Open/Review action) with no horizontal overflow and large touch
  targets. Verified at 1440×900, 1024×768, 768×1024 and 390×844 with a clean console.
- **Daily Site corporate-label mapping (display-only; enum values preserved).** Disposition →
  **Site activity status**; Workers expected → **Planned workforce**; Planned labour cost →
  **Estimated labour cost**; Planned work → **Planned site activities**; Crew reference →
  **Crew or team reference**; Funds available (planning) → **Site funds currently available**;
  Additional requested (planning) → **Additional site funds required**; Evidence status →
  **Supporting evidence**. Supporting-evidence option wording: none → **Not provided**,
  promised → **Expected later**, provided → **Confirmed as available**, not_required →
  **Not required** (stored keys `none/promised/provided/not_required` unchanged).
- **Project-form corporate-label mapping (semantics unchanged).** Next action → **Next required
  action**; Due date → **Action due date**; Current blocker → **Current delivery constraint**;
  Internal notes → **Internal project notes**.
- **Portfolio field decision — Option A (display-only consolidation; no migration).** The old
  `Portfolio eligible` **checkbox** + `Portfolio permission status` **dropdown** are replaced
  by **one** control, **Portfolio publication status**, bound to the existing
  `portfolio_permission_status` column; the legacy `portfolio_eligible` boolean is **derived
  deterministically** so the two can never disagree. Legacy-value → display mapping: Not
  Reviewed → **Not assessed** (eligible false); Eligible → **Internal portfolio candidate**
  (true); Permission Needed → **Client authorisation required** (true); Approved For Portfolio
  → **Approved for publication** (true); Private / Do Not Publish → **Confidential — do not
  publish** (false). An untouched field is written unchanged (no silent reinterpretation).
- **Audit — do either field publish publicly? No.** The public website portfolio renders from a
  **static, curated** dataset (`src/data/case-studies.js`); neither `portfolio_eligible` nor
  `portfolio_permission_status` feeds public publication. **"Approved for publication" is an
  internal authorisation only and never auto-creates or publishes a public project.**
- **Hosted portfolio inventory (read-only; 9 projects, none mutated).** All nine projects have
  `portfolio_eligible = false`; **four** carry a permission status implying eligibility and are
  therefore **contradictory** under the old dual-field model — Alego Usonga (Eligible), Mununga
  Corridor (Approved For Portfolio), Tsavo Company Projects (Approved For Portfolio) and Zizu
  Investments (Eligible). This live conflict is exactly what the single-field consolidation
  removes going forward. The remaining five (Karen Residence, KSMS/CBK-IMS, Muthithi Gardens,
  Rift and Ridge Diani, Zaara Park) are consistent at Not Reviewed.
- **Validation.** Full frontend suite green (233 tests, 29 files); lint clean on all changed
  files; `npm run build` (sitemap + Vite + prerender of 43 routes) succeeds. The production
  Alego entry, all nine projects, Approvals, Simple Invoice Manager and the public portfolio
  are **unchanged**. Classification stays **`APPLIED_WITH_LIMITATION`** — a local repair does
  not by itself justify `ACTIVE_VERIFIED`; authenticated owner/manager production verification
  remains outstanding.

**Phase 1 implementation note (historical — local-development evidence).** Scope delivered:
Daily Site Entry capture, the review/correction lifecycle, owner compliance waivers,
morning-compliance calculation, a Dashboard attention surface and a mobile-first admin
interface. Deliberately excluded (unchanged): Operational Expenditure, Project
Funds/reconciliation, Labour Engagements/payments, actual/day-end fields, payroll, fund
transfers, receipts/uploads, external email, notifications, Supabase Realtime,
reports/exports, Simple Invoice Manager integration, public-site and Apicora work.

- **Migration:** `supabase/migrations/20260728000200_operations_hub_daily_site_operations.sql`
  (additive, forward-only). Now **applied to hosted `botanique-admin`** (version
  `20260729064007`); it was validated pre-rollout on a disposable local PostgreSQL 17
  database. Creates `daily_site_entries`, immutable `daily_site_entry_events` and
  `daily_site_compliance_waivers` plus narrow `SECURITY DEFINER` lifecycle functions and a
  `daily_site_morning_compliance()` calculation.
- **Versioning/supersession:** one live entry per project/work-date (partial-unique index);
  accepted entries are corrected only by supersession — the prior row is preserved as
  `superseded` and a new `accepted` row (version + 1) links back via `supersedes_entry_id`.
  No hard delete; events are append-only.
- **RLS/role boundary (project-authority scoped):** the **owner** reads all three tables
  company-wide; a **manager** reads only rows for projects within the existing manager
  project-authority model — an active `project_assignments` row (via
  `public.is_assigned_to_project`) or being the project's `lead_person_id` — enforced by the
  `public.can_manage_daily_site_project(uuid)` helper in the SELECT policies. Role alone
  grants nothing, so a future manager cannot see or act on unrelated projects. All mutation
  flows through the functions (direct `INSERT/UPDATE/DELETE` revoked from `authenticated`),
  and every manager-capable function **revalidates project authority in-transaction** against
  the current assignment/lead state — a manager who authored an entry still loses mutation
  access if authority is later removed. Owner-only: return, accept, void, supersede,
  waive/revoke. Manager: create/edit-own-draft, submit, correct-and-resubmit (all
  authority-scoped). Staff/viewer/inactive/anon denied. `temporarily_paused_for_day` never
  mutates `projects.status`.
- **Compliance:** EAT-explicit (`Africa/Nairobi`), 08:30 EAT is a non-blocking expectation
  (late is database-derived), weekends create no automatic due items, waivers satisfy
  compliance without operational totals, Ongoing/operationally-active projects only. The
  calculation is **filtered by `can_manage_daily_site_project`**, so a manager's
  missing/late/waived counts never leak an unauthorised project's name, id or waiver state;
  the entry-form selector uses the matching `daily_site_authorised_projects()` list.
- **Daily Attendance Evidence (authority added; not implemented).** To support Botanique's
  casual, locally sourced labour model, attendance is evidenced by an uploaded,
  project-specific **Daily Labour Register** per working entry (worker names, phone numbers,
  limited identity reference where necessary, roles/tasks, signatures or attendance
  confirmation) rather than a permanent profile for every casual worker. The register is
  uploaded against the correct Daily Site Entry ordinarily **by 9:00 a.m. EAT** (late allowed
  and auditable); where Martine is absent, the site representative or workers complete it and
  send it to him to upload against the correct project. Regular staff (e.g. Martine, Waweru)
  may later have reusable profiles; casual workers stay register-based. Actual upload/storage
  is **deferred to the Documents & Evidence domain** under data-minimisation and retention
  rules — this slice still records only `evidence_status` and builds **no** upload, roster or
  labour-payment workflow (PRD §4.5.11a; Blueprint §4.9).
- **Hosted authority reconciliation (read-only inventory, no mutation).** The chosen model
  is the documented one: the Operations Manager's **portfolio-wide** authority (§7, "the
  broader project-team and future visibility model") is realised through **`lead_person_id`
  and/or explicit `project_assignments`** — not a role-wide bypass — so future managers stay
  scoped. A read-only inventory of hosted `botanique-admin` on 2026-07-28 found nine projects
  and two active profiles (owner Widson Ambaisi, manager Martine Lotom). The two in-scope
  Ongoing sites are **Alego Usonga** (lead = Martine) and **Karen Residence — Fountain Garden
  & Mature Borders**.
- **Rollout prerequisite — SATISFIED (owner-driven, via the authorised Project interface).**
  The founder used the existing, authorised Project edit interface to set the accountable
  **lead** of **Karen Residence — Fountain Garden & Mature Borders** from *Not set* to
  **Martine Lotom** (recorded in that project's Activity History). Because the approved
  authority helper authorises a manager who is the project's `lead_person_id`, Martine is now
  authorised for **both** current in-scope Ongoing sites — **Alego Usonga** and **Karen
  Residence** — via lead authority. **No separate `project_assignments` row is required for
  Karen**: `lead_person_id` already supplies valid authority. Future managers remain scoped
  through `lead_person_id` and/or explicit `project_assignments`. A read-only verification on
  2026-07-29 confirmed Karen is Ongoing/Implementation, not archived, in compliance scope, and
  led by the active manager; `project_assignments` remains 0 (the founder used lead, not an
  assignment). The blocking prerequisite was therefore **cleared**, and the migration has
  since been **applied to hosted `botanique-admin`** and PR #41 merged, with the first real
  Alego entry now submitted in production (see the `APPLIED_WITH_LIMITATION` status at the top
  of this subsection).
- **Validation:** isolated PostgreSQL 17 migration/test matrix green
  (`scripts/test-daily-site-db.sh`, incl. lead-based authority, unassigned-manager denial and
  no-authority safe state); full Vitest suite green; changed-file ESLint clean; production
  Vite build + full prerender succeed; desktop and 390×844 mobile browser checks and
  console/network checks clean.

- **Branch / baseline:** documentation branch `docs/bd-daily-site-operations-authority`
  from authoritative `main`
  `bde2013f5df107d8ade52d3e008f0aeceb152fb4` (includes PR #36 Approvals foundation, PR #38
  hydration repair, PR #37 hosted verification reconciliation).
- **Files changed:** `WORKSTREAMS.md`,
  `BOTANIQUE_OPERATIONS_HUB_PRODUCT_REQUIREMENTS.md` (§4.5 new domain, §3 navigation, §10
  roadmap) and `BOTANIQUE_OPERATIONS_HUB_BLUEPRINT.md` (§3 matrix, §4.9 new domain, §5
  navigation, §8 roadmap). No other file changed.
- **Workstream decision:** added as a domain under the existing `BD-OPERATIONS-HUB-01`
  authority (the authority system explicitly requires no new master register), and elevated
  to the **next implementation workstream** now that Approvals is merged.
- **Domain definition:** a per-project, per-work-date **Daily Site Entry** capturing the
  morning operational plan (`working` / `no_work` disposition with a no-work reason —
  `rain`, `weekend_no_activity`, `temporarily_paused_for_day`, `no_labour_required`,
  `site_access_unavailable`, `other`; expected workers and optional crew; rate or agreed
  labour total and derived planned labour cost; work planned; funds available; additional
  amount requested; notes; system-stamped submitter/time), with reserved but unimplemented
  day-end actual fields (actual workers, actual labour cost, actual work completed, day-end
  notes, unresolved difference). A Daily Site Entry never mutates the project lifecycle.
- **Morning compliance:** Martine's first working-morning Operations Hub task is a Daily
  Site Entry for every in-scope site under his management; the Dashboard flags each in-scope
  project lacking today's entry. First slice is **soft enforcement** — no destructive lock,
  no notifications, no Realtime.
- **Paused semantics:** the official **Paused** project status (excluded from compliance) is
  distinct from a `temporarily_paused_for_day` `no_work` disposition on an otherwise Ongoing
  project (a single-day operational state that does not change `projects.status`).
- **Domain boundary:** distinct from Labour Engagements & Payments, Project Funds &
  Reconciliation and Operational Expenditure — it records the operational plan and site
  actuals, not commitments, fund movement or the expenditure ledger. No underlying record
  combines multiple sites; combined multi-project totals are derived aggregates only.
- **Lifecycle:** draft → submitted → returned_for_correction → resubmitted → accepted →
  voided → superseded; ordinary daily entries need no owner approval before submission;
  accepted records are immutable (correction by supersession, with reason and actor); no
  hard deletion; state machine documented only, not built in SQL.
- **Roles:** owner (full visibility, sees missing/late entries, may return, authorises
  post-acceptance correction, controls future fund release); manager/Martine (submits and
  corrects entries under his authority, cannot silently alter accepted records or gain
  unrestricted finance authority); staff (no first-slice financial authority). No monetary
  thresholds invented.
- **Evidence boundary:** first slice stores evidence status only (none / promised /
  provided / not_required); file uploads depend on the future Documents & Evidence domain.
- **Mobile-first:** designed primarily for Martine's phone — select project, working/no-work,
  worker count, rate/agreed total, automatic count × rate, planned work, available funds,
  additional requested, submit, repeat; large touch targets, minimal typing, clear KES, no
  raw UUID/JSON, no accounting jargon, no multi-project transaction form.
- **Approvals reuse (assessment only):** the existing `approval_requests` /
  `approval_events` pattern (`project` domain, `subject_record_id`, immutable events, narrow
  SECURITY DEFINER functions) is assessed as later-extensible for fund release, exceptional
  expenditure, reconciliation acceptance and post-reconciliation correction. No approval
  schema change now.
- **First implementation slice recommendation:** **narrower** — Daily Site Entry capture +
  morning compliance only. Operational Expenditure (the earlier preflight's combined-slice
  suggestion) is deferred to a separate second slice, because combining a new entry table,
  its lifecycle/RLS, the compliance dashboard, a mobile entry flow and a full expenditure
  model in one PR carries excessive migration/RLS/UI/authority risk.
- **Founder decisions resolved:** (1) submission before work begins and ordinarily by
  **08:30 EAT** — a management expectation, not a cut-off; later entries may be marked late,
  the manager is never locked out and the actual timestamp is retained; (2) **weekends**
  require an entry only when activity (work, deployed workers, delivery, site visit) is
  scheduled; (3) coverage is **Ongoing, operationally active projects only** (Pending,
  Awaiting Approval, Completed, Design-only, Archived and Paused excluded; pending-activation
  not required); (4) the **owner may waive** one project/date, preserving project, date,
  reason, owner identity and timestamp, without implying workers/cost/work/expenditure/funds;
  (5) persistent non-compliance yields **visible flags and counts only** — no first-slice
  restriction of access, editing or later actions (any future restriction needs its own
  evidence, founder approval, authority revision and gate).
- **Integrity confirmations:** implementation has not started; no hosted data was mutated;
  Simple Invoice Manager was unchanged; no Apicora work occurred; the nine production
  projects (including Zizu Investments Ltd and Alego Usonga) and both approval tables are
  untouched.

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

---

## BD-OPERATIONS-HUB-01 — Phase 1B-A4: Project Material Change Approvals and Manager Project-Scope Control

Status: **ACTIVE_VERIFIED** (31 July 2026; PR #44 merged and closed; corrective migration
`20260731000100` applied once, structurally verified and authenticated on the exact PR
preview). PR #44 merged into authoritative `main` at
`05b6ade06f7ba2d4fdfb5c9d4ef1b591ea4e02e7`.

Pre-implementation baseline `main`: `24154fee4a163378201a6db0e1d94006287c88ae`. Branch:
`feat/bd-project-material-change-approvals`; corrective evidence head before this authority
update: `579ae345087d8b1a54b7e21ec2b0ecff68ab5f11`. The current physical project count is
12: **10 genuine operational/portfolio projects** and **2 archived internal PR #44
verification fixtures**. The fixtures were created during the authorised Codex-controlled
verification using the authenticated Principal session; they are immutable audit evidence,
not ordinary founder-created production projects, and are excluded from genuine-project
counts/fingerprints. Simple Invoice Manager, financial implementation, public Portfolio
behaviour and Apicora remain unchanged.

**Hosted rollout (30 July 2026).** After the Daily Site migration-history alias was
reconciled through the official Supabase history-repair mechanism, hosted history was
canonical through `20260728000200`. A fresh `supabase db push --linked --dry-run` listed
only `20260729000100_operations_hub_project_material_change_approvals.sql`; that migration
was then applied once through the transactional linked CLI path from 19:38:01–19:38:28 UTC
(22:38:01–22:38:28 EAT). Hosted history now contains `20260729000100` exactly once.
Read-only verification confirmed both intake tables, the seventh material-change type,
all expected functions/ownership/search paths/grants, five enabled project triggers, scoped
project and intake RLS, owner-only project INSERT, and Ongoing/non-archived Daily Site
eligibility. All nine projects, two profiles, zero assignments, 15 existing project
activities, 0/0 approvals, three Daily Site entries, 11 Daily Site events and zero waivers
retained identical deterministic fingerprints; both intake tables are empty and the
migration generated no project activity. At this 30 July pre-authentication checkpoint,
authenticated owner/manager workflow verification remained pending and expanded Approvals
was not yet `ACTIVE_VERIFIED`. This checkpoint is retained as history; the final 31 July
verification below established the current status.

**31 July production-baseline reconciliation and corrective rollout.** The legitimate
production deltas were reconciled before any schema write:

- **Lugulu Residential Home** (`f4c3d970-eaf9-4639-8e53-fdf1088a5855`) is the genuine tenth
  project: Residential, Lugulu/Bungoma, Ongoing/Implementation, client/site label Eugen
  Awori, blocker “Sourcing of murram for parking area”, next action “Winding up the planting
  and housekeeping”, created directly under the authenticated Principal at 06:18:40 UTC
  (09:18:40 EAT), then assigned to Martine Lotom at 06:21:18 UTC. Its two activity rows are
  exactly project creation and accountable-lead assignment; no approval or intake created it.
- The two archived fixture UUIDs remain
  `bf257eb0-e144-416c-a72e-67dfc09df3ee` and
  `0197700b-4f86-4b33-94ed-0ee208f100bb`, classified
  `ARCHIVED_INTERNAL_VERIFICATION_FIXTURE`. Both retain complete audit history, have no Daily
  Site or financial row and no public Portfolio publication, and were not changed after
  cleanup.
- Alego Daily Site entry `b3e1703a-3140-4555-ad2f-0db7ee1fd5f6` is a genuine Martine
  submission for 31 July: 16 workers × KES 500 = KES 8,000 planned labour, KES 350 additional
  funds requested, note “350 for mkokoteni”, evidence expected later. Widson Omutelema
  Ambaisi returned it for correction at 09:12 EAT with the recorded cart/mason/scope and
  Alego-versus-Lugulu separation instructions. Its created/submitted/returned events explain
  the Daily Site delta from 3/11/0 to **4/14/0**; it created no payment, liability, approval
  or fund release and was not mutated by this reconciliation.

The accepted pre-apply counts were projects 12 (10 genuine + 2 fixtures), profiles 2,
assignments 0, project activities 25, approvals 5/21, intakes 3/13 and Daily Site 4/14/0.
Authority-compatible fingerprints were: all projects
`2bbc8c4dff3b2d7bc71407dd2c41ede9`; genuine ten
`b688a025237d65af78f42ba5576672c9`; original nine
`4bdcb35ba4017dc7215a9a83fe9b76eb`; Lugulu
`a6cb9e443a479b226fe1cd26c53c88bc`; fixtures
`dc4ab01248bb72c31c88f3aafb182ff8` /
`623f0ae1a9e47e026cb2f10e29c725fd`; profiles
`2c43244e40d974801b4c1e5419362890`; assignments
`d751713988987e9331980363e24189ce`; activities
`a457e5983ef51dea30b237f8941a6182`; approvals
`7eaf6655a749c966003023268f4458d3` /
`d3b0c0bf51fcce579a6fefe6ed4aed78`; intakes
`fe0e6d69e062e941aaef5184456790f8` /
`702eb1a6a9732a45228aa126eaf198e5`; Daily Site entries/events/waivers
`f4d0816b122bb5598a391fe007289d7b` /
`c0c5cb29aa1bebf921c1da8a0e772224` /
`d751713988987e9331980363e24189ce`; Alego entry
`942d4b0d21c99a99d5b3cb8f6ae13167`; Portfolio all/genuine
`dba2e833eb8a85f997e52b33d84071ed` /
`cc787b037f0b906cf61534aa93718993`; financial references
`d751713988987e9331980363e24189ce`.

CLI `2.109.1` dry-run listed only
`20260731000100_operations_hub_pr44_verification_repairs.sql`. The linked transactional
apply ran from 07:01:59–07:02:21 UTC and recorded `20260731000100` exactly once. The
migration adds the independent manager direct-status trigger and re-states terminal-intake
owner/requester visibility; it is forward-only, contains no finance/Daily Site linkage or
Portfolio-publication change, and uses no non-transactional statement. Post-apply the new
trigger was enabled with fixed `search_path = public` and no public/anon/authenticated direct
execute grant. A manager-authorised Lugulu direct-status probe was explicitly rejected,
affected zero rows and left status/activity unchanged. Terminal intake reads returned 3 for
the owner, 3 for the requester and 0 for an unrelated actor. All counts and every fingerprint
above matched pre-apply exactly, proving zero migration-generated project, activity,
approval, intake, Daily Site, Portfolio or financial row.

**Correct test interpretation.** The earlier “manager activated directly” result was not a
confirmed production status mutation. The regression fixture was outside manager RLS scope;
the UPDATE affected zero rows and the defective harness reported that no-op as success.
Repaired tests now distinguish zero-row no-op, explicit permission rejection and successful
committed mutation. The independent status trigger remains a valid defence-in-depth control.
The frontend repairs also clear in-flight/loading state for stale/malformed failures, suppress
stale warnings after terminal decisions and reload terminal intake detail through an
RLS-scoped direct fetch.

**Verified governance gap closed.** The interim Phase 1B-A1 boundary already
reserved the six lifecycle transitions (activation, target completion, completion,
cancellation, archive, restore) to the owner, but a manager could still, on any of
the nine projects: see every project; create a live Pending project directly; and
directly edit material identity/authority/schedule fields — project name,
client/site label, location, county, project type, non-terminal stage, accountable
lead (including reassigning **himself**), planned start and actual start. Those
direct edits became live immediately, bypassing Approvals.

**Selected manager visibility model (RLS-enforced).** A manager may now SELECT and
UPDATE only projects they **lead** (`lead_person_id = auth.uid()`) or are actively
**assigned** to (`project_assignments`). The owner remains company-wide. This aligns
the `projects` table RLS with the model Daily Site Operations already used
(`can_manage_daily_site_project`), so the Daily Site selector for Martine (Alego,
Karen, Mununga + assigned) is preserved and no unrelated project leaks through
lists, charts, activity or search.

**Selected project-intake model.** Restricted intake record separate from live
projects: new `project_intake_requests` (+ `project_intake_events`). A manager
proposes a new project; NO `projects` row exists until the owner approves, at which
point the live project is created atomically and `created_project_id` records the
intake→project link. A pending intake never enters project lists, Dashboard counts,
charts, Daily Site Operations, search or portfolio reporting. Rejection, withdrawal
and amendment leave no live project. The manager gains no authority by proposing
himself (the created project opens unassigned; the owner assigns the lead).

**Material change approval type.** A seventh approval type `project_material_change`
extends the existing `approval_requests`/`approval_events` lifecycle (submitted →
awaiting_review → amendment_requested → approved/rejected/withdrawn) with a strict
nine-field allowlist, an authoritative original snapshot, stale-request protection,
immutable events, manager assignment/authority validation, and atomic apply that
writes a `project_activities` history event. The six lifecycle types are preserved
verbatim and never duplicated.

Database enforcement (PostgreSQL functions + RLS + triggers, not frontend-only):
manager direct writes to any material field are rejected (`tg_guard_project_material_fields`);
manager cannot update unrelated or create live projects (scoped/owner-only RLS);
owner-only decisions; strict JSON-key allowlist; original-must-match-current at
approval; rejected/withdrawn/amendment never mutate the project; duplicate active
requests blocked (one active material change per project; one active intake per
requester+name).

Validation: PostgreSQL 17 matrix
(`supabase/tests/project_material_change_approvals_test.sql`, run via
`scripts/test-material-approvals-db.sh`) passes, covering visibility scoping,
direct-write blocks, submit/approve/reject/amend/withdraw/stale/duplicate, intake
create/approve/reject/withdraw, low-risk direct edits + activity history, the six
lifecycle types still working, and Daily Site RLS unaffected. The existing approvals
and daily-site matrices still pass. Frontend: `vitest` full suite green (249+),
`eslint` introduces no new errors, `npm run build` prerenders successfully.

**Final focused authenticated reverification (31 July 2026).** On exact preview head
`df5ea4eba0a278f00c311f0e93bbc95dfde6c978`, the authenticated Principal and Martine
Lotom each directly opened, reloaded, navigated away from and returned to all three existing
terminal intake routes. Approved/rejected/withdrawn state, requester, request round and full
immutable history remained readable; the approved record exposed a human-readable
`Open project` link without using the UUID as its primary label. No invalid terminal controls,
stale warning, blank state, redirect loop or access loss appeared. Existing approved/rejected
material-change and pause/resume/accountable-lead terminal routes likewise remained readable
without an obsolete stale banner. Browser consoles for both accounts contained no React
error, uncaught TypeError, hydration failure, blocking Supabase error, warning or error.

Martine's Lugulu edit route rendered project identity, current status, stage, accountable
lead and schedule as read-only in the direct operational form; direct save exposed exactly
`next_action`, `next_action_date`, `blocker` and `notes`, while status and other material
changes appeared only in the Principal-approval proposal section, with no owner decision
controls. The Principal Lugulu edit route retained direct status, accountable-lead and
material controls plus normal `Save changes`, with no manager proposal section. The prior
read-only database authority evidence remains 3 terminal intakes for owner, 3 for requester
and 0 for an isolated unrelated actor (`DATABASE_AUTHORITY_VERIFIED`); no third production
profile was manufactured. Browser request interception was unavailable, so no production
mutation was attempted for failure simulation; complete frontend coverage proves stale RPC,
undefined/malformed response, network rejection and Supabase error-object cleanup, including
lock release, restored controls, understandable errors, no false success and no TypeError.

Post-pass linked queries reproduced every accepted count and fingerprint: projects 12
(10 genuine + 2 archived fixtures), profiles 2, assignments 0, activities 25, approvals
5/21, intakes 3/13, Daily Site 4/14/0, zero financial references, zero fixture/Lugulu Daily
Site entries, and unchanged all/genuine/original/Lugulu/fixture/profile/activity/approval/
intake/Daily Site/Portfolio/financial hashes. Both migrations remain present exactly once.
Frontend 36 files / 272 tests, all three isolated PG17 matrices, changed-file lint,
exact-main lint comparison (same 19 pre-existing findings; zero new), 43-route
build/prerender and `git diff --check` pass. No project, approval, intake, Daily Site,
financial, Simple Invoice Manager, public Portfolio or Apicora state was created or changed.

Pre-merge checkpoint boundaries: hosted migration applied with business rows unchanged;
PR #44 was still draft/unmerged at this verification checkpoint; no financial,
Simple-Invoice-Manager, public-portfolio-behaviour or Apicora work. PR #44 subsequently
merged and closed at the authoritative `main` commit recorded above. New/changed files:
the migration + PG test + runner under `supabase/`; the Operations Hub docs; and the
`src/admin` material-change / intake / activity-wording implementation and tests.

**Authority corrections (pre-security-review, same PR #44 branch).** Two founder
corrections applied on top of the above:

1. **Project status is not low-risk.** Ongoing↔Paused is no longer a manager direct
   write; it is now the tenth `project_material_change` allowlist field, validated to
   the Ongoing↔Paused transition on an active project only. The interim
   `tg_guard_project_material_authority` carve-out is removed and
   `tg_guard_project_material_fields` also blocks status, so a manager direct status
   write is zero. Activation/completion/cancellation/archive/restore keep their
   dedicated types; Design-only stays owner-only. Low-risk direct is now exactly
   `next_action`, `next_action_date`, `blocker`, `notes`. Portfolio
   (`portfolio_eligible`, `portfolio_permission_status`) is documented explicitly as
   OWNER_ONLY with no manager proposal path.
2. **Daily Site Entry eligibility ≠ project access.** A pre-existing Daily Site defect
   (the selector/create path gated only on authority, contradicting the migration's own
   "operationally-active" intent) is fixed narrowly in this PR:
   `daily_site_authorised_projects()` and `create_daily_site_entry_draft()` now also
   require operational eligibility. Following the migration security-review authority
   decision (evidence: PRD §4.5 Paused semantics + the migration header + Ongoing-only
   morning-compliance scope — no authority requires Pending/Paused entries), the rule is
   tightened to **`status = 'Ongoing' AND archived = false`** (same for owner and manager):
   Pending, Paused, Completed, Cancelled, Design-only and Archived are excluded. Completed
   Mununga stays visible in Projects but is excluded from the new-entry selector and blocked
   at the database; Alego/Karen (Ongoing) remain eligible; Ongoing→Paused removes eligibility
   immediately and an approved resume restores it. `can_manage_daily_site_project`
   (read/history/corrections) is untouched, so Daily Site Operations stays ACTIVE_VERIFIED.

**Migration security review (same PR #44 branch).** Hostile-path DB review confirmed: all 20
new/replaced functions are SECURITY DEFINER with a fixed `search_path = public`, schema-
qualified, no dynamic SQL; `private_*` helpers fully revoked from public/anon/authenticated
(two over-grants tightened during review); strict JSON-key allowlist rejects arbitrary/nested
keys, malformed UUIDs and empty proposals; authoritative original snapshots; stale-request
protection; owner-only decisions with no manager/requester self-approval; atomic apply;
scoped manager RLS; separate-table intake isolation. Added DB concurrency-guard tests (decide-
twice, withdraw-vs-approve, duplicate intake approval creates no duplicate project) and
hostile-JSON tests. Migration `20260729000100` remains applied once and unchanged; corrective
migration `20260731000100` is now the seventh and latest repository/hosted migration with no
version collision. At this pre-final-verification checkpoint, focused authenticated
reverification remained pending; this statement is retained as history and was superseded
by the completed 31 July verification recorded above.

**No-self-approval correction (same PR #44 branch).** Governance fix: the owner edits and
creates projects **directly** and must never submit a manager-style proposal that they, as
the sole decider, could self-approve.

- `submit_project_approval` rejects a `project_material_change` from any non-manager caller
  (owner edits material fields directly); `decide_project_approval` additionally rejects when
  `requester_id = auth.uid()` for a material change.
- `submit_project_intake` is manager-only (owner creates projects directly);
  `decide_project_intake` rejects when `requester_id = auth.uid()`.
- The six lifecycle types are unchanged (owner-originated lifecycle requests remain a
  foundation-design path; a general requester≠decider invariant is deliberately NOT imposed
  on them, per "do not break the foundation unnecessarily").

Approval submit/decision matrix:

| Approval type | May submit | May decide | requester = decider allowed? | Direct owner alternative |
| --- | --- | --- | --- | --- |
| project_activation | owner, manager | owner | yes (owner-originated, foundation) | owner sets status Ongoing directly |
| project_target_completion_change | owner, manager | owner | yes (foundation) | owner sets target directly |
| project_completion | owner, manager | owner | yes (foundation) | owner "Mark completed" quick action |
| project_cancellation | owner, manager | owner | yes (foundation) | owner sets Cancelled directly |
| project_archive | owner, manager | owner | yes (foundation) | owner archives directly |
| project_restore | owner, manager | owner | yes (foundation) | owner restores directly |
| **project_material_change** | **manager only** | **owner** | **NO** | owner edits material fields directly |
| **project intake** | **manager only** | **owner** | **NO** | owner creates the project directly |

Frontend confirmed aligned (defence-in-depth, not the security boundary): the owner never
sees "Submit material changes for approval" (the proposal section renders only for a manager)
and creates projects via the direct form (managers route to the intake form); managers never
see owner decision controls (`canDecideApproval` = owner only). New tests: owner-edit sends a
direct patch with no approval; owner create renders the direct form, manager create renders
the intake form.

**Migration transaction & recovery (hosted rollout).** Proven by applying the file under
`psql --single-transaction` against a fresh PG17 with the five prior migrations: the entire
`20260729000100` commits atomically. It contains **no** non-transactional statement (no
`CREATE INDEX CONCURRENTLY`, `ALTER TYPE … ADD VALUE`, `VACUUM`, `CREATE DATABASE`,
`ALTER SYSTEM`, `REINDEX`), so nothing forces a mid-file commit. Whole-file atomicity is
therefore **guaranteed whenever the file is applied inside one transaction** — which
`supabase db push` / `supabase migration up` do automatically, and which `psql
--single-transaction -f` guarantees. Under those methods, **partial application is not
possible**: any error (including connection loss) aborts and rolls back the whole file, and
the Supabase migration-history row (`supabase_migrations.schema_migrations`, keyed by
version `20260729000100`) is written only on success. Partial application is *only* possible
if the file is deliberately applied statement-by-statement with autocommit (plain `psql -f`
without `--single-transaction`, or pasting into the SQL editor without a `begin;`/`commit;`
wrapper) and interrupted — the checklist forbids this.

Controlled hosted rollout checklist (completed 30 July 2026):

1. **Pre-apply migration-history snapshot** — `select version,name from
   supabase_migrations.schema_migrations order by version;` confirm the five prior versions
   present and `20260729000100` **absent**.
2. **Pre-apply object existence** — confirm `to_regclass('public.project_intake_requests')`
   is NULL and `to_regprocedure('public.submit_project_intake(jsonb,text,text,uuid)')` is
   NULL (migration not yet applied).
3. **Business-data counts** — record `projects`=9, `approval_requests`=0,
   `approval_events`=0, `project_intake_requests`=0 (table absent → 0), `daily_site_entries`
   count.
4. **Project fingerprints** — record `select id, md5(project_name||coalesce(client_site_name,'')
   ||status||stage||coalesce(lead_person_id::text,'')||archived::text) from projects order by
   id;` (to prove no project row changed).
5. **Apply** — atomically only: `supabase db push` (preferred) **or** `psql
   "$DATABASE_URL" --single-transaction -v ON_ERROR_STOP=1 -f
   supabase/migrations/20260729000100_operations_hub_project_material_change_approvals.sql`.
6. **Post-apply history** — confirm a `20260729000100` row now exists in
   `supabase_migrations.schema_migrations`.
7. **Objects/functions/triggers** — confirm `project_intake_requests`,
   `project_intake_events`, the new functions (`submit_project_intake`,
   `decide_project_intake`, `submit_project_approval` extended, …), the trigger
   `projects_material_fields_guard`, and the replaced `tg_project_history` /
   `tg_guard_project_material_authority` / `daily_site_authorised_projects` /
   `create_daily_site_entry_draft` exist.
8. **RLS** — confirm the scoped `projects` policies, `project_intake_*` policies and revoked
   direct DML; confirm `approval_requests_approval_type_check` now includes
   `project_material_change`.
9. **Unchanged business data** — re-run steps 3–4 and diff: counts unchanged (0/0 approvals,
   9 projects), project fingerprints identical, no Daily Site row changed.
10. **Recovery / stop conditions** — if step 5 errors: the transaction rolled back, DB is
    unchanged (verify via steps 6–7 showing nothing applied); fix and retry.
    **SUPERSEDED 1 August 2026 — see the dated backup and recovery verification entry
    above.** The original instruction read: "If a partial state is ever observed (only from
    a non-atomic apply): **restore via Supabase point-in-time recovery to the pre-apply
    timestamp** (recorded before step 5) rather than hand-reconstructing the replaced
    functions; then re-apply atomically. Because the migration is additive, a clean re-apply
    after PITR is safe." That instruction is **operationally invalid** and is preserved here
    only as superseded evidence: point-in-time recovery is a Supabase add-on and is
    **disabled** on `botanique-admin`, so no pre-apply timestamp is recoverable and no
    operator may be sent to look for one during an incident.

    **Current recovery instruction.** Atomic application remains the primary protection, and
    non-atomic partial application remains prohibited — a partial state should not arise from
    a correctly executed apply. If one is nonetheless observed, first establish exactly what
    was and was not applied through steps 6–7; do not assume the additive character of a
    migration makes a blind re-apply sufficient in every partial-state scenario, because the
    correct remedy depends on which objects exist and whether any replaced function is in a
    mixed state. Where the evidence shows the migration is simply absent or wholly present,
    re-apply atomically. Where it does not, resolve the specific partial state deliberately
    before re-applying. **No restore of a scheduled backup may be used as a routine migration
    remedy:** the only restore points are the daily scheduled backups (observed cadence
    approximately 04:0x UTC, seven visible restore points), and restoring one discards **all**
    committed data after that snapshot, not merely the migration. Any production restore is a
    last-resort action requiring explicit Principal approval. Where isolated inspection or
    recovery testing is what is actually needed, prefer the dashboard's restore-to-new-project
    capability, which leaves production untouched. Restoring a database backup does **not**
    restore Supabase Storage objects. Point-in-time-recovery wording may be reinstated only
    after PITR is separately enabled and verified.

Migration ordering: `20260729000100` is strictly the latest of the six repository
migrations (after `20260728000200`); no collision, no rename required. Lint baseline:
exact main `24154fee` reports 19 pre-existing errors (`server/index.js` Buffer/process,
`PaidConsultancyModal.jsx`, `AppContext.jsx`) and PR #44 reports the same 19 — zero new.
PG17 material matrix + existing Approvals + existing Daily Site matrices pass; frontend
`vitest` full suite green (36 files / 272 tests); `npm run build` prerenders 43 routes;
`git diff --check` clean.
