import React, { useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SecondaryButton, SubtleButton } from "./StableButton";

export type PictureFrameToolAction = {
  label: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  inputId?: string;
  disabled?: boolean;
  onDisabledClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
};

type RailPlacement = {
  left: number;
  top: number;
  width: number;
};

type PictureFrameToolsControlProps = {
  open: boolean;
  label: string;
  ariaLabel?: string;
  onToggle: (event: React.MouseEvent<HTMLButtonElement>) => void;
  actions: PictureFrameToolAction[];
  slotStyle: React.CSSProperties;
  buttonStyle: React.CSSProperties;
  railStyle: React.CSSProperties;
  railGap?: number;
  railColumns?: string;
  railMinWidth?: number;
  triggerHeight?: number;
  zIndex?: number;
};

function stopFrameToolEvent(event?: React.SyntheticEvent<HTMLElement>) {
  event?.stopPropagation();
}

function fileLabelKeyDown(event: React.KeyboardEvent<HTMLLabelElement>, inputId: string) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  event.stopPropagation();
  document.getElementById(inputId)?.click();
}

function frameToolLabelStyle(style?: React.CSSProperties): React.CSSProperties {
  const movementLock: React.CSSProperties = {
    transform: "none",
    transition: "none",
    overflowAnchor: "none",
  };

  return {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
    cursor: "pointer",
    userSelect: "none",
    WebkitUserSelect: "none",
    WebkitTapHighlightColor: "transparent",
    touchAction: "manipulation",
    textAlign: "center",
    textDecoration: "none",
    overflow: "hidden",
    ...movementLock,
    ...style,
    ...movementLock,
  };
}

function stableRailPlacement(
  element: HTMLElement | null,
  railGap: number,
  railMinWidth: number
): RailPlacement | null {
  if (typeof window === "undefined" || !element) return null;

  const rect = element.getBoundingClientRect();
  const visualViewport = window.visualViewport;
  const viewportWidth = Math.max(
    320,
    visualViewport?.width || window.innerWidth || 320
  );
  const width = Math.min(
    Math.max(1, rect.width, railMinWidth),
    Math.max(1, viewportWidth - 16)
  );
  const preferredLeft = rect.right - width;
  const left = Math.min(
    Math.max(8, preferredLeft),
    Math.max(8, viewportWidth - width - 8)
  );

  return {
    left,
    top: Math.max(8, rect.bottom + railGap),
    width,
  };
}

export default function PictureFrameToolsControl({
  open,
  label,
  ariaLabel,
  onToggle,
  actions,
  slotStyle,
  buttonStyle,
  railStyle,
  railGap = 8,
  railColumns = "1fr",
  railMinWidth = 180,
  triggerHeight = 44,
  zIndex = 1800,
}: PictureFrameToolsControlProps) {
  const railId = useId();
  const slotRef = useRef<HTMLDivElement | null>(null);
  const triggerAnchorRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<RailPlacement | null>(null);
  const resolvedRailColumns =
    placement && placement.width < 260 ? "1fr" : railColumns;

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }

    function updatePlacement() {
      setPlacement(
        stableRailPlacement(
          triggerAnchorRef.current || slotRef.current,
          railGap,
          railMinWidth
        )
      );
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);
    window.visualViewport?.addEventListener("resize", updatePlacement);
    window.visualViewport?.addEventListener("scroll", updatePlacement);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
      window.visualViewport?.removeEventListener("resize", updatePlacement);
      window.visualViewport?.removeEventListener("scroll", updatePlacement);
    };
  }, [open, railGap, railMinWidth]);

  const rail =
    open && placement && typeof document !== "undefined"
      ? createPortal(
          <div
            id={railId}
            role="group"
            aria-label={`${label} tools`}
            onPointerDown={stopFrameToolEvent}
            onPointerUp={stopFrameToolEvent}
            onMouseDown={stopFrameToolEvent}
            onClick={stopFrameToolEvent}
            style={{
              ...railStyle,
              position: "fixed",
              left: placement.left,
              top: placement.top,
              width: placement.width,
              minWidth: placement.width,
              maxWidth: placement.width,
              zIndex,
              display: "grid",
              gridTemplateColumns: resolvedRailColumns,
              pointerEvents: "auto",
              visibility: "visible",
              opacity: 1,
              boxSizing: "border-box",
              transform: "none",
              overflowAnchor: "none",
              transition: "none",
            }}
          >
            {actions.map((action) =>
              action.inputId && !action.disabled ? (
                <label
                  key={action.label}
                  htmlFor={action.inputId}
                  role="button"
                  tabIndex={0}
                  data-gmfn-action-root="true"
                  data-cta-id={`picture-frame-tools.action.${action.label.toLowerCase()}`}
                  data-gmfn-file-input-id={action.inputId}
                  className="gmfn-stable-action"
                  onPointerDown={stopFrameToolEvent}
                  onPointerUp={stopFrameToolEvent}
                  onMouseDown={stopFrameToolEvent}
                  onClick={stopFrameToolEvent}
                  onKeyDown={(event) => fileLabelKeyDown(event, action.inputId || "")}
                  style={frameToolLabelStyle({
                    width: "100%",
                    minHeight: 44,
                    height: 44,
                    maxHeight: 44,
                    ...action.style,
                  })}
                >
                  <span style={{ pointerEvents: "none" }}>{action.label}</span>
                </label>
              ) : (
                <SecondaryButton
                  key={action.label}
                  aria-disabled={Boolean(action.disabled)}
                  onClick={(event) => {
                    stopFrameToolEvent(event);
                    if (action.disabled) {
                      action.onDisabledClick?.(event);
                      return;
                    }
                    action.onClick?.(event);
                  }}
                  stableHeight={44}
                  fullWidth
                  debugId={`picture-frame-tools.action.${action.label}`}
                  style={action.style}
                >
                  {action.label}
                </SecondaryButton>
              )
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div
      ref={slotRef}
      onPointerDown={stopFrameToolEvent}
      onPointerUp={stopFrameToolEvent}
      onMouseDown={stopFrameToolEvent}
      onClick={stopFrameToolEvent}
      style={{
        ...slotStyle,
        position: "relative",
        overflow: "visible",
        isolation: "isolate",
        transform: "none",
        transition: "none",
        overflowAnchor: "none",
      }}
    >
      <div
        ref={triggerAnchorRef}
        style={{
          width: "100%",
          height: triggerHeight,
          minHeight: triggerHeight,
          maxHeight: triggerHeight,
          display: "block",
          position: "relative",
          pointerEvents: "auto",
          transform: "none",
          transition: "none",
        }}
      >
        <SubtleButton
          aria-label={ariaLabel || label}
          aria-controls={railId}
          aria-expanded={open}
          onClick={(event) => {
            stopFrameToolEvent(event);
            onToggle(event);
          }}
          stableHeight={triggerHeight}
          debugId="picture-frame-tools.toggle"
          style={buttonStyle}
        >
          {label}
        </SubtleButton>
      </div>
      {rail}
    </div>
  );
}
