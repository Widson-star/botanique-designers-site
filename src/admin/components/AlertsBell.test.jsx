// BD-ALERTS-01 — the Alerts bell and its compact popover.
//
// These tests hold the CORRECTED PRESENTATION to the Founder's 3 August 2026
// decision and to
// `docs/ui-authority/operations-hub/02-alerts-popover-authority.png`: a bell,
// a small unread count, a short popover, exact drill-through, and no long list
// anywhere. They also hold the Stage 3 model that survived unchanged: marking
// seen resolves nothing, and a source that stops needing attention removes the
// alert on its own.
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import AlertsBell, { ALERTS_POPOVER_LIMIT } from "./AlertsBell";
import { INBOX_CATEGORY, INBOX_TAB } from "../utils/workInboxItems";

function item(overrides = {}) {
  return {
    key: `approval:${overrides.id || "a1"}:submitted`,
    category: INBOX_CATEGORY.DECISION,
    tab: INBOX_TAB.ACTION,
    title: "Project change awaiting your decision",
    detail: "A long description that must never reach the popover.",
    projectId: "p1",
    projectName: "Lugulu Residential Home",
    route: "/admin/approvals/a1",
    isNew: true,
    ...overrides,
  };
}

function renderBell(props = {}) {
  const markSeen = vi.fn();
  const utils = render(
    <MemoryRouter>
      <AlertsBell
        items={props.items || []}
        unreadCount={props.unreadCount === undefined ? 0 : props.unreadCount}
        failedSources={props.failedSources || []}
        status={props.status || "ready"}
        markSeen={props.markSeen || markSeen}
      />
    </MemoryRouter>
  );
  return { ...utils, markSeen: props.markSeen || markSeen };
}

function bell() {
  return screen.getByRole("button", { name: /^Alerts/ });
}

describe("Alerts bell", () => {
  it("shows a small unread count", () => {
    renderBell({ items: [item()], unreadCount: 3 });
    expect(bell()).toHaveAccessibleName("Alerts, 3 unread items");
    expect(within(bell()).getByText("3")).toBeInTheDocument();
  });

  it("caps an implausibly large count rather than distorting the header", () => {
    renderBell({ items: [item()], unreadCount: 250 });
    expect(within(bell()).getByText("99+")).toBeInTheDocument();
  });

  // A failed or incomplete read yields no count, never a confident zero.
  it("shows no badge when the count is unknown", () => {
    renderBell({ unreadCount: null, status: "error" });
    expect(bell()).toHaveAccessibleName("Alerts");
    expect(bell().textContent).toBe("");
  });

  it("shows no badge when nothing is unread", () => {
    renderBell({ items: [item({ isNew: false })], unreadCount: 0 });
    expect(bell().textContent).toBe("");
  });

  it("opens a compact popover, not a page", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item()], unreadCount: 1 });
    await user.click(bell());
    const popover = screen.getByRole("dialog", { name: "Alerts" });
    expect(popover).toBeInTheDocument();
    expect(bell()).toHaveAttribute("aria-expanded", "true");
    // No table, ever.
    expect(within(popover).queryByRole("table")).not.toBeInTheDocument();
  });

  // The popover is a summary. It stays short at any volume.
  it("shows at most the authorised handful of items and offers View all beyond that", async () => {
    const user = userEvent.setup();
    const many = Array.from({ length: 12 }, (_, index) =>
      item({ id: `a${index}`, key: `approval:a${index}:submitted`, title: `Item ${index}` })
    );
    renderBell({ items: many, unreadCount: 12 });
    await user.click(bell());
    const popover = screen.getByRole("dialog", { name: "Alerts" });
    expect(within(popover).getAllByRole("link")).toHaveLength(ALERTS_POPOVER_LIMIT);
    expect(ALERTS_POPOVER_LIMIT).toBeLessThanOrEqual(7);
    expect(within(popover).getByRole("button", { name: /View all alerts/ })).toBeInTheDocument();
  });

  it("offers no View all when everything already fits", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item()], unreadCount: 1 });
    await user.click(bell());
    expect(screen.queryByRole("button", { name: /View all alerts/ })).not.toBeInTheDocument();
  });

  // Category, short title, project context, unread mark, exact link — and no
  // long description or record detail.
  it("carries only controlled summary content on each row", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item()], unreadCount: 1 });
    await user.click(bell());
    const popover = screen.getByRole("dialog", { name: "Alerts" });
    const link = within(popover).getByRole("link");
    expect(link).toHaveAttribute("href", "/admin/approvals/a1");
    expect(link.textContent).toContain("Project change awaiting your decision");
    expect(link.textContent).toContain(INBOX_CATEGORY.DECISION);
    expect(link.textContent).toContain("Lugulu Residential Home");
    expect(link.textContent).not.toContain("A long description");
    expect(within(link).getByText("Unread")).toBeInTheDocument();
  });

  it("marks an unread item seen when it is opened, and links to the exact record", async () => {
    const user = userEvent.setup();
    const markSeen = vi.fn();
    renderBell({ items: [item()], unreadCount: 1, markSeen });
    await user.click(bell());
    await user.click(screen.getByRole("link", { name: /Project change awaiting/ }));
    expect(markSeen).toHaveBeenCalledWith(["approval:a1:submitted"]);
  });

  it("marks all as read without touching any source record", async () => {
    const user = userEvent.setup();
    const markSeen = vi.fn();
    renderBell({
      items: [item(), item({ id: "a2", key: "approval:a2:submitted", isNew: false })],
      unreadCount: 1,
      markSeen,
    });
    await user.click(bell());
    await user.click(screen.getByRole("button", { name: "Mark all as read" }));
    // Only the seen-marker keys are passed. There is no resolve, approve,
    // decide or delete path anywhere in this component.
    expect(markSeen).toHaveBeenCalledWith(["approval:a1:submitted"]);
  });

  it("offers no Mark all as read when nothing is unread", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item({ isNew: false })], unreadCount: 0 });
    await user.click(bell());
    expect(screen.queryByRole("button", { name: "Mark all as read" })).not.toBeInTheDocument();
  });

  // A source that stops requiring attention removes its alert, because items
  // are derived. Nothing in the bell can keep a resolved item alive.
  it("drops an alert once its source no longer produces it", () => {
    const { rerender } = renderBell({ items: [item()], unreadCount: 1 });
    expect(within(bell()).getByText("1")).toBeInTheDocument();
    rerender(
      <MemoryRouter>
        <AlertsBell items={[]} unreadCount={0} failedSources={[]} status="ready" markSeen={vi.fn()} />
      </MemoryRouter>
    );
    expect(bell().textContent).toBe("");
  });

  it("states plainly when sources could not be read, instead of claiming nothing is wrong", async () => {
    const user = userEvent.setup();
    renderBell({ items: [], unreadCount: null, failedSources: ["approvals"], status: "ready" });
    await user.click(bell());
    expect(screen.getByRole("alert").textContent).toMatch(/could not be loaded.*approvals/);
    expect(screen.queryByText(/Nothing needs your attention/)).not.toBeInTheDocument();
  });

  it("says nothing needs attention only when every source actually returned nothing", async () => {
    const user = userEvent.setup();
    renderBell({ items: [], unreadCount: 0, failedSources: [], status: "ready" });
    await user.click(bell());
    expect(screen.getByText("Nothing needs your attention right now.")).toBeInTheDocument();
  });

  it("never places a token, id or item key in a URL", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item()], unreadCount: 1 });
    await user.click(bell());
    for (const link of screen.getAllByRole("link")) {
      const href = link.getAttribute("href");
      expect(href).toBe("/admin/approvals/a1");
      expect(href).not.toMatch(/token|access|apikey|bearer|item_key/i);
    }
  });
});

describe("Alerts bell keyboard and closing behaviour", () => {
  it("opens from the keyboard and closes on Escape, returning focus to the bell", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item()], unreadCount: 1 });
    await user.tab();
    expect(bell()).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(screen.getByRole("dialog", { name: "Alerts" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Alerts" })).not.toBeInTheDocument();
    expect(bell()).toHaveFocus();
  });

  it("reaches every alert link by keyboard while open", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item(), item({ id: "a2", key: "approval:a2:submitted" })], unreadCount: 2 });
    await user.click(bell());
    await user.tab();
    expect(screen.getByRole("button", { name: "Mark all as read" })).toHaveFocus();
    await user.tab();
    expect(screen.getAllByRole("link")[0]).toHaveFocus();
  });

  it("closes when the pointer goes elsewhere", async () => {
    const user = userEvent.setup();
    renderBell({ items: [item()], unreadCount: 1 });
    await user.click(bell());
    await user.click(document.body);
    expect(screen.queryByRole("dialog", { name: "Alerts" })).not.toBeInTheDocument();
  });
});

describe("View all alerts", () => {
  const many = Array.from({ length: 9 }, (_, index) =>
    item({ id: `a${index}`, key: `approval:a${index}:submitted`, title: `Action ${index}` })
  ).concat([
    item({
      id: "w1",
      key: "approval:w1:submitted:mine",
      tab: INBOX_TAB.AWAITING,
      title: "Your project change is awaiting a decision",
      isNew: false,
    }),
  ]);

  async function openAll(user) {
    await user.click(bell());
    await user.click(screen.getByRole("button", { name: /View all alerts/ }));
    return screen.getByRole("dialog", { name: "All alerts" });
  }

  // Contained panel, not a page and not a sidebar destination.
  it("opens a contained bounded panel rather than a full page", async () => {
    const user = userEvent.setup();
    renderBell({ items: many, unreadCount: 9 });
    const panel = await openAll(user);
    expect(panel).toHaveAttribute("aria-modal", "true");
    expect(panel.className).toMatch(/max-h-\[85vh\]/);
    expect(panel.className).toMatch(/max-w-lg/);
    // The rows scroll inside the panel; the page itself never grows.
    expect(panel.querySelector(".overflow-y-auto")).toBeTruthy();
    expect(within(panel).queryByRole("table")).not.toBeInTheDocument();
  });

  it("keeps the two honest Stage 3 groupings and never merges them into one list", async () => {
    const user = userEvent.setup();
    renderBell({ items: many, unreadCount: 9 });
    const panel = await openAll(user);
    expect(within(panel).getByRole("tab", { name: "Needs my action (9)" })).toBeInTheDocument();
    expect(within(panel).getByRole("tab", { name: "Awaiting others (1)" })).toBeInTheDocument();
    expect(within(panel).getAllByRole("link")).toHaveLength(9);
    await user.click(within(panel).getByRole("tab", { name: "Awaiting others (1)" }));
    expect(within(panel).getAllByRole("link")).toHaveLength(1);
  });

  it("closes on Escape and returns focus to the bell", async () => {
    const user = userEvent.setup();
    renderBell({ items: many, unreadCount: 9 });
    await openAll(user);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "All alerts" })).not.toBeInTheDocument();
    expect(bell()).toHaveFocus();
  });
});
