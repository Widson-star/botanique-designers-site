import { describe, it, expect } from "vitest";
import { buildMaterialProposal, buildIntakePayload } from "./projectForm";
import {
  approvalComparison,
  readableApprovalValue,
  APPROVAL_TYPE_LABELS,
} from "./approvalFormatters";
import {
  MATERIAL_FIELD_KEYS,
  canProposeMaterialChange,
  canCreateProjectDirectly,
  canProposeProjectIntake,
  projectFormCapabilities,
} from "./projectCapabilities";

const project = {
  id: "p1",
  projectName: "Karen Residence",
  clientSiteName: "Karen",
  location: "Karen",
  county: "Nairobi",
  projectType: "Residential",
  status: "Ongoing",
  stage: "Implementation",
  leadPersonId: "owner-1",
  startDate: "2026-07-01",
  actualStartDate: "",
  targetCompletionDate: "2026-09-01",
  actualCompletionDate: "",
};

describe("material-change allowlist + role capabilities", () => {
  it("exposes exactly the nine material fields", () => {
    expect(MATERIAL_FIELD_KEYS).toEqual([
      "project_name", "client_site_name", "location", "county", "project_type",
      "stage", "lead_person_id", "start_date", "actual_start_date",
    ]);
  });

  it("gates material editing to the owner and proposals to the manager", () => {
    expect(canCreateProjectDirectly("owner")).toBe(true);
    expect(canCreateProjectDirectly("manager")).toBe(false);
    expect(canProposeProjectIntake("manager")).toBe(true);
    expect(canProposeProjectIntake("owner")).toBe(false);
    expect(canProposeMaterialChange("manager")).toBe(true);
    expect(projectFormCapabilities("owner", "edit", project).materialEditable).toBe(true);
    expect(projectFormCapabilities("manager", "edit", project).materialEditable).toBe(false);
  });
});

describe("buildMaterialProposal", () => {
  it("includes only genuinely changed material fields with original snapshot", () => {
    const proposed = {
      project_name: "Karen Residence", // unchanged
      location: "Kilimani",             // changed
      county: null,                     // changed (cleared)
      project_type: "Residential",      // unchanged
    };
    const result = buildMaterialProposal(project, proposed);
    expect(result.changedKeys.sort()).toEqual(["county", "location"]);
    expect(result.proposedValues).toEqual({ location: "Kilimani", county: null });
    expect(result.originalValues).toEqual({ location: "Karen", county: "Nairobi" });
  });

  it("returns no change when every proposed value matches the project", () => {
    const result = buildMaterialProposal(project, {
      project_name: "Karen Residence",
      location: "Karen",
    });
    expect(result.changedKeys).toEqual([]);
  });
});

describe("buildIntakePayload", () => {
  it("always includes name/type and only supplied optionals", () => {
    const payload = buildIntakePayload({
      projectName: "Nyali Garden",
      projectType: "Hospitality",
      clientSiteName: "",
      location: "Nyali",
      county: "",
      notes: "",
      startDate: "2026-09-01",
      targetCompletionDate: "",
    });
    expect(payload).toEqual({
      project_name: "Nyali Garden",
      project_type: "Hospitality",
      location: "Nyali",
      start_date: "2026-09-01",
    });
    expect(payload).not.toHaveProperty("status");
    expect(payload).not.toHaveProperty("lead_person_id");
  });
});

describe("approvalComparison for a material change", () => {
  const request = {
    approvalType: "project_material_change",
    originalValues: { location: "Karen", lead_person_id: "owner-1" },
    proposedValues: { location: "Kilimani", lead_person_id: "manager-1" },
  };
  const profilesById = {
    "owner-1": { full_name: "Widson Ambaisi" },
    "manager-1": { full_name: "Martine Lotom" },
  };

  it("labels material change and never surfaces a raw UUID or JSON", () => {
    expect(APPROVAL_TYPE_LABELS.project_material_change).toBe("Material project change");
    const rows = approvalComparison(request, { profilesById });
    const lead = rows.find((r) => r.key === "lead_person_id");
    expect(lead.before).toBe("Widson Ambaisi");
    expect(lead.proposed).toBe("Martine Lotom");
    // No raw UUID leaks into any rendered cell.
    const rendered = rows.flatMap((r) => [r.before, r.proposed]).join(" ");
    expect(rendered).not.toMatch(/owner-1|manager-1/);
  });

  it("flags a stale row when the live project drifted from the submission snapshot", () => {
    const rows = approvalComparison(request, {
      profilesById,
      project: { location: "Owner Direct Location", leadPersonId: "owner-1" },
    });
    const loc = rows.find((r) => r.key === "location");
    expect(loc.current).toBe("Owner Direct Location");
    expect(loc.stale).toBe(true);
    const lead = rows.find((r) => r.key === "lead_person_id");
    expect(lead.stale).toBe(false);
  });

  it("renders an unassigned lead safely", () => {
    expect(readableApprovalValue(null, "lead_person_id", profilesById)).toBe("Unassigned");
    expect(readableApprovalValue("ghost-id", "lead_person_id", profilesById)).toBe("Protected profile");
  });
});
