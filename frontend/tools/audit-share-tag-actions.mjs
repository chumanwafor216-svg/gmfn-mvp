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
    /socialMessage\?: string;[\s\S]*buildCompactSocialShareText[\s\S]*platform === "x" \? \(includeUrl \? 260 : 210\) : 520/,
    "Social share helpers must keep short channel captions so X/LinkedIn/etc. do not receive headed-paper packages.",
  ],
  ["src/lib/share.ts", /buildXIntentShareUrl/, "X intent share URL helper is missing."],
  [
    "src/lib/share.ts",
    /params\.set\("text", text\)[\s\S]*params\.set\("url", url\)/,
    "X sharing must pass the URL separately from the short caption to avoid overlong compose text.",
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
    "src/components/SocialTagShareButton.tsx",
    /it cannot guarantee delivery/i,
    "Social share UI must not imply guaranteed delivery.",
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
    /debugId="share-actions\.copy-link"[\s\S]*debugId="share-actions\.whatsapp"[\s\S]*debugId="share-actions\.tag-social"/,
    "ShareActions must keep copy, WhatsApp, and social tag fallbacks together.",
  ],
  [
    "src/components/ShareButtons.tsx",
    /debugId="share-buttons\.copy-link"[\s\S]*debugId="share-buttons\.whatsapp"[\s\S]*debugId="share-buttons\.copy-text"[\s\S]*debugId="share-buttons\.tag-social"[\s\S]*debugId="share-buttons\.qr"/,
    "ShareButtons must keep copy, WhatsApp, social tag, and QR fallbacks together.",
  ],
  [
    "src/pages/BuildFirstCirclePage.tsx",
    /debugId="build-first-circle\.tag-invite"/,
    "Build First Circle invite surface is missing social tag sharing.",
  ],
  [
    "src/pages/MarketplacePage.tsx",
    /debugId="marketplace\.links\.join\.tag-social"/,
    "Marketplace join-link surface is missing social tag sharing.",
  ],
  [
    "src/pages/MarketplacePage.tsx",
    /debugId="marketplace\.public-shop\.tag-social"/,
    "Marketplace public-shop surface is missing social tag sharing.",
  ],
  [
    "src/pages/TrustSlipVerifyPage.tsx",
    /debugId="trust-slip-verify\.public\.tag-social"/,
    "TrustSlip Verify public surface is missing social tag sharing.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /<SocialTagShareButton[\s\S]*socialMessage: `\$\{firstMeaningful\([\s\S]*?Trusted public shop\. Open the shop link\.[\s\S]*buttonLabel="Share"[\s\S]*buttonKind="primary"[\s\S]*debugId="shop-gallery\.share-shop"[\s\S]*debugId="shop-gallery\.owner-contact\.choose"/,
    "Public Shop Share must open the social chooser with a short social caption while WhatsApp/formal copy stay separate.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /const diaryOpenActionCount = showBlockPlacementAction \? 4 : 2;/,
    "Shop Diary blocks must reserve the block social share slot for owners only.",
  ],
  [
    "src/pages/ShopGalleryPage.tsx",
    /const socialMessage = \[[\s\S]*Open \$\{blockLabel\} on GSN\.[\s\S]*message: buildPublicShopPackage\(productUrl, \[message\]\),[\s\S]*socialMessage,[\s\S]*showBlockPlacementAction \? \([\s\S]*<SocialTagShareButton[\s\S]*target=\{buildProductSocialShareTarget\(product\)\}[\s\S]*debugId=\{`shop-gallery\.product\.\$\{productOpenId\}\.owner-share`\}/,
    "Shop Diary block social sharing must stay owner-only and use a short social caption in the shared chooser.",
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
