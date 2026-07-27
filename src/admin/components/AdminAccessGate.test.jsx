import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminAccessGate from "./AdminAccessGate";

describe("AdminAccessGate", () => {
  it("offers only authorised owner and manager development previews", () => {
    render(<AdminAccessGate onSelectRole={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Owner/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Operations Manager/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Staff/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Viewer/ })).not.toBeInTheDocument();
  });
});
