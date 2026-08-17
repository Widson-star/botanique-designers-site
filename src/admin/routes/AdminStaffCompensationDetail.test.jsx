import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import { StaffCompensationContext } from "../context/staffCompensation";
import AdminStaffCompensationDetail from "./AdminStaffCompensationDetail";

const person = { id: "person-1", fullName: "Martine Lotom", isActive: true };
const project = { id: "project-1", projectName: "Karen Residence HSE 19" };
const baseRecord = {
  id: "comp-1",
  personId: "person-1",
  projectId: "project-1",
  serviceDate: "2026-08-16",
  compensationType: "compensation",
  description: "Historical staff pay",
  lifecycle: "approved",
  submittedAmount: 60000,
  approvedAmount: 60000,
  requesterId: "manager-1",
  deciderId: "owner-1",
  requestRound: 1,
  version: 3,
  legacySourceClaimId: "legacy-1",
};

function renderDetail({ record = baseRecord, position, confirmPaymentHistory = vi.fn(), correctPaymentHistory = vi.fn() } = {}) {
  const refresh = vi.fn().mockResolvedValue({ ok: true });
  const loadEvents = vi.fn().mockResolvedValue([]);
  render(
    <MemoryRouter initialEntries={["/admin/finance/staff-compensation/comp-1#payment-history"]}>
      <AdminDataContext.Provider value={{
        role: "owner",
        currentUserId: "owner-1",
        projects: [project],
        profiles: [
          { id: "owner-1", full_name: "Widson O. Ambaisi" },
          { id: "manager-1", full_name: "Martine Lotom" },
        ],
      }}>
        <PeopleContext.Provider value={{ people: [person] }}>
          <StaffCompensationContext.Provider value={{
            compensations: [record],
            eventsByCompensation: { "comp-1": [] },
            loadEvents,
            submitRecord: vi.fn(),
            withdrawRecord: vi.fn(),
            cancelRecord: vi.fn(),
            paymentsForCompensation: vi.fn(() => []),
            paymentPositionForCompensation: vi.fn(() => position),
            recordPayment: vi.fn(),
            reversePayment: vi.fn(),
            confirmPaymentHistory,
            correctPaymentHistory,
            refresh,
            status: "ready",
          }}>
            <Routes>
              <Route path="/admin/finance/staff-compensation/:compensationId" element={<AdminStaffCompensationDetail />} />
            </Routes>
          </StaffCompensationContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
  return { confirmPaymentHistory, correctPaymentHistory };
}

describe("Staff Pay historical settlement", () => {
  it("requires an amount already paid and passes it separately from the evidence note", async () => {
    const confirmPaymentHistory = vi.fn().mockResolvedValue({ ok: true });
    renderDetail({
      record: { ...baseRecord, paymentHistoryKnown: false, historicalPaidAmount: 0 },
      position: {
        compensationId: "comp-1",
        approvedAmount: 60000,
        paymentCount: 0,
        historicalPaidAmount: null,
        paidAmount: null,
        balanceAmount: null,
        paymentStatus: "payment_history_unknown",
      },
      confirmPaymentHistory,
    });

    expect(screen.getByText("Historical payment position not yet confirmed")).toBeInTheDocument();
    expect(screen.getByText(/Hub will not invent an old payment date, method or reference/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Amount already paid (KES)"), { target: { value: "15000" } });
    fireEvent.change(screen.getByLabelText("Confirmation note"), { target: { value: "Checked the old M-Pesa and Project Cost records." } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm payment position" }));

    await waitFor(() => expect(confirmPaymentHistory).toHaveBeenCalledWith(
      "comp-1",
      3,
      15000,
      "Checked the old M-Pesa and Project Cost records.",
    ));
  });

  it("shows confirmed historical paid money separately and exposes only the remaining balance for real payment", () => {
    renderDetail({
      record: {
        ...baseRecord,
        paymentHistoryKnown: true,
        historicalPaidAmount: 15000,
        paymentHistoryConfirmedBy: "owner-1",
        paymentHistoryConfirmedAt: "2026-08-17T09:00:00Z",
        paymentHistoryNote: "Checked old payment evidence.",
      },
      position: {
        compensationId: "comp-1",
        approvedAmount: 60000,
        paymentCount: 0,
        historicalPaidAmount: 15000,
        paidAmount: 15000,
        balanceAmount: 45000,
        paymentStatus: "part_paid",
      },
    });

    expect(screen.getByText("Historical amount already paid")).toBeInTheDocument();
    expect(screen.getAllByText(/KES\s*15,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/KES\s*45,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText("Settle remaining balance")).toBeInTheDocument();
    expect(screen.getByText(/using its actual amount, date and method/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Correct historical position" })).toBeInTheDocument();
  });
});
