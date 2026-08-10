// Daily Site Record — one day, one site.
//
// Visual authority: docs/ui-authority/operations-hub/working-authority/
// 09-daily-site-record-detail-working-authority.png (frozen).
//
// FIDELITY CORRECTION, 10 August 2026. The first implementation stacked seven
// full-width regions down the page — rail, banner, three panels, three more
// panels, financial follow-up, history, next step — so the record read as a
// pile of unrelated boxes and history carried the same weight as today.
//
// Three structural changes, all visible:
//
//   1. A CONNECTED RAIL, not three separate cards. The three stages sit in one
//      strip with the progression drawn between them, which is what makes it a
//      rail rather than three more boxes.
//   2. A TWO-COLUMN BODY. The left column is the operational record itself, as
//      ONE panel with internal sections rather than six cards; the right column
//      is the supporting rail — compliance, financial follow-up, history. The
//      record is operational first and finance is a summary beside it, never a
//      second application pasted underneath.
//   3. HISTORY IS A CLOSED DISCLOSURE at the foot of the right column. The
//      immutable record stays complete and one press away, but it can no longer
//      compete with today's position for the first viewport.
//
// There is deliberately NO fourth "Day close-out" stage: operational close and
// financial settlement are distinct, and no day-close action, state or record
// exists in this product.
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
import { recordNextStep, recordProgressSteps } from "../utils/dailySiteRecordProgress";
import {
  DISPOSITION_LABELS,
  ENTRY_EVENT_LABELS,
  ENTRY_STATE_LABELS,
  EVIDENCE_STATUS_LABELS,
  NO_WORK_REASON_LABELS,
  formatKes,
  formatWorkDate,
} from "../utils/dailySiteFormatters";
import { Chip, Disc, Glyph } from "../components/ui/Surfaces";
import ConfirmDialog from "../components/ConfirmDialog";
import DailySiteEntryForm from "../components/dailysite/DailySiteEntryForm";
import FinancialFollowUp from "../components/dailysite/FinancialFollowUp";

const STEP_TONE = {
  done: { disc: "settled", text: "text-emerald-800", bar: "bg-emerald-300" },
  current: { disc: "brand", text: "text-botanique-charcoal", bar: "bg-botanique-green/40" },
  attention: { disc: "waiting", text: "text-amber-900", bar: "bg-amber-300" },
  waiting: { disc: "unbuilt", text: "text-gray-500", bar: "bg-stone-200" },
};

const STEP_ICON = { done: "check", current: "clock", attention: "alert", waiting: "pause" };

// The record's position across the three stages the product genuinely holds,
// drawn as one connected strip.
function ProgressRail({ steps }) {
  return (
    <section
      aria-label="Record progress"
      className="flex flex-col gap-0 overflow-hidden rounded-xl border border-stone-200 bg-white sm:flex-row"
    >
      {steps.map((step, index) => {
        const tone = STEP_TONE[step.status];
        return (
          <div
            key={step.key}
            className={`relative flex min-w-0 flex-1 items-start gap-2.5 px-3.5 py-3 ${
              index > 0 ? "border-t border-stone-100 sm:border-l sm:border-t-0" : ""
            }`}
          >
            <Disc name={STEP_ICON[step.status]} tone={tone.disc} size="h-7 w-7" />
            <div className="min-w-0">
              <p className={`text-[12px] font-semibold leading-tight ${tone.text}`}>
                {index + 1}. {step.label}
              </p>
              {step.detail && (
                <p className="mt-0.5 break-words text-[11px] leading-snug text-gray-500">{step.detail}</p>
              )}
            </div>
            {/* The progression itself, drawn between the stages. */}
            <span
              aria-hidden="true"
              className={`absolute inset-x-0 bottom-0 h-[3px] ${tone.bar}`}
            />
          </div>
        );
      })}
    </section>
  );
}

// One labelled fact inside the record panel.
function Fact({ label, children, className = "" }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 break-words text-[12.5px] text-botanique-charcoal">{children}</dd>
    </div>
  );
}

// A section inside the single record panel — hairline separated, never its own
// bordered card. This is what stops the record reading as a pile of boxes.
function Band({ icon, title, children }) {
  return (
    <div className="border-t border-stone-100 px-4 py-3 first:border-t-0">
      <p className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
        <Glyph name={icon} className="h-3.5 w-3.5 text-botanique-green" />
        {title}
      </p>
      <div className="mt-2">{children}</div>
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
      <div className="rounded-xl border border-stone-200 bg-white p-8">
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
  const actions = !showCorrect && !showSupersede;

  // Newest first, so the most recent event is the one the reader sees.
  const orderedEvents = [...events].sort((left, right) =>
    String(right.occurredAt || "").localeCompare(String(left.occurredAt || "")));
  const steps = recordProgressSteps(entry, financialPosition);
  const nextStep = recordNextStep(entry, financialPosition);
  const isWorking = entry.disposition !== "no_work";

  return (
    <div className="mx-auto max-w-6xl space-y-3">
      {/* ── IDENTITY AND THE READER'S DECISIONS. */}
      <div>
        <Link to="/admin/daily-site-operations" className="inline-flex items-center gap-1 text-[12px] text-gray-500 hover:text-botanique-green">
          ← Daily Site Record
        </Link>
        <div className="mt-1.5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-[22px] font-semibold leading-tight">
                {project?.projectName || "Authorised project"}
              </h1>
              <Chip tone={entry.state === "accepted" ? "settled" : ["submitted", "resubmitted"].includes(entry.state) ? "waiting" : "neutral"}>
                {ENTRY_STATE_LABELS[entry.state]}
              </Chip>
              {entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state) && (
                <Chip tone="attention">Late</Chip>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] text-gray-500">
              Daily Site Record · {formatWorkDate(entry.workDate)}
            </p>
          </div>
          {actions && (
            <div role="group" aria-label="Record actions" className="flex flex-wrap gap-2 lg:justify-end">
              {canEditDailyDraft(role, entry, currentUserId) && (
                <Link to={`/admin/daily-site-operations/${entry.id}/edit`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50">
                  Edit draft
                </Link>
              )}
              {canSubmitDailyEntry(role, entry, currentUserId) && (
                <button type="button" disabled={busy} onClick={() => run(() => submitEntry(entry.id)).then((ok) => ok && loadEvents(entry.id, true).then(setEvents))} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
                  Submit for review
                </button>
              )}
              {canCorrectDailyEntry(role, entry, currentUserId) && (
                <button type="button" onClick={() => setMode("correct")} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark">
                  Correct &amp; resubmit
                </button>
              )}
              {canReturnDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("return"); setReason(""); }} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50">
                  Return for correction
                </button>
              )}
              {canAcceptDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("accept"); setReason(""); }} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark">
                  Accept
                </button>
              )}
              {canSupersedeDailyEntry(role, entry) && (
                <button type="button" onClick={() => setMode("supersede")} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50">
                  Correct by supersession
                </button>
              )}
              {canVoidDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("void"); setReason(""); }} className="inline-flex min-h-10 items-center rounded-lg border border-red-200 px-3.5 text-[12.5px] font-medium text-red-700 hover:bg-red-50">
                  Void
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>
      )}

      {entry.state === "returned_for_correction" && entry.returnedReason && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-[12.5px] text-amber-900">
          <span className="font-semibold">Returned for correction:</span> {entry.returnedReason}
        </div>
      )}
      {entry.state === "superseded" && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[12.5px] text-gray-600">
          This entry was superseded by a later correction.
          {supersededByLink && (
            <Link to={`/admin/daily-site-operations/${supersededByLink.id}`} className="ml-1 font-semibold text-botanique-green hover:underline">
              View the current entry
            </Link>
          )}
        </div>
      )}

      <ProgressRail steps={steps} />

      {showCorrect || showSupersede ? (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold">
            {showCorrect ? "Correct and resubmit" : "Correct by supersession"}
          </h2>
          {showSupersede && (
            <>
              <p className="mt-1 text-[12.5px] text-gray-500">
                The accepted entry is preserved; a corrected copy replaces it.
              </p>
              <div className="mt-4">
                <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-supersede-reason">Reason for the correction</label>
                <input id="dse-supersede-reason" type="text" value={supersedeReason} onChange={(event) => setSupersedeReason(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-3 text-base focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20" />
              </div>
            </>
          )}
          <div className="mt-4">
            <DailySiteEntryForm
              entry={entry}
              submitLabel={showCorrect ? "Resubmit entry" : "Record correction"}
              busy={busy}
              onSubmit={async (values) => {
                if (showCorrect) {
                  const ok = await run(() => correctEntry(entry.id, values));
                  if (ok) { setMode(null); setEvents(await loadEvents(entry.id, true)); }
                  return;
                }
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
      ) : (
        // ── THE RECORD (left) AND ITS SUPPORTING RAIL (right).
        <div className="grid gap-3 lg:grid-cols-5">
          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white lg:col-span-3">
            <Band icon="site" title="Site activity">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Disposition">{DISPOSITION_LABELS[entry.disposition]}</Fact>
                {isWorking ? (
                  <Fact label="Planned activities" className="sm:col-span-2">
                    {entry.workPlanned || "—"}
                  </Fact>
                ) : (
                  <Fact label="Reason">
                    {NO_WORK_REASON_LABELS[entry.noWorkReason] || "—"}
                    {entry.reasonDetail ? ` — ${entry.reasonDetail}` : ""}
                  </Fact>
                )}
                {entry.crewReference && <Fact label="Crew or team">{entry.crewReference}</Fact>}
                {entry.notes && <Fact label="Notes" className="sm:col-span-2">{entry.notes}</Fact>}
              </dl>
            </Band>

            {isWorking && (
              <Band icon="people" title="Workforce and labour">
                <dl className="grid gap-3 sm:grid-cols-3">
                  <Fact label="Workers">
                    <span className="text-[20px] font-semibold leading-none tabular-nums">
                      {entry.expectedWorkerCount ?? "—"}
                    </span>
                  </Fact>
                  <Fact label="Labour pricing">
                    {entry.agreedLabourTotal != null
                      ? `Agreed total ${formatKes(entry.agreedLabourTotal)}`
                      : `${formatKes(entry.ratePerWorker)} per worker`}
                  </Fact>
                  <Fact label="Estimated labour cost">
                    <span className="font-semibold tabular-nums">{formatKes(entry.plannedLabourCost)}</span>
                  </Fact>
                </dl>
              </Band>
            )}

            <Band icon="wallet" title="Site funds — planning only">
              <dl className="grid gap-3 sm:grid-cols-2">
                <Fact label="Currently available">
                  <span className="font-semibold tabular-nums">{formatKes(entry.fundsAvailable)}</span>
                </Fact>
                <Fact label="Additional required">
                  <span className={`font-semibold tabular-nums ${entry.additionalAmountRequested > 0 ? "text-amber-800" : ""}`}>
                    {formatKes(entry.additionalAmountRequested)}
                  </span>
                </Fact>
              </dl>
              <p className="mt-2 text-[11px] text-gray-400">
                Planning signals only. No payment, fund release or approval is created here.
              </p>
            </Band>
          </section>

          <div className="space-y-3 lg:col-span-2">
            {/* Compliance, timing and evidence — the record's own provenance. */}
            <section className="rounded-xl border border-stone-200 bg-white">
              <div className="flex items-center gap-2.5 border-b border-stone-100 px-3.5 py-3">
                <Disc name="check" tone={entry.reviewedAt ? "settled" : "neutral"} size="h-7 w-7" />
                <h2 className="text-[13px] font-semibold text-botanique-charcoal">Compliance and evidence</h2>
              </div>
              <dl className="space-y-2.5 px-3.5 py-3 text-[12px]">
                <SideRow label="Recorded by">
                  <span className="break-words">{resolveActorLabel(entry.createdBy, profilesById)}</span>
                  {entry.submittedAt && (
                    <span className="mt-0.5 block text-[11px] text-gray-500">
                      {formatDateTime(entry.submittedAt)} · {entry.isLate ? "late" : "on time"}
                    </span>
                  )}
                </SideRow>
                <SideRow label="Reviewed by">
                  {entry.reviewedAt ? (
                    <>
                      <span className="break-words">{resolveActorLabel(entry.reviewedBy, profilesById)}</span>
                      <span className="mt-0.5 block text-[11px] text-gray-500">{formatDateTime(entry.reviewedAt)}</span>
                    </>
                  ) : (
                    <span className="text-gray-500">Not yet reviewed</span>
                  )}
                </SideRow>
                {/* Evidence is a declared status, not a file store. Nothing here
                    implies an attachment the product cannot hold. */}
                <SideRow label="Supporting evidence">
                  <span>{EVIDENCE_STATUS_LABELS[entry.evidenceStatus]}</span>
                  <span className="mt-0.5 block text-[11px] text-gray-500">
                    Declared on the record. Files are not stored in the Hub.
                  </span>
                </SideRow>
              </dl>
            </section>

            {/* Finance sits BESIDE the record as a summary and a link — never
                beneath it as a second ledger. */}
            <FinancialFollowUp position={financialPosition} entryId={entry.id} />

            {/* History, closed by default. The immutable record stays complete
                and one press away; it can no longer compete with today. */}
            <section className="rounded-xl border border-stone-200 bg-white">
              <button
                type="button"
                onClick={() => setShowAllHistory((value) => !value)}
                aria-expanded={showAllHistory}
                className="flex w-full min-h-11 items-center justify-between gap-2 px-3.5 py-3 text-left"
              >
                <span className="flex items-center gap-2.5">
                  <Disc name="clock" tone="neutral" size="h-7 w-7" />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-semibold text-botanique-charcoal">History</span>
                    <span className="block text-[11px] text-gray-500">
                      {events.length === 1 ? "1 event" : `${events.length} events`} · immutable
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-[11.5px] font-semibold text-botanique-green">
                  {showAllHistory ? "Hide" : "Show"}
                </span>
              </button>
              {showAllHistory && (
                <ol className="space-y-2.5 border-t border-stone-100 px-3.5 py-3">
                  {orderedEvents.map((event) => (
                    <li key={event.id} className="flex gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-botanique-green" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="break-words text-[12px] font-medium text-botanique-charcoal">
                          {ENTRY_EVENT_LABELS[event.eventType] || event.eventType}
                        </p>
                        <p className="text-[11px] text-gray-500">
                          {resolveActorLabel(event.actorId, profilesById)} · {formatDateTime(event.occurredAt)}
                        </p>
                        {event.eventNotes && <p className="mt-0.5 break-words text-[11.5px] text-gray-600">{event.eventNotes}</p>}
                      </div>
                    </li>
                  ))}
                  {events.length === 0 && <li className="text-[12px] text-gray-500">No history yet.</li>}
                </ol>
              )}
            </section>
          </div>
        </div>
      )}

      {nextStep && actions && (
        <p className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[12.5px] text-gray-700">
          <Glyph name="arrow" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-botanique-green" />
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

function SideRow({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 text-botanique-charcoal">{children}</dd>
    </div>
  );
}
