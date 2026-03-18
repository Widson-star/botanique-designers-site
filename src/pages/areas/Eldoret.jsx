import AreaPage from "../../components/AreaPage";

export default function Eldoret() {
  return (
    <AreaPage
      areaName="Eldoret & North Rift"
      heroImage="/projects/project-7.jpg"
      tagline="Cool-climate landscape design for Eldoret's residences, institutions and large agricultural estates in Kenya's North Rift."
      intro="Eldoret is Kenya's fifth-largest city, set at 2,100m above sea level with a cool, highland climate ideal for a wide range of ornamental and productive planting. Botanique Designers serves homeowners, school and university campuses, hospitals, hotels and agricultural estates across Eldoret, Uasin Gishu County and the broader North Rift region including Trans-Nzoia, West Pokot and Baringo. Our expertise in cool-climate planting, large-scale estate landscaping and NEMA Environmental Impact Assessments makes us the right partner for outdoor projects in this region — regardless of scale."
      extraIntro="At 2,100m, Eldoret's climate suits species that struggle at Nairobi's lower altitude — hybrid roses, Grevillea robusta, Cupressus lusitanica, Eucalyptus species, and flowering perennials like Delphinium and Lupin. The cool nights and well-distributed rainfall support dense, lush planting. Institutional campuses in the region — universities, hospitals, schools — benefit from low-maintenance indigenous species like Markhamia lutea and Croton megalocarpus alongside formal avenue planting."
      services={[
        {
          icon: "🌿",
          title: "Landscape Architecture",
          desc: "Garden and estate design for Eldoret properties — cool-climate planting schemes, institutional grounds design and master planning for large plots.",
        },
        {
          icon: "🌿",
          title: "Plant Taxonomy & Botanical Labelling",
          desc: "Identification, labelling and tagging of trees and plants for institutional campuses and botanic gardens across the North Rift region.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "Full landscape build-out — planting, irrigation, hardscape, fencing and outdoor structures suited to Eldoret's highland conditions.",
        },
        {
          icon: "🌱",
          title: "Horticultural Services",
          desc: "Specialist planting and plant establishment services using species that thrive in Eldoret's cool, high-altitude climate.",
        },
      ]}
      whyUs={[
        "Expertise in cool, high-altitude planting suited to Eldoret's climate",
        "Experience with large institutional campuses and agricultural estates",
        "NEMA EIA expertise for North Rift County developments",
        "Remote project management from Nairobi with on-site supervision",
        "Understanding of Uasin Gishu County permit and approval processes",
        "90-day plant establishment warranty on all planted material",
      ]}
      nearbyAreas={[
        { label: "Nakuru & Rift Valley", path: "/areas/nakuru" },
        { label: "Kisumu & Nyanza", path: "/areas/kisumu" },
        { label: "Nairobi CBD", path: "/areas/nairobi" },
        { label: "Kiambu County", path: "/areas/kiambu" },
      ]}
    />
  );
}
