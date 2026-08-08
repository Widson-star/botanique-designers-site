import { describe, expect, it } from "vitest";
import { dashboardGreeting, eatHour, timeOfDayGreeting } from "./greeting";

// EAT is UTC+03:00 fixed, no daylight saving (see reportPeriod.js). An instant
// stamped hh:00 UTC is therefore (hh+3)%24 in Nairobi.
function utcInstant(hour, minute = 0) {
  return Date.UTC(2026, 0, 15, hour, minute);
}

describe("eatHour", () => {
  it("shifts a UTC instant three hours forward", () => {
    expect(eatHour(utcInstant(0))).toBe(3);
    expect(eatHour(utcInstant(21))).toBe(0); // rolls into the next EAT day
  });

  it("returns null for an unusable instant", () => {
    expect(eatHour(NaN)).toBeNull();
    expect(eatHour("not a date")).toBeNull();
  });
});

describe("timeOfDayGreeting", () => {
  it("is Good morning from 05:00 up to (not including) 12:00", () => {
    expect(timeOfDayGreeting(5)).toBe("Good morning");
    expect(timeOfDayGreeting(11)).toBe("Good morning");
  });

  it("is Good afternoon from 12:00 up to (not including) 17:00", () => {
    expect(timeOfDayGreeting(12)).toBe("Good afternoon");
    expect(timeOfDayGreeting(16)).toBe("Good afternoon");
  });

  it("is Good evening from 17:00 through 04:59", () => {
    expect(timeOfDayGreeting(17)).toBe("Good evening");
    expect(timeOfDayGreeting(23)).toBe("Good evening");
    expect(timeOfDayGreeting(0)).toBe("Good evening");
    expect(timeOfDayGreeting(4)).toBe("Good evening");
  });

  it("degrades to a plain greeting when the hour is unusable", () => {
    expect(timeOfDayGreeting(null)).toBe("Hello");
    expect(timeOfDayGreeting(NaN)).toBe("Hello");
  });
});

describe("dashboardGreeting", () => {
  it("combines the EAT time-of-day phrase with the first name", () => {
    // 06:00 UTC = 09:00 EAT = morning.
    expect(dashboardGreeting("Widson", utcInstant(6))).toBe("Good morning, Widson");
    // 11:00 UTC = 14:00 EAT = afternoon.
    expect(dashboardGreeting("Martine", utcInstant(11))).toBe("Good afternoon, Martine");
    // 15:00 UTC = 18:00 EAT = evening.
    expect(dashboardGreeting("Widson", utcInstant(15))).toBe("Good evening, Widson");
  });

  it("falls back to the plain phrase when no first name can be resolved", () => {
    expect(dashboardGreeting("", utcInstant(6))).toBe("Good morning");
  });
});
