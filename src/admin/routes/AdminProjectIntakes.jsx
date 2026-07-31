import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useAdminIntake } from "../context/adminIntake";
import { canProposeProjectIntake } from "../utils/projectCapabilities";
import { canManageStaff } from "../utils/permissions";
import { INTAKE_STATE_LABELS, intakeTitle } from "../utils/intakeFormatters";
import { formatDateTime } from "../utils/activityFormat";

export default function AdminProjectIntakes() {
  const { role } = useAdminData();
  const { intakes, status, error } = useAdminIntake();
  const canPropose = canProposeProjectIntake(role);
  // Owner and manager only (staff/viewer never reach this route's data).
  const canSee = canManageStaff(role);

  if (!canSee) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Project intakes unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">Your role does not have access to project intakes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Project intakes</h1>
          <p className="mt-1 text-sm text-gray-500">
            {canPropose
              ? "Proposed projects awaiting Principal approval. A live project is created only on approval."
              : "Manager-proposed new projects. Approve to create the live project atomically."}
          </p>
        </div>
        {canPropose && (
          <Link
            to="/admin/projects/new"
            className="self-start rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark"
          >
            Propose new project
          </Link>
        )}
      </div>

      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}

      {status === "loading" ? (
        <p className="text-sm text-gray-500">Loading intakes…</p>
      ) : intakes.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-sm text-gray-500">
          No project intakes yet.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-xs text-gray-500">
              <tr>
                <th className="px-4 py-2 font-medium">Proposed project</th>
                <th className="px-4 py-2 font-medium">State</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
                <th className="px-4 py-2 font-medium sr-only">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {intakes.map((intake) => (
                <tr key={intake.id}>
                  <th className="px-4 py-3 font-medium text-botanique-charcoal">{intakeTitle(intake)}</th>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-xs font-semibold text-gray-700">
                      {INTAKE_STATE_LABELS[intake.state]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatDateTime(intake.requestedAt)}</td>
                  <td className="px-4 py-3">
                    <Link to={`/admin/project-intakes/${intake.id}`} className="font-semibold text-botanique-green hover:underline">
                      Review
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
