// Circular pictograms for the four Tools & Equipment summary cards, matching
// the approved authority's restrained tinted-circle treatment. Local inline
// SVG, Botanique green on a pale green ground — no amber, and no second accent
// colour competing with the register beneath.
const GLYPHS = {
  // Catalogue: a stack of item cards.
  catalogue: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.2 6.6 9 3.8l5.8 2.8L9 9.4Z" />
      <path d="M3.2 9.6 9 12.4l5.8-2.8" />
      <path d="M3.2 12.6 9 15.4l5.8-2.8" />
    </g>
  ),
  // In circulation: an item handed outward and back.
  circulation: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 6.4h8.2M8.2 3.8l2.6 2.6-2.6 2.6" />
      <path d="M15.4 11.6H7.2M9.8 14.2 7.2 11.6l2.6-2.6" />
    </g>
  ),
  // Under repair: a spanner.
  repair: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.4 2.6a3.8 3.8 0 0 0-3.5 5.3l-5.8 5.8a1.7 1.7 0 0 0 2.4 2.4l5.8-5.8a3.8 3.8 0 1 0 1.1-7.7Z" />
    </g>
  ),
  // Stock positions: a location pin.
  positions: (
    <g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 15.6s5-4.4 5-8.2a5 5 0 0 0-10 0c0 3.8 5 8.2 5 8.2Z" />
      <circle cx="9" cy="7.2" r="1.9" />
    </g>
  ),
};

export default function InventoryPictogram({ glyph }) {
  return (
    <span
      aria-hidden="true"
      data-pictogram={glyph}
      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eef3f0] text-botanique-green"
    >
      <svg viewBox="0 0 18 18" width="18" height="18" focusable="false">
        {GLYPHS[glyph] || GLYPHS.catalogue}
      </svg>
    </span>
  );
}
