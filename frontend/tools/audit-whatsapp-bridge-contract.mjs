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

const app = read("src/App.tsx");
const routes = read("src/lib/appRoutes.ts");
const page = read("src/pages/WhatsAppBridgePage.tsx");
const registry = read("../docs/SCREEN_REGISTRY.md");
const specs = read("../docs/SCREEN_SPECS.md");
const protocol = read("../docs/GSN_WHATSAPP_BRIDGE_PROTOCOL_2026-09-11.md");

mustInclude("App.tsx", app, "WhatsAppBridgePage");
mustInclude("App.tsx", app, 'path="whatsapp-bridge" element={<WhatsAppBridgePage />}');
mustInclude("App.tsx", app, 'path="/whatsapp-bridge" element={<PreserveRedirect to={APP_ROUTES.WHATSAPP_BRIDGE} />}');

mustInclude("appRoutes.ts", routes, 'WHATSAPP_BRIDGE: "/app/whatsapp-bridge"');
mustInclude("appRoutes.ts", routes, '"WHATSAPP_BRIDGE"');

mustInclude("WhatsAppBridgePage.tsx", page, 'data-gsn-whatsapp-bridge="root"');
mustInclude("WhatsAppBridgePage.tsx", page, "Copy Bridge Message");
mustInclude("WhatsAppBridgePage.tsx", page, "Share to WhatsApp");
mustInclude("WhatsAppBridgePage.tsx", page, "Group description");
mustInclude("WhatsAppBridgePage.tsx", page, "Pinned message");
mustInclude("WhatsAppBridgePage.tsx", page, "No WhatsApp scraping");
mustInclude("WhatsAppBridgePage.tsx", page, "/app/demand-box?mode=ask_community");
mustInclude("WhatsAppBridgePage.tsx", page, "Demand Box");
mustInclude("WhatsAppBridgePage.tsx", page, "GSN records GSN actions only");

mustInclude("SCREEN_REGISTRY.md", registry, "WhatsAppBridgePage");
mustInclude("SCREEN_SPECS.md", specs, "## WhatsAppBridgePage");
mustInclude("SCREEN_SPECS.md", specs, "Ask Community must route into Demand Box question mode");
mustInclude("protocol", protocol, "WhatsApp is the conversation room. GSN is the organised action room.");
mustInclude("protocol", protocol, "WhatsApp Status is only a reminder");

console.log("WhatsApp Bridge contract audit passed.");