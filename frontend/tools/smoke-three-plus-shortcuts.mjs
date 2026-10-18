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
  image_url: 'data:image/gif;base64,R0lGODlhAQABAAAAACw=',
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

  const productTask = page.getByText('Products & Services', { exact: true }).first();
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

  const diaryShortcut = page.getByRole('link', { name: 'Write shop update', exact: true });
  await diaryShortcut.waitFor({ state: 'visible', timeout: 20_000 });
  await diaryShortcut.click();
  await page.waitForFunction(() => window.location.hash === '#shop-assets-diary', { timeout: 20_000 });
  await page.locator('#shop-assets-diary').waitFor({ state: 'visible', timeout: 30_000 });
  if (await page.getByText('Products & Services', { exact: true }).count()) {
    throw new Error('Focused Shop Diary task still exposed Products & Services controls.');
  }
  if (await page.getByRole('link', { name: 'Change shop picture', exact: true }).count()) {
    throw new Error('Focused Shop Diary task still exposed the generic Gallery shortcuts.');
  }
  const publishUpdate = page.getByRole('button', { name: 'Publish update', exact: true });
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
    'Run a ROSCA cycle',
    'Plan a community meeting',
  ]) {
    await capacity.getByText(label, { exact: true }).first().waitFor({ state: 'visible', timeout: 20_000 });
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
  await testOwnerProductMediaShortcut(browser, baseUrl);
  await testOrdinaryGalleryTaskSeparation(browser, baseUrl);
  await testDeeperShopPlainLanguage(browser, baseUrl);
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
      'owner product card keeps the outer + / × control and reveals the owner-only inner media-management plus only when open',
      'owner product-media shortcut selects the exact block, hides unrelated tools, exposes Change/Delete first, and returns cleanly after Save/Delete',
      'ordinary Gallery Tools shows Products only; Diary handoff shows Diary only; Shop Diary policy OFF does not disable product Add',
      'ordinary phone product Save reopens the numbered block, preserves its success notice, and returns focus to the result',
      'ordinary successful product Save exposes one exact-item View product in public shop action',
      'standalone Pictures & Products and deeper paid-space tasks use plain owner-facing language',
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
