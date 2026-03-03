import { useState } from "react";
import { PAYMENT } from "../utils/paymentDetails";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:5001";

export default function PaidConsultancyModal({ open, onClose, distanceKm = 0 }) {
  const [inputKm, setInputKm] = useState(distanceKm);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | sent | error
  const [errorMsg, setErrorMsg] = useState("");
  const [showManual, setShowManual] = useState(false);

  if (!open) return null;

  const baseFee = 3500;
  const extraKm = Math.max(0, inputKm - 5);
  const total = baseFee + extraKm * 60;

  async function handleStkPush() {
    const trimmed = phone.trim();
    if (!trimmed) {
      setErrorMsg("Enter your M-Pesa phone number.");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/stkpush`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: total, phone: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Request failed");
      }
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Use the manual option below.");
    }
  }

  function handleClose() {
    setStatus("idle");
    setPhone("");
    setErrorMsg("");
    setShowManual(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">

        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-semibold">Consultancy & Site Visit</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Fee is deductible from your final project cost.
            </p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700 text-lg leading-none ml-4">✕</button>
        </div>

        {/* Distance calculator */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Distance from Nairobi CBD (km)
          </label>
          <input
            type="number"
            className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-botanique-green/40"
            value={inputKm}
            onChange={(e) => setInputKm(Number(e.target.value) || 0)}
            min="0"
            step="1"
            disabled={status === "loading" || status === "sent"}
          />
        </div>

        {/* Total */}
        <div className="bg-botanique-beige rounded-xl px-4 py-3 mb-5 text-sm space-y-1">
          <p className="text-gray-600">Base fee (within 5 km): <strong>Ksh 3,500</strong></p>
          {extraKm > 0 && (
            <p className="text-gray-600">Extra: <strong>{extraKm} km × 60 = Ksh {(extraKm * 60).toLocaleString()}</strong></p>
          )}
          <p className="text-botanique-green font-bold text-base border-t border-gray-200 pt-2 mt-1">
            Total: Ksh {total.toLocaleString()}
          </p>
        </div>

        {/* STK push section */}
        {status === "sent" ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📱</div>
            <p className="font-semibold text-botanique-green text-lg">Check your phone!</p>
            <p className="text-sm text-gray-600 mt-1">
              An M-Pesa prompt for <strong>Ksh {total.toLocaleString()}</strong> has been sent to <strong>{phone}</strong>.
              Enter your PIN to complete payment.
            </p>
            <a
              href={`https://wa.me/254720861592?text=Hi%20Botanique!%20I%20just%20paid%20Ksh%20${total}%20for%20the%20site%20visit.%20Please%20confirm.`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 block w-full text-center bg-botanique-green text-white py-3 rounded-xl hover:opacity-90 transition"
            >
              Send Confirmation on WhatsApp
            </a>
            <button onClick={handleClose} className="mt-3 text-sm text-gray-500 hover:underline">
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <label className="block text-sm font-medium mb-1">
                Your M-Pesa Phone Number
              </label>
              <input
                type="tel"
                placeholder="07XX XXX XXX"
                className="w-full border border-gray-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-botanique-green/40"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={status === "loading"}
              />
            </div>

            {errorMsg && (
              <p className="text-red-600 text-sm mb-3">{errorMsg}</p>
            )}

            <button
              onClick={handleStkPush}
              disabled={status === "loading"}
              className="w-full bg-botanique-green text-white py-3 rounded-xl font-medium hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "Sending M-Pesa request…" : `Pay Ksh ${total.toLocaleString()} via M-Pesa`}
            </button>

            {/* Manual fallback */}
            <button
              className="w-full mt-3 text-sm text-gray-500 hover:text-botanique-green transition"
              onClick={() => setShowManual(!showManual)}
            >
              {showManual ? "▲ Hide manual payment details" : "▼ Pay manually instead (Till / Bank)"}
            </button>

            {showManual && (
              <div className="mt-3 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 space-y-1">
                <p><strong>M-Pesa Till:</strong> {PAYMENT.till}</p>
                <p><strong>Bank:</strong> {PAYMENT.bank}</p>
                <p><strong>Account Name:</strong> {PAYMENT.accountName}</p>
                <p><strong>Branch:</strong> {PAYMENT.branch}</p>
                <p><strong>Account No:</strong> {PAYMENT.accountNo}</p>
                <p className="text-xs text-gray-400 pt-1">Use your full name as payment reference.</p>
                <a
                  href="https://wa.me/254720861592?text=Hi%20Botanique!%20I%20have%20paid%20for%20the%20consultancy%20visit.%20Here%20is%20my%20proof."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block mt-2 text-center text-botanique-green underline"
                >
                  Send Payment Proof on WhatsApp 📸
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
