import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import AdminDailySiteEntryForm from "./AdminDailySiteEntryForm";

// The full portfolio (what a blanket projects list would expose) vs the
// authority-scoped subset the database returns for this manager.
const allProjects = [
  { id: "p1", projectName: "Karen Residence", status: "Ongoing", stage: "Implementation", archived: false },
  { id: "p2", projectName: "Lugulu Estate", status: "Ongoing", stage: "Implementation", archived: false },
  { id: "p3", projectName: "Diani Resort", status: "Ongoing", stage: "Implementation", archived: false },
];

function renderNew({ role = "manager", authorisedProjects = [] } = {}) {
  const adminValue = { role, projects: allProjects, profilesById: {}, currentUserId: "m1" };
  const dailyValue = {
    entries: [],
    authorisedProjects,
    createDraft: vi.fn(() => Promise.resolve({ ok: true, entry: { id: "new" } })),
    updateDraft: vi.fn(() => Promise.resolve({ ok: true })),
    submitEntry: vi.fn(() => Promise.resolve({ ok: true })),
  };
  return render(
    <MemoryRouter initialEntries={["/admin/daily-site-operations/new"]}>
      <AdminDataContext.Provider value={adminValue}>
        <DailySiteOperationsContext.Provider value={dailyValue}>
          <Routes>
            <Route path="/admin/daily-site-operations/new" element={<AdminDailySiteEntryForm mode="create" />} />
          </Routes>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminDailySiteEntryForm project selector authority", () => {
  it("offers a manager only their authority-scoped projects, not the whole portfolio", () => {
    renderNew({ role: "manager", authorisedProjects: [allProjects[1]] }); // only Lugulu
    const select = screen.getByLabelText("Project");
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Lugulu Estate"]);
    expect(options).not.toContain("Karen Residence");
    expect(options).not.toContain("Diani Resort");
  });

  it("offers the owner the full authorised set", () => {
    renderNew({ role: "owner", authorisedProjects: allProjects });
    const select = screen.getByLabelText("Project");
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Diani Resort", "Karen Residence", "Lugulu Estate"]); // sorted
  });
});
