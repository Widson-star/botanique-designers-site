import { act } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminApp from "./AdminApp";

const api = vi.hoisted(() => ({
  clearStoredSession: vi.fn(),
  fetchCurrentProfile: vi.fn(),
  getStoredSession: vi.fn(),
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  storeSession: vi.fn(),
}));

vi.mock("./lib/supabase", () => ({
  ...api,
  supabaseConfigured: true,
}));

vi.mock("./context/AdminDataContext", () => ({
  AdminDataProvider: ({ children }) => children,
}));

vi.mock("./context/AdminApprovalsContext", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/AdminIntakeProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/DailySiteOperationsProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/SiteCostsProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/FundRequestsProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/PeopleProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/MaintenanceProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./context/InventoryProvider", () => ({
  default: ({ children }) => children,
}));

vi.mock("./AdminLayout", () => ({
  default: ({ role, onSignOut }) => (
    <div>
      <p>Authenticated as {role}</p>
      <button type="button" onClick={onSignOut}>Sign out</button>
    </div>
  ),
}));

const futureExpiry = Math.floor(Date.now() / 1000) + 3600;
const ownerSession = {
  access_token: "owner-token",
  expires_at: futureExpiry,
  user: { id: "owner-1" },
};
const managerSession = {
  access_token: "manager-token",
  expires_at: futureExpiry,
  user: { id: "manager-1" },
};
const ownerProfile = {
  id: "owner-1",
  full_name: "Widson Omutelema Ambaisi",
  role: "owner",
  is_active: true,
};
const managerProfile = {
  id: "manager-1",
  full_name: "Martine Lotom",
  role: "manager",
  is_active: true,
};

function tree() {
  return (
    <MemoryRouter initialEntries={["/admin"]}>
      <AdminApp />
    </MemoryRouter>
  );
}

function renderAdmin() {
  return render(tree());
}

describe("AdminApp hydration-safe authentication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getStoredSession.mockReturnValue(null);
    api.signOut.mockResolvedValue(undefined);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it.each([
    ["no stored session", null],
    ["a stored owner session", ownerSession],
  ])("matches server markup on the first client render with %s", async (_label, storedSession) => {
    api.getStoredSession.mockReturnValue(storedSession);
    api.fetchCurrentProfile.mockResolvedValue(ownerProfile);
    const serverHtml = renderToString(tree());
    document.body.innerHTML = `<div id="root">${serverHtml}</div>`;
    const errors = [];
    let root;

    await act(async () => {
      root = hydrateRoot(document.getElementById("root"), tree(), {
        onRecoverableError(error) {
          errors.push(error);
        },
      });
    });

    expect(errors).toEqual([]);
    expect(serverHtml).toContain("Sign in");
    await act(async () => root.unmount());
  });

  it.each([
    ["owner", ownerSession, ownerProfile],
    ["manager", managerSession, managerProfile],
  ])("restores a stored %s session after mount and validates its profile", async (role, storedSession, profile) => {
    api.getStoredSession.mockReturnValue(storedSession);
    api.fetchCurrentProfile.mockResolvedValue(profile);

    renderAdmin();

    await waitFor(() =>
      expect(screen.getByText(`Authenticated as ${role}`)).toBeInTheDocument()
    );
    expect(api.fetchCurrentProfile).toHaveBeenCalledWith(
      storedSession.access_token,
      storedSession.user.id
    );
  });

  it("shows profile loading before authenticated content", async () => {
    let resolveProfile;
    api.getStoredSession.mockReturnValue(ownerSession);
    api.fetchCurrentProfile.mockImplementation(
      () => new Promise((resolve) => {
        resolveProfile = resolve;
      })
    );

    renderAdmin();
    await waitFor(() =>
      expect(screen.getByText("Loading admin profile...")).toBeInTheDocument()
    );
    expect(screen.queryByText(/Authenticated as/)).not.toBeInTheDocument();

    resolveProfile(ownerProfile);
    await waitFor(() =>
      expect(screen.getByText("Authenticated as owner")).toBeInTheDocument()
    );
  });

  it.each([
    ["missing", null, "No active Botanique admin profile was found"],
    ["inactive", { ...ownerProfile, is_active: false }, "profile is inactive"],
  ])("denies a %s profile", async (_label, profile, message) => {
    api.getStoredSession.mockReturnValue(ownerSession);
    api.fetchCurrentProfile.mockResolvedValue(profile);

    renderAdmin();

    await waitFor(() => expect(screen.getByText(new RegExp(message))).toBeInTheDocument());
    expect(screen.queryByText(/Authenticated as/)).not.toBeInTheDocument();
  });

  it("preserves password login and stores the returned session", async () => {
    api.signInWithPassword.mockResolvedValue(ownerSession);
    api.fetchCurrentProfile.mockResolvedValue(ownerProfile);
    renderAdmin();

    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "owner@example.test" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "secret-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));

    await waitFor(() =>
      expect(screen.getByText("Authenticated as owner")).toBeInTheDocument()
    );
    expect(api.signInWithPassword).toHaveBeenCalledWith({
      email: "owner@example.test",
      password: "secret-password",
    });
    expect(api.storeSession).toHaveBeenCalledWith(ownerSession);
  });

  it("preserves logout and returns to the signed-out screen", async () => {
    api.getStoredSession.mockReturnValue(ownerSession);
    api.fetchCurrentProfile.mockResolvedValue(ownerProfile);
    renderAdmin();
    await waitFor(() =>
      expect(screen.getByText("Authenticated as owner")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByRole("button", { name: "Sign out" }));

    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "Sign in" })).toBeInTheDocument()
    );
    expect(api.signOut).toHaveBeenCalledWith("owner-token");
    expect(api.clearStoredSession).toHaveBeenCalled();
  });
});
