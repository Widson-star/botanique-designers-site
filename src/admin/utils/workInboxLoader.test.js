// BD-INBOX-01 (Stage 3) — inbox assembly: access, failure and leakage rules.
import { describe, expect, it, vi } from "vitest";
import { ROLES } from "../constants/roles";
import { loadWorkInbox } from "./workInboxLoader";

const TODAY = "2026-08-02";

function readers(overrides = {}) {
  return {
    fetchInboxApprovals: vi.fn(async () => []),
    fetchInboxClaims: vi.fn(async () => []),
    fetchInboxFundRequests: vi.fn(async () => []),
    fetchInboxDailySiteEntries: vi.fn(async () => []),
    fetchInboxCompliance: vi.fn(async () => []),
    fetchInboxProjects: vi.fn(async () => []),
    fetchInboxReadState: vi.fn(async () => []),
    ...overrides,
  };
}

describe("access", () => {
  it("issues no source read at all for a role that receives nothing", async () => {
    const r = readers();
    const result = await loadWorkInbox({
      accessToken: "t",
      role: ROLES.STAFF,
      currentUserId: "u",
      today: TODAY,
      readers: r,
    });
    expect(r.fetchInboxApprovals).not.toHaveBeenCalled();
    expect(r.fetchInboxClaims).not.toHaveBeenCalled();
    expect(r.fetchInboxFundRequests).not.toHaveBeenCalled();
    expect(r.fetchInboxCompliance).not.toHaveBeenCalled();
    expect(r.fetchInboxProjects).not.toHaveBeenCalled();
    expect(result.items).toEqual([]);
  });

  it("reads every permitted source for the Principal and the Operations Manager", async () => {
    for (const role of [ROLES.OWNER, ROLES.MANAGER]) {
      const r = readers();
      await loadWorkInbox({ accessToken: "t", role, currentUserId: "u", today: TODAY, readers: r });
      expect(r.fetchInboxApprovals).toHaveBeenCalled();
      expect(r.fetchInboxClaims).toHaveBeenCalled();
      expect(r.fetchInboxProjects).toHaveBeenCalled();
    }
  });
});

describe("no inaccessible-project leakage", () => {
  it("never sources a project name from another domain's row", async () => {
    // A claim references a project the caller's own projects read did NOT
    // return — the classic leak. The inbox must not invent or surface its name.
    const r = readers({
      fetchInboxClaims: vi.fn(async () => [
        {
          id: "c1",
          project_id: "hidden-project",
          lifecycle: "awaiting_review",
          requester_id: "someone",
          purpose: "Casual labour",
        },
      ]),
      fetchInboxProjects: vi.fn(async () => [
        { id: "visible", project_name: "Alego Usonga", status: "Ongoing", archived: false },
      ]),
    });
    const result = await loadWorkInbox({
      accessToken: "t",
      role: ROLES.OWNER,
      currentUserId: "owner",
      today: TODAY,
      readers: r,
    });
    const claim = result.items.find((i) => i.key.startsWith("claim:c1"));
    expect(claim.projectName).toBe("Unknown project");
    const names = result.items.map((i) => i.projectName);
    expect(names).not.toContain("hidden-project");
  });
});

describe("failures stay failures", () => {
  it("names a failed source instead of reporting an empty inbox", async () => {
    const r = readers({
      fetchInboxClaims: vi.fn(async () => {
        throw new Error("Unable to load cost claims.");
      }),
    });
    const result = await loadWorkInbox({
      accessToken: "t",
      role: ROLES.OWNER,
      currentUserId: "owner",
      today: TODAY,
      readers: r,
    });
    expect(result.failedSources).toContain("cost claims");
  });

  it("does not let one failed source suppress the others", async () => {
    const r = readers({
      fetchInboxCompliance: vi.fn(async () => {
        throw new Error("nope");
      }),
      fetchInboxProjects: vi.fn(async () => [
        {
          id: "p1",
          project_name: "Alego Usonga",
          status: "Ongoing",
          archived: false,
          blocker: "Access road impassable",
        },
      ]),
    });
    const result = await loadWorkInbox({
      accessToken: "t",
      role: ROLES.OWNER,
      currentUserId: "owner",
      today: TODAY,
      readers: r,
    });
    expect(result.failedSources).toEqual(["site obligations"]);
    expect(result.items.find((i) => i.key.startsWith("project-blocker"))).toBeDefined();
  });

  it("reports a clean read as genuinely empty", async () => {
    const result = await loadWorkInbox({
      accessToken: "t",
      role: ROLES.OWNER,
      currentUserId: "owner",
      today: TODAY,
      readers: readers(),
    });
    expect(result.failedSources).toEqual([]);
    expect(result.items).toEqual([]);
  });
});

describe("read state", () => {
  it("marks an item already seen as not new, without dropping it", async () => {
    const r = readers({
      fetchInboxProjects: vi.fn(async () => [
        {
          id: "p1",
          project_name: "Alego Usonga",
          status: "Ongoing",
          archived: false,
          blocker: "Access road impassable",
        },
      ]),
      fetchInboxReadState: vi.fn(async () => ["project-blocker:p1:Access road impassable"]),
    });
    const result = await loadWorkInbox({
      accessToken: "t",
      role: ROLES.OWNER,
      currentUserId: "owner",
      today: TODAY,
      readers: r,
    });
    const item = result.items.find((i) => i.key.startsWith("project-blocker"));
    expect(item).toBeDefined();
    expect(item.isNew).toBe(false);
  });
});
