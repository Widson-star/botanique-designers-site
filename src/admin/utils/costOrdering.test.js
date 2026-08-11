import { describe, expect, it } from "vitest";
import {
  canCopyDailySiteToCost, canSubmitCostFromDailySite, costSubmissionBlockedReason,
} from "./siteCostCapabilities";

// FOUNDER RULING, 10 August 2026. A cost derived from a Daily Site Record must
// not reach the Principal's FINANCIAL approval before that record is accepted.
// Preparing a draft from a submitted record stays allowed.
describe("cost claim ordering against the Daily Site Record", () => {
  const entry = (state) => ({ id: "e1", state, disposition: "working" });

  it("still allows a draft to be prepared from a submitted record", () => {
    expect(canCopyDailySiteToCost(entry("submitted"), "owner")).toBe(true);
    expect(canCopyDailySiteToCost(entry("resubmitted"), "manager")).toBe(true);
  });

  it("blocks submission for a financial decision until the record is accepted", () => {
    expect(canSubmitCostFromDailySite(entry("submitted"))).toBe(false);
    expect(canSubmitCostFromDailySite(entry("resubmitted"))).toBe(false);
    expect(canSubmitCostFromDailySite(entry("returned_for_correction"))).toBe(false);
  });

  it("allows submission once the record is accepted", () => {
    expect(canSubmitCostFromDailySite(entry("accepted"))).toBe(true);
  });

  // A cost raised directly in Project Costs has no site record to wait for.
  it("leaves a cost with no site record source unaffected", () => {
    expect(canSubmitCostFromDailySite(null)).toBe(true);
  });

  it("explains the block in the reader's language, never in lifecycle names", () => {
    const reason = costSubmissionBlockedReason(entry("submitted"));
    expect(reason).toMatch(/still awaiting review/);
    expect(reason).toMatch(/accepted before this cost can go to the Principal/);
    expect(reason).not.toMatch(/lifecycle|enum|state=/i);
  });
});
