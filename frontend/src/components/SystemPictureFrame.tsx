import React from "react";

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
    border: "1px solid rgba(212,175,55,0.18)",
    background: "linear-gradient(180deg, #10243A 0%, #173654 52%, #26527C 100%)",
    boxShadow: "0 22px 48px rgba(2,12,27,0.24), inset 0 1px 0 rgba(255,255,255,0.04)",
  };
}

function baseInner(): React.CSSProperties {
  return {
    position: "relative",
    width: "100%",
    minHeight: 210,
    overflow: "hidden",
    borderRadius: 22,
    border: "1px solid rgba(212,175,55,0.14)",
    background: "linear-gradient(180deg, #163552 0%, #2A5B84 100%)",
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
