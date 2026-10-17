/* global console, process, URL, localStorage */

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

const community = {
  id: 8,
  clan_id: 8,
  name: "Blessed Satch family",
  status: "active",
  membership_role: "member",
};

const requests = [
  {
    id: 72,
    user_id: 216,
    title: "Need a freezer repair",
    description: "The freezer stopped cooling yesterday.",
    category: "Repair",
    urgency: "normal",
    area: "Onitsha",
    status: "open",
    is_mine: true,
    requester_display_name: "Ada Example",
    requester_gmfn_id: "GSN-U-216",
    clan_name: community.name,
    queue_keys: ["mine"],
    visibility_scope: "community_visible",
    created_at: "2026-10-17T10:00:00Z",
  },
  {
    id: 73,
    user_id: 309,
    title: "Need school transport",
    description: "A driver is needed on weekday mornings.",
    category: "Transport",
    urgency: "high",
    area: "Awka",
    status: "open",
    requester_display_name: "Chidi Member",
    requester_gmfn_id: "GSN-U-309",
    clan_name: community.name,
    queue_keys: ["urgent", "tagged_for_me"],
    is_tagged_for_me: true,
    mentioned_member_count: 1,
    mentioned_handles: ["@GSN-U-216"],
    visibility_scope: "community_visible",
    created_at: "2026-10-17T11:00:00Z",
  },
];

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method().toUpperCase();

    if (path === "/auth/me") {
      return route.fulfill(json({
        id: 216,
        user_id: 216,
        display_name: "Ada Example",
        gmfn_id: "GSN-U-216",
        role: "member",
      }));
    }
    if (path === "/clans/me") return route.fulfill(json({ items: [community] }));
    if (path === "/community-domains/my") return route.fulfill(json({ items: [] }));
    if (path === "/clans/8/members") {
      return route.fulfill(json({
        items: [
          { user_id: 216, gmfn_id: "GSN-U-216", display_name: "Ada Example", status: "active" },
          { user_id: 309, gmfn_id: "GSN-U-309", display_name: "Chidi Member", status: "active" },
        ],
      }));
    }
    if (path === "/opportunity-relays/policies/8") {
      return route.fulfill(json({ clan_id: 8, version: 1, outbound_enabled: false, inbound_enabled: false }));
    }
    if (/^\/marketplace\/requests\/\d+\/supply-matches$/.test(path)) {
      return route.fulfill(json({ count: 0, matches: [] }));
    }
    if (path === "/marketplace/requests" && method === "GET") {
      const mineOnly = url.searchParams.get("mine_only") === "true";
      const offset = Number(url.searchParams.get("offset") || 0);
      if (offset > 0) return route.fulfill(json([]));
      return route.fulfill(json(mineOnly ? requests.filter((row) => row.is_mine) : requests));
    }
    if (path === "/marketplace/requests" && method === "POST") {
      const body = request.postDataJSON();
      return route.fulfill(json({ id: 74, user_id: 216, status: "open", is_mine: true, ...body }));
    }
    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }
    return route.continue();
  });
}

async function verifyViewport(browser, baseURL, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true });
  page.setDefaultTimeout(240000);
  page.on("pageerror", (error) => console.error("Browser page error:", error));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Browser console error:", message.text());
  });
  await installApiMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "local-demand-box-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  await page.goto(baseURL + "/app/demand-box", { waitUntil: "domcontentloaded", timeout: 180000 });
  const frontDoor = page.locator('[data-gsn-demand-front-door="simple"]');
  await frontDoor.waitFor();

  assert(await page.getByText("What do you need?", { exact: true }).isVisible(), "The short DemandBox question is missing.");
  assert(await page.getByRole("button", { name: "Post a need", exact: true }).isVisible(), "Post a need is missing.");
  assert(await page.getByRole("link", { name: "Ask a question", exact: true }).isVisible(), "Ask a question is missing.");
  assert((await frontDoor.getByRole("button").count()) === 1, "The first surface has extra buttons.");
  assert((await frontDoor.getByRole("link").count()) === 1, "The first surface has extra links.");
  assert(!(await page.getByText("Current state", { exact: true }).isVisible().catch(() => false)), "The repeated Current state card returned.");
  assert(!(await page.getByText("Routing readiness", { exact: true }).isVisible().catch(() => false)), "Technical routing copy leaked onto the member surface.");
  assert((await page.locator('[data-cta-id="demand-box.relay-policy.summary"]').count()) === 0, "Admin relay settings leaked to a member.");

  const queue = page.locator('[data-gsn-demand-queue="simple"]');
  await queue.waitFor();
  for (const label of ["All 2", "For you 1", "Yours 1"]) {
    assert(await queue.getByRole("button", { name: label, exact: true }).isVisible(), "Missing primary filter: " + label);
  }
  assert(!(await queue.getByRole("button", { name: /Tagged/ }).isVisible().catch(() => false)), "Tagged is exposed before More filters opens.");

  const cards = page.locator('[data-gsn-demand-record]');
  assert((await cards.count()) === 2, "Expected two compact request cards.");
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 0, "A phone request opened before a tap.");
  assert(!(await page.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible()), "Request detail leaked from a closed card.");

  const freezerCard = cards.filter({ hasText: "Need a freezer repair" });
  const transportCard = cards.filter({ hasText: "Need school transport" });
  await freezerCard.getByRole("button", { name: "Open", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "Opening a request did not expose exactly one card.");
  assert(await page.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible(), "Opened request detail is missing.");
  await transportCard.getByRole("button", { name: "Open", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "More than one phone request stayed open.");
  assert(!(await page.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible()), "Opening the next card did not close the first.");

  await page.locator('[data-cta-id="demand-box.more-filters"]').click();
  for (const label of ["Tagged 1", "Questions 0", "Urgent 1", "Need types 2"]) {
    assert(await queue.getByRole("button", { name: label, exact: true }).isVisible(), "Missing governed filter: " + label);
  }

  await page.getByRole("button", { name: "Post a need", exact: true }).click();
  const form = page.locator('[data-gsn-demand-create-form="simple"]');
  await form.waitFor();
  assert(await page.getByLabel("What do you need?").isVisible(), "Need field is missing.");
  assert(await page.getByLabel("Type").isVisible(), "Type field is missing.");
  assert(await page.getByLabel("Area").isVisible(), "Area field is missing.");
  assert(await page.getByRole("button", { name: "Community", exact: true }).isVisible(), "Community visibility choice is missing.");
  assert(await page.getByRole("button", { name: "One person", exact: true }).isVisible(), "One person visibility choice is missing.");
  assert(!(await page.getByLabel("Short explanation").isVisible().catch(() => false)), "Optional fields opened before More options.");
  await page.locator('[data-cta-id="demand-box.more-options"]').click();
  assert(await page.getByLabel("Short explanation").isVisible(), "Short explanation is not reachable.");
  assert(await page.getByLabel("WhatsApp number").isVisible(), "WhatsApp override is not reachable.");
  assert(await page.getByLabel("Urgency").isVisible(), "Urgency is not reachable.");
  assert(await page.getByLabel("Payment").isVisible(), "Payment preference is not reachable.");
  assert(await page.getByLabel("Proof needed").isVisible(), "Proof preference is not reachable.");
  assert(await page.getByLabel("Hours open").isVisible(), "Expiry is not reachable.");
  await page.getByRole("button", { name: "One person", exact: true }).click();
  assert(await page.getByLabel("Choose person").isVisible(), "The private person chooser did not appear.");

  const overflow = await page.locator("body").evaluate((node) => node.scrollWidth > node.clientWidth + 1);
  assert(!overflow, "DemandBox overflows at " + viewport.width + "x" + viewport.height + ".");
  await page.close();
  console.log("DemandBox simple-phone smoke passed at " + viewport.width + "x" + viewport.height + ".");
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
    await verifyViewport(browser, "http://127.0.0.1:" + port, { width: 390, height: 844 });
    await verifyViewport(browser, "http://127.0.0.1:" + port, { width: 360, height: 780 });
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
