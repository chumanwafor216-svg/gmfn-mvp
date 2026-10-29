/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const selectorSource = readFileSync(
  join(frontendRoot, "src/lib/shopHeroSelection.ts"),
  "utf8"
);
const compiled = ts.transpileModule(selectorSource, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const moduleRecord = { exports: {} };
new Function("exports", "module", compiled)(moduleRecord.exports, moduleRecord);
const { selectShopHeroSource } = moduleRecord.exports;

function assert(condition, message) {
  if (condition) return;
  console.error(`Shop hero selector test failed: ${message}`);
  process.exit(1);
}

const candidates = [
  {
    id: 22,
    publicBlockNumber: 2,
    name: "Second item",
    imageUrl: "/uploads/product-2.jpg",
    imageAvailable: true,
    visibilityMode: "community_visible",
  },
  {
    id: 11,
    publicBlockNumber: 1,
    name: "First item",
    imageUrl: "/uploads/product-1.jpg",
    imageAvailable: true,
    visibilityMode: "public",
  },
];

const selectedShop = selectShopHeroSource({
  shopName: "Ada Shop",
  shopImageUrl: "/uploads/shop.jpg",
  products: candidates,
});
assert(selectedShop.kind === "shop", "the owner-selected shop photo must win");
assert(selectedShop.imageUrl === "/uploads/shop.jpg", "the saved shop URL must be preserved");

const selectedProduct = selectShopHeroSource({
  shopName: "Ada Shop",
  shopImageUrl: "/uploads/shop.jpg",
  products: candidates,
  brokenImageUrls: { "/uploads/shop.jpg": true },
});
assert(selectedProduct.kind === "product", "a broken shop photo must fall through to a product");
assert(selectedProduct.productId === 11, "the lowest public-space product must be selected deterministically");

const safeProduct = selectShopHeroSource({
  products: [
    { ...candidates[0], publicBlockNumber: 1, visibilityMode: "vault_private" },
    { ...candidates[1], publicBlockNumber: 2, imageAvailable: false },
    { ...candidates[0], id: 32, publicBlockNumber: 3, visibilityMode: "draft" },
    { ...candidates[0], id: 33, publicBlockNumber: 4, isActive: false },
    { ...candidates[0], id: 34, publicBlockNumber: 5 },
  ],
});
assert(
  safeProduct.productId === 34,
  "private, draft, inactive, and known-missing media must be skipped"
);

const fallback = selectShopHeroSource({
  shopName: "Ada Shop",
  products: candidates,
  brokenImageUrls: {
    "/uploads/product-1.jpg": true,
    "/uploads/product-2.jpg": true,
  },
});
assert(fallback.kind === "fallback", "all unusable media must reach the neutral fallback");
assert(fallback.imageUrl === "", "the neutral fallback must not fabricate an image URL");

console.log("Shop hero selector tests passed.");
