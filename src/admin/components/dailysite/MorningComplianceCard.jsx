// Dashboard morning-compliance surface. Soft enforcement only: it shows what is
// due, missing, late and waived and links to record an entry. It never blocks
// any other admin area. Owners can waive a missing project/date inline.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDailySiteOperations } from "../../context/dailySiteOperations";
import { todayIso } from "../../utils/dailySiteFormatters";
import { canWaiveCompliance, summarizeCompliance } from "../../utils/dailySiteCapabilities";
import { COMPLIANCE_STATUS_LABELS } from "../../utils/dailySiteFormatters";
import ConfirmDialog from "../ConfirmDialog";

export default function MorningComplianceCard({ role }) {
  const { compliance, status, createWaiver, refresh } = useDailySiteOperations();
  const summary = useMemo(() => summarizeCompliance(compliance), [compliance]);
  const [waiveFor, setWaiveFor] = useState(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const canWaive = canWaiveCompliance(role);

  async function confirmWaiver() {
    if (!waiveFor || !reason.trim()) return;
    setBusy(true);
    try {
      const result = await createWaiver(waiveFor.projectId, waiveFor.workDate || todayIso(), reason);
      if (result.ok) {
        setWaiveFor(null);
        setReason("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="morning-compliance-title">
      <div className="flex items-center justify-between">
        <h2 id="morning-compliance-title" className="text-base font-semibold">Morning site entries due</h2>
        <Link to="/admin/daily-site-operations" className="text-sm font-medium text-botanique-green hover:underline">
          Open
        </Link>
      </div>

      {status === "loading" ? (
        <p className="mt-3 text-sm text-gray-500">Loading compliance…</p>
      ) : summary.due === 0 ? (
        <p className="mt-3 text-sm text-gray-500">No active projects require a morning entry today.</p>
      ) : summary.missing === 0 ? (
        <p className="mt-3 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          All {summary.due} active project{summary.due === 1 ? "" : "s"} have a morning entry or waiver today.
        </p>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span className="text-gray-600">Due <strong className="tabular-nums text-botanique-charcoal">{summary.due}</strong></span>
            <span className="text-amber-700">Missing <strong className="tabular-nums">{summary.missing}</strong></span>
            {summary.late > 0 && <span className="text-amber-700">Late <strong className="tabular-nums">{summary.late}</strong></span>}
            {summary.waived > 0 && <span className="text-gray-600">Waived <strong className="tabular-nums">{summary.waived}</strong></span>}
          </div>
          <ul className="mt-3 space-y-2">
            {summary.missingProjects.map((row) => (
              <li key={row.projectId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 px-3 py-2">
                <span className="text-sm font-medium text-botanique-charcoal">{row.projectName}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {COMPLIANCE_STATUS_LABELS[row.complianceStatus]}
                  </span>
                  <Link
                    to={`/admin/daily-site-operations/new?project=${row.projectId}`}
                    className="rounded-md bg-botanique-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-botanique-dark"
                  >
                    Record
                  </Link>
                  {canWaive && (
                    <button
                      type="button"
                      onClick={() => { setWaiveFor(row); setReason(""); }}
                      className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-stone-50"
                    >
                      Waive
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!waiveFor}
        title={`Waive morning entry — ${waiveFor?.projectName || ""}`}
        description="A waiver satisfies compliance for this project and date. No operational data is recorded — it does not imply workers, cost, work or funds."
        confirmLabel="Waive entry"
        confirmDisabled={!reason.trim()}
        busy={busy}
        onCancel={() => setWaiveFor(null)}
        onConfirm={confirmWaiver}
      >
        <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-waiver-reason">Reason for the waiver</label>
        <textarea
          id="dse-waiver-reason"
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20"
        />
      </ConfirmDialog>
    </section>
  );
}
