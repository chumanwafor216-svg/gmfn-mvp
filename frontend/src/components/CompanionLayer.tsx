import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PrimaryButton, SecondaryButton, SubtleButton } from "./StableButton";
import { getMyNotifications, getMySettings } from "../lib/api";
import { type GuidanceSnapshot } from "../lib/guidance";
import { subscribeCompanionSettingsUpdated } from "../lib/workspaceEvents";
import {
  installCompanionInteractionCapture,
  markCompanionUserInteraction,
  normalizeCompanionSettings,
  runCompanionCycle,
  runUrgentCompanionNotificationCycle,
  subscribeCompanionToasts,
  type CompanionSettings,
  type CompanionToastPayload,
} from "../lib/companion";

type CompanionLayerProps = {
  snapshot: GuidanceSnapshot | null;
};

const LOCAL_COMPANION_SETTINGS_KEY = "gmfn_companion_settings_local";
const DISMISSED_COMPANION_TOASTS_KEY = "gmfn_companion_dismissed_toasts";
const DISMISSED_COMPANION_TOAST_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const URGENT_CONFIRMATION_KIND = "community_confirmation.request_to_respond";
const URGENT_CONFIRMATION_OUTCOME_KINDS = new Set([
  URGENT_CONFIRMATION_KIND,
  "community_confirmation.outcome_updated",
  "community_confirmation.request_expired",
]);
const URGENT_CONFIRMATION_POLL_MS = 15000;

function readLocalCompanionSettings(): Partial<CompanionSettings> {
  try {
    const raw = window.localStorage.getItem(LOCAL_COMPANION_SETTINGS_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function readDismissedCompanionToastMap(): Record<string, number> {
  try {
    if (typeof window === "undefined") return {};
    const raw = window.localStorage.getItem(DISMISSED_COMPANION_TOASTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};

    const now = Date.now();
    const next: Record<string, number> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([id, value]) => {
      const dismissedAt = Number(value || 0);
      if (!id || !Number.isFinite(dismissedAt)) return;
      if (now - dismissedAt > DISMISSED_COMPANION_TOAST_TTL_MS) return;
      next[id] = dismissedAt;
    });

    if (Object.keys(next).length !== Object.keys(parsed).length) {
      window.localStorage.setItem(
        DISMISSED_COMPANION_TOASTS_KEY,
        JSON.stringify(next)
      );
    }

    return next;
  } catch {
    return {};
  }
}

function rememberDismissedCompanionToast(id: string): void {
  try {
    if (!id) return;
    const next = readDismissedCompanionToastMap();
    next[id] = Date.now();
    window.localStorage.setItem(
      DISMISSED_COMPANION_TOASTS_KEY,
      JSON.stringify(next)
    );
  } catch {
    // local storage is best-effort
  }
}

function toastCard(priority: CompanionToastPayload["priority"]): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 18,
    boxShadow: "0 16px 34px rgba(15,23,42,0.14)",
    padding: 14,
    maxHeight: "min(62vh, 430px)",
    overflowY: "auto",
  };

  if (priority === "urgent") {
    return {
      ...base,
      background: "#FFF5F5",
      border: "1px solid rgba(239,68,68,0.18)",
    };
  }

  if (priority === "important") {
    return {
      ...base,
      background: "#FFFBEF",
      border: "1px solid rgba(245,158,11,0.18)",
    };
  }

  return {
    ...base,
    background: "#F8FBFF",
    border: "1px solid rgba(11,31,51,0.10)",
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
    minWidth: 32,
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
  const lastUrgentPollRef = useRef(0);
  const dismissedToastIdsRef = useRef<Set<string>>(
    new Set(Object.keys(readDismissedCompanionToastMap()))
  );

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

  const dismissToast = useCallback((toast: CompanionToastPayload) => {
    markCompanionUserInteraction();
    dismissedToastIdsRef.current.add(toast.id);
    rememberDismissedCompanionToast(toast.id);
    removeToast(toast.id);
  }, [removeToast]);

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
      const persistedDismissals = readDismissedCompanionToastMap();
      dismissedToastIdsRef.current = new Set(Object.keys(persistedDismissals));

      if (dismissedToastIdsRef.current.has(payload.id)) {
        return;
      }

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

  useEffect(() => {
    let alive = true;

    async function pollUrgentConfirmationNotifications(force = false) {
      const now = Date.now();
      if (!force && now - lastUrgentPollRef.current < URGENT_CONFIRMATION_POLL_MS - 500) {
        return;
      }
      lastUrgentPollRef.current = now;

      const result = await getMyNotifications(20, true).catch(() => null);
      if (!alive || !result) return;

      const rows = Array.isArray(result?.items) ? result.items : [];
      const urgent = rows.find(
        (row: any) =>
          URGENT_CONFIRMATION_OUTCOME_KINDS.has(String(row?.kind || "").trim()) &&
          row?.is_read !== true
      );

      if (!urgent) return;

      const localSettings = readLocalCompanionSettings();
      const merged = normalizeCompanionSettings({
        ...settings,
        ...(localSettings || {}),
      });

      if (JSON.stringify(merged) !== JSON.stringify(settings)) {
        setSettings(merged);
      }

      await runUrgentCompanionNotificationCycle({
        settings: merged,
        notification: {
          id: urgent.id,
          kind: urgent.kind,
          title: urgent.title || "Community confirmation needs you",
          message: urgent.message,
          actionLabel: urgent.action_label,
          actionUrl: urgent.action_url,
        },
      });
    }

    void pollUrgentConfirmationNotifications(true);

    const intervalId = window.setInterval(() => {
      void pollUrgentConfirmationNotifications();
    }, URGENT_CONFIRMATION_POLL_MS);

    function handleFocusLikeEvent() {
      void pollUrgentConfirmationNotifications(true);
    }

    function handleVisibilityChange() {
      if (typeof document === "undefined") return;
      if (!document.hidden) {
        void pollUrgentConfirmationNotifications(true);
      }
    }

    window.addEventListener("focus", handleFocusLikeEvent);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      alive = false;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", handleFocusLikeEvent);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [settings]);

  if (toasts.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 2200,
        width: "min(88vw, 350px)",
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
                  fontSize: 15,
                  fontWeight: 900,
                  lineHeight: 1.35,
                }}
              >
                {toast.title}
              </div>
            </div>

            <SubtleButton
              aria-label="Dismiss companion message"
              onClick={() => dismissToast(toast)}
              stableHeight={52}
              minWidth={32}
              debugId={`companion-toast.${toast.id}.dismiss-icon`}
              style={dismissButton()}
            >
              ×
            </SubtleButton>
          </div>

          <div
            style={{
              marginTop: 8,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.45,
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
              <PrimaryButton
                onClick={() => handleToastOpen(toast)}
                stableHeight={52}
                debugId={`companion-toast.${toast.id}.open`}
                style={actionButton(toast.priority)}
              >
                {toast.ctaLabel || "Open"}
              </PrimaryButton>
            ) : null}

            <SecondaryButton
              onClick={() => dismissToast(toast)}
              stableHeight={52}
              debugId={`companion-toast.${toast.id}.dismiss`}
              style={{
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
            </SecondaryButton>
          </div>
        </div>
      ))}
    </div>
  );
}
