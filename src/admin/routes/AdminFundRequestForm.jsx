import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { useFundRequests } from "../context/fundRequests";
import {
  availableAfterRequest,
  calculateFundRequestTotal,
  canDirectAuthoriseFundRequest,
} from "../utils/fundRequestCapabilities";
import { profilePresentationName } from "../utils/personName";

const ADVANCE_CUSTODY = "operations_manager_accountable_advance";
const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code",
}).format(amount || 0);

export default function AdminFundRequestForm() {
  const navigate = useNavigate();
  const { requestId } = useParams();
  const { role, profiles } = useAdminData();
  const {
    requests, allocationsForRequest, authorisedProjects, loadAvailability,
    createDraft, authoriseDirect, updateRequest, submitRequest,
  } = useFundRequests();
  const isPrincipal = canDirectAuthoriseFundRequest(role);
  const existing = requests.find((request) => request.id === requestId);
  const legacyNonAdvance = existing && existing.intendedCustodyType !== ADVANCE_CUSTODY;

  const initial = useMemo(() => existing ? {
    projectId: existing.projectId,
    custodianProfileId: existing.custodianProfileId,
    purpose: existing.purpose,
    selected: Object.fromEntries(allocationsForRequest(existing.id)
      .map((allocation) => [allocation.claimId, String(allocation.requestedAmount)])),
  } : {
    projectId: "", custodianProfileId: "", purpose: "", selected: {},
  }, [existing, allocationsForRequest]);

  const [draftValues, setDraftValues] = useState(null);
  const values = draftValues ?? initial;
  const setValues = (next) => setDraftValues((current) =>
    typeof next === "function" ? next(current ?? initial) : next);
  const set = (field, value) => setValues((current) => ({ ...current, [field]: value }));

  const [availability, setAvailability] = useState([]);
  const [availabilityError, setAvailabilityError] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState("");

  const managers = useMemo(() => profiles.filter((profile) => profile.role === "manager"), [profiles]);

  const refreshAvailability = useCallback(async (projectId) => {
    try {
      const rows = await (projectId
        ? loadAvailability(projectId, existing?.id || null)
        : Promise.resolve([]));
      setAvailability(rows);
      setAvailabilityError("");
    } catch (nextError) {
      setAvailability([]);
      setAvailabilityError(nextError.message || "Unable to load approved Project Costs.");
    }
  }, [existing, loadAvailability]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshAvailability(values.projectId);
      if (cancelled) return;
    })();
    return () => { cancelled = true; };
  }, [refreshAvailability, values.projectId]);

  const allocations = useMemo(() => Object.entries(values.selected)
    .filter(([, amount]) => String(amount).trim() !== "")
    .map(([claimId, amount]) => {
      const claim = availability.find((entry) => entry.claimId === claimId);
      return { claimId, requestedAmount: amount, ...claim };
    }), [availability, values.selected]);

  const total = calculateFundRequestTotal(allocations);
  const overRequested = allocations.filter((allocation) =>
    availableAfterRequest(allocation, allocation.requestedAmount) < 0);
  const valid = Boolean(values.projectId) && values.purpose.trim() &&
    values.custodianProfileId && allocations.length > 0 &&
    allocations.every((allocation) => Number(allocation.requestedAmount) > 0) &&
    overRequested.length === 0;

  const toggleCost = (claimId, checked) => setValues((current) => {
    const selected = { ...current.selected };
    if (checked) selected[claimId] = selected[claimId] ?? "";
    else delete selected[claimId];
    return { ...current, selected };
  });

  const setAmount = (claimId, amount) => setValues((current) => ({
    ...current, selected: { ...current.selected, [claimId]: amount },
  }));

  async function save(submit = false) {
    if (!valid || saving || legacyNonAdvance) return;
    setSaving(true);
    setError("");
    setConflict("");
    const payload = {
      ...values,
      intendedCustodyType: ADVANCE_CUSTODY,
      allocations,
    };
    let result;
    if (isPrincipal) result = await authoriseDirect(payload);
    else if (existing) result = await updateRequest(existing.id, existing.version, payload);
    else result = await createDraft(payload);
    if (result.ok && submit && !isPrincipal) {
      result = await submitRequest(result.request.id, result.request.version);
    }
    setSaving(false);
    if (result.ok) {
      navigate(`/admin/fund-requests/${result.request.id}`);
      return;
    }
    await refreshAvailability(values.projectId);
    if (result.conflict) setConflict(result.error);
    else setError(result.stale ? "This advance changed elsewhere. Refresh and review the latest version." : result.error);
  }

  if (legacyNonAdvance) {
    return (
      <section className="mx-auto max-w-3xl space-y-4">
        <Link to={`/admin/fund-requests/${existing.id}`} className="text-sm font-medium text-botanique-green hover:underline">← Back</Link>
        <div className="rounded-xl border border-stone-200 bg-white p-5">
          <h1 className="text-xl font-semibold">This older record is not an Advance</h1>
          <p className="mt-2 text-sm text-gray-600">
            It used the previous direct-payment authority flow. It remains preserved, but the Advances form will not rewrite it into a different business record.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <Link to={existing ? `/admin/fund-requests/${existing.id}` : "/admin/fund-requests"} className="text-sm font-medium text-botanique-green hover:underline">← Advances</Link>
      <h1 className="mt-3 text-2xl font-semibold">
        {isPrincipal ? "New advance" : existing ? "Amend advance request" : "Request advance"}
      </h1>
      <p className="mt-1 text-sm text-gray-600">
        Use an Advance only when money needs to be given to an accountable person before the underlying project costs are paid.
      </p>

      {!isPrincipal && !existing && (
        <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Saving a draft does not reserve any approved Project Cost value. Reservation begins only after submission.
        </div>
      )}
      {conflict && <p className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">{conflict} Availability has been refreshed and nothing was saved.</p>}
      {error && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {availabilityError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{availabilityError}</p>}

      <div className="mt-5 grid gap-5 rounded-lg border border-stone-200 bg-white p-5 sm:grid-cols-2">
        <label className="text-sm font-medium">Project
          <select
            disabled={Boolean(existing)}
            value={values.projectId}
            onChange={(event) => {
              set("projectId", event.target.value);
              setValues((current) => ({ ...current, selected: {} }));
            }}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5 disabled:bg-stone-100"
          >
            <option value="">Select project</option>
            {authorisedProjects.map((project) => <option key={project.id} value={project.id}>{project.projectName}</option>)}
          </select>
        </label>

        <label className="text-sm font-medium">Accountable person
          <select value={values.custodianProfileId} onChange={(event) => set("custodianProfileId", event.target.value)} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5">
            <option value="">Select Operations Manager</option>
            {managers.map((profile) => <option key={profile.id} value={profile.id}>{profilePresentationName(profile)}</option>)}
          </select>
        </label>

        <label className="text-sm font-medium sm:col-span-2">Purpose or note
          <textarea value={values.purpose} maxLength={2000} onChange={(event) => set("purpose", event.target.value)} rows={3} className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5" />
        </label>
      </div>

      <div className="mt-5 rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">Approved Project Costs</h2>
        <p className="mt-1 text-sm text-gray-600">Choose the approved costs this advance is intended to cover.</p>
        {!values.projectId && <p className="mt-3 text-sm text-gray-600">Select a project to see its approved costs.</p>}
        {values.projectId && !availability.length && <p className="mt-3 text-sm text-gray-600">This project has no approved costs available for an advance.</p>}

        <div className="mt-4 space-y-4">
          {availability.map((cost) => {
            const checked = Object.prototype.hasOwnProperty.call(values.selected, cost.claimId);
            const requested = values.selected[cost.claimId] ?? "";
            const after = availableAfterRequest(cost, requested);
            return (
              <div key={cost.claimId} className="rounded-md bg-stone-50 p-4">
                <label className="flex items-start gap-3 text-sm">
                  <input type="checkbox" checked={checked} onChange={(event) => toggleCost(cost.claimId, event.target.checked)} className="mt-1 h-4 w-4" />
                  <span>
                    <span className="font-medium">{cost.recipientLabel}</span>
                    <span className="block text-xs text-gray-500">{cost.claimReference} · {cost.category.replaceAll("_", " ")} · {cost.serviceDate}</span>
                    <span className="block text-xs text-gray-500">{cost.purpose}</span>
                  </span>
                </label>
                <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                  <div><dt className="text-gray-500">Approved cost</dt><dd className="font-semibold">{money(cost.approvedTotal)}</dd></div>
                  <div><dt className="text-gray-500">Already reserved</dt><dd className="font-semibold">{money(cost.reservedElsewhere)}</dd></div>
                  <div><dt className="text-gray-500">Available for advance</dt><dd className="font-semibold">{money(cost.availableToRequest)}</dd></div>
                  <div><dt className="text-gray-500">After this advance</dt><dd className={`font-semibold ${after < 0 ? "text-red-700" : ""}`}>{money(after)}</dd></div>
                </dl>
                {checked && (
                  <label className="mt-3 block text-xs font-medium sm:max-w-xs">Advance amount (KES)
                    <input type="number" min="0.01" step="0.01" value={requested} onChange={(event) => setAmount(cost.claimId, event.target.value)} className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5" />
                  </label>
                )}
                {checked && after < 0 && <p className="mt-2 text-xs font-medium text-red-700">This exceeds the amount still available against this approved cost.</p>}
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-stone-200 pt-4 text-right">
          <p className="text-sm text-gray-500">Total advance</p>
          <p className="text-2xl font-semibold">{money(total)}</p>
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link to="/admin/fund-requests" className="inline-flex min-h-11 items-center justify-center rounded-md border border-stone-300 px-4 text-sm font-medium">Cancel</Link>
        {!isPrincipal && (
          <button type="button" disabled={!valid || saving} onClick={() => save(false)} className="min-h-11 rounded-md border border-botanique-green px-4 text-sm font-semibold text-botanique-green disabled:opacity-50">
            {saving ? "Saving…" : "Save draft"}
          </button>
        )}
        <button type="button" disabled={!valid || saving} onClick={() => save(!isPrincipal)} className="min-h-11 rounded-md bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? "Working…" : isPrincipal ? "Authorise advance" : existing ? "Save and resubmit" : "Save and submit"}
        </button>
      </div>
    </section>
  );
}
