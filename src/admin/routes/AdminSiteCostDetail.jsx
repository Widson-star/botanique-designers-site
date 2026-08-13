import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import {
  canCancelSiteCost, canDecideSiteCost, canEditSiteCost, canSubmitSiteCost,
  canSubmitCostFromDailySite, costSubmissionBlockedReason, canWithdrawSiteCost,
  SITE_COST_LIFECYCLES,
} from "../utils/siteCostCapabilities";
import { profilePresentationName } from "../utils/personName";
import { possibleDuplicateClaims } from "../utils/duplicateCostClaim";
import { costPaymentTruth, costTotal } from "../utils/costPaymentTruth";
import { costReference } from "../utils/costReference";
import { costAmountLabel, paymentChannelLabel } from "../utils/costPresentation";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(Number(amount || 0));
const when = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

function costHeadline(claim) {
  const purpose = String(claim?.purpose || "").split("\n").map((part) => part.trim()).filter(Boolean);
  if (purpose.length) return purpose.join(" — ");
  return claim?.recipientLabel || costReference(claim);
}

const EVENT_LABELS = {
  created: "Draft created", amended: "Project Cost amended", submitted: "Submitted for review",
  amendment_requested: "Amendment requested", resubmitted: "Resubmitted", approved: "Approved",
  rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled",
  principal_authorised: "Principal authorised directly",
};

export default function AdminSiteCostDetail() {
  const { claimId } = useParams();
  const navigate = useNavigate();
  const { role, currentUserId, projects, profiles } = useAdminData();
  const {
    claims, linesForClaim, eventsByClaim, loadEvents, submitClaim, withdrawClaim,
    decideClaim, cancelClaim, refresh, status, paymentsForClaim, paymentPositionForClaim,
    recordPayment, completePaymentHistory, reversePayment, markPaid, correctHistoricalSettlement,
  } = useSiteCosts();
  const { entries: dailyEntries = [] } = useDailySiteOperations();

  const claim = claims.find((item) => item.id === claimId);
  const lines = claim ? linesForClaim(claim.id) : [];
  const events = eventsByClaim[claimId] || [];
  const payments = claim ? paymentsForClaim(claim.id) : [];
  const paymentPosition = claim ? paymentPositionForClaim(claim.id) : null;
  const paymentTruth = costPaymentTruth(claim, paymentPosition);
  const sourceEntry = claim?.dailySiteEntryId
    ? dailyEntries.find((item) => item.id === claim.dailySiteEntryId) || null
    : null;
  const possibleDuplicates = useMemo(
    () => claimId
      ? possibleDuplicateClaims(claims.find((item) => item.id === claimId), claims, linesForClaim)
      : [],
    [claimId, claims, linesForClaim]
  );
  const project = projects.find((item) => item.id === claim?.projectId);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);

  const [reason, setReason] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    amount: "", paidAt: new Date().toISOString().slice(0, 10), paymentChannel: "mpesa",
    paymentReference: "", note: "", historyComplete: false,
  });
  const [reversalPaymentId, setReversalPaymentId] = useState("");
  const [reversalReason, setReversalReason] = useState("");
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [markPaidNote, setMarkPaidNote] = useState("");
  const [correctionOpen, setCorrectionOpen] = useState(false);
  const [correctionReason, setCorrectionReason] = useState("");

  useEffect(() => { if (claimId) loadEvents(claimId).catch(() => {}); }, [claimId, loadEvents]);

  if (status === "loading" && !claim) return <p className="text-sm text-gray-600">Loading Project Cost…</p>;
  if (!claim) return (
    <section>
      <h1 className="text-2xl font-semibold">Project Cost unavailable</h1>
      <p className="mt-2 text-sm text-gray-600">It may not exist or you may not have project authority.</p>
      <Link to="/admin/site-costs" className="mt-4 inline-block text-sm font-medium text-botanique-green">Back to Project Costs</Link>
    </section>
  );

  const actorName = (id) => profileMap.get(id)
    ? profilePresentationName(profileMap.get(id), { formal: true })
    : "Authorised user";

  async function act(operation) {
    if (working) return;
    setWorking(true); setError("");
    const result = await operation();
    setWorking(false);
    if (!result.ok) setError(result.stale ? "This Project Cost changed elsewhere. The latest version has been reloaded." : result.error);
    await refresh();
    await loadEvents(claim.id, true).catch(() => {});
  }

  async function submitPayment(event) {
    event.preventDefault();
    if (working) return;
    setWorking(true); setError("");
    const result = await recordPayment(claim.id, paymentForm);
    setWorking(false);
    if (!result.ok) {
      setError(result.error || "Payment could not be recorded.");
      return;
    }
    setPaymentForm({
      amount: "", paidAt: new Date().toISOString().slice(0, 10), paymentChannel: "mpesa",
      paymentReference: "", note: "", historyComplete: false,
    });
    await refresh();
  }

  async function confirmPaymentHistory() {
    if (working) return;
    setWorking(true); setError("");
    const result = await completePaymentHistory(claim.id);
    setWorking(false);
    if (!result.ok) {
      setError(result.error || "Payment history could not be confirmed.");
      return;
    }
    await refresh();
  }

  async function confirmMarkPaid() {
    if (working) return;
    setWorking(true); setError("");
    const result = await markPaid(claim.id, markPaidNote.trim());
    setWorking(false);
    if (!result.ok) {
      setError(result.error || "This Project Cost could not be marked paid.");
      return;
    }
    setMarkPaidOpen(false);
    setMarkPaidNote("");
    await refresh();
  }

  async function confirmSettlementCorrection() {
    if (working || !correctionReason.trim()) return;
    setWorking(true); setError("");
    const result = await correctHistoricalSettlement(claim.id, correctionReason.trim());
    setWorking(false);
    if (!result.ok) {
      setError(result.error || "The historical settlement could not be corrected.");
      return;
    }
    setCorrectionOpen(false);
    setCorrectionReason("");
    await refresh();
  }

  async function confirmReversal(payment) {
    if (working || !reversalReason.trim()) return;
    setWorking(true); setError("");
    const result = await reversePayment(payment.id, payment.version, reversalReason.trim());
    setWorking(false);
    if (!result.ok) {
      setError(result.error || "Payment could not be reversed.");
      return;
    }
    setReversalPaymentId("");
    setReversalReason("");
    await refresh();
  }

  const authoritativeAmount = costTotal(claim, lines);
  // Approved, payment truth known, nothing left owing.
  const settledAndPaid = claim.lifecycle === "approved"
    && paymentTruth.paid != null && paymentTruth.balance === 0;
  // FOUNDER RULING, 12 Aug 2026. Three separate statements, never blurred:
  //   Mark paid              — it was settled; the transaction detail is unknown.
  //   Confirm payment history — the history was checked and nothing was ever paid.
  //   Record payment          — an actual transaction, with its real date and method.
  const historicalSettlement = paymentTruth.historicalSettlement || 0;
  const historyUnknown = claim.lifecycle === "approved" && paymentTruth.paid == null;
  const somethingOutstanding = claim.lifecycle === "approved"
    && (paymentTruth.balance == null || paymentTruth.balance > 0);

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <Link to="/admin/site-costs" className="text-sm font-medium text-botanique-green hover:underline">← Project Costs</Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{costHeadline(claim)}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {project?.projectName || "Project"} · {costReference(claim)} · {SITE_COST_LIFECYCLES[claim.lifecycle]}
          </p>
        </div>
        <span className="w-fit rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold">{SITE_COST_LIFECYCLES[claim.lifecycle]}</span>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-4" aria-labelledby="cost-money-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="cost-money-title" className="font-semibold">Cost and payment</h2>
            <p className="mt-1 text-[12px] text-gray-500">Approval does not mean paid. Payment is recorded separately against the Project Cost.</p>
          </div>
          {paymentTruth.paid == null && claim.lifecycle === "approved" && (
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800">Payment history not yet confirmed</span>
          )}
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4">
          <MoneyFact label="Total" value={money(authoritativeAmount)} />
          <MoneyFact label="Paid" value={paymentTruth.paid == null ? "—" : money(paymentTruth.paid)} emphasis={paymentTruth.paid > 0} />
          <MoneyFact label="Balance" value={paymentTruth.balance == null ? "—" : money(paymentTruth.balance)} emphasis={paymentTruth.balance > 0} />
        </dl>

        {payments.length > 0 && (
          <div className="mt-4 border-t border-stone-100 pt-3">
            <h3 className="text-[12px] font-semibold">Payments</h3>
            <ul className="mt-2 divide-y divide-stone-100">
              {payments.map((payment) => (
                <li key={payment.id} className="py-2.5 text-[12.5px]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span>
                      <strong>{payment.paymentNumber}</strong>
                      <span className="ml-2 text-gray-500">{payment.paidAt} · {paymentChannelLabel(payment.paymentChannel)}</span>
                      {payment.paymentReference && <span className="ml-2 text-gray-500">· {payment.paymentReference}</span>}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-semibold tabular-nums ${payment.status === "reversed" ? "text-gray-400 line-through" : ""}`}>{money(payment.amount)}</span>
                      {/* A confirmed historical settlement was derived from the
                          payments recorded at the time, so a payment cannot be
                          pulled out from under it. Withdraw the confirmation
                          first — the database refuses this too. */}
                      {role === "owner" && payment.status === "recorded" && historicalSettlement === 0 && (
                        <button
                          type="button"
                          onClick={() => { setReversalPaymentId(payment.id); setReversalReason(""); }}
                          className="min-h-9 rounded-lg border border-red-200 px-2.5 text-[11.5px] font-semibold text-red-700 hover:bg-red-50"
                        >
                          Reverse payment
                        </button>
                      )}
                    </div>
                  </div>
                  {payment.status === "reversed" && payment.reversalReason && (
                    <p className="mt-1 text-[11px] text-gray-500">Reversed: {payment.reversalReason}</p>
                  )}
                  {reversalPaymentId === payment.id && payment.status === "recorded" && (
                    <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3">
                      <label className="block text-[12px] font-medium text-red-900">
                        Why is this payment being reversed?
                        <textarea
                          rows={2}
                          value={reversalReason}
                          onChange={(event) => setReversalReason(event.target.value)}
                          className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-botanique-charcoal"
                        />
                      </label>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button type="button" disabled={working || !reversalReason.trim()} onClick={() => confirmReversal(payment)} className="min-h-9 rounded-lg bg-red-700 px-3 text-[11.5px] font-semibold text-white disabled:opacity-50">Confirm reversal</button>
                        <button type="button" disabled={working} onClick={() => { setReversalPaymentId(""); setReversalReason(""); }} className="min-h-9 rounded-lg border border-stone-300 px-3 text-[11.5px] font-medium">Keep payment</button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {historicalSettlement > 0 && (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3.5">
            <p className="text-[12.5px] font-semibold text-emerald-900">
              Settled historically · {money(historicalSettlement)}
            </p>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-emerald-900">
              The Principal confirmed that this Project Cost was fully settled before the Hub
              began tracking payments. No payment date, method or reference is claimed, because
              none was recorded at the time.
            </p>
            {payments.some((payment) => payment.status === "recorded") && (
              <p className="mt-1.5 max-w-2xl text-[12px] leading-relaxed text-emerald-900">
                The settled amount was worked out from the payments already recorded here, so those
                payments cannot be reversed while this confirmation stands. Withdraw it first.
              </p>
            )}
            {role === "owner" && (correctionOpen ? (
              <div className="mt-3">
                <label className="block text-[12px] font-medium text-emerald-900">
                  Why is this confirmation being withdrawn?
                  <textarea
                    rows={2}
                    value={correctionReason}
                    onChange={(event) => setCorrectionReason(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-botanique-charcoal"
                  />
                </label>
                <p className="mt-1.5 text-[11px] text-emerald-900">
                  This returns the cost to unconfirmed payment history. Recorded payments are kept.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" disabled={working || !correctionReason.trim()} onClick={confirmSettlementCorrection} className="min-h-9 rounded-lg bg-emerald-800 px-3 text-[11.5px] font-semibold text-white disabled:opacity-50">Withdraw confirmation</button>
                  <button type="button" disabled={working} onClick={() => { setCorrectionOpen(false); setCorrectionReason(""); }} className="min-h-9 rounded-lg border border-emerald-300 px-3 text-[11.5px] font-medium text-emerald-900">Keep it</button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setCorrectionOpen(true)} className="mt-2.5 min-h-9 rounded-lg border border-emerald-300 px-3 text-[11.5px] font-semibold text-emerald-900 hover:bg-emerald-100">
                Correct this confirmation
              </button>
            ))}
          </div>
        )}

        {role === "owner" && somethingOutstanding && (
          <div id="settlement" className="mt-4 border-t border-stone-100 pt-4">
            <h3 className="text-[13px] font-semibold">Mark paid</h3>
            {historyUnknown ? (
              <>
                <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-gray-600">
                  Use this when this Project Cost was settled but the Hub never held the payment
                  detail. Paid becomes {money(authoritativeAmount)} and Balance becomes KES 0.
                  No payment date, method or reference is invented, and the confirmation can be
                  withdrawn later.
                </p>
                {markPaidOpen ? (
                  <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
                    <label className="block text-[12px] font-medium text-gray-700">
                      Note (optional)
                      <input
                        value={markPaidNote}
                        onChange={(event) => setMarkPaidNote(event.target.value)}
                        className="mt-1 min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3"
                        placeholder="Anything worth recording about this settlement"
                      />
                    </label>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      <button type="button" disabled={working} onClick={confirmMarkPaid} className="min-h-10 rounded-lg bg-botanique-green px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">Confirm settled in full</button>
                      <button type="button" disabled={working} onClick={() => { setMarkPaidOpen(false); setMarkPaidNote(""); }} className="min-h-10 rounded-lg border border-stone-300 px-3 text-[12.5px] font-medium">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button type="button" disabled={working} onClick={() => setMarkPaidOpen(true)} className="mt-3 min-h-10 rounded-lg border border-botanique-green px-4 text-[12.5px] font-semibold text-botanique-green hover:bg-emerald-50 disabled:opacity-50">
                    Mark paid
                  </button>
                )}
              </>
            ) : (
              // The Hub already knows this cost's payment history, so whatever
              // settles the rest of it is a real transaction. Prefill the amount;
              // the date and method still have to be true.
              <>
                <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-gray-600">
                  The Hub already holds this cost's payment history, so settling the remaining{" "}
                  {money(paymentTruth.balance)} is a real payment. Its date and method are
                  required and will not be assumed.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setPaymentForm((value) => ({ ...value, amount: String(paymentTruth.balance) }));
                    const form = document.getElementById("payments");
                    // Not every environment implements scrolling.
                    if (typeof form?.scrollIntoView === "function") form.scrollIntoView({ block: "center" });
                  }}
                  className="mt-3 min-h-10 rounded-lg border border-botanique-green px-4 text-[12.5px] font-semibold text-botanique-green hover:bg-emerald-50"
                >
                  Mark paid — settle {money(paymentTruth.balance)}
                </button>
              </>
            )}
          </div>
        )}

        {role === "owner" && claim.lifecycle === "approved" && paymentTruth.paid == null && (
          <div className="mt-4 border-t border-stone-100 pt-4">
            <h3 className="text-[13px] font-semibold">Confirm payment history</h3>
            <p className="mt-1 max-w-2xl text-[12px] leading-relaxed text-gray-600">
              A different statement from Mark paid. Use this once you have checked the history and
              nothing was ever paid against this cost: it records Paid KES 0 and leaves the full
              balance outstanding, without inventing a payment. If it was in fact settled, use
              Mark paid instead.
            </p>
            <button type="button" disabled={working} onClick={confirmPaymentHistory} className="mt-3 min-h-10 rounded-lg border border-botanique-green px-4 text-[12.5px] font-semibold text-botanique-green hover:bg-emerald-50 disabled:opacity-50">
              Confirm payment history
            </button>
          </div>
        )}

        {role === "owner" && claim.lifecycle === "approved" && (paymentTruth.balance == null || paymentTruth.balance > 0) && (
          <form id="payments" onSubmit={submitPayment} className="mt-4 border-t border-stone-100 pt-4">
            <h3 className="text-[13px] font-semibold">Record payment</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Amount">
                <input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((value) => ({ ...value, amount: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" placeholder="KES" />
              </Field>
              <Field label="Date paid">
                <input required type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm((value) => ({ ...value, paidAt: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" />
              </Field>
              <Field label="Method">
                <select value={paymentForm.paymentChannel} onChange={(e) => setPaymentForm((value) => ({ ...value, paymentChannel: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3">
                  <option value="mpesa">M-Pesa</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="Reference">
                <input value={paymentForm.paymentReference} onChange={(e) => setPaymentForm((value) => ({ ...value, paymentReference: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" placeholder="Optional" />
              </Field>
            </div>
            <Field label="Note" className="mt-3">
              <input value={paymentForm.note} onChange={(e) => setPaymentForm((value) => ({ ...value, note: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" placeholder="Optional" />
            </Field>
            {paymentTruth.paid == null && (
              <label className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-[12px] text-gray-700">
                <input type="checkbox" checked={paymentForm.historyComplete} onChange={(e) => setPaymentForm((value) => ({ ...value, historyComplete: e.target.checked }))} className="mt-0.5" />
                <span><strong>This completes the payment history for this cost.</strong><br />Use this only after all earlier payments for this cost have been entered. Once confirmed, Paid and Balance become authoritative.</span>
              </label>
            )}
            <button disabled={working} className="mt-3 min-h-10 rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white disabled:opacity-50">Record payment</button>
          </form>
        )}
      </section>

      {claim.dailySiteSnapshot && (
        <section className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
          <p className="font-semibold">Daily Site Record source</p>
          <p className="mt-1">Work date {claim.dailySiteSnapshot.work_date} · source version {claim.dailySiteSourceVersion}</p>
          {claim.dailySiteEntryId && <Link to={`/admin/daily-site-operations/${claim.dailySiteEntryId}`} className="mt-2 inline-block font-semibold text-botanique-green">Open source record →</Link>}
        </section>
      )}

      {possibleDuplicates.length > 0 && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-semibold">Possible duplicate</p>
          <p className="mt-1">
            {possibleDuplicates.length === 1 ? "Another Project Cost" : `${possibleDuplicates.length} other Project Costs`} from
            this Daily Site Record {possibleDuplicates.length === 1 ? "contains" : "contain"} an identical cost line.
            Check before deciding — this may be a genuinely additional cost, or the same cost entered twice.
          </p>
          <ul className="mt-2 space-y-1">{possibleDuplicates.map((other) => <li key={other.id}><Link to={`/admin/site-costs/${other.id}`} className="font-semibold text-botanique-green">{costHeadline(other)} · {money(other.approvedTotal ?? other.submittedTotal)}</Link></li>)}</ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Project Cost summary</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Fact label="Purpose" value={claim.purpose} />
              <Fact label="Service date" value={claim.serviceDate} />
              <Fact label="Recipient" value={claim.recipientLabel} />
              <Fact label="Requested by" value={actorName(claim.requesterId)} />
              {claim.deciderId && <Fact label="Approved by" value={actorName(claim.deciderId)} />}
              <Fact label={costAmountLabel(claim)} value={money(authoritativeAmount)} strong />
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="px-5 py-4"><h2 className="font-semibold">Cost breakdown</h2></div>
            <div className="divide-y divide-stone-100">{lines.map((line) => (
              <div key={line.id} className="grid gap-1 px-5 py-4 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
                <div><p className="font-medium">{line.description}</p><p className="text-xs text-gray-500">{line.quantity} {line.unit} × {money(line.unitRate)}</p></div>
                <p className="font-semibold tabular-nums">{money(line.lineTotal)}</p>
              </div>
            ))}</div>
          </section>

          <details className="rounded-xl border border-stone-200 bg-white p-5">
            <summary className="cursor-pointer font-semibold">History</summary>
            <ol className="mt-4 space-y-4">{events.map((event) => (
              <li key={event.id} className="border-l-2 border-botanique-green pl-4 text-sm">
                <p className="font-semibold">{EVENT_LABELS[event.eventType] || event.eventType}</p>
                <p className="text-xs text-gray-500">{actorName(event.actorId)} · {when(event.occurredAt)}</p>
                {event.reason && <p className="mt-1 text-gray-700">{event.reason}</p>}
              </li>
            ))}</ol>
          </details>
        </div>

        <aside className="space-y-4">
          {(canDecideSiteCost(claim, role) || (canCancelSiteCost(claim, role) && !settledAndPaid)) && (
            <section className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Principal action</h2>
              <label className="mt-3 block text-sm font-medium">Reason or instructions<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              {canDecideSiteCost(claim, role) && (
                <div className="mt-3 grid gap-2">
                  <button disabled={working} onClick={() => act(() => decideClaim(claim.id, claim.version, "approved", reason))} className="min-h-11 rounded-lg bg-botanique-green px-3 text-sm font-semibold text-white">Approve Project Cost</button>
                  <button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "amendment_requested", reason))} className="min-h-11 rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50">Request amendment</button>
                  <button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "rejected", reason))} className="min-h-11 rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Reject Project Cost</button>
                </div>
              )}
              {canCancelSiteCost(claim, role) && !settledAndPaid && <button disabled={working || !reason.trim()} onClick={() => act(() => cancelClaim(claim.id, claim.version, reason))} className="mt-3 min-h-11 w-full rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Cancel approved Project Cost</button>}
            </section>
          )}

          {/* A Project Cost that is approved and paid in full has nothing
              outstanding, so cancellation stops being an ordinary next action.
              It stays reachable, and still needs a reason and the same database
              guards — only its prominence changes. */}
          {canCancelSiteCost(claim, role) && settledAndPaid && (
            <details className="rounded-xl border border-stone-200 bg-white p-4">
              <summary className="cursor-pointer text-[13px] font-medium text-gray-600">More actions</summary>
              <p className="mt-2 text-[12px] leading-snug text-gray-500">
                This Project Cost is approved and paid in full. Cancelling it is an exceptional correction.
              </p>
              <label className="mt-3 block text-[12.5px] font-medium">Reason for cancelling
                <textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <button
                type="button"
                disabled={working || !reason.trim()}
                onClick={() => act(() => cancelClaim(claim.id, claim.version, reason))}
                className="mt-3 min-h-10 rounded-lg border border-red-300 px-3 text-[12.5px] font-semibold text-red-700 disabled:opacity-50"
              >
                Cancel approved Project Cost
              </button>
            </details>
          )}

          {(canEditSiteCost(claim, role, currentUserId) || canSubmitSiteCost(claim, role, currentUserId) || canWithdrawSiteCost(claim, role, currentUserId)) && (
            <section className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Manager action</h2>
              <div className="mt-3 grid gap-2">
                {canEditSiteCost(claim, role, currentUserId) && <button onClick={() => navigate(`/admin/site-costs/${claim.id}/edit`)} className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-semibold">Edit Project Cost</button>}
                {canSubmitSiteCost(claim, role, currentUserId) && (sourceEntry && !canSubmitCostFromDailySite(sourceEntry)
                  ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">{costSubmissionBlockedReason(sourceEntry)}</p>
                  : <button disabled={working} onClick={() => act(() => submitClaim(claim.id, claim.version))} className="min-h-11 rounded-lg bg-botanique-green px-3 text-sm font-semibold text-white">{claim.lifecycle === "draft" ? "Submit for review" : "Resubmit for review"}</button>)}
                {canWithdrawSiteCost(claim, role, currentUserId) && <button disabled={working} onClick={() => act(() => withdrawClaim(claim.id, claim.version, reason))} className="min-h-11 rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700">Withdraw Project Cost</button>}
              </div>
            </section>
          )}
        </aside>
      </div>
    </section>
  );
}

function MoneyFact({ label, value, emphasis = false }) {
  return <div><dt className="text-[11px] text-gray-500">{label}</dt><dd className={`mt-1 text-lg font-semibold tabular-nums ${emphasis ? "text-botanique-green" : ""}`}>{value}</dd></div>;
}
function Fact({ label, value, strong = false }) {
  return <div><dt className="text-gray-500">{label}</dt><dd className={`mt-1 ${strong ? "text-lg font-semibold" : ""}`}>{value}</dd></div>;
}
function Field({ label, children, className = "" }) {
  return <label className={`block text-[12px] font-medium text-gray-600 ${className}`}>{label}<span className="mt-1 block">{children}</span></label>;
}
