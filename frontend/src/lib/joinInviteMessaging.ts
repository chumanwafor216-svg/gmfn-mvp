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

const JOIN_INVITE_EVIDENCE_LINES = [
  "✅ Build a trusted identity that follows you wherever life takes you.",
  "✅ Find work, customers, and opportunities with greater confidence.",
  "✅ Buy and sell online knowing more about who you are dealing with.",
  "✅ Verify people, businesses, and communities before making decisions.",
  "✅ Keep community records clear and reduce misunderstandings and disputes.",
  "✅ Organise savings groups, support circles, and community activities with greater accountability.",
  "✅ Receive community-backed support when it matters most.",
  "✅ Share your Trust Passport or TrustSlip as checkable credibility evidence when trust is needed.",
];

const JOIN_INVITE_LINK_HINT =
  "⬆️ Tap the preview above to open the invitation.";

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
  const inviteTarget = marketplaceName || cleanText(args.communityName) || "our community";
  const expiresAt = cleanText(args.expiresAt);
  const customMessage = cleanText(args.customMessage);

  const lines: string[] = [];

  lines.push(receiver ? `Hello ${receiver},` : "Hello,");
  if (inviter) {
    lines.push(`Invited by ${inviter}.`);
  }
  lines.push("");
  lines.push(
    `You're invited to ${inviteTarget} on GSN.`
  );
  lines.push("");
  lines.push(
    "GSN is a trust platform that helps people turn trust and integrity into real-life opportunities."
  );
  lines.push("");
  lines.push("With GSN, you can:");
  lines.push("");
  lines.push(...JOIN_INVITE_EVIDENCE_LINES);

  if (marketplaceName) {
    lines.push("");
    lines.push(`🏛️ Community: ${marketplaceName}`);
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
  const inviteTarget = marketplaceName || communityName;
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
    `You're invited to ${inviteTarget} on GSN.`,
    "",
    "GSN is a trust platform that helps people turn trust and integrity into real-life opportunities.",
    "",
    "With GSN, you can:",
    "",
    ...JOIN_INVITE_EVIDENCE_LINES,
    "",
    marketplaceName ? `🏛️ Community: ${marketplaceName}` : null,
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
