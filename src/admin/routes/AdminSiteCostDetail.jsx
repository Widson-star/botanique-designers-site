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
import { costPaymentTruth } from "../utils/costPaymentTruth";
import { costReference } from "../utils/costReference";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(Number(amount || 0));
const when = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";
const EVENT_LABELS = {
  created: "Draft created", amended: "Cost amended", submitted: "Submitted for review",
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
    recordPayment,
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
    () => claimId ? possibleDuplicateClaims(claim, claims, linesForClaim) : [],
    [claimId, claim, claims, linesForClaim]
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

  useEffect(() => { if (claimId) loadEvents(claimId).catch(() => {}); }, [claimId, loadEvents]);

  if (status === "loading" && !claim) return <p className="text-sm text-gray-600">Loading project cost…</p>;
  if (!claim) return (
    <section>
      <h1 className="text-2xl font-semibold">Project cost unavailable</h1>
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
    if (!result.ok) setError(result.stale ? "This cost changed elsewhere. The latest version has been reloaded." : result.error);
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

  const authoritativeAmount = Number(claim.approvedTotal ?? claim.submittedTotal ?? lines.reduce((sum, line) => sum + line.lineTotal, 0));

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      <Link to="/admin/site-costs" className="text-sm font-medium text-botanique-green hover:underline">← Project Costs</Link>

      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold tabular-nums text-botanique-green">{costReference(claim)}</p>
          <h1 className="mt-1 text-2xl font-semibold">{project?.projectName || "Project"}</h1>
          <p className="mt-1 text-sm text-gray-600">{claim.recipientLabel} · {claim.category.replaceAll("_", " ")} · {claim.serviceDate}</p>
        </div>
        <span className="w-fit rounded-full bg-stone-100 px-3 py-1.5 text-sm font-semibold">{SITE_COST_LIFECYCLES[claim.lifecycle]}</span>
      </header>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-4" aria-labelledby="cost-money-title">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="cost-money-title" className="font-semibold">Cost and payment</h2>
            <p className="mt-1 text-[12px] text-gray-500">Approval and payment are separate facts.</p>
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
                <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[12.5px]">
                  <span>
                    <strong>{payment.paymentNumber}</strong>
                    <span className="ml-2 text-gray-500">{payment.paidAt} · {payment.paymentChannel.replaceAll("_", " ")}</span>
                    {payment.paymentReference && <span className="ml-2 text-gray-500">· {payment.paymentReference}</span>}
                  </span>
                  <span className={`font-semibold tabular-nums ${payment.status === "reversed" ? "text-gray-400 line-through" : ""}`}>{money(payment.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {role === "owner" && claim.lifecycle === "approved" && (paymentTruth.balance == null || paymentTruth.balance > 0) && (
          <form id="payments" onSubmit={submitPayment} className="mt-4 border-t border-stone-100 pt-4">
            <h3 className="text-[13px] font-semibold">Record payment</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Amount">
                <input required type="number" min="0.01" step="0.01" value={paymentForm.amount} onChange={(e) => setPaymentForm((v) => ({ ...v, amount: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" placeholder="KES" />
              </Field>
              <Field label="Date paid">
                <input required type="date" value={paymentForm.paidAt} onChange={(e) => setPaymentForm((v) => ({ ...v, paidAt: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" />
              </Field>
              <Field label="Method">
                <select value={paymentForm.paymentChannel} onChange={(e) => setPaymentForm((v) => ({ ...v, paymentChannel: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3">
                  <option value="mpesa">M-Pesa</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option>
                </select>
              </Field>
              <Field label="Reference">
                <input value={paymentForm.paymentReference} onChange={(e) => setPaymentForm((v) => ({ ...v, paymentReference: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" placeholder="Optional" />
              </Field>
            </div>
            <Field label="Note" className="mt-3">
              <input value={paymentForm.note} onChange={(e) => setPaymentForm((v) => ({ ...v, note: e.target.value }))} className="min-h-10 w-full rounded-lg border border-stone-300 px-3" placeholder="Optional" />
            </Field>
            {paymentTruth.paid == null && (
              <label className="mt-3 flex items-start gap-2 rounded-lg bg-stone-50 p-3 text-[12px] text-gray-700">
                <input type="checkbox" checked={paymentForm.historyComplete} onChange={(e) => setPaymentForm((v) => ({ ...v, historyComplete: e.target.checked }))} className="mt-0.5" />
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
          <p className="font-semibold">Check similar cost</p>
          <p className="mt-1">Another cost from this Daily Site Record contains an identical line. Review it before deciding whether this is genuinely additional.</p>
          <ul className="mt-2 space-y-1">{possibleDuplicates.map((other) => <li key={other.id}><Link to={`/admin/site-costs/${other.id}`} className="font-semibold text-botanique-green">{other.recipientLabel} · {money(other.approvedTotal ?? other.submittedTotal)}</Link></li>)}</ul>
        </section>
      )}

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-5">
            <h2 className="font-semibold">Cost details</h2>
            <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
              <Fact label="Purpose" value={claim.purpose} />
              <Fact label="Service date" value={claim.serviceDate} />
              <Fact label="Recipient" value={claim.recipientLabel} />
              <Fact label="Requested by" value={actorName(claim.requesterId)} />
              {claim.deciderId && <Fact label="Approved by" value={actorName(claim.deciderId)} />}
              <Fact label="Approved amount" value={money(authoritativeAmount)} strong />
            </dl>
          </section>

          <section className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="px-5 py-4"><h2 className="font-semibold">Cost lines</h2></div>
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
          {(canDecideSiteCost(claim, role) || canCancelSiteCost(claim, role)) && (
            <section className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Principal action</h2>
              <label className="mt-3 block text-sm font-medium">Reason or instructions<textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2.5" /></label>
              {canDecideSiteCost(claim, role) && (
                <div className="mt-3 grid gap-2">
                  <button disabled={working} onClick={() => act(() => decideClaim(claim.id, claim.version, "approved", reason))} className="min-h-11 rounded-lg bg-botanique-green px-3 text-sm font-semibold text-white">Approve cost</button>
                  <button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "amendment_requested", reason))} className="min-h-11 rounded-lg border border-amber-300 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50">Request correction</button>
                  <button disabled={working || !reason.trim()} onClick={() => act(() => decideClaim(claim.id, claim.version, "rejected", reason))} className="min-h-11 rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Reject cost</button>
                </div>
              )}
              {canCancelSiteCost(claim, role) && <button disabled={working || !reason.trim()} onClick={() => act(() => cancelClaim(claim.id, claim.version, reason))} className="mt-3 min-h-11 w-full rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50">Cancel approved cost</button>}
            </section>
          )}

          {(canEditSiteCost(claim, role, currentUserId) || canSubmitSiteCost(claim, role, currentUserId) || canWithdrawSiteCost(claim, role, currentUserId)) && (
            <section className="rounded-xl border border-stone-200 bg-white p-5">
              <h2 className="font-semibold">Manager action</h2>
              <div className="mt-3 grid gap-2">
                {canEditSiteCost(claim, role, currentUserId) && <button onClick={() => navigate(`/admin/site-costs/${claim.id}/edit`)} className="min-h-11 rounded-lg border border-stone-300 px-3 text-sm font-semibold">Edit cost</button>}
                {canSubmitSiteCost(claim, role, currentUserId) && (sourceEntry && !canSubmitCostFromDailySite(sourceEntry)
                  ? <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">{costSubmissionBlockedReason(sourceEntry)}</p>
                  : <button disabled={working} onClick={() => act(() => submitClaim(claim.id, claim.version))} className="min-h-11 rounded-lg bg-botanique-green px-3 text-sm font-semibold text-white">{claim.lifecycle === "draft" ? "Submit for review" : "Resubmit for review"}</button>)}
                {canWithdrawSiteCost(claim, role, currentUserId) && <button disabled={working} onClick={() => act(() => withdrawClaim(claim.id, claim.version, reason))} className="min-h-11 rounded-lg border border-red-300 px-3 text-sm font-semibold text-red-700">Withdraw cost</button>}
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