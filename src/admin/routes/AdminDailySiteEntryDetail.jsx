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
import { recordNextStep, recordProgressSteps } from "../utils/dailySiteRecordProgress";
import ConfirmDialog from "../components/ConfirmDialog";
import DailySiteEntryForm from "../components/dailysite/DailySiteEntryForm";
import FinancialFollowUp from "../components/dailysite/FinancialFollowUp";

function Detail({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-botanique-charcoal">{children}</dd>
    </div>
  );
}

// One compact panel of the record. The authority composes the page from small
// equal-weight cards rather than one long dossier, so each fact group is a
// panel and no panel is allowed to grow into a section of its own.
function Panel({ title, children, className = "" }) {
  return (
    <section className={`rounded-lg border border-stone-200 bg-white p-4 ${className}`}>
      <h2 className="text-sm font-semibold text-botanique-charcoal">{title}</h2>
      <div className="mt-2.5">{children}</div>
    </section>
  );
}

const STEP_TONE = {
  done: "border-emerald-200 bg-emerald-50 text-emerald-900",
  current: "border-botanique-green/30 bg-[#f2f7f4] text-botanique-charcoal",
  attention: "border-amber-200 bg-amber-50 text-amber-900",
  waiting: "border-stone-200 bg-stone-50 text-gray-500",
};

const STEP_MARK = { done: "✓", current: "•", attention: "!", waiting: "·" };

// How much history the first read shows before the reader asks for the rest.
const HISTORY_PREVIEW = 4;

// The record's position across the three stages the product genuinely holds.
// There is deliberately no fourth "day close-out" step: see
// src/admin/utils/dailySiteRecordProgress.js.
function ProgressRail({ steps }) {
  return (
    <section aria-label="Record progress" className="grid gap-2 sm:grid-cols-3">
      {steps.map((step, index) => (
        <div key={step.key} className={`rounded-lg border px-3.5 py-3 ${STEP_TONE[step.status]}`}>
          <p className="flex items-center gap-2 text-xs font-semibold">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/70 text-[11px]"
              aria-hidden="true"
            >
              {STEP_MARK[step.status]}
            </span>
            <span className="min-w-0 break-words">{index + 1}. {step.label}</span>
          </p>
          {step.detail && <p className="mt-1 break-words text-xs opacity-90">{step.detail}</p>}
        </div>
      ))}
    </section>
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
  const { claims, linesForClaim } = useSiteCosts();
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
  const [showAllHistory, setShowAllHistory] = useState(false);

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
  }, linesForClaim);

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

  // Newest first, so the most recent event is the one the reader sees.
  const orderedEvents = [...events].sort((left, right) =>
    String(right.occurredAt || "").localeCompare(String(left.occurredAt || "")));
  const visibleEvents = showAllHistory ? orderedEvents : orderedEvents.slice(0, HISTORY_PREVIEW);
  const steps = recordProgressSteps(entry, financialPosition);
  const nextStep = recordNextStep(entry, financialPosition);
  const actions = !showCorrect && !showSupersede;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <Link to="/admin/daily-site-operations" className="text-sm text-gray-500 hover:text-botanique-green">
          ← Daily Site Record
        </Link>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="min-w-0 break-words text-2xl font-semibold">
                {project?.projectName || "Authorised project"}
              </h1>
              <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                {ENTRY_STATE_LABELS[entry.state]}
              </span>
              {entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state) && (
                <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">Late</span>
              )}
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Daily Site Record · {formatWorkDate(entry.workDate)}
            </p>
          </div>
          {/* The decisions this reader actually holds, where the authority puts
              them. Every one is still gated by its own capability check. */}
          {actions && (
            <div role="group" aria-label="Record actions" className="flex flex-wrap gap-2 sm:justify-end">
              {canEditDailyDraft(role, entry, currentUserId) && (
                <Link to={`/admin/daily-site-operations/${entry.id}/edit`} className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-medium text-botanique-charcoal hover:bg-stone-50">
                  Edit draft
                </Link>
              )}
              {canSubmitDailyEntry(role, entry, currentUserId) && (
                <button type="button" disabled={busy} onClick={() => run(() => submitEntry(entry.id)).then((ok) => ok && loadEvents(entry.id, true).then(setEvents))} className="inline-flex min-h-11 items-center rounded-md bg-botanique-green px-4 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
                  Submit for review
                </button>
              )}
              {canCorrectDailyEntry(role, entry, currentUserId) && (
                <button type="button" onClick={() => setMode("correct")} className="inline-flex min-h-11 items-center rounded-md bg-botanique-green px-4 text-sm font-semibold text-white hover:bg-botanique-dark">
                  Correct &amp; resubmit
                </button>
              )}
              {canReturnDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("return"); setReason(""); }} className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-medium text-botanique-charcoal hover:bg-stone-50">
                  Return for correction
                </button>
              )}
              {canAcceptDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("accept"); setReason(""); }} className="inline-flex min-h-11 items-center rounded-md bg-botanique-green px-4 text-sm font-semibold text-white hover:bg-botanique-dark">
                  Accept
                </button>
              )}
              {canSupersedeDailyEntry(role, entry) && (
                <button type="button" onClick={() => setMode("supersede")} className="inline-flex min-h-11 items-center rounded-md border border-stone-300 px-4 text-sm font-medium text-botanique-charcoal hover:bg-stone-50">
                  Correct by supersession
                </button>
              )}
              {canVoidDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("void"); setReason(""); }} className="inline-flex min-h-11 items-center rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50">
                  Void
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* The day's position, before any detail. Three stages, because three is
          what the product holds — there is no day close-out step. */}
      <ProgressRail steps={steps} />

      <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-gray-600">
        Approval is authority to incur. Money moving, and what became of it, are
        recorded separately in Funding, Payments and Reconciliation.
      </p>

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

      {/* The record itself, as compact panels rather than one long dossier. */}
      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title="Site activity status">
          <dl className="space-y-2.5">
            <Detail label="Disposition">{DISPOSITION_LABELS[entry.disposition]}</Detail>
            {entry.disposition === "no_work" ? (
              <Detail label="Reason">
                {NO_WORK_REASON_LABELS[entry.noWorkReason] || "—"}
                {entry.reasonDetail ? ` — ${entry.reasonDetail}` : ""}
              </Detail>
            ) : (
              <Detail label="Planned site activities">{entry.workPlanned || "—"}</Detail>
            )}
            {entry.crewReference && (
              <Detail label="Crew or team reference">{entry.crewReference}</Detail>
            )}
            {entry.notes && <Detail label="Notes">{entry.notes}</Detail>}
          </dl>
        </Panel>

        <Panel title="Planned workforce">
          {entry.disposition === "no_work" ? (
            <p className="text-sm text-gray-500">No workforce was planned for this day.</p>
          ) : (
            <dl className="space-y-2.5">
              <Detail label="Workers">
                <span className="text-xl font-semibold tabular-nums">
                  {entry.expectedWorkerCount ?? "—"}
                </span>
              </Detail>
              <Detail label="Labour pricing">
                {entry.agreedLabourTotal != null
                  ? `Agreed total ${formatKes(entry.agreedLabourTotal)}`
                  : `${formatKes(entry.ratePerWorker)} per worker`}
              </Detail>
              <Detail label="Estimated labour cost">{formatKes(entry.plannedLabourCost)}</Detail>
            </dl>
          )}
        </Panel>

        <Panel title="Site funds (planning only)">
          <dl className="space-y-2.5">
            <Detail label="Currently available">{formatKes(entry.fundsAvailable)}</Detail>
            <Detail label="Additional required">
              <span className={entry.additionalAmountRequested > 0 ? "font-semibold text-amber-800" : ""}>
                {formatKes(entry.additionalAmountRequested)}
              </span>
            </Detail>
          </dl>
          <p className="mt-2.5 border-t border-stone-100 pt-2 text-xs text-gray-400">
            Planning signals only. No payment, fund release or approval is created here.
          </p>
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel title="Recorded by">
          <p className="break-words text-sm text-botanique-charcoal">
            {resolveActorLabel(entry.createdBy, profilesById)}
          </p>
          {entry.submittedAt && (
            <p className="mt-0.5 text-xs text-gray-500">
              {formatDateTime(entry.submittedAt)} · {entry.isLate ? "late" : "on time"}
            </p>
          )}
        </Panel>
        <Panel title="Reviewed by">
          {entry.reviewedAt ? (
            <>
              <p className="break-words text-sm text-botanique-charcoal">
                {resolveActorLabel(entry.reviewedBy, profilesById)}
              </p>
              <p className="mt-0.5 text-xs text-gray-500">{formatDateTime(entry.reviewedAt)}</p>
            </>
          ) : (
            <p className="text-sm text-gray-500">Not yet reviewed.</p>
          )}
        </Panel>
        {/* Evidence is a declared status, not a file store. Nothing here implies
            an attachment the product cannot hold. */}
        <Panel title="Supporting evidence">
          <p className="text-sm text-botanique-charcoal">
            {EVIDENCE_STATUS_LABELS[entry.evidenceStatus]}
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Declared on the record. Files are not stored in the Hub.
          </p>
        </Panel>
      </div>

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

      {/* Immutable timeline, kept subordinate. Nothing is hidden or summarised
          away — every event stays reachable — but a long-running record must not
          turn today's position into the tail of a dossier. */}
      <section className="rounded-lg border border-stone-200 bg-white p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h2 className="text-sm font-semibold">History</h2>
          {events.length > HISTORY_PREVIEW && (
            <button
              type="button"
              onClick={() => setShowAllHistory((value) => !value)}
              aria-expanded={showAllHistory}
              className="min-h-9 text-sm font-semibold text-botanique-green hover:underline"
            >
              {showAllHistory ? "Show recent only" : `Show all ${events.length} events`}
            </button>
          )}
        </div>
        <ol className="mt-2.5 space-y-2.5">
          {visibleEvents.map((event) => (
            <li key={event.id} className="flex gap-2.5 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-botanique-green" aria-hidden="true" />
              <div className="min-w-0">
                <p className="break-words font-medium text-botanique-charcoal">{ENTRY_EVENT_LABELS[event.eventType] || event.eventType}</p>
                <p className="text-xs text-gray-500">
                  {resolveActorLabel(event.actorId, profilesById)} · {formatDateTime(event.occurredAt)}
                </p>
                {event.eventNotes && <p className="mt-0.5 break-words text-sm text-gray-600">{event.eventNotes}</p>}
              </div>
            </li>
          ))}
          {events.length === 0 && <li className="text-sm text-gray-500">No history yet.</li>}
        </ol>
        {!showAllHistory && events.length > HISTORY_PREVIEW && (
          <p className="mt-2.5 border-t border-stone-100 pt-2 text-xs text-gray-500">
            Showing the {HISTORY_PREVIEW} most recent of {events.length} events. The full record is
            immutable and complete.
          </p>
        )}
      </section>

      {nextStep && (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-2.5 text-sm text-gray-700">
          {nextStep}
        </p>
      )}

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
