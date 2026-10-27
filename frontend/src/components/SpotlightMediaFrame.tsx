import React, { useEffect, useMemo, useRef, useState } from "react";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
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
  preloadVideo?: 'none' | 'metadata' | 'auto';
  maxVideoSeconds?: number | null;
  showAudioUnlock?: boolean;
  audioUnlockLabel?: string;
  audioUnlockOffLabel?: string;
  audioUnlockErrorLabel?: string;
  audioUnlockStyle?: React.CSSProperties;
  audioEnabled?: boolean;
  onAudioEnabledChange?: (enabled: boolean) => void;
  preserveVideoElement?: boolean;
  onMediaReady?: (details: SpotlightMediaReadyDetails) => void;
  onMediaUnavailable?: () => void;
};

export type SpotlightMediaReadyDetails = {
  kind: 'image' | 'video';
  durationSeconds: number | null;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueMediaValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => safeStr(value)).filter(Boolean))];
}

const IMAGE_AUTO_RETRY_LIMIT = 2;

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
  const [imageRetryCount, setImageRetryCount] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [audioError, setAudioError] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retainedVideoSrcRef = useRef("");
  const lastAudioToggleRef = useRef(0);
  const mediaReportRef = useRef<'pending' | 'ready' | 'unavailable'>(
    'pending'
  );

  useEffect(() => {
    mediaReportRef.current = 'pending';
    setImageIndex(0);
    setVideoFailed(false);
    setImageFailed(false);
    setImageRetryCount(0);
    setAudioUnlocked(false);
    setAudioError("");
  }, [imageCandidateKey, props.videoUrl]);

  useEffect(() => {
    const hasVideo = Boolean(safeStr(props.videoUrl));
    const hasImage = imageCandidates.length > 0;
    const videoUnavailable = !hasVideo || videoFailed;
    const imageUnavailable =
      !hasImage ||
      (imageFailed && imageRetryCount >= IMAGE_AUTO_RETRY_LIMIT);

    if (
      videoUnavailable &&
      imageUnavailable &&
      mediaReportRef.current === 'pending'
    ) {
      mediaReportRef.current = 'unavailable';
      props.onMediaUnavailable?.();
    }
  }, [
    imageCandidates.length,
    imageFailed,
    imageRetryCount,
    props.onMediaUnavailable,
    props.videoUrl,
    videoFailed,
  ]);

  useEffect(() => {
    if (
      !imageFailed ||
      imageCandidates.length === 0 ||
      imageRetryCount >= IMAGE_AUTO_RETRY_LIMIT ||
      typeof window === "undefined"
    ) {
      return;
    }

    const retryDelayMs = 900 * (imageRetryCount + 1);
    const retryTimer = window.setTimeout(() => {
      setImageRetryCount((count) => count + 1);
      setImageIndex(0);
      setImageFailed(false);
    }, retryDelayMs);

    return () => window.clearTimeout(retryTimer);
  }, [imageCandidates.length, imageFailed, imageRetryCount]);

  useEffect(() => {
    if (
      imageCandidates.length === 0 ||
      typeof window === "undefined" ||
      typeof document === "undefined"
    ) {
      return;
    }

    function retryVisibleMedia() {
      if (
        typeof document !== "undefined" &&
        document.visibilityState &&
        document.visibilityState !== "visible"
      ) {
        return;
      }

      setImageRetryCount(0);
      setImageIndex(0);
      setImageFailed(false);
      setVideoFailed(false);
    }

    window.addEventListener("focus", retryVisibleMedia);
    window.addEventListener("online", retryVisibleMedia);
    document.addEventListener("visibilitychange", retryVisibleMedia);

    return () => {
      window.removeEventListener("focus", retryVisibleMedia);
      window.removeEventListener("online", retryVisibleMedia);
      document.removeEventListener("visibilitychange", retryVisibleMedia);
    };
  }, [imageCandidateKey, imageCandidates.length]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const shouldMute =
      props.audioEnabled === undefined
        ? props.mutedVideo ?? false
        : !props.audioEnabled;
    video.muted = shouldMute;
    video.defaultMuted = shouldMute;
    if (!shouldMute) {
      video.volume = 1;
    }
    setAudioUnlocked(false);
    setAudioError("");

    if (!(props.autoPlayVideo ?? false)) {
      video.pause();
      return;
    }

    // A preloaded Spotlight video can be promoted without remounting. Start it
    // explicitly when autoplay changes from false to true; changing the DOM
    // autoplay attribute alone is not reliable on mobile Safari.
    if (shouldMute) {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
      return;
    }

    if (!shouldMute && (props.autoPlayVideo ?? false)) {
      video.currentTime = 0;
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
          setAudioError("Tap for sound");
        });
    }
  }, [
    props.audioEnabled,
    props.autoPlayVideo,
    props.mutedVideo,
    props.videoUrl,
  ]);

  const imageSrc = imageCandidates[imageIndex] || "";
  const videoSrc = safeStr(props.videoUrl);
  useEffect(() => {
    if (videoSrc) retainedVideoSrcRef.current = videoSrc;
  }, [videoSrc]);
  const backdropSrc = safeStr(props.videoPoster) || imageSrc;
  const maxVideoSeconds = Number(props.maxVideoSeconds || 0);
  const shouldShowAudioUnlock =
    Boolean(videoSrc) &&
    Boolean(props.showAudioUnlock);

  useEffect(() => {
    const video = videoRef.current;
    if (
      videoSrc &&
      !videoFailed &&
      video &&
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      mediaReportRef.current === 'pending'
    ) {
      reportMediaReady({
        kind: 'video',
        durationSeconds: readableVideoDurationSeconds(video),
      });
      return;
    }

    const image = imageRef.current;
    if (
      (!videoSrc || videoFailed) &&
      image &&
      image.complete &&
      image.naturalWidth > 0 &&
      mediaReportRef.current === 'pending'
    ) {
      reportMediaReady({ kind: 'image', durationSeconds: null });
    }
  }, [imageSrc, props.onMediaReady, videoFailed, videoSrc]);

  function stopMediaControlEvent(event?: React.SyntheticEvent) {
    event?.preventDefault();
    event?.stopPropagation();
  }

  function readableVideoDurationSeconds(video: HTMLVideoElement): number | null {
    const durationSeconds = Number(video.duration);
    return Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : null;
  }

  function reportMediaReady(details: SpotlightMediaReadyDetails) {
    if (mediaReportRef.current === 'ready') return;
    mediaReportRef.current = 'ready';
    props.onMediaReady?.(details);
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
      props.onAudioEnabledChange?.(false);
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
        props.onAudioEnabledChange?.(true);
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
  const audioUnlockIconOnly = [
    props.audioUnlockStyle?.width,
    props.audioUnlockStyle?.minWidth,
  ].some((value) => typeof value === "number" && value <= 52);
  const audioUnlockButtonSize =
    typeof props.audioUnlockStyle?.width === "number"
      ? props.audioUnlockStyle.width
      : typeof props.audioUnlockStyle?.minWidth === "number"
      ? props.audioUnlockStyle.minWidth
      : undefined;
  const audioIconSize = audioUnlockIconOnly
    ? Math.max(24, Math.min(30, (audioUnlockButtonSize || 44) - 14))
    : 28;

  const audioUnlockButton = shouldShowAudioUnlock ? (
    <SecondaryButton
      data-media-control="true"
      onClick={toggleAudio}
      stableHeight={52}
      debugId="spotlight-media-frame.toggle-audio"
      style={{
        position: "absolute",
        right: 14,
        top: 14,
        zIndex: 4,
        minHeight: 42,
        padding: "8px 12px 8px 8px",
        borderRadius: 999,
        border: "1px solid rgba(226, 192, 106, 0.38)",
        background: "rgba(255, 255, 255, 0.94)",
        color: "#071827",
        fontSize: 13,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow:
          "0 14px 28px rgba(2, 12, 27, 0.18), inset 0 1px 0 rgba(255,255,255,0.96)",
        cursor: "pointer",
        touchAction: "manipulation",
        boxSizing: "border-box",
        overflowAnchor: "none",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: audioUnlockIconOnly ? 0 : 7,
        whiteSpace: "nowrap",
        ...props.audioUnlockStyle,
      }}
      title={audioUnlocked ? "Turn video sound off" : "Turn video sound on"}
      aria-label={
        audioUnlocked
          ? "Turn video sound off"
          : "Turn video sound on"
      }
    >
      <span
        aria-hidden="true"
        style={{
          position: "relative",
          width: audioIconSize,
          height: audioIconSize,
          minWidth: audioIconSize,
          display: "inline-grid",
          placeItems: "center",
          flex: `0 0 ${audioIconSize}px`,
          overflowAnchor: "none",
        }}
      >
        <GsnLegacyIcon name="speaker" size={audioIconSize} decorative />
        <span
          data-spotlight-audio-muted-slash="true"
          style={{
            position: "absolute",
            left: Math.max(4, Math.round(audioIconSize * 0.16)),
            right: Math.max(4, Math.round(audioIconSize * 0.16)),
            top: "50%",
            height: Math.max(3, Math.round(audioIconSize * 0.12)),
            borderRadius: 999,
            background: "#0B2D4A",
            boxShadow: "0 1px 0 rgba(255,255,255,0.68)",
            opacity: audioUnlocked ? 0 : 1,
            transform: "translateY(-50%) rotate(-38deg)",
            pointerEvents: "none",
          }}
        />
      </span>
      {audioUnlockIconOnly ? null : (
        <span
          style={{
            display: "inline-block",
            minWidth: 60,
            textAlign: "left",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {audioVisibleLabel}
        </span>
      )}
    </SecondaryButton>
  ) : null;

  const videoIsVisible = Boolean(videoSrc && !videoFailed);
  const retainedVideoSrc =
    videoSrc ||
    (props.preserveVideoElement ? retainedVideoSrcRef.current : "");
  const videoMediaElement = (
    <video
      data-media-control="true"
      ref={videoRef}
      src={retainedVideoSrc || undefined}
      poster={backdropSrc || undefined}
      controls={videoIsVisible && (props.showVideoControls ?? true)}
      autoPlay={videoIsVisible && (props.autoPlayVideo ?? false)}
      muted={
        props.audioEnabled === undefined
          ? props.mutedVideo ?? false
          : !props.audioEnabled
      }
      loop={videoIsVisible && (props.loopVideo ?? false)}
      playsInline
      preload={props.preloadVideo || 'metadata'}
      onError={() => {
        if (videoSrc) setVideoFailed(true);
      }}
      onLoadedData={(event) => {
        if (videoIsVisible) {
          reportMediaReady({
            kind: 'video',
            durationSeconds: readableVideoDurationSeconds(event.currentTarget),
          });
        }
      }}
      onCanPlay={(event) => {
        if (videoIsVisible) {
          reportMediaReady({
            kind: 'video',
            durationSeconds: readableVideoDurationSeconds(event.currentTarget),
          });
        }
      }}
      onLoadedMetadata={(event) => {
        if (!videoIsVisible) return;
        const video = event.currentTarget;
        const shouldMute =
          props.audioEnabled === undefined
            ? props.mutedVideo ?? false
            : !props.audioEnabled;
        video.muted = shouldMute;
        video.defaultMuted = shouldMute;
        if (!shouldMute) {
          video.volume = 1;
          void video
            .play()
            .then(() => {
              setAudioUnlocked(true);
              setAudioError("");
            })
            .catch(() => {
              video.muted = true;
              video.defaultMuted = true;
              setAudioUnlocked(false);
              setAudioError("Tap for sound");
            });
          return;
        }
        setAudioUnlocked(false);
      }}
      onPlay={(event) => {
        const video = event.currentTarget;
        if (videoIsVisible && !video.muted && video.volume > 0) {
          setAudioUnlocked(true);
        }
      }}
      onVolumeChange={(event) => {
        const video = event.currentTarget;
        if (
          videoIsVisible &&
          !video.muted &&
          video.volume > 0 &&
          !video.paused
        ) {
          setAudioUnlocked(true);
        }
      }}
      onTimeUpdate={(event) => {
        if (
          !videoIsVisible ||
          !Number.isFinite(maxVideoSeconds) ||
          maxVideoSeconds <= 0
        ) {
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
      style={videoIsVisible ? mediaStyle : { display: "none" }}
    />
  );

  const imageMediaElement = imageSrc && !imageFailed ? (
    <img
      ref={imageRef}
      src={imageSrc}
      alt={props.alt}
      onLoad={() => {
        // A cover is not the effective medium while its video is pending.
        // It becomes the governed image only when there is no video or the
        // video has failed.
        if (!videoSrc || videoFailed) {
          reportMediaReady({ kind: 'image', durationSeconds: null });
        }
      }}
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
  ) : null;

  if (props.preserveVideoElement) {
    return (
      <div style={frameStyle}>
        {backdrop}
        <div style={foregroundStyle}>
          {videoMediaElement}
          {!videoIsVisible
            ? imageMediaElement || props.fallback || null
            : null}
        </div>
        {audioUnlockButton}
        {fallbackNotice}
      </div>
    );
  }

  if (videoSrc && !videoFailed) {
    return (
      <div style={frameStyle}>
        {backdrop}
        <div style={foregroundStyle}>
          {videoMediaElement}
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
          {imageMediaElement}
        </div>
        {fallbackNotice}
      </div>
    );
  }

  return <>{props.fallback || null}</>;
}
