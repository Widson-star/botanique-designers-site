import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import AdminFinance from "./AdminFinance";

const projects = [{ id: "p1", projectName: "Alego Usonga" }];
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
    totalRequestedAmount: 8000, updatedAt: "2026-08-04T09:00:00Z",
  },
  {
    id: "r2", requestNumber: "BDFR-2026-0002", projectId: "p1", status: "submitted",
    totalRequestedAmount: 3000, updatedAt: "2026-08-05T09:00:00Z",
  },
];
const releases = [
  { id: "rel1", fundRequestId: "r1", status: "recorded", releasedAmount: 5000 },
];

function renderFinance({ role = "owner", costsOverrides = {}, fundsOverrides = {} } = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/finance"]}>
      <AdminDataContext.Provider value={{ role, projects }}>
        <SiteCostsContext.Provider value={{ claims, status: "ready", error: "", ...costsOverrides }}>
          <FundRequestsContext.Provider value={{
            requests, allocations: [], releases, acquittals: [], status: "ready", error: "",
            ...fundsOverrides,
          }}>
            <AdminFinance />
          </FundRequestsContext.Provider>
        </SiteCostsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Finance landing — committed Finance authority plus Founder amendments", () => {
  it("shows the four Finance areas together instead of a second five-tab navigation", () => {
    renderFinance();

    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    const region = screen.getByLabelText("Finance areas");
    const names = within(region).getAllByRole("article").map((item) => item.getAttribute("aria-label"));
    expect(names).toEqual([
      "Project Costs",
      "Company Expenses",
      "Staff Compensation",
      "Funding, Payments & Reconciliation",
    ]);
  });

  it("links each area to the child route owned by the Finance sidebar", () => {
    renderFinance();
    const region = screen.getByLabelText("Finance areas");

    expect(within(within(region).getByLabelText("Project Costs")).getByRole("link"))
      .toHaveAttribute("href", "/admin/site-costs");
    expect(within(within(region).getByLabelText("Company Expenses")).getByRole("link"))
      .toHaveAttribute("href", "/admin/finance/company-expenses");
    expect(within(within(region).getByLabelText("Staff Compensation")).getByRole("link"))
      .toHaveAttribute("href", "/admin/finance/staff-compensation");
    expect(within(within(region).getByLabelText("Funding, Payments & Reconciliation")).getByRole("link"))
      .toHaveAttribute("href", "/admin/fund-requests");
  });

  it("keeps unavailable Company Expenses and Staff Compensation truthful and figure-free", () => {
    renderFinance();
    const region = screen.getByLabelText("Finance areas");

    for (const name of ["Company Expenses", "Staff Compensation"]) {
      const card = within(region).getByLabelText(name);
      expect(card).toHaveTextContent("Not yet built");
      expect(card.textContent).not.toMatch(/KES/);
    }
  });

  it("uses plain useful summaries rather than financial-position language", () => {
    const { container } = renderFinance();
    const region = screen.getByLabelText("Finance areas");

    const projectCosts = within(region).getByLabelText("Project Costs");
    expect(projectCosts).toHaveTextContent("Awaiting decision");
    expect(projectCosts).toHaveTextContent("KES 4,500");
    expect(projectCosts).toHaveTextContent("1 cost");

    const funding = within(region).getByLabelText("Funding, Payments & Reconciliation");
    expect(funding).toHaveTextContent("Payments recorded");
    expect(funding).toHaveTextContent("KES 5,000");

    expect(container.textContent).not.toMatch(/financial position/i);
    expect(container.textContent).not.toMatch(/not yet funded/i);
  });

  it("shows Finance at a glance from facts the Hub actually holds", () => {
    renderFinance();
    const panel = screen.getByText("Finance at a glance").closest("section");

    expect(panel).toHaveTextContent("Project costs awaiting decision");
    expect(panel).toHaveTextContent("1 · KES 4,500");
    expect(panel).toHaveTextContent("Approved project costs");
    expect(panel).toHaveTextContent("1 · KES 12,000");
    expect(panel).toHaveTextContent("Funding requests awaiting decision");
    expect(panel).toHaveTextContent("Payments recorded");
    expect(panel).toHaveTextContent("1 · KES 5,000");
  });

  it("keeps recent finance activity as drill-through rather than another workflow", () => {
    renderFinance();
    const panel = screen.getByText("Recent finance activity").closest("section");

    expect(within(panel).getByRole("link", { name: /BDFR-2026-0002/ }))
      .toHaveAttribute("href", "/admin/fund-requests/r2");
    expect(within(panel).getByRole("link", { name: /Materials/ }))
      .toHaveAttribute("href", "/admin/site-costs/c2");
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows Finance unavailable to a role with neither Finance capability", () => {
    renderFinance({ role: "staff" });
    expect(screen.getByRole("heading", { name: "Finance unavailable" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Finance areas")).not.toBeInTheDocument();
  });
});
