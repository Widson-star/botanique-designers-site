import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useFundRequests } from "../context/fundRequests";
import {
  canDirectAuthoriseFundRequest, FUND_REQUEST_STATUSES, INTENDED_CUSTODY_TYPES,
} from "../utils/fundRequestCapabilities";
import { profilePresentationName } from "../utils/personName";
import { describeActiveFilters, withinReportedPeriod } from "../utils/listUrlFilters";

const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2 }).format(amount || 0);
const date = (value) => value ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value)) : "—";

// Filter state lives in the URL so a Reports drill-through arrives at exactly
// the project, status and period it referred to. A parameter narrows what the
// caller can already see; it grants nothing, and the database still decides
// which requests exist for this reader.
export default function AdminFundRequests() {
  const { role, projects, profiles } = useAdminData();
  const { requests, status, error } = useFundRequests();
  const [searchParams, setSearchParams] = useSearchParams();
  const statusFilter = searchParams.get("status") || "all";
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
  const isPrincipal = canDirectAuthoriseFundRequest(role);
  const visible = requests.filter((request) =>
    (statusFilter === "all" || request.status === statusFilter) &&
    (projectId === "all" || request.projectId === projectId) &&
    withinReportedPeriod(request.submittedAt, request.decidedAt, from, to));
  const activeFilterSummary = describeActiveFilters({
    projectName: projectId !== "all" ? projectMap.get(projectId)?.projectName || "one project" : "",
    statusLabel: statusFilter !== "all" ? FUND_REQUEST_STATUSES[statusFilter] : "",
    from, to,
  });

  const originOf = (request) => request.authorityType === "principal_direct"
    ? "Principal direct authority"
    : profileMap.get(request.requesterId)
      ? profilePresentationName(profileMap.get(request.requesterId))
      : "Authorised requester";

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">People and finance</p>
          <h1 className="mt-1 text-2xl font-semibold">Fund Requests</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Requests for Principal authority to make money available against approved claims.
            No funds have been released.
          </p>
        </div>
        <Link to="/admin/fund-requests/new" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
          {isPrincipal ? "Authorise funds directly" : "New fund request"}
        </Link>
      </div>

      <div className="mt-5 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-2">
        <label className="text-sm font-medium">Status
          <select value={statusFilter} onChange={(event) => setParam("status", event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
            <option value="all">All statuses</option>
            {Object.entries(FUND_REQUEST_STATUSES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Project
          <select value={projectId} onChange={(event) => setParam("project", event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
            <option value="all">All authorised projects</option>
            {[...new Set([...requests.map((request) => request.projectId), ...(projectId !== "all" ? [projectId] : [])])].map((id) => <option key={id} value={id}>{projectMap.get(id)?.projectName || "Project"}</option>)}
          </select>
        </label>
      </div>

      {activeFilterSummary && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/fund-requests" className="min-h-11 py-2 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading fund requests…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {status !== "loading" && !visible.length && <div className="mt-6 rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-gray-600">No fund requests match these filters.</div>}

      {visible.length > 0 && <>
        <div className="mt-5 hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
          <table className="w-full table-auto text-left text-sm">
            <thead className="bg-stone-50 text-xs uppercase tracking-wide text-gray-500"><tr>
              <th className="px-4 py-3">Request / project</th>
              <th className="px-4 py-3 text-right">Requested amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Custody intent</th>
              {isPrincipal && <th className="px-4 py-3">Round</th>}
              <th className="px-4 py-3">{isPrincipal ? "Origin / last activity" : "Last activity"}</th>
            </tr></thead>
            <tbody className="divide-y divide-stone-100">{visible.map((request) => <tr key={request.id}>
              <td className="px-4 py-3">
                <Link className="font-semibold text-botanique-green hover:underline" to={`/admin/fund-requests/${request.id}`}>{request.requestNumber}</Link>
                <div className="text-xs text-gray-500">{projectMap.get(request.projectId)?.projectName || "Project"}</div>
              </td>
              <td className="px-4 py-3 text-right font-semibold">{money(request.totalRequestedAmount)}</td>
              <td className="px-4 py-3">{FUND_REQUEST_STATUSES[request.status]}</td>
              <td className="px-4 py-3">{INTENDED_CUSTODY_TYPES[request.intendedCustodyType]}</td>
              {isPrincipal && <td className="px-4 py-3">{request.submissionRound}</td>}
              <td className="px-4 py-3">{isPrincipal ? originOf(request) : date(request.updatedAt)}
                {isPrincipal && <div className="text-xs text-gray-500">{date(request.updatedAt)}</div>}
              </td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="mt-5 grid gap-3 md:hidden">{visible.map((request) => <Link key={request.id} to={`/admin/fund-requests/${request.id}`} className="rounded-lg border border-stone-200 bg-white p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold text-botanique-green">{request.requestNumber}</p>
              <p className="text-sm text-gray-600">{projectMap.get(request.projectId)?.projectName || "Project"}</p>
            </div>
            <span className="text-xs font-semibold text-gray-600">{FUND_REQUEST_STATUSES[request.status]}</span>
          </div>
          <div className="mt-3 flex items-end justify-between">
            <p className="text-xs text-gray-500">{INTENDED_CUSTODY_TYPES[request.intendedCustodyType]} · {date(request.updatedAt)}</p>
            <p className="font-semibold">{money(request.totalRequestedAmount)}</p>
          </div>
        </Link>)}</div>
      </>}
    </section>
  );
}
