export function positiveRouteId(value: unknown): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function communityIdFromSearch(search: string): number {
  const params = new URLSearchParams(search || "");
  return positiveRouteId(
    params.get("community") ||
      params.get("clan_id") ||
      params.get("community_id")
  );
}

export function withCommunityQuery(path: string, clanId: number): string {
  const target = String(path || "").trim();
  const safeClanId = positiveRouteId(clanId);
  if (!target || !safeClanId) return target;

  const [baseWithQuery, hash = ""] = target.split("#");
  const [pathname, search = ""] = baseWithQuery.split("?");
  const query = new URLSearchParams(search);
  if (!query.has("community") && !query.has("clan_id") && !query.has("community_id")) {
    query.set("community", String(safeClanId));
  }
  const nextSearch = query.toString();
  return `${pathname}${nextSearch ? `?${nextSearch}` : ""}${
    hash ? `#${hash}` : ""
  }`;
}
