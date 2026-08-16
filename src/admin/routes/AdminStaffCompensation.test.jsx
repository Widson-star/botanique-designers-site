import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import { StaffCompensationContext } from "../context/staffCompensation";
import AdminStaffCompensation from "./AdminStaffCompensation";

const person = { id: "person-1", fullName: "Martine Lotom", isActive: true };
const project = { id: "project-1", projectName: "Lugulu Residential Home" };
const compensation = {
  id: "comp-1", personId: "person-1", projectId: "project-1", serviceDate: "2026-08-16",
  compensationType: "compensation", description: "Site operations compensation",
  lifecycle: "approved", submittedAmount: 60000, approvedAmount: 60000,
  requesterId: "manager-1", deciderId: "owner-1", requestRound: 1, version: 3,
};

function renderRegister({ role = "owner", compensations = [], position = null, payments = [] } = {}) {
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{ role, currentUserId: role === "owner" ? "owner-1" : "manager-1", projects: [project] }}>
        <PeopleContext.Provider value={{ people: [person] }}>
          <StaffCompensationContext.Provider value={{
            compensations,
            payments,
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

describe("Staff Compensation working surface", () => {
  it("uses the approved actions and defaults filters to the whole register", () => {
    renderRegister();
    expect(screen.getByRole("link", { name: /New compensation/i })).toHaveAttribute("href", "/admin/finance/staff-compensation/new");
    expect(screen.getByRole("link", { name: /Open Approvals/i })).toHaveAttribute("href", "/admin/approvals");
    expect(screen.getByRole("option", { name: "All people" }).selected).toBe(true);
    expect(screen.getByRole("option", { name: "All statuses" }).selected).toBe(true);
    expect(screen.getByRole("option", { name: "All projects" }).selected).toBe(true);
    expect(screen.getByText("No Staff Compensation has been recorded yet.")).toBeInTheDocument();
  });

  it("renders the approved register columns with Person primary and optional Project context", () => {
    renderRegister({
      compensations: [compensation],
      position: { compensationId: "comp-1", paidAmount: 30000, balanceAmount: 30000, paymentStatus: "part_paid" },
    });
    for (const heading of ["#", "Date", "Person", "Type", "Project", "Status", "Total", "Paid", "Balance", "Action"]) {
      expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    }
    expect(screen.getAllByText("Martine Lotom").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Lugulu Residential Home").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KES 60,000.00").length).toBeGreaterThan(0);
    expect(screen.getAllByText("KES 30,000.00").length).toBeGreaterThan(1);
    expect(screen.getByRole("link", { name: "View" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1");
  });

  it("does not manufacture paid or outstanding values for imported historical records", () => {
    renderRegister({
      compensations: [{ ...compensation, paymentHistoryKnown: false, legacySourceClaimId: "legacy-1" }],
      position: { compensationId: "comp-1", paidAmount: null, balanceAmount: null, paymentStatus: "payment_history_unknown" },
    });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/historical record unconfirmed/i)).toBeInTheDocument();
    expect(screen.queryByText("KES 0.00")).not.toBeInTheDocument();
  });

  it("lets the Principal start compensation and routes awaiting requests to Approvals", () => {
    renderRegister({
      role: "owner",
      compensations: [{ ...compensation, lifecycle: "awaiting_review", approvedAmount: null }],
      position: null,
    });
    expect(screen.getByRole("link", { name: /New compensation/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Review" })).toHaveAttribute("href", "/admin/approvals/staff-compensation:comp-1");
  });

  it("keeps a Manager-owned draft editable", () => {
    renderRegister({
      role: "manager",
      compensations: [{ ...compensation, lifecycle: "draft", approvedAmount: null }],
      position: null,
    });
    expect(screen.getByRole("link", { name: "Edit" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1/edit");
  });
});
