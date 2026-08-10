import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { DailySiteOperationsContext } from "../context/dailySiteOperations";
import { SiteCostsContext } from "../context/siteCosts";
import { FundRequestsContext } from "../context/fundRequests";
import AdminDailySiteOperations from "./AdminDailySiteOperations";
import MorningComplianceCard from "../components/dailysite/MorningComplianceCard";
import { todayIso } from "../utils/dailySiteFormatters";

const projects = [
  { id: "p1", projectName: "Karen Residence", status: "Ongoing", stage: "Implementation", archived: false },
  { id: "p2", projectName: "Lugulu Estate", status: "Ongoing", stage: "Implementation", archived: false },
];

function renderRoute({ role = "manager", entries = [], compliance = [], authorisedProjects = projects, dailyOverrides = {}, projectsOverride, claims = [], finance = {} } = {}) {
  const adminValue = {
    role, projects: projectsOverride || projects, profilesById: {}, currentUserId: "m1",
  };
  const dailyValue = {
    entries, compliance, authorisedProjects, status: "ready", error: "",
    createWaiver: vi.fn(() => Promise.resolve({ ok: true })),
    refresh: vi.fn(() => Promise.resolve({ ok: true })),
    ...dailyOverrides,
  };
  return render(
    <MemoryRouter>
      <AdminDataContext.Provider value={adminValue}>
        <DailySiteOperationsContext.Provider value={dailyValue}>
          <SiteCostsContext.Provider value={{ claims, status: "ready", error: "" }}>
            <FundRequestsContext.Provider value={{
              requests: [], allocations: [], releases: [], acquittals: [], ...finance,
            }}>
            <AdminDailySiteOperations />
            </FundRequestsContext.Provider>
          </SiteCostsContext.Provider>
        </DailySiteOperationsContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

describe("AdminDailySiteOperations route access", () => {
  it("is available to the owner and manager", () => {
    renderRoute({ role: "owner" });
    expect(screen.getByRole("heading", { name: "Daily Site Record" })).toBeInTheDocument();
  });

  it.each(["staff", "viewer"])("is unavailable to %s", (role) => {
    renderRoute({ role });
    expect(screen.getByText("Daily Site Record unavailable")).toBeInTheDocument();
  });

  it("shows a clear no-authorised-projects state for a manager with no authority", () => {
    renderRoute({ role: "manager", authorisedProjects: [] });
    expect(screen.getByText("No projects assigned to you yet")).toBeInTheDocument();
    // The New-entry action is not offered when there is nothing to record against.
    expect(screen.queryByRole("link", { name: "New site record" })).not.toBeInTheDocument();
  });

  it("does not show the no-authority state to the owner", () => {
    renderRoute({ role: "owner", authorisedProjects: [] });
    expect(screen.queryByText("No projects assigned to you yet")).not.toBeInTheDocument();
  });
});

describe("AdminDailySiteOperations queue and summary", () => {
  const compliance = [
    { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "entry_present" },
    { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" },
  ];
  const entries = [
    {
      id: "e1", projectId: "p1", workDate: todayIso(), disposition: "working",
      expectedWorkerCount: 6, ratePerWorker: 400, plannedLabourCost: 2400, state: "submitted",
      isLate: false, noWorkReason: "", workPlanned: "Lay turf and edge the borders",
    },
  ];

  it("shows compliance counts and the missing project with a record link", () => {
    renderRoute({ entries, compliance });
    expect(screen.getByText("1 site is due today and has no record yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Lugulu Estate/ }))
      .toHaveAttribute("href", "/admin/daily-site-operations/new?project=p2");
  });

  it("renders entries as readable rows without raw ids or JSON", () => {
    const { container } = renderRoute({ entries, compliance });
    // Rendered in both the desktop table and the mobile card (CSS-hidden, still
    // in the DOM), so the project name and workforce appear more than once.
    expect(screen.getAllByText("Karen Residence").length).toBeGreaterThan(0);
    expect(screen.getAllByText("6 workers").length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-/);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  it("renders the authority's seven desktop columns in order with the date on one line", () => {
    const { container } = renderRoute({ entries, compliance });
    const headers = Array.from(container.querySelectorAll("thead th")).map((th) =>
      th.textContent.trim()
    );
    // Exactly the authority image's seven columns, in its order.
    expect(headers).toEqual([
      "Project / Site",
      "Work date",
      "Site plan",
      "Planned workforce",
      "Planned labour cost",
      "Status",
      "Next action",
    ]);
    // The work-date cell is kept on a single line (never vertical char wrapping).
    const dateCell = Array.from(container.querySelectorAll("tbody td")).find((td) =>
      /\d{4}/.test(td.textContent)
    );
    expect(dateCell.className).toMatch(/whitespace-nowrap/);
  });

  it("offers the reviewer's next action for a submitted record, with the planned labour cost", () => {
    renderRoute({ role: "owner", entries, compliance });
    const reviewLinks = screen.getAllByRole("link", { name: "Review record" });
    expect(reviewLinks.length).toBeGreaterThan(0);
    expect(reviewLinks[0]).toHaveAttribute("href", "/admin/daily-site-operations/e1");
    expect(screen.getAllByText("KES 2,400").length).toBeGreaterThan(0);
  });

  // The next action has to be the READER's action. A manager holds no accept or
  // return authority, so offering them "Review record" would promise a decision
  // the record itself will refuse.
  it("does not offer a manager the Principal's review verb", () => {
    renderRoute({ role: "manager", entries, compliance });
    expect(screen.queryByRole("link", { name: "Review record" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "View record" }).length).toBeGreaterThan(0);
  });

  it("shows a Late badge for a late submitted entry", () => {
    renderRoute({
      entries: [{ ...entries[0], isLate: true }],
      compliance,
    });
    expect(screen.getAllByText("Late").length).toBeGreaterThan(0);
  });

  it("renders a no-work entry with its reason and no workforce cost", () => {
    renderRoute({
      entries: [
        {
          id: "e2", projectId: "p1", workDate: todayIso(), disposition: "no_work",
          noWorkReason: "rain", state: "submitted", isLate: false,
        },
      ],
      compliance,
    });
    expect(screen.getAllByText("No work today").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Rain").length).toBeGreaterThan(0);
  });

  it("handles a long project name and long planned activities without raw JSON", () => {
    const longName =
      "Karen Residence — Fountain Garden, Mature Borders, Water Feature & Perimeter Screening";
    const { container } = renderRoute({
      entries: [
        {
          ...entries[0],
          workPlanned:
            "Excavate and prepare the northern bed, install irrigation spurs, then lay imported topsoil across the full border run before planting.",
        },
      ],
      compliance,
      projectsOverride: [{ id: "p1", projectName: longName, status: "Ongoing", stage: "Implementation", archived: false }],
    });
    expect(screen.getAllByText(longName).length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/[{}]/);
  });

  // 3 August 2026 terminology correction. The disposition and its Principal-
  // only authority are unchanged; only what the reader sees changed.
  it("labels a not-required day as 'Not required', never 'Waived'", () => {
    renderRoute({
      compliance: [
        { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "waived" },
      ],
    });
    expect(screen.getAllByText("Not required").length).toBeGreaterThan(0);
    // The authority's fifth metric card carries it.
    const region = screen.getByRole("region", { name: "Today's site record position" });
    expect(within(region).getByText("Not required").parentElement.parentElement)
      .toHaveTextContent("No work planned");
    expect(screen.queryByText(/waive/i)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Visual Authority Tranche 1 — image 08. The first viewport has to answer "what
// is the day's position, and what is waiting on me" before it shows one record.
// ---------------------------------------------------------------------------

describe("Daily Site Record list — the authority's five metrics (image 08)", () => {
  const today = todayIso();

  const entry = (overrides = {}) => ({
    id: "e1", projectId: "p1", workDate: today, disposition: "working",
    expectedWorkerCount: 6, ratePerWorker: 400, plannedLabourCost: 2400, state: "submitted",
    isLate: false, noWorkReason: "", workPlanned: "Lay turf and edge the borders",
    submittedAt: `${today}T07:30:00Z`, ...overrides,
  });

  // The committed authority image shows FIVE metric cards across the top, in
  // this order. A previous pass deleted them on an inferred "card-per-metric"
  // rule; the image is the higher authority and they are restored.
  it("renders the five authority metrics, in the authority's order", () => {
    renderRoute({
      role: "owner",
      entries: [entry(), entry({ id: "e2", projectId: "p2", state: "accepted" })],
      compliance: [
        { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "entry_present" },
        { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "entry_late" },
      ],
    });
    const region = screen.getByRole("region", { name: "Today's site record position" });
    const labels = within(region).getAllByText(
      /^(Due today|Awaiting review|Late|Accepted|Not required)$/
    ).map((node) => node.textContent);
    expect(labels).toEqual(["Due today", "Awaiting review", "Late", "Accepted", "Not required"]);
  });

  it("counts each metric truthfully and names the sites it covers", () => {
    renderRoute({
      role: "owner",
      entries: [entry(), entry({ id: "e2", projectId: "p2", state: "accepted" })],
      compliance: [
        { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "entry_present" },
        { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "entry_late" },
      ],
    });
    const region = screen.getByRole("region", { name: "Today's site record position" });
    const card = (label) => within(region).getByText(label).closest("div").parentElement;
    expect(card("Due today")).toHaveTextContent("2");
    expect(card("Due today")).toHaveTextContent("Across 2 sites");
    expect(card("Awaiting review")).toHaveTextContent("Across 1 site");
    expect(card("Late")).toHaveTextContent("1");
    expect(card("Accepted")).toHaveTextContent("1");
  });

  it("keeps a zero metric visible rather than hiding the card", () => {
    renderRoute({ role: "owner", entries: [], compliance: [] });
    const region = screen.getByRole("region", { name: "Today's site record position" });
    expect(within(region).getByText("Late").closest("div").parentElement).toHaveTextContent("0");
  });

  // The image's filter chips carry no counts — the counts are in the cards.
  it("renders the authority's filter chips without duplicating the counts", () => {
    renderRoute({ role: "owner", entries: [entry()], compliance: [] });
    const filters = screen.getByRole("tablist", { name: "Record filters" });
    expect(within(filters).getAllByRole("tab").map((tab) => tab.textContent)).toEqual([
      "Today", "Awaiting review", "Late", "Returned", "Accepted", "All",
    ]);
  });

  // The image's illustrative data has no missing site, so it settles no
  // treatment for one. It goes in the image's own contextual bottom bar.
  it("surfaces a due site with no record in the contextual bottom bar", () => {
    renderRoute({
      role: "owner",
      entries: [entry()],
      compliance: [
        { projectId: "p1", projectName: "Karen Residence", due: true, complianceStatus: "entry_present" },
        { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" },
      ],
    });
    expect(screen.getByText("1 site is due today and has no record yet")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Lugulu Estate" }))
      .toHaveAttribute("href", "/admin/daily-site-operations/new?project=p2");
  });

  it("otherwise carries the authority's cost-claim hand-off in that bar", () => {
    renderRoute({ role: "owner", entries: [entry()], compliance: [] });
    expect(screen.getByText(/Once all due site records are accepted/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Go to Cost Claims/ }))
      .toHaveAttribute("href", "/admin/site-costs");
  });

  it("shows when the record actually arrived, and whether that was late", () => {
    renderRoute({ role: "owner", entries: [entry({ isLate: true })], compliance: [] });
    expect(screen.getAllByText(/Submitted late/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Late").length).toBeGreaterThan(0);
  });

  it("shows the authority's record count under the table", () => {
    renderRoute({ role: "owner", entries: [entry()], compliance: [] });
    expect(screen.getByText(/Showing 1 to 1 of 1 record/)).toBeInTheDocument();
  });
});

describe("Daily Site Record list — financial follow-up stays compact", () => {
  const ADVANCE = "operations_manager_accountable_advance";
  const DIRECT = "direct_recipient_funding";
  const today = todayIso();
  const entry = {
    id: "e1", projectId: "p1", workDate: today, disposition: "working",
    expectedWorkerCount: 6, ratePerWorker: 400, plannedLabourCost: 2400, state: "accepted",
    isLate: false, noWorkReason: "", workPlanned: "Lay turf", submittedAt: `${today}T07:30:00Z`,
  };
  const claims = [{
    id: "c1", projectId: "p1", dailySiteEntryId: "e1", serviceDate: today,
    recipientLabel: "Alego turf crew", lifecycle: "approved", submittedTotal: 20000, approvedTotal: 20000,
  }];
  const request = { id: "r1", requestNumber: "BDFR-2026-0001", projectId: "p1", status: "approved", intendedCustodyType: ADVANCE, totalRequestedAmount: 20000, version: 1 };
  const allocation = { id: "a1", fundRequestId: "r1", claimId: "c1", requestedAmount: 20000 };
  const release = (overrides = {}) => ({
    id: "rel1", fundRequestId: "r1", status: "recorded", custodyDisposition: ADVANCE,
    releasedAmount: 10000, version: 1, ...overrides,
  });

  it("says no claim exists when none does, rather than implying an unpaid one", () => {
    renderRoute({ role: "owner", entries: [entry], claims: [] });
    expect(screen.getAllByText("No cost claim yet").length).toBeGreaterThan(0);
  });

  // The whole point of PR #99, carried into the list: one label must never
  // conceal the other half of the position.
  it("names funding and reconciliation together when both say something", () => {
    renderRoute({
      role: "owner", entries: [entry], claims,
      finance: { requests: [request], allocations: [allocation], releases: [release()], acquittals: [] },
    });
    expect(screen.getAllByText("Partly funded · Reconciliation outstanding").length).toBeGreaterThan(0);
  });

  it("never invents a reconciliation debt for a direct settled payment", () => {
    renderRoute({
      role: "owner", entries: [entry], claims,
      finance: {
        requests: [request], allocations: [allocation],
        releases: [release({ custodyDisposition: DIRECT, releasedAmount: 20000 })], acquittals: [],
      },
    });
    expect(screen.getAllByText("Financially settled").length).toBeGreaterThan(0);
    expect(screen.queryByText(/Reconciliation outstanding/)).not.toBeInTheDocument();
  });

  it("keeps the financial position to one line and never a column of its own", () => {
    const { container } = renderRoute({
      role: "owner", entries: [entry], claims,
      finance: { requests: [request], allocations: [allocation], releases: [release()], acquittals: [] },
    });
    const headers = Array.from(container.querySelectorAll("thead th")).map((th) => th.textContent.trim());
    expect(headers).not.toContain("Financial position");
    expect(headers).not.toContain("Funding");
  });

  it("counts several related claims without listing them in the row", () => {
    renderRoute({
      role: "owner", entries: [entry],
      claims: [claims[0], { ...claims[0], id: "c2", lifecycle: "awaiting_review", dailySiteEntryId: "" }],
    });
    expect(screen.getAllByText("2 cost claims").length).toBeGreaterThan(0);
  });

  it("renders both the desktop table and the mobile card list, with no fixed-width table on mobile", () => {
    const { container } = renderRoute({ role: "owner", entries: [entry], claims });
    const table = container.querySelector("table");
    expect(table.closest("div").className).toMatch(/hidden/);
    expect(table.closest("div").className).toMatch(/md:block/);
    const cards = container.querySelector("ul.md\\:hidden");
    expect(cards).toBeTruthy();
    expect(within(cards).getAllByRole("link").length).toBeGreaterThan(0);
  });
});

function renderCard({ role = "owner", compliance = [], createWaiver = vi.fn(() => Promise.resolve({ ok: true })) } = {}) {
  return render(
    <MemoryRouter>
      <DailySiteOperationsContext.Provider value={{ compliance, status: "ready", createWaiver, refresh: vi.fn(() => Promise.resolve({ ok: true })) }}>
        <MorningComplianceCard role={role} />
      </DailySiteOperationsContext.Provider>
    </MemoryRouter>
  );
}

describe("MorningComplianceCard (dashboard)", () => {
  it("shows the all-complete state when nothing is missing", () => {
    renderCard({ compliance: [{ due: true, complianceStatus: "entry_present" }] });
    expect(screen.getByText(/have a morning entry or were marked not required today/)).toBeInTheDocument();
  });

  it("shows missing, late and not-required counts and a mark-not-required control for the owner", () => {
    renderCard({
      role: "owner",
      compliance: [
        { projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" },
        { due: true, complianceStatus: "entry_late" },
        { due: true, complianceStatus: "waived" },
      ],
    });
    // The row now leads with the action ("Morning site entry missing") and
    // carries the project and compliance state on one supporting line, per
    // the Dashboard authority screen's "Due today" panel.
    const item = screen.getByText(/Lugulu Estate/).closest("li");
    expect(within(item).getByRole("button", { name: "Mark not required" })).toBeInTheDocument();
    expect(within(item).getByRole("link", { name: "Record" })).toBeInTheDocument();
  });

  it("hides the mark-not-required control from the manager", () => {
    renderCard({
      role: "manager",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
    });
    expect(screen.queryByRole("button", { name: "Mark not required" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Record" })).toBeInTheDocument();
  });

  // 3 August 2026: the Founder found "waive" confusing. The mechanism, its
  // Principal-only authority and its audit fields are unchanged — only the
  // dialog copy changed. This proves no "waive" wording survives anywhere in
  // it, including the field label and the confirm button.
  it("opens the not-required dialog with plain-language copy and no 'waive' wording", () => {
    renderCard({
      role: "owner",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark not required" }));
    const dialog = screen.getByRole("alertdialog");

    expect(within(dialog).getByText("Mark morning entry not required — Lugulu Estate")).toBeInTheDocument();
    expect(within(dialog).getByText(/Marking this not required satisfies the morning entry/)).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Reason it's not required")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Mark not required" })).toBeInTheDocument();
    expect(screen.queryByText(/waive/i)).not.toBeInTheDocument();
  });

  it("submits the mark-not-required action through the unchanged createWaiver mutation", async () => {
    const createWaiver = vi.fn(() => Promise.resolve({ ok: true }));
    renderCard({
      role: "owner",
      compliance: [{ projectId: "p2", projectName: "Lugulu Estate", due: true, complianceStatus: "missing" }],
      createWaiver,
    });
    fireEvent.click(screen.getByRole("button", { name: "Mark not required" }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.change(within(dialog).getByLabelText("Reason it's not required"), { target: { value: "Site closed for a public holiday" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Mark not required" }));

    await waitFor(() => expect(createWaiver).toHaveBeenCalledWith("p2", expect.any(String), "Site closed for a public holiday"));
  });
});
