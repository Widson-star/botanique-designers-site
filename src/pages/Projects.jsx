import { useState } from "react";
import { useApp } from "../context/AppContext";
import projects from "../data/projects.js";

const FILTERS = ["All", "Residential", "Commercial", "Estate"];

export default function Projects() {
  const [active, setActive] = useState("All");
  const { setQuoteWizardOpen } = useApp();

  const filtered =
    active === "All"
      ? projects
      : projects.filter(
          (p) => p.category.toLowerCase() === active.toLowerCase()
        );

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="bg-botanique-dark pt-28 pb-16 px-6 text-white text-center">
        <p className="text-botanique-green text-sm font-semibold uppercase tracking-widest mb-3">
          Our Work
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Project Portfolio
        </h1>
        <p className="text-white/70 max-w-xl mx-auto text-base leading-relaxed">
          A selection of landscapes we have designed, built and maintained across Kenya — from intimate residential gardens to large commercial developments.
        </p>
      </section>

      {/* Filter tabs */}
      <section className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setActive(f)}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                active === f
                  ? "bg-botanique-green text-white shadow-sm"
                  : "bg-botanique-beige text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
          <span className="ml-auto text-xs text-gray-400 self-center whitespace-nowrap">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project, i) => (
            <ProjectCard key={i} project={project} />
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-center text-gray-400 py-20 text-lg">
            No projects in this category yet.
          </p>
        )}
      </section>

      {/* CTA */}
      <section className="bg-botanique-beige py-16 px-6 text-center">
        <h2 className="text-2xl md:text-3xl font-bold text-botanique-charcoal mb-3">
          Ready to start your project?
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Get a custom quote in under 2 minutes. No obligation.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setQuoteWizardOpen(true)}
            className="px-8 py-3 rounded-full bg-botanique-green text-white font-semibold hover:opacity-90 transition"
          >
            Get an Instant Quote
          </button>
          <a
            href="https://wa.me/254720861592?text=Hi%20Botanique!%20I%20saw%20your%20portfolio%20and%20I%27d%20like%20to%20discuss%20a%20project."
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3 rounded-full border-2 border-botanique-green text-botanique-green font-semibold hover:bg-botanique-green hover:text-white transition"
          >
            WhatsApp Us
          </a>
        </div>
      </section>
    </div>
  );
}

function ProjectCard({ project }) {
  const [loaded, setLoaded] = useState(false);

  const categoryLabel = {
    residential: "Residential",
    commercial: "Commercial",
    estate: "Estate",
    inspiration: "Inspiration",
  }[project.category] || project.category;

  const categoryColor = {
    residential: "bg-emerald-100 text-emerald-700",
    commercial: "bg-blue-100 text-blue-700",
    estate: "bg-amber-100 text-amber-700",
    inspiration: "bg-purple-100 text-purple-700",
  }[project.category] || "bg-gray-100 text-gray-600";

  return (
    <div className="group rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-botanique-beige">
        {!loaded && (
          <div className="absolute inset-0 bg-gray-100 animate-pulse" />
        )}
        <img
          src={project.image}
          alt={project.title}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
        {/* Category badge */}
        <span
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor}`}
        >
          {categoryLabel}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-botanique-charcoal text-base">
          {project.title}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {project.location}
        </p>
      </div>
    </div>
  );
}
