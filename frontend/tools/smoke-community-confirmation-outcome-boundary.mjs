/* global console, process, setTimeout, URL, localStorage */

import { chromium, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const token = "PUBLIC-CCO-BOUNDARY";
const requestId = 4242;
const reviewCaseId = 515;

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function publicOutcomePayload() {
  return {
    request_id: requestId,
    public_token: token,
    status: "under_review",
    mode: "instant_pulse",
    reason_type: "merchant_release_check",
    risk_level: "medium",
    community_name: "Homeland Isa Community",
    community_id: 8,
    community_code: "GMFN-C-000008",
    subject_public_reference: "GMFN-U-PUBLIC1",
    subject_reference_type: "gsn_id",
    created_at: "2026-07-05T08:00:00.000Z",
    expires_at: "2026-07-05T09:00:00.000Z",
    review_case: {
      review_case_id: reviewCaseId,
      status: "open",
      review_reason: "confirmation_outcome_boundary_check",
      trust_impact: "caution",
      trust_reading_effect: {
        label: "Use caution",
        plain_language:
          "A review case exists, but private review notes are not part of the public paper.",
        reader_action: "Use the public response counts and your own judgement.",
        trust_delta: "scoped",
      },
    },
    community_response: {
      requests_sent: 4,
      active_member_count: 12,
      responses_received: 3,
      confirmed_known_count: 2,
      caution_count: 1,
      objection_count: 0,
      community_confidence: "moderate",
      private_contacts_exposed: false,
    },
    visible_summary:
      "Two requested contacts confirmed and one advised caution. Private contacts stay hidden.",
    privacy_note:
      "GSN shows a controlled community outcome. It does not expose private member phone numbers.",
    decision_note:
      "This is evidence for judgement, not a guarantee, payment instruction, or automatic approval.",
    requester_callback: {
      consent: false,
      delivery_status: "not_requested",
    },
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
    requestLog.push({ method, path, authPresent: Boolean(auth) });

    if (
      method === "GET" &&
      path === `/community-confirmations/public/${encodeURIComponent(token)}`
    ) {
      await route.fulfill(json(publicOutcomePayload()));
      return;
    }

    if (
      method === "GET" &&
      path === `/community-confirmations/${encodeURIComponent(String(requestId))}/decision`
    ) {
      await route.fulfill(
        json({
          decision_found: true,
          decision_id: 9001,
          decision: "deferred",
          status: "under_review",
          settled: false,
          issue_reported: false,
        })
      );
      return;
    }

    if (
      method === "GET" &&
      path ===
        `/community-confirmations/review-cases/${encodeURIComponent(
          String(reviewCaseId)
        )}/evidence`
    ) {
      await route.fulfill(
        json({
          items: [
            {
              evidence_id: 77,
              evidence_type: "note",
              title: "Internal review note",
              body: "Private operator context for the signed-in review desk.",
              visibility: "internal",
              created_at: "2026-07-05T08:15:00.000Z",
            },
          ],
          total: 1,
          private_contacts_exposed: false,
        })
      );
      return;
    }

    await route.fulfill(json({ items: [], total: 0, ok: true }));
  });
}

async function waitForRequestCount(requestLog, predicate, expected, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 7000) {
    const count = requestLog.filter(predicate).length;
    if (count >= expected) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const summary = requestLog
    .map((entry) => `${entry.method} ${entry.path} auth=${entry.authPresent}`)
    .join("; ");
  throw new Error(`${label} did not happen. Requests: ${summary || "none"}`);
}

function countRequests(requestLog, pathFragment) {
  return requestLog.filter((entry) => entry.path.includes(pathFragment)).length;
}

async function runScenario(browser, baseURL, { signedIn }) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript((shouldSignIn) => {
    localStorage.clear();
    if (shouldSignIn) {
      localStorage.setItem("access_token", "boundary-smoke-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    }
  }, signedIn);

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await installApiMocks(page, requestLog);
  await page.goto(`${baseURL}/community-confirmations/public/${token}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(
    page.getByRole("heading", { name: "Community Confirmation", exact: true })
  ).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByText("This outcome confirms", { exact: true })).toHaveCount(1);
  await expect(page.getByText("This outcome does not confirm", { exact: true })).toHaveCount(1);
  const fastReading = page.locator('section[aria-label="Fast outcome reading"]');
  await expect(fastReading.getByText("Private contacts stay hidden.")).toBeVisible();
  await expect(
    fastReading.getByText("not a guarantee, payment instruction, or automatic approval")
  ).toBeVisible();
  await expect(
    page.locator('[data-cta-id="community-confirmation-outcome.record-decision"]')
  ).toBeVisible();

  await waitForRequestCount(
    requestLog,
    (entry) => entry.path.includes("/community-confirmations/public/"),
    1,
    "public outcome request"
  );

  if (signedIn) {
    await waitForRequestCount(
      requestLog,
      (entry) => entry.path.includes(`/community-confirmations/${requestId}/decision`),
      1,
      "signed-in decision snapshot request"
    );
    await waitForRequestCount(
      requestLog,
      (entry) => entry.path.includes(`/community-confirmations/review-cases/${reviewCaseId}/evidence`),
      1,
      "signed-in review evidence request"
    );
  } else {
    await page.waitForTimeout(800);
  }

  const facts = {
    publicRequests: countRequests(requestLog, "/community-confirmations/public/"),
    decisionRequests: countRequests(requestLog, `/community-confirmations/${requestId}/decision`),
    reviewEvidenceRequests: countRequests(
      requestLog,
      `/community-confirmations/review-cases/${reviewCaseId}/evidence`
    ),
    anonymousAuthHeaders: requestLog.filter((entry) => entry.authPresent).length,
    signedInProtectedAuthHeaders: requestLog.filter(
      (entry) =>
        entry.authPresent &&
        (entry.path.includes(`/community-confirmations/${requestId}/decision`) ||
          entry.path.includes(`/community-confirmations/review-cases/${reviewCaseId}/evidence`))
    ).length,
  };

  await context.close();

  if (consoleErrors.length || pageErrors.length) {
    throw new Error(
      `${signedIn ? "signed-in" : "anonymous"} scenario emitted runtime errors: ${[
        ...consoleErrors,
        ...pageErrors,
      ].join(" | ")}`
    );
  }

  return facts;
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
    const anonymous = await runScenario(browser, baseURL, { signedIn: false });
    const signedIn = await runScenario(browser, baseURL, { signedIn: true });

    if (anonymous.publicRequests < 1) {
      throw new Error("Anonymous scenario did not request the public confirmation outcome.");
    }
    if (anonymous.decisionRequests !== 0 || anonymous.reviewEvidenceRequests !== 0) {
      throw new Error(
        `Anonymous scenario crossed the private boundary: decisionRequests=${anonymous.decisionRequests}, reviewEvidenceRequests=${anonymous.reviewEvidenceRequests}`
      );
    }
    if (anonymous.anonymousAuthHeaders !== 0) {
      throw new Error(`Anonymous scenario sent ${anonymous.anonymousAuthHeaders} auth headers.`);
    }
    if (signedIn.decisionRequests < 1 || signedIn.reviewEvidenceRequests < 1) {
      throw new Error(
        `Signed-in scenario did not prove protected reads: decisionRequests=${signedIn.decisionRequests}, reviewEvidenceRequests=${signedIn.reviewEvidenceRequests}`
      );
    }
    if (signedIn.signedInProtectedAuthHeaders < 2) {
      throw new Error("Signed-in protected confirmation reads did not carry auth headers.");
    }

    console.log(
      [
        "Community Confirmation Outcome boundary smoke passed:",
        "anonymous loaded the public paper without auth and without decision/review-evidence reads;",
        "signed-in storage loaded decision and private review evidence reads with auth;",
        "public confirms/does-not-confirm, privacy, and decision-boundary text rendered.",
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
