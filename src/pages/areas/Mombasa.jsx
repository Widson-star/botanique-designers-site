import AreaPage from "../../components/AreaPage";

export default function Mombasa() {
  return (
    <AreaPage
      areaName="Mombasa & Coast"
      heroImage="/project-commercial.jpg"
      tagline="Coastal landscape design for Mombasa's villas, hotels and resorts — rooted in the tropical character of the Kenyan coast."
      intro="The Kenyan coast offers a landscape canvas unlike anywhere in the country — tropical species, coastal soils, salt-tolerant plants, and an aesthetic shaped by the Indian Ocean. Botanique Designers brings specialist knowledge of coastal planting and experience designing outdoor spaces that thrive in the heat and humidity of the Coast region. Whether you own a Mombasa residence, a boutique hotel in Diani, a resort on the North Coast, or a property anywhere in Kwale, Kilifi or Lamu counties — we design and deliver landscapes that feel authentically coastal and lasting."
      extraIntro="The coast presents a distinct planting environment — sandy, well-draining soils, high humidity, salt-laden air, and temperatures that rarely drop below 25°C. Species that perform here include Coconut Palm (Cocos nucifera), Frangipani (Plumeria rubra), Bougainvillea, Casuarina equisetifolia as windbreaks, Scaevola taccada for beachfront edges, and Traveller's Palm (Ravenala madagascariensis) for dramatic focal points. Lawns in Mombasa typically use Buffalo grass or Bermuda grass — both handle the heat and recover well from salt exposure."
      services={[
        {
          title: "Landscape Architecture",
          desc: "Bespoke garden design for coastal properties — tropical planting schemes, palm gardens, resort-style layouts and 3D visualisations.",
        },
        {
          title: "Plant Taxonomy & Botanical Labelling",
          desc: "Identification, labelling and tagging of trees and plants for institutional campuses and botanic gardens across the Coast region.",
        },
        {
          title: "Project Implementation",
          desc: "Full build-out of your coastal landscape design — planting, irrigation, hardscape, water features and outdoor structures.",
        },
        {
          title: "Garden Maintenance",
          desc: "Maintenance and aftercare assessed and agreed alongside your Mombasa project — scope and frequency confirmed on site. GardenCare, our scheduled maintenance programme, currently covers the Nairobi Metropolitan Area only.",
        },
      ]}
      whyUs={[
        "Knowledge of salt-tolerant and coastal-climate plant species",
        "Salt-tolerant planting design and species selection for coastal sites",
        "Project logistics agreed before mobilisation",
        "Coastal planting schemes for residences, hotels and resorts",
        "Species selection matched to coastal soils, salt and humidity",
        "Plant establishment and aftercare agreed per project",
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
