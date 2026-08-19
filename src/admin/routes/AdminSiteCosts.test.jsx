import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import { StaffCompensationContext } from "../context/staffCompensation";
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
  finance = {}, positions = [], payments = [], compensations = [],
} = {}) {
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles },
    daily: { entries: dailyEntries },
    // The register reads Staff Pay only to exclude Project Costs that have been
    // canonically migrated into it, via legacySourceClaimId.
    staffPay: { compensations, payments: [], paymentPositionForCompensation: () => null, status: "ready", error: "" },
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
  return render(<MemoryRouter initialEntries={[initial]}><AdminDataContext.Provider value={values.admin}><DailySiteOperationsContext.Provider value={values.daily}><StaffCompensationContext.Provider value={values.staffPay}><SiteCostsContext.Provider value={values.costs}><FundRequestsContext.Provider value={values.finance}>{element}</FundRequestsContext.Provider></SiteCostsContext.Provider></StaffCompensationContext.Provider></DailySiteOperationsContext.Provider></AdminDataContext.Provider></MemoryRouter>);
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
    const table = container.querySelector("table");
    // Approved, history unconfirmed — the row says exactly that, and the word
    // "Approved" survives only in the Approval status filter, never as the row's
    // working status.
    expect(table.textContent).toContain("Payment history to confirm");
    expect(table.textContent).not.toContain("Approved");
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
    await user.selectOptions(screen.getByLabelText("Approval status"), "cancelled");
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

// The Founder's at-a-glance Project Costs position, added alongside the one
// already live on Staff Pay.
//
// These four cards answer a PORTFOLIO question and the existing footer answers
// a FILTERED-REGISTER question. They are deliberately not the same number: the
// footer's Total reconciles whatever the register currently shows, which can
// include drafts, costs awaiting review and withdrawn costs, none of which are
// accepted Botanique obligations. "Approved costs" counts only approval, which
// is the point at which a Project Cost becomes an obligation.
describe("Project Costs at-a-glance position", () => {
  const cost = (id, lifecycle, extra = {}) => ({ ...claim, id, lifecycle, ...extra });

  const approvedPartPaid = cost("11111111-0000-0000-0000-000000000001", "approved", { submittedTotal: 6000, approvedTotal: 6000 });
  const approvedSettled = cost("22222222-0000-0000-0000-000000000002", "approved", { submittedTotal: 4000, approvedTotal: 4000 });
  const approvedUnknown = cost("33333333-0000-0000-0000-000000000003", "approved", { submittedTotal: 5000, approvedTotal: 5000 });
  const awaitingOne = cost("44444444-0000-0000-0000-000000000004", "awaiting_review", { submittedTotal: 3350, approvedTotal: null });
  const awaitingTwo = cost("55555555-0000-0000-0000-000000000005", "awaiting_review", { submittedTotal: 1000, approvedTotal: null });
  const draftCost = cost("66666666-0000-0000-0000-000000000006", "draft", { submittedTotal: null, approvedTotal: null });
  const withdrawnCost = cost("77777777-0000-0000-0000-000000000007", "withdrawn", { submittedTotal: 8000, approvedTotal: null });
  const rejectedCost = cost("88888888-0000-0000-0000-000000000008", "rejected", { submittedTotal: 7000, approvedTotal: null });
  const cancelledCost = cost("99999999-0000-0000-0000-000000000009", "cancelled", { submittedTotal: 9999, approvedTotal: 9999 });
  const amendmentCost = cost("aaaaaaaa-0000-0000-0000-00000000000a", "amendment_requested", { submittedTotal: 2500, approvedTotal: null });
  // Canonically migrated into Staff Pay: still addressable for audit, but no
  // longer a working Project Cost and never a second obligation.
  const migratedCost = cost("bbbbbbbb-0000-0000-0000-00000000000b", "approved", { submittedTotal: 12000, approvedTotal: 12000 });

  const portfolio = [
    approvedPartPaid, approvedSettled, approvedUnknown, awaitingOne, awaitingTwo,
    draftCost, withdrawnCost, rejectedCost, cancelledCost, amendmentCost, migratedCost,
  ];
  const draftLines = { [draftCost.id]: [{ id: "dl1", claimId: draftCost.id, lineNumber: 1, description: "Mason", rateType: "fixed", quantity: 1, unit: "job", unitRate: 1500, lineTotal: 1500 }] };
  const positions = [
    positionFor(approvedPartPaid.id, { paid: 2000, total: 6000 }),
    positionFor(approvedSettled.id, { paid: 4000, total: 4000 }),
    // approvedUnknown deliberately has NO position: the Hub does not hold its
    // payment history, which is not the same fact as "KES 0 paid".
  ];
  const migratedIntoStaffPay = [{ id: "sp1", personId: "m1", lifecycle: "approved", legacySourceClaimId: migratedCost.id }];

  function register(initial = "/admin/site-costs", overrides = {}) {
    const values = contexts({
      claims: portfolio, positions, compensations: migratedIntoStaffPay, ...overrides,
    });
    values.costs.linesForClaim = (id) => draftLines[id] || [];
    return { values, ...wrap(<AdminSiteCosts />, values, initial) };
  }

  function summaryCard(label) {
    const group = screen.getByRole("group", { name: "Project Costs summary" });
    const paragraphs = within(group).getByText(label).parentElement.querySelectorAll("p");
    return { value: paragraphs[1].textContent, hint: paragraphs[2].textContent };
  }

  const balanceCell = (claimRow) => screen.getAllByRole("link", { name: costReference(claimRow) })
    .map((node) => node.closest("tr")).find(Boolean).querySelector("[data-balance-emphasis]");
  const mobileBalance = (claimRow) => screen.getAllByRole("link", { name: costReference(claimRow) })
    .map((node) => node.closest("li")).find(Boolean).querySelector("dd[data-balance-emphasis]");

  it("renders the four at-a-glance cards above the register", () => {
    register();
    const group = screen.getByRole("group", { name: "Project Costs summary" });
    ["Approved costs", "Paid", "Outstanding", "Awaiting decision"].forEach((label) =>
      expect(within(group).getByText(label)).toBeInTheDocument());
  });

  // 6,000 + 4,000 + 5,000. Approval is what makes a cost an obligation, so the
  // approved total is the sum of approvedTotal across approved canonical costs.
  it("totals Approved costs from approved canonical costs only", () => {
    register();
    expect(summaryCard("Approved costs").value).toMatch(/KES\s*15,000\.00/);
    expect(summaryCard("Approved costs").hint).toBe("3 approved costs");
  });

  it("excludes costs still awaiting review from Approved costs", () => {
    register();
    // 3,350 + 1,000 of submitted-but-undecided cost is not an obligation.
    expect(summaryCard("Approved costs").value).not.toMatch(/19,350|4,350/);
  });

  it("excludes withdrawn costs from Approved costs", () => {
    register();
    expect(summaryCard("Approved costs").value).not.toMatch(/23,000/);
  });

  it("excludes rejected, cancelled, draft and amendment-requested costs from Approved costs", () => {
    register("/admin/site-costs", { claims: [rejectedCost, cancelledCost, draftCost, amendmentCost], positions: [] });
    expect(summaryCard("Approved costs").value).toMatch(/KES\s*0\.00/);
    expect(summaryCard("Approved costs").hint).toBe("0 approved costs");
  });

  // A Project Cost migrated into Staff Pay is answered by Staff Pay. Counting
  // it here as well would state the same obligation twice.
  it("excludes a Project Cost canonically migrated into Staff Pay", () => {
    register();
    expect(summaryCard("Approved costs").value).not.toMatch(/27,000/);
    expect(summaryCard("Approved costs").hint).toBe("3 approved costs");
  });

  it("falls back to the structured line total only where costTotal already does", () => {
    // An approved cost carries approvedTotal, so lines never override it.
    register("/admin/site-costs", { claims: [{ ...approvedPartPaid, approvedTotal: 6000 }] });
    expect(summaryCard("Approved costs").value).toMatch(/KES\s*6,000\.00/);
  });

  it("takes Paid from known canonical payment positions only", () => {
    register();
    // 2,000 + 4,000. The third approved cost has no confirmed history and is
    // not read as another KES 0.
    expect(summaryCard("Paid").value).toMatch(/KES\s*6,000\.00/);
  });

  it("takes Outstanding from known balances only", () => {
    register();
    // 4,000 still owed on the part-paid cost, nil on the settled one.
    expect(summaryCard("Outstanding").value).toMatch(/KES\s*4,000\.00/);
  });

  it("never counts an unconfirmed payment history as KES 0 paid", () => {
    register();
    // Folding the unknown cost in as nil paid would read 6,000 paid against an
    // 11,000 known obligation and 9,000 outstanding. It does neither.
    expect(summaryCard("Outstanding").value).not.toMatch(/9,000/);
    expect(summaryCard("Paid").hint).toBe("1 payment history to confirm");
  });

  it("shows Paid as unknown when no approved cost has a confirmed history", () => {
    register("/admin/site-costs", { claims: [approvedUnknown], positions: [] });
    expect(summaryCard("Approved costs").value).toMatch(/KES\s*5,000\.00/);
    expect(summaryCard("Paid").value).toBe("—");
    expect(summaryCard("Paid").hint).toBe("1 payment history to confirm");
  });

  it("shows Outstanding as unknown when no approved cost has a confirmed history", () => {
    register("/admin/site-costs", { claims: [approvedUnknown], positions: [] });
    expect(summaryCard("Outstanding").value).toBe("—");
    expect(summaryCard("Outstanding").hint).toBe("1 payment history to confirm");
  });

  it("states the known totals and names the unconfirmed remainder when histories are mixed", () => {
    register();
    expect(summaryCard("Paid").value).toMatch(/KES\s*6,000\.00/);
    expect(summaryCard("Outstanding").value).toMatch(/KES\s*4,000\.00/);
    expect(summaryCard("Outstanding").hint).toBe("Excludes 1 unconfirmed cost");
  });

  it("says so plainly when every approved history is confirmed", () => {
    register("/admin/site-costs", { claims: [approvedPartPaid, approvedSettled] });
    expect(summaryCard("Paid").hint).toBe("Confirmed paid position");
    expect(summaryCard("Outstanding").hint).toBe("Balance still payable");
  });

  it("reports nothing payable when no cost has been approved", () => {
    register("/admin/site-costs", { claims: [awaitingOne], positions: [] });
    expect(summaryCard("Approved costs").value).toMatch(/KES\s*0\.00/);
    expect(summaryCard("Paid").value).toBe("—");
    expect(summaryCard("Outstanding").value).toBe("—");
    expect(summaryCard("Awaiting decision").value).toBe("1");
  });

  it("counts Awaiting decision from costs awaiting the Principal's review", () => {
    register();
    expect(summaryCard("Awaiting decision").value).toBe("2");
    expect(summaryCard("Awaiting decision").hint).toBe("2 costs pending review");
  });

  // amendment_requested is back with the requester, exactly as canDecideSiteCost
  // already states, so it is not waiting on the Principal.
  it("leaves approved, draft and amendment-requested costs out of Awaiting decision", () => {
    register("/admin/site-costs", { claims: [approvedPartPaid, draftCost, amendmentCost], positions: [] });
    expect(summaryCard("Awaiting decision").value).toBe("0");
    expect(summaryCard("Awaiting decision").hint).toBe("0 costs pending review");
  });

  // The cards are the portfolio position. Narrowing the register below them is
  // a question about the register, not about what Botanique owes.
  it("holds the top cards steady under every register filter", () => {
    const expected = {
      approved: /KES\s*15,000\.00/, paid: /KES\s*6,000\.00/, outstanding: /KES\s*4,000\.00/, awaiting: "2",
    };
    ["/admin/site-costs",
     "/admin/site-costs?status=approved",
     "/admin/site-costs?status=awaiting_review",
     "/admin/site-costs?payment=part_paid",
     "/admin/site-costs?project=p1&status=approved&from=2026-07-01&to=2026-07-31",
    ].forEach((url) => {
      const view = register(url);
      expect(summaryCard("Approved costs").value).toMatch(expected.approved);
      expect(summaryCard("Paid").value).toMatch(expected.paid);
      expect(summaryCard("Outstanding").value).toMatch(expected.outstanding);
      expect(summaryCard("Awaiting decision").value).toBe(expected.awaiting);
      view.unmount();
    });
  });

  it("keeps the footer reconciling the visible register, which does move with the filters", () => {
    const all = register();
    // Ten canonical costs; the cancelled one is hidden by default.
    expect(screen.getByText("9 of 10 costs")).toBeInTheDocument();
    all.unmount();

    register("/admin/site-costs?status=approved");
    expect(screen.getByText("3 of 10 costs")).toBeInTheDocument();
    // The footer's own Total is the visible reconciliation and coincides with
    // the approved obligation only because the filter happens to be Approved.
    expect(summaryCard("Approved costs").value).toMatch(/KES\s*15,000\.00/);
  });

  it("gives a known balance still owing the strongest weight in the row", () => {
    register();
    const cell = balanceCell(approvedPartPaid);
    expect(cell).toHaveAttribute("data-balance-emphasis", "strong");
    expect(cell.className).toContain("font-bold");
    expect(cell.className).toContain("text-botanique-charcoal");
    // Restrained, not alarmed: no warning colour and no blue for ordinary debt.
    expect(cell.className).not.toContain("text-sky-800");
  });

  it("keeps a settled balance quiet", () => {
    register();
    const cell = balanceCell(approvedSettled);
    expect(cell).toHaveAttribute("data-balance-emphasis", "quiet");
    expect(cell.className).not.toContain("font-bold");
  });

  it("leaves an unknown balance as a quiet em dash", () => {
    register();
    const cell = balanceCell(approvedUnknown);
    expect(cell).toHaveAttribute("data-balance-emphasis", "quiet");
    expect(cell.textContent).toBe("—");
  });

  it("gives the mobile card the same Balance emphasis as the desktop row", () => {
    register();
    expect(mobileBalance(approvedPartPaid)).toHaveAttribute("data-balance-emphasis", "strong");
    expect(mobileBalance(approvedPartPaid).className).toContain("font-bold");
    expect(mobileBalance(approvedSettled)).toHaveAttribute("data-balance-emphasis", "quiet");
    expect(mobileBalance(approvedUnknown).textContent).toBe("—");
  });

  it("leaves the row action menu exactly as it was", async () => {
    register();
    await userEvent.click(screen.getAllByRole("button", { name: `Actions for ${costReference(approvedPartPaid)}` })[0]);
    const menu = screen.getAllByRole("menu")[0];
    expect(within(menu).getByRole("menuitem", { name: "View cost" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Mark paid" })).toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Record payment" })).toBeInTheDocument();
  });

  it("leaves the payment filters working exactly as they were", () => {
    const part = register("/admin/site-costs?payment=part_paid");
    expect(screen.getByText("1 of 10 costs")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: costReference(approvedPartPaid) }).length).toBeGreaterThan(0);
    part.unmount();

    const paid = register("/admin/site-costs?payment=paid");
    expect(screen.getAllByRole("link", { name: costReference(approvedSettled) }).length).toBeGreaterThan(0);
    paid.unmount();

    const unrecorded = register("/admin/site-costs?payment=unrecorded");
    expect(screen.getAllByRole("link", { name: costReference(approvedUnknown) }).length).toBeGreaterThan(0);
    unrecorded.unmount();
  });
});

// FOUNDER RULING, 19 Aug 2026. The register must answer IS THIS COST STILL
// OWED? at a glance. A fully settled cost and a cost with its whole balance
// outstanding both used to read "Approved", which made the table materially
// less useful than Staff Pay even though the money columns were already right.
//
// Approval stays the underlying lifecycle and is untouched. Once a cost is
// approved, the VISIBLE row status becomes its current payment position.
describe("Project Costs register — payment position as row status", () => {
  const cost = (id, lifecycle, extra = {}) => ({ ...claim, id, lifecycle, ...extra });

  const unpaid = cost("10000000-0000-0000-0000-000000000001", "approved", { submittedTotal: 2400, approvedTotal: 2400 });
  const partPaid = cost("20000000-0000-0000-0000-000000000002", "approved", { submittedTotal: 10000, approvedTotal: 10000 });
  const settled = cost("30000000-0000-0000-0000-000000000003", "approved", { submittedTotal: 6500, approvedTotal: 6500 });
  const unconfirmed = cost("40000000-0000-0000-0000-000000000004", "approved", { submittedTotal: 5000, approvedTotal: 5000 });
  const draftCost = cost("50000000-0000-0000-0000-000000000005", "draft", { submittedTotal: null, approvedTotal: null });
  const awaitingCost = cost("60000000-0000-0000-0000-000000000006", "awaiting_review", { submittedTotal: 3350, approvedTotal: null });
  const amendmentCost = cost("70000000-0000-0000-0000-000000000007", "amendment_requested", { submittedTotal: 2500, approvedTotal: null });
  const rejectedCost = cost("80000000-0000-0000-0000-000000000008", "rejected", { submittedTotal: 7000, approvedTotal: null });
  const withdrawnCost = cost("90000000-0000-0000-0000-000000000009", "withdrawn", { submittedTotal: 8000, approvedTotal: null });
  const cancelledCost = cost("a0000000-0000-0000-0000-00000000000a", "cancelled", { submittedTotal: 9999, approvedTotal: 9999 });

  const everyState = [unpaid, partPaid, settled, unconfirmed, draftCost, awaitingCost, amendmentCost, rejectedCost, withdrawnCost, cancelledCost];
  const positions = [
    positionFor(unpaid.id, { paid: 0, total: 2400 }),
    positionFor(partPaid.id, { paid: 4000, total: 10000 }),
    positionFor(settled.id, { paid: 6500, total: 6500 }),
    // `unconfirmed` deliberately has no position: history not confirmed.
  ];

  function register(initial = "/admin/site-costs", overrides = {}) {
    const values = contexts({ claims: everyState, positions, ...overrides });
    values.costs.linesForClaim = () => [];
    return { values, ...wrap(<AdminSiteCosts />, values, initial) };
  }

  const chipIn = (selector) => (row) => screen.getAllByRole("link", { name: costReference(row) })
    .map((node) => node.closest(selector)).find(Boolean).querySelector("[data-register-status]");
  const rowChip = chipIn("tr");
  const cardChip = chipIn("li");

  // 1 — Karen Residence HSE 19: KES 2,400, paid KES 0, balance KES 2,400.
  it("shows an approved cost with nothing paid as Unpaid", () => {
    register();
    expect(rowChip(unpaid)).toHaveTextContent("Unpaid");
    expect(rowChip(unpaid)).toHaveAttribute("data-register-status", "payment:unpaid");
  });

  // 2 — Total KES 10,000, paid KES 4,000, balance KES 6,000.
  it("shows a part-paid cost as exactly Partially Paid", () => {
    register();
    const chip = rowChip(partPaid);
    expect(chip).toHaveTextContent("Partially Paid");
    expect(chip.textContent).toBe("Partially Paid");
    ["Part paid", "Part-paid", "Part Paid", "Partially received"].forEach((banned) =>
      expect(chip.textContent).not.toContain(banned));
  });

  // 3 — Alego Usonga: KES 6,500, paid KES 6,500, balance KES 0.
  it("shows a settled cost as Paid", () => {
    register();
    expect(rowChip(settled).textContent).toBe("Paid");
    expect(rowChip(settled)).toHaveAttribute("data-register-status", "payment:paid");
  });

  it("shows an approved cost with no confirmed history as Payment history to confirm", () => {
    register();
    expect(rowChip(unconfirmed).textContent).toBe("Payment history to confirm");
    ["Payment not recorded", "Nothing paid", "Paid in full"].forEach((banned) =>
      expect(rowChip(unconfirmed).textContent).not.toContain(banned));
  });

  it("never uses Approved as the visible row status of an approved cost", () => {
    const { container } = register();
    const table = container.querySelector("table");
    expect(table.textContent).not.toContain("Approved");
    [unpaid, partPaid, settled, unconfirmed].forEach((row) =>
      expect(rowChip(row).getAttribute("data-register-status")).toMatch(/^payment:/));
  });

  it("keeps the lifecycle label on every record that has not been approved", () => {
    register();
    expect(rowChip(draftCost).textContent).toBe("Draft");
    expect(rowChip(awaitingCost).textContent).toBe("Awaiting review");
    expect(rowChip(amendmentCost).textContent).toBe("Amendment requested");
    expect(rowChip(rejectedCost).textContent).toBe("Rejected");
    expect(rowChip(withdrawnCost).textContent).toBe("Withdrawn");
    [draftCost, awaitingCost, amendmentCost, rejectedCost, withdrawnCost].forEach((row) =>
      expect(rowChip(row).getAttribute("data-register-status")).toMatch(/^lifecycle:/));
  });

  it("keeps Cancelled as Cancelled once it is explicitly shown", () => {
    register("/admin/site-costs?status=cancelled");
    expect(rowChip(cancelledCost).textContent).toBe("Cancelled");
  });

  it("gives the mobile card the identical derived status, never a second opinion", () => {
    register();
    [unpaid, partPaid, settled, unconfirmed, draftCost, awaitingCost].forEach((row) => {
      expect(cardChip(row).textContent).toBe(rowChip(row).textContent);
      expect(cardChip(row).getAttribute("data-register-status"))
        .toBe(rowChip(row).getAttribute("data-register-status"));
    });
  });

  it("names the lifecycle filter Approval status and keeps Approved in it", () => {
    register();
    const approval = screen.getByLabelText("Approval status");
    expect(approval).toBeInTheDocument();
    // "Approved" is legitimate here: this filter explicitly means approval.
    expect(within(approval).getByRole("option", { name: "Approved" })).toBeInTheDocument();
    expect(within(approval).getByRole("option", { name: "All statuses" })).toBeInTheDocument();
    ["Draft", "Awaiting review", "Amendment requested", "Rejected", "Withdrawn", "Cancelled"].forEach((label) =>
      expect(within(approval).getByRole("option", { name: label })).toBeInTheDocument());
  });

  it("names the payment filter Payment position and offers exactly the register's vocabulary", () => {
    register();
    const position = screen.getByLabelText("Payment position");
    expect(position).toBeInTheDocument();
    expect(within(position).getByRole("option", { name: "Any payment position" })).toBeInTheDocument();
    ["Unpaid", "Partially Paid", "Paid", "Payment history to confirm"].forEach((label) =>
      expect(within(position).getByRole("option", { name: label })).toBeInTheDocument());
    // The old vocabulary is gone from the filter entirely.
    ["Part paid", "Nothing paid", "Paid in full", "Payment not recorded", "Any payment state"].forEach((banned) =>
      expect(position.textContent).not.toContain(banned));
  });

  it("keeps the existing ?payment= URL values filtering correctly", () => {
    const part = register("/admin/site-costs?payment=part_paid");
    expect(rowChip(partPaid).textContent).toBe("Partially Paid");
    expect(screen.queryByText(costReference(settled))).not.toBeInTheDocument();
    expect(screen.getByText(/Filtered to Partially Paid\./)).toBeInTheDocument();
    part.unmount();

    const unrecorded = register("/admin/site-costs?payment=unrecorded");
    expect(rowChip(unconfirmed).textContent).toBe("Payment history to confirm");
    expect(screen.queryByText(costReference(partPaid))).not.toBeInTheDocument();
    unrecorded.unmount();

    const nil = register("/admin/site-costs?payment=unpaid");
    expect(rowChip(unpaid).textContent).toBe("Unpaid");
    expect(screen.queryByText(costReference(settled))).not.toBeInTheDocument();
    nil.unmount();

    register("/admin/site-costs?payment=paid");
    expect(rowChip(settled).textContent).toBe("Paid");
    expect(screen.queryByText(costReference(unpaid))).not.toBeInTheDocument();
  });

  it("leaves the Project filter untouched", () => {
    register();
    const project = screen.getByLabelText("Project");
    expect(within(project).getByRole("option", { name: "All projects" })).toBeInTheDocument();
    expect(within(project).getByRole("option", { name: "Alego Usonga" })).toBeInTheDocument();
  });

  it("keeps Status as the table's column heading", () => {
    const { container } = register();
    const headings = [...container.querySelectorAll("thead th")].map((cell) => cell.textContent);
    expect(headings).toContain("Status");
    expect(headings).not.toContain("Approval status");
    expect(headings).not.toContain("Payment position");
  });

  it("changes nothing underneath — the approval lifecycle is untouched", () => {
    const { values } = register();
    expect(values.costs.claims.find((c) => c.id === unpaid.id).lifecycle).toBe("approved");
    expect(values.costs.claims.find((c) => c.id === settled.id).lifecycle).toBe("approved");
    expect(values.costs.decideClaim).not.toHaveBeenCalled();
    expect(values.costs.cancelClaim).not.toHaveBeenCalled();
    expect(values.costs.updateClaim).not.toHaveBeenCalled();
  });

  it("leaves the top cards, the footer and the Balance emphasis exactly as PR #147 shipped them", () => {
    const { container } = register();
    const cards = screen.getByRole("group", { name: "Project Costs summary" });
    // 2,400 + 10,000 + 6,500 + 5,000 approved obligations.
    expect(within(cards).getByText("Approved costs").parentElement.querySelectorAll("p")[1].textContent)
      .toMatch(/KES\s*23,900\.00/);
    // Footer still reconciles the visible register: cancelled is hidden here.
    expect(screen.getByText("9 of 10 costs")).toBeInTheDocument();
    // Balance emphasis survives untouched.
    const balanceOf = (row) => screen.getAllByRole("link", { name: costReference(row) })
      .map((node) => node.closest("tr")).find(Boolean).querySelector("[data-balance-emphasis]");
    expect(balanceOf(unpaid)).toHaveAttribute("data-balance-emphasis", "strong");
    expect(balanceOf(settled)).toHaveAttribute("data-balance-emphasis", "quiet");
    expect(balanceOf(unconfirmed).textContent).toBe("—");
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("leaves the row action menu unchanged", async () => {
    register();
    await userEvent.click(screen.getAllByRole("button", { name: `Actions for ${costReference(partPaid)}` })[0]);
    const menu = screen.getAllByRole("menu")[0];
    ["View cost", "Mark paid", "Record payment"].forEach((label) =>
      expect(within(menu).getByRole("menuitem", { name: label })).toBeInTheDocument());
  });
});

// The detail page must not contradict the register one click away. Approval is
// not removed anywhere — it stays on the identity line, in the decision panel
// and throughout the history — it simply stops being the CURRENT status badge.
describe("Project Cost detail — current position vs approval provenance", () => {
  const approved = { ...claim, id: "c1", lifecycle: "approved", submittedTotal: 10000, approvedTotal: 10000, deciderId: "o1", decidedAt: "2026-08-01T09:00:00Z" };
  const detail = (positions = []) =>
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>,
      contexts({ claims: [approved], positions }), "/admin/site-costs/c1");

  const badge = () => document.querySelector("header [data-register-status]");

  it("badges a part-paid cost as Partially Paid, not Approved", () => {
    detail([positionFor("c1", { paid: 4000, total: 10000 })]);
    expect(badge().textContent).toBe("Partially Paid");
    expect(badge()).toHaveAttribute("data-register-status", "payment:part_paid");
  });

  it("badges a settled cost as Paid", () => {
    detail([positionFor("c1", { paid: 10000, total: 10000 })]);
    expect(badge().textContent).toBe("Paid");
  });

  it("badges a cost with nothing paid as Unpaid", () => {
    detail([positionFor("c1", { paid: 0, total: 10000 })]);
    expect(badge().textContent).toBe("Unpaid");
  });

  it("uses the settled wording for an unconfirmed payment history", () => {
    detail();
    expect(badge().textContent).toBe("Payment history to confirm");
    // The old near-miss wording is gone.
    expect(document.body.textContent).not.toContain("Payment history not yet confirmed");
  });

  it("keeps the approval decision visible as provenance", () => {
    detail([positionFor("c1", { paid: 0, total: 10000 })]);
    // Identity line still states the approval lifecycle …
    expect(document.body.textContent).toMatch(/Alego Usonga · .+ · Approved/);
    // … and the approved amount keeps its own label.
    expect(screen.getByText("Approved amount")).toBeInTheDocument();
    expect(screen.getByText("Approval does not mean paid. Payment is recorded separately against the Project Cost.")).toBeInTheDocument();
  });
});
