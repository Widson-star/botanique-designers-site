import { useState, useRef, useEffect } from "react";

export default function Assistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "bot",
      text: "👋 Hi, I’m Botanique AI. Ask me about services, pricing, or how to get started.",
    },
  ]);

  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function getBotReply(userText) {
    const text = userText.toLowerCase();

    // --- SERVICES ---
    if (text.includes("service") || text.includes("offer")) {
      return "🌿 We offer Landscape Architecture, EIA Studies, Project Implementation, and Maintenance.";
    }

    // --- PRICING ---
    if (text.includes("price") || text.includes("cost") || text.includes("budget")) {
      return "💰 Pricing depends on size, location, and scope. For accurate pricing, click **Instant Quote** or describe your project.";
    }

    // --- LOCATION / PROJECT TYPE ---
    if (text.includes("karen") || text.includes("residential") || text.includes("commercial")) {
      return "📍 Great. Could you share the approximate size of the land or budget range?";
    }

    // --- CONTACT ---
    if (text.includes("contact") || text.includes("email") || text.includes("phone")) {
      return "📞 You can reach us at +254 720 861 592 or email botanique.designers@gmail.com";
    }

    // --- DEFAULT ---
    return "✅ Got it. Tell me a bit more — location, size, or what you’d like to achieve.";
  }

  function sendMessage() {
    if (!input.trim()) return;

    const userMessage = { role: "user", text: input };
    const botMessage = { role: "bot", text: getBotReply(input) };

    setMessages((prev) => [...prev, userMessage, botMessage]);
    setInput("");
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setOpen(!open)}
          className="flex items-center gap-2 px-5 py-3 rounded-full
             bg-white text-botanique-green font-medium
             shadow-lg hover:shadow-xl
             hover:scale-105 transition
             cursor-pointer"
      >
        🌿 Ask Botanique
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-20 right-6 w-80 bg-white rounded-2xl shadow-xl flex flex-col overflow-hidden">
          <div className="bg-botanique-green text-white px-4 py-3 font-semibold">
            Botanique AI Assistant
          </div>

          <div className="flex-1 p-3 space-y-2 overflow-y-auto text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`p-2 rounded-lg max-w-[85%] ${
                  m.role === "user"
                    ? "ml-auto bg-botanique-green text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>

          <div className="p-2 border-t flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about services, pricing..."
              className="flex-1 border rounded-lg px-2 py-1 text-sm resize-none focus:outline-none"
              rows={1}
            />
            <button
              onClick={sendMessage}
              className="bg-botanique-green text-white px-3 rounded-lg text-sm"
            >
              Send
            </button>
          </div>
        </div>
      )}
    </>
  );
}
