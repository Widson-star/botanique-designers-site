// Read-only Activity History for one project, from the immutable
// public.project_activities ledger. Users can never create/edit/delete rows.
// Field names, values, dates and profile references are formatted for humans;
// UUIDs and raw JSON are never surfaced. The live hosted ledger is currently
// empty, so the truthful empty state is "No data yet".
import { useEffect, useState } from "react";
import { useAdminData } from "../context/adminData";
import { formatActivity } from "../utils/activityFormat";

function ChangeRow({ change }) {
  return (
    <li className="text-sm">
      <span className="font-medium text-botanique-charcoal">{change.label}:</span>{" "}
      <span className="text-gray-500 line-through decoration-stone-300">{change.before}</span>{" "}
      <span aria-hidden="true">→</span>{" "}
      <span className="text-botanique-charcoal">{change.after}</span>
    </li>
  );
}

export default function ActivityHistory({ projectId }) {
  const { fetchActivities, profilesById } = useAdminData();
  // `loadedFor` tracks which project the current result belongs to; loading is
  // derived (loadedFor !== projectId) rather than set synchronously in-effect.
  const [loadedFor, setLoadedFor] = useState(null);
  const [error, setError] = useState("");
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchActivities(projectId)
      .then((rows) => {
        if (cancelled) return;
        setActivities(rows || []);
        setError("");
        setLoadedFor(projectId);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Unable to load activity history.");
        setActivities([]);
        setLoadedFor(projectId);
      });
    return () => {
      cancelled = true;
    };
  }, [fetchActivities, projectId]);

  if (loadedFor !== projectId) {
    return <p className="text-sm text-gray-500">Loading activity history…</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-700" role="alert">
        {error}
      </p>
    );
  }

  if (activities.length === 0) {
    return <p className="text-sm text-gray-500">No data yet</p>;
  }

  return (
    <ol className="space-y-4">
      {activities.map((raw) => {
        const activity = formatActivity(raw, profilesById);
        return (
          <li key={activity.id} className="border-l-2 border-stone-200 pl-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold text-botanique-charcoal">{activity.actionLabel}</p>
              <p className="text-xs text-gray-400">{activity.occurredAt}</p>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">By {activity.actor}</p>
            {activity.changes.length > 0 && (
              <ul className="mt-2 space-y-1">
                {activity.changes.map((change) => (
                  <ChangeRow key={change.field} change={change} />
                ))}
              </ul>
            )}
            {activity.reason && (
              <p className="mt-2 text-xs text-gray-500 italic">Reason: {activity.reason}</p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
