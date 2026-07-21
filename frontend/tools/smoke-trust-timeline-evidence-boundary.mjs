/* global console, process, setTimeout, URL, localStorage */

import { chromium, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const selectedClanId = 8;
const packId = "GSN-PACK-TIMELINE-BOUNDARY";

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function binary(body, contentType) {
  return {
    status: 200,
    contentType,
    body,
  };
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return `${url.pathname}${url.search}`;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  return (
    url.host === "127.0.0.1:8012" ||
    url.host === "localhost:8012" ||
    url.pathname.startsWith("/api/")
  );
}

function mePayload() {
  return {
    id: 216,
    user_id: 216,
    display_name: "Boundary Timeline Holder",
    name: "Boundary Timeline Holder",
    gmfn_id: "GMFN-U-TIMELINE-BOUNDARY",
    gsn_id: "GMFN-U-TIMELINE-BOUNDARY",
    role: "member",
    phone_verified: true,
  };
}

function clanPayload() {
  return {
    id: selectedClanId,
    clan_id: selectedClanId,
    name: "Boundary Timeline Community",
    display_name: "Boundary Timeline Community",
    community_name: "Boundary Timeline Community",
    clan_code: "GMFN-C-TIMELINE-BOUNDARY",
    community_code: "GMFN-C-TIMELINE-BOUNDARY",
    gmfn_id: "GMFN-C-TIMELINE-BOUNDARY",
    role: "member",
    member_count: 18,
  };
}

function scoreExplainedPayload() {
  return {
    score: "74",
    last_change: {
      event_type: "community_contribution",
      source: "trust_events",
      created_at: "2026-07-05T08:00:00.000Z",
      reason: "Community contribution recorded",
      note: "Visible timeline event is evidence, not approval.",
    },
  };
}

function timelinePayload() {
  return {
    items: [
      {
        event_type: "community_contribution",
        label: "Contribution recorded",
        delta: "4",
        reason: "Community contribution recorded",
        note: "Visible evidence row",
        reference_label: "Community evidence",
        created_at: "2026-07-05T08:00:00.000Z",
      },
      {
        event_type: "guarantor_repayment",
        label: "Support repayment noted",
        delta: "-1",
        reason: "Guarantor wording should be softened for readers",
        note: "Boundary wording check",
        reference_label: "Guarantor record",
        created_at: "2026-07-04T08:00:00.000Z",
      },
      {
        event_type: "shop_followed",
        label: "Shop followed",
        delta: "0",
        reason: "Attention record only",
        note: "Not membership, endorsement, verification, payment evidence, or trust-score growth",
        reference_label: "Follow record",
        created_at: "2026-07-03T08:00:00.000Z",
      },
    ],
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
    const headers = request.headers();
    requestLog.push({
      method,
      path,
      authPresent: Boolean(headers.authorization),
      clanPresent: Boolean(headers["x-clan-id"]),
    });

    if (method === "GET" && path === "/auth/me") {
      await route.fulfill(json(mePayload()));
      return;
    }

    if (method === "GET" && path === "/clans/me") {
      await route.fulfill(json([clanPayload()]));
      return;
    }

    if (method === "GET" && path === "/trust/score/explained") {
      await route.fulfill(json(scoreExplainedPayload()));
      return;
    }

    if (method === "GET" && path.startsWith("/trust/me/timeline")) {
      await route.fulfill(json(timelinePayload()));
      return;
    }

    if (method === "GET" && path === "/trust/me/evidence-pack/meta") {
      await route.fulfill(
        json({
          pack_id: packId,
          generated_at_utc: "2026-07-05T08:10:00.000Z",
          protocol_version: "boundary-smoke",
          footer:
            "Redacted trust evidence pack for controlled review. Not release authority.",
        })
      );
      return;
    }

    if (method === "GET" && path.startsWith("/trust/me/timeline.pdf")) {
      await route.fulfill(binary("MOCK_TIMELINE_PDF", "application/pdf"));
      return;
    }

    if (
      method === "GET" &&
      path.startsWith("/trust/me/evidence-pack.zip")
    ) {
      await route.fulfill(binary("MOCK_EVIDENCE_ZIP", "application/zip"));
      return;
    }

    await route.fulfill(json({ items: [], results: [], total: 0, ok: true }));
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRequest(requestLog, predicate, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 7000) {
    if (requestLog.some(predicate)) return;
    await wait(100);
  }
  const summary = requestLog
    .map((entry) => `${entry.method} ${entry.path} auth=${entry.authPresent} clan=${entry.clanPresent}`)
    .join("; ");
  throw new Error(`${label} did not happen. Requests: ${summary || "none"}`);
}

function assertPrivateReadsCarryAuth(requestLog) {
  const privatePaths = [
    { label: "/trust/score/explained", matches: (path) => path === "/trust/score/explained" },
    { label: "/trust/me/timeline", matches: (path) => path.startsWith("/trust/me/timeline") },
    { label: "/trust/me/evidence-pack/meta", matches: (path) => path === "/trust/me/evidence-pack/meta" },
    { label: "/trust/me/timeline.pdf", matches: (path) => path.startsWith("/trust/me/timeline.pdf") },
    { label: "/trust/me/evidence-pack.zip", matches: (path) => path.startsWith("/trust/me/evidence-pack.zip") },
  ];

  for (const privatePath of privatePaths) {
    const matching = requestLog.filter(
      (entry) => entry.method === "GET" && privatePath.matches(entry.path)
    );
    if (matching.length < 1) throw new Error(`${privatePath.label} was not requested.`);
    const unauthenticated = matching.filter((entry) => !entry.authPresent);
    if (unauthenticated.length > 0) {
      throw new Error(`${privatePath.label} was requested without auth: ${JSON.stringify(unauthenticated)}`);
    }
  }
}

function assertNoPublicEvidenceReads(requestLog) {
  const publicReads = requestLog.filter(
    (entry) =>
      entry.method === "GET" &&
      (entry.path.startsWith("/trust-slips/verify/") ||
        entry.path.startsWith("/t/") ||
        entry.path === "/trust-timeline")
  );
  if (publicReads.length > 0) {
    throw new Error(`Trust Timeline made unexpected public evidence reads: ${JSON.stringify(publicReads)}`);
  }
}

async function newSignedInPage(browser) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    acceptDownloads: true,
  });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "SIGNED_IN_TIMELINE_BOUNDARY_TOKEN");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApiMocks(page, requestLog);
  return { context, page, requestLog, consoleErrors, pageErrors };
}

async function closeChecked(state, label) {
  await state.context.close();
  if (state.consoleErrors.length || state.pageErrors.length) {
    throw new Error(
      `${label} emitted runtime errors: ${[...state.consoleErrors, ...state.pageErrors].join(" | ")}`
    );
  }
}

async function expectVisibleText(page, text) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}

async function openDisclosure(page, title) {
  await page.locator("summary").filter({ hasText: title }).first().click();
}

async function runTimelineScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/app/trust-timeline`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.getByText("Trust Timeline Evidence Record", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-timeline"]')).toHaveCount(1);
  await expect(state.page.getByText("Private evidence", { exact: true })).toBeVisible();
  await expect(state.page.getByText("This timeline confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This timeline does not confirm", { exact: true })).toHaveCount(1);
  await openDisclosure(state.page, "More confirmed details");
  await openDisclosure(state.page, "More limits");
  await openDisclosure(state.page, "More security details");
  await expectVisibleText(state.page, "The signed-in member can view this Trust Timeline evidence surface.");
  await expectVisibleText(state.page, `The visible evidence pack reference is ${packId}.`);
  await expectVisibleText(state.page, "Payment movement, escrow, payout approval, credit approval, or automatic debit authority.");
  await expectVisibleText(state.page, "Authority to release goods, money, credit, services, or private records.");
  await expectVisibleText(state.page, "Private contacts, complete private Trust Passport history, protected event details, or admin-only notes.");
  await expectVisibleText(state.page, "Signed-in access");
  await expectVisibleText(state.page, "Visibility-bound evidence");
  await expectVisibleText(state.page, "does not approve credit, move money, or authorize release of goods or services");
  await expectVisibleText(state.page, "Record reference for this visible signed-in Trust Timeline.");
  await expectVisibleText(state.page, "Evidence Share Copy");
  await expectVisibleText(state.page, packId);
  await expectVisibleText(state.page, "The share copy follows your TrustSlip visibility level and leaves");
  await expectVisibleText(state.page, "out private contact details and complete private records.");
  await expectVisibleText(state.page, "Follow events are attention records.");
  await expectVisibleText(state.page, "do not prove");
  await expectVisibleText(state.page, "membership, endorsement, verification, payment evidence, or trust-score");
  await expectVisibleText(state.page, "This timeline is a community trust record. It is not a bank guarantee");

  await expect(state.page.locator('[data-cta-id="trust-timeline.trust-slip"]')).toHaveCount(1);
  await expect(state.page.locator('[data-cta-id="trust-timeline.refresh"]')).toHaveCount(1);
  await expect(state.page.locator('[data-cta-id="trust-timeline.download-pdf"]')).toHaveCount(1);
  await expect(state.page.locator('[data-cta-id="trust-timeline.copy-pack-id"]')).toHaveCount(1);
  await expect(state.page.locator('[data-cta-id="trust-timeline.download-evidence-zip"]')).toHaveCount(1);

  await expectVisibleText(state.page, "community contribution");
  await expectVisibleText(state.page, "Support repayment noted");
  await expectVisibleText(state.page, "supporter repayment");
  await expectVisibleText(state.page, "Supporter wording should be softened for readers");
  await expect(state.page.getByText("Guarantor", { exact: false })).toHaveCount(0);

  await state.page.locator('[data-cta-id="trust-timeline.download-pdf"]').click();
  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path.startsWith("/trust/me/timeline.pdf"),
    "Trust Timeline PDF download"
  );

  await state.page.locator('[data-cta-id="trust-timeline.download-evidence-zip"]').click();
  await waitForRequest(
    state.requestLog,
    (entry) =>
      entry.method === "GET" &&
      entry.path.startsWith("/trust/me/evidence-pack.zip"),
    "Trust Timeline evidence ZIP download"
  );

  await assertPrivateReadsCarryAuth(state.requestLog);
  assertNoPublicEvidenceReads(state.requestLog);
  await closeChecked(state, "Trust Timeline scenario");
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
    await runTimelineScenario(browser, baseURL);

    console.log(
      [
        "Trust Timeline evidence boundary smoke passed:",
        "/app/trust-timeline rendered the private Trust Timeline certificate;",
        "signed-in timeline, score, pack meta, PDF, and ZIP reads carried auth;",
        "no public TrustSlip verify evidence reads were made;",
        "payment/release/private-record limits, follow-event boundary, redacted share copy, and supporter wording rendered.",
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
