import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CompanionLayer from "./CompanionLayer";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";

const COMPANION_BLOCKED_PATH_PREFIXES = [
  "/app/finance",
  "/app/marketplace",
  "/app/my-gmfn-and-i",
  "/app/payment/pool",
  "/app/payment/withdraw",
  "/app/payment-rails",
  "/app/payout-details",
];

export default function WorkspaceCompanionBridge() {
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<GuidanceSnapshot | null>(null);
  const companionBlocked = COMPANION_BLOCKED_PATH_PREFIXES.some((prefix) =>
    location.pathname.startsWith(prefix)
  );

  useEffect(() => {
    if (companionBlocked) {
      setSnapshot(null);
      return;
    }

    let alive = true;

    async function loadSnapshot() {
      const next = await buildGuidanceSnapshot().catch(() => null);
      if (!alive) return;
      if (next) {
        setSnapshot(next);
      }
    }

    void loadSnapshot();

    const intervalId = window.setInterval(() => {
      void loadSnapshot();
    }, 90000);

    function handleFocus() {
      void loadSnapshot();
    }

    function handleVisibilityChange() {
      if (typeof document === "undefined") return;
      if (!document.hidden) {
        void loadSnapshot();
      }
    }

    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [companionBlocked, location.pathname, location.search]);

  if (companionBlocked) return null;

  return <CompanionLayer snapshot={snapshot} />;
}
