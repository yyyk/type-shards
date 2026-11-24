import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves a project site under /<repo>/; the deploy workflow
  // sets BASE_PATH. Locally the app is served from the root.
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    // text-shape's wasm embedded as base64 (~1.5 MB): only loaded when its
    // init gets no URL, and the app always gives one (src/lib/engines.ts)
    chunkSizeWarningLimit: 1600,
  },
})
