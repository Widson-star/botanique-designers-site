import { describe, expect, it, vi, beforeEach } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { AdminDataProvider } from "./AdminDataContext";
import { useAdminData } from "./adminData";

const api = vi.hoisted(() => ({
  createProject: vi.fn(),
  fetchProjectActivities: vi.fn(),
  fetchProjects: vi.fn(),
  fetchVisibleProfiles: vi.fn(),
  updateProject: vi.fn(),
}));

vi.mock("../lib/supabase", () => api);

const profile = {
  id: "manager-1",
  email: "manager@example.test",
  full_name: "Martine Lotom",
  role: "manager",
  is_active: true,
};

function rawProject(id, name, overrides = {}) {
  return {
    id,
    project_name: name,
    client_site_name: "",
    location: "",
    county: "",
    project_type: "Residential",
    status: "Ongoing",
    stage: "Implementation",
    lead_person_id: "manager-1",
    start_date: null,
    actual_start_date: null,
    target_completion_date: null,
    actual_completion_date: null,
    next_action: null,
    next_action_date: null,
    blocker: null,
    portfolio_eligible: false,
    portfolio_permission_status: "Not Reviewed",
    notes: null,
    archived: false,
    archived_at: null,
    archived_by: null,
    created_by: "manager-1",
    updated_by: "manager-1",
    created_at: "2026-07-27T10:00:00Z",
    updated_at: "2026-07-27T10:00:00Z",
    ...overrides,
  };
}

function Harness() {
  const data = useAdminData();
  const ids = data.projects.map((project) => `${project.id}:${project.projectName}`);
  const createdProject = data.projects.find((project) => project.id === "created");

  async function create() {
    const result = await data.createProject({ project_name: "Created" });
    window.__lastMutationResult = result;
  }

  async function update() {
    const result = await data.updateProject("existing", {
      project_name: "Updated",
    });
    window.__lastMutationResult = result;
  }

  return (
    <div>
      <output aria-label="status">{data.dataStatus}</output>
      <output aria-label="projects">{ids.join("|")}</output>
      <output aria-label="created-portfolio">
        {createdProject
          ? `${createdProject.portfolioEligible}:${createdProject.portfolioPermissionStatus}`
          : ""}
      </output>
      <output aria-label="feedback-type">{data.saveFeedback?.type || ""}</output>
      <output aria-label="feedback-message">{data.saveFeedback?.message || ""}</output>
      <button type="button" onClick={create}>Create</button>
      <button type="button" onClick={update}>Update</button>
    </div>
  );
}

const DEMO_PROJECT_ID = "karen-residence-fountain-garden";

function DemoHarness() {
  const data = useAdminData();
  const project = data.projects.find((item) => item.id === DEMO_PROJECT_ID);

  return (
    <div>
      <output aria-label="demo-project">{JSON.stringify(project)}</output>
      <button
        type="button"
        onClick={() => data.updateProject(DEMO_PROJECT_ID, { next_action: null })}
      >
        Clear text
      </button>
      <button
        type="button"
        onClick={() =>
          data.updateProject(DEMO_PROJECT_ID, { start_date: "2026-08-01" })
        }
      >
        Set date
      </button>
      <button
        type="button"
        onClick={() => data.updateProject(DEMO_PROJECT_ID, { start_date: null })}
      >
        Clear date
      </button>
      <button
        type="button"
        onClick={() =>
          data.updateProject(DEMO_PROJECT_ID, { notes: "Updated demo notes" })
        }
      >
        Change notes
      </button>
      <button
        type="button"
        onClick={() =>
          data.updateProject(DEMO_PROJECT_ID, { project_name: "Renamed demo project" })
        }
      >
        Unrelated update
      </button>
      <button
        type="button"
        onClick={() => data.updateProject(DEMO_PROJECT_ID, { lead_person_id: null })}
      >
        Clear lead
      </button>
      <button
        type="button"
        onClick={() =>
          data.updateProject(DEMO_PROJECT_ID, { portfolio_eligible: false })
        }
      >
        Set boolean false
      </button>
    </div>
  );
}

function renderProvider() {
  return render(
    <AdminDataProvider
      session={{ access_token: "token" }}
      role="manager"
      profile={profile}
      isDemo={false}
    >
      <Harness />
    </AdminDataProvider>
  );
}

function renderDemoProvider() {
  return render(
    <AdminDataProvider
      session={null}
      role="owner"
      profile={null}
      isDemo
    >
      <DemoHarness />
    </AdminDataProvider>
  );
}

function demoProject() {
  return JSON.parse(screen.getByLabelText("demo-project").textContent);
}

async function waitForInitialLoad() {
  await waitFor(() => expect(screen.getByLabelText("status")).toHaveTextContent("ready"));
  expect(screen.getByLabelText("projects")).toHaveTextContent("existing:Existing");
}

describe("AdminDataProvider mutation reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.__lastMutationResult;
    api.fetchVisibleProfiles.mockResolvedValue([profile]);
    api.fetchProjects.mockResolvedValue([rawProject("existing", "Existing")]);
    api.fetchProjectActivities.mockResolvedValue([]);
  });

  it("inserts a returned create representation locally before refetch completes", async () => {
    let resolveRefresh;
    api.createProject.mockResolvedValue(rawProject("created", "Created"));
    api.fetchProjects
      .mockResolvedValueOnce([rawProject("existing", "Existing")])
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );
    renderProvider();
    await waitForInitialLoad();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(screen.getByLabelText("projects")).toHaveTextContent(
        "created:Created|existing:Existing"
      )
    );
    expect(window.__lastMutationResult).toBeUndefined();
    expect(screen.getByLabelText("created-portfolio")).toHaveTextContent(
      "false:Not Reviewed"
    );

    await act(async () => {
      resolveRefresh([
        rawProject("created", "Created"),
        rawProject("existing", "Existing"),
      ]);
    });
    await waitFor(() =>
      expect(window.__lastMutationResult).toEqual({ ok: true, id: "created" })
    );
  });

  it("replaces only the affected local project before refetch completes", async () => {
    let resolveRefresh;
    api.updateProject.mockResolvedValue(rawProject("existing", "Updated"));
    api.fetchProjects
      .mockResolvedValueOnce([rawProject("existing", "Existing"), rawProject("other", "Other")])
      .mockImplementationOnce(
        () => new Promise((resolve) => {
          resolveRefresh = resolve;
        })
      );
    renderProvider();
    await waitFor(() =>
      expect(screen.getByLabelText("projects")).toHaveTextContent(
        "existing:Existing|other:Other"
      )
    );

    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() =>
      expect(screen.getByLabelText("projects")).toHaveTextContent(
        "existing:Updated|other:Other"
      )
    );
    expect(window.__lastMutationResult).toBeUndefined();

    await act(async () => {
      resolveRefresh([rawProject("existing", "Updated"), rawProject("other", "Other")]);
    });
    await waitFor(() =>
      expect(window.__lastMutationResult).toEqual({ ok: true, id: "existing" })
    );
  });

  it("preserves existing and returned projects when reconciliation fails", async () => {
    api.createProject.mockResolvedValue(rawProject("created", "Created"));
    api.fetchProjects
      .mockResolvedValueOnce([rawProject("existing", "Existing")])
      .mockRejectedValueOnce(new Error("refresh unavailable"));
    renderProvider();
    await waitForInitialLoad();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(window.__lastMutationResult).toEqual({
        ok: true,
        id: "created",
        refreshWarning: true,
      })
    );

    expect(screen.getByLabelText("projects")).toHaveTextContent(
      "created:Created|existing:Existing"
    );
    expect(screen.getByLabelText("status")).toHaveTextContent("ready");
    expect(screen.getByLabelText("feedback-type")).toHaveTextContent("warning");
    expect(screen.getByLabelText("feedback-message")).toHaveTextContent(
      "The project was saved, but the latest project list could not be refreshed. Retry refresh."
    );
    expect(screen.getByLabelText("feedback-message")).not.toHaveTextContent(
      "Project created."
    );
  });

  it("returns ok false for a genuine write failure and preserves projects", async () => {
    api.updateProject.mockRejectedValue(new Error("write rejected"));
    renderProvider();
    await waitForInitialLoad();

    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() =>
      expect(window.__lastMutationResult).toEqual({
        ok: false,
        error: "write rejected",
      })
    );
    expect(screen.getByLabelText("projects")).toHaveTextContent("existing:Existing");
    expect(screen.getByLabelText("feedback-type")).toHaveTextContent("error");
    expect(api.fetchProjects).toHaveBeenCalledTimes(1);
  });

  // The Principal must never be told a project saved when no row was written.
  it("reports a failure, not success, when no authoritative row comes back", async () => {
    api.updateProject.mockResolvedValue(undefined);
    renderProvider();
    await waitForInitialLoad();

    fireEvent.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() =>
      expect(screen.getByLabelText("feedback-type")).toHaveTextContent("error")
    );
    expect(screen.getByLabelText("feedback-message")).toHaveTextContent(
      "The project was not updated. Refresh and try again."
    );
    expect(window.__lastMutationResult.ok).toBe(false);
    // The stale local name is left alone rather than being optimistically changed.
    expect(screen.getByLabelText("projects")).toHaveTextContent("existing:Existing");
  });

  it("returns ok false for a genuine create failure", async () => {
    api.createProject.mockRejectedValue(new Error("create rejected"));
    renderProvider();
    await waitForInitialLoad();

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    await waitFor(() =>
      expect(window.__lastMutationResult).toEqual({
        ok: false,
        error: "create rejected",
      })
    );
    expect(screen.getByLabelText("projects")).toHaveTextContent("existing:Existing");
    expect(api.fetchProjects).toHaveBeenCalledTimes(1);
  });

  it("keeps initial-load failure as a full error state when no data is usable", async () => {
    api.fetchProjects.mockRejectedValueOnce(new Error("initial load unavailable"));
    renderProvider();

    await waitFor(() =>
      expect(screen.getByLabelText("status")).toHaveTextContent("error")
    );
    expect(screen.getByLabelText("projects")).toHaveTextContent("");
  });
});

describe("AdminDataProvider demo PATCH fidelity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clears an optional text field when null is explicitly patched", async () => {
    renderDemoProvider();
    expect(demoProject().nextAction).not.toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Clear text" }));
    await waitFor(() => expect(demoProject().nextAction).toBe(""));
  });

  it("clears an optional date when null is explicitly patched", async () => {
    renderDemoProvider();
    fireEvent.click(screen.getByRole("button", { name: "Set date" }));
    await waitFor(() => expect(demoProject().startDate).toBe("2026-08-01"));

    fireEvent.click(screen.getByRole("button", { name: "Clear date" }));
    await waitFor(() => expect(demoProject().startDate).toBe(""));
  });

  it("persists changed notes", async () => {
    renderDemoProvider();
    fireEvent.click(screen.getByRole("button", { name: "Change notes" }));
    await waitFor(() => expect(demoProject().notes).toBe("Updated demo notes"));
  });

  it("preserves existing notes during an unrelated update", async () => {
    renderDemoProvider();
    const originalNotes = demoProject().notes;
    expect(originalNotes).not.toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Unrelated update" }));
    await waitFor(() =>
      expect(demoProject().projectName).toBe("Renamed demo project")
    );
    expect(demoProject().notes).toBe(originalNotes);
  });

  it("clears the accountable lead", async () => {
    renderDemoProvider();
    expect(demoProject().leadPersonId).toBe("demo-owner");

    fireEvent.click(screen.getByRole("button", { name: "Clear lead" }));
    await waitFor(() => expect(demoProject().leadPersonId).toBe(""));
  });

  it("applies boolean false rather than preserving the old value", async () => {
    renderDemoProvider();
    expect(demoProject().portfolioEligible).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "Set boolean false" }));
    await waitFor(() => expect(demoProject().portfolioEligible).toBe(false));
  });

  it("never calls a Supabase project mutation", async () => {
    renderDemoProvider();
    fireEvent.click(screen.getByRole("button", { name: "Change notes" }));
    await waitFor(() => expect(demoProject().notes).toBe("Updated demo notes"));

    expect(api.createProject).not.toHaveBeenCalled();
    expect(api.updateProject).not.toHaveBeenCalled();
  });
});
