import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useSiteCosts } from "../context/siteCosts";
import { calculateSiteCostTotal } from "../utils/siteCostCapabilities";

const emptyLine = () => ({ description: "", rateType: "lump_sum", quantity: "1", unit: "item", unitRate: "" });
const money = (amount) => new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES", currencyDisplay: "code" }).format(amount || 0);

function sourcePrefill(entry) {
  if (!entry) return {};
  const agreed = entry.agreedLabourTotal;
  return {
    projectId: entry.projectId, serviceDate: entry.workDate, dailySiteEntryId: entry.id,
    recipientType: entry.crewReference ? "crew" : "other",
    recipientLabel: entry.crewReference || "Site crew",
    category: "labour", purpose: entry.workPlanned || "Daily site work",
    lines: agreed != null
      ? [{ description: "Agreed site labour", rateType: "lump_sum", quantity: "1", unit: "job", unitRate: String(agreed) }]
      : [{ description: "Planned site labour", rateType: "daily", quantity: String(entry.expectedWorkerCount || ""), unit: "worker", unitRate: String(entry.ratePerWorker || "") }],
  };
}

export default function AdminSiteCostForm() {
  const navigate = useNavigate();
  const { claimId } = useParams();
  const [searchParams] = useSearchParams();
  const sourceId = searchParams.get("dailySiteEntryId") || "";
  const { role } = useAdminData();
  const { entries } = useDailySiteOperations();
  const { claims, linesForClaim, authorisedProjects, createDraft, authoriseDirect, updateClaim, submitClaim } = useSiteCosts();
  const existing = claims.find((claim) => claim.id === claimId);
  const source = entries.find((entry) => entry.id === sourceId) || (existing?.dailySiteEntryId ? entries.find((entry) => entry.id === existing.dailySiteEntryId) : null);
  const initial = useMemo(() => existing ? {
    projectId: existing.projectId, serviceDate: existing.serviceDate, dailySiteEntryId: existing.dailySiteEntryId,
    recipientType: existing.recipientType, recipientLabel: existing.recipientLabel,
    category: existing.category, purpose: existing.purpose,
    lines: linesForClaim(existing.id).map((line) => ({ ...line, quantity: String(line.quantity), unitRate: String(line.unitRate) })),
  } : { projectId: "", serviceDate: new Date().toISOString().slice(0, 10), dailySiteEntryId: sourceId,
    recipientType: "crew", recipientLabel: "", category: "labour", purpose: "", lines: [emptyLine()], ...sourcePrefill(source) }, [existing, linesForClaim, source, sourceId]);
  const [draftValues, setDraftValues] = useState(null);
  const values = draftValues ?? initial;
  const setValues = (next) => setDraftValues((current) =>
    typeof next === "function" ? next(current ?? initial) : next
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const total = calculateSiteCostTotal(values.lines);

  const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));
  const setLine = (index, field, value) => setValues((current) => ({ ...current, lines: current.lines.map((line, lineIndex) => lineIndex === index ? { ...line, [field]: value } : line) }));
  const valid = values.projectId && values.serviceDate && values.recipientLabel.trim() && values.purpose.trim() && values.lines.length && values.lines.every((line) => line.description.trim() && line.unit.trim() && Number(line.quantity) > 0 && Number(line.unitRate) > 0);

  async function save(submit = false) {
    if (!valid || saving) return;
    setSaving(true); setError("");
    let result;
    if (role === "owner") result = await authoriseDirect(values);
    else if (existing) result = await updateClaim(existing.id, existing.version, values);
    else result = await createDraft(values);
    if (result.ok && submit && role !== "owner") result = await submitClaim(result.claim.id, result.claim.version);
    setSaving(false);
    if (result.ok) navigate(`/admin/site-costs/${result.claim.id}`);
    else setError(result.stale ? "This claim changed elsewhere. Refresh and review the latest version." : result.error);
  }

  return <section className="mx-auto max-w-5xl">
    <Link to={existing ? `/admin/site-costs/${existing.id}` : "/admin/site-costs"} className="text-sm font-medium text-botanique-green hover:underline">← Back to Site Costs</Link>
    <h1 className="mt-3 text-2xl font-semibold">{role === "owner" ? "Authorise site cost" : existing ? "Amend cost claim" : "New cost claim"}</h1>
    <p className="mt-1 text-sm text-gray-600">One recipient or crew and one category per claim. Amounts below are claims, not payments.</p>
    {source && <div className="mt-5 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
      <p className="font-semibold">Copied planning context — no liability was created automatically</p>
      <p className="mt-1">Work date {source.workDate} · source version {source.version} · {source.expectedWorkerCount || 0} planned workers · planned labour {money(source.plannedLabourCost)}</p>
      <p className="mt-1 text-xs">Review every claim field and line. Later Daily Site changes will not rewrite this claim snapshot.</p>
    </div>}
    {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
    <div className="mt-5 grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2">
      <label className="text-sm font-medium">Project<select disabled={Boolean(source || existing)} value={values.projectId} onChange={(e) => set("projectId", e.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5 disabled:bg-stone-100"><option value="">Select project</option>{authorisedProjects.map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}</select></label>
      <label className="text-sm font-medium">Service date<input type="date" value={values.serviceDate} onChange={(e) => set("serviceDate", e.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Recipient type<select value={values.recipientType} onChange={(e) => set("recipientType", e.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">{["crew","staff","supplier","contractor","service_provider","other"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-sm font-medium">Recipient or crew label<input value={values.recipientLabel} maxLength={160} onChange={(e) => set("recipientLabel", e.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Category<select value={values.category} onChange={(e) => set("category", e.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">{["labour","mason_subcontract","cart_transport","transport","materials","equipment_hire","supplier_cost","other"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
      <label className="text-sm font-medium sm:col-span-2">Purpose<textarea value={values.purpose} maxLength={2000} onChange={(e) => set("purpose", e.target.value)} rows={3} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" /></label>
    </div>
    <div className="mt-5 rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex items-center justify-between"><h2 className="font-semibold">Cost lines</h2><button type="button" onClick={() => set("lines", [...values.lines, emptyLine()])} className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-medium">Add line</button></div>
      <div className="mt-4 space-y-4">{values.lines.map((line, index) => <div key={index} className="grid gap-3 rounded-md bg-stone-50 p-4 sm:grid-cols-12">
        <label className="text-xs font-medium sm:col-span-4">Description<input value={line.description} onChange={(e) => setLine(index,"description",e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5" /></label>
        <label className="text-xs font-medium sm:col-span-2">Rate type<select value={line.rateType} onChange={(e) => setLine(index,"rateType",e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2.5">{["daily","task","lump_sum","piece_rate","transport_allowance","overtime","other"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
        <label className="text-xs font-medium sm:col-span-2">Quantity<input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(e) => setLine(index,"quantity",e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2.5" /></label>
        <label className="text-xs font-medium sm:col-span-2">Unit<input value={line.unit} onChange={(e) => setLine(index,"unit",e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2.5" /></label>
        <label className="text-xs font-medium sm:col-span-2">Unit rate (KES)<input type="number" min="0.01" step="0.01" value={line.unitRate} onChange={(e) => setLine(index,"unitRate",e.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-2 py-2.5" /></label>
        <div className="sm:col-span-12 flex items-center justify-between"><span className="text-sm font-semibold">{money(Number(line.quantity) * Number(line.unitRate))}</span>{values.lines.length > 1 && <button type="button" onClick={() => set("lines", values.lines.filter((_, i) => i !== index))} className="min-h-11 text-sm font-medium text-red-700">Remove line</button>}</div>
      </div>)}</div>
      <div className="mt-5 border-t border-stone-200 pt-4 text-right"><p className="text-sm text-gray-500">Derived claim total</p><p className="text-2xl font-semibold">{money(total)}</p></div>
    </div>
    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Link to="/admin/site-costs" className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium">Cancel</Link>
      {role === "manager" && <button type="button" disabled={!valid || saving} onClick={() => save(false)} className="min-h-11 rounded-md border border-botanique-green px-4 text-sm font-semibold text-botanique-green disabled:opacity-50">{saving ? "Saving…" : "Save draft"}</button>}
      <button type="button" disabled={!valid || saving} onClick={() => save(role === "manager")} className="min-h-11 rounded-md bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Working…" : role === "owner" ? "Authorise cost" : "Save and submit"}</button>
    </div>
  </section>;
}
