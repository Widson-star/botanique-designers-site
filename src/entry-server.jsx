/**
 * SSR entry point used by scripts/prerender.mjs at build time.
 * Renders each route to a string using react-dom/server + StaticRouter,
 * and captures react-helmet-async head tags via HelmetProvider context.
 *
 * This file is never shipped to the browser — it is only executed in Node.js
 * via Vite's ssrLoadModule() during the prerender step.
 */
import React from 'react'
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { AppRoutes } from './App.jsx'

/**
 * Render a single route to HTML.
 * @param {string} url  e.g. '/about'
 * @returns {{ html: string, helmet: import('react-helmet-async').FilledContext['helmet'] }}
 */
export async function render(url) {
  const helmetContext = {}

  const html = renderToString(
    <HelmetProvider context={helmetContext}>
      <StaticRouter location={url}>
        <AppRoutes />
      </StaticRouter>
    </HelmetProvider>
  )

  return { html, helmet: helmetContext.helmet }
}
