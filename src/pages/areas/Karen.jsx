import AreaPage from "../../components/AreaPage";

export default function Karen() {
  return (
    <AreaPage
      areaName="Karen, Nairobi"
      heroImage="/projects/project-2.jpg"
      tagline="Premium landscape design for Karen's leafy residential estates — crafted to complement the area's natural character."
      intro="Karen is one of Nairobi's most prestigious and verdant suburbs, with spacious properties and a strong tradition of well-maintained gardens. Botanique Designers has worked on numerous Karen residences, from intimate garden redesigns to large-scale estate landscaping. We understand the soil conditions, rainfall patterns and the aesthetic expectations of Karen homeowners — and we design accordingly."
      services={[
        {
          icon: "🌿",
          title: "Landscape Architecture",
          desc: "Bespoke garden design tailored to Karen's large residential plots — master plans, planting schemes and 3D visualisations.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "Full build-out of your approved landscape design including planting, irrigation, pathways and outdoor structures.",
        },
        {
          icon: "✂️",
          title: "Garden Maintenance",
          desc: "Weekly, bi-weekly or monthly maintenance contracts for Karen homeowners and estate managers.",
        },
        {
          icon: "💧",
          title: "Irrigation Systems",
          desc: "Design and installation of efficient automated irrigation suited to Karen's large garden areas.",
        },
      ]}
      whyUs={[
        "Extensive experience working on Karen's residential estates",
        "Knowledge of local soil, climate and plant species that thrive in the area",
        "On-time project delivery with dedicated on-site project management",
        "Discretion and professionalism expected by Karen homeowners",
        "90-day plant establishment warranty on all planted material",
        "Trusted by multiple Karen homeowners — references available on request",
      ]}
      nearbyAreas={[
        { label: "Runda", path: "/areas/runda" },
        { label: "Westlands", path: "/areas/westlands" },
        { label: "Nairobi CBD", path: "/areas/nairobi" },
      ]}
    canonical="https://www.botaniquedesigners.com/areas/karen"
    />
  );
}
