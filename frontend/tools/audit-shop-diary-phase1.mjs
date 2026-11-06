import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(__filename), "..");
const repo = path.resolve(root, "..");

const files = {
  models: path.join(repo, "gmfn_backend/app/db/models.py"),
  route: path.join(repo, "gmfn_backend/app/api/routes/shop_diary.py"),
  voiceRoute: path.join(repo, "gmfn_backend/app/api/routes/shop_voice.py"),
  voiceMigration: path.join(repo, "gmfn_backend/alembic/versions/20261106_add_shop_voice_attachments.py"),
  migration: path.join(repo, "gmfn_backend/alembic/versions/20261008_add_shop_diary_entries.py"),
  api: path.join(root, "src/lib/api.ts"),
  assets: path.join(root, "src/pages/ShopAssetsPage.tsx"),
  gallery: path.join(root, "src/pages/ShopGalleryPage.tsx"),
  voicePlayer: path.join(root, "src/components/ShopVoiceNotePlayer.tsx"),
  presentation: path.join(root, "src/styles/public-shop.css"),
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
assertContains(files.assets, "Write one short message for people who visit your shop. Use Shop items when you need a picture or video.", "Owner copy must use direct Shop Update language while keeping pictures/video separate from updates.");
assertContains(files.assets, "data-shop-update-composer=\"true\"", "Shop Update must lead directly into its compact message composer.");
assertContains(files.assets, "What should visitors know?", "Shop Update must ask one plain-language question before the message field.");
assertContains(files.assets, 'debugPrefix="shop-assets.diary.voice"', "The approved Shop Voice exception must expose one bounded recorder in Shop Update.");
assertContains(files.assets, 'debugPrefix="shop-assets.welcome-voice.record"', "The approved Shop Voice exception must expose one shop-welcome recorder.");
assertContains(files.assets, 'debugPrefix="shop-assets.product.voice"', "The approved Shop Voice exception must expose one item-scoped recorder.");
assertContains(files.assets, "More details (optional)", "Shop Update must keep activity, date, product, and Trade Evidence fields behind an optional disclosure.");
assertNotContains(files.assets, "debugId=\"shop-assets.diary.pick-media\"", "Owner diary must not expose a picture/video picker under the voice-only media exception.");
assertNotContains(files.assets, "Paste video URL", "Owner diary must not accept diary video URLs under the voice-only media exception.");
assertContains(files.voiceRoute, 'APIRouter(prefix="/shop-voice"', "Shop Voice must use its dedicated checked API boundary.");
assertContains(files.voiceRoute, "require_exact_shop_owner", "Only the exact shop owner may record or replace shop voice.");
assertContains(files.voiceRoute, 'pattern="^DELETE VOICE NOTE$"', "Shop Voice sender deletion must retain explicit confirmation.");
assertContains(files.voiceMigration, 'op.create_table(\n        "shop_voice_attachments"', "Shop Voice must have an additive audited migration.");
assertContains(files.gallery, "loadPublicShopDiaryRows", "Public Shop must fetch public diary entries from the dedicated diary API instead of relying only on product/shop payloads.");
assertContains(files.gallery, /id=\{PUBLIC_SHOP_DIARIES_ANCHOR\}[\s\S]*?className="public-shop-section public-shop-diary"[\s\S]*?Shop Update[\s\S]*?public-shop-diary-featured/, "Public Shop diary anchor must belong to the real activity diary with featured frame.");
assertContains(files.route, "PUBLIC_SHOP_DIARY_LIVE_HOURS = 24", "Public Shop diary entries must expire from the public shop face after 24 hours.");
assertContains(files.route, ".filter(ShopDiaryEntry.occurred_at >= live_cutoff)", "Public Shop diary API must not replay expired historical entries.");
assertContains(files.gallery, "liveShopDiaryEntries", "Public Shop must filter the diary shelf to one current live update.");
assertContains(files.gallery, 'debugId="shop-gallery.update-voice.listen"', "Public Shop must expose deliberate playback for live Shop Update voice.");
assertContains(files.gallery, 'label="Voice message - tap Listen to hear it"', "Public Shop must tell visitors to tap Listen before Shop Update voice plays.");
assertContains(files.gallery, 'debugId="shop-gallery.welcome-voice.listen"', "Public Shop must expose deliberate shop-welcome playback.");
assertContains(files.gallery, /const effectiveShop = useMemo<ShopProfile \| null>[\s\S]*?voiceAttachmentId: positiveNumber\(shop\?\.voiceAttachmentId\)[\s\S]*?voiceSpeakerGmfnId: firstMeaningful\(shop\?\.voiceSpeakerGmfnId\)/, "Public Shop must preserve normalized shop voice metadata when it builds the effective public profile.");
assertContains(files.gallery, /const effectiveShop = useMemo<ShopProfile \| null>[\s\S]*?voiceAttachmentId: positiveNumber\(shop\?\.voiceAttachmentId\)[\s\S]*?voiceSpeakerGmfnId: firstMeaningful\(shop\?\.voiceSpeakerGmfnId\)/, "Public Shop must preserve normalized shop voice metadata when it builds the effective public profile.");
assertContains(files.gallery, /compactInline[\s\S]*?debugId="shop-gallery\.welcome-voice\.listen"/, "Phone Public Shop must keep welcome playback inside the compact Shop Update strip.");
assertContains(files.voicePlayer, /const \[completed, setCompleted\] = useState\(false\)[\s\S]*?if \(compactInline && completed\) return null;[\s\S]*?onEnded=\{\(\) => \{[\s\S]*?setCompleted\(true\);[\s\S]*?setAudioUrl\(""\);/, "Compact Public Shop voice must collapse after playback ends and release its loaded audio URL.");
assertContains(files.gallery, 'label="Add Shop Update or voice note"', "The exact owner must reach the existing Shop Update and welcome-voice workflow from the compact strip.");
assertContains(files.gallery, /focusedBlockLinkActive \|\| \(isCompact && routeDiaryEntryId <= 0\)/, "Ordinary phone shops must not restore the duplicate lower Shop Update card; exact shared updates remain reachable.");
assertContains(files.gallery, 'label="Product or service voice note"', "Opened products/services must expose deliberate item voice playback.");
assertContains(files.gallery, "Latest message from this shop.", "Public Shop diary copy must speak to the visitor instead of explaining internal diary behavior.");
assertNotContains(files.gallery, "recentDiaryEntries", "Public Shop diary must not render a recent-updates trail.");
assertContains(files.gallery, /Products & Services[\s\S]*?visibleProducts\.map/, "Old product blocks must remain as Products & Services below diary.");
assertNotContains(files.gallery, "imageUrl={featuredDiaryEntry.image_url", "Public Shop diary must not render diary pictures as a second product gallery.");
assertNotContains(files.gallery, "videoUrl={featuredDiaryEntry.video_url", "Public Shop diary must not render diary videos as a second product gallery.");
assertNotContains(files.gallery, "The shop owner says this happened", "Public Shop diary must not show maker/evidence boundary copy to visitors.");
assertNotContains(files.gallery, "Visible for 24 hours on this shop face", "Public Shop diary must not explain internal expiry mechanics to visitors.");
assertNotContains(files.gallery, "Show first 12 blocks", "Public Shop must not keep stale 12-block product wording.");
assertNotContains(files.assets, "inside the Shop Diaries", "Product share feedback must not call product blocks Shop Diaries.");
assertContains(files.gallery, 'data-public-shop-neon-environment="approved-soft"', "Public Shop must expose the approved scoped neon presentation marker.");
assertContains(files.presentation, ".public-shop-shell.public-shop-neon-environment", "The approved neon environment must stay scoped to Public Shop.");
assertContains(files.presentation, "--shop-neon-blue", "The approved neon environment must retain its controlled blue illumination token.");
assertContains(files.presentation, ".public-shop-neon-environment .shop-diary-card", "Existing product cards must receive only the scoped neon frame.");
assertContains(files.presentation, ".public-shop-neon-environment .public-shop-inner::before", "The approved showroom must retain its static neon side rails.");
assertContains(files.presentation, "pointer-events: none", "Decorative neon layers must never intercept shop interactions.");
assertContains(files.presentation, ".public-shop-neon-environment .public-shop-vault-ad", "Private Vault must remain inside the scoped neon environment.");
assertNotContains(files.presentation, /public-shop-product-update-ticker:hover/, "The compact Shop Update ticker must not pause from sticky phone hover after voice playback.");
const presentationSource = read(files.presentation);
const approvedAnimationNames = new Set([
  "public-shop-button-neon-travel",
  "public-shop-product-update-scroll",
]);
const declaredKeyframes = Array.from(
  presentationSource.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g),
  (match) => match[1]
);
const unapprovedKeyframes = declaredKeyframes.filter(
  (name) => !approvedAnimationNames.has(name)
);
if (unapprovedKeyframes.length) {
  findings.push(
    `${path.relative(repo, files.presentation)}: The neon background must remain static; unapproved animation found: ${unapprovedKeyframes.join(", ")}.`
  );
}
assertNotContains(
  files.presentation,
  /\.public-shop-(?:shell|inner)(?:::[a-z-]+)?\s*\{[^}]*animation\s*:/s,
  "The neon showroom background and rails must remain static."
);

if (findings.length) {
  console.error("Shop Diary Phase 1 audit failed:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Shop Diary Phase 1 audit passed.");
