// src/pages/AppearancePage.tsx
import React, { useEffect, useMemo, useState } from "react";
import { applyAppearanceToDocument, getWatermarkCustomHex, getWatermarkPreset, setWatermarkCustomHex, setWatermarkPreset, type WatermarkPreset } from "../lib/appearance";
import { Card, PageHeader, Button, ButtonPrimary, Pill } from "../components/uiKit";

function isValidHex(s: string): boolean {
  const t = (s || "").trim();
  return /^#?[0-9a-fA-F]{6}$/.test(t);
}

export default function AppearancePage() {
  const [preset, setPreset] = useState<WatermarkPreset>("green");
  const [custom, setCustom] = useState("#111827");

  useEffect(() => {
    const p = getWatermarkPreset();
    setPreset(p);
    setCustom(getWatermarkCustomHex());
  }, []);

  const effectiveHex = useMemo(() => {
    if (preset === "green") return "#16a34a";
    if (preset === "black") return "#111827";
    if (preset === "pink") return "#db2777";
    return (custom || "").startsWith("#") ? custom : `#${custom}`;
  }, [preset, custom]);

  function applyNow(nextPreset: WatermarkPreset, nextCustom?: string) {
    setWatermarkPreset(nextPreset);
    if (nextCustom != null) setWatermarkCustomHex(nextCustom);
    applyAppearanceToDocument();
  }

  return (
    <div style={{ padding: 18, maxWidth: 900 }}>
      <PageHeader
        title="Appearance"
        subtitle="Only one setting is user-controlled: the Watermark / Emboss tint. Everything else stays professional and consistent."
      />

      <Card style={{ marginTop: 12 }}>
        <div style={{ fontSize: 16, fontWeight: 1000 }}>Watermark / Emboss tint</div>
        <div style={{ marginTop: 6, color: "#64748b", fontSize: 12 }}>
          This controls the faint “GMFN” background watermark and subtle embossed highlights. Grey base background stays fixed.
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <ButtonPrimary
            onClick={() => {
              setPreset("green");
              applyNow("green");
            }}
            style={{ opacity: preset === "green" ? 1 : 0.75 }}
          >
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: "#16a34a", display: "inline-block" }} />
              Green
            </span>
          </ButtonPrimary>

          <ButtonPrimary
            onClick={() => {
              setPreset("black");
              applyNow("black");
            }}
            style={{ opacity: preset === "black" ? 1 : 0.75 }}
          >
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: "#111827", display: "inline-block" }} />
              Black
            </span>
          </ButtonPrimary>

          <ButtonPrimary
            onClick={() => {
              setPreset("pink");
              applyNow("pink");
            }}
            style={{ opacity: preset === "pink" ? 1 : 0.75 }}
          >
            <span style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
              <span style={{ width: 12, height: 12, borderRadius: 999, background: "#db2777", display: "inline-block" }} />
              Pink
            </span>
          </ButtonPrimary>

          <Button
            onClick={() => {
              setPreset("custom");
              applyNow("custom", custom);
            }}
            style={{ opacity: preset === "custom" ? 1 : 0.75 }}
          >
            Custom
          </Button>
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="#111827"
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid #e5e7eb", width: 160 }}
          />
          <ButtonPrimary
            onClick={() => {
              if (!isValidHex(custom)) {
                alert("Enter a valid 6-digit hex, e.g. #111827");
                return;
              }
              setPreset("custom");
              applyNow("custom", custom);
            }}
          >
            Save custom
          </ButtonPrimary>

          <Pill kind="gray">Preview: {effectiveHex}</Pill>
        </div>

        <div style={{ marginTop: 14, color: "#64748b", fontSize: 12 }}>
          Tip: If you want it subtle, use a softer hex (e.g. #94a3b8) or keep Green.
        </div>
      </Card>
    </div>
  );
}