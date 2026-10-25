/* global console, document, localStorage, window, URL, Event, CustomEvent, HTMLDetailsElement, HTMLElement, Buffer */

import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const ownerGsnId = "GSN-U-SPOTOWNER";
const visitorGsnId = "GSN-U-SPOTVISITOR";
const activatedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const authorizedExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
const syntheticSpotlightImagePath = '/synthetic-spotlight.svg';
const syntheticSpotlightAudioPrefix = '/synthetic-spotlight-audio-';
const syntheticSpotlightImage =
  `<svg xmlns='http://www.w3.org/2000/svg' width='1200' height='800'><rect width='1200' height='800' fill='#1f5fb7'/></svg>`;

function syntheticSpotlightAudio() {
  const sampleRate = 8_000;
  const durationSeconds = 12;
  const sampleCount = sampleRate * durationSeconds;
  const dataLength = sampleCount * 2;
  const audio = Buffer.alloc(44 + dataLength);
  audio.write('RIFF', 0, 'ascii');
  audio.writeUInt32LE(36 + dataLength, 4);
  audio.write('WAVE', 8, 'ascii');
  audio.write('fmt ', 12, 'ascii');
  audio.writeUInt32LE(16, 16);
  audio.writeUInt16LE(1, 20);
  audio.writeUInt16LE(1, 22);
  audio.writeUInt32LE(sampleRate, 24);
  audio.writeUInt32LE(sampleRate * 2, 28);
  audio.writeUInt16LE(2, 32);
  audio.writeUInt16LE(16, 34);
  audio.write('data', 36, 'ascii');
  audio.writeUInt32LE(dataLength, 40);
  for (let index = 0; index < sampleCount; index += 1) {
    const sample = Math.round(
      Math.sin((2 * Math.PI * 220 * index) / sampleRate) * 900
    );
    audio.writeInt16LE(sample, 44 + index * 2);
  }
  return audio;
}
const shop = {
  id: 101,
  shop_id: 101,
  clan_id: 8,
  owner_user_id: 216,
  gmfn_id: ownerGsnId,
  owner_gmfn_id: ownerGsnId,
  name: "Owner Visibility Shop",
  shop_name: "Owner Visibility Shop",
  description: "Synthetic owner visibility qualification shop.",
  image_url:
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20'%3E%3Crect width='20' height='20' fill='%2308274A'/%3E%3C/svg%3E",
  is_active: true,
};
const product = {
  id: 1,
  product_id: 1,
  shop_id: 101,
  clan_id: 8,
  seller_user_id: 216,
  title: "Independent Shop Diary product",
  name: "Independent Shop Diary product",
  description: "Products and Shop Diary remain separate from Spotlight.",
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
  name: "Owner Visibility Community",
  marketplace_name: "Owner Visibility Market",
  status: "active",
};
const diaryEntry = {
  id: 91,
  shop_id: 101,
  clan_id: 8,
  entry_type: "owner_update",
  title: "Independent diary entry",
  message: "Shop Diary stayed separate from Spotlight owner inspection.",
  text: "Shop Diary stayed separate from Spotlight owner inspection.",
  visibility: "public",
  is_active: true,
  occurred_at: "2026-10-16T15:00:00Z",
  created_at: "2026-10-16T15:00:00Z",
};

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function apiPath(urlText) {
  return new URL(urlText).pathname.replace(/^\/api/, "");
}

function isApi(urlText) {
  const url = new URL(urlText);
  return (
    url.port === "8000" ||
    [
      "/api/",
      "/auth/",
      "/clans/",
      "/community-domains",
      "/dashboard",
      "/marketplace",
      "/notifications",
      "/shop-diaries",
      "/trust",
    ].some((prefix) => url.pathname.startsWith(prefix))
  );
}

function member(identity) {
  return {
    id: identity === ownerGsnId ? 216 : 317,
    user_id: identity === ownerGsnId ? 216 : 317,
    display_name: identity === ownerGsnId ? "Synthetic Owner" : "Synthetic Visitor",
    email: "synthetic@example.invalid",
    gmfn_id: identity,
    role: "member",
    status: "active",
  };
}

function spotlightItem({
  label = "Owner saved Spotlight",
  canonical = false,
  replay = false,
  streamIndex = 1,
  presentationExpiresInMs = 25_000,
  priorityMode = "free",
  rotationWeight,
  imageUrl = syntheticSpotlightImagePath,
  videoUrl = null,
} = {}) {
  const canonicalOffset = Math.max(Number(streamIndex || 1) - 1, 0);
  return {
    id: canonical ? 502 + canonicalOffset : 501,
    broadcast_id: canonical ? 502 + canonicalOffset : 501,
    shop_id: canonical ? 202 + canonicalOffset : 101,
    clan_id: 8,
    author_user_id: canonical ? 318 + canonicalOffset : 216,
    author_gmfn_id: canonical ? `GSN-U-OTHEROWNER-${streamIndex}` : ownerGsnId,
    source_shop_name: canonical ? `Eligible visitor source ${streamIndex}` : "Owner Visibility Shop",
    source_shop_whatsapp: "+441234567890",
    message: label,
    image_url: imageUrl,
    video_url: videoUrl,
    priority_mode: priorityMode,
    rotation_weight: rotationWeight,
    visibility_scope: "direct_communities",
    serving_status: "serving",
    campaign_serving_status: "serving",
    content_version: 1,
    created_at: activatedAt,
    expires_at: authorizedExpiry,
    authorized_expires_at: authorizedExpiry,
    is_canonical_opportunity: canonical,
    is_canonical_replay: canonical && replay,
    opportunity_campaign_id: canonical ? 702 + canonicalOffset : undefined,
    spotlight_campaign_id: canonical ? 702 + canonicalOffset : 701,
    opportunity_presentation_id: canonical ? `visitor-presentation-${streamIndex}` : undefined,
    opportunity_presentation_token: canonical && !replay
      ? `visitor-presentation-token-${streamIndex}-123456789`
      : undefined,
    opportunity_presentation_expires_at: canonical && !replay
      ? new Date(Date.now() + presentationExpiresInMs).toISOString()
      : undefined,
    opportunity_replay_expires_at: canonical && replay
      ? new Date(Date.now() + 2 * 60_000).toISOString()
      : undefined,
    opportunity_counts_as_delivery: canonical && replay ? false : undefined,
    opportunity_counts_as_exposure: canonical && replay ? false : undefined,
    opportunity_presentation_surface: canonical
      ? "public_shop_spotlight_rail"
      : undefined,
  };
}

function ownerInspection(state = "live") {
  return {
    state,
    campaign: {
      campaign_id: 701,
      status: state === "withdrawn" ? "ended" : "active",
      serving_status:
        state === "correction_hold"
          ? "correction_hold"
          : state === "withdrawn"
          ? "withdrawn"
          : "serving",
      content_version: 1,
      activated_at: activatedAt,
      authorized_expires_at: authorizedExpiry,
    },
    item: state === "live" ? spotlightItem() : null,
    counts_as_delivery: false,
    counts_as_exposure: false,
  };
}

function genericPayload(path, identity) {
  if (path === "/auth/me" || path === "/users/me") return member(identity);
  if (path === "/clans/me") return { items: [clan] };
  if (path.includes("/clans/select")) return { selected_clan_id: 8 };
  if (path.startsWith("/marketplace/shops/me")) {
    return { item: shop, shop, products: [product] };
  }
  if (path.startsWith("/marketplace/products")) {
    return { items: [product], products: [product] };
  }
  if (path.startsWith("/community-domains")) return { items: [] };
  if (path.startsWith("/trust")) return { score: 0, band: "Not shown", events: [] };
  return { items: [], results: [], records: [], total: 0, status: "ok" };
}

async function newPage(browser, identity = "") {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  if (identity) {
    await page.addInitScript((storedIdentity) => {
      localStorage.setItem("access_token", "synthetic-owner-visibility-token");
      localStorage.setItem("gmfn_current_id", storedIdentity);
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn_companion_settings_local",
        JSON.stringify({ companionMode: "off" })
      );
    }, identity);
  }
  return { context, page };
}

async function revealSpotlightSurface(page) {
  const disclosure = page.locator('[data-public-shop-more=secondary]');
  await disclosure.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-public-shop-more=secondary]');
    return element instanceof HTMLDetailsElement && element.open;
  });
  await page.locator('#public-shop-spotlight').scrollIntoViewIfNeeded();
}

async function installMocks(page, scenario) {
  await page.route("**/*", async (route) => {
    const requestPath = new URL(route.request().url()).pathname;
    if (
      requestPath.startsWith(syntheticSpotlightAudioPrefix) &&
      requestPath.endsWith('.wav')
    ) {
      return route.fulfill({
        status: 200,
        contentType: 'audio/wav',
        body: syntheticSpotlightAudio(),
      });
    }
    if (requestPath === syntheticSpotlightImagePath) {
      return route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: syntheticSpotlightImage,
      });
    }
    if (!isApi(route.request().url())) return route.continue();
    const path = apiPath(route.request().url());
    if (path === `/marketplace/public/shop/${ownerGsnId}`) {
      return route.fulfill(
        json({
          ok: true,
          item: shop,
          shop,
          products: [product],
          broadcasts: [spotlightItem()],
          primary_broadcast: spotlightItem(),
          clan_id: 8,
        })
      );
    }
    if (path.startsWith(`/shop-diaries/public/${ownerGsnId}`)) {
      scenario.diaryCalls += 1;
      return route.fulfill(json({ items: [diaryEntry], total: 1 }));
    }
    if (path === "/marketplace/shops/101/spotlight-status") {
      scenario.ownerStatusCalls += 1;
      return route.fulfill(
        json({
          ok: true,
          shop_id: 101,
          owner_spotlight_inspection: ownerInspection(scenario.ownerState),
        })
      );
    }
    if (path.endsWith("/spotlight-opportunity")) {
      scenario.visibilityWindows = scenario.visibilityWindows || [];
      scenario.visibilityWindows.push(
        Number(route.request().headers()['x-spotlight-visibility-window'] || 0)
      );
      if (
        String(route.request().headers().referer || '').includes(
          'owner_spotlight_preview=1'
        )
      ) {
        scenario.explicitPreviewCanonicalCalls =
          Number(scenario.explicitPreviewCanonicalCalls || 0) + 1;
      }
      scenario.canonicalCalls += 1;
      if (scenario.expiredSession) {
        return route.fulfill(
          json({ detail: 'Synthetic expired Spotlight session.' }, 401)
        );
      }
      if (
        scenario.canonicalCalls > Number(scenario.canonicalFailureAfterCalls || 0) &&
        Number(scenario.canonicalFailuresRemaining || 0) > 0
      ) {
        scenario.canonicalFailuresRemaining -= 1;
        return route.fulfill(
          json({ detail: 'Synthetic canonical refresh outage.' }, 503)
        );
      }
      const streamIndex = scenario.canonicalCalls;
      if (streamIndex > scenario.streamLimit) {
        if (scenario.replayAfterStream) {
          scenario.replayResponses = Number(scenario.replayResponses || 0) + 1;
          const items = Array.from(
            { length: scenario.streamLimit },
            (_, index) =>
              spotlightItem({
                label:
                  index === 0
                    ? "Visitor eligible Spotlight"
                    : `Community Spotlight ${index + 1}`,
                canonical: true,
                replay: true,
                streamIndex: index + 1,
              })
          );
          return route.fulfill(
            json({
              serving_contract_version: 2,
              item: items[0] || null,
              items,
              presentation: null,
              rejection_code: "no_delivery_opportunity",
            })
          );
        }
        return route.fulfill(
          json({
            serving_contract_version: 2,
            item: null,
            items: [],
            presentation: null,
            rejection_code: "no_delivery_opportunity",
          })
        );
      }
      const item = spotlightItem({
        label:
          streamIndex === 1
            ? "Visitor eligible Spotlight"
            : `Community Spotlight ${streamIndex}`,
        canonical: true,
        streamIndex,
        imageUrl: scenario.mediaUnavailable ? null : undefined,
        videoUrl: (Array.isArray(scenario.videoMediaPattern)
          ? scenario.videoMediaPattern[streamIndex - 1] === 'video'
          : scenario.videoMedia)
          ? `${syntheticSpotlightAudioPrefix}${streamIndex}.wav`
          : null,
        presentationExpiresInMs: scenario.presentationExpiresInMs || 25_000,
      });
      const items = [item];
      if (streamIndex === 1 && scenario.includePaidReplay) {
        items.push(
          spotlightItem({
            label: "Older paid replay",
            canonical: true,
            replay: true,
            streamIndex: 90,
            priorityMode: "paid",
            rotationWeight: 3,
          })
        );
      }
      return route.fulfill(
        json({
          serving_contract_version: 2,
          item,
          items,
          presentation: {
            presentation_id: item.opportunity_presentation_id,
            presentation_token: item.opportunity_presentation_token,
            presentation_expires_at: item.opportunity_presentation_expires_at,
          },
        })
      );
    }
    if (path === "/marketplace/spotlight-presentations/qualify") {
      scenario.qualifyCalls += 1;
      if (Number(scenario.qualifyFailuresRemaining || 0) > 0) {
        scenario.qualifyFailuresRemaining -= 1;
        return route.fulfill(
          json({ ok: false, recorded: false, deduped: false, rejection_code: "synthetic_retry" })
        );
      }
      return route.fulfill(json({ ok: true, qualified: true }));
    }
    if (path === "/marketplace/analytics/attention") {
      const payload = route.request().postDataJSON();
      if (payload?.event_type === "spotlight_impression") {
        scenario.impressionCalls += 1;
      }
      if (payload?.event_type === "product_open") {
        scenario.productOpenCalls = Number(scenario.productOpenCalls || 0) + 1;
        scenario.productOpenPayload = payload;
      }
      return route.fulfill(
        json({ ok: true, recorded: true, deduped: false, event_id: 1 })
      );
    }
    if (path === "/marketplace/broadcasts") {
      scenario.legacyBroadcastCalls += 1;
      return route.fulfill(json({ items: [spotlightItem()] }));
    }
    return route.fulfill(json(genericPayload(path, scenario.identity)));
  });
}

async function openOwnerSpotlight(page) {
  const summary = page.locator('[data-public-shop-more="secondary"] summary');
  await summary.waitFor({ state: "visible", timeout: 15_000 });
  if ((await page.locator('[data-public-shop-more="secondary"]').getAttribute("open")) === null) {
    await summary.click();
  }
  await page
    .locator('[data-owner-spotlight-inspection="live"]')
    .waitFor({ state: "visible", timeout: 15_000 });
  await page.getByText("Owner saved Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
}

async function testOwnerReopenPreviewBackAndResume(browser, baseUrl) {
  const scenario = {
    identity: ownerGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 4,
  };
  const { context, page } = await newPage(browser, ownerGsnId);
  await installMocks(page, scenario);

  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await openOwnerSpotlight(page);
  const spotlightRail = page.locator("#public-shop-spotlight");
  await spotlightRail.scrollIntoViewIfNeeded();
  const spotlightWhatsApp = spotlightRail.getByRole("button", {
    name: /WhatsApp/i,
  });
  if ((await spotlightWhatsApp.count()) === 0) {
    throw new Error(
      'Owner Spotlight lost its WhatsApp action after reveal: ' +
        (await spotlightRail.innerText())
    );
  }
  await spotlightWhatsApp.waitFor({ state: "visible", timeout: 15_000 });
  const [railBounds, whatsappBounds] = await Promise.all([
    spotlightRail.boundingBox(),
    spotlightWhatsApp.boundingBox(),
  ]);
  if (
    !railBounds ||
    !whatsappBounds ||
    whatsappBounds.x < railBounds.x - 1 ||
    whatsappBounds.x + whatsappBounds.width > railBounds.x + railBounds.width + 1
  ) {
    throw new Error("Compact Spotlight WhatsApp action overflowed the card bounds.");
  }
  await openOwnerSpotlight(page);
  await page.waitForTimeout(1_200);
  if (scenario.qualifyCalls !== 0 || scenario.impressionCalls !== 0) {
    throw new Error(
      `Owner inspection counted exposure before another member appeared: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  try {
    await page.getByText("Visitor eligible Spotlight", { exact: true }).waitFor({
      state: "visible",
      timeout: 18_000,
    });
  } catch {
    const geometry = await page.evaluate(() => {
      const gate = document.querySelector('[data-public-shop-more=secondary]');
      const rail = document.querySelector('#public-shop-spotlight');
      const describe = (element) => {
        if (!(element instanceof HTMLElement)) return null;
        const rect = element.getBoundingClientRect();
        return {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      };
      return {
        visibility: document.visibilityState,
        viewportHeight: window.innerHeight,
        gate: describe(gate),
        rail: describe(rail),
      };
    });
    throw new Error(
      'Owner rotation did not reach the visitor item: canonical=' +
        scenario.canonicalCalls +
        ', disclosureOpen=' +
        (await page.locator('[data-public-shop-more=secondary]').getAttribute('open')) +
        ', geometry=' +
        JSON.stringify(geometry) +
        ', rail=' +
        (await spotlightRail.innerText())
    );
  }
  await revealSpotlightSurface(page);
  await page.waitForTimeout(1_400);
  if (scenario.qualifyCalls < 1 || scenario.impressionCalls < 1) {
    throw new Error(
      `Another member's Spotlight did not qualify normally: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  for (const label of [
    "Community Spotlight 2",
    "Community Spotlight 3",
    "Community Spotlight 4",
  ]) {
    await page.getByText(label, { exact: true }).waitFor({
      state: "visible",
      timeout: 10_000,
    });
  }
  await page.waitForTimeout(1_400);
  if (scenario.canonicalCalls < 4 || scenario.qualifyCalls < 4) {
    throw new Error(
      `Just-in-time feed did not advance through four governed members: canonical=${scenario.canonicalCalls}, qualify=${scenario.qualifyCalls}`
    );
  }
  const firstVisibilityWindows = scenario.visibilityWindows.slice(0, 4);
  if (firstVisibilityWindows.join(',') !== '0,1,2,3') {
    throw new Error(
      'Governed Spotlight visibility windows did not advance in order: ' +
        JSON.stringify(firstVisibilityWindows)
    );
  }

  await page.reload({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.goto(
    `${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1#public-shop-spotlight`,
    { waitUntil: "domcontentloaded", timeout: 60_000 }
  );
  await page.getByText("Owner preview · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.waitForTimeout(300);
  if (Number(scenario.explicitPreviewCanonicalCalls || 0) !== 0) {
    throw new Error("Explicit owner Preview consumed another member's delivery opportunity.");
  }
  await page.goBack({ waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.evaluate(() => {
    let state = "hidden";
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      get: () => state,
    });
    document.dispatchEvent(new Event("visibilitychange"));
    state = "visible";
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });

  if (scenario.canonicalCalls < 1 || scenario.legacyBroadcastCalls !== 0) {
    throw new Error(
      `Ordinary owner entry did not use the governed member feed cleanly: canonical=${scenario.canonicalCalls}, legacy=${scenario.legacyBroadcastCalls}`
    );
  }
  if (scenario.ownerStatusCalls < 4) {
    throw new Error(`Owner status was not revalidated across navigation/resume: ${scenario.ownerStatusCalls}`);
  }
  if (scenario.diaryCalls < 1) throw new Error("Shop Diary stopped loading independently.");
  await context.close();
  return scenario;
}

async function testDelayedOwnerAuthentication(browser, baseUrl) {
  const scenario = {
    identity: ownerGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.locator('[data-public-shop-more="secondary"] > summary').waitFor({
    state: "visible",
    timeout: 15_000,
  });

  await page.evaluate((identity) => {
    localStorage.setItem("access_token", "synthetic-delayed-owner-token");
    localStorage.setItem("gmfn_current_id", identity);
    localStorage.setItem("gmfn_selected_clan_id", "8");
    window.dispatchEvent(new CustomEvent("GSN_AUTH_SESSION_CHANGED"));
  }, ownerGsnId);
  await page.getByText("Your Spotlight · Live", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  if (scenario.ownerStatusCalls < 1) {
    throw new Error("Delayed owner authentication did not load the owner status read.");
  }
  await context.close();
  return scenario;
}

async function testExpiredSpotlightSessionReturnsToSignIn(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
    expiredSession: true,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await Promise.all([
    page.waitForURL(/\/login\?session=expired&force=1/, {
      timeout: 15_000,
    }),
    page
      .locator('[data-public-shop-more="secondary"]')
      .scrollIntoViewIfNeeded()
      .catch(() => undefined),
  ]);
  await page
    .getByText(
      "Your previous sign-in expired while GSN was closed. Sign in again to continue.",
      { exact: true }
    )
    .waitFor({ state: "visible", timeout: 15_000 });
  const storedSession = await page.evaluate(() => ({
    token: localStorage.getItem("access_token"),
    identity: localStorage.getItem("gmfn_current_id"),
    clan: localStorage.getItem("gmfn_selected_clan_id"),
  }));
  if (storedSession.token || storedSession.identity || storedSession.clan) {
    throw new Error(
      `Expired Public Shop session was not fully cleared: ${JSON.stringify(storedSession)}`
    );
  }
  if (scenario.canonicalCalls !== 1) {
    throw new Error(
      `Expired Public Shop session retried instead of ending once: ${scenario.canonicalCalls}`
    );
  }
  await context.close();
  return scenario;
}

async function testVisitorCannotForceOwnerPreview(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(
    `${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1#public-shop-spotlight`,
    { waitUntil: "domcontentloaded", timeout: 60_000 }
  );
  await page.getByText("Visitor eligible Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.waitForTimeout(1_400);
  const body = await page.locator("body").innerText();
  if (body.includes("Owner saved Spotlight") || body.includes("Owner preview · Live")) {
    throw new Error("A visitor forced the owner inspection branch with a query flag.");
  }
  if (scenario.ownerStatusCalls !== 0 || scenario.canonicalCalls < 1) {
    throw new Error(
      `Visitor path was not canonical-only: ownerStatus=${scenario.ownerStatusCalls}, canonical=${scenario.canonicalCalls}`
    );
  }
  if (scenario.qualifyCalls < 1 || scenario.impressionCalls < 1) {
    throw new Error(
      `Visitor presentation did not retain qualifying exposure handling: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  await context.close();
  return scenario;
}

async function testCanonicalIssuanceWaitsForVisibleSpotlightSurface(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: 'live',
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(baseUrl + '/shop/' + ownerGsnId, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForTimeout(700);
  if (scenario.canonicalCalls !== 0) {
    throw new Error(
      'Off-screen Spotlight consumed a presentation lease before its surface was visible: ' +
        scenario.canonicalCalls
    );
  }

  await page.locator('[data-public-shop-more=secondary]').scrollIntoViewIfNeeded();
  await page.getByText('Visitor eligible Spotlight', { exact: true }).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await page.locator('#public-shop-spotlight').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_400);
  if (scenario.canonicalCalls < 1 || scenario.qualifyCalls < 1) {
    throw new Error(
      'Visible Spotlight surface did not request and qualify normally: canonical=' +
        scenario.canonicalCalls +
        ', qualify=' +
        scenario.qualifyCalls
    );
  }
  await context.close();
  return scenario;
}

async function testMediaLessSpotlightNeverQualifies(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: 'live',
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
    mediaUnavailable: true,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);
  await page.getByText('Visitor eligible Spotlight', { exact: true }).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await page.locator('#public-shop-spotlight').scrollIntoViewIfNeeded();
  await page
    .getByText('This Spotlight does not have ready media. GSN will not count this showing.', {
      exact: true,
    })
    .waitFor({ state: 'visible', timeout: 15_000 });
  await page.waitForTimeout(1_500);
  if (scenario.qualifyCalls !== 0 || scenario.impressionCalls !== 0) {
    throw new Error(
      `Media-less Spotlight counted exposure: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  await context.close();
  return scenario;
}

async function testSpotlightSoundPersistsAcrossRotation(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: 'live',
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 3,
    videoMediaPattern: ['video', 'image', 'video'],
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);
  const spotlightRail = page.locator('#public-shop-spotlight');
  await page.getByText('Visitor eligible Spotlight', { exact: true }).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await spotlightRail
    .getByRole('button', { name: 'Turn video sound on' })
    .tap();
  await spotlightRail
    .getByRole('button', { name: 'Turn video sound off' })
    .waitFor({ state: 'visible', timeout: 10_000 });
  const activeVideo = spotlightRail.locator('video').first();
  const firstVideoSource = await activeVideo.getAttribute('src');
  await activeVideo.evaluate((video) => {
    video.dataset.gsnSoundGestureElement = 'retained';
  });
  await page.getByText('Community Spotlight 2', { exact: true }).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await page.getByText('Community Spotlight 3', { exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await spotlightRail
    .getByRole('button', { name: 'Turn video sound off' })
    .waitFor({ state: 'visible', timeout: 10_000 });
  const rotatedVideoState = await spotlightRail.locator('video').evaluate((video) => ({
    muted: video.muted,
    volume: video.volume,
    source: video.getAttribute('src'),
    soundGestureElement: video.dataset.gsnSoundGestureElement,
  }));
  if (
    !firstVideoSource ||
    !rotatedVideoState.source ||
    firstVideoSource === rotatedVideoState.source
  ) {
    throw new Error(
      `Spotlight sound test did not observe a real media rotation: ${JSON.stringify({ firstVideoSource, rotatedVideoState })}`
    );
  }
  if (rotatedVideoState.soundGestureElement !== 'retained') {
    throw new Error(
      `Spotlight replaced the sound-authorized media element during rotation: ${JSON.stringify(rotatedVideoState)}`
    );
  }
  if (rotatedVideoState.muted || rotatedVideoState.volume <= 0) {
    throw new Error(
      `Spotlight sound did not persist across video rotation: ${JSON.stringify(rotatedVideoState)}`
    );
  }
  await spotlightRail
    .getByRole('button', { name: 'Turn video sound off' })
    .tap();
  await spotlightRail
    .getByRole('button', { name: 'Turn video sound on' })
    .waitFor({ state: 'visible', timeout: 10_000 });
  await context.close();
  return scenario;
}

async function testProductMediaRequiresVisibleDwell(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    productOpenCalls: 0,
    productOpenPayload: null,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });

  const card = page.locator('[data-product-media-attention-id="1"]');
  await card.waitFor({ state: "visible", timeout: 15_000 });
  await card.scrollIntoViewIfNeeded();
  await card.getByRole("button", { name: /Open Independent Shop Diary product/i }).click();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(350);
  if (scenario.productOpenCalls !== 0) {
    throw new Error("Product media counted immediately on open before visible dwell.");
  }
  await page.waitForTimeout(1_100);
  if (scenario.productOpenCalls !== 1) {
    throw new Error(
      `Product media did not count exactly once after visible dwell: ${scenario.productOpenCalls}`
    );
  }
  const payload = scenario.productOpenPayload || {};
  if (
    Number(payload.visible_ms || 0) < 1000 ||
    Number(payload.visible_ratio || 0) < 0.6 ||
    payload.document_visible !== true
  ) {
    throw new Error(
      `Product media visibility evidence was incomplete: ${JSON.stringify(payload)}`
    );
  }
  await context.close();
  return scenario;
}

async function testExpiredOwnerContentFailsClosed(browser, baseUrl) {
  const scenario = {
    identity: ownerGsnId,
    ownerState: "expired",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser, ownerGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}?owner_spotlight_preview=1`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await page.getByText("Owner preview · Expired", { exact: true }).first().waitFor({
    state: "visible",
    timeout: 15_000,
  });
  const body = await page.locator("body").innerText();
  if (body.includes("Owner saved Spotlight")) {
    throw new Error("Expired owner content was replayed from the public-shop cache/feed.");
  }
  const expiredRail = page.locator("#public-shop-spotlight");
  if (
    (await expiredRail.getByRole("button", { name: /WhatsApp/i }).count()) !== 0
  ) {
    throw new Error("Expired Spotlight kept an actionable WhatsApp contact.");
  }
  if ((await expiredRail.locator('img[alt="Owner Visibility Shop"]').count()) !== 0) {
    throw new Error("Expired Spotlight reused the shop hero as if it were live campaign media.");
  }
  await context.close();
  return scenario;
}

async function testCanonicalReplayKeepsCommunityRotationWithoutDoubleCounting(
  browser,
  baseUrl
) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 3,
    replayAfterStream: true,
    replayResponses: 0,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);

  const waitForSpotlightLabel = async (label) => {
    await page.getByText(label, { exact: true }).waitFor({
      state: "visible",
      timeout: 15_000,
    });
    return Date.now();
  };
  const assertReadableDwell = (fromLabel, fromTime, toLabel, toTime) => {
    const dwellMs = toTime - fromTime;
    if (dwellMs < 4_500) {
      throw new Error(
        "Spotlight rotated too quickly from " +
          fromLabel +
          " to " +
          toLabel +
          ": " +
          dwellMs +
          "ms"
      );
    }
  };

  const firstVisibleAt = await waitForSpotlightLabel("Visitor eligible Spotlight");
  await page.evaluate(() => {
    window.open = () => null;
  });
  await page
    .locator("#public-shop-spotlight")
    .getByRole("button", { name: /WhatsApp/i })
    .tap();
  const secondVisibleAt = await waitForSpotlightLabel("Community Spotlight 2");
  assertReadableDwell(
    "Visitor eligible Spotlight",
    firstVisibleAt,
    "Community Spotlight 2",
    secondVisibleAt
  );
  if (secondVisibleAt - firstVisibleAt > 14_000) {
    throw new Error(
      "Touch-focused Spotlight contact paused rotation beyond the bounded interaction window."
    );
  }
  const thirdVisibleAt = await waitForSpotlightLabel("Community Spotlight 3");
  assertReadableDwell(
    "Community Spotlight 2",
    secondVisibleAt,
    "Community Spotlight 3",
    thirdVisibleAt
  );
  const firstReplayAt = await waitForSpotlightLabel("Visitor eligible Spotlight");
  assertReadableDwell(
    "Community Spotlight 3",
    thirdVisibleAt,
    "Visitor eligible Spotlight",
    firstReplayAt
  );

  const qualifiedBeforeReplayRotation = scenario.qualifyCalls;
  const impressionsBeforeReplayRotation = scenario.impressionCalls;
  const secondReplayAt = await waitForSpotlightLabel("Community Spotlight 2");
  assertReadableDwell(
    "Visitor eligible Spotlight",
    firstReplayAt,
    "Community Spotlight 2",
    secondReplayAt
  );

  if (scenario.replayResponses < 1 || scenario.canonicalCalls < 4) {
    throw new Error(
      `Canonical replay was not requested after fresh delivery stopped: calls=${scenario.canonicalCalls}, replay=${scenario.replayResponses}`
    );
  }
  if (
    scenario.qualifyCalls !== qualifiedBeforeReplayRotation ||
    scenario.impressionCalls !== impressionsBeforeReplayRotation
  ) {
    throw new Error(
      `Canonical replay double-counted visibility: qualify=${scenario.qualifyCalls}/${qualifiedBeforeReplayRotation}, impressions=${scenario.impressionCalls}/${impressionsBeforeReplayRotation}`
    );
  }
  await context.close();
  return scenario;
}

async function testFreshLeaseWinsOverWeightedReplay(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
    includePaidReplay: true,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);
  await page.getByText("Visitor eligible Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  const initialText = await page.locator("#public-shop-spotlight").innerText();
  if (initialText.includes("Older paid replay")) {
    throw new Error("A weighted replay displaced the newly issued fresh presentation.");
  }
  await context.close();
  return scenario;
}

async function testRejectedQualificationRetriesBeforeAttention(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    qualifyFailuresRemaining: 1,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);
  await page.waitForFunction(
    () => document.querySelector('[data-spotlight-canonical="true"]') !== null,
    null,
    { timeout: 15_000 }
  );
  await page.waitForTimeout(3_800);
  if (scenario.qualifyCalls < 2 || scenario.impressionCalls !== 1) {
    throw new Error(
      `Rejected qualification did not retry exactly before attention: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  await context.close();
  return scenario;
}

async function testCanonicalRefreshFailureKeepsCurrentSpotlight(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: 'live',
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    canonicalFailureAfterCalls: 1,
    canonicalFailuresRemaining: 3,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);
  await page.getByText('Visitor eligible Spotlight', { exact: true }).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await page.getByText(/Community Spotlight could not refresh/).waitFor({
    state: 'visible',
    timeout: 15_000,
  });
  await page.waitForTimeout(13_000);
  if (
    !(await page.getByText('Visitor eligible Spotlight', { exact: true }).count())
  ) {
    throw new Error('A transient refresh outage erased the last valid Spotlight.');
  }
  if (scenario.canonicalCalls !== 5 || scenario.canonicalFailuresRemaining !== 0) {
    throw new Error(
      `Canonical refresh retry was not bounded: calls=${scenario.canonicalCalls}, remaining=${scenario.canonicalFailuresRemaining}`
    );
  }
  if (scenario.qualifyCalls !== 1 || scenario.impressionCalls !== 1) {
    throw new Error(
      `Refresh retry changed impression accounting: qualify=${scenario.qualifyCalls}, impressions=${scenario.impressionCalls}`
    );
  }
  await context.close();
  return scenario;
}

async function testPresentationExpiryRemovesContact(browser, baseUrl) {
  const scenario = {
    identity: visitorGsnId,
    ownerState: "live",
    ownerStatusCalls: 0,
    canonicalCalls: 0,
    legacyBroadcastCalls: 0,
    qualifyCalls: 0,
    impressionCalls: 0,
    diaryCalls: 0,
    streamLimit: 1,
    presentationExpiresInMs: 2_500,
  };
  const { context, page } = await newPage(browser, visitorGsnId);
  await installMocks(page, scenario);
  await page.goto(`${baseUrl}/shop/${ownerGsnId}`, {
    waitUntil: "domcontentloaded",
    timeout: 60_000,
  });
  await revealSpotlightSurface(page);
  await page.getByText("Visitor eligible Spotlight", { exact: true }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
  await page.waitForTimeout(3_000);
  if (await page.getByText("Visitor eligible Spotlight", { exact: true }).count()) {
    throw new Error("Expired canonical presentation remained visible after its server deadline.");
  }
  if (
    await page
      .locator("#public-shop-spotlight")
      .getByRole("button", { name: /WhatsApp/i })
      .count()
  ) {
    throw new Error("Expired canonical presentation retained its WhatsApp action.");
  }
  await context.close();
  return scenario;
}

const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 5201, strictPort: true },
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });

try {
  const results = [
    await testOwnerReopenPreviewBackAndResume(browser, baseUrl),
    await testDelayedOwnerAuthentication(browser, baseUrl),
    await testExpiredSpotlightSessionReturnsToSignIn(browser, baseUrl),
    await testVisitorCannotForceOwnerPreview(browser, baseUrl),
    await testCanonicalIssuanceWaitsForVisibleSpotlightSurface(browser, baseUrl),
    await testMediaLessSpotlightNeverQualifies(browser, baseUrl),
    await testSpotlightSoundPersistsAcrossRotation(browser, baseUrl),
    await testProductMediaRequiresVisibleDwell(browser, baseUrl),
    await testExpiredOwnerContentFailsClosed(browser, baseUrl),
    await testCanonicalReplayKeepsCommunityRotationWithoutDoubleCounting(
      browser,
      baseUrl
    ),
    await testFreshLeaseWinsOverWeightedReplay(browser, baseUrl),
    await testRejectedQualificationRetriesBeforeAttention(browser, baseUrl),
    await testCanonicalRefreshFailureKeepsCurrentSpotlight(browser, baseUrl),
    await testPresentationExpiryRemovesContact(browser, baseUrl),
  ];
  console.log(
    JSON.stringify(
      {
        ok: true,
        environment: "local Vite + mocked synthetic API",
        results,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  await server.close();
}
