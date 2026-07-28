export const FOUNDER_FORMAL_NAME = "Widson Omutelema Ambaisi";
export const FOUNDER_COMPACT_NAME = "Widson O. Ambaisi";

export function compactPersonName(name) {
  return name === FOUNDER_FORMAL_NAME ? FOUNDER_COMPACT_NAME : name;
}
