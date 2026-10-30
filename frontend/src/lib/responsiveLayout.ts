export const APP_SHELL_COMPACT_MAX_WIDTH = 980;
export const TOUCH_APP_SHELL_COMPACT_MAX_WIDTH = 1366;

export function currentAppViewportWidth(): number {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;

  return window.visualViewport?.width || window.innerWidth;
}

export function isTouchFirstAppDevice(): boolean {
  if (typeof window === "undefined") return false;

  const hasTouch = Number(window.navigator?.maxTouchPoints || 0) > 0;
  const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const hasNoHover = window.matchMedia?.("(hover: none)").matches ?? false;

  return hasTouch && (hasCoarsePointer || hasNoHover);
}

export function isCompactAppViewport(): boolean {
  const viewportWidth = currentAppViewportWidth();

  return (
    viewportWidth <= APP_SHELL_COMPACT_MAX_WIDTH ||
    (viewportWidth <= TOUCH_APP_SHELL_COMPACT_MAX_WIDTH && isTouchFirstAppDevice())
  );
}
