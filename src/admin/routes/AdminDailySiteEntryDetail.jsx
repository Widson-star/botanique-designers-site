import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { resolveActorLabel, formatDateTime } from "../utils/activityFormat";
import {
  canAcceptDailyEntry,
  canCorrectDailyEntry,
  canReturnDailyEntry,
  canSubmitDailyEntry,
  canSupersedeDailyEntry,
  canVoidDailyEntry,
  canEditDailyDraft,
} from "../utils/dailySiteCapabilities";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { summariseFinancialFollowUp } from "../utils/dailySiteCostLink";
import {
  DISPOSITION_LABELS,
  ENTRY_EVENT_LABELS,
  ENTRY_STATE_LABELS,
  EVIDENCE_STATUS_LABELS,
  NO_WORK_REASON_LABELS,
  formatKes,
  formatWorkDate,
} from "../utils/dailySiteFormatters";
import ConfirmDialog from "../components/ConfirmDialog";
import DailySiteEntryForm from "../components/dailysite/DailySiteEntryForm";
import FinancialFollowUp from "../components/dailysite/FinancialFollowUp";

function Detail({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-botanique-charcoal">{children}</dd>
    </div>
  );
}

export default function AdminDailySiteEntryDetail() {
  const { entryId } = useParams();
  const navigate = useNavigate();
  const { role, projects, profilesById, currentUserId } = useAdminData();
  const {
    entries, loadEvents, submitEntry, returnEntry, acceptEntry,
    voidEntry, correctEntry, supersedeEntry,
  } = useDailySiteOperations();
  const { claims } = useSiteCosts();
  // Read-only fund-request context. The operational record reaches the money
  // records to REPORT them; it never records, reconciles or decides anything.
  const { requests, allocations, releases, acquittals } = useFundRequests();

  const entry = entries.find((item) => item.id === entryId);
  const [events, setEvents] = useState([]);
  const [dialog, setDialog] = useState(null); // 'return' | 'accept' | 'void'
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState(null); // 'correct' | 'supersede'
  const [supersedeReason, setSupersedeReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (entry) {
      loadEvents(entry.id, true).then((rows) => {
        if (active) setEvents(rows);
      });
    }
    return () => { active = false; };
  }, [entry, loadEvents]);

  if (!entry) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <p className="text-sm text-gray-500">This entry is not available.</p>
        <Link to="/admin/daily-site-operations" className="mt-4 inline-block text-sm font-semibold text-botanique-green hover:underline">
          Back to daily site operations
        </Link>
      </div>
    );
  }

  const project = projects.find((item) => item.id === entry.projectId);
  const supersededByLink = entries.find((item) => item.supersedesEntryId === entry.id);
  // Derived only — the operational record reads the claim position, it never
  // writes one. See src/admin/utils/dailySiteCostLink.js.
  const financialPosition = summariseFinancialFollowUp(entry, claims, role, {
    requests, allocations, releases, acquittals,
  });

  async function run(action) {
    setBusy(true);
    setError("");
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.error || "The action did not complete.");
        return false;
      }
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function handleDialogConfirm() {
    let ok = false;
    if (dialog === "return") ok = await run(() => returnEntry(entry.id, reason));
    else if (dialog === "accept") ok = await run(() => acceptEntry(entry.id, reason));
    else if (dialog === "void") ok = await run(() => voidEntry(entry.id, reason));
    if (ok) {
      setDialog(null);
      setReason("");
      const refreshed = await loadEvents(entry.id, true);
      setEvents(refreshed);
    }
  }

  const showCorrect = mode === "correct";
  const showSupersede = mode === "supersede";

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div>
        <Link to="/admin/daily-site-operations" className="text-sm text-gray-500 hover:text-botanique-green">
          ← Daily Site Record
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{project?.projectName || "Authorised project"}</h1>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-gray-600">
            {ENTRY_STATE_LABELS[entry.state]}
          </span>
          {entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state) && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Late</span>
          )}
        </div>
        <p className="mt-1 text-sm text-gray-500">{formatWorkDate(entry.workDate)}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
      )}

      {entry.state === "returned_for_correction" && entry.returnedReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <span className="font-medium">Returned for correction:</span> {entry.returnedReason}
        </div>
      )}
      {entry.state === "superseded" && (
        <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-gray-600">
          This entry was superseded by a later correction.
          {supersededByLink && (
            <Link to={`/admin/daily-site-operations/${supersededByLink.id}`} className="ml-1 font-semibold text-botanique-green hover:underline">
              View the current entry
            </Link>
          )}
        </div>
      )}

      {/* Entry facts */}
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Detail label="Site activity status">{DISPOSITION_LABELS[entry.disposition]}</Detail>
          {entry.disposition === "no_work" ? (
            <Detail label="Reason">
              {NO_WORK_REASON_LABELS[entry.noWorkReason] || "—"}
              {entry.reasonDetail ? ` — ${entry.reasonDetail}` : ""}
            </Detail>
          ) : (
            <>
              <Detail label="Planned workforce">{entry.expectedWorkerCount ?? "—"}</Detail>
              <Detail label="Labour pricing">
                {entry.agreedLabourTotal != null
                  ? `Agreed total ${formatKes(entry.agreedLabourTotal)}`
                  : `${formatKes(entry.ratePerWorker)} per worker`}
              </Detail>
              <Detail label="Estimated labour cost">{formatKes(entry.plannedLabourCost)}</Detail>
              {entry.crewReference && <Detail label="Crew or team reference">{entry.crewReference}</Detail>}
              <Detail label="Planned site activities">{entry.workPlanned || "—"}</Detail>
            </>
          )}
          <Detail label="Site funds currently available">{formatKes(entry.fundsAvailable)}</Detail>
          <Detail label="Additional site funds required">{formatKes(entry.additionalAmountRequested)}</Detail>
          <Detail label="Supporting evidence">{EVIDENCE_STATUS_LABELS[entry.evidenceStatus]}</Detail>
          <Detail label="Recorded by">{resolveActorLabel(entry.createdBy, profilesById)}</Detail>
          {entry.submittedAt && (
            <Detail label="Submitted">
              {formatDateTime(entry.submittedAt)} {entry.isLate ? "(late)" : "(on time)"}
            </Detail>
          )}
          {entry.reviewedAt && <Detail label="Reviewed">{formatDateTime(entry.reviewedAt)} by {resolveActorLabel(entry.reviewedBy, profilesById)}</Detail>}
          {entry.notes && <Detail label="Notes">{entry.notes}</Detail>}
        </dl>
        <p className="mt-4 border-t border-stone-100 pt-3 text-xs text-gray-400">
          Funds figures are planning signals only — no payment, fund release or approval is created.
        </p>
      </section>

      {/* Actions */}
      {!showCorrect && !showSupersede && (
        <section className="flex flex-wrap gap-2">
          {canEditDailyDraft(role, entry, currentUserId) && (
            <Link to={`/admin/daily-site-operations/${entry.id}/edit`} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-botanique-charcoal hover:bg-stone-50">
              Edit draft
            </Link>
          )}
          {canSubmitDailyEntry(role, entry, currentUserId) && (
            <button type="button" disabled={busy} onClick={() => run(() => submitEntry(entry.id)).then((ok) => ok && loadEvents(entry.id, true).then(setEvents))} className="rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
              Submit for review
            </button>
          )}
          {canCorrectDailyEntry(role, entry, currentUserId) && (
            <button type="button" onClick={() => setMode("correct")} className="rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
              Correct &amp; resubmit
            </button>
          )}
          {canReturnDailyEntry(role, entry) && (
            <button type="button" onClick={() => { setDialog("return"); setReason(""); }} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-botanique-charcoal hover:bg-stone-50">
              Return for correction
            </button>
          )}
          {canAcceptDailyEntry(role, entry) && (
            <button type="button" onClick={() => { setDialog("accept"); setReason(""); }} className="rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
              Accept
            </button>
          )}
          {canVoidDailyEntry(role, entry) && (
            <button type="button" onClick={() => { setDialog("void"); setReason(""); }} className="rounded-md border border-red-200 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50">
              Void
            </button>
          )}
          {canSupersedeDailyEntry(role, entry) && (
            <button type="button" onClick={() => setMode("supersede")} className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-botanique-charcoal hover:bg-stone-50">
              Correct by supersession
            </button>
          )}
        </section>
      )}

      {/* Financial follow-up: status and drill-through only. The cost-claim
          module remains authoritative for the claim itself. */}
      {!showCorrect && !showSupersede && (
        <FinancialFollowUp position={financialPosition} entryId={entry.id} />
      )}

      {showCorrect && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Correct and resubmit</h2>
          <div className="mt-4">
            <DailySiteEntryForm
              entry={entry}
              submitLabel="Resubmit entry"
              busy={busy}
              onSubmit={async (values) => {
                const ok = await run(() => correctEntry(entry.id, values));
                if (ok) { setMode(null); const rows = await loadEvents(entry.id, true); setEvents(rows); }
              }}
            />
          </div>
          <button type="button" onClick={() => setMode(null)} className="mt-3 text-sm text-gray-500 hover:text-botanique-green">Cancel</button>
        </section>
      )}

      {showSupersede && (
        <section className="rounded-lg border border-stone-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Correct by supersession</h2>
          <p className="mt-1 text-sm text-gray-500">The accepted entry is preserved; a corrected copy replaces it.</p>
          <div className="mt-4">
            <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-supersede-reason">Reason for the correction</label>
            <input id="dse-supersede-reason" type="text" value={supersedeReason} onChange={(event) => setSupersedeReason(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 text-base focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20" />
          </div>
          <div className="mt-4">
            <DailySiteEntryForm
              entry={entry}
              submitLabel="Record correction"
              busy={busy}
              onSubmit={async (values) => {
                if (!supersedeReason.trim()) { setError("A reason is required to supersede."); return; }
                const ok = await run(() => supersedeEntry(entry.id, supersedeReason, values));
                if (ok) {
                  const replacement = entries.find((item) => item.supersedesEntryId === entry.id);
                  setMode(null);
                  navigate(replacement ? `/admin/daily-site-operations/${replacement.id}` : "/admin/daily-site-operations");
                }
              }}
            />
          </div>
          <button type="button" onClick={() => setMode(null)} className="mt-3 text-sm text-gray-500 hover:text-botanique-green">Cancel</button>
        </section>
      )}

      {/* Immutable timeline */}
      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-base font-semibold">History</h2>
        <ol className="mt-3 space-y-3">
          {events.map((event) => (
            <li key={event.id} className="flex gap-3 text-sm">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-botanique-green" aria-hidden="true" />
              <div>
                <p className="font-medium text-botanique-charcoal">{ENTRY_EVENT_LABELS[event.eventType] || event.eventType}</p>
                <p className="text-xs text-gray-500">
                  {resolveActorLabel(event.actorId, profilesById)} · {formatDateTime(event.occurredAt)}
                </p>
                {event.eventNotes && <p className="mt-0.5 text-sm text-gray-600">{event.eventNotes}</p>}
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="text-sm text-gray-500">No history yet.</li>}
        </ol>
      </section>

      <ConfirmDialog
        open={dialog === "return"}
        title="Return this entry for correction"
        description="Explain what needs to change. The manager can correct and resubmit."
        confirmLabel="Return entry"
        confirmDisabled={!reason.trim()}
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      >
        <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-return-reason">Reason</label>
        <textarea id="dse-return-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20" />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "accept"}
        title="Accept this entry"
        description="The entry becomes part of the accepted record. Later corrections are made by supersession."
        confirmLabel="Accept entry"
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      >
        <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-accept-notes">Notes (optional)</label>
        <input id="dse-accept-notes" type="text" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20" />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "void"}
        title="Void this entry"
        description="Voiding keeps the record for the audit trail but removes it from active compliance."
        confirmLabel="Void entry"
        confirmTone="danger"
        confirmDisabled={!reason.trim()}
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      >
        <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-void-reason">Reason</label>
        <textarea id="dse-void-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20" />
      </ConfirmDialog>
    </div>
  );
}
