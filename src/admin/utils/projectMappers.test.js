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
});
