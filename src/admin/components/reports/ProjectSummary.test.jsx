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
    recentActivity: { state: SECTION_STATE.READY, items: [] },
    needsAttention: [],
    ...overrides,
  };
}

function renderSummary(report) {
  return render(
    <MemoryRouter>
      <ProjectSummary report={report} profilesById={PROFILES} />
    </MemoryRouter>
  );
}

describe("Project Summary", () => {
  it("renders all eight sections in the approved order", () => {
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
      "Recent activity",
    ]);
  });

  it("shows the project record without the deprecated last-updated value", () => {
    renderSummary(baseReport());
    expect(screen.getByText("Alego Usonga")).toBeInTheDocument();
    expect(screen.getByText("Martine Lotom")).toBeInTheDocument();
    expect(screen.queryByText(/last updated/i)).not.toBeInTheDocument();
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

  it("drills through to the exact record or a correctly filtered list, never the admin home", () => {
    renderSummary(
      baseReport({
        claims: {
          state: SECTION_STATE.READY,
          claims: [
            {
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
            },
          ],
          totals: { submittedCount: 0, approvedCount: 1, submittedTotal: null, approvedTotal: 800, currency: "KES" },
        },
      })
    );
    const links = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(links).toContain("/admin/site-costs/c1");
    expect(links).toContain("/admin/site-costs?project=p1&status=all");
    expect(links).toContain("/admin/daily-site-operations?project=p1&status=all");
    expect(links).toContain("/admin/fund-requests?project=p1&status=all");
    expect(links).toContain("/admin/projects/p1");
    expect(links).not.toContain("/admin");
  });

  it("renders records as stacked cards, not as a horizontal table", () => {
    const { container } = renderSummary(
      baseReport({
        fundRequests: {
          state: SECTION_STATE.READY,
          requests: [
            {
              id: "f1",
              requestNumber: "FR-0001",
              status: "approved",
              currency: "KES",
              intendedCustodyType: "operations_manager_accountable_advance",
              totalRequestedAmount: 2000,
              submittedAt: "2026-08-03T09:00:00Z",
              decidedAt: "2026-08-09T09:00:00Z",
            },
          ],
          totals: { requestedCount: 0, authorisedCount: 1, requestedTotal: null, authorisedTotal: 2000, currency: "KES" },
        },
      })
    );
    expect(container.querySelector("table")).toBeNull();
    const section = screen.getByLabelText("Fund requests");
    expect(within(section).getByText("FR-0001")).toBeInTheDocument();
    expect(within(section).getAllByText("Funding authorised — not released").length).toBeGreaterThan(0);
  });

  it("labels activity in plain words and never with a raw event identifier", () => {
    renderSummary(
      baseReport({
        recentActivity: {
          state: SECTION_STATE.READY,
          items: [
            {
              id: "fund-1",
              sourceDomain: "fund_request",
              eventType: "principal_direct_authorised",
              actorId: "m1",
              occurredAt: "2026-08-06T09:00:00Z",
              recordId: "f1",
              projectId: "p1",
              route: "/admin/fund-requests/f1",
            },
            {
              id: "daily-1",
              sourceDomain: "daily_site",
              eventType: "returned_for_correction",
              actorId: "m1",
              occurredAt: "2026-08-05T05:30:00Z",
              recordId: "d1",
              projectId: "p1",
              route: "/admin/daily-site-operations/d1",
            },
          ],
        },
      })
    );
    const section = screen.getByLabelText("Recent activity");
    expect(
      within(section).getByText("Funding authorised directly by the Principal")
    ).toBeInTheDocument();
    expect(within(section).getByText("Site entry returned for correction")).toBeInTheDocument();
    expect(section.textContent).not.toMatch(/principal_direct_authorised|returned_for_correction/);
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
