/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const toolDir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = join(toolDir, "..");

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);
  if (!pattern.test(text)) {
    findings.push({
      file,
      message,
      text: "Expected pattern was not found.",
    });
  }
}

function assertNotContains(file, pattern, message) {
  const text = read(file);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    if (pattern.test(line)) {
      findings.push({
        file,
        line: index + 1,
        message,
        text: line.trim(),
      });
    }
  });
}

const findings = [];

assertNotContains(
  "src/components/RequireAuth.tsx",
  /<Navigate\s+to="\/cover"\s+replace\s*\/>/,
  "Protected auth failures must not dump testers to the public cover page."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /to="\/login\?session=expired"[\s\S]*state=\{\{ from: location \}\}/,
  "Protected auth failures must return to login while preserving the requested route."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /if \(status === 401 \|\| status === 403\)[\s\S]*setAccessToken\(null\);[\s\S]*setSelectedClanId\(null\);/,
  "Invalid or unauthorized stored sessions must be cleared at the system route guard."
);

assertContains(
  "src/pages/CoverPage.tsx",
  /const storedMatch = matchEntryMode\(normalizeValue\(readStorage\(ENTRY_MODE_KEY\)\)\);[\s\S]*if \(storedMatch\) return storedMatch;/,
  "Plain cover visits must preserve stored create/invite/approved intent instead of overwriting it as general."
);

assertContains(
  "src/pages/CoverPage.tsx",
  /if \(entryMode === "invite"\)[\s\S]*if \(inviteCode\)[\s\S]*writeStorage\(ENTRY_INVITE_CODE_KEY, inviteCode\);/,
  "Cover must not clear stored invite codes when revisited without an explicit invite code."
);

assertContains(
  "src/pages/CoverPage.tsx",
  /if \(entryMode === "create"\)[\s\S]*if \(createCode\)[\s\S]*writeStorage\(ENTRY_CREATE_CODE_KEY, createCode\);/,
  "Cover must not clear stored create codes when revisited without an explicit create code."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /detail\?\.code === "account_activation_pending"[\s\S]*activation_path[\s\S]*setActivationPath\(nextPath\)/,
  "Login must treat activation-pending accounts separately from wrong credentials."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /if \(requestReady\.gmfn_id\)[\s\S]*activateMembership\([\s\S]*gmfn_id: requestReady\.gmfn_id[\s\S]*else[\s\S]*activateApprovedMember\(/,
  "The public activation page must use canonical membership activation when a GMFN ID is present."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /navigate\("\/app\/dashboard", \{ replace: true \}\);/,
  "Successful activation must enter the authenticated workspace instead of leaving testers stranded."
);

if (findings.length > 0) {
  console.error("Entry/auth contract audit failed:");
  for (const finding of findings) {
    const loc = finding.line ? `${finding.file}:${finding.line}` : finding.file;
    console.error(`- ${loc} ${finding.message}\n  ${finding.text}`);
  }
  process.exit(1);
}

console.log("Entry/auth contract audit passed.");
