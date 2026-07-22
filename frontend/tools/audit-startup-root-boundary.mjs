/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function lineAt(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function assertNotContains(file, pattern, message) {
  const source = read(file);
  let match;
  while ((match = pattern.exec(source))) {
    findings.push({
      file,
      line: lineAt(source, match.index),
      message,
      text: source.slice(match.index, match.index + 180).replace(/\s+/g, " "),
    });
    if (!pattern.global) break;
  }
}

function assertContains(file, pattern, message) {
  const source = read(file);
  if (pattern.test(source)) return;
  findings.push({
    file,
    line: 1,
    message,
    text: "Expected startup boundary pattern was not found.",
  });
}

assertNotContains(
  "src/App.tsx",
  /from "\.\/lib\/api"/g,
  "Root App must not import the full API module for token/session checks."
);

assertNotContains(
  "src/App.tsx",
  /^import\s+AppLayout\s+from\s+"\.\/layout\/AppLayout";/gm,
  "Root App must lazy-load the authenticated app shell."
);

assertNotContains(
  "src/App.tsx",
  /^import\s+RequireAuth\s+from\s+"\.\/components\/RequireAuth";/gm,
  "Root App must lazy-load the authenticated route guard."
);

assertContains(
  "src/App.tsx",
  /from "\.\/lib\/authSession"/,
  "Root App must use the lightweight auth session helper."
);

assertContains(
  "src/App.tsx",
  /const AppLayout = React\.lazy\(\(\) => import\("\.\/layout\/AppLayout"\)\);/,
  "Root App must lazy-load the authenticated app shell."
);

assertContains(
  "src/App.tsx",
  /const RequireAuth = React\.lazy\(\(\) => import\("\.\/components\/RequireAuth"\)\);/,
  "Root App must lazy-load the authenticated route guard."
);

assertContains(
  "src/lib/authSession.ts",
  /const ACCESS_TOKEN_KEY = "access_token"[\s\S]*?export function getAccessToken\(\): string \| null[\s\S]*?export function clearAuthSession\(\): void/,
  "Lightweight auth session helper must expose token read and local session clear."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /const SESSION_GATE_TIMEOUT_MS = 5000;/,
  "Authenticated route guard must use a bounded session-gate timeout."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /getMe\(\{ timeoutMs: SESSION_GATE_TIMEOUT_MS \}\)/,
  "Authenticated route guard must not use the default 30s timeout for /auth/me."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /getMeWithToken\(token,[\s\S]*?timeoutMs: SESSION_GATE_TIMEOUT_MS/,
  "Authenticated route guard retry must keep the bounded session timeout."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /const currentClan = me[\s\S]*?getCurrentClan\(\{[\s\S]*?timeoutMs: SESSION_GATE_TIMEOUT_MS/,
  "Authenticated route guard must skip community context when identity did not resolve."
);

assertContains(
  "src/lib/api.ts",
  /export async function getMe\(options\?: \{ timeoutMs\?: number \}\)[\s\S]*?httpJson\("\/auth\/me", "GET", undefined, \{[\s\S]*?timeoutMs: options\?\.timeoutMs/,
  "API getMe must expose a request timeout for startup route guards."
);

assertContains(
  "src/lib/api.ts",
  /export async function getCurrentClan\(options\?: \{ timeoutMs\?: number \}\)[\s\S]*?listMyClans\(\{ timeoutMs: options\?\.timeoutMs \}\)/,
  "API getCurrentClan must pass bounded startup timeouts through to clan reads."
);

if (findings.length > 0) {
  console.error("Startup root boundary audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log(
  "Startup root boundary audit passed: App startup stays decoupled from the full API module."
);
