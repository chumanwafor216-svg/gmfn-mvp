/* global console, process, URL, localStorage, document */

import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = process.cwd();
const screenshotDir = "C:\\tmp\\gmfn-community-home";
mkdirSync(screenshotDir, { recursive: true });

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function installApiMocks(page, { includeSecondClan = false, canManage = false } = {}) {
  const state = { pollRequests: [], pollSelections: [], publicPollRequests: [], noticePosts: [] };
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (route.request().resourceType() === "document" && !url.pathname.startsWith("/api/")) {
      return route.continue();
    }

    if (path === "/auth/me") {
      return route.fulfill(json({
        id: 216,
        user_id: 216,
        display_name: "Nwafor Chuma",
        gmfn_id: "GMFN-U-63655DE6",
        role: canManage ? "admin" : "member",
      }));
    }
    if (path === "/clans/me") {
      const clans = [
        {
          id: 8,
          clan_id: 8,
          name: "Homeland isa",
          display_name: "Homeland isa",
          marketplace_name: "Homeland isa",
          community_code: "GMFN-C-000008",
          gmfn_id: "GMFN-C-000008",
          role: canManage ? "admin" : "user",
          status: "active",
          membership_status: "active",
          member_count: 7,
          active_member_count: 7,
          notice_posting_policy: "members",
        },
      ];
      if (includeSecondClan) {
        clans.push({
          id: 9,
          clan_id: 9,
          name: "Sachimo",
          display_name: "Sachimo",
          marketplace_name: "Sachimo",
          community_code: "GMFN-C-000009",
          gmfn_id: "GMFN-C-000009",
          role: "user",
          status: "active",
          membership_status: "active",
          member_count: 12,
          active_member_count: 12,
          notice_posting_policy: "members",
        });
      }
      return route.fulfill(json(clans));
    }
    if (path === "/community-domains/my") {
      return route.fulfill(json({ items: [] }));
    }
    if (path === "/pool/me") {
      return route.fulfill(json({ clan_id: 8, currency: "NGN", balance: 0 }));
    }
    if (path === "/community-notices/81/poll-response" && route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      state.pollRequests.push(payload);
      state.pollSelections = Array.isArray(payload?.options) ? payload.options : [];
      return route.fulfill(json({
        ok: true,
        message: `Poll response saved: ${state.pollSelections.join(", ")}.`,
        poll_summary: {
          counts: {
            Friday: state.pollSelections.includes("Friday") ? 1 : 0,
            Saturday: state.pollSelections.includes("Saturday") ? 1 : 0,
            Sunday: state.pollSelections.includes("Sunday") ? 1 : 0,
          },
          total: 1,
          own_response: state.pollSelections[0] || null,
          own_responses: state.pollSelections,
        },
      }));
    }
    if (path === "/community-notices/91/poll-response" && route.request().method() === "POST") {
      return route.fulfill(json({ detail: "Not authenticated" }, 401));
    }
    if (path === "/community-notices/public/public-poll-code/poll-response" && route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      state.publicPollRequests.push(payload);
      const selections = Array.isArray(payload?.options) ? payload.options : [];
      return route.fulfill(json({
        ok: true,
        message: `Poll response saved: ${selections.join(", ")}.`,
        poll_summary: {
          counts: {
            Friday: selections.includes("Friday") ? 1 : 0,
            Saturday: selections.includes("Saturday") ? 1 : 0,
          },
          total: 1,
          member_response_count: 0,
          public_response_count: 1,
          own_response: selections[0] || null,
          own_responses: selections,
          respondent_boundary: "Public-link totals are browser-response counts, not verified unique people.",
        },
      }));
    }
    if (path === "/community-notices/public/public-poll-code" && route.request().method() === "GET") {
      return route.fulfill(json({
        ok: true,
        notice: {
          notice_id: "TE-91",
          event_id: 91,
          clan_id: 8,
          body: "Choose the best day for the public meeting.",
          full_body: "This longer public announcement explains the meeting purpose, the people invited, the expected preparation, and the practical arrangements. It also includes enough additional detail to prove that a recipient sees only a short preview until they deliberately open the complete message on a phone.",
          created_at: "2026-10-27T09:00:00Z",
          expires_at: "2026-11-03T09:00:00Z",
          acknowledgement_enabled: false,
          availability_enabled: false,
          poll_enabled: true,
          poll_question: "Which day works for you?",
          poll_options: ["Friday", "Saturday"],
          poll_selection_mode: "single",
          poll_audience: "public_link",
          poll_summary: {
            counts: { Friday: 0, Saturday: 0 },
            total: 0,
            respondent_boundary: "Browser responses are not verified unique people.",
          },
          public_qr_enabled: true,
          public_code: "public-poll-code",
          public_path: "/community-notices/public-poll-code",
          source_community_name: "Homeland isa",
          community: { id: 8, name: "Homeland isa", code: "GMFN-C-000008" },
        },
      }));
    }
    if (path === "/community-notices" && route.request().method() === "POST") {
      const payload = route.request().postDataJSON();
      state.noticePosts.unshift(payload);
      return route.fulfill(json({
        ok: true,
        submitted_for_review: false,
        notice: {
          notice_id: "notice-8-created",
          event_id: 82,
          clan_id: 8,
          body: payload.body,
          full_body: payload.full_body,
          created_at: "2026-10-27T14:05:00Z",
          expires_at: "2026-11-03T14:05:00Z",
          acknowledgement_enabled: true,
          availability_enabled: Boolean(payload.availability_enabled),
          poll_enabled: true,
          poll_question: payload.poll_question,
          poll_options: payload.poll_options,
          poll_selection_mode: payload.poll_selection_mode,
          poll_audience: payload.poll_audience,
          poll_summary: { counts: { Friday: 0, Saturday: 0 }, total: 0 },
          public_qr_enabled: true,
          public_code: "notice-8-created-public",
          public_path: "/community-notices/notice-8-created-public",
          source: "community_notice",
        },
      }));
    }
    if (/^\/community-notices(?:\/|$)/.test(path)) {
      return route.fulfill(json({
        notices: [
          ...(state.noticePosts[0]
            ? [{
                notice_id: "notice-8-created",
                event_id: 82,
                clan_id: 8,
                body: state.noticePosts[0].body,
                full_body: state.noticePosts[0].full_body,
                created_at: "2026-10-27T14:05:00Z",
                expires_at: "2026-11-03T14:05:00Z",
                acknowledgement_enabled: true,
                availability_enabled: Boolean(state.noticePosts[0].availability_enabled),
                poll_enabled: true,
                poll_question: state.noticePosts[0].poll_question,
                poll_options: state.noticePosts[0].poll_options,
                poll_selection_mode: state.noticePosts[0].poll_selection_mode,
                poll_audience: state.noticePosts[0].poll_audience,
                poll_summary: { counts: { Friday: 0, Saturday: 0 }, total: 0 },
                public_qr_enabled: true,
                public_code: "notice-8-created-public",
                public_path: "/community-notices/notice-8-created-public",
                source: "community_notice",
              }]
            : []),
          {
            notice_id: "notice-8-1",
            event_id: 81,
            clan_id: 8,
            body: "Please read this community update before Wednesday and check the next step.",
            full_body: "Please read this community update before Wednesday. The full response tools belong behind one clear action.",
            created_at: "2026-10-27T09:00:00Z",
            expires_at: "2026-11-03T09:00:00Z",
            acknowledgement_enabled: false,
            availability_enabled: false,
            poll_enabled: true,
            poll_question: "Which days suit you?",
            poll_options: ["Friday", "Saturday", "Sunday"],
            poll_selection_mode: "multiple",
            poll_audience: "members",
            poll_summary: {
              counts: {
                Friday: state.pollSelections.includes("Friday") ? 1 : 0,
                Saturday: state.pollSelections.includes("Saturday") ? 1 : 0,
                Sunday: state.pollSelections.includes("Sunday") ? 1 : 0,
              },
              total: state.pollSelections.length > 0 ? 1 : 0,
              own_response: state.pollSelections[0] || null,
              own_responses: state.pollSelections,
            },
            public_qr_enabled: true,
            public_code: "notice-8-1-public",
            public_path: "/community-notices/notice-8-1-public",
            source: "community_notice",
          },
        ],
        posting_policy: "members",
        can_post_notice: canManage,
        can_submit_notice_for_review: false,
        pending_notice_review_count: 0,
      }));
    }
    if (/^\/clans\/8\/select\/?$/.test(path) || path === "/clans/select") {
      return route.fulfill(json({ selected_clan_id: 8 }));
    }
    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }
    return route.continue();
  });
  return state;
}

async function collectOverflow(page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll("main *"))
      .filter((element) => {
        if (element.closest('[aria-hidden="true"]')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && (rect.left < -2 || rect.right > document.documentElement.clientWidth + 2);
      })
      .slice(0, 8)
      .map((element) => ({
        tag: element.tagName,
        text: (element.textContent || "").trim().slice(0, 80),
        left: Math.round(element.getBoundingClientRect().left),
        right: Math.round(element.getBoundingClientRect().right),
      }))
  );
}

async function run() {
  let server;
  let browser;

  try {
    server = await createServer({
      root: frontendRoot,
      configFile: join(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "silent",
    });
    await server.listen();
    const port = server.httpServer.address().port;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    page.on("pageerror", (error) => console.error("Community Home phone page error:", error));
    page.on("console", (message) => {
      if (message.type() === "error") console.error("Community Home phone console error:", message.text());
    });
    const apiState = await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-simple-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.communityHome.sections.v6",
        JSON.stringify({ communities: true, marketplaceTools: true, subscriptions: true, trustFinance: true })
      );
    });

    await page.goto(`http://127.0.0.1:${port}/app/community/8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="community-home.goto.toggle"]', { timeout: 30000 });
    await page.waitForSelector('[data-cta-id^="community-home.bulletin.reactions."]', { timeout: 30000 });

    const companionDismiss = page.getByRole("button", { name: "Dismiss", exact: true });
    if (await companionDismiss.isVisible().catch(() => false)) {
      await companionDismiss.click();
      await page.waitForTimeout(120);
    }

    const defaultState = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const identityText = document.querySelector('[data-debug-id="community-home.identity-card"]')?.textContent || "";
      const bulletinHeaderText = document.querySelector('[aria-label="Community announcements"]')?.textContent?.trim() || "";
      const actionSectionStyle = document.querySelector('[data-debug-id="community-home.go-to"]')?.getAttribute("style") || "";
      const phoneStatus = document.querySelector('[data-debug-id="community-home.bulletin.phone-status"]');
      const urgencyTones = Array.from(document.querySelectorAll("[data-bulletin-urgency-tone]")).map((node) => node.getAttribute("data-bulletin-urgency-tone"));
      return {
        hasName: identityText.includes("Homeland isa"),
        hasMemberCount: identityText.includes("7 members"),
        hasCommunityId: identityText.includes("GMFN-C-000008"),
        hasPosition: identityText.includes("Member"),
        hasMembership: identityText.includes("Active"),
        hasOpenNotice: text.includes("Open notice"),
        hasQuickActions: ["Community Marketplace", "Members", "Support & Opportunities", "Community Events"].every((label) => text.includes(label)),
        hasMoreTools: text.includes("More community tools"),
        quickActionCount: document.querySelectorAll('[data-debug-id="community-home.quick-actions"] [data-cta-id]').length,
        heroPhotoReady: Boolean(document.querySelector('[data-debug-id="community-home.identity-card"] div[aria-hidden="true"]')),
        inviteVisible: Boolean(document.querySelector('[data-cta-id="simple-community-invite.open"]')?.getClientRects().length),
        shareVisible: Boolean(document.querySelector('[data-cta-id="community-home.identity.share-community"]')?.getClientRects().length),
        bulletinHeaderText,
        switcherCount: document.querySelectorAll('[data-debug-id="community-home.switch-community"]').length,
        actionSectionHasExtraCard: /background|border|box-shadow/.test(actionSectionStyle),
        duplicatePhoneNavCount: document.querySelectorAll('[data-cta-id^="page-top-nav."]').length,
        pulseCount: document.querySelectorAll('[data-debug-id="community-home.bulletin.pulse"]').length,
        calendarTileCount: document.querySelectorAll('[aria-label="Announcement date"]').length,
        phoneStatusCount: phoneStatus ? 1 : 0,
        phoneStatusText: phoneStatus?.textContent?.replace(/\s+/g, " ").trim() || "",
        phoneStatusHeight: phoneStatus instanceof globalThis.HTMLElement ? Math.round(phoneStatus.getBoundingClientRect().height) : null,
        urgencyTones,
        attentionCount: document.querySelectorAll('[data-debug-id="community-home.attention"]').length,
      };
    });
    const marketplaceVisibleBeforeOpen = await page.locator('[data-cta-id="community-home.goto.marketplace"]').isVisible();
    const overflow390 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-simple-390x844.png"), fullPage: false });

    if (
      !defaultState.hasName ||
      !defaultState.hasMemberCount ||
      !defaultState.hasCommunityId ||
      !defaultState.hasPosition ||
      !defaultState.hasMembership ||
      !defaultState.hasOpenNotice ||
      !defaultState.hasQuickActions ||
      !defaultState.hasMoreTools ||
      defaultState.quickActionCount !== 4 ||
      !defaultState.heroPhotoReady ||
      !defaultState.inviteVisible ||
      !defaultState.shareVisible ||
      defaultState.bulletinHeaderText !== "Bulletin" ||
      defaultState.switcherCount !== 0 ||
      defaultState.actionSectionHasExtraCard ||
      defaultState.duplicatePhoneNavCount !== 0 ||
      defaultState.pulseCount !== 0 ||
      defaultState.calendarTileCount !== 0 ||
      defaultState.phoneStatusCount !== 1 ||
      defaultState.phoneStatusText !== "All clear" ||
      defaultState.phoneStatusHeight === null ||
      defaultState.phoneStatusHeight > 36 ||
      defaultState.urgencyTones.join(",") !== "green" ||
      defaultState.attentionCount !== 0 ||
      !marketplaceVisibleBeforeOpen ||
      overflow390.length > 0
    ) {
      console.error("Community Home simple phone default state failed:", {
        defaultState,
        marketplaceVisibleBeforeOpen,
        overflow390,
      });
      process.exitCode = 1;
      return;
    }

    await page.locator('[data-cta-id^="community-home.bulletin.reactions."]').click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.reactions-panel"]', { timeout: 30000 });
    if (!(await page.getByText("Full notice", { exact: true }).isVisible())) {
      console.error("Community Home Open notice did not reveal the full notice.");
      process.exitCode = 1;
      return;
    }
    for (const label of ["Respond", "Share or open QR", "Announcement details"]) {
      await page.getByRole("button", { name: new RegExp(`^${label}`) }).waitFor({ state: "visible", timeout: 30000 });
    }
    if (
      await page.locator('[data-debug-id="community-home.bulletin.choice-poll"]').isVisible().catch(() => false) ||
      await page.locator('[data-cta-id^="community-home.bulletin.share."]').isVisible().catch(() => false) ||
      await page.locator('[data-debug-id="community-home.bulletin.phone-timing-details"]').isVisible().catch(() => false)
    ) {
      console.error("Community Home Open notice exposed a secondary Bulletin tool before its row was chosen.");
      process.exitCode = 1;
      return;
    }
    await page.screenshot({ path: join(screenshotDir, "community-home-bulletin-open-390x844.png"), fullPage: false });

    await page.locator('[data-cta-id="community-home.bulletin.phone-section-toggle.respond"]').click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.choice-poll"]', { timeout: 30000 });
    if (!(await page.getByText("Community members only", { exact: true }).isVisible())) {
      console.error("Community Home poll did not show its members-only audience.");
      process.exitCode = 1;
      return;
    }
    await page.screenshot({ path: join(screenshotDir, "community-home-bulletin-respond-390x844.png"), fullPage: false });
    await page.locator('[data-cta-id="community-home.bulletin.poll-option.0"]').click();
    await page.locator('[data-cta-id="community-home.bulletin.poll-option.2"]').click();
    if (apiState.pollRequests.length !== 0) {
      console.error("Community Home poll wrote a response before the member pressed OK.", apiState.pollRequests);
      process.exitCode = 1;
      return;
    }
    await page.locator('[data-cta-id="community-home.bulletin.poll-submit"]').click();
    await page.waitForFunction(() => document.body.textContent?.includes("Poll response saved: Friday, Sunday."));
    if (
      apiState.pollRequests.length !== 1 ||
      JSON.stringify(apiState.pollRequests[0]?.options) !== JSON.stringify(["Friday", "Sunday"])
    ) {
      console.error("Community Home poll did not send one confirmed multiple-choice response.", apiState.pollRequests);
      process.exitCode = 1;
      return;
    }
    await page.waitForTimeout(420);

    await page.locator('[data-cta-id="community-home.bulletin.phone-section-toggle.share"]').click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.phone-section-panel.respond"]', { state: "hidden", timeout: 30000 });
    const shareAnnouncement = page.locator('[data-cta-id^="community-home.bulletin.share."]');
    await shareAnnouncement.waitFor({ state: "visible", timeout: 30000 });
    await shareAnnouncement.click();
    await page.getByRole("dialog", { name: "Choose share channel" }).waitFor({ state: "visible", timeout: 30000 });
    for (const channel of ["WhatsApp", "Facebook", "X", "LinkedIn", "Copy message"]) {
      await page.getByRole("button", { name: channel, exact: true }).waitFor({ state: "visible", timeout: 30000 });
    }
    const shareChooserOverflow = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-share-announcement-390x844.png"), fullPage: false });
    if (shareChooserOverflow.length > 0) {
      console.error("Community Home share chooser overflowed on phone:", shareChooserOverflow);
      process.exitCode = 1;
      return;
    }
    await page.locator('[data-cta-id="social-tag-share.close"]').click();
    await page.getByRole("dialog", { name: "Choose share channel" }).waitFor({ state: "hidden", timeout: 30000 });

    await page.locator('[data-cta-id="community-home.bulletin.phone-section-toggle.details"]').click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.phone-section-panel.share"]', { state: "hidden", timeout: 30000 });
    await page.waitForSelector('[data-debug-id="community-home.bulletin.phone-timing-details"]', { state: "visible", timeout: 30000 });
    const detailTimingText = await page.locator('[data-debug-id="community-home.bulletin.phone-timing-details"]').textContent();
    if (detailTimingText?.replace(/\s+/g, "") !== "0Now072h1Clear") {
      console.error("Community Home Announcement details did not preserve all timing counts.", detailTimingText);
      process.exitCode = 1;
      return;
    }
    await page.screenshot({ path: join(screenshotDir, "community-home-bulletin-details-390x844.png"), fullPage: false });
    await page.getByRole("button", { name: "Close notice" }).click();
    await page.waitForSelector('[data-debug-id="community-home.bulletin.reactions-panel"]', { state: "hidden", timeout: 30000 });

    await page.locator('[data-cta-id="community-home.goto.toggle"]').click();
    for (const label of ["Manage shop", "Finance", "Trust"]) {
      await page.getByRole("button", { name: label, exact: true }).waitFor({ state: "visible", timeout: 30000 });
    }

    await page.setViewportSize({ width: 360, height: 780 });
    await page.waitForTimeout(100);
    const overflow360 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-actions-360x780.png"), fullPage: false });
    if (overflow360.length > 0) {
      console.error("Community Home simple phone expanded state overflowed:", overflow360);
      process.exitCode = 1;
      return;
    }

    await page.setViewportSize({ width: 320, height: 720 });
    await page.waitForTimeout(100);
    const overflow320 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-actions-320x720.png"), fullPage: false });
    if (overflow320.length > 0) {
      console.error("Community Home compact phone state overflowed:", overflow320);
      process.exitCode = 1;
      return;
    }

    await page.setViewportSize({ width: 884, height: 820 });
    await page.waitForTimeout(100);
    const overflow884 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-unfolded-884x820.png"), fullPage: false });
    if (overflow884.length > 0) {
      console.error("Community Home unfolded-phone state overflowed:", overflow884);
      process.exitCode = 1;
      return;
    }

    await page.setViewportSize({ width: 1104, height: 884 });
    await page.waitForTimeout(100);
    const unfoldedState = await page.evaluate(() => ({
      shellMode: document.querySelector("[data-gmfn-shell-mode]")?.getAttribute("data-gmfn-shell-mode"),
      quickActionsVisible: Boolean(
        document.querySelector('[data-debug-id="community-home.quick-actions"]')?.getClientRects().length
      ),
      desktopPageNavVisible: Array.from(
        document.querySelectorAll('[data-cta-id^="page-top-nav."]')
      ).some((node) => node.getClientRects().length > 0),
    }));
    const overflow1104 = await collectOverflow(page);
    await page.screenshot({ path: join(screenshotDir, "community-home-unfolded-1104x884.png"), fullPage: false });
    if (
      unfoldedState.shellMode !== "compact" ||
      !unfoldedState.quickActionsVisible ||
      unfoldedState.desktopPageNavVisible ||
      overflow1104.length > 0
    ) {
      console.error("Community Home changed back to its desktop presentation when unfolded:", {
        unfoldedState,
        overflow1104,
      });
      process.exitCode = 1;
      return;
    }
    const androidFallbackPage = await browser.newPage({
      viewport: { width: 1104, height: 884 },
      deviceScaleFactor: 2,
      isMobile: false,
      hasTouch: false,
      userAgent:
        "Mozilla/5.0 (Linux; Android 14; SM-F946B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    });
    await installApiMocks(androidFallbackPage);
    await androidFallbackPage.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-android-fallback-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });
    await androidFallbackPage.goto("http://127.0.0.1:" + port + "/app/community/8", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await androidFallbackPage.waitForSelector('[data-debug-id="community-home.quick-actions"]', {
      timeout: 30000,
    });
    const androidFallbackState = await androidFallbackPage.evaluate(() => ({
      shellMode: document
        .querySelector("[data-gmfn-shell-mode]")
        ?.getAttribute("data-gmfn-shell-mode"),
      desktopPageNavVisible: Array.from(
        document.querySelectorAll('[data-cta-id^="page-top-nav."]')
      ).some((node) => node.getClientRects().length > 0),
    }));
    await androidFallbackPage.close();
    if (
      androidFallbackState.shellMode !== "compact" ||
      androidFallbackState.desktopPageNavVisible
    ) {
      console.error(
        "Community Home ignored the Android fallback when pointer APIs misreported:",
        androidFallbackState
      );
      process.exitCode = 1;
      return;
    }

    const multiCommunityPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    await installApiMocks(multiCommunityPage, { includeSecondClan: true });
    await multiCommunityPage.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-simple-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.communityHome.sections.v6",
        JSON.stringify({ communities: true, marketplaceTools: true, subscriptions: true, trustFinance: true })
      );
    });
    await multiCommunityPage.goto(`http://127.0.0.1:${port}/app/community/8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await multiCommunityPage.waitForSelector('[data-cta-id="community-home.switch.toggle"]', { timeout: 30000 });
    await multiCommunityPage.locator('[data-cta-id="community-home.switch.toggle"]').click();
    await multiCommunityPage.waitForSelector('[data-cta-id="community-home.switch.select.9"]', { state: "visible", timeout: 30000 });
    await multiCommunityPage.close();
    const composerPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const composerState = await installApiMocks(composerPage, { canManage: true });
    await composerPage.addInitScript(() => {
      localStorage.setItem("access_token", "local-community-home-composer-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });
    await composerPage.goto(`http://127.0.0.1:${port}/app/community/8`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    const composerDismiss = composerPage.getByRole("button", { name: "Dismiss", exact: true });
    if (await composerDismiss.isVisible().catch(() => false)) {
      await composerDismiss.click();
    }
    await composerPage.locator('[data-cta-id="community-home.admin.toggle"]').click();
    await composerPage.locator('[data-cta-id="community-home.admin.notice.post"]').click();
    const composerDialog = composerPage.getByRole("dialog", { name: "Post community notice" });
    await composerDialog.waitFor({ state: "visible", timeout: 30000 });

    const longNotice = Array.from({ length: 74 }, () => "word").join(" ");
    await composerDialog.locator("textarea").first().fill(longNotice);
    await composerDialog.locator('[data-cta-id="community-notice-modal.poll-toggle"]').click();
    const anyoneWithLinkButton = composerDialog.getByRole("button", { name: "Anyone with the link", exact: true });
    await anyoneWithLinkButton.click();
    if ((await anyoneWithLinkButton.getAttribute("aria-pressed")) !== "true") {
      throw new Error("Public-link voting choice did not become active.");
    }
    await composerDialog.getByText("People outside the community can vote from the shared announcement.", { exact: false }).waitFor({ state: "visible", timeout: 30000 });
    await composerDialog.getByLabel("Poll question").fill("Which day is most suitable?");
    await composerDialog.getByLabel("Poll choice 1").fill("Friday");
    await composerDialog.getByLabel("Poll choice 2").fill("Saturday");

    const settingsSummary = composerDialog.locator(
      '[data-debug-id="community-notice-modal.settings-summary"]'
    );
    if (
      await settingsSummary.evaluate((element) => element.hasAttribute("open"))
    ) {
      console.error("Community Notice technical settings were open by default.");
      process.exitCode = 1;
      return;
    }
    await composerDialog
      .locator('[data-debug-id="community-notice-modal.compact-preview-note"]')
      .waitFor({ state: "visible", timeout: 30000 });
    await composerDialog
      .locator('[data-debug-id="community-notice-modal.share-after-post"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const postNoticeButton = composerDialog.locator(
      '[data-cta-id="community-notice-modal.post"]'
    );
    if (!(await postNoticeButton.isEnabled())) {
      console.error("A valid 74-word notice still disabled Post notice.");
      process.exitCode = 1;
      return;
    }
    await composerPage.screenshot({
      path: join(screenshotDir, "community-notice-composer-390x844.png"),
      fullPage: false,
    });
    await postNoticeButton.click();
    await composerDialog.waitFor({ state: "hidden", timeout: 30000 });
    await composerPage
      .locator('[data-cta-id="community-home.bulletin.phone-section-toggle.share"]')
      .waitFor({ state: "visible", timeout: 30000 });
    await composerPage
      .locator('[data-cta-id="community-home.bulletin.phone-section-toggle.share"]')
      .click();
    await composerPage
      .locator('[data-cta-id="community-home.bulletin.share.notice-8-created"]')
      .waitFor({ state: "visible", timeout: 30000 });

    const createdPayload = composerState.noticePosts[0];
    if (
      createdPayload?.body?.trim().split(/\s+/).length !== 50 ||
      createdPayload?.full_body !== longNotice ||
      createdPayload?.poll_audience !== "public_link" ||
      createdPayload?.public_qr_enabled !== true
    ) {
      console.error("Community Notice compact preview/share payload was wrong.", createdPayload);
      process.exitCode = 1;
      return;
    }
    await composerPage.close();



    const publicPollPage = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const publicPollState = await installApiMocks(publicPollPage);
    await publicPollPage.goto(`http://127.0.0.1:${port}/community-notices/public-poll-code`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await publicPollPage.waitForSelector('[data-debug-id="community-notice.choice-poll"]', { timeout: 30000 });
    await publicPollPage.getByText("Anyone with this link can vote. No name is collected.", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
    await publicPollPage.getByText("Poll result · 0 responses", { exact: true }).waitFor({ state: "visible", timeout: 30000 });
    const fullMessageToggle = publicPollPage.locator('[data-cta-id="community-notice.full-message.toggle"]');
    const fullMessageContent = publicPollPage.locator('[data-debug-id="community-notice.full-message.content"]');
    await fullMessageToggle.waitFor({ state: "visible", timeout: 30000 });
    if (await fullMessageContent.isVisible()) {
      console.error("Detached public notice exposed the long full message by default.");
      process.exitCode = 1;
      return;
    }
    await fullMessageToggle.click();
    await fullMessageContent.waitFor({ state: "visible", timeout: 30000 });
    await fullMessageToggle.click();
    await fullMessageContent.waitFor({ state: "hidden", timeout: 30000 });
    const publicShareButton = publicPollPage.locator('[data-cta-id="community-notice.share"]');
    const publicShareToggle = publicPollPage.locator('[data-cta-id="community-notice.share-package.toggle"]');
    if (await publicShareButton.isVisible()) {
      console.error("Detached public notice exposed secondary sharing controls by default.");
      process.exitCode = 1;
      return;
    }
    await publicShareToggle.click();
    await publicShareButton.waitFor({ state: "visible", timeout: 30000 });
    await publicPollPage.locator('[data-debug-id="community-notice.share-package.content"] svg').waitFor({ state: "visible", timeout: 30000 });
    await publicShareToggle.click();
    await publicShareButton.waitFor({ state: "hidden", timeout: 30000 });
    const boundaryContent = publicPollPage.locator('[data-debug-id="community-notice.page-boundary.content"]');
    if (await boundaryContent.isVisible()) {
      console.error("Detached public notice exposed its longer boundary text by default.");
      process.exitCode = 1;
      return;
    }
    await publicPollPage.locator('[data-cta-id="community-notice.poll-option.0"]').click();
    await publicPollPage.locator('[data-cta-id="community-notice.poll-submit"]').click();
    await publicPollPage.waitForSelector('[data-debug-id="community-notice.poll-results"]', { timeout: 30000 });
    if (
      publicPollState.publicPollRequests.length !== 1 ||
      JSON.stringify(publicPollState.publicPollRequests[0]?.options) !== JSON.stringify(["Friday"]) ||
      String(publicPollState.publicPollRequests[0]?.response_token || "").length < 24
    ) {
      console.error("Detached public poll did not send one browser-token response.", publicPollState.publicPollRequests);
      process.exitCode = 1;
      return;
    }
    const publicPollOverflow = await collectOverflow(publicPollPage);
    await publicPollPage.screenshot({ path: join(screenshotDir, "community-notice-public-poll-390x844.png"), fullPage: false });
    if (publicPollOverflow.length > 0) {
      console.error("Detached public poll overflowed on phone.", publicPollOverflow);
      process.exitCode = 1;
      return;
    }
    await publicPollPage.close();

    console.log(`Community Home simple phone smoke passed. Screenshots: ${screenshotDir}`);
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
