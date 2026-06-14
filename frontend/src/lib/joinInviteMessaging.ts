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
    `${inviter} is inviting you to request access to ${communityName}.`
  );

  if (marketplaceName) {
    lines.push(`Community market: ${marketplaceName}.`);
  }

  if (customMessage) {
    lines.push(`Message from inviter: ${customMessage}`);
  }

  if (expiresAt) {
    lines.push(`This invitation remains open until ${safeDateTime(expiresAt)}.`);
  }

  lines.push(
    "Complete the form below if you want to continue. Entry is not automatic; your request goes back to the community for review."
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
    `You are invited to request access to ${communityName} on GSN.`,
    marketplaceName ? `Community market: ${marketplaceName}.` : "",
    customMessage ? `Message: ${customMessage}` : "",
    expiresAt ? `This invitation remains open until ${safeDateTime(expiresAt)}.` : "",
    "",
    "Click here to open the request form:",
    inviteLink,
    "",
    "Entry is not automatic. The community reviews your request first.",
  ]
    .filter(Boolean)
    .join("\n");
}
