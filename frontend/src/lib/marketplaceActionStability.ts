import type React from "react";

type MarketplaceLandingTraceDetail = {
  surface: "marketplace" | "marketplace-workspace";
  targetId: string;
  reason: string;
  attempt?: number;
  top?: number;
  offset?: number;
  delta?: number;
  corrected?: boolean;
  settled?: boolean;
  viewportHeight?: number;
  scrollContainer?: string;
};

const MARKETPLACE_LANDING_TRACE_KEY = "gmfn_marketplace_landing_trace";
const MARKETPLACE_LANDING_TRACE_LIMIT = 24;

function nowIso(): string {
  return new Date().toISOString();
}

export function traceMarketplaceLanding(detail: MarketplaceLandingTraceDetail): void {
  if (typeof window === "undefined") return;

  try {
    const raw = window.sessionStorage.getItem(MARKETPLACE_LANDING_TRACE_KEY);
    const parsed = JSON.parse(String(raw || "[]"));
    const rows = Array.isArray(parsed) ? parsed : [];
    rows.push({
      at: nowIso(),
      path: `${window.location.pathname || ""}${window.location.search || ""}${window.location.hash || ""}`,
      ...detail,
    });
    window.sessionStorage.setItem(
      MARKETPLACE_LANDING_TRACE_KEY,
      JSON.stringify(rows.slice(-MARKETPLACE_LANDING_TRACE_LIMIT))
    );
  } catch {
    // Trace must never break marketplace actions.
  }
}

export function marketplaceLandingOffsetPx(): number {
  if (typeof window === "undefined") return 96;

  if ((window.innerWidth || 0) > 980) return 96;

  const viewportHeight =
    window.visualViewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight ||
    0;
  const viewportTop = window.visualViewport?.offsetTop || 0;
  const addressBarDelta = Math.max(
    0,
    (window.innerHeight || 0) - viewportHeight - viewportTop
  );

  return Math.min(
    196,
    Math.max(132, Math.round(viewportHeight * 0.16) + Math.round(addressBarDelta * 0.5))
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

function viewportHeight(): number {
  return (
    window.visualViewport?.height ||
    window.innerHeight ||
    document.documentElement.clientHeight ||
    0
  );
}

export function scrollElementToMarketplaceLanding(
  target: HTMLElement,
  detail: Omit<MarketplaceLandingTraceDetail, "top" | "offset" | "viewportHeight">
): void {
  if (typeof window === "undefined") return;

  const offset = marketplaceLandingOffsetPx();
  const container = scrollableAncestor(target);
  const containerRect = container?.getBoundingClientRect();
  const targetRect = target.getBoundingClientRect();
  const currentScroll = container ? container.scrollTop : window.scrollY;
  const targetTop =
    targetRect.top -
    (containerRect?.top || 0) +
    currentScroll -
    offset;
  const top = Math.max(0, Math.round(targetTop));
  const scrollContainer = container ? container.tagName.toLowerCase() : "window";

  if (container) {
    container.scrollTo({ top, behavior: "auto" });
  } else {
    window.scrollTo({ top, behavior: "auto" });
  }

  window.requestAnimationFrame(() => {
    const nextContainerRect = container?.getBoundingClientRect();
    const delta = Math.round(
      target.getBoundingClientRect().top - (nextContainerRect?.top || 0) - offset
    );
    const settled = Math.abs(delta) <= 18;

    if (!settled) {
      const correctedTop = Math.max(
        0,
        Math.round((container ? container.scrollTop : window.scrollY) + delta)
      );
      if (container) {
        container.scrollTo({ top: correctedTop, behavior: "auto" });
      } else {
        window.scrollTo({ top: correctedTop, behavior: "auto" });
      }
      traceMarketplaceLanding({
        ...detail,
        reason: `${detail.reason}-corrected`,
        top: correctedTop,
        offset,
        delta,
        corrected: true,
        settled: Math.abs(
          Math.round(
            target.getBoundingClientRect().top -
              (container?.getBoundingClientRect().top || 0) -
              offset
          )
        ) <= 18,
        viewportHeight: viewportHeight(),
        scrollContainer,
      });
    } else {
      traceMarketplaceLanding({
        ...detail,
        reason: `${detail.reason}-settled`,
        top,
        offset,
        delta,
        corrected: false,
        settled: true,
        viewportHeight: viewportHeight(),
        scrollContainer,
      });
    }
  });

  traceMarketplaceLanding({
    ...detail,
    top,
    offset,
    viewportHeight: viewportHeight(),
    scrollContainer,
  });
}

export function marketplaceSectionStyle(): React.CSSProperties {
  return {
    scrollMarginTop: marketplaceLandingOffsetPx(),
    overflowAnchor: "none",
  };
}
