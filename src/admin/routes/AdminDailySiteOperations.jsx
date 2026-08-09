import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { financialFollowUpSummary } from "../utils/dailySiteCostLink";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { todayIso } from "../utils/dailySiteFormatters";
import { canSeeDailySiteOperations, canRecordDailySiteEntry, summarizeCompliance } from "../utils/dailySiteCapabilities";
import { ROLES } from "../constants/roles";
import { describeActiveFilters, withinReportedWorkDates } from "../utils/listUrlFilters";
import {
  DISPOSITION_LABELS,
  ENTRY_STATE_LABELS,
  formatKes,
  formatWorkDate,
  plannedActivitySummary,
  plannedWorkforceSummary,
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

// Filter state lives in the URL so a Reports drill-through arrives at exactly
// the project, status and period it referred to. A parameter narrows what the
// caller can already see; entry visibility remains database-enforced.
export default function AdminDailySiteOperations() {
  const { role, projects } = useAdminData();
  const { entries, compliance, authorisedProjects, status, error } = useDailySiteOperations();
  // Read-only: the list shows whether a day already has a cost claim so the
  // 4:00 pm hand-off is visible without opening every record.
  const { claims } = useSiteCosts();
  const { requests, allocations, releases, acquittals } = useFundRequests();
  const finance = { requests, allocations, releases, acquittals };
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get("status") || "today";
  const projectFilter = searchParams.get("project") || "all";
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const today = todayIso();

  function setStatusFilter(value) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== "today") next.set("status", value);
    else next.delete("status");
    setSearchParams(next, { replace: true });
  }
  const projectsById = useMemo(
    () => Object.fromEntries(projects.map((project) => [project.id, project])),
    [projects]
  );
  // A manager whose project authority has not been established yet.
  const noAuthority =
    role === ROLES.MANAGER && status === "ready" && (authorisedProjects || []).length === 0;

  const summary = useMemo(() => summarizeCompliance(compliance), [compliance]);
  const visibleEntries = useMemo(
    () => entries.filter((entry) =>
      matchesFilter(entry, filter, today) &&
      (projectFilter === "all" || entry.projectId === projectFilter) &&
      withinReportedWorkDates(entry.workDate, from, to)),
    [entries, filter, today, projectFilter, from, to]
  );
  const activeFilterSummary = describeActiveFilters({
    projectName: projectFilter !== "all" ? projectsById[projectFilter]?.projectName || "one project" : "",
    statusLabel: "",
    from,
    to,
  });

  if (!canSeeDailySiteOperations(role)) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Daily Site Record unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This role does not have access to daily site operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-stone-200 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Daily Site Record</h1>
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
          <SummaryCell label="Not required" value={summary.waived} />
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
            All active projects have a morning entry or were marked not required today.
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
            onClick={() => setStatusFilter(tab.key)}
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

      {activeFilterSummary && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/daily-site-operations" className="min-h-11 py-2 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {/* Entries */}
      {visibleEntries.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white p-8 text-center">
          <p className="text-sm text-gray-500">No site entries in this view.</p>
        </div>
      ) : (
        <>
          {/* Desktop / wide tablet: structured table (auto layout so no column
              is starved to a zero width and the date never wraps vertically). */}
          <div className="hidden overflow-hidden rounded-lg border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Project</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Work date</th>
                  <th className="px-4 py-3 font-medium">Site plan</th>
                  <th className="px-4 py-3 font-medium">Planned workforce</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleEntries.map((entry) => {
                  const project = projectsById[entry.projectId];
                  const isLateBadge =
                    entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state);
                  const followUp = financialFollowUpSummary(entry, claims, role, finance);
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="px-4 py-3">
                        <span className="block max-w-[16rem] break-words font-semibold text-botanique-charcoal">
                          {project?.projectName || "Authorised project"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatWorkDate(entry.workDate)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 line-clamp-2 max-w-[22rem] break-words text-xs text-gray-500">
                          {plannedActivitySummary(entry)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        <span className="block">{plannedWorkforceSummary(entry)}</span>
                        {entry.disposition === "working" && (
                          <span className="mt-0.5 block text-xs text-gray-500">
                            {formatKes(entry.plannedLabourCost)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-botanique-charcoal">{ENTRY_STATE_LABELS[entry.state]}</span>
                        {isLateBadge && (
                          <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Late
                          </span>
                        )}
                        {followUp && (
                          <span className="mt-0.5 block text-xs text-gray-500">{followUp}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          to={`/admin/daily-site-operations/${entry.id}`}
                          className="font-semibold text-botanique-green hover:underline"
                        >
                          {reviewLabel(entry.state)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile / narrow tablet: stacked cards (no compressed table, no
              horizontal overflow, large touch targets, plain-language labels). */}
          <ul className="space-y-3 md:hidden">
            {visibleEntries.map((entry) => {
              const project = projectsById[entry.projectId];
              const isLateBadge =
                entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state);
              const followUp = financialFollowUpSummary(entry, claims, role, finance);
              return (
                <li key={entry.id}>
                  <Link
                    to={`/admin/daily-site-operations/${entry.id}`}
                    className="block rounded-lg border border-stone-200 bg-white p-4 transition hover:border-botanique-green/40 hover:bg-stone-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="break-words font-semibold text-botanique-charcoal">
                        {project?.projectName || "Authorised project"}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-botanique-green">
                        {reviewLabel(entry.state)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-600">{formatWorkDate(entry.workDate)}</p>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <CardFact label="Site activity">
                        <span className="font-medium text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 block break-words text-xs text-gray-500">
                          {plannedActivitySummary(entry)}
                        </span>
                      </CardFact>
                      <CardFact label="Planned workforce">
                        <span className="text-botanique-charcoal">{plannedWorkforceSummary(entry)}</span>
                        {entry.disposition === "working" && (
                          <span className="mt-0.5 block text-xs text-gray-500">
                            Est. {formatKes(entry.plannedLabourCost)}
                          </span>
                        )}
                      </CardFact>
                    </dl>

                    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-stone-100 pt-3">
                      <span className="rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-gray-600">
                        {ENTRY_STATE_LABELS[entry.state]}
                      </span>
                      {isLateBadge && (
                        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          Late
                        </span>
                      )}
                      {followUp && <span className="text-xs text-gray-500">{followUp}</span>}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* The hand-off, stated once at the foot of the day's list. No claim is
          created here; Site Costs owns the claim, its decision and its history. */}
      {canSeeSiteCosts(role) && (
        <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Once a site record is submitted, the day's known costs move into a cost claim — normally
            by 4:00 pm. Raising a claim is always a deliberate step.
          </p>
          <Link
            to="/admin/site-costs"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md border border-stone-300 bg-white px-4 text-sm font-semibold text-botanique-green hover:bg-stone-50"
          >
            Go to Project Costs
          </Link>
        </div>
      )}
    </div>
  );
}

// The list is read-only for a manager (they review or open); the owner can act
// on a submitted entry. A single "Open"/"Review" verb keeps the action clear.
function reviewLabel(state) {
  return ["submitted", "resubmitted"].includes(state) ? "Review" : "Open";
}

function CardFact({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
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
