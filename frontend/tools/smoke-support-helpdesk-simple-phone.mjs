/* global console, process, URL, localStorage, document, window, getComputedStyle */

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

async function installApiMocks(page, role = "member") {
  let created = false;
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
        gmfn_id: "GMFN-U-63655DE6",
        role,
      }));
    }

    if (path === "/clans/me") {
      return route.fulfill(json({ items: [{ id: 8, clan_id: 8, name: "Blessed Satch family", status: "active" }] }));
    }

    if (path.startsWith("/support-cases/admin/queue")) {
      return route.fulfill(json({
        items: [{
          id: 41,
          public_id: "GSN-HELP-41",
          requester: { label: "Nwafor Chuma", gmfn_id: "GMFN-U-63655DE6" },
          community: { name: "Blessed Satch family", community_code: "GMFN-C-000008" },
          issue_type: "shop",
          subject: "Shop picture is not loading",
          status: "waiting_admin",
          created_at: "2026-10-14T10:00:00Z",
        }],
        counts: { waiting_admin: 1, waiting_user: 2, resolved: 4 },
      }));
    }

    if (path.startsWith("/support-cases/me")) {
      const items = [
        {
          id: 41,
          public_id: "GSN-HELP-41",
          issue_type: "shop",
          subject: "Shop picture is not loading",
          status: "waiting_user",
          last_message_preview: "Please try the smaller picture.",
          created_at: "2026-10-14T10:00:00Z",
        },
        {
          id: 42,
          public_id: "GSN-HELP-42",
          issue_type: "technical",
          subject: "Old sign-in question",
          status: "resolved",
          created_at: "2026-10-10T10:00:00Z",
        },
      ];
      if (created) {
        items.unshift({
          id: 43,
          public_id: "GSN-HELP-43",
          issue_type: "technical",
          subject: "Button will not open",
          status: "waiting_admin",
          created_at: "2026-10-15T10:00:00Z",
        });
      }
      return route.fulfill(json({ items }));
    }

    if (path === "/support-cases" && method === "POST") {
      created = true;
      return route.fulfill(json({
        case: {
          id: 43,
          public_id: "GSN-HELP-43",
          issue_type: "technical",
          subject: "Button will not open",
          status: "waiting_admin",
          messages: [],
        },
      }));
    }

    if (/^\/support-cases\/(41|43)$/.test(path)) {
      const id = Number(path.split("/").pop());
      return route.fulfill(json({
        case: {
          id,
          public_id: `GSN-HELP-${id}`,
          issue_type: id === 41 ? "shop" : "technical",
          subject: id === 41 ? "Shop picture is not loading" : "Button will not open",
          status: id === 41 ? "waiting_user" : "waiting_admin",
          requester: { label: "Nwafor Chuma", gmfn_id: "GMFN-U-63655DE6" },
          community: { name: "Blessed Satch family", community_code: "GMFN-C-000008" },
          messages: id === 41 ? [{
            id: 1,
            author_role: "admin",
            body: "Please try the smaller picture.",
            created_at: "2026-10-14T11:00:00Z",
          }] : [],
        },
      }));
    }

    if (url.pathname.startsWith("/api/") || url.origin === "http://127.0.0.1:8012") {
      return route.fulfill(json({ items: [], results: [], status: "ok" }));
    }
    return route.continue();
  });
}

async function verifyViewport(browser, baseURL, viewport, submit = false) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page);
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "local-support-helpdesk-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  await page.goto(`${baseURL}/app/help`, { waitUntil: "networkidle" });
  await page.locator('[data-gsn-support-surface="state"]').waitFor();

  assert(await page.getByText("What do you need help with?", { exact: true }).isVisible(), "Compact Help Desk question is missing.");
  assert(!(await page.getByText(/Loan support, announcements, and governance reviews/).isVisible().catch(() => false)), "Long Help Desk scope paragraph leaked onto phone.");
  assert(await page.getByRole("heading", { name: "Ask for help", exact: true }).isVisible(), "Ask for help form heading is missing.");
  assert(await page.getByLabel("What kind of help?").isVisible(), "Issue type chooser is missing.");
  assert(await page.getByLabel("Subject").isVisible(), "Subject field is missing.");
  assert(await page.getByLabel("Message", { exact: true }).isVisible(), "Message field is missing.");
  assert((await page.getByText("New support request", { exact: true }).count()) === 0, "Old duplicate form title is still rendered.");

  const facts = await page.locator('[data-gsn-support-facts="compact"]').evaluate((node) => ({
    columns: getComputedStyle(node).gridTemplateColumns.split(" ").length,
    text: node.textContent || "",
  }));
  assert(facts.columns === 2, `Expected two compact fact columns, received ${facts.columns}.`);
  for (const label of ["Open", "Waiting admin", "Waiting you", "Resolved"]) {
    assert(facts.text.includes(label), `Missing Help Desk fact: ${label}.`);
  }

  assert((await page.locator('[data-debug-id="support-page.thread-drawer"]').count()) === 0, "Previous requests opened without a tap.");
  await page.getByRole("button", { name: "View previous requests" }).click();
  await page.locator('[data-debug-id="support-page.thread-drawer"]').waitFor();
  await page.getByRole("button", { name: /Shop picture is not loading/ }).click();
  await page.getByText("Please try the smaller picture.", { exact: true }).waitFor();

  if (submit) {
    await page.getByRole("button", { name: "Hide previous requests" }).click();
    await page.getByLabel("Subject").fill("Button will not open");
    await page.getByLabel("Message", { exact: true }).fill("I tapped twice and nothing happened.");
    await page.getByRole("button", { name: "Ask for help", exact: true }).click();
    await page.getByText("Support request sent. Admin can now reply from the queue.", { exact: true }).waitFor();
  }

  const mainOverflow = await page.locator('[data-gsn-support-page="true"]').evaluate((node) => node.scrollWidth > node.clientWidth + 1);
  assert(!mainOverflow, `Help Desk main surface overflows at ${viewport.width}x${viewport.height}.`);
  await page.close();
  console.log(`Help Desk phone smoke passed at ${viewport.width}x${viewport.height}: compact state, labelled form, closed history, thread open, and response feedback.`);
}

async function verifyAdminViewport(browser, baseURL) {
  const viewport = { width: 390, height: 844 };
  const page = await browser.newPage({ viewport, deviceScaleFactor: 2, isMobile: true });
  await installApiMocks(page, "admin");
  await page.addInitScript(() => {
    localStorage.setItem("access_token", "local-admin-support-token");
    localStorage.setItem("gmfn_selected_clan_id", "8");
  });

  await page.goto(`${baseURL}/app/command-center/support`, { waitUntil: "networkidle" });
  await page.locator('[data-gsn-admin-support-surface="state"]').waitFor();
  assert(await page.getByText("Who needs help?", { exact: true }).isVisible(), "Compact admin queue question is missing.");
  assert(!(await page.getByText(/This queue is practical support only/).isVisible().catch(() => false)), "Long governance boundary leaked onto the admin phone surface.");

  const queuePanel = page.locator('[data-gsn-admin-support-panel="queue"]');
  const casePanel = page.locator('[data-gsn-admin-support-panel="case"]');
  assert(await queuePanel.isVisible(), "Admin queue is not the initial phone task.");
  assert(!(await casePanel.isVisible()), "Selected admin case opened before the queue choice.");

  await page.getByRole("button", { name: /Shop picture is not loading/ }).click();
  await page.getByRole("button", { name: "Choose another case", exact: true }).waitFor();
  assert(!(await queuePanel.isVisible()), "Admin queue stayed open after selecting a case.");
  assert(await casePanel.isVisible(), "Selected admin case did not replace the queue.");
  assert(await page.getByLabel("Reply", { exact: true }).isVisible(), "Admin reply field is missing.");

  await page.getByRole("button", { name: "Choose another case", exact: true }).click();
  assert(await queuePanel.isVisible(), "Choose another case did not return to the queue.");
  assert(!(await casePanel.isVisible()), "Selected case remained exposed after returning to the queue.");

  const mainOverflow = await page.locator('[data-gsn-admin-support-page="true"]').evaluate((node) => node.scrollWidth > node.clientWidth + 1);
  assert(!mainOverflow, "Admin Support main surface overflows at 390x844.");
  await page.close();
  console.log("Admin Support phone smoke passed at 390x844: compact state, queue/case focus, reply field, and return path.");
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
    await verifyViewport(browser, `http://127.0.0.1:${port}`, { width: 390, height: 844 }, true);
    await verifyViewport(browser, `http://127.0.0.1:${port}`, { width: 360, height: 780 });
    await verifyAdminViewport(browser, `http://127.0.0.1:${port}`);
  } finally {
    await browser?.close();
    await server?.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
