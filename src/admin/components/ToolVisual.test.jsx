import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolVisual, { AUTHORITY_IMAGES } from "./ToolVisual";
import { TOOL_LIBRARY, TOOL_LIBRARY_KEYS, USABLE_TOOL_LIBRARY_KEYS, toolKeyForName } from "../utils/toolLibrary";

const libraryKeyOf = (container) =>
  container.firstChild.getAttribute("data-tool-library-key");
const sourceOf = (container) =>
  container.firstChild.getAttribute("data-visual-source");

describe("the controlled professional tool library", () => {
  // Authority 17 names these four explicitly. Each must show ITS OWN approved
  // visual — the whole point of replacing the hand-drawn set.
  it.each([
    ["Panga", "panga"],
    ["Jembe", "jembe"],
    ["Rake", "rake"],
    ["Secateurs", "secateurs"],
  ])("gives %s the approved %s visual", (name, key) => {
    const { container } = render(<ToolVisual name={name} />);
    expect(sourceOf(container)).toBe("tool-library");
    expect(libraryKeyOf(container)).toBe(key);
  });

  // A panga is not a machete-shaped guess and a jembe is not a hoe-ish
  // approximation: they resolve to distinct approved cells.
  it("never resolves two different tools to the same visual", () => {
    const keys = ["Panga", "Jembe", "Rake", "Secateurs", "Spade", "Axe", "Chainsaw"]
      .map((name) => toolKeyForName(name));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("resolves every USABLE tool the library declares", () => {
    for (const key of USABLE_TOOL_LIBRARY_KEYS) {
      const { container, unmount } = render(<ToolVisual visual={key} name={TOOL_LIBRARY.tools[key].label} />);
      expect(`${key}: ${sourceOf(container)}`).toBe(`${key}: tool-library`);
      unmount();
    }
  });

  // The visual is a crop of the ONE committed sheet, positioned by the
  // committed coordinates. Nothing is drawn in code.
  it("positions the crop from the committed sprite coordinates", () => {
    const { container } = render(<ToolVisual name="Panga" size="sm" />);
    const crop = container.querySelector("span[style]");
    const cell = TOOL_LIBRARY.tools.panga;
    expect(crop.style.backgroundImage).toContain(TOOL_LIBRARY.sprite);
    // Normalised: the browser renders "-0px" as "0px".
    const expected = `${cell.col ? `-${cell.col * 40}` : 0}px ${cell.row ? `-${cell.row * 40}` : 0}px`;
    expect(crop.style.backgroundPosition).toBe(expected);
  });

  it("serves the sprite locally, never from a remote host", () => {
    expect(TOOL_LIBRARY.sprite.startsWith("/admin/inventory-tools/")).toBe(true);
    expect(TOOL_LIBRARY.sprite).not.toMatch(/^https?:/);
  });

  // Every matcher must point at a cell that genuinely exists, or an item would
  // silently render an empty crop.
  it("maps only to keys the committed library declares", () => {
    const names = [
      "Jembe", "Panga", "Rake", "Spade", "Garden fork", "Secateurs", "Pruning saw",
      "Axe", "Mattock", "Pickaxe", "Wheelbarrow", "Lawn mower", "Brush cutter",
      "Chainsaw", "Generator", "Rotary hammer drill", "Drill", "Angle grinder",
      "Hose reel", "Water pump", "Pressure washer", "Ladder", "Hand fork",
      "Hand trowel", "Hedge trimmer", "Leaf blower", "Gloves", "Irrigation fittings",
    ];
    for (const name of names) {
      const key = toolKeyForName(name);
      expect(`${name} -> ${key}`).toBe(`${name} -> ${key}`);
      expect(TOOL_LIBRARY_KEYS).toContain(key);
    }
  });
});

describe("an item with no approved visual", () => {
  // Authority 17: "A generic wrench must never masquerade as a panga."
  it("shows a neutral visual-not-assigned mark, not another tool", () => {
    const { container } = render(<ToolVisual name="Site Office Kettle" />);
    expect(sourceOf(container)).toBe("unassigned");
    expect(container.firstChild.getAttribute("data-tool-visual")).toBe("unassigned");
    expect(screen.getByRole("img", { name: /visual not assigned/i })).toBeInTheDocument();
  });

  it("does not borrow a library key it has no right to", () => {
    expect(toolKeyForName("Site Office Kettle")).toBeNull();
    expect(toolKeyForName("Concrete Mixer 400L")).toBeNull();
    expect(toolKeyForName("")).toBeNull();
  });

  // The old behaviour was to draw a generic wrench, which read as a real tool.
  it("renders no tool artwork at all for an unknown item", () => {
    const { container } = render(<ToolVisual name="Pressure Vessel" />);
    expect(container.querySelector('[data-visual-source="tool-library"]')).toBeNull();
    expect(container.querySelector('[data-tool-visual="generic"]')).toBeNull();
  });
});

describe("sizing", () => {
  it.each([["xs", "h-6"], ["sm", "h-10"], ["md", "h-12"], ["lg", "h-16"]])(
    "applies the %s size as a class",
    (size, expected) => {
      const { container } = render(<ToolVisual name="Rake" size={size} />);
      expect(container.firstChild.className).toContain(expected);
    },
  );

  it("lets a caller override the size class", () => {
    const { container } = render(<ToolVisual name="Rake" size="sm" className="!h-5 !w-5" />);
    expect(container.firstChild.className).toContain("!h-5");
  });

  it("offers a contained figure where the visual is the subject", () => {
    const { container } = render(<ToolVisual name="Rake" size="lg" framed />);
    expect(container.firstChild.className).toMatch(/border/);
    expect(container.firstChild.getAttribute("data-visual-framed")).toBe("true");
  });

  it("puts no frame around a register thumbnail", () => {
    const { container } = render(<ToolVisual name="Rake" size="sm" />);
    expect(container.firstChild.getAttribute("data-visual-framed")).toBe("false");
  });
});

describe("the earlier approved product cut-outs", () => {
  // Retained infrastructure. The library now covers all six, so this path is
  // not normally reached — but the files are still approved imagery and the
  // fallback is still wired, so it is proved rather than assumed.
  it("still references six complete, decodable JPEGs", () => {
    expect(Object.keys(AUTHORITY_IMAGES)).toHaveLength(6);
    for (const [type, source] of Object.entries(AUTHORITY_IMAGES)) {
      const bytes = readFileSync(`public${source}`);
      expect(bytes[0] << 8 | bytes[1]).toBe(0xffd8);
      const tail = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
      expect(`${type} ends with ${tail.toString(16)}`).toBe(`${type} ends with ffd9`);
    }
  });
});

// ---------------------------------------------------------------------------
// THE COMMITTED SPRITE MUST BE A REAL, DECODABLE SHEET.
//
// It was briefly a 29-byte stub — signature plus a partial IHDR, no image data
// at all — and every tool silently degraded to "visual not assigned". The
// wiring was correct and the screen was still wrong, which is exactly the class
// of failure a byte-level guard catches and a rendering test does not.
//
// This asserts the sheet is genuinely there and genuinely matches the JSON map,
// so a truncated or mis-sized replacement fails here rather than on the
// Founder's screen.
// ---------------------------------------------------------------------------
describe("committed sprite integrity", () => {
  const sprite = () => readFileSync(`public${TOOL_LIBRARY.sprite}`);

  it("is a structurally complete PNG", () => {
    const bytes = sprite();
    // Signature.
    expect([...bytes.subarray(0, 8)]).toEqual([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    // First chunk is IHDR.
    expect(bytes.subarray(12, 16).toString("latin1")).toBe("IHDR");
    // It carries actual image data, and it ends properly. Scanned as text
    // rather than via a Buffer global, which the lint env does not declare.
    expect(bytes.toString("latin1")).toContain("IDAT");
    expect(bytes.subarray(bytes.length - 8, bytes.length - 4).toString("latin1")).toBe("IEND");
  });

  // The 29-byte stub had a valid signature and a valid IHDR. Only the absence
  // of real bytes distinguished it.
  it("is materially larger than the truncated placeholder ever was", () => {
    expect(sprite().length).toBeGreaterThan(10_000);
  });

  it("is exactly the 768 x 640 sheet the JSON map describes", () => {
    const bytes = sprite();
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    expect(width).toBe(768);
    expect(height).toBe(640);
    const rows = Math.ceil(TOOL_LIBRARY_KEYS.length / TOOL_LIBRARY.columns);
    expect(width).toBe(TOOL_LIBRARY.columns * TOOL_LIBRARY.cellSize);
    expect(height).toBe(rows * TOOL_LIBRARY.cellSize);
  });

  // 30 tools in a 6-wide sheet is 5 rows, and every declared cell must fall
  // inside it — a coordinate off the edge would crop empty space.
  it("holds all thirty cells inside the 6 x 5 grid", () => {
    expect(TOOL_LIBRARY_KEYS).toHaveLength(30);
    expect(TOOL_LIBRARY.columns).toBe(6);
    for (const key of TOOL_LIBRARY_KEYS) {
      const cell = TOOL_LIBRARY.tools[key];
      expect(`${key} col ${cell.col}`).toBe(`${key} col ${cell.col}`);
      expect(cell.col).toBeGreaterThanOrEqual(0);
      expect(cell.col).toBeLessThan(6);
      expect(cell.row).toBeGreaterThanOrEqual(0);
      expect(cell.row).toBeLessThan(5);
    }
    // And no two tools share a cell.
    const cells = TOOL_LIBRARY_KEYS.map((key) => `${TOOL_LIBRARY.tools[key].col},${TOOL_LIBRARY.tools[key].row}`);
    expect(new Set(cells).size).toBe(30);
  });
});


// ---------------------------------------------------------------------------
// A CELL WHOSE ARTWORK DOES NOT MATCH ITS LABEL.
//
// The committed sheet has no safety helmet: cell (3,4), which the JSON names
// `safety_helmet`, holds a second pair of gloves. Neither design file may be
// changed here, so the key is suppressed in code and the item falls back to the
// honest neutral mark rather than showing gloves under a helmet's name.
//
// When the cell is corrected, delete the suppression and this block.
// ---------------------------------------------------------------------------
describe("the mismatched safety_helmet cell", () => {
  it("is still declared by the JSON but excluded from use", () => {
    expect(TOOL_LIBRARY_KEYS).toContain("safety_helmet");
    expect(USABLE_TOOL_LIBRARY_KEYS).not.toContain("safety_helmet");
  });

  it("shows the neutral mark rather than the gloves that sit in that cell", () => {
    const { container } = render(<ToolVisual name="Safety helmet" />);
    expect(container.firstChild.getAttribute("data-visual-source")).toBe("unassigned");
    expect(toolKeyForName("Safety helmet")).toBeNull();
    expect(toolKeyForName("hard hat")).toBeNull();
  });

  it("keeps the real gloves cell working", () => {
    const { container } = render(<ToolVisual name="Gloves" />);
    expect(container.firstChild.getAttribute("data-tool-library-key")).toBe("gloves");
  });
});
