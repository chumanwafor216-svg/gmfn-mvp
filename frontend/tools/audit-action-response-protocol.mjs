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
      text: "Expected response-protocol pattern was not found.",
    });
  }
}

function assertCriticalActionsDeclareDebugIds(file, debugIds) {
  const text = read(file);

  for (const debugId of debugIds) {
    if (!text.includes(`debugId="${debugId}"`)) {
      findings.push({
        file,
        line: 1,
        message: `Critical action is missing debugId ${debugId}.`,
        text: "Expected debugId was not found.",
      });
    }
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);

  if (pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Forbidden response-protocol pattern was found.",
    });
  }
}

assertContains(
  "src/lib/actionResponseProtocol.ts",
  /buildActionBlockedMessage[\s\S]*?buildActionSuccessMessage/,
  "Shared action-response language helper must exist."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /buildActionBlockedMessage[\s\S]*?function finishBlockedMessage\(\)[\s\S]*?handleFinishRegistration\(feedbackTargetForFinish: FeedbackTarget = "community"\)[\s\S]*?showError\(feedbackTargetForFinish[\s\S]*?buildActionSuccessMessage[\s\S]*?Opening First Circle now/,
  "Start Community finish actions must answer in the visible action surface and show a success handoff before routing."
);

assertNotContains(
  "src/pages/CreateEntryPage.tsx",
  /showSuccess\(feedbackTargetForFinish, successMessage\);\s*showSuccess\("community", successMessage\);/,
  "Start Community finish success must not be immediately overwritten into the hidden Community panel."
);

assertCriticalActionsDeclareDebugIds("src/pages/CreateEntryPage.tsx", [
  "create-entry.photo.finish-registration",
  "create-entry.bank.finish-registration",
  "create-entry.official-id.finish-registration",
  "create-entry.verification.finish-registration",
  "create-entry.community.finish-registration",
]);

assertContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /focusedAction[\s\S]*?openInviteFocus[\s\S]*?closeFocusedAction[\s\S]*?const opened = window\.open\([\s\S]*?WhatsApp could not open[\s\S]*?WhatsApp invite opened[\s\S]*?Opening email invite now[\s\S]*?const opened = window\.open\([\s\S]*?Facebook could not open[\s\S]*?Facebook invite opened/,
  "First Circle invite actions must remain focused and must answer blocked popup, email handoff, and success states."
);

assertCriticalActionsDeclareDebugIds("src/pages/BuildFirstCirclePage.tsx", [
  "build-first-circle.focus-invite",
  "build-first-circle.quick.phone-contacts",
  "build-first-circle.quick.whatsapp",
  "build-first-circle.quick.email",
  "build-first-circle.quick.facebook",
  "build-first-circle.quick.share",
  "build-first-circle.quick.copy",
]);

assertNotContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /disabled=\{!inviteLink\}/,
  "First Circle invite options must stay tappable so they can explain when the invite link is not ready."
);

assertNotContains(
  "src/pages/BuildFirstCirclePage.tsx",
  /disabled=\{readyContacts\.length === 0\}/,
  "First Circle copy-message actions must stay tappable so they can explain when the contact list is not ready."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /noticeStyle\("error"\)[\s\S]*?noticeStyle\("success"\)[\s\S]*?Join request submitted successfully\./,
  "Join Entry must continue to show success and error response cards."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /case "circle":[\s\S]*?Opening First Circle now\.[\s\S]*?openCommunityRoute\(event, routes\.buildFirstCircle\)/,
  "Community Home circle actions must route First Circle directly instead of opening hidden sections."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /showNotice\("error"[\s\S]*?noticeCard\(notice\.tone\)[\s\S]*?showNotice\("success", "Opening this community now\."\)|showNotice\("success", "Opening this community now\."[\s\S]*?showNotice\("error"[\s\S]*?noticeCard\(notice\.tone\)/,
  "Community Home actions must keep visible success/error notice responses, including repeated marketplace open feedback."
);

assertNotContains(
  "src/pages/CommunityHomePage.tsx",
  /debugId="community-home\.owner-actions\.(?:marketplace-links|selected-marketplace)"[\s\S]{0,500}?disabled=\{!selectedClanId \|\| changingClanId === selectedClanId\}/,
  "Community Home owner marketplace buttons must stay tappable so they can explain when no community is selected."
);

assertContains(
  "src/pages/MarketplacePage.tsx",
  /function openMarketplaceEmail[\s\S]*?Opening email now\.[\s\S]*?function openMarketplaceExternalLink[\s\S]*?const opened = window\.open[\s\S]*?browser blocked that window[\s\S]*?Opening link now\.[\s\S]*?noticeCard\(notice\.tone\)/,
  "Marketplace actions must keep visible success/error notice responses, including external and email handoffs."
);

assertContains(
  "src/pages/ShopControlPage.tsx",
  /async function copyText[\s\S]*?const copied = await safeCopy\(text\)[\s\S]*?Clipboard copy was blocked[\s\S]*?function openExternalLink[\s\S]*?Link is not ready yet\.[\s\S]*?const opened = window\.open[\s\S]*?browser blocked that window[\s\S]*?Opening link now\.[\s\S]*?setSpotlightPublishFeedback[\s\S]*?noticeCard\(notice\.tone\)/,
  "Shop Control actions must keep visible success/error notice responses, including copy/open failures and spotlight publish feedback."
);

assertContains(
  "src/pages/ShopAssetsPage.tsx",
  /async function copyText[\s\S]*?missingMessage = "Nothing to copy yet\."[\s\S]*?const copied = await safeCopy\(text\)[\s\S]*?Clipboard copy was blocked[\s\S]*?function openShopLink[\s\S]*?Public shop link is not ready yet[\s\S]*?const opened = window\.open[\s\S]*?browser blocked the public shop window[\s\S]*?This item is hidden\. Restore it before copying a public shop link\./,
  "Shop Assets inner buttons must explain missing links, blocked windows, hidden items, and clipboard failures."
);

assertContains(
  "src/pages/VaultControlPage.tsx",
  /async function copyVaultPaymentInstruction[\s\S]*?const copied = await safeCopy\(text\)[\s\S]*?Clipboard copy was blocked[\s\S]*?const copiedReference = reference \? await safeCopy\(reference\)[\s\S]*?async function createViewingLink[\s\S]*?const copied = url \? await safeCopy\(url\)[\s\S]*?async function copySelectedBlockLink[\s\S]*?const copied = await safeCopy\(selectedBlockLinkUrl\)[\s\S]*?function openSelectedBlockLink[\s\S]*?const opened = window\.open[\s\S]*?browser blocked the private view window/,
  "Vault Control inner buttons must answer missing links, blocked copy, generated-code copy, and blocked private-view windows."
);

assertNotContains(
  "src/pages/VaultControlPage.tsx",
  /debugId="vault-control\.(?:copy-payment-details|link\.copy|link\.open-private-view)"[\s\S]{0,260}?disabled=\{(?:vaultPaymentTransferLines\.length === 0|!selectedBlockLinkUrl)\}/,
  "Vault Control copy/open buttons must stay tappable so missing payment details or links can be explained."
);

assertContains(
  "src/pages/NotificationsPage.tsx",
  /actionNotice[\s\S]*?setActionNotice[\s\S]*?Notice marked as read\.[\s\S]*?Opening \$\{normalizedNotice\.ctaLabel \|\| "the next page"\} now\.[\s\S]*?actionNoticeCard\(actionNotice\.tone\)/,
  "Notifications actions must answer when marking read, reviewing, or opening the next route."
);

if (findings.length > 0) {
  console.error("Action response protocol audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Action response protocol audit passed.");
