import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AppProvider, useApp } from "./context/AppContext";
import ErrorBoundary from "./components/ErrorBoundary";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Assistant from "./components/Assistant";
import QuoteWizard from "./components/QuoteWizard";
import PaymentConfirmationModal from "./components/PaymentConfirmationModal";
import PaidConsultancyModal from "./components/PaidConsultancyModal";

// Pages
import Home from "./pages/Home";
import LandscapeArchitecture from "./pages/services/LandscapeArchitecture";
import EIAStudies from "./pages/services/EIAStudies";
import Implementation from "./pages/services/Implementation";
import Maintenance from "./pages/services/Maintenance";
import Karen from "./pages/areas/Karen";
import Runda from "./pages/areas/Runda";
import Kiambu from "./pages/areas/Kiambu";
import Westlands from "./pages/areas/Westlands";
import NairobiCBD from "./pages/areas/Nairobi";

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
  const {
    quoteWizardOpen,
    setQuoteWizardOpen,
    prefilledService,
    setPrefilledService,
    confirmationOpen,
    setConfirmationOpen,
    consultancyOpen,
    setConsultancyOpen,
    distanceKm,
    setDistanceKm,
    paidService,
  } = useApp();

  return (
    <div className="font-sans text-botanique-charcoal">
      <ScrollToTop />
      <Header />

      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/services/landscape-architecture" element={<LandscapeArchitecture />} />
          <Route path="/services/eia-studies" element={<EIAStudies />} />
          <Route path="/services/implementation" element={<Implementation />} />
          <Route path="/services/maintenance" element={<Maintenance />} />
          <Route path="/areas/karen" element={<Karen />} />
          <Route path="/areas/runda" element={<Runda />} />
          <Route path="/areas/kiambu" element={<Kiambu />} />
          <Route path="/areas/westlands" element={<Westlands />} />
          <Route path="/areas/nairobi" element={<NairobiCBD />} />
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

export default function App() {
  return (
    <HashRouter>
      <AppProvider>
        <AppInner />
      </AppProvider>
    </HashRouter>
  );
}
