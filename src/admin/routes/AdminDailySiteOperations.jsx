// Daily Site Record — the day's list.
//
// AUTHORITY: docs/ui-authority/operations-hub/working-authority/
// 08-daily-site-record-list-working-authority.png (frozen, committed).
//
// The page is built FROM that image, region by region:
//
//   1. title + subtitle, "New site record" at the right
//   2. FIVE metric cards — Due today · Awaiting review · Late · Accepted ·
//      Not required — each an icon disc, label, count and "Across N sites"
//   3. filter chips (Today · Awaiting review · Late · Returned · Accepted · All)
//      with the work-date control and filters at the right of the same row
//   4. the record table: Project / Site · Work date · Site plan ·
//      Planned workforce · Planned labour cost · Status · Next action
//   5. "Showing 1 to N of N records" at the foot of the table
//   6. a contextual bottom bar ending in a link to Cost Claims
//
// CORRECTION, 10 August 2026. PR #102's first pass deleted region 2 entirely and
// replaced it with an invented "day banner", reasoning that five equal cards
// were generic clutter. That was a design heuristic overriding a committed
// authority image. The five cards are restored. Where the PNG settles a
// question the PNG wins, and generic principles apply only where it is silent.
//
// The one thing the image does not settle is a site that is DUE but has no
// record at all — its illustrative data has none. That is real compliance truth
// the product must still surface, so it uses region 6, the image's own
// contextual bottom bar, rather than a new banner of my own invention.
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
  canSeeDailySiteOperations, canRecordDailySiteEntry, canReviewDailySiteEntry,
} from "../utils/dailySiteCapabilities";
import {
  dayMetrics, missingSites, nextActionLabel, projectMonogram,
} from "../utils/dailySiteDaySummary";
import { Chip, Disc, Glyph } from "../components/ui/Surfaces";
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

// The authority's filter row. The image shows plain chips with no counts — the
// counts live in the five cards above — so they carry none here either.
const FILTERS = [
  { key: "today", label: "Today" },
  { key: "submitted", label: "Awaiting review" },
  { key: "late", label: "Late" },
  { key: "returned", label: "Returned" },
  { key: "accepted", label: "Accepted" },
  { key: "all", label: "All" },
];

const STATE_TONE = {
  draft: "neutral",
  submitted: "waiting",
  resubmitted: "waiting",
  returned_for_correction: "waiting",
  accepted: "settled",
  voided: "neutral",
  superseded: "neutral",
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

function shortTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

// The authority's status sub-line: when the record arrived, and whether that was
// late. Never a deadline this product does not hold.
function timingLine(entry) {
  if (entry.reviewedAt && entry.state === "accepted") return `Accepted ${shortTime(entry.reviewedAt)}`;
  if (entry.submittedAt) return `${entry.isLate ? "Submitted late" : "Submitted"} ${shortTime(entry.submittedAt)}`;
  if (entry.state === "draft") return "Not yet submitted";
  return "";
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

  // One calendar day, through the from/to contract the whole product shares, so
  // a day chosen here and a day arrived at from Reports are the same URL.
  function setWorkDate(value) {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set("from", value);
      next.set("to", value);
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
  const noAuthority =
    role === ROLES.MANAGER && status === "ready" && (authorisedProjects || []).length === 0;

  const metrics = useMemo(() => dayMetrics(entries, compliance, today), [entries, compliance, today]);
  const missing = useMemo(() => missingSites(compliance), [compliance]);
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
  const filterableProjects = useMemo(() => {
    const ids = new Set(entries.map((entry) => entry.projectId));
    if (projectFilter !== "all") ids.add(projectFilter);
    return [...ids].map((id) => ({ id, name: projectsById[id]?.projectName || "Project" }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [entries, projectsById, projectFilter]);

  if (!canSeeDailySiteOperations(role)) {
    return (
      <div className="rounded-xl border border-stone-200 bg-white p-8">
        <h1 className="text-xl font-bold">Daily Site Record unavailable</h1>
        <p className="mt-2 text-sm text-gray-500">This role does not have access to daily site operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1 · Title, subtitle, primary action. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[24px] font-semibold leading-tight">Daily Site Record</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-gray-600">
            Capture and review daily progress at every site. Completed records feed directly into
            cost claims.
          </p>
        </div>
        {canRecordDailySiteEntry(role) && !noAuthority && (
          <Link
            to="/admin/daily-site-operations/new"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white transition hover:bg-botanique-dark"
          >
            New site record
          </Link>
        )}
      </div>

      {noAuthority && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5" role="status">
          <h2 className="text-base font-semibold text-amber-900">No projects assigned to you yet</h2>
          <p className="mt-1 text-sm leading-6 text-amber-900">
            You are not yet the lead of, or assigned to, any project, so there is nothing to
            record or track. Ask the owner to assign you to the active sites you manage — they
            will then appear here automatically.
          </p>
        </div>
      )}

      {status === "error" && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">
          {error || "Unable to load site operations."}
        </div>
      )}

      {/* 2 · The authority's five metric cards. */}
      {!noAuthority && (
        <section aria-label="Today's site record position" className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {metrics.map((metric) => (
            <div key={metric.key} className="rounded-xl border border-stone-200 bg-white px-4 py-3.5">
              <div className="flex items-start gap-2.5">
                <Disc name={metric.icon} tone={metric.tone} size="h-9 w-9" />
                <p className="min-w-0 pt-1 text-[12.5px] font-medium leading-snug text-gray-600">
                  {metric.label}
                </p>
              </div>
              <p className="mt-2 text-[26px] font-semibold leading-none tabular-nums text-botanique-charcoal">
                {metric.value}
              </p>
              <p className="mt-1.5 truncate text-[11.5px] text-gray-500">{metric.hint}</p>
            </div>
          ))}
        </section>
      )}

      {/* 3 · Filter chips, with the day and site controls on the same row. */}
      <section className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Record filters">
          {FILTERS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={filter === tab.key}
              onClick={() => setParam("status", tab.key, "today")}
              className={`min-h-9 rounded-lg px-3.5 text-[12.5px] font-medium transition ${
                filter === tab.key
                  ? "border border-botanique-green/30 bg-[#eef2ee] text-botanique-green"
                  : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 text-[12.5px] text-gray-600">
            <Glyph name="calendar" className="h-3.5 w-3.5 text-gray-400" />
            <span className="sr-only sm:not-sr-only">Work date</span>
            <input
              type="date"
              value={from && from === to ? from : ""}
              onChange={(event) => setWorkDate(event.target.value)}
              className="border-0 bg-transparent p-0 text-[12.5px] focus:outline-none"
            />
          </label>
          {filterableProjects.length > 1 && (
            <label className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-stone-200 bg-white px-2.5 text-[12.5px] text-gray-600">
              <span className="shrink-0">Site</span>
              <select
                value={projectFilter}
                onChange={(event) => setParam("project", event.target.value, "all")}
                className="max-w-[11rem] border-0 bg-transparent p-0 text-[12.5px] focus:outline-none"
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
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[12.5px] text-gray-600">
          <span>Filtered to {activeFilterSummary}.</span>
          <Link to="/admin/daily-site-operations" className="min-h-9 py-1.5 font-semibold text-botanique-green hover:underline">Clear filters</Link>
        </div>
      )}

      {/* 4 + 5 · The record table and its record count. */}
      {status === "loading" ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-[13px] text-gray-600">
          Loading site records…
        </div>
      ) : visibleEntries.length === 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3.5">
          <Disc name="pause" tone="unbuilt" size="h-8 w-8" />
          <p className="min-w-0 flex-1 text-[12.5px] text-gray-600">
            {filter === "today"
              ? "No record has been captured for today yet under these filters."
              : "No site record matches this status, day or site."}
          </p>
          {filter !== "all" && (
            <button
              type="button"
              onClick={() => setParam("status", "all", "today")}
              className="min-h-9 shrink-0 text-[12.5px] font-semibold text-botanique-green hover:underline"
            >
              Show all records
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-xl border border-stone-200 bg-white md:block">
            <table className="w-full text-left text-[13px]">
              <thead className="border-b border-stone-100 text-[11.5px] text-gray-500">
                <tr>
                  <th className="w-[24%] px-4 py-3 font-medium">Project / Site</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Work date</th>
                  <th className="w-[18%] px-4 py-3 font-medium">Site plan</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Planned workforce</th>
                  <th className="whitespace-nowrap px-4 py-3 font-medium">Planned labour cost</th>
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
                    <tr key={entry.id} className="align-top transition hover:bg-[#fbfbfa]">
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text-[11px] font-semibold text-botanique-green"
                            aria-hidden="true"
                          >
                            {projectMonogram(projectName)}
                          </span>
                          <span className="block break-words font-semibold text-botanique-charcoal">
                            {projectName}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-600">
                        {formatWorkDate(entry.workDate)}
                        {entry.workDate === today && (
                          <span className="mt-0.5 block text-[11.5px] text-gray-500">Today</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="block text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 line-clamp-2 break-words text-[11.5px] text-gray-500">
                          {plannedActivitySummary(entry)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-gray-600">
                        {plannedWorkforceSummary(entry)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-gray-700">
                        {entry.disposition === "working" ? formatKes(entry.plannedLabourCost) : "—"}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Chip tone={STATE_TONE[entry.state] || "neutral"}>
                            {ENTRY_STATE_LABELS[entry.state]}
                          </Chip>
                          {isLateBadge && <Chip tone="attention">Late</Chip>}
                        </span>
                        {timing && <span className="mt-1 block text-[11.5px] text-gray-500">{timing}</span>}
                        {/* Financial follow-up stays one compact line. Both
                            dimensions when both say something; never a column. */}
                        {followUp && (
                          <span className="mt-0.5 block break-words text-[11.5px] text-gray-500">{followUp}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right">
                        <Link
                          to={`/admin/daily-site-operations/${entry.id}`}
                          className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 bg-white px-3.5 text-[12.5px] font-medium text-botanique-charcoal transition hover:border-botanique-green hover:text-botanique-green"
                        >
                          {nextActionLabel(entry, canReview)}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="border-t border-stone-100 px-4 py-3 text-[12px] text-gray-500">
              Showing 1 to {visibleEntries.length} of {visibleEntries.length}{" "}
              {visibleEntries.length === 1 ? "record" : "records"}
            </p>
          </div>

          {/* Mobile: stacked cards. No compressed table, no horizontal overflow,
              large touch targets. */}
          <ul className="space-y-2.5 md:hidden">
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
                    className="block rounded-xl border border-stone-200 bg-white p-3.5 transition hover:border-botanique-green/40"
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
                        <p className="mt-0.5 text-[12.5px] text-gray-600">
                          {formatWorkDate(entry.workDate)}
                          {entry.workDate === today ? " · Today" : ""}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      <Chip tone={STATE_TONE[entry.state] || "neutral"}>
                        {ENTRY_STATE_LABELS[entry.state]}
                      </Chip>
                      {isLateBadge && <Chip tone="attention">Late</Chip>}
                      {timing && <span className="text-[11.5px] text-gray-500">{timing}</span>}
                    </div>

                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                      <CardFact label="Site plan">
                        <span className="text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 block break-words text-[11.5px] text-gray-500">
                          {plannedActivitySummary(entry)}
                        </span>
                      </CardFact>
                      <CardFact label="Planned workforce">
                        <span className="text-botanique-charcoal">{plannedWorkforceSummary(entry)}</span>
                        {entry.disposition === "working" && (
                          <span className="mt-0.5 block break-words text-[11.5px] text-gray-500">
                            {formatKes(entry.plannedLabourCost)}
                          </span>
                        )}
                      </CardFact>
                    </dl>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
                      {followUp
                        ? <span className="min-w-0 break-words text-[11.5px] text-gray-500">{followUp}</span>
                        : <span />}
                      <span className="shrink-0 text-[12.5px] font-semibold text-botanique-green">
                        {nextActionLabel(entry, canReview)}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* 6 · The authority's contextual bottom bar. When sites are due with no
          record at all — a state the image's illustrative data never shows — the
          bar carries that, because recording them is what the day needs before
          any claim. Otherwise it carries the image's own cost-claim hand-off. */}
      {!noAuthority && missing.length > 0 ? (
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <Disc name="alert" tone="waiting" size="h-9 w-9" />
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-botanique-charcoal">
                {missing.length === 1
                  ? "1 site is due today and has no record yet"
                  : `${missing.length} sites are due today and have no record yet`}
              </p>
              <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                {missing.map((row) => (
                  <li key={row.projectId}>
                    <Link
                      to={`/admin/daily-site-operations/new?project=${row.projectId}`}
                      className="text-[12.5px] font-medium text-botanique-green hover:underline"
                    >
                      {row.projectName}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {canRecordDailySiteEntry(role) && (
            <Link
              to="/admin/daily-site-operations/new"
              className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 text-[12.5px] font-semibold text-botanique-charcoal hover:border-botanique-green hover:text-botanique-green"
            >
              Record a site
              <Glyph name="arrow" className="h-3.5 w-3.5" />
            </Link>
          )}
        </section>
      ) : canSeeSiteCosts(role) && (
        <section className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <Disc name="money" tone="brand" size="h-9 w-9" />
            <p className="min-w-0 text-[12.5px] text-gray-600">
              Once all due site records are accepted, the next step is to raise cost claims.
            </p>
          </div>
          <Link
            to="/admin/site-costs"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-stone-300 bg-white px-4 text-[12.5px] font-semibold text-botanique-charcoal hover:border-botanique-green hover:text-botanique-green"
          >
            Go to Cost Claims
            <Glyph name="arrow" className="h-3.5 w-3.5" />
          </Link>
        </section>
      )}
    </div>
  );
}

function CardFact({ label, children }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10.5px] font-medium uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}
