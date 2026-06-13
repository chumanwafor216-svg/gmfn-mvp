/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(frontendRoot, "..");

const files = [
  "frontend/src/pages/JoinEntryPage.tsx",
  "gmfn_backend/app/api/routes/analytics_liquidity.py",
  "gmfn_backend/app/api/routes/auth.py",
  "gmfn_backend/app/api/routes/cci.py",
  "gmfn_backend/app/api/routes/clans.py",
  "gmfn_backend/app/api/routes/courier_confirm.py",
  "gmfn_backend/app/api/routes/loans_bulk.py",
  "gmfn_backend/app/api/routes/marketplace.py",
  "gmfn_backend/app/api/routes/merchant_risk.py",
  "gmfn_backend/app/api/routes/reports.py",
  "gmfn_backend/app/api/routes/share.py",
  "gmfn_backend/app/api/routes/trust_evidence_pack.py",
  "gmfn_backend/app/api/routes/trust_score.py",
  "gmfn_backend/app/api/routes/trust_slips_verify_ui.py",
  "gmfn_backend/app/core/clan_auth.py",
  "gmfn_backend/app/routers/clans.py",
  "gmfn_backend/app/services/clans_service.py",
  "gmfn_backend/app/services/identity_service.py",
  "gmfn_backend/app/services/invites_service.py",
  "gmfn_backend/app/services/marketplace_service.py",
];

const forbidden = [
  "Clan admin only",
  "Clan admin role required",
  "Clan access required",
  "Clan not found",
  "Clan name already exists",
  "Already a member of this clan",
  "You are not a member of this clan",
  "User is not a member of this clan",
  "You are not an active member of this clan",
  "User is not an active member of this clan",
  "A GMFN member",
  "GMFN member",
  "GMFN account",
  "GMFN Loan Audit",
  "GMFN Verification",
  "GMFN does not guarantee",
  "GMFN is non-custodial",
  "Clan admin or platform admin only",
  "GMFN_EvidencePack",
  "No custodial funds are held by GMFN",
  "Clan liquidity index",
  "Dev Clan",
];

const required = [
  ["gmfn_backend/app/api/routes/clans.py", "Community admin only"],
  ["gmfn_backend/app/api/routes/clans.py", "Community not found"],
  ["gmfn_backend/app/api/routes/clans.py", "A GSN member"],
  ["gmfn_backend/app/api/routes/clans.py", "You can now activate your GSN account."],
  ["gmfn_backend/app/core/clan_auth.py", "Community admin role required"],
  ["gmfn_backend/app/api/routes/share.py", "GSN Loan Audit"],
  ["gmfn_backend/app/api/routes/courier_confirm.py", "GSN does not guarantee courier performance."],
  ["gmfn_backend/app/api/routes/merchant_risk.py", "GSN is non-custodial"],
  ["gmfn_backend/app/api/routes/reports.py", "Community admin or platform admin only"],
  ["gmfn_backend/app/api/routes/trust_evidence_pack.py", "GSN-EvidencePack-"],
  ["gmfn_backend/app/api/routes/trust_score.py", "community-scoped using X-Clan-Id"],
  ["gmfn_backend/app/api/routes/trust_slips_verify_ui.py", "GSN Verification"],
  ["gmfn_backend/app/api/routes/trust_slips_verify_ui.py", "GSN does not guarantee delivery performance."],
  ["gmfn_backend/app/api/routes/analytics_liquidity.py", "No custodial funds are held by GSN"],
  ["frontend/src/pages/JoinEntryPage.tsx", "GSN member"],
];

const findings = [];

function read(relativePath) {
  return readFileSync(join(repoRoot, relativePath), "utf8");
}

for (const file of files) {
  const text = read(file);
  for (const phrase of forbidden) {
    if (text.includes(phrase)) {
      findings.push(`${file}: forbidden visible phrase "${phrase}"`);
    }
  }
}

for (const [file, phrase] of required) {
  const text = read(file);
  if (!text.includes(phrase)) {
    findings.push(`${file}: expected visible phrase "${phrase}"`);
  }
}

if (findings.length) {
  console.error("GSN visible language audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("GSN visible language audit passed.");
