/* global console, process, URL, URLSearchParams, localStorage, document, window */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const SECONDARY_DELAY_MS = 21000;
const MAX_FIRST_SURFACE_MS = 7000;

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function delay(ms) {
  return new Promise((resolve) => globalThis.setTimeout(resolve, ms));
}

const me = {
  id: 216,
  user_id: 216,
  display_name: "Nwafor Chuma",
  gmfn_id: "GMFN-U-63655DE6",
  role: "member",
};

const clans = [
  {
    id: 8,
    clan_id: 8,
    name: "Homeland isa Marketplace",
    display_name: "Homeland isa Marketplace",
    community_name: "Homeland isa Marketplace",
    marketplace_name: "Homeland isa Marketplace",
    community_code: "GMFN-C-000008",
    clan_code: "GMFN-C-000008",
    gmfn_id: "GMFN-C-000008",
    member_count: 7,
    public_shop_count: 2,
    trust_band: "B",
    community_trust_band: "B",
    notice_posting_policy: "members",
  },
];

function slowEmpty(path) {
  if (path === "/community-domains/my") return { items: [] };
  if (/^\/clans\/\d+\/members/.test(path)) return [];
  if (/^\/clans\/\d+\/invite-link/.test(path)) return { invite_url: "", code: "" };
  if (/^\/marketplace\/shops\/me/.test(path)) return { shop: null, products: [] };
  if (/^\/marketplace\/shops/.test(path)) return { items: [], shops: [] };
  if (/^\/pool\/me/.test(path)) return { balance: 0, available_balance: 0, items: [] };
  if (/^\/loans/.test(path)) return { items: [], loans: [] };
  if (path === "/trust/me/why") {
    return {
      user_id: 216,
      current_score: 72,
      score: 72,
      band: "B",
      latest_reason: "Recent community evidence remains current.",
      recent_events: [],
    };
  }
  if (/^\/trust-explainability/.test(path) || /^\/trust_explainability/.test(path)) {
    return { user_id: 216, score: 72, band: "B", event_count: 4, breakdown: { computed_score: 72, computed_band: "B" } };
  }
  if (/^\/trust/.test(path)) return { score: 72, band: "B", grade: "B", events: [] };
  if (/^\/payment-instructions\/community-package\/status/.test(path)) return { items: [] };
  if (/^\/rosca\/cycles/.test(path)) return { items: [], cycles: [] };
  if (/^\/protected-trades/.test(path)) return { items: [], records: [] };
  if (/^\/community-notices/.test(path)) return { notices: [], posting_policy: "members" };
  if (/^\/marketplace\/broadcasts/.test(path)) return { items: [], broadcasts: [] };
  if (/^\/trust-slips\/me\/decision-pack/.test(path)) {
    return { items: [], results: [], total: 0 };
  }
  if (/^\/trust-slips\/me/.test(path)) {
    return {
      verified: true,
      active: true,
      status: "active",
      code: "TS-SLOW-FIRST-PAINT",
      verification_code: "TS-SLOW-FIRST-PAINT",
      display_name: "Nwafor Chuma",
      community: "Homeland isa Marketplace",
      community_code: "GMFN-C-000008",
      level: "B",
      band: "B",
      open_trust_class: "B",
      open_trust_band: "B",
      trust_score: 72,
      standing_score: 72,
      cross_community_integrity_class: "B",
      cross_community_integrity_score: 72,
      trust_slip_limit: "250000",
      trust_limit: "250000",
      currency: "NGN",
      phone_recorded: true,
      phone_verified: true,
      public_verify_url: "/t/TS-SLOW-FIRST-PAINT",
    };
  }
  return { items: [], results: [], status: "ok" };
}

function shouldDelay(path, mode) {
  if (mode === "community") {
    return path === "/community-domains/my";
  }

  if (mode === "marketplace") {
    return (
      /^\/clans\/\d+\/members/.test(path) ||
      /^\/clans\/\d+\/invite-link/.test(path) ||
      /^\/marketplace\/shops/.test(path) ||
      /^\/pool\/me/.test(path) ||
      /^\/loans/.test(path) ||
      /^\/trust\//.test(path) ||
      /^\/payment-instructions\/community-package\/status/.test(path) ||
      /^\/rosca\/cycles/.test(path) ||
      /^\/protected-trades/.test(path)
    );
  }

  if (mode === "my-gsn") {
    return /^\/trust/.test(path);
  }

  if (mode === "trust") {
    return (
      path === "/trust/me/why" ||
      path === "/trust-slips/me/summary" ||
      path === "/trust-slips/me-summary" ||
      path === "/trust-slips/summary/me" ||
      /^\/trust-explainability/.test(path) ||
      /^\/trust_explainability/.test(path)
    );
  }

  if (mode === "trust-slip") {
    return (
      path === "/trust-slips/me" ||
      path === "/trust-slips/me/summary" ||
      path === "/trust-slips/me-summary" ||
      path === "/trust-slips/summary/me" ||
      /^\/trust-slips\/me\/decision-pack/.test(path)
    );
  }

  return false;
}

async function installApiMocks(page, mode) {
  const delayed = new Map();

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") return route.fulfill(json(me));
    if (path === "/clans/me") return route.fulfill(json(clans));
    if (path === "/clans/select" || path === "/clans/select/") {
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    const clanSelectMatch = path.match(/^\/clans\/(\d+)\/select\/?$/);
    if (clanSelectMatch) {
      return route.fulfill(json({ selected_clan_id: Number(clanSelectMatch[1]) }));
    }
    if (path === "/trust-slips/me" && mode !== "profile" && mode !== "trust-slip") {
      return route.fulfill(json(slowEmpty(path)));
    }

    if (shouldDelay(path, mode)) {
      delayed.set(path, (delayed.get(path) || 0) + 1);
      await delay(SECONDARY_DELAY_MS);
      return route.fulfill(json(slowEmpty(path)));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json(slowEmpty(path)));
    }

    return route.continue();
  });

  return delayed;
}

function delayedCallExpectationFailed(test, delayed) {
  const delayedCount = Object.keys(delayed).length;
  if (test.expectDelayed === false) return delayedCount > 0;
  if (test.expectDelayedPaths) {
    return test.expectDelayedPaths.some((path) => !delayed[path]);
  }
  return delayedCount === 0;
}

async function measureRoute(browser, baseURL, test) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  const delayed = await installApiMocks(page, test.mode);

  await page.addInitScript(() => {
    localStorage.setItem("access_token", "app-tab-first-paint-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  const startedAt = Date.now();
  await page.goto(`${baseURL}${test.path}`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector(test.selector, { timeout: MAX_FIRST_SURFACE_MS });
  await page.waitForFunction(
    (requiredText) => (document.body.textContent || "").includes(requiredText),
    test.text,
    { timeout: MAX_FIRST_SURFACE_MS }
  );
  const firstSurfaceMs = Date.now() - startedAt;
  const loadingTextStillVisible = await page.evaluate(
    (loadingText) => (document.body.textContent || "").includes(loadingText),
    test.loadingText
  );

  await context.close();

  return {
    name: test.name,
    firstSurfaceMs,
    delayed: Object.fromEntries(Array.from(delayed.entries()).sort()),
    loadingTextStillVisible,
  };
}
async function measureProfileBottomNavSettled(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  await installApiMocks(page, "profile-settled");

  await page.addInitScript(() => {
    localStorage.setItem("access_token", "app-tab-first-paint-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  await page.goto(`${baseURL}/app/dashboard?community=8`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await page.waitForSelector('[data-cta-id="app-layout.bottom-nav.profile"]', {
    timeout: MAX_FIRST_SURFACE_MS,
  });
  await page.click('[data-cta-id="app-layout.bottom-nav.profile"]');
  await delay(10000);
  await page.waitForSelector('[data-my-gsn-member-home="true"]', {
    timeout: MAX_FIRST_SURFACE_MS,
  });

  const result = await page.evaluate(() => {
    const text = document.body.textContent || "";
    const memberHome = document.querySelector('[data-my-gsn-member-home="true"]');
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hasIdentityGrid: Boolean(document.querySelector('[data-my-gsn-identity-status-grid="true"]')),
      hasMemberHome: Boolean(memberHome),
      hasIdentityTitle: text.includes("My GSN"),
      hasIdentityFirst: Boolean(document.querySelector('[data-my-gsn-identity-first="true"]')),
      hasAttentionSummary: Boolean(document.querySelector('[data-my-gsn-attention-summary="true"]')),
      hasNoEmptyAttentionCopy: !text.includes("Nothing urgent here"),
      hasMemberHomeHeadline: text.includes("Your communities. Your opportunities. Your activity. Your evidence."),
      hasStandaloneProfileTitle: text.includes("My Profile"),
    };
  });

  await context.close();

  return {
    name: "Profile bottom-nav settled My GSN member home",
    passed:
      result.pathname === "/app/my-gmfn-and-i" &&
      new URLSearchParams(result.search).get("tab") !== "guide" &&
      result.hasMemberHome &&
      result.hasIdentityFirst &&
      !result.hasAttentionSummary &&
      result.hasNoEmptyAttentionCopy &&
      !result.hasIdentityGrid &&
      !result.hasMemberHomeHeadline &&
      !result.hasStandaloneProfileTitle,
    result,
  };
}

async function measureMyGsnMemberHomeSettled(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  const page = await context.newPage();
  await installApiMocks(page, "my-gsn");

  await page.addInitScript(() => {
    localStorage.setItem("access_token", "app-tab-first-paint-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  await page.goto(`${baseURL}/app/my-gmfn-and-i?community=8`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await delay(10000);
  await page.waitForSelector('[data-my-gsn-member-home="true"]', {
    timeout: MAX_FIRST_SURFACE_MS,
  });

  const result = await page.evaluate(() => {
    const text = document.body.textContent || "";
    const isVisible = (node) => node instanceof HTMLElement && !node.closest("details:not([open])") && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
    const identity = document.querySelector('[data-my-gsn-identity-first="true"]');
    const memberHome = document.querySelector('[data-my-gsn-member-home="true"]');
    const memberFrame = document.querySelector('[data-my-gsn-member-frame]');
    const navyFrame = document.querySelector('[data-my-gsn-navy-frame]');
    const memberFrameStyle = memberFrame instanceof HTMLElement ? getComputedStyle(memberFrame) : null;
    const navyFrameStyle = navyFrame instanceof HTMLElement ? getComputedStyle(navyFrame) : null;
    const navyFrameRect = navyFrame instanceof HTMLElement ? navyFrame.getBoundingClientRect() : null;
    const memberHomeRect = memberHome instanceof HTMLElement ? memberHome.getBoundingClientRect() : null;
    const memberHomeTopGap = navyFrameRect && memberHomeRect && navyFrameStyle ? Math.round(memberHomeRect.top - navyFrameRect.top - parseFloat(navyFrameStyle.borderTopWidth) - parseFloat(navyFrameStyle.paddingTop)) : null;
    const openCommunity = document.querySelector('[data-cta-id="my-gmfn.selected-community.open"]');
    const handleUtility = document.querySelector('[data-my-gsn-handle-utility="secondary"]');
    const copyHandle = document.querySelector('[data-cta-id="my-gmfn.identity.copy-handle"]');
    const more = document.querySelector('[data-my-gsn-more="secondary"]');
    const communityToggle = document.querySelector('[data-cta-id="my-gmfn.communities.toggle"]');
    const communityCount = document.querySelector('[data-my-gsn-community-count="true"]');
    const selectedCommunityCard = document.querySelector('[data-my-gsn-selected-community-card="true"]');
    const settingsEditor = document.querySelector('[data-my-gsn-settings-editor="true"]');
    const selectedCommunityCardStyle = selectedCommunityCard instanceof HTMLElement ? getComputedStyle(selectedCommunityCard) : null;
    const identityFacts = Array.from(document.querySelectorAll('[data-my-gsn-identity-fact]'));
    const identityHeading = document.querySelector('[data-my-gsn-identity-heading]');
    const identityValues = Array.from(document.querySelectorAll('[data-my-gsn-identity-value]'));
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hasMemberHome: Boolean(memberHome),
      memberFrameMode: memberFrame?.getAttribute("data-my-gsn-member-frame") ?? null,
      memberFramePadding: memberFrameStyle ? Math.round(parseFloat(memberFrameStyle.paddingLeft)) : null,
      memberFrameBorderWidth: memberFrameStyle ? Math.round(parseFloat(memberFrameStyle.borderLeftWidth)) : null,
      memberFrameBackgroundColor: memberFrameStyle?.backgroundColor ?? null,
      navyFrameMode: navyFrame?.getAttribute("data-my-gsn-navy-frame") ?? null,
      navyFramePadding: navyFrameStyle ? Math.round(parseFloat(navyFrameStyle.paddingLeft)) : null,
      memberHomeTopGap,
      hasRouteHeading: Boolean(document.querySelector('[data-my-gsn-route-heading="true"]')),
      hasPersonalOrientation: Boolean(document.querySelector('[data-my-gsn-personal-orientation="true"]')),
      hasCanonicalPointers: Boolean(document.querySelector('[data-my-gsn-canonical-pointers="true"]')),
      hasAttentionSummary: Boolean(document.querySelector('[data-my-gsn-attention-summary="true"]')),
      hasNoEmptyAttentionCopy: !text.includes("Nothing urgent here"),
      hasMemberHomeHeadline: text.includes("Your communities. Your opportunities. Your activity. Your evidence."),
      hasNotificationsPointer: text.includes("Open Notifications"),
      hasDemandBoxPointer: text.includes("Open DemandBox"),
      hasCommunityPortfolio: Boolean(document.querySelector('[data-my-gsn-community-portfolio="true"]')),
      hasCommunityToggle: Boolean(communityToggle),
      hasCommunityCount: Boolean(communityCount),
      selectedCommunityMode: selectedCommunityCard?.getAttribute("data-my-gsn-selected-community-mode") ?? null,
      selectedCommunityHasSelectionLabel: Boolean(selectedCommunityCard?.textContent?.includes("Selected community")),
      selectedCommunityCardBorderWidth: selectedCommunityCardStyle ? Math.round(parseFloat(selectedCommunityCardStyle.borderLeftWidth)) : null,
      selectedCommunityCardPadding: selectedCommunityCardStyle ? Math.round(parseFloat(selectedCommunityCardStyle.paddingLeft)) : null,
      selectedCommunityCardHeight: selectedCommunityCard instanceof HTMLElement ? Math.round(selectedCommunityCard.getBoundingClientRect().height) : null,
      selectedCommunityCardImageCount: selectedCommunityCard?.querySelectorAll("img").length ?? null,
      hasShopBusiness: Boolean(document.querySelector('[data-my-gsn-shop-business="true"]')),
      hasTrustEvidence: Boolean(document.querySelector('[data-my-gsn-trust-evidence="true"]')),
      hasSettingsAccount: Boolean(document.querySelector('[data-my-gsn-settings-account="true"]')),
      hasSettingsEditor: Boolean(settingsEditor),
      identityHasGsnId: Boolean(identity?.textContent?.includes("GSN ID")),
      identityHasPhone: Boolean(identity?.textContent?.includes("Phone")),
      identityHasHandle: Boolean(identity?.textContent?.includes("Handle")),
      handleUtilityPresent: Boolean(handleUtility),
      identityFactCount: identityFacts.length,
      identityHeadingMode: identityHeading?.getAttribute("data-my-gsn-identity-heading") ?? null,
      identitySectionHeight: identity instanceof HTMLElement ? Math.round(identity.getBoundingClientRect().height) : null,
      identitySectionImageCount: identity?.querySelectorAll("img").length ?? null,
      identityFactMaxHeight: Math.round(Math.max(0, ...identityFacts.map((node) => node.getBoundingClientRect().height))),
      identityValueMaxHeight: Math.round(Math.max(0, ...identityValues.map((node) => node.getBoundingClientRect().height))),
      identityFactImageCount: identityFacts.reduce((count, node) => count + node.querySelectorAll("img").length, 0),
      handleUtilityVisible: isVisible(handleUtility),
      copyHandleVisible: isVisible(copyHandle),
      moreOpen: more instanceof HTMLDetailsElement ? more.open : null,
      moreBottom: more instanceof HTMLElement ? Math.round(more.getBoundingClientRect().bottom) : null,
      openCommunityTop: openCommunity instanceof HTMLElement ? Math.round(openCommunity.getBoundingClientRect().top) : null,
      openCommunityBottom: openCommunity instanceof HTMLElement ? Math.round(openCommunity.getBoundingClientRect().bottom) : null,
      documentHeight: document.documentElement.scrollHeight,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  const screenshotPath = process.env.GSN_FIRST_PAINT_SCREENSHOT_PATH?.trim();
  if (screenshotPath) await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.locator('[data-cta-id="my-gmfn.more.toggle"]').click();
  await delay(300);
  result.expanded = await page.evaluate(() => {
    const isVisible = (node) => node instanceof HTMLElement && !node.closest("details:not([open])") && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
    const more = document.querySelector('[data-my-gsn-more="secondary"]');
    const handleUtility = document.querySelector('[data-my-gsn-handle-utility="secondary"]');
    const copyHandle = document.querySelector('[data-cta-id="my-gmfn.identity.copy-handle"]');
    const settingsLink = document.querySelector('[data-cta-id="my-gmfn.settings.open"]');
    return {
      moreOpen: more instanceof HTMLDetailsElement ? more.open : null,
      handleUtilityVisible: isVisible(handleUtility),
      handleTextPresent: Boolean(handleUtility?.textContent?.includes("GSN handle")),
      copyHandleVisible: isVisible(copyHandle),
      settingsLinkVisible: isVisible(settingsLink),
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  await page.locator('[data-cta-id="my-gmfn.settings.open"]').click();
  await page.waitForFunction(() => new URLSearchParams(window.location.search).get("tab") === "settings");
  await page.waitForSelector('[data-companion-settings-panel="compact"]', { timeout: MAX_FIRST_SURFACE_MS });
  await delay(300);
  result.settingsRoute = await page.evaluate(() => {
    const isVisible = (node) => node instanceof HTMLElement && !node.closest("details:not([open])") && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
    const editor = document.querySelector('[data-my-gsn-settings-editor="true"]');
    const companionPanel = document.querySelector('[data-companion-settings-panel]');
    const companionDisclosure = document.querySelector('[data-companion-settings-disclosure="true"]');
    const companionControls = document.querySelector('[data-companion-settings-controls="true"]');
    return {
      pathname: window.location.pathname,
      search: window.location.search,
      hasEditor: Boolean(editor),
      hasDisplayNameField: Boolean(editor?.textContent?.includes("Profile display name")),
      hasPreferenceSave: Boolean(document.querySelector('[data-cta-id="my-gmfn.settings.save"]')),
      hasPreferenceReset: Boolean(document.querySelector('[data-cta-id="my-gmfn.settings.reset"]')),
      hasCurrentReading: Boolean(document.querySelector('[data-my-gsn-current-reading]')),
      hasSettingsIntro: Boolean(document.querySelector('[data-my-gsn-settings-intro]')),
      profileNameHelp: document.querySelector('[data-my-gsn-profile-name-help]')?.textContent?.trim() ?? null,
      profileNameHelpMode: document.querySelector('[data-my-gsn-profile-name-help]')?.getAttribute("data-my-gsn-profile-name-help") ?? null,
      hasReadingModeHelp: Boolean(document.querySelector('[data-my-gsn-reading-mode-help]')),
      unreadLabel: document.querySelector('[data-my-gsn-unread-label]')?.textContent?.trim() ?? null,
      directActionLabel: document.querySelector('[data-my-gsn-direct-action-label]')?.textContent?.trim() ?? null,
      hasToneHelp: Boolean(document.querySelector('[data-my-gsn-tone-help]')),
      selectCount: editor?.querySelectorAll("select").length ?? 0,
      checkboxCount: editor?.querySelectorAll('input[type="checkbox"]').length ?? 0,
      editorHeight: editor instanceof HTMLElement ? Math.round(editor.getBoundingClientRect().height) : null,
      companionPanelMode: companionPanel?.getAttribute("data-companion-settings-panel") ?? null,
      companionDisclosureOpen: companionDisclosure instanceof HTMLDetailsElement ? companionDisclosure.open : null,
      companionControlsVisible: isVisible(companionControls),
      companionClosedHeight: companionPanel instanceof HTMLElement ? Math.round(companionPanel.getBoundingClientRect().height) : null,
      hasCompanionSummary: Boolean(companionPanel?.textContent?.includes("Companion mode")),
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  await page.locator('[data-cta-id="companion-settings.toggle"]').click();
  await delay(300);
  result.companionExpanded = await page.evaluate(() => {
    const isVisible = (node) => node instanceof HTMLElement && !node.closest("details:not([open])") && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
    const disclosure = document.querySelector('[data-companion-settings-disclosure="true"]');
    const panel = document.querySelector('[data-companion-settings-panel]');
    const controls = document.querySelector('[data-companion-settings-controls="true"]');
    return {
      disclosureOpen: disclosure instanceof HTMLDetailsElement ? disclosure.open : null,
      panelHeight: panel instanceof HTMLElement ? Math.round(panel.getBoundingClientRect().height) : null,
      hasIntroHeadline: Boolean(controls?.textContent?.includes("Let the app gently call attention back")),
      hasIntroParagraph: Boolean(controls?.textContent?.includes("This controls the companion behavior")),
      hasSoundPermissionChip: Boolean(controls?.textContent?.includes("Sound uses your existing browser audio permission")),
      controlLabels: Object.fromEntries(
        Array.from(controls?.querySelectorAll("[data-companion-control-label]") ?? []).map((node) => [
          node.getAttribute("data-companion-control-label"),
          node.textContent?.trim() ?? "",
        ])
      ),
      controlHelpers: Object.fromEntries(
        Array.from(controls?.querySelectorAll("[data-companion-help]") ?? []).map((node) => [
          node.getAttribute("data-companion-help"),
          node.textContent?.trim() ?? "",
        ])
      ),
      controlsVisible: isVisible(controls),
      compactSectionSummaries: Object.fromEntries(
        Array.from(controls?.querySelectorAll("[data-companion-compact-section-summary]") ?? []).map((node) => [node.getAttribute("data-companion-compact-section-summary"), node.textContent?.trim() ?? ""])
      ),
      compactSectionToggleCount: controls?.querySelectorAll("[data-companion-compact-section-toggle]").length ?? 0,
      alertsControlsVisible: isVisible(document.querySelector('[data-companion-compact-section-controls="alerts"]')),
      timingControlsVisible: isVisible(document.querySelector('[data-companion-compact-section-controls="timing"]')),
      visibleScheduleInputCount: Array.from(controls?.querySelectorAll('input[type="time"], input[type="number"]') ?? []).filter(isVisible).length,
      hasIntensityChoices: ["off", "light", "active"].every((mode) =>
        Boolean(document.querySelector(`[data-cta-id="companion-settings.mode.${mode}"]`))
      ),
      hasAllRemindersChoice: Boolean(controls?.textContent?.includes("All reminders")),
      hasNotificationControl: Boolean(document.querySelector('[data-cta-id="companion-settings.push.on"]')),
      scheduleInputCount: controls?.querySelectorAll('input[type="time"], input[type="number"]').length ?? 0,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  });

  const companionExpandedScreenshotPath = process.env.GSN_COMPANION_EXPANDED_SCREENSHOT_PATH?.trim();
  if (companionExpandedScreenshotPath) {
    await page.locator('[data-companion-settings-panel="compact"]').screenshot({
      path: companionExpandedScreenshotPath,
    });
  }
  const measureCompanionSecondarySections = async () =>
    page.evaluate(() => {
      const isVisible = (node) => node instanceof HTMLElement && !node.closest("details:not([open])") && node.getClientRects().length > 0 && getComputedStyle(node).visibility !== "hidden";
      const panel = document.querySelector('[data-companion-settings-panel]');
      const alertsToggle = document.querySelector('[data-companion-compact-section-toggle="alerts"]');
      const timingToggle = document.querySelector('[data-companion-compact-section-toggle="timing"]');
      const controls = document.querySelector('[data-companion-settings-controls="true"]');
      return {
        alertsExpanded: alertsToggle?.getAttribute("aria-expanded") === "true",
        timingExpanded: timingToggle?.getAttribute("aria-expanded") === "true",
        alertsControlsVisible: isVisible(document.querySelector('[data-companion-compact-section-controls="alerts"]')),
        timingControlsVisible: isVisible(document.querySelector('[data-companion-compact-section-controls="timing"]')),
        visibleSoundControl: isVisible(document.querySelector('[data-cta-id="companion-settings.audible.off"]')),
        visibleNotificationControl: isVisible(document.querySelector('[data-cta-id="companion-settings.push.on"]')),
        visibleScheduleInputCount: Array.from(controls?.querySelectorAll('input[type="time"], input[type="number"]') ?? []).filter(isVisible).length,
        panelHeight: panel instanceof HTMLElement ? Math.round(panel.getBoundingClientRect().height) : null,
        noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      };
    });

  await page.locator('[data-cta-id="companion-settings.section.alerts"]').click();
  await delay(200);
  result.companionAlertsOpen = await measureCompanionSecondarySections();
  const companionAlertsScreenshotPath = process.env.GSN_COMPANION_ALERTS_SCREENSHOT_PATH?.trim();
  if (companionAlertsScreenshotPath) {
    await page.locator('[data-companion-settings-panel="compact"]').screenshot({ path: companionAlertsScreenshotPath });
  }

  await page.locator('[data-cta-id="companion-settings.push.test"]').scrollIntoViewIfNeeded();
  await delay(100);
  result.companionAlertsBottomReachable = await page.evaluate(() => {
    const testButton = document.querySelector('[data-cta-id="companion-settings.push.test"]');
    const bottomNav = document.querySelector('[data-gmfn-bottom-nav="true"]');
    if (!(testButton instanceof HTMLElement) || !(bottomNav instanceof HTMLElement)) return false;
    const buttonRect = testButton.getBoundingClientRect();
    const navRect = bottomNav.getBoundingClientRect();
    return buttonRect.top >= 0 && buttonRect.bottom <= navRect.top;
  });
  await page.locator('[data-cta-id="companion-settings.section.timing"]').click();
  await delay(200);
  result.companionTimingOpen = await measureCompanionSecondarySections();
  const companionTimingScreenshotPath = process.env.GSN_COMPANION_TIMING_SCREENSHOT_PATH?.trim();
  if (companionTimingScreenshotPath) {
    await page.locator('[data-companion-settings-panel="compact"]').screenshot({ path: companionTimingScreenshotPath });
  }


  const settingsScreenshotPath = process.env.GSN_SETTINGS_SCREENSHOT_PATH?.trim();
  if (settingsScreenshotPath) {
    await page.goto(`${baseURL}/app/my-gmfn-and-i?tab=settings`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-my-gsn-settings-editor="true"]', { timeout: MAX_FIRST_SURFACE_MS });
    await delay(300);
    await page.locator('[data-my-gsn-settings-editor="true"]').screenshot({ path: settingsScreenshotPath });
  }

  const companionScreenshotPath = process.env.GSN_COMPANION_SCREENSHOT_PATH?.trim();
  if (companionScreenshotPath) {
    await page.goto(`${baseURL}/app/my-gmfn-and-i?tab=settings`, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await page.waitForSelector('[data-companion-settings-panel="compact"]', { timeout: MAX_FIRST_SURFACE_MS });
    await delay(300);
    await page.locator('[data-companion-settings-panel="compact"]').screenshot({ path: companionScreenshotPath });
  }

  await context.close();

  return {
    name: "My GSN member-home settled default",
    passed:
      result.pathname === "/app/my-gmfn-and-i" &&
      new URLSearchParams(result.search).get("tab") !== "guide" &&
      result.hasMemberHome &&
      !result.hasRouteHeading &&
      result.memberFrameMode === "flat-phone" &&
      result.memberFramePadding === 0 &&
      result.memberFrameBorderWidth === 0 &&
      result.memberFrameBackgroundColor === "rgba(0, 0, 0, 0)" &&
      result.navyFrameMode === "compact" &&
      result.navyFramePadding === 12 &&
      result.memberHomeTopGap !== null && result.memberHomeTopGap <= 1 &&
      result.hasPersonalOrientation &&
      result.hasCanonicalPointers &&
      !result.hasAttentionSummary &&
      result.hasNoEmptyAttentionCopy &&
      result.hasCommunityPortfolio &&
      !result.hasCommunityToggle &&
      result.hasShopBusiness &&
      !result.hasCommunityCount &&
      result.selectedCommunityMode === "flat-single" &&
      !result.selectedCommunityHasSelectionLabel &&
      result.selectedCommunityCardBorderWidth === 0 &&
      result.selectedCommunityCardPadding === 0 &&
      result.selectedCommunityCardHeight !== null &&
      result.selectedCommunityCardHeight <= 90 &&
      result.selectedCommunityCardImageCount === 0 &&
      result.hasTrustEvidence &&
      result.hasSettingsAccount &&
      !result.hasSettingsEditor &&
      result.identityHasGsnId &&
      result.identityHasPhone &&
      !result.identityHasHandle &&
      result.handleUtilityPresent &&
      !result.handleUtilityVisible &&
      result.identityFactCount === 2 &&
      result.identityFactMaxHeight <= 90 &&
      result.identityHeadingMode === "text-only" &&
      result.identitySectionHeight !== null && result.identitySectionHeight <= 180 &&
      result.identitySectionImageCount === 0 &&

      result.identityValueMaxHeight <= 36 &&
      result.identityFactImageCount === 0 &&
      !result.copyHandleVisible &&
      result.moreOpen === false &&
      result.moreBottom !== null &&
      result.moreBottom <= 844 &&
      result.openCommunityBottom !== null &&
      result.openCommunityBottom <= 844 &&
      result.documentHeight <= 844 &&
      result.noHorizontalOverflow &&
      result.expanded.moreOpen === true &&
      result.expanded.handleUtilityVisible &&
      result.expanded.handleTextPresent &&
      result.expanded.copyHandleVisible &&
      result.expanded.settingsLinkVisible &&
      result.expanded.noHorizontalOverflow &&
      result.settingsRoute.pathname === "/app/my-gmfn-and-i" &&
      new URLSearchParams(result.settingsRoute.search).get("tab") === "settings" &&
      result.settingsRoute.hasEditor &&
      result.settingsRoute.hasDisplayNameField &&
      result.settingsRoute.hasPreferenceSave &&
      result.settingsRoute.hasPreferenceReset &&
      !result.settingsRoute.hasCurrentReading &&
      !result.settingsRoute.hasSettingsIntro &&
      result.settingsRoute.profileNameHelp === "The name people see across GSN." &&
      result.settingsRoute.profileNameHelpMode === "compact" &&
      !result.settingsRoute.hasReadingModeHelp &&
      result.settingsRoute.unreadLabel === "Show unread items first" &&
      result.settingsRoute.directActionLabel === "Open the destination directly" &&
      !result.settingsRoute.hasToneHelp &&
      result.settingsRoute.selectCount === 2 &&
      result.settingsRoute.checkboxCount === 2 &&
      result.settingsRoute.noHorizontalOverflow &&
      result.settingsRoute.companionPanelMode === "compact" &&
      result.settingsRoute.companionDisclosureOpen === false &&
      !result.settingsRoute.companionControlsVisible &&
      result.settingsRoute.companionClosedHeight !== null &&
      result.settingsRoute.companionClosedHeight <= 100 &&
      result.settingsRoute.hasCompanionSummary &&
      result.companionExpanded.disclosureOpen === true &&
      result.companionExpanded.panelHeight !== null &&
      result.companionExpanded.panelHeight <= 400 &&
      result.companionExpanded.compactSectionToggleCount === 2 &&
      Boolean(result.companionExpanded.compactSectionSummaries.alerts) &&
      Boolean(result.companionExpanded.compactSectionSummaries.timing) &&
      !result.companionExpanded.alertsControlsVisible &&
      !result.companionExpanded.timingControlsVisible &&
      result.companionExpanded.visibleScheduleInputCount === 0 &&
      !result.companionExpanded.hasIntroHeadline &&
      !result.companionExpanded.hasIntroParagraph &&
      !result.companionExpanded.hasSoundPermissionChip &&
      result.companionExpanded.controlLabels["reminder-level"] === "Reminder level" &&
      result.companionExpanded.controlLabels.sound === "Sound" &&
      result.companionExpanded.controlLabels["spoken-reminders"] === "Spoken reminders" &&
      result.companionExpanded.controlLabels["daily-limit"] === "Daily reminder limit" &&
      result.companionExpanded.controlLabels["repeat-after"] === "Repeat after (minutes)" &&
      result.companionExpanded.controlHelpers["spoken-reminders"] === "Spoken reminders for important alerts." &&
      result.companionExpanded.controlHelpers["system-notifications"] === "Get reminders when GSN is not open." &&
      result.companionExpanded.controlsVisible &&
      result.companionExpanded.hasIntensityChoices &&
      result.companionExpanded.hasAllRemindersChoice &&
      result.companionExpanded.hasNotificationControl &&
      result.companionExpanded.scheduleInputCount === 4 &&
      result.companionAlertsOpen.alertsExpanded &&
      !result.companionAlertsOpen.timingExpanded &&
      result.companionAlertsOpen.alertsControlsVisible &&
      !result.companionAlertsOpen.timingControlsVisible &&
      result.companionAlertsOpen.visibleSoundControl &&
      result.companionAlertsOpen.visibleNotificationControl &&
      result.companionAlertsOpen.visibleScheduleInputCount === 0 &&
      result.companionAlertsOpen.noHorizontalOverflow &&
      result.companionAlertsBottomReachable &&
      !result.companionTimingOpen.alertsExpanded &&
      result.companionTimingOpen.timingExpanded &&
      !result.companionTimingOpen.alertsControlsVisible &&
      result.companionTimingOpen.timingControlsVisible &&
      !result.companionTimingOpen.visibleSoundControl &&
      !result.companionTimingOpen.visibleNotificationControl &&
      result.companionTimingOpen.visibleScheduleInputCount === 4 &&
      result.companionTimingOpen.noHorizontalOverflow &&
      !result.hasMemberHomeHeadline,
    result,
  };
}

async function run() {
  let server;
  let browser;

  const tests = [
    {
      name: "Community Home",
      mode: "community",
      path: "/app/community?community=8",
      selector: '[data-debug-id="community-home.identity-card"]',
      text: "Community Home",
      loadingText: "Loading your communities",
    },
    {
      name: "Marketplace",
      mode: "marketplace",
      path: "/app/marketplace?community=8",
      selector: '[data-cta-id="marketplace.job.find-people-services"]',
      text: "Shops & services",
      loadingText: "Loading your current community",
    },
    {
      name: "Profile",
      mode: "profile",
      path: "/app/profile?community=8",
      selector: '[data-my-gsn-member-home="true"]',
      text: "My communities",
      loadingText: "Loading device preferences",
      expectDelayed: false,
    },
    {
      name: "My GSN member-home",
      mode: "my-gsn",
      path: "/app/my-gmfn-and-i?community=8",
      selector: '[data-my-gsn-member-home="true"]',
      text: "My communities",
      loadingText: "Loading device preferences",
      expectDelayed: false,
    },
    {
      name: "Trust Passport",
      mode: "trust",
      path: "/app/trust?community=8",
      selector: '[data-trust-passport-decision-first="one-answer-four-facts"]',
      text: "Aggregate Passport reading",
      loadingText: "Loading Trust Passport",
      expectDelayedPaths: ["/trust/me/why", "/trust-slips/me/summary"],
    },
    {
      name: "TrustSlip Setup",
      mode: "trust-slip",
      path: "/app/trust-slip?community=8",
      selector: '[data-gsn-trustslip-setup-only="true"]',
      text: "Choose purpose and community first.",
      loadingText: "Loading TrustSlip",
      expectDelayedPaths: ["/trust-slips/me/summary"],
    },
  ];
  const requestedNames = String(process.env.GSN_FIRST_PAINT_ROUTES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const testsToMeasure = requestedNames.length
    ? tests.filter((test) => requestedNames.includes(test.name.toLowerCase()))
    : tests;

  try {
    server = await createServer({
      root: frontendRoot,
      configFile: join(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "silent",
    });
    await server.listen();
    const port = server.httpServer.address().port;
    const baseURL = `http://127.0.0.1:${port}`;

    browser = await chromium.launch({ headless: true });
    const results = [];

    for (const test of testsToMeasure) {
      try {
        results.push(await measureRoute(browser, baseURL, test));
      } catch (error) {
        throw new Error(`First-paint measurement failed for ${test.name}: ${error?.message || error}`, {
          cause: error,
        });
      }
    }

    const settledResults = [
      await measureProfileBottomNavSettled(browser, baseURL),
      await measureMyGsnMemberHomeSettled(browser, baseURL),
    ];

    const failures = results.filter(
      (result) =>
        result.firstSurfaceMs > MAX_FIRST_SURFACE_MS ||
        result.loadingTextStillVisible ||
        delayedCallExpectationFailed(
          testsToMeasure.find((test) => test.name === result.name),
          result.delayed
        )
    );

    const settledFailures = settledResults.filter((result) => !result.passed);

    if (failures.length || settledFailures.length) {
      console.error(`App tab first-paint audit failed: ${JSON.stringify({ results, failures, settledResults, settledFailures })}`);
      process.exit(1);
    }

    console.log(
      `App tab first-paint audit passed with ${SECONDARY_DELAY_MS}ms delayed secondary calls: ${JSON.stringify({ results, settledResults })}.`
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (server) await server.close().catch(() => {});
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
