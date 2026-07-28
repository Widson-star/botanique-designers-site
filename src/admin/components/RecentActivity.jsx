import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { formatActivity } from "../utils/activityFormat";
import { compactPersonName } from "../utils/personName";

const MAX_EVENTS = 6;

function conciseChanges(changes) {
  if (changes.length === 0) return "No field details recorded.";
  return changes
    .slice(0, 2)
    .map((change) => `${change.label}: ${change.before} → ${change.after}`)
    .join(" · ");
}

export default function RecentActivity({ projects, profilesById, fetchActivities }) {
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState(projects.length === 0 ? "ready" : "loading");

  const projectNameById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project.projectName])),
    [projects]
  );
  const projectIdsKey = useMemo(
    () => projects.map((project) => project.id).join("|"),
    [projects]
  );

  useEffect(() => {
    if (!projectIdsKey) return undefined;

    let cancelled = false;
    async function load() {
      try {
        const projectIds = projectIdsKey.split("|");
        const groups = await Promise.all(
          projectIds.map(async (projectId) => {
            const activities = await fetchActivities(projectId);
            return activities.map((activity) => ({ ...activity, projectId }));
          })
        );
        if (cancelled) return;
        setRows(
          groups
            .flat()
            .sort(
              (a, b) =>
                new Date(b.occurred_at).getTime() - new Date(a.occurred_at).getTime()
            )
            .slice(0, MAX_EVENTS)
        );
        setStatus("ready");
      } catch {
        if (!cancelled) {
          setRows([]);
          setStatus("error");
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [fetchActivities, projectIdsKey]);

  const visibleStatus = projects.length === 0 ? "ready" : status;
  const visibleRows = projects.length === 0 ? [] : rows;

  return (
    <section
      className="rounded-lg border border-stone-200 bg-white p-5"
      aria-labelledby="recent-activity-title"
    >
      <h2 id="recent-activity-title" className="text-base font-semibold">Recent activity</h2>

      {visibleStatus === "loading" && (
        <p className="mt-4 text-sm text-gray-500">Loading recent activity…</p>
      )}
      {visibleStatus === "error" && (
        <p className="mt-4 text-sm text-gray-500">Recent activity could not be loaded.</p>
      )}
      {visibleStatus === "ready" && visibleRows.length === 0 && (
        <p className="mt-4 text-sm text-gray-500">No activity recorded yet.</p>
      )}
      {visibleStatus === "ready" && visibleRows.length > 0 && (
        <ul className="mt-4 divide-y divide-stone-100">
          {visibleRows.map((raw) => {
            const activity = formatActivity(raw, profilesById);
            return (
              <li key={raw.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-botanique-charcoal">
                      {activity.actionLabel}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {compactPersonName(
                        activity.actor,
                        profilesById[raw.actor_id]
                      )} ·{" "}
                      <Link
                        to={`/admin/projects/${raw.projectId}?tab=activity`}
                        className="font-semibold text-botanique-green hover:underline"
                      >
                        {projectNameById[raw.projectId] || "Visible project"}
                      </Link>
                    </p>
                  </div>
                  <time className="shrink-0 text-[11px] text-gray-400">
                    {activity.occurredAt}
                  </time>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-gray-600">
                  {conciseChanges(activity.changes)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
