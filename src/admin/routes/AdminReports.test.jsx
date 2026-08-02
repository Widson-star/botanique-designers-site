import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import AdminReports from "./AdminReports";

vi.mock("../lib/reports", async () => {
  const actual = await vi.importActual("../lib/reports");
  return {
    ...actual,
    fetchReportProjects: vi.fn(async () => [
      { id: "p1", project_name: "Alego Usonga", status: "Ongoing", stage: "Implementation", archived: false },
      { id: "p2", project_name: "Karen Retreat", status: "Completed", stage: "Completed", archived: false },
    ]),
  };
});

const { fetchReportProjects } = await import("../lib/reports");

const loadProjectReport = vi.fn();
vi.mock("../utils/reportLoader", async () => {
  const actual = await vi.importActual("../utils/reportLoader");
  return { ...actual, loadProjectReport: (...args) => loadProjectReport(...args) };
});

const PROJECT = {
  id: "p1",
  projectName: "Alego Usonga",
  clientSiteName: "Alego residence",
  status: "Ongoing",
  stage: "Implementation",
  leadPersonId: "",
  startDate: "2026-06-01",
  blocker: "",
  archived: false,
};

function readyReport(range) {
  return {
    projectId: "p1",
    range,
    overview: { state: "ready", project: PROJECT },
    dailySite: {
      state: "empty_period",
    },
    claims: { state: "empty_ever" },
    fundRequests: { state: "no_access" },
    approvals: { state: "empty_ever" },
    approvalsProjection: { state: "empty_period", decisions: [], awaiting: [], sourceNotes: [] },
    needsAttention: [],
  };
}

function LocationProbe() {
  const location = useLocation();
  return <span data-testid="location">{`${location.pathname}${location.search}`}</span>;
}

function renderReports({ role = "owner", isDemo = false, projects = [], initial = "/admin/reports" } = {}) {
  const value = {
    role,
    isDemo,
    accessToken: isDemo ? "" : "token",
    projects,
    profiles: [],
    profilesById: {},
  };
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <AdminDataContext.Provider value={value}>
        <LocationProbe />
        <Routes>
          <Route path="/admin/reports" element={<AdminReports />} />
        </Routes>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  loadProjectReport.mockReset();
  loadProjectReport.mockImplementation(async ({ range }) => readyReport(range));
  fetchReportProjects.mockClear();
});

describe("Reports route", () => {
  it("reads nothing until a project is chosen", async () => {
    renderReports();
    await screen.findByText("Choose a project to see its summary");
    expect(loadProjectReport).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Project overview" })).not.toBeInTheDocument();
  });

  it("offers every project the caller's own projects read returns, including completed ones", async () => {
    renderReports();
    const selector = await screen.findByLabelText("Project");
    const options = within(selector).getAllByRole("option").map((option) => option.textContent);
    expect(options).toEqual(["Choose a project…", "Alego Usonga", "Karen Retreat"]);
    // The Reports selector uses the ordinary projects read, never the
    // ongoing-only internal cost claims helper.
    expect(fetchReportProjects).toHaveBeenCalledWith("token");
  });

  it("keeps the project and the period in the URL so drill-through preserves context", async () => {
    renderReports();
    const selector = await screen.findByLabelText("Project");
    fireEvent.change(selector, { target: { value: "p1" } });
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toContain("project=p1")
    );

    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    await waitFor(() =>
      expect(screen.getByTestId("location").textContent).toContain("period=this_week")
    );
  });

  it("defaults to this month and switches the loaded period on request", async () => {
    renderReports({ initial: "/admin/reports?project=p1" });
    await waitFor(() => expect(loadProjectReport).toHaveBeenCalled());
    const firstRange = loadProjectReport.mock.calls[0][0].range;
    expect(firstRange.preset).toBe("this_month");
    expect(firstRange.startDate.slice(8)).toBe("01");

    fireEvent.click(screen.getByRole("button", { name: "This week" }));
    await waitFor(() => {
      const last = loadProjectReport.mock.calls.at(-1)[0].range;
      expect(last.preset).toBe("this_week");
    });
  });

  it("renders a custom range and refuses an inverted one without loading it", async () => {
    renderReports({ initial: "/admin/reports?project=p1&period=custom&from=2026-08-01&to=2026-08-31" });
    await waitFor(() => expect(loadProjectReport).toHaveBeenCalled());
    const callsBefore = loadProjectReport.mock.calls.length;
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-09-30" } });
    expect(await screen.findByText(/end date cannot be before the start date/i)).toBeInTheDocument();
    expect(loadProjectReport.mock.calls.length).toBe(callsBefore);
  });

  it("passes the caller's role to the loader so section access follows the source domain", async () => {
    renderReports({ role: "staff", initial: "/admin/reports?project=p1" });
    await waitFor(() => expect(loadProjectReport).toHaveBeenCalled());
    expect(loadProjectReport.mock.calls[0][0].role).toBe("staff");
  });

  it("shows the selected project and period alongside the summary on every width", async () => {
    renderReports({ initial: "/admin/reports?project=p1" });
    expect((await screen.findAllByText("Alego Usonga")).length).toBeGreaterThan(0);
    expect(await screen.findByRole("heading", { name: "Project overview" })).toBeInTheDocument();
    expect(screen.getByText(/Showing .* inclusive, on Kenyan dates\./)).toBeInTheDocument();
  });

  it("shows a safe message, never a raw error, when the project list fails", async () => {
    fetchReportProjects.mockImplementationOnce(async () => {
      throw new Error("PGRST301 JWT expired");
    });
    renderReports();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Data could not be loaded/);
    expect(alert.textContent).not.toMatch(/PGRST301|JWT/);
  });

  it("denies the route to a role with no reportable section", async () => {
    renderReports({ role: "viewer" });
    expect(screen.getByRole("heading", { name: "Reports unavailable" })).toBeInTheDocument();
    expect(fetchReportProjects).not.toHaveBeenCalled();
  });

  it("refuses a hand-typed project the caller's own Projects read did not return", async () => {
    // A manager who neither leads nor is assigned to this project never gets it
    // from Projects RLS, so Reports must not load a single section for it —
    // even though approval_requests and project_activities would return rows to
    // any manager company-wide.
    renderReports({ role: "manager", initial: "/admin/reports?project=p9" });
    expect(await screen.findByText("This project is not available to your account.")).toBeInTheDocument();
    expect(loadProjectReport).not.toHaveBeenCalled();
    expect(screen.queryByRole("heading", { name: "Project overview" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Approvals and decisions" })).not.toBeInTheDocument();
    // The unavailable project contributes no name, no count and no timing to
    // the page, and no raw error is shown. The selector still lists the
    // caller's own authorised projects, which is unchanged behaviour.
    expect(screen.queryByText("Selected project")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Needs attention" })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("treats an invalid project id exactly as an inaccessible one", async () => {
    renderReports({ role: "manager", initial: "/admin/reports?project=not-a-uuid" });
    expect(await screen.findByText("This project is not available to your account.")).toBeInTheDocument();
    expect(loadProjectReport).not.toHaveBeenCalled();
  });

  it("validates the URL project against the Projects read before loading any section", async () => {
    // A direct load or refresh must not read anything while the authorised
    // project list is still outstanding.
    let release;
    fetchReportProjects.mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve([{ id: "p1", project_name: "Alego Usonga", status: "Ongoing", stage: "Implementation", archived: false }]); })
    );
    renderReports({ initial: "/admin/reports?project=p1" });
    await screen.findByText("Loading your projects…");
    expect(loadProjectReport).not.toHaveBeenCalled();
    release();
    await waitFor(() => expect(loadProjectReport).toHaveBeenCalled());
    expect(loadProjectReport.mock.calls[0][0].authorisedProjectIds).toEqual(["p1"]);
  });

  it("reads nothing when the authorised project list itself failed", async () => {
    fetchReportProjects.mockImplementationOnce(async () => {
      throw new Error("PGRST301 JWT expired");
    });
    renderReports({ initial: "/admin/reports?project=p1" });
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/Data could not be loaded/);
    expect(loadProjectReport).not.toHaveBeenCalled();
  });

  it("still loads a project the Projects read returned, for staff as well", async () => {
    renderReports({ role: "staff", initial: "/admin/reports?project=p2" });
    await waitFor(() => expect(loadProjectReport).toHaveBeenCalled());
    expect(loadProjectReport.mock.calls[0][0].projectId).toBe("p2");
    expect(loadProjectReport.mock.calls[0][0].role).toBe("staff");
    expect(screen.queryByText("This project is not available to your account.")).not.toBeInTheDocument();
  });

  it("keeps a viewer off the route regardless of the project in the URL", async () => {
    renderReports({ role: "viewer", initial: "/admin/reports?project=p1" });
    expect(screen.getByRole("heading", { name: "Reports unavailable" })).toBeInTheDocument();
    expect(fetchReportProjects).not.toHaveBeenCalled();
    expect(loadProjectReport).not.toHaveBeenCalled();
  });

  it("keeps demo mode at parity without reaching Supabase", async () => {
    renderReports({
      isDemo: true,
      projects: [{ id: "d1", projectName: "Preview project", status: "Ongoing", stage: "Concept Design", archived: false }],
      initial: "/admin/reports?project=d1",
    });
    expect(await screen.findByRole("heading", { name: "Project overview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Attendance and planned labour" })).toBeInTheDocument();
    expect(screen.getByText(/dev preview holds no site entries/i)).toBeInTheDocument();
    expect(fetchReportProjects).not.toHaveBeenCalled();
    expect(loadProjectReport).not.toHaveBeenCalled();
  });
});
