import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import { useStaffCompensation } from "../context/staffCompensation";
import { Chip, Disc, Glyph } from "../components/ui/Surfaces";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(Number(amount || 0));
const date = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
  : "—";
const labels = {
  draft: "Draft", awaiting_review: "Awaiting review", amendment_requested: "Amendment requested",
  approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled",
};
const tones = {
  draft: "neutral", awaiting_review: "decision", amendment_requested: "waiting",
  approved: "settled", rejected: "attention", withdrawn: "neutral", cancelled: "neutral",
};
const typeLabels = { compensation: "Pay", allowance: "Allowance", bonus: "Bonus", other: "Other" };
const methodLabels = { mpesa: "M-Pesa", bank_transfer: "Bank transfer", cash: "Cash", other: "Other" };

export default function AdminStaffCompensation() {
  const { role, currentUserId, projects } = useAdminData();
  const { people } = usePeople();
  const { compensations, payments, paymentPositionForCompensation, status, error } = useStaffCompensation();
  const [personId, setPersonId] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [openMenu, setOpenMenu] = useState(null);

  const personMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const visible = compensations.filter((item) =>
    (personId === "all" || item.personId === personId) &&
    (lifecycle === "all" || item.lifecycle === lifecycle) &&
    (projectId === "all" || item.projectId === projectId));

  const approved = compensations.filter((item) => item.lifecycle === "approved");
  const historyUnknown = approved.filter((item) => paymentPositionForCompensation(item.id)?.paymentStatus === "payment_history_unknown");
  const knownApproved = approved.filter((item) => paymentPositionForCompensation(item.id)?.paymentStatus !== "payment_history_unknown");
  const totalApproved = approved.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
  const totalPaid = knownApproved.reduce((sum, item) => sum + Number(paymentPositionForCompensation(item.id)?.paidAmount || 0), 0);
  const outstanding = knownApproved.reduce((sum, item) => sum + Number(paymentPositionForCompensation(item.id)?.balanceAmount || 0), 0);
  const awaiting = compensations.filter((item) => item.lifecycle === "awaiting_review");
  const partPaid = approved.filter((item) => paymentPositionForCompensation(item.id)?.paymentStatus === "part_paid");
  const drafts = compensations.filter((item) => item.lifecycle === "draft");
  const hasHistoricalSettlement = knownApproved.some((item) => Number(paymentPositionForCompensation(item.id)?.historicalPaidAmount || 0) > 0);

  const visibleApproved = visible.filter((item) => item.lifecycle === "approved");
  const visibleUnknown = visibleApproved.filter((item) => paymentPositionForCompensation(item.id)?.paymentStatus === "payment_history_unknown");
  const visibleApprovedTotal = visibleApproved.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
  const visiblePaidTotal = visibleApproved.reduce((sum, item) => {
    const position = paymentPositionForCompensation(item.id);
    return sum + (position?.paidAmount == null ? 0 : Number(position.paidAmount));
  }, 0);
  const visibleBalanceTotal = visibleApproved.reduce((sum, item) => {
    const position = paymentPositionForCompensation(item.id);
    return sum + (position?.balanceAmount == null ? 0 : Number(position.balanceAmount));
  }, 0);

  const recordedPayments = payments
    .filter((item) => item.status === "recorded")
    .slice()
    .sort((a, b) => String(b.paidAt).localeCompare(String(a.paidAt)))
    .slice(0, 3)
    .map((payment) => {
      const pay = compensations.find((item) => item.id === payment.compensationId);
      return { payment, pay, person: personMap.get(pay?.personId), project: projectMap.get(pay?.projectId) };
    });

  function resetFilters() {
    setPersonId("all"); setLifecycle("all"); setProjectId("all");
  }

  return (
    <section className="space-y-4" onClick={() => setOpenMenu(null)}>
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p>
          <h1 className="mt-1 text-[24px] font-semibold leading-tight">Staff Pay</h1>
          <p className="mt-0.5 max-w-3xl text-[13px] text-gray-600">Amounts earned and payable to staff. Project context is optional; approval and payment remain separate.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link to="/admin/finance/staff-compensation/new" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-botanique-green px-5 text-[13px] font-semibold text-white hover:bg-botanique-dark"><span className="text-lg leading-none">+</span> New staff pay</Link>
          <Link to="/admin/approvals" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-[12.5px] font-semibold text-botanique-charcoal hover:bg-stone-50"><Glyph name="check" /> Open Approvals <span aria-hidden="true">→</span></Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon="check" tone="settled" label="Approved" value={money(totalApproved)} hint={`${approved.length} ${approved.length === 1 ? "record" : "records"}`} />
        <Metric icon="wallet" tone="brand" label="Paid" value={knownApproved.length ? money(totalPaid) : "—"} hint={knownApproved.length ? "Confirmed paid position" : historyUnknown.length ? "History to confirm" : "No approved records"} />
        <Metric icon="balance" tone="waiting" label="Outstanding" value={knownApproved.length ? money(outstanding) : "—"} hint={historyUnknown.length ? `${historyUnknown.length} historical ${historyUnknown.length === 1 ? "record" : "records"} unconfirmed` : "Approved balance"} />
        <Metric icon="people" tone="decision" label="Awaiting decision" value={String(awaiting.length)} hint={`${awaiting.length} ${awaiting.length === 1 ? "record" : "records"}`} />
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0 overflow-visible rounded-xl border border-stone-200 bg-white">
          <div className="grid gap-3 border-b border-stone-100 p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
            <Filter label="Person" value={personId} onChange={setPersonId}><option value="all">All people</option>{people.slice().sort((a,b)=>a.fullName.localeCompare(b.fullName)).map((person)=><option key={person.id} value={person.id}>{person.fullName}</option>)}</Filter>
            <Filter label="Status" value={lifecycle} onChange={setLifecycle}><option value="all">All statuses</option>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</Filter>
            <Filter label="Project (optional)" value={projectId} onChange={setProjectId}><option value="all">All projects</option>{projects.slice().sort((a,b)=>a.projectName.localeCompare(b.projectName)).map((project)=><option key={project.id} value={project.id}>{project.projectName}</option>)}</Filter>
            <div className="flex items-end gap-2"><button type="button" onClick={resetFilters} className="min-h-10 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-gray-600 hover:bg-stone-50">Reset filters</button><button type="button" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-stone-300 px-3 text-[11.5px] font-semibold text-gray-600"><Glyph name="filter" className="h-3.5 w-3.5" /> Filters</button></div>
          </div>

          {status === "loading" && <p className="p-4 text-[13px] text-gray-600">Loading Staff Pay…</p>}
          {error && <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p>}
          {status !== "loading" && !visible.length && <div className="m-4 flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4"><Disc name="people" tone="unbuilt" size="h-9 w-9"/><p className="text-[12.5px] text-gray-600">{compensations.length ? "No staff pay matches these filters." : "No Staff Pay has been recorded yet."}</p></div>}

          {visible.length > 0 && <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[12.5px]">
                <thead className="border-b border-stone-100 bg-[#fbfbfa] text-[10.5px] uppercase tracking-wide text-gray-500"><tr>{['#','Date','Person','Type','Project','Status'].map((heading)=><th key={heading} className="px-3.5 py-3 font-medium">{heading}</th>)}{['Total','Paid','Balance','Action'].map((heading)=><th key={heading} className="px-3.5 py-3 text-right font-medium">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-stone-100">{visible.map((item,index)=>{
                  const position = paymentPositionForCompensation(item.id);
                  const person = personMap.get(item.personId);
                  const unknown = position?.paymentStatus === "payment_history_unknown";
                  const dropUp = index >= Math.max(visible.length - 2, 1);
                  return <tr key={item.id} className="hover:bg-[#fbfbfa]"><td className="px-3.5 py-3 text-gray-500">{index+1}</td><td className="whitespace-nowrap px-3.5 py-3 text-gray-600">{date(item.serviceDate)}</td><td className="px-3.5 py-3 font-medium"><Link to={`/admin/finance/staff-compensation/${item.id}`} className="text-botanique-green hover:underline">{person?.fullName || "Person"}</Link></td><td className="px-3.5 py-3 text-gray-600">{typeLabels[item.compensationType] || "Other"}</td><td className="max-w-[180px] px-3.5 py-3 text-gray-600"><span className="line-clamp-2">{item.projectId ? projectMap.get(item.projectId)?.projectName || "Project" : "—"}</span></td><td className="px-3.5 py-3"><Chip tone={tones[item.lifecycle]}>{labels[item.lifecycle]}</Chip></td><td className="whitespace-nowrap px-3.5 py-3 text-right font-semibold tabular-nums">{money(item.lifecycle === "approved" ? item.approvedAmount : item.submittedAmount)}</td><td className="whitespace-nowrap px-3.5 py-3 text-right tabular-nums text-gray-600">{unknown || position?.paidAmount == null ? "—" : money(position.paidAmount)}</td><td className="whitespace-nowrap px-3.5 py-3 text-right font-semibold tabular-nums">{unknown || position?.balanceAmount == null ? "—" : money(position.balanceAmount)}</td><td className="px-3.5 py-3 text-right"><PayActionMenu item={item} position={position} role={role} currentUserId={currentUserId} open={openMenu===item.id} dropUp={dropUp} onToggle={()=>setOpenMenu(openMenu===item.id?null:item.id)}/></td></tr>;
                })}</tbody>
              </table>
            </div>

            <ul className="space-y-2.5 p-3 md:hidden">{visible.map((item,index)=>{
              const position = paymentPositionForCompensation(item.id); const person = personMap.get(item.personId); const unknown = position?.paymentStatus === "payment_history_unknown";
              return <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/admin/finance/staff-compensation/${item.id}`} className="font-semibold text-botanique-green hover:underline">{person?.fullName || "Person"}</Link><p className="mt-1 text-[11.5px] text-gray-500">#{index+1} · {date(item.serviceDate)} · {typeLabels[item.compensationType]}</p></div><Chip tone={tones[item.lifecycle]}>{labels[item.lifecycle]}</Chip></div><p className="mt-2 line-clamp-2 text-[12px] text-gray-600">{item.projectId ? projectMap.get(item.projectId)?.projectName || "Project" : "No Project context"}</p><dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-stone-100 pt-2.5 text-[11.5px]"><div><dt className="text-gray-500">Total</dt><dd className="font-semibold tabular-nums">{money(item.lifecycle === "approved" ? item.approvedAmount : item.submittedAmount)}</dd></div><div><dt className="text-gray-500">Paid</dt><dd>{unknown || position?.paidAmount == null ? "—" : money(position.paidAmount)}</dd></div><div><dt className="text-gray-500">Balance</dt><dd>{unknown || position?.balanceAmount == null ? "—" : money(position.balanceAmount)}</dd></div></dl><div className="mt-2.5 flex justify-end"><PayActionMenu item={item} position={position} role={role} currentUserId={currentUserId} open={openMenu===item.id} dropUp={index===visible.length-1} onToggle={()=>setOpenMenu(openMenu===item.id?null:item.id)}/></div></li>;
            })}</ul>

            <div className="border-t border-stone-100 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-500">
                <span>Showing 1 to {visible.length} of {visible.length} {visible.length===1?"record":"records"}</span>
                <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-botanique-charcoal">
                  <span>Approved <strong className="tabular-nums">{money(visibleApprovedTotal)}</strong></span>
                  <span>Paid <strong className="tabular-nums">{visibleUnknown.length ? "—" : money(visiblePaidTotal)}</strong></span>
                  <span>Balance <strong className="tabular-nums">{visibleUnknown.length ? "—" : money(visibleBalanceTotal)}</strong></span>
                </div>
                <div className="flex items-center gap-2"><button disabled className="h-8 w-8 rounded-lg border border-stone-200 text-gray-300">‹</button><span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-botanique-green px-2 font-semibold text-botanique-green">1</span><button disabled className="h-8 w-8 rounded-lg border border-stone-200 text-gray-300">›</button><span className="rounded-lg border border-stone-200 px-3 py-2">10 / page</span></div>
              </div>
              {visibleUnknown.length > 0 && <p className="mt-2 text-right text-[10.5px] text-gray-500">Paid and Balance totals stay blank until {visibleUnknown.length} imported payment {visibleUnknown.length === 1 ? "position is" : "positions are"} confirmed.</p>}
            </div>
          </>}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center gap-2.5"><Disc name="bell" tone="waiting" size="h-8 w-8"/><h2 className="text-[13.5px] font-semibold">Needs attention</h2></div><div className="mt-3 divide-y divide-stone-100"><Attention icon="people" tone="decision" label="Awaiting Principal decision" hint="Staff pay pending review" count={awaiting.length} to="/admin/approvals"/><Attention icon="balance" tone="waiting" label="Part-paid staff pay" hint="Have outstanding balances" count={partPaid.length} to="/admin/finance/staff-compensation"/><Attention icon="doc" tone="brand" label="Drafts pending submission" hint="Complete and submit for review" count={drafts.length} to="/admin/finance/staff-compensation"/>{historyUnknown.length>0&&<Attention icon="wallet" tone="neutral" label="Payment history to confirm" hint="Imported historical records" count={historyUnknown.length} to="/admin/finance/staff-compensation"/>}</div><Link to="/admin/finance/staff-compensation" className="mt-3 flex items-center justify-between text-[11.5px] font-semibold text-botanique-green">View all <span>→</span></Link></section>
          <section className="rounded-xl border border-stone-200 bg-white p-4"><div className="flex items-center gap-2.5"><Disc name="bank" tone="brand" size="h-8 w-8"/><h2 className="text-[13.5px] font-semibold">Recent payment activity</h2></div>{recordedPayments.length?<ul className="mt-3 divide-y divide-stone-100">{recordedPayments.map(({payment,person,project})=><li key={payment.id} className="py-3 first:pt-0"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-[12px] font-semibold">{person?.fullName || "Person"}</p><p className="mt-0.5 truncate text-[10.5px] text-gray-500">{project?.projectName || "No Project context"}</p><p className="mt-0.5 text-[10px] text-gray-400">{methodLabels[payment.paymentChannel] || "Payment"} · {date(payment.paidAt)}</p></div><span className="shrink-0 text-[11px] font-semibold text-emerald-700">+{money(payment.amount)}</span></div></li>)}</ul>:<p className="mt-3 text-[11.5px] text-gray-500">{hasHistoricalSettlement ? "Historical settlement is included in Paid; no dated Staff Pay payment transaction has been recorded yet." : "No Staff Pay payment has been recorded yet."}</p>}<Link to="/admin/finance/staff-compensation" className="mt-3 flex items-center justify-between border-t border-stone-100 pt-3 text-[11.5px] font-semibold text-botanique-green">View all activity <span>→</span></Link></section>
        </aside>
      </div>
    </section>
  );
}

function PayActionMenu({ item, position, role, currentUserId, open, dropUp = false, onToggle }) {
  const items = [{ label: "View staff pay", to: `/admin/finance/staff-compensation/${item.id}` }];
  const unknownHistory = position?.paymentStatus === "payment_history_unknown";
  if (role === "owner" && item.lifecycle === "approved" && unknownHistory) items.unshift({ label: "Resolve payment history", to: `/admin/finance/staff-compensation/${item.id}#payment-history` });
  if (role === "owner" && item.lifecycle === "approved" && !unknownHistory && Number(position?.balanceAmount || 0) > 0) items.unshift({ label: "Record payment", to: `/admin/finance/staff-compensation/${item.id}#payments` });
  if (role === "owner" && item.lifecycle === "awaiting_review") items.unshift({ label: "Review in Approvals", to: `/admin/approvals/staff-compensation:${item.id}` });
  if (role === "manager" && item.requesterId === currentUserId && ["draft", "amendment_requested"].includes(item.lifecycle)) items.unshift({ label: item.lifecycle === "amendment_requested" ? "Amend and resubmit" : "Edit and submit", to: `/admin/finance/staff-compensation/${item.id}/edit` });
  if (item.legacySourceClaimId) items.push({ label: "View original Project Cost", to: `/admin/site-costs/${item.legacySourceClaimId}` });
  const menuPosition = dropUp ? "bottom-full mb-1" : "top-full mt-1";
  return <div className="relative inline-block text-left" onClick={(event)=>event.stopPropagation()}><button type="button" onClick={onToggle} aria-haspopup="menu" aria-expanded={open} aria-label="Staff pay actions" className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-gray-600 transition hover:border-botanique-green hover:text-botanique-green"><span aria-hidden="true" className="text-[15px] leading-none tracking-widest">···</span></button>{open&&<div role="menu" className={`absolute right-0 z-40 w-56 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg ${menuPosition}`}>{items.map((action)=><Link key={action.label} role="menuitem" to={action.to} className="block px-3 py-2 text-left text-[12.5px] text-botanique-charcoal transition hover:bg-stone-50">{action.label}</Link>)}</div>}</div>;
}

function Metric({ icon, tone, label, value, hint }) { return <div className="flex min-h-[112px] items-center gap-3 rounded-xl border border-stone-200 bg-white p-4"><Disc name={icon} tone={tone} size="h-10 w-10"/><div><p className="text-[11.5px] text-gray-500">{label}</p><p className="mt-1 text-[20px] font-semibold tabular-nums text-botanique-charcoal">{value}</p><p className="mt-1 text-[10.5px] text-gray-500">{hint}</p></div></div>; }
function Filter({ label, value, onChange, children }) { return <label className="text-[11.5px] font-medium text-gray-600">{label}<select value={value} onChange={(event)=>onChange(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 text-[12.5px]">{children}</select></label>; }
function Attention({ icon, tone, label, hint, count, to }) { return <Link to={to} className="flex min-h-[68px] items-center gap-2.5 py-2.5"><Disc name={icon} tone={tone} size="h-8 w-8"/><span className="min-w-0 flex-1"><span className="block text-[11.5px] font-semibold text-botanique-charcoal">{label}</span><span className="mt-0.5 block text-[10px] text-gray-500">{hint}</span></span><strong className="text-[12px] tabular-nums">{count}</strong><span className="text-gray-400">›</span></Link>; }
