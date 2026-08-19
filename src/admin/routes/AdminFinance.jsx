import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { useStaffCompensation } from "../context/staffCompensation";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { canSeeFundRequests } from "../utils/fundRequestCapabilities";
import { formatKes } from "../utils/dailySiteFormatters";
import { staffPayRegisterStatus } from "../utils/staffPayStatus";
import { costPaymentTruth } from "../utils/costPaymentTruth";
import { projectCostRegisterStatus } from "../utils/projectCostStatus";
import { Disc } from "../components/ui/Surfaces";

const AREAS = [
  { id: "project-financials", label: "Project Financials", description: "Agreed project value, client payments and outstanding client balance.", to: "/admin/finance/project-financials", icon: "scale", unbuilt: true },
  { id: "project-costs", label: "Project Costs", description: "Costs incurred while delivering projects, including what has been paid and what remains.", to: "/admin/site-costs", icon: "calendar" },
  { id: "company-expenses", label: "Company Expenses", description: "Operating expenses, subscriptions, advertising and company bills.", to: "/admin/finance/company-expenses", icon: "doc", unbuilt: true },
  { id: "staff-compensation", label: "Staff Pay", description: "Amounts earned, allowances, bonuses and other pay due to staff.", to: "/admin/finance/staff-compensation", icon: "people" },
  { id: "advances", label: "Advances", description: "Money issued before expenditure and whether it has been accounted for.", to: "/admin/fund-requests", icon: "money" },
];
const ADVANCE_CUSTODY = "operations_manager_accountable_advance";

export default function AdminFinance() {
  const { role, projects } = useAdminData();
  const { people } = usePeople();
  const { claims, paymentPositionForClaim, status: costsStatus } = useSiteCosts();
  const { requests, releases, status: fundsStatus } = useFundRequests();
  const { compensations, paymentPositionForCompensation, status: compensationStatus } = useStaffCompensation();
  const canCosts = canSeeSiteCosts(role);
  const canAdvances = canSeeFundRequests(role);
  const loading = costsStatus === "loading" || fundsStatus === "loading" || compensationStatus === "loading";
  const projectName = useMemo(() => Object.fromEntries(projects.map((project) => [project.id, project.projectName])), [projects]);
  const personName = useMemo(() => Object.fromEntries(people.map((person) => [person.id, person.fullName])), [people]);
  const migratedSourceIds = useMemo(() => new Set(compensations.map((item) => item.legacySourceClaimId).filter(Boolean)), [compensations]);
  const projectCostClaims = useMemo(() => claims.filter((claim) => !migratedSourceIds.has(claim.id)), [claims, migratedSourceIds]);

  if (!canCosts && !canAdvances) return <section className="rounded-xl border border-stone-200 bg-white p-6"><h1 className="text-xl font-semibold">Finance unavailable</h1><p className="mt-1 text-[13px] text-gray-600">Your role does not have access to Finance.</p></section>;

  const awaitingCosts = projectCostClaims.filter((claim) => claim.lifecycle === "awaiting_review");
  const approvedCosts = projectCostClaims.filter((claim) => claim.lifecycle === "approved");
  const advanceRequests = requests.filter((request) => request.intendedCustodyType === ADVANCE_CUSTODY);
  const awaitingAdvances = advanceRequests.filter((request) => request.status === "submitted");
  const advancesIssued = releases.filter((release) => release.status !== "reversed" && release.custodyDisposition === ADVANCE_CUSTODY);
  const approvedPay = compensations.filter((item) => item.lifecycle === "approved");
  const awaitingPay = compensations.filter((item) => item.lifecycle === "awaiting_review");
  const unknownPay = approvedPay.filter((item) => paymentPositionForCompensation(item.id)?.paymentStatus === "payment_history_unknown");
  const knownPay = approvedPay.filter((item) => paymentPositionForCompensation(item.id)?.paymentStatus !== "payment_history_unknown");
  const approvedPayAmount = approvedPay.reduce((sum, item) => sum + Number(item.approvedAmount || 0), 0);
  const payOutstanding = knownPay.reduce((sum, item) => sum + Number(paymentPositionForCompensation(item.id)?.balanceAmount || 0), 0);
  const payPaid = knownPay.reduce((sum, item) => sum + Number(paymentPositionForCompensation(item.id)?.paidAmount || 0), 0);
  const awaitingCostAmount = sumClaims(awaitingCosts, "submittedTotal");
  const approvedCostAmount = approvedCosts.reduce((sum, claim) => sum + Number(claim.approvedTotal ?? claim.submittedTotal ?? 0), 0);
  const advancesIssuedAmount = advancesIssued.reduce((sum, release) => sum + Number(release.releasedAmount ?? 0), 0);

  const activity = [
    // Project Cost activity reads the same derived working status as the
    // Project Costs register — an approved cost describes what is still owed,
    // not that a decision once happened.
    ...projectCostClaims.map((claim) => ({ id: `cost-${claim.id}`, title: projectName[claim.projectId] || "Project", detail: `${claim.recipientLabel || "Project cost"} · ${projectCostRegisterStatus(claim, costPaymentTruth(claim, paymentPositionForClaim?.(claim.id))).label}`, amount: Number(claim.approvedTotal ?? claim.submittedTotal ?? 0), at: claim.updatedAt || claim.decidedAt || claim.submittedAt || "", to: `/admin/site-costs/${claim.id}` })),
    // Staff Pay activity reads the same derived working status as the Staff Pay
    // register, so one record cannot describe itself two ways across Finance.
    ...compensations.map((item) => ({ id: `pay-${item.id}`, title: personName[item.personId] || "Staff member", detail: `Staff pay · ${staffPayRegisterStatus(item, paymentPositionForCompensation(item.id)).label}`, amount: Number(item.approvedAmount ?? item.submittedAmount ?? 0), at: item.updatedAt || item.decidedAt || item.submittedAt || item.createdAt || "", to: `/admin/finance/staff-compensation/${item.id}` })),
    ...advanceRequests.map((request) => ({ id: `advance-${request.id}`, title: projectName[request.projectId] || "Project", detail: `${request.requestNumber || "Advance"} · ${plainStatus(request.status)}`, amount: Number(request.totalRequestedAmount ?? 0), at: request.updatedAt || request.submittedAt || "", to: `/admin/fund-requests/${request.id}` })),
  ].sort((left, right) => String(right.at).localeCompare(String(left.at))).slice(0, 5);

  const paidDisplay = unknownPay.length ? "—" : money(payPaid);
  const outstandingDisplay = unknownPay.length ? "—" : money(payOutstanding);

  return <section className="space-y-4">
    <header><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p><h1 className="mt-1 text-[24px] font-semibold leading-tight">Finance</h1><p className="mt-1 max-w-2xl text-[13px] text-gray-600">Client finances, project costs, company expenses, staff pay and advances.</p></header>
    {loading && <p className="text-[13px] text-gray-600">Loading Finance…</p>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5" aria-label="Finance areas">{AREAS.map((area) => {
      const allowed = area.id === "project-costs" ? canCosts : area.id === "advances" ? canAdvances : canCosts || canAdvances;
      if (!allowed) return null;
      const summary = areaSummary(area.id, { awaitingCosts, awaitingCostAmount, advancesIssued, advancesIssuedAmount, payOutstanding, approvedPay, approvedPayAmount, unknownPay });
      return <article key={area.id} aria-label={area.label} className="flex min-h-[170px] flex-col rounded-xl border border-stone-200 bg-white"><div className="flex-1 p-4"><div className="flex items-start gap-3"><Disc name={area.icon} tone={area.unbuilt ? "unbuilt" : "brand"} size="h-9 w-9"/><div className="min-w-0"><h2 className={`text-[13.5px] font-semibold leading-snug ${area.unbuilt ? "text-gray-500" : "text-botanique-charcoal"}`}>{area.label}</h2><p className="mt-1 text-[11px] leading-snug text-gray-500">{area.description}</p></div></div>{area.unbuilt ? <p className="mt-4 text-[12px] font-medium text-gray-400">Not yet built</p> : <div className="mt-4"><p className="text-[11.5px] text-gray-500">{summary.label}</p><p className="mt-1 text-[21px] font-semibold leading-none tabular-nums text-botanique-charcoal">{summary.value}</p><p className="mt-1.5 text-[11px] text-gray-500">{summary.hint}</p></div>}</div><Link to={area.to} className="flex min-h-11 items-center justify-between border-t border-stone-100 px-4 text-[12px] font-semibold text-botanique-green hover:bg-stone-50">{area.unbuilt ? "View area" : `Open ${area.label}`}<span aria-hidden="true">→</span></Link></article>;
    })}</div>
    <div className="grid gap-3 lg:grid-cols-2">
      <section className="rounded-xl border border-stone-200 bg-white p-4" aria-labelledby="finance-glance-title"><h2 id="finance-glance-title" className="text-[14px] font-semibold">Finance at a glance</h2><dl className="mt-3 divide-y divide-stone-100 text-[12.5px]">{canCosts && <><MetricRow label="Project costs awaiting decision" value={`${awaitingCosts.length} · ${money(awaitingCostAmount)}`}/><MetricRow label="Approved project costs" value={`${approvedCosts.length} · ${money(approvedCostAmount)}`}/><MetricRow label="Payable staff pay" value={`${approvedPay.length} · ${money(approvedPayAmount)}`}/><MetricRow label="Staff pay awaiting decision" value={String(awaitingPay.length)}/><MetricRow label="Staff pay paid" value={paidDisplay}/><MetricRow label="Staff pay outstanding" value={outstandingDisplay}/>{unknownPay.length > 0 && <MetricRow label="Historical payment positions to confirm" value={String(unknownPay.length)}/>}</>}{canAdvances && <><MetricRow label="Advance requests awaiting decision" value={String(awaitingAdvances.length)}/><MetricRow label="Advances issued" value={`${advancesIssued.length} · ${money(advancesIssuedAmount)}`}/></>}</dl></section>
      <section className="rounded-xl border border-stone-200 bg-white p-4" aria-labelledby="finance-activity-title"><h2 id="finance-activity-title" className="text-[14px] font-semibold">Recent finance activity</h2>{activity.length ? <ul className="mt-2 divide-y divide-stone-100">{activity.map((item) => <li key={item.id}><Link to={item.to} className="flex min-h-14 items-center justify-between gap-4 py-2.5 hover:text-botanique-green"><span className="min-w-0"><span className="block truncate text-[12.5px] font-semibold">{item.title}</span><span className="mt-0.5 block truncate text-[11.5px] text-gray-500">{item.detail}</span></span><span className="shrink-0 text-[12px] font-semibold tabular-nums">{money(item.amount)}</span></Link></li>)}</ul> : <p className="mt-3 text-[12.5px] text-gray-500">No finance activity has been recorded yet.</p>}</section>
    </div>
  </section>;
}

function MetricRow({ label, value }) { return <div className="flex min-h-10 items-center justify-between gap-4 py-2"><dt className="text-gray-600">{label}</dt><dd className="shrink-0 font-semibold tabular-nums text-botanique-charcoal">{value}</dd></div>; }
function areaSummary(id, data) {
  if (id === "project-costs") return { label: "Awaiting decision", value: money(data.awaitingCostAmount), hint: `${data.awaitingCosts.length} ${data.awaitingCosts.length === 1 ? "cost" : "costs"}` };
  if (id === "staff-compensation") {
    // Outstanding cannot be stated while any historical position is unknown, so
    // the card falls back to the payable obligation — never to "Approved".
    if (data.unknownPay.length) return { label: "Payable", value: money(data.approvedPayAmount), hint: `${data.unknownPay.length} payment history ${data.unknownPay.length === 1 ? "position" : "positions"} to confirm` };
    return { label: "Outstanding", value: money(data.payOutstanding), hint: `${data.approvedPay.length} payable ${data.approvedPay.length === 1 ? "record" : "records"}` };
  }
  if (id === "advances") return { label: "Issued", value: money(data.advancesIssuedAmount), hint: `${data.advancesIssued.length} ${data.advancesIssued.length === 1 ? "advance" : "advances"}` };
  return { label: "", value: "", hint: "" };
}
function sumClaims(claims, field) { return claims.reduce((sum, claim) => sum + Number(claim[field] ?? 0), 0); }
function money(amount) { return formatKes(Number(amount || 0)); }
function plainStatus(value) { const text = String(value || "").replaceAll("_", " "); return text ? `${text[0].toUpperCase()}${text.slice(1)}` : ""; }
