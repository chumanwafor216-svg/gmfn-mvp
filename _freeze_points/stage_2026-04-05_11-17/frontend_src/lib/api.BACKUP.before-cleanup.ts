const API_BASE_URL_RAW: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env &&
    (import.meta as any).env.VITE_API_BASE_URL) ||
  "/api";

const API_BASE_URL = String(API_BASE_URL_RAW || "").trim().replace(/\/+$/, "");

function buildUrl(path: string): string {
  const p = String(path || "").startsWith("/")
    ? String(path)
    : `/${String(path || "")}`;
  return `${API_BASE_URL}${p}`;
}

const ACCESS_TOKEN_KEY = "access_token";
const GMFN_SELECTED_CLAN_ID_KEY = "gmfn_selected_clan_id";

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(tok: string | null) {
  if (!tok) localStorage.removeItem(ACCESS_TOKEN_KEY);
  else localStorage.setItem(ACCESS_TOKEN_KEY, tok);
}

export function logout(): void {
  setAccessToken(null);
}

export function getSelectedClanId(): number | null {
  try {
    const raw = localStorage.getItem(GMFN_SELECTED_CLAN_ID_KEY);
    const n = Number(raw || "");
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setSelectedClanId(clanId: number | null): void {
  try {
    if (clanId == null) localStorage.removeItem(GMFN_SELECTED_CLAN_ID_KEY);
    else localStorage.setItem(GMFN_SELECTED_CLAN_ID_KEY, String(clanId));
  } catch {}
}

async function readTextSafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

export async function parseError(res: Response): Promise<string> {
  const text = await readTextSafe(res);
  try {
    const j = JSON.parse(text);
    return j?.detail || j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

function buildQuery(params: Record<string, any> | undefined | null): string {
  if (!params) return "";
  const q: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || String(v).trim() === "") continue;
    q.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }
  return q.length ? `?${q.join("&")}` : "";
}

async function httpJson(path: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/json" };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const clanId = getSelectedClanId();
  if (clanId) headers["X-Clan-Id"] = String(clanId);

  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await parseError(res));
  if (res.status === 204) return null;

  const txt = await readTextSafe(res);
  if (!txt) return null;

  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

async function httpForm(path: string, form: Record<string, any>): Promise<any> {
  const fd = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === null) continue;
    fd.set(k, String(v));
  }

  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: fd.toString(),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await res.json();
}

/* =========================
   AUTH
   ========================= */

export async function login(
  username: string,
  password: string
): Promise<{ access_token: string; token_type: string }> {
  return httpForm("/auth/login", {
    grant_type: "",
    username,
    password,
    scope: "",
    client_id: "",
    client_secret: "",
  });
}

export async function loginAndStore(username: string, password: string) {
  const out = await login(username, password);
  if (out?.access_token) {
    setAccessToken(out.access_token);
  }
  return out;
}

export async function getMe() {
  return httpJson("/auth/me", "GET");
}

export async function activateApprovedMember(payload: {
  gmfn_id: string;
  password: string;
}): Promise<any> {
  return httpJson("/auth/activate-approved-member", "POST", payload);
}

export async function getApprovedMemberStatus(gmfnId: string): Promise<any> {
  return httpJson(
    `/auth/approved-member/${encodeURIComponent(String(gmfnId))}`,
    "GET"
  );
}

export async function founderSignupWithInvite(payload: {
  invite_code: string;
  email: string;
  password: string;
  clan_name: string;
  clan_description?: string | null;
}): Promise<any> {
  return httpJson("/auth/signup-with-invite", "POST", payload);
}

/* =========================
   CLANS / COMMUNITY
   ========================= */

export async function listMyClans(): Promise<any> {
  return httpJson("/clans/me", "GET");
}

export async function getCurrentClan(): Promise<any> {
  const selectedClanId = getSelectedClanId();
  const res = await listMyClans().catch(() => ({ items: [] }));
  const rows = Array.isArray(res) ? res : res?.items || [];

  if (!rows.length) return null;

  if (selectedClanId) {
    const match = rows.find(
      (x: any) => Number(x?.id || x?.clan_id || 0) === Number(selectedClanId)
    );
    if (match) return match;
  }

  return rows[0] || null;
}

export async function createClan(payload: {
  name: string;
  description?: string | null;
  country?: string | null;
  marketplace_name?: string | null;
  marketplace_description?: string | null;
}): Promise<any> {
  return httpJson("/clans/", "POST", payload);
}

export async function selectClan(clanId: number): Promise<any> {
  setSelectedClanId(clanId);
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/select`,
    "POST"
  );
}

export async function devBootstrapClan(): Promise<any> {
  return httpJson("/clans/dev/bootstrap", "POST");
}

export async function getClanInviteLink(clanId: number): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/invite-link`,
    "GET"
  );
}

export async function listClanMembers(clanId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members`, "GET");
}

export async function submitJoinRequest(payload: {
  invite_code: string;
  first_name: string;
  surname: string;
  phone_e164: string;
  country: string;
  business_name?: string | null;
  note?: string | null;
}): Promise<any> {
  return httpJson("/clans/join-requests", "POST", payload);
}

export async function listJoinRequests(clanId: number): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests`,
    "GET"
  );
}

export async function getInvitePreview(code: string): Promise<any> {
  return httpJson(
    `/invites/preview/${encodeURIComponent(String(code))}`,
    "GET"
  );
}

export async function voteJoinRequest(
  clanId: number,
  joinRequestId: number,
  vote: "approve" | "reject"
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests/${encodeURIComponent(
      String(joinRequestId)
    )}/vote`,
    "POST",
    { vote }
  );
}

/* =========================
   LOANS / POOL
   ========================= */

export async function listMyLoans(): Promise<any> {
  return httpJson("/loans", "GET");
}

export async function getLoan(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}`, "GET");
}

export async function getLoanSummary(loanId: number): Promise<any> {
  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/summary`,
    "GET"
  );
}

export async function repayLoan(
  loanId: number,
  payload: { amount: string; currency?: string | null; note?: string | null }
): Promise<any> {
  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/repayments`,
    "POST",
    payload
  );
}

export async function getPoolMe(
  currency: string = "NGN",
  limit: number = 20
): Promise<any> {
  return httpJson(`/pool/me${buildQuery({ currency, limit })}`, "GET");
}

export async function createPoolInstruction(payload: {
  clan_id: number;
  amount: string;
  currency?: string;
}): Promise<any> {
  return httpJson(
    `/payment-instructions/pool${buildQuery({
      clan_id: payload.clan_id,
      amount: payload.amount,
      currency: payload.currency || "NGN",
    })}`,
    "POST"
  );
}

export async function createLoanInstruction(payload: {
  clan_id: number;
  loan_id: number;
  amount: string;
  currency?: string;
}): Promise<any> {
  return httpJson(
    `/payment-instructions/loan${buildQuery({
      clan_id: payload.clan_id,
      loan_id: payload.loan_id,
      amount: payload.amount,
      currency: payload.currency || "NGN",
    })}`,
    "POST"
  );
}

export async function getLoanWithdrawalInstruction(
  loanId: number
): Promise<any> {
  return httpJson(
    `/withdrawal-instructions/loan/${encodeURIComponent(String(loanId))}`,
    "GET"
  );
}

/* =========================
   TRUST / IDENTITY / NOTIFICATIONS
   ========================= */

export async function getTrustScoreExplained(): Promise<any> {
  return httpJson("/trust/score/explained", "GET");
}

export async function getMyTrustSlip(): Promise<any> {
  return httpJson("/trust-slips/me", "GET");
}

export async function verifyTrustSlip(
  code: string,
  level?: "minimal" | "standard" | "detailed"
): Promise<any> {
  return httpJson(
    `/trust-slips/verify/${encodeURIComponent(String(code))}${buildQuery({
      level: level || undefined,
    })}`,
    "GET"
  );
}

export async function getTrustSlipShareBundle(
  code: string,
  level?: "minimal" | "standard" | "detailed"
): Promise<any> {
  return httpJson(
    `/trust-slips/${encodeURIComponent(String(code))}/share${buildQuery({
      level: level || undefined,
    })}`,
    "GET"
  );
}

export async function logTrustSlipRelease(
  code: string,
  payload: {
    supplier_name?: string | null;
    supplier_phone?: string | null;
    amount_released?: string | null;
    note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/trust-slips/${encodeURIComponent(String(code))}/release`,
    "POST",
    payload
  );
}

export async function observeIdentityRisk(
  clientFingerprint?: string
): Promise<any> {
  return {
    ok: true,
    detail: "Identity observation is disabled in temporary test mode.",
    client_fingerprint: clientFingerprint || null,
  };
}

export async function getMyIdentityRisk(): Promise<any> {
  return httpJson("/identity-risk/me", "GET");
}

export async function getAdminIdentityRisk(limit: number = 100): Promise<any> {
  return httpJson(`/identity-risk/admin${buildQuery({ limit })}`, "GET");
}

export async function getMyNotifications(
  limit: number = 50,
  unreadOnly: boolean = false
): Promise<any> {
  return httpJson(
    `/notifications/me${buildQuery({ limit, unread_only: unreadOnly })}`,
    "GET"
  );
}

export async function getMyUnreadNotificationCount(): Promise<any> {
  return httpJson("/notifications/me/unread-count", "GET");
}

export async function markNotificationRead(notificationId: number): Promise<any> {
  return httpJson(
    `/notifications/me/${encodeURIComponent(String(notificationId))}/read`,
    "POST"
  );
}

export async function seedAssistantNotifications(): Promise<any> {
  return httpJson("/notifications/me/seed-assistant", "POST");
}

/* =========================
   ADMIN / OPS / ANALYTICS
   ========================= */

export async function adminRecentTrustEvents(limit: number = 50): Promise<any> {
  return httpJson(`/admin/trust-events/recent${buildQuery({ limit })}`, "GET");
}

export async function getTrustEvents(params?: {
  clan_id?: number;
  user_id?: number;
  loan_id?: number;
  limit?: number;
}): Promise<any> {
  const limit = Number(params?.limit || 200);

  return httpJson(
    `/admin/trust-events/recent${buildQuery({
      limit,
      clan_id: params?.clan_id,
      user_id: params?.user_id,
      loan_id: params?.loan_id,
    })}`,
    "GET"
  );
}

export async function adminConfirmPoolEvent(
  eventId: number,
  note?: string
): Promise<any> {
  return httpJson(
    `/admin/pool/events/${encodeURIComponent(String(eventId))}/confirm${buildQuery({
      note,
    })}`,
    "POST"
  );
}

export async function getAdminTrustGraph(
  userId: string | number,
  opts?: { include_clans?: boolean; limit_events?: number }
): Promise<any> {
  return httpJson(
    `/admin/trust-graph/${encodeURIComponent(String(userId))}${buildQuery({
      include_clans: opts?.include_clans ?? true,
      limit_events: opts?.limit_events ?? 500,
    })}`,
    "GET"
  );
}

export async function getExposureAdmin(): Promise<any> {
  return httpJson("/exposure/admin", "GET");
}

export async function getRevenueAllocation(loanId: number): Promise<any> {
  return httpJson(
    `/revenue-allocation/loan/${encodeURIComponent(String(loanId))}`,
    "GET"
  );
}

export async function getMyGuarantorEarnings(
  limit: number = 100
): Promise<any> {
  return httpJson(`/guarantor-earnings/me${buildQuery({ limit })}`, "GET");
}

export async function getSettlementConfig(): Promise<any> {
  return httpJson("/settlement-config", "GET");
}

export async function getPaymentRails(): Promise<any> {
  return httpJson("/payment-rails", "GET");
}

export async function getPublicConfig(): Promise<any> {
  return httpJson("/public/config", "GET");
}

export async function getSystemHealth(): Promise<any> {
  return httpJson("/system-health", "GET");
}

export async function getProtocolStatus(): Promise<any> {
  return httpJson("/protocol-status", "GET");
}

export async function getPilotReadiness(): Promise<any> {
  return httpJson("/pilot-readiness", "GET");
}

/* =========================
   BANK / RECONCILIATION
   ========================= */

export async function bankIngestEvent(payload: {
  clan_id: number;
  amount: string;
  currency?: string;
  direction: "credit" | "debit";
  reference?: string | null;
  description?: string | null;
}): Promise<any> {
  return httpJson(
    `/bank/ingest${buildQuery({
      clan_id: payload.clan_id,
      amount: payload.amount,
      currency: payload.currency || "NGN",
      direction: payload.direction,
      reference: payload.reference ?? undefined,
      description: payload.description ?? undefined,
    })}`,
    "POST"
  );
}

export async function listRecentBankEvents(clanId: number): Promise<any> {
  return httpJson(`/bank/recent${buildQuery({ clan_id: clanId })}`, "GET");
}

export async function listUnmatchedBankEvents(clanId: number): Promise<any> {
  return httpJson(`/bank/unmatched${buildQuery({ clan_id: clanId })}`, "GET");
}

export async function listBankCredits(payload: {
  clan_id: number;
  user_id?: number;
  currency?: string;
}): Promise<any> {
  return httpJson(
    `/bank/credits${buildQuery({
      clan_id: payload.clan_id,
      user_id: payload.user_id,
      currency: payload.currency,
    })}`,
    "GET"
  );
}

export async function listExpectedPayments(_payload?: any): Promise<any> {
  return {
    items: [],
    total: 0,
    detail: "Expected payments listing is not enabled in this frontend build.",
  };
}

export async function runBankReconciliation(payload: {
  clan_id: number;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/bank/reconcile${buildQuery({
      clan_id: payload.clan_id,
      limit: payload.limit ?? 200,
    })}`,
    "POST"
  );
}

/* =========================
   MARKETPLACE
   ========================= */

export async function createMarketplaceShop(payload: {
  clan_id?: number | null;
  name: string;
  description?: string | null;
  whatsapp_number?: string | null;
  telegram_handle?: string | null;
}): Promise<any> {
  return httpJson("/marketplace/shops", "POST", payload);
}

export async function getMarketplaceShops(params?: {
  clan_id?: number | null;
  only_active?: boolean;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/marketplace/shops${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      only_active: params?.only_active ?? true,
      limit: params?.limit ?? 50,
    })}`,
    "GET"
  );
}

export async function getMarketplaceShopByGmfnId(
  gmfnId: string,
  params?: {
    clan_id?: number | null;
  }
): Promise<any> {
  return httpJson(
    `/marketplace/shops/by-gmfn/${encodeURIComponent(String(gmfnId))}${buildQuery({
      clan_id: params?.clan_id ?? undefined,
    })}`,
    "GET"
  );
}

export async function createMarketplaceProduct(payload: {
  clan_id?: number | null;
  shop_id: number;
  name: string;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  video_url?: string | null;
}): Promise<any> {
  return httpJson("/marketplace/products", "POST", payload);
}

export async function getMarketplaceProducts(params?: {
  clan_id?: number | null;
  shop_id?: number | null;
  only_active?: boolean;
  include_reposted?: boolean;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/marketplace/products${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      shop_id: params?.shop_id ?? undefined,
      only_active: params?.only_active ?? true,
      include_reposted: params?.include_reposted ?? true,
      limit: params?.limit ?? 100,
    })}`,
    "GET"
  );
}

export async function createMarketplaceBroadcast(payload: {
  clan_id?: number | null;
  message: string;
  image_url?: string | null;
  expires_at?: string | null;
}): Promise<any> {
  return httpJson("/marketplace/broadcasts", "POST", payload);
}

export async function getMarketplaceBroadcasts(params?: {
  clan_id?: number | null;
  active_only?: boolean;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/marketplace/broadcasts${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      active_only: params?.active_only ?? true,
      limit: params?.limit ?? 100,
    })}`,
    "GET"
  );
}

export async function createMarketplaceFeed(payload: {
  clan_id?: number | null;
  message: string;
  image_url?: string | null;
  expires_at?: string | null;
}): Promise<any> {
  return createMarketplaceBroadcast(payload);
}

export async function getMarketplaceFeed(params?: {
  clan_id?: number | null;
  active_only?: boolean;
  limit?: number;
}): Promise<any> {
  return getMarketplaceBroadcasts(params);
}

export async function createMarketplaceRepost(payload: {
  product_id: number;
  target_clan_id: number;
}): Promise<any> {
  return httpJson(
    `/marketplace/products/${encodeURIComponent(String(payload.product_id))}/repost`,
    "POST",
    { target_clan_id: payload.target_clan_id }
  );
}

export async function getMarketplaceProductReposts(
  productId: number
): Promise<any> {
  return httpJson(
    `/marketplace/products/${encodeURIComponent(String(productId))}/reposts`,
    "GET"
  );
}

export async function createMarketplaceReview(_payload: {
  clan_id?: number | null;
  product_id?: number | null;
  shop_id?: number | null;
  rating: number;
  review_text?: string | null;
}): Promise<any> {
  return {
    ok: false,
    detail: "Marketplace review endpoint is not enabled in the backend yet.",
  };
}

/* =========================
   LIGHTWEIGHT INSIGHT
   ========================= */

export async function getDailyInsight(): Promise<any> {
  return {
    text: "Stay consistent. Small positive actions strengthen long-term trust.",
  };
}

/* =========================
   UTIL
   ========================= */

export function safeCopy(text: string): void {
  const t = String(text || "").trim();
  if (!t) return;

  if ((navigator as any)?.clipboard?.writeText) {
    (navigator as any).clipboard.writeText(t).catch(() => tryLegacyCopy(t));
    return;
  }

  tryLegacyCopy(t);
}

function tryLegacyCopy(text: string) {
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.left = "-9999px";
    ta.style.top = "-9999px";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
    } catch {}
    ta.remove();
  } catch {}
}

/* =========================
   BEHAVIOUR / TRUST COMMAND CENTRE
   ========================= */

export async function getBehaviourMetrics(userId: number): Promise<any> {
  return httpJson(
    `/admin/behaviour/metrics/${encodeURIComponent(String(userId))}`,
    "GET"
  );
}

/* =========================
   TRUST COMMAND CENTRE / ADMIN ANALYTICS
   ========================= */

export async function getAdminTrustWhy(userId: number): Promise<any> {
  return httpJson(
    `/admin/trust/why/${encodeURIComponent(String(userId))}`,
    "GET"
  );
}

export async function getAdminTrustEvidenceSnapshot(
  userId: number
): Promise<any> {
  return httpJson(
    `/admin/trust/evidence/${encodeURIComponent(String(userId))}`,
    "GET"
  );
}

export async function getAdminTrustRecompute(userId: number): Promise<any> {
  return httpJson(
    `/admin/trust/recompute/${encodeURIComponent(String(userId))}`,
    "GET"
  );
}

export async function applyAdminTrustRecompute(userId: number): Promise<any> {
  return httpJson(
    `/admin/trust/recompute/${encodeURIComponent(String(userId))}/apply`,
    "POST"
  );
}

export async function getTrustWhyMe(): Promise<any> {
  return httpJson("/trust/me/why", "GET");
}

export async function getTrustWhyUser(userId: number): Promise<any> {
  return httpJson(
    `/trust/why/${encodeURIComponent(String(userId))}`,
    "GET"
  );
}

export async function deleteMarketplaceBroadcast(
  broadcastId: number
): Promise<any> {
  return httpJson(
    `/marketplace/broadcasts/${encodeURIComponent(String(broadcastId))}`,
    "DELETE"
  );
}

export async function uploadMarketplaceImageFile(
  file: File,
  clanId?: number | null
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  if (clanId) fd.append("clan_id", String(clanId));

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const selectedClanId = getSelectedClanId();
  if (selectedClanId) headers["X-Clan-Id"] = String(selectedClanId);

  const res = await fetch(buildUrl("/marketplace/media/image"), {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await res.json();
}

export async function uploadMarketplaceVideoFile(
  file: File,
  durationSeconds?: number | null,
  clanId?: number | null
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  if (durationSeconds != null) {
    fd.append("duration_seconds", String(durationSeconds));
  }
  if (clanId) fd.append("clan_id", String(clanId));

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const selectedClanId = getSelectedClanId();
  if (selectedClanId) headers["X-Clan-Id"] = String(selectedClanId);

  const res = await fetch(buildUrl("/marketplace/media/video"), {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await res.json();
}

export async function getJoinApprovalStatus(requestId: number | string) {
  return httpJson(
    `/clans/join-requests/${encodeURIComponent(String(requestId))}/status`,
    "GET"
  );
}
export async function getCommunityJoinRequests(clanId: number): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests`,
    "GET"
  );
}

export async function voteOnJoinRequest(
  id: number,
  vote: "approve" | "reject"
): Promise<any> {
  const clanId = getSelectedClanId();

  if (!clanId) {
    throw new Error("No selected community");
  }

  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests/${encodeURIComponent(
      String(id)
    )}/vote`,
    "POST",
    { vote }
  );
}