/* global console, process */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");

const findings = [];

const requiredBasePackAssets = [
  {
    key: "trust-shield",
    fileName: "icon-trust-shield-3d.webp",
    importName: "trustShieldIconUrl",
  },
  {
    key: "community-building",
    fileName: "icon-community-building-3d.webp",
    importName: "communityBuildingIconUrl",
  },
  {
    key: "shop-storefront",
    fileName: "icon-shop-storefront-3d.webp",
    importName: "shopStorefrontIconUrl",
  },
  {
    key: "market-stall",
    fileName: "icon-market-stall-3d.webp",
    importName: "marketStallIconUrl",
  },
  {
    key: "vault-safe",
    fileName: "icon-vault-safe-3d.webp",
    importName: "vaultSafeIconUrl",
  },
  {
    key: "finance-bank-building",
    fileName: "icon-finance-bank-building-3d.webp",
    importName: "financeBankBuildingIconUrl",
  },
  {
    key: "finance-wallet-card",
    fileName: "icon-finance-wallet-card-3d.webp",
    importName: "financeWalletCardIconUrl",
  },
  {
    key: "repayment-schedule",
    fileName: "icon-repayment-schedule-3d.webp",
    importName: "repaymentScheduleIconUrl",
  },
  {
    key: "records-folder",
    fileName: "icon-records-folder-3d.webp",
    importName: "recordsFolderIconUrl",
  },
  {
    key: "certificate-seal",
    fileName: "icon-certificate-seal-3d.webp",
    importName: "certificateSealIconUrl",
  },
  {
    key: "join-person-plus",
    fileName: "icon-join-person-plus-3d.webp",
    importName: "joinPersonPlusIconUrl",
  },
  {
    key: "spotlight-megaphone",
    fileName: "icon-spotlight-megaphone-3d.webp",
    importName: "spotlightMegaphoneIconUrl",
  },
  {
    key: "audio-speaker",
    fileName: "icon-audio-speaker-3d.webp",
    importName: "audioSpeakerIconUrl",
  },
  {
    key: "media-video",
    fileName: "icon-media-video-3d.webp",
    importName: "mediaVideoIconUrl",
  },
  {
    key: "identity-card",
    fileName: "icon-identity-card-3d.webp",
    importName: "identityCardIconUrl",
  },
  {
    key: "phone-contact",
    fileName: "icon-phone-contact-3d.webp",
    importName: "phoneContactIconUrl",
  },
  {
    key: "qr-record",
    fileName: "icon-qr-record-3d.webp",
    importName: "qrRecordIconUrl",
  },
  {
    key: "public-globe",
    fileName: "icon-public-globe-3d.webp",
    importName: "publicGlobeIconUrl",
  },
];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

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

function assertFileExists(file, message) {
  if (!existsSync(join(repoRoot, file))) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected file was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
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

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /## GSN Icon Protocol[\s\S]*?premium skeuomorphic \/ realistic 3D[\s\S]*?Use premium realistic 3D icons, not flat or outline icons\./,
  "Design system must define the GSN premium realistic 3D icon protocol."
);

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /Every main icon must look like a real object, place, or tool\.[\s\S]*?Icons inside the UI must be realistic 3D object icons, not literal photos and\s+not flat symbols\./,
  "Design system must preserve the real-object and non-photo icon rules."
);

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /Avoid:[\s\S]*?flat icons[\s\S]*?outline icons[\s\S]*?line icons[\s\S]*?cartoon icons[\s\S]*?faded glyph icons[\s\S]*?emoji as primary UI icons/,
  "Design system must keep the forbidden primary icon list."
);

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /spotlight = real loudspeaker or megaphone for announcement\/publicity[\s\S]*?sound controls = real speaker\/loudspeaker for audio on\/off[\s\S]*?video\/media = video camera or playable media object, not a megaphone[\s\S]*?community home = premium house, hall, or civic building[\s\S]*?shop \/ marketplace = shopfront, market stall, or real trading place[\s\S]*?vault = safe box[\s\S]*?finance = bank building, cash drawer, or institutional money house[\s\S]*?wallet\/card = personal payout, payment-detail, or card context[\s\S]*?repayment = calendar or payment plan with money\/check evidence[\s\S]*?trust = shield badge or seal[\s\S]*?proof\/certificate = sealed paper, certificate packet, or evidence package[\s\S]*?records = document folder[\s\S]*?join = person-plus/,
  "Design system must keep the object-meaning map for GSN icons."
);

assertContains(
  "docs/UX_ACCEPTANCE_CHECKLIST.md",
  /Meaningful icons follow the GSN Icon Protocol: premium realistic 3D object\s+icons, not flat, outline, faded, cartoon, or emoji-style primary icons\./,
  "UX acceptance checklist must require the GSN Icon Protocol."
);

assertContains(
  "docs/GSN_MOBILE_UI_PROTOCOL.md",
  /Use premium realistic 3D object icons for meaning, not decoration\.[\s\S]*?Do not use flat, outline, faded, cartoon, or emoji-style icons as primary UI\s+icons\./,
  "Mobile UI protocol must require premium realistic 3D object icons."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /frontend\/src\/components\/TrustPaperMarks\.tsx` is an outline SVG icon family\.[\s\S]*?TrustPaperMarks\.tsx` is a transitional compatibility layer, not the final\s+GSN icon system\./,
  "Icon migration plan must state that TrustPaperMarks is transitional, not the final 3D icon system."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /frontend\/src\/assets\/gsn-icons\/[\s\S]*?icon-trust-shield-3d\.webp[\s\S]*?icon-community-building-3d\.webp[\s\S]*?icon-shop-storefront-3d\.webp[\s\S]*?icon-market-stall-3d\.webp[\s\S]*?icon-vault-safe-3d\.webp[\s\S]*?icon-finance-bank-building-3d\.webp[\s\S]*?icon-finance-wallet-card-3d\.webp/,
  "Icon migration plan must define the future 3D icon asset home and core filenames."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /Public proof and entry surfaces:[\s\S]*?CoverPage[\s\S]*?WelcomePage[\s\S]*?CommunityVerifyPage[\s\S]*?TrustSlipVerifyPage[\s\S]*?ShopGalleryPage[\s\S]*?Core authenticated work surfaces:[\s\S]*?MarketplacePage[\s\S]*?FinancePage[\s\S]*?TrustScorePage/,
  "Icon migration plan must keep the priority screen migration order."
);

assertContains(
  "frontend/src/assets/gsn-icons/README.md",
  /premium skeuomorphic \/ realistic 3D icons[\s\S]*?See `docs\/GSN_ICON_MIGRATION\.md` before adding or replacing icon assets\./,
  "3D icon asset folder must explain the target style and migration doc."
);

assertContains(
  "frontend/src/lib/gsnIconAssets.ts",
  /export const GSN_3D_ICON_KEYS = \[[\s\S]*?"trust-shield"[\s\S]*?"community-building"[\s\S]*?"shop-storefront"[\s\S]*?"market-stall"[\s\S]*?"vault-safe"[\s\S]*?"finance-bank-building"[\s\S]*?"finance-wallet-card"[\s\S]*?"repayment-schedule"[\s\S]*?"records-folder"[\s\S]*?"certificate-seal"[\s\S]*?"join-person-plus"[\s\S]*?"spotlight-megaphone"[\s\S]*?"identity-card"[\s\S]*?"phone-contact"[\s\S]*?"qr-record"[\s\S]*?"public-globe"[\s\S]*?\] as const;/,
  "3D icon registry must include the required base-pack keys."
);

assertContains(
  "frontend/src/lib/gsnIconAssets.ts",
  /(?=[\s\S]*?icon-trust-shield-3d\.webp)(?=[\s\S]*?icon-community-building-3d\.webp)(?=[\s\S]*?icon-shop-storefront-3d\.webp)(?=[\s\S]*?icon-market-stall-3d\.webp)(?=[\s\S]*?icon-vault-safe-3d\.webp)(?=[\s\S]*?icon-finance-bank-building-3d\.webp)(?=[\s\S]*?icon-finance-wallet-card-3d\.webp)(?=[\s\S]*?icon-repayment-schedule-3d\.webp)(?=[\s\S]*?icon-records-folder-3d\.webp)(?=[\s\S]*?icon-certificate-seal-3d\.webp)(?=[\s\S]*?icon-join-person-plus-3d\.webp)(?=[\s\S]*?icon-spotlight-megaphone-3d\.webp)/,
  "3D icon registry must preserve the required base-pack filenames."
);

assertContains(
  "frontend/src/components/GsnLegacyIcon.tsx",
  /bank: "finance-bank-building"[\s\S]*?chart: "finance-bank-building"[\s\S]*?financeInstitution: "finance-bank-building"[\s\S]*?marketplace: "market-stall"[\s\S]*?proof: "certificate-seal"[\s\S]*?repaymentSchedule: "repayment-schedule"[\s\S]*?shop: "market-stall"[\s\S]*?soundOn: "audio-speaker"[\s\S]*?speaker: "audio-speaker"[\s\S]*?tag: "market-stall"[\s\S]*?video: "media-video"/,
  "Legacy icon adapter must route domain finance, marketplace, proof, repayment, sound, and video meanings to the stronger 3D assets."
);

assertContains(
  "frontend/src/components/SpotlightMediaFrame.tsx",
  /<GsnLegacyIcon name="speaker" size=\{audioIconSize\} decorative \/>[\s\S]*?data-spotlight-audio-muted-slash="true"/,
  "Shared Spotlight media controls must use a real speaker icon and a muted slash instead of page-local On/Off wording."
);

assertNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /audioUnlock(?:Off)?Label="(?:On|Off)"/,
  "Dashboard Spotlight media controls must not restore On/Off labels; use the shared speaker control."
);

for (const asset of requiredBasePackAssets) {
  assertFileExists(
    `frontend/src/assets/gsn-icons/${asset.fileName}`,
    `Generated ${asset.key} 3D icon asset must stay in the GSN icon asset home.`
  );

  assertContains(
    "frontend/src/lib/gsnIconAssets.ts",
    new RegExp(
      `import ${asset.importName} from "\\.\\.\\/assets\\/gsn-icons\\/${asset.fileName}";[\\s\\S]*?"${asset.key}": \\{[\\s\\S]*?assetUrl: ${asset.importName},[\\s\\S]*?status: "available"`
    ),
    `3D icon registry must keep ${asset.key} wired and marked available.`
  );
}

assertNotContains(
  "frontend/src/lib/gsnIconAssets.ts",
  /assetUrl: null,[\s\S]*?status: "planned"/,
  "The required base-pack registry must not regress to planned/null assets now that the pack exists."
);

assertContains(
  "frontend/src/components/GsnRealisticIcon.tsx",
  /renderPending = false[\s\S]*?if \(!asset\.assetUrl\) \{[\s\S]*?if \(!renderPending\) return null;/,
  "GsnRealisticIcon must not render placeholder icons for missing assets unless explicitly requested."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /frontend\/src\/lib\/gsnIconAssets\.ts[\s\S]*?frontend\/src\/components\/GsnRealisticIcon\.tsx[\s\S]*?Registry entries without real asset files must keep `assetUrl: null` and\s+`status: "planned"`\.[\s\S]*?The shared\s+renderer returns nothing for missing assets by default, because a placeholder box\s+is not a compliant 3D icon\./,
  "Icon migration plan must document the typed registry and no-fake-placeholder renderer behavior."
);

for (const file of [
  "docs/DESIGN_SYSTEM.md",
  "docs/UX_ACCEPTANCE_CHECKLIST.md",
  "docs/GSN_MOBILE_UI_PROTOCOL.md",
  "docs/GSN_ICON_MIGRATION.md",
  "frontend/src/assets/gsn-icons/README.md",
]) {
  assertNotContains(
    file,
    /\b(?:app-native\s+)?SVG pictograms?\b/i,
    "Core UX docs must not reintroduce SVG pictograms as the primary icon standard."
  );
}

for (const file of [
  "frontend/src/pages/FinancePage.tsx",
  "frontend/src/pages/MarketplacePage.tsx",
]) {
  assertNotContains(
    file,
    /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
    "Core finance and marketplace polish must not reintroduce spaced-out micro-label typography."
  );
}

assertContains(
  "frontend/src/pages/MarketplacePage.tsx",
  /function marketplaceLinkHeroIconStyle[\s\S]*?background:\s*"linear-gradient\(180deg, rgba\(255,255,255,0\.98\)[\s\S]*?borderRight:\s*"1px solid rgba\(13,95,168,0\.10\)"[\s\S]*?function marketplaceLinkRowIconStyle[\s\S]*?const accents = \{[\s\S]*?background:\s*"linear-gradient\(180deg, rgba\(255,255,255,0\.98\)/,
  "Marketplace link icons must stay on light 3D icon tiles instead of heavy dark gradient slabs."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /function DashboardSignalIcon[\s\S]*?const iconMap: Record<DashboardSignalName, GsnIconName>[\s\S]*?<GsnLegacyIcon[\s\S]*?function DashboardPassportFeatureIcon[\s\S]*?const iconMap: Record<"eye" \| "briefcase" \| "check", GsnIconName>[\s\S]*?<GsnLegacyIcon/,
  "Dashboard passport/status helper icons must stay on the shared 3D icon adapter."
);

assertNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /Apple Color Emoji|Segoe UI Emoji|<svg[\s\S]*?function DashboardPassportFeatureIcon/,
  "Dashboard passport/status helper icons must not restore emoji or inline SVG primary icons."
);

assertContains(
  "frontend/src/pages/TrustScorePage.tsx",
  /trustIconBadge\("financeInstitution", isCompact \? 46 : 54, "blue"\)[\s\S]*?Plain rule/,
  "Trust Passport finance plain-rule block must keep the 3D finance institution icon."
);

for (const file of [
  "frontend/src/components/TrustDocumentFamilyMap.tsx",
  "frontend/src/components/TrustDocumentUseCases.tsx",
  "frontend/src/components/TrustDocumentActionGuide.tsx",
]) {
  assertContains(
    file,
    /GsnLegacyIcon[\s\S]*?function iconTile[\s\S]*?rgba\(255,255,255,0\.98\)/,
    "Shared trust-document guide cards must keep light 3D icon tiles."
  );
  assertNotContains(
    file,
    /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
    "Shared trust-document guide cards must not restore spaced-out micro-label typography."
  );
}

assertNotContains(
  "frontend/src/pages/CCIReadingPage.tsx",
  /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
  "CCI Reading must not restore spaced-out micro-label typography."
);

if (findings.length) {
  console.error("GSN icon protocol audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "GSN icon protocol audit passed: core UX docs require premium realistic 3D object icons, and the required base-pack assets are present and wired."
);
