import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 5204, strictPort: true },
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });

async function runPreparationCase(page, mode) {
  return page.evaluate(async (selectedMode) => {
    const module = await import("/src/lib/spotlightMediaPrep.ts");
    const originalCreateElement = document.createElement.bind(document);
    const originalCreateObjectUrl = URL.createObjectURL.bind(URL);
    const originalRevokeObjectUrl = URL.revokeObjectURL.bind(URL);

    document.createElement = ((tagName, options) => {
      if (String(tagName).toLowerCase() !== "video") {
        return originalCreateElement(tagName, options);
      }
      const video = {
        preload: "",
        muted: true,
        playsInline: true,
        videoWidth: selectedMode === "low-resolution" ? 320 : selectedMode === "known-good" ? 576 : 0,
        videoHeight: selectedMode === "low-resolution" ? 640 : selectedMode === "known-good" ? 1296 : 0,
        duration: selectedMode === "known-good" ? 7 : selectedMode === "low-resolution" ? 5 : 0,
        onloadedmetadata: null,
        onerror: null,
        set src(_value) {
          queueMicrotask(() => {
            if (selectedMode === "metadata-error") this.onerror?.(new Event("error"));
            else this.onloadedmetadata?.(new Event("loadedmetadata"));
          });
        },
      };
      return video;
    });
    URL.createObjectURL = () => "blob:spotlight-video-preparation-test";
    URL.revokeObjectURL = () => {};

    try {
      const file = new File([new Uint8Array(2048)], `${selectedMode}.mp4`, {
        type: "video/mp4",
        lastModified: 1,
      });
      const prepared = await module.prepareSpotlightVideoFile(file, {
        maxBytes: 15 * 1024 * 1024,
        maxSourceBytes: 100 * 1024 * 1024,
        maxDurationSeconds: 12,
        minShortEdge: 576,
      });
      return {
        ok: true,
        sameFile: prepared.file === file,
        durationSeconds: prepared.durationSeconds ?? null,
        requiresServerPreparation: prepared.requiresServerPreparation === true,
        message: prepared.message || "",
      };
    } catch (error) {
      return { ok: false, message: String(error?.message || error) };
    } finally {
      document.createElement = originalCreateElement;
      URL.createObjectURL = originalCreateObjectUrl;
      URL.revokeObjectURL = originalRevokeObjectUrl;
    }
  }, mode);
}

try {
  const page = await browser.newPage();
  await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const knownGood = await runPreparationCase(page, "known-good");
  const delayedMetadata = await runPreparationCase(page, "delayed-metadata");
  const metadataError = await runPreparationCase(page, "metadata-error");
  const lowResolution = await runPreparationCase(page, "low-resolution");

  if (!knownGood.ok || !knownGood.sameFile || knownGood.requiresServerPreparation || knownGood.durationSeconds !== 7) {
    throw new Error(`Known-good video did not remain locally ready: ${JSON.stringify(knownGood)}`);
  }
  for (const result of [delayedMetadata, metadataError]) {
    if (!result.ok || !result.sameFile || !result.requiresServerPreparation || !/server|upload|publication/i.test(result.message)) {
      throw new Error(`Recoverable browser metadata was rejected instead of deferred: ${JSON.stringify(result)}`);
    }
  }
  if (lowResolution.ok || !/320x640|too small/i.test(lowResolution.message)) {
    throw new Error(`Proven unusable video did not retain the quality rejection: ${JSON.stringify(lowResolution)}`);
  }

  console.log(JSON.stringify({
    ok: true,
    environment: "local Vite + Chromium browser metadata simulation",
    knownGood,
    delayedMetadata,
    metadataError,
    lowResolution,
  }));
} finally {
  await browser.close();
  await server.close();
}
