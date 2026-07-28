import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { AdminDataContext } from "../context/adminData";
import ActivityHistory from "./ActivityHistory";

const activity = {
  id: "activity-1",
  action: "updated",
  actor_id: "owner-1",
  occurred_at: "2026-07-27T08:30:00Z",
  changed_fields: ["next_action", "blocker"],
  previous_values: { next_action: "Survey", blocker: null },
  new_values: { next_action: "Mobilise", blocker: "Awaiting access" },
  reason: "Operations review",
};

const managerActivity = {
  ...activity,
  id: "activity-2",
  actor_id: "manager-1",
  occurred_at: "2026-07-27T09:30:00Z",
};

describe("ActivityHistory", () => {
  it("uses compact operational names while retaining formal expanded identity", async () => {
    render(
      <AdminDataContext.Provider
        value={{
          profilesById: {
            "owner-1": { full_name: "Widson Omutelema Ambaisi" },
            "manager-1": { full_name: "Martine Lotom" },
          },
          fetchActivities: vi.fn().mockResolvedValue([activity, managerActivity]),
        }}
      >
        <ActivityHistory projectId="p1" />
      </AdminDataContext.Provider>
    );

    expect(await screen.findAllByText("Project updated")).toHaveLength(2);
    const founderRow = screen.getByText("By Widson O. Ambaisi").closest("li");
    expect(founderRow).not.toBeNull();
    expect(screen.getByText("By Martine Lotom")).toBeInTheDocument();
    expect(screen.queryByText("By Widson Omutelema Ambaisi")).not.toBeInTheDocument();
    expect(
      within(founderRow).getByText(/Next action changed from Survey to Mobilise/)
    ).toBeInTheDocument();
    const details = within(founderRow).getByText("View details").closest("details");
    expect(details).not.toHaveAttribute("open");

    fireEvent.click(within(founderRow).getByText("View details"));
    expect(details).toHaveAttribute("open");
    expect(details).toHaveTextContent("Actor: Widson Omutelema Ambaisi");
    expect(details).toHaveTextContent("Blocker:");
    expect(screen.queryByText("activity-1")).not.toBeInTheDocument();
    expect(screen.queryByText("activity-2")).not.toBeInTheDocument();
    expect(screen.queryByText("owner-1")).not.toBeInTheDocument();
    expect(screen.queryByText("manager-1")).not.toBeInTheDocument();
  });
});
