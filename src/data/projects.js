// ─── HOW TO ADD A NEW PROJECT ────────────────────────────────────────────────
// 1. Drop the image into /public/projects/ (e.g. project-10.jpg)
// 2. Add a new object below following the same structure
// 3. category options: "residential" | "commercial" | "estate" | "inspiration"
// ─────────────────────────────────────────────────────────────────────────────

const projects = [
  {
    image: "/project-residential.jpg",
    title: "Residential Landscaping",
    location: "Nyahururu, Nyandarua",
    category: "residential",
    description: "Full residential garden transformation featuring indigenous planting, lawn establishment, and natural stone pathways designed to complement the highland climate.",
  },
  {
    image: "/projects/project-9.jpg",
    title: "Lawn Care & Maintenance",
    location: "Runda, Nairobi",
    category: "residential",
    description: "Ongoing premium maintenance programme for a private residence in Runda — lawn care, hedge trimming, irrigation checks, and seasonal planting.",
  },
  {
    image: "/projects/project-2.jpg",
    title: "Garden Redesign",
    location: "Karen, Nairobi",
    category: "estate",
    description: "Complete garden redesign for an estate property in Karen, incorporating tropical specimen trees, curved lawn edges, and a custom water feature.",
  },
  {
    image: "/project-commercial.jpg",
    title: "Commercial Landscaping",
    location: "Westlands, Nairobi",
    category: "commercial",
    description: "Designed and implemented exterior landscaping for a commercial building in Westlands — planters, screening hedges, and a welcoming entrance green.",
  },
  {
    image: "/projects/project-4.jpg",
    title: "Estate Landscaping",
    location: "Runda, Nairobi",
    category: "estate",
    description: "Expansive estate landscaping covering over 2 acres — master-planned with distinct garden zones, specimen palms, and a fully automated irrigation system.",
  },
  {
    image: "/projects/project-5.jpg",
    title: "Garden Inspiration",
    location: "Reference Style",
    category: "inspiration",
    description: "A curated reference design showcasing lush tropical layering, specimen planting, and sculptural hardscape elements — used as a client mood board.",
  },
  {
    image: "/projects/project-6.jpg",
    title: "Lawn & Garden Makeover",
    location: "Kiambu, Kenya",
    category: "residential",
    description: "Transformation of a tired garden into a vibrant outdoor living space — new lawn, raised planting beds, gravel paths, and a shade pergola.",
  },
  {
    image: "/project-public.jpg",
    title: "Public Space Landscaping",
    location: "Nairobi CBD",
    category: "commercial",
    description: "Landscape design and implementation for a public urban space in Nairobi CBD — robust species selection, low-maintenance planting, and durable hardscape.",
  },
  {
    image: "/projects/project-7.jpg",
    title: "Horticultural Installation",
    location: "Karen, Nairobi",
    category: "estate",
    description: "Specialist horticultural installation featuring rare tropical species, soil improvement works, and a custom drip irrigation network for a Karen estate.",
  },
];

export default projects;
