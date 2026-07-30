import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminIntakeContext } from "../context/adminIntake";
import ProjectIntakeForm from "./ProjectIntakeForm";

function renderIntake(submit) {
  return render(
    <MemoryRouter>
      <AdminIntakeContext.Provider value={{ submit }}>
        <ProjectIntakeForm />
      </AdminIntakeContext.Provider>
    </MemoryRouter>
  );
}

describe("ProjectIntakeForm", () => {
  it("submits a proposal payload (no live project fields) and needs a reason", async () => {
    const submit = vi.fn().mockResolvedValue({ ok: true });
    renderIntake(submit);

    // Makes the proposal-only nature unmistakable.
    expect(
      screen.getByText(/No live project is created until the Principal approves/)
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Project name/), {
      target: { value: "Nyali Coastal Garden" },
    });
    fireEvent.change(screen.getByLabelText("Location"), { target: { value: "Nyali" } });

    // A reason is required for Principal review.
    fireEvent.click(screen.getByRole("button", { name: "Submit intake for approval" }));
    expect(submit).not.toHaveBeenCalled();
    expect(screen.getByText(/reason for the Principal is required/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Reason for the Principal/), {
      target: { value: "Qualified enquiry ready to open." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Submit intake for approval" }));

    await waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    const { proposedValues, reason } = submit.mock.calls[0][0];
    expect(proposedValues).toMatchObject({
      project_name: "Nyali Coastal Garden",
      project_type: "Residential",
      location: "Nyali",
    });
    expect(proposedValues).not.toHaveProperty("status");
    expect(proposedValues).not.toHaveProperty("lead_person_id");
    expect(reason).toBe("Qualified enquiry ready to open.");
  });
});
