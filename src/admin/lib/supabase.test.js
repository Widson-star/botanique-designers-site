import { beforeEach, describe, expect, it } from "vitest";
import { getStoredSession, isUsableStoredSession } from "./supabase";

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
