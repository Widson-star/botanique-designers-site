# Botanique Designers Workstreams

> Placed at the repo root because `docs/` contains a stale GitHub Pages build
> artifact and is not a maintained docs directory.

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
  cleanup for later.
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
* docs/ confirmed NOT deployed by Vercel (serves dist/) — flagged safe to delete,
  left in place pending confirmation. Dual sitemap (public/ + vite-plugin) still
  present, kept in sync — consolidation optional.

Remaining risks: area files still carry unused `icon:` emoji data (harmless, not
rendered); repo still has no git commits (baseline recommended); in-memory rate
limiter is per-instance (fine for single-instance Express).

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
