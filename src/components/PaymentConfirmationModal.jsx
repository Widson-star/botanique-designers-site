export default function PaymentConfirmationModal({
  open,
  onClose,
  service,
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-gray-500 hover:text-black"
        >
          ✕
        </button>

        <h2 className="text-2xl font-semibold mb-4">
          Payment Received 🌿
        </h2>

        <p className="text-gray-700 mb-4">
          Thank you for committing to a professional
          <strong> {service}</strong> with Botanique Designers.
        </p>

        <div className="bg-botanique-beige rounded-xl p-4 mb-6">
          <p className="text-sm text-gray-700">
            What happens next:
          </p>
          <ul className="text-sm text-gray-600 mt-2 space-y-1 list-disc list-inside">
            <li>We review your details</li>
            <li>We confirm timelines and next steps</li>
            <li>We contact you within 24 hours</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3">
          <a
            href="https://wa.me/254720861592"
            target="_blank"
            rel="noreferrer"
            className="w-full text-center px-4 py-3 rounded-full bg-botanique-green text-white hover:opacity-90"
          >
            Continue on WhatsApp
          </a>

          <button
            onClick={() => alert("Call scheduling coming next")}
            className="w-full px-4 py-3 rounded-full border border-gray-300 hover:bg-gray-100"
          >
            Request a Call Back
          </button>

          <button
            onClick={onClose}
            className="text-sm text-gray-500 underline mt-2"
          >
            Return to website
          </button>
        </div>
      </div>
    </div>
  );
}