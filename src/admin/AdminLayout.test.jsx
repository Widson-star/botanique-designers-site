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

  // The temporary workflow order: Projects and Project intakes sit together,
  // the operational and finance destinations follow in a natural sequence, and
  // the provisional Project Summary comes last so it does not read as the
  // delivered Reports Centre. The final six-group presentation — Dashboard,
  // Projects, People, Finance, Reports, More — remains deferred to its own
  // authorised stage.
  it("shows only live destinations, in the temporary workflow order, ending with Project Summary", () => {
    renderLayout();
    const desktopNav = screen.getAllByRole("navigation", {
      name: "Admin sections",
    })[0];
    expect(within(desktopNav).getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Dashboard",
      // BD-INBOX-01 (Stage 3). The Work Inbox is a delivered destination and
      // sits directly after Dashboard: it is the authoritative place for what
      // needs attention, so it is reached before the module lists.
      "Work Inbox",
      "Projects",
      "Project intakes",
      "Daily site operations",
      "Site Costs",
      "Fund Requests",
      "Approvals",
      "Project Summary",
    ]);
    expect(screen.queryByRole("link", { name: /Leads|Site visits|Payments|Expenses/i })).not.toBeInTheDocument();
  });

  // The Reports information architecture was rejected, so the shell must not
  // claim the Reports product exists. The route itself is unchanged.
  it("no longer presents any destination as Reports, while keeping the route", () => {
    renderLayout();
    expect(screen.queryByRole("link", { name: "Reports" })).not.toBeInTheDocument();
    const summary = screen.getAllByRole("link", { name: "Project Summary" })[0];
    expect(summary).toHaveAttribute("href", "/admin/reports");
  });

  // BD-REPORTS-01B navigation review. The sidebar names a destination only
  // where a working route already exists, so no unbuilt module — People,
  // Finance, Team, Tasks, Assignments, Documents or a summary area — may
  // appear, and no entry may be disabled, decorative or a placeholder.
  //
  // BD-INBOX-01 (Stage 3) removed Work Inbox from that prohibited list, and
  // ONLY because it is now a working destination with a real route. It is still
  // held to every check below: a real href, no disabled state, no placeholder
  // wording.
  it("introduces no dead, disabled or placeholder navigation item", () => {
    renderLayout();
    const desktopNav = screen.getAllByRole("navigation", { name: "Admin sections" })[0];
    const links = within(desktopNav).getAllByRole("link");
    for (const link of links) {
      const href = link.getAttribute("href");
      expect(href).toMatch(/^\/admin(\/[a-z-]+)?$/);
      expect(link).not.toHaveAttribute("aria-disabled");
      expect(link.textContent).not.toMatch(/soon|coming|todo|placeholder/i);
    }
    expect(
      screen.queryByRole("link", { name: /People|Finance|Team|Tasks|Assignments|Documents/i })
    ).not.toBeInTheDocument();
  });

  // BD-INBOX-01 (Stage 3) delivered an in-app Work Inbox with an unread count.
  // It did NOT deliver notifications, and the shell must not imply otherwise:
  // event-backed notification history, a bell, a dropdown and any external
  // delivery remain later, separately authorised capabilities.
  it("adds no notification bell, dropdown or notification centre", () => {
    renderLayout();
    expect(
      screen.queryByRole("link", { name: /Notification|Alerts|Bell/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Notification|Alerts|Bell/i })
    ).not.toBeInTheDocument();
  });

  // The badge is a count of NEW items needing action. With no session there is
  // nothing read and therefore no count — a confident "0" is never shown for a
  // read that did not happen.
  it("shows no unread badge when no inbox read has happened", () => {
    renderLayout();
    const inbox = screen.getAllByRole("link", { name: /Work Inbox/ })[0];
    expect(inbox).toHaveAttribute("href", "/admin/work-inbox");
    expect(inbox.textContent).toBe("Work Inbox");
  });

  // Every sidebar label matches the title its destination gives itself, so a
  // reader never has to translate an abbreviation into a screen name.
  it("names Daily site operations exactly as its destination titles itself", () => {
    renderLayout();
    expect(
      screen.getAllByRole("link", { name: "Daily site operations" }).length
    ).toBeGreaterThan(0);
    expect(screen.queryByRole("link", { name: "Daily site ops" })).not.toBeInTheDocument();
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

  it.each(["staff", "viewer"])("does not expose finance or Approvals to %s", (role) => {
    renderLayout({ role, profileLabel: "Team member" });
    expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Site Costs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fund Requests" })).not.toBeInTheDocument();
  });
});
