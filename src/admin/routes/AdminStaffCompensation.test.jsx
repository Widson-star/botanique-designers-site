import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { PeopleContext } from "../context/people";
import { StaffCompensationContext } from "../context/staffCompensation";
import AdminStaffCompensation from "./AdminStaffCompensation";

const person = { id: "person-1", fullName: "Martine Lotom", isActive: true };
const project = { id: "project-1", projectName: "Lugulu Residential Home" };
const compensation = {
  id: "comp-1", personId: "person-1", projectId: "project-1", serviceDate: "2026-08-16",
  compensationType: "compensation", description: "Site operations pay",
  lifecycle: "approved", submittedAmount: 60000, approvedAmount: 60000,
  requesterId: "manager-1", deciderId: "owner-1", requestRound: 1, version: 3,
};

function renderRegister({ role = "owner", compensations = [], position = null, payments = [] } = {}) {
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={{ role, currentUserId: role === "owner" ? "owner-1" : "manager-1", projects: [project] }}>
        <PeopleContext.Provider value={{ people: [person] }}>
          <StaffCompensationContext.Provider value={{ compensations, payments, paymentPositionForCompensation: vi.fn(() => position), status: "ready", error: "" }}>
            <AdminStaffCompensation />
          </StaffCompensationContext.Provider>
        </PeopleContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
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

  it("shows full name once per row, renders ordinary type as Pay, and exposes row actions", () => {
    renderRegister({ compensations: [compensation], position: { compensationId: "comp-1", paidAmount: 30000, balanceAmount: 30000, paymentStatus: "part_paid" } });
    for (const heading of ["#", "Date", "Person", "Type", "Project", "Status", "Total", "Paid", "Balance", "Action"]) expect(screen.getByRole("columnheader", { name: heading })).toBeInTheDocument();
    expect(screen.getByText("Pay")).toBeInTheDocument();
    expect(screen.getByText("Martine Lotom")).toBeInTheDocument();
    expect(screen.queryByText("ML")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Staff pay actions" }));
    expect(screen.getByRole("menuitem", { name: "Record payment" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1#payments");
    expect(screen.getByRole("menuitem", { name: "View staff pay" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1");
  });

  it("offers Resolve payment history instead of inventing a balance for imported approved pay", () => {
    renderRegister({
      compensations: [{ ...compensation, paymentHistoryKnown: false, legacySourceClaimId: "legacy-1" }],
      position: { compensationId: "comp-1", paidAmount: null, balanceAmount: null, paymentStatus: "payment_history_unknown" },
    });
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
    expect(screen.queryByText("KES 0.00")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Staff pay actions" }));
    expect(screen.getByRole("menuitem", { name: "Resolve payment history" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1#payment-history");
    expect(screen.getByRole("menuitem", { name: "View original Project Cost" })).toHaveAttribute("href", "/admin/site-costs/legacy-1");
  });

  it("routes an awaiting Principal decision to Approvals", () => {
    renderRegister({ role: "owner", compensations: [{ ...compensation, lifecycle: "awaiting_review", approvedAmount: null }], position: null });
    fireEvent.click(screen.getByRole("button", { name: "Staff pay actions" }));
    expect(screen.getByRole("menuitem", { name: "Review in Approvals" })).toHaveAttribute("href", "/admin/approvals/staff-compensation:comp-1");
  });

  it("keeps a Manager-owned amendment request actionable", () => {
    renderRegister({ role: "manager", compensations: [{ ...compensation, lifecycle: "amendment_requested", approvedAmount: null }], position: null });
    fireEvent.click(screen.getByRole("button", { name: "Staff pay actions" }));
    expect(screen.getByRole("menuitem", { name: "Amend and resubmit" })).toHaveAttribute("href", "/admin/finance/staff-compensation/comp-1/edit");
  });
});
