import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMySettings } from "../lib/api";
import { type GuidanceSnapshot } from "../lib/guidance";
import { subscribeCompanionSettingsUpdated } from "../lib/workspaceEvents";
import {
  installCompanionInteractionCapture,
  markCompanionUserInteraction,
  normalizeCompanionSettings,
  runCompanionCycle,
  subscribeCompanionToasts,
  type CompanionSettings,
  type CompanionToastPayload,
} from "../lib/companion";

type CompanionLayerProps = {
  snapshot: GuidanceSnapshot | null;
};

const LOCAL_COMPANION_SETTINGS_KEY = "gmfn_companion_settings_local";

function readLocalCompanionSettings(): Partial<CompanionSettings> {
  try {
    const raw = window.localStorage.getItem(LOCAL_COMPANION_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function toastCard(priority: CompanionToastPayload["priority"]): React.CSSProperties {
  if (priority === "urgent") {
    return {
      borderRadius: 18,
      background: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.18)",
      boxShadow: "0 16px 34px rgba(15,23,42,0.14)",
      padding: 14,
    };
  }

  if (priority === "important") {
    return {
      borderRadius: 18,
      background: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.18)",
      boxShadow: "0 16px 34px rgba(15,23,42,0.14)",
      padding: 14,
    };
  }

  return {
    borderRadius: 18,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.10)",
    boxShadow: "0 16px 34px rgba(15,23,42,0.14)",
    padding: 14,
  };
}

function toneText(priority: CompanionToastPayload["priority"]): string {
  if (priority === "urgent") return "#991B1B";
  if (priority === "important") return "#92400E";
  return "#24415C";
}

function actionButton(priority: CompanionToastPayload["priority"]): React.CSSProperties {
  if (priority === "urgent") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 36,
      padding: "8px 12px",
      borderRadius: 12,
      border: "none",
      background: "#DC2626",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 13,
      cursor: "pointer",
      whiteSpace: "nowrap",
    };
  }

  if (priority === "important") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 36,
      padding: "8px 12px",
      borderRadius: 12,
      border: "none",
      background: "#D97706",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 13,
      cursor: "pointer",
      whiteSpace: "nowrap",
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
    padding: "8px 12px",
    borderRadius: 12,
    border: "none",
    background: "#0B63D1",
    color: "#FFFFFF",
    fontWeight: 900,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function dismissButton(): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 10,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: "#24415C",
    fontWeight: 900,
    cursor: "pointer",
  };
}

export default function CompanionLayer({ snapshot }: CompanionLayerProps) {
  const navigate = useNavigate();

  const [settings, setSettings] = useState<CompanionSettings>(
    normalizeCompanionSettings()
  );
  const [toasts, setToasts] = useState<CompanionToastPayload[]>([]);

  const timerMapRef = useRef<Record<string, number>>({});

  const clearToastTimer = useCallback((id: string) => {
    const timerId = timerMapRef.current[id];
    if (timerId) {
      window.clearTimeout(timerId);
      delete timerMapRef.current[id];
    }
  }, []);

  const removeToast = useCallback((id: string) => {
    clearToastTimer(id);
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, [clearToastTimer]);

  function handleToastOpen(toast: CompanionToastPayload) {
    markCompanionUserInteraction();
    removeToast(toast.id);

    if (toast.ctaTo) {
      navigate(toast.ctaTo);
    }
  }

  useEffect(() => {
    installCompanionInteractionCapture();
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      const settingsRes = await getMySettings().catch(() => null);
      const localSettings = readLocalCompanionSettings();

      if (!alive) return;

      setSettings(
        normalizeCompanionSettings({
          ...(settingsRes || {}),
          ...(localSettings || {}),
        })
      );
    })();

    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    return subscribeCompanionSettingsUpdated((payload) => {
      setSettings((prev) =>
        normalizeCompanionSettings({
          ...prev,
          ...(payload || {}),
        })
      );
    });
  }, []);
  
  useEffect(() => {
    return subscribeCompanionToasts((payload) => {
      setToasts((prev) => {
        const next = [...prev.filter((item) => item.id !== payload.id), payload];
        return next.slice(-3);
      });

      clearToastTimer(payload.id);
      timerMapRef.current[payload.id] = window.setTimeout(() => {
        removeToast(payload.id);
      }, payload.autoCloseMs);
    });
  }, [clearToastTimer, removeToast]);

  useEffect(() => {
    return () => {
      Object.values(timerMapRef.current).forEach((timerId) => {
        window.clearTimeout(timerId);
      });
      timerMapRef.current = {};
    };
  }, []);

  useEffect(() => {
    if (!snapshot) return;

    void runCompanionCycle({
      snapshot,
      settings,
    });
  }, [snapshot, settings]);

  useEffect(() => {
    if (!snapshot) return;

    function handleFocusLikeEvent() {
      const localSettings = readLocalCompanionSettings();
      const merged = normalizeCompanionSettings({
        ...settings,
        ...(localSettings || {}),
      });

      setSettings(merged);

      void runCompanionCycle({
        snapshot,
        settings: merged,
      });
    }

    function handleVisibilityChange() {
      if (typeof document === "undefined") return;
      if (!document.hidden) {
        handleFocusLikeEvent();
      }
    }

    window.addEventListener("focus", handleFocusLikeEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleFocusLikeEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [snapshot, settings]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 80,
        width: "min(92vw, 380px)",
        display: "grid",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            ...toastCard(toast.priority),
            pointerEvents: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              alignItems: "start",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 900,
                  letterSpacing: 0.28,
                  textTransform: "uppercase",
                  color: toneText(toast.priority),
                }}
              >
                Companion
              </div>

              <div
                style={{
                  marginTop: 6,
                  color: "#0B1F33",
                  fontSize: 16,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {toast.title}
              </div>
            </div>

            <button
              type="button"
              aria-label="Dismiss companion message"
              onClick={() => removeToast(toast.id)}
              style={dismissButton()}
            >
              ×
            </button>
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.7,
            }}
          >
            {toast.detail}
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            {toast.ctaTo ? (
              <button
                type="button"
                onClick={() => handleToastOpen(toast)}
                style={actionButton(toast.priority)}
              >
                {toast.ctaLabel || "Open"}
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                minHeight: 36,
                padding: "8px 12px",
                borderRadius: 12,
                border: "1px solid rgba(11,31,51,0.10)",
                background: "#FFFFFF",
                color: "#24415C",
                fontWeight: 800,
                fontSize: 13,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
