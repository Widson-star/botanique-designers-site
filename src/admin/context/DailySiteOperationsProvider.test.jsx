import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminDataContext } from "./adminData";
import DailySiteOperationsProvider from "./DailySiteOperationsProvider";
import { useDailySiteOperations } from "./dailySiteOperations";

// Project access != Daily Site Entry eligibility: a completed project stays
// visible in Projects but must not be a target for a NEW Daily Site Entry. This
// mirrors the database daily_site_authorised_projects() eligibility rule.
function Selector() {
  const { authorisedProjects } = useDailySiteOperations();
  return (
    <ul>
      {authorisedProjects.map((p) => (
        <li key={p.id}>{p.projectName}</li>
      ))}
    </ul>
  );
}

function renderSelector(projects) {
  return render(
    <AdminDataContext.Provider value={{ currentUserId: "manager-1", projects }}>
      <DailySiteOperationsProvider session={null} role="manager" isDemo>
        <Selector />
      </DailySiteOperationsProvider>
    </AdminDataContext.Provider>
  );
}

describe("Daily Site new-entry selector eligibility (demo parity)", () => {
  it("includes only Ongoing, non-archived projects (Pending/Paused/terminal excluded)", () => {
    renderSelector([
      { id: "1", projectName: "Alego", status: "Ongoing", archived: false },
      { id: "2", projectName: "Karen Paused", status: "Paused", archived: false },
      { id: "3", projectName: "Mununga", status: "Completed", archived: false },
      { id: "4", projectName: "Cancelled Site", status: "Cancelled", archived: false },
      { id: "5", projectName: "Archived Site", status: "Ongoing", archived: true },
      { id: "6", projectName: "Concept Only", status: "Design-only", archived: false },
      { id: "7", projectName: "New Intake", status: "Pending", archived: false },
    ]);
    // Only the Ongoing, non-archived project is eligible for a new entry.
    expect(screen.getByText("Alego")).toBeInTheDocument();
    // Paused is excluded — the project must be resumed via approval first.
    expect(screen.queryByText("Karen Paused")).not.toBeInTheDocument();
    // Pending is excluded — active site operations have not begun.
    expect(screen.queryByText("New Intake")).not.toBeInTheDocument();
    expect(screen.queryByText("Mununga")).not.toBeInTheDocument();
    expect(screen.queryByText("Cancelled Site")).not.toBeInTheDocument();
    expect(screen.queryByText("Archived Site")).not.toBeInTheDocument();
    expect(screen.queryByText("Concept Only")).not.toBeInTheDocument();
  });
});
