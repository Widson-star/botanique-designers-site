# Portfolio Asset Provenance Audit — BD-PORTFOLIO-EVIDENCE-01

**Audited production / `main` SHA:** `1e968354330df3b72b3ac73d12de164888087839`
(`BD-PERFORMANCE-01: optimize oversized blog hero image (#21)`).
**Date:** 13 July 2026.
**Branch:** `claude/bd-portfolio-evidence-01-asset-audit`.
**Type:** Evidence audit / documentation only. No image binary was published,
remapped, renamed, deleted, or altered; no case-study or project data was changed;
no public wording, status, route, or configuration was touched. The only changed
files are this document, `POST_STABILIZATION_AUDIT.md`, and `WORKSTREAMS.md`.

**Purpose:** determine whether the repository already contains legitimate,
currently unused project images that can *safely* strengthen the three case
studies flagged as image-thin — **Tsavo Skywalk**, **Serenity Homes Diani**, and
**Zaara Park** — using only evidence already present in the repository (source
references, filenames, captions, and git history). This audit does **not**
implement any portfolio change.

---

## 1. Audit method

Every finding below cites at least one of these repository-internal sources:

1. **Tracked file inventory** — `git ls-files 'public/**'` filtered to image
   extensions; per-file byte size (`stat`), pixel dimensions and format (`sips`,
   `file`).
2. **Source references** — repository-wide search of `src/` and `index.html` for
   each image basename, mapping every asset to the source file(s) that reference
   it and, through the data files, to the public route(s) that render it.
3. **Case-study / project data** — `src/data/case-studies.js`,
   `src/data/projects.js`, `src/data/services.js`, `src/data/blog-posts.js`, and
   the area/page components.
4. **Git history** — introduction commits, prior data mappings, deletions/renames
   (`git log --all --diff-filter=…`, `git show <sha>:<path>`, `git log -S`),
   and historical captions.

No provenance claim in this audit rests on visual similarity. Where the only
available signal is what an image *looks like*, the asset is classed
**OWNER CONFIRMATION REQUIRED** rather than confirmed.

**Scope of asset directories:** the only tracked image directory tree is
`public/`. A repository-wide check (`git ls-files | grep -iE '\.(jpg|jpeg|png|
webp|avif|gif|svg|tiff|heic)$' | grep -v '^public/'`) returned **no** tracked
images outside `public/` — there is no `src/assets/` image tree or other
public-asset directory.

---

## 2. Complete asset inventory summary

**Total tracked images under `public/`: 48.** Format breakdown: 45 JPEG, 2 PNG
(`botanique.png`, `favicon.png`), 1 SVG (`vite.svg`). No WebP/AVIF/GIF.

| Directory | Count | Notes |
|---|---|---|
| `public/` (root) | 7 | `botanique.png`, `favicon.png`, `hero-botanique.jpg`, `project-commercial.jpg`, `project-public.jpg`, `project-residential.jpg`, `vite.svg` — *(brand/hero/generic + scaffold; `vite.svg` is the only unreferenced file)* |
| `public/images/blog/` | 1 | `landscape-software-2026.jpg` (BD-PERFORMANCE-01 subject) |
| `public/press/` | 1 | `standard-feature.jpg` |
| `public/projects/` | 38 | portfolio images (`project-*.jpg`, `ksms-*.jpg`, `karen-*.jpg`, `tsavo-skywalk.jpg`) |
| `public/team/` | 2 | `lotom.jpg`, `widson-ambaisi.jpg` |

Directory totals: 7 + 1 + 1 + 38 + 2 = **48** tracked images.

### 2.1 Full inventory (path · size · dimensions · format · references)

Format is JPEG unless noted. "References" lists the source file(s) that use the
asset; through the data files these resolve to the public routes noted.

| Path | Size (bytes) | Dimensions | Referenced in (src / index.html) |
|---|---|---|---|
| `public/botanique.png` | 31,674 | 1440×1163 | `Header.jsx`, `Footer.jsx`, `index.html` (logo) |
| `public/favicon.png` | 90,287 | 981×793 | `index.html` (favicon) |
| `public/hero-botanique.jpg` | 201,846 | 1536×1024 | `Home.jsx`, `GardenCare.jsx`, `index.html` (site hero / default OG) |
| `public/vite.svg` | 1,497 | (SVG, 256×257 viewBox) · SVG | **UNREFERENCED** |
| `public/images/blog/landscape-software-2026.jpg` | 203,364 | 1408×768 | `blog-posts.js` (blog hero + Article schema) |
| `public/press/standard-feature.jpg` | 157,324 | 1066×1200 | `About.jsx` (press feature) |
| `public/project-commercial.jpg` | 179,342 | 1800×1013 | `areas/Westlands.jsx`, `areas/Mombasa.jsx` (area hero) |
| `public/project-public.jpg` | 195,319 | 1024×1536 | `areas/Nairobi.jsx` (area hero) |
| `public/project-residential.jpg` | 188,694 | 1616×1080 | `areas/Runda.jsx` (area hero) |
| `public/projects/karen-fountain.jpg` | 124,641 | 1200×522 | `projects.js`, `case-studies.js` (Karen) |
| `public/projects/karen-garden.jpg` | 171,949 | 1200×802 | `blog-posts.js`, `projects.js`, `case-studies.js` (Karen) |
| `public/projects/ksms-1.jpg` | 117,633 | 1200×540 | `services.js`, `projects.js`, `case-studies.js` (KSMS) |
| `public/projects/ksms-2.jpg` | 118,182 | 1200×540 | `case-studies.js` (KSMS) |
| `public/projects/ksms-3.jpg` | 143,123 | 1200×540 | `case-studies.js` (KSMS) |
| `public/projects/project-10.jpg` | 159,099 | 1000×1333 | `services.js`, `projects.js`, `case-studies.js` (Muthithi before) |
| `public/projects/project-11.jpg` | 200,825 | 1536×1024 | `services.js`, `projects.js` |
| `public/projects/project-12.jpg` | 199,796 | 1200×1600 | `services.js`, `projects.js`, `case-studies.js` (Muthithi after) |
| `public/projects/project-13.jpg` | 193,438 | 1200×1600 | `services.js`, `projects.js` |
| `public/projects/project-14.jpg` | 187,481 | 1000×1333 | `services.js`, `projects.js`, `GardenCare.jsx` |
| `public/projects/project-15.jpg` | 203,804 | 1400×1867 | `services.js`, `projects.js` |
| `public/projects/project-16.jpg` | 177,260 | 1200×1600 | `projects.js`, `case-studies.js` (**Serenity Homes Diani**) |
| `public/projects/project-17.jpg` | 144,504 | 1200×1599 | `projects.js` |
| `public/projects/project-18.jpg` | 135,043 | 1000×1333 | `blog-posts.js`, `projects.js` |
| `public/projects/project-19.jpg` | 178,046 | 1000×1333 | `projects.js` |
| `public/projects/project-2.jpg` | 159,538 | 960×1280 | `services.js`, `areas/Karen.jsx` |
| `public/projects/project-22.jpg` | 182,115 | 1200×1600 | `projects.js`, `case-studies.js` (Muthithi perimeter) |
| `public/projects/project-24.jpg` | 167,985 | 765×1024 | `projects.js` |
| `public/projects/project-26.jpg` | 174,066 | 1200×900 | `projects.js` |
| `public/projects/project-27.jpg` | 163,030 | 900×1200 | `projects.js` |
| `public/projects/project-28.jpg` | 197,946 | 1200×900 | `projects.js` |
| `public/projects/project-29.jpg` | 152,486 | 1000×1333 | `projects.js` |
| `public/projects/project-30.jpg` | 178,128 | 1000×1333 | `blog-posts.js`, `projects.js` |
| `public/projects/project-31.jpg` | 140,058 | 1000×1333 | `projects.js` |
| `public/projects/project-32.jpg` | 202,915 | 960×1280 | `projects.js` |
| `public/projects/project-33.jpg` | 190,366 | 960×1280 | `projects.js` |
| `public/projects/project-34.jpg` | 198,953 | 960×1280 | `projects.js` |
| `public/projects/project-35.jpg` | 153,249 | 1200×1600 | `projects.js` |
| `public/projects/project-36.jpg` | 143,892 | 1000×1333 | `projects.js` |
| `public/projects/project-37.jpg` | 200,021 | 1400×1050 | `projects.js`, `case-studies.js` (**Zaara Park**) |
| `public/projects/project-38.jpg` | 161,878 | 1600×900 | `projects.js` |
| `public/projects/project-4.jpg` | 183,601 | 1200×899 | `services.js`, `areas/Nakuru.jsx` |
| `public/projects/project-5.jpg` | 126,557 | 1024×554 | `services.js`, `About.jsx` |
| `public/projects/project-6.jpg` | 182,118 | 936×1024 | `services.js`, `areas/Kisumu.jsx`, `areas/Kiambu.jsx`, `Services.jsx` |
| `public/projects/project-7.jpg` | 149,217 | 1800×1013 | `services.js`, `Blog.jsx`, `areas/Eldoret.jsx` |
| `public/projects/project-9.jpg` | 172,528 | 1800×1013 | `services.js`, `FAQ.jsx` |
| `public/projects/tsavo-skywalk.jpg` | 201,751 | 1200×900 | `projects.js`, `case-studies.js` (**Tsavo Skywalk**) |
| `public/team/lotom.jpg` | 123,076 | 1002×1200 | `About.jsx` (team) |
| `public/team/widson-ambaisi.jpg` | 143,886 | 1200×1050 | `About.jsx` (founder) |

---

## 3. Referenced vs unreferenced counts

- **Total tracked images:** 48.
- **Referenced by `src/` or `index.html`:** 47.
- **Unreferenced (functionally unused):** **1** — `public/vite.svg`.

`public/vite.svg` is the default **Vite framework logo** (the file's own markup
is the iconify "logos" Vite lightning SVG, `viewBox="0 0 256 257"`), introduced
by the scaffold/stabilization commit `cca948a` and never wired into any page. It
is mentioned only inside historical documentation (`WORKSTREAMS.md` narrative
text about the old `docs/vite.svg` build artifact), never in application code.
It is a **generic scaffold asset with no project provenance** — not a Botanique
project photo — and is unrelated to Tsavo, Serenity, or Zaara.

**Consequence for the purpose of this audit:** there is **no** unreferenced or
"spare" project image sitting in the repository. Every one of the 47 project /
brand / team / press images is already in use, and the single unused file is the
Vite logo. The repository therefore contains **no currently-unused legitimate
project image** available to strengthen any case study.

---

## 4. Project-specific evidence — Tsavo, Serenity, Zaara

For each target project the table lists **only** what the repository actually
ties to it. The decision rule is: recommend mapping an additional asset **only**
where repository evidence conclusively connects it to the correct project and
status. None of the three clears that bar for any additional asset.

### 4.1 Tsavo Skywalk — status: Built / Implemented (6-month maintenance)

| Asset | Repository evidence | Verdict |
|---|---|---|
| `public/projects/tsavo-skywalk.jpg` (1200×900, 201,751 B) | `case-studies.js` slug `tsavo-skywalk` `heroImage` + sole `galleryImages` entry; `projects.js` title "Tsavo Skywalk — Entrance Planting"; filename literally names the project; `notesForWidson`: "Scope confirmed by Widson: design, implementation, and 6 months of maintenance. Additional images to be supplied later." | **Confirmed project asset (already in use).** |
| Any other image | No other tracked image carries the filename, caption, or data mapping "Tsavo"/"Skywalk". Repository-wide `-S 'tsavo'` history search returns only this asset and an unrelated historical "Tsavo Project" *typo/mismapping* that pointed at `project-12` (the Muthithi entrance-after image) and was later corrected — evidence that similarity-based mapping was previously wrong here. | **No additional asset conclusively linked.** |

**Additional confirmed Tsavo assets available in-repo: none.** The case study
already uses the only Tsavo image that exists. `case-studies.js` itself records
that further imagery is owner-supplied and pending.

> **Do not** treat the historical `project-12`→"Tsavo Project" mapping as
> evidence — it was a superseded mislabel; `project-12` is the confirmed
> **Muthithi Gardens Estate** entrance-after image (`case-studies.js` before/after
> pair). This is exactly the visual-similarity trap the audit rules prohibit.

### 4.2 Serenity Homes Diani — status: Design Concept

| Asset | Repository evidence | Verdict |
|---|---|---|
| `public/projects/project-16.jpg` (1200×1600, 177,260 B) | `case-studies.js` slug `serenity-homes-diani` `heroImage` + sole `galleryImages` entry; `projects.js` title "Serenity Homes — 7-Zone Luxury Coastal Landscape", location "Diani, Mombasa"; `notesForWidson`: "Confirmed by Widson: Serenity Homes Diani was a design-only engagement. Single image currently available." | **Confirmed project asset (already in use).** |
| Any other image | No other tracked image is captioned or data-mapped to "Serenity", "Diani", or "coastal". History search finds no prior mapping of any other file to this project. | **No additional asset conclusively linked.** |

**Additional confirmed Serenity assets available in-repo: none.** The data file
states only a single image is currently available. Status must remain **Design
Concept** — no image may be relabelled as built work.

### 4.3 Zaara Park — status: Design Concept

| Asset | Repository evidence | Verdict |
|---|---|---|
| `public/projects/project-37.jpg` (1400×1050, 200,021 B) | `case-studies.js` slug `zaara-park` `heroImage` + sole `galleryImages` entry; `projects.js` title "Zaara Park — design concept", location "Mogadishu, Somalia", description explicitly "Design-only concept; implementation status not claimed"; `notesForWidson`: "Confirmed by Widson: Zaara Park is design-only. Public budget and acreage figures must not be used." | **Confirmed project asset (already in use) — generated design render, NOT a built photograph.** |
| Any other image | No other tracked image is captioned or data-mapped to "Zaara", "Mogadishu", or "Somalia". History search finds no other file mapped to this project. | **No additional asset conclusively linked.** |

**Additional confirmed Zaara assets available in-repo: none.** The single asset
is a **design visualization**; it must not be relabelled as a built photograph,
and no before/after may be constructed. Public budget/acreage figures remain
prohibited (owner instruction, recorded in the data file and BD-WS-06).

---

## 5. Provenance classification (all 48 assets)

| Class | Assets |
|---|---|
| **Confirmed project asset** (filename/caption/data mapping ties it to a named project) | `tsavo-skywalk.jpg` (Tsavo); `karen-fountain.jpg`, `karen-garden.jpg` (Karen); `ksms-1/2/3.jpg` (KSMS); `project-10.jpg`, `project-12.jpg`, `project-22.jpg` (Muthithi); `project-16.jpg` (Serenity, design); `project-37.jpg` (Zaara, **render**) |
| **Likely-but-unconfirmed** (used in `projects.js`/`services.js` with a caption, but no independent corroboration) | The remaining `project-*.jpg` gallery images used only via `projects.js`/`services.js`/area pages (e.g. `project-11/13/14/15/17/18/19/24/26/27/28/29/30/31/32/33/34/35/36/38`, `project-2/4/5/6/7/9`). Captions exist but were not independently re-verified here; **none is linked to Tsavo/Serenity/Zaara.** |
| **Unrelated** (belongs to a different, named context) | `project-2/4/5/6/7/9.jpg` (service/area hero usage), Karen/KSMS/Muthithi assets — all mapped to their own projects, none to the three targets |
| **Generic / stock / hero / brand** | `hero-botanique.jpg`, `botanique.png`, `favicon.png`, `project-commercial.jpg`, `project-public.jpg`, `project-residential.jpg` (area/category heroes), `press/standard-feature.jpg` (press), `team/lotom.jpg`, `team/widson-ambaisi.jpg` (team) |
| **Generated render** | `project-37.jpg` (Zaara Park design visualization); `project-11.jpg` (`projects.js` caption: "Night Lighting Design (3D)") and `project-38.jpg` (caption: "3D Avenue Design") are self-described renders — **none tied to the three targets** |
| **Duplicate** | None found among the 48 tracked files (see §7). |
| **Unknown provenance** | `vite.svg` — scaffold logo, no project provenance (unused) |

No asset outside the "Confirmed" row is tied to Tsavo, Serenity, or Zaara by any
repository evidence.

---

## 6. Privacy / publication risk review

The privacy question in this task applies to **unused** images that might be
newly published. The repository has exactly one unused image:

- **`public/vite.svg`** — the Vite framework logo. No people, faces, vehicles,
  number plates, documents, addresses, signage, or client-identifying content.
  **No privacy or publication risk** — but it is also **not** a project asset and
  must not be published as one.

The 47 referenced images are **already public** on the live site (they render on
existing routes), so this audit introduces no new publication exposure. No
new/unused project image exists to raise a fresh privacy concern. (The three
target images `tsavo-skywalk.jpg`, `project-16.jpg`, `project-37.jpg` are already
live and unchanged by this audit.)

---

## 7. Duplicate / orphan findings

**Duplicates (currently tracked):** none. No two tracked image files were found
to be the same asset under different names in the current tree.

**Orphans / historical deletions (not in the current tree — informational only):**
git history shows seven project images that once existed and were deleted before
the audited SHA:

- `project-1.jpg`, `project-20.jpg`, `project-21.jpg`, `project-23.jpg`,
  `project-25.jpg`, `project-39.jpg`, `project-40.jpg` — removed across commits
  `4ffea65` ("Overhaul project portfolio…") and `0fdd100` ("fix: resolve 404
  image…"). Of these, only `project-23` and `project-25` were ever referenced in
  data; their historical captions were **"Munuga Corridor — Royal Palm
  Installation"** (`project-23`) and **"Highland Residence — Palm Garden &
  Pathways"** (`project-25`) — both **residential**, both **unrelated** to Tsavo,
  Serenity, or Zaara. All seven are **absent from the current tree** and cannot be
  used without an owner re-upload; none is a recoverable Tsavo/Serenity/Zaara
  asset.

The single tracked orphan (never-referenced file) is `vite.svg` (§3).

---

## 8. Decision — what is safe to map now

### 8.1 Assets safe to map now
**None.** No currently-unused image in the repository can be conclusively linked
by repository evidence to Tsavo Skywalk, Serenity Homes Diani, or Zaara Park (or
to any other project). The only unused file is the Vite scaffold logo. **No safe
additional mapping exists.**

### 8.2 Assets requiring OWNER CONFIRMATION
**None to map** — because there is no unused candidate asset to confirm. There is
therefore nothing in-repo to escalate for owner confirmation; the gap is not
"uncertain provenance of an existing file" but "no additional file exists." The
owner action needed is an **upload**, not a confirmation (see §9).

### 8.3 Assets that must NOT be used
- `public/vite.svg` — framework logo, not a project asset.
- `project-37.jpg` must **not** be relabelled from design render to built
  photograph (Zaara stays Design Concept).
- `project-16.jpg` must **not** be relabelled as built work (Serenity stays
  Design Concept).
- The historical `project-12`→"Tsavo" mapping must **not** be revived —
  `project-12` is the confirmed Muthithi entrance-after image.
- The seven deleted images (§7) do not exist and must not be treated as available.

---

## 9. Status verification (current, at audited SHA)

Verified against `src/data/case-studies.js` at the audited SHA — statuses are
**correct and must be preserved**:

- **Tsavo Skywalk** → `status: "Built / Implemented"`, scope includes
  "Maintenance (6 months)"; `designResponse`/`outcome` state design +
  implementation + six months' maintenance. ✅ matches the confirmed scope.
- **Serenity Homes Diani** → `status: "Design Concept"`, `outcome`: "design-only
  engagement… not implemented by the practice." ✅
- **Zaara Park** → `status: "Design Concept"`, `outcome`: "design-only concept…
  Implementation status is not claimed." ✅

No status may be changed by any downstream implementation task on the strength of
an image alone.

---

## 10. Recommended next action & owner upload checklist

**Recommendation:** take **no** in-repo remapping action. Because no additional
safe asset exists, strengthening these three case studies requires **owner-supplied
files**. This confirms the standing evidence gap B-4 in
`POST_STABILIZATION_AUDIT.md` — it is an owner-asset gap, not an implementation
task, and nothing may be fabricated.

**Exact owner upload / request checklist (per project):**

1. **Tsavo Skywalk** (Built / Implemented) — supply **as-built site photographs**
   of the entrance landscaping (planting, grasses on red laterite, garden
   lighting). Optional: a genuine **before** shot only if a real one exists — do
   **not** fabricate a before/after. Confirm each photo is the Tsavo Skywalk site.
2. **Serenity Homes Diani** (Design Concept) — supply **additional design
   renders/plans** for the seven-zone coastal scheme. These remain **design
   concept** assets; do not supply/label built photos unless the engagement status
   itself changes and the owner confirms it.
3. **Zaara Park** (Design Concept) — supply **additional design visualizations**
   for the Mogadishu concept. They remain **renders**, not built work; public
   budget/acreage figures stay prohibited.

**For every uploaded asset the owner should confirm, in writing:** (a) the exact
project it belongs to; (b) whether it is a **built photograph** or a **design
render**; (c) that it contains no private third-party, client-identifying, vehicle
-registration, document, or address content that should not be published; and
(d) for any before/after, that both frames are genuinely the same site at
different times.

**Only after** such owner-confirmed uploads should a *separate, implementation*
workstream map them into `src/data/case-studies.js` / `src/data/projects.js`. This
audit does not authorize or perform that change.

---

## 11. Validation (this audit)

- **Changed files (exactly three):** `PORTFOLIO_ASSET_AUDIT.md` (new),
  `POST_STABILIZATION_AUDIT.md`, `WORKSTREAMS.md`.
- **No image binary, source file, config, dependency, or protected file changed.**
- `npm run build` → **43/43** routes prerender; sitemap 43 URLs.
- `npm run lint` → holds at the inherited **20 errors, 0 warnings** across the same
  four files (`server/index.js`, `src/components/Assistant.jsx`,
  `src/components/FadeIn.jsx`, `src/context/AppContext.jsx`) — zero new.
- `git diff --check` clean.
- Every provenance claim above cites repository evidence (filename, data mapping,
  or git history); no uncertain asset is represented as confirmed.

**Bottom line:** the repository holds **no currently-unused legitimate project
image** that can safely strengthen Tsavo Skywalk, Serenity Homes Diani, or Zaara
Park. The only unreferenced file is the Vite scaffold logo. Strengthening these
case studies is gated on **owner-supplied assets** (checklist §10); no portfolio
change is made by this task.
