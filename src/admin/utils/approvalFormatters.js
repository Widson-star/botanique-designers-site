export const APPROVAL_TYPE_LABELS = {
  project_activation: "Project activation",
  project_target_completion_change: "Target completion change",
  project_completion: "Project completion",
  project_cancellation: "Project cancellation",
  project_archive: "Project archive",
  project_restore: "Project restoration",
  project_material_change: "Material project change",
  staff_compensation: "Staff compensation",
};

export const APPROVAL_STATE_LABELS = {
  submitted: "Submitted",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
  cancelled: "Cancelled",
};

export const APPROVAL_EVENT_LABELS = {
  submitted: "Request submitted",
  queued_for_review: "Queued for review",
  amendment_requested: "Amendment requested",
  amended: "Proposal amended",
  resubmitted: "Request resubmitted",
  approved: "Request approved",
  rejected: "Request rejected",
  withdrawn: "Request withdrawn",
  cancelled: "Request cancelled",
  project_change_applied: "Approved project change applied",
};

const VALUE_LABELS = {
  status: "Status",
  target_completion_date: "Target completion",
  actual_completion_date: "Actual completion",
  archived: "Archived",
  // Material-change fields.
  project_name: "Project name",
  client_site_name: "Client / site label",
  location: "Location",
  county: "County",
  project_type: "Project type",
  stage: "Stage",
  lead_person_id: "Accountable lead",
  start_date: "Planned start",
  actual_start_date: "Actual start",
};

export function mapApprovalRequest(row) {
  return {
    id: row.id,
    source: "project",
    sourceId: row.id,
    approvalDomain: row.approval_domain,
    approvalType: row.approval_type,
    projectId: row.project_id,
    personId: "",
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

export function mapStaffCompensationApprovalRequest(row) {
  return {
    id: `staff-compensation-${row.id}`,
    source: "staff_compensation",
    sourceId: row.id,
    approvalDomain: "finance",
    approvalType: "staff_compensation",
    projectId: row.project_id || "",
    personId: row.person_id,
    requesterId: row.requester_id,
    state: row.lifecycle,
    requestRound: row.request_round,
    version: row.version,
    compensationType: row.compensation_type,
    serviceDate: row.service_date,
    submittedAmount: row.submitted_amount,
    approvedAmount: row.approved_amount,
    description: row.description || "",
    originalValues: {},
    proposedValues: {},
    reason: row.description || "",
    requesterNotes: "",
    decision: ["approved", "rejected", "amendment_requested"].includes(row.lifecycle)
      ? row.lifecycle
      : "",
    decisionNotes: "",
    requestedAt: row.submitted_at || row.updated_at || "",
    reviewedAt: row.decided_at || "",
    decidedAt: row.decided_at || "",
    withdrawnAt: row.withdrawn_at || "",
    cancelledAt: row.cancelled_at || "",
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

export function mapStaffCompensationApprovalEvent(row) {
  return {
    id: row.id,
    approvalRequestId: `staff-compensation-${row.compensation_id}`,
    eventType: row.event_type,
    actorId: row.actor_id,
    fromState: row.previous_lifecycle || "",
    toState: row.next_lifecycle || "",
    roundNumber: row.request_round,
    eventNotes: row.reason || "",
    occurredAt: row.occurred_at || "",
  };
}

// Field-by-field diff. When `profilesById` is supplied an accountable-lead UUID
// is resolved to a person name (a raw UUID is never surfaced). When the live
// `project` is supplied, a per-field CURRENT value and a `stale` flag (the live
// value has drifted from the captured original) are included so the owner sees
// original -> current -> proposed without any raw JSON.
export function approvalComparison(request, options = {}) {
  const { profilesById = null, project = null } = options;
  const keys = Object.keys(request?.proposedValues || {});
  const liveByKey = project ? projectLiveValues(project) : null;
  return keys.map((key) => {
    const originalRaw = request.originalValues?.[key];
    const proposedRaw = request.proposedValues?.[key];
    const liveRaw = liveByKey ? liveByKey[key] : undefined;
    const row = {
      key,
      label: VALUE_LABELS[key] || key.replaceAll("_", " "),
      before: readableApprovalValue(originalRaw, key, profilesById),
      proposed: readableApprovalValue(proposedRaw, key, profilesById),
    };
    if (liveByKey && Object.prototype.hasOwnProperty.call(liveByKey, key)) {
      row.current = readableApprovalValue(liveRaw, key, profilesById);
      row.stale = normaliseForCompare(liveRaw) !== normaliseForCompare(originalRaw);
    }
    return row;
  });
}

// Map the mapped project (camelCase) back to the DB material-field keys so the
// diff can show the current live value alongside the proposal.
function projectLiveValues(project) {
  return {
    project_name: project.projectName ?? null,
    client_site_name: project.clientSiteName ?? null,
    location: project.location ?? null,
    county: project.county ?? null,
    project_type: project.projectType ?? null,
    stage: project.stage ?? null,
    lead_person_id: project.leadPersonId ?? null,
    start_date: project.startDate ?? null,
    actual_start_date: project.actualStartDate ?? null,
    status: project.status ?? null,
    target_completion_date: project.targetCompletionDate ?? null,
    actual_completion_date: project.actualCompletionDate ?? null,
    archived: project.archived ?? null,
  };
}

function normaliseForCompare(value) {
  if (value === null || value === undefined || value === "") return null;
  return value;
}

export function readableApprovalValue(value, key = "", profilesById = null) {
  if (key === "lead_person_id") {
    if (!value) return "Unassigned";
    const profile = profilesById ? profilesById[value] : null;
    if (profile) return profile.full_name || profile.email || "Team member";
    return "Protected profile";
  }
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}
