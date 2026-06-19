import React from "react";
import { GsnRealisticIcon, type Gsn3DIconKey } from "./GsnRealisticIcon";

export type GsnLegacyIconName =
  | "alert"
  | "audio"
  | "bank"
  | "briefcase"
  | "calendar"
  | "card"
  | "certificate"
  | "chart"
  | "chevronDown"
  | "chevronUp"
  | "check"
  | "community"
  | "copy"
  | "document"
  | "evidence"
  | "eye"
  | "financeInstitution"
  | "globe"
  | "hash"
  | "home"
  | "id"
  | "image"
  | "lock"
  | "megaphone"
  | "navigation"
  | "marketplace"
  | "pen"
  | "phone"
  | "proof"
  | "qr"
  | "refresh"
  | "repaymentSchedule"
  | "search"
  | "shield"
  | "shop"
  | "sound"
  | "soundOff"
  | "soundOn"
  | "speaker"
  | "spark"
  | "tag"
  | "user"
  | "vault"
  | "video"
  | "wallet";

export type GsnIconName = GsnLegacyIconName | Gsn3DIconKey;

const GSN_LEGACY_ICON_MAP = {
  alert: "trust-shield",
  audio: "audio-speaker",
  bank: "finance-bank-building",
  briefcase: "records-folder",
  calendar: "records-folder",
  card: "finance-wallet-card",
  certificate: "certificate-seal",
  chart: "finance-bank-building",
  chevronDown: "public-globe",
  chevronUp: "public-globe",
  check: "trust-shield",
  community: "community-building",
  copy: "qr-record",
  document: "records-folder",
  evidence: "certificate-seal",
  eye: "public-globe",
  financeInstitution: "finance-bank-building",
  globe: "public-globe",
  hash: "qr-record",
  home: "community-building",
  id: "identity-card",
  image: "records-folder",
  lock: "vault-safe",
  marketplace: "market-stall",
  megaphone: "spotlight-megaphone",
  navigation: "public-globe",
  pen: "records-folder",
  phone: "phone-contact",
  proof: "certificate-seal",
  qr: "qr-record",
  refresh: "records-folder",
  repaymentSchedule: "repayment-schedule",
  search: "qr-record",
  shield: "trust-shield",
  shop: "market-stall",
  sound: "audio-speaker",
  soundOff: "audio-speaker",
  soundOn: "audio-speaker",
  speaker: "audio-speaker",
  spark: "spotlight-megaphone",
  tag: "market-stall",
  user: "identity-card",
  vault: "vault-safe",
  video: "media-video",
  wallet: "finance-wallet-card",
} satisfies Record<GsnLegacyIconName, Gsn3DIconKey>;

export function resolveGsnIconName(name: GsnIconName): Gsn3DIconKey {
  return GSN_LEGACY_ICON_MAP[name as GsnLegacyIconName] || (name as Gsn3DIconKey);
}

type GsnLegacyIconProps = {
  name: GsnIconName;
  size?: number;
  label?: string;
  decorative?: boolean;
  className?: string;
  style?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
};

export function GsnLegacyIcon({
  name,
  size = 48,
  label,
  decorative = true,
  className,
  style,
  imageStyle,
}: GsnLegacyIconProps) {
  return (
    <GsnRealisticIcon
      name={resolveGsnIconName(name)}
      size={size}
      label={label}
      decorative={decorative}
      className={className}
      style={style}
      imageStyle={imageStyle}
    />
  );
}
