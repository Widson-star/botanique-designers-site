// BD-REPORTS-01A — report assembly.
//
// Pure orchestration: it takes a set of readers, a project, a period and the
// caller's role, and returns one report object in which every section carries
// its own explicit state. It holds no React state, so the five-state rules are
// directly testable.
//
// The five states are kept strictly distinct and are never collapsed:
//
//   empty_period  the source is readable and holds records for this project,
//                 but none fall in the selected period;
//   empty_ever    the source is readable and holds no record for this project
//                 at all;
//   unavailable   the fact is not available in the current Operations Hub
//                 stage — it is not zero and not empty;
//   no_access     the reader has no access to this source — it is not empty,
//                 and no inference about whether records exist is made;
//   error         the read failed — it is not empty and not zero.
//
// A section that is inaccessible is never read, so it can never be mistaken for
// an empty one. A section that fails is never rendered as zero.
import {
  fetchApprovalEvents,
  fetchClaimEvents,
  fetchDailySiteEvents,
  fetchFundRequestEvents,
  fetchOpenReportApprovals,
  fetchProjectHistoryEvents,
  fetchReportApprovalExists,
  fetchReportApprovals,
  fetchReportClaimExists,
  fetchReportClaims,
  fetchReportDailySiteEntries,
  fetchReportFundRequestExists,
  fetchReportFundRequests,
  fetchReportProject,
  fetchReportRangeCompliance,
  RECENT_ACTIVITY_LIMIT,
} from "../lib/reports";
import {
  canSeeApprovalsReport,
  canSeeDailySiteReport,
  canSeeFundRequestReport,
  canSeeInternalCostReport,
  canSeeProjectHistoryReport,
} from "./reportCapabilities";
import { SECTION_STATE } from "./reportFormat";
import { isWithinPeriod, periodInstants } from "./reportPeriod";
import {
  claimTotals,
  fundRequestTotals,
  plannedLabourTotals,
  summariseRangeCompliance,
} from "./reportMetrics";

export const DEFAULT_READERS = {
  fetchReportProject,
  fetchReportDailySiteEntries,
  fetchReportRangeCompliance,
  fetchReportClaims,
  fetchReportClaimExists,
  fetchReportFundRequests,
  fetchReportFundRequestExists,
  fetchReportApprovals,
  fetchOpenReportApprovals,
  fetchReportApprovalExists,
  fetchProjectHistoryEvents,
  fetchDailySiteEvents,
  fetchClaimEvents,
  fetchFundRequestEvents,
  fetchApprovalEvents,
};

function section(state, data = {}) {
  return { state, ...data };
}

const NO_ACCESS = () => section(SECTION_STATE.NO_ACCESS);

// ---------------------------------------------------------------------------
// Project context
// ---------------------------------------------------------------------------
// A report is about ONE project, and the project arrives from the URL. A URL
// parameter is input, never proof of access, so before any section is read the
// project id must be present in the caller's ordinary Projects result — the
// same read, under the same Projects RLS, that fills the selector.
//
// This matters because the source domains are not equally scoped: projects is
// owner / actively-assigned / leading-manager, while approval_requests and
// project_activities are readable by ANY manager company-wide. Without this
// gate, a hand-typed project id could return approval and activity rows for a
// project the caller cannot see in Projects at all.
//
// The gate is an ADDITIONAL fail-closed prerequisite. It does not replace the
// per-domain policies, which remain authoritative for every read issued after
// it, and it can never widen what the database returns.
export const PROJECT_CONTEXT = {
  AUTHORISED: "authorised",
  UNAVAILABLE: "unavailable",
};

export function isAuthorisedProject(projectId, authorisedProjectIds) {
  if (!projectId || !authorisedProjectIds) return false;
  const ids =
    authorisedProjectIds instanceof Set ? authorisedProjectIds : new Set(authorisedProjectIds);
  return ids.has(projectId);
}

// The whole report for an unavailable project: no section is read, no source is
// touched, and nothing about the project — its name, its existence, its
// activity, its approval count or its timing — is asserted either way. An
// invalid project id and a real but inaccessible one land here identically.
function unavailableProjectReport(projectId, range) {
  return {
    projectId,
    range,
    projectContext: PROJECT_CONTEXT.UNAVAILABLE,
    overview: NO_ACCESS(),
    dailySite: NO_ACCESS(),
    claims: NO_ACCESS(),
    fundRequests: NO_ACCESS(),
    approvals: NO_ACCESS(),
    approvalsProjection: {
      state: SECTION_STATE.NO_ACCESS,
      decisions: [],
      awaiting: [],
      sourceNotes: [],
    },
    recentActivity: NO_ACCESS(),
    needsAttention: [],
  };
}

// Run a section's reads, converting any failure into the error state. A failure
// in one section never fails the whole report.
async function attempt(load) {
  try {
    return await load();
  } catch {
    return section(SECTION_STATE.ERROR);
  }
}

// Choose between "no records in the selected period" and "no records exist"
// using an explicit bounded existence probe, never an inference from an empty
// period result alone.
function emptyState(existsEver) {
  return existsEver ? SECTION_STATE.EMPTY_PERIOD : SECTION_STATE.EMPTY_EVER;
}

// ---------------------------------------------------------------------------
// Mappers — snake_case rows to the camelCase shapes the sections render.
// ---------------------------------------------------------------------------
export function mapReportProject(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectName: row.project_name || "",
    clientSiteName: row.client_site_name || "",
    location: row.location || "",
    county: row.county || "",
    projectType: row.project_type || "",
    status: row.status || "",
    stage: row.stage || "",
    leadPersonId: row.lead_person_id || "",
    startDate: row.start_date || null,
    actualStartDate: row.actual_start_date || null,
    targetCompletionDate: row.target_completion_date || null,
    actualCompletionDate: row.actual_completion_date || null,
    nextAction: row.next_action || "",
    nextActionDate: row.next_action_date || null,
    blocker: row.blocker || "",
    archived: row.archived === true,
    archivedAt: row.archived_at || null,
  };
}

export function mapReportEntry(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    workDate: row.work_date || "",
    disposition: row.disposition || "",
    noWorkReason: row.no_work_reason || "",
    reasonDetail: row.reason_detail || "",
    expectedWorkerCount: row.expected_worker_count ?? null,
    crewReference: row.crew_reference || "",
    ratePerWorker: row.rate_per_worker ?? null,
    agreedLabourTotal: row.agreed_labour_total ?? null,
    plannedLabourCost: row.planned_labour_cost ?? null,
    workPlanned: row.work_planned || "",
    notes: row.notes || "",
    evidenceStatus: row.evidence_status || "none",
    state: row.state || "",
    version: row.version ?? null,
    supersedesEntryId: row.supersedes_entry_id || "",
    returnedReason: row.returned_reason || "",
    submittedAt: row.submitted_at || "",
    isLate: row.is_late === true,
  };
}

export function mapReportCompliance(row) {
  return {
    projectId: row.project_id,
    projectName: row.project_name || "",
    workDate: row.work_date || "",
    isWeekend: row.is_weekend === true,
    due: row.due === true,
    entryId: row.entry_id || "",
    entryState: row.entry_state || "",
    disposition: row.disposition || "",
    isLate: row.is_late === true,
    waiverId: row.waiver_id || "",
    complianceStatus: row.compliance_status || "",
  };
}

export function mapReportClaim(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    serviceDate: row.service_date || null,
    recipientType: row.recipient_type || "",
    recipientLabel: row.recipient_label || "",
    category: row.category || "",
    currency: row.currency || "KES",
    lifecycle: row.lifecycle || "",
    // Exact stored values; an absent amount stays null and is never made 0.
    submittedTotal: row.submitted_total ?? null,
    approvedTotal: row.approved_total ?? null,
    requesterId: row.requester_id || "",
    deciderId: row.decider_id || "",
    submittedAt: row.submitted_at || "",
    decidedAt: row.decided_at || "",
  };
}

export function mapReportFundRequest(row) {
  return {
    id: row.id,
    requestNumber: row.request_number || "",
    projectId: row.project_id,
    authorityType: row.authority_type || "",
    status: row.status || "",
    requesterId: row.requester_id || "",
    intendedCustodyType: row.intended_custody_type || "",
    currency: row.currency || "KES",
    totalRequestedAmount: row.total_requested_amount ?? null,
    submittedAt: row.submitted_at || "",
    decidedAt: row.decided_at || "",
  };
}

export function mapReportApproval(row) {
  return {
    id: row.id,
    approvalDomain: row.approval_domain || "",
    approvalType: row.approval_type || "",
    projectId: row.project_id,
    requesterId: row.requester_id || "",
    state: row.state || "",
    decision: row.decision || "",
    requestedAt: row.requested_at || "",
    reviewedAt: row.reviewed_at || "",
    decidedAt: row.decided_at || "",
  };
}

// ---------------------------------------------------------------------------
// Sections
// ---------------------------------------------------------------------------
async function loadDailySite(readers, accessToken, projectId, range, role) {
  if (!canSeeDailySiteReport(role)) return NO_ACCESS();
  return attempt(async () => {
    const [entryRows, complianceRows] = await Promise.all([
      readers.fetchReportDailySiteEntries(accessToken, projectId, range),
      readers.fetchReportRangeCompliance(accessToken, projectId, range),
    ]);
    const entries = (entryRows || []).map(mapReportEntry);
    const compliance = (complianceRows || []).map(mapReportCompliance);
    const summary = summariseRangeCompliance(compliance);
    const labour = plannedLabourTotals(entries, range);
    if (!entries.length && !compliance.length) {
      // The range source enumerates obligation days as well as records, so an
      // entirely empty result for a project in the period is a period-level
      // emptiness. Whether the project ever held an entry is not asserted.
      return section(SECTION_STATE.EMPTY_PERIOD, { entries, compliance, summary, labour });
    }
    return section(SECTION_STATE.READY, { entries, compliance, summary, labour });
  });
}

async function loadClaims(readers, accessToken, projectId, range, bounds, role) {
  if (!canSeeInternalCostReport(role)) return NO_ACCESS();
  return attempt(async () => {
    const [rows, existsEver] = await Promise.all([
      readers.fetchReportClaims(accessToken, projectId, bounds),
      readers.fetchReportClaimExists(accessToken, projectId),
    ]);
    const claims = (rows || []).map(mapReportClaim);
    const totals = claimTotals(claims, range);
    if (!claims.length) return section(emptyState(existsEver), { claims, totals });
    return section(SECTION_STATE.READY, { claims, totals });
  });
}

async function loadFundRequests(readers, accessToken, projectId, range, bounds, role) {
  if (!canSeeFundRequestReport(role)) return NO_ACCESS();
  return attempt(async () => {
    const [rows, existsEver] = await Promise.all([
      readers.fetchReportFundRequests(accessToken, projectId, bounds),
      readers.fetchReportFundRequestExists(accessToken, projectId),
    ]);
    const requests = (rows || []).map(mapReportFundRequest);
    const totals = fundRequestTotals(requests, range);
    if (!requests.length) return section(emptyState(existsEver), { requests, totals });
    return section(SECTION_STATE.READY, { requests, totals });
  });
}

async function loadApprovals(readers, accessToken, projectId, bounds, role) {
  if (!canSeeApprovalsReport(role)) return NO_ACCESS();
  return attempt(async () => {
    const [rows, openRows, existsEver] = await Promise.all([
      readers.fetchReportApprovals(accessToken, projectId, bounds),
      readers.fetchOpenReportApprovals(accessToken, projectId),
      readers.fetchReportApprovalExists(accessToken, projectId),
    ]);
    const approvals = (rows || []).map(mapReportApproval);
    const open = (openRows || []).map(mapReportApproval);
    if (!approvals.length) return section(emptyState(existsEver), { approvals, open });
    return section(SECTION_STATE.READY, { approvals, open });
  });
}

// ---------------------------------------------------------------------------
// Recent Activity
// ---------------------------------------------------------------------------
// A safe, non-persistent projection over the immutable event sources. Only the
// source domain, a plain event label, the actor, the normalised timestamp, the
// originating record id and the project survive the projection. Nothing that
// could carry a snapshot or payload is selected upstream, so nothing of the
// kind can be projected here.
export function projectActivityItems({ projectEvents, dailySiteEvents, claimEvents, fundEvents, approvalEvents }) {
  const items = [];
  for (const row of projectEvents || []) {
    items.push({
      id: `project-${row.id}`,
      sourceDomain: "project",
      eventType: row.action,
      actorId: row.actor_id || "",
      occurredAt: row.occurred_at || "",
      recordId: row.project_id,
      projectId: row.project_id,
      route: `/admin/projects/${row.project_id}`,
    });
  }
  for (const row of dailySiteEvents || []) {
    items.push({
      id: `daily-${row.id}`,
      sourceDomain: "daily_site",
      eventType: row.event_type,
      actorId: row.actor_id || "",
      occurredAt: row.occurred_at || "",
      recordId: row.daily_site_entry_id,
      projectId: row.daily_site_entries?.project_id || "",
      route: `/admin/daily-site-operations/${row.daily_site_entry_id}`,
    });
  }
  for (const row of claimEvents || []) {
    items.push({
      id: `claim-${row.id}`,
      sourceDomain: "internal_cost",
      eventType: row.event_type,
      actorId: row.actor_id || "",
      occurredAt: row.occurred_at || "",
      recordId: row.claim_id,
      projectId: row.internal_cost_claims?.project_id || "",
      route: `/admin/site-costs/${row.claim_id}`,
    });
  }
  for (const row of fundEvents || []) {
    items.push({
      id: `fund-${row.id}`,
      sourceDomain: "fund_request",
      eventType: row.event_type,
      actorId: row.actor_id || "",
      // fund_request_events stamps created_at; normalised here so every domain
      // orders on one comparable timestamp.
      occurredAt: row.created_at || "",
      recordId: row.fund_request_id,
      projectId: row.fund_requests?.project_id || "",
      route: `/admin/fund-requests/${row.fund_request_id}`,
    });
  }
  for (const row of approvalEvents || []) {
    items.push({
      id: `approval-${row.id}`,
      sourceDomain: "approval",
      eventType: row.event_type,
      actorId: row.actor_id || "",
      occurredAt: row.occurred_at || "",
      recordId: row.approval_request_id,
      projectId: row.approval_requests?.project_id || "",
      route: `/admin/approvals/${row.approval_request_id}`,
    });
  }
  return items
    .sort((left, right) => (right.occurredAt || "").localeCompare(left.occurredAt || ""))
    .slice(0, RECENT_ACTIVITY_LIMIT);
}

async function loadRecentActivity(readers, accessToken, projectId, bounds, role) {
  const sources = [];
  if (canSeeProjectHistoryReport(role)) {
    sources.push(["projectEvents", () => readers.fetchProjectHistoryEvents(accessToken, projectId, bounds)]);
  }
  if (canSeeDailySiteReport(role)) {
    sources.push(["dailySiteEvents", () => readers.fetchDailySiteEvents(accessToken, projectId, bounds)]);
  }
  if (canSeeInternalCostReport(role)) {
    sources.push(["claimEvents", () => readers.fetchClaimEvents(accessToken, projectId, bounds)]);
  }
  if (canSeeFundRequestReport(role)) {
    sources.push(["fundEvents", () => readers.fetchFundRequestEvents(accessToken, projectId, bounds)]);
  }
  if (canSeeApprovalsReport(role)) {
    sources.push(["approvalEvents", () => readers.fetchApprovalEvents(accessToken, projectId, bounds)]);
  }
  if (!sources.length) return NO_ACCESS();

  return attempt(async () => {
    const results = await Promise.all(sources.map(([, load]) => load()));
    const grouped = Object.fromEntries(sources.map(([key], index) => [key, results[index]]));
    const items = projectActivityItems(grouped);
    // Recent Activity reads only the selected period, so an empty result means
    // "nothing in this period". It never claims a project has no history.
    if (!items.length) return section(SECTION_STATE.EMPTY_PERIOD, { items });
    return section(SECTION_STATE.READY, { items });
  });
}

// ---------------------------------------------------------------------------
// Approvals and Decisions
// ---------------------------------------------------------------------------
// A LABELLED PROJECTION over three source groups — project approval requests,
// Internal Cost Claim decisions and Fund Request decisions — because reading
// the project-approvals table alone would omit every finance decision.
//
// Finance decisions are NOT written into approval_requests, no generic approval
// ledger is created, and nothing is stored: this is a read-time projection.
// Each projected item keeps its source domain, its originating record id, the
// decision state, the relevant timestamp and its exact source route. The
// current decision summary is kept separate from event history, which lives in
// Recent Activity, and one record produces at most one current-decision row, so
// a decision is never rendered twice.
//
// Project Intakes are deliberately excluded from this first project report:
// they precede a consistently established project identity.
const CLAIM_DECIDED_LIFECYCLES = ["approved", "rejected", "amendment_requested"];
const FUND_DECIDED_STATUSES = ["approved", "rejected", "amendment_requested"];
const APPROVAL_OPEN_STATES = ["submitted", "awaiting_review", "amendment_requested"];

export function deriveApprovalsProjection({ approvals, claims, fundRequests, range }) {
  const decisions = [];
  const awaiting = [];
  const sourceNotes = [];

  if (approvals?.state === SECTION_STATE.NO_ACCESS) {
    sourceNotes.push("Project approvals are outside your access and are not included below.");
  } else if (approvals?.state === SECTION_STATE.ERROR) {
    sourceNotes.push("Project approvals could not be loaded and are not included below.");
  } else {
    for (const request of approvals?.approvals || []) {
      // An amendment request is authoritatively timed by its review timestamp;
      // an approval or rejection by its decision timestamp.
      const isAmendment = request.state === "amendment_requested";
      const decidedAt = isAmendment ? request.reviewedAt : request.decidedAt;
      if (decidedAt && isWithinPeriod(decidedAt, range)) {
        decisions.push({
          id: `approval-${request.id}`,
          sourceDomain: "approval",
          recordId: request.id,
          reference: request.approvalType,
          state: isAmendment ? "amendment_requested" : request.state,
          decidedAt,
          actorId: "",
          route: `/admin/approvals/${request.id}`,
        });
      }
    }
    for (const request of approvals?.open || []) {
      if (APPROVAL_OPEN_STATES.includes(request.state)) {
        awaiting.push({
          id: `approval-open-${request.id}`,
          sourceDomain: "approval",
          recordId: request.id,
          reference: request.approvalType,
          state: request.state,
          requestedAt: request.requestedAt,
          route: `/admin/approvals/${request.id}`,
        });
      }
    }
  }

  if (claims?.state === SECTION_STATE.NO_ACCESS) {
    sourceNotes.push("Internal cost decisions are outside your access and are not included below.");
  } else if (claims?.state === SECTION_STATE.ERROR) {
    sourceNotes.push("Internal cost decisions could not be loaded and are not included below.");
  } else {
    for (const claim of claims?.claims || []) {
      if (CLAIM_DECIDED_LIFECYCLES.includes(claim.lifecycle) && isWithinPeriod(claim.decidedAt, range)) {
        decisions.push({
          id: `claim-${claim.id}`,
          sourceDomain: "internal_cost",
          recordId: claim.id,
          reference: claim.recipientLabel,
          state: claim.lifecycle,
          decidedAt: claim.decidedAt,
          actorId: claim.deciderId,
          route: `/admin/site-costs/${claim.id}`,
        });
      }
      if (claim.lifecycle === "awaiting_review") {
        awaiting.push({
          id: `claim-open-${claim.id}`,
          sourceDomain: "internal_cost",
          recordId: claim.id,
          reference: claim.recipientLabel,
          state: claim.lifecycle,
          requestedAt: claim.submittedAt,
          route: `/admin/site-costs/${claim.id}`,
        });
      }
    }
  }

  if (fundRequests?.state === SECTION_STATE.NO_ACCESS) {
    sourceNotes.push("Fund request decisions are outside your access and are not included below.");
  } else if (fundRequests?.state === SECTION_STATE.ERROR) {
    sourceNotes.push("Fund request decisions could not be loaded and are not included below.");
  } else {
    for (const request of fundRequests?.requests || []) {
      if (FUND_DECIDED_STATUSES.includes(request.status) && isWithinPeriod(request.decidedAt, range)) {
        decisions.push({
          id: `fund-${request.id}`,
          sourceDomain: "fund_request",
          recordId: request.id,
          reference: request.requestNumber,
          state: request.status,
          decidedAt: request.decidedAt,
          actorId: "",
          route: `/admin/fund-requests/${request.id}`,
        });
      }
      if (request.status === "submitted") {
        awaiting.push({
          id: `fund-open-${request.id}`,
          sourceDomain: "fund_request",
          recordId: request.id,
          reference: request.requestNumber,
          state: request.status,
          requestedAt: request.submittedAt,
          route: `/admin/fund-requests/${request.id}`,
        });
      }
    }
  }

  decisions.sort((left, right) => (right.decidedAt || "").localeCompare(left.decidedAt || ""));
  awaiting.sort((left, right) => (right.requestedAt || "").localeCompare(left.requestedAt || ""));

  const states = [approvals?.state, claims?.state, fundRequests?.state];
  let state = SECTION_STATE.READY;
  if (states.every((value) => value === SECTION_STATE.NO_ACCESS)) {
    state = SECTION_STATE.NO_ACCESS;
  } else if (states.every((value) => value === SECTION_STATE.ERROR)) {
    state = SECTION_STATE.ERROR;
  } else if (!decisions.length && !awaiting.length) {
    state = SECTION_STATE.EMPTY_PERIOD;
  }

  return { state, decisions, awaiting, sourceNotes };
}

// ---------------------------------------------------------------------------
// Needs Attention
// ---------------------------------------------------------------------------
// A derived summary of CURRENT source states. It is not Work Inbox state: it
// carries no read/unread flag, no recipient and no delivery. Each item points
// at its originating record or a correctly filtered source list.
export function deriveNeedsAttention({ project, dailySite, claims, fundRequests, approvals, today }) {
  const items = [];

  if (project?.blocker) {
    items.push({
      id: "project-blocker",
      severity: "high",
      title: "Project blocker recorded",
      detail: project.blocker,
      route: `/admin/projects/${project.id}`,
    });
  }

  if (project?.nextAction && project.nextActionDate) {
    if (project.nextActionDate < today) {
      items.push({
        id: "next-action-overdue",
        severity: "high",
        title: "Next action is overdue",
        detail: project.nextAction,
        route: `/admin/projects/${project.id}`,
      });
    }
  }

  if (project?.targetCompletionDate && !project.actualCompletionDate) {
    if (project.targetCompletionDate < today) {
      items.push({
        id: "target-completion-passed",
        severity: "high",
        title: "Target completion date has passed",
        detail: `Target completion was ${project.targetCompletionDate}.`,
        route: `/admin/projects/${project.id}`,
      });
    } else if (withinDays(today, project.targetCompletionDate, 14)) {
      items.push({
        id: "target-completion-approaching",
        severity: "medium",
        title: "Target completion is approaching",
        detail: `Target completion is ${project.targetCompletionDate}.`,
        route: `/admin/projects/${project.id}`,
      });
    }
  }

  if (approvals?.state === SECTION_STATE.READY || approvals?.open?.length) {
    const open = approvals.open || [];
    if (open.length) {
      items.push({
        id: "approvals-open",
        severity: "medium",
        title: `${open.length} project approval${open.length === 1 ? "" : "s"} awaiting a decision`,
        detail: "Open in Approvals to review the request and its history.",
        route: `/admin/approvals?project=${project?.id || ""}&status=open`,
      });
    }
  }

  if (claims?.state === SECTION_STATE.READY) {
    const awaiting = (claims.claims || []).filter((claim) => claim.lifecycle === "awaiting_review");
    if (awaiting.length) {
      items.push({
        id: "claims-awaiting",
        severity: "medium",
        title: `${awaiting.length} internal cost claim${awaiting.length === 1 ? "" : "s"} awaiting review`,
        detail: "Submitted for a decision. Nothing has been approved, released or paid.",
        route: `/admin/site-costs?project=${project?.id || ""}&status=awaiting_review`,
      });
    }
    const returned = (claims.claims || []).filter((claim) => claim.lifecycle === "amendment_requested");
    if (returned.length) {
      items.push({
        id: "claims-returned",
        severity: "medium",
        title: `${returned.length} internal cost claim${returned.length === 1 ? "" : "s"} returned for correction`,
        detail: "Returned to the requester. These are excluded from every reported total.",
        route: `/admin/site-costs?project=${project?.id || ""}&status=amendment_requested`,
      });
    }
  }

  if (fundRequests?.state === SECTION_STATE.READY) {
    const submitted = (fundRequests.requests || []).filter((request) => request.status === "submitted");
    if (submitted.length) {
      items.push({
        id: "funds-submitted",
        severity: "medium",
        title: `${submitted.length} fund request${submitted.length === 1 ? "" : "s"} submitted for decision`,
        detail: "Awaiting Principal authority. No funding has been authorised or released.",
        route: `/admin/fund-requests?project=${project?.id || ""}&status=submitted`,
      });
    }
  }

  if (dailySite?.state === SECTION_STATE.READY) {
    const returned = (dailySite.entries || []).filter(
      (entry) => entry.state === "returned_for_correction"
    );
    if (returned.length) {
      items.push({
        id: "daily-returned",
        severity: "medium",
        title: `${returned.length} site entr${returned.length === 1 ? "y" : "ies"} returned for correction`,
        detail: "Returned entries are excluded from every planned figure in this report.",
        route: `/admin/daily-site-operations?project=${project?.id || ""}&status=returned`,
      });
    }
    const missing = dailySite.summary?.missing || 0;
    if (missing) {
      items.push({
        id: "daily-missing",
        severity: "high",
        title: `${missing} site day${missing === 1 ? "" : "s"} with no entry`,
        detail: "A morning entry was due and none was submitted or waived.",
        route: `/admin/daily-site-operations?project=${project?.id || ""}&status=all`,
      });
    }
    const late = dailySite.summary?.submittedLate || 0;
    if (late) {
      items.push({
        id: "daily-late",
        severity: "low",
        title: `${late} site entr${late === 1 ? "y" : "ies"} submitted late`,
        detail: "Submitted after the morning deadline for the work date.",
        route: `/admin/daily-site-operations?project=${project?.id || ""}&status=late`,
      });
    }
  }

  return items;
}

function withinDays(today, targetDate, days) {
  const from = Date.parse(`${today}T00:00:00+03:00`);
  const to = Date.parse(`${targetDate}T00:00:00+03:00`);
  if (Number.isNaN(from) || Number.isNaN(to)) return false;
  const diff = Math.round((to - from) / 86400000);
  return diff >= 0 && diff <= days;
}

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------
export async function loadProjectReport({
  accessToken,
  projectId,
  range,
  role,
  today,
  authorisedProjectIds,
  readers = DEFAULT_READERS,
}) {
  const bounds = periodInstants(range);
  if (!projectId || !bounds) return null;

  // Fail closed: an omitted, empty or non-matching authorised set reads nothing.
  if (!isAuthorisedProject(projectId, authorisedProjectIds)) {
    return unavailableProjectReport(projectId, range);
  }

  let overview;
  try {
    overview = section(SECTION_STATE.READY, {
      project: mapReportProject(await readers.fetchReportProject(accessToken, projectId)),
    });
    // The project passed the context gate, so an absent row is an access or
    // visibility fact, not a failed read. It is never shown as a load error, an
    // empty project or zero activity.
    if (!overview.project) overview = NO_ACCESS();
  } catch {
    overview = section(SECTION_STATE.ERROR);
  }

  const [dailySite, claims, fundRequests, approvals, recentActivity] = await Promise.all([
    loadDailySite(readers, accessToken, projectId, range, role),
    loadClaims(readers, accessToken, projectId, range, bounds, role),
    loadFundRequests(readers, accessToken, projectId, range, bounds, role),
    loadApprovals(readers, accessToken, projectId, bounds, role),
    loadRecentActivity(readers, accessToken, projectId, bounds, role),
  ]);

  const needsAttention = deriveNeedsAttention({
    project: overview.project,
    dailySite,
    claims,
    fundRequests,
    approvals,
    today,
  });

  const approvalsProjection = deriveApprovalsProjection({
    approvals,
    claims,
    fundRequests,
    range,
  });

  return {
    projectId,
    range,
    projectContext: PROJECT_CONTEXT.AUTHORISED,
    overview,
    dailySite,
    claims,
    fundRequests,
    approvals,
    approvalsProjection,
    recentActivity,
    needsAttention,
  };
}
