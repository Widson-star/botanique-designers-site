import AreaPage from "../../components/AreaPage";

export default function Mombasa() {
  return (
    <AreaPage
      areaName="Mombasa & Coast"
      heroImage="/project-commercial.jpg"
      tagline="Coastal landscape design for Mombasa's villas, hotels and resorts — rooted in the tropical character of the Kenyan coast."
      intro="The Kenyan coast offers a landscape canvas unlike anywhere in the country — tropical species, coastal soils, salt-tolerant plants, and an aesthetic shaped by the Indian Ocean. Botanique Designers brings specialist knowledge of coastal planting, NEMA-compliant Environmental Impact Assessments for coastal developments, and experience designing outdoor spaces that thrive in the heat and humidity of the Coast region. Whether you own a Mombasa residence, a boutique hotel in Diani, a resort on the North Coast, or a property anywhere in Kwale, Kilifi or Lamu counties — we design and deliver landscapes that feel authentically coastal and permanently beautiful."
      extraIntro="The coast presents a distinct planting environment — sandy, well-draining soils, high humidity, salt-laden air, and temperatures that rarely drop below 25°C. Species that perform here include Coconut Palm (Cocos nucifera), Frangipani (Plumeria rubra), Bougainvillea, Casuarina equisetifolia as windbreaks, Scaevola taccada for beachfront edges, and Traveller's Palm (Ravenala madagascariensis) for dramatic focal points. Lawns in Mombasa typically use Buffalo grass or Bermuda grass — both handle the heat and recover well from salt exposure."
      services={[
        {
          icon: "🌿",
          title: "Landscape Architecture",
          desc: "Bespoke garden design for coastal properties — tropical planting schemes, palm gardens, resort-style layouts and 3D visualisations.",
        },
        {
          icon: "🌿",
          title: "Plant Taxonomy & Botanical Labelling",
          desc: "Identification, labelling and tagging of trees and plants for institutional campuses and botanic gardens across the Coast region.",
        },
        {
          icon: "🛠️",
          title: "Project Implementation",
          desc: "Full build-out of your coastal landscape design — planting, irrigation, hardscape, water features and outdoor structures.",
        },
        {
          icon: "✂️",
          title: "Garden Maintenance",
          desc: "Scheduled maintenance programmes for Mombasa residences, hotels and resorts — managed remotely or with local site supervision.",
        },
      ]}
      whyUs={[
        "Knowledge of salt-tolerant and coastal-climate plant species",
        "Experience preparing NEMA EIAs for sensitive coastal developments",
        "Ability to manage projects remotely from Nairobi with local site oversight",
        "Resort, hotel and high-end residential portfolio along the Kenyan coast",
        "Understanding of coastal county permit and approval processes",
        "90-day plant establishment warranty on all planted material",
      ]}
      nearbyAreas={[
        { label: "Nairobi CBD", path: "/areas/nairobi" },
        { label: "Kisumu", path: "/areas/kisumu" },
        { label: "Nakuru", path: "/areas/nakuru" },
        { label: "Karen", path: "/areas/karen" },
      ]}
    canonical="https://www.botaniquedesigners.com/areas/mombasa"
    />
  );
}
