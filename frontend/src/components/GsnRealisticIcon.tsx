import React from "react";
import {
  getGsn3DIconAsset,
  type Gsn3DIconKey,
} from "../lib/gsnIconAssets";

type GsnRealisticIconProps = {
  name: Gsn3DIconKey;
  size?: number;
  label?: string;
  decorative?: boolean;
  className?: string;
  style?: React.CSSProperties;
  imageStyle?: React.CSSProperties;
  loading?: "eager" | "lazy";
  renderPending?: boolean;
};

export function GsnRealisticIcon({
  name,
  size = 48,
  label,
  decorative = true,
  className,
  style,
  imageStyle,
  loading = "lazy",
  renderPending = false,
}: GsnRealisticIconProps) {
  const asset = getGsn3DIconAsset(name);
  const accessibleLabel = label || asset.objectMeaning;

  const frameStyle: React.CSSProperties = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    display: "inline-grid",
    placeItems: "center",
    borderRadius: Math.max(12, Math.round(size * 0.32)),
    overflow: "hidden",
    flex: "0 0 auto",
    ...style,
  };

  if (!asset.assetUrl) {
    if (!renderPending) return null;

    return (
      <span
        className={className}
        data-gsn-3d-icon={name}
        data-gsn-3d-icon-status="planned"
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : `${accessibleLabel} icon pending`}
        aria-hidden={decorative || undefined}
        title={`${asset.fileName} pending`}
        style={{
          ...frameStyle,
          background:
            "linear-gradient(145deg, rgba(246,215,122,0.16), rgba(8,35,58,0.10))",
          border: "1px dashed rgba(8,35,58,0.24)",
        }}
      />
    );
  }

  return (
    <span
      className={className}
      data-gsn-3d-icon={name}
      data-gsn-3d-icon-status={asset.status}
      aria-hidden={decorative || undefined}
      style={frameStyle}
    >
      <img
        src={asset.assetUrl}
        alt={decorative ? "" : accessibleLabel}
        width={size}
        height={size}
        loading={loading}
        decoding="async"
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
          ...imageStyle,
        }}
      />
    </span>
  );
}

export type { Gsn3DIconKey };
