import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import { installMobileTapGuard } from "./lib/mobileTapGuard";
import {
  registerGsnServiceWorker,
  registerPwaInstallSupport,
} from "./lib/pwaInstall";
import {
  configuredPublicFrontendOrigin,
  isSuspendedPublicFrontendHost,
} from "./lib/publicLinks";
import "./styles/tokens.css";
import "./styles/public-shop.css";
import "./index.css";

function hasBootSessionReset(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const pathname = String(window.location.pathname || "").trim().toLowerCase();
    if (pathname === "/reset") return true;

    const params = new URLSearchParams(window.location.search || "");
    const value = String(params.get("reset") || "").trim().toLowerCase();
    return value === "1" || value === "true" || value === "yes";
  } catch {
    return false;
  }
}

function clearBootBrowserSession(): void {
  try {
    window.localStorage?.clear();
  } catch {
    // Keep reset best-effort on restrictive mobile browsers.
  }

  try {
    window.sessionStorage?.clear();
  } catch {
    // Keep reset best-effort on restrictive mobile browsers.
  }

  try {
    if ("caches" in window) {
      void window.caches.keys().then((keys) => {
        keys.forEach((key) => {
          void window.caches.delete(key);
        });
      });
    }
  } catch {
    // Cache cleanup is only a fallback for stubborn mobile previews.
  }
}

function migrateSuspendedPublicHost(): boolean {
  if (typeof window === "undefined") return false;

  const hostname = String(window.location.hostname || "").trim();
  if (!isSuspendedPublicFrontendHost(hostname)) return false;

  const targetOrigin = configuredPublicFrontendOrigin();
  if (!targetOrigin || targetOrigin === window.location.origin) return false;

  const target =
    targetOrigin +
    window.location.pathname +
    window.location.search +
    window.location.hash;

  window.location.replace(target);
  return true;
}

if (hasBootSessionReset()) {
  clearBootBrowserSession();
  window.history.replaceState(null, "", "/cover");
}

installMobileTapGuard();
registerPwaInstallSupport();
registerGsnServiceWorker();

if (!migrateSuspendedPublicHost()) {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "12px",
              background: "#0F172A",
              color: "#FFFFFF",
              fontWeight: 600,
            },
          }}
        />
      </BrowserRouter>
    </React.StrictMode>
  );
}
