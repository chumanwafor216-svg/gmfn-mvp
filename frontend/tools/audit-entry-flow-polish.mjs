/* global console, process */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const findings = [];

function read(relativePath) {
  return readFileSync(join(frontendRoot, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const text = read(file);

  if (!pattern.test(text)) {
    findings.push({
      file,
      line: 1,
      message,
      text: "Expected entry-flow polish pattern was not found.",
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

function assertEntryActionButtonsHaveDebugIds(file) {
  const text = read(file);
  const actionPattern = /<EntryActionButton\b/g;
  let match;

  while ((match = actionPattern.exec(text))) {
    const preview = text.slice(match.index, match.index + 900);
    if (!/debugId=/.test(preview)) {
      findings.push({
        file,
        line: text.slice(0, match.index).split(/\r?\n/).length,
        message:
          "EntryActionButton controls must have debugId so pre-Dashboard phone taps can be traced.",
        text: preview.replace(/\s+/g, " ").slice(0, 220),
      });
    }
  }
}

const entryPages = [
  "src/pages/CoverPage.tsx",
  "src/pages/WelcomePage.tsx",
  "src/pages/LoginPage.tsx",
  "src/pages/IdentityFirstCreateCommunityPage.tsx",
  "src/pages/FindCommunityJoinPage.tsx",
  "src/pages/JoinEntryPage.tsx",
  "src/pages/JoinRequestPendingPage.tsx",
  "src/pages/JoinApprovalPage.tsx",
  "src/pages/MemberActivationPage.tsx",
];

assertContains(
  "src/App.tsx",
  /<Route\s+path="\/cover"[\s\S]*?<PublicEntryGuard>[\s\S]*?<CoverPage \/>[\s\S]*?<\/PublicEntryGuard>[\s\S]*?<Route\s+path="\/welcome"[\s\S]*?<PublicEntryGuard>[\s\S]*?<WelcomePage \/>[\s\S]*?<\/PublicEntryGuard>/,
  "Cover and Welcome must stay public-entry guarded and outside the authenticated app shell."
);

assertNotContains(
  "src/pages/WelcomePage.tsx",
  />Existing account</,
  "Welcome must not restore the redundant existing-account explanation page before Sign In."
);

assertContains(
  "src/pages/WelcomePage.tsx",
  /isIntentGateway[\s\S]*?data-welcome-intent-gateway="true"[\s\S]*?debugId="welcome\.gateway\.create-community"[\s\S]*?Create community[\s\S]*?debugId="welcome\.gateway\.join-community"[\s\S]*?Join an existing community[\s\S]*?No invitation needed[\s\S]*?Already a member\?[\s\S]*?debugId="welcome\.gateway\.sign-in"[\s\S]*?Sign in/,
  "Welcome must keep Create Community dominant while exposing compact no-invite Join and existing-member Sign In paths."
);

assertNotContains(
  "src/pages/WelcomePage.tsx",
  /Founder path|Set up the basics/,
  "Known Create Community intent must not restore the redundant founder introduction card."
);

assertContains(
  "src/pages/WelcomePage.tsx",
  /function intentNeutralSearch[\s\S]*?\["entry", "entry_from", "flow", "mode", "intent"\][\s\S]*?routeForCreate\(neutralSearch\)[\s\S]*?routeForJoin\(neutralSearch\)/,
  "Switching gateway intent must clear stale lane markers before opening Create or Join."
);

[
  ['<Route path="/login" element={<LoginPage />} />', "Sign In"],
  [
    '<Route path="/create" element={<IdentityFirstCreateCommunityPage />} />',
    "Create Community",
  ],
  ['<Route path="/join" element={<FindCommunityJoinPage />} />', "Join Community"],
  [
    '<Route path="/pending-approval" element={<JoinRequestPendingPage />} />',
    "Pending Approval",
  ],
  [
    '<Route path="/join-approval/:requestId" element={<JoinApprovalPage />} />',
    "Join Approval",
  ],
  [
    '<Route path="/activate-membership" element={<MemberActivationPage />} />',
    "Member Activation",
  ],
].forEach(([routeLine, label]) => {
  assertContains(
    "src/App.tsx",
    new RegExp(routeLine.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    `${label} must remain a distinct pre-Dashboard route.`
  );
});

assertContains(
  "src/App.tsx",
  /<Route\s+path="\/app"[\s\S]*?<RequireAuth>[\s\S]*?<AppLayout \/>[\s\S]*?<\/RequireAuth>/,
  "The authenticated app shell and bottom-navigation surface must remain behind /app RequireAuth."
);

assertContains(
  "src/App.tsx",
  /<Route path="\/start\/create" element=\{<RedirectToCover entry="create" \/>\} \/>/,
  "Start-create aliases must continue through the create entry intent."
);

assertContains(
  "src/App.tsx",
  /path="\/start\/join\/:code"[\s\S]*?element=\{<JoinEntryPage \/>\}/,
  "Start-join aliases must continue through the join entry page."
);

entryPages.forEach((file) => {
  assertEntryActionButtonsHaveDebugIds(file);

  assertNotContains(
    file,
    /<AppLayout|OwnerOnlySurfaceNav|bottomNavigation|bottom-nav|mobileBottomNav|app-layout\.bottom/i,
    "Pre-Dashboard entry pages must not render the authenticated app shell or bottom navigation."
  );
});

[
  ["src/pages/WelcomePage.tsx", /<EntryBackLink to="\/cover" \/>/],
  ["src/pages/LoginPage.tsx", /<EntryBackLink to="\/welcome" \/>/],
  ["src/pages/FindCommunityJoinPage.tsx", /backTo="\/welcome"[\s\S]*?backLabel="Back to welcome"/],
  ["src/components/CommunityEntryShell.tsx", /exitTo = "\/cover"[\s\S]*?<OriginLink to=\{exitTo\}/],
  ["src/pages/JoinEntryPage.tsx", /<EntryBackLink to="\/welcome" \/>/],
  ["src/pages/JoinApprovalPage.tsx", /debugId="join-approval\.back"[\s\S]*?debugId=\{welcomeCta\.debugId\}/],
  ["src/pages/MemberActivationPage.tsx", /debugId="member-activation\.back"[\s\S]*?aria-label="Back to welcome"/],
].forEach(([file, pattern]) => {
  assertContains(
    file,
    pattern,
    "Pre-Dashboard deep entry screens must provide an in-page return path, not only browser back."
  );
});

assertContains(
  "src/pages/JoinRequestPendingPage.tsx",
  /debugId="join-pending\.review-details\.toggle"[\s\S]*?debugId=\{welcomeCta\.debugId\}/,
  "Pending approval must provide both detail review and a route back to Welcome."
);

assertContains(
  "src/components/EntryControls.tsx",
  /export function EntryBackLink[\s\S]*?<StableCtaLink[\s\S]*?debugId="entry-controls\.back"[\s\S]*?minHeight: 44[\s\S]*?minWidth: 44/,
  "Shared entry back control must stay stable and traceable."
);

assertContains(
  "src/pages/IdentityFirstCreateCommunityPage.tsx",
  /establishEntryIdentity[\s\S]*?createCommunityAfterIdentity[\s\S]*?data-gsn-identity-first-create="true"/,
  "Create Community must establish and secure identity before final community creation."
);

assertContains(
  "src/pages/IdentityFirstCreateCommunityPage.tsx",
  /invite_admission_mode: "instant_invite"[\s\S]*?invite_admin_override: false[\s\S]*?search_join_enabled: false[\s\S]*?search_join_admission_mode: "community_vote"[\s\S]*?search_join_admin_override: false/,
  "Create Community must use safe admission defaults without exposing join-policy work before creation."
);

assertNotContains(
  "src/pages/IdentityFirstCreateCommunityPage.tsx",
  /People joining by invitation|Let people find this community|draft\.(inviteMode|inviteOverride|searchEnabled|searchMode|searchOverride)/,
  "Create Community must not expose invitation or search-join controls before the community exists."
);

assertContains(
  "src/pages/FindCommunityJoinPage.tsx",
  /createSearchJoinRequest[\s\S]*?searchJoinableCommunities[\s\S]*?data-gsn-search-join="true"/,
  "Join Community must keep public discovery and search-based requests distinct from invite entry."
);

assertNotContains(
  "src/pages/FindCommunityJoinPage.tsx",
  /Create community|Start community|createCommunityAfterIdentity/,
  "Join Community must not expose or execute the Create Community journey."
);

assertContains(
  "src/App.tsx",
  /path="create-community" element=\{<PreserveRedirect to="\/create\?stage=community" \/>\}[\s\S]*?path="new-community" element=\{<PreserveRedirect to="\/create\?stage=community" \/>\}/,
  "Authenticated Create Community aliases must stay on the dedicated create journey."
);

assertContains(
  "src/pages/CommunityHomePage.tsx",
  /createCommunity: "\/create\?stage=community"/,
  "Community Home must open the dedicated Create Community journey."
);

assertContains(
  "src/pages/marketplace/MarketplaceToolsSection.tsx",
  /openMarketplaceRoute\(event, "\/create\?stage=community"\)/,
  "Marketplace Create Community must open the dedicated create journey."
);

if (findings.length > 0) {
  console.error("Entry flow polish audit failed:");
  for (const finding of findings) {
    console.error(
      `- ${finding.file}:${finding.line} ${finding.message}\n  ${finding.text}`
    );
  }
  process.exit(1);
}

console.log("Entry flow polish audit passed.");
