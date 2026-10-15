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
import { syncGsnWebPushSubscription } from "../lib/webPush";

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
const PHONE_TRIGGER_NOTIFICATION_KINDS = new Set([
  ...URGENT_CONFIRMATION_OUTCOME_KINDS,
  "community.notice.posted",
  "community_domain.notice.posted",
]);
const PHONE_TRIGGER_POLL_MS = 15000;

function notificationKind(row: any): string {
  return String(row?.kind || "").trim();
}

function isUnreadNotification(row: any): boolean {
  return row?.is_read !== true;
}

function isPhoneTriggerNotification(row: any): boolean {
  const kind = notificationKind(row);
  return isUnreadNotification(row) && PHONE_TRIGGER_NOTIFICATION_KINDS.has(kind);
}

function isUrgentNotification(row: any): boolean {
  return (
    isUnreadNotification(row) &&
    URGENT_CONFIRMATION_OUTCOME_KINDS.has(notificationKind(row))
  );
}

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
  const [isPhone, setIsPhone] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768;
  });
  const [expandedToastId, setExpandedToastId] = useState<string | null>(null);
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
    if (typeof window === "undefined") return;

    function syncPhoneLayout() {
      setIsPhone(window.innerWidth <= 768);
    }

    syncPhoneLayout();
    window.addEventListener("resize", syncPhoneLayout);
    return () => window.removeEventListener("resize", syncPhoneLayout);
  }, []);

  useEffect(() => {
    if (
      expandedToastId &&
      !toasts.some((toast) => toast.id === expandedToastId)
    ) {
      setExpandedToastId(null);
    }
  }, [expandedToastId, toasts]);

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
    if (!settings.systemPushEnabled) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    void syncGsnWebPushSubscription().catch(() => undefined);
  }, [settings.systemPushEnabled]);

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

    async function pollPhoneTriggerNotifications(force = false) {
      const now = Date.now();
      if (!force && now - lastUrgentPollRef.current < PHONE_TRIGGER_POLL_MS - 500) {
        return;
      }
      lastUrgentPollRef.current = now;

      const result = await getMyNotifications(20, true).catch(() => null);
      if (!alive || !result) return;

      const rows = Array.isArray(result?.items) ? result.items : [];
      const urgent = rows.find(isUrgentNotification);
      const phoneNotice =
        urgent || rows.find(isPhoneTriggerNotification) || rows.find(isUnreadNotification);

      if (!phoneNotice) return;

      const localSettings = readLocalCompanionSettings();
      const merged = normalizeCompanionSettings({
        ...settings,
        ...(localSettings || {}),
      });

      if (JSON.stringify(merged) !== JSON.stringify(settings)) {
        setSettings(merged);
      }

      const kind = notificationKind(phoneNotice);
      const priority = isUrgentNotification(phoneNotice) ? "urgent" : "important";
      await runUrgentCompanionNotificationCycle({
        settings: merged,
        priority,
        source:
          kind === "community.notice.posted"
            ? "community-notice-board"
            : kind === "community_domain.notice.posted"
            ? "community-domain-notice-board"
            : "notification-feed",
        fallbackTitle: "GSN notification",
        fallbackDetail: "A GSN update is waiting for your attention.",
        fallbackCtaLabel: "Open",
        fallbackCtaTo: "/app/notifications",
        speechText:
          priority === "urgent"
            ? "Urgent GSN notification needs your response."
            : "A GSN notification is waiting.",
        notification: {
          id: phoneNotice.id,
          kind: phoneNotice.kind,
          title: phoneNotice.title || "GSN notification",
          message: phoneNotice.message,
          actionLabel: phoneNotice.action_label,
          actionUrl: phoneNotice.action_url,
        },
      });
    }

    void pollPhoneTriggerNotifications(true);

    const intervalId = window.setInterval(() => {
      void pollPhoneTriggerNotifications();
    }, PHONE_TRIGGER_POLL_MS);

    function handleFocusLikeEvent() {
      void pollPhoneTriggerNotifications(true);
    }

    function handleVisibilityChange() {
      if (typeof document === "undefined") return;
      if (!document.hidden) {
        void pollPhoneTriggerNotifications(true);
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
  const visibleToasts = isPhone ? toasts.slice(-1) : toasts;


  return (
    <div
      data-companion-layer={isPhone ? "phone" : "desktop"}
      style={{
        position: "fixed",
        zIndex: 2200,
        ...(isPhone
          ? {
              left: 10,
              right: 10,
              bottom: "calc(76px + env(safe-area-inset-bottom, 0px))",
              width: "auto",
            }
          : {
              top: 12,
              right: 12,
              width: "min(88vw, 350px)",
            }),
        display: "grid",
        gap: 10,
        pointerEvents: "none",
      }}
    >
      {visibleToasts.map((toast) => {
        const expanded = !isPhone || expandedToastId === toast.id;
        return (
          <div
            key={toast.id}
            data-companion-toast-mode={
              isPhone ? (expanded ? "expanded" : "compact") : "desktop"
            }
            data-companion-toast-priority={toast.priority}
            style={{
              ...toastCard(toast.priority),
              pointerEvents: "auto",
              ...(expanded
                ? {}
                : { minHeight: 60, maxHeight: 60, padding: "8px 8px 8px 12px", overflow: "hidden" }),
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: expanded ? 10 : 6,
                alignItems: expanded ? "start" : "center",
                minHeight: expanded ? undefined : 44,
              }}
            >
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <div
                style={{
                  fontSize: expanded ? 12 : 11,
                  fontWeight: 900,
                  letterSpacing: 0.28,
                  textTransform: "uppercase",
                  color: toneText(toast.priority),
                }}
              >
                {expanded
                  ? "Companion"
                  : toast.priority === "urgent"
                    ? "Urgent"
                    : toast.priority === "important"
                      ? "Needs attention"
                      : "Reminder"}
              </div>

              <div
                style={{
                  marginTop: expanded ? 6 : 3,
                  color: "#0B1F33",
                  fontSize: expanded ? 15 : 13,
                  fontWeight: 900,
                  lineHeight: expanded ? 1.35 : 1.2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: expanded ? "normal" : "nowrap",
                }}
              >
                {toast.title}
              </div>
            </div>

            {!expanded ? (
              <SubtleButton
                onClick={() => setExpandedToastId(toast.id)}
                stableHeight={44}
                minWidth={58}
                debugId={`companion-toast.${toast.id}.view`}
                style={{
                  borderRadius: 10,
                  padding: "8px 10px",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                View
              </SubtleButton>
            ) : null}

            <SubtleButton
              aria-label="Dismiss companion message"
              onClick={() => dismissToast(toast)}
              stableHeight={expanded ? 52 : 44}
              minWidth={expanded ? 32 : 44}
              debugId={`companion-toast.${toast.id}.dismiss-icon`}
              style={{
                ...dismissButton(),
                ...(expanded ? {} : { width: 44, height: 44, minWidth: 44 }),
              }}
            >
              ×
            </SubtleButton>
          </div>

          <div
            data-companion-toast-detail="true"
            style={{
              display: expanded ? "block" : "none",
              marginTop: 8,
              color: "#5F7287",
              fontSize: 14,
              lineHeight: 1.45,
            }}
          >
            {toast.detail}
          </div>

          <div
            data-companion-toast-actions="true"
            style={{
              marginTop: 12,
              display: expanded ? "flex" : "none",
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
        );
      })}
    </div>
  );
}
