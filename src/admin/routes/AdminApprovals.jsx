import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useAdminApprovals } from "../context/adminApprovals";
import {
  APPROVAL_STATE_LABELS,
  APPROVAL_TYPE_LABELS,
} from "../utils/approvalFormatters";
import { formatDateTime } from "../utils/activityFormat";
import { profilePresentationName } from "../utils/personName";
import { ACTIVE_APPROVAL_STATES, canSeeApprovals } from "../utils/approvalCapabilities";
import { describeActiveFilters, withinReportedApprovalDates } from "../utils/listUrlFilters";

// Filter state lives in the URL so a Reports drill-through arrives at exactly
// the project, status and period it referred to. `status=open` means every
// state that is still awaiting a decision. A parameter narrows what the caller
// can already see and grants nothing.
function matchesState(request, stateFilter) {
  if (stateFilter === "all") return true;
  if (stateFilter === "open") return ACTIVE_APPROVAL_STATES.includes(request.state);
  return request.state === stateFilter;
}

export default function AdminApprovals() {
  const { role, projects, profilesById } = useAdminData();
  const { requests, status, error } = useAdminApprovals();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectsById = Object.fromEntries(projects.map((project) => [project.id, project]));
  const projectFilter = searchParams.get("project") || "all";
  const stateFilter = searchParams.get("status") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";

  const visibleRequests = useMemo(
    () => requests.filter((request) =>
      (projectFilter === "all" || request.projectId === projectFilter) &&
      matchesState(request, stateFilter) &&
      withinReportedApprovalDates(request.requestedAt, request.reviewedAt, request.decidedAt, from, to)),
    [requests, projectFilter, stateFilter, from, to]
  );

  const activeFilterSummary = describeActiveFilters({
    projectName: projectFilter !== "all" ? projectsById[projectFilter]?.projectName || "one project" : "",
    statusLabel: stateFilter === "open" ? "Awaiting a decision" : stateFilter !== "all" ? APPROVAL_STATE_LABELS[stateFilter] || "" : "",
    from,
    to,
  });

  function clearFilters() {
    setSearchParams(new URLSearchParams(), { replace: true });
  }
  if (!canSeeApprovals(role)) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Approvals unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This role does not have access to project approvals.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Approvals</h1>
        <p className="mt-1 text-sm text-gray-500">
          Project change requests and their immutable decision history.
        </p>
      </div>
      {status === "loading" && (
        <div className="rounded-lg border border-stone-200 bg-white p-6 text-sm text-gray-500">
          Loading approvals…
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}
      {activeFilterSummary && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <button type="button" onClick={clearFilters} className="min-h-11 py-2 font-semibold text-botanique-green hover:underline">
            Clear filters
          </button>
        </div>
      )}
      {status === "ready" && visibleRequests.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h2 className="font-semibold">No approval requests</h2>
          <p className="mt-1 text-sm text-gray-500">
            {activeFilterSummary
              ? "Nothing matches these filters."
              : "Eligible protected changes can be requested from a project record."}
          </p>
        </div>
      )}
      {visibleRequests.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs text-gray-500">
              <tr>
                <th className="w-[30%] px-3 py-3 font-medium md:px-4 lg:w-auto">Request</th>
                <th className="w-[42%] px-3 py-3 font-medium md:px-4 lg:w-auto">Project</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Requester</th>
                <th className="w-[28%] px-3 py-3 font-medium md:px-4 lg:w-auto">State</th>
                <th className="hidden px-4 py-3 font-medium lg:table-cell">Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visibleRequests.map((request) => {
                const project = projectsById[request.projectId];
                const requester = profilesById[request.requesterId];
                return (
                  <tr key={request.id}>
                    <td className="break-words px-3 py-3 align-top md:px-4">
                      <Link to={`/admin/approvals/${request.id}`} className="font-semibold text-botanique-green hover:underline">
                        {APPROVAL_TYPE_LABELS[request.approvalType]}
                      </Link>
                    </td>
                    <td className="break-words px-3 py-3 align-top md:px-4">{project?.projectName || "Authorised project"}</td>
                    <td className="hidden px-4 py-3 align-top lg:table-cell">
                      {requester ? profilePresentationName(requester, "Authorised requester") : "Authorised requester"}
                    </td>
                    <td className="break-words px-3 py-3 align-top md:px-4">{APPROVAL_STATE_LABELS[request.state]}</td>
                    <td className="hidden px-4 py-3 text-gray-500 lg:table-cell">{formatDateTime(request.requestedAt)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
