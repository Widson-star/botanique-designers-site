import { describe, expect, it } from "vitest";
import { PROJECT_STAGES, PROJECT_TYPES } from "../constants/projectStatus";
import {
  buildCreatePayload,
  buildMarkCompletedPatch,
  deriveInitialStatusFromStage,
  emptyProjectForm,
} from "./projectForm";
import { canClassifyDesignOnly, stageOptionsForForm } from "./projectCapabilities";

describe("Project lifecycle foundation", () => {
  it("derives a coherent initial status from delivery phase", () => {
    expect(deriveInitialStatusFromStage("Inquiry")).toBe("Pending");
    expect(deriveInitialStatusFromStage("Site Assessment")).toBe("Ongoing");
    expect(deriveInitialStatusFromStage("Implementation")).toBe("Ongoing");
    expect(deriveInitialStatusFromStage("Completed")).toBe("Completed");
  });

  it("does not expose Maintenance, Site Visit or Archived as current project stages", () => {
    expect(PROJECT_STAGES).toContain("Site Assessment");
    expect(PROJECT_STAGES).not.toContain("Site Visit");
    expect(PROJECT_STAGES).not.toContain("Maintenance");
    expect(PROJECT_STAGES).not.toContain("Archived");
    expect(PROJECT_TYPES).not.toContain("Maintenance");
  });

  it("ignores a contradictory manually supplied owner status on create", () => {
    const form = { ...emptyProjectForm("owner"), projectName: "Mwiko Gardens", clientSiteName: "Krave Hotel", projectType: "Hospitality", stage: "Completed", status: "Ongoing", nextAction: "Old work", nextActionDate: "2026-08-18", blocker: "Old blocker" };
    const payload = buildCreatePayload(form, "owner");
    expect(payload.status).toBe("Completed");
    expect(payload.stage).toBe("Completed");
    expect(payload.client_site_name).toBe("Krave Hotel");
    expect(payload.actual_completion_date).toBeNull();
    expect(payload.next_action).toBeNull();
    expect(payload.next_action_date).toBeNull();
    expect(payload.blocker).toBeNull();
  });

  it("marks an existing project completed as one coherent transition", () => {
    expect(buildMarkCompletedPatch("2026-08-18")).toEqual({
      status: "Completed",
      stage: "Completed",
      actual_completion_date: "2026-08-18",
      next_action: null,
      next_action_date: null,
      blocker: null,
    });
  });

  it("offers the exact settled delivery phases, in order", () => {
    expect(PROJECT_STAGES).toEqual([
      "Inquiry",
      "Site Assessment",
      "Concept Design",
      "Detailed Design",
      "Quotation Sent",
      "Awaiting Approval",
      "Implementation",
      "Completed",
    ]);
  });

  // The lifecycle trigger rejects Design-only + Implementation, so the quick
  // action must not be offered on a project already in Implementation.
  it("does not offer Design-only classification once delivery reached Implementation", () => {
    const base = { archived: false, status: "Ongoing" };
    expect(canClassifyDesignOnly("owner", { ...base, stage: "Concept Design" })).toBe(true);
    expect(canClassifyDesignOnly("owner", { ...base, stage: "Implementation" })).toBe(false);
  });

  it("keeps a deprecated legacy stage visible on edit without offering it on create", () => {
    expect(stageOptionsForForm("owner", "create", undefined)).not.toContain("Maintenance");
    expect(stageOptionsForForm("owner", "edit", "Maintenance")[0]).toBe("Maintenance");
  });
});
