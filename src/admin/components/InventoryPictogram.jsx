// Circular pictograms for the four Tools & Equipment summary cards.
//
// TAKEN FROM THE AUTHORITY, NOT INVENTED. Every form here was read off the
// Founder-approved standalone Tools & Equipment screen
// (operations_hub_equipment_dashboard.png, 1448x1086, sha256 551c4ed3…dc0c1a)
// at magnification. Two earlier passes got this wrong in ways worth recording,
// so they are not repeated:
//
//   * "Active stock positions" was drawn as three FLAT stacked rectangles. The
//     authority is three ISOMETRIC cubes in a pyramid — one resting on two.
//   * "Assets in circulation" was drawn as a FORKLIFT, which is what the
//     written brief called for. The authority is unambiguously a side-profile
//     DELIVERY TRUCK: cargo box left, cab and windscreen right, two road
//     wheels. The image governs the composition, so it is a truck.
//
// The solids are white-filled rather than open outlines, exactly as the
// authority draws them — that is what lets the three cubes overlap and occlude
// one another instead of reading as a tangle of lines, and it is why the box
// and truck sit as objects on the pale ground rather than as wireframes.
//
// Botanique green on a pale green ground, one stroke weight throughout. No
// amber, and no second accent colour competing with the register beneath.
const FACE = "#ffffff";

// One isometric cube. The trio below is this same solid drawn three times, so
// "Catalogue items" and "Active stock positions" are visibly one thing and
// three of the same thing rather than two unrelated drawings.
function Cube({ cx, ty, w, a, s }) {
  return (
    <>
      <path d={`M${cx} ${ty} L${cx + w} ${ty + a} L${cx} ${ty + a * 2} L${cx - w} ${ty + a} Z`} fill={FACE} />
      <path d={`M${cx - w} ${ty + a} L${cx - w} ${ty + a + s} L${cx} ${ty + a * 2 + s} L${cx + w} ${ty + a + s} L${cx + w} ${ty + a}`} fill={FACE} />
      <path d={`M${cx} ${ty + a * 2} L${cx} ${ty + a * 2 + s}`} />
    </>
  );
}

const GLYPHS = {
  // Catalogue items: ONE isometric carton — a single kind of thing, described
  // once — complete with the authority's tape band across the lid and the
  // short tape tab folded over the right face.
  catalogue: (
    <g>
      <path d="M12 2.4 L20.4 7.2 L20.4 14.6 L12 19.4 L3.6 14.6 L3.6 7.2 Z" fill={FACE} />
      <path d="M3.6 7.2 L12 12 L20.4 7.2" />
      <path d="M12 12 L12 19.4" />
      <path d="M9.48 3.84 L17.88 8.64" />
      <path d="M7.63 4.9 L16.03 9.7" />
      <path d="M17.88 8.64 L17.88 10.9 L16.03 11.96 L16.03 9.7" />
    </g>
  ),

  // Assets in circulation: a side-profile delivery truck — equipment out on
  // the road. Wheels are drawn last and filled, so they occlude the body line
  // the way the authority shows them.
  circulation: (
    <g>
      <path d="M2 7.6 a1.6 1.6 0 0 1 1.6-1.6 h8.2 a1.6 1.6 0 0 1 1.6 1.6 v8 h-11.4 Z" fill={FACE} />
      <path d="M13.4 9.4 h4.2 a1.4 1.4 0 0 1 1 .44 l2.6 2.9 a1.4 1.4 0 0 1 .36.94 v1.92 h-8.16 Z" fill={FACE} />
      <path d="M16.1 10.9 h1.5 l1.9 2.1 h-3.4 Z" fill={FACE} />
      <circle cx="6.5" cy="16.6" r="2.2" fill={FACE} />
      <circle cx="16.6" cy="16.6" r="2.2" fill={FACE} />
      <circle cx="6.5" cy="16.6" r="0.75" />
      <circle cx="16.6" cy="16.6" r="0.75" />
    </g>
  ),

  // Under repair: the authority's open-jaw spanner, head to the upper right
  // and a rounded handle running down to the lower left.
  repair: (
    <g>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" fill={FACE} />
    </g>
  ),

  // Active stock positions: THREE isometric cubes — the same solid, held in
  // several places. Back cube first so the two front cubes overlap it.
  positions: (
    <g>
      <Cube cx={12} ty={2.5} w={5.4} a={3.1} s={4.6} />
      <Cube cx={6.6} ty={10.2} w={5.4} a={3.1} s={4.6} />
      <Cube cx={17.4} ty={10.2} w={5.4} a={3.1} s={4.6} />
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
      <svg
        viewBox="0 0 24 24" width="24" height="24" focusable="false"
        fill="none" stroke="currentColor" strokeWidth="1.4"
        strokeLinecap="round" strokeLinejoin="round"
      >
        {GLYPHS[glyph] || GLYPHS.catalogue}
      </svg>
    </span>
  );
}
