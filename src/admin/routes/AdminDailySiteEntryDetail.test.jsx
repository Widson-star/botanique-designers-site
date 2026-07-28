import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
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

function renderDetail({ role = "owner", entries = [baseEntry], currentUserId = "o1" } = {}) {
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
          <Routes>
            <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
          </Routes>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminDailySiteEntryDetail", () => {
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
  });

  it("hides owner review actions from the manager", () => {
    renderDetail({ role: "manager", currentUserId: "m1" });
    expect(screen.queryByRole("button", { name: "Accept" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Return for correction" })).not.toBeInTheDocument();
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
            <Routes>
              <Route path="/admin/daily-site-operations/:entryId" element={<AdminDailySiteEntryDetail />} />
            </Routes>
          </DailySiteOperationsContext.Provider>
        </AdminDataContext.Provider>
      </MemoryRouter>
    );
    expect(screen.getByText(/was superseded by a later correction/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View the current entry" })).toBeInTheDocument();
  });
});
