import { useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useApp } from "../context/AppContext";
import FadeIn from "../components/FadeIn";
import { buildGardenCareMessage, waLink } from "../utils/whatsapp";

const GARDEN_MAINTENANCE_SERVICE = "Garden Maintenance & Aftercare";

const COVERAGE_TEXT =
  "Nairobi Metropolitan Area — Nairobi City and selected accessible locations in Kiambu, Kajiado and Machakos counties, subject to site assessment and route availability.";

const PROGRAMMES = [
  {
    name: "GardenCare Regular",
    frequency: "Weekly or fortnightly",
    desc: "For lawns and actively managed gardens that need frequent mowing and active bed management.",
  },
  {
    name: "GardenCare Monthly",
    frequency: "One comprehensive visit a month",
    desc: "For established, lower-maintenance gardens that don't need frequent visits.",
  },
  {
    name: "GardenCare Seasonal",
    frequency: "Quarterly",
    desc: "A quarterly assessment and corrective-care visit. This is not a substitute for routine lawn maintenance.",
  },
];

const ROUTINE_ACTIVITIES = [
  "Lawn mowing and edging",
  "Routine hedge and shrub pruning",
  "Bed weeding",
  "Deadheading",
  "Routine garden cleanup",
  "Plant-health observation",
  "Basic irrigation observation",
  "Agreed feeding or seasonal tasks",
];

const SEPARATELY_QUOTED = [
  "Fertiliser, pesticides and specialist treatments",
  "Replacement plants",
  "Soil, mulch and other materials",
  "Irrigation repair or new irrigation work",
  "Garden redesign and new installations",
  "Major lawn rehabilitation",
  "Hazardous or specialist tree work",
  "Substantial or offsite waste removal",
  "Emergency or unscheduled work",
];

const HOW_IT_WORKS = [
  { step: "Enquire", desc: "Tell us about your garden and what you're looking for." },
  { step: "Coverage & suitability check", desc: "We confirm your property is within the GardenCare coverage area and that the assessed work fits one of the three programmes." },
  { step: "Charged garden/site assessment", desc: "A paid visit to assess your garden — this uses our existing site-visit process; no new assessment fee is introduced." },
  { step: "Property-specific proposal", desc: "We propose a scope and custom price for your garden." },
  { step: "Written agreement & advance payment", desc: "You accept a written agreement and pay in advance for the agreed period." },
  { step: "Scheduled service", desc: "We deliver the agreed programme on the agreed schedule." },
  { step: "Short WhatsApp visit summary", desc: "After each visit, we send a short WhatsApp summary of what was done." },
];

const TERMS_SUMMARY = [
  "GardenCare Regular and Monthly: an initial three-month minimum term, then continuing on a rolling monthly basis.",
  "GardenCare Regular and Monthly: invoiced and paid monthly in advance.",
  "After the initial term, either side can end the rolling agreement with 30 days' written notice.",
  "GardenCare Seasonal: quarterly, paid before each scheduled visit — no three-month/rolling term.",
  "Your assessment fee is credited to your first GardenCare invoice if you accept the agreement within 14 calendar days of the assessment.",
  "VAT is applied only where legally applicable and is shown clearly on the relevant proposal or invoice.",
  "If weather makes a visit unsafe or impractical, it moves to the next practical available date — you don't lose the visit.",
  "You'll need to provide confirmed access at the scheduled time, and reasonable water access where the agreed work requires it.",
  "A visit you prevent without at least 24 hours' notice counts as a scheduled visit; a replacement visit may be separately charged and is subject to route availability.",
  "Ordinary garden waste is consolidated on site; offsite transport or substantial removal is quoted separately.",
  "Materials like fertiliser, replacement plants, soil or mulch need your written approval (WhatsApp, email or another written channel) before we purchase them.",
  "Emergency or unscheduled work sits outside the standard agreement and is quoted separately, subject to availability.",
];

const FAQS = [
  {
    q: "Where does GardenCare operate?",
    a: "GardenCare covers the Nairobi Metropolitan Area — Nairobi City and selected accessible locations in Kiambu, Kajiado and Machakos counties, subject to site assessment and route availability. Not every location in those counties is automatically covered.",
  },
  {
    q: "How much does GardenCare cost?",
    a: "GardenCare is custom-priced after a garden and location assessment — we don't publish generic package prices, visit durations, labour hours or crew sizes, because the right scope depends on your garden. Your assessment fee is credited to your first GardenCare invoice if you accept the agreement within 14 calendar days of the assessment.",
  },
  {
    q: "How often will my garden be visited?",
    a: "It depends on the programme that fits your garden: GardenCare Regular is weekly or fortnightly for actively managed gardens, GardenCare Monthly is one comprehensive visit a month for established gardens, and GardenCare Seasonal is a quarterly assessment and corrective-care visit — not a substitute for routine lawn maintenance.",
  },
  {
    q: "What work is included?",
    a: "The exact activities are agreed for your property after assessment, and may include lawn mowing and edging, routine hedge and shrub pruning, bed weeding, deadheading, routine garden cleanup, plant-health observation, basic irrigation observation, and agreed feeding or seasonal tasks. Not every activity is included in every visit or programme — your scope is set at assessment.",
  },
  {
    q: "Are materials and replacement plants included?",
    a: "No — fertiliser, pesticides and specialist treatments, replacement plants, and soil, mulch or other materials are separately quoted and need your written approval before we purchase them. GardenCare doesn't promise automatic plant replacement or guaranteed plant survival.",
  },
  {
    q: "How long is a GardenCare agreement?",
    a: "GardenCare Regular and Monthly run for an initial three-month minimum term, then continue on a rolling monthly basis. GardenCare Seasonal is quarterly, paid before each scheduled visit, with no three-month/rolling term.",
  },
  {
    q: "Can I cancel?",
    a: "After the initial three-month term, you can end a rolling GardenCare Regular or Monthly agreement with 30 days' written notice. We don't offer \"cancel anytime\" — ending the agreement during the initial three-month term is subject to the signed agreement.",
  },
  {
    q: "What happens if weather affects a visit?",
    a: "If weather makes the work unsafe or impractical, we move the visit to the next practical available date — you don't lose it, and we don't promise a fixed replacement date regardless of conditions or route availability.",
  },
  {
    q: "What if I miss giving access for a visit?",
    a: "Please give confirmed access at the scheduled time, and reasonable water access where the agreed work needs it. If a visit is prevented without at least 24 hours' notice, it counts as a scheduled visit; a replacement visit may be separately charged and is subject to route availability.",
  },
  {
    q: "How will I know what was done at each visit?",
    a: "We send a short WhatsApp summary after each visit. GardenCare doesn't currently offer a client portal, live dashboard or automated maintenance log.",
  },
  {
    q: "What about larger commercial or institutional grounds?",
    a: "The three GardenCare programmes are for residential properties and smaller commercial, institutional or hospitality sites where the assessed work fits them. Larger or operationally complex grounds — such as extensive estate common areas, campuses, large hotels, hospitals or major institutional properties — remain Botanique Designers clients but are handled through a separately scoped, bespoke commercial maintenance agreement rather than the three standard GardenCare programmes.",
  },
];

export default function GardenCare() {
  const { openQuoteWizard } = useApp();
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  const gardenCareWaLink = waLink(
    buildGardenCareMessage({ programme: selectedProgramme })
  );

  return (
    <div className="pt-20 font-sans text-botanique-charcoal">
      <Helmet>
        <title>GardenCare — Scheduled Garden Maintenance in Nairobi | Botanique Designers</title>
        <meta
          name="description"
          content="GardenCare is Botanique Designers' scheduled garden maintenance programme for the Nairobi Metropolitan Area — Regular, Monthly and Seasonal options, custom-priced after assessment."
        />
        <link rel="canonical" href="https://www.botaniquedesigners.com/gardencare" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.botaniquedesigners.com/gardencare" />
        <meta property="og:title" content="GardenCare — Scheduled Garden Maintenance | Botanique Designers" />
        <meta
          property="og:description"
          content="Scheduled garden maintenance for the Nairobi Metropolitan Area — GardenCare Regular, Monthly and Seasonal, custom-priced after assessment."
        />
        <meta property="og:image" content="https://www.botaniquedesigners.com/hero-botanique.jpg" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Service",
            name: "GardenCare",
            serviceType: "Scheduled garden maintenance",
            description:
              "Scheduled garden maintenance programme offered by Botanique Designers — GardenCare Regular, GardenCare Monthly and GardenCare Seasonal — custom-scoped and priced after a garden and location assessment.",
            areaServed: {
              "@type": "AdministrativeArea",
              name: "Nairobi Metropolitan Area (Nairobi City and selected accessible locations in Kiambu, Kajiado and Machakos counties, subject to site assessment and route availability)",
            },
            provider: {
              "@type": "LocalBusiness",
              name: "Botanique Designers",
              url: "https://www.botaniquedesigners.com",
            },
            url: "https://www.botaniquedesigners.com/gardencare",
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.botaniquedesigners.com/" },
              { "@type": "ListItem", position: 2, name: "GardenCare", item: "https://www.botaniquedesigners.com/gardencare" },
            ],
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-[55vh] flex items-center justify-center text-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/projects/project-14.jpg')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/65" />
        <div className="relative z-10 px-6 max-w-3xl">
          <p className="text-white/70 uppercase tracking-widest text-sm mb-3">
            A Botanique Designers Programme
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            GardenCare by Botanique Designers
          </h1>
          <p className="text-white/85 text-lg mb-3">
            Scheduled garden maintenance, agreed to your property and delivered on
            a written agreement.
          </p>
          <p className="text-white/70 text-sm mb-8 max-w-xl mx-auto">
            {COVERAGE_TEXT}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => openQuoteWizard(GARDEN_MAINTENANCE_SERVICE)}
              className="px-8 py-3 rounded-full bg-botanique-green text-white font-medium hover:scale-105 transition shadow-lg"
            >
              Start a GardenCare Enquiry
            </button>
            <a
              href={gardenCareWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-full bg-white/15 border border-white text-white font-medium hover:bg-white hover:text-botanique-green transition backdrop-blur"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <span className="text-botanique-green">GardenCare</span>
        </div>
      </div>

      {/* Programme structures */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">GardenCare Programmes</h2>
            <p className="text-gray-500 text-center max-w-2xl mx-auto mb-12">
              Three programmes, each suited to a different kind of garden. Select
              one to include it in your WhatsApp message — the exact scope is
              always agreed after assessment.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {PROGRAMMES.map((p) => (
                <button
                  key={p.name}
                  onClick={() => setSelectedProgramme(p.name)}
                  aria-pressed={selectedProgramme === p.name}
                  className={`text-left bg-white rounded-2xl p-6 border-2 shadow-sm hover:shadow-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-botanique-green focus-visible:ring-offset-2 ${
                    selectedProgramme === p.name
                      ? "border-botanique-green"
                      : "border-gray-100"
                  }`}
                >
                  <h3 className="font-bold text-lg text-botanique-charcoal mb-1">{p.name}</h3>
                  <p className="text-botanique-green text-sm font-medium mb-3">{p.frequency}</p>
                  <p className="text-sm text-gray-500">{p.desc}</p>
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-xs text-center mt-6">
              Custom-priced after assessment — no generic package prices, visit
              durations, labour hours or crew sizes are published.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* Custom scope */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Your Scope, Agreed After Assessment</h2>
            <p className="text-gray-600 text-center mb-10">
              We agree the exact activities for your garden after a site
              assessment. Depending on your programme and scope, this may
              include:
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {ROUTINE_ACTIVITIES.map((item) => (
                <div key={item} className="flex items-start gap-3 bg-white rounded-xl p-4 shadow-sm">
                  <span className="text-botanique-green font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
            <p className="text-gray-400 text-xs text-center mt-6">
              This is a menu of possible routine work — not every activity is
              included in every visit or programme.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* Separately quoted */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Scope Boundaries</h2>
            <p className="text-gray-600 text-center mb-10">
              GardenCare is routine, ongoing garden care. The following sit
              outside the standard agreement and are quoted separately:
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              {SEPARATELY_QUOTED.map((item) => (
                <div key={item} className="flex items-start gap-3 bg-botanique-beige rounded-xl p-4">
                  <span className="text-gray-400 mt-0.5">·</span>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* How it works */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">How It Works</h2>
            <div className="space-y-0">
              {HOW_IT_WORKS.map((step, i) => (
                <div key={step.step} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-botanique-green text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    {i < HOW_IT_WORKS.length - 1 && (
                      <div className="w-0.5 h-full bg-botanique-green/20 mt-2" />
                    )}
                  </div>
                  <div className="pb-10">
                    <h3 className="font-bold text-botanique-charcoal">{step.step}</h3>
                    <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Commercial terms summary */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Agreement Terms, in Plain Language</h2>
            <p className="text-gray-500 text-center mb-10">
              The essentials of a GardenCare agreement — the full terms are set
              out in your written agreement.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              {TERMS_SUMMARY.map((item) => (
                <div key={item} className="flex items-start gap-3 bg-botanique-beige rounded-xl p-4">
                  <span className="text-botanique-green font-bold mt-0.5">✓</span>
                  <p className="text-sm text-gray-700">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Segmentation */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-6">Larger or Complex Grounds</h2>
            <p className="text-gray-600 leading-relaxed">
              The three GardenCare programmes serve residential properties and
              smaller commercial, institutional or hospitality sites where
              assessment confirms the work fits them. Larger or operationally
              complex grounds — including extensive estate common areas,
              campuses, large hotels, hospitals and major institutional
              properties — remain Botanique Designers clients, but are handled
              through a separately scoped, bespoke commercial maintenance
              agreement rather than the three standard GardenCare programmes.
              Suitability is determined through assessment.
            </p>
          </div>
        </section>
      </FadeIn>

      {/* FAQs */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-10">GardenCare FAQs</h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-6">
              {FAQS.map((item, i) => {
                const panelId = `gardencare-faq-panel-${i}`;
                return (
                  <div key={item.q} className="border-b border-gray-200 last:border-b-0">
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      aria-expanded={openFaq === i}
                      aria-controls={panelId}
                      className="w-full text-left py-5 px-1 flex items-start justify-between gap-4 cursor-pointer"
                    >
                      <span className="font-semibold text-botanique-charcoal pr-4">{item.q}</span>
                      <svg
                        aria-hidden="true"
                        className={`w-5 h-5 text-botanique-green flex-shrink-0 mt-0.5 transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    <div
                      id={panelId}
                      className={`overflow-hidden transition-all duration-300 ${openFaq === i ? "max-h-[500px] pb-5" : "max-h-0"}`}
                    >
                      <p className="text-gray-600 leading-relaxed px-1">{item.a}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* CTA */}
      <section className="py-20 bg-botanique-green text-white text-center">
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">Start Your GardenCare Enquiry</h2>
          <p className="text-white/80 mb-8">
            Tell us about your garden and we'll arrange a site assessment —
            custom-priced, no generic package prices.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => openQuoteWizard(GARDEN_MAINTENANCE_SERVICE)}
              className="px-8 py-4 rounded-full bg-white text-botanique-green font-semibold hover:scale-105 transition"
            >
              Start a GardenCare Enquiry
            </button>
            <a
              href={gardenCareWaLink}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-4 rounded-full font-semibold hover:bg-white/10 transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
