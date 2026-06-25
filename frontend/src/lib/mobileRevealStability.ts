type RevealDetail = {
  surface: string;
  targetId: string;
  reason: string;
};

function viewportHeight(): number {
  if (typeof window === "undefined") return 0;

  return (
    window.visualViewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight ||
    0
  );
}

function revealOffsetPx(): number {
  if (typeof window === "undefined") return 96;
  if ((window.innerWidth || 0) > 980) return 88;

  const height = viewportHeight();
  const viewportTop = window.visualViewport?.offsetTop || 0;
  const addressBarDelta = Math.max(
    0,
    (window.innerHeight || 0) - height - viewportTop
  );

  return Math.min(
    168,
    Math.max(92, Math.round(height * 0.13) + Math.round(addressBarDelta * 0.5))
  );
}

function scrollableAncestor(target: HTMLElement): HTMLElement | null {
  let node = target.parentElement;

  while (node && node !== document.body && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = `${style.overflowY || ""} ${style.overflow || ""}`;
    const canScroll =
      /(auto|scroll|overlay)/.test(overflowY) &&
      node.scrollHeight > node.clientHeight + 8;

    if (canScroll) return node;
    node = node.parentElement;
  }

  return null;
}

function activeElementIsEditable(): boolean {
  if (typeof document === "undefined") return false;

  const active = document.activeElement;
  if (!active) return false;

  const tagName = active.tagName.toLowerCase();
  return (
    tagName === "input" ||
    tagName === "textarea" ||
    tagName === "select" ||
    active.getAttribute("contenteditable") === "true"
  );
}

function isComfortablyVisible(
  target: HTMLElement,
  container: HTMLElement | null,
  offset: number
): boolean {
  const height = viewportHeight();
  const containerRect = container?.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const topEdge = Math.max(containerRect?.top ?? 0, 0);
  const bottomEdge = Math.min(containerRect?.bottom ?? height, height);
  const comfortableTop = topEdge + 16;
  const comfortableBottom = Math.max(comfortableTop, bottomEdge - 96);
  const landingLine = topEdge + offset;

  const topAlreadyReachable =
    targetRect.top >= comfortableTop && targetRect.top <= comfortableBottom;
  const landingLineInsideTarget =
    targetRect.top <= landingLine && targetRect.bottom >= landingLine + 72;

  return topAlreadyReachable || landingLineInsideTarget;
}

export function revealElementWithoutJump(
  target: HTMLElement,
  detail: RevealDetail
): void {
  if (typeof window === "undefined") return;

  const offset = revealOffsetPx();
  const container = scrollableAncestor(target);

  if (isComfortablyVisible(target, container, offset)) return;

  const containerRect = container?.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentScroll = container ? container.scrollTop : window.scrollY;
  const targetTop =
    targetRect.top - (containerRect?.top || 0) + currentScroll - offset;
  const top = Math.max(0, Math.round(targetTop));

  if (container) {
    container.scrollTo({ top, behavior: "auto" });
  } else {
    window.scrollTo({ top, behavior: "auto" });
  }

  window.requestAnimationFrame(() => {
    if (activeElementIsEditable()) return;

    const nextContainerRect = container?.getBoundingClientRect();
    const delta = Math.round(
      target.getBoundingClientRect().top -
        (nextContainerRect?.top || 0) -
        offset
    );

    if (Math.abs(delta) <= 32 || isComfortablyVisible(target, container, offset)) {
      return;
    }

    const correctedTop = Math.max(
      0,
      Math.round((container ? container.scrollTop : window.scrollY) + delta)
    );

    if (container) {
      container.scrollTo({ top: correctedTop, behavior: "auto" });
    } else {
      window.scrollTo({ top: correctedTop, behavior: "auto" });
    }
  });

  try {
    window.sessionStorage.setItem(
      "gmfn_mobile_reveal_last",
      JSON.stringify({
        at: new Date().toISOString(),
        path: `${window.location.pathname || ""}${window.location.search || ""}`,
        ...detail,
      })
    );
  } catch {
    // Tracing must never block a tap.
  }
}
