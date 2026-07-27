// Global aria-live save-feedback banner. Announces success/failure/refresh
// warnings for project mutations. A "warning" means the write persisted but the
// follow-up project-list refresh failed — it offers a working Retry action and
// never claims the save itself failed.
import { useEffect, useState } from "react";
import { useAdminData } from "../context/adminData";

const TONE = {
  error: "border-red-300 bg-red-50 text-red-900",
  warning: "border-amber-300 bg-amber-50 text-amber-900",
  success: "border-emerald-300 bg-emerald-50 text-emerald-900",
};

export default function SaveFeedback() {
  const { saveFeedback, clearSaveFeedback, refetchProjects } = useAdminData();
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    if (saveFeedback?.type === "success") {
      const timer = setTimeout(clearSaveFeedback, 6000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [saveFeedback, clearSaveFeedback]);

  async function handleRetry() {
    setRetrying(true);
    const result = await refetchProjects();
    setRetrying(false);
    if (result?.ok) clearSaveFeedback();
  }

  if (!saveFeedback) {
    return <div aria-live="polite" aria-atomic="true" className="sr-only" />;
  }

  const isWarning = saveFeedback.type === "warning";
  const tone = TONE[saveFeedback.type] || TONE.success;

  return (
    <div aria-live="polite" aria-atomic="true">
      <div
        role={saveFeedback.type === "error" ? "alert" : "status"}
        className={`fixed z-50 bottom-4 right-4 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-lg ${tone}`}
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
        {isWarning && (
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="mt-2 rounded-md border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:opacity-60"
          >
            {retrying ? "Refreshing…" : "Retry refresh"}
          </button>
        )}
      </div>
    </div>
  );
}
