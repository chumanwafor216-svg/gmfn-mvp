/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const communityFile = "src/pages/CommunityHomePage.tsx";
const source = readFileSync(join(frontendRoot, communityFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  findings.push({ file: communityFile, line: 1, message, text: "Expected Community Home phone-button pattern was not found." });
}

function assertNotContains(pattern, message) {
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file: communityFile,
      line: lineAt(match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

const actionPattern = /<StableButton\b[\s\S]*?(?:\/>|<\/StableButton>)/g;
let match;
while ((match = actionPattern.exec(source))) {
  const block = match[0];
  const line = lineAt(match.index);

  if (!/style=/.test(block)) {
    findings.push({
      file: communityFile,
      line,
      message: "Community Home StableButton controls must keep route-local phone geometry styles.",
      text: block.replace(/\s+/g, " ").slice(0, 220),
    });
  }

  if (/(^|\s)disabled=/.test(block)) {
    findings.push({
      file: communityFile,
      line,
      message: "Community Home StableButton controls must avoid disabled= and stay tappable enough to explain blocked or in-progress actions.",
      text: block.replace(/\s+/g, " ").slice(0, 220),
    });
  }
}

assertContains(
  /function consumeCommunityButtonEvent\([\s\S]*?event\?\.preventDefault\(\);[\s\S]*?event\?\.stopPropagation\(\);/,
  "Community Home button events must prevent default and stop propagation before route or section handling."
);
assertContains(
  /const PROFILE_NAME_STORAGE_KEY = "gmfn_profile_name"/,
  "Community Home must use the same saved profile-name key as Profile and My GSN Identity settings."
);
assertContains(
  /function resolveMemberName\(me: any\): string \{[\s\S]*?readLocalText\(PROFILE_NAME_STORAGE_KEY\)[\s\S]*?me\?\.display_name[\s\S]*?me\?\.gmfn_id[\s\S]*?looksLikeEmail[\s\S]*?looksLikePhone[\s\S]*?return "Member"/,
  "Community Home hero identity must reject email/phone-like login fallbacks."
);
assertContains(
  /function hasHumanMemberName\(me: any\): boolean \{[\s\S]*?readLocalText\(PROFILE_NAME_STORAGE_KEY\)[\s\S]*?me\?\.display_name[\s\S]*?me\?\.nickname[\s\S]*?me\?\.first_name[\s\S]*?\.some\(isHumanMemberName\)/,
  "Community Home must separately detect whether a real human display name exists before suppressing profile-name guidance."
);
assertContains(
  /function identityNamePromptStyle\(isCompact: boolean\): React\.CSSProperties \{[\s\S]*?minHeight: isCompact \? 30 : 34[\s\S]*?touchAction: "manipulation"/,
  "Community Home display-name prompt must keep compact, stable phone tap geometry."
);
assertContains(
  /profileSettings: APP_ROUTES\.SETTINGS[\s\S]*?communityHomeNeedsDisplayName[\s\S]*?debugId="community-home\.identity\.add-display-name"[\s\S]*?openCommunityRoute\(event, routes\.profileSettings\)/,
  "Community Home must route missing-name users to Settings/My GSN identity setup."
);
assertContains(
  /function communityActionStyle\([\s\S]*?touchAction: "manipulation"[\s\S]*?WebkitTapHighlightColor: "transparent"[\s\S]*?overflowAnchor: "none"[\s\S]*?transform: "none"[\s\S]*?transition: "none"/,
  "Community Home action styles must keep phone tap and movement locks."
);
assertContains(
  /function communityActionIcon\(primary = false\): React\.CSSProperties \{[\s\S]*?width: 46,[\s\S]*?height: 46,[\s\S]*?background: "rgba\(255,255,255,0\.94\)"[\s\S]*?overflow: "hidden"/,
  "Community Home compact row icon slots must keep stable, light, larger 3D icon geometry."
);
assertContains(
  /function communityToolRowStyle\(\): React\.CSSProperties \{[\s\S]*?width: "100%"[\s\S]*?gridTemplateColumns: "auto minmax\(0, 1fr\) auto"[\s\S]*?minHeight: 72[\s\S]*?pointerEvents: "auto"[\s\S]*?overflow: "hidden"[\s\S]*?transition: "none"/,
  "Community Home compact rows must keep stable grid geometry and no transition-driven movement."
);
assertContains(
  /debugId="community-home\.goto\.marketplace"[\s\S]*?void openSelectedMarketplace\(event\)[\s\S]*?style=\{communityToolRowStyle\(\)\}/,
  "Community Home Marketplace handoff must stay a protected compact row."
);
assertContains(
  /debugId="community-home\.goto\.shop-control"[\s\S]*?openCommunityShopControl\(event\)[\s\S]*?Manage shop[\s\S]*?Change your shop, public products, or Spotlight/,
  "Community Home shop owner handoff must point to Shop Control without embedding Spotlight controls."
);
assertContains(
  /subtitle=\{isCompact \? undefined : "One selected community at a time\."\}/,
  "Community Home phone top navigation must not repeat selected-community guidance."
);
const phoneHiddenPageTopNavCount = (
  source.match(/\{!isCompact \? \(\s*<PageTopNav/g) || []
).length;
if (phoneHiddenPageTopNavCount !== 3) {
  findings.push({
    file: communityFile,
    line: 1,
    message: "Community Home must leave the authenticated phone shell in charge of navigation in loading, empty, and selected-community states.",
    text: `Phone-hidden PageTopNav count: ${phoneHiddenPageTopNavCount}`,
  });
}
assertContains(
  /data-debug-id="community-home\.identity-card"[\s\S]*?!isCompact \? \([\s\S]*?This is the community you are using now[\s\S]*?\) : null/,
  "Community Home phone identity must keep the explanatory paragraph off the first surface."
);
assertContains(
  /!isCompact \? <div style=\{\{ \.\.\.sectionLabel\(\), color: "#BFD0E2" \}\}>Community Home<\/div> : null/,
  "Community Home phone identity must not repeat the page name above the selected community name."
);
assertContains(
  /minHeight: isCompact \? 0 : 250[\s\S]*?if \(isCompact\) \{[\s\S]*?data-debug-id="community-home\.bulletin\.phone-status"[\s\S]*?data-bulletin-urgency-tone=\{phoneTone\}[\s\S]*?!isCompact \? \(\s*<div style=\{announcementDateTileStyle\(false\)\}[\s\S]*?\{renderCommunityBulletinPulse\(\)\}/,
  "Community Home phone Bulletin must show one compact timing status while keeping full timing details and the large pulse dashboard off the default surface."
);
assertContains(
  /minHeight: isCompact \? 52 : 82[\s\S]*?!isCompact \? <span>Community <\/span> : null[\s\S]*?!isCompact \? \(\s*<span style=\{announcementBoardPillStyle\(\)\}>/,
  "Community Home phone Bulletin must keep one short Bulletin header without a repeated kind pill."
);
assertContains(
  /const phoneNoticeOpen = detailOpen \|\| reactionPanelOpen[\s\S]*?if \(isCompact\) \{[\s\S]*?setNoticeDetailOpenId\(nextOpen \? noticeKey : ""\);[\s\S]*?setNoticeReactionPanelOpenId\(nextOpen \? noticeKey : ""\);[\s\S]*?setNoticePhoneSectionOpenId\(""\);[\s\S]*?phoneNoticeOpen \? "Close notice" : "Open notice"/,
  "Community Home phone Bulletin must use one Open notice control for the full message and a closed action chooser."
);
assertContains(
  /const \[noticePhoneSectionOpenId, setNoticePhoneSectionOpenId\] = useState\(""\)[\s\S]*?setNoticePhoneSectionOpenId\(\(current\) => \(current === sectionKey \? "" : sectionKey\)\)[\s\S]*?renderPhoneNoticeSection\([\s\S]*?"respond"[\s\S]*?renderPhoneNoticeSection\([\s\S]*?"share"[\s\S]*?renderPhoneNoticeSection\([\s\S]*?"details"/,
  "Community Home phone Bulletin must keep Respond, Share/QR, and Details in one-open-at-a-time sections."
);
assertContains(
  /<details[\s\S]*?open=\{isCompact \? communityActionsOpen : true\}[\s\S]*?<StableDisclosureSummary[\s\S]*?debugId="community-home\.goto\.toggle"[\s\S]*?Community actions[\s\S]*?id="community-home-actions-panel"/,
  "Community Home phone destinations must remain behind one protected Community actions disclosure."
);
assertContains(
  /function communityDisclosureSectionStyle\(isCompact: boolean\)[\s\S]*?if \(!isCompact\) return communityBlockCard\("quiet"\);[\s\S]*?style=\{communityDisclosureSectionStyle\(isCompact\)\}[\s\S]*?communityCountFromSummary > 1 \|\| requestedCommunityError/,
  "Community Home phone disclosures must avoid card-inside-card framing and hide the switcher when there is only one accessible community."
);
assertContains(
  /minHeight: isCompact \? 54 : 64[\s\S]*?compact=\{isCompact\}/,
  "Community Home phone identity facts must stay compact while preserving the truthful billboard values."
);
assertContains(
  /debugId="community-home\.goto\.marketplace"[\s\S]*?Marketplace<\/span>\{!isCompact \? <span[\s\S]*?debugId="community-home\.goto\.trust"[\s\S]*?Trust<\/span>\{!isCompact \? <span/,
  "Community Home phone destination rows must show labels without repeated explanatory sentences."
);
assertContains(
  /debugId="community-home\.switch\.toggle"[\s\S]*?aria-controls="community-home-communities-panel"[\s\S]*?style=\{communityToolRowStyle\(\)\}/,
  "Community Home switcher must be a protected compact row."
);
assertContains(
  /debugId=\{`community-home\.switch\.select\.\$\{clanId \|\| "unknown"\}`\}[\s\S]*?busy=\{changingClanId === clanId\}[\s\S]*?void handleSelectCommunity\(clan, false\)/,
  "Community Home community rows must remain tappable, busy-aware selection rows."
);
assertContains(
  /debugId="community-home\.admin\.toggle"[\s\S]*?Manage announcements, join requests, and community settings/s,
  "Community Home admin tools must be collapsed behind one admin row."
);
assertContains(
  /canManageCommunityDomain && selectedCommunityDomainRow[\s\S]*?debugId="community-home\.admin\.community-domain"/s,
  "Community Home Community Domain control must be gated by selected-domain can_admin."
);
assertContains(
  /title="Start here"[\s\S]*?You have not created or joined a community yet\.[\s\S]*?Create community[\s\S]*?Set up Community Domain[\s\S]*?Invite your first people[\s\S]*?Back to Dashboard/s,
  "Community Home no-community state must explain the situation plainly while preserving its approved recovery actions."
);
assertContains(
  /Tell GSN what you want to do\.[\s\S]*?Use your current GSN account to start a community\.[\s\S]*?Use an invitation you received, or ask to join[\s\S]*?Invite first people/s,
  "Community Home setup guidance must describe create, join, and First Circle work in direct member language."
);
assertContains(
  /Please confirm you saw this[\s\S]*?Announcements waiting for review[\s\S]*?Manage announcements, join requests, and community settings\.[\s\S]*?Send announcement for review[\s\S]*?Post announcement/s,
  "Community Home attention and admin copy must use direct announcement language."
);

assertNotContains(/overflowWrap: "anywhere"/g, "Community Home route-local action styles must not split words anywhere on phone buttons.");
assertNotContains(/Choose the verification or work evidence|existing-member create lane|join-community lane|Submit bulletin record|Post bulletin record|No bulletin reviews waiting/g, "Community Home must not restore internal workflow language on member-facing guidance.");
assertNotContains(/display: "none"[\s\S]{0,1800}<StableButton\b/g, "Community Home must not keep hidden StableButton sections in the source action inventory.");
assertNotContains(/display: "none"/g, "Community Home must not keep hidden route-local UI remnants in the page source.");
assertNotContains(/<div\s+style=\{communityToolRowStyle\(\)\}/g, "Community Home must not use plain divs with compact button geometry; button-looking rows must be protected StableButton actions.");
assertNotContains(/community-home\.(?:owner-actions|circle|lane|spotlight-guided|spotlight-status|summary\.visible|selected\.open-marketplace)\./g, "Community Home must not keep legacy owner-action, grouped lane, or Spotlight debug surfaces.");
assertNotContains(/letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/g, "Community Home must not restore spaced-out micro-label typography on the phone surface.");
assertNotContains(/announcementCompactDateTileStyle/g, "Community Home must not restore the large compact date strip to the phone Bulletin.");

if (findings.length > 0) {
  console.error("Community Home phone button audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Community Home phone button audit passed.");
