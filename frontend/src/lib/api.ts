const API_BASE_URL_RAW: string =
  (typeof import.meta !== "undefined" &&
    (import.meta as any)?.env &&
    (import.meta as any).env.VITE_API_BASE_URL) ||
  "/api";

function normalizeApiBaseUrl(raw: unknown): string {
  const base = String(raw || "").trim().replace(/\/+$/, "");
  if (!base) return "";

  if (/^https?:\/\//i.test(base)) {
    try {
      const url = new URL(base);
      const path = url.pathname.replace(/\/+$/, "");

      if (path.toLowerCase() === "/api") {
        return url.origin;
      }

      url.search = "";
      url.hash = "";
      url.pathname = path;
      return url.toString().replace(/\/+$/, "");
    } catch {
      return base;
    }
  }

  return base;
}

function localBackendOrigin(): string {
  if (typeof window === "undefined") return "";

  const hostname = String(window.location?.hostname || "").trim().toLowerCase();
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1"
  ) {
    return "http://127.0.0.1:8012";
  }

  return "";
}

function resolveApiBaseUrl(raw: unknown): string {
  const normalized = normalizeApiBaseUrl(raw);

  if (normalized === "/api" && typeof window !== "undefined") {
    const port = String(window.location?.port || "").trim();
    if (port && port !== "5173") {
      return localBackendOrigin() || normalized;
    }
  }

  return normalized;
}

const API_BASE_URL = resolveApiBaseUrl(API_BASE_URL_RAW);

export type EntryMode =
  | "general"
  | "create"
  | "invite"
  | "approved"
  | "existing";

export type WelcomeIntent = "invited" | "founder" | "approved" | "existing";

type RequestOptions = {
  header_clan_id?: number | null;
  includeAuth?: boolean;
  quiet?: boolean;
  timeoutMs?: number;
};

class HttpStatusError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpStatusError";
    this.status = status;
  }
}

const DEFAULT_JSON_TIMEOUT_MS = 30000;
const DEFAULT_MULTIPART_TIMEOUT_MS = 60000;

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error(
        "The server did not finish this request. Please check your connection and try again."
      );
    }
    throw err;
  } finally {
    globalThis.clearTimeout(timer);
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
  } catch {
    // Storage writes are best-effort only.
  }
}

function buildUrl(path: string): string {
  const p = String(path || "").startsWith("/")
    ? String(path)
    : `/${String(path || "")}`;

  if (!API_BASE_URL) return p;

  return `${API_BASE_URL}${p}`;
}

const ACCESS_TOKEN_KEY = "access_token";
const GMFN_CURRENT_ID_KEY = "gmfn_current_id";
const GMFN_SELECTED_CLAN_ID_KEY = "gmfn_selected_clan_id";
const GMFN_ENTRY_MODE_KEY = "gmfn_entry_mode";
const GMFN_ENTRY_INVITE_CODE_KEY = "gmfn_entry_invite_code";
const GMFN_ENTRY_CREATE_CODE_KEY = "gmfn_entry_create_code";
const GMFN_MY_SETTINGS_KEY = "gmfn_my_settings";
const GMFN_ROLE_KEY = "gmfn_role";

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function setAccessToken(tok: string | null) {
  writeStorage(ACCESS_TOKEN_KEY, tok);
}

function normalizeGmfnId(value: unknown): string {
  const raw = String(value ?? "").trim().toUpperCase();
  if (!raw) return "";
  const gmfn = raw.replace(/^GSN-/, "GMFN-");
  return /^GMFN-[A-Z]-[A-Z0-9-]+$/.test(gmfn) ? gmfn : "";
}

export function getStoredGmfnId(): string | null {
  const gmfnId = normalizeGmfnId(readStorage(GMFN_CURRENT_ID_KEY));
  return gmfnId || null;
}

export function setStoredGmfnId(value: unknown): void {
  const gmfnId = normalizeGmfnId(value);
  writeStorage(GMFN_CURRENT_ID_KEY, gmfnId || null);
}

function rememberGmfnIdFrom(value: unknown): void {
  if (typeof value === "string") {
    const gmfnId = normalizeGmfnId(value);
    if (gmfnId) setStoredGmfnId(gmfnId);
    return;
  }

  const source = value as any;
  const gmfnId = normalizeGmfnId(
    source?.gmfn_id || source?.gmfnId || source?.gmfnID
  );
  if (gmfnId) setStoredGmfnId(gmfnId);
}

function rememberRoleFrom(value: unknown): void {
  const source = value as any;
  const role = String(
    source?.role ||
      source?.account_role ||
      source?.user_role ||
      (source?.is_admin === true || source?.isAdmin === true ? "admin" : "") ||
      (Array.isArray(source?.permissions) &&
      source.permissions.includes("admin")
        ? "admin"
        : "")
  )
    .trim()
    .toLowerCase();

  if (role) writeStorage(GMFN_ROLE_KEY, role);
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
  } catch {
    // Selected community persistence is best-effort only.
  }
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
  setStoredGmfnId(null);
  setSelectedClanId(null);
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(GMFN_ROLE_KEY);
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

function rowsFromApi<T = any>(input: any): T[] {
  if (Array.isArray(input)) return input as T[];
  if (Array.isArray(input?.items)) return input.items as T[];
  if (Array.isArray(input?.data?.items)) return input.data.items as T[];
  if (Array.isArray(input?.results)) return input.results as T[];
  if (Array.isArray(input?.rows)) return input.rows as T[];
  return [];
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

  const tok = options?.includeAuth === false ? null : getAccessToken();
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

  const res = await fetchWithTimeout(
    buildUrl(path),
    {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    options?.timeoutMs ?? DEFAULT_JSON_TIMEOUT_MS
  );

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

  const res = await fetchWithTimeout(
    buildUrl(path),
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: fd.toString(),
    },
    DEFAULT_JSON_TIMEOUT_MS
  );

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return readJsonOrTextSafe(res);
}

async function httpMultipart(
  path: string,
  form: FormData,
  options?: RequestOptions
): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const res = await fetchWithTimeout(
    buildUrl(path),
    {
      method: "POST",
      headers,
      body: form,
    },
    options?.timeoutMs ?? DEFAULT_MULTIPART_TIMEOUT_MS
  );

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return readJsonOrTextSafe(res);
}

/* =========================
   AUTH
   ========================= */

export async function login(
  username: string,
  password: string
): Promise<{ access_token: string; token_type: string; gmfn_id?: string | null }> {
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
    setStoredGmfnId(null);
  }
  rememberGmfnIdFrom(out);
  rememberRoleFrom(out);
  rememberGmfnIdFrom(username);
  return out;
}

export async function startPasswordRecovery(payload: {
  gmfn_id: string;
  phone_e164: string;
}): Promise<{
  ok: boolean;
  gmfn_id?: string | null;
  phone_mask?: string | null;
  prompts?: string[];
}> {
  return httpJson("/auth/password-recovery/start", "POST", {
    gmfn_id: String(payload?.gmfn_id || "").trim(),
    phone_e164: String(payload?.phone_e164 || "").trim(),
  });
}

export async function resetPasswordWithRecovery(payload: {
  gmfn_id: string;
  phone_e164: string;
  answers: string[];
  new_password: string;
  confirm_password: string;
}): Promise<{ access_token: string; token_type: string; gmfn_id?: string | null }> {
  const out = await httpJson("/auth/password-recovery/reset", "POST", {
    gmfn_id: String(payload?.gmfn_id || "").trim(),
    phone_e164: String(payload?.phone_e164 || "").trim(),
    answers: Array.isArray(payload?.answers)
      ? payload.answers.map((item) => String(item || "").trim())
      : [],
    new_password: String(payload?.new_password || ""),
    confirm_password: String(payload?.confirm_password || ""),
  });
  if (out?.access_token) {
    setAccessToken(out.access_token);
    setStoredGmfnId(null);
  }
  rememberGmfnIdFrom(out);
  rememberRoleFrom(out);
  return out;
}

export async function getMe() {
  const out = await httpJson("/auth/me", "GET");
  rememberGmfnIdFrom(out);
  rememberRoleFrom(out);
  return out;
}

export async function updateMyProfile(payload: {
  display_name: string;
}): Promise<any> {
  const out = await httpJson("/auth/me/profile", "PATCH", {
    display_name: String(payload?.display_name || "").trim(),
  });
  rememberGmfnIdFrom(out);
  rememberRoleFrom(out);
  return out;
}

export async function getMeWithToken(
  token: string,
  options?: { fresh?: boolean }
) {
  const cleaned = String(token || "").trim();
  if (!cleaned) {
    throw new Error("Session token is missing.");
  }

  const path = options?.fresh
    ? `/auth/me?session_check=${encodeURIComponent(String(Date.now()))}`
    : "/auth/me";
  const res = await fetchWithTimeout(
    buildUrl(path),
    {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${cleaned}`,
      },
    },
    DEFAULT_JSON_TIMEOUT_MS
  );

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  const out = await readJsonOrTextSafe(res);
  rememberGmfnIdFrom(out);
  rememberRoleFrom(out);
  return out;
}

export async function uploadMyProfileImageFile(file: File): Promise<any> {
  const tok = getAccessToken();
  if (!tok) {
    throw new Error("Sign in again before uploading your dashboard picture.");
  }

  const fd = new FormData();
  fd.append("file", file);

  const res = await fetchWithTimeout(
    buildUrl("/auth/me/profile-image/upload"),
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${tok}`,
      },
      body: fd,
    },
    DEFAULT_MULTIPART_TIMEOUT_MS
  );

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return readJsonOrTextSafe(res);
}

export async function removeMyProfileImage(): Promise<any> {
  return httpJson("/auth/me/profile-image", "DELETE");
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
  rememberGmfnIdFrom(out);
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
  rememberGmfnIdFrom(out);
  rememberGmfnIdFrom(cleaned.gmfn_id);
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
  display_name?: string | null;
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
        "The guide is available from the app content.",
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

export async function checkEntryCommunityName(clanName: string): Promise<any> {
  return httpJson(
    `/entry/community-name/check${buildQuery({ clan_name: clanName })}`,
    "GET"
  );
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

const GMFN_ENTRY_DEVICE_FINGERPRINT_KEY = "gmfn_entry_device_fingerprint:v1";

function detectEntryDeviceFingerprint(): string | undefined {
  try {
    const existing = String(readStorage(GMFN_ENTRY_DEVICE_FINGERPRINT_KEY) || "").trim();
    if (existing) return existing;

    const generated =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `entry-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
    writeStorage(GMFN_ENTRY_DEVICE_FINGERPRINT_KEY, generated);
    return generated;
  } catch {
    return undefined;
  }
}

function detectEntryDeviceLabel(): string | undefined {
  try {
    if (typeof navigator === "undefined") return undefined;
    const platform = String((navigator as any)?.platform || "").trim();
    const language = String((navigator as any)?.language || "").trim();
    const ua = String((navigator as any)?.userAgent || "").trim().slice(0, 80);
    return [platform, language, ua].filter(Boolean).join(" | ") || undefined;
  } catch {
    return undefined;
  }
}

export async function startEntryPhoneVerification(payload: {
  display_name: string;
  phone_e164: string;
  email?: string | null;
  country?: string | null;
  date_of_birth?: string | null;
  birth_country?: string | null;
  birth_place?: string | null;
  country_of_origin?: string | null;
  residential_area?: string | null;
}): Promise<any> {
    return httpJson("/entry/phone/start", "POST", {
      display_name: String(payload?.display_name || "").trim(),
      phone_e164: String(payload?.phone_e164 || "").trim(),
      email: String(payload?.email || "").trim() || undefined,
      country: String(payload?.country || "").trim() || undefined,
      date_of_birth: String(payload?.date_of_birth || "").trim() || undefined,
      birth_country: String(payload?.birth_country || "").trim() || undefined,
      birth_place: String(payload?.birth_place || "").trim() || undefined,
      country_of_origin: String(payload?.country_of_origin || "").trim() || undefined,
      residential_area: String(payload?.residential_area || "").trim() || undefined,
      browser_locale: detectBrowserLocale(),
      browser_timezone: detectBrowserTimezone(),
      client_fingerprint: detectEntryDeviceFingerprint(),
      device_label: detectEntryDeviceLabel(),
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

export async function resumeEntryPhoneVerification(payload: {
  verification_id: number | string;
  phone_e164: string;
}): Promise<any> {
  return httpJson("/entry/phone/resume", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    phone_e164: String(payload?.phone_e164 || "").trim(),
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

export async function recordEntryOfficialId(payload: {
  verification_id: number | string;
  document_type: string;
  document_reference: string;
  country: string;
  note?: string | null;
}): Promise<any> {
  return httpJson("/entry/official-id/record", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    document_type: String(payload?.document_type || "").trim(),
    document_reference: String(payload?.document_reference || "").trim(),
    country: String(payload?.country || "").trim(),
    note: String(payload?.note || "").trim() || undefined,
  });
}

export async function recordEntryIdentityPhoto(payload: {
  verification_id: number | string;
  file: File;
  document_type?: string | null;
  note?: string | null;
}): Promise<any> {
  const form = new FormData();
  form.append("verification_id", String(Number(payload?.verification_id || 0)));
  form.append("document_type", String(payload?.document_type || "selfie").trim() || "selfie");
  const note = String(payload?.note || "").trim();
  if (note) form.append("note", note);
  form.append("file", payload.file);
  return httpMultipart("/entry/identity-photo/record", form);
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

export async function startSignedInPhoneVerification(payload: {
  phone_e164: string;
  country?: string | null;
}): Promise<any> {
  return httpJson("/entry/signed-in/phone/start", "POST", {
    phone_e164: String(payload?.phone_e164 || "").trim(),
    country: String(payload?.country || "").trim() || undefined,
  });
}

export async function confirmSignedInPhoneVerification(payload: {
  verification_id: number | string;
  code: string;
}): Promise<any> {
  return httpJson("/entry/signed-in/phone/confirm", "POST", {
    verification_id: Number(payload?.verification_id || 0),
    code: String(payload?.code || "").trim(),
  });
}

export async function recordSignedInOfficialId(payload: {
  document_type: string;
  document_reference: string;
  country: string;
  note?: string | null;
}): Promise<any> {
  return httpJson("/entry/signed-in/official-id/record", "POST", {
    document_type: String(payload?.document_type || "").trim(),
    document_reference: String(payload?.document_reference || "").trim(),
    country: String(payload?.country || "").trim(),
    note: String(payload?.note || "").trim() || undefined,
  });
}

export async function recordSignedInIdentityPhoto(payload: {
  file: File;
  document_type?: string | null;
  note?: string | null;
}): Promise<any> {
  const form = new FormData();
  form.append("document_type", String(payload?.document_type || "selfie").trim() || "selfie");
  const note = String(payload?.note || "").trim();
  if (note) form.append("note", note);
  form.append("file", payload.file);
  return httpMultipart("/entry/signed-in/identity-photo/record", form, {
    timeoutMs: 60000,
  });
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

export async function listCommunityMeetings(params: {
  clan_id: number;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/community-meetings${buildQuery({
      clan_id: params.clan_id,
      limit: params.limit ?? 5,
    })}`,
    "GET"
  );
}

export async function listCommunityNotices(params: {
  clan_id: number;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/community-notices${buildQuery({
      clan_id: params.clan_id,
      limit: params.limit ?? 5,
    })}`,
    "GET"
  );
}

export async function createCommunityNotice(payload: {
  clan_id: number;
  body: string;
  expiry_policy?: "standard" | "urgent" | "event" | "pinned";
  expires_at?: string;
}): Promise<any> {
  return httpJson("/community-notices", "POST", payload);
}

export async function updateCommunityNoticeSettings(
  clanId: number,
  payload: { posting_policy: "members" | "admins" }
): Promise<any> {
  return httpJson(
    `/community-notices/settings${buildQuery({ clan_id: clanId })}`,
    "PATCH",
    payload
  );
}

export async function listCommunityDomainNotices(
  communityDomainId: number | string,
  params: { limit?: number } = {}
): Promise<any> {
  return httpJson(
    `/community-domains/${encodeURIComponent(
      String(communityDomainId)
    )}/notices${buildQuery({
      limit: params.limit ?? 5,
    })}`,
    "GET"
  );
}

export async function createCommunityDomainNotice(
  communityDomainId: number | string,
  payload: {
    body: string;
    expiry_policy?: "standard" | "urgent" | "event" | "pinned";
    expires_at?: string;
  }
): Promise<any> {
  return httpJson(
    `/community-domains/${encodeURIComponent(String(communityDomainId))}/notices`,
    "POST",
    payload
  );
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

export type ClanInviteRelationshipEvidencePayload = {
  evidence_source?: string | null;
  invitation_context?: string | null;
  relationship_type?: string | null;
  known_duration?: string | null;
  confidence_level?: string | null;
  relationship_context?: string | null;
  first_circle_role?: string | null;
  first_circle_ready_count?: number | null;
  first_circle_selected_count?: number | null;
};

export async function createClanInvite(
  clanId: number,
  payload?: {
    relationship_evidence?: ClanInviteRelationshipEvidencePayload | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/invite`,
    "POST",
    payload,
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

export async function submitJoinRequest(
  payload: {
    invite_code: string;
    existing_gmfn_id?: string | null;
    first_name?: string | null;
    surname?: string | null;
    phone_e164?: string | null;
    country?: string | null;
    date_of_birth?: string | null;
    birth_country?: string | null;
    birth_place?: string | null;
    country_of_origin?: string | null;
    residential_area?: string | null;
    business_name?: string | null;
    note?: string | null;
  },
  options?: { includeAuth?: boolean }
): Promise<any> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const tok = options?.includeAuth === false ? null : getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const res = await fetchWithTimeout(
    buildUrl("/clans/join-requests"),
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
    DEFAULT_JSON_TIMEOUT_MS
  );

  if (res.ok) {
    if (res.status === 204) return null;
    return readJsonOrTextSafe(res);
  }

  const parsed = await readJsonOrTextSafe(res);
  const detail =
    parsed && typeof parsed === "object" ? (parsed as any).detail ?? null : null;

  if (
    res.status === 409 &&
    detail &&
    typeof detail === "object"
  ) {
    const code = String((detail as any).code || "").trim().toLowerCase();
    if (/_request_exists$/.test(code)) {
      return {
        ok: false,
        existing_request: true,
        existing_pending_request: code === "pending_request_exists",
        request_id: (detail as any).request_id,
        status: (detail as any).status,
        community_id: (detail as any).community_id,
        community_code: (detail as any).community_code,
        community_name: (detail as any).community_name,
        marketplace_name: (detail as any).marketplace_name,
        submitted_at: (detail as any).submitted_at,
        pending_status_path: (detail as any).pending_status_path,
        approval_path: (detail as any).approval_path,
        activation_path: (detail as any).activation_path,
        activation_link: (detail as any).activation_link,
        activation_delivery_status: (detail as any).activation_delivery_status,
        activation_delivered_at: (detail as any).activation_delivered_at,
        activation_required: (detail as any).activation_required,
        existing_identity: (detail as any).existing_identity,
        identity_reused: (detail as any).identity_reused,
        result_channel: (detail as any).result_channel,
        result_path: (detail as any).result_path,
        gmfn_id: (detail as any).gmfn_id,
        message:
          String((detail as any).message || "").trim() ||
          "A previous join request already exists for this invite.",
      };
    }
  }

  const message =
    parsed && typeof parsed === "object"
      ? typeof (parsed as any).detail === "string"
        ? String((parsed as any).detail)
        : typeof (parsed as any).message === "string"
          ? String((parsed as any).message)
          : await parseError(
              new Response(JSON.stringify(parsed), { status: res.status })
            )
      : await parseError(
          new Response(typeof parsed === "string" ? parsed : "", {
            status: res.status,
          })
        );

  throw new HttpStatusError(res.status, message || `HTTP ${res.status}`);
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

export async function getJoinInviteRequestStatus(
  code: string,
  phone_e164: string,
  options?: {
    community_code?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/join-invite/request-status${buildQuery({
      code,
      phone_e164,
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
  vote: "approve" | "reject" | "neutral",
  reason?: { reason_code?: string | null; reason_text?: string | null }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(clanId))}/join-requests/${encodeURIComponent(
      String(joinRequestId)
    )}/vote`,
    "POST",
    {
      vote,
      reason_code: String(reason?.reason_code || "").trim() || `${vote}_reason`,
      reason_text: String(reason?.reason_text || "").trim() || undefined,
    },
    { header_clan_id: clanId }
  );
}

/* =========================
   LOANS / POOL
   ========================= */

export async function listMyLoans(options?: {
  clan_id?: number | null;
}): Promise<any> {
  const requestOptions =
    options && Object.prototype.hasOwnProperty.call(options, "clan_id")
      ? { header_clan_id: options.clan_id ?? null }
      : undefined;

  return httpJson("/loans", "GET", undefined, requestOptions);
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

export async function createRepaymentClaim(
  loanId: number,
  payload: { payment_reference: string; note?: string | null }
): Promise<any> {
  return httpJson(
    `/loans/${encodeURIComponent(String(loanId))}/repayment-claim`,
    "POST",
    {
      payment_reference: String(payload.payment_reference || "").trim(),
      note: String(payload.note || "").trim() || undefined,
    }
  );
}

export async function createLoanRequest(payload: {
  clan_id?: number | null;
  amount: string;
  currency?: string | null;
  duration_days?: number | null;
  repayment_cadence?: string | null;
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
  const repaymentCadence = String(payload?.repayment_cadence || "").trim();
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

  if (repaymentCadence) {
    cleaned.repayment_cadence = repaymentCadence;
    cleaned.cadence = repaymentCadence;
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
    throw new Error("supporter user id or GSN id is required");
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
  pledge_amount: string;
  clan_id?: number | null;
}): Promise<any> {
  const loanId = Number(payload?.loan_id || 0);
  const guarantorUserId = Number(payload?.guarantor_user_id || 0);
  const pledgeAmount = String(payload?.pledge_amount ?? "").trim();

  if (!loanId) {
    throw new Error("loan_id is required");
  }

  if (!guarantorUserId) {
    throw new Error("supporter user id is required");
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
  sort_code?: string | null;
  bank_sort_code?: string | null;
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
  const sortCode = String(
    payload?.sort_code || payload?.bank_sort_code || ""
  ).trim();
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

  if (sortCode) {
    cleaned.sort_code = sortCode;
    cleaned.bank_sort_code = sortCode;
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
  sort_code?: string | null;
  bank_sort_code?: string | null;
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
  sort_code?: string | null;
  bank_sort_code?: string | null;
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

export async function getClanTrustScoreExplained(params?: {
  clan_id?: number | null;
  limit?: number;
  include_global_events?: boolean;
}): Promise<any> {
  return httpJson(
    `/trust/score/explained-clan${buildQuery({
      limit: params?.limit || 25,
      include_global_events: params?.include_global_events ? true : undefined,
    })}`,
    "GET",
    undefined,
    params && Object.prototype.hasOwnProperty.call(params, "clan_id")
      ? { header_clan_id: params.clan_id ?? null }
      : undefined
  );
}

export async function getMyTrustSlip(): Promise<any> {
  return httpJson("/trust-slips/me", "GET");
}

export async function reissueMyTrustSlip(params?: {
  reason?: string;
  force?: boolean;
}): Promise<any> {
  return httpJson("/trust-slips/me/reissue", "POST", {
    reason: params?.reason || "holder_requested_fresh_public_trustslip",
    force: params?.force ?? true,
  });
}

export async function verifyTrustSlip(
  code: string,
  level?: "minimal" | "standard" | "detailed"
): Promise<any> {
  return httpJson(
    `/trust-slips/verify/${encodeURIComponent(String(code))}${buildQuery({
      level: level || undefined,
    })}`,
    "GET",
    undefined,
    { includeAuth: false, header_clan_id: null }
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

export async function requestCommunityConfirmation(payload: {
  trust_slip_code?: string | null;
  subject_user_id?: number | string | null;
  community_id?: number | string | null;
  requester_external_label?: string | null;
  requester_callback_channel?: "sms" | "whatsapp" | "none" | string | null;
  requester_callback_contact?: string | null;
  requester_callback_consent?: boolean | null;
  reason_type?: string | null;
  risk_level?: string | null;
  mode?: "relay" | "instant_pulse" | string | null;
}): Promise<any> {
  return httpJson("/community-confirmations/request", "POST", {
    trust_slip_code: payload.trust_slip_code || undefined,
    subject_user_id: payload.subject_user_id || undefined,
    community_id: payload.community_id || undefined,
    requester_external_label: payload.requester_external_label || undefined,
    requester_callback_channel: payload.requester_callback_channel || undefined,
    requester_callback_contact: payload.requester_callback_contact || undefined,
    requester_callback_consent: Boolean(payload.requester_callback_consent),
    reason_type: payload.reason_type || "merchant_trust_check",
    risk_level: payload.risk_level || "low",
    mode: payload.mode || "instant_pulse",
  });
}

export async function getPublicCommunityConfirmation(
  publicToken: string
): Promise<any> {
  return httpJson(
    `/community-confirmations/public/${encodeURIComponent(String(publicToken))}`,
    "GET",
    undefined,
    { includeAuth: false, header_clan_id: null }
  );
}

export async function getPublicCommunityVerification(
  communityKey: string | number
): Promise<any> {
  return httpJson(
    `/verify/community/${encodeURIComponent(String(communityKey))}`,
    "GET",
    undefined,
    { includeAuth: false, header_clan_id: null }
  );
}

export async function getPublicCommunityMemberVerification(
  communityKey: string | number,
  memberKey: string | number
): Promise<any> {
  return httpJson(
    `/verify/community/${encodeURIComponent(String(communityKey))}/member/${encodeURIComponent(
      String(memberKey)
    )}`,
    "GET",
    undefined,
    { includeAuth: false, header_clan_id: null }
  );
}

export async function requestPublicCommunityVerificationConfirmation(
  communityKey: string | number,
  payload: {
    requester_external_label?: string | null;
  } = {}
): Promise<any> {
  return httpJson(
    `/verify/community/${encodeURIComponent(String(communityKey))}/confirmation-request`,
    "POST",
    {
      requester_external_label: payload.requester_external_label || undefined,
    }
  );
}

export type CommunityDomainDraftPayload = {
  domain_name: string;
  display_name: string;
  domain_type?: string | null;
  template_key?: string | null;
  country?: string | null;
  state?: string | null;
  public_profile?: string | null;
};

export type CommunityDomainNodePayload = {
  parent_node_id?: number | string | null;
  name: string;
  node_type?: string | null;
  node_kind?: string | null;
  description?: string | null;
  sort_order?: number | string | null;
  visibility_policy?: string | null;
  inherits_parent_policy?: boolean | null;
  status?: string | null;
};

export type CommunityDomainMembershipPayload = {
  user_id: number | string;
  role?: string | null;
  title?: string | null;
  status?: string | null;
};

export type CommunityDomainMembershipRequestPayload = {
  request_note?: string | null;
  title?: string | null;
};

export type CommunityDomainPolicyPayload = {
  policy_key: string;
  action_key: string;
  community_node_id?: number | string | null;
  scope_type?: string | null;
  review_mode?: string | null;
  required_role?: string | null;
  status?: string | null;
  policy_summary?: string | null;
  config?: Record<string, any> | null;
};

export type CommunityDomainActionReviewPayload = {
  policy_id?: number | string | null;
  community_node_id?: number | string | null;
  action_key: string;
  subject_user_id?: number | string | null;
  target_type?: string | null;
  target_id?: string | number | null;
  request_note?: string | null;
  payload?: Record<string, any> | null;
};

export type CommunityDomainActionReviewRevisionPayload = {
  subject_user_id?: number | string | null;
  target_type?: string | null;
  target_id?: string | number | null;
  request_note?: string | null;
  payload?: Record<string, any> | null;
};

export type CommunityDomainReviewDecision =
  | "approve"
  | "reject"
  | "needs_changes"
  | "recuse";

export type CommunityDomainReviewDecisionPayload = {
  decision: CommunityDomainReviewDecision;
  decision_note?: string | null;
};

export type CommunityDomainReviewEvidencePayload = {
  evidence_type?: string | null;
  title: string;
  description?: string | null;
  file_name?: string | null;
  content_type?: string | null;
  storage_key?: string | null;
  external_reference?: string | null;
  checksum?: string | null;
};

function communityDomainPath(
  communityDomainId: number | string,
  suffix: string = ""
): string {
  const base = `/community-domains/${encodeURIComponent(String(communityDomainId))}`;
  return suffix ? `${base}${suffix}` : base;
}

function communityDomainNodePath(
  communityDomainId: number | string,
  communityNodeId: number | string,
  suffix: string = ""
): string {
  return `${communityDomainPath(
    communityDomainId,
    `/nodes/${encodeURIComponent(String(communityNodeId))}`
  )}${suffix}`;
}

function communityDomainReviewPath(
  communityDomainId: number | string,
  reviewId: number | string,
  suffix: string = ""
): string {
  return `${communityDomainPath(
    communityDomainId,
    `/action-reviews/${encodeURIComponent(String(reviewId))}`
  )}${suffix}`;
}

export async function checkCommunityDomainAvailability(
  domainName: string
): Promise<any> {
  return httpJson(
    `/community-domains/availability${buildQuery({ domain_name: domainName })}`,
    "GET"
  );
}

export async function listCommunityDomainTemplates(): Promise<any> {
  return httpJson("/community-domains/templates", "GET");
}

export async function getCommunityDomainTemplateOperatingBlueprint(
  templateKey: string
): Promise<any> {
  return httpJson(
    `/community-domains/templates/${encodeURIComponent(templateKey)}/operating-blueprint`,
    "GET"
  );
}

export async function createCommunityDomainDraft(
  payload: CommunityDomainDraftPayload
): Promise<any> {
  return httpJson("/community-domains/drafts", "POST", {
    domain_name: payload.domain_name,
    display_name: payload.display_name,
    domain_type: payload.domain_type || undefined,
    template_key: payload.template_key || undefined,
    country: payload.country || undefined,
    state: payload.state || undefined,
    public_profile: payload.public_profile || undefined,
  });
}

export async function updateCommunityDomainProfile(
  communityDomainId: number | string,
  payload: CommunityDomainDraftPayload
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/profile"), "PATCH", {
    domain_name: payload.domain_name,
    display_name: payload.display_name,
    domain_type: payload.domain_type || undefined,
    template_key: payload.template_key || undefined,
    country: payload.country || undefined,
    state: payload.state || undefined,
    public_profile: payload.public_profile || undefined,
  });
}

export async function createCommunityDomainPackageQuote(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/package-quote"), "POST");
}

export async function createCommunityDomainPaymentInstruction(
  communityDomainId: number | string,
  payload: {
    clan_id: number;
    amount: string | number;
    currency?: string;
    billing_cycle?: string;
    quote_note?: string;
    settlement_country?: string;
  }
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/payment-instruction"),
    "POST",
    payload,
    { header_clan_id: payload.clan_id }
  );
}

export async function getCommunityDomainSetupEvidence(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/setup-evidence"), "GET");
}

export async function submitCommunityDomainSetupEvidence(
  communityDomainId: number | string,
  payload: {
    evidence_type?: string;
    title: string;
    description?: string;
    external_reference?: string;
    file?: File | null;
  }
): Promise<any> {
  const form = new FormData();
  form.set("evidence_type", payload.evidence_type || "authority_document");
  form.set("title", payload.title);
  if (payload.description) form.set("description", payload.description);
  if (payload.external_reference) {
    form.set("external_reference", payload.external_reference);
  }
  if (payload.file) form.set("file", payload.file);
  return httpMultipart(
    communityDomainPath(communityDomainId, "/setup-evidence"),
    form
  );
}

export async function delegateCommunityDomainSetupEditor(
  communityDomainId: number | string,
  payload: {
    subject: string;
    action?: "appoint" | "revoke" | "request";
    title?: string;
    note?: string;
  }
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/setup-editor"), "POST", {
    subject: payload.subject,
    action: payload.action || "appoint",
    title: payload.title || undefined,
    note: payload.note || undefined,
  });
}

export async function listMyCommunityDomains(): Promise<any> {
  return httpJson("/community-domains/my", "GET");
}

export async function lookupCommunityDomainByName(domainName: string): Promise<any> {
  return httpJson(
    `/community-domains/lookup${buildQuery({ domain_name: domainName })}`,
    "GET"
  );
}

export async function getCommunityDomain(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId), "GET");
}

export async function getCommunityDomainDashboard(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/dashboard"), "GET");
}

export async function getCommunityDomainOperatingMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/operating-map"), "GET");
}

export async function getCommunityDomainTemplateFit(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/template-fit"), "GET");
}

export async function getCommunityDomainSetupPlan(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/setup-plan"), "GET");
}

export async function getCommunityDomainCapacityPlan(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/capacity-plan"), "GET");
}

export async function getCommunityDomainRolloutPlan(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/rollout-plan"), "GET");
}

export async function getCommunityDomainRolloutTree(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/rollout-tree"), "GET");
}

export async function getCommunityDomainNodeAutonomyMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-autonomy-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeEconomicMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-economic-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeActivityMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-activity-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeTrustMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-trust-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeParticipationMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-participation-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeServiceMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-service-map"),
    "GET"
  );
}

export async function getCommunityDomainNodePrivacyMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-privacy-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeAnalyticsMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-analytics-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeDomainBoundaryMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-domain-boundary-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeEvidenceAuthorityMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-evidence-authority-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeCommunicationMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-communication-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeVaultMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-vault-map"),
    "GET"
  );
}

export async function getCommunityDomainNodeScheduledActivityMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-scheduled-activity-map"),
    "GET"
  );
}

export async function getCommunityDomainNodePaidActivityMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/node-paid-activity-map"),
    "GET"
  );
}

export async function getCommunityDomainGovernanceCoverage(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/governance-coverage"),
    "GET"
  );
}

export async function getCommunityDomainAnalytics(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/analytics"), "GET");
}

export async function getCommunityDomainEvidenceMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/evidence-map"), "GET");
}

export async function getCommunityDomainEvidenceRecordReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/evidence-record-readiness"),
    "GET"
  );
}

export async function getCommunityDomainEvidenceReleaseReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/evidence-release-readiness"),
    "GET"
  );
}

export async function getCommunityDomainTrustRelayReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/trust-relay-readiness"),
    "GET"
  );
}

export async function getCommunityDomainNotificationScopeReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/notification-scope-readiness"),
    "GET"
  );
}

export async function getCommunityDomainTrustMobility(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/trust-mobility"),
    "GET"
  );
}

export async function getCommunityDomainSubscriptionLifecycle(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/subscription-lifecycle"),
    "GET"
  );
}

export async function getCommunityDomainSocialBridge(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/social-bridge"), "GET");
}

export async function getCommunityDomainAffiliationReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/affiliation-readiness"),
    "GET"
  );
}

export async function getCommunityDomainInstitutionalProfile(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/institutional-profile"),
    "GET"
  );
}

export async function getCommunityDomainDelegationMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/delegation-map"), "GET");
}

export async function getCommunityDomainIdentityContext(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/identity-context"), "GET");
}

export async function getCommunityDomainActivityMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/activity-map"), "GET");
}

export async function getCommunityDomainActivityGroupReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/activity-group-readiness"),
    "GET"
  );
}

export async function getCommunityDomainMemberVerificationMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/member-verification-map"),
    "GET"
  );
}

export async function getCommunityDomainNetworkExchangeMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/network-exchange-map"),
    "GET"
  );
}

export async function getCommunityDomainRecordPrivacyMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/record-privacy-map"),
    "GET"
  );
}

export async function getCommunityDomainConfigurationMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/configuration-map"),
    "GET"
  );
}

export async function getCommunityDomainComplianceMap(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/compliance-map"),
    "GET"
  );
}

export async function getCommunityDomainAppealReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/appeal-readiness"),
    "GET"
  );
}

export async function listCommunityDomainServiceSettings(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/service-settings"), "GET");
}

export async function getCommunityDomainModuleScopeReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/module-scope-readiness"),
    "GET"
  );
}

export async function getCommunityDomainEconomicParticipation(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/economic-participation"),
    "GET"
  );
}

export async function getCommunityDomainNetworkPresence(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/network-presence"),
    "GET"
  );
}

export async function listCommunityDomainRoles(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/roles"), "GET");
}

export async function getCommunityDomainGovernanceModel(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/governance-model"), "GET");
}

export async function getCommunityDomainReadiness(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/readiness"), "GET");
}

export async function getCommunityDomainVerificationRequirements(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/verification-requirements"),
    "GET"
  );
}

export async function getCommunityDomainActivationRequirements(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/activation-requirements"),
    "GET"
  );
}

export async function listCommunityDomainNodes(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/nodes"), "GET");
}

export async function listCommunityDomainNodeTree(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/nodes/tree"), "GET");
}

export async function getCommunityDomainNodeOperatingSummary(
  communityDomainId: number | string,
  communityNodeId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(
      communityDomainId,
      `/nodes/${encodeURIComponent(String(communityNodeId))}/operating-summary`
    ),
    "GET"
  );
}

export async function createCommunityDomainNode(
  communityDomainId: number | string,
  payload: CommunityDomainNodePayload
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/nodes"), "POST", {
    parent_node_id: payload.parent_node_id || undefined,
    name: payload.name,
    node_type: payload.node_type || undefined,
    node_kind: payload.node_kind || undefined,
    description: payload.description || undefined,
    sort_order: payload.sort_order ?? undefined,
    visibility_policy: payload.visibility_policy || undefined,
    inherits_parent_policy:
      payload.inherits_parent_policy == null
        ? undefined
        : Boolean(payload.inherits_parent_policy),
    status: payload.status || undefined,
  });
}

export async function getCommunityDomainNodeStatusImpact(
  communityDomainId: number | string,
  communityNodeId: number | string
): Promise<any> {
  return httpJson(
    communityDomainNodePath(communityDomainId, communityNodeId, "/status-impact"),
    "GET"
  );
}

export async function updateCommunityDomainNodeStatus(
  communityDomainId: number | string,
  communityNodeId: number | string,
  payload: { status: string; status_note?: string | null }
): Promise<any> {
  return httpJson(
    communityDomainNodePath(communityDomainId, communityNodeId, "/status"),
    "PATCH",
    {
      status: payload.status,
      status_note: payload.status_note || undefined,
    }
  );
}

export async function listCommunityDomainMembers(
  communityDomainId: number | string
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/members"), "GET");
}

export async function getCommunityDomainMemberPlacementSummary(
  communityDomainId: number | string,
  userId: number | string
): Promise<any> {
  return httpJson(
    communityDomainPath(
      communityDomainId,
      `/members/${encodeURIComponent(String(userId))}/placement-summary`
    ),
    "GET"
  );
}

export async function requestCommunityDomainMembership(
  communityDomainId: number | string,
  payload: CommunityDomainMembershipRequestPayload = {}
): Promise<any> {
  return httpJson(
    communityDomainPath(communityDomainId, "/membership-requests"),
    "POST",
    {
      request_note: payload.request_note || undefined,
      title: payload.title || undefined,
    }
  );
}

export async function listMyCommunityDomainMembershipRequests(
  communityDomainId: number | string,
  params: { status?: string | null } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/membership-requests/my")}${buildQuery({
      status: params.status || undefined,
    })}`,
    "GET"
  );
}

export async function upsertCommunityDomainMember(
  communityDomainId: number | string,
  payload: CommunityDomainMembershipPayload
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/members"), "POST", {
    user_id: Number(payload.user_id),
    role: payload.role || undefined,
    title: payload.title || undefined,
    status: payload.status || undefined,
  });
}

export async function listCommunityDomainNodeMembers(
  communityDomainId: number | string,
  communityNodeId: number | string
): Promise<any> {
  return httpJson(
    communityDomainNodePath(communityDomainId, communityNodeId, "/members"),
    "GET"
  );
}

export async function upsertCommunityDomainNodeMember(
  communityDomainId: number | string,
  communityNodeId: number | string,
  payload: CommunityDomainMembershipPayload
): Promise<any> {
  return httpJson(
    communityDomainNodePath(communityDomainId, communityNodeId, "/members"),
    "POST",
    {
      user_id: Number(payload.user_id),
      role: payload.role || undefined,
      title: payload.title || undefined,
      status: payload.status || undefined,
    }
  );
}

export async function listCommunityDomainPolicies(
  communityDomainId: number | string,
  params: { community_node_id?: number | string | null } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/policies")}${buildQuery({
      community_node_id: params.community_node_id || undefined,
    })}`,
    "GET"
  );
}

export async function upsertCommunityDomainPolicy(
  communityDomainId: number | string,
  payload: CommunityDomainPolicyPayload
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/policies"), "POST", {
    policy_key: payload.policy_key,
    action_key: payload.action_key,
    community_node_id: payload.community_node_id || undefined,
    scope_type: payload.scope_type || undefined,
    review_mode: payload.review_mode || undefined,
    required_role: payload.required_role || undefined,
    status: payload.status || undefined,
    policy_summary: payload.policy_summary || undefined,
    config: payload.config || undefined,
  });
}

export async function listCommunityDomainActionReviews(
  communityDomainId: number | string,
  params: {
    community_node_id?: number | string | null;
    include_descendants?: boolean | null;
    user_id?: number | string | null;
    status?: string | null;
  } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/action-reviews")}${buildQuery({
      community_node_id: params.community_node_id || undefined,
      include_descendants: params.include_descendants ? true : undefined,
      user_id: params.user_id || undefined,
      status: params.status || undefined,
    })}`,
    "GET"
  );
}

export async function createCommunityDomainActionReview(
  communityDomainId: number | string,
  payload: CommunityDomainActionReviewPayload
): Promise<any> {
  return httpJson(communityDomainPath(communityDomainId, "/action-reviews"), "POST", {
    policy_id: payload.policy_id || undefined,
    community_node_id: payload.community_node_id || undefined,
    action_key: payload.action_key,
    subject_user_id: payload.subject_user_id || undefined,
    target_type: payload.target_type || undefined,
    target_id: payload.target_id == null ? undefined : String(payload.target_id),
    request_note: payload.request_note || undefined,
    payload: payload.payload || undefined,
  });
}

export async function listMyCommunityDomainActionReviews(
  communityDomainId: number | string,
  params: { status?: string | null } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/action-reviews/my-requests")}${buildQuery({
      status: params.status || undefined,
    })}`,
    "GET"
  );
}

export async function getCommunityDomainReviewerQueue(
  communityDomainId: number | string,
  params: {
    community_node_id?: number | string | null;
    include_descendants?: boolean | null;
    include_decided?: boolean | null;
  } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/action-reviews/reviewer-queue")}${buildQuery({
      community_node_id: params.community_node_id || undefined,
      include_descendants: params.include_descendants ? true : undefined,
      include_decided: params.include_decided ? true : undefined,
    })}`,
    "GET"
  );
}

export async function getCommunityDomainActionReviewSummary(
  communityDomainId: number | string,
  params: {
    community_node_id?: number | string | null;
    include_descendants?: boolean | null;
  } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/action-reviews/summary")}${buildQuery({
      community_node_id: params.community_node_id || undefined,
      include_descendants: params.include_descendants ? true : undefined,
    })}`,
    "GET"
  );
}

export async function listCommunityDomainActionReviewActivity(
  communityDomainId: number | string,
  params: {
    community_node_id?: number | string | null;
    include_descendants?: boolean | null;
    status?: string | null;
    event_type?: string | null;
    limit?: number | string | null;
  } = {}
): Promise<any> {
  return httpJson(
    `${communityDomainPath(communityDomainId, "/action-reviews/activity")}${buildQuery({
      community_node_id: params.community_node_id || undefined,
      include_descendants: params.include_descendants ? true : undefined,
      status: params.status || undefined,
      event_type: params.event_type || undefined,
      limit: params.limit || undefined,
    })}`,
    "GET"
  );
}

export async function getCommunityDomainActionReview(
  communityDomainId: number | string,
  reviewId: number | string
): Promise<any> {
  return httpJson(communityDomainReviewPath(communityDomainId, reviewId), "GET");
}

export async function decideCommunityDomainActionReview(
  communityDomainId: number | string,
  reviewId: number | string,
  payload: CommunityDomainReviewDecisionPayload
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/decision"),
    "POST",
    {
      decision: payload.decision,
      decision_note: payload.decision_note || undefined,
    }
  );
}

export async function cancelCommunityDomainActionReview(
  communityDomainId: number | string,
  reviewId: number | string,
  payload: { cancel_note?: string | null } = {}
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/cancel"),
    "POST",
    {
      cancel_note: payload.cancel_note || undefined,
    }
  );
}

export async function reviseCommunityDomainActionReview(
  communityDomainId: number | string,
  reviewId: number | string,
  payload: CommunityDomainActionReviewRevisionPayload
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/revision"),
    "POST",
    {
      subject_user_id: payload.subject_user_id || undefined,
      target_type: payload.target_type || undefined,
      target_id: payload.target_id == null ? undefined : String(payload.target_id),
      request_note: payload.request_note || undefined,
      payload: payload.payload || undefined,
    }
  );
}

export async function applyCommunityDomainActionReview(
  communityDomainId: number | string,
  reviewId: number | string
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/apply"),
    "POST"
  );
}

export async function getCommunityDomainActionReviewLineage(
  communityDomainId: number | string,
  reviewId: number | string
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/lineage"),
    "GET"
  );
}

export async function getCommunityDomainActionReviewActivity(
  communityDomainId: number | string,
  reviewId: number | string
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/activity"),
    "GET"
  );
}

export async function listCommunityDomainActionReviewComments(
  communityDomainId: number | string,
  reviewId: number | string
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/comments"),
    "GET"
  );
}

export async function addCommunityDomainActionReviewComment(
  communityDomainId: number | string,
  reviewId: number | string,
  payload: { body: string }
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/comments"),
    "POST",
    { body: payload.body }
  );
}

export async function listCommunityDomainActionReviewEvidence(
  communityDomainId: number | string,
  reviewId: number | string
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/evidence"),
    "GET"
  );
}

export async function addCommunityDomainActionReviewEvidence(
  communityDomainId: number | string,
  reviewId: number | string,
  payload: CommunityDomainReviewEvidencePayload
): Promise<any> {
  return httpJson(
    communityDomainReviewPath(communityDomainId, reviewId, "/evidence"),
    "POST",
    {
      evidence_type: payload.evidence_type || undefined,
      title: payload.title,
      description: payload.description || undefined,
      file_name: payload.file_name || undefined,
      content_type: payload.content_type || undefined,
      storage_key: payload.storage_key || undefined,
      external_reference: payload.external_reference || undefined,
      checksum: payload.checksum || undefined,
    }
  );
}

export async function getCommunityDomainAffiliations(
  communityId: number | string
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/domain-affiliations`,
    "GET",
    undefined,
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function requestCommunityDomainAffiliation(
  affiliateCommunityId: number | string,
  payload: {
    parent_community_key: string;
    request_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(affiliateCommunityId))}/domain-affiliation-requests`,
    "POST",
    {
      parent_community_key: payload.parent_community_key,
      request_note: payload.request_note || undefined,
    },
    { header_clan_id: Number(affiliateCommunityId) || undefined }
  );
}

export async function decideCommunityDomainAffiliation(
  parentCommunityId: number | string,
  affiliationId: number | string,
  payload: {
    decision: "approve" | "reject" | "revoke";
    decision_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(
      String(parentCommunityId)
    )}/domain-affiliation-requests/${encodeURIComponent(String(affiliationId))}/decision`,
    "POST",
    {
      decision: payload.decision,
      decision_note: payload.decision_note || undefined,
    },
    { header_clan_id: Number(parentCommunityId) || undefined }
  );
}

export type CommunityExternalRegistrationEvidencePayload = {
  registration_type?: string | null;
  registration_reference?: string | null;
  registered_name?: string | null;
  issuing_body?: string | null;
  note?: string | null;
};

export async function listCommunityExternalRegistrationEvidence(
  communityId: number | string,
  limit?: number
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/external-registration-records${buildQuery({
      limit: limit || undefined,
    })}`,
    "GET",
    undefined,
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function recordCommunityExternalRegistrationEvidence(
  communityId: number | string,
  payload: CommunityExternalRegistrationEvidencePayload
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/external-registration-records`,
    "POST",
    {
      registration_type: payload.registration_type || undefined,
      registration_reference: payload.registration_reference || undefined,
      registered_name: payload.registered_name || undefined,
      issuing_body: payload.issuing_body || undefined,
      note: payload.note || undefined,
    },
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function getCommunityMemberVerificationSummary(
  communityId: number | string,
  subjectUserId: number | string
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/member-verifications/summary${buildQuery({
      subject_user_id: subjectUserId,
    })}`,
    "GET",
    undefined,
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function recordCommunityMemberVerification(
  communityId: number | string,
  payload: {
    subject_user_id: number | string;
    claim_label?: string | null;
    verification_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/member-verifications`,
    "POST",
    {
      subject_user_id: Number(payload.subject_user_id),
      claim_label: payload.claim_label || undefined,
      verification_note: payload.verification_note || undefined,
    },
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function withdrawCommunityMemberVerification(
  communityId: number | string,
  verificationId: number | string,
  payload: {
    reason?: string | null;
  } = {}
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(
      String(communityId)
    )}/member-verifications/${encodeURIComponent(String(verificationId))}/withdraw`,
    "POST",
    {
      reason: payload.reason || undefined,
    },
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function createCommunityMemberVerificationRequest(
  communityId: number | string,
  payload: {
    verifier_user_id: number | string;
    claim_label?: string | null;
    request_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/member-verification-requests`,
    "POST",
    {
      verifier_user_id: Number(payload.verifier_user_id),
      claim_label: payload.claim_label || undefined,
      request_note: payload.request_note || undefined,
    },
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function getCommunityMemberVerificationRequest(
  communityId: number | string,
  publicToken: string
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(
      String(communityId)
    )}/member-verification-requests/${encodeURIComponent(String(publicToken))}`,
    "GET",
    undefined,
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function decideCommunityMemberVerificationRequest(
  communityId: number | string,
  publicToken: string,
  payload: {
    decision: "approve" | "decline" | string;
    one_time_code?: string | null;
    response_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(
      String(communityId)
    )}/member-verification-requests/${encodeURIComponent(String(publicToken))}/decision`,
    "POST",
    {
      decision: payload.decision,
      one_time_code: payload.one_time_code || undefined,
      response_note: payload.response_note || undefined,
    },
    { header_clan_id: Number(communityId) || undefined }
  );
}

export async function getCommunityConfirmationInbox(): Promise<any> {
  return httpJson("/community-confirmations/inbox", "GET");
}

export async function getMyCommunityConfirmationContactSettings(
  communityId?: number | string | null
): Promise<any> {
  return httpJson(
    `/community-confirmations/my-contact-settings${buildQuery({
      community_id: communityId || undefined,
    })}`,
    "GET"
  );
}

export async function updateMyCommunityConfirmationContactSetting(
  communityId: number | string,
  payload: {
    can_receive_relay_requests?: boolean | null;
    can_receive_instant_pulse?: boolean | null;
    opted_out?: boolean | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/my-contact-settings/${encodeURIComponent(String(communityId))}`,
    "PATCH",
    {
      can_receive_relay_requests:
        payload.can_receive_relay_requests === null
          ? undefined
          : payload.can_receive_relay_requests,
      can_receive_instant_pulse:
        payload.can_receive_instant_pulse === null
          ? undefined
          : payload.can_receive_instant_pulse,
      opted_out: payload.opted_out === null ? undefined : payload.opted_out,
    }
  );
}

export async function getCommunityFollowerCount(
  communityId: number | string
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/followers/count`,
    "GET",
    undefined,
    { header_clan_id: null, quiet: true }
  );
}

export async function getCommunityFollowStatus(
  communityId: number | string
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/follow-status`,
    "GET",
    undefined,
    { header_clan_id: null, quiet: true }
  );
}

export async function followCommunity(communityId: number | string): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/follow`,
    "POST",
    {},
    { header_clan_id: null }
  );
}

export async function unfollowCommunity(
  communityId: number | string
): Promise<any> {
  return httpJson(
    `/clans/${encodeURIComponent(String(communityId))}/follow`,
    "DELETE",
    undefined,
    { header_clan_id: null }
  );
}

export async function respondToCommunityConfirmation(
  requestId: number | string,
  payload: {
    response_type: string;
    response_reason?: string | null;
    response_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/${encodeURIComponent(String(requestId))}/respond`,
    "POST",
    payload
  );
}

export async function recordCommunityConfirmationDecision(
  requestId: number | string,
  payload: {
    decision: string;
    amount_band?: string | null;
    issue_reported?: boolean | null;
    settled?: boolean | null;
    decision_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/${encodeURIComponent(String(requestId))}/decision`,
    "POST",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function getCommunityConfirmationDecision(
  requestId: number | string
): Promise<any> {
  return httpJson(
    `/community-confirmations/${encodeURIComponent(String(requestId))}/decision`,
    "GET"
  );
}

export async function updateCommunityConfirmationDecisionStatus(
  decisionId: number | string,
  payload: {
    status: string;
    issue_reported?: boolean | null;
    settled?: boolean | null;
    decision_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/decisions/${encodeURIComponent(String(decisionId))}`,
    "PATCH",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function updateCommunityConfirmationRequestStatus(
  requestId: number | string,
  payload: {
    status: string;
    status_reason?: string | null;
    status_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/${encodeURIComponent(String(requestId))}/status`,
    "PATCH",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function getCommunityConfirmationReviewCase(
  requestId: number | string
): Promise<any> {
  return httpJson(
    `/community-confirmations/${encodeURIComponent(String(requestId))}/review-case`,
    "GET"
  );
}

export async function getCommunityConfirmationReviewCaseInbox(payload?: {
  status?: string | null;
  scope?: string | null;
  sort?: string | null;
  community_id?: number | string | null;
  limit?: number | null;
  offset?: number | null;
}): Promise<any> {
  return httpJson(
    `/community-confirmations/review-cases/inbox${buildQuery({
      status: payload?.status || "open",
      scope: payload?.scope || undefined,
      sort: payload?.sort || undefined,
      community_id: payload?.community_id || undefined,
      limit: payload?.limit || undefined,
      offset: payload?.offset || undefined,
    })}`,
    "GET"
  );
}

export async function scanCommunityConfirmationReviewSlaEvents(payload?: {
  community_id?: number | string | null;
  limit?: number | null;
}): Promise<any> {
  return httpJson(
    `/community-confirmations/review-cases/scan-sla-events${buildQuery({
      community_id: payload?.community_id || undefined,
      limit: payload?.limit || undefined,
    })}`,
    "POST"
  );
}

export async function assignCommunityConfirmationReviewCase(
  reviewCaseId: number | string,
  payload: {
    assigned_to_user_id?: number | string | null;
    assignment_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/review-cases/${encodeURIComponent(String(reviewCaseId))}/assignment`,
    "PATCH",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function getCommunityConfirmationReviewEvidence(
  reviewCaseId: number | string
): Promise<any> {
  return httpJson(
    `/community-confirmations/review-cases/${encodeURIComponent(String(reviewCaseId))}/evidence`,
    "GET"
  );
}

export async function addCommunityConfirmationReviewEvidence(
  reviewCaseId: number | string,
  payload: {
    evidence_type?: string | null;
    title: string;
    body?: string | null;
    external_ref?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/review-cases/${encodeURIComponent(String(reviewCaseId))}/evidence`,
    "POST",
    Object.fromEntries(
      Object.entries({
        evidence_type: payload.evidence_type || "note",
        title: payload.title,
        body: payload.body,
        external_ref: payload.external_ref,
      }).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function updateCommunityConfirmationReviewCase(
  reviewCaseId: number | string,
  payload: {
    status: string;
    resolution?: string | null;
    trust_impact?: string | null;
    resolution_note?: string | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/review-cases/${encodeURIComponent(String(reviewCaseId))}`,
    "PATCH",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function getCommunityConfirmationSummary(
  communityId: number | string,
  subjectUserId?: number | string | null
): Promise<any> {
  return httpJson(
    `/community-confirmations/community/${encodeURIComponent(String(communityId))}/summary${buildQuery({
      subject_user_id: subjectUserId || undefined,
    })}`,
    "GET"
  );
}

export async function getCommunityConfirmationPolicy(
  communityId: number | string
): Promise<any> {
  return httpJson(
    `/community-confirmations/community/${encodeURIComponent(String(communityId))}/policy`,
    "GET"
  );
}

export async function updateCommunityConfirmationPolicy(
  communityId: number | string,
  payload: {
    relay_enabled?: boolean | null;
    instant_pulse_enabled?: boolean | null;
    minimum_positive_responses?: number | null;
    maximum_relay_contacts?: number | null;
    response_window_seconds?: number | null;
    review_attention_after_hours?: number | null;
    review_overdue_after_hours?: number | null;
    allow_admin_contacts?: boolean | null;
    allow_sponsor_contacts?: boolean | null;
    allow_voting_member_contacts?: boolean | null;
    allow_subject_nominated_contacts?: boolean | null;
    public_confirmation_enabled?: boolean | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/community/${encodeURIComponent(String(communityId))}/policy`,
    "PATCH",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
  );
}

export async function updateCommunityConfirmationContact(
  communityId: number | string,
  targetUserId: number | string,
  payload: {
    active?: boolean | null;
    can_receive_relay_requests?: boolean | null;
    can_receive_instant_pulse?: boolean | null;
    role_type?: string | null;
    standing_status?: string | null;
    priority_order?: number | null;
  }
): Promise<any> {
  return httpJson(
    `/community-confirmations/community/${encodeURIComponent(String(communityId))}/contacts/${encodeURIComponent(String(targetUserId))}`,
    "PATCH",
    Object.fromEntries(
      Object.entries(payload).filter(([, value]) => value !== null && value !== undefined)
    )
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

  const res = await fetchWithTimeout(
    buildUrl("/identity-risk/observe"),
    {
      method: "POST",
      headers,
    },
    DEFAULT_JSON_TIMEOUT_MS
  );

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

export async function getAdminPhoneIdentityLineage(phoneE164: string): Promise<any> {
  return httpJson(
    `/identity-risk/admin/phone-lineage${buildQuery({ phone_e164: phoneE164 })}`,
    "GET"
  );
}

export async function postAdminIdentityReconciliation(payload: {
  canonical_user_id?: number | null;
  canonical_gmfn_id?: string | null;
  duplicate_user_id?: number | null;
  duplicate_gmfn_id?: string | null;
  owner_confirmed?: boolean;
  execute?: boolean;
  reviewer_note?: string | null;
}): Promise<any> {
  return httpJson("/identity-risk/admin/reconcile-duplicate", "POST", payload);
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

export async function getWebPushStatus(): Promise<any> {
  return httpJson("/web-push/status", "GET", undefined, { quiet: true });
}

export async function registerWebPushSubscription(payload: {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  permission_state?: string;
}): Promise<any> {
  return httpJson("/web-push/subscriptions", "POST", payload, { quiet: true });
}

export async function unregisterWebPushSubscription(payload: {
  endpoint: string;
}): Promise<any> {
  return httpJson("/web-push/subscriptions", "DELETE", payload, { quiet: true });
}

export async function sendWebPushTestNotification(): Promise<any> {
  return httpJson("/web-push/test", "POST", undefined, { quiet: true });
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
  } catch {
    // Local settings persistence is best-effort only.
  }
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

export async function reviewIdentityVerificationCheck(
  checkId: number,
  payload: { decision: "verify" | "reject" | "needs_more"; reviewer_note?: string }
): Promise<any> {
  return httpJson(
    `/admin/identity-verification-checks/${encodeURIComponent(String(checkId))}/decision`,
    "POST",
    payload
  );
}

export async function fetchIdentityVerificationEvidenceBlob(
  checkId: number
): Promise<Blob> {
  const headers: Record<string, string> = { Accept: "*/*" };
  const tok = getAccessToken();
  if (tok) headers["Authorization"] = `Bearer ${tok}`;

  const res = await fetchWithTimeout(
    buildUrl(
      `/admin/identity-verification-checks/${encodeURIComponent(String(checkId))}/evidence`
    ),
    {
      method: "GET",
      headers,
      cache: "no-store",
    },
    DEFAULT_JSON_TIMEOUT_MS
  );

  if (!res.ok) throw new HttpStatusError(res.status, await parseError(res));
  return res.blob();
}

export async function correctIdentityVerificationCheck(
  checkId: number,
  payload: { reason: string }
): Promise<any> {
  return httpJson(
    `/admin/identity-verification-checks/${encodeURIComponent(String(checkId))}/correction`,
    "POST",
    payload
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

export async function recordFocusCommitmentTrustEvent(payload: {
  clan_id?: number;
  local_commitment_id: string;
  local_event_id: string;
  event_kind: string;
  title: string;
  category?: string | null;
  target_value?: number | null;
  current_value?: number | null;
  progress_value?: number | null;
  unit?: string | null;
  due_date?: string | null;
  cadence?: string | null;
  note?: string | null;
}): Promise<any> {
  return httpJson("/trust-events/me/focus-commitment", "POST", payload);
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

export async function getMyMarketplaceShop(params?: {
  clan_id?: number | null;
  header_clan_id?: number | null;
  product_limit?: number;
}): Promise<any> {
  const options = buildMarketplaceReadOptions(params);

  return httpJson(
    `/marketplace/shops/me${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      product_limit: params?.product_limit ?? 300,
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
    product_id?: number | null;
    product_limit?: number;
    broadcast_limit?: number;
  }
): Promise<any> {
  return httpJson(
    `/marketplace/public/shop/${encodeURIComponent(String(gmfnId))}${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      product_id: params?.product_id ?? undefined,
      product_limit: params?.product_limit ?? 100,
      broadcast_limit: params?.broadcast_limit ?? 24,
    })}`,
    "GET"
  );
}

export async function followMarketplaceShop(shopId: number): Promise<any> {
  return httpJson(
    `/marketplace/shops/${encodeURIComponent(String(shopId))}/follow`,
    "POST",
    {}
  );
}

export async function unfollowMarketplaceShop(shopId: number): Promise<any> {
  return httpJson(
    `/marketplace/shops/${encodeURIComponent(String(shopId))}/follow`,
    "DELETE"
  );
}

export async function getMarketplaceShopFollowerCount(shopId: number): Promise<any> {
  return httpJson(
    `/marketplace/shops/${encodeURIComponent(String(shopId))}/followers/count`,
    "GET"
  );
}

export async function getMarketplaceShopFollowStatus(shopId: number): Promise<any> {
  return httpJson(
    `/marketplace/shops/${encodeURIComponent(String(shopId))}/follow-status`,
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
  include_private_manage?: boolean;
  limit?: number;
}): Promise<any> {
  const options = buildMarketplaceReadOptions(params);

  return httpJson(
    `/marketplace/products${buildQuery({
      clan_id: params?.clan_id ?? undefined,
      shop_id: params?.shop_id ?? undefined,
      only_active: params?.only_active ?? true,
      include_reposted: params?.include_reposted ?? true,
      include_private_manage: params?.include_private_manage ?? undefined,
      limit: params?.limit ?? 100,
    })}`,
    "GET",
    undefined,
    options
  );
}

export type ProtectedTradeCreatePayload = {
  clan_id?: number | null;
  participant_role?: "seller" | "buyer";
  seller_user_id?: number | null;
  buyer_user_id?: number | null;
  shop_id?: number | null;
  product_id?: number | null;
  vault_access_link_id?: number | null;
  trust_slip_code?: string | null;
  expected_payment_id?: number | null;
  shipment_pack_id?: string | null;
  evidence_pack_id?: string | null;
  item_title?: string | null;
  terms_summary?: string | null;
  amount?: string | null;
  currency?: string | null;
  meta?: Record<string, any> | null;
};

export type ProtectedTradeEventPayload = {
  event_type: string;
  note?: string | null;
  expected_payment_id?: number | null;
  shipment_pack_id?: string | null;
  evidence_pack_id?: string | null;
  trust_slip_code?: string | null;
  meta?: Record<string, any> | null;
};

export type ProtectedTradeEventRecord = {
  id?: number;
  trade_id?: number;
  event_type?: string | null;
  actor_user_id?: number | null;
  status_from?: string | null;
  status_to?: string | null;
  trust_event_id?: number | null;
  note?: string | null;
  meta?: Record<string, any> | null;
  created_at?: string | null;
};

export type ProtectedTradeRecord = {
  id?: number;
  trade_code?: string | null;
  clan_id?: number | null;
  creator_user_id?: number | null;
  seller_user_id?: number | null;
  buyer_user_id?: number | null;
  shop_id?: number | null;
  product_id?: number | null;
  vault_access_link_id?: number | null;
  trust_slip_code?: string | null;
  expected_payment_id?: number | null;
  shipment_pack_id?: string | null;
  evidence_pack_id?: string | null;
  item_title?: string | null;
  terms_summary?: string | null;
  amount?: string | number | null;
  currency?: string | null;
  status?: string | null;
  payment_status?: string | null;
  release_status?: string | null;
  receipt_status?: string | null;
  dispute_status?: string | null;
  meta?: Record<string, any> | null;
  created_at?: string | null;
  updated_at?: string | null;
  closed_at?: string | null;
  events?: ProtectedTradeEventRecord[];
  boundary_note?: string | null;
};

export async function createProtectedTrade(
  payload: ProtectedTradeCreatePayload
): Promise<ProtectedTradeRecord> {
  return httpJson("/protected-trades", "POST", payload);
}

export async function listProtectedTrades(params?: {
  status?: string | null;
  limit?: number;
}): Promise<ProtectedTradeRecord[]> {
  const out = await httpJson(
    `/protected-trades${buildQuery({
      status: params?.status ?? undefined,
      limit: params?.limit ?? 20,
    })}`,
    "GET"
  );
  return Array.isArray(out) ? out : rowsFromApi(out);
}

export async function getProtectedTrade(
  tradeId: number | string
): Promise<ProtectedTradeRecord> {
  return httpJson(
    `/protected-trades/${encodeURIComponent(String(Number(tradeId || 0)))}`,
    "GET"
  );
}

export async function addProtectedTradeEvent(
  tradeId: number,
  payload: ProtectedTradeEventPayload
): Promise<ProtectedTradeEventRecord> {
  return httpJson(
    `/protected-trades/${encodeURIComponent(String(tradeId))}/events`,
    "POST",
    payload
  );
}

export async function createMarketplaceBroadcast(payload: {
  clan_id?: number | null;
  shop_id?: number | null;
  message: string;
  image_url?: string | null;
  video_url?: string | null;
  expires_at?: string | null;
  priority_mode?: string | null;
  visibility_scope?: string | null;
}): Promise<any> {
  const effectiveClanId =
    payload?.clan_id === undefined ? getSelectedClanId() : payload?.clan_id;

  const clanId = Number(effectiveClanId || 0);
  const shopId = Number(payload?.shop_id || 0);
  const message = String(payload?.message || "").trim();
  const imageUrl = String(payload?.image_url || "").trim();
  const videoUrl = String(payload?.video_url || "").trim();
  const expiresAt = normalizeApiDateTime(payload?.expires_at);
  const priorityMode = String(payload?.priority_mode || "").trim();
  const visibilityScope = String(payload?.visibility_scope || "").trim();

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

  if (priorityMode) {
    baseBody.priority_mode = priorityMode;
  }

  if (visibilityScope) {
    baseBody.visibility_scope = visibilityScope;
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
  target_clan_id?: number;
  target_community_code?: string;
  duration_days?: number;
}): Promise<any> {
  return httpJson(
    `/marketplace/products/${encodeURIComponent(
      String(payload.product_id)
    )}/repost`,
    "POST",
    {
      target_clan_id: payload.target_clan_id,
      target_community_code: payload.target_community_code,
      duration_days: payload.duration_days,
    }
  );
}

export async function getMarketplaceRepostTargetSuggestions(
  productId: number,
  params?: {
    limit?: number;
  }
): Promise<any> {
  return httpJson(
    `/marketplace/products/${encodeURIComponent(
      String(productId)
    )}/repost-targets${buildQuery({
      limit: params?.limit ?? 6,
    })}`,
    "GET"
  );
}

export async function createSpotlightPaymentInstruction(payload: {
  clan_id: number;
  shop_id: number;
  quantity_total: number;
  amount?: string | null;
  currency?: string;
  visibility_scope?: string;
}): Promise<any> {
  return httpJson("/payment-instructions/spotlight", "POST", {
    clan_id: payload.clan_id,
    shop_id: payload.shop_id,
    quantity_total: payload.quantity_total,
    amount: payload.amount ?? undefined,
    currency: payload.currency || "GBP",
    visibility_scope: payload.visibility_scope || "direct_communities",
  });
}

export async function createCommunityPackagePaymentInstruction(payload: {
  clan_id: number;
  package_code: string;
  quantity_total?: number;
  shop_id?: number | null;
  amount?: string | null;
  currency?: string;
}): Promise<any> {
  return httpJson("/payment-instructions/community-package", "POST", {
    clan_id: payload.clan_id,
    package_code: payload.package_code,
    quantity_total: payload.quantity_total ?? 1,
    shop_id: payload.shop_id ?? undefined,
    amount: payload.amount ?? undefined,
    currency: payload.currency || "GBP",
  });
}

export async function getCommunityPackageStatus(payload: {
  clan_id: number;
  shop_id?: number | null;
}): Promise<any> {
  return httpJson(
    `/payment-instructions/community-package/status${buildQuery({
      clan_id: payload.clan_id,
      shop_id: payload.shop_id ?? undefined,
    })}`,
    "GET",
    undefined,
    { header_clan_id: payload.clan_id }
  );
}

export async function listMyPaymentInstructionExpectedPayments(payload: {
  clan_id: number;
  expected_type?: string;
  status?: string;
  currency?: string;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/payment-instructions/my/expected${buildQuery({
      clan_id: payload.clan_id,
      expected_type: payload.expected_type,
      status: payload.status,
      currency: payload.currency,
      limit: payload.limit ?? 100,
    })}`,
    "GET",
    undefined,
    { header_clan_id: payload.clan_id }
  );
}

export async function getMyRoscaObligations(payload?: {
  clan_id?: number | null;
  limit?: number;
}): Promise<any> {
  return httpJson(
    `/rosca/obligations/me${buildQuery({
      clan_id: payload?.clan_id ?? undefined,
      limit: payload?.limit ?? 20,
    })}`,
    "GET"
  );
}

export async function getRoscaCycles(payload: {
  clan_id: number;
}): Promise<any> {
  return httpJson(
    `/rosca/cycles${buildQuery({
      clan_id: payload.clan_id,
    })}`,
    "GET",
    undefined,
    { header_clan_id: payload.clan_id }
  );
}

export async function createRoscaCycle(payload: {
  clan_id: number;
  title?: string | null;
  contribution_amount: string;
  currency?: string | null;
  interval_days?: number | null;
  member_user_ids?: number[] | null;
  payout_order_user_ids?: number[] | null;
  note?: string | null;
}): Promise<any> {
  return httpJson(
    "/rosca/cycles",
    "POST",
    {
      clan_id: payload.clan_id,
      title: payload.title || "Community ROSCA cycle",
      contribution_amount: payload.contribution_amount,
      currency: payload.currency || "GBP",
      interval_days: payload.interval_days ?? 30,
      member_user_ids: payload.member_user_ids ?? undefined,
      payout_order_user_ids: payload.payout_order_user_ids ?? undefined,
      note: payload.note ?? undefined,
    },
    { header_clan_id: payload.clan_id }
  );
}

export async function recordRoscaCyclePayout(payload: {
  clan_id: number;
  cycle_id: string;
  round_number: number;
  note?: string | null;
}): Promise<any> {
  return httpJson(
    `/rosca/cycles/${encodeURIComponent(
      payload.cycle_id
    )}/rounds/${encodeURIComponent(String(payload.round_number))}/payout${buildQuery({
      clan_id: payload.clan_id,
    })}`,
    "POST",
    {
      note: payload.note ?? undefined,
    },
    { header_clan_id: payload.clan_id }
  );
}

export async function getMarketplaceShopSpotlightStatus(shopId: number): Promise<any> {
  return httpJson(
    `/marketplace/shops/${encodeURIComponent(String(shopId))}/spotlight-status`,
    "GET"
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
  void _payload;
  return {
    ok: false,
    detail: "Marketplace reviews are not open for this item right now.",
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

export async function safeCopy(text: string): Promise<boolean> {
  const t = String(text || "").trim();
  if (!t) return false;

  if (
    typeof navigator !== "undefined" &&
    (navigator as any)?.clipboard?.writeText
  ) {
    try {
      await (navigator as any).clipboard.writeText(t);
      return true;
    } catch {
      return tryLegacyCopy(t);
    }
  }

  return tryLegacyCopy(t);
}

function tryLegacyCopy(text: string): boolean {
  try {
    if (typeof document === "undefined") return false;
    const win = document.defaultView;
    const scrollX = win?.scrollX ?? 0;
    const scrollY = win?.scrollY ?? 0;
    const restoreScroll = () => win?.scrollTo(scrollX, scrollY);
    const activeElement =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const selection = document.getSelection();
    const selectedRanges =
      selection && selection.rangeCount > 0
        ? Array.from({ length: selection.rangeCount }, (_unused, index) =>
            selection.getRangeAt(index).cloneRange()
          )
        : [];

    const ta = document.createElement("textarea");
    ta.value = text;
    ta.readOnly = true;
    ta.setAttribute("readonly", "true");
    ta.setAttribute("aria-hidden", "true");
    ta.setAttribute("inputmode", "none");
    ta.tabIndex = -1;
    ta.style.position = "fixed";
    ta.style.left = "1px";
    ta.style.top = "1px";
    ta.style.width = "1px";
    ta.style.height = "1px";
    ta.style.opacity = "0";
    ta.style.pointerEvents = "none";
    ta.style.zIndex = "-1";
    ta.style.fontSize = "16px";
    ta.style.caretColor = "transparent";
    document.body.appendChild(ta);
    ta.focus({ preventScroll: true });
    restoreScroll();
    ta.select();
    ta.setSelectionRange(0, ta.value.length);

    try {
      return document.execCommand("copy");
    } catch {
      // Legacy copy can fail in restricted browser contexts.
      return false;
    } finally {
      ta.remove();
      activeElement?.focus({ preventScroll: true });
      if (selection && selectedRanges.length > 0) {
        selection.removeAllRanges();
        selectedRanges.forEach((range) => selection.addRange(range));
      }
      restoreScroll();
      win?.requestAnimationFrame(restoreScroll);
    }
  } catch {
    // Copy is best-effort only.
    return false;
  }
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

export async function getTrustWhyMe(params?: {
  limit?: number;
  event_type?: string;
  include_policy_timeline?: boolean;
}): Promise<any> {
  return httpJson(
    `/trust/me/why${buildQuery({
      limit: params?.limit,
      event_type: params?.event_type,
      include_policy_timeline: params?.include_policy_timeline,
    })}`,
    "GET"
  );
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

export async function uploadPaymentInstructionProofFile(
  expectedPaymentId: number,
  file: File,
  clanId: number,
  reference: string
): Promise<any> {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("clan_id", String(clanId));
  fd.append("reference", String(reference || ""));

  return httpMultipart(
    `/payment-instructions/expected/${encodeURIComponent(String(expectedPaymentId))}/proof`,
    fd
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

  const res = await fetchWithTimeout(
    buildUrl("/marketplace/media/image"),
    {
      method: "POST",
      headers,
      body: fd,
    },
    DEFAULT_MULTIPART_TIMEOUT_MS
  );

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

  const res = await fetchWithTimeout(
    buildUrl("/marketplace/media/video"),
    {
      method: "POST",
      headers,
      body: fd,
    },
    DEFAULT_MULTIPART_TIMEOUT_MS
  );

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

  const res = await fetchWithTimeout(
    buildUrl(path),
    {
      method: "POST",
      headers,
      body: fd,
    },
    DEFAULT_MULTIPART_TIMEOUT_MS
  );

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
        "Image uploaded, but GSN could not save it permanently yet. Keep this image here until permanent saving is ready.",
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
        "GSN could not remove the saved image permanently yet, but this page can clear the current image.",
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
  vote: "approve" | "reject" | "neutral",
  reason?: { reason_code?: string | null; reason_text?: string | null }
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
    {
      vote,
      reason_code: String(reason?.reason_code || "").trim() || `${vote}_reason`,
      reason_text: String(reason?.reason_text || "").trim() || undefined,
    },
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
    throw new Error("GSN ID is required");
  }

  const me = await getMe();
  const myGmfnId = String(me?.gmfn_id || "").trim();

  if (myGmfnId && myGmfnId.toUpperCase() === cleaned.toUpperCase()) {
    return getMyTrustGraph();
  }

  throw new Error(
    "Use User ID search for this admin view."
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
  product_id?: number | string | null;
  block_id?: number | string | null;
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
  status?: "active" | "expired" | "revoked" | "exhausted" | "product_inactive" | "block_inactive";
};

export type CreateVaultShopAccessLinkInput = {
  shop_id: number | string;
  product_id?: number | string | null;
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
  block_id?: number | string | null;
  vault_block_id?: number | string | null;
  name?: string | null;
  description?: string | null;
  price?: string | null;
  currency?: string | null;
  image_url?: string | null;
  video_url?: string | null;
};

export type VaultBlockItem = {
  id: number | string;
  shop_id?: number | string;
  slot_number: number;
  state: string;
  product_id?: number | string | null;
  product?: VaultShopAccessProduct | null;
  activated_at?: string | null;
  expires_at?: string | null;
  content_status?: string | null;
};

export type VaultShopStatus = {
  ok?: boolean;
  shop_id?: number | string;
  max_slots?: number;
  active_paid_slots?: number;
  private_offers_count?: number;
  active_links_count?: number;
  blocks?: VaultBlockItem[];
  orders?: any[];
};

export type VaultShopAccessView = {
  token?: string;
  status?: "active" | "expired" | "revoked" | "exhausted" | "product_inactive" | "block_inactive" | "invalid";
  shop_id?: number | string;
  vault_shop_id?: number | string;
  product_id?: number | string | null;
  block_id?: number | string | null;
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

const VAULT_JSON_TIMEOUT_MS = DEFAULT_JSON_TIMEOUT_MS;

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

        const res = await fetchWithTimeout(
          vaultJoinUrl(root, attempt.path),
          {
            method: attempt.method,
            headers,
            credentials: "include",
            cache: "no-store",
            body:
              attempt.body === undefined ? undefined : JSON.stringify(attempt.body),
          },
          VAULT_JSON_TIMEOUT_MS
        );

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

  const rawStatus = vaultFirstTruthy(src?.status).toLowerCase();
  let status: VaultLinkItem["status"] =
    rawStatus === "revoked" ||
    rawStatus === "expired" ||
    rawStatus === "exhausted" ||
    rawStatus === "product_inactive" ||
    rawStatus === "block_inactive"
      ? (rawStatus as VaultLinkItem["status"])
      : "active";

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
    product_id: src?.product_id ?? src?.marketplace_product_id ?? null,
    block_id: src?.block_id ?? src?.vault_block_id ?? null,
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
    block_id: src?.block_id ?? src?.vault_block_id ?? src?.vault_block?.id ?? null,
    vault_block_id: src?.vault_block_id ?? src?.block_id ?? src?.vault_block?.id ?? null,
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
    video_url: vaultFirstTruthy(
      src?.video_url,
      src?.media_video_url,
      src?.clip_url,
      src?.story_video_url
    ),
  };
}

function normalizeVaultAccessView(raw: any): VaultShopAccessView {
  const src = raw?.item || raw?.view || raw?.data || raw || {};
  const shop = src?.shop || src?.shop_summary || src;
  const policySrc = src?.policy || src?.access_policy || src?.link || src;
  const viewProductId = src?.product_id ?? policySrc?.product_id ?? null;
  const viewBlockId = src?.block_id ?? policySrc?.block_id ?? null;

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
  if (rawStatus.includes("block_inactive")) status = "block_inactive";
  else if (rawStatus.includes("product_inactive")) status = "product_inactive";

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

  const rawProductRows = vaultRowsOf<any>(
    src?.products || src?.items || shop?.products || src?.shop_products
  ).map((item) => normalizeVaultAccessProduct(item));
  const productRows = rawProductRows
    .filter((item) => {
      if (viewProductId) return vaultSafeStr(item.id) === vaultSafeStr(viewProductId);
      if (viewBlockId) {
        return (
          vaultSafeStr(item.block_id) === vaultSafeStr(viewBlockId) ||
          vaultSafeStr(item.vault_block_id) === vaultSafeStr(viewBlockId)
        );
      }
      return rawProductRows.length <= 1;
    })
    .filter((item, index, rows) => {
      const key = vaultFirstTruthy(item.id, item.block_id, item.vault_block_id, index);
      return rows.findIndex((candidate, candidateIndex) => {
        const candidateKey = vaultFirstTruthy(candidate.id, candidate.block_id, candidate.vault_block_id, candidateIndex);
        return candidateKey === key;
      }) === index;
    });
  if (!viewProductId && !viewBlockId && rawProductRows.length > 1) {
    status = "invalid";
  }

  return {
    token: vaultFirstTruthy(src?.token, policySrc?.token, src?.code),
    product_id: viewProductId,
    block_id: viewBlockId,
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

export async function getVaultShopStatus(
  shopId: number | string
): Promise<VaultShopStatus> {
  const safeShopId = String(shopId);

  return vaultTryJson<VaultShopStatus>(
    [
      {
        method: "GET",
        path: `/vault/shops/${encodeURIComponent(safeShopId)}/status`,
      },
      {
        method: "GET",
        path: `/marketplace/shops/${encodeURIComponent(safeShopId)}/vault-status`,
      },
      {
        method: "GET",
        path: `/marketplace/shops/${encodeURIComponent(safeShopId)}/vault-blocks`,
      },
      {
        method: "GET",
        path: `/vault-shops/${encodeURIComponent(safeShopId)}/status`,
      },
    ],
    true
  );
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
