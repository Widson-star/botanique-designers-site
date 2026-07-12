import { useEffect, useRef, useState } from "react";
import { getDistanceKm } from "../utils/getDistanceKm.js";
import { buildQuoteMessage, waLink } from "../utils/whatsapp.js";

// The service options offered in step 2. Kept as a constant so the same list can
// be reused to pre-select a service passed in from a service/project page.
const SERVICE_OPTIONS = [
  "Landscape Design & Architecture",
  "Landscape Implementation & Construction",
  "Horticultural Services (Planting & Maintenance)",
  "Irrigation System Design & Installation",
  "Garden Maintenance & Aftercare",
  "Public / Commercial Landscaping",
  "Consultation & Site Assessment",
];

const CONSULTATION = "Consultation & Site Assessment";

const EMPTY_FORM = {
  name: "",
  service: "",
  location: "",
  size: "",
  siteContext: "",
  budget: "",
};

// A project-enquiry wizard. It gathers project details across six steps and
// prepares a WhatsApp enquiry — it does NOT calculate a monetary quote, so the
// public wording avoids promising an instant/automatic price.
export default function QuoteWizard({ open, setOpen, onConsultancyRequired, prefilledService = "" }) {
  // A fresh start each time the wizard opens is handled by the parent remounting
  // this component (a `key` tied to the open state), so the initial state below
  // runs on every open. Pre-select the incoming service if it matches an offered
  // option. Moving back/forward between steps never wipes what was typed because
  // the component stays mounted while open.
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    service: SERVICE_OPTIONS.includes(prefilledService) ? prefilledService : "",
  }));
  const [showError, setShowError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const dialogRef = useRef(null);

  // Close on Escape while the wizard is open.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  // Move focus into the dialog when it opens so keyboard users land in context.
  useEffect(() => {
    if (open) dialogRef.current?.focus();
  }, [open]);

  function isStepValid() {
    if (step === 1) return form.name.trim() !== "";
    if (step === 2) return form.service !== "";
    if (step === 3) return form.location.trim() !== "";
    if (step === 4) return form.size.trim() !== "";
    if (step === 5) return form.siteContext.trim() !== "";
    if (step === 6) return form.budget !== "";
    return true;
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear any previous "please complete this step" warning as soon as the
    // visitor starts filling the field in.
    if (showError) setShowError(false);
  }

  function buildMessage() {
    return buildQuoteMessage(form);
  }

  function openWhatsApp() {
    if (!isStepValid()) {
      setShowError(true);
      return;
    }
    window.open(waLink(buildMessage()), "_blank");
    // Enquiry handed off — close so the next open starts a clean enquiry.
    setOpen(false);
  }

  async function next() {
    if (submitting) return; // guard against duplicate transitions
    if (!isStepValid()) {
      setShowError(true);
      return;
    }
    setShowError(false);

    // Consultation path: the fee depends on distance from Nairobi CBD, which we
    // can only work out once the visitor has entered their location (step 3).
    // At that point we calculate the distance and hand off to the paid-
    // consultancy modal instead of continuing to the project-scoping steps.
    if (step === 3 && form.service === CONSULTATION) {
      setSubmitting(true);
      let km = null;
      try {
        km = await getDistanceKm(form.location);
      } catch {
        km = null;
      }
      setOpen(false);
      // If the automatic lookup fails, open the modal with 0 km so the visitor
      // can enter the distance manually (the modal keeps that fallback field).
      onConsultancyRequired(km ? Math.round(km) : 0);
      setSubmitting(false);
      return;
    }

    if (step < 6) setStep(step + 1);
  }

  function goBack() {
    setShowError(false);
    if (step > 1) setStep(step - 1);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center p-4"
      onClick={() => setOpen(false)}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="quote-wizard-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl w-full max-w-md p-6 relative max-h-[90vh] overflow-y-auto focus:outline-none"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close project enquiry"
          className="absolute top-3 right-4 text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>

        <h2 id="quote-wizard-title" className="text-xl font-bold mb-1">
          Tell Us About Your Project
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Step {step} of 6 · we&apos;ll prepare a WhatsApp enquiry — no automatic price is calculated.
        </p>

        {/* STEP 1 — Your name */}
        {step === 1 && (
          <>
            <label htmlFor="qw-name" className="block mb-2 text-gray-700">Your name</label>
            <input
              id="qw-name"
              className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Jane Mwangi"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
          </>
        )}

        {/* STEP 2 — Service */}
        {step === 2 && (
          <>
            <label htmlFor="qw-service" className="block mb-2 text-gray-700">What service do you need?</label>
            <select
              id="qw-service"
              className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.service}
              onChange={(e) => updateField("service", e.target.value)}
            >
              <option value="">Select service</option>
              {SERVICE_OPTIONS.map((option) => (
                <option key={option}>{option}</option>
              ))}
            </select>
          </>
        )}

        {/* STEP 3 — Location */}
        {step === 3 && (
          <>
            <label htmlFor="qw-location" className="block mb-2 text-gray-700">Where is the project located?</label>
            <input
              id="qw-location"
              className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. Nairobi, Karen"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
            />
            {form.service === CONSULTATION && (
              <p className="text-xs text-gray-500 mb-4 -mt-2">
                We&apos;ll use this to work out the site-visit distance from Nairobi CBD.
              </p>
            )}
          </>
        )}

        {/* STEP 4 — Project size */}
        {step === 4 && (
          <>
            <label htmlFor="qw-size" className="block mb-2 text-gray-700">Approximate project size?</label>
            <input
              id="qw-size"
              className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="e.g. 1/4 acre, 1000 sqm"
              value={form.size}
              onChange={(e) => updateField("size", e.target.value)}
            />
          </>
        )}

        {/* STEP 5 — Site context */}
        {step === 5 && (
          <>
            <label htmlFor="qw-context" className="block mb-2 text-gray-700">What is the current state of the site?</label>
            <textarea
              id="qw-context"
              rows={4}
              className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="Example: vacant land, completed house, ongoing construction, old garden needing redesign, commercial site, estate common area..."
              value={form.siteContext}
              onChange={(e) => updateField("siteContext", e.target.value)}
            />
          </>
        )}

        {/* STEP 6 — Budget + preview */}
        {step === 6 && (
          <>
            <label htmlFor="qw-budget" className="block mb-2 text-gray-700">Indicative budget range?</label>
            <select
              id="qw-budget"
              className="w-full border p-2 rounded mb-6 focus:outline-none focus:ring-2 focus:ring-green-500"
              value={form.budget}
              onChange={(e) => updateField("budget", e.target.value)}
            >
              <option value="">Select budget</option>
              <option>Ksh 20k – 150k</option>
              <option>Ksh 150k – 500k</option>
              <option>Ksh 500k – 1M+</option>
            </select>

            {/* WhatsApp Preview */}
            <div className="bg-botanique-beige rounded-xl p-4 text-left text-sm">
              <p className="font-semibold mb-2">WhatsApp Message Preview</p>
              <pre className="whitespace-pre-wrap font-sans text-gray-700 text-xs">
                {buildMessage()}
              </pre>
            </div>
          </>
        )}

        {/* VALIDATION MESSAGE — only after the visitor tries to continue */}
        {showError && !isStepValid() && (
          <p className="text-sm text-red-500 mt-4">
            ⚠️ Please complete this step before continuing.
          </p>
        )}

        {/* ACTIONS */}
        <div className="mt-6 flex justify-between gap-3">
          {step > 1 && (
            <button
              onClick={goBack}
              className="px-4 py-2 rounded border border-gray-300 hover:bg-gray-100 transition"
            >
              ← Back
            </button>
          )}

          {step < 6 ? (
            <button
              onClick={next}
              disabled={submitting}
              className="flex-1 px-4 py-2 rounded transition bg-botanique-green text-white hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? "Checking distance…" : "Next →"}
            </button>
          ) : (
            <button
              onClick={openWhatsApp}
              className="flex-1 px-4 py-2 rounded transition bg-botanique-green text-white hover:opacity-90"
            >
              Send Enquiry on WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
