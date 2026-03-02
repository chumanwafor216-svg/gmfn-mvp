import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      /**
       * Stabilization:
       * - UI routes: /loans, /clans, /trust, etc. (React Router)
       * - API routes: /api/* (proxied to FastAPI)
       *
       * This prevents collisions where /loans is both a SPA route and an API path.
       */
      "/api": {
        target: BACKEND,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },

      // Swagger helpers (optional)
      "/openapi.json": { target: BACKEND, changeOrigin: true },
      "/docs": { target: BACKEND, changeOrigin: true },
      "/redoc": { target: BACKEND, changeOrigin: true },
      "/health": { target: BACKEND, changeOrigin: true },
    },
  },
});