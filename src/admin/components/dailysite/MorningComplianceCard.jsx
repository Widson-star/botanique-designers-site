// Dashboard morning-compliance surface. Soft enforcement only: it shows what is
// due, missing, late and waived and links to record an entry. It never blocks
// any other admin area. Owners can waive a missing project/date inline.
//
// Presented as "Due today", per
// `docs/ui-authority/operations-hub/01-dashboard-authority.png`. The underlying
// state is unchanged and is still the morning-compliance state described in
// Product Requirements §11 — only the panel's presentation is governed by the
// screen, which pairs it with "Projects needing attention" as one of two SHORT
// action panels. It lists the first few missing entries and defers the rest to
// Daily site operations; it must never grow into a full compliance log.
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useDailySiteOperations } from "../../context/dailySiteOperations";
import { todayIso } from "../../utils/dailySiteFormatters";
import { canWaiveCompliance, summarizeCompliance } from "../../utils/dailySiteCapabilities";
import { COMPLIANCE_STATUS_LABELS } from "../../utils/dailySiteFormatters";
import ConfirmDialog from "../ConfirmDialog";

// How many missing entries the panel lists before deferring to Daily site operations.
export const DUE_TODAY_PREVIEW_LIMIT = 4;

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

  const visibleMissing = summary.missingProjects.slice(0, DUE_TODAY_PREVIEW_LIMIT);

  return (
    <section
      className="flex min-w-0 flex-col rounded-lg border border-stone-200 bg-white"
      aria-labelledby="morning-compliance-title"
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="morning-compliance-title" className="text-base font-semibold">Due today</h2>
          {summary.missing > 0 && (
            <span
              className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-red-700"
              data-due-today-count
            >
              {summary.missing}
            </span>
          )}
        </div>
        <Link to="/admin/daily-site-operations" className="shrink-0 text-sm font-medium text-botanique-green hover:underline">
          View all
        </Link>
      </div>

      {status === "loading" ? (
        <p className="px-5 pb-4 text-sm text-gray-500">Loading compliance…</p>
      ) : summary.due === 0 ? (
        <p className="px-5 pb-4 text-sm text-gray-500">No active projects require a morning entry today.</p>
      ) : summary.missing === 0 ? (
        <p className="mx-5 mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          All {summary.due} active project{summary.due === 1 ? "" : "s"} have a morning entry or waiver today.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-x-5 gap-y-1 px-5 pb-3 text-xs">
            <span className="text-gray-500">Due <strong className="tabular-nums text-botanique-charcoal">{summary.due}</strong></span>
            <span className="text-red-700">Missing <strong className="tabular-nums">{summary.missing}</strong></span>
            {summary.late > 0 && <span className="text-amber-700">Late <strong className="tabular-nums">{summary.late}</strong></span>}
            {summary.waived > 0 && <span className="text-gray-500">Waived <strong className="tabular-nums">{summary.waived}</strong></span>}
          </div>
          <ul className="divide-y divide-stone-100 border-t border-stone-100">
            {visibleMissing.map((row) => (
              <li key={row.projectId} className="flex min-w-0 items-start gap-3 px-5 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-botanique-charcoal">Morning site entry missing</p>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {row.projectName} · {COMPLIANCE_STATUS_LABELS[row.complianceStatus]}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-2">
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
