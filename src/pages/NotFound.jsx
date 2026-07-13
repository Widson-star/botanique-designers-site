import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import FadeIn from "../components/FadeIn";
import { buildQuoteMessage, waLink } from "../utils/whatsapp";

/**
 * NotFound — catch-all view for unknown paths.
 *
 * Rendered by the App.jsx `path="*"` route for client-side navigation, and
 * prerendered to `dist/404.html` (see scripts/prerender.mjs) so Vercel serves a
 * genuine HTTP 404 for arbitrary unknown paths instead of the homepage.
 *
 * Metadata is intentionally noindex,nofollow with no canonical — this page must
 * never be indexed and must not point crawlers back at the homepage.
 */
export default function NotFound() {
  return (
    <div className="pt-20 min-h-[70vh] flex items-center justify-center bg-botanique-beige">
      <Helmet>
        <title>Page not found · Botanique Designers</title>
        <meta
          name="description"
          content="The page you were looking for could not be found. Browse Botanique Designers' landscape design services, projects and garden care instead."
        />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <FadeIn className="w-full">
        <section className="max-w-2xl mx-auto px-6 py-20 text-center">
          <p className="text-sm font-medium tracking-wide text-botanique-green uppercase mb-3">
            Error 404
          </p>
          <h1 className="text-3xl md:text-4xl font-bold text-botanique-charcoal mb-4">
            Page not found
          </h1>
          <p className="text-base md:text-lg text-gray-600 mb-10">
            The page you were looking for doesn&rsquo;t exist or may have moved.
            Use the links below to find your way back.
          </p>

          <nav aria-label="Recovery links">
            <ul className="flex flex-wrap justify-center gap-3">
              <li>
                <Link
                  to="/"
                  className="inline-block px-5 py-2.5 rounded-full bg-botanique-green text-white font-medium hover:bg-botanique-dark transition"
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/services"
                  className="inline-block px-5 py-2.5 rounded-full border border-botanique-green text-botanique-green font-medium hover:bg-botanique-green hover:text-white transition"
                >
                  Services
                </Link>
              </li>
              <li>
                <Link
                  to="/projects"
                  className="inline-block px-5 py-2.5 rounded-full border border-botanique-green text-botanique-green font-medium hover:bg-botanique-green hover:text-white transition"
                >
                  Projects
                </Link>
              </li>
              <li>
                <a
                  href={waLink(buildQuoteMessage())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-5 py-2.5 rounded-full border border-botanique-green text-botanique-green font-medium hover:bg-botanique-green hover:text-white transition"
                >
                  Project enquiry
                </a>
              </li>
            </ul>
          </nav>
        </section>
      </FadeIn>
    </div>
  );
}
