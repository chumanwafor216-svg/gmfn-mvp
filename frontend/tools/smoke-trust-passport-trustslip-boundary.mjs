/* global console, process, setTimeout, URL, localStorage, document, window */

import { chromium, expect } from "@playwright/test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const selectedClanId = 8;
const trustSlipCode = "GSN-TRUSTSLIP-BOUNDARY";

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
    active_clan_count: 2,
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
      await route.fulfill(json([clanPayload()]));
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
      await route.fulfill(json(trustSlipSummary));
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

async function newSignedInPage(browser, options = {}) {
  const requestLog = [];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
  });
  await context.addInitScript(() => {
    localStorage.clear();
    localStorage.setItem("access_token", "SIGNED_IN_TRUST_BOUNDARY_TOKEN");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });
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
  const state = await newSignedInPage(browser);
  await state.page.goto(`${baseURL}/app/trust`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(
    state.page.getByRole("heading", { name: "Identity Overview", exact: true })
  ).toBeVisible({ timeout: 30000 });
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
      `Trust Passport verdict marker must stay compact, got "${mobileLayout.markerText}".`
    );
  }
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(1);
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(0);
  await expect(state.page.getByText("This passport confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This passport does not confirm", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("Private passport surface", { exact: true })).toBeVisible();
  await expect(
    state.page.getByText("This Trust Passport is shown inside the signed-in app and is not the public TrustSlip.", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("The evidence posture is a reading of available evidence, not a character judgement or permanent label.", {
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
  await state.page.goto(`${baseURL}/app/trust-slip`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.getByText("TrustSlip holder", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(1);
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(0);
  await expect(state.page.getByText("This TrustSlip confirms", { exact: true })).toHaveCount(1);
  await expect(state.page.getByText("This TrustSlip does not confirm", { exact: true })).toHaveCount(1);
  await state.page.locator("summary").filter({ hasText: "More security details" }).first().click();
  await expect(
    state.page.getByText(
      "This TrustSlip is a short portable summary. It does not expose the holder's private Trust Passport, private notes, contacts, or admin records.",
      { exact: true }
    )
  ).toBeVisible();
  await expect(
    state.page.getByText("Bank approval, credit approval, payment movement, or escrow", { exact: true })
  ).toBeVisible();
  await openMoreLimits(state.page);
  await expect(
    state.page.getByText("Authority to release goods, money, credit, or services", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("Private Trust Passport history, private notes, private contacts, or admin records", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("Not a bank guarantee", {
      exact: true,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("No auto-debit", {
      exact: false,
    })
  ).toBeVisible();

  await expect(
    state.page.getByText("Not a substitute for your own judgement", {
      exact: false,
    })
  ).toBeVisible();
  await expect(
    state.page.getByText("Use this paper to see how the holder is known in this community, what evidence is visible, and where the record stops.", {
      exact: false,
    })
  ).toBeVisible();

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
  await state.page.goto(`${baseURL}/app/trust-slip`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });

  await expect(state.page.getByText("TrustSlip holder", { exact: true })).toBeVisible({
    timeout: 30000,
  });
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trustslip-holder"]')).toHaveCount(1);
  await expect(state.page.locator('[data-gsn-trust-document-certificate="trust-passport"]')).toHaveCount(0);

  for (const text of scenario.visibleText) {
    await expect(state.page.getByText(text, { exact: false }).first()).toBeVisible();
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
    await runTrustPassportScenario(browser, baseURL);
    await runTrustSlipScenario(browser, baseURL);
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
      visibleText: [
        "Needs refresh",
        "Refresh before anyone relies on it",
        "Current TrustSlip status",
        "Do not rely on this TrustSlip until it is refreshed and checked again.",
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
        "Do not rely until cleared",
        "Do not rely on this TrustSlip until it is refreshed and checked again.",
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
        "Do not rely until cleared",
        "Do not rely on this TrustSlip until it is refreshed and checked again.",
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
        token: "",
        public_verify_url: "",
        reason: "phone_unverified",
        detail: "Verify your phone number to activate TrustSlip portability.",
        phone_verified: false,
        merchant_summary: {
          phone_verified: false,
        },
      },
      visibleText: [
        "Phone check needed",
        "No public TrustSlip code is available yet.",
        "Verify phone",
        "Code not ready",
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
        token: "",
        public_verify_url: "",
      },
      visibleText: [
        "Preparing",
        "Waiting for a public code",
        "No public TrustSlip code is available yet.",
        "Public verification code is not ready yet",
        "Code not ready",
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
      visibleText: [
        "Evidence building",
        "Use with caution",
        "Evidence still building",
        "Community signals",
        "0 community activity events",
        "Joined / witness not started",
      ],
    });

    console.log(
      [
        "Trust Passport / TrustSlip boundary smoke passed:",
        "/app/trust rendered the private Trust Passport certificate;",
        "/app/trust-slip rendered the holder TrustSlip certificate;",
        "expired, revoked, frozen, phone-blocked, missing-code, and low-data holder states stayed bounded;",
        "signed-in holder reads carried auth;",
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
