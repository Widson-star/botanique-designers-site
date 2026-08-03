// Compact attention panel, per `docs/ui-authority/operations-hub/01-dashboard-authority.png`.
//
// The authority screen pairs this beside "Due today" as one of two SHORT action
// panels. It is deliberately not an operational history: only the most pressing
// few projects are listed, each as one row with a single clear action, and the
// rest are reached through "View all". Nothing here is invented — every row and
// every reason comes from `projectsNeedingAttention`, which reads only fields
// already present on the visible project record.
import { Link } from "react-router-dom";
import { canEditProjects, canSeePendingActivation } from "../utils/projectCapabilities";
import { projectsNeedingAttention } from "../utils/dashboardMetrics";
import { compactPersonName } from "../utils/personName";

// How many projects the panel shows before deferring to the full Projects list.
export const ATTENTION_PREVIEW_LIMIT = 4;

// Reasons carry weight, and the panel must not shout. Red is reserved for
// genuinely urgent state; everything else is amber caution.
const URGENT_REASON = /^(Overdue next action|Blocker:)/;

function reasonTone(reasons) {
  return reasons.some((reason) => URGENT_REASON.test(reason))
    ? "text-red-700"
    : "text-amber-700";
}

// A restrained status dot, matching the authority screen's leading marker.
function statusDotClass(reasons) {
  return reasons.some((reason) => URGENT_REASON.test(reason))
    ? "bg-red-500"
    : "bg-amber-500";
}

export default function ProjectAttentionList({ projects, role }) {
  const showPendingActivation = canSeePendingActivation(role);
  const canEdit = canEditProjects(role);
  const items = projectsNeedingAttention(projects, undefined, {
    includePendingActivation: showPendingActivation,
  });
  const visible = items.slice(0, ATTENTION_PREVIEW_LIMIT);

  return (
    <section
      className="flex min-w-0 flex-col rounded-lg border border-stone-200 bg-white"
      aria-labelledby="attention-title"
    >
      <div className="flex items-center justify-between gap-3 px-5 pb-3 pt-4">
        <div className="flex min-w-0 items-center gap-2">
          <h2 id="attention-title" className="text-base font-semibold">
            Projects needing attention
          </h2>
          {items.length > 0 && (
            <span
              className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold tabular-nums text-amber-700"
              data-attention-count
            >
              {items.length}
            </span>
          )}
        </div>
        {items.length > visible.length && (
          <Link
            to="/admin/projects"
            className="shrink-0 text-sm font-medium text-botanique-green hover:underline"
          >
            View all
          </Link>
        )}
      </div>

      {items.length === 0 ? (
        <p className="px-5 pb-4 text-sm text-gray-500">No projects need attention.</p>
      ) : (
        <ul className="divide-y divide-stone-100 border-t border-stone-100">
          {visible.map(({ project, reasons }) => {
            const pendingActivation =
              showPendingActivation && project.status === "Pending" && !project.archived;
            return (
              <li key={project.id} className="flex min-w-0 items-start gap-3 px-5 py-3">
                <span
                  className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotClass(reasons)}`}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <Link
                    to={`/admin/projects/${project.id}`}
                    className="block truncate text-sm font-semibold text-botanique-charcoal hover:text-botanique-green hover:underline"
                  >
                    {project.projectName}
                  </Link>
                  <p className="mt-0.5 truncate text-xs text-gray-500">
                    {project.status} · {project.stage} ·{" "}
                    {compactPersonName(project.leadPersonName) || "Not assigned"}
                  </p>
                  <p
                    className={`mt-1 text-xs leading-5 ${reasonTone(reasons)}`}
                    aria-label="Attention reasons"
                  >
                    {reasons.join(" · ")}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {pendingActivation ? (
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="rounded-md bg-botanique-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-botanique-dark"
                    >
                      Open to activate
                    </Link>
                  ) : (
                    <Link
                      to={`/admin/projects/${project.id}`}
                      className="rounded-md border border-stone-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-stone-50"
                    >
                      Open
                    </Link>
                  )}
                  {canEdit && (
                    <Link
                      to={`/admin/projects/${project.id}/edit`}
                      className="text-xs font-medium text-gray-500 hover:text-botanique-green hover:underline"
                    >
                      Edit
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
