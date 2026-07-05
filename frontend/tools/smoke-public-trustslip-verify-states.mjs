/* global console, process, URL, localStorage */

import { chromium, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const profileImageDataUrl =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

const scenarios = {
  current: {
    code: "TS-CURRENT-BOUNDARY",
    status: "active",
    valid: true,
    verified: true,
    is_current: true,
    expires_at: "2035-07-05T12:00:00.000Z",
    visibility_level: "standard",
    expectedStatusText: "VALID NOW",
    expectedReadingTitle: "Current public slip",
    expectedText: ["Open member credential", "Live check available"],
  },
  minimal: {
    code: "TS-MINIMAL-BOUNDARY",
    status: "active",
    valid: true,
    verified: true,
    is_current: true,
    expires_at: "2035-07-05T12:00:00.000Z",
    visibility_level: "minimal",
    expectedStatusText: "VALID NOW",
    expectedReadingTitle: "Current public slip",
    absentText: ["Open member credential"],
  },
  expired: {
    code: "TS-EXPIRED-BOUNDARY",
    status: "expired",
    valid: false,
    verified: false,
    is_current: false,
    expires_at: "2020-01-01T00:00:00.000Z",
    visibility_level: "standard",
    expectedStatusText: "Needs fresh TrustSlip",
    expectedReadingTitle: "Do not rely on this alone",
  },
  merchantInactive: {
    code: "TS-MERCHANT-INACTIVE-BOUNDARY",
    status: "merchant_verify_inactive",
    verification_status: "merchant_verify_inactive",
    valid: true,
    verified: true,
    is_current: true,
    expires_at: "2035-07-05T12:00:00.000Z",
    visibility_level: "standard",
    expectedStatusText: "Valid now",
    expectedReadingTitle: "Do not rely on this alone",
    expectedText: ["Inactive"],
  },
  lowDataMissingWindow: {
    code: "TS-LOW-DATA-BOUNDARY",
    status: "active",
    valid: true,
    verified: true,
    is_current: true,
    expires_at: "",
    visibility_level: "standard",
    open_trust_score: 0,
    cci_score: 0,
    trust_band: "",
    band: "",
    issued_at: "",
    noSnapshotOrEvents: true,
    expectedStatusText: "VALID NOW",
    expectedReadingTitle: "Current public slip",
    expectedText: [
      "Use this as an early identity and community signal only. Ask for recent events or live community confirmation before a serious decision.",
      "Not stated issued",
      "Not stated expires",
    ],
  },
  noCommunityRelay: {
    code: "TS-NO-RELAY-BOUNDARY",
    status: "active",
    valid: true,
    verified: true,
    is_current: true,
    expires_at: "2035-07-05T12:00:00.000Z",
    visibility_level: "standard",
    relayAvailable: false,
    expectedStatusText: "VALID NOW",
    expectedReadingTitle: "Current public slip",
    expectedText: [
      "Live check not available",
      "Community confirmation is not available for this TrustSlip yet.",
    ],
  },
  revoked: {
    code: "TS-REVOKED-BOUNDARY",
    status: "revoked",
    valid: false,
    verified: false,
    is_current: false,
    expires_at: "2035-07-05T12:00:00.000Z",
    visibility_level: "standard",
    expectedStatusText: "Needs fresh TrustSlip",
    expectedReadingTitle: "Do not rely on this alone",
  },
  frozen: {
    code: "TS-FROZEN-BOUNDARY",
    status: "frozen",
    verification_status: "frozen",
    valid: false,
    verified: false,
    is_current: false,
    expires_at: "2035-07-05T12:00:00.000Z",
    visibility_level: "standard",
    expectedStatusText: "Needs fresh TrustSlip",
    expectedReadingTitle: "Do not rely on this alone",
  },
};

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return url.pathname;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  return (
    url.host === "127.0.0.1:8012" ||
    url.host === "localhost:8012" ||
    url.pathname.startsWith("/api/")
  );
}

function publicTrustSlipPayload(scenario) {
  const minimal = scenario.visibility_level === "minimal";
  const relayAvailable = scenario.relayAvailable !== false;
  return {
    code: scenario.code,
    token: scenario.code,
    verification_token: scenario.code,
    verification_code: scenario.code,
    status: scenario.status,
    verification_status: scenario.verification_status || scenario.status,
    valid: scenario.valid,
    verified: scenario.verified,
    is_current: scenario.is_current,
    visibility_level: scenario.visibility_level,
    public_verify_url: `/t/${encodeURIComponent(scenario.code)}?level=${scenario.visibility_level}`,
    holder_name: "GSN holder GMFN-U-BOUNDARY",
    display_name: "GSN holder GMFN-U-BOUNDARY",
    gmfn_id: "GMFN-U-BOUNDARY",
    holder_gmfn_id: "GMFN-U-BOUNDARY",
    community_name: "Boundary Community",
    community: "Boundary Community",
    community_code: minimal ? "" : "GMFN-C-BOUNDARY",
    trust_band: scenario.trust_band ?? "A",
    band: scenario.band ?? "A",
    open_trust_score: scenario.open_trust_score ?? 82,
    cci_score: scenario.cci_score ?? 82,
    trust_limit: "100",
    currency: "GBP",
    issued_at: scenario.issued_at ?? "2026-07-05T08:00:00.000Z",
    expires_at: scenario.expires_at,
    merchant_verify_active: scenario.status !== "merchant_verify_inactive",
    snapshot_version: scenario.noSnapshotOrEvents ? null : "public-smoke-snapshot",
    event_count: scenario.noSnapshotOrEvents ? 0 : 4,
    profile_image_url: minimal ? null : profileImageDataUrl,
    identity_context: minimal
      ? {}
      : {
          identity_status_label: "Public identity continuity visible",
          profile_image_url: profileImageDataUrl,
        },
    community_context: minimal
      ? {}
      : {
          community_code: "GMFN-C-BOUNDARY",
          holder_role: "member",
          active_member_count: 12,
          member_witness_count: 3,
          membership_currentness_label: "Current witness evidence",
          membership_currentness_scope:
            "Witness rows are scoped to this community and current window.",
        },
    community_confirmation: minimal
      ? {
          relay_available: relayAvailable,
          plain_language:
            "Community confirmation can be requested without exposing private contacts.",
        }
      : {
          relay_available: relayAvailable,
          instant_pulse_available: relayAvailable,
          active_member_count: 12,
          contactable_reference_count: relayAvailable ? 4 : 0,
          plain_language: relayAvailable
            ? "Community confirmation is available through a controlled public relay."
            : "",
        },
    merchant_view: {
      display_name: "GSN holder GMFN-U-BOUNDARY",
      gmfn_id: "GMFN-U-BOUNDARY",
      visibility_level: scenario.visibility_level,
      band: "A",
      private_contacts: "SHOULD NOT RENDER",
      admin_notes: "SHOULD NOT RENDER",
      bank_account: "SHOULD NOT RENDER",
      risk_flags: ["SHOULD NOT RENDER"],
    },
  };
}

async function installApiMocks(page, requestLog) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (!isApiRequest(url)) {
      await route.continue();
      return;
    }

    const path = apiPathFrom(url);
    const method = request.method().toUpperCase();
    const auth = request.headers().authorization || "";
    const clanId = request.headers()["x-clan-id"] || "";
    requestLog.push({ method, path, authPresent: Boolean(auth), clanPresent: Boolean(clanId) });

    const verifyMatch = path.match(/^\/trust-slips\/verify\/([^/?#]+)/);
    if (method === "GET" && verifyMatch) {
      const code = decodeURIComponent(verifyMatch[1]);
      const scenario = Object.values(scenarios).find((item) => item.code === code);
      if (!scenario) {
        await route.fulfill(json({ detail: "TrustSlip not found" }, 404));
        return;
      }
      await route.fulfill(json(publicTrustSlipPayload(scenario)));
      return;
    }

    await route.fulfill(json({ items: [], total: 0, ok: true }));
  });
}

function publicVerifyRequests(requestLog) {
  return requestLog.filter((entry) => entry.path.includes("/trust-slips/verify/"));
}

async function assertNoPublicPrivateLeaks(page) {
  await expect(page.locator('[data-cta-id="trust-slip-verify.full-evidence-toggle"]')).toHaveCount(0);
  await expect(page.locator('[data-cta-id^="page-top-nav."]')).toHaveCount(0);
  await expect(page.getByText("Private review details")).toHaveCount(0);
  await expect(page.getByText("SHOULD NOT RENDER")).toHaveCount(0);
}

async function assertPublicPaperBasics(page) {
  await expect(page.getByRole("heading", { name: "TrustSlip Verify", exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("This paper confirms", { exact: true })).toHaveCount(1);
  await expect(page.getByText("This paper does not confirm", { exact: true })).toHaveCount(1);
  await expect(page.getByText("Public paper ends here")).toBeVisible();
  await expect(page.getByText("Private review area below")).toBeVisible();
  await expect(page.getByText("Evidence, not approval")).toBeVisible();
  await expect(page.getByText("does not open the holder's private Trust Passport")).toBeVisible();
  await assertNoPublicPrivateLeaks(page);
}

async function runNoCodeScenario(browser, baseURL) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  await installApiMocks(page, requestLog);
  await page.goto(`${baseURL}/verify/trust-slip`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await expect(page.getByText("Verify a TrustSlip code")).toBeVisible({ timeout: 30000 });
  await expect(page.getByLabel("TrustSlip code")).toBeVisible();
  await expect(page.getByText("The code opens the same public TrustSlip Verify paper")).toBeVisible();
  await expect(page.getByRole("heading", { name: "TrustSlip Verify", exact: true })).toHaveCount(0);
  await assertNoPublicPrivateLeaks(page);
  await page.waitForTimeout(400);

  if (requestLog.length > 0) {
    throw new Error(`No-code public route made API calls: ${JSON.stringify(requestLog)}`);
  }

  await context.close();
}

async function runCodedScenario(browser, baseURL, scenario, options = {}) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript((signedInPublicState) => {
    localStorage.clear();
    if (!signedInPublicState) return;
    localStorage.setItem("access_token", "PUBLIC_ROUTE_TOKEN_SHOULD_NOT_TRAVEL");
    localStorage.setItem("gmfn_selected_clan_id", "987654");
  }, Boolean(options.signedInPublicState));
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApiMocks(page, requestLog);

  await page.goto(`${baseURL}/t/${encodeURIComponent(scenario.code)}?level=${scenario.visibility_level}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await assertPublicPaperBasics(page);
  await expect(page.getByText(scenario.expectedStatusText, { exact: false }).first()).toBeVisible();
  await expect(page.getByText(scenario.expectedReadingTitle, { exact: true })).toBeVisible();

  if (scenario.expectedReadingTitle !== "Current public slip") {
    await expect(page.getByText("Current public slip", { exact: true })).toHaveCount(0);
  }

  if (scenario.visibility_level === "minimal") {
    await expect(page.locator('img[alt="GSN holder GMFN-U-BOUNDARY profile"]')).toHaveCount(0);
    await expect(page.getByText("Public identity continuity visible")).toHaveCount(0);
    await expect(page.getByText("Current witness evidence")).toHaveCount(0);
  }
  for (const text of scenario.expectedText || []) {
    await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  for (const text of scenario.absentText || []) {
    await expect(page.getByText(text, { exact: false })).toHaveCount(0);
  }

  const verifyRequests = publicVerifyRequests(requestLog);
  if (verifyRequests.length < 1) {
    throw new Error(`No verify request was made for ${scenario.code}.`);
  }
  const authRequests = requestLog.filter((entry) => entry.authPresent);
  if (authRequests.length > 0) {
    throw new Error(`Public TrustSlip route sent auth headers: ${JSON.stringify(authRequests)}`);
  }
  const clanRequests = requestLog.filter((entry) => entry.clanPresent);
  if (clanRequests.length > 0) {
    throw new Error(`Public TrustSlip route sent selected-clan headers: ${JSON.stringify(clanRequests)}`);
  }

  if (consoleErrors.length || pageErrors.length) {
    throw new Error(
      `TrustSlip public scenario ${scenario.code} emitted runtime errors: ${[
        ...consoleErrors,
        ...pageErrors,
      ].join(" | ")}`
    );
  }

  await context.close();
}

async function runUnknownCodeScenario(browser, baseURL) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript(() => localStorage.clear());
  const page = await context.newPage();
  await installApiMocks(page, requestLog);

  await page.goto(`${baseURL}/t/TS-UNKNOWN-BOUNDARY?level=standard`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await assertPublicPaperBasics(page);
  await expect(page.getByText("No usable TrustSlip record was found", { exact: false }).first()).toBeVisible();
  await expect(
    page.getByText(
      "The supplied TrustSlip code did not return a usable verification record from the available verification source.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(page.getByText("Do not rely on this alone", { exact: true })).toBeVisible();

  const verifyRequests = publicVerifyRequests(requestLog);
  if (verifyRequests.length < 1) {
    throw new Error("Unknown-code route did not call public verify.");
  }
  const viewerContextRequests = requestLog.filter((entry) => entry.authPresent || entry.clanPresent);
  if (viewerContextRequests.length > 0) {
    throw new Error(
      `Unknown-code public TrustSlip route sent viewer context: ${JSON.stringify(viewerContextRequests)}`
    );
  }

  await context.close();
}

async function main() {
  let server;
  let browser;

  try {
    server = await createServer({
      root: frontendRoot,
      configFile: join(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "silent",
    });
    await server.listen();
    const address = server.httpServer?.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) throw new Error("Vite test server did not expose a port.");
    const baseURL = `http://127.0.0.1:${port}`;

    browser = await chromium.launch({ headless: true });
    await runNoCodeScenario(browser, baseURL);
    for (const scenario of Object.values(scenarios)) {
      await runCodedScenario(browser, baseURL, scenario);
    }
    await runUnknownCodeScenario(browser, baseURL);
    await runCodedScenario(browser, baseURL, scenarios.current, { signedInPublicState: true });

    console.log(
      [
        "Public TrustSlip Verify state smoke passed:",
        "no-code stayed on the public code checker without API calls;",
        "current and minimal records rendered public evidence without private/app chrome;",
        "expired, revoked, frozen, merchant-inactive, low-data, missing-window, no-relay, and unknown-code states stayed honest;",
        "public verify requests carried no auth or selected-clan headers, even with signed-in local state.",
      ].join(" ")
    );
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
