import { useState, useRef, useEffect } from "react";
import { BACKEND_URL, CONTACT } from "../utils/backend";
import { useApp } from "../context/AppContext";

const QUICK_REPLIES = [
  "What services do you offer?",
  "How much does a garden design cost?",
  "Do you work anywhere in Kenya?",
  "Do you offer garden maintenance?",
];

const BOOKING_KEYWORDS = [
  "consult", "site visit", "book", "schedule", "visit", "appointment", "come over", "come and see",
];

const ASSISTANT_UNAVAILABLE_TEXT =
  `Our live assistant is temporarily unavailable, but we can still help. Please WhatsApp us on ${CONTACT.phoneDisplay} with your location, project type, site photos, and what you'd like done — or request a site visit from the website.`;

function shouldShowBookingCTA(text) {
  const lower = text.toLowerCase();
  return BOOKING_KEYWORDS.some((k) => lower.includes(k));
}

export default function Assistant() {
  const { openQuoteWizard } = useApp();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm Ask Botanique 🌿\n\nI can help with services, pricing, site visits, planting design, maintenance, and project enquiries. What would you like to know?",
    },
  ]);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Whether a booking prompt card is already in the thread (avoid duplicates).
  const hasBookingCta = messages.some((m) => m.role === "booking-cta");

  // Route a site-visit booking into the single controlled qualification flow:
  // open the QuoteWizard with "Consultation & Site Assessment" preselected so the
  // wizard's location step, distance lookup and PaidConsultancyModal remain the
  // authoritative fee/payment path. Close the chat panel so the wizard is usable.
  function startSiteVisitBooking() {
    setOpen(false);
    openQuoteWizard("Consultation & Site Assessment", { source: "Ask Botanique" });
  }

  async function sendMessage(text) {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    const userMsg = { role: "user", text: messageText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");

    // No AI backend configured — fall back to a direct human channel instead
    // of POSTing to a dead endpoint.
    if (!BACKEND_URL) {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: ASSISTANT_UNAVAILABLE_TEXT,
        },
      ]);
      return;
    }

    setLoading(true);

    const history = updatedMessages
      .filter((m) => m.role === "user" || m.role === "bot")
      .slice(1, -1)
      .map((m) => ({ role: m.role === "user" ? "user" : "model", text: m.text }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: messageText, history }),
      });
      const data = await res.json().catch(() => ({}));
      const reply =
        res.ok && data.reply
          ? data.reply
          : res.status === 429 && data.error
            ? data.error
            : ASSISTANT_UNAVAILABLE_TEXT;

      const newBotMsg = { role: "bot", text: reply };
      setMessages((prev) => [
        ...prev,
        newBotMsg,
        ...(shouldShowBookingCTA(reply) && !hasBookingCta
          ? [{ role: "booking-cta" }]
          : []),
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: ASSISTANT_UNAVAILABLE_TEXT,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function formatText(text) {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((part, j) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });
      return (
        <span key={i}>
          {parts}
          {i < text.split("\n").length - 1 && <br />}
        </span>
      );
    });
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-botanique-green font-medium shadow-lg hover:shadow-xl hover:scale-105 transition cursor-pointer pulse-soft"
        aria-label="Open Ask Botanique chat"
      >
        🌿 Ask Botanique
      </button>

      {/* Chat window */}
      {open && (
        <div className="fixed bottom-28 right-4 md:bottom-24 md:right-8 w-[22rem] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 z-50">

          {/* Header */}
          <div className="bg-botanique-green text-white px-4 py-3 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-lg">🌿</span>
              <div>
                <p className="font-semibold text-sm leading-tight">Ask Botanique</p>
                <p className="text-white/70 text-xs">Landscape Design Assistant</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition p-1"
              aria-label="Close chat"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 space-y-3 overflow-y-auto text-sm max-h-96 min-h-40">
            {messages.map((m, i) => {
              // Regular user/bot messages
              if (m.role === "user" || m.role === "bot") {
                return (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`px-3 py-2 rounded-2xl max-w-[85%] leading-relaxed ${
                        m.role === "user"
                          ? "bg-botanique-green text-white rounded-br-sm"
                          : "bg-gray-100 text-gray-800 rounded-bl-sm"
                      }`}
                    >
                      {m.role === "bot" ? formatText(m.text) : m.text}
                    </div>
                  </div>
                );
              }

              // Booking CTA card (appears after AI mentions consultation).
              // Opens the controlled QuoteWizard rather than a duplicate form.
              if (m.role === "booking-cta") {
                return (
                  <div key={i} className="flex justify-start">
                    <button
                      onClick={startSiteVisitBooking}
                      className="flex items-center gap-2 px-4 py-2.5 bg-botanique-green/10 border border-botanique-green/30 text-botanique-green rounded-2xl rounded-bl-sm text-sm font-medium hover:bg-botanique-green hover:text-white transition"
                    >
                      📅 Book a Site Visit
                    </button>
                  </div>
                );
              }

              return null;
            })}

            {/* Loading indicator */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-2xl rounded-bl-sm text-sm flex gap-1 items-center">
                  <span className="animate-bounce">●</span>
                  <span className="animate-bounce [animation-delay:150ms]">●</span>
                  <span className="animate-bounce [animation-delay:300ms]">●</span>
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Quick replies — shown on first message */}
          {messages.length === 1 && !loading && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {QUICK_REPLIES.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1 rounded-full border border-botanique-green text-botanique-green hover:bg-botanique-green hover:text-white transition"
                >
                  {q}
                </button>
              ))}
              <button
                onClick={startSiteVisitBooking}
                className="text-xs px-3 py-1 rounded-full bg-botanique-green text-white hover:opacity-90 transition"
              >
                📅 Book a Visit
              </button>
            </div>
          )}

          {/* Input */}
          <div className="p-2 border-t border-gray-100 flex gap-2 shrink-0">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about services, pricing, site visits…"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-botanique-green/40"
              rows={1}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              className="bg-botanique-green text-white px-3 rounded-xl text-sm hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
              aria-label="Send message"
            >
              ↑
            </button>
          </div>
        </div>
      )}
    </>
  );
}
