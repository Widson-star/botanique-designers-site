import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import FadeIn from "../components/FadeIn";
import services from "../data/services";
import { buildQuoteMessage, waLink } from "../utils/whatsapp";

const categoryIcons = {
  "design-planning": (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  "plant-science": (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </svg>
  ),
  implementation: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4" />
    </svg>
  ),
  "ongoing-care": (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
    </svg>
  ),
  commercial: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
};

export default function ServicesPage() {
  return (
    <div className="pt-20">
      <Helmet>
        <title>Our Services · Landscape Design, Implementation &amp; Maintenance Kenya | Botanique Designers</title>
        <meta name="description" content="Landscape architecture, garden design, plant taxonomy, irrigation, lighting and garden maintenance across Kenya — Botanique Designers." />
        <link rel="canonical" href="https://www.botaniquedesigners.com/services" />
      </Helmet>
      {/* Hero */}
      <section className="relative h-[40vh] min-h-[300px] flex items-center justify-center bg-botanique-dark">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{ backgroundImage: "url('/projects/project-6.jpg')" }}
        />
        <div className="relative z-10 text-center px-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Our Services
          </h1>
          <p className="text-lg text-white/80 max-w-2xl mx-auto">
            From plant science to built landscapes — design, implementation, and
            care.
          </p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <span className="text-botanique-green">Services</span>
        </div>
      </div>

      {/* Categories */}
      {services.categories.map((cat, catIdx) => (
        <FadeIn key={cat.id}>
          <section className={`py-16 md:py-20 px-4 ${catIdx % 2 === 1 ? "bg-botanique-beige" : ""}`}>
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-botanique-green">
                  {categoryIcons[cat.id]}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-botanique-green/60">
                  Category {catIdx + 1}
                </span>
              </div>
              <h2 className="text-3xl font-bold text-botanique-charcoal mb-2">
                {cat.title}
              </h2>
              <p className="text-gray-500 mb-10">{cat.description}</p>

              <div className="grid sm:grid-cols-2 gap-6">
                {cat.services.map((slug) => {
                  const svc = services.items[slug];
                  if (!svc) return null;
                  return (
                    <Link
                      key={slug}
                      to={`/services/${slug}`}
                      className="group bg-white rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden border border-gray-100"
                    >
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={svc.heroImage}
                          alt={svc.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-lg font-bold text-botanique-charcoal group-hover:text-botanique-green transition-colors">
                            {svc.title}
                          </h3>
                          {svc.featured && (
                            <span className="text-xs bg-botanique-green/10 text-botanique-green px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                              Signature
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-500 mt-2 line-clamp-2">
                          {svc.shortDescription}
                        </p>
                        <p className="text-xs text-botanique-green/70 mt-3">
                          {svc.lead}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeIn>
      ))}

      {/* GardenCare callout */}
      <FadeIn>
        <section className="py-16 px-4 bg-botanique-beige">
          <div className="max-w-3xl mx-auto text-center bg-white rounded-2xl shadow-sm p-10 border border-gray-100">
            <p className="text-botanique-green font-medium text-sm uppercase tracking-widest mb-3">
              Ongoing Care
            </p>
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-4">GardenCare</h2>
            <p className="text-gray-600 mb-6">
              Our scheduled garden maintenance programme for the Nairobi
              Metropolitan Area — GardenCare Regular, Monthly and Seasonal,
              custom-scoped and priced after assessment.
            </p>
            <Link
              to="/gardencare"
              className="inline-block px-8 py-3 rounded-full bg-botanique-green text-white font-semibold hover:opacity-90 transition"
            >
              Explore GardenCare →
            </Link>
          </div>
        </section>
      </FadeIn>

      {/* CTA */}
      <section className="py-16 px-4 bg-botanique-green text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Not sure what you need?</h2>
          <p className="text-white/80 mb-8">
            Tell us about your property and what you're trying to achieve.
            We'll recommend the right combination of services.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/#contact"
              className="bg-white text-botanique-green px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition"
            >
              Get in Touch
            </Link>
            <a
              href={waLink(buildQuoteMessage())}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
