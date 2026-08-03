// BD-INBOX-01 (Stage 3) — the Work Inbox item model. PURE functions.
//
// The Work Inbox is DERIVED. There is no inbox table, no notification table and
// no stored item. Every function here takes authoritative source rows that the
// caller's own row level security already returned, and computes the attention
// items that follow from their CURRENT state. Nothing is written, and no
// business truth is duplicated: the source record remains authoritative for its
// own status, lifecycle and permitted transitions in every case.
//
// Three consequences follow directly from deriving rather than storing, and
// they are the reason the model was chosen:
//
//   1. RESOLUTION IS AUTOMATIC AND HONEST. An item exists exactly while its
//      source still requires attention. When a claim is approved, a fund
//      request decided, an entry accepted or a blocker cleared, the item stops
//      being produced on the next read. It is structurally impossible for the
//      inbox to insist work is outstanding after the domain says otherwise, or
//      to leave a completed item falsely actionable.
//   2. NO DUPLICATE ITEMS. An item's identity is its key, and a key is built
//      from the source record's identity plus its state. One source record in
//      one state yields exactly one item.
//   3. READING NEVER RESOLVES. Read state lives in a separate per-user table
//      keyed by item key and is applied as a presentation flag. Marking an item
//      seen changes no source record, and the item stays in the inbox until the
//      source itself moves on.
//
// Access: items are built only from rows the caller could already read. This
// module never widens access, and it is never the security boundary — the
// source domains' RLS is. Stage 3 recipients are Principal and Operations
// Manager only; recipient rules live in one place below so a later authorised
// role can be added without disturbing the derivation.
import { ROLES } from "../constants/roles";

// Ordinary user-facing categories. No database or workflow terminology reaches
// the reader: no "lifecycle", no "amendment_requested", no "state".
export const INBOX_CATEGORY = {
  DECISION: "Decision required",
  CORRECTION: "Correction required",
  SITE_ENTRY_MISSING: "Site entry missing",
  PROJECT_ACTION_OVERDUE: "Project action overdue",
  PROJECT_BLOCKER: "Project blocker",
  ACTIVATION: "Project activation required",
};

// Two honest tabs.
//
//   ACTION   — this person is expected to act now.
//   AWAITING — this person submitted it and is waiting on someone else. It is
//              status information, deliberately separated from work to do.
//
// The §14 "Approved" and "Completed" tabs are NOT built here. Under a derived
// model an approved or completed record simply stops requiring attention and
// leaves the inbox, and its record is already listed in the module that owns
// it. Presenting resolved work as inbox tabs would rebuild each module inside
// the inbox — exactly the second copy Stage 3 forbids — and event-backed
// history is a later separately authorised capability.
export const INBOX_TAB = {
  ACTION: "action",
  AWAITING: "awaiting",
};

// Matches the char_length check on work_inbox_read_state.item_key. A key that
// overflowed it would be REJECTED on insert, so the seen-marker would never
// persist and the item would read as New for ever.
const MAX_ITEM_KEY_LENGTH = 200;

// A key identifies the item AND the source state that produced it. When a
// record moves to a materially different state needing fresh attention, the key
// changes, so the item correctly returns to New instead of inheriting a stale
// "seen" marker from the state before it.
//
// The state segment can carry free text — a project blocker is allowed 500
// characters — so the key is bounded. Source and record id come first and are
// short, so they always survive intact and two different records can never
// collide; only trailing state text is clipped.
export function inboxItemKey(source, recordId, state) {
  const key = `${source}:${recordId}:${state}`;
  return key.length <= MAX_ITEM_KEY_LENGTH ? key : key.slice(0, MAX_ITEM_KEY_LENGTH);
}

function projectNameOf(projectsById, projectId) {
  return projectsById?.[projectId]?.projectName || "Unknown project";
}

// ---------------------------------------------------------------------------
// Recipient rules — the one place a role becomes a recipient
// ---------------------------------------------------------------------------
// Approvals, cost claims and fund requests are all decided by the Principal:
// approval_requests constrains approver_role to 'owner', and fund and claim
// authority is the Principal's. So a submitted record is the Principal's work
// to do, and its requester's work to wait for.
function decisionRecipient(role) {
  return role === ROLES.OWNER;
}

// A returned record is the REQUESTER's work to correct — never anyone else's,
// whatever their role. This is compared against the caller's own id.
function isRequester(currentUserId, requesterId) {
  return Boolean(currentUserId) && currentUserId === requesterId;
}

// ---------------------------------------------------------------------------
// Derivation
// ---------------------------------------------------------------------------
export function deriveApprovalItems({ approvals = [], role, currentUserId, projectsById }) {
  const items = [];
  for (const request of approvals) {
    const project = projectNameOf(projectsById, request.project_id);
    const route = `/admin/approvals/${request.id}`;

    if (["submitted", "awaiting_review"].includes(request.state)) {
      if (decisionRecipient(role)) {
        items.push({
          key: inboxItemKey("approval", request.id, request.state),
          category: INBOX_CATEGORY.DECISION,
          tab: INBOX_TAB.ACTION,
          title: "Project change awaiting your decision",
          detail: request.reason || "A project change has been submitted for approval.",
          projectId: request.project_id,
          projectName: project,
          route,
        });
      } else if (isRequester(currentUserId, request.requester_id)) {
        items.push({
          key: inboxItemKey("approval", request.id, `${request.state}:mine`),
          category: INBOX_CATEGORY.DECISION,
          tab: INBOX_TAB.AWAITING,
          title: "Your project change is awaiting a decision",
          detail: "Submitted to the Principal. Nothing has been approved yet.",
          projectId: request.project_id,
          projectName: project,
          route,
        });
      }
    }

    if (request.state === "amendment_requested" && isRequester(currentUserId, request.requester_id)) {
      items.push({
        key: inboxItemKey("approval", request.id, request.state),
        category: INBOX_CATEGORY.CORRECTION,
        tab: INBOX_TAB.ACTION,
        title: "Project change returned for correction",
        detail: request.decision_notes || "Returned to you. Amend it and resubmit.",
        projectId: request.project_id,
        projectName: project,
        route,
      });
    }
  }
  return items;
}

export function deriveClaimItems({ claims = [], role, currentUserId, projectsById }) {
  const items = [];
  for (const claim of claims) {
    const project = projectNameOf(projectsById, claim.project_id);
    const route = `/admin/site-costs/${claim.id}`;

    if (claim.lifecycle === "awaiting_review") {
      if (decisionRecipient(role)) {
        items.push({
          key: inboxItemKey("claim", claim.id, claim.lifecycle),
          category: INBOX_CATEGORY.DECISION,
          tab: INBOX_TAB.ACTION,
          title: "Cost claim awaiting your review",
          detail: claim.purpose || "Submitted for a decision. Nothing has been approved or paid.",
          projectId: claim.project_id,
          projectName: project,
          route,
        });
      } else if (isRequester(currentUserId, claim.requester_id)) {
        items.push({
          key: inboxItemKey("claim", claim.id, `${claim.lifecycle}:mine`),
          category: INBOX_CATEGORY.DECISION,
          tab: INBOX_TAB.AWAITING,
          title: "Your cost claim is awaiting review",
          detail: "With the Principal. Nothing has been approved, released or paid.",
          projectId: claim.project_id,
          projectName: project,
          route,
        });
      }
    }

    if (claim.lifecycle === "amendment_requested" && isRequester(currentUserId, claim.requester_id)) {
      items.push({
        key: inboxItemKey("claim", claim.id, claim.lifecycle),
        category: INBOX_CATEGORY.CORRECTION,
        tab: INBOX_TAB.ACTION,
        title: "Cost claim returned for correction",
        detail: "Returned to you. It is excluded from every reported total until resubmitted.",
        projectId: claim.project_id,
        projectName: project,
        route,
      });
    }
  }
  return items;
}

export function deriveFundRequestItems({ fundRequests = [], role, currentUserId, projectsById }) {
  const items = [];
  for (const request of fundRequests) {
    const project = projectNameOf(projectsById, request.project_id);
    const route = `/admin/fund-requests/${request.id}`;

    if (request.status === "submitted") {
      if (decisionRecipient(role)) {
        items.push({
          key: inboxItemKey("fund", request.id, request.status),
          category: INBOX_CATEGORY.DECISION,
          tab: INBOX_TAB.ACTION,
          title: "Fund request awaiting your authority",
          detail: request.purpose || "Submitted for a decision. No funding has been authorised.",
          projectId: request.project_id,
          projectName: project,
          route,
        });
      } else if (isRequester(currentUserId, request.requester_id)) {
        items.push({
          key: inboxItemKey("fund", request.id, `${request.status}:mine`),
          category: INBOX_CATEGORY.DECISION,
          tab: INBOX_TAB.AWAITING,
          title: "Your fund request is awaiting authority",
          detail: "With the Principal. No funding has been authorised or released.",
          projectId: request.project_id,
          projectName: project,
          route,
        });
      }
    }

    if (request.status === "amendment_requested" && isRequester(currentUserId, request.requester_id)) {
      items.push({
        key: inboxItemKey("fund", request.id, request.status),
        category: INBOX_CATEGORY.CORRECTION,
        tab: INBOX_TAB.ACTION,
        title: "Fund request returned for correction",
        detail: "Returned to you. No funding has been authorised or released.",
        projectId: request.project_id,
        projectName: project,
        route,
      });
    }
  }
  return items;
}

// Daily Site entries returned for correction belong to whoever raised them.
export function deriveDailySiteItems({ dailySiteEntries = [], currentUserId, projectsById }) {
  const items = [];
  for (const entry of dailySiteEntries) {
    if (entry.state !== "returned_for_correction") continue;
    if (!isRequester(currentUserId, entry.created_by)) continue;
    items.push({
      key: inboxItemKey("daily", entry.id, entry.state),
      category: INBOX_CATEGORY.CORRECTION,
      tab: INBOX_TAB.ACTION,
      title: "Site entry returned for correction",
      detail:
        entry.returned_reason ||
        "Returned to you. It is excluded from planned figures until resubmitted.",
      projectId: entry.project_id,
      projectName: projectNameOf(projectsById, entry.project_id),
      route: `/admin/daily-site-operations/${entry.id}`,
    });
  }
  return items;
}

// Missing morning obligations come from daily_site_morning_compliance(), which
// is already authority-filtered: owner company-wide, manager only their
// project-authority set. Only a genuinely missing obligation is an item —
// marked not required, present, late and not-due are not attention.
export function deriveComplianceItems({ compliance = [] }) {
  const items = [];
  for (const row of compliance) {
    if (row.compliance_status !== "missing") continue;
    items.push({
      key: inboxItemKey("compliance", row.project_id, row.work_date),
      category: INBOX_CATEGORY.SITE_ENTRY_MISSING,
      tab: INBOX_TAB.ACTION,
      title: "Morning site entry is missing",
      detail: `A morning entry was due for ${row.work_date} and none was submitted or marked not required.`,
      projectId: row.project_id,
      projectName: row.project_name || "Unknown project",
      route: `/admin/daily-site-operations?project=${row.project_id}`,
    });
  }
  return items;
}

// Project-state attention. These read only fields already on the visible
// project row, exactly as the Dashboard and Project Summary derivations do, so
// the three surfaces cannot disagree about what a blocker or an overdue action
// is.
export function deriveProjectItems({ projects = [], role, today }) {
  const items = [];
  const open = projects.filter(
    (project) => !project.archived && ["Pending", "Ongoing", "Paused"].includes(project.status)
  );

  for (const project of open) {
    if (project.blocker && project.blocker.trim().length > 0) {
      items.push({
        key: inboxItemKey("project-blocker", project.id, project.blocker.trim()),
        category: INBOX_CATEGORY.PROJECT_BLOCKER,
        tab: INBOX_TAB.ACTION,
        title: "Project blocker recorded",
        detail: project.blocker.trim(),
        projectId: project.id,
        projectName: project.projectName,
        route: `/admin/projects/${project.id}`,
      });
    }

    if (
      project.nextAction &&
      project.nextAction.trim().length > 0 &&
      project.nextActionDate &&
      project.nextActionDate < today
    ) {
      items.push({
        key: inboxItemKey("project-overdue", project.id, project.nextActionDate),
        category: INBOX_CATEGORY.PROJECT_ACTION_OVERDUE,
        tab: INBOX_TAB.ACTION,
        title: "Next action is overdue",
        detail: `${project.nextAction.trim()} — was due ${project.nextActionDate}.`,
        projectId: project.id,
        projectName: project.projectName,
        route: `/admin/projects/${project.id}`,
      });
    }

    // Activation is a Principal authority; the owner-only pending activation
    // surface is not widened by Stage 3.
    if (role === ROLES.OWNER && project.status === "Pending") {
      items.push({
        key: inboxItemKey("project-activation", project.id, "Pending"),
        category: INBOX_CATEGORY.ACTIVATION,
        tab: INBOX_TAB.ACTION,
        title: "Project is awaiting activation",
        detail: "This project is still pending and has not been activated.",
        projectId: project.id,
        projectName: project.projectName,
        route: `/admin/projects/${project.id}`,
      });
    }
  }
  return items;
}

// Stable presentation order: work to do before work to wait for, then by
// category, then by project name — so the list does not reshuffle between
// reads.
const CATEGORY_ORDER = [
  INBOX_CATEGORY.CORRECTION,
  INBOX_CATEGORY.DECISION,
  INBOX_CATEGORY.SITE_ENTRY_MISSING,
  INBOX_CATEGORY.PROJECT_BLOCKER,
  INBOX_CATEGORY.PROJECT_ACTION_OVERDUE,
  INBOX_CATEGORY.ACTIVATION,
];

export function sortInboxItems(items) {
  return [...items].sort((a, b) => {
    if (a.tab !== b.tab) return a.tab === INBOX_TAB.ACTION ? -1 : 1;
    const byCategory =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    const byProject = (a.projectName || "").localeCompare(b.projectName || "");
    if (byProject !== 0) return byProject;
    return a.key.localeCompare(b.key);
  });
}

// One item per key. Two sources can never produce the same key, but this makes
// the no-duplicates guarantee explicit and testable rather than incidental.
export function dedupeInboxItems(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    if (seen.has(item.key)) continue;
    seen.add(item.key);
    result.push(item);
  }
  return result;
}

export function deriveWorkInboxItems({
  role,
  currentUserId,
  projects = [],
  projectsById = {},
  approvals = [],
  claims = [],
  fundRequests = [],
  dailySiteEntries = [],
  compliance = [],
  today,
}) {
  const items = [
    ...deriveApprovalItems({ approvals, role, currentUserId, projectsById }),
    ...deriveClaimItems({ claims, role, currentUserId, projectsById }),
    ...deriveFundRequestItems({ fundRequests, role, currentUserId, projectsById }),
    ...deriveDailySiteItems({ dailySiteEntries, currentUserId, projectsById }),
    ...deriveComplianceItems({ compliance }),
    ...deriveProjectItems({ projects, role, today }),
  ];
  return sortInboxItems(dedupeInboxItems(items));
}

// ---------------------------------------------------------------------------
// Read state
// ---------------------------------------------------------------------------
// Applied as a presentation flag only. `isNew` says whether this person has
// looked at the item; it says NOTHING about whether the underlying issue is
// resolved, and the item is returned unchanged in every other respect.
export function applyReadState(items, readKeys) {
  const keys = readKeys instanceof Set ? readKeys : new Set(readKeys || []);
  return items.map((item) => ({ ...item, isNew: !keys.has(item.key) }));
}

// The badge counts UNREAD ITEMS THAT NEED ACTION. It deliberately excludes the
// awaiting tab, so the number always means "things newly waiting for you" and
// reconciles with the action list the reader opens.
export function unreadActionCount(items) {
  return items.filter((item) => item.tab === INBOX_TAB.ACTION && item.isNew).length;
}

export function itemsForTab(items, tab) {
  return items.filter((item) => item.tab === tab);
}
