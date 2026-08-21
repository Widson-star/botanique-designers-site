// Circular pictograms for the four Tools & Equipment summary cards, matching
// the approved authority's restrained tinted-circle treatment. Local inline
// SVG, Botanique green on a pale green ground — no amber, and no second accent
// colour competing with the register beneath.
const GLYPHS = {
  // Catalogue items: a SINGLE box — one kind of thing, described once.
  catalogue: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.6 6.8 11 3.2l7.4 3.6v7.4L11 17.8l-7.4-3.6Z" />
      <path d="M3.6 6.8 11 10.4l7.4-3.6M11 10.4v7.4" />
    </g>
  ),
  // Assets in circulation: a forklift — equipment out doing work.
  circulation: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.6 14.2V5.4h6.2v8.8" />
      <path d="M12.6 14.2V8.6h2.2l2.6 3.4v2.2" />
      <path d="M12.6 3.2v11" />
      <path d="M12.6 12.4h5.8" />
      <circle cx="5.6" cy="16.6" r="1.9" />
      <circle cx="14.6" cy="16.6" r="1.9" />
    </g>
  ),
  // Under repair: a spanner.
  repair: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.6 2.8a4.3 4.3 0 0 0-4 5.9l-6.6 6.6a1.9 1.9 0 0 0 2.7 2.7l6.6-6.6a4.3 4.3 0 1 0 1.3-8.6Z" />
    </g>
  ),
  // Active stock positions: STACKED boxes — quantity held in places.
  positions: (
    <g fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.6 2.8h8.8v5.2H6.6Z" />
      <path d="M2.6 8h8.8v5.2H2.6Z" />
      <path d="M10.6 13.2h8.8v5.2h-8.8Z" />
    </g>
  ),
};

export default function InventoryPictogram({ glyph }) {
  return (
    <span
      aria-hidden="true"
      data-pictogram={glyph}
      className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eef3f0] text-botanique-green"
    >
      <svg viewBox="0 0 22 22" width="24" height="24" focusable="false">
        {GLYPHS[glyph] || GLYPHS.catalogue}
      </svg>
    </span>
  );
}
