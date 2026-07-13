/**
 * Static pre-render script — runs after `vite build` as part of `npm run build`.
 *
 * Uses Vite's ssrLoadModule() to transform JSX/ESM in Node.js (no browser/Chrome
 * needed), renders each route with react-dom/server + StaticRouter, captures
 * react-helmet-async head tags, then writes per-route index.html files into dist/.
 *
 * Works on Vercel's build environment because it is pure Node.js.
 */

import { createServer } from 'vite'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'
import { ROUTE_PATHS as ROUTES, assertValidRoutes } from './public-routes.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.resolve(ROOT, 'dist')

// Prerender input is the single authoritative route inventory
// (scripts/public-routes.mjs) — the same source the sitemap is generated from,
// so the two cannot diverge. Validate its invariants before rendering.
assertValidRoutes()

// Read the Vite-built HTML template (has correct asset hashes)
const template = fs.readFileSync(path.join(DIST, 'index.html'), 'utf-8')

// Start a Vite dev server in middleware mode so we can call ssrLoadModule.
// ssrLoadModule transforms JSX/TSX/ESM on the fly — no separate SSR build needed.
const vite = await createServer({
  root: ROOT,
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'warn', // suppress routine output
})

try {
  console.log('🌿 Botanique SSR Pre-render: starting…')

  // Load the server entry through Vite's transform pipeline
  const { render } = await vite.ssrLoadModule('/src/entry-server.jsx')

  let ok = 0
  let fail = 0

  for (const route of ROUTES) {
    try {
      const { html: bodyHtml, helmet } = await render(route)

      // Build <head> injection from react-helmet-async output
      const headTags = [
        helmet?.title?.toString() ?? '',
        helmet?.meta?.toString() ?? '',
        helmet?.link?.toString() ?? '',
      ]
        .filter(Boolean)
        .join('\n    ')

      // Inject head tags before </head> and body HTML into #root
      const page = template
        .replace('</head>', `    ${headTags}\n  </head>`)
        .replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`)

      // Write dist/{route}/index.html  (root → dist/index.html directly)
      const routeDir = route === '/' ? '' : route.replace(/^\//, '')
      const outputDir = path.join(DIST, routeDir)
      fs.mkdirSync(outputDir, { recursive: true })
      fs.writeFileSync(path.join(outputDir, 'index.html'), page)

      console.log(`  ✓ ${route}`)
      ok++
    } catch (err) {
      console.error(`  ✗ ${route}: ${err.message}`)
      fail++
    }
  }

  console.log(`\n✅ Pre-rendered ${ok} routes into ${DIST}${fail ? `  (${fail} failed)` : ''}`)
  if (fail > 0) process.exit(1)

  // Custom 404 page — rendered from the catch-all React route and written to
  // dist/404.html. Vercel serves this file with a genuine HTTP 404 status for
  // any unmatched path (see vercel.json: no broad homepage rewrite). This page
  // is deliberately OUTSIDE the public-route authority: it is not in
  // scripts/public-routes.mjs, not in the sitemap, and is not a canonical
  // route. A sentinel path is used so the App's `path="*"` route matches.
  const { html: notFoundBody, helmet: notFoundHelmet } = await render('/__not-found__')

  const notFoundHead = [
    notFoundHelmet?.title?.toString() ?? '',
    notFoundHelmet?.meta?.toString() ?? '',
    notFoundHelmet?.link?.toString() ?? '',
  ]
    .filter(Boolean)
    .join('\n    ')

  const notFoundPage = template
    .replace('</head>', `    ${notFoundHead}\n  </head>`)
    .replace('<div id="root"></div>', `<div id="root">${notFoundBody}</div>`)

  fs.writeFileSync(path.join(DIST, '404.html'), notFoundPage)
  console.log('  ✓ 404.html (custom Not Found page)')
} finally {
  await vite.close()
}
