import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

function renderRoute({ role = "manager", entries = [], compliance = [], dailyOverrides = {} } = {}) {
  const adminValue = {
    role, projects, profilesById: {}, currentUserId: "m1",
  };
  const dailyValue = {
    entries, compliance, status: "ready", error: "",
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
    expect(screen.getByRole("heading", { name: "Daily site operations" })).toBeInTheDocument();
  });

  it.each(["staff", "viewer"])("is unavailable to %s", (role) => {
    renderRoute({ role });
    expect(screen.getByText("Daily site operations unavailable")).toBeInTheDocument();
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
      isLate: false, noWorkReason: "",
    },
  ];

  it("shows compliance counts and the missing project with a record link", () => {
    renderRoute({ entries, compliance });
    expect(screen.getByText("Projects still needing a morning entry today")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lugulu Estate → record/ })).toBeInTheDocument();
  });

  it("renders entries as readable rows without raw ids or JSON", () => {
    const { container } = renderRoute({ entries, compliance });
    expect(screen.getByRole("link", { name: "Karen Residence" })).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(container.textContent).not.toMatch(/[{}]/);
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
    expect(screen.getByText(/have a morning entry or waiver today/)).toBeInTheDocument();
  });

  it("shows missing, late and waived counts and a waive control for the owner", () => {
    renderCard({
      role: "owner",
      compliance: [
        { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" },
        { due: true, complianceStatus: "entry_late" },
        { due: true, complianceStatus: "waived" },
      ],
    });
    const item = screen.getByText("Lugulu Estate").closest("li");
    expect(within(item).getByRole("button", { name: "Waive" })).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Record" })).toBeInTheDocument();
  });

  it("hides the waive control from the manager", () => {
    renderCard({
      role: "manager",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
    });
    expect(screen.queryByRole("button", { name: "Waive" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record" })).toBeInTheDocument();
  });
});
