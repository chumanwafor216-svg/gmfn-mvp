import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { clearAuthSession, getAccessToken } from "../lib/authSession";
import { gmfnBrand } from "../styles/gmfnBrand";

const FILE_PICKER_RELEASE_MS = 1_500;

type ReturnLocation = {
  pathname: string;
  search: string;
  hash: string;
};

function currentReturnLocation(): ReturnLocation {
  return {
    pathname: window.location.pathname || "/app/dashboard",
    search: window.location.search || "",
    hash: window.location.hash || "",
  };
}

function isFilePickerTrigger(event: Event): boolean {
  const path =
    typeof event.composedPath === "function" ? event.composedPath() : [];

  return path.some(
    (candidate) =>
      candidate instanceof HTMLInputElement &&
      candidate.type.toLowerCase() === "file"
  );
}

function announceSessionChange(): void {
  try {
    window.dispatchEvent(new CustomEvent("GSN_AUTH_SESSION_CHANGED"));
  } catch {
    // Session closure must not depend on optional UI refresh listeners.
  }
}

export default function BackgroundSessionGuard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [privacyCovered, setPrivacyCovered] = useState(false);
  const sessionClosedRef = useRef(false);
  const filePickerOpenRef = useRef(false);
  const filePickerReleaseTimerRef = useRef<number | null>(null);
  const returnLocationRef = useRef<ReturnLocation>(currentReturnLocation());

  useEffect(() => {
    returnLocationRef.current = {
      pathname: location.pathname || "/app/dashboard",
      search: location.search || "",
      hash: location.hash || "",
    };
  }, [location.hash, location.pathname, location.search]);

  useEffect(() => {
    const releaseFilePicker = () => {
      filePickerOpenRef.current = false;
      if (filePickerReleaseTimerRef.current !== null) {
        window.clearTimeout(filePickerReleaseTimerRef.current);
        filePickerReleaseTimerRef.current = null;
      }
    };

    const markFilePicker = (event: Event) => {
      if (!isFilePickerTrigger(event)) return;

      filePickerOpenRef.current = true;
      if (filePickerReleaseTimerRef.current !== null) {
        window.clearTimeout(filePickerReleaseTimerRef.current);
      }
      filePickerReleaseTimerRef.current = window.setTimeout(() => {
        if (document.visibilityState === "visible") {
          releaseFilePicker();
        }
      }, FILE_PICKER_RELEASE_MS);
    };

    const closeAuthenticatedSession = () => {
      if (!getAccessToken()) return;

      setPrivacyCovered(true);
      returnLocationRef.current = currentReturnLocation();

      if (filePickerOpenRef.current) return;

      sessionClosedRef.current = true;
      clearAuthSession();
      announceSessionChange();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        closeAuthenticatedSession();
        return;
      }

      setPrivacyCovered(false);

      if (filePickerOpenRef.current) {
        releaseFilePicker();
        return;
      }

      if (!sessionClosedRef.current) return;

      sessionClosedRef.current = false;
      navigate("/login?session=closed", {
        replace: true,
        state: { from: returnLocationRef.current },
      });
    };

    const handlePageHide = () => {
      closeAuthenticatedSession();
    };

    document.addEventListener("click", markFilePicker, true);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("click", markFilePicker, true);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
      if (filePickerReleaseTimerRef.current !== null) {
        window.clearTimeout(filePickerReleaseTimerRef.current);
      }
    };
  }, [navigate]);

  if (!privacyCovered) return null;

  return (
    <div
      data-gsn-background-session-cover="active"
      role="status"
      aria-live="polite"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2_147_483_647,
        display: "grid",
        placeItems: "center",
        padding: 24,
        background: gmfnBrand.gradients.pageWash,
        color: gmfnBrand.colors.ink,
      }}
    >
      <div
        style={{
          width: "min(100%, 360px)",
          borderRadius: 24,
          border: "1px solid rgba(214,170,69,0.34)",
          background: "rgba(255,255,255,0.98)",
          boxShadow: "0 24px 64px rgba(7,23,44,0.18)",
          padding: 24,
          textAlign: "center",
        }}
      >
        <div
          style={{
            color: gmfnBrand.colors.gold,
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 0.8,
            textTransform: "uppercase",
          }}
        >
          GSN secured
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 24,
            fontWeight: 1000,
            lineHeight: 1.15,
          }}
        >
          Member information is hidden
        </div>
        <div
          style={{
            marginTop: 10,
            color: "#5F7287",
            fontSize: 15,
            lineHeight: 1.6,
          }}
        >
          Return to GSN to sign in again.
        </div>
      </div>
    </div>
  );
}
