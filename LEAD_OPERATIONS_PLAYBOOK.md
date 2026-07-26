# Lead Operations Playbook — BD-LEADOPS-01

**Workstream / phase:** BD-LEADOPS-01 — Manual Lead Operations Foundation (new
narrow workstream; anticipated by `CAMPAIGN_READINESS_AUDIT.md` §19).
**Status:** **Playbook complete · manual-register template complete · external setup
pending · operational adoption pending founder confirmation · dedicated SIM pending.**
**Baseline `main`:** `dc6c8ccf058bacd79ece9d977b08345f7df2b061`.

> **Interim control, not a system.** This playbook and the CSV register
> (`templates/BOTANIQUE_LEAD_REGISTER.csv`) are a **manual, interim operating
> control** to run and measure the next campaign. They are **not** a CRM, database,
> or the future Operations Workflow System, and they do not replace it. Nothing here
> activates the dedicated SIM, configures WhatsApp Business, installs analytics, or
> launches a campaign.

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
  project records — it links to them by reference only (see §12).

## Protected-system boundaries (unchanged by this workstream)

No public website React code, no contact-number change, no external WhatsApp
configuration, no CRM, no Supabase tables, no `/admin` change, no finance/payment
change, no analytics/cookies/pixels/tags/GTM, no Google/Meta configuration, no
campaign creatives, no GardenCare policy change, and no change to the future
Operations Workflow System. The founder number stays unchanged until the dedicated
Botanique SIM number is supplied — **the new number is not invented here.**

## Owner actions still required (summary)

1. Supply the dedicated Botanique SIM number (blocks WhatsApp Business + all ads).
2. Approve the lead-response owner and the proposed response/follow-up timing (§6.4, §6.5).
3. Adopt the CSV register in daily use (a template existing is **not** adoption).
4. Configure WhatsApp Business externally (§9) once the SIM is supplied.

---

## 1. Operating objective

Evaluate the next campaign through the commercial chain:

```
Advert → qualified enquiry → assessment → quotation → awarded project → revenue & margin
```

The manual system must: capture every serious enquiry; identify its source; show its
sales stage; assign responsibility; prevent missed follow-ups; connect campaign spend
to commercial outcomes; and stay simple enough for daily use — without becoming a CRM
or pre-empting the Operations Workflow System.

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

---

## 6. Lead-operations detail

### 6.1 Definition of a lead

A WhatsApp click or inbound message is an **intent signal, not automatically a
qualified lead.** Classify each contact as one of:

| Type | Meaning |
|---|---|
| **General enquiry** | A question (services, pricing, timing) with no committed project intent yet. |
| **New project lead** | A visitor with genuine new-project intent but incomplete qualification. |
| **Qualified lead** | Meets the §6.2 minimum qualification standard. |
| **Assessment opportunity** | Qualified and a paid site assessment is the right next step. |
| **Quotation opportunity** | Assessment done; ready for a quotation. |
| **Awarded project** | Quotation accepted; project won. |
| **Existing client** | An already-engaged client (new-lead process does not apply; escalate). |
| **Supplier / non-client contact** | Suppliers, admin, recruitment, spam — not a lead. |

### 6.2 Minimum qualification standard

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

### 6.3 Lead stages (authoritative — used for both WhatsApp labels and the register)

A compact, non-duplicative list. (The 14-stage draft was reviewed; "Awaiting photos"
is kept as an explicit stage because photos are a frequent, specific blocker to
qualification, and "Follow-up" is folded into per-stage follow-up dates rather than
being its own stage to avoid an ambiguous catch-all.)

| # | Stage | Entry condition | Required action | Exit condition | Minimum evidence | Responsible | Follow-up date mandatory? |
|---|---|---|---|---|---|---|---|
| 1 | **New enquiry** | A serious contact arrives | Read what the website supplied; first reply | First reply sent | Contact captured with a source | Operations owner | Yes |
| 2 | **Qualifying** | Replied, but the 4 minimums incomplete | Ask only for missing essentials | All 4 minimums present, or photos needed | Some of service/location/size/budget | Operations owner | Yes |
| 3 | **Awaiting photos** | Only photos/video are missing | Request photos/short video | Photos received | Service+location+size+budget | Operations owner | Yes |
| 4 | **Qualified** | §6.2 minimums met | Decide next step (assessment vs direct quote) | Assessment proposed or quotation started | All 4 minimums | Operations owner | Yes |
| 5 | **Assessment proposed** | Paid assessment offered | Await acceptance; explain the paid site visit | Assessment booked or declined | Qualified + assessment offered | Operations owner | Yes |
| 6 | **Assessment booked** | Client agreed to assessment | Confirm date after payment; do not promise availability | Assessment paid | Agreed assessment | Operations owner (+ founder for schedule) | Yes |
| 7 | **Assessment paid** | Payment confirmed | Confirm scheduling will follow | Site assessment completed | Payment reference | Operations owner | Yes |
| 8 | **Quotation preparing** | Assessment complete | Prepare quotation (Simple Invoice Manager) | Quotation sent | Assessment outputs | Founder / assigned | Yes |
| 9 | **Quotation sent** | Quotation issued | Schedule a follow-up discussion | Won / Lost / deferred | Quotation amount recorded | Founder / Operations owner | Yes (mandatory) |
| 10 | **Won** | Quotation accepted | Hand to Project Tracking; record awarded value | Project active | Awarded value | Founder | No (moves to project delivery) |
| 11 | **Lost** | Prospect declines / goes cold | Record lost reason | Closed | Lost reason (required) | Operations owner | No |
| 12 | **Nurture** | Genuine but deferred | Set a nurture date; light future contact | Re-enters at Qualifying/Qualified | Nurture date | Operations owner | Yes (nurture date) |
| 13 | **Existing client** | Contact is an active/past client | Escalate to founder; keep out of new-lead metrics | Handled via client relationship | Client identity | Founder | Per relationship |

> WhatsApp Business labels should map 1:1 to these stage names (or a simplified
> mapped subset — see §9) so a label and the register never disagree.

### 6.4 Ownership (proposed — pending founder approval)

No employee assignment is invented or recorded as approved. Proposed operating model:

- **Operations owner** — first response, register updates, and follow-up discipline.
  *(If Martine or another team member is proposed for this role: **Proposed — pending
  founder approval**.)*
- **Founder (Widson)** — technical/commercial escalation, major design opportunities,
  negotiations, and active-client relationships.
- **Assigned team member** — only where the founder explicitly delegates.

The register's **`Owner` column must always contain a value** (never blank on an open
lead). Until the founder confirms the operations owner, use `Owner: Proposed — pending
founder approval` rather than leaving it empty or naming an unconfirmed person.

### 6.5 Follow-up control

- **Every open lead has a `Next follow-up date`.**
- **No open lead without an `Owner`.**
- **No quotation (stage 9) without a scheduled follow-up.**
- **A `Lost reason` is required before any lead is closed as Lost.**
- **A nurture date is required for any deferred (Nurture) prospect.**
- **Existing clients are kept separate** from the new-prospect metrics.

**Proposed response/follow-up timing (pending founder approval — not an approved SLA
and not published on the website):**

- First reply to a new enquiry: same working day where practical.
- Follow-up after a quotation: within ~2–3 working days, then a second follow-up ~1
  week later.
- Nurture check-ins: at the recorded nurture date (e.g. next season / stated month).

These are internal working targets for founder approval, **not** a public promise.

---

## 7. Manual lead-register template

File: `templates/BOTANIQUE_LEAD_REGISTER.csv` (Excel / Google Sheets compatible;
**headers only — no real or fabricated client records**).

Columns (in order): Lead ID · Lead date · Client name · Telephone · Source platform ·
Campaign · Landing/source context · Service · Location · Project size · Budget range ·
Site condition · Property/site type · Photos received · Qualification status · Current
stage · Assessment proposed · Assessment date · Assessment paid · Quotation issued ·
Quotation date · Quotation amount · Outcome · Awarded project value · Estimated gross
margin · Lost reason · Next follow-up date · Owner · Last contact date · Notes.

Money columns (Budget range, Quotation amount, Awarded project value, Estimated gross
margin) use **`KSh`** consistently.

### 7.1 Data definitions (valid values)

Defining these now keeps the register clean and migratable into the future Operations
Workflow System.

- **Source platform:** `Instagram` · `Facebook` · `Google Search` ·
  `Google Business Profile` · `Organic website` · `Referral` · `Returning client` ·
  `Directory` · `WhatsApp direct` · `Other`.
- **Qualification status:** `Unqualified` · `Partially qualified` · `Qualified` ·
  `Not a lead` (supplier/spam/admin).
- **Current stage:** one of the §6.3 stage names exactly (`New enquiry`, `Qualifying`,
  `Awaiting photos`, `Qualified`, `Assessment proposed`, `Assessment booked`,
  `Assessment paid`, `Quotation preparing`, `Quotation sent`, `Won`, `Lost`,
  `Nurture`, `Existing client`).
- **Outcome:** `Open` · `Won` · `Lost` · `Nurture` · `Not a lead`.
- **Photos received:** `Yes` · `No` · `Partial`.
- **Assessment paid:** `Yes` · `No` · `N/A`.
- **Assessment proposed / Quotation issued:** `Yes` · `No`.
- **Owner:** `Widson` · the confirmed operations owner · or
  `Proposed — pending founder approval` (never blank on an open lead).
- **Dates** (Lead date, Assessment date, Quotation date, Next follow-up date, Last
  contact date): ISO `YYYY-MM-DD`.

### 7.2 Lead ID format

`BD-LEAD-YYYY-NNN` (e.g. `BD-LEAD-2026-001`), assigned **manually** in sequence per
year. There is **no** automated ID generation — the operations owner assigns the next
number by hand.

---

## 8. Campaign-source naming standard

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

**Landing / source context** (human-readable, matches the wizard's readable enquiry
source): `Landscape Design service page` · `Garden Implementation service page` ·
`Commercial Landscaping service page` · `Instagram profile` ·
`Google Business Profile` · `Direct referral`.

**Future UTM mapping (documented, not implemented here):** when the authorised
conversion/measurement workstream adds UTM capture, map `utm_source` → Source
platform, `utm_campaign` → Campaign (the format above), and `utm_content`/landing path
→ Landing/source context. **This workstream implements no UTM parsing and no website
parameter capture** — that is left to the authorised measurement workstream.

---

## 9. WhatsApp Business readiness checklist

Operational checklist for the founder/operations owner to complete **externally** once
the dedicated SIM is supplied. **No number is changed and no account is configured by
this workstream.** **Do not store PINs, recovery codes, or personal identification in
this repository.**

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

**Labels** — use the §6.3 stage names, or this simplified mapped subset if full labels
are unwieldy: `New` → `Qualifying` → `Awaiting photos` → `Qualified` → `Assessment` →
`Quoted` → `Won` / `Lost` / `Nurture` / `Existing client`. Labels must map to §6.3.

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

---

## 10. Response-template library

Short, natural messages that sound like Botanique/Widson replying directly — normally
one to three sentences. Use information the website already supplied; ask only for
what is missing. **Do not include the founder's personal number or the pending
business number in any template.** Placeholders in `{curly braces}` are filled per
lead.

- **Qualified website enquiry:** "Thanks {name} — got the details on your {service} in
  {location}. Could you send a few photos or a short video of the space so I can
  advise the best next step?"
- **Missing photos:** "Thanks {name}. Could you share a few photos or a short video of
  the site? That helps me give you accurate guidance."
- **Missing location:** "Thanks {name}. Whereabouts is the project — town/area and
  county? That helps me plan the next step."
- **Missing budget:** "To point you the right way, do you have a rough working budget
  in mind for this? Even a broad range helps me tailor the approach."
- **New construction:** "Thanks {name}. Is the building work complete, or still
  ongoing? A few current photos of the site would help me advise accurately."
- **Site assessment proposal:** "The best next step is a paid site assessment — we come
  out, assess the site and it counts toward your project. Shall I share the details so
  we can arrange it?"
- **Assessment payment received:** "Received, thank you — I'll confirm the scheduling
  shortly."
- **Quotation sent:** "I've sent your quotation for {service}. Happy to walk you
  through it — when suits you for a quick chat?"
- **Quotation follow-up:** "Hi {name}, just checking in on the quotation I sent — any
  questions, or would you like to go ahead?"
- **Deferred prospect:** "No problem {name} — I'll check back around {timing}. Reach
  out any time before then if plans change."
- **Not within current GardenCare coverage:** "Thanks {name}. Our GardenCare
  maintenance covers the Nairobi Metropolitan Area; for {location} I can still advise
  on design/implementation — would that help?" *(Do not imply nationwide recurring
  maintenance.)*
- **Existing client:** "Good to hear from you {name} — let me pick this up with you
  directly." *(Escalate to founder; keep out of new-lead metrics.)*

---

## 11. Commercial reporting routine (using the manual register)

### Weekly review
New enquiries · Qualified leads · Assessments proposed/booked/paid · Quotations
preparing/sent · Follow-ups overdue · Leads won/lost/nurture · Source & campaign
breakdown · Immediate owner actions.

### Campaign review
Spend · Enquiries · Qualified leads · **Cost per qualified lead** · Assessments ·
**Cost per booked assessment** · Quotations · Quotation value · Won projects ·
Awarded value · Estimated margin · Lost reasons.

> **Diagnostic vs commercial.** Impressions, reach, views, CTR, CPC, profile visits
> and follows are **diagnostic** metrics — **not** commercial outcomes. Campaigns are
> judged on the decision-grade KPIs above (from the register reconciled to Simple
> Invoice Manager), never on diagnostic vanity metrics.

---

## 12. Relationship to future systems

- The CSV / manual register is **interim**.
- The future **Operations Workflow System** may later absorb these fields and stages;
  the §7.1 definitions and §6.3 stages are chosen to migrate cleanly.
- **Simple Invoice Manager remains the financial source of truth**; **the Project
  Tracking System remains separate.** The register references them (quotation/invoice
  number, awarded value) but does **not** duplicate finance or project records.
- **No Supabase or `/admin` implementation is authorised in this phase.**

---

## 13. Decisions still required (founder)

1. **Dedicated Botanique SIM number** — supply it (blocks WhatsApp Business + ads).
2. **WhatsApp Business activation** — complete §9 externally once the SIM exists.
3. **Lead-response owner** — confirm who owns first response, the register, and
   follow-ups (replaces the "Proposed — pending founder approval" placeholders).
4. **Follow-up timing** — approve or adjust the §6.5 proposed internal targets.
5. **Register adoption** — begin using `templates/BOTANIQUE_LEAD_REGISTER.csv` daily
   (a template existing is not adoption).
6. **Staff access** — confirm device/access/escalation model (§9).
