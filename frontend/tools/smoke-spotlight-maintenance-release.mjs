/* global console, process, document, window */

import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const activatedAt = "2026-10-16T14:35:00Z";
const authorizedExpiry = "2026-10-17T14:35:00Z";
const shop = {
  id: 101,
  shop_id: 101,
  clan_id: 8,
  owner_user_id: 216,
  gmfn_id: "GSN-SPOTLIGHT-OWNER",
  owner_gmfn_id: "GSN-SPOTLIGHT-OWNER",
  name: "Synthetic Spotlight Shop",
  shop_name: "Synthetic Spotlight Shop",
  description: "Synthetic local browser qualification shop.",
  is_active: true,
};
const product = {
  id: 1,
  product_id: 1,
  shop_id: 101,
  clan_id: 8,
  seller_user_id: 216,
  title: "Synthetic public product",
  name: "Synthetic public product",
  description: "Public product access remains available.",
  price: "10.00",
  currency: "TST",
  visibility_mode: "community_visible",
  is_active: true,
  public_block_number: 1,
  slot_number: 1,
};
const clan = {
  id: 8,
  clan_id: 8,
  name: "Synthetic Community",
  marketplace_name: "Synthetic Community Market",
  community_code: "SYNTHETIC-QC",
  role: "admin",
  member_role: "admin",
  status: "active",
};
const me = {
  id: 216,
  user_id: 216,
  display_name: "Synthetic Owner",
  email: "synthetic-owner@example.invalid",
  gmfn_id: "GSN-SPOTLIGHT-OWNER",
  role: "member",
  phone_verified: true,
  status: "active",
};

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function within(promise, label, timeoutMs = 15_000) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Timed out waiting for ${label}`)), timeoutMs)
    ),
  ]);
}
function apiPath(urlText) {
  const url = new URL(urlText);
  return url.pathname.replace(/^\/api/, "");
}

function isApi(urlText) {
  const url = new URL(urlText);
  return url.port === "8000" || ["/api/", "/auth/", "/clans/", "/community-domains", "/dashboard", "/marketplace", "/notifications", "/payment-instructions", "/pool", "/protected-trades", "/rosca", "/shop-diaries", "/trust"].some((prefix) => url.pathname.startsWith(prefix));
}

function canonicalItem(label, expiresAt) {
  return {
    id: 501,
    broadcast_id: 501,
    shop_id: 101,
    clan_id: 8,
    author_user_id: 216,
    message: label,
    image_url: null,
    video_url: null,
    priority_mode: "free",
    visibility_scope: "direct_communities",
    expires_at: authorizedExpiry,
    authorized_expires_at: authorizedExpiry,
    serving_status: "serving",
    campaign_serving_status: "serving",
    content_version: 1,
    is_canonical_opportunity: true,
    opportunity_campaign_id: 701,
    spotlight_campaign_id: 701,
    opportunity_presentation_id: `presentation-${label}`,
    opportunity_presentation_token: `synthetic-presentation-token-${label}-123456789`,
    opportunity_presentation_expires_at: expiresAt,
    opportunity_presentation_surface: "public_shop_spotlight_rail",
  };
}

function genericPayload(path) {
  if (path === "/auth/me" || path === "/users/me") return me;
  if (path === "/clans/me") return { items: [clan] };
  if (path.includes("/clans/select")) return { selected_clan_id: 8 };
  if (path.startsWith("/marketplace/shops/me")) return { item: shop, shop, products: [product] };
  if (path.startsWith("/marketplace/products")) return { items: [product], products: [product] };
  if (path.startsWith("/marketplace/shops")) return { item: shop, shop, items: [shop], products: [product] };
  if (path.startsWith("/community-domains")) return { items: [] };
  if (path.startsWith("/dashboard")) return { community: clan, totals: {}, spotlight: null };
  if (path.startsWith("/trust-slips/me")) return { active: true, verified: true, code: "SYNTHETIC" };
  if (path.startsWith("/trust")) return { score: 0, band: "Not shown", events: [] };
  return { items: [], results: [], records: [], total: 0, status: "ok" };
}

async function newAuthenticatedPage(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "synthetic-spotlight-owner-token");
    localStorage.setItem("gmfn_auth_token", "synthetic-spotlight-owner-token");
    localStorage.setItem("token", "synthetic-spotlight-owner-token");
    localStorage.setItem("gmfn_current_id", "GSN-SPOTLIGHT-OWNER");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.setItem("selected_clan_id", "8");
    localStorage.setItem("gmfn_companion_settings_local", JSON.stringify({ companionMode: "off" }));
  });
  return { context, page };
}

async function testLostPublicationRetry(browser, baseUrl) {
  console.log("browser-case: lost-publication-retry");
  const { context, page } = await newAuthenticatedPage(browser);
  const keys = [];
  let postCount = 0;
  let published = false;
  let firstAbortResolve;
  let secondPostResolve;
  const firstAborted = new Promise((resolve) => { firstAbortResolve = resolve; });
  const secondPosted = new Promise((resolve) => { secondPostResolve = resolve; });
  await page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === "/marketplace/broadcasts" && route.request().method() === "POST") {
      postCount += 1;
      const payload = route.request().postDataJSON();
      keys.push(payload.idempotency_key);
      if (postCount === 1) {
        published = true;
        firstAbortResolve();
        await route.abort("failed");
        return;
      }
      const item = activeOwnerSpotlight({ lifecycleEnabled: false });
      await route.fulfill(json({ ok: true, item, items: [item], idempotent_replay: published, credit_consumed_by_replay: false }));
      secondPostResolve();
      return;
    }
    if (path === "/marketplace/broadcasts") return route.fulfill(json({ items: [] }));
    await route.fulfill(json(genericPayload(path)));
  });
  await page.goto(`${baseUrl}/app/shop-control#shop-control-spotlight`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByPlaceholder("Fish for sale").fill("Synthetic offer");
  await page.getByPlaceholder("Available today. Message me on WhatsApp to order.").fill("Synthetic retry publication");
  await page.locator('[data-cta-id="shop-control.spotlight.upload.preview"]').click();
  const publish = page.locator('[data-cta-id="shop-control.spotlight.preview.publish"]');
  await publish.click();
  await within(firstAborted, "first aborted publication");
  await page.waitForFunction(() => {
    const button = document.querySelector('[data-cta-id="shop-control.spotlight.preview.publish"]');
    return button instanceof HTMLButtonElement && !button.disabled && !button.textContent?.includes("Publishing");
  });
  await page.waitForTimeout(1_200);
  await publish.click({ force: true });
  try {
    await within(secondPosted, "second publication request");
  } catch (error) {
    const body = await page.locator("body").innerText();
    throw new Error(`${error.message}; postCount=${postCount}; body=${body.slice(-1800)}`);
  }
  if (keys.length !== 2 || !keys[0] || keys[0] !== keys[1]) throw new Error(`Lost-response retry changed publication identity: ${JSON.stringify(keys)}`);
  await context.close();
  return { publicationPosts: postCount, stableIdempotencyKey: true };
}

async function testFlagsOffOwnerControls(browser, baseUrl) {
  console.log("browser-case: flags-off-owner-controls");
  const { context, page } = await newAuthenticatedPage(browser);
  await page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === "/marketplace/broadcasts") {
      const item = activeOwnerSpotlight({ lifecycleEnabled: false });
      return route.fulfill(json({ items: [item] }));
    }
    await route.fulfill(json(genericPayload(path)));
  });
  await page.goto(`${baseUrl}/app/shop-control#shop-control-spotlight`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  const correct = page.locator('[data-cta-id="shop-control.spotlight.live.correct"]');
  const withdraw = page.locator('[data-cta-id="shop-control.spotlight.live.take-down"]');
  await correct.waitFor({ state: "visible", timeout: 15_000 });
  if (!(await correct.isDisabled()) || !(await withdraw.isDisabled())) {
    throw new Error("Flags-off lifecycle controls were reachable by the synthetic owner.");
  }
  const body = await page.locator("body").innerText();
  if (!body.includes("These actions remain disabled")) throw new Error("Flags-off explanation was not rendered.");
  await context.close();
  return { flagsOffControlsDisabled: true, truthfulStatusVisible: true };
}

async function testEnabledLifecycleActions(browser, baseUrl) {
  console.log("browser-case: enabled-correction-and-withdrawal");
  const correction = await newAuthenticatedPage(browser);
  let holdCalls = 0;
  let replacementCalls = 0;
  let replacementPayload = null;
  let replacementResolve;
  const replacementPosted = new Promise((resolve) => { replacementResolve = resolve; });
  await correction.page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === "/marketplace/broadcasts") {
      return route.fulfill(
        json({ items: [activeOwnerSpotlight({ lifecycleEnabled: true })] })
      );
    }
    if (path.endsWith("/correction-hold")) {
      holdCalls += 1;
      return route.fulfill(json({ ok: true }));
    }
    if (path.endsWith("/replace")) {
      replacementCalls += 1;
      replacementPayload = route.request().postDataJSON();
      const item = {
        ...activeOwnerSpotlight({ lifecycleEnabled: true }),
        message: replacementPayload.message,
        content_version: 2,
      };
      replacementResolve();
      return route.fulfill(json({ ok: true, item, items: [item] }));
    }
    await route.fulfill(json(genericPayload(path)));
  });
  await correction.page.goto(`${baseUrl}/app/shop-control#shop-control-spotlight`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const correct = correction.page.locator(
    '[data-cta-id="shop-control.spotlight.live.correct"]'
  );
  await correct.waitFor({ state: "visible", timeout: 15_000 });
  if (await correct.isDisabled()) throw new Error("Enabled correction control stayed disabled.");
  await correct.click();
  await correction.page.getByText("Correction hold is active").first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await correction.page
    .getByPlaceholder("Available today. Message me on WhatsApp to order.")
    .fill("Corrected synthetic wording");
  await correction.page
    .locator('[data-cta-id="shop-control.spotlight.upload.preview"]')
    .click();
  await correction.page.waitForTimeout(1_200);
  await correction.page
    .locator('[data-cta-id="shop-control.spotlight.preview.publish"]')
    .click({ force: true });
  await within(replacementPosted, "replacement request");
  if (holdCalls !== 1 || replacementCalls !== 1) {
    throw new Error(`Correction calls were not one each: hold=${holdCalls}, replace=${replacementCalls}`);
  }
  if (replacementPayload?.message !== "Corrected synthetic wording") {
    throw new Error("Replacement payload did not preserve the corrected wording.");
  }
  await correction.context.close();

  const withdrawal = await newAuthenticatedPage(browser);
  let withdrawalCalls = 0;
  await withdrawal.page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === "/marketplace/broadcasts") {
      return route.fulfill(
        json({ items: [activeOwnerSpotlight({ lifecycleEnabled: true })] })
      );
    }
    if (path.endsWith("/withdraw")) {
      withdrawalCalls += 1;
      return route.fulfill(json({ ok: true, credit_restored: false, unused_time_restored: false }));
    }
    await route.fulfill(json(genericPayload(path)));
  });
  withdrawal.page.on("dialog", (dialog) => dialog.accept());
  await withdrawal.page.goto(`${baseUrl}/app/shop-control#shop-control-spotlight`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  const withdraw = withdrawal.page.locator(
    '[data-cta-id="shop-control.spotlight.live.take-down"]'
  );
  await withdraw.waitFor({ state: "visible", timeout: 15_000 });
  if (await withdraw.isDisabled()) throw new Error("Enabled withdrawal control stayed disabled.");
  await withdraw.click();
  await withdrawal.page.getByText(
    "Spotlight permanently withdrawn. No credit or unused time was restored."
  ).first().waitFor({ state: "visible", timeout: 15_000 });
  if (withdrawalCalls !== 1) throw new Error(`Expected one withdrawal request, received ${withdrawalCalls}.`);
  await withdrawal.context.close();
  return {
    correctionHoldCalls: holdCalls,
    replacementCalls,
    withdrawalCalls,
    originalActivation: activatedAt,
    originalExpiry: authorizedExpiry,
  };
}

async function installPublicMocks(page, scenario) {
  await page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === "/marketplace/public/shop/GSN-SPOTLIGHT-OWNER") {
      return route.fulfill(json({ ok: true, item: shop, shop, products: [product], broadcasts: [] }));
    }
    if (path.endsWith("/spotlight-opportunity")) {
      scenario.selectionCalls += 1;
      scenario.requestIds.push(route.request().headers()["x-spotlight-presentation-request-id"] || "");
      if (scenario.kind === "network-failure") return route.abort("failed");
      if (scenario.delayMs) await new Promise((resolve) => setTimeout(resolve, scenario.delayMs));
      if (scenario.kind === "invalidated" && scenario.selectionCalls > 1) {
        return route.fulfill(json({ serving_contract_version: 2, item: null, presentation: null }));
      }
      const expires = scenario.kind === "expired-before-response"
        ? new Date(scenario.requestStartedAt + 100).toISOString()
        : new Date(Date.now() + 20_000).toISOString();
      const item = canonicalItem(scenario.label, expires);
      return route.fulfill(json({ serving_contract_version: 2, item, presentation: { presentation_id: item.opportunity_presentation_id, presentation_token: item.opportunity_presentation_token, presentation_expires_at: expires } }));
    }
    if (path === "/marketplace/spotlight-presentations/revalidate") {
      scenario.revalidationCalls += 1;
      return route.fulfill(
        json(
          scenario.invalidateNow
            ? { valid: false, rejection_code: scenario.rejectionCode || "withdrawn" }
            : { valid: true }
        )
      );
    }
    if (path === "/marketplace/broadcasts") {
      return route.fulfill(json({ items: [{ ...activeOwnerSpotlight({ lifecycleEnabled: false }), message: "Forbidden legacy fallback" }] }));
    }
    await route.fulfill(json(genericPayload(path)));
  });
}

async function runPublicScenario(browser, baseUrl, scenario) {
  console.log(`browser-case: ${scenario.kind}`);
  const { context, page } = await newAuthenticatedPage(browser);
  await installPublicMocks(page, scenario);
  const navigation = page.goto(`${baseUrl}/shop/GSN-SPOTLIGHT-OWNER#public-shop-spotlight`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  if (scenario.triggerDuringLoad) {
    await page.waitForTimeout(100);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  }
  await navigation;
  await page.getByText("Synthetic public product").first().waitFor({ state: "visible", timeout: 15_000 });
  await page.waitForTimeout(Math.max(300, scenario.delayMs || 0));
  const body = await page.locator("body").innerText();
  if (body.includes("Forbidden legacy fallback")) throw new Error(`${scenario.kind} knowingly rendered legacy fallback.`);
  const visibleInitially = body.includes(scenario.label);
  if (scenario.expectVisible !== visibleInitially) {
    throw new Error(
      `${scenario.kind} visibility mismatch; visible=${visibleInitially}; selectionCalls=${scenario.selectionCalls}; requestIds=${JSON.stringify(scenario.requestIds)}; body=${body.slice(0, 1800)}`
    );
  }
  if (scenario.kind === "invalidated") {
    scenario.invalidateNow = true;
    await page.evaluate(() => {
      let state = "hidden";
      Object.defineProperty(document, "visibilityState", { configurable: true, get: () => state });
      document.dispatchEvent(new Event("visibilitychange"));
      state = "visible";
      document.dispatchEvent(new Event("visibilitychange"));
    });
    await page.waitForFunction((label) => !document.body.textContent?.includes(label), scenario.label, { timeout: 15_000 });
    if (scenario.revalidationCalls < 1) throw new Error("Hidden-page resume did not revalidate the active presentation.");
  }
  await context.close();
  return { kind: scenario.kind, selectionCalls: scenario.selectionCalls, revalidationCalls: scenario.revalidationCalls, visibleInitially };
}

async function testAnonymousPublicAccess(browser, baseUrl) {
  console.log("browser-case: anonymous-public-access");
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true });
  const page = await context.newPage();
  let canonicalCalls = 0;
  await page.route("**/*", async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === "/marketplace/public/shop/GSN-SPOTLIGHT-OWNER") return route.fulfill(json({ ok: true, item: shop, shop, products: [product], broadcasts: [] }));
    if (path.endsWith("/spotlight-opportunity")) canonicalCalls += 1;
    await route.fulfill(json(genericPayload(path)));
  });
  await page.goto(`${baseUrl}/shop/GSN-SPOTLIGHT-OWNER`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Synthetic public product").first().waitFor({ state: "visible", timeout: 15_000 });
  if (canonicalCalls !== 0) throw new Error("Anonymous public access unexpectedly entered authenticated Spotlight distribution.");
  await context.close();
  return { productVisible: true, canonicalDistributionCalls: canonicalCalls };
}

const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 5199, strictPort: true },
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });

try {
  const results = [];
  results.push(await testLostPublicationRetry(browser, baseUrl));
  results.push(await testFlagsOffOwnerControls(browser, baseUrl));
  results.push(await testEnabledLifecycleActions(browser, baseUrl));
  results.push(await runPublicScenario(browser, baseUrl, { kind: "expired-before-response", label: "Expired delayed presentation", requestStartedAt: Date.now(), delayMs: 700, triggerDuringLoad: true, expectVisible: false, selectionCalls: 0, revalidationCalls: 0, requestIds: [] }));
  results.push(await runPublicScenario(browser, baseUrl, { kind: "network-failure", label: "Network failure presentation", requestStartedAt: Date.now(), expectVisible: false, selectionCalls: 0, revalidationCalls: 0, requestIds: [] }));
  results.push(await runPublicScenario(browser, baseUrl, { kind: "invalidated", label: "Withdrawn active presentation", requestStartedAt: Date.now(), expectVisible: true, selectionCalls: 0, revalidationCalls: 0, requestIds: [], rejectionCode: "withdrawn" }));
  results.push(await testAnonymousPublicAccess(browser, baseUrl));
  console.log(JSON.stringify({ ok: true, environment: "local Vite + mocked synthetic API", results }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
function activeOwnerSpotlight({ lifecycleEnabled }) {
  return {
    ...canonicalItem("Owner active Spotlight", new Date(Date.now() + 30_000).toISOString()),
    activated_at: activatedAt,
    authorized_expires_at: authorizedExpiry,
    opportunity_presentation_token: null,
    is_canonical_opportunity: false,
    lifecycle_writers_enabled: lifecycleEnabled,
  };
}
