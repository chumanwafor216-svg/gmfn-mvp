/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appFile = "src/App.tsx";
const requireAuthFile = "src/components/RequireAuth.tsx";
const adminPageFile = "src/pages/AdminCommunityOwnershipPage.tsx";
const apiFile = "src/lib/api.ts";
const backendAdminFile = "../gmfn_backend/app/api/routes/admin.py";
const clanAuthFile = "../gmfn_backend/app/core/clan_auth.py";
const appSource = readFileSync(join(frontendRoot, appFile), "utf8");
const requireAuthSource = readFileSync(join(frontendRoot, requireAuthFile), "utf8");
const adminPageSource = readFileSync(join(frontendRoot, adminPageFile), "utf8");
const apiSource = readFileSync(join(frontendRoot, apiFile), "utf8");
const backendAdminSource = readFileSync(join(frontendRoot, backendAdminFile), "utf8");
const clanAuthSource = readFileSync(join(frontendRoot, clanAuthFile), "utf8");
const findings = [];

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function fail(file, source, index, message, text = "") {
  findings.push({
    file,
    line: index >= 0 ? lineAt(source, index) : 1,
    message,
    text,
  });
}

function assertContains(file, source, pattern, message, text = "Expected route guard pattern was not found.") {
  if (pattern.test(source)) return;
  fail(file, source, -1, message, text);
}

const commandRouteStart = appSource.indexOf('path="command-center"');
const legacyRouteStart = appSource.indexOf('path="trust-command-centre"');
const commandRouteBlock =
  commandRouteStart >= 0 && legacyRouteStart > commandRouteStart
    ? appSource.slice(commandRouteStart, legacyRouteStart)
    : "";

if (!commandRouteBlock) {
  fail(appFile, appSource, commandRouteStart, "Command Center route block could not be isolated for admin guard auditing.");
}

assertContains(
  appFile,
  commandRouteBlock,
  /<RequireAuth requireRole="adminOrClanAdmin">[\s\S]*?<Outlet \/>[\s\S]*?<Route index element=\{<TrustCommandCentrePage \/>\}/,
  "Command Center must stay behind verified platform-admin or current-community-admin context."
);

assertContains(
  appFile,
  commandRouteBlock,
  /<RequireAuth requireRole="admin">[\s\S]*?<Outlet \/>[\s\S]*?<Route path="trust-analytics" element=\{<TrustAnalyticsPage \/>\}/,
  "Sensitive Command Center routes must stay behind verified platform-admin context."
);

for (const routePath of [
  "trust-analytics",
  "trust-events",
  "identity-risk",
  "community-ownership",
  "incomplete-loans",
  "support",
  "system-operations",
  "trust-graph",
]) {
  const pattern = new RegExp(`path="${routePath}" element=\\{<[^>]+ \\/>\\}`);
  if (!pattern.test(commandRouteBlock)) {
    fail(appFile, appSource, commandRouteStart, `Sensitive admin route '${routePath}' is missing from the protected Command Center group.`);
  }
}

for (const legacyPath of [
  "admin/exposure",
  "admin/trust-events",
  "admin/identity-risk",
  "admin/community-ownership",
  "admin/incomplete-loans",
  "admin/support",
  "admin/revenue-allocation",
  "admin/bank-console",
  "admin/payment-rails",
  "admin/trust-graph",
]) {
  const legacyIndex = appSource.indexOf(`path="${legacyPath}"`);
  if (legacyIndex < 0) {
    fail(appFile, appSource, -1, `Legacy /app/${legacyPath} redirect is missing; remove it intentionally and update this audit.`);
    continue;
  }
  const routeSnippet = appSource.slice(legacyIndex, legacyIndex + 260);
  if (!/to="\/app\/command-center/.test(routeSnippet)) {
    fail(
      appFile,
      appSource,
      legacyIndex,
      `Legacy /app/${legacyPath} must redirect into the protected Command Center tree.`,
      routeSnippet.replace(/\s+/g, " ").slice(0, 220)
    );
  }
}

assertContains(
  requireAuthFile,
  requireAuthSource,
  /if \(requireRole === "admin" && !hasAdminAccess\(me\)\) \{[\s\S]*?finish\(false, true\)/,
  "RequireAuth must deny admin-only routes unless the live /me response proves platform-admin access."
);

assertContains(
  requireAuthFile,
  requireAuthSource,
  /requireRole === "adminOrClanAdmin"[\s\S]*?!hasAdminAccess\(me\)[\s\S]*?!hasClanAdminAccess\(currentClan\)[\s\S]*?finish\(false, true\)/,
  "RequireAuth must deny Command Center routes unless live /me or current community proves admin access."
);

if (/cachedRoleAllows|readCachedRole/.test(requireAuthSource)) {
  fail(
    requireAuthFile,
    requireAuthSource,
    requireAuthSource.search(/cachedRoleAllows|readCachedRole/),
    "Role-protected routes must not use cached localStorage role fallback."
  );
}

assertContains(
  apiFile,
  apiSource,
  /postAdminCommunityLifecycle[\s\S]*?\/admin\/community-lifecycle/,
  "Admin Community Ownership page must keep its ordinary-community lifecycle API wrapper."
);

assertContains(
  backendAdminFile,
  backendAdminSource,
  /@router\.post\("\/community-lifecycle"\)[\s\S]*?community\.lifecycle_changed/,
  "Backend admin route must record ordinary-community lifecycle changes with a trust event."
);

assertContains(
  clanAuthFile,
  clanAuthSource,
  /Clan\.status == "active"/,
  "Normal user community lists must hide dormant or closed ordinary communities."
);

assertContains(
  adminPageFile,
  adminPageSource,
  /Community lifecycle[\s\S]*?Preview community lifecycle[\s\S]*?Record community lifecycle/,
  "Admin Community Ownership page must expose the ordinary-community lifecycle preview and record controls."
);

assertContains(
  adminPageFile,
  adminPageSource,
  /does not delete[\s\S]*?remove members[\s\S]*?transfer ownership/,
  "Ordinary-community lifecycle UI must keep the no-delete/no-member-removal/no-transfer boundary visible."
);

assertContains(
  apiFile,
  apiSource,
  /postAdminCommunityStewardSetup[\s\S]*?\/admin\/community-steward-setup/,
  "Admin Community Ownership page must keep its community steward setup API wrapper."
);

assertContains(
  backendAdminFile,
  backendAdminSource,
  /@router\.post\("\/community-steward-setup"\)[\s\S]*?community\.steward_setup_prepared/,
  "Backend admin route must record steward setup preparation with a trust event."
);

assertContains(
  backendAdminFile,
  backendAdminSource,
  /will_activate_steward_setup[\s\S]*?released_steward_setup/,
  "Owner repair must explicitly release steward setup communities only after proof-confirmed reconciliation."
);

assertContains(
  adminPageFile,
  adminPageSource,
  /Steward setup[\s\S]*?Preview steward setup[\s\S]*?Record steward setup/,
  "Admin Community Ownership page must expose steward setup preview and record controls."
);

assertContains(
  adminPageFile,
  adminPageSource,
  /does not claim verified ownership[\s\S]*?owner proof is still required/,
  "Steward setup UI must keep the no-verified-owner and owner-proof-required boundary visible."
);
if (findings.length) {
  console.error("Admin route guard audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    if (finding.text) console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Admin route guard audit passed.");
