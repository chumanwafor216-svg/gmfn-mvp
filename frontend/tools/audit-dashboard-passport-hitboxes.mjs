/* global console, localStorage, process, URL */

import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return url.pathname;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  const prefixes = [
    "/api/",
    "/auth/",
    "/clans/",
    "/community-domains",
    "/dashboard",
    "/identity",
    "/loans",
    "/marketplace",
    "/notifications",
    "/payment-instructions",
    "/pool",
    "/protected-trades",
    "/rosca",
    "/trust",
    "/trust-slips",
  ];

  return (
    url.port === "8000" ||
    prefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))
  );
}

const me = {
  id: 216,
  user_id: 216,
  display_name: "Audit Member",
  name: "Audit Member",
  email: "audit@gsn.local",
  gmfn_id: "GMFN-U-HITBOX",
  gsn_id: "GMFN-U-HITBOX",
  role: "member",
  phone_verified: true,
  status: "active",
};

const clan = {
  id: 8,
  clan_id: 8,
  name: "Homeland isa Marketplace",
  display_name: "Homeland isa Marketplace",
  community_name: "Homeland isa Marketplace",
  marketplace_name: "Homeland isa Marketplace",
  clan_code: "GMFN-C-HITBOX",
  community_code: "GMFN-C-HITBOX",
  gmfn_id: "GMFN-C-HITBOX",
  role: "admin",
  member_role: "admin",
  member_count: 18,
  public_shop_count: 2,
  trust_band: "B",
};

function payloadFor(path) {
  if (path === "/auth/me" || path === "/users/me") return me;
  if (path === "/clans/me") return { items: [clan] };
  if (path === "/clans/select" || path === "/clans/select/") return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/select\/?$/.test(path)) return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/members/.test(path)) return { items: [] };
  if (/^\/clans\/\d+\/invite-link/.test(path)) return { invite_url: "", code: "" };
  if (path === "/community-domains/my") return { items: [] };
  if (/^\/dashboard/.test(path)) return { community: clan, totals: {}, spotlight: null };
  if (/^\/marketplace\/shops\/me/.test(path)) return { shop: null, products: [] };
  if (/^\/marketplace\/shops/.test(path)) return { items: [], shops: [] };
  if (/^\/marketplace\/analytics/.test(path)) return { items: [], results: [], total: 0 };
  if (/^\/marketplace\/requests/.test(path)) return { items: [], requests: [] };
  if (/^\/marketplace/.test(path)) return { items: [], listings: [] };
  if (/^\/notifications/.test(path)) return [];
  if (/^\/loans/.test(path) || /^\/borrowing/.test(path)) return { items: [], loans: [] };
  if (/^\/pool\//.test(path)) return { balance: 0, available_balance: 0, items: [] };
  if (/^\/payment-instructions/.test(path)) return { items: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/rosca/.test(path)) return { items: [], cycles: [] };
  if (path === "/trust/me/why") {
    return {
      user_id: 216,
      current_score: 72,
      score: 72,
      band: "B",
      latest_reason: "Current community evidence remains visible.",
      recent_events: [],
    };
  }
  if (/^\/trust-explainability/.test(path) || /^\/trust_explainability/.test(path)) {
    return { user_id: 216, score: 72, band: "B", event_count: 4, breakdown: { computed_score: 72, computed_band: "B" } };
  }
  if (/^\/trust-slips\/me/.test(path)) {
    return {
      verified: true,
      active: true,
      status: "active",
      code: "TS-HITBOX",
      verification_code: "TS-HITBOX",
      display_name: "Audit Member",
      community: "Homeland isa Marketplace",
      level: "B",
      band: "B",
      open_trust_class: "B",
      cross_community_integrity_class: "B",
      trust_score: 72,
      standing_score: 72,
      phone_recorded: true,
      phone_verified: true,
      public_verify_url: "/t/TS-HITBOX",
    };
  }
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: [] };
  return { items: [], results: [], total: 0, status: "ok" };
}

async function mockApi(route) {
  const url = route.request().url();
  if (!isApiRequest(url)) {
    await route.continue();
    return;
  }

  await route.fulfill(json(payloadFor(apiPathFrom(url))));
}

const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});

await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

try {
  const page = await context.newPage();
  await page.route("**/*", mockApi);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "dashboard-passport-hitbox-token");
    localStorage.setItem("gmfn_auth_token", "dashboard-passport-hitbox-token");
    localStorage.setItem("token", "dashboard-passport-hitbox-token");
    localStorage.setItem("gmfn_current_id", "GMFN-U-HITBOX");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.setItem("selected_clan_id", "8");
    window.__gsnIdentityAuditClipboard = [];
    window.__gsnIdentityAuditSharePayload = null;
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__gsnIdentityAuditClipboard.push(String(value || ""));
        },
      },
    });
    Object.defineProperty(navigator, "canShare", {
      configurable: true,
      value: () => false,
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__gsnIdentityAuditSharePayload = payload || null;
      },
    });
  });

  await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: "networkidle", timeout: 20000 });
  const beforeUrl = page.url();

  if (process.env.DASHBOARD_PHOTO_SCREENSHOT) {
    await page.screenshot({
      path: process.env.DASHBOARD_PHOTO_SCREENSHOT,
      fullPage: true,
    });
  }

  const photoCards = page.locator("[data-dashboard-photo-card]");
  if ((await photoCards.count()) !== 2) {
    throw new Error("Dashboard must expose the DemandBox and Focus photo cards.");
  }

  for (let index = 0; index < 2; index += 1) {
    const photoCard = photoCards.nth(index);
    const backgroundImage = await photoCard.evaluate(
      (node) => getComputedStyle(node).backgroundImage
    );
    if (
      (await photoCard.getAttribute("data-dashboard-photo-clarity")) !==
        "full-picture" ||
      (await photoCard.getAttribute("data-dashboard-photo-label-position")) !==
        "top-strip" ||
      backgroundImage !== "none"
    ) {
      throw new Error(
        "Phone photo cards must use an unobstructed picture with one compact top label."
      );
    }

    const liveImage = photoCard.locator("[data-dashboard-photo-image]");
    if ((await liveImage.count()) !== 1) {
      throw new Error("Each Dashboard photo card must mount one real image element.");
    }
    await liveImage.waitFor({ state: "visible", timeout: 5000 });
    const imageReady = await liveImage.evaluate(
      (node) =>
        node instanceof HTMLImageElement &&
        node.complete &&
        node.naturalWidth > 0 &&
        node.naturalHeight > 0 &&
        getComputedStyle(node).objectFit === "cover"
    );
    if (!imageReady) {
      throw new Error("Dashboard live pictures must load at real dimensions and cover their cards.");
    }

    const label = photoCard.locator("[data-dashboard-photo-label]");
    const cardBox = await photoCard.boundingBox();
    const labelBox = await label.boundingBox();
    if (
      !cardBox ||
      !labelBox ||
      labelBox.y > cardBox.y + 12 ||
      labelBox.height > 36 ||
      cardBox.height - (labelBox.y + labelBox.height - cardBox.y) < 60
    ) {
      throw new Error(
        `Dashboard photo label must stay narrow at the top and leave the picture open below: card=${JSON.stringify(
          cardBox
        )}, label=${JSON.stringify(labelBox)}.`
      );
    }
  }

  const trustSlipVerificationBanner = page.locator(
    '[data-dashboard-trustslip-verification-banner="true"]'
  );
  if (
    (await trustSlipVerificationBanner.count()) !== 1 ||
    !(await trustSlipVerificationBanner.isVisible())
  ) {
    throw new Error("Dashboard must expose one TrustSlip and verification banner.");
  }

  await trustSlipVerificationBanner.tap();
  await page.waitForTimeout(120);
  if ((await trustSlipVerificationBanner.getAttribute("aria-expanded")) !== "true") {
    throw new Error("TrustSlip and verification banner did not open its existing tools.");
  }
  await page.waitForTimeout(260);
  await trustSlipVerificationBanner.tap();
  await page.waitForTimeout(120);
  if ((await trustSlipVerificationBanner.getAttribute("aria-expanded")) !== "false") {
    throw new Error("TrustSlip and verification banner did not close its existing tools.");
  }

  const compactHero = page.locator(
    '[data-dashboard-compact-identity="true"]'
  );
  if ((await compactHero.count()) !== 1 || !(await compactHero.isVisible())) {
    throw new Error("Dashboard phone view must expose one compact identity hero.");
  }

  if (
    (await page.locator('[data-dashboard-passport-feature-status="true"]').count()) !==
    0
  ) {
    throw new Error(
      "Dashboard phone view must not mount the old three-tile passport feature grid."
    );
  }

  const identityTrustToggle = page.locator(
    '[data-cta-id="dashboard.passport.identity-and-trust"]'
  );
  if ((await identityTrustToggle.count()) !== 1) {
    throw new Error("Dashboard must expose one covered Identity & trust control.");
  }

  const identityTrustDetails = identityTrustToggle.locator("xpath=..");
  if ((await identityTrustDetails.getAttribute("open")) !== null) {
    throw new Error("Identity & trust details must stay closed on first arrival.");
  }

  const signalTargets = [
    {
      id: "trust",
      expected: "/app/trust",
    },
    {
      id: "wider",
      expected: "/app/identity",
    },
    {
      id: "trustslip",
      expected: "/app/trust-slip/verify?code=TS-HITBOX",
    },
  ];

  for (const { id } of signalTargets) {
    const signal = page.locator(
      `[data-cta-id="dashboard.passport-signal.${id}"]`
    );
    if ((await signal.count()) !== 1 || (await signal.isVisible())) {
      throw new Error(
        `Dashboard identity signal ${id} must be mounted but covered on first arrival.`
      );
    }
  }

  await identityTrustToggle.tap();
  await page.waitForTimeout(420);

  const viewport = page.viewportSize();
  if (!viewport) {
    throw new Error("Dashboard phone viewport could not be measured.");
  }

  for (const { id, expected } of signalTargets) {
    const signal = page.locator(
      `[data-cta-id="dashboard.passport-signal.${id}"]`
    );
    const signalBox = await signal.boundingBox();
    if (
      !(await signal.isVisible()) ||
      !signalBox ||
      signalBox.x < 0 ||
      signalBox.x + signalBox.width > viewport.width + 1
    ) {
      throw new Error(
        `Dashboard identity signal ${id} is not a visible in-viewport action.`
      );
    }

    await signal.tap();
    await page.waitForTimeout(420);
    const routedUrl = new URL(page.url());
    if (`${routedUrl.pathname}${routedUrl.search}` !== expected) {
      throw new Error(
        `Dashboard identity signal ${id} routed to ${routedUrl.pathname}${routedUrl.search}; expected ${expected}.`
      );
    }

    await page.goto(beforeUrl, { waitUntil: "networkidle", timeout: 20000 });
    await page
      .locator('[data-cta-id="dashboard.passport.identity-and-trust"]')
      .tap();
    await page.waitForTimeout(420);
  }

  const idCardEntry = page.locator(
    '[data-cta-id="dashboard.passport-gsn-id-card"]'
  );
  if ((await idCardEntry.count()) !== 1) {
    throw new Error("Dashboard must expose one direct GSN ID Card entry.");
  }

  await idCardEntry.scrollIntoViewIfNeeded();
  await idCardEntry.tap();
  await page.waitForURL(/\/app\/identity\?view=card&display=card-only$/, {
    timeout: 10000,
  });

  const identityCard = page.locator('[data-gsn-identity-card="true"]');
  await identityCard.waitFor({ state: "visible", timeout: 10000 });

  const landscapeCard = page.locator(
    '[data-gsn-identity-card-screenshot="true"][data-gsn-identity-card-reference="landscape-membership"]'
  );
  if ((await landscapeCard.count()) !== 1) {
    throw new Error("GSN ID Card must use the approved landscape membership face.");
  }
  const landscapeBox = await landscapeCard.boundingBox();
  if (!landscapeBox || !viewport) {
    throw new Error("GSN landscape card geometry could not be measured.");
  }
  const landscapeCore = landscapeCard.locator(
    '[data-gsn-identity-card-core="true"]'
  );
  const landscapeCoreBox = await landscapeCore.boundingBox();
  if (!landscapeCoreBox) {
    throw new Error("GSN Identity Card landscape membership face could not be measured.");
  }
  const landscapeRatio = landscapeCoreBox.width / landscapeCoreBox.height;
  if (landscapeRatio < 1.56 || landscapeRatio > 1.68) {
    throw new Error(
      `GSN ID Card core must remain landscape; measured ratio ${landscapeRatio.toFixed(2)}.`
    );
  }
  if (landscapeBox.height < landscapeCoreBox.height + 70) {
    throw new Error("GSN ID Card must extend below its core face for the contact band.");
  }
  if (landscapeBox.x < 0 || landscapeBox.x + landscapeBox.width > viewport.width + 1) {
    throw new Error("GSN landscape card overflows the phone viewport.");
  }
  if (landscapeBox.x > 10 || landscapeBox.width < viewport.width - 18) {
    throw new Error(
      `GSN landscape card must extend close to both phone edges; measured x=${landscapeBox.x.toFixed(
        1
      )}, width=${landscapeBox.width.toFixed(1)}.`
    );
  }

  const connectedGlobe = landscapeCard.locator(
    '[data-gsn-identity-card-connected-globe="true"]'
  );
  if ((await connectedGlobe.count()) !== 1 || !(await connectedGlobe.isVisible())) {
    throw new Error("GSN ID Card must show one connected-world photo mark.");
  }

  const legalBoundary = landscapeCard.locator(
    '[data-gsn-identity-card-boundary="true"]'
  );
  if ((await legalBoundary.count()) !== 1 || !(await legalBoundary.isVisible())) {
    throw new Error("GSN ID Card must keep one concise legal boundary on its face.");
  }

  const contactBand = landscapeCard.locator(
    '[data-gsn-identity-card-contact-band="true"]'
  );
  if ((await contactBand.count()) !== 1 || !(await contactBand.isVisible())) {
    throw new Error("GSN ID Card must expose one bounded contact band.");
  }
  const contactText = (await contactBand.textContent())?.replace(/\s+/g, " ").trim() || "";
  for (const requiredText of [
    "GSN WEBSITE",
    "globalsupportnetwork.org",
    "GSN SOCIAL",
    "@globalsupportnetwork",
    "MY GSN HANDLE",
    "@GMFN-U-HITBOX",
  ]) {
    if (!contactText.includes(requiredText)) {
      throw new Error(`GSN ID Card contact band is missing ${requiredText}.`);
    }
  }

  const qrLink = landscapeCard.locator(
    '[data-gsn-identity-card-qr-link="true"]'
  );
  if ((await qrLink.count()) !== 1 || !(await qrLink.isVisible())) {
    throw new Error("GSN ID Card QR must be one visible tappable link.");
  }
  const qrHref = await qrLink.getAttribute("href");
  const qrValue = await qrLink.getAttribute("data-gsn-identity-card-qr-value");
  const qrGraphic = qrLink.locator("svg").first();
  await qrGraphic.waitFor({ state: "visible", timeout: 5000 });
  const qrGraphicCount = await qrLink.locator("svg").count();
  if (
    !qrHref ||
    qrHref !== qrValue ||
    !qrHref.includes("/t/TS-HITBOX/card") ||
    qrGraphicCount < 1
  ) {
    throw new Error(
      `GSN QR link and encoded live-card target must agree; href=${qrHref}, value=${qrValue}, graphics=${qrGraphicCount}.`
    );
  }
  if (process.env.GSN_ID_CARD_SCREENSHOT) {
    await landscapeCard.screenshot({ path: process.env.GSN_ID_CARD_SCREENSHOT });
  }

  const cardOnlyRoot = page.locator(
    '[data-identity-integrity-display="card-only"]'
  );
  if ((await cardOnlyRoot.count()) !== 1) {
    throw new Error("Dashboard ID entry did not open the card-only presentation.");
  }

  for (const selector of [
    '[data-identity-package-view-toggle="true"]',
    '[data-identity-integrity-front-package="true"]',
    '[data-identity-integrity-secondary-section]',
  ]) {
    if ((await page.locator(selector).count()) !== 0) {
      throw new Error(`Card-only presentation still mounted ${selector}.`);
    }
  }

  const cardActionsMenu = page.locator(
    '[data-gsn-identity-card-actions-menu="true"]'
  );
  if ((await cardActionsMenu.count()) !== 0) {
    throw new Error("GSN ID Card actions must stay closed on first arrival.");
  }

  const cardActionsToggle = page.locator(
    '[data-cta-id="identity-integrity.gsn-card.actions-toggle"]'
  );
  const cardActionsToggleText =
    (await cardActionsToggle.count()) === 1
      ? (await cardActionsToggle.textContent())?.replace(/\s+/g, " ").trim()
      : "";
  if (
    (await cardActionsToggle.count()) !== 1 ||
    (await cardActionsToggle.getAttribute("aria-expanded")) !== "false" ||
    !cardActionsToggleText?.includes("GSN ID Card") ||
    !cardActionsToggleText?.includes("Tap to use")
  ) {
    throw new Error(
      "GSN ID Card must expose one closed, clearly labelled title control."
    );
  }

  const cardActionsToggleBox = await cardActionsToggle.boundingBox();
  if (
    !cardActionsToggleBox ||
    cardActionsToggleBox.width < 95 ||
    cardActionsToggleBox.height < 36
  ) {
    throw new Error(
      `GSN ID Card title control is not phone-usable: ${JSON.stringify(cardActionsToggleBox)}.`
    );
  }

  const cardTitleOwnsActions = await cardActionsToggle.evaluate((element) =>
    Boolean(element.closest('[data-gsn-identity-card-screenshot="true"]'))
  );
  if (!cardTitleOwnsActions) {
    throw new Error("The GSN ID Card title control must stay inside the card face.");
  }

  if ((await page.getByText("Use this ID card", { exact: true }).count()) !== 0) {
    throw new Error("GSN ID Card must not expose a duplicate action below the card.");
  }

  await cardActionsToggle.tap();
  await cardActionsMenu.waitFor({ state: "visible", timeout: 5000 });

  for (const action of ["share", "refresh", "copy", "copy-verify-link"]) {
    const actionControl = page.locator(
      `[data-cta-id="identity-integrity.gsn-card.${action}"]`
    );
    if ((await actionControl.count()) !== 1 || !(await actionControl.isVisible())) {
      throw new Error(`GSN ID Card action chooser did not expose ${action}.`);
    }
  }

  await page
    .locator('[data-cta-id="identity-integrity.gsn-card.copy"]')
    .tap();
  await page.waitForFunction(() =>
    window.__gsnIdentityAuditClipboard.some((value) =>
      value.includes("GSN Identity Card") && value.includes("GMFN-U-HITBOX")
    )
  );

  await page
    .locator('[data-cta-id="identity-integrity.gsn-card.copy-verify-link"]')
    .tap();
  await page.waitForFunction(() =>
    window.__gsnIdentityAuditClipboard.some((value) =>
      value.includes("/t/TS-HITBOX/lite")
    )
  );

  await page
    .locator('[data-cta-id="identity-integrity.gsn-card.share"]')
    .tap();
  await page.waitForFunction(() =>
    window.__gsnIdentityAuditSharePayload?.title === "GSN Identity Card" &&
    String(window.__gsnIdentityAuditSharePayload?.text || "").includes("GMFN-U-HITBOX")
  );

  await page
    .locator('[data-cta-id="identity-integrity.gsn-card.refresh"]')
    .tap();
  await page.getByText(
    "Identity Card refreshed. Community count and TrustSlip status are current.",
    { exact: true }
  ).waitFor({ state: "visible", timeout: 5000 });

  if ((await cardActionsToggle.getAttribute("aria-expanded")) !== "true") {
    throw new Error("GSN ID Card actions unexpectedly closed while an action ran.");
  }

  await page.goto(`${baseUrl}/app/identity`, {
    waitUntil: "networkidle",
    timeout: 20000,
  });
  await page
    .locator('[data-identity-integrity-front-package="true"]')
    .waitFor({ state: "visible", timeout: 10000 });

  for (const selector of [
    '[data-identity-package-view-toggle="true"]',
    '[data-gsn-identity-card="true"]',
  ]) {
    if ((await page.locator(selector).count()) !== 0) {
      throw new Error(`Normal Identity Integrity must not mount ${selector}.`);
    }
  }

  const recommendedTask = page.locator(
    '[data-identity-integrity-active-task="true"]'
  );
  if ((await recommendedTask.count()) !== 1 || !(await recommendedTask.isVisible())) {
    throw new Error("Normal Identity Integrity must show one recommended evidence task.");
  }

  for (const selector of [
    '[data-identity-integrity-tools="covered"]',
    '[data-identity-integrity-details="covered"]',
  ]) {
    const disclosure = page.locator(selector);
    if (
      (await disclosure.count()) !== 1 ||
      (await disclosure.getAttribute("open")) !== null
    ) {
      throw new Error(`${selector} must exist and stay closed on first arrival.`);
    }
  }

  const recommendedBox = await recommendedTask.boundingBox();
  const toolsBox = await page
    .locator('[data-identity-integrity-tools="covered"]')
    .boundingBox();
  if (!recommendedBox || !toolsBox || recommendedBox.y >= toolsBox.y) {
    throw new Error("The recommended evidence task must appear before covered identity tools.");
  }

  for (const selector of [
    '[data-identity-integrity-fact-grid="true"]',
    '[data-identity-integrity-copy-actions="true"]',
    '[data-identity-integrity-task-switcher="true"]',
    '[data-identity-integrity-secondary-section]',
  ]) {
    const coveredContent = page.locator(selector).first();
    if ((await coveredContent.count()) === 0 || (await coveredContent.isVisible())) {
      throw new Error(`${selector} must be mounted but covered on first arrival.`);
    }
  }

  await page.goto(beforeUrl, { waitUntil: "networkidle", timeout: 20000 });

  const pictureFrameTriggers = page.locator(
    '[data-cta-id="picture-frame-tools.toggle"]'
  );
  const triggerCount = await pictureFrameTriggers.count();
  if (triggerCount !== 2) {
    throw new Error(
      `Expected separate passport and large-picture frame triggers, found ${triggerCount}.`
    );
  }

  const compactPictureTrigger = pictureFrameTriggers.nth(0);
  await compactPictureTrigger.scrollIntoViewIfNeeded();
  const compactTriggerBox = await compactPictureTrigger.boundingBox();
  const compactTriggerText = (await compactPictureTrigger.innerText()).trim();
  const compactTriggerLabel = await compactPictureTrigger.getAttribute("aria-label");

  if (
    !compactTriggerBox ||
    compactTriggerBox.width > 64 ||
    compactTriggerBox.height !== 30 ||
    compactTriggerText !== "Edit" ||
    compactTriggerLabel !== "Open profile photo tools"
  ) {
    throw new Error(
      `Compact picture-frame trigger contract failed: ${JSON.stringify({
        box: compactTriggerBox,
        text: compactTriggerText,
        ariaLabel: compactTriggerLabel,
      })}`
    );
  }

  await compactPictureTrigger.tap();
  await page.waitForTimeout(120);

  if ((await compactPictureTrigger.getAttribute("aria-expanded")) !== "true") {
    throw new Error("Compact picture-frame trigger did not open its tools rail.");
  }

  for (const action of ["upload", "change", "remove"]) {
    const actionControl = page.locator(
      `[data-cta-id="picture-frame-tools.action.${action}"]`
    );
    if ((await actionControl.count()) !== 1 || !(await actionControl.isVisible())) {
      throw new Error(`Compact picture-frame rail did not expose ${action}.`);
    }
  }

  console.log(
    "Dashboard phone frame audit passed: photo cards render, the TrustSlip banner toggles the existing tools, compact identity actions stay covered until opened, preserve their original routes, GSN ID Card opens the covered card-action surface, and Edit photo preserves its stable tools rail."
  );
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
