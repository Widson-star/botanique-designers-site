import AreaPage from "../../components/AreaPage";

export default function Kiambu() {
  return (
    <AreaPage
      areaName="Kiambu County"
      heroImage="/projects/project-6.jpg"
      tagline="Landscape architecture and garden services across Kiambu County — from Ruiru and Thika to Limuru and beyond."
      intro="Kiambu County's peri-urban and semi-rural character offers some of Kenya's most beautiful setting for landscape design. With a cooler climate, fertile soils and increasingly affluent residential developments, Kiambu is a growing market for quality landscape services. Botanique Designers serves clients across the county — including Ruiru, Thika, Kiambu Town, Limuru, Tigoni and Loresho — with the same standard of service we deliver in Nairobi."
      services={[
        {
          icon: "🌿",
          title: "Landscape Design",
          desc: "Site analysis and master planning suited to Kiambu's varied topography — from flat plots to sloped hillside gardens.",
        },
        {
          icon: "🛠️",
          title: "Implementation",
          desc: "Full landscape build-out across Kiambu County, leveraging locally available plant material where suitable.",
        },
        {
          icon: "📄",
          title: "EIA Studies",
          desc: "NEMA-compliant environmental impact assessments for residential and commercial developments in Kiambu.",
        },
        {
          icon: "✂️",
          title: "Garden Maintenance",
          desc: "Scheduled maintenance programmes for Kiambu homeowners and residential development managers.",
        },
      ]}
      whyUs={[
        "Familiar with Kiambu's varied soils, rainfall and plant species",
        "Experience with sloped and terraced garden designs common in the region",
        "Competitive rates for Kiambu properties — reflecting lower transport costs",
        "Strong local plant sourcing knowledge in the Kiambu region",
        "Trusted by residential developers in Ruiru, Thika and surrounding towns",
        "Fast site visits — our team is regularly working in Kiambu County",
      ]}
      nearbyAreas={[
        { label: "Runda", path: "/areas/runda" },
        { label: "Karen", path: "/areas/karen" },
        { label: "Nairobi CBD", path: "/areas/nairobi" },
      ]}
    canonical="https://www.botaniquedesigners.com/areas/kiambu"
    />
  );
}
