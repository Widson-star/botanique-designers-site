import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolVisual, { AUTHORITY_IMAGES } from "./ToolVisual";
import { TOOL_LIBRARY, TOOL_LIBRARY_KEYS, toolKeyForName } from "../utils/toolLibrary";

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

  it("resolves every tool the library declares", () => {
    for (const key of TOOL_LIBRARY_KEYS) {
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
      "Hand trowel", "Hedge trimmer", "Leaf blower", "Safety helmet", "Gloves",
      "Irrigation fittings",
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
// THE COMMITTED SPRITE IS CURRENTLY UNUSABLE.
//
// professional-tool-library.png is 29 bytes: the PNG signature plus a partial
// IHDR declaring 768x640 RGBA, and then nothing — no IHDR CRC, no IDAT, no
// IEND. The JSON map is complete and correct and every wiring above is
// therefore correct too, but there are no pixels to crop.
//
// Authority 17 forbids Claude regenerating or substituting the imagery, so this
// pins the current state instead of hiding it. When ChatGPT commits the real
// sheet this test FAILS, which is the point: it is the reminder to delete it.
// ---------------------------------------------------------------------------
describe("committed sprite integrity", () => {
  it("is still truncated, which is why no tool visual can render yet", () => {
    const bytes = readFileSync(`public${TOOL_LIBRARY.sprite}`);
    expect(bytes[0] << 8 | bytes[1]).toBe(0x8950);          // PNG signature
    expect(bytes.length).toBeLessThan(64);                   // no image data
    const tail = bytes.subarray(bytes.length - 8).toString("latin1");
    expect(tail).not.toContain("IEND");
  });

  it("declares the dimensions the JSON map expects", () => {
    const bytes = readFileSync(`public${TOOL_LIBRARY.sprite}`);
    const width = bytes.readUInt32BE(16);
    const height = bytes.readUInt32BE(20);
    const rows = Math.ceil(TOOL_LIBRARY_KEYS.length / TOOL_LIBRARY.columns);
    expect(width).toBe(TOOL_LIBRARY.columns * TOOL_LIBRARY.cellSize);
    expect(height).toBe(rows * TOOL_LIBRARY.cellSize);
  });
});
