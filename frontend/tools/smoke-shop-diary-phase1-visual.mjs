/* global console, process, localStorage, document, window, URL */

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
];

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
  shop_product_slots_total: 6,
};

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
  occurred_at: "2026-10-08T12:00:00Z",
  product_id: 2,
  product_name: "Event catering",
  protected_trade_id: null,
  protected_trade_code: null,
  is_public: true,
  is_active: true,
  created_at: "2026-10-08T12:00:00Z",
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
  occurred_at: "2026-10-07T12:00:00Z",
};

const videoDiary = {
  ...imageDiary,
  id: 703,
  activity_type: "event_activity",
  activity_label: "Event/activity",
  note: "Shared a short video update from a community food prep session.",
  image_url: portraitDataUrl,
  video_url: videoDataUrl,
  occurred_at: "2026-10-06T12:00:00Z",
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
  occurred_at: "2026-10-09T12:00:00Z",
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
  occurred_at: "2026-10-10T12:00:00Z",
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
      await route.fulfill(json({ ok: true, item: shop, shop, products, shop_diary_entries: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/marketplace/shops/by-gmfn/GMFN-U-DIARY") {
      await route.fulfill(json({ ok: true, item: shop, shop, products, shop_diary_entries: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/marketplace/public/shop/GMFN-U-DIARY") {
      await route.fulfill(json({ ok: true, item: shop, shop, products, shop_diary_entries: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/marketplace/products") {
      await route.fulfill(json({ ok: true, items: products, products }));
      return;
    }
    if (path === "/marketplace/broadcasts") {
      await route.fulfill(json({ ok: true, items: [] }));
      return;
    }
    if (path === "/shop-diaries/me") {
      await route.fulfill(json({ items: scenarios[activeScenario] || [] }));
      return;
    }
    if (path === "/shop-diaries/public/GMFN-U-DIARY") {
      await route.fulfill(json({ items: scenarios[activeScenario] || [] }));
      return;
    }
    await route.fulfill(json({ ok: true, items: [], products: [], records: [] }));
  });
}

async function preparePage(browser, width, height = 844, authenticated = true) {
  activeAuthenticated = authenticated;
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true });
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
  await page.screenshot({ path: file, fullPage: false });
  return file.replace(frontendRoot + "\\", "frontend\\").replaceAll("\\", "/");
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const diary = document.getElementById("shop-diaries");
    const productHeading = Array.from(document.querySelectorAll("*"))
      .find((node) => (node.textContent || "").trim() === "Products & Services");
    const frame = document.querySelector(".public-shop-diary-featured video, .public-shop-diary-featured img");
    const section = document.querySelector(".public-shop-diary-featured");
    const productContactAction = document.querySelector('[data-cta-id^="shop-gallery.product."][data-cta-id$=".contact"]');
    const productContactRect = productContactAction?.getBoundingClientRect();
    const diaryRect = diary?.getBoundingClientRect();
    const productRect = productHeading?.getBoundingClientRect();
    const frameRect = frame?.getBoundingClientRect();
    const sectionRect = section?.getBoundingClientRect();
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
      productContactText: (productContactAction?.textContent || "").replace(/\s+/g, " ").trim(),
      productContactWidth: productContactRect ? Math.round(productContactRect.width) : null,
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
      { name: "01-shop-control-no-diary-360", scenario: "none", route: "/app/shop-control#shop-control-gallery-tools", width: 360, expect: "No business activity updates yet" },
      { name: "02-shop-control-image-diary-390", scenario: "image", route: "/app/shop-control#shop-control-gallery-tools", width: 390, expect: "Delivered a weekend food tray" },
      { name: "03-public-shop-image-diary-360", scenario: "image", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 360, expect: "Shop Diary" },
      { name: "04-public-shop-video-diary-390", scenario: "video", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 390, expect: "Shared a short video update" },
      { name: "05-public-shop-normal-visitor-430", scenario: "image", route: "/shop/GMFN-U-DIARY", width: 430, expect: "Products & Services" },
      { name: "06-public-shop-focused-product-390", scenario: "image", route: "/shop/GMFN-U-DIARY?product_id=2#product-2", width: 390, expect: "This shared link opens only this public product/service block" },
      { name: "07-shop-control-video-diary-430", scenario: "video", route: "/app/shop-control#shop-control-gallery-tools", width: 430, expect: "Shared a short video update" },
      { name: "08-shop-control-no-confirmed-evidence-360", scenario: "none", route: "/app/shop-control#shop-control-gallery-tools", width: 360, expect: "No confirmed Trade Evidence linked to this shop yet" },
      { name: "09-shop-control-promote-action-390", scenario: "image", route: "/app/shop-control#shop-control-gallery-tools", width: 390, expect: "Promote this update" },
      { name: "10-public-shop-text-only-diary-360", scenario: "text", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 360, expect: "without adding media" },
      { name: "11-public-shop-multiple-chronology-390", scenario: "text", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 390, expect: "Opened bookings" },
      { name: "12-public-shop-confirmed-activity-430", scenario: "confirmed", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 430, expect: "Confirmed activity" },
      { name: "13-public-shop-weak-data-diary-360", scenario: "weak", route: "/shop/GMFN-U-DIARY#shop-diaries", width: 360, expect: "weak supporting media" },
      { name: "14-public-shop-logged-out-open-product-390", scenario: "image", route: "/shop/GMFN-U-DIARY?product_id=2#product-2", width: 390, expect: "Contact the owner to request or confirm stock", authenticated: false, expectProductContactText: "Ask" },
    ];

    for (const item of cases) {
      activeScenario = item.scenario;
      const page = await preparePage(browser, item.width, 844, item.authenticated !== false);
      await page.goto(`${baseUrl}${item.route}`, { waitUntil: "networkidle", timeout: 60000 });
      await page.waitForTimeout(900);
      if (item.route.startsWith("/app/shop-control")) {
        await page.getByText("Latest activity").first().scrollIntoViewIfNeeded({ timeout: 5000 }).catch(() => undefined);
        await page.waitForTimeout(300);
      }
      const metrics = await collectMetrics(page);
      const screenshot = await capture(page, item.name);
      await page.close();
      if (!metrics.body.includes(item.expect)) {
        throw new Error(`${item.name} did not render expected text: ${item.expect}. Body: ${metrics.body}`);
      }
      if (metrics.scrollWidth > metrics.innerWidth) {
        throw new Error(`${item.name} widened horizontally: ${metrics.scrollWidth} > ${metrics.innerWidth}`);
      }
      if (item.name.includes("public-shop") && !item.name.includes("focused") && metrics.productTop !== null && metrics.diaryTop !== null && metrics.productTop <= metrics.diaryTop) {
        throw new Error(`${item.name} rendered Products & Services before Shop Diary.`);
      }
      if (item.name.includes("focused") && metrics.diaryDisplay !== "none") {
        throw new Error(`${item.name} did not hide Shop Diary during focused product mode.`);
      }
      if (item.expectProductContactText && metrics.productContactText !== item.expectProductContactText) {
        throw new Error(`${item.name} did not render product contact label ${item.expectProductContactText}. Contact text: ${metrics.productContactText || "<empty>"}`);
      }
      if (item.expectProductContactText && (!metrics.productContactWidth || metrics.productContactWidth < 70)) {
        throw new Error(`${item.name} rendered a cramped product contact action: ${metrics.productContactWidth}`);
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