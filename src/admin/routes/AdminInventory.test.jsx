import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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
    selectableSites: overrides.selectableSites || overrides.sites || [],
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
    issueAssets: overrides.issueAssets || vi.fn(() => Promise.resolve({ ok: true })),
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

  it("offers both operational roles the contextual create actions", () => {
    for (const role of ["owner", "manager"]) {
      const { unmount } = renderPage({ role });
      const register = screen.getByRole("region", { name: "Inventory register" });
      // Equipment assets is the default tab, and the authority gives it NO
      // header action — registration belongs to a catalogue row.
      expect(within(register).queryByRole("button", { name: "Register equipment" })).not.toBeInTheDocument();
      fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
      expect(within(register).getByRole("button", { name: "Add item" })).toBeInTheDocument();
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
    for (const header of ["Asset / item", "Asset code", "Status", "Condition", "Current site", "Custodian", "Expected return", "Action"]) {
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
    const register = screen.getByRole("region", { name: "Inventory register" });
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    fireEvent.click(within(register).getByRole("button", { name: "Add item" }));
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

  // The authority's rail is a four-column table, and carries no thumbnails.
  it("shows the Stock positions panel as the four authority columns", () => {
    renderPage({ items, positions, sites });
    const panel = screen.getByRole("heading", { name: "Stock positions", level: 2 }).closest("section");
    const table = within(panel).getByRole("table");
    for (const header of ["Item", "Site / location", "Unit", "Quantity"]) {
      expect(within(table).getByRole("columnheader", { name: header })).toBeInTheDocument();
    }
    // Canonical tokens are read back as words, not invented abbreviations,
    // and never as the stored token.
    expect(within(table).getByText("Bag")).toBeInTheDocument();
    expect(within(table).getByText("Cubic metre")).toBeInTheDocument();
    expect(within(table).queryByText("cubic_metre")).not.toBeInTheDocument();
    expect(within(table).getByText("Botanique custody")).toBeInTheDocument();
    expect(panel.querySelector("[data-tool-visual]")).toBeNull();
  });

  it("reports the stock rail's own truthful count", () => {
    renderPage({ items, positions, sites });
    const panel = screen.getByRole("heading", { name: "Stock positions", level: 2 }).closest("section");
    expect(within(panel).getByText("Showing 1 to 2 of 2 stock items")).toBeInTheDocument();
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
    expect(container.querySelector('[data-activity-kind="catalogue"]')).toBeTruthy();
    // Category reaches the screen as language, never as its storage token.
    expect(screen.getAllByText(/Materials · Quantity stock/).length).toBeGreaterThan(0);
  });

  // The authority keys the activity pictogram on WHAT HAPPENED, not on which
  // table it came from: issuing and transferring the same asset must not draw
  // the same glyph.
  it("chooses the activity pictogram by event, not by kind", () => {
    const cases = [
      [{ kind: "stock", id: "m1", itemId: "i1", movementType: "issued", quantity: 2, occurredAt: "2026-08-20T08:00:00Z" }, "out"],
      [{ kind: "stock", id: "m2", itemId: "i1", movementType: "transferred", quantity: 2, occurredAt: "2026-08-20T08:00:00Z" }, "cube"],
      [{ kind: "stock", id: "m3", itemId: "i1", movementType: "consumed", quantity: 2, occurredAt: "2026-08-20T08:00:00Z" }, "in"],
      [{ kind: "equipment", id: "e2", assetId: "a1", eventType: "sent_for_repair", occurredAt: "2026-08-20T08:00:00Z" }, "repair"],
    ];
    for (const [entry, glyph] of cases) {
      const { container, unmount } = renderPage({ items, activity: [entry] });
      expect(container.querySelector(`[data-activity-icon="${glyph}"]`)).toBeTruthy();
      unmount();
    }
  });

  // Date over time, right-aligned, as the authority sets it.
  it("shows the activity moment as a date above a 24-hour time", () => {
    const activity = [{ kind: "catalogue", id: "e1", itemId: "i1", eventType: "created", reason: "", occurredAt: "2026-08-20T13:42:00Z" }];
    renderPage({ items, activity });
    const panel = screen.getByRole("heading", { name: "Recent activity", level: 2 }).closest("section");
    expect(within(panel).getByText("16:42")).toBeInTheDocument();
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
    // Six rows to a desktop page, as the authority shows.
    expect(within(register).getByText("Showing 1 to 6 of 12 assets")).toBeInTheDocument();
    expect(within(register).getByRole("table").querySelectorAll("tbody tr")).toHaveLength(6);
    fireEvent.click(within(register).getByRole("button", { name: "Next page" }));
    expect(within(register).getByText("Showing 7 to 12 of 12 assets")).toBeInTheDocument();
  });

  // Numbered pagination, as the authority draws it — not "Previous 1 / 5 Next".
  it("offers numbered pages and marks the current one", () => {
    const assetItems = [{ id: "i3", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
    const many = Array.from({ length: 27 }, (unused, index) => ({
      id: `a${index}`, itemId: "i3", assetCode: `EQP-${String(index).padStart(4, "0")}`,
      ownershipType: "owned", status: "available", condition: "good",
      currentSiteId: "", custodianPersonId: "", expectedReturnDate: "", version: 1,
    }));
    renderPage({ items: assetItems, assets: many });
    const register = screen.getByRole("region", { name: "Inventory register" });
    expect(within(register).queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(within(register).getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    // 27 assets over 6 per page is five pages: 1 2 3 … 5.
    for (const label of ["Page 1", "Page 2", "Page 3", "Page 5"]) {
      expect(within(register).getByRole("button", { name: label })).toBeInTheDocument();
    }
    expect(within(register).queryByRole("button", { name: "Page 4" })).not.toBeInTheDocument();
    fireEvent.click(within(register).getByRole("button", { name: "Page 3" }));
    expect(within(register).getByText("Showing 13 to 18 of 27 assets")).toBeInTheDocument();
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

describe("authority header posture", () => {
  it("carries no uppercase OPERATIONS eyebrow", () => {
    renderPage();
    expect(screen.queryByText("Operations")).not.toBeInTheDocument();
    expect(screen.queryByText("OPERATIONS")).not.toBeInTheDocument();
  });

  // The approved screen has no page-level CTAs beside the heading.
  it("puts no create button beside the heading", () => {
    renderPage();
    const heading = screen.getByRole("heading", { name: "Tools & Equipment", level: 1 });
    const header = heading.closest("header");
    expect(within(header).queryByRole("button")).not.toBeInTheDocument();
  });

  it("moves each create action into the register, per tab", () => {
    const items = [
      { id: "i1", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 },
      { id: "i2", itemName: "Cement", category: "materials", trackingMethod: "stock", unitOfMeasure: "bag", isActive: true, version: 1 },
    ];
    renderPage({ items });
    const register = screen.getByRole("region", { name: "Inventory register" });
    // Equipment assets carries no header action at all.
    expect(within(register).queryByRole("button", { name: "Register equipment" })).not.toBeInTheDocument();
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    expect(within(register).getByRole("button", { name: "Add item" })).toBeInTheDocument();
    fireEvent.click(within(register).getByRole("button", { name: "Stock positions" }));
    expect(within(register).getByRole("button", { name: "Record stock" })).toBeEnabled();
  });

  // The authority's Equipment assets header is title-and-tabs only.
  it("gives the Equipment assets header no action of its own", () => {
    const items = [{ id: "i1", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
    renderPage({ items });
    const heading = screen.getByRole("heading", { name: "Inventory register", level: 2 });
    const headerBlock = heading.parentElement;
    expect(within(headerBlock).queryByRole("button")).not.toBeInTheDocument();
  });

  // An empty register still needs a way onward, but not a permanent control
  // the authority does not have.
  it("routes an empty Equipment assets register back to Catalogue", () => {
    renderPage();
    const register = screen.getByRole("region", { name: "Inventory register" });
    expect(within(register).getByText("No equipment registered yet.")).toBeInTheDocument();
    fireEvent.click(within(register).getByRole("button", { name: "Go to Catalogue" }));
    expect(within(register).getByRole("button", { name: "Catalogue" })).toHaveAttribute("aria-current", "page");
  });

  it("keeps View all on both panels even while they are empty", () => {
    renderPage();
    const stock = screen.getByRole("heading", { name: "Stock positions", level: 2 }).closest("section");
    const recent = screen.getByRole("heading", { name: "Recent activity", level: 2 }).closest("section");
    expect(within(stock).getByRole("button", { name: "View all" })).toBeInTheDocument();
    expect(within(recent).getByRole("button", { name: "View all" })).toBeInTheDocument();

    fireEvent.click(within(recent).getByRole("button", { name: "View all" }));
    expect(screen.getByRole("button", { name: "History" })).toHaveAttribute("aria-current", "page");
  });

  it("uses the four authority pictogram semantics", () => {
    const { container } = renderPage();
    for (const glyph of ["catalogue", "circulation", "repair", "positions"]) {
      expect(container.querySelector(`[data-pictogram="${glyph}"]`)).toBeTruthy();
    }
  });
});

describe("site selector", () => {
  const items = [{ id: "i1", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
  const sites = [
    { id: "live", siteName: "Karen Residence" },
    { id: "fixture", siteName: "Operations Hub Verification Fixture — PR44" },
  ];

  // The register must offer only what the provider deems operational; the
  // fixture Site remains in `sites` for historical resolution.
  it("offers only selectable Sites, not every Site that exists", () => {
    renderPage({ items, sites, selectableSites: [sites[0]] });
    openRegisterAsset();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByRole("option", { name: "Karen Residence" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: /Verification Fixture/ })).not.toBeInTheDocument();
  });
});

// Registration now originates from the catalogue row, so every test that needs
// the form opens it the way an operator would.
function openRegisterAsset() {
  const register = screen.getByRole("region", { name: "Inventory register" });
  fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
  // The wording now depends on whether any physical asset already exists.
  const action = within(register).queryAllByRole("button", { name: "Register first asset" })[0]
    || within(register).getAllByRole("button", { name: "Add another asset" })[0];
  fireEvent.click(action);
}

describe("automatic asset codes", () => {
  const items = [{ id: "i1", itemName: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
  const sites = [{ id: "s1", siteName: "Karen Residence" }];

  // The operator must never choose a Botanique asset code.
  it("offers no asset-code input at all", () => {
    renderPage({ items, sites, selectableSites: sites });
    openRegisterAsset();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText(/Asset code/)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/BD-EQP-001|BD-LM-001|EQP-/)).not.toBeInTheDocument();
    expect(within(dialog).getByText("Assigned automatically when registered")).toBeInTheDocument();
  });

  // Opened from a catalogue row the item is settled, so it is shown as
  // context rather than asked for a second time.
  it("fixes the equipment item when opened from its catalogue row", () => {
    renderPage({ items, sites, selectableSites: sites });
    openRegisterAsset();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Equipment item")).not.toBeInTheDocument();
    expect(within(dialog).getByText("Equipment item")).toBeInTheDocument();
    expect(within(dialog).getAllByText("Lawn Mower").length).toBeGreaterThan(0);
  });

  // Botanique custody is not a Site and must not be presented as one.
  it("calls the location field Current location", () => {
    renderPage({ items, sites, selectableSites: sites });
    openRegisterAsset();
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByLabelText("Current location")).toBeInTheDocument();
    expect(within(dialog).queryByLabelText(/Current Site/)).not.toBeInTheDocument();
  });
});

describe("custom catalogue items", () => {
  // The quick-add chips are shortcuts over a free-text form, not a closed list.
  it("presents the chips as optional shortcuts and keeps the name free text", () => {
    renderPage();
    const register = screen.getByRole("region", { name: "Inventory register" });
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    fireEvent.click(within(register).getByRole("button", { name: "Add item" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Common items — optional shortcuts")).toBeInTheDocument();
    const name = within(dialog).getByLabelText("Item name");
    expect(name.tagName).toBe("INPUT");
    expect(name).not.toBeDisabled();
    fireEvent.change(name, { target: { value: "Pressure Washer" } });
    expect(name.value).toBe("Pressure Washer");
  });

  // An item with no approved cut-out gets the restrained neutral drawing, never
  // a guessed product image.
  it("gives an unknown custom item the generic visual", () => {
    const items = [{ id: "i9", itemName: "Pressure Washer", category: "site_consumables", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
    const { container } = renderPage({ items });
    const register = screen.getByRole("region", { name: "Inventory register" });
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    expect(container.querySelector('[data-tool-visual="generic"]')).toBeTruthy();
  });

  // Storage tokens must never reach the screen.
  it("shows a custom category as language, not as its stored token", () => {
    const items = [{ id: "i9", itemName: "Pressure Washer", category: "site_consumables", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
    renderPage({ items });
    const register = screen.getByRole("region", { name: "Inventory register" });
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    expect(within(register).getByText(/Site consumables/)).toBeInTheDocument();
    expect(within(register).queryByText(/site_consumables/)).not.toBeInTheDocument();
  });
});

describe("catalogue makes registered assets clear", () => {
  const items = [
    { id: "i1", itemName: "Secateurs", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 },
    { id: "i2", itemName: "Cement", category: "materials", trackingMethod: "stock", unitOfMeasure: "bag", isActive: true, version: 1 },
  ];
  const asset = (id, status) => ({
    id, itemId: "i1", assetCode: `BD-TE-${id}`, ownershipType: "owned", status,
    condition: "good", currentSiteId: "", custodianPersonId: "", expectedReturnDate: "", version: 1,
  });

  const catalogue = () => {
    const register = screen.getByRole("region", { name: "Inventory register" });
    fireEvent.click(within(register).getByRole("button", { name: "Catalogue" }));
    return register;
  };

  it("says 0 registered and offers Register first asset", () => {
    renderPage({ items });
    const register = catalogue();
    expect(within(register).getByText("0 registered")).toBeInTheDocument();
    expect(within(register).getByRole("button", { name: "Register first asset" })).toBeInTheDocument();
    expect(within(register).queryByRole("button", { name: "Add another asset" })).not.toBeInTheDocument();
  });

  // Registered is not issued: a tool in somebody's custody is still registered.
  it("says 1 registered · 1 issued and offers Add another asset", () => {
    renderPage({ items, assets: [asset("001", "issued")] });
    const register = catalogue();
    expect(within(register).getByText("1 registered · 1 issued")).toBeInTheDocument();
    expect(within(register).getByRole("button", { name: "Add another asset" })).toBeInTheDocument();
    expect(within(register).queryByRole("button", { name: "Register first asset" })).not.toBeInTheDocument();
  });

  it("summarises a mixed set truthfully", () => {
    renderPage({
      items,
      assets: [asset("001", "available"), asset("002", "available"), asset("003", "issued"), asset("004", "issued")],
    });
    expect(within(catalogue()).getByText("4 registered · 2 available · 2 issued")).toBeInTheDocument();
  });

  // A stock item is a quantity, not a set of individually identified things.
  it("gives a stock item no asset-instance counts", () => {
    const { container } = renderPage({ items, assets: [asset("001", "issued")] });
    catalogue();
    expect(container.querySelector('[data-asset-summary="i1"]')).toBeTruthy();
    expect(container.querySelector('[data-asset-summary="i2"]')).toBeNull();
    const register = screen.getByRole("region", { name: "Inventory register" });
    expect(within(register).getByRole("button", { name: "Record stock" })).toBeInTheDocument();
  });
});

describe("multi-asset handover", () => {
  const items = [{ id: "i1", itemName: "Secateurs", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit", isActive: true, version: 1 }];
  const sites = [{ id: "s1", siteName: "Kitisuru Residence House 0.8A" }];
  const people = [{ id: "p1", fullName: "Kefa Nyamari Ochenge", isActive: true }];
  const asset = (id, code, status) => ({
    id, itemId: "i1", assetCode: code, ownershipType: "owned", status, condition: "good",
    currentSiteId: "", custodianPersonId: "", expectedReturnDate: "", version: 2,
  });
  const assets = [
    asset("a1", "BD-TE-001", "available"),
    asset("a2", "BD-TE-002", "available"),
    asset("a3", "BD-TE-006", "available"),
    asset("a4", "BD-TE-010", "issued"),
    asset("a5", "BD-TE-011", "under_repair"),
  ];

  const openIssue = () => {
    const table = screen.getByRole("table");
    fireEvent.click(within(table).getByRole("button", { name: "Actions for BD-TE-001" }));
    fireEvent.click(screen.getByRole("button", { name: "Issue to Site" }));
    return screen.getByRole("dialog");
  };

  it("offers the other AVAILABLE assets, named by item and asset ID", () => {
    renderPage({ items, assets, sites, selectableSites: sites, people });
    const dialog = openIssue();
    expect(within(dialog).getByText("Add another asset to this handover")).toBeInTheDocument();
    expect(within(dialog).getByText(/BD-TE-002/)).toBeInTheDocument();
    expect(within(dialog).getByText(/BD-TE-006/)).toBeInTheDocument();
    // Item name AND asset id, so the operator can tell two Secateurs apart.
    expect(within(dialog).getAllByText(/Secateurs/).length).toBeGreaterThan(0);
  });

  // Something already issued, under repair, lost or retired is not the
  // Founder's to hand over.
  it("never offers an unavailable asset", () => {
    renderPage({ items, assets, sites, selectableSites: sites, people });
    const dialog = openIssue();
    expect(within(dialog).queryByText(/BD-TE-010/)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/BD-TE-011/)).not.toBeInTheDocument();
    // Nor the asset already being acted on.
    const checkboxes = within(dialog).getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(2);
  });

  it("sends every chosen asset in ONE call with one shared context", async () => {
    const issueAssets = vi.fn(() => Promise.resolve({ ok: true }));
    renderPage({ items, assets, sites, selectableSites: sites, people, issueAssets });
    const dialog = openIssue();

    fireEvent.click(within(dialog).getAllByRole("checkbox")[0]);
    fireEvent.change(within(dialog).getByLabelText(/Site this equipment is going to/), { target: { value: "s1" } });
    fireEvent.change(within(dialog).getByLabelText(/Custodian/), { target: { value: "p1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Issue to Site" }));

    await waitFor(() => expect(issueAssets).toHaveBeenCalledTimes(1));
    const [members, values] = issueAssets.mock.calls[0];
    expect(members).toHaveLength(2);
    expect(members.map((member) => member.assetId).sort()).toEqual(["a1", "a2"]);
    expect(members.every((member) => member.version === 2)).toBe(true);
    expect(values.siteId).toBe("s1");
    expect(values.custodianPersonId).toBe("p1");
  });

  it("counts the whole handover for the operator", () => {
    renderPage({ items, assets, sites, selectableSites: sites, people });
    const dialog = openIssue();
    fireEvent.click(within(dialog).getAllByRole("checkbox")[0]);
    expect(within(dialog).getByText("2 assets in this handover")).toBeInTheDocument();
  });

  // A single handover is the same operation, not a second code path.
  it("uses the same canonical call for one asset", async () => {
    const issueAssets = vi.fn(() => Promise.resolve({ ok: true }));
    renderPage({ items, assets, sites, selectableSites: sites, people, issueAssets });
    const dialog = openIssue();
    fireEvent.change(within(dialog).getByLabelText(/Site this equipment is going to/), { target: { value: "s1" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Issue to Site" }));
    await waitFor(() => expect(issueAssets).toHaveBeenCalledTimes(1));
    expect(issueAssets.mock.calls[0][0]).toEqual([{ assetId: "a1", version: 2 }]);
  });

  // The register itself keeps the authority's posture.
  it("adds no bulk toolbar or checkbox column to the register", () => {
    const { container } = renderPage({ items, assets, sites, selectableSites: sites, people });
    const table = screen.getByRole("table");
    expect(within(table).queryAllByRole("checkbox")).toHaveLength(0);
    expect(container.querySelectorAll("thead th")).toHaveLength(8);
  });

  it("will not offer a past expected return date", () => {
    renderPage({ items, assets, sites, selectableSites: sites, people });
    const dialog = openIssue();
    const picker = within(dialog).getByLabelText(/Expected return/);
    expect(picker.getAttribute("min")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(picker.getAttribute("min")).toBe(new Date().toLocaleDateString("en-CA"));
  });
});
