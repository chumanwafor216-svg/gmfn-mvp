export const SPOTLIGHT_PLAYBACK_SAMPLE_MS = 250;
export const SPOTLIGHT_PLAYBACK_STALL_THRESHOLD_MS = 1600;
export const SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS = 6000;
export const SPOTLIGHT_PLAYBACK_PROGRESS_EPSILON_SECONDS = 0.04;
export const SPOTLIGHT_PLAYBACK_QUALIFYING_PROGRESS_MS = 1000;

function normalizedOccurrenceId(value) {
  return String(value ?? '').trim();
}

export function spotlightPlaybackOccurrenceMatches(tracker, occurrenceId) {
  return tracker.occurrenceId === normalizedOccurrenceId(occurrenceId);
}

export function createSpotlightPlaybackTracker(nowMs = 0, occurrenceId = '') {
  return {
    occurrenceId: normalizedOccurrenceId(occurrenceId),
    phase: "pending",
    progressMs: 0,
    retryCount: 0,
    stalledForMs: 0,
    recoveryElapsedMs: 0,
    lastSampleAtMs: nowMs,
    lastMediaTimeSeconds: 0,
    pauseReason: null,
  };
}

function progressedSeconds(previousSeconds, currentSeconds, durationSeconds) {
  if (currentSeconds >= previousSeconds) {
    return currentSeconds - previousSeconds;
  }
  if (
    Number.isFinite(durationSeconds) &&
    durationSeconds > 0 &&
    previousSeconds > durationSeconds * 0.7 &&
    currentSeconds < durationSeconds * 0.3
  ) {
    return durationSeconds - previousSeconds + currentSeconds;
  }
  return 0;
}

export function markSpotlightPlaybackReady(
  tracker,
  nowMs,
  occurrenceId = tracker.occurrenceId
) {
  if (!spotlightPlaybackOccurrenceMatches(tracker, occurrenceId)) return tracker;
  return {
    ...tracker,
    phase: "ready",
    lastSampleAtMs: nowMs,
    pauseReason: null,
  };
}

export function markSpotlightPlaybackBuffering(
  tracker,
  occurrenceId = tracker.occurrenceId
) {
  if (!spotlightPlaybackOccurrenceMatches(tracker, occurrenceId)) return tracker;
  if (["fallback", "unavailable", "completed"].includes(tracker.phase)) {
    return tracker;
  }
  return {
    ...tracker,
    phase: "buffering",
    pauseReason: null,
  };
}

export function beginSpotlightPlaybackRetry(
  tracker,
  occurrenceId = tracker.occurrenceId
) {
  if (!spotlightPlaybackOccurrenceMatches(tracker, occurrenceId)) return tracker;
  if (tracker.retryCount >= 1) return tracker;
  return {
    ...tracker,
    phase: "retrying",
    retryCount: 1,
    pauseReason: null,
  };
}

export function markSpotlightPlaybackTerminal(
  tracker,
  phase,
  nowMs,
  occurrenceId = tracker.occurrenceId
) {
  if (!spotlightPlaybackOccurrenceMatches(tracker, occurrenceId)) return tracker;
  return {
    ...tracker,
    phase,
    lastSampleAtMs: nowMs,
    pauseReason: null,
  };
}

export function sampleSpotlightPlayback(tracker, input) {
  if (!spotlightPlaybackOccurrenceMatches(tracker, input.occurrenceId)) {
    return { tracker, action: 'none', ignored: true };
  }
  if (['fallback', 'unavailable', 'completed'].includes(tracker.phase)) {
    return { tracker, action: 'none' };
  }
  const nowMs = Number(input.nowMs);
  const currentSeconds = Math.max(0, Number(input.mediaTimeSeconds) || 0);
  const elapsedMs = Math.max(0, nowMs - tracker.lastSampleAtMs);
  const deltaSeconds = progressedSeconds(
    tracker.lastMediaTimeSeconds,
    currentSeconds,
    Number(input.durationSeconds) || 0
  );
  const progressed =
    deltaSeconds >= SPOTLIGHT_PLAYBACK_PROGRESS_EPSILON_SECONDS;
  const base = {
    ...tracker,
    lastSampleAtMs: nowMs,
    lastMediaTimeSeconds: currentSeconds,
  };

  if (input.completed) {
    return {
      tracker: markSpotlightPlaybackTerminal(base, "completed", nowMs),
      action: "none",
    };
  }

  if (!input.expectedToProgress) {
    return {
      tracker: {
        ...base,
        phase: input.pauseReason ? "paused" : "ready",
        pauseReason: input.pauseReason || null,
      },
      action: "none",
    };
  }

  if (progressed) {
    const progressMs =
      tracker.progressMs + Math.max(0, Math.round(deltaSeconds * 1000));
    const presentationDurationMs = Math.max(
      0,
      Number(input.presentationDurationMs) || 0
    );
    return {
      tracker: {
        ...base,
        phase:
          presentationDurationMs > 0 && progressMs >= presentationDurationMs
            ? "completed"
            : "progressing",
        progressMs,
        stalledForMs: 0,
        recoveryElapsedMs: tracker.recoveryElapsedMs,
        pauseReason: null,
      },
      action: "none",
    };
  }

  const stalledForMs = tracker.stalledForMs + elapsedMs;
  const recoveryElapsedMs = tracker.recoveryElapsedMs + elapsedMs;
  if (stalledForMs < SPOTLIGHT_PLAYBACK_STALL_THRESHOLD_MS) {
    return {
      tracker: {
        ...base,
        phase: 'buffering',
        stalledForMs,
        recoveryElapsedMs,
        pauseReason: null,
      },
      action: "none",
    };
  }

  if (tracker.retryCount === 0) {
    return {
      tracker: {
        ...base,
        phase: "stalled",
        stalledForMs,
        recoveryElapsedMs,
        pauseReason: null,
      },
      action: "retry",
    };
  }

  if (recoveryElapsedMs >= SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS) {
    return {
      tracker: {
        ...base,
        phase: "stalled",
        stalledForMs,
        recoveryElapsedMs,
        pauseReason: null,
      },
      action: "fail",
    };
  }

  return {
    tracker: {
      ...base,
      phase: "retrying",
      stalledForMs,
      recoveryElapsedMs,
      pauseReason: null,
    },
    action: "none",
  };
}

export function spotlightPlaybackCanQualify(tracker) {
  return (
    tracker.progressMs >= SPOTLIGHT_PLAYBACK_QUALIFYING_PROGRESS_MS &&
    ['progressing', 'completed'].includes(tracker.phase)
  );
}

export function spotlightPlaybackPausesDisplayClock(tracker) {
  return [
    'pending',
    'ready',
    'playing',
    'buffering',
    'stalled',
    'retrying',
    'fallback',
    'unavailable',
  ].includes(tracker.phase);
}
