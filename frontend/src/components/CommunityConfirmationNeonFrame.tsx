import React from "react";
import { SecondaryButton } from "./StableButton";

const neon = {
  navy: "#031A32",
  navyDeep: "#020C18",
  paper: "#FFFDF8",
  ink: "#07172C",
  cyan: "#25E7FF",
  violet: "#A94DFF",
  pink: "#F24BFF",
  gold: "#E8BD55",
};

export function communityConfirmationPaperStyle(
  compact: boolean
): React.CSSProperties {
  if (!compact) return {};
  return {
    color: neon.ink,
    background:
      "linear-gradient(145deg, rgba(255,255,255,0.99), rgba(255,250,240,0.98))",
    border: "2px solid rgba(37,231,255,0.84)",
    boxShadow:
      "0 0 0 2px rgba(242,75,255,0.56), 0 0 22px rgba(37,231,255,0.44), 0 0 32px rgba(169,77,255,0.34)",
  };
}

type FrameProps = {
  compact: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function CommunityConfirmationNeonFrame({
  compact,
  children,
  style,
}: FrameProps) {
  return (
    <div
      data-gsn-community-confirmation-neon-frame={compact ? "phone" : "desktop"}
      style={{
        position: "relative",
        isolation: "isolate",
        overflow: "hidden",
        width: "100%",
        color: compact ? "#FFFFFF" : undefined,
        borderRadius: compact ? 28 : 0,
        background: compact
          ? `linear-gradient(180deg, ${neon.navy} 0%, ${neon.navyDeep} 100%)`
          : undefined,
        border: compact ? "1px solid rgba(37,231,255,0.34)" : undefined,
        boxShadow: compact
          ? "inset 0 0 38px rgba(37,231,255,0.08), inset 0 0 70px rgba(169,77,255,0.08)"
          : undefined,
        padding: compact ? "12px 12px 150px" : undefined,
        ...style,
      }}
    >
      {compact ? (
        <>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "12% auto auto 0",
              width: 82,
              height: 360,
              borderRadius: 999,
              background: "rgba(37,231,255,0.14)",
              filter: "blur(46px)",
              pointerEvents: "none",
            }}
          />
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              inset: "26% 0 auto auto",
              width: 82,
              height: 420,
              borderRadius: 999,
              background: "rgba(242,75,255,0.13)",
              filter: "blur(48px)",
              pointerEvents: "none",
            }}
          />
        </>
      ) : null}
      <div style={{ position: "relative", zIndex: 1, width: "100%", display: "flex", flexDirection: "column" }}>{children}</div>
    </div>
  );
}

type ModeTabsProps = {
  current: "inbox" | "manager";
  managerAvailable: boolean;
  onInbox: () => void;
  onManager: () => void;
};

export function CommunityConfirmationModeTabs({
  current,
  managerAvailable,
  onInbox,
  onManager,
}: ModeTabsProps) {
  const tabs = [
    { key: "inbox" as const, label: "Your inbox", onClick: onInbox },
    ...(managerAvailable
      ? [{ key: "manager" as const, label: "Manager settings", onClick: onManager }]
      : []),
  ];

  return (
    <section
      data-gsn-community-confirmation-mode-tabs={current}
      style={{ marginTop: 12, textAlign: "center" }}
    >
      <h1
        style={{
          margin: 0,
          color: "#FFFFFF",
          fontSize: 28,
          fontWeight: 1000,
          lineHeight: 1.05,
          letterSpacing: "-0.03em",
        }}
      >
        Community confirmation
      </h1>
      <div
        aria-hidden="true"
        style={{
          width: 94,
          height: 3,
          margin: "8px auto 12px",
          borderRadius: 999,
          background: "linear-gradient(90deg, transparent, #E8BD55, transparent)",
          boxShadow: "0 0 12px rgba(232,189,85,0.54)",
        }}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(" + tabs.length + ", minmax(0, 1fr))",
          gap: 10,
        }}
      >
        {tabs.map((tab) => {
          const selected = tab.key === current;
          return (
            <SecondaryButton
              key={tab.key}
              type="button"
              onClick={tab.onClick}
              fullWidth
              stableHeight={46}
              debugId={"community-confirmation.mode." + tab.key}
              style={{
                borderRadius: 18,
                color: "#FFFFFF",
                background: selected
                  ? "linear-gradient(135deg, rgba(13,79,167,0.96), rgba(91,28,190,0.94))"
                  : "rgba(3,26,50,0.92)",
                border: selected
                  ? "1px solid rgba(37,231,255,0.94)"
                  : "1px solid rgba(255,255,255,0.18)",
                boxShadow: selected
                  ? "0 0 0 1px rgba(242,75,255,0.72), 0 0 18px rgba(37,231,255,0.44)"
                  : "none",
              }}
            >
              {tab.label}
            </SecondaryButton>
          );
        })}
      </div>
    </section>
  );
}

type FrontCardProps = {
  children: React.ReactNode;
  style?: React.CSSProperties;
};

export function CommunityConfirmationFrontCard({ children, style }: FrontCardProps) {
  return (
    <section
      style={{
        borderRadius: 24,
        padding: 12,
        color: neon.ink,
        background:
          "linear-gradient(145deg, rgba(255,255,255,0.99), rgba(255,250,240,0.98))",
        border: "2px solid rgba(37,231,255,0.78)",
        boxShadow:
          "0 0 0 2px rgba(242,75,255,0.52), 0 0 22px rgba(37,231,255,0.42), 0 0 30px rgba(169,77,255,0.32)",
        ...style,
      }}
    >
      {children}
    </section>
  );
}

type FrontRowProps = {
  title: string;
  detail?: string;
  icon: React.ReactNode;
  debugId: string;
  onClick: () => void;
  trailing?: React.ReactNode;
  accent?: "cyan" | "gold" | "violet";
};

export function CommunityConfirmationFrontRow({
  title,
  detail,
  icon,
  debugId,
  onClick,
  trailing,
  accent = "gold",
}: FrontRowProps) {
  const accentColor =
    accent === "cyan" ? neon.cyan : accent === "violet" ? neon.violet : neon.gold;

  return (
    <SecondaryButton
      type="button"
      onClick={onClick}
      fullWidth
      stableHeight={68}
      debugId={debugId}
      style={{
        padding: "10px 12px",
        borderRadius: 18,
        border: "1px solid rgba(8,32,58,0.12)",
        background: "rgba(255,255,255,0.96)",
        boxShadow: `0 0 12px ${accentColor}26`,
        color: neon.ink,
        textAlign: "left",
      }}
    >
      <span
        style={{
          width: "100%",
          display: "grid",
          gridTemplateColumns: "48px minmax(0, 1fr) auto",
          gap: 10,
          alignItems: "center",
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 44,
            height: 44,
            borderRadius: 14,
            display: "grid",
            placeItems: "center",
            color: "#7A4A00",
            background: "linear-gradient(145deg, #FFF8E1, #FFE2A1)",
            border: `1px solid ${accentColor}8A`,
          }}
        >
          {icon}
        </span>
        <span style={{ minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 16, fontWeight: 1000, lineHeight: 1.12 }}>
            {title}
          </span>
          {detail ? (
            <span
              style={{
                display: "block",
                marginTop: 3,
                color: "#526174",
                fontSize: 12,
                fontWeight: 800,
                lineHeight: 1.25,
              }}
            >
              {detail}
            </span>
          ) : null}
        </span>
        <span style={{ color: neon.ink, fontSize: 24, fontWeight: 1000 }}>
          {trailing ?? "›"}
        </span>
      </span>
    </SecondaryButton>
  );
}
