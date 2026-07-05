/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  app: "src/App.tsx",
  routes: "src/lib/appRoutes.ts",
  targets: "src/lib/actionTargetRoutes.ts",
  marketplace: "src/pages/MarketplacePage.tsx",
  shopGallery: "src/pages/ShopGalleryPage.tsx",
  snapshotPaper: "src/lib/gsnSnapshotPaper.ts",
  package: "package.json",
  map: "../docs/GSN_EVIDENCE_DISPLAY_IMPLEMENTATION_MAP_DRAFT.md",
  skeleton: "../docs/CANONICAL_SYSTEM_SKELETON_2026-04-19.md",
  marketplaceProtocol:
    "../docs/GSN_MARKETPLACE_ENGINE_PROTOCOL_2026-06-30.md",
  marketplaceBlueprint: "../docs/MARKETPLACE_PAGE_BLUEPRINT_2026-04-20.md",
  backendMarketplace: "../gmfn_backend/app/api/routes/marketplace.py",
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
    text: String(text).replace(/\s+/g, " ").slice(0, 360),
  });
}

function assertContains(key, pattern, message, text) {
  const source = sourceByKey[key];
  if (pattern.test(source)) return;
  addFinding(key, -1, message, text || pattern.toString());
}

function assertNotContains(key, pattern, message) {
  const source = sourceByKey[key];
  source.split(/\r?\n/).forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file: files[key],
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "map",
  /Marketplace \| `\/app\/marketplace`, `\/app\/marketplace\/community\/:clanId`[\s\S]*?Activity context that can produce or support evidence[\s\S]*?Marketplace activity must not look like TrustSlip proof unless attached to a current TrustSlip or released evidence source/,
  "Evidence display map must keep Marketplace as activity context, not standalone TrustSlip proof."
);

assertContains(
  "map",
  /Public Shop \/ Shop Gallery \| `\/shop\/:gmfnId`, `\/app\/shop`[\s\S]*?Public-facing commerce context, shop identity, products, Spotlight\/public activity[\s\S]*?Shop QR or activity is not TrustSlip verification unless a live TrustSlip code\/source is attached/,
  "Evidence display map must keep Public Shop QR/activity separate from TrustSlip verification."
);

assertContains(
  "map",
  /Audit Marketplace\/Public Shop so shop\/activity context cannot masquerade as[\s\S]*?TrustSlip proof/,
  "Evidence display implementation order must still call out the Marketplace/Public Shop evidence-boundary pass."
);

assertContains(
  "skeleton",
  /One global member ID is entitled to:[\s\S]*?one shop only[\s\S]*?That same shop is the shop that appears across every community\/marketplace the[\s\S]*?member belongs to/,
  "Canonical skeleton must keep one global member ID tied to one shop across marketplaces."
);

assertContains(
  "skeleton",
  /shop ownership follows the one global member ID[\s\S]*?shop exposure is governed by community membership boundaries[\s\S]*?broader exposure can extend only through the approved outward-link\/repost[\s\S]*?logic of the product/,
  "Canonical skeleton must keep public shop exposure community-governed and outward-link/repost bounded."
);

assertContains(
  "marketplaceBlueprint",
  /shop identity follows the one global member ID[\s\S]*?shop exposure is governed by community membership boundaries[\s\S]*?broader outward exposure can extend only through the approved share\/repost[\s\S]*?logic of the product/,
  "Marketplace blueprint must keep shop identity global but exposure community-governed."
);

assertContains(
  "marketplaceProtocol",
  /Marketplace into a payment processor[\s\S]*?The Marketplace never holds customer funds[\s\S]*?It is evidence infrastructure, not a payment processor/,
  "Marketplace protocol must keep commerce records non-custodial and outside payment processing."
);

assertContains(
  "marketplaceProtocol",
  /Analytics inform decisions but do not create trust[\s\S]*?treat transaction volume as Trust/,
  "Marketplace protocol must forbid treating commerce volume or analytics as trust proof."
);

assertContains(
  "app",
  /const ShopGalleryPage = React\.lazy\(\(\) => import\("\.\/pages\/ShopGalleryPage"\)\);[\s\S]*?<Route path="\/shop\/:gmfnId" element=\{<ShopGalleryPage \/>\} \/>[\s\S]*?<Route path="\/shop-gallery\/:gmfnId" element=\{<RedirectPublicShopAlias \/>\} \/>[\s\S]*?<Route path="\/open-shop\/:gmfnId" element=\{<RedirectPublicShopAlias \/>\} \/>/,
  "Public shop route and aliases must keep routing to the Shop Gallery public surface."
);

assertContains(
  "routes",
  /MARKETPLACE: "\/app\/marketplace"[\s\S]*?SHOP: "\/app\/shop-control"[\s\S]*?SHOP_ME: "\/app\/shop-control"/,
  "Signed-in Marketplace and owner Shop Control route constants must stay separate."
);

assertContains(
  "targets",
  /marketplace: ACTION_TARGETS\.MARKETPLACE[\s\S]*?shop: ACTION_TARGETS\.SHOP_ME[\s\S]*?"shop-gallery": ACTION_TARGETS\.SHOP_ME[\s\S]*?"open-shop": ACTION_TARGETS\.SHOP_ME/,
  "Shared action targets must send generic shop actions to owner Shop Control, not treat public shop links as signed-in trust proof."
);

assertContains(
  "targets",
  /\/\^shop\\\/\[\^\/\]\+\$\/\.test\(value\)[\s\S]*?\/\^open-shop\\\/\[\^\/\]\+\$\/\.test\(value\)[\s\S]*?\/\^shop-gallery\\\/\[\^\/\]\+\$\/\.test\(value\)/,
  "Shared target sanitizer must still recognize public shop aliases as explicit public paths."
);

assertContains(
  "snapshotPaper",
  /title: "GSN Public Shop"[\s\S]*?note: "Evidence only\. Open this shop link to check current items and visible evidence\."/,
  "Compact public shop share package must call the public shop link evidence only."
);

assertContains(
  "snapshotPaper",
  /title: "GSN Public Shop Invitation"[\s\S]*?purpose: "Open this shop link to view the public shop page and visible public items\."[\s\S]*?Privacy: only public shop information is shown\. Private Vault items[\s\S]*?Limitation: verify current price, availability, and trust evidence before relying on the offer\./,
  "Public Shop invitation paper must keep public-only privacy and current trust-evidence limitation."
);

assertContains(
  "shopGallery",
  /const shopTrustCheckOptions = \[[\s\S]*?Request TrustSlip for current evidence[\s\S]*?Ask community for extra confirmation[\s\S]*?Use IDs to avoid name confusion/,
  "Shop Gallery trust check options must push users toward current TrustSlip, community confirmation, and ID matching."
);

assertContains(
  "shopGallery",
  /const shopCommerceDecisionText =[\s\S]*?Before credit, goods, or money move, read the shop ID, Community[\s\S]*?ID, current TrustSlip, and community confirmation together[\s\S]*?evidence for judgement, not approval to[\s\S]*?release goods or credit/,
  "Shop Gallery commerce decision copy must prevent shop context from becoming goods/credit release authority."
);

assertContains(
  "shopGallery",
  /function buildPublicShopMessage\(link: string, itemName\?: string\):[\s\S]*?return buildGsnPublicShopLinkMessage/,
  "Shop Gallery public share message must use the shared GSN public shop evidence-copy helper."
);

assertContains(
  "shopGallery",
  /async function requestShopTrustSlip\(\)[\s\S]*?Please send the current TrustSlip or merchant verification record[\s\S]*?Ask the owner for the current TrustSlip or merchant verification record[\s\S]*?TrustSlip request copied/,
  "Shop Gallery TrustSlip request must ask for current TrustSlip or merchant verification instead of treating the shop page as proof."
);

assertContains(
  "shopGallery",
  /Shop verification[\s\S]*?Verify this shop before you trade[\s\S]*?Request a[\s\S]*?live TrustSlip when you need current evidence from the owner[\s\S]*?Shop and community IDs do not show member-witness[\s\S]*?currentness[\s\S]*?by themselves/,
  "Shop Gallery visible verification panel must say IDs alone do not prove current member-witness trust."
);

assertContains(
  "shopGallery",
  /debugId="shop-gallery\.verify-shop\.request-trustslip"[\s\S]*?Request TrustSlip[\s\S]*?debugId="shop-gallery\.verify-shop\.toggle-scan"[\s\S]*?debugId="shop-gallery\.verify-shop\.open-community-record"/,
  "Shop Gallery verification actions must keep TrustSlip, scan, and community-record paths traceable."
);

assertContains(
  "shopGallery",
  /Before goods or money move[\s\S]*?\{shopCommerceDecisionText\}[\s\S]*?\{shopTrustCheckOptions\.map/,
  "Shop Gallery before-trade panel must render the evidence boundary and trust-check options."
);

assertContains(
  "shopGallery",
  /This shared link opens only this public shop block[\s\S]*?These are the 12 public blocks anyone can browse or share/,
  "Shop Gallery block links must remain scoped public block links, not broad private shop evidence."
);

assertContains(
  "marketplace",
  /Non-custodial evidence record only\. GSN does not hold money, guarantee delivery, or release funds automatically/,
  "Marketplace trade paper must keep the non-custodial boundary note."
);

assertContains(
  "marketplace",
  /Title: GSN Trade Evidence Paper[\s\S]*?Purpose: Recorded trade evidence\. GSN does not hold money or release funds\.[\s\S]*?Privacy: private trade record\. Do not forward as public verification unless GSN provides a public link for this exact record\.[\s\S]*?Limitation: evidence only\. Not escrow, payout approval, bank confirmation, or delivery guarantee\./,
  "Marketplace Trade Evidence Paper must stay private evidence, not public verification or payment authority."
);

assertContains(
  "marketplace",
  /boundary:\s*[\s\S]*?Non-custodial record only\. Not escrow, not automatic[\s\S]*?payout, not a delivery guarantee[\s\S]*?not_escrow: true[\s\S]*?not_money_custody: true[\s\S]*?not_payout: true[\s\S]*?not_bank_confirmation: true[\s\S]*?not_delivery_guarantee: true[\s\S]*?not_release_authority: true/,
  "Marketplace protected-trade creation metadata must keep all non-custodial and non-release flags."
);

assertContains(
  "marketplace",
  /Evidence update only\. Not escrow, not automatic payout, not[\s\S]*?a bank guarantee, not a delivery guarantee/,
  "Marketplace protected-trade event metadata must keep update-only, non-escrow boundaries."
);

assertContains(
  "marketplace",
  /This is evidence, not escrow[\s\S]*?This creates evidence, not escrow/,
  "Marketplace visible Trade Evidence guidance must keep evidence-not-escrow language."
);

assertContains(
  "backendMarketplace",
  /This shop has a public community record\. Ask the owner for current TrustSlip evidence when you need a fresh check[\s\S]*?This shop can be reopened by QR\. Ask the owner for TrustSlip or community confirmation before trading/,
  "Backend public shop plain-language copy must ask for TrustSlip/community confirmation instead of treating the shop QR as verification."
);

assertContains(
  "package",
  /"audit:marketplace-shop-evidence-boundary": "node tools\/audit-marketplace-shop-evidence-boundary\.mjs"/,
  "Marketplace/Public Shop evidence boundary audit must stay registered in package scripts."
);

assertNotContains(
  "shopGallery",
  /shopCommerceDecisionText\s*=[\s\S]*?(approval to release goods|approval to release credit|authorizes goods|authorizes credit)/,
  "Shop Gallery commerce decision text must not claim approval or release authority."
);

if (findings.length > 0) {
  console.error("Marketplace / Public Shop evidence boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Marketplace / Public Shop evidence boundary audit passed: shop, QR, Spotlight, and trade context stay evidence context, not TrustSlip proof, payment custody, escrow, payout, bank confirmation, delivery guarantee, or release authority."
);
