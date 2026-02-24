// frontend/src/lib/api.ts
// GMFN Frontend API client (Swagger-aligned, stable exports + backward-compat aliases)

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [k: string]: JsonValue }
  | JsonValue[];

const ACCESS_TOKEN_KEY = "access_token";

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
export const logoutAndClear = logout;

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
    if (typeof j?.detail === "string") return j.detail;
    if (Array.isArray(j?.detail)) return JSON.stringify(j.detail, null, 2);
    return j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

function buildQuery(params: Record<string, any> | undefined | null): string {
  if (!params) return "";
  const q: string[] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    const sv = String(v).trim();
    if (!sv) continue;
    q.push(`${encodeURIComponent(k)}=${encodeURIComponent(sv)}`);
  }
  return q.length ? `?${q.join("&")}` : "";
}

/* ===============================
   SELECTED CLAN (localStorage)
   =============================== */
const GMFN_SELECTED_CLAN_ID_KEY = "gmfn_selected_clan_id";

export function getSelectedClanId(): number | null {
  try {
    const raw = localStorage.getItem(GMFN_SELECTED_CLAN_ID_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setSelectedClanId(clanId: number | null): void {
  try {
    if (clanId == null) {
      localStorage.removeItem(GMFN_SELECTED_CLAN_ID_KEY);
      return;
    }
    const n = Number(clanId);
    if (!Number.isFinite(n) || n <= 0) {
      localStorage.removeItem(GMFN_SELECTED_CLAN_ID_KEY);
      return;
    }
    localStorage.setItem(GMFN_SELECTED_CLAN_ID_KEY, String(n));
  } catch {
    // ignore
  }
}

export function clearSelectedClanId(): void {
  try {
    localStorage.removeItem(GMFN_SELECTED_CLAN_ID_KEY);
  } catch {
    // ignore
  }
}

/* ===============================
   HTTP Helpers (relative URLs; Vite proxy can be used)
   =============================== */
async function httpJson(path: string, method: string, body?: any): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/json" };

  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (!isForm && body !== undefined) headers["Content-Type"] = "application/json";

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const clanId = getSelectedClanId();
  if (clanId) headers["X-Clan-Id"] = String(clanId);

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
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

async function httpBlob(path: string, method: string, body?: any): Promise<Blob> {
  const headers: Record<string, string> = {};
  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const clanId = getSelectedClanId();
  if (clanId) headers["X-Clan-Id"] = String(clanId);

  const res = await fetch(path, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await parseError(res));
  return await res.blob();
}

async function httpForm(path: string, form: Record<string, any>): Promise<any> {
  const fd = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === null) continue;
    fd.set(k, String(v));
  }

  const res = await fetch(path, {
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
   AUTH (Swagger /auth/*)
   ========================= */
export async function register(email: string, password: string): Promise<any> {
  return httpJson("/auth/register", "POST", { email, password });
}

export async function login(username: string, password: string): Promise<{ access_token: string; token_type: string }> {
  return httpForm("/auth/login", {
    grant_type: "",
    username,
    password,
    scope: "",
    client_id: "",
    client_secret: "",
  });
}

export async function loginAndStore(username: string, password: string): Promise<string> {
  const res = await login(username, password);
  const tok = res?.access_token || "";
  setAccessToken(tok || null);
  return tok;
}

export async function getMe(): Promise<any> {
  return httpJson("/auth/me", "GET");
}

/* =========================
   DEV (Swagger /auth/dev/create-user)
   ========================= */
export async function devCreateUser(payload: { email: string; password: string; role?: string | null }): Promise<any> {
  return httpJson("/auth/dev/create-user", "POST", payload);
}

/* =========================
   CLANS (Swagger /clans/*)
   ========================= */
export async function devBootstrapClan(): Promise<any> {
  return httpJson("/clans/dev/bootstrap", "POST");
}

export async function listMyClans(): Promise<any> {
  return httpJson("/clans/me", "GET");
}

export async function getCurrentClan(): Promise<any> {
  return httpJson("/clans/current", "GET");
}

export async function createClan(payload: { name: string; description?: string | null; country?: string | null }): Promise<any> {
  // Swagger: POST /clans/
  return httpJson("/clans/", "POST", payload);
}

export async function selectClan(clanId: number): Promise<any> {
  setSelectedClanId(clanId);
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/select`, "POST");
}

export async function leaveClan(clanId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/leave`, "DELETE");
}

export async function listClanMembers(clanId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members`, "GET");
}

export async function addMemberToClan(clanId: number, payload: { user_id: number }): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members`, "POST", payload);
}

export async function removeMemberFromClan(clanId: number, userId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members/${encodeURIComponent(String(userId))}`, "DELETE");
}

export async function toggleMemberRole(clanId: number, userId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members/${encodeURIComponent(String(userId))}/toggle-role`, "POST");
}

// legacy pool setters (still exist)
export async function patchMemberPoolBalanceCompat(clanId: number, userId: number, amount: string): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members/${encodeURIComponent(String(userId))}/pool`, "PATCH", { amount });
}
export async function setMemberPoolBalance(clanId: number, payload: { user_id: number; amount: string }): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/members/pool/set`, "POST", payload);
}
export const setMemberPoolBalanceCompat = patchMemberPoolBalanceCompat;

// invite flow
export async function createInvite(clanId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/invite`, "POST");
}
export const createClanInvite = createInvite;

export async function getClanInviteLink(clanId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/invite-link`, "GET");
}

export async function getInviteSettings(clanId: number): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/invite/settings`, "GET");
}
export async function updateInviteSettings(clanId: number, payload: any): Promise<any> {
  return httpJson(`/clans/${encodeURIComponent(String(clanId))}/invite/settings`, "PATCH", payload);
}

// join-by-invite (Swagger: POST /clans/join-by-invite)
export async function joinByInvite(code: string): Promise<any> {
  return httpJson(`/clans/join-by-invite`, "POST", { code });
}

/* =========================
   INVITES (Swagger /invites/*) – keep for compatibility
   ========================= */
export async function getClanInvites(clanId: number): Promise<any> {
  return httpJson(`/invites/clans/${encodeURIComponent(String(clanId))}`, "GET");
}
export async function getShareLink(code: string): Promise<any> {
  return httpJson(`/invites/share/${encodeURIComponent(code)}`, "GET");
}
export async function getInvitePreview(code: string): Promise<any> {
  return httpJson(`/invites/preview/${encodeURIComponent(code)}`, "GET");
}
export async function joinByInviteLegacy(code: string): Promise<any> {
  return httpJson(`/invites/join`, "POST", { code });
}
export async function revokeInvite(code: string): Promise<any> {
  return httpJson(`/invites/revoke/${encodeURIComponent(code)}`, "POST");
}

/* =========================
   LOANS (Swagger /loans/*)
   ========================= */
export async function listMyLoans(): Promise<any> {
  return httpJson("/loans", "GET");
}
export async function getLoan(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}`, "GET");
}
export async function createLoan(payload: { clan_id: number; amount: string; currency: string; purpose?: string | null }): Promise<any> {
  return httpJson("/loans", "POST", payload);
}
export async function cancelLoan(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/cancel`, "POST");
}
export async function repayLoan(loanId: number, payload: { amount: string; currency?: string | null; note?: string | null }): Promise<any> {
  // Swagger expects RepayLoan schema; keep amount as string
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/repayments`, "POST", payload);
}
export async function getRepayments(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/repayments`, "GET");
}
export async function getLoanSummary(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/summary`, "GET");
}
export async function getTrustSlipPreview(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/trustslip_preview`, "GET");
}

// guarantors
export async function createLoanGuarantor(loanId: number, payload: { guarantor_user_id: number; pledge_amount: string; note?: string | null }): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/guarantors`, "POST", payload);
}
export async function getLoanGuarantors(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/guarantors`, "GET");
}
export async function getGuarantorSuggestions(loanId: number): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/guarantors/suggestions`, "GET");
}
export async function decideLoanGuarantor(
  loanId: number,
  guarantorId: number,
  payload: { status: "approved" | "declined"; reason?: string | null; note?: string | null }
): Promise<any> {
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/guarantors/${encodeURIComponent(String(guarantorId))}`, "PATCH", payload);
}
// Decide incoming guarantor request (compat export for LoansPage)
export async function decideLoanGuarantorRequest(
  loanId: number,
  guarantorId: number,
  payload: {
    status: "approved" | "declined";
    reason?: string | null;
    note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/guarantors/${encodeURIComponent(
      String(guarantorId)
    )}`,
    "PATCH",
    payload
  );
} 

// Alias expected by LoansPage.tsx
export const decideIncomingGuarantorRequest = decideLoanGuarantor;

// inbox
export async function getGuarantorInbox(status: string = "pending", limit: number = 50): Promise<any> {
  const q = buildQuery({ status, limit });
  return httpJson(`/loans/guarantors/inbox${q}`, "GET");
}
// Alias expected by LoansPage.tsx
export const listIncomingGuarantorRequests = getGuarantorInbox;
/* evidence snapshot */
export async function getLoanEvidenceSnapshot(loanId: number, limit_events: number = 25): Promise<any> {
  const q = buildQuery({ limit_events });
  return httpJson(`/loans/${encodeURIComponent(String(loanId))}/evidence-snapshot${q}`, "GET");
}

/* =========================
   POOL (Swagger /pool/*)
   ========================= */
export async function getPoolMe(currency: string = "NGN", limit: number = 20): Promise<any> {
  const q = buildQuery({ currency, limit });
  return httpJson(`/pool/me${q}`, "GET");
}
export async function requestPoolDeposit(payload: { amount: string; currency?: string; note?: string | null }): Promise<any> {
  return httpJson("/pool/deposits/request", "POST", { amount: String(payload.amount), currency: payload.currency || "NGN", note: payload.note ?? null });
}
export async function requestPoolWithdrawal(payload: { amount: string; currency?: string; note?: string | null }): Promise<any> {
  return httpJson("/pool/withdrawals/request", "POST", { amount: String(payload.amount), currency: payload.currency || "NGN", note: payload.note ?? null });
}

/* =========================
   ADMIN (Swagger /admin/*)
   ========================= */
export async function adminRecentTrustEvents(limit: number = 50): Promise<any> {
  const q = buildQuery({ limit });
  return httpJson(`/admin/trust-events/recent${q}`, "GET");
}
export async function adminManualTrustEvent(qs: Record<string, any>): Promise<any> {
  const q = buildQuery(qs);
  return httpJson(`/admin/trust-events/manual${q}`, "POST");
}
export async function adminPoolPending(limit: number = 50): Promise<any> {
  const q = buildQuery({ limit });
  return httpJson(`/admin/pool/pending${q}`, "GET");
}
export async function adminConfirmPoolEvent(eventId: number, note?: string): Promise<any> {
  const q = buildQuery({ note: note ?? undefined });
  return httpJson(`/admin/pool/events/${encodeURIComponent(String(eventId))}/confirm${q}`, "POST");
}

/* =========================
   TRUST (Swagger /trust/*)
   ========================= */
export async function getTrustScoreExplained(): Promise<any> {
  return httpJson("/trust/score/explained", "GET");
}
export async function getTrustLatestSource(): Promise<any> {
  return httpJson("/trust/me/latest-source", "GET");
}
export async function getTrustWhyMe(limit?: number): Promise<any> {
  const q = buildQuery({ limit: limit ?? undefined });
  return httpJson(`/trust/me/why${q}`, "GET");
}
export async function getTrustWhyUser(userId: number, limit?: number): Promise<any> {
  const q = buildQuery({ limit: limit ?? undefined });
  return httpJson(`/trust/why/${encodeURIComponent(String(userId))}${q}`, "GET");
}
export async function downloadMyTrustTimelinePdf(limit = 50): Promise<Blob> {
  const q = buildQuery({ limit });
  return httpBlob(`/trust/me/timeline.pdf${q}`, "GET");
}
export async function downloadMyTrustTimelinePdfAlias(limit = 50): Promise<Blob> {
  const q = buildQuery({ limit });
  return httpBlob(`/trust/me/trust-timeline.pdf${q}`, "GET");
}
export async function trustMe(): Promise<any> {
  return httpJson("/trust/me", "GET");
}

/* =========================
   TRUST EVENTS (Swagger /trust-events/me)
   ========================= */
export type TrustEventsQuery = {
  limit?: number;
  clan_id?: number;
  loan_id?: number;
  actor_user_id?: number;
  subject_user_id?: number;
  event_type?: string;
};
export async function getTrustEvents(arg: number | TrustEventsQuery = 50): Promise<any> {
  const qObj: TrustEventsQuery =
    typeof arg === "number"
      ? { limit: Math.max(1, Math.min(Number(arg || 50), 200)) }
      : { ...arg, limit: Math.max(1, Math.min(Number(arg.limit || 50), 200)) };

  // Backend /trust-events/me supports at least limit; extra filters are safe (ignored if not implemented)
  const q = buildQuery({
    limit: qObj.limit,
    clan_id: qObj.clan_id,
    loan_id: qObj.loan_id,
    actor_user_id: qObj.actor_user_id,
    subject_user_id: qObj.subject_user_id,
    event_type: qObj.event_type,
  });

  return httpJson(`/trust-events/me${q}`, "GET");
}

// Back-compat alias

export const listTrustEvents = getTrustEvents;

/* =========================
   TRUST SLIPS (Swagger /trust-slips/*)
   ========================= */
export async function getMyTrustSlip(): Promise<any> {
  return httpJson("/trust-slips/me", "GET");
}
export async function getMyTrustSlipSummary(): Promise<any> {
  return httpJson("/trust-slips/me/summary", "GET");
}

// Share bundle (merchant link generator) – derived from /trust-slips/me/summary -> code -> /trust-slips/{code}/share
export async function getMerchantLink(): Promise<any> {
  const s = await getMyTrustSlipSummary();
  const code = String(s?.code || "").trim();
  if (!code) return { ok: false, detail: "No TrustSlip code found for current user." };
  return httpJson(`/trust-slips/${encodeURIComponent(code)}/share`, "GET");
}

// Merchant release logging
export async function postMerchantRelease(payload: { token: string; goods_value: string; currency: string; merchant_note?: string }): Promise<any> {
  const code = String(payload.token || "").trim();
  if (!code) throw new Error("Missing TrustSlip code/token");
  return httpJson(`/trust-slips/${encodeURIComponent(code)}/release`, "POST", {
    goods_value: String(payload.goods_value),
    currency: payload.currency || "NGN",
    merchant_note: payload.merchant_note || "",
  });
}

// Evidence pack
export async function getEvidencePackMeta(): Promise<any> {
  return httpJson("/trust/me/evidence-pack/meta", "GET");
}
export async function downloadEvidencePackZip(): Promise<Blob> {
  return httpBlob("/trust/me/evidence-pack.zip", "GET");
}

/* =========================
   EXPOSURE / ANALYTICS / PUBLIC / MERCHANT
   ========================= */
export async function getExposureAdmin(): Promise<any> {
  return httpJson("/exposure/admin", "GET");
}
export async function getCciScore(clanId: number, userId: number): Promise<any> {
  const q = buildQuery({ clan_id: clanId, user_id: userId });
  return httpJson(`/exposure/admin/cci-scores${q}`, "GET");
} 

export async function getClanLiquidity(): Promise<any> {
  return httpJson("/analytics/clan-liquidity", "GET");
}
export async function getPublicConfig(): Promise<any> {
  return httpJson("/public/config", "GET");
}
export async function getMerchantRisk(userId: number): Promise<any> {
  return httpJson(`/merchant/risk/${encodeURIComponent(String(userId))}`, "GET");
}
export async function getMyGuarantorExposure(): Promise<any> {
  return httpJson("/guarantors/exposure/me", "GET");
}
export async function runGuarantorExpiryNow(clanId: number, hours: number): Promise<any> {
  // Pilot-safe stub: endpoint not present in current Swagger list.
  // Keeps admin UI from crashing. Implement real endpoint later if needed.
  return {
    ok: false,
    detail: "Guarantor expiry scan is not enabled in this build.",
    clan_id: Number(clanId),
    hours: Number(hours),
  };
}
export async function downloadMyTrustSlipEvidencePdf(): Promise<Blob> {
  try {
    return await httpBlob("/trust/me/timeline.pdf", "GET");
  } catch {
    return await httpBlob("/trust/me/trust-timeline.pdf", "GET");
  }
}
export const downloadTrustSlipEvidencePdf = downloadMyTrustSlipEvidencePdf;

// --- Compat: Merchant view (used by TrustSlipPage) ---
// There is no /merchant/me endpoint in current Swagger.
// We return TrustSlip summary as "merchant view context".
export async function getMyMerchantView(): Promise<any> {
  return getMyTrustSlipSummary();
}

// Setting merchant view is not supported in this build (keep UI stable).
export async function setMyMerchantView(_payload: any): Promise<any> {
  return { ok: false, detail: "Merchant visibility settings not enabled in this build." };
}

/* =========================
   SAFE COPY + Token extraction
   ========================= */
export function safeCopy(text: string): void {
  const t = (text || "").trim();
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

export function extractMerchantToken(input: string): string {
  const s = (input || "").trim();
  if (!s) return "";
  const markers = ["/t/", "/trust-slips/verify/"];
  for (const m of markers) {
    const idx = s.indexOf(m);
    if (idx >= 0) return s.substring(idx + m.length).trim();
  }
  return s;
}
/* =========================
   HARD GUARANTEE EXPORTS
   ========================= */

/**
 * listMyGuarantees
 * Stable export used by LoansPage.tsx
 * Uses Swagger endpoint:
 * GET /loans/guarantors/inbox
 */
export async function listMyGuarantees(limit: number = 200): Promise<any> {
  try {
    const res = await httpJson(`/loans/guarantors/inbox?limit=${limit}`, "GET");
    return res;
  } catch {
    return { items: [], total: 0 };
  }
}

/**
 * listIncomingGuarantorRequests
 */
