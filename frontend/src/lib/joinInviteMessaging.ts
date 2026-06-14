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
  lines.push(
    "This follows what trusted people already do: we know one another, help where we can, encourage each other, and stand with real relationships."
  );
  lines.push(
    "GSN helps carry that relationship record beyond one place, so your community identity can support safer business, support, and opportunity wherever it is accepted."
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
    "If you are interested, continue to the request form. Entry is not automatic; the community still reviews and votes before membership is granted."
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
    `${cleanText(args.inviter) || "A known GSN member"} is inviting you to request access to ${communityName} on GSN.`,
    "This is relationship-based. It carries the kind of help, encouragement, and real-life support trusted people already give each other into a safer community record.",
    "GSN helps that record travel beyond one place, so one trusted identity can support safer business and support wherever it is accepted.",
    marketplaceName ? `Community market: ${marketplaceName}.` : "",
    customMessage ? `Message: ${customMessage}` : "",
    expiresAt ? `This invitation remains open until ${safeDateTime(expiresAt)}.` : "",
    "",
    "If you are interested, open the invitation here:",
    inviteLink,
    "",
    "Entry is not automatic. The community reviews your request first.",
  ]
    .filter(Boolean)
    .join("\n");
}
