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
    description: "A driver is needed on weekday mornings.",
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
    visibility_scope: "community_visible",
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
      return route.fulfill(json({ count: 0, matches: [] }));
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
          is_mine: false,
        },
      ] : []));
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
  const apiCalls = { textRequestPosts: 0, voiceRequestPosts: 0 };
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
  });

  await page.goto(baseURL + "/app/demand-box", { waitUntil: "domcontentloaded", timeout: 180000 });
  const frontDoor = page.locator('[data-gsn-demand-front-door="simple"]');
  await frontDoor.waitFor();

  assert(await page.getByText("Find what you need", { exact: true }).isVisible(), "The human-first DemandBox title is missing.");
  assert(await page.getByText("Ask, request or get help from people in Blessed Satch family Marketplace.", { exact: true }).isVisible(), "The plain DemandBox explanation is missing.");
  assert(await page.getByRole("button", { name: "Post a need", exact: true }).isVisible(), "Post a need is missing.");
  assert(await page.getByRole("link", { name: "Ask community", exact: true }).isVisible(), "Ask community is missing.");
  assert((await frontDoor.getByRole("button").count()) === 1, "The first surface has extra buttons.");
  assert((await frontDoor.getByRole("link").count()) === 1, "The first surface has extra links.");
  assert(!(await page.getByText("Current state", { exact: true }).isVisible().catch(() => false)), "The repeated Current state card returned.");
  assert(!(await page.getByText("Routing readiness", { exact: true }).isVisible().catch(() => false)), "Technical routing copy leaked onto the member surface.");
  assert((await page.locator('[data-cta-id="demand-box.relay-policy.summary"]').count()) === 0, "Admin relay settings leaked to a member.");

  const queue = page.locator('[data-gsn-demand-queue="simple"]');
  await queue.waitFor();
  assert(
    await queue.locator('[data-gsn-demand-community-strip="selected"]').getByText("Blessed Satch family Marketplace", { exact: true }).isVisible(),
    "The selected marketplace identity strip is missing."
  );
  for (const label of ["All 2", "For you 1", "Yours 1"]) {
    assert(await queue.getByRole("button", { name: label, exact: true }).isVisible(), "Missing primary filter: " + label);
  }
  assert(!(await queue.getByRole("button", { name: /Tagged/ }).isVisible().catch(() => false)), "Tagged is exposed before More filters opens.");

  const cards = page.locator('[data-gsn-demand-record]');
  assert((await cards.count()) === 1, "The phone queue should begin with one compact request preview.");
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 0, "A phone request opened before a tap.");
  assert(!(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible()), "Request detail leaked from a closed card.");

  const transportCard = cards.filter({ hasText: "Need school transport" });
  assert((await transportCard.getAttribute("data-gsn-demand-request-preview")) === "message-first", "The closed request is not using the message-first preview.");
  assert(await transportCard.getByText("Open request", { exact: true }).isVisible(), "The request status is missing from the closed preview.");
  assert(await transportCard.getByText("Need school transport", { exact: true }).isVisible(), "The request message is missing from the closed preview.");
  await transportCard.getByRole("button", { name: "Details", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "Opening a request did not expose exactly one card.");
  assert(await transportCard.locator('[data-gsn-demand-request-hero="request"]').isVisible(), "Opened request hero is missing.");
  assert(!(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible()), "Request detail leaked before the user asked.");
  assert(!(await page.getByText("Source: DemandBox", { exact: true }).isVisible()), "Technical request details opened before the user asked.");
  await transportCard
    .locator('[data-cta-id$=".request-details"]')
    .evaluate((element) => element.click());
  assert(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible(), "Opened request detail is missing.");
  assert(await page.getByText("Source: DemandBox", { exact: true }).isVisible(), "Request details are not reachable.");
  assert(
    await transportCard.getByRole("button", { name: "Reply privately", exact: true }).isVisible(),
    "A request without audio still promises that members can listen."
  );

  await page.getByRole("button", { name: "View more needs", exact: true }).click();
  assert((await cards.count()) === 2, "View more needs did not reveal the remaining request preview.");
  const freezerCard = cards.filter({ hasText: "Need a freezer repair" });
  await freezerCard.getByRole("button", { name: "Details", exact: true }).click();
  assert((await page.locator('[data-gsn-demand-record="open"]').count()) === 1, "More than one phone request stayed open.");
  assert(!(await page.getByText("A driver is needed on weekday mornings.", { exact: true }).isVisible()), "Opening the next card did not close the first.");

  const ownerHero = freezerCard.locator('[data-gsn-demand-request-hero="request"]');
  await ownerHero.waitFor();
  assert(await freezerCard.getByText("Open request", { exact: true }).isVisible(), "The truthful request status is missing from the visual hero.");
  assert(await freezerCard.getByText("Need a freezer repair", { exact: true }).isVisible(), "The real request title is missing from the visual hero.");
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

  const compactTabs = freezerCard.locator('[data-gsn-demand-detail-tabs="compact"]');
  assert((await compactTabs.getByRole("button").count()) === 2, "The compact request/privacy tabs are incomplete.");
  assert(!(await freezerCard.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible()), "Request details opened before the member asked.");
  await compactTabs.getByRole("button", { name: "Request details", exact: true }).click();
  assert(await freezerCard.getByText("The freezer stopped cooling yesterday.", { exact: true }).isVisible(), "Request details did not open.");
  assert(await freezerCard.getByText("Source: DemandBox", { exact: true }).isVisible(), "Request evidence did not remain reachable.");
  await compactTabs.getByRole("button", { name: "Privacy & terms", exact: true }).click();
  assert(await freezerCard.locator('[data-gsn-demand-detail-panel="privacy"]').isVisible(), "Privacy & terms did not open.");
  const contactActions = freezerCard.locator('[data-gsn-demand-contact-actions="private"]');
  assert((await contactActions.getByRole("button").count()) === 2, "Private contact options are incomplete.");
  await compactTabs.getByRole("button", { name: "Privacy & terms", exact: true }).click();

  const listenReplyButton = freezerCard.getByRole("button", { name: "Listen & reply", exact: true });
  assert(await listenReplyButton.isVisible(), "The primary listen-and-reply action is missing.");
  assert(!(await freezerCard.locator('[data-gsn-demand-private-replies="true"]').isVisible().catch(() => false)), "Private replies opened before the member asked.");
  await listenReplyButton.click();
  assert(await freezerCard.locator('[data-gsn-demand-private-replies="true"]').isVisible(), "Private replies did not open.");
  const participantPicker = freezerCard.locator('[data-gsn-demand-conversation-participant="true"] select');
  await participantPicker.waitFor();
  assert((await participantPicker.locator("option").count()) === 2, "Separate private responders are not selectable.");
  const conversation = freezerCard.locator('[data-gsn-demand-conversation="whatsapp-like"]');
  await conversation.getByText("I can inspect the freezer after 4pm.", { exact: true }).waitFor();
  assert((await conversation.getByText("I can also inspect it tomorrow morning.", { exact: true }).count()) === 0, "Another responder's private exchange leaked into the selected conversation.");
  await participantPicker.selectOption({ label: "Conversation with Ngozi Member" });
  await conversation.getByText("I can also inspect it tomorrow morning.", { exact: true }).waitFor();
  assert(await conversation.locator('[data-gsn-demand-message-avatar="initials"]').isVisible(), "The privacy-safe initials avatar is missing when no portrait was shared.");
  assert((await conversation.getByText("I can inspect the freezer after 4pm.", { exact: true }).count()) === 0, "The first responder's exchange remained visible after switching conversations.");
  await participantPicker.selectOption({ label: "Conversation with Chidi Member" });
  await conversation.getByText("I can inspect the freezer after 4pm.", { exact: true }).waitFor();
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
  assert(
    await conversation.getByText("Only the requester and this member can read or play it.", { exact: false }).isVisible(),
    "The private conversation boundary is missing."
  );

  const deleteVoiceButton = freezerCard.getByRole("button", {
    name: "Delete voice note",
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
  await freezerCard.locator('[data-gsn-demand-voice-deleted="true"]').waitFor();
  assert(
    await freezerCard.locator('[data-gsn-demand-voice-deleted="true"]').isVisible(),
    "Permanent deletion did not leave the retained-history tombstone."
  );

  const expandedSearch = freezerCard.locator('[data-gsn-demand-expand-search="true"]');
  assert(await expandedSearch.getByText("No matches here yet", { exact: true }).isVisible(), "The compact no-match state is missing.");
  assert(await expandedSearch.getByRole("button", { name: "Search in one other community", exact: true }).isVisible(), "The compact one-hop search action is missing.");
  assert(await expandedSearch.getByRole("button", { name: "Stop expanded search", exact: true }).isVisible(), "Withdrawable relay consent is missing.");

  const actionDock = freezerCard.locator('[data-gsn-demand-action-dock="compact"]');
  assert((await actionDock.getByRole("button").count()) === 3, "The owner action dock must contain three calm lifecycle actions.");
  for (const label of ["Fulfilled", "Cancel", "Copy request"]) {
    assert(await actionDock.getByRole("button", { name: label, exact: true }).isVisible(), "Missing compact owner action: " + label);
  }

  const focusGeometry = await freezerCard.evaluate((card) => {
    const hero = card.querySelector('[data-gsn-demand-request-hero="request"]');
    const dock = card.querySelector('[data-gsn-demand-action-dock="compact"]');
    const actionRects = dock ? Array.from(dock.children).map((node) => node.getBoundingClientRect()) : [];
    return {
      heroHeight: hero ? Math.round(hero.getBoundingClientRect().height) : 0,
      actionCount: actionRects.length,
      oneActionRow: actionRects.length > 0 && actionRects.every((rect) => Math.abs(rect.top - actionRects[0].top) <= 1),
      noOverflow: card.scrollWidth <= card.clientWidth + 1,
    };
  });
  assert(
    focusGeometry.heroHeight >= 180 && focusGeometry.heroHeight <= 280,
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
  const communityContext = createCard.locator('[data-gsn-demand-community-context="selected"]');
  await form.waitFor();
  assert(await createCard.isVisible(), "The premium create card is missing.");
  assert(await createShell.isVisible(), "The approved DemandBox create background is missing.");
  assert(await createCard.getByText("Share one clear need with the right people.", { exact: true }).isVisible(), "The create task guidance is missing.");
  assert(await communityContext.getByText("Blessed Satch family Marketplace", { exact: true }).isVisible(), "The selected community context is missing.");
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
  for (const label of ["Transport", "Repairs", "Food", "Books", "Housing", "Other"]) {
    assert(
      await form.getByRole("button", { name: label, exact: true }).isVisible(),
      "Category picture choice is missing: " + label
    );
  }
  assert(await page.getByRole("button", { name: "Record", exact: true }).isVisible(), "Voice recorder is missing.");
  assert(await page.getByLabel("Short heading").isVisible(), "Short heading field is missing.");
  assert(await page.getByLabel("Area").isVisible(), "Area field is missing.");
  assert(await page.getByRole("button", { name: "Community", exact: true }).isVisible(), "Community visibility choice is missing.");
  assert(await page.getByRole("button", { name: "One person", exact: true }).isVisible(), "One person visibility choice is missing.");
  assert((await page.getByRole("button", { name: "Community", exact: true }).getAttribute("aria-pressed")) === "true", "Community visibility is not visibly selected by default.");
  const createScreenshotPath = process.env.GSN_DEMAND_BOX_CREATE_SCREENSHOT_PATH?.trim();
  if (createScreenshotPath && viewport.width === 390) {
    await createShell.screenshot({ path: createScreenshotPath });
  }
  assert(!(await page.getByLabel("Short explanation").isVisible().catch(() => false)), "Optional fields opened before More options.");
  await page.locator('[data-cta-id="demand-box.more-options"]').click();
  assert(await page.getByLabel("Short explanation").isVisible(), "Short explanation is not reachable.");
  assert(await page.getByLabel("WhatsApp number").isVisible(), "WhatsApp override is not reachable.");
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
  await form.getByRole("button", { name: "Transport", exact: true }).click();
  await page.getByLabel("Short heading").fill("Need a taxi");
  await page.getByRole("button", { name: "Record", exact: true }).click();
  const postButton = page.locator('[data-cta-id="demand-box.post"]');
  assert(await postButton.isDisabled(), "Post need stayed enabled while voice recording was active.");
  assert(
    await postButton.getByText("Stop recording first", { exact: true }).isVisible(),
    "The active recording did not explain why posting was locked."
  );
  await page.getByRole("button", { name: "Stop", exact: true }).click();
  await page.getByText("Voice note ready", { exact: true }).waitFor();
  assert(!(await postButton.isDisabled()), "Post need did not unlock after the voice file became ready.");
  await postButton.click();
  await page.waitForFunction(() => !document.querySelector('[data-gsn-demand-create-form="simple"]'));
  assert(apiCalls.voiceRequestPosts === 1, "The ready recording did not use the protected voice request endpoint.");
  assert(apiCalls.textRequestPosts === 0, "The recorded request silently fell back to the text-only endpoint.");

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
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
