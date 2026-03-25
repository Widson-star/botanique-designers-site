import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useApp } from "../../context/AppContext";

const scope = [
  { icon: "🌱", title: "Planting & Horticulture", desc: "Sourcing and planting of trees, shrubs, ground covers, lawn and feature plants specified in the design." },
  { icon: "💧", title: "Irrigation Installation", desc: "Fully automated drip and spray irrigation systems with smart controllers and moisture sensors." },
  { icon: "🧱", title: "Hardscape Construction", desc: "Pathways, patios, retaining walls, stepping stones, pergolas and outdoor structures built to last." },
  { icon: "🪨", title: "Soil Preparation", desc: "Top soil conditioning, organic amendment and grading to ensure a healthy growing environment." },
  { icon: "💡", title: "Outdoor Lighting", desc: "Ambient and feature lighting that extends usability and enhances the landscape after dark." },
  { icon: "🏗️", title: "Project Management", desc: "A dedicated project manager oversees every step, ensuring quality, budget and schedule compliance." },
];

export default function Implementation() {
  const { openQuoteWizard } = useApp();

  return (
    <div className="pt-24 font-sans text-botanique-charcoal">
      <Helmet>
        <title>Landscape Implementation · Garden Construction &amp; Build-Out Kenya | Botanique Designers</title>
        <meta name="description" content="Full landscape implementation in Kenya — planting, irrigation, hardscape construction, outdoor lighting, soil preparation and project management." />
        <link rel="canonical" href="https://www.botaniquedesigners.com/services/implementation" />
      </Helmet>

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center text-center">
        <img
          src="/projects/project-4.jpg"
          alt="Landscape Implementation Nairobi"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 px-6 max-w-3xl">
          <p className="text-white/70 uppercase tracking-widest text-sm mb-3">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Project Implementation
          </h1>
          <p className="text-white/80 text-lg">
            Turning approved landscape designs into stunning, thriving outdoor
            spaces — executed with precision and care.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-gray-500">
        <Link to="/" className="hover:text-botanique-green">Home</Link>
        <span className="mx-2">/</span>
        <span>Project Implementation</span>
      </div>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            From Blueprint to Beautiful Reality
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            Design alone doesn't transform a space — skilled implementation does.
            Our on-the-ground team brings landscape designs to life with craftsmanship,
            horticultural expertise and a commitment to finishing on time and on budget.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We implement both our own designs and designs prepared by other architects.
            If you have approved plans and need a reliable contractor, we can step in at
            the implementation stage.
          </p>
        </div>
      </section>

      {/* Scope */}
      <section className="py-16 bg-botanique-beige">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Scope of Work</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {scope.map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Guarantee */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <div className="bg-botanique-beige rounded-2xl p-10 text-center">
            <span className="text-4xl mb-4 block">🌿</span>
            <h2 className="text-2xl font-bold mb-4">Plant Establishment Warranty</h2>
            <p className="text-gray-600 leading-relaxed">
              All planted material comes with a 90-day establishment warranty. If any plant
              fails to thrive within the first three months due to a planting issue, we
              replace it at no additional cost to you. We stand behind our work.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-botanique-green text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Start Your Project?</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Tell us about your space and we'll provide a detailed implementation
          quote within 24 hours.
        </p>
        <button
          onClick={() => openQuoteWizard("Landscape Implementation & Construction")}
          className="px-8 py-4 rounded-full bg-white text-botanique-green font-semibold hover:scale-105 transition"
        >
          Get an Implementation Quote
        </button>
      </section>

      {/* Related */}
      <section className="py-12 bg-botanique-beige text-center">
        <p className="text-gray-500 text-sm mb-4">Explore related services</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: "Landscape Architecture", path: "/services/landscape-architecture" },
            { label: "Garden Maintenance", path: "/services/maintenance" },
          ].map((r) => (
            <Link
              key={r.path}
              to={r.path}
              className="px-5 py-2 rounded-full border border-botanique-green text-botanique-green text-sm hover:bg-botanique-green hover:text-white transition"
            >
              {r.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
