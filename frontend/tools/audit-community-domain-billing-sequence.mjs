/* global console, document, localStorage, process, URL, window */

import { chromium } from "@playwright/test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.GSN_AUDIT_BASE_URL || "http://127.0.0.1:5180";
const routePath = "/app/community-domain/13";
const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const paymentProofSource = readFileSync(
  join(frontendRoot, "src", "components", "PaymentProofSubmissionPanel.tsx"),
  "utf8"
);
const dashboardSource = readFileSync(
  join(frontendRoot, "src", "pages", "CommunityDomainDashboardPage.tsx"),
  "utf8"
);
const billingPanelsSource = readFileSync(
  join(frontendRoot, "src", "pages", "communityDomainDashboard", "BillingReadinessPanels.tsx"),
  "utf8"
);

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function clickCta(page, debugId, timeout = 10000) {
  const locator = page.locator(`[data-cta-id="${debugId}"]`).first();
  await locator.waitFor({ state: "visible", timeout });
  await locator.click();
}

async function assertTextIncludes(findings, result, texts, context) {
  const bodyText = normalizeText(result.bodyText);
  for (const text of texts) {
    if (!bodyText.includes(normalizeText(text))) {
      findings.push(`Missing ${context} Billing text: ${text}`);
    }
  }
}

function json(data, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

function isApiRequest(url) {
  const parsed = new URL(url);
  const apiPathPrefixes = [
    "/api/",
    "/auth/",
    "/clans/",
    "/community-pay-in-accounts/",
    "/community-domains/",
    "/community-domains",
    "/bank/",
    "/notifications",
    "/identity",
    "/trust",
  ];

  return (
    url.includes("localhost:8000") ||
    url.includes("127.0.0.1:8000") ||
    url.includes("127.0.0.1:8012") ||
    apiPathPrefixes.some(
      (prefix) => parsed.pathname === prefix || parsed.pathname.startsWith(prefix)
    )
  );
}

const dashboardPayload = {
  community_domain: {
    id: 13,
    clan_id: 1,
    domain_name: "community-domain",
    display_name: "Community Domain",
    status: "draft",
    verification_status: "unverified",
    billing_status: "quote_required",
    activation_status: "pending_activation",
  },
  viewer: {
    can_admin: true,
    role: "owner",
  },
  template: {
    key: "community_association",
    label: "Community association",
    default_modules: ["billing", "members", "governance"],
  },
  status: {
    domain_status: "draft",
    billing_status: "quote_required",
    activation_status: "pending_activation",
    verification_status: "unverified",
  },
  counts: {
    nodes: 1,
    active_policies: 0,
    members: 1,
  },
  lanes: [
    {
      lane_key: "settings",
      label: "Setup",
      status: "draft",
      summary: "Finish setup first.",
    },
    {
      lane_key: "billing",
      label: "Billing",
      status: "quote_required",
      summary: "Review quote and payment reference code.",
    },
    {
      lane_key: "members",
      label: "Members",
      status: "not_started",
      summary: "Review access requests.",
    },
  ],
  package_quote: {
    quote_status: "quote_required",
    pricing_status: "pilot_quote_required",
    renewal_policy: { status: "not_set" },
    included_modules: ["billing", "members"],
  },
  primary_next_action: {
    label: "Review billing",
    action_key: "billing.review",
  },
};

const subscriptionLifecyclePayload = {
  subscription_lifecycle: {
    ready_total: 1,
    primary_next_action: { label: "Review manual Community Domain package quote" },
    summary: {
      billing_status: "not_measured_yet",
      renewal_status: "not_set_up_yet",
    },
    package: {
      package_name: "Community Domain Starter",
      pricing_status: "pilot_quote_required",
    },
    lanes: [
      {
        lane_key: "quote_preview",
        label: "Quote preview",
        ready: true,
        status: "draft_quote",
        next_step: "Review the manual pilot quote with the Community Domain owner.",
      },
      {
        lane_key: "pricing_confirmation",
        label: "Pricing confirmation",
        ready: false,
        status: "pilot_quote_required",
        next_step: "Confirm final price before payment instruction.",
      },
      {
        lane_key: "payment_instruction",
        label: "Payment instruction",
        ready: false,
        status: "not_created_yet",
        next_step: "Create payment instructions only after quote acceptance.",
      },
      {
        lane_key: "payment_confirmation",
        label: "Payment confirmation",
        ready: false,
        status: "not_recorded_yet",
        next_step: "Record payment only after bank match or finance review.",
      },
    ],
  },
};

const capacityPlanPayload = {
  capacity_plan: {
    package_name: "Community Domain Starter",
    limits_source: "recorded package allowance",
    primary_next_action: { label: "Review setup before relying on capacity" },
    lanes: [
      {
        lane_key: "members",
        label: "Members",
        metered: true,
        used: 1,
        limit: 50,
        remaining: 49,
        status: "ready",
      },
    ],
  },
};

const expectedPaymentsPayload = {
  items: [
    {
      id: 91,
      clan_id: 1,
      amount: "100.00",
      currency: "GBP",
      expected_type: "community_domain_subscription",
      reference_display: "GMFN-CDOM-U13-C11-D1-ANNUAL-260711-8A7F",
      reference_normalized: "GMFN-CDOM-U13-C11-D1-ANNUAL-260711-8A7F",
      status: "expected",
      payment_stage: "pending_authentication",
      payment_status_label: "Pending Authentication",
      bank_authentication_guidance:
        "Your bank may require app approval, SMS OTP, a one-time code, a code generator, or biometric confirmation before the transfer completes.",
      meta: {
        community_domain_id: 13,
        settlement_country: "GB",
        payment_intent: {
          expected_payment_id: 91,
          payment_reference: "GMFN-CDOM-U13-C11-D1-ANNUAL-260711-8A7F",
          payer_user_id: 1,
          payer_gmfn_id: "GMFN-U-0B5A2953",
          community_name: "Audit Community",
          community_code: "GMFN-C-AUDIT",
          community_domain_id: 13,
          domain_display_name: "Community Domain",
          settlement_source: "platform_country_settlement",
        },
        settlement: {
          rail_name: "Bank Transfer",
          bank_name: "Pilot UK Bank",
          account_name: "GSN UK Pilot Account",
          account_number: "12345678",
          sort_code: "12-34-56",
          country: "GB",
          country_label: "United Kingdom",
          configured: true,
          support_note: "Use the exact payment code as the transfer reference.",
        },
      },
    },
  ],
};

const communityPayInPayload = {
  configured: true,
  settlement: {
    rail_name: "Community bank transfer",
    bank_name: "Audit Society Bank",
    account_name: "Audit Community Pay-In",
    account_number: "99887766",
    sort_code: "11-22-33",
    country: "GB",
    country_label: "United Kingdom",
    currency: "GBP",
    configured: true,
    source: "community_pay_in_account",
    support_note: "Use the exact payment code as the transfer reference.",
  },
};

const handledApiUrls = [];
const pageErrors = [];

async function mockApi(route) {
  const url = route.request().url();
  if (!isApiRequest(url)) {
    await route.continue();
    return;
  }

  const parsed = new URL(url);
  const pathname = parsed.pathname;
  handledApiUrls.push(pathname);

  if (pathname.endsWith("/auth/me") || pathname.endsWith("/users/me")) {
    await route.fulfill(
      json({
        id: 1,
        email: "audit@gsn.local",
        name: "Audit Owner",
        role: "admin",
        gsn_id: "GMFN-U-0B5A2953",
      })
    );
    return;
  }

  if (pathname.includes("/community-domains/13/dashboard")) {
    await route.fulfill(json({ dashboard: dashboardPayload }));
    return;
  }

  if (pathname.includes("/community-domains/13/capacity-plan")) {
    await route.fulfill(json(capacityPlanPayload));
    return;
  }

  if (pathname.includes("/community-domains/13/subscription-lifecycle")) {
    await route.fulfill(json(subscriptionLifecyclePayload));
    return;
  }

  if (pathname.includes("/bank/expected")) {
    await route.fulfill(json(expectedPaymentsPayload));
    return;
  }

  if (pathname.includes("/community-pay-in-accounts/1")) {
    await route.fulfill(json(communityPayInPayload));
    return;
  }

  if (pathname.includes("/community-domains/13/package-quote")) {
    await route.fulfill(json({ quote: dashboardPayload.package_quote }));
    return;
  }

  if (pathname.includes("/community-domains/13/notices")) {
    await route.fulfill(json({ items: [] }));
    return;
  }

  if (pathname.includes("/community-domains/13/")) {
    await route.fulfill(json({}));
    return;
  }

  if (pathname.includes("/community-domains/my")) {
    await route.fulfill(
      json({
        items: [
          {
            community_domain: dashboardPayload.community_domain,
            membership: { role: "owner", status: "active" },
            viewer: { can_admin: true },
            dashboard_path: "/app/community-domain/13",
          },
        ],
      })
    );
    return;
  }

  if (pathname.includes("/clans/me")) {
    await route.fulfill(
      json({
        items: [
          {
            id: 1,
            clan_id: 1,
            name: "Audit Community",
            status: "active",
            role: "admin",
            member_role: "admin",
          },
        ],
      })
    );
    return;
  }

  await route.fulfill(json({ items: [] }));
}

async function pageAudit(page) {
  return page.evaluate(() => {
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;
    const bodyText = document.body?.textContent || document.body?.innerText || "";
    const bottomNav = document.querySelector('[data-gmfn-bottom-nav="true"]');
    const bottomNavRect = bottomNav?.getBoundingClientRect();
    const scrollRoot = document.querySelector('[data-gmfn-mobile-scroll-root="true"]');
    return {
      viewportW,
      viewportH,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
      scrollRootH: scrollRoot?.scrollHeight || 0,
      bottomNavVisible:
        Boolean(bottomNavRect) &&
        bottomNavRect.top >= 0 &&
        bottomNavRect.top < viewportH &&
        bottomNavRect.bottom <= viewportH + 2,
      bottomNavGap: bottomNavRect ? viewportH - bottomNavRect.bottom : null,
      bodyText,
      horizontalOverflow: document.documentElement.scrollWidth > viewportW + 2,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await context.newPage();
page.on("pageerror", (error) => {
  pageErrors.push(error.message);
});
page.on("console", (message) => {
  if (message.type() === "error") {
    pageErrors.push(message.text());
  }
});
await page.route("**/*", mockApi);
await page.addInitScript(() => {
  localStorage.setItem("access_token", "audit-token");
  localStorage.setItem("gmfn_auth_token", "audit-token");
  localStorage.setItem("token", "audit-token");
  localStorage.setItem("gmfn_role", "admin");
  localStorage.setItem("gmfn_current_id", "GMFN-U-0B5A2953");
  localStorage.setItem("gmfn_selected_clan_id", "1");
  localStorage.setItem("selected_clan_id", "1");
});

const findings = [];

if (
  !/const fileInputId = `\$\{debugIdPrefix\}-file`;[\s\S]*?data-gmfn-file-input-id=\{fileInputId\}[\s\S]*?onChange=\{handleProofFileChange\}/.test(
    paymentProofSource
  )
) {
  findings.push(
    "Payment proof file picker must keep an explicit label-to-file-input association and a visible file-selection handler for mobile camera/file pickers."
  );
}

if (
  !/const visibleAuthGuidance = compact[\s\S]*?Complete any bank app, OTP, or biometric approval first[\s\S]*?\{visibleAuthGuidance\}/.test(
    paymentProofSource
  )
) {
  findings.push(
    "Payment proof panel must keep compact bank-auth guidance for phone billing lanes."
  );
}

if (
  !/title="Community Domain payment proof"[\s\S]*?compact[\s\S]*?debugIdPrefix="community-domain-payment-proof"/.test(
    dashboardSource
  )
) {
  findings.push(
    "Community Domain payment proof must render PaymentProofSubmissionPanel in compact mode on the phone billing lane."
  );
}

if (
  !/function softCard\(\)[\s\S]*?minWidth:\s*0[\s\S]*?maxWidth:\s*"100%"[\s\S]*?boxSizing:\s*"border-box"/.test(
    dashboardSource
  )
) {
  findings.push(
    "Community Domain dashboard cards must keep minWidth 0 and border-box sizing so Billing cannot expand wider than the phone viewport."
  );
}

if (
  !/latestProofName \|\| proofStatusText[\s\S]*?overflowWrap:\s*"anywhere"[\s\S]*?wordBreak:\s*"break-word"/.test(
    paymentProofSource
  )
) {
  findings.push(
    "Payment proof status must safely wrap long receipt filenames on phone billing lanes."
  );
}

if (
  !/function softCard\(\)[\s\S]*?minWidth:\s*0[\s\S]*?maxWidth:\s*"100%"[\s\S]*?boxSizing:\s*"border-box"/.test(
    billingPanelsSource
  ) ||
  !/gridTemplateColumns:\s*"repeat\(auto-fit, minmax\(min\(100%, 118px\), 1fr\)\)"/.test(
    billingPanelsSource
  )
) {
  findings.push(
    "Billing readiness detail cards must use phone-safe width constraints and mini-card columns."
  );
}

try {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.locator('[data-cta-id="community-domain-dashboard.setup-focus"]').first().click();
  await page.locator('[data-cta-id="community-domain-dashboard.setup-open-billing"]').first().click();
  await page.waitForLoadState("networkidle");
  await page.getByText("Code, account, proof.", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("Latest payment code", { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(700);

  const defaultResult = await pageAudit(page);
  const requiredDefaultText = [
    "Billing",
    "Code, account, proof.",
    "Billing jobs",
    "Current billing job: Code & proof",
    "Change billing job",
    "Code & proof",
    "Code & proof packets",
    "Current packet: Code",
    "Change code/proof packet",
    "Code steps",
    "Current step: Reference",
    "Change Code step",
    "Latest payment code",
    "Payment: Pending Authentication",
    "Proof: Not uploaded",
  ];

  await assertTextIncludes(findings, defaultResult, requiredDefaultText, "default");

  const defaultBody = normalizeText(defaultResult.bodyText);

  if (defaultBody.includes("Review quote")) {
    findings.push("Billing steps are exposed before the user opens them.");
  }

  if (defaultBody.includes("Community pay-in account")) {
    findings.push("Pay-in account details are exposed before the user opens the account billing job.");
  }

  if (defaultBody.includes("Billing readiness details")) {
    findings.push("Billing readiness diagnostics are exposed before the user opens the readiness billing job.");
  }

  if (defaultBody.includes("Enter amount, area, and currency.")) {
    findings.push("Payment-code form is exposed even though a latest code already exists.");
  }

  if (defaultBody.includes("GSN credit link")) {
    findings.push("Credit-link details are exposed before the user opens them.");
  }

  if (defaultBody.includes("Official GSN account for United Kingdom")) {
    findings.push("Official pay-account details are exposed before the user opens Settlement > Pay account.");
  }

  if (defaultBody.includes("Community Domain payment proof")) {
    findings.push("Payment proof upload is exposed before the user opens the Proof packet.");
  }

  if (defaultResult.horizontalOverflow) {
    findings.push(`Horizontal overflow: scroll width ${defaultResult.scrollW}px on ${defaultResult.viewportW}px viewport`);
  }

  if (!defaultResult.bottomNavVisible) {
    findings.push("Bottom navigation is not visible in the mobile viewport after opening Billing.");
  }

  if (
    typeof defaultResult.bottomNavGap === "number" &&
    defaultResult.bottomNavGap > 12
  ) {
    findings.push(
      `Bottom navigation is floating above blank space: ${defaultResult.bottomNavGap}px gap below rail`
    );
  }

  if (defaultResult.scrollRootH > defaultResult.viewportH * 5.9) {
    findings.push(
      `Billing mobile scroll is too long: scroll root ${defaultResult.scrollRootH}px on ${defaultResult.viewportH}px viewport`
    );
  }

  await clickCta(page, "community-domain-dashboard.billing-payment-group-toggle");
  await clickCta(page, "community-domain-dashboard.billing-payment-group.settlement");
  await page.waitForTimeout(350);

  const detailResult = await pageAudit(page);
  const requiredDetailText = [
    "GSN credit link",
    "GMFN-U-0B5A2953",
    "Audit Community",
    "Record",
    "Use only the payment code as the bank reference.",
  ];
  const forbiddenText = [
    "Copy Details",
    "GSN Subscription Rail",
    "official bank rail",
  ];

  await assertTextIncludes(findings, detailResult, requiredDetailText, "credit-link");

  for (const text of forbiddenText) {
    if (normalizeText(detailResult.bodyText).includes(normalizeText(text))) {
      findings.push(`Forbidden bank-detail text is visible: ${text}`);
    }
  }

  if (detailResult.horizontalOverflow) {
    findings.push(
      `Expanded billing detail horizontal overflow: scroll width ${detailResult.scrollW}px on ${detailResult.viewportW}px viewport`
    );
  }

  await clickCta(page, "community-domain-dashboard.billing-payment-step-toggle");
  await clickCta(page, "community-domain-dashboard.billing-payment.pay_account");
  await page.waitForTimeout(350);

  const payAccountResult = await pageAudit(page);
  const requiredPayAccountText = [
    "Official GSN account for United Kingdom",
    "Pilot UK Bank",
    "GSN UK Pilot Account",
    "Account number",
    "Sort code",
  ];

  await assertTextIncludes(findings, payAccountResult, requiredPayAccountText, "official-account");

  if (payAccountResult.horizontalOverflow) {
    findings.push(
      `Expanded official account horizontal overflow: scroll width ${payAccountResult.scrollW}px on ${payAccountResult.viewportW}px viewport`
    );
  }

  await clickCta(page, "community-domain-dashboard.billing-payment-group-toggle");
  await clickCta(page, "community-domain-dashboard.billing-payment-group.proof");
  await page.getByText("Community Domain payment proof", { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(350);

  const proofResult = await pageAudit(page);
  const requiredProofText = [
    "Community Domain payment proof",
    "Payment code used",
    "Choose proof file",
  ];

  await assertTextIncludes(findings, proofResult, requiredProofText, "proof");

  if (proofResult.horizontalOverflow) {
    findings.push(
      `Expanded proof horizontal overflow: scroll width ${proofResult.scrollW}px on ${proofResult.viewportW}px viewport`
    );
  }

  await clickCta(page, "community-domain-dashboard.billing-task-toggle");
  await clickCta(page, "community-domain-dashboard.billing-task.account");
  await page.getByText("Community pay-in account", { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(250);

  const accountResult = await pageAudit(page);
  const requiredAccountText = [
    "Community pay-in account",
    "Shown to payers. Locked for editing.",
    "Use this account with the generated code.",
    "Current pay-in account packet: Summary",
    "Change pay-in account packet",
    "Audit Society Bank",
    "Audit Community Pay-In",
  ];

  await assertTextIncludes(findings, accountResult, requiredAccountText, "account");

  if (normalizeText(accountResult.bodyText).includes("Edit locked.")) {
    findings.push("Pay-in account setup packet is exposed before the user opens it.");
  }

  if (normalizeText(accountResult.bodyText).includes("Latest payment code")) {
    findings.push("Payment code details stayed visible after opening the account billing job.");
  }

  if (accountResult.horizontalOverflow) {
    findings.push(
      `Account billing horizontal overflow: scroll width ${accountResult.scrollW}px on ${accountResult.viewportW}px viewport`
    );
  }

  await clickCta(page, "community-domain-dashboard.billing-task-toggle");
  await clickCta(page, "community-domain-dashboard.billing-task.steps");
  await page.waitForTimeout(350);

  const stepsResult = await pageAudit(page);
  const requiredStepsText = [
    "Review quote",
    "Generate payment code",
    "Use your bank",
    "Upload proof",
    "Finance review",
  ];

  await assertTextIncludes(findings, stepsResult, requiredStepsText, "steps");

  if (stepsResult.horizontalOverflow) {
    findings.push(
      `Steps billing horizontal overflow: scroll width ${stepsResult.scrollW}px on ${stepsResult.viewportW}px viewport`
    );
  }

  await clickCta(page, "community-domain-dashboard.billing-task-toggle");
  await clickCta(page, "community-domain-dashboard.billing-task.readiness");
  await page.getByText("Subscription lifecycle", { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(350);

  const readinessResult = await pageAudit(page);
  const requiredReadinessText = [
    "Billing readiness details",
    "Subscription lifecycle",
    "Package",
    "Pricing",
  ];

  await assertTextIncludes(findings, readinessResult, requiredReadinessText, "readiness");

  if (normalizeText(readinessResult.bodyText).includes("Latest payment code")) {
    findings.push("Payment code details stayed visible after opening the readiness billing job.");
  }

  if (readinessResult.horizontalOverflow) {
    findings.push(
      `Readiness billing horizontal overflow: scroll width ${readinessResult.scrollW}px on ${readinessResult.viewportW}px viewport`
    );
  }

  if (findings.length > 0) {
    findings.push(`Page text: ${normalizeText(defaultResult.bodyText).slice(0, 2200)}`);
  }
} catch (error) {
  let debugText = "";
  let debugUrl = "";
  try {
    debugUrl = page.url();
    debugText = normalizeText(await page.locator("body").textContent({ timeout: 2000 })).slice(0, 2200);
  } catch {
    debugText = "Body text was not readable.";
  }
  findings.push(
    `Community Domain Billing render failed: ${error.message}. URL: ${debugUrl}. Visible text: ${debugText}. API: ${handledApiUrls
      .slice(-20)
      .join(", ")}. Page errors: ${pageErrors.slice(-8).join(" | ")}`
  );
}

await browser.close();

if (findings.length > 0) {
  console.error("Community Domain Billing sequence audit failed:");
  for (const finding of findings) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log("Community Domain Billing sequence audit passed.");
