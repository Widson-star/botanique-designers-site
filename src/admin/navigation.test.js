import { describe, expect, it } from "vitest";
import { NAV_DOMAINS, resolveActive, visibleDomains } from "./navigation";
import { ROLES } from "./constants/roles";

describe("NAV_DOMAINS shape", () => {
  it("has exactly the six operating-model domains, in order, with no More", () => {
    expect(NAV_DOMAINS.map((domain) => domain.id)).toEqual([
      "dashboard",
      "projects",
      "operations",
      "finance",
      "approvals",
      "reports",
    ]);
  });

  it("keeps Finance and Approvals as direct destinations, not disclosures", () => {
    const finance = NAV_DOMAINS.find((domain) => domain.id === "finance");
    const approvals = NAV_DOMAINS.find((domain) => domain.id === "approvals");
    expect(finance.children).toBeUndefined();
    expect(finance.to).toBe("/admin/finance");
    expect(approvals.children).toBeUndefined();
    expect(approvals.to).toBe("/admin/approvals");
  });
});

describe("visibleDomains", () => {
  it("shows the Principal every domain", () => {
    const ids = visibleDomains(ROLES.OWNER).map((domain) => domain.id);
    expect(ids).toEqual(["dashboard", "projects", "operations", "finance", "approvals", "reports"]);
  });

  it("hides Finance, Approvals and Operations from staff and viewer", () => {
    for (const role of [ROLES.STAFF, ROLES.VIEWER]) {
      const ids = visibleDomains(role).map((domain) => domain.id);
      expect(ids).not.toContain("finance");
      expect(ids).not.toContain("approvals");
      expect(ids).not.toContain("operations");
    }
  });

  it("never renders a group whose every child is unauthorised", () => {
    const staffOperations = visibleDomains(ROLES.STAFF).find((domain) => domain.id === "operations");
    expect(staffOperations).toBeUndefined();
  });
});

describe("resolveActive", () => {
  it("resolves Finance for its own route and for its Site Costs / Fund Requests drill-through", () => {
    expect(resolveActive("/admin/finance")).toEqual({ domainId: "finance", to: "/admin/finance" });
    expect(resolveActive("/admin/site-costs/c1")).toEqual({ domainId: "finance", to: "/admin/finance" });
    expect(resolveActive("/admin/site-costs/c1/edit")).toEqual({
      domainId: "finance",
      to: "/admin/finance",
    });
    expect(resolveActive("/admin/fund-requests/r1/edit")).toEqual({
      domainId: "finance",
      to: "/admin/finance",
    });
  });

  it("resolves Approvals for its own route and nested detail routes", () => {
    expect(resolveActive("/admin/approvals")).toEqual({ domainId: "approvals", to: "/admin/approvals" });
    expect(resolveActive("/admin/approvals/a1")).toEqual({
      domainId: "approvals",
      to: "/admin/approvals",
    });
  });

  it("resolves grouped children to their owning domain", () => {
    expect(resolveActive("/admin/project-intakes/xyz")).toEqual({
      domainId: "projects",
      to: "/admin/project-intakes",
    });
    expect(resolveActive("/admin/people/p1")).toEqual({ domainId: "operations", to: "/admin/people" });
  });

  it("resolves the Dashboard only on an exact match", () => {
    expect(resolveActive("/admin")).toEqual({ domainId: "dashboard", to: "/admin" });
    expect(resolveActive("/admin/projects")).not.toEqual({ domainId: "dashboard", to: "/admin" });
  });

  it("returns null for an unrecognised path", () => {
    expect(resolveActive("/admin/nowhere")).toBeNull();
  });
});
