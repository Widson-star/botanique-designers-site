// Operating-model authority for the Botanique Designers Operations Hub.
//
// The committed Operations Hub PNGs remain the visual authority. Explicit
// Founder amendments override older implementation decisions where they
// conflict. Navigation is presentation only; RLS remains the real access
// boundary.
import { canSeeApprovals } from "./utils/approvalCapabilities";
import { canManageStaff } from "./utils/permissions";
import { canSeeDailySiteOperations } from "./utils/dailySiteCapabilities";
import { canSeeMaintenance } from "./utils/maintenanceCapabilities";
import { canSeeFinance } from "./utils/financeCapabilities";
import { canSeeSiteCosts } from "./utils/siteCostCapabilities";
import { canSeeFundRequests } from "./utils/fundRequestCapabilities";
import { canSeeReports } from "./utils/reportCapabilities";
import { canSeePeople } from "./utils/peopleCapabilities";
import { canSeeInventory } from "./utils/inventoryCapabilities";

export const NAV_DOMAINS = [
  { id: "dashboard", label: "Dashboard", to: "/admin", end: true, icon: "M3 10.4 10 4.2l7 6.2V16.6a1 1 0 0 1-1 1h-3.7v-4.9H7.7v4.9H4a1 1 0 0 1-1-1V10.4Z" },
  {
    id: "projects", label: "Projects", icon: "M3.2 6h13.6v10.4H3.2V6Zm4.2 0V4.9a1.3 1.3 0 0 1 1.3-1.3h2.6a1.3 1.3 0 0 1 1.3 1.3V6",
    children: [
      { to: "/admin/projects", label: "Project Register" },
      { to: "/admin/project-intakes", label: "Project Proposals", capability: canManageStaff },
    ],
  },
  {
    id: "operations", label: "Operations", icon: "M3.3 3.3h5.6v5.6H3.3V3.3Zm7.8 0h5.6v5.6h-5.6V3.3Zm-7.8 7.8h5.6v5.6H3.3v-5.6Zm7.8 0h5.6v5.6h-5.6v-5.6Z",
    children: [
      { to: "/admin/daily-site-operations", label: "Daily Site Record", capability: canSeeDailySiteOperations },
      { to: "/admin/people", label: "People", capability: canSeePeople },
      { to: "/admin/maintenance", label: "Maintenance", capability: canSeeMaintenance },
      { to: "/admin/tools-equipment", label: "Tools & Equipment", capability: canSeeInventory },
    ],
  },
  {
    id: "finance", label: "Finance",
    icon: "M10 3.1a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Zm0 2.8v8.2m2.2-6.2a2 2 0 0 0-1.9-1.3H9.2a1.7 1.7 0 0 0 0 3.4h1.6a1.7 1.7 0 0 1 0 3.4H9.6a2 2 0 0 1-1.9-1.3",
    matches: ["/admin/finance", "/admin/site-costs", "/admin/fund-requests"],
    children: [
      { to: "/admin/finance/project-financials", label: "Project Financials", capability: canSeeFinance },
      { to: "/admin/site-costs", label: "Project Costs", capability: canSeeSiteCosts },
      { to: "/admin/finance/company-expenses", label: "Company Expenses", capability: canSeeFinance },
      { to: "/admin/finance/staff-compensation", label: "Staff Pay", capability: canSeeFinance },
      { to: "/admin/fund-requests", label: "Advances", capability: canSeeFundRequests },
    ],
  },
  { id: "approvals", label: "Approvals", to: "/admin/approvals", icon: "M10 3.1a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Zm-3.5 7 2.2 2.2L13.5 8", capability: canSeeApprovals },
  { id: "reports", label: "Reports", to: "/admin/reports", icon: "M4 16.5V9.4m4 7.1V4.6m4 11.9v-5.2m4 5.2V7.9", capability: canSeeReports },
];

export function visibleDomains(role) {
  return NAV_DOMAINS.map((domain) => {
    if (!domain.children) {
      if (domain.capability && !domain.capability(role)) return null;
      return domain;
    }
    const children = domain.children.filter((child) => !child.capability || child.capability(role));
    return children.length ? { ...domain, children } : null;
  }).filter(Boolean);
}

export function resolveActive(pathname) {
  for (const domain of NAV_DOMAINS) {
    if (!domain.children) {
      const bases = domain.matches || [domain.to];
      const isMatch = domain.end ? pathname === domain.to : bases.some((base) => isUnder(pathname, base));
      if (isMatch) return { domainId: domain.id, to: domain.to };
      continue;
    }
    for (const child of domain.children) if (isUnder(pathname, child.to)) return { domainId: domain.id, to: child.to };
    if ((domain.matches || []).some((base) => isUnder(pathname, base))) return { domainId: domain.id, to: null };
  }
  return null;
}

function isUnder(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}
