export const STALE_APPROVAL_MESSAGE =
  "This request is no longer current because the project changed after it was submitted. Review the latest project values and submit a new request.";

const DEFAULT_APPROVAL_ERROR = "The approval action did not complete.";

function errorMessage(value) {
  if (typeof value === "string") return value;
  if (value instanceof Error) return value.message;
  if (typeof value?.message === "string") return value.message;
  if (typeof value?.error === "string") return value.error;
  if (value?.error instanceof Error) return value.error.message;
  if (typeof value?.error?.message === "string") return value.error.message;
  return "";
}

function errorCode(value) {
  return value?.code || value?.error?.code || "";
}

export function isStaleApprovalFailure(value) {
  const message = errorMessage(value);
  return value?.stale === true
    || errorCode(value) === "40001"
    || /stale|no longer current|changed after (it was )?submitted/i.test(message);
}

export function normalizeApprovalFailure(value, fallback = DEFAULT_APPROVAL_ERROR) {
  const stale = isStaleApprovalFailure(value);
  return {
    ok: false,
    stale,
    error: stale ? STALE_APPROVAL_MESSAGE : (errorMessage(value) || fallback),
  };
}

export function isValidApprovalMutationResponse(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
