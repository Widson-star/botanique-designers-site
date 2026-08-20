// Local tool thumbnails for the Inventory register.
//
// Inline SVG on purpose: no remote URL, no stock-photo dependency, no runtime
// image fetch, and nothing to go missing on a slow site connection. Each
// drawing is meant to read as the actual tool at 40px, not as a generic icon.
//
// Two muted tones only — Botanique green for the working part, stone for
// structure — so a row of thumbnails stays quiet against the register.
import { visualTypeForItem } from "../utils/toolVisuals";

const GREEN = "#3f6b52";
const STONE = "#78716c";
const LIGHT = "#d6d3d1";

const DRAWINGS = {
  mower: (
    <g>
      <path d="M5 27h20a3 3 0 0 0 3-3v-4H11l-6 4v3Z" fill={GREEN} opacity="0.9" />
      <path d="M28 20V13a2 2 0 0 0-2-2h-4v9" fill="none" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
      <path d="M11 20 5 24" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="29" r="3" fill={STONE} />
      <circle cx="25" cy="29" r="3" fill={STONE} />
      <path d="M28 13c3-1 5-3 5-6" fill="none" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  brush_cutter: (
    <g>
      <path d="M7 30 27 8" stroke={STONE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M22 6h8v6h-8z" rx="1" fill={STONE} />
      <circle cx="8" cy="29" r="5" fill={GREEN} opacity="0.85" />
      <path d="M3 29h10M8 24v10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M16 17c3 1 5 1 7 0" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  wheelbarrow: (
    <g>
      <path d="M8 12h16l-3 10H11L8 12Z" fill={GREEN} opacity="0.9" />
      <path d="M24 12h5" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
      <path d="M11 22 6 29" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
      <path d="M21 22h4" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
      <circle cx="15" cy="27" r="4" fill={STONE} />
      <circle cx="15" cy="27" r="1.5" fill={LIGHT} />
    </g>
  ),
  jembe: (
    <g>
      <path d="M9 5 27 27" stroke={STONE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 24c-2 4 0 8 4 8 3 0 5-2 6-5l-8-5-2 2Z" fill={GREEN} opacity="0.9" />
      <path d="M7 3h5v4H7z" fill={STONE} />
    </g>
  ),
  rake: (
    <g>
      <path d="M20 6 12 24" stroke={STONE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M5 24h16" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 24v6M10 24v6M14 24v6M18 24v6" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
      <path d="M19 4h4v4h-4z" fill={STONE} />
    </g>
  ),
  spade: (
    <g>
      <path d="M17 5v18" stroke={STONE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M13 4h8v3h-8z" fill={STONE} />
      <path d="M11 23h12v4a6 6 0 0 1-6 5 6 6 0 0 1-6-5v-4Z" fill={GREEN} opacity="0.9" />
    </g>
  ),
  generator: (
    <g>
      <rect x="4" y="13" width="24" height="14" rx="2" fill={GREEN} opacity="0.9" />
      <path d="M8 13v-3a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v3" fill="none" stroke={STONE} strokeWidth="2" />
      <circle cx="11" cy="20" r="3" fill="#fff" opacity="0.85" />
      <path d="M19 17h6M19 21h6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M7 27v3M25 27v3" stroke={STONE} strokeWidth="2" strokeLinecap="round" />
    </g>
  ),
  drill: (
    <g>
      <path d="M6 10h13v8H6z" rx="2" fill={GREEN} opacity="0.9" />
      <path d="M19 12h6v4h-6z" fill={STONE} />
      <path d="M25 14h6" stroke={STONE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M8 18l-2 9h7l2-9" fill={STONE} />
      <path d="M6 27h9v3H6z" rx="1" fill={LIGHT} />
    </g>
  ),
  hose: (
    <g>
      <circle cx="16" cy="18" r="11" fill="none" stroke={GREEN} strokeWidth="3" opacity="0.9" />
      <circle cx="16" cy="18" r="5" fill="none" stroke={STONE} strokeWidth="2.5" />
      <circle cx="16" cy="18" r="1.6" fill={STONE} />
      <path d="M27 18c3 1 4 4 4 7" fill="none" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  shears: (
    <g>
      <path d="M11 26 24 8" stroke={STONE} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M21 26 8 8" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="28" r="3.2" fill="none" stroke={STONE} strokeWidth="2" />
      <circle cx="22" cy="28" r="3.2" fill="none" stroke={GREEN} strokeWidth="2" />
      <circle cx="16" cy="17" r="1.6" fill={STONE} />
    </g>
  ),
  irrigation: (
    <g>
      <path d="M4 22h24" stroke={STONE} strokeWidth="3" strokeLinecap="round" />
      <path d="M10 22v-4M16 22v-6M22 22v-4" stroke={GREEN} strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="10" cy="16" r="2" fill={GREEN} />
      <circle cx="16" cy="14" r="2" fill={GREEN} />
      <circle cx="22" cy="16" r="2" fill={GREEN} />
      <path d="M6 20h4v4H6zM22 20h4v4h-4z" fill={LIGHT} />
    </g>
  ),
  generic: (
    <g>
      <path d="M20 6a7 7 0 0 0-6.3 10.1L6 23.8a3 3 0 0 0 4.2 4.2l7.7-7.7A7 7 0 1 0 20 6Z" fill="none" stroke={STONE} strokeWidth="2.2" strokeLinejoin="round" />
      <circle cx="20" cy="13" r="2.4" fill={GREEN} opacity="0.9" />
    </g>
  ),
};

const SIZES = { sm: 28, md: 40, lg: 56 };

/**
 * A catalogue item's thumbnail. `name` is the catalogue item name; the visual
 * is derived, never stored.
 */
export default function ToolVisual({ name, visual, size = "md", className = "" }) {
  const type = visual || visualTypeForItem(name);
  const drawing = DRAWINGS[type] || DRAWINGS.generic;
  const px = SIZES[size] || SIZES.md;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-stone-50 ${className}`}
      style={{ width: px, height: px }}
      data-tool-visual={type}
    >
      <svg
        viewBox="0 0 36 36"
        width={px - 8}
        height={px - 8}
        role="img"
        aria-label={name ? `${name} thumbnail` : "Tool thumbnail"}
        focusable="false"
      >
        {drawing}
      </svg>
    </span>
  );
}
