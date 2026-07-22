/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

const findings = [];

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  let match;

  while ((match = pattern.exec(text))) {
    findings.push({
      file,
      line: text.slice(0, match.index).split(/\r?\n/).length,
      message,
      text: text.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
  }
}

function assertStableActionsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern = /<Stable(?:Button|CtaLink)\b[\s\S]*?>/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const tag = match[0];
    if (!/debugId=/.test(tag)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "Marketplace-domain stable actions must have debugId so phone misroutes can be traced to the exact control.",
        text: tag.replace(/\s+/g, " ").slice(0, 180),
      });
    }
  }
}

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /another app route/g,
  "Marketplace clipboard fallback copy must use page language, not app-route wording."
);

[
  "src/pages/MarketplacePage.tsx",
  "src/pages/MarketplaceWorkspacePage.tsx",
  "src/pages/ShopGalleryPage.tsx",
].forEach(assertStableActionsHaveDebugIds);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /return publicShopUrl\(publicShopOwnerId\);[\s\S]*?const link = ownerId \? publicShopUrl\(ownerId\) : "";/,
  "Marketplace owner share/copy/open actions must send outward visitors to the canonical public shop root; exact block links are handled by Shop Diaries item actions."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.public-shop\.visible-link"[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?debugId="marketplace\.public-shop\.copy"[\s\S]*?debugId="marketplace\.public-shop\.email"[\s\S]*?debugId="marketplace\.public-shop\.open"/,
  "Marketplace public shop controls must keep stable debug ids in the visible-link, refresh, copy, email, and open order."
);

assertContains(
  "src/lib/api.ts",
  /export async function createSpotlightPaymentInstruction[\s\S]*?\/payment-instructions\/spotlight[\s\S]*?quantity_total[\s\S]*?visibility_scope/,
  "Paid Repost must use a named frontend payment-instruction rail for paid Spotlight credits."
);

assertContains(
  "src/lib/api.ts",
  /export async function getMarketplaceShopSpotlightStatus[\s\S]*?\/marketplace\/shops\/[\s\S]*?\/spotlight-status/,
  "Paid Repost must read shop paid-credit status from the backend instead of inferring it from a failed repost."
);

assertContains(
  "src/lib/api.ts",
  /export async function getMarketplaceRepostTargetSuggestions[\s\S]*?\/marketplace\/products\/[\s\S]*?\/repost-targets/,
  "Paid Repost must use the backend target-suggestion route instead of guessing target community IDs in the page."
);

assertContains(
  "src/lib/api.ts",
  /export async function getCommunityPackageStatus[\s\S]*?\/payment-instructions\/community-package\/status[\s\S]*?export async function getRoscaCycles[\s\S]*?\/rosca\/cycles[\s\S]*?export async function createRoscaCycle[\s\S]*?\/rosca\/cycles[\s\S]*?export async function recordRoscaCyclePayout[\s\S]*?\/rosca\/cycles\/\$\{encodeURIComponent/,
  "Marketplace ROSCA must use named API helpers for package status, cycle listing, cycle creation, and payout recording."
);

assertNotContains(
  "src/lib/api.ts",
  /profile-image save endpoint|remove endpoint|page state|image state/i,
  "Community image fallback messages must explain what the user can do without endpoint or page-state language."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /createSpotlightPaymentInstruction\(\{[\s\S]*?quantity_total: requiredCredits[\s\S]*?visibility_scope: "marketplace_repost"/,
  "Marketplace Paid Repost must generate a payment code with the exact required paid-credit quantity and marketplace_repost scope."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /type SectionState = \{[\s\S]*?rosca: boolean[\s\S]*?MARKETPLACE_SECTION_ANCHORS[\s\S]*?rosca: "marketplace-rosca"[\s\S]*?if \(hash !== "marketplace-rosca"\) return;[\s\S]*?focusedMarketplaceSectionState\("rosca"\)[\s\S]*?scrollToMarketplaceSection\("marketplace-rosca"\)/,
  "Marketplace ROSCA must be a first-class section with its own stable hash landing."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id: "rosca"[\s\S]*?to: "#marketplace-rosca"[\s\S]*?debugId="marketplace\.tile\.support"[\s\S]*?Support[\s\S]*?id="marketplace-rosca"[\s\S]*?debugId="marketplace\.rosca\.activate-yearly"[\s\S]*?debugId="marketplace\.rosca\.start-cycle"[\s\S]*?debugId="marketplace\.rosca\.record-payout"[\s\S]*?marketplace\.support\.path-chooser[\s\S]*?ROSCA[\s\S]*?debugId="marketplace\.support\.open-rosca"[\s\S]*?openMarketplaceSection\(event, "rosca", "marketplace-rosca"\)/,
  "Marketplace ROSCA must stay reachable as its own desk, keep the ROSCA intent anchor, and keep stable yearly/start/payout controls."
);

assertContains(
  "../gmfn_backend/app/services/rosca_service.py",
  /def _rosca_marketplace_url[\s\S]*?\/app\/marketplace\?clan_id=\{int\(clan_id\)\}[\s\S]*?#marketplace-rosca[\s\S]*?action_url=_rosca_marketplace_url/,
  "ROSCA backend notifications must land users in the Marketplace ROSCA desk, not the old Shop Control package block."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?availableMarketplaceRepostCredits[\s\S]*?paid credit[\s\S]*?debugId="marketplace\.network-repost\.generate-payment-code"[\s\S]*?debugId="marketplace\.network-repost\.refresh-credits"[\s\S]*?debugId="marketplace\.network-repost\.place"/,
  "Marketplace Paid Repost must visibly show paid credits and keep generate, refresh, and place controls in stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /\{\.\.\.marketplaceSurfaceTouchProps\("marketplace\.network-repost\.payment-actions"\)\}[\s\S]*?debugId="marketplace\.network-repost\.generate-payment-code"[\s\S]*?runMarketplaceAction\(event, \(\) => \{[\s\S]*?void createMarketplaceRepostPaymentInstruction\(\);[\s\S]*?disabled=\{\s*creatingRepostPaymentInstruction\s*\}/,
  "Marketplace Paid Repost payment actions must be a named tap root, and Generate Payment Code must call the guarded payment-code handler instead of becoming a disabled/dead target."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /type RepostProductOption[\s\S]*?originShopId: number[\s\S]*?originCommunityId: number[\s\S]*?async function createMarketplaceRepostPaymentInstruction\(\)[\s\S]*?selectedRepostProduct\?\.originShopId \|\| publicShopRecord\?\.id[\s\S]*?selectedRepostProduct\?\.originCommunityId[\s\S]*?createSpotlightPaymentInstruction\(\{/,
  "Marketplace Paid Repost payment-code generation must use the selected block source shop/community IDs, not only the currently loaded marketplace shell."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceFieldTouchProps\(debugId: string\)[\s\S]*?"data-gmfn-field-root": "true"[\s\S]*?"data-gmfn-debug-id": debugId[\s\S]*?function marketplaceSurfaceTouchProps\(debugId: string\)[\s\S]*?"data-gmfn-surface-root": "true"[\s\S]*?"data-gmfn-debug-id": debugId/,
  "Marketplace fields must stay field-only, while non-field Paid Repost surfaces keep neutral surface markers so the phone tap guard does not treat whole panels as actions."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /JOIN_RELATIONSHIP_OPTIONS[\s\S]*?marketplace_trade[\s\S]*?JOIN_KNOWN_DURATION_OPTIONS[\s\S]*?over_5_years[\s\S]*?joinRelationshipReady[\s\S]*?joinRecipientReady[\s\S]*?joinSenderDisplayName[\s\S]*?joinSenderReady[\s\S]*?joinInviteTrustReady/,
  "Marketplace Join must collect the sender name, receiver name, how the inviter knows the person, and how long they have known them before a join invite can be treated as ready."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /From \(sender\)[\s\S]*?<input[\s\S]*?value=\{joinSenderName\}[\s\S]*?onChange=\{\(event\) => setJoinSenderName\(event\.target\.value\)\}[\s\S]*?aria-label="Sender name for join invitation"[\s\S]*?Receiver name[\s\S]*?Message to receiver \(optional\)[\s\S]*?Private GSN relationship note \(optional\)/,
  "Marketplace Join invite form must visibly distinguish and edit sender, receiver, receiver-facing note, and private GSN relationship note."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceJoinFieldLabelStyle[\s\S]*?minHeight: isCompact \? 28 : 30[\s\S]*?maxHeight: isCompact \? 28 : 30[\s\S]*?whiteSpace: "nowrap"[\s\S]*?function marketplaceJoinFieldShellStyle[\s\S]*?const shellHeight = isCompact \? 78 : 82[\s\S]*?height: shellHeight[\s\S]*?maxHeight: shellHeight[\s\S]*?function marketplaceJoinFixedFieldStyle[\s\S]*?height: isCompact \? 44 : 46[\s\S]*?maxHeight: isCompact \? 44 : 46[\s\S]*?fontSize: 16/,
  "Marketplace Join form controls must keep fixed label, field, 16px anti-zoom input text, and shell geometry so phone taps do not land on moving targets."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /marketplaceSurfaceTouchProps\("marketplace\.links\.join\.surface"\)[\s\S]*?marketplaceFieldTouchProps\("marketplace\.join\.sender-name"\)[\s\S]*?value=\{joinSenderName\}[\s\S]*?marketplaceJoinFixedFieldStyle\(isCompact\)[\s\S]*?marketplaceJoinFieldShellStyle\(isCompact\)[\s\S]*?marketplaceJoinFixedFieldStyle\(isCompact\)[\s\S]*?marketplaceSurfaceTouchProps\("marketplace\.links\.join\.actions"\)[\s\S]*?marketplaceJoinActionsStyle\(isCompact\)/,
  "Marketplace Join invite surface must cage the expanded lane, editable sender, field package, and action grid with stable route-local touch helpers."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /createClanInvite\(activeCommunityId, \{[\s\S]*?relationship_evidence: relationshipEvidence[\s\S]*?\}\)[\s\S]*?setJoinRelationshipEvidenceRecordedKey\(joinRelationshipEvidenceKey\)/,
  "Marketplace Join invite creation must send private relationship evidence to the backend trust event before marking the link as recorded."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const joinInviteShareReady = useMemo\(\(\) => \{[\s\S]*?inviteLink && joinSenderReady && joinRecipientReady && joinRelationshipReady[\s\S]*?function requireJoinInviteTrustEvidence\(\)[\s\S]*?Add your sender name before sending the invite[\s\S]*?Add the receiver name before sending the invite[\s\S]*?Add how you know this person[\s\S]*?GSN is preparing the join link[\s\S]*?return true;/,
  "Marketplace Join share actions must unlock once the reusable link exists and the required invite fields are complete."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function copyJoinInviteMessage\(\)[\s\S]*?safeCopy\(message\)[\s\S]*?setJoinInviteManualCopyMessage\(""\)[\s\S]*?setJoinInviteManualCopyMessage\(message\)[\s\S]*?Clipboard copy was blocked\. The invite text is shown below[\s\S]*?id="marketplace-join-manual-copy"[\s\S]*?readOnly[\s\S]*?value=\{joinInviteManualCopyMessage\}/,
  "Marketplace Join Copy Invite must show a selectable manual invite text fallback when mobile clipboard copy is blocked."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /joinInviteAutoPrepareKeyRef[\s\S]*?useEffect\(\(\) => \{[\s\S]*?activeLinkCenterTool !== "join"[\s\S]*?joinSenderReady[\s\S]*?joinRecipientReady[\s\S]*?joinRelationshipReady[\s\S]*?joinRelationshipEvidenceKey[\s\S]*?handleCreateInviteLink\(\{ quiet: true \}\)/,
  "Marketplace Join must automatically prepare the reusable invite link after sender, receiver, and relationship evidence are complete."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /joinInviteDraftStorageKey[\s\S]*?joinInviteDraftRestoredKeyRef[\s\S]*?readLocalJSON[\s\S]*?setJoinSenderName[\s\S]*?setJoinRecipientName[\s\S]*?setJoinKnownDuration[\s\S]*?setActiveLinkCenterTool\("join"\)[\s\S]*?writeLocalJSON\(joinInviteDraftStorageKey\(activeCommunityId\)/,
  "Marketplace Join must save and restore the in-progress invite draft so phone jumps or reloads do not erase filled fields."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const timer = window\.setTimeout\(\(\) => \{[\s\S]*?handleCreateInviteLink\(\{ quiet: true \}\)[\s\S]*?\}, 3200\);[\s\S]*?return \(\) => window\.clearTimeout\(timer\);/,
  "Marketplace Join auto-prepare must wait for the final phone dropdown to settle before calling the backend."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /committee administrator|community admin can refresh|Only a community admin can refresh|Refresh Join Link so GSN records|Refresh join link to record trust evidence|Try Copy Invite again/g,
  "Marketplace Join must not expose the retired admin-refresh/quota wording or dead-end try-again copy wording during the pilot reusable-link flow."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?if \(!requireJoinInviteTrustEvidence\(\)\) return;[\s\S]*?copyMarketplaceLink\([\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?copyJoinInviteMessage\(\)[\s\S]*?debugId="marketplace\.links\.join\.email"[\s\S]*?if \(!requireJoinInviteTrustEvidence\(\)\) return;[\s\S]*?openMarketplaceEmail\([\s\S]*?debugId="marketplace\.links\.join\.whatsapp"[\s\S]*?if \(!requireJoinInviteTrustEvidence\(\)\) return;[\s\S]*?wa\.me[\s\S]*?disabled=\{!joinInviteShareReady\}[\s\S]*?debugId="marketplace\.links\.join\.tag-social"/,
  "Marketplace Join copy, message, email, WhatsApp, and share controls must share the same route-local invite readiness gate and fallback copy path."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /buildJoinInviteDoorwayMessage\(\{[\s\S]{0,900}joinRelationship/,
  "Private relationship evidence must not be exposed in the WhatsApp/email invite message."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceSurfaceTouchProps\(debugId: string\)[\s\S]{0,650}(data-gmfn-action-root|data-cta-id)/,
  "Marketplace parent surfaces must not carry global action-root markers."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?\{\.\.\.marketplaceSurfaceTouchProps\("marketplace\.network-repost\.surface"\)\}[\s\S]*?scrollMarginTop: isCompact \? 84 : 104[\s\S]*?position: "relative"[\s\S]*?pointerEvents: "auto"/,
  "Marketplace Paid Repost surface must be a named action root without a local z-index/isolation stacking layer."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?(?:APP_ROUTES\.NOTIFICATIONS|action-inbox|Action Inbox|Open Action Inbox)/g,
  "Marketplace Paid Repost controls must not route to Action Inbox; not-ready controls must explain in place."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /Pick one public shop block|paid Spotlight rail|One Repost day uses one paid Spotlight credit|No payment code is open for this Paid Repost yet|Private and controlled outward links|one permanent public URL/g,
  "Marketplace Paid Repost page copy must stay direct and user-facing, without old explanatory filler."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]{0,520}(?:zIndex|isolation)\s*:/g,
  "Marketplace Paid Repost surface must not create a local stacking layer that can drift mobile hit testing."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /async function loadMarketplaceRepostTargetSuggestions[\s\S]*?getMarketplaceRepostTargetSuggestions\(productId/,
  "Marketplace Network Spotlight target suggestions must be loaded through the named backend API helper."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-paid-network-placement"[\s\S]*?debugId="marketplace\.network-repost\.find-targets"[\s\S]*?debugId=\{`marketplace\.network-repost\.target\.\$\{code \|\| index\}\.use`\}/,
  "Marketplace Paid Repost must keep backend target suggestions and Use ID buttons inside the paid placement panel."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /PAID_REPOST_HANDOFF_STORAGE_KEY[\s\S]*?readPaidRepostHandoff[\s\S]*?routeRepostHandoffProduct[\s\S]*?visibleRepostProducts[\s\S]*?marketplace-paid-network-placement[\s\S]*?routeRepostSource === "shop-diaries"[\s\S]*?visibleRepostProducts\.find[\s\S]*?setSelectedRepostProductId\(matchedProduct\.id\)/,
  "Marketplace Paid Repost must accept exact Shop Diaries product/block handoff, keep it visible as a fallback selected block, and avoid opening as a generic marketplace stop."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /PAID_REPOST_HANDOFF_STORAGE_KEY[\s\S]*?function writePaidRepostHandoff\(product: ShopProduct\)[\s\S]*?source: "shop-diaries"[\s\S]*?shopId: positiveNumber\(effectiveShop\?\.id\)[\s\S]*?originShopId: positiveNumber\(effectiveShop\?\.id\)[\s\S]*?originCommunityId: positiveNumber\([\s\S]*?ownerCommunityId: ownerSurfaceCommunityId[\s\S]*?window\.sessionStorage\.setItem[\s\S]*?function paidRepostHandoffHandler\(product: ShopProduct\)[\s\S]*?<StableCtaLink[\s\S]*?to=\{blockPlacementPath\(product\)\}[\s\S]*?onClick=\{paidRepostHandoffHandler\(product\)\}[\s\S]*?Repost/,
  "Shop Diaries Repost must store the exact public block plus source shop/community handoff before routing into Marketplace Paid Repost."
);

{
  const text = read("src/pages/MarketplacePage.tsx");
  const submitStart = text.indexOf("async function submitMarketplaceRepost()");
  const submitEnd = submitStart >= 0 ? text.indexOf("\n  useEffect", submitStart) : -1;
  const submitBody = submitStart >= 0 && submitEnd > submitStart
    ? text.slice(submitStart, submitEnd)
    : "";
  const creditGuardIndex = submitBody.indexOf("availableMarketplaceRepostCredits < durationDays");
  const repostCallIndex = submitBody.indexOf("createMarketplaceRepost");
  if (creditGuardIndex < 0 || repostCallIndex < 0 || creditGuardIndex > repostCallIndex) {
    findings.push({
      file: "src/pages/MarketplacePage.tsx",
      line: submitStart >= 0 ? text.slice(0, submitStart).split(/\r?\n/).length : 1,
      message:
        "Marketplace Paid Repost must check available paid credits before createMarketplaceRepost.",
      text: "Expected availableMarketplaceRepostCredits guard before createMarketplaceRepost.",
    });
  }
}

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?debugId="marketplace\.links\.join\.refresh"[\s\S]*?debugId="marketplace\.links\.join\.copy-message"[\s\S]*?debugId="marketplace\.links\.join\.email"[\s\S]*?debugId="marketplace\.links\.join\.whatsapp"/,
  "Marketplace join-link controls must keep named, traceable actions in their stable order."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?debugId="marketplace\.links\.community-desk\.copy"[\s\S]*?debugId="marketplace\.public-shop\.visible-link"/,
  "Marketplace-owned links must move from the selected-community join lane to community-desk and public-shop lanes without a hidden create-community lane between them."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /display: "none"|marketplace\.links\.create\.|publicCreateEntryLink|Start a new community/g,
  "Marketplace must not keep hidden create-community link-desk UI or source-only create-community actions."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /Your shop route is not ready yet|That route is not ready yet|withdrawal or payout route/i,
  "Marketplace unavailable-action messages must describe pages instead of routes."
);

assertNotContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /community route|community access route|Route handoff|operating routes|money\/support routes/i,
  "Public Marketplace Workspace copy must describe community access links and pages, not routes."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /const communityIdentity = useMemo\(\(\) => \{[\s\S]*?inviteInfo\?\.community_id[\s\S]*?inviteInfo\?\.marketplace_id[\s\S]*?inviteInfo\?\.clan_code[\s\S]*?inviteInfo\?\.gmfn_id[\s\S]*?""[\s\S]*?\}, \[inviteInfo\]\);[\s\S]*?Community ID: \{communityIdentity \|\| "No community ID yet"\}/,
  "Marketplace Workspace must show honest missing-community-ID copy and must not label the selected internal community number as the Community ID."
);

assertNotContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /Community ID: \{communityIdentity \|\| activeClanId \|\| "Not available"\}|Community ID: \{communityIdentity \|\| "Not available yet"\}/g,
  "Marketplace Workspace must not restore internal-ID or vague not-available Community ID fallbacks."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /import \{ GsnLegacyIcon, type GsnIconName \} from "\.\.\/components\/GsnLegacyIcon";[\s\S]*?type MarketplaceGlyphName[\s\S]*?MARKETPLACE_GLYPH_ICON_MAP[\s\S]*?satisfies Record<MarketplaceGlyphName, GsnIconName>[\s\S]*?function MarketplaceGlyph[\s\S]*?name: MarketplaceGlyphName[\s\S]*?<GsnLegacyIcon/,
  "Marketplace front action marks must use deterministic 3D GSN icons instead of device emoji fonts."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /[\u{1F6CD}\u{1F465}\u{1F6E1}\u{1F4B3}\u{1F91D}\u{1F6D2}\u{1F4B7}\u{1F3E6}\u{1F49A}\u{1F4CB}\u{1F4E3}\u{1F5C2}\u{2728}\u{203A}\u{2303}]/gu,
  "Marketplace front action marks must not use emoji or text chevrons; use MarketplaceGlyph backed by 3D GSN icons instead."
);

assertNotContains(
  "src/pages/MarketplacePage.tsx",
  /radial-gradient/g,
  "Marketplace page polish must avoid decorative radial glow/orb backgrounds."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.links\.join\.copy"[\s\S]*?marketplaceJoinLinkMissingMessage[\s\S]*?debugId="marketplace\.links\.community-desk\.copy"[\s\S]*?Community verification link is not ready yet\.[\s\S]*?debugId="marketplace\.public-shop\.refresh"[\s\S]*?publicShopActionUnavailableMessage/,
  "Marketplace not-ready link actions must remain tappable explainers instead of dead disabled controls."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.support\.start-request"[\s\S]*?debugId="marketplace\.support\.refresh-fit"[\s\S]*?debugId="marketplace\.support\.cancel-draft"[\s\S]*?debugId="marketplace\.support\.loan-readiness"[\s\S]*?debugId="marketplace\.support\.loan-suggestions"[\s\S]*?debugId="marketplace\.support\.loan-workbench"[\s\S]*?debugId="marketplace\.support\.finance"[\s\S]*?debugId="marketplace\.support\.full-loans"/,
  "Marketplace support and loan actions must stay explicitly traceable so they cannot silently fall into unrelated routes."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?Shop Diaries[\s\S]*?visibleProducts\.map/,
  "Public Shop Gallery must anchor the 12-block Shop Diaries shelf for shared shop links."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /publicShopShareUrl\(\{[\s\S]*?productId: product\.id,[\s\S]*?block: product\.slotNumber,/,
  "Public Shop Gallery product sharing must keep product/block links inside Shop Diaries."
);

assertContains(
  "src/pages/ShopGalleryPage.tsx",
  /const shouldRevealProduct = id !== PUBLIC_SHOP_DIARIES_ANCHOR;[\s\S]*?revealGalleryTarget\(id\);/,
  "Public Shop Gallery hash handling must distinguish whole Shop Diaries links from exact product/block links."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /function shopLinkForRecord\(shop: any\): string \{[\s\S]*?publicShopRootUrl\(direct\)[\s\S]*?return gmfnId \? publicShopUrl\(gmfnId\) : "";/,
  "Marketplace Workspace internal shop browsing must continue to use confirmed public shop roots, not unconfirmed app routes."
);

assertContains(
  "src/lib/marketplaceActionStability.ts",
  /MARKETPLACE_LANDING_TRACE_KEY[\s\S]*?marketplaceLandingOffsetPx[\s\S]*?visualViewport[\s\S]*?function scrollableAncestor[\s\S]*?node\.scrollHeight > node\.clientHeight[\s\S]*?function activeElementIsEditable[\s\S]*?tagName === "input"[\s\S]*?scrollElementToMarketplaceLanding[\s\S]*?const container = scrollableAncestor\(target\)[\s\S]*?container\.scrollTo\(\{ top, behavior: "auto" \}\)[\s\S]*?window\.scrollTo\(\{ top, behavior: "auto" \}\)[\s\S]*?if \(activeElementIsEditable\(\)\)[\s\S]*?correction-skipped-field-focus[\s\S]*?const delta = Math\.round\([\s\S]*?nextContainerRect[\s\S]*?correctedTop[\s\S]*?scrollContainer[\s\S]*?marketplaceSectionStyle/,
  "Marketplace front/workspace pages must share one phone-safe landing helper that scrolls the real mobile container, skips corrective scrolling during field focus, and uses window scrolling only as desktop/body fallback."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?pendingMarketplaceSectionRef[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?requestAnimationFrame\(\(\) => \{[\s\S]*?scrollToMarketplaceSection\(sectionId[\s\S]*?pendingMarketplaceSectionRef\.current = ""[\s\S]*?useEffect\(\(\) => \{[\s\S]*?pendingMarketplaceSectionRef\.current[\s\S]*?scheduleMarketplaceSectionScroll\(sectionId[\s\S]*?function openMarketplaceSection[\s\S]*?setSectionsTouched\(\(prev\) => touchedMarketplaceSectionState\(prev, key\)\)[\s\S]*?setSectionsOpen\(focusedMarketplaceSectionState\(key\)\)[\s\S]*?scheduleMarketplaceSectionScroll\(sectionId\)/,
  "Marketplace section-opening buttons must mark opened sections as touched, land once after React commit, clear pending scroll, and use the shared phone-safe section helper."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /debugId="marketplace\.tile\.money"[\s\S]*?Money & Trust[\s\S]*?Money Out[\s\S]*?id="marketplace-money-routes"[\s\S]*?to=\{marketplaceMoneyOutTo\}[\s\S]*?debugId="marketplace\.money\.money-out-destination"[\s\S]*?Open Withdrawal/,
  "Marketplace normal withdrawal must remain available inside the Money & Trust lane, not as a separate busy front-door button or a Support & Loans opener."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /id="marketplace-money-routes"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-owned-links"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-members-shops"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-loans-support"[\s\S]*?marketplaceSectionStyle\(\)/,
  "Marketplace major sections must keep the shared phone-safe section style."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function isPublicIdentityFallback[\s\S]*?lowered\.includes\("@"\)[\s\S]*?lowered\.endsWith\("\.local"\)[\s\S]*?\^\(\?:gmf\[MN\]\|gsn\)-[\s\S]*?digits\.length >= 7[\s\S]*?function firstPublicIdentity[\s\S]*?if \(!text \|\| isPublicIdentityFallback\(text\)\) continue;/,
  "Marketplace public member/shop labels must reject phone, email, internal .local, and generated GSN/GMFN identity fallbacks."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /const visibleShopName = firstPublicIdentity\(shop\?\.name\);[\s\S]*?const memberDisplayName = visibleShopName \|\| getMemberName\(member\);[\s\S]*?shopName: shop[\s\S]*?firstTruthy\(visibleShopName, "Public shop active"\)/,
  "Marketplace member rows must represent members by their real public shop name first and never by a phone/email fallback."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceActionStyle[\s\S]*?height: 56[\s\S]*?maxHeight: 56[\s\S]*?function marketplaceInlineActionsStyle[\s\S]*?gridAutoRows: isCompact \? "56px" : "58px"/,
  "Marketplace actions must keep phone-safe heights and inline row reserves."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceOsRowStyle[\s\S]*?height: isCompact \? 116 : 96[\s\S]*?maxHeight: isCompact \? 116 : 96[\s\S]*?42px minmax\(0, 1fr\) 18px[\s\S]*?overflow: "hidden"[\s\S]*?transform: "none"[\s\S]*?flexShrink: 0[\s\S]*?transition: "none"/,
  "Marketplace inner rows must keep phone-safe geometry and tap-stable layout."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceFrontLaneCardStyle[\s\S]*?\.\.\.marketplaceOsRowStyle\(isCompact\)[\s\S]*?minHeight: isCompact \? 76 : 116[\s\S]*?height: isCompact \? 76 : "auto"[\s\S]*?maxHeight: isCompact \? 76 : "none"[\s\S]*?36px minmax\(0, 1fr\) 16px[\s\S]*?padding: isCompact \? 7 : 16[\s\S]*?function marketplaceFrontLaneIconStyle[\s\S]*?width: isCompact \? 36 : 64[\s\S]*?height: isCompact \? 36 : 64/,
  "Marketplace front grouped-lane cards must keep stable icon and row geometry."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceHeroStatCellStyle\(isCompact: boolean\)[\s\S]*?minHeight: isCompact \? 78 : 82[\s\S]*?gridTemplateColumns: isCompact \? "28px minmax\(0, 1fr\)" : "40px minmax\(0, 1fr\)"[\s\S]*?overflow: "hidden"[\s\S]*?function marketplaceHeroStatValueStyle\([\s\S]*?compactLongValue = isCompact && text\.length > 8[\s\S]*?compactVeryLongValue = isCompact && text\.length > 11[\s\S]*?fontSize: isCompact \? \(compactVeryLongValue \? 12\.5 : compactLongValue \? 14 : 20\) : 24[\s\S]*?whiteSpace: "normal"[\s\S]*?overflowWrap: compactLongValue \? "break-word" : "anywhere"[\s\S]*?wordBreak: "break-word"[\s\S]*?marketplaceHeroStatValueStyle\(isCompact, item\.value\)/,
  "Marketplace hero Trust/CCI metric cells must keep long posture words readable on phone instead of spilling across the grid."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function marketplaceFrontTagRowStyle\(isCompact = false\)[\s\S]*?flexWrap: isCompact \? "nowrap" : "wrap"[\s\S]*?overflow: isCompact \? "hidden" : undefined[\s\S]*?function marketplaceFrontTagStyle[\s\S]*?padding: isCompact \? "4px 7px" : "6px 10px"[\s\S]*?whiteSpace: "nowrap"[\s\S]*?overflow: "hidden"[\s\S]*?textOverflow: "ellipsis"[\s\S]*?function marketplaceOsRowTextStackStyle[\s\S]*?overflow: "hidden"[\s\S]*?function marketplaceOsRowDetailStyle[\s\S]*?WebkitLineClamp: isCompact \? 3 : 2[\s\S]*?function marketplaceOsArrowStyle[\s\S]*?width: 18/,
  "Marketplace lane text must stay clamped with stable row arrows."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /scrollElementToMarketplaceLanding[\s\S]*?traceMarketplaceLanding[\s\S]*?\[80, 180, 360, 720, 1200\]\.forEach[\s\S]*?id="marketplace-workspace-alerts"[\s\S]*?marketplaceSectionStyle\(\)[\s\S]*?id="marketplace-workspace-members"[\s\S]*?marketplaceSectionStyle\(\)/,
  "Marketplace Workspace inner buttons must use shared phone-safe section landing instead of raw scrollIntoView."
);

assertContains(
  "src/pages/MarketplaceWorkspacePage.tsx",
  /getAccessToken[\s\S]*?function workspaceCtaPath\(target: CtaTarget\): string[\s\S]*?path\.startsWith\("\/app\/"\)[\s\S]*?next\.set\("session", "expired"\)[\s\S]*?next\.set\("next", path\)[\s\S]*?function workspaceActionRowStyle[\s\S]*?gridAutoRows: "58px"[\s\S]*?function workspaceActionStyle[\s\S]*?height: 58[\s\S]*?workspaceCtaPath\(communityHomeCta\)[\s\S]*?workspaceCtaPath\(marketplaceCta\)[\s\S]*?workspaceActionStyle\(\)[\s\S]*?workspaceCtaPath\(item\.target\)[\s\S]*?workspaceCtaPath\(joinRequestsCta\)/,
  "Public Marketplace Workspace CTAs must send unsigned users through login recovery instead of dumping them directly into private app routes."
);

if (findings.length > 0) {
  console.error("Marketplace action audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace action audit passed.");
