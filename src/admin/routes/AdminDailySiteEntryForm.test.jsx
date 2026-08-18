import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { MaintenanceContext } from "../context/maintenance";
import AdminDailySiteEntryForm from "./AdminDailySiteEntryForm";

// The full portfolio (what a blanket projects list would expose) vs the
// authority-scoped subset the database returns for this manager. A field record
// belongs to a SITE, so the selector offers Sites; each Site carries the
// Projects the caller may record against, and a maintenance-only Site carries
// none at all.
const allProjects = [
  { id: "p1", projectName: "Karen Residence", status: "Ongoing", stage: "Implementation", archived: false },
  { id: "p2", projectName: "Lugulu Estate", status: "Ongoing", stage: "Implementation", archived: false },
  { id: "p3", projectName: "Diani Resort", status: "Ongoing", stage: "Implementation", archived: false },
];

const site = (id, siteName, projects = []) => ({ id, siteName, location: "", county: "", projects });

const allSites = [
  site("s1", "Karen Residence", [{ id: "p1", projectName: "Karen Residence", status: "Ongoing" }]),
  site("s2", "Lugulu Estate", [{ id: "p2", projectName: "Lugulu Estate", status: "Ongoing" }]),
  site("s3", "Diani Resort", [{ id: "p3", projectName: "Diani Resort", status: "Ongoing" }]),
];

function renderNew({ role = "manager", authorisedSites = [] } = {}) {
  const adminValue = { role, projects: allProjects, profilesById: {}, currentUserId: "m1" };
  const createDraft = vi.fn(() => Promise.resolve({ ok: true, entry: { id: "new" } }));
  const dailyValue = {
    entries: [],
    authorisedSites,
    createDraft,
    updateDraft: vi.fn(() => Promise.resolve({ ok: true })),
    submitEntry: vi.fn(() => Promise.resolve({ ok: true })),
  };
  const maintenanceValue = { register: [], assignments: [], visits: [] };
  const utils = render(
    <MemoryRouter initialEntries={["/admin/daily-site-operations/new"]}>
      <AdminDataContext.Provider value={adminValue}>
        <DailySiteOperationsContext.Provider value={dailyValue}>
          <MaintenanceContext.Provider value={maintenanceValue}>
            <Routes>
              <Route path="/admin/daily-site-operations/new" element={<AdminDailySiteEntryForm mode="create" />} />
            </Routes>
          </MaintenanceContext.Provider>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
  return { ...utils, createDraft };
}

describe("AdminDailySiteEntryForm site selector authority", () => {
  it("offers a manager only their authority-scoped sites, not the whole portfolio", () => {
    renderNew({ role: "manager", authorisedSites: [allSites[1]] }); // only Lugulu
    const select = screen.getByLabelText("Site / property");
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Lugulu Estate"]);
    expect(options).not.toContain("Karen Residence");
    expect(options).not.toContain("Diani Resort");
  });

  it("offers the owner the full authorised set", () => {
    renderNew({ role: "owner", authorisedSites: allSites });
    const select = screen.getByLabelText("Site / property");
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Diani Resort", "Karen Residence", "Lugulu Estate"]); // sorted
  });

  it("shows a safe no-sites state instead of an empty selector", () => {
    renderNew({ role: "manager", authorisedSites: [] });
    expect(screen.getByText("No sites assigned to you yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Site / property")).not.toBeInTheDocument();
  });

  it("offers the Botanique Project as optional context where the Site has one", () => {
    renderNew({ role: "owner", authorisedSites: [allSites[0]] });
    const select = screen.getByLabelText("Botanique Project (optional)");
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    // Recording against no Project at all is a legitimate final state.
    expect(options).toEqual(["None — maintenance only", "Karen Residence"]);
  });

  it("offers no Project selector at all for a maintenance-only site", () => {
    renderNew({ role: "owner", authorisedSites: [site("s9", "Maintained Grounds")] });
    expect(screen.getByLabelText("Site / property")).toBeInTheDocument();
    expect(screen.queryByLabelText("Botanique Project (optional)")).not.toBeInTheDocument();
  });
});
