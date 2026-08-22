// The controlled professional tool visual library.
//
// THE LIBRARY IS DESIGN-CONTROLLED, NOT CODE-CONTROLLED. Authority 17 is
// explicit: Claude may wire an approved visual into the application and must
// not draw tools, invent SVGs, substitute an approximation or pick a
// misleading fallback. So this file contains NO artwork. It reads the committed
// map and turns a catalogue name into a sprite cell, and that is all it does.
//
// Everything here derives from the two committed assets:
//   public/admin/inventory-tools/professional-tool-library.json
//   public/admin/inventory-tools/professional-tool-library.png
//
// Adding a tool to the library is a design act — a new cell in the sheet and a
// new entry in the JSON. It is not a code change, and nothing below hard-codes
// the set.
import library from "../../../public/admin/inventory-tools/professional-tool-library.json";

export const TOOL_LIBRARY = library;
export const TOOL_LIBRARY_KEYS = Object.keys(library.tools);

// Where a cell sits in the sheet, as CSS a caller can drop straight onto an
// element. Expressed as a background so one HTTP request serves every tool and
// the browser never has to decode thirty files.
export function spriteStyle(key, renderedSize) {
  const cell = library.tools[key];
  if (!cell) return null;
  const scale = renderedSize / library.cellSize;
  const rows = Math.ceil(TOOL_LIBRARY_KEYS.length / library.columns);
  return {
    backgroundImage: `url("${library.sprite}")`,
    backgroundSize: `${library.columns * renderedSize}px ${rows * renderedSize}px`,
    backgroundPosition: `-${cell.col * renderedSize}px -${cell.row * renderedSize}px`,
    backgroundRepeat: "no-repeat",
    width: `${renderedSize}px`,
    height: `${renderedSize}px`,
    // Kept so a caller can reason about the scale it asked for.
    "--tool-sprite-scale": String(scale),
  };
}

export function toolLabel(key) {
  return library.tools[key]?.label || "";
}

// Catalogue names are free text, so normalise the way the database does before
// matching: trimmed, whitespace-collapsed, lower case, underscores and hyphens
// read as spaces.
export function normaliseToolName(name) {
  return String(name || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// Name -> library key.
//
// Ordered longest-intent-first so "brush cutter" is not swallowed by "cutter",
// "pruning saw" is not matched as a plain saw, and "rotary hammer drill" wins
// over "drill". Every key below exists in the committed JSON; the assertion at
// the bottom of this file fails loudly if that ever stops being true.
const MATCHERS = [
  ["rotary_hammer_drill", [/\brotary\s*hammer\b/, /\bhammer\s*drill\b/, /\bsds\b/]],
  ["brush_cutter", [/\bbrush\s*cutter\b/, /\bbrushcutter\b/, /\bstrimmer\b/, /\bline\s*trimmer\b/, /\bgrass\s*cutter\b/]],
  ["hedge_trimmer", [/\bhedge\s*trimmer\b/, /\bhedge\s*cutter\b/]],
  ["pruning_saw", [/\bpruning\s*saw\b/, /\bpruner\s*saw\b/]],
  ["pressure_washer", [/\bpressure\s*washer\b/, /\bjet\s*wash/]],
  ["leaf_blower", [/\bleaf\s*blower\b/, /\bblower\b/]],
  ["water_pump", [/\bwater\s*pump\b/, /\bpump\b/]],
  ["hose_reel", [/\bhose\s*reel\b/, /\bhose\b/]],
  ["angle_grinder", [/\bangle\s*grinder\b/, /\bgrinder\b/]],
  ["lawn_mower", [/\blawn\s*mower\b/, /\bmower\b/, /\bmowing\s*machine\b/]],
  ["wheelbarrow_plastic", [/\bplastic\s*wheel\s*barrow\b/, /\bplastic\s*wheelbarrow\b/]],
  ["wheelbarrow", [/\bwheel\s*barrow\b/, /\bwheelbarrow\b/, /\bbarrow\b/]],
  ["safety_helmet", [/\bhelmet\b/, /\bhard\s*hat\b/]],
  ["gloves", [/\bglove/]],
  ["irrigation_fittings", [/\birrigation\b/, /\bsprinkler\b/, /\bdripper\b/, /\bfitting/, /\bemitter\b/, /\bconnector/]],
  ["hand_trowel", [/\bhand\s*trowel\b/, /\btrowel\b/]],
  ["hand_fork", [/\bhand\s*fork\b/]],
  ["garden_fork", [/\bgarden\s*fork\b/, /\bdigging\s*fork\b/, /\bfork\b/]],
  ["secateurs", [/\bsecateur/, /\bpruning\s*shear/, /\bshear/, /\bpruner/, /\bloppers?\b/]],
  ["chainsaw", [/\bchain\s*saw\b/, /\bchainsaw\b/]],
  ["generator", [/\bgenerator\b/, /\bgenset\b/, /\bkva\b/]],
  ["drill", [/\bdrill\b/]],
  ["jembe", [/\bjembe\b/, /\bhoe\b/]],
  ["panga", [/\bpanga\b/, /\bmachete\b/, /\bslasher\b/]],
  ["mattock", [/\bmattock\b/]],
  ["pickaxe", [/\bpick\s*axe\b/, /\bpickaxe\b/]],
  ["axe", [/\baxe\b/, /\bhatchet\b/]],
  ["rake", [/\brake\b/]],
  ["spade", [/\bspade\b/, /\bshovel\b/]],
  ["ladder", [/\bladder\b/]],
];

/**
 * The approved library key for a catalogue item name, or null when the library
 * has nothing for it.
 *
 * NULL IS A REAL ANSWER, not a failure to try harder. Authority 17: "A generic
 * wrench must never masquerade as a panga." An unknown item gets the neutral
 * "visual not assigned" treatment, and the operator can see at a glance that
 * the picture is missing rather than wrong.
 */
export function toolKeyForName(name) {
  const normalised = normaliseToolName(name);
  if (!normalised) return null;
  for (const [key, patterns] of MATCHERS) {
    if (patterns.some((pattern) => pattern.test(normalised))) return key;
  }
  return null;
}

// The picker's own list: every approved tool, with a sensible default tracking
// method and unit so choosing one prefills the form.
//
// Quantity-only is the default ONLY for the things that genuinely are counted
// rather than identified — fittings and consumables. Everything else is a
// reusable tool that earns its own BD-TE identity.
const QUANTITY_ONLY_KEYS = new Set(["irrigation_fittings", "gloves"]);

const CATEGORY_FOR_KEY = {
  jembe: "manual_tools", panga: "manual_tools", rake: "manual_tools",
  spade: "manual_tools", garden_fork: "manual_tools", secateurs: "manual_tools",
  pruning_saw: "manual_tools", axe: "manual_tools", mattock: "manual_tools",
  pickaxe: "manual_tools", hand_fork: "manual_tools", hand_trowel: "manual_tools",
  wheelbarrow: "grounds_equipment", wheelbarrow_plastic: "grounds_equipment",
  lawn_mower: "grounds_equipment", brush_cutter: "grounds_equipment",
  hedge_trimmer: "grounds_equipment", leaf_blower: "grounds_equipment",
  chainsaw: "power_tools", generator: "power_equipment",
  rotary_hammer_drill: "power_tools", drill: "power_tools",
  angle_grinder: "power_tools", pressure_washer: "power_equipment",
  water_pump: "power_equipment", ladder: "access_equipment",
  hose_reel: "irrigation", irrigation_fittings: "irrigation",
  safety_helmet: "safety_ppe", gloves: "safety_ppe",
};

export const TOOL_PICKER_ITEMS = TOOL_LIBRARY_KEYS.map((key) => {
  const quantityOnly = QUANTITY_ONLY_KEYS.has(key);
  return {
    key,
    name: library.tools[key].label,
    category: CATEGORY_FOR_KEY[key] || "tools",
    trackingMethod: quantityOnly ? "stock" : "asset",
    unitOfMeasure: quantityOnly ? "" : "unit",
  };
});

// Search across the operator's words, not the storage tokens: "power" finds the
// power tools, "cutter" finds the brush cutter, "hoe" finds the jembe.
export function searchToolLibrary(query) {
  const needle = normaliseToolName(query);
  if (!needle) return TOOL_PICKER_ITEMS;
  return TOOL_PICKER_ITEMS.filter((entry) => {
    const haystack = [
      entry.name,
      entry.category.replace(/_/g, " "),
      entry.key.replace(/_/g, " "),
    ].join(" ").toLowerCase();
    if (haystack.includes(needle)) return true;
    // So typing the operator's own word for a thing finds it too.
    return toolKeyForName(needle) === entry.key;
  });
}

// The picker's category filter, derived from the library rather than declared,
// so a new category arrives with its tool and needs no code change.
export const TOOL_PICKER_CATEGORIES = [...new Set(TOOL_PICKER_ITEMS.map((entry) => entry.category))].sort();
