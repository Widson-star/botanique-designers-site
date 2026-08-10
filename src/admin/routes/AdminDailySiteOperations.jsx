// Daily Site Record — the day's operational position.
//
// Visual authority: docs/ui-authority/operations-hub/working-authority/
// 08-daily-site-record-list-working-authority.png (frozen).
//
// FIDELITY CORRECTION, 10 August 2026. The first implementation carried the
// right information in the wrong shape: header → five equal statistic cards →
// a separate alert strip → a filter row → the table → a hand-off strip. Six
// stacked full-width rectangles, none of which led. The Founder's review of the
// hosted result rejected it as still reading like a generic admin page.
//
// Three structural changes, all visible:
//
//   1. THE FIVE EQUAL CARDS ARE GONE. A day has one position, not five equal
//      ones, so the page opens with a single day banner whose headline is
//      chosen by what actually needs doing (see dayHeadline). Five equal cards
//      could not do that: they gave "Not required: 0" the same weight as
//      "3 sites have no record".
//   2. THE MISSING-SITE TASK IS THE BANNER, NOT A STRIP BENEATH IT. When sites
//      have no record, recording them IS the day's work, so those actions sit
//      inside the headline region at full prominence instead of in a yellow bar
//      below five cards.
//   3. THE COUNTS MOVED ONTO THE FILTERS THAT SELECT THEM. "Awaiting review 2"
//      is now the control that shows those two records. That merges two former
//      regions into one and makes every number a way of getting somewhere.
//
// Deliberate deviations from the authority image are recorded in
// docs/ui-authority/operations-hub/VISUAL-AUTHORITY-TRANCHE-1.md.
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
  dayCounts, dayHeadline, nextActionLabel, projectMonogram,
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

// Each filter carries the count it selects, so a number is never decoration.
const FILTERS = [
  { key: "today", label: "Today", count: (c) => c.recorded },
  { key: "submitted", label: "Awaiting review", count: (c) => c.awaitingReview, tone: "waiting" },
  { key: "late", label: "Late", count: (c) => c.late, tone: "attention" },
  { key: "returned", label: "Returned", count: (c) => c.returned, tone: "waiting" },
  { key: "accepted", label: "Accepted", count: (c) => c.accepted, tone: "settled" },
  { key: "all", label: "All", count: null },
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

// The banner's surface, by what the day needs. Colour is used once, at the top,
// to say what kind of day this is — not sprinkled across five boxes.
const BANNER_TONE = {
  attention: "border-red-200 bg-[#fdf6f5]",
  waiting: "border-amber-200 bg-[#fdfaf3]",
  settled: "border-emerald-200 bg-[#f4faf7]",
  neutral: "border-stone-200 bg-white",
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

// When the record arrived, and whether that was late. Never a deadline this
// product does not hold.
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

  const counts = useMemo(() => dayCounts(entries, compliance, today), [entries, compliance, today]);
  const headline = dayHeadline(counts, { ready: status === "ready" });
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
    <div className="space-y-3.5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold leading-tight">Daily Site Record</h1>
          <p className="mt-0.5 max-w-2xl text-[13px] text-gray-600">
            Capture and review daily progress at every site. Completed records feed directly into
            cost claims.
          </p>
        </div>
        {canRecordDailySiteEntry(role) && !noAuthority && (
          <Link
            to="/admin/daily-site-operations/new"
            className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white transition hover:bg-botanique-dark"
          >
            <Glyph name="doc" />
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

      {/* ── THE DAY. One position, one headline, and — when sites have no record
          — the recording actions themselves, at full prominence. This single
          region replaces the five equal cards and the separate alert strip. */}
      {!noAuthority && (
        <section
          aria-label="Today's site record position"
          className={`rounded-xl border px-4 py-3.5 ${BANNER_TONE[headline.tone]}`}
        >
          <div className="flex flex-wrap items-start justify-between gap-x-5 gap-y-3">
            <div className="flex min-w-0 items-start gap-3">
              <Disc name={headline.icon} tone={headline.tone} size="h-10 w-10" />
              <div className="min-w-0">
                <p className="text-[17px] font-semibold leading-snug text-botanique-charcoal">
                  {headline.headline}
                </p>
                <p className="mt-0.5 text-[12.5px] text-gray-600">
                  {formatWorkDate(today)}
                  {headline.detail ? ` · ${headline.detail}` : ""}
                </p>
              </div>
            </div>
            <dl className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1.5 text-[12px]">
              <div className="flex items-baseline gap-1.5">
                <dt className="text-gray-500">Due</dt>
                <dd className="font-semibold tabular-nums text-botanique-charcoal">{counts.due}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-gray-500">Recorded</dt>
                <dd className="font-semibold tabular-nums text-botanique-charcoal">{counts.recorded}</dd>
              </div>
              <div className="flex items-baseline gap-1.5">
                <dt className="text-gray-500">Not required</dt>
                <dd className="font-semibold tabular-nums text-botanique-charcoal">{counts.notRequired}</dd>
              </div>
            </dl>
          </div>

          {counts.missing > 0 && (
            <div className="mt-3 border-t border-red-200/70 pt-3">
              <ul className="flex flex-wrap gap-2">
                {counts.missingProjects.map((row) => (
                  <li key={row.projectId}>
                    <Link
                      to={`/admin/daily-site-operations/new?project=${row.projectId}`}
                      className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-red-200 bg-white px-3 text-[13px] font-semibold text-botanique-charcoal transition hover:border-botanique-green hover:bg-[#f7faf8]"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text-[10px] font-semibold text-botanique-green">
                        {projectMonogram(row.projectName)}
                      </span>
                      <span className="max-w-[15rem] truncate">{row.projectName}</span>
                      <Glyph name="arrow" className="h-3.5 w-3.5 text-botanique-green" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* ── FILTERS, carrying the counts they select. */}
      <section className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Record filters">
          {FILTERS.map((tab) => {
            const count = tab.count ? tab.count(counts) : null;
            const selected = filter === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setParam("status", tab.key, "today")}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] font-medium transition ${
                  selected
                    ? "bg-botanique-green text-white"
                    : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
                }`}
              >
                {tab.label}
                {count !== null && (
                  <span
                    className={`rounded px-1.5 text-[11px] font-semibold tabular-nums ${
                      selected
                        ? "bg-white/20 text-white"
                        : count > 0 && tab.tone === "attention" ? "bg-red-100 text-red-800"
                        : count > 0 && tab.tone === "waiting" ? "bg-amber-100 text-amber-900"
                        : count > 0 && tab.tone === "settled" ? "bg-emerald-100 text-emerald-800"
                        : "bg-stone-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
            <span className="shrink-0">Work date</span>
            <input
              type="date"
              value={from && from === to ? from : ""}
              onChange={(event) => setWorkDate(event.target.value)}
              className="min-h-9 rounded-lg border border-stone-300 bg-white px-2.5 text-[12.5px]"
            />
          </label>
          {filterableProjects.length > 1 && (
            <label className="flex items-center gap-1.5 text-[12.5px] text-gray-600">
              <span className="shrink-0">Site</span>
              <select
                value={projectFilter}
                onChange={(event) => setParam("project", event.target.value, "all")}
                className="min-h-9 max-w-[11rem] rounded-lg border border-stone-300 bg-white px-2.5 text-[12.5px]"
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

      {/* ── THE RECORDS. */}
      {status === "loading" ? (
        <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-[13px] text-gray-600">
          Loading site records…
        </div>
      ) : visibleEntries.length === 0 ? (
        // A quiet day is one line, not a large empty rectangle.
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-stone-200 bg-white px-4 py-3">
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
              <thead className="border-b border-stone-100 bg-[#fbfbfa] text-[11px] uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-[26%] px-4 py-2.5 font-medium">Project / Site</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Work date</th>
                  <th className="w-[20%] px-4 py-2.5 font-medium">Site plan</th>
                  <th className="whitespace-nowrap px-4 py-2.5 font-medium">Workforce</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Planned labour</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Next action</th>
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
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-2.5">
                          <span
                            className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text-[10px] font-semibold text-botanique-green"
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
                          <span className="mt-0.5 block text-[11px] text-gray-500">Today</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="block font-medium text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 line-clamp-2 break-words text-[11.5px] text-gray-500">
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
                          <Chip tone={STATE_TONE[entry.state] || "neutral"}>
                            {ENTRY_STATE_LABELS[entry.state]}
                          </Chip>
                          {isLateBadge && <Chip tone="attention">Late</Chip>}
                        </span>
                        {timing && <span className="mt-1 block text-[11px] text-gray-500">{timing}</span>}
                        {/* Financial follow-up stays one compact line. Both
                            dimensions when both say something; never a column. */}
                        {followUp && (
                          <span className="mt-0.5 block break-words text-[11px] text-gray-500">{followUp}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <Link
                          to={`/admin/daily-site-operations/${entry.id}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 text-[12.5px] font-semibold text-botanique-green transition hover:border-botanique-green hover:bg-[#f7faf8]"
                        >
                          {nextActionLabel(entry, canReview)}
                          <Glyph name="arrow" className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#eef2ee] text-[10px] font-semibold text-botanique-green"
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
                      {timing && <span className="text-[11px] text-gray-500">{timing}</span>}
                    </div>

                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-[12.5px]">
                      <CardFact label="Site plan">
                        <span className="font-medium text-botanique-charcoal">
                          {DISPOSITION_LABELS[entry.disposition]}
                        </span>
                        <span className="mt-0.5 block break-words text-[11px] text-gray-500">
                          {plannedActivitySummary(entry)}
                        </span>
                      </CardFact>
                      <CardFact label="Workforce">
                        <span className="text-botanique-charcoal">{plannedWorkforceSummary(entry)}</span>
                        {entry.disposition === "working" && (
                          <span className="mt-0.5 block break-words text-[11px] text-gray-500">
                            {formatKes(entry.plannedLabourCost)}
                          </span>
                        )}
                      </CardFact>
                    </dl>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-stone-100 pt-2.5">
                      {followUp
                        ? <span className="min-w-0 break-words text-[11px] text-gray-500">{followUp}</span>
                        : <span />}
                      <span className="inline-flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-botanique-green">
                        {nextActionLabel(entry, canReview)}
                        <Glyph name="arrow" className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* ── FOOT: the record count and the hand-off, on one line rather than two
          stacked regions. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-1 text-[11.5px] text-gray-500">
        <span>
          {visibleEntries.length === entries.length
            ? `${entries.length} ${entries.length === 1 ? "record" : "records"}`
            : `Showing ${visibleEntries.length} of ${entries.length} records`}
        </span>
        {canSeeSiteCosts(role) && (
          <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>Accepted records move into a cost claim, normally by 4:00 pm.</span>
            <Link
              to="/admin/site-costs"
              className="inline-flex min-h-8 items-center gap-1 font-semibold text-botanique-green hover:underline"
            >
              Project Costs
              <Glyph name="arrow" className="h-3.5 w-3.5" />
            </Link>
          </span>
        )}
      </div>
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
