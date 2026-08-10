import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "./context/adminData";
import AdminLayout from "./AdminLayout";
import { waLink } from "../utils/whatsapp";
import { CONTACT } from "../utils/backend";

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

// Operating-model authority, merged PR #93. Authority:
// docs/ui-authority/operations-hub/operating-model-authority/
describe("Operating-model navigation domains", () => {
  it("presents exactly the approved domains, in the approved order, with no More", () => {
    renderLayout();
    const nav = desktopNav();
    expect(Array.from(nav.children).map((row) => row.textContent)).toEqual([
      "Dashboard",
      "Projects",
      "Operations",
      "Finance",
      "Approvals",
      "Reports",
    ]);
    // Dashboard and Approvals are direct destinations. Finance now EXPANDS with
    // its four capability children, per the Founder amendment of 10 Aug 2026;
    // Reports is a single destination with ONE visible name.
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/admin");
    expect(within(nav).getByRole("link", { name: "Reports" })).toHaveAttribute(
      "href",
      "/admin/reports"
    );
    expect(within(nav).getByRole("button", { name: "Finance" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Approvals" })).toHaveAttribute(
      "href",
      "/admin/approvals"
    );
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "More" })).not.toBeInTheDocument();
  });

  it.each([
    ["Projects", ["Project Register", "Project Proposals"], ["/admin/projects", "/admin/project-intakes"]],
    ["Operations", ["Daily Site Record", "People"], ["/admin/daily-site-operations", "/admin/people"]],
    ["Finance", ["Project Costs", "Company Expenses", "Staff Compensation", "Funding, Payments & Reconciliation"],
      ["/admin/site-costs", "/admin/finance/company-expenses", "/admin/finance/staff-compensation", "/admin/fund-requests"]],
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
    const nav = desktopNav();
    expect(within(nav).getByRole("button", { name: "Finance" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Approvals" })).toBeInTheDocument();
    // One group opens at a time, so each is inspected while it is the open one.
    const expected = {
      Projects: ["Project Register", "Project Proposals"],
      Operations: ["Daily Site Record", "People"],
      Finance: ["Project Costs", "Company Expenses", "Staff Compensation", "Funding, Payments & Reconciliation"],
    };
    for (const [domain, labels] of Object.entries(expected)) {
      await user.click(domainButton(domain));
      for (const label of labels) {
        expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
      }
    }
  });

  it("shows the Operations Manager the same domains and destinations", async () => {
    const user = userEvent.setup();
    renderLayout({ role: "manager", profileLabel: "Martine Lotom" });
    const nav = desktopNav();
    expect(Array.from(nav.children).map((row) => row.textContent)).toEqual([
      "Dashboard",
      "Projects",
      "Operations",
      "Finance",
      "Approvals",
      "Reports",
    ]);
    await user.click(domainButton("Operations"));
    expect(within(nav).getByRole("link", { name: "People" })).toHaveAttribute(
      "href",
      "/admin/people"
    );
  });

  // A domain whose every child (or, for a direct domain, itself) is
  // unauthorised must not render at all — not empty, not disabled, not greyed.
  it.each(["staff", "viewer"])("omits domains with no authorised destination for %s", (role) => {
    renderLayout({ role, profileLabel: "Team member" });
    const nav = desktopNav();
    const buttonLabels = within(nav).queryAllByRole("button").map((row) => row.textContent);
    expect(buttonLabels).not.toContain("Operations");
    expect(within(nav).queryByRole("button", { name: "Finance" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Finance" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Approvals" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "People" })).not.toBeInTheDocument();
    expect(within(nav).queryByRole("link", { name: "Daily Site Record" })).not.toBeInTheDocument();
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
      screen.queryByRole("link", { name: /Work Overview|Labour|Suppliers|Documents|Maintenance|Tools and Equipment/i })
    ).not.toBeInTheDocument();
  });
});

describe("Operating-model active and expanded state", () => {
  it.each([
    ["/admin/projects", "Projects", "Project Register"],
    ["/admin/projects/abc-123", "Projects", "Project Register"],
    ["/admin/projects/abc-123/edit", "Projects", "Project Register"],
    ["/admin/project-intakes", "Projects", "Project Proposals"],
    ["/admin/project-intakes/xyz", "Projects", "Project Proposals"],
    ["/admin/daily-site-operations", "Operations", "Daily Site Record"],
    ["/admin/daily-site-operations/e1/edit", "Operations", "Daily Site Record"],
    ["/admin/people/p1", "Operations", "People"],
    ["/admin/site-costs", "Finance", "Project Costs"],
  ])("opens the owning domain and marks the right child on %s", (path, domain, child) => {
    renderLayout({ path });
    const nav = desktopNav();
    expect(within(nav).getByRole("button", { name: domain })).toHaveAttribute(
      "aria-expanded",
      "true"
    );
    expect(within(nav).getByRole("link", { name: child }).className).toMatch(/bg-\[#ecefe9\]/);
  });

  // A Site Costs or Fund Requests URL still marks Finance as the owning domain,
  // because both are now its capability children. Finance is a disclosure, so it
  // is marked by being OPEN rather than by aria-current.
  it.each([
    ["/admin/finance", "Finance"],
    ["/admin/site-costs/c1", "Finance"],
    ["/admin/site-costs/c1/edit", "Finance"],
    ["/admin/fund-requests/r1/edit", "Finance"],
    ["/admin/approvals", "Approvals"],
    ["/admin/approvals/a1", "Approvals"],
  ])("marks %s active on %s", (path, domain) => {
    renderLayout({ path });
    const nav = desktopNav();
    if (domain === "Finance") {
      expect(within(nav).getByRole("button", { name: domain })).toHaveAttribute("aria-expanded", "true");
      return;
    }
    const link = within(nav).getByRole("link", { name: domain });
    expect(link.className).toMatch(/bg-\[#ecefe9\]/);
    expect(link).toHaveAttribute("aria-current", "page");
  });

  // The authority proves these are independent: Dashboard is active while
  // Operations is expanded, and no child of the expanded group is active.
  it("keeps active and expanded independent", async () => {
    const user = userEvent.setup();
    renderLayout({ path: "/admin" });
    await user.click(domainButton("Operations"));

    const nav = desktopNav();
    expect(within(nav).getByRole("button", { name: "Operations" })).toHaveAttribute(
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
    await user.click(domainButton("Finance"));

    expect(window.location.href).toBe(before);
    // The route did not move: the Finance-family destination is still active.
    expect(screen.getByRole("heading", { name: "Destination heading" })).toBeInTheDocument();
  });
});

describe("Operating-model desktop collapse (104px)", () => {
  it("starts expanded on first use and shows the collapse control", () => {
    renderLayout();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("collapses to 104px, superseding the old 64px rail, restores, and remembers the preference in this browser", async () => {
    const user = userEvent.setup();
    const view = renderLayout();

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(window.localStorage.getItem("botanique.admin.sidebarCollapsed")).toBe("1");
    const aside = view.container.querySelector("aside");
    expect(aside.className).toMatch(/lg:w-\[104px\]/);
    expect(aside.className).not.toMatch(/lg:w-16\b/);

    view.unmount();
    const restored = renderLayout();
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeInTheDocument();
    expect(restored.container.querySelector("aside").className).toMatch(/lg:w-\[104px\]/);
  });

  // Collapsed rows carry no visible text, so the accessible name must carry it.
  it("gives every collapsed rail control an accessible name", async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));

    const nav = desktopNav();
    for (const label of ["Dashboard", "Approvals", "Reports"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeInTheDocument();
    }
    for (const label of ["Projects", "Operations", "Finance"]) {
      expect(within(nav).getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("keeps the official Botanique badge recognisably visible when collapsed", async () => {
    const user = userEvent.setup();
    renderLayout();
    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.getAllByAltText("Botanique Designers").length).toBeGreaterThan(0);
  });
});

describe("Operating-model mobile drawer", () => {
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

  it("closes after a direct destination is selected", async () => {
    const user = userEvent.setup();
    renderLayout();
    await openDrawer(user);

    const drawer = screen.getByRole("dialog", { name: "Admin navigation" });
    await user.click(within(drawer).getByRole("link", { name: "Approvals" }));

    expect(screen.queryByRole("dialog", { name: "Admin navigation" })).not.toBeInTheDocument();
  });

  it("closes after a grouped destination is selected", async () => {
    const user = userEvent.setup();
    renderLayout();
    await openDrawer(user);

    const drawer = screen.getByRole("dialog", { name: "Admin navigation" });
    await user.click(within(drawer).getByRole("button", { name: "Operations" }));
    await user.click(within(drawer).getByRole("link", { name: "People" }));

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
    expect(within(drawer).getByRole("link", { name: "People" })).toBeInTheDocument();

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

describe("Operating-model preserved shell", () => {
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
  // and the full name and role are one press away in the profile menu.
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

  // Identity: the official public/botanique.png asset, never a retyped
  // wordmark or an invented mark. Operations Hub sits visibly subordinate.
  it("uses the official Botanique badge, not a retyped wordmark or invented mark", () => {
    renderLayout();
    const badges = screen.getAllByAltText("Botanique Designers");
    expect(badges.length).toBeGreaterThan(0);
    for (const badge of badges) {
      expect(badge).toHaveAttribute("src", "/botanique.png");
    }
    expect(screen.queryByText("BOTANIQUE")).not.toBeInTheDocument();
    expect(screen.queryByText("DESIGNERS")).not.toBeInTheDocument();
    expect(screen.getAllByText("Operations Hub").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Botanique Operations/i)).not.toBeInTheDocument();
  });

  it("uses the approved help footer and drops the finance-boundary note", () => {
    renderLayout();
    expect(screen.getAllByText("Need help?").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Open WhatsApp support").length).toBeGreaterThan(0);
    // The old treatment named a person who does not exist.
    expect(screen.queryByText("Contact your system admin")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Financial documents remain managed in Simple Invoice Manager.")
    ).not.toBeInTheDocument();
  });

  it("opens WhatsApp support at the authoritative Botanique number", () => {
    renderLayout();
    const [support] = screen.getAllByText("Open WhatsApp support").map((node) => node.closest("a"));
    // The destination is CONTACT.whatsapp through waLink(), never a number
    // hardcoded into the Hub, so support can never drift from the public site.
    expect(support).toHaveAttribute("href", waLink("Hello Botanique Designers, I need help with the Operations Hub."));
    expect(support.getAttribute("href")).toContain(`wa.me/${CONTACT.whatsapp}`);
    expect(support).toHaveAttribute("target", "_blank");
    expect(support).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  // Settled terminology authority: visible waive-family wording is prohibited.
  it("shows no visible waive-family wording anywhere in the shell", async () => {
    const user = userEvent.setup();
    renderLayout();
    for (const domain of ["Projects", "Operations", "Finance"]) {
      await user.click(domainButton(domain));
    }
    expect(document.body.textContent).not.toMatch(/waive|waived|waiver/i);
  });

  it("uses Title Case for every navigation label", () => {
    renderLayout();
    for (const label of ["Project Register", "Project Proposals", "Daily Site Record", "Project Costs", "Approvals"]) {
      expect(document.body.textContent).not.toContain(label.toLowerCase());
    }
  });
});
