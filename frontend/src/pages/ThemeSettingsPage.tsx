// src/pages/ThemeSettingsPage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { initThemeOnce, loadTheme, setThemeCustomTint, setThemePreset, type GMFNTintPreset } from "../lib/theme";

function card(): React.CSSProperties {
  return {
    border: "1px solid var(--gmfn-card-border)",
    borderRadius: 18,
    padding: 16,
    background: "var(--gmfn-card-bg)",
    boxShadow: "var(--gmfn-card-shadow)",
  };
}

function btn(): React.CSSProperties {
  return {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid var(--gmfn-card-border)",
    background: "rgba(255,255,255,0.95)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function btnPrimary(): React.CSSProperties {
  return {
    ...btn(),
    border: "1px solid rgba(59,130,246,0.35)",
    background: "rgba(59,130,246,0.12)",
  };
}

function pill(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "6px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(59,130,246,0.35)" : "var(--gmfn-card-border)"}`,
    background: active ? "rgba(59,130,246,0.10)" : "rgba(255,255,255,0.75)",
    fontWeight: 900,
    cursor: "pointer",
  };
}

const PRESET_LIST: { key: GMFNTintPreset; label: string; sample: string }[] = [
  { key: "green", label: "Green", sample: "#22c55e" },
  { key: "black", label: "Black", sample: "#111827" },
  { key: "pink", label: "Pink", sample: "#ec4899" },
  { key: "custom", label: "Custom", sample: "#22c55e" },
];

export default function ThemeSettingsPage() {
  const [preset, setPreset] = useState<GMFNTintPreset>("green");
  const [customHex, setCustomHex] = useState<string>("#22c55e");

  useEffect(() => {
    initThemeOnce();
    const t = loadTheme();
    setPreset(t.preset);
    setCustomHex(t.tint);
  }, []);

  const liveTint = useMemo(() => {
    if (preset !== "custom") {
      const found = PRESET_LIST.find((p) => p.key === preset);
      return found?.sample ?? "#22c55e";
    }
    return customHex;
  }, [preset, customHex]);

  function onPickPreset(p: GMFNTintPreset) {
    setPreset(p);
    setThemePreset(p);
  }

  function onSaveCustom() {
    setPreset("custom");
    setThemeCustomTint(customHex);
  }

  return (
    <div style={{ padding: 18, maxWidth: 980 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 1000 }}>Appearance</div>
          <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
            Only one setting is user-controlled: the <b>Watermark / Emboss tint</b>. Everything else stays professional and consistent.
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, ...card() }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>Watermark / Emboss tint</div>
        <div style={{ color: "#64748b", fontSize: 12, marginTop: 6 }}>
          This controls the faint “GMFN” background watermark and subtle embossed highlights. (Grey base background stays fixed.)
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {PRESET_LIST.map((p) => (
            <button
              key={p.key}
              style={pill(preset === p.key)}
              onClick={() => onPickPreset(p.key)}
              type="button"
              title="Select tint"
            >
              <span
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 999,
                  border: "1px solid rgba(0,0,0,0.10)",
                  background: p.key === "custom" ? liveTint : p.sample,
                  display: "inline-block",
                }}
              />
              {p.label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <input
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            placeholder="#22c55e"
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid var(--gmfn-card-border)",
              width: "100%",
              background: "rgba(255,255,255,0.92)",
              fontWeight: 900,
            }}
          />
          <button style={btnPrimary()} onClick={onSaveCustom} type="button">
            Save custom
          </button>
        </div>

        <div style={{ marginTop: 12, ...card(), background: "rgba(255,255,255,0.75)" }}>
          <div style={{ fontSize: 12, color: "#64748b", fontWeight: 900 }}>Preview (tint sample)</div>
          <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                width: 140,
                height: 60,
                borderRadius: 16,
                border: "1px solid var(--gmfn-card-border)",
                background: "rgba(255,255,255,0.92)",
                boxShadow: "var(--gmfn-card-shadow)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: 0.06,
                  transform: "rotate(-15deg) translate(-10px, 8px)",
                  color: liveTint,
                  fontWeight: 1000,
                  letterSpacing: 2,
                  fontSize: 18,
                  whiteSpace: "nowrap",
                }}
              >
                GMFN • GMFN • GMFN • GMFN • GMFN •
              </div>
              <div style={{ position: "absolute", inset: 0, padding: 10, fontWeight: 1000, color: "#0f172a" }}>
                Card
              </div>
            </div>
            <div style={{ color: "#64748b", fontSize: 12 }}>
              Tip: if you want it subtler, use a softer hex (e.g. <b>#94a3b8</b>) or keep Green.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}