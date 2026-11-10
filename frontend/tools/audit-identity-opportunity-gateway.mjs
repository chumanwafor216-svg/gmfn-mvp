/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  component: "src/components/IdentityOpportunityGateway.tsx",
  identity: "src/pages/IdentityIntegrityPage.tsx",
  verify: "src/pages/TrustSlipVerifyPage.tsx",
  publicPaper: "src/pages/trustSlipVerify/TrustSlipVerifyPublicPaper.tsx",
};
const source = Object.fromEntries(
  Object.entries(files).map(([key, file]) => [key, readFileSync(join(frontendRoot, file), "utf8")])
);
const findings = [];

function requirePattern(key, pattern, message) {
  if (pattern.test(source[key])) return;
  findings.push(`${files[key]}: ${message}`);
}

requirePattern(
  "component",
  /function OpportunityAction[\s\S]*?<StableCtaLink[\s\S]*?data-gsn-identity-opportunity-gateway=\{audience\}[\s\S]*?GSN Opportunity Gateway[\s\S]*?data-gsn-identity-opportunity-secondary="covered"/,
  "The shared gateway must keep one visible action and cover secondary routes."
);
requirePattern(
  "identity",
  /identity-integrity\.opportunity\.shop[\s\S]*?identity-integrity\.opportunity\.marketplace[\s\S]*?identity-integrity\.opportunity\.demand-box[\s\S]*?identity-integrity\.opportunity\.trust-slip[\s\S]*?identity-integrity\.opportunity\.communities/,
  "The owner card must connect Shop, Marketplace, Demand Box, TrustSlip, and Communities."
);
requirePattern(
  "identity",
  /cardOnlyMode \? \([\s\S]*?landscapeIdentityCard[\s\S]*?<IdentityOpportunityGateway[\s\S]*?audience="owner"[\s\S]*?collapseSecondary/,
  "Owner opportunity guidance must sit directly below the card-only presentation."
);
requirePattern(
  "verify",
  /getPublicMarketplaceShopByGmfnId\(gmfnIdValue,[\s\S]*?response\?\.is_public_shop_face === true[\s\S]*?publicShopPath\(gmfnIdValue\)/,
  "The scanner Shop route must depend on the backend-confirmed public Shop response."
);
requirePattern(
  "publicPaper",
  /publicOpportunityShopPath[\s\S]*?Visit public shop[\s\S]*?audience="public"[\s\S]*?Check permitted evidence/,
  "The public card must explain its controlled gateway and expose only the approved Shop path."
);

if (findings.length) {
  console.error("Identity opportunity gateway audit failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Identity opportunity gateway audit passed: owner routes are connected and public Shop access is visibility-gated."
);
