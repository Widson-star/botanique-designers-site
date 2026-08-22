# 17 — Tools & Equipment enhanced authority

Status: **Founder-approved governing authority**

Approved: 21 August 2026

Supersedes for Tools & Equipment only:

- `16-tools-equipment-inventory-working-authority.png`
- the Tools & Equipment portion of `11-maintenance-tools-equipment-working-authority.png`

It does **not** supersede Maintenance authority. Maintenance remains separately governed by image `11` and later Maintenance-specific decisions.

## Visual authority source

The Founder approved the enhanced Tools & Equipment design board generated during the 21 August 2026 control review.

Approved board metadata:

- dimensions: **1536 × 1024**
- SHA-256 of the approved workspace PNG: `c72ced4c5f1e248de5c9370f2d60350607d91b2c06efb9931611e033584a70f8`
- intended repository authority filename: `17-tools-equipment-enhanced-working-authority.png`

The PNG is the visual composition authority. This decision record is immediately binding even while the binary is being moved into the repository authority directory. When the binary is committed it must be the approved board, without redesign, recolouring, cropping or content substitution.

## Governing product decisions

### 1. Operator language

Do not use `physical asset` or `individual equipment asset` in ordinary user-facing copy.

For Principal and Operations Manager, the two tracking choices are:

- **Track each tool** — each reusable tool gets its own permanent Botanique `BD-TE-...` identity and can be assigned, returned, transferred, repaired, condition-checked, lost or retired.
- **Track quantity only** — no individual identity per unit; only quantities by Site/location are recorded.

The database may retain `asset` and `stock` as internal technical values. Those storage terms are not operator vocabulary.

### 2. Tools are tools

A tool is not called a `physical asset` merely because it is individually tracked. The register may retain `Asset code` as the technical column heading while migration compatibility is required, but new operator copy should prefer `Tool ID` or `BD-TE ID` where it improves clarity.

### 3. Permanent identity

An individually tracked tool receives one permanent identity such as:

- `BD-TE-001`
- `BD-TE-002`
- `BD-TE-003`

That identity belongs to the tool for its whole lifecycle.

Changing Site, custodian, Project/Maintenance context, condition or status does not change the code.

### 4. Batch registration

The enhanced registration workflow supports registering more than one tool of the same catalogue type in one operation.

Example:

- Rake
- quantity to register: 6
- Site: Karen Residence HSE 19

The system creates six separately identifiable tools in one atomic registration operation, allocating the next six `BD-TE` identities.

The operator must not click `Add another asset` six times merely to record six rakes already owned.

### 5. Registration may include initial allocation

Registration captures, as appropriate:

- quantity to register, default 1;
- current location/Site;
- current custodian, optional;
- condition;
- ownership;
- acquired-on date, optional;
- notes, optional.

If a tool is already with a named person when first recorded, the initial registration/allocation must be represented coherently in the immutable event history. The user should not be forced through an artificial second workflow merely to add a custodian.

### 6. Assignment and reassignment

Use **Assign / hand over** as the ordinary operator concept rather than `Issue to Site`.

A tool already at a Site can be assigned to a custodian at that same Site without pretending the Site changed.

A tool may later move:

Botanique custody → Site/person A → Botanique custody → Site/person B → another Site/person → repair → reissue.

Its `BD-TE` identity remains unchanged.

### 7. Site quantities for individually tracked tools

The system must make it easy to answer questions such as:

- how many rakes are at Karen;
- how many tools of a type are available at Kitusuru;
- how many are assigned;
- who currently holds each individually tracked tool.

Individually tracked tools remain one row per tool in the detailed register, but catalogue/location summaries may aggregate counts for readability.

### 8. Quantity-only stock

`Track quantity only` is intended for loose or consumable items where individual identity adds no operational value, such as suitable irrigation fittings, pegs, connectors and other count/measure-based stock.

It remains ledger-based. There is no editable current-balance field.

### 9. Tools & Equipment RBAC

**Principal and Operations Manager have full control of the Tools & Equipment domain.**

This includes ordinary and exceptional Tools & Equipment actions, subject to reason/audit requirements where applicable:

- create catalogue items;
- correct catalogue identity/details;
- deactivate/reactivate catalogue items;
- register tools;
- receive/record quantity stock;
- assign, transfer and return tools;
- update condition;
- send for and return from repair;
- report loss;
- retire tools;
- record stocktake adjustments;
- perform reasoned Tools & Equipment corrections.

Project Team and Read-only do not gain this access.

This RBAC decision is specific to Tools & Equipment and must not be used to widen authority in Finance, Approvals, Projects, People, Maintenance or Daily Site Record.

### 10. Professional tool picker/library

The enhanced authority introduces a searchable professional-grade tool picker rather than relying on a tiny set of shortcuts plus improvised SVG fallbacks.

The controlled first visual library is committed at:

- `/public/admin/inventory-tools/professional-tool-library.png`
- `/public/admin/inventory-tools/professional-tool-library.json`

Initial mapped set includes:

Jembe/hoe, Panga, Rake, Spade, Garden fork, Secateurs, Pruning saw, Axe, Mattock, Pickaxe, Wheelbarrow, Lawn mower, Brush cutter, Chainsaw, Generator, Rotary hammer drill, Drill, Angle grinder, Hose reel, Water pump, Pressure washer, Ladder, Hand fork, Hand trowel, Hedge trimmer, Leaf blower, plastic wheelbarrow, Safety helmet, Gloves and Irrigation fittings.

The visual library is **design-controlled by ChatGPT/Founder authority, not Claude Code**.

Claude may wire an approved visual key/path into the application. Claude must not redraw tools, invent SVGs, replace an approved visual with an approximation or select a misleading fallback.

Unknown custom items may use a restrained neutral `visual not assigned` treatment until a proper visual is approved. A generic wrench must never masquerade as a panga or another specific tool.

### 11. Recent activity imagery

Recent activity should identify the item being discussed wherever an approved visual exists.

Examples:

- Panga added to catalogue → Panga visual
- Jembe registered → Jembe visual
- Rake registered → Rake visual
- Secateurs assigned → Secateurs visual

Do not default these rows to generic hand-drawn cube/wrench/arrow SVGs when the item itself has an approved visual.

A restrained system pictogram may remain only for genuinely non-item-specific system/stock events where an item visual is not the appropriate subject.

### 12. Support/tutorial direction

The enhanced authority adds contextual support under the existing help surface rather than a new crowded Operations navigation item.

Working title:

**How this Hub works**

Tools & Equipment guide sequence:

1. Add or choose a catalogue item.
2. Choose `Track each tool` or `Track quantity only`.
3. Register one or several tools, or receive quantity stock.
4. Record Site/location and optional custodian.
5. Assign, reassign, return or transfer tools as work changes.
6. Record condition, repair, loss and retirement.
7. Use Stock positions for quantity-only items.

The full Hub tutorial should be completed only after the underlying workflows it documents are stable.

## Visual/composition relationship to authority 16

Authority `16` remains preserved as historical evidence and continues to inform the restrained shell, KPI strip, Inventory register, tabs, table density and right-rail posture where `17` does not intentionally improve them.

Where `17` differs from `16` on Tools & Equipment, **17 wins**.

The major intentional additions/improvements in `17` are:

- professional-grade tool picker;
- larger controlled visual library;
- Track each tool / Track quantity only explanation;
- batch registration;
- initial Site/custodian capture;
- Assign / hand over workflow;
- clearer per-Site quantity/accountability posture;
- item imagery in recent activity;
- equal Principal + Operations Manager Tools & Equipment control;
- contextual support/tutorial direction.

## Data rule

Illustrative counts, names, dates and rows visible in the visual board are not production-data authority and must never be seeded merely to match the image.

Production truth remains authoritative.
