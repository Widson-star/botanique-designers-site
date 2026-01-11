import Assistant from "./components/Assistant";
import ErrorBoundary from "./components/ErrorBoundary";
import { useState } from "react";
import QuoteWizard from "./components/QuoteWizard";
import PaymentConfirmationModal from "./components/PaymentConfirmationModal";
import PaidConsultancyModal from "./components/PaidConsultancyModal";

export default function App() {
  const [prefilledService, setPrefilledService] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [quoteWizardOpen, setQuoteWizardOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [paidService, setPaidService] = useState("");
  const [consultancyOpen, setConsultancyOpen] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);

const projects = [
  {
    image: "/projects/project-1.jpg",
    title: "Residential Landscaping",
    location: "Nyahururu, Nyandarua",
    category: "residential",
  },
  {
    image: "/projects/project-2.jpg",
    title: "Lawn Care",
    location: "Runda, Nairobi",
    category: "residential",
  },
  {
    image: "/projects/project-3.jpg",
    title: "Garden Redesign",
    location: "Runda, Nairobi",
    category: "estate",
  },
  {
    image: "/projects/project-4.jpg",
    title: "Garden Inspiration",
    location: "Reference Style",
    category: "inspiration",
  },
  {
    image: "/projects/project-5.jpg",
    title: "Estate Landscaping",
    location: "Karen, Nairobi",
    category: "estate",
  },
];

  return (
    <div className="font-sans text-botanique-charcoal pt-24">
      {/* ================= HEADER ================= */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/botanique.png" alt="Botanique Designers Logo" className="h-10" />
            <span className="font-semibold text-lg">Botanique Designers</span>
          </div>
          <nav className="space-x-6 text-sm">
            <a href="#home" className="hover:text-botanique-green">Home</a>
            <a href="#services" className="hover:text-botanique-green">Services</a>
            <a href="#projects" className="hover:text-botanique-green">Projects</a>
            <a href="#contact" className="hover:text-botanique-green">Contact</a>
          </nav>
        </div>
      </header>

      {/* ================= HERO ================= */}
<section
  id="home"
  className="relative min-h-[80vh] md:min-h-screen flex items-center justify-center text-center"
>
        {/* ORIGINAL HERO IMAGE */}
        <img
  src="/hero-botanique.jpg"
  alt="Botanique Designers Landscape"
  className="absolute inset-0 w-full h-full object-cover -z-10"
/>

        {/* SOFT OVERLAY (was always there originally) */}
        <div className="absolute inset-0 bg-white/65" />

        {/* HERO CONTENT */}
        <div className="relative z-10 max-w-3xl px-6">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Transforming Outdoor Spaces
          </h1>
          <p className="text-lg md:text-xl text-gray-700 mb-10">
            Landscape architecture, environmental impact assessments, and
            premium outdoor solutions designed with nature in mind.
          </p>

          <div className="flex justify-center gap-6">
            <a
              href="#instant-quote"
              className="px-8 py-3 rounded-full bg-botanique-green text-white hover:scale-105 transition"
            >
              Request a Quote
            </a>
            <a
              href="mailto:botaniquedesigners@gmail.com?subject=Landscape Inquiry"
              className="px-8 py-3 rounded-full border border-botanique-green text-botanique-green hover:bg-botanique-green hover:text-white transition"
            >
              Email Us
            </a>
          </div>
        </div>
      </section>

      {/* ================= SERVICES ================= */}
      <section id="services" 
      className="scroll-mt-24 py-24 bg-botanique-beige text-center"
      >
        <h2 className="text-4xl font-semibold mb-4">Our Services</h2>
        <p className="text-gray-600 mb-14">
          Landscape architecture, EIA studies, implementation & maintenance.
        </p>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-6">
          <div className="bg-white rounded-2xl p-8 shadow-md">
            🌿 <h3 className="font-semibold text-lg mt-3">Landscape Architecture</h3>
            <p className="text-gray-600 mt-2">
              Site analysis, master planning, planting design & 3D concepts.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-md">
            📄 <h3 className="font-semibold text-lg mt-3">EIA Studies</h3>
            <p className="text-gray-600 mt-2">
              Environmental Impact Assessments compliant with NEMA standards.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-md">
            🛠️ <h3 className="font-semibold text-lg mt-3">Project Implementation</h3>
            <p className="text-gray-600 mt-2">
              Full execution, planting, irrigation, hardscape & maintenance.
            </p>
          </div>
        </div>
      </section>

      {/* ================= INSTANT QUOTE ================= */}
      <section
        id="instant-quote"
        className="scroll-mt-24 py-24 pb-56 bg-botanique-beige text-center"
      >
        <h2 className="text-3xl font-semibold mb-4">Instant Quote</h2>
        <p className="text-gray-600 mb-10">
          Describe your project briefly and we’ll guide you to the right solution.
        </p>

        <div className="relative z-10 max-w-3xl mx-auto bg-white rounded-2xl shadow-md p-10">
  {/* Instant Quote trigger */}
  <button
    onClick={() => setQuoteWizardOpen(true)}
    className="mb-6 px-8 py-3 rounded-full bg-botanique-green text-white hover:scale-105 transition"
  >
    💬 Start Instant Quote
  </button>
        </div>
                  <ErrorBoundary>
            <QuoteWizard
              open={quoteWizardOpen}
              setOpen={setQuoteWizardOpen}
              prefilledService={prefilledService}
              onConsultancyRequired={(km) => {
                setDistanceKm(km);
                setConsultancyOpen(true);
              }}
            />
          </ErrorBoundary>
      </section>

{/* ================= PROJECTS / GALLERY ================= */}
<section
  id="projects"
  className="py-28 bg-white text-center"
>
  <h2 className="text-4xl font-semibold mb-4">
    Our Completed Projects
  </h2>
  <p className="text-gray-600 mb-14 max-w-2xl mx-auto">
    A selection of landscape and horticultural projects completed
    by Botanique Designers across Kenya.
  </p>
<div className="flex justify-center gap-4 mb-10">
  {["all", "residential", "estate", "inspiration"].map((filter) => (
    <button
      key={filter}
      onClick={() => setActiveFilter(filter)}
      className={`px-5 py-2 rounded-full border transition ${
        activeFilter === filter
          ? "bg-botanique-green text-white"
          : "bg-white text-gray-700 hover:bg-gray-100"
      }`}
    >
      {filter.charAt(0).toUpperCase() + filter.slice(1)}
    </button>
  ))}
</div>

  <div className="max-w-6xl mx-auto grid gap-6 px-6
                  grid-cols-1 sm:grid-cols-2 md:grid-cols-3">

    {[
      {
        image: "/projects/project-1.jpg",
        title: "Residential Landscaping",
        location: "Nyahururu, Nyandarua",
        category:"residential",
      },
      {
        image: "/projects/project-2.jpg",
        title: "Lawn care",
        location: "Runda, Nairobi",
        category:"residential",
      },
      {
        image: "/projects/project-3.jpg",
        title: "Garden Redesign",
        location: "Runda, Nairobi",
        category:"residential",
      },
      {
        image: "/projects/project-4.jpg",
        title: "  Garden Redesign",
        location: "Reference Style",
        category:"inspiration",
      },
      {
        image: "/projects/project-5.jpg",
        title: "Lawn & Garden Makeover",
        location: "Reference Style",
        category:"inspiration",
      },
      {
        image: "/projects/project-6.jpg",
        title: "Estate Landscaping",
        location: "Muthithi, Kiambu",
        category:"residential",
      },
    ].map((project, index) => (
      <div
        key={index}
        className="group relative z-0 overflow-hidden rounded-2xl shadow-md"
      >
        <img
          src={project.image}
          alt={project.title}
          className="h-72 w-full object-cover
                     transition-transform duration-500
                     group-hover:scale-110"
        />

        {/* Overlay */}
        <div
          className="absolute inset-0 bg-black/55
                     opacity-0 group-hover:opacity-100
                     transition flex flex-col
                     justify-center items-center text-white px-4
                     pointer-events-none group-hover:pointer-events-auto"
        >
          <h3 className="text-xl font-semibold mb-1">
            {project.title}
          </h3>
          <p className="text-sm mb-4">
            {project.location}
          </p>

<button
  onClick={() => {
    setPrefilledService(project.title);
    setQuoteWizardOpen(true);
  }}
  className="px-5 py-2 rounded-full bg-botanique-green hover:scale-105 transition"
>
  Request Similar Design
</button>
        </div>
      </div>
    ))}
  </div>
</section>

      {/* ================= CONTACT ================= */}
      <section
  id="contact"
  className="py-28 min-h-[70vh] bg-botanique-beige text-center flex flex-col justify-center"
>
        <h2 className="text-4xl font-semibold mb-4">Contact Us</h2>
        <p className="text-gray-600 mb-10">
          Reach out and let’s shape your outdoor vision.
        </p>

<div className="bg-white rounded-2xl shadow-md p-10 max-w-3xl mx-auto">
  <div className="grid md:grid-cols-2 gap-10 items-center">
    
    {/* Left: Contact details */}
    <div className="space-y-4 text-left text-gray-700">
      <p className="flex items-center gap-3">
        <span className="text-xl">📍</span>
        <span>Nairobi, Kenya</span>
      </p>

      <p className="flex items-center gap-3">
        <span className="text-xl">📧</span>
        <a
          href="mailto:botaniquedesigners@gmail.com"
          className="hover:text-botanique-green transition"
        >
          botaniquedesigners@gmail.com
        </a>
      </p>

      <p className="flex items-center gap-3">
        <span className="text-xl">📞</span>
        <a
          href="tel:+254720861592"
          className="hover:text-botanique-green transition"
        >
          +254 720 861 592
        </a>
      </p>
    </div>

    {/* Right: Social links */}
    <div className="flex justify-center md:justify-end gap-6 text-2xl">
      <a
        href="https://www.instagram.com/botaniquedesigners/?next=%2F"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition"
        aria-label="Instagram"
      >
        <img
          src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg"
          alt="Instagram"
          className="h-7 w-7"
        />
      </a>

      <a
        href="https://www.facebook.com/botaniquedesigners"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition"
        aria-label="Facebook"
      >
        <img
          src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg"
          alt="Facebook"
          className="h-7 w-7"
        />
      </a>

      <a
        href="https://x.com/widson_ambaisi"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:scale-110 transition"
        aria-label="X"
      >
        <img
          src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg"
          alt="X"
          className="h-7 w-7"
        />
      </a>
    </div>

  </div>
</div>
      </section>

{/* ================= FOOTER ================= */}
<footer className="bg-botanique-charcoal text-white py-20 mt-24">
  <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-4 gap-10">

    {/* Brand */}
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <img
          src="/botanique.png"
          alt="Botanique Designers Logo"
          className="h-10"
        />
        <span className="text-lg font-semibold">
          Botanique Designers
        </span>
      </div>
      <p className="text-sm text-gray-300">
        Transforming outdoor spaces through landscape architecture,
        horticulture, and environmental stewardship.
      </p>
    </div>

    {/* Quick Links */}
    <div>
      <h4 className="font-semibold mb-4">Quick Links</h4>
      <ul className="space-y-2 text-sm text-gray-300">
        <li><a href="#home" className="hover:text-white">Home</a></li>
        <li><a href="#services" className="hover:text-white">Services</a></li>
        <li><a href="#projects" className="hover:text-white">Projects</a></li>
        <li><a href="#contact" className="hover:text-white">Contact</a></li>
      </ul>
    </div>

    {/* Contact */}
    <div>
      <h4 className="font-semibold mb-4">Contact</h4>
      <ul className="space-y-2 text-sm text-gray-300">
        <li>📍 Nairobi, Kenya</li>
        <li>
          <a
            href="mailto:botaniquedesigners@gmail.com"
            className="hover:text-white"
          >
            📧 botaniquedesigners@gmail.com
          </a>
        </li>
        <li>
          <a
            href="tel:+254720861592"
            className="hover:text-white"
          >
            📞 +254 720 861 592
          </a>
        </li>
      </ul>
    </div>

    {/* Social */}
    <div>
      <h4 className="font-semibold mb-4">Follow Us</h4>
      <div className="flex gap-4">
        <a
          href="https://www.instagram.com/botaniquedesigners/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg"
            alt="Instagram"
            className="h-6 w-6 invert"
          />
        </a>

        <a
          href="https://www.facebook.com/botaniquedesigners"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg"
            alt="Facebook"
            className="h-6 w-6 invert"
          />
        </a>

        <a
          href="https://x.com/widson_ambaisi"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg"
            alt="X"
            className="h-6 w-6 invert"
          />
        </a>
      </div>
    </div>

  </div>

  <div className="mt-12 border-t border-gray-700 pt-6 text-center text-sm text-gray-400">
    © {new Date().getFullYear()} Botanique Designers. All rights reserved.
  </div>
</footer>


{/* ================= FLOATING BUTTONS (FIXED & SPACED) ================= */}
    <div className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-50">
        <Assistant />
      </div>
<PaymentConfirmationModal
  open={confirmationOpen}
  onClose={() => setConfirmationOpen(false)}
  service={paidService}
/>

<PaidConsultancyModal
  open={consultancyOpen}
  onClose={() => setConsultancyOpen(false)}
  distanceKm={distanceKm}
/>

    </div>
  );
}