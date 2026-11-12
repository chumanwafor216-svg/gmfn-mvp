/* global console, process, URL, localStorage, sessionStorage */

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { chromium, devices, expect } from "@playwright/test";
import { createServer } from "vite";

const frontendRoot = process.cwd();
const screenshotDir = resolve(frontendRoot, "screenshots", "invitation-journey-review");
mkdirSync(screenshotDir, { recursive: true });

const community = {
  id: 8,
  community_id: 8,
  clan_id: 8,
  community_code: "GMFN-C-000008",
  community_name: "Blessed Satch family",
  clan_name: "Blessed Satch family",
  marketplace_name: "Blessed Satch family Marketplace",
};
const activationToken = "a".repeat(64);

function json(route, body, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function invitePreview(admissionMode, overrides = {}) {
  return {
    ok: true,
    valid: true,
    status: "valid",
    message: "Invitation checked.",
    invite_code: "review-invite",
    invited_by_display: "Chuma Nwafor",
    admission_mode: admissionMode,
    community_id: community.id,
    ...community,
    governance_profile: {
      preset_key: "family_circle",
      preset_label: "Family community",
      requirements: {
        rules_acceptance_required: admissionMode !== "instant_invite",
      },
      truth_boundary: "Membership is not identity verification or a payment guarantee.",
    },
    ...overrides,
  };
}

async function installMocks(page, scenario) {
  const submissions = [];
  let activated = false;

  await page.route("**/*", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api/, "");
    const method = request.method().toUpperCase();

    if (!url.pathname.startsWith("/api/")) {
      return route.continue();
    }

    if (path === "/clans/join-invite/preview") {
      if (scenario === "invalid") {
        return json(route, {
          ok: true,
          valid: false,
          status: "expired",
          message: "This invitation has expired. Ask Chuma for a fresh GSN invitation.",
        });
      }
      return json(
        route,
        invitePreview(scenario === "approval" ? "community_vote" : "instant_invite")
      );
    }

    if (path === "/auth/me") {
      if (scenario === "existing" || activated) {
        return json(route, {
          id: 31,
          user_id: 31,
          gmfn_id: "GMFN-U-63655DE6",
          display_name: "Chuma Nwafor",
          email: "chuma@example.test",
          phone_e164: "+447700900123",
          phone_verified: false,
          role: "member",
        });
      }
      return json(route, { detail: "Not authenticated" }, 401);
    }

    if (path === "/clans/join-requests" && method === "POST") {
      const payload = request.postDataJSON();
      submissions.push(payload);
      if (scenario === "approval") {
        return json(route, {
          ok: true,
          status: "pending",
          request_id: "202",
          status_token: "pending-status-token",
          submitted_at: "2026-11-12T10:00:00Z",
          ...community,
        });
      }
      if (scenario === "existing") {
        return json(route, {
          ok: true,
          status: "approved",
          request_id: "303",
          activation_required: false,
          result_channel: "approved-existing-member",
          result_path: "/app/community/8",
          gmfn_id: "GMFN-U-63655DE6",
          ...community,
        });
      }
      return json(route, {
        ok: true,
        status: "approved",
        request_id: "101",
        activation_required: true,
        result_channel: "activation-ready",
        result_path:
          "/activate-membership?gmfn_id=GMFN-U-NEW0001&request_id=101",
        gmfn_id: "GMFN-U-NEW0001",
        activation_token: activationToken,
        status_token: "instant-status-token",
        ...community,
      });
    }

    if (path === "/clans/join-requests/202/status") {
      return json(route, {
        status: "pending",
        request_id: "202",
        approvals: 0,
        required_approvals: 1,
        ...community,
      });
    }

    if (path === "/auth/activate-membership" && method === "POST") {
      activated = true;
      return json(route, {
        status: "activated",
        access_token: "activated-review-token",
        token_type: "bearer",
        gmfn_id: "GMFN-U-NEW0001",
        phone_verified: false,
        ...community,
      });
    }

    if (path === "/clans/me") {
      return json(route, [
        {
          id: 8,
          role: "user",
          membership_status: "active",
          status: "active",
          ...community,
        },
      ]);
    }

    if (method === "GET") return json(route, { items: [], total: 0 });
    return json(route, { ok: true });
  });

  return submissions;
}

async function newPhone(browser, scenario) {
  const context = await browser.newContext({ ...devices["Pixel 5"] });
  await context.addInitScript(({ existing }) => {
    localStorage.clear();
    sessionStorage.clear();
    if (existing) {
      localStorage.setItem("access_token", "existing-review-token");
      localStorage.setItem("gmfn_current_id", "GMFN-U-63655DE6");
      localStorage.setItem("gmfn_selected_clan_id", "8");
    }
  }, { existing: scenario === "existing" });
  const page = await context.newPage();
  const submissions = await installMocks(page, scenario);
  return { context, page, submissions };
}

async function openInvite(page, baseUrl) {
  await page.goto(`${baseUrl}/start/join/review-invite`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
}

async function fillRequiredJoinForm(page) {
  const form = page.locator('[data-debug-id="join-entry-new-request-form"]');
  await expect(form).toBeVisible({ timeout: 15000 });
  await form.locator('input[autocomplete="name"]').fill("Ada Tester");
  await form.locator('input[placeholder="Preferably +E164 format"]').fill("+2348012345678");
  await form.locator("select").first().selectOption({ label: "Nigeria" });
}

async function runInstant(browser, baseUrl) {
  const { context, page, submissions } = await newPhone(browser, "instant");
  await openInvite(page, baseUrl);

  const welcome = page.locator('[data-gsn-compact-invite-welcome="true"]');
  await expect(
    welcome.getByText("Blessed Satch family", { exact: false })
  ).toBeVisible();
  await expect(welcome.getByText("Invited by Chuma Nwafor")).toBeVisible();
  await expect(welcome.getByText("Free to join. No payment required.")).toBeVisible();
  await expect(page.locator('[data-cta-id="join-entry.acknowledge-invite"]')).toHaveCount(0);
  await expect(page.locator('[data-cta-id="join-entry.submit-new-request"]')).toContainText(
    "Accept invite and join"
  );
  await page.screenshot({
    path: resolve(screenshotDir, "01-instant-first-screen.png"),
    fullPage: true,
  });

  await fillRequiredJoinForm(page);
  await page.locator('[data-cta-id="join-entry.submit-new-request"]').click();
  await expect(page).toHaveURL(/\/activate-membership\?/);
  await page.locator("#member-activation-password").fill("secret123");
  await page.locator("#member-activation-confirm-password").fill("secret123");
  await page.locator('[data-cta-id="member-activation.finish"]').click();
  await expect(page.locator('[data-gsn-activation-complete="true"]')).toBeVisible({
    timeout: 15000,
  });
  await expect(page.locator('[data-cta-id="member-activation.open-community"]')).toContainText(
    "Open Blessed Satch family"
  );
  await expect(page.locator('[data-cta-id="member-activation.verify-phone"]')).toBeVisible();
  await expect(page.locator('[data-cta-id="member-activation.other-setup"]')).toBeVisible();
  await page.screenshot({
    path: resolve(screenshotDir, "02-activation-complete.png"),
    fullPage: true,
  });
  expect(submissions).toHaveLength(1);
  await context.close();
}

async function runApproval(browser, baseUrl) {
  const { context, page, submissions } = await newPhone(browser, "approval");
  await openInvite(page, baseUrl);

  await expect(page.getByText("The community reviews your request")).toBeVisible();
  await expect(page.locator('[data-cta-id="join-entry.submit-new-request"]')).toContainText(
    "Submit request for approval"
  );
  await page.screenshot({
    path: resolve(screenshotDir, "03-approval-first-screen.png"),
    fullPage: true,
  });

  await fillRequiredJoinForm(page);
  await page.locator('input[type="checkbox"]').check();
  await page.locator('[data-cta-id="join-entry.submit-new-request"]').click();
  await expect(page).toHaveURL(/\/pending-approval\?request_id=202/);
  await expect(page.getByText("Waiting for community action.")).toBeVisible({ timeout: 15000 });
  expect(submissions[0]?.rules_accepted).toBe(true);
  await page.screenshot({
    path: resolve(screenshotDir, "04-approval-pending.png"),
    fullPage: true,
  });
  await context.close();
}

async function runExisting(browser, baseUrl) {
  const { context, page } = await newPhone(browser, "existing");
  await openInvite(page, baseUrl);

  await expect(page.getByText("Existing GSN identity", { exact: true })).toBeVisible();
  await expect(page.locator('[data-cta-id="join-entry.existing-identity"]')).toContainText(
    "Accept invite and join"
  );
  await page.screenshot({
    path: resolve(screenshotDir, "05-existing-member.png"),
    fullPage: true,
  });
  await page.locator('[data-cta-id="join-entry.existing-identity"]').click();
  await expect(page).toHaveURL(/\/app\/community\/8/);
  await context.close();
}

async function runInvalid(browser, baseUrl) {
  const { context, page } = await newPhone(browser, "invalid");
  await openInvite(page, baseUrl);

  await expect(page.getByText("Invitation unavailable")).toBeVisible();
  await expect(page.getByText("This invitation has expired", { exact: false })).toBeVisible();
  await expect(page.locator('[data-debug-id="join-entry-new-request-form"]')).toHaveCount(0);
  await expect(page.locator('[data-cta-id="join-entry.submit-new-request"]')).toHaveCount(0);
  await page.screenshot({
    path: resolve(screenshotDir, "06-invalid-expired.png"),
    fullPage: true,
  });
  await context.close();
}

async function main() {
  const server = await createServer({
    root: frontendRoot,
    logLevel: "error",
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const baseUrl = server.resolvedUrls?.local?.[0]?.replace(/\/$/, "");
  if (!baseUrl) throw new Error("Vite review URL was not available.");

  const browser = await chromium.launch();
  try {
    await runInstant(browser, baseUrl);
    await runApproval(browser, baseUrl);
    await runExisting(browser, baseUrl);
    await runInvalid(browser, baseUrl);
  } finally {
    await browser.close();
    await server.close();
  }

  console.log(
    `Invitation journey review passed. Phone screenshots: ${screenshotDir}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
