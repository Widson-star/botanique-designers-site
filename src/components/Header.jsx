import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const serviceCategories = [
  {
    title: "Design & Planning",
    items: [
      { label: "Landscape Design", path: "/services/landscape-design" },
      { label: "Landscape Architecture", path: "/services/landscape-architecture" },
    ],
  },
  {
    title: "Plant Science & Advisory",
    items: [
      { label: "Plant Taxonomy & Botanical Labelling", path: "/services/plant-taxonomy" },
      { label: "Plant Health Care", path: "/services/plant-health-care" },
      { label: "Soil Analysis", path: "/services/soil-analysis" },
      { label: "Potted & Indoor Plants", path: "/services/potted-indoor-plants" },
    ],
  },
  {
    title: "Implementation & Construction",
    items: [
      { label: "Garden Implementation", path: "/services/garden-implementation" },
      { label: "Irrigation Systems", path: "/services/irrigation-systems" },
      { label: "Garden Lighting", path: "/services/garden-lighting" },
      { label: "Property Fencing", path: "/services/property-fencing" },
    ],
  },
  {
    title: "Ongoing Care",
    items: [
      { label: "Garden Maintenance", path: "/services/garden-maintenance" },
      { label: "Lawn Care", path: "/services/lawn-care" },
    ],
  },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { openQuoteWizard } = useApp();
  const isHome = location.pathname === "/";

  function handleContactClick(e) {
    e.preventDefault();
    setMobileOpen(false);
    if (isHome) {
      document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/", { state: { scrollTo: "contact" } });
    }
  }

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur border-b border-gray-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center">
          <img
            src="/botanique.png"
            alt="Botanique Designers"
            className="h-16 w-auto object-contain mix-blend-multiply"
          />
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-700">
          {isHome ? (
            <a href="#home" className="hover:text-botanique-green transition">Home</a>
          ) : (
            <Link to="/" className="hover:text-botanique-green transition">Home</Link>
          )}

          <Link to="/about" className="hover:text-botanique-green transition">About</Link>

          {/* Services mega dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <Link
              to="/services"
              className="flex items-center gap-1 hover:text-botanique-green transition"
            >
              Services
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
            {servicesOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-[560px] bg-white rounded-xl shadow-lg border border-gray-100 p-5 z-50">
                <div className="grid grid-cols-2 gap-6">
                  {serviceCategories.map((cat) => (
                    <div key={cat.title}>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {cat.title}
                      </p>
                      {cat.items.map((s) => (
                        <Link
                          key={s.path}
                          to={s.path}
                          className="block px-2 py-1.5 text-sm text-gray-700 hover:bg-botanique-beige hover:text-botanique-green rounded-lg transition"
                        >
                          {s.label}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <Link
                    to="/services"
                    className="text-xs text-botanique-green font-medium hover:underline"
                  >
                    View all services →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <Link to="/projects" className="hover:text-botanique-green transition">Projects</Link>
          <Link to="/blog" className="hover:text-botanique-green transition">Blog</Link>
          <Link to="/faq" className="hover:text-botanique-green transition">FAQ</Link>

          <button
            onClick={handleContactClick}
            className="hover:text-botanique-green transition cursor-pointer"
          >
            Contact
          </button>

          <button
            onClick={() => openQuoteWizard()}
            className="px-5 py-2 rounded-full bg-botanique-green text-white text-sm hover:scale-105 transition cursor-pointer"
          >
            Get a Quote
          </button>
        </nav>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3 text-sm max-h-[80vh] overflow-y-auto">
          <Link to="/" className="block py-2 hover:text-botanique-green" onClick={closeMobile}>Home</Link>
          <Link to="/about" className="block py-2 hover:text-botanique-green" onClick={closeMobile}>About</Link>

          {/* Services accordion */}
          <div>
            <button
              className="w-full flex justify-between items-center py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide cursor-pointer"
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
            >
              Services
              <svg className={`w-4 h-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileServicesOpen && (
              <div className="pl-3 space-y-2 pb-2">
                <Link
                  to="/services"
                  className="block py-1.5 text-botanique-green font-medium"
                  onClick={closeMobile}
                >
                  All Services →
                </Link>
                {serviceCategories.map((cat) => (
                  <div key={cat.title}>
                    <p className="text-xs text-gray-400 uppercase tracking-wide pt-2 pb-0.5">
                      {cat.title}
                    </p>
                    {cat.items.map((s) => (
                      <Link
                        key={s.path}
                        to={s.path}
                        className="block py-1.5 text-gray-700 hover:text-botanique-green"
                        onClick={closeMobile}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>

          <Link to="/projects" className="block py-2 hover:text-botanique-green" onClick={closeMobile}>Projects</Link>
          <Link to="/blog" className="block py-2 hover:text-botanique-green" onClick={closeMobile}>Blog</Link>
          <Link to="/faq" className="block py-2 hover:text-botanique-green" onClick={closeMobile}>FAQ</Link>
          <button onClick={handleContactClick} className="block w-full text-left py-2 hover:text-botanique-green cursor-pointer">Contact</button>
          <button
            onClick={() => { openQuoteWizard(); closeMobile(); }}
            className="block w-full mt-2 px-5 py-2 rounded-full bg-botanique-green text-white text-center cursor-pointer"
          >
            Get a Quote
          </button>
        </div>
      )}
    </header>
  );
}
