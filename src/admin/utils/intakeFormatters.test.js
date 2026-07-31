import { describe, it, expect } from "vitest";
import {
  mapProjectIntake,
  mapProjectIntakeEvent,
  intakeSummaryRows,
  intakeTitle,
  INTAKE_STATE_LABELS,
  INTAKE_EVENT_LABELS,
} from "./intakeFormatters";

describe("intake mappers", () => {
  it("maps a DB intake row to camelCase view state", () => {
    const mapped = mapProjectIntake({
      id: "i1",
      requester_id: "manager-1",
      state: "awaiting_review",
      request_round: 1,
      proposed_values: { project_name: "Nyali", project_type: "Hospitality" },
      reason: "Qualified enquiry.",
      created_project_id: null,
      requested_at: "2026-07-30T09:00:00Z",
    });
    expect(mapped.requesterId).toBe("manager-1");
    expect(mapped.state).toBe("awaiting_review");
    expect(mapped.proposedValues.project_name).toBe("Nyali");
    expect(mapped.createdProjectId).toBe("");
  });

  it("maps an intake event row", () => {
    const mapped = mapProjectIntakeEvent({
      id: "e1",
      intake_request_id: "i1",
      event_type: "project_created",
      actor_id: "owner-1",
      to_state: "approved",
      round_number: 1,
      occurred_at: "2026-07-30T10:00:00Z",
    });
    expect(mapped.eventType).toBe("project_created");
    expect(INTAKE_EVENT_LABELS[mapped.eventType]).toBe("Live project created");
  });
});

describe("intake presentation (never raw JSON)", () => {
  const intake = {
    proposedValues: {
      project_name: "Nyali Coastal Garden",
      project_type: "Hospitality",
      location: "Nyali",
      county: "",
    },
  };

  it("summarises only the supplied fields as labelled rows", () => {
    const rows = intakeSummaryRows(intake);
    expect(rows.map((r) => r.label)).toEqual(["Project name", "Project type", "Location"]);
    expect(rows.find((r) => r.key === "location").value).toBe("Nyali");
  });

  it("derives a human title and knows the state labels", () => {
    expect(intakeTitle(intake)).toBe("Nyali Coastal Garden");
    expect(intakeTitle({ proposedValues: {} })).toBe("Untitled proposed project");
    expect(INTAKE_STATE_LABELS.awaiting_review).toBe("Awaiting review");
  });
});
