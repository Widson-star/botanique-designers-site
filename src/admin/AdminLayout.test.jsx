import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "./context/adminData";
import AdminLayout from "./AdminLayout";

function renderLayout() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminDataContext.Provider
        value={{ saveFeedback: null, clearSaveFeedback: vi.fn() }}
      >
        <Routes>
          <Route
            element={
              <AdminLayout
                role="owner"
                profileLabel="Widson Omutelema Ambaisi"
                isDemo
                onSignOut={vi.fn()}
              />
            }
          >
            <Route path="/admin" element={<h1>Dashboard heading</h1>} />
          </Route>
        </Routes>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminLayout visual boundary", () => {
  it("keeps admin headings inside the Quicksand-only admin shell", () => {
    renderLayout();
    const heading = screen.getByRole("heading", { name: "Dashboard heading" });
    expect(heading.closest(".admin-shell")).toBeInTheDocument();
    expect(heading.closest(".admin-shell")).toHaveClass("font-sans");
  });

  it("shows only live Dashboard and Projects navigation", () => {
    renderLayout();
    const desktopNav = screen.getAllByRole("navigation", {
      name: "Admin sections",
    })[0];
    expect(within(desktopNav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Dashboard",
      "Projects",
    ]);
    expect(screen.queryByRole("link", { name: /Leads|Site visits|Payments|Expenses/i })).not.toBeInTheDocument();
  });

  it("shows the full founder fallback and a restrained finance boundary note", () => {
    renderLayout();
    expect(screen.getByText("Widson Omutelema Ambaisi")).toBeInTheDocument();
    expect(
      screen.getByText("Financial documents remain managed in Simple Invoice Manager.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/PDFs|document numbers|payments/i)).not.toBeInTheDocument();
  });
});
