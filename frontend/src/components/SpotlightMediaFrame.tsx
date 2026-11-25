import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { GsnLegacyIcon } from "./GsnLegacyIcon";
import { SecondaryButton } from "./StableButton";

import {
  SPOTLIGHT_PLAYBACK_SAMPLE_MS,
  beginSpotlightPlaybackRetry,
  createSpotlightPlaybackTracker,
  markSpotlightPlaybackBuffering,
  markSpotlightPlaybackReady,
  markSpotlightPlaybackTerminal,
  sampleSpotlightPlayback,
  type SpotlightPlaybackPauseReason,
  type SpotlightPlaybackPhase,
  type SpotlightPlaybackTracker,
} from '../lib/spotlightPlaybackPolicy.js';

type SpotlightMediaFrameProps = {
  imageUrl?: string | null;
  imageCandidates?: string[];
  imageLoading?: 'eager' | 'lazy';
  imageFetchPriority?: 'high' | 'low' | 'auto';
  imageSizes?: string;
  preserveNaturalColor?: boolean;
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
  showPlaybackControl?: boolean;
  playbackControlStyle?: React.CSSProperties;
  audioEnabled?: boolean;
  onAudioEnabledChange?: (enabled: boolean) => void;
  preserveVideoElement?: boolean;
  monitorPlayback?: boolean;
  occurrenceId?: string;
  presentationDurationMs?: number | null;
  onMediaReady?: (details: SpotlightMediaReadyDetails) => void;
  onMediaUnavailable?: (details: SpotlightMediaUnavailableDetails) => void;
  onPlaybackStateChange?: (details: SpotlightPlaybackStateDetails) => void;
};

export type SpotlightMediaReadyDetails = {
  occurrenceId: string;
  kind: 'image' | 'video';
  durationSeconds: number | null;
  fallbackFromVideo?: boolean;
};

export type SpotlightMediaUnavailableDetails = {
  occurrenceId: string;
};

export type SpotlightPlaybackStateDetails = {
  occurrenceId: string;
  phase: SpotlightPlaybackPhase;
  progressMs: number;
  retryCount: number;
  pauseReason: SpotlightPlaybackPauseReason;
  bufferedAheadSeconds: number;
  droppedFrames: number | null;
  totalFrames: number | null;
};

function safeStr(value: unknown): string {
  return String(value ?? "").trim();
}

function uniqueMediaValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.map((value) => safeStr(value)).filter(Boolean))];
}

const IMAGE_AUTO_RETRY_LIMIT = 2;

function playbackNowMs(): number {
  return typeof performance !== 'undefined' &&
    typeof performance.now === 'function'
    ? performance.now()
    : Date.now();
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
  const videoSrc = safeStr(props.videoUrl);
  const playbackOccurrenceId =
    safeStr(props.occurrenceId) ||
    `media:${imageCandidateKey}|${videoSrc}`;
  const occurrenceGeneration = useMemo(
    () => ({ occurrenceId: playbackOccurrenceId, videoSrc }),
    [playbackOccurrenceId, videoSrc]
  );

  const [imageIndex, setImageIndex] = useState(0);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoPosterFailed, setVideoPosterFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [imageRetryCount, setImageRetryCount] = useState(0);
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const [manualPaused, setManualPaused] = useState(false);
  const [audioError, setAudioError] = useState("");
  const imageRef = useRef<HTMLImageElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retainedVideoSrcRef = useRef("");
  const lastAudioToggleRef = useRef(0);
  const manualPausedRef = useRef(false);
  const userPlaybackRequestedRef = useRef(false);
  const gestureBlockedRef = useRef(false);
  const retryResumeTimeRef = useRef<number | null>(null);
  const retryPlayRequestedRef = useRef(false);
  const activeOccurrenceGenerationRef = useRef(occurrenceGeneration);
  const playRequestRef = useRef<{
    generation: typeof occurrenceGeneration;
    requestId: number;
  } | null>(null);
  const playRequestSequenceRef = useRef(0);
  const playbackTrackerRef = useRef<SpotlightPlaybackTracker>(
    createSpotlightPlaybackTracker(playbackNowMs(), playbackOccurrenceId)
  );
  const playbackReportSignatureRef = useRef('');
  const mediaReportRef = useRef<'pending' | 'ready' | 'unavailable'>(
    'pending'
  );
  const onMediaReadyRef = useRef(props.onMediaReady);
  const onMediaUnavailableRef = useRef(props.onMediaUnavailable);
  const onPlaybackStateChangeRef = useRef(props.onPlaybackStateChange);
  onMediaReadyRef.current = props.onMediaReady;
  onMediaUnavailableRef.current = props.onMediaUnavailable;
  onPlaybackStateChangeRef.current = props.onPlaybackStateChange;

  useLayoutEffect(() => {
    activeOccurrenceGenerationRef.current = occurrenceGeneration;
    playRequestRef.current = null;
    mediaReportRef.current = 'pending';
    setImageIndex(0);
    setVideoFailed(false);
    setVideoPosterFailed(false);
    setImageFailed(false);
    setImageRetryCount(0);
    setVideoPlaying(false);
    setManualPaused(false);
    manualPausedRef.current = false;
    userPlaybackRequestedRef.current = false;
    gestureBlockedRef.current = false;
    retryResumeTimeRef.current = null;
    retryPlayRequestedRef.current = false;
    playbackTrackerRef.current = createSpotlightPlaybackTracker(
      playbackNowMs(),
      playbackOccurrenceId
    );
    playbackReportSignatureRef.current = '';
    setAudioUnlocked(false);
    setAudioError("");
    const video = videoRef.current;
    if (video) {
      video.pause();
      if (Number.isFinite(video.currentTime) && video.currentTime > 0) {
        try {
          video.currentTime = 0;
        } catch {
          retryResumeTimeRef.current = null;
        }
      }
    }
  }, [occurrenceGeneration, playbackOccurrenceId]);

  useEffect(() => {
    const hasVideo = Boolean(safeStr(props.videoUrl));
    const hasImage =
      imageCandidates.length > 0 ||
      (Boolean(safeStr(props.videoPoster)) && !videoPosterFailed);
    const videoUnavailable = !hasVideo || videoFailed;
    const imageUnavailable =
      !hasImage ||
      (imageFailed && imageRetryCount >= IMAGE_AUTO_RETRY_LIMIT);

    if (
      videoUnavailable &&
      imageUnavailable &&
      mediaReportRef.current === 'pending' &&
      activeOccurrenceGenerationRef.current === occurrenceGeneration
    ) {
      mediaReportRef.current = 'unavailable';
      onMediaUnavailableRef.current?.({ occurrenceId: playbackOccurrenceId });
    }
  }, [
    imageCandidates.length,
    imageFailed,
    imageRetryCount,
    occurrenceGeneration,
    playbackOccurrenceId,
    props.videoPoster,
    props.videoUrl,
    videoFailed,
    videoPosterFailed,
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
      (!imageFailed && !videoFailed)
    ) {
      return;
    }

    function retryFailedMedia() {
      setImageRetryCount(0);
      setImageIndex(0);
      setImageFailed(false);
      setVideoPosterFailed(false);
      if (!props.monitorPlayback) {
        setVideoFailed(false);
      }
    }

    window.addEventListener("online", retryFailedMedia);

    return () => {
      window.removeEventListener("online", retryFailedMedia);
    };
  }, [
    imageCandidateKey,
    imageCandidates.length,
    imageFailed,
    props.monitorPlayback,
    videoFailed,
    videoPosterFailed,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;

    const shouldMute =
      props.audioEnabled === undefined
        ? props.mutedVideo ?? false
        : !props.audioEnabled;
    video.muted = shouldMute;
    video.defaultMuted = shouldMute;
    if (!shouldMute) {
      video.volume = 1;
    }
    setAudioUnlocked(!shouldMute);
  }, [
    props.audioEnabled,
    props.mutedVideo,
    occurrenceGeneration,
  ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;
    if (!(props.autoPlayVideo ?? false)) {
      if (!userPlaybackRequestedRef.current) video.pause();
      return;
    }
    requestVideoPlayback(video, occurrenceGeneration, 'autoplay');
  }, [occurrenceGeneration, props.autoPlayVideo]);

  const candidateImageSrc = imageCandidates[imageIndex] || '';
  const imageSrc =
    videoFailed && !videoPosterFailed
      ? safeStr(props.videoPoster) || candidateImageSrc
      : candidateImageSrc;
  useEffect(() => {
    if (videoSrc) retainedVideoSrcRef.current = videoSrc;
  }, [videoSrc]);
  const backdropSrc = safeStr(props.videoPoster) || imageSrc;
  const maxVideoSeconds = Number(props.maxVideoSeconds || 0);
  const shouldShowAudioUnlock =
    Boolean(videoSrc) &&
    Boolean(props.showAudioUnlock);
  const shouldShowPlaybackControl =
    Boolean(videoSrc) &&
    !videoFailed &&
    Boolean(props.showPlaybackControl);

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
      }, occurrenceGeneration, video);
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
      reportMediaReady({
        kind: 'image',
        durationSeconds: null,
        fallbackFromVideo: videoFailed,
      });
    }
  }, [imageSrc, occurrenceGeneration, videoFailed, videoSrc]);

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

  function resolvedSourceMatches(
    currentSource: string,
    expectedSource: string
  ): boolean {
    if (!currentSource || !expectedSource) return currentSource === expectedSource;
    try {
      return currentSource === new URL(expectedSource, document.baseURI).href;
    } catch {
      return currentSource === expectedSource;
    }
  }

  function sourceMatchesOccurrence(
    video: HTMLVideoElement,
    generation: typeof occurrenceGeneration
  ): boolean {
    if (!generation.videoSrc) return true;
    const currentSource = safeStr(video.currentSrc);
    return currentSource
      ? resolvedSourceMatches(currentSource, generation.videoSrc)
      : safeStr(video.getAttribute('src')) === generation.videoSrc;
  }

  function isCurrentOccurrenceVideo(
    video: HTMLVideoElement,
    generation: typeof occurrenceGeneration
  ): boolean {
    return (
      activeOccurrenceGenerationRef.current === generation &&
      videoRef.current === video &&
      sourceMatchesOccurrence(video, generation)
    );
  }

  function isCurrentOccurrenceImage(
    image: HTMLImageElement,
    generation: typeof occurrenceGeneration,
    expectedSource: string
  ): boolean {
    const currentSource = safeStr(image.currentSrc || image.src);
    return (
      activeOccurrenceGenerationRef.current === generation &&
      imageRef.current === image &&
      resolvedSourceMatches(currentSource, expectedSource)
    );
  }

  function reportMediaReady(
    details: Omit<SpotlightMediaReadyDetails, 'occurrenceId'>,
    generation = occurrenceGeneration,
    video?: HTMLVideoElement
  ) {
    if (activeOccurrenceGenerationRef.current !== generation) return;
    if (video && !isCurrentOccurrenceVideo(video, generation)) return;
    if (
      details.kind === 'video' &&
      ['fallback', 'unavailable'].includes(playbackTrackerRef.current.phase)
    ) return;
    if (mediaReportRef.current === 'ready') return;
    mediaReportRef.current = 'ready';
    onMediaReadyRef.current?.({
      ...details,
      occurrenceId: generation.occurrenceId,
    });
    if (details.kind === 'video') {
      reportPlaybackTracker(
        markSpotlightPlaybackReady(
          playbackTrackerRef.current,
          playbackNowMs(),
          generation.occurrenceId
        ),
        generation
      );
    }
  }

  function playbackBufferAheadSeconds(video: HTMLVideoElement): number {
    for (let index = 0; index < video.buffered.length; index += 1) {
      if (
        video.currentTime >= video.buffered.start(index) &&
        video.currentTime <= video.buffered.end(index)
      ) {
        return Math.max(0, video.buffered.end(index) - video.currentTime);
      }
    }
    return 0;
  }

  function reportPlaybackTracker(
    nextTracker: SpotlightPlaybackTracker,
    generation = occurrenceGeneration
  ) {
    if (
      activeOccurrenceGenerationRef.current !== generation ||
      nextTracker.occurrenceId !== generation.occurrenceId
    ) {
      return;
    }
    playbackTrackerRef.current = nextTracker;
    const progressBucket = Math.floor(nextTracker.progressMs / 1000);
    const signature = [
      nextTracker.phase,
      progressBucket,
      nextTracker.retryCount,
      nextTracker.pauseReason || '',
    ].join('|');
    if (playbackReportSignatureRef.current === signature) return;
    playbackReportSignatureRef.current = signature;

    const video = videoRef.current;
    const quality =
      video && typeof video.getVideoPlaybackQuality === 'function'
        ? video.getVideoPlaybackQuality()
        : null;
    onPlaybackStateChangeRef.current?.({
      occurrenceId: generation.occurrenceId,
      phase: nextTracker.phase,
      progressMs: nextTracker.progressMs,
      retryCount: nextTracker.retryCount,
      pauseReason: nextTracker.pauseReason,
      bufferedAheadSeconds: video ? playbackBufferAheadSeconds(video) : 0,
      droppedFrames: quality ? quality.droppedVideoFrames : null,
      totalFrames: quality ? quality.totalVideoFrames : null,
    });
  }

  function requestVideoPlayback(
    video: HTMLVideoElement,
    generation: typeof occurrenceGeneration,
    reason: 'autoplay' | 'manual' | 'recovery' | 'loop'
  ) {
    if (!isCurrentOccurrenceVideo(video, generation)) return;
    if (['fallback', 'unavailable'].includes(playbackTrackerRef.current.phase)) {
      return;
    }
    if (manualPausedRef.current && reason !== 'manual') return;
    if (typeof document !== 'undefined' && document.hidden && reason !== 'manual') {
      return;
    }
    if (!video.paused && !video.ended) {
      gestureBlockedRef.current = false;
      setVideoPlaying(true);
      return;
    }
    if (playRequestRef.current?.generation === generation) return;

    const requestId = ++playRequestSequenceRef.current;
    playRequestRef.current = { generation, requestId };
    void video.play().then(
      () => {
        if (
          !isCurrentOccurrenceVideo(video, generation) ||
          playRequestRef.current?.requestId !== requestId
        ) {
          return;
        }
        playRequestRef.current = null;
        gestureBlockedRef.current = false;
        setVideoPlaying(true);
        if (!video.muted && video.volume > 0) {
          setAudioUnlocked(true);
          setAudioError('');
        }
      },
      () => {
        if (
          !isCurrentOccurrenceVideo(video, generation) ||
          playRequestRef.current?.requestId !== requestId
        ) {
          return;
        }
        playRequestRef.current = null;
        gestureBlockedRef.current = true;
        setVideoPlaying(false);
        setAudioError('Tap Play');
        reportPlaybackTracker(
          {
            ...playbackTrackerRef.current,
            phase: 'paused',
            pauseReason: 'gesture-blocked',
          },
          generation
        );
      }
    );
  }

  function failVideoToFallback(generation = occurrenceGeneration) {
    if (activeOccurrenceGenerationRef.current !== generation) return;
    playRequestRef.current = null;
    playRequestSequenceRef.current += 1;
    videoRef.current?.pause();
    const hasPermittedFallback =
      imageCandidates.length > 0 || Boolean(safeStr(props.videoPoster));
    mediaReportRef.current = 'pending';
    reportPlaybackTracker(
      markSpotlightPlaybackTerminal(
        playbackTrackerRef.current,
        hasPermittedFallback ? 'fallback' : 'unavailable',
        playbackNowMs(),
        generation.occurrenceId
      ),
      generation
    );
    setVideoPlaying(false);
    setVideoFailed(true);
  }

  function attemptVideoRecovery(generation = occurrenceGeneration) {
    const video = videoRef.current;
    if (
      !video ||
      !isCurrentOccurrenceVideo(video, generation) ||
      playbackTrackerRef.current.retryCount >= 1
    ) return;

    retryResumeTimeRef.current = Number.isFinite(video.currentTime)
      ? video.currentTime
      : 0;
    const retryTracker = beginSpotlightPlaybackRetry(
      playbackTrackerRef.current,
      generation.occurrenceId
    );
    retryPlayRequestedRef.current = false;
    playRequestRef.current = null;
    reportPlaybackTracker(retryTracker, generation);
    video.pause();
    video.load();
  }

  function pauseReasonForVideo(
    video: HTMLVideoElement
  ): SpotlightPlaybackPauseReason {
    if (typeof document !== 'undefined' && document.hidden) {
      return 'background';
    }
    if (manualPausedRef.current) return 'manual';
    if (gestureBlockedRef.current) return 'gesture-blocked';

    const playbackRequested =
      Boolean(props.autoPlayVideo) ||
      userPlaybackRequestedRef.current ||
      playbackTrackerRef.current.phase === 'retrying';
    if (!playbackRequested) return 'reduced-motion';
    return null;
  }

  useEffect(() => {
    if (
      !props.monitorPlayback ||
      !videoSrc ||
      videoFailed ||
      typeof window === 'undefined'
    ) {
      return;
    }

    function samplePlayback() {
      const video = videoRef.current;
      if (!video || !isCurrentOccurrenceVideo(video, occurrenceGeneration)) {
        return;
      }
      const tracker = playbackTrackerRef.current;

      const pauseReason = pauseReasonForVideo(video);
      const result = sampleSpotlightPlayback(tracker, {
        occurrenceId: occurrenceGeneration.occurrenceId,
        nowMs: playbackNowMs(),
        mediaTimeSeconds: video.currentTime,
        durationSeconds: readableVideoDurationSeconds(video),
        presentationDurationMs: props.presentationDurationMs,
        expectedToProgress: pauseReason === null,
        pauseReason,
      });
      if (result.ignored) return;
      reportPlaybackTracker(result.tracker, occurrenceGeneration);
      if (result.action === 'retry') {
        attemptVideoRecovery(occurrenceGeneration);
      } else if (result.action === 'fail') {
        failVideoToFallback(occurrenceGeneration);
      }
    }

    samplePlayback();
    const interval = window.setInterval(
      samplePlayback,
      SPOTLIGHT_PLAYBACK_SAMPLE_MS
    );
    return () => window.clearInterval(interval);
  }, [
    props.autoPlayVideo,
    props.monitorPlayback,
    props.presentationDurationMs,
    occurrenceGeneration,
    videoFailed,
    videoSrc,
  ]);

  function togglePlayback(event?: React.SyntheticEvent) {
    stopMediaControlEvent(event);
    const video = videoRef.current;
    if (!video || !isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;

    if (!video.paused && !manualPausedRef.current) {
      playRequestRef.current = null;
      playRequestSequenceRef.current += 1;
      manualPausedRef.current = true;
      setManualPaused(true);
      setVideoPlaying(false);
      video.pause();
      return;
    }

    manualPausedRef.current = false;
    userPlaybackRequestedRef.current = true;
    gestureBlockedRef.current = false;
    setManualPaused(false);
    requestVideoPlayback(video, occurrenceGeneration, 'manual');
  }

  function resumeRecoveredVideo(
    video: HTMLVideoElement,
    generation = occurrenceGeneration
  ) {
    if (
      !isCurrentOccurrenceVideo(video, generation) ||
      playbackTrackerRef.current.phase !== 'retrying' ||
      retryPlayRequestedRef.current
    ) return;
    const resumeTime = retryResumeTimeRef.current;
    if (
      resumeTime !== null &&
      Number.isFinite(resumeTime) &&
      Number.isFinite(video.duration) &&
      video.duration > 0
    ) {
      video.currentTime = Math.min(resumeTime, Math.max(0, video.duration - 0.1));
    }
    retryResumeTimeRef.current = null;

    if (
      manualPausedRef.current ||
      (typeof document !== 'undefined' && document.hidden)
    ) {
      return;
    }
    retryPlayRequestedRef.current = true;
    requestVideoPlayback(video, generation, 'recovery');
  }

  function toggleAudio(event?: React.SyntheticEvent) {
    stopMediaControlEvent(event);

    const now = Date.now();
    if (now - lastAudioToggleRef.current < 320) return;
    lastAudioToggleRef.current = now;

    const video = videoRef.current;
    if (!video || !isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;

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
    setAudioUnlocked(true);
    props.onAudioEnabledChange?.(true);
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
    filter: props.preserveNaturalColor
      ? "none"
      : "saturate(1.04) contrast(1.03)",
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
          filter: props.preserveNaturalColor
            ? "blur(24px) brightness(0.78)"
            : "blur(24px) saturate(1.12) brightness(0.9)",
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

  const playbackControlButton = shouldShowPlaybackControl ? (
    <SecondaryButton
      data-media-control='true'
      data-spotlight-playback-control='true'
      onClick={togglePlayback}
      stableHeight={52}
      debugId='spotlight-media-frame.toggle-playback'
      style={{
        position: 'absolute',
        right: shouldShowAudioUnlock ? 66 : 14,
        top: 14,
        zIndex: 4,
        width: 44,
        minWidth: 44,
        minHeight: 44,
        padding: 0,
        borderRadius: 999,
        border: '1px solid rgba(226, 192, 106, 0.38)',
        background: 'rgba(255, 255, 255, 0.94)',
        color: '#071827',
        fontSize: 20,
        fontWeight: 900,
        lineHeight: 1,
        boxShadow:
          '0 14px 28px rgba(2, 12, 27, 0.18), inset 0 1px 0 rgba(255,255,255,0.96)',
        cursor: 'pointer',
        touchAction: 'manipulation',
        display: 'inline-grid',
        placeItems: 'center',
        ...props.playbackControlStyle,
      }}
      title={videoPlaying && !manualPaused ? 'Pause video' : 'Play video'}
      aria-label={
        videoPlaying && !manualPaused ? 'Pause video' : 'Play video'
      }
    >
      <span aria-hidden='true' style={{ fontSize: 0 }}>
        <span style={{ fontSize: 16 }}>
          {videoPlaying && !manualPaused ? 'II' : '\u25B6'}
        </span>
      </span>
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
      onError={(event) => {
        const video = event.currentTarget;
        if (!videoSrc || !isCurrentOccurrenceVideo(video, occurrenceGeneration)) {
          return;
        }
        if (props.monitorPlayback && playbackTrackerRef.current.retryCount < 1) {
          attemptVideoRecovery(occurrenceGeneration);
          return;
        }
        failVideoToFallback(occurrenceGeneration);
      }}
      onLoadedData={(event) => {
        if (
          videoIsVisible &&
          isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration)
        ) {
          reportMediaReady({
            kind: 'video',
            durationSeconds: readableVideoDurationSeconds(event.currentTarget),
          }, occurrenceGeneration, event.currentTarget);
        }
      }}
      onCanPlay={(event) => {
        if (
          videoIsVisible &&
          isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration)
        ) {
          reportMediaReady({
            kind: 'video',
            durationSeconds: readableVideoDurationSeconds(event.currentTarget),
          }, occurrenceGeneration, event.currentTarget);
          resumeRecoveredVideo(event.currentTarget, occurrenceGeneration);
          if (props.autoPlayVideo ?? false) {
            requestVideoPlayback(
              event.currentTarget,
              occurrenceGeneration,
              'autoplay'
            );
          }
        }
      }}
      onLoadedMetadata={(event) => {
        if (
          !videoIsVisible ||
          !isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration)
        ) return;
        const video = event.currentTarget;
        const resumeTime = retryResumeTimeRef.current;
        if (
          resumeTime !== null &&
          Number.isFinite(video.duration) &&
          video.duration > 0
        ) {
          video.currentTime = Math.min(
            resumeTime,
            Math.max(0, video.duration - 0.1)
          );
        }
        const shouldMute =
          props.audioEnabled === undefined
            ? props.mutedVideo ?? false
            : !props.audioEnabled;
        video.muted = shouldMute;
        video.defaultMuted = shouldMute;
        if (!shouldMute) {
          video.volume = 1;
        }
        setAudioUnlocked(!shouldMute);
      }}
      onPlay={(event) => {
        const video = event.currentTarget;
        if (!isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;
        const playbackExpected =
          Boolean(props.autoPlayVideo) ||
          userPlaybackRequestedRef.current ||
          playbackTrackerRef.current.phase === 'retrying';
        if (manualPausedRef.current || !playbackExpected) {
          video.pause();
          return;
        }
        gestureBlockedRef.current = false;
        setVideoPlaying(true);
        if (videoIsVisible && !video.muted && video.volume > 0) {
          setAudioUnlocked(true);
        }
      }}
      onPlaying={(event) => {
        if (!isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration)) {
          return;
        }
        gestureBlockedRef.current = false;
        setVideoPlaying(true);
        reportPlaybackTracker(
          {
            ...playbackTrackerRef.current,
            phase: 'playing',
            pauseReason: null,
          },
          occurrenceGeneration
        );
      }}
      onPause={(event) => {
        if (!isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration)) {
          return;
        }
        setVideoPlaying(false);
      }}
      onWaiting={(event) => {
        if (
          props.monitorPlayback &&
          isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration) &&
          pauseReasonForVideo(event.currentTarget) === null
        ) {
          reportPlaybackTracker(
            markSpotlightPlaybackBuffering(
              playbackTrackerRef.current,
              occurrenceGeneration.occurrenceId
            ),
            occurrenceGeneration
          );
        }
      }}
      onStalled={(event) => {
        if (
          props.monitorPlayback &&
          isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration) &&
          pauseReasonForVideo(event.currentTarget) === null
        ) {
          reportPlaybackTracker(
            markSpotlightPlaybackBuffering(
              playbackTrackerRef.current,
              occurrenceGeneration.occurrenceId
            ),
            occurrenceGeneration
          );
        }
      }}
      onEnded={(event) => {
        if (!isCurrentOccurrenceVideo(event.currentTarget, occurrenceGeneration)) {
          return;
        }
        setVideoPlaying(false);
        if (!(props.loopVideo ?? false)) {
          reportPlaybackTracker(
            markSpotlightPlaybackTerminal(
              playbackTrackerRef.current,
              'completed',
              playbackNowMs(),
              occurrenceGeneration.occurrenceId
            ),
            occurrenceGeneration
          );
        }
      }}
      onVolumeChange={(event) => {
        const video = event.currentTarget;
        if (!isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;
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
        if (!isCurrentOccurrenceVideo(video, occurrenceGeneration)) return;
        if (video.currentTime < maxVideoSeconds) return;

        if (props.loopVideo ?? false) {
          video.currentTime = 0;
          requestVideoPlayback(video, occurrenceGeneration, 'loop');
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
      loading={props.imageLoading || 'lazy'}
      decoding="async"
      fetchPriority={props.imageFetchPriority || 'auto'}
      sizes={props.imageSizes}
      onLoad={(event) => {
        if (
          !isCurrentOccurrenceImage(
            event.currentTarget,
            occurrenceGeneration,
            imageSrc
          )
        ) return;
        // A cover is not the effective medium while its video is pending.
        // It becomes the governed image only when there is no video or the
        // video has failed.
        if (!videoSrc || videoFailed) {
          reportMediaReady({
            kind: 'image',
            durationSeconds: null,
            fallbackFromVideo: videoFailed,
          });
        }
      }}
      onError={(event) => {
        if (
          !isCurrentOccurrenceImage(
            event.currentTarget,
            occurrenceGeneration,
            imageSrc
          )
        ) return;
        if (
          videoFailed &&
          !videoPosterFailed &&
          safeStr(props.videoPoster) === imageSrc
        ) {
          setVideoPosterFailed(true);
          return;
        }
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
        {playbackControlButton}
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
        {playbackControlButton}
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
