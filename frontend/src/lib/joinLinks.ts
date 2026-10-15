import {
  canonicalPublicFrontendUrl,
  publicFrontendOrigin,
  shareablePublicFrontendUrl,
} from "./publicLinks";

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function firstTruthy(...values: unknown[]): string {
  for (const value of values) {
    const text = safeText(value);
    if (text) return text;
  }
  return "";
}

export function inviteCodeFromLink(rawLink: string): string {
  const direct = safeText(rawLink);
  if (!direct) return "";

  try {
    const url = new URL(direct, publicFrontendOrigin());

    const queryCode = firstTruthy(
      url.searchParams.get("invite"),
      url.searchParams.get("invite_code"),
      url.searchParams.get("join_code"),
      url.searchParams.get("code")
    );
    if (queryCode) return decodeURIComponent(queryCode);

    const parts = url.pathname.split("/").filter(Boolean);

    for (let index = 0; index < parts.length - 1; index += 1) {
      const current = parts[index];
      const next = parts[index + 1];

      if (current === "join" || current === "invite" || current === "get-invite") {
        return decodeURIComponent(next);
      }

      if (current === "start" && next === "join" && parts[index + 2]) {
        return decodeURIComponent(parts[index + 2]);
      }
    }
  } catch {
    return "";
  }

  return "";
}

export function canonicalJoinInviteUrl(code: string): string {
  const cleanCode = safeText(code);
  if (!cleanCode) return "";
  return shareablePublicFrontendUrl(`/start/join/${encodeURIComponent(cleanCode)}`);
}

export function joinInviteSocialPreviewUrl(rawLink: string): string {
  return compactJoinInviteUrl(rawLink);
}

export function compactJoinInviteUrl(rawLink: string): string {
  const direct = safeText(rawLink);
  if (!direct) return "";

  const code = inviteCodeFromLink(direct);
  if (code) return canonicalJoinInviteUrl(code);

  if (!isJoinInviteLink(direct)) return "";

  try {
    const url = new URL(direct, publicFrontendOrigin());
    return canonicalPublicFrontendUrl(url.pathname);
  } catch {
    return "";
  }
}

function isJoinInviteLink(rawLink: string): boolean {
  const direct = safeText(rawLink);
  if (!direct) return false;

  try {
    const url = new URL(direct, publicFrontendOrigin());
    const parts = url.pathname.split("/").filter(Boolean);

    if (parts.length === 0) return false;

    for (let index = 0; index < parts.length; index += 1) {
      const current = parts[index];
      const next = parts[index + 1];

      if (
        (current === "join" ||
          current === "invite" ||
          current === "get-invite") &&
        Boolean(next)
      ) {
        return true;
      }

      if (
        current === "start" &&
        (next === "join" || next === "invite") &&
        Boolean(parts[index + 2])
      ) {
        return true;
      }
    }

    return Boolean(
      url.searchParams.get("invite") ||
        url.searchParams.get("invite_code") ||
        url.searchParams.get("join_code")
    );
  } catch {
    return false;
  }
}

export function normalizedJoinInviteUrl(payload: any): string {
  const direct = firstTruthy(
    payload?.share_link,
    payload?.invite_url,
    payload?.invite_link,
    payload?.url,
    payload?.link
  );

  const code = firstTruthy(
    inviteCodeFromLink(direct),
    payload?.code,
    payload?.invite_code
  );

  if (code) {
    return canonicalJoinInviteUrl(code);
  }
  if (isJoinInviteLink(direct)) return compactJoinInviteUrl(direct);
  return "";
}

export function personalizedJoinInviteUrl(
  rawLink: string,
  _opts: {
    inviterName?: unknown;
    recipientName?: unknown;
    communityCode?: unknown;
    communityName?: unknown;
    marketplaceName?: unknown;
    message?: unknown;
  } = {}
): string {
  const direct = safeText(rawLink);
  if (!direct) return "";

  try {
    return compactJoinInviteUrl(direct);
  } catch {
    return "";
  }
}
