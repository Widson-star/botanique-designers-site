import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolVisual, { AUTHORITY_IMAGES } from "./ToolVisual";

describe("authority equipment cut-outs", () => {
  it.each([
    ["Generator", "/admin/inventory-tools/authority-generator.jpg"],
    ["Rotary Hammer Drill", "/admin/inventory-tools/authority-drill.jpg"],
    ["Wheelbarrow", "/admin/inventory-tools/authority-wheelbarrow.jpg"],
    ["Brush Cutter", "/admin/inventory-tools/authority-brush-cutter.jpg"],
    ["Hose Reel", "/admin/inventory-tools/authority-hose-reel.jpg"],
    ["Lawn Mower", "/admin/inventory-tools/authority-lawn-mower.jpg"],
  ])("renders %s from its committed authority cut-out", (name, source) => {
    render(<ToolVisual name={name} />);
    const image = screen.getByRole("img", { name: `${name} thumbnail` });
    expect(image.tagName).toBe("IMG");
    expect(image.getAttribute("src")).toBe(source);
    // Contained, never cropped or stretched.
    expect(image.className).toMatch(/object-contain/);
  });

  it("serves every authority image locally, never from a remote host", () => {
    for (const source of Object.values(AUTHORITY_IMAGES)) {
      expect(source.startsWith("/admin/inventory-tools/")).toBe(true);
      expect(source).not.toMatch(/^https?:/);
    }
  });

  it("marks an authority-backed thumbnail as such", () => {
    const { container } = render(<ToolVisual name="Rotary Hammer Drill" />);
    expect(container.querySelector('[data-visual-source="authority-image"]')).toBeTruthy();
  });

  // Generator specifically: it spent a tranche falling back to its drawing
  // because the committed binary was truncated. It is an authority image again.
  it("renders Generator from the authority image, with no fallback", () => {
    const { container } = render(<ToolVisual name="Generator" />);
    const wrapper = container.querySelector('[data-tool-visual="generator"]');
    expect(wrapper.getAttribute("data-visual-source")).toBe("authority-image");
    expect(wrapper.querySelector("img").getAttribute("src")).toBe("/admin/inventory-tools/authority-generator.jpg");
    expect(wrapper.querySelector("svg")).toBeNull();
  });

  it("falls back for none of the six", () => {
    for (const name of ["Generator", "Rotary Hammer Drill", "Wheelbarrow", "Brush Cutter", "Hose Reel", "Lawn Mower"]) {
      const { container, unmount } = render(<ToolVisual name={name} />);
      expect(`${name}: ${container.firstChild.getAttribute("data-visual-source")}`).toBe(`${name}: authority-image`);
      unmount();
    }
  });

  it("covers all six authority items and nothing else", () => {
    expect(Object.keys(AUTHORITY_IMAGES).sort()).toEqual([
      "brush_cutter", "drill", "generator", "hose", "mower", "wheelbarrow",
    ]);
  });

  // The guard that caught the Generator defect at test time rather than on the
  // Founder's screen, and the reason it has to inspect structure and not just
  // the end markers: a browser renders a truncated JPEG's partial scan as flat
  // grey WITHOUT firing onError, so the component's own fallback cannot save a
  // malformed file — it must never be referenced in the first place.
  //
  // The specific corruption seen was a scan with no frame header: SOS arrived
  // before any SOF, so there were no dimensions to decode against. Checking
  // SOI/EOI alone would not have caught that, so this walks the marker
  // segments and insists on a real frame.
  it.each(Object.entries(AUTHORITY_IMAGES))(
    "references %s as a structurally complete, decodable JPEG",
    (type, source) => {
      const bytes = readFileSync(`public${source}`);
      expect(bytes[0] << 8 | bytes[1]).toBe(0xffd8);

      let offset = 2;
      let frame = null;
      let sawScan = false;
      while (offset < bytes.length - 1) {
        if (bytes[offset] !== 0xff) break;
        const marker = bytes[offset + 1];
        if (marker === 0xd9) break;
        const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
        // SOF0..SOF15, excluding DHT (c4), JPG (c8) and DAC (cc).
        const isFrame = marker >= 0xc0 && marker <= 0xcf
          && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
        if (isFrame) {
          frame = { height: (bytes[offset + 5] << 8) | bytes[offset + 6], width: (bytes[offset + 7] << 8) | bytes[offset + 8] };
        }
        if (marker === 0xda) { sawScan = true; break; }   // entropy data follows
        offset += 2 + length;
      }

      // A frame header, carrying real dimensions, BEFORE the scan.
      expect(frame).not.toBeNull();
      expect(frame.width).toBeGreaterThan(0);
      expect(frame.height).toBeGreaterThan(0);
      expect(sawScan).toBe(true);

      // And the entropy data actually runs to completion.
      const tail = (bytes[bytes.length - 2] << 8) | bytes[bytes.length - 1];
      expect(`${type} ends with ${tail.toString(16)}`).toBe(`${type} ends with ffd9`);
    },
  );
});

describe("items without an authority cut-out", () => {
  it.each([["Jembe", "jembe"], ["Rake", "rake"], ["Spade", "spade"], ["Secateurs", "shears"], ["Irrigation Fittings", "irrigation"]])(
    "keeps a valid local illustration for %s",
    (name, visual) => {
      const { container } = render(<ToolVisual name={name} />);
      const wrapper = container.querySelector(`[data-tool-visual="${visual}"]`);
      expect(wrapper).toBeTruthy();
      expect(wrapper.getAttribute("data-visual-source")).toBe("illustration");
      expect(wrapper.querySelector("svg")).toBeTruthy();
    },
  );

  it("falls back to the generic illustration for an unknown item", () => {
    const { container } = render(<ToolVisual name="Site Office Kettle" />);
    const wrapper = container.querySelector('[data-tool-visual="generic"]');
    expect(wrapper).toBeTruthy();
    expect(wrapper.querySelector("svg")).toBeTruthy();
  });
});

describe("sizing", () => {
  // Sizing must be class-driven, or a quick-add pill cannot scale it down.
  it.each([["xs", "h-6"], ["sm", "h-10"], ["md", "h-12"], ["lg", "h-16"]])(
    "applies the %s size as a class",
    (size, expected) => {
      const { container } = render(<ToolVisual name="Jembe" size={size} />);
      expect(container.firstChild.className).toContain(expected);
    },
  );

  it("carries no inline width or height that a caller could not override", () => {
    const { container } = render(<ToolVisual name="Generator" size="sm" />);
    expect(container.firstChild.getAttribute("style")).toBeNull();
  });

  it("lets a caller override the size class", () => {
    const { container } = render(<ToolVisual name="Generator" size="sm" className="!h-5 !w-5" />);
    expect(container.firstChild.className).toContain("!h-5");
  });
});
