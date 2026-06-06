import type { Location, NavigateFunction, NavigateOptions, To } from "react-router-dom";
import { appRoute, type AppRouteContext } from "./appRoutes";
import { CTA_INTENT_ROUTES } from "./actionTargetRoutes";
import { navigateWithOrigin } from "./nav";

export type CtaIntent = keyof typeof CTA_INTENT_ROUTES;

export type CtaTargetContext = AppRouteContext & {
  enabled?: boolean;
  disabledReason?: string;
  fallbackTo?: To;
  explicitTo?: To;
  debugId?: string;
};

export type CtaTarget = {
  intent: CtaIntent;
  to: To;
  enabled: boolean;
  disabledReason?: string;
  debugId?: string;
};

export function resolveCtaTarget(
  intent: CtaIntent,
  context: CtaTargetContext = {}
): CtaTarget {
  const enabled = context.enabled !== false;
  const to =
    context.explicitTo ||
    (enabled
      ? appRoute(CTA_INTENT_ROUTES[intent], context)
      : context.fallbackTo || appRoute(CTA_INTENT_ROUTES[intent], context));

  return {
    intent,
    to,
    enabled,
    disabledReason: enabled ? undefined : context.disabledReason || "Not available yet",
    debugId: context.debugId,
  };
}

export function debugCtaResolution(target: CtaTarget, meta: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const devMode = window.localStorage?.getItem("gmfn_debug_cta") === "1";
  if (!devMode) return;
  console.debug("[GSN CTA]", {
    intent: target.intent,
    to: target.to,
    enabled: target.enabled,
    disabledReason: target.disabledReason,
    debugId: target.debugId,
    ...meta,
  });
}

export function navigateToCta(
  navigate: NavigateFunction,
  location: Pick<Location, "pathname" | "search" | "hash">,
  target: CtaTarget,
  options?: NavigateOptions
): boolean {
  debugCtaResolution(target, { origin: `${location.pathname}${location.search}${location.hash}` });
  if (!target.enabled) return false;
  navigateWithOrigin(navigate, target.to, location, options);
  return true;
}
