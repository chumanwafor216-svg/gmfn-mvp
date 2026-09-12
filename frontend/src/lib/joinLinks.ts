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

function compactJoinInviteContextQuery(rawLink: string): string {
  try {
    const url = new URL(rawLink, publicFrontendOrigin());
    const params = new URLSearchParams();
    ["community_code", "qr_policy", "entry_policy"].forEach((key) => {
      const value = safeText(url.searchParams.get(key));
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return query ? `?${query}` : "";
  } catch {
    return "";
  }
}

export function compactJoinInviteUrl(rawLink: string): string {
  const direct = safeText(rawLink);
  if (!direct) return "";

  const contextQuery = compactJoinInviteContextQuery(direct);
  const code = inviteCodeFromLink(direct);
  if (code) return `${canonicalJoinInviteUrl(code)}${contextQuery}`;

  if (!isJoinInviteLink(direct)) return "";

  try {
    const url = new URL(direct, publicFrontendOrigin());
    return canonicalPublicFrontendUrl(`${url.pathname}${contextQuery}`);
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

function searchParamsFromLink(rawLink: string): URLSearchParams {
  const direct = safeText(rawLink);
  if (!direct) return new URLSearchParams();

  try {
    const url = new URL(direct, publicFrontendOrigin());
    return new URLSearchParams(url.search);
  } catch {
    return new URLSearchParams();
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
    const base = canonicalJoinInviteUrl(code);
    if (!base) return "";

    const params = searchParamsFromLink(direct);
    params.set("invite", code);

    const communityCode = firstTruthy(payload?.community_code);
    const communityName = firstTruthy(payload?.community_name);
    const marketplaceName = firstTruthy(payload?.marketplace_name);
    const qrPolicyKey = firstTruthy(
      payload?.qr_policy_key,
      payload?.qr_policy,
      payload?.entry_policy
    );
    const inviterName = firstTruthy(
      payload?.inviter_name,
      payload?.invited_by_display,
      payload?.invited_by_email
    );

    if (communityCode) params.set("community_code", communityCode);
    if (communityName) params.set("community_name", communityName);
    if (marketplaceName) params.set("marketplace_name", marketplaceName);
    if (qrPolicyKey) params.set("qr_policy", qrPolicyKey);
    if (inviterName) params.set("inviter_name", inviterName);

    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }
  if (isJoinInviteLink(direct)) return canonicalPublicFrontendUrl(direct);
  return "";
}

export function personalizedJoinInviteUrl(
  rawLink: string,
  opts: {
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
    const url = new URL(direct, publicFrontendOrigin());
    const inviterName = safeText(opts.inviterName);
    const recipientName = safeText(opts.recipientName);
    const communityCode = safeText(opts.communityCode);
    const communityName = safeText(opts.communityName);
    const marketplaceName = safeText(opts.marketplaceName);
    const message = safeText(opts.message);

    if (inviterName) url.searchParams.set("inviter_name", inviterName);
    if (recipientName) url.searchParams.set("receiver_name", recipientName);
    if (communityCode) url.searchParams.set("community_code", communityCode);
    if (communityName) url.searchParams.set("community_name", communityName);
    if (marketplaceName) url.searchParams.set("marketplace_name", marketplaceName);
    if (message) url.searchParams.set("message", message);

    return shareablePublicFrontendUrl(`${url.pathname}${url.search}${url.hash}`);
  } catch {
    return "";
  }
}
