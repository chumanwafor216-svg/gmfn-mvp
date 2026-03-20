import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, getMe, observeIdentityRisk } from "../lib/api";

type Props = {
  children: React.ReactNode;
  requireRole?: "admin";
};

function computeClientFingerprint(): string {
  const parts = [
    navigator.userAgent || "",
    navigator.language || "",
    String(window.screen?.width || 0),
    String(window.screen?.height || 0),
    Intl.DateTimeFormat().resolvedOptions().timeZone || "",
  ];

  return btoa(parts.join("|")).slice(0, 120);
}

export default function RequireAuth({ children, requireRole }: Props) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const tok = getAccessToken();

        if (!tok) {
          if (active) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        const me = await getMe().catch(() => null);

        if (!me) {
          if (active) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        const role = String(me?.role || "").toLowerCase();

        if (requireRole === "admin" && role !== "admin") {
          if (active) {
            setAllowed(false);
            setLoading(false);
          }
          return;
        }

        try {
          const fp = computeClientFingerprint();
          await observeIdentityRisk(fp);
        } catch (error) {
          console.warn("Identity observation skipped:", error);
        }

        if (active) {
          setAllowed(true);
          setLoading(false);
        }
      } catch {
        if (active) {
          setAllowed(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [requireRole]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontWeight: 700,
        }}
      >
        Loading workspace...
      </div>
    );
  }

  if (!allowed) {
    if (!getAccessToken()) {
      return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return <Navigate to="/cover" replace />;
  }

  return <>{children}</>;
}