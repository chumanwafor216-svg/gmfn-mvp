/* global document, localStorage, process */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const repoRoot = resolve("..");
const outDir = join(repoRoot, "docs", "gsn-user-guide", "screenshots");
mkdirSync(outDir, { recursive: true });
const baseUrl = (process.env.GSN_CAPTURE_BASE_URL || "http://127.0.0.1:5173").replace(/\/+$/, "");
const captureDate = "2026-09-13";
const demoSlipCode = "TS-DEMO-SELF-SERVICE";
const demoCommunity = { id: 201, clan_id: 201, name: "GSN Demo Community", display_name: "GSN Demo Community", community_name: "GSN Demo Community", role: "owner", member_count: 18, community_code: "GSN-C-DEMO" };
const demoMember = { id: 101, user_id: 101, display_name: "Demo Owner", nickname: "Demo Owner", email: "demo-owner@guided.gsn.local", role: "admin", phone_verified: true, gmfn_id: "GSN-U-DEMO101", gsn_id: "GSN-U-DEMO101", selected_clan_id: 201 };
const shop = { id: 301, shop_id: 301, name: "Demo Family Shop", business_name: "Demo Family Shop", category: "General merchandise", description: "School bags, household goods, and community supply support.", gmfn_id: "GSN-U-DEMO101", owner_gmfn_id: "GSN-U-DEMO101", owner_name: "Demo Owner", whatsapp: "+440000000000", phone: "+440000000000", follower_count: 3, clan_id: 201, community_name: demoCommunity.name };
const product = { id: 401, product_id: 401, shop_id: 301, title: "School bag", name: "School bag", description: "Durable school bag available for community buyers.", price: "25", currency: "GBP", category: "School supplies", availability: "In stock", visibility: "public", status: "active", image_url: "", media_url: "", source_shop_name: shop.name, source_product_title: "School bag", source_product_price: "25", source_product_currency: "GBP" };
const spotlight = { id: 501, broadcast_id: 501, shop_id: 301, product_id: 401, title: "School bag", message: "School bag", body: "Durable school bag available now.", status: "active", priority_mode: "free", created_at: new Date().toISOString(), expires_at: new Date(Date.now()+86400000).toISOString(), author_name: "Demo Owner", author_gmfn_id: "GSN-U-DEMO101", source_shop_name: shop.name, source_clan_name: demoCommunity.name, source_product_title: product.title, source_product_price: product.price, source_product_currency: product.currency, source_product_category: product.category, source_product_availability: product.availability };
const demand = { id: 601, request_id: 601, title: "Need carpenter for shelves", description: "Looking for a trusted carpenter within the community.", category: "Community Ask", status: "open", clan_id: 201, community_name: demoCommunity.name, requester_name: "Demo Owner", requester_gmfn_id: "GSN-U-DEMO101", created_at: new Date().toISOString(), whatsapp: "+440000000000", support_type: "Trust credit", location: "Aberdeen" };
const notice = { notice_id: 701, id: 701, public_code: "NOTICE-DEMO-701", title: "Community market day", body: "Approved public bulletin for community members.", notice_kind: "announcement", public_qr_enabled: true, sender_name: "Demo Owner", sender_whatsapp_number: "+440000000000", clan_id: 201, community_name: demoCommunity.name, created_at: new Date().toISOString() };
function json(body, status=200){ return { status, contentType: "application/json", body: JSON.stringify(body) }; }
function pathOf(urlText){ const u = new URL(urlText); return u.pathname.startsWith("/api/") ? u.pathname.replace(/^\/api/, "") + u.search : u.pathname + u.search; }
function trustSlip(){ return { code: demoSlipCode, token: demoSlipCode, verification_code: demoSlipCode, status: "active", valid: true, verified: true, is_current: true, public_verify_url: `/t/${demoSlipCode}`, holder_name: "Demo Owner", display_name: "Demo Owner", gmfn_id: "GSN-U-DEMO101", holder_gmfn_id: "GSN-U-DEMO101", community_name: demoCommunity.name, community_code: demoCommunity.community_code, cci_public_label: "Evidence building", cci_public_meaning: "This public record is building evidence for the selected purpose.", cci_public_boundary: "Evidence for judgement only, not a guarantee or approval.", event_count: 4, community_activity_count: 2, member_witness_count: 1, issued_at: new Date().toISOString(), expires_at: new Date(Date.now()+2592000000).toISOString(), disclaimer: "TrustSlip is evidence for judgement. It is not a guarantee, escrow, payment instruction, or automatic approval." }; }
async function installMocks(page){
  await page.route("**/*", async route => {
    const req = route.request(); const u = new URL(req.url()); const path = pathOf(req.url()); const method = req.method().toUpperCase();
    if (req.resourceType() === "document" && u.origin === new URL(baseUrl).origin) return route.continue();
    const isApi = u.pathname.startsWith("/api/") || u.port === "8012" || ["/auth","/clans","/trust","/marketplace","/community","/public","/attention"].some(p => u.pathname.startsWith(p));
    if (!isApi) return route.continue();
    if (method === "GET" && path.startsWith("/auth/me")) return route.fulfill(json(demoMember));
    if (method === "GET" && path.startsWith("/clans/me")) return route.fulfill(json([demoCommunity]));
    if (method === "POST" && /\/clans\/\d+\/select/.test(path)) return route.fulfill(json({ selected_clan_id: 201 }));
    if (method === "GET" && path.startsWith("/public/daily-insight")) return route.fulfill(json({ source: "GSN Market Wisdom", headline: "Start with one visible offer", primary_text: "Market Wisdom is available when the public route responds.", status: "active", items: [] }));
    if (method === "GET" && path.includes("/marketplace/shops/me")) return route.fulfill(json(shop));
    if (method === "GET" && path.includes("/marketplace/public/shop")) return route.fulfill(json({ shop, products: [product], broadcasts: [spotlight], follower_count: 3 }));
    if (method === "GET" && path.includes("/marketplace/shops/by-gmfn")) return route.fulfill(json({ shop, products: [product], broadcasts: [spotlight] }));
    if (method === "GET" && path.includes("/marketplace/shops") && path.includes("followers/count")) return route.fulfill(json({ follower_count: 3, boundary_label: "Followers are repeat audience, not buyers or payment evidence." }));
    if (method === "GET" && path.includes("/marketplace/shops") && path.includes("follow-status")) return route.fulfill(json({ following: false, is_owner: true, follower_count: 3 }));
    if (method === "GET" && path.includes("/marketplace/products")) return route.fulfill(json({ items: [product], products: [product] }));
    if (method === "GET" && path.includes("/marketplace/broadcasts")) return route.fulfill(json({ items: [spotlight], broadcasts: [spotlight] }));
    if (method === "GET" && path.includes("/marketplace/requests")) return route.fulfill(json({ items: [demand], requests: [demand] }));
    if (method === "GET" && path.includes("/community-notices/settings")) return route.fulfill(json({ posting_policy: "admins", acknowledgement_enabled: true }));
    if (method === "GET" && path.includes("/community-notices/review-queue")) return route.fulfill(json({ items: [] }));
    if (method === "GET" && path.includes("/community-notices")) return route.fulfill(json({ notices: [notice], items: [notice] }));
    if (method === "GET" && path.includes("/attention-spine")) return route.fulfill(json({ items: [], signals: [] }));
    if (method === "GET" && path.includes("/marketplace/analytics/shops")) return route.fulfill(json({ followers: { follower_count: 3, boundary_label: "Followers are repeat audience, not buyers or payment evidence." }, public_items: 1, active_spotlights: 1, visitors_7d: 4, product_opens_7d: 2, contact_taps_7d: 1, advanced_analytics: { status: "evidence_building" } }));
    if (method === "GET" && path.startsWith("/trust-slips/me")) return route.fulfill(json(trustSlip()));
    if (method === "GET" && path.startsWith("/trust-slips/verify")) return route.fulfill(json(trustSlip()));
    if (method === "GET" && path.includes("/trust/score")) return route.fulfill(json({ score: null, band: "evidence_building", trust_events: 4 }));
    if (method === "GET" && path.includes("/trust/me/timeline")) return route.fulfill(json({ items: [{ label: "Community activity recorded", event_type: "community_support_activity", created_at: new Date().toISOString() }] }));
    if (method === "GET" && path.includes("/community-domains")) return route.fulfill(json({ items: [{ id: 801, name: "GSN Demo Community Domain", status: "draft", community_id: 201 }], domains: [] }));
    return route.fulfill(json({ items: [], results: [], notices: [], ok: true }));
  });
}
async function makeContext(browser){ const ctx = await browser.newContext({ viewport:{width:390,height:844}, isMobile:true }); await ctx.addInitScript((member, communityId) => { localStorage.setItem("access_token", "self-service-guide-demo-token"); localStorage.setItem("token", "self-service-guide-demo-token"); localStorage.setItem("gmfn_selected_clan_id", String(communityId)); localStorage.setItem("selected_clan_id", String(communityId)); localStorage.setItem("gmfn_profile_name", member.display_name); localStorage.setItem("gmfn_companion_settings_local", JSON.stringify({ companionMode: "off" })); }, demoMember, 201); return ctx; }
const targets = [["dashboard","/app/dashboard","Dashboard"],["community-home","/app/community","Community"],["marketplace","/app/marketplace","Marketplace"],["shop-control","/app/shop-control","Shop"],["shop-assets","/app/shop-assets","Shop"],["demandbox","/app/demand-box","DemandBox"],["bulletin-bridge","/app/whatsapp-bridge","Community Domain Bulletin Bridge"],["trust-passport","/app/trust","Trust"],["trustslip","/app/trust-slip","TrustSlip"],["public-trustslip",`/t/${demoSlipCode}`,"TrustSlip"]];
const browser = await chromium.launch({ headless: true }); const manifest=[];
try { const ctx = await makeContext(browser); for (const [slug,path,expect] of targets){ const page = await ctx.newPage(); await installMocks(page); const started = new Date().toISOString(); let found=false, title="", body="", error=""; try { await page.goto(baseUrl+path,{waitUntil:"domcontentloaded",timeout:60000}); await page.waitForTimeout(2500); body = await page.locator("body").innerText({timeout:3000}).catch(()=>""); found = body.includes(expect); title = (await page.title().catch(()=>"")) || body.split("\n").slice(0,3).join(" / "); } catch(e){ error=String(e?.message||e); } const file=`${captureDate}_${slug}.png`; await page.screenshot({ path: join(outDir,file), fullPage:false }).catch(()=>{}); await page.close(); manifest.push({ slug, route:path, screenshot:`screenshots/${file}`, expected_text:expect, expected_text_found:found, captured_at:started, data:"mocked demo data, no production data", title:title.slice(0,200), error }); } await ctx.close(); }
finally { await browser.close(); }
writeFileSync(join(outDir,"screenshot_manifest.json"), JSON.stringify(manifest,null,2));
console.log(`Captured ${manifest.length} screenshots to ${outDir}`);
for (const row of manifest) console.log(`${row.expected_text_found ? "OK" : "CHECK"} ${row.slug} ${row.route} -> ${row.screenshot}`);
