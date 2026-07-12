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
