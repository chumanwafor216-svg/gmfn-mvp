/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const appRoutesPath = join(frontendRoot, "src", "lib", "appRoutes.ts");
const visualSweepPath = join(frontendRoot, "tools", "audit-mobile-visual-sweep.mjs");

function readText(path) {
  return readFileSync(path, "utf8");
}

function extractAppRoutes(source) {
  const blockMatch = source.match(/export const APP_ROUTES = \{([\s\S]*?)\} as const;/);
  if (!blockMatch) throw new Error("Could not find APP_ROUTES block.");

  const routes = new Map();
  const routePattern = /^\s*([A-Z0-9_]+):\s*"([^"]+)",/gm;
  let match;
  while ((match = routePattern.exec(blockMatch[1]))) {
    routes.set(match[1], match[2]);
  }
  return routes;
}

function extractVisualRoutes(source) {
  const blockMatch = source.match(/const routes = \[([\s\S]*?)\];/);
  if (!blockMatch) throw new Error("Could not find mobile visual sweep route list.");

  const routes = [];
  const routePattern = /"([^"]+)"/g;
  let match;
  while ((match = routePattern.exec(blockMatch[1]))) {
    routes.push(match[1]);
  }
  return routes;
}

function routePathOnly(route) {
  return route.split(/[?#]/)[0];
}

function isCovered(expectedRoute, visualRoutes) {
  if (expectedRoute.includes("?") || expectedRoute.includes("#")) {
    return visualRoutes.includes(expectedRoute);
  }

  return visualRoutes.some((route) => routePathOnly(route) === expectedRoute);
}

const appRoutes = extractAppRoutes(readText(appRoutesPath));
const visualRoutes = extractVisualRoutes(readText(visualSweepPath));

const expectedByKey = new Map(appRoutes);
expectedByKey.set("COMMUNITY_DETAIL", "/app/community/1");
expectedByKey.set("COMMUNITY_JOIN_REQUESTS", "/app/community/1/join-requests");
expectedByKey.set("LOAN_SUMMARY", "/app/loan-summary/1");
expectedByKey.set("REPAYMENT", "/app/payment/loans/1");
expectedByKey.set("JOIN_PENDING", "/pending-approval?request_id=8");

const missing = [];
for (const [key, expectedRoute] of expectedByKey.entries()) {
  if (!isCovered(expectedRoute, visualRoutes)) {
    missing.push(`${key}: ${expectedRoute}`);
  }
}

const duplicates = visualRoutes.filter((route, index, list) => list.indexOf(route) !== index);

if (missing.length > 0 || duplicates.length > 0) {
  console.error("Mobile visual route coverage audit failed:");
  if (missing.length > 0) {
    console.error("Missing APP_ROUTES coverage:");
    for (const item of missing) console.error(`- ${item}`);
  }
  if (duplicates.length > 0) {
    console.error("Duplicate sweep paths to review:");
    for (const item of Array.from(new Set(duplicates))) console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log(`Mobile visual route coverage audit passed: ${expectedByKey.size} app route keys are represented in the phone visual sweep.`);