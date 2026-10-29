import React from "react";
import privateVaultEverydayItemsUrl from "../assets/vault/private-vault-everyday-items.webp";

type PrivateVaultEverydayItemsProps = {
  compact?: boolean;
  eager?: boolean;
  style?: React.CSSProperties;
};

export default function PrivateVaultEverydayItems({
  compact = false,
  eager = false,
  style,
}: PrivateVaultEverydayItemsProps) {
  return (
    <div
      aria-hidden="true"
      data-private-vault-item-strip="true"
      style={{
        width: "100%",
        aspectRatio: "3 / 1",
        overflow: "hidden",
        borderRadius: compact ? 16 : 20,
        border: "1px solid rgba(255,218,132,0.72)",
        background: "#FFFFFF",
        boxShadow:
          "0 16px 32px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.80)",
        ...style,
      }}
    >
      <img
        src={privateVaultEverydayItemsUrl}
        alt=""
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        style={{
          display: "block",
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </div>
  );
}
