import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import AdminDailySiteEntryDetail from "./AdminDailySiteEntryDetail";

const baseEntry = {
  id: "e1", projectId: "p1", workDate: "2026-07-28", disposition: "working",
  expectedWorkerCount: 6, ratePerWorker: 400, agreedLabourTotal: null, plannedLabourCost: 2400,
  workPlanned: "Lay turf", fundsAvailable: 3000, additionalAmountRequested: 500, notes: "",
  evidenceStatus: "promised", state: "submitted", version: 1, supersedesEntryId: "",
  createdBy: "m1", submittedBy: "m1", submittedAt: "2026-07-28T05:20:00Z", isLate: false,
  reviewedBy: "", reviewedAt: "", returnedReason: "", noWorkReason: "",
};

const projects = [{ id: "p1", projectName: "Karen Residence" }];

const baseClaim = {
  id: "c1", projectId: "p1", serviceDate: "2026-07-28", dailySiteEntryId: "e1",
  lifecycle: "awaiting_review", recipientLabel: "Turf crew", category: "labour",
  submittedTotal: 2400, approvedTotal: null, requesterId: "m1",
  createdAt: "2026-07-28T13:00:00Z",
};

function renderDetail({ role = "owner", entries = [baseEntry], currentUserId = "o1", claims = [], finance = {}, events = [] } = {}) {
  const adminValue = { role, projects, profilesById: {}, currentUserId };
  const dailyValue = {
    entries,
    loadEvents: vi.fn(() => Promise.resolve(events)),
    submitEntry: vi.fn(() => Promise.resolve({ ok: true })),
    returnEntry: vi.fn(() => Promise.resolve({ ok: true })),
    acceptEntry: vi.fn(() => Promise.resolve({ ok: true })),
    voidEntry: vi.fn(() => Promise.resolve({ ok: true })),
    correctEntry: vi.fn(() => Promise.resolve({ ok: true })),
    supersedeEntry: vi.fn(() => Promise.resolve({ ok: true })),
  };
  return render(
    <MemoryRouter initialEntries={["/admin/daily-site-operations/e1"]}>
      <AdminDataContext.Provider value={adminValue}>
        <DailySiteOperationsContext.Provider value={dailyValue}>
          <SiteCostsContext.Provider value={{ claims, status: "ready", error: "" }}>
            <FundRequestsContext.Provider value={{
              requests: [], allocations: [], releases: [], acquittals: [], ...finance,
            }}>
            <Routes>
              <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
            </Routes>
            </FundRequestsContext.Provider>
          </SiteCostsContext.Provider>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminDailySiteEntryDetail", () => {
  it("fails safe when the entry id is not in the authorised set", () => {
    // An unauthorised (or non-existent) entry is simply absent from the
    // RLS-scoped list, so the detail route shows a safe not-available state
    // rather than leaking anything.
    render(
      <MemoryRouter initialEntries={["/admin/daily-site-operations/not-mine"]}>
        <AdminDataContext.Provider value={{ role: "manager", projects, profilesById: {}, currentUserId: "m1" }}>
          <DailySiteOperationsContext.Provider value={{ entries: [], loadEvents: vi.fn(() => Promise.resolve([])) }}>
            <SiteCostsContext.Provider value={{ claims: [], status: "ready", error: "" }}>
              <FundRequestsContext.Provider value={{ requests: [], allocations: [], releases: [], acquittals: [] }}>
                <Routes>
                  <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
                </Routes>
              </FundRequestsContext.Provider>
            </SiteCostsContext.Provider>
          </DailySiteOperationsContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText("This entry is not available.")).toBeInTheDocument();
  });

  it("renders readable entry facts without raw ids or JSON", () => {
    const { container } = renderDetail();
    expect(screen.getByRole("heading", { name: "Karen Residence" })).toBeInTheDocument();
    expect(screen.getByText("Working today")).toBeInTheDocument();
    expect(screen.getByText("KES 2,400")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[{}]/);
    expect(container.textContent).not.toMatch(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  });

  it("offers owner review actions on a submitted entry", () => {
    renderDetail({ role: "owner" });
    expect(screen.getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Return for correction" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Void" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create cost claim" })).toHaveAttribute(
      "href", "/admin/site-costs/new?dailySiteEntryId=e1"
    );
  });

  it("hides owner review actions from the manager", () => {
    renderDetail({ role: "manager", currentUserId: "m1" });
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Return for correction" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create cost claim" })).toBeInTheDocument();
  });

  it("does not offer a cost claim from returned or no-work planning", () => {
    renderDetail({ role: "manager", currentUserId: "m1", entries: [{ ...baseEntry, state: "returned_for_correction" }] });
    expect(screen.queryByRole("link", { name: "Create cost claim" })).not.toBeInTheDocument();
  });

  it("treats accepted entries as immutable — offers supersession, not edit", () => {
    const accepted = { ...baseEntry, state: "accepted", reviewedBy: "o1", reviewedAt: "2026-07-28T06:00:00Z" };
    renderDetail({ role: "owner", entries: [accepted] });
    expect(screen.getByRole("button", { name: "Correct by supersession" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Edit draft" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
  });

  it("shows the supersession relationship on a superseded entry", () => {
    const superseded = { ...baseEntry, id: "e0", state: "superseded", supersessionReason: "Actual crew was 8" };
    const replacement = { ...baseEntry, id: "e1b", state: "accepted", version: 2, supersedesEntryId: "e0" };
    render(
      <MemoryRouter initialEntries={["/admin/daily-site-operations/e0"]}>
        <AdminDataContext.Provider value={{ role: "owner", projects, profilesById: {}, currentUserId: "o1" }}>
          <DailySiteOperationsContext.Provider value={{ entries: [superseded, replacement], loadEvents: vi.fn(() => Promise.resolve([])) }}>
            <SiteCostsContext.Provider value={{ claims: [], status: "ready", error: "" }}>
              <FundRequestsContext.Provider value={{ requests: [], allocations: [], releases: [], acquittals: [] }}>
                <Routes>
                  <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
                </Routes>
              </FundRequestsContext.Provider>
            </SiteCostsContext.Provider>
          </DailySiteOperationsContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText(/was superseded by a later correction/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the current entry" })).toBeInTheDocument();
  });
});

describe("AdminDailySiteEntryDetail financial follow-up", () => {
  const followUp = () => screen.getByRole("region", { name: "Financial follow-up" });

  it("states that no claim exists, and never creates one on its own", () => {
    renderDetail({ role: "manager", currentUserId: "m1" });
    expect(within(followUp()).getByText("No cost claim yet")).toBeInTheDocument();
    expect(within(followUp()).getByRole("link", { name: "Create cost claim" })).toHaveAttribute(
      "href", "/admin/site-costs/new?dailySiteEntryId=e1"
    );
    // The hand-off is a link the reader must follow: nothing is submitted for them.
    expect(within(followUp()).queryByRole("button")).not.toBeInTheDocument();
  });

  it("explains that a draft record cannot raise a claim yet", () => {
    renderDetail({ role: "manager", currentUserId: "m1", entries: [{ ...baseEntry, state: "draft" }] });
    expect(within(followUp()).queryByRole("link", { name: "Create cost claim" })).not.toBeInTheDocument();
    expect(within(followUp()).getByText(/once this record has been submitted/)).toBeInTheDocument();
  });

  it("expects no claim from a no-work day", () => {
    renderDetail({ role: "manager", currentUserId: "m1", entries: [{ ...baseEntry, disposition: "no_work", noWorkReason: "rain" }] });
    expect(within(followUp()).getByText("No cost claim expected")).toBeInTheDocument();
  });

  it("shows an awaiting-review claim and drills through to it", () => {
    renderDetail({ role: "manager", currentUserId: "m1", claims: [baseClaim] });
    expect(within(followUp()).getByText("Awaiting review")).toBeInTheDocument();
    expect(within(followUp()).getByRole("link", { name: /Turf crew/ })).toHaveAttribute(
      "href", "/admin/site-costs/c1"
    );
    expect(within(followUp()).getByText(/raised from this record/)).toBeInTheDocument();
  });

  it.each([
    ["approved", "Approved"],
    ["rejected", "Rejected"],
    ["amendment_requested", "Amendment requested"],
    ["withdrawn", "Withdrawn"],
  ])("shows a %s claim truthfully", (lifecycle, label) => {
    renderDetail({ role: "manager", currentUserId: "m1", claims: [{ ...baseClaim, lifecycle }] });
    expect(within(followUp()).getByText(label)).toBeInTheDocument();
  });

  it("exposes several same-day claims without disabling a further one", () => {
    renderDetail({ role: "manager", currentUserId: "m1", claims: [
      { ...baseClaim, lifecycle: "approved" },
      { ...baseClaim, id: "c2", dailySiteEntryId: "", recipientLabel: "Cart transport", createdAt: "2026-07-28T16:00:00Z" },
    ] });
    expect(within(followUp()).getByText("2 related cost claims")).toBeInTheDocument();
    expect(within(followUp()).getByRole("link", { name: /Turf crew/ })).toBeInTheDocument();
    expect(within(followUp()).getByRole("link", { name: /Cart transport/ })).toBeInTheDocument();
    expect(within(followUp()).getByText(/same project and day/)).toBeInTheDocument();
    expect(within(followUp()).getByRole("link", { name: "Create another cost claim" })).toBeInTheDocument();
  });

  it("never asserts a payment, release or reconciliation position", () => {
    const { container } = renderDetail({ role: "owner", claims: [{ ...baseClaim, lifecycle: "approved" }] });
    expect(container.textContent).not.toMatch(/\b(paid|released|reconciled|settled)\b/i);
    expect(within(followUp()).getByText(/not a payment/)).toBeInTheDocument();
  });

  it("keeps the Principal's access without making them the ordinary originator", () => {
    renderDetail({ role: "owner", claims: [baseClaim] });
    // The Principal still reaches the claim and its decision surface…
    expect(within(followUp()).getByRole("link", { name: /Turf crew/ })).toBeInTheDocument();
    // …and the create path stays where the existing capability already put it:
    // inside the financial area, not among the operational review actions.
    const actions = screen.getByRole("group", { name: "Record actions" });
    expect(within(actions).getByRole("button", { name: "Accept" })).toBeInTheDocument();
    expect(within(actions).queryByRole("link", { name: /cost claim/i })).not.toBeInTheDocument();
  });

  it("shows no financial area to a role without site-cost authority", () => {
    renderDetail({ role: "staff", currentUserId: "s1" });
    expect(screen.queryByRole("region", { name: "Financial follow-up" })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// BD-FIN-01C read integration. The record reports the downstream financial
// position and offers a way through to Finance — and no way to change it here.
// ---------------------------------------------------------------------------

describe("AdminDailySiteEntryDetail funding and reconciliation", () => {
  const ADVANCE = "operations_manager_accountable_advance";
  const DIRECT = "direct_recipient_funding";
  const approvedClaim = { ...baseClaim, lifecycle: "approved", approvedTotal: 20000 };

  const finance = ({ releases = [], acquittals = [], total = 20000 } = {}) => ({
    requests: [{
      id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved",
      intendedCustodyType: ADVANCE, totalRequestedAmount: total, version: 1,
    }],
    allocations: [{ id: "a1", fundRequestId: "r1", claimId: "c1", allocationOrder: 1, requestedAmount: total }],
    releases, acquittals,
  });

  const advance = (overrides = {}) => ({
    id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
    releasedAmount: 10000, releasedAt: "2026-08-05T09:00:00Z", version: 1, ...overrides,
  });

  it("shows nothing financial where no cost claim exists", () => {
    renderDetail({ claims: [], finance: finance({ releases: [advance()] }) });
    expect(screen.queryByText("Funding and reconciliation")).not.toBeInTheDocument();
  });

  it("states approved authority that has not been released", () => {
    renderDetail({ claims: [approvedClaim], finance: finance() });
    // The money now sits in the record's side rail as a summary, not in a
    // nested full-width funding panel beneath the record.
    const followUp = screen.getByRole("region", { name: "Financial follow-up" });
    expect(within(followUp).getByText("Approved — not yet funded")).toBeInTheDocument();
    expect(within(followUp).getByText("Authorised").parentElement).toHaveTextContent("KES 20,000");
    expect(within(followUp).getByText("Released").parentElement).toHaveTextContent("KES 0");
  });

  it("shows both dimensions of the mixed partly-funded, unreconciled position", () => {
    renderDetail({ claims: [approvedClaim], finance: finance({ releases: [advance()] }) });
    // Neither label conceals the other.
    expect(screen.getByText("Partly funded")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation outstanding")).toBeInTheDocument();
    expect(screen.getByText(/waiting to be accounted for/i)).toBeInTheDocument();
  });

  it("never shows a reconciliation debt for a direct settled payment", () => {
    renderDetail({ claims: [approvedClaim], finance: finance({
      releases: [advance({ custodyDisposition: DIRECT, releasedAmount: 20000, recipientLabel: "Kisumu Hardware" })],
    }) });
    const followUp = screen.getByRole("region", { name: "Financial follow-up" });
    expect(within(followUp).getByText("Fully funded")).toBeInTheDocument();
    // A direct settled payment is never given a reconciliation debt.
    expect(screen.queryByText("Reconciliation outstanding")).not.toBeInTheDocument();
    expect(within(followUp).getByText("Actual spend").parentElement).toHaveTextContent("KES 20,000");
  });

  it("drills through to the fund request rather than editing it here", () => {
    renderDetail({ claims: [approvedClaim], finance: finance({ releases: [advance()] }) });
    const link = screen.getByRole("link", { name: /BDFR-2026-0001/ });
    expect(link).toHaveAttribute("href", "/admin/fund-requests/r1");
    // The Daily Site Record is not the ledger: no money action is offered here.
    expect(screen.queryByRole("button", { name: /record .*release/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reconcil/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /revers/i })).not.toBeInTheDocument();
  });

  it("keeps the same financial position for an Operations Manager", () => {
    renderDetail({
      role: "manager", currentUserId: "m1", claims: [approvedClaim],
      finance: finance({ releases: [advance()] }),
    });
    expect(screen.getByText("Partly funded")).toBeInTheDocument();
    expect(screen.getByText("Reconciliation outstanding")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /BDFR-2026-0001/ })).toBeInTheDocument();
  });

  it("leaves the operational record independent of financial settlement", () => {
    const accepted = { ...baseEntry, state: "accepted", reviewedBy: "o1", reviewedAt: "2026-07-28T16:00:00Z" };
    renderDetail({
      entries: [accepted], claims: [approvedClaim],
      finance: finance({ releases: [advance()] }),
    });
    // The day is operationally closed and Finance is still outstanding. Both are
    // true at once: the record shows Accepted while the money is unreconciled.
    expect(screen.getByText("Reconciliation outstanding")).toBeInTheDocument();
    expect(screen.getAllByText("Accepted").length).toBeGreaterThan(0);
    expect(screen.getByText(/waiting to be accounted for/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Duplicate cost-claim control. Found in the hosted walkthrough of 9 August 2026:
// the record's own planning cost could be claimed a second time in one click.
// ---------------------------------------------------------------------------

describe("AdminDailySiteEntryDetail duplicate cost-claim control", () => {
  const workingEntry = {
    ...baseEntry, state: "accepted", disposition: "working",
    expectedWorkerCount: 10, ratePerWorker: 500, agreedLabourTotal: null,
  };
  const planningLine = {
    id: "l1", claimId: "c1", lineNumber: 1, description: "Planned site labour",
    rateType: "daily", quantity: 10, unit: "worker", unitRate: 500, lineTotal: 5000,
  };
  const otherLine = {
    id: "l2", claimId: "c2", lineNumber: 1, description: "Cart transport",
    rateType: "lump_sum", quantity: 1, unit: "item", unitRate: 800, lineTotal: 800,
  };
  const covering = {
    ...baseClaim, id: "c1", lifecycle: "approved", approvedTotal: 5350, submittedTotal: 5350,
  };

  function renderWithLines({ role = "manager", claims = [], lines = {}, entries = [workingEntry] } = {}) {
    return render(
      <MemoryRouter initialEntries={["/admin/daily-site-operations/e1"]}>
        <AdminDataContext.Provider value={{ role, projects, profilesById: {}, currentUserId: "m1" }}>
          <DailySiteOperationsContext.Provider value={{ entries, loadEvents: vi.fn(() => Promise.resolve([])) }}>
            <SiteCostsContext.Provider value={{
              claims, status: "ready", error: "",
              linesForClaim: (id) => lines[id] || [],
            }}>
              <FundRequestsContext.Provider value={{ requests: [], allocations: [], releases: [], acquittals: [] }}>
                <Routes>
                  <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
                </Routes>
              </FundRequestsContext.Provider>
            </SiteCostsContext.Provider>
          </DailySiteOperationsContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
  }

  it("CASE A: offers the ordinary Create cost claim when nothing is claimed", () => {
    renderWithLines({ claims: [] });
    expect(screen.getByRole("link", { name: "Create cost claim" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Open existing claim" })).not.toBeInTheDocument();
    expect(screen.queryByText(/already been claimed/i)).not.toBeInTheDocument();
  });

  it("CASE B: makes Open existing claim primary once the day's labour is claimed", () => {
    renderWithLines({ claims: [covering], lines: { c1: [planningLine] } });
    expect(screen.getByRole("link", { name: "Open existing claim" }))
      .toHaveAttribute("href", "/admin/site-costs/c1");
    expect(screen.getByText(/already been claimed/i)).toBeInTheDocument();
    // The ordinary duplicate CTA is gone.
    expect(screen.queryByRole("link", { name: "Create cost claim" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Create another cost claim" })).not.toBeInTheDocument();
  });

  it("CASE C: keeps an explicit additional-cost path that is marked as additional", () => {
    renderWithLines({ claims: [covering], lines: { c1: [planningLine] } });
    expect(screen.getByRole("link", { name: "Raise additional cost" }))
      .toHaveAttribute("href", "/admin/site-costs/new?dailySiteEntryId=e1&additional=1");
  });

  it("does not falsely block a different category on the same day", () => {
    const materials = { ...baseClaim, id: "c2", category: "materials", lifecycle: "approved" };
    renderWithLines({ claims: [materials], lines: { c2: [otherLine] } });
    expect(screen.getByRole("link", { name: "Create another cost claim" })).toBeInTheDocument();
    expect(screen.queryByText(/already been claimed/i)).not.toBeInTheDocument();
  });

  it("lets a rejected claim be re-raised through the ordinary path", () => {
    renderWithLines({ claims: [{ ...covering, lifecycle: "rejected" }], lines: { c1: [planningLine] } });
    expect(screen.queryByText(/already been claimed/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Create another cost claim" })).toBeInTheDocument();
  });

  it("shows the Principal the same protection and mutates nothing", () => {
    renderWithLines({ role: "owner", claims: [covering], lines: { c1: [planningLine] } });
    expect(screen.getByRole("link", { name: "Open existing claim" })).toBeInTheDocument();
    // No claim is cancelled, rejected or altered from the operational record.
    expect(screen.queryByRole("button", { name: /cancel claim/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /reject/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Visual Authority Tranche 1 — image 09. One coherent operational record, with
// today's position and action above the history, not below it.
// ---------------------------------------------------------------------------

describe("Daily Site Record detail — composition (authority image 09)", () => {
  const ADVANCE = "operations_manager_accountable_advance";
  const accepted = {
    ...baseEntry, state: "accepted", reviewedBy: "o1", reviewedAt: "2026-07-28T08:10:00Z",
  };

  it("states the three stages the product holds, and no day close-out", () => {
    renderDetail({ entries: [accepted] });
    const rail = screen.getByRole("region", { name: "Record progress" });
    expect(within(rail).getByText(/1\. Site record/)).toBeInTheDocument();
    expect(within(rail).getByText(/2\. Cost claim/)).toBeInTheDocument();
    expect(within(rail).getByText(/3\. Funding, payment and reconciliation/)).toBeInTheDocument();
    // Settled decision: operational close and financial settlement are distinct,
    // and no day-close action, state or record exists. The authority image's
    // fourth box must not become one.
    expect(screen.queryByText(/close.?out/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /close (the )?day/i })).not.toBeInTheDocument();
  });

  it("puts the operational position and the reader's action above the history", () => {
    const { container } = renderDetail({ entries: [accepted] });
    const rail = screen.getByRole("region", { name: "Record progress" });
    const history = screen.getByText("History");
    expect(rail.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    // And the page is panels, not one long dossier: several small sections.
    expect(container.querySelectorAll("section").length).toBeGreaterThan(4);
  });

  it("shows evidence as a declared status and never implies a stored file", () => {
    renderDetail({ entries: [accepted] });
    expect(screen.getByText("Supporting evidence")).toBeInTheDocument();
    expect(screen.getByText("Expected later")).toBeInTheDocument();
    expect(screen.getByText(/Files are not stored in the Hub/)).toBeInTheDocument();
  });

  it("names the funding stage without repeating the funding panel's own words", () => {
    renderDetail({
      entries: [accepted],
      claims: [{ ...baseClaim, lifecycle: "approved", approvedTotal: 20000, submittedTotal: 20000 }],
      finance: {
        requests: [{ id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved", intendedCustodyType: ADVANCE, totalRequestedAmount: 20000, version: 1 }],
        allocations: [{ id: "a1", fundRequestId: "r1", claimId: "c1", requestedAmount: 20000 }],
        releases: [{ id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE, releasedAmount: 10000, version: 1 }],
        acquittals: [],
      },
    });
    const rail = screen.getByRole("region", { name: "Record progress" });
    expect(within(rail).getByText(/Part of the authority released · advance not accounted for/))
      .toBeInTheDocument();
    // The panel still states the position in full, in its own language.
    expect(screen.getByText("Partly funded")).toBeInTheDocument();
    expect(screen.getAllByText("Reconciliation outstanding").length).toBeGreaterThan(0);
  });
});

describe("Daily Site Record detail — history stays subordinate", () => {
  const event = (index) => ({
    id: `ev${index}`, entryId: "e1", eventType: "draft_updated", actorId: "m1",
    occurredAt: `2026-07-2${index}T06:00:00Z`, eventNotes: "",
  });

  // History is now a CLOSED disclosure in the side rail. The immutable record
  // stays complete and one press away, but it can no longer compete with
  // today's position for the first viewport.
  it("keeps history closed by default, and says how much there is", async () => {
    renderDetail({ events: [1, 2, 3, 4, 5, 6].map(event) });
    const toggle = await screen.findByRole("button", { name: /History/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText(/6 events · immutable/)).toBeInTheDocument();
    // Nothing from the history is rendered until it is asked for.
    expect(screen.queryByText("Draft updated")).not.toBeInTheDocument();
  });

  it("opens the whole history on one press", async () => {
    renderDetail({ events: [1, 2, 3, 4, 5, 6].map(event) });
    const toggle = await screen.findByRole("button", { name: /History/ });
    toggle.click();
    // The whole immutable history, newest first — one press away, never hidden.
    expect((await screen.findAllByText("Draft updated")).length).toBe(6);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });
});
