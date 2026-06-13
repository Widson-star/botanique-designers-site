// Case studies — a curated, evidence-based subset of the portfolio.
//
// RULES (BD-WS-05): every field below is derived only from facts/images already
// present in the repo (see src/data/projects.js and public/projects/). No
// clients, budgets, dates, plant lists, or outcomes are invented. Where a
// project is design/render-only it is marked as such and NOT described as built.
// `outcome` stays conservative when not clearly supported by imagery.
//
// status values: "Built / Implemented", "Planting Installation",
//   "Design Concept", "In Progress"
// evidenceLevel: "strong" | "moderate" | "needs confirmation"

const caseStudies = [
  {
    slug: "karen-residence",
    title: "Karen Residence — Fountain Garden & Mature Borders",
    location: "Karen, Nairobi",
    category: "residential",
    status: "Built / Implemented",
    heroImage: "/projects/karen-garden.jpg",
    galleryImages: ["/projects/karen-fountain.jpg", "/projects/karen-garden.jpg"],
    summary:
      "Formal residential garden work in Karen, Nairobi — from a fountain-centred installation through to established, full-bloom mixed borders.",
    scope: ["Garden design", "Planting installation", "Ongoing care"],
    brief:
      "A residential garden in Karen built around a central water feature with layered, year-round planting.",
    designResponse:
      "A formal layout anchored by a central blue-tiled fountain with geometric brick edging, set within mixed tropical planting. Established borders feature a Cycas revoluta centrepiece, Tradescantia pallida groundcover, Dusty Miller and seasonal Petunia.",
    outcome:
      "Project imagery shows the installation in progress and an established, full-bloom border. Available photos demonstrate the design direction and planting; long-term performance should be confirmed.",
    relatedServices: ["landscape-design", "garden-implementation", "garden-maintenance"],
    evidenceLevel: "strong",
    notesForWidson:
      "Confirmed by Widson: both photos are the same Karen residence.",
  },
  {
    slug: "muthithi-gardens-estate",
    title: "Muthithi Gardens Estate — Entrance & Perimeter Planting",
    location: "Mununga, Muranga County",
    category: "residential",
    status: "Planting Installation",
    heroImage: "/projects/project-12.jpg",
    galleryImages: [
      "/projects/project-10.jpg",
      "/projects/project-12.jpg",
      "/projects/project-22.jpg",
    ],
    beforeAfter: {
      label: "Entrance flower bed",
      before: "/projects/project-10.jpg",
      after: "/projects/project-12.jpg",
    },
    summary:
      "Entrance and perimeter planting at Muthithi Gardens Estate — including a documented before/after of the entrance flower bed.",
    scope: ["Planting design", "Garden implementation"],
    brief:
      "Entrance and boundary planting for an estate property in Mununga, Muranga County.",
    designResponse:
      "Entrance planters of Cupressus goldcrest, Dracaena and variegated groundcovers set against stone cladding, with a stone-clad boundary wall, grey container pots holding Syzygium shrubs and an establishing lawn along the perimeter.",
    outcome:
      "Before and after imagery of the entrance flower bed (staged nursery stock through to planted bed) is captured directly in the project photos. Final establishment should be confirmed.",
    relatedServices: ["landscape-design", "garden-implementation"],
    evidenceLevel: "strong",
    notesForWidson:
      "The before/after labels come straight from the existing project captions. Confirm the perimeter (project-22) is the same estate phase.",
  },
  {
    slug: "ksms-campus",
    title: "Kenya School of Monetary Studies (KSMS) — Campus Grounds & Lawn Establishment",
    location: "Nairobi",
    category: "estate",
    status: "Built / Implemented",
    heroImage: "/projects/ksms-1.jpg",
    galleryImages: ["/projects/ksms-1.jpg", "/projects/ksms-2.jpg", "/projects/ksms-3.jpg"],
    galleryCaptions: [
      "Large-scale lawn establishment with paved walkways and green kerb borders",
      "Campus grounds — established lawns and circulation",
      "Campus landscaping with retained specimen trees",
    ],
    summary:
      "Large-scale grounds and lawn establishment on the Kenya School of Monetary Studies (KSMS) campus in Nairobi.",
    scope: ["Landscape design", "Garden implementation", "Lawn establishment"],
    brief:
      "Institutional campus grounds requiring durable, presentable landscape across paved circulation and open lawn.",
    designResponse:
      "Large-scale lawn establishment across the campus compound, with paved walkways, green kerb borders and retained specimen trees.",
    outcome:
      "Imagery shows established campus lawn and circulation. Available photos document the implementation scope; ongoing performance should be confirmed.",
    relatedServices: ["commercial-landscaping", "garden-implementation", "landscape-design"],
    evidenceLevel: "moderate",
    notesForWidson:
      "Confirmed by Widson: KSMS (Kenya School of Monetary Studies) may be named in full. ksms-2/3 captions are kept general and consistent with the documented campus works — refine if you want more specific wording.",
  },
  {
    slug: "zaara-park",
    title: "Zaara Park — Landscape Design",
    location: "Mogadishu, Somalia",
    category: "international",
    status: "Design Concept",
    heroImage: "/projects/project-37.jpg",
    galleryImages: ["/projects/project-37.jpg"],
    summary:
      "A comprehensive landscape design concept for Zaara Park in Mogadishu — one of the firm's largest landscape design engagements and an example of cross-border design delivery.",
    scope: ["Detailed landscape design", "Master planning"],
    brief:
      "A large-scale public park landscape in Mogadishu, delivered as a cross-border design engagement.",
    designResponse:
      "A comprehensive, detailed landscape design developed for the site — one of the firm's largest landscape design engagements, delivered as a multi-zone landscape design concept.",
    outcome:
      "This was a design-only engagement — the available imagery is a design visualization, not built work. Botanique Designers delivered the landscape design; it was not implemented by the practice.",
    relatedServices: ["landscape-design", "landscape-architecture", "commercial-landscaping"],
    evidenceLevel: "moderate",
    notesForWidson:
      "Confirmed by Widson: Zaara Park was a design-only engagement (not built by the practice). Public budget figure removed per BD-WS-06; described as a large-scale design engagement instead.",
  },
  {
    slug: "serenity-homes-diani",
    title: "Serenity Homes — Coastal Residential Landscape, Diani",
    location: "Diani, Mombasa",
    category: "residential",
    status: "Design Concept",
    heroImage: "/projects/project-16.jpg",
    galleryImages: ["/projects/project-16.jpg"],
    summary:
      "A seven-zone luxury residential landscape for Serenity Homes in Diani, planned around the coastal humid climate.",
    scope: ["Landscape design", "Coastal planting design"],
    brief:
      "A luxury coastal residential landscape requiring planting suited to Diani's humid, salt-exposed conditions.",
    designResponse:
      "A seven-zone scheme using coastal-adapted tropical planting, defined outdoor living areas and salt-tolerant groundcovers suited to the coastal humid climate.",
    outcome:
      "This was a design-only engagement — the imagery shows the scheme's design direction. The landscape was not implemented by the practice.",
    relatedServices: ["landscape-design", "ecological-planting-design"],
    evidenceLevel: "moderate",
    notesForWidson:
      "Confirmed by Widson: Serenity Homes Diani was a design-only engagement. Single image currently available.",
  },
  {
    slug: "tsavo-skywalk",
    title: "Tsavo Skywalk — Entrance Landscaping",
    location: "Tsavo, Kenya",
    category: "estate",
    status: "Built / Implemented",
    heroImage: "/projects/tsavo-skywalk.jpg",
    galleryImages: ["/projects/tsavo-skywalk.jpg"],
    summary:
      "Entrance landscaping at the Tsavo Skywalk visitor site — designed, implemented, and maintained by Botanique Designers.",
    scope: ["Landscape design", "Implementation", "Maintenance (6 months)"],
    brief:
      "Entrance landscaping for a public visitor attraction on exposed, red laterite ground.",
    designResponse:
      "Ornamental grasses and tropical shrubs planted on red laterite soil, with garden lighting at the entrance. Botanique Designers delivered the design, carried out the implementation, and maintained the landscape for six months afterwards.",
    outcome:
      "The entrance landscaping was installed and then maintained by Botanique Designers for six months after completion. A single project photo is currently available; further imagery to follow.",
    relatedServices: [
      "commercial-landscaping",
      "landscape-design",
      "garden-implementation",
      "garden-lighting",
      "garden-maintenance",
    ],
    evidenceLevel: "moderate",
    notesForWidson:
      "Scope confirmed by Widson: design, implementation, and 6 months of maintenance. Additional images to be supplied later.",
  },
];

export default caseStudies;
