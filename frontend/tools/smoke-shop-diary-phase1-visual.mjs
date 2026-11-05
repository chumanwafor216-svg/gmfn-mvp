/* global console, process, localStorage, document, window, URL, getComputedStyle, HTMLDetailsElement */

import { chromium } from "@playwright/test";
import { createReadStream, existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(frontendRoot, "dist");
const screenshotDir = join(frontendRoot, "screenshots", "shop-diary-phase1");

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
  [".mp4", "video/mp4"],
]);

const imageSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#0b1f33"/><stop offset="0.55" stop-color="#2368a2"/><stop offset="1" stop-color="#e2c06a"/></linearGradient></defs>
  <rect width="1200" height="900" fill="url(#g)"/>
  <circle cx="930" cy="170" r="120" fill="#fff" opacity="0.28"/>
  <rect x="110" y="185" width="980" height="520" rx="56" fill="#ffffff" opacity="0.22"/>
  <text x="130" y="770" fill="#ffffff" font-size="76" font-family="Arial" font-weight="800">Diary activity image</text>
</svg>`);
const portraitSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 1200">
  <defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#07172c"/><stop offset="0.58" stop-color="#1f6f9f"/><stop offset="1" stop-color="#f1d28a"/></linearGradient></defs>
  <rect width="760" height="1200" fill="url(#p)"/>
  <rect x="88" y="130" width="584" height="850" rx="60" fill="#ffffff" opacity="0.24"/>
  <text x="98" y="1080" fill="#ffffff" font-size="58" font-family="Arial" font-weight="800">Portrait creative</text>
</svg>`);
const imageDataUrl = `data:image/svg+xml;charset=utf-8,${imageSvg}`;
const portraitDataUrl = `data:image/svg+xml;charset=utf-8,${portraitSvg}`;
const videoDataUrl = "data:video/mp4;base64,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";

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function product(id, block, title) {
  return {
    id,
    shop_id: 77,
    clan_id: 12,
    seller_user_id: 410,
    seller_gmfn_id: "GMFN-U-DIARY",
    name: title,
    title,
    description: `[BLOCK:${block}] ${title}`,
    price: String(2500 + id),
    currency: "NGN",
    image_url: imageDataUrl,
    video_url: id === 2 ? "/test-product-video.mp4" : null,
    visibility_mode: "community_visible",
    public_block_number: block,
    slot_number: block,
    is_active: true,
    created_at: `2026-10-0${Math.min(block, 9)}T09:00:00Z`,
  };
}

const products = [
  product(1, 1, "Fresh pastries"),
  product(2, 2, "Event catering"),
  product(3, 3, "Custom food tray"),
  product(4, 4, "Weekend delivery"),
  product(5, 5, "Bulk snack pack"),
  product(6, 6, "Community lunch service"),
  product(7, 7, "Celebration cake"),
  product(8, 8, "Office lunch tray"),
  product(9, 9, "Fresh juice pack"),
  product(10, 10, "Family meal plan"),
  product(11, 11, "Event snack box"),
];

const liveSpotlight = {
  id: 801,
  shop_id: 88,
  clan_id: 12,
  author_gmfn_id: "GMFN-U-MY-FAMILY",
  message: "Baby skin care set.",
  spotlight_title: "Baby skin care set.",
  spotlight_description: "Live from My Family My Pride.",
  source_product_title: "Baby skin care set.",
  source_product_description: "Live from My Family My Pride.",
  source_product_price: "20",
  source_product_currency: "NGN",
  source_product_image_url: portraitDataUrl,
  source_shop_name: "My Family My Pride",
  source_shop_whatsapp_number: "+447900000002",
  source_clan_name: "Diary Community",
  source_clan_id: 12,
  created_at: new Date().toISOString(),
  expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
};

const shop = {
  id: 77,
  shop_id: 77,
  clan_id: 12,
  owner_user_id: 410,
  gmfn_id: "GMFN-U-DIARY",
  owner_gmfn_id: "GMFN-U-DIARY",
  owner_display_name: "Diary Owner",
  name: "Diary Kitchen",
  shop_name: "Diary Kitchen",
  description: "A community food shop used for the Shop Diary Phase 1 visual check.",
  whatsapp_number: "+447900000001",
  image_url: imageDataUrl,
  is_active: true,
  shop_product_slots_total: 11,
};
function recentIso(hoursAgo) {
  return new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();
}

const imageDiary = {
  id: 701,
  clan_id: 12,
  shop_id: 77,
  owner_user_id: 410,
  activity_type: "customer_delivery",
  activity_label: "Customer delivery",
  evidence_class: "owner_update",
  evidence_label: "Owner update",
  evidence_boundary: "The shop owner says this happened. It is not formal Trade Evidence by itself.",
  note: "Delivered a weekend food tray order for a community family gathering.",
  image_url: imageDataUrl,
  video_url: null,
  occurred_at: recentIso(2),
  product_id: 2,
  product_name: "Event catering",
  protected_trade_id: null,
  protected_trade_code: null,
  is_public: true,
  is_active: true,
  created_at: recentIso(2),
};

const confirmedDiary = {
  ...imageDiary,
  id: 702,
  activity_type: "work_completed",
  activity_label: "Work completed",
  evidence_class: "counterparty_confirmed",
  evidence_label: "Confirmed activity",
  evidence_boundary: "Linked Trade Evidence supports that this activity was confirmed by the trade parties.",
  note: "Completed a prepaid catering order and linked it to a confirmed Trade Evidence record.",
  protected_trade_id: 88,
  protected_trade_code: "TE-88",
  occurred_at: recentIso(1),
};

const videoDiary = {
  ...imageDiary,
  id: 703,
  activity_type: "event_activity",
  activity_label: "Event/activity",
  note: "Shared a short video update from a community food prep session.",
  image_url: portraitDataUrl,
  video_url: videoDataUrl,
  occurred_at: recentIso(1),
};

const textOnlyDiary = {
  ...imageDiary,
  id: 704,
  activity_type: "business_milestone",
  activity_label: "Business milestone",
  note: "Opened bookings for next week's community lunch service without adding media.",
  image_url: null,
  video_url: null,
  product_id: null,
  product_name: null,
  occurred_at: recentIso(1),
};

const weakDataDiary = {
  ...imageDiary,
  id: 705,
  activity_type: "other_update",
  activity_label: "Other update",
  note: "Short owner update with weak supporting media data and no linked product.",
  image_url: "",
  video_url: "",
  product_id: null,
  product_name: null,
  protected_trade_id: null,
  protected_trade_code: null,
  occurred_at: recentIso(1),
};

const scenarios = {
  none: [],
  image: [imageDiary, confirmedDiary],
  video: [videoDiary, imageDiary],
  text: [textOnlyDiary, imageDiary],
  confirmed: [confirmedDiary, imageDiary],
  weak: [weakDataDiary, textOnlyDiary],
};
let activeScenario = "image";
let activeAuthenticated = true;
let activeSpotlight = false;
let activeShopName = shop.name;

function currentShop() {
  return { ...shop, name: activeShopName, shop_name: activeShopName };
}

function serveDist() {
  if (!existsSync(join(distRoot, "index.html"))) {
    throw new Error("frontend/dist/index.html is missing. Run `npm --prefix frontend run build` first.");
  }
  const server = createServer((request, response) => {
    const parsedUrl = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const requested = normalize(join(distRoot, pathname));
    const safePath = requested.startsWith(distRoot) ? requested : join(distRoot, "index.html");
    const filePath = existsSync(safePath) && statSync(safePath).isFile() ? safePath : join(distRoot, "index.html");
    response.setHeader("Content-Type", mimeTypes.get(extname(filePath)) || "application/octet-stream");
    createReadStream(filePath).pipe(response);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");
    if (path === "/test-product-video.mp4") {
      await route.fulfill({
        status: 200,
        contentType: "video/mp4",
        body: Buffer.from(videoDataUrl.split(",")[1], "base64"),
      });
      return;
    }
    const backendPrefixes = [
      "/auth", "/clans", "/community-domains", "/identity-risk", "/marketplace",
      "/payment-instructions", "/rosca", "/community-meetings", "/trust-slips",
      "/vault", "/shop-diaries"
    ];
    if (!backendPrefixes.some((prefix) => path === prefix || path.startsWith(prefix))) {
      await route.continue();
      return;
    }
    if (path === "/auth/me") {
      if (!activeAuthenticated) {
        await route.fulfill(json({ detail: "Not authenticated" }, 401));
        return;
      }
      await route.fulfill(json({ id: 410, user_id: 410, email: "diary-owner@gsn.local", display_name: "Diary Owner", gmfn_id: "GMFN-U-DIARY", gsn_id: "GMFN-U-DIARY", role: "member" }));
      return;
    }
    if (path === "/identity-risk/me") {
      await route.fulfill(json({ continuity: { status: "ok", score: 98 } }));
      return;
    }
    if (path === "/clans/me") {
      await route.fulfill(json([{ id: 12, clan_id: 12, name: "Diary Community", marketplace_name: "Diary Marketplace", role: "admin" }]));
      return;
    }
    if (path === "/community-domains/my") {
      await route.fulfill(json({ items: [{ id: 12, clan_id: 12, name: "Diary Community", enabled_features: { marketplace_shops: true, shop_diary: true } }] }));
      return;
    }
    if (path === "/marketplace/shops/me") {
      const selectedShop = currentShop();
      await route.fulfill(json({ ok: true, item: selectedShop, shop: selectedShop, products, shop_diary_entries: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/marketplace/shops/by-gmfn/GMFN-U-DIARY") {
      const selectedShop = currentShop();
      await route.fulfill(json({ ok: true, item: selectedShop, shop: selectedShop, products, shop_diary_entries: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/marketplace/shops/77/spotlight-status") {
      await route.fulfill(json({
        ok: true,
        owner_spotlight_inspection: {
          state: activeSpotlight ? "live" : "none",
          campaign: activeSpotlight
            ? { authorized_expires_at: liveSpotlight.expires_at }
            : null,
          item: activeSpotlight ? liveSpotlight : null,
          counts_as_delivery: false,
          counts_as_exposure: false,
        },
      }));
      return;
    }
    if (path === "/marketplace/public/shop/GMFN-U-DIARY/spotlight-opportunity") {
      await route.fulfill(json({
        ok: true,
        item: activeSpotlight ? liveSpotlight : null,
        items: activeSpotlight ? [liveSpotlight] : [],
      }));
      return;
    }
    if (path === "/marketplace/public/shop/GMFN-U-DIARY") {
      const selectedShop = currentShop();
      await route.fulfill(json({
        ok: true,
        item: selectedShop,
        shop: selectedShop,
        products,
        broadcasts: activeSpotlight ? [liveSpotlight] : [],
        primary_broadcast: activeSpotlight ? liveSpotlight : null,
        shop_diary_entries: scenarios[activeScenario] || [],
      }));
      return;
    }
    if (path === "/marketplace/products") {
      await route.fulfill(json({ ok: true, items: products, products }));
      return;
    }
    if (path === "/marketplace/broadcasts") {
      await route.fulfill(json({ ok: true, items: activeSpotlight ? [liveSpotlight] : [] }));
      return;
    }
    if (path === "/shop-diaries/me") {
      await route.fulfill(json({ items: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/shop-diaries/public/GMFN-U-DIARY") {
      const rows = scenarios[activeScenario] || [];
      const entryId = Number(url.searchParams.get("entry_id") || 0);
      await route.fulfill(json({
        items: entryId > 0 ? rows.filter((entry) => Number(entry.id) === entryId) : rows,
      }));
      return;
    }
    await route.fulfill(json({ ok: true, items: [], products: [], records: [] }));
  });
}

async function preparePage(browser, width, height = 844, authenticated = true) {
  activeAuthenticated = authenticated;
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: width <= 520 ? 2 : 1,
    isMobile: width <= 520,
  });
  await installApiMocks(page);
  await page.addInitScript((isAuthenticated) => {
    if (isAuthenticated) {
      localStorage.setItem("access_token", "shop-diary-visual-token");
      localStorage.setItem("gmfn_selected_clan_id", "12");
      return;
    }
    localStorage.removeItem("access_token");
    localStorage.removeItem("gmfn_selected_clan_id");
  }, authenticated);
  return page;
}

async function capture(page, name) {
  const file = join(screenshotDir, `${name}.png`);
  await page.screenshot({
    path: file,
    fullPage: process.env.GSN_SHOP_VISUAL_FULL_PAGE === "true",
  });
  return file.replace(frontendRoot + "\\", "frontend\\").replaceAll("\\", "/");
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const diary = document.getElementById("shop-diaries");
    const neonEnvironment = document.querySelector(
      '[data-public-shop-neon-environment="approved-soft"]'
    );
    const neonInner = neonEnvironment?.querySelector(".public-shop-inner");
    const productHeading = Array.from(document.querySelectorAll("*"))
      .find((node) => (node.textContent || "").trim() === "Products & Services");
    const frame = document.querySelector(".public-shop-diary-featured video, .public-shop-diary-featured img");
    const section = document.querySelector(".public-shop-diary-featured");
    const diaryRect = diary?.getBoundingClientRect();
    const more = document.querySelector('[data-public-shop-more="secondary"]');
    const options = document.querySelector('[data-public-shop-options="secondary"]');
    const brandbar = document.querySelector('.public-shop-brandbar');
    const installPrompt = document.querySelector('[data-gsn-install-surface="public-shop"]');
    const secondaryFeatures = document.querySelector('[data-public-shop-secondary-features="spotlight-vault"]');
    const productToggle = document.querySelector('[data-product-card-toggle-symbol]');
    const productCard = productToggle?.closest('.shop-diary-card');
    const productAudio = document.querySelector('.shop-diary-card button[data-cta-id="spotlight-media-frame.toggle-audio"]');
    const moreRect = more?.getBoundingClientRect();
    const optionsRect = options?.getBoundingClientRect();
    const brandDisplay = brandbar ? getComputedStyle(brandbar).display : null;
    const productRect = productHeading?.getBoundingClientRect();
    const frameRect = frame?.getBoundingClientRect();
    const sectionRect = section?.getBoundingClientRect();
    const productToggleRect = productToggle?.getBoundingClientRect();
    const productCardRect = productCard?.getBoundingClientRect();
    const productAudioRect = productAudio?.getBoundingClientRect();
    const productAudioStyle = productAudio ? getComputedStyle(productAudio) : null;
    const productRevealAction = document.querySelector(
      'button[data-cta-id="shop-gallery.toggle-all-products"]'
    );
    const spotlightRevealAction = document.querySelector(
      'button[data-cta-id="shop-gallery.more.compact-toggle"]'
    );
    const productRevealActionRect = productRevealAction?.getBoundingClientRect();
    const spotlightRevealActionRect = spotlightRevealAction?.getBoundingClientRect();
    const shareAction = document.querySelector('button[data-cta-id="shop-gallery.share-shop"]');
    const verifyAction = document.querySelector('button[data-cta-id="shop-gallery.verify-shop.toggle"]');
    const whatsappAction = document.querySelector('button[data-cta-id="shop-gallery.owner-contact.choose"]');
    const shareActionRect = shareAction?.getBoundingClientRect();
    const verifyActionRect = verifyAction?.getBoundingClientRect();
    const whatsappActionRect = whatsappAction?.getBoundingClientRect();
    const spotlight = document.querySelector(".public-shop-spotlight");
    const spotlightRect = spotlight?.getBoundingClientRect();
    const shopEntranceVideo = document.querySelector('[data-gsn-shop-entrance-video="true"]');
    const shopEntranceRect = shopEntranceVideo?.getBoundingClientRect();
    const shopIdentityOverlay = document.querySelector('[data-public-shop-identity-overlay="true"]');
    const shopIdentityOverlayRect = shopIdentityOverlay?.getBoundingClientRect();
    const shopIdentityOverlayStyle = shopIdentityOverlay
      ? getComputedStyle(shopIdentityOverlay)
      : null;
    const shopIdentityActions = document.querySelector(
      '[data-public-shop-identity-actions="true"]'
    );
    const shopIdentityActionRect = shopIdentityActions?.getBoundingClientRect();
    const shopIdentityActionTops = Array.from(shopIdentityActions?.children || [])
      .map((node) => Math.round(node.getBoundingClientRect().top));
    const shopIdentityActionCenters = Array.from(
      shopIdentityActions?.children || []
    ).map((node) => {
      const rect = node.getBoundingClientRect();
      return Math.round(rect.top + rect.height / 2);
    });
    const shopIdentityName = shopIdentityOverlay?.querySelector("h1");
    const shopIdentityNameRect = shopIdentityName?.getBoundingClientRect();
    const shopCategoryText = document.querySelector(
      '[data-public-shop-category-text="true"]'
    );
    const shopLoopCover = document.querySelector(
      '[data-gsn-shop-loop-cover="true"]'
    );
    const openShopPanel = document.querySelector('[data-public-shop-open-panel="true"]');
    const openShopPanelRect = openShopPanel?.getBoundingClientRect();
    const openShopAction = document.querySelector('a[data-cta-id="shop-gallery.open-shop"]');
    const openShopName = document.querySelector('[data-public-shop-open-panel-name="true"]');
    const productUpdateTicker = document.querySelector(
      '[data-public-shop-product-update-ticker="true"]'
    );
    const productUpdateTickerRect = productUpdateTicker?.getBoundingClientRect();
    const productUpdateTrack = productUpdateTicker?.querySelector(
      ".public-shop-product-update-track"
    );
    const returnMarketplaceAction = document.querySelector(
      'a[data-cta-id="shop-gallery.return-marketplace"]'
    );
    const returnMarketplaceRect = returnMarketplaceAction?.getBoundingClientRect();
    return {
      href: window.location.href,
      body: (document.body.textContent || "").replace(/\s+/g, " ").slice(0, 5000),
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
      diaryTop: diaryRect ? Math.round(diaryRect.top) : null,
      productTop: productRect ? Math.round(productRect.top) : null,
      frameWidth: frameRect ? Math.round(frameRect.width) : null,
      frameHeight: frameRect ? Math.round(frameRect.height) : null,
      sectionHeight: sectionRect ? Math.round(sectionRect.height) : null,
      hasVideo: Boolean(document.querySelector(".public-shop-diary-featured video")),
      hasImage: Boolean(document.querySelector(".public-shop-diary-featured img")),
      diaryDisplay: diary ? getComputedStyle(diary).display : null,
      neonEnvironmentPresent: Boolean(neonEnvironment),
      neonShellBackground: neonEnvironment
        ? getComputedStyle(neonEnvironment).backgroundImage
        : null,
      neonInnerBackground: neonInner
        ? getComputedStyle(neonInner).backgroundImage
        : null,
      neonProductOutline: productCard
        ? getComputedStyle(productCard).outlineColor
        : null,
      moreTop: moreRect ? Math.round(moreRect.top) : null,
      moreOpen: more instanceof HTMLDetailsElement ? more.open : null,
      optionsTop: optionsRect ? Math.round(optionsRect.top) : null,
      optionsOpen: options instanceof HTMLDetailsElement ? options.open : null,
      brandDisplay,
      hasPublicShopInstallPrompt: Boolean(installPrompt),
      secondaryFeaturesDisplay: secondaryFeatures ? getComputedStyle(secondaryFeatures).display : null,
      productToggleSymbol: productToggle?.getAttribute('data-product-card-toggle-symbol') || null,
      productToggleText: (productToggle?.textContent || '').trim() || null,
      productToggleTop: productToggleRect ? Math.round(productToggleRect.top) : null,
      productToggleBottom: productToggleRect ? Math.round(productToggleRect.bottom) : null,
      productCardBottom: productCardRect ? Math.round(productCardRect.bottom) : null,
      productAudioWidth: productAudioRect ? Math.round(productAudioRect.width) : null,
      productAudioHeight: productAudioRect ? Math.round(productAudioRect.height) : null,
      productAudioBackground: productAudioStyle?.backgroundColor || null,
      actionTops: [shareActionRect?.top, verifyActionRect?.top, whatsappActionRect?.top]
        .map((value) => typeof value === "number" ? Math.round(value) : null),
      actionHeights: [shareActionRect?.height, verifyActionRect?.height, whatsappActionRect?.height]
        .map((value) => typeof value === "number" ? Math.round(value) : null),
      liveSpotlight: more?.getAttribute("data-public-shop-live-spotlight") || null,
      spotlightDisplay: spotlight ? getComputedStyle(spotlight).display : null,
      spotlightHeight: spotlightRect ? Math.round(spotlightRect.height) : null,
      revealActionTops: [productRevealActionRect?.top, spotlightRevealActionRect?.top]
        .map((value) => typeof value === "number" ? Math.round(value) : null),
      revealActionHeights: [productRevealActionRect?.height, spotlightRevealActionRect?.height]
        .map((value) => typeof value === "number" ? Math.round(value) : null),
      revealActionWidths: [productRevealActionRect?.width, spotlightRevealActionRect?.width]
        .map((value) => typeof value === "number" ? Math.round(value) : null),
      productUpdateTickerPresent: Boolean(productUpdateTicker),
      productUpdateTickerTop: productUpdateTickerRect
        ? Math.round(productUpdateTickerRect.top)
        : null,
      productUpdateTickerBottom: productUpdateTickerRect
        ? Math.round(productUpdateTickerRect.bottom)
        : null,
      productUpdateTickerHeight: productUpdateTickerRect
        ? Math.round(productUpdateTickerRect.height)
        : null,
      productUpdateTickerLabel:
        productUpdateTicker?.querySelector(".public-shop-product-update-label")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || null,
      productUpdateTickerAriaLabel: productUpdateTicker?.getAttribute("aria-label") || null,
      productUpdateTickerAnimationName: productUpdateTrack
        ? getComputedStyle(productUpdateTrack).animationName
        : null,
      returnMarketplacePresent: Boolean(returnMarketplaceAction),
      returnMarketplaceHeight: returnMarketplaceRect
        ? Math.round(returnMarketplaceRect.height)
        : null,
      shopEntranceVideoPresent: shopEntranceVideo instanceof HTMLVideoElement,
      shopEntranceWidth: shopEntranceRect ? Math.round(shopEntranceRect.width) : null,
      shopEntranceHeight: shopEntranceRect ? Math.round(shopEntranceRect.height) : null,
      shopEntranceReadyState:
        shopEntranceVideo instanceof HTMLVideoElement ? shopEntranceVideo.readyState : null,
      shopEntranceMuted:
        shopEntranceVideo instanceof HTMLVideoElement ? shopEntranceVideo.muted : null,
      shopEntranceLoop:
        shopEntranceVideo instanceof HTMLVideoElement ? shopEntranceVideo.loop : null,
      shopEntranceControls:
        shopEntranceVideo instanceof HTMLVideoElement ? shopEntranceVideo.controls : null,
      shopEntranceInline:
        shopEntranceVideo instanceof HTMLVideoElement ? shopEntranceVideo.playsInline : null,
      shopEntranceBottom: shopEntranceRect ? Math.round(shopEntranceRect.bottom) : null,
      shopIdentityOverlayHeight: shopIdentityOverlayRect
        ? Math.round(shopIdentityOverlayRect.height)
        : null,
      shopIdentityOverlayBackground: shopIdentityOverlayStyle?.backgroundImage || null,
      shopIdentityActionHeight: shopIdentityActionRect
        ? Math.round(shopIdentityActionRect.height)
        : null,
      shopIdentityActionTop: shopIdentityActionRect
        ? Math.round(shopIdentityActionRect.top)
        : null,
      shopIdentityActionTops,
      shopIdentityActionCenters,
      shopIdentityNameBottom: shopIdentityNameRect
        ? Math.round(shopIdentityNameRect.bottom)
        : null,
      shopCategoryClientWidth:
        shopCategoryText instanceof HTMLElement ? shopCategoryText.clientWidth : null,
      shopCategoryScrollWidth:
        shopCategoryText instanceof HTMLElement ? shopCategoryText.scrollWidth : null,
      shopLoopCoverPresent: shopLoopCover instanceof HTMLImageElement,
      openShopPanelTop: openShopPanelRect ? Math.round(openShopPanelRect.top) : null,
      openShopPanelText: (openShopPanel?.textContent || "").replace(/\s+/g, " ").trim(),
      openShopName: (openShopName?.textContent || "").trim(),
      openShopHref: openShopAction instanceof HTMLAnchorElement ? openShopAction.getAttribute("href") : null,
    };
  });
}

async function run() {
  mkdirSync(screenshotDir, { recursive: true });
  let server;
  let browser;
  const manifest = [];
  try {
    server = await serveDist();
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    browser = await chromium.launch({ headless: true });

    const cases = [
      { name: "01-shop-control-no-diary-360", scenario: "none", route: "/app/shop-control#shop-assets-diary", width: 360, expect: "No shop updates yet" },
      { name: "02-shop-control-image-diary-390", scenario: "image", route: "/app/shop-control#shop-assets-diary", width: 390, expect: "Delivered a weekend food tray" },
      { name: "03-public-shop-image-diary-360", scenario: "image", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 360, expect: "Shop Update", authenticated: false },
      { name: "04-public-shop-video-diary-390", scenario: "video", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 390, expect: "Shared a short video update", authenticated: false },
      { name: "05-public-shop-normal-visitor-430", scenario: "image", route: "/shop/GMFN-U-DIARY", width: 430, expect: "Products & Services", authenticated: false },
      { name: "06-public-shop-focused-product-390", scenario: "image", route: "/shop/GMFN-U-DIARY?product_id=2#product-2", width: 390, expect: "Shared item." },
      { name: "07-shop-control-video-diary-430", scenario: "video", route: "/app/shop-control#shop-assets-diary", width: 430, expect: "Shared a short video update" },
      { name: "08-shop-control-no-confirmed-evidence-360", scenario: "none", route: "/app/shop-control#shop-assets-diary", width: 360, expect: "No confirmed Trade Evidence is linked to this shop yet" },
      { name: "09-shop-control-promote-action-390", scenario: "image", route: "/app/shop-control#shop-assets-diary", width: 390, expect: "Promote this update" },
      { name: "10-public-shop-text-only-diary-360", scenario: "text", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 360, expect: "without adding media", authenticated: false },
      { name: "11-public-shop-multiple-chronology-390", scenario: "text", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 390, expect: "Opened bookings", authenticated: false },
      { name: "12-public-shop-confirmed-activity-430", scenario: "confirmed", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 430, expect: "Work completed", authenticated: false },
      { name: "13-public-shop-weak-data-diary-360", scenario: "weak", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 360, expect: "weak supporting media", authenticated: false },
      { name: "14-public-shop-logged-out-open-product-390", scenario: "image", route: "/shop/GMFN-U-DIARY?product_id=2#product-2", width: 390, expect: "Diary Kitchen. Ask about stock.", authenticated: false },
      { name: "15-shop-control-share-update-390", scenario: "text", route: "/app/shop-control#shop-assets-diary", width: 390, expect: "Choose channel", openShare: true },
      { name: "16-public-shop-exact-update-390", scenario: "text", route: "/shop/GMFN-U-DIARY?diary_entry_id=704#shop-diaries", width: 390, expect: "Opened bookings" },
      { name: "17-public-shop-live-spotlight-390", scenario: "image", route: "/shop/GMFN-U-DIARY", width: 390, expect: "Baby skin care set.", spotlight: true },
      { name: "18-shop-picture-entrance-390", scenario: "image", route: "/app/shop-control#shop-assets-picture", width: 390, expect: "Every public shop uses the approved My GSN Shop entrance." },
      { name: "19-public-shop-alternate-owner-360", scenario: "image", route: "/shop/GMFN-U-DIARY", width: 360, expect: "Ardent Ebony Uplift LTD", shopName: "Ardent Ebony Uplift LTD" },
      { name: "20-public-shop-desktop-1024", scenario: "image", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 1024, height: 900, expect: "Shop Update", authenticated: false },
      { name: "21-public-shop-verify-compact-390", scenario: "image", route: "/shop/GMFN-U-DIARY", width: 390, expect: "Request TrustSlip", authenticated: false, openVerify: true },
    ];
    const requestedCases = String(process.env.GSN_SHOP_VISUAL_CASES || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    const casesToRun = requestedCases.length
      ? cases.filter((item) => requestedCases.includes(item.name))
      : cases;

    for (const item of casesToRun) {
      activeScenario = item.scenario;
      activeSpotlight = Boolean(item.spotlight);
      activeShopName = item.shopName || shop.name;
      const page = await preparePage(
        browser,
        item.width,
        item.height || 844,
        item.authenticated !== false
      );
      await page.goto(`${baseUrl}${item.route}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(900);
      if (item.route.startsWith("/app/shop-control")) {
        await page.getByText("Latest activity").first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(300);
      }
      if (item.openShare) {
        const recentUpdates = page.getByText(/Recent updates \(/).first();
        await recentUpdates.click();
        const shareUpdate = page.getByRole("button", { name: "Share update" }).first();
        await shareUpdate.scrollIntoViewIfNeeded();
        await shareUpdate.click();
        await page.getByRole("dialog", { name: "Choose share channel" }).waitFor();
        for (const channel of ["WhatsApp", "X", "LinkedIn", "Facebook", "Copy message"]) {
          if (!(await page.getByRole("button", { name: channel, exact: true }).isVisible())) {
            throw new Error(`${item.name} did not expose ${channel} in the one-touch share chooser.`);
          }
        }
      }
      if (item.openVerify) {
        await page.locator('button[data-cta-id="shop-gallery.verify-shop.toggle"]').click();
        const verifyActions = [
          "shop-gallery.verify-shop.request-trustslip",
          "shop-gallery.verify-shop.toggle-scan",
          "shop-gallery.verify-shop.open-community-record",
        ];
        for (const actionId of verifyActions) {
          const action = page.locator(`[data-cta-id="${actionId}"]`);
          await action.waitFor({ state: "visible", timeout: 20_000 });
        }
        if (await page.getByText("Why trust this shop?", { exact: true }).count()) {
          throw new Error("The simplified Verify panel restored the removed long-form trust card.");
        }
      }
      if (item.spotlight) {
        const details = page.locator('[data-public-shop-more="secondary"]');
        const productRevealAction = page.locator(
          'button[data-cta-id="shop-gallery.toggle-all-products"]'
        );
        const spotlightRevealAction = page.locator(
          'button[data-cta-id="shop-gallery.more.compact-toggle"]'
        );
        if (!(await details.evaluate((node) => node.open))) {
          throw new Error("The live Spotlight disclosure was not open by default.");
        }
        if (
          !(await productRevealAction.isVisible()) ||
          !(await spotlightRevealAction.isVisible())
        ) {
          throw new Error("The compact product and Spotlight controls were not both visible.");
        }
        const productRevealBox = await productRevealAction.boundingBox();
        const spotlightRevealBox = await spotlightRevealAction.boundingBox();
        if (
          !productRevealBox ||
          !spotlightRevealBox ||
          Math.abs(productRevealBox.y - spotlightRevealBox.y) > 1 ||
          Math.abs(productRevealBox.height - spotlightRevealBox.height) > 1 ||
          Math.abs(productRevealBox.width - spotlightRevealBox.width) > 2
        ) {
          throw new Error("The compact product and Spotlight controls did not share one equal row.");
        }
        const spotlightBox = await page.locator(".public-shop-spotlight").boundingBox();
        if (!spotlightBox || spotlightBox.height < 400) {
          throw new Error("The open-by-default live Spotlight billboard did not render.");
        }
        await spotlightRevealAction.click();
        await page.waitForFunction(
          () => document.querySelector('[data-public-shop-more="secondary"]')?.open === false
        );
        await page.waitForTimeout(350);
        await spotlightRevealAction.click({ force: true });
        await page.waitForFunction(
          () => document.querySelector('[data-public-shop-more="secondary"]')?.open === true
        );
        await page.waitForTimeout(250);
      }
      const metrics = await collectMetrics(page);
      let loopStability = null;
      if (item.name === "19-public-shop-alternate-owner-360") {
        loopStability = await page.evaluate(
          () =>
            new Promise((resolve) => {
              const video = document.querySelector(
                '[data-gsn-shop-entrance-video="true"]'
              );
              const cover = document.querySelector(
                '[data-gsn-shop-loop-cover="true"]'
              );
              if (
                !(video instanceof HTMLVideoElement) ||
                !(cover instanceof HTMLImageElement)
              ) {
                resolve({ ok: false, reason: "missing-video-or-cover" });
                return;
              }

              let seekingOpacity = "";
              let seekSeen = false;
              let playingSeenAfterSeek = false;
              let settled = false;
              const finishWhenReady = () => {
                if (!seekingOpacity || !playingSeenAfterSeek || settled) return;
                window.setTimeout(() => {
                  if (settled) return;
                  settled = true;
                  window.clearTimeout(timeout);
                  resolve({
                    ok: true,
                    seekingOpacity,
                    playingOpacity: getComputedStyle(cover).opacity,
                    sameVideo:
                      video ===
                      document.querySelector(
                        '[data-gsn-shop-entrance-video="true"]'
                      ),
                  });
                }, 100);
              };
              const timeout = window.setTimeout(() => {
                if (settled) return;
                settled = true;
                resolve({
                  ok: false,
                  reason: "loop-seek-timeout",
                  seekingOpacity,
                });
              }, 12000);

              video.addEventListener(
                "seeking",
                () => {
                  seekSeen = true;
                  window.requestAnimationFrame(() => {
                    seekingOpacity = getComputedStyle(cover).opacity;
                    finishWhenReady();
                  });
                },
                { once: true }
              );
              video.addEventListener("playing", () => {
                if (!seekSeen) return;
                playingSeenAfterSeek = true;
                finishWhenReady();
              });
            })
        );
      }
      const screenshot = await capture(page, item.name);
      let openShopClickHash = null;
      if (item.name === "05-public-shop-normal-visitor-430") {
        await page.locator('a[data-cta-id="shop-gallery.open-shop"]').click();
        await page.waitForTimeout(150);
        openShopClickHash = await page.evaluate(() => window.location.hash);
      }
      await page.close();
      if (!metrics.body.includes(item.expect)) {
        throw new Error(`${item.name} did not render expected text: ${item.expect}. Body: ${metrics.body}`);
      }
      if (metrics.scrollWidth > metrics.innerWidth) {
        throw new Error(`${item.name} widened horizontally: ${metrics.scrollWidth} > ${metrics.innerWidth}`);
      }
      if (item.route.startsWith("/shop/") || item.route.includes("#shop-assets-picture")) {
        const minimumEntranceWidth = item.route.includes("#shop-assets-picture") ? 220 : 250;
        const minimumEntranceHeight = item.route.includes("#shop-assets-picture") ? 180 : 220;
        if (!metrics.shopEntranceVideoPresent) {
          throw new Error(`${item.name} did not render the approved animated shop entrance.`);
        }
        if (
          metrics.shopEntranceReadyState < 2 ||
          metrics.shopEntranceWidth < minimumEntranceWidth ||
          metrics.shopEntranceHeight < minimumEntranceHeight
        ) {
          throw new Error(
            `${item.name} did not load a visible approved shop-entrance video: ` +
            JSON.stringify({
              readyState: metrics.shopEntranceReadyState,
              width: metrics.shopEntranceWidth,
              height: metrics.shopEntranceHeight,
              minimumEntranceWidth,
              minimumEntranceHeight,
            })
          );
        }
        if (
          !metrics.shopEntranceMuted ||
          !metrics.shopEntranceLoop ||
          !metrics.shopEntranceInline ||
          metrics.shopEntranceControls
        ) {
          throw new Error(`${item.name} changed the muted inline looping entrance contract.`);
        }
      }
      if (item.name.includes("public-shop")) {
        const maximumIdentityOverlayHeight = item.width <= 520 ? 120 : 160;
        if (
          !metrics.neonEnvironmentPresent ||
          !String(metrics.neonShellBackground || "").includes("radial-gradient") ||
          !String(metrics.neonInnerBackground || "").includes("linear-gradient") ||
          !String(metrics.neonProductOutline || "").startsWith("rgb")
        ) {
          throw new Error(
            `${item.name} did not retain the approved scoped static neon showroom: ` +
              JSON.stringify({
                present: metrics.neonEnvironmentPresent,
                shell: metrics.neonShellBackground,
                inner: metrics.neonInnerBackground,
                productOutline: metrics.neonProductOutline,
              })
          );
        }
        if (metrics.hasPublicShopInstallPrompt) {
          throw new Error(`${item.name} restored the unrelated Public Shop install prompt.`);
        }
        if (item.width <= 520 && metrics.brandDisplay !== "none") {
          throw new Error(`${item.name} restored the duplicate Public Shop phone brand bar.`);
        }
        if (
          metrics.shopIdentityOverlayHeight === null ||
          metrics.shopIdentityOverlayHeight > maximumIdentityOverlayHeight ||
          !String(metrics.shopIdentityOverlayBackground || "").includes("0.25")
        ) {
          throw new Error(
            `${item.name} did not keep the shop identity in a shallow see-through caption: ` +
              JSON.stringify({
                height: metrics.shopIdentityOverlayHeight,
                background: metrics.shopIdentityOverlayBackground,
              })
          );
        }
      }
      if (item.name === "05-public-shop-normal-visitor-430") {
        if (
          metrics.openShopPanelTop === null ||
          metrics.shopEntranceBottom === null ||
          metrics.openShopPanelTop < metrics.shopEntranceBottom ||
          metrics.openShopPanelText !== "My GSN ShopDiary KitchenOpen Shop" ||
          metrics.openShopName !== "Diary Kitchen" ||
          !metrics.openShopHref?.endsWith("#products-services") ||
          openShopClickHash !== "#products-services"
        ) {
          throw new Error(
            `${item.name} did not keep the permanent Open Shop panel immediately below the animation: ` +
              JSON.stringify({
                entranceBottom: metrics.shopEntranceBottom,
                panelTop: metrics.openShopPanelTop,
                panelText: metrics.openShopPanelText,
                panelName: metrics.openShopName,
                href: metrics.openShopHref,
                clickHash: openShopClickHash,
              })
          );
        }
        if (!metrics.moreOpen || metrics.optionsOpen) {
          throw new Error(`${item.name} did not keep Spotlight open and Shop options closed by default.`);
        }
        if (
          metrics.productUpdateTickerPresent ||
          !metrics.returnMarketplacePresent ||
          metrics.returnMarketplaceHeight !== 44
        ) {
          throw new Error(
            `${item.name} did not preserve the compact Marketplace return for a public visitor.`
          );
        }
        if (metrics.productTop === null || metrics.moreTop === null || metrics.productTop >= metrics.moreTop) {
          throw new Error(`${item.name} did not place Products & Services before More from this shop.`);
        }
        if (metrics.productToggleSymbol !== "open" || metrics.productToggleText !== "+") {
          throw new Error(`${item.name} did not keep the closed-card + control in the product action dock.`);
        }
        if (
          metrics.productCardBottom === null ||
          metrics.productToggleBottom === null ||
          metrics.productCardBottom - metrics.productToggleBottom > 18
        ) {
          throw new Error(`${item.name} placed the + control away from the lower product action dock.`);
        }
        const validActionMetrics = [...metrics.actionTops, ...metrics.actionHeights].every(
          (value) => typeof value === "number"
        );
        if (
          !validActionMetrics ||
          Math.max(...metrics.actionTops) - Math.min(...metrics.actionTops) > 1 ||
          Math.max(...metrics.actionHeights) - Math.min(...metrics.actionHeights) > 1
        ) {
          throw new Error(
            "Public Shop actions are not aligned: " +
              JSON.stringify({ tops: metrics.actionTops, heights: metrics.actionHeights })
          );
        }
      }
      if (item.name === "19-public-shop-alternate-owner-360") {
        if (metrics.openShopPanelTop !== null || metrics.openShopName) {
          throw new Error(
            `${item.name} showed the redundant external Open Shop panel to the signed-in owner.`
          );
        }
        if (
          metrics.shopIdentityActionTops.length !== 2 ||
          Math.max(...metrics.shopIdentityActionCenters) -
            Math.min(...metrics.shopIdentityActionCenters) >
            1 ||
          metrics.shopIdentityActionHeight > 40 ||
          metrics.shopIdentityNameBottom > metrics.shopIdentityActionTop ||
          metrics.shopCategoryClientWidth < metrics.shopCategoryScrollWidth
        ) {
          throw new Error(
            `${item.name} did not keep category and Edit shop on one compact line below the shop name: ` +
              JSON.stringify({
                actionTops: metrics.shopIdentityActionTops,
                actionCenters: metrics.shopIdentityActionCenters,
                actionHeight: metrics.shopIdentityActionHeight,
                nameBottom: metrics.shopIdentityNameBottom,
                actionTop: metrics.shopIdentityActionTop,
                categoryClientWidth: metrics.shopCategoryClientWidth,
                categoryScrollWidth: metrics.shopCategoryScrollWidth,
              })
          );
        }
        if (
          !metrics.shopLoopCoverPresent ||
          !loopStability?.ok ||
          loopStability.seekingOpacity !== "1" ||
          loopStability.playingOpacity !== "0" ||
          !loopStability.sameVideo
        ) {
          throw new Error(
            `${item.name} did not cover the decoder gap without remounting the approved video: ` +
              JSON.stringify(loopStability)
          );
        }
      }
      if (item.name === "06-public-shop-focused-product-390") {
        if (metrics.productToggleSymbol !== "close" || metrics.productToggleText !== "×") {
          throw new Error(`${item.name} did not replace the ambiguous globe with the literal close symbol.`);
        }
        if (
          metrics.productAudioWidth === null ||
          metrics.productAudioHeight === null ||
          metrics.productAudioWidth > 38 ||
          metrics.productAudioHeight > 38 ||
          Math.abs(metrics.productAudioWidth - metrics.productAudioHeight) > 1
        ) {
          throw new Error(`${item.name} did not keep the video speaker inside a compact circle: ${JSON.stringify({ width: metrics.productAudioWidth, height: metrics.productAudioHeight, background: metrics.productAudioBackground })}`);
        }
        if (!String(metrics.productAudioBackground || "").includes("6, 24, 39")) {
          throw new Error(`${item.name} restored the large white speaker background.`);
        }
      }
      if (item.name === "16-public-shop-exact-update-390") {
        if (metrics.secondaryFeaturesDisplay !== "none") {
          throw new Error(`${item.name} exposed unrelated Spotlight or Vault content beside the shared update.`);
        }
        if (metrics.diaryTop === null || metrics.diaryTop < 0 || metrics.diaryTop > 180) {
          throw new Error(`${item.name} did not focus the exact shared Shop Update near the top of the phone viewport (top=${metrics.diaryTop}).`);
        }
        if (metrics.moreTop === null || metrics.productTop === null || metrics.moreTop >= metrics.productTop) {
          throw new Error(`${item.name} did not place the exact shared Shop Update before Products & Services.`);
        }
      }
      if (item.name === "17-public-shop-live-spotlight-390") {
        if (!metrics.moreOpen || metrics.liveSpotlight !== "true") {
          throw new Error("A resolved live Spotlight did not remain open until intentionally closed.");
        }
        if (metrics.diaryDisplay !== null) {
          throw new Error("The owner Public Shop still rendered the retired lower Shop Update block.");
        }
        if (
          metrics.revealActionTops.some((value) => value === null) ||
          Math.abs(metrics.revealActionTops[0] - metrics.revealActionTops[1]) > 1 ||
          metrics.revealActionHeights.some((value) => value !== 46) ||
          metrics.revealActionWidths.some((value) => value === null) ||
          Math.abs(metrics.revealActionWidths[0] - metrics.revealActionWidths[1]) > 2
        ) {
          throw new Error("Show more and Live Spotlight did not retain one equal compact row.");
        }
        if (
          !metrics.productUpdateTickerPresent ||
          metrics.returnMarketplacePresent ||
          metrics.productUpdateTickerHeight !== 44 ||
          metrics.productUpdateTickerTop === null ||
          metrics.productUpdateTickerTop <= Math.max(...metrics.revealActionTops) ||
          metrics.productUpdateTickerLabel !== "P&S Update" ||
          !String(metrics.productUpdateTickerAriaLabel || "").includes("Delivered a weekend food tray") ||
          metrics.productUpdateTickerAnimationName !== "public-shop-product-update-scroll"
        ) {
          throw new Error(
            "The owner duplicate Marketplace row did not become the compact rolling Products and Services Update: " +
              JSON.stringify({
                present: metrics.productUpdateTickerPresent,
                marketplace: metrics.returnMarketplacePresent,
                height: metrics.productUpdateTickerHeight,
                top: metrics.productUpdateTickerTop,
                revealTops: metrics.revealActionTops,
                label: metrics.productUpdateTickerLabel,
                ariaLabel: metrics.productUpdateTickerAriaLabel,
                animation: metrics.productUpdateTickerAnimationName,
              })
          );
        }
      }
      if (item.route.includes("#shop-diaries") && !item.route.includes("diary_entry_id=")) {
        if (!metrics.moreOpen) {
          throw new Error(`${item.name} did not open More from this shop for the Shop Update deep link.`);
        }
        if (metrics.productTop === null || metrics.moreTop === null || metrics.productTop >= metrics.moreTop) {
          throw new Error(`${item.name} did not keep Products & Services before the expanded secondary lane.`);
        }
      }
      if (
        item.name.includes("focused") &&
        metrics.diaryDisplay !== null &&
        metrics.diaryDisplay !== "none"
      ) {
        throw new Error(`${item.name} did not hide Shop Diary during focused product mode.`);
      }
      manifest.push({ ...item, screenshot, metrics });
    }

    writeFileSync(join(screenshotDir, "metrics.json"), JSON.stringify(manifest, null, 2));
    console.log(JSON.stringify({ ok: true, screenshots: manifest.map((item) => item.screenshot), metrics: "frontend/screenshots/shop-diary-phase1/metrics.json" }, null, 2));
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
