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
const pacingFile = "../gmfn_backend/app/services/spotlight_pacing_state_service.py";

const app = read(appFile);
const page = read(pageFile);
const api = read(apiFile);
const routes = read(routesFile);
const command = read(commandFile);
const registry = read(registryFile);
const specs = read(specsFile);
const backend = read(backendFile);
const eligibility = read(eligibilityFile);
const pacing = read(pacingFile);

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
  "/destinations/${encodeURIComponent(String(clanId))}/stop",
  "/stop",
]) {
  requireText(apiFile, api, endpoint, "Missing typed API binding for " + endpoint + ".");
}

for (const text of [
  'data-screen="admin-gsn-house-campaign"',
  "destinationTitle(row)",
  "row.community_code",
  "disabled={!row.eligible || draftBusy || publishedCount > 0}",
  "Open final check",
  "MAX_GSN_HOUSE_BATCH_MEDIA = 10",
  "multiple",
  "Still needed before publishing:",
  "Advertiser contact phone",
  "canonicalAdvertiserPhone",
  "advertiser_contact_phone: review.contactPhone",
  "Keep this page open",
  "for (let index = 0; index < mediaQueue.length; index += 1)",
  "for (let index = results.length; index < review.media.length; index += 1)",
  "Continue publishing batch",
  "I confirm this is an official GSN publication",
  "Publish GSN campaign",
  "idempotencyKey: makeIdempotencyKey()",
  "idempotency_key: item.idempotencyKey",
  "Preparation and review do not publish anything",
  "Current draft",
  "Active inventory and truthful delivery report",
  'debugId="admin-gsn-campaign.current-report.summary"',
  "Open delivery report and campaign controls",
  "Issued by GSN",
  '"Seen"',
  "operations.active_count",
  "Emergency campaign stop",
  "Discard unpublished review",
  "await stopAdminGsnHouseCampaign",
  "await stopAdminGsnHouseCampaignDestination",
  "Stop in this community",
  "Other permitted destinations continue",
  "debugId={`admin-gsn-campaign.destination-stop.review.${campaign.campaign_id}`}",
  "debugId={`admin-gsn-campaign.destination-stop.confirm.${campaign.campaign_id}.${destination.clan_id}`}",
  "debugId={`admin-gsn-campaign.destination-stop.cancel.${campaign.campaign_id}.${destination.clan_id}`}",
  "discardAdminGsnHouseCampaignReviewMedia",
  "setMediaQueue((current) => [...current, preparedItem])",
  "setMediaPreviewKey(preparedItem.key)",
  "setMediaPreviewKey(item.key)",
  "showing {previewMediaIndex + 1} of {mediaQueue.length}",
  "setStagedReviewMedia((current) => ({",
  "media items remain safely prepared on GSN",
  "Continue final check · ${stagedReviewCount} of ${mediaQueue.length} prepared",
  "the completed uploads will not be repeated",
  "nextExpiry - Date.now() + 250",
  "Do not publish again. Check the connection, then tap Refresh status.",
  "tap Refresh status first",
]) {
  requireText(pageFile, page, text, "Missing screen contract: " + text + ".");
}
requireText(
  specsFile,
  specs,
  "keep the first surface compact",
  "The phone-first campaign disclosure rule is missing from the screen spec."
);
if (page.includes('["Publisher", "GSN-HOUSE"]')) {
  findings.push({
    file: pageFile,
    message: "The compact publisher hero must not regress to the six-tile draft summary.",
  });
}
for (const text of [
  "Specific window and interval",
  "Normal Spotlight rotation",
  "eligible presentation opportunity",
  "schedule: review.schedule",
  "peak-time surcharge",
  "admin-gsn-campaign.schedule-start",
  "admin-gsn-campaign.schedule-end",
  "admin-gsn-campaign.schedule-interval",
]) {
  requireText(pageFile, page, text, "Missing timed campaign screen contract: " + text + ".");
}
for (const text of [
  "GsnHouseCampaignSchedule",
  "scheduled_opportunities_per_promotion",
  "peak_time_surcharge_status",
]) {
  requireText(apiFile, api, text, "Missing timed campaign API contract: " + text + ".");
}
for (const text of [
  'Advert group expiry',
  'expires_at: review.expiresAt',
  'Every picture and video in this reviewed group receives this same expiry',
  'including a multi-month campaign',
  'The expiry does not itself confirm payment',
  'Twenty-four hours is the starting default, not a maximum',
  'Group expiry:',
]) {
  requireText(pageFile, page, text, 'Missing advert-group expiry screen contract: ' + text + '.');
}
for (const text of [
  "class GsnHouseCampaignScheduleIn",
  "def _resolve_gsn_house_campaign_schedule",
  "def _configure_gsn_house_campaign_schedule",
  "eligible_presentation_opportunity_not_clock_playback_or_reach",
  "peak_time_surcharge_policy_undecided",
]) {
  requireText(backendFile, backend, text, "Missing backend timed campaign contract: " + text + ".");
}
for (const text of [
  "_consumed_rounds_after_delivery",
  "_scheduled_next_eligible_time",
  "schedule_starts_at",
  "schedule_ends_at",
]) {
  requireText(pacingFile, pacing, text, "Missing anchored timed pacing contract: " + text + ".");
}
requireText(apiFile, api, 'expires_at: string;', 'The typed GSN campaign request must require the reviewed expiry.');
for (const text of [
  "placement_serving_status?: string | null",
  "policy_eligible?: boolean",
  "delivery_eligible?: boolean",
  "destination_withdrawal_audit?",
]) {
  requireText(apiFile, api, text, "Missing typed destination-management contract: " + text + ".");
}
for (const text of [
  "compact per-campaign destination status",
  "Stopping one destination must require a reason and confirmation",
  "The final serving destination must direct the operator",
]) {
  requireText(specsFile, specs, text, "Missing destination-management screen rule: " + text + ".");
}
for (const text of [
  'expires_at: Optional[datetime] = None',
  'def _resolve_gsn_house_campaign_expiry',
  'gsn_house_campaign_expiry_must_be_future',
  'def _gsn_house_campaign_chargeable_days',
  '"chargeable_days": chargeable_days',
]) {
  requireText(backendFile, backend, text, 'Missing backend advert-group expiry contract: ' + text + '.');
}
for (const [file, source, forbidden] of [
  [pageFile, page, 'GSN_HOUSE_MAX_LIFETIME_MS'],
  [pageFile, page, 'current pilot maximum is 24 hours'],
  [backendFile, backend, 'gsn_house_campaign_expiry_exceeds_pilot_limit'],
]) {
  if (source.includes(forbidden)) {
    findings.push({ file, message: 'Removed fixed expiry ceiling returned: ' + forbidden + '.' });
  }
}

if (/disabled=\{selectedRows\.length === 0[^}]*\}/.test(page)) {
  findings.push({
    file: pageFile,
    message: "Review must explain missing requirements instead of becoming silently disabled.",
  });
}
requireOrder(
  pageFile,
  page,
  "await previewAdminGsnHouseCampaign",
  "await createAdminGsnHouseCampaign",
  "Read-only preview must occur before final publication."
);
requireOrder(
  pageFile,
  page,
  'debugId="admin-gsn-campaign.review"',
  "Prepared batch",
  "The final-check action must stay above the long prepared-media preview and queue."
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
  "advertiser_contact_phone",
  "_normalize_advertiser_contact_phone",
  "def list_gsn_house_campaign_destinations",
  "def list_gsn_house_campaigns",
  "def preview_gsn_house_campaign",
  "def create_gsn_house_campaign",
  "def stop_gsn_house_campaign",
  "def stop_gsn_house_campaign_destination",
  'event_type="marketplace.gsn_house_campaign.destination_withdrawn"',
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
  "def stop_gsn_house_campaign_destination",
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
  "REJECTION_GSN_HOUSE_ADVERTISING_EXCLUDED",
  "The delivery-time advertising-exclusion rejection is missing."
);
requireText(
  eligibilityFile,
  eligibility,
  "allow_gsn_house_campaigns",
  "Delivery-time advertising-policy revalidation is missing."
);

if (findings.length > 0) {
  console.error("Admin GSN house campaign audit failed:");
  for (const finding of findings) {
    console.error("- " + finding.file + ": " + finding.message);
  }
  process.exit(1);
}

console.log("Admin GSN house campaign audit passed.");
