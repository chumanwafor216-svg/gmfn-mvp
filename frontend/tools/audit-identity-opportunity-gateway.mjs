/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = {
  component: "src/components/IdentityOpportunityGateway.tsx",
  app: "src/App.tsx",
  identity: "src/pages/IdentityIntegrityPage.tsx",
  profile: "src/pages/MyGMFNAndIPage.tsx",
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

function forbidPattern(key, pattern, message) {
  if (!pattern.test(source[key])) return;
  findings.push(`${files[key]}: ${message}`);
}

requirePattern(
  "component",
  /function OpportunityAction[\s\S]*?<StableCtaLink[\s\S]*?data-gsn-identity-opportunity-gateway=\{audience\}[\s\S]*?GSN Opportunity Gateway[\s\S]*?data-gsn-identity-opportunity-secondary="covered"/,
  "The shared gateway must keep one visible action and cover secondary routes."
);
requirePattern(
  "identity",
  /\{cardOnlyMode \? landscapeIdentityCard : null\}/,
  "The authenticated card-only surface must render only the shareable ID card."
);
forbidPattern(
  "identity",
  /IdentityOpportunityGateway|identity-integrity\.opportunity\.|ownerOpportunityActions|Manage my shop|Explore my community marketplace|Ask my community/,
  "The shareable authenticated ID must not duplicate private account, Shop Control, Marketplace, Demand Box, or community navigation."
);
requirePattern(
  "app",
  /<Route path="\/id\/:gmfnId" element=\{<TrustSlipVerifyPage \/>\} \/>[\s\S]*?<Route path="\/id\/:gmfnId\/profile" element=\{<TrustSlipVerifyPage \/>\} \/>/,
  "The public route table must provide stable card and profile variants that do not depend on TrustSlip issuance."
);
requirePattern(
  "profile",
  /id="public-professional-profile"[\s\S]*?data-my-gsn-public-professional-profile="opt-in"[\s\S]*?publicProfessionalProfileEnabled[\s\S]*?Show this profile from my shared GSN ID[\s\S]*?my-gmfn\.public-professional-profile\.save/,
  "Public professional details must be explicit opt-in account data."
);
requirePattern(
  "verify",
  /\(!requestedGsnId && record\?\.merchant_verify_active !== true\)[\s\S]*?getPublicMarketplaceShopByGmfnId\(gmfnIdValue,[\s\S]*?response\?\.is_public_shop_face === true[\s\S]*?publicShopPath\(gmfnIdValue\)/,
  "The scanner Shop route must use the backend privacy-controlled public Shop response; legacy TrustSlip cards keep their merchant-verification gate."
);
requirePattern(
  "publicPaper",
  /Check this TrustSlip[\s\S]*?\.\.\.\(publicProfilePath\s*\?[\s\S]*?Personal profile[\s\S]*?publicOpportunityShopPath[\s\S]*?Shop & verification[\s\S]*?audience="public"[\s\S]*?Verify identity evidence/,
  "The public card must expose TrustSlip verification, the privacy-safe personal profile route, and a public Shop with a current verification path."
);
forbidPattern(
  "publicPaper",
  /publicProfilePath\s*&&\s*publicProfessionalProfileEnabled/,
  "The personal profile action must remain visible; unpublished profiles are handled safely by the profile route."
);
requirePattern(
  "publicPaper",
  /data-gsn-public-professional-profile="not-published"[\s\S]*?No public profile published[\s\S]*?data-gsn-public-professional-profile="minimal"[\s\S]*?Phone, email, named communities, private evidence, and exact location stay hidden/,
  "The public profile route must fail closed and keep personal contact, named communities, exact location, and private evidence hidden."
);

if (findings.length) {
  console.error("Identity opportunity gateway audit failed:");
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exit(1);
}

console.log(
  "Identity opportunity gateway audit passed: the owner card stays focused and public identity opportunities are consent- and verification-gated."
);
