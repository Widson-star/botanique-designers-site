import { useState } from "react";

export default function SmartAdvisor() {
  const [input, setInput] = useState("");
  const [response, setResponse] = useState(null);

  function analyzeIntent(text) {
    const t = text.toLowerCase();

    if (t.includes("house") || t.includes("home") || t.includes("garden")) {
      return {
        title: "Landscape Design & Implementation",
        message:
          "🌿 Based on your project, we recommend Landscape Architecture and Implementation for optimal outdoor planning and execution.",
      };
    }

    if (t.includes("hotel") || t.includes("resort") || t.includes("camp")) {
      return {
        title: "Hospitality Landscape Solutions",
        message:
          "🏨 This looks like a hospitality project. We recommend master planning, planting design, and maintenance programs.",
      };
    }

    if (t.includes("eia") || t.includes("environment") || t.includes("impact")) {
      return {
        title: "Environmental Impact Assessment (EIA)",
        message:
          "🌍 Your project may require an Environmental Impact Assessment to ensure regulatory compliance.",
      };
    }

    if (t.includes("maintenance") || t.includes("care")) {
      return {
        title: "Landscape Maintenance",
        message:
          "🧹 Ongoing maintenance ensures longevity and aesthetics of your landscape.",
      };
    }

    return {
      title: "General Consultation",
      message:
        "🌱 We recommend a consultation so we can understand your project better and guide you accordingly.",
    };
  }

  function handleSubmit() {
    if (!input.trim()) return;
    setResponse(analyzeIntent(input));
  }

  return (
    <div className="mt-20 bg-white rounded-xl shadow-lg p-6 max-w-xl mx-auto">
      <h3 className="text-xl font-bold mb-2">
        🤖 Smart Project Advisor
      </h3>

      <p className="text-gray-600 mb-4">
        Describe your project briefly and we’ll suggest the best service.
      </p>

      <textarea
        className="w-full border rounded p-3 mb-4"
        rows="3"
        placeholder="e.g. I want to landscape my residential compound in Karen..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />

      <button
        onClick={handleSubmit}
        className="bg-botanique-green text-white px-5 py-2 rounded hover:scale-105 transition"
      >
        Analyze Project
      </button>

      {response && (
        <div className="mt-6 border-t pt-4">
          <h4 className="font-semibold">{response.title}</h4>
          <p className="mt-2 text-gray-700">{response.message}</p>

          <a
            href="https://wa.me/254720861592"
            target="_blank"
            className="inline-block mt-4 text-botanique-green font-medium"
          >
            → Talk to Botanique on WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
