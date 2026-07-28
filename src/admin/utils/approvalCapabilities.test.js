import { describe, expect, it } from "vitest";
import {
  canAmendApproval,
  canDecideApproval,
  canSeeApprovals,
  canWithdrawApproval,
  proposedValuesForApproval,
  originalValuesForApproval,
  requestableProjectApprovalTypes,
} from "./approvalCapabilities";

describe("approval capabilities", () => {
  it("exposes approvals only to owner and manager", () => {
    expect(canSeeApprovals("owner")).toBe(true);
    expect(canSeeApprovals("manager")).toBe(true);
    expect(canSeeApprovals("staff")).toBe(false);
    expect(canSeeApprovals("viewer")).toBe(false);
  });

  it("allows only an owner to decide an awaiting request", () => {
    expect(canDecideApproval("owner", { state: "awaiting_review" })).toBe(true);
    expect(canDecideApproval("manager", { state: "awaiting_review" })).toBe(false);
    expect(canDecideApproval("owner", { state: "approved" })).toBe(false);
  });

  it("limits amendment and withdrawal to the original requester", () => {
    const request = { requesterId: "manager", state: "amendment_requested" };
    expect(canAmendApproval("manager", request, "manager")).toBe(true);
    expect(canAmendApproval("manager", request, "other")).toBe(false);
    expect(canWithdrawApproval("manager", request, "manager")).toBe(true);
    expect(canWithdrawApproval("manager", { ...request, state: "approved" }, "manager")).toBe(false);
  });

  it("blocks withdrawal after substantive review", () => {
    expect(canWithdrawApproval("manager", {
      requesterId: "manager",
      state: "awaiting_review",
      reviewedAt: "2026-07-28T08:00:00Z",
    }, "manager")).toBe(false);
  });

  it("offers manager request actions matching current project semantics", () => {
    expect(requestableProjectApprovalTypes("manager", {
      status: "Pending",
      archived: false,
    })).toEqual([
      "project_activation",
      "project_target_completion_change",
      "project_completion",
      "project_cancellation",
      "project_archive",
    ]);
    expect(requestableProjectApprovalTypes("manager", {
      status: "Completed",
      archived: true,
    })).toEqual(["project_restore"]);
    expect(requestableProjectApprovalTypes("owner", {
      status: "Pending",
      archived: false,
    })).toEqual([]);
  });

  it("constructs only the fields reviewed for each type", () => {
    expect(proposedValuesForApproval("project_activation")).toEqual({ status: "Ongoing" });
    expect(proposedValuesForApproval("project_target_completion_change", "2026-09-01"))
      .toEqual({ target_completion_date: "2026-09-01" });
    expect(proposedValuesForApproval("project_completion", "2026-08-01"))
      .toEqual({ status: "Completed", actual_completion_date: "2026-08-01" });
    expect(proposedValuesForApproval("project_archive")).toEqual({ archived: true });
    expect(originalValuesForApproval("project_completion", {
      status: "Ongoing",
      actualCompletionDate: "",
    })).toEqual({ status: "Ongoing", actual_completion_date: null });
  });
});
