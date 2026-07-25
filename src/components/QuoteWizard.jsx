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
export default function QuoteWizard({ open, setOpen, onConsultancyRequired, prefilledService = "", enquiryContext = null }) {
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
  // Tracks whether this wizard instance is still mounted/active. A consultation
  // distance lookup is async; if the visitor closes the wizard (✕ / Escape /
  // backdrop) while it is in flight, the parent unmounts this instance and the
  // cleanup below flips this to false, so the resolved lookup will NOT reopen the
  // paid-consultancy modal for a request that no longer belongs to an open wizard.
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    return () => {
      activeRef.current = false;
    };
  }, []);

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

  // The minimum information a project enquiry must carry before it reaches
  // WhatsApp: service, location, approximate size and budget. Step-by-step
  // validation already gates each step, but this is the single final guard so a
  // handoff can never leave with a required field blank (e.g. if a later change
  // ever let step 6 be reached without them). Returns the first incomplete step,
  // or null when every required field is present.
  function firstIncompleteRequiredStep() {
    if (form.service === "") return 2;
    if (form.location.trim() === "") return 3;
    if (form.size.trim() === "") return 4;
    if (form.budget === "") return 6;
    return null;
  }

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
    // Clear any previous "please complete this step" warning as soon as the
    // visitor starts filling the field in.
    if (showError) setShowError(false);
  }

  function buildMessage() {
    return buildQuoteMessage(form, enquiryContext);
  }

  function openWhatsApp() {
    // Final validation of ALL required fields (not just the current step) before
    // any WhatsApp handoff. If something required is missing, jump back to the
    // first incomplete step and show the error rather than sending a thin lead.
    const incompleteStep = firstIncompleteRequiredStep();
    if (incompleteStep !== null) {
      setStep(incompleteStep);
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
      // getDistanceKm always resolves to an explicit { status, km } and never
      // throws; the try/catch is a belt-and-braces guard only.
      let result = { status: "uncertain", km: null };
      try {
        result = await getDistanceKm(form.location);
      } catch {
        result = { status: "uncertain", km: null };
      }
      // If the wizard was closed/unmounted while the lookup was in flight, drop
      // the result — do not reopen the paid-consultancy modal for a stale request.
      if (!activeRef.current) return;
      setSubmitting(false);
      setOpen(false);
      // Hand the modal an explicit resolution: a confidently-resolved Kenyan
      // distance, or "uncertain" so it asks the visitor for a manual distance
      // instead of showing a misleading fee. Never coerce a failure to 0 km.
      onConsultancyRequired(result);
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
              placeholder="e.g. Karen, Nairobi"
              value={form.location}
              onChange={(e) => updateField("location", e.target.value)}
            />
            {form.service === CONSULTATION && (
              <p className="text-xs text-gray-500 mb-4 -mt-2">
                Add the town/area and county (e.g. &quot;Karen, Nairobi&quot; or
                &quot;Nyeri Town, Nyeri&quot;) so we can estimate the site-visit
                distance from Nairobi CBD. No exact address needed.
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
              <option>Below KSh 150,000</option>
              <option>KSh 150,000 – 500,000</option>
              <option>KSh 500,000 – 1.5 million</option>
              <option>KSh 1.5 – 5 million</option>
              <option>Above KSh 5 million</option>
              <option>Need guidance before setting a budget</option>
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
