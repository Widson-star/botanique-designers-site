import { useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import projects from "../data/projects";

const FILTERS = ["all", "residential", "estate", "commercial", "inspiration"];

const services = [
  {
    icon: "🌿",
    title: "Landscape Architecture",
    description:
      "Site analysis, master planning, planting design & photorealistic 3D concepts tailored to your property.",
    path: "/services/landscape-architecture",
  },
  {
    icon: "📄",
    title: "EIA Studies",
    description:
      "Environmental Impact Assessments fully compliant with NEMA standards — required for most developments.",
    path: "/services/eia-studies",
  },
  {
    icon: "🛠️",
    title: "Project Implementation",
    description:
      "Full execution of your landscape design — planting, irrigation, hardscape & scheduled maintenance.",
    path: "/services/implementation",
  },
  {
    icon: "✂️",
    title: "Garden Maintenance",
    description:
      "Ongoing care programmes — lawn care, pruning, fertilisation and irrigation checks to keep your space thriving.",
    path: "/services/maintenance",
  },
];

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { openQuoteWizard } = useApp();

  const filtered =
    activeFilter === "all"
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  return (
    <div className="font-sans text-botanique-charcoal pt-24">

      {/* ====== HERO ====== */}
      <section
        id="home"
        className="relative min-h-[85vh] flex items-center justify-center text-center"
      >
        <img
          src="/hero-botanique.jpg"
          alt="Botanique Designers Landscape"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/50" />

        <div className="relative z-10 max-w-3xl px-6">
          <p className="text-white/80 uppercase tracking-widest text-sm font-medium mb-4">
            Kenya's Premier Landscape Design Studio
          </p>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Transforming Outdoor Spaces
          </h1>
          <p className="text-lg md:text-xl text-white/85 mb-10 max-w-xl mx-auto">
            Landscape architecture, environmental impact assessments, and
            premium outdoor solutions — designed with nature in mind.
          </p>

          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => openQuoteWizard()}
              className="px-8 py-3 rounded-full bg-botanique-green text-white font-medium hover:scale-105 transition shadow-lg"
            >
              Request a Quote
            </button>
            <a
              href="https://wa.me/254720861592?text=Hi%20Botanique!%20I%27d%20like%20to%20discuss%20a%20landscape%20project."
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-full bg-white/15 border border-white text-white font-medium hover:bg-white hover:text-botanique-green transition backdrop-blur"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* ====== SERVICES ====== */}
      <section id="services" className="scroll-mt-24 py-24 bg-botanique-beige">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
            What We Do
          </p>
          <h2 className="text-4xl font-bold mb-4">Our Services</h2>
          <p className="text-gray-500 mb-14 max-w-xl mx-auto">
            End-to-end landscape design, environmental compliance, and
            hands-on project delivery across Kenya.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc) => (
              <div
                key={svc.path}
                className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-md transition flex flex-col"
              >
                <span className="text-3xl mb-4">{svc.icon}</span>
                <h3 className="font-semibold text-lg mb-2">{svc.title}</h3>
                <p className="text-gray-500 text-sm flex-1 mb-5">{svc.description}</p>
                <Link
                  to={svc.path}
                  className="text-botanique-green text-sm font-medium hover:underline"
                >
                  Learn more →
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== AREAS STRIP ====== */}
      <section className="bg-botanique-green py-14 text-white text-center">
        <p className="text-sm uppercase tracking-widest text-white/70 mb-3">
          Serving clients across
        </p>
        <h2 className="text-2xl font-bold mb-2">
          All of Kenya & East Africa
        </h2>
        <p className="text-white/75 text-sm mb-7 max-w-xl mx-auto">
          From Mombasa to Eldoret, Nairobi to Kisumu — no project is too far. We work
          nationwide and take on international projects across East Africa.
        </p>
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl mx-auto px-6">
          {[
            { label: "Nairobi", path: "/areas/nairobi" },
            { label: "Mombasa & Coast", path: "/areas/mombasa" },
            { label: "Kisumu", path: "/areas/kisumu" },
            { label: "Nakuru", path: "/areas/nakuru" },
            { label: "Eldoret", path: "/areas/eldoret" },
            { label: "Karen", path: "/areas/karen" },
            { label: "Runda", path: "/areas/runda" },
            { label: "Kiambu", path: "/areas/kiambu" },
            { label: "Westlands", path: "/areas/westlands" },
          ].map((area) => (
            <Link
              key={area.path}
              to={area.path}
              className="px-5 py-2 rounded-full bg-white/15 border border-white/40 text-sm hover:bg-white hover:text-botanique-green transition"
            >
              {area.label}
            </Link>
          ))}
          <span className="px-5 py-2 rounded-full bg-white/10 border border-white/25 text-sm text-white/70 cursor-default">
            + Nyeri · Thika · Nanyuki · Lamu · Machakos & more
          </span>
        </div>
      </section>

      {/* ====== INSTANT QUOTE ====== */}
      <section
        id="instant-quote"
        className="scroll-mt-24 py-24 bg-botanique-beige text-center"
      >
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
            Quick & Easy
          </p>
          <h2 className="text-4xl font-bold mb-4">Get an Instant Quote</h2>
          <p className="text-gray-500 mb-10">
            Describe your project briefly and we'll guide you to the right
            solution — usually within 24 hours.
          </p>

          <div className="bg-white rounded-2xl shadow-md p-10">
            <button
              onClick={() => openQuoteWizard()}
              className="px-8 py-4 rounded-full bg-botanique-green text-white font-medium hover:scale-105 transition text-lg"
            >
              💬 Start Instant Quote
            </button>
            <p className="text-gray-400 text-sm mt-4">
              Takes less than 2 minutes · No commitment required
            </p>
          </div>
        </div>
      </section>

      {/* ====== PROJECTS / GALLERY ====== */}
      <section id="projects" className="py-28 bg-white text-center">
        <div className="max-w-6xl mx-auto px-6">
          <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
            Our Work
          </p>
          <h2 className="text-4xl font-bold mb-4">Completed Projects</h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">
            A selection of landscape and horticultural projects across Kenya.
          </p>

          {/* Filter pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-5 py-2 rounded-full border text-sm font-medium transition ${
                  activeFilter === f
                    ? "bg-botanique-green text-white border-botanique-green"
                    : "bg-white text-gray-600 border-gray-200 hover:border-botanique-green hover:text-botanique-green"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((project, index) => (
              <div
                key={index}
                className="group relative overflow-hidden rounded-2xl shadow-md cursor-pointer"
              >
                <img
                  src={project.image}
                  alt={project.title}
                  className="h-72 w-full object-cover transition-transform duration-500 group-hover:scale-110"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent
                             opacity-0 group-hover:opacity-100 transition-opacity duration-300
                             flex flex-col justify-end px-5 pb-6 text-white"
                >
                  <h3 className="text-lg font-semibold mb-1">{project.title}</h3>
                  <p className="text-sm text-white/80 mb-4">{project.location}</p>
                  <button
                    onClick={() => openQuoteWizard(project.title)}
                    className="self-start px-5 py-2 rounded-full bg-botanique-green text-sm font-medium hover:scale-105 transition"
                  >
                    Request Similar Design
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== CONTACT ====== */}
      <section
        id="contact"
        className="py-28 bg-botanique-beige text-center"
      >
        <div className="max-w-3xl mx-auto px-6">
          <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
            Get in Touch
          </p>
          <h2 className="text-4xl font-bold mb-4">Contact Us</h2>
          <p className="text-gray-500 mb-10">
            Reach out and let's shape your outdoor vision together.
          </p>

          <div className="bg-white rounded-2xl shadow-md p-10">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div className="space-y-5 text-left text-gray-700">
                <p className="flex items-center gap-3">
                  <span className="text-2xl">📍</span>
                  <span>Nairobi, Kenya</span>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-2xl">📧</span>
                  <a href="mailto:botaniquedesigners@gmail.com" className="hover:text-botanique-green transition">
                    botaniquedesigners@gmail.com
                  </a>
                </p>
                <p className="flex items-center gap-3">
                  <span className="text-2xl">📞</span>
                  <a href="tel:+254720861592" className="hover:text-botanique-green transition">
                    +254 720 861 592
                  </a>
                </p>
              </div>
              <div className="flex justify-center md:justify-end gap-6">
                <a href="https://www.instagram.com/botaniquedesigners/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg" alt="Instagram" className="h-8 w-8 hover:opacity-60 transition" />
                </a>
                <a href="https://www.facebook.com/botaniquedesigners" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg" alt="Facebook" className="h-8 w-8 hover:opacity-60 transition" />
                </a>
                <a href="https://x.com/widson_ambaisi" target="_blank" rel="noopener noreferrer" aria-label="X">
                  <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg" alt="X" className="h-8 w-8 hover:opacity-60 transition" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
