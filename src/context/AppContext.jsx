import { createContext, useContext, useState } from "react";

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [quoteWizardOpen, setQuoteWizardOpen] = useState(false);
  const [prefilledService, setPrefilledService] = useState("");
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [paidService, setPaidService] = useState("");
  const [consultancyOpen, setConsultancyOpen] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);

  function openQuoteWizard(service = "") {
    setPrefilledService(service);
    setQuoteWizardOpen(true);
  }

  return (
    <AppContext.Provider
      value={{
        quoteWizardOpen,
        setQuoteWizardOpen,
        prefilledService,
        setPrefilledService,
        confirmationOpen,
        setConfirmationOpen,
        paidService,
        setPaidService,
        consultancyOpen,
        setConsultancyOpen,
        distanceKm,
        setDistanceKm,
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
