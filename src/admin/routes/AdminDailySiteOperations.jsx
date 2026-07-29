import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { todayIso } from "../utils/dailySiteFormatters";
import { canSeeDailySiteOperations, canRecordDailySiteEntry, summarizeCompliance } from "../utils/dailySiteCapabilities";
import { ROLES } from "../constants/roles";
import {
  DISPOSITION_LABELS,
  ENTRY_STATE_LABELS,
  dispositionSummary,
  formatKes,
  formatWorkDate,
} from "../utils/dailySiteFormatters";

const FILTERS = [
  { key: "today", label: "Today" },
  { key: "submitted", label: "Awaiting review" },
  { key: "late", label: "Late" },
  { key: "returned", label: "Returned" },
  { key: "accepted", label: "Accepted" },
  { key: "all", label: "All" },
];

function matchesFilter(entry, filter, today) {
  switch (filter) {
    case "today":
      return entry.workDate === today && ["draft", "submitted", "returned_for_correction", "resubmitted", "accepted"].includes(entry.state);
    case "submitted":
      return ["submitted", "resubmitted"].includes(entry.state);
    case "late":
      return entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state);
    case "returned":
      return entry.state === "returned_for_correction";
    case "accepted":
      return entry.state === "accepted";
    case "all":
    default:
      return true;
  }
}

export default function AdminDailySiteOperations() {
  const { role, projects } = useAdminData();
  const { entries, compliance, authorisedProjects, status, error } = useDailySiteOperations();
  const [filter, setFilter] = useState("today");
  const today = todayIso();
  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project])),
    [projects]
  );
  // A manager whose project authority has not been established yet.
  const noAuthority =
    role === ROLES.MANAGER && status === "ready" && (authorisedProjects || []).length === 0;

  const summary = useMemo(() => summarizeCompliance(compliance), [compliance]);
  const visibleEntries = useMemo(
    () => entries.filter((entry) => matchesFilter(entry, filter, today)),
    [entries, filter, today]
  );

  if (!canSeeDailySiteOperations(role)) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Daily site operations unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This role does not have access to daily site operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily site operations</h1>
          <p className="mt-1 text-sm text-gray-500">
            Morning site entries and compliance for active projects.
          </p>
        </div>
        {canRecordDailySiteEntry(role) && !noAuthority && (
          <Link
            to="/admin/daily-site-operations/new"
            className="inline-flex justify-center rounded-md bg-botanique-green px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-botanique-dark"
          >
            New site entry
          </Link>
        )}
      </div>

      {noAuthority && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5" role="status">
          <h2 className="text-base font-semibold text-amber-900">No projects assigned to you yet</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            You are not yet the lead of, or assigned to, any project, so there is nothing to
            record or track. Ask the owner to assign you to the active sites you manage — they
            will then appear here automatically.
          </p>
        </div>
      )}

      {status === "loading" && (
        <div className="rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm text-gray-600">
          Loading site entries…
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error || "Unable to load site operations."}
        </div>
      )}

      {/* Morning compliance summary */}
      <section aria-label="Morning compliance summary">
        <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-stone-200 bg-white sm:grid-cols-4">
          <SummaryCell label="Due today" value={summary.due} />
          <SummaryCell label="Missing" value={summary.missing} tone={summary.missing > 0 ? "attention" : "default"} />
          <SummaryCell label="Late" value={summary.late} tone={summary.late > 0 ? "attention" : "default"} />
          <SummaryCell label="Waived" value={summary.waived} />
        </div>
        {summary.missing > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-medium text-amber-900">Projects still needing a morning entry today</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {summary.missingProjects.map((row) => (
                <li key={row.projectId}>
                  <Link
                    to={`/admin/daily-site-operations/new?project=${row.projectId}`}
                    className="inline-flex items-center rounded-full border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
                  >
                    {row.projectName} → record
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {status === "ready" && summary.due > 0 && summary.missing === 0 && (
          <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            All active projects have a morning entry or an owner waiver for today.
          </p>
        )}
      </section>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Entry filters">
        {FILTERS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={filter === tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              filter === tab.key
                ? "bg-botanique-green text-white"
                : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Entries */}
      {visibleEntries.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No site entries in this view.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-stone-200 bg-white">
          <table className="w-full table-fixed text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs text-gray-500">
              <tr>
                <th className="w-[38%] px-3 py-3 font-medium md:px-4">Project</th>
                <th className="hidden px-4 py-3 font-medium sm:table-cell">Date</th>
                <th className="w-[32%] px-3 py-3 font-medium md:px-4">Plan</th>
                <th className="w-[30%] px-3 py-3 font-medium md:px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {visibleEntries.map((entry) => {
                const project = projectsById[entry.projectId];
                return (
                  <tr key={entry.id}>
                    <td className="break-words px-3 py-3 align-top md:px-4">
                      <Link to={`/admin/daily-site-operations/${entry.id}`} className="font-semibold text-botanique-green hover:underline">
                        {project?.projectName || "Authorised project"}
                      </Link>
                      <span className="mt-0.5 block text-xs text-gray-500 sm:hidden">{formatWorkDate(entry.workDate)}</span>
                    </td>
                    <td className="hidden px-4 py-3 align-top text-gray-600 sm:table-cell">{formatWorkDate(entry.workDate)}</td>
                    <td className="break-words px-3 py-3 align-top md:px-4">
                      <span className="block">{DISPOSITION_LABELS[entry.disposition]}</span>
                      <span className="block text-xs text-gray-500">
                        {dispositionSummary(entry)}
                        {entry.disposition === "working" ? ` · ${formatKes(entry.plannedLabourCost)}` : ""}
                      </span>
                    </td>
                    <td className="break-words px-3 py-3 align-top md:px-4">
                      <span>{ENTRY_STATE_LABELS[entry.state]}</span>
                      {entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state) && (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Late</span>
                      )}
                    </td>
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

function SummaryCell({ label, value, tone = "default" }) {
  return (
    <div className="border-b border-r border-stone-200 px-4 py-3 last:border-r-0 sm:border-b-0">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${tone === "attention" ? "text-amber-700" : "text-botanique-charcoal"}`}>
        {value}
      </p>
    </div>
  );
}
