import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import CompanionLayer from "./CompanionLayer";
import {
  buildGuidanceSnapshot,
  type GuidanceSnapshot,
} from "../lib/guidance";

export default function WorkspaceCompanionBridge() {
  const location = useLocation();
  const [snapshot, setSnapshot] = useState<GuidanceSnapshot | null>(null);

  useEffect(() => {
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
  }, [location.pathname, location.search]);

  return <CompanionLayer snapshot={snapshot} />;
}