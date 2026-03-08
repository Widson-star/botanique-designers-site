import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useApp } from "../context/AppContext";
import projects from "../data/projects";
import FadeIn from "../components/FadeIn";

const HOME_FILTERS = ["all", "residential", "estate", "design", "international"];

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

const testimonials = [
  {
    quote:
      "The Botanique team transformed our Tatu City garden completely. Their crew was incredibly disciplined on site — punctual every day, tidy throughout, and the quality of work was outstanding.",
    name: "Caroline N.",
    area: "Tatu City",
    service: "Garden Design & Implementation",
  },
  {
    quote:
      "I was impressed by how professional and well-organised the team was. They showed up on time, worked methodically, and delivered a beautifully landscaped compound that all our visitors admire.",
    name: "Victor N.",
    area: "South C, Nairobi",
    service: "Landscape Implementation",
  },
  {
    quote:
      "From concept to completion, every detail was handled with precision. The planting design suited our home perfectly and the team's commitment on site was something else — very dedicated people.",
    name: "Stephen W.",
    area: "Membley",
    service: "Landscape Architecture",
  },
  {
    quote:
      "Botanique handled our Nanyuki garden and we couldn't be happier. They travelled far and still delivered exceptional work. Disciplined, respectful, and the results speak for themselves.",
    name: "Lucy N.",
    area: "Nanyuki",
    service: "Garden Design & Implementation",
  },
  {
    quote:
      "Our Runda compound had a lot of potential and Botanique unlocked all of it. The team was always on time, worked with great care, and the final garden exceeded our expectations entirely.",
    name: "Joyce N.",
    area: "Runda, Nairobi",
    service: "Landscape Design",
  },
  {
    quote:
      "I've had contractors let me down before, but the Botanique team was different — disciplined, hard-working, and genuinely proud of their craft. The Karen garden is absolutely beautiful.",
    name: "Walter N.",
    area: "Karen, Nairobi",
    service: "Garden Implementation",
  },
];

const SERVICES_LIST = [
  "Landscape Architecture & Design",
  "EIA Study",
  "Project Implementation",
  "Garden Maintenance",
  "Irrigation Design & Installation",
  "Site Consultation",
  "Other",
];

const BACKEND = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

export default function Home() {
  const [activeFilter, setActiveFilter] = useState("all");
  const { openQuoteWizard } = useApp();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.scrollTo) {
      const el = document.getElementById(location.state.scrollTo);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [location.state]);

  // Contact form state
  const [form, setForm] = useState({ name: "", email: "", phone: "", service: "", message: "" });
  const [formStatus, setFormStatus] = useState(null); // null | "sending" | "success" | "error"

  const filtered =
    activeFilter === "all"
      ? projects
      : projects.filter((p) => p.category === activeFilter);

  function handleInput(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormStatus("sending");
    try {
      const res = await fetch(`${BACKEND}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setFormStatus("success");
      setForm({ name: "", email: "", phone: "", service: "", message: "" });
    } catch {
      setFormStatus("error");
    }
  }

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
            Landscape design & architecture, garden design, and expert
            maintenance — across Kenya and East Africa.
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
          <FadeIn>
            <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
              What We Do
            </p>
            <h2 className="text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-gray-500 mb-14 max-w-xl mx-auto">
              End-to-end landscape design, environmental compliance, and
              hands-on project delivery across Kenya.
            </p>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((svc, i) => (
              <FadeIn key={svc.path} delay={i * 100}>
                <div className="bg-white rounded-2xl p-7 shadow-sm hover:shadow-md transition flex flex-col h-full">
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
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ====== AREAS STRIP ====== */}
      <section className="bg-botanique-green py-14 text-white text-center">
        <FadeIn>
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
        </FadeIn>
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
          <FadeIn>
            <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
              Quick & Easy
            </p>
            <h2 className="text-4xl font-bold mb-4">Get an Instant Quote</h2>
            <p className="text-gray-500 mb-10">
              Describe your project briefly and we'll guide you to the right
              solution — usually within 24 hours.
            </p>
          </FadeIn>

          <FadeIn delay={150}>
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
          </FadeIn>
        </div>
      </section>

      {/* ====== PROJECTS / GALLERY ====== */}
      <section id="projects" className="py-28 bg-white text-center">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
              Our Work
            </p>
            <h2 className="text-4xl font-bold mb-4">Completed Projects</h2>
            <p className="text-gray-500 mb-10 max-w-xl mx-auto">
              A selection of landscape and horticultural projects across Kenya.
            </p>
          </FadeIn>

          {/* Filter pills */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {HOME_FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-5 py-2 rounded-full border text-sm font-medium transition ${
                  activeFilter === f
                    ? "bg-botanique-green text-white border-botanique-green"
                    : "bg-white text-gray-600 border-gray-200 hover:border-botanique-green hover:text-botanique-green"
                }`}
              >
                {f === "all" ? "All" : f === "design" ? "3D Designs" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.slice(0, 6).map((project, index) => (
              <FadeIn key={index} delay={index * 80}>
              <div
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
              </FadeIn>
            ))}
          </div>

          <Link
            to="/projects"
            className="inline-block mt-10 px-8 py-3 rounded-full border-2 border-botanique-green text-botanique-green font-semibold hover:bg-botanique-green hover:text-white transition"
          >
            View all {projects.length} projects →
          </Link>
        </div>
      </section>

      {/* ====== GOOGLE REVIEWS / TESTIMONIALS ====== */}
      <section className="py-24 bg-botanique-dark text-white">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <FadeIn>
            <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
              Client Reviews
            </p>
            <h2 className="text-4xl font-bold mb-6">What Our Clients Say</h2>

            {/* Google Reviews badge */}
            <a
              href="https://www.google.com/maps/search/Botanique+Designers+Nairobi"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-white/10 border border-white/15 rounded-full px-6 py-3 mb-14 hover:bg-white/15 transition group"
            >
              {/* Google "G" icon */}
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>

              {/* Rating stars + text */}
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/90 text-sm font-medium">
                  5.0 on Google
                </span>
                <span className="text-white/40 text-xs">|</span>
                <span className="text-white/60 text-xs group-hover:text-white/80 transition">
                  View on Google Maps
                </span>
              </div>
            </a>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <FadeIn key={i} delay={i * 100}>
              <div
                className="bg-white/8 border border-white/10 rounded-2xl p-8 text-left flex flex-col h-full"
              >
                {/* Stars */}
                <div className="flex gap-1 mb-5">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="text-white/80 text-sm leading-relaxed flex-1 italic mb-6">
                  "{t.quote}"
                </p>

                <div>
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-white/50 text-xs mt-0.5">{t.area}</p>
                  <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full bg-botanique-green/20 text-botanique-green text-xs font-medium">
                    {t.service}
                  </span>
                </div>
              </div>
              </FadeIn>
            ))}
          </div>

          {/* Google Review CTA */}
          <FadeIn delay={600}>
            <div className="mt-14 flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="https://search.google.com/local/writereview?placeid=ChIJOwg_06VPwokRYv534QaPC8g"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2.5 px-7 py-3 rounded-full bg-white text-botanique-charcoal font-semibold text-sm hover:shadow-lg hover:scale-105 transition"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Review us on Google
              </a>
              <span className="text-white/40 text-sm">
                Your feedback helps us grow
              </span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ====== CONTACT ====== */}
      <section id="contact" className="scroll-mt-24 py-24 bg-botanique-beige">
        <div className="max-w-6xl mx-auto px-6">
          <FadeIn>
            <div className="text-center mb-12">
              <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
                Get in Touch
              </p>
              <h2 className="text-4xl font-bold mb-4">Contact Us</h2>
              <p className="text-gray-500 max-w-md mx-auto">
                Have a project in mind? Send us a message and we'll get back to you within one business day.
              </p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
          <div className="bg-white rounded-2xl shadow-md overflow-hidden">
            <div className="grid md:grid-cols-2">

              {/* Left — info */}
              <div className="bg-botanique-dark text-white p-10 flex flex-col justify-between">
                <div>
                  <h3 className="text-xl font-bold mb-8">Our Details</h3>
                  <div className="space-y-6 text-white/80 text-sm">
                    <div className="flex items-start gap-4">
                      <span className="text-xl mt-0.5">📍</span>
                      <div>
                        <p className="font-semibold text-white">Location</p>
                        <p>Nairobi, Kenya</p>
                        <p className="text-white/50 text-xs mt-1">Serving all of Kenya & East Africa</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="text-xl mt-0.5">📧</span>
                      <div>
                        <p className="font-semibold text-white">Email</p>
                        <a href="mailto:botaniquedesigners@gmail.com" className="hover:text-botanique-green transition">
                          botaniquedesigners@gmail.com
                        </a>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <span className="text-xl mt-0.5">📞</span>
                      <div>
                        <p className="font-semibold text-white">Phone / WhatsApp</p>
                        <a href="tel:+254720861592" className="hover:text-botanique-green transition">
                          +254 720 861 592
                        </a>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-10">
                  <p className="text-white/50 text-xs uppercase tracking-widest mb-4">Follow us</p>
                  <div className="flex gap-5">
                    <a href="https://www.instagram.com/botaniquedesigners/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                       className="opacity-60 hover:opacity-100 transition">
                      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/instagram.svg" alt="Instagram" className="h-6 w-6 invert" />
                    </a>
                    <a href="https://www.facebook.com/botaniquedesigners" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                       className="opacity-60 hover:opacity-100 transition">
                      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/facebook.svg" alt="Facebook" className="h-6 w-6 invert" />
                    </a>
                    <a href="https://www.youtube.com/@Botaniquedesigners" target="_blank" rel="noopener noreferrer" aria-label="YouTube"
                       className="opacity-60 hover:opacity-100 transition">
                      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/youtube.svg" alt="YouTube" className="h-6 w-6 invert" />
                    </a>
                    <a href="https://x.com/widson_ambaisi" target="_blank" rel="noopener noreferrer" aria-label="X"
                       className="opacity-60 hover:opacity-100 transition">
                      <img src="https://cdn.jsdelivr.net/npm/simple-icons@v11/icons/x.svg" alt="X" className="h-6 w-6 invert" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Right — form */}
              <div className="p-10">
                {formStatus === "success" ? (
                  <div className="h-full flex flex-col items-center justify-center text-center py-8">
                    <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-5">
                      <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-botanique-charcoal mb-2">Message sent</h3>
                    <p className="text-gray-500 text-sm mb-6">We'll be in touch within one business day.</p>
                    <button
                      onClick={() => setFormStatus(null)}
                      className="text-botanique-green text-sm font-medium hover:underline"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Name *</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleInput}
                          required
                          placeholder="Your full name"
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30 focus:border-botanique-green transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                        <input
                          name="email"
                          type="email"
                          value={form.email}
                          onChange={handleInput}
                          required
                          placeholder="you@example.com"
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30 focus:border-botanique-green transition"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone <span className="text-gray-400 font-normal">(optional)</span></label>
                        <input
                          name="phone"
                          value={form.phone}
                          onChange={handleInput}
                          placeholder="+254 7XX XXX XXX"
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30 focus:border-botanique-green transition"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Service interested in</label>
                        <select
                          name="service"
                          value={form.service}
                          onChange={handleInput}
                          className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-gray-600 focus:outline-none focus:ring-2 focus:ring-botanique-green/30 focus:border-botanique-green transition bg-white"
                        >
                          <option value="">Select a service…</option>
                          {SERVICES_LIST.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Message *</label>
                      <textarea
                        name="message"
                        value={form.message}
                        onChange={handleInput}
                        required
                        rows={4}
                        placeholder="Tell us about your project — location, size, what you have in mind…"
                        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30 focus:border-botanique-green transition resize-none"
                      />
                    </div>

                    {formStatus === "error" && (
                      <p className="text-red-600 text-sm">
                        Something went wrong. Please email us directly at{" "}
                        <a href="mailto:botaniquedesigners@gmail.com" className="underline">
                          botaniquedesigners@gmail.com
                        </a>
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={formStatus === "sending"}
                      className="w-full py-3 rounded-lg bg-botanique-green text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-60"
                    >
                      {formStatus === "sending" ? "Sending…" : "Send Message"}
                    </button>
                  </form>
                )}
              </div>

            </div>
          </div>
          </FadeIn>
        </div>
      </section>
    </div>
  );
}
