import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { SITE_COST_LIFECYCLES } from "../utils/siteCostCapabilities";
import { profilePresentationName } from "../utils/personName";
import { describeActiveFilters, withinReportedPeriod } from "../utils/listUrlFilters";
import { FUNDING_POSITIONS, fundingForClaims, fundingSummaryPhrase } from "../utils/claimFunding";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2 }).format(amount || 0);
const date = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "—";

// The financial-position filter, in the same language as the positions themselves.
const FUNDING_FILTER_LABELS = {
  unresolved: "anything still unresolved",
  reconciliation_outstanding: "reconciliation outstanding",
  ...FUNDING_POSITIONS,
};

// Filter state lives in the URL so a Reports drill-through arrives at exactly
// the project, status and period it referred to, and so the filtered view can
// be shared or restored with the browser's back button. Access is unchanged and
// still enforced by the database: a project id in the URL grants nothing, it
// only narrows what the caller's own claims already contain.
export default function AdminSiteCosts() {
  const { role, projects, profiles } = useAdminData();
  const { claims, status, error } = useSiteCosts();
  // Read only. Every figure below is derived by claimFunding.js from the merged
  // BD-FIN-01C records; this page records no release and decides nothing.
  const { requests, allocations, releases, acquittals } = useFundRequests();
  const finance = useMemo(() => ({ requests, allocations, releases, acquittals }),
    [requests, allocations, releases, acquittals]);
  const [searchParams, setSearchParams] = useSearchParams();
  const lifecycle = searchParams.get("status") || "all";
  const projectId = searchParams.get("project") || "all";
  const funding = searchParams.get("funding") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "all") next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const projectMap = useMemo(() => new Map(projects.map((project) => [project.id, project])), [projects]);
  const profileMap = useMemo(() => new Map(profiles.map((profile) => [profile.id, profile])), [profiles]);
  // One funding derivation per claim, reused by the row, the filter and the
  // banner, so a single arithmetic never disagrees with itself on one page.
  const fundingByClaim = useMemo(() => new Map(
    claims.map((claim) => [claim.id, fundingForClaims([claim.id], finance)])
  ), [claims, finance]);

  const matchesFunding = (claim) => {
    if (funding === "all") return true;
    const position = fundingByClaim.get(claim.id);
    if (funding === "unresolved") {
      return Boolean(position) && position.fundingPosition !== "not_requested" && !position.settled;
    }
    if (funding === "reconciliation_outstanding") {
      return position?.reconciliationApplies
        && ["outstanding", "amendment_requested"].includes(position.reconciliationPosition);
    }
    return position?.fundingPosition === funding;
  };

  const visible = claims.filter((claim) => (lifecycle === "all" || claim.lifecycle === lifecycle) &&
    (projectId === "all" || claim.projectId === projectId) &&
    matchesFunding(claim) &&
    withinReportedPeriod(claim.submittedAt, claim.decidedAt, from, to));

  // The position of everything currently in view. Amounts are summed over the
  // DISTINCT fund requests behind the visible claims, never per claim, because a
  // release belongs to a request and apportioning it would invent a figure the
  // database does not hold.
  const visibleFunding = fundingForClaims(visible.map((claim) => claim.id), finance);

  const activeFilterSummary = [
    describeActiveFilters({
      projectName: projectId !== "all" ? projectMap.get(projectId)?.projectName || "one project" : "",
      statusLabel: lifecycle !== "all" ? SITE_COST_LIFECYCLES[lifecycle] : "",
      from, to,
    }),
    funding !== "all" ? FUNDING_FILTER_LABELS[funding] || "" : "",
  ].filter(Boolean).join(" · ");

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">People and finance</p>
          <h1 className="mt-1 text-2xl font-semibold">Project Costs</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">Internal project-cost claims and Principal decisions. Approval does not mean released or paid.</p>
        </div>
        <Link to="/admin/site-costs/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
          {role === "owner" ? "Authorise project cost" : "New cost claim"}
        </Link>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Status
          <select value={lifecycle} onChange={(event) => setParam("status", event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
            <option value="all">All statuses</option>
            {Object.entries(SITE_COST_LIFECYCLES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Project
          <select value={projectId} onChange={(event) => setParam("project", event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
            <option value="all">All authorised projects</option>
            {[...new Set([...claims.map((claim) => claim.projectId), ...(projectId !== "all" ? [projectId] : [])])].map((id) => <option key={id} value={id}>{projectMap.get(id)?.projectName || "Project"}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium sm:col-span-2">Financial position
          <select value={funding} onChange={(event) => setParam("funding", event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
            <option value="all">Any financial position</option>
            <option value="unresolved">Anything still unresolved</option>
            {Object.entries(FUNDING_POSITIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            <option value="reconciliation_outstanding">Reconciliation outstanding</option>
          </select>
        </label>
      </div>

      {/* First view: what has been authorised, what actually moved, what was
          actually spent, and what is still unresolved — for exactly the claims in
          view. The two dimensions are stated separately so neither hides the
          other. */}
      {visibleFunding.requests.length > 0 && (
        <div className="mt-3 rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="text-sm font-semibold">Financial position of these costs</h2>
            <p className="text-xs text-gray-500">
              Across {visibleFunding.requests.length === 1 ? "1 fund request" : `${visibleFunding.requests.length} fund requests`}
            </p>
          </div>
          <dl className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="rounded-md bg-stone-50 px-3 py-2"><dt className="text-xs text-gray-500">Authorised</dt><dd className="mt-0.5 break-words text-sm font-semibold tabular-nums">{money(visibleFunding.authorisedAmount)}</dd></div>
            <div className="rounded-md bg-stone-50 px-3 py-2"><dt className="text-xs text-gray-500">Released</dt><dd className="mt-0.5 break-words text-sm font-semibold tabular-nums">{money(visibleFunding.releasedAmount)}</dd></div>
            <div className="rounded-md bg-stone-50 px-3 py-2"><dt className="text-xs text-gray-500">Actual spend</dt><dd className="mt-0.5 break-words text-sm font-semibold tabular-nums">{money(visibleFunding.actualExpenditureAmount)}</dd></div>
            <div className="rounded-md bg-stone-50 px-3 py-2"><dt className="text-xs text-gray-500">Unreleased</dt><dd className={`mt-0.5 break-words text-sm font-semibold tabular-nums ${visibleFunding.remainingUnreleasedAmount > 0 ? "text-amber-800" : ""}`}>{money(visibleFunding.remainingUnreleasedAmount)}</dd></div>
          </dl>
          <p className="mt-2 text-xs text-gray-500">
            A release is money that moved, not money spent. Actual spend is reconciled advance
            expenditure plus direct settled payments.
            {visibleFunding.hasAccountableAdvance && visibleFunding.varianceAmount !== 0 && (
              visibleFunding.varianceAmount > 0
                ? ` ${money(visibleFunding.varianceAmount)} of advance money is neither spent nor returned.`
                : ` ${money(Math.abs(visibleFunding.varianceAmount))} was spent beyond the advances released.`
            )}
          </p>
        </div>
      )}

      {activeFilterSummary && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/site-costs" className="min-h-11 py-2 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading project costs…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {status !== "loading" && !visible.length && <div className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-gray-600">No project costs match these filters.</div>}

      {visible.length > 0 && <>
        <div className="mt-5 hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-gray-500"><tr>
              <th className="px-4 py-3">Project / recipient</th><th className="px-4 py-3">Service date</th>
              <th className="px-4 py-3">Category</th><th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Financial position</th>
            </tr></thead>
            <tbody className="divide-y divide-stone-100">{visible.map((claim) => <tr key={claim.id} className="align-top">
              <td className="px-4 py-3"><Link className="font-semibold text-botanique-green hover:underline" to={`/admin/site-costs/${claim.id}`}>{projectMap.get(claim.projectId)?.projectName || "Project"}</Link><div className="text-xs text-gray-500">{claim.recipientLabel}</div><div className="text-xs text-gray-500">{profileMap.get(claim.requesterId) ? profilePresentationName(profileMap.get(claim.requesterId)) : "Authorised user"} · {date(claim.updatedAt)}</div></td>
              <td className="px-4 py-3">{date(`${claim.serviceDate}T00:00:00`)}</td><td className="px-4 py-3 capitalize">{claim.category.replaceAll("_", " ")}</td>
              <td className="px-4 py-3 text-right font-semibold">{money(claim.approvedTotal ?? claim.submittedTotal)}</td>
              <td className="px-4 py-3">{SITE_COST_LIFECYCLES[claim.lifecycle]}</td>
              {/* Never a fabricated position: a claim with no fund request behind
                  it says so, rather than reading as unpaid. */}
              <td className="px-4 py-3">{fundingSummaryPhrase(fundingByClaim.get(claim.id)) || <span className="text-gray-500">Not yet funded — no fund request</span>}
                {fundingByClaim.get(claim.id)?.requests.map((entry) => <div key={entry.request.id} className="text-xs"><Link className="text-botanique-green hover:underline" to={`/admin/fund-requests/${entry.request.id}`}>{entry.request.requestNumber}</Link></div>)}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">{visible.map((claim) => <Link key={claim.id} to={`/admin/site-costs/${claim.id}`} className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-botanique-green">{projectMap.get(claim.projectId)?.projectName || "Project"}</p><p className="text-sm text-gray-600">{claim.recipientLabel}</p></div><span className="text-xs font-semibold text-gray-600">{SITE_COST_LIFECYCLES[claim.lifecycle]}</span></div>
          <div className="mt-3 flex items-end justify-between gap-3"><p className="min-w-0 break-words text-xs text-gray-500">{date(`${claim.serviceDate}T00:00:00`)} · {claim.category.replaceAll("_", " ")}</p><p className="shrink-0 font-semibold tabular-nums">{money(claim.approvedTotal ?? claim.submittedTotal)}</p></div>
          <p className="mt-2 break-words border-t border-stone-100 pt-2 text-xs text-gray-600">{fundingSummaryPhrase(fundingByClaim.get(claim.id)) || "Not yet funded — no fund request"}</p>
        </Link>)}</div>
      </>}
    </section>
  );
}
