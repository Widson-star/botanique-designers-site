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

  it("renders a real tool thumbnail rather than plain text", () => {
    const { container } = renderPage({ items, assets, sites, people });
    expect(container.querySelector('[data-tool-visual="mower"]')).toBeTruthy();
  });

  it("offers the Principal Retire but never offers it to the Operations Manager", () => {
    renderPage({ role: "owner", items, assets, sites, people });
    fireEvent.click(within(screen.getByRole("table")).getAllByRole("button", { name: "View" })[0]);
    const ownerDialog = screen.getByRole("dialog");
    expect(within(ownerDialog).getByRole("button", { name: "Retire" })).toBeInTheDocument();
    screen.getAllByRole("button", { name: "Close" })[0].click();

    renderPage({ role: "manager", items, assets, sites, people });
    const tables = screen.getAllByRole("table");
    fireEvent.click(within(tables[tables.length - 1]).getAllByRole("button", { name: "View" })[0]);
    const dialogs = screen.getAllByRole("dialog");
    const managerDialog = dialogs[dialogs.length - 1];
    expect(within(managerDialog).queryByRole("button", { name: "Retire" })).not.toBeInTheDocument();
    expect(within(managerDialog).getByRole("button", { name: "Return to Botanique" })).toBeInTheDocument();
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
