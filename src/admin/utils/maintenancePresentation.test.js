import { describe, expect, it } from "vitest";
import {
  dedupeMaintenanceEligibleProjects,
  maintenanceProjectChoiceLabel,
} from "./maintenancePresentation";

describe("maintenance project choice presentation", () => {
  it("does not append Project lifecycle status to the Maintenance choice", () => {
    expect(maintenanceProjectChoiceLabel({
      projectName: "Alego Usonga",
      clientSiteName: "Allan Ouma",
      status: "Completed",
    })).toBe("Alego Usonga — Allan Ouma");
  });

  it("keeps a clean project name when there is no distinct client/site label", () => {
    expect(maintenanceProjectChoiceLabel({
      projectName: "Muthithi Gardens Estate",
      clientSiteName: "",
      status: "Completed",
    })).toBe("Muthithi Gardens Estate");
  });

  it("collapses indistinguishable duplicate project names and prefers the richer canonical row", () => {
    const rows = dedupeMaintenanceEligibleProjects([
      {
        id: "duplicate-lugulu",
        projectName: "Lugulu Residential Home",
        clientSiteName: "",
        status: "Completed",
      },
      {
        id: "canonical-lugulu",
        projectName: "Lugulu Residential Home",
        clientSiteName: "Eugen Awori",
        status: "Completed",
      },
      {
        id: "alego",
        projectName: "Alego Usonga",
        clientSiteName: "Allan Ouma",
        status: "Completed",
      },
    ]);

    expect(rows.map((row) => row.id)).toEqual(["alego", "canonical-lugulu"]);
  });
});
