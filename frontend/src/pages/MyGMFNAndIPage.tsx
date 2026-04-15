import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, getMySettings } from "../lib/api";
import { buildGuidanceSnapshot } from "../lib/guidance";
import * as api from "../lib/api";

type SettingsState = {
  notificationsMode: "summary" | "detailed";
  unreadFirst: boolean;
  openActionsDirectly: boolean;
  tonePreset: "balanced-default" | "cooperative-warm" | "enterprise-green";
};

type NoticeTone = "success" | "error";

const SETTINGS_STORAGE_KEY = "gmfn.myGmfnAndI.settings.v2";

const DEFAULT_SETTINGS: SettingsState = {
  notificationsMode: "summary",
  unreadFirst: true,
  openActionsDirectly: true,
  tonePreset: "balanced-default",
};

const CAPABILITIES = [
  { id: 1, title: "Release Before Payment" },
  { id: 2, title: "Trusted Buying and Selling" },
  { id: 3, title: "Cross-Community Trade" },
  { id: 4, title: "Fraud Reduction Before Action" },
  { id: 5, title: "Spotlight Visibility" },
  { id: 6, title: "Reputation-Based Visibility" },
  { id: 7, title: "Marketplace Presence Across Communities" },
  { id: 8, title: "People-Backed Loans" },
  { id: 9, title: "Supporting Others" },
  { id: 10, title: "Emergency Support" },
  { id: 11, title: "Diaspora Trust Bridge" },
  { id: 12, title: "Trust Savings (ROSCA Support)" },
  { id: 13, title: "Contribution Tracking" },
  { id: 14, title: "Continuity Across Distance" },
  { id: 15, title: "Portable Trust Identity" },
  { id: 16, title: "Reputation Mobility" },
  { id: 17, title: "One Global Shop" },
  { id: 18, title: "Service Economy Participation" },
  { id: 19, title: "Trust-Based Hiring" },
  { id: 20, title: "Demand Box" },
  { id: 21, title: "Community Economic Power" },
] as const;

function safeStr(x: any): string {
  return String(x ?? "").trim();
}

function firstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = safeStr(value);
    if (text) return text;
  }
  return "";
}

function pageCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 24,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 20,
    boxShadow:
      "0 14px 34px rgba(15,23,42,0.045), 0 2px 8px rgba(15,23,42,0.02)",
    overflow: "hidden",
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

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(11,31,51,0.08)",
    background: bg,
    padding: 14,
  };
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 108,
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
    padding: 16,
    textDecoration: "none",
    boxShadow: primary ? "0 10px 24px rgba(11,99,209,0.05)" : "none",
  };
}

function capabilityCard(primary = false): React.CSSProperties {
  return {
    borderRadius: 18,
    border: primary
      ? "1px solid rgba(11,99,209,0.18)"
      : "1px solid rgba(11,31,51,0.08)",
    background: primary ? "#F7FAFF" : "#FFFFFF",
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

function badge(primary = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: primary ? "rgba(11,99,209,0.08)" : "rgba(100,116,139,0.10)",
    color: primary ? "#0B63D1" : "#51657A",
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "nowrap",
  };
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  if (kind === "primary") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 42,
      padding: "10px 14px",
      borderRadius: 14,
      border: "none",
      background: disabled ? "#CBD5E1" : "#0B63D1",
      color: "#FFFFFF",
      fontWeight: 900,
      fontSize: 14,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  if (kind === "soft") {
    return {
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: 38,
      padding: "8px 12px",
      borderRadius: 12,
      border: "1px solid rgba(11,31,51,0.08)",
      background: "#F8FBFF",
      color: disabled ? "#94A3B8" : "#24415C",
      fontWeight: 800,
      fontSize: 13,
      textDecoration: "none",
      cursor: disabled ? "not-allowed" : "pointer",
      whiteSpace: "nowrap",
      opacity: disabled ? 0.86 : 1,
    };
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    padding: "10px 14px",
    borderRadius: 14,
    border: "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    color: disabled ? "#94A3B8" : "#0B1F33",
    fontWeight: 800,
    fontSize: 14,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "nowrap",
    opacity: disabled ? 0.86 : 1,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: "#5F7287",
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function selectStyle(): React.CSSProperties {
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

function checkboxRow(): React.CSSProperties {
  return {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: "#0B1F33",
    fontSize: 14,
    lineHeight: 1.6,
  };
}

function noticeCard(tone: NoticeTone): React.CSSProperties {
  return {
    ...softCard(tone === "success" ? "#F3FBF5" : "#FEF2F2"),
    color: tone === "success" ? "#166534" : "#991B1B",
    border:
      tone === "success"
        ? "1px solid rgba(34,197,94,0.16)"
        : "1px solid rgba(239,68,68,0.16)",
    fontWeight: 800,
  };
}

function readLocalJSON<T>(key: string, fallback: T): T {
  try {
    if (typeof window === "undefined") return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalJSON(key: string, value: any) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

function normalizeSettings(raw: any): SettingsState {
  const tone = safeStr(raw?.tonePreset || raw?.tone_preset);

  return {
    notificationsMode:
      safeStr(raw?.notificationsMode || raw?.notifications_mode) === "detailed"
        ? "detailed"
        : "summary",
    unreadFirst: Boolean(raw?.unreadFirst ?? raw?.unread_first ?? true),
    openActionsDirectly: Boolean(
      raw?.openActionsDirectly ?? raw?.open_actions_directly ?? true
    ),
    tonePreset:
      tone === "cooperative-warm" || tone === "enterprise-green"
        ? (tone as SettingsState["tonePreset"])
        : "balanced-default",
  };
}

async function callFirstAvailable<T = any>(
  names: string[],
  argsSets: any[][]
): Promise<T | null> {
  for (const name of names) {
    const fn = (api as any)[name];
    if (typeof fn !== "function") continue;

    for (const args of argsSets) {
      try {
        const result = await fn(...args);
        if (result) return result as T;
      } catch {
        // try next signature
      }
    }
  }

  return null;
}

export default function MyGMFNAndIPage() {
  const location = useLocation();

  const [isCompact, setIsCompact] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 980;
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: NoticeTone;
    text: string;
  } | null>(null);

  const [me, setMe] = useState<any>(null);
  const [currentClan, setCurrentClan] = useState<any>(null);
  const [guidance, setGuidance] = useState<any>(null);
  const [settings, setSettings] = useState<SettingsState>(() =>
    readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS)
  );

  const activeTab = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return safeStr(params.get("tab")).toLowerCase() === "settings"
      ? "settings"
      : "guide";
  }, [location.search]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleResize() {
      setIsCompact(window.innerWidth <= 980);
    }

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    writeLocalJSON(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  useEffect(() => {
    if (!notice) return;

    const timer = window.setTimeout(() => {
      setNotice(null);
    }, 2400);

    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);

      try {
        const [meRes, clanRes, settingsRes, guidanceRes] = await Promise.all([
          getMe().catch(() => null),
          getCurrentClan().catch(() => null),
          getMySettings().catch(() => null),
          buildGuidanceSnapshot().catch(() => null),
        ]);

        if (!alive) return;

        const localSettings = readLocalJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);

        setMe(meRes || null);
        setCurrentClan(clanRes || null);
        setSettings(
          settingsRes ? normalizeSettings(settingsRes) : normalizeSettings(localSettings)
        );
        setGuidance(guidanceRes || null);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const displayName = useMemo(() => {
    return (
      firstTruthy(
        me?.display_name,
        me?.nickname,
        me?.name,
        me?.first_name,
        me?.email
      ) || "Member"
    );
  }, [me]);

  const gmfnId = useMemo(() => {
    return firstTruthy(me?.gmfn_id, "Awaiting issue");
  }, [me]);

  const communityLabel = useMemo(() => {
    return (
      firstTruthy(
        currentClan?.marketplace_name,
        currentClan?.name,
        currentClan?.display_name,
        currentClan?.title
      ) || "No selected community"
    );
  }, [currentClan]);

  const nextBestStep = guidance?.nextBestStep || null;

  function showNotice(tone: NoticeTone, text: string) {
    setNotice({ tone, text });
  }

  async function saveSettings() {
    setSaving(true);

    try {
      const payload = {
        notificationsMode: settings.notificationsMode,
        notifications_mode: settings.notificationsMode,
        unreadFirst: settings.unreadFirst,
        unread_first: settings.unreadFirst,
        openActionsDirectly: settings.openActionsDirectly,
        open_actions_directly: settings.openActionsDirectly,
        tonePreset: settings.tonePreset,
        tone_preset: settings.tonePreset,
      };

      const saved = await callFirstAvailable(
        [
          "updateMySettings",
          "saveMySettings",
          "updateSettings",
          "saveSettings",
          "setMySettings",
        ],
        [[payload]]
      );

      writeLocalJSON(SETTINGS_STORAGE_KEY, settings);

      if (saved) {
        showNotice("success", "Settings saved.");
      } else {
        showNotice(
          "success",
          "Settings saved locally. Backend settings save API is not wired in this build yet."
        );
      }
    } catch (err: any) {
      showNotice(
        "error",
        safeStr(err?.message) || "Settings could not be saved right now."
      );
    } finally {
      setSaving(false);
    }
  }

  function resetSettings() {
    setSettings(DEFAULT_SETTINGS);
    showNotice("success", "Settings reset to the calmer defaults.");
  }

  if (loading) {
    return (
      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          paddingBottom: 40,
          display: "grid",
          gap: 18,
        }}
      >
        <PageTopNav
          sectionLabel="My GMFN and I"
          title="My GMFN and I"
          subtitle="Loading your guide and workspace settings..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
          nextLinks={[
            { label: "Trust Passport", to: "/app/trust" },
            { label: "Community Home", to: "/app/community" },
            { label: "Marketplace", to: "/app/marketplace" },
          ]}
          utilityLinks={[
            { label: "Notifications", to: "/app/notifications" },
            { label: "TrustSlip", to: "/app/trust-slip" },
          ]}
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading your guide and settings...
          </div>
        </section>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 1180,
        margin: "0 auto",
        paddingBottom: 40,
        display: "grid",
        gap: 18,
      }}
    >
      <PageTopNav
        sectionLabel="My GMFN and I"
        title="My GMFN and I"
        subtitle="This page keeps the 21 core capabilities visible while leaving workspace settings in a separate tab."
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
        nextLinks={[
          { label: "Trust Passport", to: "/app/trust" },
          { label: "Community Home", to: "/app/community" },
          { label: "Marketplace", to: "/app/marketplace" },
        ]}
        utilityLinks={[
          { label: "Notifications", to: "/app/notifications" },
          { label: "TrustSlip", to: "/app/trust-slip" },
        ]}
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(
          "linear-gradient(180deg, #08111F 0%, #0B1F33 52%, #102A43 100%)"
        )}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.1fr) 320px",
            gap: 16,
            alignItems: "start",
          }}
        >
          <div>
            <div style={sectionLabel()}>Member guide</div>

            <div
              style={{
                marginTop: 10,
                color: "#F8FBFF",
                fontWeight: 900,
                fontSize: isCompact ? 28 : 34,
                lineHeight: 1.1,
              }}
            >
              Welcome, {displayName}
            </div>

            <div
              style={{
                marginTop: 12,
                ...helperText(),
                color: "#D7E3F1",
                maxWidth: 860,
              }}
            >
              GMFN is your stable identity layer. The current executive summary says the network makes trust visible, portable, and usable across trade, finance, savings, identity, work, and community participation. This page keeps those 21 core capabilities visible in one place.
            </div>

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <span style={badge(true)}>GMFN ID: {gmfnId}</span>
              <span style={badge(false)}>Community: {communityLabel}</span>
              <span style={badge(false)}>21 core capabilities</span>
              <span style={badge(false)}>Current page: My GMFN and I</span>
              <span style={badge(false)}>Current step: Review member guide</span>
            </div>
          </div>

          <div
            style={{
              ...softCard("rgba(255,255,255,0.94)"),
              border: "1px solid rgba(148,163,184,0.16)",
            }}
          >
            <div style={sectionLabel()}>Current guidance reading</div>

            <div
              style={{
                marginTop: 10,
                color: "#0B1F33",
                fontWeight: 900,
                fontSize: 20,
                lineHeight: 1.25,
              }}
            >
              {safeStr(nextBestStep?.title || "Keep your next step calm and clear")}
            </div>

            <div style={{ marginTop: 10, ...helperText() }}>
              {safeStr(
                nextBestStep?.detail ||
                  "Use the guide below when you want a clear explanation of what the network can do for a member."
              )}
            </div>
          </div>
        </div>
      </section>

      <section style={pageCard("#FFFFFF")}>
        <div
          style={{
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
          }}
        >
          <OriginLink
            to="/app/my-gmfn-and-i"
            style={activeTab === "guide" ? actionBtn("primary") : actionBtn("secondary")}
          >
            Guide
          </OriginLink>

          <OriginLink
            to="/app/my-gmfn-and-i?tab=settings"
            style={activeTab === "settings" ? actionBtn("primary") : actionBtn("secondary")}
          >
            Settings
          </OriginLink>
        </div>
      </section>

      {activeTab === "guide" ? (
        <>
          <section style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>21 things GMFN can do for you</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              These are the 21 core capabilities. Keep this list visible. It is the core teaching section of the page.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {CAPABILITIES.map((item, index) => (
                <div
                  key={item.id}
                  style={capabilityCard(index === 0)}
                >
                  <div style={sectionLabel()}>Capability {item.id}</div>
                  <div
                    style={{
                      marginTop: 10,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 18,
                      lineHeight: 1.3,
                    }}
                  >
                    {item.title}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Full explanation of the 21 core capabilities</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              The executive summary uses the same explanation structure for all 21 capabilities.
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {CAPABILITIES.map((item) => (
                <div key={`full-${item.id}`} style={innerCard("#FCFEFF")}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span style={badge(true)}>#{item.id}</span>
                    <div
                      style={{
                        color: "#0B1F33",
                        fontWeight: 900,
                        fontSize: 18,
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </div>
                  </div>

                  <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div style={helperText()}>
                      <strong style={{ color: "#0B1F33" }}>What it is:</strong>{" "}
                      Exists in real life, made visible in GSN.
                    </div>

                    <div style={helperText()}>
                      <strong style={{ color: "#0B1F33" }}>How it works:</strong>{" "}
                      Identity + trust + community.
                    </div>

                    <div style={helperText()}>
                      <strong style={{ color: "#0B1F33" }}>Why it matters:</strong>{" "}
                      Improves access, reduces risk.
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Where these capabilities usually appear in the app</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              The 21 capabilities do not all live on one page. Different pages carry different parts of the system.
            </div>

            <div
              style={{
                marginTop: 16,
                display: "grid",
                gridTemplateColumns: isCompact
                  ? "1fr"
                  : "repeat(3, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <OriginLink to="/app/dashboard" style={routeTile(true)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Dashboard
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Start here when you need the next right step.
                </div>
              </OriginLink>

              <OriginLink to="/app/community" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Community Home
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Community power, continuity, first-circle building, and private community control start here.
                </div>
              </OriginLink>

              <OriginLink to="/app/marketplace" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Marketplace
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Buying, selling, spotlight visibility, reputation-based visibility, and one global shop become visible here.
                </div>
              </OriginLink>

              <OriginLink to="/app/loans" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Loans
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  People-backed loans, supporting others, emergency support, and trust savings flow through the support path here.
                </div>
              </OriginLink>

              <OriginLink to="/app/trust" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Trust Passport
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Portable trust identity, reputation mobility, fraud reduction before action, and deeper trust explanation live here.
                </div>
              </OriginLink>

              <OriginLink to="/app/demand-box" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Demand Box
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Demand Box is its own core capability and its own working surface.
                </div>
              </OriginLink>
            </div>
          </section>
        </>
      ) : (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Workspace settings</div>

          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            Keep the app calmer and easier to read without changing the 21 core capabilities guide.
          </div>

          <div
            style={{
              marginTop: 16,
              display: "grid",
              gridTemplateColumns: isCompact ? "1fr" : "minmax(0, 1.05fr) 320px",
              gap: 16,
              alignItems: "start",
            }}
          >
            <div style={innerCard("#FCFEFF")}>
              <div style={sectionLabel()}>Notification reading mode</div>

              <div style={{ marginTop: 8, ...helperText() }}>
                Choose whether the inbox and related pages should feel shorter or fuller.
              </div>

              <div style={{ marginTop: 12 }}>
                <select
                  value={settings.notificationsMode}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notificationsMode: e.target.value as SettingsState["notificationsMode"],
                    }))
                  }
                  style={selectStyle()}
                >
                  <option value="summary">Summary</option>
                  <option value="detailed">Detailed</option>
                </select>
              </div>

              <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
                <label style={checkboxRow()}>
                  <input
                    type="checkbox"
                    checked={settings.unreadFirst}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        unreadFirst: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    Put unread items first so the most unread work rises to the top.
                  </span>
                </label>

                <label style={checkboxRow()}>
                  <input
                    type="checkbox"
                    checked={settings.openActionsDirectly}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        openActionsDirectly: e.target.checked,
                      }))
                    }
                  />
                  <span>
                    Open the destination page directly from primary actions instead of reviewing inside the current page first.
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 18 }}>
                <div style={sectionLabel()}>Tone preset</div>
                <div style={{ marginTop: 8, ...helperText() }}>
                  Choose how the guidance language should sound.
                </div>

                <div style={{ marginTop: 12 }}>
                  <select
                    value={settings.tonePreset}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        tonePreset: e.target.value as SettingsState["tonePreset"],
                      }))
                    }
                    style={selectStyle()}
                  >
                    <option value="balanced-default">Balanced default</option>
                    <option value="cooperative-warm">Cooperative warm</option>
                    <option value="enterprise-green">Enterprise direct</option>
                  </select>
                </div>
              </div>

              <div
                style={{
                  marginTop: 18,
                  display: "flex",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => void saveSettings()}
                  disabled={saving}
                  style={actionBtn("primary", saving)}
                >
                  {saving ? "Saving..." : "Save Settings"}
                </button>

                <button
                  type="button"
                  onClick={resetSettings}
                  style={actionBtn("secondary")}
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            <div style={softCard("#FFFFFF")}>
              <div style={sectionLabel()}>Current reading</div>

              <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Notification mode</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.notificationsMode === "detailed"
                      ? "Detailed"
                      : "Summary"}
                  </div>
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Unread ordering</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.unreadFirst ? "Unread first" : "Latest first"}
                  </div>
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Primary action style</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.openActionsDirectly ? "Open directly" : "Review first"}
                  </div>
                </div>

                <div style={innerCard("#F8FBFF")}>
                  <div style={sectionLabel()}>Tone</div>
                  <div
                    style={{
                      marginTop: 8,
                      color: "#0B1F33",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    {settings.tonePreset === "cooperative-warm"
                      ? "Cooperative warm"
                      : settings.tonePreset === "enterprise-green"
                      ? "Enterprise direct"
                      : "Balanced default"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
