import AreaPage from "../../components/AreaPage";

export default function Karen() {
  return (
    <AreaPage
      areaName="Karen, Nairobi"
      heroImage="/projects/project-2.jpg"
      tagline="Premium landscape design for Karen's leafy residential estates — crafted to complement the area's natural character."
      intro="Karen is one of Nairobi's most prestigious and verdant suburbs, with spacious properties and a strong tradition of well-maintained gardens. Botanique Designers has worked on Karen residential gardens, from garden redesigns to estate planting. We understand the soil conditions, rainfall patterns and the aesthetic expectations of Karen homeowners — and we design accordingly."
      extraIntro="Karen sits at approximately 1,750m above sea level with red volcanic soil, reliable rainfall, and cool temperatures year-round. These conditions suit a wide range of species — Nandi Flame (Spathodea campanulata), Cape Chestnut (Calodendrum capense), Plumbago, Agapanthus, and indigenous fig species all perform well here. Gardens in Karen can support year-round colour with the right plant selection — something we specify for every project."
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
          title: "GardenCare Maintenance",
          desc: "GardenCare Regular, Monthly or Seasonal programmes for Karen homeowners and estate managers — scope and frequency agreed after assessment.",
        },
        {
          icon: "💧",
          title: "Irrigation Systems",
          desc: "Design and installation of efficient automated irrigation suited to Karen's large garden areas.",
        },
      ]}
      whyUs={[
        "Experience working on Karen residential gardens",
        "Knowledge of local soil, climate and plant species that thrive in the area",
        "Project logistics agreed before mobilisation",
        "Discretion and professionalism expected by Karen homeowners",
        "Plant establishment and aftercare agreed per project",
        "References available on request",
      ]}
      nearbyAreas={[
        { label: "Runda", path: "/areas/runda" },
        { label: "Westlands", path: "/areas/westlands" },
        { label: "Nairobi CBD", path: "/areas/nairobi" },
      ]}
      gardenCareArea
    canonical="https://www.botaniquedesigners.com/areas/karen"
    />
  );
}
