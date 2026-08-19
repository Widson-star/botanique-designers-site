// Presentation-only helpers for the Maintenance interface.
//
// Maintenance belongs to a SITE — a durable physical property. The originating
// Botanique Project is optional context, so every label here must read correctly
// when there is no Project at all. Project lifecycle and Maintenance lifecycle
// stay independent, so no Project status is appended to a Maintenance label.
//
// Client names are deliberately never shown: the Site is the property, not the
// person. The Project relationship remains linked internally by id.

// Site is the durable Maintenance identity. Location disambiguates two
// properties that share a name; it is never a client label.
export function maintenanceSiteChoiceLabel(site = {}) {
  const name = String(site.siteName || "").trim();
  const location = String(site.location || "").trim();
  return location ? `${name} — ${location}` : name;
}

// The label a Maintenance record leads with. A maintenance-only Site has no
// Project, so there is never an invented "Unknown project" placeholder.
export function maintenanceRecordLabel(relationship = {}) {
  return String(relationship.siteName || "").trim();
}
