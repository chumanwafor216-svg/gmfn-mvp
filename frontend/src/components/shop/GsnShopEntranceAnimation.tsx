import React from "react";

export const GSN_SHOP_ENTRANCE_VIDEO =
  "/branding/gsn-shop-entrance-approved.mp4";
export const GSN_SHOP_ENTRANCE_POSTER =
  "/branding/gsn-shop-entrance-approved-poster.jpg";

type GsnShopEntranceAnimationProps = {
  compact?: boolean;
  fit?: "contain" | "cover";
  style?: React.CSSProperties;
};

export default function GsnShopEntranceAnimation({
  compact = false,
  fit = "contain",
  style,
}: GsnShopEntranceAnimationProps) {
  return (
    <div
      data-gsn-shop-entrance-animation="true"
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        minHeight: compact ? 240 : 320,
        overflow: "hidden",
        isolation: "isolate",
        background: "#041425",
        ...style,
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: -18,
          backgroundImage: `linear-gradient(180deg, rgba(4,20,37,0.30), rgba(4,20,37,0.62)), url(${GSN_SHOP_ENTRANCE_POSTER})`,
          backgroundPosition: "center",
          backgroundSize: "cover",
          filter: "blur(16px) saturate(0.88)",
          opacity: 0.62,
          transform: "scale(1.08)",
        }}
      />
      <video
        data-gsn-shop-entrance-video="true"
        autoPlay
        muted
        loop
        playsInline
        disablePictureInPicture
        preload="metadata"
        poster={GSN_SHOP_ENTRANCE_POSTER}
        aria-hidden="true"
        tabIndex={-1}
        style={{
          position: "relative",
          zIndex: 1,
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: fit,
          objectPosition: "center",
        }}
      >
        <source src={GSN_SHOP_ENTRANCE_VIDEO} type="video/mp4" />
      </video>
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          zIndex: 2,
          inset: 0,
          pointerEvents: "none",
          background:
            "linear-gradient(180deg, rgba(2,14,28,0.06) 0%, rgba(2,14,28,0.02) 54%, rgba(2,14,28,0.36) 100%)",
        }}
      />
    </div>
  );
}
