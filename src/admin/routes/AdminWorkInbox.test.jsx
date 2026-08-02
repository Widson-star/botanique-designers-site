// BD-INBOX-01 (Stage 3) — the Work Inbox screen.
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import AdminWorkInbox from "./AdminWorkInbox";

const loadWorkInbox = vi.fn();
vi.mock("../utils/workInboxLoader", async () => {
  const actual = await vi.importActual("../utils/workInboxLoader");
  return { ...actual, loadWorkInbox: (...args) => loadWorkInbox(...args) };
});

const markInboxItemsRead = vi.fn(async () => {});
vi.mock("../lib/workInbox", async () => {
  const actual = await vi.importActual("../lib/workInbox");
  return { ...actual, markInboxItemsRead: (...args) => markInboxItemsRead(...args) };
});

const ACTION_ITEM = {
  key: "claim:c1:awaiting_review",
  category: "Decision required",
  tab: "action",
  title: "Cost claim awaiting your review",
  detail: "Casual labour for terracing",
  projectId: "p1",
  projectName: "Alego Usonga",
  route: "/admin/site-costs/c1",
  isNew: true,
};

const AWAITING_ITEM = {
  key: "fund:f1:submitted:mine",
  category: "Decision required",
  tab: "awaiting",
  title: "Your fund request is awaiting authority",
  detail: "With the Principal.",
  projectId: "p1",
  projectName: "Alego Usonga",
  route: "/admin/fund-requests/f1",
  isNew: false,
};

function renderInbox({ role = "owner", isDemo = false } = {}) {
  const value = {
    role,
    isDemo,
    accessToken: isDemo ? "" : "token",
    currentUserId: "owner-1",
    projects: [],
    profiles: [],
    profilesById: {},
  };
  return render(
    <MemoryRouter initialEntries={["/admin/work-inbox"]}>
      <AdminDataContext.Provider value={value}>
        <Routes>
          <Route path="/admin/work-inbox" element={<AdminWorkInbox />} />
          {/* Opening an item really does navigate away from the inbox to the
              module that owns the record. The destination is stubbed so the
              click can be followed and asserted. */}
          <Route path="/admin/site-costs/:claimId" element={<p>Site cost record</p>} />
          <Route path="/admin/fund-requests/:requestId" element={<p>Fund request record</p>} />
        </Routes>
      </AdminDataContext.Provider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  loadWorkInbox.mockReset();
  loadWorkInbox.mockResolvedValue({ items: [], failedSources: [] });
  markInboxItemsRead.mockClear();
});

describe("access", () => {
  it("tells a role that receives nothing, and reads no source", async () => {
    renderInbox({ role: "staff" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Work Inbox unavailable");
    expect(loadWorkInbox).not.toHaveBeenCalled();
  });

  it("opens for the Principal and for the Operations Manager", async () => {
    for (const role of ["owner", "manager"]) {
      loadWorkInbox.mockResolvedValue({ items: [], failedSources: [] });
      const { unmount } = renderInbox({ role });
      expect(await screen.findByRole("heading", { level: 1, name: "Work Inbox" })).toBeInTheDocument();
      unmount();
    }
  });
});

describe("empty and error states", () => {
  it("says plainly when nothing needs action, and scopes the claim to what the reader can see", async () => {
    renderInbox();
    expect(await screen.findByText("Nothing needs your action right now.")).toBeInTheDocument();
    expect(screen.getByText(/Only the records you have access to are checked/i)).toBeInTheDocument();
  });

  it("keeps a genuine load failure an error and never an empty inbox", async () => {
    loadWorkInbox.mockRejectedValue(new Error("boom"));
    renderInbox();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/could not be loaded/i);
    expect(screen.queryByText("Nothing needs your action right now.")).not.toBeInTheDocument();
  });

  it("says the list is incomplete when a source failed, rather than showing an empty state", async () => {
    loadWorkInbox.mockResolvedValue({ items: [], failedSources: ["cost claims"] });
    renderInbox();
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(/cost claims/);
    expect(alert).toHaveTextContent(/incomplete/i);
    expect(screen.queryByText("Nothing needs your action right now.")).not.toBeInTheDocument();
  });
});

describe("items", () => {
  it("shows what is needed, which project, and links to the exact owning record", async () => {
    loadWorkInbox.mockResolvedValue({ items: [ACTION_ITEM], failedSources: [] });
    renderInbox();
    const link = await screen.findByRole("link", { name: /Cost claim awaiting your review/ });
    expect(link).toHaveAttribute("href", "/admin/site-costs/c1");
    expect(link).toHaveTextContent("Alego Usonga");
    expect(link).toHaveTextContent("Decision required");
    expect(link).toHaveTextContent("New");
  });

  it("separates work to do from work awaiting someone else", async () => {
    loadWorkInbox.mockResolvedValue({ items: [ACTION_ITEM, AWAITING_ITEM], failedSources: [] });
    renderInbox();
    expect(await screen.findByRole("tab", { name: /Needs my action \(1\)/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Awaiting others \(1\)/ })).toBeInTheDocument();

    // The awaiting item is not presented as work to do.
    expect(screen.queryByText("Your fund request is awaiting authority")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: /Awaiting others/ }));
    expect(screen.getByText("Your fund request is awaiting authority")).toBeInTheDocument();
    expect(screen.queryByText("Cost claim awaiting your review")).not.toBeInTheDocument();
  });

  it("never puts an access token in a link", async () => {
    loadWorkInbox.mockResolvedValue({ items: [ACTION_ITEM, AWAITING_ITEM], failedSources: [] });
    renderInbox();
    await screen.findByRole("link", { name: /Cost claim/ });
    for (const link of screen.getAllByRole("link")) {
      expect(link.getAttribute("href")).not.toMatch(/token|apikey|Bearer|access_token/i);
    }
  });
});

describe("reading does not resolve", () => {
  it("opens the exact owning record and marks the item seen, writing only read state", async () => {
    loadWorkInbox.mockResolvedValue({ items: [ACTION_ITEM], failedSources: [] });
    renderInbox();
    const link = await screen.findByRole("link", { name: /Cost claim awaiting your review/ });
    fireEvent.click(link);

    // The reader lands on the record that owns the issue, where the decision is
    // actually made — the inbox never decides anything itself.
    expect(await screen.findByText("Site cost record")).toBeInTheDocument();

    // The ONLY write is the personal seen-marker: the claim's own lifecycle is
    // never touched from here.
    await waitFor(() => expect(markInboxItemsRead).toHaveBeenCalledTimes(1));
    const [, userId, keys] = markInboxItemsRead.mock.calls[0];
    expect(userId).toBe("owner-1");
    expect(keys).toEqual(["claim:c1:awaiting_review"]);
  });

  it("marks everything seen without removing anything from the list", async () => {
    loadWorkInbox.mockResolvedValue({ items: [ACTION_ITEM], failedSources: [] });
    renderInbox();
    fireEvent.click(await screen.findByRole("button", { name: "Mark all as seen" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: "Mark all as seen" })).not.toBeInTheDocument()
    );
    expect(screen.getByText("Cost claim awaiting your review")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Needs my action \(1\)/ })).toBeInTheDocument();
  });

  it("states on the page that seeing an item does not resolve it", async () => {
    renderInbox();
    expect(
      await screen.findByText(/Marking an item seen does not resolve it/i)
    ).toBeInTheDocument();
  });
});

describe("mobile", () => {
  it("uses a card list and no table, so nothing depends on horizontal scrolling", async () => {
    loadWorkInbox.mockResolvedValue({ items: [ACTION_ITEM, AWAITING_ITEM], failedSources: [] });
    const { container } = renderInbox();
    await screen.findByRole("link", { name: /Cost claim/ });
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelectorAll("ul li").length).toBeGreaterThan(0);
  });
});

describe("dev preview", () => {
  it("reads as empty and never fabricates items", async () => {
    renderInbox({ isDemo: true });
    expect(await screen.findByText(/dev preview holds no operational records/i)).toBeInTheDocument();
    expect(loadWorkInbox).not.toHaveBeenCalled();
  });
});
