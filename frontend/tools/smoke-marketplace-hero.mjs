/* global console, process, URL, localStorage, document, window, HTMLDetailsElement, getComputedStyle */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDir = join(frontendRoot, "screenshots");
mkdirSync(screenshotDir, { recursive: true });

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

async function installApiMocks(page, baseURL) {
  const me = {
    id: 216,
    user_id: 216,
    display_name: "Nwafor Chuma",
    gmfn_id: "GMFN-U-63655DE6",
    role: "member",
  };
  const clan = {
    id: 8,
    clan_id: 8,
    name: "Builders corporation Marketplace",
    display_name: "Builders corporation Marketplace",
    community_name: "Builders corporation Marketplace",
    marketplace_name: "Builders corporation Marketplace",
    description: "Community-bound buying, selling, support, and evidence desk.",
    marketplace_description:
      "Community-bound buying, selling, support, and evidence desk.",
    community_code: "GSN-C-000011",
    clan_code: "GSN-C-000011",
    gmfn_id: "GSN-C-000011",
    member_count: 1,
    public_shop_count: 1,
    trust_band: "E",
    community_trust_band: "E",
    cci_band: "E",
    marketplace_image_url:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=320&h=320&fit=crop",
  };
  const pillarClan = {
    id: 13,
    clan_id: 13,
    name: "Pillar of Hope",
    display_name: "Pillar of Hope",
    community_name: "Pillar of Hope",
    marketplace_name: "Pillar of Hope Marketplace",
    description: "Community Domain marketplace for Pillar of Hope members.",
    marketplace_description: "Community Domain marketplace for Pillar of Hope members.",
    community_code: "GMFN-C-000013",
    clan_code: "GMFN-C-000013",
    gmfn_id: "GMFN-C-000013",
    member_count: 1,
    public_shop_count: 0,
  };
  const membersByClan = {
    8: [
    {
      id: 216,
      user_id: 216,
      display_name: "Apex Home Services",
      gmfn_id: "GMFN-U-63655DE6",
      role: "Merchant",
    },
    {
      id: 217,
      user_id: 217,
      display_name: "Enugu Food & Delivery",
      gmfn_id: "GMFN-U-22222222",
      role: "Merchant",
    },
    ],
    13: [
      {
        id: 216,
        user_id: 216,
        display_name: "Nwafor Chuma",
        gmfn_id: "GMFN-U-63655DE6",
        role: "Owner",
      },
    ],
  };
  const shopsByClan = {
    8: [
    {
      id: 55,
      shop_id: 55,
      clan_id: 8,
      owner_user_id: 216,
      owner_gmfn_id: "GMFN-U-63655DE6",
      name: "Apex Home Services",
      description: "Home appliances, electronics and more",
      image_url:
        "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=320&h=240&fit=crop",
      visibility: "public",
    },
    {
      id: 56,
      shop_id: 56,
      clan_id: 8,
      owner_user_id: 217,
      owner_gmfn_id: "GMFN-U-22222222",
      name: "Enugu Food & Delivery",
      description: "Shawarma affair and Chinese delicacy",
      image_url:
        "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=320&h=240&fit=crop",
      visibility: "public",
    },
    ],
    13: [],
  };
  const directoryCatalog = [
    ...Array.from({ length: 21 }, (_, index) => {
      const sequence = index + 1;
      return {
        id: 100 + sequence,
        clan_id: 8,
        owner_user_id: 300 + sequence,
        owner_name: `Directory Owner ${String(sequence).padStart(2, "0")}`,
        gmfn_id: `GMFN-U-DIR${String(sequence).padStart(4, "0")}`,
        shop_name: `Community Service ${String(sequence).padStart(2, "0")}`,
        name: `Community Service ${String(sequence).padStart(2, "0")}`,
        description:
          sequence % 2 === 0
            ? "Repairs, installation and practical services"
            : "Products and everyday community support",
        service_summary:
          sequence % 2 === 0
            ? "Repairs, installation and practical services"
            : "Products and everyday community support",
        image_url: "",
        contact_ready: sequence % 2 === 0,
        offer_count: sequence % 3,
        is_active: true,
        visibility_mode: "community_visible",
      };
    }),
    {
      id: 900,
      clan_id: 8,
      owner_user_id: 900,
      owner_name: "Private Owner",
      gmfn_id: "GMFN-U-PRIVATE",
      shop_name: "Private Workshop",
      name: "Private Workshop",
      description: "Must not appear",
      service_summary: "Must not appear",
      image_url: "",
      contact_ready: true,
      offer_count: 1,
      is_active: true,
      visibility_mode: "vault_private",
    },
    {
      id: 901,
      clan_id: 8,
      owner_user_id: 901,
      owner_name: "Inactive Owner",
      gmfn_id: "GMFN-U-INACTIVE",
      shop_name: "Inactive Business",
      name: "Inactive Business",
      description: "Must not appear",
      service_summary: "Must not appear",
      image_url: "",
      contact_ready: true,
      offer_count: 1,
      is_active: false,
      visibility_mode: "community_visible",
    },
    {
      id: 902,
      clan_id: 99,
      owner_user_id: 902,
      owner_name: "Outside Owner",
      gmfn_id: "GMFN-U-OUTSIDE",
      shop_name: "Outside Community Service",
      name: "Outside Community Service",
      description: "Must not appear",
      service_summary: "Must not appear",
      image_url: "",
      contact_ready: true,
      offer_count: 1,
      is_active: true,
      visibility_mode: "community_visible",
    },
  ];
  const domains = [
    {
      id: 13,
      domain_name: "pillar-of-hope",
      display_name: "Pillar of Hope",
      status: "active",
      verification_status: "unverified",
      clan_id: 13,
    },
    {
      id: 14,
      domain_name: "setup-domain",
      display_name: "Setup Domain",
      status: "draft",
      verification_status: "unverified",
      clan_id: null,
    },
  ];

  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") return route.fulfill(json(me));
    if (path === "/clans/me") return route.fulfill(json([clan, pillarClan]));
    if (path === "/community-domains/my") {
      return route.fulfill(json({ items: domains }));
    }
    const membersMatch = path.match(/^\/clans\/(\d+)\/members/);
    if (membersMatch) {
      return route.fulfill(json(membersByClan[Number(membersMatch[1])] || []));
    }
    const inviteMatch = path.match(/^\/clans\/(\d+)\/invite-link/);
    if (inviteMatch) {
      const clanId = Number(inviteMatch[1]);
      return route.fulfill(
        json({
          invite_url: `${baseURL}/join/${clanId === 13 ? "PILLAR13" : "HOMELAND8"}`,
          code: clanId === 13 ? "PILLAR13" : "HOMELAND8",
        })
      );
    }
    if (/^\/marketplace\/shops\/mine/.test(path)) {
      const clanId = Number(url.searchParams.get("clan_id") || 8);
      const shops = shopsByClan[clanId] || [];
      return route.fulfill(json({ shop: shops[0] || null, products: [] }));
    }
    if (path === "/marketplace/shops/directory") {
      const clanId = Number(url.searchParams.get("clan_id") || 8);
      const query = String(url.searchParams.get("q") || "").trim().toLowerCase();
      const contactReadyOnly = url.searchParams.get("contact_ready") === "true";
      const offersListedOnly = url.searchParams.get("offers_listed") === "true";
      const limit = Math.max(1, Number(url.searchParams.get("limit") || 20));
      const cursor = String(url.searchParams.get("cursor") || "");
      const directoryItems = directoryCatalog
        .filter(
          (shop) =>
            shop.clan_id === clanId &&
            shop.is_active &&
            shop.visibility_mode === "community_visible"
        )
        .filter((shop) =>
          query
            ? [shop.shop_name, shop.description, shop.owner_name]
                .join(" ")
                .toLowerCase()
                .includes(query)
            : true
        )
        .filter((shop) => (contactReadyOnly ? shop.contact_ready : true))
        .filter((shop) => (offersListedOnly ? shop.offer_count > 0 : true));
      const offset = cursor === "directory-page-2" ? 20 : 0;
      const pageItems = directoryItems.slice(offset, offset + limit);
      const hasMore = offset + pageItems.length < directoryItems.length;
      return route.fulfill(
        json({
          items: pageItems,
          total: cursor ? null : directoryItems.length,
          limit,
          has_more: hasMore,
          next_cursor: hasMore ? "directory-page-2" : null,
          clan_id: clanId,
          scope: "selected_community",
          sort: query ? "relevance_then_name" : "name_ascending",
        })
      );
    }
    if (path === "/marketplace/requests") {
      const clanId = Number(url.searchParams.get("clan_id") || 8);
      return route.fulfill(
        json(
          clanId === 8
            ? [
                {
                  id: 710,
                  clan_id: 8,
                  title: "I need appliance repair",
                  description: "My fridge needs an experienced repairer.",
                  category: "home_appliance_repair",
                  area: "New Haven",
                  urgency: "normal_priority",
                  status: "open",
                  requester_display_name: "Community Member",
                  marketplace_name: "Builders corporation Marketplace",
                  created_at: "2026-11-03T08:30:00Z",
                  visibility_scope: "community_visible",
                },
              ]
            : []
        )
      );
    }
    if (/^\/marketplace\/requests\/\d+\/matches/.test(path)) {
      return route.fulfill(json({ matches: [] }));
    }
    if (/^\/marketplace\/shops/.test(path)) {
      const clanId = Number(url.searchParams.get("clan_id") || 8);
      const shops = shopsByClan[clanId] || [];
      return route.fulfill(json({ items: shops, shops }));
    }
    if (/^\/marketplace\/products/.test(path)) {
      return route.fulfill(json({ items: [], products: [] }));
    }
    if (/^\/pool\/me/.test(path)) {
      return route.fulfill(
        json({ balance: 1250.75, available_balance: 1250.75, items: [] })
      );
    }
    if (/^\/loans/.test(path)) return route.fulfill(json({ items: [], loans: [] }));
    if (/^\/trust-slips\/me/.test(path)) {
      return route.fulfill(
        json({
          open_trust_class: "E",
          open_trust_band: "E",
          cross_community_integrity_class: "E",
          cross_community_integrity_score: 12,
        })
      );
    }
    if (/^\/trust-score\/clan/.test(path) || /^\/trust/.test(path)) {
      return route.fulfill(
        json({
          score: 12,
          grade: "E",
          band: "E",
          reading: "Thin",
          counts: { recorded: 49 },
        })
      );
    }
    if (/^\/protected-trades/.test(path)) {
      return route.fulfill(json({ items: [], records: [] }));
    }
    if (/^\/payment-instructions\/community-package\/status/.test(path)) {
      return route.fulfill(json({ items: [] }));
    }
    if (/^\/marketplace\/repost/.test(path)) {
      return route.fulfill(
        json({ items: [], targets: [], available_paid_credits: 0 })
      );
    }

    if (
      url.pathname.startsWith("/api/") ||
      url.origin === "http://127.0.0.1:8012"
    ) {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }

    return route.continue();
  });
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
    const baseURL = `http://127.0.0.1:${port}`;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await installApiMocks(page, baseURL);
    await page.addInitScript(() => {
      localStorage.setItem("access_token", "local-marketplace-hero-token");
      localStorage.setItem("gmfn_selected_clan_id", "8");
      localStorage.setItem(
        "gmfn.marketplace.sections.8",
        JSON.stringify({
          money: false,
          rosca: false,
          tools: false,
          members: false,
          demand: false,
          support: false,
        })
      );
    });

    await page.goto(`${baseURL}/app/marketplace?community=8`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="marketplace.job.find-people-services"]', {
      timeout: 30000,
    });
    await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
    await page.screenshot({
      path: join(screenshotDir, "marketplace-hero-390x844.png"),
      fullPage: false,
    });

    const result = await page.evaluate(() => {
      const text = document.body.textContent || "";
      const required = [
        "Builders corporation Marketplace",
        "Buy, sell, support and grow together in our community.",
        "Needs / Demand",
        "Post or view what the community needs.",
        "Add need",
        "Shops & Services",
        "Browse eligible shops and service providers in this community.",
        "Open directory",
        "Invite someone",
        "More things you can do",
        "Support members",
        "Share a resource",
        "Suggested next step",
      ];
      const missing = required.filter((item) => !text.includes(item));
      const forbiddenPresent = [
        "Live DemandBox requests",
        "Request lifecycle",
        "Relevant provider",
        "Visible shop faces",
        "More marketplace tools",
        "local net position",
        "Ardent Ebony Uplift LTD",
        "Blessed Satch family Marketplace",
        "community_visible",
      ].filter((item) => text.includes(item));
      const shopEntryCount = document.querySelectorAll(
        '[data-cta-id="marketplace.job.find-people-services"]'
      ).length;
      const duplicateShopEntryCount = document.querySelectorAll(
        '[data-cta-id="marketplace.progressive.browse-shops"]'
      ).length;
      const shopPreviewCount = document.querySelectorAll(
        '[data-gmfn-debug-id="marketplace.front.shop-previews"]'
      ).length;
      const requestDetails = document.querySelector(
        '[data-gmfn-debug-id="marketplace.front.need.710.details"]'
      );
      const overflow = Array.from(document.querySelectorAll("main *"))
        .filter((element) => {
          if (element.closest('[aria-hidden="true"]')) return false;
          const rect = element.getBoundingClientRect();
          return (
            rect.width > 0 &&
            (rect.left < -2 || rect.right > window.innerWidth + 2)
          );
        })
        .slice(0, 6)
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent || "").trim().slice(0, 80),
          right: Math.round(element.getBoundingClientRect().right),
        }));
      const clippedHeroStats = Array.from(
        document.querySelectorAll("[data-marketplace-hero-stat-value]")
      )
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          const text = (element.textContent || "").trim();
          return (
            rect.width > 0 &&
            (element.scrollWidth > element.clientWidth + 1 ||
              (text.length > 8 &&
                element.scrollHeight > element.clientHeight + 4))
          );
        })
        .map((element) => ({
          stat: element.getAttribute("data-marketplace-hero-stat-value"),
          text: (element.textContent || "").trim(),
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          scrollHeight: element.scrollHeight,
        }));
      return {
        missing,
        forbiddenPresent,
        overflow,
        clippedHeroStats,
        shopEntryCount,
        duplicateShopEntryCount,
        shopPreviewCount,
        requestDetailsCollapsed:
          requestDetails instanceof HTMLDetailsElement && !requestDetails.open,
      };
    });

    if (
      result.missing.length ||
      result.forbiddenPresent.length ||
      result.overflow.length ||
      result.clippedHeroStats.length ||
      result.shopEntryCount !== 1 ||
      result.duplicateShopEntryCount !== 0 ||
      result.shopPreviewCount !== 0 ||
      !result.requestDetailsCollapsed
    ) {
      console.error("Marketplace hero smoke failed:", result);
      process.exit(1);
    }

    await page
      .locator('[data-cta-id="marketplace.front.need.710.details-toggle"]')
      .click();
    const requestDetailsResult = await page.evaluate(() => {
      const details = document.querySelector(
        '[data-gmfn-debug-id="marketplace.front.need.710.details"]'
      );
      const text = details?.textContent || "";
      return {
        open: details instanceof HTMLDetailsElement && details.open,
        hasPlainRequester: text.includes("Posted by Community Member"),
        hasPlainVisibility: text.includes("Visible in this community"),
        hasRawVisibility: text.includes("community_visible"),
      };
    });
    if (
      !requestDetailsResult.open ||
      !requestDetailsResult.hasPlainRequester ||
      !requestDetailsResult.hasPlainVisibility ||
      requestDetailsResult.hasRawVisibility
    ) {
      console.error("Marketplace request-details disclosure smoke failed:", requestDetailsResult);
      process.exit(1);
    }
    await page
      .locator('[data-cta-id="marketplace.front.need.710.details-toggle"]')
      .click();

    await page.setViewportSize({ width: 457, height: 915 });
    await page.waitForTimeout(250);
    await page.screenshot({
      path: join(screenshotDir, "marketplace-chika-457x915.png"),
      fullPage: false,
    });

    const chikaResult = await page.evaluate(() => {
      const selectors = [
        '[data-gmfn-debug-id="marketplace.identity"]',
        '[data-cta-id="marketplace.front.invite-someone"]',
        '[data-gmfn-debug-id="marketplace.front.needs"]',
        '[data-gmfn-debug-id="marketplace.front.shops"]',
        '[data-gmfn-debug-id="marketplace.progressive-tools"]',
        '[data-gmfn-debug-id="marketplace.front.suggested-next-step"]',
      ];
      const positions = selectors.map((selector) => {
        const element = document.querySelector(selector);
        return element ? Math.round(element.getBoundingClientRect().top + window.scrollY) : -1;
      });
      const ordered = positions.every(
        (position, index) => position >= 0 && (index === 0 || position > positions[index - 1])
      );
      const hero = document.querySelector('[data-gmfn-debug-id="marketplace.identity"]');
      const needsHeader = document.querySelector(
        '[data-gmfn-debug-id="marketplace.front.needs-header"]'
      );
      const shopsHeader = document.querySelector(
        '[data-gmfn-debug-id="marketplace.front.shops-header"]'
      );
      const progressiveActions = document.querySelector(
        '[data-gmfn-debug-id="marketplace.progressive-actions"]'
      );
      const suggestedCopy = document.querySelector(
        '[data-gmfn-debug-id="marketplace.front.suggested-copy"]'
      );
      const suggestedAction = document.querySelector(
        '[data-cta-id="marketplace.row.wisdom-action"]'
      );
      const needsAction = document.querySelector(
        '[data-cta-id="marketplace.job.add-need-shortcut"]'
      );
      const shopsAction = document.querySelector(
        '[data-cta-id="marketplace.job.find-people-services"]'
      );
      const overflow = Array.from(document.querySelectorAll("main *"))
        .filter((element) => {
          if (element.closest('[aria-hidden="true"]')) return false;
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && (rect.left < -2 || rect.right > window.innerWidth + 2);
        })
        .slice(0, 6)
        .map((element) => ({
          tag: element.tagName,
          text: (element.textContent || "").trim().slice(0, 80),
          right: Math.round(element.getBoundingClientRect().right),
        }));

      return {
        ordered,
        positions,
        heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
        shopEntryCount: document.querySelectorAll(
          '[data-cta-id="marketplace.job.find-people-services"]'
        ).length,
        progressiveColumnCount: progressiveActions
          ? getComputedStyle(progressiveActions).gridTemplateColumns.split(" ").filter(Boolean).length
          : 0,
        needsActionStacked: Boolean(
          needsHeader &&
            needsAction &&
            needsHeader.firstElementChild &&
            needsAction.getBoundingClientRect().top >=
              needsHeader.firstElementChild.getBoundingClientRect().bottom
        ),
        shopsActionStacked: Boolean(
          shopsHeader &&
            shopsAction &&
            shopsHeader.firstElementChild &&
            shopsAction.getBoundingClientRect().top >=
              shopsHeader.firstElementChild.getBoundingClientRect().bottom
        ),
        suggestedActionStacked: Boolean(
          suggestedCopy &&
            suggestedAction &&
            suggestedAction.getBoundingClientRect().top >=
              suggestedCopy.getBoundingClientRect().bottom
        ),
        overflow,
      };
    });

    if (
      !chikaResult.ordered ||
      chikaResult.heroHeight <= 0 ||
      chikaResult.heroHeight > 230 ||
      chikaResult.shopEntryCount !== 1 ||
      chikaResult.progressiveColumnCount !== 1 ||
      !chikaResult.needsActionStacked ||
      !chikaResult.shopsActionStacked ||
      !chikaResult.suggestedActionStacked ||
      chikaResult.overflow.length
    ) {
      console.error("Marketplace Chika-sized frame smoke failed:", chikaResult);
      process.exit(1);
    }

    await page.locator('[data-cta-id="marketplace.job.find-people-services"]').click();
    await page.waitForFunction(
      () =>
        ["Find a shop or service", "Community Service 20"].every((text) =>
          (document.getElementById("marketplace-members-shops")?.textContent || "").includes(
            text
          )
        ),
      null,
      { timeout: 30000 }
    );

    const memberDomainResult = await page.evaluate(() => {
      const membersSection =
        document.getElementById("marketplace-members-shops")?.textContent || "";
      const toolsSection =
        document.getElementById("marketplace-owned-links")?.textContent || "";
      const required = [
        "Shops & Services Directory",
        "Find a shop or service",
        "Community Service 01",
        "Community Service 20",
      ];
      const missing = required.filter((item) => !membersSection.includes(item));
      const scopedLeak = [
        "Pillar of Hope",
        "Setup Domain",
        "Private Workshop",
        "Inactive Business",
        "Outside Community Service",
      ].filter((item) =>
        membersSection.includes(item)
      );
      const toolsLeak = ["Pillar of Hope", "Setup Domain", "Domain marketplaces"].filter(
        (item) => toolsSection.includes(item)
      );

      return { missing, scopedLeak, toolsLeak };
    });

    if (
      memberDomainResult.missing.length ||
      memberDomainResult.scopedLeak.length ||
      memberDomainResult.toolsLeak.length
    ) {
      console.error("Marketplace selected-community scope smoke failed:", memberDomainResult);
      process.exit(1);
    }

    const loadMore = page.locator('[data-cta-id="marketplace.directory.load-more"]');
    if ((await loadMore.count()) !== 1) {
      console.error("Marketplace directory pagination smoke failed: Show 20 more was missing.");
      process.exit(1);
    }
    await loadMore.click();
    await page.waitForFunction(
      () =>
        (document.getElementById("marketplace-members-shops")?.textContent || "").includes(
          "Community Service 21"
        ),
      null,
      { timeout: 30000 }
    );

    const completeDirectoryResult = await page.evaluate(() => {
      const membersSection =
        document.getElementById("marketplace-members-shops")?.textContent || "";
      const openShopLinks = document.querySelectorAll(
        '#marketplace-members-shops [data-cta-id^="marketplace.member."][data-cta-id$=".shop"]'
      );
      return {
        hasLastEligibleShop: membersSection.includes("Community Service 21"),
        openShopCount: openShopLinks.length,
        forbiddenPresent: [
          "Private Workshop",
          "Inactive Business",
          "Outside Community Service",
        ].filter((item) => membersSection.includes(item)),
      };
    });

    if (
      !completeDirectoryResult.hasLastEligibleShop ||
      completeDirectoryResult.openShopCount !== 21 ||
      completeDirectoryResult.forbiddenPresent.length
    ) {
      console.error("Marketplace complete eligible directory smoke failed:", completeDirectoryResult);
      process.exit(1);
    }

    await page
      .locator(
        '#marketplace-members-shops [data-cta-id^="marketplace.member."][data-cta-id$=".shop"]'
      )
      .first()
      .click();
    await page.waitForURL(/\/shop\/GMFN-U-DIR0001/i, { timeout: 30000 });
    const shopNavigationUrl = new URL(page.url());
    if (
      !/^\/shop\/GMFN-U-DIR0001$/i.test(shopNavigationUrl.pathname) ||
      shopNavigationUrl.searchParams.get("clan_id") !== "8" ||
      shopNavigationUrl.hash !== "#shop-diaries"
    ) {
      console.error("Marketplace directory navigation smoke failed:", page.url());
      process.exit(1);
    }

    await page.goto(`${baseURL}/app/marketplace?community=13`, {
      waitUntil: "networkidle",
      timeout: 60000,
    });
    await page.waitForSelector('[data-cta-id="marketplace.job.find-people-services"]', {
      timeout: 30000,
    });

    await page.locator('[data-cta-id="marketplace.job.find-people-services"]').click();
    await page.waitForFunction(
      () =>
        (document.getElementById("marketplace-members-shops")?.textContent || "").includes(
          "Pillar of Hope"
        ),
      null,
      { timeout: 30000 }
    );

    const pillarResult = await page.evaluate(() => {
      const membersSection =
        document.getElementById("marketplace-members-shops")?.textContent || "";
      const required = [
        "Community Domains",
        "Pillar of Hope",
        "No public shops are visible in this marketplace yet.",
      ];
      const forbidden = ["Community Service 01", "Setup Domain"];
      return {
        missing: required.filter((item) => !membersSection.includes(item)),
        forbiddenPresent: forbidden.filter((item) => membersSection.includes(item)),
      };
    });

    if (pillarResult.missing.length || pillarResult.forbiddenPresent.length) {
      console.error("Pillar marketplace scope smoke failed:", pillarResult);
      process.exit(1);
    }

    console.log(
      "Marketplace hero smoke passed: collapsed entry, complete eligible directory, visibility scope, shop navigation, 390x844 phone, and 457x915 foldable frame verified."
    );
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
