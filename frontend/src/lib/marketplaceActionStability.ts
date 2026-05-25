import type React from "react";

type MarketplaceLandingTraceDetail = {
  surface: "marketplace" | "marketplace-workspace";
  targetId: string;
  reason: string;
  attempt?: number;
  top?: number;
  offset?: number;
  viewportHeight?: number;
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
    148,
    Math.max(84, Math.round(viewportHeight * 0.12) + Math.round(addressBarDelta * 0.35))
  );
}

export function scrollElementToMarketplaceLanding(
  target: HTMLElement,
  detail: Omit<MarketplaceLandingTraceDetail, "top" | "offset" | "viewportHeight">
): void {
  if (typeof window === "undefined") return;

  const offset = marketplaceLandingOffsetPx();
  const targetTop = target.getBoundingClientRect().top + window.scrollY - offset;
  const top = Math.max(0, Math.round(targetTop));

  window.scrollTo({
    top,
    behavior: "auto",
  });

  traceMarketplaceLanding({
    ...detail,
    top,
    offset,
    viewportHeight:
      window.visualViewport?.height ||
      window.innerHeight ||
      document.documentElement.clientHeight ||
      0,
  });
}

export function marketplaceSectionStyle(): React.CSSProperties {
  return {
    scrollMarginTop: marketplaceLandingOffsetPx(),
    overflowAnchor: "none",
  };
}
