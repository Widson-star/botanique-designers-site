// Operating-model authority — the corrected navigation model that supersedes
// Stage 6's six-domain grouping.
//
// Authority: docs/ui-authority/operations-hub/operating-model-authority/
// (Founder-approved, merged PR #93), which supersedes parts of Stage 6
// (docs/ui-authority/operations-hub/stage-6-navigation-authority/, PR #92):
// Finance, Approvals, People and the collapsed rail.
//
// This module is PRESENTATION ONLY. Every `capability` below is the same
// function the flat sidebar and Stage 6 already used, so regrouping widens
// nothing and narrows nothing: a destination appears exactly when it appeared
// before. Row level security remains the real boundary; nothing here can
// grant access.
import { canSeeApprovals } from "./utils/approvalCapabilities";
import { canManageStaff } from "./utils/permissions";
import { canSeeDailySiteOperations } from "./utils/dailySiteCapabilities";
import { canSeeFinance } from "./utils/financeCapabilities";
import { canSeeReports } from "./utils/reportCapabilities";
import { canSeePeople } from "./utils/peopleCapabilities";

// Paths are unchanged from Stage 6 except Finance, which is a new single shell
// destination (/admin/finance) replacing the old Fund-Requests-only child.
// Site Costs and Fund Requests keep their own existing routes — Finance
// drills through to them rather than moving or duplicating them.
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
      { to: "/admin/projects", label: "Project Register" },
      { to: "/admin/project-intakes", label: "Project Proposals", capability: canManageStaff },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    icon: "M3.3 3.3h5.6v5.6H3.3V3.3Zm7.8 0h5.6v5.6h-5.6V3.3Zm-7.8 7.8h5.6v5.6H3.3v-5.6Zm7.8 0h5.6v5.6h-5.6v-5.6Z",
    // Maintenance and Tools and Equipment are authorised future placements —
    // they are not built yet, so they are not listed here at all.
    children: [
      {
        to: "/admin/daily-site-operations",
        label: "Daily Site Record",
        capability: canSeeDailySiteOperations,
      },
      { to: "/admin/people", label: "People", capability: canSeePeople },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    // One stable shell destination, not a disclosure: the area selector lives
    // inside the Finance page itself (AdminFinance.jsx), not the sidebar.
    // Visiting a Site Costs or Fund Requests URL directly still highlights
    // Finance as the owning domain, because both remain part of the same
    // financial record Finance now fronts.
    to: "/admin/finance",
    matches: ["/admin/finance", "/admin/site-costs", "/admin/fund-requests"],
    icon: "M10 3.1a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Zm0 2.8v8.2m2.2-6.2a2 2 0 0 0-1.9-1.3H9.2a1.7 1.7 0 0 0 0 3.4h1.6a1.7 1.7 0 0 1 0 3.4H9.6a2 2 0 0 1-1.9-1.3",
    capability: canSeeFinance,
  },
  {
    id: "approvals",
    label: "Approvals",
    // Standalone top-level destination — supersedes "Operations → Approvals".
    to: "/admin/approvals",
    icon: "M10 3.1a6.9 6.9 0 1 0 0 13.8 6.9 6.9 0 0 0 0-13.8Zm-3.5 7 2.2 2.2L13.5 8",
    capability: canSeeApprovals,
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
];

// A group renders only when the role can reach at least one of its children.
// A direct (childless) domain renders only when its own capability passes.
// A domain with no authorised destination is omitted entirely — never shown
// empty, never disabled.
export function visibleDomains(role) {
  return NAV_DOMAINS.map((domain) => {
    if (!domain.children) {
      if (domain.capability && !domain.capability(role)) return null;
      return domain;
    }
    const children = domain.children.filter(
      (child) => !child.capability || child.capability(role)
    );
    return children.length ? { ...domain, children } : null;
  }).filter(Boolean);
}

// Which destination the current URL is on, derived from the pathname alone.
//
// Nothing about the open/closed state of a group, or the selected area inside
// Finance, is stored in the URL, so this stays correct for a typed address, a
// refresh, a bookmark and browser back or forward without any extra state to
// keep in sync.
//
// Detail and edit routes resolve to the destination that owns them:
// /admin/site-costs/:claimId/edit is Finance, via `matches`.
export function resolveActive(pathname) {
  for (const domain of NAV_DOMAINS) {
    if (!domain.children) {
      const bases = domain.matches || [domain.to];
      const isMatch = domain.end
        ? pathname === domain.to
        : bases.some((base) => isUnder(pathname, base));
      if (isMatch) return { domainId: domain.id, to: domain.to };
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
