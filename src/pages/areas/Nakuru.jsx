import AreaPage from "../../components/AreaPage";

export default function Nakuru() {
  return (
    <AreaPage
      areaName="Nakuru & Rift Valley"
      heroImage="/projects/project-4.jpg"
      tagline="Highland landscape design for Nakuru's estates, farms and residential properties — set against the dramatic backdrop of the Great Rift Valley."
      intro="Nakuru sits at over 1,800m above sea level in the heart of Kenya's Rift Valley — a highland environment with rich volcanic soils, cooler temperatures and spectacular scenery. Botanique Designers works with residential homeowners, farm estates, schools, hotels and commercial properties across Nakuru County and the wider Rift Valley region. Our designs take full advantage of the region's fertile soils and pleasant climate, creating landscapes that are both beautiful and productive. We also provide NEMA-compliant Environmental Impact Assessments for Rift Valley developments."
      services={[
        {
          icon: "🌿",
          title: "Landscape Architecture",
          desc: "Garden and estate design for Nakuru properties — highland planting schemes, farm landscapes, ornamental gardens and master planning.",
        },
        {
          icon: "📄",
          title: "EIA Studies",
          desc: "NEMA-compliant Environmental Impact Assessments for Rift Valley developments, including lake-adjacent and escarpment projects.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "Full landscape build-out including planting, irrigation, terracing, pathways and outdoor structures suited to highland conditions.",
        },
        {
          icon: "✂️",
          title: "Garden Maintenance",
          desc: "Scheduled maintenance programmes for Nakuru residential properties, schools, hotels and farm estates.",
        },
      ]}
      whyUs={[
        "Expertise in highland planting suited to Nakuru's cool climate and volcanic soils",
        "Experience with large farm and estate landscapes in the Rift Valley",
        "NEMA EIA expertise for Rift Valley developments including lakeside projects",
        "Remote project management from Nairobi with on-site supervision",
        "Knowledge of Nakuru's unique flora including indigenous highland species",
        "90-day plant establishment warranty on all planted material",
      ]}
      nearbyAreas={[
        { label: "Nairobi CBD", path: "/areas/nairobi" },
        { label: "Eldoret", path: "/areas/eldoret" },
        { label: "Kisumu", path: "/areas/kisumu" },
        { label: "Kiambu County", path: "/areas/kiambu" },
      ]}
      extraIntro="Nakuru sits at approximately 1,850m on the floor of the Rift Valley, with black cotton and alluvial soils in lower areas and red volcanic soils on the escarpment. The climate is warm and dry by highland standards, with a single pronounced wet season. Acacia tortilis and Acacia xanthophloea are native to the Rift Valley floor and anchor larger landscape schemes; Caesalpinia pulcherrima adds intense orange-red flower colour in dry-tolerant borders; Tecoma stans is reliable in the warmer valley conditions. On escarpment properties with better rainfall and deeper soils, Spathodea campanulata and Calodendrum capense both perform well and add seasonal flower impact."
    canonical="https://www.botaniquedesigners.com/areas/nakuru"
    />
  );
}
