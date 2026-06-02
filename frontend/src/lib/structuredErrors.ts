export function structuredErrorDetail(err: unknown): Record<string, unknown> | null {
  const raw = String((err as { message?: unknown } | null | undefined)?.message ?? err ?? "").trim();
  if (!raw.startsWith("{") || !raw.endsWith("}")) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

export function structuredErrorMessage(err: unknown, fallback = ""): string {
  const detail = structuredErrorDetail(err);
  const message = String(detail?.message ?? "").trim();
  return message || String((err as { message?: unknown } | null | undefined)?.message ?? fallback).trim();
}
