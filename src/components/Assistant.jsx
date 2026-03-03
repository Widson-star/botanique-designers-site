import { useState, useRef, useEffect } from "react";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

const QUICK_REPLIES = [
  "What services do you offer?",
  "How much does a garden design cost?",
  "Do you work anywhere in Kenya?",
  "What is an EIA study?",
];

const BOOKING_KEYWORDS = [
  "consult", "site visit", "book", "schedule", "visit", "appointment", "come over", "come and see",
];

function shouldShowBookingCTA(text) {
  const lower = text.toLowerCase();
  return BOOKING_KEYWORDS.some((k) => lower.includes(k));
}

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "Hi! I'm Botanique AI 🌿\n\nI can help with services, pricing, EIA questions, or anything about your outdoor project. What would you like to know?",
    },
  ]);

  // Booking form state
  const [bookingData, setBookingData] = useState({ name: "", phone: "", location: "", km: "" });
  const [bookingSubmitted, setBookingSubmitted] = useState(false);

  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // Check if a booking-form card is already in the thread
  const hasBookingForm = messages.some((m) => m.role === "booking-form");

  function openBookingForm() {
    if (hasBookingForm) return;
    setBookingSubmitted(false);
    setBookingData({ name: "", phone: "", location: "", km: "" });
    setMessages((prev) => [
      ...prev,
      { role: "bot", text: "Sure! Fill in your details below and I'll get you booked in for a site visit." },
      { role: "booking-form" },
    ]);
  }

  function submitBooking() {
    const { name, phone, location, km } = bookingData;
    if (!name.trim() || !phone.trim() || !location.trim()) return;

    const parsedKm = parseFloat(km) || 0;
    const extraKm = Math.max(0, parsedKm - 5);
    const total = 3500 + extraKm * 60;

    const waText = encodeURIComponent(
      `Hi Botanique! I'd like to book a site visit.\n\n` +
      `Name: ${name}\nPhone: ${phone}\nLocation: ${location}\n` +
      (parsedKm ? `Distance from CBD: ~${parsedKm} km\nEstimated fee: Ksh ${total.toLocaleString()}\n` : "") +
      `\nPlease confirm the booking. Thank you!`
    );

    setBookingSubmitted(true);

    // Replace booking-form message with success message
    setMessages((prev) =>
      prev.map((m) =>
        m.role === "booking-form"
          ? { role: "booking-success", name, total }
          : m
      )
    );

    setTimeout(() => {
      window.open(`https://wa.me/254720861592?text=${waText}`, "_blank");
    }, 400);
  }

  async function sendMessage(text) {
    const messageText = (text || input).trim();
    if (!messageText || loading) return;

    const userMsg = { role: "user", text: messageText };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
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
      const data = await res.json();
      const reply = data.reply || data.error || "I couldn't get a response. Please try again.";

      const newBotMsg = { role: "bot", text: reply };
      setMessages((prev) => [
        ...prev,
        newBotMsg,
        ...(shouldShowBookingCTA(reply) && !hasBookingForm
          ? [{ role: "booking-cta" }]
          : []),
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "I'm having trouble connecting right now. Please reach us directly at +254 720 861 592.",
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

  const baseFee = 3500;
  const extraKm = Math.max(0, (parseFloat(bookingData.km) || 0) - 5);
  const estimatedTotal = baseFee + extraKm * 60;

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-5 py-3 rounded-full bg-white text-botanique-green font-medium shadow-lg hover:shadow-xl hover:scale-105 transition cursor-pointer pulse-soft"
        aria-label="Open Botanique AI chat"
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
                <p className="font-semibold text-sm leading-tight">Botanique AI</p>
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

              // Booking CTA card (appears after AI mentions consultation)
              if (m.role === "booking-cta") {
                return (
                  <div key={i} className="flex justify-start">
                    <button
                      onClick={openBookingForm}
                      className="flex items-center gap-2 px-4 py-2.5 bg-botanique-green/10 border border-botanique-green/30 text-botanique-green rounded-2xl rounded-bl-sm text-sm font-medium hover:bg-botanique-green hover:text-white transition"
                    >
                      📅 Book a Site Visit
                    </button>
                  </div>
                );
              }

              // Inline booking form
              if (m.role === "booking-form") {
                return (
                  <div key={i} className="flex justify-start w-full">
                    <div className="bg-gray-50 border border-gray-200 rounded-2xl rounded-bl-sm p-3 w-full space-y-2">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Site Visit Booking</p>
                      <input
                        type="text"
                        placeholder="Your name *"
                        value={bookingData.name}
                        onChange={(e) => setBookingData((d) => ({ ...d, name: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
                      />
                      <input
                        type="tel"
                        placeholder="Phone number *"
                        value={bookingData.phone}
                        onChange={(e) => setBookingData((d) => ({ ...d, phone: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
                      />
                      <input
                        type="text"
                        placeholder="Your location / area *"
                        value={bookingData.location}
                        onChange={(e) => setBookingData((d) => ({ ...d, location: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
                      />
                      <div>
                        <input
                          type="number"
                          placeholder="~Distance from Nairobi CBD (km)"
                          value={bookingData.km}
                          onChange={(e) => setBookingData((d) => ({ ...d, km: e.target.value }))}
                          min="0"
                          className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-botanique-green/30"
                        />
                        {bookingData.km && (
                          <p className="text-xs text-botanique-green mt-1 pl-1">
                            Estimated fee: <strong>Ksh {estimatedTotal.toLocaleString()}</strong>
                          </p>
                        )}
                      </div>
                      <button
                        onClick={submitBooking}
                        disabled={!bookingData.name || !bookingData.phone || !bookingData.location}
                        className="w-full bg-botanique-green text-white rounded-lg py-2 text-sm font-medium hover:opacity-90 transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Send Booking Request on WhatsApp
                      </button>
                    </div>
                  </div>
                );
              }

              // Booking success card
              if (m.role === "booking-success") {
                return (
                  <div key={i} className="flex justify-start">
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl rounded-bl-sm px-4 py-3 text-sm">
                      <p className="font-semibold text-emerald-700">Booking request sent! 🎉</p>
                      <p className="text-gray-600 mt-1">
                        Hi {m.name}, your WhatsApp message has been pre-filled. The team will confirm your visit shortly.
                      </p>
                    </div>
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
                onClick={openBookingForm}
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
              placeholder="Ask about services, pricing, EIA…"
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
