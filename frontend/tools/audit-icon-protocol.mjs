/* global console, process */

import { Buffer } from "node:buffer";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";

const toolDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(toolDir, "..", "..");

const findings = [];

const requiredBasePackAssets = [
  {
    key: "trust-shield",
    fileName: "icon-trust-shield-3d.webp",
    importName: "trustShieldIconUrl",
  },
  {
    key: "community-building",
    fileName: "icon-community-building-3d.webp",
    importName: "communityBuildingIconUrl",
  },
  {
    key: "shop-storefront",
    fileName: "icon-shop-storefront-3d.webp",
    importName: "shopStorefrontIconUrl",
  },
  {
    key: "market-stall",
    fileName: "icon-market-stall-3d.webp",
    importName: "marketStallIconUrl",
  },
  {
    key: "vault-safe",
    fileName: "icon-vault-safe-3d.webp",
    importName: "vaultSafeIconUrl",
  },
  {
    key: "finance-bank-building",
    fileName: "icon-finance-bank-building-3d.webp",
    importName: "financeBankBuildingIconUrl",
  },
  {
    key: "finance-wallet-card",
    fileName: "icon-finance-wallet-card-3d.webp",
    importName: "financeWalletCardIconUrl",
  },
  {
    key: "repayment-schedule",
    fileName: "icon-repayment-schedule-3d.webp",
    importName: "repaymentScheduleIconUrl",
  },
  {
    key: "records-folder",
    fileName: "icon-records-folder-3d.webp",
    importName: "recordsFolderIconUrl",
  },
  {
    key: "certificate-seal",
    fileName: "icon-certificate-seal-3d.webp",
    importName: "certificateSealIconUrl",
  },
  {
    key: "join-person-plus",
    fileName: "icon-join-person-plus-3d.webp",
    importName: "joinPersonPlusIconUrl",
  },
  {
    key: "spotlight-megaphone",
    fileName: "icon-spotlight-megaphone-3d.webp",
    importName: "spotlightMegaphoneIconUrl",
  },
  {
    key: "audio-speaker",
    fileName: "icon-audio-speaker-3d.webp",
    importName: "audioSpeakerIconUrl",
  },
  {
    key: "media-video",
    fileName: "icon-media-video-3d.webp",
    importName: "mediaVideoIconUrl",
  },
  {
    key: "identity-card",
    fileName: "icon-identity-card-3d.webp",
    importName: "identityCardIconUrl",
  },
  {
    key: "phone-contact",
    fileName: "icon-phone-contact-3d.webp",
    importName: "phoneContactIconUrl",
  },
  {
    key: "qr-record",
    fileName: "icon-qr-record-3d.webp",
    importName: "qrRecordIconUrl",
  },
  {
    key: "public-globe",
    fileName: "icon-public-globe-3d.webp",
    importName: "publicGlobeIconUrl",
  },
];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);
  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertFileExists(file, message) {
  if (!existsSync(join(repoRoot, file))) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected file was not found.",
    });
  }
}

function assertBuiltArtifactContains(file, pattern, message) {
  const fullPath = join(repoRoot, file);
  if (!existsSync(fullPath)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected built artifact was not found. Run npm run build before checking dist output.",
    });
    return;
  }

  const text = readFileSync(fullPath, "utf8");
  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected pattern was not found in the built artifact.",
    });
  }
}

function assertPngDimensions(file, expectedWidth, expectedHeight, message) {
  const fullPath = join(repoRoot, file);
  if (!existsSync(fullPath)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected PNG file was not found.",
    });
    return;
  }

  const buffer = readFileSync(fullPath);
  const signature = buffer.subarray(0, 8).toString("hex");
  const width = buffer.length >= 24 ? buffer.readUInt32BE(16) : 0;
  const height = buffer.length >= 24 ? buffer.readUInt32BE(20) : 0;
  if (
    signature !== "89504e470d0a1a0a" ||
    width !== expectedWidth ||
    height !== expectedHeight
  ) {
    findings.push({
      file,
      line: 1,
      message,
      text: `Expected ${expectedWidth}x${expectedHeight} PNG, found ${width}x${height}.`,
    });
  }
}

function paethPredictor(left, above, upperLeft) {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);

  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) {
    return left;
  }
  if (aboveDistance <= upperLeftDistance) {
    return above;
  }
  return upperLeft;
}

function decodePngRgba(file) {
  const fullPath = join(repoRoot, file);
  const buffer = readFileSync(fullPath);
  const signature = buffer.subarray(0, 8).toString("hex");
  if (signature !== "89504e470d0a1a0a") {
    throw new Error("Not a PNG file.");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString("ascii");
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (bitDepth !== 8 || interlace !== 0 || (colorType !== 6 && colorType !== 2)) {
    throw new Error(
      `Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}, interlace=${interlace}.`
    );
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const scanlineLength = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatChunks));
  const pixels = Buffer.alloc(width * height * 4);
  let readOffset = 0;
  let previous = Buffer.alloc(scanlineLength);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[readOffset];
    readOffset += 1;
    const raw = inflated.subarray(readOffset, readOffset + scanlineLength);
    readOffset += scanlineLength;
    const current = Buffer.alloc(scanlineLength);

    for (let x = 0; x < scanlineLength; x += 1) {
      const left = x >= bytesPerPixel ? current[x - bytesPerPixel] : 0;
      const above = previous[x] || 0;
      const upperLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0;
      const value = raw[x];

      if (filter === 0) {
        current[x] = value;
      } else if (filter === 1) {
        current[x] = (value + left) & 255;
      } else if (filter === 2) {
        current[x] = (value + above) & 255;
      } else if (filter === 3) {
        current[x] = (value + Math.floor((left + above) / 2)) & 255;
      } else if (filter === 4) {
        current[x] = (value + paethPredictor(left, above, upperLeft)) & 255;
      } else {
        throw new Error(`Unsupported PNG filter: ${filter}.`);
      }
    }

    for (let x = 0; x < width; x += 1) {
      const source = x * bytesPerPixel;
      const target = (y * width + x) * 4;
      pixels[target] = current[source];
      pixels[target + 1] = current[source + 1];
      pixels[target + 2] = current[source + 2];
      pixels[target + 3] = colorType === 6 ? current[source + 3] : 255;
    }

    previous = current;
  }

  return { width, height, pixels };
}

function assertPngQuietEdge(file, message) {
  let decoded;
  try {
    decoded = decodePngRgba(file);
  } catch (error) {
    findings.push({
      file,
      line: 1,
      message,
      text: error instanceof Error ? error.message : "Could not decode PNG.",
    });
    return;
  }

  const samples = [
    [0, 0],
    [Math.floor(decoded.width * 0.03), Math.floor(decoded.height * 0.03)],
    [Math.floor(decoded.width * 0.08), Math.floor(decoded.height * 0.08)],
    [decoded.width - 1, decoded.height - 1],
    [
      decoded.width - 1 - Math.floor(decoded.width * 0.08),
      decoded.height - 1 - Math.floor(decoded.height * 0.08),
    ],
  ];

  for (const [x, y] of samples) {
    const index = (y * decoded.width + x) * 4;
    const red = decoded.pixels[index];
    const green = decoded.pixels[index + 1];
    const blue = decoded.pixels[index + 2];
    const quietNavy =
      Math.abs(red - 6) <= 3 && Math.abs(green - 24) <= 3 && Math.abs(blue - 39) <= 3;

    if (!quietNavy) {
      findings.push({
        file,
        line: 1,
        message,
        text: `Expected quiet navy edge at (${x}, ${y}), found rgb(${red}, ${green}, ${blue}).`,
      });
      return;
    }
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /## GSN Icon Protocol[\s\S]*?premium skeuomorphic \/ realistic 3D[\s\S]*?Use premium realistic 3D icons, not flat or outline icons\./,
  "Design system must define the GSN premium realistic 3D icon protocol."
);

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /Every main icon must look like a real object, place, or tool\.[\s\S]*?Icons inside the UI must be realistic 3D object icons, not literal photos and\s+not flat symbols\./,
  "Design system must preserve the real-object and non-photo icon rules."
);

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /Avoid:[\s\S]*?flat icons[\s\S]*?outline icons[\s\S]*?line icons[\s\S]*?cartoon icons[\s\S]*?faded glyph icons[\s\S]*?emoji as primary UI icons/,
  "Design system must keep the forbidden primary icon list."
);

assertContains(
  "docs/DESIGN_SYSTEM.md",
  /spotlight = real loudspeaker or megaphone for announcement\/publicity[\s\S]*?sound controls = real speaker\/loudspeaker for audio on\/off[\s\S]*?video\/media = video camera or playable media object, not a megaphone[\s\S]*?community home = premium house, hall, or civic building[\s\S]*?shop \/ marketplace = shopfront, market stall, or real trading place[\s\S]*?vault = safe box[\s\S]*?finance = bank building, cash drawer, or institutional money house[\s\S]*?wallet\/card = personal payout, payment-detail, or card context[\s\S]*?repayment = calendar or payment plan with money\/check evidence[\s\S]*?trust = shield badge or seal[\s\S]*?evidence\/certificate = sealed paper, certificate packet, or evidence package[\s\S]*?records = document folder[\s\S]*?join = person-plus/,
  "Design system must keep the object-meaning map for GSN icons."
);

assertContains(
  "docs/UX_ACCEPTANCE_CHECKLIST.md",
  /Meaningful icons follow the GSN Icon Protocol: premium realistic 3D object\s+icons, not flat, outline, faded, cartoon, or emoji-style primary icons\./,
  "UX acceptance checklist must require the GSN Icon Protocol."
);

assertContains(
  "docs/SCREEN_SPECS.md",
  /iPhone home-screen installs must use a dedicated `180x180` Apple touch icon[\s\S]*?quiet navy safe zone[\s\S]*?Do not point `apple-touch-icon` at a cropped or edge-to-edge manifest icon\.[\s\S]*?old cropped or\s+blank icon[\s\S]*?iOS caches icons[\s\S]*?remove the old shortcut and add GSN again\.[\s\S]*?fresh Apple touch icon filename/,
  "Screen specs must preserve the iPhone home-screen icon safe-zone and cache-recovery rules."
);

assertContains(
  "docs/SCREEN_SPECS.md",
  /Android and other phone home-screen shortcuts should use the same navy tile,[\s\S]*?outer gold ring, and shield\/star composition as the Apple touch icon[\s\S]*?Do not\s+give Android a separate manifest SVG or maskable icon/,
  "Screen specs must keep Android and iPhone shortcut icon composition aligned."
);

assertContains(
  "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  /Status: Local batch, not published[\s\S]*?navy tile, outer gold ring, and shield\/star emblem[\s\S]*?does not prove Render deployment, live-site availability,\s+launcher cache refresh, or that existing installed shortcuts have repainted/,
  "PWA icon batch manifest must record local-only status, preferred Apple-style composition, and live/cache limits."
);

assertContains(
  "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  /In-Scope Icon Batch Files[\s\S]*?docs\/SCREEN_SPECS\.md[\s\S]*?frontend\/index\.html[\s\S]*?frontend\/public\/manifest\.json[\s\S]*?frontend\/public\/manifest\.webmanifest[\s\S]*?frontend\/public\/sw\.js[\s\S]*?frontend\/src\/components\/GsnInstallPrompt\.tsx[\s\S]*?frontend\/public\/gsn-app-icon-ios-180-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-192-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-512-v14\.png[\s\S]*?frontend\/tools\/audit-icon-protocol\.mjs/,
  "PWA icon batch manifest must list the local icon batch docs, metadata, assets, prompt, service worker, and audit tool."
);

assertContains(
  "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  /frontend\/tools\/pwa-icon-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/verify-pwa-icon-publish-readiness-local\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-publish-readiness-nonmutating\.mjs[\s\S]*?frontend\/package\.json/,
  "PWA icon batch manifest must list the scope, print, status-scope, and package-script files."
);

assertContains(
  "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  /apple-touch-icon` must point to `\/gsn-app-icon-ios-180-v14\.png`[\s\S]*?Manifest install icons must use `purpose: "any"`[\s\S]*?must not offer `maskable` or `\/gsn-app-icon\.svg`[\s\S]*?service worker cache must use `gsn-pwa-shell-v14`[\s\S]*?install prompt preview must use `\/gsn-app-icon-ios-180-v14\.png`/,
  "PWA icon batch manifest must cage the v14 metadata, no-maskable/SVG, service-worker, and prompt-preview contracts."
);

assertContains(
  "docs/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST.md",
  /Do not claim the live site is serving v14 icons until[\s\S]*?Render deployment or live app behavior is verified[\s\S]*?Do not claim existing\s+phone shortcuts have changed automatically[\s\S]*?iOS and Android launchers can cache\s+old shortcut artwork/,
  "PWA icon batch manifest must block live-serving and existing-shortcut repaint overclaims."
);

assertContains(
  "frontend/package.json",
  /"verify:pwa-icon-publish-readiness-local": "node tools\/verify-pwa-icon-publish-readiness-local\.mjs"[\s\S]*?"print:pwa-icon-local-batch-stage-plan": "node tools\/print-pwa-icon-local-batch-stage-plan\.mjs"[\s\S]*?"audit:pwa-icon-local-batch-status-scope": "node tools\/audit-pwa-icon-local-batch-status-scope\.mjs"[\s\S]*?"audit:pwa-icon-local-batch-stage-plan": "node tools\/audit-pwa-icon-local-batch-stage-plan\.mjs"[\s\S]*?"audit:pwa-icon-publish-readiness-nonmutating": "node tools\/audit-pwa-icon-publish-readiness-nonmutating\.mjs"/,
  "PWA icon batch verifier, print, stage-plan, status-scope, and non-mutating audit commands must stay registered."
);

assertContains(
  "frontend/tools/pwa-icon-local-batch-scope.mjs",
  /inScopePwaIconBatchFiles[\s\S]*?docs\/GSN_PWA_ICON_LOCAL_BATCH_MANIFEST\.md[\s\S]*?docs\/SCREEN_SPECS\.md[\s\S]*?frontend\/index\.html[\s\S]*?frontend\/public\/manifest\.json[\s\S]*?frontend\/public\/manifest\.webmanifest[\s\S]*?frontend\/public\/sw\.js[\s\S]*?frontend\/src\/components\/GsnInstallPrompt\.tsx[\s\S]*?frontend\/public\/gsn-app-icon-ios-180-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-192-v14\.png[\s\S]*?frontend\/public\/gsn-app-icon-512-v14\.png[\s\S]*?frontend\/tools\/audit-icon-protocol\.mjs[\s\S]*?frontend\/tools\/pwa-icon-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/verify-pwa-icon-publish-readiness-local\.mjs[\s\S]*?frontend\/tools\/audit-pwa-icon-publish-readiness-nonmutating\.mjs[\s\S]*?frontend\/package\.json/,
  "PWA icon scope module must define the in-scope icon batch files."
);

assertContains(
  "frontend/tools/pwa-icon-local-batch-scope.mjs",
  /outOfScopePwaIconBatchPrefixes[\s\S]*?docs\/external_review\/[\s\S]*?frontend\/screenshots\/[\s\S]*?screenshots\/[\s\S]*?docs\/GSN_EVIDENCE_LIVE_VERIFICATION_GAP_LOG\.md[\s\S]*?docs\/GSN_EVIDENCE_BOUNDARY_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/audit-evidence-live-verification-gap-log\.mjs[\s\S]*?frontend\/tools\/print-evidence-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/evidence-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/audit-evidence-boundary-local-batch-manifest\.mjs[\s\S]*?frontend\/tools\/combined-local-batch-scope\.mjs[\s\S]*?frontend\/tools\/print-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-status-scope\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-stage-plan\.mjs[\s\S]*?frontend\/tools\/verify-combined-local-batch-readiness\.mjs[\s\S]*?frontend\/tools\/audit-combined-local-batch-readiness-nonmutating\.mjs[\s\S]*?docs\/GSN_COMBINED_LOCAL_BATCH_MANIFEST\.md[\s\S]*?frontend\/tools\/audit-combined-local-batch-manifest\.mjs/,
  "PWA icon scope module must explicitly exclude the current evidence-boundary batch paths and combined publish-planning guard paths."
);

assertContains(
  "frontend/tools/print-pwa-icon-local-batch-stage-plan.mjs",
  /from "\.\/pwa-icon-local-batch-scope\.mjs"[\s\S]*?read-only scope preview[\s\S]*?No staging, commit, push, GitHub Actions, or Render deploy is performed[\s\S]*?inScopePwaIconBatchFiles\.map[\s\S]*?outOfScopePwaIconBatchPrefixes\.map[\s\S]*?audit:pwa-icon-local-batch-stage-plan[\s\S]*?audit:pwa-icon-publish-readiness-nonmutating[\s\S]*?verify:pwa-icon-publish-readiness-local[\s\S]*?Unabated truth:[\s\S]*?does not prove Render deploy acceptance, deployment completion, live-site availability, Android WebAPK behavior, or iOS\/Android launcher cache refresh/,
  "PWA icon stage plan must print shared scope and block publish/live/cache overclaims."
);

assertNotContains(
  "frontend/tools/print-pwa-icon-local-batch-stage-plan.mjs",
  /from "node:child_process"|spawnSync|spawn\(|execSync|execFileSync|writeFileSync|appendFileSync|rmSync|unlinkSync|renameSync|copyFileSync|mkdirSync/,
  "PWA icon stage plan must not spawn commands or mutate files."
);

assertContains(
  "frontend/tools/audit-pwa-icon-local-batch-status-scope.mjs",
  /from "\.\/pwa-icon-local-batch-scope\.mjs"[\s\S]*?new Set\(inScopePwaIconBatchFiles\)[\s\S]*?git",\s*\["status", "--short", "--untracked-files=normal"\][\s\S]*?outOfScopePwaIconBatchPrefixes\.some[\s\S]*?No staging, commit, push, or deployment action was performed/,
  "PWA icon status-scope audit must consume shared scope, read git status, and remain non-publishing."
);

assertContains(
  "frontend/tools/verify-pwa-icon-publish-readiness-local.mjs",
  /npmCommand = process\.platform === "win32" \? "npm\.cmd" : "npm"[\s\S]*?audit-icon-protocol\.mjs[\s\S]*?audit-pwa-icon-publish-readiness-nonmutating\.mjs[\s\S]*?audit-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?print-pwa-icon-local-batch-stage-plan\.mjs[\s\S]*?audit-pwa-icon-local-batch-status-scope\.mjs[\s\S]*?command: npmCommand[\s\S]*?args: \["run", "build"\][\s\S]*?shell: process\.platform === "win32"[\s\S]*?command: "git"[\s\S]*?args: \["diff", "--check"\][\s\S]*?shell: step\.shell \|\| false/,
  "PWA icon publish-readiness verifier must run icon audit, stage plan, status scope, build, and whitespace check."
);

assertContains(
  "frontend/tools/audit-pwa-icon-publish-readiness-nonmutating.mjs",
  /verify-pwa-icon-publish-readiness-local\.mjs[\s\S]*?audit-icon-protocol[\s\S]*?print-pwa-icon-local-batch-stage-plan[\s\S]*?audit-pwa-icon-local-batch-status-scope[\s\S]*?git diff --check[\s\S]*?must not call gh, curl, npm deploy\/publish, Render hooks, or Render secret variables/,
  "PWA icon non-mutating audit must cage the verifier command list and publishing exclusions."
);

assertContains(
  "frontend/tools/verify-pwa-icon-publish-readiness-local.mjs",
  /This does not stage, commit, push, trigger GitHub Actions, deploy, prove Render state, prove live-site availability, or refresh existing phone shortcut caches/,
  "PWA icon publish-readiness verifier must print its non-publishing/live/cache proof limit."
);

assertNotContains(
  "frontend/tools/verify-pwa-icon-publish-readiness-local.mjs",
  /\b(?:git|gh)\s+(?:add|commit|push|checkout|reset|merge|rebase|tag|release|workflow|run)\b|hooks\.render\.com|RENDER_[A-Z_]*(?:HOOK|KEY|TOKEN|SECRET)|command:\s*["']gh["']|command:\s*["']curl["']/,
  "PWA icon publish-readiness verifier must not embed mutating git/gh/curl or Render hook behavior."
);

assertContains(
  "frontend/index.html",
  /<link rel="apple-touch-icon" sizes="180x180" href="\/gsn-app-icon-ios-180-v14\.png" \/>/,
  "iPhone home-screen installs must use the dedicated 180x180 safe-zone GSN touch icon."
);

assertContains(
  "frontend/public/manifest.json",
  /"src": "\/gsn-app-icon-ios-180-v14\.png"[\s\S]*?"sizes": "180x180"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-192-v14\.png"[\s\S]*?"sizes": "192x192"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-512-v14\.png"[\s\S]*?"sizes": "512x512"[\s\S]*?"purpose": "any"/,
  "PWA manifest must expose v14 same-composition 180, 192, and 512 PNG icons."
);

assertContains(
  "frontend/public/manifest.webmanifest",
  /"src": "\/gsn-app-icon-ios-180-v14\.png"[\s\S]*?"sizes": "180x180"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-192-v14\.png"[\s\S]*?"sizes": "192x192"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-512-v14\.png"[\s\S]*?"sizes": "512x512"[\s\S]*?"purpose": "any"/,
  "Web manifest must expose v14 same-composition 180, 192, and 512 PNG icons."
);

assertNotContains(
  "frontend/public/manifest.json",
  /maskable|gsn-app-icon\.svg/,
  "PWA manifest must not offer Android a separate maskable/SVG install icon that can drop the outer gold ring."
);

assertNotContains(
  "frontend/public/manifest.webmanifest",
  /maskable|gsn-app-icon\.svg/,
  "Web manifest must not offer Android a separate maskable/SVG install icon that can drop the outer gold ring."
);

assertContains(
  "frontend/src/components/GsnInstallPrompt.tsx",
  /src="\/gsn-app-icon-ios-180-v14\.png"/,
  "Install prompt preview must show the same v14 Apple-style icon used for phone shortcuts."
);

assertPngDimensions(
  "frontend/public/gsn-app-icon-ios-180-v14.png",
  180,
  180,
  "iPhone touch icon must be a real 180x180 PNG, not a cropped or mislabeled asset."
);

assertPngDimensions(
  "frontend/public/gsn-app-icon-192-v14.png",
  192,
  192,
  "PWA 192 icon must be a real 192x192 PNG, not a cropped or mislabeled asset."
);

assertPngDimensions(
  "frontend/public/gsn-app-icon-512-v14.png",
  512,
  512,
  "PWA 512 icon must be a real 512x512 PNG."
);

assertPngQuietEdge(
  "frontend/public/gsn-app-icon-ios-180-v14.png",
  "iPhone touch icon must keep a quiet navy safe zone so iOS rounding does not crop gold border or shield artwork."
);

assertPngQuietEdge(
  "frontend/public/gsn-app-icon-192-v14.png",
  "PWA 192 icon must keep a quiet navy safe zone so phone launchers do not crop gold border or shield artwork."
);

assertPngQuietEdge(
  "frontend/public/gsn-app-icon-512-v14.png",
  "PWA 512 icon must keep a quiet navy safe zone so phone launchers do not crop gold border or shield artwork."
);

if (existsSync(join(repoRoot, "frontend/dist"))) {
  assertBuiltArtifactContains(
    "frontend/dist/index.html",
    /<link rel="apple-touch-icon" sizes="180x180" href="\/gsn-app-icon-ios-180-v14\.png" \/>/,
    "Built deploy artifact must keep the dedicated iPhone Apple touch icon metadata."
  );

  assertBuiltArtifactContains(
    "frontend/dist/manifest.json",
    /"src": "\/gsn-app-icon-ios-180-v14\.png"[\s\S]*?"sizes": "180x180"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-192-v14\.png"[\s\S]*?"sizes": "192x192"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-512-v14\.png"[\s\S]*?"sizes": "512x512"[\s\S]*?"purpose": "any"/,
    "Built deploy manifest must expose the v14 same-composition iPhone, 192, and 512 GSN app icons."
  );

  assertBuiltArtifactContains(
    "frontend/dist/manifest.webmanifest",
    /"src": "\/gsn-app-icon-ios-180-v14\.png"[\s\S]*?"sizes": "180x180"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-192-v14\.png"[\s\S]*?"sizes": "192x192"[\s\S]*?"purpose": "any"[\s\S]*?"src": "\/gsn-app-icon-512-v14\.png"[\s\S]*?"sizes": "512x512"[\s\S]*?"purpose": "any"/,
    "Built deploy web manifest must expose the v14 same-composition iPhone, 192, and 512 GSN app icons."
  );

  assertBuiltArtifactContains(
    "frontend/dist/sw.js",
    /const CACHE_VERSION = "gsn-pwa-shell-v14"[\s\S]*?"\/gsn-app-icon-ios-180-v14\.png"[\s\S]*?"\/gsn-app-icon-192-v14\.png"[\s\S]*?"\/gsn-app-icon-512-v14\.png"/,
    "Built deploy service worker must precache the iPhone-safe app icon."
  );

  assertPngDimensions(
    "frontend/dist/gsn-app-icon-ios-180-v14.png",
    180,
    180,
    "Built iPhone touch icon must be a real 180x180 PNG."
  );

  assertPngQuietEdge(
    "frontend/dist/gsn-app-icon-ios-180-v14.png",
    "Built iPhone touch icon must keep a quiet navy safe zone."
  );

  assertPngDimensions(
    "frontend/dist/gsn-app-icon-192-v14.png",
    192,
    192,
    "Built Android/PWA 192 icon must be a real 192x192 PNG."
  );

  assertPngDimensions(
    "frontend/dist/gsn-app-icon-512-v14.png",
    512,
    512,
    "Built Android/PWA 512 icon must be a real 512x512 PNG."
  );
}

assertContains(
  "docs/GSN_MOBILE_UI_PROTOCOL.md",
  /Use premium realistic 3D object icons for meaning, not decoration\.[\s\S]*?Do not use flat, outline, faded, cartoon, or emoji-style icons as primary UI\s+icons\./,
  "Mobile UI protocol must require premium realistic 3D object icons."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /frontend\/src\/components\/TrustPaperMarks\.tsx` is an outline SVG icon family\.[\s\S]*?TrustPaperMarks\.tsx` is a transitional compatibility layer, not the final\s+GSN icon system\./,
  "Icon migration plan must state that TrustPaperMarks is transitional, not the final 3D icon system."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /frontend\/src\/assets\/gsn-icons\/[\s\S]*?icon-trust-shield-3d\.webp[\s\S]*?icon-community-building-3d\.webp[\s\S]*?icon-shop-storefront-3d\.webp[\s\S]*?icon-market-stall-3d\.webp[\s\S]*?icon-vault-safe-3d\.webp[\s\S]*?icon-finance-bank-building-3d\.webp[\s\S]*?icon-finance-wallet-card-3d\.webp/,
  "Icon migration plan must define the future 3D icon asset home and core filenames."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /Public evidence and entry surfaces:[\s\S]*?CoverPage[\s\S]*?WelcomePage[\s\S]*?CommunityVerifyPage[\s\S]*?TrustSlipVerifyPage[\s\S]*?ShopGalleryPage[\s\S]*?Core authenticated work surfaces:[\s\S]*?MarketplacePage[\s\S]*?FinancePage[\s\S]*?TrustScorePage/,
  "Icon migration plan must keep the priority screen migration order."
);

assertContains(
  "frontend/src/assets/gsn-icons/README.md",
  /premium skeuomorphic \/ realistic 3D icons[\s\S]*?See `docs\/GSN_ICON_MIGRATION\.md` before adding or replacing icon assets\./,
  "3D icon asset folder must explain the target style and migration doc."
);

assertContains(
  "frontend/src/lib/gsnIconAssets.ts",
  /export const GSN_3D_ICON_KEYS = \[[\s\S]*?"trust-shield"[\s\S]*?"community-building"[\s\S]*?"shop-storefront"[\s\S]*?"market-stall"[\s\S]*?"vault-safe"[\s\S]*?"finance-bank-building"[\s\S]*?"finance-wallet-card"[\s\S]*?"repayment-schedule"[\s\S]*?"records-folder"[\s\S]*?"certificate-seal"[\s\S]*?"join-person-plus"[\s\S]*?"spotlight-megaphone"[\s\S]*?"identity-card"[\s\S]*?"phone-contact"[\s\S]*?"qr-record"[\s\S]*?"public-globe"[\s\S]*?\] as const;/,
  "3D icon registry must include the required base-pack keys."
);

assertContains(
  "frontend/src/lib/gsnIconAssets.ts",
  /(?=[\s\S]*?icon-trust-shield-3d\.webp)(?=[\s\S]*?icon-community-building-3d\.webp)(?=[\s\S]*?icon-shop-storefront-3d\.webp)(?=[\s\S]*?icon-market-stall-3d\.webp)(?=[\s\S]*?icon-vault-safe-3d\.webp)(?=[\s\S]*?icon-finance-bank-building-3d\.webp)(?=[\s\S]*?icon-finance-wallet-card-3d\.webp)(?=[\s\S]*?icon-repayment-schedule-3d\.webp)(?=[\s\S]*?icon-records-folder-3d\.webp)(?=[\s\S]*?icon-certificate-seal-3d\.webp)(?=[\s\S]*?icon-join-person-plus-3d\.webp)(?=[\s\S]*?icon-spotlight-megaphone-3d\.webp)/,
  "3D icon registry must preserve the required base-pack filenames."
);

assertContains(
  "frontend/src/components/GsnLegacyIcon.tsx",
  /bank: "finance-bank-building"[\s\S]*?chart: "finance-bank-building"[\s\S]*?evidence: "certificate-seal"[\s\S]*?financeInstitution: "finance-bank-building"[\s\S]*?marketplace: "market-stall"[\s\S]*?proof: "certificate-seal"[\s\S]*?repaymentSchedule: "repayment-schedule"[\s\S]*?shop: "market-stall"[\s\S]*?soundOn: "audio-speaker"[\s\S]*?speaker: "audio-speaker"[\s\S]*?tag: "market-stall"[\s\S]*?video: "media-video"/,
  "Legacy icon adapter must route domain finance, marketplace, certificate/evidence, repayment, sound, and video meanings to the stronger 3D assets."
);

assertContains(
  "frontend/src/components/SpotlightMediaFrame.tsx",
  /<GsnLegacyIcon name="speaker" size=\{audioIconSize\} decorative \/>[\s\S]*?data-spotlight-audio-muted-slash="true"/,
  "Shared Spotlight media controls must use a real speaker icon and a muted slash instead of page-local On/Off wording."
);

assertNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /audioUnlock(?:Off)?Label="(?:On|Off)"/,
  "Dashboard Spotlight media controls must not restore On/Off labels; use the shared speaker control."
);

for (const asset of requiredBasePackAssets) {
  assertFileExists(
    `frontend/src/assets/gsn-icons/${asset.fileName}`,
    `Generated ${asset.key} 3D icon asset must stay in the GSN icon asset home.`
  );

  assertContains(
    "frontend/src/lib/gsnIconAssets.ts",
    new RegExp(
      `import ${asset.importName} from "\\.\\.\\/assets\\/gsn-icons\\/${asset.fileName}";[\\s\\S]*?"${asset.key}": \\{[\\s\\S]*?assetUrl: ${asset.importName},[\\s\\S]*?status: "available"`
    ),
    `3D icon registry must keep ${asset.key} wired and marked available.`
  );
}

assertNotContains(
  "frontend/src/lib/gsnIconAssets.ts",
  /assetUrl: null,[\s\S]*?status: "planned"/,
  "The required base-pack registry must not regress to planned/null assets now that the pack exists."
);

assertContains(
  "frontend/src/components/GsnRealisticIcon.tsx",
  /renderPending = false[\s\S]*?if \(!asset\.assetUrl\) \{[\s\S]*?if \(!renderPending\) return null;/,
  "GsnRealisticIcon must not render placeholder icons for missing assets unless explicitly requested."
);

assertContains(
  "docs/GSN_ICON_MIGRATION.md",
  /frontend\/src\/lib\/gsnIconAssets\.ts[\s\S]*?frontend\/src\/components\/GsnRealisticIcon\.tsx[\s\S]*?Registry entries without real asset files must keep `assetUrl: null` and\s+`status: "planned"`\.[\s\S]*?The shared\s+renderer returns nothing for missing assets by default, because a placeholder box\s+is not a compliant 3D icon\./,
  "Icon migration plan must document the typed registry and no-fake-placeholder renderer behavior."
);

for (const file of [
  "docs/DESIGN_SYSTEM.md",
  "docs/UX_ACCEPTANCE_CHECKLIST.md",
  "docs/GSN_MOBILE_UI_PROTOCOL.md",
  "docs/GSN_ICON_MIGRATION.md",
  "frontend/src/assets/gsn-icons/README.md",
]) {
  assertNotContains(
    file,
    /\b(?:app-native\s+)?SVG pictograms?\b/i,
    "Core UX docs must not reintroduce SVG pictograms as the primary icon standard."
  );
}

for (const file of [
  "frontend/src/pages/FinancePage.tsx",
  "frontend/src/pages/MarketplacePage.tsx",
  "frontend/src/pages/LoanSummaryPage.tsx",
]) {
  assertNotContains(
    file,
    /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
    "Core finance, marketplace, and loan-summary polish must not reintroduce spaced-out micro-label typography."
  );
}

assertContains(
  "frontend/src/pages/MarketplacePage.tsx",
  /function marketplaceLinkHeroIconStyle[\s\S]*?background:\s*"linear-gradient\(180deg, rgba\(255,255,255,0\.98\)[\s\S]*?borderRight:\s*"1px solid rgba\(13,95,168,0\.10\)"[\s\S]*?function marketplaceLinkRowIconStyle[\s\S]*?const accents = \{[\s\S]*?background:\s*"linear-gradient\(180deg, rgba\(255,255,255,0\.98\)/,
  "Marketplace link icons must stay on light 3D icon tiles instead of heavy dark gradient slabs."
);

assertContains(
  "frontend/src/pages/LoanSummaryPage.tsx",
  /function actionText[\s\S]*?color:\s*"#0B4EA2"[\s\S]*?background:\s*"linear-gradient\(180deg, rgba\(255,255,255,0\.98\)[\s\S]*?rgba\(246,250,255,0\.86\)[\s\S]*?<GsnLegacyIcon name=\{name\} size=\{26\} \/>/,
  "Loan Summary action icons must stay on light 3D icon tiles instead of dark navy slabs."
);

assertContains(
  "frontend/src/pages/DashboardPage.tsx",
  /function DashboardSignalIcon[\s\S]*?const iconMap: Record<DashboardSignalName, GsnIconName>[\s\S]*?<GsnLegacyIcon[\s\S]*?function DashboardPassportFeatureIcon[\s\S]*?const iconMap: Record<"eye" \| "briefcase" \| "check", GsnIconName>[\s\S]*?<GsnLegacyIcon/,
  "Dashboard passport/status helper icons must stay on the shared 3D icon adapter."
);

assertNotContains(
  "frontend/src/pages/DashboardPage.tsx",
  /Apple Color Emoji|Segoe UI Emoji|<svg[\s\S]*?function DashboardPassportFeatureIcon/,
  "Dashboard passport/status helper icons must not restore emoji or inline SVG primary icons."
);

assertContains(
  "frontend/src/pages/TrustScorePage.tsx",
  /trustIconBadge\("financeInstitution", isCompact \? 46 : 54, "blue"\)[\s\S]*?Plain rule/,
  "Trust Passport finance plain-rule block must keep the 3D finance institution icon."
);

for (const file of [
  "frontend/src/components/TrustDocumentFamilyMap.tsx",
  "frontend/src/components/TrustDocumentUseCases.tsx",
  "frontend/src/components/TrustDocumentActionGuide.tsx",
]) {
  assertContains(
    file,
    /GsnLegacyIcon[\s\S]*?function iconTile[\s\S]*?rgba\(255,255,255,0\.98\)/,
    "Shared trust-document guide cards must keep light 3D icon tiles."
  );
  assertNotContains(
    file,
    /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
    "Shared trust-document guide cards must not restore spaced-out micro-label typography."
  );
}

assertNotContains(
  "frontend/src/pages/CCIReadingPage.tsx",
  /letterSpacing:\s*(?:0\.[1-9][0-9]*|[1-9][0-9.]*)/,
  "CCI Reading must not restore spaced-out micro-label typography."
);

assertContains(
  "frontend/src/pages/TrustSlipPage.tsx",
  /<GsnLegacyIcon name="evidence" size=\{40\} \/>[\s\S]*?<span>GSN<\/span>/,
  "TrustSlip hero must use a certificate/evidence 3D icon instead of a generic globe mark."
);

assertContains(
  "frontend/src/pages/CCIReadingPage.tsx",
  /cciIconBadge\("community", <>Posture \{cciPosture\.shortLabel\}<\/>, true\)[\s\S]*?cciIconBadge\("search", <>Evidence only<\/>\)[\s\S]*?labelWithIcon\("community", "Reading"\)[\s\S]*?labelWithIcon\("evidence", "Open Trust Passport"\)/,
  "CCI first viewport must use community/certificate icon meaning instead of finance-chart meaning."
);

if (findings.length) {
  console.error("GSN icon protocol audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "GSN icon protocol audit passed: core UX docs require premium realistic 3D object icons, and the required base-pack assets are present and wired."
);
