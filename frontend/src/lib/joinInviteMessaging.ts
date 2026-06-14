type JoinInviteTextParams = {
  receiver?: string;
  communityName?: string;
  inviter?: string;
  marketplaceName?: string;
  expiresAt?: string;
  customMessage?: string;
};

type JoinInviteDoorwayParams = JoinInviteTextParams & {
  inviteLink?: string;
};

function cleanText(value: unknown): string {
  return String(value ?? "").trim();
}

function safeDateTime(value: unknown): string {
  const raw = cleanText(value);
  if (!raw) return "Not available yet";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString();
}

export function buildJoinInviteLetter(args: JoinInviteTextParams): string[] {
  const receiver = cleanText(args.receiver);
  const communityName = cleanText(args.communityName) || "this GSN community";
  const inviter = cleanText(args.inviter) || "a known GSN member";
  const marketplaceName = cleanText(args.marketplaceName);
  const expiresAt = cleanText(args.expiresAt);
  const customMessage = cleanText(args.customMessage);

  const lines: string[] = [];

  lines.push(receiver ? `Hello ${receiver},` : "Hello,");
  lines.push(
    `${inviter} is inviting you to join ${communityName} on GSN.`
  );
  lines.push("GSN helps trusted communities keep one identity, one record, and one review path for real people who know one another.");

  if (marketplaceName) {
    lines.push(`Community market: ${marketplaceName}.`);
  }

  if (customMessage) {
    lines.push(`Personal note: ${customMessage}`);
  }

  if (expiresAt) {
    lines.push(`Open until: ${safeDateTime(expiresAt)}.`);
  }

  lines.push(
    "If you are interested, continue and send a request. Entry is not automatic; the community reviews first."
  );

  return lines;
}

export function buildJoinInviteDoorwayMessage(
  args: JoinInviteDoorwayParams
): string {
  const receiver = cleanText(args.receiver);
  const communityName = cleanText(args.communityName) || "this GSN community";
  const marketplaceName = cleanText(args.marketplaceName);
  const inviteLink = cleanText(args.inviteLink);
  const customMessage = cleanText(args.customMessage);
  const expiresAt = cleanText(args.expiresAt);

  return [
    receiver ? `Hello ${receiver},` : "Hello,",
    "",
    `${cleanText(args.inviter) || "A known GSN member"} is inviting you to join ${communityName} on GSN.`,
    "GSN helps trusted communities keep one identity, one record, and one review path.",
    marketplaceName ? `Community market: ${marketplaceName}.` : "",
    customMessage ? `Personal note: ${customMessage}` : "",
    expiresAt ? `Open until: ${safeDateTime(expiresAt)}.` : "",
    "",
    "Open the invitation here:",
    inviteLink,
    "",
    "If you already have a GSN ID, sign in with it. If not, fill the request form. Entry is not automatic.",
  ]
    .filter(Boolean)
    .join("\n");
}
