/* global console, localStorage, URL */

import { chromium } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return url.pathname;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  const prefixes = [
    "/api/",
    "/auth/",
    "/clans/",
    "/community-domains",
    "/dashboard",
    "/identity",
    "/loans",
    "/marketplace",
    "/notifications",
    "/payment-instructions",
    "/pool",
    "/protected-trades",
    "/rosca",
    "/trust",
    "/trust-slips",
  ];

  return (
    url.port === "8000" ||
    prefixes.some((prefix) => url.pathname === prefix || url.pathname.startsWith(prefix))
  );
}

const me = {
  id: 216,
  user_id: 216,
  display_name: "Audit Member",
  name: "Audit Member",
  email: "audit@gsn.local",
  gmfn_id: "GMFN-U-HITBOX",
  gsn_id: "GMFN-U-HITBOX",
  role: "member",
  phone_verified: true,
  status: "active",
};

const clan = {
  id: 8,
  clan_id: 8,
  name: "Homeland isa Marketplace",
  display_name: "Homeland isa Marketplace",
  community_name: "Homeland isa Marketplace",
  marketplace_name: "Homeland isa Marketplace",
  clan_code: "GMFN-C-HITBOX",
  community_code: "GMFN-C-HITBOX",
  gmfn_id: "GMFN-C-HITBOX",
  role: "admin",
  member_role: "admin",
  member_count: 18,
  public_shop_count: 2,
  trust_band: "B",
};

function payloadFor(path) {
  if (path === "/auth/me" || path === "/users/me") return me;
  if (path === "/clans/me") return { items: [clan] };
  if (path === "/clans/select" || path === "/clans/select/") return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/select\/?$/.test(path)) return { selected_clan_id: 8 };
  if (/^\/clans\/\d+\/members/.test(path)) return { items: [] };
  if (/^\/clans\/\d+\/invite-link/.test(path)) return { invite_url: "", code: "" };
  if (path === "/community-domains/my") return { items: [] };
  if (/^\/dashboard/.test(path)) return { community: clan, totals: {}, spotlight: null };
  if (/^\/marketplace\/shops\/me/.test(path)) return { shop: null, products: [] };
  if (/^\/marketplace\/shops/.test(path)) return { items: [], shops: [] };
  if (/^\/marketplace\/analytics/.test(path)) return { items: [], results: [], total: 0 };
  if (/^\/marketplace\/requests/.test(path)) return { items: [], requests: [] };
  if (/^\/marketplace/.test(path)) return { items: [], listings: [] };
  if (/^\/notifications/.test(path)) return [];
  if (/^\/loans/.test(path) || /^\/borrowing/.test(path)) return { items: [], loans: [] };
  if (/^\/pool\//.test(path)) return { balance: 0, available_balance: 0, items: [] };
  if (/^\/payment-instructions/.test(path)) return { items: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/rosca/.test(path)) return { items: [], cycles: [] };
  if (path === "/trust/me/why") {
    return {
      user_id: 216,
      current_score: 72,
      score: 72,
      band: "B",
      latest_reason: "Current community evidence remains visible.",
      recent_events: [],
    };
  }
  if (/^\/trust-explainability/.test(path) || /^\/trust_explainability/.test(path)) {
    return { user_id: 216, score: 72, band: "B", event_count: 4, breakdown: { computed_score: 72, computed_band: "B" } };
  }
  if (/^\/trust-slips\/me/.test(path)) {
    return {
      verified: true,
      active: true,
      status: "active",
      code: "TS-HITBOX",
      verification_code: "TS-HITBOX",
      display_name: "Audit Member",
      community: "Homeland isa Marketplace",
      level: "B",
      band: "B",
      open_trust_class: "B",
      cross_community_integrity_class: "B",
      trust_score: 72,
      standing_score: 72,
      phone_recorded: true,
      phone_verified: true,
      public_verify_url: "/t/TS-HITBOX",
    };
  }
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: [] };
  return { items: [], results: [], total: 0, status: "ok" };
}

async function mockApi(route) {
  const url = route.request().url();
  if (!isApiRequest(url)) {
    await route.continue();
    return;
  }

  await route.fulfill(json(payloadFor(apiPathFrom(url))));
}

const server = await createServer({
  root: frontendRoot,
  logLevel: "silent",
  server: { host: "127.0.0.1", port: 0 },
});

await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, "");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});

try {
  const page = await context.newPage();
  await page.route("**/*", mockApi);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "dashboard-passport-hitbox-token");
    localStorage.setItem("gmfn_auth_token", "dashboard-passport-hitbox-token");
    localStorage.setItem("token", "dashboard-passport-hitbox-token");
    localStorage.setItem("gmfn_current_id", "GMFN-U-HITBOX");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    localStorage.setItem("selected_clan_id", "8");
  });

  await page.goto(`${baseUrl}/app/dashboard`, { waitUntil: "networkidle", timeout: 20000 });
  const tiles = page.locator('[data-dashboard-passport-feature-status="true"]');
  const tileCount = await tiles.count();

  if (tileCount !== 3) {
    throw new Error(`Expected 3 passive passport status tiles, found ${tileCount}.`);
  }

  const beforeUrl = page.url();
  const findings = [];

  for (let index = 0; index < tileCount; index += 1) {
    const tile = tiles.nth(index);
    await tile.scrollIntoViewIfNeeded();
    const label = await tile.getAttribute("aria-label");
    const semantics = await tile.evaluate((element) => ({
      tag: element.tagName.toLowerCase(),
      role: element.getAttribute("role"),
      hasClickableAncestor: Boolean(element.parentElement?.closest("button,a,[role='button'],[data-gmfn-action-root='true'],[data-cta-id]")),
    }));

    if (semantics.tag !== "div" || semantics.role === "button") {
      findings.push(`${label || `tile ${index + 1}`} has action semantics: ${JSON.stringify(semantics)}`);
    }

    await tile.tap({ force: true, timeout: 5000 });
    await page.waitForTimeout(220);

    if (page.url() !== beforeUrl) {
      findings.push(`${label || `tile ${index + 1}`} changed route from ${beforeUrl} to ${page.url()}.`);
      await page.goto(beforeUrl, { waitUntil: "networkidle", timeout: 20000 });
    }
  }

  if (findings.length > 0) {
    throw new Error(`Dashboard passive passport hitbox audit failed:\n- ${findings.join("\n- ")}`);
  }

  console.log("Dashboard passive passport hitbox audit passed: Visible, Portable, and Usable remain passive under mobile taps.");
} finally {
  await context.close();
  await browser.close();
  await server.close();
}