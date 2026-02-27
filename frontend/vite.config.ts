import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward ALL API routes to FastAPI
      "/auth": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/clans": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/invites": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/loans": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/pool": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/trust": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/trust-events": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/trust-slips": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/admin": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/bank": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/analytics": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/exposure": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/merchant": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/guarantors": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/public": { target: "http://127.0.0.1:8000", changeOrigin: true },

      // Swagger helpers (optional)
      "/openapi.json": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/docs": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/redoc": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/health": { target: "http://127.0.0.1:8000", changeOrigin: true }
    }
  }
});