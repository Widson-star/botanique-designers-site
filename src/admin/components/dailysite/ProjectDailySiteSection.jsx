// Compact Daily Site Operations panel for the project detail overview. Shows
// today's entry (if any) and recent entries for this project, with a quick
// action to record today's entry. No expenditure or labour-payment content.
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useDailySiteOperations } from "../../context/dailySiteOperations";
import { todayIso } from "../../utils/dailySiteFormatters";
import { canRecordDailySiteEntry, canSeeDailySiteOperations } from "../../utils/dailySiteCapabilities";
import {
  DISPOSITION_LABELS,
  ENTRY_STATE_LABELS,
  dispositionSummary,
  formatKes,
  formatWorkDate,
} from "../../utils/dailySiteFormatters";

const LIVE = ["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"];

export default function ProjectDailySiteSection({ project, role }) {
  const { entries } = useDailySiteOperations();
  const today = todayIso();

  const projectEntries = useMemo(
    () => entries.filter((entry) => entry.projectId === project.id),
    [entries, project.id]
  );
  const todaysEntry = projectEntries.find((entry) => entry.workDate === today && LIVE.includes(entry.state));
  const recent = useMemo(
    () => [...projectEntries].sort((a, b) => (a.workDate < b.workDate ? 1 : -1)).slice(0, 5),
    [projectEntries]
  );

  if (!canSeeDailySiteOperations(role)) return null;

  return (
    <section className="rounded-lg border border-stone-200 bg-white p-5" aria-labelledby="project-daily-site-title">
      <div className="flex items-center justify-between">
        <h2 id="project-daily-site-title" className="text-base font-semibold">Daily Site Record</h2>
        {canRecordDailySiteEntry(role) && !todaysEntry && (
          <Link
            to={`/admin/daily-site-operations/new?project=${project.id}`}
            className="rounded-md bg-botanique-green px-3 py-1.5 text-xs font-semibold text-white hover:bg-botanique-dark"
          >
            Record today's entry
          </Link>
        )}
      </div>

      {todaysEntry ? (
        <div className="mt-3 rounded-md border border-stone-200 px-3 py-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium text-botanique-charcoal">Today — {DISPOSITION_LABELS[todaysEntry.disposition]}</span>
            <Link to={`/admin/daily-site-operations/${todaysEntry.id}`} className="text-xs font-semibold text-botanique-green hover:underline">View</Link>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">
            {dispositionSummary(todaysEntry)}
            {todaysEntry.disposition === "working" ? ` · ${formatKes(todaysEntry.plannedLabourCost)}` : ""}
            {` · ${ENTRY_STATE_LABELS[todaysEntry.state]}`}
          </p>
        </div>
      ) : (
        <p className="mt-3 text-sm text-gray-500">No entry recorded for today.</p>
      )}

      {recent.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {recent.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between text-sm">
              <Link to={`/admin/daily-site-operations/${entry.id}`} className="text-botanique-green hover:underline">
                {formatWorkDate(entry.workDate)}
              </Link>
              <span className="text-xs text-gray-500">
                {DISPOSITION_LABELS[entry.disposition]} · {ENTRY_STATE_LABELS[entry.state]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
