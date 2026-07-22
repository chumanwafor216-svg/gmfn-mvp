const ACCESS_TOKEN_KEY = "access_token";
const GMFN_CURRENT_ID_KEY = "gmfn_current_id";
const GMFN_SELECTED_CLAN_ID_KEY = "gmfn_selected_clan_id";
const GMFN_ENTRY_MODE_KEY = "gmfn_entry_mode";
const GMFN_ENTRY_INVITE_CODE_KEY = "gmfn_entry_invite_code";
const GMFN_ENTRY_CREATE_CODE_KEY = "gmfn_entry_create_code";
const GMFN_ROLE_KEY = "gmfn_role";

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

function removeStorage(key: string): void {
  try {
    if (!canUseStorage()) return;
    window.localStorage.removeItem(key);
  } catch {
    // Storage cleanup is best-effort on restrictive mobile browsers.
  }
}

export function getAccessToken(): string | null {
  return readStorage(ACCESS_TOKEN_KEY);
}

export function clearAuthSession(): void {
  [
    ACCESS_TOKEN_KEY,
    GMFN_CURRENT_ID_KEY,
    GMFN_SELECTED_CLAN_ID_KEY,
    GMFN_ENTRY_MODE_KEY,
    GMFN_ENTRY_INVITE_CODE_KEY,
    GMFN_ENTRY_CREATE_CODE_KEY,
    GMFN_ROLE_KEY,
  ].forEach(removeStorage);
}
