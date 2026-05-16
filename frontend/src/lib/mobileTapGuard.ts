const ACTION_ROOT_SELECTOR = [
  '[data-gmfn-action-root="true"]',
  "[data-cta-id]",
  "button",
  "a",
  '[role="button"]',
  "summary",
  'input[type="button"]',
  'input[type="submit"]',
].join(",");

type ActiveTap = {
  root: Element;
  rootLabel: string;
  pointerId: number;
  x: number;
  y: number;
  startedAt: number;
  suppressNextClick: boolean;
};

let activeTap: ActiveTap | null = null;
let installed = false;
let lastAcceptedActionClickAt = 0;
const TRACE_KEY = "gmfn_mobile_tap_trace";
const TRACE_LIMIT = 20;

function nowMs(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function actionRootFromTarget(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) return null;
  return target.closest(ACTION_ROOT_SELECTOR);
}

function actionRootFromEvent(event: Event): Element | null {
  const path =
    typeof event.composedPath === "function" ? event.composedPath() : [];

  for (const item of path) {
    if (!(item instanceof Element)) continue;
    const root = item.closest(ACTION_ROOT_SELECTOR);
    if (root) return root;
  }

  return actionRootFromTarget(event.target);
}

function labelForAction(root: Element | null): string {
  if (!root) return "none";

  const ctaId =
    root.getAttribute("data-cta-id") ||
    root.getAttribute("aria-label") ||
    root.getAttribute("href") ||
    root.textContent ||
    root.tagName;

  return String(ctaId || root.tagName)
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 160);
}

function traceTap(eventName: string, detail: Record<string, unknown>): void {
  if (typeof window === "undefined") return;

  try {
    const storage = window.sessionStorage;
    const rows = JSON.parse(String(storage.getItem(TRACE_KEY) || "[]"));
    const list = Array.isArray(rows) ? rows : [];
    list.push({
      event: eventName,
      path: `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`,
      at: new Date().toISOString(),
      ...detail,
    });
    storage.setItem(TRACE_KEY, JSON.stringify(list.slice(-TRACE_LIMIT)));
  } catch {
    // Tracing is best-effort only. It must never interfere with tapping.
  }
}

function sameActionRoot(startedAt: Element, endedAt: Element | null): boolean {
  if (!endedAt) return false;
  return startedAt === endedAt || startedAt.contains(endedAt);
}

function isDisabledAction(root: Element | null): boolean {
  if (!root) return false;

  const disabledAttr = root.getAttribute("disabled");
  const ariaDisabled = root.getAttribute("aria-disabled");
  return disabledAttr !== null || String(ariaDisabled || "").toLowerCase() === "true";
}

function clearIfStale(): void {
  if (!activeTap) return;
  if (nowMs() - activeTap.startedAt > 900) {
    activeTap = null;
  }
}

function handlePointerDown(event: PointerEvent): void {
  const root = actionRootFromEvent(event);
  activeTap = root
    ? {
        root,
        rootLabel: labelForAction(root),
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startedAt: nowMs(),
        suppressNextClick: false,
      }
    : null;
}

function handlePointerCancel(event: PointerEvent): void {
  if (!activeTap || activeTap.pointerId !== event.pointerId) return;
  activeTap = null;
}

function handlePointerUp(event: PointerEvent): void {
  clearIfStale();
  if (!activeTap || activeTap.pointerId !== event.pointerId) return;

  const endRoot = actionRootFromEvent(event);
  const moved = Math.hypot(event.clientX - activeTap.x, event.clientY - activeTap.y);

  if (moved <= 40 && !sameActionRoot(activeTap.root, endRoot)) {
    activeTap.suppressNextClick = true;
    traceTap("pointerup-mismatch", {
      started: activeTap.rootLabel,
      ended: labelForAction(endRoot),
      moved: Math.round(moved),
    });
    event.preventDefault();
    event.stopPropagation();
  }
}

function handleClick(event: MouseEvent): void {
  clearIfStale();

  const endRoot = actionRootFromEvent(event);
  const currentTime = nowMs();
  const insideSettleWindow =
    endRoot && !activeTap && currentTime - lastAcceptedActionClickAt < 520;

  if (insideSettleWindow) {
    traceTap("click-settle-suppressed", {
      ended: labelForAction(endRoot),
      sinceLastAccepted: Math.round(currentTime - lastAcceptedActionClickAt),
    });
    event.preventDefault();
    event.stopPropagation();
    activeTap = null;
    return;
  }

  if (isDisabledAction(endRoot)) {
    traceTap("click-disabled-suppressed", {
      ended: labelForAction(endRoot),
    });
    event.preventDefault();
    event.stopPropagation();
    activeTap = null;
    return;
  }

  if (!activeTap) return;

  const elapsed = currentTime - activeTap.startedAt;
  const moved = Math.hypot(event.clientX - activeTap.x, event.clientY - activeTap.y);
  const looksLikeSameTap = elapsed <= 900 && moved <= 40;

  if (
    activeTap.suppressNextClick ||
    isDisabledAction(activeTap.root) ||
    (looksLikeSameTap && !sameActionRoot(activeTap.root, endRoot))
  ) {
    traceTap("click-mismatch-suppressed", {
      started: activeTap.rootLabel,
      ended: labelForAction(endRoot),
      moved: Math.round(moved),
      elapsed: Math.round(elapsed),
    });
    event.preventDefault();
    event.stopPropagation();
  } else if (endRoot) {
    lastAcceptedActionClickAt = currentTime;
    traceTap("click-accepted", {
      action: labelForAction(endRoot),
    });
  }

  activeTap = null;
}

export function installMobileTapGuard(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("click", handleClick, true);
}
