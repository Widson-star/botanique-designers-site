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
    const { container } = render(<ToolVisual name="Generator" />);
    expect(container.querySelector('[data-visual-source="authority-image"]')).toBeTruthy();
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
