import React from "react";
import { StableButton, StableCtaLink } from "./StableButton";

type EntryActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
  debugId?: string;
};

export function EntryActionButton({
  variant = "primary",
  debugId,
  style,
  children,
  ...props
}: EntryActionButtonProps) {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: variant === "primary" ? 54 : 50,
    maxWidth: "100%",
    padding: variant === "primary" ? "15px 22px" : "12px 16px",
    borderRadius: variant === "primary" ? 16 : 14,
    fontSize: 14.5,
    fontWeight: 900,
    lineHeight: 1.15,
    textAlign: "center",
    whiteSpace: "normal",
    overflowWrap: "anywhere",
    cursor: "pointer",
    textDecoration: "none",
    boxSizing: "border-box",
    touchAction: "manipulation",
    WebkitTapHighlightColor: "transparent",
    userSelect: "none",
    pointerEvents: "auto",
    transform: "none",
    overflowAnchor: "none",
    appearance: "none",
    WebkitAppearance: "none",
    outlineOffset: 4,
  };

  const variantStyle: React.CSSProperties =
    variant === "primary"
      ? {
          border: "none",
          background:
            "linear-gradient(180deg, #F9DB82 0%, #F3D06A 52%, #E7B84D 100%)",
          color: "#10253B",
          boxShadow:
            "0 14px 28px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.54)",
        }
      : {
          border: "1px solid rgba(255,255,255,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)",
          color: "#FFFFFF",
          boxShadow:
            "0 10px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)",
        };

  return (
    <StableButton
      {...props}
      kind={variant === "primary" ? "primary" : "secondary"}
      stableHeight={variant === "primary" ? 54 : 50}
      debugId={debugId}
      style={{ ...base, ...variantStyle, ...(style || {}) }}
    >
      {children}
    </StableButton>
  );
}

export function EntryBackLink({ to }: { to: string }) {
  return (
    <StableCtaLink
      to={to}
      kind="secondary"
      debugId="entry-controls.back"
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 44,
        minWidth: 44,
        padding: 0,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.18)",
        background:
          "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)",
        boxShadow:
          "0 10px 24px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.12)",
        textDecoration: "none",
        fontSize: 0,
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
        userSelect: "none",
        pointerEvents: "auto",
        transform: "none",
        overflowAnchor: "none",
        outlineOffset: 4,
      }}
    >
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 26,
          height: 26,
          borderRadius: 999,
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%)",
          boxShadow:
            "0 8px 18px rgba(0,0,0,0.16), inset 0 1px 0 rgba(255,255,255,0.18)",
          color: "#F8FBFF",
          fontSize: 15,
          fontWeight: 900,
          lineHeight: 1,
        }}
      >
        {"<-"}
      </span>
    </StableCtaLink>
  );
}

export function EntryGuideLauncher({
  label = "About",
  text = "GSN and I",
  onClick,
  compact = false,
}: {
  label?: string;
  text?: string;
  onClick: () => void;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <StableButton
        type="button"
        onClick={onClick}
        kind="secondary"
        stableHeight={40}
        debugId="entry-controls.guide-compact"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 40,
          maxWidth: "100%",
          padding: "9px 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.18)",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 100%)",
          boxShadow:
            "0 10px 22px rgba(0,0,0,0.14), inset 0 1px 0 rgba(255,255,255,0.18)",
          color: "#F8FBFF",
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.45,
          lineHeight: 1.05,
          textAlign: "center",
          whiteSpace: "nowrap",
          cursor: "pointer",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
          pointerEvents: "auto",
          transform: "none",
          overflowAnchor: "none",
          appearance: "none",
          WebkitAppearance: "none",
          outlineOffset: 4,
        }}
      >
        {text}
      </StableButton>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        gap: 8,
      }}
    >
      <StableButton
        type="button"
        onClick={onClick}
        kind="secondary"
        stableHeight={40}
        minWidth={40}
        debugId="entry-controls.guide-label"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 40,
          minWidth: 40,
          padding: "0 14px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,0.12)",
          background:
          "linear-gradient(180deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.07) 100%)",
          boxShadow:
            "0 8px 20px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.14)",
          fontSize: 10.5,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: 0.8,
          color: "rgba(255,255,255,0.78)",
          textAlign: "center",
          textTransform: "uppercase",
          cursor: "pointer",
          touchAction: "manipulation",
          WebkitTapHighlightColor: "transparent",
          userSelect: "none",
          pointerEvents: "auto",
          transform: "none",
          overflowAnchor: "none",
          appearance: "none",
          WebkitAppearance: "none",
          outlineOffset: 4,
        }}
      >
        {label}
      </StableButton>
      <EntryActionButton
        type="button"
        onClick={onClick}
        variant="secondary"
        debugId="entry-controls.guide-main"
        style={{
          minHeight: 46,
          borderRadius: 999,
          padding: "12px 20px",
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.20) 0%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.04) 100%)",
          border: "1px solid rgba(255,255,255,0.18)",
          boxShadow:
            "0 16px 28px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.24), inset 0 -6px 12px rgba(6,18,35,0.12)",
          transform: "translateY(0)",
          whiteSpace: "nowrap",
        }}
      >
        {text}
      </EntryActionButton>
    </div>
  );
}
