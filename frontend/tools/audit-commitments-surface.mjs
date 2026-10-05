/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

function readFromFrontend(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function readFromRepo(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

const findings = [];

function lineAt(text, index) {
  return text.slice(0, Math.max(index, 0)).split(/\r?\n/).length;
}

function assertPattern(file, text, pattern, message) {
  if (pattern.test(text)) return;
  findings.push({
    file,
    line: 1,
    message,
    text: "Expected invariant was not found.",
  });
}

function assertNotPattern(file, text, pattern, message) {
  const match = text.match(pattern);
  if (!match || match.index === undefined) return;
  findings.push({
    file,
    line: lineAt(text, match.index),
    message,
    text: match[0].replace(/\s+/g, " ").slice(0, 220),
  });
}

const appRoutesFile = "src/lib/appRoutes.ts";
const appFile = "src/App.tsx";
const dashboardFile = "src/pages/DashboardPage.tsx";
const commitmentsFile = "src/pages/CommitmentsPage.tsx";
const apiFile = "src/lib/api.ts";
const registryFile = "docs/SCREEN_REGISTRY.md";
const marketplaceRoscaFile = "src/pages/marketplace/MarketplaceRoscaSection.tsx";

const appRoutes = readFromFrontend(appRoutesFile);
const app = readFromFrontend(appFile);
const dashboard = readFromFrontend(dashboardFile);
const commitments = readFromFrontend(commitmentsFile);
const api = readFromFrontend(apiFile);
const registry = readFromRepo(registryFile);
const marketplaceRosca = readFromFrontend(marketplaceRoscaFile);

assertPattern(
  appRoutesFile,
  appRoutes,
  /COMMITMENTS:\s*"\/app\/commitments"/,
  "Commitments must have a canonical APP_ROUTES entry."
);

assertPattern(
  appFile,
  app,
  /const CommitmentsPage = React\.lazy\(\(\) => import\("\.\/pages\/CommitmentsPage"\)\)/,
  "CommitmentsPage must be lazy-loaded through App routing."
);
assertPattern(
  appFile,
  app,
  /<Route path="commitments" element=\{<CommitmentsPage \/>\} \/>/,
  "Authenticated /app/commitments must mount CommitmentsPage."
);
assertPattern(
  appFile,
  app,
  /<Route path="\/commitments" element=\{<PreserveRedirect to=\{APP_ROUTES\.COMMITMENTS\} \/>\} \/>/,
  "Public /commitments alias must redirect into the authenticated Commitments route."
);
assertPattern(
  registryFile,
  registry,
  /CommitmentsPage/,
  "CommitmentsPage must be registered as an authenticated screen."
);

assertPattern(
  dashboardFile,
  dashboard,
  /COMMITMENTS:\s*"\/app\/commitments"/,
  "Dashboard route alias map must know the Commitments home."
);
assertPattern(
  dashboardFile,
  dashboard,
  /debugId="dashboard\.focus\.open-commitments"[\s\S]*?openDashboardRoute\(event, DASHBOARD_TARGETS\.COMMITMENTS\)/,
  "Dashboard Focus must provide a concise pointer to canonical Commitments without removing the existing Focus workflow."
);
assertPattern(
  dashboardFile,
  dashboard,
  /debugId="dashboard\.focus\.composer\.toggle"[\s\S]*?Add commitment/,
  "Dashboard Focus local composer must remain available."
);

[
  /export type ParticipantRoscaRunOut/,
  /export async function listMyParticipantRoscaRuns\(\)[\s\S]*?\/rosca-runs\/me/,
  /export async function createParticipantRoscaDraft[\s\S]*?\/rosca-runs\/drafts/,
  /export async function acceptParticipantRoscaInvitation[\s\S]*?\/participants\/me\/accept/,
  /export async function declineParticipantRoscaInvitation[\s\S]*?\/participants\/me\/decline/,
  /export async function activateParticipantRoscaRun[\s\S]*?\/activate/,
  /export async function recordParticipantRoscaContribution[\s\S]*?\/contribution-records/,
].forEach((pattern) => {
  assertPattern(apiFile, api, pattern, "Participant ROSCA API wrapper is missing or not routed to /rosca-runs.");
});

[
  /data-commitments-home="true"/,
  /Personal[\s\S]*?Focus commitments[\s\S]*?Shared[\s\S]*?ROSCA/,
  /APP_ROUTES\.DASHBOARD\}#focus-commitments/,
  /listMyParticipantRoscaRuns\(/,
  /getParticipantRoscaRun\(/,
  /useSearchParams\(\)[\s\S]*?rosca_run_id[\s\S]*?requestedVisible[\s\S]*?setSelectedRunId\(Number\(requestedRunId\)\)/,
  /acceptParticipantRoscaInvitation\(\{[\s\S]*?terms_version: run\.terms_version,[\s\S]*?terms_hash: run\.terms_hash/,
  /declineParticipantRoscaInvitation\(/,
  /activateParticipantRoscaRun\(run\.id\)/,
  /inviteParticipantRoscaParticipant\(\{[\s\S]*?invitee_gsn_id:[\s\S]*?rotation_position:/,
  /Use exact GSN ID\. This is not a directory search\./,
  /GSN records the arrangement; GSN does not hold the money\./,
  /data-commitments-contribution-boundary="actor-truthful"/,
  /You recorded your contribution|Coordinator recorded contribution/,
].forEach((pattern) => {
  assertPattern(commitmentsFile, commitments, pattern, "Commitments surface is missing a required COM-3 invariant.");
});

assertNotPattern(
  commitmentsFile,
  commitments,
  /Payment confirmed/,
  "Commitments must not tell an external reader that self-recorded ROSCA contribution equals payment confirmation."
);
assertNotPattern(
  commitmentsFile,
  commitments,
  /TrustScore|CCI/,
  "Commitments must not expose TrustScore/CCI admission or ranking language."
);
assertNotPattern(
  commitmentsFile,
  commitments,
  /terms hash|terms version|idempotency key/i,
  "Commitments visible surface must not expose terms hash/version/idempotency machinery."
);

assertPattern(
  marketplaceRoscaFile,
  marketplaceRosca,
  /debugId="marketplace\.rosca\.start-cycle"[\s\S]*?debugId="marketplace\.rosca\.record-payout"/,
  "Legacy Marketplace ROSCA cycle lane must remain operational during COM-3."
);
assertPattern(
  apiFile,
  api,
  /export async function getRoscaCycles[\s\S]*?\/rosca\/cycles[\s\S]*?export async function createRoscaCycle[\s\S]*?\/rosca\/cycles/,
  "Legacy /rosca/cycles API wrappers must remain intact."
);

if (findings.length) {
  console.error("audit:commitments-surface failed");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("audit:commitments-surface passed");