// BD-REPORTS-01A — reader query shape.
//
// These tests pin the properties the authority requires of every Reports read:
// a project predicate, a date predicate where the domain has one, an explicit
// column list, a bound, and no JSON snapshot or payload column anywhere.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchClaimEvents,
  fetchDailySiteEvents,
  fetchFundRequestEvents,
  fetchProjectHistoryEvents,
  fetchReportApprovals,
  fetchReportClaims,
  fetchReportDailySiteEntries,
  fetchReportFundRequests,
  fetchReportProject,
  fetchReportProjects,
  fetchReportRangeCompliance,
  RECENT_ACTIVITY_LIMIT,
  REPORT_ROW_LIMIT,
} from "./reports";

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };
const BOUNDS = { from: "2026-08-01T00:00:00.000+03:00", to: "2026-08-31T23:59:59.999+03:00" };

let calls;

function decode(url) {
  return decodeURIComponent(url);
}

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url, init) => {
      calls.push({ url: String(url), init });
      return { ok: true, text: async () => "[]" };
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const JSON_COLUMNS = [
  "daily_site_snapshot",
  "claim_snapshot",
  "line_snapshot",
  "payload",
  "previous_values",
  "new_values",
  "original_values",
  "proposed_values",
  "claim_reference_snapshot",
];

describe("Reports reader query shape", () => {
  it("never selects every column and never selects a JSON snapshot or payload", async () => {
    await fetchReportProjects("t");
    await fetchReportProject("t", "p1");
    await fetchReportDailySiteEntries("t", "p1", RANGE);
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportFundRequests("t", "p1", BOUNDS);
    await fetchReportApprovals("t", "p1", BOUNDS);
    await fetchProjectHistoryEvents("t", "p1", BOUNDS);
    await fetchDailySiteEvents("t", "p1", BOUNDS);
    await fetchClaimEvents("t", "p1", BOUNDS);
    await fetchFundRequestEvents("t", "p1", BOUNDS);

    for (const call of calls) {
      const url = decode(call.url);
      expect(url).toMatch(/[?&]select=/);
      expect(url).not.toMatch(/select=\*/);
      for (const column of JSON_COLUMNS) {
        expect(url).not.toContain(column);
      }
    }
  });

  it("carries a project predicate and a bound on every list read", async () => {
    await fetchReportDailySiteEntries("t", "p1", RANGE);
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportFundRequests("t", "p1", BOUNDS);
    await fetchReportApprovals("t", "p1", BOUNDS);

    for (const call of calls) {
      const url = decode(call.url);
      expect(url).toMatch(/project_id=eq\.p1/);
      expect(url).toContain(`limit=${REPORT_ROW_LIMIT}`);
    }
  });

  it("filters Daily Site by work date, and finance by submission or decision date", async () => {
    await fetchReportDailySiteEntries("t", "p1", RANGE);
    expect(decode(calls[0].url)).toContain("work_date=gte.2026-08-01");
    expect(decode(calls[0].url)).toContain("work_date=lte.2026-08-31");
    // Lateness never controls period membership.
    expect(decode(calls[0].url)).not.toMatch(/submitted_at=(gte|lte)/);

    await fetchReportClaims("t", "p1", BOUNDS);
    const claimUrl = decode(calls[1].url);
    expect(claimUrl).toContain("submitted_at.gte.2026-08-01T00:00:00.000+03:00");
    expect(claimUrl).toContain("decided_at.lte.2026-08-31T23:59:59.999+03:00");
    // updated_at is never the reporting date for a financial figure.
    expect(claimUrl).not.toContain("updated_at.gte");

    await fetchReportFundRequests("t", "p1", BOUNDS);
    expect(decode(calls[2].url)).not.toContain("updated_at.gte");
  });

  it("uses requested, reviewed and decided dates for approvals", async () => {
    await fetchReportApprovals("t", "p1", BOUNDS);
    const url = decode(calls[0].url);
    expect(url).toContain("requested_at.gte");
    expect(url).toContain("reviewed_at.gte");
    expect(url).toContain("decided_at.gte");
  });

  it("bounds every event read and scopes it to the project through its parent record", async () => {
    await fetchDailySiteEvents("t", "p1", BOUNDS);
    await fetchClaimEvents("t", "p1", BOUNDS);
    await fetchFundRequestEvents("t", "p1", BOUNDS);

    expect(decode(calls[0].url)).toContain("daily_site_entries.project_id=eq.p1");
    expect(decode(calls[1].url)).toContain("internal_cost_claims.project_id=eq.p1");
    expect(decode(calls[2].url)).toContain("fund_requests.project_id=eq.p1");
    for (const call of calls) {
      expect(decode(call.url)).toContain(`limit=${RECENT_ACTIVITY_LIMIT}`);
    }
    // fund_request_events stamps created_at, so that is what is filtered.
    expect(decode(calls[2].url)).toContain("created_at=gte.");
  });

  it("asks the range source once for the whole period, never once per day", async () => {
    await fetchReportRangeCompliance("t", "p1", RANGE);
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("/rpc/daily_site_range_compliance");
    expect(JSON.parse(calls[0].init.body)).toEqual({
      range_start: "2026-08-01",
      range_end: "2026-08-31",
      target_project_id: "p1",
    });
  });

  it("replaces any database or policy error with one safe message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        text: async () =>
          JSON.stringify({ code: "42501", message: 'permission denied for table internal_cost_claims' }),
      }))
    );
    await expect(fetchReportClaims("t", "p1", BOUNDS)).rejects.toThrow(
      "Unable to load internal cost claims."
    );
    await expect(fetchReportClaims("t", "p1", BOUNDS)).rejects.not.toThrow(/permission denied|42501/);
  });
});
