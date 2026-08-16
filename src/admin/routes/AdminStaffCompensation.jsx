import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import { useStaffCompensation } from "../context/staffCompensation";
import { Chip, Disc } from "../components/ui/Surfaces";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2 }).format(Number(amount || 0));
const date = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "—";
const labels = { draft: "Draft", awaiting_review: "Awaiting review", amendment_requested: "Amendment requested", approved: "Approved", rejected: "Rejected", withdrawn: "Withdrawn", cancelled: "Cancelled" };
const tones = { draft: "neutral", awaiting_review: "waiting", amendment_requested: "waiting", approved: "settled", rejected: "attention", withdrawn: "neutral", cancelled: "neutral" };

export default function AdminStaffCompensation() {
  const { role, projects } = useAdminData();
  const { people } = usePeople();
  const { compensations, paymentPositionForCompensation, status, error } = useStaffCompensation();
  const [personId, setPersonId] = useState("all");
  const [lifecycle, setLifecycle] = useState("all");

  const personMap = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const visible = compensations.filter((item) => (personId === "all" || item.personId === personId) && (lifecycle === "all" || item.lifecycle === lifecycle));
  const approved = compensations.filter((item) => item.lifecycle === "approved");
  const totalApproved = approved.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
  const totalPaid = approved.reduce((sum, item) => sum + Number(paymentPositionForCompensation(item.id)?.paidAmount || 0), 0);
  const outstanding = approved.reduce((sum, item) => sum + Number(paymentPositionForCompensation(item.id)?.balanceAmount || 0), 0);
  const awaiting = compensations.filter((item) => item.lifecycle === "awaiting_review");

  return (
    <section className="space-y-3.5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p>
          <h1 className="mt-1 text-[22px] font-semibold leading-tight">Staff Compensation</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-gray-600">Compensation belongs to a person. Project linkage is optional context; approval and payment remain separate.</p>
        </div>
        {role === "manager" && <Link to="/admin/finance/staff-compensation/new" className="inline-flex min-h-10 items-center justify-center rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white hover:bg-botanique-dark">New compensation</Link>}
      </header>

      <div className="grid gap-2.5 sm:grid-cols-4">
        <Metric label="Approved" value={money(totalApproved)} hint={`${approved.length} records`} />
        <Metric label="Paid" value={money(totalPaid)} hint="Recorded payments" />
        <Metric label="Outstanding" value={money(outstanding)} hint="Approved balance" attention={outstanding > 0} />
        <Metric label="Needs decision" value={String(awaiting.length)} hint={role === "owner" ? "Open Approvals" : "With Principal"} attention={awaiting.length > 0} to={role === "owner" ? "/admin/approvals" : ""} />
      </div>

      <div className="grid gap-2.5 rounded-xl border border-stone-200 bg-white p-3.5 sm:grid-cols-2">
        <label className="text-[12px] font-medium text-gray-600">Person
          <select value={personId} onChange={(event) => setPersonId(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
            <option value="all">All people</option>
            {people.slice().sort((a,b) => a.fullName.localeCompare(b.fullName)).map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-gray-600">Status
          <select value={lifecycle} onChange={(event) => setLifecycle(event.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
            <option value="all">All statuses</option>
            {Object.entries(labels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {status === "loading" && <p className="text-[13px] text-gray-600">Loading Staff Compensation…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p>}
      {status !== "loading" && !visible.length && <div className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4"><Disc name="people" tone="unbuilt" size="h-9 w-9"/><p className="text-[12.5px] text-gray-600">{compensations.length ? "No compensation matches these filters." : "No Staff Compensation has been recorded yet."}</p></div>}

      {visible.length > 0 && <>
        <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
          <table className="w-full text-left text-[13px]"><thead className="border-b border-stone-100 bg-[#fbfbfa] text-[11px] uppercase tracking-wide text-gray-500"><tr><th className="px-3.5 py-2.5 font-medium">Date</th><th className="px-3.5 py-2.5 font-medium">Person</th><th className="px-3.5 py-2.5 font-medium">Status</th><th className="px-3.5 py-2.5 font-medium">Project</th><th className="px-3.5 py-2.5 text-right font-medium">Total</th><th className="px-3.5 py-2.5 text-right font-medium">Paid</th><th className="px-3.5 py-2.5 text-right font-medium">Balance</th><th className="px-3.5 py-2.5 text-right font-medium">Action</th></tr></thead>
          <tbody className="divide-y divide-stone-100">{visible.map((item) => { const position = paymentPositionForCompensation(item.id); return <tr key={item.id} className="hover:bg-[#fbfbfa]"><td className="whitespace-nowrap px-3.5 py-2.5 text-gray-600">{date(item.serviceDate)}</td><td className="px-3.5 py-2.5"><Link to={`/admin/finance/staff-compensation/${item.id}`} className="font-semibold text-botanique-green hover:underline">{personMap.get(item.personId)?.fullName || "Person"}</Link><span className="mt-0.5 block max-w-[18rem] truncate text-[11px] text-gray-500">{item.description}</span></td><td className="px-3.5 py-2.5"><Chip tone={tones[item.lifecycle]}>{labels[item.lifecycle]}</Chip></td><td className="px-3.5 py-2.5 text-gray-600">{item.projectId ? projectMap.get(item.projectId)?.projectName || "Project" : "—"}</td><td className="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums">{money(item.lifecycle === "approved" ? item.approvedAmount : item.submittedAmount)}</td><td className="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums">{position?.paidAmount == null ? "—" : money(position.paidAmount)}</td><td className="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums">{position?.balanceAmount == null ? "—" : money(position.balanceAmount)}</td><td className="px-3.5 py-2.5 text-right"><Link to={`/admin/finance/staff-compensation/${item.id}`} className="font-semibold text-botanique-green hover:underline">View</Link></td></tr>; })}</tbody></table>
        </div>
        <ul className="space-y-2.5 md:hidden">{visible.map((item) => { const position = paymentPositionForCompensation(item.id); return <li key={item.id} className="rounded-xl border border-stone-200 bg-white p-3.5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><Link to={`/admin/finance/staff-compensation/${item.id}`} className="font-semibold text-botanique-green">{personMap.get(item.personId)?.fullName || "Person"}</Link><p className="mt-0.5 text-[11.5px] text-gray-500">{date(item.serviceDate)}{item.projectId ? ` · ${projectMap.get(item.projectId)?.projectName || "Project"}` : ""}</p></div><Chip tone={tones[item.lifecycle]}>{labels[item.lifecycle]}</Chip></div><p className="mt-2 line-clamp-2 text-[12.5px] text-gray-600">{item.description}</p><dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-stone-100 pt-2.5 text-[11.5px]"><div><dt className="text-gray-500">Total</dt><dd className="font-semibold tabular-nums">{money(item.lifecycle === "approved" ? item.approvedAmount : item.submittedAmount)}</dd></div><div><dt className="text-gray-500">Paid</dt><dd>{position?.paidAmount == null ? "—" : money(position.paidAmount)}</dd></div><div><dt className="text-gray-500">Balance</dt><dd>{position?.balanceAmount == null ? "—" : money(position.balanceAmount)}</dd></div></dl></li>; })}</ul>
      </>}
    </section>
  );
}

function Metric({ label, value, hint, attention, to }) { const body = <div className={`rounded-xl border bg-white p-3.5 ${attention ? "border-amber-200" : "border-stone-200"}`}><p className="text-[11.5px] text-gray-500">{label}</p><p className="mt-1 text-[20px] font-semibold tabular-nums text-botanique-charcoal">{value}</p><p className="mt-1 text-[11px] text-gray-500">{hint}</p></div>; return to ? <Link to={to}>{body}</Link> : body; }
