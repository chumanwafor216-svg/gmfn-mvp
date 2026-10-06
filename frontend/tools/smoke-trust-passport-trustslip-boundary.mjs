/* global console, process, setTimeout, URL, localStorage, document, window */

import { chromium, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const selectedClanId = 8;
const homelandClanId = 7;
const trustSlipCode = "GSN-TRUSTSLIP-BOUNDARY";
const recoveredTrustSlipCode = "1SRYFELFCKU";
function sourceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  const end = source.indexOf(endNeedle, start + startNeedle.length);
  if (start < 0 || end < 0) throw new Error(`Could not inspect source block between ${startNeedle} and ${endNeedle}.`);
  return source.slice(start, end);
}

function assertPublicHousingShareContactBoundary() {
  const source = readFileSync(join(frontendRoot, "src", "pages", "TrustSlipPage.tsx"), "utf8");
  const publicShareBody = sourceBetween(
    source,
    "function buildPublicDecisionPackShareText",
    "function copyPublicDecisionPackShareNote"
  );
  if (publicShareBody.includes("housingExternalContact") || publicShareBody.includes("Optional external follow-up contact")) {
    throw new Error("Ordinary public Decision Pack share formatter still references holder-supplied external contact.");
  }

  const consentShareBody = sourceBetween(
    source,
    "function buildDecisionPackConsentShareText",
    "function buildDecisionPackConsentExportText"
  );
  if (!consentShareBody.includes("housingExternalContact") || !consentShareBody.includes("Optional external follow-up contact")) {
    throw new Error("Holder-consented Decision Pack export path no longer preserves optional external contact handling.");
  }
}

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

function mePayload() {
  return {
    id: 216,
    user_id: 216,
    display_name: "Boundary Trust Holder",
    name: "Boundary Trust Holder",
    gmfn_id: "GMFN-U-TRUST-BOUNDARY",
    gsn_id: "GMFN-U-TRUST-BOUNDARY",
    role: "member",
    phone_verified: true,
  };
}

function clanPayload() {
  return {
    id: selectedClanId,
    clan_id: selectedClanId,
    name: "Boundary Evidence Community",
    display_name: "Boundary Evidence Community",
    community_name: "Boundary Evidence Community",
    clan_code: "GMFN-C-TRUST-BOUNDARY",
    community_code: "GMFN-C-TRUST-BOUNDARY",
    gmfn_id: "GMFN-C-TRUST-BOUNDARY",
    role: "member",
    member_count: 18,
  };
}
function homelandClanPayload() {
  return {
    id: homelandClanId,
    clan_id: homelandClanId,
    name: "Homeland isa Marketplace",
    display_name: "Homeland isa Marketplace",
    community_name: "Homeland isa Marketplace",
    clan_code: "GMFN-C-HOMELAND",
    community_code: "GMFN-C-HOMELAND",
    gmfn_id: "GMFN-C-HOMELAND",
    role: "member",
    member_count: 22,
  };
}

function blessedClanPayload() {
  return {
    ...clanPayload(),
    name: "Blessed Satch family Marketplace",
    display_name: "Blessed Satch family Marketplace",
    community_name: "Blessed Satch family Marketplace",
    clan_code: "GMFN-C-BLESSED-SATCH",
    community_code: "GMFN-C-BLESSED-SATCH",
    gmfn_id: "GMFN-C-BLESSED-SATCH",
  };
}
function mergeTrustSlipSummary(base, overrides = {}) {
  const { merchant_summary: merchantOverrides, evidence_summary: evidenceOverrides, ...topLevel } = overrides;
  return {
    ...base,
    ...topLevel,
    merchant_summary: {
      ...(base.merchant_summary || {}),
      ...(merchantOverrides || {}),
    },
    evidence_summary:
      evidenceOverrides === undefined
        ? base.evidence_summary
        : {
            ...(base.evidence_summary || {}),
            ...(evidenceOverrides || {}),
          },
  };
}

function trustSlipSummaryPayload(overrides = {}) {
  const base = {
    verified: true,
    active: true,
    status: "active",
    user_id: 216,
    clan_id: selectedClanId,
    gmfn_id: "GMFN-U-TRUST-BOUNDARY",
    display_name: "Boundary Trust Holder",
    community: "Boundary Evidence Community",
    community_id: selectedClanId,
    community_global_id: "GMFN-C-TRUST-BOUNDARY",
    community_code: "GMFN-C-TRUST-BOUNDARY",
    holder_role: "member",
    active_member_count: 18,
    phone_recorded: true,
    phone_verified: true,
    bank_details_recorded: true,
    bank_verified: false,
    bank_verification_label: "Bank recorded, not verified",
    passport_recorded: true,
    passport_verified: true,
    passport_verification_label: "Passport/ID verified",
    official_id_recorded: true,
    official_id_verified: true,
    official_id_label: "Official ID verified",
    community_identity_confirmed: true,
    community_identity_label: "Community membership recorded",
    identity_verified: true,
    identity_status_label: "Identity evidence recorded",
    community_activity_count: 5,
    community_activity_latest_at: "2026-07-05T08:00:00.000Z",
    community_activity_categories: ["Participation", "Contribution"],
    community_activity_label: "Community activity recorded",
    member_witness_count: 4,
    membership_strength_label: "Current witness evidence",
    membership_renewal_status_label: "Current",
    membership_valid_until: "2035-07-05T08:00:00.000Z",
    membership_currentness_label: "Current witness window",
    membership_currentness_scope:
      "The member's witness evidence is within its recorded validity window.",
    next_witness_renewal_at: "2035-07-05T08:00:00.000Z",
    next_witness_renewal_status_label: "Current",
    level: "B",
    band: "B",
    level_label: "Strong community evidence",
    lifetime_trust: "74",
    standing_score: "74",
    trust_score: "74",
    trust_slip_limit: "250000",
    trust_limit: "250000",
    currency: "NGN",
    code: trustSlipCode,
    verification_code: trustSlipCode,
    issued_at: "2026-07-05T08:00:00.000Z",
    created_at: "2026-07-05T08:00:00.000Z",
    expires_at: "2035-07-05T08:00:00.000Z",
    expiry_policy: "Current TrustSlip window",
    last_release_at: "2026-07-04T08:00:00.000Z",
    last_full_repayment_at: "2026-07-03T08:00:00.000Z",
    days_since_last_full_repayment: 2,
    cci_score: "81",
    cci_band: "B",
    graph_score: "81",
    active_clan_count: 5,
    community_footprint: [
      {
        community_name: "Boundary Evidence Community",
        community_code: "GMFN-C-TRUST-BOUNDARY",
        role: "member",
      },
      {
        community_name: "Homeland Marketplace",
        community_code: "GMFN-C-HOMELAND",
        role: "admin",
      },
      {
        community_name: "St Peter's Church",
        community_code: "GMFN-C-ST-PETERS",
        role: "committee_member",
      },
      {
        community_name: "Nigerian Society",
        community_code: "GMFN-C-NIGERIAN-SOCIETY",
        role: "volunteer_leader",
      },
      {
        community_name: "Business Association",
        community_code: "GMFN-C-BUSINESS-ASSOCIATION",
        role: "trader",
      },
    ],
    community_role_counts: {
      member: 1,
      admin: 1,
      committee_member: 1,
      volunteer_leader: 1,
      trader: 1,
    },
    sponsor_count: 3,
    unique_counterparties: 4,
    risk_flags: [],
    is_current: true,
    not_a_bank_guarantee: true,
    no_auto_debit: true,
    disclaimer:
      "TrustSlip is evidence for judgement. It is not a bank guarantee, escrow, payment instruction, or automatic approval.",
    public_verify_url: `/t/${encodeURIComponent(trustSlipCode)}`,
    evidence_summary: {
      capacity_context: {
        available_guarantee_capacity: "250000",
        current_locked_guarantees: "0",
        overexposure_ratio: "0",
        risk_level: "low",
        reasons: ["Current visible TrustSlip evidence is active."],
      },
    },
    merchant_summary: {
      gmfn_id: "GMFN-U-TRUST-BOUNDARY",
      display_name: "Boundary Trust Holder",
      community: "Boundary Evidence Community",
      band: "B",
      trust_limit: "250000",
      currency: "NGN",
      phone_recorded: true,
      phone_verified: true,
      bank_details_recorded: true,
      bank_verified: false,
      bank_verification_label: "Bank recorded, not verified",
      passport_recorded: true,
      passport_verified: true,
      passport_verification_label: "Passport/ID verified",
      official_id_recorded: true,
      official_id_verified: true,
      official_id_label: "Official ID verified",
      community_identity_confirmed: true,
      community_identity_label: "Community membership recorded",
      member_witness_count: 4,
      membership_strength_label: "Current witness evidence",
      membership_renewal_status_label: "Current",
      membership_currentness_label: "Current witness window",
      membership_currentness_scope:
        "The member's witness evidence is within its recorded validity window.",
      community_activity_count: 5,
      community_activity_categories: ["Participation", "Contribution"],
      community_activity_label: "Community activity recorded",
    },
  };
  return mergeTrustSlipSummary(base, overrides);
}

function tradeEvidenceExtract(overrides = {}) {
  const base = {
    source: "trust_events_redacted_extract",
    source_note: "Public-safe Trade evidence extract for smoke.",
    evidence_scope: {
      reading_scope: "community_specific",
      included_active_community_count: 1,
      includes_holder_level_records: true,
      public_summary: "Trade evidence is scoped to Boundary Evidence Community plus holder-level public-safe records.",
      boundary: "Public-safe extract only; private TrustEvents and notes are not exposed.",
    },
    categories: [],
    declared_claims: [],
    record_pointers: [],
    housing_reference_pointers: [],
    guarantee_outcome_pointers: [],
    fulfillment_outcome_pointers: [],
    completed_work_pointers: [],
    demand_request_outcome_pointers: [],
    confirmation_pointers: [],
    issue_resolution_pointers: [],
    private_review_required: [],
    boundary_note: "Public-safe category counts only.",
    ...overrides,
  };
  return base;
}

function tradePublicVerifyPayload(overrides = {}) {
  const { evidenceExtract, decisionPackProfile, ...summaryOverrides } = overrides;
  return trustSlipSummaryPayload({
    code: trustSlipCode,
    verification_code: trustSlipCode,
    verification_token: trustSlipCode,
    public_verify_url: `/t/${encodeURIComponent(trustSlipCode)}`,
    access_purpose: "Trade or Skilled Work Decision Pack",
    access_scope: "community_specific",
    recipient_access_record: {
      purpose: "Trade or Skilled Work Decision Pack",
      scope: "community_specific",
      recipient_label: "Trade recipient",
      status: "public",
    },
    decision_pack_profile: {
      access_purpose: "Trade or Skilled Work Decision Pack",
      recipient_question: "Who has seen this person trade, serve, or complete work?",
      community_confirmation_prompt: {
        reason_type: "trade_skill_check",
        question: "Can current community witnesses confirm this person is known for this trade or service?",
        responders: "Current community witnesses allowed by policy.",
        counts_as: "Aggregate community witness evidence only.",
        escalation: "Concerns go to review, not approval.",
        boundary: "Not a licence, guarantee, suitability decision, or final approval.",
      },
      relevant_signals: [
        {
          key: "community_activity",
          label: "Community activity",
          status: "available",
          value: "Community activity is visible.",
          decision_use: "Use as context, not Trade-skill confirmation.",
        },
      ],
      gaps_to_check: [
        {
          key: "customer_confirmation",
          label: "Customer or community confirmation",
          reason: "Public Trade details may be thin.",
          next_step: "Ask for completed-work or live confirmation before relying.",
        },
      ],
      recommended_checks: ["Open the public evidence details.", "Ask live community confirmation before relying."],
      evidence_extract: evidenceExtract === undefined ? tradeEvidenceExtract() : evidenceExtract,
      basis_note: "Generated from public-safe Trade evidence only.",
      boundary_note: "Does not score, approve, licence, insure, or guarantee future work.",
      ...(decisionPackProfile || {}),
    },
    ...summaryOverrides,
  });
}
function explainabilityPayload() {
  return {
    user_id: 216,
    current_score: "74",
    score: "74",
    band: "B",
    latest_reason: "Recent community evidence remains current.",
    latest_note: "Visible Trust Passport reading is evidence, not approval.",
    latest_source: "trust_events",
    recent_events: [
      {
        id: 91,
        user_id: 216,
        event_type: "community_contribution",
        delta: "+4",
        created_at: "2026-07-05T08:00:00.000Z",
        reason: "Community contribution recorded",
        note: "Mocked boundary event",
      },
    ],
  };
}

function recomputePayload() {
  return {
    user_id: 216,
    score: "74",
    band: "B",
    event_count: 7,
    last_event_id: 91,
    breakdown: {
      counts_by_event_type: { community_contribution: 4, repayment_completed: 3 },
      delta_by_event_type: { community_contribution: "+8", repayment_completed: "+12" },
      computed_band: "B",
      computed_score: "74",
      computed_score_int: 74,
      event_count_used: 7,
      last_event_id_used: 91,
      ruleset: {
        borrower_repayment_delta: "+12",
        guarantor_repayment_delta: "+4",
        precision: "mocked",
        ordering: "event_time",
      },
    },
  };
}

async function installApiMocks(page, requestLog, options = {}) {
  const trustSlipSummary = options.trustSlipSummary || trustSlipSummaryPayload();
  const clanRows = options.clanRows || [clanPayload()];
  const secondaryReadGate = options.secondaryReadGate || null;
  const trustSlipSummaryGate = options.trustSlipSummaryGate || null;
  const trustSlipSummaryAfterReissueGate = options.trustSlipSummaryAfterReissueGate || null;
  const clanListGate = options.clanListGate || null;
  const gateClanListAfter = options.gateClanListAfter ?? 0;
  let clanListReadCount = 0;
  let trustSlipReissueCount = 0;

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

    if (method === "GET" && path === "/auth/me") {
      await route.fulfill(json(mePayload()));
      return;
    }

    if (method === "GET" && path === "/clans/me") {
      clanListReadCount += 1;
      if (clanListGate && clanListReadCount > gateClanListAfter) await clanListGate.wait();
      await route.fulfill(json(clanRows));
      return;
    }

    if (
      method === "GET" &&
      [
        "/trust-slips/me/summary",
        "/trust-slips/me",
        "/trust-slips/me-summary",
        "/trust-slips/summary/me",
      ].includes(path)
    ) {
      if (trustSlipSummaryGate) await trustSlipSummaryGate.wait();
      if (trustSlipReissueCount > 0) {
        if (trustSlipSummaryAfterReissueGate) await trustSlipSummaryAfterReissueGate.wait();
        if (Object.prototype.hasOwnProperty.call(options, "trustSlipSummaryAfterReissueResult")) {
          await route.fulfill(json(options.trustSlipSummaryAfterReissueResult));
          return;
        }
        if (options.failTrustSlipSummaryAfterReissue) {
          await route.fulfill(json({ detail: "secondary TrustSlip refresh failed" }, 503));
          return;
        }
      }
      await route.fulfill(json(trustSlipSummary));
      return;
    }

    if (method === "GET" && path.startsWith("/trust-slips/verify/")) {
      await route.fulfill(json(options.publicVerifyResult || tradePublicVerifyPayload()));
      return;
    }

    if (method === "POST" && path === "/trust-slips/me/reissue") {
      trustSlipReissueCount += 1;
      if (options.failTrustSlipReissue) {
        await route.fulfill(json({ detail: "TrustSlip issuance failed in smoke" }, 500));
        return;
      }
      await route.fulfill(
        json(
          options.trustSlipReissueResult ||
            trustSlipSummaryPayload({
              code: "GSN-TRUSTSLIP-REISSUED",
              verification_code: "GSN-TRUSTSLIP-REISSUED",
              verification_token: "GSN-TRUSTSLIP-REISSUED",
              token: "GSN-TRUSTSLIP-REISSUED",
              public_verify_url: "/t/GSN-TRUSTSLIP-REISSUED",
              issued_at: "2026-10-06T10:00:00.000Z",
              created_at: "2026-10-06T10:00:00.000Z",
            })
        )
      );
      return;
    }

    if (method === "GET" && path === "/trust/me/why") {
      if (secondaryReadGate) await secondaryReadGate.wait();
      await route.fulfill(json(explainabilityPayload()));
      return;
    }

    if (
      method === "GET" &&
      [
        "/admin/trust-explainability/me",
        "/admin/trust-explainability/my",
        "/admin/trust-explainability/get-my-trust-explainability",
        "/admin/trust_explainability/get_my_trust_explainability",
        "/trust-explainability/me",
        "/trust_explainability/me",
      ].includes(path)
    ) {
      if (secondaryReadGate) await secondaryReadGate.wait();
      await route.fulfill(json(explainabilityPayload()));
      return;
    }

    if (
      (method === "GET" || method === "POST") &&
      [
        "/admin/trust-explainability/recompute-me",
        "/admin/trust-explainability/recompute_me",
        "/admin/trust_explainability/recompute_me",
        "/trust-explainability/recompute-me",
        "/trust_explainability/recompute_me",
      ].includes(path)
    ) {
      if (secondaryReadGate) await secondaryReadGate.wait();
      await route.fulfill(json(recomputePayload()));
      return;
    }

    await route.fulfill(json({ items: [], results: [], total: 0, ok: true }));
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

function privateDecisionPackReadCount(requestLog) {
  return requestLog.filter(
    (entry) =>
      entry.method === "GET" &&
      [
        "/trust-slips/me/decision-pack-accesses",
        "/trust-slips/me/decision-pack-consent-shares",
        "/trust-slips/me/decision-pack-evidence",
      ].includes(entry.path)
  ).length;
}

function isTrustPassportSummaryRead(entry) {
  return (
    entry.method === "GET" &&
    [
      "/trust-slips/me/summary",
      "/trust-slips/me",
      "/trust-slips/me-summary",
      "/trust-slips/summary/me",
    ].includes(entry.path)
  );
}

function isTrustPassportExplainabilityRead(entry) {
  return (
    entry.method === "GET" &&
    (entry.path === "/trust/me/why" ||
      entry.path.includes("/trust-explainability/") ||
      entry.path.includes("/trust_explainability/")) &&
    !entry.path.includes("recompute")
  );
}

function isTrustPassportRecomputeRead(entry) {
  return (
    (entry.method === "GET" || entry.method === "POST") &&
    (entry.path.includes("/trust-explainability/") || entry.path.includes("/trust_explainability/")) &&
    entry.path.includes("recompute")
  );
}

function trustPassportSecondaryReadCount(requestLog) {
  return requestLog.filter((entry) => isTrustPassportExplainabilityRead(entry) || isTrustPassportRecomputeRead(entry)).length;
}

function createApiGate() {
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return {
    async wait() {
      await promise;
    },
    release() {
      release();
    },
  };
}

async function newSignedInPage(browser, options = {}) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript((selectedClanStorageId) => {
    localStorage.clear();
    localStorage.setItem("access_token", "SIGNED_IN_TRUST_BOUNDARY_TOKEN");
    localStorage.setItem("gmfn_selected_clan_id", String(selectedClanStorageId));
    window.__gsnSharePayloads = [];
    window.__gsnClipboardTexts = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value) => {
          window.__gsnClipboardTexts.push(String(value || ""));
        },
      },
    });
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (payload) => {
        window.__gsnSharePayloads.push(payload);
      },
    });
  }, options.selectedClanStorageId ?? selectedClanId);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await installApiMocks(page, requestLog, options);
  return { context, page, requestLog, consoleErrors, pageErrors };
}

async function closeChecked(state, label) {
  await state.context.close();
  if (state.consoleErrors.length || state.pageErrors.length) {
    throw new Error(
      `${label} emitted runtime errors: ${[...state.consoleErrors, ...state.pageErrors].join(" | ")}`
    );
  }
}

async function openMoreLimits(page) {
  await page.locator("summary").filter({ hasText: "More limits" }).first().click();
}
async function assertPrimaryTrustSlipMobileJourneyVisible(page, expectedCode = trustSlipCode) {
  const primaryJourney = page.locator('[data-gsn-trustslip-primary-journey="true"]');
  const resultCode = page.locator('[data-gsn-trustslip-result-code="true"]');
  const shareButton = page.locator('[data-cta-id="trust-slip.primary.share"]');

  await expect(primaryJourney).toBeVisible({ timeout: 30000 });
  await expect(resultCode.getByText(expectedCode, { exact: false })).toBeVisible({ timeout: 30000 });
  await expect(shareButton).toBeVisible({ timeout: 30000 });

  const metrics = await page.evaluate(() => {
    const journey = document.querySelector('[data-gsn-trustslip-primary-journey="true"]');
    const code = document.querySelector('[data-gsn-trustslip-result-code="true"]');
    const share = document.querySelector('[data-cta-id="trust-slip.primary.share"]');
    const box = (node) => {
      const rect = node?.getBoundingClientRect();
      return rect
        ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height }
        : null;
    };
    return {
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      journey: box(journey),
      code: box(code),
      share: box(share),
    };
  });

  if (!metrics.journey || !metrics.code || !metrics.share) {
    throw new Error(`TrustSlip compact journey metrics missing: ${JSON.stringify(metrics)}`);
  }
  const overflowWidth = Math.max(metrics.documentScrollWidth, metrics.bodyScrollWidth);
  if (overflowWidth > metrics.viewportWidth + 2) {
    throw new Error(`TrustSlip compact journey overflowed mobile viewport: ${JSON.stringify(metrics)}`);
  }
  if (metrics.code.top < -2 || metrics.code.bottom > metrics.viewportHeight + 2) {
    throw new Error(`TrustSlip code was not actually visible in mobile viewport: ${JSON.stringify(metrics)}`);
  }
  if (metrics.share.top < -2 || metrics.share.bottom > metrics.viewportHeight + 2) {
    throw new Error(`TrustSlip share action was not actually visible in mobile viewport: ${JSON.stringify(metrics)}`);
  }
}

async function openFullTrustSlipDocument(page) {
  const disclosure = page.locator('[data-gsn-trustslip-full-disclosure="closed-by-default"]');
  const holderCertificate = page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]');

  await expect(disclosure).toBeVisible({ timeout: 30000 });
  await expect(disclosure).not.toHaveAttribute("open", /./);
  await expect(holderCertificate).toBeHidden();
  await disclosure.locator('summary').first().click();
  await expect(disclosure).toHaveAttribute("open", "");
  await expect(holderCertificate).toBeVisible({ timeout: 30000 });
  await expect(page.getByText("TrustSlip holder", { exact: true })).toBeVisible({ timeout: 30000 });
}

async function openTrustSlipHolderFromSetup(page, options = {}) {
  const setupPanel = page.locator('[data-gsn-trustslip-setup-only="true"]');
  const holderCertificate = page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]');

  if (options.setupOnly) {
    await expect(setupPanel).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Choose purpose and community first.", { exact: true })).toBeVisible();
    return false;
  }

  if (await setupPanel.count()) {
    await expect(setupPanel).toBeVisible({ timeout: 30000 });
    await expect(page.getByText("Choose purpose and community first.", { exact: true })).toBeVisible();

    const openCurrent = page.locator('[data-cta-id="trust-slip.setup.open-current"]');
    if (await openCurrent.count()) {
      await openCurrent.first().click();
    } else {
      await page.locator('[data-cta-id="trust-slip.setup.submit"]').click();
    }
  }

  await assertPrimaryTrustSlipMobileJourneyVisible(page, options.expectedCode || trustSlipCode);
  await expect(holderCertificate).toHaveCount(1, { timeout: 30000 });
  await expect(holderCertificate).toBeHidden();
  return true;
}
async function assertTrustSlipQrCarriesSelectedDecisionPack(page, baseURL) {
  const expectedPath = `/t/${encodeURIComponent(trustSlipCode)}`;
  const expectedParams = {
    decision_pack: "employment_decision",
    access_purpose: "Employment Decision Pack",
    recipient_question: "Is there enough evidence to continue an employment conversation?",
    access_scope: "community_specific",
    verification_scope: "community_specific",
  };

  const publicPackLink = page.getByRole("link", { name: "Open link" }).first();
  await expect(publicPackLink).toBeVisible({ timeout: 30000 });
  const publicPackHref = await publicPackLink.getAttribute("href");
  if (!publicPackHref) {
    throw new Error("TrustSlip public Decision Pack link did not expose an href.");
  }

  const publicPackHook = page.locator('[data-cta-id="trust-slip.public-decision-pack.open"]');
  await expect(publicPackHook.first()).toHaveAttribute("href", /decision_pack=employment_decision/, { timeout: 30000 });
  const hookedHrefs = await publicPackHook.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("href") || "")
  );
  if (!hookedHrefs.some((href) => href === publicPackHref)) {
    throw new Error(
      `TrustSlip public Decision Pack stable hook does not match visible link: hook=${hookedHrefs.join(" | ")}; link=${publicPackHref}`
    );
  }

  const qrLocator = page.locator("[data-gsn-trustslip-qr-value]");
  await expect(qrLocator.first()).toHaveAttribute("data-gsn-trustslip-qr-value", /decision_pack=employment_decision/, { timeout: 30000 });
  await expect
    .poll(async () => {
      const values = await qrLocator.evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-gsn-trustslip-qr-value") || "")
      );
      return values.some((value) => {
        const url = new URL(value, baseURL);
        return (
          url.pathname === expectedPath &&
          url.searchParams.get("decision_pack") === expectedParams.decision_pack &&
          url.searchParams.get("access_scope") === expectedParams.access_scope
        );
      });
    }, { timeout: 7000 })
    .toBeTruthy();

  const linkUrl = new URL(publicPackHref, baseURL);
  if (linkUrl.pathname !== expectedPath) {
    throw new Error(
      `Public Decision Pack link path does not match TrustSlip code: ${linkUrl.pathname}`
    );
  }

  for (const [key, value] of Object.entries(expectedParams)) {
    if (linkUrl.searchParams.get(key) !== value) {
      throw new Error(
        `Public Decision Pack link lost ${key}: expected ${value}, got ${linkUrl.searchParams.get(key)}`
      );
    }
  }

  const qrValues = await qrLocator.evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("data-gsn-trustslip-qr-value") || "")
  );
  for (const value of qrValues) {
    const qrUrl = new URL(value, baseURL);
    if (`${qrUrl.pathname}${qrUrl.search}` !== `${linkUrl.pathname}${linkUrl.search}`) {
      throw new Error(
        `TrustSlip QR value and public Decision Pack link diverged: qr=${value}; link=${publicPackHref}`
      );
    }
  }
}

function assertSignedInHolderReads(requestLog, label) {
  const holderReads = requestLog.filter(
    (entry) => entry.method === "GET" && entry.path.startsWith("/trust-slips/me")
  );
  if (holderReads.length < 1) {
    throw new Error(`${label} did not read signed-in TrustSlip holder endpoints.`);
  }
  const unauthenticated = holderReads.filter((entry) => !entry.authPresent);
  if (unauthenticated.length > 0) {
    throw new Error(`${label} sent unauthenticated holder TrustSlip reads: ${JSON.stringify(unauthenticated)}`);
  }
}

function assertNoPublicVerifyRead(requestLog, label) {
  const publicVerifyReads = requestLog.filter(
    (entry) => entry.method === "GET" && entry.path.startsWith("/trust-slips/verify/")
  );
  if (publicVerifyReads.length > 0) {
    throw new Error(`${label} unexpectedly called public verify on page load: ${JSON.stringify(publicVerifyReads)}`);
  }
}

async function runTrustPassportScenario(browser, baseURL) {
  const secondaryReadGate = createApiGate();
  const trustSlipSummaryGate = createApiGate();
  const state = await newSignedInPage(browser, { secondaryReadGate, trustSlipSummaryGate });
  await state.page.goto(`${baseURL}/app/trust`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.getByText("Aggregate Passport reading", { exact: true })).toBeVisible({ timeout: 7000 });
  await waitForRequest(
    state.requestLog,
    isTrustPassportSummaryRead,
    "Trust Passport background TrustSlip summary request"
  );
  await waitForRequest(
    state.requestLog,
    isTrustPassportExplainabilityRead,
    "Trust Passport background explainability request"
  );
  const secondaryReadsBeforeRelease = trustPassportSecondaryReadCount(state.requestLog);
  if (secondaryReadsBeforeRelease < 1) {
    throw new Error(
      `Trust Passport did not start its secondary guidance/explainability read in the background before release: ${secondaryReadsBeforeRelease}`
    );
  }
  trustSlipSummaryGate.release();
  secondaryReadGate.release();
  await waitForRequest(
    state.requestLog,
    isTrustPassportRecomputeRead,
    "Trust Passport background recompute request after secondary release"
  );
  await expect(state.page.getByText("TrustSlip available", { exact: true }).first()).toBeVisible({ timeout: 7000 });
  await expect(state.page.getByText("Aggregate reading", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Primary anchor", { exact: true }).first()).toBeVisible();
  await expect(state.page.getByText("Community portfolio", { exact: true })).toBeVisible();
  const decisionBoundary = state.page.locator('[data-trust-passport-decision-boundary="compact"]');
  await expect(decisionBoundary).toBeVisible();
  await expect(state.page.locator('details[data-trust-passport-decision-boundary="compact"]:not([open])')).toHaveCount(1);
  await expect(decisionBoundary.getByText("Open limits", { exact: true })).toBeVisible();
  await expect(decisionBoundary.getByText("Reading scope", { exact: true })).toBeHidden();
  const decisionCardMetrics = await state.page.evaluate(() => {
    const card = document.querySelector('[data-trust-passport-decision-first="one-answer-four-facts"]');
    const primaryAction = document.querySelector('[data-cta-id="trust-score.decision-primary-next-step"]');
    const cardRect = card?.getBoundingClientRect();
    const actionRect = primaryAction?.getBoundingClientRect();
    return {
      viewportHeight: window.innerHeight,
      cardBottom: cardRect?.bottom || 0,
      cardHeight: cardRect?.height || 0,
      actionBottom: actionRect?.bottom || 0,
    };
  });
  if (decisionCardMetrics.actionBottom > decisionCardMetrics.viewportHeight - 80) {
    throw new Error(
      `Trust Passport mobile first action is too low: ${JSON.stringify(decisionCardMetrics)}`
    );
  }
  if (decisionCardMetrics.cardHeight > 380) {
    throw new Error(
      `Trust Passport mobile decision card is too tall: ${JSON.stringify(decisionCardMetrics)}`
    );
  }
  await state.page.locator('[data-cta-id="trust-score.decision-boundary.toggle"]').click();
  await expect(decisionBoundary.getByText("Reading scope", { exact: true })).toBeVisible();
  await expect(
    state.page.getByRole("heading", { name: "Identity & Community Overview", exact: true })
  ).toBeVisible({ timeout: 30000 });
  await expect(state.page.getByText("Active passport lane", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Identity & Evidence Reading", { exact: true }).first()).toBeVisible();
  await expect(state.page.getByText("2. Current evidence reading", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Decision support details", { exact: true })).toBeVisible();
  await expect(state.page.getByText("3. What this evidence helps you decide", { exact: true })).toHaveCount(0);
  await expect(
    state.page.getByText("These lines show what this record can and cannot support before a recipient asks for live confirmation.", {
      exact: true,
    })
  ).toHaveCount(0);
  await state.page.locator('[data-cta-id="trust-score.standing-decision-details.toggle"]').click();
  await expect(state.page.getByText("What this evidence helps you decide", { exact: true })).toBeVisible();
  await expect(
    state.page.getByText("These lines show what this record can and cannot support before a recipient asks for live confirmation.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(state.page.getByText("The phone is verified. Recorded bank or ID evidence can strengthen this identity, but provider verification still matters for serious decisions.", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Current Trust Standing", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("Active trust lane", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("Evidence reading note", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Record state note", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("2. Current trust verdict", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("3. What this reading says", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("Community Portfolio", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Active Communities: 5", { exact: true }).first()).toBeVisible();
  await expect(state.page.getByText("Recorded communities", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Current roles", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Administrator (1)").first()).toBeVisible();
  await expect(state.page.getByText("Committee Member (1)").first()).toBeVisible();
  await expect(state.page.getByText("Active in", { exact: false })).toHaveCount(0);
  await state.page.locator('[data-trust-passport-verdict-marker="true"]').scrollIntoViewIfNeeded();
  const mobileLayout = await state.page.evaluate(() => {
    const marker = document.querySelector('[data-trust-passport-verdict-marker="true"]');
    const rail = document.querySelector('[data-trust-passport-evidence-rail="true"]');
    const markerRect = marker?.getBoundingClientRect();
    const railRect = rail?.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      markerText: marker?.textContent?.trim() || "",
      markerRight: markerRect?.right || 0,
      railRight: railRect?.right || 0,
    };
  });
  const overflowWidth = Math.max(
    mobileLayout.documentScrollWidth,
    mobileLayout.bodyScrollWidth,
    mobileLayout.markerRight,
    mobileLayout.railRight
  );
  if (overflowWidth > mobileLayout.innerWidth + 2) {
    throw new Error(
      `Trust Passport mobile standing lane overflowed: ${JSON.stringify(mobileLayout)}`
    );
  }
  if (mobileLayout.markerText.length > 2) {
    throw new Error(
      `Trust Passport evidence posture marker must stay compact, got "${mobileLayout.markerText}".`
    );
  }

  await state.page.getByText("Evidence Story", { exact: true }).first().click();
  await expect(state.page.getByText("4. Why the evidence reads this way", { exact: true })).toBeVisible();
  await expect(state.page.getByText("What supports this reading", { exact: true })).toBeVisible();
  await expect(state.page.getByText("6. What changed in the evidence?", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Evidence movement details", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Recent evidence events", { exact: true })).toHaveCount(0);
  await state.page.locator('[data-cta-id="trust-score.evidence-movement-details.toggle"]').click();
  await expect(state.page.getByText("Recent evidence events", { exact: true })).toBeVisible();
  await expect(state.page.getByText("4. Why this reading looks like this", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("What helps trust", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("6. Why did my trust change?", { exact: true })).toHaveCount(0);

  await state.page.getByText("Community Confirmation", { exact: true }).first().click();
  await expect(state.page.getByText("Can this evidence be tied to a real community?", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Community evidence details", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Community evidence before relying", { exact: true })).toHaveCount(0);
  await state.page.locator('[data-cta-id="trust-score.community-lane.evidence-details.toggle"]').click();
  await expect(state.page.getByText("Community evidence before relying", { exact: true })).toBeVisible();
  await expect(state.page.getByText("5. Evidence surfaces", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Can this trust story be tied to a real community?", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("Community evidence before trust reading", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("5. Trust surfaces", { exact: true })).toHaveCount(0);

  await state.page.getByText("Finance Discipline", { exact: true }).first().click();
  await expect(state.page.getByText("What money discipline adds to the evidence", { exact: true })).toBeVisible();
  await expect(state.page.getByText("This lane explains money-related evidence signals. It does not move money, create a bank guarantee, or start auto-debit. Finance remains the place for the fuller money story.", { exact: true })).toBeVisible();
  await expect(state.page.getByText("GSN is showing whether the record carries enough financial-discipline evidence for careful decisions. It is not promising repayment, collecting money, or replacing the Finance page.", { exact: true })).toBeVisible();
  await expect(state.page.getByText("What money discipline says about trust", { exact: true })).toHaveCount(0);
  await expect(state.page.getByText("This lane explains the trust-facing money signals", { exact: false })).toHaveCount(0);

  await state.page.getByText("Documents / TrustSlip", { exact: true }).first().click();
  await expect(state.page.getByText("7. Shareable trust tools", { exact: true })).toBeVisible();
  await state.page.locator('[data-cta-id="trust-score.documents-lane.preview-details.toggle"]').click();
  const snapshotTitle = state.page
    .locator(".gsn-snapshot-paper-card h3:visible")
    .filter({ hasText: "GSN Trust Passport Snapshot" })
    .first();
  await expect(snapshotTitle).toBeVisible({ timeout: 7000 });
  const snapshotTitleMetrics = await snapshotTitle
    .evaluate((title) => {
      const rect = title.getBoundingClientRect();
      const styles = window.getComputedStyle(title);
      const lineHeight = Number.parseFloat(styles.lineHeight || "0") || 22;
      return {
        width: rect.width,
        height: rect.height,
        lineHeight,
        estimatedLines: Math.round((rect.height / lineHeight) * 10) / 10,
        text: title.textContent?.trim() || "",
        titleWords: Array.from(
          title.querySelectorAll('[data-gsn-snapshot-title-word="true"]')
        ).map((node) => node.textContent?.trim() || ""),
      };
    });
  if (snapshotTitleMetrics.estimatedLines > 3.2 || snapshotTitleMetrics.width < 140) {
    throw new Error(
      `Trust Passport snapshot title is cramped on mobile: ${JSON.stringify(snapshotTitleMetrics)}`
    );
  }
  for (const word of ["GSN", "Trust", "Passport", "Snapshot"]) {
    if (!snapshotTitleMetrics.titleWords.includes(word)) {
      throw new Error(
        `Trust Passport snapshot title lost whole-word rendering for ${word}: ${JSON.stringify(snapshotTitleMetrics)}`
      );
    }
  }

  await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(1);
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(0);
  await expect(state.page.getByText("This passport confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This passport does not confirm", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("Private passport surface", { exact: true })).toBeVisible();
  await expect(state.page.getByText("Identity evidence", { exact: true }).first()).toBeVisible();
  await expect(state.page.getByText("What we checked", { exact: true }).first()).toBeVisible();
  await expect(
    state.page.getByText("This Trust Passport is shown inside the signed-in app and is not the public TrustSlip.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("This is an evidence reading only. It is not a character judgement, universal trust label, or decision about the person.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("Bank approval, credit approval, payment movement, or escrow", { exact: true })
  ).toBeVisible();
  await openMoreLimits(state.page);
  await expect(
    state.page.getByText("That a public TrustSlip exposes the full private Trust Passport", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("Record reference for this visible private Trust Passport", {
      exact: false,
    })
  ).toBeVisible();

  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path === "/auth/me",
    "Trust Passport signed-in me request"
  );
  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path.startsWith("/trust-slips/me"),
    "Trust Passport holder TrustSlip request"
  );
  assertSignedInHolderReads(state.requestLog, "Trust Passport");
  assertNoPublicVerifyRead(state.requestLog, "Trust Passport");
  await closeChecked(state, "Trust Passport scenario");
}

async function runTrustSlipScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.locator('[data-gsn-trustslip-setup-only="true"]')).toHaveCount(0);
  await openTrustSlipHolderFromSetup(state.page);
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(1);
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(0);
  await expect(state.page.locator('[data-gsn-trustslip-purpose-desktop-buttons="true"]')).toHaveCount(0);
  await assertPrimaryShareCopyOpenDoNotReissue(state.page, state.requestLog);
  await openFullTrustSlipDocument(state.page);
  await assertTrustSlipQrCarriesSelectedDecisionPack(state.page, baseURL);
  await expect(state.page.locator('[data-gsn-trustslip-paper-pack-shell="true"]')).toBeVisible();
  const holderDocumentOrder = await state.page.evaluate(() => {
    const certificate = document.querySelector('[data-gsn-trust-document-certificate="trustslip-holder"]');
    const pack = document.querySelector('[data-gsn-trustslip-paper-pack-shell="true"]');
    return {
      certificateTop: certificate?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
      packTop: pack?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY,
    };
  });
  if (!(holderDocumentOrder.certificateTop < holderDocumentOrder.packTop)) {
    throw new Error(
      `TrustSlip holder certificate must render before the secondary pack shell: ${JSON.stringify(holderDocumentOrder)}`
    );
  }
  await expect(state.page.locator('[data-gsn-trustslip-paper-pack-buttons="true"]')).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.paper-pack.share"]')).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.paper-pack.holder"]')).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.paper-pack.community"]')).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.paper-pack.evidence"]')).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.paper-pack.limits"]')).toBeVisible();
  const privateReadsBeforeOpen = privateDecisionPackReadCount(state.requestLog);
  if (privateReadsBeforeOpen !== 0) {
    throw new Error(
      `TrustSlip loaded private Decision Pack reads before the holder opened a private drawer: ${privateReadsBeforeOpen}`
    );
  }

  await state.page.locator('[data-cta-id="trust-slip.paper-pack.limits"]').click();
  const limitsPanel = state.page.locator('[data-gsn-trustslip-paper-pack-panel="limits"]');
  await expect(limitsPanel).toBeVisible();
  await expect(limitsPanel.getByText("This TrustSlip confirms", { exact: true })).toBeVisible();
  await expect(limitsPanel.getByText("This TrustSlip does not confirm", { exact: true })).toBeVisible();
  await expect(
    limitsPanel.getByText("Bank approval, credit approval, payment movement, or escrow", { exact: true })
  ).toBeVisible();
  await limitsPanel.locator("summary").filter({ hasText: "More limits" }).first().click();
  await expect(
    limitsPanel.getByText("Authority to release goods, money, credit, or services", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    limitsPanel.getByText("Private Trust Passport history, private notes, private contacts, or admin records", {
      exact: true,
    })
  ).toBeVisible();
  await expect(limitsPanel.getByText("Audit Details", { exact: true })).toBeVisible();
  await limitsPanel.locator("summary").filter({ hasText: "More security details" }).first().click();
  await expect(
    limitsPanel.getByText(
      "This TrustSlip is a short portable summary. It does not expose the holder's private Trust Passport, private notes, contacts, or admin records.",
      { exact: true }
    )
  ).toBeVisible();

  await state.page.locator('[data-cta-id="trust-slip.paper-pack.evidence"]').click();
  const evidencePanel = state.page.locator('[data-gsn-trustslip-paper-pack-panel="evidence"]');
  await expect(evidencePanel).toBeVisible();
  await expect(evidencePanel.getByText("Evidence pack", { exact: true })).toBeVisible();
  await expect(
    state.page.getByText("This section separates the primary community anchor from wider evidence context, so the recipient does not mistake one community label for the whole judgement.", {
      exact: false,
    })
  ).toHaveCount(0);

  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path === "/auth/me",
    "TrustSlip signed-in me request"
  );
  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path.startsWith("/trust-slips/me"),
    "TrustSlip holder TrustSlip request"
  );
  assertSignedInHolderReads(state.requestLog, "TrustSlip holder");
  assertNoPublicVerifyRead(state.requestLog, "TrustSlip holder");
  await closeChecked(state, "TrustSlip holder scenario");
}

async function runTrustSlipStateScenario(browser, baseURL, scenario) {
  const state = await newSignedInPage(browser, {
    trustSlipSummary: trustSlipSummaryPayload(scenario.overrides),
  });
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const holderOpened = await openTrustSlipHolderFromSetup(state.page, {
    setupOnly: Boolean(scenario.setupOnly),
  });
  if (holderOpened) {
    await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(1);
    await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(0);

    if (scenario.paperPack) {
      await openFullTrustSlipDocument(state.page);
      await state.page.locator(`[data-cta-id="trust-slip.paper-pack.${scenario.paperPack}"]`).click();
      const packPanel = state.page.locator(`[data-gsn-trustslip-paper-pack-panel="${scenario.paperPack}"]`);
      await expect(packPanel).toBeVisible();
      if (scenario.openMoreLimits) {
        await packPanel.locator("summary").filter({ hasText: "More limits" }).first().click();
      }
      if (scenario.openSecurityDetails) {
        await packPanel.locator("summary").filter({ hasText: "More security details" }).first().click();
      }
    }
  } else {
    await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(0);
    await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(0);
  }

  for (const text of scenario.visibleText) {
    await expect(state.page.getByText(text, { exact: false }).filter({ visible: true }).first()).toBeVisible();
  }

  for (const debugId of scenario.absentCtas || []) {
    await expect(state.page.locator(`[data-cta-id="${debugId}"]`)).toHaveCount(0);
  }

  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path.startsWith("/trust-slips/me"),
    `${scenario.label} holder TrustSlip request`
  );
  assertSignedInHolderReads(state.requestLog, scenario.label);
  assertNoPublicVerifyRead(state.requestLog, scenario.label);
  await closeChecked(state, `${scenario.label} scenario`);
}

async function assertPrimaryShareCopyOpenDoNotReissue(page, requestLog) {
  const before = trustSlipReissueWriteCount(requestLog);
  const share = page.locator('[data-cta-id="trust-slip.primary.share"]');
  const copy = page.locator('[data-cta-id="trust-slip.primary.copy-message"]');
  const openLink = page.locator('[data-cta-id="trust-slip.primary.open-link"]');

  await expect(share).toBeEnabled({ timeout: 30000 });
  await share.click();
  const sharePayloads = await page.evaluate(() => window.__gsnSharePayloads || []);
  if (!sharePayloads.length || !String(sharePayloads[0]?.text || "").includes("Employment Decision Pack")) {
    throw new Error(`TrustSlip share did not preserve selected purpose: ${JSON.stringify(sharePayloads)}`);
  }
  if (!String(sharePayloads[0]?.url || "").includes("decision_pack=employment_decision")) {
    throw new Error(`TrustSlip share link did not preserve selected purpose: ${JSON.stringify(sharePayloads[0])}`);
  }
  if (String(sharePayloads[0]?.text || "").includes("/t/")) {
    throw new Error(`Native share text duplicated the TrustSlip URL instead of using the url field: ${JSON.stringify(sharePayloads[0])}`);
  }
  if (!String(sharePayloads[0]?.text || "").includes("GSN TrustSlip")) {
    throw new Error(`Native share text did not use compact GSN TrustSlip preview: ${JSON.stringify(sharePayloads[0])}`);
  }

  await copy.click();
  const clipboardTexts = await page.evaluate(() => window.__gsnClipboardTexts || []);
  const latestClipboard = String(clipboardTexts[clipboardTexts.length - 1] || "");
  const clipboardUrlCount = (latestClipboard.match(/\/t\//g) || []).length;
  if (!latestClipboard.includes("GSN TrustSlip") || !latestClipboard.includes("Employment Decision Pack")) {
    throw new Error(`Clipboard fallback did not keep compact purpose context: ${JSON.stringify(latestClipboard)}`);
  }
  if (clipboardUrlCount !== 1) {
    throw new Error(`Clipboard fallback must include exactly one TrustSlip URL, got ${clipboardUrlCount}: ${JSON.stringify(latestClipboard)}`);
  }
  await openLink.evaluate((node) => {
    node.addEventListener("click", (event) => event.preventDefault(), { once: true });
  });
  await openLink.click();
  await wait(150);

  const after = trustSlipReissueWriteCount(requestLog);
  if (after !== before) {
    throw new Error(`Share/copy/open called TrustSlip reissue: before=${before}; after=${after}`);
  }
}
function trustSlipReissueWriteCount(requestLog) {
  return requestLog.filter((entry) => entry.method === "POST" && entry.path === "/trust-slips/me/reissue").length;
}

function trustSlipHolderReadCount(requestLog) {
  return requestLog.filter(
    (entry) =>
      entry.method === "GET" &&
      [
        "/trust-slips/me/summary",
        "/trust-slips/me",
        "/trust-slips/me-summary",
        "/trust-slips/summary/me",
      ].includes(entry.path)
  ).length;
}
function recoveredBlessedTrustSlipSummary(overrides = {}) {
  return trustSlipSummaryPayload({
    code: recoveredTrustSlipCode,
    verification_code: recoveredTrustSlipCode,
    verification_token: recoveredTrustSlipCode,
    token: recoveredTrustSlipCode,
    public_verify_url: `/t/${encodeURIComponent(recoveredTrustSlipCode)}`,
    community: "Blessed Satch family Marketplace",
    community_id: selectedClanId,
    clan_id: selectedClanId,
    community_global_id: "GMFN-C-BLESSED-SATCH",
    community_code: "GMFN-C-BLESSED-SATCH",
    merchant_summary: {
      community: "Blessed Satch family Marketplace",
    },
    ...overrides,
  });
}

async function runTrustSlipRecoveredAnchorMismatchScenario(browser, baseURL) {
  const state = await newSignedInPage(browser, {
    selectedClanStorageId: homelandClanId,
    clanRows: [homelandClanPayload(), blessedClanPayload()],
    trustSlipSummary: recoveredBlessedTrustSlipSummary(),
  });
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  const holderCertificate = state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]');
  const setupPanel = state.page.locator('[data-gsn-trustslip-setup-only="true"]');
  const scopeSelect = state.page.getByLabel("Choose TrustSlip community");

  await expect(holderCertificate).toHaveCount(1, { timeout: 30000 });
  await expect(holderCertificate).toBeHidden();
  await expect(setupPanel).toHaveCount(0);
  await expect(scopeSelect).toHaveValue(`community:${selectedClanId}`);
  await expect(state.page.getByText(recoveredTrustSlipCode, { exact: false }).first()).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.share"]').first()).toBeEnabled();
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.open-link"]').first()).toHaveAttribute("href", new RegExp(recoveredTrustSlipCode));
  if (trustSlipReissueWriteCount(state.requestLog) !== 0) {
    throw new Error("Recovered existing TrustSlip mismatch path must not POST /trust-slips/me/reissue.");
  }

  await scopeSelect.selectOption(`community:${homelandClanId}`);
  await expect(scopeSelect).toHaveValue(`community:${homelandClanId}`);
  await expect(state.page.getByText("Generate TrustSlip", { exact: true })).toBeVisible();
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.share"]')).toBeDisabled();
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.open-link"]').filter({ visible: true })).toHaveCount(0);
  if (trustSlipReissueWriteCount(state.requestLog) !== 0) {
    throw new Error("Deliberate selected-community change must not auto issue or reissue TrustSlip.");
  }
  assertSignedInHolderReads(state.requestLog, "recovered existing TrustSlip anchor mismatch");
  assertNoPublicVerifyRead(state.requestLog, "recovered existing TrustSlip anchor mismatch");
  await closeChecked(state, "recovered existing TrustSlip anchor mismatch scenario");
}
async function runTrustSlipSummaryAfterClanListScenario(browser, baseURL) {
  const trustSlipSummaryGate = createApiGate();
  const state = await newSignedInPage(browser, {
    selectedClanStorageId: homelandClanId,
    clanRows: [homelandClanPayload(), blessedClanPayload()],
    trustSlipSummary: recoveredBlessedTrustSlipSummary(),
    trustSlipSummaryGate,
  });
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.locator('[data-gsn-trustslip-setup-only="true"]')).toBeVisible({ timeout: 30000 });
  trustSlipSummaryGate.release();
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(1, {
    timeout: 30000,
  });
  await expect(state.page.getByLabel("Choose TrustSlip community")).toHaveValue(`community:${selectedClanId}`);
  await closeChecked(state, "TrustSlip summary-after-clan-list scenario");
}

async function runTrustSlipClanListAfterSummaryScenario(browser, baseURL) {
  const clanListGate = createApiGate();
  const state = await newSignedInPage(browser, {
    selectedClanStorageId: homelandClanId,
    clanRows: [homelandClanPayload(), blessedClanPayload()],
    trustSlipSummary: recoveredBlessedTrustSlipSummary(),
    clanListGate,
    gateClanListAfter: 1,
  });
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "GET" && entry.path === "/trust-slips/me/summary",
    "TrustSlip summary request before delayed clan-list release"
  );
  clanListGate.release();
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(1, {
    timeout: 30000,
  });
  await expect(state.page.getByLabel("Choose TrustSlip community")).toHaveValue(`community:${selectedClanId}`);
  await closeChecked(state, "TrustSlip clan-list-after-summary scenario");
}
async function runTrustSlipGenerateWithFailedSecondaryRefreshScenario(browser, baseURL) {
  const state = await newSignedInPage(browser, {
    trustSlipSummary: trustSlipSummaryPayload({
      code: "",
      verification_code: "",
      verification_token: "",
      token: "",
      public_verify_url: "",
      merchant_view: { code: "", verification_code: "", verification_token: "", token: "", public_verify_url: "" },
    }),
    failTrustSlipSummaryAfterReissue: true,
  });
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.locator('[data-gsn-trustslip-setup-only="true"]')).toBeVisible({ timeout: 30000 });
  await state.page.locator('[data-cta-id="trust-slip.setup.submit"]').click();
  await assertPrimaryTrustSlipMobileJourneyVisible(state.page, "GSN-TRUSTSLIP-REISSUED");
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.share"]')).toBeEnabled();
  if (trustSlipReissueWriteCount(state.requestLog) !== 1) {
    throw new Error(`Generate with failed secondary refresh expected exactly one reissue, got ${trustSlipReissueWriteCount(state.requestLog)}`);
  }
  assertSignedInHolderReads(state.requestLog, "TrustSlip generate with failed secondary refresh");
  state.consoleErrors.length = 0;
  await closeChecked(state, "TrustSlip generate with failed secondary refresh scenario");
}

async function runTrustSlipGenerateWithPendingSecondaryRefreshScenario(browser, baseURL) {
  const trustSlipSummaryAfterReissueGate = createApiGate();
  const pendingCode = "GSN-TRUSTSLIP-PENDING-REFRESH";
  const blankInitialSummary = trustSlipSummaryPayload({
    code: "",
    verification_code: "",
    verification_token: "",
    token: "",
    public_verify_url: "",
    merchant_view: { code: "", verification_code: "", verification_token: "", public_verify_url: "" },
  });
  const issuedSummary = trustSlipSummaryPayload({
    code: pendingCode,
    verification_code: pendingCode,
    verification_token: pendingCode,
    token: pendingCode,
    public_verify_url: `/t/${encodeURIComponent(pendingCode)}`,
    issued_at: "2026-10-06T10:30:00.000Z",
    created_at: "2026-10-06T10:30:00.000Z",
    community: "Boundary Evidence Community",
    community_id: selectedClanId,
    clan_id: selectedClanId,
    community_global_id: "GMFN-C-TRUST-BOUNDARY",
    community_code: "GMFN-C-TRUST-BOUNDARY",
    merchant_summary: {
      community: "Boundary Evidence Community",
    },
  });
  const state = await newSignedInPage(browser, {
    trustSlipSummary: blankInitialSummary,
    trustSlipReissueResult: issuedSummary,
    trustSlipSummaryAfterReissueGate,
    trustSlipSummaryAfterReissueResult: issuedSummary,
  });
  let released = false;

  try {
    await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await expect(state.page.locator('[data-gsn-trustslip-setup-only="true"]')).toBeVisible({ timeout: 30000 });
    const holderReadsBeforeGenerate = trustSlipHolderReadCount(state.requestLog);
    await state.page.locator('[data-cta-id="trust-slip.setup.submit"]').click();
    await waitForRequest(
      state.requestLog,
      (entry) => entry.method === "POST" && entry.path === "/trust-slips/me/reissue",
      "pending-secondary TrustSlip issuance request"
    );
    await expect
      .poll(() => trustSlipHolderReadCount(state.requestLog), { timeout: 7000 })
      .toBeGreaterThan(holderReadsBeforeGenerate);

    await assertPrimaryTrustSlipMobileJourneyVisible(state.page, pendingCode);
    await expect(state.page.locator('[data-gsn-trustslip-primary-purpose="true"] select')).toHaveValue(
      "employment_decision"
    );
    await expect(state.page.getByLabel("Choose TrustSlip community")).toHaveValue(`community:${selectedClanId}`);
    await expect(state.page.locator('[data-gsn-trustslip-full-disclosure="closed-by-default"]')).not.toHaveAttribute(
      "open",
      /./
    );
    await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toBeHidden();

    const compactMetrics = await state.page.evaluate(() => {
      const box = (selector) => {
        const node = document.querySelector(selector);
        const rect = node?.getBoundingClientRect();
        return rect
          ? { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right, width: rect.width, height: rect.height }
          : null;
      };
      return {
        viewportHeight: window.innerHeight,
        purpose: box('[data-gsn-trustslip-primary-purpose="true"]'),
        community: box('[data-gsn-trustslip-primary-community="true"]'),
        code: box('[data-gsn-trustslip-result-code="true"]'),
        share: box('[data-cta-id="trust-slip.primary.share"]'),
      };
    });
    for (const [name, rect] of Object.entries(compactMetrics)) {
      if (name === "viewportHeight") continue;
      if (!rect || rect.top < -2 || rect.bottom > compactMetrics.viewportHeight + 2) {
        throw new Error(`Pending-refresh ${name} control was not visible in compact mobile viewport: ${JSON.stringify(compactMetrics)}`);
      }
    }

    await state.page.locator('[data-cta-id="trust-slip.primary.share"]').click();
    const sharePayloads = await state.page.evaluate(() => window.__gsnSharePayloads || []);
    const latestShare = sharePayloads[sharePayloads.length - 1] || {};
    if (!String(latestShare.url || "").includes(`/t/${encodeURIComponent(pendingCode)}`)) {
      throw new Error(`Pending-refresh share URL did not use the new code: ${JSON.stringify(latestShare)}`);
    }
    if (!String(latestShare.url || "").includes("decision_pack=employment_decision")) {
      throw new Error(`Pending-refresh share URL did not preserve purpose: ${JSON.stringify(latestShare)}`);
    }
    if (!String(latestShare.text || "").includes("Employment Decision Pack")) {
      throw new Error(`Pending-refresh share text did not preserve purpose context: ${JSON.stringify(latestShare)}`);
    }
    if (trustSlipReissueWriteCount(state.requestLog) !== 1) {
      throw new Error(
        `Pending-refresh scenario expected exactly one reissue, got ${trustSlipReissueWriteCount(state.requestLog)}`
      );
    }
  } finally {
    trustSlipSummaryAfterReissueGate.release();
    released = true;
    await wait(150);
    state.consoleErrors.length = 0;
    await closeChecked(state, "TrustSlip successful issuance with pending secondary refresh scenario");
  }

  if (!released) {
    throw new Error("Pending-refresh secondary gate was not released during cleanup.");
  }
}
function trustSlipIssueSummaryForCode(code, overrides = {}) {
  return trustSlipSummaryPayload({
    code,
    verification_code: code,
    verification_token: code,
    token: code,
    public_verify_url: `/t/${encodeURIComponent(code)}`,
    issued_at: "2026-10-06T10:30:00.000Z",
    created_at: "2026-10-06T10:30:00.000Z",
    expires_at: "2035-10-06T10:30:00.000Z",
    community: "Boundary Evidence Community",
    community_id: selectedClanId,
    clan_id: selectedClanId,
    community_global_id: "GMFN-C-TRUST-BOUNDARY",
    community_code: "GMFN-C-TRUST-BOUNDARY",
    merchant_summary: {
      community: "Boundary Evidence Community",
    },
    merchant_view: {
      code,
      verification_code: code,
      verification_token: code,
      token: code,
      public_verify_url: `/t/${encodeURIComponent(code)}`,
      active: true,
      is_current: true,
    },
    ...overrides,
  });
}

function emptyTrustSlipIssueSummary() {
  return trustSlipSummaryPayload({
    code: "",
    verification_code: "",
    verification_token: "",
    token: "",
    public_verify_url: "",
    merchant_view: { code: "", verification_code: "", verification_token: "", token: "", public_verify_url: "" },
  });
}

async function runTrustSlipSecondaryReconciliationScenario(browser, baseURL, scenario) {
  const code = scenario.code;
  const issuedSummary = trustSlipIssueSummaryForCode(code, scenario.issuedOverrides || {});
  const state = await newSignedInPage(browser, {
    trustSlipSummary: emptyTrustSlipIssueSummary(),
    trustSlipReissueResult: issuedSummary,
    trustSlipSummaryAfterReissueResult: scenario.secondarySummary,
    failTrustSlipSummaryAfterReissue: Boolean(scenario.failSecondarySummary),
  });

  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.locator('[data-gsn-trustslip-setup-only="true"]')).toBeVisible({ timeout: 30000 });
  const holderReadsBeforeGenerate = trustSlipHolderReadCount(state.requestLog);
  await state.page.locator('[data-cta-id="trust-slip.setup.submit"]').click();
  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "POST" && entry.path === "/trust-slips/me/reissue",
    `${scenario.label} TrustSlip issuance request`
  );
  await expect
    .poll(() => trustSlipHolderReadCount(state.requestLog), { timeout: 7000 })
    .toBeGreaterThan(holderReadsBeforeGenerate);

  await assertPrimaryTrustSlipMobileJourneyVisible(state.page, code);
  await expect(state.page.locator('[data-gsn-trustslip-primary-purpose="true"] select')).toHaveValue(
    "employment_decision"
  );
  await expect(state.page.getByLabel("Choose TrustSlip community")).toHaveValue(`community:${selectedClanId}`);

  const share = state.page.locator('[data-cta-id="trust-slip.primary.share"]');
  if (scenario.shareEnabled === false) {
    await expect(share).toBeDisabled({ timeout: 30000 });
  } else {
    await expect(share).toBeEnabled({ timeout: 30000 });
    await share.click();
    const sharePayloads = await state.page.evaluate(() => window.__gsnSharePayloads || []);
    const latestShare = sharePayloads[sharePayloads.length - 1] || {};
    if (!String(latestShare.url || "").includes(`/t/${encodeURIComponent(code)}`)) {
      throw new Error(`${scenario.label} share URL did not use the confirmed code: ${JSON.stringify(latestShare)}`);
    }
    if (!String(latestShare.text || "").includes("Employment Decision Pack")) {
      throw new Error(`${scenario.label} share text did not preserve purpose: ${JSON.stringify(latestShare)}`);
    }
  }

  if (trustSlipReissueWriteCount(state.requestLog) !== 1) {
    throw new Error(
      `${scenario.label} expected exactly one reissue, got ${trustSlipReissueWriteCount(state.requestLog)}`
    );
  }

  await openFullTrustSlipDocument(state.page);
  if (scenario.detailsPending) {
    await expect(state.page.locator('[data-gsn-trustslip-detail-loading="true"]')).toBeVisible({ timeout: 30000 });
  } else {
    await expect(state.page.locator('[data-gsn-trustslip-detail-loading="true"]')).toHaveCount(0);
  }

  if (scenario.absentText) {
    for (const text of scenario.absentText) {
      await expect(state.page.getByText(text, { exact: false })).toHaveCount(0);
    }
  }
  for (const text of scenario.visibleText || []) {
    await expect(state.page.getByText(text, { exact: false }).filter({ visible: true }).first()).toBeVisible();
  }
  state.consoleErrors.length = 0;
  await closeChecked(state, `${scenario.label} scenario`);
}

async function runTrustSlipSecondaryReconciliationScenarios(browser, baseURL) {
  const staleCode = "GSN-TS-OLD";
  const newCode = "GSN-TS-NEW";
  await runTrustSlipSecondaryReconciliationScenario(browser, baseURL, {
    label: "old secondary summary cannot relabel new TrustSlip",
    code: newCode,
    secondarySummary: trustSlipIssueSummaryForCode(staleCode, {
      issued_at: "2026-10-05T08:00:00.000Z",
      created_at: "2026-10-05T08:00:00.000Z",
      community_activity_label: "STALE SECONDARY EVIDENCE MUST NOT LEAK",
      merchant_summary: {
        community: "Boundary Evidence Community",
        community_activity_label: "STALE SECONDARY EVIDENCE MUST NOT LEAK",
      },
    }),
    detailsPending: true,
    absentText: [staleCode, "STALE SECONDARY EVIDENCE MUST NOT LEAK"],
  });

  const restrictedCode = "GSN-TS-REVOKED";
  await runTrustSlipSecondaryReconciliationScenario(browser, baseURL, {
    label: "same-code revoked secondary disables TrustSlip sharing",
    code: restrictedCode,
    secondarySummary: trustSlipIssueSummaryForCode(restrictedCode, {
      status: "revoked",
      active: false,
      is_current: true,
      merchant_view: {
        code: restrictedCode,
        verification_code: restrictedCode,
        verification_token: restrictedCode,
        token: restrictedCode,
        public_verify_url: `/t/${encodeURIComponent(restrictedCode)}`,
        active: false,
        is_current: true,
        status: "revoked",
      },
    }),
    shareEnabled: false,
    detailsPending: false,
    visibleText: ["Revoked"],
  });

  const notCurrentCode = "GSN-TS-NOT-CURRENT";
  await runTrustSlipSecondaryReconciliationScenario(browser, baseURL, {
    label: "same-code not-current secondary stays not current",
    code: notCurrentCode,
    secondarySummary: trustSlipIssueSummaryForCode(notCurrentCode, {
      is_current: false,
      merchant_view: {
        code: notCurrentCode,
        verification_code: notCurrentCode,
        verification_token: notCurrentCode,
        public_verify_url: `/t/${encodeURIComponent(notCurrentCode)}`,
        active: true,
        is_current: false,
      },
    }),
    shareEnabled: false,
    detailsPending: false,
    visibleText: ["Do not rely"],
  });

  const nullDetailCode = "GSN-TS-NULL";
  await runTrustSlipSecondaryReconciliationScenario(browser, baseURL, {
    label: "null secondary details preserve confirmed TrustSlip",
    code: nullDetailCode,
    secondarySummary: null,
    detailsPending: true,
    visibleText: ["Some document details"],
  });

  const healthyCode = "GSN-TS-HEALTHY";
  await runTrustSlipSecondaryReconciliationScenario(browser, baseURL, {
    label: "healthy matching secondary summary completes TrustSlip details",
    code: healthyCode,
    secondarySummary: trustSlipIssueSummaryForCode(healthyCode, {
      community_activity_label: "Healthy secondary evidence loaded",
      merchant_summary: {
        community: "Boundary Evidence Community",
        community_activity_label: "Healthy secondary evidence loaded",
      },
    }),
    detailsPending: false,
    visibleText: ["Healthy secondary evidence loaded"],
  });
}
async function runTrustSlipFailedIssuanceScenario(browser, baseURL) {
  const state = await newSignedInPage(browser, {
    trustSlipSummary: trustSlipSummaryPayload({
      code: "",
      verification_code: "",
      verification_token: "",
      token: "",
      public_verify_url: "",
      merchant_view: { code: "", verification_code: "", verification_token: "", public_verify_url: "" },
    }),
    failTrustSlipReissue: true,
  });
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.locator('[data-gsn-trustslip-setup-only="true"]')).toBeVisible({ timeout: 30000 });
  await state.page.locator('[data-cta-id="trust-slip.setup.submit"]').click();
  await waitForRequest(
    state.requestLog,
    (entry) => entry.method === "POST" && entry.path === "/trust-slips/me/reissue",
    "failed TrustSlip issuance request"
  );
  await expect(state.page.locator('[data-gsn-trustslip-primary-journey="true"]')).toHaveCount(0);
  await expect(state.page.locator('[data-cta-id="trust-slip.setup.share-current"]')).toHaveCount(0);
  if (trustSlipReissueWriteCount(state.requestLog) !== 1) {
    throw new Error(`Failed issuance expected exactly one reissue attempt, got ${trustSlipReissueWriteCount(state.requestLog)}`);
  }
  state.consoleErrors.length = 0;
  await closeChecked(state, "TrustSlip failed issuance scenario");
}

async function runTrustSlipPurposeChangeShareScenario(browser, baseURL) {
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/app/trust-slip?decision_pack=employment_decision`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await openTrustSlipHolderFromSetup(state.page);
  const before = trustSlipReissueWriteCount(state.requestLog);
  await state.page.locator('[data-gsn-trustslip-primary-purpose="true"] select').selectOption("housing_decision");
  await expect(state.page.locator('[data-gsn-trustslip-primary-purpose="true"] select')).toHaveValue("housing_decision");
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.open-link"]')).toHaveAttribute("href", /decision_pack=housing_decision/);
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.share"]')).toBeEnabled();

  assertPublicHousingShareContactBoundary();

  await state.page.locator('[data-cta-id="trust-slip.primary.share"]').click();
  let sharePayloads = await state.page.evaluate(() => window.__gsnSharePayloads || []);
  let latest = sharePayloads[sharePayloads.length - 1] || {};
  if (!String(latest.url || "").includes("decision_pack=housing_decision")) {
    throw new Error(`Purpose change share link did not preserve housing purpose: ${JSON.stringify(latest)}`);
  }
  if (!String(latest.text || "").includes("Housing Decision Pack")) {
    throw new Error(`Purpose change share message did not preserve housing purpose: ${JSON.stringify(latest)}`);
  }
  if (String(latest.text || "").includes("Optional external follow-up contact")) {
    throw new Error(`Ordinary Housing share leaked external-contact wording: ${JSON.stringify(latest)}`);
  }

  await state.page.locator('[data-gsn-trustslip-primary-purpose="true"] select').selectOption("trade_check");
  await expect(state.page.locator('[data-gsn-trustslip-primary-purpose="true"] select')).toHaveValue("trade_check");
  await expect(state.page.locator('[data-cta-id="trust-slip.primary.open-link"]')).toHaveAttribute("href", /decision_pack=trade_check/);
  await state.page.locator('[data-cta-id="trust-slip.primary.share"]').click();
  sharePayloads = await state.page.evaluate(() => window.__gsnSharePayloads || []);
  latest = sharePayloads[sharePayloads.length - 1] || {};
  if (!String(latest.url || "").includes("decision_pack=trade_check")) {
    throw new Error(`Trade share link did not preserve Trade purpose: ${JSON.stringify(latest)}`);
  }
  if (!String(latest.text || "").includes("Trade or Skilled Work Decision Pack")) {
    throw new Error(`Trade share message did not preserve Trade purpose: ${JSON.stringify(latest)}`);
  }
  if ((String(latest.text || "").match(/\/t\//g) || []).length !== 0) {
    throw new Error(`Native Trade share text duplicated the TrustSlip URL: ${JSON.stringify(latest)}`);
  }
  const after = trustSlipReissueWriteCount(state.requestLog);
  if (after !== before) {
    throw new Error(`Purpose change share called TrustSlip reissue: before=${before}; after=${after}`);
  }
  await closeChecked(state, "TrustSlip purpose change share scenario");
}
async function runPublicTradeEvidenceScenario(browser, baseURL, scenario) {
  const state = await newSignedInPage(browser, {
    publicVerifyResult: tradePublicVerifyPayload(scenario.payload || {}),
  });
  try {
    await state.page.goto(
      `${baseURL}/t/${encodeURIComponent(trustSlipCode)}?decision_pack=trade_check&access_purpose=${encodeURIComponent("Trade or Skilled Work Decision Pack")}&access_scope=community_specific`,
      { waitUntil: "domcontentloaded", timeout: 60000 }
    );

    await expect(state.page.getByText(scenario.headline, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 30000 });
    if (scenario.openDetails) {
      await state.page.locator("summary").filter({ hasText: "Trade or Skilled Work Decision Pack" }).first().click();
      const evidenceDetails = state.page.locator("summary").filter({ hasText: "Decision evidence details" }).first();
      if (await evidenceDetails.count()) await evidenceDetails.click();
    }
    for (const text of scenario.visibleText || []) {
      await expect(state.page.getByText(text, { exact: false }).filter({ visible: true }).first()).toBeVisible({ timeout: 30000 });
    }
    for (const text of scenario.absentText || []) {
      await expect(state.page.getByText(text, { exact: false }).filter({ visible: true })).toHaveCount(0);
    }
    if (state.requestLog.some((entry) => entry.method === "POST" && entry.path === "/trust-slips/me/reissue")) {
      throw new Error(`${scenario.label} must not call TrustSlip reissue from public verify.`);
    }
  } finally {
    state.consoleErrors.length = 0;
    await closeChecked(state, `public Trade evidence ${scenario.label} scenario`);
  }
}

async function runPublicTradeEvidenceScenarios(browser, baseURL) {
  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "identity-membership-only",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        categories: [],
        declared_claims: [],
        private_system_note: "do not surface private note",
      }),
    },
    headline: "Trade evidence not shown; ask for confirmation",
    visibleText: ["Not shown: no qualifying Trade records"],
    absentText: ["Suitable for a low-risk trade check", "Use for low-risk decisions", "do not surface private note"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "declaration-only",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        declared_claims: [
          {
            key: "shop_service_declaration",
            label: "Declared work/service claim",
            status: "available",
            value: "Repair service listing shown",
            source: "marketplace_shop",
            evidence_count: 1,
            decision_use: "Claim pointer only; ask for confirmation.",
          },
        ],
      }),
    },
    headline: "Trade claim shown; completed-work proof still separate",
    openDetails: true,
    visibleText: ["declaration is a claim pointer", "Repair service listing shown"],
    absentText: ["Suitable for a low-risk trade check"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "pending-confirmation-request-no-outcome",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        confirmation_pointers: [
          {
            key: "community_witness_outcome",
            label: "Community witness outcome",
            status: "pending",
            value: "1 community confirmation request is pending.",
            source: "community_confirmation_requests",
            evidence_count: 1,
            decision_use: "Request recorded; response/outcome pending.",
          },
        ],
      }),
    },
    headline: "Trade confirmation request pending",
    openDetails: true,
    visibleText: ["request is recorded", "does not show a witness response or outcome", "1 community confirmation request is pending"],
    absentText: ["Trade confirmation aggregate shown", "community witness evidence exists", "favourable confirmation exists"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "response-outcome-aggregate-without-positivity",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        confirmation_pointers: [
          {
            key: "community_witness_outcome",
            label: "Community witness outcome",
            status: "available",
            value: "2 community confirmation responses/outcomes are available as an aggregate.",
            source: "community_confirmation_requests",
            evidence_count: 2,
            decision_use: "Aggregate only; public view does not classify positivity.",
          },
        ],
      }),
    },
    headline: "Trade confirmation aggregate shown; recipient still verifies",
    openDetails: true,
    visibleText: ["does not classify it as favourable", "2 community confirmation responses/outcomes"],
    absentText: ["Suitable for a low-risk trade check", "favourable confirmation exists"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "completed-work-customer-feedback-caution",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        completed_work_pointers: [
          {
            key: "completed_work_customer_feedback",
            label: "Completed work/customer feedback",
            status: "customer_feedback_caution",
            value: "Customer feedback includes a caution marker.",
            source: "trust_events+marketplace_reviews",
            evidence_count: 1,
            decision_use: "Caution only; inspect context before relying.",
          },
        ],
      }),
    },
    headline: "Trade customer-feedback caution shown; review context first",
    openDetails: true,
    visibleText: ["not automatic proof of wrongdoing", "Customer feedback includes a caution marker"],
    absentText: ["unresolved dispute", "Suitable for a low-risk trade check"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "gap-row-positive-count-does-not-support",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        completed_work_pointers: [
          {
            key: "completed_work_gap",
            label: "Completed work gap",
            status: "gap",
            value: "Historical work prose says records may exist.",
            source: "trust_events_redacted_extract",
            evidence_count: 3,
            decision_use: "Gap only; do not treat the count as support.",
          },
        ],
      }),
    },
    headline: "Trade evidence row is limited; confirmation still needed",
    openDetails: true,
    visibleText: ["Counts or descriptive notes", "Historical work prose says records may exist"],
    absentText: ["Trade outcome evidence shown", "completed-work aggregate exists"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "unresolved-review-limited-not-dispute",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        issue_resolution_pointers: [
          {
            key: "general_review_pointer",
            label: "Issue resolution pointer",
            status: "caution_open_review",
            value: "One correction review is still open.",
            source: "community_confirmation_reviews",
            evidence_count: 1,
            decision_use: "Resolve before relying.",
          },
        ],
      }),
    },
    headline: "Trade review or correction pointer needs review",
    openDetails: true,
    visibleText: ["general review pointer is not treated as a trade-specific dispute", "One correction review is still open"],
    absentText: ["unresolved dispute", "Suitable for a low-risk trade check"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "resolved-correction-not-unresolved",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        issue_resolution_pointers: [
          {
            key: "general_review_pointer",
            label: "Issue resolution pointer",
            status: "corrected",
            value: "Earlier review was corrected by community record update.",
            source: "community_confirmation_reviews",
            evidence_count: 1,
            decision_use: "Correction context only; inspect scope.",
          },
        ],
      }),
    },
    headline: "Trade review or correction information shown as resolved",
    openDetails: true,
    visibleText: ["resolved or corrected status", "Earlier review was corrected"],
    absentText: ["unresolved dispute", "needs review before relying"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "unavailable-data",
    payload: {
      evidenceExtract: {
        availability_status: "unavailable",
        source: "trust_events_redacted_extract",
        source_note: "Evidence extract unavailable in this synthetic response.",
      },
    },
    headline: "Trade evidence unavailable on this public view",
    visibleText: ["Unavailable: Trade-specific public evidence was not included"],
    absentText: ["No qualifying public Trade records are included"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "expired-not-current-document",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        confirmation_pointers: [
          {
            key: "community_witness_outcome",
            label: "Community witness outcome",
            status: "available",
            value: "Trade-skill witness aggregate shown",
            source: "community_confirmation_requests",
            evidence_count: 1,
          },
        ],
      }),
      is_current: false,
      status: "replaced",
    },
    headline: "Fresh TrustSlip needed before trade evidence review",
    visibleText: ["Request a fresh TrustSlip"],
    absentText: ["Trade confirmation aggregate shown; recipient still verifies"],
  });

  await runPublicTradeEvidenceScenario(browser, baseURL, {
    label: "healthy-matching-evidence",
    payload: {
      evidenceExtract: tradeEvidenceExtract({
        fulfillment_outcome_pointers: [
          {
            key: "fulfilled_protected_trade",
            label: "Fulfilment/correction outcome pointer",
            status: "available",
            value: "Protected trade fulfilment completed",
            source: "protected_trade_records",
            evidence_count: 1,
            decision_use: "Outcome context only; ask for confirmation.",
          },
        ],
      }),
    },
    headline: "Trade outcome evidence shown; confirm before relying",
    openDetails: true,
    visibleText: ["Protected trade fulfilment completed", "direct customer or live community confirmation"],
    absentText: ["Suitable for a low-risk trade check"],
  });
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
    await runTrustSlipGenerateWithPendingSecondaryRefreshScenario(browser, baseURL);
    await runTrustSlipSecondaryReconciliationScenarios(browser, baseURL);
    await runTrustPassportScenario(browser, baseURL);
    await runTrustSlipScenario(browser, baseURL);
    await runTrustSlipGenerateWithFailedSecondaryRefreshScenario(browser, baseURL);
    await runTrustSlipFailedIssuanceScenario(browser, baseURL);
    await runTrustSlipPurposeChangeShareScenario(browser, baseURL);
    await runPublicTradeEvidenceScenarios(browser, baseURL);
    await runTrustSlipRecoveredAnchorMismatchScenario(browser, baseURL);
    await runTrustSlipSummaryAfterClanListScenario(browser, baseURL);
    await runTrustSlipClanListAfterSummaryScenario(browser, baseURL);
    await runTrustSlipStateScenario(browser, baseURL, {
      label: "expired TrustSlip holder",
      overrides: {
        status: "expired",
        active: false,
        is_current: false,
        expires_at: "2026-01-01T08:00:00.000Z",
        merchant_summary: {
          expires_at: "2026-01-01T08:00:00.000Z",
        },
      },
      paperPack: "limits",
      visibleText: [
        "Needs refresh",
        "Refresh before anyone relies on it",
        "Current TrustSlip state",
      ],
    });
    await runTrustSlipStateScenario(browser, baseURL, {
      label: "revoked TrustSlip holder",
      overrides: {
        status: "revoked",
        active: false,
        is_current: false,
      },
      visibleText: [
        "Revoked",
        "Do not rely on this TrustSlip",
      ],
    });
    await runTrustSlipStateScenario(browser, baseURL, {
      label: "frozen TrustSlip holder",
      overrides: {
        status: "frozen",
        active: false,
        is_current: false,
      },
      visibleText: [
        "Frozen",
        "Do not rely on this TrustSlip",
      ],
    });
    await runTrustSlipStateScenario(browser, baseURL, {
      label: "phone-blocked TrustSlip holder",
      overrides: {
        status: "pending",
        active: false,
        verified: false,
        is_current: false,
        code: "",
        verification_code: "",
        verification_token: "",
        token: "",
        public_verify_url: "",
        merchant_view: { code: "", verification_code: "", verification_token: "", token: "", public_verify_url: "" },
        reason: "phone_unverified",
        detail: "Verify your phone number to activate TrustSlip portability.",
        phone_verified: false,
        merchant_summary: {
          phone_verified: false,
        },
      },
      setupOnly: true,
      visibleText: [
        "TrustSlip setup",
        "Choose purpose and community first.",
        "The full TrustSlip opens after GSN refreshes it for this exact choice.",
        "Verify phone",
      ],
    });
    await runTrustSlipStateScenario(browser, baseURL, {
      label: "missing-code TrustSlip holder",
      overrides: {
        status: "active",
        active: true,
        verified: false,
        is_current: true,
        code: "",
        verification_code: "",
        verification_token: "",
        token: "",
        public_verify_url: "",
        merchant_view: { code: "", verification_code: "", verification_token: "", token: "", public_verify_url: "" },
      },
      setupOnly: true,
      visibleText: [
        "TrustSlip setup",
        "Choose purpose and community first.",
        "Generate TrustSlip",
      ],
    });
    await runTrustSlipStateScenario(browser, baseURL, {
      label: "low-data TrustSlip holder",
      overrides: {
        status: "active",
        active: true,
        verified: true,
        band: "D",
        level: "D",
        cci_band: "D",
        cci_score: "0",
        graph_score: "0",
        standing_score: "0",
        trust_score: "0",
        active_clan_count: 0,
        sponsor_count: 0,
        unique_counterparties: 0,
        member_witness_count: 0,
        community_activity_count: 0,
        community_activity_categories: [],
        community_activity_label: "No community activity recorded yet",
        membership_strength_label: "Joined / witness not started",
        membership_renewal_status_label: "Not Started",
        membership_currentness_label: "Witness renewal not started",
        membership_currentness_scope:
          "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision.",
        last_release_at: "",
        last_full_repayment_at: "",
        evidence_summary: {
          capacity_context: {
            reasons: [],
          },
        },
        merchant_summary: {
          band: "D",
          sponsor_count: 0,
          member_witness_count: 0,
          community_activity_count: 0,
          community_activity_categories: [],
          community_activity_label: "No community activity recorded yet",
          membership_strength_label: "Joined / witness not started",
          membership_renewal_status_label: "Not Started",
          membership_currentness_label: "Witness renewal not started",
          membership_currentness_scope:
            "This active membership record has no current witness validity window. Ask for member witnesses, TrustSlip, or live community confirmation before a serious decision.",
        },
      },
      paperPack: "evidence",
      visibleText: [
        "Use with caution",
        "Evidence pack",
        "No participation evidence shown",
      ],
    });

    console.log(
      [
        "Trust Passport / TrustSlip boundary smoke passed:",
        "/app/trust rendered the private Trust Passport certificate;",
        "/app/trust-slip rendered the holder TrustSlip certificate;",
        "generated, failed-secondary-refresh, successful-issuance-secondary-refresh-still-pending, stale-secondary, restricted-secondary, not-current-secondary, null-secondary, healthy-secondary, failed-issuance, reopened, purpose-change, public Trade evidence wording, expired, revoked, frozen, phone-blocked, missing-code, and low-data holder states stayed bounded;",
        "signed-in holder reads carried auth;",
        "holder QR and public pack link carried the same selected Decision Pack context;",
        "public verify was not called on holder/private page load;",
        "bank/payment/release/private Passport limits rendered.",
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
