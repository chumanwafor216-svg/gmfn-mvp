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

const JOIN_INVITE_PROOF_LINES = [
  "✅ Community-backed trust",
  "✅ Verifiable record",
  "✅ Portable reputation",
  "✅ Privacy protected",
];

const JOIN_INVITE_LINK_HINT =
  "⬆️ Tap the GSN Link preview above to open the invitation.";

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
  const inviter = cleanText(args.inviter);
  const marketplaceName =
    cleanText(args.marketplaceName) ||
    (cleanText(args.communityName) ? `${cleanText(args.communityName)} Marketplace` : "");
  const expiresAt = cleanText(args.expiresAt);
  const customMessage = cleanText(args.customMessage);

  const lines: string[] = [];

  lines.push(receiver ? `Hello ${receiver},` : "Hello,");
  if (inviter) {
    lines.push(`Invited by ${inviter}.`);
  }
  lines.push("");
  lines.push(
    "You have been invited to join a community on GSN."
  );
  lines.push("");
  lines.push(
    "GSN helps trusted communities turn reputation, relationships, and good conduct into portable trust that can travel with people wherever they go."
  );
  lines.push("");
  lines.push(...JOIN_INVITE_PROOF_LINES);

  if (marketplaceName) {
    lines.push("");
    lines.push(`🏛️ ${marketplaceName}`);
  }

  if (customMessage) {
    lines.push("");
    lines.push(`Personal note: ${customMessage}`);
  }

  if (expiresAt) {
    lines.push("");
    lines.push(`Open until: ${safeDateTime(expiresAt)}.`);
  }

  lines.push("");
  lines.push(
    "Open the GSN link above to view the invitation and request access."
  );
  lines.push("");
  lines.push(
    "Community membership is reviewed before approval."
  );

  return lines;
}

export function buildJoinInviteDoorwayMessage(
  args: JoinInviteDoorwayParams
): string {
  const receiver = cleanText(args.receiver);
  const inviter = cleanText(args.inviter);
  const communityName = cleanText(args.communityName) || "this GSN community";
  const marketplaceName =
    cleanText(args.marketplaceName) ||
    (cleanText(args.communityName) ? `${communityName} Marketplace` : "");
  const inviteLink = cleanText(args.inviteLink);
  const customMessage = cleanText(args.customMessage);
  const expiresAt = cleanText(args.expiresAt);

  const lines: Array<string | null> = [
    inviteLink || null,
    inviteLink ? JOIN_INVITE_LINK_HINT : null,
    "",
    receiver ? `Hello ${receiver},` : "Hello,",
    inviter ? `Invited by ${inviter}.` : null,
    "",
    "You have been invited to join a community on GSN.",
    "",
    "GSN helps trusted communities turn reputation, relationships, and good conduct into portable trust that can travel with people wherever they go.",
    "",
    ...JOIN_INVITE_PROOF_LINES,
    "",
    marketplaceName ? `🏛️ ${marketplaceName}` : null,
  ];

  if (customMessage) {
    lines.push("", `Personal note: ${customMessage}`);
  }

  if (expiresAt) {
    lines.push("", `Open until: ${safeDateTime(expiresAt)}.`);
  }

  lines.push(
    "",
    "After it opens, request access from the invitation page.",
    "",
    "Community membership is reviewed before approval."
  );

  return lines.filter((line) => line !== null).join("\n");
}
