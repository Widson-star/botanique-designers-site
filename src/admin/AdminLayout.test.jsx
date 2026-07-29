import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "./context/adminData";
import AdminLayout from "./AdminLayout";

function renderLayout({
  role = "owner",
  profileLabel = "Widson O. Ambaisi",
  profile = null,
  isDemo = true,
} = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminDataContext.Provider
        value={{ saveFeedback: null, clearSaveFeedback: vi.fn() }}
      >
        <Routes>
          <Route
            element={
              <AdminLayout
                role={role}
                profile={profile}
                profileLabel={profileLabel}
                isDemo={isDemo}
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
  it("keeps admin headings inside the native-system-font admin shell", () => {
    renderLayout();
    const heading = screen.getByRole("heading", { name: "Dashboard heading" });
    expect(heading.closest(".admin-shell")).toBeInTheDocument();
    expect(heading.closest(".admin-shell")).not.toHaveClass("font-sans");
  });

  it("shows only live Dashboard, Projects, Daily site ops and Approvals navigation", () => {
    renderLayout();
    const desktopNav = screen.getAllByRole("navigation", {
      name: "Admin sections",
    })[0];
    expect(within(desktopNav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Dashboard",
      "Projects",
      "Daily site ops",
      "Approvals",
    ]);
    expect(screen.queryByRole("link", { name: /Leads|Site visits|Payments|Expenses/i })).not.toBeInTheDocument();
  });

  it("shows the compact founder name, Principal badge and restrained finance boundary note", () => {
    renderLayout();
    expect(screen.getByText("Widson O. Ambaisi")).toBeInTheDocument();
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.queryByText("Owner")).not.toBeInTheDocument();
    expect(
      screen.getByText("Financial documents remain managed in Simple Invoice Manager.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/PDFs|document numbers|payments/i)).not.toBeInTheDocument();
  });

  it("normalises the shortened authenticated founder profile in the top navigation", () => {
    renderLayout({
      isDemo: false,
      profileLabel: undefined,
      profile: {
        role: "owner",
        email: "widson@botaniquedesigners.com",
        full_name: "Widson Ambaisi",
      },
    });
    expect(screen.getByText("Widson O. Ambaisi")).toBeInTheDocument();
    expect(screen.getByText("Principal")).toBeInTheDocument();
    expect(screen.queryByText("Widson Ambaisi")).not.toBeInTheDocument();
  });

  it("does not alter Martine Lotom in authenticated navigation", () => {
    renderLayout({
      role: "manager",
      isDemo: false,
      profileLabel: undefined,
      profile: {
        role: "manager",
        email: "martine@botaniquedesigners.com",
        full_name: "Martine Lotom",
      },
    });
    expect(screen.getByText("Martine Lotom")).toBeInTheDocument();
    expect(screen.getByText("Operations Manager")).toBeInTheDocument();
  });

  it.each([
    ["manager", "Operations Manager"],
    ["staff", "Project Team"],
    ["viewer", "Read-only"],
  ])("presents the %s role as %s", (role, label) => {
    renderLayout({ role, profileLabel: "Team member" });
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it.each(["staff", "viewer"])("does not expose Approvals to %s", (role) => {
    renderLayout({ role, profileLabel: "Team member" });
    expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
  });
});
