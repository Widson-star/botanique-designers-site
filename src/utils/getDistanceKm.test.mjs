// Deterministic tests for the Kenya-constrained consultation distance resolver.
// Run with:  node --test src/utils/getDistanceKm.test.mjs
// Uses only Node's built-in test runner + assert (no new dependency). The pure
// selection/validation helpers are tested directly; getDistanceKm is tested with a
// stubbed global fetch so no live Nominatim access is required.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  isKenyanCandidate,
  selectKenyanCandidate,
  distanceFromNairobiKm,
  resolveDistanceFromResults,
  getDistanceKm,
  NAIROBI_CBD,
} from "./getDistanceKm.js";

// ── Fixtures ────────────────────────────────────────────────────────────────
const KAREN_NAIROBI = { lat: "-1.3196", lon: "36.7085", address: { country_code: "ke" } };
const WESTLANDS = { lat: "-1.2649", lon: "36.8027", address: { country_code: "ke" } };
const RUNDA = { lat: "-1.2167", lon: "36.8167", address: { country_code: "ke" } };
const KIAMBU_TOWN = { lat: "-1.1714", lon: "36.8356", address: { country_code: "ke" } };
const KITENGELA = { lat: "-1.4667", lon: "36.9667", address: { country_code: "ke" } };
const NYERI_TOWN = { lat: "-0.4169", lon: "36.9514", address: { country_code: "ke" } };
const NAKURU = { lat: "-0.3031", lon: "36.0800", address: { country_code: "ke" } };
const KISUMU = { lat: "-0.0917", lon: "34.7680", address: { country_code: "ke" } };
const ELDORET = { lat: "0.5143", lon: "35.2698", address: { country_code: "ke" } };
const MOMBASA = { lat: "-4.0435", lon: "39.6682", address: { country_code: "ke" } };

// A foreign "Karen" (e.g. Karen, Texas / worldwide first result) — the historical bug.
const FOREIGN_KAREN = { lat: "32.1471", lon: "-96.9186", address: { country_code: "us" } };
const FOREIGN_NO_CC = { lat: "48.8566", lon: "2.3522" }; // Paris, no country_code
const KENYAN_NO_CC = { lat: "-1.2921", lon: "36.8219" }; // Nairobi, no country_code

// ── Pure helper: isKenyanCandidate ──────────────────────────────────────────
test("isKenyanCandidate accepts a Kenyan candidate in-box", () => {
  assert.equal(isKenyanCandidate(KAREN_NAIROBI), true);
  assert.equal(isKenyanCandidate(MOMBASA), true);
  assert.equal(isKenyanCandidate(ELDORET), true);
});

test("isKenyanCandidate rejects an explicit non-Kenyan country code", () => {
  assert.equal(isKenyanCandidate(FOREIGN_KAREN), false);
});

test("isKenyanCandidate rejects a foreign point even without a country code (bounding box)", () => {
  assert.equal(isKenyanCandidate(FOREIGN_NO_CC), false);
});

test("isKenyanCandidate accepts an in-box point without a country code (fallback)", () => {
  assert.equal(isKenyanCandidate(KENYAN_NO_CC), true);
});

test("isKenyanCandidate rejects non-numeric / missing coordinates and bad input", () => {
  assert.equal(isKenyanCandidate({ lat: "abc", lon: "xyz", address: { country_code: "ke" } }), false);
  assert.equal(isKenyanCandidate({ address: { country_code: "ke" } }), false);
  assert.equal(isKenyanCandidate(null), false);
  assert.equal(isKenyanCandidate(undefined), false);
  assert.equal(isKenyanCandidate("Karen"), false);
});

// ── Pure helper: selectKenyanCandidate ──────────────────────────────────────
test("selectKenyanCandidate picks the first Kenyan result", () => {
  assert.equal(selectKenyanCandidate([KAREN_NAIROBI, WESTLANDS]), KAREN_NAIROBI);
});

test("selectKenyanCandidate skips a non-Kenyan first result and picks the Kenyan one", () => {
  assert.equal(selectKenyanCandidate([FOREIGN_KAREN, KAREN_NAIROBI]), KAREN_NAIROBI);
});

test("selectKenyanCandidate returns null for empty / all-foreign / non-array", () => {
  assert.equal(selectKenyanCandidate([]), null);
  assert.equal(selectKenyanCandidate([FOREIGN_KAREN, FOREIGN_NO_CC]), null);
  assert.equal(selectKenyanCandidate(null), null);
  assert.equal(selectKenyanCandidate({ not: "an array" }), null);
});

// ── Pure helper: distanceFromNairobiKm ──────────────────────────────────────
test("distanceFromNairobiKm is ~0 at Nairobi CBD and plausible elsewhere", () => {
  assert.equal(distanceFromNairobiKm(NAIROBI_CBD.lat, NAIROBI_CBD.lon), 0);
  const karen = distanceFromNairobiKm(Number(KAREN_NAIROBI.lat), Number(KAREN_NAIROBI.lon));
  assert.ok(karen >= 0 && karen < 40, `Karen distance should be small, got ${karen}`);
  const mombasa = distanceFromNairobiKm(Number(MOMBASA.lat), Number(MOMBASA.lon));
  assert.ok(mombasa > 400 && mombasa < 520, `Mombasa distance should be ~440km, got ${mombasa}`);
  // never NaN/negative/infinite
  assert.ok(Number.isFinite(karen) && karen >= 0);
});

// ── Pure resolver: resolveDistanceFromResults ───────────────────────────────
test("resolveDistanceFromResults returns ok for a Kenyan result", () => {
  const r = resolveDistanceFromResults([KAREN_NAIROBI]);
  assert.equal(r.status, "ok");
  assert.ok(Number.isFinite(r.km) && r.km >= 0);
});

test("resolveDistanceFromResults is uncertain for foreign / empty / malformed", () => {
  assert.deepEqual(resolveDistanceFromResults([FOREIGN_KAREN]), { status: "uncertain", km: null });
  assert.deepEqual(resolveDistanceFromResults([]), { status: "uncertain", km: null });
  assert.deepEqual(resolveDistanceFromResults(null), { status: "uncertain", km: null });
  assert.deepEqual(resolveDistanceFromResults("nonsense"), { status: "uncertain", km: null });
});

test("resolveDistanceFromResults prefers the Kenyan result when a foreign one is first", () => {
  const r = resolveDistanceFromResults([FOREIGN_KAREN, KAREN_NAIROBI]);
  assert.equal(r.status, "ok");
  assert.ok(r.km >= 0 && r.km < 40);
});

// ── getDistanceKm (async) with a stubbed fetch ──────────────────────────────
function withFetch(stub, fn) {
  const original = global.fetch;
  global.fetch = stub;
  return Promise.resolve(fn()).finally(() => {
    global.fetch = original;
  });
}
const okResponse = (json) => ({ ok: true, json: async () => json });

test("getDistanceKm returns uncertain for empty input and does NOT call fetch", async () => {
  let called = false;
  await withFetch(
    async () => {
      called = true;
      return okResponse([]);
    },
    async () => {
      assert.deepEqual(await getDistanceKm(""), { status: "uncertain", km: null });
      assert.deepEqual(await getDistanceKm("   "), { status: "uncertain", km: null });
      assert.deepEqual(await getDistanceKm(null), { status: "uncertain", km: null });
    }
  );
  assert.equal(called, false);
});

test("getDistanceKm resolves a valid Kenyan location", async () => {
  await withFetch(async () => okResponse([KAREN_NAIROBI]), async () => {
    const r = await getDistanceKm("Karen");
    assert.equal(r.status, "ok");
    assert.ok(Number.isFinite(r.km) && r.km >= 0 && r.km < 40);
  });
});

test("getDistanceKm rejects a foreign-only response as uncertain", async () => {
  await withFetch(async () => okResponse([FOREIGN_KAREN]), async () => {
    assert.deepEqual(await getDistanceKm("Karen"), { status: "uncertain", km: null });
  });
});

test("getDistanceKm picks the Kenyan result when a foreign one is returned first", async () => {
  await withFetch(async () => okResponse([FOREIGN_KAREN, NYERI_TOWN]), async () => {
    const r = await getDistanceKm("Nyeri");
    assert.equal(r.status, "ok");
    // Straight-line (haversine) Nairobi CBD → Nyeri Town is ~98 km; confirms the
    // Kenyan candidate (not the foreign first result) drove the distance.
    assert.ok(r.km > 60 && r.km < 140, `Nyeri straight-line ~98km, got ${r.km}`);
  });
});

test("getDistanceKm handles other Kenyan towns", async () => {
  const cases = [
    ["Westlands, Nairobi", WESTLANDS],
    ["Runda, Nairobi", RUNDA],
    ["Kiambu Town, Kiambu", KIAMBU_TOWN],
    ["Kitengela, Kajiado", KITENGELA],
    ["Nakuru", NAKURU],
    ["Kisumu", KISUMU],
    ["Eldoret", ELDORET],
    ["Mombasa", MOMBASA],
  ];
  for (const [q, fixture] of cases) {
    await withFetch(async () => okResponse([fixture]), async () => {
      const r = await getDistanceKm(q);
      assert.equal(r.status, "ok", `${q} should resolve`);
      assert.ok(Number.isFinite(r.km) && r.km >= 0, `${q} km must be finite/non-negative`);
    });
  }
});

test("getDistanceKm is uncertain on HTTP error, thrown fetch, and malformed JSON", async () => {
  await withFetch(async () => ({ ok: false, json: async () => [] }), async () => {
    assert.deepEqual(await getDistanceKm("Karen"), { status: "uncertain", km: null });
  });
  await withFetch(async () => { throw new Error("network down"); }, async () => {
    assert.deepEqual(await getDistanceKm("Karen"), { status: "uncertain", km: null });
  });
  await withFetch(async () => okResponse({ unexpected: "object" }), async () => {
    assert.deepEqual(await getDistanceKm("Karen"), { status: "uncertain", km: null });
  });
  await withFetch(async () => okResponse([{ lat: "not-a-number", lon: "nope", address: { country_code: "ke" } }]), async () => {
    assert.deepEqual(await getDistanceKm("Karen"), { status: "uncertain", km: null });
  });
});
