type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : null;
}

export function structuredErrorDetail(err: unknown): UnknownRecord | null {
  const direct = asRecord(err);
  const directDetail = asRecord(direct?.detail);
  if (directDetail) return directDetail;

  const response = asRecord(direct?.response);
  const responseData = asRecord(response?.data);
  const responseDetail = asRecord(responseData?.detail);
  if (responseDetail) return responseDetail;

  const raw = String(direct?.message ?? err ?? "").trim();
  if (!raw.startsWith("{") || !raw.endsWith("}")) return null;

  try {
    const parsed = JSON.parse(raw);
    const parsedRecord = asRecord(parsed);
    if (!parsedRecord) return null;
    return asRecord(parsedRecord.detail) || parsedRecord;
  } catch {
    return null;
  }
}

export function structuredErrorMessage(err: unknown, fallback = ""): string {
  const detail = structuredErrorDetail(err);
  const message = String(detail?.message ?? "").trim();
  return (
    message ||
    String(
      (err as { message?: unknown } | null | undefined)?.message ?? fallback
    ).trim()
  );
}

export function marketplaceGovernanceErrorMessage(
  err: unknown,
  fallback = ""
): string {
  const detail = structuredErrorDetail(err);
  const code = String(detail?.code ?? "").trim().toLowerCase();

  if (code === "community_member_service_listings_disabled") {
    return (
      "This community has member service listings turned off. Ask a community admin to enable member service listings before creating a shop or listing."
    );
  }

  if (code === "community_listing_admin_approval_required") {
    return (
      "This community requires admin approval before member listings go live. GSN does not have a listing approval queue here yet, so ask an admin to create or approve the listing."
    );
  }

  return structuredErrorMessage(err, fallback);
}
