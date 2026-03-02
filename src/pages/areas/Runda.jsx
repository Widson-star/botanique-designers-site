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
          title: "Ongoing Maintenance",
          desc: "Tailored maintenance contracts for Runda estates including lawn care, tree management and irrigation servicing.",
        },
        {
          icon: "📄",
          title: "EIA Studies",
          desc: "Environmental assessments for any development or significant land alteration on your Runda property.",
        },
      ]}
      whyUs={[
        "Experience with Runda's large-format estate landscaping requirements",
        "Sensitive to the mature tree canopy and ecological character of the area",
        "Professional crews trained to work within gated, secure properties",
        "Flexible scheduling to suit estate management and homeowner availability",
        "Clear, transparent quotations with no hidden costs",
        "Consistent quality across every project visit",
      ]}
      nearbyAreas={[
        { label: "Karen", path: "/areas/karen" },
        { label: "Kiambu", path: "/areas/kiambu" },
        { label: "Westlands", path: "/areas/westlands" },
      ]}
    />
  );
}
