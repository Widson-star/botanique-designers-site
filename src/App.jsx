import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Analytics } from "@vercel/analytics/react";
import { AppProvider, useApp } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Assistant from "./components/Assistant";
import QuoteWizard from "./components/QuoteWizard";
import PaymentConfirmationModal from "./components/PaymentConfirmationModal";
import PaidConsultancyModal from "./components/PaidConsultancyModal";
import AdminApp from "./admin/AdminApp";

// Pages
import Home from "./pages/Home";
import About from "./pages/About";
import ServicesPage from "./pages/Services";
import ServicePage from "./pages/services/ServicePage";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Blog from "./pages/Blog";
import BlogPost from "./pages/BlogPost";
import FAQ from "./pages/FAQ";
import GardenCare from "./pages/GardenCare";
import NotFound from "./pages/NotFound";

// Area pages
import Karen from "./pages/areas/Karen";
import Runda from "./pages/areas/Runda";
import Kiambu from "./pages/areas/Kiambu";
import Westlands from "./pages/areas/Westlands";
import NairobiCBD from "./pages/areas/Nairobi";
import Mombasa from "./pages/areas/Mombasa";
import Kisumu from "./pages/areas/Kisumu";
import Nakuru from "./pages/areas/Nakuru";
import Eldoret from "./pages/areas/Eldoret";

// Scroll to top on route change
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// Inner app that has access to AppContext
function AppInner() {
  const { pathname } = useLocation();
  const isAdminRoute = pathname.startsWith("/admin");
  const {
    quoteWizardOpen,
    setQuoteWizardOpen,
    prefilledService,
    confirmationOpen,
    setConfirmationOpen,
    consultancyOpen,
    setConsultancyOpen,
    distanceKm,
    setDistanceKm,
    paidService,
  } = useApp();

  if (isAdminRoute) {
    return <AdminApp />;
  }

  return (
    <div className="font-sans text-botanique-charcoal">
      <ScrollToTop />
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<ServicesPage />} />

          {/* Retired EIA Studies page — redirect the old URL to the services index */}
          <Route path="/services/eia-studies" element={<Navigate to="/services" replace />} />

          {/* Legacy routes redirect to their canonical slug-based equivalents */}
          <Route path="/services/implementation" element={<Navigate to="/services/garden-implementation" replace />} />
          <Route path="/services/maintenance" element={<Navigate to="/services/garden-maintenance" replace />} />

          {/* Dynamic service pages (handles all data-driven services) */}
          <Route path="/services/:slug" element={<ServicePage />} />

          {/* GardenCare — scheduled garden maintenance programme */}
          <Route path="/gardencare" element={<GardenCare />} />

          {/* Projects */}
          <Route path="/projects" element={<Projects />} />
          <Route path="/projects/:slug" element={<ProjectDetail />} />

          {/* Blog */}
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogPost />} />

          {/* FAQ */}
          <Route path="/faq" element={<FAQ />} />

          {/* Area pages */}
          <Route path="/areas/karen" element={<Karen />} />
          <Route path="/areas/runda" element={<Runda />} />
          <Route path="/areas/kiambu" element={<Kiambu />} />
          <Route path="/areas/westlands" element={<Westlands />} />
          <Route path="/areas/nairobi" element={<NairobiCBD />} />
          <Route path="/areas/mombasa" element={<Mombasa />} />
          <Route path="/areas/kisumu" element={<Kisumu />} />
          <Route path="/areas/nakuru" element={<Nakuru />} />
          <Route path="/areas/eldoret" element={<Eldoret />} />

          {/* Catch-all — unknown paths render the NotFound view (noindex).
              On Vercel these paths are served from the prerendered dist/404.html
              with a genuine HTTP 404 status; this route handles the same view
              for client-side navigation. */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <Footer />

      {/* Floating AI Assistant */}
      <div className="fixed bottom-20 right-6 md:bottom-8 md:right-8 z-50">
        <Assistant />
      </div>

      {/* Global Modals */}
      <ErrorBoundary>
        <QuoteWizard
          key={quoteWizardOpen ? "quote-wizard-open" : "quote-wizard-closed"}
          open={quoteWizardOpen}
          setOpen={setQuoteWizardOpen}
          prefilledService={prefilledService}
          onConsultancyRequired={(km) => {
            setDistanceKm(km);
            setConsultancyOpen(true);
          }}
        />
      </ErrorBoundary>

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

// Named export used by the SSR prerender script (router is supplied externally)
export function AppRoutes() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}

// Default export for the client bundle — includes BrowserRouter.
// <Analytics /> is client-only (it is not imported by entry-server.jsx, which
// uses the AppRoutes named export instead), so it never runs during the SSR
// prerender step. It records pageviews only — no custom track() calls — and
// degrades silently (a console message, no thrown error) if Vercel Web
// Analytics has not been enabled for this project yet.
export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
      <Analytics />
    </BrowserRouter>
  );
}
