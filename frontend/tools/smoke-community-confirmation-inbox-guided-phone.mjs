/* global console, process, URL, localStorage, document, window */

import { chromium } from "playwright";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const inboxRows = [
  {
    id: 101,
    mode: "instant_pulse",
    reason_type: "community_standing_check",
    risk_level: "low",
    community_id: 8,
    community_name: "Pilot Community",
    subject_user_id: 41,
    subject_profile: {
      display_name: "Ada Member",
      gmfn_id: "GMFN-U-ADA041",
      phone_verified: true,
      membership_status: "active",
      membership_role: "member",
    },
    created_at: "2026-10-26T15:00:00Z",
    expires_at: "2026-10-29T15:00:00Z",
    reader_note: "Answer only if you genuinely know this member.",
    current_response_counts: {
      positive_count: 1,
      caution_count: 0,
      objection_count: 0,
    },
  },
  {
    id: 102,
    mode: "relay",
    reason_type: "trade_skill_check",
    risk_level: "medium",
    community_id: 8,
    community_name: "Pilot Community",
    subject_user_id: 42,
    subject_profile: {
      display_name: "Bola Trader",
      gmfn_id: "GMFN-U-BOLA042",
      phone_verified: true,
      membership_status: "active",
      membership_role: "member",
    },
    created_at: "2026-10-26T15:30:00Z",
    expires_at: "2026-10-29T15:30:00Z",
    reader_note: "Answer only from recent personal knowledge.",
    current_response_counts: {
      positive_count: 0,
      caution_count: 1,
      objection_count: 0,
    },
  },
];

const reviewCase = {
  review_case_id: 501,
  request_id: 102,
  public_token: "public-review-501",
  status: "open",
  review_reason: "Response pattern needs a human check.",
  community_id: 8,
  community_name: "Pilot Community",
  community_code: "GMFN-C-000008",
  subject_user_id: 42,
  request_status: "review",
  request_mode: "relay",
  reason_type: "trade_skill_check",
  risk_level: "medium",
  visible_outcome: "Review pending",
  updated_at: "2026-10-26T16:00:00Z",
  created_at: "2026-10-26T15:40:00Z",
  review_age_hours: 1,
  review_sla_status: "within_window",
  review_sla_label: "Within review window",
  review_sla_meaning: "The case is still inside its review window.",
};

async function installApiMocks(page, { rows = inboxRows, reviewCases = [] } = {}) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      return route.fulfill(json({
        id: 1,
        user_id: 1,
        display_name: "GSN Operator",
        gmfn_id: "GMFN-U-ADMIN001",
        role: "admin",
      }));
    }

    if (path === "/clans/me") {
      return route.fulfill(json({
        items: [{
          id: 8,
          clan_id: 8,
          name: "Pilot Community",
          community_code: "GMFN-C-000008",
          status: "active",
          role: "admin",
        }],
      }));
    }

    if (path === "/community-confirmations/inbox") {
      return route.fulfill(json({ items: rows }));
    }

    if (path === "/community-confirmations/my-contact-settings") {
      return route.fulfill(json({
        items: [{
          community_id: 8,
          community_name: "Pilot Community",
          community_code: "GMFN-C-000008",
          role_type: "admin",
          active: true,
          can_receive_relay_requests: true,
          can_receive_instant_pulse: true,
          opted_out_at: null,
        }],
      }));
    }

    if (path === "/community-confirmations/review-cases/inbox") {
      return route.fulfill(json({
        items: reviewCases,
        total_available: reviewCases.length,
        offset: 0,
        next_offset: null,
        previous_offset: null,
      }));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
}

async function createPhonePage(browser, options = {}) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await installApiMocks(page, options);
  await page.addInitScript(({ accessToken }) => {
    localStorage.setItem("access_token", accessToken);
    localStorage.setItem("gmfn_selected_clan_id", "8");
  }, { accessToken: options.token || "local-community-confirmation-token" });
  return page;
}

async function detailsIsOpen(locator) {
  return locator.evaluate((element) => element.open);
}

async function run() {
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
    const port = server.httpServer.address().port;
    const routeUrl = "http://127.0.0.1:" + port + "/app/community-confirmations";

    browser = await chromium.launch({ headless: true });
    const page = await createPhonePage(browser);
    await page.goto(routeUrl, { waitUntil: "networkidle" });

    const summary = page.locator('[data-gsn-community-confirmation-summary="true"]');
    const tools = page.locator('[data-gsn-community-confirmation-tools="true"]');
    const reviews = page.locator('[data-gsn-community-confirmation-review-cases="true"]');
    const relay = page.locator('[data-gsn-community-confirmation-relay-settings="true"]');
    await summary.waitFor();
    await summary.getByText("2 requests need an honest answer.", { exact: true }).waitFor();
    assert(
      await page.getByRole("button", { name: "Review first request", exact: true }).count() === 1,
      "Populated inbox must show one Review first request action."
    );
    assert(!(await detailsIsOpen(tools)), "Inbox tools must start closed.");
    assert(!(await detailsIsOpen(reviews)), "Reviewer work must start closed.");
    assert(!(await detailsIsOpen(relay)), "Relay settings must start closed.");
    assert(
      await page.getByText("How to answer", { exact: true }).count() === 0,
      "The old exposed explanation must not return."
    );

    await page.getByRole("button", { name: "Review first request", exact: true }).click();
    await page.waitForFunction(() => {
      const target = document.getElementById("community-confirmation-request-101");
      if (!target) return false;
      const rect = target.getBoundingClientRect();
      return rect.top >= 0 && rect.top < window.innerHeight;
    });
    assert(
      await page.getByRole("button", { name: "Record: Known here", exact: true }).count() === 2,
      "Both populated request cards must retain the Known here action."
    );
    assert(
      await page.getByRole("button", { name: "Record caution", exact: true }).count() === 6,
      "Both populated request cards must retain all three caution choices."
    );
    assert(
      await page.getByRole("button", { name: "Record objection", exact: true }).count() === 6,
      "Both populated request cards must retain all three objection choices."
    );
    const hasHorizontalOverflow = await summary.evaluate(() =>
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    assert(!hasHorizontalOverflow, "Community Confirmation Inbox overflows horizontally at 390x844.");
    await page.close();

    const emptyPage = await createPhonePage(browser, {
      rows: [],
      token: "local-community-confirmation-empty-token",
    });
    await emptyPage.goto(routeUrl, { waitUntil: "networkidle" });
    await emptyPage.getByText("Nothing is waiting for your answer right now.", { exact: true }).waitFor();
    assert(
      await emptyPage.getByRole("button", { name: "Refresh inbox", exact: true }).count() === 1,
      "Empty inbox must show one Refresh inbox action."
    );
    await emptyPage.getByText("No community confirmation requests need your answer.", { exact: true }).waitFor();
    await emptyPage.close();

    const focusedPage = await createPhonePage(browser, {
      token: "local-community-confirmation-focused-token",
    });
    await focusedPage.goto(routeUrl + "?request_id=102", { waitUntil: "networkidle" });
    await focusedPage.getByText("This request needs your honest answer.", { exact: true }).waitFor();
    assert(
      await focusedPage.getByRole("button", { name: "Answer this request", exact: true }).count() === 1,
      "Focused notification must show one Answer this request action."
    );
    assert(
      await focusedPage.locator("#community-confirmation-request-102").count() === 1 &&
        await focusedPage.locator("#community-confirmation-request-101").count() === 0,
      "Focused notification must show only its requested response card."
    );
    assert(
      await focusedPage.locator('[data-gsn-community-confirmation-review-cases="true"]').count() === 0 &&
        await focusedPage.locator('[data-gsn-community-confirmation-relay-settings="true"]').count() === 0,
      "Focused notification must hide unrelated reviewer and relay sections."
    );
    await focusedPage.close();

    const reviewPage = await createPhonePage(browser, {
      rows: [],
      reviewCases: [reviewCase],
      token: "local-community-confirmation-review-token",
    });
    await reviewPage.goto(
      routeUrl + "?case_id=501&status=all&scope=all_visible&sort=urgency",
      { waitUntil: "networkidle" }
    );
    const focusedReviews = reviewPage.locator('[data-gsn-community-confirmation-review-cases="true"]');
    await focusedReviews.waitFor();
    await reviewPage.locator("#community-confirmation-review-case-501").waitFor();
    assert(
      await detailsIsOpen(focusedReviews),
      "An explicit case_id deep link must open the focused reviewer disclosure."
    );

    console.log(
      "Community Confirmation Inbox guided phone smoke passed: populated first action, complete response inventory, closed secondary work, empty refresh, focused request, focused review case, and 390x844 overflow."
    );
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
