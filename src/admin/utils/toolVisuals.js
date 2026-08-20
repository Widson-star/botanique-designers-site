// Tools & Equipment visual mapping.
//
// THE VISUAL LIBRARY IS PREBUILT; THE INVENTORY RECORDS ARE NOT. This maps a
// catalogue item's NAME to one of a fixed set of local drawings, so adding the
// catalogue item "Lawn Mower" makes a mower appear, and registering BD-LM-001,
// BD-LM-002 and BD-LM-003 against it gives all three the same visual while each
// keeps its own asset code, Site, status, condition and custodian.
//
// Nothing here is persisted. Inventory V1 stores no image column, and this
// layer is deliberately isolated so the drawings can be expanded or replaced
// without touching inventory truth.

export const TOOL_VISUALS = [
  "mower", "brush_cutter", "wheelbarrow", "jembe", "rake", "spade",
  "generator", "drill", "hose", "shears", "irrigation", "generic",
];

// Ordered longest-intent-first so "brush cutter" is not swallowed by "cutter",
// and "pruning shears" is not matched as a generic tool.
const MATCHERS = [
  ["brush_cutter", [/\bbrush\s*cutter\b/, /\bbrushcutter\b/, /\bstrimmer\b/, /\bline\s*trimmer\b/, /\bgrass\s*cutter\b/]],
  ["mower", [/\bmower\b/, /\bmowing\b/, /\blawn\s*machine\b/]],
  ["wheelbarrow", [/\bwheel\s*barrow\b/, /\bwheelbarrow\b/, /\bbarrow\b/]],
  ["jembe", [/\bjembe\b/, /\bhoe\b/, /\bmattock\b/]],
  ["rake", [/\brake\b/, /\bleaf\s*rake\b/]],
  ["spade", [/\bspade\b/, /\bshovel\b/]],
  ["generator", [/\bgenerator\b/, /\bgenset\b/, /\bkva\b/]],
  ["drill", [/\bdrill\b/, /\brotary\s*hammer\b/, /\bhammer\s*drill\b/]],
  ["hose", [/\bhose\b/, /\bhose\s*reel\b/, /\bwatering\s*hose\b/]],
  ["shears", [/\bsecateur/, /\bpruning\s*shear/, /\bshear/, /\bpruner/, /\bloppers?\b/]],
  ["irrigation", [/\birrigation\b/, /\bsprinkler\b/, /\bdripper\b/, /\bfitting/, /\bpipe\b/, /\bemitter\b/]],
];

// The catalogue name is free text, so normalise the way the database does
// before matching: trimmed, whitespace-collapsed, lower case. Underscores and
// hyphens read as spaces so "brush_cutter" and "brush-cutter" match too.
export function normaliseItemName(name) {
  return String(name || "")
    .trim()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

// An unknown item gets a restrained neutral Tools drawing rather than a wrong
// one. Guessing a mower for "Site Office Kettle" would be worse than generic.
export function visualTypeForItem(name) {
  const normalised = normaliseItemName(name);
  if (!normalised) return "generic";
  for (const [visual, patterns] of MATCHERS) {
    if (patterns.some((pattern) => pattern.test(normalised))) return visual;
  }
  return "generic";
}

// Quick-add choices for the catalogue form. These ONLY prefill the form — they
// create nothing until the operator saves, which is what keeps the visual
// library prebuilt while the inventory itself stays empty until it is real.
export const QUICK_ADD_ITEMS = [
  { name: "Lawn Mower", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Brush Cutter", category: "grounds_equipment", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Wheelbarrow", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Jembe", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Rake", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Spade", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Generator", category: "power_equipment", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Rotary Hammer Drill", category: "power_tools", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Hose Reel", category: "irrigation", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Secateurs", category: "manual_tools", trackingMethod: "asset", unitOfMeasure: "unit" },
  { name: "Irrigation Fittings", category: "irrigation", trackingMethod: "stock", unitOfMeasure: "unit" },
];
