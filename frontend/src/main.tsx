import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";

import App from "./App";
import {
  configuredPublicFrontendOrigin,
  isSuspendedPublicFrontendHost,
} from "./lib/publicLinks";
import "./styles/tokens.css";
import "./styles/public-shop.css";
import "./index.css";

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
