/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
  disclosure: "src/components/TrustDocumentLanguage.tsx",
  recipientEnvelope: "src/pages/trustSlipVerify/TrustSlipRecipientEnvelope.tsx",
  routePage: "src/pages/TrustSlipVerifyPage.tsx",
  app: "src/App.tsx",
  api: "src/lib/api.ts",
  profileImage: "src/lib/profileImage.ts",
  package: "package.json",
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
    cursor = cursor + 1 + match.index + match[0].length;
    seen.push(item.label);
  }
}

assertContains(
  "package",
  /"audit:public-trustslip-first-viewport": "node tools\/audit-public-trustslip-first-viewport\.mjs"/,
  "package.json must expose the named public TrustSlip first-viewport audit."
);

assertOrder(
  "publicPaper",
  [
    { label: "public TrustSlip hero", pattern: /<header style=\{publicVerifyHero\(compact\)\}>[\s\S]*?Public TrustSlip/ },
    { label: "decision first answer", pattern: /data-gsn-public-decision-first="one-answer-four-facts"/ },
    { label: "decision evidence translation", pattern: /data-gsn-public-evidence-translation="decision-why"/ },
    { label: "visible evidence snapshot", pattern: /data-gsn-public-decision-evidence-snapshot="visible-public-safe-answers"/ },
    { label: "desktop quick facts", pattern: /data-gsn-public-decision-first-facts="four-quick-facts"/ },
    { label: "compact decision boundary", pattern: /data-gsn-public-decision-boundary="compact"/ },
    { label: "decision reading", pattern: /data-debug-id="trust-slip-verify\.public\.decision-pack-reading"/ },
    { label: "decision evidence details", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="Evidence details"/ },
    { label: "decision profile cage", pattern: /data-gsn-decision-pack-profile="public-purpose-filter"/ },
    { label: "official record details disclosure", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="Official record details"/ },
    { label: "more details cage", pattern: /data-gsn-public-more-details="authority-evidence-limits"/ },
    { label: "authority strip", pattern: /<TrustPaperAuthorityStrip/ },
    { label: "confidence ribbon", pattern: /<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>/ },
    { label: "community evidence checked", pattern: /<CommunityProofPanel[\s\S]*?title="Community evidence checked"/ },
    { label: "security disclosure", pattern: /<TrustDocumentDisclosureSection[\s\S]*?title="What this cannot prove"/ },
  ],
  "Public TrustSlip first viewport must lead with recipient decision, immediate evidence translation, and collapsed supporting proof before heavier security disclosure."
);

assertContains(
  "publicPaper",
  /<TrustDocumentDisclosureSection[\s\S]*?title="Official record details"[\s\S]*?summary="Open for community evidence, record checks, security, and limits\."[\s\S]*?debugId="trust-document\.section\.audit-details"[\s\S]*?data-gsn-public-more-details="authority-evidence-limits"[\s\S]*?<TrustPaperAuthorityStrip[\s\S]*?<TrustDocumentConfidenceRibbon items=\{trustSlipConfidenceRibbonItems\} \/>[\s\S]*?<CommunityProofPanel[\s\S]*?title="Community evidence checked"[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="What this cannot prove"/,
  "Public TrustSlip heavier authority, community-evidence, security, and limit layers must live behind one official-record disclosure while preserving its stable action ID."
);

assertContains(
  "publicPaper",
  /function publicVerifyHero\(compact: boolean\): React\.CSSProperties \{[\s\S]*?gridTemplateColumns: compact \? "minmax\(0, 1fr\)" : "190px minmax\(0, 1fr\)"[\s\S]*?minHeight: compact \? "auto" : 220[\s\S]*?padding: compact \? "12px 14px 18px" : "34px 44px 42px"/,
  "Public verify hero must keep a bounded mobile first viewport and the institutional desktop composition."
);

assertContains(
  "publicPaper",
  /Public TrustSlip[\s\S]*?fontSize: compact \? 26 : 58[\s\S]*?Check this TrustSlip[\s\S]*?display: compact \? "none" : "block"[\s\S]*?See what this record supports and what to check next\./,
  "Public verify hero must keep the phone title compact and hide the redundant subtitle while preserving desktop framing."
);

assertContains(
  "recipientEnvelope",
  /data-gsn-trustslip-recipient-envelope="sealed"[\s\S]*?A TrustSlip has arrived[\s\S]*?shared a community evidence certificate with you\.[\s\S]*?data-gsn-trustslip-envelope-object="closed"[\s\S]*?Recipient copy[\s\S]*?debugId="trust-slip-verify\.public\.open-envelope"[\s\S]*?Open TrustSlip[\s\S]*?Opens the certificate report\./,
  "The recipient surface must appear as a sealed TrustSlip envelope with one clear Open action before the certificate report."
);

assertContains(
  "recipientEnvelope",
  /<PrimaryButton[\s\S]*?fullWidth[\s\S]*?debugId="trust-slip-verify\.public\.open-envelope"[\s\S]*?onClick=\{onOpen\}[\s\S]*?>[\s\S]*?Open TrustSlip[\s\S]*?<\/PrimaryButton>/,
  "The sealed recipient envelope must expose one stable primary action."
);

assertContains(
  "routePage",
  /const \[recipientEnvelopeOpened, setRecipientEnvelopeOpened\] = useState\(false\)[\s\S]*?if \(!isAppRoute\) setRecipientEnvelopeOpened\(false\)[\s\S]*?const showRecipientEnvelope =[\s\S]*?!isAppRoute[\s\S]*?!isCardRoute[\s\S]*?!noPublicCodeSupplied[\s\S]*?!publicVerifyEndpointErrorCopy[\s\S]*?!recipientEnvelopeOpened[\s\S]*?showRecipientEnvelope \? \([\s\S]*?<TrustSlipRecipientEnvelope[\s\S]*?onOpen=\{\(\) => setRecipientEnvelopeOpened\(true\)\}[\s\S]*?: \([\s\S]*?<React\.Suspense/,
  "Public receiver links must show the envelope before the certificate, while authenticated and card-only routes bypass that gate."
);

assertContains(
  "routePage",
  /noPublicCodeSupplied \|\| publicVerifyEndpointErrorCopy \|\| showRecipientEnvelope \|\| isLiteRoute \|\| isCardRoute \? null : <TrustSlipVerifyBoundary/,
  "Supporting boundary content must remain hidden while the recipient envelope is still sealed."
);

assertContains(
  "publicPaper",
  /const supportPurpose = \/guarantor\|guarantee\|support\/i\.test\(decisionPackPurpose\)[\s\S]*?const tradePurpose = \/trade\|supplier\|skilled\|market\/i\.test\(decisionPackPurpose\)[\s\S]*?const decisionFirstAnswer = !validNow[\s\S]*?const decisionFirstFacts:[\s\S]*?label: "Who\?"[\s\S]*?label: "Next step"[\s\S]*?const decisionBoundaryRows:[\s\S]*?\["Final decision", "Yours"\][\s\S]*?const purposeEvidenceExists = visibleEvidenceAreaCount > 0[\s\S]*?const decisionDisplayAnswer = tradePurpose \? tradeEvidenceReading\.headline : purposeDecisionReading\.headline \|\| decisionFirstAnswer[\s\S]*?const decisionReasonLine = tradePurpose \? tradeEvidenceReading\.summary : purposeDecisionReading\.conclusion[\s\S]*?const certificateDecisionAnswer = encouragingCertificateHeadline[\s\S]*?const certificateSupportLine = validNow[\s\S]*?const certificateScopeLine = `Community evidence recorded for \$\{decisionPackPurpose\} in \$\{communityLabel\}\.`[\s\S]*?const decisionTranslationRows: Array<\[string, string\]> = \[[\s\S]*?\["Next check", recommendedActionFinding\][\s\S]*?const quickDecisionFacts = \[[\s\S]*?label: "Next check"/,
  "Public TrustSlip paper must compute a bounded answer, an encouraging certificate reading, a neutral scope line, and detailed next-check guidance before rendering."
);


assertContains(
  "publicPaper",
  /function DecisionFactorTable[\s\S]*?gridTemplateColumns: compact[\s\S]*?\? "1fr"[\s\S]*?fontSize: compact \? 12\.2 : 13[\s\S]*?fontWeight: 930/,
  "Decision factor rows must stack on phone so institutional text does not squeeze into narrow columns."
);

assertContains(
  "publicPaper",
  /function paperDataRow\(compact = false\): React\.CSSProperties \{[\s\S]*?gridTemplateColumns: compact \? "1fr" : "minmax\(0, 1fr\) auto"[\s\S]*?alignItems: compact \? "start" : "center"[\s\S]*?textAlign: compact \? "left" : "right"[\s\S]*?justifySelf: compact \? "start" : "end"[\s\S]*?fontSize: compact \? 13 : undefined/,
  "Opened detail rows must stack label and value on phone so official record text stays mature and readable."
);

assertContains(
  "publicPaper",
  /gridTemplateColumns: compact \? "1fr" : "1fr 1fr"[\s\S]*?Community confidence/,
  "Opened verification paper status facts must stack on phone."
);
assertContains(
  "publicPaper",
  /gridTemplateColumns: compact \? "1fr" : "1fr 92px"[\s\S]*?Public link:/,
  "Opened verification paper QR and public-link row must stack on phone."
);

assertContains(
  "publicPaper",
  /DecisionFactorTable rows=\{compact \? decisionTranslationRows\.filter\(\(\[label\]\) => label === "Reason 1" \|\| label === "Reason 2"\) : decisionTranslationRows\}/,
  "Public TrustSlip phone first viewport must show only the immediate because rows before the visible evidence snapshot and deeper evidence drawer."
);

assertContains(
  "publicPaper",
  /title=\{decisionPackPurpose\}[\s\S]*?summary="Open for evidence related to this decision, its source, next check, and limits\."[\s\S]*?defaultOpen=\{!compact\}[\s\S]*?data-debug-id="trust-slip-verify\.public\.decision-pack-reading"/,
  "Decision Pack detail must be a closed phone drawer and an open desktop section."
);

assertContains(
  "publicPaper",
  /title="Verification paper details"[\s\S]*?summary="Open for holder, public reading, community evidence, QR, and confirmation request\."[\s\S]*?defaultOpen=\{!compact\}[\s\S]*?publicVerifyShell\("#F8FBFF", compact\)/,
  "Legacy verification paper details must sit behind a phone drawer instead of exposing the whole paper at once."
);
assertContains(
  "routePage",
  /const isLiteRoute =[\s\S]*?endsWith\("\/lite"\)[\s\S]*?noPublicCodeSupplied \|\| publicVerifyEndpointErrorCopy \|\| showRecipientEnvelope \|\| isLiteRoute \|\| isCardRoute \? null : <TrustSlipVerifyBoundary compact=\{isCompact\} \/>/,
  "The public lite TrustSlip route must open as a focused card/paper without the extra boundary support section."
);

assertContains(
  "publicPaper",
  /const isLite = variant === "lite"[\s\S]*?!isLite \? publicActions : null/,
  "The public lite TrustSlip paper must not expose the extra public action block under the card."
);
assertContains(
  "app",
  /<Route path="\/t\/:code\/card" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/trust-slips\/verify\/:code\/card" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "The public route table must include a card-only TrustSlip identity route for live QR checks."
);

assertContains(
  "routePage",
  /const isCardRoute =[\s\S]*?endsWith\("\/card"\)[\s\S]*?variant=\{isCardRoute \? "card" : isLiteRoute \? "lite" : "full"\}[\s\S]*?noPublicCodeSupplied \|\| publicVerifyEndpointErrorCopy \|\| showRecipientEnvelope \|\| isLiteRoute \|\| isCardRoute \? null : <TrustSlipVerifyBoundary compact=\{isCompact\} \/>/,
  "The TrustSlip verify page must render /card as a focused card-only public view without the extra boundary support section."
);

assertContains(
  "publicPaper",
  /variant\?: "full" \| "lite" \| "card"[\s\S]*?const isCard = variant === "card"[\s\S]*?data-gsn-public-identity-card-only="true"/,
  "The public paper must support a card-only public identity surface."
);

assertContains(
  "publicPaper",
  /data-gsn-public-identity-card-only="true"[\s\S]*?profileImageUrl[\s\S]*?alt=\{`\$\{holderName\} public GSN identity`\}/,
  "The card-only public identity surface must render the holder photo when a public profile image is available."
);

assertContains(
  "publicPaper",
  /const publicVerifyUrl =[\s\S]*?\/card` : "";[\s\S]*?<QRCodeSVG\s+value=\{publicVerifyUrl\}[\s\S]*?Live ID card/,
  "The card-only public identity surface must show a live-card QR/link that opens this same improved card route."
);
assertContains(
  "publicPaper",
  /const roleMix = roleMixLabel\(communityConfirmationOptions, holderRole\)[\s\S]*?const linkedCommunityFootprint =[\s\S]*?activeCommunityCountLabel[\s\S]*?roleMix[\s\S]*?label: "Linked communities"/,
  "The card-only public identity surface must show aggregate linked community and role counts without exposing community names."
);

assertContains(
  "publicPaper",
  /label: "Phone"[\s\S]*?label: "ID document"[\s\S]*?label: "Photo"[\s\S]*?label: "Bank \/ wallet"[\s\S]*?label: "Linked communities"/,
  "The card-only public identity surface must show truthful identity evidence facts before deeper verification."
);

assertNotContains(
  "publicPaper",
  /label: "Community",\s*value: communityLabel/,
  "The card-only public identity card must not expose a named community tile. Use aggregate linked-community and role counts instead."
);

assertNotContains(
  "publicPaper",
  /label: "Role",\s*value: holderRoleLabel/,
  "The card-only public identity card must not expose only the primary community role. Use aggregate role counts instead."
);

assertContains(
  "publicPaper",
  /data-gsn-trustslip-certificate="public-evidence-record"[\s\S]*?data-gsn-public-decision-first="one-answer-four-facts"[\s\S]*?What this record says[\s\S]*?\{compact \? certificateDecisionAnswer : decisionDisplayAnswer\}[\s\S]*?\{compact \? certificateSupportLine : decisionReasonLine\}[\s\S]*?data-gsn-trustslip-certificate-facts="true"[\s\S]*?\["Holder", holderName\][\s\S]*?\["Community", communityLabel\][\s\S]*?\["Record", resolvedCode \|\| "Current TrustSlip"\][\s\S]*?\["Status", publicValidityLabel\][\s\S]*?data-gsn-public-evidence-translation="decision-why"[\s\S]*?display: compact \? "none" : "grid"[\s\S]*?title="Explore this TrustSlip"[\s\S]*?debugId="trust-document\.section\.full-evidence-and-record-details"[\s\S]*?data-gsn-public-mobile-full-evidence="section-chooser"[\s\S]*?data-gsn-public-decision-support="meaning-next-action"[\s\S]*?data-gsn-public-decision-boundary="compact"[\s\S]*?\{compact \? "Scope of this record" : "Limits of this check"\}[\s\S]*?\{certificateScopeLine\}/,
  "Public TrustSlip phone viewport must render an encouraging certificate answer, four identity facts, a closed section chooser, one next action, and only a neutral scope line."
);
assertContains(
  "publicPaper",
  /data-gsn-public-reader-confirmation-options="membership-community-witness"[\s\S]*?Choose your next check[\s\S]*?Confirm membership[\s\S]*?debugId="trust-slip-verify\.public\.confirm-membership-first-view"[\s\S]*?debugId="trust-slip-verify\.public\.confirm-membership-unavailable"[\s\S]*?Ask community[\s\S]*?debugId="trust-slip-verify\.public\.request-confirmation-first-view"[\s\S]*?Review witnesses[\s\S]*?debugId="trust-slip-verify\.public\.review-witness-evidence-first-view"[\s\S]*?id="trust-slip-verify-community-known-as"/,
  "Public TrustSlip first viewport must protect the three reader confirmation choices: membership credential, scoped community answer, and witness/activity evidence review."
);

assertContains(
  "publicPaper",
  /data-gsn-public-decision-evidence-snapshot="visible-public-safe-answers"[\s\S]*?display: compact \? "none" : "grid"[\s\S]*?\{!compact \? \([\s\S]*?<TrustSlipEvidencePatternStack[\s\S]*?title="Explore this TrustSlip"[\s\S]*?data-gsn-public-mobile-full-evidence="section-chooser"[\s\S]*?title="Recorded pattern"[\s\S]*?<TrustSlipEvidencePatternStack/,
  "Public TrustSlip phone view must hide duplicate evidence and put the recorded pattern behind its own chooser item."
);

assertContains(
  "publicPaper",
  /\{compact \? "Next step" : "Choose your next check"\}[\s\S]*?display: compact \? "none" : "block"[\s\S]*?data-gsn-public-phone-primary-action="one-next-step"[\s\S]*?communityPulseAvailable && canRequestCommunityPulse[\s\S]*?Ask community[\s\S]*?memberCredentialPath[\s\S]*?Check membership[\s\S]*?Read evidence/,
  "Public TrustSlip phone view must hide the long action explanation and choose one useful next action."
);

assertNotContains(
  "routePage",
  /trust-slip-verify\.hero\.(welcome|guide)/,
  "The public code-entry surface must not expose unrelated Welcome or guide buttons."
);

assertContains(
  "routePage",
  /Check a TrustSlip[\s\S]*?Enter the code to check this TrustSlip\.[\s\S]*?Type the code shown on the TrustSlip\.[\s\S]*?Check code[\s\S]*?Private Trust Passport details stay hidden\./,
  "The public code-entry surface must keep one field, one primary action, and one short privacy boundary."
);

assertNotContains(
  "routePage",
  /Check a TrustSlip[\s\S]*?Check a TrustSlip/,
  "The public code-entry surface must not repeat its heading."
);



assertContains(
  "publicPaper",
  /function PublicReadingTile[\s\S]*?if \(compact\)[\s\S]*?data-gsn-public-reading-tile-density="compact"[\s\S]*?padding: 8[\s\S]*?minHeight: 84[\s\S]*?gridTemplateColumns: "32px minmax\(0, 1fr\)"[\s\S]*?fontSize: 10\.5[\s\S]*?return \([\s\S]*?minHeight: 132/,
  "Public reading tiles must keep compact phone density while preserving the larger desktop rhythm."
);

assertContains(
  "publicPaper",
  /title="Explore this TrustSlip"[\s\S]*?summary="Choose one section at a time\."[\s\S]*?data-gsn-public-mobile-full-evidence="section-chooser"[\s\S]*?title="Why this result"[\s\S]*?debugId="trust-document\.section\.certificate-why"[\s\S]*?title="Evidence summary"[\s\S]*?debugId="trust-document\.section\.certificate-evidence"[\s\S]*?title="Source and date"[\s\S]*?debugId="trust-document\.section\.certificate-source"[\s\S]*?title="Recorded pattern"[\s\S]*?debugId="trust-document\.section\.certificate-pattern"[\s\S]*?title="Scope & limits"[\s\S]*?debugId="trust-document\.section\.certificate-scope"/,
  "The mobile certificate must reveal a chooser first and keep why, evidence, source, pattern, and limits in separate disclosures."
);

assertContains(
  "publicPaper",
  /debugId="trust-document\.section\.certificate-why"[\s\S]*?groupName="trustslip-certificate-detail-choice"[\s\S]*?debugId="trust-document\.section\.certificate-evidence"[\s\S]*?groupName="trustslip-certificate-detail-choice"[\s\S]*?debugId="trust-document\.section\.certificate-source"[\s\S]*?groupName="trustslip-certificate-detail-choice"[\s\S]*?debugId="trust-document\.section\.certificate-pattern"[\s\S]*?groupName="trustslip-certificate-detail-choice"[\s\S]*?debugId="trust-document\.section\.certificate-scope"[\s\S]*?groupName="trustslip-certificate-detail-choice"/,
  "Each certificate detail must belong to the same one-open-at-a-time disclosure group."
);

assertContains(
  "disclosure",
  /groupName\?: string[\s\S]*?data-gsn-trust-document-section-group=\{groupName\}[\s\S]*?onToggle=\{\(event\) => \{[\s\S]*?!groupName \|\| !event\.currentTarget\.open[\s\S]*?other\.dataset\.gsnTrustDocumentSectionGroup === groupName[\s\S]*?other\.open = false/,
  "Grouped Trust document disclosures must close their siblings when one section opens."
);

assertContains(
  "publicPaper",
  /title=\{decisionPackPurpose\}[\s\S]*?defaultOpen=\{!compact\}[\s\S]*?Evidence check[\s\S]*?What is shown and what to check next[\s\S]*?GSN shows evidence related to the selected decision first[\s\S]*?title="Purpose"[\s\S]*?rows=\{relevantEvidenceRows\}[\s\S]*?title="Relevant evidence"[\s\S]*?rows=\{primaryRelevantEvidenceRows\}[\s\S]*?title="What it means"[\s\S]*?rows=\{suggestionRows\}[\s\S]*?title="Source and date"[\s\S]*?rows=\{sourceFamilyRows\}[\s\S]*?title="What to check next"[\s\S]*?rows=\{nextCheckRows\}[\s\S]*?title="What this cannot prove"[\s\S]*?rows=\{limitationRows\}[\s\S]*?<TrustDocumentDisclosureSection[\s\S]*?title="Evidence details"[\s\S]*?summary="Open for source categories, aggregate pointers, gaps, and checks\."[\s\S]*?data-gsn-decision-pack-profile="public-purpose-filter"[\s\S]*?Source map[\s\S]*?Where can GSN point for this decision\?/,
  "Decision Pack reading must show purpose-specific evidence and bounded next-check guidance before source-map details stay collapsed."
);

assertNotContains(
  "publicPaper",
  /No recorded activity count is visible on this paper|The core activity signal is not visible yet|communityActivityMeaningRows|decisionPackEvidenceSummaryRows/,
  "Public TrustSlip recipient IA must not let generic community activity empty states override visible purpose-specific evidence."
);
assertContains(
  "api",
  /import \{ configuredPublicApiOrigin, isPrivateFrontendHost \} from "\.\/publicLinks";[\s\S]*?normalized === "\/api"[\s\S]*?hostname && !isPrivateFrontendHost\(hostname\)[\s\S]*?return configuredPublicApiOrigin\(\)[\s\S]*?TRUSTSLIP_VERIFY_MINIMAL_TIMEOUT_MS[\s\S]*?TRUSTSLIP_VERIFY_STANDARD_TIMEOUT_MS[\s\S]*?TRUSTSLIP_VERIFY_DETAILED_TIMEOUT_MS[\s\S]*?timeoutMs/,
  "Production frontend API calls must resolve relative /api to the public API origin and use scoped TrustSlip verification timeouts instead of one long public wait."
);

assertContains(
  "profileImage",
  /import \{ isPrivateFrontendHost, publicApiOrigin \} from "\.\/publicLinks";[\s\S]*?!hostname \|\| isPrivateFrontendHost\(hostname\)[\s\S]*?return origin[\s\S]*?return publicApiOrigin\(\)/,
  "Production public profile images returned as relative /uploads paths must resolve against the API origin, while local dev can keep the Vite proxy origin."
);

assertContains(
  "routePage",
  /getTrustSlipVerify[\s\S]*?getTrustSlipVerification[\s\S]*?getTrustSlipByCode[\s\S]*?getTrustSlipPublic[\s\S]*?getTrustSlipPublicByCode/,
  "Public TrustSlip loading must keep API fallback names after the canonical verifyTrustSlip call."
);
assertContains(
  "routePage",
  /verifyResult = await callFirstAvailable\([\s\S]*?\[\[codeToUse, "minimal"\], \[codeToUse\]\][\s\S]*?\);/,
  "Public TrustSlip loading must request the minimal TrustSlip reading first, while keeping the old code-only fallback so legacy verify functions do not call /verify/[object Object] or append object query params."
);
if (findings.length) {
  findings.forEach((finding) => {
    console.error(
      `[audit-public-trustslip-first-viewport] ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  });
  process.exit(1);
}

console.log("Public TrustSlip first-viewport contract passed.");
