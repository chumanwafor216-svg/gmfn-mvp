import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(toolDir, "..");
const layoutSource = fs.readFileSync(
  path.join(frontendRoot, "src", "layout", "AppLayout.tsx"),
  "utf8"
);
const responsiveSource = fs.readFileSync(
  path.join(frontendRoot, "src", "lib", "responsiveLayout.ts"),
  "utf8"
);

const failures = [];

function requirePattern(label, source, pattern) {
  if (!pattern.test(source)) failures.push(label);
}

requirePattern(
  "The compact app shell must cover medium-width foldable viewports through 980px.",
  responsiveSource,
  /APP_SHELL_COMPACT_MAX_WIDTH\s*=\s*980/
);
requirePattern(
  "The app shell must derive its initial mode from the shared viewport helper.",
  layoutSource,
  /useState<boolean>\(\(\) => \{[\s\S]*?return isCompactAppViewport\(\)/
);
requirePattern(
  "The app shell must resynchronise when a fold or orientation changes the visual viewport.",
  layoutSource,
  /addEventListener\("orientationchange", handleResize\)[\s\S]*?visualViewport\?\.addEventListener\("resize", handleResize\)/
);
requirePattern(
  "The rendered shell mode must remain observable for foldable regression checks.",
  layoutSource,
  /data-gmfn-shell-mode=\{isMobile \? "compact" : "desktop"\}/
);

if (failures.length) {
  console.error("Foldable app-shell continuity audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("Foldable app-shell continuity audit passed.");