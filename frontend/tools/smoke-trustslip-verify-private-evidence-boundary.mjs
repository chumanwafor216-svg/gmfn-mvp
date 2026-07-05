/* global console, process, URL, localStorage */

import { chromium, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const profileImageDataUrl =
  "data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=";

const ownerCode = "TS-APP-OWNER-BOUNDARY";
const otherCode = "TS-APP-OTHER-BOUNDARY";

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

function trustSlipPayload(code, extra = {}) {
  return {
    code,
    token: code,
    verification_token: code,
    verification_code: code,
    status: "active",
    verification_status: "active",
    valid: true,
    verified: true,
    is_current: true,
    visibility_level: "standard",
    public_verify_url: `/t/${encodeURIComponent(code)}?level=standard`,
    holder_name: "GSN holder GMFN-U-OWNER",
    display_name: "GSN holder GMFN-U-OWNER",
    gmfn_id: "GMFN-U-OWNER",
    holder_gmfn_id: "GMFN-U-OWNER",
    community_name: "Boundary Community",
    community: "Boundary Community",
    community_code: "GMFN-C-BOUNDARY",
    trust_band: "A",
    band: "A",
    open_trust_score: 82,
    cci_score: 82,
    trust_limit: "100",
    currency: "GBP",
    issued_at: "2026-07-05T08:00:00.000Z",
    expires_at: "2035-07-05T12:00:00.000Z",
    merchant_verify_active: true,
    profile_image_url: profileImageDataUrl,
    identity_context: {
      identity_status_label: "Public identity continuity visible",
      profile_image_url: profileImageDataUrl,
    },
    community_context: {
      community_code: "GMFN-C-BOUNDARY",
      holder_role: "member",
      active_member_count: 12,
      member_witness_count: 3,
      membership_currentness_label: "Current witness evidence",
      membership_currentness_scope:
        "Witness rows are scoped to this community and current window.",
    },
    community_confirmation: {
      relay_available: true,
      instant_pulse_available: true,
      active_member_count: 12,
      contactable_reference_count: 4,
      plain_language:
        "Community confirmation is available through a controlled public relay.",
    },
    merchant_view: {
      display_name: "GSN holder GMFN-U-OWNER",
      gmfn_id: "GMFN-U-OWNER",
      visibility_level: "standard",
      band: "A",
    },
    ...extra,
  };
}

function privateTrustSlipPayload(code) {
  return trustSlipPayload(code, {
    phone_verified: true,
    snapshot_label: "Private holder snapshot",
    risk_flags: ["manual_review", "late_payment_context"],
    contribution_discipline: {
      label: "Contribution discipline visible to holder",
      status: "current",
    },
    repayment_discipline: {
      label: "Repayment discipline visible to holder",
      status: "current",
    },
    personal_commitment_discipline: {
      label: "Personal commitment discipline visible to holder",
      status: "current",
    },
    verification_note: "Private holder evidence note.",
  });
}

async function installApiMocks(page, requestLog, myTrustSlipCode) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (!isApiRequest(url)) {
      await route.continue();
      return;
    }

    const path = apiPathFrom(url);
    const method = request.method().toUpperCase();
    const headers = request.headers();
    requestLog.push({
      method,
      path,
      authPresent: Boolean(headers.authorization),
      clanPresent: Boolean(headers["x-clan-id"]),
    });

    if (method === "GET" && path === "/auth/me") {
      await route.fulfill(
        json({
          id: 42,
          gmfn_id: "GMFN-U-OWNER",
          display_name: "Boundary Owner",
          role: "member",
        })
      );
      return;
    }

    if (method === "GET" && path === "/clans/me") {
      await route.fulfill(
        json({
          items: [
            {
              id: 987654,
              name: "Boundary Community",
              display_name: "Boundary Community",
              marketplace_name: "Boundary Community",
              role: "member",
            },
          ],
        })
      );
      return;
    }

    if (method === "GET" && path === "/trust-slips/me") {
      await route.fulfill(json(privateTrustSlipPayload(myTrustSlipCode)));
      return;
    }

    const verifyMatch = path.match(/^\/trust-slips\/verify\/([^/?#]+)/);
    if (method === "GET" && verifyMatch) {
      const code = decodeURIComponent(verifyMatch[1]);
      await route.fulfill(json(trustSlipPayload(code)));
      return;
    }

    await route.fulfill(json({ items: [], total: 0, ok: true }));
  });
}

async function openAppVerifyPage(browser, baseURL, visibleCode, myTrustSlipCode) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "APP_ROUTE_TOKEN");
    localStorage.setItem("gmfn_selected_clan_id", "987654");
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApiMocks(page, requestLog, myTrustSlipCode);

  await page.goto(
    `${baseURL}/app/trust-slip/verify?code=${encodeURIComponent(visibleCode)}`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await expect(page.getByRole("heading", { name: "TrustSlip Verify", exact: true })).toBeVisible({
    timeout: 30000,
  });

  if (consoleErrors.length || pageErrors.length) {
    throw new Error(
      `TrustSlip app verify emitted runtime errors: ${[
        ...consoleErrors,
        ...pageErrors,
      ].join(" | ")}`
    );
  }

  return { context, page, requestLog };
}

function assertSignedInLookupsWerePrivate(requestLog) {
  const privatePaths = ["/auth/me", "/clans/me", "/trust-slips/me"];
  for (const path of privatePaths) {
    const matches = requestLog.filter((entry) => entry.path === path);
    if (matches.length < 1) {
      throw new Error(`Expected signed-in lookup was not called: ${path}`);
    }
    if (matches.some((entry) => !entry.authPresent)) {
      throw new Error(`Signed-in lookup missed auth header: ${JSON.stringify(matches)}`);
    }
  }
}

function assertPublicVerifyStayedPublic(requestLog, visibleCode) {
  const verifyPath = `/trust-slips/verify/${visibleCode}`;
  const verifyRequests = requestLog.filter((entry) => entry.path === verifyPath);
  if (verifyRequests.length < 1) {
    throw new Error(`Expected public verify request was not called: ${verifyPath}`);
  }
  if (verifyRequests.some((entry) => entry.authPresent || entry.clanPresent)) {
    throw new Error(
      `Visible TrustSlip verify inherited private viewer context: ${JSON.stringify(verifyRequests)}`
    );
  }
}

async function runOwnerScenario(browser, baseURL) {
  const { context, page, requestLog } = await openAppVerifyPage(
    browser,
    baseURL,
    ownerCode,
    ownerCode
  );

  const toggle = page.locator('[data-cta-id="trust-slip-verify.full-evidence-toggle"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(page.getByText("Evidence controls", { exact: true })).toBeVisible();
  await expect(page.getByText("Risk flags: manual_review, late_payment_context")).toBeVisible();

  assertSignedInLookupsWerePrivate(requestLog);
  assertPublicVerifyStayedPublic(requestLog, ownerCode);
  await context.close();
}

async function runNonOwnerScenario(browser, baseURL) {
  const { context, page, requestLog } = await openAppVerifyPage(
    browser,
    baseURL,
    otherCode,
    ownerCode
  );

  await expect(
    page.locator('[data-cta-id="trust-slip-verify.full-evidence-toggle"]')
  ).toHaveCount(0);
  await expect(page.getByText("Risk flags: manual_review, late_payment_context")).toHaveCount(0);

  assertSignedInLookupsWerePrivate(requestLog);
  assertPublicVerifyStayedPublic(requestLog, otherCode);
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
    await runOwnerScenario(browser, baseURL);
    await runNonOwnerScenario(browser, baseURL);

    console.log(
      [
        "TrustSlip Verify private evidence boundary smoke passed:",
        "signed-in holder can open private evidence for their own visible TrustSlip;",
        "the same signed-in user cannot open private evidence for another visible TrustSlip;",
        "private lookups carried auth while public verify stayed no-auth/no-selected-clan.",
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
