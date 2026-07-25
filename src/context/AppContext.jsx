import { createContext, useContext, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [quoteWizardOpen, setQuoteWizardOpen] = useState(false);
  const [prefilledService, setPrefilledService] = useState("");
  // Optional human-readable enquiry context carried into the wizard (e.g. a
  // GardenCare programme the visitor selected). Reset on every open so context
  // from one enquiry never leaks into the next.
  const [enquiryContext, setEnquiryContext] = useState(null);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [paidService, setPaidService] = useState("");
  const [consultancyOpen, setConsultancyOpen] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);
  // Whether `distanceKm` was confidently resolved from a Kenyan geocode. When
  // false, the consultation modal must ask for a manual distance rather than
  // showing a fee (see PaidConsultancyModal).
  const [distanceResolved, setDistanceResolved] = useState(false);

  function openQuoteWizard(service = "", context = null) {
    setPrefilledService(service);
    setEnquiryContext(context);
    setQuoteWizardOpen(true);
  }

  return (
    <AppContext.Provider
      value={{
        quoteWizardOpen,
        setQuoteWizardOpen,
        prefilledService,
        setPrefilledService,
        enquiryContext,
        setEnquiryContext,
        confirmationOpen,
        setConfirmationOpen,
        paidService,
        setPaidService,
        consultancyOpen,
        setConsultancyOpen,
        distanceKm,
        setDistanceKm,
        distanceResolved,
        setDistanceResolved,
        openQuoteWizard,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  return useContext(AppContext);
}
