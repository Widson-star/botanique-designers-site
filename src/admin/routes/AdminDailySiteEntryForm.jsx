import { useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useDailySiteOperations } from "../context/dailySiteOperations";
import { useMaintenance } from "../context/maintenance";
import { todayIso, formatWorkDate } from "../utils/dailySiteFormatters";
import { canRecordDailySiteEntry, canEditDailyDraft } from "../utils/dailySiteCapabilities";
import DailySiteEntryForm from "../components/dailysite/DailySiteEntryForm";

const fieldClass = "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-3 text-base focus:border-botanique-green focus:outline-none focus:ring-2 focus:ring-botanique-green/20";

export default function AdminDailySiteEntryForm({ mode = "create" }) {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const { role, currentUserId } = useAdminData();
  const { entries, authorisedSites, createDraft, updateDraft, submitEntry } = useDailySiteOperations();
  const { register: maintenanceRegister, assignments: maintenanceAssignments } = useMaintenance();

  const editing = mode === "edit";
  const existing = editing ? entries.find((entry) => entry.id === params.entryId) : null;
  // A field record belongs to a SITE. Sites qualify through Ongoing Project work
  // or an active Maintenance relationship, so maintenance-only properties appear
  // here with no related Project.
  const selectableSites = useMemo(
    () => [...(authorisedSites || [])].sort((a, b) => a.siteName.localeCompare(b.siteName)),
    [authorisedSites],
  );
  // Never silently adopt the first Site: authorised Sites load asynchronously,
  // so a positional default can leave an empty siteId behind a populated-looking
  // selector. A manual record requires a deliberate choice.
  const [siteId, setSiteId] = useState(() => searchParams.get("site") || existing?.siteId || "");
  const [projectId, setProjectId] = useState(() => searchParams.get("project") || existing?.projectId || "");
  const selectedSite = selectableSites.find((site) => site.id === siteId) || null;
  // Fixed context when opened from a Maintenance visit — never an editable
  // free-form selector in this flow.
  const maintenanceVisitId = searchParams.get("maintenanceVisit") || existing?.maintenanceVisitId || "";
  const [workDate, setWorkDate] = useState(() => existing?.workDate || todayIso());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!canRecordDailySiteEntry(role)) return <div className="rounded-lg border border-stone-200 bg-white p-8"><h1 className="text-xl font-bold">Not available</h1><p className="mt-2 text-sm text-gray-500">This role cannot record site entries.</p></div>;
  if (editing && existing && !canEditDailyDraft(role, existing, currentUserId)) return <div className="rounded-lg border border-stone-200 bg-white p-8"><h1 className="text-xl font-bold">This entry can no longer be edited here</h1><p className="mt-2 text-sm text-gray-500">Only a draft can be edited by its author.</p><Link to={`/admin/daily-site-operations/${existing.id}`} className="mt-4 inline-block text-sm font-semibold text-botanique-green hover:underline">View the entry</Link></div>;
  if (editing && !existing) return <div className="rounded-lg border border-stone-200 bg-white p-8"><p className="text-sm text-gray-500">This entry is not available.</p><Link to="/admin/daily-site-operations" className="mt-4 inline-block text-sm font-semibold text-botanique-green hover:underline">Back to Daily Site Record</Link></div>;
  if (!editing && selectableSites.length === 0) return <div className="mx-auto max-w-2xl"><Link to="/admin/daily-site-operations" className="text-sm text-gray-500 hover:text-botanique-green">← Daily Site Record</Link><div className="mt-4 rounded-lg border border-stone-200 bg-white p-8"><h1 className="text-xl font-bold">No sites assigned to you yet</h1><p className="mt-2 text-sm leading-6 text-gray-600">You are not yet the lead of, or assigned to, any site with live work, so there is nothing to record against. Ask the Principal to assign you to the sites you manage.</p></div></div>;

  const effectiveProjectId = existing?.projectId || projectId;
  const effectiveWorkDate = existing?.workDate || workDate;
  const effectiveSiteId = existing?.siteId || siteId;
  const projectName = selectedSite?.projects.find((project) => project.id === effectiveProjectId)?.projectName
    || selectedSite?.siteName;
  const maintenance = maintenanceRegister.find((item) => item.siteId === effectiveSiteId && item.status === "active");
  const assignedStaff = maintenance ? maintenanceAssignments.filter((assignment) =>
    assignment.relationshipId === maintenance.id &&
    assignment.startDate <= effectiveWorkDate &&
    (!assignment.endDate || assignment.endDate >= effectiveWorkDate)
  ) : [];

  async function persist(values, thenSubmit) {
    // Guard the deliberate-Site rule before any write.
    if (!editing && !siteId) { setError("Choose the Site / property this record belongs to."); return; }
    setBusy(true); setError("");
    try {
      let result;
      if (editing) {
        result = await updateDraft(existing.id, values);
        if (result.ok && thenSubmit) result = await submitEntry(existing.id);
      } else {
        result = await createDraft({ ...values, siteId, projectId, maintenanceVisitId, workDate });
        if (result.ok && thenSubmit) {
          const newId = result.entry?.id;
          if (newId) result = await submitEntry(newId);
        }
      }
      if (!result.ok) { setError(result.error || "The entry could not be saved."); return; }
      const targetId = editing ? existing.id : result.entry?.id;
      navigate(targetId ? `/admin/daily-site-operations/${targetId}` : "/admin/daily-site-operations");
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div><Link to="/admin/daily-site-operations" className="text-sm text-gray-500 hover:text-botanique-green">← Daily Site Record</Link><h1 className="mt-2 text-2xl font-semibold">{editing ? "Edit site entry" : "New site entry"}</h1></div>
      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}

      {!editing && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><div><label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-site">Site / property</label><select id="dse-site" value={siteId} onChange={(event)=>{setSiteId(event.target.value); setProjectId("");}} className={fieldClass}><option value="">Choose Site / property</option>{selectableSites.map((site)=><option key={site.id} value={site.id}>{site.siteName}</option>)}</select></div><div><label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-date">Work date</label><input id="dse-date" type="date" value={workDate} onChange={(event)=>setWorkDate(event.target.value)} className={fieldClass}/></div>{selectedSite && selectedSite.projects.length > 0 && <div className="sm:col-span-2"><label className="block text-sm font-medium text-botanique-charcoal" htmlFor="dse-project">{selectedSite.hasActiveMaintenance ? "Botanique Project (optional)" : "Botanique Project"}</label><select id="dse-project" value={projectId} onChange={(event)=>setProjectId(event.target.value)} className={fieldClass}>{selectedSite.hasActiveMaintenance && <option value="">None — maintenance only</option>}{selectedSite.projects.map((project)=><option key={project.id} value={project.id}>{project.projectName}</option>)}</select></div>}</div>}
      {editing && <div className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-gray-600">Editing the draft for <span className="font-medium text-botanique-charcoal">{projectName}</span> on {formatWorkDate(existing.workDate)}.</div>}

      {assignedStaff.length > 0 && <section className="rounded-lg border border-stone-200 bg-white px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Assigned Botanique staff</p><div className="mt-2 space-y-1">{assignedStaff.map((assignment)=><div key={assignment.id} className="flex items-center justify-between gap-3 text-sm"><span className="font-semibold text-botanique-charcoal">{assignment.personName || "Staff member"}</span><span className="text-gray-500">{String(assignment.role || "assigned staff").replaceAll("_", " ")}</span></div>)}</div><p className="mt-2 border-t border-stone-100 pt-2 text-xs leading-5 text-gray-500">These people are named staff and are paid through Staff Pay. Do not count them again in the casual / site crew fields below.</p></section>}

      <DailySiteEntryForm entry={existing} projectName={!editing ? projectName : undefined} workDateLabel={!editing && workDate ? formatWorkDate(workDate) : undefined} submitLabel="Submit entry" secondaryLabel="Save draft" busy={busy} onSubmit={(values)=>persist(values,true)} onSecondary={(values)=>persist(values,false)}/>
    </div>
  );
}
