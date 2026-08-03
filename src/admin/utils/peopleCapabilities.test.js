import { describe, expect, it } from "vitest";
import {
  ENGAGEMENT_ROLES, RELATIONSHIP_TYPES, canCreatePerson, canLinkPortalAccess,
  canManageEngagements, canSeePeople, canSetPersonActive, canonicalName,
  findDuplicatePerson, isEngagementOpen, isInternalRelationship, summarisePeople,
} from "./peopleCapabilities";

const people = [
  { id: "1", fullName: "Lincoln Waweru", relationshipType: "crew_representative", isActive: true, profileId: "" },
  { id: "2", fullName: "Martine Lotom", relationshipType: "operations_manager", isActive: true, profileId: "m1" },
  { id: "3", fullName: "Grace Njeri", relationshipType: "site_representative", isActive: true, profileId: "" },
  { id: "4", fullName: "Former Hand", relationshipType: "regular_staff", isActive: false, profileId: "" },
];

describe("people capabilities", () => {
  it("limits the register to Principal and Operations Manager", () => {
    for (const can of [canSeePeople, canCreatePerson, canManageEngagements]) {
      expect(can("owner")).toBe(true);
      expect(can("manager")).toBe(true);
      expect(can("staff")).toBe(false);
      expect(can("viewer")).toBe(false);
    }
  });

  it("keeps portal access and deactivation with the Principal alone", () => {
    expect(canLinkPortalAccess("owner")).toBe(true);
    expect(canLinkPortalAccess("manager")).toBe(false);
    expect(canSetPersonActive("owner")).toBe(true);
    expect(canSetPersonActive("manager")).toBe(false);
  });

  it("offers no casual-worker or crew relationship, per the Founder decision", () => {
    expect(Object.keys(RELATIONSHIP_TYPES)).not.toContain("casual_worker");
    expect(Object.keys(RELATIONSHIP_TYPES)).not.toContain("crew");
    expect(Object.keys(RELATIONSHIP_TYPES)).toContain("crew_representative");
  });

  it("separates internal people from project-based ones", () => {
    expect(isInternalRelationship("regular_staff")).toBe(true);
    expect(isInternalRelationship("principal")).toBe(true);
    expect(isInternalRelationship("subcontractor")).toBe(false);
    expect(isInternalRelationship("crew_representative")).toBe(false);
  });

  it("matches the database canonical-name rule, ignoring case and spacing", () => {
    expect(canonicalName("  Lincoln   Waweru ")).toBe("lincoln waweru");
    expect(findDuplicatePerson(people, "lincoln  waweru")?.id).toBe("1");
    expect(findDuplicatePerson(people, "Someone New")).toBeNull();
    // Editing a person is not a collision with themselves.
    expect(findDuplicatePerson(people, "Lincoln Waweru", "1")).toBeNull();
  });

  it("derives an engagement's active state from its end date alone", () => {
    expect(isEngagementOpen({ endDate: "" })).toBe(true);
    expect(isEngagementOpen({ endDate: "2026-07-31" })).toBe(false);
  });

  it("summarises the register without counting inactive people as staffing", () => {
    expect(summarisePeople(people)).toEqual({
      total: 4, active: 3, inactive: 1, internal: 1, external: 2, withPortalAccess: 1,
    });
  });

  it("keeps engagement roles a closed vocabulary", () => {
    expect(Object.keys(ENGAGEMENT_ROLES).length).toBeGreaterThan(0);
    for (const label of Object.values(ENGAGEMENT_ROLES)) {
      expect(typeof label).toBe("string");
    }
  });
});
