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
  evidencePackRoute: "gmfn_backend/app/api/routes/evidence_pack.py",
  portableEvidencePack: "gmfn_backend/app/services/evidence_pack_service.py",
  trustWhyRoute: "gmfn_backend/app/api/routes/trust_why.py",
  evidencePackTrustWhyRoute: "gmfn_backend/app/api/routes/evidence_pack_trustwhy.py",
  adminEvidenceTrustWhyRoute: "gmfn_backend/app/api/routes/admin_evidence_trustwhy.py",
  evidenceVerifyRoute: "gmfn_backend/app/api/routes/evidence_verify.py",
  shipmentRoute: "gmfn_backend/app/api/routes/shipment.py",
  trustEvidencePack: "gmfn_backend/app/services/trust_evidence_pack_service.py",
  loanEvidencePack: "gmfn_backend/app/services/loan_evidence_pack_pdf_service.py",
  userEvidencePack: "gmfn_backend/app/services/user_evidence_pack_pdf_service.py",
  trustSlipPdf: "gmfn_backend/app/services/trust_slip_evidence_pdf_service.py",
  trustSlipEvidenceRoute: "gmfn_backend/app/api/routes/trust_slip_evidence.py",
  trustTimelinePdf: "gmfn_backend/app/services/trust_timeline_pdf_service.py",
  trustTimelineRoute: "gmfn_backend/app/api/routes/trust_timeline_pdf.py",
  trustSlipRoute: "gmfn_backend/app/api/routes/trust_slips.py",
  trustScoreService: "gmfn_backend/app/services/trust_score_service.py",
  reports: "gmfn_backend/app/services/reports_service.py",
  reportsRoute: "gmfn_backend/app/api/routes/reports.py",
  analyticsRoute: "gmfn_backend/app/api/routes/analytics.py",
  shareRoute: "gmfn_backend/app/api/routes/share.py",
  publicPaper: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  trustPaperMarks: "frontend/src/components/TrustPaperMarks.tsx",
  privateEvidence: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  boundary: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx",
  resultCard: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyResultCard.tsx",
  snapshotPaper: "frontend/src/lib/gsnSnapshotPaper.ts",
  snapshotPaperCard: "frontend/src/components/GsnSnapshotPaperCard.tsx",
  trustSnapshots: "frontend/src/lib/trustDocumentSnapshots.ts",
  communityVerify: "frontend/src/pages/CommunityVerifyPage.tsx",
  communityMemberVerify: "frontend/src/pages/CommunityMemberVerifyPage.tsx",
  communityConfirmationOutcome: "frontend/src/pages/CommunityConfirmationOutcomePage.tsx",
  firstCircle: "frontend/src/pages/BuildFirstCirclePage.tsx",
  joinEntry: "frontend/src/pages/JoinEntryPage.tsx",
  joinInviteMessaging: "frontend/src/lib/joinInviteMessaging.ts",
  marketplace: "frontend/src/pages/MarketplacePage.tsx",
  shopAssets: "frontend/src/pages/ShopAssetsPage.tsx",
  communityShopControl: "frontend/src/components/CommunityShopControlPanel.tsx",
  shopControl: "frontend/src/pages/ShopControlPage.tsx",
  shopAccess: "frontend/src/pages/ShopAccessPage.tsx",
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
  trustSlipReader: "frontend/src/components/TrustSlipReaderBlock.tsx",
  evidencePanel: "frontend/src/components/EvidencePackPanel.tsx",
  pilotChecklist: "docs/PILOT_EVIDENCE_PACK_CHECKLIST.md",
  phoneProofChecklist: "docs/GSN_RGU_PHONE_PROOF_PATH_CHECKLIST.md",
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
      message: "Required evidence-surface file is missing.",
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
  /Security marks: GSN watermark \| UTC time \| reference \| limitation \| verify current record before relying\./,
  "Institutional PDF header must stamp security marks for screenshots and printed copies."
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
  /GSN-PACK-TRUSTSLIP-[\s\S]*?"Private member reference", "redacted for TrustSlip evidence paper"/,
  "TrustSlip PDF fallback references and holder rows must avoid old TP references and raw internal member ids."
);
assertContains(
  "trustSlipPdf",
  /Generated at \(UTC\)/,
  "TrustSlip PDF must show when it was generated."
);
assertContains(
  "trustSlipPdf",
  /not a bank guarantee, credit approval, payment instruction, or automatic debit authority/,
  "TrustSlip PDF must keep the reader-facing limitation language."
);
assertContains(
  "trustSlipPdf",
  /draw_institutional_header[\s\S]*?draw_institutional_footer/,
  "TrustSlip PDF must draw the shared official header, watermark, and footer on every page."
);
assertContains(
  "trustSlipEvidenceRoute",
  /filename="gsn-trustslip-evidence\.pdf"/,
  "TrustSlip evidence PDF route must use a GSN-branded download filename."
);
assertNotContains(
  "trustSlipEvidenceRoute",
  /trust_slip_evidence\.pdf/,
  "TrustSlip evidence PDF route must not keep the old generic download filename."
);
assertContains(
  "trustSlipPdf",
  /Trust-limit signal[\s\S]*?Available support capacity[\s\S]*?Support pressure reading[\s\S]*?Estimated support gap/,
  "TrustSlip PDF must use institution-grade trust-limit and support-capacity language."
);
assertContains(
  "trustSlipPdf",
  /confirmation_source = "GSN recorded trust event"[\s\S]*?Confirmation source/,
  "TrustSlip PDF must show a reader-safe confirmation source instead of a raw internal actor record."
);
assertContains(
  "trustSlipPdf",
  /Reconciliation reference[\s\S]*?private operational detail redacted/,
  "TrustSlip PDF must redact private repayment reconciliation references."
);
assertNotContains(
  "trustSlipPdf",
  /TrustSlip Limit|Available Guarantee Capacity|Overexposure ratio|Estimated Guarantee Gap|Confirmed By \(Actor ID\)|Confirmed by record|confirmed_by = event\.actor_user_id|Payment reference|payment_reference|TP-UNKNOWN|"User ID", summary\.get\("user_id"\)/g,
  "TrustSlip PDF must not expose older limit/guarantee/internal actor wording, old TP fallbacks, raw member ids, or repayment references."
);
assertContains(
  "trustTimelinePdf",
  /Trust-limit signal[\s\S]*?Available support capacity[\s\S]*?Current locked support[\s\S]*?Support capacity ratio/,
  "Trust Timeline PDF must use institution-grade trust-limit and support-capacity language."
);
assertContains(
  "trustTimelinePdf",
  /Reader boundary: redacted personal trust history for controlled review\./,
  "Trust Timeline PDF must explain the redacted reader boundary."
);
assertContains(
  "trustTimelinePdf",
  /private event details redacted for timeline PDF/,
  "Trust Timeline PDF must hide private TrustEvent metadata in event notes."
);
assertContains(
  "trustTimelinePdf",
  /def _timeline_contact_boundary[\s\S]*?redacted for timeline PDF[\s\S]*?Private contact[\s\S]*?Contact: \{_timeline_contact_boundary\(\)\}/,
  "Trust Timeline PDF must redact holder and sponsor contact details instead of rendering masked private emails."
);
assertContains(
  "trustTimelinePdf",
  /def _audience_label[\s\S]*?admin redacted review[\s\S]*?controlled reader review[\s\S]*?Audience: \{_audience_label\(audience\)\}/,
  "Trust Timeline PDF must translate audience values into reader-safe review labels."
);
assertContains(
  "trustTimelinePdf",
  /redact: bool = True/,
  "Trust Timeline PDF must default to redacted output."
);
assertContains(
  "trustTimelinePdf",
  /pack_meta: Optional\[Dict\[str, Any\]\] = None/,
  "Trust Timeline PDF builder must stay compatible with evidence-pack metadata callers."
);
assertNotContains(
  "trustTimelinePdf",
  /Trust Limit|Locked Guarantees|Available Capacity|Capacity Ratio|payment_reference|User Email|Email: \{_mask_email|def _mask_email|Audience: \{_safe_str\(audience, 'user'\)\}/,
  "Trust Timeline PDF must not expose older limit/guarantee/capacity wording, payment references, private contact labels, or raw audience values."
);
assertContains(
  "trustTimelineRoute",
  /is_platform_admin[\s\S]*?pdf_audience = "admin" if audience == "admin" and is_platform_admin else "user"[\s\S]*?redact=True[\s\S]*?gsn-trust-timeline-u\{user_id\}-\{visibility_level\}\.pdf[\s\S]*?X-GSN-Merchant-Visibility-Level/,
  "Trust Timeline PDF route must protect the admin audience label, force redacted output, and use GSN download contracts."
);
assertNotContains(
  "trustTimelineRoute",
  /gmfn_trust_timeline|X-GMFN-Merchant-Visibility-Level|X-GMFN-TrustSlip-Code|X-GMFN-CCI-Score/g,
  "Trust Timeline PDF route must not keep old GMFN download names or headers."
);
assertContains(
  "portableEvidencePack",
  /from app\.services\.trust_timeline_service import list_trust_timeline[\s\S]*?def _load_recent_events[\s\S]*?return list_trust_timeline\([\s\S]*?audience="user"/,
  "GSN Evidence Pack ZIP recent events must reuse the user-safe Trust Timeline serializer."
);
assertContains(
  "portableEvidencePack",
  /PACK_ID_PATTERN[\s\S]*?GSN-PACK-\(MINIMAL\|STANDARD\|DETAILED\)[\s\S]*?def _safe_requested_pack_id[\s\S]*?"holder": \{[\s\S]*?"gsn_id": getattr\(current_user, "gmfn_id", None\)[\s\S]*?"private_contact_details": "redacted for portable evidence pack"[\s\S]*?"merchant_view": merchant_view[\s\S]*?"private_summary_boundary"/,
  "GSN Evidence Pack ZIP manifest, snapshot, and reference format must stay visibility-bound and redact private holder contact details."
);
assertNotContains(
  "portableEvidencePack",
  /"actor_user_id": getattr\(e, "actor_user_id"|\"subject_user_id\": getattr\(e, "subject_user_id"|\"meta\": meta_val|\"payment_reference\"|"full_summary": summary|"user": \{|"email": getattr\(current_user, "email", None\)|"phone_e164": getattr\(current_user, "phone_e164", None\)|GSN-PACK-U/,
  "GSN Evidence Pack ZIP snapshots must not rebuild raw TrustEvent IDs, metadata, payment references, full TrustSlip summaries, private contact details, or raw-user-id pack references."
);
assertContains(
  "evidencePackRoute",
  /pack_id: Optional\[str\] = None[\s\S]*?level=visibility_level[\s\S]*?pack_id=pack_id/,
  "GSN Evidence Pack ZIP downloads must preserve the displayed evidence reference when the frontend sends it back."
);
assertContains(
  "trustWhyRoute",
  /return f"GSN-WHY-\{day\}-\{digest\}"/,
  "Trust Why evidence references must use an opaque GSN-WHY reference instead of raw-user-id metadata."
);
assertNotContains(
  "trustWhyRoute",
  /TP-U/,
  "Trust Why evidence references must not include old raw-user-id TP-U references."
);
assertContains(
  "evidencePackTrustWhyRoute",
  /return f"GSN-WHY-\{day\}-\{digest\}"[\s\S]*?why_share\.pop\("user_id", None\)[\s\S]*?"holder": \{[\s\S]*?"private_member_reference": "redacted for user evidence pack"/,
  "User Trust Why evidence JSON must use opaque references and redact the raw member reference."
);
assertNotContains(
  "evidencePackTrustWhyRoute",
  /TP-U|"user_id": uid/,
  "User Trust Why evidence JSON must not include old TP-U references or raw account ids."
);
assertContains(
  "adminEvidenceTrustWhyRoute",
  /return f"GSN-WHY-\{day\}-\{digest\}"/,
  "Admin Trust Why evidence JSON must also use opaque GSN-WHY references."
);
assertNotContains(
  "adminEvidenceTrustWhyRoute",
  /TP-U/,
  "Admin Trust Why evidence JSON must not include old TP-U reference strings."
);
assertContains(
  "evidenceVerifyRoute",
  /GSN-EVID-[\s\S]*?"holder": \{[\s\S]*?"private_member_reference": "redacted for evidence verification"/,
  "Evidence verification must use opaque GSN references and redact the signed-in holder reference."
);
assertNotContains(
  "evidenceVerifyRoute",
  /return f"TP-|tp:\{user_id\}|"user_id": uid/,
  "Evidence verification must not expose old TP references or raw signed-in account ids."
);
assertContains(
  "shipmentRoute",
  /GSN evidence reference for this delivery\/support record/,
  "Shipment logging schema must describe the pack id as a GSN evidence reference."
);
assertNotContains(
  "shipmentRoute",
  /Evidence Pack ID \(TP-\.\.\.\)/,
  "Shipment logging schema must not expose old TP reference wording."
);
assertContains(
  "trustEvidencePack",
  /def _safe_event_export\(row: TrustEvent\)[\s\S]*?Private delivery\/support record[\s\S]*?Private operational details redacted for evidence pack[\s\S]*?return \[_safe_event_export\(r\) for r in rows\][\s\S]*?return _safe_event_export\(row\)/,
  "Trust Evidence Pack ZIP shipment, courier, and delivery JSON files must use a redacted event serializer."
);
assertContains(
  "trustEvidencePack",
  /GSN-PACK-TRUST-[\s\S]*?"holder": \{[\s\S]*?"private_member_reference": "redacted for trust evidence pack"/,
  "Legacy Trust Evidence Pack ZIP builder must use opaque GSN references and redact holder references if it is re-mounted later."
);
assertNotContains(
  "trustEvidencePack",
  /"actor_user_id": r\.actor_user_id|"subject_user_id": r\.subject_user_id|"actor_user_id": row\.actor_user_id|"subject_user_id": row\.subject_user_id|"meta": _safe_json|"payment_reference"|return f"TP-|"user_id": int\(user_id\)/,
  "Trust Evidence Pack ZIP auxiliary event files must not expose raw event IDs, metadata, payment references, old TP references, or raw holder ids."
);
assertContains(
  "trustScoreService",
  /def humane_trust_level\(score: Decimal\)[\s\S]*?return "Starting"[\s\S]*?return "Growing"[\s\S]*?return "Strong"[\s\S]*?return "Established"[\s\S]*?return "Pillar"/,
  "Evidence-facing trust level labels must stay plain institutional text."
);
assertNotContains(
  "trustScoreService",
  /🌱|🌿|🌳|🛡|🏛|ð|â|ï/,
  "Evidence-facing trust level labels must not use emoji or mojibake."
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
  /Community Exposure Summary[\s\S]*?Total Available Support Capacity[\s\S]*?Available support capacity = current remaining support capacity after existing exposure\.[\s\S]*?GSN community exposure report - controlled community trust record\./,
  "Community exposure reports must use current GSN community-facing support-capacity summary and footer wording."
);
assertContains(
  "reports",
  /meta redacted for share copy[\s\S]*?Reader Boundary[\s\S]*?Redacted support evidence for allowed GSN reviewers[\s\S]*?Use complete-record exports only for authorized admin review\.[\s\S]*?Reader Boundary[\s\S]*?Private community exposure evidence for allowed GSN reviewers/,
  "Report PDFs must include redacted reader boundaries, plain complete-record guidance, and hidden trust-event metadata in share copies."
);
assertNotContains(
  "reports",
  /GSN Clan Exposure Report|Clan Exposure Table|Clan Exposure Summary|Clan Exposure Ratio|Total Available Capacity|Available = current remaining support capacity|p\("Clan"|clan exposure report|Use redact=false only for admin complete-record review\.|def _mask_email|Guarantee Gap|p\("Borrower"|Borrower Trust Snapshot/,
  "Community and loan report PDFs must not expose older clan wording, maker query-param guidance, masked-email helpers, guarantee labels, or borrower labels."
);
assertContains(
  "reports",
  /private member reference redacted[\s\S]*?p\("Requester"[\s\S]*?p\("Support Gap"[\s\S]*?Requester Trust Snapshot/,
  "Loan trust report redacted PDFs must use private member references, requester language, and support-gap wording."
);
assertContains(
  "loanEvidencePack",
  /kv\("Community", clan_name or "-"\)/,
  "Loan evidence pack PDFs must label the route context as Community, not Clan."
);
assertContains(
  "evidencePack",
  /def _member_contact_boundary[\s\S]*?private member contact redacted[\s\S]*?def _mask_code[\s\S]*?redact: bool = True[\s\S]*?invite_code = _mask_code/,
  "Community evidence pack share PDFs must mask invite codes and redact member contacts by default."
);
assertContains(
  "evidencePack",
  /Reader boundary[\s\S]*?controlled community review[\s\S]*?redacted share copy for outside review/,
  "Community evidence pack PDFs must explain the reader boundary and share-copy privacy limit."
);
assertNotContains(
  "evidencePack",
  /def _mask_email|r\['invited_by_user_id'\]|r\.get\('joined_user_id'\)|r\.get\('invited_by_user_id'\)/,
  "Community evidence pack PDFs must not print internal member ids or masked private emails in share papers."
);
assertContains(
  "loanEvidencePack",
  /def _private_member_boundary[\s\S]*?private member reference redacted[\s\S]*?redact: bool = True[\s\S]*?def member_reference[\s\S]*?meta: redacted for share copy[\s\S]*?Reader boundary[\s\S]*?private loan, supporter, and repayment details/,
  "Loan evidence pack PDFs must redact participant references and trust-event metadata in share copies and explain the reader boundary."
);
assertNotContains(
  "loanEvidencePack",
  /def _mask_email|show_email|r\['email'\] or r\['user_id'\]|payer=\{payer_email or payer_id\}|actor=\{actor_email or actor_id\}|subject=\{subject_email or subject_id\}/,
  "Loan evidence pack PDFs must not fall back to raw participant emails or internal user ids in share papers."
);
assertContains(
  "userEvidencePack",
  /redacted for member evidence paper[\s\S]*?redact: bool = True[\s\S]*?Private member reference[\s\S]*?Private contact[\s\S]*?Reader boundary[\s\S]*?private member evidence/,
  "User evidence pack PDFs must default to share-safe redaction and explain the reader boundary before private member evidence is shared."
);
assertContains(
  "userEvidencePack",
  /support record=private operational detail redacted[\s\S]*?source=GSN member record/,
  "User evidence pack PDFs must describe private support/source context without raw support IDs."
);
assertNotContains(
  "userEvidencePack",
  /loan=\{loan_id\}|src=\{src\}|extra\.append\(f"loan=|User ID: \{user_id\}|Email: \{email or '-'\}|reference=f"User \{user_id\}"|def _mask_email/,
  "User evidence pack PDFs must not print raw support IDs, raw source metadata, internal user ids, or private email rows."
);
assertContains(
  "trustSlipPdf",
  /support_record = "Private support record"[\s\S]*?_paragraph\("Support record", support_record, styles\)[\s\S]*?Reconciliation reference[\s\S]*?private operational detail redacted/,
  "TrustSlip evidence PDFs must describe private support records without exposing support IDs."
);
assertNotContains(
  "trustSlipPdf",
  /Support record ID|loan_id = event\.loan_id/,
  "TrustSlip evidence PDFs must not expose raw support IDs."
);
assertNotContains(
  "loanEvidencePack",
  /kv\("Clan"/,
  "Loan evidence pack PDFs must not expose older Clan labels."
);
for (const key of ["evidencePack", "loanEvidencePack", "userEvidencePack"]) {
  assertNotContains(
    key,
    /visa \/ partner framing|Visa\/partner framing/g,
    "Simple evidence PDFs must not use vague partner-framing language in customer-facing papers."
  );
  assertContains(
    key,
    /bank guarantee, credit approval, payment instruction, or automatic debit authority/,
    "Simple evidence PDFs must keep the limitation that evidence papers are not financial approvals or payment instructions."
  );
}
assertContains(
  "reportsRoute",
  /membership_status[\s\S]*?left_at/,
  "Governance members CSV must distinguish active and left memberships."
);
assertContains(
  "reportsRoute",
  /"artifact": "gsn_community_governance_pack"[\s\S]*?"privacy": "complete_admin_record"[\s\S]*?manifest\.json/,
  "Governance ZIP manifest must mark the package as a private complete admin record."
);
assertContains(
  "reportsRoute",
  /GSN Community Governance Pack[\s\S]*?Community ID:[\s\S]*?Community Name:[\s\S]*?Audience: community admin or platform admin only[\s\S]*?Privacy: complete private admin record[\s\S]*?Do not share outside authorized GSN\/community governance review\./,
  "Governance ZIP README must mark the package as a private complete admin record."
);
assertContains(
  "reportsRoute",
  /gsn-community-\{clan_id\}-governance-pack-\{ts\}\.zip/,
  "Governance ZIP README, manifest, members CSV, and filename must mark the package as a private complete admin record."
);
assertContains(
  "reportsRoute",
  /ClanMembership\.left_at\.is_\(None\)[\s\S]*?is_platform_admin[\s\S]*?def _ensure_can_view_complete_loan_report/,
  "Report routes must ignore inactive memberships, allow platform admins, default PDFs to redacted, gate complete exports, and use GSN filenames."
);
assertContains(
  "reportsRoute",
  /download_loan_trust_report_csv[\s\S]*?_ensure_can_view_complete_loan_report\(db, current_user=current_user, loan=loan\)[\s\S]*?gsn-loan-\{loan\.id\}-trust-report\.csv/,
  "Loan trust report CSV must be a complete admin record behind the complete-record gate."
);
assertContains(
  "reportsRoute",
  /download_loan_trust_report_pdf[\s\S]*?redact: bool = True[\s\S]*?if not redact:[\s\S]*?_ensure_can_view_complete_loan_report\(db, current_user=current_user, loan=loan\)[\s\S]*?redact=redact[\s\S]*?gsn-loan-\{loan\.id\}-trust-report\.pdf/,
  "Loan trust report PDF must default to redacted and require complete-record access for redact=false."
);
assertContains(
  "reportsRoute",
  /download_loan_evidence_pack_zip[\s\S]*?_ensure_can_view_complete_loan_report\(db, current_user=current_user, loan=loan\)[\s\S]*?redact=False[\s\S]*?"artifact": "gsn_loan_evidence_pack"[\s\S]*?gsn-loan-\{loan\.id\}-evidence-pack-\{ts\}\.zip/,
  "Loan evidence ZIP must be a complete admin record behind the complete-record gate."
);
assertNotContains(
  "reportsRoute",
  /GMFN Clan Governance Pack|Clan ID:|Clan Name:|gmfn-clan-\{clan_id\}-governance-pack|gmfn-loan-\{loan\.id\}-trust-report\.(?:csv|pdf)|gmfn-loan-\{loan\.id\}-evidence-pack-\{ts\}\.zip|"artifact": "gmfn_loan_evidence_pack"|clan-\{clan_id\}-exposure\.(?:csv|pdf)/,
  "Governance ZIP artifacts must not expose older GMFN/clan wording."
);
assertContains(
  "reportsRoute",
  /GSN Loan Evidence Pack[\s\S]*?Community ID: \{loan\.clan_id\}[\s\S]*?Audience: community admin or platform admin only[\s\S]*?Privacy: complete private admin record[\s\S]*?Use the redacted loan trust report PDF for borrower-facing or outside review\./,
  "Loan evidence ZIP README must mark the ZIP as a private complete admin record and point outside review to the redacted PDF."
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
assertContains(
  "analyticsRoute",
  /def _ensure_clan_admin_or_platform_admin[\s\S]*?Community admin or platform admin only[\s\S]*?def _ensure_can_view_loan_evidence[\s\S]*?Loan not found/,
  "Analytics evidence PDF routes must enforce community-admin and loan-viewer permissions before building PDFs."
);
assertContains(
  "analyticsRoute",
  /clan_invite_analytics[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=user, clan_id=int\(clan_id\)\)[\s\S]*?clan_recent_invite_joins[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=user, clan_id=int\(clan_id\)\)[\s\S]*?clan_trust_events[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=user, clan_id=int\(clan_id\)\)[\s\S]*?export_recent_invite_joins_csv[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=user, clan_id=int\(clan_id\)\)[\s\S]*?export_trust_events_csv[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=user, clan_id=int\(clan_id\)\)[\s\S]*?evidence_pack_pdf[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=user, clan_id=int\(clan_id\)\)/,
  "All clan analytics JSON, CSV, and PDF handlers must enforce community-admin/platform-admin access."
);
assertContains(
  "analyticsRoute",
  /def evidence_pack_pdf\([\s\S]*?redact: bool = True[\s\S]*?build_clan_evidence_pack_pdf\(db, clan_id=clan_id, redact=True\)[\s\S]*?def loan_evidence_pack_pdf\([\s\S]*?redact: bool = True[\s\S]*?if not redact:[\s\S]*?_ensure_can_view_complete_loan_evidence\(db, current_user=user, loan=loan\)[\s\S]*?build_loan_evidence_pack_pdf\(db, loan_id=loan_id, redact=True\)/,
  "Analytics evidence PDF routes must build redacted share-copy PDFs even when complete-record routes exist elsewhere."
);
assertContains(
  "analyticsRoute",
  /def _ensure_can_view_complete_loan_evidence\(db: Session, \*, current_user: User, loan: Loan\) -> None:[\s\S]*?_ensure_clan_admin_or_platform_admin\(db, current_user=current_user, clan_id=int\(loan\.clan_id\)\)/,
  "Analytics complete loan evidence downloads must require community-admin or platform-admin access."
);
assertContains(
  "shareRoute",
  /def _ensure_can_view_loan[\s\S]*?ClanMembership\.left_at\.is_\(None\)/,
  "Dormant loan audit share links must ignore inactive memberships if the route is re-enabled."
);
assertContains(
  "shareRoute",
  /def _can_view_complete_loan_record[\s\S]*?role[\s\S]*?admin[\s\S]*?ClanMembership\.left_at\.is_\(None\)/,
  "Dormant loan audit share links must reserve complete-record access for platform or active community admins."
);
assertContains(
  "shareRoute",
  /csv_url = f"\{base\}\/reports\/loans\/\{loan_id\}\/trust-report\.csv" if can_view_complete else None[\s\S]*?complete_record_available": bool\(can_view_complete\)/,
  "Dormant loan audit share links must expose complete CSV links only for complete-record viewers."
);
assertContains(
  "shareRoute",
  /copy_lines = \[[\s\S]*?GSN Support Evidence[\s\S]*?Redacted PDF:[\s\S]*?if csv_url:[\s\S]*?Complete CSV \(admin only\)/,
  "Dormant loan audit share copy must use support wording, lead with the redacted PDF, and reserve CSV wording for admin-only complete records."
);
assertNotContains(
  "shareRoute",
  /GSN Loan Evidence/,
  "Dormant loan audit share copy must not use old loan wording in the visible share heading."
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
  /import GSNBrandMark[\s\S]*?TrustPaperAuthorityStrip[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperWatermark/,
  "Public TrustSlip paper must use the official GSN brand mark, authority strip, security note, and watermark."
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
  /TrustPaperAuthorityStrip[\s\S]*?GSN TrustSlip Verification Paper[\s\S]*?TrustPaperSecurityNote/,
  "Public TrustSlip paper must carry shared GSN authority and screenshot security marks."
);
assertNotContains(
  "publicPaper",
  /Current when viewed|Current when copied/g,
  "Public TrustSlip paper must not pass placeholder generated labels into institutional authority marks."
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
  /GSN Trust Evidence[\s\S]*?public evidence first, private details protected, decision left with the reader/,
  "Public TrustSlip paper footer must keep the reader-decision limitation."
);
assertNotContains(
  "publicPaper",
  /GSN Trust Architecture|private detail protected/,
  "Public TrustSlip paper footer must not expose architecture wording or older privacy phrasing."
);
assertContains(
  "trustSlipRoute",
  /GSN Trust Evidence - public evidence first, private details protected, decision left with the reader\./,
  "Backend TrustSlip verification paper must keep evidence-facing footer wording."
);
assertNotContains(
  "trustSlipRoute",
  /GSN Trust Architecture|private detail protected|private detail stays/,
  "Backend TrustSlip verification paper must not expose architecture wording or older privacy phrasing."
);
assertContains(
  "publicPaper",
  /Trust-limit signal/,
  "Public TrustSlip paper must use the institution-grade trust-limit label."
);
assertNotContains(
  "publicPaper",
  /Trust limit signal|Trust Limit Signal/,
  "Public TrustSlip paper must not regress to the older trust limit label."
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
  "privateEvidence",
  /Trust-limit signal/,
  "Private TrustSlip evidence must use the institution-grade trust-limit label."
);
assertNotContains(
  "privateEvidence",
  /Trust limit signal|Trust Limit Signal/,
  "Private TrustSlip evidence must not regress to the older trust limit label."
);
assertContains(
  "trustSlipRoute",
  /Trust-limit signal/,
  "Backend TrustSlip public/share surfaces must use the institution-grade trust-limit label."
);
assertNotContains(
  "trustSlipRoute",
  /Trust limit signal|Trust Limit Signal|Limit signal:/,
  "Backend TrustSlip public/share surfaces must not regress to older trust limit labels."
);
assertContains(
  "phoneProofChecklist",
  /Trust-limit signal/,
  "Phone proof checklist must use the institution-grade TrustSlip label."
);
assertNotContains(
  "phoneProofChecklist",
  /Trust limit|Trust Limit/,
  "Phone proof checklist must not describe the public TrustSlip label as a plain trust limit."
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
  /Official GSN headed paper[\s\S]*?Generated \(UTC\):[\s\S]*?Security marks: GSN brand mark, watermark, UTC time, reference, privacy note, and limitation note must travel with screenshots or printed copies\.[\s\S]*?Global Support Network \(GSN\)/,
  "Shared copied snapshot papers must keep GSN headed-paper authority, generated time, security marks, and footer."
);
assertContains(
  "snapshotPaper",
  /Footer: Global Support Network \(GSN\)\. Trust infrastructure for organized communities\./,
  "Shared copied snapshot paper footer must position GSN as trust infrastructure, not only a marketplace."
);
assertContains(
  "snapshotPaper",
  /buildGsnCommunityVerifyLinkPackage[\s\S]*?GSN Community Verification Link[\s\S]*?buildGsnInviteLinkPackage[\s\S]*?GSN Community Invite[\s\S]*?buildGsnPublicShopLinkPackage[\s\S]*?GSN Public Shop Invitation/,
  "Shared evidence package helper must cover community verification, community invites, and public shop invitations."
);
assertContains(
  "snapshotPaper",
  /Limitation: opens a public GSN community record only\. Not a bank guarantee, credit approval, protected-domain approval, or evidence that every claim is true\./,
  "Community verification copied packages must describe the link as opening a public record, not as protected-domain approval."
);
assertNotContains(
  "snapshotPaper",
  /verifies a public GSN community record/i,
  "Community verification copied packages must not claim the package itself verifies a public community record."
);
assertContains(
  "snapshotPaper",
  /buildGsnVaultInvitePackage[\s\S]*?GSN Private Vault Invitation/,
  "Shared evidence package helper must cover private Vault invitation packages."
);
assertContains(
  "snapshotPaper",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Payment Instruction[\s\S]*?Not a receipt or bank guarantee until reconciliation confirms funds/,
  "Shared evidence package helper must cover payment, payout, and receipt-like instruction packages."
);
assertContains(
  "snapshotPaper",
  /buildGsnSupportEvidencePackage[\s\S]*?GSN Support Evidence Snapshot[\s\S]*?Not a guarantee, lending approval, receipt, or payout/,
  "Shared evidence package helper must cover loan, guarantor, and support evidence snapshots."
);
assertNotContains(
  "snapshotPaper",
  /A branded|Use this branded|viewer should|careful reader/g,
  "Shared evidence package text must speak to the receiver, not describe builder-side branding."
);
assertContains(
  "snapshotPaperCard",
  /import GSNBrandMark[\s\S]*?TrustPaperAuthorityStrip[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperWatermark[\s\S]*?TrustPaperSecurityFooter/,
  "Shared visual snapshot paper card must use the GSN mark, authority strip, screenshot security note, watermark, and institutional footer."
);
assertContains(
  "snapshotPaperCard",
  /footer: "Global Support Network \(GSN\)\. Trust infrastructure for organized communities\."/,
  "Shared visual snapshot paper card fallback footer must position GSN as trust infrastructure, not only a marketplace."
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
  "trustPaperMarks",
  /function isGeneratedPlaceholder[\s\S]*?current when viewed[\s\S]*?current when copied[\s\S]*?function utcGeneratedText[\s\S]*?const generatedAtText = React\.useMemo[\s\S]*?Generated: \{generatedAtText\} \| Reference:/,
  "Shared GSN authority strip must turn placeholder generated labels into a stable UTC generated mark."
);
assertContains(
  "trustPaperMarks",
  /Generated: \{generatedAtText\} \| Reference:/,
  "Shared GSN authority strip must use an ASCII separator between generated time and reference."
);
assertNotContains(
  "trustPaperMarks",
  /Generated:[\s\S]{0,120}·[\s\S]{0,120}Reference:/g,
  "Shared GSN authority strip must not use a middle-dot separator that can render badly in copied or screenshot papers."
);
assertContains(
  "snapshotPaperCard",
  /function isGeneratedPlaceholder[\s\S]*?current when viewed[\s\S]*?current when copied[\s\S]*?function currentUtcGeneratedText[\s\S]*?const generatedAtText = useMemo[\s\S]*?generatedAt=\{generatedAtText\}[\s\S]*?>\{generatedAtText\}<\/div>/,
  "Shared visual snapshot paper card must display a real UTC generated mark instead of a current-view placeholder."
);
assertNotContains(
  "snapshotPaperCard",
  /Current when copied/g,
  "Shared visual snapshot paper card must not display the old current-when-copied generated placeholder."
);
assertContains(
  "trustSnapshots",
  /import \{ buildGsnSnapshotPaper \} from "\.\/gsnSnapshotPaper";[\s\S]*?GSN Identity & Integrity Snapshot[\s\S]*?GSN Cross-Community Consistency Snapshot[\s\S]*?GSN TrustSlip Snapshot[\s\S]*?GSN TrustSlip Verification Snapshot[\s\S]*?buildTrustPassportSnapshot[\s\S]*?return buildGsnSnapshotPaper\(\{[\s\S]*?GSN Trust Passport Snapshot/,
  "Trust document copy snapshots must use GSN headed-paper helpers and keep Trust Passport official."
);
assertNotContains(
  "trustSnapshots",
  /buildTrustPassportSnapshot[\s\S]*?return \[/g,
  "Trust Passport copied snapshot must not hand-build a separate headed-paper string."
);
assertNotContains(
  "trustSnapshots",
  /A branded|Use this branded|careful reader|Short shareable/g,
  "Trust document snapshots must use direct receiver-facing language, not builder-side package language."
);
assertContains(
  "trustSnapshots",
  /function friendlyTrustBand[\s\S]*?Early, limited record[\s\S]*?use caution; ask for current evidence[\s\S]*?function friendlyScore[\s\S]*?signal only; not a character label/,
  "Trust document snapshots must explain trust bands in concise humane growth language instead of sending bare A/B/C/D/E codes."
);
assertContains(
  "trustSnapshots",
  /function friendlyConsistency[\s\S]*?Ask for current evidence\./,
  "Trust document consistency snapshots must ask for current evidence, not broad confirmation."
);
assertNotContains(
  "trustSnapshots",
  /Ask for current confirmation/,
  "Trust document snapshots must not imply current confirmation alone is enough."
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
  "communityVerify",
  /TrustPaperAuthorityStrip[\s\S]*?GSN Community Verification Paper[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperSecurityFooter/,
  "Public Community Verification paper must carry shared GSN authority, screenshot security, and footer marks."
);
assertNotContains(
  "communityVerify",
  /Current when viewed|Current when copied/g,
  "Public Community Verification paper must not pass placeholder generated labels into institutional authority marks."
);
assertContains(
  "communityMemberVerify",
  /TrustPaperAuthorityStrip[\s\S]*?GSN Community Member Credential[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperSecurityFooter/,
  "Public Community Member Credential paper must carry shared GSN authority, screenshot security, and footer marks."
);
assertNotContains(
  "communityMemberVerify",
  /Current when viewed|Current when copied/g,
  "Public Community Member Credential paper must not pass placeholder generated labels into institutional authority marks."
);
assertContains(
  "communityConfirmationOutcome",
  /TrustPaperAuthorityStrip[\s\S]*?GSN Community Confirmation Outcome[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperSecurityFooter/,
  "Public Community Confirmation Outcome paper must carry shared GSN authority, screenshot security, and footer marks."
);
assertNotContains(
  "communityConfirmationOutcome",
  /Current when viewed|Current when copied/g,
  "Public Community Confirmation Outcome paper must not pass placeholder generated labels into institutional authority marks."
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
  /JOIN_INVITE_EVIDENCE_LINES = \[[\s\S]*?Build a trusted identity that follows you wherever life takes you\.[\s\S]*?Find work, customers, and opportunities with greater confidence\.[\s\S]*?Buy and sell online knowing more about who you are dealing with\.[\s\S]*?Verify people, businesses, and communities before making decisions\.[\s\S]*?Keep community records clear and reduce misunderstandings and disputes\.[\s\S]*?Organise savings groups, support circles, and community activities with greater accountability\.[\s\S]*?Receive community-backed support when it matters most\.[\s\S]*?Share your Trust Passport or TrustSlip as checkable credibility evidence when trust is needed\.[\s\S]*?export function buildJoinInviteLetter[\s\S]*?You're invited to \$\{inviteTarget\} on GSN\.[\s\S]*?GSN is a trust platform that helps people turn trust and integrity into real-life opportunities\.[\s\S]*?With GSN, you can:[\s\S]*?lines\.push\(\.\.\.JOIN_INVITE_EVIDENCE_LINES\)[\s\S]*?Community: \$\{marketplaceName\}[\s\S]*?Open the GSN link above to view the invitation and request access\.[\s\S]*?Community membership is reviewed before approval\.[\s\S]*?export function buildJoinInviteDoorwayMessage[\s\S]*?inviteLink \|\| null[\s\S]*?Hello \$\{receiver\}[\s\S]*?\.\.\.JOIN_INVITE_EVIDENCE_LINES[\s\S]*?Community: \$\{marketplaceName\}[\s\S]*?After it opens, request access from the invitation page\.[\s\S]*?Community membership is reviewed before approval\./,
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
  "shopAccess",
  /import \{[\s\S]*?TrustPaperAuthorityStrip[\s\S]*?TrustPaperSecurityFooter[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperWatermark[\s\S]*?\} from "\.\.\/components\/TrustPaperMarks";/,
  "Private Vault access visitor page must import shared GSN paper authority marks."
);
assertContains(
  "shopAccess",
  /TrustPaperWatermark[\s\S]*?TrustPaperAuthorityStrip[\s\S]*?title="GSN Private Vault Access Paper"[\s\S]*?classification="Restricted access evidence"[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperSecurityFooter text="Global Support Network \(GSN\) private access record"/,
  "Private Vault access visitor page must carry GSN authority, watermark, screenshot security note, and institutional footer."
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
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Support Repayment Instruction[\s\S]*?safeCopy\(text\)/,
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
  /buildGsnSupportEvidencePackage[\s\S]*?GSN Support Audit Link[\s\S]*?loanSummaryPaper[\s\S]*?GSN Support Summary Snapshot[\s\S]*?GsnSnapshotPaperCard/,
  "Loan Summary copied summary, visual preview, and audit link must use branded GSN support evidence packages."
);
assertContains(
  "guarantorInbox",
  /queuePaper[\s\S]*?GSN Support Queue Snapshot[\s\S]*?safeCopy\(queuePaper\)[\s\S]*?GsnSnapshotPaperCard/,
  "Incoming Requests queue summary must use a branded GSN support evidence package for both visible paper preview and copy."
);
assertContains(
  "guarantorEarnings",
  /earningsPaper[\s\S]*?GSN Supporter Value Snapshot[\s\S]*?safeCopy\(earningsPaper\)[\s\S]*?GsnSnapshotPaperCard/,
  "Supporter Value summary must use a branded GSN support evidence package for both visible paper preview and copy."
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
  "trustSlip",
  /Trust-limit signal/,
  "TrustSlip page must use the institution-grade trust-limit label."
);
assertNotContains(
  "trustSlip",
  /Trust limit signal|Trust Limit Signal/,
  "TrustSlip page must not regress to the older trust limit label."
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
  "Trust Passport must keep the evidence-paper security footer on institutional sections."
);
assertContains(
  "trustPassport",
  /Trust-limit signal/,
  "Trust Passport must use the institution-grade trust-limit label."
);
assertNotContains(
  "trustPassport",
  /Trust limit signal|Trust Limit Signal/,
  "Trust Passport must not regress to the older trust limit label."
);
assertContains(
  "trustSlipReader",
  /Trust-limit signal/,
  "TrustSlip reader block must use the institution-grade trust-limit label."
);
assertNotContains(
  "trustSlipReader",
  /Trust limit signal|Trust Limit Signal/,
  "TrustSlip reader block must not regress to the older trust limit label."
);
assertContains(
  "trustSnapshots",
  /Trust-limit signal/,
  "Copied TrustSlip snapshots must use the institution-grade trust-limit label."
);
assertNotContains(
  "trustSnapshots",
  /Trust limit signal|Trust Limit Signal/,
  "Copied TrustSlip snapshots must not regress to the older trust limit label."
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
  "UX checklist must keep evidence-paper authority requirements."
);

assertOrdered(
  "package",
  [
    '"audit:trust-actions"',
    '"audit:evidence-surfaces": "node tools/audit-institutional-evidence-surfaces.mjs"',
    '"audit:proof-surfaces": "node tools/audit-institutional-proof-surfaces.mjs"',
  ],
  "Evidence surface audit must expose the preferred evidence command while preserving the legacy command."
);

if (findings.length > 0) {
  console.error("Institutional evidence surface audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Institutional evidence surface audit passed.");
