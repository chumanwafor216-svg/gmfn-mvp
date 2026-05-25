const OWNER_SURFACE_PLACEHOLDERS = new Set([
  "string",
  "null",
  "undefined",
  "n/a",
  "na",
]);

export function ownerSurfaceSafeStr(value: unknown): string {
  return String(value ?? "").trim();
}

export function ownerSurfaceCleanText(value: unknown): string {
  const text = ownerSurfaceSafeStr(value);
  if (!text) return "";
  if (OWNER_SURFACE_PLACEHOLDERS.has(text.toLowerCase())) return "";
  return text;
}

export function ownerSurfaceFirstMeaningful(...values: unknown[]): string {
  for (const value of values) {
    const text = ownerSurfaceCleanText(value);
    if (text) return text;
  }
  return "";
}

export function ownerSurfaceIdentityKeys(value: unknown): string[] {
  const text = ownerSurfaceSafeStr(value).toUpperCase();
  if (!text) return [];

  const keys = new Set<string>([text]);
  if (text.startsWith("GMFN-")) keys.add(`GSN-${text.slice(5)}`);
  if (text.startsWith("GSN-")) keys.add(`GMFN-${text.slice(4)}`);
  return Array.from(keys);
}

export function ownerSurfaceIdentityMatches(
  left: unknown,
  right: unknown
): boolean {
  const rightKeys = new Set(ownerSurfaceIdentityKeys(right));
  return ownerSurfaceIdentityKeys(left).some((key) => rightKeys.has(key));
}
