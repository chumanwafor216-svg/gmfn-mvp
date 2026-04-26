import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import ExplainToggle from "../components/ExplainToggle";
import OriginLink from "../components/OriginLink";
import PageTopNav from "../components/PageTopNav";
import { getCurrentClan, getMe, getMySettings } from "../lib/api";
import { buildGuidanceSnapshot } from "../lib/guidance";
import {
  brandActionButton,
  brandBadge,
  brandHelperText,
  brandInnerCard,
  brandPageCard,
  brandSectionLabel,
  brandSoftCard,
  gmfnBrand,
} from "../styles/gmfnBrand";
import {
  GMFN_CAPABILITY_COUNT,
  GMFN_CAPABILITIES,
} from "../lib/gmfnCapabilities";
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
  return brandPageCard(bg);
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return brandSoftCard(bg);
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return brandInnerCard(bg);
}

function routeTile(primary = false): React.CSSProperties {
  return {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 108,
    borderRadius: 18,
    border: primary
      ? `1px solid ${gmfnBrand.colors.accentBorder}`
      : `1px solid ${gmfnBrand.colors.line}`,
    background: primary ? "#F7FAFF" : gmfnBrand.colors.panel,
    padding: 16,
    textDecoration: "none",
    boxShadow: primary ? "0 10px 24px rgba(29,78,216,0.05)" : "none",
  };
}

function capabilityCard(primary = false): React.CSSProperties {
  return {
    borderRadius: 18,
    border: primary
      ? `1px solid ${gmfnBrand.colors.accentBorder}`
      : `1px solid ${gmfnBrand.colors.line}`,
    background: primary ? "#F7FAFF" : gmfnBrand.colors.panel,
    padding: 16,
  };
}

function sectionLabel(): React.CSSProperties {
  return brandSectionLabel();
}

function badge(primary = false): React.CSSProperties {
  return brandBadge(primary);
}

function actionBtn(
  kind: "primary" | "secondary" | "soft" = "secondary",
  disabled = false
): React.CSSProperties {
  return brandActionButton(kind, disabled);
}

function helperText(): React.CSSProperties {
  return brandHelperText();
}

function selectStyle(): React.CSSProperties {
  return {
    width: "100%",
    minHeight: 44,
    borderRadius: 14,
    border: `1px solid ${gmfnBrand.colors.lineStrong}`,
    background: gmfnBrand.colors.panel,
    padding: "11px 12px",
    fontSize: 14,
    color: gmfnBrand.colors.ink,
    outline: "none",
    boxSizing: "border-box",
  };
}

function checkboxRow(): React.CSSProperties {
  return {
    display: "flex",
    gap: 10,
    alignItems: "flex-start",
    color: gmfnBrand.colors.ink,
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
      ) || "No current community"
    );
  }, [currentClan]);

  const nextBestStep = guidance?.nextBestStep || null;
  const capabilityCount = GMFN_CAPABILITY_COUNT;

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
          sectionLabel="My GSN and I"
          title="My GSN and I"
          subtitle="Loading your workspace settings..."
          homeTo="/app/dashboard"
          homeLabel="Dashboard"
          backTo="/app/dashboard"
        />

        <section style={pageCard("#FFFFFF")}>
          <div style={{ color: "#64748B", lineHeight: 1.8 }}>
            Loading workspace settings...
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
        sectionLabel="My GSN and I"
        title="My GSN and I"
        subtitle={`Keep the ${capabilityCount} core capabilities visible here while workspace settings stay in a separate tab.`}
        homeTo="/app/dashboard"
        homeLabel="Dashboard"
        backTo="/app/dashboard"
      />

      <ExplainToggle
        label="What this screen does"
        what="This page explains what GSN means for you as a member and keeps the core capabilities and personal settings close at hand."
        why="It turns the product from a collection of routes into a clearer member guide that explains what the network can actually do for you."
        next="Use the Guide tab to understand the capabilities first, then open Settings when you want to tune how the workspace behaves."
        tone="blue"
      />

      {notice ? <div style={noticeCard(notice.tone)}>{notice.text}</div> : null}

      <section
        style={pageCard(gmfnBrand.gradients.hero)}
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
                color: gmfnBrand.colors.darkText,
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
                color: gmfnBrand.colors.darkMuted,
                maxWidth: 860,
              }}
            >
              GSN is your stable identity layer. The current executive summary says the network makes trust visible, portable, and usable across trade, finance, savings, identity, work, community participation, and disciplined follow-through. This keeps those {capabilityCount} core capabilities visible in one place.
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
              <span style={badge(false)}>{capabilityCount} core capabilities</span>
              <span style={badge(false)}>Member guide</span>
            </div>
          </div>

          <div
            style={{
              ...softCard(gmfnBrand.colors.overlayPanel),
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
                  "Use the guide below when you want a clear explanation of what the network can do for you."
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
            <div style={sectionLabel()}>{capabilityCount} things GSN can do for you</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              These are the {capabilityCount} core capabilities that explain what GSN can do for you.
            </div>

            <ExplainToggle
              label="How to use this guide"
              what="This section lists the core capabilities so you can understand what the network can do for you across identity, trust, finance, trade, and disciplined follow-through."
              why="It gives you a member-level explanation of the product instead of leaving those capabilities spread across many separate pages."
              next="Read the capability that matches what you need now, then open the related route from the page navigation when you want to act on it."
              tone="light"
              style={{ marginTop: 12 }}
            />

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
              {GMFN_CAPABILITIES.map((item, index) => (
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
            <div style={sectionLabel()}>
              Full explanation of the {capabilityCount} core capabilities
            </div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              The executive summary uses the same explanation structure for all {capabilityCount} capabilities.
            </div>

            <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
              {GMFN_CAPABILITIES.map((item) => (
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
                      {item.whatItIs ||
                        item.proverb ||
                        "Exists in real life, made visible in GSN."}
                    </div>

                    <div style={helperText()}>
                      <strong style={{ color: "#0B1F33" }}>How it works:</strong>{" "}
                      {item.howItWorks ||
                        item.gmfn ||
                        "Identity + trust + community."}
                    </div>

                    <div style={helperText()}>
                      <strong style={{ color: "#0B1F33" }}>Why it matters:</strong>{" "}
                      {item.whyItMatters ||
                        item.gmfn ||
                        item.proverb ||
                        "Improves access, reduces risk."}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section style={pageCard("#FFFFFF")}>
            <div style={sectionLabel()}>Where these capabilities usually appear in the app</div>

            <div style={{ marginTop: 10, ...helperText(), maxWidth: 920 }}>
              The {capabilityCount} capabilities do not all live on one page. Different pages carry different parts of the system.
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
                  People-backed loans, supporting others, emergency support, and trust savings all run through the support flow here.
                </div>
              </OriginLink>

              <OriginLink to="/app/my-gmfn-and-i" style={routeTile(false)}>
                <div
                  style={{
                    color: "#0B1F33",
                    fontWeight: 900,
                    fontSize: 17,
                    lineHeight: 1.3,
                  }}
                >
                  Commitment Builder
                </div>
                <div style={{ marginTop: 10, ...helperText(), fontSize: 13 }}>
                  Commitment Builder, member guidance, and the 22-capability explanation live here
                  while the execution discipline layer grows into more routes over time.
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
                  Demand Box is its own core capability and its own page.
                </div>
              </OriginLink>
            </div>
          </section>
        </>
      ) : (
        <section style={pageCard("#FFFFFF")}>
          <div style={sectionLabel()}>Workspace settings</div>

          <div style={{ marginTop: 10, ...helperText(), maxWidth: 860 }}>
            Keep the app calmer and easier to read without changing the {capabilityCount} core capabilities guide.
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
                    Open the destination page directly from the primary action instead of reviewing it here first.
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


