import { describe, expect, it } from "vitest";
import { canSeeFinance } from "./financeCapabilities";
import { ROLES } from "../constants/roles";

describe("canSeeFinance", () => {
  it("allows owner and manager", () => {
    expect(canSeeFinance(ROLES.OWNER)).toBe(true);
    expect(canSeeFinance(ROLES.MANAGER)).toBe(true);
  });

  it("denies staff and viewer", () => {
    expect(canSeeFinance(ROLES.STAFF)).toBe(false);
    expect(canSeeFinance(ROLES.VIEWER)).toBe(false);
  });
});
