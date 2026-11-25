export type SpotlightPlaybackPhase =
  | "pending"
  | "ready"
  | "playing"
  | "progressing"
  | "buffering"
  | "stalled"
  | "retrying"
  | "paused"
  | "fallback"
  | "unavailable"
  | "completed";

export type SpotlightPlaybackPauseReason =
  | "manual"
  | "background"
  | "reduced-motion"
  | "gesture-blocked"
  | null;

export type SpotlightPlaybackTracker = {
  occurrenceId: string;
  phase: SpotlightPlaybackPhase;
  progressMs: number;
  retryCount: number;
  stalledForMs: number;
  recoveryElapsedMs: number;
  lastSampleAtMs: number;
  lastMediaTimeSeconds: number;
  pauseReason: SpotlightPlaybackPauseReason;
};

export type SpotlightPlaybackSampleInput = {
  occurrenceId: string;
  nowMs: number;
  mediaTimeSeconds: number;
  durationSeconds?: number | null;
  presentationDurationMs?: number | null;
  expectedToProgress: boolean;
  pauseReason?: SpotlightPlaybackPauseReason;
  completed?: boolean;
};

export type SpotlightPlaybackSampleResult = {
  tracker: SpotlightPlaybackTracker;
  action: "none" | "retry" | "fail";
  ignored?: boolean;
};

export type SpotlightPlaybackStatus = Pick<
  SpotlightPlaybackTracker,
  'phase' | 'progressMs'
>;

export const SPOTLIGHT_PLAYBACK_SAMPLE_MS: number;
export const SPOTLIGHT_PLAYBACK_STALL_THRESHOLD_MS: number;
export const SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS: number;
export const SPOTLIGHT_PLAYBACK_PROGRESS_EPSILON_SECONDS: number;
export const SPOTLIGHT_PLAYBACK_QUALIFYING_PROGRESS_MS: number;

export function createSpotlightPlaybackTracker(
  nowMs?: number,
  occurrenceId?: string
): SpotlightPlaybackTracker;
export function spotlightPlaybackOccurrenceMatches(
  tracker: SpotlightPlaybackTracker,
  occurrenceId: string
): boolean;
export function markSpotlightPlaybackReady(
  tracker: SpotlightPlaybackTracker,
  nowMs: number,
  occurrenceId?: string
): SpotlightPlaybackTracker;
export function markSpotlightPlaybackBuffering(
  tracker: SpotlightPlaybackTracker,
  occurrenceId?: string
): SpotlightPlaybackTracker;
export function beginSpotlightPlaybackRetry(
  tracker: SpotlightPlaybackTracker,
  occurrenceId?: string
): SpotlightPlaybackTracker;
export function markSpotlightPlaybackTerminal(
  tracker: SpotlightPlaybackTracker,
  phase: "fallback" | "unavailable" | "completed",
  nowMs: number,
  occurrenceId?: string
): SpotlightPlaybackTracker;
export function sampleSpotlightPlayback(
  tracker: SpotlightPlaybackTracker,
  input: SpotlightPlaybackSampleInput
): SpotlightPlaybackSampleResult;
export function spotlightPlaybackCanQualify(
  tracker: SpotlightPlaybackStatus
): boolean;
export function spotlightPlaybackPausesDisplayClock(
  tracker: SpotlightPlaybackStatus
): boolean;
