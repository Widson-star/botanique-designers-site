// BD-INBOX-01 (Stage 3) — Work Inbox assembly.
//
// Pure orchestration: it takes a set of readers, the caller's role and id, and
// returns one inbox object. It holds no React state, so the access, resolution
// and failure rules are directly testable.
//
// A source the role cannot read is NEVER read, so an inaccessible source can
// never be mistaken for an empty one. A source that FAILS is never silently
// treated as empty either — it is named in `failedSources`, and the interface
// says plainly that part of the inbox could not be loaded. An empty inbox is
// only ever claimed when every permitted source actually returned nothing.
import {
  fetchInboxApprovals,
  fetchInboxClaims,
  fetchInboxCompliance,
  fetchInboxDailySiteEntries,
  fetchInboxFundRequests,
  fetchInboxProjects,
  fetchInboxReadState,
} from "../lib/workInbox";
import {
  canSeeDecisionItems,
  canSeeProjectStateItems,
  canSeeSiteEntryItems,
} from "./workInboxCapabilities";
import { applyReadState, deriveWorkInboxItems } from "./workInboxItems";

export const DEFAULT_INBOX_READERS = {
  fetchInboxApprovals,
  fetchInboxClaims,
  fetchInboxFundRequests,
  fetchInboxDailySiteEntries,
  fetchInboxCompliance,
  fetchInboxProjects,
  fetchInboxReadState,
};

// Run one source read. A failure is recorded against that source and never
// converted into an empty result, because "nothing needs attention" and "we
// could not find out" are different answers and must not look alike.
async function attempt(label, permitted, load, failed) {
  if (!permitted) return [];
  try {
    return (await load()) || [];
  } catch {
    failed.push(label);
    return [];
  }
}

export async function loadWorkInbox({
  accessToken,
  role,
  currentUserId,
  today,
  readers = DEFAULT_INBOX_READERS,
}) {
  const failedSources = [];

  const decisions = canSeeDecisionItems(role);
  const siteEntries = canSeeSiteEntryItems(role);
  const projectState = canSeeProjectStateItems(role);

  const [approvals, claims, fundRequests, dailySiteEntries, compliance, projects, readKeys] =
    await Promise.all([
      attempt("approvals", decisions, () => readers.fetchInboxApprovals(accessToken), failedSources),
      attempt("cost claims", decisions, () => readers.fetchInboxClaims(accessToken), failedSources),
      attempt("fund requests", decisions, () => readers.fetchInboxFundRequests(accessToken), failedSources),
      attempt("site entries", siteEntries, () => readers.fetchInboxDailySiteEntries(accessToken), failedSources),
      attempt("site obligations", siteEntries, () => readers.fetchInboxCompliance(accessToken), failedSources),
      attempt("projects", projectState, () => readers.fetchInboxProjects(accessToken), failedSources),
      attempt("your read state", true, () => readers.fetchInboxReadState(accessToken), failedSources),
    ]);

  // Project names are resolved from the caller's OWN projects read. A project
  // the caller cannot read simply has no name here — its name is never sourced
  // from another domain's row, so no inaccessible project name can leak into
  // the inbox through a claim, fund request or approval.
  const mappedProjects = (projects || []).map((row) => ({
    id: row.id,
    projectName: row.project_name || "",
    status: row.status || "",
    stage: row.stage || "",
    archived: row.archived === true,
    nextAction: row.next_action || "",
    nextActionDate: row.next_action_date || "",
    blocker: row.blocker || "",
    leadPersonId: row.lead_person_id || null,
  }));
  const projectsById = Object.fromEntries(
    mappedProjects.map((project) => [project.id, project])
  );

  const items = deriveWorkInboxItems({
    role,
    currentUserId,
    projects: mappedProjects,
    projectsById,
    approvals,
    claims,
    fundRequests,
    dailySiteEntries,
    compliance,
    today,
  });

  return {
    items: applyReadState(items, readKeys),
    failedSources,
  };
}
