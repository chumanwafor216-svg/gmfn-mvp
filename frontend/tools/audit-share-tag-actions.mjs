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
  text.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

[
  ["src/lib/share.ts", /normalizeSocialHandle/, "Social handle cleanup must stay shared."],
  [
    "src/lib/share.ts",
    /socialMessage\?: string;[\s\S]*socialUrl\?: string;[\s\S]*buildCompactSocialShareText[\s\S]*normalizeUrl\(target\.socialUrl \|\| target\.url\)[\s\S]*platform === "x" \? \(includeUrl \? 260 : 210\) : 520/,
    "Social share helpers must keep short channel captions so X/LinkedIn/etc. do not receive headed-paper packages.",
  ],
  [
    "src/lib/share.ts",
    /export function buildPublicShareText[\s\S]*const message = trimAtWord\(socialMessageForTarget\(target\), 220\);[\s\S]*return \[title, url, message\]\.filter\(Boolean\)\.join\("\\n"\);/,
    "Public WhatsApp/email/copy-message text must stay compact and let the verification link carry the full record.",
  ],
  [
    "src/lib/share.ts",
    /function compactPaperMessage[\s\S]*valueFor\("Title"\)[\s\S]*valueFor\([\s\S]*"Main reading"[\s\S]*"Visible trust reading"[\s\S]*"Portable trust reading"[\s\S]*"Verification"[\s\S]*"Status"[\s\S]*"Trade status"[\s\S]*"Evidence only\. Open the link to check the current public GSN record\."/,
    "Official paper share captions must keep only the useful title/context/reading and move full detail to the link.",
  ],
  [
    "src/lib/gsnSnapshotPaper.ts",
    /Generated \(UTC\): \$\{generatedAt\}[\s\S]*Security note: Keep the GSN mark, generated time, record code, privacy note, and limitation note with any copy[\s\S]*buildGsnCompactPublicLinkPackage[\s\S]*GSN Public Record[\s\S]*Evidence only\. Open this GSN record and check the current public details before you act[\s\S]*buildGsnCommunityVerifyLinkMessage[\s\S]*Evidence only\. Open this link to check the current public community record[\s\S]*buildGsnInviteLinkMessage[\s\S]*Open this invite to request access[\s\S]*buildGsnPublicShopLinkMessage[\s\S]*Evidence only\. Open this shop link to check current items and visible evidence[\s\S]*buildGsnVaultInviteMessage[\s\S]*Open this private link to view the selected Vault block/,
    "Public link packages must have compact forwarding messages separate from full snapshot/evidence papers.",
  ],
  [
    "src/lib/trustDocumentSnapshots.ts",
    /buildTrustSlipShareText[\s\S]*Known here as[\s\S]*Evidence only\. Open the link to check the current public GSN record\.[\s\S]*buildTrustSlipVerifyShareText[\s\S]*Known here as[\s\S]*Evidence only\. Open the link to check the current public GSN record\.[\s\S]*buildTrustPassportShareText[\s\S]*Known here as[\s\S]*Community evidence[\s\S]*Evidence only\. Open the link to check the current public GSN record\./,
    "Trust document public share text must stay compact and let the verification link carry the full record.",
  ],
  ["src/lib/share.ts", /buildXIntentShareUrl/, "X intent share URL helper is missing."],
  [
    "src/lib/share.ts",
    /params\.set\("text", text\)[\s\S]*params\.set\("url", url\)[\s\S]*buildFacebookShareUrl[\s\S]*normalizeUrl\(target\.socialUrl \|\| target\.url\)[\s\S]*buildLinkedInShareUrl[\s\S]*normalizeUrl\(target\.socialUrl \|\| target\.url\)/,
    "X/Facebook/LinkedIn sharing must use the scraper-friendly social URL while passing X URL separately from the short caption.",
  ],
  ["src/lib/share.ts", /buildFacebookShareUrl/, "Facebook share URL helper is missing."],
  ["src/lib/share.ts", /buildLinkedInShareUrl/, "LinkedIn share URL helper is missing."],
  [
    "src/lib/share.ts",
    /x\|twitter\|facebook\|instagram\|linkedin\|tiktok/,
    "Social handle cleanup must accept the supported social domains.",
  ],
  ["src/lib/share.ts", /buildMailtoShareUrl/, "Email fallback share URL helper is missing."],
  [
    "src/lib/share.ts",
    /return `\$\{tag\}\$\{buildPublicShareText\(target\)\}`\.trim\(\);[\s\S]*buildMailtoShareUrl[\s\S]*const text = buildPublicShareText\(target\);/,
    "Social copy and email fallback must use compact public share text instead of full official-paper packages.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /it cannot guarantee delivery/i,
    "Social share UI must not imply guaranteed delivery.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /useState<\{ tone: NoticeTone; text: string \} \| null>\(null\)[\s\S]*setLocalNotice\(\{ tone, text \}\)[\s\S]*color: localNotice\.tone === "success" \? "#12633F" : "#9F1239"/,
    "Social share chooser must render success and error feedback with different local tones.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /Handle or name, if needed[\s\S]*placeholder="@handle or name"/,
    "Social share UI must keep one simple optional handle/name field.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /gridTemplateColumns: "repeat\(auto-fit, minmax\(118px, 1fr\)\)"/,
    "Social share channel buttons must stay compact and responsive.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.x"/,
    "X tag action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.facebook"/,
    "Facebook share action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.linkedin"/,
    "LinkedIn share action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.instagram-copy"/,
    "Instagram copy action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.tiktok-copy"/,
    "TikTok copy action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.copy-all"/,
    "Copy-all social action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.copy-text"/,
    "Copy text action debugId is missing.",
  ],
  [
    "src/components/SocialTagShareButton.tsx",
    /debugId="social-tag-share\.close"/,
    "Close action debugId is missing.",
  ],
  [
    "src/components/ShareActions.tsx",
    /buildPublicShareText[\s\S]*const publicShareText = useMemo[\s\S]*buildWhatsAppUrl\(publicShareText\)[\s\S]*debugId="share-actions\.copy-link"[\s\S]*debugId="share-actions\.whatsapp"[\s\S]*debugId="share-actions\.tag-social"/,
    "ShareActions must keep copy, WhatsApp, and social tag fallbacks together.",
  ],
  [
    "src/components/ShareButtons.tsx",
    /buildPublicShareText[\s\S]*const publicShareText = useMemo[\s\S]*copyToClipboard\(publicShareText\)[\s\S]*buildWhatsAppUrl\(publicShareText\)[\s\S]*debugId="share-buttons\.copy-link"[\s\S]*debugId="share-buttons\.whatsapp"[\s\S]*debugId="share-buttons\.copy-text"[\s\S]*debugId="share-buttons\.tag-social"[\s\S]*debugId="share-buttons\.qr"/,
    "ShareButtons must keep copy, WhatsApp, social tag, and QR fallbacks together.",
  ],
  [
    "src/pages/BuildFirstCirclePage.tsx",
    /debugId="build-first-circle\.tag-invite"/,
    "Build First Circle invite surface is missing social tag sharing.",
  ],
  [
    "src/pages/ClansPage.tsx",
    /buildGsnInviteLinkMessage[\s\S]*whatsappShareText: compactShareText[\s\S]*Share message[\s\S]*copyText\(inviteState\.whatsappShareText \|\| "", "share"\)[\s\S]*Copy share message[\s\S]*Share on WhatsApp/,
    "Community invite sharing must show and copy the compact invite message, not the full formal invite paper.",
  ],
  [
    "src/pages/MarketplacePage.tsx",
    /debugId="marketplace\.links\.join\.tag-social"/,
    "Marketplace join-link surface is missing social tag sharing.",
  ],
  [
    "src/pages/MarketplacePage.tsx",
    /publicShopSocialPreviewUrl[\s\S]*const publicShopSocialPreviewLink[\s\S]*socialUrl: publicShopSocialPreviewLink[\s\S]*debugId="marketplace\.public-shop\.tag-social"/,
    "Marketplace public-shop surface must send social apps the backend share-preview URL.",
  ],
  [
    "src/pages/TrustSlipVerifyPage.tsx",
    /debugId="trust-slip-verify\.public\.tag-social"/,
    "TrustSlip Verify public surface is missing social tag sharing.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /buildGsnPublicShopLinkMessage[\s\S]*function buildPublicShopMessage[\s\S]*message: buildPublicShopMessage\(absoluteShopShareLink\)[\s\S]*socialMessage: `\$\{firstMeaningful\([\s\S]*?Public shop record\. Open the shop link\.[\s\S]*socialUrl: firstMeaningful\([\s\S]*?publicShopSocialPreviewUrl[\s\S]*buttonLabel="Share"[\s\S]*buttonKind="primary"[\s\S]*debugId="shop-gallery\.share-shop"[\s\S]*debugId="shop-gallery\.owner-contact\.choose"/,
    "Public Shop Share must open the social chooser with compact public-shop text and backend social-preview URL.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /async function copyShopLink\(\)[\s\S]*safeCopy\([\s\S]*buildPublicShopMessage\(absoluteShopShareLink\)[\s\S]*GSN public shop invitation copied\./,
    "Public Shop Copy action must copy compact public-shop link text, not a full formal paper.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /const diaryOpenActionCount = showBlockPlacementAction \? 4 : 2;/,
    "Shop Diary blocks must reserve the block social share slot for owners only.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /const productSocialUrl = publicShopSocialPreviewUrl\([\s\S]*const socialMessage = \[[\s\S]*Open \$\{blockLabel\} on GSN\.[\s\S]*message: buildPublicShopMessage\(productUrl, productTitle\),[\s\S]*socialMessage,[\s\S]*socialUrl: productSocialUrl,[\s\S]*showBlockPlacementAction \? \([\s\S]*<SocialTagShareButton[\s\S]*target=\{buildProductSocialShareTarget\(product\)\}[\s\S]*debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.owner-share`\}/,
    "Shop Diary block social sharing must stay owner-only and use compact link text plus backend social-preview URL.",
  ],
  [
    "src/pages/VaultControlPage.tsx",
    /import SocialTagShareButton from "\.\.\/components\/SocialTagShareButton";[\s\S]*function buildVaultSocialShareTarget\(\)[\s\S]*buildVaultInvitePackage\(selectedBlockLinkUrl, selectedBlockPrimaryLink\)[\s\S]*<SocialTagShareButton[\s\S]*target=\{buildVaultSocialShareTarget\(\)\}[\s\S]*disabled=\{!selectedBlockLinkUrl\}[\s\S]*buttonLabel="Share block"[\s\S]*debugId="vault-control\.link\.social-share"/,
    "Vault private block social sharing must stay owner-issued and disabled until a private Vault link exists.",
  ],
].forEach(([file, pattern, message]) => assertContains(file, pattern, message));

assertNotContains(
  "src/components/SocialTagShareButton.tsx",
  /\bfetch\s*\(|XMLHttpRequest|axios\.|method:\s*["']POST["']|access_token|client_secret/i,
  "Social tag sharing must stay user-controlled and must not become an auto-post/API integration."
);

assertNotContains(
  "src/components/SocialTagShareButton.tsx",
  /guaranteed|sent to them|delivered/i,
  "Social tag copy must not promise delivery."
);

assertNotContains(
  "src/components/SocialTagShareButton.tsx",
  /setXHandle|setInstagramHandle|setTiktokHandle|setLinkedinHandle|Tag on X|Instagram copy|TikTok copy/,
  "Social share chooser must stay simple: one optional handle/name field and short channel labels."
);

assertNotContains(
  "src/lib/gsnSnapshotPaper.ts",
  /Official GSN public record|Prepared for you \(UTC\)|Footer: Global Support Network|record code, privacy limit, and limitation/,
  "Core public snapshot paper must not restore long headed-paper boilerplate in copied/shareable messages."
);

assertNotContains(
  "src/lib/trustDocumentSnapshots.ts",
  /cleanLine\("Verify link"|cleanLine\("Member credential link"/,
  "TrustSlip snapshot body must not duplicate verification or credential URLs already carried by the public record link."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /shop-gallery\.share-tag-social/,
  "Public Shop must not restore a separate Tag button; Share opens the chooser and WhatsApp stays separate."
);

assertNotContains(
  "src/pages/ShopGalleryPage.tsx",
  /shop-gallery\.product\.\$\{productOpenId\}\.share/,
  "Shop Diary product share must not be visitor-facing; use the owner-only owner-share action."
);

assertNotContains(
  "src/pages/ShopAccessPage.tsx",
  /SocialTagShareButton|social-share|share-tag|tag-social/,
  "Vault access recipients must not get a private-link rebroadcast chooser from the visitor page."
);

assertNotContains(
  "src/pages/ClansPage.tsx",
  /GSN invite paper|Copy GSN invite paper|Copied paper/,
  "Community invite copy must not restore the long formal invite paper as the normal public share message."
);

if (findings.length > 0) {
  console.error("Share/tag action audit failed:");
  findings.forEach((finding) => {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  });
  process.exit(1);
}

console.log(
  "Share/tag action audit passed: social tagging stays user-controlled and copy/WhatsApp/email-style fallbacks remain caged."
);
