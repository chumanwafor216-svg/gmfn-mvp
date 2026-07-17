/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");
const findings = [];

const files = {
  package: "frontend/package.json",
  indexCss: "frontend/src/index.css",
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
  legacyVerifyUi: "gmfn_backend/app/api/routes/trust_slips_verify_ui.py",
  trustTimelinePdf: "gmfn_backend/app/services/trust_timeline_pdf_service.py",
  trustTimelineRoute: "gmfn_backend/app/api/routes/trust_timeline_pdf.py",
  trustSlipRoute: "gmfn_backend/app/api/routes/trust_slips.py",
  trustScoreService: "gmfn_backend/app/services/trust_score_service.py",
  reports: "gmfn_backend/app/services/reports_service.py",
  reportsRoute: "gmfn_backend/app/api/routes/reports.py",
  analyticsRoute: "gmfn_backend/app/api/routes/analytics.py",
  shareRoute: "gmfn_backend/app/api/routes/share.py",
  clansRoute: "gmfn_backend/app/api/routes/clans.py",
  communityConfirmationService:
    "gmfn_backend/app/services/community_confirmation_service.py",
  trustSlipService: "gmfn_backend/app/services/trust_slips_services.py",
  trustSlipVerify: "frontend/src/pages/TrustSlipVerifyPage.tsx",
  publicPaper: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  trustPaperMarks: "frontend/src/components/TrustPaperMarks.tsx",
  trustDocumentLanguage: "frontend/src/components/TrustDocumentLanguage.tsx",
  gsnRealisticIcon: "frontend/src/components/GsnRealisticIcon.tsx",
  privateEvidence: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  boundary: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx",
  resultCard: "frontend/src/pages/trustSlipVerify/TrustSlipVerifyResultCard.tsx",
  snapshotPaper: "frontend/src/lib/gsnSnapshotPaper.ts",
  snapshotPaperCard: "frontend/src/components/GsnSnapshotPaperCard.tsx",
  trustSnapshots: "frontend/src/lib/trustDocumentSnapshots.ts",
  communityVerify: "frontend/src/pages/CommunityVerifyPage.tsx",
  communityMemberVerify: "frontend/src/pages/CommunityMemberVerifyPage.tsx",
  communityConfirmationOutcome: "frontend/src/pages/CommunityConfirmationOutcomePage.tsx",
  merchantRelease: "frontend/src/pages/MerchantReleasePage.tsx",
  firstCircle: "frontend/src/pages/BuildFirstCirclePage.tsx",
  clansPage: "frontend/src/pages/ClansPage.tsx",
  joinEntry: "frontend/src/pages/JoinEntryPage.tsx",
  joinInviteMessaging: "frontend/src/lib/joinInviteMessaging.ts",
  marketplace: "frontend/src/pages/MarketplacePage.tsx",
  demandBox: "frontend/src/pages/DemandBoxPage.tsx",
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
  paymentRails: "frontend/src/pages/PaymentRailsPage.tsx",
  subscriptionSpotlight: "frontend/src/pages/SubscriptionSpotlightPage.tsx",
  loanReadiness: "frontend/src/pages/LoanReadinessPage.tsx",
  loanSuggestions: "frontend/src/pages/LoanSuggestionsPage.tsx",
  loanWorkbench: "frontend/src/pages/LoanWorkbenchPage.tsx",
  loanSummary: "frontend/src/pages/LoanSummaryPage.tsx",
  guarantorInbox: "frontend/src/pages/GuarantorInboxPage.tsx",
  guarantorEarnings: "frontend/src/pages/GuarantorEarningsPage.tsx",
  trustSlip: "frontend/src/pages/TrustSlipPage.tsx",
  trustPassport: "frontend/src/pages/TrustScorePage.tsx",
  trustSlipReader: "frontend/src/components/TrustSlipReaderBlock.tsx",
  communityConfirmationPolicy:
    "frontend/src/pages/CommunityConfirmationPolicyPage.tsx",
  communityConfirmationInbox:
    "frontend/src/pages/CommunityConfirmationInboxPage.tsx",
  trustTimeline: "frontend/src/pages/TrustTimelinePage.tsx",
  adminIncompleteLoans: "frontend/src/pages/AdminIncompleteLoansPage.tsx",
  adminTrustEvents: "frontend/src/pages/AdminTrustEventsPage.tsx",
  bankConsole: "frontend/src/pages/BankConsolePage.tsx",
  revenueAllocation: "frontend/src/pages/RevenueAllocationPage.tsx",
  evidencePanel: "frontend/src/components/EvidencePackPanel.tsx",
  rguCustomerDiscovery: "docs/GSN_RGU_Customer_Discovery_Working_Plan.md",
  trustSlipShipReadiness:
    "docs/GSN_TRUSTSLIP_SHIP_READINESS_MANIFEST_2026-05-15.md",
  trustSlipScreenGap:
    "docs/GSN_TRUSTSLIP_SCREEN_GAP_AUDIT_2026-05-15.md",
  verifiedCommunityDomainSpec:
    "docs/GSN_VERIFIED_COMMUNITY_DOMAIN_SPEC_2026-06-18.md",
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

assertContains(
  "trustDocumentLanguage",
  /data-gsn-trust-document-collapsible="true"[\s\S]*export function TrustDocumentDisclosureSection[\s\S]*data-gsn-trust-document-section-disclosure="true"[\s\S]*More security details[\s\S]*More limits[\s\S]*More confirmed details/,
  "Shared Trust Document panels must keep long supporting proof details and deeper record sections collapsible instead of exposing every line on public records."
);

assertContains(
  "trustPaperMarks",
  /export function TrustPaperWatermarkField[\s\S]*Array\.from\(\{ length: 30 \}[\s\S]*fieldOpacity = Math\.max\(opacity, 0\.068\)[\s\S]*data-gsn-trust-paper-watermark-field="true"[\s\S]*gridAutoRows: "minmax\(118px, 1fr\)"[\s\S]*GSNBrandMark[\s\S]*GSN/,
  "Shared Trust Paper marks must provide a stronger recurring GSN watermark field for long public records, not only a single top or bottom mark."
);

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
  /def wrap_pdf_text_lines\([\s\S]*?_split_oversized_pdf_word[\s\S]*?stringWidth[\s\S]*?def draw_institutional_footer\([\s\S]*?wrap_pdf_text_lines\(text, font_name, font_size, max_width\)\[:2\][\s\S]*?for line in lines:/,
  "Institutional PDF helper must wrap long limitation text instead of drawing one clipped line."
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
  "evidencePack",
  /community_reference = getattr\(clan, "community_code", None\)[\s\S]*?Community ID: \{community_reference\}[\s\S]*?Community entry summary[\s\S]*?Evidence activity summary/,
  "Community evidence PDF must show the public GSN community reference instead of the raw database community id."
);
assertNotContains(
  "evidencePack",
  /Community ID: \{clan_id\}|TrustEvent summary counts/g,
  "Community evidence PDF must not label the raw database clan id as the public Community ID or expose machine event headings."
);
assertContains(
  "loanEvidencePack",
  /support_reference = f"GSN-SUPPORT-\{int\(loan_id\):06d\}"[\s\S]*?title="GSN Support Evidence Pack"[\s\S]*?reference=support_reference/,
  "Loan evidence PDF must title and reference the paper as a support evidence pack."
);
assertContains(
  "loanEvidencePack",
  /kv\("Support record", support_reference\)[\s\S]*?kv\("Community ID", community_reference\)[\s\S]*?Trust snapshot[\s\S]*?Support summary[\s\S]*?Evidence timeline for this support record/,
  "Loan evidence PDF must use user-facing support-record sections and the public community reference."
);
assertContains(
  "loanEvidencePack",
  /private support, supporter, and repayment details/,
  "Loan evidence PDF reader boundary must use support language instead of loan language."
);
assertNotContains(
  "loanEvidencePack",
  /title="GSN Loan Evidence Pack"|GSN loan evidence paper|kv\("Loan ID", str\(loan_id\)\)|Loan summary|Trust Snapshot \(Explainable\)|Trust timeline \(events linked to this loan\)|private loan, supporter/g,
  "Loan evidence PDF must not expose the raw loan id as the primary user-facing paper label or use machine-style section headings."
);

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
assertNotContains(
  "trustSlipPdf",
  /Confidential \/ Evidence Record/,
  "TrustSlip PDF fallback footer must not regress to generic confidential wording."
);
assertContains(
  "trustSlipPdf",
  /draw_institutional_header[\s\S]*?draw_institutional_footer/,
  "TrustSlip PDF must draw the shared official header, watermark, and footer on every page."
);
assertContains(
  "trustSlipPdf",
  /from reportlab\.lib\.units import inch, mm[\s\S]*?topMargin=80 \* mm/,
  "TrustSlip PDF body content must start below the institutional header and security strip."
);
assertContains(
  "trustSlipPdf",
  /KeepTogether[\s\S]*?Public TrustSlip verification QR[\s\S]*?Scan to open this public TrustSlip verification page\.[\s\S]*?_qr_block/,
  "TrustSlip PDF QR heading and QR image must stay together instead of orphaning the heading at the bottom of a page."
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
  /"actor_user_id": getattr\(e, "actor_user_id"|"subject_user_id": getattr\(e, "subject_user_id"|"meta": meta_val|"payment_reference"|"full_summary": summary|"user": \{|"email": getattr\(current_user, "email", None\)|"phone_e164": getattr\(current_user, "phone_e164", None\)|GSN-PACK-U/,
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
  /def _private_member_boundary[\s\S]*?private member reference redacted[\s\S]*?redact: bool = True[\s\S]*?def member_reference[\s\S]*?meta: redacted for share copy[\s\S]*?Reader boundary[\s\S]*?private support, supporter, and repayment details/,
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
  /GSN Support Evidence Pack[\s\S]*?Support record: \{support_reference\}[\s\S]*?Community ID: \{community_reference\}[\s\S]*?Audience: community admin or platform admin only[\s\S]*?Privacy: complete private admin record[\s\S]*?Use the redacted support trust report PDF for borrower-facing or outside review\./,
  "Support evidence ZIP README must mark the ZIP as a private complete admin record and point outside review to the redacted PDF."
);
assertNotContains(
  "reportsRoute",
  /GMFN Loan Evidence Pack|GSN Loan Evidence Pack|Loan ID: \{loan\.id\}|Clan ID: \{loan\.clan_id\}/,
  "Support evidence ZIP README must not expose older GMFN/loan/clan wording."
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
  "trustSlipRoute",
  /safe_code_path = quote\(str\(code\), safe=""\)[\s\S]*?print_link = f"\/trust-slips\/verify\/\{safe_code_path\}\/print\?level=\{visibility_level\}"[\s\S]*?qr_img = f"\/trust-slips\/verify\/\{safe_code_path\}\/qr\.png\?level=\{visibility_level\}"[\s\S]*?<title>GSN TrustSlip Verification Paper<\/title>/,
  "Backend-rendered public TrustSlip paper must use a GSN title and quoted TrustSlip code paths for print and QR links."
);
assertContains(
  "trustSlipRoute",
  /"A": "Strong evidence"[\s\S]*?"B": "Generally steady evidence"/,
  "Backend-rendered public TrustSlip paper must use evidence-band labels, not blanket trust labels."
);
assertNotContains(
  "trustSlipRoute",
  /<title>TrustSlip Verification<\/title>|"A": "Strongly trusted"|"B": "Generally trusted"/,
  "Backend-rendered public TrustSlip paper must not keep the old generic browser title or blanket trust band labels."
);
assertContains(
  "legacyVerifyUi",
  /from html import escape[\s\S]*?def html_text[\s\S]*?escape\(text or fallback, quote=True\)[\s\S]*?<title>GSN Merchant Verification Record<\/title>[\s\S]*?release authority[\s\S]*?Record found[\s\S]*?TrustSlip limit signal[\s\S]*?GSN does not guarantee delivery, receipt, repayment, or release of goods, credit, or money/,
  "Legacy merchant verification UI must be HTML-escaped and bounded as a GSN evidence record if it is ever re-enabled."
);
assertNotContains(
  "legacyVerifyUi",
  /<div class="pill">Verified<\/div>|<title>GSN Verification<\/title>|Borrower ID|does not guarantee delivery performance/g,
  "Legacy merchant verification UI must not present a blanket verified stamp, borrower framing, or weak delivery-only limitation."
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
  /GSN Trust Evidence[\s\S]*?public evidence first, private details protected, you decide with the record in front of you/,
  "Public TrustSlip paper footer must keep the direct user decision limitation."
);
assertNotContains(
  "publicPaper",
  /GSN Trust Architecture|private detail protected/,
  "Public TrustSlip paper footer must not expose architecture wording or older privacy phrasing."
);
assertContains(
  "trustSlipRoute",
  /GSN Trust Evidence - public evidence first, private details protected, you decide with the record in front of you\./,
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
  "publicPaper",
  /TrustDocumentConfidenceRibbon[\s\S]*?trustSlipConfidenceRibbonItems[\s\S]*?TrustSlip status[\s\S]*?Record integrity[\s\S]*?Evidence chain[\s\S]*?Verification path[\s\S]*?Valid until/,
  "Public TrustSlip paper must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "trustSlipVerify",
  /isAppRoute \? \([\s\S]*?<PageTopNav[\s\S]*?\) : noPublicCodeSupplied \? \([\s\S]*?TrustSlip Verify[\s\S]*?\) : null\}[\s\S]*?\{noPublicCodeSupplied \? null : \([\s\S]*?<TrustSlipVerifyPublicPaper/,
  "Public TrustSlip links with a code must open directly into the paper instead of showing a duplicate intro hero above it."
);
assertContains(
  "publicPaper",
  /data-gsn-trust-document-certificate="trustslip-verify"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This paper confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This paper does not confirm"[\s\S]*?TrustDocumentFingerprint[\s\S]*?TrustSlip record reference/,
  "Public TrustSlip paper must implement the Trust Document Language certificate sequence with security, boundary, and record reference panels."
);
assertContains(
  "publicPaper",
  /TrustDocumentDisclosureSection[\s\S]*?title="TrustSlip security and limits"[\s\S]*?Open for what this paper confirms, limits, security, and record reference\.[\s\S]*?data-gsn-trustslip-verify-security-limits="true"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?TrustDocumentFingerprint/,
  "Public TrustSlip paper must keep security, limits, and record-reference detail collapsed behind one disclosure."
);
assertContains(
  "publicPaper",
  /Record reference[\s\S]*?This reference is made from the visible TrustSlip fields\. Use it to match this paper with its GSN record; it is not legal proof or payment approval\.[\s\S]*?Record reference for this visible public TrustSlip paper\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Public TrustSlip paper record-reference copy must stay plain and keep legal/payment boundaries."
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
  /Generated \(UTC\): \$\{generatedAt\}[\s\S]*?Security note: Keep the GSN mark, generated time, record code, privacy note, and limitation note with any copy\./,
  "Shared copied snapshot papers must keep generated time and compact security note."
);
assertContains(
  "snapshotPaper",
  /Limitation: GSN evidence only\. Not approval, guarantee, payment instruction, or auto-debit\./,
  "Shared copied snapshot papers must keep the compact limitation."
);
assertContains(
  "snapshotPaper",
  /GLOBAL SUPPORT NETWORK \(GSN\)[\s\S]*?Title: \$\{safeText\(params\.title\) \|\| "GSN Snapshot"\}/,
  "Shared copied snapshot paper must keep the GSN masthead and title before evidence details."
);
assertContains(
  "snapshotPaper",
  /buildGsnCompactPublicLinkPackage[\s\S]*?buildGsnCommunityVerifyLinkMessage[\s\S]*?GSN Community Record[\s\S]*?buildGsnInviteLinkMessage[\s\S]*?GSN Community Invite[\s\S]*?buildGsnPublicShopLinkMessage[\s\S]*?GSN Public Shop/,
  "Shared snapshot helpers must keep formal paper packages and compact public forwarding messages separate."
);
assertContains(
  "snapshotPaper",
  /buildGsnCommunityVerifyLinkPackage[\s\S]*?GSN Community Verification Link[\s\S]*?buildGsnInviteLinkPackage[\s\S]*?GSN Community Invite[\s\S]*?buildGsnPublicShopLinkPackage[\s\S]*?GSN Public Shop Invitation/,
  "Shared snapshot helpers must keep formal public-link paper packages available for evidence previews."
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
  /buildGsnVaultInviteMessage[\s\S]*?GSN Private Vault Link[\s\S]*?buildGsnVaultInvitePackage[\s\S]*?GSN Private Vault Invitation/,
  "Shared snapshot helpers must cover formal and compact private Vault invitation messages."
);
assertContains(
  "snapshotPaper",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Payment Instruction[\s\S]*?Not a receipt or bank guarantee until reconciliation confirms funds/,
  "Shared evidence package helper must cover payment, payout, and receipt-like instruction packages."
);
assertContains(
  "snapshotPaper",
  /buildGsnSupportEvidencePackage[\s\S]*?GSN Support Evidence Snapshot[\s\S]*?Not a guarantee, lending approval, receipt, or payout[\s\S]*?buildGsnSupportEvidenceShareText[\s\S]*?Evidence only\. Open GSN to check the current support record before you act\./,
  "Shared evidence helpers must cover formal loan/support evidence papers and compact support share text."
);
assertNotContains(
  "snapshotPaper",
  /A branded|Use this branded|viewer should|careful reader/g,
  "Shared evidence package text must speak to the receiver, not describe builder-side branding."
);
assertContains(
  "snapshotPaperCard",
  /import GSNBrandMark[\s\S]*?TrustPaperAuthorityStrip[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperWatermark[\s\S]*?TrustPaperWatermarkField[\s\S]*?TrustPaperSecurityFooter/,
  "Shared visual snapshot paper card must use the GSN mark, authority strip, screenshot security note, recurring watermark field, and institutional footer."
);
assertContains(
  "snapshotPaperCard",
  /<TrustPaperWatermark[\s\S]*?opacity=\{0\.08\}[\s\S]*?<TrustPaperWatermarkField[\s\S]*?names=\{\["shield", "document", "qr", "globe"\]\}[\s\S]*?opacity=\{0\.044\}/,
  "Shared visual snapshot paper card must carry a stronger main watermark and a recurring GSN watermark field through the body."
);
assertContains(
  "snapshotPaperCard",
  /more detail\{hiddenCount === 1 \? "" : "s"\} kept in[\s\S]*?the full GSN record/,
  "Shared visual snapshot paper card must not claim hidden details are included in copied paper when copy actions may use compact share text."
);
assertContains(
  "snapshotPaperCard",
  /footer: "Global Support Network \(GSN\)\. Trust infrastructure for organized communities\."/,
  "Shared visual snapshot paper card fallback footer must position GSN as trust infrastructure, not only a marketplace."
);
assertContains(
  "snapshotPaperCard",
  /Title:[\s\S]*?Prepared for you \(UTC\):[\s\S]*?Record code:[\s\S]*?Open this record:[\s\S]*?Privacy:[\s\S]*?Limitation:/,
  "Shared visual snapshot paper card must parse public-record title, prepared time, record code, link, privacy, and limitation fields."
);
assertContains(
  "snapshotPaperCard",
  /Public record context[\s\S]*?What you need to know[\s\S]*?What you need to know/,
  "Shared visual snapshot paper card must render public context and direct reader details as official paper sections."
);
assertContains(
  "trustPaperMarks",
  /function isGeneratedPlaceholder[\s\S]*?current when viewed[\s\S]*?current when copied[\s\S]*?function utcGeneratedText[\s\S]*?const generatedAtText = React\.useMemo[\s\S]*?Prepared: \{generatedAtText\} \| Record:/,
  "Shared GSN authority strip must turn placeholder generated labels into a stable UTC prepared mark."
);
assertContains(
  "trustPaperMarks",
  /Prepared: \{generatedAtText\} \| Record:/,
  "Shared GSN authority strip must use an ASCII separator between prepared time and record code."
);
assertNotContains(
  "trustPaperMarks",
  /Prepared:[\s\S]{0,120}·[\s\S]{0,120}Record:/g,
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
  /import \{ buildGsnSnapshotPaper \} from "\.\/gsnSnapshotPaper";[\s\S]*?GSN Identity & Integrity Snapshot[\s\S]*?Not legal identity proof, government ID, professional licence, bank approval, or a guarantee of future behaviour[\s\S]*?GSN Cross-Community Consistency Snapshot[\s\S]*?Not a character label, credit approval, bank guarantee, payment instruction, or automatic debit[\s\S]*?GSN TrustSlip Snapshot[\s\S]*?GSN TrustSlip Verification Snapshot[\s\S]*?buildTrustPassportSnapshot[\s\S]*?return buildGsnSnapshotPaper\(\{[\s\S]*?GSN Trust Passport Snapshot/,
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
  /function friendlyTrustBand[\s\S]*?Early, limited record[\s\S]*?use caution; ask for current evidence[\s\S]*?function friendlyScore[\s\S]*?No public human score is shown/,
  "Trust document snapshots must explain trust bands in concise humane growth language and suppress public numeric human scores."
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
  /buildGsnCommunityVerifyLinkMessage[\s\S]*?communityVerifyLinkMessage[\s\S]*?communityName[\s\S]*?communityId: communityAnchor[\s\S]*?verifyLink: publicLink[\s\S]*?copyLink[\s\S]*?safeCopy\(communityVerifyLinkMessage\)[\s\S]*?GSN community verification link copied\./,
  "Public Community Verification Copy link must copy compact GSN verification link text, not a bare URL or full paper."
);
assertContains(
  "communityVerify",
  /TrustPaperAuthorityStrip[\s\S]*?GSN Community Verification Paper[\s\S]*?TrustPaperSecurityNote[\s\S]*?TrustPaperSecurityFooter/,
  "Public Community Verification paper must carry shared GSN authority, screenshot security, and footer marks."
);
assertContains(
  "trustDocumentLanguage",
  /TrustDocumentRegistryMasthead[\s\S]*?className="gsn-trust-document-masthead"[\s\S]*?data-gsn-trust-document-masthead="true"[\s\S]*?\{eyebrow\}[\s\S]*?\{title\}[\s\S]*?\{subtitle\}[\s\S]*?TrustDocumentConfidenceRibbon[\s\S]*?data-gsn-confidence-ribbon="true"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?data-gsn-security-panel="true"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?data-gsn-confirmation-boundary=\{tone\}[\s\S]*?TrustDocumentFingerprint[\s\S]*?data-gsn-record-fingerprint="true"/,
  "Shared Trust Document Language primitives must include a responsive masthead with visible eyebrow, record title, subtitle, confidence ribbon, security panel, confirmation boundary, and record reference components."
);
assertContains(
  "gsnRealisticIcon",
  /loading\?: "eager" \| "lazy"[\s\S]*?loading = "lazy"[\s\S]*?loading=\{loading\}/,
  "GSN realistic icons must stay lazy by default while allowing critical official marks to opt into eager loading."
);
assertContains(
  "trustDocumentLanguage",
  /<GsnRealisticIcon[\s\S]*?name="trust-shield"[\s\S]*?size=\{36\}[\s\S]*?loading="eager"[\s\S]*?decorative[\s\S]*?\/>/,
  "Trust Document registry masthead shield must eager-load so official record headers do not screenshot with a blank trust mark."
);
assertContains(
  "indexCss",
  /\.gsn-trust-document-masthead[\s\S]*?grid-template-columns: minmax\(0, 1fr\) minmax\(240px, auto\)[\s\S]*?@media \(max-width: 640px\)[\s\S]*?\.gsn-trust-document-masthead[\s\S]*?grid-template-columns: minmax\(0, 1fr\)[\s\S]*?\.gsn-trust-document-masthead-record[\s\S]*?justify-self: stretch/,
  "Shared Trust Document Language masthead must stack the record-title block on phone widths instead of overlapping brand and record text."
);
assertContains(
  "communityVerify",
  /TrustDocumentRegistryMasthead[\s\S]*?Public verification[\s\S]*?Community Verification[\s\S]*?Official GSN Registry Record[\s\S]*?TrustDocumentConfidenceRibbon[\s\S]*?confidenceRibbonItems[\s\S]*?data-gsn-trust-document-certificate="community-verification"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?This page confirms[\s\S]*?This page does not confirm[\s\S]*?TrustDocumentFingerprint[\s\S]*?Record reference/,
  "Community Verification must implement the GSN Trust Document Language sequence: registry masthead, confidence ribbon, security panel, confirms/does-not-confirm boundary, and record reference."
);
assertNotContains(
  "communityVerify",
  /Public verification navigation|community-verify\.home|community-verify\.back/,
  "Community Verification public links must open directly into the official registry paper, not a duplicate pre-paper navigation strip."
);
assertContains(
  "communityVerify",
  /TrustDocumentDisclosureSection[\s\S]*?title="Community record security and limits"[\s\S]*?Open for what this page confirms, limits, security, and record reference\.[\s\S]*?data-gsn-community-verify-security-limits="true"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?TrustDocumentFingerprint/,
  "Community Verification must keep security, limits, and record-reference detail collapsed behind one disclosure."
);
assertContains(
  "communityVerify",
  /Record reference[\s\S]*?This reference is made from the visible public record fields\. Use it to match this page with its GSN record; it is not legal ID or payment approval\.[\s\S]*?Record reference for this visible public record\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Community Verification record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "merchantRelease",
  /TrustDocumentConfidenceRibbon[\s\S]*?merchantConfidenceRibbonItems[\s\S]*?Merchant rail status[\s\S]*?Record integrity[\s\S]*?Evidence chain[\s\S]*?Verification path[\s\S]*?Link expiry/,
  "Merchant Release must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "merchantRelease",
  /data-gsn-trust-document-certificate="merchant-release"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This page confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This page does not confirm"[\s\S]*?TrustDocumentFingerprint[\s\S]*?Merchant release record reference/,
  "Merchant Release must implement the Trust Document Language certificate sequence with security, confirms/does-not-confirm panels, and record reference."
);
assertContains(
  "merchantRelease",
  /TrustDocumentDisclosureSection[\s\S]*?title="Merchant record security and limits"[\s\S]*?Open for what this page confirms, limits, security, and record reference\.[\s\S]*?data-gsn-merchant-release-security-limits="true"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?TrustDocumentFingerprint/,
  "Merchant Release must keep security, limits, and record-reference detail collapsed behind one disclosure."
);
assertContains(
  "merchantRelease",
  /Record reference[\s\S]*?This reference is made from the visible merchant record fields\. Use it to match this page with its GSN record; it is not legal proof or payment approval\.[\s\S]*?Record reference for this visible merchant release paper\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Merchant Release record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "merchantRelease",
  /Release authority boundary[\s\S]*?not escrow, payout approval, bank confirmation, courier control, or automatic release authority/,
  "Merchant Release security panel must keep the release-authority boundary visible."
);
assertContains(
  "trustPassport",
  /TrustDocumentConfidenceRibbon[\s\S]*?trustPassportConfidenceRibbonItems[\s\S]*?Passport status[\s\S]*?Identity standing[\s\S]*?Evidence chain[\s\S]*?Community history[\s\S]*?Verification path/,
  "Trust Passport must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "trustPassport",
  /data-gsn-trust-document-certificate="trust-passport"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="Trust Passport security"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This passport confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This passport does not confirm"[\s\S]*?TrustDocumentFingerprint[\s\S]*?Trust Passport record reference/,
  "Trust Passport must implement the Trust Document Language sequence with security, confirms/does-not-confirm panels, and record reference."
);
assertContains(
  "trustPassport",
  /Record reference[\s\S]*?This reference is made from the visible Trust Passport fields\. Use it to match this paper with its GSN record; it is not legal proof or payment approval\.[\s\S]*?Record reference for this visible private Trust Passport\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Trust Passport record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "trustPassport",
  /Public boundary[\s\S]*?Public readers should receive a scoped TrustSlip or community record, not this full private passport/,
  "Trust Passport must keep the private-passport/public-TrustSlip boundary visible."
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
assertContains(
  "communityMemberVerify",
  /TrustDocumentConfidenceRibbon[\s\S]*?memberCredentialConfidenceRibbonItems[\s\S]*?Member status[\s\S]*?Community record[\s\S]*?Witness evidence[\s\S]*?Evidence currentness[\s\S]*?Verification path/,
  "Public Community Member Credential must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "communityMemberVerify",
  /data-gsn-trust-document-certificate="community-member-credential"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This credential confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This credential does not confirm"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="Member credential security"[\s\S]*?TrustDocumentFingerprint[\s\S]*?Community member credential reference/,
  "Public Community Member Credential must implement the Trust Document Language sequence with security, confirms/does-not-confirm panels, and record reference."
);
assertContains(
  "communityMemberVerify",
  /data-gsn-trust-document-certificate="community-member-credential"[\s\S]*?gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 320px\), 1fr\)\)"[\s\S]*?gridTemplateColumns:[\s\S]*?"repeat\(auto-fit, minmax\(min\(100%, 240px\), 1fr\)\)"/,
  "Public Community Member Credential panels must collapse on phone before boundaries and record-reference cards squeeze or overlap."
);
assertContains(
  "communityMemberVerify",
  /TrustDocumentDisclosureSection[\s\S]*title="Full public reading"[\s\S]*Open for currentness, evidence, and decision guidance\./,
  "Public Community Member Credential must keep deeper public-reading guidance collapsed behind a clear institutional disclosure."
);
assertContains(
  "communityMemberVerify",
  /data-gsn-member-credential-primary-facts="true"[\s\S]*?Member GSN ID[\s\S]*?Community ID[\s\S]*?Status[\s\S]*?Witness strength[\s\S]*?TrustDocumentDisclosureSection[\s\S]*?title="All credential facts"[\s\S]*?data-gsn-member-credential-secondary-facts="true"[\s\S]*?Next witness status[\s\S]*?TrustDocumentDisclosureSection[\s\S]*?title="Evidence notes and privacy"/,
  "Public Community Member Credential must expose only the core facts first and collapse secondary facts plus evidence/privacy notes."
);
assertNotContains(
  "communityMemberVerify",
  /minmax\(0, 1fr\) minmax\(240px, 0\.74fr\)/,
  "Public Community Member Credential must not restore the old phone-squeezing two-column certificate layout."
);
assertContains(
  "communityMemberVerify",
  /TrustPaperWatermarkField[\s\S]*names=\{\["shield", "id", "qr", "document"\]\}/,
  "Public Community Member Credential must carry a recurring GSN watermark field through the long public paper body."
);
assertContains(
  "communityVerify",
  /TrustPaperWatermarkField[\s\S]*names=\{\["shield", "home", "qr", "document"\]\}[\s\S]*data-gsn-trust-document-certificate="community-verification"[\s\S]*gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)"/,
  "Public Community Verification must carry a recurring watermark field and phone-safe public-paper proof grid."
);
assertContains(
  "communityConfirmationOutcome",
  /TrustPaperWatermarkField[\s\S]*names=\{\["shield", "community", "document", "qr"\]\}[\s\S]*data-gsn-trust-document-certificate="community-confirmation-outcome"[\s\S]*gridTemplateColumns:[\s\S]*"repeat\(auto-fit, minmax\(min\(100%, 320px\), 1fr\)\)"/,
  "Public Community Confirmation Outcome must carry a recurring watermark field and phone-safe public-paper proof grid."
);
assertContains(
  "merchantRelease",
  /TrustPaperWatermarkField[\s\S]*names=\{\["shield", "shop", "document", "qr"\]\}[\s\S]*data-gsn-trust-document-certificate="merchant-release"[\s\S]*gridTemplateColumns: "repeat\(auto-fit, minmax\(min\(100%, 260px\), 1fr\)\)"/,
  "Merchant Release Evidence must carry a recurring watermark field and phone-safe public-paper proof grid."
);
assertContains(
  "publicPaper",
  /TrustPaperWatermarkField[\s\S]*names=\{\["shield", "globe", "qr", "document"\]\}/,
  "TrustSlip Verify public paper must carry a recurring GSN watermark field through the long public paper body."
);
assertNotContains(
  "communityConfirmationOutcome",
  /minmax\(0, 1fr\) minmax\(250px, 0\.78fr\)/,
  "Public Community Confirmation Outcome must not restore the forced two-column proof layout on public records."
);
assertNotContains(
  "communityVerify",
  /repeat\(auto-fit, minmax\(260px, 1fr\)\)/,
  "Public Community Verification must not use a proof grid that can squeeze phone text into narrow columns."
);
assertNotContains(
  "merchantRelease",
  /repeat\(auto-fit, minmax\(260px, 1fr\)\)/,
  "Merchant Release Evidence must not use a proof grid that can squeeze phone text into narrow columns."
);
assertContains(
  "communityMemberVerify",
  /Record reference[\s\S]*?Record reference made from the visible credential fields\. It is not legal identity proof\.[\s\S]*?Record reference for this visible public member credential\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Public Community Member Credential record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "communityMemberVerify",
  /memberCredentialDoesNotConfirmList[\s\S]*?Legal identity or government registration[\s\S]*?Full Trust Passport or private member history[\s\S]*?Payments, escrow, loans, credit approval, or delivery[\s\S]*?Membership in any other community/,
  "Public Community Member Credential must keep identity, privacy, finance, future-behaviour, and cross-community boundaries visible."
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
assertContains(
  "communityConfirmationOutcome",
  /TrustDocumentConfidenceRibbon[\s\S]*?outcomeConfidenceRibbonItems[\s\S]*?Outcome status[\s\S]*?Response window[\s\S]*?Response evidence[\s\S]*?Privacy boundary[\s\S]*?Verification path/,
  "Public Community Confirmation Outcome must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "communityConfirmationOutcome",
  /data-gsn-trust-document-certificate="community-confirmation-outcome"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This outcome confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This outcome does not confirm"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="Outcome security"[\s\S]*?TrustDocumentFingerprint[\s\S]*?Community confirmation outcome reference/,
  "Public Community Confirmation Outcome must implement the Trust Document Language sequence with security, confirms/does-not-confirm panels, and record reference."
);
assertContains(
  "communityConfirmationOutcome",
  /TrustDocumentDisclosureSection[\s\S]*?title="Outcome security and limits"[\s\S]*?Open for what this outcome confirms, limits, security, and record reference\.[\s\S]*?data-gsn-community-confirmation-outcome-security-limits="true"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?TrustDocumentFingerprint/,
  "Public Community Confirmation Outcome must keep security, limits, and record-reference detail collapsed behind one disclosure."
);
assertContains(
  "communityConfirmationOutcome",
  /Record reference[\s\S]*?Record reference made from the visible outcome fields\. It is not legal proof or payment approval\.[\s\S]*?Record reference for this visible public confirmation outcome\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Public Community Confirmation Outcome record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "communityConfirmationOutcome",
  /outcomeDoesNotConfirmList[\s\S]*?Whole-community vote or approval by every member[\s\S]*?Private responder names, contacts, notes, or private review details[\s\S]*?Payment received, bank guarantee, escrow, loan approval, or credit approval[\s\S]*?Permission to release goods, money, credit, or services/,
  "Public Community Confirmation Outcome must keep whole-community, privacy, finance, and release-authority boundaries visible."
);
assertNotContains(
  "communityConfirmationOutcome",
  /Current when viewed|Current when copied/g,
  "Public Community Confirmation Outcome paper must not pass placeholder generated labels into institutional authority marks."
);
assertContains(
  "firstCircle",
  /buildGsnInviteLinkMessage[\s\S]*?buildCompactInviteMessageForLink[\s\S]*?safeCopy\(buildCompactInviteMessageForLink\(trustedLink\)\)[\s\S]*?wa\.me\/\?text=\$\{encodeURIComponent\([\s\S]*?buildCompactInviteMessageForLink\(trustedLink\)/,
  "First Circle must keep formal invite previews while copied/forwarded invite text stays compact."
);
assertContains(
  "firstCircle",
  /buildGsnInviteLinkPackage[\s\S]*?joinInviteMessage[\s\S]*?inviteBundle[\s\S]*?GsnSnapshotPaperCard[\s\S]*?communityDomainCircleMode[\s\S]*?\? joinInviteMessage[\s\S]*?: readyContacts\.length > 0[\s\S]*?\? inviteBundle[\s\S]*?: joinInviteMessage[\s\S]*?paperText=\{inviteBundle \|\| joinInviteMessage\}/,
  "First Circle visible invite preview must keep the formal GSN invite paper."
);
assertContains(
  "firstCircle",
  /Relationship evidence[\s\S]*?Known from[\s\S]*?Known duration[\s\S]*?Choose duration[\s\S]*?Confidence/,
  "First Circle relationship evidence must label duration as duration, not as a person's role or profession."
);
assertNotContains(
  "firstCircle",
  /Known for[\s\S]*?Choose duration/g,
  "First Circle must not call the relationship-duration field 'Known for'."
);
assertContains(
  "clansPage",
  /buildGsnInviteLinkMessage[\s\S]*?compactShareText[\s\S]*?whatsappShareText: compactShareText/,
  "Legacy Clans must build a compact invite message for ordinary public sharing."
);
assertContains(
  "clansPage",
  /Share message[\s\S]*?\{inviteState\.whatsappShareText\}[\s\S]*?copyText\(inviteState\.whatsappShareText \|\| "", "share"\)[\s\S]*?Copy share message[\s\S]*?clans\.invite\.share-whatsapp/,
  "Legacy Clans must show, copy, and WhatsApp-share the compact invite message instead of the full formal invite paper."
);
assertNotContains(
  "clansPage",
  /GSN invite paper|Copy GSN invite paper|Copied paper/g,
  "Legacy Clans must not restore the long formal invite paper as the ordinary public invite copy."
);
assertContains(
  "joinInviteMessaging",
  /export function buildJoinInviteLetter[\s\S]*?const inviter = cleanText\(args\.inviter\)[\s\S]*?Invited by \$\{inviter\}\.[\s\S]*?export function buildJoinInviteDoorwayMessage[\s\S]*?const inviter = cleanText\(args\.inviter\)[\s\S]*?Invited by \$\{inviter\}\./,
  "Shared join invite messaging must keep the sender name in both the visible invitation paper and copied doorway message."
);
assertContains(
  "joinInviteMessaging",
  /JOIN_INVITE_LINK_HINT[\s\S]*?Tap the preview above to open the invitation[\s\S]*?export function buildJoinInviteDoorwayMessage[\s\S]*?inviteLink \? JOIN_INVITE_LINK_HINT : null/,
  "Shared join invite messaging must place a clear tap instruction beside the top GSN link preview in copied doorway messages."
);
assertContains(
  "marketplace",
  /import \{[\s\S]*?compactJoinInviteUrl[\s\S]*?personalizedJoinInviteUrl[\s\S]*?\} from "\.\.\/lib\/joinLinks";[\s\S]*?buildGsnInviteLinkMessage[\s\S]*?activeJoinCommunityCode[\s\S]*?communityCode\(selectedCommunity\)[\s\S]*?personalizedInviteLink[\s\S]*?personalizedJoinInviteUrl\(inviteLink[\s\S]*?recipientName: joinRecipientName[\s\S]*?communityCode: activeJoinCommunityCode[\s\S]*?marketplaceName: activeCommunityName[\s\S]*?message: joinInviteNote[\s\S]*?compactInviteLink[\s\S]*?compactJoinInviteUrl\(personalizedInviteLink\)[\s\S]*?buildGsnInviteLinkMessage\([\s\S]*?senderName: joinSenderDisplayName[\s\S]*?senderGsnId: currentGmfnId[\s\S]*?inviteLink: compactInviteLink[\s\S]*?copyMarketplaceLink\([\s\S]*?personalizedInviteLink[\s\S]*?"GSN join link copied\."[\s\S]*?wa\.me\/\?text=\$\{encodeURIComponent\(joinInviteDoorwayMessage\)\}/,
  "Marketplace join sharing must use compact GSN invite text while the actual Join URL preserves receiver/community code/community/marketplace context for the request form."
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
  /buildGsnCommunityVerifyLinkMessage[\s\S]*?marketplaceEmailMessage[\s\S]*?copyMarketplaceLink\([\s\S]*?marketplaceEmailMessage/,
  "Marketplace community verification link copy must use compact GSN verification link text."
);
assertContains(
  "marketplace",
  /buildGsnPublicShopLinkMessage[\s\S]*?function buildPublicShopLinkMessage[\s\S]*?Public shop package refreshed and copied/,
  "Marketplace public shop link copy/email must use compact GSN public shop link text."
);
assertContains(
  "demandBox",
  /buildDemandRequestPaper[\s\S]*?Reader boundary: confirm identity evidence, TrustSlip context, price, availability, and fit before acting\.[\s\S]*?Do not treat this request paper as release authority for goods, money, credit, or service\.[\s\S]*?buildGsnSnapshotPaper[\s\S]*?GSN Demand Request Paper[\s\S]*?not proof that the request was fulfilled/,
  "Demand Box request copies must use a branded GSN demand request paper with a release-authority boundary."
);
assertContains(
  "demandBox",
  /Public contact path: WhatsApp contact is available from this Demand Box request\.[\s\S]*?Contact path: WhatsApp/,
  "Demand Box public request contact language must describe the GSN contact path, not expose the raw WhatsApp number as the record."
);
assertNotContains(
  "demandBox",
  /Visible contact:\s*\$\{|Contact:\s*\{safeStr\(row\?\.whatsapp_number\)\}/g,
  "Demand Box public request papers and badges must not expose raw WhatsApp numbers as visible contact labels."
);
assertContains(
  "demandBox",
  /demand-box\.request\.\$\{row\?\.id \|\| index\}\.copy-paper[\s\S]*?demand-box\.request\.\$\{row\?\.id \|\| debugIndex\}\.copy-paper/,
  "Demand Box owned request cards must expose stable Copy paper actions."
);
assertContains(
  "demandBox",
  /demand-box\.visible-request\.\$\{row\?\.id \|\| index\}\.copy-paper[\s\S]*?demand-box\.visible-request\.\$\{row\?\.id \|\| debugIndex\}\.copy-paper/,
  "Demand Box community-visible request cards must expose stable Copy paper actions."
);
assertContains(
  "publicShop",
  /function copyShopLink[\s\S]*?safeCopy\([\s\S]*?buildPublicShopMessage\(absoluteShopShareLink\)[\s\S]*?GSN public shop invitation copied\./,
  "Public Shop direct Copy action must copy compact GSN public shop link text."
);
assertContains(
  "publicShop",
  /before owner contact is reliable/,
  "Public Shop owner-contact blocker must frame stale owner contact as unreliable, not trusted."
);
assertNotContains(
  "publicShop",
  /owner contact can be trusted/,
  "Public Shop must not say stale owner contact can become trusted just because the owner refreshes the link."
);
assertNotContains(
  "publicShop",
  /owner (?:phone|contact|call) number|owner number|visible owner number|WhatsApp says this number/gi,
  "Public Shop public notices must speak about GSN contact paths, not owner numbers as public identity."
);
assertContains(
  "shopAssets",
  /buildGsnPublicShopLinkMessage[\s\S]*?function buildPublicShopMessage[\s\S]*?Public shop package copied[\s\S]*?Public shop block package copied[\s\S]*?Public shop item package copied/,
  "Shop Assets public shop and item copy actions must use compact GSN public shop link text."
);
assertContains(
  "communityShopControl",
  /buildGsnPublicShopLinkMessage[\s\S]*?api\.safeCopy\([\s\S]*?Public shop package copied/,
  "Community Home shop-control public link copy must use compact GSN public shop link text."
);
assertContains(
  "shopControl",
  /buildGsnVaultInviteMessage[\s\S]*?function buildVaultViewingLinkPackage[\s\S]*?Vault viewing package/,
  "Shop Control private Vault viewing links must use compact GSN Vault link text."
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
  /buildGsnVaultInviteMessage[\s\S]*?function buildVaultInvitePackage[\s\S]*?safeCopy\(buildVaultInvitePackage\(url, link\)\)[\s\S]*?safeCopy\(buildVaultInvitePackage\(selectedBlockLinkUrl, selectedBlockPrimaryLink\)\)/,
  "Private Vault copied links must use compact GSN private Vault link text."
);
assertContains(
  "paymentInstructions",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Money In Payment Instruction[\s\S]*?copyText\(text\)/,
  "Money In copied full instructions must use the branded GSN payment instruction package."
);
assertContains(
  "paymentInstructions",
  /function handleCopyPayInDetails\(\)[\s\S]*?buildGsnPaymentInstructionPackage\([\s\S]*?GSN Money In Pay-In Details[\s\S]*?not a receipt[\s\S]*?GSN finance sees a bank match or completes proof review[\s\S]*?GSN pay-in instruction copied\./,
  "Money In pay-in details copy must use the branded GSN payment instruction package instead of raw account text."
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
  "paymentRails",
  /buildGsnPaymentInstructionPackage[\s\S]*?GSN Payment Rails Summary[\s\S]*?rail visibility intelligence only[\s\S]*?not payment approval[\s\S]*?settlement confirmation[\s\S]*?proof that money moved[\s\S]*?safeCopy\(railSummaryPaper\)[\s\S]*?debugId="payment-rails\.copy-paper"/,
  "Payment Rails copied summaries must use a branded GSN finance-rail paper with a no-payment-approval/no-settlement boundary."
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
  /buildGsnSupportEvidenceShareText[\s\S]*?GSN Support Audit Link[\s\S]*?buildGsnSupportEvidenceShareText[\s\S]*?GSN Support Summary Snapshot[\s\S]*?loanSummaryPaper[\s\S]*?buildGsnSupportEvidencePackage[\s\S]*?GsnSnapshotPaperCard/,
  "Loan Summary must keep compact copied support text while preserving the full branded visual support paper."
);
assertContains(
  "loanReadiness",
  /buildGsnSupportEvidenceShareText[\s\S]*?GSN Support Readiness Snapshot[\s\S]*?Readiness:[\s\S]*?Recommended next action:[\s\S]*?loan-readiness\.copy-paper/,
  "Loan Readiness copy must use compact support share text instead of a long pasted paper."
);
assertContains(
  "loanSuggestions",
  /buildGsnSupportEvidenceShareText[\s\S]*?GSN Supporter Fit Snapshot[\s\S]*?Fit reading:[\s\S]*?Suggested supporters visible:[\s\S]*?loan-suggestions\.copy-paper/,
  "Loan Suggestions copy must use compact support share text instead of a long pasted paper."
);
assertContains(
  "loanWorkbench",
  /workbenchShareText[\s\S]*?buildGsnSupportEvidenceShareText[\s\S]*?GSN Support Workbench Snapshot[\s\S]*?Work item:[\s\S]*?Supporters needed:[\s\S]*?loan-workbench\.copy-paper/,
  "Loan Workbench copy must use compact support share text instead of a long pasted paper."
);
assertContains(
  "guarantorInbox",
  /queuePaper[\s\S]*?GSN Support Queue Snapshot[\s\S]*?safeCopy\([\s\S]*?buildGsnSupportEvidenceShareText[\s\S]*?GsnSnapshotPaperCard[\s\S]*?paperText=\{queuePaper\}/,
  "Incoming Requests queue summary must keep the full visual support paper but copy compact support share text."
);
assertContains(
  "guarantorEarnings",
  /earningsPaper[\s\S]*?GSN Supporter Value Snapshot[\s\S]*?safeCopy\([\s\S]*?buildGsnSupportEvidenceShareText[\s\S]*?GsnSnapshotPaperCard[\s\S]*?paperText=\{earningsPaper\}/,
  "Supporter Value summary must keep the full visual support paper but copy compact support share text."
);
assertContains(
  "communityConfirmationInbox",
  /GSN Community Confirmation Review Case/,
  "Community Confirmation Inbox queue and case copies must use bounded protected GSN review papers with private-contact redaction language."
);
assertContains(
  "communityConfirmationInbox",
  /GSN Community Confirmation Review Queue/,
  "Community Confirmation Inbox queue copy must use a bounded protected GSN review queue paper."
);
assertContains(
  "communityConfirmationInbox",
  /private contacts, responder notes, phone numbers, and protected witness details/,
  "Community Confirmation Inbox copied papers must preserve private-contact redaction language."
);
assertContains(
  "communityConfirmationInbox",
  /safeCopy\(queueText\)/,
  "Community Confirmation Inbox queue copy must use the prepared paper text."
);
assertContains(
  "communityConfirmationInbox",
  /safeCopy\(buildReviewCasePaper\(row\)\)/,
  "Community Confirmation Inbox review-case copy must use the prepared review-case paper."
);
assertContains(
  "communityConfirmationPolicy",
  /GSN Community Confirmation Policy Summary/,
  "Community Confirmation Policy copied summary must use a bounded protected GSN policy paper."
);
assertContains(
  "communityConfirmationPolicy",
  /private contacts, protected member lists, responder notes, phone numbers, and private witness details/,
  "Community Confirmation Policy copied summary must keep redaction language."
);
assertNotContains(
  "communityConfirmationPolicy",
  /raw votes|raw member lists/,
  "Community Confirmation Policy visible copy must use private/protected wording, not raw-vote or raw-list wording."
);
assertContains(
  "communityConfirmationPolicy",
  /safeCopy\(copyText\)/,
  "Community Confirmation Policy Copy summary must use the prepared paper text."
);
assertContains(
  "adminIncompleteLoans",
  /GSN Incomplete Support Review Snapshot/,
  "Admin Incomplete Loans per-support copies must use bounded protected GSN support review papers."
);
assertContains(
  "adminIncompleteLoans",
  /GSN Incomplete Support Queue Snapshot/,
  "Admin Incomplete Loans queue copy must use a bounded protected GSN support queue paper."
);
assertContains(
  "adminIncompleteLoans",
  /private borrower contact details, supporter contacts, bank details, protected support details, and protected notes/,
  "Admin Incomplete Loans copied papers must keep private support-record redaction language."
);
assertContains(
  "adminTrustEvents",
  /GSN Trust Event Audit Snapshot/,
  "Admin Trust Events copies must use bounded protected GSN audit papers and must not copy raw JSON payloads."
);
assertContains(
  "adminTrustEvents",
  /exclude protected event details, private contacts, phone numbers, bank details, and complete private records/,
  "Admin Trust Events copied papers must keep protected-event-detail redaction language."
);
assertContains(
  "adminTrustEvents",
  /safeCopy\(snapshot\)/,
  "Admin Trust Events copy must use the prepared audit snapshot only."
);
assertNotContains(
  "adminTrustEvents",
  /const payload|safeCopy\([^)]*payload/g,
  "Admin Trust Events must not append raw event JSON to copied audit papers."
);
assertContains(
  "bankConsole",
  /GSN Bank Console Event Review/,
  "Bank Console row and settings copies must use bounded reconciliation review papers, not raw summaries or raw JSON settings."
);
assertContains(
  "bankConsole",
  /GSN Bank Console Settings Review/,
  "Bank Console settings copy must use a bounded protected settings review paper."
);

[
  "adminIncompleteLoans",
  "adminTrustEvents",
  "bankConsole",
  "communityConfirmationInbox",
  "communityConfirmationPolicy",
].forEach((key) => {
  assertNotContains(
    key,
    /Internal review|internal support review|internal admin review|Internal queue|internal queue|internal notes|Internal audit|internal trust-event|internal finance review|Internal settings|internal reconciliation|internal settings summary|Internal policy|internal policy summary|Internal evidence|internal evidence|internally and keeps|stays internal/i,
    "Copied admin/review papers must use protected-review wording instead of internal wording."
  );
});
assertContains(
  "bankConsole",
  /reconciliation review evidence only/,
  "Bank Console copied row paper must keep the no-settlement boundary."
);
assertContains(
  "bankConsole",
  /avoids protected technical details and secrets/,
  "Bank Console settings paper must state that it avoids protected technical details and secrets."
);
assertContains(
  "bankConsole",
  /safeCopy\(buildBankEventReviewPaper\(row, displayReference\)\)/,
  "Bank Console row copy must use the prepared review paper."
);
assertContains(
  "bankConsole",
  /safeCopy\(buildBankSettingsReviewPaper\(cfg\)\)/,
  "Bank Console settings copy must use the prepared settings paper."
);
assertNotContains(
  "bankConsole",
  /safeCopy\(JSON\.stringify\(cfg, null, 2\)\)|raw bank payloads|Configuration visible|No configuration visible|protected configuration review|raw provider payloads|raw JSON configuration/g,
  "Bank Console settings copy must not expose raw JSON/configuration wording."
);
assertContains(
  "revenueAllocation",
  /GSN Revenue Allocation Review Summary/,
  "Revenue Allocation summary copy must use a bounded protected GSN allocation review paper."
);
assertContains(
  "revenueAllocation",
  /allocation review evidence only/,
  "Revenue Allocation copied paper must keep the allocation-review-only boundary."
);
assertContains(
  "revenueAllocation",
  /does not confirm payout/,
  "Revenue Allocation copied paper must not imply payout or disbursement confirmation."
);
assertContains(
  "revenueAllocation",
  /private bank details, private supporter contacts, protected ledger details/,
  "Revenue Allocation copied paper must keep private finance-record redaction language."
);
assertNotContains(
  "revenueAllocation",
  /raw ledger metadata|Internal review summary/i,
  "Revenue Allocation copied paper must use protected-ledger/protected-review wording, not raw-metadata or internal wording."
);
assertContains(
  "revenueAllocation",
  /safeCopy\(text\)/,
  "Revenue Allocation Copy summary must use the prepared paper text."
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
assertContains(
  "trustSlip",
  /What decision can this TrustSlip evidence support\?/,
  "TrustSlip decision questions must frame the paper as evidence support, not a personal trust verdict."
);
assertContains(
  "trustSlip",
  /TrustDocumentConfidenceRibbon[\s\S]*?trustSlipHolderConfidenceRibbonItems[\s\S]*?TrustSlip status[\s\S]*?Record integrity[\s\S]*?Evidence chain[\s\S]*?Verification path[\s\S]*?Valid until/,
  "Signed-in TrustSlip holder paper must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "trustSlip",
  /data-gsn-trust-document-certificate="trustslip-holder"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This TrustSlip confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This TrustSlip does not confirm"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="TrustSlip security"[\s\S]*?TrustDocumentFingerprint[\s\S]*?TrustSlip holder record reference/,
  "Signed-in TrustSlip holder paper must implement the Trust Document Language sequence with security, boundary, and record reference panels."
);
assertContains(
  "trustSlip",
  /Record reference made from the visible TrustSlip fields\. It is not legal proof or payment approval\.[\s\S]*?Record reference for this visible holder-facing TrustSlip\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Signed-in TrustSlip holder paper record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "trustSlip",
  /trustSlipHolderDoesNotConfirmList[\s\S]*?Government registration or legal identity beyond recorded evidence[\s\S]*?Bank approval, credit approval, payment movement, or escrow[\s\S]*?Future behaviour, future repayment, delivery, or marketplace outcome[\s\S]*?Authority to release goods, money, credit, or services[\s\S]*?Private Trust Passport history, private notes, private contacts, or admin records/,
  "Signed-in TrustSlip holder paper must keep legal, finance, future-outcome, release-authority, and private-passport boundaries visible."
);
assertContains(
  "trustTimeline",
  /TrustDocumentConfidenceRibbon[\s\S]*?trustTimelineConfidenceRibbonItems[\s\S]*?Timeline status[\s\S]*?Record integrity[\s\S]*?Evidence chain[\s\S]*?Verification path[\s\S]*?Last registry update/,
  "Signed-in Trust Timeline must carry the Trust Document Language confidence ribbon."
);
assertContains(
  "trustTimeline",
  /data-gsn-trust-document-certificate="trust-timeline"[\s\S]*?TrustDocumentRegistryMasthead[\s\S]*?title="Trust Timeline Evidence Record"[\s\S]*?TrustDocumentConfidenceRibbon[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This timeline confirms"[\s\S]*?TrustDocumentBoundaryPanel[\s\S]*?title="This timeline does not confirm"[\s\S]*?TrustDocumentSecurityPanel[\s\S]*?title="Trust Timeline security"[\s\S]*?TrustDocumentFingerprint[\s\S]*?Trust Timeline record reference/,
  "Signed-in Trust Timeline must implement the Trust Document Language sequence with visible masthead record title, confidence, boundary, security, and record reference panels."
);
assertContains(
  "trustTimeline",
  /Record reference made from the visible timeline fields\. It is not legal proof or payment approval\.[\s\S]*?Record reference for this visible signed-in Trust Timeline\. It helps match this page with its GSN record; it is not legal proof or payment approval\./,
  "Signed-in Trust Timeline record-reference copy must stay plain and keep legal/payment boundaries."
);
assertContains(
  "trustTimeline",
  /trustTimelineDoesNotConfirmList[\s\S]*?Government registration, legal identity, or bank approval[\s\S]*?Payment movement, escrow, payout approval, credit approval[\s\S]*?Future behaviour, future repayment, delivery, marketplace outcome[\s\S]*?Authority to release goods, money, credit, services, or private records[\s\S]*?Private contacts, complete private Trust Passport history, protected event details, or admin-only notes/,
  "Signed-in Trust Timeline must keep legal, finance, future-outcome, release-authority, and private-record boundaries visible."
);
assertNotContains(
  "trustSlip",
  /Can this person be trusted for support, contribution, finance, or trade\?/g,
  "TrustSlip page must not ask a blanket personal-trust verdict question."
);
assertContains(
  "trustSlipRoute",
  /GSN TrustSlip Release Evidence Paper[\s\S]*?Security marks: GSN\s+watermark[\s\S]*?This page prepares a protected release evidence record only[\s\S]*?does not collect[\s\S]*?confirm bank receipt[\s\S]*?approve credit[\s\S]*?guarantee delivery[\s\S]*?permission to release goods, credit, or money[\s\S]*?Release evidence helper; not\s+a bank[\s\S]*?guarantee[\s\S]*?automatic release authority/,
  "TrustSlip release helper page must read as a restricted GSN evidence paper with user-facing release-boundary language."
);
assertNotContains(
  "trustSlipRoute",
  /Use Swagger|Open Swagger|href="\/docs"|Log Release \(Admin\)/,
  "TrustSlip release helper page must not expose developer-facing Swagger wording or the old plain admin title."
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
  /const trustPassportPaper = useMemo[\s\S]*?buildTrustPassportSnapshot[\s\S]*?const trustPassportShareText = useMemo[\s\S]*?buildTrustPassportShareText[\s\S]*?copyTrustSnapshot\(\)[\s\S]*?trustPassportShareText[\s\S]*?paperText=\{trustPassportPaper\}/,
  "Trust Passport must keep the official visual paper separate from compact copied share text."
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

[
  "clansRoute",
  "communityConfirmationService",
  "trustSlipService",
  "communityMemberVerify",
  "communityConfirmationPolicy",
].forEach((key) => {
  assertContains(
    key,
    /Community evidence|Light member evidence|Strong member evidence|Joined \/ witness not started|Community member evidence found|Active community member; witness evidence limited|Trade activity/,
    "Community-member and TrustSlip public labels must use evidence wording."
  );
  assertNotContains(
    key,
    /Strongly Verified|Community Verified|Lightly Verified|Verified Community Member|Trusted trade|Joined \/ Unverified|Community Membership Not Fully Verified/g,
    "Community-member and TrustSlip public labels must not sound like blanket verification or trusted-trade certification."
  );
});

[
  "rguCustomerDiscovery",
  "trustSlipShipReadiness",
  "trustSlipScreenGap",
].forEach((key) => {
  assertContains(
    key,
    /What decision can this TrustSlip evidence support/,
    "TrustSlip-facing docs must ask what the evidence can support, not whether the person can be trusted."
  );
  assertNotContains(
    key,
    /Can this person be trusted/g,
    "TrustSlip-facing docs must not keep the old blanket personal-trust question."
  );
});
assertContains(
  "verifiedCommunityDomainSpec",
  /Joined \/ witness not started[\s\S]*?Light member evidence[\s\S]*?Community evidence[\s\S]*?Strong member evidence/,
  "Verified-community domain spec must use evidence-level labels."
);
assertNotContains(
  "verifiedCommunityDomainSpec",
  /Lightly Verified|Community Verified|Strongly Verified|Joined \/ Unverified|verified member of Community Domain/g,
  "Verified-community domain spec must not keep old blanket verification labels."
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
  "evidencePanel",
  /buildGsnSnapshotPaper[\s\S]*?GsnSnapshotPaperCard[\s\S]*?paperText=\{paperPreview\}/,
  "Evidence pack panel must render a visible GSN headed-paper preview, not only a plain app block."
);
assertContains(
  "evidencePanel",
  /Redacted share copy first[\s\S]*?Complete record[\s\S]*?Authorized private review only/,
  "Evidence pack panel must make the redacted outside-review copy safer and clearer than the complete private record."
);
assertContains(
  "evidencePanel",
  /not a bank guarantee[\s\S]*?credit approval[\s\S]*?payment instruction[\s\S]*?automatic debit authority[\s\S]*?proof that money moved/,
  "Evidence pack panel limitation must not imply bank, credit, payment, debit, or funds-movement authority."
);
assertOrdered(
  "evidencePanel",
  [
    'debugId="evidence-pack.download-redacted"',
    'debugId="evidence-pack.download-full"',
  ],
  "Evidence pack panel must present the redacted share copy before the complete private record action."
);
assertNotContains(
  "evidencePanel",
  /border: "1px solid #eee"/g,
  "Evidence pack panel must not regress to the old plain bordered app block."
);
assertContains(
  "marketplace",
  /Title: GSN Trade Evidence Paper[\s\S]*?Purpose: Recorded trade evidence\. GSN does not hold money or release funds\.[\s\S]*?Limitation: evidence only\. Not escrow, payout approval, bank confirmation, or delivery guarantee\./,
  "Marketplace trade evidence paper must keep the evidence-first title and explicit non-custodial limits."
);
assertContains(
  "marketplace",
  /Trade Evidence[\s\S]*?Trade Evidence Record/,
  "Marketplace trade lane must use evidence-first labels."
);
assertNotContains(
  "marketplace",
  /Trusted Trade|Protected Trade Record|GSN Protected Trade Evidence Paper/g,
  "Marketplace trade papers must not restore older protected-commerce or trusted-trade labels."
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
