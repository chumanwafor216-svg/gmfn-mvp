#!/usr/bin/env node

/* global AbortController, clearTimeout, console, fetch, process, setTimeout */

const DEFAULT_API_URL = "https://gmfn-api.onrender.com";
const BASE_ENV = "GSN_LIVE_WEB_PUSH_BASE_URL";
const AUTH_ENV = "GSN_LIVE_AUTH_TOKEN";
const TIMEOUT_MS = 20000;

function argValue(name, fallback = "") {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];

  return fallback;
}

function hasFlag(name) {
  return process.argv.includes(name);
}

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function printUsage() {
  console.log(
    [
      "Live Web Push status audit is opt-in.",
      "",
      "Required before authenticated live status proof:",
      `- ${AUTH_ENV}=...`,
      "",
      "Optional:",
      `- ${BASE_ENV}=https://gmfn-api.onrender.com`,
      "- --base-url URL",
      "- --auth-token TOKEN",
      "- --allow-not-configured",
      "- --dry-run",
      "",
      "This audit does not create a push subscription or send a notification.",
      "It proves only that the live authenticated status endpoint is configured.",
    ].join("\n")
  );
}

async function fetchStatus(baseUrl, authToken) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl}/web-push/status`, {
      cache: "no-store",
      headers: {
        accept: "application/json",
        authorization: `Bearer ${authToken}`,
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { non_json_body_preview: text.slice(0, 120) };
    }
    return { response, body };
  } finally {
    clearTimeout(timeout);
  }
}

function assertStatusShape(body) {
  if (!body || typeof body !== "object") {
    throw new Error("/web-push/status returned a non-object body.");
  }
  if (body.ok !== true) {
    throw new Error("/web-push/status did not report ok=true.");
  }
  if (body.supported !== true) {
    throw new Error("/web-push/status did not report supported=true.");
  }
  if (typeof body.configured !== "boolean") {
    throw new Error("/web-push/status did not include configured boolean.");
  }
  if (!Array.isArray(body.allowed_kinds)) {
    throw new Error("/web-push/status did not include allowed_kinds array.");
  }
  const missingKinds = [
    "community.notice.posted",
    "community_domain.notice.posted",
  ].filter((kind) => !body.allowed_kinds.includes(kind));
  if (missingKinds.length) {
    throw new Error(
      `/web-push/status missing allowed push kinds: ${missingKinds.join(", ")}.`
    );
  }
}

async function main() {
  if (hasFlag("--dry-run") || hasFlag("--help")) {
    printUsage();
    return;
  }

  const baseUrl = normalizeBaseUrl(
    argValue("--base-url", process.env[BASE_ENV] || DEFAULT_API_URL)
  );
  const authToken = String(
    argValue("--auth-token", process.env[AUTH_ENV] || "")
  ).trim();
  const allowNotConfigured = hasFlag("--allow-not-configured");

  if (!authToken) {
    printUsage();
    console.error(`Missing required ${AUTH_ENV}. Refusing to claim live Web Push status proof.`);
    process.exit(1);
  }

  const { response, body } = await fetchStatus(baseUrl, authToken);
  if (!response.ok) {
    throw new Error(`/web-push/status returned HTTP ${response.status}.`);
  }

  assertStatusShape(body);

  if (!body.configured && !allowNotConfigured) {
    throw new Error(
      "/web-push/status returned configured=false. Render routes are live, but phone push is not production-configured."
    );
  }

  const activeSubscriptions =
    typeof body.active_subscriptions === "number"
      ? body.active_subscriptions
      : "unknown";

  console.log(
    [
      `Live Web Push status audit passed on ${baseUrl}.`,
      `configured=${body.configured}`,
      `sender_available=${body.sender_available === true}`,
      `active_subscriptions=${activeSubscriptions}`,
      `allowed_kinds=${body.allowed_kinds.join(", ")}`,
    ].join("\n")
  );
}

main().catch((error) => {
  console.error("Live Web Push status audit failed:");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
