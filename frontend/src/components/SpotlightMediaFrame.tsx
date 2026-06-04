import React, { useEffect, useMemo, useRef, useState } from "react";
import { SecondaryButton } from "./StableButton";

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
  maxVideoSeconds?: number | null;
  showAudioUnlock?: boolean;
  audioUnlockLabel?: string;
  audioUnlockOffLabel?: string;
  audioUnlockErrorLabel?: string;
  audioUnlockStyle?: React.CSSProperties;
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
  const imageCandidateKey = useMemo(
    () => imageCandidates.join("|"),
    [imageCandidates]
  );

  const [imageIndex, setImageIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioError, setAudioError] = useState("");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastAudioToggleRef = useRef(0);

  useEffect(() => {
    setImageIndex(0);
    setVideoFailed(false);
    setImageFailed(false);
    setAudioUnlocked(false);
    setAudioError("");
  }, [imageCandidateKey, props.videoUrl]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldMute = props.mutedVideo ?? false;
    video.muted = shouldMute;
    video.defaultMuted = shouldMute;
    if (!shouldMute) {
      video.volume = 1;
    }
    setAudioUnlocked(false);
    setAudioError("");
  }, [props.mutedVideo, props.videoUrl]);

  const imageSrc = imageCandidates[imageIndex] || "";
  const videoSrc = safeStr(props.videoUrl);
  const backdropSrc = safeStr(props.videoPoster) || imageSrc;
  const maxVideoSeconds = Number(props.maxVideoSeconds || 0);
  const shouldShowAudioUnlock =
    Boolean(videoSrc) &&
    Boolean(props.showAudioUnlock);

  function stopMediaControlEvent(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
  }

  function toggleAudio(event?: React.SyntheticEvent) {
    stopMediaControlEvent(event);

    const now = Date.now();
    if (now - lastAudioToggleRef.current < 320) return;
    lastAudioToggleRef.current = now;

    const video = videoRef.current;
    if (!video) return;

    if (audioUnlocked) {
      video.muted = true;
      video.defaultMuted = true;
      video.volume = 0;
      setAudioUnlocked(false);
      setAudioError("");
      return;
    }

    video.muted = false;
    video.defaultMuted = false;
    video.volume = 1;
    setAudioError("");
    void video
      .play()
      .then(() => {
        video.muted = false;
        video.defaultMuted = false;
        video.volume = 1;
        setAudioUnlocked(true);
        setAudioError("");
      })
      .catch(() => {
        video.muted = true;
        video.defaultMuted = true;
        setAudioUnlocked(false);
        setAudioError("Tap play, then Sound on");
      });
  }

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

  const fallbackNotice =
    videoSrc && videoFailed ? (
      <div
        style={{
          position: "absolute",
          left: 12,
          right: 12,
          bottom: 12,
          zIndex: 3,
          padding: "9px 12px",
          borderRadius: 999,
          background: "rgba(7, 24, 39, 0.76)",
          border: "1px solid rgba(255, 255, 255, 0.28)",
          color: "#F8FBFF",
          fontSize: 12,
          fontWeight: 800,
          lineHeight: 1.35,
          textAlign: "center",
          boxShadow: "0 12px 24px rgba(2, 12, 27, 0.22)",
          backdropFilter: "blur(10px)",
        }}
      >
        Video could not play here. Showing the cover for now.
      </div>
    ) : null;

  const audioOnLabel = props.audioUnlockLabel || "Sound on";
  const audioOffLabel = props.audioUnlockOffLabel || "Sound off";
  const audioVisibleLabel = audioUnlocked
    ? audioOffLabel
    : audioError
    ? props.audioUnlockErrorLabel || audioError
    : audioOnLabel;

  const audioUnlockButton = shouldShowAudioUnlock ? (
    <SecondaryButton
      data-media-control="true"
      onClick={toggleAudio}
      stableHeight={42}
      debugId="spotlight-media-frame.toggle-audio"
      style={{
        position: "absolute",
        right: 14,
        top: 14,
        zIndex: 4,
        minHeight: 42,
        padding: "10px 14px",
        borderRadius: 999,
        border: "1px solid rgba(255, 226, 160, 0.64)",
        background:
          "linear-gradient(180deg, rgba(255,244,204,0.98) 0%, rgba(244,196,83,0.94) 100%)",
        color: "#071827",
        fontSize: 13,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow: "0 14px 28px rgba(2, 12, 27, 0.28)",
        cursor: "pointer",
        touchAction: "manipulation",
        ...props.audioUnlockStyle,
      }}
      title={audioUnlocked ? "Turn video sound off" : "Turn video sound on"}
      aria-label={
        audioUnlocked
          ? "Turn video sound off"
          : "Turn video sound on"
      }
    >
      {audioVisibleLabel}
    </SecondaryButton>
  ) : null;

  if (videoSrc && !videoFailed) {
    return (
      <div style={frameStyle}>
        {backdrop}
        <div style={foregroundStyle}>
          <video
            data-media-control="true"
            ref={videoRef}
            src={videoSrc}
            poster={backdropSrc || undefined}
            controls={props.showVideoControls ?? true}
            autoPlay={props.autoPlayVideo ?? false}
            muted={props.mutedVideo ?? false}
            loop={props.loopVideo ?? false}
            playsInline
            preload="metadata"
            onError={() => setVideoFailed(true)}
            onLoadedMetadata={(event) => {
              const video = event.currentTarget;
              const shouldMute = props.mutedVideo ?? false;
              video.muted = shouldMute;
              video.defaultMuted = shouldMute;
              if (!shouldMute) {
                video.volume = 1;
              }
              setAudioUnlocked(false);
            }}
            onPlay={(event) => {
              const video = event.currentTarget;
              if (!video.muted && video.volume > 0) {
                setAudioUnlocked(true);
              }
            }}
            onVolumeChange={(event) => {
              const video = event.currentTarget;
              if (!video.muted && video.volume > 0 && !video.paused) {
                setAudioUnlocked(true);
              }
            }}
            onTimeUpdate={(event) => {
              if (!Number.isFinite(maxVideoSeconds) || maxVideoSeconds <= 0) {
                return;
              }

              const video = event.currentTarget;
              if (video.currentTime < maxVideoSeconds) return;

              if (props.loopVideo ?? false) {
                video.currentTime = 0;
                void video.play().catch(() => undefined);
                return;
              }

              video.pause();
            }}
            style={mediaStyle}
          />
        </div>
        {audioUnlockButton}
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
        {fallbackNotice}
      </div>
    );
  }

  return <>{props.fallback || null}</>;
}
