// BD-REPORTS-01A — reporting-period control.
//
// This week, this month or a custom range, all resolved on the Africa/Nairobi
// calendar with inclusive start and end dates. The browser's timezone plays no
// part in any boundary; the control only collects the reader's choice, and
// utils/reportPeriod does the arithmetic.
import { useState } from "react";
import {
  customRange,
  describeRange,
  eatToday,
  thisMonthRange,
  thisWeekRange,
} from "../../utils/reportPeriod";

const PRESETS = [
  { key: "this_week", label: "This week" },
  { key: "this_month", label: "This month" },
  { key: "custom", label: "Custom range" },
];

export default function ReportPeriodControl({ range, onChange }) {
  const today = eatToday();
  const [customStart, setCustomStart] = useState(range?.startDate || today);
  const [customEnd, setCustomEnd] = useState(range?.endDate || today);
  const [rangeError, setRangeError] = useState("");

  function selectPreset(preset) {
    setRangeError("");
    if (preset === "this_week") {
      onChange(thisWeekRange(today));
      return;
    }
    if (preset === "this_month") {
      onChange(thisMonthRange(today));
      return;
    }
    onChange({ preset: "custom", startDate: customStart, endDate: customEnd });
  }

  function applyCustom(startDate, endDate) {
    setCustomStart(startDate);
    setCustomEnd(endDate);
    const result = customRange(startDate, endDate);
    if (result.error) {
      setRangeError(result.error);
      return;
    }
    setRangeError("");
    onChange(result.range);
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-botanique-charcoal">Reporting period</p>
        <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Reporting period">
          {PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              aria-pressed={range?.preset === preset.key}
              onClick={() => selectPreset(preset.key)}
              className={`min-h-11 rounded-full px-4 py-2 text-sm font-medium transition ${
                range?.preset === preset.key
                  ? "bg-botanique-green text-white"
                  : "border border-stone-200 bg-white text-gray-600 hover:bg-stone-50"
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {range?.preset === "custom" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-botanique-charcoal">
            From
            <input
              type="date"
              value={customStart}
              onChange={(event) => applyCustom(event.target.value, customEnd)}
              className="mt-1 block min-h-11 w-full rounded-md border border-stone-300 px-3 py-2.5 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-botanique-charcoal">
            To
            <input
              type="date"
              value={customEnd}
              onChange={(event) => applyCustom(customStart, event.target.value)}
              className="mt-1 block min-h-11 w-full rounded-md border border-stone-300 px-3 py-2.5 text-sm"
            />
          </label>
        </div>
      )}

      {rangeError && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900" role="alert">
          {rangeError}
        </p>
      )}

      <p className="text-xs text-gray-500">
        Showing {describeRange(range)} inclusive, on Kenyan dates.
      </p>
    </div>
  );
}
