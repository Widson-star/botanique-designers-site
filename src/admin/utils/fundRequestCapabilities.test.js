import { describe, expect, it } from "vitest";
import {
  availableAfterRequest, calculateFundRequestTotal, canCancelFundRequest,
  canCreateFundRequest, canDecideFundRequest, canDirectAuthoriseFundRequest,
  canEditFundRequest, canSeeFundRequests, canSubmitFundRequest, canWithdrawFundRequest,
  isReservingFundRequest,
} from "./fundRequestCapabilities";

describe("fund request capabilities", () => {
  it("limits module visibility to Principal and Operations Manager", () => {
    expect(canSeeFundRequests("owner")).toBe(true);
    expect(canSeeFundRequests("manager")).toBe(true);
    expect(canSeeFundRequests("staff")).toBe(false);
    expect(canSeeFundRequests("viewer")).toBe(false);
  });

  it("separates ordinary requesting from Principal direct authority", () => {
    expect(canCreateFundRequest("manager")).toBe(true);
    expect(canCreateFundRequest("owner")).toBe(false);
    expect(canDirectAuthoriseFundRequest("owner")).toBe(true);
    expect(canDirectAuthoriseFundRequest("manager")).toBe(false);
  });

  it("reserves claim value only in submitted, amendment-requested and approved states", () => {
    expect(isReservingFundRequest("submitted")).toBe(true);
    expect(isReservingFundRequest("amendment_requested")).toBe(true);
    expect(isReservingFundRequest("approved")).toBe(true);
    for (const status of ["draft", "rejected", "withdrawn", "cancelled"]) {
      expect(isReservingFundRequest(status)).toBe(false);
    }
  });

  it("gives the Operations Manager no decision, direct-authority or cancellation power", () => {
    const submitted = { status: "submitted", requesterId: "m1" };
    const approved = { status: "approved", requesterId: "m1" };
    expect(canDecideFundRequest(submitted, "manager")).toBe(false);
    expect(canDecideFundRequest(submitted, "owner")).toBe(true);
    expect(canCancelFundRequest(approved, "manager")).toBe(false);
    expect(canCancelFundRequest(approved, "owner")).toBe(true);
    expect(canDecideFundRequest(approved, "owner")).toBe(false);
  });

  it("keeps a submitted request out of the requester's hands except to withdraw", () => {
    const draft = { status: "draft", requesterId: "m1" };
    const submitted = { status: "submitted", requesterId: "m1" };
    const amendment = { status: "amendment_requested", requesterId: "m1" };
    const approved = { status: "approved", requesterId: "m1" };
    expect(canEditFundRequest(draft, "manager", "m1")).toBe(true);
    expect(canSubmitFundRequest(amendment, "manager", "m1")).toBe(true);
    expect(canEditFundRequest(submitted, "manager", "m1")).toBe(false);
    expect(canWithdrawFundRequest(submitted, "manager", "m1")).toBe(true);
    expect(canWithdrawFundRequest(approved, "manager", "m1")).toBe(false);
    expect(canEditFundRequest(draft, "manager", "someone-else")).toBe(false);
  });

  it("derives the total from allocations without trusting a supplied total", () => {
    expect(calculateFundRequestTotal([
      { requestedAmount: 8000 }, { requestedAmount: "12000" }, { requestedAmount: 3000 },
    ])).toBe(23000);
    expect(calculateFundRequestTotal([{ requestedAmount: "-5" }, { requestedAmount: "x" }])).toBe(0);
  });

  it("reports the amount still available after the amount in this request", () => {
    expect(availableAfterRequest({ availableToRequest: 20000 }, 12000)).toBe(8000);
    expect(availableAfterRequest({ availableToRequest: 5000 }, 8000)).toBe(-3000);
  });
});
