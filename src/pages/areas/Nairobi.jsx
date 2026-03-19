import AreaPage from "../../components/AreaPage";

export default function NairobiCBD() {
  return (
    <AreaPage
      areaName="Nairobi & Surrounds"
      heroImage="/project-public.jpg"
      tagline="Full-service landscape design and environmental consultancy across Greater Nairobi — the heart of our practice."
      intro="Nairobi is our home base and the centre of our operations. From the CBD and its surrounding commercial zones, to suburban neighbourhoods like Lavington, Kilimani, Hurlingham, Langata and beyond — Botanique Designers has built a portfolio of diverse landscape projects across the city. Whether you're a homeowner, a property developer, or a public institution, we have the expertise and local knowledge to deliver outstanding results in Nairobi's unique urban context."
      services={[
        {
          icon: "🌿",
          title: "Landscape Architecture",
          desc: "Full design services for residential and commercial properties across all Nairobi neighbourhoods.",
        },
        {
          icon: "📄",
          title: "EIA Studies",
          desc: "NEMA-compliant environmental assessments for urban development projects across Nairobi County.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "On-the-ground execution of landscape designs across all Nairobi suburbs and commercial zones.",
        },
        {
          icon: "✂️",
          title: "Maintenance Contracts",
          desc: "Reliable garden maintenance for Nairobi homes, apartments, offices and institutions.",
        },
      ]}
      whyUs={[
        "Based in Nairobi — fast response times and frequent site visits",
        "Deep familiarity with Nairobi's diverse neighbourhoods and property types",
        "Established relationships with Nairobi plant nurseries and suppliers",
        "Experience with both residential and high-profile public landscape projects",
        "Full environmental compliance support for Nairobi County requirements",
        "Available for same-week site consultations across the city",
      ]}
      nearbyAreas={[
        { label: "Karen", path: "/areas/karen" },
        { label: "Runda", path: "/areas/runda" },
        { label: "Kiambu", path: "/areas/kiambu" },
        { label: "Westlands", path: "/areas/westlands" },
      ]}
    canonical="https://www.botaniquedesigners.com/areas/nairobi"
    />
  );
}
