import { describe, it, expect } from "vitest";
import {
  canActivate,
  canArchive,
  canCancel,
  canCreateProjects,
  canEditProjects,
  canMarkCompleted,
  canRestore,
  canSeePendingActivation,
  leadOptionsForRole,
  projectFormCapabilities,
  stageOptionsForForm,
  statusOptionsForForm,
} from "./projectCapabilities";
import { PROJECT_STAGES, PROJECT_STATUSES } from "../constants/projectStatus";

const OWNER = "owner";
const MANAGER = "manager";
const STAFF = "staff";
const VIEWER = "viewer";

const pending = { status: "Pending", stage: "Inquiry", archived: false };
const ongoing = { status: "Ongoing", stage: "Implementation", archived: false };
const archived = { status: "Ongoing", stage: "Implementation", archived: true };

describe("owner capabilities", () => {
  it("exposes all statuses and stages in the form", () => {
    expect(statusOptionsForForm(OWNER, "create")).toEqual(PROJECT_STATUSES);
    expect(stageOptionsForForm(OWNER, "create")).toEqual(PROJECT_STAGES);
  });

  it("can run material actions in the correct states", () => {
    expect(canActivate(OWNER, pending)).toBe(true);
    expect(canActivate(OWNER, ongoing)).toBe(false);
    expect(canMarkCompleted(OWNER, ongoing)).toBe(true);
    expect(canCancel(OWNER, ongoing)).toBe(true);
    expect(canArchive(OWNER, ongoing)).toBe(true);
    expect(canArchive(OWNER, archived)).toBe(false);
    expect(canRestore(OWNER, archived)).toBe(true);
  });

  it("sees the pending-activation view", () => {
    expect(canSeePendingActivation(OWNER)).toBe(true);
  });

  it("can edit target and actual completion + portfolio", () => {
    const caps = projectFormCapabilities(OWNER, "edit", ongoing);
    expect(caps.targetCompletionEditable).toBe(true);
    expect(caps.actualCompletionEditable).toBe(true);
    expect(caps.portfolioEditable).toBe(true);
  });
});

describe("manager capabilities", () => {
  it("is fixed to Pending on create and excludes Completed/Archived stages", () => {
    expect(statusOptionsForForm(MANAGER, "create")).toEqual(["Pending"]);
    const stages = stageOptionsForForm(MANAGER, "create");
    expect(stages).not.toContain("Completed");
    expect(stages).not.toContain("Archived");
  });

  it("permits status change only Ongoing<->Paused on edit", () => {
    expect(statusOptionsForForm(MANAGER, "edit", "Ongoing")).toEqual(["Ongoing", "Paused"]);
    expect(statusOptionsForForm(MANAGER, "edit", "Paused")).toEqual(["Ongoing", "Paused"]);
    // Any protected status is shown read-only (single value).
    expect(statusOptionsForForm(MANAGER, "edit", "Pending")).toEqual(["Pending"]);
    expect(statusOptionsForForm(MANAGER, "edit", "Completed")).toEqual(["Completed"]);
  });

  it("cannot set or reverse a Completed/Archived stage", () => {
    expect(stageOptionsForForm(MANAGER, "edit", "Completed")).toEqual(["Completed"]);
    expect(stageOptionsForForm(MANAGER, "edit", "Implementation")).not.toContain("Completed");
  });

  it("has no owner material actions", () => {
    expect(canActivate(MANAGER, pending)).toBe(false);
    expect(canMarkCompleted(MANAGER, ongoing)).toBe(false);
    expect(canCancel(MANAGER, ongoing)).toBe(false);
    expect(canArchive(MANAGER, ongoing)).toBe(false);
    expect(canRestore(MANAGER, archived)).toBe(false);
    expect(canSeePendingActivation(MANAGER)).toBe(false);
  });

  it("cannot edit actual completion or portfolio; target only on create", () => {
    const editCaps = projectFormCapabilities(MANAGER, "edit", ongoing);
    expect(editCaps.actualCompletionEditable).toBe(false);
    expect(editCaps.actualCompletionVisible).toBe(false);
    expect(editCaps.portfolioEditable).toBe(false);
    expect(editCaps.targetCompletionEditable).toBe(false);

    const createCaps = projectFormCapabilities(MANAGER, "create", null);
    expect(createCaps.targetCompletionEditable).toBe(true);
  });
});

describe("staff and viewer capabilities", () => {
  it("cannot create or edit project-master records", () => {
    for (const role of [STAFF, VIEWER]) {
      expect(canCreateProjects(role)).toBe(false);
      expect(canEditProjects(role)).toBe(false);
    }
  });
});

describe("lead options", () => {
  const profiles = [
    { id: "o1", role: "owner", is_active: true, full_name: "Owner" },
    { id: "m1", role: "manager", is_active: true, full_name: "Martine" },
    { id: "s1", role: "staff", is_active: true, full_name: "Staff A" },
    { id: "s2", role: "staff", is_active: false, full_name: "Inactive Staff" },
  ];

  it("owner may assign active owner/manager/staff", () => {
    const ids = leadOptionsForRole(OWNER, profiles).map((p) => p.id);
    expect(ids).toEqual(["o1", "m1", "s1"]);
  });

  it("manager may assign self or active staff only", () => {
    const ids = leadOptionsForRole(MANAGER, profiles, "m1").map((p) => p.id);
    expect(ids).toContain("m1");
    expect(ids).toContain("s1");
    expect(ids).not.toContain("o1");
    expect(ids).not.toContain("s2");
  });
});
