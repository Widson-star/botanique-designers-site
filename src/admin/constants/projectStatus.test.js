import { describe, expect, it } from "vitest";
import {
  PORTFOLIO_PERMISSION_STATUSES,
  PORTFOLIO_PUBLICATION_OPTIONS,
  derivePortfolioEligible,
  portfolioPublicationLabel,
} from "./projectStatus";

// The single-field Portfolio consolidation is display-only: the dropdown is
// bound to the existing portfolio_permission_status enum, and portfolio_eligible
// is derived. These tests pin the exact legacy-value mapping so no stored value
// is ever silently reinterpreted.
describe("portfolio publication mapping", () => {
  it("covers every stored permission-status enum value exactly once", () => {
    const mapped = PORTFOLIO_PUBLICATION_OPTIONS.map((o) => o.value).sort();
    expect(mapped).toEqual([...PORTFOLIO_PERMISSION_STATUSES].sort());
  });

  it("maps each legacy value to its friendly label", () => {
    expect(portfolioPublicationLabel("Not Reviewed")).toBe("Not assessed");
    expect(portfolioPublicationLabel("Eligible")).toBe("Internal portfolio candidate");
    expect(portfolioPublicationLabel("Permission Needed")).toBe("Client authorisation required");
    expect(portfolioPublicationLabel("Approved For Portfolio")).toBe("Approved for publication");
    expect(portfolioPublicationLabel("Private / Do Not Publish")).toBe("Confidential — do not publish");
  });

  it("falls back to the raw value if an unknown status is passed", () => {
    expect(portfolioPublicationLabel("Something Else")).toBe("Something Else");
  });

  it("derives the eligibility flag deterministically so the two can never conflict", () => {
    expect(derivePortfolioEligible("Not Reviewed")).toBe(false);
    expect(derivePortfolioEligible("Eligible")).toBe(true);
    expect(derivePortfolioEligible("Permission Needed")).toBe(true);
    expect(derivePortfolioEligible("Approved For Portfolio")).toBe(true);
    expect(derivePortfolioEligible("Private / Do Not Publish")).toBe(false);
  });

  it("never marks 'Approved for publication' as an automatic public publish signal", () => {
    // Approval derives eligibility only; there is no public-publication field
    // here — public portfolio content is a separate, curated dataset.
    const approved = PORTFOLIO_PUBLICATION_OPTIONS.find(
      (o) => o.value === "Approved For Portfolio"
    );
    expect(approved.eligible).toBe(true);
    expect(approved).not.toHaveProperty("publish");
    expect(approved).not.toHaveProperty("published");
  });
});
