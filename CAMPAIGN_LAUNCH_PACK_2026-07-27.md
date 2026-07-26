# Campaign Launch Pack — Monday, 27 July 2026 (BD-CAMPAIGN-LAUNCH-01)

**Workstream:** BD-CAMPAIGN-LAUNCH-01 — Controlled Paid Campaign Launch Preparation.
**Status:** **Launch materials prepared — external campaign setup NOT performed; no
advert launched.** Dedicated SIM pending; register adoption pending; lead owner
pending; Google conversion measurement pending; creative approval pending.
**Baseline `main`:** `d9754faffcca8a3b4e4ad5ebad792478a3219c37`.

> Prepares launch materials and a final GO/NO-GO decision for Monday 27 July 2026. It
> **does not** configure or activate any external advertising account, change the
> contact number, install tracking, or launch anything.

## B3. Channel priority

- **Priority 1 — Instagram/Meta.** Primary initial prospecting channel: the previous
  small test produced genuine, varied landscaping enquiries. **Do not repeat the
  GardenCare-dominant proposition** — lead with landscape design & implementation.
- **Priority 2 — Google Search.** High-intent controlled Search only. **No Performance
  Max.**
- **Priority 3 — X (optional/secondary).** Either an organic portfolio-led post, or a
  very small separate paid test **only after owner approval**. X must **not** delay
  Instagram or Google Search, and its results are **measured separately** (never
  combined with Meta or Google).

## B4. Core propositions (two lanes)

### Lane A — Residential landscape design & implementation
Position: complete landscape design · garden installation · garden redesign/
rehabilitation · tropical & indigenous planting · mature, premium residential gardens.
Primary landing options: **Landscape Design service page**
(`/services/landscape-design`) · **Garden Implementation service page**
(`/services/garden-implementation`). Use only verified project evidence (Karen,
Muthithi).

### Lane B — Commercial & institutional landscaping
Position: commercial landscaping · institutional grounds · design, implementation and
ongoing landscape quality; hospitality/public-space capability **only where evidence
supports it**. Primary landing option: **Commercial/Institutional Landscaping service
page** (`/services/commercial-landscaping`). **Do not overclaim hospitality
case-study evidence** — there is no built hospitality case study in the repository.

## B5. Creative inventory audit (verified repository assets)

Provenance from `src/data/case-studies.js` + `PORTFOLIO_ASSET_AUDIT.md`. **Design
concepts must never be presented as built work; no transformation is fabricated.**

| File path | Project | Built/design status | Appropriate claim | Recommended channel | Recommended format | Evidence limitation |
|---|---|---|---|---|---|---|
| `public/projects/karen-garden.jpg` | Karen Residence | **Built / Implemented** (strong) | "Mature residential garden, Karen — designed & implemented by Botanique" | Meta Lane A · X | Single image / carousel cover | Established garden photo; premium residential |
| `public/projects/karen-fountain.jpg` | Karen Residence | **Built / Implemented** (strong) | "Fountain garden & mature borders, Karen" | Meta Lane A | Carousel frame | — |
| `public/projects/project-12.jpg` | Muthithi Gardens Estate | **Built (planting installation)** (strong) | "Entrance flower bed — planted (after)" | Meta Lane A · before/after | Before/after "after" frame | Final establishment to be confirmed |
| `public/projects/project-10.jpg` | Muthithi Gardens Estate | **Built (before state)** (strong) | "Entrance flower bed — before" | Meta Lane A · before/after | Before/after "before" frame | Documented before/after pair (captions) |
| `public/projects/project-22.jpg` | Muthithi Gardens Estate | **Built (perimeter planting)** | "Perimeter planting, Muthithi Gardens Estate" | Meta Lane A | Carousel frame | Confirm same estate phase |
| `public/projects/ksms-1.jpg` | KSMS Campus | **Built / Implemented** (moderate) | "Institutional campus grounds & lawn establishment — KSMS" | Meta Lane B · Google Lane B | Single image | Institutional, not hospitality |
| `public/projects/ksms-2.jpg` | KSMS Campus | **Built / Implemented** (moderate) | "Campus grounds, KSMS" | Meta Lane B | Carousel frame | General caption |
| `public/projects/ksms-3.jpg` | KSMS Campus | **Built / Implemented** (moderate) | "Campus grounds, KSMS" | Meta Lane B | Carousel frame | General caption |
| `public/projects/tsavo-skywalk.jpg` | Tsavo Skywalk | **Built / Implemented** (moderate) | "Entrance landscaping — designed, implemented & maintained 6 months" | Meta Lane B (capability) | Single image | Single photo only |
| `public/projects/project-37.jpg` | Zaara Park | **DESIGN CONCEPT ONLY** | "Design concept" **only** — never "built" | Not for prospecting adverts as built work | — | **Do not present as built** |
| `public/projects/project-16.jpg` | Serenity Homes Diani | **DESIGN CONCEPT ONLY** | "Coastal residential design concept" **only** | Not for prospecting adverts as built work | — | **Do not present as built** |

- **Before-and-after (only verified pair):** Muthithi entrance flower bed —
  `project-10.jpg` (before) → `project-12.jpg` (after). This is the **only** verified
  before/after in the repository; do not fabricate others.
- **Short video opportunity (owner-supplied media required):** a "Karen mature garden"
  walkthrough video is referenced in the campaign naming but is **not** in the
  repository — the founder must supply it before any video creative runs.

**Creative standards:** completed & mature projects first; restrained logo watermark;
no excessive contrast; **Quicksand** + official Botanique colours; minimal text; no
unsupported claim; **no GardenCare-dominant principal advert**.

## B6. Campaign naming & attribution (BD-LEADOPS-01 standard)

UTM standard: `utm_source` · `utm_medium` (`paid_social`/`cpc`/`organic_social`) ·
`utm_campaign` (`platform_objective_service_audience_period`) · `utm_content`
(creative/ad variant) · `utm_term` (keyword, Google only). **Landing context is
derived from the landing path/wizard source — `utm_content` is the creative, not the
landing page. No website UTM parsing is implemented.**

| Campaign | Source platform | Campaign name | Ad set / audience | Creative / variant | Keyword | Landing context | UTM example |
|---|---|---|---|---|---|---|---|
| Meta residential | Instagram | `meta_prospecting_landscape_design_residential_2026q3` | `Nairobi homeowners 30–60` | `karen_mature_garden_image_a` | N/A | Landscape Design service page | `utm_source=instagram&utm_medium=paid_social&utm_campaign=meta_prospecting_landscape_design_residential_2026q3&utm_content=karen_mature_garden_image_a` |
| Meta commercial | Instagram | `meta_prospecting_commercial_landscaping_2026q3` | `Commercial property decision-makers` | `ksms_campus_grounds_image_a` | N/A | Commercial Landscaping service page | `utm_source=instagram&utm_medium=paid_social&utm_campaign=meta_prospecting_commercial_landscaping_2026q3&utm_content=ksms_campus_grounds_image_a` |
| Google — Landscape Design | Google Search | `google_search_landscape_design_nairobi_2026q3` | `Landscape design — Nairobi` | `rsa_landscape_design_01` | `landscape designer nairobi` | Landscape Design service page | `utm_source=google&utm_medium=cpc&utm_campaign=google_search_landscape_design_nairobi_2026q3&utm_content=rsa_landscape_design_01&utm_term=landscape_designer_nairobi` |
| Google — Garden Implementation | Google Search | `google_search_garden_implementation_nairobi_2026q3` | `Garden implementation — Nairobi` | `rsa_garden_implementation_01` | `garden landscaping company kenya` | Garden Implementation service page | `utm_source=google&utm_medium=cpc&utm_campaign=google_search_garden_implementation_nairobi_2026q3&utm_content=rsa_garden_implementation_01&utm_term=garden_landscaping_company_kenya` |
| Google — Commercial | Google Search | `google_search_commercial_landscaping_nairobi_2026q3` | `Commercial landscaping — Nairobi` | `rsa_commercial_landscaping_01` | `commercial landscaping nairobi` | Commercial Landscaping service page | `utm_source=google&utm_medium=cpc&utm_campaign=google_search_commercial_landscaping_nairobi_2026q3&utm_content=rsa_commercial_landscaping_01&utm_term=commercial_landscaping_nairobi` |
| X (optional) | X | `x_organic_landscape_design_residential_2026q3` (organic) / `x_test_landscape_design_residential_2026q3` (paid) | `Portfolio audience` | `karen_mature_garden_image_a` | N/A | Landscape Design service page | organic: `utm_source=x&utm_medium=organic_social&utm_campaign=x_organic_landscape_design_residential_2026q3&utm_content=karen_mature_garden_image_a` |

## B7. Meta/Instagram structure (recommendation, not configuration)

- **Objective:** leads/engagement via **messaging → website-to-WhatsApp** (the
  qualification wizard is the controlled path).
- **Residential audience concept:** Nairobi homeowners ~30–60; interests in home
  improvement, real estate, gardening; Nairobi metro + affluent estates.
- **Commercial audience concept:** commercial property managers, hospitality/estate
  decision-makers, facilities roles; Nairobi metro.
- **Geography:** Nairobi & service area.
- **Placement:** Instagram + Facebook feeds/stories/reels (Advantage+ placements
  acceptable for a small prospecting test).
- **Destination:** **website service page → QuoteWizard → WhatsApp** (preferred).
- **Creative variants:** Lane A — Karen mature garden + Muthithi before/after; Lane B
  — KSMS campus + Tsavo capability.
- **Primary text / headline / CTA:** see §B14.
- **Qualification path:** wizard enforces service/location/size/budget before WhatsApp.
- **Manual-register attribution:** every enquiry logged with Source platform, Campaign,
  Ad set/audience, Creative/variant, Landing context (BD-LEADOPS-01 register).
- **Native lead form:** permitted **only** if it reproduces Service · Location ·
  Approximate size · Budget · site-context/photos follow-up, and feeds the same
  register/process. A **name-and-phone-only form is unacceptable.** Website-to-WhatsApp
  remains preferred unless evidence supports otherwise.

## B8. Google Search structure (high-intent only; NO Performance Max)

### Landscape Design → `/services/landscape-design`
- Keywords (phrase/exact preferred): `"landscape designer nairobi"`, `[landscape
  design nairobi]`, `"landscape design company kenya"`, `"garden designer nairobi"`.
- Negatives (starter): `free`, `jobs`, `courses`, `salary`, `diy`, `tenders`,
  `internship`, `nptc`, `software`, `games`.
- RSA headlines/descriptions: see §B14.
- Destination: Landscape Design service page → wizard. Call/WhatsApp: see §B12 gate.

### Garden Implementation → `/services/garden-implementation`
- Keywords: `"garden landscaping company kenya"`, `"landscaping company nairobi"`,
  `"garden installation nairobi"`, `[landscaping contractor nairobi]`.
- Negatives: as above + `equipment`, `supplies`, `nursery`.

### Commercial / Institutional → `/services/commercial-landscaping`
- Keywords: `"commercial landscaping nairobi"`, `"institutional grounds maintenance
  kenya"`, `[commercial landscaping company kenya]`.
- Negatives: as above + `residential` (where separating from Lane A intent).

**Do NOT prepare Google campaigns yet for weak destinations:** lawn establishment/
replacement · garden rehabilitation as a standalone Search campaign · hospitality-
specific · tropical/indigenous-specific. **No Performance Max.**

## B9. X pack

- **Organic post copy:** "A mature garden in Karen — designed, planted and grown in by
  Botanique Designers. Landscape design & implementation across Nairobi. See more:
  {link}" (link → Landscape Design service page with the X organic UTM).
- **Optional paid-test version:** same copy; requires owner approval; small separate
  budget (§B13); measured **separately**.
- **Image:** `public/projects/karen-garden.jpg` (verified built, strong).
- **Campaign/source:** `x_organic_landscape_design_residential_2026q3` (organic) /
  `x_test_...` (paid); UTMs in §B6.
- X is **supplementary** and must be measured separately — never combined with Meta or
  Google results.

## B10. Monday lead-operation adoption checklist (before any advert goes live)

- [ ] Copy/import the 37-column register (`templates/BOTANIQUE_LEAD_REGISTER.csv`) into
  the chosen daily working sheet (Google Sheets/Excel).
- [ ] Confirm it contains **no client data** until real leads arrive.
- [ ] Confirm the next **Lead ID** (`BD-LEAD-2026-NNN`).
- [ ] Confirm an **actual named lead owner** (no placeholder).
- [ ] Confirm who provides **backup**.
- [ ] Confirm each channel/campaign/creative name (§B6).
- [ ] Confirm the response templates (`LEAD_OPERATIONS_PLAYBOOK.md` §9) are accessible.
- [ ] Confirm every open lead receives: **Owner · Stage · Next follow-up date ·
  Source · Campaign · Creative/ad variant.**

**The register is not "operational" until these steps are completed.**

## B11. Dedicated SIM gate (UNMET)

- Dedicated Botanique number = **public acquisition line**; existing `0720 861 592` =
  **founder/client line**. **The new business number has not been supplied.**
- **Do not invent it. Do not perform BD-CONTACT-SIM-01. Do not silently use the founder
  number as the campaign number.** Gate is **UNMET** unless the founder supplies the
  number before launch.
- **Prepared (not executed) cutover steps** — under a future authorised
  BD-CONTACT-SIM-01, once supplied: update `CONTACT` in `src/utils/backend.js`
  (authoritative) → static `index.html` telephone JSON-LD → `server/index.js`
  prompt/fallback → dead `SmartAdvisor.jsx` (or remove) → external: WhatsApp Business,
  Instagram, Facebook, Google Business Profile, Google/Meta Ads, directories,
  catalogue, email signatures, quotation/invoice templates, bios, vehicle branding.

## B12. Measurement gate

- **Instagram/Meta:** a small controlled prospecting test may proceed **only when**
  the SIM/WhatsApp gate is met, lead owner confirmed, register operational, source/
  campaign/creative naming complete, and creative approved. **Manual commercial
  reconciliation** (register ↔ Simple Invoice Manager) is acceptable for the initial
  small test; **full Meta measurement remains required before scaling or retargeting.**
- **Google Search: NO-GO until trustworthy conversion measurement is ready.** Required
  external/account information: Google Ads account/campaign access · conversion-action
  decision (wizard→WhatsApp handoff, `tel:` click, form) · conversion ID/label or an
  approved GTM approach · consent/privacy decision · a test-conversion method. **Do
  not add tags or cookies without a separately reviewed implementation authority**
  (`MEASUREMENT_PLAN.md`).
- **X:** same manual register + UTMs. **Impressions/engagement are not a commercial
  result.**

## B13. Budget authority

**No approved future advertising budget exists in the repository.** The only recorded
figures are **historical spends** from the prior tests (context only, not approved
future budgets): Meta ≈ **USD 30** (≈ USD 5/day × 6 days); Google PMax ≈ **USD 32.35**
(`CAMPAIGN_READINESS_AUDIT.md` §3). No new budget is invented here.

| Parameter | Meta prospecting (small test) | Google Search | X (optional) |
|---|---|---|---|
| Daily budget | **OWNER DECISION REQUIRED** | OWNER DECISION REQUIRED (after measurement) | OWNER DECISION REQUIRED |
| Campaign duration | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Total maximum spend | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED | OWNER DECISION REQUIRED |
| Stop-loss rule | Proposed: pause if 0 qualified leads after an agreed spend threshold (owner to set) | N/A until GO | Proposed: cap small |
| Scale rule | Proposed: only scale on decision-grade KPIs (cost per qualified lead / assessment), not vanity metrics | N/A until GO | N/A |

## B14. Ad-copy pack (evidence-based; nothing published)

### Meta — residential (Lane A)
Primary text (3):
1. "Thinking about transforming your garden? We design and build mature, low-fuss
   landscapes across Nairobi — rooted in plant science. Tell us about your space."
2. "From bare ground to a garden you actually use. Botanique Designers handles design,
   planting and implementation — see how we can help with yours."
3. "A garden designed for Nairobi's soil and climate, built to last. Share a few
   details and photos and we'll advise the best next step."
Headlines (3): "Landscape design & implementation, Nairobi" · "Gardens designed and
built to last" · "Your garden, properly designed". CTA: **Send Message** or **Learn
More**.

### Meta — commercial (Lane B)
Primary text (3):
1. "Commercial and institutional grounds that reflect your organisation. Botanique
   Designers designs, implements and maintains landscape quality across Nairobi."
2. "Campus, estate or commercial grounds? We deliver landscape design and
   implementation with ongoing quality. Let's discuss your site."
3. "Professional landscaping for commercial and institutional properties in Nairobi —
   design, implementation and upkeep."
Headlines (3): "Commercial & institutional landscaping" · "Grounds that make an
impression" · "Landscape design for organisations". CTA: **Send Message** / **Learn
More**.

### Google Search RSA (per campaign — up to 15 headlines / 4 descriptions; keep evidence-based)
**Landscape Design:** Headlines — "Landscape Designer Nairobi" · "Landscape Design &
Build" · "Rooted in Plant Science" · "Gardens Designed for Kenya" · "Design &
Implementation" · "Mature, Premium Gardens" · "Residential Landscape Design" ·
"Nairobi Landscape Studio" · "From Concept to Planted" · "Book a Site Assessment" ·
"Tropical & Indigenous Planting" · "Estate & Home Gardens" · "Talk to Our Designers" ·
"Landscape Design Experts" · "Serving Nairobi & Metro". Descriptions — "Landscape
design and implementation across Nairobi, rooted in plant science." · "From concept
and master plan to planting and build. Tell us about your project." · "Mature,
low-maintenance gardens designed for Kenya's soil and climate." · "Start a project
enquiry — we'll advise the best next step." Keyword clusters: {landscape designer,
landscape design company, garden designer} × {nairobi, kenya}. Negatives: free · jobs
· courses · salary · diy · software.

**Garden Implementation:** Headlines — "Garden Landscaping Nairobi" · "Landscaping
Company Kenya" · "Garden Installation Experts" · "Design & Build Gardens" · "Planting &
Hardscape" · "Irrigation & Lawns" · "From Plan to Planted" · "Professional Garden
Build" · "Nairobi Landscaping Team" · "Quality Garden Implementation" · "Book a Site
Assessment" · "Estate & Home Gardens" · "Experienced Landscapers" · "Talk to Our Team"
· "Serving Nairobi & Metro". Descriptions — "Full garden implementation: planting,
irrigation, lawns and hardscape." · "Experienced Nairobi landscaping team — design to
build." · "Tell us about your site and we'll advise the next step." · "Built to last,
rooted in plant science." Clusters: {garden landscaping, landscaping company,
landscaping contractor, garden installation} × {nairobi, kenya}. Negatives: supplies ·
equipment · nursery · jobs · diy.

**Commercial/Institutional:** Headlines — "Commercial Landscaping Nairobi" ·
"Institutional Grounds Kenya" · "Campus & Estate Grounds" · "Design & Implementation" ·
"Professional Landscaping" · "Grounds That Impress" · "Commercial Garden Build" ·
"Ongoing Landscape Quality" · "Nairobi Landscaping Firm" · "For Organisations & Estates"
· "Book a Site Assessment" · "Experienced Landscape Team" · "Talk to Our Team" ·
"Serving Nairobi & Metro" · "Landscape Design & Build". Descriptions — "Commercial and
institutional landscaping across Nairobi — design, build and quality." · "Campus,
estate and commercial grounds delivered professionally." · "Tell us about your site and
we'll advise the next step." · "Experienced team; rooted in plant science." Clusters:
{commercial landscaping, institutional grounds, grounds maintenance} × {nairobi,
kenya}. Negatives: residential · jobs · free · diy.

### X
- Organic: see §B9.
- Optional paid-test: same copy; owner-approved; measured separately.

## B15. GO / NO-GO matrix

| Channel | Status | Reason |
|---|---|---|
| Instagram residential | **CONDITIONAL GO** | Ready once SIM/WhatsApp, named owner, operational register, naming complete, creative approved (§B12). |
| Instagram commercial | **CONDITIONAL GO** | Same gates; use KSMS/Tsavo evidence only (no hospitality overclaim). |
| Google Landscape Design Search | **NO-GO** | Blocked on trustworthy conversion measurement (§B12) + universal gates. |
| Google Garden Implementation Search | **NO-GO** | Same. |
| Google Commercial Search | **NO-GO** | Same. |
| Google Performance Max | **NO-GO** | Not recommended; no trustworthy conversion inputs. |
| X organic | **CONDITIONAL GO** | Ready when creative + link approved; measured separately. |
| X paid | **OWNER ACTION REQUIRED** | Optional/secondary; owner approval + small separate budget. |
| Meta retargeting | **NO-GO** | Requires full Meta measurement + audience/consent readiness. |

Cross-cutting **OWNER ACTION REQUIRED / EXTERNAL ACCOUNT ACTION REQUIRED:** dedicated
SIM (§B11), WhatsApp Business, named lead owner, register adoption, creative approval,
budgets (§B13), Google Ads account + conversion measurement (§B12). **No GO is forced
to meet the calendar date.**

## B16. Owner action sheet — Sunday, 26 July 2026

| # | Action | Owner | Deadline | Evidence required | Gate unlocked |
|---|---|---|---|---|---|
| 1 | Supply dedicated SIM number | Founder | Sun 26 Jul | Number in intl + display format | SIM gate (§B11) |
| 2 | Configure WhatsApp Business | Founder/Ops | Sun 26 Jul | Live business profile + labels | WhatsApp gate |
| 3 | Confirm named lead owner | Founder | Sun 26 Jul | Named person (not placeholder) | Ownership gate (§B10) |
| 4 | Confirm backup owner | Founder | Sun 26 Jul | Named backup | Cover gate |
| 5 | Adopt register in Sheets/Excel | Ops owner | Sun 26 Jul | 37-col sheet, no client data, next Lead ID | Register operational |
| 6 | Approve Meta creative | Founder | Sun 26 Jul | Approved Lane A/B assets (§B5) | Creative gate |
| 7 | Approve campaign budgets | Founder | Sun 26 Jul | Daily/duration/max/stop-loss (§B13) | Budget gate |
| 8 | Provide Google Ads conversion/account details | Founder | Before Google GO | Account access + conversion decision (§B12) | Google Search gate |
| 9 | Confirm X organic-only or paid | Founder | Sun 26 Jul | Decision recorded | X path |
| 10 | Confirm launch time | Founder | Sun 26 Jul | Time on Mon 27 Jul | Launch scheduling |

**Do not record an unconfirmed person as owner.**

---

## Summary decision (authority-aligned)

- **Meta prospecting (residential + commercial): CONDITIONAL GO** — proceed with a
  small controlled test once the operational gates (SIM, WhatsApp Business, named
  owner, operational register, naming, approved creative) are met; manual
  reconciliation acceptable initially.
- **Google Search: NO-GO** until trustworthy conversion measurement is ready.
- **Performance Max: NO-GO. Meta retargeting: NO-GO.**
- **X organic: CONDITIONAL GO** (creative/link approval). **X paid: optional/owner
  action; not a priority.**
