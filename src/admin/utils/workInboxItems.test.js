// BD-INBOX-01 (Stage 3) — the derived item model.
//
// These tests prove the properties the Work Inbox rests on: only authorised
// recipients receive an item, reading never resolves, resolution follows the
// source, and no duplicate item can be produced.
import { describe, expect, it } from "vitest";
import { ROLES } from "../constants/roles";
import {
  applyReadState,
  dedupeInboxItems,
  deriveComplianceItems,
  deriveDailySiteItems,
  deriveWorkInboxItems,
  INBOX_CATEGORY,
  INBOX_TAB,
  inboxItemKey,
  itemsForTab,
  unreadActionCount,
} from "./workInboxItems";

const OWNER_ID = "owner-1";
const MANAGER_ID = "manager-1";
const TODAY = "2026-08-02";

const PROJECTS = [
  {
    id: "p1",
    projectName: "Alego Usonga",
    status: "Ongoing",
    archived: false,
    nextAction: "Confirm nursery delivery",
    nextActionDate: "2026-07-20",
    blocker: "",
  },
  {
    id: "p2",
    projectName: "Karen Retreat",
    status: "Pending",
    archived: false,
    nextAction: "",
    nextActionDate: "",
    blocker: "Access road impassable",
  },
];
const PROJECTS_BY_ID = Object.fromEntries(PROJECTS.map((p) => [p.id, p]));

function base(overrides = {}) {
  return {
    role: ROLES.OWNER,
    currentUserId: OWNER_ID,
    projects: PROJECTS,
    projectsById: PROJECTS_BY_ID,
    approvals: [],
    claims: [],
    fundRequests: [],
    dailySiteEntries: [],
    compliance: [],
    today: TODAY,
    ...overrides,
  };
}

const SUBMITTED_CLAIM = {
  id: "c1",
  project_id: "p1",
  lifecycle: "awaiting_review",
  requester_id: MANAGER_ID,
  purpose: "Casual labour for terracing",
};

describe("recipients", () => {
  it("gives a submitted cost claim to the Principal as work to do", () => {
    const items = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM] }));
    const claim = items.find((item) => item.key.startsWith("claim:c1"));
    expect(claim.category).toBe(INBOX_CATEGORY.DECISION);
    expect(claim.tab).toBe(INBOX_TAB.ACTION);
  });

  it("gives the same claim to its Operations Manager requester as work to wait for", () => {
    const items = deriveWorkInboxItems(
      base({ role: ROLES.MANAGER, currentUserId: MANAGER_ID, claims: [SUBMITTED_CLAIM] })
    );
    const claim = items.find((item) => item.key.startsWith("claim:c1"));
    expect(claim.tab).toBe(INBOX_TAB.AWAITING);
  });

  it("gives a manager who did not raise the claim no item at all", () => {
    const items = deriveWorkInboxItems(
      base({ role: ROLES.MANAGER, currentUserId: "someone-else", claims: [SUBMITTED_CLAIM] })
    );
    expect(items.find((item) => item.key.startsWith("claim:c1"))).toBeUndefined();
  });

  it("routes a returned record to its requester and to nobody else", () => {
    const returned = { ...SUBMITTED_CLAIM, lifecycle: "amendment_requested" };
    const toRequester = deriveWorkInboxItems(
      base({ role: ROLES.MANAGER, currentUserId: MANAGER_ID, claims: [returned] })
    );
    expect(toRequester.find((i) => i.category === INBOX_CATEGORY.CORRECTION)).toBeDefined();

    // The Principal does not inherit someone else's correction work.
    const toOwner = deriveWorkInboxItems(base({ claims: [returned] }));
    expect(toOwner.find((i) => i.category === INBOX_CATEGORY.CORRECTION)).toBeUndefined();
  });

  it("offers project activation to the Principal only", () => {
    const owner = deriveWorkInboxItems(base());
    expect(owner.find((i) => i.category === INBOX_CATEGORY.ACTIVATION)).toBeDefined();

    const manager = deriveWorkInboxItems(base({ role: ROLES.MANAGER, currentUserId: MANAGER_ID }));
    expect(manager.find((i) => i.category === INBOX_CATEGORY.ACTIVATION)).toBeUndefined();
  });

  it("routes a returned site entry only to the person who raised it", () => {
    const entry = {
      id: "d1",
      project_id: "p1",
      state: "returned_for_correction",
      created_by: MANAGER_ID,
      returned_reason: "Worker count missing",
    };
    expect(
      deriveDailySiteItems({
        dailySiteEntries: [entry],
        currentUserId: MANAGER_ID,
        projectsById: PROJECTS_BY_ID,
      })
    ).toHaveLength(1);
    expect(
      deriveDailySiteItems({
        dailySiteEntries: [entry],
        currentUserId: OWNER_ID,
        projectsById: PROJECTS_BY_ID,
      })
    ).toHaveLength(0);
  });
});

describe("links", () => {
  it("points every item at an exact record or a correctly filtered source list", () => {
    const items = deriveWorkInboxItems(
      base({
        claims: [SUBMITTED_CLAIM],
        approvals: [
          { id: "a1", project_id: "p1", state: "submitted", requester_id: MANAGER_ID, reason: "Scope change" },
        ],
        fundRequests: [
          { id: "f1", project_id: "p1", status: "submitted", requester_id: MANAGER_ID, purpose: "Advance" },
        ],
      })
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.route).toMatch(/^\/admin\//);
      // No dead or approximate link: never a bare module index.
      expect(["/admin/approvals", "/admin/site-costs", "/admin/fund-requests"]).not.toContain(
        item.route
      );
    }
    expect(items.find((i) => i.key.startsWith("claim:c1")).route).toBe("/admin/site-costs/c1");
    expect(items.find((i) => i.key.startsWith("approval:a1")).route).toBe("/admin/approvals/a1");
    expect(items.find((i) => i.key.startsWith("fund:f1")).route).toBe("/admin/fund-requests/f1");
  });

  it("never puts an access token in a route", () => {
    const items = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM] }));
    for (const item of items) {
      expect(item.route).not.toMatch(/token|apikey|Bearer|access_token/i);
    }
  });
});

describe("resolution follows the source, not the reader", () => {
  it("stops producing an item once the source no longer needs attention", () => {
    const withWork = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM] }));
    expect(withWork.find((i) => i.key.startsWith("claim:c1"))).toBeDefined();

    const approved = deriveWorkInboxItems(
      base({ claims: [{ ...SUBMITTED_CLAIM, lifecycle: "approved" }] })
    );
    expect(approved.find((i) => i.key.startsWith("claim:c1"))).toBeUndefined();
  });

  it("keeps a read item in the inbox — reading resolves nothing", () => {
    const items = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM] }));
    const key = items.find((i) => i.key.startsWith("claim:c1")).key;
    const afterReading = applyReadState(items, [key]);
    const claim = afterReading.find((i) => i.key === key);
    expect(claim).toBeDefined();
    expect(claim.isNew).toBe(false);
    expect(claim.tab).toBe(INBOX_TAB.ACTION);
    expect(afterReading).toHaveLength(items.length);
  });

  it("returns an item to New when its source moves to a state needing fresh attention", () => {
    const awaiting = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM] }));
    const seenKey = awaiting.find((i) => i.key.startsWith("claim:c1")).key;

    const returned = deriveWorkInboxItems(
      base({
        role: ROLES.MANAGER,
        currentUserId: MANAGER_ID,
        claims: [{ ...SUBMITTED_CLAIM, lifecycle: "amendment_requested" }],
      })
    );
    const withRead = applyReadState(returned, [seenKey]);
    expect(withRead.find((i) => i.category === INBOX_CATEGORY.CORRECTION).isNew).toBe(true);
  });

  it("clears a project item once the blocker is cleared", () => {
    const blocked = deriveWorkInboxItems(base());
    expect(blocked.find((i) => i.category === INBOX_CATEGORY.PROJECT_BLOCKER)).toBeDefined();

    const cleared = deriveWorkInboxItems(
      base({ projects: PROJECTS.map((p) => ({ ...p, blocker: "" })) })
    );
    expect(cleared.find((i) => i.category === INBOX_CATEGORY.PROJECT_BLOCKER)).toBeUndefined();
  });

  it("ignores archived and closed projects", () => {
    const items = deriveWorkInboxItems(
      base({ projects: PROJECTS.map((p) => ({ ...p, archived: true })) })
    );
    expect(items.filter((i) => i.key.startsWith("project-"))).toHaveLength(0);
  });
});

describe("no duplicates", () => {
  it("produces one item per source record and state", () => {
    const items = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM, SUBMITTED_CLAIM] }));
    expect(items.filter((i) => i.key.startsWith("claim:c1"))).toHaveLength(1);
  });

  it("keeps every key unique across all sources", () => {
    const items = deriveWorkInboxItems(
      base({
        claims: [SUBMITTED_CLAIM],
        approvals: [{ id: "a1", project_id: "p1", state: "submitted", requester_id: MANAGER_ID, reason: "x" }],
        fundRequests: [{ id: "f1", project_id: "p1", status: "submitted", requester_id: MANAGER_ID, purpose: "y" }],
        compliance: [{ project_id: "p1", project_name: "Alego Usonga", work_date: TODAY, compliance_status: "missing" }],
      })
    );
    const keys = items.map((i) => i.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("dedupes by key", () => {
    const item = { key: inboxItemKey("claim", "c1", "awaiting_review") };
    expect(dedupeInboxItems([item, { ...item }])).toHaveLength(1);
  });
});

describe("compliance items", () => {
  it("raises an item only for a genuinely missing obligation", () => {
    const rows = [
      { project_id: "p1", project_name: "A", work_date: TODAY, compliance_status: "missing" },
      { project_id: "p2", project_name: "B", work_date: TODAY, compliance_status: "waived" },
      { project_id: "p3", project_name: "C", work_date: TODAY, compliance_status: "entry_present" },
      { project_id: "p4", project_name: "D", work_date: TODAY, compliance_status: "entry_late" },
      { project_id: "p5", project_name: "E", work_date: TODAY, compliance_status: "not_due" },
    ];
    const items = deriveComplianceItems({ compliance: rows });
    expect(items).toHaveLength(1);
    expect(items[0].projectName).toBe("A");
  });
});

describe("unread badge", () => {
  it("counts only unread items needing action, so it reconciles with the action tab", () => {
    const items = applyReadState(
      deriveWorkInboxItems(
        base({ role: ROLES.MANAGER, currentUserId: MANAGER_ID, claims: [SUBMITTED_CLAIM] })
      ),
      []
    );
    const awaiting = itemsForTab(items, INBOX_TAB.AWAITING);
    expect(awaiting.length).toBeGreaterThan(0);
    // An item merely awaiting someone else never inflates the badge.
    expect(unreadActionCount(items)).toBe(itemsForTab(items, INBOX_TAB.ACTION).length);
  });

  it("drops to zero once everything actionable is seen, without removing the items", () => {
    const items = deriveWorkInboxItems(base({ claims: [SUBMITTED_CLAIM] }));
    const seen = applyReadState(items, items.map((i) => i.key));
    expect(unreadActionCount(seen)).toBe(0);
    expect(itemsForTab(seen, INBOX_TAB.ACTION).length).toBeGreaterThan(0);
  });
});

describe("plain language", () => {
  it("uses no database or workflow terminology in any user-facing string", () => {
    const items = deriveWorkInboxItems(
      base({
        claims: [SUBMITTED_CLAIM, { ...SUBMITTED_CLAIM, id: "c2", lifecycle: "amendment_requested", requester_id: OWNER_ID }],
        approvals: [{ id: "a1", project_id: "p1", state: "submitted", requester_id: MANAGER_ID, reason: "Scope change" }],
        fundRequests: [{ id: "f1", project_id: "p1", status: "submitted", requester_id: MANAGER_ID, purpose: "Advance" }],
        compliance: [{ project_id: "p1", project_name: "Alego Usonga", work_date: TODAY, compliance_status: "missing" }],
      })
    );
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      const text = `${item.category} ${item.title}`;
      expect(text).not.toMatch(/lifecycle|amendment_requested|awaiting_review|returned_for_correction|_id\b/);
    }
  });
});
