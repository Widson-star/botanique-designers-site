import { describe, expect, it } from "vitest";
import { NAV_DOMAINS, resolveActive, visibleDomains } from "./navigation";
import { ROLES } from "./constants/roles";

describe("NAV_DOMAINS shape", () => {
  it("has exactly the six operating-model domains, in order, with no More", () => {
    expect(NAV_DOMAINS.map((domain) => domain.id)).toEqual(["dashboard", "projects", "operations", "finance", "approvals", "reports"]);
  });

  it("expands Finance into the five settled business areas", () => {
    const finance = NAV_DOMAINS.find((domain) => domain.id === "finance");
    expect(finance.children.map((child) => child.label)).toEqual(["Project Financials", "Project Costs", "Company Expenses", "Staff Pay", "Advances"]);
    expect(finance.children.map((child) => child.to)).toEqual([
      "/admin/finance/project-financials",
      "/admin/site-costs",
      "/admin/finance/company-expenses",
      "/admin/finance/staff-compensation",
      "/admin/fund-requests",
    ]);
  });

  it("keeps Approvals and Reports as direct destinations with one visible name each", () => {
    const approvals = NAV_DOMAINS.find((domain) => domain.id === "approvals");
    const reports = NAV_DOMAINS.find((domain) => domain.id === "reports");
    expect(approvals.children).toBeUndefined();
    expect(approvals.to).toBe("/admin/approvals");
    expect(reports.children).toBeUndefined();
    expect(reports.to).toBe("/admin/reports");
    expect(reports.label).toBe("Reports");
  });
});

describe("Operations children", () => {
  it("lists the four settled Operations destinations in order", () => {
    const operations = NAV_DOMAINS.find((domain) => domain.id === "operations");
    expect(operations.children.map((child) => child.label)).toEqual([
      "Daily Site Record", "People", "Maintenance", "Tools & Equipment",
    ]);
    expect(operations.children.map((child) => child.to)).toEqual([
      "/admin/daily-site-operations", "/admin/people", "/admin/maintenance", "/admin/tools-equipment",
    ]);
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
  it("resolves Operations for Tools & Equipment", () => {
    expect(resolveActive("/admin/tools-equipment")).toEqual({
      domainId: "operations",
      to: "/admin/tools-equipment",
    });
  });


  it("resolves Finance for its landing and each Finance area", () => {
    expect(resolveActive("/admin/finance")).toEqual({ domainId: "finance", to: null });
    expect(resolveActive("/admin/finance/project-financials")).toEqual({ domainId: "finance", to: "/admin/finance/project-financials" });
    expect(resolveActive("/admin/site-costs/c1")).toEqual({ domainId: "finance", to: "/admin/site-costs" });
    expect(resolveActive("/admin/finance/company-expenses")).toEqual({ domainId: "finance", to: "/admin/finance/company-expenses" });
    expect(resolveActive("/admin/finance/staff-compensation/c1")).toEqual({ domainId: "finance", to: "/admin/finance/staff-compensation" });
    expect(resolveActive("/admin/fund-requests/r1/edit")).toEqual({ domainId: "finance", to: "/admin/fund-requests" });
  });

  it("resolves Approvals for its own route and nested detail routes", () => {
    expect(resolveActive("/admin/approvals")).toEqual({ domainId: "approvals", to: "/admin/approvals" });
    expect(resolveActive("/admin/approvals/a1")).toEqual({ domainId: "approvals", to: "/admin/approvals" });
  });

  it("resolves grouped children to their owning domain", () => {
    expect(resolveActive("/admin/project-intakes/xyz")).toEqual({ domainId: "projects", to: "/admin/project-intakes" });
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
