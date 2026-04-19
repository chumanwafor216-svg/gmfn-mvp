import React, { useEffect, useMemo, useState } from "react";

type SpotlightMediaFrameProps = {
  imageUrl?: string | null;
  imageCandidates?: string[];
  videoUrl?: string | null;
  videoPoster?: string | null;
  alt: string;
  frameStyle?: React.CSSProperties;
  mediaStyle?: React.CSSProperties;
  contentPadding?: number | string;
  fallback?: React.ReactNode;
  showVideoControls?: boolean;
  autoPlayVideo?: boolean;
  mutedVideo?: boolean;
  loopVideo?: boolean;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueMediaValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => safeStr(value)).filter(Boolean))];
}

export default function SpotlightMediaFrame(
  props: SpotlightMediaFrameProps
) {
  const imageCandidates = useMemo(
    () => uniqueMediaValues([props.imageUrl, ...(props.imageCandidates || [])]),
    [props.imageCandidates, props.imageUrl]
  );

  const [imageIndex, setImageIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageIndex(0);
    setVideoFailed(false);
    setImageFailed(false);
  }, [imageCandidates.join("|"), props.videoUrl]);

  const imageSrc = imageCandidates[imageIndex] || "";
  const videoSrc = safeStr(props.videoUrl);
  const backdropSrc = safeStr(props.videoPoster) || imageSrc;

  const frameStyle: React.CSSProperties = {
    position: "relative",
    width: "100%",
    minHeight: 220,
    borderRadius: 22,
    overflow: "hidden",
    background: "linear-gradient(180deg, #15314C 0%, #21496C 56%, #2B5E88 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ...props.frameStyle,
  };

  const mediaStyle: React.CSSProperties = {
    width: "100%",
    height: "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    objectFit: "contain",
    objectPosition: "center center",
    display: "block",
    filter: "saturate(1.04) contrast(1.03)",
    ...props.mediaStyle,
  };

  const foregroundStyle: React.CSSProperties = {
    position: "relative",
    zIndex: 2,
    width: "100%",
    height: "100%",
    padding: props.contentPadding ?? 16,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxSizing: "border-box",
  };

  const backdrop = backdropSrc ? (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url("${backdropSrc}")`,
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          filter: "blur(24px) saturate(1.12) brightness(0.9)",
          transform: "scale(1.08)",
          opacity: 0.82,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(6,19,34,0.18) 0%, rgba(6,19,34,0.32) 42%, rgba(6,19,34,0.5) 100%)",
        }}
      />
    </>
  ) : null;

  if (videoSrc && !videoFailed) {
    return (
      <div style={frameStyle}>
        {backdrop}
        <div style={foregroundStyle}>
          <video
            src={videoSrc}
            poster={backdropSrc || undefined}
            controls={props.showVideoControls ?? true}
            autoPlay={props.autoPlayVideo ?? false}
            muted={props.mutedVideo ?? false}
            loop={props.loopVideo ?? false}
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            style={mediaStyle}
          />
        </div>
      </div>
    );
  }

  if (imageSrc && !imageFailed) {
    return (
      <div style={frameStyle}>
        {backdrop}
        <div style={foregroundStyle}>
          <img
            src={imageSrc}
            alt={props.alt}
            onError={() => {
              setImageIndex((prev) => {
                const next = prev + 1;
                if (next < imageCandidates.length) {
                  return next;
                }

                setImageFailed(true);
                return prev;
              });
            }}
            style={mediaStyle}
          />
        </div>
      </div>
    );
  }

  return <>{props.fallback || null}</>;
}
