import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import AdminFinance from "./AdminFinance";

const claims = [
  { id: "c1", lifecycle: "approved", approvedTotal: 12000, submittedTotal: 12000 },
  { id: "c2", lifecycle: "awaiting_review", approvedTotal: null, submittedTotal: 4500 },
];

const requests = [
  { id: "r1", status: "approved", totalRequestedAmount: 8000 },
  { id: "r2", status: "submitted", totalRequestedAmount: 3000 },
];

function renderFinance({ role = "owner", costsOverrides = {}, fundsOverrides = {} } = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/finance"]}>
      <AdminDataContext.Provider value={{ role }}>
        <SiteCostsContext.Provider value={{ claims, status: "ready", error: "", ...costsOverrides }}>
          <FundRequestsContext.Provider value={{ requests, status: "ready", error: "", ...fundsOverrides }}>
            <AdminFinance />
          </FundRequestsContext.Provider>
        </SiteCostsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Finance landing", () => {
  it("renders the approved area order with Company Expenses and Staff Compensation absent", () => {
    renderFinance();
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    // Desktop and mobile selectors both render; check the first (desktop) set.
    expect(tabs.slice(0, 3)).toEqual(["Overview", "Project Costs", "Funding, Payments and Reconciliation"]);
    expect(screen.queryByText("Company Expenses")).not.toBeInTheDocument();
    expect(screen.queryByText("Staff Compensation")).not.toBeInTheDocument();
  });

  it("defaults to Overview with a truthful, computed position for each real area", () => {
    renderFinance();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    // Project Costs: one approved claim at 12,000.
    expect(screen.getByText("KES 12,000")).toBeInTheDocument();
    expect(screen.getByText(/1 awaiting review/)).toBeInTheDocument();
    // Funding: one approved-not-released request at 8,000.
    expect(screen.getByText("KES 8,000")).toBeInTheDocument();
    expect(screen.getByText(/1 submitted/)).toBeInTheDocument();
  });

  it("never invents a balance, paid total or reconciliation total", () => {
    renderFinance();
    // "Reconciliation" legitimately appears as the area's own name (desktop
    // tab + mobile chip); what must never appear is an actual figure claiming
    // to be a reconciled or paid total.
    expect(screen.queryByText(/reconciled total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/paid total/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/balance/i)).not.toBeInTheDocument();
  });

  it("switches to Project Costs and drills through to the existing Site Costs register", async () => {
    const user = userEvent.setup();
    renderFinance();
    await user.click(screen.getAllByRole("tab", { name: "Project Costs" })[0]);
    expect(screen.getByRole("heading", { name: "Project Costs" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View all Project Costs/ })).toHaveAttribute(
      "href",
      "/admin/site-costs"
    );
  });

  it("switches to Funding, Payments and Reconciliation, stays honest about no release, and drills through", async () => {
    const user = userEvent.setup();
    renderFinance();
    await user.click(
      screen.getAllByRole("tab", { name: "Funding, Payments and Reconciliation" })[0]
    );
    expect(
      screen.getByRole("heading", { name: "Funding, Payments and Reconciliation" })
    ).toBeInTheDocument();
    expect(screen.getByText(/No funds have been released/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /View all Fund Requests/ })).toHaveAttribute(
      "href",
      "/admin/fund-requests"
    );
  });

  it("uses the wrapped mobile chip selector, never a horizontally-scrolling row", () => {
    const { container } = renderFinance();
    const mobileGroup = within(container).getAllByRole("tablist", { name: "Finance area" })[1];
    expect(mobileGroup.className).toMatch(/flex-wrap/);
    expect(mobileGroup.className).not.toMatch(/overflow-x/);
  });

  it("hides the whole page for a role with neither capability", () => {
    renderFinance({ role: "staff" });
    expect(screen.getByRole("heading", { name: "Finance unavailable" })).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});
