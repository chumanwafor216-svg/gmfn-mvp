import React from "react";
import GSNBrandMark from "../GSNBrandMark";
import { GsnRealisticIcon } from "../GsnRealisticIcon";
import type { ShopHeroSource } from "../../lib/shopHeroSelection";
import GsnShopEntranceAnimation from "./GsnShopEntranceAnimation";

type PublicShopPhotoHeroProps = {
  source: ShopHeroSource;
  compact?: boolean;
  shopName: string;
  category: string;
  description?: string;
  gmfnId?: string;
  communityName?: string;
  showIdentityMeta?: boolean;
  ownerAction?: React.ReactNode;
  onImageError?: (imageUrl: string) => void;
};

export default function PublicShopPhotoHero({
  source,
  compact = false,
  shopName,
  category,
  description,
  gmfnId,
  communityName,
  showIdentityMeta = false,
  ownerAction,
}: PublicShopPhotoHeroProps) {
  return (
    <section
      data-public-shop-photo-hero="true"
      data-shop-hero-boundary="single-neon"
      data-shop-hero-source={source.kind}
      aria-label={`${shopName} shop identity`}
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "430 / 414",
        minHeight: compact ? 348 : 500,
        overflow: "hidden",
        isolation: "isolate",
        borderRadius: compact ? 18 : 22,
        color: "#FFFFFF",
        background: "#041425",
        border: "1px solid rgba(83,189,255,0.86)",
        boxShadow:
          "0 0 18px rgba(58,151,255,0.34), 0 0 30px rgba(142,72,255,0.18)",
      }}
    >
      <div
        data-previous-shop-hero-source={source.kind}
        style={{ position: "absolute", inset: 0 }}
      >
        <GsnShopEntranceAnimation compact={compact} fit="cover" />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(2,16,31,0.02) 0%, rgba(2,16,31,0.02) 48%, rgba(2,16,31,0.18) 70%, rgba(2,16,31,0.72) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          display: "grid",
          alignContent: "space-between",
          gap: compact ? 14 : 28,
          padding: compact ? "14px 14px 12px" : "22px 24px 20px",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: compact ? 9 : 12,
            width: "fit-content",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: compact ? 38 : 50,
              height: compact ? 38 : 50,
              borderRadius: "50%",
              display: "grid",
              placeItems: "center",
              background: "rgba(3,20,36,0.28)",
              border: 0,
              boxShadow: "0 8px 20px rgba(0,0,0,0.18)",
            }}
          >
            <GSNBrandMark width={compact ? 23 : 31} height={compact ? 29 : 39} />
          </span>
          <span style={{ display: "grid", gap: 1 }}>
            <strong
              style={{
                color: "#F6D77A",
                fontSize: compact ? 24 : 34,
                lineHeight: 0.95,
                fontWeight: 950,
                letterSpacing: -0.7,
              }}
            >
              GSN
            </strong>
            <span
              style={{
                color: "rgba(255,255,255,0.82)",
                fontSize: compact ? 8.5 : 10.5,
                fontWeight: 850,
                letterSpacing: compact ? 0.8 : 1.2,
                textTransform: "uppercase",
              }}
            >
              Global Support Network
            </span>
          </span>
        </div>

        <div
          data-public-shop-identity-overlay="true"
          style={{
            display: "grid",
            gap: compact ? 7 : 11,
            alignSelf: "end",
            width: "100%",
            maxWidth: "none",
            padding: compact ? "24px 10px 9px" : "46px 14px 13px",
            borderRadius: 0,
            background:
              "linear-gradient(180deg, rgba(3,20,36,0) 0%, rgba(3,20,36,0.25) 38%, rgba(2,12,27,0.76) 100%)",
            border: 0,
            boxShadow: "none",
          }}
        >
          <h1
            style={{
              margin: 0,
              maxWidth: "100%",
              color: "#FFFFFF",
              fontFamily: "'Inter', 'Segoe UI', 'Arial Black', Arial, sans-serif",
              fontSize: compact ? "clamp(18px, 6vw, 24px)" : "clamp(30px, 4vw, 42px)",
              lineHeight: 1.04,
              fontWeight: 950,
              letterSpacing: compact ? -0.7 : -1.3,
              textShadow:
                "0 2px 3px rgba(0,0,0,0.92), 0 8px 18px rgba(0,0,0,0.44)",
              overflowWrap: "anywhere",
            }}
          >
            {shopName}
          </h1>

          {description ? (
            <p
              style={{
                margin: 0,
                maxWidth: compact ? 260 : 560,
                color: "rgba(255,255,255,0.90)",
                fontSize: compact ? 13 : 17,
                lineHeight: 1.28,
                fontWeight: 670,
                textShadow: "0 7px 18px rgba(0,0,0,0.46)",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}
            >
              {description}
            </p>
          ) : null}

          <div
            data-public-shop-identity-actions="true"
            style={{
              display: "flex",
              flexWrap: compact ? "nowrap" : "wrap",
              alignItems: "center",
              gap: compact ? 6 : 9,
              paddingTop: compact ? 0 : 2,
            }}
          >
            <div
              style={{
                width: compact ? "auto" : "fit-content",
                minWidth: 0,
                maxWidth: compact ? "none" : 280,
                flex: compact ? "1 1 0" : undefined,
                display: "inline-flex",
                alignItems: "center",
                gap: compact ? 4 : 8,
                minHeight: compact ? 30 : 38,
                padding: compact ? "5px" : "7px 12px",
                borderRadius: compact ? 11 : 14,
                color: "#07172C",
                background: "rgba(255,218,112,0.78)",
                border: "1px solid rgba(255,240,190,0.54)",
                boxShadow: "0 7px 16px rgba(0,0,0,0.14)",
                fontSize: compact ? 9.6 : 14,
                fontWeight: 950,
              }}
            >
              <GsnRealisticIcon
                name="shop-storefront"
                size={compact ? 16 : 22}
                decorative
              />
              <span
                data-public-shop-category-text="true"
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {category}
              </span>
            </div>
            {showIdentityMeta && gmfnId ? (
              <span style={metaPillStyle(compact)}>
                <GsnRealisticIcon name="identity-card" size={compact ? 18 : 22} decorative />
                <span>GSN member</span>
              </span>
            ) : null}
            {showIdentityMeta && communityName ? (
              <span style={metaPillStyle(compact)}>
                <GsnRealisticIcon name="community-building" size={compact ? 18 : 22} decorative />
                <span>{communityName}</span>
              </span>
            ) : null}
            {ownerAction}
          </div>
        </div>
      </div>
    </section>
  );
}

function metaPillStyle(compact: boolean): React.CSSProperties {
  return {
    maxWidth: compact ? 190 : 260,
    minHeight: compact ? 30 : 36,
    display: "inline-flex",
    alignItems: "center",
    gap: compact ? 6 : 8,
    padding: compact ? "5px 8px" : "7px 11px",
    borderRadius: 999,
    color: "#FFFFFF",
    background: "rgba(3,20,36,0.68)",
    border: "1px solid rgba(255,255,255,0.24)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
    fontSize: compact ? 10 : 12.5,
    fontWeight: 850,
    lineHeight: 1.15,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}
