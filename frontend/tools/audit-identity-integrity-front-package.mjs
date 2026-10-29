/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const pageFile = "src/pages/IdentityIntegrityPage.tsx";
const source = readFileSync(join(frontendRoot, pageFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message, text = "Expected pattern was not found.") {
  if (pattern.test(source)) return;
  findings.push({
    file: pageFile,
    line: 1,
    message,
    text,
  });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: pageFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

assertContains(
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";/,
  "Identity Integrity must use the shared GSN 3D icon bridge instead of legacy line or emoji-style marks."
);

assertContains(
  /data-identity-integrity-front-package="true"[\s\S]*?gridTemplateColumns: isCompact \? "76px minmax\(0, 1fr\)" : "104px minmax\(0, 1fr\)"/,
  "Identity Integrity front package must keep a compact phone header with a small photo anchor."
);

assertContains(
  /data-identity-integrity-fact-grid="true"[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(4, minmax\(0, 1fr\)\)"[\s\S]*?compactFactCard\(\)[\s\S]*?GsnLegacyIcon name=\{item\.icon\}/,
  "Identity Integrity front package must expose short identity facts in compact 3D icon-led mini cards."
);

assertContains(
  /function iconTile\([\s\S]*?width: 46[\s\S]*?height: 46[\s\S]*?borderRadius: 16[\s\S]*?boxShadow:/,
  "Identity Integrity icons must use strong route-local pictogram tiles, not faded inline marks."
);

assertContains(
  /function sectionIconHeader\([\s\S]*?icon: GsnIconName[\s\S]*?GsnLegacyIcon name=\{icon\} size=\{36\}/,
  "Identity Integrity secondary sections must keep strong 3D icon-led headers instead of text-only explanation blocks."
);

assertContains(
  /function defaultCollapseState\(\): CollapseState \{[\s\S]*?evidenceMeaning: true,[\s\S]*?summary: true,[\s\S]*?continuity: true,[\s\S]*?recovery: true,[\s\S]*?reasons: true,[\s\S]*?timeline: true,[\s\S]*?next: true/,
  "Identity Integrity evidence meaning, secondary readings, continuity, recovery, reasons, timeline, and next-step panels must stay collapsed by default."
);

assertContains(
  /const IDENTITY_PAGE_UI_STORAGE_KEY = "gmfn\.identityPage\.sections\.v4";/,
  "Identity Integrity must bump the section-state storage key when default exposure changes so old open layouts do not persist on pilot phones."
);
assertContains(
  /function decongestedSectionCard\([\s\S]*?padding: collapsed \? \(compact \? 12 : 14\) : compact \? 14 : 20[\s\S]*?boxShadow: collapsed/,
  "Identity Integrity collapsed secondary sections must render as slim rows, not full heavy cards."
);

assertContains(
  /evidenceMeaning: true,[\s\S]*?summary: true,[\s\S]*?continuity: true,[\s\S]*?recovery: true,[\s\S]*?reasons: true,[\s\S]*?timeline: true,[\s\S]*?next: true,[\s\S]*?guides: true/,
  "Identity Integrity evidence meaning, readings, recovery, timeline, next-step, and reference guides must stay closed by default."
);

assertContains(
  /data-identity-integrity-secondary-section="readings"[\s\S]*?decongestedSectionCard\(collapsed\.summary, isCompact\)[\s\S]*?data-identity-integrity-secondary-section="continuity"[\s\S]*?decongestedSectionCard\(collapsed\.continuity, isCompact\)[\s\S]*?data-identity-integrity-secondary-section="recovery"[\s\S]*?data-identity-integrity-secondary-section="reasons"[\s\S]*?data-identity-integrity-secondary-section="timeline"[\s\S]*?data-identity-integrity-secondary-section="next"/,
  "Identity Integrity secondary page material must stay inside decongested route-local section shells."
);

assertContains(
  /data-identity-integrity-secondary-section="evidence-meaning"[\s\S]*?decongestedSectionCard\(collapsed\.evidenceMeaning, isCompact\)[\s\S]*?Evidence meaning[\s\S]*?debugId="identity-integrity\.toggle-evidence-meaning"[\s\S]*?!collapsed\.evidenceMeaning[\s\S]*?RealLifeMeaningGuide[\s\S]*?getRealLifeTrustGuidance\("identity-evidence"\)/,
  "Identity Integrity real-life meaning guidance must be collapsed under Evidence meaning by default."
);

assertNotContains(
  /PageTopNav/,
  "Identity Integrity must not duplicate the app shell title and return path with a page-local navigation banner."
);

assertContains(
  /recommendedIdentityTaskKey[\s\S]*?identityTaskRows\.find\(\(item\) => item\.tone !== "ready"\)[\s\S]*?setActiveIdentityTask\(recommendedIdentityTaskKey\)[\s\S]*?data-identity-integrity-active-task="true"/,
  "Identity Integrity must surface the first incomplete evidence task as the recommended visible action."
);

assertContains(
  /data-identity-integrity-front-package="true"[\s\S]*?display: "flex"[\s\S]*?flexDirection: "column"[\s\S]*?\{identityHealthLabel\}[\s\S]*?GSN ID: \{gmfnId\}[\s\S]*?data-identity-integrity-tools="covered"[\s\S]*?order: 2[\s\S]*?debugId="identity-integrity\.tools\.toggle"[\s\S]*?More identity tools[\s\S]*?data-identity-integrity-active-task="true"/,
  "Identity Integrity must show only the compact identity header and recommended task before the visually ordered closed tools control."
);

assertContains(
  /data-identity-integrity-tools="covered"[\s\S]*?data-identity-integrity-tool-group="facts"[\s\S]*?debugId="identity-integrity\.tools\.facts"[\s\S]*?data-identity-integrity-tool-group="copy"[\s\S]*?debugId="identity-integrity\.tools\.copy"[\s\S]*?data-identity-integrity-tool-group="tasks"[\s\S]*?debugId="identity-integrity\.tools\.tasks"/,
  "More identity tools must reveal three independently opened rows instead of exposing every identity tool at once."
);

assertContains(
  /data-identity-integrity-details="covered"[\s\S]*?debugId="identity-integrity\.details\.toggle"[\s\S]*?More identity details[\s\S]*?data-identity-integrity-secondary-section="evidence-meaning"[\s\S]*?data-identity-integrity-secondary-section="readings"[\s\S]*?data-identity-integrity-secondary-section="guides"/,
  "All secondary Identity Integrity material must stay behind one closed master disclosure with independently closed section rows."
);
assertContains(
  /data-identity-integrity-secondary-section="guides"[\s\S]*?Evidence Guides[\s\S]*?debugId="identity-integrity\.toggle-guides"[\s\S]*?!collapsed\.guides[\s\S]*?data-identity-integrity-guide-stack="true"/,
  "Identity Integrity reference maps and guidance widgets must be covered by the Evidence Guides disclosure."
);

assertContains(
  /type TrustSlipRecord = \{[\s\S]*?bank_details_recorded\?: boolean \| null;[\s\S]*?identity_context\?: Record<string, any> \| null;[\s\S]*?function normalizeTrustSlipRecord[\s\S]*?src\?\.identity_context \|\| null/,
  "Identity Integrity must preserve TrustSlip identity context so recorded bank, phone, photo, and ID evidence are not thrown away before rendering."
);

assertNotContains(
  /classText: "Pending"/g,
  "Identity Integrity CCI/Open Trust fallbacks must not make uncalculated evidence look like a pending identity state."
);

assertContains(
  /classText: "Not shown yet"[\s\S]*?No cross-community consistency reading yet[\s\S]*?classText: "Not shown yet"[\s\S]*?Select a community to view local evidence[\s\S]*?classText: "Not shown yet"[\s\S]*?No local community reading yet/,
  "Identity Integrity CCI/Open Trust missing-reading states must use honest not-shown-yet language."
);
assertContains(
  /Local community evidence belongs to the community you are using right now[\s\S]*?Local community evidence reflects the record in your current community[\s\S]*?Local community evidence<\/div>/,
  "Identity Integrity local-reading fallback and visible label must use local evidence language."
);
assertNotContains(
  /Your trust position|trust strength|identity and trust signals|Local community trust shows|Local community trust belongs|Local community trust reflects|Local community trust<\/div>|local community trust|closest trust document surface|under the trust family|Trust Passport story|Which trust question should stay with identity first|trust changes|trust story/g,
  "Identity Integrity must frame identity and consistency as evidence, not trust-position or trust-story language."
);

assertContains(
  /visible identity and community evidence is steady[\s\S]*?identity and evidence signals[\s\S]*?Local community evidence shows your immediate community context[\s\S]*?closest evidence surface[\s\S]*?fuller Trust Passport evidence record[\s\S]*?Which evidence question should stay with identity first[\s\S]*?evidence changes[\s\S]*?evidence record/,
  "Identity Integrity must keep the visible identity/evidence framing."
);

assertContains(
  /const identityContext = trustSlip\?\.identity_context \|\| \{\};[\s\S]*?trustSlip\?\.bank_details_recorded[\s\S]*?identityContext\?\.bank_details_recorded[\s\S]*?trustSlip\?\.official_id_recorded[\s\S]*?identityContext\?\.official_id_recorded/,
  "Identity Integrity task readiness must read canonical TrustSlip identity evidence, not only /me fields and clan-filtered events."
);

assertContains(
  /linear-gradient\(180deg, #0B3E78 0%, #061827 100%\)[\s\S]*?linear-gradient\(180deg, #F8D56B 0%, #D6AA45 100%\)/,
  "Identity Integrity icon tiles must use strong navy and gold contrast surfaces."
);

assertContains(
  /function taskIconBadge[\s\S]*?width: 34[\s\S]*?height: 34[\s\S]*?transition: "none"[\s\S]*?taskIconBadge\(active, item\.tone\)[\s\S]*?GsnLegacyIcon name=\{item\.icon\} size=\{28\}/,
  "Identity Integrity task selector icons must stay fixed-size, large, dark, and badge-backed on phone."
);

assertContains(
  /data-identity-integrity-copy-actions="true"[\s\S]*?identityCopyActionStyle\(Boolean\(gmfnIdValue\), "primary"\)[\s\S]*?Copy GSN ID[\s\S]*?Not issued yet[\s\S]*?identityCopyActionStyle\(Boolean\(trustSlipCode\), "secondary"\)[\s\S]*?Copy TrustSlip[\s\S]*?identityCopyActionStyle\(true, "subtle"\)[\s\S]*?Copy snapshot/,
  "Identity Integrity copy actions must be clear aligned action tiles, not washed-out loose controls."
);

assertContains(
  /data-identity-integrity-task-switcher="true"[\s\S]*?marginTop: isCompact \? 14 : 16[\s\S]*?gridTemplateColumns: isCompact \? "repeat\(2, minmax\(0, 1fr\)\)" : "repeat\(5, minmax\(0, 1fr\)\)"[\s\S]*?\.\.\.identityPanelLock\(\)[\s\S]*?debugId=\{`identity-integrity\.task\.\$\{item\.key\}`\}[\s\S]*?\.\.\.identityPanelLock\(\)/,
  "Identity Integrity must keep the evidence tasks as compact SVG-led selectors, not a long exposed explanation stack."
);

assertContains(
  /data-identity-integrity-active-task="true"[\s\S]*?openIdentityTask\(activeTask\)[\s\S]*?debugId="identity-integrity\.active-task-action"/,
  "Identity Integrity front package must show one active task action with an explicit response."
);

assertNotContains(
  /debugId="identity-integrity\.front-trust-slip"/g,
  "Identity Integrity must not repeat TrustSlip as a permanent shortcut below a task that already owns the primary Open TrustSlip action."
);

assertContains(
  /debugId="identity-integrity\.toggle-continuity"[\s\S]*?debugId="identity-integrity\.toggle-recovery"[\s\S]*?activeIdentityTask === "recovery"[\s\S]*?recovery\.shouldVerify/,
  "Identity Integrity continuity and recovery panels must stay collapsible, while recovery opens for the active or required recovery task."
);

assertContains(
  /function identityRecoveryPanel\([\s\S]*?boxShadow:[\s\S]*?function identityRecoveryInput\([\s\S]*?outlineColor: "#0B63D1"[\s\S]*?function identityRecoveryActionStyle\([\s\S]*?linear-gradient\(180deg, #0B63D1 0%, #073E83 45%, #031E42 100%\)/,
  "Identity Integrity private recovery must use raised institutional panels, strong inputs, and dark primary actions instead of faded whitewashed controls."
);

assertContains(
  /data-identity-integrity-recovery-setup="true"[\s\S]*?onSubmit=\{handleRecoverySetup\}[\s\S]*?onClick=\{\(event\) => event\.stopPropagation\(\)\}[\s\S]*?debugId="identity-integrity\.recovery-save"[\s\S]*?identityRecoveryActionStyle\(\)[\s\S]*?Save private recovery/,
  "Identity Integrity recovery setup must stay on-page with explicit non-navigation submit behavior and a strong save action."
);

assertContains(
  /data-identity-integrity-recovery-verify="true"[\s\S]*?onSubmit=\{handleRecoveryVerify\}[\s\S]*?onClick=\{\(event\) => event\.stopPropagation\(\)\}[\s\S]*?debugId="identity-integrity\.recovery-verify"[\s\S]*?identityRecoveryActionStyle\(\)[\s\S]*?Verify private recovery/,
  "Identity Integrity recovery verification must stay on-page with explicit non-navigation submit behavior and a strong verify action."
);

assertContains(
  /IDENTITY_TASK_KEYS[\s\S]*?requestedIdentityTask[\s\S]*?completionMode[\s\S]*?identityTaskTarget\(task: IdentityTaskKey\)[\s\S]*?mode=complete/,
  "Identity Integrity pending evidence tasks must support focused completion deep links instead of dead actions."
);

assertContains(
  /data-identity-integrity-completion-target="true"[\s\S]*?data-identity-integrity-completion-steps="collapsed"[\s\S]*?debugId="identity-integrity\.completion-steps\.toggle"[\s\S]*?Completion steps[\s\S]*?activeTask\.completionSteps/,
  "Identity Integrity active task must keep completion steps covered while leaving the selected evidence action visible."
);

assertContains(
  /startSignedInPhoneVerification/,
  "Identity Integrity must use the signed-in phone start API."
);

assertContains(
  /confirmSignedInPhoneVerification/,
  "Identity Integrity must use the signed-in phone confirm API."
);

assertContains(
  /async function refreshTrustSlipAfterIdentityChange\([\s\S]*?const nextTrustSlip = await getMyTrustSlip\(\{ fresh: true \}\);[\s\S]*?setTrustSlip\(normalizeTrustSlipRecord\(nextTrustSlip\)\)[\s\S]*?const out = await confirmSignedInPhoneVerification[\s\S]*?const nextTrustSlip = await refreshTrustSlipAfterIdentityChange\(\)[\s\S]*?TrustSlip code and QR are now ready/,
  "Identity Integrity must refetch/auto-issue TrustSlip after phone confirmation so joined members do not remain visibly pending after the phone code succeeds."
);

assertContains(
  /phoneTaskMessage[\s\S]*?setPhoneTaskMessage\(/,
  "Identity Integrity must keep local phone task response state."
);

assertContains(
  /phone_owned_by_another_identity[\s\S]*?support\/admin[\s\S]*?This phone belongs to another GSN identity\.[\s\S]*?TrustSlip code and QR/,
  "Identity Integrity duplicate-phone blockers must stay short enough to fit the stable phone response slot and must name the first recovery step."
);

assertContains(
  /data-identity-integrity-phone-completion="true"[\s\S]*?data-identity-integrity-phone-response="true"[\s\S]*?\{phoneTaskMessage \|\| "Phone task response"\}[\s\S]*?debugId="identity-integrity\.phone-completion-submit"/,
  "Identity Integrity must show the phone completion response inside the phone form instead of a dead or disappearing phone requirement."
);

assertContains(
  /function identityResponseSlotStyle[\s\S]*?height: compact \? 106 : 74[\s\S]*?whiteSpace: "pre-line"[\s\S]*?overflowWrap: "anywhere"[\s\S]*?visibility: visible \? "visible" : "hidden"[\s\S]*?data-identity-integrity-phone-response="true"[\s\S]*?identityResponseSlotStyle\(phoneTaskTone, isCompact, Boolean\(phoneTaskMessage\)\)[\s\S]*?data-identity-integrity-official-id-response="true"[\s\S]*?identityResponseSlotStyle\("success", isCompact, Boolean\(officialIdTaskMessage\)\)/,
  "Identity Integrity phone and official-ID responses must reserve stable slots so action buttons do not jump when a result appears."
);

assertContains(
  /recordSignedInOfficialId[\s\S]*?data-identity-integrity-official-id-completion="true"[\s\S]*?debugId="identity-integrity\.official-id-completion-submit"/,
  "Identity Integrity must provide the signed-in official-ID evidence form instead of a dead ID requirement."
);

assertContains(
  /officialIdTaskMessage[\s\S]*?setOfficialIdTaskMessage\([\s\S]*?data-identity-integrity-official-id-response="true"[\s\S]*?\{officialIdTaskMessage \|\| "Official ID task response"\}/,
  "Identity Integrity must keep the official-ID recording result inside the Passport/ID task instead of relying on a disappearing top notice."
);

assertContains(
  /recordSignedInIdentityPhoto[\s\S]*?data-identity-integrity-photo-completion="true"[\s\S]*?debugId="identity-integrity\.identity-photo\.selfie"[\s\S]*?debugId="identity-integrity\.identity-photo\.id-photo"[\s\S]*?data-identity-integrity-photo-preview-slot="true"[\s\S]*?debugId="identity-integrity\.identity-photo\.record"[\s\S]*?visibility: identityPhotoPreview \? "visible" : "hidden"/,
  "Identity Integrity must provide signed-in selfie and ID-photo evidence capture with a stable preview/action slot instead of an explanation-only ID route."
);

assertNotContains(
  /DASHBOARD_AVATAR_STORAGE_KEY|gmfn\.member\.avatar|localStorage\.setItem\([^)]*avatar|profile_image_url:\s*identityPhotoKind/g,
  "Identity Integrity signed-in photo evidence must not overwrite the dashboard/profile avatar."
);

assertContains(
  /payoutDetails: routeTarget\([\s\S]*?"payoutDetails"[\s\S]*?communityConfirmations: routeTarget\([\s\S]*?"communityConfirmationInbox"[\s\S]*?to: routes\.communityConfirmations[\s\S]*?to: routes\.payoutDetails/,
  "Identity Integrity must route real bank/wallet and community tasks to real completion surfaces."
);

assertContains(
  /async function getMyTrustSlipForIdentityIntegrity[\s\S]*?getMyTrustSlip\(\{ fresh: true \}\)[\s\S]*?trustSlipIssueBlockerFromError[\s\S]*?fetchIdentityIntegrityData[\s\S]*?listMyClans\(\{ timeoutMs: 6500 \}\)[\s\S]*?getMyTrustSlipForIdentityIntegrity\(\)[\s\S]*?communities: rowsOf<IdentityCommunityRow>\(clansRes\)[\s\S]*?trustSlip: trustSlipRes/,
  "Identity Integrity must read the existing member community list and TrustSlip through the failure-aware shared refresh loader before rendering the GSN Identity Card footprint."
);

assertContains(
  /identityCardRefreshing[\s\S]*?lastIdentityCardAutoRefreshAt[\s\S]*?refreshGsnIdentityCard[\s\S]*?fetchIdentityIntegrityData\(selectedClanId\)[\s\S]*?Community count and TrustSlip status are current[\s\S]*?window\.addEventListener\("focus", refreshWhenVisibleAgain\)[\s\S]*?document\.addEventListener\("visibilitychange", refreshWhenVisibleAgain\)/,
  "GSN Identity Card must support manual refresh and quiet app-focus refresh so community-count/currentness changes can be reflected without reopening the route."
);

assertContains(
  /data-gsn-identity-card="true"[\s\S]*?data-gsn-identity-card-screenshot="true"[\s\S]*?data-gsn-identity-card-face="true"[\s\S]*?alt="GSN identity face"/,
  "Identity Integrity must keep the GSN Identity Card as a screenshot-ready card with the holder face visible."
);

assertNotContains(
  /IdentityPackageView|identityPackageView|data-identity-package-view-toggle|identity-integrity\.package-view/,
  "Normal Identity Integrity must not expose the removed Identity Card/Anchor switch."
);

assertContains(
  /const landscapeIdentityCard = \([\s\S]*?data-gsn-identity-card="true"[\s\S]*?\{!cardOnlyMode \? \([\s\S]*?data-identity-integrity-front-package="true"[\s\S]*?\{cardOnlyMode \? landscapeIdentityCard : null\}/,
  "Normal Identity Integrity must render the Anchor while the dedicated card-only presentation renders the GSN Identity Card."
);

assertContains(
  /identityCardValid[\s\S]*?identitySignals\.phoneVerified[\s\S]*?trustSlipCode[\s\S]*?!trustSlipExpired[\s\S]*?identityCardStatusText[\s\S]*?Phone required[\s\S]*?TrustSlip pending/,
  "GSN Identity Card validity must require verified phone evidence plus an active TrustSlip."
);

assertContains(
  /membershipCardStatus[\s\S]*?identityCardValid[\s\S]*?Active Network Membership[\s\S]*?data-gsn-identity-card-security="true"[\s\S]*?\{membershipCardStatus\}/,
  "The landscape membership card must show one bounded, evidence-derived membership status."
);
assertContains(
  /function GsnNetworkGlobeMark[\s\S]*?function GsnDottedWorldMap[\s\S]*?data-gsn-identity-card-reference="landscape-membership"[\s\S]*?aspectRatio: "1\.62 \/ 1"[\s\S]*?data-gsn-identity-card-watermark-field="true"[\s\S]*?<GsnDottedWorldMap \/>[\s\S]*?<GsnNetworkGlobeMark compact=\{isCompact\} \/>/,
  "The card must retain the approved landscape ratio, GSN globe wordmark, and quiet world-map field."
);

assertNotContains(
  /identityCardEvidenceRows|identityCardSecurityRows|data-gsn-identity-card-footprint/g,
  "The receiver-facing landscape card must not restore the old serial panel or six-tile evidence dump."
);

assertContains(
  /publicCommunityMemberCredentialPath\([\s\S]*?memberCredentialUrl[\s\S]*?canonicalPublicFrontendUrl\(memberCredentialPath\)/,
  "GSN Identity Card must reuse existing public member credential links instead of inventing a new verification engine."
);

assertContains(
  /identityCardLivePath[\s\S]*?`\/t\/\$\{encodeURIComponent\(trustSlipCode\)\}\/card`[\s\S]*?trustSlipVerifyPath[\s\S]*?`\/t\/\$\{encodeURIComponent\(trustSlipCode\)\}\/lite`[\s\S]*?identityCardLiveUrl[\s\S]*?trustSlipVerifyUrl/,
  "GSN Identity Card must keep separate live-card and verification targets: QR/live card to /card, copy verify link to /lite."
);

assertContains(
  /data-gsn-identity-card-qr="true"[\s\S]*?value=\{identityCardLiveUrl\}[\s\S]*?imageSettings=\{\{[\s\S]*?src: GSN_GLOBE_QR_MARK[\s\S]*?debugId="identity-integrity\.gsn-card\.actions-toggle"[\s\S]*?View Membership Record[\s\S]*?data-gsn-identity-card-actions="covered"[\s\S]*?identityCardActionsOpen \? \([\s\S]*?debugId="identity-integrity\.gsn-card\.copy-verify-link"/,
  "The live QR and all share/copy controls must remain behind one closed membership-record button."
);

assertContains(
  /const imagePayload = \{[\s\S]*?text: gsnIdentityCardShareText,[\s\S]*?files: \[cardImage\],[\s\S]*?\};[\s\S]*?nativeShare\.call\(navigator, \{[\s\S]*?title: "GSN Identity Card",[\s\S]*?text: gsnIdentityCardShareText,[\s\S]*?\}\)/,
  "GSN Identity Card share must avoid a separate Web Share url field so WhatsApp does not append a duplicate verifier link."
);

assertContains(
  /async function buildGsnIdentityCardShareImage[\s\S]*?new File\(\[blob\], "gsn-identity-card\.png"[\s\S]*?async function shareGsnIdentityCard\(\)[\s\S]*?!identityCardValid[\s\S]*?showNotice\(\s*"error",\s*trustSlipPendingDetail\s*\)[\s\S]*?navigator\.share[\s\S]*?canShare[\s\S]*?files: \[cardImage\][\s\S]*?Share sheet opened with the GSN Identity Card picture/,
  "GSN Identity Card must share the visible card as a PNG when the phone browser supports file sharing, while keeping the phone/TrustSlip gate."
);

assertContains(
  /data-gsn-identity-card-screenshot="true"[\s\S]*?data-gsn-identity-card-reference="landscape-membership"[\s\S]*?Network member[\s\S]*?\{displayName\}[\s\S]*?GSN ID[\s\S]*?\{gmfnId\}[\s\S]*?View Membership Record[\s\S]*?data-gsn-identity-card-boundary="true"[\s\S]*?Not government identification,[\s\S]*?credit approval,[\s\S]*?payment guarantee/i,
  "The landscape card must keep only the receiver's core decision facts and its concise legal boundary on the face."
);

assertNotContains(
  /Use this ID card|Close card actions/,
  "GSN Identity Card must not render a duplicate action button below the card."
);
assertContains(
  /const cardOnlyMode = useMemo[\s\S]*?params\.get\("display"\) === "card-only"[\s\S]*?data-identity-integrity-display=\{cardOnlyMode \? "card-only" : "full"\}[\s\S]*?\{!cardOnlyMode \? \([\s\S]*?data-identity-integrity-front-package="true"[\s\S]*?\{cardOnlyMode \? landscapeIdentityCard : null\}[\s\S]*?\{!cardOnlyMode \? \([\s\S]*?data-identity-integrity-details="covered"/,
  "Identity Integrity must keep its Anchor on the normal route and isolate the GSN card to card-only mode without normal-page details."
);
assertNotContains(
  /height: isCompact \? 240 : 270|<ExplainToggle[\s\S]*?What this screen does|Your stable GSN identity, your consistency across communities, what strengthened it, what weakened it/g,
  "Identity Integrity must not regress to the oversized photo hero or long explanation-first header."
);

assertNotContains(
  /<(button|a|summary)\b|role="button"|to="\/app|homeTo="\/app|backTo="\/app/g,
  "Identity Integrity page must not bypass shared stable primitives with raw action roots or hard-coded app links."
);

if (findings.length > 0) {
  console.error("Identity Integrity front package audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Identity Integrity front package audit passed: compact 3D icon-led identity package and active evidence task are caged."
);
