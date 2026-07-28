import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import App from './App.jsx'
import { mountReactApp } from './clientMount.js'
import './index.css'

const rootElement = document.getElementById('root')

const app = (
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
)

function reportRecoverableError(error, errorInfo) {
  window.__BOTANIQUE_ON_RECOVERABLE_ERROR__?.(error, errorInfo)
  console.error(error)
}

// Public routes hydrate their matching prerendered HTML. Private admin routes
// are client-rendered because their Vercel SPA fallback serves the prerendered
// homepage document, not an admin server snapshot.
mountReactApp({
  rootElement,
  app,
  onRecoverableError: reportRecoverableError,
})
