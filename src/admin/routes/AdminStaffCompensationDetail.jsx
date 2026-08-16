import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import { useStaffCompensation } from "../context/staffCompensation";
import { Chip } from "../components/ui/Surfaces";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2 }).format(Number(amount || 0));
const shortDate = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "—";
const when = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
const labels = { draft: "Draft", awaiting_review: "Awaiting review", amendment_requested: "Amendment requested", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled" };
const tones = { draft: "neutral", awaiting_review: "decision", amendment_requested: "waiting", approved: "settled", rejected: "attention", withdrawn: "neutral", cancelled: "neutral" };
const eventLabels = { created: "Draft created", amended: "Record amended", submitted: "Submitted for review", amendment_requested: "Amendment requested", resubmitted: "Resubmitted", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled", principal_authorised: "Principal authorised directly", payment_history_confirmed: "Historical payment position confirmed", legacy_imported: "Imported from Project Costs" };
const paymentLabels = { unpaid: "Unpaid", part_paid: "Part-paid", paid: "Paid", payment_history_unknown: "Payment history unconfirmed" };
const methodLabels = { mpesa: "M-Pesa", bank_transfer: "Bank transfer", cash: "Cash", other: "Other" };
const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });

export default function AdminStaffCompensationDetail() {
  const { compensationId } = useParams();
  const location = useLocation();
  const { role, currentUserId, projects, profiles } = useAdminData();
  const { people } = usePeople();
  const { compensations, eventsByCompensation, loadEvents, submitRecord, withdrawRecord, cancelRecord, paymentsForCompensation, paymentPositionForCompensation, recordPayment, reversePayment, confirmPaymentHistory, refresh, status } = useStaffCompensation();
  const record = compensations.find((item) => item.id === compensationId);
  const person = people.find((item) => item.id === record?.personId);
  const project = projects.find((item) => item.id === record?.projectId);
  const payments = record ? paymentsForCompensation(record.id) : [];
  const position = record ? paymentPositionForCompensation(record.id) : null;
  const events = eventsByCompensation[compensationId] || [];
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");
  const [historyReason, setHistoryReason] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [payment, setPayment] = useState({ amount: "", paidAt: today(), paymentChannel: "mpesa", paymentReference: "", note: "" });
  const [reverseId, setReverseId] = useState("");
  const [reverseReason, setReverseReason] = useState("");

  useEffect(() => { if (compensationId) loadEvents(compensationId).catch(() => {}); }, [compensationId, loadEvents]);
  useEffect(() => { if (location.hash === "#payment-history") setHistoryOpen(true); }, [location.hash]);

  if (status === "loading" && !record) return <p className="text-sm text-gray-600">Loading Staff Pay…</p>;
  if (!record) return <section><h1 className="text-xl font-semibold">Staff Pay unavailable</h1><Link to="/admin/finance/staff-compensation" className="mt-3 inline-block text-sm font-semibold text-botanique-green">Back to Staff Pay</Link></section>;

  const ownRequest = record.requesterId === currentUserId;
  const editable = role === "manager" && ownRequest && ["draft", "amendment_requested"].includes(record.lifecycle);
  const submittable = editable;
  const withdrawable = role === "manager" && ownRequest && record.lifecycle === "awaiting_review";
  const unknownHistory = record.lifecycle === "approved" && position?.paymentStatus === "payment_history_unknown";
  const payable = role === "owner" && record.lifecycle === "approved" && !unknownHistory && Number(position?.balanceAmount || 0) > 0;
  const cancellable = role === "owner" && record.lifecycle === "approved" && !unknownHistory && Number(position?.paidAmount || 0) === 0;

  async function act(operation) {
    if (working) return false;
    setWorking(true); setError("");
    const result = await operation();
    setWorking(false);
    if (!result.ok) { setError(result.stale ? "This record changed elsewhere. The latest values have been reloaded." : result.error); return false; }
    await refresh(); await loadEvents(record.id, true).catch(() => {}); return true;
  }
  async function submitPayment(event) {
    event.preventDefault();
    const ok = await act(() => recordPayment(record.id, payment));
    if (ok) setPayment({ amount: "", paidAt: today(), paymentChannel: "mpesa", paymentReference: "", note: "" });
  }
  async function reverse(item) {
    if (!reverseReason.trim()) return;
    const ok = await act(() => reversePayment(item.id, item.version, reverseReason.trim()));
    if (ok) { setReverseId(""); setReverseReason(""); }
  }
  async function confirmHistory() {
    if (!historyReason.trim()) return;
    const ok = await act(() => confirmPaymentHistory(record.id, record.version, historyReason.trim()));
    if (ok) { setHistoryReason(""); setHistoryOpen(false); }
  }

  return <section className="mx-auto max-w-6xl space-y-4">
    <Link to="/admin/finance/staff-compensation" className="text-sm font-semibold text-botanique-green hover:underline">← Staff Pay</Link>
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance · Staff Pay</p><h1 className="mt-1 text-2xl font-semibold">{person?.fullName || "Person"}</h1><p className="mt-1 text-[13px] text-gray-600">{shortDate(record.serviceDate)} · {typeLabel(record.compensationType)}{project ? ` · ${project.projectName}` : " · No Project context"}</p></div><Chip tone={tones[record.lifecycle]}>{labels[record.lifecycle]}</Chip></header>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">{error}</p>}

    {unknownHistory && <section id="payment-history" className="rounded-xl border border-sky-200 bg-sky-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="max-w-3xl"><h2 className="text-[13.5px] font-semibold text-sky-950">Historical payment position not yet confirmed</h2><p className="mt-1 text-[12px] leading-relaxed text-sky-900">This Staff Pay record came from the older Project Costs workflow. The approved amount is known, but the Hub does not yet know how much was already paid. Paid and Balance therefore stay blank until the old payment evidence is checked.</p></div>{role === "owner" && !historyOpen && <button type="button" onClick={()=>setHistoryOpen(true)} className="min-h-9 rounded-lg border border-sky-300 bg-white px-3 text-[11.5px] font-semibold text-sky-900">Resolve payment history</button>}</div>{historyOpen && <div className="mt-3 border-t border-sky-200 pt-3"><label className="block text-[12px] font-medium text-sky-950">Confirmation note<textarea rows={2} value={historyReason} onChange={(e)=>setHistoryReason(e.target.value)} className="mt-1 w-full rounded-lg border border-sky-300 bg-white px-3 py-2 text-botanique-charcoal" placeholder="Record what was checked before marking the historical payment position as known."/></label><p className="mt-1.5 text-[11px] text-sky-900">Only confirm after checking the old payment evidence. This action does not create a payment transaction.</p><div className="mt-2 flex gap-2"><button disabled={working || !historyReason.trim()} onClick={confirmHistory} className="min-h-9 rounded-lg bg-botanique-green px-3 text-[11.5px] font-semibold text-white disabled:opacity-50">Confirm history reviewed</button><button onClick={()=>{setHistoryOpen(false);setHistoryReason("");}} className="min-h-9 rounded-lg border border-sky-300 bg-white px-3 text-[11.5px] font-semibold">Not yet</button></div></div>}</section>}

    <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[14px] font-semibold">Position</h2><p className="mt-1 text-[12px] text-gray-500">Approval confirms the amount due. Payment is recorded separately here.</p></div>{position?.paymentStatus && record.lifecycle === "approved" && <Chip tone={position.paymentStatus === "paid" ? "settled" : position.paymentStatus === "part_paid" ? "waiting" : "neutral"}>{paymentLabels[position.paymentStatus] || position.paymentStatus}</Chip>}</div><dl className="mt-4 grid grid-cols-3 gap-3 border-t border-stone-100 pt-4"><Fact label={record.lifecycle === "approved" ? "Approved" : "Submitted"} value={money(record.lifecycle === "approved" ? record.approvedAmount : record.submittedAmount)}/><Fact label="Paid" value={unknownHistory || position?.paidAmount == null ? "—" : money(position.paidAmount)}/><Fact label="Balance" value={unknownHistory || position?.balanceAmount == null ? "—" : money(position.balanceAmount)} attention={!unknownHistory && Number(position?.balanceAmount || 0) > 0}/></dl></section>

    <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-xl border border-stone-200 bg-white p-4"><h2 className="text-[14px] font-semibold">Staff Pay record</h2><dl className="mt-3 divide-y divide-stone-100 text-[12.5px]"><Row label="Person" value={person?.fullName || "Person"}/><Row label="Type" value={typeLabel(record.compensationType)}/><Row label="Date" value={shortDate(record.serviceDate)}/><Row label="Project" value={project?.projectName || "None"}/><Row label={record.directAuthorityActorId ? "Authorised by" : "Requester"} value={profileName(profileMap.get(record.directAuthorityActorId || record.requesterId))}/><Row label="Round" value={String(record.requestRound)}/>{record.legacySourceClaimId && <Row label="Legacy source" value={<Link to={`/admin/site-costs/${record.legacySourceClaimId}`} className="font-semibold text-botanique-green hover:underline">View original Project Cost</Link>}/>}</dl><div className="mt-4 border-t border-stone-100 pt-3"><p className="text-[11.5px] font-medium text-gray-500">Purpose</p><p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-botanique-charcoal">{record.description}</p></div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-stone-100 pt-4">{editable && <Link to={`/admin/finance/staff-compensation/${record.id}/edit`} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3.5 text-[12.5px] font-semibold">Edit</Link>}{submittable && <button disabled={working} onClick={()=>act(()=>submitRecord(record.id,record.version))} className="min-h-10 rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white disabled:opacity-50">{record.lifecycle === "amendment_requested" ? "Resubmit" : "Submit for approval"}</button>}{record.lifecycle === "awaiting_review" && role === "owner" && <Link to={`/admin/approvals/staff-compensation:${record.id}`} className="inline-flex min-h-10 items-center rounded-lg bg-botanique-green px-3.5 text-[12.5px] font-semibold text-white">Review in Approvals</Link>}</div>
        {withdrawable && <div className="mt-3 rounded-lg bg-stone-50 p-3"><label className="text-[12px] font-medium text-gray-600">Withdraw reason (optional)<textarea rows={2} value={withdrawReason} onChange={(e)=>setWithdrawReason(e.target.value)} className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2"/></label><button disabled={working} onClick={()=>act(()=>withdrawRecord(record.id,record.version,withdrawReason))} className="mt-2 min-h-9 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold">Withdraw request</button></div>}
        {cancellable && <div className="mt-3 rounded-lg border border-red-100 bg-red-50 p-3"><label className="text-[12px] font-medium text-red-900">Cancellation reason<textarea rows={2} value={cancelReason} onChange={(e)=>setCancelReason(e.target.value)} className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-botanique-charcoal"/></label><button disabled={working || !cancelReason.trim()} onClick={()=>act(()=>cancelRecord(record.id,record.version,cancelReason.trim()))} className="mt-2 min-h-9 rounded-lg bg-red-700 px-3 text-[11.5px] font-semibold text-white disabled:opacity-50">Cancel approved record</button></div>}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4"><h2 className="text-[14px] font-semibold">History</h2>{events.length ? <ol className="mt-3 space-y-3">{events.map((event)=><li key={event.id} className="border-l-2 border-stone-200 pl-3"><p className="text-[12.5px] font-semibold">{eventLabels[event.eventType] || event.eventType}</p><p className="mt-0.5 text-[11px] text-gray-500">{when(event.occurredAt)} · {profileName(profileMap.get(event.actorId))}</p>{event.reason && <p className="mt-1 text-[12px] text-gray-600">{event.reason}</p>}</li>)}</ol> : <p className="mt-3 text-[12.5px] text-gray-500">No history loaded yet.</p>}</section>
    </div>

    {record.lifecycle === "approved" && <section id="payments" className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-[14px] font-semibold">Payments</h2><p className="mt-1 text-[12px] text-gray-500">Payments belong to this Staff Pay record. Reversals preserve the original transaction history.</p></div></div>{payments.length ? <ul className="mt-3 divide-y divide-stone-100">{payments.map((item)=><li key={item.id} className="py-3"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[12.5px] font-semibold">{item.paymentNumber}</p><p className="mt-0.5 text-[11.5px] text-gray-500">{shortDate(item.paidAt)} · {methodLabels[item.paymentChannel] || item.paymentChannel}{item.paymentReference ? ` · ${item.paymentReference}` : ""}</p>{item.note && <p className="mt-1 text-[12px] text-gray-600">{item.note}</p>}{item.status === "reversed" && <p className="mt-1 text-[11.5px] text-red-700">Reversed: {item.reversalReason}</p>}</div><div className="text-right"><p className={`text-[13px] font-semibold tabular-nums ${item.status === "reversed" ? "text-gray-400 line-through" : ""}`}>{money(item.amount)}</p>{role === "owner" && item.status === "recorded" && <button onClick={()=>{setReverseId(item.id);setReverseReason("");}} className="mt-1 min-h-8 text-[11.5px] font-semibold text-red-700">Reverse</button>}</div></div>{reverseId===item.id && item.status === "recorded" && <div className="mt-2 rounded-lg border border-red-100 bg-red-50 p-3"><label className="text-[12px] font-medium text-red-900">Reversal reason<textarea rows={2} value={reverseReason} onChange={(e)=>setReverseReason(e.target.value)} className="mt-1 w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-botanique-charcoal"/></label><div className="mt-2 flex gap-2"><button disabled={working || !reverseReason.trim()} onClick={()=>reverse(item)} className="min-h-9 rounded-lg bg-red-700 px-3 text-[11.5px] font-semibold text-white disabled:opacity-50">Confirm reversal</button><button onClick={()=>{setReverseId("");setReverseReason("");}} className="min-h-9 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold">Keep payment</button></div></div>}</li>)}</ul> : <p className="mt-3 text-[12.5px] text-gray-500">{unknownHistory ? "Payment history has not yet been confirmed for this imported record." : "No payment has been recorded yet."}</p>}
      {payable && <form onSubmit={submitPayment} className="mt-4 grid gap-3 rounded-lg bg-stone-50 p-3 sm:grid-cols-2"><h3 className="sm:col-span-2 text-[12.5px] font-semibold">Record payment</h3><Field label="Amount (KES)"><input type="number" min="0.01" max={position.balanceAmount} step="0.01" value={payment.amount} onChange={(e)=>setPayment({...payment,amount:e.target.value})} className={input}/></Field><Field label="Date"><input type="date" max={today()} value={payment.paidAt} onChange={(e)=>setPayment({...payment,paidAt:e.target.value})} className={input}/></Field><Field label="Method"><select value={payment.paymentChannel} onChange={(e)=>setPayment({...payment,paymentChannel:e.target.value})} className={input}><option value="mpesa">M-Pesa</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option></select></Field><Field label="Reference (optional)"><input value={payment.paymentReference} onChange={(e)=>setPayment({...payment,paymentReference:e.target.value})} className={input}/></Field><Field label="Note (optional)"><textarea rows={2} value={payment.note} onChange={(e)=>setPayment({...payment,note:e.target.value})} className={input}/></Field><div className="flex items-end justify-end"><button disabled={working || !Number(payment.amount)} className="min-h-10 rounded-lg bg-botanique-green px-4 text-[12.5px] font-semibold text-white disabled:opacity-50">Record payment</button></div></form>}
    </section>}
  </section>;
}

const input = "mt-1 block min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] text-botanique-charcoal";
function Field({label,children}){return <label className="block text-[12px] font-medium text-gray-600">{label}{children}</label>}
function Fact({label,value,attention}){return <div><dt className="text-[11.5px] text-gray-500">{label}</dt><dd className={`mt-1 text-[18px] font-semibold tabular-nums ${attention ? "text-sky-800" : "text-botanique-charcoal"}`}>{value}</dd></div>}
function Row({label,value}){return <div className="flex min-h-10 items-center justify-between gap-4 py-2"><dt className="text-gray-500">{label}</dt><dd className="text-right font-medium text-botanique-charcoal">{value}</dd></div>}
function typeLabel(value){return ({compensation:"Pay",allowance:"Allowance",bonus:"Bonus",other:"Other"})[value] || value}
function profileName(profile){return profile?.full_name || profile?.fullName || profile?.display_name || profile?.displayName || "Authorised user"}
