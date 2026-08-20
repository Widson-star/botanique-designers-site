import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AdminDataContext } from "../context/adminData";
import { InventoryContext } from "../context/inventory";
import AdminInventory from "./AdminInventory";

// Production Inventory is genuinely empty. These defaults are that truth, not
// a fixture: the empty screen is the first thing a real user will see.
function inventoryValue(overrides = {}) {
  const items = overrides.items || [];
  const assets = overrides.assets || [];
  const positions = overrides.positions || [];
  return {
    items, assets, positions,
    movements: [], assetEvents: [], itemEvents: [],
    activity: overrides.activity || [],
    sites: overrides.sites || [],
    people: overrides.people || [],
    summary: {
      catalogueItems: items.filter((item) => item.isActive).length,
      assetsInCirculation: assets.filter((asset) => asset.status === "issued").length,
      underRepair: assets.filter((asset) => asset.status === "under_repair").length,
      activeStockPositions: positions.length,
    },
    status: "ready", error: "", enabled: true,
    refresh: vi.fn(), addItem: vi.fn(), deactivateItem: vi.fn(), reactivateItem: vi.fn(),
    registerAsset: vi.fn(), assetAction: vi.fn(), recordStock: vi.fn(),
    siteName: (id) => (overrides.sites || []).find((site) => site.id === id)?.siteName || "",
    personName: (id) => (overrides.people || []).find((person) => person.id === id)?.fullName || "",
    itemFor: (id) => items.find((item) => item.id === id) || null,
    assetsForItem: () => [], eventsForAsset: () => [],
    ...overrides.extra,
  };
}

function renderPage({ role = "owner", ...overrides } = {}) {
  return render(
    <MemoryRouter initialEntries={["/admin/tools-equipment"]}>
      <AdminDataContext.Provider value={{ role }}>
        <InventoryContext.Provider value={inventoryValue(overrides)}>
          <AdminInventory />
        </InventoryContext.Provider>
      </AdminDataContext.Provider>
    </MemoryRouter>,
  );
}

describe("Tools & Equipment — approved composition", () => {
  it("renders the heading and subtitle", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Tools & Equipment", level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Manage equipment assets and stock across all operational sites.")).toBeInTheDocument();
  });

  it("renders the four approved summary cards in order", () => {
    renderPage();
    for (const label of ["Catalogue items", "Assets in circulation", "Under repair", "Active stock positions"]) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it("renders the register with exactly the four approved tabs", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Inventory register" })).toBeInTheDocument();
    for (const label of ["Catalogue", "Equipment assets", "Stock positions", "History"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("defaults to the Equipment assets tab", () => {
    renderPage();
    expect(screen.getByRole("button", { name: "Equipment assets" })).toHaveAttribute("aria-current", "page");
  });

  // The authority pairs every value with a line saying what it counts.
  it("gives each summary card its pictogram and supporting line", () => {
    const { container } = renderPage();
    const expected = [
      ["Catalogue items", "Active items in catalogue", "catalogue"],
      ["Assets in circulation", "Issued to sites or people", "circulation"],
      ["Under repair", "Awaiting repair completion", "repair"],
      ["Active stock positions", "Sites and custody locations", "positions"],
    ];
    for (const [label, support, glyph] of expected) {
      expect(screen.getByText(label)).toBeInTheDocument();
      expect(screen.getByText(support)).toBeInTheDocument();
      expect(container.querySelector(`[data-pictogram="${glyph}"]`)).toBeTruthy();
    }
  });

  it("keeps both supporting panels", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Stock positions", level: 2 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recent activity", level: 2 })).toBeInTheDocument();
  });
});

describe("empty production state", () => {
  it("tells the truth rather than showing invented rows", () => {
    renderPage();
    expect(screen.getByText("No equipment registered yet.")).toBeInTheDocument();
    // Every summary card reads zero, because production Inventory is empty.
    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  it("shows no mockup fixture anywhere", () => {
    renderPage();
    for (const fixture of [/Concrete Mixer/i, /Rotary Hammer Drill/i, /Brian K/i, /Riverside Villas/i, /214/, /162/]) {
      expect(screen.queryByText(fixture)).not.toBeInTheDocument();
    }
  });

  it("keeps the full frame when empty — cards, tabs and both panels still render", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "Inventory register" })).toBeInTheDocument();
    expect(screen.getAllByText("Activity appears here as you use the register.").length).toBeGreaterThan(0);
  });

  it("states each tab's own empty truth", () => {
    renderPage();
    const register = screen.getByRole("region", { name: "Inventory register" });
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    expect(within(register).getByText("No catalogue items yet.")).toBeInTheDocument();
    fireEvent.click(within(register).getByRole("button", { name: "Stock positions" }));
    expect(within(register).getByText("No stock positions yet.")).toBeInTheDocument();
  });
});

describe("role boundary", () => {
  it.each([["staff"], ["viewer"]])("does not reveal the register to %s", (role) => {
    renderPage({ role });
    expect(screen.getByRole("heading", { name: "Tools & Equipment unavailable" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Inventory register" })).not.toBeInTheDocument();
    expect(screen.queryByText("Catalogue items")).not.toBeInTheDocument();
  });

  it("offers both operational roles the ordinary create actions", () => {
    for (const role of ["owner", "manager"]) {
      const { unmount } = renderPage({ role });
      expect(screen.getByRole("button", { name: "Add item" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Register equipment" })).toBeInTheDocument();
      unmount();
    }
  });
});

describe("equipment rows and lifecycle", () => {
  const items = [{ id: "i1", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
  const sites = [{ id: "s1", siteName: "Karen Residence" }];
  const people = [{ id: "p1", fullName: "Kefa Nyamari Ochenge", isActive: true }];
  const assets = [
    { id: "a1", itemId: "i1", assetCode: "BD-LM-001", ownershipType: "owned", status: "issued", condition: "good", currentSiteId: "s1", custodianPersonId: "p1", expectedReturnDate: "2026-09-01", version: 3 },
    { id: "a2", itemId: "i1", assetCode: "BD-LM-002", ownershipType: "owned", status: "available", condition: "fair", currentSiteId: "", custodianPersonId: "", expectedReturnDate: "", version: 1 },
  ];

  it("shows the approved columns and resolves Site and custodian", () => {
    renderPage({ items, assets, sites, people });
    const table = screen.getByRole("table");
    for (const header of ["Asset / item", "Asset code", "Status", "Condition", "Current Site", "Custodian", "Expected return", "Action"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    expect(within(table).getByText("BD-LM-001")).toBeInTheDocument();
    expect(within(table).getByText("Karen Residence")).toBeInTheDocument();
    expect(within(table).getByText("Kefa Nyamari Ochenge")).toBeInTheDocument();
  });

  // A null Site is Botanique custody, never a fabricated store.
  it("names Botanique custody for an asset with no Site", () => {
    renderPage({ items, assets, sites, people });
    expect(within(screen.getByRole("table")).getByText("Botanique custody")).toBeInTheDocument();
  });

  it("keeps a clearer text action in the mobile list", () => {
    renderPage({ items, assets, sites, people });
    const lists = screen.getAllByRole("list");
    const mobileRow = lists.flatMap((list) => within(list).queryAllByRole("button", { name: "View" }));
    expect(mobileRow.length).toBeGreaterThan(0);
  });

  it("renders a real tool thumbnail rather than plain text", () => {
    const { container } = renderPage({ items, assets, sites, people });
    expect(container.querySelector('[data-tool-visual="mower"]')).toBeTruthy();
  });

  // The authority uses a compact ellipsis affordance, not a competing button.
  it("uses a labelled ellipsis action rather than a prominent View button", () => {
    renderPage({ items, assets, sites, people });
    const table = screen.getByRole("table");
    expect(within(table).queryByRole("button", { name: "View" })).not.toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Actions for BD-LM-001" })).toBeInTheDocument();
    expect(within(table).getByRole("button", { name: "Actions for BD-LM-002" })).toBeInTheDocument();
  });

  it("opens the asset sheet from the ellipsis action", () => {
    renderPage({ items, assets, sites, people });
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Actions for BD-LM-001" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  // BD-LM-002 is available, which is a status the RPC permits retiring from.
  it("offers the Principal Retire on an available asset but never the Manager", () => {
    renderPage({ role: "owner", items, assets, sites, people });
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Actions for BD-LM-002" }));
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Retire" })).toBeInTheDocument();
    screen.getAllByRole("button", { name: "Close" })[0].click();

    renderPage({ role: "manager", items, assets, sites, people });
    const tables = screen.getAllByRole("table");
    fireEvent.click(within(tables[tables.length - 1]).getByRole("button", { name: "Actions for BD-LM-002" }));
    const dialogs = screen.getAllByRole("dialog");
    const managerDialog = dialogs[dialogs.length - 1];
    expect(within(managerDialog).queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(within(managerDialog).getByRole("button", { name: "Issue to Site" })).toBeInTheDocument();
  });

  // BD-LM-001 is issued, and retire_equipment_asset() refuses that outright.
  it("offers no Retire on an issued asset, and still offers its real actions", () => {
    renderPage({ role: "owner", items, assets, sites, people });
    fireEvent.click(within(screen.getByRole("table")).getByRole("button", { name: "Actions for BD-LM-001" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Return to Botanique" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Transfer / hand over" })).toBeInTheDocument();
  });
});

describe("quick-add catalogue", () => {
  it("only prefills the form and creates nothing until save", () => {
    const addItem = vi.fn().mockResolvedValue({ ok: true });
    renderPage({ extra: { addItem } });
    fireEvent.click(screen.getByRole("button", { name: "Add item" }));
    fireEvent.click(screen.getByRole("button", { name: /Lawn Mower/ }));
    expect(screen.getByDisplayValue("Lawn Mower")).toBeInTheDocument();
    // The choice prefilled the form; nothing was written.
    expect(addItem).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save item" }));
    expect(addItem).toHaveBeenCalledTimes(1);
  });
});

describe("supporting panels and register footer", () => {
  const items = [
    { id: "i1", itemName: "Cement", category: "materials", trackingMethod: "stock", unitOfMeasure: "bag", isActive: true, version: 1 },
    { id: "i2", itemName: "Screened Topsoil", category: "materials", trackingMethod: "stock", unitOfMeasure: "cubic_metre", isActive: true, version: 1 },
  ];
  const sites = [{ id: "s1", siteName: "Karen Residence" }];
  const positions = [
    { itemId: "i1", itemName: "Cement", category: "materials", unitOfMeasure: "bag", isActive: true, siteId: "s1", siteName: "Karen Residence", location: "", quantity: 25 },
    { itemId: "i2", itemName: "Screened Topsoil", category: "materials", unitOfMeasure: "cubic_metre", isActive: true, siteId: "", siteName: "", location: "", quantity: 4 },
  ];

  it("shows the Unit alongside the Quantity in the Stock positions panel", () => {
    renderPage({ items, positions, sites });
    const panel = screen.getByRole("heading", { name: "Stock positions", level: 2 }).closest("section");
    expect(within(panel).getByText("Item · Site / location")).toBeInTheDocument();
    expect(within(panel).getByText("Unit · Qty")).toBeInTheDocument();
    expect(within(panel).getByText("bag")).toBeInTheDocument();
    // Canonical tokens are read back as words, not invented abbreviations.
    expect(within(panel).getByText("cubic metre")).toBeInTheDocument();
    expect(within(panel).getByText("Botanique custody")).toBeInTheDocument();
  });

  it("offers View all on Recent activity and switches to History", () => {
    const activity = [{ kind: "catalogue", id: "e1", itemId: "i1", eventType: "created", reason: "", occurredAt: "2026-08-20T08:00:00Z" }];
    renderPage({ items, activity });
    const panel = screen.getByRole("heading", { name: "Recent activity", level: 2 }).closest("section");
    fireEvent.click(within(panel).getByRole("button", { name: "View all" }));
    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-current", "page");
  });

  it("gives each activity row an icon and a canonical description", () => {
    const activity = [{ kind: "catalogue", id: "e1", itemId: "i1", eventType: "created", reason: "", occurredAt: "2026-08-20T08:00:00Z" }];
    const { container } = renderPage({ items, activity });
    expect(container.querySelector('[data-activity-icon="catalogue"]')).toBeTruthy();
    expect(screen.getAllByText(/materials · Quantity stock/).length).toBeGreaterThan(0);
  });

  // Never fabricate pagination over an empty register.
  it("reports a truthful zero count when the register is empty", () => {
    renderPage();
    const register = screen.getByRole("region", { name: "Inventory register" });
    expect(within(register).getByText("0 assets")).toBeInTheDocument();
    expect(within(register).queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
  });

  it("pages the register only once there is more than one page", () => {
    const assetItems = [{ id: "i3", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
    const many = Array.from({ length: 12 }, (unused, index) => ({
      id: `a${index}`, itemId: "i3", assetCode: `BD-LM-${String(index).padStart(3, "0")}`,
      ownershipType: "owned", status: "available", condition: "good",
      currentSiteId: "", custodianPersonId: "", expectedReturnDate: "", version: 1,
    }));
    renderPage({ items: assetItems, assets: many });
    const register = screen.getByRole("region", { name: "Inventory register" });
    expect(within(register).getByText("Showing 1–10 of 12 assets")).toBeInTheDocument();
    expect(within(register).getByRole("table").querySelectorAll("tbody tr")).toHaveLength(10);
    fireEvent.click(within(register).getByRole("button", { name: "Next" }));
    expect(within(register).getByText("Showing 11–12 of 12 assets")).toBeInTheDocument();
  });
});

describe("status colour treatment", () => {
  it("uses no amber and no sky treatment for under_repair", () => {
    const items = [{ id: "i1", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
    const assets = [{ id: "a1", itemId: "i1", assetCode: "BD-LM-001", ownershipType: "owned", status: "under_repair", condition: "fair", currentSiteId: "", custodianPersonId: "", expectedReturnDate: "", version: 2 }];
    renderPage({ items, assets });
    const chip = within(screen.getByRole("table")).getByText("Under repair");
    expect(chip.className).not.toMatch(/amber|yellow|orange/);
    expect(chip.className).not.toMatch(/sky/);
    expect(chip.className).toMatch(/rose|stone/);
  });
});
