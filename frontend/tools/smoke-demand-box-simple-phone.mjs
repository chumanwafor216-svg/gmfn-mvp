/* global console, process, URL, localStorage, getComputedStyle */

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
    relay_consent_granted: true,
    whatsapp_number: "+447700900216",
    payment_mode: "Agree directly",
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
  page.setDefaultTimeout(45000);
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

  assert(await page.getByText("Find what you need", { exact: true }).isVisible(), "The human-first DemandBox title is missing.");
  assert(await page.getByText("Ask, request or get help from people in Blessed Satch family.", { exact: true }).isVisible(), "The plain DemandBox explanation is missing.");
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
  assert((await cards.count()) === 1, "The phone queue should begin with one compact request preview.");
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 0, "A phone request opened before a tap.");
  assert(!(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible()), "Request detail leaked from a closed card.");

  const transportCard = cards.filter({ hasText: "Need school transport" });
  await transportCard.getByRole("button", { name: "Open", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "Opening a request did not expose exactly one card.");
  assert(await transportCard.locator('[data-gsn-demand-request-hero="request"]').isVisible(), "Opened request hero is missing.");
  assert(!(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible()), "Request detail leaked before the user asked.");
  assert(!(await page.getByText("Source: DemandBox", { exact: true }).isVisible()), "Technical request details opened before the user asked.");
  await transportCard
    .locator('[data-cta-id$=".request-details"]')
    .evaluate((element) => element.click());
  assert(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible(), "Opened request detail is missing.");
  assert(await page.getByText("Source: DemandBox", { exact: true }).isVisible(), "Request details are not reachable.");

  await page.getByRole("button", { name: "View more needs", exact: true }).click();
  assert((await cards.count()) === 2, "View more needs did not reveal the remaining request preview.");
  const freezerCard = cards.filter({ hasText: "Need a freezer repair" });
  await freezerCard.getByRole("button", { name: "Open", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "More than one phone request stayed open.");
  assert(!(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible()), "Opening the next card did not close the first.");

  const ownerHero = freezerCard.locator('[data-gsn-demand-request-hero="request"]');
  await ownerHero.waitFor();
  assert(await freezerCard.getByText("Open request", { exact: true }).isVisible(), "The truthful request status is missing from the visual hero.");
  assert(await freezerCard.getByText("Need a freezer repair", { exact: true }).isVisible(), "The real request title is missing from the visual hero.");
  const heroBackground = await ownerHero.evaluate((node) => getComputedStyle(node).backgroundImage);
  assert(!heroBackground.includes("url("), "The category-neutral request hero unexpectedly contains a photo.");

  const compactTabs = freezerCard.locator('[data-gsn-demand-detail-tabs="compact"]');
  assert((await compactTabs.getByRole("button").count()) === 2, "The compact request/privacy tabs are incomplete.");
  assert(!(await freezerCard.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible()), "Request details opened before the member asked.");
  await compactTabs.getByRole("button", { name: "Request details", exact: true }).click();
  assert(await freezerCard.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible(), "Request details did not open.");
  assert(await freezerCard.getByText("Source: DemandBox", { exact: true }).isVisible(), "Request evidence did not remain reachable.");
  await compactTabs.getByRole("button", { name: "Privacy & terms", exact: true }).click();
  assert(await freezerCard.locator('[data-gsn-demand-detail-panel="privacy"]').isVisible(), "Privacy & terms did not open.");
  await compactTabs.getByRole("button", { name: "Privacy & terms", exact: true }).click();

  const expandedSearch = freezerCard.locator('[data-gsn-demand-expand-search="true"]');
  assert(await expandedSearch.getByText("No match in this community yet", { exact: true }).isVisible(), "The compact no-match state is missing.");
  assert(await expandedSearch.getByRole("button", { name: "Search in one other community", exact: true }).isVisible(), "The compact one-hop search action is missing.");
  assert(await expandedSearch.getByRole("button", { name: "Stop expanded search", exact: true }).isVisible(), "Withdrawable relay consent is missing.");

  const actionDock = freezerCard.locator('[data-gsn-demand-action-dock="compact"]');
  assert((await actionDock.getByRole("button").count()) === 5, "The owner action dock must contain five actions.");
  for (const label of ["Fulfilled", "Cancel", "Copy request", "WhatsApp Chat", "WhatsApp Call"]) {
    assert(await actionDock.getByRole("button", { name: label, exact: true }).isVisible(), "Missing compact owner action: " + label);
  }
  assert(await freezerCard.locator('[data-gsn-demand-brand-banner="true"]').isVisible(), "The compact DemandBox identity banner is missing.");

  const focusGeometry = await freezerCard.evaluate((card) => {
    const hero = card.querySelector('[data-gsn-demand-request-hero="request"]');
    const dock = card.querySelector('[data-gsn-demand-action-dock="compact"]');
    const actionRects = dock ? Array.from(dock.children).map((node) => node.getBoundingClientRect()) : [];
    return {
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      actionCount: actionRects.length,
      oneActionRow: actionRects.length > 0 && actionRects.every((rect) => Math.abs(rect.top - actionRects[0].top) <= 1),
      noOverflow: card.scrollWidth <= card.clientWidth + 1,
    };
  });
  assert(focusGeometry.heroHeight >= 200 && focusGeometry.heroHeight <= 230, "The request hero is outside the compact height boundary.");
  assert(focusGeometry.actionCount === 5 && focusGeometry.oneActionRow, "The five owner actions did not remain in one compact row.");
  assert(focusGeometry.noOverflow, "The opened request card overflows horizontally.");

  const screenshotPath = process.env.GSN_DEMAND_BOX_SCREENSHOT_PATH?.trim();
  if (screenshotPath && viewport.width === 390) {
    await freezerCard.screenshot({ path: screenshotPath });
  }

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
