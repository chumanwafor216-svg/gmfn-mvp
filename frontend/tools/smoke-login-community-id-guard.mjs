/* global console */

import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import { preview } from "vite";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
if (!existsSync(join(frontendRoot, "dist", "index.html"))) {
  throw new Error(
    "frontend/dist/index.html is missing. Run the frontend build before the login guard smoke test."
  );
}

const server = await preview({
  root: frontendRoot,
  preview: { host: "127.0.0.1", port: 0, strictPort: false },
  logLevel: "silent",
});
const address = server.httpServer.address();
const port = typeof address === "object" && address ? address.port : 4173;
const baseUrl = `http://127.0.0.1:${port}`;
const browser = await chromium.launch({ headless: true });

try {
  const page = await browser.newPage({
    viewport: { width: 1365, height: 768 },
  });
  let loginRequestCount = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.endsWith("/auth/login")) {
      loginRequestCount += 1;
    }
  });

  await page.goto(`${baseUrl}/login?force=1`, {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });

  const identity = page.getByLabel("Phone number, email, or GSN ID");
  const password = page.locator('input[aria-label="Password"]');
  const submit = page.locator('[data-cta-id="login.submit"]');

  await identity.fill("GMFN-U-0B16D94C");
  await password.fill("GMFN-C-000008");
  await submit.click();
  await page.getByText(
    "A Community ID is not your password. Enter the password you created during activation. No password yet? Open Help and choose Activate membership.",
    { exact: true }
  ).waitFor();

  if ((await password.inputValue()) !== "") {
    throw new Error(
      "Community ID remained in the password field after the guard ran."
    );
  }
  if (loginRequestCount !== 0) {
    throw new Error("Community ID password mistake reached /auth/login.");
  }

  await identity.fill("GMFN-C-000008");
  await password.fill("member-secret");
  await page.waitForTimeout(450);
  await submit.click();
  await page.getByText(
    "That is a Community ID. Enter your phone, email, or member GSN ID instead.",
    { exact: true }
  ).waitFor();

  if (loginRequestCount !== 0) {
    throw new Error("Community ID identity mistake reached /auth/login.");
  }

  console.log(
    "Login Community ID guard smoke test passed: both mistaken fields were explained before any authentication request."
  );
} finally {
  await browser.close().catch(() => {});
  await server.close().catch(() => {});
}
