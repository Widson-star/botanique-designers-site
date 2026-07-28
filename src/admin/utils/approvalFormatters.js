export const APPROVAL_TYPE_LABELS = {
  project_activation: "Project activation",
  project_target_completion_change: "Target completion change",
  project_completion: "Project completion",
  project_cancellation: "Project cancellation",
  project_archive: "Project archive",
  project_restore: "Project restoration",
};

export const APPROVAL_STATE_LABELS = {
  submitted: "Submitted",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const APPROVAL_EVENT_LABELS = {
  submitted: "Request submitted",
  review_started: "Queued for review",
  amendment_requested: "Amendment requested",
  amended: "Proposal amended",
  resubmitted: "Request resubmitted",
  approved: "Request approved",
  rejected: "Request rejected",
  withdrawn: "Request withdrawn",
  project_change_applied: "Approved project change applied",
};

const VALUE_LABELS = {
  status: "Status",
  target_completion_date: "Target completion",
  actual_completion_date: "Actual completion",
  archived: "Archived",
};

export function mapApprovalRequest(row) {
  return {
    id: row.id,
    approvalDomain: row.approval_domain,
    approvalType: row.approval_type,
    projectId: row.project_id,
    requesterId: row.requester_id,
    state: row.state,
    requestRound: row.request_round,
    originalValues: row.original_values || {},
    proposedValues: row.proposed_values || {},
    reason: row.reason || "",
    requesterNotes: row.requester_notes || "",
    decision: row.decision || "",
    decisionNotes: row.decision_notes || "",
    requestedAt: row.requested_at || "",
    reviewedAt: row.reviewed_at || "",
    decidedAt: row.decided_at || "",
    withdrawnAt: row.withdrawn_at || "",
    supersedesRequestId: row.supersedes_request_id || "",
  };
}
export function mapApprovalEvent(row) {
  return {
    id: row.id,
    approvalRequestId: row.approval_request_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    fromState: row.from_state || "",
    toState: row.to_state,
    roundNumber: row.round_number,
    eventNotes: row.event_notes || "",
    occurredAt: row.occurred_at || "",
  };
}

export function approvalComparison(request) {
  const keys = Object.keys(request?.proposedValues || {});
  return keys.map((key) => ({
    key,
    label: VALUE_LABELS[key] || key.replaceAll("_", " "),
    before: readableApprovalValue(request.originalValues?.[key]),
    proposed: readableApprovalValue(request.proposedValues?.[key]),
  }));
}

export function readableApprovalValue(value) {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
