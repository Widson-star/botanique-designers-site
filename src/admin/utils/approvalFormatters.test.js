import { describe, expect, it } from "vitest";
import {
  approvalComparison,
  mapApprovalEvent,
  mapApprovalRequest,
} from "./approvalFormatters";

describe("approval formatters", () => {
  it("maps database requests without exposing raw snapshots", () => {
    const request = mapApprovalRequest({
      id: "request-1",
      approval_domain: "project",
      approval_type: "project_completion",
      project_id: "project-1",
      requester_id: "manager-1",
      state: "awaiting_review",
      request_round: 1,
      original_values: { status: "Ongoing", actual_completion_date: null },
      proposed_values: { status: "Completed", actual_completion_date: "2026-07-28" },
      reason: "Site work is complete.",
    });
    expect(request.approvalType).toBe("project_completion");
    expect(approvalComparison(request)).toEqual([
      { key: "status", label: "Status", before: "Ongoing", proposed: "Completed" },
      {
        key: "actual_completion_date",
        label: "Actual completion",
        before: "Not set",
        proposed: "2026-07-28",
      },
    ]);
  });

  it("maps immutable events to readable application shape", () => {
    expect(mapApprovalEvent({
      id: "event-1",
      approval_request_id: "request-1",
      event_type: "submitted",
      actor_id: "manager-1",
      from_state: null,
      to_state: "submitted",
      round_number: 1,
      event_notes: null,
      occurred_at: "2026-07-28T08:00:00Z",
    })).toMatchObject({
      eventType: "submitted",
      fromState: "",
      roundNumber: 1,
    });
  });
});
