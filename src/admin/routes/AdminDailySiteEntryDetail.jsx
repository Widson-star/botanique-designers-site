// Daily Site Record — one day, one site.
//
// AUTHORITY: docs/ui-authority/operations-hub/working-authority/
// 09-daily-site-record-detail-working-authority.png (frozen, committed).
//
// The page is built FROM that image, region by region:
//
//   1. breadcrumb, project title, "Daily Site Record • <date>" subtitle, and the
//      actions at the top right
//   2. the daily-process rail — numbered stages, icon discs, arrows between
//   3. the "approval is authority to incur" note
//   4. a THREE-COLUMN card grid, row 1: site activity status · planned
//      workforce · labour pricing
//   5. the same grid, row 2: crew / team reference · planned activities ·
//      site funds (two stacked sections in one card)
//   6. a wide band: submitted by · reviewed by · supporting evidence
//   7. a bottom status bar carrying the next step
//
// CORRECTION, 10 August 2026. PR #102's first pass replaced this with a
// two-column layout of my own — record panel on the left, a supporting rail of
// compliance/finance/history cards on the right. That is not what the image
// shows, and it read as my component library rather than the authority. The
// three-column grid is restored.
//
// WHAT THE IMAGE SHOWS THAT THIS PRODUCT DOES NOT HAVE is omitted rather than
// substituted: no weather, no site-opened time, no safety-incident count, no
// named supervisor or contact, no evidence thumbnails, no Record ID, no export.
// Those regions compact rather than being filled with unrelated cards.
//
// The rail has THREE stages, not the image's four: "Day close-out" is not an
// action, state or record this product holds, and inventing one because the
// picture has four boxes would be the picture inventing a workflow.
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

const STEP_TONE = { done: "settled", current: "brand", attention: "waiting", waiting: "unbuilt" };
const STEP_ICON = { done: "check", current: "clock", attention: "alert", waiting: "pause" };

// The daily-process rail: numbered stages with icon discs and arrows between,
// as the authority draws it.
function ProcessRail({ steps }) {
  return (
    <section
      aria-label="Record progress"
      className="rounded-xl border border-stone-200 bg-white px-4 py-4"
    >
      <ol className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {steps.map((step, index) => (
          <li key={step.key} className="flex min-w-0 flex-1 items-start gap-3">
            <Disc name={STEP_ICON[step.status]} tone={STEP_TONE[step.status]} size="h-10 w-10" />
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-semibold leading-tight text-botanique-charcoal">
                {index + 1}. {step.label}
              </p>
              {step.detail && (
                <p className="mt-1 break-words text-[11.5px] leading-snug text-gray-500">{step.detail}</p>
              )}
            </div>
            {index < steps.length - 1 && (
              <Glyph
                name="arrow"
                className="mt-3 hidden h-4 w-4 shrink-0 text-stone-300 sm:block"
              />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

// One card of the authority's grid: icon + title, then its rows.
function GridCard({ icon, title, badge, children, className = "" }) {
  return (
    <section className={`rounded-xl border border-stone-200 bg-white ${className}`}>
      <div className="flex flex-wrap items-center gap-2.5 px-4 pb-1 pt-3.5">
        {icon && <Disc name={icon} tone="brand" size="h-8 w-8" />}
        <h2 className="min-w-0 flex-1 text-[13px] font-semibold text-botanique-charcoal">{title}</h2>
        {badge}
      </div>
      <div className="px-4 pb-3.5 pt-1.5">{children}</div>
    </section>
  );
}

// A label/value row, as every card in the authority uses. `stack` is for free
// text, which must sit under its label rather than collide with it on the same
// baseline.
function Row({ label, value, tone = "", stack = false }) {
  if (stack) {
    return (
      <div className="py-1.5">
        <dt className="text-[12px] text-gray-500">{label}</dt>
        <dd className={`mt-0.5 break-words text-[12.5px] leading-relaxed ${tone || "text-botanique-charcoal"}`}>
          {value}
        </dd>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between gap-3 py-1">
      <dt className="min-w-0 text-[12px] text-gray-500">{label}</dt>
      <dd className={`min-w-0 shrink-0 break-words text-right text-[12.5px] ${tone || "text-botanique-charcoal"}`}>
        {value}
      </dd>
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
  const { claims, linesForClaim, submitClaim } = useSiteCosts();
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
  const [showHistory, setShowHistory] = useState(false);

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

  const orderedEvents = [...events].sort((left, right) =>
    String(right.occurredAt || "").localeCompare(String(left.occurredAt || "")));
  const steps = recordProgressSteps(entry, financialPosition);
  const nextStep = recordNextStep(entry, financialPosition);
  const isWorking = entry.disposition !== "no_work";
  const canCreateClaim = Boolean(financialPosition?.canCreate);
  const hasClaims = Boolean(financialPosition?.claims?.length);
  // A Project Cost that still has a move to make owns the next action. Adding
  // another same-day cost stays legitimate, but it stops being the thing the
  // page leads with, and the duplicate check on the cost form is unchanged.
  const hasLiveClaim = Boolean(financialPosition?.claims?.some((claim) =>
    ["draft", "awaiting_review", "amendment_requested"].includes(claim.lifecycle)));

  return (
    <div className="space-y-3">
      {/* 1 · Breadcrumb, identity, actions. Every action names the record it
          acts on: several workflows meet on this page, and "Accept" alone left
          the reader guessing whether it accepted the record or the claim. */}
      <div>
        <nav className="flex items-center gap-1.5 text-[12px] text-gray-500" aria-label="Breadcrumb">
          <span>Operations</span>
          <span aria-hidden="true">›</span>
          <Link to="/admin/daily-site-operations" className="hover:text-botanique-green">Daily Site Record</Link>
        </nav>
        <div className="mt-1.5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="min-w-0 break-words text-[24px] font-semibold leading-tight">
                {project?.projectName || "Authorised project"}
              </h1>
              <Chip tone={entry.state === "accepted" ? "settled" : ["submitted", "resubmitted"].includes(entry.state) ? "waiting" : "neutral"}>
                {ENTRY_STATE_LABELS[entry.state]}
              </Chip>
              {entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state) && (
                <Chip tone="attention">Late</Chip>
              )}
            </div>
            <p className="mt-1 text-[12.5px] text-gray-500">
              Daily Site Record • {formatWorkDate(entry.workDate)}
            </p>
          </div>
          {actions && (
            <div role="group" aria-label="Record actions" className="flex flex-wrap gap-2 lg:justify-end">
              {canCreateClaim && (
                <Link
                  to={`/admin/site-costs/new?dailySiteEntryId=${encodeURIComponent(entry.id)}${hasClaims ? "&additional=1" : ""}`}
                  className={hasLiveClaim
                    ? "inline-flex min-h-10 items-center gap-2 rounded-lg border border-stone-300 px-4 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50"
                    : "inline-flex min-h-10 items-center gap-2 rounded-lg bg-botanique-green px-4 text-[12.5px] font-semibold text-white hover:bg-botanique-dark"}
                >
                  <Glyph name="money" className="h-4 w-4" />
                  {hasClaims ? "Add another Project Cost" : "Create Project Cost"}
                </Link>
              )}
              {canEditDailyDraft(role, entry, currentUserId) && (
                <Link to={`/admin/daily-site-operations/${entry.id}/edit`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50">
                  Edit site record
                </Link>
              )}
              {canSubmitDailyEntry(role, entry, currentUserId) && (
                <button type="button" disabled={busy} onClick={() => run(() => submitEntry(entry.id)).then((ok) => ok && loadEvents(entry.id, true).then(setEvents))} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark disabled:opacity-60">
                  Submit site record
                </button>
              )}
              {canCorrectDailyEntry(role, entry, currentUserId) && (
                <button type="button" onClick={() => setMode("correct")} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark">
                  Correct site record
                </button>
              )}
              {canReturnDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("return"); setReason(""); }} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50">
                  Return site record
                </button>
              )}
              {canAcceptDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("accept"); setReason(""); }} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white hover:bg-botanique-dark">
                  Accept site record
                </button>
              )}
              {canSupersedeDailyEntry(role, entry) && (
                <button type="button" onClick={() => setMode("supersede")} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-medium text-botanique-charcoal hover:bg-stone-50">
                  Supersede site record
                </button>
              )}
              {canVoidDailyEntry(role, entry) && (
                <button type="button" onClick={() => { setDialog("void"); setReason(""); }} className="inline-flex min-h-10 items-center rounded-lg border border-red-200 px-3.5 text-[12.5px] font-medium text-red-700 hover:bg-red-50">
                  Void site record
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
          <span className="font-semibold">Site record returned for correction:</span> {entry.returnedReason}
        </div>
      )}
      {entry.state === "superseded" && (
        <div className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[12.5px] text-gray-600">
          This site record was superseded by a later correction.
          {supersededByLink && (
            <Link to={`/admin/daily-site-operations/${supersededByLink.id}`} className="ml-1 font-semibold text-botanique-green hover:underline">
              View the current record
            </Link>
          )}
        </div>
      )}

      {showCorrect || showSupersede ? (
        <section className="rounded-xl border border-stone-200 bg-white p-5">
          <h2 className="text-base font-semibold">
            {showCorrect ? "Correct and resubmit the site record" : "Correct the site record by supersession"}
          </h2>
          {showSupersede && (
            <>
              <p className="mt-1 text-[12.5px] text-gray-500">
                The accepted record is preserved; a corrected copy replaces it.
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
              submitLabel={showCorrect ? "Resubmit site record" : "Record correction"}
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
        <>
          {/* 2 · The daily-process rail. */}
          <ProcessRail steps={steps} />

          {/* 3 · The authority's standing note. */}
          <p className="flex items-start gap-2.5 rounded-xl border border-stone-200 bg-stone-50 px-4 py-2.5 text-[12px] text-gray-600">
            <Glyph name="doc" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            Approval does not mean paid. Payment is recorded separately against the Project Cost.
          </p>

          {/* 4 · Grid row 1. */}
          <div className="grid gap-3 lg:grid-cols-3">
            <GridCard
              icon="site"
              title="Site activity status"
              badge={<Chip tone={entry.state === "accepted" ? "settled" : "waiting"}>{DISPOSITION_LABELS[entry.disposition]}</Chip>}
            >
              <dl className="divide-y divide-stone-100">
                {!isWorking && (
                  <Row
                    label="Reason"
                    stack
                    value={`${NO_WORK_REASON_LABELS[entry.noWorkReason] || "—"}${entry.reasonDetail ? ` — ${entry.reasonDetail}` : ""}`}
                  />
                )}
                <Row label="Submitted" value={entry.submittedAt ? formatDateTime(entry.submittedAt) : "Not yet submitted"} />
                <Row
                  label="Timing"
                  value={entry.submittedAt ? (entry.isLate ? "Late" : "On time") : "—"}
                  tone={entry.isLate ? "text-amber-800" : ""}
                />
                {entry.notes && <Row label="Key notes" stack value={entry.notes} />}
              </dl>
            </GridCard>

            <GridCard icon="people" title="Planned workforce">
              {isWorking ? (
                <>
                  <p className="text-[26px] font-semibold leading-none tabular-nums text-botanique-charcoal">
                    {entry.expectedWorkerCount ?? "—"}
                    <span className="ml-1.5 text-[13px] font-medium text-gray-500">workers</span>
                  </p>
                  <dl className="mt-2.5 divide-y divide-stone-100 border-t border-stone-100 pt-1">
                    <Row label="Crew or team" value={entry.crewReference || "Not recorded"} />
                  </dl>
                </>
              ) : (
                <p className="text-[12px] text-gray-500">No workforce was planned for this day.</p>
              )}
            </GridCard>

            <GridCard icon="scale" title="Labour pricing (KES)">
              {isWorking ? (
                <dl className="divide-y divide-stone-100">
                  {entry.agreedLabourTotal != null ? (
                    <Row label="Agreed total" value={formatKes(entry.agreedLabourTotal)} />
                  ) : (
                    <Row label="Per worker" value={`${formatKes(entry.ratePerWorker)} / day`} />
                  )}
                  <Row
                    label="Estimated labour cost"
                    value={<span className="font-semibold tabular-nums">{formatKes(entry.plannedLabourCost)}</span>}
                  />
                </dl>
              ) : (
                <p className="text-[12px] text-gray-500">No labour was priced for this day.</p>
              )}
            </GridCard>
          </div>

          {/* 5 · Grid row 2. The third cell stacks its sections, as the
              authority's "Available site funds / Additional funds required"
              cell does — and the related cost claim joins them there, because
              that is this page's money column. */}
          <div className="grid gap-3 lg:grid-cols-3">
            <GridCard icon="doc" title="Planned activities">
              {isWorking && entry.workPlanned ? (
                <p className="whitespace-pre-line break-words text-[12.5px] leading-relaxed text-botanique-charcoal">
                  {entry.workPlanned}
                </p>
              ) : (
                <p className="text-[12px] text-gray-500">
                  {isWorking ? "No activities were recorded for this day." : "No work was planned for this day."}
                </p>
              )}
            </GridCard>

            <GridCard icon="check" title="Submitted and reviewed">
              <dl className="divide-y divide-stone-100">
                <Row label="Submitted by" value={<span className="break-words">{resolveActorLabel(entry.createdBy, profilesById)}</span>} />
                <Row
                  label="Reviewed by"
                  value={entry.reviewedAt
                    ? <span className="break-words">{resolveActorLabel(entry.reviewedBy, profilesById)}</span>
                    : <span className="text-gray-500">Not yet reviewed</span>}
                />
                {entry.reviewedAt && <Row label="Reviewed" value={formatDateTime(entry.reviewedAt)} />}
                {/* Evidence is a declared status, not a file store. The
                    authority's thumbnails have no model behind them, so the
                    status is shown and nothing implies an attachment. */}
                <Row label="Supporting evidence" value={EVIDENCE_STATUS_LABELS[entry.evidenceStatus]} />
              </dl>
            </GridCard>

            <section className="rounded-xl border border-stone-200 bg-white">
              <div className="flex flex-wrap items-center gap-2.5 px-4 pb-1 pt-3.5">
                <Disc name="wallet" tone="brand" size="h-8 w-8" />
                <h2 className="min-w-0 flex-1 text-[13px] font-semibold text-botanique-charcoal">Available site funds</h2>
              </div>
              <div className="px-4 pb-3.5 pt-1.5">
                <dl className="divide-y divide-stone-100">
                  <Row label="Funds available" value={<span className="font-semibold tabular-nums text-emerald-800">{formatKes(entry.fundsAvailable)}</span>} />
                  <Row
                    label="Additional required"
                    value={<span className={`font-semibold tabular-nums ${entry.additionalAmountRequested > 0 ? "text-amber-800" : ""}`}>{formatKes(entry.additionalAmountRequested)}</span>}
                  />
                </dl>
                <p className="mt-2 text-[11px] text-gray-400">
                  Planning signals only. No payment, fund release or approval is created here.
                </p>
              </div>
              <FinancialFollowUp
                position={financialPosition}
                entry={entry}
                role={role}
                currentUserId={currentUserId}
                linesForClaim={linesForClaim}
                profilesById={profilesById}
                submitting={busy}
                onSubmitClaim={(claim) => run(() => submitClaim(claim.id, claim.version))}
              />
            </section>
          </div>

          {/* 7 · Bottom status bar, with history reachable but subordinate. */}
          <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <Disc name={entry.state === "accepted" ? "check" : "clock"} tone={entry.state === "accepted" ? "settled" : "waiting"} size="h-9 w-9" />
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold text-botanique-charcoal">
                  Site record {ENTRY_STATE_LABELS[entry.state].toLowerCase()}.
                </p>
                {nextStep && <p className="mt-0.5 break-words text-[12px] text-gray-600">{nextStep}</p>}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHistory((value) => !value)}
              aria-expanded={showHistory}
              className="inline-flex min-h-9 shrink-0 items-center gap-1.5 self-start text-[12px] font-semibold text-botanique-green hover:underline sm:self-auto"
            >
              {showHistory ? "Hide history" : `History (${events.length})`}
            </button>
          </section>

          {showHistory && (
            <section className="rounded-xl border border-stone-200 bg-white px-4 py-3.5">
              <h2 className="text-[12.5px] font-semibold text-botanique-charcoal">History</h2>
              <ol className="mt-2.5 space-y-2.5">
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
                {orderedEvents.length === 0 && <li className="text-[12px] text-gray-500">No history yet.</li>}
              </ol>
            </section>
          )}
        </>
      )}

      <ConfirmDialog
        open={dialog === "return"}
        title="Return this site record for correction"
        description="Explain what needs to change on the site record. The manager can correct and resubmit it."
        confirmLabel="Return site record"
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
        title="Accept this site record"
        description="This accepts the SITE RECORD only. It decides nothing about any cost claim raised from it."
        confirmLabel="Accept site record"
        busy={busy}
        onCancel={() => setDialog(null)}
        onConfirm={handleDialogConfirm}
      >
        <label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-accept-notes">Notes (optional)</label>
        <input id="dse-accept-notes" type="text" value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20" />
      </ConfirmDialog>

      <ConfirmDialog
        open={dialog === "void"}
        title="Void this site record"
        description="Voiding keeps the site record for the audit trail but removes it from active compliance. Project Costs already raised from it are not affected."
        confirmLabel="Void site record"
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
