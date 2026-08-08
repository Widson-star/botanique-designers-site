import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import AdminDailySiteOperations from "./AdminDailySiteOperations";
import MorningComplianceCard from "../components/dailysite/MorningComplianceCard";
import { todayIso } from "../utils/dailySiteFormatters";

const projects = [
  { id: "p1", projectName: "Karen Residence", status: "Ongoing", stage: "Implementation", archived: false },
  { id: "p2", projectName: "Lugulu Estate", status: "Ongoing", stage: "Implementation", archived: false },
];

function renderRoute({ role = "manager", entries = [], compliance = [], authorisedProjects = projects, dailyOverrides = {}, projectsOverride } = {}) {
  const adminValue = {
    role, projects: projectsOverride || projects, profilesById: {}, currentUserId: "m1",
  };
  const dailyValue = {
    entries, compliance, authorisedProjects, status: "ready", error: "",
    createWaiver: vi.fn(() => Promise.resolve({ ok: true })),
    refresh: vi.fn(() => Promise.resolve({ ok: true })),
    ...dailyOverrides,
  };
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={adminValue}>
        <DailySiteOperationsContext.Provider value={dailyValue}>
          <AdminDailySiteOperations />
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminDailySiteOperations route access", () => {
  it("is available to the owner and manager", () => {
    renderRoute({ role: "owner" });
    expect(screen.getByRole("heading", { name: "Daily Site Record" })).toBeInTheDocument();
  });

  it.each(["staff", "viewer"])("is unavailable to %s", (role) => {
    renderRoute({ role });
    expect(screen.getByText("Daily Site Record unavailable")).toBeInTheDocument();
  });

  it("shows a clear no-authorised-projects state for a manager with no authority", () => {
    renderRoute({ role: "manager", authorisedProjects: [] });
    expect(screen.getByText("No projects assigned to you yet")).toBeInTheDocument();
    // The New-entry action is not offered when there is nothing to record against.
    expect(screen.queryByRole("link", { name: "New site entry" })).not.toBeInTheDocument();
  });

  it("does not show the no-authority state to the owner", () => {
    renderRoute({ role: "owner", authorisedProjects: [] });
    expect(screen.queryByText("No projects assigned to you yet")).not.toBeInTheDocument();
  });
});

describe("AdminDailySiteOperations queue and summary", () => {
  const compliance = [
    { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "entry_present" },
    { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" },
  ];
  const entries = [
    {
      id: "e1", projectId: "p1", workDate: todayIso(), disposition: "working",
      expectedWorkerCount: 6, ratePerWorker: 400, plannedLabourCost: 2400, state: "submitted",
      isLate: false, noWorkReason: "", workPlanned: "Lay turf and edge the borders",
    },
  ];

  it("shows compliance counts and the missing project with a record link", () => {
    renderRoute({ entries, compliance });
    expect(screen.getByText("Projects still needing a morning entry today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lugulu Estate → record/ })).toBeInTheDocument();
  });

  it("renders entries as readable rows without raw ids or JSON", () => {
    const { container } = renderRoute({ entries, compliance });
    // Rendered in both the desktop table and the mobile card (CSS-hidden, still
    // in the DOM), so the project name and workforce appear more than once.
    expect(screen.getAllByText("Karen Residence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("6 workers").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  it("renders the six desktop columns in order with the date on one line", () => {
    const { container } = renderRoute({ entries, compliance });
    const headers = Array.from(container.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim()
    );
    expect(headers).toEqual([
      "Project",
      "Work date",
      "Site plan",
      "Planned workforce",
      "Status",
      "Action",
    ]);
    // The work-date cell is kept on a single line (never vertical char wrapping).
    const dateCell = Array.from(container.querySelectorAll("tbody td")).find((td) =>
      /\d{4}/.test(td.textContent)
    );
    expect(dateCell.className).toMatch(/whitespace-nowrap/);
  });

  it("offers a Review action for a submitted entry and shows the estimated labour cost", () => {
    renderRoute({ entries, compliance });
    const reviewLinks = screen.getAllByRole("link", { name: "Review" });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0]).toHaveAttribute("href", "/admin/daily-site-operations/e1");
    expect(screen.getAllByText("KES 2,400").length).toBeGreaterThan(0);
  });

  it("shows a Late badge for a late submitted entry", () => {
    renderRoute({
      entries: [{ ...entries[0], isLate: true }],
      compliance,
    });
    expect(screen.getAllByText("Late").length).toBeGreaterThan(0);
  });

  it("renders a no-work entry with its reason and no workforce cost", () => {
    renderRoute({
      entries: [
        {
          id: "e2", projectId: "p1", workDate: todayIso(), disposition: "no_work",
          noWorkReason: "rain", state: "submitted", isLate: false,
        },
      ],
      compliance,
    });
    expect(screen.getAllByText("No work today").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rain").length).toBeGreaterThan(0);
  });

  it("handles a long project name and long planned activities without raw JSON", () => {
    const longName =
      "Karen Residence — Fountain Garden, Mature Borders, Water Feature & Perimeter Screening";
    const { container } = renderRoute({
      entries: [
        {
          ...entries[0],
          workPlanned:
            "Excavate and prepare the northern bed, install irrigation spurs, then lay imported topsoil across the full border run before planting.",
        },
      ],
      compliance,
      projectsOverride: [{ id: "p1", projectName: longName, status: "Ongoing", stage: "Implementation", archived: false }],
    });
    expect(screen.getAllByText(longName).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  // 3 August 2026 terminology correction. The disposition and its Principal-
  // only authority are unchanged; only what the reader sees changed.
  it("labels a not-required day as 'Not required', never 'Waived'", () => {
    renderRoute({
      compliance: [
        { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "waived" },
      ],
    });
    expect(screen.getByText("Not required")).toBeInTheDocument();
    expect(screen.getByText(/have a morning entry or were marked not required today/)).toBeInTheDocument();
    expect(screen.queryByText(/waive/i)).not.toBeInTheDocument();
  });
});

function renderCard({ role = "owner", compliance = [], createWaiver = vi.fn(() => Promise.resolve({ ok: true })) } = {}) {
  return render(
    <MemoryRouter>
      <DailySiteOperationsContext.Provider value={{ compliance, status: "ready", createWaiver, refresh: vi.fn(() => Promise.resolve({ ok: true })) }}>
        <MorningComplianceCard role={role} />
      </DailySiteOperationsContext.Provider>
    </MemoryRouter>
  );
}

describe("MorningComplianceCard (dashboard)", () => {
  it("shows the all-complete state when nothing is missing", () => {
    renderCard({ compliance: [{ due: true, complianceStatus: "entry_present" }] });
    expect(screen.getByText(/have a morning entry or were marked not required today/)).toBeInTheDocument();
  });

  it("shows missing, late and not-required counts and a mark-not-required control for the owner", () => {
    renderCard({
      role: "owner",
      compliance: [
        { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" },
        { due: true, complianceStatus: "entry_late" },
        { due: true, complianceStatus: "waived" },
      ],
    });
    // The row now leads with the action ("Morning site entry missing") and
    // carries the project and compliance state on one supporting line, per
    // the Dashboard authority screen's "Due today" panel.
    const item = screen.getByText(/Lugulu Estate/).closest("li");
    expect(within(item).getByRole("button", { name: "Mark not required" })).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Record" })).toBeInTheDocument();
  });

  it("hides the mark-not-required control from the manager", () => {
    renderCard({
      role: "manager",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
    });
    expect(screen.queryByRole("button", { name: "Mark not required" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record" })).toBeInTheDocument();
  });

  // 3 August 2026: the Founder found "waive" confusing. The mechanism, its
  // Principal-only authority and its audit fields are unchanged — only the
  // dialog copy changed. This proves no "waive" wording survives anywhere in
  // it, including the field label and the confirm button.
  it("opens the not-required dialog with plain-language copy and no 'waive' wording", () => {
    renderCard({
      role: "owner",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark not required" }));
    const dialog = screen.getByRole("alertdialog");

    expect(within(dialog).getByText("Mark morning entry not required — Lugulu Estate")).toBeInTheDocument();
    expect(within(dialog).getByText(/Marking this not required satisfies the morning entry/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason it's not required")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Mark not required" })).toBeInTheDocument();
    expect(screen.queryByText(/waive/i)).not.toBeInTheDocument();
  });

  it("submits the mark-not-required action through the unchanged createWaiver mutation", async () => {
    const createWaiver = vi.fn(() => Promise.resolve({ ok: true }));
    renderCard({
      role: "owner",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
      createWaiver,
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark not required" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText("Reason it's not required"), { target: { value: "Site closed for a public holiday" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark not required" }));

    await waitFor(() => expect(createWaiver).toHaveBeenCalledWith("p2", expect.any(String), "Site closed for a public holiday"));
  });
});
