import React from "react";
import { StableButton } from "../StableButton";

export type DashboardNoticeItem = {
  id: string;
  title: string;
  detail: string;
  ctaLabel: string;
  ctaTo: string;
  unread: boolean;
  source: string;
  bucket: "actNow" | "dueSoon" | "watch";
  score: number;
};

export type DashboardNoticeSourceGroup = {
  key: string;
  title: string;
  detail: string;
  count: number;
  unreadCount: number;
  actNowCount: number;
  dueSoonCount: number;
  watchCount: number;
  to: string;
  ctaLabel: string;
  tone: "red" | "yellow" | "blue" | "slate";
  rows: DashboardNoticeItem[];
};

type DashboardNoticeCounts = {
  actNow: number;
  dueSoon: number;
  watch: number;
  unread: number;
};

type NotificationSurfaceChrome = {
  leadBg: string;
  leadBorder: string;
  leadShadow: string;
  statusBg: string;
  statusText: string;
  chipBg: string;
  chipBorder: string;
  chipSelectedBorder: string;
  itemBg: string;
  itemBorder: string;
};

type DashboardInboxSectionProps = {
  isPhone: boolean;
  isCompact: boolean;
  chrome: NotificationSurfaceChrome;
  totalCount: number;
  sourceGroupCount: number;
  counts: DashboardNoticeCounts;
  summaryLine: string;
  phoneSummaryLine: string;
  guidanceError: string;
  guidanceLoading: boolean;
  noticesLoading: boolean;
  leadItem: DashboardNoticeItem | null;
  leadGroup: DashboardNoticeSourceGroup | null;
  primaryActionTo: string;
  primaryActionLabel: string;
  alertsActionTo: string;
  onOpenRoute: (
    event: React.SyntheticEvent<HTMLElement> | undefined,
    to: string
  ) => void;
  onPointerDown: (event?: React.SyntheticEvent<HTMLElement>) => void;
};

const DASHBOARD_BRAND = {
  cardBorder: "rgba(15,59,116,0.12)",
  cardBorderStrong: "rgba(15,59,116,0.16)",
  label: "#617085",
  helper: "#617085",
  goldText: "#8A651E",
  accentDeep: "#0F3B74",
  summaryButton: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
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

function secondaryBtn(disabled = false): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    padding: "10px 14px",
    borderRadius: 13,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: disabled
      ? "linear-gradient(180deg, #F8FAFC 0%, #E2E8F0 100%)"
      : DASHBOARD_BRAND.summaryButton,
    color: disabled ? "#94A3B8" : DASHBOARD_BRAND.accentDeep,
    fontWeight: 800,
    fontSize: 13,
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    whiteSpace: "normal",
    textAlign: "center",
    lineHeight: 1.18,
    maxWidth: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
    overflowWrap: "normal",
    wordBreak: "normal",
    hyphens: "none",
    flexShrink: 0,
    overflowAnchor: "none",
    touchAction: "manipulation",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    transform: "none",
    transition: "none",
    appearance: "none",
    WebkitAppearance: "none",
    boxShadow: disabled
      ? "none"
      : "0 10px 22px rgba(10,24,49,0.08), inset 0 1px 0 rgba(255,255,255,0.82)",
  };
}

function innerCard(bg = "#FFFFFF"): React.CSSProperties {
  return {
    borderRadius: 20,
    border: `1px solid ${DASHBOARD_BRAND.cardBorderStrong}`,
    background: bg,
    padding: 16,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.78), 0 10px 22px rgba(10,24,49,0.06)",
  };
}

function softCard(bg = "#F8FBFF"): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${DASHBOARD_BRAND.cardBorder}`,
    background: bg,
    padding: 14,
    boxShadow:
      "inset 0 1px 0 rgba(255,255,255,0.72), 0 8px 18px rgba(10,24,49,0.04)",
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
    background: primary
      ? "linear-gradient(180deg, rgba(243,208,106,0.22) 0%, rgba(243,208,106,0.12) 100%)"
      : "linear-gradient(180deg, rgba(255,255,255,0.94) 0%, rgba(240,246,255,0.92) 100%)",
    color: primary ? DASHBOARD_BRAND.goldText : DASHBOARD_BRAND.label,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: "normal",
    border: primary
      ? "1px solid rgba(145,103,19,0.18)"
      : `1px solid ${DASHBOARD_BRAND.cardBorder}`,
  };
}

function helperText(): React.CSSProperties {
  return {
    color: DASHBOARD_BRAND.helper,
    fontSize: 14,
    lineHeight: 1.75,
  };
}

function dashboardActionGrid(isPhone: boolean, minWidth: number): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: isPhone ? "1fr" : `repeat(auto-fit, minmax(${minWidth}px, 1fr))`,
    gap: isPhone ? 7 : 8,
    alignItems: "stretch",
    justifyContent: "stretch",
    overflowAnchor: "none",
    transition: "none",
  };
}

function dashboardFillButton(
  base: React.CSSProperties,
  overrides: React.CSSProperties = {}
): React.CSSProperties {
  return dashboardStableActionFrame({
    ...base,
    width: "100%",
    minWidth: 0,
    maxWidth: "100%",
    ...overrides,
  });
}

function spotlightWhiteButton(
  isPhone: boolean,
  overrides: React.CSSProperties = {}
): React.CSSProperties {
  return dashboardFillButton(
    {
      ...secondaryBtn(false),
      minHeight: isPhone ? 46 : 40,
      padding: isPhone ? "10px 12px" : "8px 14px",
      borderRadius: isPhone ? 15 : 15,
      background: "linear-gradient(180deg, #FFFFFF 0%, #F4F8FC 100%)",
      border: "1px solid rgba(11,99,209,0.14)",
      color: "#123055",
      fontWeight: 900,
      userSelect: "none",
      touchAction: "manipulation",
      boxShadow:
        "0 10px 20px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.86)",
    },
    overrides
  );
}

export default function DashboardInboxSection({
  isPhone,
  isCompact,
  chrome,
  totalCount,
  sourceGroupCount,
  counts,
  summaryLine,
  phoneSummaryLine,
  guidanceError,
  guidanceLoading,
  noticesLoading,
  leadItem,
  leadGroup,
  primaryActionTo,
  primaryActionLabel,
  alertsActionTo,
  onOpenRoute,
  onPointerDown,
}: DashboardInboxSectionProps) {
  return (
    <div
      style={{
        marginTop: isPhone ? 10 : 16,
        ...innerCard(chrome.leadBg),
        border: chrome.leadBorder,
        padding: isPhone ? 9 : 16,
        borderRadius: isPhone ? 16 : 18,
        boxShadow: chrome.leadShadow,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            color: "#0B1F33",
            fontWeight: 900,
            fontSize: isPhone ? 15 : 18,
            lineHeight: isPhone ? 1.24 : 1.32,
            maxWidth: 760,
          }}
        >
          {isPhone ? phoneSummaryLine : summaryLine}
        </div>

        <div
          style={{
            display: "flex",
            gap: isPhone ? 6 : 8,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {sourceGroupCount > 0 ? (
            <span
              style={{
                ...badge(false),
                background: chrome.chipBg,
                border: chrome.chipBorder,
              }}
            >
              {sourceGroupCount} screen{sourceGroupCount === 1 ? "" : "s"}
            </span>
          ) : null}
          {counts.actNow > 0 ? (
            <span
              style={{
                ...badge(true),
                background: chrome.statusBg,
                border: chrome.chipSelectedBorder,
                color: chrome.statusText,
              }}
            >
              Act now {counts.actNow}
            </span>
          ) : null}
          {counts.unread > 0 ? (
            <span
              style={{
                ...badge(false),
                background: chrome.chipBg,
                border: chrome.chipBorder,
              }}
            >
              Unread {counts.unread}
            </span>
          ) : null}
        </div>
      </div>

      {guidanceError ? (
        <div
          style={{
            marginTop: 12,
            ...softCard("#FEF2F2"),
            color: "#991B1B",
            border: "1px solid rgba(239,68,68,0.16)",
            fontWeight: 800,
            padding: 12,
          }}
        >
          {guidanceError}
        </div>
      ) : guidanceLoading && totalCount === 0 ? (
        <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.7 }}>
          Preparing your dashboard alerts...
        </div>
      ) : null}

      {leadItem ? (
        <div
          style={{
            marginTop: 12,
            ...innerCard(chrome.itemBg),
            border: chrome.itemBorder,
            padding: isPhone ? 9 : isCompact ? 12 : 14,
            borderRadius: isPhone ? 15 : 18,
            boxShadow:
              "0 12px 28px rgba(10,24,49,0.06), inset 0 1px 0 rgba(255,255,255,0.84)",
            display: "grid",
            gap: isPhone ? 8 : 10,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                color: "#0B1F33",
                fontWeight: 800,
                fontSize: isPhone ? 14.5 : undefined,
                lineHeight: isPhone ? 1.24 : 1.3,
                flex: "1 1 240px",
              }}
            >
              {leadItem.title}
            </div>

            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span
                style={{
                  ...badge(leadItem.bucket === "actNow"),
                  background:
                    leadItem.bucket === "actNow" ? chrome.statusBg : chrome.chipBg,
                  border:
                    leadItem.bucket === "actNow"
                      ? chrome.chipSelectedBorder
                      : chrome.chipBorder,
                  color: leadItem.bucket === "actNow" ? chrome.statusText : undefined,
                }}
              >
                {leadItem.bucket === "actNow" ? "Act now" : leadItem.unread ? "Unread" : "Open"}
              </span>
              {leadGroup ? (
                <span
                  style={{
                    ...badge(false),
                    background: chrome.chipBg,
                    border: chrome.chipBorder,
                  }}
                >
                  {leadGroup.title}
                </span>
              ) : null}
              {totalCount > 1 ? (
                <span
                  style={{
                    ...badge(false),
                    background: chrome.chipBg,
                    border: chrome.chipBorder,
                  }}
                >
                  {totalCount - 1} more waiting
                </span>
              ) : null}
            </div>
          </div>

          <div
            style={{
              ...helperText(),
              fontSize: isPhone ? 12.2 : 13,
              lineHeight: isPhone ? 1.42 : 1.75,
            }}
          >
            {leadItem.detail}
          </div>

          {leadGroup ? (
            <div
              style={{
                ...helperText(),
                fontSize: isPhone ? 12 : 12.5,
                lineHeight: isPhone ? 1.38 : 1.75,
              }}
            >
              {leadGroup.detail}
            </div>
          ) : null}

          <div style={{ ...dashboardActionGrid(isPhone, isCompact ? 132 : 156) }}>
            <StableButton
              debugId="dashboard.inbox.primary"
              type="button"
              onClick={(event) => onOpenRoute(event, primaryActionTo)}
              onPointerDown={onPointerDown}
              style={spotlightWhiteButton(isPhone, {
                minHeight: isPhone ? 46 : 40,
                padding: isPhone ? "10px 12px" : "8px 14px",
                borderRadius: isPhone ? 15 : 15,
                width: "100%",
              })}
            >
              {primaryActionLabel}
            </StableButton>
            <StableButton
              debugId="dashboard.inbox.open-alerts"
              type="button"
              onClick={(event) => onOpenRoute(event, alertsActionTo)}
              onPointerDown={onPointerDown}
              style={spotlightWhiteButton(isPhone, {
                minHeight: isPhone ? 46 : 40,
                padding: isPhone ? "10px 12px" : "8px 14px",
                borderRadius: isPhone ? 15 : 15,
                width: "100%",
              })}
            >
              Open your alerts
            </StableButton>
          </div>
        </div>
      ) : noticesLoading && totalCount === 0 ? (
        <div style={{ marginTop: 12, color: "#64748B", lineHeight: 1.7 }}>
          Loading your alerts...
        </div>
      ) : null}
    </div>
  );
}