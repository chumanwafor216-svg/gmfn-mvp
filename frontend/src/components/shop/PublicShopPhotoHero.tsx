import React from "react";
import GSNBrandMark from "../GSNBrandMark";
import { GsnRealisticIcon } from "../GsnRealisticIcon";
import type { ShopHeroSource } from "../../lib/shopHeroSelection";
import UniversalShopHero from "./UniversalShopHero";

type PublicShopPhotoHeroProps = {
  source: ShopHeroSource;
  compact?: boolean;
  shopName: string;
  category: string;
  description?: string;
  gmfnId?: string;
  communityName?: string;
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
  ownerAction,
  onImageError,
}: PublicShopPhotoHeroProps) {
  return (
    <section
      data-public-shop-photo-hero="true"
      data-shop-hero-source={source.kind}
      aria-label={`${shopName} shop identity`}
      style={{
        position: "relative",
        minHeight: compact ? 302 : 420,
        overflow: "hidden",
        borderRadius: compact ? 16 : 26,
        color: "#FFFFFF",
        background: "#061827",
        border: "1px solid rgba(246,215,122,0.54)",
        boxShadow:
          "0 22px 44px rgba(3,20,36,0.22), inset 0 1px 0 rgba(255,255,255,0.18)",
      }}
    >
      <div style={{ position: "absolute", inset: 0 }}>
        <UniversalShopHero
          source={source}
          onImageError={onImageError}
        />
      </div>

      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(2,16,31,0.98) 0%, rgba(3,24,43,0.91) 38%, rgba(3,24,43,0.38) 68%, rgba(3,24,43,0.10) 100%), linear-gradient(180deg, rgba(2,16,31,0.18) 0%, rgba(2,16,31,0.10) 48%, rgba(2,16,31,0.88) 100%)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: compact ? 11 : 16,
          background:
            "linear-gradient(180deg, #F6D77A 0%, #B78928 48%, #F8DF92 100%)",
          clipPath: "polygon(0 0, 100% 0, 55% 46%, 100% 100%, 0 100%)",
          opacity: 0.92,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 2,
          minHeight: compact ? 302 : 420,
          display: "grid",
          alignContent: "space-between",
          gap: compact ? 18 : 28,
          padding: compact ? "15px 16px 16px 24px" : "24px 28px 26px 40px",
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
              background: "rgba(3,20,36,0.70)",
              border: "1px solid rgba(246,215,122,0.54)",
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
          style={{
            display: "grid",
            gap: compact ? 10 : 14,
            alignSelf: "end",
            width: compact ? "88%" : "70%",
            maxWidth: 650,
          }}
        >
          <h1
            style={{
              margin: 0,
              maxWidth: compact ? 285 : 620,
              color: "#FFFFFF",
              fontFamily: "'Inter', 'Segoe UI', 'Arial Black', Arial, sans-serif",
              fontSize: compact ? 35 : 58,
              lineHeight: compact ? 0.98 : 0.94,
              fontWeight: 950,
              letterSpacing: compact ? -1.4 : -2.1,
              textShadow: "0 12px 26px rgba(0,0,0,0.42)",
              overflowWrap: "anywhere",
            }}
          >
            {shopName}
          </h1>

          <div
            style={{
              width: "fit-content",
              maxWidth: "100%",
              display: "inline-flex",
              alignItems: "center",
              gap: compact ? 7 : 9,
              minHeight: compact ? 34 : 42,
              padding: compact ? "7px 11px" : "9px 15px",
              borderRadius: compact ? 12 : 15,
              color: "#07172C",
              background: "linear-gradient(180deg, #FFE48B 0%, #F5BE45 100%)",
              border: "1px solid rgba(255,240,190,0.76)",
              boxShadow: "0 10px 24px rgba(0,0,0,0.24)",
              fontSize: compact ? 12.5 : 16,
              fontWeight: 950,
            }}
          >
            <GsnRealisticIcon
              name="shop-storefront"
              size={compact ? 20 : 25}
              decorative
            />
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {category}
            </span>
          </div>

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
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: compact ? 7 : 10,
              paddingTop: compact ? 2 : 4,
            }}
          >
            {gmfnId ? (
              <span style={metaPillStyle(compact)}>
                <GsnRealisticIcon name="identity-card" size={compact ? 18 : 22} decorative />
                <span>GSN member</span>
              </span>
            ) : null}
            {communityName ? (
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
