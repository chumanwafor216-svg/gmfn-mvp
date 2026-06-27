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

export type MerchantReleaseInput = {
  token: string;
  goods_value: string;
  currency?: string;
  merchant_note?: string;
  trade_context?: string;
  item_title?: string;
  counterparty_label?: string;
  counterparty_whatsapp_label?: string;
  product_evidence_note?: string;
  invoice_reference?: string;
  invoice_evidence_note?: string;
  agreement_evidence_note?: string;
  courier_name?: string;
  courier_contact_label?: string;
  tracking_number?: string;
  released_to_courier_at?: string;
  expected_delivery_date?: string;
  payment_schedule_note?: string;
  receipt_status?: string;
};

export type MerchantReleaseResponse = {
  ok: boolean;
  release_recorded: boolean;
  release_event_id?: number;
  verification_link_id?: string | null;
  pack_id?: string | null;
  trade_packet_id?: string | null;
  trade_packet?: {
    trade_packet_id?: string | null;
    trade_context?: string;
    item_title?: string | null;
    counterparty_label?: string | null;
    counterparty_whatsapp_label?: string | null;
    product_evidence_note?: string | null;
    invoice_reference?: string | null;
    invoice_evidence_note?: string | null;
    agreement_evidence_note?: string | null;
    courier_name?: string | null;
    courier_contact_label?: string | null;
    tracking_number?: string | null;
    released_to_courier_at?: string | null;
    expected_delivery_date?: string | null;
    payment_schedule_note?: string | null;
    receipt_status?: string;
    evidence_slots?: Record<string, boolean>;
    conversation_system_of_record?: string;
    gsn_record_scope?: string;
    external_counterparty_supported?: boolean;
    redaction_reminder?: string;
  };
  goods_value: string;
  currency: string;
  token_used: boolean;
  token_was_already_used: boolean;
  evidence_boundary: string;
  message: string;
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
  const marker = "/trust-slips/merchant/verify/";
  const idx = v.indexOf(marker);
  if (idx >= 0) return v.slice(idx + marker.length);

  const legacyMarker = "/trust-slips/verify/";
  const legacyIdx = v.indexOf(legacyMarker);
  if (legacyIdx >= 0) return v.slice(legacyIdx + legacyMarker.length);

  return v.replace(/^\/+/, "");
}

export function merchantReleaseDeskPath(tokenOrUrl: string): string {
  const token = extractMerchantToken(tokenOrUrl);
  return token ? `/merchant-release/${encodeURIComponent(token)}` : "";
}

export async function verifyMerchantPublic(tokenOrUrl: string): Promise<MerchantVerifyPublicResponse> {
  const token = extractMerchantToken(tokenOrUrl);
  const res = await fetch(`/trust-slips/merchant/verify/${token}`, { method: "GET" });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MerchantVerifyPublicResponse;
}

export async function recordMerchantRelease(input: MerchantReleaseInput): Promise<MerchantReleaseResponse> {
  const token = extractMerchantToken(input.token);
  const res = await fetch("/api/merchant/releases", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      token,
      goods_value: input.goods_value,
      currency: input.currency || "NGN",
      merchant_note: input.merchant_note || null,
      trade_context: input.trade_context || "gsn_external",
      item_title: input.item_title || null,
      counterparty_label: input.counterparty_label || null,
      counterparty_whatsapp_label: input.counterparty_whatsapp_label || null,
      product_evidence_note: input.product_evidence_note || null,
      invoice_reference: input.invoice_reference || null,
      invoice_evidence_note: input.invoice_evidence_note || null,
      agreement_evidence_note: input.agreement_evidence_note || null,
      courier_name: input.courier_name || null,
      courier_contact_label: input.courier_contact_label || null,
      tracking_number: input.tracking_number || null,
      released_to_courier_at: input.released_to_courier_at || null,
      expected_delivery_date: input.expected_delivery_date || null,
      payment_schedule_note: input.payment_schedule_note || null,
      receipt_status: input.receipt_status || "awaiting_delivery",
    }),
  });
  if (!res.ok) throw new Error(await parseError(res));
  return (await res.json()) as MerchantReleaseResponse;
}
