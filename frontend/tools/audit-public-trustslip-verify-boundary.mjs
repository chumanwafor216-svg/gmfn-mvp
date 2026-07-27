/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  verify: "src/pages/TrustSlipVerifyPage.tsx",
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  verifyData: "src/pages/trustSlipVerify/trustSlipVerifyData.ts",
  viewModel: "src/pages/trustSlipVerify/trustSlipVerifyViewModel.ts",
  privateEvidence: "src/pages/trustSlipVerify/TrustSlipVerifyPrivateEvidence.tsx",
  boundary: "src/pages/trustSlipVerify/TrustSlipVerifyBoundary.tsx",
  communityProofPanel: "src/components/CommunityProofPanel.tsx",
  communityProof: "src/lib/communityProof.ts",
  decisionPacks: "src/lib/decisionPacks.ts",
  api: "src/lib/api.ts",
  backend: "../gmfn_backend/app/api/routes/trust_slips.py",
  backendTrustSlipService: "../gmfn_backend/app/services/trust_slips_services.py",
  backendDecisionPacks: "../gmfn_backend/app/services/trust_slip_decision_packs.py",
  backendDecisionPackTests: "../gmfn_backend/tests/test_trust_slip_boundary_controls.py",
  backendModels: "../gmfn_backend/app/db/models.py",
  package: "package.json",
  decisionMatrix: "../docs/GSN_DECISION_PACK_EVIDENCE_MATRIX.md",
};

const sourceByKey = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);

const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(key, index, message, text = "Expected pattern was not found.") {
  const source = sourceByKey[key];
  findings.push({
    file: files[key],
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text: String(text).replace(/\s+/g, " ").slice(0, 320),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertOrder(key, orderedPatterns, message) {
  const source = sourceByKey[key];
  let cursor = -1;
  const seen = [];

  for (const item of orderedPatterns) {
    const scoped = source.slice(cursor + 1);
    const match = scoped.match(item.pattern);
    if (!match || match.index === undefined) {
      addFinding(
        key,
        cursor,
        message,
        `Missing after ${seen.join(" -> ") || "start"}: ${item.label}`
      );
      return;
    }
    cursor = cursor + 1 + match.index;
    seen.push(item.label);
  }
}

function assertCount(key, pattern, expected, message) {
  const source = sourceByKey[key];
  const count = (source.match(pattern) || []).length;
  if (count === expected) return;
  addFinding(key, -1, message, `Expected ${expected}; found ${count}.`);
}

assertContains(
  "app",
  /<Route path="\/t\/:code" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/t\/:code\/lite" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/verify\/trust-slip" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/verify\/trustslip" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/page" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/lite" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/print" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "Public TrustSlip Verify aliases must continue to route to TrustSlipVerifyPage."
);

assertContains(
  "app",
  /<Route path="trust-slip\/verify" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "Signed-in TrustSlip Verify route must continue to use the same boundary-aware page."
);

assertContains(
  "verify",
  /const isAppRoute = location\.pathname\.startsWith\("\/app\/"\);/,
  "TrustSlip Verify must derive public/app context from the route path."
);

assertContains(
  "verify",
  /const noPublicCodeSupplied = !isAppRoute && !requestedCode;/,
  "Public no-code state must stay public-only and not fall through to signed-in lookup behavior."
);
assertContains(
  "decisionPacks",
  /export const GSN_DECISION_PACKS[\s\S]*?Referral Decision Pack[\s\S]*?normalizeDecisionPackPublicContext[\s\S]*?General Decision Pack[\s\S]*?Can I make a better decision with this evidence\?/,
  "Public TrustSlip Verify must use the shared Decision Pack catalog and safe fallback normalization."
);

assertContains(
  "decisionPacks",
  /expectedEvidence[\s\S]*?gsnSources[\s\S]*?missingLinks[\s\S]*?refusesToClaim[\s\S]*?confirmationReasonType[\s\S]*?confirmationQuestion[\s\S]*?Employment Decision Pack[\s\S]*?Demand Box[\s\S]*?employment_role_check[\s\S]*?Housing Decision Pack[\s\S]*?Previous landlord[\s\S]*?housing_reference_check[\s\S]*?Trade or Skilled Work Decision Pack[\s\S]*?Customer-confirmed completed-job record[\s\S]*?trade_skill_check/,
  "Shared Decision Pack catalog must map real recipient questions to expected evidence, GSN sources, missing links, community-confirmation prompts, and overclaim boundaries."
);

assertContains(
  "decisionMatrix",
  /Employment[\s\S]*?Demand Box[\s\S]*?Housing[\s\S]*?previous landlord[\s\S]*?Trade or Skilled Work[\s\S]*?Customer-confirmed completed-job record[\s\S]*?Backend parity/,
  "Public Decision Pack evidence matrix doc must preserve real-world employment, housing, trade, and backend parity gaps."
);

assertContains(
  "decisionPacks",
  /function decisionPackComparable[\s\S]*?export function findDecisionPack[\s\S]*?decisionPackComparable\(pack\.key\) === comparable[\s\S]*?decisionPackComparable\(pack\.shortLabel\) === comparable/,
  "Frontend Decision Pack lookup must canonicalize keys and short labels with the same comparable path."
);

assertContains(
  "viewModel",
  /const rawAccessScope = firstTruthy\([\s\S]*?record\?\.access_scope[\s\S]*?machineAccessScopeLabels = new Map\(\[[\s\S]*?\["public_decision_pack", "Public Decision Pack"\][\s\S]*?\["public_trustslip", "Public TrustSlip"\][\s\S]*?const accessScope = firstTruthy\([\s\S]*?machineAccessScopeLabels\.get\(rawAccessScope\.toLowerCase\(\)\)[\s\S]*?rawAccessScope/,
  "Public TrustSlip recipient access scope must translate known machine scopes into human metadata labels."
);
assertContains(
  "viewModel",
  /const rawAccessStatus = firstTruthy\(record\?\.access_status, rawAccessRecord\?\.status\);[\s\S]*?machineAccessStatuses[\s\S]*?public_context_from_link[\s\S]*?backend_access_recorded[\s\S]*?backend_access_context_only[\s\S]*?`Shared to support \$\{accessPurpose\}\.`/,
  "Public TrustSlip recipient access status must translate machine statuses into human Decision Pack copy."
);
assertContains(
  "verify",
  /const publicDecisionPackContext = useMemo[\s\S]*?decisionPackKey[\s\S]*?normalizeDecisionPackPublicContext[\s\S]*?decision_pack: decisionPack\.key[\s\S]*?decision_pack_focus: decisionPack\.focus[\s\S]*?decision_pack_profile[\s\S]*?relevant_signals: relevantSignals[\s\S]*?gaps_to_check: gapChecks[\s\S]*?recommended_checks: recommendedChecks[\s\S]*?evidence_extract[\s\S]*?gsn_decision_pack_matrix[\s\S]*?share_access_record[\s\S]*?Shared to support \$\{decisionPack\.label\}[\s\S]*?const mergedVerifyResult[\s\S]*?decision_pack_profile:[\s\S]*?verifyResult\?\.decision_pack_profile \|\| publicDecisionPackContext\.decision_pack_profile[\s\S]*?normalizeTrustSlipVerification\(mergedVerifyResult/,
  "Public TrustSlip Verify must canonicalize share-safe Decision Pack URL context into the normalized access record."
);
assertContains(
  "verify",
  /publicDecisionPackContext[\s\S]*?community_confirmation_prompt:[\s\S]*?reason_type: decisionPack\.confirmationReasonType[\s\S]*?question: decisionPack\.confirmationQuestion/,
  "Public TrustSlip Verify URL fallback profile must carry the Decision Pack community-confirmation prompt."
);
assertContains(
  "viewModel",
  /communityConfirmationPrompt:[\s\S]*?reasonType[\s\S]*?source\.community_confirmation_prompt[\s\S]*?reasonType: firstTruthy\(prompt\.reason_type, prompt\.reasonType, "community_standing_check"\)/,
  "Public TrustSlip Verify view model must preserve the backend Decision Pack community-confirmation prompt."
);
assertContains(
  "viewModel",
  /type DecisionPackDeclaredClaim[\s\S]*?declaredClaims: DecisionPackDeclaredClaim\[\][\s\S]*?source\.declared_claims[\s\S]*?declarationBoundaryNote/,
  "Public TrustSlip Verify view model must preserve declared work/service claim rows and their boundary note."
);
assertContains(
  "viewModel",
  /type DecisionPackRecordPointer[\s\S]*?recordPointers: DecisionPackRecordPointer\[\][\s\S]*?source\.record_pointers[\s\S]*?recordPointerBoundaryNote/,
  "Public TrustSlip Verify view model must preserve connected financial/support record pointer rows and their boundary note."
);
assertContains(
  "viewModel",
  /type DecisionPackConfirmationPointer[\s\S]*?confirmationPointers: DecisionPackConfirmationPointer\[\][\s\S]*?source\.confirmation_pointers[\s\S]*?confirmationPointerBoundaryNote/,
  "Public TrustSlip Verify view model must preserve aggregate community witness outcome pointer rows and their boundary note."
);
assertContains(
  "verify",
  /requestCommunityPulse[\s\S]*?requestCommunityConfirmation[\s\S]*?reason_type:[\s\S]*?decisionPackProfile\.communityConfirmationPrompt\.reasonType \|\| "community_standing_check"/,
  "Public TrustSlip Verify live community confirmation must use the Decision Pack prompt reason type."
);


assertContains(
  "verify",
  /const \[meRes, clanRes\] = isAppRoute[\s\S]*?getMe[\s\S]*?getCurrentClan[\s\S]*?: \[null, null\];/,
  "Signed-in user and community data must only load on app routes."
);

assertContains(
  "verify",
  /if \(isAppRoute && typeof \(api as any\)\.getMyTrustSlip === "function"\) \{[\s\S]*?mySlip = await \(api as any\)\.getMyTrustSlip\(\)/,
  "Private holder TrustSlip lookup must stay gated to app routes."
);

assertContains(
  "verify",
  /const privateNormalized =[\s\S]*?isAppRoute && mySlipCode && mySlipCode === codeToUse[\s\S]*?\? normalizeTrustSlipVerification\(mySlip, codeToUse\)[\s\S]*?: null;/,
  "Private evidence source must require app route and an exact visible-code match."
);

assertContains(
  "verify",
  /const ownsVisibleTrustSlip =[\s\S]*?isAppRoute &&[\s\S]*?Boolean\(privateEvidenceRecord\) &&[\s\S]*?Boolean\(privateEvidenceCode\) &&[\s\S]*?privateEvidenceCode === visibleRecordCode;/,
  "Private evidence ownership must require app route, private record, and matching visible code."
);

assertContains(
  "verify",
  /buildTrustSlipVerifyViewModel\(\{[\s\S]*?record,[\s\S]*?me: ownsVisibleTrustSlip \? me : null,[\s\S]*?isAppRoute: ownsVisibleTrustSlip,/,
  "Public TrustSlip view model must not receive signed-in identity data unless the visitor owns the visible TrustSlip."
);

assertContains(
  "verify",
  /const canShowPrivateEvidence = ownsVisibleTrustSlip;/,
  "Private evidence visibility must stay tied to visible TrustSlip ownership."
);

assertContains(
  "api",
  /export async function verifyTrustSlip\([\s\S]*?return httpJson\([\s\S]*?`\/trust-slips\/verify\/\$\{encodeURIComponent\(String\(code\)\)\}\$\{buildQuery\([\s\S]*?\)[\s\S]*?"GET",[\s\S]*?undefined,[\s\S]*?\{ includeAuth: false, header_clan_id: null, quiet: true \}/,
  "Public TrustSlip verify API calls must not inherit viewer auth or selected-community headers, and expected public not-found states should stay quiet."
);

assertCount(
  "verify",
  /<PageTopNav\b/g,
  2,
  "TrustSlip Verify PageTopNav inventory changed; re-audit public route navigation chrome."
);

assertContains(
  "verify",
  /\{isAppRoute \? \([\s\S]*?<PageTopNav[\s\S]*?\) : null\}/,
  "Public TrustSlip Verify must not render app PageTopNav outside app routes."
);

assertOrder(
  "verify",
  [
    { label: "public paper", pattern: /<TrustSlipVerifyPublicPaper/ },
    { label: "public sharing boundary", pattern: /<TrustSlipVerifyBoundary/ },
    { label: "private evidence gate", pattern: /\{canShowPrivateEvidence \? \(/ },
    { label: "private evidence disclosure", pattern: /debugId="trust-slip-verify\.full-evidence-toggle"/ },
    { label: "private evidence component", pattern: /<TrustSlipVerifyPrivateEvidence/ },
  ],
  "Public paper, public sharing boundary, and private evidence drawer must stay in the expected order."
);

assertContains(
  "publicPaper",
  /TrustDocumentConfidenceRibbon[\s\S]*TrustDocumentDisclosureSection[\s\S]*TrustDocumentSecurityPanel[\s\S]*TrustDocumentBoundaryPanel[\s\S]*TrustDocumentFingerprint/,
  "Public TrustSlip paper must keep core Trust Document Language primitives."
);
assertContains(
  "publicPaper",
  /data-debug-id="trust-slip-verify\.public\.decision-pack-reading"[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="Decision evidence details"[\s\S]*?summary="Open for purpose-filtered signals, categories, gaps, checks, and evidence boundaries\."[\s\S]*?data-gsn-decision-pack-profile="public-purpose-filter"[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="Audit Details"[\s\S]*?summary="Open for technical record checks, community evidence, security, and limits\."[\s\S]*?data-gsn-public-more-details="authority-evidence-limits"[\s\S]*?<TrustPaperAuthorityStrip[\s\S]*?<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>[\s\S]*?<CommunityProofPanel[\s\S]*?title="Community evidence checked"[\s\S]*?trustSlipStatusLabel=\{publicValidityLabel\}[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="What this cannot prove"/,
  "Public TrustSlip Decision Pack details and heavier authority/evidence/security layers must stay behind disclosures after the recipient decision-first panels."
);
assertContains(
  "publicPaper",
  /const decisionFirstAnswer = !validNow[\s\S]*?"Verification required"[\s\S]*?"Known across evidence contexts"[\s\S]*?"Known by community"[\s\S]*?"Evidence still building"[\s\S]*?const decisionFirstFacts:[\s\S]*?label: "Who\?"[\s\S]*?label: "What we checked"[\s\S]*?label: "Evidence"[\s\S]*?label: "Next step"[\s\S]*?const decisionBoundaryRows:[\s\S]*?\["What we checked", evidenceScopeIsWider \? "Primary \+ wider" : "Primary shown"\][\s\S]*?\["Guarantee", "No"\][\s\S]*?\["Government ID", "No"\][\s\S]*?\["Credit approval", "No"\][\s\S]*?\["Final decision", "Yours"\]/,
  "Public TrustSlip paper must compute one answer, four quick facts, and compact boundary rows before rendering."
);
assertContains(
  "backendTrustSlipService",
  /def _evidence_scope_summary\([\s\S]*?community_footprint[\s\S]*?primary_plus_wider[\s\S]*?primary_only[\s\S]*?"reading_scope": scope[\s\S]*?one primary community anchor[\s\S]*?not as proof that every community gives the same judgement/,
  "Backend TrustSlip payload must derive an explicit primary-anchor versus wider-context evidence scope."
);
assertContains(
  "backend",
  /"evidence_scope": merchant_view\.get\("evidence_scope"\)[\s\S]*?"evidence_scope": evidence_scope[\s\S]*?"active_community_count": evidence_scope\.get\("active_community_count"\)/,
  "Public TrustSlip Verify JSON must publish the explicit evidence scope and active community count."
);
assertContains(
  "viewModel",
  /const evidenceScope =[\s\S]*?record\?\.evidence_scope[\s\S]*?evidenceScopeReadingScope[\s\S]*?evidenceScopeSummary[\s\S]*?evidenceScopeBoundary[\s\S]*?one primary community anchor/,
  "TrustSlip Verify view model must consume the explicit backend evidence scope before rendering public wording."
);

assertContains(
  "publicPaper",
  /Public Decision Pack[\s\S]*?Public Decision Pack for a safer next decision[\s\S]*?data-gsn-public-decision-first="one-answer-four-facts"[\s\S]*?Decision Summary[\s\S]*?\{decisionFirstAnswer\}[\s\S]*?data-gsn-public-decision-first-facts="four-quick-facts"[\s\S]*?data-gsn-public-decision-boundary="compact"[\s\S]*?Decision Boundary[\s\S]*?Why you received this[\s\S]*?Why this record can be trusted[\s\S]*?Check the live paper, then decide[\s\S]*?current, traceable, and limited[\s\S]*?do not guarantee the holder or replace your own judgement[\s\S]*?Decision Pack reading[\s\S]*?Can I make a better decision with this evidence\?[\s\S]*?This document exists to reduce uncertainty, not eliminate risk[\s\S]*?GSN provides trustworthy evidence; the recipient remains responsible for the decision[\s\S]*?Evidence focus[\s\S]*?What to inspect[\s\S]*?Decision evidence details[\s\S]*?data-gsn-decision-pack-profile="public-purpose-filter"[\s\S]*?Audit Details[\s\S]*?data-gsn-public-more-details="authority-evidence-limits"/,
  "Public TrustSlip paper must lead with decision support before collapsing purpose-filtered evidence details and heavier authority/evidence/security details."
);

assertContains(
  "publicPaper",
  /const recordTrustReasonTiles = \[[\s\S]*?Public code[\s\S]*?Code resolved[\s\S]*?Current window[\s\S]*?Status: \$\{publicValidityLabel\}[\s\S]*?Check path[\s\S]*?live link or QR[\s\S]*?Live confirmation[\s\S]*?decisionNextStep[\s\S]*?\];[\s\S]*?data-gsn-public-record-trust-reasons="decision-pack"[\s\S]*?data-gsn-public-record-trust-reasons-grid="compact-two-by-two"[\s\S]*?gridTemplateColumns: compact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?recordTrustReasonTiles\.map/,
  "Public TrustSlip paper must group code, currentness, QR/link, and live-confirmation trust reasons without adding new claims."
);

assertContains(
  "publicPaper",
  /function PublicReadingTile[\s\S]*?if \(compact\)[\s\S]*?data-gsn-public-reading-tile-density="compact"[\s\S]*?minHeight: 84[\s\S]*?gridTemplateColumns: "32px minmax\(0, 1fr\)"[\s\S]*?fontSize: 10\.5[\s\S]*?return \([\s\S]*?minHeight: 132/,
  "Public TrustSlip paper must keep compact mobile evidence tiles dense while preserving desktop tile rhythm."
);

assertContains(
  "communityProofPanel",
  /data-gsn-community-proof-layer="true"[\s\S]*?data-gsn-community-proof-item=\{item.key\}[\s\S]*?EvidenceMeter/,
  "CommunityProofPanel must expose a caged proof layer with evidence meters and a decision boundary item."
);

assertContains(
  "communityProof",
  /Known by community[\s\S]*?Member witness[\s\S]*?Are witnesses up to date\?[\s\S]*?What this cannot decide[\s\S]*?not government ID, payment approval, credit approval, or a guarantee of future behaviour/,
  "Community proof helper must keep portable proof language and non-ID/non-approval boundary wording."
);

assertContains(
  "publicPaper",
  /const trustSlipConfirmsList = \[[\s\S]*?Public TrustSlip code status[\s\S]*?Visible evidence strength and what the paper cannot prove[\s\S]*?Displayed holder and GSN ID from this paper[\s\S]*?Primary community label shown on this TrustSlip[\s\S]*?Verification path and QR destination when available[\s\S]*?\];/,
  "Public TrustSlip paper must keep a clear 'this confirms' boundary list."
);

assertContains(
  "publicPaper",
  /What this cannot prove[\s\S]*?\{publicEvidencePosture\}[\s\S]*?\{publicEvidencePostureMeaning\}[\s\S]*?\{publicEvidencePostureBoundary\}/,
  "Public TrustSlip paper must translate numeric readings into plain evidence-strength language before outsider readers see them."
);

assertContains(
  "backend",
  /"cci_public_label": cci_public_label[\s\S]*?"cci_public_meaning": cci_public_meaning[\s\S]*?"cci_public_boundary": cci_public_boundary/,
  "Backend public TrustSlip payload must expose descriptive CCI public-reading fields."
);

assertContains(
  "backend",
  /PUBLIC_TRUSTSLIP_BLOCKED_KEYS = \{[\s\S]*?"score"[\s\S]*?"cci_score"[\s\S]*?"trust_score"[\s\S]*?"open_trust_score"[\s\S]*?"community_trust_score"[\s\S]*?\}/,
  "Backend public TrustSlip sanitizer must block raw score-like fields from nested public objects."
);

assertContains(
  "backend",
  /public_cci_explainer = _public_trustslip_merchant_view\(cci_explainer\)[\s\S]*?merchant_view_out\["cci_explainer"\] = public_cci_explainer[\s\S]*?"cci_explainer": public_cci_explainer if visibility_level != "minimal" else \{\}/,
  "Backend public TrustSlip payload must sanitize the CCI explainer before exposing it publicly."
);

assertContains(
  "backend",
  /"cci_score": None,[\s\S]*?"cci_score_visibility": "internal_index"[\s\S]*?"cci_band": top_level_cci_band/,
  "Backend public TrustSlip payload must not send raw CCI score to outsider readers."
);
assertContains(
  "backendModels",
  /class TrustSlipDecisionPackAccess\(Base\):[\s\S]*?__tablename__ = "trust_slip_decision_pack_access"[\s\S]*?decision_pack_key[\s\S]*?recipient_question[\s\S]*?decision_focus[\s\S]*?source[\s\S]*?created_at/,
  "Backend must keep Decision Pack access in a separate bounded access ledger, not inside TrustEvents."
);

assertContains(
  "backendDecisionPacks",
  /DECISION_PACKS[\s\S]*?Referral Decision Pack[\s\S]*?normalize_decision_pack_context[\s\S]*?record_decision_pack_access[\s\S]*?TrustSlipDecisionPackAccess/,
  "Backend must normalize and record public Decision Pack context through the bounded access ledger service."
);

assertContains(
  "backend",
  /normalize_decision_pack_context\(request\.query_params\)[\s\S]*?response_payload: Dict\[str, Any\][\s\S]*?record_decision_pack_access[\s\S]*?build_decision_pack_access_payload[\s\S]*?return response_payload/,
  "Backend public verify route must attach public-safe Decision Pack access context and record it without changing TrustEvent evidence."
);

assertContains(
  "backendDecisionPacks",
  /class DecisionPackDefinition:[\s\S]*?expected_evidence: tuple\[str, \.\.\.\][\s\S]*?gsn_sources: tuple\[dict\[str, str\], \.\.\.\][\s\S]*?missing_links: tuple\[str, \.\.\.\][\s\S]*?refuses_to_claim: tuple\[str, \.\.\.\][\s\S]*?confirmation_reason_type: str[\s\S]*?confirmation_question: str[\s\S]*?Employment Decision Pack[\s\S]*?Demand Box[\s\S]*?employment_role_check[\s\S]*?Housing Decision Pack[\s\S]*?Previous landlord[\s\S]*?housing_reference_check[\s\S]*?Trade or Skilled Work Decision Pack[\s\S]*?Customer-confirmed completed-job record[\s\S]*?trade_skill_check/,
  "Backend Decision Pack catalog must carry the same evidence/source/gap/boundary matrix and community-confirmation prompts as the frontend selector."
);
assertContains(
  "backendDecisionPacks",
  /build_decision_pack_profile[\s\S]*?expected_evidence[\s\S]*?gsn_sources[\s\S]*?missing_links[\s\S]*?refuses_to_claim[\s\S]*?community_confirmation_prompt[\s\S]*?reason_type[\s\S]*?confirmation_reason_type[\s\S]*?confirmation_question/,
  "Backend Decision Pack profile must expose expected evidence, mapped sources, missing links, overclaim boundaries, and the purpose-specific community-confirmation prompt."
);
assertContains(
  "backendDecisionPacks",
  /MarketplaceProduct[\s\S]*?MarketplaceShop[\s\S]*?ProtectedTradeRecord[\s\S]*?WORK_DECLARATION_PACKS[\s\S]*?_decision_pack_declared_claims[\s\S]*?shop_service_declaration[\s\S]*?listed_service_or_item[\s\S]*?protected_trade_seller_record[\s\S]*?declared_claims[\s\S]*?declaration_boundary_note/,
  "Backend Decision Pack evidence extract must surface public-safe declared work/service claims from shop, listing, and protected-trade records without schema changes."
);
assertContains(
  "backendDecisionPacks",
  /Loan[\s\S]*?LoanGuarantor[\s\S]*?PoolEvent[\s\S]*?Repayment[\s\S]*?FINANCIAL_RECORD_PACKS[\s\S]*?_decision_pack_record_pointers[\s\S]*?loan_support_lifecycle[\s\S]*?repayment_follow_through[\s\S]*?guarantor_support_response[\s\S]*?pool_contribution_activity[\s\S]*?record_pointers[\s\S]*?record_pointer_boundary_note/,
  "Backend Decision Pack evidence extract must surface public-safe financial/support record pointers for housing, support, and partnership decisions without exposing amounts or credit claims."
);
assertContains(
  "backendDecisionPacks",
  /CommunityConfirmationOutcome[\s\S]*?CommunityConfirmationRequest[\s\S]*?CommunityConfirmationResponse[\s\S]*?_decision_pack_confirmation_pointers[\s\S]*?community_confirmation_gap[\s\S]*?community_witness_outcome[\s\S]*?confirmation_pointers[\s\S]*?confirmation_pointer_boundary_note/,
  "Backend Decision Pack evidence extract must surface aggregate community witness outcome pointers without exposing responder identities or private notes."
);
assertContains(
  "backendDecisionPacks",
  /expected_evidence_[\s\S]*?Architecture gap[\s\S]*?does not score the person[\s\S]*?or prove \{boundary_list\}/,
  "Backend Decision Pack profile must turn expectations and gaps into public-readable rows without becoming a score."
);

assertContains(
  "backendDecisionPacks",
  /class DecisionPackDefinition:[\s\S]*?short_label: str[\s\S]*?short_label="Employment"[\s\S]*?def find_decision_pack[\s\S]*?_comparable\(pack\.short_label\)/,
  "Backend Decision Pack catalog must canonicalize the same short labels used by the frontend selector."
);

assertContains(
  "backendDecisionPackTests",
  /test_public_verify_decision_pack_short_label_canonicalizes_like_frontend[\s\S]*?params=\{"decision_pack": "Employment"\}[\s\S]*?payload\["decision_pack"\] == "employment_decision"[\s\S]*?community_confirmation_prompt[\s\S]*?employment_role_check/,
  "Backend tests must prove human short labels canonicalize to the existing Decision Pack key and expose the purpose-specific confirmation prompt."
);

assertContains(
  "backendDecisionPackTests",
  /test_public_verify_decision_pack_matrix_answers_housing_and_trade_questions[\s\S]*?housing_decision[\s\S]*?trade_check[\s\S]*?Previous landlord or accommodation witness route[\s\S]*?housing_reference_check[\s\S]*?Customer-confirmed completed-job record[\s\S]*?trade_skill_check/,
  "Backend tests must prove housing and trade packs answer different real-world questions with different expected evidence, gaps, and community-confirmation prompts."
);
assertContains(
  "backendDecisionPackTests",
  /test_public_verify_trade_pack_surfaces_declared_work_claims_without_overclaiming[\s\S]*?Emeka Plumbing Services[\s\S]*?Bathroom leak repair[\s\S]*?Kitchen pipe repair[\s\S]*?declaration_boundary_note[\s\S]*?workmanship guarantee[\s\S]*?trust_score/,
  "Backend tests must prove trade packs surface declared shop/listing/trade evidence without turning it into a score or workmanship guarantee."
);
assertContains(
  "backendDecisionPackTests",
  /test_public_verify_housing_pack_surfaces_financial_record_pointers_without_credit_overclaiming[\s\S]*?loan_support_lifecycle[\s\S]*?repayment_follow_through[\s\S]*?guarantor_support_response[\s\S]*?pool_contribution_activity[\s\S]*?record_pointer_boundary_note[\s\S]*?PRIVATE-POOL-REF[\s\S]*?trust_score/,
  "Backend tests must prove housing packs surface financial/support record pointers without exposing private references, amounts, or trust scores."
);
assertContains(
  "backendDecisionPackTests",
  /test_public_verify_decision_pack_surfaces_aggregate_community_witness_outcomes_without_private_responder_details[\s\S]*?CommunityConfirmationRequest[\s\S]*?CommunityConfirmationResponse[\s\S]*?CommunityConfirmationOutcome[\s\S]*?community_witness_outcome[\s\S]*?confirmation_pointer_boundary_note[\s\S]*?Private witness note[\s\S]*?responder_user_id[\s\S]*?trust_score/,
  "Backend tests must prove Decision Packs surface aggregate community witness outcomes without exposing private responder/requester details or trust scores."
);

assertContains(
  "backendDecisionPacks",
  /PACK_RELEVANCE_SIGNALS[\s\S]*?PACK_EVENT_CATEGORY_FILTERS[\s\S]*?build_decision_pack_evidence_extract[\s\S]*?private_review_required[\s\S]*?build_decision_pack_profile[\s\S]*?evidence_extract[\s\S]*?does not score the person/,
  "Backend Decision Pack profile must remain a purpose-filtered evidence relevance profile with a redacted event extract, not a score or decision engine."
);
assertContains(
  "backendDecisionPacks",
  /_holder_active_community_ids[\s\S]*?ClanMembership\.user_id[\s\S]*?ClanMembership\.left_at\.is_\(None\)[\s\S]*?included_active_community_count[\s\S]*?other_active_community[\s\S]*?_filter_query_to_holder_active_footprint[\s\S]*?TrustEvent\.clan_id\.in_\(active_community_ids\)/,
  "Backend Decision Pack extracts must use the holder's active community footprint, not only the TrustSlip primary clan."
);

assertContains(
  "backendDecisionPackTests",
  /test_public_verify_decision_pack_extract_uses_holder_active_community_footprint[\s\S]*?included_active_community_count[\s\S]*?service\["evidence_count"\] == 2[\s\S]*?test_holder_private_decision_pack_evidence_marks_primary_and_other_active_community_refs[\s\S]*?"other-active": "other_active_community"/,
  "Backend tests must prove Decision Pack evidence includes active wider communities while marking private event scope."
);

assertContains(
  "viewModel",
  /normalizeDecisionPackEvidenceExtract[\s\S]*?const evidenceScope = source\.evidence_scope[\s\S]*?includedActiveCommunityCount[\s\S]*?includesHolderLevelRecords[\s\S]*?This Decision Pack may include holder-level records/,
  "Public TrustSlip Verify view model must preserve Decision Pack evidence scope from the backend."
);

assertContains(
  "publicPaper",
  /decisionPackEvidenceScopeRows[\s\S]*?Footprint[\s\S]*?Boundary[\s\S]*?title="Evidence footprint"[\s\S]*?data-gsn-decision-pack-evidence-extract="redacted-trust-events"/,
  "Public TrustSlip paper must explain the Decision Pack evidence footprint before category counts."
);


assertContains(
  "backend",
  /build_decision_pack_evidence_extract\([\s\S]*?slip=slip[\s\S]*?context=decision_pack_context[\s\S]*?response_payload\["decision_pack_profile"\] = build_decision_pack_profile\([\s\S]*?evidence_extract=decision_pack_evidence_extract/,
  "Backend public verify route must attach a redacted Decision Pack evidence extract before building the profile."
);

assertContains(
  "verifyData",
  /decision_pack_profile\?: Record<string, any>[\s\S]*?decision_pack_profile: src\?\.decision_pack_profile \|\| null/,
  "Public TrustSlip Verify normalizer must preserve the backend Decision Pack profile contract."
);

assertContains(
  "viewModel",
  /normalizeDecisionPackEvidenceExtract[\s\S]*?privateReviewRequired[\s\S]*?normalizeDecisionPackProfile[\s\S]*?evidenceExtract[\s\S]*?It does not score the person[\s\S]*?decisionPackProfile,/,
  "Public TrustSlip Verify view model must translate the Decision Pack profile and redacted event extract without inventing a score."
);

assertContains(
  "publicPaper",
  /data-gsn-decision-pack-profile="public-purpose-filter"[\s\S]*?Purpose-filtered evidence[\s\S]*?data-gsn-decision-pack-evidence-extract="redacted-trust-events"[\s\S]*?Evidence categories[\s\S]*?Private review needed[\s\S]*?Gaps to check[\s\S]*?Recommended checks[\s\S]*?decisionPackProfile\.boundaryNote/,
  "Public TrustSlip paper must render purpose-filtered evidence, redacted event categories, private-review prompts, gaps, checks, and the non-decision boundary."
);
assertContains(
  "publicPaper",
  /decisionPackDeclaredClaims[\s\S]*?Declared work\/service claim[\s\S]*?decisionPackDeclaredClaimRows[\s\S]*?declarationBoundaryNote/,
  "Public TrustSlip paper must render declared work/service claims separately from event categories with the declaration boundary."
);
assertContains(
  "publicPaper",
  /decisionPackRecordPointers[\s\S]*?Connected record pointers[\s\S]*?decisionPackRecordPointerRows[\s\S]*?recordPointerBoundaryNote/,
  "Public TrustSlip paper must render connected record pointers separately from declarations and event categories with the financial/support boundary."
);
assertContains(
  "publicPaper",
  /decisionPackConfirmationPointers[\s\S]*?Community witness outcomes[\s\S]*?decisionPackConfirmationPointerRows[\s\S]*?confirmationPointerBoundaryNote/,
  "Public TrustSlip paper must render aggregate community witness outcomes separately with the witness privacy boundary."
);
assertContains(
  "backendDecisionPacks",
  /decision_pack_access_to_public_row[\s\S]*?"decision_pack"[\s\S]*?"access_purpose"[\s\S]*?"recipient_question"[\s\S]*?"decision_focus"[\s\S]*?list_decision_pack_accesses_for_holder[\s\S]*?holder_user_id/,
  "Backend Decision Pack access read helper must stay holder-scoped and document absence of recipient identity fields."
);

assertContains(
  "backend",
  /@router\.get\("\/me\/decision-pack-accesses"\)[\s\S]*?get_current_user[\s\S]*?list_decision_pack_accesses_for_holder[\s\S]*?privacy_note[\s\S]*?recipient name[\s\S]*?not behaviour evidence/,
  "Backend signed-in Decision Pack access endpoint must expose holder-scoped access metadata only."
);

assertContains(
  "publicPaper",
  /const trustSlipDoesNotConfirmList = \[[\s\S]*?Legal identity or government registration[\s\S]*?The holder's private Trust Passport contents[\s\S]*?Payment, credit, escrow, release, or delivery approval[\s\S]*?Future behaviour or guaranteed performance[\s\S]*?\];/,
  "Public TrustSlip paper must keep a clear 'this does not confirm' boundary list."
);

assertContains(
  "publicPaper",
  /Private passport boundary[\s\S]*?the holder's private Trust Passport remains protected/,
  "Public TrustSlip paper must explicitly protect the private Trust Passport boundary."
);

assertContains(
  "publicPaper",
  /Validity check[\s\S]*?does not open the holder's private Trust Passport[\s\S]*?Evidence, not approval[\s\S]*?not as a guarantee, credit approval, payment instruction/,
  "Visible public reading must preserve non-private-passport and non-approval language."
);

assertContains(
  "boundary",
  /Public paper ends here[\s\S]*?Share or print only the section above[\s\S]*?Private review area below[\s\S]*?signed-in review or repair/,
  "TrustSlip public/private boundary component must still mark where public sharing ends."
);

assertContains(
  "privateEvidence",
  /TrustSlipVerifyPrivateEvidenceProps[\s\S]*?riskFlags[\s\S]*?contributionDiscipline[\s\S]*?repaymentDiscipline[\s\S]*?personalCommitmentDiscipline/,
  "Private evidence component still contains sensitive review-depth fields; keep it gated from public routes."
);

assertContains(
  "backend",
  /def _public_visibility_level\([\s\S]*?ranks = \{"minimal": 0, "standard": 1\}[\s\S]*?if requested not in ranks:[\s\S]*?return stored/,
  "Backend public visibility must continue to exclude detailed public resolution."
);

assertContains(
  "backend",
  /PUBLIC_TRUSTSLIP_BLOCKED_KEYS = \{[\s\S]*?"email"[\s\S]*?"phone"[\s\S]*?"private_contacts"[\s\S]*?"risk_flags"[\s\S]*?"evidence_summary"[\s\S]*?"payment_reference"[\s\S]*?"bank_account"[\s\S]*?"verifier_name"[\s\S]*?"admin_notes"[\s\S]*?\}/,
  "Backend public TrustSlip filter must continue blocking contact, finance, verifier, risk, evidence, and admin fields."
);

assertContains(
  "backend",
  /def _public_trustslip_value\(value: Any\) -> Any:[\s\S]*?if normalized in PUBLIC_TRUSTSLIP_BLOCKED_KEYS:[\s\S]*?continue[\s\S]*?out\[key\] = _public_trustslip_value\(child\)/,
  "Backend public TrustSlip filter must keep recursively dropping blocked keys."
);

assertContains(
  "backend",
  /@router\.get\("\/verify\/\{code\}"\)[\s\S]*?def verify_trust_slip_public[\s\S]*?visibility_level = _public_visibility_level/,
  "Backend public verify route must keep public visibility filtering and minimal-level suppression."
);

assertContains(
  "backend",
  /merchant_view_out = \{[\s\S]*?\*\*_public_trustslip_merchant_view\(merchant_view\)/,
  "Backend public verify route must keep applying the public TrustSlip merchant-view filter."
);

assertContains(
  "backend",
  /"profile_image_url": merchant_view_out\.get\("profile_image_url"\) if visibility_level != "minimal" else None,[\s\S]*?"identity_context": identity_context if visibility_level != "minimal" else \{\},[\s\S]*?"community_context": community_context if visibility_level != "minimal" else \{\},[\s\S]*?"community_confirmation": community_confirmation if visibility_level != "minimal" else \{/,
  "Backend minimal public TrustSlip level must continue suppressing profile image, identity, community, and detailed confirmation context."
);

assertContains(
  "package",
  /"audit:public-trustslip-verify-boundary": "node tools\/audit-public-trustslip-verify-boundary\.mjs"/,
  "Public TrustSlip Verify boundary audit must stay registered in package scripts."
);

if (findings.length > 0) {
  console.error("Public TrustSlip Verify boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Public TrustSlip Verify boundary audit passed: public aliases, app-only enrichment, ownership-gated private evidence, trust-document limits, and backend public filtering are caged."
);
