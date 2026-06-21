import communityBuildingIconUrl from "../assets/gsn-icons/icon-community-building-3d.webp";
import certificateSealIconUrl from "../assets/gsn-icons/icon-certificate-seal-3d.webp";
import financeBankBuildingIconUrl from "../assets/gsn-icons/icon-finance-bank-building-3d.webp";
import financeWalletCardIconUrl from "../assets/gsn-icons/icon-finance-wallet-card-3d.webp";
import identityCardIconUrl from "../assets/gsn-icons/icon-identity-card-3d.webp";
import joinPersonPlusIconUrl from "../assets/gsn-icons/icon-join-person-plus-3d.webp";
import marketStallIconUrl from "../assets/gsn-icons/icon-market-stall-3d.webp";
import audioSpeakerIconUrl from "../assets/gsn-icons/icon-audio-speaker-3d.webp";
import mediaVideoIconUrl from "../assets/gsn-icons/icon-media-video-3d.webp";
import phoneContactIconUrl from "../assets/gsn-icons/icon-phone-contact-3d.webp";
import publicGlobeIconUrl from "../assets/gsn-icons/icon-public-globe-3d.webp";
import qrRecordIconUrl from "../assets/gsn-icons/icon-qr-record-3d.webp";
import repaymentScheduleIconUrl from "../assets/gsn-icons/icon-repayment-schedule-3d.webp";
import recordsFolderIconUrl from "../assets/gsn-icons/icon-records-folder-3d.webp";
import shopStorefrontIconUrl from "../assets/gsn-icons/icon-shop-storefront-3d.webp";
import spotlightMegaphoneIconUrl from "../assets/gsn-icons/icon-spotlight-megaphone-3d.webp";
import trustShieldIconUrl from "../assets/gsn-icons/icon-trust-shield-3d.webp";
import vaultSafeIconUrl from "../assets/gsn-icons/icon-vault-safe-3d.webp";

export const GSN_3D_ICON_ASSET_ROOT = "frontend/src/assets/gsn-icons/";

export const GSN_3D_ICON_KEYS = [
  "trust-shield",
  "community-building",
  "shop-storefront",
  "market-stall",
  "vault-safe",
  "finance-bank-building",
  "finance-wallet-card",
  "repayment-schedule",
  "records-folder",
  "certificate-seal",
  "join-person-plus",
  "spotlight-megaphone",
  "audio-speaker",
  "media-video",
  "identity-card",
  "phone-contact",
  "qr-record",
  "public-globe",
] as const;

export type Gsn3DIconKey = (typeof GSN_3D_ICON_KEYS)[number];

export type Gsn3DIconAsset = {
  key: Gsn3DIconKey;
  fileName: string;
  objectMeaning: string;
  promptSeed: string;
  assetUrl: string | null;
  status: "planned" | "available";
};

export const GSN_3D_ICON_ASSETS = {
  "trust-shield": {
    key: "trust-shield",
    fileName: "icon-trust-shield-3d.webp",
    objectMeaning: "shield badge or seal",
    promptSeed:
      "premium skeuomorphic 3D icon, shield badge, navy and gold, transparent background",
    assetUrl: trustShieldIconUrl,
    status: "available",
  },
  "community-building": {
    key: "community-building",
    fileName: "icon-community-building-3d.webp",
    objectMeaning: "premium house, hall, or civic building",
    promptSeed:
      "3D community building icon, premium civic hall, navy gold white, transparent background",
    assetUrl: communityBuildingIconUrl,
    status: "available",
  },
  "shop-storefront": {
    key: "shop-storefront",
    fileName: "icon-shop-storefront-3d.webp",
    objectMeaning: "storefront or shopping bag/cart",
    promptSeed:
      "real-world storefront icon, high-fidelity marketplace icon, navy gold white, transparent background",
    assetUrl: shopStorefrontIconUrl,
    status: "available",
  },
  "market-stall": {
    key: "market-stall",
    fileName: "icon-market-stall-3d.webp",
    objectMeaning: "market stall or real trading place",
    promptSeed:
      "premium realistic 3D market stall icon, navy white canopy, gold trim, fresh goods, transparent background",
    assetUrl: marketStallIconUrl,
    status: "available",
  },
  "vault-safe": {
    key: "vault-safe",
    fileName: "icon-vault-safe-3d.webp",
    objectMeaning: "safe box",
    promptSeed:
      "3D safe vault icon, premium banking icon, navy metal and gold accents, transparent background",
    assetUrl: vaultSafeIconUrl,
    status: "available",
  },
  "finance-wallet-card": {
    key: "finance-wallet-card",
    fileName: "icon-finance-wallet-card-3d.webp",
    objectMeaning: "wallet or bank card for personal payment details",
    promptSeed:
      "premium banking icon, wallet and bank card, realistic 3D, navy gold green, transparent background",
    assetUrl: financeWalletCardIconUrl,
    status: "available",
  },
  "finance-bank-building": {
    key: "finance-bank-building",
    fileName: "icon-finance-bank-building-3d.webp",
    objectMeaning: "bank building or institutional money house",
    promptSeed:
      "premium realistic 3D bank building icon, white stone columns, navy doors, gold accents, transparent background",
    assetUrl: financeBankBuildingIconUrl,
    status: "available",
  },
  "repayment-schedule": {
    key: "repayment-schedule",
    fileName: "icon-repayment-schedule-3d.webp",
    objectMeaning: "repayment schedule, instalments, or payment plan",
    promptSeed:
      "premium realistic 3D repayment calendar icon, payment schedule with coins and check marks, navy gold white, transparent background",
    assetUrl: repaymentScheduleIconUrl,
    status: "available",
  },
  "records-folder": {
    key: "records-folder",
    fileName: "icon-records-folder-3d.webp",
    objectMeaning: "document folder",
    promptSeed:
      "realistic object icon, premium document folder with seal, navy gold white, transparent background",
    assetUrl: recordsFolderIconUrl,
    status: "available",
  },
  "certificate-seal": {
    key: "certificate-seal",
    fileName: "icon-certificate-seal-3d.webp",
    objectMeaning: "certificate, evidence paper, or evidence seal",
    promptSeed:
      "premium realistic 3D certificate evidence icon, white paper, navy leather corners, gold seal, transparent background",
    assetUrl: certificateSealIconUrl,
    status: "available",
  },
  "join-person-plus": {
    key: "join-person-plus",
    fileName: "icon-join-person-plus-3d.webp",
    objectMeaning: "person-plus entry",
    promptSeed:
      "premium realistic 3D icon, member profile and plus badge, navy gold white, transparent background",
    assetUrl: joinPersonPlusIconUrl,
    status: "available",
  },
  "spotlight-megaphone": {
    key: "spotlight-megaphone",
    fileName: "icon-spotlight-megaphone-3d.webp",
    objectMeaning: "real loudspeaker or megaphone",
    promptSeed:
      "premium skeuomorphic 3D icon, real megaphone spotlight, navy gold white, transparent background",
    assetUrl: spotlightMegaphoneIconUrl,
    status: "available",
  },
  "audio-speaker": {
    key: "audio-speaker",
    fileName: "icon-audio-speaker-3d.webp",
    objectMeaning: "speaker for sound controls",
    promptSeed:
      "premium realistic 3D sound speaker icon, white navy and gold, transparent background",
    assetUrl: audioSpeakerIconUrl,
    status: "available",
  },
  "media-video": {
    key: "media-video",
    fileName: "icon-media-video-3d.webp",
    objectMeaning: "video camera or playable media",
    promptSeed:
      "premium realistic 3D video camera icon, white navy and gold, transparent background",
    assetUrl: mediaVideoIconUrl,
    status: "available",
  },
  "identity-card": {
    key: "identity-card",
    fileName: "icon-identity-card-3d.webp",
    objectMeaning: "GSN identity card",
    promptSeed:
      "glossy executive app icon, identity card with shield seal, navy gold white, transparent background",
    assetUrl: identityCardIconUrl,
    status: "available",
  },
  "phone-contact": {
    key: "phone-contact",
    fileName: "icon-phone-contact-3d.webp",
    objectMeaning: "phone/contact",
    promptSeed:
      "realistic object icon, premium phone handset, navy gold white, transparent background",
    assetUrl: phoneContactIconUrl,
    status: "available",
  },
  "qr-record": {
    key: "qr-record",
    fileName: "icon-qr-record-3d.webp",
    objectMeaning: "QR evidence record",
    promptSeed:
      "premium 3D UI icon, QR record card with seal, navy gold white, transparent background",
    assetUrl: qrRecordIconUrl,
    status: "available",
  },
  "public-globe": {
    key: "public-globe",
    fileName: "icon-public-globe-3d.webp",
    objectMeaning: "public record/share surface",
    promptSeed:
      "realistic 3D globe and trust seal icon, navy gold white, transparent background",
    assetUrl: publicGlobeIconUrl,
    status: "available",
  },
} satisfies Record<Gsn3DIconKey, Gsn3DIconAsset>;

export function getGsn3DIconAsset(key: Gsn3DIconKey): Gsn3DIconAsset {
  return GSN_3D_ICON_ASSETS[key];
}

export function hasGsn3DIconAsset(key: Gsn3DIconKey): boolean {
  return Boolean(getGsn3DIconAsset(key).assetUrl);
}
