export type EntryMode = "general" | "create" | "invite" | "approved" | "existing";
export type WelcomeStep = "choose_identity" | "choose_new_lane" | "existing_lane";

export const ACCESS_TOKEN_KEY = "access_token";
export const ENTRY_MODE_KEY = "gmfn_entry_mode";
export const ENTRY_INVITE_CODE_KEY = "gmfn_entry_invite_code";
export const ENTRY_CREATE_CODE_KEY = "gmfn_entry_create_code";

export function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readStorage(key: string): string | null {
  try {
    if (!canUseStorage()) return null;
    const value = window.localStorage.getItem(key);
    return value == null ? null : String(value);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (!canUseStorage()) return;

    if (value == null || String(value).trim() === "") {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, String(value));
  } catch {
    // ignore
  }
}

export function normalizeValue(value: unknown): string {
  return String(value ?? "").trim().toLowerCase();
}

export function isAuthenticated(): boolean {
  return Boolean(String(readStorage(ACCESS_TOKEN_KEY) || "").trim());
}

export function matchEntryMode(raw: string): EntryMode | null {
  if (
    raw === "create" ||
    raw === "founder" ||
    raw === "public-create" ||
    raw === "new"
  ) {
    return "create";
  }

  if (
    raw === "invite" ||
    raw === "invited" ||
    raw === "join" ||
    raw === "get-invite"
  ) {
    return "invite";
  }

  if (raw === "approved" || raw === "activate" || raw === "activation") {
    return "approved";
  }

  if (raw === "existing" || raw === "login" || raw === "member") {
    return "existing";
  }

  if (raw === "general" || raw === "public" || raw === "welcome") {
    return "general";
  }

  return null;
}

export function readLocationStateEntry(state: unknown): string {
  if (!state || typeof state !== "object") return "";

  const value =
    (state as any).entry ??
    (state as any).entryMode ??
    (state as any).mode ??
    (state as any).flow ??
    (state as any).intent ??
    "";

  return normalizeValue(value);
}

export function detectEntryMode(
  pathname: string,
  search: string,
  state: unknown
): EntryMode {
  const params = new URLSearchParams(search);

  const queryValue =
    normalizeValue(params.get("entry")) ||
    normalizeValue(params.get("flow")) ||
    normalizeValue(params.get("mode")) ||
    normalizeValue(params.get("intent"));

  const queryMatch = matchEntryMode(queryValue);
  if (queryMatch) return queryMatch;

  const stateMatch = matchEntryMode(readLocationStateEntry(state));
  if (stateMatch) return stateMatch;

  const storedMatch = matchEntryMode(normalizeValue(readStorage(ENTRY_MODE_KEY)));
  if (storedMatch) return storedMatch;

  const path = normalizeValue(pathname);

  if (
    path.includes("get-invite") ||
    path.includes("invite") ||
    path.includes("join")
  ) {
    return "invite";
  }

  if (path.includes("create") || path.includes("founder")) {
    return "create";
  }

  if (path.includes("approved") || path.includes("activate")) {
    return "approved";
  }

  if (path.includes("login") || path.includes("existing")) {
    return "existing";
  }

  return "general";
}

export function persistEntryState(entryMode: EntryMode, search: string): void {
  const params = new URLSearchParams(search);

  const inviteCode =
    params.get("invite_code") ||
    params.get("invite") ||
    params.get("join_code") ||
    params.get("code") ||
    null;

  const createCode =
    params.get("create_code") ||
    params.get("founder_code") ||
    params.get("public_create_code") ||
    params.get("code") ||
    null;

  writeStorage(ENTRY_MODE_KEY, entryMode);

  if (entryMode === "invite") {
    writeStorage(ENTRY_INVITE_CODE_KEY, inviteCode);
    writeStorage(ENTRY_CREATE_CODE_KEY, null);
    return;
  }

  if (entryMode === "create") {
    writeStorage(ENTRY_CREATE_CODE_KEY, createCode);
    writeStorage(ENTRY_INVITE_CODE_KEY, null);
    return;
  }

  writeStorage(ENTRY_INVITE_CODE_KEY, null);
  writeStorage(ENTRY_CREATE_CODE_KEY, null);
}

export function mergeSearchIntoPath(to: string, currentSearch: string): string {
  const [basePath, baseQueryRaw = ""] = String(to || "").split("?");
  const merged = new URLSearchParams(baseQueryRaw);
  const current = new URLSearchParams(currentSearch);

  current.forEach((value, key) => {
    if (!merged.has(key)) {
      merged.append(key, value);
    }
  });

  const finalQuery = merged.toString();
  return finalQuery ? `${basePath}?${finalQuery}` : basePath;
}

export function coverContinueTo(currentSearch: string): string {
  return routeForCreate(currentSearch);
}

export function routeForCreate(currentSearch: string): string {
  return mergeSearchIntoPath("/create", currentSearch);
}

export function routeForJoin(currentSearch: string): string {
  return mergeSearchIntoPath("/join", currentSearch);
}

export function routeForLogin(currentSearch: string): string {
  return mergeSearchIntoPath("/login", currentSearch);
}

export function routeForActivation(currentSearch: string): string {
  return mergeSearchIntoPath("/activate-membership", currentSearch);
}

export function initialWelcomeStep(entryMode: EntryMode): WelcomeStep {
  if (entryMode === "general") return "choose_identity";
  if (entryMode === "existing") return "existing_lane";
  return "choose_new_lane";
}

export function isKnownSingleLane(entryMode: EntryMode): boolean {
  return entryMode === "create" || entryMode === "invite" || entryMode === "approved";
}
