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
