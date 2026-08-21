import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ToolVisual, { AUTHORITY_IMAGES } from "./ToolVisual";

describe("authority equipment cut-outs", () => {
  it.each([
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

  // The guard that would have caught the Generator defect at test time instead
  // of on the Founder's screen. A browser renders a truncated JPEG's partial
  // scan as flat grey WITHOUT firing onError, so the component's own fallback
  // cannot save a malformed file — it must never be referenced in the first
  // place. Every referenced file must therefore be a complete JPEG: SOI at the
  // front, EOI at the very end.
  it("references only complete, decodable image files", () => {
    for (const [type, source] of Object.entries(AUTHORITY_IMAGES)) {
      const bytes = readFileSync(`public${source}`);
      expect(`${type}:${bytes[0].toString(16)}${bytes[1].toString(16)}`).toBe(`${type}:ffd8`);
      const tail = `${bytes[bytes.length - 2].toString(16)}${bytes[bytes.length - 1].toString(16)}`;
      expect(`${type} ends with EOI: ${tail}`).toBe(`${type} ends with EOI: ffd9`);
    }
  });
});

describe("the truncated Generator authority image", () => {
  // Pinning the defect so this cannot be quietly re-introduced: if a sound
  // replacement lands, this test fails and the mapping should be restored.
  it("is still malformed on disk, which is why it is not referenced", () => {
    const bytes = readFileSync("public/admin/inventory-tools/authority-generator.jpg");
    const tail = `${bytes[bytes.length - 2].toString(16)}${bytes[bytes.length - 1].toString(16)}`;
    expect(tail).not.toBe("ffd9");
    expect(AUTHORITY_IMAGES.generator).toBeUndefined();
  });

  it("falls back to the correct generator drawing rather than a grey box", () => {
    const { container } = render(<ToolVisual name="Generator" />);
    const wrapper = container.querySelector('[data-tool-visual="generator"]');
    expect(wrapper).toBeTruthy();
    expect(wrapper.getAttribute("data-visual-source")).toBe("illustration");
    expect(wrapper.querySelector("svg")).toBeTruthy();
    expect(container.querySelector("img")).toBeNull();
  });
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
