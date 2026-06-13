# Botanique Designers

Marketing and lead-generation website for **Botanique Designers**, a Kenya-based
landscape design and implementation practice founded by Widson Omutelema Ambaisi.

The site presents the practice's services (landscape design, planting design,
garden implementation, plant science and ongoing care), project work, and contact
channels, with local-area and blog pages for SEO.

The site includes a visitor assistant called **Ask Botanique** (the floating chat
widget) that helps visitors with services, site visits, and project enquiries.

## Stack

- **React 19** + **React Router 7** (single-page app)
- **Vite 7** build tooling
- **Tailwind CSS 3** for styling
- **react-helmet-async** + a static prerender step for per-route SEO metadata
- **Express** API (`server/`) for the contact form, AI chat, and M-Pesa — deployed
  separately from the static frontend

## Local development

```bash
npm install

# Frontend only (Vite dev server)
npm run dev

# Backend API only (Express, port 5001)
npm run server

# Both together
npm run dev:full
```

Build (includes the static prerender of all routes):

```bash
npm run build
npm run preview   # preview the production build locally
```

Lint:

```bash
npm run lint
```

## Environment variables

Copy `.env.example` to `.env` and fill in values. **Never commit real secrets.**

**The backend is optional.** The site is built to run as a static frontend with
no server: WhatsApp lead templates, the quote wizard, project/service CTAs, manual
payment instructions, and a contact form with a WhatsApp/call/email fallback all
work with nothing configured. The Express API only *adds* server-side contact
email and the Ask Botanique chat.

Frontend (`VITE_*`, exposed to the browser — non-secret):

| Variable | Purpose |
| --- | --- |
| `VITE_BACKEND_URL` | **Optional.** Base URL of the separately-hosted Express API. **Unset (default):** the contact form skips the network call and shows the WhatsApp/call/email fallback (with the visitor's details pre-filled), and Ask Botanique replies with a WhatsApp prompt. **Set:** the form emails via the server and Ask Botanique uses Groq chat. Never point it at `localhost` in production. |
| `VITE_MPESA_STK_ENABLED` | **Optional.** `"true"` only when **production** Daraja M-Pesa credentials are live. Defaults to off → the consultancy modal shows manual Till/Bank instructions + WhatsApp confirmation (no in-app STK prompt). |

Backend (`server/.env` — secret, never exposed to the client; only needed if you deploy `server/index.js`):

| Variable | Purpose |
| --- | --- |
| `PORT` | API port (default 5001) |
| `CORS_ORIGINS` | Comma-separated allowed origins (defaults to the www + apex production domains; localhost is always allowed for dev) |
| `GROQ_API_KEY` | Groq API key for the Ask Botanique chat endpoint |
| `EMAIL_USER` / `EMAIL_PASS` | Gmail address + app password for contact-form email |
| `MPESA_CONSUMER_KEY` / `MPESA_CONSUMER_SECRET` / `MPESA_SHORTCODE` / `MPESA_PASSKEY` / `CALLBACK_URL` | M-Pesa Daraja credentials (sandbox unless production-approved) |

## Payments status

M-Pesa currently targets Safaricom's **sandbox** endpoints, so in-app STK Push is
**not live**. The frontend STK flow is disabled by default and customers are shown
manual payment details. See the warning comment in `server/index.js` before going
live.

## Deployment

Deployed to **Vercel** as a static site. Vercel auto-detects Vite:

- **Build command:** `npm run build` (Vite build + `scripts/prerender.mjs`, which
  writes per-route HTML for SEO).
- **Output directory:** `dist`.
- **Routing:** `vercel.json` sets `cleanUrls` and rewrites unmatched paths to the
  SPA. Prerendered routes are served as static files (filesystem takes precedence
  over the rewrite); unknown paths fall through to client-side routing.
- **No serverless functions:** there is no `/api` directory on Vercel. When
  `VITE_BACKEND_URL` is unset, the frontend never calls `/api/*`, so the static
  deploy is self-contained and safe.

The Express API in `server/` is **optional** and, if used, must be hosted
separately (e.g. Render/Railway/Fly) with its URL supplied via `VITE_BACKEND_URL`.
