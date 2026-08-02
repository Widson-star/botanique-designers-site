// BD-REPORTS-01A — the single Reports metrics authority.
//
// Every status inclusion rule, amount selection, total, returned-item rule,
// supersession rule and period-inclusion rule for the Project Summary lives
// here. Presentation components never re-derive a total.
//
// Two rules matter more than any other in this module:
//
//   1. An absent amount is NEVER coerced to zero. A total returns `null` when
//      no record contributed to it, and a number (which may genuinely be 0)
//      when at least one record did. `amount || 0` is not used anywhere.
//   2. No figure is strengthened. A submitted internal cost is not an amount
//      owed or spent; an approved internal cost is not amount spent; an
//      approved fund request is funding authorised and NOT funds released; a
//      planned labour figure is not actual labour cost, labour paid or payroll;
//      an expected worker count is not attendance.
import { isCalendarDateWithinPeriod, isWithinPeriod } from "./reportPeriod";

// ---------------------------------------------------------------------------
// Internal Cost Claims
// ---------------------------------------------------------------------------
// Claims are amended in place, so no supersession logic applies to them.
export const CLAIM_SUBMITTED_LIFECYCLES = ["awaiting_review"];
export const CLAIM_APPROVED_LIFECYCLES = ["approved"];
export const CLAIM_EXCLUDED_LIFECYCLES = [
  "draft",
  "amendment_requested",
  "rejected",
  "withdrawn",
  "cancelled",
];

export function countsAsSubmittedClaim(claim, range) {
  return (
    !!claim &&
    CLAIM_SUBMITTED_LIFECYCLES.includes(claim.lifecycle) &&
    isWithinPeriod(claim.submittedAt, range)
  );
}

export function countsAsApprovedClaim(claim, range) {
  return (
    !!claim &&
    CLAIM_APPROVED_LIFECYCLES.includes(claim.lifecycle) &&
    isWithinPeriod(claim.decidedAt, range)
  );
}

// ---------------------------------------------------------------------------
// Fund Requests
// ---------------------------------------------------------------------------
// There is no approved-amount column. `total_requested_amount` is the single
// stored amount and it stands at approved status; nothing is invented.
export const FUND_REQUESTED_STATUSES = ["submitted"];
export const FUND_AUTHORISED_STATUSES = ["approved"];
export const FUND_EXCLUDED_STATUSES = [
  "draft",
  "amendment_requested",
  "rejected",
  "withdrawn",
  "cancelled",
];

export function countsAsRequestedFunding(request, range) {
  return (
    !!request &&
    FUND_REQUESTED_STATUSES.includes(request.status) &&
    isWithinPeriod(request.submittedAt, range)
  );
}

export function countsAsAuthorisedFunding(request, range) {
  return (
    !!request &&
    FUND_AUTHORISED_STATUSES.includes(request.status) &&
    isWithinPeriod(request.decidedAt, range)
  );
}

// ---------------------------------------------------------------------------
// Daily Site planned labour
// ---------------------------------------------------------------------------
export const PLANNED_LABOUR_STATES = ["submitted", "resubmitted", "accepted"];
export const PLANNED_LABOUR_EXCLUDED_STATES = [
  "draft",
  "returned_for_correction",
  "voided",
  "superseded",
];

// The set of entry ids that a later version explicitly supersedes. A superseded
// predecessor never contributes to a planned figure, only to history.
export function supersededEntryIds(entries = []) {
  const ids = new Set();
  for (const entry of entries) {
    if (entry?.supersedesEntryId) ids.add(entry.supersedesEntryId);
  }
  return ids;
}

// Planned labour includes only a working-disposition entry in submitted,
// resubmitted or accepted state that is neither voided nor superseded. A
// returned entry is surfaced in Needs Attention and never in a planned figure.
export function countsAsPlannedLabour(entry, range, superseded = new Set()) {
  if (!entry) return false;
  if (entry.disposition !== "working") return false;
  if (!PLANNED_LABOUR_STATES.includes(entry.state)) return false;
  if (superseded.has(entry.id)) return false;
  if (!isCalendarDateWithinPeriod(entry.workDate, range)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Totals
// ---------------------------------------------------------------------------
// Sum a numeric field across contributing records. Returns null when nothing
// contributed, so "no records" can never be rendered as a shilling zero, and
// returns the exact stored sum (which may legitimately be 0) otherwise.
export function sumAmounts(records, selectAmount) {
  let total = null;
  for (const record of records) {
    const raw = selectAmount(record);
    if (raw === null || raw === undefined || raw === "") continue;
    const amount = Number(raw);
    if (!Number.isFinite(amount)) continue;
    total = (total ?? 0) + amount;
  }
  return total;
}

export function claimTotals(claims = [], range) {
  const submitted = claims.filter((claim) => countsAsSubmittedClaim(claim, range));
  const approved = claims.filter((claim) => countsAsApprovedClaim(claim, range));
  return {
    submittedCount: submitted.length,
    approvedCount: approved.length,
    // A claim awaiting review carries submitted_total; an approved claim carries
    // approved_total. Neither substitutes for the other.
    submittedTotal: sumAmounts(submitted, (claim) => claim.submittedTotal),
    approvedTotal: sumAmounts(approved, (claim) => claim.approvedTotal),
    currency: singleCurrency([...submitted, ...approved]),
  };
}

export function fundRequestTotals(requests = [], range) {
  const requested = requests.filter((request) => countsAsRequestedFunding(request, range));
  const authorised = requests.filter((request) => countsAsAuthorisedFunding(request, range));
  return {
    requestedCount: requested.length,
    authorisedCount: authorised.length,
    requestedTotal: sumAmounts(requested, (request) => request.totalRequestedAmount),
    authorisedTotal: sumAmounts(authorised, (request) => request.totalRequestedAmount),
    currency: singleCurrency([...requested, ...authorised]),
  };
}

export function plannedLabourTotals(entries = [], range) {
  const superseded = supersededEntryIds(entries);
  const counted = entries.filter((entry) => countsAsPlannedLabour(entry, range, superseded));
  return {
    entryCount: counted.length,
    // Expected workers is a PLAN. It is not attendance and not an actual
    // worker count; nothing here records who was present.
    expectedWorkerTotal: sumAmounts(counted, (entry) => entry.expectedWorkerCount),
    // Planned labour amount is not actual labour cost, labour paid or payroll.
    plannedLabourTotal: sumAmounts(counted, (entry) => entry.plannedLabourCost),
    entries: counted,
  };
}

// The stored currency shared by a set of finance records. Returns null when the
// set is empty and null when records disagree, so no single currency symbol is
// ever asserted over mixed records. Current records are constrained to KES.
export function singleCurrency(records = []) {
  const codes = new Set(records.map((record) => record?.currency).filter(Boolean));
  if (codes.size !== 1) return null;
  return [...codes][0];
}

// ---------------------------------------------------------------------------
// Daily Site period compliance
// ---------------------------------------------------------------------------
// BD-REPORTS-01B — the one compliance statistic Reports states in words.
//
// Of the days an entry was DUE, the share that were not missing: a day is met
// by a submitted entry (on time or late) or by an active waiver. It is not a
// quality measure, not a measure of work done, and it says nothing about days
// on which no entry was ever due.
//
// It returns null when nothing was due in the period, so "no obligation" is
// never rendered as 0% and never as 100%.
export function complianceRate(summary) {
  const due = summary?.due;
  if (!Number.isFinite(due) || due <= 0) return null;
  const missing = Number.isFinite(summary?.missing) ? summary.missing : 0;
  return Math.round(((due - missing) / due) * 100);
}

export function summariseRangeCompliance(rows = []) {
  const summary = { due: 0, submitted: 0, submittedLate: 0, waived: 0, missing: 0, notDue: 0, missingDays: [] };
  for (const row of rows) {
    if (row.due) summary.due += 1;
    switch (row.complianceStatus) {
      case "entry_present":
        summary.submitted += 1;
        break;
      case "entry_late":
        summary.submitted += 1;
        summary.submittedLate += 1;
        break;
      case "waived":
        summary.waived += 1;
        break;
      case "missing":
        summary.missing += 1;
        summary.missingDays.push(row);
        break;
      default:
        summary.notDue += 1;
        break;
    }
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Approvals and decisions — counts only
// ---------------------------------------------------------------------------
// BD-REPORTS-01B replaced the per-record decision and awaiting card lists with
// counts over the SAME projection. Nothing new is read and no state is
// invented: every count below is the length of a subset of the projection the
// page already held, so a count and its module always agree.
//
// "Returned" and "rejected" are kept apart because they mean different things:
// a returned record is back with its requester and may yet be decided, while a
// rejected one is decided against.
const RETURNED_DECISION_STATES = ["amendment_requested"];
const APPROVED_DECISION_STATES = ["approved"];
const REJECTED_DECISION_STATES = ["rejected"];

export function approvalsSummary(projection) {
  const decisions = projection?.decisions || [];
  const awaiting = projection?.awaiting || [];
  const count = (states) => decisions.filter((item) => states.includes(item.state)).length;
  const approved = count(APPROVED_DECISION_STATES);
  const returned = count(RETURNED_DECISION_STATES);
  const rejected = count(REJECTED_DECISION_STATES);
  return {
    awaiting: awaiting.length,
    approved,
    returned,
    rejected,
    // Any decision state the three named groups do not cover — surfaced as a
    // total rather than silently dropped, so the counts always add up.
    otherDecisions: decisions.length - approved - returned - rejected,
    decisionTotal: decisions.length,
  };
}
