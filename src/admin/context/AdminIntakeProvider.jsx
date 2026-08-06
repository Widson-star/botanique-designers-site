import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminData } from "./adminData";
import { AdminIntakeContext } from "./adminIntake";
import {
  amendAndResubmitProjectIntake as apiAmend,
  decideProjectIntake as apiDecide,
  fetchProjectIntake,
  fetchProjectIntakeEvents,
  fetchProjectIntakes,
  requestProjectIntakeAmendment as apiRequestAmendment,
  submitProjectIntake as apiSubmit,
  withdrawProjectIntake as apiWithdraw,
} from "../lib/projectIntake";
import { mapProjectIntake, mapProjectIntakeEvent } from "../utils/intakeFormatters";

// The restricted project-intake proposal store. A pending intake is a proposal
// only: it is NEVER a live project and never enters the Projects/Dashboard data.
export default function AdminIntakeProvider({ children, session, isDemo, role }) {
  const { refetchProjects } = useAdminData();
  const accessToken = session?.access_token || "";
  const [intakes, setIntakes] = useState([]);
  const [eventsByIntake, setEventsByIntake] = useState({});
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const refreshIntakes = useCallback(async () => {
    if (isDemo) {
      setStatus("ready");
      return { ok: true };
    }
    try {
      const rows = await fetchProjectIntakes(accessToken);
      setIntakes(rows.map(mapProjectIntake));
      setStatus("ready");
      setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error");
      setError(nextError.message || "Unable to load project intakes.");
      return { ok: false, error: nextError };
    }
  }, [accessToken, isDemo]);

  useEffect(() => {
    if (isDemo || !accessToken || !role) return;
    let cancelled = false;
    async function run() {
      const result = await refreshIntakes();
      if (cancelled && result.ok) return;
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [accessToken, isDemo, role, refreshIntakes]);

  const loadEvents = useCallback(async (intakeId, force = false) => {
    if (!force && eventsByIntake[intakeId]) return eventsByIntake[intakeId];
    if (isDemo) return [];
    const rows = await fetchProjectIntakeEvents(accessToken, intakeId);
    const mapped = rows.map(mapProjectIntakeEvent);
    setEventsByIntake((current) => ({ ...current, [intakeId]: mapped }));
    return mapped;
  }, [accessToken, eventsByIntake, isDemo]);

  const loadIntake = useCallback(async (intakeId) => {
    if (isDemo) return null;
    const row = await fetchProjectIntake(accessToken, intakeId);
    if (!row) return null;
    const mapped = mapProjectIntake(row);
    setIntakes((current) => {
      const exists = current.some((item) => item.id === mapped.id);
      return exists
        ? current.map((item) => (item.id === mapped.id ? mapped : item))
        : [mapped, ...current];
    });
    return mapped;
  }, [accessToken, isDemo]);

  const runMutation = useCallback(async (operation, { refetchProject = false } = {}) => {
    if (isDemo) {
      return { ok: false, error: "Project Intakes are unavailable in the dev preview." };
    }
    try {
      const result = await operation();
      await refreshIntakes();
      if (refetchProject) await refetchProjects();
      return { ok: true, intake: result ? mapProjectIntake(result) : null };
    } catch (nextError) {
      return {
        ok: false,
        error: nextError.message || "The intake action did not complete.",
      };
    }
  }, [isDemo, refetchProjects, refreshIntakes]);

  const submit = useCallback(
    (values) => runMutation(() => apiSubmit(accessToken, values)),
    [accessToken, runMutation]
  );
  const withdraw = useCallback(
    (intakeId, notes) => runMutation(() => apiWithdraw(accessToken, intakeId, notes)),
    [accessToken, runMutation]
  );
  const requestAmendment = useCallback(
    (intakeId, notes) => runMutation(() => apiRequestAmendment(accessToken, intakeId, notes)),
    [accessToken, runMutation]
  );
  const amendAndResubmit = useCallback(
    (intakeId, values) => runMutation(() => apiAmend(accessToken, intakeId, values)),
    [accessToken, runMutation]
  );
  const decide = useCallback(
    (intakeId, decision, notes) =>
      runMutation(() => apiDecide(accessToken, intakeId, decision, notes), {
        refetchProject: decision === "approved",
      }),
    [accessToken, runMutation]
  );

  const value = useMemo(() => ({
    intakes,
    status,
    error,
    refreshIntakes,
    loadIntake,
    loadEvents,
    submit,
    withdraw,
    requestAmendment,
    amendAndResubmit,
    decide,
  }), [
    intakes, status, error, refreshIntakes, loadIntake, loadEvents, submit, withdraw,
    requestAmendment, amendAndResubmit, decide,
  ]);

  return (
    <AdminIntakeContext.Provider value={value}>
      {children}
    </AdminIntakeContext.Provider>
  );
}
