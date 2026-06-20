import React from "react";

type EvidenceTone = "positive" | "pressure" | "building" | "neutral";

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

export function evidenceMeterTone(status: unknown): EvidenceTone {
  const text = safeText(status).toLowerCase();
  const positive =
    text.includes("strong") ||
    text.includes("stable") ||
    text.includes("verified") ||
    text.includes("valid") ||
    text.includes("acceptable") ||
    text.includes("ready") ||
    text === "yes";
  const pressure =
    text.includes("weak") ||
    text.includes("caution") ||
    text.includes("check first") ||
    text.includes("pressure") ||
    text.includes("needs current") ||
    text.includes("expired") ||
    text.includes("refresh") ||
    text.includes("high");
  const building =
    text.includes("building") ||
    text.includes("limited") ||
    text.includes("mixed") ||
    text.includes("pending") ||
    text.includes("not ready");

  if (positive) return "positive";
  if (pressure) return "pressure";
  if (building) return "building";
  return "neutral";
}

export function evidenceMeterStyle(
  status: unknown,
  overrides: React.CSSProperties = {}
): React.CSSProperties {
  const tone = evidenceMeterTone(status);
  const color =
    tone === "positive"
      ? "#166534"
      : tone === "pressure"
        ? "#92400E"
        : tone === "building"
          ? "#073E83"
          : "#334155";
  const background =
    tone === "positive"
      ? "linear-gradient(180deg, #F8FFFB 0%, #E6F7ED 100%)"
      : tone === "pressure"
        ? "linear-gradient(180deg, #FFFCF5 0%, #FFE8B8 100%)"
        : tone === "building"
          ? "linear-gradient(180deg, #FFFFFF 0%, #EDF5FF 100%)"
          : "linear-gradient(180deg, #FFFFFF 0%, #F3F6FA 100%)";
  const border =
    tone === "positive"
      ? "rgba(46,155,98,0.30)"
      : tone === "pressure"
        ? "rgba(214,170,69,0.44)"
        : tone === "building"
          ? "rgba(11,99,209,0.22)"
          : "rgba(100,116,139,0.18)";
  const shadow =
    tone === "positive"
      ? "0 10px 18px rgba(22,101,52,0.08), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -7px 14px rgba(46,155,98,0.10)"
      : tone === "pressure"
        ? "0 10px 18px rgba(146,64,14,0.10), inset 0 1px 0 rgba(255,255,255,0.96), inset 0 -7px 14px rgba(214,170,69,0.15)"
        : tone === "building"
          ? "0 10px 18px rgba(11,99,209,0.07), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -7px 14px rgba(11,99,209,0.08)"
          : "0 10px 18px rgba(15,23,42,0.05), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -7px 14px rgba(15,23,42,0.05)";

  return {
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    boxSizing: "border-box",
    maxWidth: "100%",
    minHeight: 30,
    borderRadius: 12,
    padding: "5px 12px",
    color,
    background,
    border: `1px solid ${border}`,
    boxShadow: shadow,
    fontSize: 12,
    fontWeight: 1000,
    lineHeight: 1.1,
    textAlign: "center",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    cursor: "default",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
    ...overrides,
  };
}

export function stopInertMeterTap(event: React.SyntheticEvent) {
  event.stopPropagation();
}

type EvidenceMeterProps = {
  children: React.ReactNode;
  status?: unknown;
  style?: React.CSSProperties;
  title?: string;
};

export default function EvidenceMeter({
  children,
  status,
  style,
  title,
}: EvidenceMeterProps) {
  return (
    <span
      title={title}
      data-gsn-inert-meter="true"
      onClick={stopInertMeterTap}
      style={evidenceMeterStyle(status ?? children, style)}
    >
      {children}
    </span>
  );
}
