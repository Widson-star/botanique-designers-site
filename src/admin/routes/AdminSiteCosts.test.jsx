import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import { costReference } from "../utils/costReference";
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

// FOUNDER RULING, 11 Aug 2026. A Project Cost payment is money actually paid
// against that one approved Project Cost. It never requires a Fund Request or an
// Advance, and payment truth is never reconstructed from requests, allocations,
// fund releases or acquittals. A cost the Hub holds no complete payment history
// for reads as unknown — never as KES 0 paid.
//
// paymentPositionForClaim returns null for a cost whose history is unknown, and
// { historyComplete: true, paidAmount, balanceAmount } once the Hub knows it all.
function positionFor(claimId, { paid, total, count = paid > 0 ? 1 : 0 } = {}) {
  return {
    claimId, historyComplete: true, paymentCount: count,
    paidAmount: paid, balanceAmount: Math.max(total - paid, 0),
  };
}

function contexts({
  role = "owner", claims = [claim], decideClaim = vi.fn(), dailyEntries = [],
  finance = {}, positions = [], payments = [],
} = {}) {
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles },
    daily: { entries: dailyEntries },
    costs: {
      claims, lines, eventsByClaim: { c1: events }, authorisedProjects: projects, status: "ready", error: "",
      payments, paymentPositions: positions,
      linesForClaim: (id) => lines.filter((line) => line.claimId === id), loadEvents: vi.fn(() => Promise.resolve(events)),
      paymentsForClaim: (id) => payments.filter((payment) => payment.claimId === id),
      paymentPositionForClaim: (id) => positions.find((position) => position.claimId === id) || null,
      refresh: vi.fn(() => Promise.resolve({ ok: true })), createDraft: vi.fn(), authoriseDirect: vi.fn(),
      updateClaim: vi.fn(), submitClaim: vi.fn(), withdrawClaim: vi.fn(), decideClaim, cancelClaim: vi.fn(),
      recordPayment: vi.fn(() => Promise.resolve({ ok: true })),
      completePaymentHistory: vi.fn(() => Promise.resolve({ ok: true })),
      reversePayment: vi.fn(() => Promise.resolve({ ok: true })),
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

  it("shows whole-cost Principal decisions, history and stale recovery", async () => {
    const decideClaim = vi.fn(() => Promise.resolve({ ok: false, stale: true, error: "stale" }));
    const values = contexts({ decideClaim });
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>, values, "/admin/site-costs/c1");
    expect(screen.getByRole("button", { name: "Approve Project Cost" })).toBeInTheDocument();
    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
    expect(screen.getByText("Approval does not mean paid. Payment is recorded separately against the Project Cost.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve Project Cost" }));
    await waitFor(() => expect(screen.getByText(/changed elsewhere/)).toBeInTheDocument());
  });

  // The recipient/crew field carries raw site arithmetic. It is context, not the
  // identity of a Project Cost.
  it("titles a Project Cost by its purpose, not by raw recipient arithmetic", () => {
    const messy = {
      ...claim, id: "9206ae9b-0d65-4f30-bd2f-8528548f9796",
      purpose: "Cabro arrangement\nLandscape prep",
      recipientLabel: "(Mason 1200 and 2 casuals @500} Ksh 2200, Waweru {1000}",
    };
    const values = contexts({ claims: [messy] });
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>, values, `/admin/site-costs/${messy.id}`);
    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveTextContent("Cabro arrangement — Landscape prep");
    expect(heading).not.toHaveTextContent(/Ksh 2200/);
    // Compact context, and no request-round machinery in the headline.
    expect(document.body.textContent).toMatch(/Alego Usonga · ICC-[0-9A-Z]+ · Awaiting review/);
    expect(document.body.textContent).not.toMatch(/request round/i);
  });

  it("uses plain section names and keeps the history reachable", () => {
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>, contexts(), "/admin/site-costs/c1");
    expect(screen.getByRole("heading", { name: "Project Cost summary" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Cost breakdown" })).toBeInTheDocument();
    // History is labelled "History" and stays reachable. PR #103 makes it a
    // collapsible section rather than a heading, which keeps it subordinate to
    // the money — the rename and the reachability are what matter.
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.queryByText("Claim summary")).not.toBeInTheDocument();
    expect(screen.queryByText("Immutable history")).not.toBeInTheDocument();
    expect(screen.queryByText("Structured cost lines")).not.toBeInTheDocument();
    // The audit trail itself is untouched.
    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
  });

  // Post-live: the register's secondary line says what the cost was FOR. The
  // recipient/crew field is raw site arithmetic and stays on the detail page.
  it("describes a register row by its purpose, not by recipient arithmetic", () => {
    const messy = {
      ...claim, id: "9206ae9b-0d65-4f30-bd2f-8528548f9796",
      purpose: "Cabro arrangement\nLandscape prep",
      recipientLabel: "(Mason 1200 and 2 casuals @500} Ksh 2200, Waweru {1000} and 3 casuals @ 500 Ksh 2500",
    };
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [messy] }));
    // Desktop table and mobile card both read the same way. The mobile card
    // prefixes the service date in the same line, so match on the description.
    expect(screen.getAllByText(/Cabro arrangement — Landscape prep/).length).toBeGreaterThan(1);
    expect(container.textContent).not.toMatch(/Ksh 2200/);
    expect(container.textContent).not.toMatch(/Waweru/);
  });

  it("falls back to a compact recipient when a cost has no purpose", () => {
    const noPurpose = {
      ...claim, id: "9206ae9b-0d65-4f30-bd2f-8528548f9796",
      purpose: "", recipientLabel: "3 (Casuals)",
    };
    wrap(<AdminSiteCosts />, contexts({ claims: [noPurpose] }));
    expect(screen.getAllByText(/3 \(Casuals\)/).length).toBeGreaterThan(1);
  });

  // The amount label must never claim a decision that has not happened.
  it.each([
    ["draft", "Current amount"],
    ["awaiting_review", "Submitted amount"],
    ["approved", "Approved amount"],
  ])("labels a %s cost's amount as %s", (lifecycle, label) => {
    const staged = {
      ...claim, id: "9206ae9b-0d65-4f30-bd2f-8528548f9796", lifecycle,
      submittedTotal: lifecycle === "draft" ? null : 3350,
      approvedTotal: lifecycle === "approved" ? 3350 : null,
    };
    const values = contexts({ claims: [staged] });
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>, values, `/admin/site-costs/${staged.id}`);
    expect(screen.getByText(label)).toBeInTheDocument();
    if (lifecycle !== "approved") {
      expect(screen.queryByText("Approved amount")).not.toBeInTheDocument();
    }
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

  // The duplicate warning belongs HERE — where an overlapping claim would
  // actually be created — not on every view of a record that legitimately
  // already has a claim.
  it("warns on the claim form when the drafted cost repeats an existing live claim", () => {
    const dailyEntry = { id: "d1", projectId: "p1", workDate: "2026-07-31", disposition: "working", state: "accepted", version: 2, expectedWorkerCount: 6, crewReference: "Alego turf crew", ratePerWorker: 500, agreedLabourTotal: null, plannedLabourCost: 3000, workPlanned: "Lay turf" };
    const existing = {
      ...claim, id: "cx", dailySiteEntryId: "d1", category: "labour", lifecycle: "approved",
      approvedTotal: 3000, submittedTotal: 3000, recipientLabel: "Alego turf crew",
    };
    const values = contexts({ role: "manager", claims: [existing], dailyEntries: [dailyEntry] });
    values.costs.linesForClaim = (id) => (id === "cx"
      ? [{ id: "lx", claimId: "cx", lineNumber: 1, description: "Planned site labour", rateType: "daily", quantity: 6, unit: "worker", unitRate: 500, lineTotal: 3000 }]
      : []);
    wrap(<Routes><Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} /></Routes>, values, "/admin/site-costs/new?dailySiteEntryId=d1");
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/already been claimed/i);
    expect(within(alert).getByRole("link", { name: "Alego turf crew" }))
      .toHaveAttribute("href", "/admin/site-costs/cx");
    // Nothing is blocked: the person can still submit, deliberately.
    expect(screen.getByRole("button", { name: "Save and submit" })).toBeEnabled();
  });

  it("stays silent on the claim form when the drafted cost is genuinely new", () => {
    const dailyEntry = { id: "d1", projectId: "p1", workDate: "2026-07-31", disposition: "working", state: "accepted", version: 2, expectedWorkerCount: 6, crewReference: "Alego turf crew", ratePerWorker: 500, agreedLabourTotal: null, plannedLabourCost: 3000, workPlanned: "Lay turf" };
    const existing = {
      ...claim, id: "cx", dailySiteEntryId: "d1", category: "labour", lifecycle: "approved",
      approvedTotal: 3000, submittedTotal: 3000,
    };
    const values = contexts({ role: "manager", claims: [existing], dailyEntries: [dailyEntry] });
    // The existing claim holds a different line, so nothing overlaps.
    values.costs.linesForClaim = (id) => (id === "cx"
      ? [{ id: "lx", claimId: "cx", lineNumber: 1, description: "Mkokoteni cartage", rateType: "lump_sum", quantity: 1, unit: "item", unitRate: 800, lineTotal: 800 }]
      : []);
    wrap(<Routes><Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} /></Routes>, values, "/admin/site-costs/new?dailySiteEntryId=d1");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

// ---------------------------------------------------------------------------
// FOUNDER AMENDMENT — the Project Costs register.
//
// Date · Cost Ref. · Project · Status · Total · Balance · Paid · Action.
// Funding mechanics are no longer the primary state of a cost, and where the
// Hub holds no payment record, Paid and Balance are unknown — never zero.
// ---------------------------------------------------------------------------

// A draft has no submittedTotal yet but already owns cost lines. Showing KES 0
// for a draft holding KES 5,350 is simply untrue.
describe("Project Costs register — draft totals", () => {
  const draft = {
    ...claim, id: "d1a2b3c4-0000-0000-0000-000000000001", lifecycle: "draft",
    submittedTotal: null, approvedTotal: null, purpose: "Cabro arrangement",
  };
  const draftLines = [
    { id: "dl1", claimId: draft.id, lineNumber: 1, description: "Mason", rateType: "fixed", quantity: 1, unit: "job", unitRate: 5000, lineTotal: 5000 },
    { id: "dl2", claimId: draft.id, lineNumber: 2, description: "Cartage", rateType: "fixed", quantity: 1, unit: "trip", unitRate: 350, lineTotal: 350 },
  ];

  function registerWithDraft() {
    const values = contexts({ claims: [draft] });
    values.costs.linesForClaim = (id) => (id === draft.id ? draftLines : []);
    return wrap(<AdminSiteCosts />, values);
  }

  it("shows the draft's structured line total, not KES 0", () => {
    registerWithDraft();
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    expect(cells[4]).toMatch(/5,350/);
    expect(cells[4]).not.toMatch(/KES\s*0\.00/);
  });

  it("does not turn a draft total into Paid or Balance", () => {
    registerWithDraft();
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    // Draft is not payable. Payment truth stays unknown.
    expect(cells[5]).toBe("—");
    expect(cells[6]).toBe("—");
  });
});

describe("Project Costs register (Founder amendment)", () => {
  const approvedClaim = {
    ...claim, id: "11111111-2222-3333-4444-555555555555",
    lifecycle: "approved", approvedTotal: 5950, submittedTotal: 5950,
  };
  const TOTAL = 5950;

  // Payment truth arrives as a first-class Project Cost payment position, never
  // from an Advance. `withPaid` states what the Hub actually knows.
  const withPaid = (paid) => contexts({
    claims: [approvedClaim],
    positions: [positionFor(approvedClaim.id, { paid, total: TOTAL })],
  });
  const cellsOf = () => {
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    return [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
  };

  it("uses the amended columns and drops funding mechanics as a column", () => {
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    const headers = [...container.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    expect(headers).toEqual([
      "Date", "Cost Ref.", "Project", "Status", "Total", "Balance", "Paid", "Action",
    ]);
    expect(headers).not.toContain("Financial position");
  });

  // CASE A. The heart of the amendment. A cost the Founder paid in July was
  // never entered here, so the Hub knows nothing — and must not claim it unpaid.
  it("shows Paid and Balance as unknown when the Hub holds no payment history", () => {
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    const cells = cellsOf();
    // Total is known; Balance and Paid are dashes, never KES 0.
    expect(cells[4]).toMatch(/5,950/);
    expect(cells[5]).toBe("—");
    expect(cells[6]).toBe("—");
    // Unknown means the Hub does not know. It does not mean money is owed, and
    // it must not be described through Advances or fund requests.
    expect(screen.queryByText(/Not yet funded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/fund request/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/advance/i)).not.toBeInTheDocument();
  });

  // CASE E. Approval decides authority. It never decides that money moved.
  it("never fabricates a payment from an approval", () => {
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    const table = container.querySelector("table");
    expect(table.textContent).not.toMatch(/Paid in full/);
    // An approved cost with unknown history stays unknown, not zero-paid.
    expect(cellsOf()[6]).toBe("—");
  });

  // CASE B. Knowing the whole history and finding nothing paid is a real answer,
  // and the only circumstance in which KES 0 may be stated.
  it("states KES 0 paid only when the Hub knows the complete payment history", () => {
    wrap(<AdminSiteCosts />, withPaid(0));
    const cells = cellsOf();
    expect(cells[4]).toMatch(/5,950/);          // Total
    expect(cells[5]).toMatch(/5,950/);          // Balance
    expect(cells[6]).toMatch(/KES\s*0\.00/);    // Paid
  });

  // CASE C.
  it("shows a part payment as a part payment", () => {
    wrap(<AdminSiteCosts />, withPaid(3000));
    const cells = cellsOf();
    expect(cells[4]).toMatch(/5,950/); // Total
    expect(cells[5]).toMatch(/2,950/); // Balance
    expect(cells[6]).toMatch(/3,000/); // Paid
  });

  // CASE D.
  it("shows a fully paid cost as settled, with nothing left owing", () => {
    wrap(<AdminSiteCosts />, withPaid(TOTAL));
    const cells = cellsOf();
    expect(cells[4]).toMatch(/5,950/);       // Total
    expect(cells[5]).toMatch(/KES\s*0\.00/); // Balance
    expect(cells[6]).toMatch(/5,950/);       // Paid
  });

  it("counts costs with no payment history separately, never as unpaid", () => {
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    expect(screen.getByText(/1 with payment history not yet confirmed/)).toBeInTheDocument();
  });

  it("shows a human-readable cost reference, never a raw id", () => {
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    // Rendered in both the desktop table and the mobile card.
    expect(screen.getAllByText("ICC-11111111").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
  });

  it("offers a state- and role-aware action menu rather than every action in every row", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    const trigger = screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0];
    await user.click(trigger);
    const menu = screen.getAllByRole("menu")[0];
    expect(within(menu).getByRole("menuitem", { name: "View cost" })).toBeInTheDocument();
    // Approved and still owing something, so the Principal may record what was
    // actually paid. A Project Cost payment needs no Advance and no fund
    // request, so neither is ever offered here.
    expect(within(menu).getByRole("menuitem", { name: "Record payment" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Request funds" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: /advance/i })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Cancel approved cost" })).toBeInTheDocument();
  });

  // Unknown payment history means the Hub does not know. It does not mean money
  // is required, so it must not summon a funding action for anyone.
  it("offers the Operations Manager no payment or funding action at all", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, contexts({ role: "manager", claims: [approvedClaim] }));
    await user.click(screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0]);
    const menu = screen.getAllByRole("menu")[0];
    expect(within(menu).getByRole("menuitem", { name: "View cost" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Request funds" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Record payment" })).not.toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Cancel approved cost" })).not.toBeInTheDocument();
  });

  it("stops offering to record a payment once the cost is fully paid", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, withPaid(TOTAL));
    await user.click(screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0]);
    const menu = screen.getAllByRole("menu")[0];
    expect(within(menu).queryByRole("menuitem", { name: "Record payment" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "View payments" })).toBeInTheDocument();
  });

  // FOUNDER RULING, 12 Aug 2026. Settling a cost and recording a transaction are
  // two different acts, so the menu offers both and never merges them.
  it("offers Mark paid alongside Record payment while payment history is unknown", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    await user.click(screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0]);
    const menu = screen.getAllByRole("menu")[0];
    expect(within(menu).getByRole("menuitem", { name: "Mark paid" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Record payment" })).toBeInTheDocument();
  });

  it("still offers Mark paid on a known part-paid cost", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, withPaid(TOTAL / 2));
    await user.click(screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0]);
    expect(within(screen.getAllByRole("menu")[0]).getByRole("menuitem", { name: "Mark paid" })).toBeInTheDocument();
  });

  it("stops offering Mark paid once the balance is nil", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, withPaid(TOTAL));
    await user.click(screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0]);
    expect(within(screen.getAllByRole("menu")[0]).queryByRole("menuitem", { name: "Mark paid" })).not.toBeInTheDocument();
  });

  it("keeps Mark paid out of the Operations Manager's menu", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, contexts({ role: "manager", claims: [approvedClaim] }));
    await user.click(screen.getAllByRole("button", { name: /Actions for ICC-11111111/ })[0]);
    expect(within(screen.getAllByRole("menu")[0]).queryByRole("menuitem", { name: "Mark paid" })).not.toBeInTheDocument();
  });

  it("clears the unconfirmed-history footer once the cost is settled historically", () => {
    wrap(<AdminSiteCosts />, contexts({
      claims: [approvedClaim],
      positions: [{
        claimId: approvedClaim.id, historyComplete: true, paymentCount: 0,
        paidAmount: TOTAL, balanceAmount: 0, historicalSettlementAmount: TOTAL,
      }],
    }));
    expect(screen.queryByText(/with payment history not yet confirmed/)).not.toBeInTheDocument();
  });

  it("keeps the row compact and leaves the full purpose to the drill-through", () => {
    const wordy = {
      ...approvedClaim,
      purpose: "Sixteen casual workers at KES 500 each for excavation, plus mason subcontract and mkokoteni cartage across the northern boundary run",
    };
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [wordy] }));
    expect(container.textContent).not.toContain("mkokoteni cartage across the northern");
  });
});

// ---------------------------------------------------------------------------
// Principal review: a possible duplicate is surfaced, never auto-decided.
// ---------------------------------------------------------------------------

describe("Project Costs possible-duplicate warning", () => {
  const planningLine = {
    id: "pl1", claimId: "c1", lineNumber: 1, description: "Planned site labour",
    rateType: "daily", quantity: 10, unit: "worker", unitRate: 500, lineTotal: 5000,
  };
  const earlier = {
    ...claim, id: "c1", lifecycle: "approved", approvedTotal: 5350, submittedTotal: 5350,
    dailySiteEntryId: "d1", category: "labour", createdAt: "2026-08-09T06:01:00Z",
  };
  const later = {
    ...claim, id: "c2", lifecycle: "awaiting_review", approvedTotal: null, submittedTotal: 5000,
    dailySiteEntryId: "d1", category: "labour", createdAt: "2026-08-09T18:42:00Z", version: 1,
  };

  function detail(values, initial = "/admin/site-costs/c2") {
    return wrap(
      <Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>,
      values, initial
    );
  }

  const withLines = (map, claims) => {
    const values = contexts({ claims });
    values.costs.linesForClaim = (id) => map[id] || [];
    values.costs.eventsByClaim = { c1: [], c2: [] };
    return values;
  };

  it("warns the Principal when another claim from the same record has an identical line", () => {
    detail(withLines(
      { c1: [planningLine], c2: [{ ...planningLine, claimId: "c2" }] },
      [earlier, later]
    ));
    expect(screen.getByText("Possible duplicate")).toBeInTheDocument();
    expect(screen.getByText(/identical cost line/i)).toBeInTheDocument();
    // Drill-through to the cost it overlaps, named by what it was for rather
    // than by the raw recipient/crew string.
    expect(screen.getByRole("link", { name: /Lay turf/ }))
      .toHaveAttribute("href", "/admin/site-costs/c1");
  });

  it("leaves the Principal's decision entirely intact", () => {
    detail(withLines(
      { c1: [planningLine], c2: [{ ...planningLine, claimId: "c2" }] },
      [earlier, later]
    ));
    // Warned, not blocked: every decision remains available.
    expect(screen.getByRole("button", { name: "Approve Project Cost" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Request amendment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reject Project Cost" })).toBeInTheDocument();
  });

  it("stays silent when the lines are genuinely different", () => {
    detail(withLines(
      { c1: [planningLine], c2: [{ ...planningLine, claimId: "c2", description: "Cart transport", unitRate: 800 }] },
      [earlier, later]
    ));
    expect(screen.queryByText("Check similar cost")).not.toBeInTheDocument();
  });

  it("stays silent when the earlier claim was rejected", () => {
    detail(withLines(
      { c1: [planningLine], c2: [{ ...planningLine, claimId: "c2" }] },
      [{ ...earlier, lifecycle: "rejected" }, later]
    ));
    expect(screen.queryByText("Check similar cost")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FOUNDER RULING, 13 Aug 2026. Cancelled Project Costs are historical
// correction records, not working ones. The ordinary day-to-day register must
// not show them by default — but they stay in the data model, stay auditable,
// and remain reachable the moment the Principal deliberately asks for them.
// ---------------------------------------------------------------------------
describe("Project Costs register — Cancelled hidden by default", () => {
  const draftCost = {
    ...claim, id: "aaaaaaaa-0000-0000-0000-000000000001", lifecycle: "draft",
    submittedTotal: null, approvedTotal: null,
  };
  const awaitingCost = {
    ...claim, id: "bbbbbbbb-0000-0000-0000-000000000002", lifecycle: "awaiting_review",
    submittedTotal: 4000, approvedTotal: null,
  };
  const approvedCost = {
    ...claim, id: "cccccccc-0000-0000-0000-000000000003", lifecycle: "approved",
    submittedTotal: 6000, approvedTotal: 6000,
  };
  const cancelledCost = {
    ...claim, id: "dddddddd-0000-0000-0000-000000000004", lifecycle: "cancelled",
    submittedTotal: 9999, approvedTotal: 9999,
  };
  const draftLines = { [draftCost.id]: [{ id: "dl1", claimId: draftCost.id, lineNumber: 1, description: "Mason", rateType: "fixed", quantity: 1, unit: "job", unitRate: 1500, lineTotal: 1500 }] };
  const mixedClaims = [draftCost, awaitingCost, approvedCost, cancelledCost];

  function register(initial = "/admin/site-costs") {
    const values = contexts({ claims: mixedClaims });
    values.costs.linesForClaim = (id) => draftLines[id] || [];
    return wrap(<AdminSiteCosts />, values, initial);
  }

  it("excludes Cancelled from the default register", () => {
    const { container } = register();
    expect(container.textContent).not.toContain(costReference(cancelledCost));
  });

  it("still shows Draft in the default register", () => {
    const { container } = register();
    expect(container.textContent).toContain(costReference(draftCost));
  });

  it("still shows Awaiting review in the default register", () => {
    const { container } = register();
    expect(container.textContent).toContain(costReference(awaitingCost));
  });

  it("still shows Approved in the default register", () => {
    const { container } = register();
    expect(container.textContent).toContain(costReference(approvedCost));
  });

  it("shows Cancelled when the Principal explicitly selects the Cancelled filter", async () => {
    const user = userEvent.setup();
    const { container } = register();
    await user.selectOptions(screen.getByLabelText("Status"), "cancelled");
    expect(container.textContent).toContain(costReference(cancelledCost));
    // A deliberate Cancelled filter is exclusive — the working statuses drop out.
    expect(container.textContent).not.toContain(costReference(draftCost));
    expect(container.textContent).not.toContain(costReference(approvedCost));
  });

  it("shows Cancelled records when the URL states ?status=cancelled directly", () => {
    const { container } = register("/admin/site-costs?status=cancelled");
    expect(container.textContent).toContain(costReference(cancelledCost));
    expect(container.textContent).not.toContain(costReference(draftCost));
  });

  it("excludes Cancelled from the default count", () => {
    register();
    // Three working costs (draft, awaiting review, approved) out of four total
    // ever raised — the fourth, cancelled, is deliberately not counted here.
    expect(screen.getByText("3 of 4 costs")).toBeInTheDocument();
  });

  it("excludes Cancelled from the default financial totals", () => {
    register();
    // Total = draft's structured line total (1,500) + awaiting review's
    // submitted total (4,000) + approved's approved total (6,000) = 11,500.
    // Cancelled's 9,999 must not be folded in.
    expect(screen.getByText(/KES\s*11,500\.00/)).toBeInTheDocument();
  });

  it("counts only the cancelled records once Cancelled is explicitly selected", () => {
    const { container } = register("/admin/site-costs?status=cancelled");
    expect(container.textContent).toContain("1 of 4 cost");
  });

  it("applies the identical default/filter behaviour to the mobile cards", () => {
    const { container } = register();
    const mobileList = container.querySelector("ul.md\\:hidden");
    expect(mobileList.textContent).not.toContain(costReference(cancelledCost));
    expect(mobileList.textContent).toContain(costReference(draftCost));
    expect(mobileList.textContent).toContain(costReference(approvedCost));
  });

  it("shows Cancelled on mobile once explicitly filtered — no separate mobile semantics", () => {
    const { container } = register("/admin/site-costs?status=cancelled");
    const mobileList = container.querySelector("ul.md\\:hidden");
    expect(mobileList.textContent).toContain(costReference(cancelledCost));
  });

  it("leaves the project filter working unchanged alongside the Cancelled default", () => {
    const otherProjectCost = { ...approvedCost, id: "eeeeeeee-0000-0000-0000-000000000005", projectId: "p2" };
    const values = contexts({ claims: [...mixedClaims, otherProjectCost] });
    values.costs.linesForClaim = (id) => draftLines[id] || [];
    const { container } = wrap(<AdminSiteCosts />, values, "/admin/site-costs?project=p1");
    expect(container.textContent).toContain(costReference(approvedCost));
    expect(container.textContent).not.toContain(costReference(otherProjectCost));
    expect(container.textContent).not.toContain(costReference(cancelledCost));
  });

  it("never mutates or cancels a claim just by loading the default or Cancelled view", () => {
    const values = contexts({ claims: mixedClaims });
    values.costs.linesForClaim = (id) => draftLines[id] || [];
    wrap(<AdminSiteCosts />, values, "/admin/site-costs?status=cancelled");
    expect(values.costs.cancelClaim).not.toHaveBeenCalled();
    // The cancelled record is still the exact same row from the data model —
    // reachable, not deleted, not rewritten.
    expect(values.costs.claims.find((c) => c.id === cancelledCost.id)).toEqual(cancelledCost);
  });
});
