// Daily Site Record — the day's operational position.
//
// Visual authority: docs/ui-authority/operations-hub/working-authority/
// 08-daily-site-record-list-working-authority.png (frozen, Visual Authority
// Tranche 1). The composition the authority settles, top to bottom:
//
//   1. the day's counts, before any record
//   2. what still needs a record at all
//   3. compact filtering, including which day is being read
//   4. one row per record: site, day, plan, workforce, planned cost, status,
//      and the single next action that row is waiting for
//   5. the hand-off to cost claims, stated once
//
// Deliberate deviations from the authority image are recorded in
// docs/ui-authority/operations-hub/VISUAL-AUTHORITY-TRANCHE-1.md. The two that
// matter here: the illustrative image shows no missing record, so its five cards
// have room for "Accepted" — the real page keeps the missing-record band, which
// is the more urgent truth; and the per-row overflow menu is not implemented,
// because no per-row action has been settled that the row itself does not
// already offer.
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useSiteCosts } from "../context/siteCosts";
import { useFundRequests } from "../context/fundRequests";
import { financialFollowUpSummary } from "../utils/dailySiteCostLink";
import { canSeeSiteCosts } from "../utils/siteCostCapabilities";
import { todayIso } from "../utils/dailySiteFormatters";
import {
  canSeeDailySiteOperations, canRecordDailySiteEntry, canReviewDailySiteEntry, summarizeCompliance,
} from "../utils/dailySiteCapabilities";
import { nextActionLabel, projectMonogram, summariseDay } from "../utils/dailySiteDaySummary";
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

// Status badge tone. Restrained: colour marks what is waiting or wrong, and
// everything settled stays quiet.
const STATE_TONE = {
  draft: "bg-stone-100 text-gray-700",
  submitted: "bg-amber-100 text-amber-900",
  resubmitted: "bg-amber-100 text-amber-900",
  returned_for_correction: "bg-orange-100 text-orange-900",
  accepted: "bg-emerald-100 text-emerald-800",
  voided: "bg-stone-100 text-gray-600",
  superseded: "bg-stone-100 text-gray-600",
};

const CARD_TONE = {
  default: "text-botanique-charcoal",
  waiting: "text-amber-700",
  attention: "text-red-700",
  settled: "text-emerald-700",
};

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

// The timing line under the status badge — when the record actually arrived, and
// whether that was late. Never a deadline this product does not hold.
function timingLine(entry) {
  if (entry.reviewedAt && entry.state === "accepted") {
    return `Accepted ${shortTime(entry.reviewedAt)}`;
  }
  if (entry.submittedAt) {
    return `${entry.isLate ? "Submitted late" : "Submitted"} ${shortTime(entry.submittedAt)}`;
  }
  if (entry.state === "draft") return "Not yet submitted";
  return "";
}

function shortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
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
  const canReview = canReviewDailySiteEntry(role);

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  // One calendar day, expressed through the from/to contract the whole product
  // already shares, so a day chosen here and a day arrived at from Reports are
  // the same URL.
  function setWorkDate(value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("from", value);
      next.set("to", value);
      // A single named day answers for itself; keeping "Today" selected as well
      // would silently return nothing on any other date.
      if (value !== today) next.set("status", "all");
    } else {
      next.delete("from");
      next.delete("to");
    }
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
  const dayCards = useMemo(() => summariseDay(entries, compliance, today), [entries, compliance, today]);
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
  // Projects that actually have a record in view, so the filter offers real
  // choices rather than every project the reader can see.
  const filterableProjects = useMemo(() => {
    const ids = new Set(entries.map((entry) => entry.projectId));
    if (projectFilter !== "all") ids.add(projectFilter);
    return [...ids].map((id) => ({ id, name: projectsById[id]?.projectName || "Project" }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [entries, projectsById, projectFilter]);

  if (!canSeeDailySiteOperations(role)) {
    return (
      <div className="rounded-lg border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Daily Site Record unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This role does not have access to daily site operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Daily Site Record</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Capture and review daily progress at every site. Completed records feed directly into
            cost claims.
          </p>
        </div>
        {canRecordDailySiteEntry(role) && !noAuthority && (
          <Link
            to="/admin/daily-site-operations/new"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-md bg-botanique-green px-4 text-sm font-semibold text-white transition hover:bg-botanique-dark"
          >
            New site record
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
          Loading site records…
        </div>
      )}
      {status === "error" && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error || "Unable to load site operations."}
        </div>
      )}

      {/* 1. The day's position, before any individual record. */}
      <section aria-label="Today's site record position">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {dayCards.map((card) => (
            <div key={card.key} className="rounded-lg border border-stone-200 bg-white px-3.5 py-3">
              <p className="text-xs font-medium text-gray-500">{card.label}</p>
              <p className={`mt-1 text-2xl font-semibold tabular-nums ${CARD_TONE[card.tone]}`}>
                {card.value}
              </p>
              <p className="mt-0.5 truncate text-[11px] text-gray-500">{card.hint}</p>
            </div>
          ))}
        </div>

        {/* 2. Attention before records: a site with no record at all outranks
            every record that already exists. */}
        {summary.missing > 0 && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">
              {summary.missing === 1
                ? "One site still needs a morning record today"
                : `${summary.missing} sites still need a morning record today`}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {summary.missingProjects.map((row) => (
                <li key={row.projectId}>
                  <Link
                    to={`/admin/daily-site-operations/new?project=${row.projectId}`}
                    className="inline-flex min-h-9 items-center rounded-full border border-amber-300 bg-white px-3 text-sm font-medium text-amber-900 hover:bg-amber-100"
                  >
                    {row.projectName} → record
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        {status === "ready" && summary.due > 0 && summary.missing === 0 && (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-900">
            Every active site has a morning record today, or was marked not required.
          </p>
        )}
      </section>

      {/* 3. Compact filtering: which records, and which day. */}
      <section className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Record filters">
          {FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setParam("status", tab.key, "today")}
              className={`min-h-9 rounded-full px-3.5 text-sm font-medium transition ${
                filter === tab.key
                  ? "bg-botanique-green text-white"
                  : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <span className="shrink-0">Work date</span>
            <input
              type="date"
              value={from && from === to ? from : ""}
              onChange={(event) => setWorkDate(event.target.value)}
              className="min-h-9 rounded-md border border-stone-300 bg-white px-2.5 text-sm"
            />
          </label>
          {filterableProjects.length > 1 && (
            <label className="flex items-center gap-2 text-sm text-gray-600">
              <span className="shrink-0">Site</span>
              <select
                value={projectFilter}
                onChange={(event) => setParam("project", event.target.value, "all")}
                className="min-h-9 max-w-[12rem] rounded-md border border-stone-300 bg-white px-2.5 text-sm"
              >
                <option value="all">All sites</option>
                {filterableProjects.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </section>

      {activeFilterSummary && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/daily-site-operations" className="min-h-11 py-2 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {/* 4. The records. */}
      {visibleEntries.length === 0 ? (
        <div className="rounded-lg border border-stone-200 bg-white px-5 py-6">
          <p className="text-sm font-medium text-botanique-charcoal">No site records in this view</p>
          <p className="mt-1 text-sm text-gray-500">
            {filter === "today"
              ? "Nothing has been recorded for today yet under these filters."
              : "Try another status, day or site."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop / wide tablet: structured table (auto layout so no column
              is starved to a zero width and the date never wraps vertically). */}
          <div className="hidden overflow-x-auto rounded-lg border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-stone-200 bg-stone-50 text-xs text-gray-500">
                <tr>
                  <th className="w-[26%] px-4 py-3 font-medium">Project / Site</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Work date</th>
                  <th className="w-[20%] px-4 py-3 font-medium">Site plan</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Planned workforce</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right font-medium">Planned labour cost</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Next action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {visibleEntries.map((entry) => {
                  const project = projectsById[entry.projectId];
                  const projectName = project?.projectName || "Authorised project";
                  const isLateBadge =
                    entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state);
                  const followUp = financialFollowUpSummary(entry, claims, role, finance);
                  const timing = timingLine(entry);
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text-[11px] font-semibold text-botanique-green xl:flex"
                            aria-hidden="true"
                          >
                            {projectMonogram(projectName)}
                          </span>
                          <span className="block break-words font-semibold text-botanique-charcoal">
                            {projectName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {formatWorkDate(entry.workDate)}
                        {entry.workDate === today && (
                          <span className="mt-0.5 block text-xs text-gray-500">Today</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 line-clamp-2 break-words text-xs text-gray-500">
                          {plannedActivitySummary(entry)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                        {plannedWorkforceSummary(entry)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-gray-700">
                        {entry.disposition === "working" ? formatKes(entry.plannedLabourCost) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATE_TONE[entry.state] || "bg-stone-100 text-gray-700"}`}>
                            {ENTRY_STATE_LABELS[entry.state]}
                          </span>
                          {isLateBadge && (
                            <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                              Late
                            </span>
                          )}
                        </span>
                        {timing && <span className="mt-0.5 block text-xs text-gray-500">{timing}</span>}
                        {/* Financial follow-up stays one compact line. Both
                            dimensions when both say something; never a column
                            each. */}
                        {followUp && (
                          <span className="mt-0.5 block max-w-[14rem] break-words text-xs text-gray-500">{followUp}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          to={`/admin/daily-site-operations/${entry.id}`}
                          className="inline-flex min-h-9 items-center rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold text-botanique-green transition hover:bg-stone-50"
                        >
                          {nextActionLabel(entry, canReview)}
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
              const projectName = project?.projectName || "Authorised project";
              const isLateBadge =
                entry.isLate && ["submitted", "resubmitted", "accepted"].includes(entry.state);
              const followUp = financialFollowUpSummary(entry, claims, role, finance);
              const timing = timingLine(entry);
              return (
                <li key={entry.id}>
                  <Link
                    to={`/admin/daily-site-operations/${entry.id}`}
                    className="block rounded-lg border border-stone-200 bg-white p-4 transition hover:border-botanique-green/40 hover:bg-stone-50"
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text-[11px] font-semibold text-botanique-green"
                        aria-hidden="true"
                      >
                        {projectMonogram(projectName)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words font-semibold text-botanique-charcoal">{projectName}</p>
                        <p className="mt-0.5 text-sm text-gray-600">
                          {formatWorkDate(entry.workDate)}
                          {entry.workDate === today ? " · Today" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STATE_TONE[entry.state] || "bg-stone-100 text-gray-700"}`}>
                        {ENTRY_STATE_LABELS[entry.state]}
                      </span>
                      {isLateBadge && (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                          Late
                        </span>
                      )}
                      {timing && <span className="text-xs text-gray-500">{timing}</span>}
                    </div>

                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                      <CardFact label="Site plan">
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
                          <span className="mt-0.5 block break-words text-xs text-gray-500">
                            {formatKes(entry.plannedLabourCost)}
                          </span>
                        )}
                      </CardFact>
                    </dl>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-3">
                      {followUp
                        ? <span className="min-w-0 break-words text-xs text-gray-500">{followUp}</span>
                        : <span />}
                      <span className="shrink-0 text-sm font-semibold text-botanique-green">
                        {nextActionLabel(entry, canReview)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <p className="text-xs text-gray-500">
            Showing {visibleEntries.length} of {entries.length}{" "}
            {entries.length === 1 ? "record" : "records"}.
          </p>
        </>
      )}

      {/* 5. The hand-off, stated once at the foot of the day's list. No claim is
          created here; Project Costs owns the claim, its decision and its history. */}
      {canSeeSiteCosts(role) && (
        <div className="flex flex-col gap-3 rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-gray-600">
            Once a site record is accepted, the day's known costs move into a cost claim — normally
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

function CardFact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
