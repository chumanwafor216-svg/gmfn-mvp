import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getAccessToken, getMe, observeIdentityRisk } from "../lib/api";

type Props = {
  children: React.ReactNode;
  requireRole?: "admin";
};

function computeClientFingerprint(): string {
  try {
    const parts = [
      navigator.userAgent || "",
      navigator.language || "",
      String(window.screen?.width || 0),
      String(window.screen?.height || 0),
      Intl.DateTimeFormat().resolvedOptions().timeZone || "",
    ];

    return btoa(parts.join("|")).slice(0, 120);
  } catch {
    return "unknown-client";
  }
}

export default function RequireAuth({ children, requireRole }: Props) {
  const location = useLocation();

  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [deniedForRole, setDeniedForRole] = useState(false);

  useEffect(() => {
    let active = true;

    const finish = (nextAllowed: boolean, roleDenied = false) => {
      if (!active) return;
      setAllowed(nextAllowed);
      setDeniedForRole(roleDenied);
      setLoading(false);
    };

    const run = async () => {
      try {
        const tok = getAccessToken();

        if (!tok) {
          finish(false);
          return;
        }

        const me = await getMe().catch(() => null);

        if (!me) {
          finish(false);
          return;
        }

        const role = String(me?.role || "").toLowerCase();

        if (requireRole === "admin" && role !== "admin") {
          finish(false, true);
          return;
        }

        finish(true);

        try {
          const fp = computeClientFingerprint();
          void observeIdentityRisk(fp).catch((error) => {
            console.warn("Identity observation skipped:", error);
          });
        } catch (error) {
          console.warn("Identity observation skipped:", error);
        }
      } catch {
        finish(false);
      }
    };

    run();

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

    if (deniedForRole) {
      return <Navigate to="/app/dashboard" replace />;
    }

    return <Navigate to="/cover" replace />;
  }

  return <>{children}</>;
}