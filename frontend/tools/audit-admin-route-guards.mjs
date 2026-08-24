/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appFile = "src/App.tsx";
const requireAuthFile = "src/components/RequireAuth.tsx";
const appSource = readFileSync(join(frontendRoot, appFile), "utf8");
const requireAuthSource = readFileSync(join(frontendRoot, requireAuthFile), "utf8");
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

if (findings.length) {
  console.error("Admin route guard audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} ${finding.message}`);
    if (finding.text) console.error(`  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Admin route guard audit passed.");
