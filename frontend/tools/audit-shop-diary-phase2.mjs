import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const repo = path.resolve(root, "..");

const files = {
  route: path.join(repo, "gmfn_backend/app/api/routes/shop_diary.py"),
  assets: path.join(root, "src/pages/ShopAssetsPage.tsx"),
  control: path.join(root, "src/pages/ShopControlPage.tsx"),
  handles: path.join(root, "src/lib/ownerShopHandles.ts"),
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

assertContains(
  files.route,
  "if trade.shop_id is None or int(trade.shop_id) != int(shop_id):",
  "Backend must reject Trade Evidence links that are not explicitly scoped to this shop."
);
assertContains(
  files.route,
  /requested == "system_recorded":[\s\S]*?return "owner_update"/,
  "Owner-created diary entries must not self-assert Recorded by GSN without a supporting system event contract."
);
assertContains(
  files.route,
  /CONFIRMED_TRADE_STATES = \{"MUTUALLY_CONFIRMED", "PROVIDER_REPORTED_COMPLETED", "REQUESTER_REPORTED_RECEIVED"\}/,
  "Confirmed activity must be based on the existing derived protected-trade outcome states."
);
assertContains(
  files.route,
  "Linked Trade Evidence is not confirmed enough for a Shop Diary confirmed activity",
  "Backend must reject unconfirmed linked Trade Evidence instead of silently attaching a weak evidence pointer."
);

assertContains(files.assets, "listProtectedTrades", "Owner diary must load existing Trade Evidence records instead of accepting typed ids.");
assertContains(files.assets, "SHOP_DIARY_CONFIRMED_TRADE_STATES", "Owner diary selector must filter to confirmed Trade Evidence states.");
assertContains(files.assets, "isConfirmedShopTradeForDiary", "Owner diary selector must filter by current shop and confirmation state.");
assertContains(files.assets, "No confirmed Trade Evidence linked to this shop yet.", "Owner diary must explain when safe stronger evidence linkage is unavailable.");
assertContains(files.assets, "Promote this update", "Owner diary must expose the deliberate Spotlight handoff action.");
assertContains(files.assets, "appendShopDiarySpotlightHandoff", "Promote action must open the canonical Shop Control Spotlight route with handoff context.");
assertContains(files.assets, "writeShopDiarySpotlightHandoff", "Promote action must carry safe prefill context via scoped session storage.");
assertContains(files.assets, "selectedDiaryTrade ? \"counterparty_confirmed\" : \"owner_update\"", "Promotion and typed text must not alter evidence class; only selected confirmed Trade Evidence may request confirmed activity.");
assertNotContains(files.assets, "Trade Evidence number, optional", "Owner diary must not allow arbitrary manual Trade Evidence id entry.");

assertContains(files.handles, "SHOP_DIARY_SPOTLIGHT_HANDOFF_STORAGE_KEY", "Shop Diary and Shop Control must share a stable handoff storage key.");
assertContains(files.control, "params.get(\"spotlight_source\")) !== \"shop_diary\"", "Shop Control must only apply diary prefill for the explicit diary handoff query.");
assertContains(files.control, "SHOP_DIARY_SPOTLIGHT_HANDOFF_STORAGE_KEY", "Shop Control must read the scoped diary handoff payload.");
assertContains(files.control, "Diary update loaded. Review it before publishing Spotlight.", "Spotlight handoff must stop at owner review instead of auto-publishing.");
assertNotContains(files.control, "source_diary_entry_id", "Phase 2 must not force a risky frozen Spotlight model migration.");

assertContains(files.gallery, "featuredDiaryEntry = shopDiaryEntries[0] || null", "Public Shop must keep latest visible diary entry as the featured entry.");
assertNotContains(files.gallery, /promot/i, "Public Shop diary ranking/presentation must not imply promoted means confirmed or featured.");
assertContains(files.gallery, "entry.evidence_label", "Public Shop diary must keep subtle evidence labels.");
assertContains(files.gallery, "evidence_boundary", "Public Shop diary must keep evidence boundary text.");

if (findings.length) {
  console.error("Shop Diary Phase 2 audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Shop Diary Phase 2 audit passed.");