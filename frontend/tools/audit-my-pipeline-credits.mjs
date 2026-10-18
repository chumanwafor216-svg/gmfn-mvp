/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendRoot, "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

function requireText(file, value, message) {
  if (!read(file).includes(value)) findings.push({ file, message, expected: value });
}

function rejectText(file, value, message) {
  if (read(file).includes(value)) findings.push({ file, message, forbidden: value });
}

const component = "frontend/src/components/MyPipelineCreditsSection.tsx";
const api = "frontend/src/lib/api.ts";
const page = "frontend/src/pages/MyGMFNAndIPage.tsx";
const spend = "gmfn_backend/app/services/member_credit_spotlight_service.py";
const catalogue = "gmfn_backend/app/services/member_credit_catalogue_service.py";

requireText(page, 'import MyPipelineCreditsSection from "../components/MyPipelineCreditsSection";', "My GSN must own the compact personal-credit section.");
requireText(page, "<MyPipelineCreditsSection", "My GSN must render the approved in-place section.");
requireText(component, 'data-my-pipeline-credits="true"', "The personal-credit section must remain a collapsed in-place disclosure.");
requireText(component, 'role="switch"', "Service permission must use an accessible ON/OFF switch contract.");
requireText(component, "It does not spend, reserve, activate or renew anything.", "The switch must explain its zero-financial-effect boundary.");
requireText(component, "Confirm and continue to Checkout", "A quoted purchase must retain one explicit confirmation.");
requireText(component, "status.collection_action_url", "Checkout navigation must use the server-returned destination.");
requireText(component, 'parsed.protocol === "https:"', "Checkout navigation must reject a non-HTTPS destination.");
requireText(component, "Current balance is insufficient", "The service row must represent insufficient personal balance truthfully.");
requireText(component, "Community and provider-cost accounts are separate.", "Personal and community/provider-cost balances must remain visibly separate.");
requireText(component, "normalizeMemberCreditAccount", "My GSN must reject a malformed personal-credit balance without crashing Profile.");
requireText(component, "normalizeMemberCreditCatalogue", "My GSN must validate catalogue arrays before selecting the first pack.");
requireText(component, "normalizeMemberCreditPurchases", "My GSN must treat a malformed purchase list as unavailable rather than iterating it.");
requireText(component, "Array.isArray(candidate.packs)", "The personal-credit catalogue boundary must verify server-owned pack and service arrays.");
requireText(api, 'httpJson("/member-credits/catalogue"', "The frontend must read the server-owned catalogue.");
requireText(api, "/member-credits/service-permissions/", "The frontend must persist service permission on the authenticated server contract.");
requireText(api, '"/member-credits/purchase-quotes"', "The frontend must use the existing quote contract.");
requireText(api, '"/member-credits/purchases"', "The frontend must use the existing purchase confirmation contract.");
requireText(spend, "require_member_credit_service_permission", "The actual member-credit spend must recheck the saved member permission.");
requireText(spend, "require_payment_operations_enabled", "Global payment suspension must override an ON preference.");
requireText(catalogue, 'str(os.getenv("PYTEST_RUNNING", "0")) == "1"', "Catalogue qualification entries must remain test-only.");
rejectText(component, "pack_version_id: 1", "The frontend must not hardcode a pack identifier.");
rejectText(component, "spotlight.single_day", "The frontend must not invent or hardcode a purchasable service.");
rejectText(component, "setStatus(\"awarded\")", "The client must never claim that Checkout awarded credits.");

if (findings.length) {
  console.error(JSON.stringify(findings, null, 2));
  process.exit(1);
}

console.log("My Pipeline Credits contract audit passed.");
