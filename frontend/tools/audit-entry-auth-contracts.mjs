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
  "src/pages/LoginPage.tsx",
  /Sign in to continue where you left off\./,
  "Login must not restore the removed continuation subtitle below Welcome back."
);

assertNotContains(
  "src/components/RequireAuth.tsx",
  /<Navigate\s+to="\/cover"\s+replace\s*\/>|This route needs|Requested route|This route is protected/,
  "Protected auth failures must not dump testers to the public cover page or expose route wording in recovery copy."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /function loginRecoveryTarget\([\s\S]*?const publishTarget = peekPublishRecoveryTarget\(\);[\s\S]*?const currentTarget = `\$\{location\.pathname \|\| ""\}\$\{location\.search \|\| ""\}\$\{location\.hash \|\| ""\}`;[\s\S]*?if \(!publishTarget\) \{[\s\S]*?next\.set\("session", "expired"\);[\s\S]*?currentTarget === "\/app" \|\| currentTarget\.startsWith\("\/app\/"\)[\s\S]*?next\.set\("next", currentTarget\);[\s\S]*?state: \{ from: location \}[\s\S]*?next\.set\("session", "expired"\);[\s\S]*?next\.set\("next", publishTarget\);[\s\S]*?from: routeStateFromTarget\(publishTarget\),[\s\S]*?recoveredFrom: `\$\{location\.pathname \|\| ""\}\$\{location\.search \|\| ""\}\$\{location\.hash \|\| ""\}`[\s\S]*?return <Navigate to=\{target\.to\} replace state=\{target\.state\} \/>/,
  "Protected auth failures must return to login while preserving the requested route."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /if \(status === 401 \|\| status === 403\)[\s\S]*logout\(\);/,
  "Invalid or unauthorized stored sessions must be cleared at the system route guard."
);

assertContains(
  "src/components/RequireAuth.tsx",
  /getMeWithStoredTokenRetry\([\s\S]*forceFresh[\s\S]*fresh: true[\s\S]*requestForegroundSessionCheck[\s\S]*window\.addEventListener\("focus"[\s\S]*window\.addEventListener\("online"[\s\S]*document\.addEventListener\("visibilitychange"[\s\S]*foregroundCheckRequestedRef\.current[\s\S]*getMeWithStoredTokenRetry\(tok, forceFreshSessionCheck\)/,
  "Returning to a visible app must bypass cached identity state and revalidate the stored session."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /publishRecoveryReturnTarget[\s\S]*previous sign-in expired before GSN could finish the action[\s\S]*previous sign-in expired while GSN was closed\. Sign in again to continue\./,
  "Expired-session sign-in must distinguish ordinary app resume from interrupted Spotlight publishing."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /const LOGIN_SESSION_NOTICE_MS = 12_000;[\s\S]*?setSessionNotice\(null\)[\s\S]*?debugId="login\.session-expired\.dismiss"[\s\S]*?<GsnInstallPrompt[\s\S]*?surface="login"[\s\S]*?autoDismissMs=\{LOGIN_SHORTCUT_REMINDER_MS\}[\s\S]*?dismissible/,
  "Expired-session guidance and the Login shortcut reminder must be transient and explicitly dismissible without changing sign-in recovery."
);

assertContains(
  "src/components/GsnInstallPrompt.tsx",
  /autoDismissMs\?: number;[\s\S]*?dismissible\?: boolean;[\s\S]*?manualOpen \|\|[\s\S]*?window\.setTimeout\(\(\) => \{[\s\S]*?setVisible\(false\)[\s\S]*?debugId=\{`gsn-install\.\$\{surface\}\.dismiss`\}/,
  "A transient install reminder must pause while its manual steps are open and provide a stable close action."
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
  "src/lib/api.ts",
  /founderSignupWithInvite\(payload: \{[\s\S]*?display_name\?: string \| null;[\s\S]*?\/auth\/signup-with-invite/,
  "Founder invite signup must keep carrying the typed display/street name into the account fallback route."
);

assertContains(
  "src/pages/CreateEntryPage.tsx",
  /function buildCreateEntryPayload\(activeVerificationId: number\)[\s\S]*?display_name: safeStr\(displayName\)/,
  "Create Entry must send the typed known name so fallback account creation does not lose it."
);

assertContains(
  "src/pages/CoverPage.tsx",
  /const COVER_WELCOME_SESSION_KEY = "gmfn_cover_welcome_session";[\s\S]*?function nextRouteForMode\(mode: EntryMode\): string \{[\s\S]*?return "\/welcome\?entry_from=cover";[\s\S]*?function markCoverWelcomeSession\(\): void \{[\s\S]*?window\.sessionStorage\.setItem\(COVER_WELCOME_SESSION_KEY, "active"\);[\s\S]*?markCoverWelcomeSession\(\);/,
  "Cover Continue must mark the active browser session before opening Welcome."
);

assertContains(
  "src/App.tsx",
  /const COVER_WELCOME_SESSION_KEY = "gmfn_cover_welcome_session";[\s\S]*?function hasCoverWelcomeSession\(\): boolean \{[\s\S]*?window\.sessionStorage\.getItem\(COVER_WELCOME_SESSION_KEY\)[\s\S]*?=== "active"[\s\S]*?function WelcomeEntryGate\(props: \{ children: React\.ReactNode \}\)[\s\S]*?params\.get\("entry_from"\)[\s\S]*?entryFrom !== "cover" \|\| !hasCoverWelcomeSession\(\)[\s\S]*?<Navigate[\s\S]*?to=\{`\/cover\$\{nextSearch \? `\?\$\{nextSearch\}` : ""\}\$\{hash\}`\}[\s\S]*?<WelcomeEntryGate>[\s\S]*?<WelcomePage \/>[\s\S]*?<\/WelcomeEntryGate>/,
  "Bare or restored /welcome must return to Cover unless Cover opened Welcome in the active browser session."
);

assertContains(
  "server.mjs",
  /function welcomeShouldRedirectToCover\(url\)[\s\S]*?url\.pathname === "\/welcome"[\s\S]*?entryFrom !== "cover"[\s\S]*?function coverRedirectLocation\(url\)[\s\S]*?params\.delete\("entry_from"\)[\s\S]*?return `\/cover\$\{search \? `\?\$\{search\}` : ""\}`[\s\S]*?if \(welcomeShouldRedirectToCover\(url\)\)[\s\S]*?Location: coverRedirectLocation\(url\)[\s\S]*?"Cache-Control": "no-store"/,
  "Render must redirect bare /welcome to Cover before React loads, while allowing Cover-marked Welcome."
);

assertContains(
  "index.html",
  /var params = new URLSearchParams\(window\.location\.search\);[\s\S]*?entryFrom[\s\S]*?coverWelcomeSession[\s\S]*?window\.sessionStorage\.getItem\("gmfn_cover_welcome_session"\)[\s\S]*?window\.location\.pathname === "\/welcome"[\s\S]*?entryFrom !== "cover" \|\| coverWelcomeSession !== "active"[\s\S]*?params\.delete\("entry_from"\)[\s\S]*?window\.location\.replace\([\s\S]*?"\/cover"/,
  "The production HTML shell must redirect bare or restored /welcome to Cover before the React bundle loads."
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
  /const inviteTarget = joinRedirectFromLoginSearch\(searchParams\);[\s\S]*if \(inviteTarget\) return inviteTarget;[\s\S]*return DEFAULT_AUTHENTICATED_ROUTE;/,
  "Login must prefer invite-aware continuation before falling back to the authenticated Shop home."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /passwordVisible[\s\S]*login\.password\.visibility-toggle[\s\S]*recoveryNewPasswordVisible[\s\S]*login\.password-recovery\.new-password-toggle[\s\S]*recoveryConfirmPasswordVisible[\s\S]*login\.password-recovery\.confirm-password-toggle/,
  "Login and password recovery must let users reveal the password they are typing without exposing any old saved password."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /GSN_SIGN_IN_SUPPORT_EMAIL[\s\S]*GSN_SIGN_IN_SUPPORT_WHATSAPP_NUMBER[\s\S]*signInSupportEmailUrl[\s\S]*signInSupportWhatsAppUrl[\s\S]*setSupportOpen\(true\)[\s\S]*debugId="login\.submit"[\s\S]*debugId="login\.secondary-options\.toggle"[\s\S]*Help[\s\S]*login\.support\.open[\s\S]*Sign-in support[\s\S]*login\.password-recovery\.open[\s\S]*Forgot password[\s\S]*Never send your password[\s\S]*login\.support\.whatsapp[\s\S]*login\.support\.email/,
  "Login must keep the pre-auth sign-in support bridge with WhatsApp, email, no-password warning, and blocked-state visibility."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /debugId="login\.submit"[\s\S]*?<details style=\{quietDisclosureStyle\(\)\}>[\s\S]*?debugId="login\.secondary-options\.toggle"[\s\S]*?Help[\s\S]*?debugId="login\.support\.open"[\s\S]*?Sign-in support[\s\S]*?debugId="login\.password-recovery\.open"[\s\S]*?Forgot password[\s\S]*?debugId="login\.activate-approved"[\s\S]*?Activate membership[\s\S]*?debugId="login\.start-community"[\s\S]*?Start a new community[\s\S]*?<\/details>/,
  "Login must place the primary sign-in action before one quiet collapsed secondary-options disclosure."
);

assertContains(
  "src/pages/LoginPage.tsx",
  /buildSignInSupportMessage[\s\S]*?recoveryAdminReviewPath[\s\S]*?APP_ROUTES\.IDENTITY_RISK[\s\S]*?recoverySupportMessage[\s\S]*?copyRecoveryReviewPacket[\s\S]*?Owner\/support review:[\s\S]*?debugId="login\.password-recovery\.copy-review-packet"[\s\S]*?debugId="login\.password-recovery\.admin-review"/,
  "Login blocked password recovery must produce an owner/support review packet and route admins into Identity Risk with the typed phone and GSN ID."
);

assertContains(
  "src/lib/gsnSupportContacts.ts",
  /GSN_SIGN_IN_SUPPORT_WHATSAPP_NUMBER = "\+44 7903 165266"[\s\S]*GSN_SIGN_IN_SUPPORT_EMAIL = "support_gsn@GMFN-GSN\.uk\.co"[\s\S]*buildWhatsAppChatUrl[\s\S]*signInSupportEmailUrl/,
  "The pre-auth sign-in support contact values must stay centralized in the shared support contact helper."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /if \(requestReady\.gmfn_id\)[\s\S]*activateMembership\([\s\S]*gmfn_id: requestReady\.gmfn_id[\s\S]*else[\s\S]*activateApprovedMember\(/,
  "The public activation page must use canonical membership activation when a GMFN ID is present."
);

assertContains(
  "src/pages/MemberActivationPage.tsx",
  /identityPhone:[\s\S]*"cci"[\s\S]*task=phone&mode=complete[\s\S]*identityRecovery:[\s\S]*"cci"[\s\S]*task=recovery&mode=complete[\s\S]*buildFirstCircle:\s*routeTarget\([\s\S]*"buildFirstCircle"[\s\S]*const nextRoute = needsPhoneVerification[\s\S]*routes\.identityPhone[\s\S]*routes\.identityRecovery[\s\S]*Membership activated\. Verify this phone next[\s\S]*Set private recovery next[\s\S]*navigate\(nextRoute, \{ replace: true \}\);/,
  "Successful activation must answer visibly, route unverified joined members to phone verification, and route verified members to private recovery setup before First Circle growth."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /const joinActionLabel = isInstantJoin \? "Accept invite" : "Request access";[\s\S]*debugId="join-entry\.sign-in-existing"[\s\S]*Sign in[\s\S]*debugId="join-entry\.toggle-new-member-request-form"[\s\S]*joinActionLabel[\s\S]*Already have a GSN ID\?[\s\S]*joinPathChoice === "existing"[\s\S]*Existing GSN ID[\s\S]*Full name[\s\S]*Phone number[\s\S]*requestJoinWithExistingGsnId[\s\S]*Send with GSN ID[\s\S]*joinPathChoice === "new"[\s\S]*!hasExistingGsnClaim/,
  "Logged-out invite entry must show the simple Sign in and mode-aware Accept invite / Request access decision first, while keeping existing-GSN-ID reuse behind help before the new-person form."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /async function requestJoinWithExistingGsnId\(\)[\s\S]*?const safePhone = cleanText\(phone\)[\s\S]*?first_name: safeFirstName[\s\S]*?surname: safeSurname[\s\S]*?phone_e164: safePhone[\s\S]*?\{ includeAuth: false \}/,
  "Typed existing-GSN invite submission must send first name, surname, and phone with the GSN ID for community recognition."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /function joinResultForRouting\(result: any\): any \{[\s\S]*?const approval = result\?\.approval_result \|\| \{\};[\s\S]*?const requestId = cleanText\(result\?\.request_id \|\| request\?\.id \|\| approval\?\.request_id \|\| ""\);[\s\S]*?const activationPath = cleanText\([\s\S]*?result\?\.activation_path \|\| approval\?\.activation_path \|\| request\?\.activation_path \|\| ""[\s\S]*?result_channel: resultChannel,[\s\S]*?const routedResult = joinResultForRouting\(res\);[\s\S]*?const routedStatus = cleanText\(routedResult.status\).toLowerCase\(\);[\s\S]*?if \(routedStatus === "approved" \|\| routedStatus === "rejected"\) \{[\s\S]*?continueExistingRequest\(routedResult\)/,
  "Logged-out invite entry must route auto-approved QR preapproval responses using flattened approval/result fields before falling through to pending."
);

assertContains(
  "src/pages/JoinEntryPage.tsx",
  /const signInInvitePath = useMemo[\s\S]*params\.set\("invite_code", effectiveInviteCode\)[\s\S]*params\.set\("force", "1"\)[\s\S]*to=\{signInInvitePath\}/,
  "Logged-out existing-community invite entry must preserve invite context when the simple Sign in action is used."
);

assertNotContains(
  "src/pages/JoinEntryPage.tsx",
  /Sign in \/ use GSN ID|Sign in to reuse|signInConflictCta|I am new/,
  "Logged-out existing-community invite entry must avoid old mixed-choice wording after the simplified Sign in / Request access decision."
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
  /showUnclearSessionRecovery[\s\S]*old saved access state[\s\S]*Use GSN ID[\s\S]*New to GSN/,
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

assertContains(
  "src/pages/ActivateMembershipPage.tsx",
  /passwordVisible[\s\S]*confirmVisible[\s\S]*setPasswordVisible\(false\)[\s\S]*setConfirmVisible\(false\)[\s\S]*activate-membership\.password\.visibility-toggle[\s\S]*activate-membership\.confirm-password\.visibility-toggle/,
  "Legacy membership activation must let users reveal typed password fields and hide them again when clearing the form."
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
