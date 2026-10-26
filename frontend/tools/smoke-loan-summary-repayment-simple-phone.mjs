/* global console, process, URL, localStorage, document, window, getComputedStyle */

import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { createServer } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const screenshotDir = join(frontendRoot, "screenshots");
mkdirSync(screenshotDir, { recursive: true });

function json(body, status = 200) {
  return { status, contentType: "application/json", body: JSON.stringify(body) };
}

async function installApiMocks(page) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");

    if (path === "/auth/me") {
      return route.fulfill(
        json({
          id: 216,
          user_id: 216,
          display_name: "Ada Example",
          gmfn_id: "GMFN-U-63655DE6",
          role: "member",
        })
      );
    }

    if (path === "/clans/me") {
      return route.fulfill(
        json({
          items: [
            {
              id: 8,
              clan_id: 8,
              name: "Blessed Satch family",
              marketplace_name: "Blessed Satch family",
              community_code: "GMFN-C-000013",
              membership_role: "member",
              status: "active",
            },
          ],
        })
      );
    }

    if (path === "/loans/42/summary") {
      return route.fulfill(
        json({
          id: 42,
          clan_id: 8,
          borrower_user_id: 216,
          status: "active",
          amount: "100.00",
          currency: "GBP",
          purpose: "Replace essential work equipment",
          service_fee: "5.00",
          net_disbursed_amount: "95.00",
          guarantor_pool: "0.00",
          platform_revenue: "5.00",
          paid_total: "20.00",
          remaining_amount: "80.00",
          due_at: "2026-11-15T12:00:00.000Z",
          created_at: "2026-10-01T12:00:00.000Z",
          guarantors_required: 1,
          guarantors_total: 1,
          approved_guarantors: 1,
        })
      );
    }

    if (path === "/loans/42/guarantors") {
      return route.fulfill(
        json({
          items: [
            {
              id: 71,
              loan_id: 42,
              clan_id: 8,
              guarantor_user_id: 300,
              guarantor_name: "Grace Supporter",
              pledge_amount: "100.00",
              status: "approved",
              is_locked: true,
              locked_amount: "100.00",
            },
          ],
          total: 1,
        })
      );
    }

    if (
      path === "/loans/42/guarantor-suggestions" ||
      path === "/loans/42/guarantors/suggestions"
    ) {
      return route.fulfill(json({ items: [] }));
    }

    if (path === "/revenue-allocation/loan/42") {
      return route.fulfill(
        json({
          service_fee: "5.00",
          guarantor_pool: "0.00",
          platform_revenue: "5.00",
          net_disbursed_amount: "95.00",
        })
      );
    }

    if (path === "/loans/42/repayments") {
      return route.fulfill(
        json({
          items: [
            {
              id: 901,
              amount: "20.00",
              created_at: "2026-10-10T12:00:00.000Z",
            },
          ],
        })
      );
    }

    if (path === "/bank/expected") {
      return route.fulfill(
        json({
          items: [
            {
              id: 501,
              loan_id: 42,
              status: "expected",
              amount: "25.00",
              paid_amount: "0.00",
              remaining_amount: "25.00",
              currency: "GBP",
              reference_display: "GSN-REPAY-42-ADA",
              due_at: "2026-11-15T12:00:00.000Z",
              meta: { loan_id: 42 },
            },
          ],
        })
      );
    }

    if (path === "/admin/trust-events/recent") {
      return route.fulfill(
        json({
          items: [
            {
              id: 801,
              event_type: "loan.approved",
              created_at: "2026-10-05T12:00:00.000Z",
              meta: { note: "Support moved into repayment." },
            },
          ],
        })
      );
    }

    if (path === "/payment-instructions/loan" && request.method() === "POST") {
      const payload = request.postDataJSON();
      return route.fulfill(
        json({
          expected_payment_id: 501,
          amount: payload.amount,
          currency: payload.currency || "GBP",
          expected_total_amount: "80.00",
          expected_remaining_amount: String(
            Math.max(0, 80 - Number(payload.amount || 0)).toFixed(2)
          ),
          reference_display: "GSN-REPAY-42-ADA",
          reference_normalized: "GSNREPAY42ADA",
          due_at: "2026-11-15T12:00:00.000Z",
          settlement: {
            bankName: "GSN Community Bank Route",
            accountName: "Blessed Satch family",
            accountNumber: "12345678",
            sortCode: "10-20-30",
          },
        })
      );
    }

    if (path === "/loans/42/repayment-claim" && request.method() === "POST") {
      return route.fulfill(
        json({
          ok: true,
          loan_id: 42,
          payment_reference: "GSN-REPAY-42-ADA",
          already_claimed: false,
        })
      );
    }

    if (path === "/loans") {
      return route.fulfill(json({ items: [] }));
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

async function assertCompactCompanion(page, viewport) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("gmfn:companion-toast", {
        detail: {
          id: "phone-surface-test",
          title: "Support record needs attention",
          detail: "Review the next step before you continue.",
          priority: "important",
          ctaLabel: "Open",
          ctaTo: "/app/notifications",
          autoCloseMs: 60000,
        },
      })
    );
  });

  const compactSelector =
    '[data-companion-toast-mode="compact"][data-companion-toast-priority="important"]';
  await page.waitForSelector(compactSelector, { timeout: 10000 });

  const compact = await page.evaluate(() => {
    const toast = document.querySelector('[data-companion-toast-mode="compact"]');
    const detail = toast?.querySelector('[data-companion-toast-detail="true"]');
    const bottomNav = document.querySelector('[data-gmfn-bottom-nav="true"]');
    const primary = document.querySelector(
      '[data-cta-id="loan-summary.phone.primary.continue-repayment"]'
    );
    const toastRect = toast?.getBoundingClientRect();
    const navRect = bottomNav?.getBoundingClientRect();
    const primaryRect = primary?.getBoundingClientRect();
    const overlapsPrimary = Boolean(
      toastRect &&
        primaryRect &&
        toastRect.left < primaryRect.right &&
        toastRect.right > primaryRect.left &&
        toastRect.top < primaryRect.bottom &&
        toastRect.bottom > primaryRect.top
    );

    return {
      height: toastRect?.height ?? null,
      aboveBottomNav: Boolean(toastRect && navRect && toastRect.bottom <= navRect.top + 2),
      overlapsPrimary,
      detailHidden: Boolean(
        detail && getComputedStyle(detail).display === "none"
      ),
      viewVisible: Boolean(
        toast?.querySelector('[data-cta-id="companion-toast.phone-surface-test.view"]')
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  if (
    compact.height === null ||
    compact.height > 64 ||
    !compact.aboveBottomNav ||
    compact.overlapsPrimary ||
    !compact.detailHidden ||
    !compact.viewVisible ||
    compact.horizontalOverflow
  ) {
    throw new Error(
      "Compact Companion obstructed the Loan Summary at " +
        viewport.width +
        "x" +
        viewport.height +
        ": " +
        JSON.stringify(compact)
    );
  }

  await page
    .locator('[data-cta-id="companion-toast.phone-surface-test.view"]')
    .click();
  await page.waitForSelector('[data-companion-toast-mode="expanded"]', {
    timeout: 10000,
  });

  const expanded = await page.evaluate(() => {
    const toast = document.querySelector('[data-companion-toast-mode="expanded"]');
    const rect = toast?.getBoundingClientRect();
    const visible = (node) => {
      if (!node) return false;
      const nodeRect = node.getBoundingClientRect();
      return getComputedStyle(node).display !== "none" && nodeRect.height > 0;
    };
    return {
      detailVisible: Boolean(
        toast?.textContent?.includes("Review the next step before you continue.")
      ),
      openVisible: visible(
        toast?.querySelector('[data-cta-id="companion-toast.phone-surface-test.open"]')
      ),
      dismissVisible: visible(
        toast?.querySelector('[data-cta-id="companion-toast.phone-surface-test.dismiss"]')
      ),
      insideViewport: Boolean(
        rect && rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  if (
    !expanded.detailVisible ||
    !expanded.openVisible ||
    !expanded.dismissVisible ||
    !expanded.insideViewport ||
    expanded.horizontalOverflow
  ) {
    throw new Error(
      "Expanded Companion did not preserve its actions: " + JSON.stringify(expanded)
    );
  }

  await page
    .locator('[data-cta-id="companion-toast.phone-surface-test.dismiss"]')
    .click();
  await page.waitForSelector(
    '[data-cta-id="companion-toast.phone-surface-test.dismiss"]',
    { state: "detached", timeout: 10000 }
  );
}


async function testLoanSummary(page, baseURL, viewport) {
  await page.goto(baseURL + "/app/loan-summary/42?community_id=8", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-gsn-loan-summary-phone-front="simple"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(250);

  const initial = await page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return (
        getComputedStyle(node).display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const front = document.querySelector(
      '[data-gsn-loan-summary-phone-front="simple"]'
    );
    const facts = document.querySelector(
      '[data-gsn-loan-summary-phone-facts="compact-four"]'
    );
    const primary = document.querySelector(
      '[data-cta-id="loan-summary.phone.primary.continue-repayment"]'
    );
    const primaryRect = primary?.getBoundingClientRect();

    return {
      text: document.body.textContent || "",
      repeatedTopNav: Boolean(
        document.querySelector('[data-gmfn-page-top-nav="compact"]')
      ),
      factCount: facts?.children.length || 0,
      primaryVisible: visible(primary),
      primaryInViewport: Boolean(
        primaryRect &&
          primaryRect.top >= 0 &&
          primaryRect.bottom <= window.innerHeight
      ),
      frontHeight: front?.getBoundingClientRect().height || 0,
      visibleLane: Boolean(
        Array.from(
          document.querySelectorAll("[data-gsn-loan-summary-phone-lane]")
        ).find((node) => visible(node))
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  const required = [
    "Blessed Satch family",
    "Support record #42",
    "Repayment active",
    "Continue repayment.",
    "Remaining",
    "Support recorded",
    "Waiting",
    "Continue repayment",
    "More details",
    "does not approve the whole request",
  ];

  if (
    required.some((text) => !initial.text.includes(text)) ||
    initial.repeatedTopNav ||
    initial.factCount !== 4 ||
    !initial.primaryVisible ||
    !initial.primaryInViewport ||
    initial.frontHeight > 310 ||
    initial.visibleLane ||
    initial.horizontalOverflow
  ) {
    throw new Error(
      "Loan Summary phone front failed at " +
        viewport.width +
        "x" +
        viewport.height +
        ": " +
        JSON.stringify(initial)
    );
  }

  await assertCompactCompanion(page, viewport);

  await page.screenshot({
    path: join(
      screenshotDir,
      "loan-summary-simple-" + viewport.width + "x" + viewport.height + ".jpg"
    ),
    type: "jpeg",
    quality: 45,
    fullPage: false,
  });

  await page.locator('[data-cta-id="loan-summary.phone.more"]').click();
  await page
    .locator('[data-cta-id="loan-summary.phone.open-record"]')
    .click();
  await page.waitForSelector(
    '[data-gsn-loan-summary-phone-lane="record"]',
    { state: "visible" }
  );

  const record = await page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return (
        getComputedStyle(node).display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    return {
      frontVisible: visible(
        document.querySelector('[data-gsn-loan-summary-phone-front="simple"]')
      ),
      recordVisible: visible(
        document.querySelector(
          '[data-gsn-loan-summary-phone-lane="record"]'
        )
      ),
      backVisible: visible(
        document.querySelector('[data-cta-id="loan-summary.phone.back"]')
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  if (
    record.frontVisible ||
    !record.recordVisible ||
    !record.backVisible ||
    record.horizontalOverflow
  ) {
    throw new Error(
      "Loan Summary record lane did not replace the front: " +
        JSON.stringify(record)
    );
  }

  await page.locator('[data-cta-id="loan-summary.phone.back"]').click();
  await page.waitForSelector('[data-gsn-loan-summary-phone-front="simple"]', {
    state: "visible",
  });
}

async function testRepayment(page, baseURL, viewport) {
  await page.goto(baseURL + "/app/payment/loans/42?community_id=8", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForSelector('[data-gsn-repayment-phone-state="choose-amount"]', {
    timeout: 30000,
  });
  await page.waitForTimeout(250);

  const initial = await page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return (
        getComputedStyle(node).display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    const facts = document.querySelector(
      '[data-gsn-repayment-phone-facts="compact-four"]'
    );
    const primary = document.querySelector(
      '[data-cta-id="repayment.phone.get-payment-details"]'
    );
    const primaryRect = primary?.getBoundingClientRect();

    return {
      text: document.body.textContent || "",
      repeatedTopNav: Boolean(
        document.querySelector('[data-gmfn-page-top-nav="compact"]')
      ),
      factCount: facts?.children.length || 0,
      primaryVisible: visible(primary),
      primaryInViewport: Boolean(
        primaryRect &&
          primaryRect.top >= 0 &&
          primaryRect.bottom <= window.innerHeight
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  const required = [
    "Outstanding",
    "Selected",
    "Paid already",
    "Due",
    "Get payment details",
    "Pay a different amount",
    "does not hold the money",
  ];

  if (
    required.some((text) => !initial.text.includes(text)) ||
    initial.repeatedTopNav ||
    initial.factCount !== 4 ||
    !initial.primaryVisible ||
    !initial.primaryInViewport ||
    initial.horizontalOverflow
  ) {
    throw new Error(
      "Repayment choose-amount state failed at " +
        viewport.width +
        "x" +
        viewport.height +
        ": " +
        JSON.stringify(initial)
    );
  }

  await page.screenshot({
    path: join(
      screenshotDir,
      "repayment-simple-" + viewport.width + "x" + viewport.height + ".jpg"
    ),
    type: "jpeg",
    quality: 45,
    fullPage: false,
  });

  await page
    .locator('[data-cta-id="repayment.phone.toggle-part-payment"]')
    .click();
  const partInput = page.locator(
    '[data-gsn-repayment-phone-part="open"] input[type="number"]'
  );
  await partInput.fill("25");
  await page
    .locator('[data-cta-id="repayment.phone.get-payment-details"]')
    .click();
  await page.waitForSelector(
    '[data-gsn-repayment-phone-state="payment-details"]',
    { state: "visible" }
  );

  const details = await page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return (
        getComputedStyle(node).display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    return {
      text: document.body.textContent || "",
      paymentTaskVisible: visible(
        document.querySelector('[data-gsn-repayment-phone-task="payment"]')
      ),
      initialPrimaryVisible: visible(
        document.querySelector(
          '[data-cta-id="repayment.phone.get-payment-details"]'
        )
      ),
      confirmVisible: visible(
        document.querySelector('[data-cta-id="repayment.phone.confirm-paid"]')
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  if (
    !details.paymentTaskVisible ||
    details.initialPrimaryVisible ||
    !details.confirmVisible ||
    !details.text.includes("25.00") ||
    !details.text.includes("GSN-REPAY-42-ADA") ||
    !details.text.includes("I have paid") ||
    details.horizontalOverflow
  ) {
    throw new Error(
      "Repayment payment-details state failed: " + JSON.stringify(details)
    );
  }

  await page
    .locator('[data-cta-id="repayment.phone.confirm-paid"]')
    .click();
  await page.waitForSelector(
    '[data-gsn-repayment-phone-state="awaiting-reconciliation"]',
    { state: "visible" }
  );

  const declared = await page.evaluate(() => {
    const visible = (node) => {
      if (!node) return false;
      const rect = node.getBoundingClientRect();
      return (
        getComputedStyle(node).display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      );
    };
    return {
      text: document.body.textContent || "",
      waitingTaskVisible: visible(
        document.querySelector(
          '[data-gsn-repayment-phone-task="awaiting-reconciliation"]'
        )
      ),
      paymentTaskVisible: visible(
        document.querySelector('[data-gsn-repayment-phone-task="payment"]')
      ),
      backVisible: visible(
        document.querySelector('[data-cta-id="repayment.phone.back-to-summary"]')
      ),
      horizontalOverflow:
        document.documentElement.scrollWidth > window.innerWidth + 2,
    };
  });

  if (
    !declared.waitingTaskVisible ||
    declared.paymentTaskVisible ||
    !declared.backVisible ||
    !declared.text.includes("Sent for checking") ||
    !declared.text.includes("support remains open") ||
    declared.horizontalOverflow
  ) {
    throw new Error(
      "Repayment awaiting-reconciliation state failed: " +
        JSON.stringify(declared)
    );
  }

  await page.locator('[data-cta-id="repayment.phone.toggle-status"]').click();
  await page.waitForSelector('[data-cta-id^="repayment-phone-proof"]', {
    state: "attached",
    timeout: 10000,
  });

  const statusText = await page.locator("body").innerText();
  if (
    !statusText.includes("Waiting for payment") ||
    statusText.includes("pending_match") ||
    statusText.includes("mismatch_flagged")
  ) {
    throw new Error(
      "Repayment payment status was not translated: " + statusText
    );
  }
}

async function testViewport(baseURL, viewport) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: 2,
    isMobile: true,
  });

  try {
    await installApiMocks(page);
    await page.addInitScript(() => {
      localStorage.setItem(
        "access_token",
        "local-loan-summary-repayment-token"
      );
      localStorage.setItem("gmfn_selected_clan_id", "8");
    });

    await testLoanSummary(page, baseURL, viewport);
    await testRepayment(page, baseURL, viewport);

    console.log(
      "Loan Summary / Repayment phone smoke passed at " +
        viewport.width +
        "x" +
        viewport.height +
        ": one state, one primary action, one active task, no overflow."
    );
  } finally {
    await browser.close();
  }
}

async function run() {
  let server;

  try {
    server = await createServer({
      root: frontendRoot,
      configFile: join(frontendRoot, "vite.config.ts"),
      server: { host: "127.0.0.1", port: 0, strictPort: false },
      logLevel: "silent",
    });
    await server.listen();
    const port = server.httpServer.address().port;
    const baseURL = "http://127.0.0.1:" + port;

    await testViewport(baseURL, { width: 390, height: 844 });
    await testViewport(baseURL, { width: 360, height: 780 });
  } finally {
    if (server) await server.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
