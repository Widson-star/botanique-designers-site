import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "./context/adminData";
import AdminLayout from "./AdminLayout";

function renderLayout({
  role = "owner",
  profileLabel = "Widson O. Ambaisi",
  profile = null,
  isDemo = true,
  path = "/admin",
} = {}) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminDataContext.Provider value={{ saveFeedback: null, clearSaveFeedback: vi.fn() }}>
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
            <Route path="/admin/*" element={<h1>Destination heading</h1>} />
          </Route>
        </Routes>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

// The desktop sidebar and the mobile drawer render the same tree, so tests that
// do not care which one they inspect take the first.
function desktopNav() {
  return screen.getAllByRole("navigation", { name: "Admin sections" })[0];
}
function domainButton(name) {
  return within(desktopNav()).getByRole("button", { name });
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("AdminLayout visual boundary", () => {
  it("keeps admin headings inside the native-system-font admin shell", () => {
    renderLayout();
    const heading = screen.getByRole("heading", { name: "Dashboard heading" });
    expect(heading.closest(".admin-shell")).toBeInTheDocument();
    expect(heading.closest(".admin-shell")).not.toHaveClass("font-sans");
  });
});

// Stage 6, approved 6 August 2026. Authority:
// docs/ui-authority/operations-hub/stage-6-navigation-authority/
describe("Stage 6 six-domain navigation", () => {
  it("presents exactly the six approved domains, in the approved order", () => {
    renderLayout();
    const rows = within(desktopNav()).getAllByRole("button");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Projects",
      "Operations",
      "Finance",
      "Reports",
      "More",
    ]);
    // Dashboard is a direct destination, not a disclosure.
    expect(within(desktopNav()).getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/admin"
    );
  });

  it.each([
    ["Projects", ["Projects", "Project Intakes"], ["/admin/projects", "/admin/project-intakes"]],
    [
      "Operations",
      ["Daily Site Operations", "Site Costs", "Approvals"],
      ["/admin/daily-site-operations", "/admin/site-costs", "/admin/approvals"],
    ],
    ["Finance", ["Fund Requests"], ["/admin/fund-requests"]],
    ["Reports", ["Project Summary"], ["/admin/reports"]],
    ["More", ["People"], ["/admin/people"]],
  ])("maps %s to exactly its approved children, on their existing routes", async (domain, labels, hrefs) => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(domainButton(domain));
    const panel = screen.getByRole("navigation", { name: "Admin sections" });
    const links = within(panel)
      .getAllByRole("link")
      .filter((link) => labels.includes(link.textContent));
    expect(links.map((link) => link.textContent)).toEqual(labels);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(hrefs);
  });

  // Grouping is presentation. It must not widen or narrow what a role reaches.
  it("shows the Principal every domain and every destination", async () => {
    const user = userEvent.setup();
    renderLayout({ role: "owner" });
    // One group opens at a time, so each is inspected while it is the open one.
    const expected = {
      Projects: ["Projects", "Project Intakes"],
      Operations: ["Daily Site Operations", "Site Costs", "Approvals"],
      Finance: ["Fund Requests"],
      Reports: ["Project Summary"],
      More: ["People"],
    };
    for (const [domain, labels] of Object.entries(expected)) {
      await user.click(domainButton(domain));
      for (const label of labels) {
        expect(within(desktopNav()).getByRole("link", { name: label })).toBeInTheDocument();
      }
    }
  });

  it("shows the Operations Manager the same six domains and destinations", async () => {
    const user = userEvent.setup();
    renderLayout({ role: "manager", profileLabel: "Martine Lotom" });
    expect(within(desktopNav()).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Projects",
      "Operations",
      "Finance",
      "Reports",
      "More",
    ]);
    await user.click(domainButton("More"));
    expect(within(desktopNav()).getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/admin/people"
    );
  });

  // A domain whose every child is unauthorised must not render at all — not
  // empty, not disabled, not greyed.
  it.each(["staff", "viewer"])("omits domains with no authorised children for %s", (role) => {
    renderLayout({ role, profileLabel: "Team member" });
    const rows = within(desktopNav()).queryAllByRole("button");
    // Operations, Finance, Reports and More are entirely capability-gated.
    expect(rows.map((row) => row.textContent)).not.toContain("Operations");
    expect(rows.map((row) => row.textContent)).not.toContain("Finance");
    expect(rows.map((row) => row.textContent)).not.toContain("More");
    expect(screen.queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Site Costs" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Fund Requests" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "People" })).not.toBeInTheDocument();
  });

  it("introduces no dead, disabled or placeholder navigation item", () => {
    renderLayout();
    for (const link of within(desktopNav()).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\/admin(\/[a-z-]+)?$/);
      expect(link).not.toHaveAttribute("aria-disabled");
      expect(link.textContent).not.toMatch(/soon|coming|todo|placeholder/i);
    }
    // Named but unbuilt areas stay absent.
    expect(
      screen.queryByRole("link", { name: /Work Overview|Labour|Payments|Suppliers|Documents/i })
    ).not.toBeInTheDocument();
  });
});

describe("Stage 6 active and expanded state", () => {
  it.each([
    ["/admin/projects", "Projects", "Projects"],
    ["/admin/projects/abc-123", "Projects", "Projects"],
    ["/admin/projects/abc-123/edit", "Projects", "Projects"],
    ["/admin/project-intakes", "Projects", "Project Intakes"],
    ["/admin/project-intakes/xyz", "Projects", "Project Intakes"],
    ["/admin/daily-site-operations", "Operations", "Daily Site Operations"],
    ["/admin/daily-site-operations/e1/edit", "Operations", "Daily Site Operations"],
    ["/admin/site-costs/c1", "Operations", "Site Costs"],
    ["/admin/site-costs/c1/edit", "Operations", "Site Costs"],
    ["/admin/approvals/a1", "Operations", "Approvals"],
    ["/admin/fund-requests/r1/edit", "Finance", "Fund Requests"],
    ["/admin/reports", "Reports", "Project Summary"],
    ["/admin/people/p1", "More", "People"],
  ])("opens the owning domain and marks the right child on %s", (path, domain, child) => {
    renderLayout({ path });
    const nav = desktopNav();
    expect(within(nav).getByRole("button", { name: domain })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(within(nav).getByRole("link", { name: child }).className).toMatch(/bg-\[#ecefe9\]/);
  });

  // The authority proves these are independent: Dashboard is active while
  // Operations is expanded, and no child of the expanded group is active.
  it("keeps active and expanded independent", async () => {
    const user = userEvent.setup();
    renderLayout({ path: "/admin" });
    await user.click(domainButton("More"));

    const nav = desktopNav();
    expect(within(nav).getByRole("button", { name: "More" })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    // Dashboard keeps the active treatment.
    expect(within(nav).getByRole("link", { name: "Dashboard" }).className).toMatch(/bg-\[#ecefe9\]/);
    // People is visible but NOT active.
    expect(within(nav).getByRole("link", { name: "People" }).className).not.toMatch(/bg-\[#ecefe9\]/);
  });

  it("opens one domain at a time and collapses on a second press", async () => {
    const user = userEvent.setup();
    renderLayout({ path: "/admin" });

    await user.click(domainButton("Projects"));
    expect(domainButton("Projects")).toHaveAttribute("aria-expanded", "true");

    await user.click(domainButton("Finance"));
    expect(domainButton("Projects")).toHaveAttribute("aria-expanded", "false");
    expect(domainButton("Finance")).toHaveAttribute("aria-expanded", "true");

    await user.click(domainButton("Finance"));
    expect(domainButton("Finance")).toHaveAttribute("aria-expanded", "false");
  });

  // Disclosure is local shell state. It must not touch the URL, because that
  // would push history entries and break back/forward.
  it("changes no URL and pushes no history entry when a group is toggled", async () => {
    const user = userEvent.setup();
    renderLayout({ path: "/admin/site-costs" });
    const before = window.location.href;

    await user.click(domainButton("Projects"));
    await user.click(domainButton("Reports"));

    expect(window.location.href).toBe(before);
    // The route did not move: Site Costs is still the active destination.
    expect(screen.getByRole("heading", { name: "Destination heading" })).toBeInTheDocument();
  });
});

describe("Stage 6 desktop collapse", () => {
  it("starts expanded on first use and shows the collapse control", () => {
    renderLayout();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("collapses, restores, and remembers the preference in this browser", async () => {
    const user = userEvent.setup();
    const view = renderLayout();

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(window.localStorage.getItem("botanique.admin.sidebarCollapsed")).toBe("1");

    view.unmount();
    renderLayout();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
  });

  // Collapsed rows carry no visible text, so the accessible name must carry it.
  it("gives every collapsed rail control an accessible name", async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    const nav = desktopNav();
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    for (const domain of ["Projects", "Operations", "Finance", "Reports", "More"]) {
      expect(within(nav).getByRole("button", { name: domain })).toBeInTheDocument();
    }
  });
});

describe("Stage 6 mobile drawer", () => {
  function openDrawer(user) {
    return user.click(screen.getByRole("button", { name: "Open navigation menu" }));
  }

  it("opens and closes with the trigger and the close control", async () => {
    const user = userEvent.setup();
    renderLayout();
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();

    await openDrawer(user);
    expect(screen.getByRole("dialog", { name: "Admin navigation" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close navigation menu" }));
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    renderLayout();
    await openDrawer(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("closes after a destination is selected", async () => {
    const user = userEvent.setup();
    renderLayout();
    await openDrawer(user);

    const drawer = screen.getByRole("dialog", { name: "Admin navigation" });
    await user.click(within(drawer).getByRole("button", { name: "Finance" }));
    await user.click(within(drawer).getByRole("link", { name: "Fund Requests" }));

    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("expands and collapses a group in place without closing the drawer", async () => {
    const user = userEvent.setup();
    renderLayout();
    await openDrawer(user);
    const drawer = screen.getByRole("dialog", { name: "Admin navigation" });

    const operations = within(drawer).getByRole("button", { name: "Operations" });
    await user.click(operations);
    expect(operations).toHaveAttribute("aria-expanded", "true");
    expect(within(drawer).getByRole("link", { name: "Site Costs" })).toBeInTheDocument();

    await user.click(operations);
    expect(operations).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog", { name: "Admin navigation" })).toBeInTheDocument();
  });

  it("contains Tab focus inside the open drawer", async () => {
    const user = userEvent.setup();
    renderLayout();
    await openDrawer(user);
    const drawer = screen.getByRole("dialog", { name: "Admin navigation" });

    for (let i = 0; i < 12; i += 1) {
      await user.tab();
      expect(drawer.contains(document.activeElement)).toBe(true);
    }
  });
});

describe("Stage 6 preserved shell", () => {
  it("keeps the project search at every width", () => {
    renderLayout();
    expect(screen.getAllByRole("search").length).toBeGreaterThan(0);
    expect(screen.getAllByLabelText("Search projects").length).toBeGreaterThan(0);
  });

  it("keeps Alerts in the header as a control, never a destination", () => {
    renderLayout();
    const bell = screen.getByRole("button", { name: /^Alerts/ });
    expect(bell).toHaveAttribute("aria-haspopup", "dialog");
    expect(bell.closest("header")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Work Inbox|Alerts|Inbox/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/work inbox/i)).not.toBeInTheDocument();
  });

  it("still offers no notification record, history or delivery surface", () => {
    renderLayout();
    expect(screen.queryByRole("link", { name: /Notification/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Notification/i })).not.toBeInTheDocument();
  });

  // Identity follows the approved hierarchy: name primary, role subordinate.
  // Below `md` the text collapses into the avatar, so the header still answers
  // "which account is this?" at phone width — the initials are always visible
  // and the full name and role are one press away in the profile menu. This
  // supersedes the August treatment that kept a role badge in the header row.
  it("always identifies the signed-in account, and reveals name and role in the profile menu", async () => {
    const user = userEvent.setup();
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

    const trigger = screen.getByRole("button", { name: "Martine Lotom, Operations Manager" });
    expect(trigger.closest("header")).toBeInTheDocument();
    // The initials avatar carries identity at every width — nothing hides it.
    expect(within(trigger).getByText("ML").className).not.toMatch(/(^|\s)hidden(\s|$)/);

    await user.click(trigger);
    const menu = screen.getByRole("menu");
    expect(within(menu).getByText("Martine Lotom")).toBeInTheDocument();
    expect(within(menu).getByText("Operations Manager")).toBeInTheDocument();
  });

  it("keeps sign-out reachable from the profile menu", async () => {
    const user = userEvent.setup();
    renderLayout({ isDemo: false });
    await user.click(screen.getByRole("button", { name: /Widson O\. Ambaisi/ }));
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toBeInTheDocument();
  });

  it("offers the preview switch instead of sign-out in the dev preview", async () => {
    const user = userEvent.setup();
    renderLayout({ isDemo: true });
    await user.click(screen.getByRole("button", { name: /Widson O\. Ambaisi/ }));
    expect(screen.getByRole("menuitem", { name: "Switch preview" })).toBeInTheDocument();
  });

  it("normalises the shortened authenticated founder profile", () => {
    renderLayout({
      isDemo: false,
      profileLabel: undefined,
      profile: { role: "owner", email: "widson@botaniquedesigners.com", full_name: "Widson Ambaisi" },
    });
    expect(screen.getByRole("button", { name: /Widson O\. Ambaisi/ })).toBeInTheDocument();
    expect(screen.queryByText("Widson Ambaisi")).not.toBeInTheDocument();
  });

  it.each([
    ["manager", "Operations Manager"],
    ["staff", "Project Team"],
    ["viewer", "Read-only"],
  ])("presents the %s role as %s", (role, label) => {
    renderLayout({ role, profileLabel: "Team member" });
    expect(screen.getByRole("button", { name: `Team member, ${label}` })).toBeInTheDocument();
  });

  it("uses the Botanique Designers wordmark, not an invented Operations brand", () => {
    renderLayout();
    expect(screen.getAllByText("BOTANIQUE").length).toBeGreaterThan(0);
    expect(screen.getAllByText("DESIGNERS").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Botanique Operations/i)).not.toBeInTheDocument();
  });

  it("uses the approved help footer and drops the finance-boundary note", () => {
    renderLayout();
    expect(screen.getAllByText("Need help?").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Contact your system admin").length).toBeGreaterThan(0);
    expect(
      screen.queryByText("Financial documents remain managed in Simple Invoice Manager.")
    ).not.toBeInTheDocument();
  });

  // Settled terminology authority: visible waive-family wording is prohibited.
  it("shows no visible waive-family wording anywhere in the shell", async () => {
    const user = userEvent.setup();
    renderLayout();
    for (const domain of ["Projects", "Operations", "Finance", "Reports", "More"]) {
      await user.click(domainButton(domain));
    }
    expect(document.body.textContent).not.toMatch(/waive|waived|waiver/i);
  });

  it("uses Title Case for every navigation label", () => {
    renderLayout();
    for (const label of ["Project Intakes", "Daily Site Operations", "Site Costs", "Fund Requests"]) {
      expect(document.body.textContent).not.toContain(label.toLowerCase());
    }
  });
});
