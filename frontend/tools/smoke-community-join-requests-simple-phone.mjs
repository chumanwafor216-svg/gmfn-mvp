import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const requests = [
  {
    id: 42,
    clan_id: 8,
    clan_name: "Homeland Isa",
    applicant_name: "Second Person",
    applicant_phone_e164: "+2348000000042",
    invited_by_display: "Community Helper",
    status: "pending",
    created_at: "2026-11-19T12:10:00Z",
    approvals: 1,
    rejects: 0,
    neutrals: 0,
    required_approvals: 3,
    active_member_count: 6,
    admission_mode: "community_vote",
    voting_admin_override: false,
    reviewer_can_admin_approve: false,
  },
  {
    id: 41,
    clan_id: 8,
    clan_name: "Homeland Isa",
    applicant_name: "AnekeChinecherem",
    applicant_phone_e164: "+2348140540900",
    invited_by_display: "Francisca Ogechukwu",
    status: "pending",
    created_at: "2026-11-18T16:00:52Z",
    approvals: 0,
    rejects: 0,
    neutrals: 0,
    required_approvals: 6,
    active_member_count: 14,
    admission_mode: "community_vote",
    voting_admin_override: false,
    reviewer_can_admin_approve: false,
  },
  {
    id: 40,
    clan_id: 8,
    clan_name: "Homeland Isa",
    applicant_name: "Accepted Person",
    applicant_phone_e164: "+2348000000040",
    invited_by_display: "Community Helper",
    status: "approved",
    created_at: "2026-11-17T10:00:00Z",
    approvals: 6,
    rejects: 0,
    neutrals: 0,
    required_approvals: 6,
    active_member_count: 14,
    admission_mode: "community_vote",
  },
];
let mockedAdmissionMode = "community_vote";

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      return route.fulfill(
        json({
          id: 1,
          user_id: 1,
          display_name: "GSN Member",
          gmfn_id: "GMFN-U-000001",
          role: "member",
        })
      );
    }

    if (path === "/clans/me") {
      return route.fulfill(
        json({
          items: [
            {
              id: 8,
              clan_id: 8,
              name: "Homeland Isa",
              community_code: "GMFN-C-000008",
              status: "active",
              role: "member",
            },
          ],
        })
      );
    }

    if (path === "/clans/8/select" && route.request().method() === "POST") {
      return route.fulfill(json({ ok: true, clan_id: 8 }));
    }

    if (path === "/clans/8/join-requests") {
      return route.fulfill(
        json({
          items: requests,
          total: requests.length,
          community_id: 8,
          community_code: "GMFN-C-000008",
          community_name: "Homeland Isa",
          reviewer_role: "member",
          reviewer_can_admin_approve: false,
          admission_mode: mockedAdmissionMode,
          voting_admin_override: false,
        })
      );
    }

    if (path === "/clans/8/admission-policy") {
      return route.fulfill(
        json({
          community_id: 8,
          community_name: "Homeland Isa",
          admission_mode: mockedAdmissionMode,
          voting_admin_override: false,
          can_manage: true,
        })
      );
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
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
    const routeUrl =
      "http://127.0.0.1:" +
      port +
      "/app/community/8/join-requests?request_id=41";

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-join-request-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });
    await page.goto(routeUrl, { waitUntil: "networkidle" });
    const screenshotDir = process.env.GSN_JOIN_REQUESTS_SCREENSHOT_DIR || "";
    if (screenshotDir) {
      await mkdir(screenshotDir, { recursive: true });
      await page.screenshot({
        path: join(screenshotDir, "join-requests-focused-390.png"),
        fullPage: true,
      });
    }

    const focusedSurface = page.locator(
      '[data-gsn-join-requests-phone="focused-decision"]'
    );
    await focusedSurface.waitFor();
    const activeRequest = page.locator('[data-gsn-join-request-active="41"]');
    await activeRequest.waitFor();

    assert(
      (await activeRequest.getByText("Waiting", { exact: true }).count()) === 0 &&
        (await activeRequest
          .locator('[data-gsn-join-request-status="text-only"]')
          .count()) === 1,
      "The focused request must use one text-only status and no redundant Waiting icon pill."
    );
    assert(
      await activeRequest.getByText("AnekeChinecherem", { exact: true }).isVisible(),
      "The notification request_id must open the exact person's decision card."
    );
    assert(
      (await page.getByRole("button", { name: "Approve", exact: true }).count()) === 1 &&
        (await page.getByRole("button", { name: "Ignore for now", exact: true }).count()) === 1 &&
        (await page.getByRole("button", { name: "Disapprove", exact: true }).count()) === 1,
      "The focused phone card must show exactly the three owner-approved decisions."
    );
    assert(
      await page.getByText("Check the person before you answer", { exact: true }).count() === 0 &&
        await page.getByText("Waiting", { exact: true }).count() < 3,
      "The former large introduction and counter stack must not mount on simple phone entry."
    );

    const settings = page
      .locator("details")
      .filter({ hasText: "Joining setting: Committee Voting" })
      .first();
    const pastDecisions = page
      .locator("details")
      .filter({ hasText: "Past decisions" })
      .first();
    const moreOptions = page
      .locator("details")
      .filter({ hasText: "More options" })
      .first();
    assert(
      !(await detailsIsOpen(settings)) &&
        !(await detailsIsOpen(pastDecisions)) &&
        !(await detailsIsOpen(moreOptions)),
      "Settings, history, and route tools must start closed."
    );

    await page.getByText("1 more waiting", { exact: true }).click();
    await page
      .locator("details")
      .filter({ hasText: "1 more waiting" })
      .getByRole("button", { name: "Open", exact: true })
      .click();
    await page.locator('[data-gsn-join-request-active="42"]').waitFor();
    assert(
      await page.getByText("Second Person", { exact: true }).isVisible(),
      "After notification focus, the reviewer must still be able to open another waiting person."
    );

    await settings.locator("summary").click();
    assert(
      await settings.getByText("Instant Join", { exact: true }).isVisible() &&
        await settings.getByText("Admin Approval", { exact: true }).isVisible() &&
        await settings.getByText("Committee Voting", { exact: true }).isVisible(),
      "Joining settings must use the restored owner-approved names."
    );

    if (screenshotDir) {
      await page.screenshot({
        path: join(screenshotDir, "join-requests-secondary-open-390.png"),
        fullPage: true,
      });
    }

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1
    );
    assert(!hasHorizontalOverflow, "Join Requests overflows horizontally at 390x844.");

    mockedAdmissionMode = "instant_invite";
    requests[1].admission_mode = "instant_invite";
    await page.goto(routeUrl, { waitUntil: "networkidle" });
    const noVoteRequest = page.locator('[data-gsn-join-request-active="41"]');
    await noVoteRequest.waitFor();
    assert(
      (await noVoteRequest.getByText("No vote needed", { exact: true }).count()) === 1 &&
        (await noVoteRequest.getByText("Should this person join?", { exact: true }).count()) === 0 &&
        (await noVoteRequest.getByRole("button", { name: "Approve", exact: true }).count()) === 0,
      "Instant Join must show the compact no-vote explanation without a false decision question or action."
    );
    if (screenshotDir) {
      await page.screenshot({
        path: join(screenshotDir, "join-requests-no-vote-390.png"),
        fullPage: true,
      });
    }

    console.log(
      "Community Join Requests simple-phone smoke passed: exact notification focus, text-only status, three decisions, truthful Instant Join no-vote state, closed secondary tools, restored setting names, alternate-request opening, and 390px containment."
    );
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
