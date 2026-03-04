import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useApp } from "../context/AppContext";

const services = [
  { label: "Landscape Architecture", path: "/services/landscape-architecture" },
  { label: "EIA Studies", path: "/services/eia-studies" },
  { label: "Project Implementation", path: "/services/implementation" },
  { label: "Garden Maintenance", path: "/services/maintenance" },
];

const nairobiSuburbs = [
  { label: "Karen", path: "/areas/karen" },
  { label: "Runda", path: "/areas/runda" },
  { label: "Kiambu County", path: "/areas/kiambu" },
  { label: "Westlands", path: "/areas/westlands" },
];

const majorCities = [
  { label: "Nairobi", path: "/areas/nairobi" },
  { label: "Mombasa & Coast", path: "/areas/mombasa" },
  { label: "Kisumu & Nyanza", path: "/areas/kisumu" },
  { label: "Nakuru & Rift Valley", path: "/areas/nakuru" },
  { label: "Eldoret & North Rift", path: "/areas/eldoret" },
];

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [areasOpen, setAreasOpen] = useState(false);
  const [mobileAreasOpen, setMobileAreasOpen] = useState(false);
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

          {/* Services dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setServicesOpen(true)}
            onMouseLeave={() => setServicesOpen(false)}
          >
            <button className="flex items-center gap-1 hover:text-botanique-green transition">
              Services
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {servicesOpen && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                {services.map((s) => (
                  <Link
                    key={s.path}
                    to={s.path}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-botanique-beige hover:text-botanique-green transition"
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Areas dropdown — two grouped columns */}
          <div
            className="relative"
            onMouseEnter={() => setAreasOpen(true)}
            onMouseLeave={() => setAreasOpen(false)}
          >
            <button className="flex items-center gap-1 hover:text-botanique-green transition">
              Areas We Serve
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {areasOpen && (
              <div className="absolute top-full left-0 mt-1 w-[420px] bg-white rounded-xl shadow-lg border border-gray-100 p-4 z-50">
                <div className="grid grid-cols-2 gap-4">
                  {/* Nairobi Region */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                      Nairobi Suburbs
                    </p>
                    {nairobiSuburbs.map((a) => (
                      <Link
                        key={a.path}
                        to={a.path}
                        className="block px-2 py-1.5 text-sm text-gray-700 hover:bg-botanique-beige hover:text-botanique-green rounded-lg transition"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                  {/* Major Cities */}
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-1">
                      Major Cities
                    </p>
                    {majorCities.map((a) => (
                      <Link
                        key={a.path}
                        to={a.path}
                        className="block px-2 py-1.5 text-sm text-gray-700 hover:bg-botanique-beige hover:text-botanique-green rounded-lg transition"
                      >
                        {a.label}
                      </Link>
                    ))}
                  </div>
                </div>
                {/* Coverage note */}
                <div className="mt-3 pt-3 border-t border-gray-100 px-1">
                  <p className="text-xs text-gray-500">
                    <span className="text-botanique-green font-medium">Nationwide coverage</span>
                    {" "}— Nyeri, Thika, Machakos, Malindi, Lamu, Nanyuki, Nandi, Kitale and anywhere across Kenya & East Africa.
                  </p>
                </div>
              </div>
            )}
          </div>

          <Link to="/projects" className="hover:text-botanique-green transition">Projects</Link>

          <button
            onClick={handleContactClick}
            className="hover:text-botanique-green transition"
          >
            Contact
          </button>

          <button
            onClick={() => openQuoteWizard()}
            className="px-5 py-2 rounded-full bg-botanique-green text-white text-sm hover:scale-105 transition"
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
        <div className="md:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-3 text-sm">
          <Link to="/" className="block py-2 hover:text-botanique-green" onClick={() => setMobileOpen(false)}>Home</Link>

          {/* Services accordion */}
          <div>
            <button
              className="w-full flex justify-between items-center py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide"
              onClick={() => setMobileServicesOpen(!mobileServicesOpen)}
            >
              Services
              <svg className={`w-4 h-4 transition-transform ${mobileServicesOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileServicesOpen && (
              <div className="pl-3 space-y-0.5">
                {services.map((s) => (
                  <Link
                    key={s.path}
                    to={s.path}
                    className="block py-1.5 text-gray-700 hover:text-botanique-green"
                    onClick={() => setMobileOpen(false)}
                  >
                    {s.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Areas accordion */}
          <div>
            <button
              className="w-full flex justify-between items-center py-2 font-semibold text-gray-500 text-xs uppercase tracking-wide"
              onClick={() => setMobileAreasOpen(!mobileAreasOpen)}
            >
              Areas We Serve
              <svg className={`w-4 h-4 transition-transform ${mobileAreasOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {mobileAreasOpen && (
              <div className="pl-3 space-y-0.5">
                <p className="text-xs text-gray-400 uppercase tracking-wide pt-1 pb-0.5">Nairobi Suburbs</p>
                {nairobiSuburbs.map((a) => (
                  <Link
                    key={a.path}
                    to={a.path}
                    className="block py-1.5 text-gray-700 hover:text-botanique-green"
                    onClick={() => setMobileOpen(false)}
                  >
                    {a.label}
                  </Link>
                ))}
                <p className="text-xs text-gray-400 uppercase tracking-wide pt-2 pb-0.5">Major Cities</p>
                {majorCities.map((a) => (
                  <Link
                    key={a.path}
                    to={a.path}
                    className="block py-1.5 text-gray-700 hover:text-botanique-green"
                    onClick={() => setMobileOpen(false)}
                  >
                    {a.label}
                  </Link>
                ))}
                <p className="text-xs text-botanique-green pt-2 pb-1">
                  + All of Kenya & East Africa
                </p>
              </div>
            )}
          </div>

          <Link to="/projects" className="block py-2 hover:text-botanique-green" onClick={() => setMobileOpen(false)}>Projects</Link>
          <button onClick={handleContactClick} className="block w-full text-left py-2 hover:text-botanique-green">Contact</button>
          <button
            onClick={() => { openQuoteWizard(); setMobileOpen(false); }}
            className="block w-full mt-2 px-5 py-2 rounded-full bg-botanique-green text-white text-center"
          >
            Get a Quote
          </button>
        </div>
      )}
    </header>
  );
}
