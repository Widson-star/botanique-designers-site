import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import { useStaffCompensation } from "../context/staffCompensation";

const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Nairobi" });
const blankValues = () => ({ personId: "", projectId: "", serviceDate: today(), compensationType: "compensation", description: "", amount: "" });
const valuesFor = (record) => ({
  personId: record?.personId || "", projectId: record?.projectId || "", serviceDate: record?.serviceDate || today(),
  compensationType: record?.compensationType || "compensation", description: record?.description || "",
  amount: record?.submittedAmount == null ? "" : String(record.submittedAmount),
});

export default function AdminStaffCompensationForm() {
  const { compensationId } = useParams();
  const navigate = useNavigate();
  const { role, currentUserId, projects } = useAdminData();
  const { people } = usePeople();
  const { compensations, createDraft, updateRecord, status } = useStaffCompensation();
  const record = compensationId ? compensations.find((item) => item.id === compensationId) : null;
  const editing = Boolean(compensationId);
  const allowed = role === "manager" && (!editing || (record?.requesterId === currentUserId && ["draft", "amendment_requested"].includes(record?.lifecycle)));
  const [values, setValues] = useState(blankValues);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (record) setValues(valuesFor(record));
  }, [record]);

  if (editing && status === "loading" && !record) return <p className="text-sm text-gray-600">Loading Staff Compensation…</p>;
  if (editing && !record) return <section><h1 className="text-xl font-semibold">Staff Compensation unavailable</h1><Link to="/admin/finance/staff-compensation" className="mt-3 inline-block text-sm font-semibold text-botanique-green">Back to Staff Compensation</Link></section>;
  if (!allowed) return <section className="rounded-xl border border-stone-200 bg-white p-5"><h1 className="text-xl font-semibold">This record cannot be edited here</h1><p className="mt-1 text-[13px] text-gray-600">Only the requester may create or amend a draft returned for correction.</p><Link to={editing ? `/admin/finance/staff-compensation/${compensationId}` : "/admin/finance/staff-compensation"} className="mt-3 inline-block text-sm font-semibold text-botanique-green">Back</Link></section>;

  function change(key, value) { setValues((current) => ({ ...current, [key]: value })); }
  async function submit(event) {
    event.preventDefault();
    if (working) return;
    if (!values.personId || !values.serviceDate || !values.description.trim() || !Number(values.amount)) { setError("Choose a person, date, purpose and amount."); return; }
    setWorking(true); setError("");
    const result = editing ? await updateRecord(record.id, record.version, values) : await createDraft(values);
    setWorking(false);
    if (!result.ok) { setError(result.stale ? "This compensation changed elsewhere. Return to the latest record and try again." : result.error); return; }
    const id = editing ? record.id : result.result?.id;
    navigate(id ? `/admin/finance/staff-compensation/${id}` : "/admin/finance/staff-compensation");
  }

  return <section className="mx-auto max-w-3xl space-y-4">
    <Link to={editing ? `/admin/finance/staff-compensation/${record.id}` : "/admin/finance/staff-compensation"} className="text-sm font-semibold text-botanique-green hover:underline">← Staff Compensation</Link>
    <header><p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-botanique-green">Finance</p><h1 className="mt-1 text-2xl font-semibold">{editing ? "Amend compensation" : "New compensation"}</h1><p className="mt-1 text-[13px] text-gray-600">Record the obligation against a person. Add a Project only when it genuinely provides context.</p></header>
    {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-[13px] text-red-800">{error}</p>}
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-stone-200 bg-white p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Person"><select value={values.personId} onChange={(e)=>change("personId",e.target.value)} className={input}><option value="">Choose person</option>{people.slice().sort((a,b)=>a.fullName.localeCompare(b.fullName)).map((person)=><option key={person.id} value={person.id}>{person.fullName}{person.isActive ? "" : " · former"}</option>)}</select></Field>
        <Field label="Project (optional)"><select value={values.projectId} onChange={(e)=>change("projectId",e.target.value)} className={input}><option value="">No Project context</option>{projects.slice().sort((a,b)=>a.projectName.localeCompare(b.projectName)).map((project)=><option key={project.id} value={project.id}>{project.projectName}{project.archived ? " · archived" : ""}</option>)}</select></Field>
        <Field label="Compensation date"><input type="date" max={today()} value={values.serviceDate} onChange={(e)=>change("serviceDate",e.target.value)} className={input}/></Field>
        <Field label="Type"><select value={values.compensationType} onChange={(e)=>change("compensationType",e.target.value)} className={input}><option value="compensation">Compensation</option><option value="allowance">Allowance</option><option value="bonus">Bonus</option><option value="other">Other</option></select></Field>
        <Field label="Amount (KES)"><input inputMode="decimal" type="number" min="0.01" step="0.01" value={values.amount} onChange={(e)=>change("amount",e.target.value)} className={input} placeholder="0.00"/></Field>
      </div>
      <Field label="Purpose / description"><textarea rows={4} maxLength={2000} value={values.description} onChange={(e)=>change("description",e.target.value)} className={input} placeholder="What is this compensation for?"/></Field>
      <div className="flex flex-wrap justify-end gap-2 border-t border-stone-100 pt-4"><Link to={editing ? `/admin/finance/staff-compensation/${record.id}` : "/admin/finance/staff-compensation"} className="inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-4 text-[13px] font-semibold">Cancel</Link><button disabled={working} className="min-h-10 rounded-lg bg-botanique-green px-4 text-[13px] font-semibold text-white disabled:opacity-50">{working ? "Saving…" : editing ? "Save amendment" : "Save draft"}</button></div>
    </form>
  </section>;
}

const input = "mt-1 block min-h-10 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-[13px] text-botanique-charcoal focus:border-botanique-green focus:outline-none";
function Field({ label, children }) { return <label className="block text-[12px] font-medium text-gray-600">{label}{children}</label>; }
