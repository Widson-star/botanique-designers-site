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

describe("Finance department shell", () => {
  it("offers only the areas a real model stands behind", () => {
    renderFinance();
    const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
    expect(tabs.slice(0, 3)).toEqual([
      "Overview", "Project Costs", "Funding, Payments and Reconciliation",
    ]);
    // The unbuilt two are never selectable, because selecting them leads nowhere.
    expect(screen.queryByRole("tab", { name: "Company Expenses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Staff Compensation" })).not.toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// Overview — authority image 12.
// ---------------------------------------------------------------------------

describe("Finance Overview — portfolio position", () => {
  it("leads with authorised, released, actual expenditure and unreleased", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    const panel = screen.getByText("Money position").closest("section");
    expect(within(panel).getByText("Authorised").parentElement).toHaveTextContent("KES 8,000");
    expect(within(panel).getByText("Released").parentElement).toHaveTextContent("KES 5,000");
    // A release is not expenditure: an unaccounted advance counts as zero spend.
    expect(within(panel).getByText("Actual spend").parentElement).toHaveTextContent("KES 0");
    expect(within(panel).getByText("Not released").parentElement).toHaveTextContent("KES 3,000");
  });

  it("names the advance that has not been accounted for rather than counting it as spend", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    expect(screen.getByText(/KES 5,000 of accountable advances has not been accounted for/))
      .toBeInTheDocument();
  });

  it("counts a direct settled payment as expenditure with no acquittal anywhere", () => {
    renderFinance({
      fundsOverrides: { releases: [release({ custodyDisposition: DIRECT, releasedAmount: 8000 })] },
    });
    const panel = screen.getByText("Money position").closest("section");
    expect(within(panel).getByText("Actual spend").parentElement).toHaveTextContent("KES 8,000");
    expect(screen.queryByText(/has not been accounted for/)).not.toBeInTheDocument();
  });

  // The Overview must never disagree with the register a reader drills into.
  it("derives its money from the same rows Project Costs reads", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    const overview = screen.getByText("Money position").closest("section");
    const released = within(overview).getByText("Released").parentElement.textContent;
    expect(released).toContain("KES 5,000");
  });

  it("gives a compact, useful empty state rather than a canvas of zeroes", () => {
    renderFinance({ costsOverrides: { claims: [] }, fundsOverrides: { requests: [] } });
    // Absence is ONE LINE inside the panel, never a full-width panel of prose.
    expect(screen.getByText(/No fund authority is approved/)).toBeInTheDocument();
    // No metric tiles are drawn at full weight for a position that does not exist.
    expect(screen.queryByText("Authorised")).not.toBeInTheDocument();
  });
});

describe("Finance Overview — attention", () => {
  it("names what is waiting, with counts and amounts, and links to the register that owns it", () => {
    renderFinance();
    const panel = screen.getByText("Needs attention").closest("section");
    const claimItem = within(panel).getByRole("link", { name: /Cost claims awaiting your decision/ });
    expect(claimItem).toHaveAttribute("href", "/admin/site-costs?status=awaiting_review");
    expect(claimItem).toHaveTextContent("KES 4,500");
    expect(within(panel).getByRole("link", { name: /Fund requests awaiting your decision/ }))
      .toHaveAttribute("href", "/admin/fund-requests?status=submitted");
    // Approval is not release, and it gets its own line.
    expect(within(panel).getByRole("link", { name: /Approved — nothing released yet/ }))
      .toBeInTheDocument();
  });

  it("speaks to the Operations Manager without offering them a Principal decision", () => {
    renderFinance({ role: "manager" });
    const panel = screen.getByText("Needs attention").closest("section");
    expect(within(panel).getByText(/Cost claims awaiting the Principal/)).toBeInTheDocument();
    expect(within(panel).queryByText(/awaiting your decision/)).not.toBeInTheDocument();
    // And Finance never grows a decision control of its own.
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
  });

  it("surfaces an outstanding accountable advance as attention", () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    const panel = screen.getByText("Needs attention").closest("section");
    expect(within(panel).getByRole("link", { name: /Accountable advances not yet accounted for/ }))
      .toHaveTextContent("KES 5,000");
  });

  it("says plainly when nothing financial is waiting on anyone", () => {
    renderFinance({
      costsOverrides: { claims: [claims[0]] },
      fundsOverrides: {
        requests: [requests[0]],
        releases: [release({ custodyDisposition: DIRECT, releasedAmount: 8000 })],
      },
    });
    expect(screen.getByText(/Every claim has been decided, every approved authority released/)).toBeInTheDocument();
  });

  it("is not a second Approvals centre: it decides nothing and only links out", () => {
    const { container } = renderFinance();
    const panel = screen.getByText("Needs attention").closest("section");
    expect(within(panel).queryByRole("button")).not.toBeInTheDocument();
    expect(container.textContent).not.toMatch(/\bApprove\b|\bReject\b|\bDecide\b/);
  });
});

describe("Finance Overview — Company Expenses and Staff Compensation", () => {
  // They appear in the department row, at the weight of a capability that does
  // not exist: muted, no figure, and not a route.
  it("names both in the department row and gives neither a figure or a route", () => {
    renderFinance();
    const expenses = screen.getByText("Company Expenses").closest("div");
    const staff = screen.getByText("Staff Compensation").closest("div");
    [expenses, staff].forEach((card) => {
      const holder = card.closest("[class*='border-dashed']");
      expect(holder).toBeTruthy();
      expect(holder.textContent).toMatch(/Not yet built/);
      expect(holder.textContent).not.toMatch(/KES/);
      expect(holder.tagName).not.toBe("BUTTON");
    });
    // And neither is selectable, because selecting them leads nowhere.
    expect(screen.queryByRole("tab", { name: "Company Expenses" })).not.toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Staff Compensation" })).not.toBeInTheDocument();
  });

  it("invents no money-in, bank balance or expense-category figure", () => {
    const { container } = renderFinance();
    // The authority image shows all three. Botanique has no record of any of
    // them, so a plausible number would be a fabrication.
    expect(container.textContent).not.toMatch(/bank balance/i);
    expect(container.textContent).not.toMatch(/total money in/i);
    expect(container.textContent).not.toMatch(/top expense categories/i);
    expect(container.textContent).not.toMatch(/payroll/i);
  });
});

// ---------------------------------------------------------------------------
// Finance children — authority image 13.
// ---------------------------------------------------------------------------

describe("Finance → Project Costs", () => {
  it("answers what is approved, what is waiting, and what actually moved", async () => {
    const user = userEvent.setup();
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await user.click(screen.getAllByRole("tab", { name: "Project Costs" })[0]);
    // Decision leads, at its own weight; the supporting figures sit beside it.
    const decision = screen.getByText("Awaiting a decision").closest("div").parentElement.parentElement;
    expect(decision).toHaveTextContent("1");
    expect(decision).toHaveTextContent("KES 4,500");
    expect(screen.getByText("Approved").parentElement).toHaveTextContent("KES 12,000");
    expect(screen.getByText("Released").parentElement).toHaveTextContent("KES 5,000");
    expect(screen.getByText("Not released").parentElement).toHaveTextContent("KES 3,000");
  });

  it("drills through to an individual claim rather than restating the ledger", async () => {
    const user = userEvent.setup();
    renderFinance();
    await user.click(screen.getAllByRole("tab", { name: "Project Costs" })[0]);
    // Two BOUNDED lists, never an unbounded accounting dump, and no table.
    const needs = screen.getByText("Needs a decision").closest("section");
    expect(within(needs).getAllByRole("link", { name: /Alego Usonga/ })[0])
      .toHaveAttribute("href", "/admin/site-costs/c2");
    const decided = screen.getByText("Recently decided").closest("section");
    expect(within(decided).getAllByRole("link", { name: /Alego Usonga/ })[0])
      .toHaveAttribute("href", "/admin/site-costs/c1");
    expect(document.querySelector("main table")).toBeNull();
  });

  it("gives a compact empty state that says what raises a claim", async () => {
    const user = userEvent.setup();
    renderFinance({ costsOverrides: { claims: [] } });
    await user.click(screen.getAllByRole("tab", { name: "Project Costs" })[0]);
    expect(screen.getByText(/No project cost has been claimed yet/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Project Costs/ }))
      .toHaveAttribute("href", "/admin/site-costs");
  });
});

describe("Finance → Funding, Payments and Reconciliation", () => {
  async function openFunding() {
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("tab", { name: "Funding, Payments and Reconciliation" })[0]);
  }

  it("uses the canonical name and never regresses to Fund Requests as the architecture", async () => {
    renderFinance();
    await openFunding();
    expect(screen.getAllByText("Funding, Payments and Reconciliation").length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: "Fund Requests" })).not.toBeInTheDocument();
  });

  it("states the lifecycle in order without implying approval is release", async () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await openFunding();
    // The lifecycle is one ordered strip, so approval can never read as payment.
    const strip = screen.getByText("Awaiting decision").closest("ol");
    const stages = [...strip.children].map((li) => li.textContent);
    expect(stages[0]).toMatch(/Awaiting decision/);
    expect(stages[1]).toMatch(/Authorised.*KES 8,000/);
    expect(stages[2]).toMatch(/Released.*KES 5,000/);
    expect(stages[3]).toMatch(/Advance outstanding.*KES 5,000/);
    expect(stages[4]).toMatch(/Settled/);
  });

  it("shows a partly released authority as partly released, not as paid", async () => {
    renderFinance({ fundsOverrides: { releases: [release()] } });
    await openFunding();
    expect(screen.getByText(/KES 5,000 released/)).toBeInTheDocument();
  });

  it("keeps both custody types visible on a mixed authority", async () => {
    renderFinance({
      fundsOverrides: {
        releases: [
          release({ id: "rel1", releasedAmount: 5000 }),
          release({ id: "rel2", custodyDisposition: DIRECT, releasedAmount: 3000 }),
        ],
      },
    });
    await openFunding();
    // One authority, two custody outcomes. Flattening it to one would either
    // manufacture or erase a reconciliation obligation.
    expect(screen.getByText(/Accountable advance KES 5,000/)).toBeInTheDocument();
    expect(screen.getByText(/Direct settled payment KES 3,000/)).toBeInTheDocument();
  });

  it("never shows an acquittal against a direct settled payment", async () => {
    renderFinance({
      fundsOverrides: {
        releases: [release({ custodyDisposition: DIRECT, releasedAmount: 8000 })],
      },
    });
    await openFunding();
    expect(screen.getByText(/Direct settled payment KES 8,000/)).toBeInTheDocument();
    const strip = screen.getByText("Awaiting decision").closest("ol");
    expect([...strip.children][3].textContent).toMatch(/Advance outstanding.*KES 0/);
  });

  it("gives a compact empty state that distinguishes authority from payment", async () => {
    renderFinance({ fundsOverrides: { requests: [] } });
    await openFunding();
    // Absence is one line with an action, not a large card in a blank canvas.
    expect(screen.getByText(/approval is not payment/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open/ }))
      .toHaveAttribute("href", "/admin/fund-requests");
  });
});
