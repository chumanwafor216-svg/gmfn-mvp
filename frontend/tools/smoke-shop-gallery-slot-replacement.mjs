/* global console, process, document, window, URL */

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
    image_url: `/uploads/marketplace/images/public-block-${id}.jpg`,
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
  description: "Shop used for public slot replacement smoke.",
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
    const isBackend =
      url.hostname === "127.0.0.1" && url.port === "8012";

    if (!isBackend) {
      await route.continue();
      return;
    }

    if (path === "/marketplace/public/shop/GMFN-U-SLOTTEST") {
      await route.fulfill(json({ ok: true, item: shop, shop, products: publicProducts }));
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

    await page.goto(`${baseUrl}/shop/GMFN-U-SLOTTEST`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });

    const result = await page.evaluate(() => ({
      bodyText: document.body.textContent || "",
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));

    if (!result.bodyText.includes("Newest block six")) {
      throw new Error("Public shop did not render the newest replacement block.");
    }

    if (result.bodyText.includes("Original block 6")) {
      throw new Error("Public shop still rendered the stale block #6 product.");
    }

    if (result.scrollWidth > result.innerWidth) {
      throw new Error(
        `Public shop widened horizontally: ${result.scrollWidth} > ${result.innerWidth}`
      );
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          route: "/shop/GMFN-U-SLOTTEST",
          rendered: "Newest block six",
          staleRendered: false,
          scrollWidth: result.scrollWidth,
          innerWidth: result.innerWidth,
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
