/* global console, document, localStorage, URL, window */

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
  authorized_expires_at: '2099-10-17T14:35:00Z',
  expires_at: '2099-10-17T14:35:00Z',
  lifecycle_writers_enabled: true,
};
const paidSpotlight = {
  ...spotlight,
  id: 502,
  broadcast_id: 502,
  spotlight_campaign_id: 702,
  message: 'Paid promotion is live.',
  priority_mode: 'paid',
  activated_at: '2026-10-26T08:00:00Z',
  authorized_expires_at: '2099-10-27T08:00:00Z',
  expires_at: '2099-10-27T08:00:00Z',
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
  image_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
  video_url: '',
  visibility_mode: 'community_visible',
  public_block_number: 2,
  is_active: true,
};
const vaultProduct = {
  id: 701,
  shop_id: 101,
  clan_id: 8,
  name: 'Private catering offer',
  description: 'Invitation-only catering package.',
  price: '25000',
  currency: 'NGN',
  image_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
  video_url: '',
  visibility_mode: 'vault_private',
  vault_slot_number: 1,
  vault_block_id: 9001,
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
      const features = {};
      if (scenario.demandPolicyOff) features.demand_box = 'off';
      if (scenario.diaryPolicyOff) features.shop_diary = 'off';
      if (scenario.marketplaceShopsPolicyOff) features.marketplace_shops = 'off';
      return route.fulfill(json({
        items: Object.keys(features).length > 0
          ? [{
              id: 80,
              clan_id: 8,
              community_domain: { id: 80, clan_id: 8, display_name: 'Shortcut Community' },
              feature_policy: { features },
            }]
          : [],
      }));
    }
    if (path === `/marketplace/public/shop/${ownerId}`) {
      const publicProducts = Array.isArray(scenario.publicProducts)
        ? scenario.publicProducts
        : scenario.emptyShop
        ? []
        : [product];
      return route.fulfill(json({
        ok: true,
        item: shop,
        shop,
        products: publicProducts,
        broadcasts: [spotlight],
        primary_broadcast: spotlight,
        clan_id: 8,
      }));
    }
    if (path.startsWith(`/shop-diaries/public/${ownerId}`)) {
      return route.fulfill(json({ items: [diary], total: 1 }));
    }
    if (path === '/marketplace/shops/101/spotlight-status') {
      if (scenario.paidPromotionStage) {
        const paidLive = scenario.paidPromotionStage === 'live';
        const readyCredit = scenario.paidPromotionStage === 'publish';
        return route.fulfill(json({
          available_paid_credits: readyCredit ? 1 : 0,
          active_paid_spotlights: paidLive ? 1 : 0,
          can_publish_paid_spotlight: readyCredit,
          owner_spotlight_inspection: {
            state: paidLive ? 'live' : 'none',
            item: paidLive ? paidSpotlight : null,
          },
        }));
      }
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
      const ownerProducts = Array.isArray(scenario.publicProducts)
        ? scenario.publicProducts
        : scenario.emptyShop
        ? []
        : [product];
      return route.fulfill(json({ item: shop, shop, products: ownerProducts }));
    }
    if (path.startsWith(`/marketplace/shops/by-gmfn/${ownerId}`)) {
      return route.fulfill(json({ item: shop, shop }));
    }
    if (path === '/marketplace/shops/101/follow-status') {
      return route.fulfill(json({
        ok: true,
        shop_id: 101,
        is_following: false,
        can_follow: !scenario.authoritativeShopOwner,
        is_owner: Boolean(scenario.authoritativeShopOwner),
        follower_count: 0,
      }));
    }
    if (path === '/marketplace/shops' || path.startsWith('/marketplace/shops?')) {
      return route.fulfill(json({ items: [shop], shops: [shop] }));
    }
    if (path === '/marketplace/products' && method === 'POST') {
      return route.fulfill(json({
        item: {
          ...product,
          id: 602,
          name: 'Phone smoke item',
          description: '[BLOCK:1] Phone smoke item.',
          price: '2500',
          public_block_number: 1,
        },
      }));
    }
    if (path === '/marketplace/shops/101/vault-access-links') {
      return route.fulfill(json({ items: [] }));
    }
    if (path === '/vault/shops/101/status') {
      const paid = scenario.vaultStage === 'paid-empty' || scenario.vaultStage === 'offer-ready';
      const offerReady = scenario.vaultStage === 'offer-ready';
      return route.fulfill(json({
        active_paid_slots: paid ? 1 : 0,
        blocks: paid
          ? [{
              id: 9001,
              shop_id: 101,
              slot_number: 1,
              state: 'active',
              product_id: offerReady ? vaultProduct.id : null,
              product: offerReady ? vaultProduct : null,
            }]
          : [],
      }));
    }
    if (path.startsWith('/marketplace/products')) {
      const items = scenario.vaultStage === 'paid-empty'
        ? []
        : scenario.vaultStage === 'offer-ready'
          ? [vaultProduct]
          : scenario.emptyShop
            ? []
            : [product];
      return route.fulfill(json({ items, products: items }));
    }
    if (path.startsWith('/marketplace/broadcasts')) {
      return route.fulfill(json({
        items: scenario.paidPromotionStage === 'live' ? [paidSpotlight] : [spotlight],
      }));
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
    if (path === '/payment-instructions/my') {
      return route.fulfill(json({
        settlement: {
          rail_name: 'Bank transfer',
          bank_name: 'GSN Pilot Bank',
          account_name: 'Global Support Network',
          account_number: '12345678',
          sort_code: '12-34-56',
          country: 'GB',
          region_code: 'uk',
        },
        spotlight_config: {
          payment_instruction_expiry_days: 7,
        },
      }));
    }
    if (path.startsWith('/payment-instructions/my/expected')) {
      const items = scenario.paidPromotionStage === 'payment'
        ? [{
            id: 801,
            expected_type: 'spotlight_subscription',
            amount: 1,
            currency: 'GBP',
            due_at: '2099-10-30T12:00:00Z',
            reference_display: 'GSN-SPOT-801',
            status: 'pending',
            quantity_total: 1,
          }]
        : [];
      return route.fulfill(json({ items }));
    }
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
  const moreDetails = page.locator('[data-public-shop-more="secondary"]');
  const summary = moreDetails.locator('summary');
  await summary.waitFor({ state: 'visible', timeout: 20_000 });
  await summary.getByText(/Your Spotlight/).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await page.waitForTimeout(1_000);
  if (!(await moreDetails.evaluate((node) => node.open))) await summary.click();

  const spotlightPlus = page.getByRole('link', { name: 'Add Spotlight' });
  const diaryPlus = page.getByRole('link', { name: 'Add diary entry' });
  try {
    await spotlightPlus.waitFor({ state: 'visible', timeout: 20_000 });
  } catch (error) {
    throw new Error(
      `Owner Spotlight shortcut was unavailable at ${page.url()}. Visible page: ` +
      (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(0, 1200),
      { cause: error },
    );
  }
  await diaryPlus.waitFor({ state: 'visible', timeout: 20_000 });
  const followOnSpaces = page.locator('[data-owner-empty-shop-space]');
  if (await followOnSpaces.count() !== 1) {
    throw new Error(`One-item owner shop exposed ${await followOnSpaces.count()} follow-on spaces, expected 1.`);
  }
  if (await page.getByText('Add your product', { exact: true }).count()) {
    throw new Error('One-item owner shop kept the first-item wording after an item already existed.');
  }
  await assertTouchTarget(spotlightPlus, 'Spotlight plus');
  await assertTouchTarget(diaryPlus, 'Shop Diary plus');
  if (await page.getByRole('link', { name: 'Manage media for Jollof tray' }).count()) {
    throw new Error('Owner product-media plus appeared before its product card was opened.');
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
  const productPlus = page.getByRole('button', { name: 'Open Jollof tray' });
  await productPlus.waitFor({ state: 'visible', timeout: 20_000 });
  await productPlus.click();
  if (await page.getByRole('link', { name: 'Manage media for Jollof tray' }).count()) {
    throw new Error('Visitor received owner product-media shortcut after opening the card.');
  }
  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) throw new Error(`Visitor inspection issued business write request(s): ${writes.join(', ')}.`);
  await context.close();
}

async function testOwnerProductMediaShortcut(browser, baseUrl) {
  const scenario = { identity: ownerId, ownerSpotlightState: 'live', demandPolicyOff: false, memberOfCommunity: true, mutations: [] };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  if (await page.getByRole('link', { name: 'Manage media for Jollof tray' }).count()) {
    throw new Error('Product media shortcut appeared while the card was closed.');
  }
  const productPlus = page.getByRole('button', { name: 'Open Jollof tray' });
  await productPlus.waitFor({ state: 'visible', timeout: 20_000 });
  const openSymbol = await productPlus.locator('[data-product-card-toggle-symbol="open"]').textContent();
  if (openSymbol?.trim() !== '+') throw new Error(`Internal product control was ${openSymbol}, expected +.`);
  await productPlus.click();
  await page.getByRole('button', { name: 'Close Jollof tray' }).waitFor({ state: 'visible', timeout: 20_000 });
  await page.locator('[data-product-card-toggle-symbol="close"]').waitFor({ state: 'visible', timeout: 20_000 });
  const productCard = page.locator('#shop-block-2');
  const closeAction = productCard.getByRole('button', { name: 'Close Jollof tray' });
  const shareAction = productCard.getByRole('button', { name: 'Share' });
  const repostAction = productCard.getByRole('link', { name: /Repost Jollof tray/ });
  const managePlus = page.getByRole('link', { name: 'Manage media for Jollof tray' });
  await shareAction.waitFor({ state: 'visible', timeout: 20_000 });
  await repostAction.waitFor({ state: 'visible', timeout: 20_000 });
  await managePlus.waitFor({ state: 'visible', timeout: 20_000 });
  for (const [locator, label] of [
    [closeAction, 'Expanded product close'],
    [shareAction, 'Expanded product Share'],
    [repostAction, 'Expanded product Repost'],
    [managePlus, 'Expanded product manage-media plus'],
  ]) {
    await assertTouchTarget(locator, label);
  }
  const actionBoxes = await Promise.all(
    [closeAction, shareAction, repostAction, managePlus].map((locator) => locator.boundingBox())
  );
  for (let index = 0; index < actionBoxes.length - 1; index += 1) {
    const current = actionBoxes[index];
    const next = actionBoxes[index + 1];
    if (!current || !next || current.x + current.width > next.x + 0.5) {
      throw new Error('Expanded product actions overlap or are not ordered Close, Share, Repost, then manage plus.');
    }
    if (Math.abs(current.y - next.y) > 2) {
      throw new Error('Expanded product actions did not stay on one aligned row.');
    }
  }
  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  if (horizontalOverflow) throw new Error('Expanded owner product actions created horizontal phone overflow.');
  await page.screenshot({
    path: join(screenshotDir, 'three-plus-owner-product-expanded-actions-390x844.png'),
    fullPage: true,
  });
  await managePlus.click();
  await page.waitForFunction(() => {
    const url = new URL(window.location.href);
    return (
      url.pathname === '/app/shop-control' &&
      url.searchParams.get('manage_product_id') === '601' &&
      url.searchParams.get('manage_block') === '2' &&
      url.searchParams.get('source') === 'public-shop-product' &&
      url.searchParams.get('community') === '8' &&
      url.hash === '#shop-control-gallery-tools'
    );
  }, { timeout: 30_000 });
  const target = page.locator(
    '#shop-assets-selected-public-block[data-owner-product-manage-target="601"][data-owner-product-manage-mode="focused"]'
  );
  const selectedBlock = page.locator('#shop-assets-selected-public-block');
  await target.waitFor({ state: 'visible', timeout: 30_000 });
  await page.getByText('This is the shop item you opened.', { exact: false }).waitFor({ state: 'visible', timeout: 20_000 });
  const publicShopBack = page.getByRole('link', { name: 'Public Shop' });
  await publicShopBack.waitFor({ state: 'visible', timeout: 20_000 });
  const publicShopBackTarget = new URL(await publicShopBack.getAttribute('href') || '', baseUrl);
  if (
    publicShopBackTarget.pathname !== '/shop/' + ownerId ||
    publicShopBackTarget.searchParams.get('product_id') !== '601' ||
    publicShopBackTarget.searchParams.get('block') !== '2'
  ) {
    throw new Error('Focused product task did not return to the exact Public Shop product/block.');
  }
  for (const unrelatedLabel of ['Change shop picture', 'Write shop update', 'Add more selling space']) {
    if (await page.getByRole('link', { name: unrelatedLabel, exact: true }).count()) {
      throw new Error('Focused product management still exposed an unrelated wrapper shortcut.');
    }
  }
  const changeAction = page.getByRole('button', { name: 'Change media or details' });
  const deleteAction = page.getByRole('button', { name: 'Delete permanently' });
  await changeAction.waitFor({ state: 'visible', timeout: 20_000 });
  await deleteAction.waitFor({ state: 'visible', timeout: 20_000 });
  if (!(await deleteAction.isEnabled())) throw new Error('Focused permanent-delete action was unexpectedly disabled.');
  if (await page.getByText('Your shop items', { exact: true }).count()) {
    throw new Error('Focused product management still exposed the generic numbered-block chooser.');
  }
  if (await target.getByRole('button', { name: 'Copy shop link' }).count()) {
    throw new Error('Focused product management still exposed the secondary Copy action.');
  }
  if (await target.getByRole('link', { name: /^Repost/ }).count()) {
    throw new Error('Focused product management still exposed the secondary Repost action.');
  }
  await changeAction.click();
  const editor = page.locator('#shop-assets-product-editor');
  await editor.waitFor({ state: 'visible', timeout: 20_000 });
  await page.getByRole('button', { name: /Add picture|Change picture/ }).waitFor({ state: 'visible', timeout: 20_000 });
  await page.getByRole('button', { name: /Add video|Change video/ }).waitFor({ state: 'visible', timeout: 20_000 });
  const saveChanges = editor.getByRole('button', { name: 'Save changes' });
  await saveChanges.waitFor({ state: 'visible', timeout: 20_000 });
  if (!(await saveChanges.isEnabled())) {
    throw new Error(
      'Save changes was disabled in the exact-product editor. Visible editor state: ' +
      (await editor.innerText()).replace(/\s+/g, ' ').trim(),
    );
  }
  if (await editor.getByRole('button', { name: 'Copy shop link' }).count()) {
    throw new Error('Focused edit form still exposed the unrelated Copy shop link action.');
  }
  await page.screenshot({
    path: join(screenshotDir, 'three-plus-owner-product-manage-390x844.png'),
    fullPage: true,
  });
  const navigationWrites = businessWrites(scenario.mutations);
  if (navigationWrites.length !== 0) {
    throw new Error(`Product open/manage navigation issued business write request(s): ${navigationWrites.join(', ')}.`);
  }

  await saveChanges.click();
  const viewUpdatedProduct = target.getByRole('link', { name: 'View updated product' });
  try {
    await viewUpdatedProduct.waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    throw new Error(
      'Successful product save did not expose View updated product. Visible block state: ' +
      (await target.innerText()).replace(/\s+/g, ' ').trim() +
      '. Visible editor state: ' + (await editor.innerText()).replace(/\s+/g, ' ').trim() +
      '. Recorded requests: ' + scenario.mutations.join(', '),
      { cause: error },
    );
  }
  const updatedProductTarget = new URL(await viewUpdatedProduct.getAttribute('href') || '', baseUrl);
  if (
    updatedProductTarget.pathname !== '/shop/' + ownerId ||
    updatedProductTarget.searchParams.get('product_id') !== '601' ||
    updatedProductTarget.searchParams.get('block') !== '2'
  ) {
    throw new Error('Successful product save did not expose the exact updated-product return.');
  }

  page.once('dialog', (dialog) => dialog.accept());
  await deleteAction.click();
  await selectedBlock.getByText(/Shop space 2 is empty\. The product was permanently deleted/).waitFor({
    state: 'visible',
    timeout: 30_000,
  });
  const backAfterDelete = selectedBlock.getByRole('link', { name: 'Back to public shop' });
  await backAfterDelete.waitFor({ state: 'visible', timeout: 20_000 });
  const deletedProductReturn = new URL(await backAfterDelete.getAttribute('href') || '', baseUrl);
  if (deletedProductReturn.pathname !== '/shop/' + ownerId) {
    throw new Error('Permanent deletion did not expose the Public Shop return.');
  }
  const writes = businessWrites(scenario.mutations);
  const expectedWrites = ['PATCH /marketplace/products/601', 'DELETE /marketplace/products/601'];
  if (writes.join('|') !== expectedWrites.join('|')) {
    throw new Error(`Focused save/delete emitted unexpected writes: ${writes.join(', ')}.`);
  }
  await context.close();
}

async function testOwnerEmptyShopSpaces(browser, baseUrl) {
  const scenario = {
    identity: ownerId,
    ownerSpotlightState: 'live',
    demandPolicyOff: false,
    memberOfCommunity: true,
    emptyShop: true,
    mutations: [],
  };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  const emptySpaces = page.locator('[data-owner-empty-shop-space]');
  await emptySpaces.first().waitFor({ state: 'visible', timeout: 20_000 });
  if (await emptySpaces.count() !== 1) {
    throw new Error(`Empty owner shop exposed ${await emptySpaces.count()} next spaces, expected 1.`);
  }
  await page.getByRole('link', {
    name: 'Add your product, shop space 1',
    exact: true,
  }).waitFor({ state: 'visible', timeout: 20_000 });
  if (await page.locator('[data-visitor-opening-soon-space]').count()) {
    throw new Error('Empty owner shop received the visitor-only opening-soon poster.');
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1
  );
  if (overflow) throw new Error('Empty owner shop spaces created horizontal phone overflow.');

  await page.screenshot({
    path: join(screenshotDir, 'public-shop-owner-empty-spaces-390x844.png'),
    fullPage: true,
  });

  await emptySpaces.first().click();
  await page.waitForFunction(() => {
    const url = new URL(window.location.href);
    return (
      url.pathname === '/app/shop-control' &&
      url.searchParams.get('manage_block') === '1' &&
      url.searchParams.get('source') === 'public-shop-product' &&
      url.searchParams.get('community') === '8' &&
      url.hash === '#shop-control-gallery-tools'
    );
  }, { timeout: 30_000 });
  const addShopItemHeading = page.getByText('Add a shop item', { exact: true }).first();
  try {
    await addShopItemHeading.waitFor({ state: 'visible', timeout: 30_000 });
  } catch (error) {
    throw new Error(
      `Empty-space handoff reached ${page.url()} but did not show the add task. Visible page: ` +
      (await page.locator('body').innerText()).replace(/\s+/g, ' ').trim().slice(0, 1200),
      { cause: error },
    );
  }
  await page.getByText(
    'This shop space is ready. Tap + Add item to add your product or service.',
    { exact: true }
  ).waitFor({ state: 'visible', timeout: 20_000 });
  const addItem = page.getByRole('button', { name: '+ Add item', exact: true });
  await addItem.waitFor({ state: 'visible', timeout: 20_000 });
  await addItem.click();
  await page.locator('#shop-assets-product-editor').waitFor({
    state: 'visible',
    timeout: 20_000,
  });

  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) {
    throw new Error(`Empty-space handoff issued business write request(s): ${writes.join(', ')}.`);
  }
  await context.close();

  const visitorScenario = {
    ...scenario,
    identity: visitorId,
    mutations: [],
  };
  const visitor = await newPhonePage(browser, visitorScenario);
  await visitor.page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await visitor.page.locator('[data-visitor-opening-soon-space="1"]').waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await visitor.page.getByText('Shop opening soon', { exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  if (await visitor.page.locator('[data-owner-empty-shop-space]').count()) {
    throw new Error('A non-owner received owner shop-space creation controls.');
  }
  if (await visitor.page.getByText('No public items yet.', { exact: true }).count()) {
    throw new Error('Visitor still received the old empty-shop dead end.');
  }
  if (await visitor.page.getByRole('button', { name: 'Ask for Vault access', exact: true }).count()) {
    throw new Error('Visitor opening-soon shelf restored the unrelated Vault empty-state action.');
  }
  await visitor.context.close();

  const progressingVisitorScenario = {
    ...visitorScenario,
    emptyShop: false,
    publicProducts: [{
      ...product,
      public_block_number: 1,
      description: '[BLOCK:1] Jollof rice with chicken and plantain.',
    }],
    mutations: [],
  };
  const progressingVisitor = await newPhonePage(browser, progressingVisitorScenario);
  await progressingVisitor.page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await progressingVisitor.page
    .locator('[data-visitor-opening-soon-space="2"]')
    .waitFor({ state: 'visible', timeout: 20_000 });
  if (await progressingVisitor.page.locator('[data-visitor-opening-soon-space="1"]').count()) {
    throw new Error('Visitor opening-soon poster did not advance after shop space 1 was filled.');
  }
  await progressingVisitor.context.close();

  const backendOwnerScenario = {
    ...scenario,
    identity: visitorId,
    authoritativeShopOwner: true,
    mutations: [],
  };
  const backendOwner = await newPhonePage(browser, backendOwnerScenario);
  await backendOwner.page.goto(`${baseUrl}/shop/${ownerId}?clan_id=8`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const backendOwnerSpaces = backendOwner.page.locator('[data-owner-empty-shop-space]');
  await backendOwnerSpaces.first().waitFor({ state: 'visible', timeout: 20_000 });
  if (await backendOwnerSpaces.count() !== 1) {
    throw new Error('Backend-confirmed owner did not receive the single next empty shop space.');
  }
  await backendOwner.context.close();
}

async function testOrdinaryGalleryTaskSeparation(browser, baseUrl) {
  const scenario = {
    identity: ownerId,
    ownerSpotlightState: 'live',
    demandPolicyOff: false,
    diaryPolicyOff: true,
    marketplaceShopsPolicyOff: false,
    memberOfCommunity: true,
    mutations: [],
  };
  const { context, page } = await newPhonePage(browser, scenario);
  await page.goto(`${baseUrl}/app/shop-control?community=8#shop-control-gallery-tools`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });

  const productTask = page.getByText('Shop items', { exact: true }).first();
  await productTask.waitFor({ state: 'visible', timeout: 30_000 });
  const addProduct = page.getByRole('button', { name: '+ Add item', exact: true });
  await addProduct.waitFor({ state: 'visible', timeout: 20_000 });
  if (!(await addProduct.isEnabled())) {
    throw new Error('Shop Diary policy OFF incorrectly disabled product creation.');
  }
  if (await page.locator('#shop-assets-diary').count()) {
    throw new Error('Ordinary Gallery Tools exposed Shop Diary beside the product task.');
  }
  if (await page.getByText('Public shop picture', { exact: true }).count()) {
    throw new Error('Ordinary Gallery Tools exposed the separate Shop billboard editor.');
  }

  const otherTasksDisclosure = page.locator('details[data-shop-items-other-tasks="true"]');
  if ((await otherTasksDisclosure.getAttribute('open')) !== null) {
    throw new Error('Ordinary phone Shop items exposed secondary shop tasks before the owner requested them.');
  }
  if (await page.getByRole('link', { name: 'Write shop update', exact: true }).isVisible()) {
    throw new Error('Ordinary phone Shop items showed the update shortcut outside its closed disclosure.');
  }

  const blocksSummary = page.getByText('Your shop items', { exact: true });
  const blocksDisclosure = blocksSummary.locator('..');
  if ((await blocksDisclosure.getAttribute('open')) !== null) {
    throw new Error('Ordinary phone Gallery Tools exposed the numbered-block detail before the owner requested it.');
  }

  await page.screenshot({
    path: join(screenshotDir, 'shop-gallery-plain-language-390x844.png'),
    fullPage: true,
  });

  await addProduct.click();
  const editor = page.locator('#shop-assets-product-editor');
  await editor.waitFor({ state: 'visible', timeout: 20_000 });
  await editor.locator('input[placeholder="Item name"]').fill('Phone smoke item');
  await editor.locator('input[placeholder="Price"]').fill('2500');
  await editor.getByText('More media options', { exact: true }).click();
  await editor.locator('input[placeholder="Paste item image URL"]').fill(
    'data:image/gif;base64,R0lGODlhAQABAAAAACw='
  );
  await editor.getByRole('button', { name: 'Post item', exact: true }).click();
  const ordinaryBlockResult = page.locator('#shop-assets-selected-public-block');
  const ordinarySaveResult = ordinaryBlockResult.getByText(
    'Shop item 1 saved with picture. It is now visible in your public shop.',
    { exact: true }
  );
  await ordinarySaveResult.waitFor({ state: 'visible', timeout: 30_000 });
  if ((await blocksDisclosure.getAttribute('open')) === null) {
    throw new Error('Ordinary product save hid its success result inside the numbered-block disclosure.');
  }
  const focusedResultId = await page.evaluate(() => document.activeElement?.id || '');
  if (focusedResultId !== 'shop-assets-selected-public-block') {
    throw new Error(`Ordinary product save did not return focus to its block result (focus=${focusedResultId}).`);
  }
  const viewPublicProduct = ordinaryBlockResult.getByRole('link', {
    name: 'View product in public shop',
    exact: true,
  });
  await viewPublicProduct.waitFor({ state: 'visible', timeout: 20_000 });
  const viewPublicProductTarget = new URL(
    await viewPublicProduct.getAttribute('href') || '',
    baseUrl
  );
  if (
    viewPublicProductTarget.pathname !== '/shop/' + ownerId ||
    viewPublicProductTarget.searchParams.get('product_id') !== '602' ||
    viewPublicProductTarget.searchParams.get('block') !== '1'
  ) {
    throw new Error('Ordinary product save did not expose the exact saved-product Public Shop link.');
  }

  await otherTasksDisclosure.getByText('Other shop tasks', { exact: true }).click();
  const pictureShortcut = page.getByRole('link', { name: 'Change shop picture', exact: true });
  await pictureShortcut.waitFor({ state: 'visible', timeout: 20_000 });
  await pictureShortcut.click();
  await page.waitForFunction(() => window.location.hash === '#shop-assets-picture', { timeout: 20_000 });
  const shopPictureTask = page.locator('#shop-assets-picture[data-shop-picture-first-view="true"]');
  await shopPictureTask.waitFor({ state: 'visible', timeout: 30_000 });
  await shopPictureTask.getByText('Shop picture', { exact: true }).first().waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await shopPictureTask.getByText('Choose a picture', { exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await shopPictureTask.getByRole('button', { name: 'Save picture', exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  if (await shopPictureTask.getByText('Save shop info', { exact: true }).count()) {
    throw new Error('Focused Shop picture task exposed the wider shop-information save task.');
  }
  if (await page.locator('[data-shop-items-first-view="true"]').count()) {
    throw new Error('Focused Shop picture task still exposed Shop items controls.');
  }
  if (await page.locator('#shop-assets-diary').count()) {
    throw new Error('Focused Shop picture task still exposed Shop update controls.');
  }
  const pictureLinkOption = shopPictureTask.getByText('Use a picture link instead (optional)', { exact: true });
  await pictureLinkOption.waitFor({ state: 'visible', timeout: 20_000 });
  if (await pictureLinkOption.locator('..').evaluate((node) => node.open)) {
    throw new Error('Focused phone Shop picture exposed the optional pasted-link field before the owner requested it.');
  }
  const pictureGeometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (pictureGeometry.scrollWidth > pictureGeometry.innerWidth) {
    throw new Error(`Focused Shop picture widened horizontally: ${pictureGeometry.scrollWidth} > ${pictureGeometry.innerWidth}.`);
  }
  await page.screenshot({
    path: join(screenshotDir, 'shop-picture-focused-390x844.png'),
    fullPage: true,
  });
  const backToShopItems = page.getByRole('navigation', { name: 'Page navigation' }).getByRole('link').first();
  const backToShopItemsTarget = new URL(await backToShopItems.getAttribute('href') || '', baseUrl);
  if (
    backToShopItemsTarget.pathname !== '/app/shop-control' ||
    backToShopItemsTarget.hash !== '#shop-control-gallery-tools'
  ) {
    throw new Error(`Focused Shop picture return did not point back to Shop items: ${backToShopItemsTarget.href}.`);
  }
  await backToShopItems.click();
  await page.waitForFunction(() => window.location.hash === '#shop-control-gallery-tools', { timeout: 20_000 });
  await productTask.waitFor({ state: 'visible', timeout: 30_000 });
  const returnedOtherTasks = page.locator('[data-shop-items-other-tasks="true"]');
  await returnedOtherTasks.getByText('Other shop tasks', { exact: true }).click();
  const diaryShortcut = page.getByRole('link', { name: 'Write shop update', exact: true });
  await diaryShortcut.waitFor({ state: 'visible', timeout: 20_000 });
  await diaryShortcut.click();
  await page.waitForFunction(() => window.location.hash === '#shop-assets-diary', { timeout: 20_000 });
  const shopUpdateTask = page.locator('#shop-assets-diary[data-shop-update-first-view="true"]');
  await shopUpdateTask.waitFor({ state: 'visible', timeout: 30_000 });
  await shopUpdateTask.getByText('Shop update', { exact: true }).first().waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await shopUpdateTask.getByText('What should visitors know?', { exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  if (await shopUpdateTask.getByText('Shop Diary', { exact: true }).count()) {
    throw new Error('Focused Shop Update still exposed internal Diary language.');
  }
  if (await page.locator('[data-shop-items-first-view="true"]').count()) {
    throw new Error('Focused Shop Diary task still exposed Shop items controls.');
  }
  if (await page.getByRole('link', { name: 'Change shop picture', exact: true }).count()) {
    throw new Error('Focused Shop Diary task still exposed the generic Gallery shortcuts.');
  }
  const moreUpdateDetails = shopUpdateTask.getByText('More details (optional)', { exact: true });
  await moreUpdateDetails.waitFor({ state: 'visible', timeout: 20_000 });
  if (await moreUpdateDetails.locator('..').evaluate((node) => node.open)) {
    throw new Error('Focused phone Shop update exposed optional details before the owner requested them.');
  }
  const recentUpdates = shopUpdateTask.getByText(/^Recent updates \(/).first();
  await recentUpdates.waitFor({ state: 'visible', timeout: 20_000 });
  if (await recentUpdates.locator('..').evaluate((node) => node.open)) {
    throw new Error('Focused phone Shop update exposed recent history before the owner requested it.');
  }
  const publishUpdate = shopUpdateTask.getByRole('button', { name: 'Publish update', exact: true });
  await publishUpdate.waitFor({ state: 'visible', timeout: 20_000 });
  if (await publishUpdate.isEnabled()) {
    throw new Error('Shop Diary policy OFF did not disable Diary publishing.');
  }
  const writes = businessWrites(scenario.mutations);
  const expectedWrites = ['POST /marketplace/products'];
  if (writes.join('|') !== expectedWrites.join('|')) {
    throw new Error(`Ordinary Gallery save/navigation emitted unexpected writes: ${writes.join(', ')}.`);
  }
  await context.close();
}

async function testDeeperShopPlainLanguage(browser, baseUrl) {
  const scenario = {
    identity: ownerId,
    ownerSpotlightState: 'live',
    demandPolicyOff: false,
    memberOfCommunity: true,
    mutations: [],
  };
  const { context, page } = await newPhonePage(browser, scenario);

  await page.goto(`${baseUrl}/app/shop-assets?community=8`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.getByText('Manage your shop', { exact: true }).waitFor({
    state: 'visible',
    timeout: 30_000,
  });
  for (const label of ['At a glance', 'Start here', 'Add shop or Vault item', 'Your saved items']) {
    await page.getByText(label, { exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
  }
  for (const oldLabel of ['Owner workbench', 'Shop readiness', 'Simple order', 'Products and Vault offers', 'Posted items']) {
    if (await page.getByText(oldLabel, { exact: true }).count()) {
      throw new Error(`Standalone Pictures & Products still exposes old wording: ${oldLabel}.`);
    }
  }
  await page.screenshot({
    path: join(screenshotDir, 'shop-assets-plain-language-390x844.png'),
    fullPage: true,
  });

  await page.goto(`${baseUrl}/app/shop-control?community=8#shop-control-community-packages`, {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  const capacity = page.locator('#shop-control-community-packages');
  await capacity.waitFor({ state: 'visible', timeout: 30_000 });
  await capacity.scrollIntoViewIfNeeded();
  for (const label of [
    'More shop & community space',
    'Choose what you need.',
    'One more shop space',
    'One more member place',
    'ROSCA for one year',
    'Meeting support',
  ]) {
    await capacity.getByText(label, { exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
  }
  for (const unrelatedPaidTool of ['Vault Control', 'Visitor verification', 'Spotlight Subscription']) {
    if (await page.getByText(unrelatedPaidTool, { exact: true }).count()) {
      throw new Error('Focused selling-space task exposed unrelated paid tool: ' + unrelatedPaidTool + '.');
    }
  }
  const capacityStatus = capacity.locator('[data-shop-space-status="true"]');
  const purchasedServiceTools = capacity.locator('[data-shop-space-service-tools="true"]');
  if ((await capacityStatus.getAttribute('open')) !== null) {
    throw new Error('Focused phone selling-space task exposed current entitlement detail before the owner requested it.');
  }
  if ((await purchasedServiceTools.getAttribute('open')) !== null) {
    throw new Error('Focused phone selling-space task exposed ROSCA and meeting operation forms before the owner requested them.');
  }
  await capacity.getByText('What you already have', { exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  await capacity.getByText('Use purchased services', { exact: true }).waitFor({
    state: 'visible',
    timeout: 20_000,
  });
  const capacityGeometry = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  if (capacityGeometry.scrollWidth > capacityGeometry.innerWidth) {
    throw new Error(
      'Focused selling-space task widened horizontally: ' +
      capacityGeometry.scrollWidth +
      ' > ' +
      capacityGeometry.innerWidth +
      '.'
    );
  }
  await page.screenshot({
    path: join(screenshotDir, 'shop-community-space-first-view-390x844.png'),
    fullPage: true,
  });
  await purchasedServiceTools.locator('summary').click();
  for (const label of ['Run a ROSCA cycle', 'Plan a community meeting']) {
    await capacity.getByText(label, { exact: true }).first().waitFor({
      state: 'visible',
      timeout: 20_000,
    });
  }
  for (const oldLabel of [
    'Marketplace capacity',
    'Add capacity when the marketplace needs more.',
    'Extra shop block',
    'Extra member place',
    'ROSCA engine',
    'Meeting pack engine',
  ]) {
    if (await capacity.getByText(oldLabel, { exact: true }).count()) {
      throw new Error(`Paid-space task still exposes old wording: ${oldLabel}.`);
    }
  }
  await page.screenshot({
    path: join(screenshotDir, 'shop-community-space-plain-language-390x844.png'),
    fullPage: false,
  });

  const writes = businessWrites(scenario.mutations);
  if (writes.length !== 0) {
    throw new Error(`Plain-language Shop navigation issued business writes: ${writes.join(', ')}.`);
  }
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

async function testPrivateOffersGuidance(browser, baseUrl) {
  const cases = [
    {
      stage: 'empty',
      panel: 'activation',
      nextStep: 'Activate a private space',
      visibleAction: 'vault-control.confirm-quote',
    },
    {
      stage: 'paid-empty',
      panel: 'blocks',
      nextStep: 'Add your private offer',
      visibleAction: 'vault-control.selected-block.add',
    },
    {
      stage: 'offer-ready',
      panel: 'link',
      nextStep: 'Create the private link',
      visibleAction: 'vault-control.link.create-or-replace',
    },
  ];
  const panelSelectors = {
    activation: '[data-vault-activation-panel="true"]',
    payment: '[data-vault-payment-panel="true"]',
    blocks: '[data-vault-offer-panel="true"]',
    link: '[data-vault-link-panel="true"]',
  };

  for (const testCase of cases) {
    const scenario = {
      identity: ownerId,
      ownerSpotlightState: 'none',
      demandPolicyOff: false,
      memberOfCommunity: true,
      vaultStage: testCase.stage,
      mutations: [],
    };
    const { context, page } = await newPhonePage(browser, scenario);
    await page.goto(`${baseUrl}/app/vault-control`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    const firstView = page.locator('[data-vault-private-first-view="true"]');
    await firstView.waitFor({ state: 'visible', timeout: 20_000 });
    await firstView.getByText('Private offers', { exact: true }).waitFor({ state: 'visible' });
    const actualPanel = await firstView.getAttribute('data-vault-next-panel');
    const actualFirstViewText = (await firstView.innerText()).replace(/\s+/g, ' ').trim();
    if (actualPanel !== testCase.panel || !actualFirstViewText.includes(testCase.nextStep)) {
      throw new Error(
        `Private offers ${testCase.stage} expected ${testCase.panel}/${testCase.nextStep}, ` +
        `received ${actualPanel}/${actualFirstViewText}.`
      );
    }

    const guidedToggle = page.locator(`[data-cta-id="vault-control.panel.${testCase.panel}.toggle"]`);
    await guidedToggle.waitFor({ state: 'visible', timeout: 20_000 });
    await page.waitForFunction(
      ({ id }) => document.querySelector(`[data-cta-id="${id}"]`)?.getAttribute('aria-expanded') === 'true',
      { id: `vault-control.panel.${testCase.panel}.toggle` },
    );
    await page.locator(`[data-cta-id="${testCase.visibleAction}"]`).waitFor({ state: 'visible', timeout: 20_000 });

    for (const panel of Object.keys(panelSelectors)) {
      if (panel === testCase.panel) continue;
      const toggle = page.locator(`[data-cta-id="vault-control.panel.${panel}.toggle"]`);
      if ((await toggle.getAttribute('aria-expanded')) === 'true') {
        throw new Error(`Private offers ${testCase.stage} state exposed the unrelated ${panel} task.`);
      }
    }

    const guidedBox = await page.locator(panelSelectors[testCase.panel]).boundingBox();
    if (!guidedBox || guidedBox.y >= 844) {
      throw new Error(`Private offers ${testCase.stage} task did not begin within the first phone viewport.`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) {
      throw new Error(`Private offers ${testCase.stage} state overflowed horizontally by ${overflow}px.`);
    }
    await page.screenshot({
      path: join(screenshotDir, `private-offers-${testCase.stage}-390x844.png`),
      fullPage: false,
    });
    const writes = businessWrites(scenario.mutations);
    if (writes.length !== 0) {
      throw new Error(`Private offers ${testCase.stage} navigation issued business write request(s): ${writes.join(', ')}.`);
    }
    await context.close();
  }
}

async function testPaidPromotionGuidance(browser, baseUrl) {
  const cases = [
    {
      stage: 'activate',
      nextStep: 'Choose how many promotions you want',
      visibleAction: 'subscription-spotlight.confirm-quote',
    },
    {
      stage: 'payment',
      nextStep: 'Complete your bank transfer',
      visibleAction: 'subscription-spotlight.copy-payment-details',
    },
    {
      stage: 'publish',
      nextStep: 'Create your paid promotion',
      visibleAction: 'subscription-spotlight.publish',
    },
    {
      stage: 'live',
      nextStep: 'Your paid promotion is live',
      visibleText: 'Wait for the live paid spotlight to finish',
    },
  ];

  for (const testCase of cases) {
    const scenario = {
      identity: ownerId,
      ownerSpotlightState: 'none',
      demandPolicyOff: false,
      memberOfCommunity: true,
      paidPromotionStage: testCase.stage,
      mutations: [],
    };
    const { context, page } = await newPhonePage(browser, scenario);
    await page.goto(`${baseUrl}/app/shop-control/subscription-spotlight`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    await page.getByText('Paid promotion', { exact: true }).first()
      .waitFor({ state: 'visible', timeout: 20_000 });
    const guidance = page.locator('[data-paid-promotion-next-step]');
    await guidance.waitFor({ state: 'visible', timeout: 20_000 });
    const actualStage = await guidance.getAttribute('data-paid-promotion-next-step');
    const guidanceText = (await guidance.innerText()).replace(/\s+/g, ' ').trim();
    if (actualStage !== testCase.stage || !guidanceText.includes(testCase.nextStep)) {
      throw new Error(
        `Paid promotion ${testCase.stage} expected ${testCase.stage}/${testCase.nextStep}, ` +
        `received ${actualStage}/${guidanceText}.`
      );
    }

    const activeStages = page.locator('[data-paid-promotion-stage-active="true"]');
    if (await activeStages.count() !== 1) {
      throw new Error(`Paid promotion ${testCase.stage} exposed ${await activeStages.count()} active stages.`);
    }
    const activeStage = activeStages.first();
    const renderedStage = await activeStage.getAttribute('data-paid-promotion-stage');
    if (renderedStage !== testCase.stage) {
      throw new Error(`Paid promotion ${testCase.stage} rendered ${renderedStage} as its active stage.`);
    }
    if (testCase.visibleAction) {
      const visibleAction = page.locator(`[data-cta-id="${testCase.visibleAction}"]`);
      await visibleAction.waitFor({ state: 'visible', timeout: 20_000 });
      if (testCase.stage === 'publish') {
        const actionBox = await visibleAction.boundingBox();
        if (!actionBox || actionBox.y + actionBox.height > 844) {
          throw new Error(
            `Paid promotion publish action ended at ${actionBox ? actionBox.y + actionBox.height : 'missing'}, expected it inside the first 844px viewport.`
          );
        }
      }
    }
    if (testCase.visibleText) {
      await activeStage.getByText(testCase.visibleText, { exact: false })
        .waitFor({ state: 'visible', timeout: 20_000 });
    }
    const openInactiveStages = page.locator(
      '[data-paid-promotion-stage-active="false"] details[open]'
    );
    if (await openInactiveStages.count()) {
      throw new Error(`Paid promotion ${testCase.stage} opened an unrelated stage.`);
    }
    const activeBox = await activeStage.boundingBox();
    if (!activeBox || activeBox.y >= 844) {
      throw new Error(`Paid promotion ${testCase.stage} did not begin within the first phone viewport.`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) {
      throw new Error(`Paid promotion ${testCase.stage} overflowed horizontally by ${overflow}px.`);
    }
    await page.screenshot({
      path: join(screenshotDir, `paid-promotion-${testCase.stage}-390x844.png`),
      fullPage: false,
    });
    const writes = businessWrites(scenario.mutations);
    if (writes.length !== 0) {
      throw new Error(`Paid promotion ${testCase.stage} navigation issued business write request(s): ${writes.join(', ')}.`);
    }
    await context.close();
  }
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
  await testOwnerEmptyShopSpaces(browser, baseUrl);
  await testOwnerShopShortcuts(browser, baseUrl, 'live');
  await testOwnerShopShortcuts(browser, baseUrl, 'none');
  await testOwnerProductMediaShortcut(browser, baseUrl);
  await testOrdinaryGalleryTaskSeparation(browser, baseUrl);
  await testDeeperShopPlainLanguage(browser, baseUrl);
  await testVisitorShopShortcutsHidden(browser, baseUrl);
  await testDemandShortcut(browser, baseUrl);
  await testDemandShortcut(browser, baseUrl, { demandPolicyOff: true });
  await testDemandShortcut(browser, baseUrl, { memberOfCommunity: false });
  await testPrivateOffersGuidance(browser, baseUrl);
  await testPaidPromotionGuidance(browser, baseUrl);
  console.log(JSON.stringify({
    ok: true,
    environment: 'local Vite + mocked synthetic API at 390x844',
    checks: [
      'owner live Spotlight uses manage handoff',
      'owner absent Spotlight uses create handoff',
      'visitor owner shortcuts hidden',
      'Public Shop exposes one progressive next space: owner plus for the exact owner and passive opening-soon poster for visitors',
      'authenticated backend ownership restores the owner shelf when the route and stored identity labels differ',
      'the first owner shop-space plus reaches the exact existing add-item workflow without a business write',
      'owner product card keeps the outer + / × control and reveals the owner-only inner media-management plus only when open',
      'owner product-media shortcut selects the exact block, hides unrelated tools, exposes Change/Delete first, and returns cleanly after Save/Delete',
      'ordinary phone Shop items leads with Add item, keeps secondary shop tasks closed, and preserves the separate Diary handoff',
      'focused phone Shop picture fixes the broken handoff, exposes Save picture, and keeps the optional pasted-link field closed',
      'focused phone Shop update leads with one message question, keeps optional details and recent history closed, and exposes Publish update without product tools',
      'ordinary phone product Save reopens the numbered block, preserves its success notice, and returns focus to the result',
      'ordinary successful product Save exposes one exact-item View product in public shop action',
      'standalone Pictures & Products and deeper paid-space tasks use plain owner-facing language',
      'focused phone selling space shows purchase choices first and keeps ROSCA/meeting operation forms closed until requested',
      'Private offers phone guidance selects only activation, offer entry, or private-link management from empty, paid-empty, and offer-ready state',
      'Paid promotion phone guidance selects only plan, bank transfer, publishing, or live state from authoritative payment and Spotlight status',
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
