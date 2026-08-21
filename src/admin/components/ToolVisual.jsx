// Local equipment thumbnails for the Inventory register.
//
// Six of these are the Founder-approved product cut-outs taken from the
// authority PNG itself and served from /public — the register should look like
// the approved screen, not approximate it. The rest stay as local illustrations
// until their own authority images exist.
//
// EVERY visual falls back to its illustration if the image cannot be decoded,
// so a missing or malformed asset degrades to a correct drawing instead of a
// broken-image icon on the Founder's screen.
//
// Local only: no remote URL, no stock-photo dependency, no runtime fetch beyond
// the app's own origin. Nothing is persisted — Inventory V1 has no image
// column, and the mapping is catalogue-name -> visual so the library can be
// expanded or replaced without touching inventory truth.
//
// Palette for the drawings is restrained — Botanique green, slate and stone.
// No amber anywhere, so a row of thumbnails stays quiet against the register.
import { useState } from "react";
import { visualTypeForItem } from "../utils/toolVisuals";

const G = "#3f6b52";        // Botanique green
const GD = "#2c4c3b";       // deep green shadow
const GL = "#6f9781";       // light green highlight
const S = "#475569";        // slate body
const SD = "#334155";       // slate shadow
const SL = "#94a3b8";       // slate highlight
const ST = "#d6d3d1";       // stone
const STD = "#a8a29e";      // stone shadow
const CH = "#292524";       // charcoal (tyres, grips)
const W = "#f5f5f4";        // off-white detail

const DRAWINGS = {
  // Walk-behind mower: deck, engine block, grass catcher, swept handle, wheels.
  mower: (
    <g>
      <path d="M23 25c4-1 7-4 8-8l3-9h-6l-2 7-4 2Z" fill={ST} />
      <path d="M23 25c4-1 7-4 8-8l1-3-5 1-1 5-4 2Z" fill={STD} />
      <path d="M4 24h20v-6H9l-5 3Z" fill={G} />
      <path d="M4 24h20v-2H4Z" fill={GD} />
      <rect x="11" y="10" width="9" height="8" rx="1.5" fill={S} />
      <rect x="11" y="10" width="9" height="3" rx="1.5" fill={SL} />
      <path d="M13 10V8h5v2" fill="none" stroke={SD} strokeWidth="1.6" />
      <circle cx="8" cy="27" r="4" fill={CH} />
      <circle cx="8" cy="27" r="1.6" fill={SL} />
      <circle cx="22" cy="27" r="4" fill={CH} />
      <circle cx="22" cy="27" r="1.6" fill={SL} />
    </g>
  ),

  // Rotary hammer drill: body, chuck and bit, grip, battery pack, vents.
  drill: (
    <g>
      <path d="M5 12h14l4 3v5l-4 3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z" fill={G} />
      <path d="M5 12h14l4 3H3v-1a2 2 0 0 1 2-2Z" fill={GL} />
      <path d="M23 15h4v5h-4z" fill={SD} />
      <path d="M27 16.2h6v2.6h-6z" fill={SL} />
      <path d="M31 16.2h2v2.6h-2z" fill={S} />
      <path d="M7 23h7l-1.5 6H8.5Z" fill={G} />
      <path d="M6 28h9v4a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1Z" fill={S} />
      <path d="M6 28h9v1.6H6Z" fill={SD} />
      <path d="M6 16h3v1H6zM6 18h3v1H6z" fill={GD} />
      <path d="M14 22.6h2.6v2H14z" fill={CH} />
    </g>
  ),

  // Wheelbarrow: tray, braced frame, front wheel, two grips.
  wheelbarrow: (
    <g>
      <path d="M6 11h20l-4 10H10Z" fill={G} />
      <path d="M6 11h20l-1 2.6H7Z" fill={GL} />
      <path d="M10 21h12l-1 2H11Z" fill={GD} />
      <path d="M26 11h5" stroke={S} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M31 10.2h3v1.8h-3z" fill={CH} />
      <path d="M22 21 27 12" stroke={S} strokeWidth="2" strokeLinecap="round" />
      <path d="M11 23 6 30" stroke={S} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M20 23h5" stroke={S} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="13" cy="27" r="4.6" fill={CH} />
      <circle cx="13" cy="27" r="2" fill={SL} />
      <circle cx="13" cy="27" r="0.8" fill={SD} />
    </g>
  ),

  // Brush cutter: engine head, shaft, D-handle, guard and blade disc.
  brush_cutter: (
    <g>
      <rect x="22" y="5" width="10" height="8" rx="2" fill={S} />
      <rect x="22" y="5" width="10" height="3" rx="2" fill={SL} />
      <path d="M24 13h6v2h-6z" fill={SD} />
      <path d="M25 15 9 28" stroke={S} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M25 15 9 28" stroke={SL} strokeWidth="0.9" strokeLinecap="round" />
      <path d="M19 17c2-3 5-3 6-1" fill="none" stroke={CH} strokeWidth="2" strokeLinecap="round" />
      <path d="M3 26a7 7 0 0 1 9-3l-2 4Z" fill={GD} />
      <circle cx="9" cy="28" r="5.4" fill={G} />
      <circle cx="9" cy="28" r="2" fill={W} />
      <path d="M3.6 28h10.8M9 22.6v10.8" stroke={W} strokeWidth="1.3" strokeLinecap="round" />
    </g>
  ),

  // Hose reel: coiled hose on a drum, frame stand, crank and nozzle.
  hose: (
    <g>
      <path d="M6 30h20v2.4H6z" fill={S} />
      <path d="M9 20v10M23 20v10" stroke={S} strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="16" cy="17" r="12" fill={ST} />
      <circle cx="16" cy="17" r="12" fill="none" stroke={STD} strokeWidth="1" />
      <circle cx="16" cy="17" r="9.4" fill="none" stroke={G} strokeWidth="2.6" />
      <circle cx="16" cy="17" r="6.4" fill="none" stroke={GL} strokeWidth="2.4" />
      <circle cx="16" cy="17" r="3.6" fill={S} />
      <circle cx="16" cy="17" r="1.4" fill={SL} />
      <path d="M25 12c3-1 5 0 6 2" fill="none" stroke={G} strokeWidth="2.4" strokeLinecap="round" />
      <path d="M30.4 13.4h3v2.4h-3z" fill={CH} />
    </g>
  ),

  // Portable generator: roll frame, engine body, control panel, exhaust, feet.
  generator: (
    <g>
      <path d="M4 11h24v3H4zM4 11v14M28 11v14" stroke={SD} strokeWidth="2" strokeLinecap="round" fill="none" />
      <rect x="6" y="13" width="20" height="13" rx="2" fill={G} />
      <rect x="6" y="13" width="20" height="4" rx="2" fill={GL} />
      <rect x="8.5" y="18.5" width="7.5" height="5.5" rx="1" fill={W} />
      <circle cx="11" cy="21.2" r="1.3" fill={S} />
      <circle cx="14" cy="21.2" r="1.3" fill={S} />
      <path d="M18.5 19h5v1.6h-5zM18.5 22h5v1.6h-5z" fill={GD} />
      <circle cx="24" cy="10.4" r="1.8" fill={SD} />
      <path d="M28 16h4v2.4h-4z" fill={S} />
      <path d="M7 26h4v3.2H7zM21 26h4v3.2h-4z" fill={CH} />
    </g>
  ),

  // Jembe (hoe): long hardwood handle, steel collar, and a broad blade set
  // ACROSS the handle at roughly a right angle — which is what distinguishes it
  // from the spade, whose blade continues the line of the shaft.
  jembe: (
    <g>
      <path d="M29 4 13 22" stroke={STD} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M29 4 13 22" stroke={ST} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M28 3h4v3.4h-4z" fill={CH} />
      <path d="M11.6 19.4 16 23.4" stroke={CH} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M3 22.5 15 33 18.5 27 7.5 18Z" fill={S} />
      <path d="M3 22.5 15 33l1.6-2.7L4.8 20.4Z" fill={SL} />
      <path d="M4.4 21 16 30.6" stroke={SD} strokeWidth="0.9" />
    </g>
  ),

  // Leaf rake: handle, collar, fan head with tines.
  rake: (
    <g>
      <path d="M20 3 14 20" stroke={STD} strokeWidth="3.2" strokeLinecap="round" />
      <path d="M20 3 14 20" stroke={ST} strokeWidth="1.3" strokeLinecap="round" />
      <path d="M19 2.4h4v3h-4z" fill={CH} />
      <path d="M6 23c2.6-2.4 6-3.6 9.6-3.2" fill="none" stroke={S} strokeWidth="2.2" strokeLinecap="round" />
      <path d="M5 22 3 30M8 23.4 7 31M11.5 23.4l.6 7.6M15 22.6l2.6 7.4" stroke={G} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),

  // Spade: D-grip, shaft, treaded blade.
  spade: (
    <g>
      <path d="M13 4h6v3.6a3 3 0 0 1-3 3 3 3 0 0 1-3-3Z" fill="none" stroke={CH} strokeWidth="2.2" />
      <path d="M16 10v11" stroke={STD} strokeWidth="3.4" strokeLinecap="round" />
      <path d="M16 10v11" stroke={ST} strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 21h12v4.4A6.6 6.6 0 0 1 16 32a6.6 6.6 0 0 1-6-6.6Z" fill={S} />
      <path d="M10 21h6v11a6.6 6.6 0 0 1-6-6.6Z" fill={SL} />
      <path d="M10.6 21.6h10.8" stroke={SD} strokeWidth="1.6" />
    </g>
  ),

  // Secateurs: crossed blades, sprung pivot, grips.
  shears: (
    <g>
      <path d="M9 27 25 7" stroke={SL} strokeWidth="3" strokeLinecap="round" />
      <path d="M9 27 25 7" stroke={W} strokeWidth="1" strokeLinecap="round" />
      <path d="M23 27 7 7" stroke={S} strokeWidth="3" strokeLinecap="round" />
      <path d="M7 25c-2 1.6-2.6 4-1 5.6 1.6 1.6 4 1 5.6-1" fill="none" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <path d="M25 25c2 1.6 2.6 4 1 5.6-1.6 1.6-4 1-5.6-1" fill="none" stroke={GD} strokeWidth="3" strokeLinecap="round" />
      <circle cx="16" cy="17" r="2.4" fill={CH} />
      <circle cx="16" cy="17" r="0.9" fill={SL} />
    </g>
  ),

  // Irrigation: pipe run with elbow fittings, risers and sprinkler heads.
  irrigation: (
    <g>
      <path d="M3 25h26" stroke={S} strokeWidth="4" strokeLinecap="round" />
      <path d="M3 24h26" stroke={SL} strokeWidth="1.2" strokeLinecap="round" />
      <path d="M9 25v-6M17 25v-8M25 25v-6" stroke={G} strokeWidth="3" strokeLinecap="round" />
      <rect x="6.6" y="22.6" width="4.8" height="4.8" rx="1" fill={SD} />
      <rect x="14.6" y="22.6" width="4.8" height="4.8" rx="1" fill={SD} />
      <rect x="22.6" y="22.6" width="4.8" height="4.8" rx="1" fill={SD} />
      <circle cx="9" cy="17.6" r="2.4" fill={GL} />
      <circle cx="17" cy="15.6" r="2.4" fill={GL} />
      <circle cx="25" cy="17.6" r="2.4" fill={GL} />
      <path d="M6.4 14.6 8 16.6M11.6 14.6 10 16.6M14.4 12.6 16 14.6M19.6 12.6 18 14.6" stroke={GL} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  ),

  // Unknown item: a restrained spanner-and-driver pair, never a wrong guess.
  generic: (
    <g>
      <path d="M23 5a7 7 0 0 0-6.4 9.9L6 25.5a3.2 3.2 0 0 0 4.5 4.5L21.1 19.4A7 7 0 1 0 23 5Z" fill={ST} />
      <path d="M23 5a7 7 0 0 0-6.4 9.9L6 25.5a3.2 3.2 0 0 0 2.2 5.4c-.5-1 0-2.3.9-3.2L20 17a7 7 0 0 1 3-12Z" fill={STD} />
      <circle cx="23.6" cy="11.4" r="2.8" fill={W} />
      <path d="M9.2 26.8 6 30" stroke={STD} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  ),
};

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
  xs: "h-6 w-6",      // quick-add pill
  sm: "h-10 w-10",    // register / catalogue row
  md: "h-12 w-12",
  lg: "h-16 w-16",
};

/**
 * A catalogue item's thumbnail. `name` is the catalogue item name; the visual
 * is derived from it, never stored.
 */
export default function ToolVisual({ name, visual, size = "md", className = "" }) {
  const type = visual || visualTypeForItem(name);
  const [imageFailed, setImageFailed] = useState(false);
  const source = AUTHORITY_IMAGES[type];
  const useImage = Boolean(source) && !imageFailed;
  const label = name ? `${name} thumbnail` : "Tool thumbnail";

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-stone-200 bg-white ${SIZE_CLASSES[size] || SIZE_CLASSES.md} ${className}`}
      data-tool-visual={type}
      data-visual-source={useImage ? "authority-image" : "illustration"}
    >
      {useImage ? (
        <img
          src={source}
          alt={label}
          // Deliberately NOT lazy: these are 24-40px thumbnails, so deferring
          // them saves nothing, and inside a sheet the browser can decline to
          // load them at all — which showed up as a register with no imagery.
          decoding="async"
          onError={() => setImageFailed(true)}
          className="h-full w-full object-contain p-0.5"
        />
      ) : (
        <svg viewBox="0 0 36 36" className="h-full w-full p-0.5" role="img" aria-label={label} focusable="false">
          {DRAWINGS[type] || DRAWINGS.generic}
        </svg>
      )}
    </span>
  );
}

export { AUTHORITY_IMAGES };
