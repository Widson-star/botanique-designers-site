import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import DailySiteEntryForm from "./DailySiteEntryForm";

function renderForm(props = {}) {
  return render(
    <DailySiteEntryForm
      submitLabel="Submit entry"
      secondaryLabel="Save draft"
      onSubmit={props.onSubmit || vi.fn()}
      onSecondary={props.onSecondary || vi.fn()}
      projectName="Karen Residence"
      workDateLabel="Tue, 28 Jul 2026"
      {...props}
    />
  );
}

describe("DailySiteEntryForm (mobile entry flow)", () => {
  it("shows the project name and date, never a raw id or JSON", () => {
    const { container } = renderForm();
    expect(screen.getByText("Karen Residence")).toBeInTheDocument();
    expect(screen.getByText("Tue, 28 Jul 2026")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}/);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  it("computes planned labour cost as workers × rate", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Planned workforce"), { target: { value: "8" } });
    fireEvent.change(screen.getByLabelText("Rate per worker (KES)"), { target: { value: "500" } });
    expect(screen.getByText("KES 4,000")).toBeInTheDocument();
  });

  it("supports the agreed-total pricing mode", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Planned workforce"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: "Agreed total" }));
    fireEvent.change(screen.getByLabelText("Agreed labour total (KES)"), { target: { value: "4500" } });
    expect(screen.getByText("KES 4,500")).toBeInTheDocument();
  });

  it("blocks submission of a working entry with no planned work and surfaces errors", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.change(screen.getByLabelText("Planned workforce"), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText("Rate per worker (KES)"), { target: { value: "500" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit entry" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Describe the planned work.")).toBeInTheDocument();
  });

  it("submits a valid working entry with the normalised values", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.change(screen.getByLabelText("Planned workforce"), { target: { value: "6" } });
    fireEvent.change(screen.getByLabelText("Rate per worker (KES)"), { target: { value: "400" } });
    fireEvent.change(screen.getByLabelText("Planned site activities"), { target: { value: "Lay turf" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit entry" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const values = onSubmit.mock.calls[0][0];
    expect(values).toMatchObject({
      disposition: "working", expectedWorkerCount: "6", ratePerWorker: "400",
      agreedLabourTotal: "", workPlanned: "Lay turf",
    });
  });

  it("switches to the no-work flow and requires a reason detail for 'other'", () => {
    const onSubmit = vi.fn();
    renderForm({ onSubmit });
    fireEvent.click(screen.getByRole("button", { name: "No work today" }));
    fireEvent.change(screen.getByLabelText("Reason there is no work"), { target: { value: "other" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit entry" }));
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByText("Add a short explanation.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Explanation"), { target: { value: "Public holiday" } });
    fireEvent.click(screen.getByRole("button", { name: "Submit entry" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ disposition: "no_work", noWorkReason: "other", reasonDetail: "Public holiday" });
  });
});
