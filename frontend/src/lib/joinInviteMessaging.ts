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
  admissionMode?: string;
};

const JOIN_INVITE_EVIDENCE_LINES = [
  "- Request access with your GSN identity and community context.",
  "- Keep useful community, trade, and TrustSlip evidence connected.",
  "- Use the link to send a reviewed membership request.",
];


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
    "GSN is an evidence platform that helps communities organise trust and integrity into real-life opportunities."
  );
  lines.push("");
  lines.push("This helps you:");
  lines.push("");
  lines.push(...JOIN_INVITE_EVIDENCE_LINES);

  if (marketplaceName) {
    lines.push("");
    lines.push(`Community: ${marketplaceName}`);
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

export function buildSimpleJoinInviteMessage(
  args: JoinInviteDoorwayParams
): string {
  const receiver = cleanText(args.receiver);
  const inviter = cleanText(args.inviter);
  const communityName =
    cleanText(args.communityName) ||
    cleanText(args.marketplaceName) ||
    "this GSN community";
  const inviteLink = cleanText(args.inviteLink);
  const customMessage = cleanText(args.customMessage);
  const isDefaultNote = /^open this (invite|link) to request access\.?$/i.test(
    customMessage
  );
  const admissionMode = cleanText(args.admissionMode).toLowerCase();
  const intro = inviter
    ? `${inviter} invited you to join ${communityName} on GSN.`
    : `You are invited to join ${communityName} on GSN.`;
  const firstLine = receiver ? `Hi ${receiver}, ${intro}` : intro;
  const nextStep =
    admissionMode === "instant_invite"
      ? "Open to join."
      : "Open to request access. Approval is required.";

  return [
    firstLine,
    customMessage && !isDefaultNote ? customMessage : "",
    nextStep,
    inviteLink,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildJoinInviteDoorwayMessage(
  args: JoinInviteDoorwayParams
): string {
  return buildSimpleJoinInviteMessage(args);
}
