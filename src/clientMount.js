import { createRoot, hydrateRoot } from "react-dom/client";

export function isAdminPath(pathname) {
  return pathname === "/admin" || pathname.startsWith("/admin/");
}

export function mountReactApp({
  rootElement,
  app,
  pathname = window.location.pathname,
  onRecoverableError,
}) {
  if (isAdminPath(pathname)) {
    // Vercel rewrites private admin paths to the public root document. That
    // document contains prerendered homepage HTML, so it must never be hydrated
    // as AdminApp. Admin is intentionally absent from the prerender inventory.
    rootElement.replaceChildren();
    const root = createRoot(rootElement);
    root.render(app);
    return root;
  }

  if (rootElement.hasChildNodes()) {
    return hydrateRoot(rootElement, app, { onRecoverableError });
  }

  const root = createRoot(rootElement);
  root.render(app);
  return root;
}
