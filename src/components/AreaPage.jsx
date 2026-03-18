import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";

/**
 * Reusable template for geographic service area pages.
 * Pass area-specific props to customise content.
 */
export default function AreaPage({
  areaName,
  heroImage,
  tagline,
  intro,
  extraIntro,
  services,
  whyUs,
  nearbyAreas,
}) {
  const { openQuoteWizard } = useApp();

  return (
    <div className="pt-24 font-sans text-botanique-charcoal">

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center text-center">
        <img
          src={heroImage}
          alt={`Landscape design in ${areaName}`}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 px-6 max-w-3xl">
          <p className="text-white/70 uppercase tracking-widest text-sm mb-3">
            Serving {areaName}
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Landscape Design in {areaName}
          </h1>
          <p className="text-white/80 text-lg">{tagline}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-gray-500">
        <Link to="/" className="hover:text-botanique-green">Home</Link>
        <span className="mx-2">/</span>
        <span>Areas We Serve</span>
        <span className="mx-2">/</span>
        <span>{areaName}</span>
      </div>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Botanique Designers in {areaName}
          </h2>
          <p className="text-gray-600 leading-relaxed">{intro}</p>
          {extraIntro && (
            <p className="text-gray-600 leading-relaxed mt-5">{extraIntro}</p>
          )}
        </div>
      </section>

      {/* Services in this area */}
      <section className="py-16 bg-botanique-beige">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            Services Available in {areaName}
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {services.map((s) => (
              <div key={s.title} className="bg-white rounded-2xl p-6 shadow-sm flex gap-4">
                <span className="text-2xl shrink-0">{s.icon}</span>
                <div>
                  <h3 className="font-semibold text-lg mb-1">{s.title}</h3>
                  <p className="text-gray-500 text-sm">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us in this area */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Why {areaName} Clients Choose Botanique
          </h2>
          <div className="grid sm:grid-cols-2 gap-4 text-left">
            {whyUs.map((point) => (
              <div key={point} className="flex gap-3 items-start bg-botanique-beige rounded-xl p-4">
                <span className="text-botanique-green font-bold text-lg mt-0.5">✓</span>
                <p className="text-gray-700 text-sm">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-botanique-green text-white text-center">
        <h2 className="text-3xl font-bold mb-4">
          Get a Quote for Your {areaName} Property
        </h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          We provide free site consultations and quotes across {areaName} and
          surrounding areas. Contact us today to get started.
        </p>
        <button
          onClick={() => openQuoteWizard()}
          className="px-8 py-4 rounded-full bg-white text-botanique-green font-semibold hover:scale-105 transition"
        >
          Request a Free Quote
        </button>
      </section>

      {/* Nearby areas */}
      {nearbyAreas && nearbyAreas.length > 0 && (
        <section className="py-12 bg-botanique-beige text-center">
          <p className="text-gray-500 text-sm mb-4">We also serve</p>
          <div className="flex flex-wrap justify-center gap-3">
            {nearbyAreas.map((a) => (
              <Link
                key={a.path}
                to={a.path}
                className="px-5 py-2 rounded-full border border-botanique-green text-botanique-green text-sm hover:bg-botanique-green hover:text-white transition"
              >
                {a.label}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
