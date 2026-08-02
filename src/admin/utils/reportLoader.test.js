import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_READERS,
  deriveApprovalsProjection,
  deriveNeedsAttention,
  isAuthorisedProject,
  loadProjectReport,
  loadRecentActivity,
  PROJECT_CONTEXT,
  projectActivityItems,
} from "./reportLoader";
import { SECTION_STATE } from "./reportFormat";

const RANGE = { preset: "this_month", startDate: "2026-08-01", endDate: "2026-08-31" };
const TODAY = "2026-08-15";

const PROJECT_ROW = {
  id: "p1",
  project_name: "Alego Usonga",
  client_site_name: "Alego residence",
  location: "Siaya",
  county: "Siaya",
  status: "Ongoing",
  stage: "Implementation",
  lead_person_id: "m1",
  start_date: "2026-06-01",
  target_completion_date: "2026-09-30",
  next_action: "Confirm turf delivery",
  next_action_date: "2026-08-10",
  blocker: "",
  archived: false,
};

// Readers that succeed and return nothing, so a test only has to override the
// one source it cares about.
function emptyReaders(overrides = {}) {
  return {
    fetchReportProject: vi.fn(async () => PROJECT_ROW),
    fetchReportDailySiteEntries: vi.fn(async () => []),
    fetchReportRangeCompliance: vi.fn(async () => []),
    fetchReportClaims: vi.fn(async () => []),
    fetchReportClaimExists: vi.fn(async () => false),
    fetchReportFundRequests: vi.fn(async () => []),
    fetchReportFundRequestExists: vi.fn(async () => false),
    fetchReportApprovals: vi.fn(async () => []),
    fetchOpenReportApprovals: vi.fn(async () => []),
    fetchReportApprovalExists: vi.fn(async () => false),
    fetchProjectHistoryEvents: vi.fn(async () => []),
    fetchDailySiteEvents: vi.fn(async () => []),
    fetchClaimEvents: vi.fn(async () => []),
    fetchFundRequestEvents: vi.fn(async () => []),
    fetchApprovalEvents: vi.fn(async () => []),
    ...overrides,
  };
}

// "p1" is the project the caller's own Projects read returned, so every test
// below runs with an authorised project context unless it says otherwise.
function load(role, readers, authorisedProjectIds = ["p1"]) {
  return loadProjectReport({
    accessToken: "token",
    projectId: "p1",
    range: RANGE,
    role,
    today: TODAY,
    authorisedProjectIds,
    readers,
  });
}

describe("the five report section states stay distinct", () => {
  it("reports no records in the period when the source is readable and holds records elsewhere", async () => {
    const readers = emptyReaders({ fetchReportClaimExists: vi.fn(async () => true) });
    const report = await load("owner", readers);
    expect(report.claims.state).toBe(SECTION_STATE.EMPTY_PERIOD);
  });

  it("reports no records at all when the source is readable and holds none for this project", async () => {
    const report = await load("owner", emptyReaders());
    expect(report.claims.state).toBe(SECTION_STATE.EMPTY_EVER);
    expect(report.fundRequests.state).toBe(SECTION_STATE.EMPTY_EVER);
  });

  it("reports no access — never empty, never zero — where the reader has no source access", async () => {
    const readers = emptyReaders();
    const report = await load("staff", readers);
    expect(report.claims.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.fundRequests.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.dailySite.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.approvals.state).toBe(SECTION_STATE.NO_ACCESS);
    // No inaccessible source is read at all, so an empty array can never be
    // mistaken for one.
    expect(readers.fetchReportClaims).not.toHaveBeenCalled();
    expect(readers.fetchReportFundRequests).not.toHaveBeenCalled();
    expect(readers.fetchReportDailySiteEntries).not.toHaveBeenCalled();
    expect(readers.fetchReportApprovals).not.toHaveBeenCalled();
    // Assigned staff still see the project itself.
    expect(report.overview.state).toBe(SECTION_STATE.READY);
    expect(readers.fetchReportProject).toHaveBeenCalled();
  });

  it("reports a load failure as a failure, never as empty and never as zero", async () => {
    const readers = emptyReaders({
      fetchReportClaims: vi.fn(async () => {
        throw new Error("Unable to load internal cost claims.");
      }),
    });
    const report = await load("owner", readers);
    expect(report.claims.state).toBe(SECTION_STATE.ERROR);
    expect(report.claims.totals).toBeUndefined();
    // One failing section does not take the rest of the report with it.
    expect(report.fundRequests.state).toBe(SECTION_STATE.EMPTY_EVER);
  });

  it("keeps a project readable even where its finance sources are not", async () => {
    const report = await load("staff", emptyReaders());
    expect(report.overview.project.projectName).toBe("Alego Usonga");
    expect(report.claims.state).toBe(SECTION_STATE.NO_ACCESS);
  });
});

describe("role isolation across the manager access asymmetry", () => {
  it("gives an authorised manager every source section", async () => {
    const readers = emptyReaders();
    const report = await load("manager", readers);
    for (const key of ["dailySite", "claims", "fundRequests", "approvals"]) {
      expect(report[key].state).not.toBe(SECTION_STATE.NO_ACCESS);
    }
  });

  it("gives a viewer no source section", async () => {
    const readers = emptyReaders();
    const report = await load("viewer", readers);
    expect(report.dailySite.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.claims.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.approvals.state).toBe(SECTION_STATE.NO_ACCESS);
  });
});

// BD-REPORTS-01B — Reports is a statistical summary, so the merged
// cross-domain activity feed is no longer part of the default report. The
// projection and its readers are retained for the deferred activity-timeline
// report and are proved below; what changed is that an ordinary report does
// not read the five event sources at all.
describe("the default report reads no event source", () => {
  it("carries no activity feed and issues no event read, for any role", async () => {
    for (const role of ["owner", "manager", "staff"]) {
      const readers = emptyReaders();
      const report = await load(role, readers);
      expect(report.recentActivity).toBeUndefined();
      expect(readers.fetchProjectHistoryEvents).not.toHaveBeenCalled();
      expect(readers.fetchDailySiteEvents).not.toHaveBeenCalled();
      expect(readers.fetchClaimEvents).not.toHaveBeenCalled();
      expect(readers.fetchFundRequestEvents).not.toHaveBeenCalled();
      expect(readers.fetchApprovalEvents).not.toHaveBeenCalled();
    }
  });

  it("still reads every source the summary figures are built from", async () => {
    const readers = emptyReaders();
    await load("owner", readers);
    expect(readers.fetchReportRangeCompliance).toHaveBeenCalled();
    expect(readers.fetchReportDailySiteEntries).toHaveBeenCalled();
    expect(readers.fetchReportClaims).toHaveBeenCalled();
    expect(readers.fetchReportFundRequests).toHaveBeenCalled();
    expect(readers.fetchReportApprovals).toHaveBeenCalled();
    expect(readers.fetchOpenReportApprovals).toHaveBeenCalled();
  });

  it("keeps the retained activity reader working and access-gated", async () => {
    const readers = emptyReaders();
    const bounds = { startInstant: "2026-08-01T00:00:00+03:00", endInstant: "2026-09-01T00:00:00+03:00" };
    const denied = await loadRecentActivity(readers, "token", "p1", bounds, "viewer");
    expect(denied.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(readers.fetchProjectHistoryEvents).not.toHaveBeenCalled();

    const allowed = await loadRecentActivity(readers, "token", "p1", bounds, "owner");
    expect(allowed.state).toBe(SECTION_STATE.EMPTY_PERIOD);
    expect(readers.fetchProjectHistoryEvents).toHaveBeenCalled();
  });
});

describe("the project-context gate", () => {
  // Every reader the loader knows about. If the gate holds, not one of them is
  // called for a project outside the caller's authorised Projects result.
  function expectNothingRead(readers) {
    for (const [name, reader] of Object.entries(readers)) {
      expect(reader, `${name} must not be called`).not.toHaveBeenCalled();
    }
  }

  function loadUnauthorised(role, readers, projectId = "p2") {
    return loadProjectReport({
      accessToken: "token",
      projectId,
      range: RANGE,
      role,
      today: TODAY,
      // The caller's Projects read returned p1 only.
      authorisedProjectIds: ["p1"],
      readers,
    });
  }

  it("loads a project the caller's authorised Projects result returned", async () => {
    const readers = emptyReaders();
    const report = await load("owner", readers);
    expect(report.projectContext).toBe(PROJECT_CONTEXT.AUTHORISED);
    expect(report.overview.state).toBe(SECTION_STATE.READY);
    expect(readers.fetchReportProject).toHaveBeenCalled();
  });

  it("reads no source for a manager who supplies a project id they cannot see in Projects", async () => {
    // The exact live asymmetry: approval_requests and project_activities are
    // readable by ANY manager, while projects is not. Without the gate this
    // manager would receive approval and activity rows for a project their own
    // Projects read never returned.
    const readers = emptyReaders();
    const report = await loadUnauthorised("manager", readers);
    expect(report.projectContext).toBe(PROJECT_CONTEXT.UNAVAILABLE);
    expectNothingRead(readers);
    // No Daily Site range call, no approvals, no activity — and no shape.
    expect(readers.fetchReportRangeCompliance).not.toHaveBeenCalled();
    expect(readers.fetchReportApprovals).not.toHaveBeenCalled();
    expect(readers.fetchOpenReportApprovals).not.toHaveBeenCalled();
    expect(readers.fetchProjectHistoryEvents).not.toHaveBeenCalled();
    expect(report.overview.project).toBeUndefined();
    expect(report.approvals.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.approvalsProjection.decisions).toEqual([]);
    expect(report.approvalsProjection.awaiting).toEqual([]);
    expect(report.recentActivity).toBeUndefined();
    expect(report.needsAttention).toEqual([]);
    expect(JSON.stringify(report)).not.toContain("Alego Usonga");
  });

  it("treats an invalid project id exactly as it treats an inaccessible real one", async () => {
    const invalid = await loadUnauthorised("manager", emptyReaders(), "not-a-uuid");
    const inaccessible = await loadUnauthorised("manager", emptyReaders(), "p2");
    expect(invalid.projectContext).toBe(PROJECT_CONTEXT.UNAVAILABLE);
    expect(invalid.overview).toEqual(inaccessible.overview);
    expect(invalid.approvals).toEqual(inaccessible.approvals);
  });

  it("fails closed when no authorised project set is supplied at all", async () => {
    const readers = emptyReaders();
    const report = await loadProjectReport({
      accessToken: "token",
      projectId: "p1",
      range: RANGE,
      role: "owner",
      today: TODAY,
      readers,
    });
    expect(report.projectContext).toBe(PROJECT_CONTEXT.UNAVAILABLE);
    expectNothingRead(readers);
  });

  it("accepts the authorised set as a Set as well as an array", () => {
    expect(isAuthorisedProject("p1", new Set(["p1"]))).toBe(true);
    expect(isAuthorisedProject("p1", ["p2"])).toBe(false);
    expect(isAuthorisedProject("", ["p1"])).toBe(false);
    expect(isAuthorisedProject("p1", [])).toBe(false);
  });

  it("does not replace source RLS: an authorised staff project still yields section-level no access", async () => {
    const readers = emptyReaders();
    const report = await load("staff", readers);
    // The gate passed…
    expect(report.projectContext).toBe(PROJECT_CONTEXT.AUTHORISED);
    expect(report.overview.state).toBe(SECTION_STATE.READY);
    // …and the per-domain rules still decide every section independently.
    expect(report.claims.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.fundRequests.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.dailySite.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.approvals.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(readers.fetchReportClaims).not.toHaveBeenCalled();
    expect(readers.fetchReportRangeCompliance).not.toHaveBeenCalled();
    // The project record itself remains readable for an assigned staff member.
    expect(readers.fetchReportProject).toHaveBeenCalled();
  });

  it("shows an authorised project whose row is no longer returned as no access, never as a load error", async () => {
    const readers = emptyReaders({ fetchReportProject: vi.fn(async () => null) });
    const report = await load("owner", readers);
    expect(report.overview.state).toBe(SECTION_STATE.NO_ACCESS);
    expect(report.overview.state).not.toBe(SECTION_STATE.ERROR);
  });
});

describe("Recent Activity projection safety", () => {
  it("projects only safe fields and never a raw payload or snapshot", () => {
    const items = projectActivityItems({
      projectEvents: [
        {
          id: "pa1",
          project_id: "p1",
          action: "updated",
          actor_id: "m1",
          occurred_at: "2026-08-04T07:00:00Z",
        },
      ],
      dailySiteEvents: [
        {
          id: "ds1",
          daily_site_entry_id: "d1",
          event_type: "submitted",
          actor_id: "m1",
          occurred_at: "2026-08-05T05:30:00Z",
          daily_site_entries: { project_id: "p1" },
        },
      ],
      fundEvents: [
        {
          id: "fr1",
          fund_request_id: "f1",
          event_type: "approved",
          actor_id: "o1",
          created_at: "2026-08-06T09:00:00Z",
          fund_requests: { project_id: "p1" },
        },
      ],
    });
    expect(items.map((item) => item.id)).toEqual(["fund-fr1", "daily-ds1", "project-pa1"]);
    for (const item of items) {
      expect(Object.keys(item).sort()).toEqual([
        "actorId",
        "eventType",
        "id",
        "occurredAt",
        "projectId",
        "recordId",
        "route",
        "sourceDomain",
      ]);
    }
    // The fund-request event time is normalised from created_at.
    expect(items[0].occurredAt).toBe("2026-08-06T09:00:00Z");
    expect(items[0].route).toBe("/admin/fund-requests/f1");
  });
});

describe("Approvals and Decisions projection", () => {
  const approvals = {
    state: SECTION_STATE.READY,
    approvals: [
      {
        id: "a1",
        approvalType: "project_completion",
        state: "approved",
        requestedAt: "2026-08-01T09:00:00Z",
        reviewedAt: "",
        decidedAt: "2026-08-08T09:00:00Z",
      },
    ],
    open: [
      {
        id: "a2",
        approvalType: "project_archive",
        state: "awaiting_review",
        requestedAt: "2026-08-09T09:00:00Z",
      },
    ],
  };
  const claims = {
    state: SECTION_STATE.READY,
    claims: [
      {
        id: "c1",
        recipientLabel: "Alego turf crew",
        lifecycle: "approved",
        submittedAt: "2026-08-02T09:00:00Z",
        decidedAt: "2026-08-07T09:00:00Z",
        deciderId: "o1",
      },
    ],
  };
  const fundRequests = {
    state: SECTION_STATE.READY,
    requests: [
      {
        id: "f1",
        requestNumber: "FR-0001",
        status: "approved",
        submittedAt: "2026-08-03T09:00:00Z",
        decidedAt: "2026-08-09T09:00:00Z",
      },
    ],
  };

  it("projects all three source groups and labels each with its origin", () => {
    const projection = deriveApprovalsProjection({ approvals, claims, fundRequests, range: RANGE });
    expect(projection.state).toBe(SECTION_STATE.READY);
    expect(projection.decisions.map((item) => item.sourceDomain)).toEqual([
      "fund_request",
      "approval",
      "internal_cost",
    ]);
    // Each record contributes at most one current-decision row.
    expect(new Set(projection.decisions.map((item) => item.recordId)).size).toBe(3);
    expect(projection.awaiting.map((item) => item.recordId)).toEqual(["a2"]);
  });

  it("names an inaccessible source rather than silently omitting it", () => {
    const projection = deriveApprovalsProjection({
      approvals,
      claims: { state: SECTION_STATE.NO_ACCESS },
      fundRequests: { state: SECTION_STATE.ERROR },
      range: RANGE,
    });
    expect(projection.sourceNotes).toHaveLength(2);
    expect(projection.sourceNotes[0]).toMatch(/outside your access/i);
    expect(projection.sourceNotes[1]).toMatch(/could not be loaded/i);
    expect(projection.decisions.map((item) => item.sourceDomain)).toEqual(["approval"]);
  });

  it("is inaccessible only when all three sources are", () => {
    const inaccessible = { state: SECTION_STATE.NO_ACCESS };
    expect(
      deriveApprovalsProjection({
        approvals: inaccessible,
        claims: inaccessible,
        fundRequests: inaccessible,
        range: RANGE,
      }).state
    ).toBe(SECTION_STATE.NO_ACCESS);
  });

  it("times an amendment request by its review timestamp", () => {
    const projection = deriveApprovalsProjection({
      approvals: {
        state: SECTION_STATE.READY,
        approvals: [
          {
            id: "a3",
            approvalType: "project_archive",
            state: "amendment_requested",
            requestedAt: "2026-07-20T09:00:00Z",
            reviewedAt: "2026-08-04T09:00:00Z",
            decidedAt: "",
          },
        ],
        open: [],
      },
      claims: { state: SECTION_STATE.EMPTY_EVER },
      fundRequests: { state: SECTION_STATE.EMPTY_EVER },
      range: RANGE,
    });
    expect(projection.decisions).toHaveLength(1);
    expect(projection.decisions[0].decidedAt).toBe("2026-08-04T09:00:00Z");
  });
});

describe("Needs Attention derivation", () => {
  const project = {
    id: "p1",
    blocker: "Access road impassable",
    nextAction: "Confirm turf delivery",
    nextActionDate: "2026-08-10",
    targetCompletionDate: "2026-08-20",
    actualCompletionDate: null,
  };

  it("derives current source states and links each to its filtered source", () => {
    const items = deriveNeedsAttention({
      project,
      dailySite: {
        state: SECTION_STATE.READY,
        entries: [{ id: "d1", state: "returned_for_correction" }],
        summary: { missing: 2, submittedLate: 1 },
      },
      claims: {
        state: SECTION_STATE.READY,
        claims: [{ id: "c1", lifecycle: "awaiting_review" }],
      },
      fundRequests: {
        state: SECTION_STATE.READY,
        requests: [{ id: "f1", status: "submitted" }],
      },
      approvals: { state: SECTION_STATE.READY, open: [{ id: "a1" }] },
      today: TODAY,
    });
    const ids = items.map((item) => item.id);
    expect(ids).toContain("project-blocker");
    expect(ids).toContain("next-action-overdue");
    expect(ids).toContain("target-completion-approaching");
    expect(ids).toContain("approvals-open");
    expect(ids).toContain("claims-awaiting");
    expect(ids).toContain("funds-submitted");
    expect(ids).toContain("daily-returned");
    expect(ids).toContain("daily-missing");
    expect(ids).toContain("daily-late");
    // Every item drills through to a record or a correctly filtered list.
    for (const item of items) {
      expect(item.route).toMatch(/^\/admin\/[a-z-]+/);
      expect(item.route).not.toBe("/admin");
    }
    // It is not Work Inbox state: no read/unread, recipient or delivery.
    for (const item of items) {
      expect(item).not.toHaveProperty("read");
      expect(item).not.toHaveProperty("recipientId");
    }
  });

  it("assesses nothing from an inaccessible source", () => {
    const items = deriveNeedsAttention({
      project: { id: "p1", blocker: "", nextAction: "", targetCompletionDate: null },
      dailySite: { state: SECTION_STATE.NO_ACCESS },
      claims: { state: SECTION_STATE.NO_ACCESS },
      fundRequests: { state: SECTION_STATE.NO_ACCESS },
      approvals: { state: SECTION_STATE.NO_ACCESS },
      today: TODAY,
    });
    expect(items).toEqual([]);
  });

  it("flags a target completion that has already passed", () => {
    const items = deriveNeedsAttention({
      project: { ...project, blocker: "", nextActionDate: null, targetCompletionDate: "2026-08-01" },
      today: TODAY,
    });
    expect(items.map((item) => item.id)).toContain("target-completion-passed");
  });
});

// ---------------------------------------------------------------------------
// The lifetime-empty state, end to end through the real readers
// ---------------------------------------------------------------------------
// The tests above drive the loader with stubbed readers, so they proved the
// EMPTY_PERIOD / EMPTY_EVER distinction in isolation. They could not see the
// production defect: the real claim, fund-request and approval period reads
// sent a corrupted `+03:00` offset, PostgREST answered 22007, and those three
// sections resolved to ERROR — so EMPTY_EVER was unreachable for them however
// empty the project actually was.
//
// This test runs DEFAULT_READERS against a fetch stub that behaves like
// PostgREST: it decodes the query as application/x-www-form-urlencoded and
// rejects any malformed timestamptz exactly as the database did. Nothing is
// swallowed — a corrupted read still surfaces as ERROR.
describe("the lifetime-empty state is reachable through the real readers", () => {
  const MALFORMED_TIMESTAMP = /\d{4}-\d{2}-\d{2}T[\d:.]+ \d{2}:\d{2}/;

  function stubPostgrest() {
    const rejected = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url) => {
        const query = String(url).split("?")[1] || "";
        // The server's own decoding: `+` in form-urlencoded data is a space.
        for (const [, value] of new URLSearchParams(query)) {
          if (MALFORMED_TIMESTAMP.test(value)) {
            rejected.push(value);
            return {
              ok: false,
              text: async () =>
                JSON.stringify({ code: "22007", message: "invalid input syntax for type timestamp with time zone" }),
            };
          }
        }
        if (String(url).includes("/rpc/")) return { ok: true, text: async () => "[]" };
        // The project row itself exists; every reportable source is empty.
        const isProject = String(url).includes("/projects?");
        return { ok: true, text: async () => (isProject ? JSON.stringify([PROJECT_ROW]) : "[]") };
      })
    );
    return rejected;
  }

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("resolves the finance and approval sections to empty_ever, not error", async () => {
    const rejected = stubPostgrest();
    const report = await loadProjectReport({
      accessToken: "token",
      projectId: "p1",
      range: RANGE,
      role: "owner",
      today: TODAY,
      authorisedProjectIds: ["p1"],
      readers: DEFAULT_READERS,
    });

    // The database rejected nothing, so no timestamp reached it corrupted.
    expect(rejected).toEqual([]);
    expect(report.claims.state).toBe(SECTION_STATE.EMPTY_EVER);
    expect(report.fundRequests.state).toBe(SECTION_STATE.EMPTY_EVER);
    expect(report.approvals.state).toBe(SECTION_STATE.EMPTY_EVER);
    // Distinct from a failure, and distinct from a readable-but-not-in-period
    // result — the loader still reports the project itself.
    expect(report.claims.state).not.toBe(SECTION_STATE.ERROR);
    expect(report.overview.state).toBe(SECTION_STATE.READY);
  });

  it("still reports a genuine rejection as an error, never as empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () => JSON.stringify({ code: "22007", message: "invalid input syntax" }),
      }))
    );
    const report = await loadProjectReport({
      accessToken: "token",
      projectId: "p1",
      range: RANGE,
      role: "owner",
      today: TODAY,
      authorisedProjectIds: ["p1"],
      readers: DEFAULT_READERS,
    });
    expect(report.claims.state).toBe(SECTION_STATE.ERROR);
    expect(report.claims.state).not.toBe(SECTION_STATE.EMPTY_EVER);
  });
});
