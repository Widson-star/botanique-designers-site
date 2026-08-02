// BD-REPORTS-01B — the drill-through URL builder.
//
// Reports no longer reproduces the records behind its figures, so the link is
// the whole of the drill-through. It must land on the same project and the
// same period, and it must never degrade into an unfiltered module index.
import { describe, expect, it } from "vitest";
import { moduleLink } from "./reportLinks";

const RANGE = { preset: "this_month", startDate: "2026-08-01", endDate: "2026-08-31" };

describe("moduleLink", () => {
  it("carries the project, the status and the exact reporting period", () => {
    expect(moduleLink("/admin/site-costs", { projectId: "p1", status: "all", range: RANGE })).toBe(
      "/admin/site-costs?project=p1&status=all&from=2026-08-01&to=2026-08-31"
    );
  });

  it("claims no period for a destination that was given none", () => {
    expect(moduleLink("/admin/approvals", { projectId: "p1", status: "open" })).toBe(
      "/admin/approvals?project=p1&status=open"
    );
  });

  it("omits an incomplete range rather than sending half of one", () => {
    expect(
      moduleLink("/admin/fund-requests", { projectId: "p1", range: { startDate: "2026-08-01" } })
    ).toBe("/admin/fund-requests?project=p1");
  });

  it("encodes its parameters rather than pasting them into the query", () => {
    const link = moduleLink("/admin/site-costs", { projectId: "a b&c=d", status: "all" });
    expect(link).toContain("project=a+b%26c%3Dd");
    expect(link).not.toContain("&c=d&");
  });

  it("never produces a bare module index when it was given a project", () => {
    expect(moduleLink("/admin/site-costs", { projectId: "p1" })).not.toBe("/admin/site-costs");
  });
});
