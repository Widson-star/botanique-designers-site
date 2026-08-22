import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import HubGuide from "./HubGuide";

describe("How this Hub works", () => {
  it("opens from the existing help surface rather than a new nav item", () => {
    render(<HubGuide />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "How this Hub works" }));
    expect(screen.getByRole("dialog", { name: "How this Hub works" })).toBeInTheDocument();
  });

  it("documents the Tools & Equipment sequence in order", () => {
    render(<HubGuide />);
    fireEvent.click(screen.getByRole("button", { name: "How this Hub works" }));
    const dialog = screen.getByRole("dialog");
    const steps = within(dialog).getAllByRole("listitem").map((item) => item.textContent);
    expect(steps).toHaveLength(7);
    expect(steps[0]).toMatch(/Add or choose a tool/);
    expect(steps[1]).toMatch(/Track each tool.*Track quantity only/);
    expect(steps[2]).toMatch(/Register one or several tools/);
    expect(steps[3]).toMatch(/Site or location.*custodian/);
    expect(steps[6]).toMatch(/Stock positions for quantity-only/);
  });

  // Guides for workflows that are still moving are how documentation starts
  // lying. The other domains are named as pending, not described.
  it("promises nothing about the domains that are not finished", () => {
    render(<HubGuide />);
    fireEvent.click(screen.getByRole("button", { name: "How this Hub works" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/added as each one settles/)).toBeInTheDocument();
    for (const domain of ["Finance", "Approvals", "Daily Site Record", "Maintenance"]) {
      expect(within(dialog).queryByRole("heading", { name: domain })).not.toBeInTheDocument();
    }
  });

  it("closes again", () => {
    render(<HubGuide />);
    fireEvent.click(screen.getByRole("button", { name: "How this Hub works" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
