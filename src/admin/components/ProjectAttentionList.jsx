import { Link } from "react-router-dom";
import ProjectBadge from "./ProjectBadge";
import { canEditProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import { projectsNeedingAttention } from "../utils/dashboardMetrics";

export default function ProjectAttentionList({ projects, role }) {
  const showPendingActivation = canSeePendingActivation(role);
  const canEdit = canEditProjects(role);
  const items = projectsNeedingAttention(projects, undefined, {
    includePendingActivation: showPendingActivation,
  });

  return (
    <section
      className="rounded-xl border border-stone-200 bg-white shadow-sm"
      aria-labelledby="attention-title"
    >
      <div className="flex flex-col gap-1 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-botanique-green">
            Operational focus
          </p>
          <h2 id="attention-title" className="mt-1 text-lg font-bold">
            Projects needing attention
          </h2>
        </div>
        <p className="text-xs text-gray-500">{items.length} visible projects flagged</p>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-6 text-sm text-gray-500">No projects need attention.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map(({ project, reasons }) => {
            const pendingActivation =
              showPendingActivation && project.status === "Pending" && !project.archived;
            return (
              <li key={project.id} className="px-5 py-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(15rem,1.5fr)_minmax(13rem,1fr)_auto] xl:items-center">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="font-semibold text-botanique-charcoal hover:text-botanique-green hover:underline"
                    >
                      {project.projectName}
                    </Link>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <ProjectBadge value={project.status} />
                      <ProjectBadge value={project.stage} />
                      <span className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-semibold text-gray-600">
                        {project.projectType}
                      </span>
                    </div>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <div>
                      <dt className="text-gray-400">Accountable lead</dt>
                      <dd className="mt-0.5 font-medium text-gray-700">
                        {project.leadPersonName || "Not assigned"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-gray-400">Target completion</dt>
                      <dd className="mt-0.5 font-medium text-gray-700">
                        {project.targetCompletionDate || "Not set"}
                      </dd>
                    </div>
                  </dl>

                  <div className="flex flex-wrap gap-2 xl:justify-end">
                    {canEdit && (
                      <Link
                        to={`/admin/projects/${project.id}/edit`}
                        className="rounded-md border border-stone-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-stone-50"
                      >
                        Edit
                      </Link>
                    )}
                    {pendingActivation && (
                      <Link
                        to={`/admin/projects/${project.id}`}
                        className="rounded-md bg-botanique-green px-3 py-2 text-xs font-semibold text-white hover:bg-botanique-dark"
                      >
                        Open to activate
                      </Link>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2" aria-label="Attention reasons">
                  {reasons.map((reason) => (
                    <span
                      key={reason}
                      className="rounded-md bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-800"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
