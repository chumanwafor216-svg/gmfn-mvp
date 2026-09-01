import React from "react";
import { GsnLegacyIcon, type GsnIconName } from "../GsnLegacyIcon";
import { StableButton } from "../StableButton";

export type DashboardToolsLaneKey = "evidence" | "work" | "community";

export type DashboardToolsLane = {
  key: DashboardToolsLaneKey;
  label: string;
  detail: string;
  items: {
    label: string;
    to: string;
  }[];
};

type DashboardSignalName =
  | "marketplace"
  | "demand"
  | "spotlight"
  | "trust"
  | "community"
  | "shop"
  | "alerts"
  | "identity"
  | "compass"
  | "package"
  | "target"
  | "calendar"
  | "user"
  | "check"
  | "add"
  | "time"
  | "dot";

type DashboardToolsSectionProps = {
  isPhone: boolean;
  lanes: DashboardToolsLane[];
  activeLane: DashboardToolsLane;
  onSelectLane: (
    event: React.SyntheticEvent<HTMLElement> | undefined,
    laneKey: DashboardToolsLaneKey
  ) => void;
  onOpenRoute: (
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) => void;
  onPointerDown: (event?: React.SyntheticEvent<HTMLElement>) => void;
};

const DASHBOARD_BRAND = {
  ink: "#07172C",
  helper: "#617085",
  accentDeep: "#0F3B74",
};

function dashboardStableActionFrame(
  style: React.CSSProperties
): React.CSSProperties {
  const stableHeight = style.height ?? style.minHeight;

  return {
    ...style,
    ...(stableHeight
      ? {
          height: stableHeight,
          minHeight: stableHeight,
          maxHeight: style.maxHeight ?? stableHeight,
        }
      : {}),
    boxSizing: "border-box",
    overflow: "hidden",
    overflowAnchor: "none",
    transform: "none",
    flexShrink: 0,
    transition: "none",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    whiteSpace: style.whiteSpace ?? "normal",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
  };
}

function dashboardAccordionIconStyle(
  isPhone: boolean,
  background = "linear-gradient(180deg, rgba(235,244,255,0.96) 0%, rgba(221,234,250,0.86) 100%)",
  border = "1px solid rgba(11,99,209,0.16)",
  color: string | undefined = undefined
): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: isPhone ? 42 : 44,
    height: isPhone ? 42 : 44,
    borderRadius: 999,
    background,
    border,
    color: color || DASHBOARD_BRAND.accentDeep,
    boxShadow:
      "0 10px 18px rgba(10,24,49,0.09), inset 0 1px 0 rgba(255,255,255,0.92)",
    lineHeight: 1,
    flexShrink: 0,
  };
}

function dashboardLauncherButtonStyle(isPhone: boolean): React.CSSProperties {
  const height = isPhone ? 76 : 74;

  return dashboardStableActionFrame({
    height,
    minHeight: height,
    maxHeight: height,
    display: "grid",
    gridTemplateColumns: "auto minmax(0, 1fr)",
    alignItems: "center",
    justifyContent: "stretch",
    gap: isPhone ? 9 : 11,
    padding: isPhone ? "10px 10px" : "12px 14px",
    borderRadius: isPhone ? 17 : 18,
    border: "1px solid rgba(15,59,116,0.16)",
    background:
      "linear-gradient(180deg, #FFFFFF 0%, #F8FBFF 48%, #EEF6FF 100%)",
    color: DASHBOARD_BRAND.ink,
    boxShadow:
      "0 12px 24px rgba(10,24,49,0.07), inset 0 1px 0 rgba(255,255,255,0.94)",
    fontSize: isPhone ? 12.6 : 14.2,
    fontWeight: 900,
    cursor: "pointer",
    textAlign: "left",
    overflow: "hidden",
    fontFamily: "inherit",
  });
}

function dashboardActionSignal(label: string): DashboardSignalName {
  switch (label) {
    case "Your Marketplace":
    case "Marketplace":
      return "marketplace";
    case "Create Demand":
    case "Create Your Demand":
      return "demand";
    case "Your Spotlight":
    case "Spotlight":
      return "spotlight";
    case "Your Trust Events":
    case "Trust Events":
    case "Trust":
      return "trust";
    case "Your Community":
    case "Community":
    case "CCI":
    case "Wider":
    case "Wider consistency":
      return "community";
    case "Your Shop":
    case "Shop":
      return "shop";
    case "Your Alerts":
    case "What Matters Now":
      return "alerts";
    case "Your Identity":
    case "My Identity":
      return "identity";
    case "TrustSlip":
      return "identity";
    default:
      return "dot";
  }
}

function DashboardSignalIcon({ name, size = 22 }: { name: DashboardSignalName; size?: number }) {
  const iconMap: Record<DashboardSignalName, GsnIconName> = {
    marketplace: "marketplace",
    demand: "document",
    spotlight: "megaphone",
    trust: "shield",
    community: "community",
    shop: "shop",
    alerts: "alert",
    identity: "id",
    compass: "globe",
    package: "briefcase",
    target: "check",
    calendar: "calendar",
    user: "user",
    check: "check",
    add: "join-person-plus",
    time: "calendar",
    dot: "proof",
  };

  return (
    <GsnLegacyIcon
      name={iconMap[name]}
      size={Math.max(22, Math.round(size * 1.16))}
      decorative
      style={{ flex: "0 0 auto" }}
    />
  );
}

export default function DashboardToolsSection({
  isPhone,
  lanes,
  activeLane,
  onSelectLane,
  onOpenRoute,
  onPointerDown,
}: DashboardToolsSectionProps) {
  const launcherButtonStyle = dashboardLauncherButtonStyle(isPhone);

  return (
    <div
      style={{
        marginTop: isPhone ? 10 : 12,
        display: "grid",
        gap: isPhone ? 10 : 12,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isPhone ? "1fr" : "repeat(3, minmax(0, 1fr))",
          gap: isPhone ? 8 : 10,
        }}
      >
        {lanes.map((lane) => {
          const selected = lane.key === activeLane.key;

          return (
            <StableButton
              key={lane.key}
              debugId={`dashboard.apps.lane.${lane.key}`}
              type="button"
              aria-pressed={selected}
              onClick={(event) => onSelectLane(event, lane.key)}
              onPointerDown={onPointerDown}
              style={{
                ...launcherButtonStyle,
                minHeight: isPhone ? 66 : 72,
                height: "auto",
                maxHeight: "none",
                gridTemplateColumns: "1fr",
                justifyContent: "start",
                alignItems: "start",
                textAlign: "left",
                gap: 8,
                background: selected
                  ? "linear-gradient(180deg, #0B1F33 0%, #123A5A 100%)"
                  : "linear-gradient(180deg, #FFFFFF 0%, #F6FAFF 100%)",
                color: selected ? "#FFF8DC" : "#0B1F33",
                border: selected
                  ? "1px solid rgba(214,170,69,0.34)"
                  : "1px solid rgba(11,99,209,0.12)",
              }}
            >
              <span
                style={{
                  fontSize: isPhone ? 13 : 14,
                  fontWeight: 950,
                  lineHeight: 1.15,
                }}
              >
                {lane.label}
              </span>
              <span
                style={{
                  color: selected ? "rgba(255,248,220,0.78)" : DASHBOARD_BRAND.helper,
                  fontSize: isPhone ? 11.5 : 12,
                  fontWeight: 750,
                  lineHeight: 1.35,
                }}
              >
                {lane.detail}
              </span>
            </StableButton>
          );
        })}
      </div>

      <div
        style={{
          borderRadius: isPhone ? 16 : 18,
          border: "1px solid rgba(214,170,69,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(248,251,255,0.98) 100%)",
          padding: isPhone ? 10 : 12,
          display: "grid",
          gap: isPhone ? 9 : 11,
        }}
      >
        <div
          style={{
            display: "grid",
            gap: 3,
          }}
        >
          <span
            style={{
              color: DASHBOARD_BRAND.ink,
              fontSize: isPhone ? 14 : 15,
              fontWeight: 950,
              lineHeight: 1.15,
            }}
          >
            {activeLane.label}
          </span>
          <span
            style={{
              color: DASHBOARD_BRAND.helper,
              fontSize: isPhone ? 12 : 13,
              fontWeight: 750,
              lineHeight: 1.4,
            }}
          >
            {activeLane.detail}
          </span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isPhone
              ? "repeat(2, minmax(0, 1fr))"
              : "repeat(4, minmax(0, 1fr))",
            gap: isPhone ? 8 : 10,
          }}
        >
          {activeLane.items.map((item) => (
            <StableButton
              debugId={`dashboard.apps.tool.${activeLane.key}.${item.label
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/^-|-$/g, "")}`}
              key={`${activeLane.key}-${item.label}`}
              type="button"
              onClick={(event) => onOpenRoute(event, item.to)}
              onPointerDown={onPointerDown}
              style={launcherButtonStyle}
            >
              <span
                aria-hidden="true"
                style={dashboardAccordionIconStyle(
                  isPhone,
                  "linear-gradient(180deg, rgba(235,244,255,0.96) 0%, rgba(221,234,250,0.86) 100%)",
                  "1px solid rgba(11,99,209,0.16)"
                )}
              >
                <DashboardSignalIcon
                  name={dashboardActionSignal(item.label)}
                  size={isPhone ? 18 : 20}
                />
              </span>
              <span
                style={{
                  minWidth: 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  lineHeight: 1.15,
                }}
              >
                {item.label}
              </span>
            </StableButton>
          ))}
        </div>
      </div>
    </div>
  );
}