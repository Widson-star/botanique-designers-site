// BD-REPORTS-01A — the four list routes now accept URL-addressable project,
// status and period filters, so a report count reaches the exact filtered list
// it referred to rather than an unfiltered module index.
//
// A URL parameter narrows what the caller can already see. It grants nothing:
// every row still arrives through the caller's own row level security, and each
// destination re-checks its own access exactly as before.
import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import { StaffCompensationContext } from "../context/staffCompensation";
import { FundRequestsContext } from "../context/fundRequests";
import AdminApprovals from "./AdminApprovals";
import AdminDailySiteOperations from "./AdminDailySiteOperations";
import AdminAdvances from "./AdminAdvances";
import AdminSiteCosts from "./AdminSiteCosts";

const projects = [
  { id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false },
  { id: "p2", projectName: "Karen Retreat", status: "Ongoing", archived: false },
];
const profiles = [{ id: "m1", full_name: "Martine Lotom", role: "manager" }];

const admin = {
  role: "owner",
  currentUserId: "o1",
  projects,
  profiles,
  profilesById: Object.fromEntries(profiles.map((profile) => [profile.id, profile])),
};

const claims = [
  {
    id: "c1", projectId: "p1", recipientLabel: "Alego turf crew", category: "labour",
    lifecycle: "approved", submittedTotal: 1000, approvedTotal: 800, requesterId: "m1",
    serviceDate: "2026-08-05", submittedAt: "2026-08-02T09:00:00Z", decidedAt: "2026-08-07T09:00:00Z",
    updatedAt: "2026-08-07T09:00:00Z",
  },
  {
    id: "c2", projectId: "p2", recipientLabel: "Karen crew", category: "transport",
    lifecycle: "awaiting_review", submittedTotal: 500, approvedTotal: null, requesterId: "m1",
    serviceDate: "2026-07-05", submittedAt: "2026-07-02T09:00:00Z", decidedAt: "",
    updatedAt: "2026-07-02T09:00:00Z",
  },
];

const fundRequests = [
  {
    id: "f1", requestNumber: "FR-0001", projectId: "p1", authorityType: "manager_request",
    status: "approved", requesterId: "m1", intendedCustodyType: "operations_manager_accountable_advance",
    totalRequestedAmount: 2000, submissionRound: 1,
    submittedAt: "2026-08-03T09:00:00Z", decidedAt: "2026-08-09T09:00:00Z", updatedAt: "2026-08-09T09:00:00Z",
  },
  {
    id: "f2", requestNumber: "FR-0002", projectId: "p2", authorityType: "manager_request",
    status: "submitted", requesterId: "m1", intendedCustodyType: "direct_recipient_funding",
    totalRequestedAmount: 900, submissionRound: 1,
    submittedAt: "2026-07-03T09:00:00Z", decidedAt: "", updatedAt: "2026-07-03T09:00:00Z",
  },
];

const entries = [
  {
    id: "d1", projectId: "p1", workDate: "2026-08-05", disposition: "working", state: "accepted",
    version: 1, expectedWorkerCount: 6, plannedLabourCost: 3000, workPlanned: "Lay turf", isLate: false,
  },
  {
    id: "d2", projectId: "p2", workDate: "2026-07-05", disposition: "working", state: "accepted",
    version: 1, expectedWorkerCount: 3, plannedLabourCost: 1500, workPlanned: "Prune", isLate: false,
  },
];

const approvals = [
  {
    id: "a1", approvalType: "project_completion", projectId: "p1", requesterId: "m1",
    state: "awaiting_review", requestedAt: "2026-08-04T09:00:00Z", reviewedAt: "", decidedAt: "",
  },
  {
    id: "a2", approvalType: "project_archive", projectId: "p2", requesterId: "m1",
    state: "approved", requestedAt: "2026-07-04T09:00:00Z", reviewedAt: "", decidedAt: "2026-07-06T09:00:00Z",
  },
];

function wrap(element, initial) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminDataContext.Provider value={admin}>
        <AdminApprovalsContext.Provider value={{ requests: approvals, status: "ready", error: "" }}>
          <DailySiteOperationsContext.Provider
            value={{ entries, compliance: [], authorisedProjects: projects, status: "ready", error: "" }}
          >
            {/* A drill-through reports the Project Cost payment position the Hub
                actually holds. It never infers payment from a fund request or a
                fund release, and it never pro-rates one across costs. No cost
                here has a confirmed payment history, so Paid and Balance stay
                unknown rather than being reported as nil. */}
            <StaffCompensationContext.Provider value={{ compensations: [], payments: [], paymentPositionForCompensation: () => null, status: "ready", error: "" }}>
              <SiteCostsContext.Provider
                value={{
                  claims, status: "ready", error: "",
                  payments: [], paymentPositions: [],
                  paymentsForClaim: () => [],
                  paymentPositionForClaim: () => null,
                }}
              >
                <FundRequestsContext.Provider value={{ requests: fundRequests, releases: [], acquittals: [], status: "ready", error: "" }}>
                  <Routes>{element}</Routes>
                </FundRequestsContext.Provider>
              </SiteCostsContext.Provider>
            </StaffCompensationContext.Provider>
          </DailySiteOperationsContext.Provider>
        </AdminApprovalsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

const AUGUST = "from=2026-08-01&to=2026-08-31";

describe("URL-addressable drill-through filters", () => {
  it("narrows Site Costs to the project, status and period in the URL", () => {
    wrap(
      <Route path="/admin/site-costs" element={<AdminSiteCosts />} />,
      `/admin/site-costs?project=p1&status=approved&${AUGUST}`
    );
    expect(screen.getAllByText("Alego Usonga").length).toBeGreaterThan(0);
    expect(screen.queryByText("Karen crew")).not.toBeInTheDocument();
    expect(screen.getByText(/Filtered to Alego Usonga · Approved · 2026-08-01 to 2026-08-31\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/admin/site-costs");
    // Narrowing a report never manufactures payment knowledge. These approved
    // costs have no confirmed payment history, so Paid and Balance stay unknown.
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("Alego turf crew"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    expect(cells[5]).toBe("—");
    expect(cells[6]).toBe("—");
  });

  // /admin/fund-requests is the route; Advances is the surface. The old
  // fund-request list component was deleted, so a drill-through reaches the
  // Advances page — and it must genuinely narrow, not merely render. FR-0002
  // is another project's request and belongs to no other custody model, so it
  // must be absent rather than merely outranked.
  it("narrows Advances to the project, status and period in the URL", () => {
    wrap(
      <Route path="/admin/fund-requests" element={<AdminAdvances />} />,
      `/admin/fund-requests?project=p1&status=approved&${AUGUST}`
    );
    expect(screen.getByRole("heading", { name: "Advances" })).toBeInTheDocument();
    expect(screen.getByText(/FR-0001/)).toBeInTheDocument();
    expect(screen.queryByText(/FR-0002/)).not.toBeInTheDocument();
    expect(screen.getByText(/Filtered to Alego Usonga · Approved · 2026-08-01 to 2026-08-31\./)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Clear filters" })).toHaveAttribute("href", "/admin/fund-requests");
    // The rejected vocabulary must not reappear on a drill-through either.
    expect(document.body.textContent).not.toMatch(/Funding, Payments & Reconciliation/);
  });

  it("narrows Daily Site Operations to the project and work-date period in the URL", () => {
    wrap(
      <Route path="/admin/daily-site-operations" element={<AdminDailySiteOperations />} />,
      `/admin/daily-site-operations?project=p1&status=all&${AUGUST}`
    );
    expect(screen.getAllByText("Alego Usonga").length).toBeGreaterThan(0);
    // No OTHER project's record is listed. The site filter still offers every
    // project as a choice, which is how a reader widens the view again — an
    // option in a control is not a record in the results.
    const rows = document.querySelector("tbody");
    expect(within(rows).queryByText("Karen Retreat")).not.toBeInTheDocument();
    expect(screen.getByText(/Filtered to Alego Usonga · 2026-08-01 to 2026-08-31\./)).toBeInTheDocument();
  });

  it("narrows Approvals to the project and open state in the URL", () => {
    wrap(
      <Route path="/admin/approvals" element={<AdminApprovals />} />,
      "/admin/approvals?project=p1&status=open"
    );
    const table = screen.getByRole("table");
    expect(within(table).getByText("Alego Usonga")).toBeInTheDocument();
    expect(within(table).queryByText("Karen Retreat")).not.toBeInTheDocument();
    expect(screen.getByText(/Filtered to Alego Usonga · Awaiting a decision\./)).toBeInTheDocument();
  });

  it("behaves exactly as before when the URL carries no filters", () => {
    wrap(<Route path="/admin/site-costs" element={<AdminSiteCosts />} />, "/admin/site-costs");
    expect(screen.getAllByText("Alego Usonga").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Karen Retreat").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Filtered to/)).not.toBeInTheDocument();
  });

  it("says nothing matches rather than pretending the records do not exist", () => {
    wrap(
      <Route path="/admin/site-costs" element={<AdminSiteCosts />} />,
      "/admin/site-costs?project=p1&status=rejected"
    );
    expect(screen.getByText("No project cost matches these filters.")).toBeInTheDocument();
  });

  it("keeps a URL project selectable even when no record in view references it", () => {
    wrap(
      <Route path="/admin/site-costs" element={<AdminSiteCosts />} />,
      "/admin/site-costs?project=p1&status=rejected"
    );
    const selector = screen.getAllByRole("combobox")[1];
    expect(within(selector).getByRole("option", { name: "Alego Usonga" }).selected).toBe(true);
  });
});
