import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStoredSession, isUsableStoredSession, updateProject } from "./supabase";

const storageKey = "botanique_admin_supabase_session";
const futureExpiry = Math.floor(Date.now() / 1000) + 3600;

function session(overrides = {}) {
  return {
    access_token: "access-token",
    expires_at: futureExpiry,
    user: { id: "user-1" },
    ...overrides,
  };
}

describe("stored admin session validation", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("accepts a structurally valid, unexpired session", () => {
    expect(isUsableStoredSession(session())).toBe(true);
  });

  it.each([
    ["malformed JSON", "{"],
    ["missing token", JSON.stringify(session({ access_token: "" }))],
    ["missing user", JSON.stringify(session({ user: null }))],
    [
      "expired session",
      JSON.stringify(session({ expires_at: Math.floor(Date.now() / 1000) - 1 })),
    ],
  ])("fails safely and clears a %s", (_label, storedValue) => {
    window.localStorage.setItem(storageKey, storedValue);
    expect(getStoredSession()).toBeNull();
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });
});

// A PATCH that matches no row is not a save. PostgREST answers 200 with an
// empty array when the id exists but row level security filters the row out, or
// when the row has gone. Reading rows[0] off that array yields undefined, and
// the caller previously went on to report "Changes saved." to the Principal.
describe("project update honesty", () => {
  let fetchMock;

  function respondWith(body, ok = true) {
    fetchMock = vi.fn(() => Promise.resolve({
      ok,
      status: ok ? 200 : 400,
      text: () => Promise.resolve(JSON.stringify(body)),
    }));
    vi.stubGlobal("fetch", fetchMock);
  }

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("returns the single authoritative row a real update produces", async () => {
    respondWith([{ id: "p1", project_name: "Karen Hills House 19" }]);
    await expect(updateProject("token", "p1", { project_name: "Karen Hills House 19" }))
      .resolves.toMatchObject({ id: "p1", project_name: "Karen Hills House 19" });
  });

  it("refuses to call a zero-row PATCH a successful save", async () => {
    respondWith([]);
    await expect(updateProject("token", "p1", { project_name: "Karen Hills House 19" }))
      .rejects.toThrow(/was not updated/i);
  });

  it("treats more than one returned row as an integrity error", async () => {
    respondWith([{ id: "p1" }, { id: "p2" }]);
    await expect(updateProject("token", "p1", { project_name: "x" }))
      .rejects.toThrow(/more than one project/i);
  });

  it("patches by the existing project id and never creates a project", async () => {
    respondWith([{ id: "p1", project_name: "Renamed" }]);
    await updateProject("token", "p1", { project_name: "Renamed" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("id=eq.p1");
    expect(init.method).toBe("PATCH");
    expect(JSON.parse(init.body)).toEqual({ project_name: "Renamed" });
  });
});
