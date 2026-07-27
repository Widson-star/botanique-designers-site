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
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Classify Design-only" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archive" })).toBeInTheDocument();
    // Not pending -> no Activate.
    expect(screen.queryByRole("button", { name: "Activate" })).not.toBeInTheDocument();
  });

  it("renders nothing for a manager (no material controls)", () => {
    const { container } = renderActions({ role: "manager", project: ongoing });
    expect(container).toBeEmptyDOMElement();
  });

  it("activate confirmation sends only { status: 'Ongoing' }", async () => {
    const updateProject = vi.fn().mockResolvedValue({ ok: true });
    renderActions({ role: "owner", project: pending, updateProject });

    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    // Confirm dialog appears; both the trigger and the dialog confirm read
    // "Activate" — the dialog's confirm button lives inside the alertdialog.
    const dialog = await screen.findByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "Activate" }));

    await waitFor(() => expect(updateProject).toHaveBeenCalled());
    const [id, patch] = updateProject.mock.calls[0];
    expect(id).toBe("p1");
    expect(patch).toEqual({ status: "Ongoing" });
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

  it("submits exactly status and actual completion for a valid date", async () => {
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
        actual_completion_date: "2026-07-27",
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

  it("focuses safe Cancel first in a dialog without form input", async () => {
    renderActions({ role: "owner", project: pending });
    fireEvent.click(screen.getByRole("button", { name: "Activate" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Cancel" })).toHaveFocus();
  });
});
