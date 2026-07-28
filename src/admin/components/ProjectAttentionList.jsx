import { Link } from "react-router-dom";
import { canEditProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import { projectsNeedingAttention } from "../utils/dashboardMetrics";
import { compactPersonName } from "../utils/personName";

export default function ProjectAttentionList({ projects, role }) {
  const showPendingActivation = canSeePendingActivation(role);
  const canEdit = canEditProjects(role);
  const items = projectsNeedingAttention(projects, undefined, {
    includePendingActivation: showPendingActivation,
  });

  return (
    <section
      className="rounded-lg border border-stone-200 bg-white"
      aria-labelledby="attention-title"
    >
      <div className="flex flex-col gap-1 border-b border-stone-100 px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
        <h2 id="attention-title" className="text-base font-semibold">Projects needing attention</h2>
        <p className="text-xs text-gray-500">{items.length} visible projects flagged</p>
      </div>

      {items.length === 0 ? (
        <p className="px-5 py-3 text-sm text-gray-500">No projects need attention.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map(({ project, reasons }) => {
            const pendingActivation =
              showPendingActivation && project.status === "Pending" && !project.archived;
            return (
              <li key={project.id} className="px-5 py-3.5">
                <div className="grid gap-3 md:grid-cols-[minmax(13rem,1.2fr)_minmax(16rem,1.5fr)_auto] md:items-center">
                  <div className="min-w-0">
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="font-semibold text-botanique-charcoal hover:text-botanique-green hover:underline"
                    >
                      {project.projectName}
                    </Link>
                    <p className="mt-1 text-xs text-gray-500">
                      {project.status} · {project.stage} ·{" "}
                      {compactPersonName(project.leadPersonName) || "Not assigned"}
                    </p>
                  </div>

                  <p className="text-xs leading-5 text-amber-800" aria-label="Attention reasons">
                    {reasons.join(" · ")}
                  </p>

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

              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
