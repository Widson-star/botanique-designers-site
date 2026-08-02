// BD-REPORTS-01A — URL-addressable list filters.
//
// The Daily Site Operations, Site Costs, Fund Requests and Approvals lists
// previously derived filter state internally and read nothing from the URL, so
// a report count could not reach the exact filtered list it referred to. These
// helpers give all four the same URL contract:
//
//   ?project=<id>&status=<value>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>
//
// A parameter in the URL narrows what the caller can already see. It grants
// nothing: every row still arrives through the caller's own row level security,
// and the destination re-checks access exactly as before.
import { isCalendarDateWithinPeriod, isWithinPeriod } from "./reportPeriod";

// Build the period predicate from the from/to parameters. An absent or partial
// range matches everything, so a link without dates behaves as before.
function periodRange(from, to) {
  if (!from || !to) return null;
  return { startDate: from, endDate: to };
}

// A record whose submission OR decision falls inside the period, matching the
// Reports rule that a submitted figure is dated by submission and an approved
// figure by decision.
export function withinReportedPeriod(submittedAt, decidedAt, from, to) {
  const range = periodRange(from, to);
  if (!range) return true;
  return isWithinPeriod(submittedAt, range) || isWithinPeriod(decidedAt, range);
}

// A record dated by a calendar date (a Daily Site work date).
export function withinReportedWorkDates(workDate, from, to) {
  const range = periodRange(from, to);
  if (!range) return true;
  return isCalendarDateWithinPeriod(workDate, range);
}

// An approval, which may be dated by request, review or decision.
export function withinReportedApprovalDates(requestedAt, reviewedAt, decidedAt, from, to) {
  const range = periodRange(from, to);
  if (!range) return true;
  return (
    isWithinPeriod(requestedAt, range) ||
    isWithinPeriod(reviewedAt, range) ||
    isWithinPeriod(decidedAt, range)
  );
}

// A plain sentence describing the active URL filters, so a reader who arrived
// from a report can see why the list is narrowed and clear it.
export function describeActiveFilters({ projectName, statusLabel, from, to }) {
  const parts = [];
  if (projectName) parts.push(projectName);
  if (statusLabel) parts.push(statusLabel);
  if (from && to) parts.push(`${from} to ${to}`);
  return parts.join(" · ");
}
