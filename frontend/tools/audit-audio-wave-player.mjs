/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  shared: "src/components/AudioWavePlayer.tsx",
  community: "src/components/CommunityNoticeVoicePlayer.tsx",
  demand: "src/components/ProtectedVoiceNotePlayer.tsx",
  shop: "src/components/ShopVoiceNotePlayer.tsx",
  recorder: "src/components/VoiceNoteRecorder.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [
    key,
    readFileSync(join(frontendRoot, file), "utf8"),
  ])
);
const failures = [];

function requirePattern(key, pattern, message) {
  if (!pattern.test(source[key])) failures.push(`${files[key]}: ${message}`);
}

function forbidPattern(key, pattern, message) {
  if (pattern.test(source[key])) failures.push(`${files[key]}: ${message}`);
}

requirePattern("shared", /data-gsn-audio-wave-player="true"/, "shared playback must expose the waveform contract");
requirePattern("shared", /data-gsn-audio-wave-graph="true"/, "shared playback must expose a visibly testable waveform graph");
requirePattern("shared", /const WAVE_HEIGHTS = \[/, "shared playback must keep its compact waveform presentation");
requirePattern("shared", /mode\?: "inline" \| "symbol" \| "hero"[\s\S]*?const hero = mode === "hero"[\s\S]*?height: hero \? 44/, "shared playback must retain the large hero waveform presentation");
requirePattern("shared", /<audio[\s\S]*?preload="metadata"/, "shared playback must keep the real hidden audio element");
forbidPattern("shared", /<audio[^>]*\bcontrols\b/, "shared playback must not expose browser-native controls");

for (const key of ["community", "demand", "shop", "recorder"]) {
  requirePattern(key, /import AudioWavePlayer(?:, \{ AudioWaveSignal \})? from "\.\/AudioWavePlayer";/, "voice playback must use the shared waveform component");
  requirePattern(key, /<AudioWavePlayer/, "voice playback must render the shared waveform component");
  forbidPattern(key, /<audio[^>]*\bcontrols\b/, "voice playback must not regress to browser-native controls");
}

requirePattern("shop", /<AudioWaveSignal mode="inline" playing=\{playing\}/, "the owner strip must show the shared waveform signal");
requirePattern("shop", /<AudioWaveSignal mode="symbol" playing=\{playing\}/, "the visitor coming-soon control must show the shared waveform signal");
forbidPattern("shop", /setCompleted\(|keepVisibleAfterPlayback/, "compact Shop waveform controls must remain available after playback");
requirePattern("community", /compactPresentation\?: boolean[\s\S]*?data-gsn-community-notice-voice-presentation=\{compactPresentation \? "compact" : "full"\}[\s\S]*?<AudioWavePlayer/, "Community Home voice must support the compact shared waveform presentation without another large audio card");
requirePattern("community", /data-gsn-community-notice-voice-deleted="true"[\s\S]*?compact-removed[\s\S]*?width: "min\(100%, 220px\)"[\s\S]*?<AudioWaveSignal mode="hero" \/>[\s\S]*?Recording removed/, "a deleted Community Home recording must make the clearly disabled hero waveform its central visual instead of returning a blank audio panel");
requirePattern("demand", /data-gsn-demand-voice-deleted="true"[\s\S]*?hero-removed[\s\S]*?width: "min\(100%, 220px\)"[\s\S]*?<AudioWaveSignal mode="hero" \/>[\s\S]*?Recording removed/, "a deleted Demand Box recording must make the clearly disabled hero waveform its central visual instead of returning a text-only tombstone");
requirePattern("demand", /data-gsn-protected-voice-player="true"[\s\S]*?data-gsn-demand-voice-presentation="hero-live"[\s\S]*?<AudioWavePlayer/, "a live Demand Box recording must retain the dominant shared waveform player");

for (const key of ["community", "demand", "shop"]) {
  requirePattern(key, /debugId=\{debugId \+ "\.delete\.open"\}[\s\S]*?>\s*Delete\s*</, "sender deletion must remain a small labelled action");
  requirePattern(key, /stableHeight=\{30\}/, "sender deletion must remain visually subordinate at 30px");
  requirePattern(key, /Delete permanently/, "permanent deletion must retain a second explicit confirmation");
  forbidPattern(key, />\s*Delete voice note\s*</, "the oversized legacy delete action must not return");
}

requirePattern("recorder", /stableHeight=\{34\}[\s\S]*?debugId=\{`\$\{debugPrefix\}\.remove`\}/, "recording removal must remain compact");

if (failures.length) {
  console.error("Audio waveform UI audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Audio waveform UI audit passed.");
