import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const repo = path.resolve(root, "..");

const files = {
  models: path.join(repo, "gmfn_backend/app/db/models.py"),
  route: path.join(repo, "gmfn_backend/app/api/routes/shop_diary.py"),
  migration: path.join(repo, "gmfn_backend/alembic/versions/20261008_add_shop_diary_entries.py"),
  api: path.join(root, "src/lib/api.ts"),
  assets: path.join(root, "src/pages/ShopAssetsPage.tsx"),
  gallery: path.join(root, "src/pages/ShopGalleryPage.tsx"),
};

const findings = [];
function read(file) {
  return fs.readFileSync(file, "utf8");
}
function assertContains(file, pattern, message) {
  const source = read(file);
  const ok = typeof pattern === "string" ? source.includes(pattern) : pattern.test(source);
  if (!ok) findings.push(`${path.relative(repo, file)}: ${message}`);
}
function assertNotContains(file, pattern, message) {
  const source = read(file);
  const ok = typeof pattern === "string" ? !source.includes(pattern) : !pattern.test(source);
  if (!ok) findings.push(`${path.relative(repo, file)}: ${message}`);
}

assertContains(files.models, "class ShopDiaryEntry(Base):", "Shop Diary must have a dedicated model.");
assertContains(files.models, "__tablename__ = \"shop_diary_entries\"", "Shop Diary model must use the dedicated table.");
assertContains(files.migration, "op.create_table(\n            TABLE", "Shop Diary must have an additive Alembic table migration.");
assertContains(files.route, "APIRouter(prefix=\"/shop-diaries\"", "Shop Diary API route must be mounted at /shop-diaries.");
assertContains(files.route, "event_type=\"shop_diary.entry.created\"", "Shop Diary create must write a TrustEvent trail.");
assertContains(files.route, "derive_protected_trade_outcome", "Trade Evidence links must derive confirmation rather than trusting owner text.");
assertContains(files.api, "export type ShopDiaryEntryRecord", "Frontend API must expose a typed diary record.");
assertContains(files.api, "getPublicShopDiaryEntries", "Public Shop must fetch diary entries separately from products.");
assertContains(files.api, "createShopDiaryEntry", "Owner tools must create diary entries separately from products.");
assertContains(files.assets, "Shop Diary", "Shop Control embedded tools must expose a Shop Diary owner lane.");
assertContains(files.assets, "debugId=\"shop-assets.diary.submit\"", "Owner diary lane must have a traceable add-update action.");
assertContains(files.assets, "Products stay below as offers", "Owner copy must separate products from activity history.");
assertContains(files.gallery, /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?className="public-shop-section public-shop-diary"[\s\S]*?Shop Diary[\s\S]*?public-shop-diary-featured/, "Public Shop diary anchor must belong to the real activity diary with featured frame.");
assertContains(files.gallery, /Products & Services[\s\S]*?visibleProducts\.map/, "Old product blocks must remain as Products & Services below diary.");
assertContains(files.gallery, "height: isCompact ? 318 : 340", "Featured diary frame must keep the premium phone media-frame target.");
assertContains(files.gallery, "The shop owner says this happened", "Public diary must preserve owner-assertion boundary language.");
assertNotContains(files.gallery, "Show first 12 blocks", "Public Shop must not keep stale 12-block product wording.");
assertNotContains(files.assets, "inside the Shop Diaries", "Product share feedback must not call product blocks Shop Diaries.");

if (findings.length) {
  console.error("Shop Diary Phase 1 audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Shop Diary Phase 1 audit passed.");