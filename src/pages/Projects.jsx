import { useState, useEffect, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { useApp } from "../context/AppContext";
import projects from "../data/projects.js";

const filters = [
  { value: "all", label: "All Projects" },
  { value: "residential", label: "Residential" },
  { value: "estate", label: "Estate" },
  { value: "design", label: "3D Designs" },
  { value: "international", label: "International" },
];

export default function Projects() {
  const [active, setActive] = useState("all");
  const [lightboxIndex, setLightboxIndex] = useState(null);
  const { setQuoteWizardOpen } = useApp();

  const filtered =
    active === "all"
      ? projects
      : projects.filter((p) => p.category === active);

  // Map filtered index back to open the right lightbox item
  function openLightbox(filteredIdx) {
    setLightboxIndex(filteredIdx);
  }

  function closeLightbox() {
    setLightboxIndex(null);
  }

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i + 1) % filtered.length);
  }, [filtered.length]);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i - 1 + filtered.length) % filtered.length);
  }, [filtered.length]);

  // Keyboard navigation
  useEffect(() => {
    if (lightboxIndex === null) return;
    function onKey(e) {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIndex, goNext, goPrev]);

  // Prevent body scroll when lightbox is open
  useEffect(() => {
    document.body.style.overflow = lightboxIndex !== null ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [lightboxIndex]);

  return (
    <div className="min-h-screen bg-white">
      <Helmet>
        <title>Our Projects · Landscape Portfolio Kenya | Botanique Designers</title>
        <meta name="description" content="Browse Botanique Designers' portfolio of completed landscape projects across Kenya — residential gardens, estate landscaping, commercial properties and more." />
        <link rel="canonical" href="https://www.botaniquedesigners.com/projects" />
      </Helmet>

      {/* Hero */}
      <section className="bg-botanique-dark pt-28 pb-16 px-6 text-white text-center">
        <p className="text-botanique-green text-sm font-semibold uppercase tracking-widest mb-3">
          Our Work
        </p>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Project Portfolio
        </h1>
        <p className="text-white/70 max-w-xl mx-auto text-base leading-relaxed">
          A selection of landscapes we have designed, built and maintained across Kenya —
          from intimate residential gardens to large commercial developments.
        </p>
      </section>

      {/* Filter tabs */}
      <section className="sticky top-16 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-3 flex gap-2 overflow-x-auto">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => { setActive(f.value); setLightboxIndex(null); }}
              className={`px-5 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                active === f.value
                  ? "bg-botanique-green text-white shadow-sm"
                  : "bg-botanique-beige text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f.label}
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
            <ProjectCard
              key={i}
              project={project}
              onClick={() => openLightbox(i)}
            />
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

      {/* Lightbox */}
      {lightboxIndex !== null && filtered[lightboxIndex] && (
        <Lightbox
          project={filtered[lightboxIndex]}
          index={lightboxIndex}
          total={filtered.length}
          onClose={closeLightbox}
          onNext={goNext}
          onPrev={goPrev}
        />
      )}
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const [loaded, setLoaded] = useState(false);

  const categoryColor = {
    residential:    "bg-emerald-100 text-emerald-700",
    estate:         "bg-amber-100 text-amber-700",
    design:         "bg-purple-100 text-purple-700",
    international:  "bg-blue-100 text-blue-700",
  }[project.category] || "bg-gray-100 text-gray-600";

  const categoryLabel = {
    residential:    "Residential",
    estate:         "Estate",
    design:         "3D Design",
    international:  "International",
  }[project.category] || project.category;

  return (
    <button
      onClick={onClick}
      className="group text-left rounded-2xl overflow-hidden bg-white border border-gray-100 shadow-sm hover:shadow-xl transition-shadow duration-300 focus:outline-none focus:ring-2 focus:ring-botanique-green/40"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden bg-botanique-beige">
        {!loaded && <div className="absolute inset-0 bg-gray-100 animate-pulse" />}
        <img
          src={project.image}
          alt={project.title}
          onLoad={() => setLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
        <span className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-semibold ${categoryColor}`}>
          {categoryLabel}
        </span>
        {/* Expand hint */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 text-botanique-green text-xs font-semibold px-3 py-1.5 rounded-full">
            View project
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-botanique-charcoal text-base">{project.title}</h3>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {project.location}
        </p>
        {project.description && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed">
            {project.description}
          </p>
        )}
      </div>
    </button>
  );
}

function Lightbox({ project, index, total, onClose, onNext, onPrev }) {
  const categoryColor = {
    residential:    "bg-emerald-100 text-emerald-700",
    estate:         "bg-amber-100 text-amber-700",
    design:         "bg-purple-100 text-purple-700",
    international:  "bg-blue-100 text-blue-700",
  }[project.category] || "bg-gray-100 text-gray-600";

  const categoryLabel = {
    residential:    "Residential",
    estate:         "Estate",
    design:         "3D Design",
    international:  "International",
  }[project.category] || project.category;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-2xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 bg-black/50 text-white rounded-full w-9 h-9 flex items-center justify-center hover:bg-black/70 transition"
        >
          ✕
        </button>

        {/* Counter */}
        <div className="absolute top-3 left-3 z-10 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
          {index + 1} / {total}
        </div>

        {/* Image */}
        <div className="relative aspect-video bg-black">
          <img
            src={project.image}
            alt={project.title}
            className="w-full h-full object-contain"
          />

          {/* Prev / Next arrows */}
          {total > 1 && (
            <>
              <button
                onClick={onPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition text-lg"
              >
                ‹
              </button>
              <button
                onClick={onNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/70 transition text-lg"
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* Details */}
        <div className="p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${categoryColor}`}>
                {categoryLabel}
              </span>
            </div>
            <h2 className="text-xl font-bold text-botanique-charcoal">{project.title}</h2>
            <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {project.location}
            </p>
            {project.description && (
              <p className="text-sm text-gray-600 mt-3 leading-relaxed max-w-lg">
                {project.description}
              </p>
            )}
          </div>
          <a
            href="https://wa.me/254720861592?text=Hi%20Botanique!%20I%20saw%20your%20portfolio%20and%20I%27d%20like%20a%20similar%20project."
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 px-5 py-2.5 rounded-full bg-botanique-green text-white text-sm font-semibold hover:opacity-90 transition whitespace-nowrap"
          >
            I want this →
          </a>
        </div>
      </div>
    </div>
  );
}
