/* global console, process, localStorage, document, window, URL */

import { chromium } from "@playwright/test";
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const distRoot = join(frontendRoot, "dist");

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

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function publicProduct(id, block, title, createdAt) {
  return {
    id,
    shop_id: 55,
    clan_id: 8,
    seller_user_id: 216,
    seller_gmfn_id: "GMFN-U-SLOTTEST",
    name: title,
    title,
    description: `[BLOCK:${block}] ${title}`,
    price: String(1000 + id),
    currency: "NGN",
    image_url: `/uploads/marketplace/images/block-${id}.jpg`,
    visibility_mode: "community_visible",
    public_block_number: block,
    slot_number: block,
    is_active: true,
    created_at: createdAt,
  };
}

const oldBlockSix = publicProduct(
  6,
  6,
  "Original block 6",
  "2026-07-10T10:00:00Z"
);
const newestBlockSix = publicProduct(
  13,
  6,
  "Newest block six",
  "2026-07-12T10:00:00Z"
);
const publicProducts = [
  publicProduct(1, 1, "Original block 1", "2026-07-10T10:00:00Z"),
  publicProduct(2, 2, "Original block 2", "2026-07-10T10:00:00Z"),
  publicProduct(3, 3, "Original block 3", "2026-07-10T10:00:00Z"),
  publicProduct(4, 4, "Original block 4", "2026-07-10T10:00:00Z"),
  publicProduct(5, 5, "Original block 5", "2026-07-10T10:00:00Z"),
  oldBlockSix,
  publicProduct(7, 7, "Original block 7", "2026-07-10T10:00:00Z"),
  publicProduct(8, 8, "Original block 8", "2026-07-10T10:00:00Z"),
  publicProduct(9, 9, "Original block 9", "2026-07-10T10:00:00Z"),
  publicProduct(10, 10, "Original block 10", "2026-07-10T10:00:00Z"),
  publicProduct(11, 11, "Original block 11", "2026-07-10T10:00:00Z"),
  publicProduct(12, 12, "Original block 12", "2026-07-10T10:00:00Z"),
  newestBlockSix,
];

const shop = {
  id: 55,
  shop_id: 55,
  clan_id: 8,
  owner_user_id: 216,
  gmfn_id: "GMFN-U-SLOTTEST",
  owner_gmfn_id: "GMFN-U-SLOTTEST",
  owner_display_name: "Slot Test Owner",
  name: "Slot Replacement Shop",
  shop_name: "Slot Replacement Shop",
  description: "Shop used for local slot replacement smoke.",
  whatsapp_number: "+447903165266",
  image_url: "/uploads/marketplace/images/shop.jpg",
  is_active: true,
};

function serveDist() {
  if (!existsSync(join(distRoot, "index.html"))) {
    throw new Error("frontend/dist/index.html is missing. Run `npm --prefix frontend run build` first.");
  }

  const server = createServer((request, response) => {
    const parsedUrl = new URL(request.url || "/", "http://127.0.0.1");
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const requested = normalize(join(distRoot, pathname));
    const safePath = requested.startsWith(distRoot) ? requested : join(distRoot, "index.html");
    const filePath = existsSync(safePath) && statSync(safePath).isFile()
      ? safePath
      : join(distRoot, "index.html");
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

    if (
      ![
        "/auth/",
        "/clans",
        "/identity-risk",
        "/marketplace",
        "/payment-instructions",
        "/rosca",
        "/community-meetings",
        "/trust-slips",
        "/vault",
      ].some((prefix) => path === prefix || path.startsWith(prefix))
    ) {
      await route.continue();
      return;
    }

    if (path === "/auth/me") {
      await route.fulfill(json({
        id: 216,
        user_id: 216,
        email: "slot-smoke@gsn.local",
        display_name: "Slot Smoke Owner",
        gmfn_id: "GMFN-U-SLOTTEST",
        gsn_id: "GMFN-U-SLOTTEST",
        role: "member",
      }));
      return;
    }

    if (path === "/identity-risk/me") {
      await route.fulfill(json({ continuity: { status: "ok", score: 98 } }));
      return;
    }

    if (path === "/clans/me") {
      await route.fulfill(json([
        {
          id: 8,
          clan_id: 8,
          name: "Slot Test Community",
          marketplace_name: "Slot Test Marketplace",
          role: "admin",
        },
      ]));
      return;
    }

    if (path === "/marketplace/shops/me") {
      await route.fulfill(json({ ok: true, item: shop, shop, products: [oldBlockSix, ...publicProducts.filter((item) => item.id !== 6)] }));
      return;
    }

    if (path === "/marketplace/shops/by-gmfn/GMFN-U-SLOTTEST") {
      await route.fulfill(json({ ok: true, item: shop, products: publicProducts }));
      return;
    }

    if (path === "/marketplace/public/shop/GMFN-U-SLOTTEST") {
      await route.fulfill(json({ ok: true, item: shop, shop, products: publicProducts }));
      return;
    }

    if (path === "/marketplace/products") {
      await route.fulfill(json({ ok: true, items: publicProducts, products: publicProducts }));
      return;
    }

    await route.fulfill(json({ ok: true, items: [], products: [], records: [] }));
  });
}

async function run() {
  let server;
  let browser;

  try {
    server = await serveDist();
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
    });
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "slot-smoke-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });

    await page.goto(`${baseUrl}/app/shop-control#shop-control-gallery-tools`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    const slotTexts = await page.evaluate(() => {
      const out = {};
      for (let slot = 1; slot <= 12; slot += 1) {
        const node = document.querySelector(
          `[data-cta-id="shop-assets.public-slot.${slot}.select"]`
        );
        out[String(slot)] = node ? node.textContent || "" : "";
      }
      return out;
    });

    const blockSixText = String(slotTexts["6"] || "");
    const otherSlotTexts = Object.entries(slotTexts)
      .filter(([slot]) => slot !== "6")
      .map(([, text]) => String(text || ""))
      .join("\n");
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth = await page.evaluate(() => window.innerWidth);

    if (!blockSixText.includes("Newest block six")) {
      throw new Error(`Block #6 did not show newest product. Text: ${blockSixText}`);
    }

    if (blockSixText.includes("Original block 6")) {
      throw new Error(`Block #6 still includes old product. Text: ${blockSixText}`);
    }

    if (otherSlotTexts.includes("Original block 6")) {
      throw new Error("Old block #6 spilled into another public slot tile.");
    }

    if (scrollWidth > innerWidth) {
      throw new Error(`Shop Control page widened horizontally: ${scrollWidth} > ${innerWidth}`);
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          route: "/app/shop-control#shop-control-gallery-tools",
          block6: blockSixText.replace(/\s+/g, " ").trim(),
          scrollWidth,
          innerWidth,
        },
        null,
        2
      )
    );
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
}

run().catch((err) => {
  console.error(err?.stack || err?.message || String(err));
  process.exit(1);
});
