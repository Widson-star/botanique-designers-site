// A catalogue item's visual.
//
// AUTHORITY 17 REMOVED THE HAND-DRAWN TOOLS. This file used to carry a dozen
// improvised SVG drawings — a jembe, a rake, a panga-less "generic wrench" —
// and they are no longer authority. The controlled professional library is,
// and it is design-controlled by ChatGPT/Founder, not by this code. Nothing
// here draws a tool, and nothing here may.
//
// Three states, in order:
//
//   1. an approved library visual, cropped from the committed sprite;
//   2. one of the six earlier approved product cut-outs, kept because they are
//      still approved imagery and still decode;
//   3. "visual not assigned" — a restrained neutral mark for an item the
//      library has nothing for.
//
// State 3 is deliberately NOT a picture of some other tool. A generic wrench
// standing in for a panga tells the operator something false, and quietly:
// they see a tool, assume it is the tool, and never learn the library is
// missing an entry. A neutral mark is honest and self-reporting.
import { useState } from "react";
import { TOOL_LIBRARY, spriteStyle, toolKeyForName } from "../utils/toolLibrary";
import { visualTypeForItem } from "../utils/toolVisuals";

// The six items visible in the approved authority, served locally.
//
// Each of these must be a COMPLETE JPEG. A truncated one is not caught by the
// onError fallback below: a browser renders the partial scan — in practice a
// flat grey rectangle — without ever treating it as an error, so the drawing
// never gets its chance. Generator was exactly that for a while. The integrity
// guard in ToolVisual.test.jsx is what keeps that from recurring silently.
const AUTHORITY_IMAGES = {
  generator: "/admin/inventory-tools/authority-generator.jpg",
  drill: "/admin/inventory-tools/authority-drill.jpg",
  wheelbarrow: "/admin/inventory-tools/authority-wheelbarrow.jpg",
  brush_cutter: "/admin/inventory-tools/authority-brush-cutter.jpg",
  hose: "/admin/inventory-tools/authority-hose-reel.jpg",
  mower: "/admin/inventory-tools/authority-lawn-mower.jpg",
};

// Sizing is class-driven, not inline, so a caller can genuinely scale the
// thumbnail down — a quick-add pill passing `!h-5 !w-5` now wins, which an
// inline width/height would have silently defeated.
const SIZE_CLASSES = {
  xs: "h-6 w-6",      // picker pill
  sm: "h-10 w-10",    // register / catalogue row
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

// Pixel sizes matching the classes above, because a sprite crop has to be
// positioned in real pixels rather than Tailwind units.
const SIZE_PIXELS = { xs: 24, sm: 40, md: 48, lg: 64 };

/**
 * A catalogue item's thumbnail. `name` is the catalogue item name; the visual
 * is derived from it, never stored.
 *
 * The cut-out FLOATS in its cell. There is deliberately no border, no filled
 * ground and no rounded card around it: a boxed thumbnail turns every row into
 * a grid of framed tiles competing with the item name, where the authority has
 * the product simply sitting beside its label. `framed` is kept for the one
 * place that genuinely needs a contained figure — the asset detail sheet, where
 * the visual is the subject of the panel rather than a row ornament.
 */
export default function ToolVisual({ name, visual, size = "md", framed = false, className = "" }) {
  const [imageFailed, setImageFailed] = useState(false);

  // The approved library first. `visual` still overrides, so a caller that
  // already knows the key does not have to round-trip through the name.
  const libraryKey = visual && spriteStyle(visual, 1) ? visual : toolKeyForName(name);
  const legacyKey = visual || visualTypeForItem(name);
  const legacySource = AUTHORITY_IMAGES[legacyKey];

  const label = name ? `${name} thumbnail` : "Tool thumbnail";
  const frame = framed ? "overflow-hidden rounded-lg border border-stone-200 bg-white" : "";
  const box = `inline-flex shrink-0 items-center justify-center ${frame} ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`;
  const pixels = SIZE_PIXELS[size] || SIZE_PIXELS.md;

  if (libraryKey && !imageFailed) {
    return (
      <span
        className={box}
        data-tool-visual={libraryKey}
        data-visual-framed={framed ? "true" : "false"}
        data-visual-source="tool-library"
        data-tool-library-key={libraryKey}
        role="img"
        aria-label={label}
      >
        <span aria-hidden="true" style={spriteStyle(libraryKey, pixels)} />
        {/* A real <img> of the same sheet, hidden, purely so a sprite that
            cannot be decoded reports itself instead of leaving an empty box.
            A CSS background has no error event of its own. */}
        <img
          src={TOOL_LIBRARY.sprite} alt="" aria-hidden="true"
          onError={() => setImageFailed(true)}
          className="hidden"
        />
      </span>
    );
  }

  if (legacySource && !imageFailed) {
    return (
      <span
        className={box}
        data-tool-visual={legacyKey}
        data-visual-framed={framed ? "true" : "false"}
        data-visual-source="authority-image"
      >
        <img
          src={legacySource}
          alt={label}
          // Deliberately NOT lazy: these are 24-40px thumbnails, so deferring
          // them saves nothing, and inside a sheet the browser can decline to
          // load them at all — which showed up as a register with no imagery.
          decoding="async"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain"
        />
      </span>
    );
  }

  // Visual not assigned. Not a tool, not a guess — a quiet placeholder that
  // says the library has nothing for this item yet.
  return (
    <span
      className={`${box} rounded-lg border border-dashed border-stone-300 bg-stone-50 text-stone-400`}
      data-tool-visual="unassigned"
      data-visual-framed={framed ? "true" : "false"}
      data-visual-source="unassigned"
      role="img"
      aria-label={`${label} — visual not assigned`}
      title="Visual not assigned"
    >
      <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" focusable="false">
        <rect x="3.5" y="3.5" width="17" height="17" rx="2.5" />
        <path d="M8 15.5 11 12l2.5 2.5L16 12" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

export { AUTHORITY_IMAGES };
