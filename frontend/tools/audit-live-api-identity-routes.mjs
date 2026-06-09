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

async function fetchOpenApi(apiUrl) {
  const base = String(apiUrl || DEFAULT_API_URL).replace(/\/+$/, "");
  const res = await fetch(`${base}/openapi.json`, {
    cache: "no-store",
    headers: { accept: "application/json" },
  });

  if (!res.ok) {
    throw new Error(`OpenAPI returned HTTP ${res.status}`);
  }

  return res.json();
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

async function main() {
  const apiUrl = argValue("--url", process.env.GMFN_LIVE_API_URL || DEFAULT_API_URL);
  const attempts = Math.max(1, Number(argValue("--attempts", "1")) || 1);
  const delayMs = Math.max(0, Number(argValue("--delay-ms", "15000")) || 0);

  let lastFailure = "";

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const openapi = await fetchOpenApi(apiUrl);
      const { missingPaths, missingWithdrawalFields } = missingIdentityContracts(openapi);

      if (!missingPaths.length && !missingWithdrawalFields.length) {
        console.log(
          `Live API identity contracts are present on ${apiUrl} after attempt ${attempt}/${attempts}.`
        );
        return;
      }

      lastFailure = [
        missingPaths.length ? `missing paths: ${missingPaths.join(", ")}` : "",
        missingWithdrawalFields.length
          ? `WithdrawalDestinationIn missing fields: ${missingWithdrawalFields.join(", ")}`
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
    `Live API identity contracts are not ready on ${apiUrl}: ${lastFailure}`
  );
  process.exit(1);
}

main();
