/* global console, process, URL, localStorage, getComputedStyle */

import { chromium } from "playwright";
import { createServer } from "vite";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const community = {
  id: 8,
  clan_id: 8,
  name: "Blessed Satch family",
  marketplace_name: "Blessed Satch family Marketplace",
  status: "active",
  membership_role: "member",
};

const requests = [
  {
    id: 72,
    user_id: 216,
    title: "Need a freezer repair",
    description: "The freezer stopped cooling yesterday.",
    category: "Repair",
    urgency: "normal",
    area: "Onitsha",
    status: "open",
    is_mine: true,
    relay_consent_granted: true,
    whatsapp_number: "+447700900216",
    payment_mode: "Agree directly",
    requester_display_name: "Ada Example",
    requester_gmfn_id: "GSN-U-216",
    requester_profile_image_url: "/src/assets/dashboard/dashboard-trustslip-verification.jpg",
    clan_name: community.name,
    queue_keys: ["mine"],
    visibility_scope: "community_visible",
    audio_attachment_id: 900,
    audio_duration_seconds: 24,
    created_at: "2026-10-17T10:00:00Z",
  },
  {
    id: 73,
    user_id: 309,
    title: "Need school transport",
    description: "Product: Weekday school transport\nShop: Awka Family Transport\nListed price: GBP 15\n@GSN-U-216\nPlease confirm availability, final price and collection or delivery arrangements.\nBuyer note: Is this product still available?",
    category: "Transport",
    urgency: "high",
    area: "Awka",
    status: "open",
    requester_display_name: "Chidi Member",
    requester_gmfn_id: "GSN-U-309",
    requester_profile_image_url: "/src/assets/dashboard/dashboard-trustslip-verification.jpg",
    clan_name: community.name,
    queue_keys: ["urgent", "tagged_for_me"],
    is_tagged_for_me: true,
    mentioned_member_count: 1,
    mentioned_handles: ["@GSN-U-216"],
    visibility_scope: "protected_target",
    product_context: {
      product_id: 810,
      shop_id: 81,
      product_title: "Weekday school transport",
      shop_name: "Awka Family Transport",
      listed_price: "15",
      currency: "GBP",
      shop_path: "/shop/GSN-U-810?product_id=810&clan_id=8",
    },
    created_at: "2026-10-17T11:00:00Z",
  },
];

async function installApiMocks(page, apiCalls) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method().toUpperCase();

    if (path === "/auth/me") {
      return route.fulfill(json({
        id: 216,
        user_id: 216,
        display_name: "Ada Example",
        gmfn_id: "GSN-U-216",
        profile_image_url: "/src/assets/dashboard/dashboard-trustslip-verification.jpg",
        role: "member",
      }));
    }
    if (path === "/clans/me") return route.fulfill(json({ items: [community] }));
    if (path === "/community-domains/my") return route.fulfill(json({ items: [] }));
    if (path === "/clans/8/members") {
      return route.fulfill(json({
        items: [
          { user_id: 216, gmfn_id: "GSN-U-216", display_name: "Ada Example", status: "active" },
          { user_id: 309, gmfn_id: "GSN-U-309", display_name: "Chidi Member", status: "active" },
        ],
      }));
    }
    if (path === "/opportunity-relays/policies/8") {
      return route.fulfill(json({ clan_id: 8, version: 1, outbound_enabled: false, inbound_enabled: false }));
    }
    if (/^\/marketplace\/requests\/\d+\/supply-matches$/.test(path)) {
      const requestId = Number(path.split("/")[3] || 0);
      if (requestId === 72) {
        return route.fulfill(json({
          count: 1,
          matches: [
            {
              demand_id: 72,
              demand_category: "Repair",
              clan_id: 8,
              shop_id: 90,
              product_id: 900,
              product_title: "Freezer repair visit",
              shop_name: "Onitsha Cooling Repairs",
              public_shop_path: "/shop/GSN-U-900?product_id=900&clan_id=8",
              reason_codes: ["SAME_COMMUNITY", "LISTED_OFFERING", "AVAILABILITY_UNCONFIRMED", "AREA_COMPATIBLE", "PRODUCT_TITLE_MATCH", "RELEVANCE_RELIABLE"],
            },
          ],
        }));
      }
      if (requestId !== 73) return route.fulfill(json({ count: 0, matches: [] }));
      return route.fulfill(json({
        count: 4,
        matches: [
          {
            demand_id: 73,
            demand_category: "Transport",
            clan_id: 8,
            shop_id: 81,
            product_id: 810,
            product_title: "Weekday school driver",
            shop_name: "Awka Family Transport",
            public_shop_path: "/shop/GSN-U-810?product_id=810&clan_id=8",
            reason_codes: ["SAME_COMMUNITY", "LISTED_OFFERING", "AVAILABILITY_UNCONFIRMED", "AREA_COMPATIBLE", "PRODUCT_TITLE_MATCH", "RELEVANCE_RELIABLE"],
          },
          {
            demand_id: 73,
            demand_category: "Transport",
            clan_id: 8,
            shop_id: 81,
            product_id: 820,
            product_title: "School-run transport",
            shop_name: "Awka Family Transport",
            public_shop_path: "/shop/GSN-U-820?product_id=820&clan_id=8",
            reason_codes: ["SAME_COMMUNITY", "LISTED_OFFERING", "AVAILABILITY_UNCONFIRMED", "PRODUCT_DESCRIPTION_MATCH", "RELEVANCE_RELIABLE"],
          },
          {
            demand_id: 73,
            demand_category: "Transport",
            clan_id: 9,
            shop_id: 83,
            product_id: 830,
            product_title: "Morning minibus listing",
            shop_name: "Neighbouring Community Travel",
            public_shop_path: "/shop/GSN-U-830?product_id=830&clan_id=9",
            reason_codes: ["RELAY_BOUNDARY_CROSSED", "LISTED_OFFERING", "AVAILABILITY_UNCONFIRMED", "PRODUCT_DESCRIPTION_MATCH", "RELEVANCE_RELIABLE"],
          },
          {
            demand_id: 73,
            demand_category: "Transport",
            clan_id: 8,
            shop_id: 84,
            product_id: 840,
            product_title: "General services",
            shop_name: "Transport Connections",
            public_shop_path: "/shop/GSN-U-840?product_id=840&clan_id=8",
            reason_codes: ["SAME_COMMUNITY", "LISTED_OFFERING", "AVAILABILITY_UNCONFIRMED", "SHOP_CONTEXT_MATCH", "RELEVANCE_WEAK"],
          },
        ],
      }));
    }
    if (/^\/marketplace\/requests\/\d+\/supply-matches\/\d+\/seller-contact$/.test(path) && method === "GET") {
      apiCalls.sellerContactGets += 1;
      const parts = path.split("/");
      const requestId = Number(parts[3] || 0);
      const productId = Number(parts[5] || 0);
      const shopId = Number(url.searchParams.get("shop_id") || 0);
      if (requestId !== 72 || productId !== 900 || shopId !== 90) {
        return route.fulfill(json({ detail: "DemandBox match contact not found" }, 404));
      }
      return route.fulfill(json({
        demand_id: 72,
        product_id: 900,
        shop_id: 90,
        clan_id: 8,
        demand_title: "Need a freezer repair",
        demand_description: "The freezer stopped cooling yesterday.",
        demand_area: "Onitsha",
        product_title: "Freezer repair visit",
        shop_name: "Onitsha Cooling Repairs",
        seller_user_id: 900,
        seller_is_gsn_member: true,
        whatsapp_number: "+2348012345678",
        contact_available: true,
        public_shop_path: "/shop/GSN-U-900?product_id=900&clan_id=8",
        back_to_request_path: "/app/demand-box?demand_id=72",
        prepared_message: "Hello Onitsha Cooling Repairs.\nI found Freezer repair visit as a possible match for my GSN request:\n\"Need a freezer repair\"\nDetails: The freezer stopped cooling yesterday.\nArea: Onitsha\nIs it available? Please confirm the price and fulfilment arrangement.\nThis message starts a conversation; no agreement has been made yet.",
        boundary_note: "Contact only; no agreement has been made.",
      }));
    }
    if (path === "/protected-trades" && method === "GET") {
      return route.fulfill(json([]));
    }
    if (path === "/withdrawal-destinations/me" && method === "GET") {
      return route.fulfill(json({
        account_name: "Ada Example",
        account_number: "0123456789",
        bank_name: "Example Community Bank",
        currency: "NGN",
      }));
    }
    if (path === "/demand-box/responses/unread-summary" && method === "GET") {
      return route.fulfill(json({
        total_unread: 2,
        requests: [{ marketplace_request_id: 72, unread_count: 2 }],
      }));
    }
    if (/^\/demand-box\/requests\/\d+\/responses\/read$/.test(path) && method === "POST") {
      apiCalls.readAcknowledgements += 1;
      return route.fulfill(json({
        marketplace_request_id: Number(path.split("/")[3] || 0),
        peer_user_id: Number(request.postDataJSON()?.peer_user_id || 0) || null,
        marked_read: 1,
      }));
    }
    if (/^\/demand-box\/requests\/\d+\/responses$/.test(path) && method === "GET") {
      const requestId = Number(path.split("/")[3] || 0);
      return route.fulfill(json(requestId === 72 ? [
        {
          id: 501,
          marketplace_request_id: 72,
          author_user_id: 309,
          recipient_user_id: 216,
          author_display_name: "Chidi Member",
          author_gmfn_id: "GSN-U-309",
          author_profile_image_url: "/src/assets/dashboard/dashboard-trustslip-verification.jpg",
          text: "I can inspect the freezer after 4pm.",
          created_at: "2026-11-07T15:42:00Z",
          read_at: null,
          is_unread: true,
          is_mine: false,
        },
        {
          id: 502,
          marketplace_request_id: 72,
          author_user_id: 216,
          recipient_user_id: 309,
          author_display_name: "Ada Example",
          author_gmfn_id: "GSN-U-216",
          author_profile_image_url: "/src/assets/dashboard/dashboard-trustslip-verification.jpg",
          text: "Thank you. Please message me when you are nearby.",
          created_at: "2026-11-07T15:45:00Z",
          read_at: "2026-11-07T15:46:00Z",
          is_unread: false,
          is_mine: true,
        },
        {
          id: 503,
          marketplace_request_id: 72,
          author_user_id: 410,
          recipient_user_id: 216,
          author_display_name: "Ngozi Member",
          author_gmfn_id: "GSN-U-410",
          author_profile_image_url: null,
          text: "I can also inspect it tomorrow morning.",
          created_at: "2026-11-07T15:49:00Z",
          read_at: null,
          is_unread: true,
          is_mine: false,
        },
      ] : requestId === 73 ? [
        {
          id: 601,
          marketplace_request_id: 73,
          author_user_id: 309,
          recipient_user_id: 216,
          author_display_name: "Chidi Member",
          author_gmfn_id: "GSN-U-309",
          author_profile_image_url: "/src/assets/dashboard/dashboard-trustslip-verification.jpg",
          text: "Is this product still available?",
          created_at: "2026-11-25T14:57:00Z",
          read_at: null,
          is_unread: true,
          is_mine: false,
        },
      ] : []));
    }
    if (/^\/demand-box\/requests\/\d+\/responses$/.test(path) && method === "POST") {
      apiCalls.responsePosts += 1;
      const payload = JSON.parse(request.postData()?.match(/payload_json=([^&]+)/)?.[1] ? decodeURIComponent(request.postData().match(/payload_json=([^&]+)/)[1]) : "{}");
      return route.fulfill(json({
        id: 700 + apiCalls.responsePosts,
        marketplace_request_id: Number(path.split("/")[3] || 0),
        author_user_id: 216,
        recipient_user_id: Number(payload.recipient_user_id || 900),
        author_display_name: "Ada Example",
        author_gmfn_id: "GSN-U-216",
        text: payload.text || "",
        created_at: "2026-11-26T08:00:00Z",
        read_at: null,
        is_unread: false,
        is_mine: true,
        media_attachments: [],
      }));
    }
    if (/^\/demand-box\/audio\/\d+\/delete$/.test(path) && method === "POST") {
      const body = request.postDataJSON();
      if (body?.confirmation !== "DELETE VOICE NOTE") {
        return route.fulfill(json({ detail: "Confirmation required." }, 422));
      }
      return route.fulfill(json({
        attachment_id: 900,
        status: "deleted",
        deleted_at: "2026-11-06T10:00:00Z",
      }));
    }
    if (path === "/marketplace/requests" && method === "GET") {
      const mineOnly = url.searchParams.get("mine_only") === "true";
      const offset = Number(url.searchParams.get("offset") || 0);
      if (offset > 0) return route.fulfill(json([]));
      return route.fulfill(json(mineOnly ? requests.filter((row) => row.is_mine) : requests));
    }
    if (path === "/marketplace/requests" && method === "POST") {
      apiCalls.textRequestPosts += 1;
      const body = request.postDataJSON();
      return route.fulfill(json({ id: 74, user_id: 216, status: "open", is_mine: true, ...body }));
    }
    if (path === "/demand-box/requests/voice" && method === "POST") {
      apiCalls.voiceRequestPosts += 1;
      return route.fulfill(json({
        id: 74,
        user_id: 216,
        title: "Need a taxi",
        category: "Transport",
        status: "open",
        is_mine: true,
        audio_attachment_id: 901,
        audio_duration_seconds: 1,
      }));
    }
    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }
    return route.continue();
  });
}

async function verifyViewport(browser, baseURL, viewport) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true });
  const apiCalls = {
    textRequestPosts: 0,
    voiceRequestPosts: 0,
    sellerContactGets: 0,
    responsePosts: 0,
    readAcknowledgements: 0,
  };
  page.setDefaultTimeout(45000);
  page.on("pageerror", (error) => console.error("Browser page error:", error));
  page.on("console", (message) => {
    if (message.type() === "error") console.error("Browser console error:", message.text());
  });
  await installApiMocks(page, apiCalls);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "local-demand-box-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: async () => ({
          getTracks: () => [{ stop() {} }],
        }),
      },
    });
    class FakeMediaRecorder {
      static isTypeSupported() {
        return true;
      }

      constructor(stream, options = {}) {
        this.stream = stream;
        this.mimeType = options.mimeType || "audio/webm";
        this.state = "inactive";
      }

      start() {
        this.state = "recording";
      }

      stop() {
        this.state = "inactive";
        const data = new Blob(["recorded voice"], { type: this.mimeType });
        this.ondataavailable?.({ data });
        queueMicrotask(() => this.onstop?.());
      }
    }
    window.MediaRecorder = FakeMediaRecorder;
    window.__gsnOpenedSellerChatUrl = "";
    window.open = (url) => {
      window.__gsnOpenedSellerChatUrl = String(url || "");
      return {
      opener: null,
      document: { title: "" },
      location: {
        replace(url) {
          window.__gsnOpenedSellerChatUrl = String(url || "");
        },
      },
      close() {},
      };
    };
  });

  await page.goto(baseURL + "/app/demand-box?queue=open", { waitUntil: "domcontentloaded", timeout: 180000 });
  const frontDoor = page.locator('[data-gsn-demand-front-door="simple"]');
  await frontDoor.waitFor();

  assert(await page.locator('[data-gsn-demand-box-shell="neon"]').isVisible(), "The route-scoped Demand Box neon shell is missing.");
  const bottomRail = page.locator('[data-gmfn-bottom-nav="true"]');
  assert(await bottomRail.isVisible(), "The authenticated bottom navigation is missing from Demand Box.");
  assert(
    (await bottomRail.getByRole("link", { name: "Marketplace", exact: true }).getAttribute("data-bottom-nav-active")) === "true",
    "Marketplace is not active in the Demand Box bottom navigation."
  );
  assert(await frontDoor.locator('[data-gsn-demand-human-hero="market"]').isVisible(), "The human market image is missing.");
  assert(await frontDoor.getByText("People helping people", { exact: true }).isVisible(), "The GSN human-market promise is missing.");
  assert(await frontDoor.getByRole("link", { name: /Blessed Satch family Marketplace/ }).isVisible(), "The selected marketplace identity is missing.");
  const postNeedButton = frontDoor.getByRole("button", { name: "Post a need", exact: true });
  const compactRequestSearch = frontDoor.getByRole("searchbox", { name: "Search requests", exact: true });
  assert(await postNeedButton.isVisible(), "Post a need is missing.");
  assert(await compactRequestSearch.isVisible(), "Compact request search is missing beside Post a need.");
  const postNeedBounds = await postNeedButton.boundingBox();
  const requestSearchBounds = await compactRequestSearch.locator("xpath=..").boundingBox();
  assert(Boolean(postNeedBounds && requestSearchBounds), "Post and search geometry could not be measured.");
  assert(
    Math.abs((postNeedBounds?.y || 0) - (requestSearchBounds?.y || 0)) <= 3,
    "Search requests is not on the same row as Post a need."
  );
  assert(
    (requestSearchBounds?.width || 0) <= (postNeedBounds?.width || 0) * 1.08,
    "Search requests returned as an oversized control."
  );
  assert((await frontDoor.getByRole("button").count()) === 1, "The first surface has extra buttons.");
  assert((await frontDoor.getByRole("link").count()) === 1, "The first surface must contain only the marketplace selector link; Post a need is the sole general-purpose action.");
  assert(!(await page.getByText("Current state", { exact: true }).isVisible().catch(() => false)), "The repeated Current state card returned.");
  assert(!(await page.getByText("Routing readiness", { exact: true }).isVisible().catch(() => false)), "Technical routing copy leaked onto the member surface.");
  assert(!(await page.getByText("Needs attention", { exact: true }).isVisible().catch(() => false)), "The global companion card interrupted the focused Demand Box route.");
  assert((await page.locator('[data-cta-id="demand-box.relay-policy.summary"]').count()) === 0, "Admin relay settings leaked to a member.");

  const queue = page.locator('[data-gsn-demand-queue="simple"]');
  await queue.waitFor();
  const frontScreenshotPath = process.env.GSN_DEMAND_BOX_FRONT_SCREENSHOT_PATH?.trim();
  if (frontScreenshotPath && viewport.width === 390) {
    await page.screenshot({ path: frontScreenshotPath, fullPage: true });
  }
  for (const label of ["All requests 2", "My requests 1"]) {
    assert(await queue.getByRole("button", { name: label, exact: true }).isVisible(), "Missing primary filter: " + label);
  }
  assert(!(await queue.getByRole("button", { name: /Tagged/ }).isVisible().catch(() => false)), "Tagged is exposed before More filters opens.");

  const cards = page.locator('[data-gsn-demand-record]');
  assert((await cards.count()) === 1, "The phone queue should begin with one compact request preview.");
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 0, "A phone request opened before a tap.");
  assert(!(await page.getByText("Product: Weekday school transport", { exact: true }).isVisible()), "Product-enquiry detail leaked from a closed card.");

  const transportCard = cards.filter({ hasText: "Need school transport" });
  assert((await transportCard.getAttribute("data-gsn-demand-request-preview")) === "message-first", "The closed request is not using the message-first preview.");
  assert((await transportCard.getAttribute("data-gsn-demand-preview-style")) === "neon-paper", "The approved neon request-paper preview is missing.");
  assert(await transportCard.getByText("Open request", { exact: true }).isVisible(), "The request status is missing from the closed preview.");
  assert(await transportCard.getByText("Need school transport", { exact: true }).isVisible(), "The request message is missing from the closed preview.");
  await transportCard.getByRole("button", { name: "Open request", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "Opening a request did not expose exactly one card.");
  const transportHero = transportCard.locator('[data-gsn-demand-request-hero="request"]');
  assert(await transportHero.isVisible(), "Opened request hero is missing.");
  assert((await transportCard.locator('[data-gsn-demand-product-context]').count()) === 0, "The duplicate Product Enquiry card returned below the request hero.");
  const mergedProductEnquiry = transportHero.locator('[data-gsn-demand-product-enquiry-summary="merged"]');
  assert(await mergedProductEnquiry.isVisible(), "The product enquiry was not merged into the opened request card.");
  assert(await mergedProductEnquiry.getByText("Awka Family Transport", { exact: true }).isVisible(), "The concise merged Shop identity is missing.");
  assert(await mergedProductEnquiry.getByText("Listed price GBP 15", { exact: true }).isVisible(), "The concise merged listed price is missing.");
  assert((await transportCard.locator('[data-gsn-demand-primary-message="true"]').count()) === 0, "The verbose product-enquiry message returned as a second block.");
  assert(!(await page.getByText("Please confirm availability, final price and collection or delivery arrangements.", { exact: true }).isVisible().catch(() => false)), "Verbose generated product guidance remained exposed.");
  const transportConversations = transportCard.locator('[data-gsn-demand-conversations="integrated"]');
  const transportConversationZone = transportConversations.locator('[data-gsn-demand-conversation-zone="primary"]');
  const transportPrivateReplies = transportConversationZone.locator('[data-gsn-demand-private-replies="true"]');
  await mergedProductEnquiry.getByRole("button", { name: "Send message", exact: true }).click();
  await transportPrivateReplies.waitFor();
  assert(await transportPrivateReplies.getByText("Is this product still available?", { exact: true }).isVisible(), "Send message did not open the protected buyer-seller thread.");
  await transportConversations.locator("summary").click();
  const matchPanel = transportCard.locator('[data-gsn-demand-supply-intelligence="true"]');
  await matchPanel.waitFor();
  const matchBeforeConversation = await matchPanel.evaluate((match, conversation) =>
    Boolean(conversation && (match.compareDocumentPosition(conversation) & Node.DOCUMENT_POSITION_FOLLOWING))
  , await transportConversations.elementHandle());
  assert(matchBeforeConversation, "Possible matches must appear before the integrated conversation.");
  await transportConversations.locator("summary").click();
  await transportPrivateReplies.waitFor();
  const quickReplies = transportPrivateReplies.locator('[data-gsn-demand-preset-messages="collapsed"]');
  assert(await quickReplies.isVisible(), "The collapsed Preset messages control is missing for an authorised responder.");
  await quickReplies.locator("summary").click();
  await quickReplies.getByRole("button", { name: "I can help.", exact: true }).click();
  const responderText = transportPrivateReplies.getByPlaceholder("Message...");
  assert((await responderText.inputValue()) === "I can help.", "A preset message did not populate ordinary editable text.");
  const responderTradeSteps = transportPrivateReplies.locator('[data-gsn-demand-trade-steps="collapsed"]');
  assert(await responderTradeSteps.isVisible(), "The compact Trade steps control is missing beside the conversation.");
  await responderTradeSteps.locator("summary").click();
  await responderTradeSteps.getByRole("button", { name: "Add account details", exact: true }).click();
  assert((await responderText.inputValue()).includes("Account number / wallet: 0123456789"), "Saved account details were not prepared in the editable private-message draft.");
  assert(apiCalls.responsePosts === 0, "Preparing account details sent a message without review.");
  assert(await transportPrivateReplies.locator('[data-gsn-microphone-icon="true"]').isVisible(), "The voice-note action is not using a microphone icon.");
  await transportConversations.locator("summary").click();
  await matchPanel.waitFor();
  await matchPanel.locator("summary").click();
  const matchRows = matchPanel.locator('[data-gsn-demand-reliable-match="true"]');
  assert((await matchRows.count()) === 2, "DemandBox did not collapse repeated products from the same shop into one initial suggestion.");
  assert(await matchPanel.getByText("Check each listing before agreeing.", { exact: true }).isVisible(), "The truthful match boundary is missing.");
  assert((await matchPanel.getByText("School-run transport", { exact: true }).count()) === 0, "A second product from the same shop was rendered as a duplicate shop match.");
  assert(await matchPanel.getByText("Same community, area mentioned; availability not confirmed.", { exact: true }).isVisible(), "The same-community evidence sentence is missing.");
  assert(await matchPanel.getByText("Permitted wider search; availability not confirmed.", { exact: true }).isVisible(), "The governed wider-search evidence sentence is missing.");
  const matchLinks = matchPanel.getByRole("link", { name: /View Shop:/ });
  assert((await matchLinks.count()) === 2, "The compact listing destinations do not represent one action per unique shop.");
  assert((await matchPanel.getByRole("button", { name: /matches/i }).count()) === 0, "A redundant match-expansion step returned.");
  const listingHrefs = await matchLinks.evaluateAll((links) => links.map((link) => link.getAttribute("href") || ""));
  assert(
    JSON.stringify(listingHrefs) === JSON.stringify([
      "/shop/GSN-U-810?product_id=810&clan_id=8",
      "/shop/GSN-U-830?product_id=830&clan_id=9",
    ]),
    "An optional Shop action changed its existing listing destination or non-owner source-context boundary."
  );
  const matchGeometry = await matchPanel.evaluate((node) => {
    const rows = Array.from(node.querySelectorAll('[data-gsn-demand-match-row="compact"]'));
    const actions = Array.from(node.querySelectorAll('[data-gsn-demand-match-action="compact"]'));
    const textNodes = Array.from(node.querySelectorAll(
      '[data-gsn-demand-match-title], [data-gsn-demand-match-shop], [data-gsn-demand-match-evidence]'
    ));
    return {
      noOverflow: node.scrollWidth <= node.clientWidth + 1,
      width: Math.round(node.getBoundingClientRect().width),
      height: Math.round(node.getBoundingClientRect().height),
      rowHeights: rows.map((row) => Math.round(row.getBoundingClientRect().height)),
      textWidths: textNodes.map((item) => Math.round(item.getBoundingClientRect().width)),
      actionWidths: actions.map((action) => Math.round(action.getBoundingClientRect().width)),
      actionHeights: actions.map((action) => Math.round(action.getBoundingClientRect().height)),
      textFits: textNodes.every((item) =>
        item.scrollWidth <= item.clientWidth + 1 && item.scrollHeight <= item.clientHeight + 1
      ),
    };
  });
  assert(matchGeometry.noOverflow && matchGeometry.width <= viewport.width - 24, "The compact match panel overflows the phone viewport.");
  assert(matchGeometry.height <= 560, "The compact match panel exceeds the approved mobile density.");
  assert(
    matchGeometry.rowHeights.every((height) => height >= 96 && height <= 145),
    "A match row exceeded the compact target plus bounded natural text growth: " + matchGeometry.rowHeights.join("/")
  );
  assert(
    matchGeometry.textWidths.every((width) => width >= 180),
    "A match label collapsed into a one-character column: " + matchGeometry.textWidths.join("/")
  );
  assert(
    matchGeometry.actionWidths.every((width) => width < 90) &&
      matchGeometry.actionHeights.every((height) => height >= 44),
    "A match destination is no longer a compact, accessible action."
  );
  assert(matchGeometry.textFits, "Normal match text is clipped.");
  const requestTitleFont = await transportCard
    .getByText("Need school transport", { exact: true })
    .first()
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  const matchTitleFont = await matchPanel
    .locator('[data-gsn-demand-match-title="true"]')
    .first()
    .evaluate((node) => Number.parseFloat(getComputedStyle(node).fontSize));
  assert(requestTitleFont >= matchTitleFont + 4, "The match rows visually overtake the original request.");
  console.log(
    "DemandBox compact match panel at " + viewport.width + "px: " +
    matchGeometry.height + "px high; rows " + matchGeometry.rowHeights.join("/") + "px (baseline about 817px)."
  );

  const matchScreenshotPath = process.env.GSN_DEMAND_BOX_MATCH_SCREENSHOT_PATH?.trim();
  if (matchScreenshotPath && viewport.width === 390) {
    await matchPanel.screenshot({ path: matchScreenshotPath, scale: "css" });
  }
  const matchFullPageScreenshotPath = process.env.GSN_DEMAND_BOX_MATCH_FULL_PAGE_SCREENSHOT_PATH?.trim();
  if (matchFullPageScreenshotPath && viewport.width === 390) {
    const captureState = await page.evaluate(() => {
      const shell = document.querySelector('[data-gmfn-shell-mode="compact"]');
      const scrollRoot = document.querySelector('[data-gmfn-mobile-scroll-root="true"]');
      const bottomNav = document.querySelector('[data-gmfn-bottom-nav="true"]');
      if (!(shell instanceof HTMLElement) || !(scrollRoot instanceof HTMLElement)) {
        throw new Error("The authenticated mobile scroll surface is unavailable for full-page evidence.");
      }
      const state = {
        shellStyle: shell.getAttribute("style") || "",
        scrollStyle: scrollRoot.getAttribute("style") || "",
        bottomStyle: bottomNav instanceof HTMLElement ? bottomNav.getAttribute("style") || "" : "",
        scrollTop: scrollRoot.scrollTop,
      };
      scrollRoot.scrollTop = 0;
      const contentHeight = scrollRoot.scrollHeight;
      shell.style.height = "auto";
      shell.style.minHeight = "0";
      shell.style.overflow = "visible";
      scrollRoot.style.height = contentHeight + "px";
      scrollRoot.style.minHeight = contentHeight + "px";
      scrollRoot.style.flex = "0 0 auto";
      scrollRoot.style.overflow = "visible";
      if (bottomNav instanceof HTMLElement) {
        bottomNav.style.position = "static";
      }
      return state;
    });
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    await page.screenshot({ path: matchFullPageScreenshotPath, fullPage: true, scale: "css" });
    await page.evaluate((state) => {
      const shell = document.querySelector('[data-gmfn-shell-mode="compact"]');
      const scrollRoot = document.querySelector('[data-gmfn-mobile-scroll-root="true"]');
      const bottomNav = document.querySelector('[data-gmfn-bottom-nav="true"]');
      if (shell instanceof HTMLElement) shell.setAttribute("style", state.shellStyle);
      if (scrollRoot instanceof HTMLElement) {
        scrollRoot.setAttribute("style", state.scrollStyle);
        scrollRoot.scrollTop = state.scrollTop;
      }
      if (bottomNav instanceof HTMLElement) bottomNav.setAttribute("style", state.bottomStyle);
    }, captureState);
  }

  const firstMatchRow = matchRows.first();
  const originalMatchCopy = await firstMatchRow.evaluate((row) => ({
    title: row.querySelector('[data-gsn-demand-match-title]')?.textContent || "",
    shop: row.querySelector('[data-gsn-demand-match-shop]')?.textContent || "",
  }));
  await firstMatchRow.evaluate((row) => {
    const title = row.querySelector('[data-gsn-demand-match-title]');
    const shop = row.querySelector('[data-gsn-demand-match-shop]');
    if (title) title.textContent = "Reliable weekday school transport for early-morning routes and several pickup points";
    if (shop) shop.textContent = "Shop: Awka Family Transport and School Run Services Cooperative";
  });
  const enlargedMatchStyle = await page.addStyleTag({
    content: [
      '[data-gsn-demand-match-title="true"] { font-size: 18px !important; }',
      '[data-gsn-demand-match-shop="true"] { font-size: 16px !important; }',
      '[data-gsn-demand-match-evidence="true"] { font-size: 15px !important; }',
    ].join("\n"),
  });
  const enlargedGeometry = await firstMatchRow.evaluate((row) => {
    const textNodes = Array.from(row.querySelectorAll(
      '[data-gsn-demand-match-title], [data-gsn-demand-match-shop], [data-gsn-demand-match-evidence]'
    ));
    return {
      noOverflow: row.scrollWidth <= row.clientWidth + 1,
      height: Math.round(row.getBoundingClientRect().height),
      textFits: textNodes.every((item) =>
        item.scrollWidth <= item.clientWidth + 1 && item.scrollHeight <= item.clientHeight + 1
      ),
    };
  });
  assert(enlargedGeometry.noOverflow, "A long enlarged match row overflows horizontally.");
  assert(enlargedGeometry.textFits, "Long or enlarged match wording is clipped.");
  assert(enlargedGeometry.height > matchGeometry.rowHeights[0], "The compact row did not grow naturally for enlarged text.");
  await enlargedMatchStyle.evaluate((style) => style.remove());
  await firstMatchRow.evaluate((row, originalCopy) => {
    const title = row.querySelector('[data-gsn-demand-match-title]');
    const shop = row.querySelector('[data-gsn-demand-match-shop]');
    if (title) title.textContent = originalCopy.title;
    if (shop) shop.textContent = originalCopy.shop;
  }, originalMatchCopy);
  assert(!(await page.getByText("Source: DemandBox", { exact: true }).isVisible()), "Technical request details opened before the user asked.");
  assert((await transportCard.getByRole("button", { name: "Reply privately", exact: true }).count()) === 0, "The obsolete second reply-opening action returned.");

  await page.getByRole("button", { name: "View more needs", exact: true }).click();
  assert((await cards.count()) === 2, "View more needs did not reveal the remaining request preview.");
  const freezerCard = cards.filter({ hasText: "Need a freezer repair" });
  await freezerCard.getByRole("button", { name: "Open request", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "More than one phone request stayed open.");
  assert(!(await mergedProductEnquiry.isVisible().catch(() => false)), "Opening the next card did not close the merged product enquiry.");

  const ownerHero = freezerCard.locator('[data-gsn-demand-request-hero="request"]');
  await ownerHero.waitFor();
  assert(await freezerCard.getByText("Open request", { exact: true }).isVisible(), "The truthful request status is missing from the visual hero.");
  assert(await freezerCard.getByText("Need a freezer repair", { exact: true }).isVisible(), "The real request title is missing from the visual hero.");
  const ownerMatchPanel = freezerCard.locator('[data-gsn-demand-supply-intelligence="true"]');
  await ownerMatchPanel.waitFor();
  await ownerMatchPanel.locator("summary").click();
  assert((await ownerMatchPanel.locator('[data-gsn-demand-reliable-match="true"]').count()) === 1, "The requester match is missing.");
  const requesterDescriptionCard = ownerMatchPanel.locator('[data-gsn-demand-match-description-card="true"]');
  const requesterViewShop = requesterDescriptionCard.getByRole("link", { name: /View Shop:/ });
  assert(await requesterViewShop.isVisible(), "View shop is missing from the requester product description card.");
  assert(await ownerMatchPanel.getByRole("button", { name: "Ask seller", exact: true }).isVisible(), "Ask Seller is missing.");
  await ownerMatchPanel.getByRole("button", { name: "Ask seller", exact: true }).click();
  assert(apiCalls.sellerContactGets === 1, "Ask seller did not use the authenticated validated handoff endpoint exactly once.");
  const contactResult = ownerMatchPanel.locator('[data-gsn-demand-seller-contact-result="prepared"]');
  await contactResult.waitFor();
  assert(await contactResult.locator('[data-gsn-demand-contact-channel="gsn-primary"]').isVisible(), "GSN chat is not presented as the primary seller-contact route.");
  assert(await contactResult.getByText("GSN conversation (recommended)", { exact: true }).isVisible(), "GSN chat is not the primary seller-contact route.");
  const whatsappAlternative = contactResult.locator('[data-gsn-demand-contact-channel="whatsapp-alternative"]');
  const privateConversation = contactResult.locator('[data-gsn-demand-private-replies="true"]');
  assert(await whatsappAlternative.isVisible(), "WhatsApp is not contained in Ask Seller as the alternative route.");
  assert(await privateConversation.isVisible(), "The GSN conversation is missing from Ask Seller.");
  assert((await contactResult.locator('[data-gsn-demand-protected-trade-position="after-conversation"]').count()) === 0, "A duplicate Protected Trade button returned outside the conversation.");
  const tradeSteps = privateConversation.locator('[data-gsn-demand-trade-steps="collapsed"]');
  assert(await tradeSteps.isVisible(), "The protected progression is missing from the compact Trade steps control.");
  await tradeSteps.locator("summary").click();
  const startProtectedTrade = tradeSteps.getByRole("link", { name: "Start Protected Trade", exact: true });
  assert(await startProtectedTrade.isVisible(), "The requester cannot start the associated Protected Trade from the conversation.");
  const startTradeHref = await startProtectedTrade.getAttribute("href");
  assert(startTradeHref?.includes("source_demand_id=72") && startTradeHref?.includes("source_match_product_id=900") && startTradeHref?.includes("source_match_shop_id=90"), "The Protected Trade handoff lost its demand, product, or shop association.");
  assert((await contactResult.getByRole("link", { name: "View shop", exact: true }).count()) === 0, "View shop is duplicated inside Ask Seller.");
  const sellerJourneyOrder = await contactResult.evaluate((container) => {
    const whatsapp = container.querySelector('[data-gsn-demand-contact-channel="whatsapp-alternative"]');
    const conversation = container.querySelector('[data-gsn-demand-private-replies="true"]');
    if (!whatsapp || !conversation) return null;
    return {
      whatsappBeforeConversation: Boolean(whatsapp.compareDocumentPosition(conversation) & Node.DOCUMENT_POSITION_FOLLOWING),
    };
  });
  assert(sellerJourneyOrder?.whatsappBeforeConversation, "WhatsApp must remain the alternative channel choice before the GSN conversation.");
  await contactResult.getByRole("button", { name: "Continue on WhatsApp (Alternative)", exact: true }).click();
  await page.waitForFunction(() => Boolean(window.__gsnOpenedSellerChatUrl));
  const decodedSellerChatUrl = decodeURIComponent(await page.evaluate(() => window.__gsnOpenedSellerChatUrl));
  assert(decodedSellerChatUrl.includes("Need a freezer repair"), "The original request was lost from the prepared seller message.");
  assert(decodedSellerChatUrl.includes("Freezer repair visit"), "The matched product was lost from the prepared seller message.");
  await ownerMatchPanel.getByRole("button", { name: "Ask seller", exact: true }).click();
  assert(!(await contactResult.isVisible().catch(() => false)), "Closing Ask Seller did not restore the single request conversation surface.");
  assert(await ownerHero.locator('[data-gsn-demand-sender-identity="true"] img').isVisible(), "The opted-in sender portrait is missing from the opened request.");
  const compactRequestIcon = ownerHero.locator('[data-gsn-demand-request-icon="compact"]');
  assert(await compactRequestIcon.isVisible(), "The compact generic request icon is missing.");
  const compactIconGeometry = await compactRequestIcon.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { width: Math.round(rect.width), height: Math.round(rect.height) };
  });
  assert(compactIconGeometry.width <= 44 && compactIconGeometry.height <= 44, "The request icon is dominating the request message again.");
  const heroBackground = await ownerHero.evaluate((node) => getComputedStyle(node).backgroundImage);
  assert(!heroBackground.includes("url("), "The category-neutral request hero unexpectedly contains a photo.");

  assert((await freezerCard.locator('[data-gsn-demand-detail-tabs="compact"]').count()) === 0, "The standalone compact Privacy or Details card returned.");
  assert((await freezerCard.getByRole("button", { name: /^(Privacy|Details)$/ }).count()) === 0, "The standalone Privacy or Details button returned.");
  assert(await freezerCard.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible(), "The complete compact request message is missing.");
  const compactRequestDetails = freezerCard.locator('[data-gsn-demand-request-details="compact"]');
  assert(!(await compactRequestDetails.isVisible().catch(() => false)), "Privacy metadata escaped the closed Request options disclosure.");
  const ownerConversations = freezerCard.locator('[data-gsn-demand-conversations="integrated"]');
  await ownerConversations.locator("summary").click();
  const ownerConversationZone = ownerConversations.locator('[data-gsn-demand-conversation-zone="primary"]');
  assert(await ownerConversationZone.isVisible(), "The owner conversation zone is not in place.");
  const ownerPrivateReplies = ownerConversationZone.locator('[data-gsn-demand-private-replies="true"]');
  assert((await ownerPrivateReplies.getAttribute("data-gsn-demand-conversation-access")) === "available", "Existing private conversation access was not established.");
  assert(await ownerPrivateReplies.locator('[data-gsn-demand-privacy-notice="compact"]').isVisible(), "The compact private-conversation boundary is missing.");
  assert(await ownerPrivateReplies.isVisible(), "Existing private replies are not visible immediately.");
  assert((await freezerCard.getByRole("button", { name: "Listen & reply", exact: true }).count()) === 0, "The obsolete second listen-and-reply action returned.");
  const threadList = ownerConversationZone.locator('[data-gsn-demand-thread-list="true"]');
  await threadList.waitFor();
  const threadRows = threadList.locator('[data-gsn-demand-thread-row="true"]');
  assert((await threadRows.count()) === 2, "Separate private responder threads are not grouped into compact rows.");
  const conversation = ownerConversationZone.locator('[data-gsn-demand-conversation="whatsapp-like"]');
  assert(await ownerConversationZone.locator('[data-gsn-demand-conversation-picker="true"]').isVisible(), "The owner must choose a private thread before its conversation opens.");
  assert(!(await conversation.isVisible().catch(() => false)), "A responder conversation opened before its row was selected.");
  assert(await threadRows.first().locator('[data-gsn-demand-thread-avatar]').isVisible(), "The responder portrait or privacy-safe initials avatar is missing from the thread row.");
  await threadList.getByRole("button", { name: /Conversation with Ngozi Member/ }).click();
  await conversation.getByText("I can also inspect it tomorrow morning.", { exact: true }).waitFor();
  assert(await conversation.locator('[data-gsn-demand-message-avatar="initials"]').isVisible(), "The privacy-safe initials avatar is missing when no portrait was shared.");
  assert((await conversation.getByText("I can inspect the freezer after 4pm.", { exact: true }).count()) === 0, "The first responder's exchange remained visible after switching conversations.");
  await threadList.getByRole("button", { name: /Conversation with Chidi Member/ }).click();
  await conversation.getByText("I can inspect the freezer after 4pm.", { exact: true }).waitFor();
  assert((await conversation.locator('[data-gsn-demand-conversation-context="request"]').count()) === 0, "Repeated request context returned inside the conversation.");
  assert(await conversation.locator('[data-gsn-demand-message-direction="incoming"]').isVisible(), "The incoming reply bubble is missing.");
  assert(await conversation.locator('[data-gsn-demand-message-direction="outgoing"]').isVisible(), "The outgoing reply bubble is missing.");
  assert((await conversation.locator('[data-gsn-demand-message-avatar="portrait"]').count()) === 2, "Consented sender portraits are missing from the conversation trail.");
  const conversationGeometry = await conversation.evaluate((node) => {
    const incoming = node.querySelector('[data-gsn-demand-message-direction="incoming"]');
    const outgoing = node.querySelector('[data-gsn-demand-message-direction="outgoing"]');
    const incomingAvatar = incoming?.firstElementChild?.getBoundingClientRect();
    const incomingBubble = incoming?.lastElementChild?.getBoundingClientRect();
    const outgoingAvatar = outgoing?.firstElementChild?.getBoundingClientRect();
    const outgoingBubble = outgoing?.lastElementChild?.getBoundingClientRect();
    return {
      alternating: Boolean(
        incomingAvatar &&
        incomingBubble &&
        outgoingAvatar &&
        outgoingBubble &&
        incomingAvatar.right < incomingBubble.left &&
        outgoingAvatar.left > outgoingBubble.right
      ),
      noOverflow: node.scrollWidth <= node.clientWidth + 1,
    };
  });
  assert(conversationGeometry.alternating, "The reply trail does not alternate like a familiar chat conversation.");
  assert(conversationGeometry.noOverflow, "The reply trail overflows horizontally.");
  const voiceNoteButton = ownerConversationZone.getByRole("button", { name: "Record voice note", exact: true });
  assert(await voiceNoteButton.isVisible(), "The private reply composer lacks the optional voice-note continuation action.");
  await threadList.getByRole("button", { name: /Conversation with Chidi Member/ }).click();
  assert(await ownerConversationZone.locator('[data-gsn-demand-conversation-picker="true"]').isVisible(), "The selected responder thread did not close when selected again.");
  assert(!(await conversation.isVisible().catch(() => false)), "The responder conversation remained open after toggling its row closed.");
  await threadList.getByRole("button", { name: /Conversation with Chidi Member/ }).click();
  await conversation.getByText("I can inspect the freezer after 4pm.", { exact: true }).waitFor();
  assert(
    await ownerConversationZone.getByText("Only the requester and this member can read or play it.", { exact: false }).isVisible(),
    "The private conversation boundary is missing."
  );
  await ownerConversations.locator("summary").click();

  const deleteVoiceButton = freezerCard.getByRole("button", {
    name: "Delete",
    exact: true,
  });
  assert(await deleteVoiceButton.isVisible(), "The sender voice-delete action is missing.");
  await deleteVoiceButton.click();
  const deleteConfirmation = freezerCard.locator(
    '[data-gsn-demand-voice-delete-confirmation="true"]'
  );
  assert(await deleteConfirmation.isVisible(), "Voice deletion did not require confirmation.");
  assert(
    await deleteConfirmation
      .getByText("This cannot be undone.", { exact: false })
      .isVisible(),
    "The permanent deletion warning is missing."
  );
  await deleteConfirmation
    .getByRole("button", { name: "Keep voice note", exact: true })
    .click();
  assert(
    !(await deleteConfirmation.isVisible().catch(() => false)),
    "Keeping the voice note did not close confirmation."
  );
  await deleteVoiceButton.click();
  await deleteConfirmation
    .getByRole("button", { name: "Delete permanently", exact: true })
    .click();
  const removedVoice = freezerCard.locator('[data-gsn-demand-voice-deleted="true"]');
  await removedVoice.waitFor();
  assert(
    await removedVoice.isVisible(),
    "Permanent deletion did not leave the retained-history tombstone."
  );
  const removedVoiceGeometry = await removedVoice.evaluate((node) => {
    const wave = node.querySelector('[data-gsn-audio-wave-bars="true"]');
    const cardBox = node.getBoundingClientRect();
    const waveBox = wave?.getBoundingClientRect();
    return {
      width: waveBox ? Math.round(waveBox.width) : 0,
      height: waveBox ? Math.round(waveBox.height) : 0,
      centreOffset: waveBox
        ? Math.round(Math.abs((waveBox.left + waveBox.width / 2) - (cardBox.left + cardBox.width / 2)))
        : null,
    };
  });
  assert(
    removedVoiceGeometry.width >= 180 &&
      removedVoiceGeometry.height >= 44 &&
      removedVoiceGeometry.centreOffset !== null &&
      removedVoiceGeometry.centreOffset <= 3,
    "Demand Box removed-audio waveform is not the centred hero visual: " + JSON.stringify(removedVoiceGeometry)
  );

  const expandedSearch = freezerCard.locator('[data-gsn-demand-expand-search="true"]');
  assert((await expandedSearch.count()) === 0, "A no-match expansion card competed with a reliable visible match.");

  const requestOptions = freezerCard.locator('[data-gsn-demand-request-options="compact"]');
  assert(await requestOptions.isVisible(), "Compact Request options are missing.");
  await requestOptions.locator("summary").click();
  assert(await compactRequestDetails.isVisible(), "Privacy metadata is missing from Request options.");
  assert(await compactRequestDetails.getByText("Visible in this community.", { exact: false }).isVisible(), "The community visibility boundary is missing from Request options.");
  assert((await compactRequestDetails.getByText(/WhatsApp/i).count()) === 0, "Request options privacy metadata contains WhatsApp communication state.");
  assert((await requestOptions.getByRole("button").count()) === 3, "Request options must contain three lifecycle actions.");
  for (const label of ["Fulfilled", "Cancel", "Copy request"]) {
    assert(await requestOptions.getByRole("button", { name: label, exact: true }).isVisible(), "Missing compact request option: " + label);
  }

  const focusGeometry = await freezerCard.evaluate((card) => {
    const hero = card.querySelector('[data-gsn-demand-request-hero="request"]');
    const options = card.querySelector('[data-gsn-demand-request-options="compact"]');
    const actionRects = options ? Array.from(options.querySelectorAll("button")).map((node) => node.getBoundingClientRect()) : [];
    return {
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      actionCount: actionRects.length,
      oneActionRow: actionRects.length > 0 && actionRects.every((rect) => Math.abs(rect.top - actionRects[0].top) <= 1),
      noOverflow: card.scrollWidth <= card.clientWidth + 1,
    };
  });
  assert(
    focusGeometry.heroHeight >= 120 && focusGeometry.heroHeight <= 260,
    "The cohesive request header is outside the sender-identity phone boundary: " + focusGeometry.heroHeight
  );
  assert(focusGeometry.actionCount === 3 && focusGeometry.oneActionRow, "The three owner actions did not remain in one compact row.");
  assert(focusGeometry.noOverflow, "The opened request card overflows horizontally.");

  const screenshotPath = process.env.GSN_DEMAND_BOX_SCREENSHOT_PATH?.trim();
  if (screenshotPath && viewport.width === 390) {
    await freezerCard.screenshot({ path: screenshotPath });
  }

  await page.locator('[data-cta-id="demand-box.more-filters"]').click();
  for (const label of ["Tagged 1", "Questions 0", "Urgent 1", "Need types 2"]) {
    assert(await queue.getByRole("button", { name: label, exact: true }).isVisible(), "Missing governed filter: " + label);
  }

  await page.getByRole("button", { name: "Post a need", exact: true }).click();
  const form = page.locator('[data-gsn-demand-create-form="simple"]');
  const createCard = page.locator('[data-gsn-demand-create-card="premium"]');
  const createShell = page.locator('[data-gsn-demand-create-shell="reference"]');
  const createHero = createCard.locator('[data-gsn-demand-create-hero="text-first"]');
  const communityContext = createCard.locator('[data-gsn-demand-community-context="selected"]');
  await form.waitFor();
  assert(await createCard.isVisible(), "The premium create card is missing.");
  assert(await createShell.isVisible(), "The approved DemandBox create background is missing.");
  assert(await createHero.isVisible(), "The text-first create hero is missing.");
  assert((await createHero.locator('[data-gsn-3d-icon]').count()) === 0, "The decorative hero icon returned.");
  assert(await createCard.getByText("Write or record.", { exact: true }).isVisible(), "The create task guidance is missing.");
  assert(await communityContext.getByText("Blessed Satch family Marketplace", { exact: true }).first().isVisible(), "The selected community context is missing.");
  assert(!(await communityContext.getByText("Blessed Satch family Marketplace Marketplace", { exact: true }).isVisible().catch(() => false)), "Marketplace is duplicated in the selected community name.");
  const createVisuals = await createShell.evaluate((shell) => {
    const card = shell.querySelector('[data-gsn-demand-create-card="premium"]');
    const shellStyle = getComputedStyle(shell);
    const cardStyle = card ? getComputedStyle(card) : null;
    return {
      shellBackground: shellStyle.backgroundImage,
      cardBackground: cardStyle?.backgroundImage || "",
      cardShadow: cardStyle?.boxShadow || "",
    };
  });
  assert(createVisuals.shellBackground.includes("radial-gradient"), "The approved blue-purple DemandBox background is missing.");
  assert(createVisuals.cardBackground.includes("linear-gradient"), "The approved light DemandBox card is missing.");
  assert(createVisuals.cardShadow !== "none", "The approved DemandBox card glow is missing.");
  const categorySelect = form.getByLabel("Need type");
  assert(await categorySelect.isVisible(), "Need type selector is missing.");
  assert((await categorySelect.locator("option").count()) === 10, "Need type options are incomplete.");
  assert(await page.getByRole("button", { name: "Tap to record a voice note", exact: true }).isVisible(), "Voice recorder is missing.");
  const recorderWaveform = form.locator('[data-gsn-voice-recorder-waveform="hero"]');
  assert(await recorderWaveform.isVisible(), "The DemandBox composer hero waveform is missing.");
  const recorderWaveformGeometry = await recorderWaveform.evaluate((surface) => {
    const bars = surface.querySelector('[data-gsn-audio-wave-bars="true"]');
    const surfaceRect = surface.getBoundingClientRect();
    const barsRect = bars?.getBoundingClientRect();
    return {
      state: surface.getAttribute("data-gsn-voice-recorder-waveform-state"),
      barsWidth: Math.round(barsRect?.width || 0),
      barsHeight: Math.round(barsRect?.height || 0),
      centerOffset: barsRect
        ? Math.round(Math.abs((barsRect.left + barsRect.width / 2) - (surfaceRect.left + surfaceRect.width / 2)))
        : 999,
    };
  });
  assert(recorderWaveformGeometry.state === "ready", "The DemandBox composer did not begin in its ready state.");
  assert(recorderWaveformGeometry.barsWidth >= 180, "The DemandBox composer waveform is not visually dominant.");
  assert(recorderWaveformGeometry.barsHeight >= 44, "The DemandBox composer waveform is too short.");
  assert(recorderWaveformGeometry.centerOffset <= 3, "The DemandBox composer waveform is not centred.");
  assert(await page.getByLabel("Write your need").isVisible(), "Written need field is missing.");
  assert(await page.getByLabel("Area").isVisible(), "Area field is missing.");
  assert(await page.getByRole("button", { name: "Community", exact: true }).isVisible(), "Community visibility choice is missing.");
  assert(await page.getByRole("button", { name: "One person", exact: true }).isVisible(), "One person visibility choice is missing.");
  assert((await page.getByRole("button", { name: "Community", exact: true }).getAttribute("aria-pressed")) === "true", "Community visibility is not visibly selected by default.");
  const textOnlyFieldLabels = form.locator('[data-gsn-demand-field-label="text-only"]');
  assert((await textOnlyFieldLabels.count()) === 4, "The four create-form headings are not text-only.");
  assert((await textOnlyFieldLabels.locator('[data-gsn-3d-icon]').count()) === 0, "A decorative field-heading icon returned.");
  assert((await page.locator('[data-cta-id="demand-box.more-options"] [data-gsn-3d-icon]').count()) === 0, "The More options heading icon returned.");
  const createScreenshotPath = process.env.GSN_DEMAND_BOX_CREATE_SCREENSHOT_PATH?.trim();
  if (createScreenshotPath && viewport.width === 390) {
    await createShell.screenshot({ path: createScreenshotPath });
  }
  assert(await page.getByLabel("Write your need").isVisible(), "Written details field is missing from the main composer.");
  await page.locator('[data-cta-id="demand-box.more-options"]').click();
  assert(await page.getByLabel("Write your need").isVisible(), "Written details disappeared after opening More options.");
  assert(await page.getByLabel("Urgency").isVisible(), "Urgency is not reachable.");
  assert(await page.getByLabel("Payment").isVisible(), "Payment preference is not reachable.");
  assert(await page.getByLabel("Proof needed").isVisible(), "Proof preference is not reachable.");
  assert(await page.getByLabel("Hours open").isVisible(), "Expiry is not reachable.");
  assert(await page.getByText("Include my current profile photo beside this request.", { exact: false }).isVisible(), "Sender-photo control is not reachable.");
  assert(await page.locator('[data-gsn-demand-photo-consent="true"] input[type="checkbox"]').isChecked(), "A saved request portrait is not included by default.");
  await page.getByRole("button", { name: "One person", exact: true }).click();
  assert((await page.getByRole("button", { name: "One person", exact: true }).getAttribute("aria-pressed")) === "true", "One-person visibility did not become visibly selected.");
  assert(await page.getByLabel("Choose person").isVisible(), "The private person chooser did not appear.");

  const createGeometry = await createCard.evaluate((card) => ({
    noOverflow: card.scrollWidth <= card.clientWidth + 1,
    width: Math.round(card.getBoundingClientRect().width),
  }));
  assert(createGeometry.noOverflow, "The premium create card overflows horizontally.");
  assert(createGeometry.width <= viewport.width - 24, "The premium create card is too wide for the phone viewport.");

  await page.getByRole("button", { name: "Community", exact: true }).click();
  await categorySelect.selectOption("Transport");
  await page.getByLabel("Write your need").fill("Need a taxi");
  await page.getByRole("button", { name: "Tap to record a voice note", exact: true }).click();
  assert(
    (await recorderWaveform.getAttribute("data-gsn-voice-recorder-waveform-state")) === "recording",
    "The composer waveform did not visibly enter its recording state."
  );
  const postButton = page.locator('[data-cta-id="demand-box.post"]');
  assert(await postButton.isDisabled(), "Post need stayed enabled while voice recording was active.");
  assert(
    await postButton.getByText("Stop recording first", { exact: true }).isVisible(),
    "The active recording did not explain why posting was locked."
  );
  await page.getByRole("button", { name: "Stop recording", exact: true }).click();
  await page.getByText("Voice message ready", { exact: true }).waitFor();
  assert(!(await postButton.isDisabled()), "Post need did not unlock after the voice file became ready.");
  await postButton.click();
  await page.waitForFunction(() => !document.querySelector('[data-gsn-demand-create-form="simple"]'));
  assert(apiCalls.voiceRequestPosts === 1, "The ready recording did not use the protected voice request endpoint.");
  assert(apiCalls.textRequestPosts === 0, "The recorded request silently fell back to the text-only endpoint.");

  await page.goto(baseURL + "/app/demand-box?demand_id=72", { waitUntil: "domcontentloaded", timeout: 180000 });
  const directCard = page.locator('[data-gsn-demand-record="open"]');
  await directCard.waitFor();
  assert((await directCard.count()) === 1, "A direct DemandBox link did not isolate one opened request.");
  assert(await directCard.getByText("Need a freezer repair", { exact: true }).isVisible(), "A direct DemandBox link opened the wrong request.");
  assert(
    (await page.getByRole("button", { name: "My requests 1", exact: true }).getAttribute("aria-pressed")) === "true",
    "A direct link to the member's request did not select My requests."
  );
  assert(await directCard.locator('[data-gsn-demand-respond-in-place="true"]').isVisible(), "The direct request did not open ready to respond.");

  await page.goto(baseURL + "/app/demand-box", { waitUntil: "domcontentloaded", timeout: 180000 });
  const defaultQueue = page.locator('[data-gsn-demand-queue="simple"]');
  await defaultQueue.waitFor();
  assert(
    (await defaultQueue.getByRole("button", { name: "All requests 2", exact: true }).getAttribute("aria-pressed")) === "true",
    "Ordinary DemandBox entry did not default to All requests."
  );
  assert(
    await page.locator('[data-gsn-demand-record]').getByText("Need school transport", { exact: true }).isVisible(),
    "The useful default queue did not surface the answerable request."
  );

  const overflow = await page.locator("body").evaluate((node) => node.scrollWidth > node.clientWidth + 1);
  assert(!overflow, "DemandBox overflows at " + viewport.width + "x" + viewport.height + ".");
  await page.close();
  console.log("DemandBox simple-phone smoke passed at " + viewport.width + "x" + viewport.height + ".");
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
    await verifyViewport(browser, "http://127.0.0.1:" + port, { width: 390, height: 844 });
    await verifyViewport(browser, "http://127.0.0.1:" + port, { width: 360, height: 780 });
    await verifyViewport(browser, "http://127.0.0.1:" + port, { width: 430, height: 932 });
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
