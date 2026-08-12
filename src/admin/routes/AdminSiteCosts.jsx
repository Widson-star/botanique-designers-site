// Project Costs — Founder-approved register pattern.
// Date · Cost Ref. · Project · Status · Total · Balance · Paid · Action
//
// Payment truth now comes only from first-class Project Cost payments. A historical
// approved cost remains unknown until the Principal confirms that its payment history
// is complete. Approval is never treated as payment and Advances are not a substitute
// for a Project Cost payment.
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import {
  canCancelSiteCost, canDecideSiteCost, SITE_COST_LIFECYCLES,
} from "../utils/siteCostCapabilities";
import { describeActiveFilters, withinReportedPeriod } from "../utils/listUrlFilters";
import {
  balanceDisplay, costPaymentTruth, costTotal, paidDisplay, PAYMENT_KNOWLEDGE,
  summarisePaymentTruth,
} from "../utils/costPaymentTruth";
import { costReference } from "../utils/costReference";
import { Chip, Disc, Glyph } from "../components/ui/Surfaces";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(amount || 0);
const shortDate = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value))
  : "—";

const STATUS_TONE = {
  draft: "neutral",
  awaiting_review: "waiting",
  amendment_requested: "waiting",
  approved: "settled",
  rejected: "attention",
  withdrawn: "neutral",
  cancelled: "neutral",
};

const PAYMENT_FILTERS = {
  unrecorded: "Payment not recorded",
  part_paid: "Part paid",
  paid: "Paid in full",
  unpaid: "Nothing paid",
};

export default function AdminSiteCosts() {
  const { role, projects } = useAdminData();
  // Payment truth comes from the first-class Project Cost payment position.
  // `linesForClaim` lets a draft state its structured line total.
  const {
    claims, status, error, paymentPositionForClaim, linesForClaim,
  } = useSiteCosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const lifecycle = searchParams.get("status") || "all";
  const projectId = searchParams.get("project") || "all";
  const payment = searchParams.get("payment") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const [openMenu, setOpenMenu] = useState(null);

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const projectMap = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);
  const truthByClaim = useMemo(
    () => new Map(claims.map((claim) => [
      claim.id,
      costPaymentTruth(claim, paymentPositionForClaim(claim.id)),
    ])),
    [claims, paymentPositionForClaim]
  );

  const matchesPayment = (claim) => {
    if (payment === "all") return true;
    const truth = truthByClaim.get(claim.id);
    if (!truth) return false;
    if (payment === "unrecorded") return truth.knowledge === PAYMENT_KNOWLEDGE.unrecorded;
    if (truth.paid == null) return false;
    if (payment === "paid") return truth.balance === 0;
    if (payment === "part_paid") return truth.paid > 0 && truth.balance > 0;
    if (payment === "unpaid") return truth.paid === 0;
    return true;
  };

  const visible = claims.filter((claim) =>
    (lifecycle === "all" || claim.lifecycle === lifecycle) &&
    (projectId === "all" || claim.projectId === projectId) &&
    matchesPayment(claim) &&
    withinReportedPeriod(claim.submittedAt, claim.decidedAt, from, to));

  const summary = summarisePaymentTruth(visible, paymentPositionForClaim, linesForClaim);

  const activeFilterSummary = [
    describeActiveFilters({
      projectName: projectId !== "all" ? projectMap.get(projectId)?.projectName || "one project" : "",
      statusLabel: lifecycle !== "all" ? SITE_COST_LIFECYCLES[lifecycle] : "",
      from, to,
    }),
    payment !== "all" ? PAYMENT_FILTERS[payment] || "" : "",
  ].filter(Boolean).join(" · ");

  return (
    <section className="space-y-3.5" onClick={() => setOpenMenu(null)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight">Project Costs</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-gray-600">
            Costs incurred on projects, what has been approved, what has been paid, and what remains.
          </p>
        </div>
        <Link
          to="/admin/site-costs/new"
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white hover:bg-botanique-dark"
        >
          <Glyph name="doc" />
          {role === "owner" ? "Authorise project cost" : "New project cost"}
        </Link>
      </div>

      <div className="grid gap-2.5 rounded-xl border border-stone-200 bg-white p-3.5 sm:grid-cols-3">
        <label className="text-[12px] font-medium text-gray-600">Status
          <select value={lifecycle} onChange={(e) => setParam("status", e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
            <option value="all">All statuses</option>
            {Object.entries(SITE_COST_LIFECYCLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-gray-600">Project
          <select value={projectId} onChange={(e) => setParam("project", e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
            <option value="all">All projects</option>
            {[...new Set([...claims.map((c) => c.projectId), ...(projectId !== "all" ? [projectId] : [])])]
              .map((id) => <option key={id} value={id}>{projectMap.get(id)?.projectName || "Project"}</option>)}
          </select>
        </label>
        <label className="text-[12px] font-medium text-gray-600">Payment
          <select value={payment} onChange={(e) => setParam("payment", e.target.value)} className="mt-1 block min-h-10 w-full rounded-lg border border-stone-300 px-2.5 text-[13px]">
            <option value="all">Any payment state</option>
            {Object.entries(PAYMENT_FILTERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {activeFilterSummary && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[12.5px] text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/site-costs" className="min-h-9 py-1.5 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {status === "loading" && <p className="text-[13px] text-gray-600">Loading project costs…</p>}
      {error && <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-800">{error}</p>}

      {status !== "loading" && !visible.length && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5">
          <Disc name="pause" tone="unbuilt" size="h-8 w-8" />
          <p className="min-w-0 flex-1 text-[12.5px] text-gray-600">
            {claims.length === 0
              ? "No project cost has been recorded yet. A cost is raised from an accepted Daily Site Record, or directly here."
              : "No project cost matches these filters."}
          </p>
        </div>
      )}

      {visible.length > 0 && (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-stone-100 bg-[#fbfbfa] text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Date</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5 font-medium">Cost Ref.</th>
                  <th className="px-3.5 py-2.5 font-medium">Project</th>
                  <th className="px-3.5 py-2.5 font-medium">Status</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium">Total</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium">Balance</th>
                  <th className="whitespace-nowrap px-3.5 py-2.5 text-right font-medium">Paid</th>
                  <th className="px-3.5 py-2.5 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visible.map((claim) => {
                  const truth = truthByClaim.get(claim.id);
                  return (
                    <tr key={claim.id} className="transition hover:bg-[#fbfbfa]">
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-gray-600">{shortDate(`${claim.serviceDate}T00:00:00`)}</td>
                      <td className="whitespace-nowrap px-3.5 py-2.5">
                        <Link to={`/admin/site-costs/${claim.id}`} className="font-semibold tabular-nums text-botanique-green hover:underline">{costReference(claim)}</Link>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <span className="block max-w-[16rem] truncate font-medium text-botanique-charcoal">
                          {projectMap.get(claim.projectId)?.projectName || "Project"}
                        </span>
                        {/* Compact secondary context only. The full purpose and
                            the labour breakdown live in the drill-through. */}
                        <span className="block max-w-[16rem] truncate text-[11px] text-gray-500">
                          {claim.recipientLabel}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5">
                        <Chip tone={STATUS_TONE[claim.lifecycle] || "neutral"}>
                          {SITE_COST_LIFECYCLES[claim.lifecycle]}
                        </Chip>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right font-semibold tabular-nums">
                        {money(costTotal(claim, linesForClaim?.(claim.id)))}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums">
                        <span className={truth.balance > 0 ? "font-semibold text-amber-800" : "text-gray-600"}>
                          {balanceDisplay(truth, money)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-2.5 text-right tabular-nums">
                        <span className={truth.paid > 0 ? "font-semibold text-emerald-800" : "text-gray-600"}>
                          {paidDisplay(truth, money)}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-right">
                        <ActionMenu claim={claim} truth={truth} role={role} open={openMenu === claim.id} onToggle={() => setOpenMenu(openMenu === claim.id ? null : claim.id)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <ul className="space-y-2.5 md:hidden">
            {visible.map((claim) => {
              const truth = truthByClaim.get(claim.id);
              return (
                <li key={claim.id} className="rounded-xl border border-stone-200 bg-white p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link to={`/admin/site-costs/${claim.id}`} className="block break-words font-semibold text-botanique-green hover:underline">{costReference(claim)}</Link>
                      <p className="mt-0.5 break-words text-[12.5px] text-botanique-charcoal">{projectMap.get(claim.projectId)?.projectName || "Project"}</p>
                      <p className="text-[11px] text-gray-500">{shortDate(`${claim.serviceDate}T00:00:00`)} · {claim.recipientLabel}</p>
                    </div>
                    <Chip tone={STATUS_TONE[claim.lifecycle] || "neutral"}>{SITE_COST_LIFECYCLES[claim.lifecycle]}</Chip>
                  </div>
                  <dl className="mt-2.5 grid grid-cols-3 gap-2 border-t border-stone-100 pt-2.5 text-[12px]">
                    <div><dt className="text-gray-500">Total</dt><dd className="font-semibold tabular-nums">{money(costTotal(claim, linesForClaim?.(claim.id)))}</dd></div>
                    <div><dt className="text-gray-500">Paid</dt><dd className="tabular-nums">{paidDisplay(truth, money)}</dd></div>
                    <div><dt className="text-gray-500">Balance</dt><dd className="tabular-nums">{balanceDisplay(truth, money)}</dd></div>
                  </dl>
                  <div className="mt-2.5 flex justify-end"><ActionMenu claim={claim} truth={truth} role={role} open={openMenu === claim.id} onToggle={() => setOpenMenu(openMenu === claim.id ? null : claim.id)} /></div>
                </li>
              );
            })}
          </ul>

          <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1.5 px-1 text-[11.5px] text-gray-500">
            <span>{visible.length} of {claims.length} {claims.length === 1 ? "cost" : "costs"}</span>
            <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span>Total <strong className="font-semibold tabular-nums text-botanique-charcoal">{money(summary.total)}</strong></span>
              <span>Paid <strong className="font-semibold tabular-nums text-botanique-charcoal">{summary.paid == null ? "—" : money(summary.paid)}</strong></span>
              <span>Balance <strong className="font-semibold tabular-nums text-botanique-charcoal">{summary.balance == null ? "—" : money(summary.balance)}</strong></span>
              {summary.unrecordedCount > 0 && <span className="text-amber-800">{summary.unrecordedCount} with payment history not yet confirmed</span>}
            </span>
          </div>
        </>
      )}
    </section>
  );
}

function ActionMenu({ claim, truth, role, open, onToggle }) {
  const items = [{ label: "View cost", to: `/admin/site-costs/${claim.id}` }];
  if (claim.dailySiteEntryId) items.push({ label: "View source site record", to: `/admin/daily-site-operations/${claim.dailySiteEntryId}` });
  if (canDecideSiteCost(claim, role)) items.push({ label: "Review and decide", to: `/admin/site-costs/${claim.id}` });
  if (claim.lifecycle === "approved" && role === "owner" && (truth.balance == null || truth.balance > 0)) {
    items.push({ label: "Record payment", to: `/admin/site-costs/${claim.id}#payments` });
  }
  if (truth.paymentCount > 0) items.push({ label: "View payments", to: `/admin/site-costs/${claim.id}#payments` });
  if (canCancelSiteCost(claim, role)) items.push({ label: "Cancel approved cost", to: `/admin/site-costs/${claim.id}`, tone: "danger" });

  return (
    <div className="relative inline-block text-left" onClick={(event) => event.stopPropagation()}>
      <button type="button" onClick={onToggle} aria-haspopup="menu" aria-expanded={open} aria-label={`Actions for ${costReference(claim)}`} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-gray-600 transition hover:border-botanique-green hover:text-botanique-green">
        <span aria-hidden="true" className="text-[15px] leading-none tracking-widest">···</span>
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-20 mt-1 w-56 overflow-hidden rounded-lg border border-stone-200 bg-white py-1 shadow-lg">
          {items.map((item) => (
            <Link key={item.label} role="menuitem" to={item.to} className={`block px-3 py-2 text-left text-[12.5px] transition hover:bg-stone-50 ${item.tone === "danger" ? "text-red-700" : "text-botanique-charcoal"}`}>{item.label}</Link>
          ))}
        </div>
      )}
    </div>
  );
}