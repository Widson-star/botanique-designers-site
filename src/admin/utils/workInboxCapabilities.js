// BD-INBOX-01 (Stage 3) — which sources the Work Inbox may read for a role.
//
// Exactly like reportCapabilities, these are a PRESENTATION boundary, never a
// security boundary. Every inbox read still executes under the caller's own row
// level security; nothing here can widen what the database returns. Their only
// job is to avoid issuing a read that a role provably has no SELECT policy for,
// so an inaccessible source is never mistaken for an empty one.
//
// Stage 3 recipients are Principal and Operations Manager only. Staff, viewer
// and future People-domain identities — team members, assignees, external
// workers — are deliberately NOT recipients: Stage 5 People and its
// external-worker identity model are not built, so routing items to them could
// not be honestly verified.
//
// The model is written so a later authorised role is added by extending these
// predicates and the recipient rules in workInboxItems, WITHOUT changing the
// source-of-truth principle: items stay derived from authoritative records, and
// access stays whatever the source domains' RLS already grants.
import { ROLES } from "../constants/roles";

// Decision items — approvals, cost claims and fund requests awaiting authority.
// The database restricts these reads to owner and manager already.
export function canSeeDecisionItems(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Daily Site obligation items. can_manage_daily_site_project() gives the owner
// company-wide scope and a manager only their project-authority set.
export function canSeeSiteEntryItems(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Project-state items — blockers and overdue next actions — read the ordinary
// projects endpoint, which an owner or manager can reach.
export function canSeeProjectStateItems(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// Project activation is a Principal authority. The existing owner-only pending
// activation surface is not widened by Stage 3.
export function canSeeActivationItems(role) {
  return role === ROLES.OWNER;
}

// The shell capability. BD-ALERTS-01: this now gates the header ALERTS BELL,
// not a navigation destination — the Work Inbox sidebar item was removed on
// 3 August 2026. The bell appears only for a role that can receive at least one
// item category, never as an empty decorative control.
export function canSeeAlerts(role) {
  return (
    canSeeDecisionItems(role) ||
    canSeeSiteEntryItems(role) ||
    canSeeProjectStateItems(role) ||
    canSeeActivationItems(role)
  );
}
