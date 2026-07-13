import AreaPage from "../../components/AreaPage";

export default function NairobiCBD() {
  return (
    <AreaPage
      areaName="Nairobi & Surrounds"
      heroImage="/project-public.jpg"
      tagline="Full-service landscape design and implementation across Greater Nairobi — the heart of our practice."
      intro="Nairobi is our home base and the centre of our operations. From the CBD and its surrounding commercial zones, to suburban neighbourhoods like Lavington, Kilimani, Hurlingham, Langata and beyond — Botanique Designers has built a portfolio of diverse landscape projects across the city. Whether you're a homeowner, a property developer, or a public institution, we have the expertise and local knowledge to deliver outstanding results in Nairobi's unique urban context."
      services={[
        {
          title: "Landscape Architecture",
          desc: "Full design services for residential and commercial properties across all Nairobi neighbourhoods.",
        },
        {
          title: "Ecological & Native Planting",
          desc: "Climate-appropriate, water-wise planting using native and adapted species suited to Nairobi's soil, rainfall and altitude.",
        },
        {
          title: "Project Implementation",
          desc: "On-the-ground execution of landscape designs across all Nairobi suburbs and commercial zones.",
        },
        {
          title: "GardenCare Maintenance",
          desc: "GardenCare scheduled garden maintenance — Regular, Monthly or Seasonal — for Nairobi homes, apartments, offices and institutions, agreed after assessment.",
        },
      ]}
      whyUs={[
        "Based in Nairobi — our home base for site visits and project coordination",
        "Deep familiarity with Nairobi's diverse neighbourhoods and property types",
        "Established relationships with Nairobi plant nurseries and suppliers",
        "Experience with both residential and institutional landscape projects",
        "Planting palettes matched to Nairobi's altitude, soil and rainfall",
        "Site visits arranged by appointment across the city",
      ]}
      nearbyAreas={[
        { label: "Karen", path: "/areas/karen" },
        { label: "Runda", path: "/areas/runda" },
        { label: "Kiambu", path: "/areas/kiambu" },
        { label: "Westlands", path: "/areas/westlands" },
      ]}
      gardenCareArea
      extraIntro="Nairobi sits at 1,680m with red-brown clay soils, a bimodal rainfall pattern (long rains March–May, short rains October–December), and temperatures that rarely exceed 26°C. These conditions suit a broad plant palette. Bougainvillea spectabilis thrives on boundary walls and pergolas; Tecoma stans provides reliable yellow colour in median strips and garden borders; Lantana camara works well as a low maintenance groundcover where foot traffic is minimal. For shade trees, Jacaranda mimosifolia and Croton megalocarpus are both well-established in Nairobi gardens and perform consistently in clay-heavy soils."
    canonical="https://www.botaniquedesigners.com/areas/nairobi"
    />
  );
}
