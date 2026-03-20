import AreaPage from "../../components/AreaPage";

export default function Kisumu() {
  return (
    <AreaPage
      areaName="Kisumu & Nyanza"
      heroImage="/projects/project-6.jpg"
      tagline="Lakeside landscape design for Kisumu's homes, institutions and waterfront properties — embracing the beauty of Lake Victoria."
      intro="Kisumu sits on the shores of Lake Victoria, surrounded by a lush, humid landscape that supports a remarkable variety of tropical plants. Botanique Designers brings landscape architecture and environmental consultancy expertise to Kisumu, Nyanza and the broader Western Kenya region. From lakeside residential gardens to institutional grounds, school campuses, hotels and commercial properties — we design outdoor spaces that complement the unique geography and climate of this region. We also handle NEMA Environmental Impact Assessments for projects near the lake shore and wetland areas."
      services={[
        {
          icon: "🌿",
          title: "Landscape Architecture",
          desc: "Garden design for Kisumu residences and institutions — lakeside planting schemes, tropical gardens and functional outdoor spaces.",
        },
        {
          icon: "📄",
          title: "EIA Studies",
          desc: "NEMA-compliant Environmental Impact Assessments — essential for developments near Lake Victoria's sensitive shoreline and wetlands.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "Full execution of landscape designs including planting, irrigation, paving, outdoor furniture and structures.",
        },
        {
          icon: "💧",
          title: "Irrigation Systems",
          desc: "Design and installation of water-efficient irrigation systems suited to Kisumu's climate and water availability.",
        },
      ]}
      whyUs={[
        "Experience with lakeside and wetland-adjacent landscape projects",
        "Knowledge of tropical and sub-tropical plant species suited to Western Kenya",
        "Specialist EIA expertise for developments near water bodies",
        "Remote project management from Nairobi with on-site supervision",
        "Competitive pricing for Kisumu and regional clients",
        "90-day plant establishment warranty on all planted material",
      ]}
      nearbyAreas={[
        { label: "Nairobi CBD", path: "/areas/nairobi" },
        { label: "Nakuru", path: "/areas/nakuru" },
        { label: "Eldoret", path: "/areas/eldoret" },
        { label: "Mombasa & Coast", path: "/areas/mombasa" },
      ]}
      extraIntro="Kisumu sits at 1,131m on the shores of Lake Victoria, with high humidity, temperatures averaging 23–29°C, and rainfall distributed across most of the year. This climate supports lush tropical planting that would not be viable at higher elevations. Ravenala madagascariensis (Traveller's Palm) makes a strong structural statement in larger gardens; Alpinia purpurata and Heliconia psittacorum thrive in humid borders; Frangipani (Plumeria rubra) establishes well near the lake and performs consistently in the warm, moist conditions. For shade, Terminalia mantaly clips into a formal canopy layer and handles Kisumu's heat without the water stress that affects some highland species planted at altitude."
    canonical="https://www.botaniquedesigners.com/areas/kisumu"
    />
  );
}
