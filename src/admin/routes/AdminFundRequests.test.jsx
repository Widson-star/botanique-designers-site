import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { FundRequestsContext } from "../context/fundRequests";
import AdminAdvances from "./AdminAdvances";
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

// FOUNDER AMENDMENT, 11 Aug 2026. Finance has five business areas and Advances
// is one of them. "Funding", standalone "Payments" and standalone
// "Reconciliation" are rejected as user-facing concepts. An Advance is money
// issued beforehand to an accountable person, and accounting for it happens
// inside the Advance. The fund_request / fund_release / acquittal rows beneath
// are implementation detail and keep their names; the interface must not.
describe("Advances admin surfaces", () => {
  // The superseded fund-request list component is deleted, not merely unrouted.
  // It carried the rejected "Funding, Payments & Reconciliation" vocabulary, and
  // leaving an unreachable copy of it in the tree invites the abandoned model
  // back. The fund_request / fund_release / acquittal DATABASE objects keep
  // their names — those are implementation, not interface.
  it("no longer ships the superseded fund-request list component", () => {
    expect(existsSync("src/admin/routes/AdminFundRequests.jsx")).toBe(false);
    // The route survives; Advances is what it mounts.
    const app = readFileSync("src/admin/AdminApp.jsx", "utf8");
    expect(app).toMatch(/path="\/admin\/fund-requests" element=\{<AdminAdvances \/>\}/);
    expect(app).not.toMatch(/AdminFundRequests\b/);
  });

  it("presents Advances as the Finance area, never Funding or Reconciliation", () => {
    wrap(<AdminAdvances />, contexts());
    expect(screen.getByRole("heading", { name: "Advances" })).toBeInTheDocument();
    expect(screen.getByText(/Money given before expenditure/)).toBeInTheDocument();
    expect(screen.getByText("BDFR-2026-000001", { exact: false })).toBeInTheDocument();
    expect(screen.getAllByText(/KES\s*23,000\.00/).length).toBeGreaterThan(0);
    // The rejected vocabulary must not reappear anywhere on the surface.
    const page = document.body.textContent;
    expect(page).not.toMatch(/Funding, Payments & Reconciliation/);
    expect(page).not.toMatch(/Reconciliation/);
    expect(page).not.toMatch(/Fund [Rr]equest/);
  });

  it("reads as three plain jobs: requests, money issued, and accounting", () => {
    wrap(<AdminAdvances />, contexts());
    // The summary states the department's actual position in ordinary words.
    expect(screen.getByText("Awaiting decision")).toBeInTheDocument();
    expect(screen.getAllByText("Issued").length).toBeGreaterThan(0);
    expect(screen.getByText("Still to account for")).toBeInTheDocument();
    // A submitted request has authorised nothing and issued nothing.
    expect(screen.getByRole("heading", { name: "Advance requests" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Issued" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Accounting" })).toBeInTheDocument();
  });

  it("shows issued advances and their accounting state, and never a direct payment", () => {
    wrap(<AdminAdvances />, contexts({
      requests: [{ ...request, status: "approved" }],
      // Only the accountable advance is an Advance. The legacy direct settled
      // payment is not one and must not be listed as though it were.
      releases: [advanceRelease, directRelease],
    }));
    fireEvent.click(screen.getByRole("tab", { name: "Issued" }));
    expect(screen.getByRole("heading", { name: "Issued advances" })).toBeInTheDocument();
    expect(screen.getAllByText(/KES\s*10,000\.00/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/KES\s*23,000\.00/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "Accounting" }));
    // Issued, with nothing accounted for yet. That is stated, not implied.
    expect(screen.getByText("Not yet accounted for")).toBeInTheDocument();
  });

  it("offers the Operations Manager a request action rather than direct authority", () => {
    wrap(<AdminAdvances />, contexts({ role: "manager" }));
    expect(screen.getByRole("link", { name: "Request advance" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "New advance" })).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Drill-through integrity. Reports and the Finance portfolio already emit
  // ?project=, ?status=, ?from= and ?to= against this route. Clicking a figure
  // must show the records behind that figure, not the whole register.
  // ---------------------------------------------------------------------------
  describe("URL drill-through filters", () => {
    const twoProjects = [
      { id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false },
      { id: "p2", projectName: "Karen Retreat", status: "Ongoing", archived: false },
    ];
    const alegoSubmitted = { ...request, id: "r1", requestNumber: "BDFR-2026-000001", projectId: "p1" };
    const karenApproved = {
      ...request, id: "r2", requestNumber: "BDFR-2026-000002", projectId: "p2",
      status: "approved", totalRequestedAmount: 9000,
      submittedAt: "2026-07-02T09:00:00Z", decidedAt: "2026-07-06T09:00:00Z",
    };
    const alegoIssue = { ...advanceRelease, id: "rel1", fundRequestId: "r1", releasedAt: "2026-08-01T09:00:00Z" };
    const karenIssue = {
      ...advanceRelease, id: "rel3", releaseNumber: "BDRL-2026-000003", fundRequestId: "r2",
      releasedAmount: 4000, releasedAt: "2026-07-04T09:00:00Z",
    };

    function drill(url, overrides = {}) {
      const values = contexts({
        requests: [alegoSubmitted, karenApproved],
        releases: [alegoIssue, karenIssue],
        ...overrides,
      });
      values.admin.projects = twoProjects;
      return wrap(<AdminAdvances />, values, url);
    }

    it("narrows to one project and says so in plain words", () => {
      drill("/admin/fund-requests?project=p1");
      expect(screen.getByText(/BDFR-2026-000001/)).toBeInTheDocument();
      expect(screen.queryByText(/BDFR-2026-000002/)).not.toBeInTheDocument();
      expect(screen.getByText("Filtered to Alego Usonga.")).toBeInTheDocument();
      // A project id is machinery. A reader sees the project's name.
      expect(document.body.textContent).not.toMatch(/\bp1\b/);
    });

    it("keeps the view working on its own", () => {
      drill("/admin/fund-requests?view=issued");
      expect(screen.getByRole("heading", { name: "Issued advances" })).toBeInTheDocument();
      expect(screen.getAllByText(/KES\s*10,000\.00/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/KES\s*4,000\.00/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/Filtered to/)).not.toBeInTheDocument();
    });

    it("composes a view with a project filter", () => {
      drill("/admin/fund-requests?view=issued&project=p2");
      expect(screen.getByRole("heading", { name: "Issued advances" })).toBeInTheDocument();
      // Karen Retreat's issued advance only. Alego's is another project's money.
      expect(screen.getAllByText(/KES\s*4,000\.00/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/KES\s*10,000\.00/)).not.toBeInTheDocument();
      expect(screen.getByText("Filtered to Karen Retreat.")).toBeInTheDocument();
    });

    // financePortfolio emits ?status=submitted for "Advance requests awaiting
    // your decision", and reportLoader emits ?project=…&status=submitted.
    it("reveals exactly the records behind an awaiting-decision figure", () => {
      drill("/admin/fund-requests?project=p1&status=submitted");
      expect(screen.getByText(/BDFR-2026-000001/)).toBeInTheDocument();
      expect(screen.queryByText(/BDFR-2026-000002/)).not.toBeInTheDocument();
      // Plain words for the status, and never "released".
      expect(screen.getByText("Filtered to Alego Usonga · Awaiting decision.")).toBeInTheDocument();
    });

    // financePortfolio emits ?status=approved for its five approved-advance
    // figures. An approved request is an approved request — it is never
    // silently restated as money issued or as a paid Project Cost.
    it("reveals exactly the records behind an approved-advance figure", () => {
      drill("/admin/fund-requests?status=approved");
      expect(screen.getByText(/BDFR-2026-000002/)).toBeInTheDocument();
      expect(screen.queryByText(/BDFR-2026-000001/)).not.toBeInTheDocument();
      expect(screen.getByText("Filtered to Approved.")).toBeInTheDocument();
    });

    // The Reports fund-request section links with status=all and a period. A
    // request is dated by submission or by decision, matching the rule the
    // report itself states — never by a row's last-touched timestamp.
    it("narrows requests to the reported period", () => {
      drill("/admin/fund-requests?status=all&from=2026-07-01&to=2026-07-31");
      expect(screen.getByText(/BDFR-2026-000002/)).toBeInTheDocument();
      expect(screen.queryByText(/BDFR-2026-000001/)).not.toBeInTheDocument();
      expect(screen.getByText("Filtered to 2026-07-01 to 2026-07-31.")).toBeInTheDocument();
    });

    it("dates an issued advance by the day the money was handed over", () => {
      drill("/admin/fund-requests?view=issued&from=2026-07-01&to=2026-07-31");
      expect(screen.getAllByText(/KES\s*4,000\.00/).length).toBeGreaterThan(0);
      expect(screen.queryByText(/KES\s*10,000\.00/)).not.toBeInTheDocument();
    });

    it("offers Clear filters, which drops the narrowing and keeps the view", () => {
      drill("/admin/fund-requests?view=issued&project=p2");
      expect(screen.getByRole("link", { name: "Clear filters" }))
        .toHaveAttribute("href", "/admin/fund-requests?view=issued");
    });

    it("clears back to the whole register from the default view", () => {
      drill("/admin/fund-requests?project=p2&status=approved&from=2026-07-01&to=2026-07-31");
      expect(screen.getByRole("link", { name: "Clear filters" }))
        .toHaveAttribute("href", "/admin/fund-requests");
    });

    // The whole point of the repair: an empty filtered result stays empty.
    // Falling back to the full register would restate the reader's question.
    it("says nothing matches rather than showing every advance", () => {
      drill("/admin/fund-requests?project=p2&status=submitted");
      expect(screen.getByText("No advance request matches these filters.")).toBeInTheDocument();
      expect(screen.queryByText(/BDFR-2026-000001/)).not.toBeInTheDocument();
      expect(screen.queryByText(/BDFR-2026-000002/)).not.toBeInTheDocument();
    });

    it("keeps the rejected vocabulary away from a filtered surface", () => {
      drill("/admin/fund-requests?project=p1&status=submitted");
      const page = document.body.textContent;
      expect(page).not.toMatch(/Funding, Payments & Reconciliation/);
      expect(page).not.toMatch(/Reconciliation/);
      expect(page).not.toMatch(/Fund [Rr]equest/);
    });
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
    // Asking for an Advance moves nothing. The request's existence is not money.
    expect(screen.getByText(/No money has moved merely because the request exists/)).toBeInTheDocument();
    expect(screen.getByText("Submitted for Principal decision")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Approve advance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Request correction" })).toBeDisabled();
  });

  it("recovers from a stale Principal decision without implying a change", async () => {
    const decideRequest = vi.fn(() => Promise.resolve({ ok: false, stale: true, error: "stale" }));
    wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      contexts({ overrides: { decideRequest } }), "/admin/fund-requests/r1",
    );
    fireEvent.click(screen.getByRole("button", { name: "Approve advance" }));
    await waitFor(() => expect(screen.getByText(/changed elsewhere/)).toBeInTheDocument());
  });

  it("gives the Operations Manager no Principal controls on a submitted request", () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      contexts({ role: "manager" }), "/admin/fund-requests/r1",
    );
    expect(screen.queryByRole("button", { name: "Approve advance" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reject advance" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Withdraw advance" })).toBeInTheDocument();
  });

  it("warns that a draft does not reserve and surfaces per-claim availability", async () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/new" element={<AdminFundRequestForm />} /></Routes>,
      contexts({ role: "manager", requests: [] }), "/admin/fund-requests/new",
    );
    expect(screen.getByText(/does not reserve any approved Project Cost value/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Project/), { target: { value: "p1" } });
    await waitFor(() => expect(screen.getByText("Murram supplier")).toBeInTheDocument());
    expect(screen.getAllByText("Available for advance").length).toBe(2);
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
    fireEvent.change(screen.getByLabelText(/Advance amount/), { target: { value: "9000" } });
    expect(screen.getByText(/exceeds the amount still available against this approved cost/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Save draft" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/Advance amount/), { target: { value: "8000" } });
    fireEvent.change(screen.getByLabelText(/Purpose or note/), { target: { value: "Murram balance" } });
    fireEvent.change(screen.getByLabelText(/Accountable person/), { target: { value: "m1" } });
    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => expect(screen.getByText(/Availability has been refreshed and nothing was saved/)).toBeInTheDocument());
    expect(screen.getByLabelText(/Advance amount/)).toHaveValue(8000);
    expect(screen.getByLabelText(/Purpose or note/)).toHaveValue("Murram balance");
  });

  // BD-FIN-01C. Approval is not payment, and payment is not reconciliation.
  function detail(values) {
    return wrap(
      <Routes><Route path="/admin/fund-requests/:requestId" element={<AdminFundRequestDetail />} /></Routes>,
      values, "/admin/fund-requests/r1",
    );
  }

  it("reads approved but not issued until money is handed over, and offers the Principal the action", () => {
    detail(contexts({ requests: [approved] }));
    // Approving an Advance permits it to be issued. It does not issue it, and
    // nothing may be described as accounted for that was never handed over.
    expect(screen.getByText("Not issued")).toBeInTheDocument();
    expect(screen.getAllByText(/approved but has not been issued yet/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Issue advance" })).toBeInTheDocument();
    expect(screen.queryByText("Not yet accounted for")).not.toBeInTheDocument();
  });

  it("gives the Operations Manager no way to fabricate an issued advance", () => {
    detail(contexts({ role: "manager", requests: [approved] }));
    expect(screen.getByText("Not issued")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Issue advance" })).not.toBeInTheDocument();
  });

  it("issues against the remaining authority and stops offering it once exhausted", async () => {
    const recordRelease = vi.fn(() => Promise.resolve({ ok: true }));
    detail(contexts({ requests: [approved], overrides: { recordRelease } }));
    fireEvent.click(screen.getByRole("button", { name: "Issue advance" }));
    // The form opens pre-set to the accountable person and the remaining authority.
    expect(screen.getByLabelText(/Amount issued/)).toHaveValue(23000);
    expect(screen.getByLabelText(/Accountable person/)).toHaveValue("Martine Lotom");
    fireEvent.change(screen.getByLabelText(/Amount issued/), { target: { value: "10000" } });
    fireEvent.change(screen.getByLabelText(/Date issued/), { target: { value: "2026-08-01" } });
    fireEvent.click(screen.getByRole("button", { name: "Record advance issued" }));
    await waitFor(() => expect(recordRelease).toHaveBeenCalledTimes(1));
    expect(recordRelease.mock.calls[0][1]).toMatchObject({
      releasedAmount: "10000",
      custodyDisposition: "operations_manager_accountable_advance",
      recipientProfileId: "m1",
    });
  });

  it("shows a partly issued advance, the remaining amount and that it is not yet accounted for", () => {
    detail(contexts({ requests: [approved], releases: [advanceRelease] }));
    // Partly issued AND not yet accounted for at once. Neither label may conceal
    // the other, and the amount still available is stated rather than implied.
    expect(screen.getByText("Partly issued")).toBeInTheDocument();
    expect(screen.getByText("Not yet accounted for")).toBeInTheDocument();
    expect(screen.getAllByText(/KES\s*13,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/10,000\.00 of the approved KES 23,000\.00 has been issued/)).toBeInTheDocument();
    expect(screen.getByText(/13,000\.00 of the approved Advance is still available to issue/)).toBeInTheDocument();
  });

  it("names the accountable person an advance was issued to", () => {
    detail(contexts({ requests: [approved], releases: [advanceRelease] }));
    // An Advance is held by a person, so it is named by that person's profile.
    expect(screen.getByRole("button", { name: /Martine Lotom/ })).toBeInTheDocument();
    expect(screen.queryByText(/Authorised user/)).not.toBeInTheDocument();
  });

  // A historical record that paid a supplier direct holds its payee as a label,
  // not a profile. Showing the profile regardless printed a real supplier
  // payment as "Authorised user", which is not what happened.
  it("names the actual payee of a historical direct payment", () => {
    detail(contexts({ requests: [approved], releases: [directRelease] }));
    expect(screen.getByRole("button", { name: /Siaya Hardware/ })).toBeInTheDocument();
    expect(screen.queryByText(/Authorised user/)).not.toBeInTheDocument();
    // Named plainly as what it was, with no separate legacy apparatus.
    expect(screen.getByText(/direct payment/)).toBeInTheDocument();
  });

  it("asks nobody to account for a historical direct payment", () => {
    detail(contexts({ requests: [approved], releases: [directRelease] }));
    expect(screen.getByText("Fully issued")).toBeInTheDocument();
    // Money paid straight to a supplier was never held by an accountable
    // person, so no accounting and no receipt acknowledgement is owed.
    expect(screen.queryByText("Not yet accounted for")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Siaya Hardware/ }));
    expect(screen.getByText(/BDRL-2026-000002/)).toBeInTheDocument();
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

  it("states the outcome as the accounting is entered, and submits the lines", async () => {
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
    // Issued 10,000 and spent 6,500 with nothing returned leaves 3,500 still to account for.
    expect(screen.getByText(/3,500\.00 still to account for/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Amount returned/), { target: { value: "3500" } });
    expect(screen.getByText("fully accounted for")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Submit accounting" }));
    await waitFor(() => expect(submitAcquittal).toHaveBeenCalledTimes(1));
    const [releaseId, version, values] = submitAcquittal.mock.calls[0];
    expect(releaseId).toBe("rel1");
    expect(version).toBe(1);
    expect(values.returnedAmount).toBe("3500");
    expect(values.lines[0]).toMatchObject({ description: "Casual workers", amount: "6500" });
  });

  it("requires a stated reason before the Principal can close unbalanced accounting", async () => {
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
    expect(screen.getByText("Still to account for")).toBeInTheDocument();
    expect(screen.getByText(/This does not balance/)).toBeInTheDocument();
    // Accepting is blocked until the reason exists; the balance is never silently zeroed.
    expect(screen.getByRole("button", { name: "Accept accounting" })).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/This does not balance/), {
      target: { value: "Carried forward to the next advance by agreement" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Accept accounting" }));
    await waitFor(() => expect(decideAcquittal).toHaveBeenCalledWith(
      "acq1", 1, "accepted", "Carried forward to the next advance by agreement"));
  });

  it("does not offer to cancel an advance that money has already moved against", () => {
    detail(contexts({ requests: [approved], releases: [advanceRelease] }));
    expect(screen.queryByRole("button", { name: "Cancel approved advance" })).not.toBeInTheDocument();
    detail(contexts({ requests: [approved] }));
    expect(screen.getByRole("button", { name: "Cancel approved advance" })).toBeInTheDocument();
  });

  it("uses a distinct Principal direct-authority form with no submit step", async () => {
    wrap(
      <Routes><Route path="/admin/fund-requests/new" element={<AdminFundRequestForm />} /></Routes>,
      contexts({ role: "owner", requests: [] }), "/admin/fund-requests/new",
    );
    expect(screen.getByRole("heading", { name: "New advance" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Authorise advance" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/does not reserve any approved Project Cost value/)).not.toBeInTheDocument();
  });
});
