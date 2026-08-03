import { ROLES } from "../constants/roles";

// The relationship a person has with Botanique. These are the Product
// Requirements §16 workforce categories, minus the two that are not individual
// people: 'casual worker' — deferred to the Labour domain by Founder decision,
// so casual labour stays a headcount and crew reference on the Daily Site entry
// — and 'crew', which names a group rather than a person.
export const RELATIONSHIP_TYPES = {
  principal: "Principal",
  operations_manager: "Operations Manager",
  regular_staff: "Regular staff",
  crew_representative: "Crew representative",
  subcontractor: "Subcontractor",
  consultant: "Consultant",
  external_professional: "External professional",
  site_representative: "Site representative",
};

// Internal people are Botanique's continuing team. Everyone else is engaged for
// a project, a site or a period, and needs no portal account to be recorded.
export const INTERNAL_RELATIONSHIPS = ["principal", "operations_manager", "regular_staff"];

export function isInternalRelationship(relationshipType) {
  return INTERNAL_RELATIONSHIPS.includes(relationshipType);
}

// What a person does on ONE project. A closed vocabulary, deliberately, because
// uncontrolled free-text roles are what made the existing crew references
// unusable.
export const ENGAGEMENT_ROLES = {
  team_leader: "Team leader",
  site_representative: "Site representative",
  supervisor: "Supervisor",
  skilled_worker: "Skilled worker",
  specialist_subcontractor: "Specialist subcontractor",
  consultant: "Consultant",
  project_support: "Project support",
};

export function canSeePeople(role) {
  return role === ROLES.OWNER || role === ROLES.MANAGER;
}

// The Operations Manager runs day-to-day resourcing: adding people and managing
// their project engagements.
export function canCreatePerson(role) {
  return canSeePeople(role);
}

export function canEditPerson(role) {
  return canSeePeople(role);
}

export function canManageEngagements(role) {
  return canSeePeople(role);
}

// Linking a portal account and withdrawing somebody from the register both
// change what other users can reach, so both stay with the Principal. The
// database enforces this independently; these two only decide what the
// interface offers.
export function canLinkPortalAccess(role) {
  return role === ROLES.OWNER;
}

export function canSetPersonActive(role) {
  return role === ROLES.OWNER;
}

// Matches the database's canonical-name unique index, so the interface can warn
// about a duplicate before the write rather than surfacing a constraint error.
export function canonicalName(name) {
  return (name || "").trim().replace(/\s+/g, " ").toLowerCase();
}

export function findDuplicatePerson(people, name, ignoreId = "") {
  const canonical = canonicalName(name);
  if (!canonical) return null;
  return people.find(
    (person) => person.id !== ignoreId && canonicalName(person.fullName) === canonical
  ) || null;
}

// An engagement is active exactly when it has no end date. Nothing stores an
// "active" flag, so the two can never disagree.
export function isEngagementOpen(engagement) {
  return !engagement?.endDate;
}

export function summarisePeople(people) {
  const active = people.filter((person) => person.isActive);
  return {
    total: people.length,
    active: active.length,
    inactive: people.length - active.length,
    internal: active.filter((person) => isInternalRelationship(person.relationshipType)).length,
    external: active.filter((person) => !isInternalRelationship(person.relationshipType)).length,
    withPortalAccess: people.filter((person) => Boolean(person.profileId)).length,
  };
}
