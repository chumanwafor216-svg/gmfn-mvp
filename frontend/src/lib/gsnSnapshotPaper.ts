type PaperFact = {
  label: string;
  value?: unknown;
};

type GsnSnapshotPaperParams = {
  title: string;
  purpose?: string;
  reference?: string;
  link?: string;
  context?: PaperFact[];
  bodyLines?: Array<string | null | undefined | false>;
  privacyNote?: string;
  limitationNote?: string;
  generatedAt?: Date;
};

type GsnCompactPublicLinkParams = {
  title: string;
  link: string;
  primaryLabel?: string;
  primaryValue?: unknown;
  secondaryLabel?: string;
  secondaryValue?: unknown;
  referenceLabel?: string;
  referenceValue?: unknown;
  status?: unknown;
  note?: string;
};

type GsnSupportEvidenceParams = {
  title?: string;
  purpose?: string;
  reference?: string;
  memberName?: string;
  gsnId?: string;
  memberRole?: string;
  communityName?: string;
  communityId?: string;
  routeName?: string;
  loanId?: string | number;
  amount?: string;
  status?: string;
  detailLines?: Array<string | null | undefined | false>;
  actionLink?: string;
};

function safeText(value: unknown): string {
  return String(value ?? "").trim();
}

function cleanLines(lines: Array<string | null | undefined | false> = []): string[] {
  return lines
    .map((line) => safeText(line))
    .filter(Boolean);
}

function factLine(fact: PaperFact): string {
  const label = safeText(fact.label);
  const value = safeText(fact.value) || "-";
  return `${label}: ${value}`;
}

function compactFactLine(label: string | undefined, value: unknown): string {
  const cleanLabel = safeText(label);
  const cleanValue = safeText(value);
  if (!cleanLabel || !cleanValue) return "";
  return `${cleanLabel}: ${cleanValue}`;
}

export function gsnGeneratedAt(date = new Date()): string {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function buildGsnSnapshotPaper(params: GsnSnapshotPaperParams): string {
  const generatedAt = gsnGeneratedAt(params.generatedAt);
  const contextLines = (params.context || [])
    .filter((fact) => safeText(fact.label))
    .map(factLine);
  const bodyLines = cleanLines(params.bodyLines);
  const reference = safeText(params.reference);
  const link = safeText(params.link);
  const privacyNote =
    safeText(params.privacyNote) ||
    "Privacy: only details needed for this GSN check are shown.";
  const limitationNote =
    safeText(params.limitationNote) ||
    "Limitation: GSN evidence only. Not approval, guarantee, payment instruction, or auto-debit.";

  return [
    "GLOBAL SUPPORT NETWORK (GSN)",
    "",
    `Title: ${safeText(params.title) || "GSN Snapshot"}`,
    params.purpose ? `Purpose: ${safeText(params.purpose)}` : "",
    `Generated (UTC): ${generatedAt}`,
    reference ? `Record code: ${reference}` : "",
    `Security note: Keep the GSN mark, generated time, record code, privacy note, and limitation note with any copy.`,
    "",
    contextLines.length ? "Public record context" : "",
    ...contextLines,
    "",
    bodyLines.length ? "What you need to know" : "",
    ...bodyLines,
    "",
    link ? `Open this record: ${link}` : "",
    privacyNote,
    limitationNote,
  ]
    .filter((line, index, lines) => {
      if (line !== "") return true;
      return lines[index - 1] !== "";
    })
    .join("\n");
}

export function buildGsnCompactPublicLinkPackage(
  params: GsnCompactPublicLinkParams
): string {
  const title = safeText(params.title) || "GSN Public Record";
  const link = safeText(params.link);
  const note =
    safeText(params.note) ||
    "Evidence only. Open this GSN record and check the current public details before you act.";

  return [
    title,
    compactFactLine(params.primaryLabel, params.primaryValue),
    compactFactLine(params.secondaryLabel, params.secondaryValue),
    compactFactLine(params.referenceLabel, params.referenceValue),
    compactFactLine("Status", params.status),
    note,
    link,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildGsnCommunityVerifyLinkMessage(params: {
  communityName?: string;
  communityId?: string;
  status?: string;
  verifyLink: string;
}): string {
  return buildGsnCompactPublicLinkPackage({
    title: "GSN Community Record",
    primaryLabel: "Community",
    primaryValue: params.communityName,
    referenceLabel: "Community ID",
    referenceValue: params.communityId,
    status: params.status,
    note: "Evidence only. Open this link to check the current public community record.",
    link: params.verifyLink,
  });
}

export function buildGsnInviteLinkMessage(params: {
  senderName?: string;
  senderGsnId?: string;
  communityName?: string;
  inviteLink: string;
  note?: string;
}): string {
  return buildGsnCompactPublicLinkPackage({
    title: "GSN Community Invite",
    primaryLabel: "Community",
    primaryValue: params.communityName,
    secondaryLabel: "From",
    secondaryValue: params.senderName,
    referenceLabel: "GSN ID",
    referenceValue: params.senderGsnId,
    note: safeText(params.note) || "Open this invite to request access.",
    link: params.inviteLink,
  });
}

export function buildGsnPublicShopLinkMessage(params: {
  shopName?: string;
  ownerName?: string;
  gsnId?: string;
  communityName?: string;
  itemName?: string;
  shopLink: string;
}): string {
  return buildGsnCompactPublicLinkPackage({
    title: "GSN Public Shop",
    primaryLabel: "Shop",
    primaryValue: params.itemName || params.shopName,
    secondaryLabel: "Seller",
    secondaryValue: params.ownerName,
    referenceLabel: "GSN ID",
    referenceValue: params.gsnId,
    status: params.communityName,
    note: "Evidence only. Open this shop link to check current items and visible evidence.",
    link: params.shopLink,
  });
}

export function buildGsnVaultInviteMessage(params: {
  shopName?: string;
  gsnId?: string;
  blockName?: string;
  blockLabel?: string;
  vaultLink: string;
}): string {
  return buildGsnCompactPublicLinkPackage({
    title: "GSN Private Vault Link",
    primaryLabel: "Shop",
    primaryValue: params.shopName,
    secondaryLabel: "Private offer",
    secondaryValue: params.blockName || params.blockLabel,
    referenceLabel: "GSN ID",
    referenceValue: params.gsnId,
    note: "Open this private link to view the selected Vault block.",
    link: params.vaultLink,
  });
}

export function buildGsnCommunityVerifyLinkPackage(params: {
  communityName?: string;
  communityId?: string;
  status?: string;
  publicRecord?: string;
  relayAvailability?: string;
  verifyLink: string;
}): string {
  return buildGsnSnapshotPaper({
    title: "GSN Community Verification Link",
    purpose: "Open this link to check the public GSN record for this community.",
    reference: safeText(params.communityId),
    link: params.verifyLink,
    context: [
      { label: "Community", value: params.communityName },
      { label: "Community ID", value: params.communityId },
      { label: "Status", value: params.status },
      { label: "Public record", value: params.publicRecord },
      { label: "Relay availability", value: params.relayAvailability },
    ],
    bodyLines: [
      "Use this page to confirm which Community ID the public link points to.",
      "Private member details, phone numbers, sponsor details, and private trust history stay protected.",
    ],
    privacyNote:
      "Privacy: only public community verification fields are shown.",
    limitationNote:
      "Limitation: opens a public GSN community record only. Not a bank guarantee, credit approval, protected-domain approval, or evidence that every claim is true.",
  });
}

export function buildGsnInviteLinkPackage(params: {
  senderName?: string;
  senderGsnId?: string;
  communityName?: string;
  title?: string;
  purpose?: string;
  communityLabel?: string;
  inviteLink: string;
  messageLines?: Array<string | null | undefined | false>;
}): string {
  return buildGsnSnapshotPaper({
    title: safeText(params.title) || "GSN Community Invite",
    purpose:
      safeText(params.purpose) ||
      "Open this invite to request entry into the named GSN community.",
    reference: safeText(params.senderGsnId),
    link: params.inviteLink,
    context: [
      { label: "Sender", value: params.senderName },
      { label: "Sender GSN ID", value: params.senderGsnId },
      { label: safeText(params.communityLabel) || "Community", value: params.communityName },
    ],
    bodyLines: cleanLines(params.messageLines),
    privacyNote:
      "Privacy: private member lists and private trust history are not shown.",
    limitationNote:
      "Limitation: this invite opens a request path. Entry still depends on approval rules.",
  });
}

export function buildGsnPublicShopLinkPackage(params: {
  shopName?: string;
  ownerName?: string;
  gsnId?: string;
  communityName?: string;
  category?: string;
  shopLink: string;
  blockLabel?: string;
  itemName?: string;
  messageLines?: Array<string | null | undefined | false>;
}): string {
  return buildGsnSnapshotPaper({
    title: "GSN Public Shop Invitation",
    purpose: "Open this shop link to view the public shop page and visible public items.",
    reference: safeText(params.gsnId),
    link: params.shopLink,
    context: [
      { label: "Shop", value: params.shopName },
      { label: "Owner", value: params.ownerName },
      { label: "GSN ID", value: params.gsnId },
      { label: "Community", value: params.communityName },
      { label: "Category", value: params.category },
      { label: "Public block", value: params.blockLabel },
      { label: "Item / update", value: params.itemName },
    ],
    bodyLines: cleanLines(params.messageLines),
    privacyNote:
      "Privacy: only public shop information is shown. Private Vault items need a separate private link from the shop.",
    limitationNote:
      "Limitation: verify current price, availability, and trust evidence before relying on the offer.",
  });
}

export function buildGsnVaultInvitePackage(params: {
  shopName?: string;
  gsnId?: string;
  blockLabel?: string;
  blockName?: string;
  status?: string;
  expiresAt?: string;
  vaultLink: string;
}): string {
  return buildGsnSnapshotPaper({
    title: "GSN Private Vault Invitation",
    purpose: "Open this private link to view one selected Vault block.",
    reference: safeText(params.gsnId),
    link: params.vaultLink,
    context: [
      { label: "Shop", value: params.shopName },
      { label: "GSN ID", value: params.gsnId },
      { label: "Vault block", value: params.blockLabel },
      { label: "Private offer", value: params.blockName },
      { label: "Link status", value: params.status },
      { label: "Link expires", value: params.expiresAt },
    ],
    bodyLines: [
      "This link opens only the selected private Vault block.",
      "No other Vault block opens from this link.",
      "Confirm price, availability, and trust evidence before relying on the offer.",
    ],
    privacyNote:
      "Privacy: other Vault blocks, owner records, and private member details are not shown.",
    limitationNote:
      "Limitation: private shop access only. Not a guarantee, credit approval, or evidence that the offer is still available.",
  });
}

export function buildGsnPaymentInstructionPackage(params: {
  title?: string;
  purpose?: string;
  reference?: string;
  memberName?: string;
  gsnId?: string;
  communityName?: string;
  communityId?: string;
  routeName?: string;
  amount?: string;
  status?: string;
  dueAt?: string;
  detailLines?: Array<string | null | undefined | false>;
}): string {
  return buildGsnSnapshotPaper({
    title: safeText(params.title) || "GSN Payment Instruction",
    purpose:
      safeText(params.purpose) ||
      "Keep the amount, destination, and reference together for this payment.",
    reference: safeText(params.reference),
    context: [
      { label: "Member", value: params.memberName },
      { label: "GSN ID", value: params.gsnId },
      { label: "Community", value: params.communityName },
      { label: "Community ID", value: params.communityId },
      { label: "Action area", value: params.routeName },
      { label: "Amount", value: params.amount },
      { label: "Status", value: params.status },
      { label: "Due / currentness", value: params.dueAt },
    ],
    bodyLines: [
      "Use the exact reference shown in this paper when making the transfer.",
      ...cleanLines(params.detailLines),
    ],
    privacyNote:
      "Privacy: only payment or payout details needed for this GSN action are shown.",
    limitationNote:
      "Limitation: instruction or summary only. Not a receipt or bank guarantee until reconciliation confirms funds.",
  });
}

export function buildGsnSupportEvidencePackage(params: {
  title?: string;
  purpose?: string;
  reference?: string;
  memberName?: string;
  gsnId?: string;
  memberRole?: string;
  communityName?: string;
  communityId?: string;
  routeName?: string;
  loanId?: string | number;
  amount?: string;
  status?: string;
  detailLines?: Array<string | null | undefined | false>;
  actionLink?: string;
}): string {
  return buildGsnSnapshotPaper({
    title: safeText(params.title) || "GSN Support Evidence Snapshot",
    purpose:
      safeText(params.purpose) ||
      "Keep the current support status, member context, and next review facts together.",
    reference: safeText(params.reference || params.loanId),
    link: params.actionLink,
    context: [
      { label: "Member", value: params.memberName },
      { label: "GSN ID", value: params.gsnId },
      { label: "Role", value: params.memberRole },
      { label: "Community", value: params.communityName },
      { label: "Community ID", value: params.communityId },
      { label: "Action area", value: params.routeName },
      { label: "Loan / support ID", value: params.loanId },
      { label: "Amount", value: params.amount },
      { label: "Status", value: params.status },
    ],
    bodyLines: cleanLines(params.detailLines),
    privacyNote:
      "Privacy: only support evidence needed for review is shown. Private records stay protected.",
    limitationNote:
      "Limitation: support evidence only. Not a guarantee, lending approval, receipt, or payout.",
  });
}

export function buildGsnSupportEvidenceShareText(
  params: GsnSupportEvidenceParams
): string {
  const title = safeText(params.title) || "GSN Support Evidence";
  const supportId = safeText(params.reference || params.loanId);
  const details = cleanLines(params.detailLines).slice(0, 2);
  const link = safeText(params.actionLink);

  return [
    title,
    compactFactLine("Member", params.memberName),
    compactFactLine("GSN ID", params.gsnId),
    compactFactLine("Community", params.communityName),
    compactFactLine("Support ID", supportId),
    compactFactLine("Amount", params.amount),
    compactFactLine("Status", params.status),
    ...details,
    "Evidence only. Open GSN to check the current support record before you act.",
    link,
    "GSN support evidence is not approval, a guarantee, a receipt, or payout authority.",
  ]
    .filter(Boolean)
    .join("\n");
}
