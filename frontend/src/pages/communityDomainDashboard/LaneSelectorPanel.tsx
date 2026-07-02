import React from "react";
import { StableButton } from "../../components/StableButton";

type DomainLane = {
  lane_key?: string;
  label?: string;
  status?: string;
  count?: number;
};

type LaneSelectorPanelProps = {
  lanes?: DomainLane[];
  activeLane?: string;
  onSelectLane: (laneKey: string) => void;
};

function cleanText(value: unknown, fallback = ""): string {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function compactStatus(value: unknown): string {
  return cleanText(value, "not recorded").replace(/_/g, " ");
}

function countValue(value: unknown): string {
  const numberValue = Number(value ?? 0);
  return Number.isFinite(numberValue) ? String(numberValue) : "0";
}

function laneDisplayLabel(lane: DomainLane, fallback = "Lane"): string {
  const key = cleanText(lane?.lane_key).toLowerCase();
  const label = cleanText(lane?.label, fallback);
  if (key === "modules" || label.toLowerCase() === "modules") return "Services";
  return label;
}

function whiteCard(): React.CSSProperties {
  return {
    borderRadius: 22,
    background:
      "linear-gradient(180deg, rgba(255,255,255,0.995) 0%, rgba(244,248,252,0.985) 100%)",
    border: "1px solid rgba(9,27,46,0.13)",
    boxShadow:
      "0 20px 46px rgba(7,20,36,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
    padding: 16,
    color: "#091B2E",
  };
}

function sectionLabel(): React.CSSProperties {
  return {
    fontSize: 12,
    color: "#506A82",
    fontWeight: 900,
    letterSpacing: 0,
    textTransform: "uppercase",
  };
}

function statusBadge(status: unknown): React.CSSProperties {
  const text = cleanText(status).toLowerCase();
  const warning =
    text.includes("draft") ||
    text.includes("quote") ||
    text.includes("not") ||
    text.includes("needs") ||
    text.includes("pending") ||
    text.includes("optional") ||
    text.includes("read only");
  const danger = text.includes("suspended") || text.includes("expired") || text.includes("closed");
  const palette = danger
    ? { bg: "rgba(153,27,27,0.10)", color: "#991B1B", border: "rgba(153,27,27,0.20)" }
    : warning
    ? { bg: "rgba(146,94,8,0.11)", color: "#925E08", border: "rgba(146,94,8,0.22)" }
    : { bg: "rgba(22,101,52,0.10)", color: "#166534", border: "rgba(22,101,52,0.22)" };

  return {
    display: "inline-flex",
    alignItems: "center",
    minHeight: 30,
    borderRadius: 999,
    padding: "6px 10px",
    background: palette.bg,
    color: palette.color,
    border: `1px solid ${palette.border}`,
    fontSize: 12,
    fontWeight: 900,
    textTransform: "capitalize",
  };
}

export default function CommunityDomainLaneSelectorPanel({
  lanes = [],
  activeLane = "",
  onSelectLane,
}: LaneSelectorPanelProps) {
  return (
    <div style={whiteCard()}>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={sectionLabel()}>Work lanes</div>
        {lanes.map((lane) => {
          const laneKey = cleanText(lane.lane_key);
          const selected = laneKey === activeLane;
          return (
            <StableButton
              key={cleanText(lane.lane_key, lane.label)}
              type="button"
              kind="secondary"
              onClick={() => onSelectLane(laneKey)}
              debugId={`community-domain-dashboard.lane.${laneKey}`}
              fullWidth
              stableHeight={58}
              style={{
                display: "grid",
                gridTemplateColumns: "minmax(0, 1fr) auto",
                justifyContent: "stretch",
                gap: 10,
                alignItems: "center",
                borderRadius: 16,
                border: selected
                  ? "1px solid rgba(12,79,168,0.34)"
                  : "1px solid rgba(9,27,46,0.10)",
                background: selected
                  ? "linear-gradient(180deg, rgba(12,79,168,0.11) 0%, rgba(12,79,168,0.05) 100%)"
                  : "linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(242,247,252,0.98) 100%)",
                color: "#091B2E",
                padding: "10px 12px",
                textAlign: "left",
                cursor: "pointer",
                boxSizing: "border-box",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontWeight: 950, fontSize: 14 }}>
                  {laneDisplayLabel(lane, "Lane")}
                </span>
                <span
                  style={{
                    display: "block",
                    color: "#4F647A",
                    fontSize: 12.5,
                    marginTop: 3,
                    textTransform: "capitalize",
                  }}
                >
                  {compactStatus(lane.status)}
                </span>
              </span>
              <span style={statusBadge(lane.status)}>{countValue(lane.count)}</span>
            </StableButton>
          );
        })}
      </div>
    </div>
  );
}
