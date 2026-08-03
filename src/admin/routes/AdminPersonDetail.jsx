import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAdminData } from "../context/adminData";
import { usePeople } from "../context/people";
import {
  ENGAGEMENT_ROLES, RELATIONSHIP_TYPES, canLinkPortalAccess, canManageEngagements,
  canSeePeople, canSetPersonActive, isEngagementOpen, isInternalRelationship,
} from "../utils/peopleCapabilities";
import { profilePresentationName } from "../utils/personName";

const showDate = (value) => (value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`))
  : "—");

const today = () => new Date().toISOString().slice(0, 10);

function Panel({ title, action, children }) {
  return (
    <section className="min-w-0 rounded-lg border border-stone-200 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// One person, contained. Composition follows
// `docs/ui-authority/operations-hub/04-project-summary-authority.png`: a small
// grid of panels rather than a long dossier. There is deliberately no payment
// ledger, no attendance record and no activity archive — none of that is
// authorised at Stage 5, and none of it exists to show.
export default function AdminPersonDetail() {
  const { personId } = useParams();
  const { role, profiles } = useAdminData();
  const {
    people, engagements, engagementProjects, status,
    editPerson, addEngagement, closeEngagement,
  } = usePeople();

  const [feedback, setFeedback] = useState("");
  const [actionError, setActionError] = useState("");
  const [showEngage, setShowEngage] = useState(false);
  const [engageForm, setEngageForm] = useState({ projectId: "", engagementRole: "team_leader", startDate: today() });
  const [closing, setClosing] = useState(null);
  const [closeForm, setCloseForm] = useState({ endDate: today(), endReason: "" });

  const person = people.find((candidate) => candidate.id === personId);
  const mine = useMemo(
    () => engagements.filter((engagement) => engagement.personId === personId),
    [engagements, personId]
  );
  const open = mine.filter(isEngagementOpen);
  const past = mine.filter((engagement) => !isEngagementOpen(engagement));
  const projectName = (id) => engagementProjects.find((project) => project.id === id)?.projectName || "A project you cannot access";
  const linkedProfile = profiles.find((profile) => profile.id === person?.profileId);

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

  if (status === "loading") return <p className="text-sm text-gray-600">Loading person…</p>;

  if (!person) {
    return (
      <section>
        <Link to="/admin/people" className="text-sm font-semibold text-botanique-green hover:underline">← People</Link>
        <h1 className="mt-2 text-2xl font-semibold">Person not found</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-600">
          This person is not on the register, or has been removed from it.
        </p>
      </section>
    );
  }

  async function report(promise, successMessage) {
    setActionError("");
    setFeedback("");
    const result = await promise;
    if (result.ok) setFeedback(successMessage);
    else setActionError(result.error || "That action did not complete.");
    return result;
  }

  async function submitEngagement(event) {
    event.preventDefault();
    if (!engageForm.projectId) {
      setActionError("Choose a project.");
      return;
    }
    const result = await report(
      addEngagement({ ...engageForm, personId: person.id }),
      "Engagement recorded."
    );
    if (result.ok) {
      setShowEngage(false);
      setEngageForm({ projectId: "", engagementRole: "team_leader", startDate: today() });
    }
  }

  async function submitClose(event) {
    event.preventDefault();
    const result = await report(
      closeEngagement(closing.id, closing.version, closeForm.endDate, closeForm.endReason),
      "Engagement ended. The record stays in this person's history."
    );
    if (result.ok) {
      setClosing(null);
      setCloseForm({ endDate: today(), endReason: "" });
    }
  }

  return (
    <section>
      <Link to="/admin/people" className="text-sm font-semibold text-botanique-green hover:underline">← People</Link>

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">{person.fullName}</h1>
          <p className="mt-1 text-sm text-gray-600">
            {RELATIONSHIP_TYPES[person.relationshipType]}
            {isInternalRelationship(person.relationshipType) ? " · Internal" : " · External"}
            {person.isActive ? "" : " · Inactive"}
          </p>
        </div>
      </div>

      {feedback && <p className="mt-4 rounded-md border border-stone-200 bg-[#edf2ef] p-3 text-sm text-botanique-green">{feedback}</p>}
      {actionError && <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{actionError}</p>}

      {/* grid-cols-1 and min-w-0 are load-bearing, not decoration: a truncated
          line sets white-space: nowrap, whose min-content width is the WHOLE
          string, and an auto-sized grid column grows to it. Without both, this
          page scrolls sideways on a 375 px phone. */}
      <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Panel
            title="Current engagements"
            action={canManageEngagements(role) && person.isActive && (
              <button
                type="button"
                onClick={() => { setShowEngage((shown) => !shown); setActionError(""); }}
                className="min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline"
              >
                {showEngage ? "Cancel" : "Engage on a project"}
              </button>
            )}
          >
            {showEngage && (
              <form onSubmit={submitEngagement} className="mb-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-3">
                <label className="text-sm font-medium">Project
                  <select
                    value={engageForm.projectId}
                    onChange={(event) => setEngageForm({ ...engageForm, projectId: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                  >
                    <option value="">Choose a project</option>
                    {/* Archived projects stay readable in the history above, but
                        nobody may be newly engaged on one. */}
                    {engagementProjects.filter((project) => !project.archived).map((project) => (
                      <option key={project.id} value={project.id}>{project.projectName}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">Role on this project
                  <select
                    value={engageForm.engagementRole}
                    onChange={(event) => setEngageForm({ ...engageForm, engagementRole: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                  >
                    {Object.entries(ENGAGEMENT_ROLES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">Starts
                  <input
                    type="date"
                    value={engageForm.startDate}
                    onChange={(event) => setEngageForm({ ...engageForm, startDate: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    required
                  />
                </label>
                <button
                  type="submit"
                  className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark sm:col-span-3 sm:w-auto sm:justify-self-start"
                >
                  Record engagement
                </button>
              </form>
            )}

            {!open.length && (
              <p className="text-sm text-gray-600">
                Not currently engaged on any project you can access.
              </p>
            )}

            <ul className="divide-y divide-stone-100">
              {open.map((engagement) => (
                <li key={engagement.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{projectName(engagement.projectId)}</span>
                    <span className="block truncate text-xs text-gray-500">
                      {ENGAGEMENT_ROLES[engagement.engagementRole]} · since {showDate(engagement.startDate)}
                    </span>
                  </span>
                  {canManageEngagements(role) && (
                    <button
                      type="button"
                      onClick={() => { setClosing(engagement); setActionError(""); }}
                      className="min-h-11 shrink-0 py-2 text-xs font-semibold text-gray-600 hover:text-botanique-charcoal hover:underline"
                    >
                      End
                    </button>
                  )}
                </li>
              ))}
            </ul>

            {closing && (
              <form onSubmit={submitClose} className="mt-3 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-3 sm:grid-cols-2">
                <p className="text-sm sm:col-span-2">
                  Ending <span className="font-medium">{projectName(closing.projectId)}</span>. The engagement stays in
                  this person&apos;s history and no site, cost or approval record changes.
                </p>
                <label className="text-sm font-medium">Ends
                  <input
                    type="date"
                    value={closeForm.endDate}
                    onChange={(event) => setCloseForm({ ...closeForm, endDate: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    required
                  />
                </label>
                <label className="text-sm font-medium">Reason <span className="font-normal text-gray-500">(optional)</span>
                  <input
                    value={closeForm.endReason}
                    onChange={(event) => setCloseForm({ ...closeForm, endReason: event.target.value })}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                    maxLength={300}
                  />
                </label>
                <div className="flex flex-wrap gap-2 sm:col-span-2">
                  <button type="submit" className="inline-flex min-h-11 items-center justify-center rounded-md bg-botanique-green px-4 py-2 text-sm font-semibold text-white hover:bg-botanique-dark">
                    End engagement
                  </button>
                  <button type="button" onClick={() => setClosing(null)} className="min-h-11 px-2 py-2 text-sm font-semibold text-gray-600 hover:underline">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </Panel>

          <Panel title="Past engagements">
            {!past.length && <p className="text-sm text-gray-600">No past engagements.</p>}
            <ul className="divide-y divide-stone-100">
              {past.map((engagement) => (
                <li key={engagement.id} className="py-2.5">
                  <p className="truncate text-sm font-medium">{projectName(engagement.projectId)}</p>
                  <p className="truncate text-xs text-gray-500">
                    {ENGAGEMENT_ROLES[engagement.engagementRole]} · {showDate(engagement.startDate)} – {showDate(engagement.endDate)}
                    {engagement.endReason ? ` · ${engagement.endReason}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 gap-4">
          <Panel title="Details">
            <dl className="grid gap-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Phone</dt>
                <dd className="min-w-0 truncate text-right">{person.phone || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-gray-500">Status</dt>
                <dd>{person.isActive ? "Active" : "Inactive"}</dd>
              </div>
            </dl>
            {person.note && <p className="mt-3 text-sm text-gray-600">{person.note}</p>}
            {canSetPersonActive(role) && (
              <button
                type="button"
                onClick={() => report(
                  editPerson(person.id, person.version, { is_active: !person.isActive }),
                  person.isActive
                    ? "This person is now inactive. Their engagement history is unchanged."
                    : "This person is active again."
                )}
                className="mt-3 min-h-11 py-2 text-sm font-semibold text-botanique-green hover:underline"
              >
                {person.isActive ? "Mark inactive" : "Mark active"}
              </button>
            )}
          </Panel>

          <Panel title="Portal access">
            {/* `profiles` is itself row-level secured: an Operations Manager
                reads only their own. So an unresolved profile means the NAME is
                unavailable, never that the link is absent — reporting "no
                portal account" there would state the opposite of the truth. */}
            <p className="text-sm text-gray-600">
              {person.profileId
                ? (linkedProfile
                  ? `Signs in as ${profilePresentationName(linkedProfile)}.`
                  : "Linked to a portal account you cannot view.")
                : "No portal account. This person is recorded and can be engaged without signing in."}
            </p>
            {canLinkPortalAccess(role) ? (
              <div className="mt-3">
                <label className="text-sm font-medium">Linked account
                  <select
                    value={person.profileId || ""}
                    onChange={(event) => report(
                      editPerson(person.id, person.version, { profile_id: event.target.value || null }),
                      event.target.value
                        ? "Portal account linked. This granted no new access."
                        : "Portal account unlinked. This removed no access."
                    )}
                    className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2.5"
                  >
                    <option value="">No linked account</option>
                    {profiles.map((profile) => (
                      <option key={profile.id} value={profile.id}>{profilePresentationName(profile)}</option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  Linking records that this person is an existing portal user. It never creates an account,
                  and unlinking never removes one — sign-in is managed separately.
                </p>
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-500">Only the Principal can change portal access.</p>
            )}
          </Panel>
        </div>
      </div>
    </section>
  );
}
