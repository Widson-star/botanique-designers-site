import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import AdminSiteCosts from "./AdminSiteCosts";
import AdminSiteCostDetail from "./AdminSiteCostDetail";
import AdminSiteCostForm from "./AdminSiteCostForm";

const projects = [{ id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false }];
const profiles = [
  { id: "o1", full_name: "Widson Omutelema Ambaisi", role: "owner" },
  { id: "m1", full_name: "Martine Lotom", role: "manager" },
];
const claim = {
  id: "c1", projectId: "p1", dailySiteEntryId: "d1", dailySiteSourceVersion: 2,
  dailySiteSnapshot: { work_date: "2026-07-31", state: "accepted" }, serviceDate: "2026-07-31",
  recipientType: "crew", recipientLabel: "Alego turf crew", category: "labour", currency: "KES",
  purpose: "Lay turf", lifecycle: "awaiting_review", requestRound: 1, submittedTotal: 3350,
  approvedTotal: null, requesterId: "m1", deciderId: "", version: 2,
  updatedAt: "2026-07-31T09:00:00Z",
};
const lines = [{ id: "l1", claimId: "c1", lineNumber: 1, description: "Crew labour", rateType: "daily", quantity: 6, unit: "worker", unitRate: 500, lineTotal: 3000 }];
const events = [{ id: "e1", claimId: "c1", actorId: "m1", eventType: "submitted", requestRound: 1, reason: "", occurredAt: "2026-07-31T09:00:00Z" }];

function contexts({ role = "owner", claims = [claim], decideClaim = vi.fn(), dailyEntries = [] } = {}) {
  return {
    admin: { role, currentUserId: role === "owner" ? "o1" : "m1", projects, profiles },
    daily: { entries: dailyEntries },
    costs: {
      claims, lines, eventsByClaim: { c1: events }, authorisedProjects: projects, status: "ready", error: "",
      linesForClaim: (id) => lines.filter((line) => line.claimId === id), loadEvents: vi.fn(() => Promise.resolve(events)),
      refresh: vi.fn(() => Promise.resolve({ ok: true })), createDraft: vi.fn(), authoriseDirect: vi.fn(),
      updateClaim: vi.fn(), submitClaim: vi.fn(), withdrawClaim: vi.fn(), decideClaim, cancelClaim: vi.fn(),
    },
  };
}

function wrap(element, values, initial = "/admin/site-costs") {
  return render(<MemoryRouter initialEntries={[initial]}><AdminDataContext.Provider value={values.admin}><DailySiteOperationsContext.Provider value={values.daily}><SiteCostsContext.Provider value={values.costs}>{element}</SiteCostsContext.Provider></DailySiteOperationsContext.Provider></AdminDataContext.Provider></MemoryRouter>);
}

describe("Project Costs admin surfaces", () => {
  it("renders the Principal queue in desktop-table and mobile-card layouts", () => {
    const values = contexts();
    const { container } = wrap(<AdminSiteCosts />, values);
    expect(screen.getByRole("heading", { name: "Project Costs" })).toBeInTheDocument();
    expect(screen.getAllByText("Alego Usonga").length).toBeGreaterThan(1);
    expect(screen.getAllByText(/KES\s*3,350\.00/).length).toBeGreaterThan(1);
    expect(container.querySelector("table")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Authorise project cost" })).toBeInTheDocument();
  });

  it("shows whole-claim Principal decisions, immutable history and stale recovery", async () => {
    const decideClaim = vi.fn(() => Promise.resolve({ ok: false, stale: true, error: "stale" }));
    const values = contexts({ decideClaim });
    wrap(<Routes><Route path="/admin/site-costs/:claimId" element={<AdminSiteCostDetail />} /></Routes>, values, "/admin/site-costs/c1");
    expect(screen.getByRole("button", { name: "Approve whole claim" })).toBeInTheDocument();
    expect(screen.getByText("Submitted for review")).toBeInTheDocument();
    expect(screen.getByText(/Approval does not mean funded/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Approve whole claim" }));
    await waitFor(() => expect(screen.getByText(/changed elsewhere/)).toBeInTheDocument());
  });

  it("copies eligible Daily Site planning into a deliberate manager claim draft", () => {
    const dailyEntry = { id: "d1", projectId: "p1", workDate: "2026-07-31", disposition: "working", state: "accepted", version: 2, expectedWorkerCount: 6, crewReference: "Alego turf crew", ratePerWorker: 500, agreedLabourTotal: null, plannedLabourCost: 3000, workPlanned: "Lay turf" };
    const values = contexts({ role: "manager", claims: [], dailyEntries: [dailyEntry] });
    wrap(<Routes><Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} /></Routes>, values, "/admin/site-costs/new?dailySiteEntryId=d1");
    expect(screen.getByText(/no liability was created automatically/i)).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alego turf crew")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Lay turf")).toBeInTheDocument();
    expect(screen.getAllByText(/KES\s*3,000\.00/).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save and submit" })).toBeEnabled();
  });

  it("uses a distinct Principal direct-authority action", () => {
    const values = contexts({ role: "owner", claims: [] });
    wrap(<Routes><Route path="/admin/site-costs/new" element={<AdminSiteCostForm />} /></Routes>, values, "/admin/site-costs/new");
    expect(screen.getByRole("heading", { name: "Authorise project cost" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Authorise cost" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit/i })).not.toBeInTheDocument();
  });
});
