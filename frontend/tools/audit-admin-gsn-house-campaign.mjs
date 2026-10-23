/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

function read(file) {
  return readFileSync(join(frontendRoot, file), "utf8");
}

function requireText(file, source, text, message) {
  if (!source.includes(text)) findings.push({ file, message });
}

function requireOrder(file, source, first, second, message) {
  const firstIndex = source.indexOf(first);
  const secondIndex = source.indexOf(second);
  if (firstIndex < 0 || secondIndex <= firstIndex) findings.push({ file, message });
}

function section(source, startText, endText) {
  const start = source.indexOf(startText);
  const end = source.indexOf(endText, Math.max(0, start) + startText.length);
  return start >= 0 && end > start ? source.slice(start, end) : "";
}

const appFile = "src/App.tsx";
const pageFile = "src/pages/AdminGsnHouseCampaignPage.tsx";
const apiFile = "src/lib/api.ts";
const routesFile = "src/lib/appRoutes.ts";
const commandFile = "src/pages/TrustCommandCentrePage.tsx";
const registryFile = "../docs/SCREEN_REGISTRY.md";
const specsFile = "../docs/SCREEN_SPECS.md";
const backendFile = "../gmfn_backend/app/api/routes/marketplace.py";
const eligibilityFile =
  "../gmfn_backend/app/services/spotlight_opportunity_eligibility_service.py";

const app = read(appFile);
const page = read(pageFile);
const api = read(apiFile);
const routes = read(routesFile);
const command = read(commandFile);
const registry = read(registryFile);
const specs = read(specsFile);
const backend = read(backendFile);
const eligibility = read(eligibilityFile);

const commandRoutes = section(
  app,
  'path="command-center"',
  'path="trust-command-centre"'
);
const platformAdminRoutes = commandRoutes.slice(
  commandRoutes.indexOf('<RequireAuth requireRole="admin">')
);

requireText(
  appFile,
  platformAdminRoutes,
  'path="gsn-campaigns" element={<AdminGsnHouseCampaignPage />}',
  "GSN campaigns must stay inside the platform-admin-only route group."
);
requireText(
  routesFile,
  routes,
  'GSN_CAMPAIGNS: "/app/command-center/gsn-campaigns"',
  "The canonical GSN campaign route constant is missing."
);
requireOrder(
  commandFile,
  command,
  "if (isPlatformAdmin)",
  'label: "GSN Spotlight Campaigns"',
  "The GSN publisher must only appear in the platform-admin Command Centre card set."
);
requireText(registryFile, registry, "AdminGsnHouseCampaignPage", "The screen is missing from the registry.");
requireText(specsFile, specs, "## AdminGsnHouseCampaignPage", "The screen specification is missing.");
requireText(specsFile, specs, "Preview must be read-only.", "The read-only preview boundary is missing from the screen spec.");

for (const endpoint of [
  "/marketplace/admin/gsn-house-campaigns${buildQuery({ limit })}",
  "/marketplace/admin/gsn-house-campaigns/destinations",
  "/marketplace/admin/gsn-house-campaigns/preview",
  "/marketplace/admin/gsn-house-campaigns",
  "/marketplace/admin/gsn-house-campaigns/media/discard",
  "/stop",
]) {
  requireText(apiFile, api, endpoint, "Missing typed API binding for " + endpoint + ".");
}

for (const text of [
  'data-screen="admin-gsn-house-campaign"',
  "destinationTitle(row)",
  "row.community_code",
  "disabled={!row.eligible}",
  "Review campaign",
  "I confirm this is an official GSN publication",
  "Publish GSN campaign",
  "idempotencyKey: makeIdempotencyKey()",
  "idempotency_key: review.idempotencyKey",
  "Uploading media does not publish the campaign",
  "Current status and truthful delivery report",
  "Qualified presentations",
  "Emergency campaign stop",
  "Discard unpublished review",
  "await stopAdminGsnHouseCampaign",
  "discardAdminGsnHouseCampaignReviewMedia",
]) {
  requireText(pageFile, page, text, "Missing screen contract: " + text + ".");
}
requireOrder(
  pageFile,
  page,
  "await previewAdminGsnHouseCampaign",
  "await createAdminGsnHouseCampaign",
  "Read-only preview must occur before final publication."
);
if (page.includes("Clan ID") || page.includes("Internal ID")) {
  findings.push({
    file: pageFile,
    message: "Raw internal destination ids must not become operator-facing labels.",
  });
}

for (const text of [
  'GSN_HOUSE_PUBLISHER_ID = "GSN-HOUSE"',
  'role="system"',
  "def list_gsn_house_campaign_destinations",
  "def list_gsn_house_campaigns",
  "def preview_gsn_house_campaign",
  "def create_gsn_house_campaign",
  "def stop_gsn_house_campaign",
  "def discard_gsn_house_campaign_review_media",
  "Qualified presentations are server-accepted visibility events",
  '"community_code": community_code',
]) {
  requireText(backendFile, backend, text, "Missing backend contract: " + text + ".");
}
for (const functionName of [
  "def list_gsn_house_campaigns",
  "def list_gsn_house_campaign_destinations",
  "def preview_gsn_house_campaign",
  "def create_gsn_house_campaign",
  "def stop_gsn_house_campaign",
  "def discard_gsn_house_campaign_review_media",
]) {
  const functionBlock = section(backend, functionName, "@router");
  requireText(
    backendFile,
    functionBlock,
    "_require_platform_admin(current_user)",
    functionName + " must remain platform-admin only."
  );
}
requireText(
  eligibilityFile,
  eligibility,
  "REJECTION_GSN_HOUSE_OPT_IN_WITHDRAWN",
  "The delivery-time opt-out rejection is missing."
);
requireText(
  eligibilityFile,
  eligibility,
  "allow_gsn_house_campaigns",
  "Delivery-time opt-in revalidation is missing."
);

if (findings.length > 0) {
  console.error("Admin GSN house campaign audit failed:");
  for (const finding of findings) {
    console.error("- " + finding.file + ": " + finding.message);
  }
  process.exit(1);
}

console.log("Admin GSN house campaign audit passed.");
