import { useMemo, useState } from "react";
import { useAdminData } from "../context/adminData";
import { useInventory } from "../context/inventory";
import ToolVisual from "../components/ToolVisual";
import {
  BOTANIQUE_CUSTODY, CATALOGUE_EVENT_LABELS, EQUIPMENT_CONDITIONS,
  EQUIPMENT_CONDITION_CLASSES, EQUIPMENT_EVENT_LABELS, EQUIPMENT_STATUS_CLASSES,
  OWNERSHIP_TYPES, canManageInventory, canSeeInventory, canUsePrincipalInventoryActions,
  conditionLabel, equipmentActionsFor, movementLabel, ownershipLabel, positionLabel,
  statusLabel, trackingMethodLabel,
} from "../utils/inventoryCapabilities";
import { QUICK_ADD_ITEMS } from "../utils/toolVisuals";

const TABS = [
  { id: "catalogue", label: "Catalogue" },
  { id: "assets", label: "Equipment assets" },
  { id: "stock", label: "Stock positions" },
  { id: "history", label: "History" },
];

const showDate = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(`${String(value).slice(0, 10)}T00:00:00`))
  : "—";

const showMoment = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value))
  : "—";

const showQuantity = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Number.isInteger(number) ? String(number) : String(number).replace(/0+$/, "").replace(/\.$/, "");
};

function Metric({ label, value }) {
  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 py-4">
      <p className="text-[11px] font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-[22px] font-semibold tabular-nums text-botanique-charcoal">{value}</p>
    </div>
  );
}

function Chip({ children, className }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${className}`}>{children}</span>;
}

function StatusChip({ status }) {
  return <Chip className={EQUIPMENT_STATUS_CLASSES[status] || "bg-stone-100 text-gray-700"}>{statusLabel(status)}</Chip>;
}

function ConditionChip({ condition }) {
  return <Chip className={EQUIPMENT_CONDITION_CLASSES[condition] || "bg-stone-100 text-gray-700"}>{conditionLabel(condition)}</Chip>;
}

function Empty({ children }) {
  return <p className="px-4 py-10 text-center text-sm text-gray-500">{children}</p>;
}

// Full-width sheet on mobile, contained dialog on desktop.
function Sheet({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-0 sm:items-center sm:p-4">
      <div role="dialog" aria-label={title} className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white sm:max-w-lg sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
          <h3 className="text-base font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="min-h-9 rounded-lg px-2 text-sm font-semibold text-gray-500">Close</button>
        </div>
        <div className="px-4 py-4">{children}</div>
      </div>
    </div>
  );
}

const field = "mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm";
const primary = "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto";

export default function AdminInventory() {
  const { role } = useAdminData();
  const {
    items, assets, positions, activity, sites, people, summary, status, error,
    addItem, registerAsset, assetAction, recordStock, siteName, personName, itemFor,
  } = useInventory();

  const [tab, setTab] = useState("assets");
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  const manage = canManageInventory(role);
  const principal = canUsePrincipalInventoryActions(role);

  const activeItems = useMemo(() => items.filter((item) => item.isActive), [items]);
  const assetItems = useMemo(() => activeItems.filter((item) => item.trackingMethod === "asset"), [activeItems]);
  const stockItems = useMemo(() => activeItems.filter((item) => item.trackingMethod === "stock"), [activeItems]);

  const assetRows = useMemo(() => assets.map((asset) => {
    const item = itemFor(asset.itemId);
    return {
      ...asset,
      itemName: item?.itemName || "Unknown item",
      siteLabel: asset.currentSiteId ? siteName(asset.currentSiteId) : BOTANIQUE_CUSTODY,
      custodianLabel: asset.custodianPersonId ? personName(asset.custodianPersonId) : "",
    };
  }), [assets, itemFor, siteName, personName]);

  if (!canSeeInventory(role)) {
    return (
      <section className="space-y-2">
        <h1 className="text-2xl font-semibold">Tools &amp; Equipment unavailable</h1>
        <p className="text-sm text-gray-600">This area is not part of your role.</p>
      </section>
    );
  }

  function openSheet(kind, context = {}) {
    setFormError("");
    setSheet({ kind, ...context });
    if (kind === "addItem") setForm({ itemName: "", category: "", trackingMethod: "asset", unitOfMeasure: "unit", notes: "" });
    else if (kind === "registerAsset") setForm({ itemId: context.itemId || "", assetCode: "", ownershipType: "owned", condition: "good", siteId: "", acquiredOn: "", notes: "" });
    else if (kind === "stock") setForm({ itemId: context.itemId || "", mode: "receipt", movementType: "received", quantity: "", fromSiteId: "", toSiteId: "", siteId: "", personId: "", reason: "", note: "" });
    else setForm({ siteId: "", custodianPersonId: "", expectedReturnDate: "", condition: "", reason: "", note: "" });
  }

  function closeSheet() { setSheet(null); setFormError(""); }

  async function submit(operation) {
    setFormError(""); setSaving(true);
    const result = await operation();
    setSaving(false);
    if (!result?.ok) return setFormError(result?.error || "That did not complete.");
    closeSheet();
  }

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-botanique-green">Operations</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight">Tools &amp; Equipment</h1>
          <p className="mt-1 text-sm text-gray-600">Manage equipment assets and stock across all operational sites.</p>
        </div>
        {manage && (
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => openSheet("addItem")} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 text-sm font-semibold text-botanique-charcoal">Add item</button>
            <button type="button" onClick={() => openSheet("registerAsset")} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white">Register equipment</button>
          </div>
        )}
      </header>

      <div className="grid gap-3 grid-cols-2 xl:grid-cols-4">
        <Metric label="Catalogue items" value={summary.catalogueItems} />
        <Metric label="Assets in circulation" value={summary.assetsInCirculation} />
        <Metric label="Under repair" value={summary.underRepair} />
        <Metric label="Active stock positions" value={summary.activeStockPositions} />
      </div>

      {status === "loading" && <p className="text-sm text-gray-600">Loading…</p>}
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <section aria-label="Inventory register" className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 pt-4">
            <h2 className="text-lg font-semibold">Inventory register</h2>
            <div className="mt-3 -mb-px flex gap-1 overflow-x-auto">
              {TABS.map((entry) => (
                <button
                  key={entry.id} type="button" onClick={() => setTab(entry.id)}
                  aria-current={tab === entry.id ? "page" : undefined}
                  className={`shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium ${tab === entry.id ? "border-botanique-green text-botanique-green" : "border-transparent text-gray-500"}`}
                >{entry.label}</button>
              ))}
            </div>
          </div>

          {tab === "assets" && (assetRows.length === 0
            ? <Empty>No equipment registered yet.</Empty>
            : <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[860px] text-left text-sm">
                  <thead className="bg-stone-50 text-[11px] uppercase tracking-wide text-gray-500">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Asset / item</th>
                      <th scope="col" className="px-3 py-2 font-medium">Asset code</th>
                      <th scope="col" className="px-3 py-2 font-medium">Status</th>
                      <th scope="col" className="px-3 py-2 font-medium">Condition</th>
                      <th scope="col" className="px-3 py-2 font-medium">Current Site</th>
                      <th scope="col" className="px-3 py-2 font-medium">Custodian</th>
                      <th scope="col" className="px-3 py-2 font-medium">Expected return</th>
                      <th scope="col" className="px-3 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {assetRows.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-2.5">
                          <span className="flex items-center gap-2.5">
                            <ToolVisual name={row.itemName} size="sm" />
                            <span className="font-medium text-botanique-charcoal">{row.itemName}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-gray-700">{row.assetCode}</td>
                        <td className="px-3 py-2.5"><StatusChip status={row.status} /></td>
                        <td className="px-3 py-2.5"><ConditionChip condition={row.condition} /></td>
                        <td className="px-3 py-2.5 text-gray-700">{row.siteLabel}</td>
                        <td className="px-3 py-2.5 text-gray-700">{row.custodianLabel || "—"}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap text-gray-700">{showDate(row.expectedReturnDate)}</td>
                        <td className="px-3 py-2.5">
                          <button type="button" onClick={() => openSheet("asset", { asset: row })} className="min-h-9 rounded-lg border border-stone-300 px-3 text-xs font-semibold text-botanique-charcoal">View</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-stone-100 lg:hidden">
                {assetRows.map((row) => (
                  <li key={row.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <ToolVisual name={row.itemName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-botanique-charcoal">{row.itemName}</p>
                        <p className="mt-0.5 text-xs tabular-nums text-gray-500">{row.assetCode}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          <StatusChip status={row.status} />
                          <ConditionChip condition={row.condition} />
                        </div>
                        <dl className="mt-2 grid grid-cols-1 gap-x-3 gap-y-1 text-xs text-gray-600 sm:grid-cols-2">
                          <div className="flex gap-1"><dt className="text-gray-500">Site:</dt><dd className="min-w-0 truncate">{row.siteLabel}</dd></div>
                          <div className="flex gap-1"><dt className="text-gray-500">Custodian:</dt><dd className="min-w-0 truncate">{row.custodianLabel || "—"}</dd></div>
                          <div className="flex gap-1"><dt className="text-gray-500">Expected return:</dt><dd>{showDate(row.expectedReturnDate)}</dd></div>
                        </dl>
                        <button type="button" onClick={() => openSheet("asset", { asset: row })} className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-stone-300 px-3 text-xs font-semibold">View</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>)}

          {tab === "catalogue" && (items.length === 0
            ? <Empty>No catalogue items yet.</Empty>
            : <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <ToolVisual name={item.itemName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-botanique-charcoal">{item.itemName}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {item.category.replace(/_/g, " ")} · {trackingMethodLabel(item.trackingMethod)}
                      {item.trackingMethod === "stock" ? ` · ${item.unitOfMeasure.replace(/_/g, " ")}` : ""}
                    </p>
                  </div>
                  {!item.isActive && <Chip className="bg-stone-100 text-gray-600">Inactive</Chip>}
                  {manage && item.isActive && (
                    <button
                      type="button"
                      onClick={() => openSheet(item.trackingMethod === "asset" ? "registerAsset" : "stock", { itemId: item.id })}
                      className="min-h-9 shrink-0 rounded-lg border border-stone-300 px-3 text-xs font-semibold"
                    >{item.trackingMethod === "asset" ? "Register asset" : "Record stock"}</button>
                  )}
                </li>
              ))}
            </ul>)}

          {tab === "stock" && (positions.length === 0
            ? <Empty>No stock positions yet.</Empty>
            : <ul className="divide-y divide-stone-100">
              {positions.map((position) => (
                <li key={`${position.itemId}-${position.siteId || "custody"}`} className="flex items-center gap-3 px-4 py-3">
                  <ToolVisual name={position.itemName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-botanique-charcoal">{position.itemName}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{positionLabel(position.siteName)}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums">
                    {showQuantity(position.quantity)} <span className="text-xs font-normal text-gray-500">{position.unitOfMeasure.replace(/_/g, " ")}</span>
                  </p>
                </li>
              ))}
            </ul>)}

          {tab === "history" && (activity.length === 0
            ? <Empty>Activity appears here as you use the register.</Empty>
            : <ul className="divide-y divide-stone-100">
              {activity.map((entry) => (
                <li key={`${entry.kind}-${entry.id}`} className="px-4 py-3">
                  <p className="text-sm font-medium text-botanique-charcoal">{activityTitle(entry, { assets, itemFor })}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{showMoment(entry.occurredAt)}{entry.reason ? ` · ${entry.reason}` : ""}</p>
                </li>
              ))}
            </ul>)}
        </section>

        <div className="grid gap-4 min-w-0">
          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Stock positions</h2>
              {positions.length > 0 && <button type="button" onClick={() => setTab("stock")} className="text-xs font-semibold text-botanique-green">View all</button>}
            </div>
            {positions.length === 0
              ? <p className="px-4 py-6 text-sm text-gray-500">No stock positions yet.</p>
              : <ul className="divide-y divide-stone-100">
                {positions.slice(0, 5).map((position) => (
                  <li key={`panel-${position.itemId}-${position.siteId || "custody"}`} className="flex items-center gap-2.5 px-4 py-2.5">
                    <ToolVisual name={position.itemName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-botanique-charcoal">{position.itemName}</p>
                      <p className="truncate text-xs text-gray-500">{positionLabel(position.siteName)}</p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold tabular-nums">{showQuantity(position.quantity)}</p>
                  </li>
                ))}
              </ul>}
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="border-b border-stone-200 px-4 py-3"><h2 className="text-sm font-semibold">Recent activity</h2></div>
            {activity.length === 0
              ? <p className="px-4 py-6 text-sm text-gray-500">Activity appears here as you use the register.</p>
              : <ul className="divide-y divide-stone-100">
                {activity.slice(0, 6).map((entry) => (
                  <li key={`recent-${entry.kind}-${entry.id}`} className="px-4 py-2.5">
                    <p className="truncate text-sm text-botanique-charcoal">{activityTitle(entry, { assets, itemFor })}</p>
                    <p className="mt-0.5 text-xs text-gray-500">{showMoment(entry.occurredAt)}</p>
                  </li>
                ))}
              </ul>}
          </section>
        </div>
      </div>

      {sheet?.kind === "addItem" && (
        <Sheet title="Add catalogue item" onClose={closeSheet}>
          <p className="text-xs text-gray-500">Choose a common item to prefill this form, then save to create it. Nothing is created until you save.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_ADD_ITEMS.map((choice) => (
              <button
                key={choice.name} type="button"
                onClick={() => setForm({ itemName: choice.name, category: choice.category, trackingMethod: choice.trackingMethod, unitOfMeasure: choice.unitOfMeasure, notes: "" })}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-botanique-charcoal"
              >
                <ToolVisual name={choice.name} size="sm" className="!h-5 !w-5 !border-0 !bg-transparent" />
                {choice.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium">Item name
              <input value={form.itemName || ""} onChange={(event) => setForm({ ...form, itemName: event.target.value })} className={field} maxLength={160} />
            </label>
            <label className="text-sm font-medium">Tracking method
              <select value={form.trackingMethod || "asset"} onChange={(event) => setForm({ ...form, trackingMethod: event.target.value, unitOfMeasure: event.target.value === "asset" ? "unit" : (form.unitOfMeasure || "") })} className={field}>
                <option value="asset">Individual equipment asset</option>
                <option value="stock">Quantity stock</option>
              </select>
            </label>
            <label className="text-sm font-medium">Category
              <input value={form.category || ""} onChange={(event) => setForm({ ...form, category: event.target.value })} className={field} maxLength={80} placeholder="e.g. power tools" />
            </label>
            {form.trackingMethod === "stock" && (
              <label className="text-sm font-medium">Unit of measure
                <input value={form.unitOfMeasure || ""} onChange={(event) => setForm({ ...form, unitOfMeasure: event.target.value })} className={field} maxLength={40} placeholder="e.g. bag, metre, litre" />
              </label>
            )}
            <label className="text-sm font-medium">Notes (optional)
              <input value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={field} maxLength={2000} />
            </label>
          </div>
          {formError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
          <button type="button" disabled={saving} onClick={() => submit(() => addItem(form))} className={`mt-4 ${primary}`}>{saving ? "Saving…" : "Save item"}</button>
        </Sheet>
      )}

      {sheet?.kind === "registerAsset" && (
        <Sheet title="Register equipment" onClose={closeSheet}>
          {assetItems.length === 0
            ? <p className="text-sm text-gray-600">Add an equipment catalogue item first — equipment is registered against a catalogue item.</p>
            : <>
              <div className="grid gap-3">
                <label className="text-sm font-medium">Equipment item
                  <select value={form.itemId || ""} onChange={(event) => setForm({ ...form, itemId: event.target.value })} className={field}>
                    <option value="">Choose the item</option>
                    {assetItems.map((item) => <option key={item.id} value={item.id}>{item.itemName}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Asset code
                  <input value={form.assetCode || ""} onChange={(event) => setForm({ ...form, assetCode: event.target.value })} className={field} maxLength={64} placeholder="e.g. BD-LM-001" />
                </label>
                <label className="text-sm font-medium">Condition
                  <select value={form.condition || "good"} onChange={(event) => setForm({ ...form, condition: event.target.value })} className={field}>
                    {EQUIPMENT_CONDITIONS.map((value) => <option key={value} value={value}>{conditionLabel(value)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Ownership
                  <select value={form.ownershipType || "owned"} onChange={(event) => setForm({ ...form, ownershipType: event.target.value })} className={field}>
                    {OWNERSHIP_TYPES.map((value) => <option key={value} value={value}>{ownershipLabel(value)}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Current Site (optional)
                  <select value={form.siteId || ""} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={field}>
                    <option value="">{BOTANIQUE_CUSTODY}</option>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">Acquired on (optional)
                  <input type="date" value={form.acquiredOn || ""} onChange={(event) => setForm({ ...form, acquiredOn: event.target.value })} className={field} />
                </label>
                <label className="text-sm font-medium">Notes (optional)
                  <input value={form.notes || ""} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={field} maxLength={2000} />
                </label>
              </div>
              {formError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
              <button type="button" disabled={saving} onClick={() => submit(() => registerAsset(form))} className={`mt-4 ${primary}`}>{saving ? "Saving…" : "Register equipment"}</button>
            </>}
        </Sheet>
      )}

      {sheet?.kind === "asset" && (
        <Sheet title={sheet.asset.itemName} onClose={closeSheet}>
          <div className="flex items-start gap-3">
            <ToolVisual name={sheet.asset.itemName} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">{sheet.asset.assetCode}</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                <StatusChip status={sheet.asset.status} />
                <ConditionChip condition={sheet.asset.condition} />
              </div>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div><dt className="text-xs text-gray-500">Current Site</dt><dd className="truncate">{sheet.asset.siteLabel}</dd></div>
            <div><dt className="text-xs text-gray-500">Custodian</dt><dd className="truncate">{sheet.asset.custodianLabel || "—"}</dd></div>
            <div><dt className="text-xs text-gray-500">Expected return</dt><dd>{showDate(sheet.asset.expectedReturnDate)}</dd></div>
            <div><dt className="text-xs text-gray-500">Ownership</dt><dd>{ownershipLabel(sheet.asset.ownershipType)}</dd></div>
          </dl>

          {sheet.action
            ? <AssetActionForm
              action={sheet.action} asset={sheet.asset} sites={sites} people={people}
              form={form} setForm={setForm} formError={formError} saving={saving}
              onCancel={() => { setSheet({ ...sheet, action: null }); setFormError(""); }}
              onSubmit={() => submit(() => assetAction(sheet.action.id, sheet.asset.id, sheet.asset.version, form))}
            />
            : <div className="mt-4 flex flex-wrap gap-2">
              {equipmentActionsFor(sheet.asset.status, role).map((action) => (
                <button
                  key={action.id} type="button"
                  onClick={() => { setForm({ siteId: "", custodianPersonId: "", expectedReturnDate: "", condition: "", reason: "", note: "" }); setFormError(""); setSheet({ ...sheet, action }); }}
                  className={`inline-flex min-h-10 items-center rounded-lg px-3 text-xs font-semibold ${action.principal ? "border border-rose-200 text-rose-700" : "border border-stone-300 text-botanique-charcoal"}`}
                >{action.label}</button>
              ))}
              {equipmentActionsFor(sheet.asset.status, role).length === 0 && (
                <p className="text-sm text-gray-500">{sheet.asset.status === "retired" ? "This asset is retired and read-only." : "No action is available to your role."}</p>
              )}
            </div>}
        </Sheet>
      )}

      {sheet?.kind === "stock" && (
        <Sheet title="Record stock movement" onClose={closeSheet}>
          {stockItems.length === 0
            ? <p className="text-sm text-gray-600">Add a quantity-stock catalogue item first.</p>
            : <StockForm
              items={stockItems} sites={sites} people={people} principal={principal}
              form={form} setForm={setForm} formError={formError} saving={saving}
              onSubmit={() => submit(() => recordStock(form.mode, form))}
            />}
        </Sheet>
      )}
    </section>
  );
}

function activityTitle(entry, { assets, itemFor }) {
  if (entry.kind === "equipment") {
    const asset = assets.find((row) => row.id === entry.assetId);
    const item = asset ? itemFor(asset.itemId) : null;
    const label = EQUIPMENT_EVENT_LABELS[entry.eventType] || entry.eventType;
    return `${label} — ${item?.itemName || "Equipment"}${asset ? ` (${asset.assetCode})` : ""}`;
  }
  if (entry.kind === "catalogue") {
    const item = itemFor(entry.itemId);
    return `${CATALOGUE_EVENT_LABELS[entry.eventType] || entry.eventType} — ${item?.itemName || "Item"}`;
  }
  const item = itemFor(entry.itemId);
  return `${movementLabel(entry.movementType)} — ${item?.itemName || "Stock"} × ${showQuantity(entry.quantity)}`;
}

function AssetActionForm({ action, asset, sites, people, form, setForm, formError, saving, onCancel, onSubmit }) {
  const activePeople = people.filter((person) => person.isActive);
  const needsSite = action.id === "issue" || action.id === "transfer";
  const needsCondition = action.id === "condition" || action.id === "return_repair";
  const needsReason = action.id === "lost" || action.id === "retire";
  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <p className="text-sm font-semibold">{action.label}</p>
      <div className="mt-3 grid gap-3">
        {needsSite && (
          <label className="text-sm font-medium">{action.id === "issue" ? "Site this equipment is going to" : "Destination Site"}
            <select value={form.siteId || ""} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={field}>
              <option value="">Choose a Site</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}
        {needsSite && (
          <>
            <label className="text-sm font-medium">Custodian (optional)
              <select value={form.custodianPersonId || ""} onChange={(event) => setForm({ ...form, custodianPersonId: event.target.value })} className={field}>
                <option value="">No named custodian</option>
                {activePeople.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">Expected return (optional)
              <input type="date" value={form.expectedReturnDate || ""} onChange={(event) => setForm({ ...form, expectedReturnDate: event.target.value })} className={field} />
            </label>
          </>
        )}
        {action.id === "return" && (
          <label className="text-sm font-medium">Observed condition (optional)
            <select value={form.condition || ""} onChange={(event) => setForm({ ...form, condition: event.target.value })} className={field}>
              <option value="">Unchanged — {conditionLabel(asset.condition)}</option>
              {EQUIPMENT_CONDITIONS.map((value) => <option key={value} value={value}>{conditionLabel(value)}</option>)}
            </select>
          </label>
        )}
        {needsCondition && (
          <label className="text-sm font-medium">{action.id === "return_repair" ? "Condition it came back in" : "New condition"}
            <select value={form.condition || ""} onChange={(event) => setForm({ ...form, condition: event.target.value })} className={field}>
              <option value="">Choose a condition</option>
              {EQUIPMENT_CONDITIONS.map((value) => <option key={value} value={value}>{conditionLabel(value)}</option>)}
            </select>
          </label>
        )}
        {action.id === "return_repair" && (
          <label className="text-sm font-medium">Returns to
            <select value={form.siteId || ""} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={field}>
              <option value="">{BOTANIQUE_CUSTODY}</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}
        {needsReason && (
          <label className="text-sm font-medium">Reason
            <input value={form.reason || ""} onChange={(event) => setForm({ ...form, reason: event.target.value })} className={field} maxLength={1000} />
          </label>
        )}
        {!needsReason && (
          <label className="text-sm font-medium">Note (optional)
            <input value={form.note || ""} onChange={(event) => setForm({ ...form, note: event.target.value })} className={field} maxLength={1000} />
          </label>
        )}
      </div>
      {formError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" disabled={saving} onClick={onSubmit} className={primary}>{saving ? "Saving…" : action.label}</button>
        <button type="button" onClick={onCancel} className="inline-flex min-h-11 items-center justify-center rounded-lg border border-stone-300 px-4 text-sm font-semibold text-gray-600">Back</button>
      </div>
    </div>
  );
}

function StockForm({ items, sites, people, principal, form, setForm, formError, saving, onSubmit }) {
  const activePeople = people.filter((person) => person.isActive);
  const mode = form.mode || "receipt";
  const setMode = (nextMode, movementType) => setForm({ ...form, mode: nextMode, movementType, fromSiteId: "", toSiteId: "", siteId: "" });
  const options = [
    { mode: "receipt", movementType: "received", label: "Receive stock" },
    { mode: "transfer", movementType: "issued", label: "Issue to Site" },
    { mode: "transfer", movementType: "transferred", label: "Transfer Site to Site" },
    { mode: "transfer", movementType: "returned", label: "Return to Botanique" },
    { mode: "usage", movementType: "consumed", label: "Consumed" },
    { mode: "usage", movementType: "damaged", label: "Damaged" },
    { mode: "usage", movementType: "lost", label: "Lost" },
    ...(principal ? [
      { mode: "adjustment", movementType: "adjustment_in", label: "Stocktake adjustment in" },
      { mode: "adjustment", movementType: "adjustment_out", label: "Stocktake adjustment out" },
    ] : []),
  ];
  const movementType = form.movementType || "received";
  const needsReason = ["damaged", "lost", "adjustment_in", "adjustment_out"].includes(movementType);

  return (
    <>
      <div className="grid gap-3">
        <label className="text-sm font-medium">Stock item
          <select value={form.itemId || ""} onChange={(event) => setForm({ ...form, itemId: event.target.value })} className={field}>
            <option value="">Choose the item</option>
            {items.map((item) => <option key={item.id} value={item.id}>{item.itemName}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Movement
          <select
            value={`${mode}:${movementType}`}
            onChange={(event) => { const [nextMode, nextType] = event.target.value.split(":"); setMode(nextMode, nextType); }}
            className={field}
          >
            {options.map((option) => <option key={`${option.mode}:${option.movementType}`} value={`${option.mode}:${option.movementType}`}>{option.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">Quantity
          <input type="number" min="0" step="0.001" value={form.quantity || ""} onChange={(event) => setForm({ ...form, quantity: event.target.value })} className={field} />
        </label>

        {mode === "receipt" && (
          <label className="text-sm font-medium">Received into
            <select value={form.toSiteId || ""} onChange={(event) => setForm({ ...form, toSiteId: event.target.value })} className={field}>
              <option value="">{BOTANIQUE_CUSTODY}</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}

        {mode === "transfer" && movementType === "issued" && (
          <label className="text-sm font-medium">Issued to Site
            <select value={form.toSiteId || ""} onChange={(event) => setForm({ ...form, toSiteId: event.target.value })} className={field}>
              <option value="">Choose a Site</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}

        {mode === "transfer" && movementType === "transferred" && (
          <>
            <label className="text-sm font-medium">From Site
              <select value={form.fromSiteId || ""} onChange={(event) => setForm({ ...form, fromSiteId: event.target.value })} className={field}>
                <option value="">Choose a Site</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium">To Site
              <select value={form.toSiteId || ""} onChange={(event) => setForm({ ...form, toSiteId: event.target.value })} className={field}>
                <option value="">Choose a different Site</option>
                {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
              </select>
            </label>
          </>
        )}

        {mode === "transfer" && movementType === "returned" && (
          <label className="text-sm font-medium">Returned from Site
            <select value={form.fromSiteId || ""} onChange={(event) => setForm({ ...form, fromSiteId: event.target.value })} className={field}>
              <option value="">Choose a Site</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}

        {mode === "usage" && (
          <label className="text-sm font-medium">From position
            <select value={form.fromSiteId || ""} onChange={(event) => setForm({ ...form, fromSiteId: event.target.value })} className={field}>
              <option value="">{BOTANIQUE_CUSTODY}</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}

        {mode === "adjustment" && (
          <label className="text-sm font-medium">Position
            <select value={form.siteId || ""} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={field}>
              <option value="">{BOTANIQUE_CUSTODY}</option>
              {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
            </select>
          </label>
        )}

        {mode !== "adjustment" && (
          <label className="text-sm font-medium">Person (optional)
            <select value={form.personId || ""} onChange={(event) => setForm({ ...form, personId: event.target.value })} className={field}>
              <option value="">No named person</option>
              {activePeople.map((person) => <option key={person.id} value={person.id}>{person.fullName}</option>)}
            </select>
          </label>
        )}

        {needsReason && (
          <label className="text-sm font-medium">Reason
            <input value={form.reason || ""} onChange={(event) => setForm({ ...form, reason: event.target.value })} className={field} maxLength={1000} />
          </label>
        )}
        <label className="text-sm font-medium">Note (optional)
          <input value={form.note || ""} onChange={(event) => setForm({ ...form, note: event.target.value })} className={field} maxLength={1000} />
        </label>
      </div>
      {formError && <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">{formError}</p>}
      <button type="button" disabled={saving} onClick={onSubmit} className={`mt-4 ${primary}`}>{saving ? "Saving…" : "Record movement"}</button>
    </>
  );
}
