/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

const files = {
  package: "frontend/package.json",
  institutionalPdf: "gmfn_backend/app/services/institutional_pdf.py",
  evidencePack: "gmfn_backend/app/services/evidence_pack_pdf_service.py",
  loanEvidencePack: "gmfn_backend/app/services/loan_evidence_pack_pdf_service.py",
  userEvidencePack: "gmfn_backend/app/services/user_evidence_pack_pdf_service.py",
  trustSlipPdf: "gmfn_backend/app/services/trust_slip_evidence_pdf_service.py",
  trustTimelinePdf: "gmfn_backend/app/services/trust_timeline_pdf_service.py",
  reports: "gmfn_backend/app/services/reports_service.py",
  reportsRoute: "gmfn_backend/app/api/routes/reports.py",
  analyticsRoute: "gmfn_backend/app/api/routes/analytics.py",
  publicPaper: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  privateEvidence: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  boundary: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx",
  resultCard: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyResultCard.tsx",
  snapshotPaper: "frontend/src/lib/gsnSnapshotPaper.ts",
  snapshotPaperCard: "frontend/src/components/GsnSnapshotPaperCard.tsx",
  trustSnapshots: "frontend/src/lib/trustDocumentSnapshots.ts",
  communityVerify: "frontend/src/pages/CommunityVerifyPage.tsx",
  firstCircle: "frontend/src/pages/BuildFirstCirclePage.tsx",
  joinEntry: "frontend/src/pages/JoinEntryPage.tsx",
  joinInviteMessaging: "frontend/src/lib/joinInviteMessaging.ts",
  marketplace: "frontend/src/pages/MarketplacePage.tsx",
  shopAssets: "frontend/src/pages/ShopAssetsPage.tsx",
  communityShopControl: "frontend/src/components/CommunityShopControlPanel.tsx",
  shopControl: "frontend/src/pages/ShopControlPage.tsx",
  publicShop: "frontend/src/pages/ShopGalleryPage.tsx",
  vaultControl: "frontend/src/pages/VaultControlPage.tsx",
  paymentInstructions: "frontend/src/pages/PaymentInstructionsPage.tsx",
  repayment: "frontend/src/pages/RepaymentPage.tsx",
  withdrawal: "frontend/src/pages/WithdrawalInstructionsPage.tsx",
  payoutDetails: "frontend/src/pages/PayoutDetailsPage.tsx",
  subscriptionSpotlight: "frontend/src/pages/SubscriptionSpotlightPage.tsx",
  loanSummary: "frontend/src/pages/LoanSummaryPage.tsx",
  guarantorInbox: "frontend/src/pages/GuarantorInboxPage.tsx",
  guarantorEarnings: "frontend/src/pages/GuarantorEarningsPage.tsx",
  trustSlip: "frontend/src/pages/TrustSlipPage.tsx",
  trustPassport: "frontend/src/pages/TrustScorePage.tsx",
  evidencePanel: "frontend/src/components/EvidencePackPanel.tsx",
  pilotChecklist: "docs/PILOT_EVIDENCE_PACK_CHECKLIST.md",
  uxChecklist: "docs/UX_ACCEPTANCE_CHECKLIST.md",
};

function absolute(file) {
  return join(repoRoot, file);
}

function read(file) {
  const path = absolute(file);
  if (!existsSync(path)) {
    findings.push({
      file,
      line: 1,
      message: "Required proof-surface file is missing.",
      text: file,
    });
    return "";
  }
  return readFileSync(path, "utf8");
}

const sourceByFile = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, read(file)])
);

function lineAt(source, index) {
  return source.slice(0, Math.max(0, index)).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const file = files[key] || key;
  const source = sourceByFile[key] || "";
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 300),
  });
}

function assertContains(key, pattern, message) {
  const source = sourceByFile[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message);
}

function assertNotContains(key, pattern, message) {
  const source = sourceByFile[key];
  let match;
  while ((match = pattern.exec(source))) {
    addFinding(key, match.index, message, match[0]);
  }
}

function assertOrdered(key, snippets, message) {
  const source = sourceByFile[key];
  let cursor = -1;

  for (const snippet of snippets) {
    const index = source.indexOf(snippet, cursor + 1);
    if (index === -1) {
      addFinding(key, Math.max(cursor, 0), message, snippet);
      return;
    }
    cursor = index;
  }
}

const institutionalShellServices = [
  "evidencePack",
  "loanEvidencePack",
  "userEvidencePack",
  "trustTimelinePdf",
  "reports",
];

const pdfServices = [
  ...institutionalShellServices,
  "trustSlipPdf",
];

assertContains(
  "institutionalPdf",
  /def draw_gsn_watermark\(/,
  "Institutional PDF helper must keep the official GSN watermark renderer."
);
assertContains(
  "institutionalPdf",
  /def draw_institutional_header\(/,
  "Institutional PDF helper must keep the reusable header renderer."
);
assertContains(
  "institutionalPdf",
  /def draw_institutional_footer\(/,
  "Institutional PDF helper must keep the reusable footer renderer."
);
assertContains(
  "institutionalPdf",
  /def utc_generated_label\(/,
  "Institutional PDF helper must keep a UTC generated label."
);
assertContains(
  "institutionalPdf",
  /def safe_pdf_text\(/,
  "Institutional PDF helper must keep safe text conversion for official papers."
);
assertContains(
  "institutionalPdf",
  /GLOBAL SUPPORT NETWORK[\s\S]*?Generated:[\s\S]*?Reference:/,
  "Institutional header must show GSN authority, generated time, and reference."
);
assertContains(
  "institutionalPdf",
  /not a bank guarantee/,
  "Institutional footer must keep the limitation that papers are not bank guarantees."
);

for (const key of institutionalShellServices) {
  assertContains(key, /draw_institutional_header/, "PDF services must use the shared institutional header.");
  assertContains(key, /draw_institutional_footer/, "PDF services must use the shared institutional footer.");
  assertContains(key, /safe_pdf_text/, "PDF services must sanitize visible PDF text.");
  assertContains(key, /utc_generated_label/, "PDF services must stamp a UTC generated time.");
}

assertContains(
  "trustSlipPdf",
  /title="GSN TrustSlip Evidence Snapshot"/,
  "TrustSlip PDF metadata must use the GSN evidence snapshot title."
);
assertContains(
  "trustSlipPdf",
  /Global Support Network official evidence paper/,
  "TrustSlip PDF must identify itself as an official GSN evidence paper."
);
assertContains(
  "trustSlipPdf",
  /Evidence Pack ID/,
  "TrustSlip PDF must show an Evidence Pack ID."
);
assertContains(
  "trustSlipPdf",
  /Generated at \(UTC\)/,
  "TrustSlip PDF must show when it was generated."
);
assertContains(
  "trustSlipPdf",
  /not a bank guarantee[\s\S]*?does not auto-debit/,
  "TrustSlip PDF must keep the reader-facing limitation language."
);
assertContains(
  "trustSlipPdf",
  /draw_gsn_watermark[\s\S]*?draw_institutional_footer/,
  "TrustSlip PDF must draw the official watermark and footer on every page."
);

assertContains(
  "reports",
  /GSN Community Exposure Report/,
  "Community exposure reports must use the current GSN community-facing title."
);
assertContains(
  "reports",
  /Community Exposure Table/,
  "Loan trust report exposure tables must use community-facing wording."
);
assertContains(
  "reports",
  /p\("Community", f"\{getattr\(clan, 'name', None\) or '-'\} \(ID: \{getattr\(loan, 'clan_id', '-'\)\}\)"\)/,
  "Loan trust report identity rows must label the route context as Community, not Clan."
);
assertContains(
  "reports",
  /Community Exposure Summary[\s\S]*?GSN community exposure report - controlled community trust record\./,
  "Community exposure reports must use current GSN community-facing summary and footer wording."
);
assertNotContains(
  "reports",
  /GSN Clan Exposure Report|Clan Exposure Table|Clan Exposure Summary|Clan Exposure Ratio|p\("Clan"|clan exposure report/,
  "Community exposure reports must not expose older clan wording."
);
assertContains(
  "loanEvidencePack",
  /kv\("Community", clan_name or "-"\)/,
  "Loan evidence pack PDFs must label the route context as Community, not Clan."
);
assertNotContains(
  "loanEvidencePack",
  /kv\("Clan"/,
  "Loan evidence pack PDFs must not expose older Clan labels."
);
assertContains(
  "reportsRoute",
  /GSN Community Governance Pack[\s\S]*?Community ID:[\s\S]*?Community Name:[\s\S]*?gsn-community-\{clan_id\}-governance-pack/,
  "Governance ZIP README and filename must use GSN community-facing wording."
);
assertNotContains(
  "reportsRoute",
  /GMFN Clan Governance Pack|Clan ID:|Clan Name:|gmfn-clan-\{clan_id\}-governance-pack|clan-\{clan_id\}-exposure\.(?:csv|pdf)/,
  "Governance ZIP artifacts must not expose older GMFN/clan wording."
);
assertContains(
  "reportsRoute",
  /GSN Loan Evidence Pack[\s\S]*?Community ID: \{loan\.clan_id\}/,
  "Loan evidence ZIP README must use GSN community-facing wording."
);
assertNotContains(
  "reportsRoute",
  /GMFN Loan Evidence Pack|Clan ID: \{loan\.clan_id\}/,
  "Loan evidence ZIP README must not expose older GMFN/clan wording."
);
assertContains(
  "analyticsRoute",
  /gsn-community-\{clan_id\}-recent-invite-joins\.csv[\s\S]*?gsn-community-\{clan_id\}-trust-events\.csv[\s\S]*?gsn-community-\{clan_id\}-evidence-pack\.pdf[\s\S]*?gsn-loan-\{loan_id\}-evidence-pack\.pdf/,
  "Analytics evidence download filenames must use GSN community-facing wording."
);
assertNotContains(
  "analyticsRoute",
  /GMFN_clan_\{clan_id\}_evidence_pack\.pdf|GMFN_loan_\{loan_id\}_evidence_pack\.pdf|clan_\{clan_id\}_recent_invite_joins\.csv|clan_\{clan_id\}_trust_events\.csv/,
  "Analytics evidence download filenames must not expose older GMFN/clan wording."
);

for (const key of pdfServices) {
  assertNotContains(
    key,
    /GMFN Evidence Pack|GMFN TrustSlip Evidence Snapshot|GMFN Trust Timeline Evidence Report|GMFN Loan Trust Report|GMFN Clan Exposure Report|GSN Clan Exposure Report/g,
    "Official PDF paper titles must use the user-facing GSN brand and community language."
  );
  assertNotContains(
    key,
    /[\u2013\u2014\u2018\u2019\u201C\u201D\u00A0\u00C2]/g,
    "Official PDF source text must avoid non-ASCII punctuation that can render badly in generated papers."
  );
  assertNotContains(
    key,
    /â|�/g,
    "Official PDF source text must not contain garbled mojibake characters."
  );
}

assertContains(
  "publicPaper",
  /import GSNBrandMark/,
  "Public TrustSlip paper must use the official GSN brand mark."
);
assertContains(
  "publicPaper",
  /officialPaperWatermark[\s\S]*?<GSNBrandMark/,
  "Public TrustSlip paper must keep the official paper watermark."
);
assertContains(
  "publicPaper",
  /QRCodeSVG/,
  "Public TrustSlip paper must keep QR verification support."
);
assertContains(
  "publicPaper",
  /Public verification paper[\s\S]*?TrustSlip Verify/,
  "Public TrustSlip paper must present itself as an institutional verification paper."
);
assertContains(
  "publicPaper",
  /Code: \{resolvedCode \|\| "Not available"\}[\s\S]*?Public link: \{verifyPath \|\| "Not available"\}/,
  "Public TrustSlip paper must expose both code and verification path."
);
assertContains(
  "publicPaper",
  /GSN returns counts and outcome only\. It does not publish member phone numbers\./,
  "Public TrustSlip paper must keep privacy boundary language."
);
assertContains(
  "publicPaper",
  /decision left with the reader/,
  "Public TrustSlip paper footer must keep the reader-decision limitation."
);

assertContains(
  "privateEvidence",
  /import GSNBrandMark/,
  "Private evidence area must keep the official GSN watermark."
);
assertContains(
  "privateEvidence",
  /className="print-trust-document"/,
  "Private evidence area must remain printable as a document section."
);
assertContains(
  "privateEvidence",
  /Verification code:[\s\S]*?Verification state:/,
  "Private evidence area must show verification code and state."
);
assertContains(
  "privateEvidence",
  /Public verify path:/,
  "Private evidence area must show the public verify path."
);

assertContains(
  "boundary",
  /Public paper ends here[\s\S]*?Private review area below/,
  "TrustSlip verify page must clearly separate public paper from private review."
);
assertContains(
  "resultCard",
  /Verification result[\s\S]*?Code: \{resolvedCode \|\| "Not available"\}[\s\S]*?Status: \{statusLabel\}/,
  "TrustSlip result card must show result, code, and status."
);

assertContains(
  "snapshotPaper",
  /Official GSN headed paper[\s\S]*?Generated \(UTC\):[\s\S]*?Global Support Network \(GSN\)/,
  "Shared copied snapshot papers must keep GSN headed-paper authority, generated time, and footer."
);
assertContains(
  "snapshotPaper",
  /buildGsnCommunityVerifyLinkPackage[\s\S]*?GSN Community Verification Link[\s\S]*?buildGsnInviteLinkPackage[\s\S]*?GSN Community Invite[\s\S]*?buildGsnPublicShopLinkPackage[\s\S]*?GSN Public Shop Invitation/,
  "Shared proof package helper must cover community verification, community invites, and public shop invitations."
);
assertContains(
  "snapshotPaper",
  /buildGsnVaultInvitePackage[\s\S]*?GSN Private Vault Invitation/,
  "Shared proof package helper must cover private Vault invitation packages."
);
assertContains(
  "snapshotPaper",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Payment Instruction[\s\S]*?Not a receipt or bank guarantee until reconciliation confirms funds/,
  "Shared proof package helper must cover payment, payout, and receipt-like instruction packages."
);
assertContains(
  "snapshotPaper",
  /buildGsnSupportEvidencePackage[\s\S]*?GSN Support Evidence Snapshot[\s\S]*?Not a guarantee, lending approval, receipt, or payout/,
  "Shared proof package helper must cover loan, guarantor, and support evidence snapshots."
);
assertNotContains(
  "snapshotPaper",
  /A branded|Use this branded|viewer should|careful reader/g,
  "Shared proof package text must speak to the receiver, not describe builder-side branding."
);
assertContains(
  "snapshotPaperCard",
  /import GSNBrandMark[\s\S]*?TrustPaperWatermark[\s\S]*?TrustPaperSecurityFooter/,
  "Shared visual snapshot paper card must use the GSN mark, watermark, and institutional footer."
);
assertContains(
  "snapshotPaperCard",
  /Title:[\s\S]*?Generated \(UTC\):[\s\S]*?Reference:[\s\S]*?Verification \/ action link:[\s\S]*?Privacy:[\s\S]*?Limitation:/,
  "Shared visual snapshot paper card must parse headed-paper title, generated time, reference, link, privacy, and limitation fields."
);
assertContains(
  "snapshotPaperCard",
  /GSN record context[\s\S]*?Record details[\s\S]*?Record Details/,
  "Shared visual snapshot paper card must render context and record details as official paper sections."
);
assertContains(
  "trustSnapshots",
  /import \{ buildGsnSnapshotPaper, gsnGeneratedAt \} from "\.\/gsnSnapshotPaper";[\s\S]*?GSN Identity & Integrity Snapshot[\s\S]*?GSN Cross-Community Consistency Snapshot[\s\S]*?GSN TrustSlip Snapshot[\s\S]*?GSN TrustSlip Verification Snapshot[\s\S]*?GSN Trust Passport Snapshot/,
  "Trust document copy snapshots must use GSN headed-paper helpers and keep Trust Passport official."
);
assertNotContains(
  "trustSnapshots",
  /A branded|Use this branded|careful reader|Short shareable/g,
  "Trust document snapshots must use direct receiver-facing language, not builder-side package language."
);
assertContains(
  "trustSnapshots",
  /function friendlyTrustBand[\s\S]*?Early, limited record[\s\S]*?use caution; ask for current proof[\s\S]*?function friendlyScore[\s\S]*?signal only; not a character label/,
  "Trust document snapshots must explain trust bands in concise humane growth language instead of sending bare A/B/C/D/E codes."
);
assertNotContains(
  "trustSnapshots",
  /cleanLine\("Trust band"|cleanLine\("Trust score"|cleanLine\("Local community trust"|cleanLine\("Cross-community consistency"/g,
  "Shareable trust snapshots must not expose bare technical trust labels without layman explanation."
);
assertContains(
  "communityVerify",
  /copyLink[\s\S]*?safeCopy\(publicLink\)[\s\S]*?GSN community verification link copied\./,
  "Public Community Verification Copy link must copy only the public verification URL, not a long headed-paper package for QR visitors."
);
assertContains(
  "firstCircle",
  /buildGsnInviteLinkPackage[\s\S]*?joinInviteMessage[\s\S]*?inviteBundle/,
  "First Circle community invite copy/share text must use the branded GSN invite package."
);
assertContains(
  "joinInviteMessaging",
  /export function buildJoinInviteLetter[\s\S]*?const inviter = cleanText\(args\.inviter\)[\s\S]*?Invited by \$\{inviter\}\.[\s\S]*?export function buildJoinInviteDoorwayMessage[\s\S]*?const inviter = cleanText\(args\.inviter\)[\s\S]*?Invited by \$\{inviter\}\./,
  "Shared join invite messaging must keep the sender name in both the visible invitation paper and copied doorway message."
);
assertContains(
  "joinInviteMessaging",
  /JOIN_INVITE_LINK_HINT[\s\S]*?Tap the GSN Link preview above to open the invitation[\s\S]*?export function buildJoinInviteDoorwayMessage[\s\S]*?inviteLink \? JOIN_INVITE_LINK_HINT : null/,
  "Shared join invite messaging must place a clear tap instruction beside the top GSN link preview in copied doorway messages."
);
assertContains(
  "marketplace",
  /import \{[\s\S]*?compactJoinInviteUrl[\s\S]*?personalizedJoinInviteUrl[\s\S]*?\} from "\.\.\/lib\/joinLinks";[\s\S]*?import \{ buildJoinInviteDoorwayMessage \} from "\.\.\/lib\/joinInviteMessaging";[\s\S]*?activeJoinCommunityCode[\s\S]*?communityCode\(selectedCommunity\)[\s\S]*?personalizedInviteLink[\s\S]*?personalizedJoinInviteUrl\(inviteLink[\s\S]*?recipientName: joinRecipientName[\s\S]*?communityCode: activeJoinCommunityCode[\s\S]*?marketplaceName: activeCommunityName[\s\S]*?message: joinInviteNote[\s\S]*?compactInviteLink[\s\S]*?compactJoinInviteUrl\(personalizedInviteLink\)[\s\S]*?buildJoinInviteDoorwayMessage\([\s\S]*?inviteLink: compactInviteLink[\s\S]*?copyMarketplaceLink\([\s\S]*?personalizedInviteLink[\s\S]*?"GSN join link copied\."[\s\S]*?wa\.me\/\?text=\$\{encodeURIComponent\(joinInviteDoorwayMessage\)\}/,
  "Marketplace join sharing must use a compact outbound doorway link while the actual Join URL preserves receiver/community code/community/marketplace context for the request form."
);
assertContains(
  "joinEntry",
  /import \{ buildJoinInviteLetter \} from "\.\.\/lib\/joinInviteMessaging";[\s\S]*?const inviteLetter = useMemo\([\s\S]*?buildJoinInviteLetter\(/,
  "Join Entry must render the shared full invitation letter above the join request form."
);
assertContains(
  "joinInviteMessaging",
  /JOIN_INVITE_PROOF_LINES = \[[\s\S]*?Build a trusted identity that follows you wherever life takes you\.[\s\S]*?Find work, customers, and opportunities with greater confidence\.[\s\S]*?Buy and sell online knowing more about who you are dealing with\.[\s\S]*?Verify people, businesses, and communities before making decisions\.[\s\S]*?Keep community records clear and reduce misunderstandings and disputes\.[\s\S]*?Organise savings groups, support circles, and community activities with greater accountability\.[\s\S]*?Receive community-backed support when it matters most\.[\s\S]*?Share your Trust Passport or TrustSlip as proof of credibility when trust is needed\.[\s\S]*?export function buildJoinInviteLetter[\s\S]*?You're invited to \$\{inviteTarget\} on GSN\.[\s\S]*?GSN is a trust platform that helps people turn trust and integrity into real-life opportunities\.[\s\S]*?With GSN, you can:[\s\S]*?lines\.push\(\.\.\.JOIN_INVITE_PROOF_LINES\)[\s\S]*?Community: \$\{marketplaceName\}[\s\S]*?Open the GSN link above to view the invitation and request access\.[\s\S]*?Community membership is reviewed before approval\.[\s\S]*?export function buildJoinInviteDoorwayMessage[\s\S]*?inviteLink \|\| null[\s\S]*?Hello \$\{receiver\}[\s\S]*?\.\.\.JOIN_INVITE_PROOF_LINES[\s\S]*?Community: \$\{marketplaceName\}[\s\S]*?After it opens, request access from the invitation page\.[\s\S]*?Community membership is reviewed before approval\./,
  "Shared join invite messaging must keep the best-version solution form-page invite and outbound doorway message serial, icon-led, sender-aware, and review-aware."
);
assertContains(
  "marketplace",
  /buildGsnCommunityVerifyLinkPackage[\s\S]*?marketplaceEmailMessage[\s\S]*?copyMarketplaceLink\([\s\S]*?marketplaceEmailMessage/,
  "Marketplace community verification link copy must use the branded GSN verification package."
);
assertContains(
  "marketplace",
  /buildGsnPublicShopLinkPackage[\s\S]*?Public shop package refreshed and copied/,
  "Marketplace public shop link copy/email must use the branded GSN public shop package."
);
assertContains(
  "publicShop",
  /function copyShopLink[\s\S]*?safeCopy\(absoluteShopShareLink\)[\s\S]*?Public shop link copied\./,
  "Public Shop plain Copy link must copy only the public shop URL; branded packages belong to owner/share-package paths."
);
assertContains(
  "shopAssets",
  /buildGsnPublicShopLinkPackage[\s\S]*?function buildPublicShopPackage[\s\S]*?Public shop package copied[\s\S]*?Public shop block package copied[\s\S]*?Public shop item package copied/,
  "Shop Assets public shop and item copy actions must use the branded GSN public shop package."
);
assertContains(
  "communityShopControl",
  /buildGsnPublicShopLinkPackage[\s\S]*?api\.safeCopy\([\s\S]*?Public shop package copied/,
  "Community Home shop-control public link copy must use the branded GSN public shop package."
);
assertContains(
  "shopControl",
  /buildGsnVaultInvitePackage[\s\S]*?function buildVaultViewingLinkPackage[\s\S]*?Vault viewing package/,
  "Shop Control private Vault viewing links must use the branded GSN Vault invitation package."
);
assertContains(
  "vaultControl",
  /buildGsnVaultInvitePackage[\s\S]*?function buildVaultInvitePackage[\s\S]*?safeCopy\(buildVaultInvitePackage\(url, link\)\)[\s\S]*?safeCopy\(buildVaultInvitePackage\(selectedBlockLinkUrl, selectedBlockPrimaryLink\)\)/,
  "Private Vault copied links must use the branded GSN private Vault package."
);
assertContains(
  "paymentInstructions",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Money In Payment Instruction[\s\S]*?copyText\(text\)/,
  "Money In copied full instructions must use the branded GSN payment instruction package."
);
assertContains(
  "repayment",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Loan Repayment Instruction[\s\S]*?safeCopy\(text\)/,
  "Repayment copied full instructions must use the branded GSN payment instruction package."
);
assertContains(
  "withdrawal",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Community Withdrawal Rail[\s\S]*?GSN Payout Account Summary[\s\S]*?GSN Withdrawal Summary/,
  "Money Out copied rail, payout, and withdrawal summaries must use branded GSN payment instruction packages."
);
assertContains(
  "payoutDetails",
  /GsnSnapshotPaperCard[\s\S]*?payoutSummaryPaper[\s\S]*?safeCopy\(payoutSummaryPaper\)/,
  "Payout Details summaries must use the branded GSN payout details snapshot for both visible paper preview and copy."
);
assertContains(
  "subscriptionSpotlight",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Subscription Spotlight Payment Instruction[\s\S]*?safeCopy\(text\)/,
  "Subscription Spotlight copied payment details must use the branded GSN payment instruction package."
);
assertContains(
  "vaultControl",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Private Vault Payment Instruction[\s\S]*?safeCopy\(text\)/,
  "Vault copied payment details must use the branded GSN payment instruction package."
);
assertContains(
  "loanSummary",
  /buildGsnSupportEvidencePackage[\s\S]*?GSN Loan Audit Link[\s\S]*?loanSummaryPaper[\s\S]*?GSN Loan Summary Snapshot[\s\S]*?GsnSnapshotPaperCard/,
  "Loan Summary copied summary, visual preview, and audit link must use branded GSN support evidence packages."
);
assertContains(
  "guarantorInbox",
  /queuePaper[\s\S]*?GSN Guarantor Queue Snapshot[\s\S]*?safeCopy\(queuePaper\)[\s\S]*?GsnSnapshotPaperCard/,
  "Guarantor Inbox queue summary must use a branded GSN support evidence package for both visible paper preview and copy."
);
assertContains(
  "guarantorEarnings",
  /earningsPaper[\s\S]*?GSN Guarantor Earnings Snapshot[\s\S]*?safeCopy\(earningsPaper\)[\s\S]*?GsnSnapshotPaperCard/,
  "Guarantor Earnings summary must use a branded GSN support evidence package for both visible paper preview and copy."
);

assertContains(
  "trustSlip",
  /Open TrustSlip Verify[\s\S]*?Copy Verify Link[\s\S]*?Open Public Verify/,
  "TrustSlip page must keep open/copy/public verify actions."
);
assertContains(
  "trustSlip",
  /This is not a bank guarantee[\s\S]*?No automatic debit is connected/,
  "TrustSlip page must keep institutional limitation language visible."
);
assertContains(
  "trustPassport",
  /7\. Shareable trust tools[\s\S]*?debugId="trust-score\.verify"[\s\S]*?Open TrustSlip verify/,
  "Trust Passport must keep the shareable TrustSlip verify action."
);
assertContains(
  "trustPassport",
  /GsnSnapshotPaperCard[\s\S]*?trustPassportPaper[\s\S]*?buildTrustPassportSnapshot[\s\S]*?copyTrustSnapshot\(\)[\s\S]*?trustPassportPaper[\s\S]*?paperText=\{trustPassportPaper\}/,
  "Trust Passport copied snapshot and visible snapshot preview must use the same GSN Snapshot Paper package."
);
assertContains(
  "trustPassport",
  /TrustPaperSecurityFooter/,
  "Trust Passport must keep the proof-paper security footer on institutional sections."
);

assertContains(
  "evidencePanel",
  /GSN Evidence Pack \(PDF\)/,
  "Evidence pack panel must use GSN institutional wording."
);
assertContains(
  "evidencePanel",
  /not a bank guarantee/,
  "Evidence pack panel must show the paper limitation before download."
);
assertContains(
  "evidencePanel",
  /GsnRealisticIcon/,
  "Evidence pack panel must use the shared 3D icon system."
);

assertContains(
  "pilotChecklist",
  /10_generated_pdfs[\s\S]*?GSN institutional PDF shell[\s\S]*?not a bank guarantee/,
  "Pilot evidence checklist must keep the generated-PDF institutional shell requirement."
);
assertContains(
  "uxChecklist",
  /watermark (?:or|\/) brand mark[\s\S]*?generated time[\s\S]*?limitation statement[\s\S]*?footer/,
  "UX checklist must keep proof-paper authority requirements."
);

assertOrdered(
  "package",
  ['"audit:trust-actions"', '"audit:proof-surfaces"'],
  "Proof surface audit must be registered near trust audits in package scripts."
);

if (findings.length > 0) {
  console.error("Institutional proof surface audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Institutional proof surface audit passed.");
