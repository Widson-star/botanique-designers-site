import { describe, expect, it } from "vitest";
import {
  assignmentRoleLabel, canCorrectMaintenanceAssignment, canManageMaintenance, canSeeMaintenance,
  frequencyLabel, relationshipStatusLabel, visitStatusLabel,
} from "./maintenanceCapabilities";

describe("maintenance capabilities", () => {
  it("permits owner and manager, and nobody else", () => {
    expect(canSeeMaintenance("owner")).toBe(true);
    expect(canSeeMaintenance("manager")).toBe(true);
    expect(canSeeMaintenance("staff")).toBe(false);
    expect(canSeeMaintenance("viewer")).toBe(false);
    expect(canSeeMaintenance(undefined)).toBe(false);
  });

  it("gives manage authority to exactly the same roles as see authority", () => {
    expect(canManageMaintenance("owner")).toBe(true);
    expect(canManageMaintenance("manager")).toBe(true);
    expect(canManageMaintenance("staff")).toBe(false);
  });

  // Correcting a recorded assignment rewrites history, so it is narrower than
  // ordinary management — the Operations Manager keeps every day-to-day power
  // but cannot restate when an assignment started or what it was.
  it("restricts assignment correction to the Principal alone", () => {
    expect(canCorrectMaintenanceAssignment("owner")).toBe(true);
    expect(canCorrectMaintenanceAssignment("manager")).toBe(false);
    expect(canCorrectMaintenanceAssignment("staff")).toBe(false);
    expect(canCorrectMaintenanceAssignment("viewer")).toBe(false);
    expect(canCorrectMaintenanceAssignment(undefined)).toBe(false);
  });

  it("labels every relationship status", () => {
    expect(relationshipStatusLabel("active")).toBe("Active");
    expect(relationshipStatusLabel("paused")).toBe("Paused");
    expect(relationshipStatusLabel("ended")).toBe("Ended");
  });

  it("labels every visit status", () => {
    expect(visitStatusLabel("scheduled")).toBe("Scheduled");
    expect(visitStatusLabel("completed")).toBe("Completed");
    expect(visitStatusLabel("cancelled")).toBe("Cancelled");
  });

  it("labels frequency and assignment role vocabularies", () => {
    expect(frequencyLabel("fortnightly")).toBe("Fortnightly");
    expect(frequencyLabel("as_needed")).toBe("As needed");
    expect(assignmentRoleLabel("maintenance_lead")).toBe("Maintenance lead");
    expect(assignmentRoleLabel("site_technician")).toBe("Site technician");
  });

  it("falls back to the raw value for an unrecognised label", () => {
    expect(relationshipStatusLabel("unknown")).toBe("unknown");
    expect(frequencyLabel("unknown")).toBe("unknown");
  });
});
