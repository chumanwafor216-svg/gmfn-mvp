const API_BASE_URL_RAW: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env &&
    (import.meta as any).env.VITE_API_BASE_URL) ||
  "/api";

const API_BASE_URL = String(API_BASE_URL_RAW || "")
  .trim()
  .replace(/\/+$/, "");

export type EntryMode =
  | "general"
  | "create"
  | "invite"
  | "approved"
  | "existing";

export type WelcomeIntent = "invited" | "founder" | "approved" | "existing";

type RequestOptions = {
  header_clan_id?: number | null;
  quiet?: boolean;
};

class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

function canUseStorage(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function readStorage(key: string): string | null {
  try {
    if (!canUseStorage()) return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (!canUseStorage()) return;

    if (value == null || String(value).trim() === "") {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, String(value));
  } catch {}
}

function buildUrl(path: string): string {
  const p = String(path || "").startsWith("/")
    ? String(path)
    : `/${String(path || "")}`;
  return `${API_BASE_URL}${p}`;
}

const ACCESS_TOKEN_KEY = "access_token";
const GMFN_SELECTED_CLAN_ID_KEY = "gmfn_selected_clan_id";
const GMFN_ENTRY_MODE_KEY = "gmfn_entry_mode";
const GMFN_ENTRY_INVITE_CODE_KEY = "gmfn_entry_invite_code";
const GMFN_ENTRY_CREATE_CODE_KEY = "gmfn_entry_create_code";
const GMFN_MY_SETTINGS_KEY = "gmfn_my_settings";

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function setAccessToken(tok: string | null) {
  writeStorage(ACCESS_TOKEN_KEY, tok);
}

export function isAuthenticated(): boolean {
  return Boolean(String(getAccessToken() || "").trim());
}

export function getSelectedClanId(): number | null {
  try {
    const raw = readStorage(GMFN_SELECTED_CLAN_ID_KEY);
    const n = Number(raw || "");
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

export function setSelectedClanId(clanId: number | null): void {
  try {
    if (clanId == null) writeStorage(GMFN_SELECTED_CLAN_ID_KEY, null);
    else writeStorage(GMFN_SELECTED_CLAN_ID_KEY, String(clanId));
  } catch {}
}

export function getEntryMode(): EntryMode | null {
  const raw = String(readStorage(GMFN_ENTRY_MODE_KEY) || "")
    .trim()
    .toLowerCase();

  if (
    raw === "general" ||
    raw === "create" ||
    raw === "invite" ||
    raw === "approved" ||
    raw === "existing"
  ) {
    return raw as EntryMode;
  }

  return null;
}

export function setEntryMode(mode: EntryMode | null): void {
  writeStorage(GMFN_ENTRY_MODE_KEY, mode);
}

export function clearEntryMode(): void {
  writeStorage(GMFN_ENTRY_MODE_KEY, null);
}

export function getInviteCode(): string | null {
  const raw = String(readStorage(GMFN_ENTRY_INVITE_CODE_KEY) || "").trim();
  return raw || null;
}

export function setInviteCode(code: string | null): void {
  writeStorage(GMFN_ENTRY_INVITE_CODE_KEY, code);
}

export function clearInviteCode(): void {
  writeStorage(GMFN_ENTRY_INVITE_CODE_KEY, null);
}

export function getCreateCode(): string | null {
  const raw = String(readStorage(GMFN_ENTRY_CREATE_CODE_KEY) || "").trim();
  return raw || null;
}

export function setCreateCode(code: string | null): void {
  writeStorage(GMFN_ENTRY_CREATE_CODE_KEY, code);
}

export function clearCreateCode(): void {
  writeStorage(GMFN_ENTRY_CREATE_CODE_KEY, null);
}

export function getInviteToken(): string | null {
  return getInviteCode();
}

export function setInviteToken(token: string | null): void {
  setInviteCode(token);
}

export function clearInviteToken(): void {
  clearInviteCode();
}

export function getCreateToken(): string | null {
  return getCreateCode();
}

export function setCreateToken(token: string | null): void {
  setCreateCode(token);
}

export function clearCreateToken(): void {
  clearCreateCode();
}

export function clearPublicEntryState(): void {
  clearEntryMode();
  clearInviteCode();
  clearCreateCode();
}

export function hasIssuedGmfnId(
  user: { gmfn_id?: string | null } | null | undefined
): boolean {
  return Boolean(String(user?.gmfn_id || "").trim());
}

export function logout(): void {
  setAccessToken(null);
  setSelectedClanId(null);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("gmfn_role");
    }
  } catch {
    // ignore storage cleanup issues during logout
  }
  clearPublicEntryState();
}

async function readTextSafe(res: Response): Promise<string> {
  try {
    return await res.text();
  } catch {
    return "";
  }
}

async function readJsonOrTextSafe(res: Response): Promise<any> {
  const txt = await readTextSafe(res);
  if (!txt) return null;

  try {
    return JSON.parse(txt);
  } catch {
    return txt;
  }
}

export async function parseError(res: Response): Promise<string> {
  const text = await readTextSafe(res);

  try {
    const j = JSON.parse(text);

    if (Array.isArray(j?.detail)) {
      const parts = j.detail
        .map((item: any) => {
          const loc = Array.isArray(item?.loc) ? item.loc.join(".") : "";
          const msg = String(item?.msg || item?.message || "").trim();
          return [loc, msg].filter(Boolean).join(": ");
        })
        .filter(Boolean);

      return parts.join(" | ") || text || `HTTP ${res.status}`;
    }

    if (j?.detail && typeof j.detail === "object") {
      return JSON.stringify(j.detail);
    }

    return String(j?.detail || j?.message || text || `HTTP ${res.status}`);
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

function buildQuery(params: Record<string, any> | undefined | null): string {
  if (!params) return "";
  const q: string[] = [];

  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) {
      for (const item of v) {
        if (item === undefined || item === null || String(item).trim() === "") {
          continue;
        }
        q.push(
          `${encodeURIComponent(k)}=${encodeURIComponent(String(item))}`
        );
      }
      continue;
    }

    if (v === undefined || v === null || String(v).trim() === "") continue;
    q.push(`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  }

  return q.length ? `?${q.join("&")}` : "";
}

function buildMarketplaceReadOptions(params?: {
  clan_id?: number | null;
  header_clan_id?: number | null;
}): RequestOptions | undefined {
  if (!params) return undefined;

  if (Object.prototype.hasOwnProperty.call(params, "header_clan_id")) {
    return { header_clan_id: params.header_clan_id ?? null };
  }

  if (Object.prototype.hasOwnProperty.call(params, "clan_id")) {
    return { header_clan_id: params.clan_id ?? null };
  }

  return undefined;
}

async function httpJson(
  path: string,
  method: string,
  body?: any,
  options?: RequestOptions
): Promise<any> {
  const headers: Record<string, string> = { Accept: "application/json" };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const hasExplicitHeaderClanId =
    !!options &&
    Object.prototype.hasOwnProperty.call(options, "header_clan_id");

  const effectiveHeaderClanId = hasExplicitHeaderClanId
    ? options?.header_clan_id ?? null
    : getSelectedClanId();

  if (
    effectiveHeaderClanId != null &&
    Number.isFinite(Number(effectiveHeaderClanId)) &&
    Number(effectiveHeaderClanId) > 0
  ) {
    headers["X-Clan-Id"] = String(effectiveHeaderClanId);
  }

  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(buildUrl(path), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!res.ok) {
    const message = await parseError(res);

    if (!options?.quiet) {
      console.error(`[API ${method} ${path}] ${res.status}: ${message}`);
    }

    throw new HttpStatusError(res.status, message);
  }

  if (res.status === 204) return null;
  return readJsonOrTextSafe(res);
}

async function httpJsonPaths(
  paths: string[],
  method: string,
  body?: any,
  options?: RequestOptions
): Promise<any> {
  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await httpJson(path, method, body, options);
    } catch (err) {
      lastError = err;

      if (
        err instanceof HttpStatusError &&
        (err.status === 404 || err.status === 405)
      ) {
        continue;
      }

      throw err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Request failed");
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

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return readJsonOrTextSafe(res);
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
  gmfn_id?: string | null;
  request_id?: string | number | null;
  password: string;
  confirm_password?: string | null;
}): Promise<any> {
  const cleaned: Record<string, any> = {
    password: String(payload?.password || ""),
  };

  const gmfnId = String(payload?.gmfn_id || "").trim().toUpperCase();
  const requestId =
    payload?.request_id == null ? "" : String(payload?.request_id).trim();
  const confirmPassword = String(payload?.confirm_password || "");

  if (gmfnId) cleaned.gmfn_id = gmfnId;
  if (requestId) cleaned.request_id = requestId;
  if (confirmPassword) cleaned.confirm_password = confirmPassword;

  if (!cleaned.gmfn_id && !cleaned.request_id) {
    throw new Error("gmfn_id or request_id is required");
  }

  const out = await httpJson("/auth/activate-approved-member", "POST", cleaned);
  if (out?.access_token) setAccessToken(out.access_token);
  return out;
}

export async function activateMembership(payload: {
  gmfn_id: string;
  password: string;
  confirm_password: string;
}) {
  const cleaned = {
    gmfn_id: String(payload?.gmfn_id || "").trim().toUpperCase(),
    password: String(payload?.password || ""),
    confirm_password: String(payload?.confirm_password || ""),
  };

  const out = await httpJsonPaths(
    ["/auth/activate-membership", "/entry/activate"],
    "POST",
    cleaned
  );

  if (out?.access_token) setAccessToken(out.access_token);
  return out;
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
  const out = await httpJson("/auth/signup-with-invite", "POST", payload);
  if (out?.access_token) setAccessToken(out.access_token);
  return out;
}

/* =========================
   PUBLIC GUIDE / ENTRY FLOW
   ========================= */

export async function getPublicGuide(): Promise<any> {
  try {
    return await httpJsonPaths(["/public/guide", "/guide"], "GET");
  } catch {
    return {
      title: "My GSN and I",
      detail:
        "No public guide API endpoint is enabled yet. Render this guide from the frontend page content.",
      sections: [],
    };
  }
}

export async function getEntryContext(params?: {
  mode?: EntryMode | string;
  code?: string | null;
  invite_code?: string | null;
  create_code?: string | null;
}): Promise<any> {
  const query = buildQuery({
    mode: params?.mode,
    code: params?.code,
    invite_code: params?.invite_code,
    create_code: params?.create_code,
  });

  try {
    return await httpJsonPaths(
      ["/entry/context" + query, "/public/entry/context" + query],
      "GET"
    );
  } catch {
    return {
      entry_mode: params?.mode || getEntryMode() || "general",
      invite_code: params?.invite_code || params?.code || getInviteCode(),
      create_code: params?.create_code || params?.code || getCreateCode(),
      guide_to: "/guide",
      login_to: "/login",
    };
  }
}

export async function createEntry(payload: Record<string, any>): Promise<any> {
  const out = await httpJsonPaths(
    ["/entry/create", "/auth/signup-with-invite"],
    "POST",
    payload
  );

  if (out?.access_token) setAccessToken(out.access_token);
  return out;
}

function detectBrowserLocale(): string | undefined {
  try {
    if (typeof navigator === "undefined") return undefined;
    const candidate =
      String((navigator as any)?.languages?.[0] || "") ||
      String((navigator as any)?.language || "");
    return candidate.trim() || undefined;
  } catch {
    return undefined;
  }
}

function detectBrowserTimezone(): string | undefined {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return String(tz || "").trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function startEntryPhoneVerification(payload: {
  display_name: string;
  phone_e164: string;
  email?: string | null;
}): Promise<any> {
    return httpJson("/entry/phone/start", "POST", {
      display_name: String(payload?.display_name || "").trim(),
      phone_e164: String(payload?.phone_e164 || "").trim(),
      email: String(payload?.email || "").trim() || undefined,
      browser_locale: detectBrowserLocale(),
      browser_timezone: detectBrowserTimezone(),
    });
  }

export async function confirmEntryPhoneVerification(payload: {
  verification_id: number | string;
  code: string;
}): Promise<any> {
  return httpJson("/entry/phone/confirm", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    code: String(payload?.code || "").trim(),
  });
}

export async function saveEntryBankDetails(payload: {
  verification_id: number | string;
  destination_name: string;
  bank_name: string;
  account_number: string;
  phone_number?: string | null;
  country?: string | null;
  currency?: string | null;
  note?: string | null;
  driver_licence_number?: string | null;
  driver_licence_country?: string | null;
  driver_licence_note?: string | null;
}): Promise<any> {
  return httpJson("/entry/bank-details", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    destination_name: String(payload?.destination_name || "").trim(),
    bank_name: String(payload?.bank_name || "").trim(),
    account_number: String(payload?.account_number || "").trim(),
    phone_number: String(payload?.phone_number || "").trim() || undefined,
    country: String(payload?.country || "").trim() || undefined,
    currency: String(payload?.currency || "").trim() || undefined,
    note: String(payload?.note || "").trim() || undefined,
    driver_licence_number:
      String(payload?.driver_licence_number || "").trim() || undefined,
    driver_licence_country:
      String(payload?.driver_licence_country || "").trim() || undefined,
    driver_licence_note:
      String(payload?.driver_licence_note || "").trim() || undefined,
  });
}

export async function verifyEntryBankDetails(payload: {
  verification_id: number | string;
  destination_name: string;
  bank_name: string;
  account_number: string;
  sort_code?: string | null;
  iban?: string | null;
  phone_number?: string | null;
  country?: string | null;
  currency?: string | null;
  note?: string | null;
}): Promise<any> {
  return httpJson("/entry/bank/verify", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    destination_name: String(payload?.destination_name || "").trim(),
    bank_name: String(payload?.bank_name || "").trim(),
    account_number: String(payload?.account_number || "").trim(),
    sort_code: String(payload?.sort_code || "").trim() || undefined,
    iban: String(payload?.iban || "").trim() || undefined,
    phone_number: String(payload?.phone_number || "").trim() || undefined,
    country: String(payload?.country || "").trim() || undefined,
    currency: String(payload?.currency || "").trim() || undefined,
    note: String(payload?.note || "").trim() || undefined,
  });
}

export async function verifyEntryDriversLicence(payload: {
  verification_id: number | string;
  licence_number: string;
  country: string;
  note?: string | null;
}): Promise<any> {
  return httpJson("/entry/licence/verify", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    licence_number: String(payload?.licence_number || "").trim(),
    country: String(payload?.country || "").trim(),
    note: String(payload?.note || "").trim() || undefined,
  });
}

export async function getEntryVerificationCheck(
  verificationCheckId: number | string
): Promise<any> {
  return httpJson(
    `/entry/verification/${encodeURIComponent(
      String(Number(verificationCheckId || 0))
    )}`,
    "GET"
  );
}

export async function submitJoinEntry(payload: Record<string, any>): Promise<any> {
  return httpJsonPaths(
    ["/entry/join", "/clans/join-requests"],
    "POST",
    payload
  );
}

export async function getPendingApprovalStatus(
  requestId?: number | string | null
): Promise<any> {
  const id = String(requestId ?? "").trim();

  if (!id) {
    return httpJsonPaths(["/entry/pending", "/pending-entry"], "GET");
  }

  return httpJsonPaths(
    [
      `/entry/pending/${encodeURIComponent(id)}`,
      `/clans/join-requests/${encodeURIComponent(id)}/status`,
    ],
    "GET"
  );
}

/* =========================
   CLANS / COMMUNITY
   ========================= */

export async function listMyClans(): Promise<any> {
  const res = await httpJson("/clans/me", "GET");
  const rows = Array.isArray(res) ? res : Array.isArray(res?.items) ? res.items : [];
  const normalizedRows = normalizeVisibleMyClans(rows);

  if (Array.isArray(res)) {
    return normalizedRows;
  }

  return {
    ...(res && typeof res === "object" ? res : {}),
    items: normalizedRows,
    total: normalizedRows.length,
  };
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

  const fallback = rows[0] || null;
  const fallbackId = Number(fallback?.id || fallback?.clan_id || 0);

  if (fallbackId > 0 && fallbackId !== Number(selectedClanId || 0)) {
    setSelectedClanId(fallbackId);
  }

  return fallback;
}

function normalizeVisibleMyClans(rows: any[]): any[] {
  if (!Array.isArray(rows)) return [];

  const realRows = rows.filter((row: any) => {
    const name = String(row?.name ?? row?.clan_name ?? "").trim().toLowerCase();
    return name !== "default clan" && name !== "gmfn default clan";
  });

  return realRows;
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
    "GET",
    undefined,
    { header_clan_id: clanId }
  );
}

export async function createClanInvite(clanId: number): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/invite`,
    "POST",
    undefined,
    { header_clan_id: clanId }
  );
}

export async function listClanMembers(clanId: number): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/members`,
    "GET",
    undefined,
    { header_clan_id: clanId }
  );
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

export async function getJoinInvitePreview(
  code: string,
  options?: {
    community_code?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/join-invite/preview${buildQuery({
      code,
      community_code: options?.community_code ?? undefined,
    })}`,
    "GET",
    undefined,
    { quiet: true }
  );
}

export async function listJoinRequests(clanId: number): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests`,
    "GET",
    undefined,
    { header_clan_id: clanId }
  );
}

export async function getJoinRequestStatus(requestId: number | string): Promise<any> {
  return httpJson(
    `/clans/join-requests/${encodeURIComponent(String(requestId))}/status`,
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
    { vote },
    { header_clan_id: clanId }
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

export async function createLoanRequest(payload: {
  clan_id?: number | null;
  amount: string | number;
  currency?: string | null;
  duration_days?: number | null;
  purpose?: string | null;
  note?: string | null;
}): Promise<any> {
  const effectiveClanId =
    payload?.clan_id === undefined ? getSelectedClanId() : payload?.clan_id;

  const cleaned: Record<string, any> = {
    amount: String(payload?.amount ?? "").trim(),
  };

  const clanId = Number(effectiveClanId || 0);
  const currency = String(payload?.currency || "").trim();
  const durationDays = Number(payload?.duration_days || 0);
  const purpose = String(payload?.purpose || "").trim();
  const note = String(payload?.note || "").trim();

  if (!cleaned.amount) {
    throw new Error("amount is required");
  }

  if (clanId > 0) {
    cleaned.clan_id = clanId;
    cleaned.community_id = clanId;
  }

  if (currency) {
    cleaned.currency = currency;
  }

  if (durationDays > 0) {
    cleaned.duration_days = durationDays;
    cleaned.term_days = durationDays;
    cleaned.duration = durationDays;
  }

  if (purpose) {
    cleaned.purpose = purpose;
    cleaned.title = purpose;
  }

  if (note) {
    cleaned.note = note;
  }

  const options =
    payload && Object.prototype.hasOwnProperty.call(payload, "clan_id")
      ? { header_clan_id: payload.clan_id ?? null }
      : undefined;

  return httpJsonPaths(
    [
      "/loans",
      "/loans/request",
      "/loan-requests",
      "/support/loans",
      "/support/loan-requests",
    ],
    "POST",
    cleaned,
    options
  );
}

export async function requestLoanGuarantor(payload: {
  loan_id: number;
  guarantor_user_id?: number | null;
  guarantor_gmfn_id?: string | null;
  note?: string | null;
}): Promise<any> {
  const loanId = Number(payload?.loan_id || 0);
  const guarantorUserId = Number(payload?.guarantor_user_id || 0);
  const guarantorGmfnId = String(payload?.guarantor_gmfn_id || "").trim();
  const note = String(payload?.note || "").trim();

  if (!loanId) {
    throw new Error("loan_id is required");
  }

  if (!guarantorUserId && !guarantorGmfnId) {
    throw new Error("guarantor_user_id or guarantor_gmfn_id is required");
  }

  const cleaned: Record<string, any> = {
    loan_id: loanId,
  };

  if (guarantorUserId > 0) {
    cleaned.guarantor_user_id = guarantorUserId;
    cleaned.user_id = guarantorUserId;
  }

  if (guarantorGmfnId) {
    cleaned.guarantor_gmfn_id = guarantorGmfnId;
    cleaned.gmfn_id = guarantorGmfnId;
  }

  if (note) {
    cleaned.note = note;
  }

  return httpJsonPaths(
    [
      `/loans/${encodeURIComponent(String(loanId))}/guarantors`,
      `/loans/${encodeURIComponent(String(loanId))}/guarantors/request`,
      `/loans/${encodeURIComponent(String(loanId))}/guarantor-requests`,
      "/loan-guarantor-requests",
      "/guarantor-requests",
    ],
    "POST",
    cleaned
  );
}

export async function getLoanSupportSuggestions(params?: {
  clan_id?: number | null;
  amount?: string | number | null;
  duration_days?: number | null;
  limit?: number;
}): Promise<any> {
  const effectiveClanId =
    params?.clan_id === undefined ? getSelectedClanId() : params?.clan_id;

  const durationDays = Number(params?.duration_days || 0);

  const query = buildQuery({
    clan_id: effectiveClanId ?? undefined,
    community_id: effectiveClanId ?? undefined,
    amount:
      params?.amount == null || String(params.amount).trim() === ""
        ? undefined
        : params.amount,
    duration_days: durationDays > 0 ? durationDays : undefined,
    term_days: durationDays > 0 ? durationDays : undefined,
    limit: params?.limit ?? 8,
  });

  return httpJsonPaths(
    [
      `/loans/suggestions${query}`,
      `/loan-suggestions${query}`,
      `/support/suggestions${query}`,
      `/support/loans/suggestions${query}`,
    ],
    "GET"
  );
}

export async function getPoolMe(
  currency: string = "NGN",
  limit: number = 20,
  options?: {
    clan_id?: number | null;
  }
): Promise<any> {
  const requestOptions =
    options && Object.prototype.hasOwnProperty.call(options, "clan_id")
      ? { header_clan_id: options.clan_id ?? null }
      : undefined;

  return httpJson(
    `/pool/me${buildQuery({ currency, limit })}`,
    "GET",
    undefined,
    requestOptions
  );
}

export async function getPoolMeSummary(currency: string = "NGN"): Promise<any> {
  return httpJson(
    `/pool/me/summary${buildQuery({ currency })}`,
    "GET"
  );
}

export async function createPoolInstruction(payload: {
  clan_id: number;
  amount: string;
  currency?: string;
}): Promise<any> {
  return httpJson(
    "/payment-instructions/pool",
    "POST",
    {
      clan_id: payload.clan_id,
      amount: payload.amount,
      currency: payload.currency || "NGN",
    },
    { header_clan_id: payload.clan_id }
  );
}

export async function createLoanInstruction(payload: {
  clan_id: number;
  loan_id: number;
  amount: string;
  currency?: string;
}): Promise<any> {
  return httpJson(
    "/payment-instructions/loan",
    "POST",
    {
      clan_id: payload.clan_id,
      loan_id: payload.loan_id,
      amount: payload.amount,
      currency: payload.currency || "NGN",
    },
    { header_clan_id: payload.clan_id }
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

export async function addLoanGuarantorRequest(payload: {
  loan_id: number;
  guarantor_user_id: number;
  pledge_amount: string | number;
  clan_id?: number | null;
}): Promise<any> {
  const loanId = Number(payload?.loan_id || 0);
  const guarantorUserId = Number(payload?.guarantor_user_id || 0);
  const pledgeAmount = String(payload?.pledge_amount ?? "").trim();

  if (!loanId) {
    throw new Error("loan_id is required");
  }

  if (!guarantorUserId) {
    throw new Error("guarantor_user_id is required");
  }

  if (!pledgeAmount) {
    throw new Error("pledge_amount is required");
  }

  const options =
    payload && Object.prototype.hasOwnProperty.call(payload, "clan_id")
      ? { header_clan_id: payload.clan_id ?? null }
      : undefined;

  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/guarantors`,
    "POST",
    {
      guarantor_user_id: guarantorUserId,
      pledge_amount: pledgeAmount,
    },
    options
  );
}

export async function getLoanGuarantorSuggestions(
  loanId: number,
  params?: {
    clan_id?: number | null;
    limit?: number;
  }
): Promise<any> {
  const options =
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined;

  const query = buildQuery({
    limit: params?.limit ?? 8,
  });

  return httpJsonPaths(
    [
      `/loans/${encodeURIComponent(String(loanId))}/guarantors/suggestions${query}`,
      `/loans/${encodeURIComponent(String(loanId))}/guarantor-suggestions${query}`,
    ],
    "GET",
    undefined,
    options
  );
}

export type LoanGuarantorRow = {
  id?: number;
  loan_id?: number;
  clan_id?: number;
  guarantor_user_id?: number;
  pledge_amount?: string | number | null;
  status?: string | null;
  responded_at?: string | null;
  is_locked?: boolean;
  locked_amount?: string | number | null;
  released_amount?: string | number | null;
};

export async function getLoanGuarantors(
  loanId: number,
  params?: {
    clan_id?: number | null;
  }
): Promise<{ items: LoanGuarantorRow[]; total: number }> {
  const options =
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined;

  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/guarantors`,
    "GET",
    undefined,
    options
  );
}

export type LoanGuarantorInboxItem = {
  id?: number;
  loan_id?: number;
  clan_id?: number;
  guarantor_user_id?: number;
  pledge_amount?: string | number | null;
  status?: string | null;
  responded_at?: string | null;
  is_locked?: boolean;
  locked_amount?: string | number | null;
  released_amount?: string | number | null;
};

export async function getLoanGuarantorInbox(params?: {
  clan_id?: number | null;
  status?: string;
  limit?: number;
}): Promise<{ items: LoanGuarantorInboxItem[]; total: number }> {
  const options =
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined;

  const requestedStatus = String(params?.status || "").trim().toLowerCase();

  return httpJson(
    `/loans/guarantors/inbox${buildQuery({
      status:
        requestedStatus && requestedStatus !== "all"
          ? requestedStatus
          : undefined,
      limit: params?.limit ?? 50,
    })}`,
    "GET",
    undefined,
    options
  );
}

export async function getGuarantorInbox(
  status: "pending" | "approved" | "declined" | "all" = "pending",
  limit: number = 50
): Promise<{ items: LoanGuarantorInboxItem[]; total: number }> {
  return getLoanGuarantorInbox({
    clan_id: getSelectedClanId() ?? undefined,
    status: status === "all" ? undefined : status,
    limit,
  });
}

export async function decideLoanGuarantor(
  loanId: number,
  guarantorId: number,
  payload: {
    status: "approved" | "declined";
    clan_id?: number | null;
    reason?: string | null;
    note?: string | null;
  }
): Promise<any> {
  const options =
    payload && Object.prototype.hasOwnProperty.call(payload, "clan_id")
      ? { header_clan_id: payload.clan_id ?? null }
      : undefined;

  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/guarantors/${encodeURIComponent(
      String(guarantorId)
    )}`,
    "PATCH",
    {
      status: payload.status,
      reason: payload.reason ?? undefined,
      note: payload.note ?? undefined,
    },
    options
  );
}

export async function cancelLoanRequest(
  loanId: number,
  params?: {
    clan_id?: number | null;
  }
): Promise<any> {
  const options =
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined;

  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/cancel`,
    "POST",
    undefined,
    options
  );
}

function normalizeWithdrawalDestinationPayload(payload: {
  clan_id?: number | null;
  gmfn_id?: string | null;
  destination_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  phone_number?: string | null;
  country?: string | null;
  currency?: string | null;
  note?: string | null;
}): Record<string, any> {
  const cleaned: Record<string, any> = {};

  const clanId = Number(payload?.clan_id || 0);
  const gmfnId = String(payload?.gmfn_id || "").trim();
  const destinationName = String(payload?.destination_name || "").trim();
  const bankName = String(payload?.bank_name || "").trim();
  const accountNumber = String(payload?.account_number || "").trim();
  const phoneNumber = String(payload?.phone_number || "").trim();
  const country = String(payload?.country || "").trim();
  const currency = String(payload?.currency || "").trim().toUpperCase();
  const note = String(payload?.note || "").trim();

  if (clanId > 0) {
    cleaned.clan_id = clanId;
    cleaned.community_id = clanId;
  }

  if (gmfnId) {
    cleaned.gmfn_id = gmfnId;
  }

  if (destinationName) {
    cleaned.destination_name = destinationName;
    cleaned.account_name = destinationName;
  }

  if (bankName) {
    cleaned.bank_name = bankName;
    cleaned.bank = bankName;
  }

  if (accountNumber) {
    cleaned.account_number = accountNumber;
    cleaned.bank_account_number = accountNumber;
  }

  if (phoneNumber) {
    cleaned.phone_number = phoneNumber;
    cleaned.phone = phoneNumber;
  }

  if (country) {
    cleaned.country = country;
  }

  if (currency) {
    cleaned.currency = currency;
  }

  if (note) {
    cleaned.note = note;
    cleaned.description = note;
  }

  return cleaned;
}

export async function getMyWithdrawalDestination(params?: {
  clan_id?: number | null;
  gmfn_id?: string | null;
}): Promise<any> {
  const requestOptions =
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined;

  const query = buildQuery({
    clan_id: params?.clan_id ?? undefined,
    community_id: params?.clan_id ?? undefined,
    gmfn_id: params?.gmfn_id ?? undefined,
  });

  return httpJsonPaths(
    [
      `/withdrawal-destinations/me${query}`,
      `/withdrawal-destination/me${query}`,
      `/pool/withdrawal-destination${query}`,
      `/pool/payout-destination${query}`,
      `/payment-destinations/me${query}`,
    ],
    "GET",
    undefined,
    requestOptions
  );
}

export async function saveWithdrawalDestination(payload: {
  clan_id?: number | null;
  gmfn_id?: string | null;
  destination_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  phone_number?: string | null;
  country?: string | null;
  currency?: string | null;
  note?: string | null;
}): Promise<any> {
  const requestOptions =
    payload && Object.prototype.hasOwnProperty.call(payload, "clan_id")
      ? { header_clan_id: payload.clan_id ?? null }
      : undefined;

  const cleaned = normalizeWithdrawalDestinationPayload(payload);

  return httpJsonPaths(
    [
      "/withdrawal-destinations/me",
      "/withdrawal-destination/me",
      "/pool/withdrawal-destination",
      "/pool/payout-destination",
      "/payment-destinations/me",
    ],
    "POST",
    cleaned,
    requestOptions
  );
}

export async function updateWithdrawalDestination(payload: {
  clan_id?: number | null;
  gmfn_id?: string | null;
  destination_name?: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  phone_number?: string | null;
  country?: string | null;
  currency?: string | null;
  note?: string | null;
}): Promise<any> {
  const requestOptions =
    payload && Object.prototype.hasOwnProperty.call(payload, "clan_id")
      ? { header_clan_id: payload.clan_id ?? null }
      : undefined;

  const cleaned = normalizeWithdrawalDestinationPayload(payload);

  return httpJsonPaths(
    [
      "/withdrawal-destinations/me",
      "/withdrawal-destination/me",
      "/pool/withdrawal-destination",
      "/pool/payout-destination",
      "/payment-destinations/me",
    ],
    "PATCH",
    cleaned,
    requestOptions
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
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const provided = String(clientFingerprint || "").trim();
  const fallbackFingerprint = (() => {
    try {
      if (typeof navigator === "undefined") return "";
      const language = String((navigator as any)?.language || "").trim();
      const platform = String((navigator as any)?.platform || "").trim();
      const userAgent = String((navigator as any)?.userAgent || "").trim();
      const timezone = detectBrowserTimezone() || "";
      return [language, platform, timezone, userAgent].filter(Boolean).join(" | ");
    } catch {
      return "";
    }
  })();

  const effectiveFingerprint = provided || fallbackFingerprint;
  if (effectiveFingerprint) {
    headers["X-Client-Fingerprint"] = effectiveFingerprint;
  }

  const res = await fetch(buildUrl("/identity-risk/observe"), {
    method: "POST",
    headers,
  });

  if (!res.ok) {
    throw new HttpStatusError(res.status, await parseError(res));
  }

  if (res.status === 204) return null;
  return readJsonOrTextSafe(res);
}

export async function getMyIdentityRisk(): Promise<any> {
  return httpJson("/identity-risk/me", "GET");
}

export async function getMyIdentityRecovery(): Promise<any> {
  return httpJson("/identity-risk/recovery/me", "GET");
}

export async function setupIdentityRecovery(payload: {
  questions: Array<{ prompt: string; answer: string }>;
}): Promise<any> {
  return httpJson("/identity-risk/recovery/setup", "POST", payload);
}

export async function verifyIdentityRecovery(payload: {
  answers: string[];
}): Promise<any> {
  return httpJson("/identity-risk/recovery/verify", "POST", payload);
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

/* =========================
   SETTINGS
   ========================= */

export type ThemePreset =
  | "professional-blue"
  | "cooperative-warm"
  | "enterprise-green";

export type MySettingsPayload = {
  tonePreset: ThemePreset;
  textSize: "standard" | "large";
  contrast: "standard" | "high";
  motion: "normal" | "reduced";
  density: "comfortable" | "compact";
  preferredLanguage: string;
  preferredCurrency: string;
  trustShareLevel: "minimal" | "standard" | "detailed";
  showPhonePublic: boolean;
  showWhatsAppPublic: boolean;
  showTelegramPublic: boolean;
  showShopPublic: boolean;
  preferredCommunityId: string;
  preferredLandingTab: "guide" | "settings";
  notificationsMode: "summary" | "detailed";
  quietNotifications: boolean;
  soundEnabled: boolean;
  unreadFirst: boolean;
  openActionsDirectly: boolean;
};

const DEFAULT_MY_SETTINGS: MySettingsPayload = {
  tonePreset: "professional-blue",
  textSize: "standard",
  contrast: "standard",
  motion: "normal",
  density: "comfortable",
  preferredLanguage: "English",
  preferredCurrency: "NGN",
  trustShareLevel: "standard",
  showPhonePublic: false,
  showWhatsAppPublic: true,
  showTelegramPublic: false,
  showShopPublic: true,
  preferredCommunityId: "",
  preferredLandingTab: "guide",
  notificationsMode: "summary",
  quietNotifications: false,
  soundEnabled: false,
  unreadFirst: true,
  openActionsDirectly: true,
};

function normalizeBooleanSetting(value: any, fallback: boolean): boolean {
  if (value === undefined || value === null || String(value).trim() === "") {
    return fallback;
  }

  if (typeof value === "boolean") return value;

  const raw = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;

  return fallback;
}

function normalizeEnum<T extends string>(
  value: any,
  allowed: readonly T[],
  fallback: T
): T {
  const raw = String(value ?? "").trim() as T;
  return allowed.includes(raw) ? raw : fallback;
}

function normalizeMySettingsPayload(input: any): MySettingsPayload {
  const src = input || {};

  return {
    tonePreset: normalizeEnum<ThemePreset>(
      src.tonePreset ?? src.tone_preset,
      ["professional-blue", "cooperative-warm", "enterprise-green"] as const,
      DEFAULT_MY_SETTINGS.tonePreset
    ),
    textSize: normalizeEnum<"standard" | "large">(
      src.textSize ?? src.text_size,
      ["standard", "large"] as const,
      DEFAULT_MY_SETTINGS.textSize
    ),
    contrast: normalizeEnum<"standard" | "high">(
      src.contrast,
      ["standard", "high"] as const,
      DEFAULT_MY_SETTINGS.contrast
    ),
    motion: normalizeEnum<"normal" | "reduced">(
      src.motion,
      ["normal", "reduced"] as const,
      DEFAULT_MY_SETTINGS.motion
    ),
    density: normalizeEnum<"comfortable" | "compact">(
      src.density,
      ["comfortable", "compact"] as const,
      DEFAULT_MY_SETTINGS.density
    ),
    preferredLanguage: String(
      src.preferredLanguage ??
        src.preferred_language ??
        DEFAULT_MY_SETTINGS.preferredLanguage
    ).trim(),
    preferredCurrency: String(
      src.preferredCurrency ??
        src.preferred_currency ??
        DEFAULT_MY_SETTINGS.preferredCurrency
    ).trim(),
    trustShareLevel: normalizeEnum<"minimal" | "standard" | "detailed">(
      src.trustShareLevel ?? src.trust_share_level,
      ["minimal", "standard", "detailed"] as const,
      DEFAULT_MY_SETTINGS.trustShareLevel
    ),
    showPhonePublic: normalizeBooleanSetting(
      src.showPhonePublic ?? src.show_phone_public,
      DEFAULT_MY_SETTINGS.showPhonePublic
    ),
    showWhatsAppPublic: normalizeBooleanSetting(
      src.showWhatsAppPublic ?? src.show_whatsapp_public,
      DEFAULT_MY_SETTINGS.showWhatsAppPublic
    ),
    showTelegramPublic: normalizeBooleanSetting(
      src.showTelegramPublic ?? src.show_telegram_public,
      DEFAULT_MY_SETTINGS.showTelegramPublic
    ),
    showShopPublic: normalizeBooleanSetting(
      src.showShopPublic ?? src.show_shop_public,
      DEFAULT_MY_SETTINGS.showShopPublic
    ),
    preferredCommunityId: String(
      src.preferredCommunityId ??
        src.preferred_community_id ??
        DEFAULT_MY_SETTINGS.preferredCommunityId
    ).trim(),
    preferredLandingTab: normalizeEnum<"guide" | "settings">(
      src.preferredLandingTab ?? src.preferred_landing_tab,
      ["guide", "settings"] as const,
      DEFAULT_MY_SETTINGS.preferredLandingTab
    ),
    notificationsMode: normalizeEnum<"summary" | "detailed">(
      src.notificationsMode ?? src.notifications_mode,
      ["summary", "detailed"] as const,
      DEFAULT_MY_SETTINGS.notificationsMode
    ),
    quietNotifications: normalizeBooleanSetting(
      src.quietNotifications ?? src.quiet_notifications,
      DEFAULT_MY_SETTINGS.quietNotifications
    ),
    soundEnabled: normalizeBooleanSetting(
      src.soundEnabled ?? src.sound_enabled,
      DEFAULT_MY_SETTINGS.soundEnabled
    ),
    unreadFirst: normalizeBooleanSetting(
      src.unreadFirst ?? src.unread_first,
      DEFAULT_MY_SETTINGS.unreadFirst
    ),
    openActionsDirectly: normalizeBooleanSetting(
      src.openActionsDirectly ?? src.open_actions_directly,
      DEFAULT_MY_SETTINGS.openActionsDirectly
    ),
  };
}

function readLocalMySettings(): MySettingsPayload {
  try {
    const raw = readStorage(GMFN_MY_SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_MY_SETTINGS };

    const parsed = JSON.parse(raw);
    return normalizeMySettingsPayload(parsed);
  } catch {
    return { ...DEFAULT_MY_SETTINGS };
  }
}

function writeLocalMySettings(settings: MySettingsPayload): void {
  try {
    writeStorage(GMFN_MY_SETTINGS_KEY, JSON.stringify(settings));
  } catch {}
}

export async function getMySettings(): Promise<MySettingsPayload> {
  return readLocalMySettings();
}

export async function updateMySettings(
  payload: Partial<MySettingsPayload>
): Promise<MySettingsPayload> {
  const next = normalizeMySettingsPayload({
    ...readLocalMySettings(),
    ...payload,
  });

  writeLocalMySettings(next);
  return next;
}

export async function resetMySettings(): Promise<MySettingsPayload> {
  const next = { ...DEFAULT_MY_SETTINGS };
  writeLocalMySettings(next);
  return next;
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

export async function getAdminPilotIntake(limit: number = 50): Promise<any> {
  return httpJson(`/admin/pilot-intake${buildQuery({ limit })}`, "GET");
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

export async function getExposureAdmin(clanId?: number): Promise<any> {
  return httpJson(`/exposure/admin${buildQuery({ clan_id: clanId })}`, "GET");
}

export async function getAdminIncompleteLoans(
  clanId?: number,
  limit: number = 50
): Promise<any> {
  return httpJson(
    `/admin/loans/incomplete${buildQuery({ clan_id: clanId, limit })}`,
    "GET"
  );
}

export async function getCciScore(
  clanId: number,
  userId: number
): Promise<any> {
  return httpJson(
    `/exposure/admin/cci-scores${buildQuery({ clan_id: clanId, user_id: userId })}`,
    "GET"
  );
}

export async function runOverdueDetector(payload: {
  dry_run?: boolean;
  grace_days?: number;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/loans/overdue/run${buildQuery({
      dry_run: payload?.dry_run,
      grace_days: payload?.grace_days,
      limit: payload?.limit,
    })}`,
    "POST"
  );
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

export async function getSystemDiagnostics(): Promise<any> {
  return httpJson("/system/diagnostics", "GET");
}

export async function listAdminPoolPending(
  clanId?: number | null,
  limit: number = 50
): Promise<any> {
  const effectiveClanId =
    clanId === undefined ? getSelectedClanId() : clanId;

  const options =
    clanId !== undefined
      ? { header_clan_id: clanId ?? null }
      : undefined;

  return httpJson(
    `/admin/pool/pending${buildQuery({ limit })}`,
    "GET",
    undefined,
    options ?? (effectiveClanId ? { header_clan_id: effectiveClanId } : undefined)
  );
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
    "/bank/ingest",
    "POST",
    {
      amount: payload.amount,
      currency: payload.currency || "NGN",
      direction: payload.direction,
      reference: payload.reference ?? null,
      description: payload.description ?? null,
    },
    { header_clan_id: payload.clan_id }
  );
}

export async function listRecentBankEvents(clanId: number): Promise<any> {
  return httpJson(
    `/bank/recent${buildQuery({ clan_id: clanId })}`,
    "GET",
    undefined,
    { header_clan_id: clanId }
  );
}

export async function listUnmatchedBankEvents(clanId: number): Promise<any> {
  return httpJson(
    `/bank/unmatched${buildQuery({ clan_id: clanId })}`,
    "GET",
    undefined,
    { header_clan_id: clanId }
  );
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
    "GET",
    undefined,
    { header_clan_id: payload.clan_id }
  );
}

export async function listExpectedPayments(payload?: {
  clan_id?: number;
  user_id?: number;
  expected_type?: string;
  status?: string;
  currency?: string;
  limit?: number;
}): Promise<any> {
  const primaryClanId = Number(payload?.clan_id || 0);
  const query = buildQuery({
    clan_id: primaryClanId > 0 ? primaryClanId : undefined,
    user_id: payload?.user_id ?? undefined,
    expected_type: payload?.expected_type ?? undefined,
    status: payload?.status ?? undefined,
    currency: payload?.currency ?? undefined,
    limit: payload?.limit ?? 100,
  });

  return httpJson(
    `/bank/expected${query}`,
    "GET",
    undefined,
    primaryClanId > 0 ? { header_clan_id: primaryClanId } : undefined
  );
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
    "POST",
    undefined,
    { header_clan_id: payload.clan_id }
  );
}

/* =========================
   MARKETPLACE
   ========================= */

function normalizeApiDateTime(value: any): string | undefined {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;

  const dt = new Date(raw);
  if (!Number.isFinite(dt.getTime())) return undefined;

  return dt.toISOString().replace(/\.\d{3}Z$/, "Z");
}

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
  header_clan_id?: number | null;
  only_active?: boolean;
  limit?: number;
}): Promise<any> {
  const options = buildMarketplaceReadOptions(params);

  return httpJson(
    `/marketplace/shops${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      only_active: params?.only_active ?? true,
      limit: params?.limit ?? 50,
    })}`,
    "GET",
    undefined,
    options
  );
}

export async function getMarketplaceShopByGmfnId(
  gmfnId: string,
  params?: {
    clan_id?: number | null;
    header_clan_id?: number | null;
  }
): Promise<any> {
  const options = buildMarketplaceReadOptions(params);

  return httpJson(
    `/marketplace/shops/by-gmfn/${encodeURIComponent(String(gmfnId))}${buildQuery({
      clan_id: params?.clan_id ?? undefined,
    })}`,
    "GET",
    undefined,
    options
  );
}

export async function getPublicMarketplaceShopByGmfnId(
  gmfnId: string,
  params?: {
    clan_id?: number | null;
    product_limit?: number;
    broadcast_limit?: number;
  }
): Promise<any> {
  return httpJson(
    `/marketplace/public/shop/${encodeURIComponent(String(gmfnId))}${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      product_limit: params?.product_limit ?? 100,
      broadcast_limit: params?.broadcast_limit ?? 24,
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
  header_clan_id?: number | null;
  shop_id?: number | null;
  only_active?: boolean;
  include_reposted?: boolean;
  limit?: number;
}): Promise<any> {
  const options = buildMarketplaceReadOptions(params);

  return httpJson(
    `/marketplace/products${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      shop_id: params?.shop_id ?? undefined,
      only_active: params?.only_active ?? true,
      include_reposted: params?.include_reposted ?? true,
      limit: params?.limit ?? 100,
    })}`,
    "GET",
    undefined,
    options
  );
}

export async function createMarketplaceBroadcast(payload: {
  clan_id?: number | null;
  shop_id?: number | null;
  message: string;
  image_url?: string | null;
  video_url?: string | null;
  expires_at?: string | null;
}): Promise<any> {
  const effectiveClanId =
    payload?.clan_id === undefined ? getSelectedClanId() : payload?.clan_id;

  const clanId = Number(effectiveClanId || 0);
  const shopId = Number(payload?.shop_id || 0);
  const message = String(payload?.message || "").trim();
  const imageUrl = String(payload?.image_url || "").trim();
  const videoUrl = String(payload?.video_url || "").trim();
  const expiresAt = normalizeApiDateTime(payload?.expires_at);

  if (!message && !imageUrl && !videoUrl) {
    throw new Error("message, image_url, or video_url is required");
  }

  const baseBody: Record<string, any> = {
    message: message || "Spotlight update",
  };

  if (imageUrl) {
    baseBody.image_url = imageUrl;
  }

  if (videoUrl) {
    baseBody.video_url = videoUrl;
  }

  if (expiresAt) {
    baseBody.expires_at = expiresAt;
  }

  if (shopId > 0) {
    baseBody.shop_id = shopId;
  }

  const options =
    payload && Object.prototype.hasOwnProperty.call(payload, "clan_id")
      ? { header_clan_id: payload.clan_id ?? null }
      : undefined;

  const attempts: Record<string, any>[] = [
    clanId > 0 ? { ...baseBody, clan_id: clanId } : { ...baseBody },
    { ...baseBody },
    {
      ...baseBody,
      content: baseBody.message,
      text: baseBody.message,
    },
  ];

  let lastError: unknown = null;

  for (const body of attempts) {
    try {
      return await httpJson(
        "/marketplace/broadcasts",
        "POST",
        body,
        options
      );
    } catch (err) {
      lastError = err;
      if (!(err instanceof HttpStatusError) || err.status !== 400) {
        throw err;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Marketplace broadcast creation failed");
}

export async function getMarketplaceBroadcasts(params?: {
  clan_id?: number | null;
  active_only?: boolean;
  limit?: number;
}): Promise<any> {
  const effectiveClanId =
    params?.clan_id === undefined ? getSelectedClanId() : params?.clan_id;
  const clanWasImplicit =
    params?.clan_id === undefined &&
    Number.isFinite(Number(effectiveClanId)) &&
    Number(effectiveClanId) > 0;

  const options =
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined;

  const attempts = [
    {
      clan_id: effectiveClanId ?? undefined,
      active_only:
        typeof params?.active_only === "boolean"
          ? params.active_only
          : undefined,
      limit: params?.limit ?? 100,
    },
    {
      clan_id: effectiveClanId ?? undefined,
      limit: params?.limit ?? 100,
    },
    {
      limit: params?.limit ?? 100,
    },
  ];

  let lastError: unknown = null;

  for (const queryParams of attempts) {
    try {
      return await httpJson(
        `/marketplace/broadcasts${buildQuery(queryParams)}`,
        "GET",
        undefined,
        options
      );
    } catch (err) {
      lastError = err;
      const tryingClanScopedAttempt =
        Object.prototype.hasOwnProperty.call(queryParams, "clan_id") &&
        Number.isFinite(Number((queryParams as any)?.clan_id)) &&
        Number((queryParams as any)?.clan_id) > 0;
      const canRecoverFromImplicitStaleClan =
        clanWasImplicit &&
        tryingClanScopedAttempt &&
        err instanceof HttpStatusError &&
        err.status === 403;

      if (
        !(err instanceof HttpStatusError) ||
        (err.status !== 400 && !canRecoverFromImplicitStaleClan)
      ) {
        throw err;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Marketplace broadcasts request failed");
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
    `/marketplace/products/${encodeURIComponent(
      String(payload.product_id)
    )}/repost`,
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

  if (
    typeof navigator !== "undefined" &&
    (navigator as any)?.clipboard?.writeText
  ) {
    (navigator as any).clipboard.writeText(t).catch(() => tryLegacyCopy(t));
    return;
  }

  tryLegacyCopy(t);
}

function tryLegacyCopy(text: string) {
  try {
    if (typeof document === "undefined") return;

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
  return httpJson(`/trust/why/${encodeURIComponent(String(userId))}`, "GET");
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

  const effectiveClanId = Number(clanId ?? getSelectedClanId() ?? 0);
  if (effectiveClanId > 0) {
    fd.append("clan_id", String(effectiveClanId));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  if (effectiveClanId > 0) {
    headers["X-Clan-Id"] = String(effectiveClanId);
  }

  const res = await fetch(buildUrl("/marketplace/media/image"), {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return readJsonOrTextSafe(res);
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

  const effectiveClanId = Number(clanId ?? getSelectedClanId() ?? 0);
  if (effectiveClanId > 0) {
    fd.append("clan_id", String(effectiveClanId));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  if (effectiveClanId > 0) {
    headers["X-Clan-Id"] = String(effectiveClanId);
  }

  const res = await fetch(buildUrl("/marketplace/media/video"), {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return readJsonOrTextSafe(res);
}

/* =========================
   COMMUNITY PROFILE IMAGE
   ========================= */

function pickFirstCommunityImageText(...values: any[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function resolveCommunityProfileImageClanId(arg1: any, arg2?: any): number | null {
  const candidates = [
    arg1?.clan_id,
    arg1?.community_id,
    arg1?.id,
    typeof arg1 === "number" || typeof arg1 === "string" ? arg1 : null,
    arg2,
    getSelectedClanId(),
  ];

  for (const candidate of candidates) {
    const n = Number(candidate || 0);
    if (Number.isFinite(n) && n > 0) return n;
  }

  return null;
}

function resolveCommunityProfileImageUrl(arg1: any, arg2?: any): string {
  return pickFirstCommunityImageText(
    arg1?.image_url,
    arg1?.profile_image_url,
    arg1?.community_image_url,
    arg1?.marketplace_image_url,
    arg1?.cover_image_url,
    arg1?.banner_url,
    arg1?.url,
    typeof arg2 === "string" ? arg2 : null
  );
}

function shouldTryNextCommunityImageAttempt(err: unknown): boolean {
  return (
    err instanceof HttpStatusError &&
    (err.status === 400 ||
      err.status === 404 ||
      err.status === 405 ||
      err.status === 409 ||
      err.status === 422)
  );
}

async function readCommunityImageResponseSafe(res: Response): Promise<any> {
  const text = await readTextSafe(res);
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function normalizeCommunityImageUploadPayload(payload: any): any {
  const imageUrl = pickFirstCommunityImageText(
    payload?.image_url,
    payload?.url,
    payload?.file_url,
    payload?.path,
    payload?.location,
    payload?.media_url,
    payload?.item?.image_url,
    payload?.item?.url,
    payload?.item?.file_url,
    payload?.item?.path,
    payload?.data?.image_url,
    payload?.data?.url,
    payload?.data?.file_url,
    payload?.data?.path,
    typeof payload === "string" ? payload : null
  );

  if (!imageUrl) {
    return payload;
  }

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return {
      ...payload,
      image_url: imageUrl,
      profile_image_url: imageUrl,
      community_image_url: imageUrl,
      url: imageUrl,
    };
  }

  return {
    ok: true,
    image_url: imageUrl,
    profile_image_url: imageUrl,
    community_image_url: imageUrl,
    url: imageUrl,
  };
}

async function postCommunityImageFileToPath(
  path: string,
  file: File,
  clanId?: number | null
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);

  const effectiveClanId = Number(clanId ?? getSelectedClanId() ?? 0);
  if (effectiveClanId > 0) {
    fd.append("clan_id", String(effectiveClanId));
    fd.append("community_id", String(effectiveClanId));
  }

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  if (effectiveClanId > 0) {
    headers["X-Clan-Id"] = String(effectiveClanId);
  }

  const res = await fetch(buildUrl(path), {
    method: "POST",
    headers,
    body: fd,
  });

  if (!res.ok) {
    throw new HttpStatusError(res.status, await parseError(res));
  }

  return readCommunityImageResponseSafe(res);
}

export async function uploadCommunityProfileImageFile(
  file: File,
  clanId?: number | null
): Promise<any> {
  const effectiveClanId = Number(clanId ?? getSelectedClanId() ?? 0);

  const paths = [
    "/marketplace/media/image",
    "/marketplace/media/upload-image",
    "/marketplace/upload/image",
    "/media/image",
    "/media/upload/image",
    "/uploads/image",
    effectiveClanId > 0
      ? `/clans/${encodeURIComponent(String(effectiveClanId))}/profile-image/upload`
      : "",
    effectiveClanId > 0
      ? `/clans/${encodeURIComponent(
          String(effectiveClanId)
        )}/community-profile-image/upload`
      : "",
    effectiveClanId > 0
      ? `/clans/${encodeURIComponent(String(effectiveClanId))}/image/upload`
      : "",
  ].filter(Boolean);

  let lastError: unknown = null;

  for (const path of paths) {
    try {
      const out = await postCommunityImageFileToPath(
        path,
        file,
        effectiveClanId || undefined
      );
      return normalizeCommunityImageUploadPayload(out);
    } catch (err) {
      lastError = err;
      if (shouldTryNextCommunityImageAttempt(err)) {
        continue;
      }
      throw err;
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Community profile image upload failed.");
}

export async function setCommunityProfileImage(
  arg1: any,
  arg2?: any
): Promise<any> {
  const clanId = resolveCommunityProfileImageClanId(arg1, arg2);
  const imageUrl = resolveCommunityProfileImageUrl(arg1, arg2);

  if (!clanId) {
    throw new Error("clan_id is required");
  }

  if (!imageUrl) {
    throw new Error("image_url is required");
  }

  const options: RequestOptions = { header_clan_id: clanId };

  const paths = [
    `/clans/${encodeURIComponent(String(clanId))}/profile-image`,
    `/clans/${encodeURIComponent(String(clanId))}/community-profile-image`,
    `/clans/${encodeURIComponent(String(clanId))}/image`,
    `/clans/${encodeURIComponent(String(clanId))}`,
    `/marketplace/communities/${encodeURIComponent(
      String(clanId)
    )}/profile-image`,
    `/marketplace/clans/${encodeURIComponent(String(clanId))}/profile-image`,
  ];

  const bodies = [
    { image_url: imageUrl },
    { profile_image_url: imageUrl },
    { community_image_url: imageUrl },
    { marketplace_image_url: imageUrl },
    { cover_image_url: imageUrl },
    { banner_url: imageUrl },
    { url: imageUrl },
    { clan_id: clanId, image_url: imageUrl },
    { clan_id: clanId, profile_image_url: imageUrl },
    { clan_id: clanId, community_image_url: imageUrl },
    { clan_id: clanId, marketplace_image_url: imageUrl },
  ];

  const methods: Array<"PATCH" | "POST" | "PUT"> = ["PATCH", "POST", "PUT"];

  let lastError: unknown = null;

  for (const path of paths) {
    for (const method of methods) {
      for (const body of bodies) {
        try {
          return await httpJson(path, method, body, options);
        } catch (err) {
          lastError = err;
          if (shouldTryNextCommunityImageAttempt(err)) {
            continue;
          }
          throw err;
        }
      }
    }
  }

  if (
    lastError instanceof HttpStatusError &&
    shouldTryNextCommunityImageAttempt(lastError)
  ) {
    return {
      ok: true,
      detail:
        "Image uploaded, but no dedicated profile-image save endpoint was available. Use the returned URL in the page state.",
      image_url: imageUrl,
      profile_image_url: imageUrl,
      community_image_url: imageUrl,
      url: imageUrl,
    };
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Community profile image could not be set.");
}

export async function removeCommunityProfileImage(arg1?: any): Promise<any> {
  const clanId = resolveCommunityProfileImageClanId(arg1);

  if (!clanId) {
    throw new Error("clan_id is required");
  }

  const options: RequestOptions = { header_clan_id: clanId };

  const paths = [
    `/clans/${encodeURIComponent(String(clanId))}/profile-image`,
    `/clans/${encodeURIComponent(String(clanId))}/community-profile-image`,
    `/clans/${encodeURIComponent(String(clanId))}/image`,
    `/clans/${encodeURIComponent(String(clanId))}`,
    `/marketplace/communities/${encodeURIComponent(
      String(clanId)
    )}/profile-image`,
    `/marketplace/clans/${encodeURIComponent(String(clanId))}/profile-image`,
  ];

  let lastError: unknown = null;

  for (const path of paths) {
    try {
      return await httpJson(path, "DELETE", undefined, options);
    } catch (err) {
      lastError = err;
      if (!shouldTryNextCommunityImageAttempt(err)) {
        throw err;
      }
    }
  }

  const clearBodies = [
    { image_url: null },
    { profile_image_url: null },
    { community_image_url: null },
    { marketplace_image_url: null },
    { cover_image_url: null },
    { banner_url: null },
    { remove: true },
    { clear: true },
    { delete_image: true },
    { clan_id: clanId, image_url: null },
    { clan_id: clanId, profile_image_url: null },
    { clan_id: clanId, community_image_url: null },
  ];

  const clearMethods: Array<"PATCH" | "POST" | "PUT"> = ["PATCH", "POST", "PUT"];

  for (const path of paths) {
    for (const method of clearMethods) {
      for (const body of clearBodies) {
        try {
          return await httpJson(path, method, body, options);
        } catch (err) {
          lastError = err;
          if (shouldTryNextCommunityImageAttempt(err)) {
            continue;
          }
          throw err;
        }
      }
    }
  }

  if (
    lastError instanceof HttpStatusError &&
    shouldTryNextCommunityImageAttempt(lastError)
  ) {
    return {
      ok: true,
      detail:
        "No dedicated remove endpoint was available, but the UI can clear the current image state.",
    };
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Community profile image could not be removed.");
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
    "GET",
    undefined,
    { header_clan_id: clanId }
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
    { vote },
    { header_clan_id: clanId }
  );
}

export async function pilotApproveJoinRequest(id: number): Promise<any> {
  const clanId = getSelectedClanId();

  if (!clanId) {
    throw new Error("No selected community");
  }

  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests/${encodeURIComponent(
      String(id)
    )}/pilot-approve`,
    "POST",
    undefined,
    { header_clan_id: clanId }
  );
}

export type MarketplaceRequestItem = {
  id: number;
  clan_id?: number | null;
  community_code?: string | null;
  clan_name?: string | null;
  marketplace_name?: string | null;
  user_id: number;
  title: string;
  description?: string | null;
  category?: string | null;
  urgency?: string | null;
  area?: string | null;
  whatsapp_number?: string | null;
  payment_mode?: string | null;
  allow_trust_credit?: boolean;
  status: string;
  created_at: string;
  expires_at?: string | null;

  requester_name?: string | null;
  requester_nickname?: string | null;
  requester_gmfn_id?: string | null;
  requester_email?: string | null;
  requester_trust_score?: number | null;
  requester_trust_band?: string | null;

  is_mine?: boolean;
  mine?: boolean;
};

export async function listMarketplaceRequests(params?: {
  status?: string;
  category?: string;
  urgency?: string;
  area?: string;
  mine_only?: boolean;
  clan_id?: number | null;
  limit?: number;
}): Promise<MarketplaceRequestItem[]> {
  const effectiveClanId =
    params?.clan_id === undefined ? getSelectedClanId() : params?.clan_id;

  return httpJson(
    `/marketplace/requests${buildQuery({
      status: params?.status,
      category: params?.category,
      urgency: params?.urgency,
      area: params?.area,
      mine_only:
        typeof params?.mine_only === "boolean" ? params.mine_only : undefined,
      clan_id: effectiveClanId ?? undefined,
      limit: params?.limit ?? 100,
    })}`,
    "GET"
  );
}

export async function getMarketplaceRequests(params?: {
  status?: string;
  category?: string;
  urgency?: string;
  area?: string;
  mine_only?: boolean;
  clan_id?: number | null;
  limit?: number;
}): Promise<MarketplaceRequestItem[]> {
  return listMarketplaceRequests(params);
}

export async function createMarketplaceRequest(payload: {
  title: string;
  description?: string;
  category?: string;
  urgency?: string;
  area?: string;
  whatsapp_number?: string;
  expires_in_hours?: number;
  payment_mode?: string;
  allow_trust_credit?: boolean;
  clan_id?: number | null;
}): Promise<MarketplaceRequestItem> {
  const effectiveClanId =
    payload?.clan_id === undefined ? getSelectedClanId() : payload?.clan_id;

  return httpJson("/marketplace/requests", "POST", {
    ...payload,
    clan_id: effectiveClanId ?? undefined,
  });
}

export async function getMarketplaceRequest(
  requestId: number,
  clanId?: number | null
): Promise<MarketplaceRequestItem> {
  const effectiveClanId = clanId === undefined ? getSelectedClanId() : clanId;

  return httpJson(
    `/marketplace/requests/${encodeURIComponent(String(requestId))}${buildQuery({
      clan_id: effectiveClanId ?? undefined,
    })}`,
    "GET"
  );
}

export async function updateMarketplaceRequestStatus(
  requestId: number,
  status: "fulfilled" | "cancelled"
): Promise<MarketplaceRequestItem> {
  return httpJson(
    `/marketplace/requests/${encodeURIComponent(String(requestId))}/status`,
    "POST",
    { status }
  );
}

export type TrustEventsQuery = {
  clan_id?: number;
  user_id?: number;
  actor_user_id?: number;
  subject_user_id?: number;
  loan_id?: number;
  event_type?: string;
  limit?: number;
};

export async function listTrustEvents(params?: TrustEventsQuery): Promise<any> {
  return getTrustEvents({
    clan_id: params?.clan_id,
    user_id:
      params?.user_id ??
      params?.actor_user_id ??
      params?.subject_user_id,
    loan_id: params?.loan_id,
    limit: params?.limit ?? 200,
  });
}

export async function getMyTrustGraph(): Promise<any> {
  const me = await getMe();
  const userId = Number(me?.id || 0);

  if (!userId) {
    throw new Error("Unable to resolve current user for trust graph");
  }

  return getAdminTrustGraph(userId, {
    include_clans: true,
    limit_events: 500,
  });
}

export async function getTrustGraphByUserId(userId: number): Promise<any> {
  return getAdminTrustGraph(userId, {
    include_clans: true,
    limit_events: 500,
  });
}

export async function getTrustGraphByGmfnId(gmfnId: string): Promise<any> {
  const cleaned = String(gmfnId || "").trim();

  if (!cleaned) {
    throw new Error("GMFN ID is required");
  }

  const me = await getMe();
  const myGmfnId = String(me?.gmfn_id || "").trim();

  if (myGmfnId && myGmfnId.toUpperCase() === cleaned.toUpperCase()) {
    return getMyTrustGraph();
  }

  throw new Error(
    "Trust graph lookup by GMFN ID is not wired in api.ts yet. Use user ID for now."
  );
}

export type TrustGraphNodeOut = any;

export type TrustGraphEdgeOut = {
  edge_type?: string | null;
  source_gmfn_id?: string | null;
  target_gmfn_id?: string | null;
  source_user_id?: number | null;
  target_user_id?: number | null;
  clan_id?: number | null;
  loan_id?: number | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  weight?: number | string | null;
  confidence?: number | string | null;
  event_count?: number | string | null;
  provenance?: any[] | null;
  meta?: any;
};

export type TrustGraphSummaryOut = {
  cci_score?: number | string | null;
  graph_score?: number | string | null;
  active_clan_count?: number | string | null;
  sponsor_count?: number | string | null;
  unique_counterparties?: number | string | null;
  inbound_trust_edges?: number | string | null;
  outbound_trust_edges?: number | string | null;
  repayment_edge_count?: number | string | null;
  guarantee_edge_count?: number | string | null;
  invite_edge_count?: number | string | null;
  risk_flags?: any[] | null;
};
// ==============================
// Vault Shops / Lock-Up Shops
// ==============================

export type ShopVisibilityMode = "community_visible" | "vault_private";

export type VaultAccessPolicy = {
  expires_at?: string | null;
  max_views?: number | null;
  views_used?: number | null;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  watermark_enabled?: boolean;
  revoked_at?: string | null;
};

export type VaultLinkItem = {
  id: number | string;
  shop_id: number | string;
  access_url: string;
  token: string;
  expires_at?: string | null;
  max_views?: number | null;
  views_used?: number | null;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  watermark_enabled?: boolean;
  revoked_at?: string | null;
  created_at?: string | null;
  last_opened_at?: string | null;
  status?: "active" | "expired" | "revoked" | "exhausted";
};

export type CreateVaultShopAccessLinkInput = {
  shop_id: number | string;
  vault_shop_id?: number | string;
  visibility_mode?: ShopVisibilityMode;
  expires_at?: string | null;
  max_views?: number | null;
  allow_download?: boolean;
  allow_print?: boolean;
  allow_reshare?: boolean;
  watermark_enabled?: boolean;
};

export type ExtendVaultShopAccessLinkInput = {
  link_id: number | string;
  expires_at: string;
};

export type VaultShopAccessProduct = {
  id?: number | string;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
};

export type VaultShopAccessView = {
  token?: string;
  status?: "active" | "expired" | "revoked" | "exhausted" | "invalid";
  shop_id?: number | string;
  vault_shop_id?: number | string;
  shop_name?: string | null;
  shop_description?: string | null;
  owner_name?: string | null;
  gmfn_id?: string | null;
  community_name?: string | null;
  banner_url?: string | null;
  image_url?: string | null;
  products?: VaultShopAccessProduct[];
  policy?: VaultAccessPolicy;
  disclaimer?: string | null;
  watermark_text?: string | null;
  raw?: any;
};

function vaultSafeStr(x: any): string {
  return String(x ?? "").trim();
}

function vaultFirstTruthy(...values: any[]): string {
  for (const value of values) {
    const text = vaultSafeStr(value);
    if (text) return text;
  }
  return "";
}

function vaultNumberLike(value: any): number | null {
  if (value === null || value === undefined || String(value).trim() === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function vaultRowsOf<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
}

function vaultApiBase(): string {
  const raw =
    (typeof import.meta !== "undefined" &&
      (import.meta as any)?.env &&
      (import.meta as any).env.VITE_API_BASE_URL) ||
    "/api";

  return String(raw || "").trim().replace(/\/+$/, "");
}

function vaultJoinUrl(root: string, path: string): string {
  const cleanRoot = vaultSafeStr(root).replace(/\/+$/, "");
  const cleanPath = vaultSafeStr(path).startsWith("/")
    ? vaultSafeStr(path)
    : `/${vaultSafeStr(path)}`;

  return `${cleanRoot}${cleanPath}`;
}

async function vaultReadError(res: Response): Promise<string> {
  const text = await res.text();
  try {
    const j = JSON.parse(text);
    return j?.detail || j?.message || text || `HTTP ${res.status}`;
  } catch {
    return text || `HTTP ${res.status}`;
  }
}

async function vaultTryJson<T = any>(
  attempts: Array<{
    method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
    path: string;
    body?: any;
  }>,
  includeAuth = true
): Promise<T> {
  const roots = [vaultApiBase()];

  if (typeof window !== "undefined") {
    roots.push(`${window.location.origin}/api`);
  }

  const uniqueRoots = Array.from(new Set(roots.map((x) => vaultSafeStr(x)).filter(Boolean)));

  const token =
    includeAuth && typeof getAccessToken === "function"
      ? getAccessToken()
      : "";

  let lastError = "Vault Shops request failed.";

  for (const root of uniqueRoots) {
    for (const attempt of attempts) {
      try {
        const headers: Record<string, string> = {
          Accept: "application/json",
        };

        if (attempt.body !== undefined) {
          headers["Content-Type"] = "application/json";
        }

        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const res = await fetch(vaultJoinUrl(root, attempt.path), {
          method: attempt.method,
          headers,
          credentials: "include",
          cache: "no-store",
          body:
            attempt.body === undefined ? undefined : JSON.stringify(attempt.body),
        });

        if (res.status === 404 || res.status === 405) {
          continue;
        }

        if (!res.ok) {
          lastError = await vaultReadError(res);
          continue;
        }

        const contentType = String(res.headers.get("content-type") || "").toLowerCase();

        if (!contentType.includes("application/json")) {
          return {} as T;
        }

        return (await res.json()) as T;
      } catch (err: any) {
        lastError = vaultSafeStr(err?.message || err) || lastError;
      }
    }
  }

  throw new Error(lastError);
}

function normalizeVaultLinkItem(raw: any): VaultLinkItem {
  const src = raw?.item || raw?.link || raw?.data || raw || {};

  const expiresAt = vaultFirstTruthy(src?.expires_at);
  const revokedAt = vaultFirstTruthy(src?.revoked_at);
  const maxViews = vaultNumberLike(src?.max_views);
  const viewsUsed = vaultNumberLike(src?.views_used);

  let status: VaultLinkItem["status"] = "active";

  if (revokedAt) {
    status = "revoked";
  } else if (expiresAt) {
    const d = new Date(expiresAt);
    if (Number.isFinite(d.getTime()) && d.getTime() < Date.now()) {
      status = "expired";
    }
  }

  if (
    status === "active" &&
    maxViews !== null &&
    viewsUsed !== null &&
    viewsUsed >= maxViews
  ) {
    status = "exhausted";
  }

  return {
    id: src?.id ?? src?.link_id ?? "",
    shop_id: src?.shop_id ?? src?.vault_shop_id ?? "",
    access_url: vaultFirstTruthy(src?.access_url, src?.url),
    token: vaultFirstTruthy(src?.token, src?.code),
    expires_at: expiresAt || null,
    max_views: maxViews,
    views_used: viewsUsed,
    allow_download: Boolean(src?.allow_download),
    allow_print: Boolean(src?.allow_print),
    allow_reshare: Boolean(src?.allow_reshare),
    watermark_enabled: Boolean(src?.watermark_enabled),
    revoked_at: revokedAt || null,
    created_at: vaultFirstTruthy(src?.created_at) || null,
    last_opened_at: vaultFirstTruthy(src?.last_opened_at) || null,
    status,
  };
}

function normalizeVaultAccessProduct(raw: any): VaultShopAccessProduct {
  const src = raw?.item || raw?.product || raw || {};

  return {
    id: src?.id ?? src?.product_id,
    name: vaultFirstTruthy(src?.name, src?.title, src?.product_name),
    description: vaultFirstTruthy(
      src?.description,
      src?.detail,
      src?.summary,
      src?.product_description
    ),
    price: vaultFirstTruthy(src?.price),
    currency: vaultFirstTruthy(src?.currency, src?.currency_code),
    image_url: vaultFirstTruthy(
      src?.image_url,
      src?.photo_url,
      src?.thumbnail_url,
      src?.cover_image_url
    ),
  };
}

function normalizeVaultAccessView(raw: any): VaultShopAccessView {
  const src = raw?.item || raw?.view || raw?.data || raw || {};
  const shop = src?.shop || src?.shop_summary || src;
  const policySrc = src?.policy || src?.access_policy || src?.link || src;

  const expiresAt = vaultFirstTruthy(policySrc?.expires_at, shop?.expires_at, src?.expires_at);
  const revokedAt = vaultFirstTruthy(policySrc?.revoked_at, shop?.revoked_at, src?.revoked_at);
  const maxViews = vaultNumberLike(
    policySrc?.max_views ?? shop?.max_views ?? src?.max_views
  );
  const viewsUsed = vaultNumberLike(
    policySrc?.views_used ?? shop?.views_used ?? src?.views_used
  );

  let status: VaultShopAccessView["status"] = "active";
  const rawStatus = vaultFirstTruthy(src?.status, policySrc?.status, shop?.status).toLowerCase();

  if (rawStatus.includes("invalid")) status = "invalid";
  if (rawStatus.includes("revoke")) status = "revoked";
  if (rawStatus.includes("expire")) status = "expired";
  if (rawStatus.includes("exhaust")) status = "exhausted";

  if (revokedAt) {
    status = "revoked";
  } else if (expiresAt) {
    const d = new Date(expiresAt);
    if (Number.isFinite(d.getTime()) && d.getTime() < Date.now()) {
      status = "expired";
    }
  }

  if (
    status === "active" &&
    maxViews !== null &&
    viewsUsed !== null &&
    viewsUsed >= maxViews
  ) {
    status = "exhausted";
  }

  const productRows = vaultRowsOf<any>(
    src?.products || src?.items || shop?.products || src?.shop_products
  ).map((item) => normalizeVaultAccessProduct(item));

  return {
    token: vaultFirstTruthy(src?.token, policySrc?.token, src?.code),
    status,
    shop_id: shop?.id ?? shop?.shop_id ?? src?.shop_id,
    vault_shop_id: src?.vault_shop_id ?? shop?.vault_shop_id,
    shop_name: vaultFirstTruthy(shop?.name, shop?.shop_name, src?.shop_name),
    shop_description: vaultFirstTruthy(
      shop?.description,
      shop?.shop_description,
      src?.description
    ),
    owner_name: vaultFirstTruthy(
      shop?.owner_name,
      shop?.owner_display_name,
      src?.owner_name
    ),
    gmfn_id: vaultFirstTruthy(shop?.gmfn_id, src?.gmfn_id),
    community_name: vaultFirstTruthy(
      shop?.community_name,
      shop?.clan_name,
      src?.community_name
    ),
    banner_url: vaultFirstTruthy(
      shop?.banner_url,
      shop?.image_url,
      shop?.cover_image_url,
      src?.banner_url
    ),
    image_url: vaultFirstTruthy(
      shop?.image_url,
      shop?.cover_image_url,
      src?.image_url
    ),
    products: productRows,
    policy: {
      expires_at: expiresAt || null,
      max_views: maxViews,
      views_used: viewsUsed,
      allow_download: Boolean(policySrc?.allow_download ?? src?.allow_download),
      allow_print: Boolean(policySrc?.allow_print ?? src?.allow_print),
      allow_reshare: Boolean(policySrc?.allow_reshare ?? src?.allow_reshare),
      watermark_enabled: Boolean(
        policySrc?.watermark_enabled ?? src?.watermark_enabled
      ),
      revoked_at: revokedAt || null,
    },
    disclaimer: vaultFirstTruthy(src?.disclaimer, shop?.disclaimer),
    watermark_text: vaultFirstTruthy(
      src?.watermark_text,
      shop?.watermark_text,
      vaultFirstTruthy(shop?.name, src?.code, src?.token)
    ),
    raw: raw,
  };
}

export async function createVaultShopAccessLink(
  input: CreateVaultShopAccessLinkInput
): Promise<VaultLinkItem> {
  const shopId = String(input.shop_id);
  const nestedBody = {
    ...input,
  };
  delete (nestedBody as any).shop_id;

  const res = await vaultTryJson<any>(
    [
      {
        method: "POST",
        path: `/marketplace/shops/${encodeURIComponent(shopId)}/vault-access-links`,
        body: nestedBody,
      },
      {
        method: "POST",
        path: `/marketplace/shops/${encodeURIComponent(shopId)}/vault-links`,
        body: nestedBody,
      },
      {
        method: "POST",
        path: `/marketplace/vault-access-links`,
        body: input,
      },
      {
        method: "POST",
        path: `/marketplace/vault-links`,
        body: input,
      },
      {
        method: "POST",
        path: `/vault-access-links`,
        body: input,
      },
      {
        method: "POST",
        path: `/vault-links`,
        body: input,
      },
    ],
    true
  );

  return normalizeVaultLinkItem(res);
}

export async function listVaultShopAccessLinks(
  shopId: number | string
): Promise<VaultLinkItem[]> {
  const safeShopId = String(shopId);

  const res = await vaultTryJson<any>(
    [
      {
        method: "GET",
        path: `/marketplace/shops/${encodeURIComponent(safeShopId)}/vault-access-links`,
      },
      {
        method: "GET",
        path: `/marketplace/shops/${encodeURIComponent(safeShopId)}/vault-links`,
      },
      {
        method: "GET",
        path: `/marketplace/vault-access-links?shop_id=${encodeURIComponent(safeShopId)}`,
      },
      {
        method: "GET",
        path: `/marketplace/vault-links?shop_id=${encodeURIComponent(safeShopId)}`,
      },
      {
        method: "GET",
        path: `/vault-access-links?shop_id=${encodeURIComponent(safeShopId)}`,
      },
      {
        method: "GET",
        path: `/vault-links?shop_id=${encodeURIComponent(safeShopId)}`,
      },
    ],
    true
  );

  return vaultRowsOf<any>(res).map((row) => normalizeVaultLinkItem(row));
}

export async function revokeVaultShopAccessLink(
  linkId: number | string
): Promise<VaultLinkItem> {
  const safeLinkId = String(linkId);

  const res = await vaultTryJson<any>(
    [
      {
        method: "POST",
        path: `/marketplace/vault-access-links/${encodeURIComponent(safeLinkId)}/revoke`,
      },
      {
        method: "POST",
        path: `/marketplace/vault-links/${encodeURIComponent(safeLinkId)}/revoke`,
      },
      {
        method: "POST",
        path: `/vault-access-links/${encodeURIComponent(safeLinkId)}/revoke`,
      },
      {
        method: "POST",
        path: `/vault-links/${encodeURIComponent(safeLinkId)}/revoke`,
      },
    ],
    true
  );

  return normalizeVaultLinkItem(res);
}

export async function extendVaultShopAccessLink(
  linkId: number | string,
  expiresAt: string
): Promise<VaultLinkItem> {
  const safeLinkId = String(linkId);

  const res = await vaultTryJson<any>(
    [
      {
        method: "POST",
        path: `/marketplace/vault-access-links/${encodeURIComponent(safeLinkId)}/extend`,
        body: { expires_at: expiresAt },
      },
      {
        method: "POST",
        path: `/marketplace/vault-links/${encodeURIComponent(safeLinkId)}/extend`,
        body: { expires_at: expiresAt },
      },
      {
        method: "POST",
        path: `/vault-access-links/${encodeURIComponent(safeLinkId)}/extend`,
        body: { expires_at: expiresAt },
      },
      {
        method: "POST",
        path: `/vault-links/${encodeURIComponent(safeLinkId)}/extend`,
        body: { expires_at: expiresAt },
      },
    ],
    true
  );

  return normalizeVaultLinkItem(res);
}

export async function getVaultShopAccessView(
  token: string
): Promise<VaultShopAccessView> {
  const safeToken = vaultSafeStr(token);

  const res = await vaultTryJson<any>(
    [
      {
        method: "GET",
        path: `/marketplace/vault-access/${encodeURIComponent(safeToken)}`,
      },
      {
        method: "GET",
        path: `/marketplace/vault-access/${encodeURIComponent(safeToken)}/view`,
      },
      {
        method: "GET",
        path: `/marketplace/vault-shops/access/${encodeURIComponent(safeToken)}`,
      },
      {
        method: "GET",
        path: `/marketplace/vault-shops/access/${encodeURIComponent(safeToken)}/view`,
      },
      {
        method: "GET",
        path: `/vault-access/${encodeURIComponent(safeToken)}`,
      },
      {
        method: "GET",
        path: `/vault-access/${encodeURIComponent(safeToken)}/view`,
      },
      {
        method: "GET",
        path: `/vault-shops/access/${encodeURIComponent(safeToken)}`,
      },
      {
        method: "GET",
        path: `/vault-shops/access/${encodeURIComponent(safeToken)}/view`,
      },
    ],
    false
  );

  return normalizeVaultAccessView(res);
}

export async function recordVaultShopAccessOpen(
  token: string
): Promise<any> {
  const safeToken = vaultSafeStr(token);

  return vaultTryJson<any>(
    [
      {
        method: "POST",
        path: `/marketplace/vault-access/${encodeURIComponent(safeToken)}/open`,
      },
      {
        method: "POST",
        path: `/marketplace/vault-shops/access/${encodeURIComponent(safeToken)}/open`,
      },
      {
        method: "POST",
        path: `/vault-access/${encodeURIComponent(safeToken)}/open`,
      },
      {
        method: "POST",
        path: `/vault-shops/access/${encodeURIComponent(safeToken)}/open`,
      },
    ],
    false
  );
}
