// BD-REPORTS-01A — which Reports sections a reader may see.
//
// These functions are a PRESENTATION boundary, not a security boundary. Every
// report read still executes under the caller's own row level security; nothing
// here can widen what the database returns, and no application-side role check
// replaces or overrides RLS. Their only job is to decide, before a read is
// issued, whether a section should render "You do not have access to this
// section" instead of an ordinary empty state — because an empty array from a
// table the reader has no SELECT policy on is indistinguishable from a table
// that simply holds no rows.
//
// Each function mirrors the delivered database policy exactly:
//
//   * projects                  — owner, anyone actively assigned to the
//                                 project, or a manager who leads it. This is
//                                 what makes a project appear in the selector
//                                 at all; an unassigned, non-lead manager never
//                                 receives the project row, so Reports cannot
//                                 offer it.
//   * daily_site_entries        — can_manage_daily_site_project(): owner
//                                 company-wide; manager only where lead or
//                                 actively assigned. Staff and viewer have no
//                                 SELECT policy.
//   * internal_cost_claims,     — can_access_internal_cost_claim_project():
//     fund_requests               the same owner/lead-or-assigned-manager rule.
//                                 Staff and viewer have no SELECT policy.
//   * approval_requests         — owner or manager.
//   * project_activities        — owner, manager, or assigned staff.
//
// Consequence, and the reason section access is evaluated per domain: a manager
// who can see a project through projects RLS is by definition its lead or
// actively assigned, and therefore also satisfies the Daily Site and finance
// predicates. Staff, however, may hold an assigned project row while having no
// access to Daily Site, internal costs, fund requests or approvals at all —
// which is exactly the asymmetry these gates express.
import { ROLES } from "../constants/roles";

export function canSeeDailySiteReport(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canSeeInternalCostReport(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canSeeFundRequestReport(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

export function canSeeApprovalsReport(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Project history backs Recent Activity for the project domain.
export function canSeeProjectHistoryReport(role) {
  return [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF].includes(role);
}

// Project Overview needs nothing beyond the project row itself, which the
// selector already proved the reader can read.
export function canSeeProjectOverviewReport(role) {
  return [ROLES.OWNER, ROLES.MANAGER, ROLES.STAFF, ROLES.VIEWER].includes(role);
}

// The navigation capability. Reports appears only when the role can reach at
// least one meaningful section — never as an empty decorative destination.
// A viewer has no project-history access and no source-domain access, so the
// destination would carry nothing beyond a project's own header; it is
// therefore not offered.
export function canSeeReports(role) {
  return (
    canSeeDailySiteReport(role) ||
    canSeeInternalCostReport(role) ||
    canSeeFundRequestReport(role) ||
    canSeeApprovalsReport(role) ||
    canSeeProjectHistoryReport(role)
  );
}
