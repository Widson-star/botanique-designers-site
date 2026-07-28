import { act } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter, StaticRouter } from "react-router-dom";
import { AppRoutes } from "./App";
import { mountReactApp } from "./clientMount";

afterEach(() => {
  document.body.innerHTML = "";
  window.history.replaceState({}, "", "/");
  vi.restoreAllMocks();
});

function rootWith(html) {
  document.body.innerHTML = `<div id="root">${html}</div>`;
  return document.getElementById("root");
}

describe("route-aware React mounting", () => {
  it("hydrates matching public prerendered markup without a recoverable error", async () => {
    const app = <main>Public route</main>;
    const rootElement = rootWith(renderToString(app));
    const onRecoverableError = vi.fn();

    await act(async () => {
      mountReactApp({
        rootElement,
        app,
        pathname: "/about",
        onRecoverableError,
      });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(rootElement).toHaveTextContent("Public route");
  });

  it("hydrates a real public application route without a recoverable error", async () => {
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    const serverHtml = renderToString(
      <HelmetProvider context={{}}>
        <StaticRouter location="/about">
          <AppRoutes />
        </StaticRouter>
      </HelmetProvider>
    );
    const rootElement = rootWith(serverHtml);
    window.history.replaceState({}, "", "/about");
    const onRecoverableError = vi.fn();
    const app = (
      <HelmetProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </HelmetProvider>
    );
    let root;

    await act(async () => {
      root = mountReactApp({
        rootElement,
        app,
        pathname: "/about",
        onRecoverableError,
      });
    });

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(rootElement).toHaveTextContent("About Botanique Designers");
    await act(async () => root.unmount());
  });

  it.each(["/admin", "/admin/projects", "/admin/approvals"])(
    "client-renders %s instead of hydrating the rewritten homepage",
    async (pathname) => {
      const rootElement = rootWith(
        '<div class="font-sans text-botanique-charcoal"><header>Public navigation</header></div>'
      );
      const onRecoverableError = vi.fn();

      await act(async () => {
        mountReactApp({
          rootElement,
          app: <div>Botanique internal admin</div>,
          pathname,
          onRecoverableError,
        });
      });

      expect(onRecoverableError).not.toHaveBeenCalled();
      expect(rootElement).toHaveTextContent("Botanique internal admin");
      expect(rootElement).not.toHaveTextContent("Public navigation");
    }
  );
});
