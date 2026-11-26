import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS,
  SPOTLIGHT_PLAYBACK_STALL_THRESHOLD_MS,
  beginSpotlightPlaybackRetry,
  createSpotlightPlaybackTracker,
  markSpotlightPlaybackBuffering,
  markSpotlightPlaybackReady,
  markSpotlightPlaybackTerminal,
  sampleSpotlightPlayback,
  spotlightPlaybackCanQualify,
  spotlightPlaybackOccurrenceMatches,
  spotlightPlaybackPausesDisplayClock,
} from '../src/lib/spotlightPlaybackPolicy.js';

const mediaFrameSource = readFileSync(
  new URL('../src/components/SpotlightMediaFrame.tsx', import.meta.url),
  'utf8'
);
const publicShopSource = readFileSync(
  new URL('../src/pages/ShopGalleryPage.tsx', import.meta.url),
  'utf8'
);

function advance(tracker, nowMs, mediaTimeSeconds, overrides = {}) {
  return sampleSpotlightPlayback(tracker, {
    occurrenceId: overrides.occurrenceId ?? tracker.occurrenceId,
    nowMs,
    mediaTimeSeconds,
    durationSeconds: 10,
    presentationDurationMs: 8000,
    expectedToProgress: true,
    ...overrides,
  });
}

function progressingTracker(occurrenceId = 'occurrence-a', progressSamples = 4) {
  let tracker = markSpotlightPlaybackReady(
    createSpotlightPlaybackTracker(0, occurrenceId),
    0,
    occurrenceId
  );
  for (let index = 1; index <= progressSamples; index += 1) {
    tracker = advance(tracker, index * 250, index * 0.25).tracker;
  }
  return tracker;
}

function runStallUntilAction(tracker, startMs, action, options = {}) {
  let current = tracker;
  let nowMs = startMs;
  const deadline =
    startMs +
    SPOTLIGHT_PLAYBACK_STALL_THRESHOLD_MS +
    SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS +
    2000;
  while (nowMs <= deadline) {
    nowMs += 250;
    if (options.repeatBufferingEvents) {
      for (let index = 0; index < 3; index += 1) {
        current = markSpotlightPlaybackBuffering(
          current,
          current.occurrenceId
        );
      }
    }
    const result = advance(current, nowMs, current.lastMediaTimeSeconds);
    current = result.tracker;
    if (result.action === action) {
      return { tracker: current, nowMs };
    }
  }
  throw new Error(`Expected playback action: ${action}`);
}

{
  const tracker = progressingTracker('successful-playback');
  assert.equal(tracker.phase, 'progressing');
  assert.equal(tracker.progressMs, 1000);
  assert.equal(spotlightPlaybackCanQualify(tracker), true);
  assert.equal(spotlightPlaybackPausesDisplayClock(tracker), false);
}

{
  const first = progressingTracker('same-url-occurrence-1', 2);
  const second = createSpotlightPlaybackTracker(500, 'same-url-occurrence-2');
  assert.equal(first.progressMs, 500);
  assert.equal(first.occurrenceId, 'same-url-occurrence-1');
  assert.equal(second.progressMs, 0);
  assert.equal(second.retryCount, 0);
  assert.equal(second.pauseReason, null);
  assert.equal(
    spotlightPlaybackOccurrenceMatches(second, 'same-url-occurrence-1'),
    false
  );
}

{
  const current = createSpotlightPlaybackTracker(1000, 'current-occurrence');
  const staleSample = advance(current, 1250, 1, {
    occurrenceId: 'old-occurrence',
  });
  assert.equal(staleSample.ignored, true);
  assert.strictEqual(staleSample.tracker, current);
  assert.strictEqual(
    markSpotlightPlaybackBuffering(current, 'old-occurrence'),
    current
  );
  assert.strictEqual(
    beginSpotlightPlaybackRetry(current, 'old-occurrence'),
    current
  );
}

{
  let tracker = progressingTracker('repeated-buffering', 1);
  const retry = runStallUntilAction(tracker, 250, 'retry', {
    repeatBufferingEvents: true,
  });
  assert.ok(
    retry.nowMs - 250 <= SPOTLIGHT_PLAYBACK_STALL_THRESHOLD_MS + 250
  );
  tracker = beginSpotlightPlaybackRetry(
    retry.tracker,
    retry.tracker.occurrenceId
  );
  const failed = runStallUntilAction(tracker, retry.nowMs, 'fail', {
    repeatBufferingEvents: true,
  });
  assert.ok(
    failed.tracker.recoveryElapsedMs >= SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS
  );
  assert.ok(failed.nowMs - 250 <= SPOTLIGHT_PLAYBACK_RECOVERY_BUDGET_MS + 250);
}

{
  const tracker = progressingTracker('silent-stall', 1);
  const firstFrozenSample = advance(tracker, 500, tracker.lastMediaTimeSeconds);
  assert.equal(firstFrozenSample.tracker.phase, 'buffering');
  assert.equal(
    spotlightPlaybackPausesDisplayClock(firstFrozenSample.tracker),
    true
  );
  const retry = runStallUntilAction(
    firstFrozenSample.tracker,
    500,
    'retry'
  );
  assert.equal(retry.tracker.phase, 'stalled');
}

{
  let tracker = progressingTracker('recovery-success', 2);
  const retry = runStallUntilAction(tracker, 500, 'retry');
  tracker = beginSpotlightPlaybackRetry(
    retry.tracker,
    tracker.occurrenceId
  );
  const recoveryElapsedBeforeProgress = tracker.recoveryElapsedMs;
  const recovered = advance(
    tracker,
    retry.nowMs + 250,
    tracker.lastMediaTimeSeconds + 0.25
  );
  assert.equal(recovered.action, 'none');
  assert.equal(recovered.tracker.phase, 'progressing');
  assert.equal(recovered.tracker.retryCount, 1);
  assert.equal(
    recovered.tracker.recoveryElapsedMs,
    recoveryElapsedBeforeProgress
  );
}

{
  let tracker = markSpotlightPlaybackBuffering(
    progressingTracker('recovery-failure', 1),
    'recovery-failure'
  );
  const retry = runStallUntilAction(tracker, 250, 'retry');
  tracker = beginSpotlightPlaybackRetry(
    retry.tracker,
    tracker.occurrenceId
  );
  const failed = runStallUntilAction(tracker, retry.nowMs, 'fail');
  assert.equal(failed.tracker.retryCount, 1);
  tracker = markSpotlightPlaybackTerminal(
    failed.tracker,
    'unavailable',
    failed.nowMs,
    failed.tracker.occurrenceId
  );
  assert.equal(tracker.phase, 'unavailable');
  assert.equal(spotlightPlaybackCanQualify(tracker), false);
  const lateProgress = advance(
    tracker,
    failed.nowMs + 250,
    tracker.lastMediaTimeSeconds + 0.25
  );
  assert.strictEqual(lateProgress.tracker, tracker);
  assert.equal(lateProgress.action, 'none');
}

{
  let tracker = progressingTracker('qualified-once', 4);
  const qualifiedProgressMs = tracker.progressMs;
  const retry = runStallUntilAction(
    markSpotlightPlaybackBuffering(
      tracker,
      tracker.occurrenceId
    ),
    1000,
    'retry'
  );
  tracker = beginSpotlightPlaybackRetry(
    retry.tracker,
    tracker.occurrenceId
  );
  tracker = advance(
    tracker,
    retry.nowMs + 250,
    tracker.lastMediaTimeSeconds + 0.25
  ).tracker;
  assert.equal(tracker.occurrenceId, 'qualified-once');
  assert.ok(tracker.progressMs > qualifiedProgressMs);
  assert.equal(spotlightPlaybackCanQualify(tracker), true);
}

for (const pauseReason of [
  'manual',
  'background',
  'reduced-motion',
  'gesture-blocked',
]) {
  const tracker = progressingTracker(`paused-${pauseReason}`, 1);
  const paused = advance(tracker, 20000, tracker.lastMediaTimeSeconds, {
    expectedToProgress: false,
    pauseReason,
  });
  assert.equal(paused.action, 'none');
  assert.equal(paused.tracker.phase, 'paused');
  assert.equal(paused.tracker.recoveryElapsedMs, 0);
  assert.equal(paused.tracker.stalledForMs, 0);
  assert.equal(spotlightPlaybackPausesDisplayClock(paused.tracker), false);
  const resumed = advance(
    paused.tracker,
    20250,
    paused.tracker.lastMediaTimeSeconds + 0.25
  );
  assert.equal(resumed.tracker.phase, 'progressing');
  assert.equal(resumed.tracker.recoveryElapsedMs, 0);
}

{
  let tracker = markSpotlightPlaybackReady(
    createSpotlightPlaybackTracker(0, 'normal-loop'),
    0,
    'normal-loop'
  );
  tracker = advance(tracker, 250, 9.9, { presentationDurationMs: 0 }).tracker;
  tracker = advance(tracker, 500, 0.15, { presentationDurationMs: 0 }).tracker;
  assert.ok(tracker.progressMs >= 10100);
  assert.equal(tracker.phase, 'progressing');
}

const metadataStart = mediaFrameSource.indexOf('onLoadedMetadata=');
const playEventStart = mediaFrameSource.indexOf('onPlay=', metadataStart);
assert.ok(metadataStart >= 0 && playEventStart > metadataStart);
assert.doesNotMatch(
  mediaFrameSource.slice(metadataStart, playEventStart),
  /\.play\(/
);
assert.equal((mediaFrameSource.match(/\.play\(\)/g) || []).length, 1);
assert.match(
  mediaFrameSource,
  /occurrenceId\?: string[\s\S]*?useLayoutEffect\([\s\S]*?createSpotlightPlaybackTracker\([\s\S]*?playbackOccurrenceId/
);
assert.match(
  mediaFrameSource,
  /activeOccurrenceGenerationRef\.current !== generation[\s\S]*?playRequestRef\.current\?\.requestId !== requestId/
);
assert.match(
  mediaFrameSource,
  /onWaiting=[\s\S]*?occurrenceGeneration\.occurrenceId[\s\S]*?onStalled=[\s\S]*?occurrenceGeneration\.occurrenceId/
);
assert.match(
  mediaFrameSource,
  /manualPausedRef\.current[\s\S]*?document\.hidden[\s\S]*?requestVideoPlayback\(video, generation, 'recovery'\)/
);
assert.match(
  publicShopSource,
  /occurrenceId=\{spotlightRotationActiveKey\}[\s\S]*?reportSpotlightPlaybackStatus\([\s\S]*?spotlightRotationActiveKey/
);
assert.match(
  publicShopSource,
  /spotlightPlaybackStatusByKeyRef\.current\[spotlightRotationActiveKey\][\s\S]*?!playbackStatus \|\| spotlightPlaybackPausesDisplayClock/
);
assert.match(
  publicShopSource,
  /spotlightQualifiedKeysRef\.current\.has\(presentationKey\)[\s\S]*?spotlightQualificationInFlightKeysRef\.current\.has\(presentationKey\)/
);
assert.match(
  publicShopSource,
  /spotlightSeenCampaignIdsRef\.current\.add[\s\S]*?requestNextCanonicalSpotlight/
);
assert.match(
  publicShopSource,
  /monitorPlayback=\{Boolean\(miniSpotlightView\.videoUrl\)\}[\s\S]*?spotlightPreloadItem[\s\S]*?autoPlayVideo=\{false\}/
);
assert.match(
  publicShopSource,
  /SPOTLIGHT_AUTHORIZED_FRAME_HOLD_MS[\s\S]*?phase: 'holding'[\s\S]*?phase: 'neutral'[\s\S]*?phase: 'handoff'/
);
assert.match(
  publicShopSource,
  /spotlightPreloadIsHandoff \? 1 : 0[\s\S]*?data-spotlight-transition-bridge="neutral"/
);
assert.match(
  publicShopSource,
  /spotlightActiveMediaStatusByOccurrence\[spotlightRotationActiveKey\][\s\S]*?spotlightPlaybackCanQualify\(playbackStatus\)[\s\S]*?acknowledgeSpotlightPresentationSupply/
);
assert.match(
  mediaFrameSource,
  /image\.decode\(\)[\s\S]*?afterNextMediaPaint[\s\S]*?reportVideoReadyAfterPaint/
);
const advanceStart = publicShopSource.indexOf(
  'const advancePastActiveOccurrence = () => {'
);
const activeRowsStart = publicShopSource.indexOf(
  'const activeRowsAtStart =',
  advanceStart
);
assert.ok(advanceStart >= 0 && activeRowsStart > advanceStart);
assert.doesNotMatch(
  publicShopSource.slice(advanceStart, activeRowsStart),
  /setCommunitySpotlights\(\[\]\)/
);

assert.match(
  publicShopSource,
  /spotlightActiveMediaStatusByOccurrence\[spotlightRotationActiveKey\][\s\S]*?spotlightTransition \|\|[\s\S]*?acknowledgeSpotlightPresentationSupply/
);

console.log('Spotlight playback reliability policy tests passed.');
