import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import { StaffCompensationContext } from "../context/staffCompensation";
import AdminStaffCompensation from "./AdminStaffCompensation";

// The register renders a desktop table and a mobile card list from the same
// records. Tailwind's md: breakpoints do not apply under `css: false`, so both
// are in the DOM at once and every assertion must say which surface it means.
const desktop = () => within(screen.getByRole("table", { name: "Staff pay register" }));
const mobile = () => within(screen.getByRole("list", { name: "Staff pay records" }));
const summary = () => within(screen.getByRole("group", { name: "Staff Pay summary" }));
const footer = () => within(screen.getByRole("group", { name: "Register totals" }));
const dataRows = () => desktop().getAllByRole("row").slice(1);
// The status chips carry their derived key, so a status assertion cannot be
// satisfied by a column header or a definition term that reads the same.
const desktopStatuses = () => [...screen.getByRole("table", { name: "Staff pay register" }).querySelectorAll("[data-register-status]")];
const mobileStatuses = () => [...screen.getByRole("list", { name: "Staff pay records" }).querySelectorAll("[data-register-status]")];
const desktopBalances = () => [...screen.getByRole("table", { name: "Staff pay register" }).querySelectorAll("[data-balance-emphasis]")];
const mobileBalances = () => [...screen.getByRole("list", { name: "Staff pay records" }).querySelectorAll("[data-balance-emphasis]")];

// Mirrors the component's formatter. Intl emits a non-breaking space, which
// Testing Library normalises out of the DOM text but not out of a string
// matcher, so the expected value is normalised the same way here.
const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code", maximumFractionDigits: 2,
}).format(Number(amount || 0)).replace(/\u00a0/g, " ");
const text = (node) => node.textContent.replace(/\u00a0/g, " ");

const person = { id: "person-1", fullName: "Martine Lotom", isActive: true };
const otherPerson = { id: "person-2", fullName: "Kefa Nyamari Ochenge", isActive: true };
const project = { id: "project-1", projectName: "Lugulu Residential Home" };
const compensation = {
  id: "comp-1", personId: "person-1", projectId: "project-1", serviceDate: "2026-08-16",
  compensationType: "compensation", description: "Site operations pay",
  lifecycle: "approved", submittedAmount: 60000, approvedAmount: 60000,
  requesterId: "manager-1", deciderId: "owner-1", requestRound: 1, version: 3,
};

const position = (overrides) => ({
  compensationId: "comp-1", paidAmount: 0, balanceAmount: 0, paymentStatus: "unpaid",
  historicalPaidAmount: 0, ...overrides,
});

function renderRegister({ role = "owner", compensations = [], position: single = null, positions = null, payments = [] } = {}) {
  const lookup = positions
    ? (id) => positions[id] || null
    : () => single;
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{ role, currentUserId: role === "owner" ? "owner-1" : "manager-1", projects: [project] }}>
        <PeopleContext.Provider value={{ people: [person, otherPerson] }}>
          <StaffCompensationContext.Provider value={{ compensations, payments, paymentPositionForCompensation: vi.fn(lookup), status: "ready", error: "" }}>
            <AdminStaffCompensation />
          </StaffCompensationContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

// A register whose four approved rows cover every payment position, plus a
// draft and an awaiting-review record that must keep their lifecycle status.
const mixedRegister = {
  compensations: [
    { ...compensation, id: "comp-unpaid", approvedAmount: 700, submittedAmount: 700 },
    { ...compensation, id: "comp-part", approvedAmount: 60000, submittedAmount: 60000 },
    { ...compensation, id: "comp-paid", approvedAmount: 30000, submittedAmount: 30000 },
    { ...compensation, id: "comp-unknown", approvedAmount: 28100, submittedAmount: 28100, legacySourceClaimId: "legacy-1" },
    { ...compensation, id: "comp-draft", lifecycle: "draft", approvedAmount: null, submittedAmount: 5000, personId: "person-2" },
    { ...compensation, id: "comp-awaiting", lifecycle: "awaiting_review", approvedAmount: null, submittedAmount: 9000, personId: "person-2" },
  ],
  positions: {
    "comp-unpaid": position({ compensationId: "comp-unpaid", paidAmount: 0, balanceAmount: 700, paymentStatus: "unpaid" }),
    "comp-part": position({ compensationId: "comp-part", paidAmount: 20000, balanceAmount: 40000, paymentStatus: "part_paid" }),
    "comp-paid": position({ compensationId: "comp-paid", paidAmount: 30000, balanceAmount: 0, paymentStatus: "paid" }),
    "comp-unknown": position({ compensationId: "comp-unknown", paidAmount: null, balanceAmount: null, paymentStatus: "payment_history_unknown" }),
  },
};

function chooseStatus(label) {
  fireEvent.change(screen.getByLabelText("Status"), {
    target: { value: within(screen.getByLabelText("Status")).getByRole("option", { name: label }).value },
  });
}

describe("Staff Pay working surface", () => {
  it("uses Staff Pay language and defaults filters to the whole register", () => {
    renderRegister();
    expect(screen.getByRole("heading", { name: "Staff Pay" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /New staff pay/i })).toHaveAttribute("href", "/admin/finance/staff-compensation/new");
    expect(screen.getByRole("link", { name: /Open Approvals/i })).toHaveAttribute("href", "/admin/approvals");
    expect(screen.getByRole("option", { name: "All people" }).selected).toBe(true);
    expect(screen.getByRole("option", { name: "All statuses" }).selected).toBe(true);
    expect(screen.getByRole("option", { name: "All projects" }).selected).toBe(true);
    expect(screen.getByText("No Staff Pay has been recorded yet.")).toBeInTheDocument();
  });

  it("makes the full name itself open the Staff Pay record and keeps row actions", () => {
    renderRegister({ compensations: [compensation], position: position({ paidAmount: 30000, balanceAmount: 30000, paymentStatus: "part_paid" }) });
    for (const heading of ["#", "Date", "Person", "Type", "Project", "Status", "Total", "Paid", "Balance", "Action"]) expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    expect(desktop().getByText("Pay")).toBeInTheDocument();
    expect(desktop().getByRole("link", { name: "Martine Lotom" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1");
    expect(screen.queryByText("ML")).not.toBeInTheDocument();
    fireEvent.click(desktop().getByRole("button", { name: "Staff pay actions" }));
    expect(desktop().getByRole("menuitem", { name: "Record payment" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1#payments");
    expect(desktop().getByRole("menuitem", { name: "View staff pay" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1");
  });

  it("opens lower register action menus upward so their options are not clipped", () => {
    const rows = [
      compensation,
      { ...compensation, id: "comp-2", serviceDate: "2026-08-15" },
      { ...compensation, id: "comp-3", serviceDate: "2026-08-14", lifecycle: "amendment_requested", approvedAmount: null },
    ];
    renderRegister({ compensations: rows, position: null });
    const buttons = desktop().getAllByRole("button", { name: "Staff pay actions" });
    fireEvent.click(buttons[2]);
    expect(desktop().getByRole("menu")).toHaveClass("bottom-full");
    expect(desktop().getByRole("menuitem", { name: "View staff pay" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-3");
  });

  it("offers Resolve payment history instead of inventing a balance for imported approved pay", () => {
    renderRegister({
      compensations: [{ ...compensation, paymentHistoryKnown: false, legacySourceClaimId: "legacy-1" }],
      position: position({ paidAmount: null, balanceAmount: null, paymentStatus: "payment_history_unknown" }),
    });
    expect(desktop().getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(desktop().queryByText(money(0))).not.toBeInTheDocument();
    fireEvent.click(desktop().getByRole("button", { name: "Staff pay actions" }));
    expect(desktop().getByRole("menuitem", { name: "Resolve payment history" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1#payment-history");
    expect(desktop().getByRole("menuitem", { name: "View original Project Cost" })).toHaveAttribute("href", "/admin/site-costs/legacy-1");
  });

  it("routes an awaiting Principal decision to Approvals", () => {
    renderRegister({ role: "owner", compensations: [{ ...compensation, lifecycle: "awaiting_review", approvedAmount: null }], position: null });
    fireEvent.click(desktop().getByRole("button", { name: "Staff pay actions" }));
    expect(desktop().getByRole("menuitem", { name: "Review in Approvals" })).toHaveAttribute("href", "/admin/approvals/staff-compensation:comp-1");
  });

  it("keeps a Manager-owned amendment request actionable", () => {
    renderRegister({ role: "manager", compensations: [{ ...compensation, lifecycle: "amendment_requested", approvedAmount: null }], position: null });
    fireEvent.click(desktop().getByRole("button", { name: "Staff pay actions" }));
    expect(desktop().getByRole("menuitem", { name: "Amend and resubmit" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1/edit");
  });
});

// The register's question is "do we still owe this person money?", so an
// approved row answers with its canonical payment position. Approval remains
// decision history and keeps its place in detail and audit surfaces.
describe("Staff Pay register status is the payment position", () => {
  it("shows Unpaid, not Approved, for an approved record with nothing paid", () => {
    renderRegister({ compensations: [{ ...compensation, approvedAmount: 700 }], position: position({ paidAmount: 0, balanceAmount: 700, paymentStatus: "unpaid" }) });
    expect(desktop().getByText("Unpaid")).toBeInTheDocument();
    expect(desktop().queryByText("Approved")).not.toBeInTheDocument();
  });

  it("shows exactly Partially Paid — never Part-paid or Partially received", () => {
    renderRegister({ compensations: [compensation], position: position({ paidAmount: 20000, balanceAmount: 40000, paymentStatus: "part_paid" }) });
    expect(desktop().getByText("Partially Paid")).toBeInTheDocument();
    expect(screen.queryByText("Part-paid")).not.toBeInTheDocument();
    expect(screen.queryByText("Part Paid")).not.toBeInTheDocument();
    expect(screen.queryByText("Partially received")).not.toBeInTheDocument();
  });

  it("shows Paid when the approved amount is fully settled", () => {
    renderRegister({ compensations: [{ ...compensation, approvedAmount: 30000 }], position: position({ paidAmount: 30000, balanceAmount: 0, paymentStatus: "paid" }) });
    expect(desktopStatuses().map((chip) => chip.textContent)).toEqual(["Paid"]);
    expect(desktopStatuses()[0]).toHaveAttribute("data-register-status", "payment:paid");
    expect(desktop().queryByText("Approved")).not.toBeInTheDocument();
  });

  it("shows Payment history to confirm for an imported position", () => {
    renderRegister({ compensations: [compensation], position: position({ paidAmount: null, balanceAmount: null, paymentStatus: "payment_history_unknown" }) });
    expect(desktop().getByText("Payment history to confirm")).toBeInTheDocument();
    expect(desktop().queryByText("Approved")).not.toBeInTheDocument();
  });

  it("keeps Draft as Draft before any approval exists", () => {
    renderRegister({ compensations: [{ ...compensation, lifecycle: "draft", approvedAmount: null }], position: null });
    expect(desktop().getByText("Draft")).toBeInTheDocument();
  });

  it("keeps Awaiting review as Awaiting review", () => {
    renderRegister({ compensations: [{ ...compensation, lifecycle: "awaiting_review", approvedAmount: null }], position: null });
    expect(desktop().getByText("Awaiting review")).toBeInTheDocument();
  });

  it("gives the mobile card the same payment-position status as the desktop row", () => {
    renderRegister(mixedRegister);
    const expected = ["Unpaid", "Partially Paid", "Paid", "Payment history to confirm", "Draft", "Awaiting review"];
    expect(mobile().getAllByRole("listitem")).toHaveLength(dataRows().length);
    expect(desktopStatuses().map((chip) => chip.textContent)).toEqual(expected);
    expect(mobileStatuses().map((chip) => chip.textContent)).toEqual(expected);
    expect(mobileStatuses().map((chip) => chip.getAttribute("data-register-status")))
      .toEqual(desktopStatuses().map((chip) => chip.getAttribute("data-register-status")));
    expect(mobileStatuses().map((chip) => chip.textContent)).not.toContain("Approved");
  });
});

describe("Staff Pay summary is a payment position, not an approval count", () => {
  it("labels the first metric Payable rather than Approved", () => {
    renderRegister(mixedRegister);
    expect(summary().getByText("Payable")).toBeInTheDocument();
    expect(summary().queryByText("Approved")).not.toBeInTheDocument();
    expect(summary().getByText("4 payable records")).toBeInTheDocument();
  });

  it("leaves no approval-first wording on any summary hint", () => {
    renderRegister(mixedRegister);
    expect(summary().queryByText(/approved record/i)).not.toBeInTheDocument();
    expect(summary().queryByText("Approved balance")).not.toBeInTheDocument();
  });

  it("calls a fully known Outstanding position a Payable balance", () => {
    // "Payable balance" only replaces the unconfirmed-history hint when every
    // position is known, so this register carries no imported record.
    renderRegister({
      compensations: mixedRegister.compensations.filter((item) => item.id !== "comp-unknown"),
      positions: mixedRegister.positions,
    });
    expect(summary().getByText("Payable balance")).toBeInTheDocument();
    expect(summary().queryByText("Approved balance")).not.toBeInTheDocument();
  });

  it("says no payable records rather than no approved records on an empty register", () => {
    renderRegister();
    expect(summary().getByText("No payable records")).toBeInTheDocument();
    expect(summary().queryByText("No approved records")).not.toBeInTheDocument();
  });

  it("still computes Payable from approved amounts only", () => {
    renderRegister(mixedRegister);
    // 700 + 60,000 + 30,000 + 28,100 — the draft and awaiting-review records
    // carry no approved amount and must not reach this total.
    expect(summary().getByText(money(118800))).toBeInTheDocument();
  });

  it("leaves the Paid total unchanged", () => {
    renderRegister(mixedRegister);
    // Only positions with known history contribute: 20,000 + 30,000 + 0.
    expect(summary().getByText(money(50000))).toBeInTheDocument();
  });

  it("leaves the Outstanding total unchanged", () => {
    renderRegister(mixedRegister);
    // 700 + 40,000 + 0, with the unknown position excluded rather than zeroed.
    expect(summary().getByText(money(40700))).toBeInTheDocument();
    expect(summary().getByText("Outstanding")).toBeInTheDocument();
  });

  it("calls the footer total Payable and keeps Paid and Balance beside it", () => {
    renderRegister(mixedRegister);
    expect(footer().getByText("Payable")).toBeInTheDocument();
    expect(footer().queryByText("Approved")).not.toBeInTheDocument();
    expect(footer().getByText("Paid")).toBeInTheDocument();
    expect(footer().getByText("Balance")).toBeInTheDocument();
  });

  it("names the attention row Partially Paid staff pay from the canonical position", () => {
    renderRegister(mixedRegister);
    expect(screen.getByText("Partially Paid staff pay")).toBeInTheDocument();
    expect(screen.queryByText("Part-paid staff pay")).not.toBeInTheDocument();
    // One record holds part_paid; approval count is irrelevant to it.
    expect(screen.getByText("Partially Paid staff pay").closest("a")).toHaveTextContent("1");
  });
});

describe("Staff Pay balance emphasis", () => {
  it("makes an outstanding Balance stronger than its Paid figure", () => {
    renderRegister({ compensations: [{ ...compensation, approvedAmount: 700 }], position: position({ paidAmount: 0, balanceAmount: 700, paymentStatus: "unpaid" }) });
    // Total and Balance carry the same figure here, so the Balance cell is
    // taken by its own marker rather than by the amount it happens to show.
    const [balance] = desktopBalances();
    expect(balance).toHaveTextContent(money(700));
    expect(balance).toHaveAttribute("data-balance-emphasis", "strong");
    expect(balance.className).toContain("font-bold");
    expect(balance.className).toContain("tabular-nums");
    // The Paid cell in the same row stays ordinary weight.
    const paid = dataRows()[0].cells[7];
    expect(paid).toHaveTextContent(money(0));
    expect(paid.className).toContain("font-normal");
    expect(paid.className).not.toContain("font-bold");
  });

  it("keeps a settled Balance quiet", () => {
    renderRegister({ compensations: [{ ...compensation, approvedAmount: 30000 }], position: position({ paidAmount: 30000, balanceAmount: 0, paymentStatus: "paid" }) });
    const [balance] = desktopBalances();
    expect(balance).toHaveTextContent(money(0));
    expect(balance).toHaveAttribute("data-balance-emphasis", "quiet");
    expect(balance.className).not.toContain("font-bold");
  });

  it("emphasises the mobile Balance too, without emphasising a settled one", () => {
    renderRegister(mixedRegister);
    // Mobile balances, in register order: 700 unpaid, 40,000 part-paid,
    // 0 settled, and an unknown position that must stay blank.
    expect(mobileBalances().map((cell) => [text(cell), cell.getAttribute("data-balance-emphasis")])).toEqual([
      [money(700), "strong"],
      [money(40000), "strong"],
      [money(0), "quiet"],
      ["—", "quiet"],
      ["—", "quiet"],
      ["—", "quiet"],
    ]);
    for (const cell of mobileBalances()) {
      if (cell.getAttribute("data-balance-emphasis") === "strong") expect(cell.className).toContain("font-bold");
      else expect(cell.className).not.toContain("font-bold");
    }
  });

  // At 375px the longest status ("Payment history to confirm") sits beside a
  // long person name and three money figures. Without these guards the card
  // pushes the page into a horizontal scroll — the overflow trap this codebase
  // has hit before.
  it("keeps the mobile card from overflowing at a narrow viewport", () => {
    renderRegister(mixedRegister);
    for (const chip of mobileStatuses()) {
      expect(chip.className).toContain("shrink-0");
      expect(chip.className).toContain("whitespace-nowrap");
    }
    for (const cell of mobileBalances()) {
      expect(cell.className).toContain("truncate");
      expect(cell.parentElement.className).toContain("min-w-0");
    }
  });

  it("never emphasises a balance the Hub does not actually know", () => {
    renderRegister({ compensations: [compensation], position: position({ paidAmount: null, balanceAmount: null, paymentStatus: "payment_history_unknown" }) });
    const cells = desktop().getAllByText("—");
    for (const cell of cells) {
      if (cell.hasAttribute("data-balance-emphasis")) expect(cell).toHaveAttribute("data-balance-emphasis", "quiet");
    }
  });
});

describe("Staff Pay status filter offers what the register displays", () => {
  it("offers the payment positions and no bare Approved status", () => {
    renderRegister(mixedRegister);
    const select = within(screen.getByLabelText("Status"));
    for (const label of ["All statuses", "Draft", "Awaiting review", "Amendment requested", "Unpaid", "Partially Paid", "Paid", "Payment history to confirm", "Rejected", "Withdrawn", "Cancelled"]) {
      expect(select.getByRole("option", { name: label })).toBeInTheDocument();
    }
    expect(select.queryByRole("option", { name: "Approved" })).not.toBeInTheDocument();
  });

  it("filters Unpaid to approved records with nothing paid", () => {
    renderRegister(mixedRegister);
    chooseStatus("Unpaid");
    expect(dataRows()).toHaveLength(1);
    expect(dataRows()[0]).toHaveTextContent(money(700));
    expect(desktopStatuses().map((chip) => chip.getAttribute("data-register-status"))).toEqual(["payment:unpaid"]);
    expect(desktop().queryByText("Partially Paid")).not.toBeInTheDocument();
  });

  it("filters Partially Paid on the payment position rather than the lifecycle", () => {
    renderRegister(mixedRegister);
    chooseStatus("Partially Paid");
    // All four approved records share lifecycle "approved"; only one is
    // part_paid, so a lifecycle filter would have returned four.
    expect(dataRows()).toHaveLength(1);
    expect(desktopStatuses().map((chip) => chip.getAttribute("data-register-status"))).toEqual(["payment:part_paid"]);
    expect(dataRows()[0]).toHaveTextContent(money(40000));
  });

  it("filters Paid on the payment position", () => {
    renderRegister(mixedRegister);
    chooseStatus("Paid");
    expect(dataRows()).toHaveLength(1);
    expect(desktopStatuses().map((chip) => chip.getAttribute("data-register-status"))).toEqual(["payment:paid"]);
    expect(dataRows()[0]).toHaveTextContent(money(30000));
  });

  it("filters the imported positions that still need confirming", () => {
    renderRegister(mixedRegister);
    chooseStatus("Payment history to confirm");
    expect(dataRows()).toHaveLength(1);
    expect(desktopStatuses().map((chip) => chip.getAttribute("data-register-status"))).toEqual(["payment:payment_history_unknown"]);
  });

  it("still filters pre-approval lifecycle states", () => {
    renderRegister(mixedRegister);
    chooseStatus("Draft");
    expect(dataRows()).toHaveLength(1);
    expect(desktopStatuses().map((chip) => chip.getAttribute("data-register-status"))).toEqual(["lifecycle:draft"]);
    chooseStatus("Awaiting review");
    expect(dataRows()).toHaveLength(1);
    expect(desktopStatuses().map((chip) => chip.getAttribute("data-register-status"))).toEqual(["lifecycle:awaiting_review"]);
  });

  it("returns the whole register when the filters are reset", () => {
    renderRegister(mixedRegister);
    chooseStatus("Paid");
    expect(dataRows()).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    expect(dataRows()).toHaveLength(6);
  });

  it("keeps the action menu unchanged under a payment-position filter", () => {
    renderRegister(mixedRegister);
    chooseStatus("Unpaid");
    fireEvent.click(desktop().getByRole("button", { name: "Staff pay actions" }));
    expect(desktop().getByRole("menuitem", { name: "Record payment" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-unpaid#payments");
    expect(desktop().getByRole("menuitem", { name: "View staff pay" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-unpaid");
  });
});
