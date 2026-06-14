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
  /function loginRecoveryTarget\([\s\S]*?if \(!publishTarget\) \{[\s\S]*?to: "\/login\?session=expired"[\s\S]*?state: \{ from: location \}[\s\S]*?next\.set\("next", publishTarget\)[\s\S]*?return <Navigate to=\{target\.to\} replace state=\{target\.state\} \/>/,
  "Protected auth failures must return to login while preserving the requested route."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /if \(status === 401 \|\| status === 403\)[\s\S]*setAccessToken\(null\);[\s\S]*setSelectedClanId\(null\);/,
  "Invalid or unauthorized stored sessions must be cleared at the system route guard."
);

assertContains(
  "src/lib/api.ts",
  /function normalizeApiBaseUrl\(raw: unknown\): string \{[\s\S]*?if \(path\.toLowerCase\(\) === "\/api"\) \{[\s\S]*?return url\.origin;[\s\S]*?function resolveApiBaseUrl\(raw: unknown\): string \{[\s\S]*?const normalized = normalizeApiBaseUrl\(raw\);/,
  "Production API bases such as https://gmfn-api.onrender.com/api must normalize to the backend origin before login appends /auth/login."
);

assertContains(
  "src/lib/api.ts",
  /function resolveApiBaseUrl\(raw: unknown\): string \{[\s\S]*?normalized === "\/api"[\s\S]*?port !== "5173"[\s\S]*?return localBackendOrigin\(\) \|\| normalized;[\s\S]*?const API_BASE_URL = resolveApiBaseUrl\(API_BASE_URL_RAW\);/,
  "Local frontend ports without the Vite proxy, such as 5174, must call the local FastAPI backend directly instead of dead-ending at /api/auth/login."
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
  "src/pages/LoginPage.tsx",
  /function joinRedirectFromLoginSearch\(searchParams: URLSearchParams\)[\s\S]*next\.set\("invite_code", inviteCode\)[\s\S]*return finalQuery \? `\/join\?\$\{finalQuery\}` : "\/join";/,
  "Login must preserve invite query context and return existing GMFN holders to the join flow after sign-in."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /const inviteTarget = joinRedirectFromLoginSearch\(searchParams\);[\s\S]*if \(inviteTarget\) return inviteTarget;[\s\S]*return "\/app\/dashboard";/,
  "Login must prefer invite-aware continuation before falling back to dashboard."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /if \(requestReady\.gmfn_id\)[\s\S]*activateMembership\([\s\S]*gmfn_id: requestReady\.gmfn_id[\s\S]*else[\s\S]*activateApprovedMember\(/,
  "The public activation page must use canonical membership activation when a GMFN ID is present."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /buildFirstCircle:\s*routeTarget\([\s\S]*"buildFirstCircle"[\s\S]*Membership activated successfully\. Build your First Circle next[\s\S]*window\.setTimeout\([\s\S]*navigate\(routes\.buildFirstCircle, \{ replace: true \}\);/,
  "Successful activation must answer visibly and then enter First Circle instead of leaving testers stranded or skipping community growth."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /Already have a GSN ID\?[\s\S]*Existing GSN number[\s\S]*Sign in to reuse[\s\S]*I am new[\s\S]*!hasExistingGsnClaim/,
  "Logged-out invite entry must branch existing GSN holders away from new-person signup."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /usingExistingIdentity[\s\S]*Join this community with your existing GSN identity[\s\S]*does not create a new GSN ID/,
  "Logged-in invite entry must reassure existing GSN holders that identity is reused."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /const canUseNewMemberForm =\s*currentMemberChecked && !usingExistingIdentity;/,
  "Join Entry must not hide the request form merely because localStorage has a stale access token."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /lockedAuthenticatedWithoutGmfn[\s\S]*cannot confirm the signed-in GSN identity[\s\S]*Sign in again[\s\S]*Open form/,
  "Join Entry must explain and recover from an unclear stored session instead of dead-ending after invite validation."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /submitJoinRequest\([\s\S]*includeAuth: false/,
  "Public Join Entry form submission must not carry an unverified or stale local auth token."
);

assertContains(
  "src/lib/api.ts",
  /submitJoinRequest\([\s\S]*options\?: \{ includeAuth\?: boolean \}[\s\S]*options\?\.includeAuth === false \? null : getAccessToken\(\)/,
  "The shared join-request API helper must support public unauthenticated submission for the invite form."
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
