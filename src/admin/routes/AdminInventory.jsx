import { useMemo, useState } from "react";
import { useAdminData } from "../context/adminData";
import { useInventory } from "../context/inventory";
import ToolVisual from "../components/ToolVisual";
import InventoryPictogram from "../components/InventoryPictogram";
import {
  BOTANIQUE_CUSTODY, EQUIPMENT_CONDITIONS, INVENTORY_SUMMARY_CARDS,
  EQUIPMENT_CONDITION_CLASSES, EQUIPMENT_STATUS_CLASSES,
  OWNERSHIP_TYPES, canManageInventory, canSeeInventory, canUsePrincipalInventoryActions,
  categoryLabel, conditionLabel, equipmentActionsFor, ownershipLabel,
  positionLabel, statusLabel, trackingMethodLabel, unitLabel,
} from "../utils/inventoryCapabilities";
import { QUICK_ADD_ITEMS } from "../utils/toolVisuals";
import {
  activityGlyphFor, assetCountsForItem, assetSummaryLine, paginationSlots, registerActionLabel,
} from "../utils/inventoryPresentation";

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

// 24-hour, as the authority shows it (10:42, 09:18, 16:05).
const showTime = (value) => value
  ? new Intl.DateTimeFormat("en-KE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(value))
  : "";

// Local calendar day as YYYY-MM-DD. Deliberately not toISOString(), which is
// UTC and would offer yesterday to anyone east of Greenwich — Nairobi included.
function todayKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

const showQuantity = (value) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return Number.isInteger(number) ? String(number) : String(number).replace(/0+$/, "").replace(/\.$/, "");
};

function SummaryCard({ label, value, support, glyph }) {
  return (
    <div className="min-w-0 rounded-xl border border-stone-200 bg-white px-4 py-4">
      <div className="flex items-start gap-3">
        <InventoryPictogram glyph={glyph} />
        <div className="min-w-0">
          <p className="text-[11px] font-medium text-gray-500">{label}</p>
          <p className="mt-0.5 text-[22px] font-semibold leading-tight tabular-nums text-botanique-charcoal">{value}</p>
          <p className="mt-0.5 text-[11px] leading-snug text-gray-500">{support}</p>
        </div>
      </div>
    </div>
  );
}

// A compact ellipsis affordance, as the authority uses, rather than a button
// competing with the row's own content. VERTICAL, as the authority draws it.
// Labelled by asset code so it is not nine identical "More" controls to a
// screen reader.
function RowActions({ assetCode, onOpen }) {
  return (
    <button
      type="button" onClick={onOpen}
      aria-label={`Actions for ${assetCode}`}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-stone-100 hover:text-botanique-charcoal"
    >
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="3" r="1.4" fill="currentColor" />
        <circle cx="8" cy="8" r="1.4" fill="currentColor" />
        <circle cx="8" cy="13" r="1.4" fill="currentColor" />
      </svg>
    </button>
  );
}

// Activity pictograms, in the authority's larger pale-green circle at the same
// weight as the summary cards — not the small grey 24px dots this previously
// used, which read as disabled bullets rather than as events.
//
// The authority keys these on WHAT HAPPENED, not on which table it happened in:
// it shows an out-arrow for "issued", a cube for "transferred", a spanner for
// "sent for repair" and a down-arrow for "consumed". So the mapping below is by
// event, with the row's kind only as the fallback. Event types the authority
// does not literally show reuse the nearest of those four forms rather than
// introducing a fifth drawing.
const ACTIVITY_GLYPHS = {
  // Leaving Botanique's hands.
  out: <><path d="M11 4h5v5" /><path d="M16 4 9.5 10.5" /><path d="M14 12.4V15a1.6 1.6 0 0 1-1.6 1.6H5A1.6 1.6 0 0 1 3.4 15V7.6A1.6 1.6 0 0 1 5 6h2.6" /></>,
  // Moving between places, or a catalogue item itself.
  cube: <><path d="M10 3.2 16.4 6.8 10 10.4 3.6 6.8Z" /><path d="M3.6 6.8v6.4L10 16.8l6.4-3.6V6.8" /><path d="M10 10.4v6.4" /></>,
  // In the workshop.
  repair: <path d="M12.6 3.6a3.4 3.4 0 0 0-3.1 4.7L4.4 13.4a1.5 1.5 0 0 0 2.2 2.2l5.1-5.1a3.4 3.4 0 1 0 .9-6.9Z" />,
  // Coming in, or being used up.
  in: <><path d="M10 3.4v8.2" /><path d="M6.6 8.2 10 11.6l3.4-3.4" /><path d="M3.6 15.2h12.8" /></>,
};

function ActivityIcon({ entry }) {
  const glyph = activityGlyphFor(entry);
  return (
    <span aria-hidden="true" data-activity-icon={glyph} data-activity-kind={entry.kind} className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#eef3f0] text-botanique-green">
      <svg viewBox="0 0 20 20" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" focusable="false">
        {ACTIVITY_GLYPHS[glyph]}
      </svg>
    </span>
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

// The authority shows six asset rows to a desktop page.
const PAGE_SIZE = 6;

// Truthful count posture. With no records it says 0 — it never manufactures
// pagination over an empty register — and the numbered controls appear only
// when there is genuinely more than one page.
function RegisterFooter({ total, page, pageSize, onPage, noun }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  const arrow = "inline-flex h-7 min-w-7 items-center justify-center rounded-md border border-stone-300 px-1.5 text-xs text-botanique-charcoal disabled:opacity-40";
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 px-4 py-2.5">
      <p className="text-xs text-gray-500">
        {total === 0 ? `0 ${noun}s` : `Showing ${from} to ${to} of ${total} ${noun}${total === 1 ? "" : "s"}`}
      </p>
      {pages > 1 && (
        <nav aria-label={`${noun} pages`} className="flex items-center gap-1">
          <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} aria-label="Previous page" className={arrow}>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10 3 5 8l5 5" /></svg>
          </button>
          {paginationSlots(page, pages).map((slot) => (slot.gap
            ? <span key={slot.key} aria-hidden="true" className="px-1 text-xs text-gray-400">…</span>
            : <button
              key={slot.key} type="button" onClick={() => onPage(slot.page)}
              aria-label={`Page ${slot.page + 1}`}
              aria-current={slot.page === page ? "page" : undefined}
              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-md px-1.5 text-xs tabular-nums ${
                slot.page === page
                  ? "bg-botanique-green font-semibold text-white"
                  : "border border-stone-300 text-botanique-charcoal"}`}
            >{slot.page + 1}</button>
          ))}
          <button type="button" disabled={page >= pages - 1} onClick={() => onPage(page + 1)} aria-label="Next page" className={arrow}>
            <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 3 5 5-5 5" /></svg>
          </button>
        </nav>
      )}
    </div>
  );
}

const field = "mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm";
const primary = "inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-botanique-green px-4 text-sm font-semibold text-white disabled:opacity-60 sm:w-auto";

export default function AdminInventory() {
  const { role } = useAdminData();
  const {
    items, assets, positions, activity, selectableSites, people, summary, status, error,
    addItem, registerAsset, assetAction, issueAssets, recordStock, siteName, personName, itemFor,
  } = useInventory();

  const [tab, setTab] = useState("assets");
  const [page, setPage] = useState(0);
  const [sheet, setSheet] = useState(null);
  const [form, setForm] = useState({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

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
      // The authority's second line ("Petrol", "Bosch GBH 2-26 DRE", "25m").
      // It is REAL stored truth or it is absent: the asset's own note first,
      // since it describes this individual machine, then the catalogue item's.
      // Nothing is derived from the name and nothing is invented, so an item
      // recorded without a note simply has one line — which is correct, not a
      // gap to fill.
      description: (asset.notes || item?.notes || "").trim(),
      siteLabel: asset.currentSiteId ? siteName(asset.currentSiteId) : BOTANIQUE_CUSTODY,
      custodianLabel: asset.custodianPersonId ? personName(asset.custodianPersonId) : "",
    };
  }), [assets, itemFor, siteName, personName]);

  // Counts per catalogue item, derived once from the assets already loaded —
  // no extra read, and no stored count that could drift from the register.
  const countsByItem = useMemo(() => {
    const grouped = new Map();
    for (const asset of assets) {
      if (!grouped.has(asset.itemId)) grouped.set(asset.itemId, []);
      grouped.get(asset.itemId).push(asset);
    }
    return grouped;
  }, [assets]);

  const catalogueCounts = (item) => assetCountsForItem(countsByItem.get(item.id) || []);

  const pagedAssets = useMemo(
    () => assetRows.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE),
    [assetRows, page],
  );

  // The authority's Equipment assets header carries NO action — just the title
  // and the tabs. Registration is not a header verb there because it is not a
  // header idea: an asset is always an instance OF a catalogue item, so it
  // originates from that item's own row in Catalogue → Register asset, where
  // the item is already known and the operator is never asked to pick it twice.
  const contextualAction = tab === "catalogue"
    ? { label: "Add item", onClick: () => openSheet("addItem") }
    : tab === "stock"
      ? {
        label: "Record stock",
        onClick: () => openSheet("stock"),
        disabled: stockItems.length === 0,
        hint: stockItems.length === 0 ? "Add a quantity-stock catalogue item first." : "",
      }
      : null;

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
    else if (kind === "registerAsset") setForm({ itemId: context.itemId || "", ownershipType: "owned", condition: "good", siteId: "", acquiredOn: "", notes: "" });
    else if (kind === "stock") setForm({ itemId: context.itemId || "", mode: "receipt", movementType: "received", quantity: "", fromSiteId: "", toSiteId: "", siteId: "", personId: "", reason: "", note: "" });
    else setForm({ siteId: "", custodianPersonId: "", expectedReturnDate: "", condition: "", reason: "", note: "" });
  }

  function closeSheet() { setSheet(null); setFormError(""); }

  // Which other assets may join a handover: available only, and never the one
  // already being acted on.
  function companionsFor(asset) {
    return assetRows.filter((row) => row.status === "available" && row.id !== asset.id);
  }

  // Issuing goes through the canonical multi-asset path — an array of one when
  // nothing else was picked — so a single handover and a group handover are the
  // same operation and cannot drift apart.
  function submitAssetAction(asset, action) {
    if (action.id !== "issue") {
      return assetAction(action.id, asset.id, asset.version, form);
    }
    const chosen = form.alsoAssetIds || [];
    const members = [
      { assetId: asset.id, version: asset.version },
      ...assetRows
        .filter((row) => chosen.includes(row.id))
        .map((row) => ({ assetId: row.id, version: row.version })),
    ];
    return issueAssets(members, form);
  }

  async function submit(operation, onDone) {
    setFormError(""); setSaving(true);
    const result = await operation();
    setSaving(false);
    if (!result?.ok) return setFormError(result?.error || "That did not complete.");
    closeSheet();
    if (onDone) onDone(result);
  }

  // The operator never chose the asset code, so the interface has to tell them
  // what the database issued — otherwise a successful registration just closes
  // and the new identity is something they have to go and look up.
  function announceRegistration(result) {
    const created = Array.isArray(result?.record) ? result.record[0] : result?.record;
    if (created?.asset_code) setNotice(`Asset registered · ${created.asset_code}`);
  }

  return (
    <section className="space-y-4">
      {/* The authority has no uppercase domain eyebrow and no page-level CTAs
          beside the heading — the actions live in the register, next to the
          thing they act on. */}
      <header className="min-w-0">
        <h1 className="text-[28px] font-semibold leading-tight">Tools &amp; Equipment</h1>
        <p className="mt-1 text-sm text-gray-600">Manage equipment assets and stock across all operational sites.</p>
      </header>

      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {INVENTORY_SUMMARY_CARDS.map((card) => (
          <SummaryCard key={card.id} label={card.label} support={card.support} glyph={card.glyph} value={summary[card.id]} />
        ))}
      </div>

      {notice && (
        <p role="status" className="flex items-center justify-between gap-3 rounded-lg border border-[#cfe0d6] bg-[#eef3f0] px-4 py-2.5 text-sm font-medium text-botanique-green">
          {notice}
          <button type="button" onClick={() => setNotice("")} className="text-xs font-semibold underline underline-offset-2">Dismiss</button>
        </p>
      )}

      {status === "loading" && <p className="text-sm text-gray-600">Loading…</p>}
      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error}</p>}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
        <section aria-label="Inventory register" className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="border-b border-stone-200 px-4 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">Inventory register</h2>
              {manage && contextualAction && (
                <button
                  type="button"
                  onClick={contextualAction.onClick}
                  disabled={contextualAction.disabled}
                  title={contextualAction.hint}
                  className="inline-flex min-h-9 items-center rounded-lg border border-stone-300 px-3 text-xs font-semibold text-botanique-charcoal disabled:cursor-not-allowed disabled:opacity-50"
                >{contextualAction.label}</button>
              )}
            </div>
            {manage && contextualAction?.disabled && contextualAction.hint && (
              <p className="mt-1 text-xs text-gray-500">{contextualAction.hint}</p>
            )}
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

          {/* The footer belongs to the tab, not to the rows: an empty register
              still truthfully reports 0 assets rather than hiding its count. */}
          {tab === "assets" && (assetRows.length === 0
            ? <>
              <div className="px-4 py-10 text-center">
                <p className="text-sm text-gray-500">No equipment registered yet.</p>
                {/* A quiet route back rather than a permanent control the
                    authority does not have: equipment is registered from the
                    catalogue item it is an instance of. */}
                {/* Named "Go to Catalogue", not "Catalogue": a second control
                    with the tab's exact accessible name is ambiguous to anyone
                    navigating by name. */}
                {manage && (
                  <p className="mt-1 text-sm text-gray-500">
                    Equipment is registered from its catalogue item.{" "}
                    <button type="button" onClick={() => setTab("catalogue")} className="font-semibold text-botanique-green underline underline-offset-2">Go to Catalogue</button>
                  </p>
                )}
              </div>
              <RegisterFooter total={0} page={0} pageSize={PAGE_SIZE} onPage={setPage} noun="asset" />
            </>
            : <>
              <div className="hidden overflow-x-auto lg:block">
                <table className="w-full min-w-[720px] text-left text-sm">
                  {/* Sentence case, not uppercase: the authority's headers read "Asset /
                        item", "Current site". They also never wrap — the values
                        below may run to three lines, but a wrapped header makes
                        the whole row look broken. */}
                  <thead className="bg-stone-50 text-xs text-gray-500 [&_th]:whitespace-nowrap">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Asset / item</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Asset code</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Status</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Condition</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Current site</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Custodian</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Expected return</th>
                      <th scope="col" className="px-2.5 py-2 font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {pagedAssets.map((row) => (
                      <tr key={row.id}>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-3">
                            <ToolVisual name={row.itemName} size="sm" />
                            <span className="min-w-0">
                              <span className="block font-semibold text-botanique-charcoal">{row.itemName}</span>
                              {row.description && <span className="mt-0.5 block text-xs text-gray-500">{row.description}</span>}
                            </span>
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-2.5 py-3 tabular-nums text-gray-700">{row.assetCode}</td>
                        <td className="px-2.5 py-3"><StatusChip status={row.status} /></td>
                        {/* Plain text, as the authority has it — a second chip
                            beside Status turns every row into two badges. */}
                        <td className="whitespace-nowrap px-2.5 py-3 text-gray-700">{conditionLabel(row.condition)}</td>
                        <td className="px-2.5 py-3 text-gray-700">{row.siteLabel}</td>
                        <td className="px-2.5 py-3 text-gray-700">{row.custodianLabel || "—"}</td>
                        <td className="whitespace-nowrap px-2.5 py-3 text-gray-700">{showDate(row.expectedReturnDate)}</td>
                        <td className="px-2 py-3 text-right">
                          <RowActions assetCode={row.assetCode} onOpen={() => openSheet("asset", { asset: row })} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <ul className="divide-y divide-stone-100 lg:hidden">
                {pagedAssets.map((row) => (
                  <li key={row.id} className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <ToolVisual name={row.itemName} size="md" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-botanique-charcoal">{row.itemName}</p>
                        {row.description && <p className="truncate text-xs text-gray-500">{row.description}</p>}
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

              <RegisterFooter
                total={assetRows.length} page={page} pageSize={PAGE_SIZE}
                onPage={setPage} noun="asset"
              />
            </>)}

          {tab === "catalogue" && (items.length === 0
            ? <Empty>No catalogue items yet.</Empty>
            : <ul className="divide-y divide-stone-100">
              {items.map((item) => (
                <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <ToolVisual name={item.itemName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-botanique-charcoal">{item.itemName}</p>
                    {item.notes && <p className="truncate text-xs text-gray-500">{item.notes}</p>}
                    <p className="mt-0.5 text-xs text-gray-500">
                      {categoryLabel(item.category)} · {trackingMethodLabel(item.trackingMethod)}
                      {item.trackingMethod === "stock" ? ` · ${unitLabel(item.unitOfMeasure)}` : ""}
                    </p>
                    {/* Asset-tracked items only. A stock item is a quantity,
                        not a set of individually identified things, so it has
                        no asset-instance counts and never gains asset codes. */}
                    {item.trackingMethod === "asset" && (
                      <p className="mt-0.5 text-xs font-medium text-botanique-charcoal" data-asset-summary={item.id}>
                        {assetSummaryLine(catalogueCounts(item))}
                      </p>
                    )}
                  </div>
                  {!item.isActive && <Chip className="bg-stone-100 text-gray-600">Inactive</Chip>}
                  {manage && item.isActive && (
                    <button
                      type="button"
                      onClick={() => openSheet(item.trackingMethod === "asset" ? "registerAsset" : "stock", { itemId: item.id })}
                      className="min-h-9 shrink-0 rounded-lg border border-stone-300 px-3 text-xs font-semibold"
                    >{item.trackingMethod === "asset" ? registerActionLabel(catalogueCounts(item).registeredCount) : "Record stock"}</button>
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
                    {showQuantity(position.quantity)} <span className="text-xs font-normal text-gray-500">{unitLabel(position.unitOfMeasure)}</span>
                  </p>
                </li>
              ))}
            </ul>)}

          {tab === "history" && (activity.length === 0
            ? <Empty>Activity appears here as you use the register.</Empty>
            : <ul className="divide-y divide-stone-100">
              {activity.map((entry) => {
                const detail = activityDetail(entry, { assets, itemFor, siteName, personName });
                return (
                  <li key={`${entry.kind}-${entry.id}`} className="flex gap-3 px-4 py-3">
                    <ActivityIcon entry={entry} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-botanique-charcoal">{activityTitle(entry, { assets, itemFor })}</p>
                      {detail && <p className="mt-0.5 text-xs text-gray-500">{detail}</p>}
                      <p className="mt-0.5 text-[11px] text-gray-400">{showMoment(entry.occurredAt)}{entry.reason ? ` · ${entry.reason}` : ""}</p>
                    </div>
                  </li>
                );
              })}
            </ul>)}
        </section>

        <div className="grid gap-4 min-w-0">
          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Stock positions</h2>
              {/* Always offered, as the authority shows it: an empty panel still
                  needs a way through to its tab. */}
              <button type="button" onClick={() => setTab("stock")} className="text-xs font-semibold text-botanique-green">View all</button>
            </div>
            {/* A four-column table, as the authority has it — and deliberately
                WITHOUT thumbnails. This rail answers "how much, and where",
                and a column of product cut-outs beside five short rows crowds
                the quantity, which is the number the reader came for. The
                cut-outs belong in the register, where the subject is the
                individual machine. */}
            {positions.length === 0
              ? <p className="px-4 py-6 text-sm text-gray-500">No stock positions yet.</p>
              : <>
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-[11px] font-medium text-gray-500">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-medium">Item</th>
                      <th scope="col" className="px-2 py-2 font-medium">Site / location</th>
                      <th scope="col" className="px-2 py-2 font-medium">Unit</th>
                      <th scope="col" className="px-4 py-2 text-right font-medium">Quantity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {positions.slice(0, 5).map((position) => (
                      <tr key={`panel-${position.itemId}-${position.siteId || "custody"}`}>
                        <td className="px-4 py-2.5 text-botanique-charcoal">{position.itemName}</td>
                        <td className="px-2 py-2.5 text-gray-600">{positionLabel(position.siteName)}</td>
                        <td className="px-2 py-2.5 text-gray-600">{unitLabel(position.unitOfMeasure)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-botanique-charcoal">{showQuantity(position.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex items-center justify-between border-t border-stone-200 px-4 py-2.5">
                  <p className="text-xs text-gray-500">
                    Showing 1 to {Math.min(5, positions.length)} of {positions.length} stock item{positions.length === 1 ? "" : "s"}
                  </p>
                  <button type="button" onClick={() => setTab("stock")} className="text-xs font-semibold text-botanique-green">View all</button>
                </div>
              </>}
          </section>

          <section className="min-w-0 overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="text-sm font-semibold">Recent activity</h2>
              <button type="button" onClick={() => setTab("history")} className="text-xs font-semibold text-botanique-green">View all</button>
            </div>
            {activity.length === 0
              ? <p className="px-4 py-6 text-sm text-gray-500">Activity appears here as you use the register.</p>
              : <ul>
                {activity.slice(0, 4).map((entry) => {
                  const detail = activityDetail(entry, { assets, itemFor, siteName, personName });
                  return (
                    <li key={`recent-${entry.kind}-${entry.id}`} className="flex items-start gap-3 px-4 py-3">
                      <ActivityIcon entry={entry} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-botanique-charcoal">{activityTitle(entry, { assets, itemFor })}</p>
                        {detail && <p className="truncate text-xs text-gray-500">{detail}</p>}
                      </div>
                      {/* Date over time, right-aligned, as the authority sets it. */}
                      <div className="shrink-0 text-right text-xs text-gray-500">
                        <p className="whitespace-nowrap">{showDate(entry.occurredAt)}</p>
                        <p className="whitespace-nowrap tabular-nums">{showTime(entry.occurredAt)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>}
          </section>
        </div>
      </div>

      {sheet?.kind === "addItem" && (
        <Sheet title="Add catalogue item" onClose={closeSheet}>
          {/* The chips are NOT the catalogue. They are eleven shortcuts over a
              form that accepts any name at all, and the wording has to say so
              — read as a closed list, they make the Founder think a new kind
              of tool needs a code change, which it does not. */}
          <p className="text-sm font-medium">Common items — optional shortcuts</p>
          <p className="mt-0.5 text-xs text-gray-500">These only prefill the form. You can add any tool, equipment or stock item by typing its name below. Nothing is created until you save.</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {QUICK_ADD_ITEMS.map((choice) => (
              <button
                key={choice.name} type="button"
                onClick={() => setForm({ itemName: choice.name, category: choice.category, trackingMethod: choice.trackingMethod, unitOfMeasure: choice.unitOfMeasure, notes: "" })}
                className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-2.5 py-1 text-xs font-medium text-botanique-charcoal"
              >
                <ToolVisual name={choice.name} size="xs" />
                {choice.name}
              </button>
            ))}
          </div>
          <div className="mt-4 grid gap-3">
            <label className="text-sm font-medium">Item name
              <input
                value={form.itemName || ""} onChange={(event) => setForm({ ...form, itemName: event.target.value })}
                className={field} maxLength={160}
                placeholder="Any tool, equipment or stock item"
              />
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
                {/* Opened from a catalogue row, the item is already settled —
                    showing a dropdown here would ask the operator to choose
                    the thing they just chose, and would let them choose a
                    different one by accident. */}
                {sheet.itemId
                  ? <div className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5">
                    <p className="text-xs text-gray-500">Equipment item</p>
                    <p className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-botanique-charcoal">
                      <ToolVisual name={itemFor(sheet.itemId)?.itemName} size="xs" />
                      {itemFor(sheet.itemId)?.itemName || "Selected item"}
                    </p>
                  </div>
                  : <label className="text-sm font-medium">Equipment item
                    <select value={form.itemId || ""} onChange={(event) => setForm({ ...form, itemId: event.target.value })} className={field}>
                      <option value="">Choose the item</option>
                      {assetItems.map((item) => <option key={item.id} value={item.id}>{item.itemName}</option>)}
                    </select>
                  </label>}
                {/* No input. The asset code is a Botanique identifier the
                    database allocates from a sequence on registration, so
                    there is nothing here to type, mistype or duplicate. */}
                <div>
                  <p className="text-sm font-medium">Asset code</p>
                  <p className="mt-1 text-sm text-gray-500">Assigned automatically when registered</p>
                </div>
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
                {/* "Current location", not "Current Site": the default here is
                    Botanique custody, which is not a Site and must not be
                    presented as though one had to be chosen. */}
                <label className="text-sm font-medium">Current location
                  <select value={form.siteId || ""} onChange={(event) => setForm({ ...form, siteId: event.target.value })} className={field}>
                    <option value="">{BOTANIQUE_CUSTODY}</option>
                    {selectableSites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
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
              <button type="button" disabled={saving} onClick={() => submit(() => registerAsset(form), announceRegistration)} className={`mt-4 ${primary}`}>{saving ? "Saving…" : "Register equipment"}</button>
            </>}
        </Sheet>
      )}

      {sheet?.kind === "asset" && (
        <Sheet title={sheet.asset.itemName} onClose={closeSheet}>
          <div className="flex items-start gap-3">
            <ToolVisual name={sheet.asset.itemName} size="lg" framed />
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
              action={sheet.action} asset={sheet.asset} sites={selectableSites} people={people}
              companions={companionsFor(sheet.asset)}
              form={form} setForm={setForm} formError={formError} saving={saving}
              onCancel={() => { setSheet({ ...sheet, action: null }); setFormError(""); }}
              onSubmit={() => submit(() => submitAssetAction(sheet.asset, sheet.action))}
            />
            : <div className="mt-4 flex flex-wrap gap-2">
              {equipmentActionsFor(sheet.asset.status, role).map((action) => (
                <button
                  key={action.id} type="button"
                  onClick={() => { setForm({ siteId: "", custodianPersonId: "", expectedReturnDate: "", condition: "", reason: "", note: "", alsoAssetIds: [] }); setFormError(""); setSheet({ ...sheet, action }); }}
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
              items={stockItems} sites={selectableSites} people={people} principal={principal}
              form={form} setForm={setForm} formError={formError} saving={saving}
              onSubmit={() => submit(() => recordStock(form.mode, form))}
            />}
        </Sheet>
      )}
    </section>
  );
}

// A second line ONLY where canonical data supports one. No invented detail:
// where a movement or event carries no Site, person or quantity, this returns
// empty and the row simply has no description.
// Past-tense phrases that complete "<item> …". Deliberately separate from the
// LABELS vocabularies, which name a movement type in a form list ("Issued to
// Site") where a noun phrase is right and a sentence ending is not.
const EQUIPMENT_EVENT_PHRASES = {
  registered: "registered", issued: "issued", transferred: "transferred",
  returned: "returned to Botanique", condition_changed: "condition updated",
  sent_for_repair: "sent for repair", returned_from_repair: "returned from repair",
  lost: "reported lost", retired: "retired", corrected: "corrected",
};

const CATALOGUE_EVENT_PHRASES = {
  created: "added to the catalogue", updated: "updated", corrected: "corrected",
  deactivated: "deactivated", reactivated: "reactivated",
};

const STOCK_EVENT_PHRASES = {
  received: "received", issued: "issued", transferred: "transferred",
  returned: "returned to Botanique", consumed: "consumed", damaged: "damaged",
  lost: "reported lost", adjustment_in: "adjusted up", adjustment_out: "adjusted down",
};

function activityDetail(entry, { assets, itemFor, siteName, personName }) {
  if (entry.kind === "equipment") {
    const asset = assets.find((row) => row.id === entry.assetId);
    if (!asset) return "";
    const where = asset.currentSiteId ? siteName(asset.currentSiteId) : BOTANIQUE_CUSTODY;
    const who = asset.custodianPersonId ? personName(asset.custodianPersonId) : "";
    return [asset.assetCode, where, who].filter(Boolean).join(" · ");
  }
  if (entry.kind === "catalogue") {
    const item = itemFor(entry.itemId);
    return item ? [categoryLabel(item.category), trackingMethodLabel(item.trackingMethod)].filter(Boolean).join(" · ") : "";
  }
  const item = itemFor(entry.itemId);
  const from = entry.fromSiteId ? siteName(entry.fromSiteId) : "";
  const to = entry.toSiteId ? siteName(entry.toSiteId) : "";
  const where = from && to ? `${from} → ${to}` : to ? `→ ${to}` : from ? `from ${from}` : BOTANIQUE_CUSTODY;
  const amount = [showQuantity(entry.quantity), item ? unitLabel(item.unitOfMeasure).toLowerCase() : ""].filter(Boolean).join(" ");
  return [amount, where].filter(Boolean).join(" · ");
}

// The authority reads subject-first — "Rotary Hammer Drill issued", "Cement
// 50kg transferred", "Brush Cutter sent for repair" — rather than
// "Issued — Rotary Hammer Drill (EQP-0015)". The thing comes first because the
// thing is what the reader is scanning for; the verb and the detail follow.
//
// The asset code moves out of the title for the same reason: it made every
// equipment line long enough to truncate in the rail, hiding the verb.
function activityTitle(entry, { assets, itemFor }) {
  if (entry.kind === "equipment") {
    const asset = assets.find((row) => row.id === entry.assetId);
    const item = asset ? itemFor(asset.itemId) : null;
    return `${item?.itemName || "Equipment"} ${EQUIPMENT_EVENT_PHRASES[entry.eventType] || entry.eventType}`;
  }
  if (entry.kind === "catalogue") {
    const item = itemFor(entry.itemId);
    return `${item?.itemName || "Item"} ${CATALOGUE_EVENT_PHRASES[entry.eventType] || entry.eventType}`;
  }
  const item = itemFor(entry.itemId);
  return `${item?.itemName || "Stock"} ${STOCK_EVENT_PHRASES[entry.movementType] || entry.movementType}`;
}

function AssetActionForm({
  action, asset, sites, people, companions, form, setForm, formError, saving, onCancel, onSubmit,
}) {
  const activePeople = people.filter((person) => person.isActive);
  const needsSite = action.id === "issue" || action.id === "transfer";
  const needsCondition = action.id === "condition" || action.id === "return_repair";
  const needsReason = action.id === "lost" || action.id === "retire";

  // Several tools going to one person at one moment is ONE handover, so the
  // shared context is asked for once and the whole group is saved together.
  // Deliberately inside this sheet rather than as a permanent toolbar or a
  // column of checkboxes on the register — the authority has neither.
  //
  // Only AVAILABLE assets can join: something already issued, under repair,
  // lost or retired is not the Founder's to hand over, and offering it would
  // invite a call the database refuses.
  const alsoHandingOver = form.alsoAssetIds || [];
  const toggleCompanion = (id) => setForm({
    ...form,
    alsoAssetIds: alsoHandingOver.includes(id)
      ? alsoHandingOver.filter((value) => value !== id)
      : [...alsoHandingOver, id],
  });

  return (
    <div className="mt-4 border-t border-stone-200 pt-4">
      <p className="text-sm font-semibold">{action.label}</p>
      {needsSite && companions.length > 0 && (
        <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50 p-3">
          <p className="text-xs font-semibold text-botanique-charcoal">Add another asset to this handover</p>
          <p className="mt-0.5 text-[11px] text-gray-500">
            Everything chosen here goes to the same Site and custodian, saved as one handover.
          </p>
          <ul className="mt-2 grid gap-1">
            {companions.map((companion) => (
              <li key={companion.id}>
                <label className="flex items-center gap-2 text-xs text-botanique-charcoal">
                  <input
                    type="checkbox"
                    checked={alsoHandingOver.includes(companion.id)}
                    onChange={() => toggleCompanion(companion.id)}
                    className="h-4 w-4 rounded border-stone-300"
                  />
                  <span className="min-w-0 truncate">
                    {companion.itemName} · <span className="tabular-nums text-gray-600">{companion.assetCode}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {alsoHandingOver.length > 0 && (
            <p className="mt-2 text-[11px] font-medium text-botanique-green">
              {alsoHandingOver.length + 1} assets in this handover
            </p>
          )}
        </div>
      )}
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
            {/* An expected return date is a future obligation, so the picker
                will not offer a past one and the database refuses it too. */}
            <label className="text-sm font-medium">Expected return (optional)
              <input
                type="date" min={todayKey()}
                value={form.expectedReturnDate || ""}
                onChange={(event) => setForm({ ...form, expectedReturnDate: event.target.value })}
                className={field}
              />
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
