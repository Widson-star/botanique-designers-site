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
      // BD-ALERTS-01 removed the Work Inbox destination. Attention items are
      // not a navigation destination under any name — they reach the reader
      // through the header bell, per 02-alerts-popover-authority.png.
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
  // BD-ALERTS-01 returned Work Inbox to that prohibited list: it is no longer a
  // destination at all, and no Alerts destination replaced it.
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

  // BD-ALERTS-01. The Founder rejected the Work Inbox presentation on
  // 3 August 2026: the name, the permanent sidebar destination and the
  // full-page list are all gone. Nothing may reintroduce them, and no Alerts
  // destination may take their place.
  it("renders no Work Inbox destination, and no Alerts destination in its place", () => {
    renderLayout();
    expect(screen.queryByText(/work inbox/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Work Inbox|Alerts|Inbox/i })).not.toBeInTheDocument();
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toBe("/admin/work-inbox");
    }
  });

  // Alerts live behind a bell in the top-right header beside the profile, per
  // 02-alerts-popover-authority.png. It is a control, not a destination.
  it("renders the Alerts bell in the header for an authorised role", () => {
    renderLayout();
    const bell = screen.getByRole("button", { name: /^Alerts/ });
    expect(bell).toHaveAttribute("aria-haspopup", "dialog");
    expect(bell).toHaveAttribute("aria-expanded", "false");
    expect(bell.closest("header")).toBeInTheDocument();
  });

  // This is still not a notification centre. No notification record exists, so
  // nothing may offer notification settings, history or delivery.
  it("still offers no notification record, history or delivery surface", () => {
    renderLayout();
    expect(
      screen.queryByRole("link", { name: /Notification/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Notification/i })
    ).not.toBeInTheDocument();
  });

  // The badge counts NEW items needing action. With no session nothing was
  // read, so there is no count — a confident "0" is never shown for a read that
  // did not happen.
  it("shows no unread badge when no alerts read has happened", () => {
    renderLayout();
    const bell = screen.getByRole("button", { name: /^Alerts/ });
    expect(bell).toHaveAccessibleName("Alerts");
    expect(bell.textContent).toBe("");
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

  // Found in the 3 August 2026 Operations Manager mobile walkthrough. The name
  // is hidden below `md`, so if the role is also hidden below `sm` the header
  // carries NO account identity on a phone. The two roles see materially
  // different data, so that is an operational defect, not a cosmetic one.
  it("keeps the role visible at every width, so a phone header always says which account it is", () => {
    renderLayout({ role: "manager", isDemo: false, profileLabel: undefined, profile: {
      role: "manager", email: "martine@botaniquedesigners.com", full_name: "Martine Lotom",
    } });
    const badge = screen.getByText("Operations Manager");
    // No responsive-visibility class may gate it.
    expect(badge.className).not.toMatch(/(^|\s)hidden(\s|$)/);
    expect(badge.className).not.toMatch(/sm:inline|md:inline|lg:inline/);
    expect(badge.closest("header")).toBeInTheDocument();
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
