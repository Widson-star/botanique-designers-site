import { describe, expect, it } from "vitest";
import { entryForMaintenanceVisit, resolvedEntryForMaintenanceVisit } from "./maintenanceExecution";

const relationship = { id: "rel-1", siteId: "site-1" };
const visit = { id: "visit-1", scheduledDate: "2026-08-25" };

const entry = (overrides) => ({
  id: "e1", siteId: "site-1", projectId: "", maintenanceVisitId: "",
  workDate: "2026-08-25", state: "accepted", ...overrides,
});

describe("entryForMaintenanceVisit", () => {
  it("prefers the durable link over any same-date candidate", () => {
    const linked = entry({ id: "linked", maintenanceVisitId: "visit-1", workDate: "2026-08-25" });
    const sameDate = entry({ id: "same-date" });
    const result = entryForMaintenanceVisit(visit, relationship, [sameDate, linked]);
    expect(result.status).toBe("linked");
    expect(result.entry.id).toBe("linked");
  });

  it("accepts exactly one unlinked same-Site, same-date candidate as legacy truth", () => {
    const result = entryForMaintenanceVisit(visit, relationship, [entry({ id: "legacy" })]);
    expect(result.status).toBe("legacy");
    expect(result.entry.id).toBe("legacy");
  });

  it("never silently chooses between two unlinked same-Site, same-date candidates", () => {
    const result = entryForMaintenanceVisit(visit, relationship, [
      entry({ id: "a" }),
      entry({ id: "b", projectId: "p2" }),
    ]);
    expect(result.status).toBe("ambiguous");
    expect(result.entry).toBeNull();
    expect(result.candidates.map((c) => c.id)).toEqual(["a", "b"]);
    // Callers wanting a definite record get nothing rather than a guess.
    expect(resolvedEntryForMaintenanceVisit(visit, relationship, [entry({ id: "a" }), entry({ id: "b" })])).toBeNull();
  });

  it("does not treat a record claimed by another visit as this visit's execution", () => {
    const claimed = entry({ id: "other", maintenanceVisitId: "visit-99" });
    expect(entryForMaintenanceVisit(visit, relationship, [claimed]).status).toBe("none");
  });

  it("ignores records from another Site, another date, or a dead state", () => {
    const wrongSite = entry({ id: "wrong-site", siteId: "site-2" });
    const wrongDate = entry({ id: "wrong-date", workDate: "2026-08-26" });
    const voided = entry({ id: "voided", state: "voided" });
    const result = entryForMaintenanceVisit(visit, relationship, [wrongSite, wrongDate, voided]);
    expect(result.status).toBe("none");
  });

  it("resolves the same answer whatever order the records arrive in", () => {
    const linked = entry({ id: "linked", maintenanceVisitId: "visit-1" });
    const other = entry({ id: "other" });
    const forwards = entryForMaintenanceVisit(visit, relationship, [linked, other]);
    const backwards = entryForMaintenanceVisit(visit, relationship, [other, linked]);
    expect(forwards.entry.id).toBe(backwards.entry.id);
  });
});
