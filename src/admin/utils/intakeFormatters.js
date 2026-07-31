// Pure mappers + labels for the project-intake proposal workflow.
export const INTAKE_STATE_LABELS = {
  submitted: "Submitted",
  awaiting_review: "Awaiting review",
  amendment_requested: "Amendment requested",
  approved: "Approved",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const INTAKE_EVENT_LABELS = {
  submitted: "Intake submitted",
  queued_for_review: "Queued for review",
  amendment_requested: "Amendment requested",
  amended: "Proposal amended",
  resubmitted: "Intake resubmitted",
  approved: "Intake approved",
  rejected: "Intake rejected",
  withdrawn: "Intake withdrawn",
  project_created: "Live project created",
};

const INTAKE_FIELD_LABELS = {
  project_name: "Project name",
  project_type: "Project type",
  client_site_name: "Client / site label",
  location: "Location",
  county: "County",
  notes: "Notes",
  start_date: "Planned start",
  target_completion_date: "Target completion",
};

export function mapProjectIntake(row) {
  return {
    id: row.id,
    requesterId: row.requester_id,
    state: row.state,
    requestRound: row.request_round,
    proposedValues: row.proposed_values || {},
    reason: row.reason || "",
    requesterNotes: row.requester_notes || "",
    decision: row.decision || "",
    decisionNotes: row.decision_notes || "",
    createdProjectId: row.created_project_id || "",
    requestedAt: row.requested_at || "",
    reviewedAt: row.reviewed_at || "",
    decidedAt: row.decided_at || "",
    withdrawnAt: row.withdrawn_at || "",
    supersedesRequestId: row.supersedes_request_id || "",
  };
}

export function mapProjectIntakeEvent(row) {
  return {
    id: row.id,
    intakeRequestId: row.intake_request_id,
    eventType: row.event_type,
    actorId: row.actor_id,
    fromState: row.from_state || "",
    toState: row.to_state,
    roundNumber: row.round_number,
    eventNotes: row.event_notes || "",
    occurredAt: row.occurred_at || "",
  };
}

// Readable proposal summary rows (never raw JSON). Only the fields that were
// actually supplied are shown.
export function intakeSummaryRows(intake) {
  const values = intake?.proposedValues || {};
  return Object.keys(INTAKE_FIELD_LABELS)
    .filter((key) => values[key] !== undefined && values[key] !== null && values[key] !== "")
    .map((key) => ({
      key,
      label: INTAKE_FIELD_LABELS[key],
      value: String(values[key]),
    }));
}

export function intakeTitle(intake) {
  return intake?.proposedValues?.project_name || "Untitled proposed project";
}

export const ACTIVE_INTAKE_STATES = ["submitted", "awaiting_review", "amendment_requested"];
