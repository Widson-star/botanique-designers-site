import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import {
  RELATIONSHIP_TYPES, canCreatePerson, canSeePeople, findDuplicatePerson,
  isEngagementOpen, isInternalRelationship, summarisePeople,
} from "../utils/peopleCapabilities";

// The People overview: a compact register, not a dossier. Composition follows
// `docs/ui-authority/operations-hub/01-dashboard-authority.png` — a small totals
// strip over a contained list, restrained colour, and no wide table that would
// have to scroll sideways on a phone.
export default function AdminPeople() {
  const { role } = useAdminData();
  const { people, engagements, status, error, addPerson } = usePeople();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ fullName: "", relationshipType: "regular_staff", phone: "", note: "" });
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const search = searchParams.get("q") || "";
  const relationship = searchParams.get("type") || "all";
  const activity = searchParams.get("status") || "active";

  function setParam(key, value, fallback) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== fallback) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  }

  const openCounts = useMemo(() => {
    const counts = new Map();
    engagements.filter(isEngagementOpen).forEach((engagement) => {
      counts.set(engagement.personId, (counts.get(engagement.personId) || 0) + 1);
    });
    return counts;
  }, [engagements]);

  const totals = useMemo(() => summarisePeople(people), [people]);

  const visible = people.filter((person) => {
    if (activity === "active" && !person.isActive) return false;
    if (activity === "inactive" && person.isActive) return false;
    if (relationship !== "all" && person.relationshipType !== relationship) return false;
    if (search && !person.fullName.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  async function submit(event) {
    event.preventDefault();
    setFormError("");
    if (!form.fullName.trim()) {
      setFormError("A name is required.");
      return;
    }
    const duplicate = findDuplicatePerson(people, form.fullName);
    if (duplicate) {
      setFormError(`${duplicate.fullName} is already on the register. Open that record instead of creating a second one.`);
      return;
    }
    setSaving(true);
    const result = await addPerson({ ...form, fullName: form.fullName.trim() });
    setSaving(false);
    if (!result.ok) {
      setFormError(result.error || "This person could not be created.");
      return;
    }
    setForm({ fullName: "", relationshipType: "regular_staff", phone: "", note: "" });
    setShowForm(false);
  }

  if (!canSeePeople(role)) {
    return (
      <section>
        <h1 className="text-2xl font-semibold">People unavailable</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          The People register is available to the Principal and the Operations Manager.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">People and resourcing</p>
          <h1 className="mt-1 text-2xl font-semibold">People</h1>
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Everyone Botanique works with, and the projects they are engaged on. A person here does not
            have portal access unless it is granted separately.
          </p>
        </div>
        {canCreatePerson(role) && (
          <button
            type="button"
            onClick={() => { setShowForm((open) => !open); setFormError(""); }}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark"
          >
            {showForm ? "Cancel" : "Add person"}
          </button>
        )}
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-stone-200 bg-stone-200 sm:grid-cols-4">
        {[
          ["Active people", totals.active],
          ["Internal", totals.internal],
          ["External", totals.external],
          ["With portal access", totals.withPortalAccess],
        ].map(([label, figure]) => (
          <div key={label} className="min-w-0 bg-white px-4 py-3">
            <dt className="truncate text-xs font-medium text-gray-500">{label}</dt>
            <dd className="mt-0.5 text-xl font-semibold text-botanique-charcoal">{figure}</dd>
          </div>
        ))}
      </dl>

      {showForm && canCreatePerson(role) && (
        <form onSubmit={submit} className="mt-4 rounded-lg border border-stone-200 bg-white p-4">
          <p className="text-sm font-semibold">Add a person</p>
          <p className="mt-1 text-xs text-gray-500">
            Creating a person records who they are. It does not create a login and grants no access.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Full name
              <input
                value={form.fullName}
                onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                maxLength={160}
                required
              />
            </label>
            <label className="text-sm font-medium">Relationship
              <select
                value={form.relationshipType}
                onChange={(event) => setForm({ ...form, relationshipType: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
              >
                {Object.entries(RELATIONSHIP_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">Phone <span className="font-normal text-gray-500">(optional)</span>
              <input
                value={form.phone}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                maxLength={32}
              />
            </label>
            <label className="text-sm font-medium">Note <span className="font-normal text-gray-500">(optional)</span>
              <input
                value={form.note}
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                maxLength={500}
              />
            </label>
          </div>
          {formError && <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{formError}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save person"}
          </button>
        </form>
      )}

      <div className="mt-4 grid gap-3 rounded-lg border border-stone-200 bg-white p-4 sm:grid-cols-3">
        <label className="text-sm font-medium">Search
          <input
            value={search}
            onChange={(event) => setParam("q", event.target.value, "")}
            placeholder="Name"
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
          />
        </label>
        <label className="text-sm font-medium">Relationship
          <select
            value={relationship}
            onChange={(event) => setParam("type", event.target.value, "all")}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
          >
            <option value="all">All relationships</option>
            {Object.entries(RELATIONSHIP_TYPES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm font-medium">Status
          <select
            value={activity}
            onChange={(event) => setParam("status", event.target.value, "active")}
            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All</option>
          </select>
        </label>
      </div>

      {status === "loading" && <p className="mt-6 text-sm text-gray-600">Loading people…</p>}
      {error && <p className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}

      {status !== "loading" && !visible.length && (
        <div className="mt-5 rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center text-sm text-gray-600">
          {people.length === 0
            ? "No one is on the register yet. Add the people Botanique works with to see them here."
            : "No one matches these filters."}
        </div>
      )}

      {visible.length > 0 && (
        <ul className="mt-5 divide-y divide-stone-100 overflow-hidden rounded-lg border border-stone-200 bg-white">
          {visible.map((person) => {
            const open = openCounts.get(person.id) || 0;
            return (
              <li key={person.id}>
                <Link
                  to={`/admin/people/${person.id}`}
                  className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 hover:bg-stone-50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-botanique-green">{person.fullName}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {RELATIONSHIP_TYPES[person.relationshipType]}
                      {isInternalRelationship(person.relationshipType) ? " · Internal" : " · External"}
                      {person.phone ? ` · ${person.phone}` : ""}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-gray-600">
                    {person.profileId && (
                      <span className="rounded-full bg-[#edf2ef] px-2 py-0.5 font-medium text-botanique-green">Portal access</span>
                    )}
                    {!person.isActive && (
                      <span className="rounded-full bg-stone-100 px-2 py-0.5 font-medium text-gray-600">Inactive</span>
                    )}
                    <span>{open === 1 ? "1 project" : `${open} projects`}</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
