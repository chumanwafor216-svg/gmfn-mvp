/* global console */
import fs from "node:fs";

function read(path) {
  return fs.readFileSync(path, "utf8");
}

function mustInclude(name, text, needle) {
  if (!text.includes(needle)) {
    throw new Error(`${name} is missing required bridge contract text: ${needle}`);
  }
}

function mustNotInclude(name, text, needle) {
  if (text.includes(needle)) {
    throw new Error(`${name} still includes retired broad-bridge behavior: ${needle}`);
  }
}

const app = read("src/App.tsx");
const routes = read("src/lib/appRoutes.ts");
const page = read("src/pages/WhatsAppBridgePage.tsx");
const communityHome = read("src/pages/CommunityHomePage.tsx");
const registry = read("../docs/SCREEN_REGISTRY.md");
const specs = read("../docs/SCREEN_SPECS.md");
const protocol = read("../docs/GSN_WHATSAPP_BRIDGE_PROTOCOL_2026-09-11.md");

mustInclude("App.tsx", app, "WhatsAppBridgePage");
mustInclude("App.tsx", app, 'path="whatsapp-bridge" element={<WhatsAppBridgePage />}');
mustInclude("App.tsx", app, 'path="/whatsapp-bridge" element={<PreserveRedirect to={APP_ROUTES.WHATSAPP_BRIDGE} />}');

mustInclude("appRoutes.ts", routes, 'WHATSAPP_BRIDGE: "/app/whatsapp-bridge"');
mustInclude("appRoutes.ts", routes, '"WHATSAPP_BRIDGE"');

mustInclude("WhatsAppBridgePage.tsx", page, 'data-gsn-whatsapp-bridge="root"');
mustInclude("WhatsAppBridgePage.tsx", page, "Community Domain Bulletin Bridge");
mustInclude("WhatsAppBridgePage.tsx", page, "Broadcast approved public bulletins.");
mustInclude("WhatsAppBridgePage.tsx", page, "Copy Bulletin Message");
mustInclude("WhatsAppBridgePage.tsx", page, "Share to WhatsApp");
mustInclude("WhatsAppBridgePage.tsx", page, "No public bulletin ready");
mustInclude("WhatsAppBridgePage.tsx", page, "Output only");
mustInclude("WhatsAppBridgePage.tsx", page, "No internal tools");
mustInclude("WhatsAppBridgePage.tsx", page, "No WhatsApp scraping");
mustInclude("WhatsAppBridgePage.tsx", page, "listCommunityNotices");
mustInclude("WhatsAppBridgePage.tsx", page, "publicNoticeUrl");
mustInclude("WhatsAppBridgePage.tsx", page, "isMarketNeedPulseNotice");
mustInclude("WhatsAppBridgePage.tsx", page, "!isMarketNeedPulseNotice(item)");
mustInclude("WhatsAppBridgePage.tsx", page, "The Community Domain Bulletin Bridge broadcasts public bulletin");
mustInclude("WhatsAppBridgePage.tsx", page, "Replies, acknowledgements, interest, approval, and");
mustNotInclude("WhatsAppBridgePage.tsx", page, "StableCtaLink");
mustNotInclude("WhatsAppBridgePage.tsx", page, "sourceRows");
mustNotInclude("WhatsAppBridgePage.tsx", page, "SignpostSource");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Membership QR / invite");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Community Domain setup");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/clans");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/community-domain");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/shop-control#shop-control-gallery-tools");
mustNotInclude("WhatsAppBridgePage.tsx", page, "/app/demand-box?mode=ask_community");
mustNotInclude("WhatsAppBridgePage.tsx", page, "whatsapp-bridge.destination.");
mustNotInclude("WhatsAppBridgePage.tsx", page, "whatsapp-bridge.source.");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Fallback signpost link");
mustNotInclude("WhatsAppBridgePage.tsx", page, "Copy Signpost Message");

mustInclude("CommunityHomePage.tsx", communityHome, "Domain bulletin bridge");
mustInclude("CommunityHomePage.tsx", communityHome, "Share public bulletin output to WhatsApp, social, or email without exposing internal tools.");
mustInclude("CommunityHomePage.tsx", communityHome, "routes.whatsappBridge");
mustInclude("CommunityHomePage.tsx", communityHome, "community-home.lane.marketplace-tools");

mustInclude("SCREEN_REGISTRY.md", registry, "WhatsAppBridgePage");
mustInclude("SCREEN_SPECS.md", specs, "## WhatsAppBridgePage");
mustInclude("SCREEN_SPECS.md", specs, "Community Domain Bulletin Bridge title");
mustInclude("SCREEN_SPECS.md", specs, "broadcast already-published");
mustInclude("SCREEN_SPECS.md", specs, "Community Domain bulletin outputs");
mustInclude("SCREEN_SPECS.md", specs, "Do not expose GSN internal feature pointers");
mustInclude("protocol", protocol, "Community Domain Bulletin Bridge");
mustInclude("protocol", protocol, "WhatsApp is the conversation room. GSN is the organised action room.");
mustInclude("protocol", protocol, "feature-specific public share link");
mustInclude("protocol", protocol, "WhatsApp Status is only a reminder");

console.log("WhatsApp Bridge contract audit passed.");