export const APP_SHELL_COMPACT_MAX_WIDTH = 980;

export function currentAppViewportWidth(): number {
  if (typeof window === "undefined") return Number.POSITIVE_INFINITY;

  return window.visualViewport?.width || window.innerWidth;
}

export function isCompactAppViewport(): boolean {
  return currentAppViewportWidth() <= APP_SHELL_COMPACT_MAX_WIDTH;
}