import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { AdminApprovalsContext } from "../context/adminApprovals";
import ProjectForm from "./ProjectForm";

const PROFILES = [
  {
    id: "owner-1",
    role: "owner",
    is_active: true,
    full_name: "Widson Ambaisi",
    email: "widson@botaniquedesigners.com",
  },
  { id: "manager-1", role: "manager", is_active: true, full_name: "Martine Lotom", email: "" },
  { id: "staff-1", role: "staff", is_active: true, full_name: "Staff A", email: "" },
];

function renderForm({ role, mode, project, overrides = {} }) {
  const createProject = vi.fn().mockResolvedValue({ ok: true, id: "new-id" });
  const updateProject = vi.fn().mockResolvedValue({ ok: true, id: project?.id });
  const submitApproval = vi.fn().mockResolvedValue({ ok: true });
  const withdrawApproval = vi.fn().mockResolvedValue({ ok: true });
  const value = {
    role,
    profiles: PROFILES,
    profilesById: Object.fromEntries(PROFILES.map((p) => [p.id, p])),
    currentUserId: role === "owner" ? "owner-1" : "manager-1",
    createProject,
    updateProject,
    ...overrides,
  };
  const approvals = {
    requests: overrides.requests || [],
    submit: submitApproval,
    withdraw: withdrawApproval,
  };
  const utils = render(
    <MemoryRouter>
      <AdminDataContext.Provider value={value}>
        <AdminApprovalsContext.Provider value={approvals}>
          <ProjectForm mode={mode} project={project} />
        </AdminApprovalsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
  return { ...utils, createProject, updateProject, submitApproval, withdrawApproval };
}

const editableProject = {
  id: "p1",
  projectName: "Karen Residence",
  clientSiteName: "Karen",
  location: "Karen",
  county: "Nairobi",
  projectType: "Residential",
  status: "Ongoing",
  stage: "Implementation",
  leadPersonId: "owner-1",
  leadPersonResolved: false, // owner lead is not visible to a manager
  startDate: "",
  actualStartDate: "",
  targetCompletionDate: "2026-09-01",
  actualCompletionDate: "",
  nextAction: "Confirm portfolio permission",
  nextActionDate: "",
  blocker: "",
  notes: "",
  portfolioEligible: true,
  portfolioPermissionStatus: "Permission Needed",
};

describe("owner form", () => {
  it("retains the founder's full formal name in the accountable-lead selector", () => {
    renderForm({ role: "owner", mode: "create" });
    expect(
      screen.getByRole("option", { name: "Widson Omutelema Ambaisi" })
    ).toBeInTheDocument();
  });

  it("shows full controls including actual completion and a single portfolio control", () => {
    renderForm({ role: "owner", mode: "create" });
    expect(screen.getByLabelText("Status")).toBeInTheDocument();
    expect(screen.getByLabelText("Actual completion")).toBeInTheDocument();
    // One clear control replaces the old checkbox + permission dropdown pair.
    expect(screen.getByLabelText(/Portfolio publication status/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio eligible")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Portfolio permission status")).not.toBeInTheDocument();
  });

  it("submits and preserves the default Not Reviewed portfolio state", async () => {
    const { createProject } = renderForm({ role: "owner", mode: "create" });
    // The dropdown is bound to the underlying permission-status column value.
    expect(screen.getByLabelText(/Portfolio publication status/)).toHaveValue("Not Reviewed");
    // It renders the friendly "Not assessed" label for that value.
    expect(
      screen.getByRole("option", { name: "Not assessed", selected: true })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "Alego Usonga" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));

    expect(createProject.mock.calls[0][0]).toMatchObject({
      portfolio_eligible: false,
      portfolio_permission_status: "Not Reviewed",
    });
  });

  it("writes both underlying columns deterministically from the single control (no conflict)", async () => {
    const { createProject } = renderForm({ role: "owner", mode: "create" });
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "Publication Candidate" },
    });
    // Choosing "Approved for publication" maps to the Approved For Portfolio
    // enum AND derives portfolio_eligible = true — the two can never disagree.
    fireEvent.change(screen.getByLabelText(/Portfolio publication status/), {
      target: { value: "Approved For Portfolio" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));

    expect(createProject.mock.calls[0][0]).toMatchObject({
      portfolio_permission_status: "Approved For Portfolio",
      portfolio_eligible: true,
    });
  });
});

describe("manager edit", () => {
  it("presents material fields read-only in the main form and offers a proposal", () => {
    renderForm({ role: "manager", mode: "edit", project: editableProject });
    // The main details section is read-only for a manager (guidance banner), and
    // stage is not an editable combobox there.
    expect(
      screen.getByText(/These identity fields are read-only for your role/)
    ).toBeInTheDocument();
    // A distinct material-change proposal section is offered instead.
    expect(
      screen.getByRole("heading", { name: "Propose a material change" })
    ).toBeInTheDocument();
    // The direct save is clearly labelled for low-risk operational updates only.
    expect(
      screen.getByRole("button", { name: "Save operational updates" })
    ).toBeInTheDocument();
  });

  it("routes status Ongoing<->Paused through the material-change proposal, not a direct field", () => {
    renderForm({ role: "manager", mode: "edit", project: editableProject });
    // No editable Status combobox in the direct-save form (it is read-only).
    expect(screen.queryByLabelText("Status")).not.toBeInTheDocument();
    // The proposal offers the constrained Ongoing<->Paused status select.
    const statusSelect = screen.getByLabelText("Status (Ongoing / Paused)");
    const options = Array.from(statusSelect.querySelectorAll("option")).map((o) => o.value);
    expect(options).toEqual(["Ongoing", "Paused"]);
  });

  it("saves only low-risk fields directly and never sends a material field", async () => {
    const { updateProject } = renderForm({
      role: "manager",
      mode: "edit",
      project: editableProject,
    });

    // The protected lead is shown read-only, never an editable select.
    expect(screen.getByText("Assigned lead (protected)")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/^Next required action/), {
      target: { value: "Call the client" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save operational updates" }));

    await waitFor(() => expect(updateProject).toHaveBeenCalledTimes(1));
    const [, patch] = updateProject.mock.calls[0];
    expect(patch).toEqual({ next_action: "Call the client" });
    expect(patch).not.toHaveProperty("lead_person_id");
    expect(patch).not.toHaveProperty("project_name");
    expect(patch).not.toHaveProperty("location");
  });

  it("submits a material-change proposal instead of a direct write", async () => {
    const { submitApproval } = renderForm({
      role: "manager",
      mode: "edit",
      project: editableProject,
    });
    // Change a material field within the proposal section.
    fireEvent.change(screen.getByLabelText("Location"), {
      target: { value: "Kilimani" },
    });
    fireEvent.change(screen.getByLabelText(/Reason for the Principal/), {
      target: { value: "Client corrected the site address." },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Submit material changes for approval" })
    );
    await waitFor(() => expect(submitApproval).toHaveBeenCalledTimes(1));
    const payload = submitApproval.mock.calls[0][0];
    expect(payload.approvalType).toBe("project_material_change");
    expect(payload.proposedValues).toMatchObject({ location: "Kilimani" });
    expect(payload.originalValues).toMatchObject({ location: "Karen" });
  });

  it("does not show portfolio eligibility or permission state", () => {
    renderForm({ role: "manager", mode: "edit", project: editableProject });
    expect(screen.queryByRole("heading", { name: "Portfolio" })).not.toBeInTheDocument();
    expect(screen.queryByText("Permission Needed")).not.toBeInTheDocument();
  });
});

describe("save feedback", () => {
  it("preserves form values and shows an error when the save fails", async () => {
    const failing = vi.fn().mockResolvedValue({ ok: false, error: "row violates policy" });
    renderForm({ role: "owner", mode: "create", overrides: { createProject: failing } });

    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "Kept Value" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));

    await screen.findByText("row violates policy");
    // The entered value is still present (state not cleared on failure).
    expect(screen.getByLabelText(/Project name/)).toHaveValue("Kept Value");
  });

  it("calls the create mutation (which triggers refetch in the provider) on success", async () => {
    const { createProject } = renderForm({ role: "owner", mode: "create" });
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "Good Project" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create project" }));
    await waitFor(() => expect(createProject).toHaveBeenCalledTimes(1));
  });

  it("blocks duplicate submission while a write is pending", async () => {
    let resolveWrite;
    const pendingWrite = new Promise((resolve) => {
      resolveWrite = resolve;
    });
    const createProject = vi.fn(() => pendingWrite);
    renderForm({
      role: "owner",
      mode: "create",
      overrides: { createProject },
    });
    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "One submission" },
    });
    const submit = screen.getByRole("button", { name: "Create project" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(createProject).toHaveBeenCalledTimes(1);

    resolveWrite({ ok: true, id: "new-id" });
    await waitFor(() => expect(submit).not.toBeDisabled());
  });
});
