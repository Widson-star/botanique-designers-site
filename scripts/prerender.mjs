/**
 * Pre-renders all site routes to static HTML after the Vite build.
 * Run via: node scripts/prerender.mjs
 * Triggered automatically by the "postbuild" npm script.
 *
 * Uses @prerenderer/prerenderer + @prerenderer/renderer-puppeteer (puppeteer >= 2).
 */

import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const Prerenderer = require(
  path.resolve(__dirname, '../node_modules/@prerenderer/prerenderer/dist/cjs.js')
)
const PuppeteerRenderer = require(
  path.resolve(__dirname, '../node_modules/@prerenderer/renderer-puppeteer/dist/cjs.js')
)

const DIST = path.resolve(__dirname, '../dist')

const ROUTES = [
  '/',
  '/about',
  '/services',
  '/services/maintenance',
  '/services/implementation',
  '/services/eia-studies',
  '/faq',
  '/blog',
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

async function run() {
  console.log('🌿 Botanique Prerender: starting…')

  const prerenderer = new Prerenderer({
    staticDir: DIST,
    renderer: new PuppeteerRenderer({
      headless: true,
      // Wait 3 s after page load so React + react-helmet-async can finish rendering.
      // renderAfterElementExists triggers a Chrome 120+ Promise-GC bug, so we use time instead.
      renderAfterTime: 3000,
      timeout: 30000,
      launchOptions: {
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      },
    }),
  })

  try {
    await prerenderer.initialize()

    const renderedRoutes = await prerenderer.renderRoutes(ROUTES)

    for (const rendered of renderedRoutes) {
      // Build output path: /about → dist/about/index.html
      const routePath = rendered.route === '/' ? '' : rendered.route
      const outputDir = path.join(DIST, routePath)
      const outputFile = path.join(outputDir, 'index.html')

      fs.mkdirSync(outputDir, { recursive: true })
      fs.writeFileSync(outputFile, rendered.html.trim())
      console.log(`  ✓ ${rendered.route}`)
    }

    console.log(`\n✅ Pre-rendered ${renderedRoutes.length} routes into ${DIST}`)
  } catch (err) {
    console.error('❌ Prerender failed:', err)
    process.exit(1)
  } finally {
    await prerenderer.destroy()
  }
}

run()
