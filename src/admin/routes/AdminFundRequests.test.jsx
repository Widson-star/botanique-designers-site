import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { FundRequestsContext } from "../context/fundRequests";
import AdminFundRequests from "./AdminFundRequests";
import AdminFundRequestDetail from "./AdminFundRequestDetail";
import AdminFundRequestForm from "./AdminFundRequestForm";
import { deriveFinancialPosition } from "../utils/fundReleaseCapabilities";

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

function contexts({
  role = "owner", requests = [request], releases = [], acquittals = [],
  acquittalLines = [], overrides = {},
} = {}) {
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles },
    fund: {
      requests, allocations, eventsByRequest: { r1: events }, authorisedProjects: projects,
      status: "ready", error: "", profiles, releases, acquittals, acquittalLines,
      allocationsForRequest: (id) => allocations.filter((allocation) => allocation.fundRequestId === id),
      releasesForRequest: (id) => releases.filter((release) => release.fundRequestId === id),
      acquittalForRelease: (id) => acquittals.find((acquittal) => acquittal.fundReleaseId === id) || null,
      linesForAcquittal: (id) => acquittalLines.filter((line) => line.acquittalId === id),
      positionForRequest: (id) => deriveFinancialPosition(
        requests.find((item) => item.id === id), releases, acquittals),
      loadEvents: vi.fn(() => Promise.resolve(events)),
      loadAvailability: vi.fn(() => Promise.resolve(availability)),
      refresh: vi.fn(() => Promise.resolve({ ok: true })),
      createDraft: vi.fn(), authoriseDirect: vi.fn(), updateRequest: vi.fn(),
      submitRequest: vi.fn(), withdrawRequest: vi.fn(), decideRequest: vi.fn(), cancelRequest: vi.fn(),
      recordRelease: vi.fn(() => Promise.resolve({ ok: true })),
      reverseRelease: vi.fn(() => Promise.resolve({ ok: true })),
      confirmReceipt: vi.fn(() => Promise.resolve({ ok: true })),
      submitAcquittal: vi.fn(() => Promise.resolve({ ok: true })),
      decideAcquittal: vi.fn(() => Promise.resolve({ ok: true })),
      ...overrides,
    },
  };
}

const approved = { ...request, status: "approved", version: 3 };
const advanceRelease = {
  id: "rel1", releaseNumber: "BDRL-2026-000001", fundRequestId: "r1", status: "recorded",
  custodyDisposition: "operations_manager_accountable_advance", recipientProfileId: "m1",
  recipientLabel: "", currency: "KES", releasedAmount: 10000,
  releasedAt: "2026-08-01T09:00:00Z", paymentChannel: "mpesa", paymentReference: "QGH7X2LMNP",
  note: "", recordedBy: "o1", recordedAt: "2026-08-01T09:05:00Z", receiptConfirmedBy: "",
  receiptConfirmedAt: "", reversedBy: "", reversedAt: "", reversalReason: "", version: 1,
};
const directRelease = {
  ...advanceRelease, id: "rel2", releaseNumber: "BDRL-2026-000002",
  custodyDisposition: "direct_recipient_funding", recipientProfileId: "",
  recipientLabel: "Siaya Hardware", releasedAmount: 23000, paymentChannel: "bank_transfer",
};

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

  // BD-FIN-01C. Approval is not payment, and payment is not reconciliation.
  function detail(values) {
    return wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      values, "/admin/fund-requests/r1",
    );
  }

  it("reads approved but unpaid until a release is recorded, and offers the Principal the action", () => {
    detail(contexts({ requests: [approved] }));
    expect(screen.getByText("Approved — unpaid")).toBeInTheDocument();
    expect(screen.getByText(/No funds have been released/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Record a release" })).toBeInTheDocument();
    // Nothing claims money moved, and nothing claims a reconciliation is owed.
    expect(screen.queryByText(/Reconciliation outstanding/)).not.toBeInTheDocument();
  });

  it("gives the Operations Manager no way to fabricate a release", () => {
    detail(contexts({ role: "manager", requests: [approved] }));
    expect(screen.getByText("Approved — unpaid")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Record a release" })).not.toBeInTheDocument();
  });

  it("records a release against the remaining authority and stops offering it once exhausted", async () => {
    const recordRelease = vi.fn(() => Promise.resolve({ ok: true }));
    detail(contexts({ requests: [approved], overrides: { recordRelease } }));
    fireEvent.click(screen.getByRole("button", { name: "Record a release" }));
    // The form opens pre-set to the intended custody and the remaining authority.
    expect(screen.getByLabelText(/Amount released/)).toHaveValue(23000);
    expect(screen.getByText(/must account for how it was spent/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Amount released/), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText(/Date released/), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Record release" }));
    await waitFor(() => expect(recordRelease).toHaveBeenCalledTimes(1));
    expect(recordRelease.mock.calls[0][1]).toMatchObject({
      releasedAmount: "10000",
      custodyDisposition: "operations_manager_accountable_advance",
      recipientProfileId: "m1",
    });
  });

  it("shows a partly funded position, the remaining amount and the outstanding advance", () => {
    detail(contexts({ requests: [approved], releases: [advanceRelease] }));
    expect(screen.getByText("Funded — reconciliation outstanding")).toBeInTheDocument();
    expect(screen.getByText(/KES\s*13,000\.00/)).toBeInTheDocument();
    expect(screen.getByText(/10,000\.00 of the KES 23,000\.00 authorised has been released/)).toBeInTheDocument();
    expect(screen.getByText(/Reconciliation outstanding/)).toBeInTheDocument();
  });

  it("does not demand a reconciliation, or an acknowledgement, for a direct supplier payment", () => {
    detail(contexts({ requests: [approved], releases: [directRelease] }));
    expect(screen.getByText("Financially settled")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Siaya Hardware/ }));
    expect(screen.getByText(/No accountable-advance reconciliation is\s+required/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Account for this advance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm I received this" })).not.toBeInTheDocument();
  });

  it("lets the accountable manager, and only them, account for an advance", () => {
    const asManager = contexts({ role: "manager", requests: [approved], releases: [advanceRelease] });
    detail(asManager);
    fireEvent.click(screen.getByRole("button", { name: /Martine/ }));
    expect(screen.getByRole("button", { name: "Confirm I received this" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Account for this advance" })).toBeInTheDocument();
    // The Principal holds the money for nobody, so they get no acquittal action.
    expect(screen.queryByRole("button", { name: "Reverse this release" })).not.toBeInTheDocument();
  });

  it("states the outcome as the reconciliation is entered, and submits the lines", async () => {
    const submitAcquittal = vi.fn(() => Promise.resolve({ ok: true }));
    detail(contexts({
      role: "manager", requests: [approved], releases: [advanceRelease],
      overrides: { submitAcquittal },
    }));
    fireEvent.click(screen.getByRole("button", { name: /Martine/ }));
    fireEvent.click(screen.getByRole("button", { name: "Account for this advance" }));
    const [description] = screen.getAllByPlaceholderText("What was bought or paid for");
    fireEvent.change(description, { target: { value: "Casual workers" } });
    fireEvent.change(screen.getAllByPlaceholderText("Amount")[0], { target: { value: "6500" } });
    // Released 10,000 and spent 6,500 with nothing returned leaves 3,500 unaccounted for.
    expect(screen.getByText(/3,500\.00 unaccounted for/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Amount returned/), { target: { value: "3500" } });
    expect(screen.getByText("this balances")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit reconciliation" }));
    await waitFor(() => expect(submitAcquittal).toHaveBeenCalledTimes(1));
    const [releaseId, version, values] = submitAcquittal.mock.calls[0];
    expect(releaseId).toBe("rel1");
    expect(version).toBe(1);
    expect(values.returnedAmount).toBe("3500");
    expect(values.lines[0]).toMatchObject({ description: "Casual workers", amount: "6500" });
  });

  it("requires a stated reason before the Principal can close an unbalanced reconciliation", async () => {
    const decideAcquittal = vi.fn(() => Promise.resolve({ ok: true }));
    const unbalanced = {
      id: "acq1", fundReleaseId: "rel1", state: "submitted", releasedAmountSnapshot: 10000,
      actualSpendTotal: 7000, returnedAmount: 0, varianceAmount: 3000, evidenceReference: "",
      note: "", submittedBy: "m1", acceptedBy: "", varianceOverrideReason: "", version: 1,
    };
    detail(contexts({
      requests: [approved], releases: [advanceRelease], acquittals: [unbalanced],
      acquittalLines: [{ id: "l1", acquittalId: "acq1", lineNumber: 1, description: "Casual workers", category: "labour", amount: 7000, spentOn: "2026-08-01" }],
      overrides: { decideAcquittal },
    }));
    fireEvent.click(screen.getByRole("button", { name: /Martine/ }));
    expect(screen.getByText("Unaccounted")).toBeInTheDocument();
    expect(screen.getByText(/This does not balance/)).toBeInTheDocument();
    // Accepting is blocked until the reason exists; the balance is never silently zeroed.
    expect(screen.getByRole("button", { name: "Accept reconciliation" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/This does not balance/), {
      target: { value: "Carried forward to the next advance by agreement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept reconciliation" }));
    await waitFor(() => expect(decideAcquittal).toHaveBeenCalledWith(
      "acq1", 1, "accepted", "Carried forward to the next advance by agreement"));
  });

  it("does not offer to cancel an authority that money has already moved against", () => {
    detail(contexts({ requests: [approved], releases: [advanceRelease] }));
    expect(screen.queryByRole("button", { name: "Cancel approved request" })).not.toBeInTheDocument();
    detail(contexts({ requests: [approved] }));
    expect(screen.getByRole("button", { name: "Cancel approved request" })).toBeInTheDocument();
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
