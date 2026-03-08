const services = {
  categories: [
    {
      id: "design-planning",
      title: "Design & Planning",
      description: "What happens before anything goes into the ground.",
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
      services: ["landscape-design", "landscape-architecture"],
    },
    {
      id: "plant-science",
      title: "Plant Science & Advisory",
      description: "Where Botanique Designers has no competition in the region.",
      icon: "M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25",
      services: [
        "plant-taxonomy",
        "plant-health-care",
        "soil-analysis",
        "potted-indoor-plants",
      ],
    },
    {
      id: "implementation",
      title: "Implementation & Construction",
      description: "Turning plans into physical landscapes.",
      icon: "M11.42 15.17l-5.01-5.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z",
      services: [
        "garden-implementation",
        "irrigation-systems",
        "garden-lighting",
        "property-fencing",
      ],
    },
    {
      id: "ongoing-care",
      title: "Ongoing Care",
      description: "Recurring services for established gardens.",
      icon: "M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z",
      services: ["garden-maintenance", "lawn-care"],
    },
  ],

  items: {
    "landscape-design": {
      slug: "landscape-design",
      title: "Landscape Design",
      category: "design-planning",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-2.jpg",
      shortDescription:
        "Site analysis, concept development, planting plans, and material selection for residential, commercial, institutional, and hospitality projects.",
      description:
        "Landscape design focuses on what grows — plant selection, garden layout, planting schemes, and the relationship between plants, soil, and climate. Every project starts with a site visit to assess existing conditions: soil type, drainage patterns, sun exposure, existing vegetation, and how you use the space. From there, we develop concept plans, select species suited to your altitude and rainfall zone, and produce detailed planting plans and material specifications.",
      included: [
        {
          title: "Site Analysis",
          desc: "Soil assessment, drainage mapping, sun/shade study, and existing vegetation inventory.",
        },
        {
          title: "Concept Development",
          desc: "2-3 design concepts based on your brief, site conditions, and budget.",
        },
        {
          title: "Planting Plans",
          desc: "Species-level plant schedules with quantities, spacing, and placement coordinates.",
        },
        {
          title: "Material Selection",
          desc: "Hardscape materials, mulch types, edging, and ground cover specifications.",
        },
        {
          title: "2D Layout Drawings",
          desc: "Scaled plan drawings showing all elements — plants, paths, structures, utilities.",
        },
        {
          title: "Plant Sourcing",
          desc: "Nursery recommendations and procurement support for specified species.",
        },
      ],
      process: [
        {
          step: "Site Visit & Brief",
          desc: "We visit your property, assess conditions, and discuss what you want from the space.",
        },
        {
          step: "Concept Design",
          desc: "We develop 2-3 layout options with preliminary plant palettes and cost estimates.",
        },
        {
          step: "Detailed Design",
          desc: "Your chosen concept is developed into full planting plans and specifications.",
        },
        {
          step: "Implementation Support",
          desc: "We can supervise the build or hand off drawings to your contractor.",
        },
      ],
    },
    "landscape-architecture": {
      slug: "landscape-architecture",
      title: "Landscape Architecture",
      category: "design-planning",
      lead: "Martine Lotom — Landscape Architect",
      heroImage: "/projects/project-5.jpg",
      shortDescription:
        "Master planning, grading and drainage design, hardscape detailing, and construction documentation for large-scale and public space projects.",
      description:
        "Landscape architecture focuses on what's built — site grading, drainage, retaining walls, paving, and the technical drawings that contractors need to build from. Martine Lotom leads this discipline with a BSc in Landscape Architecture from JKUAT — the only institution in Kenya offering this degree, accredited by IFLA and recognised by BORAQS. Most projects benefit from both landscape design and landscape architecture working together.",
      included: [
        {
          title: "Master Planning",
          desc: "Large-scale site plans integrating buildings, infrastructure, and landscapes.",
        },
        {
          title: "Grading & Drainage",
          desc: "Contour analysis, cut-and-fill calculations, stormwater management.",
        },
        {
          title: "Hardscape Detailing",
          desc: "Technical drawings for paths, walls, steps, pergolas, and built features.",
        },
        {
          title: "Construction Documentation",
          desc: "Permit-ready drawings with specifications contractors can build from.",
        },
        {
          title: "Material Specifications",
          desc: "Paving, stone, timber, metal — specified by type, finish, and supplier.",
        },
        {
          title: "Site Supervision",
          desc: "On-site presence during construction to ensure drawings are followed.",
        },
      ],
      process: [
        {
          step: "Site Survey",
          desc: "Topographic survey, existing conditions documentation, and constraint mapping.",
        },
        {
          step: "Schematic Design",
          desc: "Preliminary layouts showing spatial organisation, circulation, and key features.",
        },
        {
          step: "Design Development",
          desc: "Detailed drawings with dimensions, levels, materials, and planting integration.",
        },
        {
          step: "Construction Supervision",
          desc: "Regular site visits to verify work against drawings and resolve field issues.",
        },
      ],
    },
    "plant-taxonomy": {
      slug: "plant-taxonomy",
      title: "Plant Taxonomy & Botanical Labelling",
      category: "plant-science",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-6.jpg",
      featured: true,
      shortDescription:
        "Species identification, botanical name tagging, and labelling for schools, universities, botanic gardens, and institutional campuses.",
      description:
        'The practice was founded on the belief that knowing a plant\'s name — its genus, species, and origin — is the first step to knowing how it grows, where it belongs, and what it needs. Widson\'s plant taxonomy work at learning institutions is the literal origin of the company name "Botanique." This service involves identifying tree and plant species on institutional grounds, designing and installing permanent botanical labels with scientific nomenclature, common names, and family classification.',
      included: [
        {
          title: "Species Identification",
          desc: "Field survey to identify all tree and plant species on your grounds using botanical keys.",
        },
        {
          title: "Botanical Label Design",
          desc: "Durable labels showing scientific name, common name, family, and origin.",
        },
        {
          title: "Label Installation",
          desc: "Weatherproof labels mounted on stakes or attached to trees.",
        },
        {
          title: "Species Inventory",
          desc: "Complete documented inventory with GPS coordinates and health assessment.",
        },
        {
          title: "Educational Signage",
          desc: "Interpretive signs for botanical gardens, nature trails, and campus tours.",
        },
        {
          title: "QR Code Integration",
          desc: "Optional QR codes linking to species information in the Ask Botanique database.",
        },
      ],
      process: [
        {
          step: "Site Survey",
          desc: "Walk the grounds with staff to document all trees and significant plant species.",
        },
        {
          step: "Species Verification",
          desc: "Confirm identifications using herbarium references and botanical databases.",
        },
        {
          step: "Label Production",
          desc: "Design and manufacture weather-resistant labels with full nomenclature.",
        },
        {
          step: "Installation & Handover",
          desc: "Install labels and provide a digital species inventory for your records.",
        },
      ],
      institutionsServed: [
        "Primary and secondary schools",
        "Universities and colleges",
        "Botanic gardens",
        "Arboretums and conservancies",
        "Hotel and resort grounds",
        "Corporate campuses",
      ],
    },
    "plant-health-care": {
      slug: "plant-health-care",
      title: "Plant Health Care",
      category: "plant-science",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-7.jpg",
      shortDescription:
        "Diagnosis of plant diseases, pest identification, nutrient deficiency assessment, and treatment plans.",
      description:
        "Plant health care goes beyond watering and fertilising. We diagnose specific conditions — fungal infections, pest damage, nutrient deficiencies, root problems — and develop targeted treatment plans. This service is particularly valuable for established gardens where mature plants are declining, for new plantings that aren't establishing properly, and for institutional grounds where tree health affects safety.",
      included: [
        {
          title: "Disease Diagnosis",
          desc: "Visual assessment and identification of fungal, bacterial, and viral plant diseases.",
        },
        {
          title: "Pest Identification",
          desc: "Insect and pest identification with targeted control recommendations.",
        },
        {
          title: "Nutrient Assessment",
          desc: "Leaf analysis and soil testing to identify deficiencies affecting plant health.",
        },
        {
          title: "Treatment Plans",
          desc: "Written protocols for treatment — organic and conventional options.",
        },
        {
          title: "Ongoing Monitoring",
          desc: "Scheduled visits to track treatment effectiveness and catch new issues early.",
        },
        {
          title: "Tree Risk Assessment",
          desc: "Structural assessment of large trees for safety concerns on institutional grounds.",
        },
      ],
      process: [
        {
          step: "Assessment Visit",
          desc: "Inspect affected plants, collect samples, and document symptoms.",
        },
        {
          step: "Diagnosis Report",
          desc: "Written report identifying the cause and recommended treatment.",
        },
        {
          step: "Treatment",
          desc: "Apply treatments or provide specifications for your maintenance team.",
        },
        {
          step: "Follow-up",
          desc: "Return visit to assess treatment response and adjust if needed.",
        },
      ],
    },
    "soil-analysis": {
      slug: "soil-analysis",
      title: "Soil Analysis",
      category: "plant-science",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-9.jpg",
      shortDescription:
        "Soil sampling, pH and nutrient testing, drainage assessment, and amendment recommendations.",
      description:
        "Soil determines what will grow and what won't. In Kenya, conditions vary dramatically — from black cotton soil in parts of Nairobi to volcanic loam in the highlands to sandy soils at the coast. We take soil samples, test for pH, nutrient levels, organic matter content, and drainage characteristics, then provide specific amendment recommendations before any planting begins.",
      included: [
        {
          title: "Soil Sampling",
          desc: "Multiple samples across your site at different depths and locations.",
        },
        {
          title: "pH Testing",
          desc: "Determine acidity/alkalinity and its effect on nutrient availability.",
        },
        {
          title: "Nutrient Analysis",
          desc: "Test for nitrogen, phosphorus, potassium, and micronutrients.",
        },
        {
          title: "Drainage Assessment",
          desc: "Percolation testing and water-table evaluation.",
        },
        {
          title: "Amendment Plan",
          desc: "Specific recommendations for soil improvement — comite, manure, lime, gypsum.",
        },
        {
          title: "Species Matching",
          desc: "Plant recommendations suited to your specific soil type and conditions.",
        },
      ],
      process: [
        {
          step: "Site Sampling",
          desc: "Collect soil samples from multiple points and depths across your property.",
        },
        {
          step: "Laboratory Testing",
          desc: "pH, nutrient profile, organic matter, and texture analysis.",
        },
        {
          step: "Report & Recommendations",
          desc: "Written report with amendment specifications and plant compatibility notes.",
        },
        {
          step: "Implementation Support",
          desc: "Guide soil preparation before planting begins.",
        },
      ],
    },
    "potted-indoor-plants": {
      slug: "potted-indoor-plants",
      title: "Potted & Indoor Plants Care",
      category: "plant-science",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-4.jpg",
      shortDescription:
        "Species selection for interior environments, container specification, and ongoing care plans for offices, hotels, and residences.",
      description:
        "Indoor plant success depends on matching species to light levels, humidity, and the level of care available. We select species that will actually survive in your space — not just look good in a nursery. Services include container specification, potting mix formulation, watering and feeding schedules, and ongoing maintenance for commercial and residential interiors.",
      included: [
        {
          title: "Light Assessment",
          desc: "Map light levels throughout your interior spaces to determine viable species.",
        },
        {
          title: "Species Selection",
          desc: "Choose plants matched to your light, humidity, and maintenance capacity.",
        },
        {
          title: "Container Specification",
          desc: "Pot sizes, materials, and drainage requirements for each placement.",
        },
        {
          title: "Care Schedules",
          desc: "Written watering, feeding, and rotation schedules for your team.",
        },
        {
          title: "Procurement",
          desc: "Source plants from nurseries and deliver to site with installation.",
        },
        {
          title: "Maintenance Plans",
          desc: "Weekly or bi-weekly visits to water, prune, feed, and replace as needed.",
        },
      ],
      process: [
        {
          step: "Space Assessment",
          desc: "Visit your space, measure light, assess conditions, and discuss preferences.",
        },
        {
          step: "Design & Selection",
          desc: "Propose species and container combinations with placement plan.",
        },
        {
          step: "Installation",
          desc: "Deliver, pot, and position all plants with care labels.",
        },
        {
          step: "Ongoing Care",
          desc: "Scheduled maintenance visits or written care guides for your staff.",
        },
      ],
    },
    "garden-implementation": {
      slug: "garden-implementation",
      title: "Garden Implementation",
      category: "implementation",
      lead: "Martine Lotom — Landscape Architect (Site Supervision)",
      heroImage: "/projects/project-10.jpg",
      shortDescription:
        "Full installation of designed landscapes: earthworks, planting, mulching, edging, and site management.",
      description:
        "Implementation is where plans become physical landscapes. We manage the full build — from earthworks and soil preparation through planting, mulching, and edge finishing. Martine Lotom has supervised garden implementation on-site, including the Munuga corridor project in Muranga County. Every implementation follows the design drawings precisely, with daily site management and quality control.",
      included: [
        {
          title: "Site Preparation",
          desc: "Clearing, earthworks, grading, and soil amendment before planting.",
        },
        {
          title: "Planting",
          desc: "Trees, shrubs, ground covers, and lawn installation per design specifications.",
        },
        {
          title: "Hardscape Installation",
          desc: "Paths, edging, retaining walls, and other built features.",
        },
        {
          title: "Mulching & Finishing",
          desc: "Organic or decorative mulch, edge trimming, and site cleanup.",
        },
        {
          title: "Irrigation Setup",
          desc: "Install irrigation systems concurrent with planting for immediate coverage.",
        },
        {
          title: "Site Supervision",
          desc: "Daily management of labour, materials, and quality on site.",
        },
      ],
      process: [
        {
          step: "Pre-Construction",
          desc: "Review drawings, schedule materials, and mobilise the site team.",
        },
        {
          step: "Earthworks",
          desc: "Grading, drainage installation, and soil preparation.",
        },
        {
          step: "Planting & Hardscape",
          desc: "Install all landscape elements according to the approved design.",
        },
        {
          step: "Handover",
          desc: "Final walkthrough, snagging, and maintenance handover to you or your gardener.",
        },
      ],
    },
    "irrigation-systems": {
      slug: "irrigation-systems",
      title: "Irrigation Systems",
      category: "implementation",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-11.jpg",
      shortDescription:
        "Design and installation of drip, sprinkler, and micro-irrigation systems with water source assessment and zone planning.",
      description:
        "Water is the most common reason gardens fail in Kenya. We design irrigation systems matched to your water source, pressure, and plant requirements — drip for beds, sprinklers for lawns, micro-spray for ground covers. Every system is zoned so different plant types get different amounts of water, and timers ensure consistency even when you're not around.",
      included: [
        {
          title: "Water Source Assessment",
          desc: "Evaluate borehole, mains, or tank capacity and pressure.",
        },
        {
          title: "System Design",
          desc: "Zone layout with pipe sizing, emitter spacing, and controller specification.",
        },
        {
          title: "Drip Irrigation",
          desc: "For flower beds, shrub borders, and tree basins — efficient and low-pressure.",
        },
        {
          title: "Sprinkler Systems",
          desc: "Pop-up or fixed sprinklers for lawn areas with uniform coverage.",
        },
        {
          title: "Timer & Controller",
          desc: "Automated scheduling with manual override capability.",
        },
        {
          title: "Maintenance Training",
          desc: "Show your gardener how to operate, troubleshoot, and winterise the system.",
        },
      ],
      process: [
        {
          step: "Water Audit",
          desc: "Test your water source for flow rate, pressure, and quality.",
        },
        {
          step: "System Design",
          desc: "Produce a piped layout drawing with zone schedules and material list.",
        },
        {
          step: "Installation",
          desc: "Trench, lay pipe, install emitters, connect controller.",
        },
        {
          step: "Commissioning",
          desc: "Test all zones, adjust coverage, and train your team on operation.",
        },
      ],
    },
    "garden-lighting": {
      slug: "garden-lighting",
      title: "Garden Lighting",
      category: "implementation",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-12.jpg",
      shortDescription:
        "Landscape lighting design and installation — path lights, uplighting, feature lighting, and security lighting with solar options.",
      description:
        "Good lighting extends how long you use your garden and makes your property safer. We design lighting schemes that highlight features, illuminate paths, and provide security — without the glare and energy waste of floodlights. Solar options are available and increasingly popular in Kenya given electricity costs and reliability concerns.",
      included: [
        {
          title: "Lighting Design",
          desc: "Layout drawing showing fixture positions, types, and beam angles.",
        },
        {
          title: "Path Lighting",
          desc: "Low-level lights along walkways and driveways for safe navigation.",
        },
        {
          title: "Uplighting",
          desc: "Ground-mounted lights to highlight specimen trees, walls, and architectural features.",
        },
        {
          title: "Feature Lighting",
          desc: "Accent lights for water features, sculptures, and focal plants.",
        },
        {
          title: "Security Lighting",
          desc: "Motion-activated and perimeter lights integrated with the landscape.",
        },
        {
          title: "Solar Options",
          desc: "Solar-powered fixtures for areas without electrical infrastructure.",
        },
      ],
      process: [
        {
          step: "Night Assessment",
          desc: "Visit your property after dark to understand current conditions and priorities.",
        },
        {
          step: "Lighting Plan",
          desc: "Design layout with fixture specifications and electrical requirements.",
        },
        {
          step: "Installation",
          desc: "Electrical work, fixture mounting, and cable routing.",
        },
        {
          step: "Final Adjustment",
          desc: "Night visit to aim fixtures, adjust brightness, and set timers.",
        },
      ],
    },
    "property-fencing": {
      slug: "property-fencing",
      title: "Property Fencing",
      category: "implementation",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-13.jpg",
      shortDescription:
        "Perimeter fencing specification and installation — chain link, wooden, live fencing, and gabion walls.",
      description:
        "Fencing serves security, privacy, and aesthetics. We specify and install fencing systems that match your property's character and budget — from chain link with creeper planting for a green screen, to timber post-and-rail for rural properties, to gabion walls for contemporary estates. Live fencing using species like Kei Apple (Dovyalis caffra) or Bougainvillea is a cost-effective and attractive alternative.",
      included: [
        {
          title: "Site Survey",
          desc: "Measure perimeter, identify terrain challenges, and mark boundaries.",
        },
        {
          title: "Material Specification",
          desc: "Recommend fencing type based on security needs, aesthetics, and budget.",
        },
        {
          title: "Chain Link Fencing",
          desc: "Galvanised or PVC-coated with concrete posts and optional barbed wire.",
        },
        {
          title: "Wooden Fencing",
          desc: "Treated timber post-and-rail, picket, or panel styles.",
        },
        {
          title: "Live Fencing",
          desc: "Hedge planting using Kei Apple, Bougainvillea, or other barrier species.",
        },
        {
          title: "Gabion Walls",
          desc: "Stone-filled wire baskets for retaining walls and decorative boundaries.",
        },
      ],
      process: [
        {
          step: "Survey & Specification",
          desc: "Measure the perimeter and recommend fencing type and materials.",
        },
        {
          step: "Material Sourcing",
          desc: "Procure posts, wire, timber, or stone per specification.",
        },
        {
          step: "Installation",
          desc: "Excavate post holes, set posts, and install fencing panels or wire.",
        },
        {
          step: "Finishing",
          desc: "Gates, paint or stain, creeper planting if specified.",
        },
      ],
    },
    "garden-maintenance": {
      slug: "garden-maintenance",
      title: "Garden Maintenance",
      category: "ongoing-care",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-14.jpg",
      shortDescription:
        "Scheduled pruning, weeding, fertilisation, pest monitoring, and seasonal planting rotation on monthly or quarterly plans.",
      description:
        "A designed garden needs ongoing care to look the way it was intended. Our maintenance programs cover everything a garden needs through the year — pruning at the right time, fertilising with the right product, monitoring for pests before they become problems, and rotating seasonal plantings to keep beds productive and attractive. Plans are monthly or quarterly depending on garden size and complexity.",
      included: [
        {
          title: "Pruning & Shaping",
          desc: "Hedge trimming, shrub pruning, deadheading, and tree canopy maintenance.",
        },
        {
          title: "Weeding",
          desc: "Manual weeding of beds, borders, and paved areas.",
        },
        {
          title: "Fertilisation",
          desc: "Scheduled feeding with products matched to your soil and plant types.",
        },
        {
          title: "Pest Monitoring",
          desc: "Regular inspection for insects, diseases, and nutrient deficiencies.",
        },
        {
          title: "Seasonal Planting",
          desc: "Rotate annuals and seasonal plants for year-round colour.",
        },
        {
          title: "General Cleanup",
          desc: "Leaf removal, path sweeping, and garden waste disposal.",
        },
      ],
      process: [
        {
          step: "Garden Assessment",
          desc: "Evaluate current condition and agree on priorities and frequency.",
        },
        {
          step: "Maintenance Plan",
          desc: "Written schedule of tasks by month with product specifications.",
        },
        {
          step: "Regular Visits",
          desc: "Monthly or quarterly visits with a consistent team who knows your garden.",
        },
        {
          step: "Seasonal Review",
          desc: "Adjust the plan each season based on growth, weather, and your feedback.",
        },
      ],
    },
    "lawn-care": {
      slug: "lawn-care",
      title: "Lawn Care",
      category: "ongoing-care",
      lead: "Widson Ambaisi — Principal Landscape Designer",
      heroImage: "/projects/project-15.jpg",
      shortDescription:
        "Mowing, aeration, top-dressing, weed control, and lawn renovation with species-specific programs.",
      description:
        "Different grass species need different care. Kikuyu grass in Nairobi's highlands behaves differently from Paspalum at the coast or Bermuda in the Rift Valley. We run species-specific lawn programs — mowing height, aeration timing, top-dressing mix, weed control, and renovation schedules are all tailored to your grass type, altitude, and rainfall pattern. Cape Royal, Bermuda, Paspalum, and Kikuyu each get a different protocol.",
      included: [
        {
          title: "Mowing",
          desc: "Regular mowing at the correct height for your grass species.",
        },
        {
          title: "Aeration",
          desc: "Core or spike aeration to reduce compaction and improve root growth.",
        },
        {
          title: "Top-dressing",
          desc: "Apply sand/soil mix to level the surface and improve soil structure.",
        },
        {
          title: "Weed Control",
          desc: "Selective herbicides or manual removal targeting broadleaf weeds.",
        },
        {
          title: "Feeding",
          desc: "Seasonal fertiliser applications matched to your grass species and soil.",
        },
        {
          title: "Lawn Renovation",
          desc: "Overseeding, patch repair, or full re-establishment when needed.",
        },
      ],
      process: [
        {
          step: "Lawn Assessment",
          desc: "Identify grass species, measure area, assess soil and drainage.",
        },
        {
          step: "Care Program",
          desc: "Written annual program with monthly tasks specific to your lawn.",
        },
        {
          step: "Regular Service",
          desc: "Scheduled visits for mowing, feeding, and weed control.",
        },
        {
          step: "Seasonal Treatments",
          desc: "Aeration, top-dressing, and renovation timed to growth cycles.",
        },
      ],
    },
  },
};

export default services;
