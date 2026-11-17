/* global console, process, URL, localStorage, document, getComputedStyle */

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

async function installApiMocks(page) {
  const notification = {
    id: 701,
    kind: "community_verification.request_confirmation",
    title: "Community verification request",
    message: "Person checking the public record requested controlled confirmation for Homeland isa.",
    action_label: "Respond",
    action_url: "/app/community-confirmations?community_verification_request_id=701&community_id=8",
    is_read: false,
    created_at: "2026-11-17T09:00:00Z",
  };

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me" || path === "/users/me") {
      return route.fulfill(json({
        id: 216,
        user_id: 216,
        display_name: "Ada Example",
        gmfn_id: "GMFN-U-63655DE6",
        role: "member",
      }));
    }

    if (path === "/clans/me") {
      return route.fulfill(json({
        items: [{ id: 8, clan_id: 8, name: "Homeland isa", status: "active" }],
      }));
    }

    if (path === "/clans/8") {
      return route.fulfill(json({ id: 8, clan_id: 8, name: "Homeland isa", status: "active" }));
    }

    if (path === "/notifications/me/unread-count") {
      return route.fulfill(json({ unread_count: 1 }));
    }

    if (path === "/notifications/me") {
      return route.fulfill(json({ items: [notification] }));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
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

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-action-inbox-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem("gmfn.notifications.ui.v2", JSON.stringify({
        focus: false,
        buckets: false,
        rawFeed: false,
        reading: false,
      }));
    });

    await page.goto(`http://127.0.0.1:${port}/app/notifications`, { waitUntil: "networkidle" });
    const focus = page.locator('[data-gsn-action-inbox-phone-focus="true"]');
    const more = page.locator('[data-gsn-action-inbox-phone-more="true"]');
    await focus.waitFor();
    await page.getByText("Community verification", { exact: true }).waitFor();

    assert(await page.getByText("Next", { exact: true }).isVisible(), "Compact Next label is missing.");
    assert(await page.getByRole("button", { name: "Respond", exact: true }).isVisible(), "Plain Respond action is missing.");
    assert((await page.getByText("What needs you now", { exact: true }).count()) === 0, "Old oversized heading is still rendered.");
    const visibleDescriptionCount = await page.getByText(/Person checking the public record/).evaluateAll(
      (nodes) => nodes.filter((node) => {
        const style = getComputedStyle(node);
        return style.display !== "none" && style.visibility !== "hidden" && node.getBoundingClientRect().height > 0;
      }).length
    );
    assert(visibleDescriptionCount === 0, "Long notification description leaked onto the phone first surface.");
    assert((await page.getByText("Other items", { exact: true }).count()) === 0, "Old secondary heading is still rendered.");

    const geometry = await page.evaluate(() => {
      const focusNode = document.querySelector('[data-gsn-action-inbox-phone-focus="true"]');
      const moreNode = document.querySelector('[data-gsn-action-inbox-phone-more="true"]');
      const focusStyle = focusNode ? getComputedStyle(focusNode) : null;
      return {
        focusHeight: focusNode?.getBoundingClientRect().height || 0,
        moreHeight: moreNode?.getBoundingClientRect().height || 0,
        focusRadius: focusStyle?.borderRadius || "",
        pageOverflows: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
      };
    });
    assert(geometry.focusHeight > 0 && geometry.focusHeight <= 170, `Focus card is too tall: ${geometry.focusHeight}px.`);
    assert(geometry.moreHeight > 0 && geometry.moreHeight <= 66, `More row is too tall: ${geometry.moreHeight}px.`);
    assert(geometry.focusRadius === "18px", `Unexpected compact focus radius: ${geometry.focusRadius}.`);
    assert(!geometry.pageOverflows, "Action Inbox overflows horizontally on phone.");
    assert((await page.locator('[data-cta-id^="notifications.bucket."]').count()) === 0, "More groups opened from obsolete saved state.");

    await more.getByRole("button", { name: "Open", exact: true }).click();
    const bucketRows = page.locator('[data-cta-id^="notifications.bucket."]');
    assert((await bucketRows.count()) === 4, "More must reveal exactly four compact groups.");
    const rowHeights = await bucketRows.evaluateAll((nodes) => nodes.map((node) => node.getBoundingClientRect().height));
    assert(rowHeights.every((height) => height <= 60), `A More row is too tall: ${rowHeights.join(", ")}.`);

    const screenshotDir = process.env.GSN_ACTION_INBOX_SCREENSHOT_DIR;
    if (screenshotDir) {
      await page.screenshot({ path: join(screenshotDir, "action-inbox-simple-phone.png"), fullPage: true });
    }

    await page.close();
    console.log("Action Inbox phone smoke passed: one short task, one plain action, closed More row, compact groups, and no stale disclosure state.");
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
