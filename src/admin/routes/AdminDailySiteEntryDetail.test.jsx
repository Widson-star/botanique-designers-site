import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
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

function renderDetail({ role = "owner", entries = [baseEntry], currentUserId = "o1", claims = [] } = {}) {
  const adminValue = { role, projects, profilesById: {}, currentUserId };
  const dailyValue = {
    entries,
    loadEvents: vi.fn(() => Promise.resolve([])),
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
            <Routes>
              <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
            </Routes>
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
              <Routes>
                <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
              </Routes>
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
              <Routes>
                <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
              </Routes>
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
    const actions = screen.getByRole("button", { name: "Accept" }).closest("section");
    expect(within(actions).queryByRole("link", { name: /cost claim/i })).not.toBeInTheDocument();
  });

  it("shows no financial area to a role without site-cost authority", () => {
    renderDetail({ role: "staff", currentUserId: "s1" });
    expect(screen.queryByRole("region", { name: "Financial follow-up" })).not.toBeInTheDocument();
  });
});
