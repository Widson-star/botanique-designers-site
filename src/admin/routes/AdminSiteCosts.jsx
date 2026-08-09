import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useSiteCosts } from "../context/siteCosts";
import { SITE_COST_LIFECYCLES } from "../utils/siteCostCapabilities";
import { profilePresentationName } from "../utils/personName";
import { describeActiveFilters, withinReportedPeriod } from "../utils/listUrlFilters";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2 }).format(amount || 0);
const date = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "—";

// Filter state lives in the URL so a Reports drill-through arrives at exactly
// the project, status and period it referred to, and so the filtered view can
// be shared or restored with the browser's back button. Access is unchanged and
// still enforced by the database: a project id in the URL grants nothing, it
// only narrows what the caller's own claims already contain.
export default function AdminSiteCosts() {
  const { role, projects, profiles } = useAdminData();
  const { claims, status, error } = useSiteCosts();
  const [searchParams, setSearchParams] = useSearchParams();
  const lifecycle = searchParams.get("status") || "all";
  const projectId = searchParams.get("project") || "all";
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
  const visible = claims.filter((claim) => (lifecycle === "all" || claim.lifecycle === lifecycle) &&
    (projectId === "all" || claim.projectId === projectId) &&
    withinReportedPeriod(claim.submittedAt, claim.decidedAt, from, to));
  const activeFilterSummary = describeActiveFilters({
    projectName: projectId !== "all" ? projectMap.get(projectId)?.projectName || "one project" : "",
    statusLabel: lifecycle !== "all" ? SITE_COST_LIFECYCLES[lifecycle] : "",
    from, to,
  });

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
      </div>

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
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Requester / updated</th>
            </tr></thead>
            <tbody className="divide-y divide-stone-100">{visible.map((claim) => <tr key={claim.id}>
              <td className="px-4 py-3"><Link className="font-semibold text-botanique-green hover:underline" to={`/admin/site-costs/${claim.id}`}>{projectMap.get(claim.projectId)?.projectName || "Project"}</Link><div className="text-xs text-gray-500">{claim.recipientLabel}</div></td>
              <td className="px-4 py-3">{date(`${claim.serviceDate}T00:00:00`)}</td><td className="px-4 py-3 capitalize">{claim.category.replaceAll("_", " ")}</td>
              <td className="px-4 py-3 text-right font-semibold">{money(claim.approvedTotal ?? claim.submittedTotal)}</td>
              <td className="px-4 py-3">{SITE_COST_LIFECYCLES[claim.lifecycle]}</td>
              <td className="px-4 py-3">{profileMap.get(claim.requesterId) ? profilePresentationName(profileMap.get(claim.requesterId)) : "Authorised user"}<div className="text-xs text-gray-500">{date(claim.updatedAt)}</div></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">{visible.map((claim) => <Link key={claim.id} to={`/admin/site-costs/${claim.id}`} className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-botanique-green">{projectMap.get(claim.projectId)?.projectName || "Project"}</p><p className="text-sm text-gray-600">{claim.recipientLabel}</p></div><span className="text-xs font-semibold text-gray-600">{SITE_COST_LIFECYCLES[claim.lifecycle]}</span></div>
          <div className="mt-3 flex items-end justify-between"><p className="text-xs text-gray-500">{date(`${claim.serviceDate}T00:00:00`)} · {claim.category.replaceAll("_", " ")}</p><p className="font-semibold">{money(claim.approvedTotal ?? claim.submittedTotal)}</p></div>
        </Link>)}</div>
      </>}
    </section>
  );
}
