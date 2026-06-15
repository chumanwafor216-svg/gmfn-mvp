/* global console, document, process, URL, window */

import { chromium, devices, expect } from "@playwright/test";

const FRONTEND_URL =
  process.env.GMFN_FRONTEND_URL || "https://gmfn-frontend.onrender.com";

const pixel5 = devices["Pixel 5"];
const community = {
  id: 8,
  clan_id: 8,
  name: "Homeland isa",
  clan_name: "Homeland isa",
  description: "Peace love and harmony",
  marketplace_name: "Homeland isa Marketplace",
  community_code: "GMFN-C-000008",
  invite_code: "Up3zeGLZRzJckg",
  role: "owner",
  member_role: "owner",
  member_count: 0,
};
const me = {
  id: 31,
  user_id: 31,
  gmfn_id: "GMFN-M-050316",
  display_name: "CHUKWUMA NWAFOR",
  name: "CHUKWUMA NWAFOR",
  role: "member",
};
const shop = {
  id: 5,
  clan_id: 8,
  owner_user_id: 31,
  owner_gmfn_id: me.gmfn_id,
  name: "Homeland isa Marketplace",
  description: "Peace love and harmony",
  status: "active",
  is_active: true,
  products: [],
};
const inviteLink =
  `${FRONTEND_URL}/start/join/${community.invite_code}` +
  `?invite=${community.invite_code}` +
  `&community_code=${community.community_code}` +
  `&community_name=${encodeURIComponent(community.name)}`;

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function pathOf(requestUrl) {
  const url = new URL(requestUrl);
  return `${url.pathname}${url.search}`;
}

async function mockApi(route) {
  const request = route.request();
  const url = new URL(request.url());
  if (!/gmfn-api\.onrender\.com$/i.test(url.hostname)) {
    return route.continue();
  }

  const path = pathOf(request.url());
  const method = request.method().toUpperCase();

  if (path.startsWith("/auth/me")) return json(route, me);
  if (path.startsWith("/clans/me")) {
    return json(route, { items: [community], total: 1 });
  }
  if (path.startsWith("/clans/8/members")) return json(route, []);
  if (path.startsWith("/clans/8/invite-link")) {
    return json(route, {
      invite_code: community.invite_code,
      invite_link: inviteLink,
      invite_url: inviteLink,
    });
  }
  if (path.startsWith("/clans/8/invite") && method === "POST") {
    return json(route, {
      invite_code: community.invite_code,
      invite_link: inviteLink,
      invite_url: inviteLink,
      relationship_evidence_recorded: true,
    });
  }
  if (path.startsWith("/marketplace/shops/me")) return json(route, shop);
  if (path.startsWith("/marketplace/shops/5/spotlight-status")) {
    return json(route, { available_credits: 0, active: false });
  }
  if (path.startsWith("/marketplace/shops")) {
    return json(route, { items: [shop], total: 1 });
  }
  if (path.startsWith("/marketplace/products")) {
    return json(route, { items: [], total: 0 });
  }
  if (path.startsWith("/marketplace/broadcasts")) {
    return json(route, { items: [], total: 0 });
  }
  if (path.startsWith("/payment-instructions/community-package/status")) {
    return json(route, { items: [], total: 0 });
  }
  if (path.startsWith("/payment-instructions/my/expected")) {
    return json(route, { items: [], total: 0 });
  }
  if (path.startsWith("/rosca/cycles")) return json(route, { items: [] });
  if (path.startsWith("/loans")) return json(route, []);
  if (path.includes("trust") || path.includes("pool") || path.includes("money")) {
    return json(route, {});
  }

  if (method === "GET") return json(route, { items: [], total: 0 });
  return json(route, { ok: true });
}

async function clickByDebugId(page, debugId) {
  const action = page.locator(`[data-cta-id="${debugId}"]`).first();
  await expect(action, `Missing action ${debugId}`).toBeVisible({ timeout: 15000 });
  await action.scrollIntoViewIfNeeded();
  await action.click();
}

async function main() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    ...pixel5,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  await context.addInitScript(() => {
    window.localStorage.clear();
    window.localStorage.setItem("access_token", "smoke-token");
    window.localStorage.setItem("gmfn_current_id", "GMFN-M-050316");
    window.localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/*", mockApi);

  await page.goto(`${FRONTEND_URL}/app/marketplace#marketplace-owned-links`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});

  const sender = page.locator("#marketplace-join-sender-name");
  const joinChooser = page.locator('[data-cta-id="marketplace.links.choose.join"]');
  const joinFormAlreadyOpen = await sender.isVisible().catch(() => false);

  if (!joinFormAlreadyOpen && !(await joinChooser.first().isVisible().catch(() => false))) {
    await clickByDebugId(page, "marketplace.row.records-links");
  }
  if (!(await sender.isVisible().catch(() => false))) {
    await clickByDebugId(page, "marketplace.links.choose.join");
  }

  const receiver = page.locator("#marketplace-join-recipient-name");
  const note = page.locator("#marketplace-join-invite-note");
  const relationship = page.locator("#marketplace-join-relationship-type");
  const duration = page.locator("#marketplace-join-known-duration");
  const privateNote = page.locator("#marketplace-join-relationship-context");

  for (const field of [sender, receiver, note, relationship, duration, privateNote]) {
    await expect(field).toBeVisible({ timeout: 15000 });
  }

  await sender.fill("Chukwuma Nwafor");
  await receiver.fill("Nwanyiocha");
  await note.fill("Join us");
  await relationship.selectOption("friendship");
  await duration.selectOption("over_5_years");
  await privateNote.fill("Known through the community and trusted personally.");

  await expect(sender).toHaveValue("Chukwuma Nwafor");
  await expect(receiver).toHaveValue("Nwanyiocha");
  await expect(note).toHaveValue("Join us");
  await expect(relationship).toHaveValue("friendship");
  await expect(duration).toHaveValue("over_5_years");

  await page.waitForTimeout(3500);
  await clickByDebugId(page, "marketplace.links.join.refresh");
  await expect(page.locator('[data-cta-id="marketplace.links.join.copy-message"]')).toBeEnabled({
    timeout: 15000,
  });
  await expect(page.locator('[data-cta-id="marketplace.links.join.whatsapp"]')).toBeEnabled({
    timeout: 15000,
  });

  const activeElementId = await page.evaluate(() => document.activeElement?.id || "");
  const fieldRoots = await page.locator('[data-gmfn-field-root="true"]').count();

  await browser.close();

  if (consoleErrors.length || pageErrors.length) {
    console.error("Live Marketplace Join smoke found runtime errors:");
    for (const error of [...consoleErrors, ...pageErrors]) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(
    [
      "Live Marketplace Join smoke passed:",
      "deployed Marketplace loaded with mocked authenticated data;",
      "Public Links opened;",
      "Invite Someone opened;",
      "sender, receiver, note, relationship, duration, and private note accepted input;",
      "Prepare Link completed;",
      "Copy Invite and WhatsApp were enabled.",
      `fieldRoots=${fieldRoots}`,
      `activeElement=${activeElementId || "none"}`,
    ].join(" ")
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
