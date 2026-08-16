// Presentation-only helpers for the Maintenance interface.
//
// Project lifecycle and Maintenance lifecycle are deliberately independent.
// The Start Maintenance selector therefore presents a clean project/site list
// without Project status labels. Client/site names are intentionally omitted
// from Maintenance presentation for privacy; the project relationship itself
// remains linked internally by id.
//
// Production can also contain duplicate Project rows for the same named site.
// Until those data records are explicitly reconciled, the interface must not
// make the Founder choose between indistinguishable duplicates. Prefer the
// richer row (client/site identity present) internally and otherwise keep the
// first authorised record returned by the server. This changes presentation
// only; it never mutates or silently merges database records.
export function maintenanceProjectChoiceLabel(project = {}) {
  return String(project.projectName || "").trim();
}

export function dedupeMaintenanceEligibleProjects(projects = []) {
  const byName = new Map();

  for (const project of projects) {
    const key = String(project.projectName || "").trim().toLowerCase();
    if (!key) continue;

    const current = byName.get(key);
    if (!current) {
      byName.set(key, project);
      continue;
    }

    const currentHasSite = Boolean(String(current.clientSiteName || "").trim());
    const nextHasSite = Boolean(String(project.clientSiteName || "").trim());
    if (!currentHasSite && nextHasSite) byName.set(key, project);
  }

  return [...byName.values()].sort((a, b) =>
    String(a.projectName || "").localeCompare(String(b.projectName || ""), "en", { sensitivity: "base" })
  );
}
