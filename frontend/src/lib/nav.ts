import type {
  Location,
  NavigateFunction,
  NavigateOptions,
  To,
} from "react-router-dom";

export type OriginState = {
  from?: string;
};

export function currentPath(
  location: Pick<Location, "pathname" | "search" | "hash">
): string {
  return `${location.pathname || ""}${location.search || ""}${location.hash || ""}`;
}

export function isSafeInternalPath(value: string): boolean {
  const raw = String(value || "").trim();
  return raw.startsWith("/") && !raw.startsWith("//") && !/^[a-z][a-z0-9+.-]*:/i.test(raw);
}

export function originState(
  location: Pick<Location, "pathname" | "search" | "hash">
): OriginState {
  return { from: currentPath(location) };
}

export function withOriginState(
  location: Pick<Location, "pathname" | "search" | "hash">,
  existing?: Record<string, unknown> | null
): Record<string, unknown> {
  return {
    ...(existing || {}),
    from: currentPath(location),
  };
}

export function resolveBackTarget(
  location: Pick<Location, "pathname" | "search" | "hash" | "state">,
  fallback = "/app/dashboard"
): string {
  const current = currentPath(location);
  const raw =
    location?.state &&
    typeof location.state === "object" &&
    "from" in (location.state as any)
      ? String((location.state as any).from || "").trim()
      : "";

  if (raw && isSafeInternalPath(raw) && raw !== current) {
    return raw;
  }

  return fallback;
}

export function navigateWithOrigin(
  navigate: NavigateFunction,
  to: To,
  location: Pick<Location, "pathname" | "search" | "hash">,
  options?: NavigateOptions
) {
  navigate(to, {
    ...(options || {}),
    state: withOriginState(location, (options?.state as Record<string, unknown>) || {}),
  });
}