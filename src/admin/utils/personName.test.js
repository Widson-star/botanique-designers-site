import { describe, expect, it } from "vitest";
import { greetingFirstName, resolveDisplayName } from "./personName";

describe("resolveDisplayName", () => {
  it("prefers the authenticated profile's presentation name", () => {
    expect(resolveDisplayName({ role: "manager", full_name: "Martine Lotom" }, "ignored")).toBe(
      "Martine Lotom"
    );
  });

  it("normalises the founder's formal name to the compact form", () => {
    expect(
      resolveDisplayName(
        { role: "owner", email: "widson@botaniquedesigners.com", full_name: "Widson Omutelema Ambaisi" },
        undefined
      )
    ).toBe("Widson O. Ambaisi");
  });

  it("falls back to the demo-preview label when there is no profile", () => {
    expect(resolveDisplayName(null, "Widson O. Ambaisi")).toBe("Widson O. Ambaisi");
  });

  it("falls back to the generic label when neither is usable", () => {
    expect(resolveDisplayName(null, undefined)).toBe("Authenticated admin");
  });
});

describe("greetingFirstName", () => {
  it("extracts the first given name from the resolved profile", () => {
    expect(greetingFirstName({ role: "manager", full_name: "Martine Lotom" }, undefined)).toBe(
      "Martine"
    );
  });

  it("extracts the first name from the founder's compact form", () => {
    expect(
      greetingFirstName(
        { role: "owner", email: "widson@botaniquedesigners.com", full_name: "Widson Omutelema Ambaisi" },
        undefined
      )
    ).toBe("Widson");
  });

  it("falls back to the demo-preview label's first name", () => {
    expect(greetingFirstName(null, "Martine Lotom")).toBe("Martine");
  });

  it("returns an empty string, not a placeholder, when nothing can be resolved", () => {
    expect(greetingFirstName(null, undefined)).toBe("");
    expect(greetingFirstName(null, "")).toBe("");
  });
});
