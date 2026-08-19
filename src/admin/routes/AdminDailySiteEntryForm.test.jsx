import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

const site = (id, siteName, projects = [], hasActiveMaintenance = false) =>
  ({ id, siteName, location: "", county: "", projects, hasActiveMaintenance });

const allSites = [
  site("s1", "Karen Residence", [{ id: "p1", projectName: "Karen Residence", status: "Ongoing" }]),
  site("s2", "Lugulu Estate", [{ id: "p2", projectName: "Lugulu Estate", status: "Ongoing" }]),
  site("s3", "Diani Resort", [{ id: "p3", projectName: "Diani Resort", status: "Ongoing" }]),
];

function renderNew({ role = "manager", authorisedSites = [], search = "" } = {}) {
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
    <MemoryRouter initialEntries={[`/admin/daily-site-operations/new${search}`]}>
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
    expect(options).toEqual(["Choose Site / property", "Lugulu Estate"]);
    expect(options).not.toContain("Karen Residence");
    expect(options).not.toContain("Diani Resort");
  });

  it("offers the owner the full authorised set", () => {
    renderNew({ role: "owner", authorisedSites: allSites });
    const select = screen.getByLabelText("Site / property");
    const options = within(select).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Choose Site / property", "Diani Resort", "Karen Residence", "Lugulu Estate"]); // sorted
  });

  it("shows a safe no-sites state instead of an empty selector", () => {
    renderNew({ role: "manager", authorisedSites: [] });
    expect(screen.getByText("No sites assigned to you yet")).toBeInTheDocument();
    expect(screen.queryByLabelText("Site / property")).not.toBeInTheDocument();
  });

  it("offers maintenance-only ONLY where the Site genuinely runs Maintenance", () => {
    // An Ongoing Project alone is not authority to drop Project context.
    renderNew({ role: "owner", authorisedSites: [site("s1", "Karen Residence", [{ id: "p1", projectName: "Karen Residence", status: "Ongoing" }], false)], search: "?site=s1" });
    const options = within(screen.getByLabelText("Botanique Project")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["Karen Residence"]);
    expect(options).not.toContain("None — maintenance only");
  });

  it("offers maintenance-only where the Site has active Maintenance", () => {
    renderNew({ role: "owner", authorisedSites: [site("s1", "Karen Residence", [{ id: "p1", projectName: "Karen Residence", status: "Ongoing" }], true)], search: "?site=s1" });
    const options = within(screen.getByLabelText("Botanique Project (optional)")).getAllByRole("option").map((o) => o.textContent);
    expect(options).toEqual(["None — maintenance only", "Karen Residence"]);
  });

  it("requires a deliberate Site rather than silently adopting the first option", async () => {
    const { createDraft } = renderNew({ role: "owner", authorisedSites: allSites });
    const select = screen.getByLabelText("Site / property");
    // Authorised Sites load asynchronously, so nothing may be preselected.
    expect(select).toHaveValue("");
    expect(within(select).getAllByRole("option")[0].textContent).toBe("Choose Site / property");
    fireEvent.click(screen.getByRole("button", { name: /Save draft/i }));
    // Nothing may be written while the Site is unstated.
    await waitFor(() => expect(createDraft).not.toHaveBeenCalled());
  });

  it("preloads Site, date and Maintenance visit when opened from a Maintenance visit", () => {
    renderNew({
      role: "owner",
      authorisedSites: [site("s9", "Maintained Grounds", [], true)],
      search: "?site=s9&maintenanceVisit=visit-7&date=2026-08-25",
    });
    expect(screen.getByLabelText("Site / property")).toHaveValue("s9");
    // Maintenance visit identity is fixed context, never an editable selector.
    expect(screen.queryByLabelText(/Maintenance visit/i)).not.toBeInTheDocument();
  });

  it("offers no Project selector at all for a maintenance-only site", () => {
    renderNew({ role: "owner", authorisedSites: [site("s9", "Maintained Grounds", [], true)], search: "?site=s9" });
    expect(screen.getByLabelText("Site / property")).toBeInTheDocument();
    expect(screen.queryByLabelText("Botanique Project (optional)")).not.toBeInTheDocument();
  });
});
