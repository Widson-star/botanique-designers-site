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
  submittedOrDecidedIn,
} from "./reports";

const RANGE = { startDate: "2026-08-01", endDate: "2026-08-31" };
const BOUNDS = { from: "2026-08-01T00:00:00.000+03:00", to: "2026-08-31T23:59:59.999+03:00" };

// The UTC instants the EAT bounds above denote. EAT is UTC+03:00, so EAT
// midnight on 1 August is 21:00 UTC on 31 July.
const FROM_UTC = "2026-07-31T21:00:00.000Z";
const TO_UTC = "2026-08-31T20:59:59.999Z";

let calls;

// Decode a serialized URL the way the receiving server does.
//
// The query string is application/x-www-form-urlencoded, where a literal `+`
// means a SPACE. decodeURIComponent alone does not model that — it leaves `+`
// untouched — which is exactly why the `+03:00` corruption survived the
// original tests and only surfaced in production. Each key and value is decoded
// with plus-as-space semantics while the `&` and `=` separators are kept, so
// the existing `key=value` assertions still read naturally.
function formDecode(part) {
  return decodeURIComponent(part.replace(/\+/g, "%20"));
}

function decode(url) {
  const [base, query = ""] = String(url).split("?");
  if (!query) return base;
  const decoded = query
    .split("&")
    .map((pair) => pair.split("=").map(formDecode).join("="))
    .join("&");
  return `${base}?${decoded}`;
}

// The serialized query exactly as it goes on the wire, undecoded.
function rawQuery(url) {
  return String(url).split("?")[1] || "";
}

// The `or` predicate as the server itself would parse it out of the request.
function serverParsedOr(url) {
  return new URLSearchParams(rawQuery(url)).get("or");
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

// ---------------------------------------------------------------------------
// EAT offset encoding
// ---------------------------------------------------------------------------
// Authenticated production verification showed Internal Cost Claims, Fund
// Requests and Approvals & Decisions all failing while every other section
// loaded. The cause was the `+03:00` Africa/Nairobi offset: those three readers
// built raw `or=(and(...))` query text and passed it back through
// `new URLSearchParams(text)`, which reads `+` as a space. PostgREST then
// received `2026-08-01T00:00:00.000 03:00` and PostgreSQL rejected it as an
// invalid timestamptz (22007).
//
// Every assertion below decodes through URLSearchParams — the actual server
// path — rather than decodeURIComponent, which cannot see this defect.
describe("EAT offsets survive query encoding", () => {
  const CLAIM_OR =
    "(and(submitted_at.gte.2026-08-01T00:00:00.000+03:00," +
    "submitted_at.lte.2026-08-31T23:59:59.999+03:00)," +
    "and(decided_at.gte.2026-08-01T00:00:00.000+03:00," +
    "decided_at.lte.2026-08-31T23:59:59.999+03:00))";

  const APPROVAL_OR =
    "(and(requested_at.gte.2026-08-01T00:00:00.000+03:00," +
    "requested_at.lte.2026-08-31T23:59:59.999+03:00)," +
    "and(reviewed_at.gte.2026-08-01T00:00:00.000+03:00," +
    "reviewed_at.lte.2026-08-31T23:59:59.999+03:00)," +
    "and(decided_at.gte.2026-08-01T00:00:00.000+03:00," +
    "decided_at.lte.2026-08-31T23:59:59.999+03:00))";

  it("encodes the offset as %2B on the wire for all three affected readers", async () => {
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportFundRequests("t", "p1", BOUNDS);
    await fetchReportApprovals("t", "p1", BOUNDS);

    expect(calls).toHaveLength(3);
    for (const call of calls) {
      const raw = rawQuery(call.url);
      expect(raw).toContain("%2B03%3A00");
      // A bare `+` inside the serialized query would be decoded as a space.
      expect(raw).not.toContain(".000+03");
      expect(raw).not.toContain(".999+03");
      // Encoded exactly once — `%252B` would mean the value was encoded twice.
      expect(raw).not.toContain("%252B");
      expect(raw).not.toContain("%2523");
    }
  });

  it("decodes back to +03:00, never to a space, through the server's own parser", async () => {
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportFundRequests("t", "p1", BOUNDS);
    await fetchReportApprovals("t", "p1", BOUNDS);

    for (const call of calls) {
      const parsed = serverParsedOr(call.url);
      expect(parsed).toContain("+03:00");
      expect(parsed).not.toContain(" 03:00");
    }
  });

  it("keeps the whole nested PostgREST expression intact for claims and fund requests", async () => {
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportFundRequests("t", "p1", BOUNDS);

    // Byte-for-byte, both readers share the one submitted-or-decided predicate.
    expect(serverParsedOr(calls[0].url)).toBe(CLAIM_OR);
    expect(serverParsedOr(calls[1].url)).toBe(CLAIM_OR);
    expect(`or=${submittedOrDecidedIn(BOUNDS)}`).toBe(`or=${CLAIM_OR}`);
  });

  it("keeps the whole nested PostgREST expression intact for project approvals", async () => {
    await fetchReportApprovals("t", "p1", BOUNDS);
    expect(serverParsedOr(calls[0].url)).toBe(APPROVAL_OR);
  });

  it("delivers timestamps the database can actually parse, at the exact period boundaries", async () => {
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportApprovals("t", "p1", BOUNDS);

    for (const call of calls) {
      const parsed = serverParsedOr(call.url);
      const stamps = parsed.match(/\d{4}-\d{2}-\d{2}T[\d:.]+[+-]\d{2}:\d{2}/g) || [];
      expect(stamps.length).toBeGreaterThan(0);
      for (const stamp of stamps) {
        // The corrupted form parses to NaN; this is what 22007 looked like.
        expect(Number.isNaN(Date.parse(stamp))).toBe(false);
      }
      // The period edges still denote the intended UTC instants, so no row is
      // gained or lost at the boundary.
      expect(Date.parse(stamps[0])).toBe(Date.parse(FROM_UTC));
      expect(Date.parse(stamps[stamps.length - 1])).toBe(Date.parse(TO_UTC));
    }
  });

  it("keeps the project, column, order and limit predicates alongside the or predicate", async () => {
    await fetchReportClaims("t", "p1", BOUNDS);
    await fetchReportFundRequests("t", "p1", BOUNDS);
    await fetchReportApprovals("t", "p1", BOUNDS);

    const orders = ["submitted_at.desc", "submitted_at.desc", "requested_at.desc"];
    // The reporting-date columns each section's totals depend on.
    const dateColumns = [
      ["submitted_at", "decided_at"],
      ["submitted_at", "decided_at"],
      ["requested_at", "reviewed_at", "decided_at"],
    ];
    calls.forEach((call, index) => {
      const params = new URLSearchParams(rawQuery(call.url));
      expect(params.get("project_id")).toBe("eq.p1");
      expect(params.get("limit")).toBe(String(REPORT_ROW_LIMIT));
      expect(params.get("order")).toBe(orders[index]);
      const selected = params.get("select").split(",");
      for (const column of dateColumns[index]) {
        expect(selected).toContain(column);
      }
      expect(params.get("select")).not.toContain("*");
      // One `or` predicate, not a duplicated or split one.
      expect(params.getAll("or")).toHaveLength(1);
    });
  });

  // The failure mode itself, pinned. If anyone reinstates raw query text as the
  // way these predicates are built, this test documents what production saw.
  it("shows why prebuilt query text corrupts the offset — the original defect", () => {
    const params = new URLSearchParams({ select: "id", project_id: "eq.p1" });
    const legacy = `${params.toString()}&or=${submittedOrDecidedIn(BOUNDS)}`;
    const serialized = new URLSearchParams(legacy).toString();

    expect(new URLSearchParams(serialized).get("or")).toContain(" 03:00");
    expect(new URLSearchParams(serialized).get("or")).not.toContain("+03:00");
    expect(Number.isNaN(Date.parse("2026-08-01T00:00:00.000 03:00"))).toBe(true);
  });
});
