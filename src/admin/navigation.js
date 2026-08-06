// Stage 6 — the six-domain navigation model.
//
// Authority: docs/ui-authority/operations-hub/stage-6-navigation-authority/
// (Founder-approved Revision 2, 6 August 2026), which supplements the four
// original screens one directory up.
//
// This module is PRESENTATION ONLY. Every `capability` below is the same
// function the flat sidebar already used, so grouping widens nothing and
// narrows nothing: a destination appears exactly when it appeared before.
// Row level security remains the real boundary; nothing here can grant access.
import { canSeeApprovals } from "./utils/approvalCapabilities";
import { canManageStaff } from "./utils/permissions";
import { canSeeDailySiteOperations } from "./utils/dailySiteCapabilities";
import { canSeeSiteCosts } from "./utils/siteCostCapabilities";
import { canSeeFundRequests } from "./utils/fundRequestCapabilities";
import { canSeeReports } from "./utils/reportCapabilities";
import { canSeePeople } from "./utils/peopleCapabilities";

// Paths are unchanged from the flat sidebar. Stage 6 moves no route.
export const NAV_DOMAINS = [
  {
    id: "dashboard",
    label: "Dashboard",
    // A direct destination, not a disclosure — it has no children.
    to: "/admin",
    end: true,
    icon: "M3 10.4 10 4.2l7 6.2V16.6a1 1 0 0 1-1 1h-3.7v-4.9H7.7v4.9H4a1 1 0 0 1-1-1V10.4Z",
  },
  {
    id: "projects",
    label: "Projects",
    icon: "M3.2 6h13.6v10.4H3.2V6Zm4.2 0V4.9a1.3 1.3 0 0 1 1.3-1.3h2.6a1.3 1.3 0 0 1 1.3 1.3V6",
    children: [
      { to: "/admin/projects", label: "Projects" },
      { to: "/admin/project-intakes", label: "Project Intakes", capability: canManageStaff },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "M3.3 3.3h5.6v5.6H3.3V3.3Zm7.8 0h5.6v5.6h-5.6V3.3Zm-7.8 7.8h5.6v5.6H3.3v-5.6Zm7.8 0h5.6v5.6h-5.6v-5.6Z",
    children: [
      {
        to: "/admin/daily-site-operations",
        label: "Daily Site Operations",
        capability: canSeeDailySiteOperations,
      },
      { to: "/admin/site-costs", label: "Site Costs", capability: canSeeSiteCosts },
      { to: "/admin/approvals", label: "Approvals", capability: canSeeApprovals },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    // A grouping label for the delivered finance-adjacent destination only.
    // It authorises no payment, release, reconciliation or expenditure surface.
    icon: "M10 3.1a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Zm0 2.8v8.2m2.2-6.2a2 2 0 0 0-1.9-1.3H9.2a1.7 1.7 0 0 0 0 3.4h1.6a1.7 1.7 0 0 1 0 3.4H9.6a2 2 0 0 1-1.9-1.3",
    children: [
      { to: "/admin/fund-requests", label: "Fund Requests", capability: canSeeFundRequests },
    ],
  },
  {
    id: "reports",
    label: "Reports",
    // A container label only. The route keeps `/admin/reports`, and the
    // destination is still named Project Summary: the category-based Reports
    // Centre does not exist and nothing here may imply it does.
    icon: "M4 16.5V9.4m4 7.1V4.6m4 11.9v-5.2m4 5.2V7.9",
    children: [
      { to: "/admin/reports", label: "Project Summary", capability: canSeeReports },
    ],
  },
  {
    id: "more",
    label: "More",
    icon: "M4.6 8.7a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Zm5.4 0a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Zm5.4 0a1.35 1.35 0 1 0 0 2.7 1.35 1.35 0 0 0 0-2.7Z",
    children: [{ to: "/admin/people", label: "People", capability: canSeePeople }],
  },
];

// A group renders only when the role can reach at least one of its children.
// A domain with no authorised destinations is omitted entirely — never shown
// empty, never disabled.
export function visibleDomains(role) {
  return NAV_DOMAINS.map((domain) => {
    if (!domain.children) return domain;
    const children = domain.children.filter(
      (child) => !child.capability || child.capability(role)
    );
    return children.length ? { ...domain, children } : null;
  }).filter(Boolean);
}

// Which destination the current URL is on, derived from the pathname alone.
//
// Nothing about the open/closed state of a group is stored in the URL, so this
// stays correct for a typed address, a refresh, a bookmark and browser back or
// forward without any extra state to keep in sync.
//
// Detail and edit routes resolve to the destination that owns them:
// /admin/site-costs/:claimId/edit is Site Costs, under Operations.
export function resolveActive(pathname) {
  for (const domain of NAV_DOMAINS) {
    if (!domain.children) {
      if (domain.end ? pathname === domain.to : isUnder(pathname, domain.to)) {
        return { domainId: domain.id, to: domain.to };
      }
      continue;
    }
    for (const child of domain.children) {
      if (isUnder(pathname, child.to)) {
        return { domainId: domain.id, to: child.to };
      }
    }
  }
  return null;
}

function isUnder(pathname, base) {
  return pathname === base || pathname.startsWith(`${base}/`);
}
