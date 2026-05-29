import React, { useId, useRef, useState } from "react";
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

const CLICK_DEBOUNCE_MS = 360;
const STABLE_ACTION_CLASS = "gmfn-stable-action";

function stableActionClassName(className?: string): string {
  return [STABLE_ACTION_CLASS, className].filter(Boolean).join(" ");
}

function cleanActionId(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9._:-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function actionDebugId(
  prefix: string,
  explicitDebugId: unknown,
  dataCtaId: unknown,
  generatedId: string
): string {
  return (
    cleanActionId(explicitDebugId) ||
    cleanActionId(dataCtaId) ||
    `gmfn-auto-${prefix}-${cleanActionId(generatedId) || "action"}`
  );
}

function stableStyle(
  kind: BrandActionKind | "danger",
  disabled: boolean,
  args: Pick<StableActionProps, "fullWidth" | "minWidth" | "stableHeight" | "style">
): React.CSSProperties {
  const fixedHeight = typeof args.stableHeight === "number" ? args.stableHeight : undefined;
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
    display: base.display ?? "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: args.fullWidth ? "100%" : base.width,
    minWidth: args.minWidth ?? base.minWidth,
    minHeight: fixedHeight ?? base.minHeight,
    height: fixedHeight,
    maxHeight: fixedHeight,
    flexShrink: 0,
    gap: 8,
    overflow: "hidden",
    overflowWrap: "anywhere",
    textAlign: "center",
    textDecoration: "none",
    whiteSpace: "normal",
    wordBreak: "normal",
    lineHeight: 1.15,
    padding: fixedHeight ? (fixedHeight <= 44 ? "8px 12px" : "9px 14px") : base.padding,
    transition: "none",
    ...args.style,
  };
}

function stopTap(event: React.SyntheticEvent<HTMLElement>) {
  event.stopPropagation();
}

function composeTapGuard<E extends React.SyntheticEvent<HTMLElement>>(
  handler?: (event: E) => void
) {
  return (event: E) => {
    stopTap(event);
    handler?.(event);
  };
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
  className,
  onClick,
  onPointerDown,
  onPointerUp,
  onMouseDown,
  tabIndex,
  type = "button",
  ...rest
}: StableButtonProps) {
  const [localBusy, setLocalBusy] = useState(false);
  const inFlight = useRef(false);
  const lastClickAt = useRef(0);
  const generatedId = useId();
  const locked = disabled || busy || localBusy;
  const resolvedDebugId = actionDebugId(
    "button",
    debugId,
    (rest as Record<string, unknown>)["data-cta-id"],
    generatedId
  );

  function handleClick(event: React.MouseEvent<HTMLButtonElement>) {
    const customClick = Boolean(onClick);
    stopTap(event);
    if (locked || inFlight.current) {
      event.preventDefault();
      return;
    }

    const clickedAt = performance.now();
    if (clickedAt - lastClickAt.current < CLICK_DEBOUNCE_MS) {
      event.preventDefault();
      return;
    }
    lastClickAt.current = clickedAt;

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
      data-gmfn-action-root="true"
      data-cta-id={resolvedDebugId}
      className={stableActionClassName(className)}
      aria-busy={busy || localBusy || undefined}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : tabIndex}
      onPointerDown={composeTapGuard(onPointerDown)}
      onPointerUp={composeTapGuard(onPointerUp)}
      onMouseDown={composeTapGuard(onMouseDown)}
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
  className,
  onClick,
  onPointerDown,
  onPointerUp,
  onMouseDown,
  tabIndex,
  ...rest
}: StableLinkProps) {
  const lastClickAt = useRef(0);
  const generatedId = useId();
  const locked = disabled || busy;
  const resolvedDebugId = actionDebugId(
    "link",
    debugId,
    (rest as Record<string, unknown>)["data-cta-id"],
    generatedId
  );

  function handleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    stopTap(event);
    if (locked) {
      event.preventDefault();
      return;
    }

    const clickedAt = performance.now();
    if (clickedAt - lastClickAt.current < CLICK_DEBOUNCE_MS) {
      event.preventDefault();
      return;
    }
    lastClickAt.current = clickedAt;

    onClick?.(event);
  }

  return (
    <OriginLink
      {...rest}
      data-gmfn-action-root="true"
      data-cta-id={resolvedDebugId}
      className={stableActionClassName(className)}
      aria-busy={busy || undefined}
      aria-disabled={locked || undefined}
      tabIndex={locked ? -1 : tabIndex}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onMouseDown={onMouseDown}
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
  className,
  onPointerDown,
  onPointerUp,
  onMouseDown,
  onClick,
  onKeyDown,
  ...rest
}: StableDisclosureSummaryProps) {
  const generatedId = useId();
  const resolvedDebugId = actionDebugId(
    "summary",
    debugId,
    (rest as Record<string, unknown>)["data-cta-id"],
    generatedId
  );

  return (
    <summary
      {...rest}
      data-gmfn-action-root="true"
      data-cta-id={resolvedDebugId}
      className={stableActionClassName(className)}
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
      onPointerUp={(event) => {
        stopTap(event);
        onPointerUp?.(event);
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
