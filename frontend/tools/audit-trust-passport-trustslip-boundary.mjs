/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  trustPassport: "src/pages/TrustScorePage.tsx",
  trustSlip: "src/pages/TrustSlipPage.tsx",
  smoke: "tools/smoke-trust-passport-trustslip-boundary.mjs",
  reader: "src/components/TrustSlipReaderBlock.tsx",
  communityProofPanel: "src/components/CommunityProofPanel.tsx",
  communityProof: "src/lib/communityProof.ts",
  decisionPacks: "src/lib/decisionPacks.ts",
  viewModel: "src/lib/trustPassportViewModel.ts",
  api: "src/lib/api.ts",
  backendBoundaryTests: "../gmfn_backend/tests/test_trust_slip_boundary_controls.py",
  package: "package.json",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  protocol: "../docs/TRUST_DOCUMENT_LANGUAGE_PROTOCOL.md",
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
    text: String(text).replace(/\s+/g, " ").slice(0, 340),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}
function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  const match = source.match(pattern);
  if (!match || match.index === undefined) return;
  addFinding(key, match.index, message, match[0]);
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

function assertLineAbsent(key, pattern, message) {
  const source = sourceByKey[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (!pattern.test(line)) return;
    findings.push({
      file: files[key],
      line: index + 1,
      message,
      text: line.trim(),
    });
  });
}

assertContains(
  "app",
  /const TrustScorePage = React\.lazy\(\(\) => import\("\.\/pages\/TrustScorePage"\)\);[\s\S]*?const TrustSlipPage = React\.lazy\(\(\) => import\("\.\/pages\/TrustSlipPage"\)\);/,
  "Trust Passport and TrustSlip pages must remain separate lazy-loaded surfaces."
);

assertContains(
  "app",
  /<Route path="trust" element=\{<TrustScorePage \/>\} \/>[\s\S]*?<Route path="trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\} \/>[\s\S]*?<Route path="trust-slip" element=\{<TrustSlipPage \/>\} \/>/,
  "Signed-in /app/trust must render TrustScorePage while /app/trust-slip renders TrustSlipPage."
);

assertContains(
  "app",
  /<Route path="\/trust" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\} \/>[\s\S]*?<Route path="\/trust-passport" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST\} \/>\} \/>[\s\S]*?<Route path="\/trust-slip" element=\{<PreserveRedirect to=\{APP_ROUTES\.TRUST_SLIP\} \/>\} \/>/,
  "Top-level Trust Passport and TrustSlip aliases must continue to redirect to their canonical signed-in routes."
);

assertContains(
  "protocol",
  /Trust Passport is the fuller personal\/private record[\s\S]*?must not expose private passport contents to public[\s\S]*?readers/,
  "Trust Document protocol must keep the private Trust Passport boundary explicit."
);

assertContains(
  "protocol",
  /TrustSlip is a portable public trust document[\s\S]*?must not expose the[\s\S]*?private[\s\S]*?Trust Passport/,
  "Trust Document protocol must keep TrustSlip as portable public evidence, not a full passport."
);

assertContains(
  "map",
  /Trust Passport \| `\/app\/trust`[\s\S]*?Fuller signed-in trust story[\s\S]*?Do not redesign before mapping exact fields/,
  "Evidence display map must keep /app/trust classified as the fuller signed-in Trust Passport."
);

assertContains(
  "map",
  /TrustSlip holder page \| `\/app\/trust-slip`[\s\S]*?Portable current evidence controlled by holder[\s\S]*?Must not show full private Passport or imply bank\/escrow\/release authority/,
  "Evidence display map must keep /app/trust-slip classified as portable holder-controlled evidence with authority limits."
);

assertContains(
  "api",
  /export async function getMyTrustSlip\(\): Promise<any> \{[\s\S]*?cachedStartupSectionRead[\s\S]*?startupSectionCacheKey\("getMyTrustSlip"\)[\s\S]*?httpJson\("\/trust-slips\/me", "GET"\)[\s\S]*?\}/,
  "Signed-in holder TrustSlip lookup must keep using the authenticated /trust-slips/me wrapper."
);

assertContains(
  "api",
  /export async function reissueMyTrustSlip[\s\S]*?return httpJson\("\/trust-slips\/me\/reissue", "POST"/,
  "TrustSlip reissue must remain a signed-in holder operation."
);

assertContains(
  "api",
  /export async function verifyTrustSlip[\s\S]*?`\/trust-slips\/verify\/\$\{encodeURIComponent\(String\(code\)\)\}[\s\S]*?\{ includeAuth: false, header_clan_id: null, quiet: true \}/,
  "Public TrustSlip verify wrapper must remain unauthenticated, selected-community-free, and quiet for expected public not-found states."
);

assertContains(
  "trustPassport",
  /buildTrustPassportViewModel\(\{[\s\S]*?trustSlipStatus,[\s\S]*?trustSlipCode,[\s\S]*?verifyUrl,/,
  "Trust Passport must continue deriving its signed-in view model with TrustSlip status, code, and verify URL as outputs."
);

assertContains(
  "trustPassport",
  /data-gsn-trust-document-certificate="trust-passport"[\s\S]*?<TrustDocumentConfidenceRibbon[\s\S]*?<TrustDocumentSecurityPanel[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This passport confirms"[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This passport does not confirm"[\s\S]*?<TrustDocumentFingerprint/,
  "Trust Passport must keep core Trust Document Language primitives and confirms/does-not-confirm panels."
);

assertContains(
  "trustPassport",
  /const trustPassportSecurityItems[\s\S]*?Private passport surface[\s\S]*?not the public TrustSlip[\s\S]*?Public boundary[\s\S]*?Public readers should receive a scoped TrustSlip or community record, not this full private passport/,
  "Trust Passport security panel must explicitly frame the page as private/full and public TrustSlip as scoped."
);

assertContains(
  "trustPassport",
  /const trustPassportConfirmsList = \[[\s\S]*?Signed-in member view of current visible Trust Passport fields[\s\S]*?TrustSlip status and verification path when available[\s\S]*?\];/,
  "Trust Passport confirms list must keep signed-in/full-record and TrustSlip-output boundaries."
);

assertContains(
  "trustPassport",
  /const trustPassportDoesNotConfirmList = \[[\s\S]*?Bank approval, credit approval, payment movement, or escrow[\s\S]*?Future behaviour, future repayment, delivery, or marketplace outcome[\s\S]*?That a public TrustSlip exposes the full private Trust Passport[\s\S]*?\];/,
  "Trust Passport does-not-confirm list must block bank/payment/future-outcome overclaims and full-passport public exposure."
);

assertContains(
  "trustPassport",
  /Record reference for this visible private Trust Passport[\s\S]*?not legal proof or payment approval/,
  "Trust Passport fingerprint must remain a private visible-record reference, not legal/payment proof."
);

assertContains(
  "trustPassport",
  /This is an evidence reading only\. It is not a character judgement, universal trust label, or decision about the person\./,
  "Trust Passport page language must keep evidence reading meaning separate from character judgement or decision support."
);
assertContains(
  "trustPassport",
  /const trustPassportDecisionFacts:[\s\S]*?"Aggregate reading"[\s\S]*?"Primary anchor"[\s\S]*?"Community portfolio"[\s\S]*?"Next step"[\s\S]*?const trustPassportDecisionBoundaryRows:[\s\S]*?"Reading scope", "Aggregate"[\s\S]*?"Primary anchor", "Separate"/,
  "Trust Passport first viewport facts must order aggregate reading, primary community anchor, Community Portfolio, and next step before the compact boundary."
);
assertContains(
  "trustPassport",
  /data-trust-passport-decision-first="one-answer-four-facts"[\s\S]*?Aggregate Passport reading[\s\S]*?\{trustPassportDecisionAnswer\}[\s\S]*?data-trust-passport-decision-facts="four-quick-facts"/,
  "Trust Passport first viewport must visibly label the headline as Aggregate Passport reading before the quick facts."
);

assertContains(
  "smoke",
  /Decision support details[\s\S]*?3\. What this evidence helps you decide[\s\S]*?toHaveCount\(0\)[\s\S]*?data-cta-id="trust-score\.standing-decision-details\.toggle"[\s\S]*?What this evidence helps you decide[\s\S]*?These lines show what this record can and cannot support before a recipient asks for live confirmation\./,
  "Trust Passport browser smoke must verify decision-support rows stay collapsed until the stable details toggle opens."
);

assertContains(
  "smoke",
  /Evidence movement details[\s\S]*?Recent evidence events[\s\S]*?toHaveCount\(0\)[\s\S]*?data-cta-id="trust-score\.evidence-movement-details\.toggle"[\s\S]*?Recent evidence events[\s\S]*?toBeVisible\(\)/,
  "Trust Passport browser smoke must verify Evidence Story movement details stay collapsed until opened."
);

assertContains(
  "smoke",
  /Community evidence details[\s\S]*?Community evidence before relying[\s\S]*?toHaveCount\(0\)[\s\S]*?data-cta-id="trust-score\.community-lane\.evidence-details\.toggle"[\s\S]*?Community evidence before relying[\s\S]*?toBeVisible\(\)/,
  "Trust Passport browser smoke must verify Community Confirmation details stay collapsed until opened."
);

assertLineAbsent(
  "smoke",
  /These lines do not make the decision/,
  "Trust Passport browser smoke must not restore the old decision-support explanation copy."
);

assertLineAbsent(
  "smoke",
  /getByText\("3\. What this evidence helps you decide", \{ exact: true \}\)\)\.toBeVisible/,
  "Trust Passport browser smoke must not expect the old numbered decision-support heading to be visible by default."
);

assertContains(
  "viewModel",
  /Ask for more evidence before money, credit, or goods/,
  "Trust Passport view model must keep money/credit/goods caution when repayment evidence is incomplete."
);

assertContains(
  "trustSlip",
  /fetchTrustSlipPageData[\s\S]*?cacheBust\("\/trust-slips\/me\/summary"\)[\s\S]*?cacheBust\("\/trust-slips\/me"\)[\s\S]*?getMyTrustSlip/,
  "TrustSlip holder page must load signed-in holder summary/me data, not public verify data as the source of truth."
);

assertContains(
  "trustSlip",
  /api\.reissueMyTrustSlip\([\s\S]*?reason: "holder_requested_fresh_public_trustslip"/,
  "TrustSlip holder refresh must keep using the explicit holder-requested reissue reason."
);

assertContains(
  "trustSlip",
  /data-gsn-trust-document-certificate="trustslip-holder"[\s\S]*?<TrustDocumentConfidenceRibbon[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This TrustSlip confirms"[\s\S]*?<TrustDocumentBoundaryPanel[\s\S]*?title="This TrustSlip does not confirm"[\s\S]*?<TrustDocumentSecurityPanel[\s\S]*?<TrustDocumentFingerprint/,
  "TrustSlip holder page must keep core Trust Document Language primitives and confirms/does-not-confirm panels."
);
assertContains(
  "trustSlip",
  /data-gsn-trust-document-certificate="trustslip-holder"[\s\S]*?<TrustDocumentConfidenceRibbon items=\{trustSlipHolderConfidenceRibbonItems\} \/>[\s\S]*?<CommunityProofPanel[\s\S]*?title="Primary community evidence"[\s\S]*?trustSlipStatusLabel=\{trustSlipPublicStatus\}/,
  "TrustSlip holder page must show the shared primary community evidence proof layer after the confidence ribbon."
);

assertContains(
  "trustSlip",
  /data-gsn-trustslip-holder-primary-facts="compact-four"[\s\S]*?label: "Security"[\s\S]*?label: "Status"[\s\S]*?label: "Evidence status"[\s\S]*?label: "Holder check"[\s\S]*?label: "Identity check"[\s\S]*?label: "Community ID"[\s\S]*?label: "Issued"[\s\S]*?label: "Expires"[\s\S]*?\.filter\(\(_, index\) => !isCompact \|\| index < 4\)[\s\S]*?\.map\(\(\{ label, value, full, icon \}\) =>/,
  "TrustSlip holder hero must keep mobile to four quick facts while preserving the fuller desktop fact set."
);
assertNotContains(
  "trustSlip",
  /Trust decision|Support trust|Trade trust|public trust story|public trust summary|Portable trust summary|public trust paper|public trust signals|trust state|public-facing trust summary|trust story|trust signals|trust checks|trust screening|Which trust question should stay in TrustSlip|full trust story/i,
  "TrustSlip holder page must frame portable sharing as evidence summary and decision support, not public trust-story or trust-decision language."
);

assertContains(
  "trustSlip",
  /short public evidence summary[\s\S]*?label: "Decision support"[\s\S]*?label: "Support evidence"[\s\S]*?label: "Trade evidence"[\s\S]*?Portable evidence summary[\s\S]*?public evidence summary[\s\S]*?Which evidence question should stay in TrustSlip[\s\S]*?fuller evidence record/,
  "TrustSlip holder page must keep evidence-summary and decision-support language visible."
);
assertContains(
  "decisionPacks",
  /export const GSN_DECISION_PACKS[\s\S]*?Community Standing Decision Pack[\s\S]*?Referral Decision Pack[\s\S]*?Guarantor or Support Decision Pack[\s\S]*?Employment Decision Pack[\s\S]*?Housing Decision Pack[\s\S]*?Trade or Skilled Work Decision Pack[\s\S]*?Supplier Decision Pack[\s\S]*?Volunteer Decision Pack[\s\S]*?Business Partnership Decision Pack[\s\S]*?Community Membership Decision Pack[\s\S]*?normalizeDecisionPackPublicContext/,
  "Decision Pack catalog must stay in the shared frontend contract, not hidden inside one page."
);
assertContains(
  "trustSlip",
  /GSN_DECISION_PACKS[\s\S]*?Decision Pack selection[\s\S]*?Each pack is a focused view of the same evidence[\s\S]*?does not remove risk or make the decision for the recipient/,
  "TrustSlip holder page must frame share preparation as a broad Decision Pack catalog, not generic purpose labels or automatic decisions."
);
assertContains(
  "trustSlip",
  /data-gsn-trustslip-purpose-mobile-select="true"[\s\S]*?<select[\s\S]*?value=\{selectedTrustSlipPurpose\}[\s\S]*?setSelectedTrustSlipPurpose\(event\.target\.value as DecisionPackKey\)[\s\S]*?fontSize: 16[\s\S]*?GSN_DECISION_PACKS\.map\(\(option\) => \([\s\S]*?<option key=\{option\.key\} value=\{option\.key\}>[\s\S]*?\{option\.label\}[\s\S]*?data-gsn-trustslip-purpose-selected-summary="true"[\s\S]*?\{selectedPurposeOption\.label\}[\s\S]*?\{selectedPurposeOption\.recipientQuestion\}[\s\S]*?\{selectedPurposeOption\.focus\}[\s\S]*?data-gsn-trustslip-purpose-desktop-buttons="true"[\s\S]*?GSN_DECISION_PACKS\.map/,
  "TrustSlip holder mobile Decision Pack selection must use one menu with the selected-pack summary instead of exposing every pack as mobile buttons."
);
assertContains(
  "trustSlip",
  /const decisionPackBoundaryRows = \[[\s\S]*?label: "Public link"[\s\S]*?Selected question, evidence focus, and public verify link only[\s\S]*?label: "Private preview"[\s\S]*?not a public evidence paper, score, approval, guarantee, or payment instruction[\s\S]*?label: "Consent log"[\s\S]*?does not store recipient identity, copied text, raw TrustEvents[\s\S]*?label: "Final decision"[\s\S]*?does not remove risk or make the decision for the recipient[\s\S]*?data-gsn-trustslip-decision-boundary="compact"[\s\S]*?Decision Boundary[\s\S]*?decisionPackBoundaryRows\.map/,
  "TrustSlip holder Decision Pack area must compress repeated public/private/consent limitations into one compact Decision Boundary box."
);
assertContains(
  "trustSlip",
  /withPublicDecisionPackQuery[\s\S]*?decision_pack: selectedPurposeOption\.key[\s\S]*?access_purpose: selectedPurposeOption\.label[\s\S]*?recipient_question: selectedPurposeOption\.recipientQuestion[\s\S]*?decision_focus: selectedPurposeOption\.focus[\s\S]*?const verifyPath = useMemo[\s\S]*?withPublicDecisionPackQuery\(basePath, publicDecisionPackQuery\)/,
  "TrustSlip holder verify links and QR must carry the selected public Decision Pack context."
);
assertContains(
  "trustSlip",
  /buildPublicDecisionPackShareText[\s\S]*?GSN public Decision Pack link[\s\S]*?selectedPurposeOption\.label[\s\S]*?selectedPurposeOption\.recipientQuestion[\s\S]*?selectedPurposeOption\.focus[\s\S]*?Public TrustSlip check: \$\{verifyUrl\}[\s\S]*?reduces uncertainty[\s\S]*?does not expose private Trust Passport contents[\s\S]*?does not make the decision/,
  "TrustSlip holder public Decision Pack share note must copy only public decision-support context."
);

assertContains(
  "trustSlip",
  /data-gsn-trustslip-decision-boundary="compact"[\s\S]*?data-gsn-public-decision-pack-share="holder"[\s\S]*?Public Decision Pack link[\s\S]*?Share the selected public evidence lens[\s\S]*?Copies the selected Decision Pack question, evidence focus, and public verify link only[\s\S]*?debugId="trust-slip\.public-decision-pack\.copy-note"[\s\S]*?Copy pack note[\s\S]*?debugId="trust-slip\.public-decision-pack\.open"[\s\S]*?Open public pack/,
  "TrustSlip holder page must expose a selected public Decision Pack link after the compact Decision Boundary without repeating private Passport or approval caveats as a separate footnote."
);

assertContains(
  "api",
  /getMyTrustSlipDecisionPackAccesses[\s\S]*?\/trust-slips\/me\/decision-pack-accesses/,
  "TrustSlip holder page must use the signed-in holder Decision Pack access endpoint, not a public or admin feed."
);

assertContains(
  "api",
  /getMyTrustSlipDecisionPackEvidence[\s\S]*?\/trust-slips\/me\/decision-pack-evidence/,
  "TrustSlip holder page must use the signed-in holder private Decision Pack evidence endpoint."
);

assertContains(
  "trustSlip",
  /getMyTrustSlipDecisionPackEvidence[\s\S]*?selectedPurposeOption\.key[\s\S]*?normalizeTrustSlipDecisionPackEvidence/,
  "TrustSlip holder page must fetch the private evidence preview from the selected Decision Pack, not from public verify data."
);

assertContains(
  "trustSlip",
  /const decisionPackBoundaryRows = \[[\s\S]*?Private preview[\s\S]*?not a public evidence paper[\s\S]*?score[\s\S]*?approval[\s\S]*?guarantee[\s\S]*?payment instruction[\s\S]*?Consent log[\s\S]*?does not store recipient identity[\s\S]*?copied text[\s\S]*?raw TrustEvents[\s\S]*?data-gsn-trustslip-decision-boundary="compact"[\s\S]*?decisionPackBoundaryRows\.map[\s\S]*?data-gsn-holder-private-decision-pack-evidence="true"[\s\S]*?Private holder preview[\s\S]*?Evidence behind this Decision Pack/,
  "TrustSlip holder private evidence preview must rely on the compact Decision Boundary for holder-only, non-score, non-approval, and consent-storage limits."
);

assertContains(
  "trustSlip",
  /buildDecisionPackConsentShareText[\s\S]*?GSN Decision Pack holder consent summary[\s\S]*?Shared by holder consent from a private preview[\s\S]*?live community confirmation[\s\S]*?Not a public evidence paper, score, approval, guarantee, payment instruction, raw event timeline, or private note disclosure[\s\S]*?records only that the holder copied\/exported[\s\S]*?does not store recipient identity[\s\S]*?copied text[\s\S]*?raw TrustEvents/,
  "TrustSlip holder consent summary must copy bounded evidence language and marker-only storage limits, not approval or raw private records."
);

assertContains(
  "trustSlip",
  /buildDecisionPackConsentExportText[\s\S]*?gsn_decision_pack_holder_consent_summary[\s\S]*?evidence_categories[\s\S]*?event_refs[\s\S]*?label: eventRef\.label[\s\S]*?scope: eventRef\.scope[\s\S]*?consent_boundary[\s\S]*?raw event timeline, or private note disclosure[\s\S]*?records only the holder copy\/export marker[\s\S]*?does not store recipient identity[\s\S]*?copied text[\s\S]*?raw TrustEvents/,
  "TrustSlip holder safe JSON export must include scrubbed event references only and carry the marker-only consent boundary."
);

assertContains(
  "trustSlip",
  /const decisionPackBoundaryRows = \[[\s\S]*?Copy\/export records a holder consent marker only[\s\S]*?data-gsn-trustslip-decision-boundary="compact"[\s\S]*?decisionPackBoundaryRows\.map[\s\S]*?data-gsn-holder-private-decision-pack-evidence="true"[\s\S]*?data-gsn-decision-pack-consent-export="holder"[\s\S]*?debugId="trust-slip\.private-decision-pack\.copy-summary"[\s\S]*?Copy consent summary[\s\S]*?debugId="trust-slip\.private-decision-pack\.copy-json"[\s\S]*?Copy safe JSON/,
  "TrustSlip holder private Decision Pack preview must show marker-only consent storage in the compact Decision Boundary before explicit consent-copy controls."
);
assertContains(
  "api",
  /recordMyTrustSlipDecisionPackConsentShare[\s\S]*?\/trust-slips\/me\/decision-pack-consent-shares[\s\S]*?decision_pack[\s\S]*?export_format[\s\S]*?category_count[\s\S]*?event_ref_count/,
  "TrustSlip holder consent-copy controls must record a bounded holder consent-share audit marker."
);

assertContains(
  "trustSlip",
  /async function handleCopy[\s\S]*?Promise<boolean>[\s\S]*?return false[\s\S]*?return copied[\s\S]*?recordDecisionPackConsentShare[\s\S]*?api\.recordMyTrustSlipDecisionPackConsentShare[\s\S]*?category_count: rows\.length[\s\S]*?event_ref_count: eventRefCount[\s\S]*?if \(copied\)[\s\S]*?recordDecisionPackConsentShare\("summary"\)[\s\S]*?if \(copied\)[\s\S]*?recordDecisionPackConsentShare\("json"\)/,
  "TrustSlip holder consent-share audit marker must be recorded only after copy succeeds and must store counts, not copied text."
);

assertContains(
  "backendBoundaryTests",
  /test_holder_consent_share_unknown_export_format_falls_back_to_summary_without_extra_records[\s\S]*?"export_format": "recipient_pdf"[\s\S]*?item\["export_format"\] == "summary"[\s\S]*?"recipient_pdf" not in str\(payload\)[\s\S]*?row\.export_format == "summary"[\s\S]*?TrustSlipDecisionPackAccess\)\.count\(\) == 0[\s\S]*?TrustEvent\)\.count\(\) == 0/,
  "Backend consent-share tests must prove unknown export formats are normalized to summary without public access rows or TrustEvents."
);

assertContains(
  "api",
  /getMyTrustSlipDecisionPackConsentShares[\s\S]*?\/trust-slips\/me\/decision-pack-consent-shares[\s\S]*?"GET"/,
  "TrustSlip holder page must be able to read bounded holder consent-share history."
);

assertContains(
  "trustSlip",
  /getMyTrustSlipDecisionPackConsentShares[\s\S]*?normalizeTrustSlipDecisionPackConsentShares[\s\S]*?setDecisionPackConsentShares/,
  "TrustSlip holder page must load and apply sanitized consent-share history."
);

assertContains(
  "trustSlip",
  /recordDecisionPackConsentShare[\s\S]*?const result = await api\.recordMyTrustSlipDecisionPackConsentShare[\s\S]*?normalizeTrustSlipDecisionPackConsentShares[\s\S]*?setDecisionPackConsentShares/,
  "TrustSlip holder consent-share copy action must update the local ledger from the sanitized backend row."
);

assertContains(
  "trustSlip",
  /data-gsn-decision-pack-consent-share-ledger="holder"[\s\S]*?Recent consent exports[\s\S]*?Holder copy\/export audit trail[\s\S]*?No private Decision Pack exports are recorded yet[\s\S]*?Consent-share history records holder copy\/export markers only[\s\S]*?not public-read evidence[\s\S]*?recipient identity[\s\S]*?copied text[\s\S]*?raw TrustEvent history/,
  "TrustSlip holder page must show consent-share history without turning it into recipient identity, copied text, or raw TrustEvent disclosure."
);

assertContains(
  "trustSlip",
  /data-gsn-decision-pack-access-ledger="holder"[\s\S]*?Recent public reads[\s\S]*?Decision Pack access ledger[\s\S]*?Access records show public read context only[\s\S]*?not TrustEvents[\s\S]*?recipient identity[\s\S]*?private Passport disclosure/,
  "TrustSlip holder page must show recent Decision Pack accesses as bounded public-read context only."
);

assertContains(
  "communityProofPanel",
  /data-gsn-community-proof-layer="true"[\s\S]*?data-gsn-community-proof-item=\{item.key\}[\s\S]*?EvidenceMeter/,
  "CommunityProofPanel must expose the reusable proof layer and decision-boundary item."
);

assertContains(
  "communityProof",
  /Known by community[\s\S]*?Member witness[\s\S]*?Evidence currentness[\s\S]*?Decision boundary[\s\S]*?not government ID, payment approval, credit approval, or a guarantee of future behaviour/,
  "Community proof helper must keep portable proof and non-ID/non-approval boundary language."
);

assertContains(
  "trustSlip",
  /Privacy boundary[\s\S]*?short portable summary[\s\S]*?does not expose the holder's private Trust Passport, private notes, contacts, or admin records/,
  "TrustSlip holder security panel must explicitly protect the private Trust Passport and private records."
);

assertContains(
  "trustSlip",
  /const trustSlipHolderConfirmsList = \[[\s\S]*?Holder display name and GSN ID shown on this TrustSlip[\s\S]*?Current TrustSlip status, code, issue window, and expiry window where available[\s\S]*?QR, verify action, and copied verify link open the public TrustSlip reading when available[\s\S]*?\];/,
  "TrustSlip holder confirms list must keep holder identity, validity window, and public verify path boundaries."
);

assertContains(
  "trustSlip",
  /const trustSlipHolderDoesNotConfirmList = \[[\s\S]*?Bank approval, credit approval, payment movement, or escrow[\s\S]*?Authority to release goods, money, credit, or services[\s\S]*?Private Trust Passport history, private notes, private contacts, or admin records[\s\S]*?\];/,
  "TrustSlip holder does-not-confirm list must block payment/release authority and private Passport exposure."
);

assertContains(
  "trustSlip",
  /<TrustSlipReaderBlock[\s\S]*?memberCredentialPath=\{memberCredentialPath\}/,
  "TrustSlip holder page must keep the reader block and scoped member credential path."
);

assertContains(
  "reader",
  /TrustSlip reader block[\s\S]*?Use this TrustSlip as evidence[\s\S]*?should not make the decision for you/,
  "TrustSlip reader block must keep decision-support language."
);

assertContains(
  "reader",
  /Private verifier names are not exposed here[\s\S]*?Evidence currentness:/,
  "TrustSlip reader block must keep private verifier and currentness boundaries."
);

assertContains(
  "reader",
  /Read this as evidence, not automatic approval[\s\S]*?ask for the full Trust Passport or direct community confirmation/,
  "TrustSlip reader block must keep non-approval guidance and escalation to Passport/community confirmation."
);

assertOrder(
  "trustPassport",
  [
    { label: "open holder TrustSlip", pattern: /debugId="trust-score\.open-trust-slip"[\s\S]*?Open TrustSlip/ },
    { label: "open public verify", pattern: /debugId="trust-score\.verify"[\s\S]*?Open TrustSlip verify/ },
  ],
  "Trust Passport shareable tools must keep holder TrustSlip and public verify as separate actions."
);

assertLineAbsent(
  "trustSlip",
  /data-gsn-trust-document-certificate="trust-passport"/,
  "TrustSlip holder page must not render itself as the full Trust Passport certificate."
);

assertLineAbsent(
  "trustPassport",
  /data-gsn-trust-document-certificate="trustslip-holder"/,
  "Trust Passport page must not render itself as the TrustSlip holder certificate."
);

assertContains(
  "package",
  /"audit:trust-passport-trustslip-boundary": "node tools\/audit-trust-passport-trustslip-boundary\.mjs"/,
  "Trust Passport / TrustSlip boundary audit must stay registered in package scripts."
);

if (findings.length > 0) {
  console.error("Trust Passport / TrustSlip boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Trust Passport / TrustSlip boundary audit passed: /app/trust remains the fuller private Passport, /app/trust-slip remains holder-controlled portable evidence, public verify stays unauthenticated, and bank/payment/release/private-record overclaims are caged."
);
