// Central backend base URL.
//
// In development we fall back to the local Express server (server/index.js).
// In production the URL MUST come from VITE_BACKEND_URL. If it is not set we
// return an empty string so the UI can detect "backend not configured" and
// fall back gracefully (WhatsApp / phone / email) instead of silently POSTing
// to a dead http://localhost:5001 that no real visitor can reach.
export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ||
  (import.meta.env.DEV ? "http://localhost:5001" : "");

// True when a backend is configured and online endpoints can be attempted.
export const BACKEND_CONFIGURED = Boolean(BACKEND_URL);

// Direct contact channels — always available, used as the reliable fallback.
export const CONTACT = {
  whatsapp: "254720861592",
  phoneDisplay: "+254 720 861 592",
  phoneTel: "+254720861592",
  email: "hello@botaniquedesigners.com",
};
