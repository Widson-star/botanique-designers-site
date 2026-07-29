// Owner-only "Pending activation" list, built from live data. NOT an approvals
// queue (no approval workflow exists before Phase 1B-A4) — it simply surfaces
// non-archived Pending projects the owner can edit or activate. Hidden entirely
// from managers.
import { Link } from "react-router-dom";
import { pendingActivationProjects } from "../utils/dashboardMetrics";
import { compactPersonName } from "../utils/personName";
import { portfolioPublicationLabel } from "../constants/projectStatus";

export default function PendingActivationList({ projects }) {
  const pending = pendingActivationProjects(projects);

  return (
    <section className="bg-white border border-stone-200 rounded-lg p-5" aria-label="Pending activation">
      <h2 className="font-bold text-lg mb-1">Pending activation</h2>
      <p className="text-sm text-gray-500 mb-4">
        Projects awaiting owner activation. Review the proposal, then edit or activate.
      </p>

      {pending.length === 0 ? (
        <p className="text-sm text-gray-500">No data yet</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {pending.map((project) => (
            <li key={project.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="font-semibold text-botanique-charcoal hover:underline"
                  >
                    {project.projectName}
                  </Link>
                  <dl className="mt-1 grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    <div>
                      <dt className="inline font-medium">Proposed target: </dt>
                      <dd className="inline">{project.targetCompletionDate || "Not set"}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Lead: </dt>
                      <dd className="inline">{compactPersonName(project.leadPersonName)}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Stage: </dt>
                      <dd className="inline">{project.stage}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Type: </dt>
                      <dd className="inline">{project.projectType}</dd>
                    </div>
                    <div>
                      <dt className="inline font-medium">Portfolio: </dt>
                      <dd className="inline">{portfolioPublicationLabel(project.portfolioPermissionStatus)}</dd>
                    </div>
                  </dl>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/admin/projects/${project.id}/edit`}
                    className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-stone-50"
                  >
                    Edit
                  </Link>
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="rounded-md bg-botanique-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-botanique-dark"
                  >
                    Open to activate
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
