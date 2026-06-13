#!/usr/bin/env node

/* global console, fetch, process, setTimeout */

const DEFAULT_API_URL = "https://gmfn-api.onrender.com";

const requiredPaths = [
  "/entry/signed-in/phone/start",
  "/entry/signed-in/phone/confirm",
  "/entry/signed-in/official-id/record",
  "/entry/signed-in/identity-photo/record",
  "/withdrawal-destinations/me",
  "/trust-slips/me",
];

const requiredWithdrawalFields = ["sort_code", "bank_sort_code"];
const DEFAULT_COMMUNITY_KEY = "GSN-C-000001";
const protectedCommunityVerificationTerms = [
  "hidden_by_design",
  "full member list",
  "raw member phone numbers",
  "member phone numbers",
  "sponsor details",
  "internal disputes",
  "private relay contacts",
  "internal trust history",
];

function argValue(name, fallback) {
  const direct = process.argv.find((arg) => arg.startsWith(`${name}=`));
  if (direct) return direct.slice(name.length + 1);

  const index = process.argv.indexOf(name);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];

  return fallback;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(apiUrl, path) {
  const base = String(apiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
  const res = await fetch(`${base}${path}`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`${path} returned HTTP ${res.status}`);
  }

  return res.json();
}

async function fetchOpenApi(apiUrl) {
  return fetchJson(apiUrl, "/openapi.json");
}

function schemaHasWithdrawalFields(openapi) {
  const schema =
    openapi?.components?.schemas?.WithdrawalDestinationIn?.properties || {};

  return requiredWithdrawalFields.filter((field) => !Object.prototype.hasOwnProperty.call(schema, field));
}

function missingIdentityContracts(openapi) {
  const paths = openapi?.paths || {};
  const missingPaths = requiredPaths.filter((path) => !paths[path]);
  const missingWithdrawalFields = schemaHasWithdrawalFields(openapi);

  return { missingPaths, missingWithdrawalFields };
}

async function exposedPublicCommunityVerificationTerms(apiUrl, communityKey) {
  const encodedKey = encodeURIComponent(communityKey || DEFAULT_COMMUNITY_KEY);
  const payload = await fetchJson(apiUrl, `/verify/community/${encodedKey}`);
  const serialized = JSON.stringify(payload).toLowerCase();

  return protectedCommunityVerificationTerms.filter((term) =>
    serialized.includes(term)
  );
}

async function main() {
  const apiUrl = argValue("--url", process.env.GMFN_LIVE_API_URL || DEFAULT_API_URL);
  const communityKey = argValue(
    "--community-key",
    process.env.GMFN_LIVE_COMMUNITY_VERIFY_KEY || DEFAULT_COMMUNITY_KEY
  );
  const attempts = Math.max(1, Number(argValue("--attempts", "1")) || 1);
  const delayMs = Math.max(0, Number(argValue("--delay-ms", "15000")) || 0);

  let lastFailure = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const openapi = await fetchOpenApi(apiUrl);
      const { missingPaths, missingWithdrawalFields } = missingIdentityContracts(openapi);
      const exposedCommunityTerms =
        await exposedPublicCommunityVerificationTerms(apiUrl, communityKey);

      if (
        !missingPaths.length &&
        !missingWithdrawalFields.length &&
        !exposedCommunityTerms.length
      ) {
        console.log(
          `Live API identity and public verification contracts are present on ${apiUrl} after attempt ${attempt}/${attempts}.`
        );
        return;
      }

      lastFailure = [
        missingPaths.length ? `missing paths: ${missingPaths.join(", ")}` : "",
        missingWithdrawalFields.length
          ? `WithdrawalDestinationIn missing fields: ${missingWithdrawalFields.join(", ")}`
          : "",
        exposedCommunityTerms.length
          ? `public community verification exposes protected terms: ${exposedCommunityTerms.join(", ")}`
          : "",
      ]
        .filter(Boolean)
        .join("; ");
    } catch (err) {
      lastFailure = err instanceof Error ? err.message : String(err);
    }

    if (attempt < attempts) {
      console.log(
        `Live API identity contract check ${attempt}/${attempts} not ready: ${lastFailure}`
      );
      await sleep(delayMs);
    }
  }

  console.error(
    `Live API identity/public verification contracts are not ready on ${apiUrl}: ${lastFailure}`
  );
  process.exit(1);
}

main();
