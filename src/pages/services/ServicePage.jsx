import { Link, useParams } from "react-router-dom";
import { useApp } from "../../context/AppContext";
import FadeIn from "../../components/FadeIn";
import services from "../../data/services";

export default function ServicePage() {
  const { slug } = useParams();
  const { setQuoteWizardOpen, setPrefilledService } = useApp();
  const svc = services.items[slug];

  if (!svc) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-botanique-charcoal mb-4">
            Service not found
          </h1>
          <Link to="/services" className="text-botanique-green hover:underline">
            View all services
          </Link>
        </div>
      </div>
    );
  }

  const category = services.categories.find((c) => c.id === svc.category);
  const relatedSlugs = category
    ? category.services.filter((s) => s !== slug).slice(0, 3)
    : [];

  const handleQuote = () => {
    setPrefilledService(svc.title);
    setQuoteWizardOpen(true);
  };

  return (
    <div className="pt-20">
      {/* Hero */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${svc.heroImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 text-center px-4">
          {svc.featured && (
            <span className="inline-block bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
              Signature Service
            </span>
          )}
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            {svc.title}
          </h1>
          <p className="text-white/80 text-sm">{svc.lead}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <Link to="/services" className="hover:text-botanique-green">Services</Link> /{" "}
          <span className="text-botanique-green">{svc.title}</span>
        </div>
      </div>

      {/* Description */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-gray-600 leading-relaxed">
              {svc.description}
            </p>
          </div>
        </section>
      </FadeIn>

      {/* What's Included */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4 bg-botanique-beige">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-10 text-center">
              What's Included
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {svc.included.map((item, i) => (
                <div key={i} className="bg-white rounded-xl p-6 shadow-sm">
                  <div className="w-10 h-10 bg-botanique-green/10 rounded-lg flex items-center justify-center mb-4">
                    <svg
                      className="w-5 h-5 text-botanique-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <h3 className="font-bold text-botanique-charcoal mb-2">
                    {item.title}
                  </h3>
                  <p className="text-sm text-gray-500">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Institutions (for taxonomy page) */}
      {svc.institutionsServed && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-botanique-charcoal mb-8 text-center">
                Institutions We Serve
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {svc.institutionsServed.map((inst, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-botanique-beige rounded-lg p-4"
                  >
                    <svg
                      className="w-5 h-5 text-botanique-green flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">{inst}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* Process */}
      <FadeIn>
        <section
          className={`py-16 md:py-20 px-4 ${svc.institutionsServed ? "bg-botanique-beige" : ""}`}
        >
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-botanique-charcoal mb-10 text-center">
              How It Works
            </h2>
            <div className="space-y-0">
              {svc.process.map((step, i) => (
                <div key={i} className="flex gap-6">
                  <div className="flex flex-col items-center">
                    <div className="w-10 h-10 bg-botanique-green text-white rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                      {i + 1}
                    </div>
                    {i < svc.process.length - 1 && (
                      <div className="w-0.5 h-full bg-botanique-green/20 mt-2" />
                    )}
                  </div>
                  <div className="pb-10">
                    <h3 className="font-bold text-botanique-charcoal">
                      {step.step}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* CTA */}
      <section className="py-16 px-4 bg-botanique-green text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">
            Interested in {svc.title.toLowerCase()}?
          </h2>
          <p className="text-white/80 mb-8">
            Tell us about your project. We'll get back to you within 24 hours.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleQuote}
              className="bg-white text-botanique-green px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition cursor-pointer"
            >
              Request a Quote
            </button>
            <a
              href={`https://wa.me/254720861592?text=Hi%20Botanique%20Designers%2C%20I'm%20interested%20in%20${encodeURIComponent(svc.title)}.`}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Related Services */}
      {relatedSlugs.length > 0 && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4 bg-botanique-beige">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-botanique-charcoal mb-8 text-center">
                Related Services
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedSlugs.map((rs) => {
                  const rel = services.items[rs];
                  if (!rel) return null;
                  return (
                    <Link
                      key={rs}
                      to={`/services/${rs}`}
                      className="group bg-white rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden"
                    >
                      <div className="aspect-[16/9] overflow-hidden">
                        <img
                          src={rel.heroImage}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-5">
                        <h3 className="font-bold text-botanique-charcoal group-hover:text-botanique-green transition-colors">
                          {rel.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                          {rel.shortDescription}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeIn>
      )}
    </div>
  );
}
