import { useState } from "react";
import { getDistanceKm } from "../utils/getDistanceKm.js";

export default function QuoteWizard({ open, setOpen, onConsultancyRequired }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    service: "",
    location: "",
    size: "",
    budget: "",
  });

  function isStepValid() {
  if (step === 1) return form.service !== "";
  if (step === 2) return form.location.trim() !== "";
  if (step === 3) return form.size.trim() !== "";
  if (step === 4) return form.budget !== "";
  return true;
}
  

function buildMessage() {
  return `
Hello Botanique Designers 🌿,

I would like to request a quotation.

Service: ${form.service || "-"}
Location: ${form.location || "-"}
Project Size: ${form.size || "-"}
Budget Range: ${form.budget || "-"}

Kindly assist. Thank you.
  `;
}

function openWhatsApp() {
  const phone = "254720861592"; // change if needed
  const message = buildMessage();

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

async function next() {
  if (!isStepValid()) return;

  // STEP 1: if choosing Consultation, auto calculate distance
  if (step === 1 && form.service === "Consultation & Site Assessment") {
    setOpen(false);

    // 🔥 Get km distance from location user typed
    const km = await getDistanceKm(form.location);

    // Fallback if nothing found
    if (!km) {
      alert("Could not determine distance — enter manually in dialog.");
      onConsultancyRequired(0);
      return;
    }

    onConsultancyRequired(Math.round(km));
    return;
  }

  if (step < 4) setStep(step + 1);
}

  return (
    <>

      {/* MODAL */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-[9999] flex items-center justify-center">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-500"
            >
              ✕
            </button>

            <h2 className="text-xl font-bold mb-4">
              Instant Quote – Step {step}/4
            </h2>

            {/* STEP 1 */}
            {step === 1 && (
              <>
                <p className="mb-2">What service do you need?</p>
<select
  className="w-full border p-2 rounded"
  value={form.service}
  onChange={(e) =>
    setForm({ ...form, service: e.target.value })
  }
>
  <option value="">Select service</option>
  <option>Landscape Design & Architecture</option>
  <option>Landscape Implementation & Construction</option>
  <option>Horticultural Services (Planting & Maintenance)</option>
  <option>Environmental Impact Assessment (EIA)</option>
  <option>Irrigation System Design & Installation</option>
  <option>Garden Maintenance & Aftercare</option>
  <option>Public / Commercial Landscaping</option>
  <option>Consultation & Site Assessment</option>
</select>
              </>
            )}

            {/* STEP 2 */}
            {step === 2 && (
              <>
                <p className="mb-2">Where is the project located?</p>
                <input
                  className="w-full border p-2 rounded"
                  placeholder="e.g. Nairobi, Karen"
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value })
                  }
                />
              </>
            )}

            {/* STEP 3 */}
            {step === 3 && (
              <>
                <p className="mb-2">Approximate project size?</p>
                <input
                  className="w-full border p-2 rounded"
                  placeholder="e.g. 1/4 acre, 1000 sqm"
                  onChange={(e) =>
                    setForm({ ...form, size: e.target.value })
                  }
                />
              </>
            )}

{step === 4 && (
  <>
    <p className="mb-2">Estimated budget range?</p>

    <select
      className="w-full border p-2 rounded mb-6"
      value={form.budget}
      onChange={(e) =>
        setForm({ ...form, budget: e.target.value })
      }
    >
      <option value="">Select budget</option>
      <option>Ksh 20k – 150k</option>
      <option>Ksh 150k – 500k</option>
      <option>Ksh 500k – 1M+</option>
    </select>

    {/* WhatsApp Preview */}
    <div className="bg-botanique-beige rounded-xl p-4 text-left text-sm">
      <p className="font-semibold mb-2">📄 WhatsApp Message Preview</p>

      <pre className="whitespace-pre-wrap font-sans text-gray-700">
        {buildMessage()}
      </pre>
    </div>
  </>
)}

            {/* STEP 5 – PAID ESTIMATE */}
{step === 5 && (
  <div className="bg-white rounded-2xl shadow-md p-6 text-center">
    <h3 className="text-2xl font-semibold mb-4">
      Professional Landscape Estimate
    </h3>

    <p className="text-gray-600 mb-6">
      This includes a detailed cost breakdown for design,
      materials, labour, and timelines prepared by
      <strong> Botanique Designers</strong>.
    </p>

    <div className="bg-botanique-beige rounded-xl p-4 mb-6">
      <p className="text-lg font-medium">
        💰 Fee: <span className="font-bold">KSh 2,500</span>
      </p>
      <p className="text-sm text-gray-600">
        Redeemable if you proceed with us
      </p>
    </div>

    <button
      className="w-full px-6 py-3 rounded-full bg-botanique-green text-white hover:opacity-90 transition"
      onClick={() => alert("M-Pesa coming next")}
    >
      Pay & Unlock Estimate
    </button>
  </div>
)}
{/* VALIDATION MESSAGE */}
{!isStepValid() && (
  <p className="text-sm text-red-500 mb-2">
    Please complete this step before continuing.
  </p>
)}

            {/* ACTIONS */}
            <div className="mt-6 flex justify-between">
              {step < 4 ? (
                <button
  onClick={next}
  disabled={!isStepValid()}
  className={`px-4 py-2 rounded transition ${
    isStepValid()
      ? "bg-botanique-green text-white hover:opacity-90"
      : "bg-gray-300 text-gray-500 cursor-not-allowed"
  }`}
>
  Next →
</button>

              ) : (
                <button
                  onClick={openWhatsApp}
                  className="bg-botanique-green text-white px-4 py-2 rounded"
                >
                  Send to WhatsApp
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

