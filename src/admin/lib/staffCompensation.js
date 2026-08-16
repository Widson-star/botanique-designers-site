const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, "") || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

function headers(accessToken) {
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
  };
}

async function read(response) {
  const resolved = await response;
  const text = await resolved.text();
  const data = text ? JSON.parse(text) : null;
  if (!resolved.ok) {
    const error = new Error(data?.message || data?.hint || "Staff Compensation request failed.");
    error.code = data?.code || "";
    throw error;
  }
  return data;
}

async function rpc(accessToken, name, body = {}) {
  return read(fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: headers(accessToken),
    body: JSON.stringify(body),
  }));
}

export function fetchStaffCompensations(accessToken) {
  const params = new URLSearchParams({
    select: [
      "id", "person_id", "project_id", "service_date", "compensation_type", "currency",
      "description", "lifecycle", "request_round", "submitted_amount", "approved_amount",
      "requester_id", "decider_id", "version", "created_at", "updated_at", "submitted_at",
      "decided_at", "withdrawn_at", "cancelled_at",
    ].join(","),
    order: "service_date.desc,updated_at.desc",
  });
  return read(fetch(`${SUPABASE_URL}/rest/v1/staff_compensations?${params}`, {
    headers: headers(accessToken),
  }));
}

export function fetchStaffCompensationEvents(accessToken, compensationId) {
  const params = new URLSearchParams({
    select: [
      "id", "compensation_id", "actor_id", "event_type", "previous_lifecycle",
      "next_lifecycle", "request_round", "reason", "occurred_at",
    ].join(","),
    compensation_id: `eq.${compensationId}`,
    order: "occurred_at.asc,id.asc",
  });
  return read(fetch(`${SUPABASE_URL}/rest/v1/staff_compensation_events?${params}`, {
    headers: headers(accessToken),
  }));
}

export function fetchStaffCompensationPayments(accessToken) {
  const params = new URLSearchParams({
    select: [
      "id", "payment_number", "compensation_id", "status", "currency", "amount", "paid_at",
      "payment_channel", "payment_reference", "note", "recorded_by", "recorded_at",
      "reversed_by", "reversed_at", "reversal_reason", "version", "created_at", "updated_at",
    ].join(","),
    order: "paid_at.desc,created_at.desc",
  });
  return read(fetch(`${SUPABASE_URL}/rest/v1/staff_compensation_payments?${params}`, {
    headers: headers(accessToken),
  }));
}

export function fetchStaffCompensationPaymentPositions(accessToken) {
  return rpc(accessToken, "staff_compensation_payment_positions");
}

export function createStaffCompensationDraft(accessToken, values) {
  return rpc(accessToken, "create_staff_compensation_draft", {
    target_person_id: values.personId,
    target_project_id: values.projectId || null,
    target_service_date: values.serviceDate,
    target_compensation_type: values.compensationType,
    target_description: values.description,
    target_amount: Number(values.amount),
  });
}

export function updateStaffCompensation(accessToken, compensationId, expectedVersion, values) {
  return rpc(accessToken, "update_staff_compensation", {
    target_compensation_id: compensationId,
    target_expected_version: expectedVersion,
    target_person_id: values.personId,
    target_project_id: values.projectId || null,
    target_service_date: values.serviceDate,
    target_compensation_type: values.compensationType,
    target_description: values.description,
    target_amount: Number(values.amount),
  });
}

export function submitStaffCompensation(accessToken, compensationId, expectedVersion) {
  return rpc(accessToken, "submit_staff_compensation", {
    target_compensation_id: compensationId,
    target_expected_version: expectedVersion,
  });
}

export function withdrawStaffCompensation(accessToken, compensationId, expectedVersion, reason = "") {
  return rpc(accessToken, "withdraw_staff_compensation", {
    target_compensation_id: compensationId,
    target_expected_version: expectedVersion,
    target_reason: reason || null,
  });
}

export function cancelStaffCompensation(accessToken, compensationId, expectedVersion, reason) {
  return rpc(accessToken, "cancel_staff_compensation", {
    target_compensation_id: compensationId,
    target_expected_version: expectedVersion,
    target_reason: reason,
  });
}

export function recordStaffCompensationPayment(accessToken, compensationId, values) {
  return rpc(accessToken, "record_staff_compensation_payment", {
    target_compensation_id: compensationId,
    target_amount: Number(values.amount),
    target_paid_at: values.paidAt,
    target_payment_channel: values.paymentChannel,
    target_payment_reference: values.paymentReference?.trim() || null,
    target_note: values.note?.trim() || null,
  });
}

export function reverseStaffCompensationPayment(accessToken, paymentId, expectedVersion, reason) {
  return rpc(accessToken, "reverse_staff_compensation_payment", {
    target_payment_id: paymentId,
    target_expected_version: expectedVersion,
    target_reason: reason,
  });
}
