import { useCallback, useEffect, useMemo, useState } from "react";
import { StaffCompensationContext } from "./staffCompensation";
import {
  cancelStaffCompensation, confirmStaffCompensationHistoricalPaymentPosition,
  correctStaffCompensationHistoricalPaymentPosition, createStaffCompensationDraft,
  fetchStaffCompensationEvents, fetchStaffCompensationPaymentPositions, fetchStaffCompensationPayments,
  fetchStaffCompensations, principalAuthoriseStaffCompensation, recordStaffCompensationPayment,
  reverseStaffCompensationPayment, submitStaffCompensation, updateStaffCompensation,
  withdrawStaffCompensation,
} from "../lib/staffCompensation";

function mapCompensation(row) {
  return {
    id: row.id,
    personId: row.person_id,
    projectId: row.project_id || "",
    serviceDate: row.service_date,
    compensationType: row.compensation_type,
    currency: row.currency,
    description: row.description,
    lifecycle: row.lifecycle,
    requestRound: row.request_round,
    submittedAmount: row.submitted_amount == null ? null : Number(row.submitted_amount),
    approvedAmount: row.approved_amount == null ? null : Number(row.approved_amount),
    requesterId: row.requester_id,
    deciderId: row.decider_id || "",
    directAuthorityActorId: row.direct_authority_actor_id || "",
    legacySourceClaimId: row.legacy_source_claim_id || "",
    paymentHistoryKnown: Boolean(row.payment_history_known),
    historicalPaidAmount: Number(row.historical_paid_amount || 0),
    paymentHistoryConfirmedBy: row.payment_history_confirmed_by || "",
    paymentHistoryConfirmedAt: row.payment_history_confirmed_at || "",
    paymentHistoryNote: row.payment_history_note || "",
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    submittedAt: row.submitted_at || "",
    decidedAt: row.decided_at || "",
    withdrawnAt: row.withdrawn_at || "",
    cancelledAt: row.cancelled_at || "",
  };
}

function mapEvent(row) {
  return {
    id: row.id, compensationId: row.compensation_id, actorId: row.actor_id,
    eventType: row.event_type, previousLifecycle: row.previous_lifecycle || "",
    nextLifecycle: row.next_lifecycle, requestRound: row.request_round,
    reason: row.reason || "", occurredAt: row.occurred_at,
  };
}

function mapPayment(row) {
  return {
    id: row.id, paymentNumber: row.payment_number, compensationId: row.compensation_id,
    status: row.status, currency: row.currency, amount: Number(row.amount), paidAt: row.paid_at,
    paymentChannel: row.payment_channel, paymentReference: row.payment_reference || "",
    note: row.note || "", recordedBy: row.recorded_by, recordedAt: row.recorded_at,
    reversedBy: row.reversed_by || "", reversedAt: row.reversed_at || "",
    reversalReason: row.reversal_reason || "", version: row.version,
  };
}

function mapPosition(row) {
  return {
    compensationId: row.compensation_id,
    approvedAmount: row.approved_amount == null ? null : Number(row.approved_amount),
    paymentCount: Number(row.payment_count || 0),
    historicalPaidAmount: row.historical_paid_amount == null ? null : Number(row.historical_paid_amount),
    paidAmount: row.paid_amount == null ? null : Number(row.paid_amount),
    balanceAmount: row.balance_amount == null ? null : Number(row.balance_amount),
    paymentStatus: row.payment_status,
  };
}

export default function StaffCompensationProvider({ children, session, role, isDemo }) {
  const accessToken = session?.access_token || "";
  const [compensations, setCompensations] = useState([]);
  const [payments, setPayments] = useState([]);
  const [paymentPositions, setPaymentPositions] = useState([]);
  const [eventsByCompensation, setEventsByCompensation] = useState({});
  const [status, setStatus] = useState(isDemo ? "ready" : "loading");
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (isDemo) return { ok: true };
    try {
      const [compensationRows, paymentRows, positionRows] = await Promise.all([
        fetchStaffCompensations(accessToken),
        fetchStaffCompensationPayments(accessToken),
        fetchStaffCompensationPaymentPositions(accessToken),
      ]);
      setCompensations((compensationRows || []).map(mapCompensation));
      setPayments((paymentRows || []).map(mapPayment));
      setPaymentPositions((positionRows || []).map(mapPosition));
      setStatus("ready");
      setError("");
      return { ok: true };
    } catch (nextError) {
      setStatus("error");
      setError(nextError.message || "Unable to load Staff Compensation.");
      return { ok: false, error: nextError };
    }
  }, [accessToken, isDemo]);

  useEffect(() => {
    if (isDemo || !accessToken || !role) return undefined;
    refresh();
    return undefined;
  }, [accessToken, isDemo, refresh, role]);

  const loadEvents = useCallback(async (compensationId, force = false) => {
    if (!force && eventsByCompensation[compensationId]) return eventsByCompensation[compensationId];
    if (isDemo) return [];
    const mapped = (await fetchStaffCompensationEvents(accessToken, compensationId)).map(mapEvent);
    setEventsByCompensation((current) => ({ ...current, [compensationId]: mapped }));
    return mapped;
  }, [accessToken, eventsByCompensation, isDemo]);

  const run = useCallback(async (operation) => {
    if (isDemo) return { ok: false, error: "Staff Compensation demo writes are disabled." };
    try {
      const result = await operation();
      await refresh();
      return { ok: true, result };
    } catch (nextError) {
      const message = nextError.message || "The Staff Compensation action did not complete.";
      return { ok: false, error: message, stale: nextError.code === "40001" || /stale/i.test(message) };
    }
  }, [isDemo, refresh]);

  const createDraft = useCallback((values) => run(() => createStaffCompensationDraft(accessToken, values)), [accessToken, run]);
  const authoriseDirect = useCallback((values) => run(() => principalAuthoriseStaffCompensation(accessToken, values)), [accessToken, run]);
  const updateRecord = useCallback((id, version, values) => run(() => updateStaffCompensation(accessToken, id, version, values)), [accessToken, run]);
  const submitRecord = useCallback((id, version) => run(() => submitStaffCompensation(accessToken, id, version)), [accessToken, run]);
  const withdrawRecord = useCallback((id, version, reason = "") => run(() => withdrawStaffCompensation(accessToken, id, version, reason)), [accessToken, run]);
  const cancelRecord = useCallback((id, version, reason) => run(() => cancelStaffCompensation(accessToken, id, version, reason)), [accessToken, run]);
  const confirmPaymentHistory = useCallback((id, version, historicalPaidAmount, reason) => run(() => confirmStaffCompensationHistoricalPaymentPosition(accessToken, id, version, historicalPaidAmount, reason)), [accessToken, run]);
  const correctPaymentHistory = useCallback((id, version, reason) => run(() => correctStaffCompensationHistoricalPaymentPosition(accessToken, id, version, reason)), [accessToken, run]);
  const recordPayment = useCallback((id, values) => run(() => recordStaffCompensationPayment(accessToken, id, values)), [accessToken, run]);
  const reversePayment = useCallback((paymentId, version, reason) => run(() => reverseStaffCompensationPayment(accessToken, paymentId, version, reason)), [accessToken, run]);

  const paymentsForCompensation = useCallback((id) => payments.filter((payment) => payment.compensationId === id), [payments]);
  const paymentPositionForCompensation = useCallback((id) => paymentPositions.find((position) => position.compensationId === id) || null, [paymentPositions]);

  const value = useMemo(() => ({
    compensations, payments, paymentPositions, eventsByCompensation, status, error,
    refresh, loadEvents, createDraft, authoriseDirect, updateRecord, submitRecord,
    withdrawRecord, cancelRecord, confirmPaymentHistory, correctPaymentHistory, recordPayment, reversePayment,
    paymentsForCompensation, paymentPositionForCompensation,
  }), [
    authoriseDirect, cancelRecord, compensations, confirmPaymentHistory, correctPaymentHistory, createDraft, error,
    eventsByCompensation, loadEvents, paymentPositionForCompensation, paymentPositions,
    payments, paymentsForCompensation, recordPayment, refresh, reversePayment, status,
    submitRecord, updateRecord, withdrawRecord,
  ]);

  return <StaffCompensationContext.Provider value={value}>{children}</StaffCompensationContext.Provider>;
}
