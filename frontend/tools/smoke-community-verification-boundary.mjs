/* global console, process, URL, localStorage */

import { chromium, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const communityKey = "GMFN-C-COMMUNITY-BOUNDARY";
const noRelayCommunityKey = "GMFN-C-NO-RELAY-BOUNDARY";
const inactiveCommunityKey = "GMFN-C-INACTIVE-BOUNDARY";
const unknownCommunityKey = "GMFN-C-UNKNOWN-BOUNDARY";
const memberKey = "GMFN-U-MEMBER-BOUNDARY";
const noWitnessMemberKey = "GMFN-U-NO-WITNESS-BOUNDARY";
const unknownMemberKey = "GMFN-U-UNKNOWN-BOUNDARY";
const outcomeToken = "PUBLIC-COMMUNITY-OUTCOME-BOUNDARY";
const requestId = 7361;
const reviewCaseId = 7362;

function json(body, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  };
}

function apiPathFrom(urlText) {
  const url = new URL(urlText);
  if (url.pathname.startsWith("/api/")) return url.pathname.replace(/^\/api/, "");
  return url.pathname;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  return (
    url.host === "127.0.0.1:8012" ||
    url.host === "localhost:8012" ||
    url.pathname.startsWith("/api/")
  );
}

function communityPayload(overrides = {}) {
  return {
    community_name: "Boundary Community Union",
    community_id: 42,
    community_code: communityKey,
    community_type: "association",
    community_type_label: "Association",
    community_type_source: "Inferred from public community text",
    community_public_face_status: "basic_public_record",
    community_public_face_label: "Basic public record",
    community_public_face_scope:
      "Shows Community ID, public status, inferred community type, domain stage, affiliate claim, and controlled relay availability.",
    community_next_evidence_label: "Use controlled confirmation before relying on a claim",
    community_next_evidence_scope:
      "Ask for scoped member credential, TrustSlip, acknowledged affiliate record, or controlled community confirmation.",
    community_record_started_at: "2026-07-05T08:00:00.000Z",
    community_record_started_label: "GSN record since 2026-07-05",
    community_record_started_scope:
      "This is the date this community record entered GSN, not the real-world founding date.",
    community_mobility_label: "Portable Community ID anchor",
    community_mobility_scope:
      "Use this Community ID alongside scoped evidence when trust needs to travel.",
    community_reader_decision_label: "First check, not final decision",
    community_reader_decision_scope:
      "For serious trade, lending, membership, shop, line, welfare, or affiliate decisions, ask for current scoped evidence before acting.",
    community_evidence_currentness_status: "active_basic_record",
    community_evidence_currentness_label: "Active recorded Community ID",
    community_evidence_currentness_scope:
      "This Community ID resolves to an active GSN community record. Member-level proof still needs separate evidence.",
    status: "active",
    public_record: "Recorded in GSN",
    domain_label: "GSN Community ID Domain",
    domain_status: "Recorded community domain",
    domain_lifecycle_status: "recorded",
    domain_lifecycle_label: "Recorded in GSN",
    domain_lifecycle_note:
      "Paid protected domain ownership, parent community control, and affiliate approval are not asserted by this public record yet.",
    domain_evidence_scope: "Community ID is the record anchor. The name is a display label.",
    domain_proof_scope: "Community ID is the record anchor. The name is a display label.",
    membership_credential_status:
      "Member, shop, and group credentials are not exposed on this public page",
    official_affiliate_status: "not_asserted",
    official_affiliate_label: "No parent community affiliate claim on this record",
    official_affiliate_note:
      "Parent community acknowledgement needs its own record.",
    group_affiliation_status:
      "Affiliate groups must be acknowledged under the parent community",
    public_limitation:
      "This record shows the community identity recorded in GSN. It does not automatically verify every person, shop, line, or subgroup.",
    member_confirmation: "By controlled request only",
    relay_available: true,
    relay_availability: "Available",
    request_confirmation_available: true,
    ...overrides,
  };
}

function memberCredentialPayload(overrides = {}) {
  return {
    community_name: "Boundary Community Union",
    community_id: 42,
    community_code: communityKey,
    community_public_face_status: "basic_public_record",
    community_public_face_label: "Basic public record",
    official_affiliate_status: "not_asserted",
    official_affiliate_label: "No parent community claim",
    community_evidence_currentness_status: "active_basic_record",
    community_evidence_currentness_label: "Active recorded Community ID",
    community_evidence_currentness_scope:
      "This Community ID resolves to an active GSN community record.",
    member_gsn_id: memberKey,
    member_display_name: "Boundary Member",
    membership_status: "active",
    membership_role: "member",
    public_label: "Community member evidence found",
    member_witness_count: 3,
    membership_strength_label: "Community member evidence",
    membership_renewal_status_label: "Current",
    membership_valid_until: "2035-07-05T08:00:00.000Z",
    next_witness_renewal_at: "2035-07-05T08:00:00.000Z",
    next_witness_renewal_status_label: "Current",
    community_activity_count: 4,
    community_activity_latest_at: "2026-07-05T08:30:00.000Z",
    community_activity_categories: ["Participation", "Contribution"],
    community_activity_label: "Community activity recorded",
    community_trust_reading_label: "Community member evidence",
    community_trust_reading_scope:
      "This credential is community-scoped evidence for judgement, not a universal trust score.",
    membership_currentness_label: "Current witness window",
    membership_currentness_scope:
      "The member's witness evidence is within its recorded validity window.",
    evidence_scope:
      "This public credential shows an active membership record plus aggregate member-witness strength.",
    proof_scope:
      "This public credential shows an active membership record plus aggregate member-witness strength.",
    privacy_note: "Private verifier names and private member contact details are not shown.",
    decision_note: "Use this as membership evidence, not as a guarantee or automatic transaction approval.",
    ...overrides,
  };
}

function confirmationOutcomePayload() {
  return {
    request_id: requestId,
    public_token: outcomeToken,
    status: "under_review",
    mode: "instant_pulse",
    reason_type: "merchant_release_check",
    risk_level: "medium",
    community_name: "Boundary Community Union",
    community_id: 42,
    community_code: communityKey,
    subject_public_reference: memberKey,
    subject_reference_type: "gsn_id",
    created_at: "2026-07-05T08:00:00.000Z",
    expires_at: "2035-07-05T09:00:00.000Z",
    review_case: {
      review_case_id: reviewCaseId,
      status: "open",
      review_reason: "community_verification_boundary_check",
      trust_impact: "caution",
      trust_reading_effect: {
        label: "Use caution",
        plain_language:
          "A review case exists, but private review notes are not part of the public paper.",
        reader_action: "Use the public response counts and your own judgement.",
        trust_delta: "scoped",
      },
    },
    community_response: {
      requests_sent: 4,
      active_member_count: 12,
      responses_received: 3,
      confirmed_known_count: 2,
      caution_count: 1,
      objection_count: 0,
      community_confidence: "moderate",
      private_contacts_exposed: false,
    },
    visible_summary:
      "Two requested contacts confirmed and one advised caution. Private contacts stay hidden.",
    privacy_note:
      "GSN shows a controlled community outcome. It does not expose private member phone numbers.",
    decision_note:
      "This is evidence for judgement, not a guarantee, payment instruction, or automatic approval.",
    requester_callback: {
      consent: false,
      delivery_status: "not_requested",
    },
  };
}

async function installApiMocks(page, requestLog) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    if (!isApiRequest(url)) {
      await route.continue();
      return;
    }

    const path = apiPathFrom(url);
    const method = request.method().toUpperCase();
    const headers = request.headers();
    requestLog.push({
      method,
      path,
      authPresent: Boolean(headers.authorization),
      clanPresent: Boolean(headers["x-clan-id"]),
    });

    if (method === "GET" && path === `/verify/community/${encodeURIComponent(unknownCommunityKey)}`) {
      await route.fulfill(json({ detail: "Community not found" }, 404));
      return;
    }

    if (method === "GET" && path === `/verify/community/${encodeURIComponent(noRelayCommunityKey)}`) {
      await route.fulfill(
        json(
          communityPayload({
            community_name: "No Relay Boundary Community",
            community_id: 43,
            community_code: noRelayCommunityKey,
            community_next_evidence_label: "Ask for scoped member or group evidence",
            community_next_evidence_scope:
              "Controlled relay is not ready. Ask for a member credential, TrustSlip, acknowledged affiliate record, or fresh community evidence before acting.",
            relay_available: false,
            relay_availability: "Not available",
            request_confirmation_available: false,
          })
        )
      );
      return;
    }

    if (method === "GET" && path === `/verify/community/${encodeURIComponent(inactiveCommunityKey)}`) {
      await route.fulfill(
        json(
          communityPayload({
            community_name: "Inactive Boundary Community",
            community_id: 44,
            community_code: inactiveCommunityKey,
            status: "inactive",
            community_evidence_currentness_status: "inactive_record",
            community_evidence_currentness_label: "Community record is not active",
            community_evidence_currentness_scope:
              "This Community ID resolves to a GSN record, but the community record is not active. Treat it as historical or unavailable public evidence until current scoped evidence is supplied.",
            relay_available: false,
            relay_availability: "Not available",
            request_confirmation_available: false,
          })
        )
      );
      return;
    }

    if (method === "GET" && path === `/verify/community/${encodeURIComponent(communityKey)}`) {
      await route.fulfill(json(communityPayload()));
      return;
    }

    if (
      method === "GET" &&
      path ===
        `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(
          unknownMemberKey
        )}`
    ) {
      await route.fulfill(json({ detail: "Member not found in this community" }, 404));
      return;
    }

    if (
      method === "GET" &&
      path ===
        `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(
          noWitnessMemberKey
        )}`
    ) {
      await route.fulfill(
        json(
          memberCredentialPayload({
            member_gsn_id: noWitnessMemberKey,
            member_display_name: "No Witness Boundary Member",
            public_label: "Active community member; witness evidence limited",
            member_witness_count: 0,
            membership_strength_label: "Joined / witness not started",
            membership_renewal_status_label: "Not Started",
            membership_valid_until: "",
            next_witness_renewal_at: "",
            next_witness_renewal_status_label: "Not Started",
            community_activity_count: 0,
            community_activity_latest_at: "",
            community_activity_categories: [],
            community_activity_label: "No community activity recorded yet",
            community_trust_reading_label: "Active membership; witness evidence not started",
            community_trust_reading_scope:
              "This credential shows active membership, no current witness rows, and no broad community activity events. It is early community-scoped evidence only.",
            membership_currentness_label: "Witness renewal not started",
            membership_currentness_scope:
              "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision.",
          })
        )
      );
      return;
    }

    if (
      method === "GET" &&
      path ===
        `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(
          memberKey
        )}`
    ) {
      await route.fulfill(json(memberCredentialPayload()));
      return;
    }

    if (method === "GET" && path === "/clans/42/followers/count") {
      await route.fulfill(json({ follower_count: 7 }));
      return;
    }

    if (method === "GET" && path === "/clans/42/follow-status") {
      await route.fulfill(json({ is_following: false, follower_count: 7 }));
      return;
    }

    if (
      method === "GET" &&
      path === `/community-confirmations/public/${encodeURIComponent(outcomeToken)}`
    ) {
      await route.fulfill(json(confirmationOutcomePayload()));
      return;
    }

    if (method === "GET" && path === `/community-confirmations/${requestId}/decision`) {
      await route.fulfill(
        json({
          decision_found: true,
          decision_id: 8001,
          decision: "deferred",
          status: "under_review",
        })
      );
      return;
    }

    if (method === "GET" && path === `/community-confirmations/review-cases/${reviewCaseId}/evidence`) {
      await route.fulfill(
        json({
          items: [
            {
              evidence_id: 91,
              evidence_type: "note",
              title: "Private review note",
              body: "SHOULD NOT BE PUBLIC EVIDENCE",
            },
          ],
          total: 1,
          private_contacts_exposed: false,
        })
      );
      return;
    }

    await route.fulfill(json({ items: [], total: 0, ok: true }));
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRequest(requestLog, predicate, label) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 7000) {
    if (requestLog.some(predicate)) return;
    await wait(100);
  }
  const summary = requestLog
    .map((entry) => `${entry.method} ${entry.path} auth=${entry.authPresent} clan=${entry.clanPresent}`)
    .join("; ");
  throw new Error(`${label} did not happen. Requests: ${summary || "none"}`);
}

function assertPublicGetHasNoViewerContext(requestLog, path, label) {
  const matching = requestLog.filter((entry) => entry.method === "GET" && entry.path === path);
  if (matching.length < 1) {
    throw new Error(`${label} was not requested.`);
  }
  const leaked = matching.filter((entry) => entry.authPresent || entry.clanPresent);
  if (leaked.length > 0) {
    throw new Error(`${label} sent viewer context: ${JSON.stringify(leaked)}`);
  }
}

async function openDisclosure(page, title) {
  await page.locator("summary").filter({ hasText: title }).first().click();
}

async function expectVisibleText(page, text) {
  await expect(page.getByText(text, { exact: false }).first()).toBeVisible();
}

async function newSignedInPage(browser) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "PUBLIC_COMMUNITY_GET_SHOULD_NOT_TRAVEL");
    localStorage.setItem("gmfn_selected_clan_id", "987654");
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApiMocks(page, requestLog);
  return { context, page, requestLog, consoleErrors, pageErrors };
}

async function closeChecked(state, label, options = {}) {
  await state.context.close();
  const allowedConsolePatterns = options.allowedConsolePatterns || [];
  const consoleErrors = state.consoleErrors.filter(
    (message) => !allowedConsolePatterns.some((pattern) => pattern.test(message))
  );
  const pageErrors = state.pageErrors;
  if (consoleErrors.length || pageErrors.length) {
    throw new Error(
      `${label} emitted runtime errors: ${[...consoleErrors, ...pageErrors].join(
        " | "
      )}`
    );
  }
}

async function runCommunityRecordScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/verify/community/${encodeURIComponent(communityKey)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(
    state.page.getByRole("heading", { name: "Boundary Community Union", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("Community Verification", { exact: true })).toBeVisible();
  await expect(state.page.getByText("This page confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This page does not confirm", { exact: true })).toHaveCount(1);
  await expect(
    state.page.locator('[data-gsn-trust-document-certificate="community-verification"]')
  ).toHaveCount(1);
  await expect(
    state.page.getByText("Member lists, contacts, disputes, and private review notes stay hidden.", {
      exact: false,
    })
  ).toBeVisible();
  await openDisclosure(state.page, "Community record security and limits");
  await openDisclosure(state.page, "More confirmed details");
  await openDisclosure(state.page, "More limits");
  await expectVisibleText(state.page, "Controlled relay availability");
  await expectVisibleText(state.page, "Transactions or money movement");
  await expectVisibleText(state.page, "Trust Passport standing");
  await expectVisibleText(
    state.page,
    "Record reference for this visible public record. It helps match this page with its GSN record; it is not legal proof or payment approval."
  );
  await openDisclosure(state.page, "Verification details");
  await expectVisibleText(
    state.page,
    "Member, shop, and group credentials are not exposed on this public page"
  );
  await expectVisibleText(
    state.page,
    "This is the date this community record entered GSN, not the real-world founding date."
  );

  const path = `/verify/community/${encodeURIComponent(communityKey)}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === path, "community record public GET");
  assertPublicGetHasNoViewerContext(state.requestLog, path, "Community record public GET");
  await closeChecked(state, "community record scenario");
}

async function runNoRelayCommunityScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/verify/community/${encodeURIComponent(noRelayCommunityKey)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(
    state.page.getByRole("heading", { name: "No Relay Boundary Community", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("Relay not available", { exact: false }).first()).toBeVisible();
  await expect(
    state.page.getByText("Ask for a member credential, TrustSlip, or fresh community confirmation.", {
      exact: false,
    })
  ).toBeVisible();
  await state.page.locator('[data-cta-id="community-verify.request-confirmation"]').click();
  await expect(
    state.page.getByText("Controlled confirmation is not available for this community yet.", {
      exact: true,
    })
  ).toBeVisible();
  await openDisclosure(state.page, "Verification details");
  await expectVisibleText(
    state.page,
    "Controlled relay is not ready. Ask for a member credential, TrustSlip, acknowledged affiliate record, or fresh community evidence before acting."
  );

  const path = `/verify/community/${encodeURIComponent(noRelayCommunityKey)}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === path, "no-relay community public GET");
  assertPublicGetHasNoViewerContext(state.requestLog, path, "No-relay community public GET");
  await closeChecked(state, "no-relay community scenario");
}

async function runInactiveCommunityScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/verify/community/${encodeURIComponent(inactiveCommunityKey)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(
    state.page.getByRole("heading", { name: "Inactive Boundary Community", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("Inactive", { exact: false }).first()).toBeVisible();
  await expect(state.page.getByText("Relay not available", { exact: false }).first()).toBeVisible();
  await expect(
    state.page.getByText("Ask for a member credential, TrustSlip, or fresh community confirmation.", {
      exact: false,
    })
  ).toBeVisible();
  await openDisclosure(state.page, "Verification details");
  await expectVisibleText(
    state.page,
    "This Community ID resolves to a GSN record, but the community record is not active. Treat it as historical or unavailable public evidence until current scoped evidence is supplied."
  );

  const path = `/verify/community/${encodeURIComponent(inactiveCommunityKey)}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === path, "inactive community public GET");
  assertPublicGetHasNoViewerContext(state.requestLog, path, "Inactive community public GET");
  await closeChecked(state, "inactive community scenario");
}

async function runUnknownCommunityScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/verify/community/${encodeURIComponent(unknownCommunityKey)}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(
    state.page.getByRole("heading", { name: "Community not found", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("Community not found", { exact: false }).first()).toBeVisible();
  await expect(state.page.locator('[data-gsn-trust-document-certificate="community-verification"]')).toHaveCount(0);

  const path = `/verify/community/${encodeURIComponent(unknownCommunityKey)}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === path, "unknown community public GET");
  assertPublicGetHasNoViewerContext(state.requestLog, path, "Unknown community public GET");
  await closeChecked(state, "unknown community scenario", {
    allowedConsolePatterns: [
      /Failed to load resource: the server responded with a status of 404/,
      /\[API GET \/verify\/community\/GMFN-C-UNKNOWN-BOUNDARY\] 404: Community not found/,
    ],
  });
}

async function runMemberCredentialScenario(browser, baseURL, member = memberKey, expected = {}) {
  const state = await newSignedInPage(browser);
  await state.page.goto(
    `${baseURL}/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(member)}`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await expect(
    state.page.getByRole("heading", {
      name: expected.heading || "Community member evidence found",
      exact: true,
    })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("This credential confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This credential does not confirm", { exact: true })).toHaveCount(1);
  await expect(
    state.page.locator('[data-gsn-trust-document-certificate="community-member-credential"]')
  ).toHaveCount(1);
  await expect(
    state.page.getByText("It does not reveal private witnesses or contact details.", {
      exact: false,
    })
  ).toBeVisible();
  for (const text of expected.visibleText || []) {
    await expect(state.page.getByText(text, { exact: false }).first()).toBeVisible();
  }
  await openDisclosure(state.page, "Credential security and limits");
  await openDisclosure(state.page, "More security details");
  await expectVisibleText(state.page, "Full Trust Passport or private member history");
  await expectVisibleText(state.page, "Payments, escrow, loans, credit approval, or delivery");
  await expectVisibleText(
    state.page,
    "Private verifier names, contacts, review notes, payment records, and the full Trust Passport stay hidden."
  );
  await openDisclosure(state.page, "Full public reading");
  await expectVisibleText(
    state.page,
    "This credential does not expose verifier names, private notes, phone numbers, shop details, payment records, loan details, or credit approval."
  );
  await expectVisibleText(
    state.page,
    expected.fullReadingText ||
      "Check the Community ID, witness strength, renewal, activity summary, TrustSlip, and live community confirmation together. If one is missing or stale, ask for fresh evidence first."
  );
  await openDisclosure(state.page, "Evidence notes and privacy");
  await expectVisibleText(state.page, "Private verifier names and private member contact details are not shown.");

  const path = `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(member)}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === path, "member credential public GET");
  assertPublicGetHasNoViewerContext(state.requestLog, path, "Member credential public GET");
  await closeChecked(state, "member credential scenario");
}

async function runUnknownMemberCredentialScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(
    `${baseURL}/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(unknownMemberKey)}`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await expect(
    state.page.getByRole("heading", { name: "Credential not found", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("Member not found in this community", { exact: false })).toBeVisible();
  await expect(state.page.locator('[data-gsn-member-credential-primary-facts="true"]')).toHaveCount(0);

  const path = `/verify/community/${encodeURIComponent(communityKey)}/member/${encodeURIComponent(
    unknownMemberKey
  )}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === path, "unknown member public GET");
  assertPublicGetHasNoViewerContext(state.requestLog, path, "Unknown member public GET");
  await closeChecked(state, "unknown member credential scenario", {
    allowedConsolePatterns: [
      /Failed to load resource: the server responded with a status of 404/,
      /\[API GET \/verify\/community\/GMFN-C-COMMUNITY-BOUNDARY\/member\/GMFN-U-UNKNOWN-BOUNDARY\] 404: Member not found in this community/,
    ],
  });
}

async function runConfirmationOutcomeScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(
    `${baseURL}/community-confirmations/public/${encodeURIComponent(outcomeToken)}`,
    {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    }
  );

  await expect(
    state.page.getByRole("heading", { name: "Community Confirmation", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("This outcome confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This outcome does not confirm", { exact: true })).toHaveCount(1);
  await expect(
    state.page
      .locator('section[aria-label="Fast outcome reading"]')
      .getByText("Private contacts stay hidden.")
  ).toBeVisible();

  const publicPath = `/community-confirmations/public/${encodeURIComponent(outcomeToken)}`;
  await waitForRequest(state.requestLog, (entry) => entry.path === publicPath, "confirmation outcome public GET");
  await waitForRequest(
    state.requestLog,
    (entry) => entry.path === `/community-confirmations/${requestId}/decision`,
    "signed-in confirmation decision GET"
  );
  assertPublicGetHasNoViewerContext(state.requestLog, publicPath, "Confirmation outcome public GET");

  const protectedReads = state.requestLog.filter(
    (entry) =>
      entry.authPresent &&
      (entry.path === `/community-confirmations/${requestId}/decision` ||
        entry.path === `/community-confirmations/review-cases/${reviewCaseId}/evidence`)
  );
  if (protectedReads.length < 1) {
    throw new Error("Signed-in confirmation operational reads did not carry auth.");
  }

  await closeChecked(state, "confirmation outcome scenario");
}

async function main() {
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
    const address = server.httpServer?.address();
    const port = typeof address === "object" && address ? address.port : null;
    if (!port) throw new Error("Vite test server did not expose a port.");
    const baseURL = `http://127.0.0.1:${port}`;

    browser = await chromium.launch({ headless: true });
    await runCommunityRecordScenario(browser, baseURL);
    await runNoRelayCommunityScenario(browser, baseURL);
    await runInactiveCommunityScenario(browser, baseURL);
    await runUnknownCommunityScenario(browser, baseURL);
    await runMemberCredentialScenario(browser, baseURL);
    await runMemberCredentialScenario(browser, baseURL, noWitnessMemberKey, {
      heading: "Active community member; witness evidence limited",
      visibleText: [
        "No witness records shown",
        "Joined / witness not started",
      ],
      fullReadingText:
        "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision.",
    });
    await runUnknownMemberCredentialScenario(browser, baseURL);
    await runConfirmationOutcomeScenario(browser, baseURL);

    console.log(
      [
        "Community Verification boundary smoke passed:",
        "signed-in localStorage did not travel on public community, member credential, or public outcome GETs;",
        "active, no-relay, inactive, unknown-community, current-member, no-witness-member, and unknown-member states stayed bounded;",
        "trust-document confirms/does-not-confirm boundaries rendered;",
        "signed-in confirmation operational reads still used auth.",
      ].join(" ")
    );
  } finally {
    if (browser) await browser.close();
    if (server) await server.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
