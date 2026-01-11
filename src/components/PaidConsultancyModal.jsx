import { useState } from "react";
import { PAYMENT } from "../utils/paymentDetails";

export default function PaidConsultancyModal({ open, onClose, distanceKm = 0 }) {
  if (!open) return null;

  const [inputKm, setInputKm] = useState(distanceKm);

  const baseFee = 3500;
  const extraKm = Math.max(0, inputKm - 5);
  const total = baseFee + extraKm * 60;

  return (
    <div 
    className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        const btn = document.getElementById("view-payment-btn");
        if (btn) btn.click();
      }
    }}
    
    tabIndex={0}   // <-- REQUIRED so div can detect keyboard
    >
        <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <h3 className="text-xl font-semibold mb-2">
          Consultancy & Site Visit
        </h3>

        <p className="text-sm text-gray-600 mb-4">
          Site visit is paid upfront and deductible from final BoQ.
        </p>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Distance from Nairobi CBD (km)
          </label>
          <input
  type="number"
  className="..."
  value={distanceKm}
  onChange={(e) => setDistanceKm(e.target.value)}
  onKeyDown={(e) => {
    if (e.key === "Enter") {
      setDistanceKm(distanceKm); // just ensure state updates
    }
  }}
/>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-sm space-y-2">
          <p>Base (within 5km): <strong>Ksh 3,500</strong></p>
          <p>Extra distance: <strong>{extraKm} km × 60</strong></p>
          <p className="border-t pt-2 font-semibold">
            Total: Ksh {total.toLocaleString()}
          </p>
        </div>

        <div className="bg-green-50 px-4 py-3 rounded-lg mt-4 text-left shadow-inner">
  <p className="text-sm font-semibold text-gray-800 mb-1">
    Pay using:
  </p>

  <p className="text-sm text-gray-700 leading-relaxed">
    <strong>M-Pesa Till Number:</strong> {PAYMENT.till}<br/>
    <strong>Bank:</strong> {PAYMENT.accountName}<br/>
    <strong>Bank Name:</strong> {PAYMENT.bank}<br/>
    <strong>Branch:</strong> {PAYMENT.branch}<br/>
    <strong>Account No:</strong> {PAYMENT.accountNo}<br/>
  </p>

  <p className="text-xs text-gray-500 mt-2">
    Use your <strong>full name</strong> as the payment reference.
  </p>
</div>

    <button
  id="view-payment-btn"
  className="mt-6 w-full bg-botanique-green text-white py-3 rounded-xl hover:scale-105 transition"
  onClick={() => {
    alert(`Thank you...`);
    onClose();
  }}
>
  View Payment Details
</button>

  <a
  href="https://wa.me/254720861592?text=Hi%20Botanique!%20I%20have%20paid%20for%20the%20consultancy%20visit.%20Here%20is%20my%20proof."
  className="block text-center text-botanique-green underline mt-3"
  target="_blank"
  rel="noopener noreferrer"
>
  Send Proof on WhatsApp 📸
</a>

        <button
          className="mt-3 w-full text-sm text-gray-500 hover:underline"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
