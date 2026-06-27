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
    "Limitation: GSN record only. Not a bank guarantee, credit approval, payment instruction, or automatic debit authority.";

  return [
    "GLOBAL SUPPORT NETWORK (GSN)",
    "Official GSN headed paper",
    "",
    `Title: ${safeText(params.title) || "GSN Snapshot"}`,
    params.purpose ? `Purpose: ${safeText(params.purpose)}` : "",
    `Generated (UTC): ${generatedAt}`,
    reference ? `Reference: ${reference}` : "",
    `Security marks: GSN brand mark, watermark, UTC time, reference, privacy note, and limitation note must travel with screenshots or printed copies.`,
    "",
    contextLines.length ? "GSN record context" : "",
    ...contextLines,
    "",
    bodyLines.length ? "Record details" : "",
    ...bodyLines,
    "",
    link ? `Verification / action link: ${link}` : "",
    privacyNote,
    limitationNote,
    "",
    "Footer: Global Support Network (GSN). Trust infrastructure for organized communities.",
  ]
    .filter((line, index, lines) => {
      if (line !== "") return true;
      return lines[index - 1] !== "";
    })
    .join("\n");
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
    purpose: "Check the public GSN record for this community.",
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
      "Check the community record GSN is allowed to show publicly.",
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
  inviteLink: string;
  messageLines?: Array<string | null | undefined | false>;
}): string {
  return buildGsnSnapshotPaper({
    title: "GSN Community Invite",
    purpose: "Open this invite to request entry into the named GSN community.",
    reference: safeText(params.senderGsnId),
    link: params.inviteLink,
    context: [
      { label: "Sender", value: params.senderName },
      { label: "Sender GSN ID", value: params.senderGsnId },
      { label: "Community", value: params.communityName },
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
    purpose: "Open this shop link to view the public shop face and public blocks.",
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
      "Privacy: only public shop information is shown. Private Vault items need a separate owner link.",
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
      { label: "Route", value: params.routeName },
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
      "Keep the current support state, member context, and next review facts together.",
    reference: safeText(params.reference || params.loanId),
    link: params.actionLink,
    context: [
      { label: "Member", value: params.memberName },
      { label: "GSN ID", value: params.gsnId },
      { label: "Role", value: params.memberRole },
      { label: "Community", value: params.communityName },
      { label: "Community ID", value: params.communityId },
      { label: "Route", value: params.routeName },
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
