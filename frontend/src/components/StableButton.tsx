import React, { useRef, useState } from "react";
import OriginLink from "./OriginLink";
import {
  brandActionButton,
  brandStableTapTarget,
  type BrandActionKind,
} from "../styles/gmfnBrand";

type StableActionProps = {
  children: React.ReactNode;
  kind?: BrandActionKind | "danger";
  busy?: boolean;
  busyLabel?: React.ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  minWidth?: number | string;
  stableHeight?: number;
  debugId?: string;
  style?: React.CSSProperties;
  className?: string;
};

type StableButtonProps = StableActionProps &
  Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "style" | "className">;

type StableLinkProps = StableActionProps &
  Omit<React.ComponentProps<typeof OriginLink>, "style" | "className" | "children">;

type StableDisclosureSummaryProps = Omit<
  React.HTMLAttributes<HTMLElement>,
  "style" | "children"
> & {
  children: React.ReactNode;
  debugId?: string;
  stableHeight?: number;
  style?: React.CSSProperties;
};

function stableStyle(
  kind: BrandActionKind | "danger",
  disabled: boolean,
  args: Pick<StableActionProps, "fullWidth" | "minWidth" | "stableHeight" | "style">
): React.CSSProperties {
  const base =
    kind === "danger"
      ? {
          ...brandActionButton("secondary", disabled),
          color: disabled ? "#94A3B8" : "#991B1B",
          border: "1px solid rgba(153,27,27,0.20)",
          background:
            "linear-gradient(180deg, rgba(255,251,251,0.998) 0%, rgba(254,242,242,0.99) 100%)",
        }
      : brandActionButton(kind, disabled);

  return {
    ...brandStableTapTarget(),
    ...base,
    width: args.fullWidth ? "100%" : base.width,
    minWidth: args.minWidth ?? base.minWidth,
    minHeight: args.stableHeight ?? base.minHeight,
    flexShrink: 0,
    gap: 8,
    contain: "layout paint",
    ...args.style,
  };
}

function stopTap(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function isPromiseLike(value: unknown): value is Promise<unknown> {
  return Boolean(value && typeof (value as Promise<unknown>).then === "function");
}

export function StableButton({
  children,
  kind = "secondary",
  busy = false,
  busyLabel,
  disabled = false,
  fullWidth = false,
  minWidth,
  stableHeight,
  debugId,
  style,
  onClick,
  tabIndex,
  type = "button",
  ...rest
}: StableButtonProps) {
  const [localBusy, setLocalBusy] = useState(false);
  const inFlight = useRef(false);
  const locked = disabled || busy || localBusy;

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    const customClick = Boolean(onClick);
    stopTap(event);
    if (locked || inFlight.current) {
      event.preventDefault();
      return;
    }

    if (type !== "submit" || customClick) {
      event.preventDefault();
    }

    const result = onClick?.(event);
    if (isPromiseLike(result)) {
      inFlight.current = true;
      setLocalBusy(true);
      result.finally(() => {
        inFlight.current = false;
        setLocalBusy(false);
      });
    }
  }

  return (
    <button
      {...rest}
      type={type}
      data-cta-id={debugId}
      aria-busy={busy || localBusy || undefined}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : tabIndex}
      onPointerDown={stopTap}
      onMouseDown={stopTap}
      onClick={handleClick}
      style={stableStyle(kind, locked, { fullWidth, minWidth, stableHeight, style })}
    >
      {busy || localBusy ? busyLabel || children : children}
    </button>
  );
}

export function StableCtaLink({
  children,
  kind = "secondary",
  busy = false,
  busyLabel,
  disabled = false,
  fullWidth = false,
  minWidth,
  stableHeight,
  debugId,
  style,
  onClick,
  tabIndex,
  ...rest
}: StableLinkProps) {
  const locked = disabled || busy;

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    stopTap(event);
    if (locked) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  }

  return (
    <OriginLink
      {...rest}
      data-cta-id={debugId}
      aria-busy={busy || undefined}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : tabIndex}
      onClick={handleClick}
      style={stableStyle(kind, locked, { fullWidth, minWidth, stableHeight, style })}
    >
      {busy ? busyLabel || children : children}
    </OriginLink>
  );
}

export function PrimaryButton(props: Omit<StableButtonProps, "kind">) {
  return <StableButton {...props} kind="primary" />;
}

export function SecondaryButton(props: Omit<StableButtonProps, "kind">) {
  return <StableButton {...props} kind="secondary" />;
}

export function SubtleButton(props: Omit<StableButtonProps, "kind">) {
  return <StableButton {...props} kind="soft" />;
}

export function DangerButton(props: Omit<StableButtonProps, "kind">) {
  return <StableButton {...props} kind="danger" />;
}

export function CardActionRow({
  children,
  minHeight = 58,
  align = "start",
  style,
}: {
  children: React.ReactNode;
  minHeight?: number;
  align?: "start" | "center" | "end" | "stretch";
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        flexWrap: "wrap",
        alignItems: align === "stretch" ? "stretch" : "center",
        justifyContent:
          align === "center" ? "center" : align === "end" ? "flex-end" : "flex-start",
        minHeight,
        boxSizing: "border-box",
        overflowAnchor: "none",
        contain: "layout paint",
        transition: "none",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function StableDisclosureSummary({
  children,
  debugId,
  stableHeight = 40,
  style,
  onPointerDown,
  onMouseDown,
  onClick,
  onKeyDown,
  ...rest
}: StableDisclosureSummaryProps) {
  return (
    <summary
      {...rest}
      data-cta-id={debugId}
      onPointerDown={(event) => {
        stopTap(event);
        onPointerDown?.(event);
      }}
      onMouseDown={(event) => {
        stopTap(event);
        onMouseDown?.(event);
      }}
      onClick={(event) => {
        stopTap(event);
        onClick?.(event);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        onKeyDown?.(event);
      }}
      style={{
        ...brandStableTapTarget(),
        minHeight: stableHeight,
        listStyle: "none",
        cursor: "pointer",
        ...style,
      }}
    >
      {children}
    </summary>
  );
}
