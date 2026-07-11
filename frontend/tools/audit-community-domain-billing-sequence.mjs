/* global console, document, localStorage, process, URL, window */

import { chromium } from "@playwright/test";

const baseUrl = process.env.GSN_AUDIT_BASE_URL || "http://127.0.0.1:5180";
const routePath = "/app/community-domain";

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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
      },
    },
  ],
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
    return {
      viewportW,
      viewportH,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
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

try {
  await page.goto(`${baseUrl}${routePath}`, { waitUntil: "networkidle", timeout: 15000 });
  await page.getByText("Set up / edit", { exact: true }).last().click();
  await page.waitForURL("**/app/community-domain/13", { timeout: 15000 });
  await page.waitForLoadState("networkidle");
  await page.getByText("Open other tools", { exact: true }).first().click();
  await page.waitForLoadState("networkidle");
  await page.getByText("Billing sequence", { exact: true }).waitFor({ timeout: 10000 });
  await page.getByText("Latest payment code", { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(700);

  const result = await pageAudit(page);
  const requiredText = [
    "Billing sequence",
    "Code first. Confirm later.",
    "Review quote",
    "Generate payment code",
    "Use your bank",
    "Upload proof",
    "Finance review",
    "Separate rails",
    "Community Domain subscriptions use a payment code and finance review.",
    "Latest payment code",
    "Payment: Pending Authentication",
    "Proof: Not uploaded",
  ];
  const forbiddenText = [
    "GSN Bank Details",
    "Account Number",
    "Sort Code",
    "IBAN",
    "Copy Details",
    "GSN Subscription Rail",
    "official bank account",
    "official bank rail",
  ];

  for (const text of requiredText) {
    if (!normalizeText(result.bodyText).includes(normalizeText(text))) {
      findings.push(`Missing expected Billing text: ${text}`);
    }
  }

  for (const text of forbiddenText) {
    if (normalizeText(result.bodyText).includes(normalizeText(text))) {
      findings.push(`Forbidden bank-detail text is visible: ${text}`);
    }
  }

  if (result.horizontalOverflow) {
    findings.push(`Horizontal overflow: scroll width ${result.scrollW}px on ${result.viewportW}px viewport`);
  }

  if (findings.length > 0) {
    findings.push(`Page text: ${normalizeText(result.bodyText).slice(0, 2200)}`);
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
