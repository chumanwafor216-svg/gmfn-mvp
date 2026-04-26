import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BACKEND = "http://127.0.0.1:8012";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("react-hot-toast") ||
            id.includes("react-toastify") ||
            id.includes("qrcode.react")
          ) {
            return "ui-support";
          }

          if (id.includes("react")) {
            return "react-vendor";
          }

          return "vendor";
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
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

      "/trust-slips": {
        target: BACKEND,
        changeOrigin: true,
      },

      "/uploads": {
        target: BACKEND,
        changeOrigin: true,
      },

      // Swagger helpers (optional)
      "/openapi.json": { target: BACKEND, changeOrigin: true },
      "/docs": { target: BACKEND, changeOrigin: true },
      "/redoc": { target: BACKEND, changeOrigin: true },
      "/health": { target: BACKEND, changeOrigin: true },
    },
  },
});
