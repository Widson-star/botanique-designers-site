import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Sitemap generation is handled by scripts/generate-sitemap.mjs (run before
// `vite build`), which writes public/sitemap.xml from the single authoritative
// route inventory in scripts/public-routes.mjs. See BD-ROUTE-AUTHORITY-01.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
});
