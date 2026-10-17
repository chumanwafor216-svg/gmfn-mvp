/* global console, localStorage, URL, window */

import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { createServer } from 'vite';

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const screenshotDir = join(frontendRoot, 'screenshots');
mkdirSync(screenshotDir, { recursive: true });

const ownerId = 'GSN-U-PLUSOWNER';
const visitorId = 'GSN-U-PLUSVISITOR';
const clan = {
  id: 8,
  clan_id: 8,
  name: 'Shortcut Community',
  marketplace_name: 'Shortcut Marketplace',
  status: 'active',
  membership_role: 'member',
};
const shop = {
  id: 101,
  shop_id: 101,
  clan_id: 8,
  owner_user_id: 216,
  gmfn_id: ownerId,
  owner_gmfn_id: ownerId,
  name: 'Shortcut Shop',
  shop_name: 'Shortcut Shop',
  description: 'Synthetic shortcut qualification shop.',
  is_active: true,
};
const spotlight = {
  id: 501,
  broadcast_id: 501,
  spotlight_campaign_id: 701,
  shop_id: 101,
  clan_id: 8,
  author_user_id: 216,
  author_gmfn_id: ownerId,
  source_shop_name: 'Shortcut Shop',
  message: 'Shortcut Spotlight',
  priority_mode: 'free',
  visibility_scope: 'direct_communities',
  serving_status: 'serving',
  campaign_serving_status: 'serving',
  activated_at: '2026-10-16T14:35:00Z',
  authorized_expires_at: '2026-10-17T14:35:00Z',
  expires_at: '2026-10-17T14:35:00Z',
  lifecycle_writers_enabled: true,
};
const diary = {
  id: 91,
  shop_id: 101,
  clan_id: 8,
  activity_type: 'other_update',
  activity_label: 'Other update',
  note: 'Shortcut diary update.',
  evidence_class: 'owner_update',
  is_public: true,
  is_active: true,
  occurred_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
};
const product = {
  id: 601,
  shop_id: 101,
  clan_id: 8,
  name: 'Jollof tray',
  description: '[BLOCK:2] Family meal tray.',
  price: '12500',
  currency: 'NGN',
  image_url: '',
  video_url: '',
  visibility_mode: 'community_visible',
  public_block_number: 2,
  is_active: true,
};

function json(body, status = 200) {
  return { status, contentType: 'application/json', body: JSON.stringify(body) };
}

function isApi(urlText) {
  const url = new URL(urlText);
  return url.port === '8000' || [
    '/api/', '/auth/', '/clans/', '/community-domains', '/marketplace',
    '/shop-diaries', '/trust', '/dashboard', '/notifications', '/attention-spine',
    '/loans', '/pool', '/protected-trades', '/payment-instructions',
  ].some((prefix) => url.pathname.startsWith(prefix));
}

function apiPath(urlText) {
  return new URL(urlText).pathname.replace(/^\/api/, '');
}

function businessWrites(mutations) {
  return mutations.filter(
    (request) =>
      !request.includes('/clans/select') &&
      !request.includes('/marketplace/analytics/attention'),
  );
}

function member(identity) {
  return {
    id: identity === ownerId ? 216 : 317,
    user_id: identity === ownerId ? 216 : 317,
    display_name: identity === ownerId ? 'Shortcut Owner' : 'Shortcut Visitor',
    email: 'shortcut@example.invalid',
    gmfn_id: identity,
    role: 'member',
    status: 'active',
  };
}

async function installMocks(page, scenario) {
  await page.route('**/*', async (route) => {
    if (!isApi(route.request().url())) return route.continue();
    const url = new URL(route.request().url());
    const path = apiPath(route.request().url());
    const method = route.request().method();
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) scenario.mutations.push(`${method} ${path}`);

    if (path === '/auth/me' || path === '/users/me') {
      return route.fulfill(json(member(scenario.identity)));
    }
    if (path === '/clans/me') return route.fulfill(json(scenario.memberOfCommunity === false ? [] : [clan]));
    if (path.includes('/clans/select')) return route.fulfill(json({ selected_clan_id: 8 }));
    if (path.includes('/clans/current') || path.includes('/clans/selected')) {
      return route.fulfill(json(clan));
    }
    if (/^\/clans\/8\/members/.test(path)) {
      return route.fulfill(json({ items: [member(scenario.identity)] }));
    }
    if (path.startsWith('/community-domains')) {
      return route.fulfill(json({
        items: scenario.demandPolicyOff
          ? [{
              id: 80,
              clan_id: 8,
              community_domain: { id: 80, clan_id: 8, display_name: 'Shortcut Community' },
              feature_policy: { features: { demand_box: 'off' } },
            }]
          : [],
      }));
    }
    if (path === `/marketplace/public/shop/${ownerId}`) {
      return route.fulfill(json({
        ok: true,
        item: shop,
        shop,
        products: [product],
        broadcasts: [spotlight],
        primary_broadcast: spotlight,
        clan_id: 8,
      }));
    }
    if (path.startsWith(`/shop-diaries/public/${ownerId}`)) {
      return route.fulfill(json({ items: [diary], total: 1 }));
    }
    if (path === '/marketplace/shops/101/spotlight-status') {
      const state = scenario.ownerSpotlightState;
      return route.fulfill(json({
        owner_spotlight_inspection: {
          state,
          campaign: state === 'none' ? null : {
            campaign_id: 701,
            status: 'active',
            serving_status: 'serving',
            activated_at: spotlight.activated_at,
            authorized_expires_at: spotlight.authorized_expires_at,
          },
          item: state === 'none' ? null : spotlight,
          counts_as_delivery: false,
          counts_as_exposure: false,
        },
      }));
    }
    if (path.endsWith('/spotlight-opportunity')) {
      return route.fulfill(json({ serving_contract_version: 2, items: [] }));
    }
    if (path.startsWith('/marketplace/shops/me') || path.startsWith('/marketplace/shops/mine')) {
      return route.fulfill(json({ item: shop, shop, products: [product] }));
    }
    if (path === '/marketplace/shops' || path.startsWith('/marketplace/shops?')) {
      return route.fulfill(json({ items: [shop], shops: [shop] }));
    }
    if (path.startsWith('/marketplace/products')) {
      return route.fulfill(json({ items: [product], products: [product] }));
    }
    if (path.startsWith('/marketplace/broadcasts')) {
      return route.fulfill(json({ items: [spotlight] }));
    }
    if (path.startsWith('/marketplace/requests')) {
      return route.fulfill(json({ items: [], total: 0 }));
    }
    if (path.includes('/relay-policy')) {
      return route.fulfill(json({ outbound_enabled: false, inbound_enabled: false, version: 0 }));
    }
    if (path.startsWith('/trust')) return route.fulfill(json({ score: 0, band: 'Not shown', events: [] }));
    if (path.startsWith('/pool')) return route.fulfill(json({ balance: 0, items: [] }));
    if (path.startsWith('/loans')) return route.fulfill(json({ items: [] }));
    if (path.startsWith('/protected-trades')) return route.fulfill(json({ items: [] }));
    if (path.startsWith('/payment-instructions')) return route.fulfill(json({ items: [] }));
    if (url.pathname.startsWith('/api/') || url.port === '8000') {
      return route.fulfill(json({ items: [], results: [], records: [], total: 0, status: 'ok' }));
    }
    return route.fulfill(json({ items: [] }));
  });
}

async function newPhonePage(browser, scenario) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(({ identity }) => {
    localStorage.setItem('access_token', 'synthetic-three-plus-token');
    localStorage.setItem('gmfn_current_id', identity);
    localStorage.setItem('gmfn_selected_clan_id', '8');
    localStorage.setItem('gmfn_companion_settings_local', JSON.stringify({ companionMode: 'off' }));
  }, { identity: scenario.identity });
  await installMocks(page, scenario);
  return { context, page };
}

async function assertTouchTarget(locator, label) {
  const box = await locator.boundingBox();
  if (!box || box.width < 48 || box.height < 48) {
    throw new Error(`${label} touch target was ${box?.width || 0} by ${box?.height || 0}, expected at least 48 by 48.`);
  }
}

async function testOwnerShopShortcuts(browser, baseUrl, ownerState) {
  const scenario = { identity: ownerId, ownerSpotlightState: ownerState, demandPolicyOff: false, memberOfCommunity: true, mutations: [] };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const summary = page.locator('[data-public-shop-more="secondary"] summary');
  await summary.waitFor({ state: 'visible', timeout: 20_000 });
  if ((await page.locator('[data-public-shop-more="secondary"]').getAttribute('open')) === null) await summary.click();

  const spotlightPlus = page.getByRole('link', { name: 'Add Spotlight' });
  const diaryPlus = page.getByRole('link', { name: 'Add diary entry' });
  await spotlightPlus.waitFor({ state: 'visible', timeout: 20_000 });
  await diaryPlus.waitFor({ state: 'visible', timeout: 20_000 });
  await assertTouchTarget(spotlightPlus, 'Spotlight plus');
  await assertTouchTarget(diaryPlus, 'Shop Diary plus');
  if (await page.getByRole('link', { name: 'Manage Jollof tray' }).count()) {
    throw new Error('Owner received the removed floating product management plus.');
  }
  if (await page.getByText(/Started 16 Oct 2026|Expires 17 Oct 2026|Owner inspection does not count/).count()) {
    throw new Error('Live owner Spotlight still exposes removed timing or inspection copy.');
  }
  await page.getByText('Owner invitation only.').waitFor({ state: 'visible', timeout: 20_000 });
  if (await page.getByText('Sends a private-offer request, not the public shop share.').count()) {
    throw new Error('Private Vault still exposes removed explanatory copy.');
  }
  const mode = await spotlightPlus.getAttribute('data-spotlight-shortcut-mode');
  const expectedMode = ownerState === 'none' ? 'create' : 'manage';
  if (mode !== expectedMode) throw new Error(`Spotlight shortcut mode was ${mode}, expected ${expectedMode}.`);

  await page.screenshot({
    path: join(screenshotDir, `three-plus-owner-shop-${ownerState}-390x844.png`),
    fullPage: true,
  });

  await spotlightPlus.click();
  await page.waitForTimeout(750);
  if (!/\/app\/shop-control.*community=8.*#shop-control-spotlight/.test(page.url())) {
    throw new Error(`Spotlight shortcut navigated to ${page.url()}, expected Shop Control Spotlight with community=8.`);
  }
  const spotlightOrigin = await page.evaluate(() => window.history.state?.usr?.originPath || '');
  if (!spotlightOrigin.includes(`/shop/${ownerId}`)) throw new Error('Spotlight shortcut lost its public-shop return path.');
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 60_000 });
  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) throw new Error(`Owner shortcut navigation issued business write request(s): ${writes.join(', ')}.`);
  await context.close();
}

async function testVisitorShopShortcutsHidden(browser, baseUrl) {
  const scenario = { identity: visitorId, ownerSpotlightState: 'live', demandPolicyOff: false, memberOfCommunity: true, mutations: [] };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const summary = page.locator('[data-public-shop-more="secondary"] summary');
  await summary.waitFor({ state: 'visible', timeout: 20_000 });
  if ((await page.locator('[data-public-shop-more="secondary"]').getAttribute('open')) === null) await summary.click();
  if (await page.getByRole('link', { name: 'Add Spotlight' }).count()) throw new Error('Visitor received owner Spotlight shortcut.');
  if (await page.getByRole('link', { name: 'Add diary entry' }).count()) throw new Error('Visitor received owner Shop Diary shortcut.');
  if (await page.getByRole('link', { name: 'Manage Jollof tray' }).count()) throw new Error('Visitor received owner product-block shortcut.');
  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) throw new Error(`Visitor inspection issued business write request(s): ${writes.join(', ')}.`);
  await context.close();
}

async function testOwnerProductSinglePlus(browser, baseUrl) {
  const scenario = { identity: ownerId, ownerSpotlightState: 'live', demandPolicyOff: false, memberOfCommunity: true, mutations: [] };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (await page.getByRole('link', { name: 'Manage Jollof tray' }).count()) {
    throw new Error('Product card still exposes the duplicate floating management plus.');
  }
  const productPlus = page.getByRole('button', { name: 'Open Jollof tray' });
  await productPlus.waitFor({ state: 'visible', timeout: 20_000 });
  const openSymbol = await productPlus.locator('[data-product-card-toggle-symbol="open"]').textContent();
  if (openSymbol?.trim() !== '+') throw new Error(`Internal product control was ${openSymbol}, expected +.`);
  await productPlus.click();
  await page.getByRole('button', { name: 'Close Jollof tray' }).waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('[data-product-card-toggle-symbol="close"]').waitFor({ state: 'visible', timeout: 20_000 });
  await page.screenshot({
    path: join(screenshotDir, 'three-plus-owner-product-single-plus-390x844.png'),
    fullPage: true,
  });
  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) throw new Error(`Product open/close issued business write request(s): ${writes.join(', ')}.`);
  await context.close();
}

async function testDemandShortcut(browser, baseUrl, { demandPolicyOff = false, memberOfCommunity = true } = {}) {
  const scenario = { identity: ownerId, ownerSpotlightState: 'live', demandPolicyOff, memberOfCommunity, mutations: [] };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/app/marketplace?clan_id=8`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const demandPlus = page.getByRole('link', { name: 'Add request' });
  if (demandPolicyOff || !memberOfCommunity) {
    await page.waitForTimeout(1_000);
    if (await demandPlus.count()) throw new Error('DemandBox shortcut was exposed without both membership and enabled policy.');
    await context.close();
    return;
  }

  await demandPlus.waitFor({ state: 'visible', timeout: 30_000 });
  await assertTouchTarget(demandPlus, 'DemandBox plus');
  const demandHref = await demandPlus.getAttribute('href');
  const demandTarget = new URL(demandHref || '', baseUrl);
  if (
    demandTarget.pathname !== '/app/demand-box' ||
    demandTarget.searchParams.get('community') !== '8' ||
    demandTarget.searchParams.get('mode') !== 'create'
  ) {
    throw new Error(`DemandBox shortcut href was ${demandHref}, expected create mode with community=8.`);
  }
  await page.screenshot({
    path: join(screenshotDir, 'three-plus-marketplace-390x844.png'),
    fullPage: true,
  });
  await demandPlus.click();
  await page.waitForTimeout(750);
  const openedDemandUrl = new URL(page.url());
  if (
    openedDemandUrl.pathname !== '/app/demand-box' ||
    openedDemandUrl.searchParams.get('community') !== '8'
  ) {
    throw new Error(`DemandBox shortcut navigated to ${page.url()}, expected DemandBox with community=8.`);
  }
  const form = page.locator('#demand-box-create');
  await form.waitFor({ state: 'visible', timeout: 30_000 });
  const title = form.locator('input').first();
  await title.waitFor({ state: 'visible', timeout: 20_000 });
  const formBox = await form.boundingBox();
  if (!formBox || formBox.top > 220) throw new Error(`DemandBox form was not revealed near the viewport (top=${formBox?.top}).`);
  const origin = await page.evaluate(() => window.history.state?.usr?.originPath || '');
  if (!origin.includes('/app/marketplace')) throw new Error('DemandBox shortcut lost its Marketplace return path.');
  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) throw new Error(`DemandBox shortcut navigation issued business write request(s): ${writes.join(', ')}.`);
  await context.close();
}

const server = await createServer({
  root: frontendRoot,
  logLevel: 'silent',
  server: { host: '127.0.0.1', port: 5202, strictPort: true },
});
await server.listen();
const baseUrl = server.resolvedUrls.local[0].replace(/\/+$/, '');
const browser = await chromium.launch({ headless: true });

try {
  await testOwnerShopShortcuts(browser, baseUrl, 'live');
  await testOwnerShopShortcuts(browser, baseUrl, 'none');
  await testOwnerProductSinglePlus(browser, baseUrl);
  await testVisitorShopShortcutsHidden(browser, baseUrl);
  await testDemandShortcut(browser, baseUrl);
  await testDemandShortcut(browser, baseUrl, { demandPolicyOff: true });
  await testDemandShortcut(browser, baseUrl, { memberOfCommunity: false });
  console.log(JSON.stringify({
    ok: true,
    environment: 'local Vite + mocked synthetic API at 390x844',
    checks: [
      'owner live Spotlight uses manage handoff',
      'owner absent Spotlight uses create handoff',
      'visitor owner shortcuts hidden',
      'owner product card has no floating management plus and keeps one internal + / × control',
      'DemandBox create handoff preserves community and origin',
      'DemandBox policy OFF hides create shortcut',
      'non-member route context does not expose create shortcut',
      'all approved entry shortcut touch targets are at least 48 by 48',
      'shortcut navigation issues no business write; existing context/attention telemetry is excluded',
    ],
  }, null, 2));
} finally {
  await browser.close();
  await server.close();
}
