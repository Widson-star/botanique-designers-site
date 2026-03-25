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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const DIST = path.resolve(ROOT, 'dist')

const ROUTES = [
  '/',
  '/about',
  '/services',
  '/services/maintenance',
  '/services/implementation',
  '/services/eia-studies',
  '/services/landscape-design',
  '/services/landscape-architecture',
  '/services/plant-taxonomy',
  '/services/plant-health-care',
  '/services/soil-analysis',
  '/services/potted-indoor-plants',
  '/services/garden-implementation',
  '/services/irrigation-systems',
  '/services/garden-lighting',
  '/services/property-fencing',
  '/services/garden-maintenance',
  '/services/lawn-care',
  '/faq',
  '/blog',
  '/blog/what-does-a-landscape-designer-do',
  '/blog/choosing-the-right-grass-kenya',
  '/blog/landscaping-styles-explained',
  '/blog/building-ask-botanique',
  '/blog/africa-climate-summit-2023',
  '/blog/aiph-world-green-city-awards-2024',
  '/projects',
  '/areas/karen',
  '/areas/mombasa',
  '/areas/eldoret',
  '/areas/nairobi',
  '/areas/westlands',
  '/areas/kiambu',
  '/areas/runda',
  '/areas/nakuru',
  '/areas/kisumu',
]

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
} finally {
  await vite.close()
}
