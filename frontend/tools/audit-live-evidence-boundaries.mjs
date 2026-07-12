#!/usr/bin/env node

/* global AbortController, clearTimeout, console, fetch, process, setTimeout */

const REQUIRED_BASE_ENV = "GSN_LIVE_EVIDENCE_BASE_URL";
const TRUSTSLIP_CODE_ENV = "GSN_LIVE_TRUSTSLIP_CODE";
const COMMUNITY_KEY_ENV = "GSN_LIVE_COMMUNITY_KEY";
const COMMUNITY_MEMBER_KEY_ENV = "GSN_LIVE_COMMUNITY_MEMBER_KEY";
const CONFIRMATION_TOKEN_ENV = "GSN_LIVE_CONFIRMATION_TOKEN";
const AUTH_ENV = "GSN_LIVE_AUTH_TOKEN";
const TIMEOUT_MS = 20000;

const publicForbiddenKeys = [
  "access_token",
  "authorization",
  "password",
  "refresh_token",
  "private_contact",
  "private_contacts",
  "private_phone",
  "private_email",
  "raw_member_phone_numbers",
  "review_evidence",
  "admin_notes",
  "storage_key",
  "file_path",
  "bank_account",
  "account_number",
  "sort_code",
  "routing_number",
  "risk_flags",
];

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

function makeUrl(baseUrl, path) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

function printUsage() {
  console.log(
    [
      "Live evidence boundary harness is opt-in.",
      "",
      "Required before live requests:",
      `- ${REQUIRED_BASE_ENV}=https://your-api.example.com`,
      "",
      "Optional public fixtures:",
      `- ${TRUSTSLIP_CODE_ENV}=...`,
      `- ${COMMUNITY_KEY_ENV}=...`,
      `- ${COMMUNITY_MEMBER_KEY_ENV}=... (requires community key)`,
      `- ${CONFIRMATION_TOKEN_ENV}=...`,
      "",
      "Optional private fixtures:",
      `- ${AUTH_ENV}=...`,
      "",
      "Optional args:",
      "- --trustslip-code CODE",
      "- --community-key KEY",
      "- --member-key KEY",
      "- --confirmation-token TOKEN",
      "- --auth-token TOKEN",
      "- --dry-run",
      "",
      "This harness proves only the supplied live/staging fixtures.",
    ].join("\n")
  );
}

function collectKeys(value, keys = new Set()) {
  if (!value || typeof value !== "object") return keys;
  if (Array.isArray(value)) {
    value.forEach((item) => collectKeys(item, keys));
    return keys;
  }

  Object.entries(value).forEach(([key, child]) => {
    keys.add(String(key).toLowerCase());
    collectKeys(child, keys);
  });
  return keys;
}

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: { accept: "application/json", ...headers },
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

function assertNoForbiddenPublicKeys(label, body) {
  const keys = collectKeys(body);
  const exposed = publicForbiddenKeys.filter((key) => keys.has(key));
  if (exposed.length > 0) {
    throw new Error(`${label} exposed forbidden public keys: ${exposed.join(", ")}`);
  }
}

async function checkPublicJson(baseUrl, label, path) {
  const { response, body } = await fetchJson(makeUrl(baseUrl, path));
  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }
  assertNoForbiddenPublicKeys(label, body);
  console.log(`${label} passed: public JSON returned HTTP ${response.status} and no forbidden public keys.`);
}

async function checkPrivateRequiresAuth(baseUrl, label, path, authToken) {
  const anonymous = await fetchJson(makeUrl(baseUrl, path));
  if (![401, 403].includes(anonymous.response.status)) {
    throw new Error(
      `${label} anonymous request returned HTTP ${anonymous.response.status}; expected 401 or 403.`
    );
  }

  if (!authToken) {
    console.log(`${label} anonymous rejection passed; authenticated read skipped because ${AUTH_ENV} is not set.`);
    return;
  }

  const authenticated = await fetchJson(makeUrl(baseUrl, path), {
    Authorization: `Bearer ${authToken}`,
  });
  if (!authenticated.response.ok) {
    throw new Error(`${label} authenticated request returned HTTP ${authenticated.response.status}`);
  }
  console.log(`${label} passed: anonymous request rejected and authenticated request returned HTTP ${authenticated.response.status}.`);
}

async function main() {
  if (hasFlag("--dry-run") || hasFlag("--help")) {
    printUsage();
    return;
  }

  const baseUrl = normalizeBaseUrl(
    argValue("--base-url", process.env[REQUIRED_BASE_ENV] || "")
  );
  const trustSlipCode = argValue(
    "--trustslip-code",
    process.env[TRUSTSLIP_CODE_ENV] || ""
  );
  const communityKey = argValue(
    "--community-key",
    process.env[COMMUNITY_KEY_ENV] || ""
  );
  const memberKey = argValue(
    "--member-key",
    process.env[COMMUNITY_MEMBER_KEY_ENV] || ""
  );
  const confirmationToken = argValue(
    "--confirmation-token",
    process.env[CONFIRMATION_TOKEN_ENV] || ""
  );
  const authToken = argValue("--auth-token", process.env[AUTH_ENV] || "");

  if (!baseUrl) {
    printUsage();
    console.error(`Missing required ${REQUIRED_BASE_ENV}. Refusing to make live requests.`);
    process.exit(1);
  }

  const checks = [];
  if (trustSlipCode) {
    checks.push(() =>
      checkPublicJson(
        baseUrl,
        "Public TrustSlip Verify live boundary",
        `/trust-slips/verify/${encodeURIComponent(trustSlipCode)}`
      )
    );
  }
  if (communityKey) {
    checks.push(() =>
      checkPublicJson(
        baseUrl,
        "Public Community Verify live boundary",
        `/verify/community/${encodeURIComponent(communityKey)}`
      )
    );
  }
  if (communityKey && memberKey) {
    checks.push(() =>
      checkPublicJson(
        baseUrl,
        "Public Community Member Credential live boundary",
        `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(memberKey)}`
      )
    );
  }
  if (confirmationToken) {
    checks.push(() =>
      checkPublicJson(
        baseUrl,
        "Public Community Confirmation Outcome live boundary",
        `/community-confirmations/public/${encodeURIComponent(confirmationToken)}`
      )
    );
  }
  checks.push(() =>
    checkPrivateRequiresAuth(
      baseUrl,
      "Signed-in Trust Timeline live boundary",
      "/trust/me/timeline",
      authToken
    )
  );

  if (!trustSlipCode && !communityKey && !confirmationToken && !authToken) {
    printUsage();
    console.error(
      "No live evidence fixture was supplied. Refusing to claim live evidence proof."
    );
    process.exit(1);
  }

  for (const check of checks) {
    await check();
  }

  console.log(
    "Live evidence boundary harness passed for the supplied fixtures. This proves only those fixtures on the configured base URL."
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
