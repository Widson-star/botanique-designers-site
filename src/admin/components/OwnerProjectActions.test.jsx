import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { AdminDataContext } from "../context/adminData";
import OwnerProjectActions from "./OwnerProjectActions";

function renderActions({ role, project, updateProject }) {
  const value = { updateProject: updateProject || vi.fn().mockResolvedValue({ ok: true }) };
  return render(
    <AdminDataContext.Provider value={value}>
      <OwnerProjectActions role={role} project={project} />
    </AdminDataContext.Provider>
  );
}

const pending = { id: "p1", projectName: "Karen", status: "Pending", stage: "Inquiry", archived: false };
const ongoing = {
  id: "p2",
  projectName: "Estate",
  status: "Ongoing",
  stage: "Implementation",
  archived: false,
  actualStartDate: "2026-07-10",
  actualCompletionDate: "",
};

describe("OwnerProjectActions", () => {
  it("shows Activate for a pending project to the owner", () => {
    renderActions({ role: "owner", project: pending });
    expect(screen.getByRole("button", { name: "Activate" })).toBeInTheDocument();
  });

  it("shows the ongoing-state owner actions", () => {
    renderActions({ role: "owner", project: ongoing });
    expect(screen.getByRole("button", { name: "Mark completed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More actions" })).toHaveAttribute(
      "aria-haspopup",
      "menu"
    );
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    const menu = screen.getByRole("menu", { name: "More project actions" });
    expect(within(menu).getByRole("menuitem", { name: "Cancel" })).toBeInTheDocument();
    // Design-only is incoherent in Implementation and the lifecycle guard
    // rejects it, so it is not offered here.
    expect(
      within(menu).queryByRole("menuitem", { name: "Classify Design-only" })
    ).not.toBeInTheDocument();
    expect(within(menu).getByRole("menuitem", { name: "Archive" })).toBeInTheDocument();
    // Not pending -> no Activate.
    expect(screen.queryByRole("button", { name: "Activate" })).not.toBeInTheDocument();
  });

  it("still offers Design-only before delivery reaches Implementation", () => {
    renderActions({ role: "owner", project: { ...ongoing, stage: "Concept Design" } });
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    const menu = screen.getByRole("menu", { name: "More project actions" });
    expect(
      within(menu).getByRole("menuitem", { name: "Classify Design-only" })
    ).toBeInTheDocument();
  });

  it("closes the More actions menu with Escape and restores trigger focus", async () => {
    renderActions({ role: "owner", project: ongoing });
    const trigger = screen.getByRole("button", { name: "More actions" });
    fireEvent.click(trigger);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("opens exceptional-action confirmation from the accessible menu", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: ongoing, updateProject });
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Cancel" }));

    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel project" }));
    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith("p2", { status: "Cancelled" })
    );
  });

  it("renders nothing for a manager (no material controls)", () => {
    const { container } = renderActions({ role: "manager", project: ongoing });
    expect(container).toBeEmptyDOMElement();
  });

  it("requires a deliberate phase choice before a project can be activated", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: pending, updateProject });

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    const dialog = await screen.findByRole("alertdialog");
    const phase = within(dialog).getByLabelText(/Project phase/);

    // Nothing is preselected, and the offered phases exclude the pre-active and
    // terminal positions.
    expect(phase).toHaveValue("");
    expect(Array.from(phase.querySelectorAll("option")).map((o) => o.textContent)).toEqual([
      "Select project phase",
      "Site Assessment",
      "Concept Design",
      "Detailed Design",
      "Quotation Sent",
      "Awaiting Approval",
      "Implementation",
    ]);

    // Confirm is unavailable until a phase is chosen, and clicking does nothing.
    const confirm = within(dialog).getByRole("button", { name: "Activate" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(updateProject).not.toHaveBeenCalled();

    fireEvent.change(phase, { target: { value: "Site Assessment" } });
    expect(within(dialog).getByRole("button", { name: "Activate" })).toBeEnabled();
  });

  it("activation submits status and phase together and nothing else", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: pending, updateProject });

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText(/Project phase/), {
      target: { value: "Implementation" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Activate" }));

    await waitFor(() => expect(updateProject).toHaveBeenCalled());
    const [id, patch] = updateProject.mock.calls[0];
    expect(id).toBe("p1");
    // No intermediate Ongoing + Inquiry, and no unrelated field is coupled in.
    expect(patch).toEqual({ status: "Ongoing", stage: "Implementation" });
  });

  it("does not carry a phase choice over from a previous activation dialog", async () => {
    renderActions({ role: "owner", project: pending });

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    let dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText(/Project phase/), {
      target: { value: "Implementation" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByLabelText(/Project phase/)).toHaveValue("");
    expect(within(dialog).getByRole("button", { name: "Activate" })).toBeDisabled();
  });

  it("blocks a blank completion date and shows inline validation", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: ongoing, updateProject });

    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dialog = await screen.findByRole("alertdialog");
    const dateInput = within(dialog).getByLabelText(/Actual completion date/);
    fireEvent.change(dateInput, { target: { value: "" } });

    expect(within(dialog).getByText("An actual completion date is required.")).toBeInTheDocument();
    const confirm = within(dialog).getByRole("button", { name: "Mark completed" });
    expect(confirm).toBeDisabled();
    fireEvent.click(confirm);
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("submits one coherent completion transition for a valid date", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: ongoing, updateProject });

    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText(/Actual completion date/), {
      target: { value: "2026-07-27" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark completed" }));

    await waitFor(() =>
      expect(updateProject).toHaveBeenCalledWith("p2", {
        status: "Completed",
        stage: "Completed",
        actual_completion_date: "2026-07-27",
        next_action: null,
        next_action_date: null,
        blocker: null,
      })
    );
  });

  it("rejects completion before the actual start date", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: ongoing, updateProject });

    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText(/Actual completion date/), {
      target: { value: "2026-07-09" },
    });

    expect(
      within(dialog).getByText(/Actual completion cannot be before the actual start date/)
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Mark completed" })).toBeDisabled();
    expect(updateProject).not.toHaveBeenCalled();
  });

  it("keeps focus on the completion date while it is edited", async () => {
    renderActions({ role: "owner", project: ongoing });
    fireEvent.click(screen.getByRole("button", { name: "Mark completed" }));
    const dateInput = await screen.findByLabelText(/Actual completion date/);

    expect(dateInput).toHaveFocus();
    fireEvent.change(dateInput, { target: { value: "2026-07-27" } });
    expect(dateInput).toHaveFocus();
  });

  it("restores focus to the opener after the dialog closes", async () => {
    renderActions({ role: "owner", project: ongoing });
    const opener = screen.getByRole("button", { name: "Mark completed" });
    opener.focus();
    fireEvent.click(opener);
    const dialog = await screen.findByRole("alertdialog");

    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(opener).toHaveFocus());
  });

  it("focuses the phase selector first in the activation dialog", async () => {
    renderActions({ role: "owner", project: pending });
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByLabelText(/Project phase/)).toHaveFocus();
  });

  it("focuses safe Cancel first in a dialog without form input", async () => {
    renderActions({ role: "owner", project: pending });
    fireEvent.click(screen.getByRole("button", { name: "More actions" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Archive" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
