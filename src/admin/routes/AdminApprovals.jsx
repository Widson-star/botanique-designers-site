import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useAdminApprovals } from "../context/adminApprovals";
import {
  APPROVAL_STATE_LABELS,
  APPROVAL_TYPE_LABELS,
} from "../utils/approvalFormatters";
import { formatDateTime } from "../utils/activityFormat";
import { profilePresentationName } from "../utils/personName";
import { canSeeApprovals } from "../utils/approvalCapabilities";

export default function AdminApprovals() {
  const { role, projects, profilesById } = useAdminData();
  const { requests, status, error } = useAdminApprovals();
  const projectsById = Object.fromEntries(projects.map((project) => [project.id, project]));
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
      {status === "ready" && requests.length === 0 && (
        <div className="rounded-lg border border-stone-200 bg-white p-8">
          <h2 className="font-semibold">No approval requests</h2>
          <p className="mt-1 text-sm text-gray-500">Eligible protected changes can be requested from a project record.</p>
        </div>
      )}
      {requests.length > 0 && (
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
              {requests.map((request) => {
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
