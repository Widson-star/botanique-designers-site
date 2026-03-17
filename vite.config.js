import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import sitemap from "vite-plugin-sitemap";
export default defineConfig({
  plugins: [
    react(),
    sitemap({
      hostname: "https://www.botaniquedesigners.com",
      dynamicRoutes: [
        "/",
        "/about",
        "/services",
        "/services/eia-studies",
        "/services/implementation",
        "/services/maintenance",
        "/projects",
        "/blog",
        "/faq",
        "/areas/karen",
        "/areas/runda",
        "/areas/kiambu",
        "/areas/westlands",
        "/areas/nairobi",
        "/areas/mombasa",
        "/areas/kisumu",
        "/areas/nakuru",
        "/areas/eldoret",
      ],
    }),
  ],
  server: {
    host: true,
  },
});
