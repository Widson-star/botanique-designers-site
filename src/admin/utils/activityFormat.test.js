import { describe, it, expect } from "vitest";
import { fieldLabel, formatActivity, formatFieldValue } from "./activityFormat";

const UUID = "11111111-2222-3333-4444-555555555555";

describe("field/value formatting", () => {
  it("maps snake_case fields to readable labels", () => {
    expect(fieldLabel("project_name")).toBe("Project name");
    expect(fieldLabel("lead_person_id")).toBe("Accountable lead");
    expect(fieldLabel("portfolio_permission_status")).toBe("Portfolio permission status");
  });

  it("renders booleans as Yes/No and null as Not set", () => {
    expect(formatFieldValue("portfolio_eligible", true)).toBe("Yes");
    expect(formatFieldValue("archived", false)).toBe("No");
    expect(formatFieldValue("notes", null)).toBe("Not set");
    expect(formatFieldValue("blocker", "")).toBe("Not set");
  });

  it("resolves a lead id to a name and NEVER shows the UUID", () => {
    const profilesById = { [UUID]: { full_name: "Martine Lotom" } };
    expect(formatFieldValue("lead_person_id", UUID, profilesById)).toBe("Martine Lotom");
    // Unreadable profile -> safe label, still never the UUID.
    const label = formatFieldValue("lead_person_id", UUID, {});
    expect(label).toBe("Protected profile");
    expect(label).not.toContain(UUID);
  });
});

describe("formatActivity", () => {
  const activity = {
    id: "a1",
    action: "updated",
    actor_id: UUID,
    occurred_at: "2026-07-27T10:00:00Z",
    changed_fields: ["status", "lead_person_id", "portfolio_eligible"],
    previous_values: { status: "Pending", lead_person_id: null, portfolio_eligible: false },
    new_values: { status: "Ongoing", lead_person_id: UUID, portfolio_eligible: true },
    reason: null,
  };

  it("produces human before/after rows without raw JSON or UUIDs", () => {
    const profilesById = { [UUID]: { full_name: "Widson Omutelema Ambaisi" } };
    const formatted = formatActivity(activity, profilesById);
    expect(formatted.actionLabel).toBe("Project updated");
    expect(formatted.actor).toBe("Widson Omutelema Ambaisi");

    const statusChange = formatted.changes.find((c) => c.field === "status");
    expect(statusChange.before).toBe("Pending");
    expect(statusChange.after).toBe("Ongoing");

    const leadChange = formatted.changes.find((c) => c.field === "lead_person_id");
    expect(leadChange.after).toBe("Widson Omutelema Ambaisi");

    const portfolioChange = formatted.changes.find((c) => c.field === "portfolio_eligible");
    expect(portfolioChange.before).toBe("No");
    expect(portfolioChange.after).toBe("Yes");

    // No value anywhere is the raw UUID, and nothing is a JSON blob.
    const serialised = JSON.stringify(formatted.changes);
    expect(serialised).not.toContain(UUID);
  });

  it("falls back to a safe actor label when the profile is unreadable", () => {
    const formatted = formatActivity(activity, {});
    expect(formatted.actor).toBe("Owner or authorised manager");
  });

  it("does not return deprecated last_updated changes for display", () => {
    const formatted = formatActivity(
      {
        ...activity,
        changed_fields: ["last_updated", "status"],
        previous_values: { last_updated: "2026-07-01", status: "Pending" },
        new_values: { last_updated: "2026-07-02", status: "Ongoing" },
      },
      {}
    );
    expect(formatted.changes.map((change) => change.field)).toEqual(["status"]);
  });
});
