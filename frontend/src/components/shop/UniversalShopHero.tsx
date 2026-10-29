import React from "react";
import { GsnRealisticIcon } from "../GsnRealisticIcon";
import type { ShopHeroSource } from "../../lib/shopHeroSelection";

type UniversalShopHeroProps = {
  source: ShopHeroSource;
  compact?: boolean;
  onImageError?: (imageUrl: string) => void;
};

export default function UniversalShopHero({
  source,
  compact = false,
  onImageError,
}: UniversalShopHeroProps) {
  const iconSize = compact ? 68 : 142;

  return (
    <div
      data-universal-shop-hero="true"
      data-shop-hero-source={source.kind}
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
        background:
          "radial-gradient(circle at 38% 24%, rgba(246,215,122,0.34) 0%, rgba(11,45,74,0.94) 58%, #061827 100%)",
      }}
    >
      {source.imageUrl ? (
        <img
          src={source.imageUrl}
          alt={source.altText}
          loading="eager"
          decoding="async"
          draggable={false}
          onError={() => onImageError?.(source.imageUrl)}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <GsnRealisticIcon
          name="shop-storefront"
          size={iconSize}
          decorative={false}
          label={source.altText}
          loading="eager"
          style={{
            background: "rgba(255,255,255,0.92)",
            border: "1px solid rgba(246,215,122,0.44)",
            boxShadow: "0 18px 36px rgba(0,0,0,0.22)",
          }}
          imageStyle={{ objectFit: "contain" }}
        />
      )}

      <span
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background: source.imageUrl
            ? "linear-gradient(180deg, rgba(2,12,27,0.02) 44%, rgba(2,12,27,0.34) 100%)"
            : "linear-gradient(135deg, rgba(246,215,122,0.10), transparent 58%)",
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
        }}
      />
    </div>
  );
}
