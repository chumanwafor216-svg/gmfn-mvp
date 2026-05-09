import React, { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type PictureFrameToolAction = {
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
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
  zIndex?: number;
};

function stopFrameToolEvent(event?: React.SyntheticEvent<HTMLElement>) {
  event?.preventDefault();
  event?.stopPropagation();
}

function stableRailPlacement(
  element: HTMLElement | null,
  railGap: number
): RailPlacement | null {
  if (typeof window === "undefined" || !element) return null;

  const rect = element.getBoundingClientRect();
  return {
    left: Math.max(8, rect.left),
    top: Math.max(8, rect.bottom + railGap),
    width: Math.max(1, rect.width),
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
  zIndex = 1800,
}: PictureFrameToolsControlProps) {
  const railId = useId();
  const slotRef = useRef<HTMLDivElement | null>(null);
  const [placement, setPlacement] = useState<RailPlacement | null>(null);

  useEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }

    function updatePlacement() {
      setPlacement(stableRailPlacement(slotRef.current, railGap));
    }

    updatePlacement();
    window.addEventListener("resize", updatePlacement);
    window.addEventListener("scroll", updatePlacement, true);

    return () => {
      window.removeEventListener("resize", updatePlacement);
      window.removeEventListener("scroll", updatePlacement, true);
    };
  }, [open, railGap]);

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
              zIndex,
              display: "grid",
              gridTemplateColumns: railColumns,
              pointerEvents: "auto",
              visibility: "visible",
              opacity: 1,
            }}
          >
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                aria-disabled={Boolean(action.disabled)}
                onPointerDown={stopFrameToolEvent}
                onMouseDown={stopFrameToolEvent}
                onClick={(event) => {
                  stopFrameToolEvent(event);
                  if (action.disabled) return;
                  action.onClick(event);
                }}
                style={action.style}
              >
                {action.label}
              </button>
            ))}
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
      }}
    >
      <button
        type="button"
        aria-label={ariaLabel || label}
        aria-controls={railId}
        aria-expanded={open}
        onPointerDown={stopFrameToolEvent}
        onMouseDown={stopFrameToolEvent}
        onClick={(event) => {
          stopFrameToolEvent(event);
          onToggle(event);
        }}
        style={buttonStyle}
      >
        {label}
      </button>
      {rail}
    </div>
  );
}
