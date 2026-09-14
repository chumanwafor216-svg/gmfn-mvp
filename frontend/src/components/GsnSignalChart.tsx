import React from "react";

type GsnSignalChartTone = "blue" | "gold" | "green" | "quiet";

type GsnSignalChartProps = {
  rate: number;
  active?: boolean;
  bars?: number[];
  label?: string;
  tone?: GsnSignalChartTone;
  compact?: boolean;
  style?: React.CSSProperties;
};

function clampRate(value: unknown): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
}

function chartPalette(tone: GsnSignalChartTone, active: boolean) {
  if (!active) {
    return {
      primary: "#B8C8D9",
      secondary: "#E7EEF6",
      track: "#F3F7FB",
      text: "#5A6F84",
      ring: "rgba(18,58,89,0.08)",
    };
  }

  if (tone === "green") {
    return {
      primary: "#2E9B62",
      secondary: "#0F5EAA",
      track: "#E8F6EE",
      text: "#12633F",
      ring: "rgba(46,155,98,0.16)",
    };
  }

  if (tone === "gold") {
    return {
      primary: "#D6AA45",
      secondary: "#F2C766",
      track: "#FBF2D8",
      text: "#7A4A00",
      ring: "rgba(214,170,69,0.18)",
    };
  }

  if (tone === "quiet") {
    return {
      primary: "#24415C",
      secondary: "#8EA4BA",
      track: "#EDF3F9",
      text: "#24415C",
      ring: "rgba(36,65,92,0.14)",
    };
  }

  return {
    primary: "#0F5EAA",
    secondary: "#2E9B62",
    track: "#E8F1FB",
    text: "#0F5EAA",
    ring: "rgba(15,94,170,0.15)",
  };
}

function defaultBars(rate: number) {
  const base = clampRate(rate);
  return [
    Math.max(8, base * 0.45),
    Math.max(12, base * 0.72),
    Math.max(base > 0 ? 16 : 8, base),
  ];
}

export default function GsnSignalChart({
  rate,
  active,
  bars,
  label,
  tone = "blue",
  compact = false,
  style,
}: GsnSignalChartProps) {
  const safeRate = clampRate(rate);
  const isActive = active ?? safeRate > 0;
  const palette = chartPalette(tone, isActive);
  const chartBars = (bars && bars.length > 0 ? bars : defaultBars(safeRate)).slice(0, 4);
  const sweep = safeRate * 3.6;
  const donutSize = compact ? 34 : 40;
  const barBoxHeight = compact ? 30 : 34;

  return (
    <div
      data-gsn-signal-chart="mixed"
      role={label ? "img" : undefined}
      aria-label={label}
      title={label}
      style={{
        display: "flex",
        alignItems: "center",
        gap: compact ? 7 : 9,
        minWidth: 0,
        width: "100%",
        pointerEvents: "none",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: donutSize,
          height: donutSize,
          borderRadius: "50%",
          flex: `0 0 ${donutSize}px`,
          display: "grid",
          placeItems: "center",
          background: `conic-gradient(${palette.primary} 0deg, ${palette.secondary} ${sweep}deg, ${palette.track} ${sweep}deg, ${palette.track} 360deg)`,
          boxShadow: `0 0 0 4px ${palette.ring}, inset 0 1px 0 rgba(255,255,255,0.86)`,
        }}
      >
        <div
          style={{
            width: compact ? 20 : 24,
            height: compact ? 20 : 24,
            borderRadius: "50%",
            display: "grid",
            placeItems: "center",
            background: "#FFFFFF",
            color: palette.text,
            fontSize: compact ? 8.5 : 9.5,
            fontWeight: 1000,
            lineHeight: 1,
          }}
        >
          {Math.round(safeRate)}
        </div>
      </div>
      <div
        aria-hidden="true"
        style={{
          height: barBoxHeight,
          flex: "1 1 auto",
          minWidth: 42,
          display: "flex",
          alignItems: "flex-end",
          gap: compact ? 4 : 5,
        }}
      >
        {chartBars.map((barRate, index) => {
          const safeBarRate = clampRate(barRate);
          const height = Math.max(6, Math.round((safeBarRate / 100) * barBoxHeight));
          return (
            <span
              key={`gsn-signal-chart-bar-${index}-${height}`}
              style={{
                flex: 1,
                minWidth: compact ? 6 : 7,
                height,
                borderRadius: "8px 8px 4px 4px",
                background: isActive
                  ? `linear-gradient(180deg, ${palette.primary} 0%, ${palette.secondary} 100%)`
                  : `linear-gradient(180deg, ${palette.secondary} 0%, ${palette.track} 100%)`,
                boxShadow: isActive
                  ? "inset 0 1px 0 rgba(255,255,255,0.42), 0 6px 12px rgba(15,94,170,0.10)"
                  : "inset 0 1px 0 rgba(255,255,255,0.82)",
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
