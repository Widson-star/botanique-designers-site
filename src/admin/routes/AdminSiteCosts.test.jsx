import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Claim summary" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Structured cost lines" })).not.toBeInTheDocument();
    // The audit trail itself is untouched.
    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
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
  const ADVANCE = "operations_manager_accountable_advance";
  const DIRECT = "direct_recipient_funding";
  const approvedClaim = {
    ...claim, id: "11111111-2222-3333-4444-555555555555",
    lifecycle: "approved", approvedTotal: 20000, submittedTotal: 20000,
  };

  const request = (o = {}) => ({
    id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved",
    intendedCustodyType: ADVANCE, totalRequestedAmount: 20000, version: 1, ...o,
  });
  const alloc = (o = {}) => ({
    id: "a1", fundRequestId: "r1", claimId: approvedClaim.id, allocationOrder: 1,
    requestedAmount: 20000, ...o,
  });
  const rel = (o = {}) => ({
    id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
    releasedAmount: 20000, releasedAt: "2026-08-05T09:00:00Z", version: 1, ...o,
  });

  const withFinance = (finance) => contexts({ claims: [approvedClaim], finance });

  it("uses the amended columns and drops funding mechanics as a column", () => {
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    const headers = [...container.querySelectorAll("thead th")].map((th) => th.textContent.trim());
    expect(headers).toEqual([
      "Date", "Cost Ref.", "Project", "Status", "Total", "Balance", "Paid", "Action",
    ]);
    expect(headers).not.toContain("Financial position");
  });

  // The heart of the amendment. A cost the Founder paid in July has no fund
  // request, so the Hub knows nothing — and must not claim it is unpaid.
  it("shows Paid and Balance as unknown when the Hub holds no payment record", () => {
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    // Total is known; Balance and Paid are dashes, never KES 0.
    expect(cells[4]).toMatch(/20,000/);
    expect(cells[5]).toBe("—");
    expect(cells[6]).toBe("—");
    expect(screen.queryByText(/Not yet funded/)).not.toBeInTheDocument();
    expect(screen.queryByText(/no fund request/i)).not.toBeInTheDocument();
  });

  it("never fabricates a payment from an approval", () => {
    const { container } = wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    // Approved is a decision about authority. It is not payment, and the
    // register must not let one imply the other.
    expect(screen.getAllByText("Approved").length).toBeGreaterThan(0);
    const table = container.querySelector("table");
    expect(table.textContent).not.toMatch(/Paid in full/);
  });

  it("states Paid and Balance once a payment genuinely exists for that one cost", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()],
      releases: [rel({ custodyDisposition: DIRECT, recipientLabel: "Kisumu Hardware" })],
    }));
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    expect(cells[4]).toMatch(/20,000/); // Total
    expect(cells[5]).toMatch(/KES\s*0/); // Balance
    expect(cells[6]).toMatch(/20,000/); // Paid
  });

  it("shows a part payment as a part payment", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()], allocations: [alloc()],
      releases: [rel({ releasedAmount: 12000 })],
    }));
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    expect(cells[5]).toMatch(/8,000/);  // Balance
    expect(cells[6]).toMatch(/12,000/); // Paid
  });

  // A release belongs to the whole authority. Splitting it across the costs it
  // funds would invent a figure the database does not hold.
  it("refuses to state a per-cost paid figure when the authority funds other costs too", () => {
    wrap(<AdminSiteCosts />, withFinance({
      requests: [request()],
      allocations: [alloc(), { id: "a2", fundRequestId: "r1", claimId: "other", requestedAmount: 5000 }],
      releases: [rel()],
    }));
    const row = screen.getAllByRole("row").find((r) => r.textContent.includes("ICC-"));
    const cells = [...row.querySelectorAll("td")].map((td) => td.textContent.trim());
    expect(cells[5]).toBe("—");
    expect(cells[6]).toBe("—");
  });

  it("counts costs with no payment record separately, never as unpaid", () => {
    wrap(<AdminSiteCosts />, contexts({ claims: [approvedClaim] }));
    expect(screen.getByText(/1 with no payment record in the Hub/)).toBeInTheDocument();
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
    const trigger = screen.getByRole("button", { name: /Actions for ICC-11111111/ });
    await user.click(trigger);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "View cost" })).toBeInTheDocument();
    // Approved with no payment record: requesting funds is the sensible next
    // step, and only a manager may request.
    expect(within(menu).queryByRole("menuitem", { name: "Request funds" })).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Cancel approved cost" })).toBeInTheDocument();
  });

  it("offers the Operations Manager a funds request and no Principal-only action", async () => {
    const user = userEvent.setup();
    wrap(<AdminSiteCosts />, contexts({ role: "manager", claims: [approvedClaim] }));
    await user.click(screen.getByRole("button", { name: /Actions for ICC-11111111/ }));
    const menu = screen.getByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Request funds" })).toBeInTheDocument();
    expect(within(menu).queryByRole("menuitem", { name: "Cancel approved cost" })).not.toBeInTheDocument();
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
    expect(screen.queryByText("Possible duplicate")).not.toBeInTheDocument();
  });

  it("stays silent when the earlier claim was rejected", () => {
    detail(withLines(
      { c1: [planningLine], c2: [{ ...planningLine, claimId: "c2" }] },
      [{ ...earlier, lifecycle: "rejected" }, later]
    ));
    expect(screen.queryByText("Possible duplicate")).not.toBeInTheDocument();
  });
});
