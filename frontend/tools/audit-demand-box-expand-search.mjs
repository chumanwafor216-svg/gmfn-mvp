/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const demandPath = "src/pages/DemandBoxPage.tsx";
const credentialPath = "src/pages/CommunityMemberVerifyPage.tsx";
const demand = readFileSync(join(frontendRoot, demandPath), "utf8");
const credential = readFileSync(join(frontendRoot, credentialPath), "utf8");
const failures = [];

function requirePattern(source, file, pattern, message) {
  if (!pattern.test(source)) failures.push(`${file}: ${message}`);
}

requirePattern(
  demand,
  demandPath,
  /function renderExpandedSearchPanel\([\s\S]*?matchState\?\.loaded === true[\s\S]*?!matchState\.error[\s\S]*?matchState\.count === 0/,
  "expanded search must require a successful zero-match supply check"
);
requirePattern(
  demand,
  demandPath,
  /isMineRow\(row, me\)[\s\S]*?!isProtectedTargetDemand\(row\)/,
  "expanded search must stay owner-only and exclude private Ask Person requests"
);
requirePattern(
  demand,
  demandPath,
  /handleExpandSearch\(row: DemandRow\)[\s\S]*?setMarketplaceRequestRelayConsent\(demandId, true\)[\s\S]*?getMarketplaceRequestRelayCandidates[\s\S]*?createMarketplaceRequestRelayRun/,
  "Expand search must reuse consent, private candidate discovery, and the governed relay run"
);
requirePattern(
  demand,
  demandPath,
  /data-gsn-demand-expand-search="true"[\s\S]*?No match in this community yet[\s\S]*?Expand search[\s\S]*?not public, radius-based, paid, or guaranteed search/,
  "the no-match card must keep its plain action and truthful boundary"
);
requirePattern(
  credential,
  credentialPath,
  /window\.innerWidth <= 620[\s\S]*?data-gsn-member-credential-actions=\{compact \? "compact" : "wide"\}/,
  "the public member credential must have a compact action surface"
);
requirePattern(
  credential,
  credentialPath,
  /\{isCompact \? credentialActions\(true\) : null\}[\s\S]*?title="Community evidence"/,
  "phone credential actions must appear before collapsed community evidence"
);
requirePattern(
  credential,
  credentialPath,
  /!isCompact \? \([\s\S]*?<TrustPaperAuthorityStrip/,
  "the repeated authority strip must stay off the compact first surface"
);
requirePattern(
  credential,
  credentialPath,
  /title="QR and sharing"[\s\S]*?Scan to reopen this credential/,
  "QR sharing must remain available behind a disclosure"
);

if (failures.length) {
  console.error("DemandBox expanded-search and public credential audit failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("DemandBox expanded-search and public credential audit passed.");
