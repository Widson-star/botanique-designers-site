import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import { StaffCompensationContext } from "../context/staffCompensation";
import AdminFinance from "./AdminFinance";

const projects = [{ id: "p1", projectName: "Alego Usonga" }];
const people = [
  { id: "person-1", fullName: "Anita Wekesa", isActive: true },
  { id: "person-2", fullName: "Brian Otieno", isActive: true },
  { id: "person-3", fullName: "Cynthia Mueni", isActive: true },
  { id: "person-4", fullName: "Daniel Kiptoo", isActive: true },
  { id: "person-5", fullName: "Esther Achieng", isActive: true },
];
const claims = [
  {
    id: "c1", projectId: "p1", lifecycle: "approved", approvedTotal: 12000,
    submittedTotal: 12000, recipientLabel: "Turf crew", updatedAt: "2026-08-02T09:00:00Z",
  },
  {
    id: "c2", projectId: "p1", lifecycle: "awaiting_review", approvedTotal: null,
    submittedTotal: 4500, recipientLabel: "Materials", updatedAt: "2026-08-03T09:00:00Z",
  },
];
const requests = [
  {
    id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved",
    totalRequestedAmount: 8000, intendedCustodyType: "operations_manager_accountable_advance",
    updatedAt: "2026-08-04T09:00:00Z",
  },
  {
    id: "r2", requestNumber: "BDFR-2026-0002", projectId: "p1", status: "submitted",
    totalRequestedAmount: 3000, intendedCustodyType: "operations_manager_accountable_advance",
    updatedAt: "2026-08-05T09:00:00Z",
  },
];
const releases = [
  {
    id: "rel1", fundRequestId: "r1", status: "recorded", releasedAmount: 5000,
    custodyDisposition: "operations_manager_accountable_advance",
  },
];

// One Staff Pay record per payment position the database can report, plus a
// pre-approval record whose lifecycle must survive untouched.
const pay = (id, personId, lifecycle, approvedAmount, updatedAt) => ({
  id, personId, projectId: "p1", lifecycle, compensationType: "compensation",
  approvedAmount, submittedAmount: approvedAmount ?? 2500, serviceDate: "2026-08-01",
  requesterId: "manager-1", deciderId: "owner-1", version: 2, updatedAt,
});
const compensations = [
  pay("pay-unpaid", "person-1", "approved", 700, "2026-08-06T09:00:00Z"),
  pay("pay-part", "person-2", "approved", 60000, "2026-08-07T09:00:00Z"),
  pay("pay-paid", "person-3", "approved", 30000, "2026-08-08T09:00:00Z"),
  pay("pay-unknown", "person-4", "approved", 28100, "2026-08-09T09:00:00Z"),
  pay("pay-awaiting", "person-5", "awaiting_review", null, "2026-08-10T09:00:00Z"),
];
const positions = {
  "pay-unpaid": { compensationId: "pay-unpaid", paidAmount: 0, balanceAmount: 700, historicalPaidAmount: 0, paymentStatus: "unpaid" },
  "pay-part": { compensationId: "pay-part", paidAmount: 20000, balanceAmount: 40000, historicalPaidAmount: 0, paymentStatus: "part_paid" },
  "pay-paid": { compensationId: "pay-paid", paidAmount: 30000, balanceAmount: 0, historicalPaidAmount: 0, paymentStatus: "paid" },
  "pay-unknown": { compensationId: "pay-unknown", paidAmount: null, balanceAmount: null, historicalPaidAmount: null, paymentStatus: "payment_history_unknown" },
  // staff_compensation_payment_positions() reports the lifecycle itself for a
  // record that is not approved; the fixture keeps that behaviour honest.
  "pay-awaiting": { compensationId: "pay-awaiting", paidAmount: null, balanceAmount: null, historicalPaidAmount: null, paymentStatus: "awaiting_review" },
};

// Every record whose payment history is known, so Outstanding is computable.
const settledCompensations = compensations.filter((item) => item.id !== "pay-unknown");

function renderFinance({
  role = "owner", costsOverrides = {}, fundsOverrides = {},
  compensations: payRecords = settledCompensations, positions: payPositions = positions,
} = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/finance"]}>
      <AdminDataContext.Provider value={{ role, projects }}>
        <PeopleContext.Provider value={{ people }}>
          <SiteCostsContext.Provider value={{ claims, status: "ready", error: "", ...costsOverrides }}>
            <FundRequestsContext.Provider value={{
              requests, allocations: [], releases, acquittals: [], status: "ready", error: "",
              ...fundsOverrides,
            }}>
              <StaffCompensationContext.Provider value={{
                compensations: payRecords, payments: [], status: "ready", error: "",
                paymentPositionForCompensation: (id) => payPositions[id] || null,
              }}>
                <AdminFinance />
              </StaffCompensationContext.Provider>
            </FundRequestsContext.Provider>
          </SiteCostsContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

const glance = () => screen.getByText("Finance at a glance").closest("section");
const activity = () => screen.getByText("Recent finance activity").closest("section");
const areaCard = (name) => within(screen.getByLabelText("Finance areas")).getByLabelText(name);

describe("Finance landing — committed Finance authority plus Founder amendments", () => {
  it("shows the five settled Finance areas together without a second tab navigation", () => {
    renderFinance();

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    const region = screen.getByLabelText("Finance areas");
    const names = within(region).getAllByRole("article").map((item) => item.getAttribute("aria-label"));
    expect(names).toEqual([
      "Project Financials",
      "Project Costs",
      "Company Expenses",
      "Staff Pay",
      "Advances",
    ]);
  });

  it("links each area to the route owned by the Finance sidebar", () => {
    renderFinance();

    expect(within(areaCard("Project Financials")).getByRole("link")).toHaveAttribute("href", "/admin/finance/project-financials");
    expect(within(areaCard("Project Costs")).getByRole("link")).toHaveAttribute("href", "/admin/site-costs");
    expect(within(areaCard("Company Expenses")).getByRole("link")).toHaveAttribute("href", "/admin/finance/company-expenses");
    expect(within(areaCard("Staff Pay")).getByRole("link")).toHaveAttribute("href", "/admin/finance/staff-compensation");
    expect(within(areaCard("Advances")).getByRole("link")).toHaveAttribute("href", "/admin/fund-requests");
  });

  it("keeps unavailable areas truthful and figure-free", () => {
    renderFinance();

    for (const name of ["Project Financials", "Company Expenses"]) {
      const card = areaCard(name);
      expect(card).toHaveTextContent("Not yet built");
      expect(card.textContent).not.toMatch(/KES/);
    }
    // Staff Pay is built, so it must carry a real figure rather than that label.
    expect(areaCard("Staff Pay")).not.toHaveTextContent("Not yet built");
  });

  it("uses plain Project Costs and Advances summaries", () => {
    const { container } = renderFinance();

    const projectCosts = areaCard("Project Costs");
    expect(projectCosts).toHaveTextContent("Awaiting decision");
    expect(projectCosts).toHaveTextContent("KES 4,500");
    expect(projectCosts).toHaveTextContent("1 cost");

    const advances = areaCard("Advances");
    expect(advances).toHaveTextContent("Issued");
    expect(advances).toHaveTextContent("KES 5,000");
    expect(advances).toHaveTextContent("1 advance");

    expect(container.textContent).not.toMatch(/financial position/i);
    expect(container.textContent).not.toMatch(/funding/i);
    expect(container.textContent).not.toMatch(/reconciliation/i);
  });

  it("shows Finance at a glance from facts the Hub actually holds", () => {
    renderFinance();

    expect(glance()).toHaveTextContent("Project costs awaiting decision");
    expect(glance()).toHaveTextContent("1 · KES 4,500");
    expect(glance()).toHaveTextContent("Approved project costs");
    expect(glance()).toHaveTextContent("1 · KES 12,000");
    expect(glance()).toHaveTextContent("Advance requests awaiting decision");
    expect(glance()).toHaveTextContent("Advances issued");
    expect(glance()).toHaveTextContent("1 · KES 5,000");
  });

  it("keeps recent finance activity as drill-through rather than another workflow", () => {
    // Recent activity keeps only the five newest rows across all of Finance,
    // and every Staff Pay fixture here is newer than the costs and advances.
    // Drop Staff Pay so the cost and advance drill-throughs are on the list.
    renderFinance({ compensations: [] });

    expect(within(activity()).getByRole("link", { name: /BDFR-2026-0002/ }))
      .toHaveAttribute("href", "/admin/fund-requests/r2");
    expect(within(activity()).getByRole("link", { name: /Materials/ }))
      .toHaveAttribute("href", "/admin/site-costs/c2");
    expect(within(activity()).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows Finance unavailable to a role with neither Finance capability", () => {
    renderFinance({ role: "staff" });
    expect(screen.getByRole("heading", { name: "Finance unavailable" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Finance areas")).not.toBeInTheDocument();
  });
});

// Finance is a landing surface, not an approvals queue. It must describe Staff
// Pay the way the Staff Pay register does — by payment position — while
// approval keeps its place in Approvals, event history and decision metadata.
describe("Finance landing speaks the Staff Pay payment-position vocabulary", () => {
  it("calls the Staff Pay obligation Payable, never Approved staff pay", () => {
    renderFinance();
    expect(glance()).toHaveTextContent("Payable staff pay");
    expect(glance()).not.toHaveTextContent("Approved staff pay");
  });

  it("still sums approved amounts underneath the Payable label", () => {
    renderFinance();
    // 700 + 60,000 + 30,000 — the awaiting-review record carries no approved
    // amount and must not reach this total.
    expect(glance()).toHaveTextContent("3 · KES 90,700");
  });

  it("keeps Outstanding on the Staff Pay card when payment history is known", () => {
    renderFinance();
    const card = areaCard("Staff Pay");
    expect(card).toHaveTextContent("Outstanding");
    // 700 + 40,000 + 0.
    expect(card).toHaveTextContent("KES 40,700");
  });

  it("counts the Staff Pay card's records as payable, not approved", () => {
    renderFinance();
    const card = areaCard("Staff Pay");
    expect(card).toHaveTextContent("3 payable records");
    expect(card).not.toHaveTextContent("approved records");
  });

  it("falls back to Payable — not Approved — when a payment history is unknown", () => {
    renderFinance({ compensations });
    const card = areaCard("Staff Pay");
    expect(card).toHaveTextContent("Payable");
    expect(card).not.toHaveTextContent("Approved");
    expect(card).not.toHaveTextContent("Outstanding");
    // 700 + 60,000 + 30,000 + 28,100.
    expect(card).toHaveTextContent("KES 118,800");
    expect(card).toHaveTextContent("1 payment history position to confirm");
  });

  it("invents no Paid or Outstanding figure while a payment history is unknown", () => {
    renderFinance({ compensations });
    expect(glance()).toHaveTextContent("Staff pay paid");
    expect(glance()).toHaveTextContent("Staff pay outstanding");
    expect(glance()).toHaveTextContent("Historical payment positions to confirm");
    // Both figures blank rather than a manufactured zero.
    const rows = [...glance().querySelectorAll("div")].filter((row) => /Staff pay (paid|outstanding)/.test(row.textContent || ""));
    expect(rows.length).toBeGreaterThanOrEqual(2);
    for (const row of rows) expect(row).toHaveTextContent("—");
    expect(areaCard("Staff Pay")).not.toHaveTextContent("KES 0");
  });

  it("describes an unpaid approved record by its payment position", () => {
    renderFinance();
    expect(within(activity()).getByRole("link", { name: /Anita Wekesa/ })).toHaveTextContent("Staff pay · Unpaid");
  });

  it("describes a part-paid record as exactly Partially Paid", () => {
    renderFinance();
    expect(within(activity()).getByRole("link", { name: /Brian Otieno/ })).toHaveTextContent("Staff pay · Partially Paid");
    expect(activity()).not.toHaveTextContent("Part-paid");
    expect(activity()).not.toHaveTextContent("Part paid");
  });

  it("describes a settled record as Paid", () => {
    renderFinance();
    expect(within(activity()).getByRole("link", { name: /Cynthia Mueni/ })).toHaveTextContent("Staff pay · Paid");
  });

  it("describes an imported record as Payment history to confirm", () => {
    renderFinance({ compensations });
    expect(within(activity()).getByRole("link", { name: /Daniel Kiptoo/ })).toHaveTextContent("Staff pay · Payment history to confirm");
  });

  it("leaves a pre-approval record on its lifecycle", () => {
    renderFinance();
    expect(within(activity()).getByRole("link", { name: /Esther Achieng/ })).toHaveTextContent("Staff pay · Awaiting review");
  });

  it("never labels a Staff Pay activity row Approved", () => {
    renderFinance({ compensations });
    const rows = within(activity()).getAllByRole("link").filter((link) => /Staff pay ·/.test(link.textContent));
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row).not.toHaveTextContent("Staff pay · Approved");
  });

  it("keeps approval vocabulary where Project Costs still own it", () => {
    renderFinance({ compensations: [] });
    expect(glance()).toHaveTextContent("Approved project costs");
    expect(glance()).toHaveTextContent("1 · KES 12,000");
    // A Project Cost is still described by its approval; only Staff Pay moved.
    expect(within(activity()).getByRole("link", { name: /Turf crew/ })).toHaveTextContent("Turf crew · Approved");
    expect(within(activity()).getByRole("link", { name: /BDFR-2026-0002/ })).toHaveTextContent("Submitted");
  });

  it("keeps Project Costs and Advances summaries untouched by the Staff Pay wording", () => {
    renderFinance({ compensations });
    expect(areaCard("Project Costs")).toHaveTextContent("Awaiting decision");
    expect(areaCard("Project Costs")).toHaveTextContent("KES 4,500");
    expect(areaCard("Project Costs")).toHaveTextContent("1 cost");
    expect(areaCard("Advances")).toHaveTextContent("Issued");
    expect(areaCard("Advances")).toHaveTextContent("KES 5,000");
    expect(areaCard("Advances")).toHaveTextContent("1 advance");
    expect(glance()).toHaveTextContent("Advance requests awaiting decision");
    expect(glance()).toHaveTextContent("Advances issued");
    expect(glance()).toHaveTextContent("Project costs awaiting decision");
  });

  it("keeps every Staff Pay drill-through pointing at its own record", () => {
    renderFinance({ compensations });
    expect(within(activity()).getByRole("link", { name: /Daniel Kiptoo/ })).toHaveAttribute("href", "/admin/finance/staff-compensation/pay-unknown");
    expect(within(activity()).getByRole("link", { name: /Esther Achieng/ })).toHaveAttribute("href", "/admin/finance/staff-compensation/pay-awaiting");
    expect(within(areaCard("Staff Pay")).getByRole("link")).toHaveAttribute("href", "/admin/finance/staff-compensation");
  });
});
