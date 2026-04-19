import React from "react";
import { gmfnBrand } from "../styles/gmfnBrand";

type SystemPictureFrameProps = {
  children: React.ReactNode;
  outerStyle?: React.CSSProperties;
  innerStyle?: React.CSSProperties;
};

function baseOuter(): React.CSSProperties {
  return {
    width: "100%",
    overflow: "hidden",
    borderRadius: 28,
    border: `1px solid ${gmfnBrand.colors.goldSoft}`,
    background: gmfnBrand.gradients.hero,
    boxShadow: gmfnBrand.shadows.hero,
  };
}

function baseInner(): React.CSSProperties {
  return {
    position: "relative",
    width: "100%",
    minHeight: 210,
    overflow: "hidden",
    borderRadius: 22,
    border: `1px solid ${gmfnBrand.colors.goldInnerSoft}`,
    background: gmfnBrand.gradients.heroRaised,
  };
}

export default function SystemPictureFrame(props: SystemPictureFrameProps) {
  return (
    <div style={{ ...baseOuter(), ...(props.outerStyle || {}) }}>
      <div style={{ ...baseInner(), ...(props.innerStyle || {}) }}>
        {props.children}
      </div>
    </div>
  );
}
