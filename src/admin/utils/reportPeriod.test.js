import { describe, expect, it } from "vitest";
import {
  customRange,
  daysBetween,
  eatDate,
  eatDayOfWeek,
  formatReportTimestampDate,
  isCalendarDateWithinPeriod,
  isWithinPeriod,
  periodInstants,
  thisMonthRange,
  thisWeekRange,
} from "./reportPeriod";

describe("reporting periods on the Africa/Nairobi calendar", () => {
  it("resolves the Kenyan calendar date, not the viewer's", () => {
    // 22:30 UTC on 1 August is already 01:30 on 2 August in Kenya.
    expect(eatDate(Date.parse("2026-08-01T22:30:00Z"))).toBe("2026-08-02");
    // 21:00 UTC is still 2 August in Kenya only from 21:00 onwards.
    expect(eatDate(Date.parse("2026-08-01T20:59:59Z"))).toBe("2026-08-01");
  });

  it("runs the reporting week Monday to Sunday inclusive", () => {
    // 5 August 2026 is a Wednesday.
    expect(eatDayOfWeek("2026-08-05")).toBe(3);
    expect(thisWeekRange("2026-08-05")).toEqual({
      preset: "this_week",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
    });
    // A Sunday belongs to the week that began the previous Monday.
    expect(thisWeekRange("2026-08-09")).toEqual({
      preset: "this_week",
      startDate: "2026-08-03",
      endDate: "2026-08-09",
    });
  });

  it("runs the reporting month over the whole calendar month inclusive", () => {
    expect(thisMonthRange("2026-08-17")).toEqual({
      preset: "this_month",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
    // February in a leap year ends on the 29th.
    expect(thisMonthRange("2028-02-10").endDate).toBe("2028-02-29");
    // December rolls into the next year correctly.
    expect(thisMonthRange("2026-12-05").endDate).toBe("2026-12-31");
  });

  it("rejects an invalid or over-long custom range rather than silently clamping it", () => {
    expect(customRange("2026-08-10", "2026-08-01").error).toMatch(/cannot be before/i);
    expect(customRange("", "2026-08-01").error).toMatch(/choose a start date/i);
    expect(customRange("2026-02-30", "2026-03-01").error).toBeTruthy();
    expect(customRange("2020-01-01", "2026-01-01").error).toMatch(/longer than/i);
    expect(customRange("2026-08-01", "2026-08-31").range).toEqual({
      preset: "custom",
      startDate: "2026-08-01",
      endDate: "2026-08-31",
    });
  });

  it("builds inclusive EAT instant boundaries", () => {
    const bounds = periodInstants({ startDate: "2026-08-01", endDate: "2026-08-31" });
    expect(bounds.from).toBe("2026-08-01T00:00:00.000+03:00");
    expect(bounds.to).toBe("2026-08-31T23:59:59.999+03:00");
  });

  it("judges period membership on the Kenyan day, not the UTC day", () => {
    const august = { startDate: "2026-08-01", endDate: "2026-08-31" };
    // 21:30 UTC on 31 July is already 00:30 on 1 August in Kenya: inside.
    expect(isWithinPeriod("2026-07-31T21:30:00Z", august)).toBe(true);
    // 21:30 UTC on 31 August is 00:30 on 1 September in Kenya: outside.
    expect(isWithinPeriod("2026-08-31T21:30:00Z", august)).toBe(false);
    // 20:00 UTC on 31 August is 23:00 the same Kenyan day: inside.
    expect(isWithinPeriod("2026-08-31T20:00:00Z", august)).toBe(true);
  });

  it("judges a stored calendar date inclusively at both ends", () => {
    const week = { startDate: "2026-08-03", endDate: "2026-08-09" };
    expect(isCalendarDateWithinPeriod("2026-08-03", week)).toBe(true);
    expect(isCalendarDateWithinPeriod("2026-08-09", week)).toBe(true);
    expect(isCalendarDateWithinPeriod("2026-08-02", week)).toBe(false);
    expect(isCalendarDateWithinPeriod("2026-08-10", week)).toBe(false);
  });

  it("reports a timestamp under its Kenyan day, never its UTC day", () => {
    expect(formatReportTimestampDate("2026-08-01T22:30:00Z")).toMatch(/2 Aug 2026/);
    expect(formatReportTimestampDate("", "Not submitted")).toBe("Not submitted");
  });

  it("counts days between calendar dates", () => {
    expect(daysBetween("2026-08-01", "2026-08-31")).toBe(30);
  });
});
