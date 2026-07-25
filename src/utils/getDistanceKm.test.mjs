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

// Kenyan candidate with an UPPERCASE country code (must be accepted after normalise).
const KAREN_KE_UPPER = { lat: "-1.3196", lon: "36.7085", address: { country_code: "KE" } };
// country_code "ke" but coordinates OUTSIDE Kenya (mislabelled) — must be rejected.
const KE_CC_OUTSIDE = { lat: "10.0", lon: "50.0", address: { country_code: "ke" } };

// A foreign "Karen" (e.g. Karen, Texas / worldwide first result) — the historical bug.
const FOREIGN_KAREN = { lat: "32.1471", lon: "-96.9186", address: { country_code: "us" } };
const FOREIGN_NO_CC = { lat: "48.8566", lon: "2.3522" }; // Paris, no country_code
// In-Kenya coordinates but MISSING country evidence — must NOT be accepted: the
// bounding box is a guard, never a substitute for the returned country code.
const KENYAN_NO_CC = { lat: "-1.2921", lon: "36.8219" }; // Nairobi, no country_code
const KENYAN_NO_ADDRESS = { lat: "-1.2921", lon: "36.8219" }; // no `address` object at all
const KENYAN_EMPTY_CC = { lat: "-1.2921", lon: "36.8219", address: { country_code: "" } };

// ── Pure helper: isKenyanCandidate ──────────────────────────────────────────
test("isKenyanCandidate accepts a confidently Kenyan candidate (country_code ke, in-box)", () => {
  assert.equal(isKenyanCandidate(KAREN_NAIROBI), true);
  assert.equal(isKenyanCandidate(MOMBASA), true);
  assert.equal(isKenyanCandidate(ELDORET), true);
});

test("isKenyanCandidate accepts an uppercase KE country code after normalisation", () => {
  assert.equal(isKenyanCandidate(KAREN_KE_UPPER), true);
});

test("isKenyanCandidate rejects an explicit non-Kenyan country code", () => {
  assert.equal(isKenyanCandidate(FOREIGN_KAREN), false);
});

test("isKenyanCandidate rejects a foreign point even without a country code", () => {
  assert.equal(isKenyanCandidate(FOREIGN_NO_CC), false);
});

test("isKenyanCandidate rejects in-Kenya coordinates with NO country_code (box is not a fallback)", () => {
  assert.equal(isKenyanCandidate(KENYAN_NO_CC), false);
});

test("isKenyanCandidate rejects in-Kenya coordinates with NO address object", () => {
  assert.equal(isKenyanCandidate(KENYAN_NO_ADDRESS), false);
});

test("isKenyanCandidate rejects in-Kenya coordinates with an EMPTY country_code", () => {
  assert.equal(isKenyanCandidate(KENYAN_EMPTY_CC), false);
});

test("isKenyanCandidate rejects country_code ke when coordinates are OUTSIDE Kenya", () => {
  assert.equal(isKenyanCandidate(KE_CC_OUTSIDE), false);
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

test("selectKenyanCandidate returns null when ALL candidates lack Kenyan country evidence", () => {
  // In-Kenya coordinates but no/empty country code, plus a foreign result: none is
  // confidently Kenyan, so the caller takes the uncertain/manual path.
  assert.equal(selectKenyanCandidate([KENYAN_NO_CC, KENYAN_EMPTY_CC, FOREIGN_NO_CC]), null);
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

test("getDistanceKm builds a Kenya-restricted, Kenya-biased Nominatim request", async () => {
  let capturedUrl = "";
  await withFetch(
    async (url) => {
      capturedUrl = url;
      return okResponse([KAREN_NAIROBI]);
    },
    async () => {
      await getDistanceKm("Karen");
    }
  );
  assert.ok(capturedUrl.includes("format=json"), "should request JSON");
  assert.ok(capturedUrl.includes("addressdetails=1"), "should request address details");
  assert.ok(capturedUrl.includes("limit=5"), "should limit the result set");
  assert.ok(capturedUrl.includes("countrycodes=ke"), "should restrict to Kenya");
  // The free-text query is biased to Kenya (encoded ", Kenya").
  const decoded = decodeURIComponent(capturedUrl);
  assert.ok(/karen,\s*kenya/i.test(decoded), `query should be Kenya-biased, got: ${decoded}`);
});

test("getDistanceKm does not double-append Kenya when the visitor already said so", async () => {
  let capturedUrl = "";
  await withFetch(
    async (url) => {
      capturedUrl = url;
      return okResponse([KAREN_NAIROBI]);
    },
    async () => {
      await getDistanceKm("Karen, Kenya");
    }
  );
  const decoded = decodeURIComponent(capturedUrl);
  assert.ok(/karen,\s*kenya/i.test(decoded));
  assert.equal((decoded.match(/kenya/gi) || []).length, 1, "should not repeat 'Kenya'");
});

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
