import { useState } from "react";
import {
  acceptanceRequiresReason,
  acquittalOutcome,
  calculateAcquittalSpend,
  canConfirmFundReleaseReceipt,
  canDecideFundAcquittal,
  canRecordFundRelease,
  canReverseFundRelease,
  canSubmitFundAcquittal,
  PAYMENT_CHANNELS,
} from "../../utils/fundReleaseCapabilities";
import { profilePresentationName } from "../../utils/personName";

const money = (amount) => new Intl.NumberFormat("en-KE", {
  style: "currency", currency: "KES", currencyDisplay: "code",
}).format(amount || 0);
const day = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value))
  : "—";

const CATEGORIES = {
  labour: "Labour",
  mason_subcontract: "Mason subcontract",
  cart_transport: "Cart transport",
  transport: "Transport",
  materials: "Materials",
  equipment_hire: "Equipment hire",
  supplier_cost: "Supplier cost",
  other: "Other",
};

const emptyLine = () => ({ description: "", category: "labour", amount: "", spentOn: "" });
const today = () => new Date().toISOString().slice(0, 10);

function Figure({ label, value, tone = "" }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className={`mt-0.5 truncate text-base font-semibold ${tone}`}>{value}</dd>
    </div>
  );
}

// The underlying DB still calls these rows releases/acquittals. That vocabulary
// is deliberately kept inside implementation details only. To a user this is an
// Advance: it is approved, issued to an accountable person, then accounted for.
export default function FundReleaseSection({
  request,
  releases,
  acquittalForRelease,
  linesForAcquittal,
  position,
  profiles,
  role,
  currentUserId,
  working,
  onRecord,
  onReverse,
  onConfirmReceipt,
  onSubmitAcquittal,
  onDecideAcquittal,
}) {
  const [form, setForm] = useState(null);
  const [openRelease, setOpenRelease] = useState("");
  const [accountingFor, setAccountingFor] = useState("");
  const [lines, setLines] = useState([emptyLine()]);
  const [returned, setReturned] = useState("");
  const [evidence, setEvidence] = useState("");
  const [decisionReason, setDecisionReason] = useState("");
  const [reversalReason, setReversalReason] = useState("");

  const actorName = (id) => {
    const profile = profiles.find((item) => item.id === id);
    return profile ? profilePresentationName(profile, { formal: true }) : "Authorised user";
  };
  const canRecord = canRecordFundRelease(request, role, releases);

  function startIssuing() {
    setForm({
      releasedAmount: String(position.remainingReleasableAmount),
      releasedAt: today(),
      custodyDisposition: "operations_manager_accountable_advance",
      recipientProfileId: request.custodianProfileId || "",
      recipientLabel: "",
      paymentChannel: "mpesa",
      paymentReference: "",
      note: "",
    });
  }

  function startAccounting(release, account) {
    setAccountingFor(release.id);
    const existing = account ? linesForAcquittal(account.id) : [];
    setLines(existing.length
      ? existing.map((line) => ({
        description: line.description,
        category: line.category,
        amount: String(line.amount),
        spentOn: line.spentOn,
      }))
      : [{ ...emptyLine(), spentOn: String(release.releasedAt).slice(0, 10) }]);
    setReturned(account ? String(account.returnedAmount) : "");
    setEvidence(account?.evidenceReference || "");
  }

  const spend = calculateAcquittalSpend(lines.map((line) => ({ amount: line.amount })));
  const accountingLabel = plainAccountingState(position.reconciliationState);

  return (
    <div className="rounded-lg border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold">Advance</h2>
          <p className="mt-1 text-xs text-gray-500">
            Approval allows the Advance to be issued. The figures below show what has actually been handed over and accounted for.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-1.5">
          <span className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-semibold">
            {plainIssueState(position.releaseState)}
          </span>
          <span className="rounded-md border border-stone-300 px-2.5 py-1 text-xs font-semibold">
            {accountingLabel}
          </span>
        </div>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Figure label="Approved" value={money(position.authorisedAmount)} />
        <Figure label="Issued" value={money(position.releasedAmount)} />
        <Figure label="Still available" value={money(position.remainingReleasableAmount)} />
        <Figure
          label="Accounted for"
          value={position.actualSpendAmount > 0 ? money(position.actualSpendAmount) : "—"}
        />
      </dl>

      {position.releaseState === "none" && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          This Advance is approved but has not been issued yet.
        </p>
      )}

      {position.releaseState === "partially_released" && (
        <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          {money(position.remainingReleasableAmount)} of the approved Advance is still available to issue.
        </p>
      )}

      {position.varianceAmount !== 0 && (
        <p className="mt-4 text-xs text-gray-600">
          Outstanding difference {money(position.varianceAmount)}
        </p>
      )}

      {canRecord && !form && (
        <button
          type="button"
          onClick={startIssuing}
          className="mt-4 min-h-11 w-full rounded-md bg-botanique-green px-3 text-sm font-semibold text-white sm:w-auto sm:px-5"
        >
          Issue advance
        </button>
      )}

      {form && (
        <form
          className="mt-4 grid gap-3 rounded-md border border-stone-200 bg-stone-50 p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const result = await onRecord(form);
            if (result?.ok) setForm(null);
          }}
        >
          <p className="text-sm font-semibold">Record money issued</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Amount issued
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.releasedAmount}
                onChange={(event) => setForm({ ...form, releasedAmount: event.target.value })}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
              />
              <span className="mt-1 block text-xs text-gray-500">
                Up to {money(position.remainingReleasableAmount)}
              </span>
            </label>
            <label className="block text-sm font-medium">Date issued
              <input
                type="date"
                required
                max={today()}
                value={form.releasedAt}
                onChange={(event) => setForm({ ...form, releasedAt: event.target.value })}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">Accountable person
            <input
              value={actorName(request.custodianProfileId)}
              readOnly
              className="mt-1 w-full rounded-md border border-stone-300 bg-stone-100 px-3 py-2.5"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">Method
              <select
                value={form.paymentChannel}
                onChange={(event) => setForm({ ...form, paymentChannel: event.target.value })}
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
              >
                {Object.entries(PAYMENT_CHANNELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium">Reference (optional)
              <input
                type="text"
                maxLength={120}
                value={form.paymentReference}
                onChange={(event) => setForm({ ...form, paymentReference: event.target.value })}
                placeholder="M-Pesa code or bank reference"
                className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
              />
            </label>
          </div>

          <label className="block text-sm font-medium">Note (optional)
            <textarea
              rows={2}
              maxLength={2000}
              value={form.note}
              onChange={(event) => setForm({ ...form, note: event.target.value })}
              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
            />
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="submit"
              disabled={working}
              className="min-h-11 rounded-md bg-botanique-green px-5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Record advance issued
            </button>
            <button
              type="button"
              onClick={() => setForm(null)}
              className="min-h-11 rounded-md border border-stone-300 px-5 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {releases.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold">Advance history</h3>
          <ul className="mt-2 divide-y divide-stone-100 border-t border-stone-100">
            {releases.map((release) => {
              const account = acquittalForRelease(release.id);
              const outcome = acquittalOutcome(account);
              const expanded = openRelease === release.id;
              const reversed = release.status === "reversed";
              return (
                <li key={release.id} className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpenRelease(expanded ? "" : release.id)}
                    className="flex w-full items-start justify-between gap-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className={`block text-sm font-medium ${reversed ? "text-gray-400 line-through" : ""}`}>
                        {money(release.releasedAmount)} · {actorName(release.recipientProfileId)}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {day(release.releasedAt)} · {PAYMENT_CHANNELS[release.paymentChannel]}
                        {reversed && " · reversed"}
                      </span>
                    </span>
                    <span aria-hidden className="shrink-0 text-xs text-gray-400">
                      {expanded ? "▲" : "▼"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="mt-3 space-y-3 rounded-md bg-stone-50 p-3 text-sm">
                      <p className="text-xs text-gray-600">
                        {release.releaseNumber} · recorded by {actorName(release.recordedBy)}
                        {release.paymentReference && <> · reference {release.paymentReference}</>}
                      </p>
                      {release.note && <p className="text-gray-700">{release.note}</p>}
                      {reversed && (
                        <p className="rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-800">
                          Reversed: {release.reversalReason}
                        </p>
                      )}
                      {release.receiptConfirmedAt && (
                        <p className="text-xs text-gray-600">
                          Receipt confirmed by {actorName(release.receiptConfirmedBy)}.
                        </p>
                      )}

                      {canConfirmFundReleaseReceipt(release, currentUserId) && (
                        <button
                          type="button"
                          disabled={working}
                          onClick={() => onConfirmReceipt(release.id, release.version)}
                          className="min-h-11 w-full rounded-md border border-stone-300 bg-white px-3 text-sm font-semibold sm:w-auto sm:px-4"
                        >
                          Confirm I received this
                        </button>
                      )}

                      {account && (
                        <div className="rounded-md border border-stone-200 bg-white p-3">
                          <p className="text-xs font-semibold">Accounting · {plainAccountRecordState(account.state)}</p>
                          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
                            <Figure label="Spent" value={money(outcome.spent)} />
                            <Figure label="Returned" value={money(outcome.returned)} />
                            {outcome.unaccounted > 0 && (
                              <Figure label="Still to account for" value={money(outcome.unaccounted)} tone="text-red-700" />
                            )}
                            {outcome.additionalRequired > 0 && (
                              <Figure label="Spent above advance" value={money(outcome.additionalRequired)} tone="text-amber-800" />
                            )}
                          </dl>
                          <ul className="mt-3 space-y-1 border-t border-stone-100 pt-2 text-xs text-gray-700">
                            {linesForAcquittal(account.id).map((line) => (
                              <li key={line.id} className="flex justify-between gap-3">
                                <span className="min-w-0 truncate">
                                  {line.description} · {CATEGORIES[line.category]}
                                </span>
                                <span className="shrink-0 font-medium">{money(line.amount)}</span>
                              </li>
                            ))}
                          </ul>
                          {account.evidenceReference && (
                            <p className="mt-2 text-xs text-gray-500">Evidence: {account.evidenceReference}</p>
                          )}
                          {account.varianceOverrideReason && (
                            <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-950">
                              Accepted with a difference of {money(outcome.variance)}: {account.varianceOverrideReason}
                            </p>
                          )}

                          {canDecideFundAcquittal(account, role, currentUserId) && (
                            <div className="mt-3 grid gap-2 border-t border-stone-100 pt-3">
                              <label className="block text-xs font-medium">
                                {acceptanceRequiresReason(account)
                                  ? "This does not balance. A reason is required to accept it."
                                  : "Reason (optional)"}
                                <textarea
                                  rows={2}
                                  value={decisionReason}
                                  onChange={(event) => setDecisionReason(event.target.value)}
                                  className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                                />
                              </label>
                              <div className="grid gap-2 sm:grid-cols-2">
                                <button
                                  type="button"
                                  disabled={working || (acceptanceRequiresReason(account) && !decisionReason.trim())}
                                  onClick={async () => {
                                    const result = await onDecideAcquittal(
                                      account.id, account.version, "accepted", decisionReason);
                                    if (result?.ok) setDecisionReason("");
                                  }}
                                  className="min-h-11 rounded-md bg-botanique-green px-3 text-sm font-semibold text-white disabled:opacity-50"
                                >
                                  Accept accounting
                                </button>
                                <button
                                  type="button"
                                  disabled={working || !decisionReason.trim()}
                                  onClick={async () => {
                                    const result = await onDecideAcquittal(
                                      account.id, account.version, "amendment_requested", decisionReason);
                                    if (result?.ok) setDecisionReason("");
                                  }}
                                  className="min-h-11 rounded-md border border-amber-400 px-3 text-sm font-semibold text-amber-900 disabled:opacity-50"
                                >
                                  Return for correction
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {canSubmitFundAcquittal(release, account, currentUserId) && accountingFor !== release.id && (
                        <button
                          type="button"
                          onClick={() => startAccounting(release, account)}
                          className="min-h-11 w-full rounded-md bg-botanique-green px-3 text-sm font-semibold text-white sm:w-auto sm:px-4"
                        >
                          {account ? "Revise accounting" : "Account for this advance"}
                        </button>
                      )}

                      {accountingFor === release.id && (
                        <form
                          className="grid gap-3 rounded-md border border-stone-200 bg-white p-3"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            const result = await onSubmitAcquittal(
                              release.id,
                              account ? account.version : release.version,
                              {
                                lines,
                                returnedAmount: returned || 0,
                                evidenceReference: evidence,
                              }
                            );
                            if (result?.ok) setAccountingFor("");
                          }}
                        >
                          <p className="text-xs font-semibold">What was this advance used for?</p>
                          {lines.map((line, index) => (
                            <div key={index} className="grid gap-2 border-t border-stone-100 pt-2 first:border-0 first:pt-0 sm:grid-cols-[1fr_auto]">
                              <input
                                type="text"
                                required
                                maxLength={500}
                                value={line.description}
                                placeholder="What was bought or paid for"
                                onChange={(event) => setLines(lines.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, description: event.target.value } : item))}
                                className="w-full rounded-md border border-stone-300 px-3 py-2.5 text-sm"
                              />
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-[auto_auto]">
                                <select
                                  value={line.category}
                                  onChange={(event) => setLines(lines.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, category: event.target.value } : item))}
                                  className="rounded-md border border-stone-300 px-2 py-2.5 text-sm"
                                >
                                  {Object.entries(CATEGORIES).map(([key, label]) => (
                                    <option key={key} value={key}>{label}</option>
                                  ))}
                                </select>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  required
                                  value={line.amount}
                                  placeholder="Amount"
                                  onChange={(event) => setLines(lines.map((item, itemIndex) =>
                                    itemIndex === index ? { ...item, amount: event.target.value } : item))}
                                  className="rounded-md border border-stone-300 px-2 py-2.5 text-sm"
                                />
                              </div>
                              <input
                                type="date"
                                required
                                value={line.spentOn}
                                onChange={(event) => setLines(lines.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, spentOn: event.target.value } : item))}
                                className="w-full rounded-md border border-stone-300 px-3 py-2.5 text-sm sm:col-span-2"
                              />
                            </div>
                          ))}

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => setLines([...lines, { ...emptyLine(), spentOn: String(release.releasedAt).slice(0, 10) }])}
                              className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-semibold"
                            >
                              Add item
                            </button>
                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setLines(lines.slice(0, -1))}
                                className="min-h-11 rounded-md border border-stone-300 px-3 text-sm font-semibold"
                              >
                                Remove last
                              </button>
                            )}
                          </div>

                          <label className="block text-sm font-medium">Amount returned
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={returned}
                              onChange={(event) => setReturned(event.target.value)}
                              placeholder="0"
                              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
                            />
                          </label>

                          <label className="block text-sm font-medium">Evidence reference (optional)
                            <input
                              type="text"
                              maxLength={500}
                              value={evidence}
                              onChange={(event) => setEvidence(event.target.value)}
                              placeholder="Where the receipts or statement can be found"
                              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2.5"
                            />
                          </label>

                          <p className="text-xs text-gray-600">
                            Issued {money(release.releasedAmount)} · spent {money(spend)} · returned {money(Number(returned) || 0)} ·{" "}
                            <strong>
                              {(() => {
                                const variance = Math.round(
                                  (release.releasedAmount - spend - (Number(returned) || 0)) * 100
                                ) / 100;
                                if (variance === 0) return "fully accounted for";
                                if (variance > 0) return `${money(variance)} still to account for`;
                                return `${money(Math.abs(variance))} spent above the advance`;
                              })()}
                            </strong>
                          </p>

                          <div className="flex flex-col gap-2 sm:flex-row">
                            <button
                              type="submit"
                              disabled={working}
                              className="min-h-11 rounded-md bg-botanique-green px-5 text-sm font-semibold text-white disabled:opacity-50"
                            >
                              Submit accounting
                            </button>
                            <button
                              type="button"
                              onClick={() => setAccountingFor("")}
                              className="min-h-11 rounded-md border border-stone-300 px-5 text-sm font-semibold"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}

                      {canReverseFundRelease(release, role, account) && (
                        <div className="grid gap-2 border-t border-stone-200 pt-3">
                          <label className="block text-xs font-medium">
                            Reversing keeps this issued amount visible in history. A reason is required.
                            <textarea
                              rows={2}
                              value={reversalReason}
                              onChange={(event) => setReversalReason(event.target.value)}
                              className="mt-1 w-full rounded-md border border-stone-300 px-3 py-2"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={working || !reversalReason.trim()}
                            onClick={async () => {
                              const result = await onReverse(release.id, release.version, reversalReason);
                              if (result?.ok) setReversalReason("");
                            }}
                            className="min-h-11 rounded-md border border-red-300 px-3 text-sm font-semibold text-red-700 disabled:opacity-50 sm:w-auto sm:justify-self-start sm:px-4"
                          >
                            Reverse issued amount
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function plainIssueState(state) {
  if (state === "none") return "Not issued";
  if (state === "partially_released") return "Partly issued";
  if (state === "fully_released") return "Fully issued";
  return "Issued";
}

function plainAccountingState(state) {
  if (state === "not_required") return "No accounting yet";
  if (state === "outstanding") return "Not yet accounted for";
  if (state === "submitted") return "Submitted for review";
  if (state === "amendment_requested") return "Returned for correction";
  if (state === "accepted") return "Accounted for";
  return "Accounting";
}

function plainAccountRecordState(state) {
  if (state === "accepted") return "Accounted for";
  if (state === "amendment_requested") return "Returned for correction";
  if (state === "submitted") return "Submitted for review";
  return "Accounting";
}
