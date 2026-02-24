// src/lib/merchantChannel.ts

export type MerchantLinkResponse = {
  ok: boolean;
  path: string;
  ttl_hours: number;
  verification_link_id: string;
  pack_id?: string | null;
  hint?: string;
};

export type MerchantVerifyPublicResponse = {
  verified: boolean;
  verification_link_id: string;
  pack_id?: string | null;
  level: string;
  expires_at: string;
  used: boolean;
  disclaimer: string;
  ask_for_pack_id_hint?: string;
};

function getToken(): string | null {
  return localStorage.getItem("access_token");
}

async function parseError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

async function authedGet<T>(path: string): Promise<T> {
  const token = getToken();
  if (!token) throw new Error("You are logged out. Please log in again.");

  const res = await fetch(path, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as T;
}

export async function getMerchantLink(ttlHours: number = 72, level: string = "standard"): Promise<MerchantLinkResponse> {
  const qs = new URLSearchParams({ ttl_hours: String(ttlHours), level });
  return authedGet<MerchantLinkResponse>(`/trust-slips/me/merchant-link?${qs.toString()}`);
}

export function extractMerchantToken(fullUrlOrToken: string): string {
  const v = (fullUrlOrToken || "").trim();
  if (!v) return "";
  const marker = "/trust-slips/verify/";
  const idx = v.indexOf(marker);
  if (idx >= 0) return v.slice(idx + marker.length);
  return v.replace(/^\/+/, "");
}

export async function verifyMerchantPublic(tokenOrUrl: string): Promise<MerchantVerifyPublicResponse> {
  const token = extractMerchantToken(tokenOrUrl);
  const res = await fetch(`/trust-slips/verify/${token}`, { method: "GET" });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MerchantVerifyPublicResponse;
}