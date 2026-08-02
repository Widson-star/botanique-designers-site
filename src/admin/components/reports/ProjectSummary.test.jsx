// BD-REPORTS-01B — the Project Summary is a statistical summary.
//
// These tests hold two lines at once: the figures, labels, states and safety
// rules proved under BD-REPORTS-01A are unchanged, AND the operational record
// lists that made the page an archive no longer render anywhere on it.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProjectSummary from "./ProjectSummary";
import { SECTION_STATE } from "../../utils/reportFormat";

const RANGE = { preset: "this_month", startDate: "2026-08-01", endDate: "2026-08-31" };

const PROJECT = {
  id: "p1",
  projectName: "Alego Usonga",
  clientSiteName: "Alego residence",
  location: "Siaya",
  county: "Siaya",
  status: "Ongoing",
  stage: "Implementation",
  leadPersonId: "m1",
  startDate: "2026-06-01",
  actualStartDate: "2026-06-03",
  targetCompletionDate: "2026-09-30",
  actualCompletionDate: null,
  nextAction: "Confirm turf delivery",
  nextActionDate: "2026-08-20",
  blocker: "",
  archived: false,
};

const PROFILES = { m1: { id: "m1", full_name: "Martine Lotom", role: "manager" } };

// A period in which every source holds records. If any section still rendered
// its records, this report would make it visible.
const ENTRY = {
  id: "d1",
  workDate: "2026-08-05",
  disposition: "working",
  state: "accepted",
  expectedWorkerCount: 6,
  crewReference: "Alego turf crew",
  ratePerWorker: 500,
  plannedLabourCost: 3000,
  workPlanned: "Lay turf on the north bank",
  evidenceStatus: "provided",
  submittedAt: "2026-08-05T05:30:00Z",
  isLate: false,
};

const CLAIM = {
  id: "c1",
  recipientLabel: "Alego turf crew",
  category: "labour",
  recipientType: "crew",
  currency: "KES",
  lifecycle: "approved",
  submittedTotal: 1000,
  approvedTotal: 800,
  submittedAt: "2026-08-02T09:00:00Z",
  decidedAt: "2026-08-07T09:00:00Z",
};

const REQUEST = {
  id: "f1",
  requestNumber: "FR-0001",
  status: "approved",
  currency: "KES",
  intendedCustodyType: "operations_manager_accountable_advance",
  totalRequestedAmount: 2000,
  submittedAt: "2026-08-03T09:00:00Z",
  decidedAt: "2026-08-09T09:00:00Z",
};

function baseReport(overrides = {}) {
  return {
    projectId: "p1",
    range: RANGE,
    overview: { state: SECTION_STATE.READY, project: PROJECT },
    dailySite: {
      state: SECTION_STATE.READY,
      entries: [],
      compliance: [],
      summary: { due: 0, submitted: 0, submittedLate: 0, waived: 0, missing: 0, notDue: 0, missingDays: [] },
      labour: { entryCount: 0, expectedWorkerTotal: null, plannedLabourTotal: null, entries: [] },
    },
    claims: {
      state: SECTION_STATE.READY,
      claims: [],
      totals: { submittedCount: 0, approvedCount: 0, submittedTotal: null, approvedTotal: null, currency: null },
    },
    fundRequests: {
      state: SECTION_STATE.READY,
      requests: [],
      totals: { requestedCount: 0, authorisedCount: 0, requestedTotal: null, authorisedTotal: null, currency: null },
    },
    approvals: { state: SECTION_STATE.READY, approvals: [], open: [] },
    approvalsProjection: { state: SECTION_STATE.READY, decisions: [], awaiting: [], sourceNotes: [] },
    needsAttention: [],
    ...overrides,
  };
}

// Every source populated, exactly as a live busy month would arrive.
function fullReport() {
  return baseReport({
    dailySite: {
      state: SECTION_STATE.READY,
      entries: [ENTRY],
      compliance: [
        { projectId: "p1", workDate: "2026-08-05", due: true, complianceStatus: "entry_present" },
        { projectId: "p1", workDate: "2026-08-06", due: true, complianceStatus: "entry_late" },
        { projectId: "p1", workDate: "2026-08-07", due: true, complianceStatus: "missing" },
        { projectId: "p1", workDate: "2026-08-10", due: true, complianceStatus: "waived" },
      ],
      summary: { due: 4, submitted: 2, submittedLate: 1, waived: 1, missing: 1, notDue: 0, missingDays: [] },
      labour: { entryCount: 1, expectedWorkerTotal: 6, plannedLabourTotal: 3000, entries: [ENTRY] },
    },
    claims: {
      state: SECTION_STATE.READY,
      claims: [CLAIM],
      totals: { submittedCount: 0, approvedCount: 1, submittedTotal: null, approvedTotal: 800, currency: "KES" },
    },
    fundRequests: {
      state: SECTION_STATE.READY,
      requests: [REQUEST],
      totals: { requestedCount: 0, authorisedCount: 1, requestedTotal: null, authorisedTotal: 2000, currency: "KES" },
    },
    approvalsProjection: {
      state: SECTION_STATE.READY,
      decisions: [
        { id: "claim-c1", sourceDomain: "internal_cost", state: "approved", reference: "Alego turf crew", decidedAt: "2026-08-07T09:00:00Z", route: "/admin/site-costs/c1" },
        { id: "fund-f1", sourceDomain: "fund_request", state: "approved", reference: "FR-0001", decidedAt: "2026-08-09T09:00:00Z", route: "/admin/fund-requests/f1" },
        { id: "approval-a1", sourceDomain: "approval", state: "rejected", reference: "project_completion", decidedAt: "2026-08-11T09:00:00Z", route: "/admin/approvals/a1" },
      ],
      awaiting: [
        { id: "claim-open-c2", sourceDomain: "internal_cost", state: "awaiting_review", reference: "Karen crew", requestedAt: "2026-08-12T09:00:00Z", route: "/admin/site-costs/c2" },
      ],
      sourceNotes: [],
    },
  });
}

function renderSummary(report) {
  return render(
    <MemoryRouter>
      <ProjectSummary report={report} profilesById={PROFILES} />
    </MemoryRouter>
  );
}

describe("Project Summary — the concise report", () => {
  it("renders the seven approved summary sections in order, and no activity feed", () => {
    renderSummary(baseReport());
    const headings = screen.getAllByRole("heading", { level: 2 }).map((node) => node.textContent);
    expect(headings).toEqual([
      "Project overview",
      "Needs attention",
      "Daily site activity",
      "Attendance and planned labour",
      "Internal cost claims",
      "Fund requests",
      "Approvals and decisions",
    ]);
    expect(screen.queryByRole("heading", { name: "Recent activity" })).not.toBeInTheDocument();
  });

  it("reproduces no operational record from any module, however full the period", () => {
    const { container } = renderSummary(fullReport());

    // Removed: the day-by-day compliance list, the site-entry cards and the
    // per-day planning cards.
    expect(screen.queryByRole("heading", { name: "Days in this period" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Site entries" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Planned by day" })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Lay turf on the north bank/);
    expect(container.textContent).not.toMatch(/Alego turf crew/);

    // Removed: the claim cards and the fund-request cards.
    expect(screen.queryByRole("heading", { name: "Claims in this period" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Requests in this period" })).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/FR-0001/);

    // Removed: the per-decision and per-awaiting approval cards.
    expect(screen.queryByRole("heading", { name: "Decisions made in this period" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Awaiting a decision", level: 3 })).not.toBeInTheDocument();

    // No record link survives; only the module drill-through links remain.
    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).not.toContain("/admin/site-costs/c1");
    expect(links).not.toContain("/admin/fund-requests/f1");
    expect(links).not.toContain("/admin/daily-site-operations/d1");
  });

  it("states the period's statistics instead, and counts them correctly", () => {
    renderSummary(fullReport());

    const site = screen.getByLabelText("Daily site activity");
    expect(within(site).getByText("Entries due")).toBeInTheDocument();
    // 4 due, 1 missing -> 75%.
    expect(within(site).getByText("75%")).toBeInTheDocument();

    const approvals = screen.getByLabelText("Approvals and decisions");
    expect(within(approvals).getByText("Awaiting a decision")).toBeInTheDocument();
    expect(within(approvals).getByText("Approved")).toBeInTheDocument();
    expect(within(approvals).getByText("Rejected")).toBeInTheDocument();
    // Two approvals and one rejection were decided; one item is awaiting.
    const figures = [...approvals.querySelectorAll("[data-report-label]")].map((node) => [
      node.textContent,
      node.nextElementSibling.textContent,
    ]);
    expect(figures).toContainEqual(["Approved", "2"]);
    expect(figures).toContainEqual(["Rejected", "1"]);
    expect(figures).toContainEqual(["Awaiting a decision", "1"]);
  });

  it("says a period with no obligation has no compliance rate, rather than 0% or 100%", () => {
    renderSummary(baseReport());
    const site = screen.getByLabelText("Daily site activity");
    expect(within(site).getByText("No entries were due")).toBeInTheDocument();
    expect(within(site).queryByText("0%")).not.toBeInTheDocument();
    expect(within(site).queryByText("100%")).not.toBeInTheDocument();
  });

  it("keeps the project header to its context and defers the record to Projects", () => {
    renderSummary(baseReport());
    const overview = screen.getByLabelText("Project overview");
    expect(within(overview).getByText("Alego Usonga")).toBeInTheDocument();
    expect(within(overview).getByText("Martine Lotom")).toBeInTheDocument();
    // The period is stated by the sticky header and the period control, not a
    // third time here.
    expect(within(overview).queryByText("1 Aug 2026 – 31 Aug 2026")).not.toBeInTheDocument();
    // Project-record detail is one click away, not reproduced.
    expect(overview.textContent).not.toMatch(/Confirm turf delivery/);
    expect(overview.textContent).not.toMatch(/Planned start|Actual start|Next action/);
    expect(within(overview).queryByText(/last updated/i)).not.toBeInTheDocument();
    expect(within(overview).getByRole("link", { name: "Open the project record" })).toHaveAttribute(
      "href",
      "/admin/projects/p1"
    );
  });

  it("drills through to the module, carrying the same project and the same period", () => {
    renderSummary(baseReport());
    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).toContain(
      "/admin/daily-site-operations?project=p1&status=all&from=2026-08-01&to=2026-08-31"
    );
    expect(links).toContain("/admin/site-costs?project=p1&status=all&from=2026-08-01&to=2026-08-31");
    expect(links).toContain(
      "/admin/fund-requests?project=p1&status=all&from=2026-08-01&to=2026-08-31"
    );
    // Approvals supports no period filter, so none is claimed for it.
    expect(links).toContain("/admin/approvals?project=p1&status=open");
    expect(links).toContain("/admin/projects/p1");
    expect(links).not.toContain("/admin");
  });

  it("uses the approved plain labels and never a strengthened financial claim", () => {
    renderSummary(
      baseReport({
        claims: {
          state: SECTION_STATE.READY,
          claims: [],
          totals: { submittedCount: 1, approvedCount: 1, submittedTotal: 1000, approvedTotal: 800, currency: "KES" },
        },
        fundRequests: {
          state: SECTION_STATE.READY,
          requests: [],
          totals: { requestedCount: 1, authorisedCount: 1, requestedTotal: 2000, authorisedTotal: 2000, currency: "KES" },
        },
      })
    );
    expect(screen.getByText("Internal costs submitted")).toBeInTheDocument();
    expect(screen.getByText("Internal costs approved")).toBeInTheDocument();
    expect(screen.getByText("Funding requested")).toBeInTheDocument();
    expect(screen.getByText("Funding authorised — not released")).toBeInTheDocument();
    expect(screen.getByText("Expected workers")).toBeInTheDocument();
    expect(screen.getByText("Planned labour")).toBeInTheDocument();

    // No FIGURE LABEL or HEADING may assert a stronger fact than the record
    // proves. (The explanatory notes below each figure deliberately DO contain
    // these words, in negated form — "this is not labour paid or payroll" —
    // which is exactly the wording the authority requires.)
    const claimSurfaces = [
      ...document.querySelectorAll("[data-report-label], h1, h2, h3"),
    ].map((node) => node.textContent);
    for (const surface of claimSurfaces) {
      expect(surface).not.toMatch(/amount spent/i);
      expect(surface).not.toMatch(/funds released/i);
      expect(surface).not.toMatch(/payment made/i);
      expect(surface).not.toMatch(/reconciled/i);
      expect(surface).not.toMatch(/payroll/i);
      expect(surface).not.toMatch(/labour paid/i);
      expect(surface).not.toMatch(/work completed/i);
      expect(surface).not.toMatch(/actual worker/i);
      expect(surface).not.toMatch(/actual labour/i);
      expect(surface).not.toMatch(/amount owed/i);
    }
  });

  it("shows a genuine stored zero as zero and an absent amount as Not recorded", () => {
    renderSummary(
      baseReport({
        claims: {
          state: SECTION_STATE.READY,
          claims: [],
          totals: { submittedCount: 1, approvedCount: 0, submittedTotal: 0, approvedTotal: null, currency: "KES" },
        },
      })
    );
    const section = screen.getByLabelText("Internal cost claims");
    expect(within(section).getByText("KES 0")).toBeInTheDocument();
    expect(within(section).getByText("Not recorded")).toBeInTheDocument();
  });

  it("states that attendance is unavailable rather than showing it as zero", () => {
    renderSummary(baseReport());
    const section = screen.getByLabelText("Attendance and planned labour");
    expect(within(section).getByText("Recorded attendance")).toBeInTheDocument();
    expect(
      within(section).getByText("Not available in the current Operations Hub stage.")
    ).toBeInTheDocument();
  });

  it("keeps the five section states visibly distinct", () => {
    const { container } = renderSummary(
      baseReport({
        dailySite: { state: SECTION_STATE.NO_ACCESS },
        claims: { state: SECTION_STATE.EMPTY_PERIOD },
        fundRequests: { state: SECTION_STATE.EMPTY_EVER },
        approvalsProjection: { state: SECTION_STATE.ERROR, decisions: [], awaiting: [], sourceNotes: [] },
      })
    );
    const states = [...container.querySelectorAll("[data-report-state]")].map((node) =>
      node.getAttribute("data-report-state")
    );
    expect(states).toContain("no_access");
    expect(states).toContain("empty_period");
    expect(states).toContain("empty_ever");
    expect(states).toContain("error");
    expect(screen.getAllByText("You do not have access to this section.").length).toBeGreaterThan(0);
    expect(screen.getByText("No records in the selected period.")).toBeInTheDocument();
    expect(screen.getByText("No records exist for this project.")).toBeInTheDocument();
    expect(screen.getByText("Data could not be loaded.")).toBeInTheDocument();
  });

  it("shows no raw database error text when a section fails", () => {
    renderSummary(baseReport({ claims: { state: SECTION_STATE.ERROR } }));
    const section = screen.getByLabelText("Internal cost claims");
    expect(within(section).getByText("Data could not be loaded.")).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/PGRST|permission denied|row-level security|relation/i);
  });

  it("still says which source is outside the reader's access before counting", () => {
    renderSummary(
      baseReport({
        approvalsProjection: {
          state: SECTION_STATE.READY,
          decisions: [],
          awaiting: [],
          sourceNotes: ["Fund request decisions are outside your access and are not included below."],
        },
      })
    );
    const section = screen.getByLabelText("Approvals and decisions");
    expect(
      within(section).getByText(
        "Fund request decisions are outside your access and are not included below."
      )
    ).toBeInTheDocument();
  });

  it("needs no horizontal table on any width", () => {
    const { container } = renderSummary(fullReport());
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector(".overflow-x-auto, .overflow-x-scroll")).toBeNull();
  });

  it("shows Needs Attention as a derived summary, not as an inbox", () => {
    renderSummary(
      baseReport({
        needsAttention: [
          {
            id: "claims-awaiting",
            severity: "medium",
            title: "1 internal cost claim awaiting review",
            detail: "Submitted for a decision. Nothing has been approved, released or paid.",
            route: "/admin/site-costs?project=p1&status=awaiting_review",
          },
        ],
      })
    );
    const section = screen.getByLabelText("Needs attention");
    expect(within(section).getByText("1 internal cost claim awaiting review")).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/mark as read|unread|notify|notification|recipient/i);
  });
});
