import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { FundRequestsContext } from "../context/fundRequests";
import AdminFundRequests from "./AdminFundRequests";
import AdminFundRequestDetail from "./AdminFundRequestDetail";
import AdminFundRequestForm from "./AdminFundRequestForm";

const projects = [{ id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false }];
const profiles = [
  { id: "o1", full_name: "Widson Omutelema Ambaisi", role: "owner" },
  { id: "m1", full_name: "Martine Lotom", role: "manager" },
];

const request = {
  id: "r1", requestNumber: "BDFR-2026-000001", projectId: "p1",
  authorityType: "manager_requested", status: "submitted", requesterId: "m1",
  directAuthorityActorId: "", intendedCustodyType: "operations_manager_accountable_advance",
  custodianProfileId: "m1", purpose: "Alego day labour, masonry and mkokoteni cartage",
  currency: "KES", totalRequestedAmount: 23000, submissionRound: 1, version: 2,
  updatedAt: "2026-07-31T09:00:00Z",
};

const allocations = [
  { id: "a1", fundRequestId: "r1", claimId: "c1", allocationOrder: 1, requestedAmount: 8000,
    claimReference: "ICC-AAAAAAAA", claimServiceDate: "2026-07-30", claimRecipientType: "crew",
    claimRecipientLabel: "16 Alego casual workers", claimCategory: "labour",
    claimPurpose: "Sixteen casual workers at KES 500", claimApprovedTotal: 8000 },
  { id: "a2", fundRequestId: "r1", claimId: "c2", allocationOrder: 2, requestedAmount: 12000,
    claimReference: "ICC-BBBBBBBB", claimServiceDate: "2026-07-30", claimRecipientType: "contractor",
    claimRecipientLabel: "Mason Otieno", claimCategory: "mason_subcontract",
    claimPurpose: "Boundary wall masonry", claimApprovedTotal: 12000 },
  { id: "a3", fundRequestId: "r1", claimId: "c3", allocationOrder: 3, requestedAmount: 3000,
    claimReference: "ICC-CCCCCCCC", claimServiceDate: "2026-07-30", claimRecipientType: "service_provider",
    claimRecipientLabel: "Mkokoteni operator", claimCategory: "cart_transport",
    claimPurpose: "Mkokoteni cartage", claimApprovedTotal: 3000 },
];

const events = [
  { id: "e1", fundRequestId: "r1", eventType: "draft_created", actorId: "m1", fromStatus: "",
    toStatus: "draft", requestVersion: 1, submissionRound: 0, reason: "", createdAt: "2026-07-31T08:00:00Z" },
  { id: "e2", fundRequestId: "r1", eventType: "submitted", actorId: "m1", fromStatus: "draft",
    toStatus: "submitted", requestVersion: 2, submissionRound: 1, reason: "", createdAt: "2026-07-31T09:00:00Z" },
];

const availability = [
  { claimId: "c1", projectId: "p1", claimReference: "ICC-AAAAAAAA", serviceDate: "2026-07-30",
    recipientType: "crew", recipientLabel: "16 Alego casual workers", category: "labour",
    purpose: "Sixteen casual workers at KES 500", approvedTotal: 8000, reservedElsewhere: 0,
    requestedInRequest: 0, availableToRequest: 8000 },
  { claimId: "c4", projectId: "p1", claimReference: "ICC-DDDDDDDD", serviceDate: "2026-07-29",
    recipientType: "supplier", recipientLabel: "Murram supplier", category: "materials",
    purpose: "Murram delivery", approvedTotal: 20000, reservedElsewhere: 12000,
    requestedInRequest: 0, availableToRequest: 8000 },
];

function contexts({ role = "owner", requests = [request], overrides = {} } = {}) {
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles },
    fund: {
      requests, allocations, eventsByRequest: { r1: events }, authorisedProjects: projects,
      status: "ready", error: "", profiles,
      allocationsForRequest: (id) => allocations.filter((allocation) => allocation.fundRequestId === id),
      loadEvents: vi.fn(() => Promise.resolve(events)),
      loadAvailability: vi.fn(() => Promise.resolve(availability)),
      refresh: vi.fn(() => Promise.resolve({ ok: true })),
      createDraft: vi.fn(), authoriseDirect: vi.fn(), updateRequest: vi.fn(),
      submitRequest: vi.fn(), withdrawRequest: vi.fn(), decideRequest: vi.fn(), cancelRequest: vi.fn(),
      ...overrides,
    },
  };
}

function wrap(element, values, initial = "/admin/fund-requests") {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminDataContext.Provider value={values.admin}>
        <FundRequestsContext.Provider value={values.fund}>{element}</FundRequestsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>,
  );
}

describe("Fund Requests admin surfaces", () => {
  it("renders the Principal queue in desktop-table and mobile-card layouts with no-release copy", () => {
    const { container } = wrap(<AdminFundRequests />, contexts());
    expect(screen.getByRole("heading", { name: "Fund Requests" })).toBeInTheDocument();
    expect(screen.getByText(/No funds have been released/)).toBeInTheDocument();
    expect(screen.getAllByText("BDFR-2026-000001").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/KES\s*23,000\.00/).length).toBeGreaterThan(1);
    expect(screen.getAllByText("Intended accountable advance").length).toBeGreaterThan(0);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Authorise funds directly" })).toBeInTheDocument();
  });

  it("offers the Operations Manager a request action rather than direct authority", () => {
    wrap(<AdminFundRequests />, contexts({ role: "manager" }));
    expect(screen.getByRole("link", { name: "New fund request" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Authorise funds directly" })).not.toBeInTheDocument();
  });

  it("shows the allocation breakdown, immutable timeline and Principal decisions", () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      contexts(), "/admin/fund-requests/r1",
    );
    expect(screen.getByRole("heading", { name: "BDFR-2026-000001" })).toBeInTheDocument();
    expect(screen.getByText("16 Alego casual workers")).toBeInTheDocument();
    expect(screen.getByText("Mason Otieno")).toBeInTheDocument();
    expect(screen.getByText("Mkokoteni operator")).toBeInTheDocument();
    expect(screen.getByText(/does not record a release or payment/)).toBeInTheDocument();
    expect(screen.getByText("Submitted for Principal decision")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve fund authority" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request amendment" })).toBeDisabled();
  });

  it("recovers from a stale Principal decision without implying a change", async () => {
    const decideRequest = vi.fn(() => Promise.resolve({ ok: false, stale: true, error: "stale" }));
    wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      contexts({ overrides: { decideRequest } }), "/admin/fund-requests/r1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Approve fund authority" }));
    await waitFor(() => expect(screen.getByText(/changed elsewhere/)).toBeInTheDocument());
  });

  it("gives the Operations Manager no Principal controls on a submitted request", () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      contexts({ role: "manager" }), "/admin/fund-requests/r1",
    );
    expect(screen.queryByRole("button", { name: "Approve fund authority" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject request" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw request" })).toBeInTheDocument();
  });

  it("warns that a draft does not reserve and surfaces per-claim availability", async () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/new" element={<AdminFundRequestForm />} /></Routes>,
      contexts({ role: "manager", requests: [] }), "/admin/fund-requests/new",
    );
    expect(screen.getByText(/does not reserve any approved claim value/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Project/), { target: { value: "p1" } });
    await waitFor(() => expect(screen.getByText("Murram supplier")).toBeInTheDocument());
    expect(screen.getAllByText("Available to request").length).toBe(2);
    expect(screen.getAllByText(/KES\s*12,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();
  });

  it("blocks an over-request and keeps form data on a reservation conflict", async () => {
    const createDraft = vi.fn(() => Promise.resolve({
      ok: false, conflict: true,
      error: "Claim Murram supplier: KES 12000 of KES 20000 is already reserved by another fund request",
    }));
    wrap(
      <Routes><Route path="/admin/fund-requests/new" element={<AdminFundRequestForm />} /></Routes>,
      contexts({ role: "manager", requests: [], overrides: { createDraft } }), "/admin/fund-requests/new",
    );
    fireEvent.change(screen.getByLabelText(/Project/), { target: { value: "p1" } });
    await waitFor(() => expect(screen.getByText("Murram supplier")).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.change(screen.getByLabelText(/Requested amount/), { target: { value: "9000" } });
    expect(screen.getByText(/exceeds the amount still available to request/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Requested amount/), { target: { value: "8000" } });
    fireEvent.change(screen.getByLabelText(/Purpose or note/), { target: { value: "Murram balance" } });
    fireEvent.change(screen.getByLabelText(/Intended custody/), { target: { value: "direct_recipient_funding" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(screen.getByText(/Availability has been refreshed and nothing was saved/)).toBeInTheDocument());
    expect(screen.getByLabelText(/Requested amount/)).toHaveValue(8000);
    expect(screen.getByLabelText(/Purpose or note/)).toHaveValue("Murram balance");
  });

  it("uses a distinct Principal direct-authority form with no submit step", async () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/new" element={<AdminFundRequestForm />} /></Routes>,
      contexts({ role: "owner", requests: [] }), "/admin/fund-requests/new",
    );
    expect(screen.getByRole("heading", { name: "Authorise funds directly" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Authorise funds" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/does not reserve any approved claim value/)).not.toBeInTheDocument();
  });
});
