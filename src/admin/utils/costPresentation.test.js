import { describe, expect, it } from "vitest";
import {
  costAmountLabel, costSecondaryDescription, paymentChannelLabel,
} from "./costPresentation";

// Post-live corrections, 12 Aug 2026. Labels only — no amount, lifecycle,
// authority or stored value changes here.
describe("cost amount label follows lifecycle truth", () => {
  it("calls an undecided amount what it is", () => {
    expect(costAmountLabel({ lifecycle: "draft" })).toBe("Current amount");
    expect(costAmountLabel({ lifecycle: "amendment_requested" })).toBe("Current amount");
  });

  it("names a submitted amount by its submission", () => {
    expect(costAmountLabel({ lifecycle: "awaiting_review" })).toBe("Submitted amount");
  });

  it("names an approved amount by its approval", () => {
    expect(costAmountLabel({ lifecycle: "approved" })).toBe("Approved amount");
  });

  it("settles on a final amount once the cost is closed", () => {
    for (const lifecycle of ["rejected", "withdrawn", "cancelled"]) {
      expect(costAmountLabel({ lifecycle })).toBe("Final amount");
    }
  });

  it("never calls an undecided amount approved", () => {
    for (const lifecycle of ["draft", "awaiting_review", "amendment_requested"]) {
      expect(costAmountLabel({ lifecycle })).not.toBe("Approved amount");
    }
    expect(costAmountLabel(null)).toBe("Current amount");
  });
});

describe("register secondary description", () => {
  it("says what the cost was for, joining a multi-line purpose", () => {
    expect(costSecondaryDescription({ purpose: "Cabro arrangement\nLandscape prep" }))
      .toBe("Cabro arrangement — Landscape prep");
  });

  it("prefers purpose over raw recipient arithmetic", () => {
    const description = costSecondaryDescription({
      purpose: "Cabro arrangement",
      recipientLabel: "(Mason 1200 and 2 casuals @500} Ksh 2200, Waweru {1000}",
    });
    expect(description).toBe("Cabro arrangement");
    expect(description).not.toMatch(/Ksh 2200/);
  });

  it("keeps the row compact — the full text belongs to the drill-through", () => {
    const wordy = "Sixteen casual workers at KES 500 each for excavation, plus mason subcontract and mkokoteni cartage";
    const description = costSecondaryDescription({ purpose: wordy });
    expect(description.length).toBeLessThanOrEqual(61);
    expect(description).not.toMatch(/mkokoteni/);
    expect(description.endsWith("…")).toBe(true);
  });

  it("falls back to a trimmed recipient, without inventing meaning", () => {
    expect(costSecondaryDescription({ purpose: "", recipientLabel: "  3 (Casuals)  " }))
      .toBe("3 (Casuals)");
    expect(costSecondaryDescription({})).toBe("");
  });
});

describe("payment method labels", () => {
  it("reads M-Pesa rather than the stored enum", () => {
    expect(paymentChannelLabel("mpesa")).toBe("M-Pesa");
  });

  it("reads bank transfer in plain words", () => {
    expect(paymentChannelLabel("bank_transfer")).toBe("Bank transfer");
  });

  it("keeps cash and other correct", () => {
    expect(paymentChannelLabel("cash")).toBe("Cash");
    expect(paymentChannelLabel("other")).toBe("Other");
  });

  it("degrades readably rather than throwing on an unknown value", () => {
    expect(paymentChannelLabel("")).toBe("");
    expect(paymentChannelLabel("some_future_channel")).toBe("some future channel");
  });
});
