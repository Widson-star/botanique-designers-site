import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";

const plans = [
  {
    name: "Basic Care",
    freq: "Monthly",
    features: [
      "Lawn mowing & edging",
      "Debris & leaf clearance",
      "Irrigation check",
      "Basic weed control",
    ],
  },
  {
    name: "Standard Garden",
    freq: "Bi-weekly",
    features: [
      "All Basic Care inclusions",
      "Shrub pruning & shaping",
      "Fertilisation programme",
      "Pest & disease inspection",
      "Seasonal replanting",
    ],
    featured: true,
  },
  {
    name: "Premium Estate",
    freq: "Weekly",
    features: [
      "All Standard inclusions",
      "Tree care & crown management",
      "Full irrigation servicing",
      "Soil health monitoring",
      "Priority response visits",
      "Annual design refresh consultation",
    ],
  },
];

const tasks = [
  { icon: "✂️", title: "Lawn Mowing & Edging", desc: "Precision cutting to the right height for your grass species." },
  { icon: "🌳", title: "Pruning & Shaping", desc: "Shrubs, hedges and ornamental trees maintained to shape." },
  { icon: "💊", title: "Fertilisation", desc: "Seasonal soil feeding to keep plants vigorous and flowering well." },
  { icon: "🐛", title: "Pest & Disease Control", desc: "Regular inspection and treatment to prevent and manage outbreaks." },
  { icon: "💧", title: "Irrigation Servicing", desc: "Checking, cleaning and adjusting irrigation systems for efficiency." },
  { icon: "🌱", title: "Seasonal Planting", desc: "Colour rotations and seasonal beds to keep your garden looking fresh." },
];

export default function Maintenance() {
  const { openQuoteWizard } = useApp();

  return (
    <>
      <Helmet>
        <title>Garden Maintenance Services Kenya | Botanique Designers</title>
        <link rel="canonical" href="https://www.botaniquedesigners.com/services/maintenance" />
      </Helmet>
    <div className="pt-24 font-sans text-botanique-charcoal">

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center text-center">
        <img
          src="/projects/project-6.jpg"
          alt="Garden Maintenance Nairobi"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 px-6 max-w-3xl">
          <p className="text-white/70 uppercase tracking-widest text-sm mb-3">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Garden Maintenance
          </h1>
          <p className="text-white/80 text-lg">
            Ongoing care programmes that keep your landscape thriving season
            after season — tailored to your property and schedule.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-gray-500">
        <Link to="/" className="hover:text-botanique-green">Home</Link>
        <span className="mx-2">/</span>
        <span>Garden Maintenance</span>
      </div>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            A Beautiful Garden Doesn't Maintain Itself
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            A well-designed landscape needs consistent, skilled care to remain at
            its best. Our maintenance programmes remove the guesswork — giving you
            a healthy, beautiful outdoor space without the effort.
          </p>
          <p className="text-gray-600 leading-relaxed">
            We work with residential homeowners, estate managers and commercial property
            managers across Nairobi and the surrounding counties on scheduled, contract-based
            maintenance programmes.
          </p>
        </div>
      </section>

      {/* What we do */}
      <section className="py-16 bg-botanique-beige">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">What We Take Care Of</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {tasks.map((t) => (
              <div key={t.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl mb-3 block">{t.icon}</span>
                <h3 className="font-semibold text-lg mb-2">{t.title}</h3>
                <p className="text-gray-500 text-sm">{t.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section className="py-16 bg-white">
        <div className="max-w-5xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Maintenance Plans</h2>
          <p className="text-gray-500 mb-12">Pricing is customised to your property size and specific requirements. These plans give a guide to what's included.</p>
          <div className="grid sm:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`rounded-2xl p-7 text-left ${
                  plan.featured
                    ? "bg-botanique-green text-white shadow-xl scale-105"
                    : "bg-botanique-beige text-botanique-charcoal"
                }`}
              >
                {plan.featured && (
                  <span className="text-xs uppercase tracking-widest bg-white/20 text-white px-3 py-1 rounded-full mb-4 inline-block">
                    Most Popular
                  </span>
                )}
                <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
                <p className={`text-sm mb-5 ${plan.featured ? "text-white/70" : "text-gray-500"}`}>
                  {plan.freq}
                </p>
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className={`text-sm flex gap-2 ${plan.featured ? "text-white/90" : "text-gray-600"}`}>
                      <span>{plan.featured ? "✓" : "•"}</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-botanique-green text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Get a Maintenance Quote</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Tell us about your garden and we'll design a maintenance programme that
          keeps it beautiful year-round.
        </p>
        <button
          onClick={() => openQuoteWizard("Garden Maintenance & Aftercare")}
          className="px-8 py-4 rounded-full bg-white text-botanique-green font-semibold hover:scale-105 transition"
        >
          Get a Maintenance Plan
        </button>
      </section>

      {/* Related */}
      <section className="py-12 bg-botanique-beige text-center">
        <p className="text-gray-500 text-sm mb-4">Explore related services</p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { label: "Landscape Architecture", path: "/services/landscape-architecture" },
            { label: "Project Implementation", path: "/services/implementation" },
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
    </>
  );
}
