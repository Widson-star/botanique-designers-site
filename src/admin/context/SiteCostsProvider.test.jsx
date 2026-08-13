import { describe, it, expect } from "vitest";
import { act, render } from "@testing-library/react";
import { AdminDataContext } from "./adminData";
import SiteCostsProvider from "./SiteCostsProvider";
import { useSiteCosts } from "./siteCosts";

// Demo parity, not a new feature. In hosted mode every claim action returns
// { ok, claim } because the database returns the row and run() maps it. The demo paths must
// honour the same contract, because AdminSiteCostForm creates a draft and immediately submits
// it in the same tick and then reads result.claim.id.

const projects = [{ id: "p1", projectName: "Alego Usonga", status: "Ongoing", archived: false }];

const values = {
  serviceDate: "2026-08-09",
  projectId: "p1",
  recipientType: "crew",
  recipientLabel: "Alego turf crew",
  category: "labour",
  purpose: "Lay turf on the north bank",
  lines: [
    { description: "Casual worker day", rateType: "daily", quantity: 6, unit: "worker", unitRate: 500 },
    { description: "Cart transport", rateType: "task", quantity: 1, unit: "trip", unitRate: 350 },
  ],
};

function harness() {
  const captured = {};
  function Probe() {
    const costs = useSiteCosts();
    captured.costs = costs;
    return null;
  }
  render(
    <AdminDataContext.Provider value={{ currentUserId: "m1", projects, profiles: [] }}>
      <SiteCostsProvider session={null} role="manager" isDemo>
        <Probe />
      </SiteCostsProvider>
    </AdminDataContext.Provider>
  );
  return captured;
}

describe("SiteCostsProvider demo contract parity", () => {
  it("returns the submitted claim when a draft is created and submitted in one flow", async () => {
    const captured = harness();
    let created;
    let submitted;

    // Exactly what AdminSiteCostForm does for a Manager who ticks "submit for review".
    await act(async () => {
      created = await captured.costs.createDraft(values);
      submitted = await captured.costs.submitClaim(created.claim.id, created.claim.version);
    });

    expect(created.ok).toBe(true);
    expect(submitted.ok).toBe(true);
    // The form dereferences result.claim.id to navigate. An undefined claim is a TypeError.
    expect(submitted.claim).toBeTruthy();
    expect(submitted.claim.id).toBe(created.claim.id);
    expect(submitted.claim.lifecycle).toBe("awaiting_review");
    expect(submitted.claim.version).toBe(created.claim.version + 1);
    // 6 x 500 + 1 x 350. A submitted total of 0 is the visible symptom of the same defect.
    expect(submitted.claim.submittedTotal).toBe(3350);
  });

  it("keeps the submitted total visible in provider state after the submission", async () => {
    const captured = harness();
    await act(async () => {
      const created = await captured.costs.createDraft(values);
      await captured.costs.submitClaim(created.claim.id, created.claim.version);
    });
    const [claim] = captured.costs.claims;
    expect(claim.lifecycle).toBe("awaiting_review");
    expect(claim.submittedTotal).toBe(3350);
  });

  it("refuses a stale submission the way the database would", async () => {
    const captured = harness();
    let result;
    await act(async () => {
      const created = await captured.costs.createDraft(values);
      result = await captured.costs.submitClaim(created.claim.id, created.claim.version + 5);
    });
    expect(result.ok).toBe(false);
    expect(result.stale).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Historical settlement parity. Founder ruling, 12 Aug 2026.
// Demo approvals are tracked from the moment they are authorised, so their
// payment history is never unknown — and Mark paid must refuse them for exactly
// the reason the database gives.
// ---------------------------------------------------------------------------
describe("SiteCostsProvider historical settlement parity", () => {
  function ownerHarness() {
    const captured = {};
    function Probe() {
      captured.costs = useSiteCosts();
      return null;
    }
    render(
      <AdminDataContext.Provider value={{ currentUserId: "o1", projects, profiles: [] }}>
        <SiteCostsProvider session={null} role="owner" isDemo>
          <Probe />
        </SiteCostsProvider>
      </AdminDataContext.Provider>
    );
    return captured;
  }

  it("refuses Mark paid on a cost whose payment history is already known", async () => {
    const captured = ownerHarness();
    let result;
    await act(async () => {
      const created = await captured.costs.authoriseDirect(values);
      result = await captured.costs.markPaid(created.claim.id);
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/already has a confirmed payment history/);
  });

  it("refuses Mark paid on a cost that is not approved", async () => {
    const captured = ownerHarness();
    let result;
    await act(async () => {
      const created = await captured.costs.createDraft(values);
      result = await captured.costs.markPaid(created.claim.id);
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/Only an approved Project Cost/);
  });

  it("refuses to correct a settlement that does not exist", async () => {
    const captured = ownerHarness();
    let result;
    await act(async () => {
      const created = await captured.costs.authoriseDirect(values);
      result = await captured.costs.correctHistoricalSettlement(created.claim.id, "Wrong cost");
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/no historical settlement to correct/);
  });
});
