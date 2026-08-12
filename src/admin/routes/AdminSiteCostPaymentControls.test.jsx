import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import AdminSiteCostDetail from "./AdminSiteCostDetail";

const projects = [{ id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false }];
const profiles = [
  { id: "o1", full_name: "Widson Omutelema Ambaisi", role: "owner" },
  { id: "m1", full_name: "Martine Lotom", role: "manager" },
];
const claim = {
  id: "c1", projectId: "p1", dailySiteEntryId: null, dailySiteSourceVersion: null,
  dailySiteSnapshot: null, serviceDate: "2026-08-12", recipientType: "crew",
  recipientLabel: "Alego crew", category: "labour", currency: "KES",
  purpose: "Cabro arrangement", lifecycle: "approved", requestRound: 1,
  submittedTotal: 5350, approvedTotal: 5350, requesterId: "m1", deciderId: "o1", version: 3,
  updatedAt: "2026-08-12T16:35:45Z",
};
const lines = [
  { id: "l1", claimId: "c1", lineNumber: 1, description: "Cabro crew", rateType: "daily", quantity: 1, unit: "job", unitRate: 5000, lineTotal: 5000 },
  { id: "l2", claimId: "c1", lineNumber: 2, description: "Cartage", rateType: "fixed", quantity: 1, unit: "trip", unitRate: 350, lineTotal: 350 },
];

function renderDetail({ role = "owner", payments = [], position = null, completePaymentHistory = vi.fn(() => Promise.resolve({ ok: true })), reversePayment = vi.fn(() => Promise.resolve({ ok: true })) } = {}) {
  const admin = { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles };
  const costs = {
    claims: [claim], lines, eventsByClaim: { c1: [] }, authorisedProjects: projects,
    status: "ready", error: "", refresh: vi.fn(() => Promise.resolve({ ok: true })),
    loadEvents: vi.fn(() => Promise.resolve([])), linesForClaim: (id) => lines.filter((line) => line.claimId === id),
    paymentsForClaim: (id) => payments.filter((payment) => payment.claimId === id),
    paymentPositionForClaim: () => position,
    submitClaim: vi.fn(), withdrawClaim: vi.fn(), decideClaim: vi.fn(), cancelClaim: vi.fn(),
    recordPayment: vi.fn(() => Promise.resolve({ ok: true })), completePaymentHistory, reversePayment,
  };
  render(
    <MemoryRouter initialEntries={["/admin/site-costs/c1"]}>
      <AdminDataContext.Provider value={admin}>
        <DailySiteOperationsContext.Provider value={{ entries: [] }}>
          <SiteCostsContext.Provider value={costs}>
            <Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>
          </SiteCostsContext.Provider>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
  return { completePaymentHistory, reversePayment, costs };
}

describe("Project Cost payment controls", () => {
  it("lets the Principal confirm a genuine zero-payment historical record without fabricating a payment", async () => {
    const user = userEvent.setup();
    const completePaymentHistory = vi.fn(() => Promise.resolve({ ok: true }));
    renderDetail({ completePaymentHistory });

    expect(screen.getByText("Payment history not yet confirmed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm payment history" })).toBeInTheDocument();
    expect(screen.getByText(/If no payments were ever made/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm payment history" }));
    await waitFor(() => expect(completePaymentHistory).toHaveBeenCalledWith("c1"));
  });

  it("keeps direct Project Cost payment authority Principal-only in the UI", () => {
    renderDetail({ role: "manager" });
    expect(screen.queryByRole("button", { name: "Confirm payment history" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse payment" })).not.toBeInTheDocument();
  });

  it("lets the Principal reverse a recorded payment with a required reason", async () => {
    const user = userEvent.setup();
    const reversePayment = vi.fn(() => Promise.resolve({ ok: true }));
    const payment = {
      id: "pay1", paymentNumber: "BDPAY-2026-000001", claimId: "c1", status: "recorded",
      currency: "KES", amount: 3000, paidAt: "2026-08-10", paymentChannel: "mpesa",
      paymentReference: "ABC123", note: "", recordedBy: "o1", recordedAt: "2026-08-10T09:00:00Z",
      reversedBy: "", reversedAt: "", reversalReason: "", version: 2,
    };
    renderDetail({ payments: [payment], position: { claimId: "c1", historyComplete: true, paymentCount: 1, paidAmount: 3000, balanceAmount: 2350 }, reversePayment });

    await user.click(screen.getByRole("button", { name: "Reverse payment" }));
    const confirm = screen.getByRole("button", { name: "Confirm reversal" });
    expect(confirm).toBeDisabled();

    await user.type(screen.getByLabelText("Why is this payment being reversed?"), "Duplicate entry");
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    await waitFor(() => expect(reversePayment).toHaveBeenCalledWith("pay1", 2, "Duplicate entry"));
  });

  it("shows a reversed payment as history rather than offering a second reversal", () => {
    const payment = {
      id: "pay1", paymentNumber: "BDPAY-2026-000001", claimId: "c1", status: "reversed",
      currency: "KES", amount: 3000, paidAt: "2026-08-10", paymentChannel: "mpesa",
      paymentReference: "ABC123", note: "", recordedBy: "o1", recordedAt: "2026-08-10T09:00:00Z",
      reversedBy: "o1", reversedAt: "2026-08-12T10:00:00Z", reversalReason: "Duplicate entry", version: 3,
    };
    renderDetail({ payments: [payment], position: { claimId: "c1", historyComplete: true, paymentCount: 0, paidAmount: 0, balanceAmount: 5350 } });
    expect(screen.getByText("Reversed: Duplicate entry")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reverse payment" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Post-live presentation corrections, 12 Aug 2026.
// ---------------------------------------------------------------------------
describe("Project Cost detail — post-live presentation", () => {
  const paid = {
    id: "pay1", claimId: "c1", paymentNumber: "BDPAY-2026-000001", status: "recorded",
    currency: "KES", amount: 5350, paidAt: "2026-08-12", paymentChannel: "mpesa",
    paymentReference: "QGH7X2LMNP", note: "", recordedBy: "o1",
    recordedAt: "2026-08-12T17:00:00Z", version: 1,
  };
  const settled = { claimId: "c1", historyComplete: true, paymentCount: 1, paidAmount: 5350, balanceAmount: 0 };

  it("names the amount by the lifecycle it is actually in", () => {
    renderDetail({ role: "owner" });
    // The seeded claim is approved.
    expect(screen.getByText("Approved amount")).toBeInTheDocument();
    expect(screen.queryByText("Current amount")).not.toBeInTheDocument();
  });

  it("renders a human payment method, never the stored enum", () => {
    renderDetail({ role: "owner", payments: [paid], position: settled });
    expect(screen.getByText(/M-Pesa/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\bmpesa\b/);
  });

  it("reads bank transfer, cash and other in plain words", () => {
    renderDetail({
      role: "owner",
      payments: [
        { ...paid, id: "pay2", paymentChannel: "bank_transfer", amount: 3000 },
        { ...paid, id: "pay3", paymentChannel: "cash", amount: 1000 },
        { ...paid, id: "pay4", paymentChannel: "other", amount: 1350 },
      ],
      position: settled,
    });
    expect(screen.getByText(/Bank transfer/)).toBeInTheDocument();
    expect(screen.getByText(/Cash/)).toBeInTheDocument();
    expect(screen.getByText(/Other/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/bank_transfer/);
  });

  it("keeps the stored channel value untouched when recording", async () => {
    const user = userEvent.setup();
    const { costs } = renderDetail({ role: "owner" });
    await user.type(screen.getByLabelText("Amount"), "100");
    await user.click(screen.getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(costs.recordPayment).toHaveBeenCalledTimes(1));
    // The database enum is sent, not the label.
    expect(costs.recordPayment.mock.calls[0][1].paymentChannel).toBe("mpesa");
  });

  it("stops leading with cancellation once the cost is approved and paid in full", () => {
    renderDetail({ role: "owner", payments: [paid], position: settled });
    // No standing Principal action panel exists solely to offer cancellation.
    expect(screen.queryByRole("heading", { name: "Principal action" })).not.toBeInTheDocument();
    expect(screen.queryByText("Reason or instructions")).not.toBeInTheDocument();
  });

  it("keeps cancellation reachable as a subordinate exceptional action", async () => {
    const user = userEvent.setup();
    const { costs } = renderDetail({ role: "owner", payments: [paid], position: settled });
    await user.click(screen.getByText("More actions"));
    const cancel = screen.getByRole("button", { name: "Cancel approved Project Cost" });
    expect(cancel).toBeInTheDocument();
    // Still refuses without a stated reason.
    expect(cancel).toBeDisabled();

    await user.type(screen.getByLabelText(/Reason for cancelling/), "Duplicate of BDPAY-2026-000002");
    expect(cancel).toBeEnabled();
    await user.click(cancel);
    await waitFor(() => expect(costs.cancelClaim).toHaveBeenCalledTimes(1));
    expect(costs.cancelClaim.mock.calls[0][2]).toBe("Duplicate of BDPAY-2026-000002");
  });

  it("keeps the standing Principal panel while a balance remains", () => {
    renderDetail({
      role: "owner", payments: [{ ...paid, amount: 3000 }],
      position: { claimId: "c1", historyComplete: true, paymentCount: 1, paidAmount: 3000, balanceAmount: 2350 },
    });
    expect(screen.getByRole("heading", { name: "Principal action" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel approved Project Cost" })).toBeInTheDocument();
  });
});
