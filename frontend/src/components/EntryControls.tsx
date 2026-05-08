import React from "react";
import OriginLink from "./OriginLink";

type EntryActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

function guardEntryButtonPress(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function entryTapGuardProps(): Pick<
  React.HTMLAttributes<HTMLElement>,
  "onPointerDown" | "onMouseDown"
> {
  return {
    onPointerDown: guardEntryButtonPress,
    onMouseDown: guardEntryButtonPress,
  };
}

export function EntryActionButton({
  variant = "primary",
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
    position: "relative",
    zIndex: 1,
    isolation: "isolate",
    transform: "translateZ(0)",
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
    <button
      {...props}
      onPointerDown={(event) => {
        guardEntryButtonPress(event);
        props.onPointerDown?.(event);
      }}
      onMouseDown={(event) => {
        guardEntryButtonPress(event);
        props.onMouseDown?.(event);
      }}
      style={{ ...base, ...variantStyle, ...(style || {}) }}
    >
      {children}
    </button>
  );
}

export function EntryBackLink({ to }: { to: string }) {
  return (
    <OriginLink
      to={to}
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
        position: "relative",
        zIndex: 1,
        isolation: "isolate",
        transform: "translateZ(0)",
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
    </OriginLink>
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
      <button
        type="button"
        {...entryTapGuardProps()}
        onClick={onClick}
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
          position: "relative",
          zIndex: 1,
          isolation: "isolate",
          transform: "translateZ(0)",
          appearance: "none",
          WebkitAppearance: "none",
          outlineOffset: 4,
        }}
      >
        {text}
      </button>
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
      <button
        type="button"
        {...entryTapGuardProps()}
        onClick={onClick}
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
          position: "relative",
          zIndex: 1,
          isolation: "isolate",
          transform: "translateZ(0)",
          appearance: "none",
          WebkitAppearance: "none",
          outlineOffset: 4,
        }}
      >
        {label}
      </button>
      <EntryActionButton
        type="button"
        onClick={onClick}
        variant="secondary"
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
