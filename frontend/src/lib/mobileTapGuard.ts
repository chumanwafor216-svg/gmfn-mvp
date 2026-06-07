const ACTION_ROOT_SELECTOR = [
  '[data-gmfn-action-root="true"]',
  "[data-cta-id]",
  "button",
  "a",
  '[role="button"]',
  "summary",
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="file"]',
].join(",");

const BOTTOM_NAV_SELECTOR =
  '[data-gmfn-bottom-nav="true"], [data-gmfn-bottom-nav-item="true"]';
const ACTIVE_ACTION_CLASS = "gmfn-action-press-lock";

type ActionRect = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

type ActiveTap = {
  root: Element;
  rootLabel: string;
  pointerId: number;
  x: number;
  y: number;
  rect: ActionRect | null;
  startedAt: number;
  suppressNextClick: boolean;
};

type PointerContext = {
  root: Element;
  rootLabel: string;
  pointerId: number;
  x: number;
  y: number;
  rect: ActionRect | null;
  startedAt: number;
  cancelledAt?: number;
};

let activeTap: ActiveTap | null = null;
let lastPointerContext: PointerContext | null = null;
let installed = false;
let lastAcceptedActionClickAt = 0;
let lastAcceptedActionRoot: Element | null = null;
let redispatchingRoot: Element | null = null;
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

function rectForAction(root: Element | null): ActionRect | null {
  if (!root || typeof root.getBoundingClientRect !== "function") return null;
  const rect = root.getBoundingClientRect();
  const values = [
    rect.left,
    rect.top,
    rect.right,
    rect.bottom,
    rect.width,
    rect.height,
  ];

  if (!values.every((value) => Number.isFinite(value))) return null;

  return {
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    width: rect.width,
    height: rect.height,
  };
}

function pointInsideRect(
  x: number,
  y: number,
  rect: ActionRect | null,
  tolerance = 8
): boolean {
  if (!rect) return true;
  return (
    x >= rect.left - tolerance &&
    x <= rect.right + tolerance &&
    y >= rect.top - tolerance &&
    y <= rect.bottom + tolerance
  );
}

function rectHasShifted(
  before: ActionRect | null,
  after: ActionRect | null
): boolean {
  if (!before || !after) return false;

  return (
    Math.abs(before.left - after.left) > 8 ||
    Math.abs(before.top - after.top) > 8 ||
    Math.abs(before.width - after.width) > 6 ||
    Math.abs(before.height - after.height) > 6
  );
}

function geometryBecameUnsafe(
  startRect: ActionRect | null,
  currentRect: ActionRect | null,
  x: number,
  y: number
): boolean {
  if (!rectHasShifted(startRect, currentRect)) return false;
  return !pointInsideRect(x, y, startRect) || !pointInsideRect(x, y, currentRect);
}

function markActiveAction(root: Element | null): void {
  root?.classList?.add(ACTIVE_ACTION_CLASS);
}

function unmarkActiveAction(root: Element | null): void {
  root?.classList?.remove(ACTIVE_ACTION_CLASS);
}

function clearActiveTap(): void {
  unmarkActiveAction(activeTap?.root || null);
  activeTap = null;
}

function canCommitOriginalAction(root: Element | null): root is HTMLElement {
  if (!(root instanceof HTMLElement)) return false;
  if (!root.isConnected) return false;
  if (isDisabledAction(root)) return false;
  return typeof root.click === "function";
}

function commitOriginalAction(
  root: Element | null,
  reason: string,
  detail: Record<string, unknown>
): boolean {
  if (!canCommitOriginalAction(root)) return false;

  traceTap("click-original-action-committed", {
    action: labelForAction(root),
    reason,
    ...detail,
  });

  const previousRedispatchRoot = redispatchingRoot;
  redispatchingRoot = root;
  clearActiveTap();
  lastPointerContext = null;
  lastAcceptedActionClickAt = nowMs();
  lastAcceptedActionRoot = root;

  try {
    root.click();
  } finally {
    redispatchingRoot = previousRedispatchRoot;
  }

  return true;
}

function isBottomNavAction(root: Element | null): boolean {
  if (!root) return false;
  return Boolean(root.closest(BOTTOM_NAV_SELECTOR));
}

function isDashboardAction(root: Element | null): boolean {
  const ctaId = root?.getAttribute("data-cta-id") || "";
  return (
    ctaId.startsWith("dashboard.") ||
    ctaId.startsWith("picture-frame-tools.")
  );
}

function isTrustedPublicShopAction(root: Element | null): boolean {
  const ctaId = root?.getAttribute("data-cta-id") || "";

  if (!ctaId.startsWith("shop-gallery.")) return false;
  if (ctaId.startsWith("shop-gallery.member-nav.")) return false;
  if (ctaId.includes(".paid-placement")) return false;

  return !isDisabledAction(root);
}

function preserveTrustedPublicShopClick(
  root: Element | null,
  reason: string,
  detail: Record<string, unknown>
): boolean {
  if (!isTrustedPublicShopAction(root)) return false;

  traceTap("public-shop-trusted-click-preserved", {
    action: labelForAction(root),
    reason,
    ...detail,
  });
  clearActiveTap();
  lastPointerContext = null;
  lastAcceptedActionClickAt = nowMs();
  lastAcceptedActionRoot = root;
  return true;
}

function coveredDashboardActionFromBottomNav(
  event: PointerEvent | MouseEvent,
  topRoot = actionRootFromEvent(event)
): Element | null {
  if (typeof document === "undefined" || typeof window === "undefined") return null;
  if (window.location.pathname !== "/app/dashboard") return null;

  if (!isBottomNavAction(topRoot)) return null;

  const stack = document.elementsFromPoint(event.clientX, event.clientY);
  let sawBottomNav = false;

  for (const item of stack) {
    if (!(item instanceof Element)) continue;

    const root = actionRootFromTarget(item);
    if (!root) continue;

    if (isBottomNavAction(root)) {
      sawBottomNav = true;
      continue;
    }

    if (sawBottomNav && isDashboardAction(root)) {
      return root;
    }
  }

  return null;
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
  if (startedAt === endedAt) return true;

  const startedId = startedAt.getAttribute("data-cta-id");
  const endedId = endedAt.getAttribute("data-cta-id");
  return Boolean(startedId && endedId && startedId === endedId);
}

function isFileInputAction(root: Element | null): root is HTMLInputElement {
  return (
    root instanceof HTMLInputElement &&
    String(root.getAttribute("type") || "").toLowerCase() === "file"
  );
}

function isAssociatedFileInputClick(
  actionRoot: Element | null,
  endRoot: Element | null
): boolean {
  if (!actionRoot || !isFileInputAction(endRoot)) return false;

  const inputId = endRoot.id || endRoot.getAttribute("id") || "";
  if (!inputId) return false;

  const explicitInputId = actionRoot.getAttribute("data-gmfn-file-input-id");
  const labelTarget =
    actionRoot instanceof HTMLLabelElement
      ? actionRoot.getAttribute("for") || actionRoot.htmlFor
      : "";

  return explicitInputId === inputId || labelTarget === inputId;
}

function isDisabledAction(root: Element | null): boolean {
  if (!root) return false;

  const disabledAttr = root.getAttribute("disabled");
  const ariaDisabled = root.getAttribute("aria-disabled");
  return disabledAttr !== null || String(ariaDisabled || "").toLowerCase() === "true";
}

function clearIfStale(): void {
  const currentTime = nowMs();

  if (activeTap && currentTime - activeTap.startedAt > 900) {
    clearActiveTap();
  }

  if (lastPointerContext && currentTime - lastPointerContext.startedAt > 1200) {
    lastPointerContext = null;
  }
}

function handlePointerDown(event: PointerEvent): void {
  const initialRoot = actionRootFromEvent(event);
  const coveredDashboardRoot = coveredDashboardActionFromBottomNav(event, initialRoot);
  const root = coveredDashboardRoot || initialRoot;
  if (!root) {
    clearActiveTap();
    lastPointerContext = null;
    return;
  }

  clearActiveTap();

  const context = {
    root,
    rootLabel: labelForAction(root),
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    rect: rectForAction(root),
    startedAt: nowMs(),
  };

  activeTap = {
    ...context,
    suppressNextClick: false,
  };
  lastPointerContext = context;
  markActiveAction(root);

  try {
    root.setPointerCapture?.(event.pointerId);
  } catch {
    // Pointer capture is a best-effort stability hint; unsupported browsers still use the click guard.
  }

  if (coveredDashboardRoot) {
    traceTap("bottom-nav-covered-dashboard-start", {
      intended: labelForAction(coveredDashboardRoot),
      coveredBy: labelForAction(actionRootFromEvent(event)),
    });
  }

}

function handlePointerCancel(event: PointerEvent): void {
  if (lastPointerContext?.pointerId === event.pointerId) {
    lastPointerContext = {
      ...lastPointerContext,
      cancelledAt: nowMs(),
    };
  }

  if (activeTap?.pointerId === event.pointerId) {
    clearActiveTap();
  }
}

function handlePointerUp(event: PointerEvent): void {
  clearIfStale();
  if (!activeTap || activeTap.pointerId !== event.pointerId) return;

  const endRoot = actionRootFromEvent(event);
  const moved = Math.hypot(event.clientX - activeTap.x, event.clientY - activeTap.y);
  const currentRect = rectForAction(activeTap.root);
  const unsafeGeometry = geometryBecameUnsafe(
    activeTap.rect,
    currentRect,
    event.clientX,
    event.clientY
  );

  if (moved <= 40 && (!sameActionRoot(activeTap.root, endRoot) || unsafeGeometry)) {
    traceTap(unsafeGeometry ? "pointerup-geometry-shift" : "pointerup-mismatch", {
      started: activeTap.rootLabel,
      ended: labelForAction(endRoot),
      moved: Math.round(moved),
      shifted: unsafeGeometry,
    });
    clearActiveTap();
    lastPointerContext = null;
  }
}

function handleClick(event: MouseEvent): void {
  clearIfStale();

  const endRoot = actionRootFromEvent(event);
  const currentTime = nowMs();
  const coveredDashboardRoot = coveredDashboardActionFromBottomNav(event, endRoot);

  if (
    redispatchingRoot &&
    endRoot &&
    sameActionRoot(redispatchingRoot, endRoot)
  ) {
    lastAcceptedActionClickAt = currentTime;
    traceTap("click-redispatch-accepted", {
      action: labelForAction(endRoot),
    });
    return;
  }

  if (coveredDashboardRoot && endRoot) {
    traceTap("bottom-nav-covered-dashboard-suppressed", {
      intended: labelForAction(coveredDashboardRoot),
      ended: labelForAction(endRoot),
    });
    event.preventDefault();
    event.stopPropagation();
    commitOriginalAction(coveredDashboardRoot, "bottom-nav-covered-dashboard", {
      ended: labelForAction(endRoot),
    });
    return;
  }

  if (isDisabledAction(endRoot)) {
    traceTap("click-disabled-suppressed", {
      ended: labelForAction(endRoot),
    });
    event.preventDefault();
    event.stopPropagation();
    clearActiveTap();
    return;
  }

  const insideSettleWindow =
    endRoot && !activeTap && currentTime - lastAcceptedActionClickAt < 520;

  if (
    endRoot &&
    preserveTrustedPublicShopClick(endRoot, "click-before-suppression", {
      hasActiveTap: Boolean(activeTap),
      sinceLastAccepted: Math.round(currentTime - lastAcceptedActionClickAt),
    })
  ) {
    return;
  }

  if (insideSettleWindow) {
    if (isAssociatedFileInputClick(lastAcceptedActionRoot, endRoot)) {
      traceTap("click-file-input-associated-accepted", {
        action: labelForAction(lastAcceptedActionRoot),
        input: labelForAction(endRoot),
      });
    } else {
      traceTap("click-settle-observed", {
        ended: labelForAction(endRoot),
        sinceLastAccepted: Math.round(currentTime - lastAcceptedActionClickAt),
      });
    }
  }

  if (!activeTap && endRoot && lastPointerContext) {
    const elapsedSinceStart = currentTime - lastPointerContext.startedAt;
    const elapsedSinceCancel = lastPointerContext.cancelledAt
      ? currentTime - lastPointerContext.cancelledAt
      : Number.POSITIVE_INFINITY;
    const moved = Math.hypot(
      event.clientX - lastPointerContext.x,
      event.clientY - lastPointerContext.y
    );
    const sameRoot = sameActionRoot(lastPointerContext.root, endRoot);
    const currentRect = rectForAction(lastPointerContext.root);
    const unsafeGeometry = geometryBecameUnsafe(
      lastPointerContext.rect,
      currentRect,
      event.clientX,
      event.clientY
    );
    const recentPointer = elapsedSinceStart <= 900;
    const recentCancel = elapsedSinceCancel <= 700;

    const wrongRoot = endRoot && !sameRoot;

    if ((recentPointer && (wrongRoot || unsafeGeometry)) || recentCancel) {
      traceTap(recentCancel ? "click-after-cancel-observed" : "click-orphan-mismatch-observed", {
        started: lastPointerContext.rootLabel,
        ended: labelForAction(endRoot),
        moved: Math.round(moved),
        elapsed: Math.round(elapsedSinceStart),
        shifted: unsafeGeometry,
      });
      lastPointerContext = null;
    }
  }

  if (!activeTap) {
    if (endRoot) {
      lastAcceptedActionClickAt = currentTime;
      lastAcceptedActionRoot = endRoot;
    }
    return;
  }

  const elapsed = currentTime - activeTap.startedAt;
  const moved = Math.hypot(event.clientX - activeTap.x, event.clientY - activeTap.y);
  const recentTap = elapsed <= 900;
  const currentRect = rectForAction(activeTap.root);
  const unsafeGeometry = geometryBecameUnsafe(
    activeTap.rect,
    currentRect,
    event.clientX,
    event.clientY
  );
  const wrongRoot = endRoot && !sameActionRoot(activeTap.root, endRoot);

  if (
    activeTap.suppressNextClick ||
    isDisabledAction(activeTap.root) ||
    (recentTap && (wrongRoot || unsafeGeometry))
  ) {
    const reason = unsafeGeometry
      ? "click-geometry-shift-suppressed"
      : "click-mismatch-suppressed";
    traceTap(reason, {
      started: activeTap.rootLabel,
      ended: labelForAction(endRoot),
      moved: Math.round(moved),
      elapsed: Math.round(elapsed),
      shifted: unsafeGeometry,
    });
  }

  if (endRoot) {
    lastAcceptedActionClickAt = currentTime;
    lastAcceptedActionRoot = endRoot;
    traceTap("click-accepted", {
      action: labelForAction(endRoot),
    });
  }

  clearActiveTap();
  lastPointerContext = null;
}

export function installMobileTapGuard(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;

  document.addEventListener("pointerdown", handlePointerDown, true);
  document.addEventListener("pointercancel", handlePointerCancel, true);
  document.addEventListener("pointerup", handlePointerUp, true);
  document.addEventListener("click", handleClick, true);
}
