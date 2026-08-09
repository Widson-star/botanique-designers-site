import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import AdminSiteCosts from "./AdminSiteCosts";
import AdminSiteCostDetail from "./AdminSiteCostDetail";
import AdminSiteCostForm from "./AdminSiteCostForm";

const projects = [{ id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false }];
const profiles = [
  { id: "o1", full_name: "Widson Omutelema Ambaisi", role: "owner" },
  { id: "m1", full_name: "Martine Lotom", role: "manager" },
];
const claim = {
  id: "c1", projectId: "p1", dailySiteEntryId: "d1", dailySiteSourceVersion: 2,
  dailySiteSnapshot: { work_date: "2026-07-31", state: "accepted" }, serviceDate: "2026-07-31",
  recipientType: "crew", recipientLabel: "Alego turf crew", category: "labour", currency: "KES",
  purpose: "Lay turf", lifecycle: "awaiting_review", requestRound: 1, submittedTotal: 3350,
  approvedTotal: null, requesterId: "m1", deciderId: "", version: 2,
  updatedAt: "2026-07-31T09:00:00Z",
};
const lines = [{ id: "l1", claimId: "c1", lineNumber: 1, description: "Crew labour", rateType: "daily", quantity: 6, unit: "worker", unitRate: 500, lineTotal: 3000 }];
const events = [{ id: "e1", claimId: "c1", actorId: "m1", eventType: "submitted", requestRound: 1, reason: "", occurredAt: "2026-07-31T09:00:00Z" }];

function contexts({ role = "owner", claims = [claim], decideClaim = vi.fn(), dailyEntries = [], finance = {} } = {}) {
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles },
    daily: { entries: dailyEntries },
    costs: {
      claims, lines, eventsByClaim: { c1: events }, authorisedProjects: projects, status: "ready", error: "",
      linesForClaim: (id) => lines.filter((line) => line.claimId === id), loadEvents: vi.fn(() => Promise.resolve(events)),
      refresh: vi.fn(() => Promise.resolve({ ok: true })), createDraft: vi.fn(), authoriseDirect: vi.fn(),
      updateClaim: vi.fn(), submitClaim: vi.fn(), withdrawClaim: vi.fn(), decideClaim, cancelClaim: vi.fn(),
    },
    finance: { requests: [], allocations: [], releases: [], acquittals: [], ...finance },
  };
}

function wrap(element, values, initial = "/admin/site-costs") {
  return render(<MemoryRouter initialEntries={[initial]}><AdminDataContext.Provider value={values.admin}><DailySiteOperationsContext.Provider value={values.daily}><SiteCostsContext.Provider value={values.costs}><FundRequestsContext.Provider value={values.finance}>{element}</FundRequestsContext.Provider></SiteCostsContext.Provider></DailySiteOperationsContext.Provider></AdminDataContext.Provider></MemoryRouter>);
}

describe("Project Costs admin surfaces", () => {
  it("renders the Principal queue in desktop-table and mobile-card layouts", () => {
    const values = contexts();
    const { container } = wrap(<AdminSiteCosts />, values);
    expect(screen.getByRole("heading", { name: "Project Costs" })).toBeInTheDocument();
    expect(screen.getAllByText("Alego Usonga").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/KES\s*3,350\.00/).length).toBeGreaterThan(1);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Authorise project cost" })).toBeInTheDocument();
  });

  it("shows whole-claim Principal decisions, immutable history and stale recovery", async () => {
    const decideClaim = vi.fn(() => Promise.resolve({ ok: false, stale: true, error: "stale" }));
    const values = contexts({ decideClaim });
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>, values, "/admin/site-costs/c1");
    expect(screen.getByRole("button", { name: "Approve whole claim" })).toBeInTheDocument();
    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
    expect(screen.getByText(/Approval is authority to incur/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve whole claim" }));
    await waitFor(() => expect(screen.getByText(/changed elsewhere/)).toBeInTheDocument());
  });

  it("copies eligible Daily Site planning into a deliberate manager claim draft", () => {
    const dailyEntry = { id: "d1", projectId: "p1", workDate: "2026-07-31", disposition: "working", state: "accepted", version: 2, expectedWorkerCount: 6, crewReference: "Alego turf crew", ratePerWorker: 500, agreedLabourTotal: null, plannedLabourCost: 3000, workPlanned: "Lay turf" };
    const values = contexts({ role: "manager", claims: [], dailyEntries: [dailyEntry] });
    wrap(<Routes><Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} /></Routes>, values, "/admin/site-costs/new?dailySiteEntryId=d1");
    expect(screen.getByText(/no liability was created automatically/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alego turf crew")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lay turf")).toBeInTheDocument();
    expect(screen.getAllByText(/KES\s*3,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save and submit" })).toBeEnabled();
  });

  it("uses a distinct Principal direct-authority action", () => {
    const values = contexts({ role: "owner", claims: [] });
    wrap(<Routes><Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} /></Routes>, values, "/admin/site-costs/new");
    expect(screen.getByRole("heading", { name: "Authorise project cost" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Authorise cost" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BD-FIN-01C read integration. Project Costs answers, at first view: what was
// authorised, what actually moved, what was actually spent, what is unresolved.
// ---------------------------------------------------------------------------

describe("Project Costs financial position", () => {
  const ADVANCE = "operations_manager_accountable_advance";
  const DIRECT = "direct_recipient_funding";
  const approvedClaim = { ...claim, lifecycle: "approved", approvedTotal: 20000, submittedTotal: 20000 };

  const request = (overrides = {}) => ({
    id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved",
    intendedCustodyType: ADVANCE, totalRequestedAmount: 20000, version: 1, ...overrides,
  });
  const alloc = (overrides = {}) => ({
    id: "a1", fundRequestId: "r1", claimId: "c1", allocationOrder: 1, requestedAmount: 20000, ...overrides,
  });
  const rel = (overrides = {}) => ({
    id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
    releasedAmount: 10000, releasedAt: "2026-08-05T09:00:00Z", version: 1, ...overrides,
  });
  const acq = (overrides = {}) => ({
    id: "acq1", fundReleaseId: "rel1", state: "accepted", releasedAmountSnapshot: 10000,
    actualSpendTotal: 10000, returnedAmount: 0, varianceAmount: 0, version: 1, ...overrides,
  });

  const withFinance = (finance) => contexts({ claims: [approvedClaim], finance });

  it("says so plainly when a claim sits on no fund request", () => {
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    expect(screen.getAllByText("Not yet funded — no fund request").length).toBeGreaterThan(0);
    // No banner is shown when there is nothing financial to summarise.
    expect(screen.queryByText("Financial position of these costs")).not.toBeInTheDocument();
  });

  it("shows authorised, released, actual and unreleased for the visible costs", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()], releases: [rel()], acquittals: [acq()],
    }));
    expect(screen.getByText("Financial position of these costs")).toBeInTheDocument();
    const banner = screen.getByText("Financial position of these costs").closest("div").parentElement;
    expect(within(banner).getByText("Authorised").parentElement).toHaveTextContent(/20,000/);
    expect(within(banner).getByText("Released").parentElement).toHaveTextContent(/10,000/);
    // A release is not expenditure: actual spend comes from the acquittal.
    expect(within(banner).getByText("Actual spend").parentElement).toHaveTextContent(/10,000/);
    expect(within(banner).getByText("Unreleased").parentElement).toHaveTextContent(/10,000/);
  });

  it("does not count an unaccounted advance as actual expenditure", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()], releases: [rel({ releasedAmount: 20000 })],
    }));
    const banner = screen.getByText("Financial position of these costs").closest("div").parentElement;
    expect(within(banner).getByText("Released").parentElement).toHaveTextContent(/20,000/);
    expect(within(banner).getByText("Actual spend").parentElement).toHaveTextContent(/KES\s*0/);
    expect(screen.getAllByText(/Reconciliation outstanding/).length).toBeGreaterThan(0);
  });

  it("treats a direct settled payment as actual expenditure with no acquittal", () => {
    const { container } = wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()],
      releases: [rel({ custodyDisposition: DIRECT, releasedAmount: 20000, recipientLabel: "Kisumu Hardware" })],
    }));
    const banner = screen.getByText("Financial position of these costs").closest("div").parentElement;
    expect(within(banner).getByText("Actual spend").parentElement).toHaveTextContent(/20,000/);
    // The claim rows never invent a reconciliation debt for a settled payment.
    // (The filter control naturally still offers the option as a choice.)
    expect(within(container.querySelector("table")).queryByText(/Reconciliation outstanding/))
      .not.toBeInTheDocument();
    expect(screen.getAllByText("Financially settled").length).toBeGreaterThan(0);
  });

  it("aggregates several releases and reports the variance of an advance", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()],
      releases: [
        rel({ id: "rel1", releasedAmount: 12000 }),
        rel({ id: "rel2", custodyDisposition: DIRECT, releasedAmount: 8000, recipientLabel: "Supplier" }),
      ],
      acquittals: [acq({
        fundReleaseId: "rel1", releasedAmountSnapshot: 12000, actualSpendTotal: 9000,
        returnedAmount: 1000, varianceAmount: 2000,
      })],
    }));
    const banner = screen.getByText("Financial position of these costs").closest("div").parentElement;
    expect(within(banner).getByText("Released").parentElement).toHaveTextContent(/20,000/);
    // Advance spend 9,000 + direct payment 8,000. The release is not the spend.
    expect(within(banner).getByText("Actual spend").parentElement).toHaveTextContent(/17,000/);
    expect(screen.getByText(/neither spent nor returned/)).toHaveTextContent(/2,000/);
  });

  it("restores the unreleased remainder when a release is reversed", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()],
      releases: [rel({ status: "reversed", reversalReason: "Wrong recipient" })],
    }));
    const banner = screen.getByText("Financial position of these costs").closest("div").parentElement;
    expect(within(banner).getByText("Released").parentElement).toHaveTextContent(/KES\s*0/);
    expect(within(banner).getByText("Unreleased").parentElement).toHaveTextContent(/20,000/);
    expect(screen.getAllByText("Approved — not yet funded").length).toBeGreaterThan(0);
  });

  it("filters to what is still unresolved and drills through to the authority", () => {
    const values = withFinance({
      requests: [request()], allocations: [alloc()], releases: [rel()],
    });
    wrap(<AdminSiteCosts />, values, "/admin/site-costs?funding=unresolved");
    expect(screen.getAllByText(/Partly funded · Reconciliation outstanding/).length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "BDFR-2026-0001" }))
      .toHaveAttribute("href", "/admin/fund-requests/r1");
  });

  it("shows the Operations Manager the same position without Principal money actions", () => {
    wrap(<AdminSiteCosts />, contexts({
      role: "manager", claims: [approvedClaim],
      finance: { requests: [request()], allocations: [alloc()], releases: [rel()] },
    }));
    expect(screen.getAllByText(/Reconciliation outstanding/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /record .*release/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revers/i })).not.toBeInTheDocument();
  });
});
