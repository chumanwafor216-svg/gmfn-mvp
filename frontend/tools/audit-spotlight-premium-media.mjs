/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function requirePattern(file, pattern, message) {
  if (!pattern.test(read(file))) findings.push(`${file}: ${message}`);
}

const frameFile = "frontend/src/components/SpotlightMediaFrame.tsx";
const galleryFile = "frontend/src/pages/ShopGalleryPage.tsx";

requirePattern(frameFile, /imageLoading\?: 'eager' \| 'lazy'[\s\S]*?imageFetchPriority\?: 'high' \| 'low' \| 'auto'[\s\S]*?imageSizes\?: string/, "shared media must expose bounded responsive image loading controls");
requirePattern(frameFile, /loading=\{props\.imageLoading \|\| 'lazy'\}[\s\S]*?decoding="async"[\s\S]*?fetchPriority=\{props\.imageFetchPriority \|\| 'auto'\}[\s\S]*?sizes=\{props\.imageSizes\}/, "images must use async decode, responsive sizes and explicit fetch priority");
requirePattern(frameFile, /preserveNaturalColor\?: boolean[\s\S]*?filter: props\.preserveNaturalColor[\s\S]*?\? "none"[\s\S]*?: "saturate\(1\.04\) contrast\(1\.03\)"/, "natural-colour rendering must be explicit rather than altering every shared media surface");
requirePattern(frameFile, /filter: props\.preserveNaturalColor[\s\S]*?\? "blur\(24px\) brightness\(0\.78\)"[\s\S]*?: "blur\(24px\) saturate\(1\.12\) brightness\(0\.9\)"/, "natural-colour Spotlight media must use only a restrained dark backdrop treatment");
requirePattern(galleryFile, /preserveNaturalColor=\{true\}/, "expanded Public Shop Spotlight must opt into natural-colour rendering");
requirePattern(galleryFile, /imageLoading="eager"[\s\S]*?imageFetchPriority="high"[\s\S]*?imageSizes="\(max-width: 720px\) 100vw, 720px"/, "active Spotlight image must receive high-priority mobile sizing");
requirePattern(galleryFile, /imageFetchPriority="low"[\s\S]*?preloadVideo='auto'/, "the next governed medium must preload without competing at high priority");
requirePattern(galleryFile, /radial-gradient\(circle at 50% 16%, rgba\(36,78,112,0\.92\)[\s\S]*?#04101C 100%\)/, "expanded Spotlight must retain one continuous premium dark presentation");
requirePattern(galleryFile, /data-spotlight-screen="true"[\s\S]*?objectFit: "contain"[\s\S]*?objectFit: 'contain'/, "active and preloaded Spotlight media must preserve source proportions");
requirePattern(galleryFile, /loopVideo=\{[\s\S]*?preloadVideo='auto'/, "existing smooth bounded video loop and preload behavior must remain");

if (findings.length > 0) {
  console.error("Spotlight premium-media audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Spotlight premium-media audit passed.");