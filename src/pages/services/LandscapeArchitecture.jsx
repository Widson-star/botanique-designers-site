import { Link } from "react-router-dom";
import { useApp } from "../../context/AppContext";

const process = [
  {
    step: "01",
    title: "Initial Consultation",
    desc: "We meet on-site to understand your vision, assess the space, and discuss goals, budget, and timeline.",
  },
  {
    step: "02",
    title: "Site Analysis",
    desc: "A thorough survey of soil, drainage, sunlight, existing vegetation and any structural constraints.",
  },
  {
    step: "03",
    title: "Concept Design",
    desc: "We present 2D master plans, planting schedules and photorealistic 3D renders for your review.",
  },
  {
    step: "04",
    title: "Implementation",
    desc: "Once approved, our team executes the full design — sourcing plants, materials and managing the project.",
  },
];

const related = [
  { label: "Project Implementation", path: "/services/implementation" },
  { label: "Garden Maintenance", path: "/services/maintenance" },
  { label: "EIA Studies", path: "/services/eia-studies" },
];

export default function LandscapeArchitecture() {
  const { openQuoteWizard } = useApp();

  return (
    <div className="pt-24 font-sans text-botanique-charcoal">

      {/* Hero */}
      <section className="relative min-h-[50vh] flex items-center justify-center text-center">
        <img
          src="/projects/project-2.jpg"
          alt="Landscape Architecture in Nairobi"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 px-6 max-w-3xl">
          <p className="text-white/70 uppercase tracking-widest text-sm mb-3">Our Services</p>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Landscape Architecture
          </h1>
          <p className="text-white/80 text-lg">
            From concept to completion — master planning, planting design and 3D
            visualisation for every outdoor space.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="max-w-6xl mx-auto px-6 py-4 text-sm text-gray-500">
        <Link to="/" className="hover:text-botanique-green">Home</Link>
        <span className="mx-2">/</span>
        <span>Landscape Architecture</span>
      </div>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-6">
            Designing Spaces That Feel As Good As They Look
          </h2>
          <p className="text-gray-600 leading-relaxed mb-4">
            At Botanique Designers, landscape architecture is more than arranging plants.
            We design outdoor environments that balance beauty, function and ecological
            health — creating spaces that enhance property value and wellbeing.
          </p>
          <p className="text-gray-600 leading-relaxed">
            Whether you own a residential plot in Karen, a commercial complex in Westlands,
            or a large estate in Runda, we develop bespoke designs grounded in the
            specific conditions of your land.
          </p>
        </div>
      </section>

      {/* What's included */}
      <section className="py-16 bg-botanique-beige">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">
            What's Included
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: "🗺️", title: "Site Survey & Analysis", desc: "Topographic analysis, soil testing, drainage mapping and solar orientation study." },
              { icon: "📐", title: "Master Planning", desc: "Detailed 2D layout plans showing zones, circulation, planting and hardscape elements." },
              { icon: "🌺", title: "Planting Design", desc: "Species selection based on soil, climate, water requirements and aesthetic goals." },
              { icon: "💧", title: "Irrigation Planning", desc: "Efficient drip and spray irrigation designs integrated into the landscape plan." },
              { icon: "🏗️", title: "Hardscape Design", desc: "Pathways, retaining walls, terracing, outdoor seating areas and structural features." },
              { icon: "🖥️", title: "3D Visualisation", desc: "Photorealistic renders that let you see exactly how your space will look before we begin." },
            ].map((item) => (
              <div key={item.title} className="bg-white rounded-2xl p-6 shadow-sm">
                <span className="text-3xl mb-3 block">{item.icon}</span>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-16 bg-white">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-center mb-12">Our Process</h2>
          <div className="space-y-8">
            {process.map((p) => (
              <div key={p.step} className="flex gap-6 items-start">
                <div className="text-3xl font-bold text-botanique-green/30 w-14 shrink-0 text-right">
                  {p.step}
                </div>
                <div className="border-l-2 border-botanique-green/20 pl-6">
                  <h3 className="font-semibold text-lg mb-1">{p.title}</h3>
                  <p className="text-gray-500 text-sm">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-botanique-green text-white text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to Design Your Outdoor Space?</h2>
        <p className="text-white/80 mb-8 max-w-xl mx-auto">
          Get a tailored quote for your landscape architecture project. We serve
          Nairobi, Karen, Runda, Kiambu, Westlands and surrounding areas.
        </p>
        <button
          onClick={() => openQuoteWizard("Landscape Design & Architecture")}
          className="px-8 py-4 rounded-full bg-white text-botanique-green font-semibold hover:scale-105 transition"
        >
          Get a Free Quote
        </button>
      </section>

      {/* Related services */}
      <section className="py-12 bg-botanique-beige text-center">
        <p className="text-gray-500 text-sm mb-4">Explore related services</p>
        <div className="flex flex-wrap justify-center gap-3">
          {related.map((r) => (
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
