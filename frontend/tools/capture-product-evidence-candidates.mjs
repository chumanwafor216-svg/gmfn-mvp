/* global console, document, localStorage, process, URL, window */

import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontendRoot, "..");
const baseUrl = (process.env.GSN_CAPTURE_BASE_URL || "http://127.0.0.1:5173").replace(
  /\/+$/,
  ""
);
const baseOrigin = new URL(baseUrl).origin;
const outDir = join(repoRoot, "pilot_evidence_pack", "12_product_evidence_capture", "candidates");
mkdirSync(outDir, { recursive: true });

const captureDate = "2026-07-19";
const demoSlipCode = "TS-DEMO-001";
const confirmationToken = "PUBLIC-DEMO-001";

function isoMinutesFromNow(minutes) {
  return new Date(Date.now() + minutes * 60 * 1000).toISOString();
}

const demoMember = {
  id: 101,
  user_id: 101,
  display_name: "Demo Member A",
  nickname: "Demo Member A",
  email: "demo-account",
  role: "member",
  phone_verified: true,
  phone_e164: "",
  gmfn_id: "DEMO-MEMBER-A",
  gsn_id: "DEMO-MEMBER-A",
};

const demoCommunity = {
  id: 201,
  clan_id: 201,
  name: "GSN Demo Community A",
  display_name: "GSN Demo Community A",
  community_name: "GSN Demo Community A",
  role: "member",
  member_count: 12,
  community_code: "DEMO-COMMUNITY-A",
  gmfn_id: "DEMO-COMMUNITY-A",
};

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
  return `${url.pathname}${url.search}`;
}

function isApiRequest(urlText) {
  const url = new URL(urlText);
  return (
    url.host === "127.0.0.1:8012" ||
    url.host === "localhost:8012" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/clans/") ||
    url.pathname.startsWith("/trust") ||
    url.pathname.startsWith("/community-confirmations")
  );
}

function trustSlipPayload() {
  return {
    code: demoSlipCode,
    token: demoSlipCode,
    verification_code: demoSlipCode,
    status: "active",
    valid: true,
    verified: true,
    is_current: true,
    visibility_level: "standard",
    public_verify_url: `/t/${demoSlipCode}`,
    holder_name: "Demo Member A",
    display_name: "Demo Member A",
    gmfn_id: "DEMO-MEMBER-A",
    holder_gmfn_id: "DEMO-MEMBER-A",
    community_name: "GSN Demo Community A",
    community: "GSN Demo Community A",
    community_code: "DEMO-COMMUNITY-A",
    trust_band: "",
    band: "",
    cci_score: null,
    cci_band: "",
    cci_public_label: "Evidence pending",
    cci_public_meaning:
      "This record is still building confirmed evidence for this purpose.",
    cci_public_boundary:
      "Descriptive evidence status only. Guarantees and approvals remain separate decisions.",
    cci_explainer: {
      score_visibility: "internal_index",
      public_label: "Evidence pending",
      public_short_label: "Pending",
      public_meaning:
        "This record is still building confirmed evidence for this purpose.",
      public_boundary:
        "Descriptive evidence status only. Guarantees and approvals remain separate decisions.",
    },
    trust_limit: null,
    trust_slip_limit: null,
    currency: "GBP",
    issued_at: "2026-07-19T08:00:00.000Z",
    expires_at: "2026-08-18T08:00:00.000Z",
    access_recipient_label: "Demo Recipient A",
    access_purpose: "Community Trust Confirmation pilot demonstration",
    access_scope: "Public TrustSlip summary only",
    access_recorded_at: "2026-07-19T08:20:00.000Z",
    access_status: "Recipient view recorded",
    access_note:
      "Recipient saw the limited public TrustSlip only. Private Trust Passport details were not opened.",
    identity_status_label: "Identity evidence recorded",
    community_identity_label: "Community membership recorded",
    community_activity_count: 1,
    community_activity_label: "Community Support Activity 001 recorded",
    member_witness_count: 1,
    membership_strength_label: "Witness response pending",
    membership_renewal_status_label: "Current window",
    membership_currentness_label: "Current window",
    membership_currentness_scope:
      "This evidence should be checked again when the purpose or time window changes.",
    event_count: 1,
    snapshot_version: "candidate-capture",
    not_a_bank_guarantee: true,
    no_auto_debit: true,
    disclaimer:
      "TrustSlip is evidence for judgement. It is not a bank guarantee, escrow, payment instruction, or automatic approval.",
    community_confirmation: {
      relay_available: true,
      instant_pulse_available: true,
      active_member_count: 12,
      contactable_reference_count: 1,
      eligible_response_pool: 1,
      plain_language:
        "Community confirmation can be requested without exposing private contacts.",
    },
    evidence_summary: {
      capacity_context: {
        available_guarantee_capacity: null,
        current_locked_guarantees: null,
        risk_level: "not_assessed",
        reasons: ["Purpose relevance and recipient acceptance are not proven."],
      },
    },
    merchant_summary: {
      display_name: "Demo Member A",
      gmfn_id: "DEMO-MEMBER-A",
      community: "GSN Demo Community A",
      community_code: "DEMO-COMMUNITY-A",
      visibility_level: "standard",
      bank_details_recorded: false,
      bank_verified: false,
      passport_recorded: false,
      passport_verified: false,
      phone_recorded: false,
      phone_verified: true,
    },
  };
}

function publicConfirmationPayload() {
  return {
    request_id: 301,
    public_token: confirmationToken,
    status: "pending",
    mode: "instant_pulse",
    reason_type: "community_support_activity",
    risk_level: "medium",
    community_name: "GSN Demo Community A",
    community_id: demoCommunity.id,
    community_code: "DEMO-COMMUNITY-A",
    subject_public_reference: "Demo Member A",
    subject_reference_type: "demo_member",
    created_at: isoMinutesFromNow(-10),
    expires_at: isoMinutesFromNow(50),
    review_case: {
      review_case_id: 302,
      status: "open",
      review_reason: "candidate_capture",
      trust_impact: "scoped",
      trust_reading_effect: {
        label: "Review required",
        plain_language:
          "The public paper records a response state. Private notes are not part of this public view.",
        reader_action: "Use the public response status and your own judgement.",
      },
    },
    community_response: {
      requests_sent: 1,
      active_member_count: 12,
      responses_received: 1,
      confirmed_known_count: 1,
      caution_count: 0,
      objection_count: 0,
      community_confidence: "limited",
      private_contacts_exposed: false,
    },
    visible_summary:
      "One eligible member confirmed the activity context. Private contacts stay hidden.",
    privacy_note:
      "GSN shows a controlled community outcome. It does not expose private contacts.",
    decision_note:
      "This is evidence for judgement, not a guarantee, payment instruction, or automatic approval.",
    requester_callback: {
      consent: false,
      delivery_status: "not_requested",
    },
  };
}

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = request.url();
    const parsedUrl = new URL(url);
    if (request.resourceType() === "document" && parsedUrl.origin === baseOrigin) {
      await route.continue();
      return;
    }
    if (!isApiRequest(url)) {
      await route.continue();
      return;
    }

    const path = apiPathFrom(url);
    const method = request.method().toUpperCase();

    if (method === "GET" && (path === "/auth/me" || path.startsWith("/auth/me?"))) {
      await route.fulfill(json(demoMember));
      return;
    }

    if (method === "PATCH" && path === "/auth/me/profile") {
      await route.fulfill(json(demoMember));
      return;
    }

    if (method === "GET" && path === "/clans/me") {
      await route.fulfill(json([demoCommunity]));
      return;
    }

    if (method === "POST" && /^\/clans\/\d+\/select\/?$/.test(path)) {
      await route.fulfill(json({ selected_clan_id: demoCommunity.id }));
      return;
    }

    if (method === "GET" && path.startsWith("/trust/score/explained")) {
      await route.fulfill(
        json({
          score: null,
          last_change: {
            event_type: "community_support_activity",
            source: "trust_events",
            created_at: "2026-07-19T08:00:00.000Z",
            reason: "Community Support Activity 001 recorded",
            note: "Candidate evidence record. External pilot use is not proven.",
          },
        })
      );
      return;
    }

    if (method === "GET" && path.startsWith("/trust/me/timeline")) {
      await route.fulfill(
        json({
          items: [
            {
              event_type: "community_support_activity",
              label: "Community Support Activity 001",
              reason: "Activity recorded for confirmation",
              note: "Pending confirmation and purpose review.",
              reference_label: "Candidate evidence",
              created_at: "2026-07-19T08:00:00.000Z",
            },
          ],
        })
      );
      return;
    }

    if (method === "GET" && path === "/trust/me/evidence-pack/meta") {
      await route.fulfill(
        json({
          pack_id: "GSN-DEMO-EVIDENCE-PACK-001",
          generated_at_utc: "2026-07-19T08:15:00.000Z",
          protocol_version: "candidate-capture",
          footer:
            "Candidate evidence pack. Not external pilot proof and not a bank guarantee.",
        })
      );
      return;
    }

    if (method === "GET" && path.startsWith("/trust-slips/me")) {
      await route.fulfill(json(trustSlipPayload()));
      return;
    }

    if (method === "GET" && path.startsWith("/trust-slips/verify/")) {
      await route.fulfill(json(trustSlipPayload()));
      return;
    }

    if (method === "GET" && path.startsWith(`/trust-slips/${demoSlipCode}/share`)) {
      await route.fulfill(
        json({
          text:
            "GSN TrustSlip candidate for Demo Member A. Private records are not included.",
        })
      );
      return;
    }

    if (
      method === "GET" &&
      path === `/community-confirmations/public/${confirmationToken}`
    ) {
      await route.fulfill(json(publicConfirmationPayload()));
      return;
    }

    if (method === "GET" && path === "/community-confirmations/inbox") {
      await route.fulfill(
        json({
          items: [
            {
              request_id: 301,
              status: "pending",
              reason_type: "community_support_activity",
              subject_public_reference: "Demo Member A",
              community_name: "GSN Demo Community A",
              created_at: "2026-07-19T08:05:00.000Z",
            },
          ],
          total: 1,
        })
      );
      return;
    }

    if (
      method === "GET" &&
      path === "/community-confirmations/my-contact-settings?community_id=201"
    ) {
      await route.fulfill(
        json({
          community_id: demoCommunity.id,
          opted_in: true,
          availability_status: "receiving",
        })
      );
      return;
    }

    if (method === "GET" && path.includes("/community-confirmations/301/decision")) {
      await route.fulfill(
        json({
          decision_found: true,
          decision_id: 401,
          decision: "deferred",
          status: "under_review",
          settled: false,
          issue_reported: false,
        })
      );
      return;
    }

    await route.fulfill(json({ items: [], results: [], ok: true }));
  });
}

async function prepareAuthenticatedContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  await context.addInitScript((communityId) => {
    localStorage.setItem(
      "gmfn_companion_settings_local",
      JSON.stringify({ companionMode: "off" })
    );
    localStorage.setItem("access_token", "candidate-capture-token");
    localStorage.setItem("token", "candidate-capture-token");
    localStorage.setItem("gmfn_selected_clan_id", String(communityId));
    localStorage.setItem("selected_clan_id", String(communityId));
    localStorage.setItem("gmfn_profile_name", "Demo Member A");
  }, demoCommunity.id);
  return context;
}

async function capturePage(context, path, fileName, expectedText, options = {}) {
  const page = await context.newPage();
  await installApiMocks(page);
  await page.goto(`${baseUrl}${path}`, {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  try {
    await page.waitForFunction(
      (text) => (document.body.textContent || "").includes(text),
      expectedText,
      { timeout: 30000 }
    );
  } catch (error) {
    const debugFile = fileName.replace(/\.png$/i, ".debug.png");
    const bodyText = await page.locator("body").innerText({ timeout: 1000 }).catch(() => "");
    await page.screenshot({
      path: join(outDir, debugFile),
      fullPage: false,
    });
    console.error(`Timed out waiting for "${expectedText}" on ${path}.`);
    console.error(bodyText.slice(0, 800));
    throw error;
  }
  if (options.scrollSelector) {
    await page.locator(options.scrollSelector).first().scrollIntoViewIfNeeded({
      timeout: 5000,
    });
    if (Number.isFinite(options.scrollOffsetY)) {
      await page.evaluate((offsetY) => window.scrollBy(0, offsetY), options.scrollOffsetY);
    }
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(600);
  await page.screenshot({
    path: join(outDir, fileName),
    fullPage: false,
  });
  await page.close();
}

async function main() {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    const authContext = await prepareAuthenticatedContext(browser);
    await capturePage(
      authContext,
      "/app/my-gmfn-and-i",
      `candidate_02_personal_gsn_profile_${captureDate}.png`,
      "My GSN Identity"
    );
    await capturePage(
      authContext,
      "/app/trust-timeline",
      `candidate_09_trust_event_detail_${captureDate}.png`,
      "Latest event context",
      {
        scrollSelector: '[data-debug-id="trust-timeline.latest-event-context"]',
        scrollOffsetY: -84,
      }
    );
    await capturePage(
      authContext,
      "/app/trust-slip",
      `candidate_11_trustslip_selection_${captureDate}.png`,
      "TrustSlip"
    );
    await authContext.close();

    const publicContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
    });
    await capturePage(
      publicContext,
      `/community-confirmations/public/${confirmationToken}`,
      `candidate_08_confirmation_response_${captureDate}.png`,
      "Community Confirmation"
    );
    await capturePage(
      publicContext,
      `/t/${demoSlipCode}`,
      `candidate_12_recipient_trustslip_view_${captureDate}.png`,
      "TrustSlip"
    );
    await publicContext.close();

    console.log(`Product evidence candidate captures saved to ${outDir}`);
  } finally {
    if (browser) await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
