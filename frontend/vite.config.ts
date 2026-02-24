import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const backend = "http://127.0.0.1:8000";

const SPA_ROUTES = [
  "/cover",
  "/login",
  "/dashboard",
  "/community",
  "/clans",
  "/loans",
  "/guarantor",
  "/trust",
  "/trust-slip",
  "/seed",
  "/pilot-showcase",
  "/settings",
  "/exposure",
  "/api",
  "/admin",
  "/join",
  "/payment",
];

function isSpaRoute(pathname: string): boolean {
  if (pathname.startsWith("/t/")) return true;
  return SPA_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: "gmfn-spa-fallback",
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const url = req.url || "/";
          const pathname = url.split("?")[0] || "/";

          // ignore static assets
          if (pathname.includes(".") || pathname.startsWith("/@")) return next();

          // ignore API routes
          const apiPrefixes = [
            "/auth",
            "/clans",
            "/invites",
            "/loans",
            "/pool",
            "/trust",
            "/trust-events",
            "/trust_events",
            "/trust-slips",
            "/merchant",
            "/admin",
            "/exposure",
            "/analytics",
            "/reports",
            "/bank",
            "/system",
            "/public",
          ];

          if (apiPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
            return next();
          }

          // rewrite SPA routes to index.html
          if (isSpaRoute(pathname) || pathname === "/") {
            req.url = "/index.html";
          }

          next();
        });
      },
    },
  ],

  server: {
    port: 5173,
    proxy: {
      "/auth": { target: backend, changeOrigin: true },
      "/clans": { target: backend, changeOrigin: true },
      "/invites": { target: backend, changeOrigin: true },
      "/loans": { target: backend, changeOrigin: true },
      "/pool": { target: backend, changeOrigin: true },
      "/trust": { target: backend, changeOrigin: true },
      "/trust-events": { target: backend, changeOrigin: true },
      "/trust_events": { target: backend, changeOrigin: true },
      "/trust-slips": { target: backend, changeOrigin: true },
      "/merchant": { target: backend, changeOrigin: true },
      "/admin": { target: backend, changeOrigin: true },
      "/exposure": { target: backend, changeOrigin: true },
      "/analytics": { target: backend, changeOrigin: true },
      "/reports": { target: backend, changeOrigin: true },
      "/bank": { target: backend, changeOrigin: true },
      "/system": { target: backend, changeOrigin: true },
      "/public": { target: backend, changeOrigin: true },
    },
  },
});