/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = [
  "frontend/src/layout/AppLayout.tsx",
  "frontend/src/pages/JoinEntryPage.tsx",
  "frontend/src/pages/BuildFirstCirclePage.tsx",
  "frontend/src/pages/ExposurePage.tsx",
  "frontend/src/pages/ExposureAdminPage.tsx",
  "frontend/src/pages/TrustCommandCentrePage.tsx",
  "frontend/src/pages/TrustGraphAdminPage.tsx",
  "frontend/src/components/GuarantorLeaderboard.tsx",
  "frontend/src/components/LoanSuggestionsPanel.tsx",
  "frontend/src/components/TrustBadge.tsx",
  "frontend/src/components/TrustGraphEdgeList.tsx",
  "frontend/src/components/TrustGraphSummaryCard.tsx",
  "frontend/src/components/GMFNConfirmModal.tsx",
  "frontend/src/components/LoanDecisionPanel.tsx",
  "frontend/src/pages/ShopGalleryPage.tsx",
  "frontend/src/ui/format.ts",
  "frontend/src/lib/guidance.ts",
  "gmfn_backend/app/api/routes/analytics_liquidity.py",
  "gmfn_backend/app/api/routes/auth.py",
  "gmfn_backend/app/api/routes/bank.py",
  "gmfn_backend/app/api/routes/cci.py",
  "gmfn_backend/app/api/routes/clans.py",
  "gmfn_backend/app/api/routes/courier_confirm.py",
  "gmfn_backend/app/api/routes/exposure_admin.py",
  "gmfn_backend/app/api/routes/loans.py",
  "gmfn_backend/app/api/routes/loans_bulk.py",
  "gmfn_backend/app/api/routes/marketplace.py",
  "gmfn_backend/app/api/routes/merchant_risk.py",
  "gmfn_backend/app/api/routes/pilot_readiness.py",
  "gmfn_backend/app/api/routes/public_config.py",
  "gmfn_backend/app/api/routes/reports.py",
  "gmfn_backend/app/api/routes/share.py",
  "gmfn_backend/app/api/routes/trust_evidence_pack.py",
  "gmfn_backend/app/api/routes/trust_slips.py",
  "gmfn_backend/app/api/routes/trust_timeline_pdf.py",
  "gmfn_backend/app/api/routes/trust_score.py",
  "gmfn_backend/app/api/routes/trust_slips_verify_ui.py",
  "gmfn_backend/app/core/clan_auth.py",
  "gmfn_backend/app/routers/clans.py",
  "gmfn_backend/app/services/clans_service.py",
  "gmfn_backend/app/services/daily_insight_service.py",
  "gmfn_backend/app/services/guarantor_rules.py",
  "gmfn_backend/app/services/identity_service.py",
  "gmfn_backend/app/services/invites_service.py",
  "gmfn_backend/app/services/marketplace_service.py",
  "gmfn_backend/app/services/repayments_service.py",
  "gmfn_backend/app/services/cci_engine.py",
  "gmfn_backend/app/services/cci_service.py",
  "gmfn_backend/app/services/trust_graph_service.py",
  "gmfn_backend/app/services/trust_timeline_pdf_service.py",
];

const forbidden = [
  "Clan admin only",
  "Clan admin role required",
  "Clan access required",
  "Clan not found",
  "Clan name already exists",
  "Already a member of this clan",
  "You are not a member of this clan",
  "User is not a member of this clan",
  "You are not an active member of this clan",
  "User is not an active member of this clan",
  "A GMFN member",
  "GMFN member",
  "GMFN account",
  "GMFN Loan Audit",
  "GMFN Verification",
  "GMFN does not guarantee",
  "GMFN is non-custodial",
  "Clan admin or platform admin only",
  "GMFN_EvidencePack",
  "Join GMFN Community",
  "Join a GMFN Community",
  "GMFN TrustSlip Preview",
  "GMFN Market Wisdom",
  "GMFN trust infrastructure",
  "for example GMFN-C-000008",
  "Clan {int(clan.id)}",
  "Clan admin privileges required",
  "wrong clan context",
  "Only the borrower or clan admin can add guarantors",
  "Only the guarantor or a clan admin can decide",
  "Not allowed (not in clan)",
  "Only borrower or clan admin can repay",
  "Guarantor must be a clan member",
  "User already in clan",
  "Loan not in selected clan",
  "No active clan selected",
  "No active clan memberships found",
  "Spotlight capacity reached for clan",
  "clan structure",
  "Active clans",
  "cross-clan trust structure",
  'display_label": f"Clan',
  "GSN (GMFN)",
  "clan-admin exposure",
  "Clan-admin page",
  "Confirm clan-admin exposure access",
  "ordinary member, clan admin",
  "clan-specific exposure totals",
  "Clan Context",
  "No clan risk flags",
  "Cross-Clan Integrity",
  "cross-clan graph integrity",
  "a clan admin; ordinary",
  "Clan ID",
  "No custodial funds are held by GMFN",
  "Clan liquidity index",
  "Dev Clan",
  "Task focus is active",
  "Loan Support task",
  "This task is in focus",
  "main routes stay cleaner",
  "The main routes stay simple",
  "Finance, Loans,",
  "Loans, Trust",
  "decision on a pledge",
  "Available Capacity",
];

const forbiddenByFile = [
  ["frontend/src/lib/guidance.ts", "A borrower is waiting for your decision."],
  ["frontend/src/lib/guidance.ts", "A borrower is waiting for your support decision on"],
  ["frontend/src/lib/guidance.ts", "A borrower is waiting for your support decision."],
  ["frontend/src/lib/guidance.ts", "Support request waiting on loan #"],
  ["frontend/src/pages/LoansPage.tsx", "Someone is waiting for your decision"],
  ["frontend/src/pages/ShopGalleryPage.tsx", 'label: "GMFN ID"'],
  ["frontend/src/pages/ExposurePage.tsx", "—"],
  ["frontend/src/pages/ExposurePage.tsx", "·"],
  ["frontend/src/components/GuarantorLeaderboard.tsx", "—"],
  ["frontend/src/components/LoanSuggestionsPanel.tsx", "—"],
  ["frontend/src/components/TrustBadge.tsx", "—"],
  ["frontend/src/components/TrustBadge.tsx", "–"],
  ["frontend/src/components/TrustBadge.tsx", "ⓘ"],
  ["frontend/src/components/TrustGraphEdgeList.tsx", "—"],
  ["frontend/src/pages/TrustGraphAdminPage.tsx", "—"],
  ["frontend/src/pages/TrustGraphAdminPage.tsx", "·"],
  ["gmfn_backend/app/api/routes/clans.py", "—"],
  ["gmfn_backend/app/api/routes/clans.py", "❌"],
  ["gmfn_backend/app/api/routes/clans.py", "✅"],
  ["gmfn_backend/app/api/routes/trust_slips.py", "—"],
  ["gmfn_backend/app/api/routes/trust_slips_verify_ui.py", "—"],
];

forbiddenByFile.push(["frontend/src/components/TrustGraphEdgeList.tsx", "User #"]);
forbiddenByFile.push(["frontend/src/components/GMFNConfirmModal.tsx", "Internal note"]);
forbiddenByFile.push(["frontend/src/components/TrustGraphEdgeList.tsx", "Internal account reference hidden"]);
forbiddenByFile.push(["frontend/src/pages/TrustSlipPage.tsx", "internal label"]);
forbiddenByFile.push(["frontend/src/pages/TrustSlipPage.tsx", "Overexposure ratio"]);
forbiddenByFile.push(["frontend/src/pages/TrustScorePage.tsx", "Overexposure ratio"]);
forbiddenByFile.push(["frontend/src/pages/TrustScorePage.tsx", '"Overexposure",']);
forbiddenByFile.push(["frontend/src/pages/TrustTimelinePage.tsx", "complete internal records"]);
forbiddenByFile.push(["frontend/src/ui/format.ts", "member@gmfn.com"]);
forbiddenByFile.push(["frontend/src/ui/format.ts", "@gmfn.com"]);
forbiddenByFile.push(["frontend/src/ui/format.ts", "…"]);
forbiddenByFile.push(["frontend/src/ui/format.ts", "â€¦"]);
forbiddenByFile.push(["frontend/src/components/TrustGraphAdminPage.tsx", 'graph.gmfn_id || "Pending"']);
forbiddenByFile.push(["frontend/src/components/TrustGraphAdminPage.tsx", "GSN ID pending"]);
forbiddenByFile.push(["frontend/src/pages/TrustGraphAdminPage.tsx", 'graph.gmfn_id || "Pending"']);
forbiddenByFile.push(["frontend/src/pages/TrustGraphAdminPage.tsx", "GSN ID pending"]);
forbiddenByFile.push(["frontend/src/pages/MarketplacePage.tsx", 'return raw ? displayGsnLabel(raw) : "Pending"']);
forbiddenByFile.push(["frontend/src/pages/MarketplacePage.tsx", 'return cciBand || cciValue || "Pending"']);
forbiddenByFile.push(["frontend/src/pages/MarketplacePage.tsx", "ID pending"]);
forbiddenByFile.push(["frontend/src/pages/MarketplacePage.tsx", 'publicCommunityWorkspaceLink ? "Ready" : "Pending"']);
forbiddenByFile.push(["frontend/src/pages/MarketplacePage.tsx", "Amount pending"]);
forbiddenByFile.push(["frontend/src/pages/MarketplacePage.tsx", "Code pending"]);
forbiddenByFile.push(["frontend/src/pages/LoanDecisionPage.tsx", 'loan?.status || "Pending"']);
forbiddenByFile.push(["frontend/src/pages/LoanReadinessPage.tsx", "Amount pending"]);
forbiddenByFile.push(["frontend/src/pages/LoanSuggestionsPage.tsx", "Amount pending"]);
forbiddenByFile.push(["frontend/src/pages/GuarantorInboxPage.tsx", 'firstTruthy(me?.gmfn_id, "Not available yet")']);
forbiddenByFile.push(["frontend/src/pages/GuarantorEarningsPage.tsx", 'firstTruthy(me?.gmfn_id, "Not available yet")']);
forbiddenByFile.push(["frontend/src/pages/CommunityJoinRequestsPage.tsx", 'activationPack.community_code || "Not available yet"']);
forbiddenByFile.push(["frontend/src/pages/MarketplaceWorkspacePage.tsx", 'Community ID: {communityIdentity || activeClanId || "Not available"}']);
forbiddenByFile.push(["frontend/src/pages/MarketplaceWorkspacePage.tsx", 'Community ID: {communityIdentity || "Not available yet"}']);
forbiddenByFile.push(["frontend/src/pages/ShopAssetsPage.tsx", "GSN ID awaiting issue"]);
forbiddenByFile.push(["frontend/src/pages/RevenueAllocationPage.tsx", 'allocation_status, "pending"']);
forbiddenByFile.push(["frontend/src/pages/RevenueAllocationPage.tsx", 'allocation.status || "pending"']);

const required = [
  ["gmfn_backend/app/api/routes/clans.py", "Community admin only"],
  ["gmfn_backend/app/api/routes/clans.py", "Community not found"],
  ["gmfn_backend/app/api/routes/clans.py", "A GSN member"],
  ["gmfn_backend/app/api/routes/clans.py", "You can now activate your GSN account."],
  ["gmfn_backend/app/api/routes/clans.py", "Join GSN Community"],
  ["gmfn_backend/app/api/routes/clans.py", "User already in community"],
  ["gmfn_backend/app/core/clan_auth.py", "Community admin role required"],
  ["gmfn_backend/app/api/routes/bank.py", "Loan not in selected community"],
  ["gmfn_backend/app/api/routes/exposure_admin.py", "Community admin privileges required"],
  ["gmfn_backend/app/api/routes/loans.py", "Only the requester or community admin can add supporters"],
  ["gmfn_backend/app/api/routes/loans.py", "Only the supporter or a community admin can decide"],
  ["gmfn_backend/app/api/routes/loans.py", "GSN TrustSlip Preview"],
  ["gmfn_backend/app/services/guarantor_rules.py", "Supporter must be a community member"],
  ["gmfn_backend/app/services/repayments_service.py", "Only borrower or community admin can repay"],
  ["gmfn_backend/app/services/daily_insight_service.py", "GSN Market Wisdom"],
  ["gmfn_backend/app/services/trust_graph_service.py", 'display_label": f"Community'],
  ["gmfn_backend/app/services/trust_timeline_pdf_service.py", "GSN trust infrastructure"],
  ["gmfn_backend/app/api/routes/share.py", "GSN Support Evidence"],
  ["gmfn_backend/app/api/routes/courier_confirm.py", "GSN does not guarantee courier performance."],
  ["gmfn_backend/app/api/routes/merchant_risk.py", "GSN is non-custodial"],
  ["gmfn_backend/app/api/routes/reports.py", "Community admin or platform admin only"],
  ["gmfn_backend/app/api/routes/trust_evidence_pack.py", "GSN-EvidencePack-"],
  ["gmfn_backend/app/api/routes/trust_timeline_pdf.py", "gsn-trust-timeline-u{user_id}-{visibility_level}.pdf"],
  ["gmfn_backend/app/api/routes/trust_score.py", "community-scoped using X-Clan-Id"],
  ["gmfn_backend/app/api/routes/trust_slips_verify_ui.py", "GSN Merchant Verification Record"],
  ["gmfn_backend/app/api/routes/trust_slips_verify_ui.py", "GSN does not guarantee delivery, receipt, repayment, or release of goods, credit, or money."],
  ["gmfn_backend/app/api/routes/analytics_liquidity.py", "No custodial funds are held by GSN"],
  ["gmfn_backend/app/api/routes/marketplace.py", "for example GSN-C-000008"],
  ["gmfn_backend/app/api/routes/marketplace.py", "Community {int(clan.id)}"],
  ["gmfn_backend/app/api/routes/marketplace.py", "No active community selected"],
  ["gmfn_backend/app/api/routes/marketplace.py", "No active community memberships found"],
  ["gmfn_backend/app/api/routes/marketplace.py", "Spotlight capacity reached for community"],
  ["gmfn_backend/app/api/routes/public_config.py", '"app_name": "GSN"'],
  ["frontend/src/pages/BuildFirstCirclePage.tsx", "Hi! I am inviting you to join me on GSN."],
  ["frontend/src/pages/ExposurePage.tsx", "Community ID"],
  ["frontend/src/pages/ExposureAdminPage.tsx", "community-admin exposure summary"],
  ["frontend/src/pages/TrustCommandCentrePage.tsx", "Check community-admin exposure access"],
  ["frontend/src/pages/TrustCommandCentrePage.tsx", "Community admin page"],
  ["frontend/src/pages/TrustCommandCentrePage.tsx", "ordinary member, community admin, platform admin"],
  ["frontend/src/pages/TrustCommandCentrePage.tsx", "community-specific exposure totals"],
  ["frontend/src/components/LoanDecisionPanel.tsx", "Community Context"],
  ["frontend/src/components/LoanDecisionPanel.tsx", "No community risk flags"],
  ["gmfn_backend/app/api/routes/pilot_readiness.py", "a community admin; ordinary"],
  ["gmfn_backend/app/services/cci_engine.py", "CCI is cross-community graph consistency"],
  ["gmfn_backend/app/services/cci_service.py", "Cross-Community Integrity"],
  ["gmfn_backend/app/services/trust_timeline_pdf_service.py", "Cross-Community Integrity"],
  ["frontend/src/components/TrustGraphEdgeList.tsx", "community structure"],
  ["frontend/src/components/TrustGraphEdgeList.tsx", ">Community</div>"],
  ["frontend/src/components/TrustGraphEdgeList.tsx", "Private member reference"],
  ["frontend/src/components/TrustGraphEdgeList.tsx", "Private member reference hidden"],
  ["frontend/src/components/TrustGraphSummaryCard.tsx", "cross-community trust structure"],
  ["frontend/src/components/TrustGraphSummaryCard.tsx", "Active communities"],
  ["frontend/src/pages/JoinEntryPage.tsx", "GSN member"],
  ["frontend/src/pages/ShopGalleryPage.tsx", "GSN ID"],
  ["frontend/src/components/TrustGraphAdminPage.tsx", 'graph.gmfn_id || "Not issued yet"'],
  ["frontend/src/pages/TrustGraphAdminPage.tsx", 'graph.gmfn_id || "Not issued yet"'],
  ["frontend/src/pages/TrustGraphAdminPage.tsx", 'placeholder="Not issued yet"'],
  ["frontend/src/pages/MarketplacePage.tsx", 'return raw ? displayGsnLabel(raw) : "No community ID yet"'],
  ["frontend/src/pages/MarketplacePage.tsx", 'return cciBand || cciValue || "Not shown yet"'],
  ["frontend/src/pages/MarketplacePage.tsx", 'publicCommunityWorkspaceLink ? "Ready" : "Not ready yet"'],
  ["frontend/src/pages/MarketplacePage.tsx", "No amount recorded yet"],
  ["frontend/src/pages/MarketplacePage.tsx", "No trade code yet"],
  ["frontend/src/pages/LoanDecisionPage.tsx", 'const loanStatus = safeStr(loan?.status) || "Status not recorded yet"'],
  ["frontend/src/pages/LoanReadinessPage.tsx", "No amount recorded yet"],
  ["frontend/src/pages/LoanSuggestionsPage.tsx", "No amount recorded yet"],
  ["frontend/src/pages/GuarantorInboxPage.tsx", 'const gmfnId = useMemo(() => firstTruthy(gmfnIdValue, "Not issued yet")'],
  ["frontend/src/pages/GuarantorInboxPage.tsx", 'const communityPublicId = useMemo(() =>'],
  ["frontend/src/pages/GuarantorInboxPage.tsx", 'return firstTruthy(communityPublicIdValue, "No community ID yet")'],
  ["frontend/src/pages/GuarantorEarningsPage.tsx", 'const gmfnId = useMemo(() => firstTruthy(gmfnIdValue, "Not issued yet")'],
  ["frontend/src/pages/GuarantorEarningsPage.tsx", 'const communityPublicId = useMemo(() =>'],
  ["frontend/src/pages/GuarantorEarningsPage.tsx", 'return firstTruthy(communityPublicIdValue, "No community ID yet")'],
  ["frontend/src/pages/CommunityJoinRequestsPage.tsx", 'activationPack.community_code || "No community ID yet"'],
  ["frontend/src/pages/MarketplaceWorkspacePage.tsx", 'Community ID: {communityIdentity || "No community ID yet"}'],
  ["frontend/src/pages/ShopAssetsPage.tsx", 'const gmfnId = useMemo(() => firstTruthy(gmfnIdValue, "Not issued yet")'],
  ["frontend/src/pages/RevenueAllocationPage.tsx", 'status: firstTruthy(src?.status, src?.allocation_status, "Status not recorded yet")'],
  ["frontend/src/ui/format.ts", "member@gsn.example"],
  ["frontend/src/ui/format.ts", "`${short}@gsn.example`"],
  ["frontend/src/lib/guidance.ts", "Support request waiting on support #"],
  ["frontend/src/lib/guidance.ts", "A requester is waiting for your support decision on"],
  ["frontend/src/lib/guidance.ts", "A requester is waiting for your support decision."],
  [
    "frontend/src/pages/TrustSlipPage.tsx",
    "This wider reading checks whether the member's trust evidence stays consistent across communities.",
  ],
  ["frontend/src/pages/TrustSlipPage.tsx", "Support pressure reading"],
  ["frontend/src/pages/TrustScorePage.tsx", "Support pressure reading"],
  ["frontend/src/pages/TrustScorePage.tsx", "Support pressure"],
  ["frontend/src/pages/TrustTimelinePage.tsx", "complete private records"],
];

const findings = [];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

for (const file of files) {
  const text = read(file);
  for (const phrase of forbidden) {
    if (text.includes(phrase)) {
      findings.push(`${file}: forbidden visible phrase "${phrase}"`);
    }
  }
}

for (const [file, phrase] of forbiddenByFile) {
  const text = read(file);
  if (text.includes(phrase)) {
    findings.push(`${file}: forbidden visible phrase "${phrase}"`);
  }
}

for (const [file, phrase] of required) {
  const text = read(file);
  if (!text.includes(phrase)) {
    findings.push(`${file}: expected visible phrase "${phrase}"`);
  }
}

if (findings.length) {
  console.error("GSN visible language audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("GSN visible language audit passed.");
