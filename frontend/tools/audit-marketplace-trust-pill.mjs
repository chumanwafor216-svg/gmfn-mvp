/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const marketplaceFile = "src/pages/MarketplacePage.tsx";
const source = readFileSync(join(frontendRoot, marketplaceFile), "utf8");
const findings = [];

function lineAt(index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function addFinding(index, message, text = "Expected pattern was not found.") {
  findings.push({
    file: marketplaceFile,
    line: index >= 0 ? lineAt(index) : 1,
    message,
    text: text.replace(/\s+/g, " ").slice(0, 260),
  });
}

function assertContains(pattern, message) {
  if (pattern.test(source)) return;
  addFinding(-1, message);
}

const trustDebugId = 'debugId="marketplace.tile.trust"';
const trustDebugIndex = source.indexOf(trustDebugId);
const trustTileStart =
  trustDebugIndex >= 0 ? source.lastIndexOf("<StableButton", trustDebugIndex) : -1;
const trustTileEnd =
  trustDebugIndex >= 0 ? source.indexOf("</StableButton>", trustDebugIndex) : -1;
const trustTile =
  trustTileStart >= 0 && trustTileEnd >= 0
    ? source.slice(trustTileStart, trustTileEnd + "</StableButton>".length)
    : "";

if (!trustTile) {
  addFinding(-1, "Marketplace compact Trust pill must remain a stable button.");
} else {
  [
    /aria-label="Open this marketplace trust summary"/,
    /onClick=\{toggleProfileDetails\}/,
    /aria-expanded=\{profileDetailsOpen\}/,
    /stableHeight=\{isCompact \? 46 : 48\}/,
    /<MarketplaceGlyph name="trust" size=\{16\} \/>/,
    /\{marketplaceTrustDisplay\}/,
  ].forEach((pattern) => {
    if (!pattern.test(trustTile)) {
      addFinding(
        source.indexOf(trustTile),
        "Marketplace compact Trust pill must only toggle the local trust summary and keep its stable frame.",
        trustTile
      );
    }
  });
}

const trustSummary =
  source.match(
    /\{profileDetailsOpen \? \([\s\S]*?<div style=\{sectionLabel\(\)\}>Local Marketplace Trust<\/div>[\s\S]*?\]\.map\(\(\[label, value\]\) => \([\s\S]*?\)\)\}[\s\S]*?<\/div>[\s\S]*?<\/div>[\s\S]*?\) : null\}/
  )?.[0] || "";

if (!trustSummary) {
  addFinding(
    source.indexOf("profileDetailsOpen"),
    "Expanded Trust pill summary must be clearly caged as Local Marketplace Trust."
  );
} else {
  [
    /This is this selected community's local trust signal\.[\s\S]*?Use More[\s\S]*?Marketplace Tools[\s\S]*?fuller evidence routes\./,
    /Member-level witness currentness belongs in those fuller[\s\S]*?evidence routes, not this local marketplace summary\./,
    /\["Marketplace ID", communityIdentity\(selectedCommunity\)\]/,
    /\["Local trust", marketplaceTrustDisplay\]/,
    /\["Trust events", marketplaceTrustEvidenceLabel\]/,
    /\["Positive trust", marketplaceTrustPositiveLabel\]/,
    /\["Negative trust", marketplaceTrustNegativeLabel\]/,
    /"Local finance signal"[\s\S]*?communityFinanceLabel\(selectedCommunity\)/,
  ].forEach((pattern) => {
    if (!pattern.test(trustSummary)) {
      addFinding(
        source.indexOf(trustSummary),
        "Local Marketplace Trust summary must explain itself and keep only compact local status facts.",
        trustSummary
      );
    }
  });

  [
    /openMarketplaceCta/,
    /openMarketplaceSection/,
    /href=/,
    /to=/,
    /Trust Passport/,
    /TrustSlip/,
    /CCI/,
  ].forEach((pattern) => {
    if (pattern.test(trustSummary)) {
      addFinding(
        source.indexOf(trustSummary),
        "Local Marketplace Trust summary must not become a route launcher or full Trust Passport surface.",
        trustSummary
      );
    }
  });
}

assertContains(
  /debugId="marketplace\.row\.records-links"[\s\S]*?Marketplace Tools[\s\S]*?Invite, verify, share, and open helper tools\./,
  "Fuller evidence and trust routes must remain under Marketplace Tools, not inside the compact Trust pill."
);

if (findings.length > 0) {
  console.error("Marketplace Trust pill audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Marketplace Trust pill audit passed.");
