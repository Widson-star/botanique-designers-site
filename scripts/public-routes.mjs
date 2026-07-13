/**
 * Authoritative public-route inventory — the single source of truth.
 *
 * BD-ROUTE-AUTHORITY-01: previously the public route list was duplicated in
 * three places (vite-plugin-sitemap `dynamicRoutes`, `scripts/prerender.mjs`
 * `ROUTES`, and the hand-maintained `public/sitemap.xml`). Those three copies
 * had to be kept in sync by hand. This module now defines every crawlable
 * public route once; `scripts/prerender.mjs` and `scripts/generate-sitemap.mjs`
 * both import it, so the prerender input and the sitemap output cannot diverge.
 *
 * Framework-independent (no Vite/React imports) so it is safe to import from any
 * build step. Every entry carries the sitemap `changefreq` and `priority` that
 * were previously maintained by hand in `public/sitemap.xml`; those values are
 * preserved here exactly.
 *
 * Order below matches the deployed `public/sitemap.xml` ordering.
 */

export const HOSTNAME = 'https://www.botaniquedesigners.com'

/** @typedef {{ path: string, changefreq: string, priority: string }} PublicRoute */

/** @type {PublicRoute[]} */
export const PUBLIC_ROUTES = [
  // Top-level
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/about', changefreq: 'monthly', priority: '0.9' },
  { path: '/services', changefreq: 'monthly', priority: '0.9' },
  { path: '/gardencare', changefreq: 'monthly', priority: '0.9' },

  // Individual service pages
  { path: '/services/landscape-design', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/landscape-architecture', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/ecological-planting-design', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/plant-taxonomy', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/plant-health-care', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/soil-analysis', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/potted-indoor-plants', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/garden-implementation', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/irrigation-systems', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/garden-lighting', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/property-fencing', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/garden-maintenance', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/lawn-care', changefreq: 'monthly', priority: '0.8' },
  { path: '/services/commercial-landscaping', changefreq: 'monthly', priority: '0.8' },

  // Projects + case studies
  { path: '/projects', changefreq: 'weekly', priority: '0.8' },
  { path: '/projects/karen-residence', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/muthithi-gardens-estate', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/ksms-campus', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/zaara-park', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/serenity-homes-diani', changefreq: 'monthly', priority: '0.7' },
  { path: '/projects/tsavo-skywalk', changefreq: 'monthly', priority: '0.7' },

  // Blog
  { path: '/blog', changefreq: 'weekly', priority: '0.7' },
  { path: '/blog/best-landscape-design-software-2026', changefreq: 'monthly', priority: '0.7' },
  { path: '/blog/what-does-a-landscape-designer-do', changefreq: 'yearly', priority: '0.7' },
  { path: '/blog/choosing-the-right-grass-kenya', changefreq: 'yearly', priority: '0.7' },
  { path: '/blog/landscaping-styles-explained', changefreq: 'yearly', priority: '0.7' },
  { path: '/blog/building-ask-botanique', changefreq: 'yearly', priority: '0.7' },
  { path: '/blog/africa-climate-summit-2023', changefreq: 'yearly', priority: '0.7' },
  { path: '/blog/aiph-world-green-city-awards-2024', changefreq: 'yearly', priority: '0.7' },

  // FAQ
  { path: '/faq', changefreq: 'monthly', priority: '0.7' },

  // Area pages
  { path: '/areas/nairobi', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/karen', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/runda', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/westlands', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/kiambu', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/mombasa', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/kisumu', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/nakuru', changefreq: 'monthly', priority: '0.6' },
  { path: '/areas/eldoret', changefreq: 'monthly', priority: '0.6' },
]

/** Convenience: just the path strings, in authority order. */
export const ROUTE_PATHS = PUBLIC_ROUTES.map((r) => r.path)

const VALID_CHANGEFREQ = new Set([
  'always',
  'hourly',
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'never',
])

/**
 * Structural guard over the authority. Throws on any invariant violation:
 * duplicate paths, a path that does not begin with "/", or an invalid
 * changefreq / priority value. Called at import time so every consumer
 * (prerender, sitemap generator) validates before doing any work.
 *
 * @param {PublicRoute[]} routes
 */
export function assertValidRoutes(routes = PUBLIC_ROUTES) {
  const seen = new Set()
  for (const route of routes) {
    const { path, changefreq, priority } = route

    if (typeof path !== 'string' || !path.startsWith('/')) {
      throw new Error(`Route path must begin with "/": ${JSON.stringify(path)}`)
    }
    if (seen.has(path)) {
      throw new Error(`Duplicate route path: ${path}`)
    }
    seen.add(path)

    if (!VALID_CHANGEFREQ.has(changefreq)) {
      throw new Error(`Invalid changefreq for ${path}: ${JSON.stringify(changefreq)}`)
    }
    const p = Number(priority)
    if (!(p >= 0 && p <= 1)) {
      throw new Error(`Invalid priority for ${path}: ${JSON.stringify(priority)}`)
    }
  }
  return routes
}

// Validate on import so a malformed authority fails fast during any build step.
assertValidRoutes()
