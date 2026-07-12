import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useApp } from "../context/AppContext";
import FadeIn from "../components/FadeIn";
import caseStudies from "../data/case-studies";
import services from "../data/services";
import { buildProjectMessage, waLink } from "../utils/whatsapp";

export default function ProjectDetail() {
  const { slug } = useParams();
  const { setQuoteWizardOpen, setPrefilledService } = useApp();
  const study = caseStudies.find((c) => c.slug === slug);

  if (!study) {
    return (
      <div className="pt-20 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-botanique-charcoal mb-4">
            Project not found
          </h1>
          <Link to="/projects" className="text-botanique-green hover:underline">
            Back to all projects
          </Link>
        </div>
      </div>
    );
  }

  const handleQuote = () => {
    setPrefilledService(study.title);
    setQuoteWizardOpen(true);
  };

  const relatedServices = (study.relatedServices || [])
    .map((s) => services.items[s])
    .filter(Boolean);

  return (
    <div className="pt-20">
      <Helmet>
        <title>{`${study.title} — Case Study | Botanique Designers`}</title>
        <meta name="description" content={study.summary} />
        <link rel="canonical" href={`https://www.botaniquedesigners.com/projects/${study.slug}`} />
        <meta property="og:title" content={`${study.title} — Case Study | Botanique Designers`} />
        <meta property="og:description" content={study.summary} />
        <meta property="og:image" content={`https://www.botaniquedesigners.com${study.heroImage}`} />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "CreativeWork",
            name: study.title,
            about: study.status === "Design Concept" ? "Landscape design concept" : "Landscape design project",
            locationCreated: { "@type": "Place", name: study.location },
            description: study.summary,
            image: `https://www.botaniquedesigners.com${study.heroImage}`,
            creator: {
              "@type": "LocalBusiness",
              name: "Botanique Designers",
              url: "https://www.botaniquedesigners.com",
            },
            url: `https://www.botaniquedesigners.com/projects/${study.slug}`,
          })}
        </script>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Home", item: "https://www.botaniquedesigners.com/" },
              { "@type": "ListItem", position: 2, name: "Projects", item: "https://www.botaniquedesigners.com/projects" },
              { "@type": "ListItem", position: 3, name: study.title, item: `https://www.botaniquedesigners.com/projects/${study.slug}` },
            ],
          })}
        </script>
      </Helmet>

      {/* Hero */}
      <section className="relative h-[45vh] min-h-[320px] flex items-center justify-center">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${study.heroImage}')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative z-10 text-center px-4">
          <span className="inline-block bg-white/20 backdrop-blur text-white text-xs font-semibold px-3 py-1 rounded-full mb-4">
            {study.status}
          </span>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            {study.title}
          </h1>
          <p className="text-white/80 text-sm">{study.location}</p>
        </div>
      </section>

      {/* Breadcrumb */}
      <div className="bg-botanique-beige py-3 px-4">
        <div className="max-w-6xl mx-auto text-sm text-gray-500">
          <Link to="/" className="hover:text-botanique-green">Home</Link> /{" "}
          <Link to="/projects" className="hover:text-botanique-green">Projects</Link> /{" "}
          <span className="text-botanique-green">{study.title}</span>
        </div>
      </div>

      {/* Summary + meta */}
      <FadeIn>
        <section className="py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <p className="text-lg text-gray-600 leading-relaxed mb-8">
              {study.summary}
            </p>
            <div className="grid sm:grid-cols-3 gap-4 text-sm">
              <div className="bg-botanique-beige rounded-xl p-4">
                <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">Location</p>
                <p className="text-botanique-charcoal font-medium">{study.location}</p>
              </div>
              <div className="bg-botanique-beige rounded-xl p-4">
                <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">Status</p>
                <p className="text-botanique-charcoal font-medium">{study.status}</p>
              </div>
              {study.scope && (
                <div className="bg-botanique-beige rounded-xl p-4">
                  <p className="text-gray-400 uppercase tracking-wide text-xs mb-1">Scope</p>
                  <p className="text-botanique-charcoal font-medium">{study.scope.join(" · ")}</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </FadeIn>

      {/* Brief + Design Response */}
      {(study.brief || study.designResponse) && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4 bg-botanique-beige">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-10">
              {study.brief && (
                <div>
                  <h2 className="text-xl font-bold text-botanique-charcoal mb-3">The Brief</h2>
                  <p className="text-gray-600 leading-relaxed">{study.brief}</p>
                </div>
              )}
              {study.designResponse && (
                <div>
                  <h2 className="text-xl font-bold text-botanique-charcoal mb-3">Our Response</h2>
                  <p className="text-gray-600 leading-relaxed">{study.designResponse}</p>
                </div>
              )}
            </div>
          </section>
        </FadeIn>
      )}

      {/* Before / After */}
      {study.beforeAfter && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4">
            <div className="max-w-5xl mx-auto">
              <h2 className="text-2xl font-bold text-botanique-charcoal mb-8 text-center">
                {study.beforeAfter.label}: Before & After
              </h2>
              <div className="grid sm:grid-cols-2 gap-6">
                {[
                  { label: "Before", src: study.beforeAfter.before },
                  { label: "After", src: study.beforeAfter.after },
                ].map((img) => (
                  <div key={img.label} className="rounded-2xl overflow-hidden shadow-sm">
                    <div className="relative aspect-[4/3] bg-botanique-beige">
                      <img src={img.src} alt={`${study.title} — ${img.label}`} className="w-full h-full object-cover" />
                      <span className="absolute top-3 left-3 px-3 py-1 rounded-full bg-white/90 text-botanique-green text-xs font-semibold">
                        {img.label}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* Gallery */}
      {study.galleryImages && study.galleryImages.length > 0 && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4 bg-botanique-beige">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-botanique-charcoal mb-8 text-center">
                Project Images
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {study.galleryImages.map((src, i) => {
                  const caption = study.galleryCaptions?.[i];
                  return (
                    <figure key={i} className="rounded-2xl overflow-hidden shadow-sm bg-white">
                      <div className="aspect-[4/3]">
                        <img
                          src={src}
                          alt={caption || `${study.title} — image ${i + 1}`}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      {caption && (
                        <figcaption className="px-4 py-3 text-sm text-gray-500">
                          {caption}
                        </figcaption>
                      )}
                    </figure>
                  );
                })}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* Outcome */}
      {study.outcome && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-botanique-charcoal mb-3">Outcome</h2>
              <p className="text-gray-600 leading-relaxed">{study.outcome}</p>
            </div>
          </section>
        </FadeIn>
      )}

      {/* Related Services */}
      {relatedServices.length > 0 && (
        <FadeIn>
          <section className="py-16 md:py-20 px-4 bg-botanique-beige">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-botanique-charcoal mb-8 text-center">
                Related Services
              </h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedServices.map((rel) => (
                  <Link
                    key={rel.slug}
                    to={`/services/${rel.slug}`}
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
                ))}
              </div>
            </div>
          </section>
        </FadeIn>
      )}

      {/* CTA */}
      <section className="py-16 px-4 bg-botanique-green text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold mb-4">Planning something similar?</h2>
          <p className="text-white/80 mb-8">
            Tell us about your property and what you're trying to achieve — we'll
            recommend the right approach.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleQuote}
              className="bg-white text-botanique-green px-8 py-3 rounded-full font-semibold hover:bg-gray-100 transition cursor-pointer"
            >
              Start Your Project Enquiry
            </button>
            <a
              href={waLink(buildProjectMessage(study.title))}
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-white text-white px-8 py-3 rounded-full font-semibold hover:bg-white/10 transition"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </section>

      {/* Back link */}
      <div className="py-10 text-center">
        <Link to="/projects" className="text-botanique-green font-medium hover:underline">
          ← Back to all projects
        </Link>
      </div>
    </div>
  );
}
