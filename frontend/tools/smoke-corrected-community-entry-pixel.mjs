/* global console, document, process, sessionStorage, URL, window */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, devices, expect } from "@playwright/test";
import { createServer } from "vite";

const frontendRoot = process.cwd();
const screenshotDir = resolve(frontendRoot, "screenshots", "corrected-community-entry-pixel");
mkdirSync(screenshotDir, { recursive: true });

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function newPixel(browser) {
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  const page = await context.newPage();
  return { context, page };
}

async function installJoinMocks(page) {
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    if (path === "/auth/me") return json(route, { detail: "Not authenticated" }, 401);
    if (path === "/clans/join-search") {
      return json(route, {
        ok: true,
        items: [
          {
            community_id: 8,
            community_code: "GMFN-C-000008",
            community_name: "Blessed Satch Family",
            description: "Family support and practical community care.",
            admission_mode: "community_vote",
            admission_mode_label: "Community vote",
            admission_explanation: "Community members review the request. An admin may act only when override is enabled.",
          },
        ],
      });
    }
    if (path === "/entry/phone/start") {
      return json(route, { verification_id: 41, otp_preview: "123456", verified: false }, 201);
    }
    if (path === "/entry/phone/confirm") return json(route, { ok: true, verified: true });
    if (path === "/clans/search-join-requests") {
      return json(route, {
        ok: true,
        status: "pending",
        request_id: 77,
        status_token: "search-status-token",
        community_id: 8,
        community_name: "Blessed Satch Family",
        request: { id: 77 },
      }, 201);
    }
    if (path.includes("/clans/join-requests/77")) {
      return json(route, {
        status: "pending",
        request_id: 77,
        community_id: 8,
        community_name: "Blessed Satch Family",
        approvals: 0,
        required_approvals: 1,
      });
    }
    return json(route, { ok: true });
  });
}

async function runJoinJourney(browser, baseUrl) {
  const { context, page } = await newPixel(browser);
  await installJoinMocks(page);
  await page.goto(`${baseUrl}/join`, { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "Find a community" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Back to welcome" })).toHaveAttribute(
    "href",
    "/welcome"
  );
  await page.getByLabel("Community name or GSN ID").fill("Blessed");
  await page.getByRole("button", { name: "Search" }).click();
  const searchResult = page.getByRole("button", { name: /Blessed Satch Family/ });
  await expect(searchResult).toBeVisible();
  await page.screenshot({ path: resolve(screenshotDir, "00-find-community-results.png"), fullPage: true });
  await searchResult.click();
  await page.getByLabel("First name").fill("Ada");
  await page.getByLabel("Surname").fill("Nwosu");
  await page.getByLabel("Phone in international format").fill("+447700900901");
  await page.getByLabel("Country").fill("United Kingdom");
  await page.getByRole("button", { name: "Verify phone" }).click();
  await page.getByRole("button", { name: "Confirm phone" }).click();
  await page.screenshot({ path: resolve(screenshotDir, "01-find-and-ask-ready.png"), fullPage: true });
  await page.getByRole("button", { name: "Ask to join" }).click();
  await expect(page).toHaveURL(/\/pending-approval/);
  await page.screenshot({ path: resolve(screenshotDir, "02-find-and-ask-pending.png"), fullPage: true });
  await context.close();
}

async function installCreateMocks(page) {
  let activated = false;
  let communityPayload = null;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace(/^\/api/, "");
    if (path === "/auth/me") {
      return activated
        ? json(route, {
            id: 31,
            user_id: 31,
            gmfn_id: "GMFN-U-NEW1001",
            display_name: "Ife Founder",
            email: "ife@example.test",
            phone_e164: "+447700900902",
            phone_verified: true,
          })
        : json(route, { detail: "Not authenticated" }, 401);
    }
    if (path === "/entry/phone/start") {
      return json(route, { verification_id: 51, otp_preview: "654321", verified: false }, 201);
    }
    if (path === "/entry/phone/confirm") return json(route, { ok: true, verified: true });
    if (path === "/entry/identity/establish") {
      return json(route, {
        ok: true,
        user_id: 31,
        gmfn_id: "GMFN-U-NEW1001",
        display_name: "Ife Founder",
        phone_e164: "+447700900902",
        email: "ife@example.test",
        activation_token: "a".repeat(64),
        next_step: "activate-identity",
      }, 201);
    }
    if (path === "/auth/activate-membership") {
      activated = true;
      return json(route, {
        status: "activated",
        access_token: "identity-first-access-token",
        gmfn_id: "GMFN-U-NEW1001",
        phone_verified: true,
        community_id: null,
      });
    }
    if (path === "/entry/identity/community") {
      communityPayload = request.postDataJSON();
      return json(route, {
        ok: true,
        community_id: 9,
        community_name: "Ife Trusted Circle",
        result_path: "/app/community/9",
      }, 201);
    }
    return json(route, { ok: true });
  });
  return () => communityPayload;
}

async function runCreateJourney(browser, baseUrl) {
  const { context, page } = await newPixel(browser);
  const readCommunityPayload = await installCreateMocks(page);
  await page.addInitScript(() => {
    sessionStorage.setItem("gmfn_cover_welcome_session", "active");
  });
  await page.goto(`${baseUrl}/welcome?entry=create&entry_from=cover`, {
    waitUntil: "networkidle",
  });
  await expect(
    page.getByText("Create community", { exact: true }).first()
  ).toBeVisible();
  await expect(page.getByText("Founder path", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Set up the basics", { exact: true })).toHaveCount(0);
  const intentGateway = page.locator(
    '[data-welcome-intent-gateway="true"]'
  );
  await expect(intentGateway).toBeVisible();
  await expect(
    page.getByText("No invitation needed. Find one and ask to join.", {
      exact: true,
    })
  ).toBeVisible();
  const createButton = intentGateway.locator(
    '[data-cta-id="welcome.gateway.create-community"]'
  );
  const joinButton = intentGateway.locator(
    '[data-cta-id="welcome.gateway.join-community"]'
  );
  const signInButton = intentGateway.locator(
    '[data-cta-id="welcome.gateway.sign-in"]'
  );
  const createButtonBox = await createButton.boundingBox();
  const joinButtonBox = await joinButton.boundingBox();
  const signInButtonBox = await signInButton.boundingBox();
  expect(createButtonBox?.width || 0).toBeGreaterThanOrEqual(240);
  expect(createButtonBox?.height || 0).toBeGreaterThanOrEqual(52);
  expect(joinButtonBox?.width || 0).toBeGreaterThanOrEqual(240);
  expect(joinButtonBox?.height || 0).toBeGreaterThanOrEqual(48);
  expect(signInButtonBox?.width || 0).toBeGreaterThanOrEqual(80);
  expect(signInButtonBox?.height || 0).toBeGreaterThanOrEqual(40);
  const entryOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth
  );
  expect(entryOverflow).toBeLessThanOrEqual(1);
  await page.screenshot({
    path: resolve(screenshotDir, "00-community-intent-gateway.png"),
    fullPage: true,
  });

  await signInButton.click();
  await expect(page).toHaveURL(/\/login\?force=1$/);

  await page.goto(`${baseUrl}/welcome?entry=create&entry_from=cover`, {
    waitUntil: "networkidle",
  });
  await page
    .locator('[data-cta-id="welcome.gateway.join-community"]')
    .click();
  await expect(page).toHaveURL(/\/join(?:\?|$)/);
  expect(new URL(page.url()).searchParams.get("entry")).toBeNull();

  await page.goto(`${baseUrl}/welcome?entry=create&entry_from=cover`, {
    waitUntil: "networkidle",
  });
  await page
    .locator('[data-cta-id="welcome.gateway.create-community"]')
    .click();
  await expect(page).toHaveURL(/\/create(?:\?|$)/);
  expect(new URL(page.url()).searchParams.get("entry")).toBeNull();
  await expect(page.getByRole("heading", { name: "Secure your identity first" })).toBeVisible();
  await page.getByLabel("Your name").fill("Ife Founder");
  await page.getByLabel("Phone in international format").fill("+447700900902");
  await page.getByLabel("Email (optional)").fill("ife@example.test");
  await page.getByLabel("Country").fill("United Kingdom");
  await page.getByRole("button", { name: "Verify identity details" }).click();
  await page.getByRole("button", { name: "Confirm phone" }).click();
  await page.getByRole("button", { name: "Create my GSN ID" }).click();
  await expect(page).toHaveURL(/\/activate-membership/);
  await page.getByPlaceholder("Create password").fill("secret123");
  await page.getByPlaceholder("Confirm password").fill("secret123");
  await page.getByRole("button", { name: "Finish activation" }).click();
  await expect(page.getByRole("link", { name: "Continue community setup" })).toBeVisible({ timeout: 15000 });
  await page.getByRole("link", { name: "Continue community setup" }).click();
  await expect(page.getByRole("heading", { name: "Set up your community" })).toBeVisible();
  await page.getByLabel("Community name").fill("Ife Trusted Circle");
  await page.getByLabel("Short description").fill("A trusted local support community.");
  await expect(page.getByText("People joining by invitation")).toHaveCount(0);
  await expect(page.getByLabel("Let people find this community and ask to join")).toHaveCount(0);
  await page.screenshot({ path: resolve(screenshotDir, "03-identity-first-community-setup.png"), fullPage: true });
  await page.getByRole("button", { name: "Create community" }).click();
  await expect(page).toHaveURL(/\/app\/community\/9/);
  expect(readCommunityPayload()).toMatchObject({
    invite_admission_mode: "instant_invite",
    invite_admin_override: false,
    search_join_enabled: false,
    search_join_admission_mode: "community_vote",
    search_join_admin_override: false,
  });
  await context.close();
}

async function runInvitationBypass(browser, baseUrl) {
  const { context, page } = await newPixel(browser);
  await installJoinMocks(page);
  await page.addInitScript(() => {
    sessionStorage.setItem("gmfn_cover_welcome_session", "active");
  });
  await page.goto(
    `${baseUrl}/welcome?entry=invite&entry_from=cover&code=review-invite&qr_policy=card-share`,
    { waitUntil: "domcontentloaded" }
  );
  await expect(page).toHaveURL(/\/join\/review-invite\?qr_policy=card-share$/);
  await expect(page.getByText("Open your invitation path.", { exact: true })).toHaveCount(0);
  await context.close();
}

async function main() {
  const server = await createServer({
    root: frontendRoot,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Vite smoke URL was not available.");
  const browser = await chromium.launch();
  try {
    await runInvitationBypass(browser, baseUrl);
    await runJoinJourney(browser, baseUrl);
    await runCreateJourney(browser, baseUrl);
  } finally {
    await browser.close();
    await server.close();
  }
  console.log(`Corrected community entry Pixel 5 smoke passed: ${screenshotDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
