// Test infrastructure for the Phase 1B-A2 admin slice (Vitest + React Testing
// Library + jsdom). Kept separate from vite.config.js so the production build
// config is untouched. Only the admin test files are in scope.
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.js",
    include: ["src/**/*.{test,spec}.{js,jsx}"],
    css: false,
  },
});
