import AreaPage from "../../components/AreaPage";

export default function Runda() {
  return (
    <AreaPage
      areaName="Runda, Nairobi"
      heroImage="/project-residential.jpg"
      tagline="Landscape design for Runda's gated estates and large private residences — where privacy and beauty go hand in hand."
      intro="Runda is a prestigious gated suburb known for its large plots, mature trees and carefully guarded green character. Botanique Designers brings specialist landscape expertise to Runda properties — from comprehensive estate redesigns to seasonal garden refresh programmes. We respect the privacy and high standards that Runda residents expect, delivering work that enhances both the aesthetics and the ecological health of the land."
      services={[
        {
          icon: "🌿",
          title: "Estate Landscape Design",
          desc: "Full master planning for large Runda plots — zoning, circulation design, planting and feature elements.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "Complete landscape build-out managed end-to-end with minimal disruption to estate operations.",
        },
        {
          icon: "✂️",
          title: "GardenCare Maintenance",
          desc: "GardenCare scheduled garden maintenance for Runda estates, with tree work and irrigation servicing available as separately quoted specialist services.",
        },
        {
          icon: "🌿",
          title: "Ecological & Native Planting",
          desc: "Climate-appropriate, water-wise planting using native and adapted species suited to Runda's deep loam soils and sheltered microclimate.",
        },
      ]}
      whyUs={[
        "Experience with Runda's large-format estate landscaping requirements",
        "Sensitive to the mature tree canopy and ecological character of the area",
        "Professional crews trained to work within gated, secure properties",
        "Flexible scheduling to suit estate management and homeowner availability",
        "Quotations based on verified scope and site conditions",
        "Consistent quality across every project visit",
      ]}
      nearbyAreas={[
        { label: "Karen", path: "/areas/karen" },
        { label: "Kiambu", path: "/areas/kiambu" },
        { label: "Westlands", path: "/areas/westlands" },
      ]}
      gardenCareArea
      extraIntro="Runda's large-plot character, mature tree canopy, and proximity to Karura Forest give it a microclimate slightly cooler and more sheltered than much of Nairobi. Deep loam soils and good drainage support a wide range of species. Podocarpus falcatus works as a specimen tree where height is needed without aggressive root spread; Gardenia jasminoides performs well in semi-shaded borders; Strelitzia reginae adds architectural form near entrances and pool surrounds. The proximity to indigenous forest also means that Croton megalocarpus, Cordia africana, and Acacia xanthophloea all establish readily and support local bird populations."
    canonical="https://www.botaniquedesigners.com/areas/runda"
    />
  );
}
