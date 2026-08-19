import { describe, expect, it } from "vitest";
import {
  maintenanceRecordLabel,
  maintenanceSiteChoiceLabel,
} from "./maintenancePresentation";

describe("maintenance site presentation", () => {
  it("leads with the Site name and never a client name or Project status", () => {
    expect(maintenanceRecordLabel({
      siteName: "Alego Usonga",
      projectName: "Alego Usonga",
      projectStatus: "Completed",
    })).toBe("Alego Usonga");
  });

  it("names a maintenance-only Site without inventing a Project placeholder", () => {
    const label = maintenanceRecordLabel({ siteName: "Riverside Court", projectId: "", projectName: "" });
    expect(label).toBe("Riverside Court");
    expect(label).not.toMatch(/unknown/i);
  });

  it("disambiguates two properties that share a name by location", () => {
    expect(maintenanceSiteChoiceLabel({ siteName: "Lugulu Residential Home", location: "Lugulu" }))
      .toBe("Lugulu Residential Home — Lugulu");
  });

  it("keeps a clean Site name when there is no location", () => {
    expect(maintenanceSiteChoiceLabel({ siteName: "Muthithi Gardens Estate", location: "" }))
      .toBe("Muthithi Gardens Estate");
  });
});
