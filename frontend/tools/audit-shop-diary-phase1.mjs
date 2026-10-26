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
assertContains(files.assets, "data-shop-update-first-view=\"true\"", "Shop Control embedded tools must expose the owner Shop Update lane.");
assertContains(files.assets, "debugId=\"shop-assets.diary.submit\"", "Owner diary lane must have a traceable add-update action.");
assertContains(files.assets, "Write one short message for people who visit your shop. Use Shop items when you need a picture or video.", "Owner copy must use direct Shop Update language while keeping the action text-only and separate from product offers.");
assertContains(files.assets, "data-shop-update-composer=\"true\"", "Shop Update must lead directly into its compact message composer.");
assertContains(files.assets, "What should visitors know?", "Shop Update must ask one plain-language question before the message field.");
assertContains(files.assets, "More details (optional)", "Shop Update must keep activity, date, product, and Trade Evidence fields behind an optional disclosure.");
assertNotContains(files.assets, "debugId=\"shop-assets.diary.pick-media\"", "Owner diary must not expose a diary media picker while public updates are text-only.");
assertNotContains(files.assets, "Paste video URL", "Owner diary must not accept diary video URLs while public updates are text-only.");
assertContains(files.gallery, "loadPublicShopDiaryRows", "Public Shop must fetch public diary entries from the dedicated diary API instead of relying only on product/shop payloads.");
assertContains(files.gallery, /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?className="public-shop-section public-shop-diary"[\s\S]*?Shop Update[\s\S]*?public-shop-diary-featured/, "Public Shop diary anchor must belong to the real activity diary with featured frame.");
assertContains(files.route, "PUBLIC_SHOP_DIARY_LIVE_HOURS = 24", "Public Shop diary entries must expire from the public shop face after 24 hours.");
assertContains(files.route, ".filter(ShopDiaryEntry.occurred_at >= live_cutoff)", "Public Shop diary API must not replay expired historical entries.");
assertContains(files.gallery, "liveShopDiaryEntries", "Public Shop must filter the diary shelf to one current live update.");
assertContains(files.gallery, "Latest message from this shop.", "Public Shop diary copy must speak to the visitor instead of explaining internal diary behavior.");
assertNotContains(files.gallery, "recentDiaryEntries", "Public Shop diary must not render a recent-updates trail.");
assertContains(files.gallery, /Products & Services[\s\S]*?visibleProducts\.map/, "Old product blocks must remain as Products & Services below diary.");
assertNotContains(files.gallery, "imageUrl={featuredDiaryEntry.image_url", "Public Shop diary must not render diary pictures as a second product gallery.");
assertNotContains(files.gallery, "videoUrl={featuredDiaryEntry.video_url", "Public Shop diary must not render diary videos as a second product gallery.");
assertNotContains(files.gallery, "The shop owner says this happened", "Public Shop diary must not show maker/evidence boundary copy to visitors.");
assertNotContains(files.gallery, "Visible for 24 hours on this shop face", "Public Shop diary must not explain internal expiry mechanics to visitors.");
assertNotContains(files.gallery, "Show first 12 blocks", "Public Shop must not keep stale 12-block product wording.");
assertNotContains(files.assets, "inside the Shop Diaries", "Product share feedback must not call product blocks Shop Diaries.");

if (findings.length) {
  console.error("Shop Diary Phase 1 audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Shop Diary Phase 1 audit passed.");
