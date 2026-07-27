// Global aria-live save-feedback banner. Announces success/failure of project
// mutations for assistive technology and sighted users alike.
import { useEffect } from "react";
import { useAdminData } from "../context/adminData";

export default function SaveFeedback() {
  const { saveFeedback, clearSaveFeedback } = useAdminData();

  useEffect(() => {
    if (saveFeedback?.type === "success") {
      const timer = setTimeout(clearSaveFeedback, 6000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [saveFeedback, clearSaveFeedback]);

  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only-focusable">
      {saveFeedback && (
        <div
          role={saveFeedback.type === "error" ? "alert" : "status"}
          className={`fixed z-50 bottom-4 right-4 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${
            saveFeedback.type === "error"
              ? "border-red-300 bg-red-50 text-red-900"
              : "border-emerald-300 bg-emerald-50 text-emerald-900"
          }`}
        >
          <div className="flex items-start gap-3">
            <span className="font-medium">{saveFeedback.message}</span>
            <button
              type="button"
              onClick={clearSaveFeedback}
              className="ml-auto text-xs font-semibold underline"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
