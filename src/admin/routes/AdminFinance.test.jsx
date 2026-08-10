import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import AdminFinance from "./AdminFinance";

const ADVANCE = "operations_manager_accountable_advance";
const DIRECT = "direct_recipient_funding";

const projects = [{ id: "p1", projectName: "Alego Usonga" }];

const claims = [
  { id: "c1", projectId: "p1", lifecycle: "approved", approvedTotal: 12000, submittedTotal: 12000, recipientLabel: "Turf crew", updatedAt: "2026-08-02T09:00:00Z" },
  { id: "c2", projectId: "p1", lifecycle: "awaiting_review", approvedTotal: null, submittedTotal: 4500, recipientLabel: "Materials", updatedAt: "2026-08-03T09:00:00Z" },
];

const requests = [
  { id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved", intendedCustodyType: ADVANCE, totalRequestedAmount: 8000, updatedAt: "2026-08-04T09:00:00Z" },
  { id: "r2", requestNumber: "BDFR-2026-0002", projectId: "p1", status: "submitted", intendedCustodyType: ADVANCE, totalRequestedAmount: 3000, updatedAt: "2026-08-05T09:00:00Z" },
];

function renderFinance({ role = "owner", costsOverrides = {}, fundsOverrides = {} } = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/finance"]}>
      <AdminDataContext.Provider value={{ role, projects }}>
        <SiteCostsContext.Provider value={{ claims, status: "ready", error: "", ...costsOverrides }}>
          <FundRequestsContext.Provider value={{
            requests, allocations: [], releases: [], acquittals: [], status: "ready", error: "",
            ...fundsOverrides,
          }}>
            <AdminFinance />
          </FundRequestsContext.Provider>
        </SiteCostsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

const release = (overrides = {}) => ({
  id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
  releasedAmount: 5000, version: 1, ...overrides,
});

describe("Finance department shell (image 12)", () => {
  // Image 12's tab row has FIVE tabs. Company Expenses and Staff Compensation
  // are part of the department, so they render; what they must never do is
  // carry invented data.
  it("renders all five departmental tabs, in the authority's order", () => {
    renderFinance();
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs.slice(0, 5)).toEqual([
      "Overview",
      "Project Costs",
      "Company Expenses",
      "Staff Compensation",
      "Funding, Payments & Reconciliation",
    ]);
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

describe("Finance Overview — image 12 composition", () => {
  it("leads with the capability card row, each card carrying its own figure", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    // Project Costs card: one claim awaiting a decision at 4,500.
    const cards = screen.getByRole("region", { name: "Finance capabilities" });
    const costs = within(cards).getByLabelText("Project Costs");
    expect(costs).toHaveTextContent("Awaiting decision");
    expect(costs).toHaveTextContent("KES 4,500");
    expect(within(costs).getByRole("button", { name: /View project costs/ })).toBeInTheDocument();
  });

  it("gives the funding card its reconciliation position, as the authority labels it", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    const cards = screen.getByRole("region", { name: "Finance capabilities" });
    const funding = within(cards).getByLabelText("Funding, Payments & Reconciliation");
    expect(funding).toHaveTextContent("Reconciliation position");
    expect(funding).toHaveTextContent("KES 5,000");
  });

  it("shows Finance at a glance from money this product actually holds", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    const glance = screen.getByText("Finance at a glance").closest("section");
    expect(within(glance).getByText("Authorised").parentElement).toHaveTextContent("KES 8,000");
    expect(within(glance).getByText("Released").parentElement).toHaveTextContent("KES 5,000");
    // A release is not expenditure: an unaccounted advance counts as zero spend.
    expect(within(glance).getByText("Actual spend").parentElement).toHaveTextContent("KES 0");
    expect(within(glance).getByText("Not released").parentElement).toHaveTextContent("KES 3,000");
  });

  it("invents no money-in, net position, bank balance or expense categories", () => {
    const { container } = renderFinance();
    expect(container.textContent).not.toMatch(/bank balance/i);
    expect(container.textContent).not.toMatch(/total money in/i);
    expect(container.textContent).not.toMatch(/net position/i);
    expect(container.textContent).not.toMatch(/top expense categories/i);
    expect(container.textContent).not.toMatch(/payroll/i);
  });

  it("fills recent finance activity from real claims and requests only", () => {
    renderFinance();
    const feed = screen.getByText("Recent finance activity").closest("section");
    expect(within(feed).getByRole("link", { name: /BDFR-2026-0002/ }))
      .toHaveAttribute("href", "/admin/fund-requests/r2");
    expect(within(feed).getAllByRole("link").length).toBeGreaterThan(1);
  });

  it("names what is awaiting a decision and decides nothing itself", () => {
    const { container } = renderFinance();
    const panel = screen.getByText("Awaiting a decision").closest("section");
    expect(within(panel).getByRole("link", { name: /Cost claims awaiting your decision/ }))
      .toHaveAttribute("href", "/admin/site-costs?status=awaiting_review");
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bApprove\b|\bReject\b|\bDecide\b/);
  });

  it("speaks to the Operations Manager without offering them a Principal decision", () => {
    renderFinance({ role: "manager" });
    const panel = screen.getByText("Awaiting a decision").closest("section");
    expect(within(panel).getByText(/Cost claims awaiting the Principal/)).toBeInTheDocument();
    expect(within(panel).queryByText(/awaiting your decision/)).not.toBeInTheDocument();
  });
});

describe("Finance — Company Expenses and Staff Compensation (image 13 place, no data)", () => {
  it("keeps their place in the department and states the truth, with no figures", async () => {
    const user = userEvent.setup();
    renderFinance();
    await user.click(screen.getAllByRole("tab", { name: "Company Expenses" })[0]);
    const panel = screen.getByRole("region", { name: "Company Expenses" });
    expect(panel).toHaveTextContent(/not built yet/);
    expect(panel).toHaveTextContent(/No records, workflow or figures exist/);
    expect(panel.textContent).not.toMatch(/KES/);
  });

  it("does the same for Staff Compensation", async () => {
    const user = userEvent.setup();
    renderFinance();
    await user.click(screen.getAllByRole("tab", { name: "Staff Compensation" })[0]);
    const panel = screen.getByRole("region", { name: "Staff Compensation" });
    expect(panel).toHaveTextContent(/not built yet/);
    expect(panel.textContent).not.toMatch(/KES/);
  });
});

describe("Finance → Project Costs (image 13, panel 1)", () => {
  async function open() {
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("tab", { name: "Project Costs" })[0]);
  }

  it("renders the authority's four metric tiles", async () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await open();
    const panel = screen.getByRole("region", { name: "Project Costs" });
    // "Awaiting review" and "Approved" also appear as lifecycle chips in the
    // claim list below, so the tile is the first occurrence.
    const tile = (label) => within(panel).getAllByText(label)[0].closest("div").parentElement;
    expect(tile("Total project costs")).toHaveTextContent("KES 16,500");
    expect(tile("Awaiting review")).toHaveTextContent("KES 4,500");
    expect(tile("Approved")).toHaveTextContent("KES 12,000");
    expect(tile("Released")).toHaveTextContent("KES 5,000");
  });

  it("lists recent cost claims with drill-through, and no unbounded ledger", async () => {
    renderFinance();
    await open();
    const list = screen.getByText("Recent cost claims").closest("div").parentElement;
    expect(within(list).getAllByRole("link", { name: /Alego Usonga/ })[0])
      .toHaveAttribute("href", "/admin/site-costs/c2");
  });

  it("states the empty case without inventing a figure", async () => {
    renderFinance({ costsOverrides: { claims: [] } });
    await open();
    expect(screen.getByText(/No project cost has been claimed yet/)).toBeInTheDocument();
  });
});

describe("Finance → Funding, Payments & Reconciliation (image 13, panel 4)", () => {
  async function open() {
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("tab", { name: "Funding, Payments & Reconciliation" })[0]);
  }

  // The image separates the three concerns as FOUR TILES in lifecycle order and
  // as SEPARATE Status / Paid / Reconciled columns. No new destinations.
  it("renders the four lifecycle tiles in the authority's order", async () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await open();
    const panel = screen.getByRole("region", { name: "Funding, Payments & Reconciliation" });
    const tile = (label) => within(panel).getAllByText(label)[0].closest("div").parentElement;
    ["Submitted", "Approved", "Paid", "Reconciliation"].forEach((label) => {
      expect(within(panel).getAllByText(label).length).toBeGreaterThan(0);
    });
    expect(tile("Approved")).toHaveTextContent("KES 8,000");
    expect(tile("Paid")).toHaveTextContent("KES 5,000");
  });

  it("carries Status, Paid and Reconciled as separate columns", async () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await open();
    const headers = [...document.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    expect(headers).toEqual([
      "Request", "Project / Purpose", "Amount (KES)", "Status", "Paid", "Reconciled",
    ]);
  });

  // Approval is not payment, and the columns must never conflate them.
  it("shows an approved authority with a partial release as approved but part paid", async () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await open();
    const row = screen.getByRole("link", { name: "BDFR-2026-0001" }).closest("tr");
    expect(within(row).getByText("Approved — not released")).toBeInTheDocument();
    expect(within(row).getByText("Part paid")).toBeInTheDocument();
    expect(within(row).getByText("No")).toBeInTheDocument();
  });

  it("never asks a direct settled payment to be reconciled", async () => {
    renderFinance({
      fundsOverrides: { releases: [release({ custodyDisposition: DIRECT, releasedAmount: 8000 })] },
    });
    await open();
    const row = screen.getByRole("link", { name: "BDFR-2026-0001" }).closest("tr");
    expect(within(row).getByText("Paid")).toBeInTheDocument();
    expect(within(row).getByText("Not required")).toBeInTheDocument();
    // And no reconciliation progress bar is drawn for money nobody must account for.
    expect(screen.queryByText("Reconciliation progress")).not.toBeInTheDocument();
  });

  it("shows reconciliation progress only over advances that need accounting for", async () => {
    renderFinance({
      fundsOverrides: {
        releases: [release()],
        acquittals: [{
          id: "acq1", fundReleaseId: "rel1", state: "accepted", releasedAmountSnapshot: 5000,
          actualSpendTotal: 5000, returnedAmount: 0, varianceAmount: 0, version: 1,
        }],
      },
    });
    await open();
    expect(screen.getByText("Reconciliation progress")).toBeInTheDocument();
    expect(screen.getByText(/1 of 1 accountable advance has been accounted for/)).toBeInTheDocument();
  });

  it("states the empty case without implying approval is payment", async () => {
    renderFinance({ fundsOverrides: { requests: [] } });
    await open();
    expect(screen.getByText(/approval is not payment/)).toBeInTheDocument();
  });
});
