# Post-Stabilization Evidence Audit — BD-ROADMAP-02

**Audited production / `main` SHA:** `918c61eeb12fb3295bc88a0d78914e434e545839`
(`BD-CODE-HYGIENE-01: remove dead area icon data (#18)`).
**Date:** 13 July 2026.
**Branch:** `claude/bd-roadmap-02-post-stabilization-audit`.
**Type:** Audit / documentation only. No public website code, source, config,
dependency, generated artifact, or protected file was changed by this workstream.
The only changed files are this document and `WORKSTREAMS.md`.

---

## 1. Audit method

Evidence was gathered from three sources and every finding below cites at least
one of them:

1. **Repository source** at the exact audited SHA — the four Markdown authority
   files (`README.md`, `WORKSTREAMS.md`, `GARDENCARE_PRODUCT_DEFINITION.md`,
   `MEASUREMENT_PLAN.md`), `src/admin/DEPLOYMENT.md` (boundary awareness only),
   React routes (`src/App.jsx`), the route authority
   (`scripts/public-routes.mjs`), data files (`src/data/*.js`), utilities, and
   build/deploy config (`package.json`, `vercel.json`, `scripts/*.mjs`).
2. **Production build** — a clean `npm install` + `npm run build` on the audited
   SHA (Vite build + sitemap generation + static prerender), and `npm run lint`.
3. **Live production site** at `https://www.botaniquedesigners.com` — HTTP status
   probes, the live `sitemap.xml`/`robots.txt`, page-content fetches, and an
   in-app browser session (console-error check and real-browser rendering of an
   unknown route).

**Build/lint/diff results (validation gate):**

- `npm run build` succeeds; **43/43 routes prerender** (`✅ Pre-rendered 43
  routes into … /dist`).
- Live `https://www.botaniquedesigners.com/sitemap.xml` contains **exactly 43
  `<loc>` URLs**, all on the production hostname; no redirect-only route present.
- `npm run lint` holds at the inherited **20 errors, 0 warnings**, across the
  same four files (`server/index.js`, `src/components/Assistant.jsx`,
  `src/components/FadeIn.jsx`, `src/context/AppContext.jsx`) — zero new.
- `git diff --check` clean; working tree otherwise clean (`dist/`, `node_modules`
  are gitignored; `package.json` / `package-lock.json` unchanged by the audit).
- Homepage live console-error check: **no console errors**.
- Apex `https://botaniquedesigners.com/` → **HTTP 308** to the `www` canonical
  (healthy); `www` root → **HTTP 200**.

---

## 2. Completed-workstream summary (verified at this SHA)

The stabilization programme is substantially complete. The following were
re-verified against source and/or live production and are classified **COMPLETE**
(see §4 for the register):

| Workstream | Verified now |
|---|---|
| Truth & credentials (BD-TRUTH-CONSISTENCY-01) | Live `/about` shows founder **Widson Omutelema Ambaisi**, **BA Geography & Environmental Studies, University of Nairobi**, **Associate Degree in Horticulture, Egerton University**. No public EIA/NEMA claims anywhere in `src/`, `public/`, `index.html` (only the `/services/eia-studies` → `/services` retirement redirect). Public email is `hello@botaniquedesigners.com` on every public surface. |
| Brand boundary (BD-WS-02) | See the dedicated Apicora-boundary note below the table — the public site mentions Apicora exactly once (About-page founder biography) and does not reframe Botanique around it. |
| Positioning | Kenya-based / Kenya-wide with selected regional briefs (About + Footer), consistent with BD-TRUTH-CONSISTENCY-01. |
| Project-status honesty (BD-WS-05) | `src/data/case-studies.js`: Zaara Park + Serenity Homes Diani are `Design Concept`; no budget/acreage figures; Tsavo Skywalk `Built / Implemented` with the confirmed 6-month maintenance scope. |
| GardenCare launch (BD-GARDENCARE-01) | Live `/gardencare` returns **HTTP 200**; approved coverage/programme names present; enquiry CTAs reuse the existing wizard/WhatsApp. |
| Route & sitemap authority (BD-ROUTE-AUTHORITY-01) | Single authority `scripts/public-routes.mjs` (43 routes); build 43/43; live sitemap exactly 43 URLs; no redirect-only route listed. |
| Measurement Phase A (BD-MEASUREMENT-01) | `<Analytics />` client-only in `src/App.jsx`; pageviews only; no `track()` calls; no PII/consent surface. |
| Repository hygiene (BD-REPOSITORY-HYGIENE-01) | No root `docs/`; GitHub Pages disabled; production served by Vercel from `dist/`. |
| Dead area-icon data (BD-CODE-HYGIENE-01, #18) | Merged into the audited production SHA. |

Contact consistency re-checked: the WhatsApp/phone number `254720861592` is
identical across all ~10 occurrences and `hello@botaniquedesigners.com` is the
only public email. Accessibility spot-check: **all 25 `<img>` tags in `src/`
carry an `alt` attribute** (multiline-aware scan).

### Apicora boundary (precise wording)

To avoid any misreading of "Apicora framing" as Botanique being reframed around
Apicora:

- In the **visitor-facing website**, Apicora is mentioned **exactly once**, in the
  **About-page founder biography** (`src/pages/About.jsx:17`).
- That mention identifies Apicora as **a separate environmental intelligence
  platform for Africa** and part of **Widson Omutelema Ambaisi's founder
  background**.
- Apicora is **not** presented as a Botanique Designers service, product,
  platform, operating system, or substitute brand.
- **Internal authority/history documents** (this audit, `WORKSTREAMS.md`,
  `README.md`, `MEASUREMENT_PLAN.md`, `GARDENCARE_PRODUCT_DEFINITION.md`) may
  mention "Apicora" only when recording this boundary; those internal references
  are **not public brand positioning**.
- **Botanique Designers remains a separate landscape-design and implementation
  practice.**

---

## 3. Findings table

Risk key: **Low / Moderate / High**. "Owner input?" = whether the fix needs
owner-supplied facts/assets or a decision. All non-complete, actionable findings
respect the protected-system boundary in §7 (none touch `/admin`, Supabase,
finance, project tracker, payments, or the WhatsApp destination).

| ID | Classification | Finding | Evidence | Route / file | Visitor / business impact | Risk | Owner input? | Recommended action |
|---|---|---|---|---|---|---|---|---|
| **F-1** | **VERIFIED DEFECT** | **Soft-404: unknown URLs return HTTP 200 with homepage-duplicate HTML and no `noindex`; a real browser renders only Header + Footer with an empty `<main>`.** | `curl /this-page-does-not-exist-12345` → **200**; served `<title>` = the homepage title; no `noindex` in the response. In-app browser at that URL renders only footer/header chrome, blank main, no "not found" message. `vercel.json` rewrites `"/(.*)" → "/"`; `src/App.jsx` has **no** `path="*"` catch-all; no `/404` is prerendered. | `src/App.jsx` (routes), `vercel.json`, `scripts/prerender.mjs` | Crawlers can index unlimited arbitrary URLs as homepage duplicates (soft-404 / duplicate-content risk); users who mistype or follow a stale link hit a content-less dead-end with no recovery path. | Moderate | No | Add a catch-all `NotFound` route with clear recovery links; prerender a `/404` document carrying `<meta name="robots" content="noindex">`; stop serving homepage-duplicate content for unmatched paths. **This is the recommended next workstream (§8).** |
| **F-2** | **VERIFIED DEFECT** | **Oversized blog hero image (~2.26 MB) ships uncompressed.** Every other asset is ≤200 KB; this one is ~12×. | `public/images/blog/landscape-software-2026.jpg` = **2,370,961 bytes**; referenced as the post `image` in `src/data/blog-posts.js:9`; next-largest asset is 200 KB. `scripts/compress-images.mjs` (200 KB budget) exists but is **not wired into any npm script** (`build = generate-sitemap && vite build && prerender`). | `public/images/blog/landscape-software-2026.jpg`, `src/data/blog-posts.js`, `scripts/compress-images.mjs`, `package.json` | Slow LCP on the `/blog/best-landscape-design-software-2026` post — a deliberate SEO target — for a mobile-heavy audience. | Moderate | No | **Targeted asset fix, not an automatic library-wide rewrite.** Optimize **only** this one file; preserve its displayed dimensions/aspect ratio and acceptable visual quality; verify the blog list/post render and the social/structured-data (`og:image`) references still resolve. Do **not** run a broad compression script or wire whole-library image mutation into `build` without first auditing exactly what else it would rewrite. |
| **F-3** | OPTIONAL ENHANCEMENT | Dead component `src/components/SmartAdvisor.jsx` is unreferenced anywhere in the repo. | Repo-wide search: `SmartAdvisor` appears only inside its own file. `src/App.jsx` renders `Assistant`, not `SmartAdvisor`. | `src/components/SmartAdvisor.jsx` | None (not shipped/rendered). | Low | No | Delete in a future hygiene pass. Not a standalone workstream. |
| **F-4** | OPTIONAL ENHANCEMENT | Contact number `254720861592` is hardcoded in ~10 files instead of importing `CONTACT` from `src/utils/backend.js`. | `grep` shows the literal in `Footer.jsx`, `Home.jsx`, `FAQ.jsx`, `Assistant.jsx`, `SmartAdvisor.jsx`, `PaidConsultancyModal.jsx`, `PaymentConfirmationModal.jsx`, `index.html`, and `backend.js`. All values currently identical. | multiple | None today (values consistent); future drift risk. | Low | No | Centralise on the `CONTACT` constant opportunistically. |
| **F-5** | OPTIONAL ENHANCEMENT | Documentation staleness: the `BD-CODE-HYGIENE-01` entry in `WORKSTREAMS.md` still reads "Status: Implementation complete — draft PR," but that PR (#18) is merged into the audited production `main`. | `WORKSTREAMS.md` BD-CODE-HYGIENE-01 header vs. `git log` (#18 = audited SHA). | `WORKSTREAMS.md` | None (internal doc only). | Low | No | Correct the status line during a future documentation pass (left unchanged here to keep this diff minimal and faithful). |

---

## 4. Blocked / evidence-gap register

| ID | Classification | Item | Why it cannot proceed now | Owner action / evidence needed |
|---|---|---|---|---|
| **B-1** | BLOCKED | Analytics **Phase B** custom `track()` events | Owner dashboard evidence (13 Jul 2026) confirms the Vercel **Hobby** plan; the Events panel states custom events require a **Pro** team. Unavailable on the current plan. | A **deliberate** owner upgrade of this specific project to Pro/Enterprise **and** a reviewed implementation brief. **No upgrade is recommended or authorized.** |
| **B-2** | EVIDENCE GAP | Production-filtered **7–14-day** analytics baseline | Only an early, non-decision-grade snapshot exists (filter: *All environments / Last 7 Days*; may include preview traffic). Not a completed baseline. | Let production pageviews accumulate; re-read filtered to **Production** over a **complete** window. Evidence-gathering, **not** an implementation task. |
| **B-3** | EVIDENCE GAP | Testimonial wording not confirmed **verbatim** | Home/About show client feedback (e.g. Caroline N. — Tatu City; Stephen W. — Membley; Joyce N. — Runda). Names are real per Widson; the softer "Client Feedback" label is retained only because exact quote wording is unconfirmed (BD-WS-03). | Owner confirmation of verbatim quotes; then the label may revert to "Client Reviews." Facts must not be invented. |
| **B-4** | EVIDENCE GAP | Additional project imagery | Tsavo Skywalk and Serenity Homes Diani each have a single image; Zaara Park is a single design render (`src/data/case-studies.js` `notesForWidson`). | Owner-supplied photos/renders to strengthen portfolio credibility and before/after evidence. Only one genuine before/after pair (Muthithi) exists and none should be fabricated. |

---

## 5. Accepted limitations (intentionally retained)

| ID | Item | Why accepted |
|---|---|---|
| A-1 | In-memory, **per-instance** rate limiter in `server/index.js` | Acceptable for the **optional single-instance** Express backend, which is **not deployed on Vercel** (README: no `/api` on Vercel; backend is optional via `VITE_BACKEND_URL`). Reaffirmed acceptable. |
| A-2 | Legacy routes (`/services/eia-studies`, `/services/implementation`, `/services/maintenance`) use SPA client redirects (`<Navigate replace>`) — 200 then client navigation, not a true 301 | Intentional design of the static SPA; historically accepted; no live regression. |
| A-3 | M-Pesa STK disabled; manual Till/Bank + WhatsApp confirmation is the default | Intentional until production Daraja credentials exist (README "Payments status"). |
| A-4 | Inherited **20 lint errors** across four files | Pre-existing baseline deliberately held stable across workstreams; no new errors introduced. |
| A-5 | Fraunces editorial display serif (BD-WS-07) | Retained per owner preference. |

---

## 6. Explicit reassessment of known historical items

- **Testimonial wording not confirmed verbatim** → still an **EVIDENCE GAP**
  (B-3). Unchanged; owner confirmation still required.
- **Additional project images to be supplied later** → still an **EVIDENCE GAP**
  (B-4). Unchanged; owner assets still required.
- **In-memory rate limiter is per-instance** → **ACCEPTED LIMITATION** (A-1).
  Reaffirmed acceptable for the optional single-instance Express backend.
- **Analytics Phase B unavailable on Hobby** → **BLOCKED** (B-1). Unchanged.
- **7–14-day Production-filtered analytics baseline not yet complete** →
  **EVIDENCE GAP / pending** (B-2). This is an evidence-gathering action, not an
  implementation workstream, and no conversion recommendation may rely on the
  early snapshot.

---

## 7. Protected-system boundaries

The following are out of scope for any recommended public-site work and must not
be modified or used as substitutes for the protected operational systems:

- `/admin` and `src/admin/**` (project tracker); **Simple Invoice Manager** remains
  the financial source of truth (`src/admin/DEPLOYMENT.md`).
- Supabase / auth / RLS / migrations; owner-only financial references.
- Finance visibility, payment-confirmation logic, consultation fee & distance
  calculations, M-Pesa / Daraja configuration.
- The WhatsApp destination number and existing enquiry wording/behaviour.
- Founder identity/credentials, public email addresses, EIA/NEMA corrections,
  published project/case-study facts, GardenCare coverage/programmes/commercial
  policies, and Vercel domains/deployment configuration.
- The **future Operations Workflow System** (lead intake / operational workflow):
  no public-site feature should be proposed as a stand-in for it.

Neither recommended defect fix (F-1, F-2) touches any of the above — both are
confined to public routing, public build config, and a public static asset.

---

## 8. Recommended next single workstream

**Recommend exactly one:** a bounded **Unknown-Route / Soft-404 Handling**
workstream (proposed id **BD-DISCOVERABILITY-01**), addressing finding **F-1**.

**What it would do (bounded scope):**

1. Add a catch-all React route (`path="*"`) rendering a proper "page not found"
   view with clear recovery links (home, services, projects, contact) and correct
   heading hierarchy.
2. Emit a not-found output carrying `<meta name="robots" content="noindex">` so
   unmatched paths are not indexable homepage duplicates.
3. Stop serving the homepage's HTML verbatim for arbitrary unmatched paths.

**Implementation is not a one-line change — it starts with a routing-design
question, not code.** A React catch-all plus a prerendered `/404` does **not**, on
its own, guarantee a true HTTP 404 on Vercel: the current
`vercel.json` rewrite (`"/(.*)" → "/"`) and the static/prerender model determine
the actual status code, and a rendered "NotFound" React view can still be served
with **HTTP 200**. The brief must first determine the correct Vercel /
static-routing design that **simultaneously preserves all** of the following:

- direct access to all **43 prerendered public routes** (unchanged status/content);
- the existing **deliberate legacy redirects** (`/services/eia-studies`,
  `/services/implementation`, `/services/maintenance`);
- normal **client-side navigation** within the SPA;
- a **helpful React NotFound view** for users;
- **`noindex`** on the not-found output;
- a **genuine HTTP 404** for arbitrary unknown URLs wherever Vercel supports it;
- **no homepage-duplicate fallback** for unmatched paths.

The brief **must test live HTTP status after deployment** and **must not** claim
the defect resolved if unknown URLs still return **HTTP 200** — even if a NotFound
message renders correctly. A rendered message without a 404 status is not a fix.

**Why this one:**

- **Verified, meaningful need** — demonstrated live (HTTP 200 + homepage title for
  a nonsense URL; empty `<main>` in a real browser). It is a genuine SEO
  (soft-404 / duplicate-content) and UX (dead-end) defect, not cosmetic.
- **Does not depend on immature analytics** — justified entirely by
  build/live evidence, independent of the pending baseline.
- **Requires no invented facts** — no copy, testimonials, project claims, or
  images are created.
- **Respects protected systems** — public routing/build/config only.
- **Bounded** — a well-scoped set of files (`src/App.jsx`,
  `scripts/prerender.mjs`/route authority, `vercel.json`, one new page component),
  gated by the existing 43/43 build check and by a **live post-deploy HTTP-status
  test** as the done-definition (not merely "a NotFound view renders").
- **Higher value than cosmetic cleanup** — it fixes crawlable duplicate-content
  exposure and a real visitor dead-end.

**Companion fix (not the workstream, no owner input):** finding **F-2** (the
2.26 MB blog image) is a **bounded, targeted single-asset optimization** — optimize
only that one file, preserve its displayed dimensions/aspect ratio and acceptable
quality, and verify the blog render and social/structured-data (`og:image`)
references still resolve. It is **not** a whole-library rewrite and no broad
image-mutation step should be wired into `build` without a separate audit of what
else it would change. It can be handled independently of BD-DISCOVERABILITY-01.

**If the owner prefers the smallest possible next step instead of a workstream:**
ship the F-2 targeted asset fix first (fastest measurable win), then schedule
BD-DISCOVERABILITY-01.

---

## 9. Explicitly NOT recommended now

- **Analytics Phase B / custom events** — BLOCKED on the Hobby plan (B-1).
- **Any Vercel plan upgrade** — not recommended or authorized.
- **Any conversion-rate or lead-volume change driven by the early snapshot** — the
  snapshot is non-decision-grade; no baseline exists (B-2). Prohibited.
- **Relabelling testimonials to "Client Reviews"** — needs owner verbatim
  confirmation (B-3).
- **Adding/altering project images or case-study facts** — needs owner assets;
  nothing may be fabricated (B-4).
- **Any change to `/admin`, Supabase, finance, project tracker, payments/Daraja,
  or the WhatsApp destination** — protected systems (§7).
- **A standalone cosmetic dead-code/refactor sweep** (F-3, F-4) — lower value than
  F-1; fold in opportunistically instead.
- **Converting SPA client redirects to true 301s or reworking the sitemap
  mechanism** — already consolidated under BD-ROUTE-AUTHORITY-01; not needed.

---

## 10. Headline findings by classification

- **VERIFIED DEFECT (2):** F-1 soft-404 / unknown-route handling; F-2 oversized
  2.26 MB blog hero image.
- **OPTIONAL ENHANCEMENT (3):** F-3 dead `SmartAdvisor.jsx`; F-4 hardcoded contact
  number; F-5 `WORKSTREAMS.md` BD-CODE-HYGIENE-01 status staleness.
- **EVIDENCE GAP (3):** B-2 production analytics baseline; B-3 verbatim
  testimonials; B-4 additional project imagery.
- **BLOCKED (1):** B-1 Analytics Phase B (Hobby plan).
- **ACCEPTED LIMITATION (5):** A-1…A-5 (per-instance rate limiter, SPA client
  redirects, disabled M-Pesa STK, inherited 20 lint errors, Fraunces serif).
- **COMPLETE:** truth/credentials, brand boundary, positioning, project-status
  honesty, GardenCare launch, route/sitemap authority, measurement Phase A,
  repository hygiene, dead area-icon data — all re-verified (§2).

**Items requiring owner evidence:** B-3 (verbatim testimonial wording), B-4
(additional project images). **Owner decision (not recommended):** B-1 (Vercel
plan upgrade). **Owner-gated evidence-gathering:** B-2 (let the production
baseline accumulate, then re-read filtered to Production).
