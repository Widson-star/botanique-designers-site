import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import { StaffCompensationContext } from "../context/staffCompensation";
import AdminStaffCompensation from "./AdminStaffCompensation";

const person = { id: "person-1", fullName: "Martine Lotom", isActive: true };
const compensation = {
  id: "comp-1", personId: "person-1", projectId: "", serviceDate: "2026-08-16",
  compensationType: "compensation", description: "Site operations compensation",
  lifecycle: "approved", submittedAmount: 60000, approvedAmount: 60000,
  requesterId: "manager-1", deciderId: "owner-1", requestRound: 1, version: 3,
};

function renderRegister({ role = "owner", compensations = [], position = null } = {}) {
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{ role, projects: [] }}>
        <PeopleContext.Provider value={{ people: [person] }}>
          <StaffCompensationContext.Provider value={{
            compensations,
            paymentPositionForCompensation: vi.fn(() => position),
            status: "ready",
            error: "",
          }}>
            <AdminStaffCompensation />
          </StaffCompensationContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("Staff Compensation register", () => {
  it("shows a truthful empty state without fabricating staff financial records", () => {
    renderRegister();
    expect(screen.getByText("No Staff Compensation has been recorded yet.")).toBeInTheDocument();
    expect(screen.getByText("KES 0.00")).toBeInTheDocument();
  });

  it("keeps the person primary, allows no Project context, and derives payment truth", () => {
    renderRegister({
      compensations: [compensation],
      position: { compensationId: "comp-1", paidAmount: 30000, balanceAmount: 30000, paymentStatus: "part_paid" },
    });
    expect(screen.getAllByText("Martine Lotom").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KES 60,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KES 30,000.00").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1");
    expect(screen.queryByText("Authorised project")).not.toBeInTheDocument();
  });

  it("lets the manager start a compensation record while the Principal uses Approvals for decisions", () => {
    const { rerender } = renderRegister({ role: "manager" });
    expect(screen.getByRole("link", { name: "New compensation" })).toHaveAttribute("href", "/admin/finance/staff-compensation/new");

    rerender(
      <MemoryRouter>
        <AdminDataContext.Provider value={{ role: "owner", projects: [] }}>
          <PeopleContext.Provider value={{ people: [person] }}>
            <StaffCompensationContext.Provider value={{ compensations: [{ ...compensation, lifecycle: "awaiting_review", approvedAmount: null }], paymentPositionForCompensation: vi.fn(() => null), status: "ready", error: "" }}>
              <AdminStaffCompensation />
            </StaffCompensationContext.Provider>
          </PeopleContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.queryByRole("link", { name: "New compensation" })).not.toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
