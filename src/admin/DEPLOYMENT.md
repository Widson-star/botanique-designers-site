# Botanique Admin — Deployment Notes

The `/admin` project tracker is part of the same Vite build as the public website
but is fully isolated at runtime: it is not linked from the public site, is not in
the sitemap (`vite.config.js`), and is not pre-rendered (`scripts/prerender.mjs`).
`App.jsx` short-circuits any `/admin*` path to `<AdminApp/>` before the public
layout renders.

## Required environment variables (Vercel / hosting)

Set these as **frontend** environment variables. Both are non-secret, RLS-safe
values from the Botanique-only Supabase project (`botanique-admin`):

| Name | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project API URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon / publishable key (NOT the service-role key) |

Notes:

- **Never** set a Supabase service-role / secret key in any `VITE_*` variable or
  anywhere in frontend code — it would be shipped to the browser. Row Level
  Security is the only access boundary the frontend relies on.
- These names match `.env.example` and the local `.env.local` (gitignored).
- If either variable is missing in a **production** build, `/admin` shows a clear
  admin-only "Admin not configured" screen (`AdminConfigError`) instead of crashing
  or exposing the public site. In **development**, a missing config shows the
  labelled dev seed preview instead.

## Access model (enforced by Supabase RLS + UI)

- **Owner** (Widson): full operational tracker plus owner-only financial references.
- **Manager** (Martine): operational fields only. No financial references, labels,
  invoices, estimates, quotations, amounts, balances, payment status, receipts,
  PDF links, or financial notes — the frontend never fetches them for a manager,
  and RLS blocks the `project_financial_references` table for non-owners.
- **Staff/casual**: assigned-only project access (RLS-enforced). Client-side
  assignment mirroring is a future task — see `TODO(staff)` in
  `src/admin/utils/projectMappers.js`. Staff must not gain wider access than a
  manager.

## What this admin does NOT do

No invoice / estimate / receipt / PDF / payment / amount / balance / quotation /
document-number generation. Simple Invoice Manager remains the financial source of
truth.
