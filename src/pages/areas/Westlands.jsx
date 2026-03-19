import AreaPage from "../../components/AreaPage";

export default function Westlands() {
  return (
    <AreaPage
      areaName="Westlands, Nairobi"
      heroImage="/project-commercial.jpg"
      tagline="Commercial and mixed-use landscape design for Westlands' dynamic business and residential environment."
      intro="Westlands is one of Nairobi's most commercially active areas, blending high-rise offices, hotels, restaurants and upscale residential apartments. Landscape design here demands a different approach — balancing high foot traffic, limited space, maintenance accessibility and the need for year-round visual impact. Botanique Designers delivers landscape solutions for commercial complexes, rooftop gardens, courtyards, hotels and high-density residential developments in Westlands and Spring Valley."
      services={[
        {
          icon: "🏢",
          title: "Commercial Landscaping",
          desc: "Exterior landscape design for office complexes, retail centres, hotels and mixed-use developments in Westlands.",
        },
        {
          icon: "🌿",
          title: "Indoor & Rooftop Gardens",
          desc: "Interior planting schemes, living walls and rooftop garden designs for high-rise and mixed-use buildings.",
        },
        {
          icon: "✂️",
          title: "Commercial Maintenance",
          desc: "Regular, professional maintenance contracts for commercial properties — keeping your landscape looking sharp.",
        },
        {
          icon: "📄",
          title: "EIA Studies",
          desc: "Environmental assessments for development projects in Westlands and surrounding commercial zones.",
        },
      ]}
      whyUs={[
        "Experienced in high-visibility commercial landscape projects",
        "Works within the scheduling constraints of busy commercial properties",
        "Plant selection focused on low-maintenance, year-round visual impact",
        "Familiar with Westlands' building management requirements",
        "Professional presentation — suitable for corporate and hospitality clients",
        "Covers Spring Valley, Parklands, Muthaiga and surrounding areas",
      ]}
      nearbyAreas={[
        { label: "Karen", path: "/areas/karen" },
        { label: "Runda", path: "/areas/runda" },
        { label: "Nairobi CBD", path: "/areas/nairobi" },
      ]}
    canonical="https://www.botaniquedesigners.com/areas/westlands"
    />
  );
}
