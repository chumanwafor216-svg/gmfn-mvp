/* global caches, fetch, Response, self, URL */

const CACHE_VERSION = "gsn-pwa-shell-v14";
const SHELL_ASSETS = [
  "/",
  "/cover",
  "/cover?source=pwa",
  "/manifest.json",
  "/manifest.webmanifest",
  "/gsn-app-icon.svg",
  "/gsn-app-icon-ios-180-v14.png",
  "/gsn-app-icon-192-v14.png",
  "/gsn-app-icon-512-v14.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_VERSION)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "GSN_SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api")) return;
  if (url.pathname.startsWith("/uploads")) return;

  if (request.mode === "navigate") {
    const entryFrom = String(url.searchParams.get("entry_from") || "")
      .trim()
      .toLowerCase();

    if (url.pathname === "/welcome" && entryFrom !== "cover") {
      const target = new URL("/cover", self.location.origin);
      url.searchParams.delete("entry_from");
      target.search = url.searchParams.toString();
      event.respondWith(Response.redirect(target.toString(), 302));
      return;
    }

    event.respondWith(
      fetch(request, { cache: "no-store" }).catch(() =>
        caches.match("/cover").then((res) => res || caches.match("/"))
      ),
    );
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".webmanifest")
  ) {
    event.respondWith(
      fetch(request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_VERSION).then((cache) => {
          cache.put(request, copy).catch(() => undefined);
        });
        return response;
      }).catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => {
              cache.put(request, copy).catch(() => undefined);
            });
            return response;
          });
        }),
      ),
    );
  }
});
