import { describe, it, expect } from "vitest";
import {
  buildCreatePayload,
  buildMarkCompletedPatch,
  buildUpdatePatch,
  normalizeOptional,
  projectToFormState,
  validateActualCompletionDate,
  validateProjectForm,
} from "./projectForm";

const AUDIT_COLUMNS = [
  "created_by",
  "updated_by",
  "archived_by",
  "created_at",
  "updated_at",
  "archived_at",
  "last_updated",
];

function baseForm(overrides = {}) {
  return {
    projectName: "Karen Residence",
    clientSiteName: "",
    location: "",
    county: "",
    projectType: "Residential",
    status: "Ongoing",
    stage: "Implementation",
    leadPersonId: "",
    startDate: "",
    actualStartDate: "",
    targetCompletionDate: "",
    actualCompletionDate: "",
    nextAction: "",
    nextActionDate: "",
    blocker: "",
    notes: "",
    portfolioEligible: false,
    portfolioPermissionStatus: "Not Reviewed",
    ...overrides,
  };
}

describe("normalizeOptional", () => {
  it("turns blank / whitespace into null and trims otherwise", () => {
    expect(normalizeOptional("")).toBeNull();
    expect(normalizeOptional("   ")).toBeNull();
    expect(normalizeOptional(null)).toBeNull();
    expect(normalizeOptional("  hi ")).toBe("hi");
  });
});

describe("buildCreatePayload", () => {
  it("owner payload carries chosen status and no audit fields", () => {
    const payload = buildCreatePayload(baseForm({ status: "Ongoing" }), "owner");
    expect(payload.status).toBe("Ongoing");
    expect(payload.project_name).toBe("Karen Residence");
    for (const col of AUDIT_COLUMNS) expect(payload).not.toHaveProperty(col);
  });

  it("forces manager create to Pending / non-portfolio / Not Reviewed and allows a proposed target", () => {
    const payload = buildCreatePayload(
      baseForm({
        status: "Ongoing", // manager cannot really pick this
        portfolioEligible: true,
        portfolioPermissionStatus: "Approved For Portfolio",
        targetCompletionDate: "2026-09-01",
        actualCompletionDate: "2026-10-01",
      }),
      "manager"
    );
    expect(payload.status).toBe("Pending");
    expect(payload.portfolio_eligible).toBe(false);
    expect(payload.portfolio_permission_status).toBe("Not Reviewed");
    expect(payload.target_completion_date).toBe("2026-09-01");
    expect(payload).not.toHaveProperty("actual_completion_date");
    for (const col of AUDIT_COLUMNS) expect(payload).not.toHaveProperty(col);
  });
});

describe("buildUpdatePatch", () => {
  const original = {
    id: "p1",
    projectName: "Karen Residence",
    clientSiteName: "Karen",
    location: "Karen",
    county: "Nairobi",
    projectType: "Residential",
    status: "Ongoing",
    stage: "Implementation",
    leadPersonId: "owner-1",
    leadPersonResolved: false,
    startDate: "",
    actualStartDate: "",
    targetCompletionDate: "2026-09-01",
    actualCompletionDate: "",
    nextAction: "Confirm portfolio permission",
    nextActionDate: "",
    blocker: "",
    notes: "",
    portfolioEligible: true,
    portfolioPermissionStatus: "Permission Needed",
  };

  it("sends only the genuinely changed field", () => {
    const form = { ...projectToFormState(original), nextAction: "Call client" };
    const patch = buildUpdatePatch(form, original, "manager");
    expect(patch).toEqual({ next_action: "Call client" });
  });

  it("normalises a blanked optional to null", () => {
    const form = { ...projectToFormState(original), nextAction: "   " };
    const patch = buildUpdatePatch(form, original, "manager");
    expect(patch).toEqual({ next_action: null });
  });

  it("excludes owner-reserved fields from a manager patch", () => {
    const form = {
      ...projectToFormState(original),
      targetCompletionDate: "2027-01-01",
      actualCompletionDate: "2027-02-01",
      portfolioEligible: false,
      portfolioPermissionStatus: "Approved For Portfolio",
      notes: "Manager note",
    };
    const patch = buildUpdatePatch(form, original, "manager");
    expect(patch).toEqual({ notes: "Manager note" });
    expect(patch).not.toHaveProperty("target_completion_date");
    expect(patch).not.toHaveProperty("actual_completion_date");
    expect(patch).not.toHaveProperty("portfolio_eligible");
    expect(patch).not.toHaveProperty("portfolio_permission_status");
  });

  it("preserves an inaccessible lead during an unrelated manager edit", () => {
    // Manager edits notes only; the (unresolved) lead is untouched, so the raw
    // lead value must NOT appear in the patch (never coerced to null).
    const form = { ...projectToFormState(original), notes: "Updated" };
    const patch = buildUpdatePatch(form, original, "manager");
    expect(patch).not.toHaveProperty("lead_person_id");
  });

  it("owner patch can carry the intended protected change with no audit fields", () => {
    const form = {
      ...projectToFormState(original),
      portfolioPermissionStatus: "Approved For Portfolio",
    };
    const patch = buildUpdatePatch(form, original, "owner");
    expect(patch).toEqual({ portfolio_permission_status: "Approved For Portfolio" });
    for (const col of AUDIT_COLUMNS) expect(patch).not.toHaveProperty(col);
  });
});

describe("buildMarkCompletedPatch", () => {
  it("sends only status + actual completion (no silent stage change)", () => {
    const patch = buildMarkCompletedPatch("2026-12-01");
    expect(patch).toEqual({ status: "Completed", actual_completion_date: "2026-12-01" });
    expect(patch).not.toHaveProperty("stage");
  });

  it("refuses to construct a completion patch without a date", () => {
    expect(() => buildMarkCompletedPatch("")).toThrow(
      "An actual completion date is required."
    );
  });
});

describe("validateActualCompletionDate", () => {
  it("requires a date and rejects a date before actual start", () => {
    expect(validateActualCompletionDate("", "2026-07-10")).toBe(
      "An actual completion date is required."
    );
    expect(validateActualCompletionDate("2026-07-09", "2026-07-10")).toMatch(
      /cannot be before the actual start date/
    );
    expect(validateActualCompletionDate("2026-07-10", "2026-07-10")).toBe("");
  });
});

describe("validateProjectForm", () => {
  it("requires a project name within 160 chars", () => {
    expect(validateProjectForm(baseForm({ projectName: "" })).projectName).toBeTruthy();
    expect(validateProjectForm(baseForm({ projectName: "a".repeat(161) })).projectName).toBeTruthy();
    expect(validateProjectForm(baseForm()).projectName).toBeUndefined();
  });

  it("rejects target completion before planned start", () => {
    const errors = validateProjectForm(
      baseForm({ startDate: "2026-05-01", targetCompletionDate: "2026-04-01" })
    );
    expect(errors.targetCompletionDate).toBeTruthy();
  });

  it("rejects actual completion before actual start", () => {
    const errors = validateProjectForm(
      baseForm({ actualStartDate: "2026-05-01", actualCompletionDate: "2026-04-01" })
    );
    expect(errors.actualCompletionDate).toBeTruthy();
  });
});
