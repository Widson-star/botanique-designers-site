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
const ongoing = { id: "p2", projectName: "Estate", status: "Ongoing", stage: "Implementation", archived: false };

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
});
