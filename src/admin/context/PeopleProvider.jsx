import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { PeopleContext } from "./people";
import {
  correctEngagement, createEngagement, createPerson, endEngagement, fetchPeople,
  fetchPeopleEngagementProjects, fetchPeopleEngagements, updatePerson,
} from "../lib/people";

const now = () => new Date().toISOString();

function mapPerson(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    relationshipType: row.relationship_type,
    phone: row.phone || "",
    note: row.note || "",
    isActive: Boolean(row.is_active),
    profileId: row.profile_id || "",
    version: row.version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapEngagement(row) {
  return {
    id: row.id,
    personId: row.person_id,
    projectId: row.project_id,
    engagementRole: row.engagement_role,
    startDate: row.start_date,
    endDate: row.end_date || "",
    endReason: row.end_reason || "",
    version: row.version,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// A small demo register so the screens are usable without Supabase configured.
// These are illustrative records only; nothing here reaches a real database.
const DEMO_PEOPLE = [
  { id: "demo-person-1", fullName: "Lincoln Waweru", relationshipType: "crew_representative", phone: "0700 000 001", note: "Leads the Karen site crew.", isActive: true, profileId: "", version: 1, createdBy: "", updatedBy: "", createdAt: now(), updatedAt: now() },
  { id: "demo-person-2", fullName: "Martine Lotom", relationshipType: "operations_manager", phone: "", note: "", isActive: true, profileId: "demo-profile-manager", version: 1, createdBy: "", updatedBy: "", createdAt: now(), updatedAt: now() },
  { id: "demo-person-3", fullName: "Grace Njeri", relationshipType: "site_representative", phone: "0700 000 002", note: "", isActive: true, profileId: "", version: 1, createdBy: "", updatedBy: "", createdAt: now(), updatedAt: now() },
];

export default function PeopleProvider({ children, session, role, isDemo }) {
  const { projects } = useAdminData();
  const accessToken = session?.access_token || "";
  const [people, setPeople] = useState(() => (isDemo ? DEMO_PEOPLE : []));
  const [engagements, setEngagements] = useState([]);
  const [remoteProjects, setRemoteProjects] = useState([]);
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const engagementProjects = useMemo(() => (isDemo
    ? projects.filter((project) => !project.archived)
    : remoteProjects), [isDemo, projects, remoteProjects]);

  const refresh = useCallback(async () => {
    if (isDemo) return { ok: true };
    try {
      const [personRows, engagementRows, projectRows] = await Promise.all([
        fetchPeople(accessToken),
        fetchPeopleEngagements(accessToken),
        fetchPeopleEngagementProjects(accessToken),
      ]);
      setPeople((personRows || []).map(mapPerson));
      setEngagements((engagementRows || []).map(mapEngagement));
      setRemoteProjects((projectRows || []).map((row) => ({
        id: row.id, projectName: row.project_name, status: row.status, archived: Boolean(row.archived),
      })));
      setStatus("ready");
      setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error");
      setError(nextError.message || "Unable to load people.");
      return { ok: false, error: nextError };
    }
  }, [accessToken, isDemo]);

  useEffect(() => {
    if (isDemo || !accessToken || !role) return undefined;
    let cancelled = false;
    (async () => {
      const result = await refresh();
      if (cancelled && result.ok) return;
    })();
    return () => { cancelled = true; };
  }, [accessToken, isDemo, role, refresh]);

  const run = useCallback(async (operation, staleMessage) => {
    try {
      const result = await operation();
      // A version-filtered write that matched no row means somebody else
      // changed this record first. Nothing was written, and the reader is told
      // so rather than being shown a success that did not happen.
      if (!result) return { ok: false, error: staleMessage, stale: true };
      await refresh();
      return { ok: true, record: result };
    } catch (nextError) {
      const message = nextError.message || "The people action did not complete.";
      return { ok: false, error: message, stale: nextError.code === "40001" };
    }
  }, [refresh]);

  const addPerson = useCallback((values) => {
    if (isDemo) {
      const person = {
        ...values, id: `demo-person-${Date.now()}`, isActive: true, profileId: "",
        version: 1, createdBy: "", updatedBy: "", createdAt: now(), updatedAt: now(),
      };
      setPeople((current) => [...current, person].sort((a, b) => a.fullName.localeCompare(b.fullName)));
      return Promise.resolve({ ok: true, record: person });
    }
    return run(() => createPerson(accessToken, values), "This person could not be created.");
  }, [accessToken, isDemo, run]);

  const editPerson = useCallback((personId, expectedVersion, patch) => {
    if (isDemo) {
      let changed = null;
      setPeople((current) => current.map((person) => {
        if (person.id !== personId) return person;
        changed = { ...person, ...patch, version: person.version + 1, updatedAt: now() };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Person not found." });
    }
    return run(
      () => updatePerson(accessToken, personId, expectedVersion, patch),
      "This person was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const addEngagement = useCallback((values) => {
    if (isDemo) {
      const engagement = {
        ...values, id: `demo-engagement-${Date.now()}`, endDate: "", endReason: "",
        version: 1, createdBy: "", updatedBy: "", createdAt: now(), updatedAt: now(),
      };
      setEngagements((current) => [engagement, ...current]);
      return Promise.resolve({ ok: true, record: engagement });
    }
    return run(() => createEngagement(accessToken, values), "This engagement could not be recorded.");
  }, [accessToken, isDemo, run]);

  const closeEngagement = useCallback((engagementId, expectedVersion, endDate, endReason) => {
    if (isDemo) {
      let changed = null;
      setEngagements((current) => current.map((engagement) => {
        if (engagement.id !== engagementId) return engagement;
        changed = { ...engagement, endDate, endReason, version: engagement.version + 1, updatedAt: now() };
        return changed;
      }));
      return Promise.resolve(changed ? { ok: true, record: changed } : { ok: false, error: "Engagement not found." });
    }
    return run(
      () => endEngagement(accessToken, engagementId, expectedVersion, endDate, endReason),
      "This engagement was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const correctPastEngagement = useCallback((values) => {
    if (isDemo) {
      let changed = null;
      setEngagements((current) => current.map((engagement) => {
        if (engagement.id !== values.engagementId) return engagement;
        changed = {
          ...engagement,
          engagementRole: values.engagementRole,
          startDate: values.startDate,
          endDate: values.reopen ? "" : values.endDate,
          endReason: values.reopen ? "" : values.endReason,
          version: engagement.version + 1,
          updatedAt: now(),
        };
        return changed;
      }));
      return Promise.resolve(changed
        ? { ok: true, record: changed }
        : { ok: false, error: "Engagement not found." });
    }
    return run(
      () => correctEngagement(accessToken, values),
      "This engagement was changed elsewhere. Reload and try again."
    );
  }, [accessToken, isDemo, run]);

  const value = useMemo(() => ({
    people, engagements, engagementProjects, status, error,
    refresh, addPerson, editPerson, addEngagement, closeEngagement, correctPastEngagement,
    engagementsForPerson: (personId) => engagements.filter((engagement) => engagement.personId === personId),
    peopleById: new Map(people.map((person) => [person.id, person])),
  }), [people, engagements, engagementProjects, status, error, refresh,
    addPerson, editPerson, addEngagement, closeEngagement, correctPastEngagement]);

  return <PeopleContext.Provider value={value}>{children}</PeopleContext.Provider>;
}
