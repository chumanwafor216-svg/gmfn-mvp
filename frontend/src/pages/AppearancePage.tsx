import React, { useEffect, useMemo, useState } from "react";
import PageTopNav from "../components/PageTopNav";
import { GsnLegacyIcon, type GsnIconName } from "../components/GsnLegacyIcon";
import { SecondaryButton, StableCtaLink } from "../components/StableButton";
import { getSelectedClanId } from "../lib/api";
import { resolveCtaTarget, type CtaIntent } from "../lib/ctaTargets";
import { gmfnBrand } from "../styles/gmfnBrand";

function card(): React.CSSProperties {
  return {
    borderRadius: 22,
    border: "1px solid rgba(11,31,51,0.08)",
    background: "#FFFFFF",
    boxShadow: "0 18px 50px rgba(15,23,42,0.05)",
    padding: 22,
  };
}

function linkBtn(primary = false): React.CSSProperties {
  return {
    borderRadius: 14,
    border: primary ? "none" : "1px solid rgba(11,31,51,0.10)",
    background: primary ? "#0B63D1" : "#FFFFFF",
    color: primary ? "#FFFFFF" : "#0B1F33",
    fontWeight: 1000,
    fontSize: 14,
    cursor: "pointer",
  };
}

function themeButtonStyle(active: boolean): React.CSSProperties {
  return {
    textAlign: "left",
    justifyContent: "flex-start",
    borderRadius: 18,
    border: active ? "2px solid #0B63D1" : "1px solid rgba(11,31,51,0.10)",
    background: "#FFFFFF",
    padding: 16,
    cursor: "pointer",
  };
}

function labelWithIcon(icon: GsnIconName, label: string): React.ReactNode {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <GsnLegacyIcon name={icon} size={24} />
      <span>{label}</span>
    </span>
  );
}

const THEMES = [
  {
    key: "deep_blue",
    label: "GSN Institutional Blue",
    note: "Default standard for the branded workspace",
    preview: gmfnBrand.colors.accent,
  },
  { key: "soft_light", label: "Soft Light", note: "Easier for some eyes", preview: "#CBD5E1" },
  { key: "dark", label: "Dark", note: "Night mode style", preview: "#0F172A" },
  { key: "royal_purple", label: "Royal Purple", note: "Premium visual feel", preview: "#6B46C1" },
  { key: "rose_pink", label: "Rose Pink", note: "Warm, softer theme", preview: "#E64980" },
];

function routeTarget(
  intent: CtaIntent,
  communityId: number,
  debugId: string
): string {
  return String(resolveCtaTarget(intent, { communityId, debugId }).to);
}

export default function AppearancePage() {
  const [theme, setTheme] = useState("deep_blue");
  const [msg, setMsg] = useState("");
  const selectedClanId = Number(getSelectedClanId() || 0);
  const routes = useMemo(
    () => ({
      payoutDetails: routeTarget(
        "payoutDetails",
        selectedClanId,
        "appearance.route.payout-details"
      ),
      notifications: routeTarget(
        "notifications",
        selectedClanId,
        "appearance.route.notifications"
      ),
      identity: routeTarget("cci", selectedClanId, "appearance.route.identity"),
    }),
    [selectedClanId]
  );

  useEffect(() => {
    const saved = localStorage.getItem("gmfn_theme") || "deep_blue";
    setTheme(saved);
  }, []);

  function applyTheme(next: string) {
    localStorage.setItem("gmfn_theme", next);
    setTheme(next);
    const selected = THEMES.find((item) => item.key === next);
    setMsg(`${selected?.label || "Display choice"} saved. Open another page or reopen the menu to see the updated view.`);
  }

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <PageTopNav
        sectionLabel="Settings"
        title="Settings"
        subtitle="Choose the display style, payment details, notices, and identity checks that help you use GSN clearly."
      />

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Important settings
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <StableCtaLink
            to={routes.payoutDetails}
            stableHeight={52}
            debugId="appearance.route.payout-details"
            style={linkBtn(true)}
          >
            {labelWithIcon("wallet", "Bank / Wallet")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.notifications}
            stableHeight={52}
            debugId="appearance.route.notifications"
            style={linkBtn(false)}
          >
            {labelWithIcon("megaphone", "Notifications")}
          </StableCtaLink>
          <StableCtaLink
            to={routes.identity}
            stableHeight={52}
            debugId="appearance.route.identity"
            style={linkBtn(false)}
          >
            {labelWithIcon("shield", "Identity Checks")}
          </StableCtaLink>
        </div>
      </div>

      <div style={{ ...card(), marginTop: 18 }}>
        <div style={{ fontSize: 18, fontWeight: 1000, color: "#0B1F33" }}>
          Choose your display style
        </div>
        <div style={{ marginTop: 8, color: "#6B7A88", lineHeight: 1.8 }}>
          Pick the contrast and colour balance that makes GSN easiest for you to read.
        </div>

        {msg ? (
          <div
            style={{
              marginTop: 16,
              padding: "12px 14px",
              borderRadius: 14,
              background: "#ECFDF5",
              border: "1px solid #A7F3D0",
              color: "#065F46",
              fontWeight: 900,
            }}
          >
            {msg}
          </div>
        ) : null}

        <div
          style={{
            marginTop: 18,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: 14,
          }}
        >
          {THEMES.map((t) => (
            <SecondaryButton
              key={t.key}
              onClick={() => applyTheme(t.key)}
              fullWidth
              stableHeight={86}
              debugId={`appearance.theme.${t.key}`}
              style={themeButtonStyle(theme === t.key)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    background: t.preview,
                    border: "1px solid rgba(11,31,51,0.12)",
                    boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.32)",
                    flex: "0 0 auto",
                  }}
                >
                  <GsnLegacyIcon
                    name={theme === t.key ? "check" : "spark"}
                    size={28}
                    style={{ margin: 7 }}
                  />
                </div>
                <div>
                  <div style={{ fontWeight: 1000, color: "#0B1F33" }}>{t.label}</div>
                  <div style={{ marginTop: 4, fontSize: 13, color: "#64748b" }}>{t.note}</div>
                </div>
              </div>
            </SecondaryButton>
          ))}
        </div>
      </div>
    </div>
  );
}
