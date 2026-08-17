// Mobile-first Daily Site Entry form. Named Botanique staff and casual/site crew
// are deliberately separate financial identities: assigned staff are paid through
// Staff Pay; the priced workforce below is only casual/site crew labour.
import { useMemo, useState } from "react";
import { EVIDENCE_STATUSES, NO_WORK_REASONS, computeLabourCost, validateEntryPlan } from "../../utils/dailySiteCapabilities";
import { EVIDENCE_STATUS_LABELS, NO_WORK_REASON_LABELS, formatKes } from "../../utils/dailySiteFormatters";

const EMPTY = {
  disposition: "working", noWorkReason: "", reasonDetail: "", expectedWorkerCount: "",
  crewReference: "", pricingMode: "rate", ratePerWorker: "", agreedLabourTotal: "",
  workPlanned: "", fundsAvailable: "", additionalAmountRequested: "", notes: "", evidenceStatus: "none",
};

function fromEntry(entry) {
  if (!entry) return EMPTY;
  return {
    disposition: entry.disposition || "working", noWorkReason: entry.noWorkReason || "",
    reasonDetail: entry.reasonDetail || "", expectedWorkerCount: entry.expectedWorkerCount ?? "",
    crewReference: entry.crewReference || "", pricingMode: entry.agreedLabourTotal != null ? "agreed" : "rate",
    ratePerWorker: entry.ratePerWorker ?? "", agreedLabourTotal: entry.agreedLabourTotal ?? "",
    workPlanned: entry.workPlanned || "", fundsAvailable: entry.fundsAvailable ?? "",
    additionalAmountRequested: entry.additionalAmountRequested ?? "", notes: entry.notes || "",
    evidenceStatus: entry.evidenceStatus || "none",
  };
}

const fieldClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20";
const labelClass = "block text-sm font-medium text-botanique-charcoal";

function ChoiceButton({ active, children, onClick, id }) {
  return <button type="button" id={id} onClick={onClick} aria-pressed={active} className={`flex-1 rounded-lg border px-4 py-3 text-sm font-semibold transition ${active ? "border-botanique-green bg-[#edf2ef] text-botanique-green" : "border-stone-300 bg-white text-gray-600 hover:bg-stone-50"}`}>{children}</button>;
}

export default function DailySiteEntryForm({ entry, submitLabel = "Save draft", secondaryLabel, onSubmit, onSecondary, busy, projectName, workDateLabel }) {
  const [form, setForm] = useState(() => fromEntry(entry));
  const [touched, setTouched] = useState(false);
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const values = useMemo(() => ({
    disposition: form.disposition,
    noWorkReason: form.disposition === "no_work" ? form.noWorkReason : "",
    reasonDetail: form.reasonDetail,
    expectedWorkerCount: form.disposition === "working" ? form.expectedWorkerCount : "",
    crewReference: form.disposition === "working" ? form.crewReference : "",
    ratePerWorker: form.disposition === "working" && form.pricingMode === "rate" ? form.ratePerWorker : "",
    agreedLabourTotal: form.disposition === "working" && form.pricingMode === "agreed" ? form.agreedLabourTotal : "",
    workPlanned: form.disposition === "working" ? form.workPlanned : "",
    fundsAvailable: form.fundsAvailable,
    additionalAmountRequested: form.additionalAmountRequested,
    notes: form.notes,
    evidenceStatus: form.evidenceStatus,
  }), [form]);

  const errors = useMemo(() => validateEntryPlan(values), [values]);
  const plannedCost = useMemo(() => computeLabourCost(values), [values]);
  const hasErrors = Object.keys(errors).length > 0;

  function handleSubmit(event) {
    event.preventDefault(); setTouched(true); if (hasErrors) return; onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {(projectName || workDateLabel) && <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm">{projectName && <p className="font-semibold text-botanique-charcoal">{projectName}</p>}{workDateLabel && <p className="text-gray-600">{workDateLabel}</p>}</div>}

      <fieldset><legend className={labelClass}>Is work happening today?</legend><div className="mt-2 flex gap-3"><ChoiceButton active={form.disposition === "working"} onClick={() => set("disposition", "working")}>Working today</ChoiceButton><ChoiceButton active={form.disposition === "no_work"} onClick={() => set("disposition", "no_work")}>No work today</ChoiceButton></div></fieldset>

      {form.disposition === "working" ? <>
        <div>
          <label className={labelClass} htmlFor="dse-workers">Casual / site crew</label>
          <input id="dse-workers" type="number" inputMode="numeric" min="1" step="1" value={form.expectedWorkerCount} onChange={(event) => set("expectedWorkerCount", event.target.value)} className={fieldClass}/>
          <p className="mt-1.5 text-xs leading-5 text-gray-500">Enter only casual or unnamed site workers. Do not include named Botanique staff assigned to the site; their pay belongs in Staff Pay.</p>
          {touched && errors.expectedWorkerCount && <p className="mt-1 text-sm text-red-700">{errors.expectedWorkerCount}</p>}
        </div>

        <fieldset><legend className={labelClass}>How is casual / site crew labour priced?</legend><div className="mt-2 flex gap-3"><ChoiceButton active={form.pricingMode === "rate"} onClick={() => set("pricingMode", "rate")}>Rate per worker</ChoiceButton><ChoiceButton active={form.pricingMode === "agreed"} onClick={() => set("pricingMode", "agreed")}>Agreed crew total</ChoiceButton></div></fieldset>

        {form.pricingMode === "rate" ? <div><label className={labelClass} htmlFor="dse-rate">Rate per casual worker (KES)</label><input id="dse-rate" type="number" inputMode="decimal" min="0" value={form.ratePerWorker} onChange={(event) => set("ratePerWorker", event.target.value)} className={fieldClass}/></div> : <div><label className={labelClass} htmlFor="dse-agreed">Agreed casual / site crew total (KES)</label><input id="dse-agreed" type="number" inputMode="decimal" min="0" value={form.agreedLabourTotal} onChange={(event) => set("agreedLabourTotal", event.target.value)} className={fieldClass}/></div>}

        <div className="rounded-lg border border-botanique-green/30 bg-[#edf2ef] px-4 py-3"><p className="text-sm text-gray-600">Estimated casual / site crew cost</p><p className="text-xl font-semibold text-botanique-green" aria-live="polite">{formatKes(plannedCost)}</p></div>

        <div><label className={labelClass} htmlFor="dse-work">Planned site activities</label><textarea id="dse-work" rows={3} value={form.workPlanned} onChange={(event) => set("workPlanned", event.target.value)} className={fieldClass}/>{touched && errors.workPlanned && <p className="mt-1 text-sm text-red-700">{errors.workPlanned}</p>}</div>
        <div><label className={labelClass} htmlFor="dse-crew">Casual / site crew reference (optional)</label><input id="dse-crew" type="text" value={form.crewReference} onChange={(event) => set("crewReference", event.target.value)} className={fieldClass}/></div>
      </> : <>
        <div><label className={labelClass} htmlFor="dse-reason">Reason there is no work</label><select id="dse-reason" value={form.noWorkReason} onChange={(event) => set("noWorkReason", event.target.value)} className={fieldClass}><option value="">Choose a reason…</option>{NO_WORK_REASONS.map((reason) => <option key={reason} value={reason}>{NO_WORK_REASON_LABELS[reason]}</option>)}</select>{touched && errors.noWorkReason && <p className="mt-1 text-sm text-red-700">{errors.noWorkReason}</p>}</div>
        {form.noWorkReason === "other" && <div><label className={labelClass} htmlFor="dse-reason-detail">Explanation</label><input id="dse-reason-detail" type="text" value={form.reasonDetail} onChange={(event) => set("reasonDetail", event.target.value)} className={fieldClass}/>{touched && errors.reasonDetail && <p className="mt-1 text-sm text-red-700">{errors.reasonDetail}</p>}</div>}
      </>}

      {errors.labour && touched && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{errors.labour}</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className={labelClass} htmlFor="dse-funds">Site funds currently available (KES)</label><input id="dse-funds" type="number" inputMode="decimal" min="0" value={form.fundsAvailable} onChange={(event) => set("fundsAvailable", event.target.value)} className={fieldClass}/>{touched && errors.fundsAvailable && <p className="mt-1 text-sm text-red-700">{errors.fundsAvailable}</p>}</div><div><label className={labelClass} htmlFor="dse-additional">Additional site funds required (KES)</label><input id="dse-additional" type="number" inputMode="decimal" min="0" value={form.additionalAmountRequested} onChange={(event) => set("additionalAmountRequested", event.target.value)} className={fieldClass}/>{touched && errors.additionalAmountRequested && <p className="mt-1 text-sm text-red-700">{errors.additionalAmountRequested}</p>}</div></div>
      <p className="text-xs text-gray-500">Funds figures are a planning note only — they do not move money or create a payment.</p>

      <div><label className={labelClass} htmlFor="dse-notes">Notes (optional)</label><textarea id="dse-notes" rows={2} value={form.notes} onChange={(event) => set("notes", event.target.value)} className={fieldClass}/></div>
      <div><label className={labelClass} htmlFor="dse-evidence">Supporting evidence</label><select id="dse-evidence" value={form.evidenceStatus} onChange={(event) => set("evidenceStatus", event.target.value)} className={fieldClass}>{EVIDENCE_STATUSES.map((status) => <option key={status} value={status}>{EVIDENCE_STATUS_LABELS[status]}</option>)}</select></div>

      <div className="flex flex-col gap-3 sm:flex-row-reverse"><button type="submit" disabled={busy} className="w-full rounded-lg bg-botanique-green px-4 py-3 text-base font-semibold text-white transition hover:bg-botanique-dark disabled:opacity-60 sm:w-auto">{busy ? "Working…" : submitLabel}</button>{secondaryLabel && <button type="button" onClick={() => { setTouched(true); if (!hasErrors) onSecondary(values); }} disabled={busy} className="w-full rounded-lg border border-stone-300 px-4 py-3 text-base font-semibold text-botanique-charcoal transition hover:bg-stone-50 disabled:opacity-60 sm:w-auto">{secondaryLabel}</button>}</div>
    </form>
  );
}
