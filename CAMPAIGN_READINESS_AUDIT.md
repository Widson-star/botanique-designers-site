# Campaign Performance & Revenue-Conversion Readiness Audit — BD-CAMPAIGN-READINESS-01

**Workstream:** BD-CAMPAIGN-READINESS-01 — Campaign & Revenue-Conversion Readiness
(new workstream; audit/documentation only)
**Status:** Audit complete — documentation only. **No implementation started.**
No advertising tags, pixels, analytics events, landing pages, CRM, Google Business
Profile edits, directory purchases, external-account changes, or creative
production were performed.
**Baseline `main`:** `752c80fb022705a4f3407f6f66855e6fd4522fbc`
(`BD-CONVERSION-02: enforce enquiry qualification before WhatsApp handoff (#23)`).

> **Authority note.** This audit does not change and is not authoritative for the
> enquiry journey (`WORKSTREAMS.md` BD-CONVERSION-01/02), website analytics
> (`MEASUREMENT_PLAN.md` BD-MEASUREMENT-01), GardenCare commercial policy
> (`GARDENCARE_PRODUCT_DEFINITION.md`), or any protected system. It records
> readiness, gaps, decisions, and a sequenced programme only.

---

## 1. Executive decision

Botanique Designers has **proven demand** for its wider landscape services (from a
small GardenCare-led Instagram test) but is **not yet ready to scale paid
advertising for decision-grade commercial outcomes**. The website enquiry pathway
is now sound after BD-CONVERSION-02 (all new-project intent flows through the
qualification wizard; source context is captured), but the **downstream conversion
chain cannot currently be measured**: there is no cost-per-qualified-lead, no
cost-per-assessment, no quotation/awarded-project/revenue attribution, and custom
analytics events are blocked on the current Vercel plan.

Recommended posture:

- **Do not repeat or scale** the GardenCare-led creative or Google Performance Max.
- **Fix the conversion-measurement foundation first** (dedicated SIM + WhatsApp
  Business, a manual lead register, a campaign source/UTM standard, and a
  conversion-tracking decision) **before** meaningful ad spend.
- Then run **small, controlled** campaigns — Meta residential prospecting and
  tightly-scoped high-intent Google Search — separating **residential** from
  **commercial/hospitality** intent, and judge them on **commercial KPIs**, not
  impressions/clicks/CPC.

The next principal campaign should lead with **landscape design & implementation**
(the core mandate), not GardenCare (a supporting product).

---

## 2. Authoritative business objective

The campaign must maximise **commercial utility**, not diagnostic vanity metrics.
The conversion chain to optimise:

```
Advert → relevant landing path → qualified enquiry → site assessment
       → quotation → awarded project → revenue & gross margin
```

Principal positioning (campaign themes): Landscape Design; Landscape Implementation;
Garden Installation; Planting Works; Lawn Establishment/Replacement; Garden
Rehabilitation; Tropical Gardens; Indigenous Gardens; Residential Landscaping;
Commercial Landscaping; Hospitality Landscaping. **GardenCare is a supporting
product and must not define the next principal campaign.**

Vanity/diagnostic metrics (impressions, reach, views, CTR, CPC, profile visits,
follows, WhatsApp opens) are **supporting signals only** — never the success
measure.

---

## 3. Campaign evidence supplied

### 3.1 Instagram (Meta) — GardenCare-led promotion

| Item | Value |
|---|---|
| Proposition | GardenCare-led (maintenance) |
| Spend | ≈ USD 5/day × 6 days ≈ **USD 30** |
| Views | 9,501 |
| Reach | 4,112 |
| Profile visits | 60 |
| Follows | 18 |
| WhatsApp enquiries | Multiple (types below) |
| Enquiry types | Landscape implementation; construction-site landscaping; lawn replacement; commercial landscaping; residential garden redesign; consultations; GardenCare/maintenance |

**Proven:** genuine demand exists for Botanique's **wider** landscape services; the
commercial opportunity is **broader than GardenCare**; a very small spend produced
real, varied enquiries.

**Not proven:** cost per **qualified** lead, per assessment, per quotation, per
awarded project, or revenue/ROAS. Profile visits, follows and message opens are
supporting signals only. The specific GardenCare creative/proposition should **not**
simply be repeated.

### 3.2 Google Ads — "Monthly Garden Maintenance Nairobi" (Performance Max)

| Item | Value |
|---|---|
| Campaign type | Performance Max |
| Impressions | 15,853 |
| Clicks | 1,555 |
| CTR | 9.81% |
| Spend | USD 32.35 |
| CPC | ≈ USD 0.02 |
| Recorded conversions | 0 |

**Proven:** traffic was **cheap**; the ad served and was clicked.

**Not proven:** that the clicks were **commercially valuable**. Conversion tracking
was **not correctly configured**, so **0 recorded conversions is not evidence that
no enquiries occurred**. Cheap CPC is **not** a success metric. Performance Max
should **not** be repeated/scaled until trustworthy conversion inputs exist; the
next Google campaign should favour **tightly-controlled high-intent Search**.

> No leads, quotations, revenue, or ROAS are invented anywhere in this audit.

### 3.3 What is proven vs not proven (summary)

- **Proven:** demand for the full landscape offer (Instagram); low CPC is achievable
  (Google); the website now funnels project intent through qualification
  (BD-CONVERSION-02).
- **Not proven:** any downstream commercial result — qualified-lead cost, assessment
  rate, quotation value, win rate, revenue, gross margin, or ROAS for either channel.

---

## 4. Website & landing-path audit (post BD-CONVERSION-02)

### 4.1 Conversion pathway — verified strengths

- Qualification enforced: all new-project intent enters the six-step wizard; final
  guard requires Service, Location, approximate Size, Budget.
- Service prefill from authoritative data on service/project pages;
  `Consultation & Site Assessment` preselected from Ask Botanique.
- Human-readable **enquiry source** carried from every controlled entry point.
- Mobile-usable modal; paid-consultation handoff intact (`PaidConsultancyModal`).
- Project/service relevance and general-contact separation preserved.
- Budget qualification (provisional ranges) and a photos/video request in the
  WhatsApp message.

### 4.2 Conversion pathway — remaining gaps (NOT implemented here)

- **Property/site type** not captured in the wizard.
- **Project timeline** not captured.
- **Client telephone** not captured in the wizard (WhatsApp carries the number, but
  it is not in the enquiry record).
- **Service granularity** is broad (7 wizard options) — fine for triage, coarse for
  campaign-theme attribution.
- **No campaign-parameter (UTM) handling** — the wizard `source` is set from the
  in-app entry point, **not** from ad URL parameters, so ad-campaign attribution is
  not automatic.
- **No dedicated campaign landing pages**; **no confirmation/thank-you state** after
  the WhatsApp handoff.

### 4.3 Advert theme → best existing destination

| Campaign theme | Best existing destination | Exists? | Intent match | CTA → wizard? | Portfolio support | Dedicated LP needed? |
|---|---|---|---|---|---|---|
| Landscape Design | `/services/landscape-design` | Yes | Strong | Yes | Strong (Karen, KSMS) | Optional |
| Landscape Design **&** Implementation | none combined; `/services/landscape-design` + `/services/garden-implementation` | Partial | Split across two pages | Yes | Strong (Tsavo built) | **Recommended** |
| Garden Installation & Planting Works | `/services/garden-implementation` | Partial | Approx (implementation-led) | Yes | Moderate | Recommended |
| Lawn Establishment/Replacement | `/services/lawn-care` (maintenance-oriented) | Partial | **Mismatch** (care ≠ new lawn) | Yes | Weak (no lawn-transformation imagery) | **Recommended** |
| Garden Rehabilitation/Redesign | none dedicated; `/services/landscape-design` | **No** | Weak | Yes | Moderate (Karen redesign) | **Recommended** |
| Commercial Landscaping | `/services/commercial-landscaping` | Yes | Strong | Yes | Moderate (KSMS, Tsavo) | Optional |
| Hospitality Landscaping | `/services/commercial-landscaping` (combined C/I/H) | Partial | Approx (shared page) | Yes | Weak (no hospitality case study) | Recommended |
| Tropical / Indigenous Gardens | none dedicated; `/services/ecological-planting-design` closest | Partial | Approx | Yes | Weak (no tagged imagery) | Recommended |
| GardenCare (supporting) | `/gardencare` | Yes | Strong | Yes | Moderate | No |

**Homepage as a landing page reduces relevance** for a specific ad theme — sending
paid traffic to `/` should be avoided in favour of the closest matched page (or a
dedicated LP once built). Building/repairing pages is **out of scope for this audit**
and is sequenced in §13 Phase 3.

---

## 5. Measurement & attribution gaps

Current authority (`MEASUREMENT_PLAN.md`): **Vercel pageviews are active**; custom
`track()` events are **BLOCKED** (Vercel **Hobby** plan); **no Meta Pixel, Google
tag/GTM, GA4, cookies, or advertising measurement** has been approved or added.

Decisions required **before** any implementation (none taken here):

1. **Google Ads conversion actions** — which actions count (wizard completion →
   WhatsApp handoff, `tel:` click, WhatsApp click) and how they are recorded.
2. **Google tag vs GTM** — a tagging approach must be chosen; both introduce
   cookies/consent implications.
3. **Consent & privacy** — the site currently sets **no tracking cookies and shows
   no consent UI**. Any ad pixel/GA/GTM would change that and require a consent
   review before launch.
4. **Meta: Pixel vs Conversions API vs native lead forms** — native lead forms
   avoid site pixels but bypass the qualification wizard; a pixel/CAPI needs the
   consent review above.
5. **WhatsApp click vs qualified enquiry** — a WhatsApp click is an **intent
   signal, not a qualified lead**; the two must never be conflated.
6. **Phone-call conversion** — whether/how `tel:` clicks or calls are counted.
7. **Site-assessment booking, quotation, and project outcome** — these live in the
   **protected finance/project-tracker systems** and can only be reconciled
   **manually** (see §7 lead register) until an Operations Workflow exists.
8. **Campaign-specific UTMs** — a naming standard is required so ad traffic can be
   attributed; the wizard would need to read UTM params (a future enhancement) to
   automate it.
9. **Manual source capture (interim control)** — until events/UTMs exist, the
   readable `Enquiry source` line + the manual lead register (§7) are the interim
   attribution mechanism.

> **Rule:** WhatsApp clicks/opens must **never** be presented as qualified leads or
> revenue. Custom events remain blocked; do not open a `track()` PR merely to enable
> campaigns.

---

## 6. Dedicated Botanique SIM & WhatsApp Business readiness

**Approved operating decision (recorded):**

- A **dedicated Botanique Designers SIM** will become the **public business number**.
- The existing founder number `0720 861 592` / `+254 720 861 592` remains **Widson's
  direct founder/client number**.
- The **new public number has not yet been supplied.**
- Website, Instagram, Google Business Profile, adverts, directories and **WhatsApp
  Business** should eventually use the dedicated number; qualified leads/active
  projects may be **escalated** to the founder number where appropriate.

**WhatsApp Business readiness (owner action, external account):** business profile,
greeting message, absence message, quick replies, catalogue (where appropriate),
labels, staff access, lead ownership, response standards, and a SIM-transition
inventory are all **not yet set up**. **Do not invent or change the number.**

**SIM-transition inventory in this repo** (must change at swap — see
`WORKSTREAMS.md` BD-CONVERSION-02): central `CONTACT` in `src/utils/backend.js`
(authoritative); static `index.html` telephone JSON-LD; `server/index.js` prompt &
fallback; and the dead `src/components/SmartAdvisor.jsx` (if not first removed).

---

## 7. Minimum viable manual lead register (definition only)

A spreadsheet-grade register to operate **before** any CRM. **No CRM/database
persistence is built in this phase.**

Fields: Lead date · Name · Telephone · Source platform · Campaign · Landing/source
context · Service · Location · Budget · Project size · Qualification status · Photos
received · Assessment proposed · Assessment booked · Assessment paid · Quotation
issued · Quotation amount · Outcome · Revenue · Estimated gross margin · Lost reason
· Follow-up date · Owner.

This register is the **interim source of truth** for the commercial KPIs in §12 and
for reconciling ad spend to revenue until measurement events exist.

---

## 8. Lead-handling principle (recorded)

- Replies must be **short** and sound like **Botanique/Widson replying directly** —
  not a long consultant essay.
- **Do not** ask vague prompts ("Tell me more"). Use what the website already
  supplied (service, location, size, budget, site context, source).
- Ask only for **missing essentials**; move qualified prospects toward **photos →
  assessment → quotation → implementation**.

**Minimum response stages / WhatsApp labels:** `New` → `Qualifying` →
`Assessment proposed` → `Assessment booked` → `Assessment paid` → `Quoted` →
`Won` / `Lost` / `Nurture`. (Labels operate in WhatsApp Business once the dedicated
number is live.)

---

## 9. Google Business Profile & local authority (known gaps — no edits here)

- Primary **category may be wrong** (should reflect landscape designer/architect).
- **Directions** appear overly prominent (consistent with a service-area business
  that has no walk-in office).
- **Few reviews**; a **review-generation process** is required.
- **No confirmed staffed public office** → **service-area-business (SAB)** setup and
  requirements apply.
- **Dedicated number pending** (see §6).
- Services list and **project photos need optimisation**.

**No Google Business Profile edits are made in this repository audit.**

---

## 10. Directories & citations (assessment only)

| Directory | SEO/citation | Authority | Referral traffic | Direct leads |
|---|---|---|---|---|
| Realtor Kenya | Low–Med | Med (property audience) | Possible | Unproven |
| Apple Business Connect | Med (maps/citation) | Med | Low | Unproven |
| Yellow Pages Kenya | Low–Med | Low–Med | Low | Unproven |
| BusinessList Kenya | Low | Low | Low | Unproven |
| Property/construction/architecture/hospitality directories | Med (relevance) | Med | Possible | Unproven |

Value must be **separated**: citation/SEO consistency (NAP) vs authority vs referral
vs direct leads. **Do not recommend paid directory membership** without first
defining the evidence that would justify it (e.g. tracked referral enquiries in the
lead register attributable to that directory over a defined window).

---

## 11. Creative-production readiness

**Minimum creative set for the next campaign** (verified/completed work first):
Residential transformation · Mature established garden · Lawn establishment/
replacement · Tropical or indigenous planting · Commercial/hospitality capability ·
Before-and-after video · Client proof/testimonial **where verified**.

**Current inventory (from repo evidence):** strong residential (Karen), estate
before/after (Muthithi — the only confirmed before/after pair), institutional (KSMS),
built design+implementation (Tsavo). **Weak/absent:** lawn-transformation imagery,
tagged tropical/indigenous imagery, a hospitality case study, and **verified**
testimonial wording ("Client Feedback" wording is intentionally soft pending
verbatim confirmation).

**Creative standards:** completed & mature projects first; subtle Botanique
branding; Quicksand + official brand colours; restrained logo watermark; no
excessive contrast; no construction-heavy advert unless implementation is the theme;
**no GardenCare-dominant next campaign**; no unsupported claims; no overcrowded text.

**No creative is produced in this phase.**

---

## 12. Commercial KPIs (decision-grade) vs diagnostic metrics

**Decision-grade (judge campaigns on these):** Cost per qualified lead ·
Qualification rate · Cost per booked assessment · Assessment booking rate ·
Assessment-to-quotation rate · Quotation-to-win rate · Average quotation value ·
Attributed revenue · Gross margin · ROAS · Lost-lead reasons.

**Diagnostic only (never the success measure):** impressions · reach · views · CTR ·
CPC · profile visits · follows.

Until measurement events exist, decision-grade KPIs are computed **manually** from
the §7 lead register reconciled against the protected finance/project systems.

---

## 13. Readiness matrix

Status legend: **Ready** · **Partially ready** · **Not ready** · **Blocked** ·
**Owner action** · **External-account action**.

| Work area | Evidence | Status | Defect / gap | Commercial risk | Required action | Owner / workstream | Blocking? | Before IG? | Before Google? | Verification |
|---|---|---|---|---|---|---|---|---|---|---|
| Website qualification funnel | BD-CONVERSION-02 merged `752c80f`, prod-verified | **Ready** | Minor (no site-type/timeline/phone/UTM) | Low | None to launch | BD-CONVERSION-02 (done) | No | No | No | Live prod checks (done) |
| Enquiry source context | Source on all entry points | **Ready** | Not from UTM params | Low–Med | Add UTM read (later) | BD-CONVERSION-0x | No | No | No | Wizard message shows source |
| Landing-path relevance (residential) | `/services/landscape-design` etc. | **Partially ready** | Design/impl split; no LP; homepage generic | Med | Match ads to closest page; consider LP | New (Phase 3) | No | **Recommended** | **Recommended** | Ad→page intent review |
| Landing-path relevance (commercial/hospitality) | `/services/commercial-landscaping` | **Partially ready** | Hospitality shares page; weak evidence | Med | Separate intent; evidence | New (Phase 3) | No | Recommended | Recommended | Ad→page review |
| Lawn / rehabilitation themes | `/services/lawn-care` (care ≠ establishment) | **Not ready** | No matching page/imagery | Med | Build/repair page + creative | New (Phase 3) | No | If themed | If themed | Page + imagery exist |
| Conversion measurement (Google) | `MEASUREMENT_PLAN.md`; PMax 0 conv | **Not ready** | No conversion tracking configured | **High** | Decide conversion actions + tagging + consent | New / measurement | **Yes (Google)** | No | **Yes** | Test conversion fires |
| Conversion measurement (Meta) | No Pixel/CAPI | **Not ready** | No Meta measurement | Med–High | Decide Pixel/CAPI/lead-form + consent | New / measurement | **Yes (scale)** | For scale | No | Test event / lead receipt |
| Custom on-site events | Vercel Hobby | **Blocked** | Plan gate | Med | Owner upgrade + brief (not recommended now) | BD-MEASUREMENT-01 Phase B | No | No | No | Plan tier |
| Dedicated SIM | Owner decision recorded; number pending | **Owner action** | Number not supplied | **High** | Supply SIM number | Owner | **Yes** | **Yes** | **Yes** | Number provided |
| WhatsApp Business setup | Not configured | **External-account action** | No profile/labels/quick replies | High | Configure after SIM | Owner | **Yes** | **Yes** | **Yes** | Business profile live |
| Manual lead register | None | **Not ready** | No lead capture/attribution | **High** | Stand up register (§7) | Owner | **Yes** | **Yes** | **Yes** | Register in use |
| Campaign source/UTM standard | None | **Not ready** | No attribution convention | Med–High | Define UTM/source naming | New | **Yes** | **Yes** | **Yes** | Standard documented |
| Lead-response ownership & follow-up | Principle recorded (§8) | **Partially ready** | No staffed rota/SLA | Med | Assign owner + response standard | Owner | **Yes** | **Yes** | **Yes** | Named owner + SLA |
| Creative inventory | Repo assets | **Partially ready** | Weak lawn/tropical/hospitality/before-after | Med | Produce residential + commercial sets | New (Phase 4) | No | **Recommended** | Optional | Assets approved |
| Google Business Profile | Known gaps (§9) | **Not ready** | Category/reviews/SAB/number | Med | Correct after SIM; reviews process | Owner (external) | No | No | Recommended | GBP corrected |
| Directories/citations | §10 | **Not ready** | No NAP consistency plan | Low–Med | NAP plan; no paid spend yet | Owner | No | No | No | Citations consistent |
| BD-CONVERSION-02 production verification | Done (§Phase A) | **Ready** | — | — | — | Done | **Yes** | **Yes** | **Yes** | Prod checks (done) |

---

## 14. Campaign launch gates

Mandatory-before-launch decision for each, split by channel.

| # | Gate | Instagram/Meta | Google Search | Performance Max | Retargeting |
|---|---|---|---|---|---|
| 1 | BD-CONVERSION-02 production verification | ✅ met | ✅ met | ✅ met | ✅ met |
| 2 | Dedicated Botanique SIM | **Required** | **Required** | Required | Required |
| 3 | WhatsApp Business setup | **Required** | **Required** | Required | Required |
| 4 | Manual lead register | **Required** | **Required** | Required | Required |
| 5 | Campaign source/UTM standard | **Required** | **Required** | Required | Required |
| 6 | Google conversion measurement | n/a | **Required** | **Required** | Recommended |
| 7 | Meta conversion/lead measurement | Recommended (min); **Required to scale** | n/a | n/a | **Required** |
| 8 | Residential landing relevance | Recommended | **Required** | Required | Recommended |
| 9 | Commercial/hospitality landing relevance | Recommended | **Required** (if themed) | Required | Recommended |
| 10 | Creative inventory | **Required** | Optional (Search) | Required | **Required** |
| 11 | GBP correction | Optional | Recommended | Recommended | Optional |
| 12 | Review collection | Recommended | Recommended | Recommended | Optional |
| 13 | Lead-response ownership | **Required** | **Required** | Required | Required |
| 14 | Follow-up routine | **Required** | **Required** | Required | Required |

**Performance Max:** additionally gated on **trustworthy conversion inputs** (gate
6) — **do not run until conversion evidence exists.** **Retargeting:** gated on Meta
measurement (gate 7) and audience/consent readiness.

---

## 15. Recommended phased programme

**Phase 1 — Conversion foundation** (mostly owner/external; blocking)
1. Close BD-CONVERSION-02 ✅ (done — merged `752c80f`, production-verified).
2. Dedicated SIM supplied.
3. WhatsApp Business set up (profile, greeting, absence, quick replies, labels).
4. Manual lead register stood up (§7).
5. Campaign source/UTM naming standard defined.

**Phase 2 — Measurement design** (decisions before any tag)
6. Google conversion architecture (actions + tagging choice).
7. Meta measurement decision (Pixel vs CAPI vs native lead form).
8. UTM standard finalised + (later) wizard UTM read.
9. Privacy/consent review (consent UI required if pixels/GA/GTM are added).
10. Manual sales-outcome reconciliation routine (register ↔ finance).

**Phase 3 — Destination readiness**
11. Audit landing paths (§4.3); repair/create **only** required pages.
12. Separate residential vs commercial/hospitality intent.

**Phase 4 — Creative readiness**
13. Select verified completed projects; build residential set; build
    commercial/hospitality set; write concise copy (§11 standards).

**Phase 5 — Controlled launch**
14. Meta residential prospecting (small); small commercial/hospitality test; Meta
    retargeting where authorised; high-intent Google Search. **No Performance Max
    until conversion evidence exists.**

**Phase 6 — Commercial review**
15. Review qualified leads, assessments, quotations, awarded projects, revenue &
    margin (from the lead register + protected finance); reallocate budget on
    decision-grade KPIs (§12).

---

## 16. Readiness decision (summary)

- **Instagram/Meta launch:** **Not ready** — blocked on SIM, WhatsApp Business,
  lead register, source/UTM standard, lead-response ownership; residential creative
  strongly recommended. (Small prospecting can start once the blocking gates are met,
  even before full Meta measurement — but only with the manual register capturing
  outcomes.)
- **Google Search launch:** **Not ready** — additionally blocked on Google
  conversion measurement and residential/commercial landing relevance.
- **Performance Max:** **Not ready / not recommended** — do not run until
  trustworthy conversion inputs exist.
- **Retargeting:** **Not ready** — blocked on Meta measurement and audience/consent
  readiness.

---

## 17. Explicit non-goals (this phase)

No advertising tags/pixels, no analytics events, no landing-page implementation, no
CRM/database, no Google Business Profile editing, no directory purchases, no creative
production, no external-account changes, and **no contact-number change** (SIM
deferred). Nothing here is marked implemented.

---

## 18. Owner decisions required

1. Supply the dedicated Botanique SIM number.
2. Approve WhatsApp Business setup and name a lead-response owner + response standard.
3. Approve the manual lead register format and adopt it.
4. Approve a campaign source/UTM naming standard.
5. Decide the Google conversion-tracking approach (and accept its consent/cookie
   implications) — or defer Google Search.
6. Decide the Meta measurement approach (Pixel vs CAPI vs native lead forms).
7. Confirm whether to build dedicated landing pages / repair lawn & rehabilitation
   destinations.
8. Confirm verified testimonial wording and supply additional project imagery
   (lawn, tropical/indigenous, hospitality) for creative.
9. Decide GBP correction and review-generation ownership.

---

## 19. Subsequent implementation workstreams / prompts required

Each is a **separate, scoped** future task (none started here):

- **BD-CONTACT-SIM-01** — swap the public number to the dedicated SIM across
  `CONTACT` + the documented static/server (and dead) locations, once supplied.
- **BD-MEASUREMENT-02** — campaign conversion measurement design & implementation
  (Google conversion actions, tagging choice, consent UI, optional Meta Pixel/CAPI),
  reconciled with the `MEASUREMENT_PLAN.md` privacy boundary; distinct from the
  blocked BD-MEASUREMENT-01 Phase B custom on-site events.
- **BD-CONVERSION-03** — richer wizard qualification (property/site type, timeline,
  telephone field, UTM/campaign-parameter capture, optional confirmation state) and
  finer service granularity.
- **BD-LANDING-01** — dedicated/repaired landing paths for design+implementation,
  lawn establishment, garden rehabilitation, and hospitality; residential vs
  commercial separation.
- **BD-CREATIVE-01** — verified creative inventory (residential + commercial/
  hospitality sets) to brand standards.
- **BD-LOCAL-01** — Google Business Profile correction, review generation, and a
  NAP/citation/directory plan.
- **BD-LEADOPS-01** — WhatsApp Business configuration and the manual lead register /
  lead-handling operating routine (interim to the future Operations Workflow System).

> These names are proposals; assign IDs at each task's own authority preflight.
