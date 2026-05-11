import React, { useEffect, useState } from "react";
import { SecondaryButton } from "./StableButton";
import { getMySettings, updateMySettings } from "../lib/api";
import { emitCompanionSettingsUpdated } from "../lib/workspaceEvents";
import {
  markCompanionUserInteraction,
  normalizeCompanionSettings,
  requestCompanionNotificationPermission,
  type CompanionSettings,
} from "../lib/companion";

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

function writeLocalCompanionSettings(value: Partial<CompanionSettings>) {
  try {
    window.localStorage.setItem(
      LOCAL_COMPANION_SETTINGS_KEY,
      JSON.stringify(value)
    );
  } catch {
    // local settings are best-effort only
  }
}

function pageCard(): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 16,
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#5D7389",
    fontWeight: 900,
    letterSpacing: 0.35,
    textTransform: "uppercase",
  };
}

function optionButton(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
    padding: "10px 12px",
    borderRadius: 12,
    border: active
      ? "1px solid #0B63D1"
      : "1px solid rgba(11,31,51,0.10)",
    background: active ? "rgba(11,99,209,0.08)" : "#FFFFFF",
    color: active ? "#0B63D1" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
}

function toggleButton(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 86,
    minHeight: 38,
    padding: "8px 12px",
    borderRadius: 12,
    border: active
      ? "1px solid #0B63D1"
      : "1px solid rgba(11,31,51,0.10)",
    background: active ? "rgba(11,99,209,0.08)" : "#FFFFFF",
    color: active ? "#0B63D1" : "#0B1F33",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
  };
}

function inputStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: "11px 12px",
    fontSize: 14,
    color: "#0B1F33",
    outline: "none",
    boxSizing: "border-box",
  };
}

function statusChip(tone: "success" | "error" | "info"): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 32,
    padding: "6px 10px",
    borderRadius: 999,
    background:
      tone === "success"
        ? "#EAF7EE"
        : tone === "error"
        ? "#FEF2F2"
        : "#F1F5F9",
    color:
      tone === "success"
        ? "#166534"
        : tone === "error"
        ? "#991B1B"
        : "#334155",
    fontSize: 12,
    fontWeight: 900,
  };
}

export default function CompanionSettingsPanel() {
  const [settings, setSettings] = useState<CompanionSettings>(
    normalizeCompanionSettings({})
  );
  const [statusText, setStatusText] = useState("");
  const [statusTone, setStatusTone] = useState<"success" | "error" | "info">(
    "info"
  );

  useEffect(() => {
    let alive = true;

    (async () => {
      const localSettings = readLocalCompanionSettings();
      const serverSettings = await getMySettings().catch(() => null);

      if (!alive) return;

      setSettings(
        normalizeCompanionSettings({
          ...(serverSettings || {}),
          ...(localSettings || {}),
        })
      );
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!statusText) return;

    const timer = window.setTimeout(() => {
      setStatusText("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [statusText]);

  async function persist(next: CompanionSettings) {
    setSettings(next);
    writeLocalCompanionSettings(next);
    emitCompanionSettingsUpdated(next);
    setStatusText("Saving...");
    setStatusTone("info");

    try {
      await updateMySettings(
        {
          companionMode: next.companionMode,
          audibleNudgeLevel: next.audibleNudgeLevel,
          voicePromptsEnabled: next.voicePromptsEnabled,
          systemPushEnabled: next.systemPushEnabled,
          quietHoursStart: next.quietHoursStart,
          quietHoursEnd: next.quietHoursEnd,
          maxDailyNudges: next.maxDailyNudges,
          repeatReminderMinutes: next.repeatReminderMinutes,
        } as any
      );

      setStatusText("Saved.");
      setStatusTone("success");
    } catch {
      setStatusText("Saved on this device.");
      setStatusTone("info");
    }
  }

  async function patch<K extends keyof CompanionSettings>(
    key: K,
    value: CompanionSettings[K]
  ) {
    markCompanionUserInteraction();

    let nextValue = value;

    if (key === "systemPushEnabled" && value === true) {
      const permission = await requestCompanionNotificationPermission();

      if (permission === "denied") {
        setStatusText("Browser notifications are blocked.");
        setStatusTone("error");
        nextValue = false as CompanionSettings[K];
      }

      if (permission === "unsupported") {
        setStatusText("This browser does not support system notifications.");
        setStatusTone("error");
        nextValue = false as CompanionSettings[K];
      }
    }

    const next = normalizeCompanionSettings({
      ...settings,
      [key]: nextValue,
    });

    await persist(next);
  }

  return (
    <section style={pageCard()}>
      <div style={sectionLabel()}>Companion mode</div>

      <div
        style={{
          marginTop: 12,
          color: "#0B1F33",
          fontSize: 26,
          fontWeight: 900,
          lineHeight: 1.16,
        }}
      >
        Let the app gently call attention back
      </div>

      <div
        style={{
          marginTop: 10,
          color: "#5F7287",
          fontSize: 15,
          lineHeight: 1.8,
          maxWidth: 860,
        }}
      >
        This controls the companion behavior: soft reminder toasts, optional
        system notifications, optional sound, and optional voice prompts. Keep
        it calm and disciplined.
      </div>

      <div
        style={{
          marginTop: 14,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        {statusText ? (
          <span style={statusChip(statusTone)}>{statusText}</span>
        ) : null}

        <span style={statusChip("info")}>
          Sound uses your existing browser audio permission
        </span>
      </div>

      <div
        style={{
          marginTop: 18,
          display: "grid",
          gap: 14,
        }}
      >
        <div style={softCard("#F8FBFF")}>
          <div style={sectionLabel()}>Companion intensity</div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <SecondaryButton
              onClick={() => void patch("companionMode", "off")}
              stableHeight={40}
              debugId="companion-settings.mode.off"
              style={optionButton(settings.companionMode === "off")}
            >
              Off
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void patch("companionMode", "light")}
              stableHeight={40}
              debugId="companion-settings.mode.light"
              style={optionButton(settings.companionMode === "light")}
            >
              Light
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void patch("companionMode", "active")}
              stableHeight={40}
              debugId="companion-settings.mode.active"
              style={optionButton(settings.companionMode === "active")}
            >
              Active
            </SecondaryButton>
          </div>
        </div>

        <div style={softCard("#FFFFFF")}>
          <div style={sectionLabel()}>Audible nudge level</div>

          <div
            style={{
              marginTop: 10,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <SecondaryButton
              onClick={() => void patch("audibleNudgeLevel", "off")}
              stableHeight={40}
              debugId="companion-settings.audible.off"
              style={optionButton(settings.audibleNudgeLevel === "off")}
            >
              Off
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void patch("audibleNudgeLevel", "urgent-only")}
              stableHeight={40}
              debugId="companion-settings.audible.urgent-only"
              style={optionButton(
                settings.audibleNudgeLevel === "urgent-only"
              )}
            >
              Urgent only
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void patch("audibleNudgeLevel", "important-only")}
              stableHeight={40}
              debugId="companion-settings.audible.important-only"
              style={optionButton(
                settings.audibleNudgeLevel === "important-only"
              )}
            >
              Important only
            </SecondaryButton>
            <SecondaryButton
              onClick={() => void patch("audibleNudgeLevel", "all")}
              stableHeight={40}
              debugId="companion-settings.audible.all"
              style={optionButton(settings.audibleNudgeLevel === "all")}
            >
              All nudges
            </SecondaryButton>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Voice prompts</div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <SecondaryButton
                onClick={() => void patch("voicePromptsEnabled", true)}
                minWidth={86}
                stableHeight={38}
                debugId="companion-settings.voice.on"
                style={toggleButton(settings.voicePromptsEnabled === true)}
              >
                On
              </SecondaryButton>
              <SecondaryButton
                onClick={() => void patch("voicePromptsEnabled", false)}
                minWidth={86}
                stableHeight={38}
                debugId="companion-settings.voice.off"
                style={toggleButton(settings.voicePromptsEnabled === false)}
              >
                Off
              </SecondaryButton>
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Short spoken reminders for important or urgent companion nudges.
            </div>
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>System notifications</div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <SecondaryButton
                onClick={() => void patch("systemPushEnabled", true)}
                minWidth={86}
                stableHeight={38}
                debugId="companion-settings.push.on"
                style={toggleButton(settings.systemPushEnabled === true)}
              >
                On
              </SecondaryButton>
              <SecondaryButton
                onClick={() => void patch("systemPushEnabled", false)}
                minWidth={86}
                stableHeight={38}
                debugId="companion-settings.push.off"
                style={toggleButton(settings.systemPushEnabled === false)}
              >
                Off
              </SecondaryButton>
            </div>

            <div
              style={{
                marginTop: 10,
                color: "#5F7287",
                fontSize: 13,
                lineHeight: 1.7,
              }}
            >
              Use browser notifications when the page is not in the foreground.
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 14,
          }}
        >
          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Quiet hours start</div>
            <input
              type="time"
              value={settings.quietHoursStart}
              onChange={(e) => void patch("quietHoursStart", e.target.value)}
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Quiet hours end</div>
            <input
              type="time"
              value={settings.quietHoursEnd}
              onChange={(e) => void patch("quietHoursEnd", e.target.value)}
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={softCard("#F8FBFF")}>
            <div style={sectionLabel()}>Max daily nudges</div>
            <input
              type="number"
              min={1}
              max={20}
              value={settings.maxDailyNudges}
              onChange={(e) =>
                void patch(
                  "maxDailyNudges",
                  Math.max(1, Number(e.target.value || 1))
                )
              }
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>

          <div style={softCard("#FFFFFF")}>
            <div style={sectionLabel()}>Repeat reminder minutes</div>
            <input
              type="number"
              min={5}
              max={1440}
              value={settings.repeatReminderMinutes}
              onChange={(e) =>
                void patch(
                  "repeatReminderMinutes",
                  Math.max(5, Number(e.target.value || 5))
                )
              }
              style={{ ...inputStyle(), marginTop: 8 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
