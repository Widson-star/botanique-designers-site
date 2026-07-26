# Lead Operations Playbook — BD-LEADOPS-01

**Workstream / phase:** BD-LEADOPS-01 — Manual Lead Operations Foundation (new
narrow workstream; anticipated by `CAMPAIGN_READINESS_AUDIT.md`).
**Status:** **Playbook complete · manual-register template complete · operational
adoption NOT complete · actual lead owner NOT confirmed · WhatsApp Business NOT
configured · dedicated SIM NOT supplied · campaign gates still unmet.**
**Baseline `main`:** `dc6c8ccf058bacd79ece9d977b08345f7df2b061`.

> **Interim control, not a system.** This playbook and the CSV register
> (`templates/BOTANIQUE_LEAD_REGISTER.csv`) are a **manual, interim operating
> control** to run and measure the next campaign. They are **not** a CRM, database,
> or the future Operations Workflow System, and they do not replace it. A template
> existing is **not** operational adoption. Nothing here activates the dedicated SIM,
> configures WhatsApp Business, installs analytics, or launches a campaign.

## Authority relationships

- Sits under the campaign-readiness authority (`CAMPAIGN_READINESS_AUDIT.md`) as its
  manual lead-operations foundation; it does **not** change that audit's decisions.
- Enquiry funnel behaviour is owned by **BD-CONVERSION-02** (qualification enforced;
  production-verified) and **BD-CONSULTATION-01** (consultation-location resolved;
  production-verified). This playbook consumes those outputs — it does not alter them.
- Measurement remains governed by `MEASUREMENT_PLAN.md` (Vercel pageviews only;
  custom events blocked on Hobby; **no** Pixel/GA/GTM/cookies). This playbook adds
  **no** analytics — the register is manual.
- GardenCare commercial terms/coverage remain governed by
  `GARDENCARE_PRODUCT_DEFINITION.md` and are unchanged.
- **Financial source of truth:** Simple Invoice Manager. **Project delivery:** the
  separate Project Tracking System. This register does **not** duplicate finance or
  project records — it links to them by reference only (§11).

## Protected-system boundaries (unchanged by this workstream)

No public website React code, no contact-number change, no external WhatsApp
configuration, no CRM, no Supabase tables, no `/admin` change, no finance/payment
change, no analytics/cookies/pixels/tags/GTM, no Google/Meta configuration, no
campaign creatives, no GardenCare policy change, and no change to the future
Operations Workflow System. The founder number stays unchanged until the dedicated
Botanique SIM number is supplied — **the new number is not invented here.**

---

## 1. Operating objective

Evaluate the next campaign through the commercial chain:

```
Advert → qualified enquiry → assessment → quotation → awarded project → revenue & margin
```

The manual system must: capture every serious enquiry; identify its source (down to
campaign, audience and creative); show its sales stage; assign responsibility to a
**real** owner; prevent missed follow-ups; connect campaign spend to commercial
outcomes; and stay simple enough for daily use — without becoming a CRM or pre-empting
the Operations Workflow System.

## 2. Current campaign-readiness authority (preserved)

- The **consultation-location defect is resolved** (BD-CONSULTATION-01, `c112ca2`,
  production-verified).
- The **website qualification funnel is production-ready** (BD-CONVERSION-02).
- The next principal campaign should **lead with landscape design & implementation**,
  not GardenCare.
- **Instagram/Meta** is still blocked by: dedicated SIM; WhatsApp Business; lead
  register (adoption); source discipline; lead ownership + follow-up; final creative.
- **Google Search** additionally requires **trustworthy conversion measurement**.
- **Performance Max: not recommended. Retargeting: not ready.**
- The **founder number is unchanged** until the dedicated SIM is supplied; the new
  number is not invented.

## 3. Lead definitions and qualification

### 3.1 Definition of a lead

A WhatsApp click or inbound message is an **intent signal, not automatically a
qualified lead.** Classify each contact as one of:

| Type | Meaning |
|---|---|
| **General enquiry** | A question (services, pricing, timing) with no committed project intent yet. |
| **New project lead** | Genuine new-project intent but incomplete qualification. |
| **Qualified lead** | Meets the §3.2 minimum qualification standard. |
| **Assessment opportunity** | Qualified and a paid site assessment is the right next step. |
| **Quotation opportunity** | Ready for a quotation (after assessment, or direct where an assessment is genuinely unnecessary). |
| **Awarded project** | Quotation accepted; project won. |
| **Existing client** | An already-engaged client (new-lead process does not apply; escalate). |
| **Supplier / non-client contact** | Suppliers, admin, recruitment, spam — not a lead. |

### 3.2 Minimum qualification standard

A lead is **not qualified** until the available evidence includes **all four**:

- **Required service**
- **Project location**
- **Approximate project size**
- **Indicative budget**

Also record where available: **Name · Telephone · Site condition · Photos/video
received · Expected timeline · Residential/commercial/hospitality/institutional
context.**

**Do not ask again for information the website already supplied.** The QuoteWizard
already collects service, location, size, site context, budget and a human-readable
enquiry source, and the WhatsApp message invites photos/video — read the incoming
message first and ask only for what is genuinely missing.

## 4. Lead stages

One authoritative stage list, used for both the register's `Current stage` and the
WhatsApp labels. Not every lead goes through an assessment — see the direct-quotation
path below.

| # | Stage | Entry condition | Required action | Exit condition | Minimum evidence | Responsible | Follow-up date mandatory? |
|---|---|---|---|---|---|---|---|
| 1 | **New enquiry** | A serious contact arrives | Read what the website supplied; send first reply | First reply sent | Contact captured with a source | Lead owner | Yes |
| 2 | **Qualifying** | Replied, 4 minimums incomplete | Ask only for missing essentials | All 4 minimums present, or photos needed | Some of service/location/size/budget | Lead owner | Yes |
| 3 | **Awaiting photos** | Only photos/video are missing | Request photos/short video | Photos received | Service+location+size+budget | Lead owner | Yes |
| 4 | **Qualified** | §3.2 minimums met | Decide next step: assessment or direct quotation | Assessment proposed **or** Quotation preparing | All 4 minimums | Lead owner | Yes |
| 5 | **Assessment proposed** | Paid assessment **offered** | Explain the paid site visit; await acceptance | Client accepts (→ pending payment) or declines (→ Lost/Nurture) | Qualified + assessment offered | Lead owner | Yes |
| 6 | **Assessment pending payment** | Client **accepted**; payment **not** confirmed | Share payment details; **do not describe the visit as booked or promise a date** | Payment confirmed | Acceptance recorded | Lead owner | Yes |
| 7 | **Assessment booked** | Payment **confirmed**; visit date agreed/scheduled | Record the assessment date; conduct the visit; then set `Assessment completed`=Yes + completion date | Assessment completed → Quotation preparing (or another explicitly recorded next action) | Payment reference + assessment date | Lead owner (+ founder for schedule) | Yes |
| 8 | **Quotation preparing** | Assessment completed, **or** Qualified on the direct-quotation path | Prepare quotation in Simple Invoice Manager; record its reference | Quotation sent | Assessment outputs, or a directly-quotable qualified scope | Founder / assigned | Yes |
| 9 | **Quotation sent** | Quotation issued | Schedule a follow-up discussion | Won / Lost / deferred | Quotation amount + reference recorded | Founder / lead owner | Yes (mandatory) |
| 10 | **Won** | Quotation accepted | Hand to Project Tracking; record awarded value + project reference | Project active | Awarded value + project reference | Founder | No (moves to project delivery) |
| 11 | **Lost** | Prospect declines / goes cold | Record lost reason | Closed | Lost reason (required) | Lead owner | No |
| 12 | **Nurture** | Genuine but deferred | Set a nurture (follow-up) date; light future contact | Re-enters at Qualifying/Qualified | Nurture date | Lead owner | Yes (nurture date) |
| 13 | **Existing client** | Contact is an active/past client | Escalate to founder; keep out of new-lead metrics | Handled via client relationship | Client identity | Founder | Per relationship |

**Direct-quotation path.** Where a site assessment is genuinely unnecessary, a lead
moves **`Qualified → Quotation preparing`** directly. Do **not** force every lead
through an assessment. On this path the assessment columns are recorded as `N/A`.

**Assessment stage clarity (why three stages):**
- *Assessment proposed* — the paid assessment has been **offered**; the client has
  **not** yet accepted or committed.
- *Assessment pending payment* — the client has **accepted**; payment is **not** yet
  confirmed. Do **not** call the visit booked and do **not** promise a date.
- *Assessment booked* — payment is **confirmed** and the visit date is agreed/
  scheduled (recorded in `Assessment date`). After the visit, set `Assessment
  completed` = Yes with the `Assessment completion date`, then move to *Quotation
  preparing* or another explicitly recorded next action. **An assessment date is not
  proof the visit occurred** — completion is tracked separately.

**Simplified WhatsApp-label mapping** (labels must map to the stages above): `New` →
`Qualifying` → `Awaiting photos` → `Qualified` → `Assessment proposed` → `Assessment
pending payment` → `Assessment booked` → `Quoting` → `Quoted` → `Won` / `Lost` /
`Nurture` / `Existing client`.

## 5. Ownership and follow-up

### 5.1 Ownership accountability

- **Every open lead must have a real, accountable `Owner`** — a named person or an
  explicitly founder-approved operational role.
- **Valid owners:** `Widson`; a **founder-approved named operations owner**; or a
  **founder-approved assigned team member**.
- **Martine (or any other team member) must not be assigned without founder
  approval.**
- **No placeholder owner.** A value such as "pending approval" is **not** a valid
  Owner and must not be used to make an unowned lead look assigned.
- **Until the founder confirms the lead owner, the register remains a template and is
  not operationally adopted** — do not run a live campaign against an unowned register.

Proposed operating model (for founder approval — not yet in force):
- **Lead owner (operations)** — first response, register updates, follow-up discipline.
- **Founder (Widson)** — technical/commercial escalation, major design opportunities,
  negotiations, and active-client relationships.
- **Assigned team member** — only where the founder explicitly delegates.

Outstanding founder decisions: **who owns first response · who updates the register ·
who conducts follow-ups · who provides cover during absence.**

### 5.2 Follow-up control

- **Every open lead has a `Next follow-up date`.**
- **No open lead without a real `Owner`.**
- **No quotation (stage 9) without a scheduled follow-up.**
- **A `Lost reason` is required before any lead is closed as Lost.**
- **A nurture (follow-up) date is required for any deferred (Nurture) prospect.**
- **Existing clients are kept separate** from the new-prospect metrics.

Proposed response/follow-up timing (**pending founder approval — not an approved SLA
and not published on the website**): first reply same working day where practical;
post-quotation follow-up ~2–3 working days, then ~1 week later; nurture check-ins at
the recorded date.

## 6. Manual lead register

File: `templates/BOTANIQUE_LEAD_REGISTER.csv` (Excel / Google Sheets compatible;
**headers only — no real or fabricated client records**). Money columns (Budget
range, Quotation amount, Awarded project value, Estimated gross margin) use **`KSh`**.

### 6.1 Column inventory (matches the CSV exactly — 37 columns, in order)

1. **Lead ID** — `BD-LEAD-YYYY-NNN`, assigned manually in sequence per year (no
   automated generation).
2. **Lead date** — ISO `YYYY-MM-DD`.
3. **Client name**
4. **Telephone**
5. **Source platform** — see §6.2 valid values.
6. **Campaign** — the §7 campaign name.
7. **Ad set / audience** — Meta audience or Google campaign/ad-group context, e.g.
   `Nairobi homeowners 30–60`, `Commercial property decision-makers`,
   `Landscape design — Nairobi`. `N/A` if not applicable; `Unknown` if it applies but
   was not captured.
8. **Creative / ad variant** — the specific advert/creative identifier, e.g.
   `Karen mature garden video A`, `Residential transformation carousel B`,
   `Commercial landscaping image A`, `RSA landscape design 01`. `N/A`/`Unknown` as above.
9. **Keyword / search term** — Google Search term where available, e.g.
   `landscape designer nairobi`. `N/A` for non-search; `Unknown` if it applies but was
   not captured.
10. **Landing/source context** — the human-readable entry point (see §7).
11. **Service**
12. **Location**
13. **Project size**
14. **Budget range** (`KSh`)
15. **Site condition**
16. **Property/site type**
17. **Photos received** — `Yes` · `No` · `Partial`.
18. **Qualification status** — see §6.2.
19. **Current stage** — one of the §4 stage names exactly.
20. **Assessment proposed** — `Yes` · `No`.
21. **Assessment date** — the agreed/scheduled visit date once booked; ISO
    `YYYY-MM-DD` (blank/`N/A` before booking or on the direct-quotation path).
22. **Assessment paid** — `Yes` · `No` · `N/A`.
23. **Assessment completed** — `Yes` · `No` · `N/A` (an assessment date is **not**
    proof of completion).
24. **Assessment completion date** — ISO `YYYY-MM-DD` (when the visit actually
    happened; blank/`N/A` otherwise).
25. **Quotation issued** — `Yes` · `No`.
26. **Quotation date** — ISO `YYYY-MM-DD`.
27. **Quotation amount** (`KSh`)
28. **Quotation reference** — the quotation number/identifier from Simple Invoice
    Manager (reference only; the register does not reproduce the quotation).
29. **Outcome** — see §6.2.
30. **Awarded project value** (`KSh`)
31. **Project reference** — the Project Tracking System reference after hand-over
    (reference only; the register does not reproduce the project record).
32. **Estimated gross margin** (`KSh`)
33. **Lost reason**
34. **Next follow-up date** — ISO `YYYY-MM-DD`.
35. **Owner** — a real accountable owner (§5.1); never a placeholder.
36. **Last contact date** — ISO `YYYY-MM-DD`.
37. **Notes**

### 6.2 Data definitions (valid values)

Chosen so the register migrates cleanly into the future Operations Workflow System.

- **Source platform:** `Instagram` · `Facebook` · `Google Search` ·
  `Google Business Profile` · `Organic website` · `Referral` · `Returning client` ·
  `Directory` · `WhatsApp direct` · `Other`.
- **Qualification status:** `Unqualified` · `Partially qualified` · `Qualified` ·
  `Not a lead` (supplier/spam/admin).
- **Current stage:** exactly one of the §4 stage names (`New enquiry`, `Qualifying`,
  `Awaiting photos`, `Qualified`, `Assessment proposed`, `Assessment pending payment`,
  `Assessment booked`, `Quotation preparing`, `Quotation sent`, `Won`, `Lost`,
  `Nurture`, `Existing client`).
- **Outcome:** `Open` · `Won` · `Lost` · `Nurture` · `Not a lead`.
- **Photos received:** `Yes` · `No` · `Partial`.
- **Assessment proposed / Quotation issued:** `Yes` · `No`.
- **Assessment paid / Assessment completed:** `Yes` · `No` · `N/A`.
- **Attribution (Ad set / audience, Creative / ad variant, Keyword / search term):**
  a free-text value from §7, or `N/A` (does not apply) / `Unknown` (applies but not
  captured). **Never store personal information in these fields.**
- **Owner:** `Widson`, a founder-approved named operations owner, or a
  founder-approved assigned team member. **Never blank on an open lead; never a
  placeholder.**
- **Dates** (Lead date, Assessment date, Assessment completion date, Quotation date,
  Next follow-up date, Last contact date): ISO `YYYY-MM-DD`.

## 7. Campaign-source naming standard

One manual standard, used consistently in: the website WhatsApp source line; the
manual register; future campaign URLs; future analytics; and quotation/sales review.

**Platform** (matches the register's Source platform values): `Instagram` ·
`Facebook` · `Google Search` · `Google Business Profile` · `Organic website` ·
`Referral` · `Returning client` · `Directory` · `WhatsApp direct` · `Other`.

**Campaign** — predictable, lowercase, underscore-delimited:
`platform_objective_service_audience_period`. Examples:

- `meta_prospecting_landscape_design_residential_2026q3`
- `meta_prospecting_commercial_landscaping_2026q3`
- `google_search_landscape_design_nairobi_2026q3`
- `google_search_garden_implementation_nairobi_2026q3`

**Landing / source context** — the human-readable entry point, derived from **the
actual landing URL/path, the wizard's human-readable source, or the manually
identified entry point** (e.g. `Landscape Design service page`, `Garden
Implementation service page`, `Commercial Landscaping service page`,
`Instagram profile`, `Google Business Profile`, `Direct referral`).

### 7.1 Future UTM mapping (documentation only — no website UTM parsing implemented)

When the authorised conversion/measurement workstream adds UTM capture, map:

- **`utm_source`** → originating platform/source: `instagram` · `facebook` ·
  `google` · `google_business_profile` · `directory` · `referral`.
- **`utm_medium`** → acquisition method: `paid_social` · `cpc` · `organic_social` ·
  `organic` · `referral`.
- **`utm_campaign`** → campaign name using `platform_objective_service_audience_period`.
- **`utm_content`** → **creative / ad variant** (not the landing page).
- **`utm_term`** → keyword / search term where applicable.

Landing/source context is derived from the landing URL/path, the wizard's readable
source, or the manual entry point — **`utm_content` must not be mapped to the landing
page.** Examples:

```
utm_source=instagram
utm_medium=paid_social
utm_campaign=meta_prospecting_landscape_design_residential_2026q3
utm_content=karen_mature_garden_video_a
```

```
utm_source=google
utm_medium=cpc
utm_campaign=google_search_landscape_design_nairobi_2026q3
utm_content=rsa_landscape_design_01
utm_term=landscape_designer_nairobi
```

**This workstream implements no UTM parsing and no website parameter capture** — that
is left to the authorised measurement workstream.

## 8. WhatsApp Business readiness checklist

For the founder/operations owner to complete **externally** once the dedicated SIM is
supplied. **No number is changed and no account is configured by this workstream.**
**Do not store PINs, recovery codes, or personal identification in this repository.**

**Dedicated number**
- [ ] New SIM purchased.
- [ ] Registered under the appropriate owner/company arrangement.
- [ ] Number confirmed in international (`+254…`) and display (`+254 7XX XXX XXX`) formats.
- [ ] Mobile device selected for the business line.
- [ ] Recovery/security details recorded **privately** (never in the repo).
- [ ] Founder number retained for qualified-lead and active-client communication.

**Business profile**
- [ ] Business name · [ ] Logo · [ ] Description · [ ] Website · [ ] Public email
  (`hello@botaniquedesigners.com`) · [ ] Service area · [ ] Business category ·
  [ ] Operating hours · [ ] Catalogue decision (include or defer).

**Labels** — use the §4 stage names or the simplified mapped subset in §4. Labels must
map to §4 stages.

**Access and ownership**
- [ ] Primary device · [ ] Linked devices · [ ] Operations access · [ ] Founder access.
- [ ] Who sends the first reply · [ ] Who maintains the register · [ ] Who escalates
  major opportunities · [ ] Cover when the assigned person is unavailable.

**Cutover inventory (the number appears in these places — change only under the
authorised BD-CONTACT-SIM-01 workstream, once the SIM is supplied):**
- [ ] Website central `CONTACT` (`src/utils/backend.js`) — authoritative.
- [ ] Static structured-data telephone (`index.html` LocalBusiness JSON-LD).
- [ ] Server/backend references (`server/index.js` prompt + fallback).
- [ ] Dead `src/components/SmartAdvisor.jsx` (or remove it first).
- [ ] Instagram · [ ] Facebook · [ ] Google Business Profile · [ ] Google Ads ·
  [ ] Meta Ads · [ ] Business directories · [ ] WhatsApp catalogue · [ ] Email
  signatures · [ ] Quotation/invoice templates · [ ] Social profile bios ·
  [ ] Printed / vehicle branding where applicable.

## 9. Response templates

Short, natural messages in Botanique's company voice (**"we", consistently**) —
normally one to three sentences. Use information the website already supplied; ask
only for what is missing. **No public or founder phone number in any template.**
Placeholders in `{curly braces}` are filled per lead.

- **Qualified website enquiry:** "Thanks {name} — we have the details for your
  {service} project in {location}. Please send a few photos or a short video of the
  space so we can advise the best next step."
- **Missing photos:** "Thanks {name}. Please share a few photos or a short video of
  the site so we can advise accurately."
- **Missing location:** "Thanks {name}. Whereabouts is the project — town/area and
  county? That helps us plan the next step."
- **Missing budget:** "Do you have an indicative working budget for the project? Even
  a broad range will help us recommend the right approach."
- **New construction:** "Thanks {name}. Is the building work complete or still
  ongoing? A few current photos of the site would help us advise accurately."
- **Site assessment proposal:** "The best next step is a paid site assessment so we
  can review the site properly. The fee is deducted from the project cost if we
  proceed—shall we share the assessment details?"
- **Assessment payment received:** "Payment received, thank you. We'll confirm the
  site-visit schedule with you."
- **Quotation sent:** "We've sent the quotation for your {service} project. Please
  review it and let us know a suitable time to discuss any questions."
- **Quotation follow-up:** "Hi {name}, following up on the quotation we shared. Do you
  have any questions, or are you ready for us to proceed?"
- **Deferred prospect:** "No problem {name} — we'll check back around {timing}. Reach
  out any time before then if plans change."
- **Not within current GardenCare coverage:** "Thanks {name}. Our GardenCare
  maintenance covers the Nairobi Metropolitan Area; for {location} we can still advise
  on design and implementation—would that help?" *(Do not imply nationwide recurring
  maintenance.)*
- **Existing client:** "Good to hear from you {name} — we'll pick this up with you
  directly." *(Escalate to founder; keep out of new-lead metrics.)*

## 10. Commercial reporting

### 10.1 Weekly review
New enquiries · Qualified leads · Assessments proposed/pending/booked/completed ·
Quotations preparing/sent · Follow-ups overdue · Leads won/lost/nurture · Source &
campaign breakdown · Immediate owner actions.

### 10.2 Campaign review (decision-grade)

Report, per campaign: Enquiries · Qualified leads · **Qualification rate** · **Cost
per qualified lead** · Assessments proposed · Assessments booked · Assessments
completed · **Cost per booked assessment** · **Booked-to-completed rate** ·
**Assessment-to-quotation rate** · Quotations issued · Total quotation value ·
**Quotation-to-win rate** · Won projects · Awarded project value · Estimated gross
margin · Attributed revenue · **Return on advertising spend** · Lost reasons.

Definitions:

- `Qualification rate = qualified leads ÷ enquiries`
- `Cost per qualified lead = campaign spend ÷ qualified leads`
- `Assessment booking rate = assessments booked ÷ qualified leads`
- `Cost per booked assessment = campaign spend ÷ assessments booked`
- `Booked-to-completed rate = assessments completed ÷ assessments booked`
- `Assessment-to-quotation rate = quotations issued ÷ assessments completed`
- `Quotation-to-win rate = won projects ÷ quotations issued`
- `ROAS = attributed revenue ÷ advertising spend`

**Division by zero is represented as `N/A`** (e.g. cost-per-qualified-lead when there
are zero qualified leads).

> **Diagnostic vs commercial.** Impressions, reach, views, CTR, CPC, profile visits
> and follows are **diagnostic** metrics — **not** commercial success measures.
> Campaigns are judged on the decision-grade KPIs above (from the register reconciled
> to Simple Invoice Manager), never on diagnostic vanity metrics.

## 11. Relationship to future systems

- The CSV / manual register is **interim**.
- The future **Operations Workflow System** may later absorb these fields and stages;
  the §6 definitions and §4 stages are chosen to migrate cleanly.
- **Simple Invoice Manager remains the financial source of truth**; **the Project
  Tracking System remains separate.** The register stores only reference information
  (`Quotation reference`, `Project reference`, awarded value) to reconcile the
  commercial journey — it does **not** reproduce finance or project records.
- **No Supabase or `/admin` implementation is authorised in this phase.**

## 12. Decisions still required (founder)

1. **Dedicated Botanique SIM number** — supply it (blocks WhatsApp Business + ads).
2. **WhatsApp Business activation** — complete §8 externally once the SIM exists.
3. **Lead-response owner** — confirm a real accountable owner for first response, the
   register, and follow-ups (no placeholder owners; the register is not operationally
   adopted until this is confirmed).
4. **Follow-up timing** — approve or adjust the §5.2 proposed internal targets.
5. **Register adoption** — begin using `templates/BOTANIQUE_LEAD_REGISTER.csv` daily
   (a template existing is not adoption).
6. **Staff access** — confirm the device/access/escalation model (§8).

**Campaign launch gates remain unmet** until the register is adopted with a confirmed
owner and WhatsApp Business is configured on the dedicated SIM.
