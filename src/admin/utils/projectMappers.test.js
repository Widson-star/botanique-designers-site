import { describe, expect, it } from "vitest";
import { mapDatabaseProject } from "./projectMappers";

describe("mapDatabaseProject portfolio fidelity", () => {
  it("preserves false eligibility and Not Reviewed from the returned representation", () => {
    const mapped = mapDatabaseProject({
      id: "new-project",
      project_name: "Alego Usonga",
      project_type: "Residential",
      status: "Pending",
      stage: "Inquiry",
      portfolio_eligible: false,
      portfolio_permission_status: "Not Reviewed",
      archived: false,
    });

    expect(mapped.portfolioEligible).toBe(false);
    expect(mapped.portfolioPermissionStatus).toBe("Not Reviewed");
  });

  it("uses the controlled founder identity for compact project contexts", () => {
    const mapped = mapDatabaseProject(
      {
        id: "founder-led",
        project_name: "Founder-led project",
        project_type: "Residential",
        status: "Ongoing",
        stage: "Implementation",
        lead_person_id: "owner-1",
        portfolio_eligible: false,
        portfolio_permission_status: "Not Reviewed",
        archived: false,
      },
      {
        "owner-1": {
          role: "owner",
          email: "widson@botaniquedesigners.com",
          full_name: "Widson Ambaisi",
        },
      }
    );

    expect(mapped.leadPersonName).toBe("Widson O. Ambaisi");
  });

  it("does not abbreviate Martine Lotom", () => {
    const mapped = mapDatabaseProject(
      {
        id: "manager-led",
        project_name: "Manager-led project",
        project_type: "Residential",
        status: "Ongoing",
        stage: "Implementation",
        lead_person_id: "manager-1",
        portfolio_eligible: false,
        portfolio_permission_status: "Not Reviewed",
        archived: false,
      },
      {
        "manager-1": {
          role: "manager",
          email: "martine@botaniquedesigners.com",
          full_name: "Martine Lotom",
        },
      }
    );

    expect(mapped.leadPersonName).toBe("Martine Lotom");
  });
});
